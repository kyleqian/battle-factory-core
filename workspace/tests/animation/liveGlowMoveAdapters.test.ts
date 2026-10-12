import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
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
import { iu120Ages } from "../helpers/iu120Rows.ts";

const cases = [
  { id: 235, move: "SYNTHESIS", duration: [130, 130], effectAge: 60,
    // Synthesis fails at full HP: turn one is slot 1 damage, turn two is slot 3.
    route: { seed: 388, slots: [1, 3], streak: 0 } },
  { id: 208, move: "MILK_DRINK", duration: [186, 186], effectAge: 90,
    route: { seed: 199, slots: [3], streak: 21 } },
  { id: 148, move: "FLASH", duration: [64, 64], effectAge: 20,
    route: { seed: 122, slots: [3], streak: 0 } },
  { id: 272, move: "ROLE_PLAY", duration: [147, 147], effectAge: 70,
    route: { seed: 270, slots: [1], streak: 0 } },
  { id: 180, move: "SPITE", duration: [221, 221], effectAge: 100,
    // Spite fails with no prior target move: turn one is slot 0, turn two is slot 2.
    route: { seed: 316, slots: [0, 2], streak: 0 } },
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

describe("live glow move adapters", () => {
  it("registers five source-owned bodies with attacker-side durations and live species", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id)));
    for (const row of cases) for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(row.id, attacker))).toBe(row.duration[attacker]);
      expect(liveMoveAnimationPresentation(request(row.id, attacker), field, 0)?.config)
        .toMatchObject({ move: row.move,
          attacker: { species: attacker === 0 ? "CAMERUPT" : "WALREIN" },
          target: { species: attacker === 0 ? "WALREIN" : "CAMERUPT" } });
    }
  });

  it.each(cases)("renders $move with alternate legal art in both orientations", row => {
    for (const attacker of [0, 1] as const) {
      const duration = row.duration[attacker];
      expect(new Set([0, row.effectAge, duration - 1]
        .map(age => render(row.id, attacker, age))).size).toBeGreaterThan(1);
    }
  });

  it.each(cases)("completes ordinary $move and preserves ON/OFF rules and RNG", row => {
    const on = generatedCommandAnimationReplay(row.route.seed, "on", [...row.route.slots], row.route.streak);
    const off = generatedCommandAnimationReplay(row.route.seed, "off", [...row.route.slots], row.route.streak);
    const body = on.animations.find(animation => animation.moveId === row.id && animation.attacker === 0);
    expect(body?.ages).toEqual(iu120Ages(row.id, row.duration[0]));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    const turns = row.route.slots.length + 1;
    expect(on.boundaries).toHaveLength(turns);
    expect(off.boundaries).toHaveLength(turns);
    for (let i = 0; i < turns; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 60000);
});
