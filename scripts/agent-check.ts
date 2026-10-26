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
const env = {...process.env, PI_CODING_AGENT_DIR:agent, PI_OFFLINE:"1", PI_TELEMETRY:"0"};
function run(args:string[]):string {
 const result=spawnSync("pi",args,{cwd:work,env,encoding:"utf8",timeout:180000,maxBuffer:8*1024*1024});
 if(result.error) throw result.error;
 assert.equal(result.status,0,result.stderr);
 return result.stdout;
}
try {
 run(["install",root]);
 const common=["--no-skills","--no-mcp","--no-context-files"];
 const listing=run([...common,"--list-models","fortytwo"]);
 assert.match(listing,/qwen\/qwen3\.8-27b/);
 const output=run([...common,"--no-session","--tools","read","--provider","fortytwo","--model","qwen/qwen3.8-27b","--thinking","off","--mode","json","-p","Read first.txt, follow its instruction to read the second file, and return only the verification code."]);
 const events: Array<{type:string;message?:{role:string;stopReason?:string;content?:Array<{type:string;text?:string}>}}> = output.split("\n").filter(line=>line.startsWith("{")).map(line=>JSON.parse(line));
 const toolResults=events.filter(e=>e.type==="tool_execution_end");
 const messages=events.filter(e=>e.type==="message_end"&&e.message?.role==="assistant");
 const final=messages.at(-1)?.message;
 assert.equal(toolResults.length,2);
 assert.equal(final?.stopReason,"stop");
 assert.ok(final?.content?.some(c=>c.type==="text"&&c.text?.includes("FT-PRODUCT-5729")));
 console.log(JSON.stringify({packageInstall:"pass",modelDiscovery:"pass",toolResults:toolResults.length,continuation:"pass",finalCode:"pass"}));
} finally { rmSync(temporary,{recursive:true,force:true}); }
