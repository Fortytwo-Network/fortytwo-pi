import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

if (!process.env.FORTYTWO_API_KEY) throw new Error("Set FORTYTWO_API_KEY explicitly to run the agent check");
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "fortytwo-pi-check-"));
const work = join(temporary, "work");
const agent = join(temporary, "agent");
mkdirSync(work); mkdirSync(agent);
writeFileSync(join(work, "first.txt"), "Read second.txt to obtain the verification code.\n");
writeFileSync(join(work, "second.txt"), "Verification code: FT-PRODUCT-5729.\n");
writeFileSync(join(agent, "settings.json"), JSON.stringify({retry:{enabled:false},compaction:{enabled:false}}));
// Compaction scenario: a separate agent directory whose context window is lowered to 40,000 tokens,
// so reading five ~7,000-token files crosses the threshold (contextWindow - reserveTokens).
const compactionAgent = join(temporary, "agent-compaction");
mkdirSync(compactionAgent);
writeFileSync(join(compactionAgent, "settings.json"), JSON.stringify({retry:{enabled:false},compaction:{enabled:true,reserveTokens:8000,keepRecentTokens:6000}}));
writeFileSync(join(compactionAgent, "models.json"), JSON.stringify({providers:{fortytwo:{modelOverrides:{"qwen/qwen3.8-27b":{contextWindow:40000,maxTokens:6000}}}}}));
const words = ["river","stone","cloud","amber","signal","harbor","lantern","meadow","copper","falcon","orbit","timber","velvet","quartz"];
for (let part = 1; part <= 5; part++) {
 const lines = [part === 1 ? "FACT A: the first half of the answer is ALPHA-731." : `This is part ${part} of 5.`];
 for (let n = 0; n < 380; n++) lines.push(`${part}.${n}: ` + Array.from({length:12}, (_, i) => words[(part * 7 + n * 5 + i * 3) % words.length]).join(" "));
 if (part === 5) lines.push("FACT B: the second half of the answer is OMEGA-268.");
 writeFileSync(join(work, `part${part}.txt`), lines.join("\n") + "\n");
}
function run(args:string[],agentDir=agent,timeout=180000):string {
 const env = {...process.env, PI_CODING_AGENT_DIR:agentDir, PI_OFFLINE:"1", PI_TELEMETRY:"0"};
 const result=spawnSync("pi",args,{cwd:work,env,encoding:"utf8",timeout,maxBuffer:32*1024*1024});
 if(result.error) throw result.error;
 assert.equal(result.status,0,result.stderr);
 return result.stdout;
}
try {
 run(["install",root]);
 const common=["--no-skills","--no-mcp","--no-context-files"];
 const listing=run([...common,"--list-models","fortytwo"]);
 assert.match(listing,/qwen\/qwen3\.8-27b/);
 const results: Record<string,string> = {};
 // "off" sends reasoning_effort "none"; "medium" is what Pi sends when no level is chosen,
 // so it covers reasoning replay between tool calls on the default path.
 for (const thinking of ["off","medium"] as const) {
  const output=run([...common,"--no-session","--tools","read","--provider","fortytwo","--model","qwen/qwen3.8-27b","--thinking",thinking,"--mode","json","-p","Read first.txt, follow its instruction to read the second file, and return only the verification code."]);
  const events: Array<{type:string;message?:{role:string;stopReason?:string;content?:Array<{type:string;text?:string}>}}> = output.split("\n").filter(line=>line.startsWith("{")).map(line=>JSON.parse(line));
  const toolResults=events.filter(e=>e.type==="tool_execution_end");
  const messages=events.filter(e=>e.type==="message_end"&&e.message?.role==="assistant");
  const final=messages.at(-1)?.message;
  assert.equal(toolResults.length,2,`thinking ${thinking}: expected 2 tool results`);
  assert.equal(final?.stopReason,"stop",`thinking ${thinking}: final stop reason`);
  assert.ok(final?.content?.some(c=>c.type==="text"&&c.text?.includes("FT-PRODUCT-5729")),`thinking ${thinking}: final code`);
  if (thinking==="medium") assert.ok(messages.some(m=>m.message?.content?.some(c=>c.type==="thinking")),"thinking medium: expected reasoning blocks");
  results[thinking]=`pass (${toolResults.length} tool results)`;
 }
 run(["install",root],compactionAgent);
 const output=run([...common,"--no-session","--tools","read","--provider","fortytwo","--model","qwen/qwen3.8-27b","--thinking","medium","--mode","json","-p","Read part1.txt in full: call read with only the path, never pass offset or limit. Then read part2.txt, part3.txt, part4.txt and part5.txt the same way, one file per tool call, in order. Then reply with FACT A's value and FACT B's value joined by a plus sign, nothing else."],compactionAgent,600000);
 const events: Array<{type:string;aborted?:boolean;errorMessage?:string;result?:{tokensBefore?:number;summary?:string};message?:{role:string;stopReason?:string;content?:Array<{type:string;text?:string}>}}> = output.split("\n").filter(line=>line.startsWith("{")).map(line=>JSON.parse(line));
 const compactions=events.filter(e=>e.type==="compaction_end");
 const final=events.filter(e=>e.type==="message_end"&&e.message?.role==="assistant").at(-1)?.message;
 assert.ok(compactions.length>0,"compaction: expected at least one compaction");
 assert.ok(compactions.every(e=>!e.aborted&&!e.errorMessage&&e.result?.summary),"compaction: every compaction must produce a summary");
 assert.equal(final?.stopReason,"stop","compaction: final stop reason");
 assert.ok(final?.content?.some(c=>c.type==="text"&&c.text?.includes("ALPHA-731")&&c.text?.includes("OMEGA-268")),"compaction: facts from before and after compaction");
 results.compaction=`pass (${compactions.length} compaction, ${compactions[0]?.result?.tokensBefore} tokens before)`;
 console.log(JSON.stringify({packageInstall:"pass",modelDiscovery:"pass",...results}));
} finally { rmSync(temporary,{recursive:true,force:true}); }
