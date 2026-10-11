import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { COVET_FRAME_COUNT } from "../../src/animation/covet.ts";
import {
  GUILLOTINE_OPPONENT_FRAME_COUNT,
  GUILLOTINE_PLAYER_FRAME_COUNT,
} from "../../src/animation/guillotine.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { land97Ages } from "../helpers/land97LeadAges.ts";

const cases = [
  { id: 12, move: "GUILLOTINE", duration: GUILLOTINE_PLAYER_FRAME_COUNT, effectAge: 90,
    route: { seed: 32, slot: 2, streak: 14 } },
  { id: 68, move: "COUNTER", duration: 88, effectAge: 40,
    route: { seed: 272, slot: 0, streak: 0 } },
  { id: 162, move: "SUPER_FANG", duration: 200, effectAge: 110,
    route: { seed: 62, slot: 0, streak: 14 } },
  { id: 343, move: "COVET", duration: COVET_FRAME_COUNT, effectAge: 60,
    route: { seed: 87, slot: 2, streak: 7 } },
] as const;

const field = {
  player: { species: 340, speciesSymbol: "CAMERUPT", name: "CAMERUPT", level: 50,
    hp: 145, maxHP: 145, gender: "female", status: "burn" },
  opponent: { species: 343, speciesSymbol: "WALREIN", name: "WALREIN", level: 50,
    hp: 183, maxHP: 183, gender: "male", status: "paralysis" },
} as unknown as BattleResolutionDisplayedField;

function request(moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest {
  return { moveId, attacker, target: attacker === 0 ? 1 : 0,
    turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 };
}

function render(moveId: number, attacker: 0 | 1, age: number): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: "CAMERUPT", level: 50, gender: "female", hpFraction: 1,
        status: "burn", currentHp: 145, maxHp: 145 },
      opponent: { name: "WALREIN", level: 50, gender: "male", hpFraction: 1,
        status: "paralysis" },
    },
    message: { lines: [attacker === 0 ? "CAMERUPT used" : "Foe WALREIN used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: request(moveId, attacker), age }, bottom: "message",
  } as unknown as BattleResolutionPresentationRenderView;
  const framebuffer = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(framebuffer, view);
  return createHash("sha256").update(framebuffer).digest("hex");
}

function rulesWithoutSceneMarker(value: ReturnType<typeof generatedCommandAnimationReplay>["boundaries"][number]) {
  const rulesContext = value.rules.rulesContext;
  return { ...value.rules, rulesContext: { ...rulesContext, hitMarker: rulesContext.hitMarker & ~0x80 } };
}

describe("live physical2c move adapters", () => {
  it("registers four source-owned bodies with bilateral durations and live species", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    for (const row of cases) for (const attacker of [0, 1] as const) {
      const duration = row.id === 12 && attacker === 1
        ? GUILLOTINE_OPPONENT_FRAME_COUNT : row.duration;
      expect(liveMoveAnimationDuration(request(row.id, attacker))).toBe(duration);
      expect(liveMoveAnimationPresentation(request(row.id, attacker), field, 0)?.config)
        .toMatchObject({ move: row.move,
          attacker: { species: attacker === 0 ? "CAMERUPT" : "WALREIN" },
          target: { species: attacker === 0 ? "WALREIN" : "CAMERUPT" } });
    }
  });

  it.each(cases)("renders $move with alternate legal art in both orientations", row => {
    for (const attacker of [0, 1] as const) {
      const duration = row.id === 12 && attacker === 1
        ? GUILLOTINE_OPPONENT_FRAME_COUNT : row.duration;
      expect(new Set([0, row.effectAge, duration - 1]
        .map(age => render(row.id, attacker, age))).size).toBeGreaterThan(1);
    }
  });

  it.each(cases)("completes ordinary $move and preserves ON/OFF rules and RNG", row => {
    const on = generatedCommandAnimationReplay(row.route.seed, "on", [row.route.slot], row.route.streak);
    const off = generatedCommandAnimationReplay(row.route.seed, "off", [row.route.slot], row.route.streak);
    const body = on.animations.find(animation => animation.moveId === row.id && animation.attacker === 0);
    expect(body?.ages).toEqual(land97Ages(row.id, row.duration));
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(2);
    expect(off.boundaries).toHaveLength(2);
    for (let i = 0; i < 2; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 60000);

  it("dispatches meaningful Guillotine and Counter failures without a body", () => {
    for (const row of [{ id: 12, seed: 61, slot: 0, streak: 14 },
      { id: 68, seed: 82, slot: 0, streak: 0 }] as const) {
      const on = generatedCommandAnimationReplay(row.seed, "on", [row.slot], row.streak);
      const off = generatedCommandAnimationReplay(row.seed, "off", [row.slot], row.streak);
      expect(on.requests.some(moveRequest => moveRequest.moveId === row.id)).toBe(false);
      expect(on.boundaries.map(boundary => boundary.rng)).toEqual(off.boundaries.map(boundary => boundary.rng));
    }
  });

  it("takes exactly half current HP for ordinary Super Fang before later turn effects", () => {
    const replay = generatedCommandAnimationReplay(62, "on", [0, 0], 14);
    const requests = replay.requests.filter(moveRequest => moveRequest.moveId === 162);
    const targetHP = replay.boundaries.slice(0, 2).map(boundary => boundary.rules.rulesContext.battlers[1]!.hp);
    expect(targetHP).toEqual([158, 87]);
    expect(requests.map(request => request.damage)).toEqual([79, 43]);
    expect(requests.map(request => request.damage)).toEqual(targetHP.map(hp => Math.max(1, Math.floor(hp / 2))));
  });

  it("restarts Super Fang and Covet through complete fresh bodies on consecutive commands", () => {
    for (const row of cases.filter(({ id }) => id === 162 || id === 343)) {
      const replay = generatedCommandAnimationReplay(
        row.route.seed, "on", [row.route.slot, row.route.slot], row.route.streak,
      );
      const bodies = replay.animations.filter(animation => animation.moveId === row.id);
      expect(bodies).toHaveLength(2);
      for (const body of bodies) {
        expect(body.ages).toEqual(land97Ages(row.id, row.duration));
      }
      expect(replay.boundaries).toHaveLength(3);
      expect(replay.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    }
  });
});
