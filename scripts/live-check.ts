import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions";
import { normalizeContext } from "@earendil-works/pi-ai/utils/transcript";
import type { Context, Model } from "@earendil-works/pi-ai";
import { createProviderConfig, PROVIDER_ID } from "../src/provider.ts";

const apiKey = process.env.FORTYTWO_API_KEY;
if (!apiKey) throw new Error("Set FORTYTWO_API_KEY explicitly to run the live check");
const config=createProviderConfig();
const model: Model<"openai-completions">={...config.models[0]!,api:config.api,baseUrl:config.baseUrl,provider:PROVIDER_ID};
async function check(name:string,context:Context,reasoning:"off"|"high",expected:string) {
 let deltas=0;let status=0;let requestId:string|null=null;
 const stream=streamSimple(model,normalizeContext(context),{apiKey,reasoning:reasoning === "off" ? undefined : reasoning,maxTokens:512,maxRetries:0,signal:AbortSignal.timeout(180000),onResponse:(response)=>{status=response.status;requestId=response.headers["x-request-id"] ?? null;}});
 for await(const event of stream) if(event.type==="text_delta"||event.type==="thinking_delta") deltas++;
 const result=await stream.result();
 const text=result.content.filter(c=>c.type==="text").map(c=>c.text).join("");
 assert.equal(status,200);assert.equal(result.stopReason,"stop",result.errorMessage);assert.ok(text.includes(expected),text);assert.ok(deltas>0);
 if(reasoning==="off") assert.ok(!result.content.some(c=>c.type==="thinking"));
 console.log(JSON.stringify({name,status,requestId,stop:result.stopReason,deltas,usage:result.usage}));
}
if (!process.argv.includes("--image-only")) {
await check("reasoning-off",{messages:[{role:"user",content:"Reply exactly PI-READY-42",timestamp:Date.now()}]},"off","PI-READY-42");
const records=Array.from({length:6000},(_,i)=>i===4173?"Record 4173: verification code LONG-PRODUCT-9264.":`Record ${i}: ordinary synthetic context for provider validation.`).join("\n");
await check("long-context-reasoning-high",{messages:[{role:"user",content:`Find the verification code. Return only the code.\n${records}`,timestamp:Date.now()}]},"high","LONG-PRODUCT-9264");

}
await check("image-input",{messages:[{role:"user",content:[{type:"text",text:"What solid color is this image? Reply with exactly one lowercase English color word."},{type:"image",data:readFileSync(new URL("../tests/fixtures/red.png",import.meta.url)).toString("base64"),mimeType:"image/png"}],timestamp:Date.now()}]},"off","red");
