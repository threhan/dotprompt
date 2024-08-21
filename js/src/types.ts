export type Schema = Record<string, any>;

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: Schema;
  outputSchema?: Schema;
}

export type ToolArgument = string | ToolDefinition;

interface HasMetadata {
  /** Arbitrary metadata to be used by tooling or for informational purposes. */
  metadata?: Record<string, any>;
}

export interface PromptMetadata<ModelConfig = Record<string, any>> extends HasMetadata {
  /** The name of the prompt. */
  name?: string;
  /** The variant name for the prompt. */
  variant?: string;
  /** The name of the model to use for this prompt, e.g. `vertexai/gemini-1.0-pro` */
  model?: string;
  /** Names of tools (registered separately) to allow use of in this prompt. */
  tools?: string[];
  /** Definitions of tools to allow use of in this prompt. */
  toolDefs?: ToolDefinition[];
  /** Model configuration. Not all models support all options. */
  config?: ModelConfig;
  /** Configuration for input variables. */
  input?: {
    /** Defines the default input variable values to use if none are provided. */
    default?: Record<string, any>;
    /** Schema definition for input variables. */
    schema?: Schema;
  };

  /** Defines the expected model output format. */
  output?: {
    /** Desired output format for this prompt. */
    format?: string | "json" | "text";
    /** Schema defining the output structure. */
    schema?: Schema;
  };
}

interface EmptyPart extends HasMetadata {
  text?: never;
  data?: never;
  media?: never;
  toolRequest?: never;
  toolResponse?: never;
}

export type TextPart = Omit<EmptyPart, "text"> & { text: string };
export type DataPart = Omit<EmptyPart, "data"> & { data: Record<string, any> };
export type MediaPart = Omit<EmptyPart, "media"> & { media: { url: string; contentType?: string } };
export type ToolRequestPart<Input = any> = Omit<EmptyPart, "toolRequest"> & {
  toolRequest: { name: string; input?: Input; ref?: string };
};
export type ToolResponsePart<Output = any> = Omit<EmptyPart, "toolResponse"> & {
  toolResponse: { name: string; output?: Output; ref?: string };
};
export type PendingPart = EmptyPart & { metadata: { pending: true; [key: string]: any } };
export type Part =
  | TextPart
  | DataPart
  | MediaPart
  | ToolRequestPart
  | ToolResponsePart
  | PendingPart;

export interface Message extends HasMetadata {
  role: "user" | "model" | "tool" | "system";
  content: Part[];
  metadata?: Record<string, any>;
}

export interface Document extends HasMetadata {
  content: Part[];
}

export interface DataArgument<Variables = any, State = any> {
  input?: Variables;
  context?: Document[];
  state?: State;
  history?: Message[];
}
