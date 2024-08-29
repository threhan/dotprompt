import Handlebars from "handlebars";
import * as helpers from "./helpers";
import { DataArgument, PromptMetadata, ToolDefinition } from "./types";
import { parseDocument, toMessages } from "./parse";
import { picoschema } from "./picoschema";
import { removeUndefinedFields } from "./util";

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
  // /** Provide a lookup implementation to resolve tool names to definitions. */
  // toolResolver?: (name: string) => Promise<ToolDefinition | null>;
  // TODO: schema registry for picoschema
}

export class DotpromptEnvironment {
  private handlebars: typeof Handlebars;
  private knownHelpers: Record<string, true> = {};
  private defaultModel?: string;
  private modelConfigs: Record<string, object> = {};
  private tools: Record<string, ToolDefinition> = {};
  private toolResolver?: (name: string) => Promise<ToolDefinition | null>;

  constructor(options?: DotpromptOptions) {
    this.handlebars = Handlebars.noConflict();
    this.modelConfigs = options?.modelConfigs || this.modelConfigs;
    this.defaultModel = options?.defaultModel;
    // this.toolResolver = options?.toolResolver;

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
  }

  parse<ModelConfig = Record<string, any>>(source: string) {
    return parseDocument<ModelConfig>(source);
  }

  render<Variables = Record<string, any>, ModelConfig = Record<string, any>>(
    source: string,
    data: DataArgument<Variables> = {},
    options?: PromptMetadata<ModelConfig>
  ) {
    return this.compile<Variables, ModelConfig>(source)(data, options);
  }

  private renderPicoschema<ModelConfig>(
    meta: PromptMetadata<ModelConfig>
  ): PromptMetadata<ModelConfig> {
    if (!meta.output?.schema) return meta;
    return { ...meta, output: { ...meta.output, schema: picoschema(meta.output.schema) } };
  }

  private renderMetadata<ModelConfig = Record<string, any>>(
    base: PromptMetadata<ModelConfig>,
    ...merges: (PromptMetadata<ModelConfig> | undefined)[]
  ): PromptMetadata<ModelConfig> {
    let out = { ...base };
    for (let i = 0; i < merges.length; i++) {
      if (!merges[i]) continue;
      const config = out.config || ({} as ModelConfig);
      out = { ...out, ...merges[i] };
      out.config = { ...config, ...(merges[i]?.config || {}) };
    }
    delete out.input;
    out = removeUndefinedFields(out);
    out = this.resolveTools(out);
    out = this.renderPicoschema(out);
    return out;
  }

  private resolveTools<ModelConfig>(
    base: PromptMetadata<ModelConfig>
  ): PromptMetadata<ModelConfig> {
    const out = { ...base };
    // Resolve tools that are already registered into toolDefs, leave unregistered tools alone.
    if (out.tools) {
      const outTools: string[] = [];
      out.tools?.forEach((toolName) => {
        if (this.tools[toolName]) {
          out.toolDefs = base.toolDefs || [];
          out.toolDefs.push(this.tools[toolName]);
        } else {
          outTools.push(toolName);
        }
      });
      out.tools = outTools;
    }
    return out;
  }

  compile<Variables = any, ModelConfig = Record<string, any>>(source: string) {
    const { metadata: parsedMetadata, template } = this.parse<ModelConfig>(source);

    const renderString = this.handlebars.compile<Variables>(template, {
      knownHelpers: this.knownHelpers,
      knownHelpersOnly: true,
    });

    return (data: DataArgument, options?: PromptMetadata<ModelConfig>) => {
      const selectedModel = options?.model || parsedMetadata.model || this.defaultModel;
      const modelConfig = this.modelConfigs[selectedModel!] as ModelConfig;
      const mergedMetadata = this.renderMetadata<ModelConfig>(
        modelConfig ? { config: modelConfig } : {},
        parsedMetadata,
        options
      );

      const renderedString = renderString(
        { ...(options?.input?.default || {}), ...data.input },
        {
          data: {
            metadata: { prompt: mergedMetadata, context: data.context, history: data.history },
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
