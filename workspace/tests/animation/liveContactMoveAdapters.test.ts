import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import {
  renderBattleResolutionLiveView,
  renderSceneOnMovePresentation,
} from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
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

const cases = [
  { id: 2, move: "KARATE_CHOP", duration: 49, effectAge: 25 },
  { id: 23, move: "STOMP", duration: 67, effectAge: 35 },
  { id: 41, move: "TWINEEDLE", duration: 37, effectAge: 10 },
  { id: 131, move: "SPIKE_CANNON", duration: 84, effectAge: 35 },
  { id: 154, move: "FURY_SWIPES", duration: 48, effectAge: 12 },
  { id: 158, move: "HYPER_FANG", duration: 107, effectAge: 40 },
  { id: 163, move: "SLASH", duration: 46, effectAge: 15 },
  { id: 242, move: "CRUNCH", duration: 142, effectAge: 65 },
  { id: 305, move: "POISON_FANG", duration: 104, effectAge: 20 },
  { id: 306, move: "CRUSH_CLAW", duration: 69, effectAge: 35 },
  { id: 337, move: "DRAGON_CLAW", duration: 137, effectAge: 55 },
] as const;

function request(moveId: number, attacker: 0 | 1, multihit = 0) {
  return battleMoveAnimationRequest(attacker, attacker === 0 ? 1 : 0, [
    String(moveId), "0", "80", "-24", "70", String(multihit),
  ]);
}

function hash(framebuffer: Uint8Array): string {
  return createHash("sha256").update(framebuffer).digest("hex");
}

function renderBody(moveId: number, attacker: 0 | 1, age: number): string {
  const state = liveMoveAnimationPresentation(request(moveId, attacker), field, age);
  expect(state).not.toBeNull();
  const framebuffer = new Uint8Array(240 * 160 * 4);
  renderSceneOnMovePresentation(framebuffer, state!, true);
  return hash(framebuffer);
}

function renderRoute(moveId: number, attacker: 0 | 1, age: number): string {
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
    message: {
      lines: [attacker === 0 ? "HAUNTER used" : "Foe GROVYLE used", "A MOVE!"],
      visibleCharacters: 99,
    },
    effect: { type: "move", request: request(moveId, attacker), age },
    bottom: "message",
  } as unknown as BattleResolutionPresentationRenderView;
  renderBattleResolutionLiveView(framebuffer, view);
  return hash(framebuffer);
}

describe("live contact and multi-hit move adapters", () => {
  it("registers each accepted Factory body through source-relative cleanup", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    for (const row of cases) {
      for (const attacker of [0, 1] as const) {
        const receipt = request(row.id, attacker, row.id === 154 ? 5 : 0);
        expect(liveMoveAnimationDuration(receipt), row.move).toBe(row.duration);
        expect(liveMoveAnimationPresentation(receipt, field, 0)?.config).toMatchObject({
          move: row.move,
          attacker: { species: attacker === 0 ? "HAUNTER" : "GROVYLE" },
          target: { species: attacker === 0 ? "GROVYLE" : "HAUNTER" },
        });
      }
    }
  });

  it.each(cases)("renders $move with current species in both orientations", (row) => {
    for (const attacker of [0, 1] as const) {
      const body = [
        renderBody(row.id, attacker, 0),
        renderBody(row.id, attacker, row.effectAge),
        renderBody(row.id, attacker, row.duration - 1),
      ];
      expect(new Set(body).size, `${row.move} attacker ${attacker}`).toBeGreaterThan(1);
      expect(renderRoute(row.id, attacker, row.effectAge)).not.toBe(body[1]);
    }
  });

  it("keeps repeated multi-hit controller receipts immutable and deterministic", () => {
    for (const moveId of [41, 131, 154] as const) {
      const receipt = request(moveId, 0, 5);
      expect(receipt).toMatchObject({ attacker: 0, target: 1, multihit: 5 });
      const duration = liveMoveAnimationDuration(receipt)!;
      const ages = [0, Math.floor(duration / 2), duration - 1];
      const first = ages.map(age => renderBody(moveId, 0, age));
      const repeated = ages.map(age => renderBody(moveId, 0, age));
      expect(repeated).toEqual(first);
      expect(new Set(first).size).toBeGreaterThan(1);
    }
  });
});
