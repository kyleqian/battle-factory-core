// trn181: per-frame RGBA hash of a compare trace's app replay (every frame from --from to --to) plus whether the resolution's current
// command is Scene ON's action-transition pause, to attribute compare:differential differences to the pause. Run the same file in a
// base archive copy and in the final tree; trn181TraceAttribution.py joins the two.
//   node --experimental-strip-types --no-warnings tools/integration/trn181TraceFrames.ts <trace.json> <out.json> [from] [to]
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createInitialState, render, tick } from "../../src/engine/core.ts";
import { presentationRngFromTrace } from "../../src/engine/presentationRngHost.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [tracePath, outPath, fromArg, toArg] = process.argv.slice(2);
const trace = JSON.parse(readFileSync(tracePath!, "utf8"));
const from = Number(fromArg ?? 0), to = Number(toArg ?? 1e9);
const rng = presentationRngFromTrace(trace);
let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene, presentationSeed: rng.seed, presentationRngPolicy: rng.policy });
const frames: Record<number, [string, number]> = {};
const record = (frame: number) => {
  if (frame < from || frame > to) return;
  const r = (state as any).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  const command = r?.segments?.[r.segmentIndex]?.commands?.[r.commandIndex];
  frames[frame] = [createHash("sha1").update(render(state)).digest("hex").slice(0, 12), command?.type === "move-animation" && command.actionTransition ? 1 : 0];
};
record(0);
for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  record(advance.frame);
}
writeFileSync(outPath!, JSON.stringify(frames));
