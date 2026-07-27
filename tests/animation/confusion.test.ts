import { describe, expect, it } from "vitest";
import {
  confusionAttackerEffectAtAge,
  confusionBgBldyAtAge,
  confusionBgIsPsychic,
  confusionBgPaletteRowAtAge,
  confusionTargetShakeDisplayX2,
  confusionTargetEffectAtAge,
} from "../../src/animation/confusion.ts";
import {
  createSceneOnMovePresentation,
  sceneOnConfusionView,
} from "../../src/animation/sceneOnPresentation.ts";

// RAM-probed via tools/probe/run-battle-lab-rgb.py (no new probe script)
// against tools/battle-lab/mechanic-confusion-kadabra-onix.json, ticks
// 80-260 (age = tick - 81, `fadetobg BG_PSYCHIC`'s own creation tick, the
// same age-0 convention futureSight.ts uses).
describe("MOVE_CONFUSION's SetPsychicBackground/UnsetPsychicBackground BG swap", () => {
  it("fade 1 is byte-identical in shape to FUTURE_SIGHT's own (same subroutine)", () => {
    expect(confusionBgBldyAtAge(0)).toBe(0);
    expect(confusionBgBldyAtAge(16)).toBe(16);
    expect(confusionBgBldyAtAge(19)).toBe(16);
    expect(confusionBgBldyAtAge(20)).toBe(15);
    expect(confusionBgBldyAtAge(35)).toBe(0);
    expect(confusionBgBldyAtAge(100)).toBe(0);
  });

  it("fade 2 starts later than FUTURE_SIGHT's own (age 101, not 73) but shares its ramp/hold/ramp shape", () => {
    expect(confusionBgBldyAtAge(101)).toBe(0);
    expect(confusionBgBldyAtAge(117)).toBe(16);
    expect(confusionBgBldyAtAge(121)).toBe(16);
    expect(confusionBgBldyAtAge(122)).toBe(15);
    expect(confusionBgBldyAtAge(137)).toBe(0);
    expect(confusionBgBldyAtAge(138)).toBe(0);
  });

  it("shows BG_PSYCHIC only between the two black covers", () => {
    expect(confusionBgIsPsychic(19)).toBe(false);
    expect(confusionBgIsPsychic(20)).toBe(true);
    expect(confusionBgIsPsychic(80)).toBe(true);
    expect(confusionBgIsPsychic(119)).toBe(true);
    expect(confusionBgIsPsychic(120)).toBe(false);
  });

  it("is inert before the fade begins", () => {
    expect(confusionBgBldyAtAge(-1)).toBe(0);
    expect(confusionBgIsPsychic(-1)).toBe(false);
  });

  // RAM-probed directly against the raw bgPalette2Faded row: clean 4-age
  // cadence from 21 through 93, then a one-time hold to 99 (not the naive
  // 97) - the same rung-6 pause mechanism as FUTURE_SIGHT, at this move's
  // own (later) breakpoint since CONFUSION's own blendoff gap lands later.
  it("holds one extra 2-tick beat once, between ages 93 and 99, then resumes its 4-tick cadence permanently shifted", () => {
    const ring = Array.from({ length: 13 }, (_, index) => ({ r: index, g: 0, b: 0 }));
    const at = (age: number) => confusionBgPaletteRowAtAge(ring, age)[1];
    expect(at(93)).toEqual(at(94));
    expect(at(94)).toEqual(at(97));
    expect(at(97)).toEqual(at(98));
    // No further rotation through age 98 (the naive 4-tick formula would
    // have rotated again at age 97 - RAM shows it doesn't).
    expect(at(98)).toEqual(at(93));
    // The next rotation lands at age 99, not age 97.
    expect(at(99)).not.toEqual(at(98));
    // Cadence resumes cleanly every 4 ages from 99, permanently shifted +2.
    expect(at(103)).not.toEqual(at(99));
    expect(at(107)).not.toEqual(at(103));
  });
});

describe("MOVE_CONFUSION's window 1: attacker AnimTask_ShakeMon2 + blend_color_cycle", () => {
  it("both created at age 37 - the same age FUTURE_SIGHT's own attacker effect starts at", () => {
    expect(confusionAttackerEffectAtAge(36).attackerObjY).toBe(0);
    expect(confusionAttackerEffectAtAge(37).attackerObjY).toBe(0);
    expect(confusionAttackerEffectAtAge(45).attackerObjY).toBe(8);
  });

  it("shakes x2 by 1px through the +1 creation-anchor idiom (RAM: [-1,-1,1,1,-1,-1,...] from age 37)", () => {
    expect(confusionAttackerEffectAtAge(36).attackerX2).toBe(0);
    expect(confusionAttackerEffectAtAge(37).attackerX2).toBe(-1);
    expect(confusionAttackerEffectAtAge(38).attackerX2).toBe(-1);
    expect(confusionAttackerEffectAtAge(39).attackerX2).toBe(1);
    expect(confusionAttackerEffectAtAge(40).attackerX2).toBe(1);
    expect(confusionAttackerEffectAtAge(41).attackerX2).toBe(-1);
  });

  it("shake self-destroys (x2 back to 0) before the blend finishes its own longer run", () => {
    expect(confusionAttackerEffectAtAge(55).attackerX2).toBe(0);
    expect(confusionAttackerEffectAtAge(55).attackerObjY).toBeGreaterThan(0);
  });
});

describe("MOVE_CONFUSION's window 2: target AnimTask_ShakeMon + AnimTask_ScaleMonAndRestore", () => {
  it("both created at age 65 (oracle tick 146), once window 1's own tasks are gone", () => {
    expect(confusionTargetEffectAtAge(64).targetScale.active).toBe(false);
    expect(confusionTargetEffectAtAge(65).targetScale.active).toBe(true);
    // scaleMonAndRestoreAtAge's own step=age+1 formula already reads the
    // first-decremented value at local age 0 - no extra offset needed here
    // (xDelta=-4, matching the probed matrix a=252 at oracle tick 146).
    expect(confusionTargetEffectAtAge(65).targetScale.xScale).toBe(252);
  });

  it("shakes x2 by 3px through the +1 creation-anchor idiom (RAM: [0,0,3,3,0,0,3,3,...] from age 65)", () => {
    expect(confusionTargetEffectAtAge(64).targetX2).toBe(0);
    expect(confusionTargetEffectAtAge(65).targetX2).toBe(0);
    expect(confusionTargetEffectAtAge(66).targetX2).toBe(0);
    expect(confusionTargetEffectAtAge(67).targetX2).toBe(3);
    expect(confusionTargetEffectAtAge(68).targetX2).toBe(3);
    expect(confusionTargetEffectAtAge(69).targetX2).toBe(0);
  });

  it("is idle well before either window", () => {
    const before = confusionTargetEffectAtAge(0);
    expect(before.targetScale).toEqual({ active: false, xScale: 256, yScale: 256 });
    expect(before.targetX2).toBe(0);
  });
});

// sceneOnConfusionView's own display-lag correction (this session): RAM-
// probed directly via a new `dump-scale-window-oam-scanline.py` run against
// this move's own fixture (not a re-derivation of confusion.ts's already-
// exact RAM formula above) - reading `gSprites[].oam` attr1's real x
// bitfield against the SAME struct's x2 field at the identical instant:
// oamX(tick) == x(tick) + x2(tick-1) + centerToCornerVecX(tick), 28/29
// window-2 ticks and 17/18 window-1 ticks (the lone miss each time is the
// task's own creation tick). A real, uniform one-tick OAM-copy latency on
// BOTH windows' shake tasks, which combines with the already-established
// generic one-tick framebuffer-capture lag for a total of -2 - matching
// window 1's own already-coded shake lag, previously NOT applied to window
// 2 (the earlier "no lag" claim rested on a 13/30 sampled-pixel check at a
// single tick near the scale curve's extremum, where a lag error is nearly
// invisible). Dense full-window sweep against the oracle's own captured
// pixels (`tools/compare/confusionPortable.ts`) went from 108/140 to
// 137/140 with this fix; the values below are that same verified-correct
// code's own output, pinned so a regression shows up here before the (much
// slower) oracle comparator.
describe("MOVE_CONFUSION's sceneOnConfusionView display lag (this session's fix)", () => {
  const config = {
    move: "CONFUSION",
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
  const viewAt = (age: number) => sceneOnConfusionView({ ...base, age });

  it("target scale magnitude and post-creation x2 trail the RAM-exact target formula by 2 ticks", () => {
    for (const age of [67, 68, 69, 70, 79, 90, 93, 94]) {
      const shifted = confusionTargetEffectAtAge(age - 2);
      expect(viewAt(age).targetX2).toBe(shifted.targetX2);
      expect(viewAt(age).targetScale.xScale).toBe(shifted.targetScale.xScale);
      expect(viewAt(age).targetScale.yScale).toBe(shifted.targetScale.yScale);
    }
  });

  it("pins concrete oracle-tick values across the window (age = oracle tick - 81)", () => {
    expect(viewAt(65).targetScale.active).toBe(false); // tick146: task not yet displayed
    expect(viewAt(66).targetScale).toEqual({ active: false, xScale: 256, yScale: 256 }); // tick147: matrix not displayed yet
    expect(viewAt(66).targetBlendActive).toBe(true); // objMode/double-size already displayed
    expect(viewAt(66).targetX2).toBe(3); // tick147: raw creation-latch OAM value
    expect(viewAt(67).targetScale.xScale).toBe(252); // tick148
    expect(viewAt(68).targetX2).toBe(0); // tick149
    expect(viewAt(69).targetX2).toBe(3); // tick150
    expect(viewAt(79).targetScale.xScale).toBe(204); // tick160, scale-curve trough
  });

  it("separates objMode/double-size activity from the two-tick-lagged matrix magnitude", () => {
    // Creation: mode arrives first, while the matrix is still neutral.
    expect(viewAt(66).targetBlendActive).toBe(true);
    expect(viewAt(66).targetScale).toEqual({ active: false, xScale: 256, yScale: 256 });
    // Restore tail: mode has reverted, while the prior 252 matrix and
    // frozen monbg underlay remain visible for one final tick.
    expect(viewAt(95).targetBlendActive).toBe(false);
    expect(viewAt(95).targetScale).toEqual({ active: true, xScale: 252, yScale: 252 });
  });

  it("pins the target shake's raw creation-latch display value separately from readable RAM", () => {
    expect(confusionTargetEffectAtAge(65).targetX2).toBe(0); // tick146 post-task RAM
    expect(confusionTargetShakeDisplayX2(66)).toBe(3); // tick147 framebuffer
    expect(confusionTargetShakeDisplayX2(67)).toBe(0);
  });

  it("attacker shake shows the creation-tick transitional value one tick earlier than the old formula (frame119's own fix, RAM-probed via confusion-boundary-instrument.ts)", () => {
    // age 37 (tick118): task not yet displayed - still 0.
    expect(viewAt(37).attackerX2).toBe(0);
    // age 38 (tick119): the OAM shadow already shows the shake task's raw
    // pre-flip creation value (`shakeMon2Sequence`'s own index 0, +1 =
    // xOffset) for exactly this one tick - RAM-confirmed directly, not the
    // old formula's 0 ("not yet active") nor the steady-state -1. This was
    // the dense comparator's own frame119 defect (777px bbox), now closed.
    expect(viewAt(38).attackerX2).toBe(1);
    // age 39/40 onward: the steady one-tick-lagged sequence read, unchanged.
    expect(viewAt(39).attackerX2).toBe(-1);
    expect(viewAt(40).attackerX2).toBe(-1);
    expect(viewAt(41).attackerX2).toBe(1);
  });
});
