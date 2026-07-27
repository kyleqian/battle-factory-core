import { describe, expect, it } from "vitest";
import {
  FAINT_ATTACK_ANIMATION_PROFILE,
  FIRE_PUNCH_REDUCER_EPOCH_AGE,
  TURN17_FIRE_PUNCH_FIRST_ANIMATION_OWNED_AGE,
  faintAttackAttackerEva,
  faintAttackAttackerOffset,
  faintAttackBgState,
  faintAttackHitsplatVisible,
  faintAttackOwnsAnimationRender,
  faintAttackResolutionState,
  faintAttackResolutionTiming,
  faintAttackTargetShakeX2,
} from "../../src/animation/faintAttack.ts";
import { advanceRngValue } from "../../src/engine/rng.ts";

describe("FAINT_ATTACK pure animation reducers", () => {
  it("pins the source-script ownership interval including its final displayed VBlank", () => {
    expect(faintAttackOwnsAnimationRender(-1)).toBe(false);
    expect(faintAttackOwnsAnimationRender(0)).toBe(true);
    expect(faintAttackOwnsAnimationRender(220)).toBe(true);
    expect(faintAttackOwnsAnimationRender(221)).toBe(false);
  });

  it("pins both Task_FadeToBg halves at every swap/settle boundary", () => {
    expect(faintAttackBgState(4)).toEqual({ background: "default", bldy: 0 });
    expect(faintAttackBgState(5)).toEqual({ background: "default", bldy: 1 });
    expect(faintAttackBgState(20)).toEqual({ background: "default", bldy: 16 });
    expect(faintAttackBgState(23)).toEqual({ background: "default", bldy: 16 });
    expect(faintAttackBgState(24)).toEqual({ background: "dark", bldy: 15 });
    expect(faintAttackBgState(38)).toEqual({ background: "dark", bldy: 1 });
    expect(faintAttackBgState(39)).toEqual({ background: "dark", bldy: 0 });
    expect(faintAttackBgState(183)).toEqual({ background: "dark", bldy: 0 });
    expect(faintAttackBgState(184)).toEqual({ background: "dark", bldy: 1 });
    expect(faintAttackBgState(199)).toEqual({ background: "dark", bldy: 16 });
    expect(faintAttackBgState(203)).toEqual({ background: "dark", bldy: 16 });
    expect(faintAttackBgState(204)).toEqual({ background: "default", bldy: 15 });
    expect(faintAttackBgState(219)).toEqual({ background: "default", bldy: 0 });
  });

  it("pins the source ellipse's first step, last live step, and reset", () => {
    expect(faintAttackAttackerOffset(43)).toEqual({ x2: 0, y2: 0 });
    expect(faintAttackAttackerOffset(44)).toEqual({ x2: -4, y2: 1 });
    expect(faintAttackAttackerOffset(73)).toEqual({ x2: 6, y2: 1 });
    expect(faintAttackAttackerOffset(74)).toEqual({ x2: 0, y2: 0 });
    expect(faintAttackAttackerOffset(75)).toEqual({ x2: 0, y2: 0 });
  });

  it("keeps the timeline immutable and mirrors only the side-respecting ellipse", () => {
    expect(Object.isFrozen(FAINT_ATTACK_ANIMATION_PROFILE)).toBe(true);
    expect(faintAttackAttackerOffset(44, "player")).toEqual({ x2: 3, y2: 1 });
    expect(faintAttackAttackerOffset(73, "player")).toEqual({ x2: -7, y2: 1 });
    expect(faintAttackAttackerOffset(74, "player")).toEqual({ x2: 0, y2: 0 });
    expect(faintAttackBgState(184, FAINT_ATTACK_ANIMATION_PROFILE)).toEqual({
      background: "dark",
      bldy: 1,
    });
  });

  it("pins fade-to/from-invisible coefficients and the invisible hold", () => {
    expect(faintAttackAttackerEva(43)).toBe(16);
    expect(faintAttackAttackerEva(44)).toBe(16);
    expect(faintAttackAttackerEva(45)).toBe(15);
    expect(faintAttackAttackerEva(46)).toBe(15);
    expect(faintAttackAttackerEva(74)).toBe(1);
    expect(faintAttackAttackerEva(75)).toBe(0);
    expect(faintAttackAttackerEva(146)).toBe(0);
    expect(faintAttackAttackerEva(147)).toBe(1);
    expect(faintAttackAttackerEva(148)).toBe(1);
    expect(faintAttackAttackerEva(176)).toBe(15);
    expect(faintAttackAttackerEva(177)).toBe(16);
  });

  it("pins ShakeMon2's alternating two-VBlank poses and teardown", () => {
    expect(faintAttackTargetShakeX2(86)).toBe(0);
    expect(faintAttackTargetShakeX2(87)).toBe(-2);
    expect(faintAttackTargetShakeX2(88)).toBe(-2);
    expect(faintAttackTargetShakeX2(89)).toBe(2);
    expect(faintAttackTargetShakeX2(102)).toBe(2);
    expect(faintAttackTargetShakeX2(103)).toBe(0);
  });

  it("pins the generic animation-1 hitsplat's ten displayed VBlanks", () => {
    expect(faintAttackHitsplatVisible(86)).toBe(false);
    expect(faintAttackHitsplatVisible(87)).toBe(true);
    expect(faintAttackHitsplatVisible(96)).toBe(true);
    expect(faintAttackHitsplatVisible(97)).toBe(false);
  });

  it("pins the reusable post-hit healthbox wobble and four-cycle target blink", () => {
    expect(faintAttackResolutionState(225).targetHealthboxY2).toBe(0);
    expect(faintAttackResolutionState(226).targetHealthboxY2).toBe(1);
    expect(faintAttackResolutionState(227).targetHealthboxY2).toBe(-1);
    expect(faintAttackResolutionState(245).targetHealthboxY2).toBe(-1);
    expect(faintAttackResolutionState(246).targetHealthboxY2).toBe(0);

    expect(faintAttackResolutionState(226).targetInvisible).toBe(false);
    expect(faintAttackResolutionState(227).targetInvisible).toBe(true);
    expect(faintAttackResolutionState(230).targetInvisible).toBe(true);
    expect(faintAttackResolutionState(231).targetInvisible).toBe(false);
    expect(faintAttackResolutionState(254).targetInvisible).toBe(true);
    expect(faintAttackResolutionState(255).targetInvisible).toBe(false);
  });

  it("drains the displayed MAGBY bar one HP per frame before the atomic battle-HP write", () => {
    expect(faintAttackResolutionState(260)).toMatchObject({ displayedHp: 138, battleHp: 138 });
    expect(faintAttackResolutionState(261)).toMatchObject({ displayedHp: 137, battleHp: 138 });
    expect(faintAttackResolutionState(318)).toMatchObject({ displayedHp: 80, battleHp: 138 });
    expect(faintAttackResolutionState(319)).toMatchObject({ displayedHp: 79, battleHp: 138 });
    expect(faintAttackResolutionState(320)).toMatchObject({ displayedHp: 79, battleHp: 138 });
    expect(faintAttackResolutionState(321)).toMatchObject({ displayedHp: 79, battleHp: 79 });
    expect(faintAttackResolutionState(262, { startHp: 10, endHp: 8 })).toMatchObject({
      displayedHp: 8,
      battleHp: 10,
    });
    expect(faintAttackResolutionState(313, { startHp: 79, endHp: 27 })).toMatchObject({
      displayedHp: 27,
      battleHp: 79,
    });
    expect(faintAttackResolutionState(314, { startHp: 79, endHp: 27 })).toMatchObject({
      displayedHp: 27,
      battleHp: 27,
    });
  });

  it("derives turn 17's shorter post-drain command schedule from its 52-point hit", () => {
    expect(faintAttackResolutionTiming({ startHp: 79, endHp: 27 })).toEqual({
      hpCommitAge: 314,
      secondaryRollAge: 319,
      targetHandoffAge: 326,
      clearCurrentMoveAge: 327,
      firePunchOwnershipAge: 328,
      firePunchAccuracyRollAge: 333,
      firePunchTextAge: 335,
      firePunchPpWriteAge: 357,
      firePunchCriticalRollAge: 358,
      firePunchDamageRollAge: 361,
      firePunchMoveAnimationCommandAge: 362,
      firePunchAnimationOwnedAge: 364,
    });
    expect(FIRE_PUNCH_REDUCER_EPOCH_AGE).toBe(344);
    expect(TURN17_FIRE_PUNCH_FIRST_ANIMATION_OWNED_AGE).toBe(364);
  });

  it("pins the silent chance-0 secondary roll and FIRE_PUNCH accuracy roll to the RAM RNG stream", () => {
    const beforeSecondary = 2744256313;
    const afterSecondary = advanceRngValue(beforeSecondary);
    const afterAccuracy = advanceRngValue(afterSecondary);
    expect(afterSecondary).toBe(846647736);
    expect(afterAccuracy).toBe(2630728651);

    expect(faintAttackResolutionState(325)).toMatchObject({
      faintAttackSecondaryRollConsumed: false,
      firePunchAccuracyRollConsumed: false,
      rngCallsConsumed: 0,
    });
    expect(faintAttackResolutionState(326)).toMatchObject({
      faintAttackSecondaryRollConsumed: true,
      firePunchAccuracyRollConsumed: false,
      rngCallsConsumed: 1,
    });
    expect(faintAttackResolutionState(340)).toMatchObject({
      faintAttackSecondaryRollConsumed: true,
      firePunchAccuracyRollConsumed: true,
      rngCallsConsumed: 2,
    });
  });

  it("pins the target, current-move, attacker, and FIRE_PUNCH text handoff boundaries", () => {
    expect(faintAttackResolutionState(332)).toMatchObject({
      attacker: "MURKROW",
      target: "MAGBY",
      currentMove: "FAINT_ATTACK",
      message: "FAINT_ATTACK",
    });
    expect(faintAttackResolutionState(333)).toMatchObject({
      attacker: "MURKROW",
      target: "MURKROW",
      currentMove: "FAINT_ATTACK",
    });
    expect(faintAttackResolutionState(334)).toMatchObject({
      attacker: "MURKROW",
      target: "MURKROW",
      currentMove: null,
    });
    expect(faintAttackResolutionState(335)).toMatchObject({
      attacker: "MAGBY",
      target: "MURKROW",
      currentMove: "FIRE_PUNCH",
      message: "FAINT_ATTACK",
    });
    expect(faintAttackResolutionState(341).message).toBe("FAINT_ATTACK");
    expect(faintAttackResolutionState(342).message).toBe("FIRE_PUNCH");
  });

  it("pins turn 17's state/RNG handoffs through its derived animation-ownership boundary", () => {
    const hp = { startHp: 79, endHp: 27 };
    expect(faintAttackResolutionState(318, hp).rngCallsConsumed).toBe(0);
    expect(faintAttackResolutionState(319, hp).rngCallsConsumed).toBe(1);
    expect(faintAttackResolutionState(325, hp).target).toBe("MAGBY");
    expect(faintAttackResolutionState(326, hp).target).toBe("MURKROW");
    expect(faintAttackResolutionState(327, hp).currentMove).toBeNull();
    expect(faintAttackResolutionState(328, hp)).toMatchObject({
      attacker: "MAGBY",
      currentMove: "FIRE_PUNCH",
    });
    expect(faintAttackResolutionState(332, hp).rngCallsConsumed).toBe(1);
    expect(faintAttackResolutionState(333, hp).rngCallsConsumed).toBe(2);
    expect(faintAttackResolutionState(334, hp).message).toBe("FAINT_ATTACK");
    expect(faintAttackResolutionState(335, hp).message).toBe("FIRE_PUNCH");
    expect(faintAttackResolutionState(356, hp)).toMatchObject({
      firePunchPpReduced: false,
      firePunchCriticalRollConsumed: false,
      firePunchDamageRollConsumed: false,
      firePunchMoveAnimationQueued: false,
      firePunchAnimationOwned: false,
      rngCallsConsumed: 2,
    });
    expect(faintAttackResolutionState(357, hp).firePunchPpReduced).toBe(true);
    expect(faintAttackResolutionState(358, hp)).toMatchObject({
      firePunchCriticalRollConsumed: true,
      rngCallsConsumed: 3,
    });
    expect(faintAttackResolutionState(361, hp)).toMatchObject({
      firePunchDamageRollConsumed: true,
      rngCallsConsumed: 4,
    });
    expect(faintAttackResolutionState(362, hp).firePunchMoveAnimationQueued).toBe(true);
    expect(faintAttackResolutionState(363, hp).firePunchAnimationOwned).toBe(false);
    expect(faintAttackResolutionState(364, hp).firePunchAnimationOwned).toBe(true);
  });

  it("pins turn 17's four post-hit RNG transitions through FIRE_PUNCH damage", () => {
    const afterSecondary = advanceRngValue(1115590820);
    const afterAccuracy = advanceRngValue(afterSecondary);
    const afterCritical = advanceRngValue(afterAccuracy);
    const afterDamage = advanceRngValue(afterCritical);
    expect([afterSecondary, afterAccuracy, afterCritical, afterDamage]).toEqual([
      1657663047,
      573732526,
      3896110217,
      1102173384,
    ]);
  });
});
