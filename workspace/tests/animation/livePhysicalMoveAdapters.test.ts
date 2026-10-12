import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import {
  renderBattleResolutionLiveView,
  renderSceneOnMovePresentation,
} from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";
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
    spriteCorner: { x: 144, y: 16 },
  },
} as unknown as BattleResolutionDisplayedField;

const cases = [
  { id: 5, move: "MEGA_PUNCH", duration: 160, effectAge: 72 },
  { id: 11, move: "VICE_GRIP", duration: 42, effectAge: 22 },
  { id: 21, move: "SLAM", duration: 54, effectAge: 20 },
  { id: 25, move: "MEGA_KICK", duration: 160, effectAge: 72 },
  { id: 27, move: "ROLLING_KICK", duration: 55, effectAge: 34 },
  { id: 67, move: "LOW_KICK", duration: 33, effectAge: 14 },
  { id: 122, move: "LICK", duration: 73, effectAge: 23 },
  { id: 136, move: "HI_JUMP_KICK", duration: 91, effectAge: 48 },
  { id: 211, move: "STEEL_WING", duration: 197, effectAge: 156 },
  { id: 223, move: "DYNAMIC_PUNCH", duration: 75, effectAge: 27 },
  { id: 231, move: "IRON_TAIL", duration: 135, effectAge: 117 },
  { id: 342, move: "POISON_TAIL", duration: 187, effectAge: 122 },
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

describe("live physical move adapters", () => {
  it("registers every selected BASIC body with its full source-owned duration", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(({ id }) => id)));
    for (const row of cases) {
      for (const attacker of [0, 1] as const) {
        expect(liveMoveAnimationDuration(request(row.id, attacker)), row.move)
          .toBe(row.duration);
        expect(liveMoveAnimationPresentation(request(row.id, attacker), field, 0)?.config)
          .toMatchObject({
            move: row.move,
            attacker: { species: attacker === 0 ? "HAUNTER" : "GROVYLE" },
            target: { species: attacker === 0 ? "GROVYLE" : "HAUNTER" },
          });
      }
    }
  });

  it.each(cases)("renders $move from current displayed species in both orientations", (row) => {
    for (const attacker of [0, 1] as const) {
      const frames = [
        renderBody(row.id, attacker, 0),
        renderBody(row.id, attacker, row.effectAge),
        renderBody(row.id, attacker, row.duration - 1),
      ];
      expect(new Set(frames).size, `${row.move} attacker ${attacker}`).toBeGreaterThan(1);
      expect(renderRoute(row.id, attacker, row.effectAge)).not.toBe(frames[1]);
    }
  });

  it("selects effect-picture and affine centers independently from live art", () => {
    const effectCenter = (battler: { geometry: {
      side: "player" | "opponent"; spriteCorner: { x: number; y: number };
    } }) => ({
      x: battler.geometry.spriteCorner.x + 32,
      // GetBattlerSpriteFinal_Y adds eight only for the player back picture.
      y: Math.min(104, battler.geometry.spriteCorner.y + 32
        + (battler.geometry.side === "player" ? 8 : 0)),
    });
    const affineCenter = (battler: { geometry: { spriteCorner: { x: number; y: number } } }) => ({
      x: battler.geometry.spriteCorner.x + 32,
      y: battler.geometry.spriteCorner.y + 32,
    });

    const viceGrip = liveMoveAnimationPresentation(request(11, 1), field, 0)!;
    if (viceGrip.config.move !== "VICE_GRIP") throw new Error("VICE_GRIP config missing");
    expect(viceGrip.config.target.geometry.animationCenter).toEqual(effectCenter(viceGrip.config.target));

    const hiJumpKick = liveMoveAnimationPresentation(request(136, 0), field, 0)!;
    if (hiJumpKick.config.move !== "HI_JUMP_KICK") throw new Error("HI_JUMP_KICK config missing");
    expect(hiJumpKick.config.targetInitialX2)
      .toBe(speciesFrontIdleRestOffsetOrZero("GROVYLE").x2);

    for (const moveId of [211, 231] as const) {
      const state = liveMoveAnimationPresentation(request(moveId, 0), field, 0)!;
      if (state.config.move !== "STEEL_WING" && state.config.move !== "IRON_TAIL") {
        throw new Error(`unexpected affine config ${state.config.move}`);
      }
      expect(state.config.attacker.geometry.animationCenter).toEqual(affineCenter(state.config.attacker));
      expect(state.config.target.geometry.animationCenter).toEqual(affineCenter(state.config.target));
    }

    const poisonTail = liveMoveAnimationPresentation(request(342, 0), field, 0)!;
    if (poisonTail.config.move !== "POISON_TAIL") throw new Error("POISON_TAIL config missing");
    expect(poisonTail.config.attacker.geometry.animationCenter).toEqual(affineCenter(poisonTail.config.attacker));
    expect(poisonTail.config.target.geometry.animationCenter).toEqual(effectCenter(poisonTail.config.target));
  });

  it("repeats LOW_KICK from ordinary generated command input through cleanup", () => {
    const on = generatedCommandAnimationReplay(14, "on", [0, 0]);
    const off = generatedCommandAnimationReplay(14, "off", [0, 0]);
    const effects = on.animations.filter((animation) => animation.moveId === 67);
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect).toMatchObject({ attacker: 0, player: "MACHOKE", opponent: "LEDIAN" });
      expect(effect.ages).toEqual(iu120Ages(67, 33));
    }
    expect(on.requests.filter((request) => request.moveId === 67)
      .map(({ turn, multihit }) => [turn, multihit]))
      .toEqual([[0, 0], [0, 0]]);
    expect(on.boundaries).toHaveLength(3);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    for (let index = 0; index < on.boundaries.length; index++) {
      const onBattle = on.boundaries[index]!.rules;
      const offBattle = off.boundaries[index]!.rules;
      const { hitMarker: onMarker, ...onRules } = onBattle.rulesContext;
      const { hitMarker: offMarker, ...offRules } = offBattle.rulesContext;
      expect(onRules).toEqual(offRules);
      expect(onBattle.rng).toEqual(offBattle.rng);
      expect(onMarker ^ offMarker).toBe(0x80);
    }
  }, 60000);
});
