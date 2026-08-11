import { describe, expect, it } from "vitest";
import {
  KABUTO_FRONT_ANIM_END_OFFSET,
  KABUTO_FRONT_ANIM_START_OFFSET,
  KABUTO_BALL_BOUNDARIES,
  kabutoBallPhase,
  kabutoHSlideWobble,
} from "../src/engine/kabutoSendOut.ts";
import {
  KABUTO_SENDOUT_BATTLER,
  healthboxSlideDx,
  playerSendOutClock,
  playerSummaryEvaOffset,
  playerTrainerSendOutClock,
  sendOutHandoffTick,
  SUBSEQUENT_BATTLE_PLAYER_VISUAL_DELAY,
  SUBSEQUENT_BATTLE_SUMMARY_EVA_PHASE_AGE,
} from "../src/engine/battleScene.ts";
import {
  BRENDAN_THROW_START_TICK,
  PLAYER_BALL_OPEN_START_TICK,
  PLAYER_HEALTHBOX_SLIDE_START_TICK,
  PLAYER_HEALTHBOX_SLIDE_SETTLE_TICK,
  PLAYER_MATERIALIZE_SETTLE_TICK,
  PLAYER_THROW_BALL_SPIN_START_TICK,
  playerHealthboxSlideDx,
} from "../src/engine/battleMenu.ts";

describe("Battle 2 KABUTO send-out", () => {
  it("pins the encounter battler and healthbox values", () => {
    expect(KABUTO_SENDOUT_BATTLER).toEqual({
      species: 140,
      name: "KABUTO",
      level: 50,
      hp: 91,
      maxHP: 91,
      gender: "male",
    });
  });

  it("anchors the visual handoff to JENSON's shorter press-relative text", () => {
    expect(sendOutHandoffTick(1326, "jenson")).toBe(1365);
    expect(sendOutHandoffTick(1420, "destin")).toBe(1462);
  });

  it("pins the ball, materialize, and hide boundaries relative to handoff", () => {
    expect(KABUTO_BALL_BOUNDARIES.materializeStart).toBe(19);
    expect([1, 2, 17, 18, 22, 23, 28, 29].map(kabutoBallPhase))
      .toEqual(["hidden", "closed", "closed", "open", "open", "final", "final", "hidden"]);
  });

  it("pins KABUTO's one-frame healthbox creation hold before the shared +5 slide", () => {
    const handoff = 1365;
    expect(healthboxSlideDx(handoff + 31, handoff + 32, -110, true)).toBeNull();
    expect(healthboxSlideDx(handoff + 32, handoff + 32, -110, true)).toBe(-110);
    expect(healthboxSlideDx(handoff + 33, handoff + 32, -110, true)).toBe(-110);
    expect(healthboxSlideDx(handoff + 34, handoff + 32, -110, true)).toBe(-105);
    expect(healthboxSlideDx(handoff + 55, handoff + 32, -110, true)).toBe(0);
  });

  it("starts H-slide-wobble at handoff+35 and resets after 101 callbacks", () => {
    expect(kabutoHSlideWobble(KABUTO_FRONT_ANIM_START_OFFSET - 1).active).toBe(false);
    expect(kabutoHSlideWobble(KABUTO_FRONT_ANIM_START_OFFSET)).toMatchObject({
      active: true,
      callback: 0,
      x2: 0,
      rotation: 0,
    });
    expect(kabutoHSlideWobble(KABUTO_FRONT_ANIM_END_OFFSET)).toMatchObject({
      active: true,
      callback: 100,
      x2: 0,
      rotation: 0,
    });
    expect(kabutoHSlideWobble(KABUTO_FRONT_ANIM_END_OFFSET + 1).active).toBe(false);
  });

  it("uses KABUTO's live two-frame cadence while wobbling", () => {
    expect([0, 7, 8, 15, 16, 23, 24, 43, 44, 51].map((n) =>
      kabutoHSlideWobble(KABUTO_FRONT_ANIM_START_OFFSET + n).frame
    )).toEqual([1, 1, 0, 0, 1, 1, 0, 0, 1, 1]);
  });

  it("derives nontrivial horizontal and rotational motion from the source formula", () => {
    expect(kabutoHSlideWobble(KABUTO_FRONT_ANIM_START_OFFSET + 26)).toMatchObject({
      callback: 25,
      x2: 8,
    });
    expect(kabutoHSlideWobble(KABUTO_FRONT_ANIM_START_OFFSET + 13).rotation).not.toBe(0);
  });

  it("reanchors Battle 2's independently queued player text clock from the opponent handoff", () => {
    const handoff = 1365;
    expect(playerSendOutClock(handoff, handoff)).toBe(1462);
    expect(playerSendOutClock(handoff + 153, handoff)).toBe(PLAYER_THROW_BALL_SPIN_START_TICK);
    expect(playerSendOutClock(handoff + 190, handoff)).toBe(PLAYER_BALL_OPEN_START_TICK);
    expect(playerSendOutClock(handoff + 240, handoff)).toBe(PLAYER_MATERIALIZE_SETTLE_TICK);
  });

  it("keeps Battle 2's whole inherited visual callback chain 45 ticks behind the text clock", () => {
    const handoff = 1365;
    expect(SUBSEQUENT_BATTLE_PLAYER_VISUAL_DELAY).toBe(45);
    expect(playerTrainerSendOutClock(handoff + 157, handoff, "jenson")).toBe(1574);
    expect(playerTrainerSendOutClock(handoff + 198, handoff, "jenson")).toBe(PLAYER_THROW_BALL_SPIN_START_TICK);
    expect(playerTrainerSendOutClock(handoff + 235, handoff, "jenson")).toBe(PLAYER_BALL_OPEN_START_TICK);
    expect(playerTrainerSendOutClock(handoff + 285, handoff, "jenson")).toBe(PLAYER_MATERIALIZE_SETTLE_TICK);
    expect(playerTrainerSendOutClock(1574, 1462, "destin")).toBe(1574);
  });

  it("advances only the subsequent-battle summary eva coefficient at callback age 14", () => {
    const boundary = BRENDAN_THROW_START_TICK + SUBSEQUENT_BATTLE_SUMMARY_EVA_PHASE_AGE;
    expect(playerSummaryEvaOffset(boundary - 1, "jenson")).toBe(0);
    expect(playerSummaryEvaOffset(boundary, "jenson")).toBe(-1);
    expect(playerSummaryEvaOffset(boundary + 1, "jenson")).toBe(0);
    expect(playerSummaryEvaOffset(boundary, "destin")).toBe(0);
  });

  it("pins ONIX's full-health slide boundaries", () => {
    expect(playerHealthboxSlideDx(PLAYER_HEALTHBOX_SLIDE_START_TICK - 1)).toBeNull();
    expect(playerHealthboxSlideDx(PLAYER_HEALTHBOX_SLIDE_START_TICK)).toBe(110);
    expect(playerHealthboxSlideDx(PLAYER_HEALTHBOX_SLIDE_SETTLE_TICK)).toBe(0);
  });
});
