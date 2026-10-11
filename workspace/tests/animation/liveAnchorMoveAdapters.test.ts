import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  liveBattlerAnchors,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { land97Ages } from "../helpers/land97LeadAges.ts";

const cases = [
  { id: 51, move: "ACID", fixture: "acid-%s-ekans-%s-onix", anchor: "projectileOrigin", duration: 131, effectAge: 60,
    route: { seed: 26, slot: 1, streak: 0 } },
  { id: 124, move: "SLUDGE", fixture: "sludge-%s-grimer-%s-onix", anchor: "projectileOrigin", duration: 102, effectAge: 50,
    route: { seed: 4, slot: 0, streak: 0 } },
  { id: 188, move: "SLUDGE_BOMB", fixture: "sludge-bomb-%s-weepinbell-%s-onix", anchor: "projectileOrigin", duration: 160, effectAge: 70,
    route: { seed: 8, slot: 2, streak: 14 } },
  { id: 55, move: "WATER_GUN", fixture: "water-gun-%s-horsea-%s-onix", anchor: "projectileOrigin", duration: 111, effectAge: 50,
    route: { seed: 91, slot: 1, streak: 0 } },
  { id: 106, move: "HARDEN", fixture: "harden-%s-relicanth-%s-onix", anchor: "attackerSpriteCenter", duration: 101, effectAge: 50,
    route: { seed: 12, slot: 2, streak: 7 } },
  { id: 334, move: "IRON_DEFENSE", fixture: "iron-defense-%s-clamperl-%s-onix", anchor: "attackerSpriteCenter", duration: 101, effectAge: 50,
    route: { seed: 7, slot: 2, streak: 0 } },
  { id: 232, move: "METAL_CLAW", fixture: "metal-claw-%s-charmander-%s-onix", anchor: "attackerSpriteCenter", duration: 140, effectAge: 110,
    route: { seed: 130, slot: 0, streak: 0 } },
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

function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({ species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id,
    speciesSymbol: name, name, level: 50, hp: 100, maxHP: 100, gender: "male", status: "none" });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}

describe("liveBattlerAnchors", () => {
  // Every accepted source fixture's recorded anchor must be reproduced exactly
  // from live field geometry for its staged species, for BOTH sides.
  it.each(cases)("reproduces the recorded $anchor of $move for both sides", row => {
    for (const side of ["player", "opponent"] as const) {
      const other = side === "player" ? "opponent" : "player";
      const fixture = JSON.parse(readFileSync(
        `tools/compare/fixtures/${row.fixture.replace("%s", side).replace("%s", other)}.json`, "utf8"));
      const art = createBattleCommandFieldArtView(
        displayed(side === "player" ? fixture.attacker.species : fixture.target.species,
          side === "player" ? fixture.target.species : fixture.attacker.species));
      const anchors = liveBattlerAnchors(side, art);
      expect(row.anchor === "projectileOrigin" ? anchors.picOffsetPoint : anchors.spriteCenter)
        .toEqual(fixture[row.anchor]);
      expect(anchors.battlePositionCenter).toEqual(fixture.attacker.geometry.side === side
        ? fixture.attacker.geometry.battlePositionCenter : fixture.target.geometry.battlePositionCenter);
    }
  });

  it("moves with the species and keeps the raw anchors apart", () => {
    const a = liveBattlerAnchors("player", createBattleCommandFieldArtView(field));
    const b = liveBattlerAnchors("player", createBattleCommandFieldArtView(displayed("EKANS", "ONIX")));
    expect(a.spriteCenter).not.toEqual(b.spriteCenter);
    expect(a.picOffsetPoint.y).toBe(Math.min(104, a.spriteCenter.y + 8));
    expect(liveBattlerAnchors("player", createBattleCommandFieldArtView(field)).frontIdleRest)
      .toEqual({ x2: 0, y2: 0 });
  });
});

describe("live anchor move adapters", () => {
  it("registers seven source-owned bodies and moves the anchor with the live species", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    for (const row of cases) for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(row.id, attacker))).toBe(row.duration);
      const live = liveMoveAnimationPresentation(request(row.id, attacker), field, 0)?.config as
        unknown as Record<string, any>;
      expect(live).toMatchObject({ move: row.move,
        attacker: { species: attacker === 0 ? "CAMERUPT" : "WALREIN" },
        target: { species: attacker === 0 ? "WALREIN" : "CAMERUPT" } });
      const anchors = liveBattlerAnchors(attacker === 0 ? "player" : "opponent", createBattleCommandFieldArtView(field));
      expect(live[row.anchor]).toEqual(row.anchor === "projectileOrigin" ? anchors.picOffsetPoint : anchors.spriteCenter);
      const alternate = liveMoveAnimationPresentation(request(row.id, attacker), displayed("EKANS", "ONIX"), 0)?.config as
        unknown as Record<string, any>;
      expect(alternate[row.anchor]).not.toEqual(live[row.anchor]);
    }
  });

  it.each(cases)("renders $move with alternate legal art in both orientations", row => {
    for (const attacker of [0, 1] as const) {
      expect(new Set([0, row.effectAge, row.duration - 1]
        .map(age => render(row.id, attacker, age))).size).toBeGreaterThan(1);
    }
  });

  it.each(cases)("completes ordinary $move and preserves ON/OFF rules and RNG", row => {
    const on = generatedCommandAnimationReplay(row.route.seed, "on", [row.route.slot], row.route.streak);
    const off = generatedCommandAnimationReplay(row.route.seed, "off", [row.route.slot], row.route.streak);
    const body = on.animations.find(animation => animation.moveId === row.id && animation.attacker === 0);
    expect(body?.ages).toEqual(land97Ages(row.id, row.duration));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(2);
    expect(off.boundaries).toHaveLength(2);
    for (let i = 0; i < 2; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 60000);
});
