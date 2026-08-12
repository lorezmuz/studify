"use client";

export type AiProviderId =
  | "ollama"
  | "openai"
  | "xai"
  | "groq"
  | "openrouter"
  | "deepseek"
  | "custom";

export type UserAiConfig = {
  provider: AiProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type ProviderPreset = {
  id: AiProviderId;
  label: string;
  description: string;
  defaultBaseUrl: string;
  defaultModel: string;
  needsKey: boolean;
  freeHint?: string;
};

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "ollama",
    label: "Ollama (locale)",
    description: "AI sul tuo PC. Zero costi, zero API key.",
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    defaultModel: "llama3:latest",
    needsKey: false,
    freeHint: "0€ se hai Ollama installato",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "GPT-4o, GPT-4o-mini, ecc. con la tua chiave.",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    needsKey: true,
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    description: "Modelli Grok con la tua chiave console.x.ai.",
    defaultBaseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4-1-fast-reasoning",
    needsKey: true,
  },
  {
    id: "groq",
    label: "Groq",
    description: "Molto veloce. Ha un piano free con la tua key.",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    needsKey: true,
    freeHint: "Spesso gratis con limiti",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Un solo key per tanti modelli (anche free).",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/auto",
    needsKey: true,
    freeHint: "Modelli free disponibili",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "API economica / key personale.",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    needsKey: true,
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    description: "Qualsiasi endpoint compatibile OpenAI (Together, LM Studio, vLLM...).",
    defaultBaseUrl: "http://127.0.0.1:1234/v1",
    defaultModel: "local-model",
    needsKey: false,
  },
];

const STORAGE_KEY = "volentieri_ai_config";

export function defaultAiConfig(): UserAiConfig {
  return {
    provider: "ollama",
    apiKey: "",
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "llama3:latest",
  };
}

export function getPreset(id: AiProviderId): ProviderPreset {
  return PROVIDER_PRESETS.find((p) => p.id === id) ?? PROVIDER_PRESETS[0];
}

export function getUserAiConfig(): UserAiConfig {
  if (typeof window === "undefined") return defaultAiConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAiConfig();
    const parsed = JSON.parse(raw) as Partial<UserAiConfig>;
    const base = defaultAiConfig();
    return {
      provider: parsed.provider || base.provider,
      apiKey: parsed.apiKey ?? "",
      baseUrl: parsed.baseUrl || base.baseUrl,
      model: parsed.model || base.model,
    };
  } catch {
    return defaultAiConfig();
  }
}

export function saveUserAiConfig(config: UserAiConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("volentieri:ai-config"));
}

/** Payload sicuro da mandare al server (solo per la richiesta, non loggato). */
export function configForRequest(config?: UserAiConfig | null) {
  const c = config ?? (typeof window !== "undefined" ? getUserAiConfig() : null);
  if (!c) return null;
  return {
    provider: c.provider,
    apiKey: c.apiKey || undefined,
    baseUrl: c.baseUrl || undefined,
    model: c.model || undefined,
  };
}

export function describeConfig(config: UserAiConfig): string {
  const preset = getPreset(config.provider);
  const hasKey = Boolean(config.apiKey?.trim());
  if (config.provider === "ollama") {
    return `Ollama · ${config.model}`;
  }
  if (preset.needsKey && !hasKey) {
    return `${preset.label} · manca API key`;
  }
  return `${preset.label} · ${config.model}`;
}
