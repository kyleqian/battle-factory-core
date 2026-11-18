import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { readFileSync } from "node:fs";
import plans from "../../tools/integration/fixtures/prep12-random2/plans.json" with { type: "json" };
import hyperBeamPlanDraft from "../../tools/integration/fixtures/prep13/prep13-hyper-beam-plan-draft.json" with { type: "json" };
import {
  LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS, LIVE_MOVE_RANDOM2_PLANS, activateLiveMovePresentationRng,
  hyperBeamOrbFromWords, liveMovePresentationRngBodyKey,
} from "../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngHostAt, presentationRngBodyWords } from "../../src/engine/presentationRngHost.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";
import { fixturePresentationRng, liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import { hpd4BodyRows, iu120Extra, iu120EffectAges } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep13.md: Ice Beam (58), Water Spout (323), Hidden Power (237). The dense framebuffer proofs are
// tools/integration/fixtures/prep13-live/*.json (receipt prep13-live-adapter-receipt.json).
const request = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra,
});
function displayed(player: string, opponent: string, hp: [number, number] = [100, 100], personality?: number): BattleResolutionDisplayedField {
  const mon = (name: string, side: "player" | "opponent") => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: hp[0], maxHP: hp[1], gender: "male", status: "none",
    ...(personality !== undefined && side === "player" ? { personality } : {}),
  });
  return { player: mon(player, "player"), opponent: mon(opponent, "opponent") } as unknown as BattleResolutionDisplayedField;
}
const knownOrder = (): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(58, 0)).input!;
function render(field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, age: number, order?: LiveMoveSpriteOrderInput): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: req, age, spriteOrderInput: order },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const cfg = (field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, order?: LiveMoveSpriteOrderInput, age = 0) =>
  liveMoveAnimationPresentation(req, field, age, undefined, undefined, order);
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live prep13 move adapters", () => {
  it("registers Ice Beam, Water Spout and Hidden Power with the accepted durations and shadow rows", () => {
    for (const id of [58, 323, 237]) {
      // d4w (prep41 s2): Hidden Power reclassified to faithful timing (no lag at 64, 180 rows); same adapter, other bucket.
      expect(id === 237 ? LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS : LIVE_MOVE_ANIMATION_IDS).toContain(id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    }
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(237);
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(58, a))).toBe(203);
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(237, a))).toBe(180);
    // Water Spout's body length depends on the attacker's party HP and picture height: no field, no duration.
    expect(liveMoveAnimationDuration(request(323, 0))).toBeNull();
  });

  // prep13 s1.2 / mechanic-water-spout-tiers-* ROM rows by attacker party HP (NOSEPASS carrier, max HP 137) and side.
  it.each([
    [137, 0, 278], [129, 0, 270], [113, 0, 254], [89, 0, 229], [57, 0, 204], [17, 0, 204],
    [137, 1, 278], [129, 1, 270], [113, 1, 254], [89, 1, 230], [57, 1, 206], [17, 1, 201],
  ] as const)("Water Spout duration at HP %i/137 attacker %i = %i rows (ROM tier scenarios)", (hp, attacker, rows) => {
    const base = attacker === 0 ? displayed("NOSEPASS", "SHUCKLE") : displayed("SHUCKLE", "NOSEPASS");
    const side = attacker === 0 ? "player" : "opponent";
    const field = { ...base, [side]: { ...base[side], hp, maxHP: 137 } } as BattleResolutionDisplayedField;
    expect(liveMoveAnimationDuration(request(323, attacker), field)).toBe(rows);
  });

  it("Water Spout takes the picture height of the attacker (KINGDRA player-back is 2 rows shorter), is gated on the lent order", () => {
    const order = knownOrder();
    const kingdra = displayed("KINGDRA", "GOLEM", [150, 150]);
    expect(liveMoveAnimationDuration(request(323, 0), kingdra)).toBe(276);
    expect(liveMoveAnimationDuration(request(323, 1), displayed("GOLEM", "KINGDRA", [150, 150]))).toBe(278);
    expect(liveMoveAnimationPresentation(request(323, 0), kingdra, 0)).toBeNull();
    const inputs = (liveMoveAnimationPresentation(request(323, 0), kingdra, 0, undefined, undefined, order)!.config as any).animationInputs;
    expect(inputs).toMatchObject({ attackerSide: "player", attackerHp: 150, attackerMaxHp: 150, attackerSubpriority: 30,
      launchTaskSlot: 0, attackerSourceHeight: 52 });
    expect(inputs.launchSpriteSlots.slice(0, 8)).toEqual([3, 4, 5, 7, 9, 10, 11, 12]);
    expect(inputs.spriteOrderSeed).toHaveLength(64);
    const opp = (liveMoveAnimationPresentation(request(323, 1), displayed("GOLEM", "KINGDRA", [150, 150]), 0, undefined, undefined, order)!.config as any).animationInputs;
    expect(opp).toMatchObject({ attackerSide: "opponent", attackerSubpriority: 40, attackerSourceHeight: 56 });
  });

  it("Ice Beam is gated on the lent order and derives geometry from the production anchors", () => {
    const order = knownOrder();
    const f = displayed("LAPRAS", "GOLEM");
    expect(cfg(f, request(58, 0), order)).not.toBeNull();
    expect(cfg(f, request(58, 0))).toBeNull();
    expect(cfg(f, request(58, 0), { known: false } as never)).toBeNull();
    const profile = (cfg(f, request(58, 0), order)!.config as any).animationProfile;
    // prep13-ice-beam-check.json: LAPRAS back (72, 92) / GOLEM front (176, 45); the monbg base is 544 - (target centre + idle x2).
    expect(profile).toMatchObject({ orientation: "player-back", endAge: 202,
      geometry: { attackerPictureOffset: { x: 72, y: 92 }, targetPictureOffset: { x: 176, y: 45 } } });
    expect(profile.spriteOrder.initialOrder).toHaveLength(64);
    const opp = (cfg(displayed("GOLEM", "LAPRAS"), request(58, 1), order)!.config as any).animationProfile;
    expect(opp.orientation).toBe("opponent-front");
    expect(opp.geometry.attackerPictureOffset).toEqual({ x: 176, y: 53 });
  });

  it("renders Ice Beam for alternate carriers in both orientations", () => {
    const order = knownOrder();
    for (const a of [0, 1] as const) {
      const field = a === 0 ? displayed("SLOWBRO", "GOLEM") : displayed("GOLEM", "SLOWBRO");
      const req = request(58, a);
      expect(cfg(field, req, order)).not.toBeNull();
      expect(new Set([0, 50, 100, 202].map(age => render(field, req, age, order))).size).toBeGreaterThan(1);
    }
  }, 240000);

  // prep13 s1.3: Unown letter-form pic coordinates (the one missing provider), letter from the personality.
  it("Hidden Power derives the Unown letter-form centre and sprite origin from the personality; declines for non-Unown and unlent order", () => {
    const order = knownOrder();
    const unown = (personality: number, side: 0 | 1) => {
      const f = side === 0 ? displayed("UNOWN", "ONIX", [100, 100], personality)
        : { ...displayed("ONIX", "UNOWN"), opponent: { ...displayed("ONIX", "UNOWN").opponent, personality } } as BattleResolutionDisplayedField;
      return liveMoveAnimationPresentation(request(237, side), f, 0, undefined, undefined, order)!.config as any;
    };
    // personality -> letter (GET_UNOWN_LETTER) -> SPECIES_UNOWN_<letter> pic coords (prep13-unown-form.json ROM centres).
    expect(unown(2349019075, 0).attacker.geometry.animationCenter).toEqual({ x: 72, y: 96 });  // H player
    expect(unown(2349016025, 0).attacker.geometry.animationCenter).toEqual({ x: 72, y: 98 });  // F player
    expect(unown(1793700000, 1).attacker.geometry.animationCenter).toEqual({ x: 176, y: 49 }); // E opponent (base UNOWN 47)
    expect(unown(1793703050, 1).attacker.geometry.animationCenter).toEqual({ x: 176, y: 46 }); // G opponent
    expect(unown(1793700000, 1).animationProfile).toMatchObject({ attackerSubpriority: 40, targetSubpriority: 30,
      attackerPersonality: 1793700000, uninitializedScatterY: 88 });
    expect(unown(2349019075, 0).animationProfile.allocationSlots).toEqual([3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(unown(2349019075, 0).animationProfile.spriteOrderSeed).toHaveLength(14);
    const f = displayed("UNOWN", "ONIX", [100, 100], 2349019075);
    expect(liveMoveAnimationPresentation(request(237, 0), f, 0)).toBeNull();
    // The reducer is Unown-only (GENGAR controls show an already-initialised eighth orb).
    expect(liveMoveAnimationPresentation(request(237, 0), displayed("GENGAR", "ONIX"), 0, undefined, undefined, order)).toBeNull();
    // Letters 26/27 are unproven.
    expect(liveMoveAnimationPresentation(request(237, 0), displayed("UNOWN", "ONIX", [100, 100], 0x03000000 | 2), 0, undefined, undefined, order)).toBeNull();
  });

  // route = ordinary-input replay (prep13 s2 seeds: generated rentals, party member 0 knows the move, one turn).
  const routes: { move: string; id: number; seed: number; moves: (0 | 1 | 2 | 3)[]; streak: number; bodies: number[] }[] = [
    { move: "ICE_BEAM 0/14 DELCATTY", id: 58, seed: 0, moves: [3], streak: 14, bodies: [203] },
    { move: "ICE_BEAM 1/14 DUNSPARCE", id: 58, seed: 1, moves: [0], streak: 14, bodies: [203] },
    // Not a first body: the opponent's Flail acts first and the tracked order is lent after it (prep13-route-probe.json).
    { move: "WATER_SPOUT 83/14 WAILMER", id: 323, seed: 83, moves: [0], streak: 14, bodies: [263] },
  ];
  it.each(routes)("completes ordinary $move and preserves ON/OFF rules and RNG", r => {
    const on = generatedCommandAnimationReplay(r.seed, "on", r.moves, r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", r.moves, r.streak);
    const bodies = on.animations.filter(a => a.moveId === r.id && a.attacker === 0);
    expect(bodies.map(b => b.ages.length)).toEqual(r.bodies.map(n => n + iu120Extra(r.id) + hpd4BodyRows(r.id)));
    for (const body of bodies) {
      expect(body.ages).toEqual(Array.from({ length: body.ages.length }, (_, age) => age));
      expect(body.adapterActive.every(Boolean)).toBe(true);
    }
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
  }, 240000);
});

describe("live prep13 Hyper Beam (faithful random)", () => {
  const entry = (plans as unknown as { moves: Record<string, { entries: { draws: { ageOffset: number; count: number }[];
    acceptedActivationValue: number; predictedFromPlan: number[][] }[] }> }).moves["hyper-beam"]!.entries[0]!;
  const key = liveMovePresentationRngBodyKey({ resolutionId: { requestId: 0 }, segmentIndex: 0, commandIndex: 0 });
  const fixtureAt = (name: string) => JSON.parse(readFileSync(`tools/integration/fixtures/prep13-live/${name}.json`, "utf8")) as Fixture;
  const drawsAt = (value: number) => presentationRngBodyWords(activateLiveMovePresentationRng(
    createPresentationRngHostAt(createPresentationRngState(value, "pinned")), { moveId: 63 }, key), key)!;

  it("is in the faithful-random bucket (disjoint from the exact ids) with the prep12 plan and the accepted shadow row", () => {
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).toContain(63);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(63);
    expect(LIVE_MOVE_RANDOM2_PLANS[63]).toEqual(entry.draws.map(({ ageOffset, count }) => ({ ageOffset, count })));
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[63]).toBe(0);
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(63, a))).toBe(280);
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    expect((status.faithfulRandomAdapters as { id: number }[]).map(e => e.id)).toContain(63);
    expect((status.implementedAdapters as { id: number }[]).map(e => e.id)).not.toContain(63);
  });

  it("the production activation at the pinned accepted value reproduces the prep12 orb words (animation, speed, phase)", () => {
    const record = drawsAt(entry.acceptedActivationValue);
    expect(record.provenance).toBe("pinned");
    const orbs = record.draws.flatMap(group => [
      hyperBeamOrbFromWords(group[0]!, group[1]!, group[2]!), hyperBeamOrbFromWords(group[3]!, group[4]!, group[5]!)]);
    // plans.json recovers `speed` only up to the translation step-data equivalence class (prep12 s1.8: observable via the
    // step data alone), so animation and phase are exact and the raw speed word lies in the same class window.
    expect(orbs.map(o => [o.animation, o.phase])).toEqual(entry.predictedFromPlan.map(o => [o[0], o[2]]));
    orbs.forEach((o, i) => {
      expect(o.speed).toBeGreaterThanOrEqual(64);
      expect(o.speed).toBeLessThanOrEqual(95);
      expect(o.speed).toBe((record.draws[Math.floor(i / 2)]![(i % 2) * 3 + 1]! & 31) + 64);
    });
  });

  it("derives geometry, words, lowest-free slots and persistent order from production inputs (ROM slots 52/52, both accepted orientations)", () => {
    const rows = (hyperBeamPlanDraft as unknown as { rows: Record<string, { romSlots: number[] }> }).rows;
    for (const [name, scenario] of [["hyper-beam-player-aerodactyl-opponent-onix", "mechanic-hyper-beam-player-aerodactyl-opponent-onix"],
      ["hyper-beam-opponent-aerodactyl-player-onix", "mechanic-hyper-beam-opponent-aerodactyl-player-onix"]] as const) {
      const f = fixtureAt(name);
      const view = liveView(f, 0);
      const effect = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: LiveMoveSpriteOrderInput; presentationRng: never };
      const config = liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput,
        effect.presentationRng)!.config as any;
      expect(config.animationProfile.orbs.map((o: { slot: number }) => o.slot)).toEqual(rows[scenario]!.romSlots);
      expect(config.animationProfile.orbs.every((o: { persistentOrder: number }) => o.persistentOrder >= 0)).toBe(true);
      expect(config.animationGeometry.attackerRestOffset).toBeDefined();
      if (name.startsWith("hyper-beam-player")) {
        // The plan's speed is the translation-step equivalence class: equal flight duration (|dx| << 4) / speed (prep12 s1.8).
        const dx = Math.abs(config.animationGeometry.targetPictureCenter.x - (config.animationGeometry.attackerPictureCenter.x + 20));
        config.animationProfile.orbs.forEach((o: { speed: number }, i: number) => {
          expect(Math.trunc((dx << 4) / o.speed)).toBe(Math.trunc((dx << 4) / entry.predictedFromPlan[i]![1]!));
        });
      }
      // Without the lend, without the activated body, or with another body key: no adapter (scene-off fallback).
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, undefined, effect.presentationRng)).toBeNull();
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput)).toBeNull();
      expect(fixturePresentationRng(f, effect.request)!.host).toEqual((effect.presentationRng as { host: unknown }).host);
    }
  });

  it("renders an alternate carrier (SNORLAX -> GOLEM) in both orientations with surrogate words, never drawing on repaint", () => {
    for (const a of [0, 1] as const) {
      const f = fixtureAt(a === 0 ? "hyper-beam-alt-player-snorlax-golem" : "hyper-beam-alt-opponent-snorlax-golem");
      const hashAt = (age: number) => {
        const view = liveView(f, age);
        const fb = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionLiveView(fb, view);
        const again = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionLiveView(again, view);
        expect(Buffer.from(fb).equals(Buffer.from(again))).toBe(true);
        return createHash("sha256").update(fb).digest("hex");
      };
      expect(new Set([0, 90, 130, 200, 279].map(hashAt)).size).toBeGreaterThan(2);
    }
  }, 240000);

  // Ordinary route (prep13 s2): 10/28 AERODACTYL, first body, order known; two presentation seeds, Scene ON/OFF.
  it("route 10/28 AERODACTYL: adapter active every age; logical state identical across presentation seeds and Scene ON/OFF", () => {
    const A = random2Route(10, "on", [0], 28, 0x1234abcd), B = random2Route(10, "on", [0], 28, 0xfeed0042);
    const off = random2Route(10, "off", [0], 28, 0x1234abcd);
    const bodies = A.bodies.filter(b => b.moveId === 63 && b.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120EffectAges(63, 280));
    expect(bodies[0]!.active.every(Boolean)).toBe(true);
    expect(bodies[0]!.provenance).toBe("surrogate");
    expect(bodies[0]!.words).toHaveLength(156);
    expect(B.bodies.filter(b => b.moveId === 63)[0]!.words).not.toEqual(bodies[0]!.words);
    expect(A.run.stalled).toBe(false);
    expect(A.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(B.run.boundaries).toEqual(A.run.boundaries);
    expect(B.run.state.facilityState).toEqual(A.run.state.facilityState);
    expect(B.run.state.round.rules.rngValue).toBe(A.run.state.round.rules.rngValue);
    expect(off.bodies).toEqual([]);
    expect(off.run.boundaries).toHaveLength(A.run.boundaries.length);
    for (let i = 0; i < A.run.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(off.run.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(A.run.boundaries[i]!));
      expect(off.run.boundaries[i]!.rng).toEqual(A.run.boundaries[i]!.rng);
      expect(off.run.boundaries[i]!.boundary).toEqual(A.run.boundaries[i]!.boundary);
    }
    expect(off.run.state.round.rules.rngValue).toBe(A.run.state.round.rules.rngValue);
  }, 240000);
});
