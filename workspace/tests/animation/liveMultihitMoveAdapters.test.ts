import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  LIVE_MOVE_OPPONENT_SHADOW_ROW,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS } from "../../src/engine/liveMoveSpriteAllocator.ts";
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

const multihit = [
  { id: 3, move: "DOUBLE_SLAP", duration: 34, turnFor: (turn: number) => turn },
  { id: 4, move: "COMET_PUNCH", duration: 37, turnFor: (turn: number) => turn },
  // Cmd_jumpifmoveturn 0 / 1 / else (battle_anim_scripts.s:6543): turns >= 2 share the Center branch.
  { id: 167, move: "TRIPLE_KICK", duration: 37, turnFor: (turn: number) => Math.min(turn, 2) },
] as const;

describe("multi-hit live adapters: one MOVE_ANIMATION per hit", () => {
  it("registers 3, 4, 167 with the opponent shadow row 0 and keeps 4 and 167 out of the net-zero allocator list", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining([3, 4, 167]));
    for (const id of [3, 4, 167]) {
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
      // alloc52: Double Slap 3 moved IN (audited net-zero by the prep52 receipt); 4 and 167 stay unaudited.
      if (id === 3) expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS).toContain(id);
      else expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS).not.toContain(id);
    }
  });

  it.each(multihit)("maps request.turn to the $move per-hit selector with the accepted duration", row => {
    for (const turn of [0, 1, 2, 3, 4]) for (const attacker of [0, 1] as const) {
      const req = request(row.id, attacker, { turn });
      expect(liveMoveAnimationDuration(req)).toBe(row.duration);
      expect(liveMoveAnimationPresentation(req, field, 0)?.config)
        .toMatchObject({ move: row.move, moveTurn: row.turnFor(turn) });
    }
  });

  it("pins each drafted fixture's turn to its hit index and the accepted window length", () => {
    for (const row of multihit) for (const side of ["player", "opponent"]) for (let hit = 0; hit < 5; hit += 1) {
      const path = `tools/integration/fixtures/multihit-${row.move.toLowerCase().replace("_", "-")}-${side}-hit${hit}.json`;
      if (!existsSync(path)) continue;
      const f = JSON.parse(readFileSync(path, "utf8"));
      expect(f.requestFields.turn).toBe(hit);
      expect(f.denseWindow.endFrame - f.denseWindow.startFrame + 1).toBe(row.duration);
      expect(f.messageLines ?? null).toEqual(hit === 0 ? null : ["", ""]);
    }
  });

  it.each(multihit)("renders $move with alternate legal species in both orientations on every hit", row => {
    for (const f of [field, displayed("EKANS", "ONIX"), displayed("GOLBAT", "GOLBAT")]) for (const attacker of [0, 1] as const) {
      for (const turn of [0, 1, 2]) {
        const req = request(row.id, attacker, { turn });
        const ages = [0, Math.floor(row.duration / 2), row.duration - 1];
        expect(new Set(ages.map(age => render(f, req, age))).size).toBeGreaterThan(1);
      }
    }
  });
});

const routes: ReadonlyArray<{ move: string; id: number; seed: number; slot: 0 | 1 | 2 | 3; hits: number; ages: number }> = [
  { move: "DOUBLE_SLAP", id: 3, seed: 95, slot: 1, hits: 4, ages: 34 },
  { move: "DOUBLE_SLAP", id: 3, seed: 246, slot: 1, hits: 3, ages: 34 },
  { move: "COMET_PUNCH", id: 4, seed: 226, slot: 0, hits: 3, ages: 37 },
];

describe("live multi-hit ordinary routes", () => {
  it.each(routes)("completes ordinary $move (seed $seed, $hits hits) and preserves ON/OFF rules and RNG", row => {
    const on = generatedCommandAnimationReplay(row.seed, "on", [row.slot], 0);
    const off = generatedCommandAnimationReplay(row.seed, "off", [row.slot], 0);
    const bodies = on.animations.filter(animation => animation.moveId === row.id && animation.attacker === 0);
    const requests = on.requests.filter(r => r.moveId === row.id && r.attacker === 0);
    expect(bodies).toHaveLength(row.hits);
    expect(requests.map(r => r.turn)).toEqual(Array.from({ length: row.hits }, (_, i) => i));
    for (const body of bodies) {
      expect(body.ages).toEqual(iu120Ages(row.id, row.ages));
      expect(body.adapterActive.every(Boolean)).toBe(true);
    }
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(2);
    expect(off.boundaries).toHaveLength(2);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 120000);
});
