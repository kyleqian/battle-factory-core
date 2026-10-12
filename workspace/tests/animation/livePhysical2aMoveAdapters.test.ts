import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
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

const cases = [
  { id: 34, move: "BODY_SLAM", duration: 107, effectAge: 45 },
  { id: 36, move: "TAKE_DOWN", duration: 98, effectAge: 44 },
  { id: 38, move: "DOUBLE_EDGE", duration: 141, effectAge: 72 },
  { id: 66, move: "SUBMISSION", duration: 124, effectAge: 46 },
] as const;

const field = {
  player: {
    species: 340, speciesSymbol: "CAMERUPT", name: "CAMERUPT", level: 50,
    hp: 145, maxHP: 145, gender: "female", status: "burn",
  },
  opponent: {
    species: 343, speciesSymbol: "WALREIN", name: "WALREIN", level: 50,
    hp: 183, maxHP: 183, gender: "male", status: "paralysis",
  },
} as unknown as BattleResolutionDisplayedField;

function request(moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest {
  return {
    moveId, attacker, target: attacker === 0 ? 1 : 0,
    turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
  };
}

function render(moveId: number, attacker: 0 | 1, age: number): string {
  const view = {
    field,
    fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: "CAMERUPT", level: 50, gender: "female", hpFraction: 1,
        status: "burn", currentHp: 145, maxHp: 145 },
      opponent: { name: "WALREIN", level: 50, gender: "male", hpFraction: 1,
        status: "paralysis" },
    },
    message: { lines: [attacker === 0 ? "CAMERUPT used" : "Foe WALREIN used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: request(moveId, attacker), age },
    bottom: "message",
  } as unknown as BattleResolutionPresentationRenderView;
  const framebuffer = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(framebuffer, view);
  return createHash("sha256").update(framebuffer).digest("hex");
}

function generatedRoute(moveId: number): { seed: number; slot: 0 | 1 | 2 | 3; streak: number } {
  for (let streak = 0; streak <= 42; streak += 7) for (let seed = 0; seed < 10_000; seed += 1) {
    const rental = generateInitialFactoryRentals({
      rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562,
    }).rentals[0]!;
    const slot = createFactoryCorpusPartyMember(rental).moves.indexOf(moveId);
    if (slot >= 0) return { seed, slot: slot as 0 | 1 | 2 | 3, streak };
  }
  throw new Error(`no ordinary generated route for move ${moveId}`);
}

function rulesWithoutSceneMarker(value: ReturnType<typeof generatedCommandAnimationReplay>["boundaries"][number]) {
  const { hitMarker: _marker, ...rulesContext } = value.rules.rulesContext;
  return { ...value.rules, rulesContext };
}

describe("live physical2a move adapters", () => {
  it("registers complete source-owned durations and current battler identities", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    for (const row of cases) for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(row.id, attacker))).toBe(row.duration);
      expect(liveMoveAnimationPresentation(request(row.id, attacker), field, 0)?.config)
        .toMatchObject({
          move: row.move,
          attacker: { species: attacker === 0 ? "CAMERUPT" : "WALREIN" },
          target: { species: attacker === 0 ? "WALREIN" : "CAMERUPT" },
        });
    }
  });

  it.each(cases)("renders $move with alternate legal art/geometry/status in both orientations", row => {
    for (const attacker of [0, 1] as const) {
      const hashes = [0, row.effectAge, row.duration - 1]
        .map(age => render(row.id, attacker, age));
      expect(new Set(hashes).size, `${row.move} attacker ${attacker}`).toBeGreaterThan(1);
    }
  });

  it.each(cases)("reaches and completes ordinary $move requests with ON/OFF state and RNG parity", row => {
    const route = generatedRoute(row.id);
    const on = generatedCommandAnimationReplay(route.seed, "on", [route.slot], route.streak);
    const off = generatedCommandAnimationReplay(route.seed, "off", [route.slot], route.streak);
    expect(on.requests.some(request => request.moveId === row.id), JSON.stringify(route)).toBe(true);
    const bodies = on.animations.filter(animation => animation.moveId === row.id && animation.attacker === 0);
    expect(bodies, JSON.stringify(route)).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(row.id, row.duration));
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(2);
    expect(off.boundaries).toHaveLength(2);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 60000);
});
