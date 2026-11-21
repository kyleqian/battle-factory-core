// etp2: the engine's SE rows (all but SE_M_HAIL) of a battle lab, either scene. node --experimental-strip-types --no-warnings tools/integration/etp2SeLab.ts <lab-name> on|off [frames]
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync } from "node:fs";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [name, scene, framesArg] = process.argv.slice(2) as [string, "on" | "off", string | undefined];
const lab = JSON.parse(readFileSync(new URL(`../battle-lab/${name}.json`, import.meta.url), "utf8"));
const { labBackedStage } = (await import("../compare/appTrace.ts")) as any;
let state: any = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene);
const frames = framesArg === undefined ? lab.trace.segments.reduce((n: number, s: any) => n + s.frames, 0) : Number(framesArg);
const out: string[] = [];
for (const a of traceAdvances(lab.trace.segments)) {
  if (a.frame > frames) break;
  const r = collectSoundTick(state.frame + 1, () => tick(state, a.buttons));
  state = r.result;
  for (const e of r.events) if (e.kind === "se" && e.id !== 242) out.push(`${e.frame}:${e.id}:${e.pan}`);
}
console.log(out.join(" "));
