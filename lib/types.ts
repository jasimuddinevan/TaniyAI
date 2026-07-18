export type Role = "user" | "assistant" | "system";

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface Message {
  role: Role;
  content: string | ContentPart[];
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  context: number;
  free?: boolean;
  vision?: boolean;
}

export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stop: string;
  stream: boolean;
}

export const DEFAULT_SETTINGS: ChatSettings = {
  model: "tencent/hy3:free",
  temperature: 0.7,
  maxTokens: 1024,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stop: "",
  stream: true,
};

export const MODELS: ModelInfo[] = [
  {
    id: "tencent/hy3:free",
    name: "Tencent Hy3",
    description: "Free general-purpose model",
    context: 128000,
    free: true,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast & affordable OpenAI model",
    context: 128000,
    vision: true,
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "Nemotron Nano VL (Free)",
    description: "Free vision-language model",
    context: 128000,
    free: true,
    vision: true,
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "Strong reasoning & coding",
    context: 200000,
    vision: true,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast multimodal Google model",
    context: 1000000,
    vision: true,
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B",
    description: "Open-weight Meta model",
    context: 128000,
  },
];
