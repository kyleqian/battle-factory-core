import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS, LIVE_MOVE_RANDOM2_PLANS } from "../../src/engine/liveMovePresentationRng.ts";
import { liveOutrageInputs, liveRapidSpinInputs } from "../../src/engine/liveQ2Moves.ts";
import { bonemerangHit2Free } from "../../src/engine/liveSpriteOrderHost.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { outrageInputsFor } from "../../tools/compare/verifyOutrageReducer.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep29.md s0 / B.1 / B.3 / B.5 / B.6 (authoritative): Bonemerang (both hits), Rapid Spin, Outrage (exact) and Luster Purge
// (faithful-random). Dense framebuffer proofs: tools/integration/fixtures/prep29-live/*.json (receipt r29-live-receipt.json).
const DIR = "tools/integration/fixtures/prep29-live";
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture;
const NAMES = readdirSync(DIR).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const ROWS = { BONEMERANG: 71, RAPID_SPIN: 130, OUTRAGE: 119, LUSTER_PURGE: 332 } as const;
const configOf = (f: Fixture, mutate?: (r: BattleMoveAnimationRequest) => BattleMoveAnimationRequest, order?: unknown) => {
  const view = liveView(f, 0);
  const effect = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never };
  return liveMoveAnimationPresentation(mutate ? mutate(effect.request) : effect.request, view.field, 0, undefined, undefined,
    (order ?? effect.spriteOrderInput) as never);
};

describe("live prep29 registration", () => {
  it("Bonemerang, Rapid Spin and Outrage are scoped-exact, Luster Purge is faithful-random (disjoint buckets); durations are the prep29 constants", () => {
    for (const id of [155, 229, 200]) {
      expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).toContain(id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    }
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(295);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS as readonly number[]).toContain(295);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[295]).toBe(0);
    expect(LIVE_MOVE_RANDOM2_PLANS[295]).toEqual([0, 1, 2, 3, 4, 5].map((k) => ({ ageOffset: 170 + 5 * k, count: 2 })));
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 155 })).toBe(71);
      expect(liveMoveAnimationDuration({ ...base, moveId: 229 })).toBe(130);
      expect(liveMoveAnimationDuration({ ...base, moveId: 200 })).toBe(119);
      expect(liveMoveAnimationDuration({ ...base, moveId: 295 })).toBe(332);
    }
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    const exact = (status.implementedAdapters as { id: number }[]).map((e) => e.id);
    expect(exact).toEqual(expect.arrayContaining([155, 229, 200]));
    expect(exact).not.toContain(295);
    expect((status.faithfulRandomAdapters as { id: number }[]).map((e) => e.id)).toContain(295);
  });

  it("covers 20 dense fixtures (accepted + prep29 alternate, both orientations; Bonemerang hit 1 + hit 2); windows start at activation; the receipt is 0 px x2 fresh", () => {
    expect(NAMES).toHaveLength(20);
    for (const name of NAMES) {
      const f = fixtureAt(name);
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(ROWS[f.move as keyof typeof ROWS]);
    }
    expect(NAMES.filter((n) => n.startsWith("bonemerang-") && n.endsWith("-hit2"))).toHaveLength(4);
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/r29-live-receipt.json", "utf8"));
    expect(receipt.summary).toMatchObject({ fixtures: 20, allExactTwiceFresh: true, residualPixels: 0 });
  });
});

describe("live prep29 builders and gates", () => {
  it("Outrage's lowest-free flame slots equal the corpus allocation (prep29 B.6)", () => {
    const corpus = outrageInputsFor("player-back").spriteSlots.flames;
    const built = liveOutrageInputs({
      attackerSide: "player", attacker: { picOffsetPoint: { x: 0, y: 0 }, spriteCenter: { x: 0, y: 0 }, frontIdleRest: { x2: 0, y2: 0 } },
      target: { picOffsetPoint: { x: 0, y: 0 }, spriteCenter: { x: 0, y: 0 }, frontIdleRest: { x2: 0, y2: 0 } },
      palettes: { unfaded: [], faded: [], hardware: [] }, spriteOrder: [], smallEmberPalette: [],
    }) as { spriteSlots: { flames: number[] } };
    expect(built.spriteSlots.flames).toEqual([...corpus]);
  });

  it("Rapid Spin's entry scanline is the Dig first-body S0 banks (80 x +2, 80 x -2, zeros; bank 1 zero)", () => {
    const anchors = { picOffsetPoint: { x: 0, y: 0 }, spriteCenter: { x: 72, y: 88 }, frontIdleRest: { x2: 0, y2: 0 } };
    const inputs = liveRapidSpinInputs({ attackerSide: "player", attacker: anchors, target: anchors, spriteOrder: [], movePower: 20, moveDamage: 1 }) as
      { initialScanlineBanks: number[][]; initialScanlineSrcBuffer: number; monbg: unknown };
    expect(inputs.initialScanlineSrcBuffer).toBe(1);
    expect(inputs.initialScanlineBanks[0]!.slice(0, 160)).toEqual([...Array(80).fill(2), ...Array(80).fill(-2)]);
    expect(inputs.initialScanlineBanks[0]!.slice(160).every((v) => v === 0) && inputs.initialScanlineBanks[1]!.every((v) => v === 0)).toBe(true);
    expect(inputs.monbg).toMatchObject({ layer: "bg2", bgX: -40, bgY: -56, inBg2: true, battlerId: 0 });
  });

  // later58 moved this pin: a later Bonemerang hit (no firstBody / hit-1 marker) is live while both species rests are {0,0} and declines with
  // an opponent ONIX (docs/next-adapters-later58.md).
  it("gates: Bonemerang later hits need rest-free battlers, Outrage needs a first body here (ONIX); an unknown lend declines all four", () => {
    const hit1 = fixtureAt("bonemerang-player-marowak-opponent-chansey-hit1");
    const hit2 = fixtureAt("bonemerang-player-marowak-opponent-chansey-hit2");
    expect(configOf(hit1)).not.toBeNull();
    expect(configOf(hit2)).not.toBeNull();
    const known = { known: true as const, free: bonemerangHit2Free() };
    expect(configOf(hit2, undefined, known)).not.toBeNull(); // a later hit 2 without the hit-1 marker: rest-free battlers
    expect(configOf(hit1, undefined, known)).not.toBeNull(); // a later hit 1
    expect(configOf({ ...hit1, target: { ...hit1.target, species: "ONIX" } }, undefined, known)).toBeNull();
    expect(configOf({ ...hit2, target: { ...hit2.target, species: "ONIX" } }, undefined, known)).toBeNull();
    const outrage = fixtureAt("outrage-player-dragonite-opponent-onix");
    expect(configOf(outrage)).not.toBeNull();
    expect(configOf(outrage, undefined, { ...known, free: (liveView(outrage, 0).effect as any).spriteOrderInput.free })).toBeNull();
    for (const name of ["bonemerang-player-marowak-opponent-chansey-hit1", "rapid-spin-player-wartortle-opponent-onix", "outrage-player-dragonite-opponent-onix"]) {
      const f = fixtureAt(name), view = liveView(f, 0);
      const effect = view.effect as unknown as { request: BattleMoveAnimationRequest };
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, undefined)).toBeNull();
    }
  });
});

describe("live prep29 ordinary routes", () => {
  const rulesWithoutSceneMarker = (v: { rules: any }) => {
    const rc = v.rules.rulesContext;
    return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
  };
  const parityOf = (on: ReturnType<typeof generatedCommandAnimationReplay>, off: ReturnType<typeof generatedCommandAnimationReplay>) => {
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  };
  // route = generated rentals, party member 0 knows the move, one turn (tools/integration/r3ProfileRouteSearch.ts <id> 4 1 4000: first seeds ascending).
  // Outrage and Luster Purge: no generated rental route within seeds 0..3999 x streaks 0..42.
  it.each([
    // mhs1: Bonemerang is a shape-A body; hit 1 carries the kernel lead 16 (ROM lab mhs1-bonemerang-pfirst-on: hit SE exact), hit 2 has no lead (74 rows)
    ["BONEMERANG 246/21 MAROWAK (both hits)", 155, 246, 21, 0 as const, 71, 2, [16, 0]],
    ["RAPID_SPIN 80/14 WARTORTLE", 229, 80, 14, 2 as const, 130, 1, undefined],
  ])("route %s: bodies reached, adapter active every age, following prompt reached, Scene ON/OFF parity", (_name, id, seed, streak, slot, ages, hits, leads) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const bodies = on.animations.filter((a) => a.moveId === id && a.attacker === 0);
    expect(bodies).toHaveLength(hits);
    for (const [i, body] of bodies.entries()) {
      expect(body.ages).toEqual(iu120Ages(id, ages, "player", leads?.[i]));
      expect(body.adapterActive.every(Boolean)).toBe(true);
    }
    parityOf(on, off);
  }, 240000);
});
