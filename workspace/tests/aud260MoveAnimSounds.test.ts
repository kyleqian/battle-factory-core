// aud260: T1 0..99 missing-gated tail (docs/aud242-move-anim-sounds.md section 26).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import timing from "../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }
interface Fixture { frames: number; events: FixtureEvent[]; trace: { route: "generated-orchestrator" | "canonical-recorded"; battleScene: "on" | "off"; appStage?: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const fixture = (file: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${file}.json`, import.meta.url), "utf8")) as Fixture;
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as { APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>> };

function ourEvents(rom: Fixture): SoundEvent[] {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  if (rom.trace.appStage !== undefined) state = APP_STAGES[rom.trace.appStage.id]!(state);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}

const tableRows = (move: number, variant: number) =>
  timing.variants[timing.moves[move]!.variants[variant]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`);

function expectConstantOffset(rom: Fixture, ids: number[], last: number): number {
  const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && ids.includes(e.id as number)).slice(-last);
  const romRows = pick(rom.events);
  const ours = pick(ourEvents(rom));
  expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
  const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
  expect(new Set(offsets).size).toBe(1);
  return offsets[0]!;
}

// Turn 2 against a Reflect target (the ROM's second Brick Break: 122 @1113, 122 @1142, 123 @1203, 198 @1215): AnimBrickBreakWall (battle_anim_fight.c:690-742) is gone 99 ticks after
// its creation (args 90, 10), so the first waitforvisualfinish ends at the fist's SE and the shard SE 198 follows 12 frames after SE 123.
describe("Brick Break turn 2 (aud260)", () => {
  it("the table entry: shattered-wall variants are ungated with the shard SE 198 at 126", () => {
    expect(timing.moves[280]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(280, 2)).toEqual(["24:122", "53:122", "114:123", "126:198"]);
    expect(tableRows(280, 0)).toEqual(["24:122", "53:122", "114:123"]);
  });
  it("aud260-brickbreak-player: ROM-minus-ours is one constant over turn 2's four rows", () => {
    const rom = fixture("aud260-brickbreak-player");
    expect(expectConstantOffset(rom, [122, 123, 198], 4)).toBe(2);
  });
});

// AnimTask_GlareEyeDots lives 88 ticks (battle_anim_effects_3.c:3989-4087); the SE_M_LEER sits in the script step of AnimTask_ScaryFace's creation and pays the part of the BG load stall that precedes it
// (SCARY_FACE_SAME_STEP_LAG 2 of the 6): ROM 200 @67, 192 @174 (+107).
describe("Glare (aud260)", () => {
  it("the table entry: PSYBEAM2 at 6, LEER at 113 (the 107-frame gap), ungated", () => {
    expect(timing.moves[137]!.label).toBe("Move_GLARE");
    expect(timing.moves[137]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(137, 0)).toEqual(["6:200", "113:192"]);
  });
  it("aud260-glare-player: ids, pans and the 107-frame gap equal the ROM's, offset constant", () => {
    const rom = fixture("aud260-glare-player");
    expect(expectConstantOffset(rom, [200, 192], 2)).toBe(2);
    const romRows = rom.events.filter((e) => e.kind === "se" && [200, 192].includes(e.id as number));
    expect(romRows[1]!.frame - romRows[0]!.frame).toBe(107);
  });
});

// AnimWillOWispOrb (battle_anim_fire.c:1101-1164) lives 32 + |target X - x| ticks (x = the attacker's X plus the call-32 sine fold, the player's -4 / the opponent's +4 amplitude), so the first wait ends
// 153 (player) / 152 (opponent) ticks after the first SE_M_EMBER and SE_M_FLAME_WHEEL2 follows. The orbs' own SE_M_FLAME_WHEEL rows (gAnimCustomPanning sweep) stay unmodelled: ROM-only rows.
describe("Will-O-Wisp (aud260)", () => {
  it("the table entry: EMBER 9 / 19, FLAME_WHEEL2 at 162 (player attacker) / 161 (opponent attacker), ungated", () => {
    expect(timing.moves[261]!.label).toBe("Move_WILL_O_WISP");
    expect(timing.moves[261]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(261, 0)).toEqual(["9:151", "19:151", "162:145"]);
    expect(tableRows(261, 1)).toEqual(["9:151", "19:151", "161:145"]);
  });
  for (const [side, gap] of [["player", 153], ["opponent", 152]] as const) {
    it(`aud260-willowisp-${side}: the EMBER / EMBER / FLAME_WHEEL2 ids, pans and the +10 / +${gap} gaps equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud260-willowisp-${side}`);
      const ids = [151, 145];
      const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 10, gap]);
      expect(expectConstantOffset(rom, ids, 3)).toBe(1);
    });
  }
});

// Recycle (AnimRecycle_Step, battle_anim_effects_3.c:5437-5489) lives 138 ticks, so the post-wait SE_M_TAKE_DOWN follows the loop's first one by 139. The lab's Sitrus Berry is eaten at the end of
// turn 1 (Recycle fails with no used item), so turn 2 is the animation: ROM 152 @1466 / 1490 / 1515 (loop), 152 @1605; the held-item effect's own SE rows follow at 1774.
describe("Recycle (aud260)", () => {
  it("the table entry: the loop at 9 (wait 24, 3 plays), SE_M_TAKE_DOWN at 148 (9 + 139), ungated", () => {
    expect(timing.moves[278]!.label).toBe("Move_RECYCLE");
    expect(timing.moves[278]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[278]!.variants[0]!]!.map((o) => `${o.op}:${o.frame}`)).toEqual(["loopsewithpan:9", "playsewithpan:148"]);
  });
  it("aud260-recycle-player: the turn-2 rows 1466 / 1490 / 1515 / 1605 equal the ROM's, offset constant", () => {
    const rom = fixture("aud260-recycle-player");
    const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && e.id === 152 && e.frame > 1400 && e.frame < 1700);
    const romRows = pick(rom.events);
    expect(romRows.map((e) => e.frame)).toEqual([1466, 1490, 1515, 1605]);
    const ours = pick(ourEvents(rom));
    expect(ours.map((e) => e.frame)).toEqual(romRows.map((e) => e.frame - 4));
  });
});
