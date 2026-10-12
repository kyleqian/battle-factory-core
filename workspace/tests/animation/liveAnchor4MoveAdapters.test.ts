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
import { speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

type Key = "initialBattlerX2" | "initialTargetX2" | "targetIdleX2" | "attackerPictureSize";
type Side = "player" | "opponent";
/** `expected(side)` is the accepted source fixture's recorded/derived value for that attacker orientation. */
const cases: ReadonlyArray<{
  id: number; move: string; fixture: string | null; key: Key; duration: number; effectAge: number;
  expected: (attackerSide: Side) => unknown;
  route: { seed: number; slot: 0 | 1 | 2 | 3; streak: number };
}> = [
  // earthquakePortable fixtures: ONIX front idle x2 1 (player attacker); DUGTRIO front idle 0 (opponent attacker).
  { id: 89, move: "EARTHQUAKE", fixture: "earthquake-%s-dugtrio-%s-onix", key: "initialBattlerX2", duration: 198, effectAge: 100,
    expected: side => ({ player: 0, opponent: side === "player" ? 1 : 0 }),
    route: { seed: 6, slot: 0, streak: 14 } },
  { id: 90, move: "FISSURE", fixture: "fissure-%s-dugtrio-%s-onix", key: "initialTargetX2", duration: 254, effectAge: 120,
    expected: side => (side === "player" ? 1 : 0),
    route: { seed: 7, slot: 3, streak: 35 } },
  { id: 152, move: "CRABHAMMER", fixture: "crabhammer-%s-krabby-%s-onix", key: "targetIdleX2", duration: 105, effectAge: 50,
    expected: side => (side === "player" ? 1 : 0),
    route: { seed: 43, slot: 0, streak: 0 } },
  { id: 345, move: "MAGICAL_LEAF", fixture: "magical-leaf-%s-roselia-%s-onix", key: "targetIdleX2", duration: 182, effectAge: 120,
    expected: side => (side === "player" ? 1 : 0),
    route: { seed: 35, slot: 1, streak: 0 } },
  // psybeamFramebuffer.ts psybeamConfigFor: targetIdleX2 = playerAttacker ? 1 : 0 (no source pair fixture exists).
  { id: 60, move: "PSYBEAM", fixture: null, key: "targetIdleX2", duration: 160, effectAge: 80,
    expected: side => (side === "player" ? 1 : 0),
    route: { seed: 9, slot: 1, streak: 0 } },
  // amnesiaActualCore.ts: TORKOAL back 64x48, opponent front 64x64.
  { id: 133, move: "AMNESIA", fixture: null, key: "attackerPictureSize", duration: 216, effectAge: 100,
    expected: side => (side === "player" ? { width: 64, height: 48 } : { width: 64, height: 64 }),
    route: { seed: 12, slot: 3, streak: 7 } },
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


/** The raw source anchors each adapter field is derived from (liveBattlerAnchors / art coords). */
function derive(key: Key, attackerSide: Side, art: ReturnType<typeof createBattleCommandFieldArtView>) {
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  switch (key) {
    case "initialBattlerX2": return {
      player: liveBattlerAnchors("player", art).frontIdleRest.x2,
      opponent: liveBattlerAnchors("opponent", art).frontIdleRest.x2,
    };
    case "initialTargetX2": case "targetIdleX2": return liveBattlerAnchors(targetSide, art).frontIdleRest.x2;
    case "attackerPictureSize": return { width: art[attackerSide].coords.width, height: art[attackerSide].coords.height };
  }
}

describe("anchor4 source battler anchors", () => {
  // The helper's anchors for the accepted fixture's own species reproduce the recorded values.
  it.each(cases)("reproduces the recorded $key of $move for both orientations", row => {
    for (const first of ["player", "opponent"] as const) {
      const second = first === "player" ? "opponent" : "player";
      const live = JSON.parse(readFileSync(
        `tools/integration/fixtures/anchor4-${row.move.toLowerCase().replaceAll("_", "-")}-${first}.json`, "utf8"));
      const fixture = { ...(live.sourceFixture ? JSON.parse(readFileSync(live.sourceFixture, "utf8")) : {}), ...live };
      if (row.fixture) expect(live.sourceFixture).toBe(
        `tools/compare/fixtures/${row.fixture.replace("%s", first).replace("%s", second)}.json`);
      const species = (side: Side) =>
        fixture.attacker.geometry.side === side ? fixture.attacker.species : fixture.target.species;
      // PSYBEAM's displayed attacker is CRAWDAUNT (set-143 staging keeps its picture; only the target idle matters).
      const art = createBattleCommandFieldArtView(displayed(species("player"), species("opponent")));
      const attackerSide = fixture.attacker.geometry.side as Side;
      expect(derive(row.key, attackerSide, art)).toEqual(row.expected(attackerSide));
      // Where the accepted fixture records the field, it is the same value.
      if (row.key in fixture) expect(fixture[row.key]).toEqual(row.expected(attackerSide));
    }
  });
});

describe("live anchor4 move adapters", () => {
  it("registers six source-owned bodies and moves the anchors with the live species", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    // WALREIN and ONIX have different front idle x2, so opponent-side idle anchors follow the species.
    const alt = displayed("EKANS", "ONIX");
    expect(speciesFrontIdleRestOffsetOrZero("WALREIN").x2).not.toBe(speciesFrontIdleRestOffsetOrZero("ONIX").x2);
    for (const row of cases) for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(row.id, attacker))).toBe(row.duration);
      const attackerSide: Side = attacker === 0 ? "player" : "opponent";
      const live = liveMoveAnimationPresentation(request(row.id, attacker), field, 0)?.config as
        unknown as Record<string, any>;
      expect(live).toMatchObject({ move: row.move,
        attacker: { species: attacker === 0 ? "CAMERUPT" : "WALREIN" },
        target: { species: attacker === 0 ? "WALREIN" : "CAMERUPT" } });
      const alternate = liveMoveAnimationPresentation(request(row.id, attacker), alt, 0)?.config as
        unknown as Record<string, any>;
      expect(alternate).toMatchObject({ move: row.move,
        attacker: { species: attacker === 0 ? "EKANS" : "ONIX" } });
      expect(live[row.key]).toEqual(derive(row.key, attackerSide, createBattleCommandFieldArtView(field)));
      expect(alternate[row.key]).toEqual(derive(row.key, attackerSide, createBattleCommandFieldArtView(alt)));
      // The anchors that read an opponent front sprite (or the attacker's own pic) follow the species.
      const opponentSided = row.key === "initialBattlerX2" || row.key === "attackerPictureSize"
        || (attacker === 0);
      if (opponentSided) expect(alternate[row.key]).not.toEqual(live[row.key]);
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
  }, 120000);
});
