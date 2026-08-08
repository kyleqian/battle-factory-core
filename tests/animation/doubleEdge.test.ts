import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  ATTACKER_ORIGIN_FIRST_AGE,
  ATTACKER_SLIDE_FIRST_AGE,
  ATTACKER_WHITE2_FIRST_AGE,
  ATTACKER_WHITE2_LAST_AGE,
  ATTACKER_WHITE_FIRST_AGE,
  ATTACKER_WHITE_LAST_AGE,
  BG_WHITE_CLEAR_AGE,
  BG_WHITE_FIRST_AGE,
  BG_WHITE_RAMP_FIRST_AGE,
  DOUBLE_EDGE_FRAME_COUNT,
  ELLIPSE_FIRST_AGE,
  ELLIPSE_LAST_AGE,
  HITSPLAT_AGE,
  RESTORE_FIRST_AGE,
  RESTORE_RESET_AGE,
  ROTATE_FIRST_AGE,
  ROTATE_LAST_AGE,
  SHAKE_FIRST_AGE,
  SHAKE_LAST_AGE,
  TARGET_ORIGIN_FIRST_AGE,
  TARGET_SLIDE_FIRST_AGE,
  doubleEdgeAtAge,
} from "../../src/animation/doubleEdge.ts";
import { shakeMonInPlaceOffsetAtTick } from "../../src/animation/shakeMonInPlace.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
} from "../../src/animation/slideMon.ts";
import { wrapEllipticalOffsetAtAge } from "../../src/animation/wrap.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDoubleEdgeView,
} from "../../src/animation/sceneOnPresentation.ts";

// Player-back: the player HITMONTOP-style attacker vs an opponent ONIX front
// (target center X_2 176 / Y_PIC 42). Opponent-front: mirrored, target is the
// player's ONIX back (center X_2 72 / Y_PIC 88). The two windows are the same
// 141 frames shifted +4 (player 80..220, opponent 84..224).
const GEOM_PLAYER = {
  attackerSide: "player",
  targetSide: "opponent",
  targetCenter: { x: 176, y: 42 },
} as const;
const GEOM_OPPONENT = {
  attackerSide: "opponent",
  targetSide: "player",
  targetCenter: { x: 72, y: 88 },
} as const;

describe("Move_DOUBLE_EDGE source-relative reducer", () => {
  it("is a 141-frame window in both orientations (player 80..220, opponent 84..224)", () => {
    expect(DOUBLE_EDGE_FRAME_COUNT).toBe(141);
    // player-back frame 80 = age 0, opponent-front frame 84 = age 0 (+4 shift)
    expect(doubleEdgeAtAge(0, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter))
      .toMatchObject({ active: true });
    expect(doubleEdgeAtAge(DOUBLE_EDGE_FRAME_COUNT - 2, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter))
      .toMatchObject({ active: true });
    expect(doubleEdgeAtAge(DOUBLE_EDGE_FRAME_COUNT - 1, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter))
      .toMatchObject({ active: false });
    // the exported age constants are the measured RAM ages from the staging probe
    expect({
      ELLIPSE_FIRST_AGE, ELLIPSE_LAST_AGE,
      ATTACKER_SLIDE_FIRST_AGE, TARGET_SLIDE_FIRST_AGE,
      ROTATE_FIRST_AGE, ROTATE_LAST_AGE,
      RESTORE_FIRST_AGE, RESTORE_RESET_AGE,
      SHAKE_FIRST_AGE, SHAKE_LAST_AGE,
      HITSPLAT_AGE,
      ATTACKER_ORIGIN_FIRST_AGE, TARGET_ORIGIN_FIRST_AGE,
    }).toEqual({
      ELLIPSE_FIRST_AGE: 32, ELLIPSE_LAST_AGE: 61,
      ATTACKER_SLIDE_FIRST_AGE: 63, TARGET_SLIDE_FIRST_AGE: 70,
      ROTATE_FIRST_AGE: 80, ROTATE_LAST_AGE: 87,
      RESTORE_FIRST_AGE: 119, RESTORE_RESET_AGE: 126,
      SHAKE_FIRST_AGE: 80, SHAKE_LAST_AGE: 100,
      HITSPLAT_AGE: 70,
      ATTACKER_ORIGIN_FIRST_AGE: 127, TARGET_ORIGIN_FIRST_AGE: 132,
    });
  });

  it("runs the 18/6/2/4 elliptical lunge over its full span in both orientations", () => {
    const at = (age: number) => doubleEdgeAtAge(age, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter);
    const atO = (age: number) => doubleEdgeAtAge(age, GEOM_OPPONENT.attackerSide, GEOM_OPPONENT.targetSide, GEOM_OPPONENT.targetCenter);
    // creation tick (phase 0) and the self-destroy tick both sit at the origin
    expect(at(ELLIPSE_FIRST_AGE - 1)).toMatchObject({ attackerOffset: { x2: 0, y2: 0 } });
    expect(at(ELLIPSE_LAST_AGE + 1)).toMatchObject({ attackerOffset: { x2: 0, y2: 0 } });
    // phase 16/32/48/64/... first loop (verified against the probe's x2/y2)
    expect(at(ELLIPSE_FIRST_AGE)).toMatchObject({ attackerOffset: { x2: 6, y2: 1 } });
    expect(at(ELLIPSE_FIRST_AGE + 1)).toMatchObject({ attackerOffset: { x2: 12, y2: 2 } });
    expect(at(ELLIPSE_FIRST_AGE + 3)).toMatchObject({ attackerOffset: { x2: 18, y2: 6 } });
    expect(at(ELLIPSE_FIRST_AGE + 11)).toMatchObject({ attackerOffset: { x2: -18, y2: 6 } });
    // phase 128 sits at (0,0) and the second loop repeats the mirror image
    expect(at(ELLIPSE_FIRST_AGE + 15)).toMatchObject({ attackerOffset: { x2: 0, y2: 0 } });
    expect(at(ELLIPSE_FIRST_AGE + 19)).toMatchObject({ attackerOffset: { x2: 18, y2: 6 } });
    expect(at(ELLIPSE_LAST_AGE)).toMatchObject({ attackerOffset: { x2: -13, y2: 2 } });
    // TWO loops: the second cycle runs 32..48 (16..240 phases) then destroys
    expect(at(ELLIPSE_FIRST_AGE + 29)).toMatchObject({ attackerOffset: { x2: -13, y2: 2 } });
    // opponent-side attacker mirrors the width (negated amplitude floors toward -inf)
    expect(atO(ELLIPSE_FIRST_AGE)).toMatchObject({ attackerOffset: { x2: -7, y2: 1 } });
    expect(atO(ELLIPSE_FIRST_AGE + 3)).toMatchObject({ attackerOffset: { x2: -18, y2: 6 } });
    expect(atO(ELLIPSE_FIRST_AGE + 11)).toMatchObject({ attackerOffset: { x2: 18, y2: 6 } });
    expect(atO(ELLIPSE_FIRST_AGE + 19)).toMatchObject({ attackerOffset: { x2: -18, y2: 6 } });
    // every lunge age is the shared wrap port (REUSE, not a re-port)
    for (let age = ELLIPSE_FIRST_AGE - 1; age <= ELLIPSE_LAST_AGE + 1; age += 1) {
      for (const side of ["player", "opponent"] as const) {
        const state = doubleEdgeAtAge(age, side, side === "player" ? "opponent" : "player", side === "player" ? GEOM_PLAYER.targetCenter : GEOM_OPPONENT.targetCenter);
        const expected = wrapEllipticalOffsetAtAge(
          age - (ELLIPSE_FIRST_AGE - 1),
          side,
          { xRadius: 18, yRadius: 6, loops: 2, speed: 4 },
        );
        expect(state.attackerOffset.x2).toBe(expected.x2);
        expect(state.attackerOffset.y2).toBe(expected.y2);
      }
    }
  });

  it("drives the attacker slide +20 through the shared slide-to-offset port and back", () => {
    const at = (age: number) => doubleEdgeAtAge(age, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter);
    expect(at(ATTACKER_SLIDE_FIRST_AGE - 1)).toMatchObject({ attackerOffset: { x2: 0, y2: 0 } });
    expect(at(ATTACKER_SLIDE_FIRST_AGE)).toMatchObject({ attackerOffset: { x2: 5, y2: 0 } });
    expect(at(ATTACKER_SLIDE_FIRST_AGE + 2)).toMatchObject({ attackerOffset: { x2: 15, y2: 0 } });
    expect(at(ATTACKER_SLIDE_FIRST_AGE + 3)).toMatchObject({ attackerOffset: { x2: 20, y2: 0 } });
    // the ramp equals the shared port's tick output (REUSE pin, like counter.test.ts)
    for (let age = ATTACKER_SLIDE_FIRST_AGE; age < ATTACKER_SLIDE_FIRST_AGE + 4; age += 1) {
      const tick = age - ATTACKER_SLIDE_FIRST_AGE;
      expect(at(age).attackerOffset.x2).toBe(
        slideMonToOffsetAtTick(
          { battlerSide: "player", targetXOffset: 20, targetYOffset: 0, mirrorVertical: false, durationTicks: 4 },
          tick,
        ).x2,
      );
    }
    // held at +20 through the rotation block, then slide-to-original drives it back
    expect(at(ATTACKER_ORIGIN_FIRST_AGE - 1)).toMatchObject({ attackerOffset: { x2: 20 } });
    expect(at(ATTACKER_ORIGIN_FIRST_AGE)).toMatchObject({ attackerOffset: { x2: 16 } });
    expect(at(ATTACKER_ORIGIN_FIRST_AGE + 3)).toMatchObject({ attackerOffset: { x2: 4 } });
    expect(at(ATTACKER_ORIGIN_FIRST_AGE + 4)).toMatchObject({ attackerOffset: { x2: 0 } });
    // opponent-side attacker mirrors the slide to -20
    const atO = (age: number) => doubleEdgeAtAge(age, GEOM_OPPONENT.attackerSide, GEOM_OPPONENT.targetSide, GEOM_OPPONENT.targetCenter);
    expect(atO(ATTACKER_SLIDE_FIRST_AGE)).toMatchObject({ attackerOffset: { x2: -5, y2: 0 } });
    expect(atO(ATTACKER_SLIDE_FIRST_AGE + 3)).toMatchObject({ attackerOffset: { x2: -20 } });
    expect(atO(ATTACKER_ORIGIN_FIRST_AGE)).toMatchObject({ attackerOffset: { x2: -16 } });
    // the return slide equals the shared slide-to-original port
    for (let age = ATTACKER_ORIGIN_FIRST_AGE; age < ATTACKER_ORIGIN_FIRST_AGE + 5; age += 1) {
      expect(at(age).attackerOffset.x2).toBe(
        slideMonToOriginalPosAtTick(
          { currentX2: 20, currentY2: 12, axisSnapMode: 0, durationTicks: 5 },
          age - ATTACKER_ORIGIN_FIRST_AGE,
        ).x2,
      );
    }
  });

  it("drives the target slide -32 through the shared port (player-side holds -32, opponent +31)", () => {
    const at = (age: number) => doubleEdgeAtAge(age, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter);
    const atO = (age: number) => doubleEdgeAtAge(age, GEOM_OPPONENT.attackerSide, GEOM_OPPONENT.targetSide, GEOM_OPPONENT.targetCenter);
    expect(at(TARGET_SLIDE_FIRST_AGE - 1)).toMatchObject({ targetOffset: { x2: 0, y2: 0 } });
    // opponent-side target slides to +31, not +32: the shared port's truncating
    // Q8.8 division lands on 31 (the held value the origin slide reads back)
    expect(at(TARGET_SLIDE_FIRST_AGE)).toMatchObject({ targetOffset: { x2: 10, y2: 0 } });
    expect(at(TARGET_SLIDE_FIRST_AGE + 1)).toMatchObject({ targetOffset: { x2: 21, y2: 0 } });
    expect(at(TARGET_SLIDE_FIRST_AGE + 2)).toMatchObject({ targetOffset: { x2: 31, y2: 0 } });
    expect(at(100)).toMatchObject({ targetOffset: { x2: 27 } }); // 31 + shake -4
    expect(atO(TARGET_SLIDE_FIRST_AGE)).toMatchObject({ targetOffset: { x2: -11, y2: 0 } });
    expect(atO(TARGET_SLIDE_FIRST_AGE + 2)).toMatchObject({ targetOffset: { x2: -32, y2: 0 } });
    for (let age = TARGET_SLIDE_FIRST_AGE; age < TARGET_SLIDE_FIRST_AGE + 3; age += 1) {
      const tick = age - TARGET_SLIDE_FIRST_AGE;
      expect(at(age).targetOffset.x2).toBe(
        slideMonToOffsetAtTick(
          { battlerSide: "opponent", targetXOffset: -32, targetYOffset: 0, mirrorVertical: false, durationTicks: 3 },
          tick,
        ).x2,
      );
      expect(atO(age).targetOffset.x2).toBe(
        slideMonToOffsetAtTick(
          { battlerSide: "player", targetXOffset: -32, targetYOffset: 0, mirrorVertical: false, durationTicks: 3 },
          tick,
        ).x2,
      );
    }
    // slide-to-original drives the target back to 0 over ages 132-138
    expect(at(TARGET_ORIGIN_FIRST_AGE - 1)).toMatchObject({ targetOffset: { x2: 31 } });
    expect(at(TARGET_ORIGIN_FIRST_AGE)).toMatchObject({ targetOffset: { x2: 26 } });
    expect(at(TARGET_ORIGIN_FIRST_AGE + 6)).toMatchObject({ targetOffset: { x2: 0 } });
    for (let age = TARGET_ORIGIN_FIRST_AGE; age < TARGET_ORIGIN_FIRST_AGE + 7; age += 1) {
      expect(at(age).targetOffset.x2).toBe(
        slideMonToOriginalPosAtTick(
          { currentX2: 31, currentY2: 0, axisSnapMode: 0, durationTicks: 7 },
          age - TARGET_ORIGIN_FIRST_AGE,
        ).x2,
      );
    }
  });

  it("toggles the ShakeMonInPlace(4,0,12,1) x2 through the shared shakeMonInPlace port", () => {
    const x2 = (age: number) => doubleEdgeAtAge(age, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter).targetOffset.x2;
    // the shake x2 is ADDED to the held target slide (+31 opponent / -32 player)
    const held = 31;
    expect(x2(SHAKE_FIRST_AGE - 1)).toBe(held); // no shake before the task toggles
    expect(x2(SHAKE_FIRST_AGE)).toBe(held - 4); // tick 1 = -4
    expect(x2(SHAKE_FIRST_AGE + 1)).toBe(held + 4);
    expect(x2(SHAKE_FIRST_AGE + 2)).toBe(held + 4); // frameDelay 1 holds the value
    expect(x2(SHAKE_FIRST_AGE + 3)).toBe(held - 4);
    expect(x2(SHAKE_LAST_AGE)).toBe(held - 4); // last toggle
    expect(x2(SHAKE_LAST_AGE + 1)).toBe(held); // restore to the held slide
    for (let age = SHAKE_FIRST_AGE; age <= SHAKE_LAST_AGE + 1; age += 1) {
      expect(x2(age)).toBe(
        held + shakeMonInPlaceOffsetAtTick(4, 0, 12, 1, age - (SHAKE_FIRST_AGE - 1)).x2,
      );
    }
  });

  it("writes the RotateMonSpriteToSide matrices at the boundary ages", () => {
    const expectedMatrix = (rotation: number) => {
      const index = (rotation >> 8) & 0xff;
      const sin = GBA_SINE_TABLE_256[index]!;
      const cos = GBA_SINE_TABLE_256[(index + 64) & 0xff]!;
      return { a: cos, b: -sin, c: sin, d: cos };
    };
    const at = (age: number) => doubleEdgeAtAge(age, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter);
    const atO = (age: number) => doubleEdgeAtAge(age, GEOM_OPPONENT.attackerSide, GEOM_OPPONENT.targetSide, GEOM_OPPONENT.targetCenter);
    // before the forward span and after the reset the matrix is identity
    expect(at(ROTATE_FIRST_AGE - 1).attackerTransform).toMatchObject({ active: false, matrix: { a: 256, b: 0, c: 0, d: 256 } });
    expect(at(RESTORE_RESET_AGE).attackerTransform).toMatchObject({ active: false, matrix: { a: 256, b: 0, c: 0, d: 256 } });
    expect(atO(RESTORE_RESET_AGE).attackerTransform).toMatchObject({ active: false, matrix: { a: 256, b: 0, c: 0, d: 256 } });
    // forward span: rotation 256..2048 on the player side, -256..-2048 mirrored
    for (let age = ROTATE_FIRST_AGE; age <= ROTATE_LAST_AGE; age += 1) {
      expect(at(age).attackerTransform).toEqual({ active: true, matrix: expectedMatrix((age - ROTATE_FIRST_AGE + 1) * 256) });
      expect(atO(age).attackerTransform).toEqual({ active: true, matrix: expectedMatrix(-(age - ROTATE_FIRST_AGE + 1) * 256) });
    }
    // the hold between the spans freezes the final forward matrix (rotation 2048)
    for (const age of [ROTATE_LAST_AGE + 1, RESTORE_FIRST_AGE - 1]) {
      expect(at(age).attackerTransform).toEqual({ active: true, matrix: expectedMatrix(8 * 256) });
      expect(atO(age).attackerTransform).toEqual({ active: true, matrix: expectedMatrix(-8 * 256) });
    }
    // reversal span: player side accumulates +256 from +2048 (2304..3840)
    for (let age = RESTORE_FIRST_AGE; age < RESTORE_RESET_AGE; age += 1) {
      const step = age - RESTORE_FIRST_AGE + 1;
      expect(at(age).attackerTransform).toEqual({ active: true, matrix: expectedMatrix((8 + step) * 256) });
      expect(atO(age).attackerTransform).toEqual({ active: true, matrix: expectedMatrix(-(8 + step) * 256) });
    }
    // concrete boundary matrices (probe-verified): forward peak and reversal ends
    expect(at(ROTATE_LAST_AGE).attackerTransform.matrix).toEqual({ a: 251, b: -49, c: 49, d: 251 });
    expect(at(RESTORE_FIRST_AGE).attackerTransform.matrix).toEqual({ a: 249, b: -56, c: 56, d: 249 });
    expect(at(RESTORE_RESET_AGE - 1).attackerTransform.matrix).toEqual({ a: 238, b: -92, c: 92, d: 238 });
    expect(atO(RESTORE_FIRST_AGE).attackerTransform.matrix).toEqual({ a: 249, b: 56, c: -56, d: 249 });
  });

  it("applies the rotation-derived y2 only to the player-side battler", () => {
    const at = (age: number) => doubleEdgeAtAge(age, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter);
    const atO = (age: number) => doubleEdgeAtAge(age, GEOM_OPPONENT.attackerSide, GEOM_OPPONENT.targetSide, GEOM_OPPONENT.targetCenter);
    // player-back: the attacker is the player side, so it carries the y2
    expect(at(ROTATE_LAST_AGE).attackerOffset.y2).toBe(6); // |c|=49 >> 3
    expect(at(RESTORE_FIRST_AGE).attackerOffset.y2).toBe(7);
    expect(at(RESTORE_RESET_AGE - 1).attackerOffset.y2).toBe(11);
    // the reset step writes rotation 4096 (c≈98, y2=12) then resets the matrix
    expect(at(RESTORE_RESET_AGE).attackerOffset.y2).toBe(12);
    // opponent-front: the TARGET is the player side and carries the y2 instead
    expect(atO(RESTORE_FIRST_AGE).attackerOffset.y2).toBe(0);
    expect(atO(RESTORE_RESET_AGE - 1).attackerOffset.y2).toBe(0);
    expect(atO(RESTORE_FIRST_AGE).targetOffset.y2).toBe(7);
    expect(atO(RESTORE_RESET_AGE - 1).targetOffset.y2).toBe(11);
    expect(atO(RESTORE_RESET_AGE).targetOffset.y2).toBe(12);
    // the attacker origin slide drives the player-side y2 back from 12
    expect(at(ATTACKER_ORIGIN_FIRST_AGE).attackerOffset.y2).toBe(9);
  });

  it("spawns the hitsplat over ages 70..78 at the mirrored target-relative anchor", () => {
    const at = (age: number) => doubleEdgeAtAge(age, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter);
    const atO = (age: number) => doubleEdgeAtAge(age, GEOM_OPPONENT.attackerSide, GEOM_OPPONENT.targetSide, GEOM_OPPONENT.targetCenter);
    expect(at(HITSPLAT_AGE - 1).hitsplat).toBeNull();
    expect(at(HITSPLAT_AGE).hitsplat).toEqual({ x: 166, y: 42 }); // 176 - 10
    expect(at(HITSPLAT_AGE + 8).hitsplat).toEqual({ x: 166, y: 42 });
    expect(at(HITSPLAT_AGE + 9).hitsplat).toBeNull();
    // opponent-front target is the player side, so the anchor mirrors to +10
    expect(atO(HITSPLAT_AGE).hitsplat).toEqual({ x: 82, y: 88 }); // 72 + 10
    expect(atO(HITSPLAT_AGE + 8).hitsplat).toEqual({ x: 82, y: 88 });
    expect(atO(HITSPLAT_AGE + 9).hitsplat).toBeNull();
    // the hitsplat age carries the SE_M_MEGA_KICK2 sound, panned to the target side
    expect(at(HITSPLAT_AGE).sound).toBe("SE_M_MEGA_KICK2");
    expect(at(HITSPLAT_AGE).soundPanSide).toBe("opponent");
    expect(atO(HITSPLAT_AGE).soundPanSide).toBe("player");
  });

  it("reports the attacker-white and BG-white blend coefficient curves", () => {
    const at = (age: number) => doubleEdgeAtAge(age, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter);
    // complex_palette_blend white: coefficient 10 at ages 4..7 and 13..18
    expect(at(ATTACKER_WHITE_FIRST_AGE - 1).attackerWhiteCoefficient).toBe(0);
    expect(at(ATTACKER_WHITE_FIRST_AGE).attackerWhiteCoefficient).toBe(10);
    expect(at(ATTACKER_WHITE_LAST_AGE).attackerWhiteCoefficient).toBe(10);
    expect(at(ATTACKER_WHITE_LAST_AGE + 1).attackerWhiteCoefficient).toBe(0);
    expect(at(ATTACKER_WHITE2_FIRST_AGE).attackerWhiteCoefficient).toBe(10);
    expect(at(ATTACKER_WHITE2_LAST_AGE).attackerWhiteCoefficient).toBe(10);
    expect(at(ATTACKER_WHITE2_LAST_AGE + 1).attackerWhiteCoefficient).toBe(0);
    // F_PAL_BG flat 16 at 63..82, then 16 - 2*(1+floor((age-83)/4)) down to 0 at 111
    expect(at(BG_WHITE_FIRST_AGE - 1).bgWhiteCoefficient).toBe(0);
    expect(at(BG_WHITE_FIRST_AGE).bgWhiteCoefficient).toBe(16);
    expect(at(BG_WHITE_RAMP_FIRST_AGE - 1).bgWhiteCoefficient).toBe(16);
    expect(at(BG_WHITE_RAMP_FIRST_AGE).bgWhiteCoefficient).toBe(14);
    for (let age = BG_WHITE_RAMP_FIRST_AGE; age < BG_WHITE_CLEAR_AGE; age += 1) {
      expect(at(age).bgWhiteCoefficient).toBe(16 - 2 * (1 + Math.floor((age - BG_WHITE_RAMP_FIRST_AGE) / 4)));
    }
    expect(at(BG_WHITE_CLEAR_AGE - 1).bgWhiteCoefficient).toBe(2);
    expect(at(BG_WHITE_CLEAR_AGE).bgWhiteCoefficient).toBe(0);
    // spot values: 12 at 87, 10 at 91, 8 at 95, 6 at 99, 4 at 103, 2 at 107
    expect(at(87).bgWhiteCoefficient).toBe(12);
    expect(at(91).bgWhiteCoefficient).toBe(10);
    expect(at(95).bgWhiteCoefficient).toBe(8);
    expect(at(99).bgWhiteCoefficient).toBe(6);
    expect(at(103).bgWhiteCoefficient).toBe(4);
    expect(at(107).bgWhiteCoefficient).toBe(2);
  });

  it("pins the early sounds and leaves the ONIX front-idle x2=1 hold to the draw case", () => {
    const at = (age: number) => doubleEdgeAtAge(age, GEOM_PLAYER.attackerSide, GEOM_PLAYER.targetSide, GEOM_PLAYER.targetCenter);
    const atO = (age: number) => doubleEdgeAtAge(age, GEOM_OPPONENT.attackerSide, GEOM_OPPONENT.targetSide, GEOM_OPPONENT.targetCenter);
    expect(at(4).sound).toBe("SE_M_SWIFT");
    expect(at(4).soundPanSide).toBe("player"); // pan attacker
    expect(at(32).sound).toBe("SE_M_SWAGGER");
    expect(at(32).soundPanSide).toBe("player");
    expect(atO(4).soundPanSide).toBe("opponent");
    expect(atO(32).soundPanSide).toBe("opponent");
    // THE ONIX EXCLUSION: the probe reads the player-back target x2 as 1 for
    // ages 0..69 (ONIX front idle hold) while the reducer stays 0, because the
    // hold is a species-idle property the DRAW CASE supplies, not the move's
    // own state (the same convention as TAKE_DOWN / SLASH / LICK / COUNTER).
    // Opponent-front has no such hold (ONIX back rests at x2=0) and matches 0.
    for (let age = 0; age <= 69; age += 1) {
      expect(at(age).targetOffset.x2).toBe(0);
      expect(atO(age).targetOffset.x2).toBe(0);
    }
  });

  it("exposes the same reducer through the Scene-ON presentation seam", () => {
    const state = createSceneOnMovePresentation({
      move: "DOUBLE_EDGE",
      attacker: {
        species: "HITMONTOP",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 53 },
          animationCenter: { x: 72, y: 85 },
          battlePositionCenter: { x: 72, y: 78 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: GEOM_PLAYER.targetCenter,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 167,
        playerMaxHp: 175,
        opponentHp: 142,
        opponentMaxHp: 142,
      },
    });
    const view = sceneOnDoubleEdgeView({ ...state, age: 110 });
    expect(view).toMatchObject({
      age: 110,
      attackerOffset: { x2: 20, y2: 6 }, // held slide + rotation y2
      attackerTransform: { active: true },
      bgWhiteCoefficient: 2,
      hitsplat: null,
    });
    expect(view.targetOffset.x2).toBe(31); // held slide, shake restored
    expect(view.targetTransform.active).toBe(true);
  });
});
