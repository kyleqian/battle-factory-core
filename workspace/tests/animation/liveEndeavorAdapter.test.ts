import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import {
  advanceLiveBattlerX2Host, createLiveBattlerX2Host, invalidateLiveBattlerX2Host, liveMoveBattlerX2InputForBody,
  liveStaleMovePowerTaintedBy,
} from "../../src/engine/liveBattlerX2History.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { w3Register } from "../../tools/integration/prep27W3Predicate.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// Endeavor (283) live script-body adapter (docs/next-adapters-prep27.md s0.2 / s5). Dense proofs: tools/integration/fixtures/baton-endeavor-live-receipt.json.
const DIR = "tools/integration/fixtures/baton-endeavor-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("endeavor-") && n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture;
const request = (attacker: 0 | 1, power = 40): BattleMoveAnimationRequest =>
  ({ moveId: 283, attacker, target: (1 - attacker) as 0 | 1, turn: 0, power, damage: 0, friendship: 70, multihit: 0 }) as never;
const message = (messageId: string, attacker?: 0 | 1) => ({ sequence: 1, payload: { kind: "message", messageId, substitutions: [],
  ...(attacker === undefined ? {} : { actionSnapshot: { attacker, currentMove: 33, currentMovePosition: 0 } }) } }) as never;

describe("live Endeavor (283) script-body adapter", () => {
  it("is registered with the 68-row script body (67 active + cleanup) and the activation-frame shadow row", () => {
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).toContain(283);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[283]).toBe(0);
    for (const attacker of [0, 1] as const) expect(liveMoveAnimationDuration(request(attacker))).toBe(68);
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    expect((status.implementedAdapters as { id: number }[]).map((e) => e.id)).toContain(283);
  });

  it("covers 8 dense fixtures: ONIX/GROVYLE, DIGLETT/CHANSEY, ABRA/BLISSEY both orientations + elevated GOLBAT target / attacker", () => {
    expect(NAMES).toHaveLength(8);
    for (const side of ["player", "opponent"]) expect(NAMES.filter((n) => n.includes(`-${side}-`))).toHaveLength(4);
    // prep27 stale powers: 40 for the player attacker (a faster Quick Attack's W1), 0 for the opponent's first action.
    for (const name of NAMES) expect(fixtureAt(name).requestFields!.power).toBe(name.includes("-player-") ? 40 : 0);
  });

  it.each(NAMES)("%s: profile from the live field + register, every sampled row renders", (name) => {
    const f = fixtureAt(name);
    const view0 = liveView(f, 0);
    const effect = view0.effect as unknown as { request: BattleMoveAnimationRequest };
    const cfg = liveMoveAnimationPresentation(effect.request, view0.field, 0)!.config as any;
    expect(cfg.move).toBe("ENDEAVOR");
    const side = f.attacker.geometry.side;
    expect(cfg.animationProfile.staleMovePower).toBe(f.requestFields!.power);
    expect(cfg.animationProfile.attackerYOffset).toBe(createBattleCommandFieldArtView(view0.field)[side].coords.yOffset);
    expect(cfg.animationProfile.hpDrainFirstAge).toBe(Number.POSITIVE_INFINITY);
    expect(liveMoveAnimationDuration(effect.request, view0.field)).toBe(68);
    for (const age of [0, 8, 16, 40, 67]) {
      const fb = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(fb, liveView(f, age));
      expect(fb.some((v) => v !== 0)).toBe(true);
    }
  });

  it("declines a shiny battler and a possibly W3-written register", () => {
    const view = liveView(fixtureAt("endeavor-prep27-player-diglett-chansey"), 0);
    const req = (view.effect as any).request;
    expect(liveMoveAnimationPresentation(req, view.field, 0)).not.toBeNull();
    const shiny = ((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) {
      expect(liveMoveAnimationPresentation(req, { ...view.field, [side]: { ...view.field[side], personality: shiny } }, 0)).toBeNull();
    }
    expect(liveMoveAnimationPresentation(req, view.field, 0, undefined, undefined, undefined, undefined,
      { zeroed: [], staleMovePowerUnknown: true })).toBeNull();
    expect(liveMoveAnimationPresentation(req, view.field, 0, undefined, undefined, undefined, undefined, { zeroed: [] })).not.toBeNull();
  });

  it("W3 taint: a player (or unknown) NVE / immune print marks the register unknown; the opponent's does not (battle_tv.c :1429)", () => {
    expect(liveStaleMovePowerTaintedBy(message("STRINGID_NOTVERYEFFECTIVE", 0))).toBe(true);
    expect(liveStaleMovePowerTaintedBy(message("STRINGID_ITDOESNTAFFECT", 0))).toBe(true);
    expect(liveStaleMovePowerTaintedBy(message("STRINGID_NOTVERYEFFECTIVE"))).toBe(true);
    expect(liveStaleMovePowerTaintedBy(message("STRINGID_NOTVERYEFFECTIVE", 1))).toBe(false);
    expect(liveStaleMovePowerTaintedBy(message("STRINGID_SUPEREFFECTIVE", 0))).toBe(false);
    const resolution = (events: unknown[]) => ({ resolutionId: { requestId: 7 }, segmentIndex: 0, segments: [{ events }] }) as never;
    const host = createLiveBattlerX2Host();
    const clean = advanceLiveBattlerX2Host(host, resolution([message("STRINGID_NOTVERYEFFECTIVE", 1)]), Number.POSITIVE_INFINITY);
    expect(clean.staleMovePowerUnknown).toBeUndefined();
    const tainted = advanceLiveBattlerX2Host(host, resolution([message("STRINGID_NOTVERYEFFECTIVE", 0)]), Number.POSITIVE_INFINITY);
    expect(tainted.staleMovePowerUnknown).toBe(true);
    // Only Endeavor bodies read it; other bodies keep their x2 input unchanged.
    expect(liveMoveBattlerX2InputForBody(tainted, { moveId: 283 })).toEqual({ zeroed: [], staleMovePowerUnknown: true });
    expect(liveMoveBattlerX2InputForBody(tainted, { moveId: 33 })).toBeUndefined();
    expect(liveMoveBattlerX2InputForBody(clean, { moveId: 283 })).toBeUndefined();
    // Unseen events (the battle advanced without a presented resolution) taint it; a party-menu x2 reset does not.
    expect(invalidateLiveBattlerX2Host(host, "party menu").staleMovePowerUnknown).toBeUndefined();
    expect(invalidateLiveBattlerX2Host(host, "unseen", true).staleMovePowerUnknown).toBe(true);
    expect(createLiveBattlerX2Host(undefined, true).staleMovePowerUnknown).toBe(true);
    // The measured lab case (rollout-endeavor-endeavor-tv-order: ROM left 40 after W3) is expressed as a decline.
    expect(w3Register(["MOVE_ROCK_SLIDE", "MOVE_TACKLE", "MOVE_QUICK_ATTACK", "MOVE_ENDEAVOR"])).toBe(40);
  });

  const ROUTES = [
    { seed: 58, streak: 0, slots: [0, 1] as (0 | 1 | 2 | 3)[], species: "GROVYLE", power: 20 },
    { seed: 38, streak: 7, slots: [3, 1] as (0 | 1 | 2 | 3)[], species: "SWELLOW", power: 65 },
    { seed: 52, streak: 0, slots: [2] as (0 | 1 | 2 | 3)[], species: "BEEDRILL", power: 0 },
  ];
  for (const route of ROUTES) {
    it(`route seed ${route.seed} / streak ${route.streak} (${route.species}, register ${route.power}): active every age, prompt, Scene ON/OFF parity`, () => {
      const powers: number[] = [];
      const on = generatedCommandAnimationReplay(route.seed, "on", route.slots, route.streak, false, true, (state) => {
        const res = state.battleResolutionPresentation as any;
        const cmd = res?.segments[res.segmentIndex]?.commands[res.commandIndex];
        if (cmd?.type === "move-animation" && cmd.animation?.moveId === 283 && res.lifecycle.phaseElapsed === 0) powers.push(cmd.animation.power);
      });
      const off = generatedCommandAnimationReplay(route.seed, "off", route.slots, route.streak, false, true);
      const bodies = on.animations.filter((a) => a.moveId === 283 && a.attacker === 0);
      expect(bodies).toHaveLength(1);
      expect(bodies[0]!.player).toBe(route.species);
      expect(bodies[0]!.ages).toEqual(iu120Ages(283, 68));
      expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
      expect(powers).toEqual([route.power]);
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      const strip = (v: any) => ({ ...v, nextEventSequence: 0,
        rules: { ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } } });
      expect(JSON.stringify(on.boundaries.map(strip))).toBe(JSON.stringify(off.boundaries.map(strip)));
      expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
      expect(JSON.stringify(on.state.facilityState)).toBe(JSON.stringify(off.state.facilityState));
    });
  }
});
