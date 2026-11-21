// aud261: T1 0..999 missing-gated tail (docs/aud242-move-anim-sounds.md section 27).
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

// AnimTask_AttackerStretchAndDisappear (battle_anim_effects_2.c:2792-2810, one 8-tick affine frame: 8 ticks) and AnimTask_ExtremeSpeedImpact (:2812-2873, 3 rounds of 12 calls then 24 x2 steps back: destroyed on
// call 60, 59 ticks) and the three mon-edge hit splats (10 each) gate the two waits: ROM 160 x3 (loop), 139 +39, 139 +12, 123 +12 (the splats), 135 x4 +44 after the VITAL_THROW2 (player attacker: 110 / 149 / 161 / 173 / 217).
// A Rattata opponent leaves a residual x2 = 1 (ROM, tgt x2 read at the task entry), which shortens the case-3 return by one call; the windows below use a Snorlax target (x2 = 0).
describe("Extreme Speed (aud261)", () => {
  it("the table entry: loop at 44, COMET_PUNCH at 83 / 95, VITAL_THROW2 at 107, DOUBLE_TEAM loop at 151, ungated", () => {
    expect(timing.moves[245]!.label).toBe("Move_EXTREME_SPEED");
    expect(timing.moves[245]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[245]!.variants[0]!]!.map((o) => `${o.op}:${o.frame}`)).toEqual(["loopsewithpan:44", "playsewithpan:83", "playsewithpan:95", "playsewithpan:107", "loopsewithpan:151"]);
  });
  for (const side of ["player", "opponent"] as const) {
    it(`aud261-extremespeed-${side}: ids, pans and the +39 / +12 / +12 / +44 gaps equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud261-extremespeed-${side}`);
      const ids = [160, 139, 123, 135];
      const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 8, 17, 39, 51, 63, 107, 115, 124, 133]);
      expect(expectConstantOffset(rom, ids, 10)).toBe(0);
    });
  }
});

// AnimMilkBottle_Step1 (battle_anim_effects_1.c:4003-4062, simulated by milkBottleDestroyCall) gates the wait before the thin ring: ROM 142 x3 (+14, +36), 225 +62, 179 +94 (the Healing blue stars); ROM minus ours -2 on both sides (status-move class). The window is the second turn: the first fails at full HP.
describe("Milk Drink (aud261)", () => {
  it("the table entry: CRABHAMMER SEs at 54 / 68 / 90, MILK_DRINK at 116, ABSORB_2 at 148, ungated", () => {
    expect(timing.moves[208]!.label).toBe("Move_MILK_DRINK");
    expect(timing.moves[208]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[208]!.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`)).toEqual(["54:142", "68:142", "90:142", "116:225", "148:179"]);
  });
  for (const [side, pan] of [["player", -64], ["opponent", 63]] as const) {
    it(`aud261-milkdrink-${side}: ids, pans and the +14 / +36 / +62 / +94 gaps equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud261-milkdrink-${side}`);
      const ids = [142, 225, 179];
      const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 14, 36, 62, 94]);
      expect(romRows.every((e) => e.pan === pan)).toBe(true);
      expect(expectConstantOffset(rom, ids, 5)).toBe(-2);
    });
  }
});

// AnimPainSplitProjectile (battle_anim_effects_3.c:2937-2970, 19 ticks to animEnded) and AnimTask_PainSplitMovement (:2974-3033, destroyed on call 13: 12 ticks) gate the two waits after each SWAGGER2: ROM 194 x3, 25 apart.
describe("Pain Split (aud261)", () => {
  it("the table entry: SWAGGER2 (pan 0) at 15 / 40 / 65, ungated", () => {
    expect(timing.moves[220]!.label).toBe("Move_PAIN_SPLIT");
    expect(timing.moves[220]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[220]!.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}:${o.pan}`)).toEqual(["15:194:0", "40:194:0", "65:194:0"]);
  });
  for (const side of ["player", "opponent"] as const) {
    it(`aud261-painsplit-${side}: ids, pans and the +25 / +25 gaps equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud261-painsplit-${side}`);
      const romRows = rom.events.filter((e) => e.kind === "se" && e.id === 194);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 25, 50]);
      expect(romRows.every((e) => e.pan === 0)).toBe(true);
      expect(expectConstantOffset(rom, [194], 3)).toBe(-4);
    });
  }
});

// AnimFireSpiralOutward (battle_anim_fire.c:738-772: D + W + 1 ticks, W = 56, D = 0..24) gates the wait before the slide / shake / FLAME_WHEEL2: ROM 144 x7 four apart, 145 +88 after the last.
describe("Flame Wheel (aud261)", () => {
  it("the table entry: FLAME_WHEEL (pan attacker) at 6..30 by 4, FLAME_WHEEL2 at 118, ungated", () => {
    expect(timing.moves[172]!.label).toBe("Move_FLAME_WHEEL");
    expect(timing.moves[172]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[172]!.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`)).toEqual(["6:144", "10:144", "14:144", "18:144", "22:144", "26:144", "30:144", "118:145"]);
  });
  for (const [side, pan] of [["player", [-64, 63]], ["opponent", [63, -63]]] as const) {
    it(`aud261-flamewheel-${side}: ids, pans and the 4 x 6 / +88 gaps equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud261-flamewheel-${side}`);
      const romRows = rom.events.filter((e) => e.kind === "se" && (e.id === 144 || e.id === 145));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 4, 8, 12, 16, 20, 24, 112]);
      expect(romRows.map((e) => e.pan)).toEqual([...Array(7).fill(pan[0]), pan[1]]);
      expect(expectConstantOffset(rom, [144, 145], 8)).toBe(0);
    });
  }
});

// AnimTask_SwallowDeformMon (battle_anim_effects_3.c:2236-2248, 86 ticks) and AnimSwallowBlueOrb (:2217-2234, pic-Y dependent) gate the wait before the HealingEffect: after a Stockpile turn the ROM plays
// SE 152 (TAKE_DOWN), 232 +40 (SPIT_UP), 179 +102 (the blue stars). The window's second turn is Stockpile (slot 0) then Swallow (slot 1).
describe("Swallow (aud261)", () => {
  it("the table entry: TAKE_DOWN at 6, SPIT_UP at 46, ABSORB_2 star at 108 (stockpile 1 and 0 alike), ungated", () => {
    expect(timing.moves[256]!.label).toBe("Move_SWALLOW");
    expect(timing.moves[256]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[256]!.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`)).toEqual(["6:152", "46:232", "108:179"]);
  });
  it("aud261-swallow-player: ids, pans and the +40 / +62 gaps equal the ROM's, offset constant -4 (status-move class)", () => {
    const rom = fixture("aud261-swallow-player");
    const ids = [152, 232, 179];
    const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
    expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 40, 102]);
    expect(romRows.every((e) => e.pan === -64)).toBe(true);
    expect(expectConstantOffset(rom, ids, 3)).toBe(-4);
  });
  // The engine's opponent AI does not pick Stockpile for this move set (the ROM's does), so the engine plays no Swallow rows on this side: the window pins the ROM's gaps against the table's only.
  it("aud261-swallow-opponent: the ROM's pan 63 rows are 40 / 62 apart, as the table's", () => {
    const rom = fixture("aud261-swallow-opponent");
    const romRows = rom.events.filter((e) => e.kind === "se" && [152, 232, 179].includes(e.id as number));
    expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 40, 102]);
    expect(romRows.every((e) => e.pan === 63)).toBe(true);
  });
});

// gOctazookaBallSpriteTemplate (battle_anim_effects_1.c:1691-1700, callback TranslateAnimSpriteToTargetMonLocation, D = 20: 21 ticks) gates the wait before the smoke: ROM MEGA_KICK2 141, SELF_DESTRUCT 177 22 later.
describe("Octazooka (aud261)", () => {
  it("the table entry: MEGA_KICK2 at 6, SELF_DESTRUCT at 28, ungated", () => {
    expect(timing.moves[190]!.label).toBe("Move_OCTAZOOKA");
    expect(timing.moves[190]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[190]!.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`)).toEqual(["6:141", "28:177"]);
  });
  for (const [side, pans] of [["player", [-64, 63]], ["opponent", [63, -63]]] as const) {
    it(`aud261-octazooka-${side}: ids, pans and the +22 gap equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud261-octazooka-${side}`);
      const romRows = rom.events.filter((e) => e.kind === "se" && (e.id === 141 || e.id === 177));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 22]);
      expect(romRows.map((e) => e.pan)).toEqual(pans);
      expect(expectConstantOffset(rom, [141, 177], 2)).toBe(0);
    });
  }
});

// gZapCannonBallSpriteTemplate (battle_anim_electric.c:130-139, TranslateAnimSpriteToTargetMonLocation, D = 30: 31 ticks) and AnimZapCannonSpark (:572-603, D = 30: 29 ticks) gate the wait before the shake / ELECTRICITY rows:
// the table has THUNDERBOLT2 / the electricity SE at 55 / 74 after the SE138 at 6 (49 / 68 later). The ROM's gaps are 50 / 69: the ball's last of eight sparks is created one frame late (a CreateSpriteAndAnimate
// hook shows 7 sparks at the SE frame and the 8th one frame after, candidate: a VBlank overrun by nine sprite inits in one script step, like the BG_LOAD_LAG class; not attributed), so the offset steps by +1 across the wait. Zap Cannon is 50% accurate: the engine stages use rngSeed 2 (player) / 10 (opponent), the first seeds whose engine draw hits (the ROM lab's seed 1 hit).
describe("Zap Cannon (aud261)", () => {
  it("the table entry: THUNDER_WAVE at 6, the electricity SE at 55 and 74, ungated", () => {
    expect(timing.moves[192]!.label).toBe("Move_ZAP_CANNON");
    expect(timing.moves[192]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[192]!.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`).sort()).toEqual(["55:119", "6:138", "74:119"]);
  });
  for (const [side, pan] of [["player", [-64, 63, 63]], ["opponent", [63, -63, -63]]] as const) {
    it(`aud261-zapcannon-${side}: ids, pans and the +50 / +19 ROM gaps; ROM minus ours 0 then 1 after the overrun (hcr2c: was 2 then 3)`, () => {
      const rom = fixture(`aud261-zapcannon-${side}`);
      const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && (e.id === 138 || e.id === 119)).slice(-3);
      const romRows = pick(rom.events);
      const ours = pick(ourEvents(rom));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 50, 69]);
      expect(romRows.map((e) => e.pan)).toEqual(pan);
      expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
      expect(romRows.map((e, i) => e.frame - ours[i]!.frame)).toEqual([0, 1, 1]);
    });
  }
});

// AnimRazorWindTornado (battle_anim_effects_2.c:1883-1897, TranslateSpriteInCircle D = 40: gone 40 ticks after F) gates the GUST2 after the charge; AnimAirWaveCrescent (battle_anim_flying.c:430-465,
// StartAnimLinearTranslation D = 22: 23 ticks) is not waited on before the unleash rows (the SE rows are RAZOR_WIND2 x3 at 9 / 13 / 17 and RAZOR_WIND at 36).
describe("Razor Wind (aud261)", () => {
  it("the table entry: GUST at 3 and GUST2 at 44 on the charge turn, RAZOR_WIND2 x3 at 9 / 13 / 17 and RAZOR_WIND at 36 on the unleash turn, ungated", () => {
    expect(timing.moves[13]!.label).toBe("Move_RAZOR_WIND");
    expect(timing.moves[13]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(13, 0)).toEqual(["3:132", "44:133"]);
    expect(tableRows(13, 2)).toEqual(["9:160", "13:160", "17:160", "36:136"]);
  });
  // lse4: the unleash body presents its lead 5 (gap-print class), so the player's unleash offset falls 9 -> 4 (the opponent's 14 does not move: the opponent lab's unleash SE clock is not measured here, open); the charge turn's -10 is the sound clock, unchanged.
// chg2: the charge turn's sound clock follows the opener's kernel execution (Razor Wind E = 6: ROM SE frames 42 / 83, ours exact, -10 -> 0) and the locked unleash turn's print waits the ROM's press + 6 + u (opponent 14 -> -1, ROM frames 1104 / 1108 / 1112 / 1131). The player pin stays 4: ours is now 11 late (the same lead puts the player lab at ROM -11, away from the ROM; open, chg2 doc).
// hpf3: the player's unleash offset 1 -> 9: the opponent's hit on the player (ROM bar 13 rows, rise 496; ours hp 491, bar + tail 7) now ends the turn at the ROM's length minus 5 where the 28-row floor had it 4 too long
// (ROM bar rise -> the continuation turn's first exec 49 vs ours 44; neither was exact: the turn-end command's own 8 rows are the open remainder, hpf3 docs).
  for (const [side, pan, unleashOffset] of [["player", -64, 4], ["opponent", 63, -1]] as const) {
    it(`aud261-razorwind-${side}: the +41 charge gap and the +4 / +4 / +19 unleash gaps equal the table's, offset constant per turn`, () => {
      const rom = fixture(`aud261-razorwind-${side}`);
      const ids = [132, 133, 160, 136];
      const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
      expect(romRows.length).toBe(6);
      expect(romRows[1]!.frame - romRows[0]!.frame).toBe(41);
      expect(romRows.slice(2).map((e) => e.frame - romRows[2]!.frame)).toEqual([0, 4, 8, 27]);
      expect(romRows.slice(0, 3).every((e) => e.pan === pan)).toBe(true);
      const ours = ourEvents(rom).filter((e) => e.kind === "se" && ids.includes(e.id as number)).slice(-6);
      expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
      // Offsets are constant within a turn (the lead is the #198 idle-lead class: charge -10, unleash +1 / +14 by who moves first).
      expect(romRows.map((e, i) => e.frame - ours[i]!.frame)).toEqual([0, 0, ...Array<number>(4).fill(unleashOffset)]);
    });
  }
});

// AnimTask_RockMonBackAndForth (battle_anim_effects_3.c:2702-2800, n = 2 rounds of 8 + 16 + 8 calls: gone 64 ticks after F) and AnimMagentaHeart (battle_anim_effects_2.c:3067-3078: 58 ticks) gate the
// DIZZY_PUNCH loop after the three hearts (CHARM at 6 / 23 / 40, the third heart's 58 ticks end at 98).
describe("Covet (aud261)", () => {
  it("the table entry: CHARM x3 at 6 / 23 / 40 and the DIZZY_PUNCH loop at 99, ungated", () => {
    expect(timing.moves[343]!.label).toBe("Move_COVET");
    expect(timing.moves[343]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(343, 0)).toEqual(["6:212", "23:212", "40:212", "99:176"]);
  });
  for (const [side, pan] of [["player", -64], ["opponent", 63]] as const) {
    it(`aud261-covet-${side}: ids, pans and the +17 / +17 / +59 gaps equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud261-covet-${side}`);
      const ids = [212, 176];
      const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
      expect(romRows.slice(0, 3).map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 17, 34]);
      expect(romRows[3]!.frame - romRows[2]!.frame).toBe(59);
      expect(romRows.slice(0, 3).every((e) => e.pan === pan)).toBe(true);
      expect(expectConstantOffset(rom, ids, 6)).toBe(0);
    });
  }
});

// AnimNeedleArmSpike (battle_anim_effects_1.c:3623-3694: D = 16 / 10, destroyed D + 1 calls after the init: exact D) gates the VITAL_THROW2 after the twelve spikes (the HORN_ATTACK loop is 16 x 2..3
// ticks, the last spike is created at +22, gone 16 ticks later: the table's +61 from the loop).
describe("Needle Arm (aud261)", () => {
  it("the table entry: HORN_ATTACK loop at 9 and VITAL_THROW2 at 70, ungated", () => {
    expect(timing.moves[302]!.label).toBe("Move_NEEDLE_ARM");
    expect(timing.moves[302]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(302, 0)).toEqual(["9:166", "70:123"]);
  });
  for (const [side, pan] of [["player", 63], ["opponent", -63]] as const) {
    it(`aud261-needlearm-${side}: the loop-to-VITAL_THROW2 gap is the table's +61, offset constant`, () => {
      const rom = fixture(`aud261-needlearm-${side}`);
      const ids = [166, 123];
      const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
      expect(romRows.length).toBe(17);
      expect(romRows[16]!.frame - romRows[0]!.frame).toBe(61);
      expect(romRows.every((e) => e.pan === pan)).toBe(true);
      expect(expectConstantOffset(rom, ids, 17)).toBe(0);
    });
  }
});

// AnimFlyingParticle (battle_anim_effects_1.c:3517-3590, ceil(272 / s) ticks on the player side, 264 / s on the opponent side; the flowers share it with Silver Wind) and AnimTask_StatusClearedEffect
// (battle_anim_effects_3.c:3904-3918 -> StartMonScrollingBgMask / UpdateMonScrollingBgMask, battle_anim_utility_funcs.c:812-936: 30 + 30 + 30 calls, destroyed on call 90 = 89 ticks) gate Aromatherapy's
// STAT_INCREASE -> MORNING_SUN -> SHINY rows, and Refresh's. The ROM destroys the task 93 ticks after the STAT_INCREASE (Aromatherapy and Refresh, both sides): the creating step decompresses its tilemap and image
// and loads a palette (like AnimTask_MetallicShine's METALLIC_SHINE_LOAD_LAG) and the stepped probe shows a 4 frame overrun; the table keeps the C's 89, a named +4 residual on the two rows after it.
describe("Aromatherapy and Refresh (aud261)", () => {
  it("the table entries: Aromatherapy PETAL_DANCE 0, STAT_INCREASE 197, MORNING_SUN 287, SHINY 359; Refresh STAT_INCREASE 6, MORNING_SUN 96, SHINY 168, ungated", () => {
    expect(timing.moves[312]!.label).toBe("Move_AROMATHERAPY");
    expect(timing.moves[287]!.label).toBe("Move_REFRESH");
    expect(timing.moves[312]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.moves[287]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(312, 0)).toEqual(["0:202", "197:239", "287:228", "359:102"]);
    expect(tableRows(287, 0)).toEqual(["6:239", "96:228", "168:102"]);
  });
  const offsets = (rom: Fixture, ids: number[], last: number) => {
    const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && ids.includes(e.id as number)).slice(-last);
    const romRows = pick(rom.events);
    const ours = pick(ourEvents(rom));
    expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
    return { romRows, offsets: romRows.map((e, i) => e.frame - ours[i]!.frame) };
  };
  for (const [side, pan, gaps] of [["player", -64, [0, 197, 291, 363]], ["opponent", 63, [0, 193, 287, 359]]] as const) {
    it(`aud261-aromatherapy-${side}: gaps ${gaps.join(" / ")} (the flowers' 272 / 264 per step ticks, then the C's 90 / 72 + the 4 frame overrun), offset constant but for it`, () => {
      const rom = fixture(`aud261-aromatherapy-${side}`);
      const { romRows, offsets: o } = offsets(rom, [202, 239, 228, 102], 4);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual(gaps);
      expect(romRows.slice(1).every((e) => e.pan === pan)).toBe(true);
      expect(o).toEqual([o[0]!, o[0]!, o[0]! + 4, o[0]! + 4]);
    });
    it(`aud261-refresh-${side}: STAT_INCREASE -> MORNING_SUN -> SHINY gaps 94 / 72 (the table's 90 / 72 + the 4 frame overrun)`, () => {
      const rom = fixture(`aud261-refresh-${side}`);
      const { romRows, offsets: o } = offsets(rom, [239, 228, 102], 3);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 94, 166]);
      expect(romRows.every((e) => e.pan === pan)).toBe(true);
      expect(o).toEqual([o[0]!, o[0]! + 4, o[0]! + 4]);
    });
  }
});

// AnimSmellingSaltsHand (battle_anim_effects_3.c:4232-4297, two squishes: 46 + 14 calls, gone 59 ticks after F) gates the SWAGGER2 loop after the DOUBLE_SLAP loop: the hands are created 32 ticks before the
// squish task (13 n - 1 = 25 ticks, AnimTask_SmellingSaltsSquish :4301-4343), so the hands (59) end after the task (32 + 25 = 57).
describe("Smelling Salt (aud261)", () => {
  it("the table entry: DOUBLE_SLAP loop at 40 and SWAGGER2 loop at 72, ungated", () => {
    expect(timing.moves[265]!.label).toBe("Move_SMELLING_SALT");
    expect(timing.moves[265]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(265, 0)).toEqual(["40:134", "72:194"]);
  });
  for (const [side, pan] of [["player", 63], ["opponent", -63]] as const) {
    it(`aud261-smellingsalt-${side}: the loop-to-loop gap is the table's +32, offset constant`, () => {
      const rom = fixture(`aud261-smellingsalt-${side}`);
      const ids = [134, 194];
      const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
      expect(romRows.length).toBe(5);
      expect(romRows[2]!.frame - romRows[0]!.frame).toBe(32);
      expect(romRows.every((e) => e.pan === pan)).toBe(true);
      expect(expectConstantOffset(rom, ids, 5)).toBe(0);
    });
  }
});

// AnimEllipticalGust (battle_anim_flying.c:353-370: init runs the step once, destroyed on ++data[0] == 71 at call 70, exact 69) and AnimTask_AnimateGustTornadoPalette (:373-405, n = 70, exact 69) gate the
// SE_M_GUST2 after the first GUST: ROM gap 70.
describe("Gust (aud261)", () => {
  it("the table entry: GUST at 9 and GUST2 at 79, ungated", () => {
    expect(timing.moves[16]!.label).toBe("Move_GUST");
    expect(timing.moves[16]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(16, 0)).toEqual(["9:132", "79:133"]);
  });
  for (const side of ["player", "opponent"] as const) {
    it(`aud261-gust-${side}: the GUST to GUST2 gap is the table's 70, offset constant`, () => {
      const rom = fixture(`aud261-gust-${side}`);
      const romRows = rom.events.filter((e) => e.kind === "se" && !e.noop && [132, 133].includes(e.id as number));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 70]);
      expect(expectConstantOffset(rom, [132, 133], 2)).toBe(0);
    });
  }
});

// AnimTranslateWebThread (battle_anim_bug.c:258-298; D = (|84| << 8) / 512 = 42, AnimTranslateLinear) x 14 gates the first wait: the ROM plays STRING_SHOT2 82 ticks after the first loop SE;
// AnimSpiderWeb (:318-355, 20 + 32 calls, destroyed in call 53) gates the final wait.
describe("Spider Web (aud261)", () => {
  it("the table entry: STRING_SHOT loop at 38 and STRING_SHOT2 at 120, ungated", () => {
    expect(timing.moves[169]!.label).toBe("Move_SPIDER_WEB");
    expect(timing.moves[169]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(169, 0)).toEqual(["38:129", "120:130"]);
  });
  for (const side of ["player", "opponent"] as const) {
    it(`aud261-spiderweb-${side}: the loop-to-STRING_SHOT2 gap is the table's 82, offset constant`, () => {
      const rom = fixture(`aud261-spiderweb-${side}`);
      const romRows = rom.events.filter((e) => e.kind === "se" && !e.noop && [129, 130].includes(e.id as number));
      expect(romRows.length).toBe(7);
      expect(romRows[6]!.frame - romRows[0]!.frame).toBe(82);
      expect(expectConstantOffset(rom, [129, 130], 7)).toBe(-3);
    });
  }
});
