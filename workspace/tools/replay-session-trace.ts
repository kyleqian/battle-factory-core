// Replay an exported live-session trace (window.__POKEBENCH_SESSION__() /
// the crash overlay's JSON) headlessly through the engine, and report where
// it throws — turning a user's in-browser crash into a deterministic local
// repro in seconds.
//
//   npx tsx tools/replay-session-trace.ts crash.json
//   npx tsx tools/replay-session-trace.ts crash.json --tail 30
//   npx tsx tools/replay-session-trace.ts crash.json --render   # tick + render per frame, like main.ts
//
// Accepts a bare SessionTrace or a random-play wrapper whose `session` field
// holds one (tools/browser/randomPlay.mjs *-overlay.session.json).
//
// Exit codes: 0 = replayed clean to the end, 1 = engine threw, 2 = bad input.

import { readFileSync } from "node:fs";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import "../src/engine/monPicPixelsInstall.ts";
import { presentationRngFromTrace } from "../src/engine/presentationRngHost.ts";
import { normalizeButtons, type GbaButton } from "../src/input.ts";
import type { RecordedSegment, SessionTrace } from "../src/sessionRecorder.ts";

function fail(message: string): never {
  console.error(`replay-session-trace: ${message}`);
  process.exit(2);
}

const args = process.argv.slice(2);
const tailFlag = args.indexOf("--tail");
const tailCount = tailFlag === -1 ? 15 : Number(args[tailFlag + 1] ?? 15);
const renderEachFrame = args.includes("--render");
const file = args.find((arg, i) => !arg.startsWith("--") && (tailFlag === -1 || i !== tailFlag + 1));
if (!file) fail("usage: npx tsx tools/replay-session-trace.ts <trace.json> [--tail N] [--render]");

let trace: SessionTrace;
try {
  const parsed = JSON.parse(readFileSync(file, "utf8")) as SessionTrace & { session?: SessionTrace };
  trace = parsed.session && Array.isArray(parsed.session.segments) ? parsed.session : parsed;
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

// Presentation Random2 seed/policy from the export; legacy exports use the documented default.
let presentationRng: ReturnType<typeof presentationRngFromTrace>;
try {
  presentationRng = presentationRngFromTrace(trace);
} catch (error) {
  fail(String(error));
}
let state = createInitialState({
  ...(trace.appRoute ? { appRoute: trace.appRoute as never } : {}),
  battleScene: trace.battleScene ?? "off",
  presentationSeed: presentationRng.seed,
  presentationRngPolicy: presentationRng.policy,
});
let frame = 0;
const pressed: Array<{ frame: number; buttons: GbaButton[] }> = [];

for (const segment of trace.segments as RecordedSegment[]) {
  const buttons = new Set(normalizeButtons(segment.buttons ?? []));
  if (buttons.size > 0) pressed.push({ frame, buttons: [...buttons] });
  for (let i = 0; i < segment.frames; i += 1) {
    let phase = "tick";
    try {
      state = tick(state, buttons);
      if (renderEachFrame) {
        phase = "render";
        render(state);
      }
    } catch (error) {
      console.error(`\nENGINE THREW at frame ${frame} (${phase}):`);
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
console.log(`replayed clean: ${frame} frames${renderEachFrame ? " (tick + render)" : ""}, no engine throw.`);
