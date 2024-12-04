/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { default as Handlebars } from "handlebars";
import * as helpers from "./helpers";
import {
  CompiledPrompt,
  DataArgument,
  JSONSchema,
  PromptMetadata,
  RenderedPrompt,
  SchemaResolver,
  ToolDefinition,
  ToolResolver,
} from "./types";
import { parseDocument, toMessages } from "./parse";
import { picoschema } from "./picoschema";
import { removeUndefinedFields } from "./util";

/** Function to resolve partial names to their content */
export interface PartialResolver {
  (partialName: string): string | null | Promise<string | null>;
}

export interface DotpromptOptions {
  /** A default model to use if none is supplied. */
  defaultModel?: string;
  /** Assign a set of default configuration options to be used with a particular model. */
  modelConfigs?: Record<string, object>;
  /** Helpers to pre-register. */
  helpers?: Record<string, Handlebars.HelperDelegate>;
  /** Partials to pre-register. */
  partials?: Record<string, string>;
  /** Provide a static mapping of tool definitions that should be used when resolving tool names. */
  tools?: Record<string, ToolDefinition>;
  /** Provide a lookup implementation to resolve tool names to definitions. */
  toolResolver?: ToolResolver;
  /** Provide a static mapping of schema names to their JSON Schema definitions. */
  schemas?: Record<string, JSONSchema>;
  /** Provide a lookup implementation to resolve schema names to JSON schema definitions. */
  schemaResolver?: SchemaResolver;
  /** Provide a lookup implementation to resolve partial names to their content. */
  partialResolver?: PartialResolver;
}

export class DotpromptEnvironment {
  private handlebars: typeof Handlebars;
  private knownHelpers: Record<string, true> = {};
  private defaultModel?: string;
  private modelConfigs: Record<string, object> = {};
  private tools: Record<string, ToolDefinition> = {};
  private toolResolver?: ToolResolver;
  private schemas: Record<string, JSONSchema> = {};
  private schemaResolver?: SchemaResolver;
  private partialResolver?: PartialResolver;

  constructor(options?: DotpromptOptions) {
    this.handlebars = Handlebars.noConflict();
    this.modelConfigs = options?.modelConfigs || this.modelConfigs;
    this.defaultModel = options?.defaultModel;
    this.tools = options?.tools || {};
    this.toolResolver = options?.toolResolver;
    this.schemas = options?.schemas || {};
    this.schemaResolver = options?.schemaResolver;
    this.partialResolver = options?.partialResolver;

    for (const key in helpers) {
      this.defineHelper(key, helpers[key as keyof typeof helpers]);
      this.handlebars.registerHelper(key, helpers[key as keyof typeof helpers]);
    }

    if (options?.helpers) {
      for (const key in options.helpers) {
        this.defineHelper(key, options.helpers[key]);
      }
    }

    if (options?.partials) {
      for (const key in options.partials) {
        this.definePartial(key, options.partials[key]);
      }
    }
  }

  defineHelper(name: string, fn: Handlebars.HelperDelegate): this {
    this.handlebars.registerHelper(name, fn);
    this.knownHelpers[name] = true;
    return this;
  }

  definePartial(name: string, source: string): this {
    this.handlebars.registerPartial(name, source);
    return this;
  }

  defineTool(def: ToolDefinition): this {
    this.tools[def.name] = def;
    return this;
  }

  parse<ModelConfig = Record<string, any>>(source: string) {
    return parseDocument<ModelConfig>(source);
  }

  async render<Variables = Record<string, any>, ModelConfig = Record<string, any>>(
    source: string,
    data: DataArgument<Variables> = {},
    options?: PromptMetadata<ModelConfig>
  ): Promise<RenderedPrompt<ModelConfig>> {
    const renderer = await this.compile<Variables, ModelConfig>(source);
    return renderer(data, options);
  }

  private async renderPicoschema<ModelConfig>(
    meta: PromptMetadata<ModelConfig>
  ): Promise<PromptMetadata<ModelConfig>> {
    if (!meta.output?.schema) return meta;
    return {
      ...meta,
      output: {
        ...meta.output,
        schema: await picoschema(meta.output.schema, {
          schemaResolver: this.wrappedSchemaResolver.bind(this),
        }),
      },
    };
  }

  private async wrappedSchemaResolver(name: string): Promise<JSONSchema | null> {
    if (this.schemas[name]) return this.schemas[name];
    if (this.schemaResolver) return await this.schemaResolver(name);
    return null;
  }

  private async renderMetadata<ModelConfig = Record<string, any>>(
    base: PromptMetadata<ModelConfig>,
    ...merges: (PromptMetadata<ModelConfig> | undefined)[]
  ): Promise<PromptMetadata<ModelConfig>> {
    let out = { ...base };
    for (let i = 0; i < merges.length; i++) {
      if (!merges[i]) continue;
      const config = out.config || ({} as ModelConfig);
      out = { ...out, ...merges[i] };
      out.config = { ...config, ...(merges[i]?.config || {}) };
    }
    delete out.input;
    out = removeUndefinedFields(out);
    out = await this.resolveTools(out);
    out = await this.renderPicoschema(out);
    return out;
  }

  private async resolveTools<ModelConfig>(
    base: PromptMetadata<ModelConfig>
  ): Promise<PromptMetadata<ModelConfig>> {
    const out = { ...base };
    // Resolve tools that are already registered into toolDefs, leave unregistered tools alone.
    if (out.tools) {
      const outTools: string[] = [];
      out.toolDefs = out.toolDefs || [];

      await Promise.all(
        out.tools.map(async (toolName) => {
          if (this.tools[toolName]) {
            out.toolDefs!.push(this.tools[toolName]);
          } else if (this.toolResolver) {
            const resolvedTool = await this.toolResolver(toolName);
            if (!resolvedTool) {
              throw new Error(
                `Dotprompt: Unable to resolve tool '${toolName}' to a recognized tool definition.`
              );
            }
            out.toolDefs!.push(resolvedTool);
          } else {
            outTools.push(toolName);
          }
        })
      );

      out.tools = outTools;
    }
    return out;
  }

  private identifyPartials(template: string): Set<string> {
    const ast = this.handlebars.parse(template);
    const partials = new Set<string>();

    class PartialVisitor extends this.handlebars.Visitor {
      constructor(private partials: Set<string>) {
        super();
      }

      PartialStatement(partial: any) {
        if ("original" in partial.name) {
          this.partials.add(partial.name.original);
        }
      }
    }

    new PartialVisitor(partials).accept(ast);
    return partials;
  }

  private async resolvePartials(template: string): Promise<void> {
    if (!this.partialResolver) return;

    const partials = this.identifyPartials(template);

    // Resolve and register each partial
    await Promise.all(
      Array.from(partials).map(async (name) => {
        if (!this.handlebars.partials[name]) {
          const content = await this.partialResolver!(name);
          if (content) {
            this.definePartial(name, content);
            // Recursively resolve partials in the partial content
            await this.resolvePartials(content);
          }
        }
      })
    );
  }

  async compile<Variables = any, ModelConfig = Record<string, any>>(
    source: string
  ): Promise<CompiledPrompt<ModelConfig>> {
    const { metadata: parsedMetadata, template } = this.parse<ModelConfig>(source);

    // Resolve all partials before compilation
    await this.resolvePartials(template);

    const renderString = this.handlebars.compile<Variables>(template, {
      knownHelpers: this.knownHelpers,
      knownHelpersOnly: true,
    });

    return async (data: DataArgument, options?: PromptMetadata<ModelConfig>) => {
      const selectedModel = options?.model || parsedMetadata.model || this.defaultModel;
      const modelConfig = this.modelConfigs[selectedModel!] as ModelConfig;
      const mergedMetadata = await this.renderMetadata<ModelConfig>(
        modelConfig ? { config: modelConfig } : {},
        parsedMetadata,
        options
      );

      const renderedString = renderString(
        { ...(options?.input?.default || {}), ...data.input },
        {
          data: {
            metadata: { prompt: mergedMetadata, docs: data.docs, messages: data.messages },
            ...(data.context || {}),
          },
        }
      );
      return {
        ...mergedMetadata,
        messages: toMessages<ModelConfig>(renderedString, data),
      };
    };
  }
}
