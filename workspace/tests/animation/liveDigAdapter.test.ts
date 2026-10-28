import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS,
} from "../../src/engine/liveMovePresentationRng.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation,
  liveMoveOpponentShadowRow, liveSemiInvulnerableHideBattler,
} from "../../src/engine/liveMoveAnimation.ts";
import { digUnleashLend, lendLiveSpriteOrder, createLiveSpriteOrderHost } from "../../src/engine/liveSpriteOrderHost.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Extra } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep18.md s1.1 (authoritative): Dig exact adapter, setup 195 / unleash 68, body by request.turn bit 0.
// Dense framebuffer proofs: tools/integration/fixtures/prep18-live/*.json (receipt random2-r5-live-receipt.json).
const fixtureAt = (name: string) => JSON.parse(readFileSync(`tools/integration/fixtures/prep18-live/${name}.json`, "utf8")) as Fixture;
// digInputsFor(retained corpus rows) of tools/compare/verifyDigReducer.ts, saved once (that module does not typecheck when imported).
const corpusInputs = (JSON.parse(readFileSync("tools/integration/fixtures/prep18-live/dig-corpus-inputs.json", "utf8")) as { inputs: Record<string, any> }).inputs;
const ACCEPTED = { player: "dig-player-vibrava-opponent-chansey", opponent: "dig-opponent-vibrava-player-chansey" } as const;
const request = (attacker: 0 | 1, turn: number): BattleMoveAnimationRequest => ({
  moveId: 91, attacker, target: attacker === 0 ? 1 : 0, turn, power: 0, damage: 0, friendship: 70, multihit: 0 });
const configOf = (f: Fixture) => {
  const view = liveView(f, 0);
  const effect = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never; battlerX2Input: never };
  return liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput, undefined, effect.battlerX2Input);
};
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live Dig registration", () => {
  it("is a scoped-exact adapter (not faithful-random): durations by turn parity, hide predicate, shadow row on the setup body only", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(91);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(91);
    for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(attacker, 0))).toBe(195);
      expect(liveMoveAnimationDuration(request(attacker, 1))).toBe(68);
      expect(liveMoveAnimationDuration(request(attacker, 2))).toBe(195);
      expect(liveSemiInvulnerableHideBattler(request(attacker, 0))).toBe(attacker);
      expect(liveSemiInvulnerableHideBattler(request(attacker, 1))).toBeNull();
      expect(liveMoveOpponentShadowRow(request(attacker, 0))).toBe(0);
      expect(liveMoveOpponentShadowRow(request(attacker, 1))).toBeNull();
    }
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[91]).toBe(0);
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    expect((status.implementedAdapters as { id: number }[]).map((e) => e.id)).toContain(91);
    expect((status.faithfulRandomAdapters as { id: number }[]).map((e) => e.id)).not.toContain(91);
  });

  it("gates: a known lend; a later body (no first-body / after-setup lend) only while both species rests are {0,0}", () => {
    const f0 = fixtureAt(ACCEPTED.player + "-body0"), f1 = fixtureAt(ACCEPTED.player + "-body1");
    expect(configOf(f0)).not.toBeNull();
    expect(configOf(f1)).not.toBeNull();
    const at = (f: Fixture, input: unknown, opponent?: string) => {
      const view = liveView(opponent ? { ...f, target: { ...f.target, species: opponent } } : f, 0);
      const effect = view.effect as unknown as { request: BattleMoveAnimationRequest };
      return liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, input as never);
    };
    const later = { known: true as const, free: digUnleashLend().free };
    for (const f of [f0, f1]) {
      expect(at(f, undefined)).toBeNull();
      // later48 (docs/next-adapters-prep48.md): VIBRAVA / CHANSEY are rest-free, an opponent ONIX (rest x2 1) is not.
      expect(at(f, later)?.config.move).toBe("DIG");
      expect(at(f, later, "ONIX")).toBeNull();
    }
    expect(at(f0, { ...later, firstBody: true as const }, "ONIX")?.config.move).toBe("DIG");
    expect(at(f1, digUnleashLend(), "ONIX")?.config.move).toBe("DIG");
  });

  it("host lend: the post-setup order only for a Dig after a first-unit Dig setup with nothing since (hide invalidate allowed)", () => {
    const host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory"));
    const after = (bodies: number) => ({ ...host, digSetup: { units: 1 }, bodies });
    expect(lendLiveSpriteOrder(after(1), 91)?.afterDigSetup).toBe(true);
    expect(lendLiveSpriteOrder(after(2), 91)?.afterDigSetup).toBe(true);
    expect(lendLiveSpriteOrder(after(3), 91)?.afterDigSetup).toBeUndefined();
    expect(lendLiveSpriteOrder(after(2), 19)?.afterDigSetup).toBeUndefined();
    expect(lendLiveSpriteOrder({ ...host, bodies: 2 }, 91)?.afterDigSetup).toBeUndefined();
    expect(digUnleashLend().free).toHaveLength(55);
    expect(lendLiveSpriteOrder(host, 91)?.firstBody).toBe(true);
  });
});

describe("live Dig inputs equal the accepted corpora's reducer inputs", () => {
  for (const side of ["player", "opponent"] as const) {
    for (const body of ["setup", "unleash"] as const) {
      it(`${side} attacker, ${body}: every DigLiveInputs field produced by the live seam equals digInputsFor(retained corpus)`, () => {
        const reference = corpusInputs[`${side}-${body}`];
        const state = configOf(fixtureAt(`${ACCEPTED[side]}-body${body === "setup" ? 0 : 1}`))!;
        const config = state.config as any;
        const live = { ...config.animationInputs, body: config.body, attackerSide: config.attacker.geometry.side,
          targetSide: config.target.geometry.side, attackerCenter: config.attacker.geometry.animationCenter,
          targetCenter: config.target.geometry.battlePositionCenter };
        const { animationRngSeed: _echo, attackerSpecies: _a, targetSpecies: _t, ...expected } = reference;
        for (const [key, value] of Object.entries(expected)) expect({ key, value: (live as any)[key] }).toEqual({ key, value });
      });
    }
  }
});

describe("live Dig ordinary route", () => {
  it("seed 13 / streak 7 / slot 2 AZUMARILL: both bodies active every age, attacker hidden between turns, prompt reached, ON/OFF parity", () => {
    const hiddenByKind: { kind: string; hidden: boolean }[] = [];
    const on = generatedCommandAnimationReplay(13, "on", [2, 2], 7, false, false, (state) => {
      const res = state.battleResolutionPresentation;
      if (!res || res.lifecycle.phase !== "presenting") return;
      const view = createBattleResolutionPresentationRenderView(res);
      const e = view.effect;
      hiddenByKind.push({ kind: e?.type === "move" ? `move:${e.request.moveId}:t${e.request.turn}:a${e.request.attacker}` : "other", hidden: !view.visibility.player.sprite });
    });
    const off = generatedCommandAnimationReplay(13, "off", [2, 2], 7);
    const digs = on.animations.filter((a) => a.moveId === 91 && a.attacker === 0);
    expect(digs.slice(0, 2).map((b) => b.ages.length)).toEqual([195 + iu120Extra(91), 68 + iu120Extra(91)]);
    for (const body of digs.slice(0, 2)) {
      expect(body.ages).toEqual(Array.from({ length: body.ages.length }, (_, age) => age));
      expect(body.adapterActive.every(Boolean)).toBe(true);
    }
    // The player's Dig user is invisible from after its setup body until the unleash body (turn gap) and the opponent's turn in between.
    const firstUnleash = hiddenByKind.findIndex((h) => h.kind === "move:91:t1:a0");
    const lastSetup = hiddenByKind.slice(0, Math.max(0, firstUnleash)).map((h) => h.kind).lastIndexOf("move:91:t0:a0");
    expect(lastSetup).toBeGreaterThanOrEqual(0);
    expect(firstUnleash).toBeGreaterThan(lastSetup);
    const gap = hiddenByKind.slice(lastSetup + 1, firstUnleash);
    expect(gap.length).toBeGreaterThan(0);
    expect(gap.every((h) => h.hidden)).toBe(true);
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
  }, 240000);

  it("seed 9 / streak 7 / slot 1 POLITOED: a later Dig setup (not the battle's first body) is live every age (later48); ON/OFF parity", () => {
    const r = generatedCommandAnimationReplay(9, "on", [1, 1], 7);
    const off = generatedCommandAnimationReplay(9, "off", [1, 1], 7);
    const digs = r.animations.filter((a) => a.moveId === 91 && a.attacker === 0);
    expect(digs[0]!.adapterActive.every(Boolean)).toBe(true);
    const later = digs.slice(1).filter((b) => b.ages.length === 195 + iu120Extra(91));
    expect(later.length).toBeGreaterThan(0);
    expect(later.every((b) => b.adapterActive.every(Boolean))).toBe(true);
    expect(r.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(r.boundaries.length);
    for (let i = 0; i < r.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(r.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(r.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(r.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(r.state.facilityState).toEqual(off.state.facilityState);
    expect(r.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  }, 240000);
});
