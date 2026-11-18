// aud262: T1 0..999 missing-gated tail, the power / HP / elevation / height dimensions (docs/aud242-move-anim-sounds.md section 28).
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

function expectConstantOffset(rom: Fixture, ids: number[], count: number, from: "first" | "last" = "last"): number {
  const pick = (events: FixtureEvent[]) => { const rows = events.filter((e) => e.noop !== true && e.kind === "se" && ids.includes(e.id as number)); return from === "last" ? rows.slice(-count) : rows.slice(0, count); };
  const romRows = pick(rom.events);
  const ours = pick(ourEvents(rom));
  expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
  const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
  expect(new Set(offsets).size).toBe(1);
  return offsets[0]!;
}

// AnimTask_IsPowerOver99 (battle_anim_ground.c:734-742) writes ARG_RET_ID and Move_MAGNITUDE branches on it: MagnitudeRegular and MagnitudeIntense both start the 10-row SE_M_STRENGTH loop in the
// same script step (the intense branch only adds palette blends after it), so the branch is resolved and needs no power key in the table: ROM 214 x10 nine frames apart.
describe("Magnitude (aud262)", () => {
  it("the table entry: one SE_M_STRENGTH loop at frame 0 (both power branches), ungated", () => {
    expect(timing.moves[222]!.label).toBe("Move_MAGNITUDE");
    expect(timing.moves[222]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[222]!.variants[0]!]!.map((o) => `${o.op}:${o.frame}:${(o as { times?: number }).times}`)).toEqual(["loopsewithpan:0:10"]);
  });
  for (const [side, pan] of [["player", 63], ["opponent", -63]] as const) {
    it(`aud262-magnitude-${side}: ids, pans and the 9-frame loop equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud262-magnitude-${side}`);
      const romRows = rom.events.filter((e) => e.kind === "se" && e.id === 214).slice(0, 10);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 8, 17, 26, 35, 44, 53, 62, 71, 80]);
      expect(romRows.every((e) => e.pan === pan)).toBe(true);
      expect(expectConstantOffset(rom, [214], 10, "first")).toBe(3);
    });
  }
});

// Rapid Spin: the second SE_M_RAZOR_WIND2 loop starts after the first waitforvisualfinish + hit + delay; the first wait ends with AnimTask_RapinSpinMonElevation, whose length is set by the attacker's
// GetBattlerYCoordWithElevation (battle_anim_mons.c:342-370: 40 - gEnemyMonElevation for an opponent, 80 for the player; battle_anim_effects_3.c:1749-1883). Keyed on the attacker's elevation.
describe("Rapid Spin (aud262)", () => {
  const entry = timing.moves[229]!;
  const secondLoop = (elevation: number) => {
    const grid = (timing as unknown as { elevationGrids: number[][]; elevationClasses: number[] });
    const cells = grid.elevationGrids[(entry as unknown as { elevation: number[] }).elevation[1]!]!;
    const ops = timing.variants[cells[grid.elevationClasses.indexOf(elevation)]!]!;
    return ops.filter((o) => o.op === "loopsewithpan")[1]!.frame - ops.filter((o) => o.op === "loopsewithpan")[0]!.frame;
  };
  it("the table entry: ungated, keyed on the opponent attacker's elevation only", () => {
    expect(entry.label).toBe("Move_RAPID_SPIN");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    expect((entry as unknown as { elevation: number[] }).elevation.map((g) => g >= 0)).toEqual(Array.from({ length: 12 }, (_, i) => i % 2 === 1));
    expect([0, 5, 8].map(secondLoop)).toEqual([73, 73, 73]);
    expect([10, 13, 16].map(secondLoop)).toEqual([72, 70, 69]);
  });
  const windows = [["rapidspin", "player", 0, 73], ["rapidspinmoltres", "opponent", 5, 73], ["rapidspinvoltorb", "opponent", 10, 72], ["rapidspinpidgey", "opponent", 16, 69]] as const;
  for (const [name, side, elevation, gap] of windows) {
    it(`aud262-${name}-${side}: second loop ${gap} frames after the first (elevation ${elevation}); ids, pans, offset constant`, () => {
      const rom = fixture(`aud262-${name}-${side}`);
      const rows = rom.events.filter((e) => e.noop !== true && e.kind === "se" && (e.id === 160 || e.id === 134));
      expect(rows.length).toBe(9);
      expect(rows[5]!.frame - rows[0]!.frame).toBe(gap);
      expect(secondLoop(elevation)).toBe(gap);
      expect(expectConstantOffset(rom, [160, 134], 9, "first")).toBe(2);
    });
  }
});

// Water Spout: AnimTask_WaterSpoutLaunch waits for its droplets (battle_anim_water.c:1054-1250): count by the attacker's HP quarter (GetWaterSpoutPowerForAnim), flight time by the attacker's pic Y.
// The quarter windows stage the HP through a real earlier hit (the faster Lv80 / 60 / 52 Rattata's Seismic Toss: 105 -> 25 / 45 / 53), not an injected value.
// hpd6: the q0 / q1 / q2 offsets were 11 / 7 / 7 (the staging Toss ran 11 / 7 / 7 rows short: hpd5 lead 6 + tail 1, +4 for the high-damage level body); the Toss hpd5 audit makes them 0, the ROM frames. hpf1 (the floor-free Toss hit -> the next attack's message) made them -1 (ours 1 frame later, the hpf2 residual in docs/hpd1-hp-hold.md).
describe("Water Spout (aud262)", () => {
  it("the table entry: ungated, pic Y x HP quarter grid for the player, one constant variant for the opponent", () => {
    const entry = timing.moves[323]! as unknown as { label: string; gated: number[]; pic: number[]; hp: number[] };
    expect(entry.label).toBe("Move_WATER_SPOUT");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    expect(entry.hp.map((g) => g >= 0)).toEqual(Array.from({ length: 12 }, (_, i) => i % 2 === 0));
  });
  const windows = [["waterspout-q0", "player", 49, -1], ["waterspout-q1", "player", 49, -1], ["waterspout-q2", "player", 50, -1], ["waterspout-q3", "player", 51, 2], ["waterspoutsnorlax", "player", 51, 2], ["waterspout", "opponent", 46, 2]] as const;
  for (const [name, side, lastGap, offset] of windows) {
    it(`aud262-${name}-${side}: SE gaps 46 / ${lastGap} equal the ROM's, offset ${offset} constant`, () => {
      const rom = fixture(`aud262-${name}-${side}`);
      const rows = rom.events.filter((e) => e.noop !== true && e.kind === "se" && [162, 233, 163].includes(e.id as number));
      expect(rows.map((e) => e.id)).toEqual([162, 233, 163]);
      expect([rows[1]!.frame - rows[0]!.frame, rows[2]!.frame - rows[1]!.frame]).toEqual([46, lastGap]);
      expect(expectConstantOffset(rom, [162, 233, 163], 3, "first")).toBe(offset);
    });
  }
});

// Memento: the first wait ends with AnimTask_MoveAttackerMementoShadow (battle_anim_dark.c:408-535), 46 half-rate calls + (TOP - 7 - d8) / 8 + 1 window-lowering calls + 8 closing + 2, where
// TOP = BATTLER_COORD_ATTR_TOP of the attacker (pic Y - height / 2, battle_anim_mons.c:2277). The ROM's third SE (SE_M_PSYBEAM at the target) follows it by 25 + n frames; the table carries one
// variant per attacker TOP class. (The ROM's start frame is 7 earlier than ours in all five windows: a constant, the body-to-sound row class. It was 108 until mem2 -- the attacker's INSTANT_HP_BAR_DROP was presented as a 106-row drain before the body.)
describe("Memento (aud262)", () => {
  const entry = timing.moves[262]! as unknown as { label: string; gated: number[]; top: number[] };
  const grids = timing as unknown as { topYs: number[][]; topGrids: number[][] };
  const gap = (side: 0 | 1, top: number) => {
    const ops = timing.variants[grids.topGrids[entry.top[side]!]![grids.topYs[side]!.indexOf(top)]!]!;
    return ops[2]!.frame - ops[1]!.frame;
  };
  it("the table entry: ungated, one TOP grid per attacker side", () => {
    expect(entry.label).toBe("Move_MEMENTO");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    expect(entry.top.every((g) => g >= 0)).toBe(true);
    expect([gap(0, 56), gap(0, 81), gap(1, 3), gap(1, 16), gap(1, 10)]).toEqual([33, 36, 33, 35, 34]);
  });
  const windows = [["memento", "player", 0, 81, 36], ["mementoonix", "player", 0, 56, 33], ["memento", "opponent", 1, 3, 33], ["mementogyarados", "opponent", 1, 16, 35], ["mementoonix", "opponent", 1, 10, 34]] as const;
  for (const [name, side, slot, top, romGap] of windows) {
    it(`aud262-${name}-${side}: SE gaps 50 / ${romGap} equal the ROM's (attacker TOP ${top}), offset constant`, () => {
      const rom = fixture(`aud262-${name}-${side}`);
      const rows = rom.events.filter((e) => e.noop !== true && e.kind === "se" && [189, 200].includes(e.id as number));
      expect(rows.map((e) => e.id)).toEqual([189, 200, 189]);
      expect([rows[1]!.frame - rows[0]!.frame, rows[2]!.frame - rows[1]!.frame]).toEqual([50, romGap]);
      expect(gap(slot, top)).toBe(romGap);
      expect(expectConstantOffset(rom, [189, 200], 3, "first")).toBe(-7);
    });
  }
});

// Present: AnimTask_IsHealingMove (battle_anim_effects_3.c:1531-1539) sets ARG_RET_ID from gAnimMoveDmg (> 0 -> damage branch); the bag sprite (AnimPresent, battle_anim_effects_1.c:3016) lives 60 calls of
// moveAlongLinearPath + 51 of AnimItemSteal_Step2 regardless of positions, and the heal particles end on their 16-tick animation. The heal window heals a target that a faster Belly Drum already halved.
describe("Present (aud262)", () => {
  const entry = timing.moves[217]! as unknown as { label: string; gated: number[]; flag: number[]; flagKind: string };
  const grids = timing as unknown as { flagGrids: number[][] };
  it("the table entry: ungated, damage / heal variants keyed on the request's damage", () => {
    expect(entry.label).toBe("Move_PRESENT");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    expect(entry.flagKind).toBe("heal");
    const [damage, heal] = grids.flagGrids[entry.flag[0]!]!.map((v) => timing.variants[v]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`));
    expect(damage!.slice(3)).toEqual(["57:125", "117:177", "125:177", "133:177", "141:177", "149:177"]);
    expect(heal!.slice(3)).toEqual(["57:125", "120:228", "197:179"]);
  });
  it("aud262-present-player (damage branch): the five explosion SEs follow the bag by 60 frames, offset 1", () => {
    const rom = fixture("aud262-present-player");
    const rows = rom.events.filter((e) => e.noop !== true && e.kind === "se" && [167, 125, 177].includes(e.id as number));
    expect(rows.map((e) => e.frame - rows[0]!.frame)).toEqual([0, 16, 32, 54, 114, 122, 130, 138, 146]);
    expect(expectConstantOffset(rom, [167, 125, 177], 9, "first")).toBe(1);
  });
  it("aud262-presentheal-player (heal branch): SE_M_MORNING_SUN 63 frames and the second SE 77 frames after the last bag SE, offset -1 (hpf2: the heal's hp -> printstring hold, 2 -> -1)", () => {
    const rom = fixture("aud262-presentheal-player");
    const rows = rom.events.filter((e) => e.noop !== true && e.kind === "se" && [167, 125, 228, 179].includes(e.id as number));
    expect(rows.map((e) => e.id)).toEqual([167, 125, 125, 125, 228, 179]);
    expect(rows.map((e) => e.frame - rows[0]!.frame)).toEqual([0, 16, 32, 54, 117, 194]);
    expect(expectConstantOffset(rom, [167, 125, 228, 179], 6, "first")).toBe(-1);
  });
});

// Odor Sleuth (AnimTask_OdorSleuthMovement: two clones live 60 + 13 callbacks, battle_anim_effects_3.c:4955-5055), False Swipe (the slice's 16-tick animation + 8 + 12 + 1 + 1 + 18 calls and six
// positioned slices, battle_anim_effects_1.c:4717-4765) and Pay Day (AnimCoinThrow: (84 << 8) / 1152 = 18 translation calls, battle_anim_effects_2.c:1776-1797): the SE after each first wait.
describe("Odor Sleuth / False Swipe / Pay Day (aud262)", () => {
  const rows = (label: string, move: number) => {
    const entry = timing.moves[move]! as unknown as { label: string; gated: number[]; variants: number[] };
    expect(entry.label).toBe(label);
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    return timing.variants[entry.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`);
  };
  it("the table entries: ungated, the SE after the wait at the ROM's distance", () => {
    expect(rows("Move_ODOR_SLEUTH", 316)).toEqual(["29:193", "37:193", "81:192"]);
    expect(rows("Move_FALSE_SWIPE", 206)).toEqual(["6:122", "24:135", "32:135", "40:135", "64:139"]);
    expect(rows("Move_PAY_DAY", 6)).toEqual(["9:160", "29:174"]);
  });
  const windows = [
    ["odorsleuth", [193, 192], 3, [0, 8, 52], -4],
    ["falseswipe", [122, 135, 139], 5, [0, 18, 26, 34, 58], 0],
    ["payday", [160, 174], 2, [0, 20], 2],
  ] as const;
  for (const [name, ids, count, rel, offset] of windows) {
    for (const side of ["player", "opponent"] as const) {
      it(`aud262-${name}-${side}: SE spacing ${rel.join("/")} equals the ROM's, offset ${offset} constant`, () => {
        const rom = fixture(`aud262-${name}-${side}`);
        const picked = rom.events.filter((e) => e.noop !== true && e.kind === "se" && (ids as readonly number[]).includes(e.id as number));
        expect(picked.length).toBe(count);
        expect(picked.map((e) => e.frame - picked[0]!.frame)).toEqual(rel);
        expect(expectConstantOffset(rom, [...ids], count, "first")).toBe(offset);
      });
    }
  }
});

// Luster Purge (aud262): the circle (AnimSpriteOnMonPos on a 120-tick affine frame, exact 121), the uncounted AnimTask_FadeScreenToWhite and the random-position hit splats (AnimHitSplatBasic shape, exact 10)
// ungate the six SE_M_HYPER_BEAM after the first waits.
describe("Luster Purge (aud262)", () => {
  it("the table entry is ungated: SOLAR_BEAM at 47, six HYPER_BEAM 5 apart from 169", () => {
    const entry = timing.moves[295]! as unknown as { label: string; gated: number[]; variants: number[] };
    expect(entry.label).toBe("Move_LUSTER_PURGE");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[entry.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`)).toEqual(["47:201", "169:215", "174:215", "179:215", "184:215", "189:215", "194:215"]);
  });
  for (const side of ["player", "opponent"] as const) {
    it(`aud262-lusterpurge-${side}: SE spacing equals the ROM's (122, then 5 x 5), offset constant`, () => {
      const rom = fixture(`aud262-lusterpurge-${side}`);
      const picked = rom.events.filter((e) => e.noop !== true && e.kind === "se" && [201, 215].includes(e.id as number));
      expect(picked.length).toBe(7);
      expect(picked.map((e) => e.frame - picked[0]!.frame)).toEqual([0, 122, 127, 132, 137, 142, 147]);
      expect(expectConstantOffset(rom, [201, 215], 7, "first")).toBe(side === "player" ? 2 : 5);
    });
  }
});
