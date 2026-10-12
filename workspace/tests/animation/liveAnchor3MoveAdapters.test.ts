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
import { iu120Ages } from "../helpers/iu120Rows.ts";

type Key = "attackerCoord" | "breathOrigin" | "targetEffectCenter" | "battlerHeight";
/** `expected(side)` is each accepted source fixture's recorded/derived value for that orientation. */
const cases: ReadonlyArray<{
  id: number; move: string; fixture: string; keys: readonly Key[]; duration: number; effectAge: number;
  expected: (attackerSide: "player" | "opponent") => Partial<Record<Key, unknown>>;
  route: { seed: number; slot: 0 | 1 | 2 | 3; streak: number };
}> = [
  { id: 203, move: "ENDURE", fixture: "endure-%s-eevee-%s-onix", keys: ["attackerCoord"], duration: 122, effectAge: 60,
    expected: side => ({ attackerCoord: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 } }),
    route: { seed: 127, slot: 3, streak: 0 } },
  { id: 116, move: "FOCUS_ENERGY", fixture: "focus-energy-%s-taillow-%s-onix", keys: ["attackerCoord"], duration: 122, effectAge: 60,
    expected: side => ({ attackerCoord: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 } }),
    route: { seed: 61, slot: 1, streak: 7 } },
  // facadePortable.ts: battlerHeight player-back AZUMARILL 48, opponent-front 46.
  { id: 263, move: "FACADE", fixture: "facade-%s-azumarill-%s-onix", keys: ["battlerHeight"], duration: 81, effectAge: 40,
    expected: side => ({ battlerHeight: side === "player" ? 48 : 46 }),
    route: { seed: 40, slot: 1, streak: 0 } },
  // minimizePortable.ts: battlerHeight 40 for GRIMER in both orientations.
  { id: 107, move: "MINIMIZE", fixture: "minimize-%s-grimer-%s-onix", keys: ["battlerHeight"], duration: 153, effectAge: 80,
    expected: () => ({ battlerHeight: 40 }),
    route: { seed: 0, slot: 3, streak: 0 } },
  { id: 87, move: "THUNDER", fixture: "thunder-%s-magneton-%s-shuckle", keys: ["targetEffectCenter"], duration: 262, effectAge: 120,
    expected: side => ({ targetEffectCenter: side === "player" ? { x: 176, y: 49 } : { x: 72, y: 99 } }),
    route: { seed: 217, slot: 0, streak: 14 } },
  // thunderWavePortable.ts: playerToOpponent (176,49), opponentToPlayer (72,99).
  { id: 86, move: "THUNDER_WAVE", fixture: "thunder-wave-%s-flaaffy-%s-shuckle", keys: ["targetEffectCenter"], duration: 120, effectAge: 60,
    expected: side => ({ targetEffectCenter: side === "player" ? { x: 176, y: 49 } : { x: 72, y: 99 } }),
    route: { seed: 27, slot: 1, streak: 0 } },
  { id: 207, move: "SWAGGER", fixture: "swagger-%s-rattata-%s-onix", keys: ["breathOrigin"], duration: 161, effectAge: 80,
    expected: side => ({ breathOrigin: side === "player" ? { x: 72, y: 101 } : { x: 176, y: 56 } }),
    route: { seed: 9, slot: 3, streak: 14 } },
  { id: 339, move: "BULK_UP", fixture: "bulk-up-%s-primeape-%s-onix", keys: ["breathOrigin", "battlerHeight"], duration: 104, effectAge: 52,
    expected: side => ({ breathOrigin: side === "player" ? { x: 72, y: 95 } : { x: 176, y: 47 }, battlerHeight: 50 }),
    route: { seed: 5, slot: 3, streak: 14 } },
];

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


/** The raw source anchors each adapter field is derived from (liveBattlerAnchors). */
function derive(key: Key, attackerSide: "player" | "opponent", art: ReturnType<typeof createBattleCommandFieldArtView>) {
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attacker = liveBattlerAnchors(attackerSide, art);
  switch (key) {
    case "attackerCoord": return attacker.battlePositionCenter;
    case "breathOrigin": return attacker.picOffsetPoint;
    case "battlerHeight": return attacker.pictureHeight;
    case "targetEffectCenter": return liveBattlerAnchors(targetSide, art).picOffsetPoint;
  }
}

describe("anchor3 source battler anchors", () => {
  // The helper's raw anchors, derived from live field geometry for the accepted
  // fixture's own species, reproduce the values the accepted fixtures record.
  it.each(cases)("reproduces the recorded anchors of $move for both orientations", row => {
    for (const first of ["player", "opponent"] as const) {
      const second = first === "player" ? "opponent" : "player";
      // The live fixture supplies any key the accepted source fixture lacks
      // (Thunder Wave's source evidence records no battler species).
      const live = JSON.parse(readFileSync(
        `tools/integration/fixtures/anchor3-${row.move.toLowerCase().replaceAll("_", "-")}-${first}.json`, "utf8"));
      const fixture = { ...JSON.parse(readFileSync(live.sourceFixture, "utf8")), ...live };
      expect(live.sourceFixture).toBe(
        `tools/compare/fixtures/${row.fixture.replace("%s", first).replace("%s", second)}.json`);
      const species = (side: "player" | "opponent") =>
        fixture.attacker.geometry.side === side ? fixture.attacker.species : fixture.target.species;
      const art = createBattleCommandFieldArtView(displayed(species("player"), species("opponent")));
      const attackerSide = fixture.attacker.geometry.side as "player" | "opponent";
      const expected = row.expected(attackerSide);
      for (const key of row.keys) {
        expect(derive(key, attackerSide, art)).toEqual(expected[key]);
        // Where the accepted fixture records the field, it is the same value.
        if (key in fixture) expect(fixture[key]).toEqual(expected[key]);
      }
    }
  });

  it("pins the shared helper's position/picture anchors to the source tables", () => {
    const art = createBattleCommandFieldArtView(displayed("EKANS", "ONIX"));
    // battle_anim_mons.c:134-137 BATTLER_COORD_X/Y read sBattlerCoords.
    expect(liveBattlerAnchors("player", art).battlePositionCenter).toEqual({ x: 72, y: 80 });
    expect(liveBattlerAnchors("opponent", art).battlePositionCenter).toEqual({ x: 176, y: 40 });
  });
});

describe("live anchor3 move adapters", () => {
  it("registers eight source-owned bodies and moves the anchors with the live species", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    const alt = displayed("EKANS", "ONIX");
    for (const row of cases) for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(row.id, attacker))).toBe(row.duration);
      const attackerSide = attacker === 0 ? "player" : "opponent";
      const live = liveMoveAnimationPresentation(request(row.id, attacker), field, 0)?.config as
        unknown as Record<string, any>;
      expect(live).toMatchObject({ move: row.move,
        attacker: { species: attacker === 0 ? "CAMERUPT" : "WALREIN" },
        target: { species: attacker === 0 ? "WALREIN" : "CAMERUPT" } });
      const alternate = liveMoveAnimationPresentation(request(row.id, attacker), alt, 0)?.config as
        unknown as Record<string, any>;
      expect(alternate).toMatchObject({ move: row.move,
        attacker: { species: attacker === 0 ? "EKANS" : "ONIX" } });
      for (const key of row.keys) {
        expect(live[key]).toEqual(derive(key, attackerSide, createBattleCommandFieldArtView(field)));
        expect(alternate[key]).toEqual(derive(key, attackerSide, createBattleCommandFieldArtView(alt)));
        // Position-center anchors are species-independent; the rest follow the species art.
        if (key !== "attackerCoord") expect(alternate[key]).not.toEqual(live[key]);
      }
    }
  });

  it.each(cases)("renders $move with alternate legal art in both orientations", row => {
    for (const attacker of [0, 1] as const) {
      expect(new Set([0, row.effectAge, row.duration - 1].map(age => render(row.id, attacker, age))).size)
        .toBeGreaterThan(1);
    }
  });

  it.each(cases)("completes ordinary $move and preserves ON/OFF rules and RNG", row => {
    const on = generatedCommandAnimationReplay(row.route.seed, "on", [row.route.slot], row.route.streak);
    const off = generatedCommandAnimationReplay(row.route.seed, "off", [row.route.slot], row.route.streak);
    const body = on.animations.find(animation => animation.moveId === row.id && animation.attacker === 0);
    expect(body?.ages).toEqual(iu120Ages(row.id, row.duration));
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
