import { describe, expect, it } from "vitest";
import data from "./fixtures/data/audio-sound-sources.json" with { type: "json" };
import {
  animSoundPan,
  animSoundPan2,
  calculatePanIncrement,
  keepPanInRange,
  SOUND_PAN_ATTACKER,
  SOUND_PAN_TARGET,
  type AnimBattleSide,
  type AnimPanContext,
} from "../src/audio/soundEvents.ts";

// Port of reference/pokeemerald/src/battle_anim.c:1263-1347. Expected values are worked by hand from the C
// (line numbers in the comments); the ROM probe agrees on the real windows (docs/s11-audio-design.md section 2).

const sides: AnimBattleSide[] = ["player", "opponent"];
const ctx = (attackerSide: AnimBattleSide, targetSide: AnimBattleSide, statusAnimActive = false): AnimPanContext => ({
  attackerSide,
  targetSide,
  statusAnimActive,
});

describe("animSoundPan (BattleAnimAdjustPanning, battle_anim.c:1263-1303)", () => {
  it("constants match include/constants/battle_anim.h:324-325", () => {
    expect(SOUND_PAN_ATTACKER).toBe(-64);
    expect(SOUND_PAN_TARGET).toBe(63);
  });

  it("player attacker, opponent target (:1277-1286): unchanged", () => {
    const c = ctx("player", "opponent");
    expect(animSoundPan(SOUND_PAN_ATTACKER, c)).toBe(-64);
    expect(animSoundPan(SOUND_PAN_TARGET, c)).toBe(63);
    expect(animSoundPan(0, c)).toBe(0);
    expect(animSoundPan(30, c)).toBe(30);
  });

  it("opponent attacker, player target (:1292-1295): sign flips then clamps", () => {
    const c = ctx("opponent", "player");
    expect(animSoundPan(SOUND_PAN_TARGET, c)).toBe(-63); // probe f89: Golbat Tackle SE_M_COMET_PUNCH pan -63
    expect(animSoundPan(SOUND_PAN_ATTACKER, c)).toBe(63); // 64 -> clamp 63
    expect(animSoundPan(0, c)).toBe(0);
    expect(animSoundPan(20, c)).toBe(-20);
    expect(animSoundPan(-20, c)).toBe(20);
  });

  it("player attacker, player target (:1279-1285): TARGET and ATTACKER swap, others negate", () => {
    const c = ctx("player", "player");
    expect(animSoundPan(SOUND_PAN_TARGET, c)).toBe(-64);
    expect(animSoundPan(SOUND_PAN_ATTACKER, c)).toBe(-64);
    expect(animSoundPan(20, c)).toBe(-20);
    expect(animSoundPan(0, c)).toBe(0);
  });

  it("opponent attacker, opponent target (:1287-1291): only ATTACKER becomes TARGET", () => {
    const c = ctx("opponent", "opponent");
    expect(animSoundPan(SOUND_PAN_ATTACKER, c)).toBe(63);
    expect(animSoundPan(SOUND_PAN_TARGET, c)).toBe(63);
    expect(animSoundPan(20, c)).toBe(20);
  });

  it("clamps to -64..63 (:1297-1300) and wraps like a C s8 (-128 negates to -128)", () => {
    const c = ctx("opponent", "player");
    expect(animSoundPan(-100, c)).toBe(63); // 100 -> 63
    expect(animSoundPan(100, c)).toBe(-64); // -100 -> -64
    expect(animSoundPan(-128, c)).toBe(-64); // s8(128) = -128 -> -64 (not 63)
    expect(animSoundPan(127, c)).toBe(-64);
    expect(animSoundPan(200, ctx("player", "opponent"))).toBe(-56); // arg 200 stored in an s8 is -56
  });

  it("statusAnimActive (:1265-1271) overrides everything by the attacker side", () => {
    for (const target of sides) {
      expect(animSoundPan(0, ctx("opponent", target, true))).toBe(63);
      expect(animSoundPan(SOUND_PAN_ATTACKER, ctx("opponent", target, true))).toBe(63);
      expect(animSoundPan(0, ctx("player", target, true))).toBe(-64);
      expect(animSoundPan(SOUND_PAN_TARGET, ctx("player", target, true))).toBe(-64);
    }
  });

  it("real wire probe windows (design doc section 2): Rhydon (player) Megahorn, Golbat (opponent) Tackle", () => {
    const rhydon = ctx("player", "opponent");
    expect(animSoundPan(SOUND_PAN_ATTACKER, rhydon)).toBe(-64); // f305 SE_M_DRAGON_RAGE
    expect(animSoundPan(SOUND_PAN_TARGET, rhydon)).toBe(63); // f395 SE_M_VICEGRIP
    const golbat = ctx("opponent", "player");
    expect(animSoundPan(SOUND_PAN_TARGET, golbat)).toBe(-63); // f89 SE_M_COMET_PUNCH
  });

  it("every pan argument in the 1042 decoded anim sound ops adjusts into -64..63 for every side pair", () => {
    const rows = (data as unknown as { animScripts: { soundOps: { values: Record<string, number> }[] } }).animScripts.soundOps;
    const values = new Set<number>();
    for (const row of rows) for (const value of Object.values(row.values)) values.add(value);
    expect(values.size).toBeGreaterThan(5);
    for (const value of values) {
      for (const attacker of sides) {
        for (const target of sides) {
          for (const status of [false, true]) {
            const pan = animSoundPan(value, ctx(attacker, target, status));
            expect(pan).toBeGreaterThanOrEqual(-64);
            expect(pan).toBeLessThanOrEqual(63);
          }
        }
      }
    }
  });
});

describe("animSoundPan2 (BattleAnimAdjustPanning2, battle_anim.c:1305-1320)", () => {
  it("negates for an opponent attacker, passes through for the player (:1314-1318)", () => {
    expect(animSoundPan2(SOUND_PAN_ATTACKER, ctx("player", "opponent"))).toBe(-64);
    expect(animSoundPan2(SOUND_PAN_TARGET, ctx("player", "opponent"))).toBe(63);
    expect(animSoundPan2(SOUND_PAN_ATTACKER, ctx("opponent", "player"))).toBe(64); // no clamp in this function
    expect(animSoundPan2(SOUND_PAN_TARGET, ctx("opponent", "player"))).toBe(-63);
    expect(animSoundPan2(-128, ctx("opponent", "player"))).toBe(-128); // s8 wrap
  });

  it("statusAnimActive picks the attacker side's edge (:1307-1313)", () => {
    expect(animSoundPan2(0, ctx("opponent", "player", true))).toBe(63);
    expect(animSoundPan2(0, ctx("player", "opponent", true))).toBe(-64);
  });
});

describe("KeepPanInRange / CalculatePanIncrement (battle_anim.c:1322-1347)", () => {
  it("clamps", () => {
    expect(keepPanInRange(64)).toBe(63);
    expect(keepPanInRange(-65)).toBe(-64);
    expect(keepPanInRange(12)).toBe(12);
    expect(keepPanInRange(1000)).toBe(63);
  });

  it("increment sign follows source -> target, magnitude is |increment|", () => {
    expect(calculatePanIncrement(-64, 63, 2)).toBe(2); // Move_ICY_WIND / Move_SING panse
    expect(calculatePanIncrement(-64, 63, -2)).toBe(2);
    expect(calculatePanIncrement(63, -64, 2)).toBe(-2);
    expect(calculatePanIncrement(63, -64, -3)).toBe(-3);
    expect(calculatePanIncrement(5, 5, 4)).toBe(0);
  });
});
