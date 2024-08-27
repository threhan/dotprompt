import Handlebars from "handlebars";
import * as helpers from "./helpers";
import { DataArgument, PromptMetadata } from "./types";
import { parseDocument, toMessages } from "./parse";

export interface DotpromptOptions {
  /** A default model to use if none is supplied. */
  defaultModel?: string;
  /** Assign a set of default configuration options to be used with a particular model. */
  modelConfigs?: Record<string, object>;
  /** Helpers to pre-register. */
  helpers?: Record<string, Handlebars.HelperDelegate>;
  /** Partials to pre-register. */
  partials?: Record<string, string>;
}

export class DotpromptEnvironment {
  private handlebars: typeof Handlebars;
  private knownHelpers: Record<string, true> = {};
  private defaultModel?: string;
  private modelConfigs: Record<string, object> = {};

  constructor(options?: DotpromptOptions) {
    this.handlebars = Handlebars.noConflict();
    this.modelConfigs = options?.modelConfigs || this.modelConfigs;
    this.defaultModel = options?.defaultModel;

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

  private renderMetadata<ModelConfig = Record<string, any>>(
    base: PromptMetadata<ModelConfig>,
    ...merges: (PromptMetadata<ModelConfig> | undefined)[]
  ): PromptMetadata<ModelConfig> {
    for (let i = 1; i < merges.length; i++) {
      if (!merges[i]) continue;
      const config = base.config || ({} as ModelConfig);
      base = { ...base, ...merges[i] };
      base.config = { ...config, ...(merges[i]?.config || {}) };
    }
    delete base.input;
    for (const key in base) {
      const val = base[key as keyof typeof base];
      if (val === undefined || val === null || Object.keys(val).length === 0)
        delete base[key as keyof typeof base];
    }
    return base;
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
