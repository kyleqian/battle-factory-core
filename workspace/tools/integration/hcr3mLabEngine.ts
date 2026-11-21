// hcr3m: the engine's presentation commands and SE rows of a sound-fixture lab (tools/audio/fixtures/<name>.json), for hcr3mLab.py next to the ROM script trace.
//   node --experimental-strip-types --no-warnings tools/integration/hcr3mLabEngine.ts <fixture-name> <out.json>
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [name, out] = process.argv.slice(2) as [string, string];
const fixture = JSON.parse(readFileSync(new URL(`../audio/fixtures/${name}.json`, import.meta.url), "utf8"));
const { APP_STAGES } = (await import("../compare/appTrace.ts")) as any;
const { appStage } = fixture.trace;
let state: any = createInitialState({ appRoute: fixture.trace.route, battleScene: fixture.trace.battleScene });
if (appStage !== undefined && appStage.frame === 0) state = APP_STAGES[appStage.id](state);
const cmds: unknown[][] = []; const se: unknown[][] = []; let last = "";
for (const advance of traceAdvances(fixture.trace.segments)) {
  if (advance.frame > fixture.frames) break;
  const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
  state = result.result;
  for (const e of result.events) if (e.kind === "se") se.push([e.frame, e.id, e.pan]);
  const res: any = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  const cmd = res?.segments?.[res.segmentIndex]?.commands?.[res.commandIndex];
  const key = cmd === undefined || res.lifecycle?.phase !== "presenting" ? "" : `${res.segmentIndex}.${res.commandIndex}`;
  if (key !== last) {
    last = key;
    if (key !== "") cmds.push([state.frame, res.segmentIndex, res.commandIndex, cmd.type, cmd.battler ?? null, cmd.animation?.moveId ?? cmd.animation ?? null, cmd.timing?.leadFrames ?? null, cmd.timing?.bodyLeadFrames ?? null, cmd.timing?.minimumFrames ?? null]);
  }
}
writeFileSync(out, JSON.stringify({ cmds, se }));
