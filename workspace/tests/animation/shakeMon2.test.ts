import { describe, expect, it } from "vitest";
import { shakeMon2OffsetAtTick, shakeMon2Sequence } from "../../src/animation/shakeMon2.ts";

describe("AnimTask_ShakeMon2 1:1 port", () => {
  it("alternates +/-offset every frameDelay+1 ticks, never touching zero mid-sequence", () => {
    // AnimTask_ShakeMon2(ANIM_TARGET,2,0,3,1): xOffset=2, numTimes=3, frameDelay=1.
    const sequence = shakeMon2Sequence(2, 0, 3, 1).map((offset) => offset.x2);
    // tick0: creation write (x2=xOffset), held through the creation-time
    // synchronous Step call (frameDelay=1 != 0, so that call only decrements
    // the delay counter, per `AnimTask_ShakeMon2_Step`'s `else` branch).
    // Toggle events (delayCounter hits 0) land at ticks 1, 3, 5 - the 3rd
    // (numTimes) toggle forces zero and self-destroys instead of continuing
    // the alternation.
    expect(sequence).toEqual([2, -2, -2, 2, 2, 0]);
  });

  it("holds each polarity for frameDelay ticks before toggling", () => {
    // frameDelay=2: creation hold (tick0) + 2-tick hold instead of 1.
    const sequence = shakeMon2Sequence(5, 0, 2, 2).map((offset) => offset.x2);
    // tick0=5 (creation), tick1 decrements the counter (still 5), tick2
    // toggles to -5 (1st toggle, numTimes=2 not yet reached), ticks3-4 hold
    // -5, tick5 is the 2nd toggle - forces zero, self-destroys.
    expect(sequence).toEqual([5, 5, -5, -5, -5, 0]);
  });

  it("never lands back on zero except the final forced self-destroy tick", () => {
    const sequence = shakeMon2Sequence(4, 0, 6, 1).map((offset) => offset.x2);
    expect(sequence.slice(0, -1).every((x2) => x2 !== 0)).toBe(true);
    expect(sequence.at(-1)).toBe(0);
  });

  it("shakeMon2OffsetAtTick is zero before creation and after self-destroy", () => {
    expect(shakeMon2OffsetAtTick(2, 0, 3, 1, -1)).toEqual({ x2: 0, y2: 0 });
    // Sequence for (2,0,3,1) is 6 ticks long (indices 0-5, self-destroy at 5).
    expect(shakeMon2OffsetAtTick(2, 0, 3, 1, 6)).toEqual({ x2: 0, y2: 0 });
    expect(shakeMon2OffsetAtTick(2, 0, 3, 1, 99)).toEqual({ x2: 0, y2: 0 });
  });

  it(
    "reproduces DRAGON_BREATH's dense-oracle-pinned shake table through the +1 creation-anchor idiom",
    () => {
      // Move_DRAGON_BREATH (battle_anim_scripts.s:4943):
      // `createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 21, 1`
      // -> xOffset=2, yOffset=0, numTimes=21, frameDelay=1. Same "+1,
      // guard age<creationAge" idiom fly.ts's FLY_SHAKE_CREATION_AGE uses
      // (tests/shakeMon.test.ts): the port's own tick 0 (creation write,
      // x2=xOffset) is never independently displayed at this call site
      // either (RAM-probed directly for the pre-existing hand-fit this
      // step replaces - battleScene.ts's now-untouched, canonical-only
      // `dragonBreathShakeX2`/`DRAGONBREATH_SHAKE_RENDER_LAG` comment:
      // "by the FIRST RAM tick this task's callback is observed, x2
      // ALREADY reads the FIRST FLIP's result"). Creation age anchors on
      // the committed `DRAGON_BREATH_SHAKE_FIRST_AGE` (13) constant itself,
      // not a fresh literal.
      const creationAge = 13;
      const ages = [12, 13, 14, 15, 16, 51, 52, 53];
      const x2AtAges = ages.map(
        (age) => age < creationAge
          ? 0
          : shakeMon2OffsetAtTick(2, 0, 21, 1, age - creationAge + 1).x2,
      );
      expect(x2AtAges).toEqual([0, -2, -2, 2, 2, 2, 2, 0]);
    },
  );

  it(
    "reproduces BLAZE_KICK's dense-oracle-pinned shake table through the same +1 creation-anchor idiom",
    () => {
      // Move_BLAZE_KICK (battle_anim_scripts.s:8498):
      // `createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 3, 0, 14, 1`
      // -> xOffset=3, yOffset=0, numTimes=14, frameDelay=1. Creation
      // coincides (same script-processing tick, zero delay between them)
      // with `call FireSpreadEffect`'s own first tick, so the creation age
      // anchors on the committed `BLAZE_KICK_FIRE_SPREAD_FIRST_AGE` (35)
      // constant directly - both mechanisms start from the same instant.
      const creationAge = 35;
      const ages = [34, 35, 37, 60, 61, 77];
      const x2AtAges = ages.map(
        (age) => age < creationAge
          ? 0
          : shakeMon2OffsetAtTick(3, 0, 14, 1, age - creationAge + 1).x2,
      );
      expect(x2AtAges).toEqual([0, -3, 3, -3, 0, 0]);
    },
  );
});
