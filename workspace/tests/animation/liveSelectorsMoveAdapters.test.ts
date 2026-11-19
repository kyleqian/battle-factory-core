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

const field = {
  player: { species: 340, speciesSymbol: "CAMERUPT", name: "CAMERUPT", level: 50,
    hp: 145, maxHP: 145, gender: "female", status: "burn" },
  opponent: { species: 343, speciesSymbol: "WALREIN", name: "WALREIN", level: 50,
    hp: 183, maxHP: 183, gender: "male", status: "paralysis" },
} as unknown as BattleResolutionDisplayedField;

function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({ species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id,
    speciesSymbol: name, name, level: 50, hp: 100, maxHP: 100, gender: "male", status: "none" });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}

function request(moveId: number, attacker: 0 | 1, fields: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest {
  return { moveId, attacker, target: attacker === 0 ? 1 : 0,
    turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...fields };
}

function render(f: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, age: number): string {
  const view = {
    field: f, fieldArt: createBattleCommandFieldArtView(f),
    healthboxes: {
      player: { name: f.player.name, level: 50, gender: "female", hpFraction: 1,
        status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: f.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["A MOVE", "used!"], visibleCharacters: 99 },
    effect: { type: "move", request: req, age }, bottom: "message",
  } as unknown as BattleResolutionPresentationRenderView;
  const framebuffer = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(framebuffer, view);
  return createHash("sha256").update(framebuffer).digest("hex");
}

function rulesWithoutSceneMarker(value: ReturnType<typeof generatedCommandAnimationReplay>["boundaries"][number]) {
  const rulesContext = value.rules.rulesContext;
  return { ...value.rules, rulesContext: { ...rulesContext, hitMarker: rulesContext.hitMarker & ~0x80 } };
}

type Variant = { label: string; fields: Partial<BattleMoveAnimationRequest>; duration: number };
const moves: ReadonlyArray<{ id: number; move: string; variants: readonly Variant[] }> = [
  // battle_anim.c:1073 Cmd_choosetwoturnanim: gAnimMoveTurn bit 0 selects the unleash body.
  { id: 76, move: "SOLAR_BEAM", variants: [
    { label: "setup", fields: { turn: 0 }, duration: 108 },
    { label: "unleash", fields: { turn: 1 }, duration: 199 },
  ] },
  // battle_anim_effects_3.c:1531 AnimTask_IsHealingMove: heal iff gAnimMoveDmg <= 0.
  { id: 217, move: "PRESENT", variants: [
    { label: "damage", fields: { power: 1, damage: 37 }, duration: 201 },
    { label: "heal", fields: { power: 1, damage: -45 }, duration: 252 },
  ] },
  { id: 236, move: "MOONLIGHT", variants: [{ label: "heal", fields: { damage: -76 }, duration: 352 }] },
  { id: 250, move: "WHIRLPOOL", variants: [{ label: "main", fields: { power: 15, damage: 33 }, duration: 133 }] },
];

describe("selectors live adapters: request-field selectors", () => {
  it("registers the four ids", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(moves.map(row => row.id)));
  });

  it("maps gAnimMoveTurn bit 0 to the Solar Beam body (both bodies, any turn parity)", () => {
    for (const [turn, body, duration] of [[0, "setup", 108], [1, "unleash", 199], [2, "setup", 108], [3, "unleash", 199]] as const) {
      for (const attacker of [0, 1] as const) {
        expect(liveMoveAnimationDuration(request(76, attacker, { turn }))).toBe(duration);
        expect(liveMoveAnimationPresentation(request(76, attacker, { turn }), field, 0)?.config)
          .toMatchObject({ move: "SOLAR_BEAM", body });
      }
    }
  });

  it("maps gAnimMoveDmg > 0 to the Present damage branch and <= 0 to heal", () => {
    for (const [damage, branch, duration] of [[40, "damage", 201], [1, "damage", 201], [0, "heal", 252], [-1, "heal", 252], [-45, "heal", 252]] as const) {
      for (const attacker of [0, 1] as const) {
        expect(liveMoveAnimationDuration(request(217, attacker, { damage }))).toBe(duration);
        expect(liveMoveAnimationPresentation(request(217, attacker, { damage }), field, 0)?.config)
          .toMatchObject({ move: "PRESENT", branch });
      }
    }
  });

  it("carries the Whirlpool main body only", () => {
    for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationPresentation(request(250, attacker), field, 0)?.config)
        .toMatchObject({ move: "WHIRLPOOL", body: "main" });
    }
  });

  it("derives Moonlight's healingCenter from the attacker's picture-offset anchor", () => {
    const alt = displayed("EKANS", "ONIX");
    for (const f of [field, alt]) for (const attacker of [0, 1] as const) {
      const side = attacker === 0 ? "player" : "opponent";
      const config = liveMoveAnimationPresentation(request(236, attacker), f, 0)?.config as unknown as Record<string, any>;
      expect(config.healingCenter).toEqual(liveBattlerAnchors(side, createBattleCommandFieldArtView(f)).picOffsetPoint);
    }
    const a = liveMoveAnimationPresentation(request(236, 0), field, 0)?.config as unknown as Record<string, any>;
    const b = liveMoveAnimationPresentation(request(236, 0), alt, 0)?.config as unknown as Record<string, any>;
    expect(b.healingCenter).not.toEqual(a.healingCenter);
  });

  // Accepted Moonlight fixtures record healingCenter (72,98) player / opponent side per source.
  it.each(["player", "opponent"] as const)("reproduces the accepted Moonlight healingCenter (%s attacker)", first => {
    const live = JSON.parse(readFileSync(`tools/integration/fixtures/selectors-moonlight-${first}.json`, "utf8"));
    const fixture = { ...JSON.parse(readFileSync(live.sourceFixture, "utf8")), ...live };
    const side = fixture.attacker.geometry.side as "player" | "opponent";
    const art = createBattleCommandFieldArtView(side === "player"
      ? displayed(fixture.attacker.species, fixture.target.species)
      : displayed(fixture.target.species, fixture.attacker.species));
    expect(liveBattlerAnchors(side, art).picOffsetPoint).toEqual(fixture.healingCenter);
  });

  it("pins each live fixture's request fields to the selector the accepted body had", () => {
    for (const o of ["player", "opponent"]) {
      for (const branch of ["damage", "heal"]) {
        const f = JSON.parse(readFileSync(`tools/integration/fixtures/selectors-present-${o}-${branch}.json`, "utf8"));
        expect(f.sourceFixture).toBe(`tools/compare/fixtures/present-${o}-${branch}.json`);
        expect(f.requestFields.damage > 0 ? "damage" : "heal").toBe(branch);
      }
      for (const body of ["setup", "unleash"]) {
        const f = JSON.parse(readFileSync(`tools/integration/fixtures/selectors-solar-beam-${o}-${body}.json`, "utf8"));
        expect((f.requestFields.turn & 1) === 0 ? "setup" : "unleash").toBe(body);
      }
    }
  });
});

describe("live selectors move adapters", () => {
  it.each(moves)("renders $move with alternate legal art in both orientations", row => {
    for (const f of [field, displayed("EKANS", "ONIX")]) for (const attacker of [0, 1] as const) {
      for (const variant of row.variants) {
        expect(liveMoveAnimationDuration(request(row.id, attacker, variant.fields))).toBe(variant.duration);
        const ages = [0, Math.floor(variant.duration / 2), variant.duration - 1];
        expect(new Set(ages.map(age => render(f, request(row.id, attacker, variant.fields), age))).size)
          .toBeGreaterThan(1);
      }
    }
  });
});

const routes: ReadonlyArray<{ move: string; id: number; seed: number; slots: (0 | 1 | 2 | 3)[]; streak: number;
  bodies: ReadonlyArray<{ turn?: number; damageSign?: "positive" | "nonpositive"; ages: number; lead?: number }> }> = [
  // Solar Beam charge turn then strike turn (animTurn 0 then 1) in one ordinary route.
  { move: "SOLAR_BEAM", id: 76, seed: 73, slots: [0], streak: 14,
    // liv2: the unleash is shape A: lead 5, 39 idle rows + the 199-row body (238 = the ROM window + 1), tail 3.
    bodies: [{ turn: 0, ages: 108 }, { turn: 1, ages: 199 + 39, lead: 5 }] },
  // Present damage roll, then a heal roll once the target is damaged.
  { move: "PRESENT", id: 217, seed: 3303, slots: [0, 0], streak: 0,
    bodies: [{ damageSign: "positive", ages: 201 }, { damageSign: "nonpositive", ages: 252 }] },
  // Moonlight heals only a damaged mon: the first turn takes a hit, then Moonlight (slot 3).
  { move: "MOONLIGHT", id: 236, seed: 76, slots: [1, 3], streak: 0, bodies: [{ damageSign: "nonpositive", ages: 352 }] },
  { move: "WHIRLPOOL", id: 250, seed: 54, slots: [0], streak: 0, bodies: [{ ages: 133 }] },
];

describe("live selectors ordinary routes", () => {
  it.each(routes)("completes ordinary $move (every variant) and preserves ON/OFF rules and RNG", row => {
    const on = generatedCommandAnimationReplay(row.seed, "on", row.slots, row.streak);
    const off = generatedCommandAnimationReplay(row.seed, "off", row.slots, row.streak);
    const bodies = on.animations.filter(animation => animation.moveId === row.id && animation.attacker === 0);
    const requests = on.requests.filter(r => r.moveId === row.id && r.attacker === 0);
    expect(bodies).toHaveLength(row.bodies.length);
    row.bodies.forEach((expected, i) => {
      expect(bodies[i]?.ages).toEqual(iu120Ages(row.id, expected.ages, "player", expected.lead));
      expect(bodies[i]?.adapterActive.every(Boolean)).toBe(true);
      if (expected.turn !== undefined) expect(requests[i]?.turn).toBe(expected.turn);
      if (expected.damageSign) expect(requests[i]!.damage > 0).toBe(expected.damageSign === "positive");
    });
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(row.slots.length + 1);
    expect(off.boundaries).toHaveLength(row.slots.length + 1);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 120000);
});
