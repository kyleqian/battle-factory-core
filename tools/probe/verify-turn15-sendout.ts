// Pixel boundary pin for ISSUES #37 post-SEND-OUT.  The companion RAM/OAM
// probe is dump-turn15-sendout.py.  Usage:
//   node --experimental-strip-types tools/probe/verify-turn15-sendout.ts
import { readFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const base = JSON.parse(readFileSync("tools/compare/traces-groundtruth/battle1-turn15-dense.json", "utf8")) as Trace;
let failures = 0;
let passes = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) { passes += 1; console.log(`PASS  ${label}`); }
  else { failures += 1; console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`); }
}
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

async function capture(frames: number[]) {
  const trace = structuredClone(base);
  trace.captureFrames = frames;
  const result = await runOracleTrace(trace);
  return new Map(result.captures.map((c) => [c.frame, c.sha256.slice(0, 12)]));
}
async function main() {
  // Two fresh runs keep the dense checks below the service's 256-capture cap.
  const early = await capture(range(20245, 20480));
  const late = await capture(range(20481, 20560));
  const sha = (t: number) => early.get(t) ?? late.get(t) ?? "MISSING";
  console.log("Fresh oracle captures: 316 ticks in 2 capped runs.");

  check("canonical SEND OUT confirm transient is 20245", sha(20245) === "4e987c2ebe0b", sha(20245));
  check("submenu begins changing on 20247 after the held confirm frame", sha(20246) === sha(20245) && sha(20247) !== sha(20245), `${sha(20245)} -> ${sha(20247)}`);
  check("party-menu fade reaches pure black at 20263", sha(20263) === "d8b443032200", sha(20263));
  check("pure-black hold is exact through 20301", range(20263, 20301).every((t) => sha(t) === "d8b443032200"));
  check("battle-field fade-in first visible frame is 20302", sha(20302) === "4da3117d37db" && sha(20302) !== sha(20301), `${sha(20301)} -> ${sha(20302)}`);
  check("fade-in advances each frame through 20317", new Set(range(20302, 20317).map(sha)).size === 16);
  check("Go! MAGBY typing handoff begins at 20330", sha(20330) === "9bdfaa907a11" && sha(20330) !== sha(20329), `${sha(20329)} -> ${sha(20330)}`);
  check("text/throw handoff remains dynamic across 20330-20339", new Set(range(20330, 20339).map(sha)).size >= 8);
  check("post-ball field is pixel-static through 20390 before MAGBY ownership", sha(20388) === sha(20389) && sha(20389) === sha(20390), `${sha(20388)} -> ${sha(20389)} -> ${sha(20390)}`);
  check("later ball-open/materialize anchor at 20400 is stable", sha(20400) === "07d53943f65a", sha(20400));
  check("materialize has a non-plateau growing run 20400-20430", new Set(range(20400, 20430).map(sha)).size >= 25);
  check("mid-materialize anchor 20456 is stable", sha(20456) === "0f9a943dbb41", sha(20456));
  check("final materialize hold starts at 20534", sha(20534) === "4f63d4696c93" && range(20534, 20550).every((t) => sha(t) === "4f63d4696c93"));
  check("Go! MAGBY clears to the blank box at 20551", sha(20551) === "a7a1d6374012", sha(20551));
  check("blank box holds through 20556 (no flavor quip)", range(20551, 20556).every((t) => sha(t) === "a7a1d6374012"));
  check("settled action menu first appears at 20557", sha(20557) === "5950e7b3d8ba", sha(20557));
  check("settled menu's first bounce sequence is 5950/083f/5950", sha(20557) === "5950e7b3d8ba" && sha(20558) === "083f11ed7f87" && sha(20559) === "5950e7b3d8ba");
  console.log(`\n${passes} PASS assertions; ${failures} failures.`);
  process.exit(failures ? 1 : 0);
}
main();
