import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  renderBattleResolutionLiveView,
  renderSceneOnMovePresentation,
} from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";

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

function request(
  moveId: number, attacker: 0 | 1, turn = 0,
): BattleMoveAnimationRequest {
  return {
    moveId, attacker, target: attacker === 0 ? 1 : 0,
    turn, power: moveId === 264 ? 150 : 0,
    damage: moveId === 264 ? 42 : 0, friendship: 70, multihit: 0,
  };
}

function renderHash(
  moveId: number, attacker: 0 | 1, age: number, turn = 0,
): string {
  const state = liveMoveAnimationPresentation(request(moveId, attacker, turn), field, age);
  expect(state).not.toBeNull();
  const framebuffer = new Uint8Array(240 * 160 * 4);
  renderSceneOnMovePresentation(framebuffer, state!, true);
  return createHash("sha256").update(framebuffer).digest("hex");
}

function routeHash(
  moveId: number, attacker: 0 | 1, age: number, turn = 0,
): string {
  const framebuffer = new Uint8Array(240 * 160 * 4);
  const view = {
    field,
    fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: {
        name: "HAUNTER", level: 50, gender: "male", hpFraction: 1,
        status: "none", currentHp: 117, maxHp: 117,
      },
      opponent: {
        name: "GROVYLE", level: 50, gender: "male", hpFraction: 1,
        status: "none",
      },
    },
    message: { lines: [attacker === 0 ? "HAUNTER used" : "Foe GROVYLE used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: request(moveId, attacker, turn), age },
    bottom: "message",
  } as unknown as BattleResolutionPresentationRenderView;
  renderBattleResolutionLiveView(framebuffer, view);
  return createHash("sha256").update(framebuffer).digest("hex");
}

describe("live BASIC move adapters", () => {
  it("routes Focus Punch and Screech with complete side-specific cleanup bodies", () => {
    // fp100: Focus Punch is faithful timing (the age-131 restore lag, lag phase on both sides: 155 rows each).
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining([103]));
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(264);
    expect(liveMoveAnimationDuration(request(264, 0))).toBe(155);
    expect(liveMoveAnimationDuration(request(264, 1))).toBe(155);
    expect(liveMoveAnimationDuration(request(103, 0))).toBe(63);
    expect(liveMoveAnimationDuration(request(103, 1))).toBe(63);

    expect(liveMoveAnimationPresentation(request(264, 0), field, 154)?.config)
      .toMatchObject({ move: "FOCUS_PUNCH", attacker: { species: "HAUNTER" }, target: { species: "GROVYLE" } });
    expect(liveMoveAnimationPresentation(request(103, 1), field, 62)?.config)
      .toMatchObject({ move: "SCREECH", attacker: { species: "GROVYLE" }, target: { species: "HAUNTER" } });
  });

  it("routes the low-derived siblings and preserves Brick Break's controller branch", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining([
      14, 44, 97, 246, 280, 347,
    ]));
    expect([
      liveMoveAnimationDuration(request(14, 0)),
      liveMoveAnimationDuration(request(44, 0)),
      liveMoveAnimationDuration(request(97, 0)),
      liveMoveAnimationDuration(request(246, 0)),
      liveMoveAnimationDuration(request(347, 0)),
    ]).toEqual([70, 26, 87, 128, 101]);
    expect(liveMoveAnimationDuration(request(280, 0, 0))).toBe(151);
    expect(liveMoveAnimationDuration(request(280, 0, 1))).toBe(192);
    expect(liveMoveAnimationPresentation(request(280, 0, 0), field, 0)?.config)
      .toMatchObject({ move: "BRICK_BREAK", body: "normal" });
    expect(liveMoveAnimationPresentation(request(280, 1, 1), field, 0)?.config)
      .toMatchObject({ move: "BRICK_BREAK", body: "shattered-wall" });
  });

  it.each([
    [264, 0, 64], [264, 1, 64], [103, 0, 12], [103, 1, 12],
  ] as const)("renders arbitrary current species for move %i attacker %i", (moveId, attacker, effectAge) => {
    const first = renderHash(moveId, attacker, 0);
    const effect = renderHash(moveId, attacker, effectAge);
    const cleanup = renderHash(moveId, attacker, liveMoveAnimationDuration(request(moveId, attacker))! - 1);
    expect(new Set([first, effect, cleanup]).size).toBeGreaterThan(1);
  });

  it.each([
    [14, 0, 32, 0], [14, 1, 32, 0],
    [44, 0, 12, 0], [44, 1, 12, 0],
    [97, 0, 24, 0], [97, 1, 24, 0],
    [246, 0, 78, 0], [246, 1, 78, 0],
    [280, 0, 127, 1], [280, 1, 127, 1],
    [347, 0, 36, 0], [347, 1, 36, 0],
  ] as const)(
    "renders sibling move %i attacker %i from current field art",
    (moveId, attacker, effectAge, turn) => {
      const duration = liveMoveAnimationDuration(request(moveId, attacker, turn))!;
      const first = renderHash(moveId, attacker, 0, turn);
      const effect = renderHash(moveId, attacker, effectAge, turn);
      const cleanup = renderHash(moveId, attacker, duration - 1, turn);
      expect(new Set([first, effect, cleanup]).size).toBeGreaterThan(1);
    },
  );

  it.each([
    [103, 0, 12, 0], [103, 1, 12, 0],
    [264, 0, 64, 0], [264, 1, 64, 0],
    [14, 0, 32, 0], [14, 1, 32, 0],
    [44, 0, 12, 0], [44, 1, 12, 0],
    [97, 0, 24, 0], [97, 1, 24, 0],
    [246, 0, 78, 0], [246, 1, 78, 0],
    [280, 0, 127, 1], [280, 1, 127, 1],
    [347, 0, 36, 0], [347, 1, 36, 0],
  ] as const)(
    "composes move %i attacker %i through the live resolution route",
    (moveId, attacker, age, turn) => {
      expect(routeHash(moveId, attacker, age, turn))
        .not.toBe(renderHash(moveId, attacker, age, turn));
    },
  );
});
