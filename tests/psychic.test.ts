import { describe, expect, it } from "vitest";
import {
  psychicAttackerEffectAtAge,
  psychicBgBldyAtAge,
  psychicBgIsPsychic,
  psychicBgPaletteRowAtAge,
  psychicTargetEffectAtAge,
} from "../src/engine/psychic.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPsychicView,
} from "../src/engine/sceneOnPresentation.ts";

// RAM-probed via tools/probe/dump-future-sight-psychicbg.py (no new probe
// script) against tools/battle-lab/mechanic-psychic-kadabra-onix.json,
// ticks 70-260 (age = tick - 79, `fadetobg BG_PSYCHIC`'s own creation tick
// for THIS move - 2 ticks earlier than CONFUSION/FUTURE_SIGHT's own tick 81,
// since "PSYCHIC!" is shorter text than "CONFUSION!"/"FUTURE SIGHT!"; every
// relative age below matched CONFUSION's own already-coded constant exactly
// - see psychic.ts's module doc for the full derivation).
describe("MOVE_PSYCHIC's SetPsychicBackground/UnsetPsychicBackground BG swap", () => {
  it("fade 1 is byte-identical in shape to CONFUSION's own (same subroutine, same relative ages)", () => {
    expect(psychicBgBldyAtAge(0)).toBe(0);
    expect(psychicBgBldyAtAge(16)).toBe(16);
    expect(psychicBgBldyAtAge(19)).toBe(16);
    expect(psychicBgBldyAtAge(20)).toBe(15);
    expect(psychicBgBldyAtAge(35)).toBe(0);
    expect(psychicBgBldyAtAge(100)).toBe(0);
  });

  it("fade 2 starts at age 101, matching CONFUSION's own exactly (window 2's own duration is unchanged)", () => {
    expect(psychicBgBldyAtAge(101)).toBe(0);
    expect(psychicBgBldyAtAge(117)).toBe(16);
    expect(psychicBgBldyAtAge(121)).toBe(16);
    expect(psychicBgBldyAtAge(122)).toBe(15);
    expect(psychicBgBldyAtAge(137)).toBe(0);
    expect(psychicBgBldyAtAge(138)).toBe(0);
  });

  it("shows BG_PSYCHIC only between the two black covers", () => {
    expect(psychicBgIsPsychic(19)).toBe(false);
    expect(psychicBgIsPsychic(20)).toBe(true);
    expect(psychicBgIsPsychic(80)).toBe(true);
    expect(psychicBgIsPsychic(119)).toBe(true);
    expect(psychicBgIsPsychic(120)).toBe(false);
  });

  it("is inert before the fade begins", () => {
    expect(psychicBgBldyAtAge(-1)).toBe(0);
    expect(psychicBgIsPsychic(-1)).toBe(false);
  });

  // RAM-probed directly against the raw bgPalette2Row dump: clean 4-age
  // cadence from 21 through 93, then a one-time hold to 99 (not the naive
  // 97) - the SAME breakpoint age (97) and pause length (2) CONFUSION's own
  // later blendoff gap uses, since window 2's own duration is unchanged
  // (only its shake/scale magnitude differs).
  it("holds one extra 2-tick beat once, between ages 93 and 99, then resumes its 4-tick cadence permanently shifted", () => {
    const ring = Array.from({ length: 13 }, (_, index) => ({ r: index, g: 0, b: 0 }));
    const at = (age: number) => psychicBgPaletteRowAtAge(ring, age)[1];
    expect(at(93)).toEqual(at(94));
    expect(at(94)).toEqual(at(97));
    expect(at(97)).toEqual(at(98));
    expect(at(98)).toEqual(at(93));
    expect(at(99)).not.toEqual(at(98));
    expect(at(103)).not.toEqual(at(99));
    expect(at(107)).not.toEqual(at(103));
  });
});

describe("MOVE_PSYCHIC's window 1: attacker AnimTask_ShakeMon2 + blend_color_cycle", () => {
  it("both created at age 37 (RAM: blendCycleTask's own data[5]=767=RGB(31,23,0) first observed at oracle tick 116 = age 37)", () => {
    expect(psychicAttackerEffectAtAge(36).attackerObjY).toBe(0);
    expect(psychicAttackerEffectAtAge(37).attackerObjY).toBe(0);
    expect(psychicAttackerEffectAtAge(45).attackerObjY).toBe(8);
  });

  it("shakes x2 by 1px through the +1 creation-anchor idiom - identical argv to CONFUSION's own attacker shake", () => {
    expect(psychicAttackerEffectAtAge(36).attackerX2).toBe(0);
    expect(psychicAttackerEffectAtAge(37).attackerX2).toBe(-1);
    expect(psychicAttackerEffectAtAge(38).attackerX2).toBe(-1);
    expect(psychicAttackerEffectAtAge(39).attackerX2).toBe(1);
    expect(psychicAttackerEffectAtAge(40).attackerX2).toBe(1);
    expect(psychicAttackerEffectAtAge(41).attackerX2).toBe(-1);
  });

  it("shake self-destroys (x2 back to 0) before the blend finishes its own longer run", () => {
    expect(psychicAttackerEffectAtAge(55).attackerX2).toBe(0);
    expect(psychicAttackerEffectAtAge(55).attackerObjY).toBeGreaterThan(0);
  });
});

describe("MOVE_PSYCHIC's window 2: target AnimTask_ShakeMon (x=5) + AnimTask_ScaleMonAndRestore (xDelta=yDelta=-6)", () => {
  it("both created at age 65 (RAM: scaleMonTask's own data reads -6,-6,duration=15 first observed at oracle tick 144 = age 65)", () => {
    expect(psychicTargetEffectAtAge(64).targetScale.active).toBe(false);
    expect(psychicTargetEffectAtAge(65).targetScale.active).toBe(true);
    // RAM-probed matrix values at oracle ticks 144/145: 250/244 - directly
    // confirms xDelta=-6 (not CONFUSION's -4) against the real hardware
    // matrix table, not just the script's own literal argv.
    expect(psychicTargetEffectAtAge(65).targetScale.xScale).toBe(250);
    expect(psychicTargetEffectAtAge(66).targetScale.xScale).toBe(244);
  });

  it("shakes x2 by 5px (not CONFUSION's 3px) through the same +1 creation-anchor idiom", () => {
    expect(psychicTargetEffectAtAge(64).targetX2).toBe(0);
    expect(psychicTargetEffectAtAge(65).targetX2).toBe(0);
    expect(psychicTargetEffectAtAge(66).targetX2).toBe(0);
    expect(psychicTargetEffectAtAge(67).targetX2).toBe(5);
    expect(psychicTargetEffectAtAge(68).targetX2).toBe(5);
    expect(psychicTargetEffectAtAge(69).targetX2).toBe(0);
  });

  it("is idle well before either window", () => {
    const before = psychicTargetEffectAtAge(0);
    expect(before.targetScale).toEqual({ active: false, xScale: 256, yScale: 256 });
    expect(before.targetX2).toBe(0);
  });
});

// sceneOnPsychicView applies the SAME generic OAM-shadow/framebuffer-capture
// lags CONFUSION's own rung 12/13 established (sceneOnConfusionView's own
// module doc) - verified against this move's own dense comparator
// (tools/compare/psychicPortable.ts), not just carried over unverified.
describe("MOVE_PSYCHIC's sceneOnPsychicView display lag", () => {
  const config = {
    move: "PSYCHIC",
    attacker: {
      species: "KADABRA",
      geometry: {
        side: "player",
        spriteCorner: { x: 40, y: 56 },
        animationCenter: { x: 72, y: 96 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    },
    target: {
      species: "ONIX",
      geometry: {
        side: "opponent",
        spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 },
      },
    },
    fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100 },
  } as const;
  const base = createSceneOnMovePresentation(config);
  const viewAt = (age: number) => sceneOnPsychicView({ ...base, age });

  it("target x2/scale magnitude trail the RAM-exact psychicTargetEffectAtAge formula by 2 ticks", () => {
    for (const age of [66, 67, 68, 69, 70, 79, 90, 93, 94]) {
      const shifted = psychicTargetEffectAtAge(age - 2);
      expect(viewAt(age).targetX2).toBe(shifted.targetX2);
      expect(viewAt(age).targetScale.xScale).toBe(shifted.targetScale.xScale);
      expect(viewAt(age).targetScale.yScale).toBe(shifted.targetScale.yScale);
    }
  });

  it("the active/inactive edge leads the magnitude read by one more tick (same asymmetry as CONFUSION)", () => {
    expect(viewAt(66).targetScale).toEqual({ active: true, xScale: 256, yScale: 256 });
  });
});
