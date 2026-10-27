import assert from "node:assert/strict";
import test from "node:test";
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions";
import { normalizeContext } from "@earendil-works/pi-ai/utils/transcript";
import { model, sse, record } from "./helpers.ts";
import { createProviderConfig, DEFAULT_BASE_URL } from "../src/provider.ts";

const context = () => normalizeContext({ messages: [{ role: "user", content: "Synthetic request", timestamp: 0 }] });

test("model metadata matches verified catalog limits and prices", () => {
 const m = model();
 assert.equal(m.contextWindow, 262144); assert.equal(m.maxTokens, 235929);
 assert.deepEqual(m.cost, {input:0.425, output:2.55, cacheRead:0.085, cacheWrite:0});
 assert.deepEqual(m.input, ["text", "image"]);
});

for (const level of ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const) {
 test(`Pi serializes reasoning ${level}, auth, endpoint and output ceiling`, async () => {
  let sent = false;
  const fetch: typeof globalThis.fetch = async (input, init) => {
   const request = new Request(input, init); const payload = record(await request.json());
   assert.equal(request.url, "https://api.fortytwo.network/v1/chat/completions");
   assert.equal(request.headers.get("authorization"), "Bearer synthetic-test-key");
   assert.equal(payload.reasoning_effort, level === "off" ? "none" : level);
   assert.equal(payload.max_completion_tokens, 235929);
   assert.equal(payload.stream, true); assert.deepEqual(payload.stream_options, {include_usage:true});
   sent = true; return sse([{content:"Привет 🌍"}]);
  };
  const result = await streamSimple(model(), context(), {apiKey:"synthetic-test-key", reasoning:level === "off" ? undefined : level, fetch}).result();
  assert.equal(result.stopReason,"stop"); assert.ok(sent);
  assert.equal(result.content.find(c=>c.type==="text")?.text,"Привет 🌍");
 });
}

test("streamed reasoning and fragmented tool arguments survive continuation; cache charged separately", async () => {
 const first = await streamSimple(model(), context(), {apiKey:"synthetic-test-key", fetch:async()=>sse([
  {reasoning:"Inspect the fixture"},
  {tool_calls:[{index:0,id:"call_fixture",type:"function",function:{name:"lookup",arguments:'{"id":'}}]},
  {tool_calls:[{index:0,function:{arguments:'7}'}}]},
 ],"tool_calls",{prompt_tokens:1000,completion_tokens:100,total_tokens:1100,prompt_tokens_details:{cached_tokens:400}})}).result();
 assert.equal(first.stopReason,"toolUse");
 assert.deepEqual(first.content.find(c=>c.type==="toolCall")?.arguments,{id:7});
 assert.ok(first.content.some(c=>c.type==="thinking"));
 assert.equal(first.usage.input,600);assert.equal(first.usage.cacheRead,400);
 assert.ok(Math.abs(first.usage.cost.total - (600*0.425+400*0.085+100*2.55)/1e6)<1e-12);
 const next=normalizeContext({messages:[...context().messages,first,{role:"toolResult",toolCallId:"call_fixture",toolName:"lookup",content:[{type:"text",text:"verified"}],isError:false,timestamp:1}]});
 let replayed=false;
 const result=await streamSimple(model(),next,{apiKey:"synthetic-test-key",fetch:async(input,init)=>{
  const body=record(await new Request(input,init).json());
  assert.ok(Array.isArray(body.messages));
  const messages=body.messages.map(record);
  assert.equal(messages.at(-1)?.tool_call_id,"call_fixture");
  assert.equal(messages.at(-1)?.content,"verified");replayed=true;
  return sse([{content:"verified"}]);
 }}).result();assert.ok(replayed);assert.equal(result.stopReason,"stop");
});

test("missing credentials fail before sending a request",()=>{
 assert.throws(()=>streamSimple(model(),context(),{apiKey:""}),/key|auth/i);
});

test("HTTP failure produces a terminal error instead of successful empty text",async()=>{
 const result=await streamSimple(model(),context(),{apiKey:"synthetic-test-key",maxRetries:0,fetch:async()=>new Response(JSON.stringify({error:{message:"Synthetic rejected request",type:"invalid_request_error"}}),{status:400,headers:{"content-type":"application/json"}})}).result();
 assert.equal(result.stopReason,"error");assert.match(result.errorMessage??"",/Synthetic rejected request/);
});

test("abort is preserved by the host transport",async()=>{
 const controller=new AbortController();controller.abort();
 const result=await streamSimple(model(),context(),{apiKey:"synthetic-test-key",signal:controller.signal,fetch:async()=>{throw new DOMException("Aborted","AbortError");}}).result();
 assert.equal(result.stopReason,"aborted");
});

for (const [status, code] of [
 [401, "invalid_api_key"], [403, "account_suspended"],
 [429, "insufficient_quota"], [429, "concurrency_limit_exceeded"],
 [500, "internal_error"], [502, "upstream_error"],
 [503, "admission_unavailable"], [504, "upstream_timeout"],
] as const) {
 test(`HTTP ${status} ${code} remains a terminal failure`, async () => {
  let requests = 0;
  const stream = streamSimple(model(), context(), {
   apiKey: "synthetic-test-key", maxRetries: 0,
   fetch: async () => {
    requests++;
    return new Response(JSON.stringify({error:{message:code,type:"server_error",code}}),
     {status,headers:{"content-type":"application/json"}});
   },
  });
  const result = await stream.result();
  assert.equal(result.stopReason, "error");
  assert.ok(result.errorMessage?.includes(code));
  assert.equal(requests, 1);
 });
}

for (const [name, suffix, error] of [
 ["missing finish reason", "data: [DONE]\n\n", "finish_reason"],
 ["SSE error", 'data: {"error":{"message":"synthetic upstream failure","type":"server_error","code":"upstream_error"}}\n\n', "synthetic upstream failure"],
 ["malformed SSE JSON", "data: {broken\n\n", ""],
] as const) {
 test(`${name} preserves partial output but cannot report success`, async () => {
  const chunk = {id:"partial",choices:[{index:0,delta:{content:"Partial answer"},finish_reason:null}]};
  const stream = streamSimple(model(), context(), {
   apiKey:"synthetic-test-key",maxRetries:0,
   fetch:async()=>new Response(`data: ${JSON.stringify(chunk)}\n\n${suffix}`,{headers:{"content-type":"text/event-stream"}}),
  });
  const terminals: string[] = [];
  for await (const event of stream) if (event.type === "done" || event.type === "error") terminals.push(event.type);
  const result=await stream.result();
  assert.deepEqual(terminals,["error"]);
  assert.equal(result.stopReason,"error");
  assert.equal(result.content.find(c=>c.type==="text")?.text,"Partial answer");
  assert.ok(result.errorMessage);
  if (error) assert.ok(result.errorMessage.includes(error));
 });
}

test("connection failure is surfaced rather than an empty success",async()=>{
 const result=await streamSimple(model(),context(),{
  apiKey:"synthetic-test-key",maxRetries:0,
  fetch:async()=>{throw new TypeError("synthetic connection failure");},
 }).result();
 assert.equal(result.stopReason,"error");assert.ok(result.errorMessage);
});

test("base URL defaults to production and can be overridden for staging", () => {
 assert.equal(createProviderConfig({}).baseUrl, DEFAULT_BASE_URL);
 assert.equal(createProviderConfig({FORTYTWO_BASE_URL:"https://staging.example/v1"}).baseUrl, "https://staging.example/v1");
});

test("requests carry no store or long prompt-cache fields, even with long retention", async () => {
 let sent = false;
 await streamSimple(model(), context(), {apiKey:"synthetic-test-key", sessionId:"synthetic-session", cacheRetention:"long", fetch:async(input,init)=>{
  const payload = record(await new Request(input,init).json());
  assert.equal("store" in payload, false);
  assert.equal("prompt_cache_retention" in payload, false);
  assert.equal("prompt_cache_key" in payload, false);
  sent = true; return sse([{content:"ok"}]);
 }}).result();
 assert.ok(sent);
});
