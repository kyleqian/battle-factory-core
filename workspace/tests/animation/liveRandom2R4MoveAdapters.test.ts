import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import plans from "../../tools/integration/fixtures/prep14/plans.json" with { type: "json" };
import {
  LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS, LIVE_MOVE_RANDOM2_PLANS, liveMovePresentationRngBodyKey,
} from "../../src/engine/liveMovePresentationRng.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { sceneOnHailView, sceneOnRainDanceView, sceneOnWaterPulseView } from "../../src/animation/sceneOnPresentation.ts";
import { presentationRngBodyWords } from "../../src/engine/presentationRngHost.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { fixturePresentationRng, liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import { iu120Ages, iu120Extra, iu120EffectAges, ont193ScriptTail } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep14.md: Rain Dance (240) and Water Pulse (352) faithful-random, Hail (258) exact. The dense framebuffer
// proofs are tools/integration/fixtures/prep14-live/*.json (receipt random2-r4-live-receipt.json).
type PlanMove = Record<"player" | "opponent" | "alternate", { activationValue: number; draws: { ageOffset: number; count: number }[] }>;
const planMoves = (plans as unknown as { moves: Record<string, PlanMove> }).moves;
const key = liveMovePresentationRngBodyKey({ resolutionId: { requestId: 0 }, segmentIndex: 0, commandIndex: 0 });
const fixtureAt = (name: string) => JSON.parse(readFileSync(`tools/integration/fixtures/prep14-live/${name}.json`, "utf8")) as Fixture;
const viewOf = (f: Fixture, age: number) => {
  const view = liveView(f, age);
  const effect = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never; presentationRng: never };
  return { view, effect };
};
const configOf = (f: Fixture, age = 0) => {
  const { view, effect } = viewOf(f, age);
  return liveMoveAnimationPresentation(effect.request, view.field, age, undefined, undefined, effect.spriteOrderInput, effect.presentationRng);
};
const withValue = (f: Fixture, value: number): Fixture => ({ ...f, presentationRngActivation: { value, source: "test" } });
const request = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 });
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

const PINNED = {
  240: ["rain-dance-player-wooper-opponent-onix", "rain-dance-opponent-wooper-player-onix", "rain-dance-alt-poliwrath-golem"],
  352: ["water-pulse-player-lombre-opponent-onix", "water-pulse-opponent-lombre-player-onix", "water-pulse-alt-blastoise-golem"],
} as const;

describe("live prep14 registration", () => {
  it("Rain Dance / Water Pulse are faithful-random (plans == prep14 plans.json), Hail is exact; shadow rows are activation-aligned", () => {
    for (const [id, name] of [[240, "rain-dance"], [352, "water-pulse"]] as const) {
      expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).toContain(id);
      expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(id);
      expect(LIVE_MOVE_RANDOM2_PLANS[id]).toEqual(planMoves[name]!.player.draws.map(({ ageOffset, count }) => ({ ageOffset, count })));
      expect(planMoves[name]!.opponent.draws).toEqual(planMoves[name]!.player.draws);
    }
    expect(LIVE_MOVE_RANDOM2_PLANS[240]!.reduce((n, s) => n + s.count, 0)).toBe(160);
    expect(LIVE_MOVE_RANDOM2_PLANS[352]!.reduce((n, s) => n + s.count, 0)).toBe(12);
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(258);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(258);
    for (const id of [240, 352, 258]) expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    for (const a of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(240, a))).toBe(187);
      expect(liveMoveAnimationDuration(request(352, a))).toBe(160);
      expect(liveMoveAnimationDuration(request(258, a))).toBe(158);
    }
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    const faithful = (status.faithfulRandomAdapters as { id: number }[]).map((e) => e.id);
    const exact = (status.implementedAdapters as { id: number }[]).map((e) => e.id);
    expect(faithful).toEqual(expect.arrayContaining([240, 352]));
    expect(exact).toContain(258);
    expect(exact).not.toContain(240);
    expect(faithful).not.toContain(258);
  });

  it("the pinned activation values equal the plans.json accepted values and are what the adapter replays", () => {
    for (const [id, name] of [[240, "rain-dance"], [352, "water-pulse"]] as const) {
      const [player, opponent, alt] = PINNED[id].map(fixtureAt);
      for (const [f, who] of [[player, "player"], [opponent, "opponent"], [alt, "alternate"]] as const) {
        const value = planMoves[name]![who].activationValue;
        expect(f!.presentationRngActivation!.value).toBe(value);
        const config = configOf(f!)!.config as any;
        expect(id === 240 ? config.animationProfile.animationRngAtAge0 : config.animationInputs.animationRngSeed).toBe(value);
        const record = presentationRngBodyWords(fixturePresentationRng(f!, viewOf(f!, 0).effect.request)!.host, key)!;
        expect(record.provenance).toBe("pinned");
        expect(record.activationValue).toBe(value);
      }
    }
  });

  it("declines (scene-off fallback) without the activated body; Water Pulse also without the lent order", () => {
    for (const id of [240, 352] as const) {
      const f = fixtureAt(PINNED[id][0]);
      const { view, effect } = viewOf(f, 0);
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput)).toBeNull();
      const other = liveMovePresentationRngBodyKey({ resolutionId: { requestId: 9 }, segmentIndex: 0, commandIndex: 0 });
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput,
        { host: (effect.presentationRng as any).host, key: other })).toBeNull();
    }
    const { view, effect } = viewOf(fixtureAt(PINNED[352][0]), 0);
    expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, undefined, effect.presentationRng)).toBeNull();
    expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, { known: false } as never, effect.presentationRng)).toBeNull();
  });
});

describe("live prep14 Random2 branch coverage (pinned values)", () => {
  const VALUES = [...[0x6fc82a90, 0x436e9536, 0x7695eb87, 0x072069b2, 0xb57330b6, 0xc5e4ab6f], 0x808db3eb, 0x1, 0xfeedface, 0x00c0ffee, 0x7fffffff, 0xdeadbeef];

  it("Rain Dance: every pinned value spawns 80 drops across x 0..239 and y 0..79, distinct per value, never drawing on repaint", () => {
    const base = fixtureAt(PINNED[240][0]);
    const sets: string[] = [];
    for (const value of VALUES) {
      const state = configOf(withValue(base, value), 0)!;
      const births = new Set<string>();
      for (let age = 0; age < 187; age += 1) {
        const v = sceneOnRainDanceView({ ...state, age } as never);
        for (const d of v.drops) births.add(`${d.birthAge}:${d.x}:${d.y}`);
      }
      expect(births.size).toBe(80);
      const xs = [...births].map((b) => Number(b.split(":")[1])), ys = [...births].map((b) => Number(b.split(":")[2]));
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0); expect(Math.max(...xs)).toBeLessThan(240);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0); expect(Math.max(...ys)).toBeLessThan(80);
      sets.push([...births].sort().join(","));
    }
    expect(new Set(sets).size).toBe(VALUES.length);
  });

  it("Water Pulse: the ring-bubble offsets come from the pinned word (y 0..9 / x 0..9), both bubble sign branches occur, values differ", () => {
    const base = fixtureAt(PINNED[352][0]);
    const sigs: string[] = [];
    const signs = new Set<string>();
    for (const value of VALUES) {
      const state = configOf(withValue(base, value), 0)!;
      const bubbles: number[][] = [];
      // Ring bubbles are created on the ring emission ages (prep14 s1.2); read the pair created at each.
      for (const age of [86, 93, 100, 101, 108, 115]) {
        const v = sceneOnWaterPulseView({ ...state, age } as never);
        for (const s of v.sprites.filter((x) => x.kind === "ring-bubble" && x.data[0]! >= 19).sort((l, r) => l.slot - r.slot)) {
          bubbles.push([s.data[1]!, s.data[2]!]); signs.add(`${Math.sign(s.data[1]!)}/${Math.sign(s.data[2]!)}`);
        }
      }
      expect(bubbles).toHaveLength(12);
      sigs.push(JSON.stringify(bubbles));
    }
    expect(new Set(sigs).size).toBe(VALUES.length);
    // Both signs of the x offset occur across the pinned values (source sign rule battle_anim_water.c:1583-1608).
    // (data[1] = yDiff + randomY has the geometry's sign for this field; data[2] = -|randomX| / +|randomX| alternates per pair.)
    expect(new Set([...signs].map((s) => s.split("/")[1]))).toEqual(new Set(["-1", "1"]));
    expect(signs.size).toBeGreaterThan(1);
  });

  it("renders different pixels for different pinned values (the words are consumed) and identical pixels for the same value", () => {
    for (const [id, age] of [[240, 120], [352, 130]] as const) {
      const f = fixtureAt(PINNED[id][0]);
      const a = hashRender(f, age), b = hashRender(withValue(f, 0xdeadbeef), age);
      expect(hashRender(f, age)).toBe(a);
      expect(b).not.toBe(a);
    }
  }, 240000);
});

describe("live prep14 Hail", () => {
  it("derives the ten-entry target table from the anchors == the accepted staged literals in both orientations", () => {
    const literal = readFileSync("tools/compare/hailFramebuffer.ts", "utf8");
    for (const [name, orient] of [["hail-player-delibird-opponent-onix", "player-back"], ["hail-opponent-delibird-player-onix", "opponent-front"]] as const) {
      const profile = (configOf(fixtureAt(name))!.config as any).animationProfile;
      const m = new RegExp(`"${orient}": \\[\\n\\s+(.*)\\n`).exec(literal)!;
      const accepted = [...m[1]!.matchAll(/targetX: (-?\d+), targetY: (-?\d+), initialX: (-?\d+), initialY: -8, impact: (true|false)/g)]
        .map((x) => [+x[1]!, +x[2]!, +x[3]!, x[4] === "true"]);
      expect(accepted).toHaveLength(10);
      expect(profile.targets.map((t: any) => [t.targetX, t.targetY, t.initialX, t.impact])).toEqual(accepted);
      expect(profile.occupiedAffineMatrixSlots).toEqual([1, 2]);
    }
  });

  it("animationRngAtAge0 is an echo: any value gives an identical view (sprites, matrices, palette) bar the echoed rng", () => {
    const f = fixtureAt("hail-player-delibird-opponent-onix");
    const base = configOf(f)!;
    const other = { ...base, config: { ...(base.config as any), animationProfile: { ...(base.config as any).animationProfile, animationRngAtAge0: 0xdeadbeef } } };
    for (let age = 0; age < 158; age += 1) {
      const a = sceneOnHailView({ ...base, age } as never), b = sceneOnHailView({ ...other, age } as never);
      const { animationRng: _a, ...ra } = a as any; const { animationRng: _b, ...rb } = b as any;
      expect(rb).toEqual(ra);
    }
  });

  it("renders an alternate (GLALIE -> GOLEM) and both accepted orientations deterministically", () => {
    for (const name of ["hail-alt-glalie-golem", "hail-opponent-delibird-player-onix"]) {
      const f = fixtureAt(name);
      expect(new Set([0, 40, 80, 120, 157].map((age) => hashRender(f, age))).size).toBeGreaterThan(2);
    }
  }, 240000);
});

describe("live prep14 ordinary routes", () => {
  const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
  it.each([
    ["RAIN_DANCE 2/21 BLASTOISE", 240, 2, 21, 1 as const, 187],
    ["WATER_PULSE 7/7 CASTFORM", 352, 7, 7, 1 as const, 160],
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

  it("route HAIL 1/0 DELIBIRD: body reached, adapter active every age, following prompt reached, ON/OFF rules/RNG/boundary equal", () => {
    const on = generatedCommandAnimationReplay(1, "on", [3], 0), off = generatedCommandAnimationReplay(1, "off", [3], 0);
    const bodies = on.animations.filter((a) => a.moveId === 258 && a.attacker === 0);
    expect(bodies.map((b) => b.ages.length)).toEqual([158 + iu120Extra(258) + ont193ScriptTail(258)]);
    for (const body of bodies) {
      expect(body.ages).toEqual(iu120Ages(258, 158));
      expect(body.adapterActive.every(Boolean)).toBe(true);
    }
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
