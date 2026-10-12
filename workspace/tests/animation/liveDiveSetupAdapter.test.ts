import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { diveAtAge, type DiveGeometry, type DiveProfile } from "../../src/animation/dive.ts";
import type { SceneOnDiveConfig } from "../../src/animation/sceneOnPresentation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveDiveSetupSplashBirth, liveMoveAnimationDuration, liveMoveAnimationPresentation,
  liveSemiInvulnerableHideBattler,
} from "../../src/engine/liveMoveAnimation.ts";
import {
  LIVE_DIVE_RANDOM2_PLANS, LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS, liveMoveRandom2Plan,
} from "../../src/engine/liveMovePresentationRng.ts";
import {
  LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION, dominantLiveMoveTimingPhase,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120EffectAges } from "../helpers/iu120Rows.ts";

// S10A Dive (291) SETUP body (docs/next-adapters-prep25.md s0.2 / B.1 / B.1a / C; scope cut: docs/s10a-random2-order-lend-blocker.md): D3
// droplets from the presentation host + the D4 player row-68 OAM transfer phase (liveMoveTimingPolicy.ts 291). Dense windows:
// tools/integration/fixtures/s10a-live/dive-*.json (receipt tools/integration/fixtures/d4d2-live-receipt.json, d4aTimingCheck.ts).
const DIR = "tools/integration/fixtures/s10a-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("dive-") && n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture & { timingPhase: string | null };
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const request = (attacker: 0 | 1, turn: number): BattleMoveAnimationRequest => ({
  moveId: 291, attacker, target: (1 - attacker) as 0 | 1, turn, power: 80, damage: 10, friendship: 70, multihit: 0 });
const presentationOf = (f: Fixture, age: number, activationValue?: number) => {
  const fixture = activationValue === undefined ? f : { ...f, presentationRngActivation: { value: activationValue, source: "test pin" } };
  const view = liveView(fixture, age);
  const e = view.effect as unknown as {
    request: BattleMoveAnimationRequest; spriteAllocatorInput: never; spriteOrderInput: never; presentationRng: never; battlerX2Input: never };
  return liveMoveAnimationPresentation(e.request, view.field, age, undefined, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng,
    e.battlerX2Input);
};

describe("S10A Dive (291) setup body: faithful timing with D3", () => {
  it("counts once, in faithful timing with d3 (never faithful random / scoped exact); the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(291);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(291);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(291);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[291]).toBe(0);
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 291)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[291]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(true);
    expect((status.faithfulRandomAdapters as { id: number }[]).some((e) => e.id === 291)).toBe(false);
  });

  it("setup 118 rows (player attacker) / 115 (opponent); the attack body (dive70: 93 rows) never hides; a setup's 20 words never draw an attack", () => {
    expect(liveMoveAnimationDuration(request(0, 0))).toBe(118);
    expect(liveMoveAnimationDuration(request(1, 0))).toBe(115);
    expect(liveMoveAnimationDuration(request(0, 1))).toBe(93);
    expect(liveMoveAnimationDuration(request(1, 1))).toBe(93);
    expect(liveSemiInvulnerableHideBattler(request(0, 0))).toBe(0);
    expect(liveSemiInvulnerableHideBattler(request(1, 0))).toBe(1);
    expect(liveSemiInvulnerableHideBattler(request(0, 1))).toBeNull();
    const f = fixtureAt("dive-alt-player-lanturn-golem");
    const view = liveView(f, 30);
    const e = view.effect as unknown as { spriteAllocatorInput: never; spriteOrderInput: never; presentationRng: never };
    // the setup fixture's host holds the setup's 20 words under this key: the attack body (56 words) declines on them
    expect(liveMoveAnimationPresentation(request(0, 1), view.field, 30, undefined, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng)).toBeNull();
    expect(liveMoveAnimationPresentation(request(0, 0), view.field, 30, undefined, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng)?.config.move)
      .toBe("DIVE");
    expect(liveMoveAnimationPresentation(request(0, 0), view.field, 30, undefined, e.spriteAllocatorInput, undefined, e.presentationRng)).toBeNull();
    expect(liveMoveAnimationPresentation(request(0, 0), view.field, 30, undefined, e.spriteAllocatorInput, e.spriteOrderInput, undefined)).toBeNull();
  });

  it("species audit 11: the setup length follows the attacker's ball rule on the displayed field (52 measured windows); words and row 68 follow the splash", () => {
    const AUDIT = "tools/integration/fixtures/species-audit-11/derived";
    const names = readdirSync(AUDIT).filter((n) => n.includes("-dive-"));
    expect(names).toHaveLength(52);
    const lengths = new Set<number>();
    for (const n of names) {
      const f = JSON.parse(readFileSync(`${AUDIT}/${n}`, "utf8")) as Fixture & { denseWindow: { startFrame: number; endFrame: number } };
      const view = liveView(f, 0), r = (view.effect as unknown as { request: BattleMoveAnimationRequest }).request;
      const rows = f.denseWindow.endFrame - f.denseWindow.startFrame + 1, side = r.attacker === 0 ? "player" : "opponent";
      expect(liveMoveAnimationDuration(r, view.field), n).toBe(rows);
      expect(liveDiveSetupSplashBirth(view.field, side), n).toBe(rows - 51);
      expect(liveMoveRandom2Plan(r, { diveSetupSplashBirth: rows - 51 }), n).toEqual([{ ageOffset: rows - 51, count: 20 }]);
      const shown = presentationOf(f, 0); // shiny attackers decline (palette)
      if (shown !== null) expect((shown.config as SceneOnDiveConfig).animationProfile.firstInactiveAge, n).toBe(rows - 1);
      lengths.add(rows);
    }
    expect([...lengths].sort()).toEqual([112, 113, 115, 118, 119]);
    // The default measured attackers keep today's plan object (no field: the side's measured default).
    expect(liveMoveRandom2Plan(request(0, 0), { diveSetupSplashBirth: 67 })).toBe(LIVE_DIVE_RANDOM2_PLANS.setup.player);
    expect(liveMoveRandom2Plan(request(0, 1), { diveSetupSplashBirth: 40 })).toBe(LIVE_DIVE_RANDOM2_PLANS.attack);
  });

  it("the Random2 plan: setup 20 words at 67 (player) / 64 (opponent); attack 20 at 16 then 4 at 30, 34, ..., 62 (56 words)", () => {
    expect(liveMoveRandom2Plan(request(0, 0))).toEqual([{ ageOffset: 67, count: 20 }]);
    expect(liveMoveRandom2Plan(request(1, 0))).toEqual([{ ageOffset: 64, count: 20 }]);
    expect(liveMoveRandom2Plan(request(0, 1))).toBe(LIVE_DIVE_RANDOM2_PLANS.attack);
    expect(LIVE_DIVE_RANDOM2_PLANS.attack.reduce((n, s) => n + s.count, 0)).toBe(56);
    for (const side of [0, 1] as const) expect(liveMoveRandom2Plan(request(side, 0))![0]!.ageOffset).toBe(liveMoveAnimationDuration(request(side, 0))! - 1 - 50);
  });

  it("the policy: the player row-68 OAM transfer phase, 4 of 6 measured player windows -> the reused-affine row (today's renderer default)", () => {
    const [p] = LIVE_MOVE_TIMING_POLICY[291]!.parameters;
    expect(p!.side).toBe("player");
    expect(dominantLiveMoveTimingPhase(p!.alternatives).phase).toBe("event");
    const players = NAMES.map(fixtureAt).filter((f) => f.attacker.geometry.side === "player");
    expect(players.filter((f) => f.timingPhase === "event")).toHaveLength(p!.alternatives[0]!.measured);
    expect(players.filter((f) => f.timingPhase === "no-event")).toHaveLength(p!.alternatives[1]!.measured);
  });

  it("pinned words: the probed activation values + 3 more; droplet velocities follow the words (both sign branches); frames differ", () => {
    const signs = { plusX: 0, minusX: 0, plusY: 0, minusY: 0 };
    const shapes = new Set<string>();
    for (const name of ["dive-alt-player-lanturn-golem", "dive-opponent-chinchou-player-onix"]) {
      const f = fixtureAt(name);
      for (const value of [f.presentationRngActivation!.value, 0, 0x12345678, 0xdeadbeef]) {
        const state = presentationOf(f, 80, value);
        const config = state!.config as SceneOnDiveConfig;
        expect(config.move).toBe("DIVE");
        for (const d of config.animationProfile.droplets) {
          if (d.velocityX > 736) signs.plusX += 1; else signs.minusX += 1;
          if (d.velocityY > 896) signs.plusY += 1; else signs.minusY += 1;
          expect(Math.abs(d.velocityX - 736)).toBeLessThanOrEqual(0x1ff);
          expect(Math.abs(d.velocityY - 896)).toBeLessThanOrEqual(0x7f);
        }
        const frame = diveAtAge(80, "setup", config.attacker.geometry.side, config.animationGeometry, config.animationProfile);
        shapes.add(JSON.stringify(frame.droplets.map((d) => [d.x2, d.y2])));
      }
    }
    expect(Math.min(signs.plusX, signs.minusX, signs.plusY, signs.minusY)).toBeGreaterThan(0);
    expect(shapes.size).toBe(8);
  });

  it("dive.ts anchor split is opt-in: absent fields reproduce the staged reducer exactly (ball / impact anchors)", () => {
    const geometry: DiveGeometry = { attackerCenter: { x: 72, y: 96 }, targetCenter: { x: 176, y: 40 }, attackerPictureOffset: { x: 72, y: 80 },
      targetPictureOffset: { x: 176, y: 40 }, attackerRestOffset: { x2: 0, y2: 0 }, targetRestOffset: { x2: 0, y2: 0 } };
    const f = fixtureAt("dive-player-chinchou-opponent-onix");
    const profile = (presentationOf(f, 0)!.config as SceneOnDiveConfig).animationProfile as DiveProfile;
    for (let age = 0; age <= 117; age += 1) {
      expect(diveAtAge(age, "setup", "player", { ...geometry, attackerBallOffset: geometry.attackerPictureOffset }, profile))
        .toEqual(diveAtAge(age, "setup", "player", geometry, profile));
    }
    const moved = diveAtAge(20, "setup", "player", { ...geometry, attackerBallOffset: { x: 72, y: 75 } }, profile);
    expect(moved.ball!.y).toBe(91);
  });

  it("the receipt: 9 setup windows x 2 fresh; policy-phase windows exact, other-phase windows only on the documented row 68", () => {
    expect(NAMES).toHaveLength(9);
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[]; maxPixelsPerRow: number } }[])
      .find((e) => e.id === 291)!.alternatePhaseResidual;
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/d4d2-live-receipt.json", "utf8"));
    const rows = (receipt.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string; affectedAges: number[]; maxPixelsPerRow: number }[] }[]).filter((r) => r.move === "DIVE");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(NAMES);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      expect(r.window).toBe(r.expectedDuration);
      if (r.selectedPhase) expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
      else {
        expect(r.runs[0]!.affectedAges).toEqual(documented.ages);
        expect(r.runs[0]!.maxPixelsPerRow).toBeLessThanOrEqual(documented.maxPixelsPerRow);
      }
    }
    expect(rows.filter((r) => r.selectedPhase)).toHaveLength(7);
  });

  it("ordinary route seed 111 slot 0: setup live every age, attacker hidden across the gap, attack live (dive70); seeds / Scene OFF keep gameplay", () => {
    const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
    const a = random2Route(111, "on", [0, 0], 0, SEED_A), a2 = random2Route(111, "on", [0, 0], 0, SEED_A);
    const b = random2Route(111, "on", [0, 0], 0, SEED_B), off = random2Route(111, "off", [0, 0], 0, SEED_A);
    const dives = a.bodies.filter((body) => body.moveId === 291 && body.attacker === 0);
    expect(dives.length).toBeGreaterThanOrEqual(2);
    const setup = dives.find((d) => (d.turn & 1) === 0)!, attack = dives.find((d) => (d.turn & 1) === 1)!;
    // The route's attacker is CLAMPERL (Y_PIC_OFFSET y 101): the ball rule gives 119 rows, as measured (species audit 11 clamperlA, 0 px).
    expect(setup.ages).toEqual(iu120EffectAges(291, 119));
    expect(setup.active.every(Boolean)).toBe(true);
    expect(setup.provenance).toBe("surrogate");
    expect(setup.words).toHaveLength(20);
    // dive70: the attack body plays live at every age (93 rows) on 56 surrogate words (tests/animation/liveDiveAttackAdapter.test.ts)
    expect(attack.ages).toEqual(iu120EffectAges(291, 93));
    expect(attack.active.every(Boolean)).toBe(true);
    expect(attack.words).toHaveLength(56);
    expect(a.run.stalled).toBe(false);
    expect(a.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(a2.bodies).toEqual(a.bodies);
    expect(b.bodies.find((d) => d.moveId === 291 && (d.turn & 1) === 0)!.words).not.toEqual(setup.words);
    expect(off.bodies).toEqual([]);
    const rules = (value: (typeof a.run.boundaries)[number]) => ({
      ...value.rules, rulesContext: { ...value.rules.rulesContext, hitMarker: value.rules.rulesContext.hitMarker & ~0x80 } });
    expect(b.run.boundaries).toEqual(a.run.boundaries);
    expect(off.run.boundaries).toHaveLength(a.run.boundaries.length);
    for (let i = 0; i < a.run.boundaries.length; i += 1) {
      expect(rules(off.run.boundaries[i]!)).toEqual(rules(a.run.boundaries[i]!));
      expect(off.run.boundaries[i]!.rng).toEqual(a.run.boundaries[i]!.rng);
    }
    expect(b.run.state.facilityState).toEqual(a.run.state.facilityState);
    expect(off.run.state.facilityState).toEqual(a.run.state.facilityState);
    expect(off.run.state.round.rules.rngValue).toBe(a.run.state.round.rules.rngValue);
  }, 240000);

  it("ordinary route seed 111: the player's Dive user is invisible from after its setup body until the attack body (turn gap), as Dig", () => {
    const seen: { kind: string; hidden: boolean }[] = [];
    generatedCommandAnimationReplay(111, "on", [0, 0], 0, false, false, (state) => {
      const res = state.battleResolutionPresentation;
      if (!res || res.lifecycle.phase !== "presenting") return;
      const view = createBattleResolutionPresentationRenderView(res);
      const e = view.effect;
      seen.push({ kind: e?.type === "move" ? `move:${e.request.moveId}:t${e.request.turn & 1}:a${e.request.attacker}` : "other", hidden: !view.visibility.player.sprite });
    });
    const firstAttack = seen.findIndex((h) => h.kind === "move:291:t1:a0");
    const lastSetup = seen.slice(0, Math.max(0, firstAttack)).map((h) => h.kind).lastIndexOf("move:291:t0:a0");
    expect(lastSetup).toBeGreaterThanOrEqual(0);
    expect(firstAttack).toBeGreaterThan(lastSetup);
    const gap = seen.slice(lastSetup + 1, firstAttack);
    expect(gap.length).toBeGreaterThan(0);
    expect(gap.every((h) => h.hidden)).toBe(true);
  }, 240000);
});
