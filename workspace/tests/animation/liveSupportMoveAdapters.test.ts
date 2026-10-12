import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  renderBattleResolutionLiveView,
  renderSceneOnMovePresentation,
} from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { mgbaDarkenColor } from "../../src/engine/gbaPpu.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

const field = {
  player: {
    species: 93, speciesSymbol: "HAUNTER", name: "HAUNTER", level: 50,
    hp: 117, maxHP: 117, gender: "male", status: "none",
    spriteCorner: { x: 40, y: 56 },
  },
  opponent: {
    species: 278, speciesSymbol: "GROVYLE", name: "GROVYLE", level: 50,
    hp: 106, maxHP: 106, gender: "male", status: "none",
    spriteCorner: { x: 144, y: 12 },
  },
} as unknown as BattleResolutionDisplayedField;

const cases = [
  { id: 43, move: "LEER", duration: 70, effectAge: 21 },
  { id: 50, move: "DISABLE", duration: 113, effectAge: 42 },
  { id: 74, move: "GROWTH", duration: 63, effectAge: 40 },
  { id: 105, move: "RECOVER", duration: 169, effectAge: 126 },
  { id: 114, move: "HAZE", duration: 202, effectAge: 70 },
  { id: 151, move: "ACID_ARMOR", duration: 119, effectAge: 48 },
  { id: 156, move: "REST", duration: 110, effectAge: 42 },
  { id: 178, move: "COTTON_SPORE", duration: 204, effectAge: 90 },
  { id: 186, move: "SWEET_KISS", duration: 159, effectAge: 85 },
  { id: 204, move: "CHARM", duration: 93, effectAge: 42 },
  { id: 213, move: "ATTRACT", duration: 435, effectAge: 150 },
  { id: 227, move: "ENCORE", duration: 215, effectAge: 85 },
  { id: 281, move: "YAWN", duration: 213, effectAge: 152 },
  { id: 287, move: "REFRESH", duration: 209, effectAge: 12 },
  { id: 319, move: "METAL_SOUND", duration: 86, opponentDuration: 85, effectAge: 35 },
  { id: 321, move: "TICKLE", duration: 205, effectAge: 7 },
] as const;

function request(moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest {
  return {
    moveId, attacker, target: attacker === 0 ? 1 : 0,
    turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
  };
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

function renderRouteFramebuffer(
  moveId: number,
  attacker: 0 | 1,
  age: number,
): Uint8Array {
  const framebuffer = new Uint8Array(240 * 160 * 4);
  const view = {
    field,
    fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: {
        name: "HAUNTER", level: 50, gender: "male", status: "none",
        hpFraction: 1, currentHp: 117, maxHp: 117,
      },
      opponent: {
        name: "GROVYLE", level: 50, gender: "male", status: "none",
        hpFraction: 1, currentHp: 106, maxHp: 106,
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
  return framebuffer;
}

function renderRoute(moveId: number, attacker: 0 | 1, age: number): string {
  return hash(renderRouteFramebuffer(moveId, attacker, age));
}

describe("live support move adapters", () => {
  it("registers each complete support body without fixture species", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    for (const row of cases) {
      for (const attacker of [0, 1] as const) {
        const receipt = request(row.id, attacker);
        expect(liveMoveAnimationDuration(receipt), row.move).toBe(
          attacker === 1 ? ("opponentDuration" in row ? row.opponentDuration : row.duration) : row.duration,
        );
        expect(liveMoveAnimationPresentation(receipt, field, 0)?.config).toMatchObject({
          move: row.move,
          attacker: { species: attacker === 0 ? "HAUNTER" : "GROVYLE" },
          target: { species: attacker === 0 ? "GROVYLE" : "HAUNTER" },
        });
      }
    }
  });

  it("takes Yawn's current picture heights and effect coordinates from field art", () => {
    const player = liveMoveAnimationPresentation(request(281, 0), field, 0)?.config;
    const opponent = liveMoveAnimationPresentation(request(281, 1), field, 0)?.config;
    expect(player).toMatchObject({
      move: "YAWN",
      battlerInput: {
        attackerPictureHeight: 48, targetPictureHeight: 56,
        attackerEffectCenter: { x: 72, y: 96 },
        targetEffectCenter: { x: 176, y: 44 },
      },
    });
    expect(opponent).toMatchObject({
      move: "YAWN",
      battlerInput: {
        attackerPictureHeight: 56, targetPictureHeight: 48,
        attackerEffectCenter: { x: 176, y: 44 },
        targetEffectCenter: { x: 72, y: 96 },
      },
    });
  });

  it("does not fabricate Rest's sleep or HP outcome in the live request", () => {
    const config = liveMoveAnimationPresentation(request(156, 0), field, 0)?.config;
    expect(config).toMatchObject({ move: "REST" });
    const fieldProfile = (config as { fieldProfile?: Record<string, unknown> } | undefined)
      ?.fieldProfile;
    expect(fieldProfile).not.toHaveProperty("pendingHeal");
    expect(fieldProfile).not.toHaveProperty("playerStatus");
  });

  it("keeps Tickle's script picture point separate from its affine target pivot", () => {
    for (const attacker of [0, 1] as const) {
      const config = liveMoveAnimationPresentation(request(321, attacker), field, 0)?.config;
      if (!config || config.move !== "TICKLE") throw new Error("missing live Tickle config");
      const attackerSide = config.attacker.geometry.side;
      expect(config.attacker.geometry.animationCenter).toEqual({
        x: config.attacker.geometry.spriteCorner.x + 32,
        // AnimEyeSparkle receives the effect-picture point and Move_TICKLE's
        // own createsprite argument shifts it up eight pixels.
        y: Math.min(
          104,
          config.attacker.geometry.spriteCorner.y + 32
            + (attackerSide === "player" ? 8 : 0),
        ) - 8,
      });
      expect(config.target.geometry.animationCenter).toEqual({
        x: config.target.geometry.spriteCorner.x + 32,
        // RockMonBackAndForth rotates the target OBJ around its unraised
        // center, including when the target is the player-side back sprite.
        y: config.target.geometry.spriteCorner.y + 32,
      });
    }
  });

  it("retains move-local player picture corrections for Disable and Rest", () => {
    for (const { moveId, move, playerCorrection } of [
      { moveId: 50, move: "DISABLE", playerCorrection: 8 },
      { moveId: 156, move: "REST", playerCorrection: 16 },
    ] as const) {
      for (const attacker of [0, 1] as const) {
        const config = liveMoveAnimationPresentation(request(moveId, attacker), field, 0)?.config;
        if (!config || config.move !== move) throw new Error(`missing live ${move} config`);
        const geometry = config.attacker.geometry;
        expect(geometry.animationCenter).toEqual({
          x: geometry.spriteCorner.x + 32,
          y: Math.min(
            104,
            geometry.spriteCorner.y + 32 + (geometry.side === "player" ? 8 : 0),
          ) - (geometry.side === "player" ? playerCorrection : 0),
        });
      }
    }
  });

  it("retains Encore's OBJ-targeted fade after the live healthbox seam", () => {
    const before = renderRouteFramebuffer(227, 0, 0);
    const faded = renderRouteFramebuffer(227, 0, 1);
    // (17, 16) is opaque opponent-healthbox frame content, above Encore's
    // WIN1 region. Hardware BLDY=1 targets OBJ, including this live-owned
    // healthbox after the move body completes its field compositor.
    const offset = (16 * 240 + 17) * 4;
    const packed = mgbaDarkenColor(
      before[offset]! | (before[offset + 1]! << 8) | (before[offset + 2]! << 16),
      1,
    );
    expect(Array.from(faded.slice(offset, offset + 3))).toEqual([
      packed & 0xff,
      (packed >>> 8) & 0xff,
      (packed >>> 16) & 0xff,
    ]);
  });

  it.each(cases)("renders $move from current art in both orientations", (row) => {
    for (const attacker of [0, 1] as const) {
      const body = [
        renderBody(row.id, attacker, 0),
        renderBody(row.id, attacker, row.effectAge),
        renderBody(
          row.id,
          attacker,
          (attacker === 1 ? ("opponentDuration" in row ? row.opponentDuration : row.duration) : row.duration) - 1,
        ),
      ];
      expect(new Set(body).size, `${row.move} attacker ${attacker}`).toBeGreaterThan(1);
      expect(renderRoute(row.id, attacker, row.effectAge)).not.toBe(body[1]);
    }
  });

  it("replays a real Factory Acid Armor command twice through cleanup", () => {
    // Seed 0 generates FRONTIER_MON_GRIMER (set 110) in the first rental
    // slot; fight-menu slot 2 is its legal Acid Armor. This is ordinary
    // command input, not a staged move request.
    const on = generatedCommandAnimationReplay(0, "on", [2, 2]);
    const off = generatedCommandAnimationReplay(0, "off", [2, 2]);
    const bodies = on.animations.filter((body) => body.moveId === 151);
    expect(bodies).toHaveLength(2);
    expect(bodies.every((body) => body.attacker === 0
      && body.player === "GRIMER" && body.opponent === "VIBRAVA"))
      .toBe(true);
    expect(bodies.map((body) => body.ages)).toEqual([
      iu120Ages(151, 119),
      iu120Ages(151, 119),
    ]);
    expect(on.requests.filter((entry) => entry.moveId === 151)
      .map((entry) => entry.target)).toEqual([0, 0]);
    expect(on.boundaries).toHaveLength(3);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    for (let index = 0; index < on.boundaries.length; index += 1) {
      const left = on.boundaries[index]!, right = off.boundaries[index]!;
      expect(left.rng).toEqual(right.rng);
      const { hitMarker: _leftMarker, ...leftRules } = left.rules.rulesContext;
      const { hitMarker: _rightMarker, ...rightRules } = right.rules.rulesContext;
      expect(leftRules).toEqual(rightRules);
    }
  }, 60000);
});
