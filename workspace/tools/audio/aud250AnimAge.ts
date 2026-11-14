// aud250: ROM vs engine anchor probe for presented General_* commands. Replays a soundEventProbe fixture (trace.route / appStage / segments) on the
// engine and prints, per presented command of the wanted types, the first frame (1-based, as the probe's `frame`), its phaseElapsed at every emitted
// SE and the ROM rows, so a command-age anchor can be read off: anchor = elapsed at the ROM frame of the first row minus its script time.
//   node --experimental-strip-types --no-warnings tools/audio/aud250AnimAge.ts FIXTURE.json [type[,type]]
import { readFileSync } from "node:fs";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const appTracePath = "../compare/appTrace.ts";
const { APP_STAGES } = (await import(appTracePath)) as { APP_STAGES: Record<string, (s: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>> };
const rom = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const wanted = new Set((process.argv[3] ?? "general-animation,status-animation").split(","));
let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene ?? "on" });
if (rom.trace.appStage !== undefined && rom.trace.appStage.frame === 0) state = APP_STAGES[rom.trace.appStage.id]!(state);
let lastKey = "";
const out: string[] = [];
for (const advance of traceAdvances(rom.trace.segments)) {
  if (advance.frame > rom.frames) break;
  const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
  state = result.result;
  const res: any = (state as any).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  const cmd = res?.segments[res.segmentIndex]?.commands[res.commandIndex];
  if (cmd !== undefined && wanted.has(cmd.type) && res.lifecycle.phase === "presenting") {
    const key = `${res.segmentIndex}:${res.commandIndex}`;
    if (key !== lastKey) { lastKey = key; out.push(`frame ${advance.frame}: command ${cmd.type} ${cmd.animation ?? ""} battler ${cmd.battler} minimumFrames ${cmd.timing?.minimumFrames} (phaseElapsed ${res.lifecycle.phaseElapsed})`); }
  }
  for (const e of result.events) if (e.kind === "se" && e.id !== 5) out.push(`  engine SE ${e.id} pan ${e.pan} at frame ${advance.frame}${cmd !== undefined && res.lifecycle.phase === "presenting" ? ` (elapsed ${res.lifecycle.phaseElapsed}, ${cmd.type})` : ""}`);
}
console.log(out.join("\n"));
console.log("ROM:", rom.events.filter((e: any) => e.kind === "se" && e.id !== 5).map((e: any) => `${e.id}@${e.frame}(${e.pan})`).join(" "));
