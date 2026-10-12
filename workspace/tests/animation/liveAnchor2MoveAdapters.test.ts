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

type Key = "attackerPictureOffset" | "targetPictureOffset";
const cases: ReadonlyArray<{
  id: number; move: string; fixture: string; keys: readonly Key[]; duration: number; opponentDuration?: number; effectAge: number;
  route: { seed: number; slot: 0 | 1 | 2 | 3; streak: number };
}> = [
  { id: 61, move: "BUBBLE_BEAM", fixture: "bubble-beam-%s-surskit-%s-onix", keys: ["attackerPictureOffset", "targetPictureOffset"],
    duration: 239, effectAge: 100, route: { seed: 38, slot: 0, streak: 0 } },
  { id: 56, move: "HYDRO_PUMP", fixture: "hydro-pump-%s-masquerain-%s-onix", keys: ["attackerPictureOffset", "targetPictureOffset"],
    duration: 141, effectAge: 60, route: { seed: 10, slot: 0, streak: 14 } },
  { id: 341, move: "MUD_SHOT", fixture: "mud-shot-%s-krabby-%s-onix", keys: ["attackerPictureOffset", "targetPictureOffset"],
    duration: 145, opponentDuration: 144, effectAge: 60, route: { seed: 43, slot: 1, streak: 0 } },
  { id: 238, move: "CROSS_CHOP", fixture: "cross-chop-%s-machoke-%s-onix", keys: ["targetPictureOffset"],
    duration: 88, effectAge: 40, route: { seed: 5, slot: 0, streak: 14 } },
  { id: 197, move: "DETECT", fixture: "detect-%s-yanma-%s-onix", keys: ["attackerPictureOffset"],
    duration: 110, effectAge: 50, route: { seed: 10, slot: 3, streak: 0 } },
  { id: 294, move: "TAIL_GLOW", fixture: "tail-glow-%s-volbeat-%s-shuckle", keys: ["attackerPictureOffset"],
    duration: 203, effectAge: 100, route: { seed: 3, slot: 3, streak: 14 } },
  { id: 259, move: "TORMENT", fixture: "torment-%s-murkrow-%s-onix", keys: ["attackerPictureOffset", "targetPictureOffset"],
    duration: 177, effectAge: 90, route: { seed: 4, slot: 2, streak: 0 } },
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

describe("anchor2 picture-offset anchors", () => {
  // Each accepted source fixture's recorded X_2/Y_PIC_OFFSET value must be
  // reproduced from live field geometry for its own species, in both orientations.
  it.each(cases)("reproduces the recorded picture offsets of $move for both orientations", row => {
    for (const first of ["player", "opponent"] as const) {
      const second = first === "player" ? "opponent" : "player";
      const fixture = JSON.parse(readFileSync(
        `tools/compare/fixtures/${row.fixture.replace("%s", first).replace("%s", second)}.json`, "utf8"));
      const species = (side: "player" | "opponent") =>
        fixture.attacker.geometry.side === side ? fixture.attacker.species : fixture.target.species;
      const art = createBattleCommandFieldArtView(displayed(species("player"), species("opponent")));
      const attackerSide = fixture.attacker.geometry.side as "player" | "opponent";
      const targetSide = attackerSide === "player" ? "opponent" : "player";
      for (const key of row.keys) {
        const side = key === "attackerPictureOffset" ? attackerSide : targetSide;
        expect(liveBattlerAnchors(side, art).picOffsetPoint).toEqual(fixture[key]);
      }
    }
  });
});

describe("live anchor2 move adapters", () => {
  it("registers seven source-owned bodies and moves the anchors with the live species", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    for (const row of cases) for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(row.id, attacker))).toBe(attacker === 0 ? row.duration : row.opponentDuration ?? row.duration);
      const live = liveMoveAnimationPresentation(request(row.id, attacker), field, 0)?.config as
        unknown as Record<string, any>;
      expect(live).toMatchObject({ move: row.move,
        attacker: { species: attacker === 0 ? "CAMERUPT" : "WALREIN" },
        target: { species: attacker === 0 ? "WALREIN" : "CAMERUPT" } });
      const attackerSide = attacker === 0 ? "player" : "opponent";
      const targetSide = attacker === 0 ? "opponent" : "player";
      const anchors = (current: BattleResolutionDisplayedField) => ({
        attackerPictureOffset: liveBattlerAnchors(attackerSide, createBattleCommandFieldArtView(current)).picOffsetPoint,
        targetPictureOffset: liveBattlerAnchors(targetSide, createBattleCommandFieldArtView(current)).picOffsetPoint,
      });
      const alternate = liveMoveAnimationPresentation(request(row.id, attacker), displayed("EKANS", "ONIX"), 0)?.config as
        unknown as Record<string, any>;
      for (const key of row.keys) {
        expect(live[key]).toEqual(anchors(field)[key]);
        expect(alternate[key]).toEqual(anchors(displayed("EKANS", "ONIX"))[key]);
        expect(alternate[key]).not.toEqual(live[key]);
      }
    }
  });

  it.each(cases)("renders $move with alternate legal art in both orientations", row => {
    for (const attacker of [0, 1] as const) {
      expect(new Set([0, row.effectAge, (attacker === 0 ? row.duration : row.opponentDuration ?? row.duration) - 1]
        .map(age => render(row.id, attacker, age))).size).toBeGreaterThan(1);
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
