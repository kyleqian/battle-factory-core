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
import { NEEDLE_ARM_FRAME_COUNT } from "../../src/animation/needleArm.ts";
import { RAZOR_LEAF_BODY_LAST_AGE } from "../../src/animation/razorLeaf.ts";
import { THUNDER_PUNCH_MOVE_BODY_LAST_AGE } from "../../src/animation/thunderPunch.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

const cases = [
  { id: 9, move: "THUNDER_PUNCH", duration: THUNDER_PUNCH_MOVE_BODY_LAST_AGE + 1, effectAge: 48 },
  { id: 42, move: "PIN_MISSILE", duration: 93, effectAge: 40 },
  { id: 75, move: "RAZOR_LEAF", duration: RAZOR_LEAF_BODY_LAST_AGE + 1, effectAge: 101 },
  { id: 290, move: "SECRET_POWER", duration: 102, effectAge: 48 },
  { id: 302, move: "NEEDLE_ARM", duration: NEEDLE_ARM_FRAME_COUNT, effectAge: 45 },
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

function request(moveId: number, attacker: 0 | 1, multihit = 0): BattleMoveAnimationRequest {
  return {
    moveId, attacker, target: attacker === 0 ? 1 : 0,
    turn: 0, power: 0, damage: 0, friendship: 70, multihit,
  };
}

function render(moveId: number, attacker: 0 | 1, age: number, multihit = 0): string {
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
    effect: { type: "move", request: request(moveId, attacker, multihit), age },
    bottom: "message",
  } as unknown as BattleResolutionPresentationRenderView;
  const framebuffer = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(framebuffer, view);
  return createHash("sha256").update(framebuffer).digest("hex");
}

function generatedRoute(moveId: number, requireAcceptedBody = false): { seed: number; slot: 0 | 1 | 2 | 3; streak: number } {
  for (let streak = 0; streak <= 42; streak += 7) for (let seed = 0; seed < 10_000; seed += 1) {
    const rental = generateInitialFactoryRentals({
      rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562,
    }).rentals[0]!;
    const slot = createFactoryCorpusPartyMember(rental).moves.indexOf(moveId);
    if (slot < 0) continue;
    const route = { seed, slot: slot as 0 | 1 | 2 | 3, streak };
    if (!requireAcceptedBody) return route;
    const replay = generatedCommandAnimationReplay(seed, "on", [route.slot], streak);
    if (replay.animations.some(animation => animation.moveId === moveId && animation.attacker === 0)) {
      return route;
    }
  }
  throw new Error(`no ordinary generated route for move ${moveId}`);
}

function rulesWithoutSceneMarker(value: ReturnType<typeof generatedCommandAnimationReplay>["boundaries"][number]) {
  const { hitMarker: _marker, ...rulesContext } = value.rules.rulesContext;
  return { ...value.rules, rulesContext };
}

describe("live physical2b move adapters", () => {
  it("registers the five source-owned bodies and preserves live status inputs", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    for (const row of cases) for (const attacker of [0, 1] as const) {
      const moveRequest = request(row.id, attacker);
      expect(liveMoveAnimationDuration(moveRequest)).toBe(row.duration);
      expect(liveMoveAnimationPresentation(moveRequest, field, 0)?.config).toMatchObject({
        move: row.move,
        attacker: { species: attacker === 0 ? "CAMERUPT" : "WALREIN" },
        target: { species: attacker === 0 ? "WALREIN" : "CAMERUPT" },
      });
    }
    expect(liveMoveAnimationPresentation(request(9, 0), field, 0)?.config).toMatchObject({
      fieldProfile: { playerStatus: "burn" },
    });
  });

  it.each(cases)("renders $move with alternate legal art/geometry/status in both orientations", row => {
    for (const attacker of [0, 1] as const) {
      const hashes = [0, row.effectAge, row.duration - 1]
        .map(age => render(row.id, attacker, age, row.id === 42 ? 5 : 0));
      expect(new Set(hashes).size, `${row.move} attacker ${attacker}`).toBeGreaterThan(1);
    }
  });

  it.each(cases)("reaches and completes ordinary $move requests with ON/OFF state and RNG parity", row => {
    const route = generatedRoute(row.id, row.id === 42);
    const on = generatedCommandAnimationReplay(route.seed, "on", [route.slot], route.streak);
    const off = generatedCommandAnimationReplay(route.seed, "off", [route.slot], route.streak);
    expect(on.requests.some(moveRequest => moveRequest.moveId === row.id), JSON.stringify(route)).toBe(true);
    const bodies = on.animations.filter(animation => animation.moveId === row.id && animation.attacker === 0);
    expect(bodies, JSON.stringify(route)).toHaveLength(row.id === 42 ? 2 : 1);
    for (const body of bodies) {
      expect(body.ages).toEqual(iu120Ages(row.id, row.duration));
    }
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(2);
    expect(off.boundaries).toHaveLength(2);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 60000);

  it("keeps a generated Pin Missile miss as an ordinary no-hit command", () => {
    const on = generatedCommandAnimationReplay(75, "on", [1], 7);
    const off = generatedCommandAnimationReplay(75, "off", [1], 7);
    expect(on.commands.some(command => command.type === "message"
      && (command.command as { lines?: readonly string[] }).lines?.includes("QWILFISH’s"))).toBe(true);
    expect(on.requests.some(moveRequest => moveRequest.moveId === 42)).toBe(false);
    expect(on.boundaries.map(boundary => boundary.rng)).toEqual(off.boundaries.map(boundary => boundary.rng));
  }, 60000);
});
