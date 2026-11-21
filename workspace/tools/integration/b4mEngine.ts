// b4m: the engine's presentation commands of a battle lab (tools/battle-lab/<name>.json, the file the oracle runs), with each command's full timing and the frame the
// live move body's ROM-calibrated source clock (liveMoveSourceAge) reaches age 0. A name with an APP_STAGES entry uses it; any other Rattata-pair lab uses the cln10 generic stage.
// ENGINE_RNG_SEED=n overrides the engine kernel RNG start value of a lab-backed stage (the ROM lab keeps its own seed; chg1 / chg2 pick the value whose accuracy rolls agree with the ROM).
//   node --experimental-strip-types --no-warnings tools/integration/b4mEngine.ts <lab-name-without-.json> <out.json>
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { liveMoveSourceAge } from "../../src/engine/battleResolutionPresentationRender.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [name, out] = process.argv.slice(2) as [string, string];
const lab = JSON.parse(readFileSync(new URL(`../battle-lab/${name}.json`, import.meta.url), "utf8"));
const { APP_STAGES, labBackedStage } = (await import("../compare/appTrace.ts")) as any;
let state: any = createInitialState({ appRoute: "generated-orchestrator", battleScene: lab.profile === "battle-scene-on" ? "on" : "off" });
state = APP_STAGES[name] !== undefined ? APP_STAGES[name](state) : labBackedStage(`${name}.json`, state, process.env.ENGINE_RNG_SEED === undefined ? undefined : Number(process.env.ENGINE_RNG_SEED));
const cmds: unknown[][] = []; const se: unknown[][] = []; let last = "";
let age0: number | null = null;
const frames = lab.trace.segments.reduce((n: number, s: any) => n + s.frames, 0);
for (const advance of traceAdvances(lab.trace.segments)) {
  if (advance.frame > frames) break;
  const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
  state = result.result;
  for (const e of result.events) if (e.kind === "se") se.push([e.frame, e.id, e.pan]);
  const res: any = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  const cmd = res?.segments?.[res.segmentIndex]?.commands?.[res.commandIndex];
  const key = cmd === undefined || res.lifecycle?.phase !== "presenting" ? "" : `${res.segmentIndex}.${res.commandIndex}`;
  if (key !== last) {
    last = key;
    age0 = null;
    if (key !== "") cmds.push([state.frame, res.segmentIndex, res.commandIndex, cmd.type, cmd.battler ?? null, cmd.animation?.moveId ?? cmd.animation ?? null, cmd.timing ?? null, null]);
  }
  if (key !== "" && cmd.type === "move-animation" && age0 === null) {
    const a = liveMoveSourceAge(res);
    if (a !== null && a.age >= 0) { age0 = state.frame; (cmds[cmds.length - 1] as unknown[])[7] = state.frame; }
  }
}
writeFileSync(out, JSON.stringify({ cmds, se }));
