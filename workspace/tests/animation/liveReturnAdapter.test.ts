import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { liveReturnAttackerY2 } from "../../src/engine/liveMoveOamAssembler.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// docs/next-adapters-prep24.md s2 + return-live: MOVE_RETURN (216), the strongest branch (friendship > 200; every committed
// fixture was staged at 255). Dense framebuffer proofs: tools/integration/fixtures/return-live/*.json (return-live-adapter-receipt.json).
// ret88 (docs/ret88-return-weak.md): the kernel sends friendship 0 (ReturnWeak), so the strongest body declines at any other level.
type Json = Record<string, any>;
const corpus = (path: string): Json[] => JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")).frames;
const request = (attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest => ({
  moveId: 216, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 255, multihit: 0, ...extra,
});
function displayed(player: string, opponent: string, personality?: number): BattleResolutionDisplayedField {
  const mon = (name: string, side: "player" | "opponent") => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none", ...(personality !== undefined && side === "player" ? { personality } : {}),
  });
  return { player: mon(player, "player"), opponent: mon(opponent, "opponent") } as unknown as BattleResolutionDisplayedField;
}
const firstBodyOrder = (): LiveMoveSpriteOrderInput =>
  ({ ...prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).input!, firstBody: true });
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};
const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(`tools/integration/fixtures/return-live/${name}.json`, "utf8")) as Fixture;
const inputsAt = (f: Fixture, age: number): Json => {
  const view = liveView(f, age), effect = view.effect as any;
  const state = liveMoveAnimationPresentation(effect.request, view.field, age, undefined, effect.spriteAllocatorInput,
    effect.spriteOrderInput, undefined, effect.battlerX2Input) as any;
  return state.config.animationInputs;
};

describe("return-live: MOVE_RETURN strongest branch", () => {
  it("registers Return: 282 rows both sides, activation shadow row 0, vertical-dip program from the source schedule", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(216);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[216]).toBe(0);
    expect(liveMoveAnimationDuration(request(0))).toBe(282);
    expect(liveMoveAnimationDuration(request(1))).toBe(282);
    // Nine overlapping dips (return.ts PROGRAMS.strongest): the attacker y2 peaks at 12 (row 41: dips 1 / 2) and returns to 0.
    expect(liveReturnAttackerY2(23)).toBe(0);
    expect(liveReturnAttackerY2(24)).toBe(1);
    expect(liveReturnAttackerY2(281)).toBe(0);
    expect(Math.max(...Array.from({ length: 282 }, (_, row) => liveReturnAttackerY2(row)))).toBeGreaterThan(12);
  });

  it("builds the retained hardware OAM + matrices exactly on every body row from production inputs (both accepted orientations)", () => {
    for (const [name, path] of [
      ["accepted-player-dragonair-opponent-onix", "tools/compare/evidence/return-player-dense-state.json.gz"],
      ["accepted-opponent-dragonair-player-onix", "tools/compare/evidence/return-opponent-dense-state.json.gz"],
    ] as const) {
      const rows = corpus(path), f = fixture(name);
      let exact = 0, matrices = 0;
      for (let age = 1; age < rows.length; age += 1) {
        const inputs = inputsAt(f, age);
        if (JSON.stringify(inputs.buffers.hardwareOam) === JSON.stringify(rows[age]!.hardwareOam)) exact += 1;
        if (JSON.stringify(inputs.buffers.hardwareMatrices) === JSON.stringify(rows[age]!.hardwareMatrices)) matrices += 1;
      }
      expect(rows).toHaveLength(282);
      expect(exact).toBe(281);
      expect(matrices).toBe(281);
    }
  });

  it("is gated on a known order (a later body only with both species rests {0,0}) and non-shiny battlers; any Factory species", () => {
    const field = displayed("SNORLAX", "PIDGEOT");
    expect(liveMoveAnimationPresentation(request(0), field, 50, undefined, undefined, firstBodyOrder())?.config.move).toBe("RETURN");
    expect(liveMoveAnimationPresentation(request(1), displayed("SCYTHER", "GOLBAT"), 50, undefined, undefined, firstBodyOrder())?.config.move).toBe("RETURN");
    expect(liveMoveAnimationPresentation(request(0), field, 50)).toBeNull();
    const later = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).input!;
    // later48 (docs/next-adapters-prep48.md): a later body with rest-free battlers is live; an opponent ONIX (rest x2 1, zeroed by the
    // ROM after Quick Attack / Return but read as the rest by the x2 tracker) declines at a later body only.
    expect(liveMoveAnimationPresentation(request(0), field, 50, undefined, undefined, later)?.config.move).toBe("RETURN");
    expect(liveMoveAnimationPresentation(request(0), displayed("DRAGONAIR", "ONIX"), 50, undefined, undefined, later)).toBeNull();
    expect(liveMoveAnimationPresentation(request(0), displayed("DRAGONAIR", "ONIX"), 50, undefined, undefined, firstBodyOrder())?.config.move).toBe("RETURN");
    const shiny = ((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) << 16 >>> 0;
    expect(liveMoveAnimationPresentation(request(0), displayed("SNORLAX", "PIDGEOT", shiny), 50, undefined, undefined, firstBodyOrder())).toBeNull();
  });

  it("ret88: AnimTask_GetReturnPowerLevel gates duration and presentation: only Strongest (> 200) is live; 0..200 decline", () => {
    const field = displayed("SNORLAX", "PIDGEOT");
    for (const friendship of [0, 59, 60, 61, 91, 92, 150, 200]) {
      expect(liveMoveAnimationDuration(request(0, { friendship }))).toBeNull();
      expect(liveMoveAnimationDuration(request(1, { friendship }))).toBeNull();
      expect(liveMoveAnimationPresentation(request(0, { friendship }), field, 50, undefined, undefined, firstBodyOrder())).toBeNull();
      expect(liveMoveAnimationPresentation(request(1, { friendship }), field, 50, undefined, undefined, firstBodyOrder())).toBeNull();
    }
    for (const friendship of [201, 255]) {
      expect(liveMoveAnimationDuration(request(0, { friendship }))).toBe(282);
      expect(liveMoveAnimationPresentation(request(0, { friendship }), field, 50, undefined, undefined, firstBodyOrder())?.config.move).toBe("RETURN");
    }
  });

  // Ordinary generated-rental routes (orderConsumerRouteScan.ts RETURN 216). The kernel sends friendship 0 (ret80 / ISSUES #165), so
  // the ROM draws ReturnWeak; ret88 rung 1: the strongest body no longer claims it (fallback every age), gameplay unchanged.
  it.each([[24, 14, "PIDGEOT"], [51, 28, "EXEGGUTOR"]] as const)(
    "route %i/%i %s: the friendship-0 Return declines (no live body), prompt reached; Scene ON/OFF boundaries, RNG and rules identical", (seed, streak, _species) => {
      const on = generatedCommandAnimationReplay(seed, "on", [0], streak);
      const off = generatedCommandAnimationReplay(seed, "off", [0], streak);
      const returns = on.requests.filter(r => r.moveId === 216 && r.attacker === 0);
      expect(returns.length).toBeGreaterThan(0);
      expect(returns.every(r => r.friendship === 0)).toBe(true);
      expect(on.animations.filter(a => a.moveId === 216)).toEqual([]);
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      expect(on.stalled).toBe(off.stalled);
      expect(off.boundaries).toHaveLength(on.boundaries.length);
      for (let i = 0; i < on.boundaries.length; i += 1) {
        expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
        expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
        expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
      }
    }, 240000);
});
