import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";

const field = {
  player: {
    species: 93, speciesSymbol: "HAUNTER", name: "HAUNTER", level: 50,
    hp: 117, maxHP: 117, gender: "male", status: "none",
    spriteCorner: { x: 40, y: 56 },
  },
  opponent: {
    species: 278, speciesSymbol: "GROVYLE", name: "GROVYLE", level: 50,
    hp: 106, maxHP: 106, gender: "male", status: "none",
    spriteCorner: { x: 144, y: 16 },
  },
} as unknown as BattleResolutionDisplayedField;

function request(moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest {
  return {
    moveId, attacker, target: attacker === 0 ? 1 : 0,
    turn: 0, power: moveId === 264 ? 150 : 0,
    damage: moveId === 264 ? 42 : 0, friendship: 70, multihit: 0,
  };
}

function renderHash(moveId: number, attacker: 0 | 1, age: number): string {
  const state = liveMoveAnimationPresentation(request(moveId, attacker), field, age);
  expect(state).not.toBeNull();
  const framebuffer = new Uint8Array(240 * 160 * 3);
  renderSceneOnMovePresentation(framebuffer, state!, true);
  return createHash("sha256").update(framebuffer).digest("hex");
}

describe("live BASIC move adapters", () => {
  it("routes Focus Punch and Screech with complete side-specific cleanup bodies", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining([103, 264]));
    expect(liveMoveAnimationDuration(request(264, 0))).toBe(155);
    expect(liveMoveAnimationDuration(request(264, 1))).toBe(154);
    expect(liveMoveAnimationDuration(request(103, 0))).toBe(63);
    expect(liveMoveAnimationDuration(request(103, 1))).toBe(63);

    expect(liveMoveAnimationPresentation(request(264, 0), field, 154)?.config)
      .toMatchObject({ move: "FOCUS_PUNCH", attacker: { species: "HAUNTER" }, target: { species: "GROVYLE" } });
    expect(liveMoveAnimationPresentation(request(103, 1), field, 62)?.config)
      .toMatchObject({ move: "SCREECH", attacker: { species: "GROVYLE" }, target: { species: "HAUNTER" } });
  });

  it.each([
    [264, 0, 64], [264, 1, 64], [103, 0, 12], [103, 1, 12],
  ] as const)("renders arbitrary current species for move %i attacker %i", (moveId, attacker, effectAge) => {
    const first = renderHash(moveId, attacker, 0);
    const effect = renderHash(moveId, attacker, effectAge);
    const cleanup = renderHash(moveId, attacker, liveMoveAnimationDuration(request(moveId, attacker))! - 1);
    expect(new Set([first, effect, cleanup]).size).toBeGreaterThan(1);
  });
});
