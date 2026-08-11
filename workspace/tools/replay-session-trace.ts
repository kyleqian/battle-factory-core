// Replay an exported live-session trace (window.__POKEBENCH_SESSION__() /
// the crash overlay's JSON) headlessly through the engine, and report where
// it throws — turning a user's in-browser crash into a deterministic local
// repro in seconds.
//
//   npx tsx tools/replay-session-trace.ts crash.json
//   npx tsx tools/replay-session-trace.ts crash.json --tail 30
//
// Exit codes: 0 = replayed clean to the end, 1 = engine threw, 2 = bad input.

import { readFileSync } from "node:fs";
import { createInitialState, tick } from "../src/engine/core.ts";
import { normalizeButtons, type GbaButton } from "../src/input.ts";
import type { RecordedSegment, SessionTrace } from "../src/sessionRecorder.ts";

function fail(message: string): never {
  console.error(`replay-session-trace: ${message}`);
  process.exit(2);
}

const args = process.argv.slice(2);
const tailFlag = args.indexOf("--tail");
const tailCount = tailFlag === -1 ? 15 : Number(args[tailFlag + 1] ?? 15);
const file = args.find((arg, i) => !arg.startsWith("--") && (tailFlag === -1 || i !== tailFlag + 1));
if (!file) fail("usage: npx tsx tools/replay-session-trace.ts <trace.json> [--tail N]");

let trace: SessionTrace;
try {
  trace = JSON.parse(readFileSync(file, "utf8")) as SessionTrace;
} catch (error) {
  fail(`cannot read ${file}: ${String(error)}`);
}
if (!Array.isArray(trace.segments)) fail("trace has no segments array");

const totalFrames = trace.segments.reduce((sum, s) => sum + s.frames, 0);
console.log(
  `replaying ${trace.segments.length} segments / ${totalFrames} frames` +
    (trace.build ? ` (recorded on build ${trace.build})` : ""),
);
if (trace.error) console.log(`recorded error: ${trace.error.name}: ${trace.error.message}`);

let state = createInitialState(
  trace.appRoute ? { appRoute: trace.appRoute as never } : {},
);
let frame = 0;
const pressed: Array<{ frame: number; buttons: GbaButton[] }> = [];

for (const segment of trace.segments as RecordedSegment[]) {
  const buttons = new Set(normalizeButtons(segment.buttons ?? []));
  if (buttons.size > 0) pressed.push({ frame, buttons: [...buttons] });
  for (let i = 0; i < segment.frames; i += 1) {
    try {
      state = tick(state, buttons);
    } catch (error) {
      console.error(`\nENGINE THREW at frame ${frame}:`);
      console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
      if (error instanceof Error && error.stack) {
        console.error(error.stack.split("\n").slice(1, 5).join("\n"));
      }
      const tail = pressed.slice(-Math.max(1, tailCount));
      console.error(`\nlast ${tail.length} input runs before the throw:`);
      for (const entry of tail) console.error(`  frame ${entry.frame}: ${entry.buttons.join("+")}`);
      process.exit(1);
    }
    frame += 1;
  }
}
console.log(`replayed clean: ${frame} frames, no engine throw.`);
