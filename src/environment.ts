import Handlebars from "handlebars";
import * as helpers from "./helpers";
import { DataArgument, PromptMetadata } from "./types";
import { parseDocument, toMessages } from "./parse";

export interface DotpromptOptions {}

export class DotpromptEnvironment {
  private handlebars: typeof Handlebars;
  private knownHelpers: Record<string, true> = {};

  constructor(options?: DotpromptOptions) {
    this.handlebars = Handlebars.noConflict();
    for (const key in helpers) {
      this.knownHelpers[key] = true;
      this.handlebars.registerHelper(key, helpers[key as keyof typeof helpers]);
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

  private mergeMetadata<ModelConfig = Record<string, any>>(
    base: PromptMetadata<ModelConfig>,
    ...merges: (PromptMetadata<ModelConfig> | undefined)[]
  ): PromptMetadata<ModelConfig> {
    for (let i = 1; i < merges.length; i++) {
      if (!merges[i]) continue;
      const config = base.config || ({} as ModelConfig);
      base = { ...base, ...merges[i] };
      base.config = { ...config, ...(merges[i]?.config || {}) };
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
      const metadata: PromptMetadata<ModelConfig> = { ...parsedMetadata, ...options };
      const renderedString = renderString(data.input, {
        data: {
          metadata: { prompt: metadata, context: data.context, history: data.history },
        },
      });
      return {
        ...this.mergeMetadata(parsedMetadata, options),
        messages: toMessages<ModelConfig>(renderedString, data, metadata),
      };
    };
  }
}
