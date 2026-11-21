// stc1 (docs/aud251-s11-scoreboard-refresh.md "stc1"): Scene OFF's stat-change SE (StatsChangeAnimation Step2, playanimation exec + 4) in the battle labs.
// ROM frames = soundEventProbe.py lab --profile off on each lab (frame k = the lab's k-th advance = engine state.frame k); engine = the lab replayed through b4mEngine's stage.
// After the OFF body (Pausex20) the stats-change command starts on exec + 1 (SE at command age 3); after a secondary effect's hit chain on exec (age 4).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

type Engine = ReturnType<typeof createInitialState>;
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES, labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: Engine) => Engine>;
  labBackedStage: (file: string, state: Engine) => Engine;
};

function statSeFrame(lab: string): { frame: number; id: number; drop: number | null } {
  const request = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${lab}.json`, import.meta.url), "utf8")) as { trace: { segments: Array<{ frames: number }> } };
  let state: Engine = createInitialState({ appRoute: "generated-orchestrator", battleScene: "off" });
  state = APP_STAGES[lab] !== undefined ? APP_STAGES[lab]!(state) : labBackedStage(`${lab}.json`, state);
  const total = request.trace.segments.reduce((n, s) => n + s.frames, 0);
  let drop: number | null = null;
  for (const advance of traceAdvances(request.trace.segments as never)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    const resolution = (state as { factoryRoundBattleOrchestrator?: { battleResolutionPresentation?: { segments: Array<{ commands: Array<{ type: string; from?: number; to?: number }> }>; segmentIndex: number; commandIndex: number } } }).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = resolution?.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
    if (drop === null && command?.type === "hp") drop = command.from! - command.to!;
    const stat = result.events.find((e) => e.kind === "se" && (e.id === 239 || e.id === 245) && e.frame > 25);
    if (stat !== undefined) return { frame: stat.frame, id: stat.id as number, drop };
  }
  throw new Error(`${lab}: no stat SE`);
}

describe("Scene OFF stat-change SE frames (stc1)", () => {
  // [lab, ROM SE id, ROM frame]: the move-caused paths (Evasion / Defense up, Attack down; both attacker sides), exact.
  const exact: Array<[string, number, number]> = [
    ["hcr1b-harden-foe-off", 239, 99],
    ["stc1-swordsdance-foe-off", 239, 105],
    ["hcr1b-growl-foe-off", 245, 100],
    ["hcr1b-growl-plr-off", 245, 96],
  ];
  for (const [lab, id, frame] of exact) {
    it(`${lab}: SE ${id} at the ROM's frame ${frame}`, { timeout: 120_000 }, () => {
      const { frame: at, id: seId } = statSeFrame(lab);
      expect({ frame: at, id: seId }).toEqual({ frame, id });
    });
  }

  // stc2: a secondary stat drop after a hit. The ROM's hp row -> StatDown playanimation is the bar's drop + 8 (both scenes) and the SE is that exec + 4, so the engine's SE is
  // ROM + (engine drop - ROM drop): these labs' engine rolls a different damage than the ROM (RNG not synchronised in the lab stage), so the frame is pinned through the drop.
  // [lab, ROM SE frame, ROM drop] (hcr3mProbe rows: Icy Wind foe hp 105 -> 43, player 105 -> 35, Rock Tomb 105 -> 8).
  const secondary: Array<[string, number, number]> = [
    ["stc1-icywind-foe-off", 210, 62],
    ["stc1-icywind-plr-off", 214, 70],
    ["stc1-rocktomb-foe-off", 246, 97],
  ];
  for (const [lab, frame, romDrop] of secondary) {
    it(`${lab}: SE at ROM ${frame} + (engine bar - ROM bar ${romDrop})`, { timeout: 120_000 }, () => {
      const { frame: at, drop } = statSeFrame(lab);
      expect(drop).not.toBeNull();
      expect(at - frame).toBe(drop! - romDrop);
    });
  }
});
