// snd1 (Kyle's 2026-11-20 live play: "the battle menus are silent"): SE_SELECT on the battle action menu, the move list and the forfeit
// yes/no box, against ROM windows recorded by tools/audio/soundEventProbe.py (step mode) on the labs tools/battle-lab/snd1-*-menu-{on,off}.json
// (frf250a's Rattata pair, four SEISMIC TOSS). ROM rules: battle_controller_player.c HandleInputChooseAction :245-302 (A always, a D-pad
// press only when the cursor moves, B silent in singles), HandleInputChooseMove :480-597 (A and B always, a D-pad press only when the cursor
// moves), PlayerHandleYesNoInput :1420-1452 (UP / DOWN only when the cursor moves, A and B always).
// This test needs no emulator: the fixtures are committed probe output with the key script embedded.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface Fixture {
  frames: number;
  profile: string;
  events: Array<{ frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }>;
  trace: {
    route: "generated-orchestrator";
    battleScene: "on" | "off";
    appStage: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}
const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}-window.json`, import.meta.url), "utf8")) as Fixture;

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

/** Replays the fixture's key script; returns every emitted SE_SELECT frame and the presentation's phase/cursor timeline (changes only). */
function replay(rom: Fixture): { selects: number[]; timeline: string[] } {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  const stageFrame = rom.trace.appStage.frame; // appTrace.ts: the stage replaces the state after that many ticks
  if (stageFrame === 0) state = APP_STAGES[rom.trace.appStage.id]!(state);
  const selects: number[] = [];
  const timeline: string[] = [];
  let last = "";
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    if (advance.frame <= stageFrame) {
      state = tick(state, advance.buttons);
      if (advance.frame === stageFrame) state = APP_STAGES[rom.trace.appStage.id]!(state);
      continue;
    }
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id === 5) selects.push(advance.frame);
    const p = state.factoryRoundBattleOrchestrator?.battleCommandPresentation;
    const desc = p ? `${p.lifecycle.phase}/${p.actionCursor}/${p.fightCursor}/${p.forfeitCursor}` : "none";
    if (desc !== last) {
      timeline.push(`${advance.frame}:${desc}`);
      last = desc;
    }
  }
  return { selects, timeline };
}
const romSelects = (rom: Fixture): number[] =>
  rom.events.filter((e) => !e.noop && e.kind === "se" && e.id === 5 && e.frame > rom.trace.appStage.frame).map((e) => e.frame);

describe("battle action menu + move list: every SE_SELECT on the ROM frame (both scenes)", () => {
  for (const scene of ["on", "off"] as const) {
    it(`snd1-fight-menu-${scene}`, () => {
      const rom = fixture(`snd1-fight-menu-${scene}`);
      expect(rom.profile).toBe(scene === "on" ? "battle-scene-on" : "battle-scene-off");
      // ROM: 15 sounds. Silent presses: LEFT @65 and UP @85 on FIGHT, DOWN @125 on POKéMON, RIGHT @265 on move 2, DOWN @305 on move 4.
      expect(romSelects(rom)).toEqual([1, 33, 105, 145, 165, 185, 205, 245, 285, 325, 345, 365, 405, 445, 465]);
      const { selects, timeline } = replay(rom);
      expect(selects).toEqual(romSelects(rom));
      // The inputs land where the ROM's did: action-menu cursor walk, FIGHT, the move-cursor walk, B back, FIGHT again, a move.
      expect(timeline.slice(0, 8)).toEqual([
        "1:action-menu/1/0/1", "33:action-menu/0/0/1", "105:action-menu/2/0/1", "145:action-menu/3/0/1",
        "165:action-menu/1/0/1", "185:action-menu/0/0/1", "205:fight-opening/0/0/1", "210:fight-menu/0/0/1",
      ]);
      expect(timeline).toContain("245:fight-menu/0/1/1");
      expect(timeline).toContain("285:fight-menu/0/3/1");
      expect(timeline).toContain("325:fight-menu/0/2/1");
      expect(timeline).toContain("345:fight-menu/0/0/1");
      expect(timeline).toContain("365:fight-closing/0/0/1");
      expect(timeline).toContain("405:fight-opening/0/0/1");
      expect(timeline).toContain("445:fight-menu/0/2/1");
      expect(timeline).toContain("465:none"); // the submitted move hands the turn to the resolution presentation
    });
  }
});

describe("forfeit yes/no box: a cursor press sounds only when the cursor moves (both scenes)", () => {
  for (const scene of ["on", "off"] as const) {
    it(`snd1-forfeit-menu-${scene}`, () => {
      const rom = fixture(`snd1-forfeit-menu-${scene}`);
      // ROM: DOWN @131 on NO and UP @171 on YES are silent; UP @151, DOWN @191, B @211 and the UP @251 back on the action menu sound.
      expect(romSelects(rom)).toEqual([1, 33, 65, 151, 191, 211, 251]);
      const { selects, timeline } = replay(rom);
      expect(selects).toEqual(romSelects(rom));
      expect(timeline).toContain("151:forfeit-question/3/0/0");
      expect(timeline).toContain("191:forfeit-question/3/0/1");
      expect(timeline).toContain("211:forfeit-closing/3/0/1");
      expect(timeline).toContain("251:action-menu/1/0/1");
    });
  }
});

describe("the `\\p` page of a selection message plays SE_SELECT on the A that dismisses it (text.c TextPrinterWaitWithDownArrow)", () => {
  it("snd1-torment-reject-off: A on the Tormented move, A on the rejection text, RIGHT, A", () => {
    const rom = fixture("snd1-torment-reject-off");
    // ROM (lab frames, the app stage starts at 734): FIGHT 735, the rejected TACKLE 767, the dismiss 969, RIGHT 1011, GUST 1043.
    expect(romSelects(rom)).toEqual([735, 767, 969, 1011, 1043]);
    const { selects, timeline } = replay(rom);
    expect(selects).toEqual(romSelects(rom));
    expect(timeline).toContain("767:rejection-message/0/0/1");
    expect(timeline).toContain("969:rejection-reopen/0/0/1");
  });
  for (const scene of ["on", "off"] as const) {
    it(`snd1-struggle-${scene}: A on FIGHT with no usable move, then A on "has no moves left!"`, () => {
      const rom = fixture(`snd1-struggle-${scene}`);
      expect(romSelects(rom)).toEqual(scene === "on" ? [1, 27, 701, 746] : [1, 27, 401, 446]);
      const { selects, timeline } = replay(rom);
      expect(selects).toEqual(romSelects(rom));
      expect(timeline).toContain(`${scene === "on" ? 701 : 401}:no-moves-message/0/0/1`);
    });
  }
});
