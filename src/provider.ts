import type { ProviderConfig } from "@earendil-works/pi-coding-agent";

export const PROVIDER_ID = "fortytwo";
export const MODEL_ID = "qwen/qwen3.8-27b";

export function createProviderConfig() {
  return {
    name: "Fortytwo",
    baseUrl: "https://api.fortytwo.network/v1",
    api: "openai-completions",
    apiKey: "$FORTYTWO_API_KEY",
    models: [{
      id: MODEL_ID,
      name: "Qwen: Qwen3.8 27B",
      reasoning: true,
      input: ["text", "image"],
      contextWindow: 262144,
      maxTokens: 235929,
      cost: { input: 0.425, output: 2.55, cacheRead: 0.085, cacheWrite: 0 },
      thinkingLevelMap: {
        off: "none", minimal: "minimal", low: "low", medium: "medium",
        high: "high", xhigh: "xhigh", max: "max",
      },
      compat: {
        supportsReasoningEffort: true,
        supportsUsageInStreaming: true,
        supportsDeveloperRole: true,
        supportsStrictMode: true,
        maxTokensField: "max_completion_tokens",
      },
    }],
  } satisfies ProviderConfig;
}
