// b4m: the engine's presentation commands of a battle lab (tools/battle-lab/<name>.json, the file the oracle runs), with each command's full timing and the frame the
// live move body's ROM-calibrated source clock (liveMoveSourceAge) reaches age 0. A name with an APP_STAGES entry uses it; any other Rattata-pair lab uses the cln10 generic stage.
//   node --experimental-strip-types --no-warnings tools/integration/b4mEngine.ts <lab-name-without-.json> <out.json> [--scene on|off]
// Prefer tools/integration/labCompare.sh (ROM probe + this engine + the aligned table in one run). --scene runs a lab file in the other scene (profile override; hand-written APP_STAGES entries keep their own scene).
// Output: { cmds: [frame, segment, command, type, battler, move, timing, age0][], se: [frame, id, pan][], sounds: [frame, kind, id, pan][] (se / cry / bgm / fanfare) }.
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { liveMoveSourceAge } from "../../src/engine/battleResolutionPresentationRender.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [arg, out, ...flags] = process.argv.slice(2) as [string, string, ...string[]];
const name = arg.split("/").pop()!.replace(/\.json$/, "");
const sceneFlag = flags.indexOf("--scene") >= 0 ? flags[flags.indexOf("--scene") + 1] : undefined;
if (sceneFlag !== undefined && sceneFlag !== "on" && sceneFlag !== "off") throw new Error(`--scene must be on or off, got ${sceneFlag}`);
const lab = JSON.parse(readFileSync(new URL(`../battle-lab/${name}.json`, import.meta.url), "utf8"));
const scene: "on" | "off" = sceneFlag ?? (lab.profile === "battle-scene-on" ? "on" : "off");
const { APP_STAGES, labBackedStage } = (await import("../compare/appTrace.ts")) as any;
let state: any = createInitialState({ appRoute: "generated-orchestrator", battleScene: scene });
const ownScene = scene === (lab.profile === "battle-scene-on" ? "on" : "off");
state = APP_STAGES[name] !== undefined && ownScene ? APP_STAGES[name](state) : labBackedStage(`${name}.json`, state, undefined, scene);
const cmds: unknown[][] = []; const se: unknown[][] = []; const sounds: unknown[][] = []; let last = "";
let age0: number | null = null;
const frames = lab.trace.segments.reduce((n: number, s: any) => n + s.frames, 0);
for (const advance of traceAdvances(lab.trace.segments)) {
  if (advance.frame > frames) break;
  const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
  state = result.result;
  for (const e of result.events) {
    if (e.kind === "se") se.push([e.frame, e.id, e.pan]);
    if (e.kind === "se" || e.kind === "cry" || e.kind === "bgm" || e.kind === "fanfare") sounds.push([e.frame, e.kind, e.id, e.pan]);
  }
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
writeFileSync(out, JSON.stringify({ cmds, se, sounds }));
