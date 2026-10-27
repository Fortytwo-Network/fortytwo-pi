import { createProviderConfig, PROVIDER_ID } from "../src/provider.ts";
import type { Model } from "@earendil-works/pi-ai";

export function model(): Model<"openai-completions"> {
  const config = createProviderConfig({});
  return { ...config.models[0]!, api: config.api, baseUrl: config.baseUrl, provider: PROVIDER_ID };
}
export function sse(deltas: object[], finish = "stop", usage?: object): Response {
  const data = deltas.map(delta => ({ id: "synthetic", object: "chat.completion.chunk", choices: [{ index: 0, delta, finish_reason: null }] }));
  const frames: object[] = [...data, { id: "synthetic", choices: [{ index: 0, delta: {}, finish_reason: finish }] }];
  if (usage) frames.push({ id: "synthetic", choices: [], usage });
  return new Response(frames.map(frame => `data: ${JSON.stringify(frame)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object");
  return value as Record<string, unknown>;
}
