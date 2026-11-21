import { describe, expect, it } from "vitest";
import { frontierTransitionRenderKind, selectFrontierTransition } from "../src/engine/battleTransition.ts";
import {
  BATTLE_2_SCENE_HANDOFF_ELAPSED,
  LOGO_WAVE_TRANSITION_START_TE,
  brainBattleIntroHandoffTe,
  brainBattleTransitionTe,
} from "../src/engine/battleRoom.ts";
import type { BattleRoomState } from "../src/engine/battleRoom.ts";
import { WIGGLE_INIT_TE, applyLogoWiggle, logoWiggleIntroHandoffTe, wiggleEndTe, wiggleState } from "../src/engine/battleTransitionLogoWiggle.ts";

// ROM-measured (trn226, tools/audio/romFrontierTransition.py seeds 25/45/8 for id 29 and 13/26/41/54/9 for id 30, both scenes, 0 bad frames
// against the whole recording through the battle intro); the pins below are the state machine those frames follow.

function brainState(tableIndex: number): BattleRoomState {
  return { transitionPresentation: selectFrontierTransition(tableIndex).presentation, elapsed: 0 } as unknown as BattleRoomState;
}

describe("LOGO_WAVE (id 30) on the Noland brain path", () => {
  it("starts its clock at te 32 and hands over at te 209", () => {
    const state = brainState(9);
    expect(frontierTransitionRenderKind(state.transitionPresentation, "circlesMeet")).toBe("logoWave");
    expect(LOGO_WAVE_TRANSITION_START_TE).toBe(32);
    expect(brainBattleIntroHandoffTe(state)).toBe(209);
    expect(BATTLE_2_SCENE_HANDOFF_ELAPSED).toBe(209);
    expect(brainBattleTransitionTe(brainState(2)) - brainBattleTransitionTe(state)).toBe(26 - 32);
  });
});

describe("LOGO_WIGGLE (id 29)", () => {
  it("is its own render kind on both table slots that draw it", () => {
    for (const index of [0, 7]) {
      expect(selectFrontierTransition(index).presentation.transitionId).toBe(29);
      expect(frontierTransitionRenderKind(selectFrontierTransition(index).presentation, "circlesMeet")).toBe("logoWiggle");
    }
  });

  it("fades BG0 in (eva up every third callback), then the room out, with the sine wave shrinking 256 per callback", () => {
    expect(WIGGLE_INIT_TE).toBe(77);
    const at = (c: number) => wiggleState(c);
    expect([at(0).eva, at(0).evb]).toEqual([1, 16]);
    expect([at(2).eva, at(3).eva, at(4).eva]).toEqual([2, 2, 3]);
    expect([at(30).eva, at(30).evb]).toEqual([16, 16]);
    expect([at(32).evb, at(34).evb, at(40).evb, at(48).evb]).toEqual([15, 14, 11, 7]);
    expect([at(62).eva, at(62).evb]).toEqual([16, 0]);
    expect(Array.from(at(0).hofs.slice(0, 4))).toEqual([240, 12, -19, 23]);
    expect(Array.from(at(32).hofs.slice(0, 4))).toEqual([-4, 5, -9, 11]);
    expect(Array.from(at(63).hofs.slice(0, 3))).toEqual([-1, 0, 0]);
    expect(at(62).window).toBeNull();
  });

  it("closes with the circular window and ends on te 184, handing over at 187", () => {
    expect(wiggleState(63).window).toBeNull();
    const first = wiggleState(64);
    expect(first.window).not.toBeNull();
    expect(first.windowLine0).toBe(240);
    expect(first.window![80]).toBe(0x00f0);
    expect(wiggleState(105).ended).toBe(false);
    expect(wiggleState(106).ended).toBe(true);
    expect(wiggleEndTe()).toBe(184);
    expect(logoWiggleIntroHandoffTe()).toBe(187);
    expect(brainBattleIntroHandoffTe(brainState(0))).toBe(187);
  });

  it("blends the logo over the room, and masks to black", () => {
    const room = new Uint8Array(240 * 160 * 4).fill(200);
    const early = room.slice();
    applyLogoWiggle(early, WIGGLE_INIT_TE + 1);
    let changed = 0;
    for (let i = 0; i < early.length; i += 4) if (early[i] !== 200 || early[i + 1] !== 200 || early[i + 2] !== 200) changed += 1;
    expect(changed).toBeGreaterThan(0);
    const again = room.slice();
    applyLogoWiggle(again, WIGGLE_INIT_TE + 1);
    expect(again).toEqual(early);

    const masked = room.slice();
    applyLogoWiggle(masked, WIGGLE_INIT_TE + 1 + 80);
    expect(Array.from(masked.slice(0, 3))).toEqual([0, 0, 0]);
    const center = (80 * 240 + 120) * 4;
    expect(masked[center]).not.toBe(0);
    const closed = room.slice();
    applyLogoWiggle(closed, wiggleEndTe());
    expect(closed.every((v, i) => i % 4 === 3 || v === 0)).toBe(true);
  });
});
