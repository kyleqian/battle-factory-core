// fch1: the engine's SE rows on an fsc2m lab (tools/battle-lab/fsc2m-<case>-<scene>.json) replayed on the ROM probe's button schedule (the rp-*.json of fsc2mReplay.py).
//   node --experimental-strip-types --no-warnings tools/integration/fch1LabEngine.ts <lab-name> <rp.json> <out.json>
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [name, rp, out] = process.argv.slice(2) as [string, string, string];
const { applyTraceStage } = (await import("../compare/appTrace.ts")) as any;
const lab = JSON.parse(readFileSync(new URL(`../battle-lab/${name}.json`, import.meta.url), "utf8"));
const trace = JSON.parse(readFileSync(rp, "utf8")).trace;
const scene = lab.profile === "battle-scene-on" ? "on" : "off";
const stageTrace = { appStage: { id: "lab", frame: 0 }, oracleBattleLab: { scenario: `${name}.json` } };
let state: any = createInitialState({ appRoute: "generated-orchestrator", battleScene: scene });
state = applyTraceStage(stageTrace, state);
const se: unknown[][] = [];
for (const advance of traceAdvances(trace.segments)) {
  const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
  state = result.result;
  for (const e of result.events) if (e.kind === "se") se.push([e.frame, e.id]);
}
writeFileSync(out, JSON.stringify({ se }));
