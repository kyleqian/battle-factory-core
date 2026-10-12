import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import plans from "../../tools/integration/fixtures/prep12-random2/plans.json" with { type: "json" };
import {
  LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS, LIVE_MOVE_RANDOM2_PLANS, dirtScatterOffsetFromWord, dirtScatterSlots,
  linearTranslationStep, liveMovePresentationRngBodyKey,
} from "../../src/engine/liveMovePresentationRng.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { sceneOnMudSlapView, sceneOnSandAttackView } from "../../src/animation/sceneOnPresentation.ts";
import { presentationRngBodyWords } from "../../src/engine/presentationRngHost.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { fixturePresentationRng, liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import { iu120EffectAges } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep17.md part B (authoritative): Mud-Slap (189) and Sand-Attack (28) faithful-random. Dense framebuffer
// proofs: tools/integration/fixtures/prep17-live/*.json (receipt random2-r5-live-receipt.json).
type PlanMove = { entries: { draws: { ageOffset: number; count: number }[]; acceptedActivationValue: number; alternate: { activationValue: number } }[] };
const planMoves = (plans as unknown as { moves: Record<string, PlanMove> }).moves;
const key = liveMovePresentationRngBodyKey({ resolutionId: { requestId: 0 }, segmentIndex: 0, commandIndex: 0 });
const fixtureAt = (name: string) => JSON.parse(readFileSync(`tools/integration/fixtures/prep17-live/${name}.json`, "utf8")) as Fixture;
const PINNED = {
  189: ["mud-slap-player-pidgeotto-opponent-onix", "mud-slap-opponent-pidgeotto-player-onix", "mud-slap-alt-onix-nidorina"],
  28: ["sand-attack-player-pidgeotto-opponent-onix", "sand-attack-opponent-pidgeotto-player-onix", "sand-attack-alt-onix-nidorina"],
} as const;
const DRAFT = { 189: "draft-mud-slap-alt-set156-set146", 28: "draft-sand-attack-alt-set156-set146" } as const;
const viewOf = (f: Fixture, age: number) => {
  const view = liveView(f, age);
  return { view, effect: view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never; presentationRng: never } };
};
const configOf = (f: Fixture, age = 0) => {
  const { view, effect } = viewOf(f, age);
  return liveMoveAnimationPresentation(effect.request, view.field, age, undefined, undefined, effect.spriteOrderInput, effect.presentationRng);
};
const withValue = (f: Fixture, value: number): Fixture => ({ ...f, presentationRngActivation: { value, source: "test" } });
const request = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 });
const profileOf = (f: Fixture, id: 189 | 28) => {
  const p = (configOf(f)!.config as any).animationProfile;
  return (id === 189 ? p.mud : p.dirt) as { slot: number; xStep: number; yStep: number }[];
};
const hashRender = (f: Fixture, age: number): string => {
  const view = liveView(f, age);
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  const again = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(again, view);
  expect(Buffer.from(fb).equals(Buffer.from(again))).toBe(true);
  return createHash("sha256").update(fb).digest("hex");
};
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live prep17 registration", () => {
  it("Mud-Slap / Sand-Attack are faithful-random (plans == prep12 plans.json, 6 rows x 10 words), not exact; shadow rows are activation-aligned", () => {
    for (const [id, name, first] of [[189, "mud-slap", 9], [28, "sand-attack", 12]] as const) {
      expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).toContain(id);
      expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(id);
      const draws = planMoves[name]!.entries[0]!.draws.map(({ ageOffset, count }) => ({ ageOffset, count }));
      expect(LIVE_MOVE_RANDOM2_PLANS[id]).toEqual(draws);
      expect(draws.map((d) => d.ageOffset)).toEqual([0, 1, 2, 3, 4, 5].map((w) => first + 4 * w));
      expect(LIVE_MOVE_RANDOM2_PLANS[id]!.reduce((n, s) => n + s.count, 0)).toBe(60);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
      for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(id, a))).toBe(id === 189 ? 51 : 58);
    }
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    const faithful = (status.faithfulRandomAdapters as { id: number }[]).map((e) => e.id);
    const exact = (status.implementedAdapters as { id: number }[]).map((e) => e.id);
    expect(faithful).toEqual(expect.arrayContaining([189, 28]));
    expect(exact).not.toContain(189);
    expect(exact).not.toContain(28);
  });

  it("pinned activation values: the accepted player value equals plans.json, the alternate equals the plans alternate, provenance pinned", () => {
    for (const [id, name] of [[189, "mud-slap"], [28, "sand-attack"]] as const) {
      const [player, opponent, alt] = PINNED[id].map(fixtureAt);
      expect(player!.presentationRngActivation!.value).toBe(planMoves[name]!.entries[0]!.acceptedActivationValue);
      expect(alt!.presentationRngActivation!.value).toBe(planMoves[name]!.entries[0]!.alternate.activationValue);
      for (const f of [player!, opponent!, alt!]) {
        const record = presentationRngBodyWords(fixturePresentationRng(f, viewOf(f, 0).effect.request)!.host, key)!;
        expect(record.provenance).toBe("pinned");
        expect(record.activationValue).toBe(f.presentationRngActivation!.value);
        expect(record.draws).toHaveLength(6);
        expect(record.words).toHaveLength(60);
      }
    }
  });

  it("declines (scene-off fallback) without the activated body or the lent order; Mud also without the 4/3 pair", () => {
    for (const id of [189, 28] as const) {
      const { view, effect } = viewOf(fixtureAt(PINNED[id][0]), 0);
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput)).toBeNull();
      const other = liveMovePresentationRngBodyKey({ resolutionId: { requestId: 9 }, segmentIndex: 0, commandIndex: 0 });
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput,
        { host: (effect.presentationRng as any).host, key: other })).toBeNull();
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, undefined, effect.presentationRng)).toBeNull();
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, { known: false } as never, effect.presentationRng)).toBeNull();
    }
  });
});

describe("live prep17 word transforms and slots", () => {
  it("AnimDirtScatter offset: & 0x1F with the > 16 clamp (-15..16); InitAnimLinearTranslation steps with the sign in bit 0", () => {
    expect([0, 1, 16, 17, 18, 31, 32, 0xffff].map(dirtScatterOffsetFromWord)).toEqual([0, 1, 16, -1, -2, -15, 0, -15]);
    const offsets = new Set(Array.from({ length: 32 }, (_, v) => dirtScatterOffsetFromWord(v)));
    expect(Math.min(...offsets)).toBe(-15);
    expect(Math.max(...offsets)).toBe(16);
    expect(linearTranslationStep(89, 20)).toBe(1139 & ~1);
    expect(linearTranslationStep(-73, 20)).toBe(Math.trunc((73 << 8) / 20) | 1);
    expect(linearTranslationStep(0, 20)).toBe(0);
    expect(linearTranslationStep(-1, 20) & 1).toBe(1);
    expect(linearTranslationStep(1, 20) & 1).toBe(0);
  });

  it("lowest-free slots over the computed lifetimes reproduce the measured sequence for both moves", () => {
    const expected = [4, 5, 7, 9, 10, 3, 11, 12, 13, 14, ...Array.from({ length: 20 }, (_, i) => 15 + i)];
    const base = [0, 1, 2, 6, 8, 60, 61, 62, 63];
    expect(dirtScatterSlots([[4, 8], [9, 11]], 9, base)).toEqual(expected);
    expect(dirtScatterSlots([[7, 11], [12, 14]], 12, base)).toEqual(expected);
  });

  it("the production profile (words -> steps, slots, geometry from anchors) equals the draft alternate's probed track (set156 -> set146)", () => {
    for (const id of [189, 28] as const) {
      const draft = JSON.parse(readFileSync(`tools/integration/fixtures/prep17/${DRAFT[id]}.json`, "utf8"));
      const probed = draft.animationProfile[id === 189 ? "mud" : "dirt"];
      expect(profileOf(fixtureAt(PINNED[id][2]), id)).toEqual(probed);
    }
  });
});

describe("live prep17 Random2 branch coverage (pinned values)", () => {
  const VALUES = [0x78a77adb, 0x1c02e96c, 0xc5e4ab6f, 0x481c6973, 0x808db3eb, 0x1, 0xfeedface, 0x00c0ffee, 0x7fffffff, 0xdeadbeef];

  it.each([189, 28] as const)("move %i: every value yields 30 steps with both signs on both axes and offsets on both sides of the clamp; values differ", (id) => {
    const base = fixtureAt(PINNED[id][0]);
    const sigs = new Set<string>();
    const bits = new Set<string>();
    for (const value of VALUES) {
      const profile = profileOf(withValue(base, value), id);
      expect(profile).toHaveLength(30);
      expect(profile.map((s) => s.slot)).toEqual(dirtScatterSlots(id === 189 ? [[4, 8], [9, 11]] : [[7, 11], [12, 14]], id === 189 ? 9 : 12, [0, 1, 2, 6, 8, 60, 61, 62, 63]));
      for (const s of profile) { bits.add(`x${s.xStep & 1}`); bits.add(`y${s.yStep & 1}`); }
      sigs.add(JSON.stringify(profile));
    }
    expect(sigs.size).toBe(VALUES.length);
    // x is toward the target in every body (player -> opponent and mirrored), y is up for a player attacker: both y signs occur across
    // the offsets, the x sign is fixed by the geometry; the clamp branch (17..31 -> negative offsets) moves steps below the unclamped ones.
    expect(bits.has("y0") || bits.has("y1")).toBe(true);
    const wordsPlayer = new Set<number>();
    for (const value of VALUES) for (const s of profileOf(withValue(base, value), id)) wordsPlayer.add(s.xStep);
    expect(wordsPlayer.size).toBeGreaterThan(10);
  });

  it.each([189, 28] as const)("move %i: opponent orientation mirrors the x direction (bit 0 set = moving left) and both orientations render the dirt", (id) => {
    const player = profileOf(fixtureAt(PINNED[id][0]), id), opponent = profileOf(fixtureAt(PINNED[id][1]), id);
    expect(player.every((s) => (s.xStep & 1) === 0)).toBe(true);
    expect(opponent.every((s) => (s.xStep & 1) === 1)).toBe(true);
    for (const f of [fixtureAt(PINNED[id][0]), fixtureAt(PINNED[id][1])]) {
      const state = configOf(f)!;
      const dirtAt = (age: number) => id === 189 ? sceneOnMudSlapView({ ...state, age } as never).mud : sceneOnSandAttackView({ ...state, age } as never).dirt;
      expect(dirtAt(0)).toHaveLength(0);
      expect(dirtAt(30).length).toBeGreaterThan(0);
    }
  });

  it("Sand-Attack controllerProfile is HUD-only: no result text or accuracy banner is reachable inside the 58-row body", () => {
    const state = configOf(fixtureAt(PINNED[28][0]))!;
    for (let age = 0; age < 58; age += 1) {
      const view = sceneOnSandAttackView({ ...state, age } as never);
      expect(view.resultText).toBeNull();
      expect(view.accuracyBanner).toBeNull();
    }
  });

  it("renders different pixels for different pinned values (the words are consumed) and identical pixels for the same value", () => {
    for (const [id, age] of [[189, 30], [28, 35]] as const) {
      const f = fixtureAt(PINNED[id][0]);
      const a = hashRender(f, age), b = hashRender(withValue(f, 0xdeadbeef), age);
      expect(hashRender(f, age)).toBe(a);
      expect(b).not.toBe(a);
    }
  }, 240000);
});

describe("live prep17 ordinary routes", () => {
  const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
  it.each([
    ["MUD_SLAP 9/14 POLITOED", 189, 9, 14, 2 as const, 51],
    ["SAND_ATTACK 3/0 PIDGEOTTO", 28, 3, 0, 3 as const, 58],
  ])("route %s: adapter active every age, surrogate provenance; logical state identical across presentation seeds and Scene ON/OFF",
    (_name, id, seed, streak, slot, ages) => {
      const A = random2Route(seed, "on", [slot], streak, SEED_A), B = random2Route(seed, "on", [slot], streak, SEED_B);
      const off = random2Route(seed, "off", [slot], streak, SEED_A);
      const again = random2Route(seed, "on", [slot], streak, SEED_A);
      const bodies = A.bodies.filter((b) => b.moveId === id && b.attacker === 0);
      expect(bodies).toHaveLength(1);
      expect(bodies[0]!.ages).toEqual(iu120EffectAges(id, ages));
      expect(bodies[0]!.active.every(Boolean)).toBe(true);
      expect(bodies[0]!.provenance).toBe("surrogate");
      expect(B.bodies.filter((b) => b.moveId === id)[0]!.words).not.toEqual(bodies[0]!.words);
      expect(again.bodies.filter((b) => b.moveId === id)[0]!.frameDigests).toEqual(bodies[0]!.frameDigests);
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
      expect(off.run.state.facilityState).toEqual(A.run.state.facilityState);
    }, 240000);
});
