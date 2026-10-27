import type { ProviderConfig } from "@earendil-works/pi-coding-agent";

export const PROVIDER_ID = "fortytwo";
export const MODEL_ID = "qwen/qwen3.8-27b";
export const DEFAULT_BASE_URL = "https://api.fortytwo.network/v1";
export const BASE_URL_ENV = "FORTYTWO_BASE_URL";

export function createProviderConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    name: "Fortytwo",
    baseUrl: env[BASE_URL_ENV] || DEFAULT_BASE_URL,
    api: "openai-completions",
    apiKey: "$FORTYTWO_API_KEY",
    models: [{
      id: MODEL_ID,
      name: "Qwen3.8 27B",
      reasoning: true,
      input: ["text", "image"],
      contextWindow: 262144,
      maxTokens: 235929,
      cost: { input: 0.425, output: 2.55, cacheRead: 0.085, cacheWrite: 0 },
      thinkingLevelMap: {
        off: "none", minimal: "minimal", low: "low", medium: "medium",
        high: "high", xhigh: "xhigh", max: "max",
      },
      // Every field is set explicitly so request behaviour does not depend on
      // Pi's URL-based auto-detection for unknown OpenAI-compatible hosts.
      compat: {
        supportsReasoningEffort: true,
        supportsUsageInStreaming: true,
        supportsDeveloperRole: true,
        supportsStrictMode: true,
        maxTokensField: "max_completion_tokens",
        thinkingFormat: "openai",
        // Not documented for the Fortytwo API, so Pi does not send them:
        // `store`, and `prompt_cache_key` / `prompt_cache_retention: "24h"` under PI_CACHE_RETENTION=long.
        supportsStore: false,
        supportsLongCacheRetention: false,
      },
    }],
  } satisfies ProviderConfig;
}
