import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveBattlerAnchors,
  liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import monPicCoords from "../../src/data/gen/mon-pic-coords.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

type Side = "player" | "opponent";
// docs/next-adapters-prep.md s1: accepted reducer durations; shadow row 0 iff the window starts at activation.
const cases = [
  { id: 184, move: "SCARY_FACE", duration: 190, shadow: false, route: { seed: 14, slot: 3 as const, streak: 0 } },
  { id: 137, move: "GLARE", duration: 213, shadow: true, route: { seed: 1, slot: 1 as const, streak: 7 } },
  { id: 298, move: "TEETER_DANCE", duration: 169, shadow: true, route: { seed: 49, slot: 1 as const, streak: 0 } },
  { id: 146, move: "DIZZY_PUNCH", duration: 69, shadow: false, route: { seed: 49, slot: 0 as const, streak: 0 } },
  { id: 135, move: "SOFT_BOILED", duration: 272, shadow: true, route: null },
];

function displayed(player: string, opponent: string, personality?: { player?: number; opponent?: number }): BattleResolutionDisplayedField {
  const mon = (name: string, side: Side) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
    ...(personality?.[side] === undefined ? {} : { personality: personality[side] }),
  });
  return { player: mon(player, "player"), opponent: mon(opponent, "opponent") } as unknown as BattleResolutionDisplayedField;
}
const request = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId, attacker, target: moveId === 135 ? attacker : attacker === 0 ? 1 : 0,
  turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
function render(field: BattleResolutionDisplayedField, moveId: number, attacker: 0 | 1, age: number): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: request(moveId, attacker), age }, bottom: "message",
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const cfg = (field: BattleResolutionDisplayedField, id: number, attacker: 0 | 1) =>
  liveMoveAnimationPresentation(request(id, attacker), field, 0)?.config as unknown as Record<string, any>;
const rulesWithoutSceneMarker = (v: ReturnType<typeof generatedCommandAnimationReplay>["boundaries"][number]) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live next5 move adapters", () => {
  it("registers the five moves with the accepted durations and shadow rows", () => {
    for (const c of cases) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(c.id);
      for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(c.id, a))).toBe(c.duration);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[c.id]).toBe(c.shadow ? 0 : undefined);
    }
  });

  it("derives Scary Face / Glare eye points from the live species (accepted fixtures pinned)", () => {
    // Accepted staged values: Rhyhorn pic (72,100)/(176,49); Dunsparce (82,93)/(168,49) with eyes (72,95)/(176,49).
    const rhyhorn = displayed("RHYHORN", "SHUCKLE");
    expect(cfg(rhyhorn, 184, 0).attackerEyeCenter).toEqual({ x: 72, y: 100 });
    expect(cfg(displayed("SHUCKLE", "RHYHORN"), 184, 1).attackerEyeCenter).toEqual({ x: 176, y: 49 });
    const gp = cfg(displayed("DUNSPARCE", "SHUCKLE"), 137, 0);
    expect(gp).toMatchObject({ attackerEyeCenter: { x: 72, y: 95 }, eyeDotStart: { x: 82, y: 93 }, eyeDotEnd: { x: 176, y: 49 } });
    const go = cfg(displayed("SHUCKLE", "DUNSPARCE"), 137, 1);
    expect(go).toMatchObject({ attackerEyeCenter: { x: 176, y: 49 }, eyeDotStart: { x: 168, y: 49 }, eyeDotEnd: { x: 72, y: 99 } });
    // HEIGHT is GET_MON_COORDS_HEIGHT (back table for the player, front for the opponent), not pictureHeight.
    const alt = displayed("EKANS", "ONIX");
    for (const a of [0, 1] as const) {
      const side: Side = a === 0 ? "player" : "opponent";
      const art = createBattleCommandFieldArtView(alt);
      const pic = liveBattlerAnchors(side, art).picOffsetPoint;
      const table = (monPicCoords as any)[side === "player" ? "back" : "front"][art[side].speciesSymbol].height;
      const g = cfg(alt, 137, a);
      expect(g.eyeDotStart).toEqual({ x: pic.x + (side === "player" ? 1 : -1) * Math.trunc(table / 4), y: pic.y - Math.trunc(table / 4) });
      expect(g.attackerEyeCenter).toEqual({ x: pic.x, y: pic.y - 8 });
      expect(cfg(alt, 184, a).attackerEyeCenter).toEqual(pic);
      expect(cfg(alt, 184, a).attacker.species).toBe(art[side].speciesSymbol);
      // Another attacker species moves the anchors.
      const base = displayed("RHYHORN", "SHUCKLE");
      expect(cfg(base, 184, a).attackerEyeCenter).not.toEqual(cfg(alt, 184, a).attackerEyeCenter);
    }
  });

  it("threads the displayed attacker personality (presentation only) and moves only the opponent Spinda front", () => {
    for (const id of [298, 146]) {
      expect(cfg(displayed("SPINDA", "ONIX", { player: 123456 }), id, 0).attackerPersonality).toBe(123456);
      expect(cfg(displayed("ONIX", "SPINDA", { opponent: 99 }), id, 1).attackerPersonality).toBe(99);
      expect(cfg(displayed("SPINDA", "ONIX"), id, 0).attackerPersonality).toBe(0);
      const spots = (side: Side, personality: number, age: number) => render(
        side === "player" ? displayed("SPINDA", "ONIX", { player: personality }) : displayed("ONIX", "SPINDA", { opponent: personality }),
        id, side === "player" ? 0 : 1, age);
      for (const age of [10, 30]) {
        expect(spots("opponent", 1793700111, age)).not.toBe(spots("opponent", 2349019136, age));
        expect(spots("player", 1793700111, age)).toBe(spots("player", 2349019136, age));
      }
    }
  });

  it("renders every move with alternate species in both orientations without fixture-species throws", () => {
    const alt = displayed("EKANS", "ONIX");
    for (const c of cases) for (const a of [0, 1] as const) {
      expect(new Set([0, Math.floor(c.duration / 2), c.duration - 1].map(age => render(alt, c.id, a, age))).size).toBeGreaterThan(1);
    }
  });

  it("draws the Soft-Boiled bystander from the displayed field", () => {
    for (const a of [0, 1] as const) {
      const one = cfg(displayed("CHANSEY", "ONIX"), 135, a), two = cfg(displayed("CHANSEY", "GOLEM"), 135, a);
      const other = (c: Record<string, any>) => c.bystander.species;
      expect(other(one)).toBe(a === 0 ? "ONIX" : "CHANSEY");
      expect(one.target).toBe(one.attacker);
      expect(one.healingCenter).toEqual(liveBattlerAnchors(a === 0 ? "player" : "opponent",
        createBattleCommandFieldArtView(displayed("CHANSEY", "ONIX"))).picOffsetPoint);
      if (a === 0) expect(other(two)).toBe("GOLEM");
      expect(render(displayed("CHANSEY", "ONIX"), 135, 0, 40)).not.toBe(render(displayed("CHANSEY", "GOLEM"), 135, 0, 40));
    }
  });

  it.each(cases.filter(c => c.route))("completes ordinary $move and preserves ON/OFF rules and RNG", c => {
    const r = c.route!;
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.slot], r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.slot], r.streak);
    const body = on.animations.find(a => a.moveId === c.id && a.attacker === 0);
    expect(body?.ages).toEqual(iu120Ages(c.id, c.duration));
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
