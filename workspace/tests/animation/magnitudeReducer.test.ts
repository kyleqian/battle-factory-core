import { describe, expect, it } from "vitest";
import {
  magnitudeAtAge,
  magnitudeAudioAtAge,
  type MagnitudeLiveInputs,
} from "../../src/animation/magnitude.ts";

const order = Array.from({ length: 64 }, (_, index) => index);
const inputs = (movePower: number): MagnitudeLiveInputs => ({
  movePower,
  attackerSide: "player",
  targetSide: "opponent",
  initialPlatformX: 0,
  initialBattlerX2: { player: 0, opponent: 1 },
  battlerSpriteSlots: { player: 6, opponent: 8 },
  spriteOrder: order,
});

describe("MOVE_MAGNITUDE source-relative reducer and typed seam", () => {
  it("selects the live power branch and reproduces both shake lifetimes", () => {
    expect(magnitudeAtAge(0, inputs(70))).toMatchObject({
      branch: "regular", active: true, visualTaskCount: 0,
      source: { owner: "Move_MAGNITUDE", offset: 0, active: true },
      playerBattlerX2: 0, opponentBattlerX2: 1,
    });
    expect(magnitudeAtAge(1, inputs(70))).toMatchObject({
      source: { offset: 24, wait: 1 },
      shake: { active: true, delay: 1, timer: 0, horizontalOffset: 10 },
      soundTaskCount: 1,
    });
    expect(magnitudeAtAge(2, inputs(70))).toMatchObject({
      shake: { platformX: 10, battlerX2: 5 },
      playerBattlerX2: 5, opponentBattlerX2: 5,
    });
    expect(magnitudeAtAge(172, inputs(70)).shake).toMatchObject({ active: true, taskState: 2 });
    expect(magnitudeAtAge(173, inputs(70))).toMatchObject({ active: true, visualTaskCount: 0 });
    expect(magnitudeAtAge(174, inputs(70)).cleanup.firstInactive).toBe(true);

    expect(magnitudeAtAge(1, inputs(110))).toMatchObject({
      branch: "intense", source: { offset: 96, wait: 10 },
      shake: { horizontalOffset: 14 },
    });
    expect(magnitudeAtAge(204, inputs(110)).shake).toMatchObject({ active: true, taskState: 2 });
    expect(magnitudeAtAge(205, inputs(110))).toMatchObject({ active: true, visualTaskCount: 0 });
    expect(magnitudeAtAge(206, inputs(110)).cleanup.firstInactive).toBe(true);
  });

  it("pins the intense-only complex palette pulses and script cursor", () => {
    expect([12, 13, 20, 21, 30, 31, 38, 39].map((age) => magnitudeAtAge(age, inputs(110)).palette.active))
      .toEqual([false, true, true, false, false, true, true, false]);
    expect(magnitudeAtAge(13, inputs(110))).toMatchObject({
      source: { offset: 119, wait: 16 },
      palette: { active: true, timer: 2, remainingBlends: 1, color: "black", coefficient: 14 },
      visualTaskCount: 3,
    });
    expect(magnitudeAtAge(16, inputs(110)).palette).toMatchObject({ color: "white", remainingBlends: 0 });
    expect(magnitudeAtAge(31, inputs(110))).toMatchObject({ source: { offset: 24, wait: 1 } });
    expect(magnitudeAtAge(13, inputs(70)).palette.active).toBe(false);
  });

  it("reproduces the target-panned ten-play strength loop", () => {
    expect(magnitudeAudioAtAge(1, "opponent")).toMatchObject({ active: true, panning: 63, playsRemaining: 9, frameCounter: 1, playedThisAge: true });
    expect(magnitudeAudioAtAge(9, "player")).toMatchObject({ active: true, panning: -63, playsRemaining: 8, frameCounter: 0, playedThisAge: true });
    expect(magnitudeAudioAtAge(80, "player")).toMatchObject({ active: true, playsRemaining: 1, frameCounter: 8 });
    expect(magnitudeAudioAtAge(81, "player")).toMatchObject({ active: false, playsRemaining: 0, playedThisAge: true });
  });

  it("keeps power, sides, species, geometry, allocator, and order live at the seam", () => {
    const relocated = order.filter((slot) => slot !== 18 && slot !== 3);
    const view = magnitudeAtAge(2, {
      ...inputs(150),
      battlerSpriteSlots: { player: 18, opponent: 3 },
      spriteOrder: [18, ...relocated, 3],
    });
    expect(view).toMatchObject({ branch: "intense", allocator: { playerSpriteSlot: 18, opponentSpriteSlot: 3, painterOrder: [3, 18] } });
    expect(view.shake.horizontalOffset).toBe(18);
  });

  it("rejects side disagreement and invalid allocation/order", () => {
    expect(() => magnitudeAtAge(0, { ...inputs(70), battlerSpriteSlots: { player: 6, opponent: 6 } })).toThrow(/allocator/);
  });
});
