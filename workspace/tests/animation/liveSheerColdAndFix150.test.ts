import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation, type LiveMoveDeclineSink,
} from "../../src/engine/liveMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// Sheer Cold (329, docs/next-adapters-prep22.md s B.5, first body) + the #150 audit-6 fixes (Signal Beam shake owns x2, Fire Punch shiny
// decline, verifier display names, Curse target idle lift). Dense proofs: tools/integration/fixtures/fix150-live-receipt.json.
const DIR = "tools/integration/fixtures/sheer-cold-live";
const NAMES = readdirSync(DIR).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture;
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};
const rowsOf = (f: Fixture) => (f.attacker.geometry.side === "player" ? 191 : 190);

describe("live Sheer Cold (329) first-body adapter", () => {
  it("is registered (shadow row 0) with a side-constant body length", () => {
    // ISSUES #151: reclassified to faithful timing (the per-side age-171 restore lag, liveMoveTimingPolicy.ts 329); the exact proofs stand.
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(329);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(329);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[329]).toBe(0); // elevated FLYGON / GOLBAT opponent measured in species audit 7 (ISSUES #151)
    for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration({ moveId: 329, attacker, target: (1 - attacker) as 0 | 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }))
        .toBe(attacker === 0 ? 191 : 190);
    }
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    expect((status.faithfulTimingAdapters as { id: number }[]).map((e) => e.id)).toContain(329);
    expect((status.implementedAdapters as { id: number }[]).map((e) => e.id)).not.toContain(329);
  });

  it("covers 6 dense fixtures: accepted, prep22 alternate, SNORLAX-large x both orientations", () => {
    expect(NAMES).toHaveLength(6);
    for (const kind of ["alt", "extra"]) expect(NAMES.filter((n) => n.includes(`-${kind}-`))).toHaveLength(2);
  });

  it.each(NAMES)("%s: builds the cube / monbg / task inputs from production sources and renders every row", (name) => {
    const f = fixtureAt(name);
    const view0 = liveView(f, 0);
    const effect = view0.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never };
    const cfg = liveMoveAnimationPresentation(effect.request, view0.field, 0, undefined, undefined, effect.spriteOrderInput)!.config as any;
    expect(cfg.move).toBe("SHEER_COLD");
    const inputs = cfg.animationInputs;
    expect(inputs.cubeSpriteSlot).toBe(3);
    expect(inputs.taskSlots).toEqual({ fadeToBg: 0, cube: 0, updateMonBg: 1, sound: 2, clearMonBg: 0, restoreBg: 0 });
    expect(inputs.monbg.layer).toBe(f.target.geometry.side === "player" ? "bg2" : "bg1");
    expect(inputs.monbg.scroll).toEqual({ x: 32 - inputs.targetBattlePositionCenter.x, y: 32 - inputs.targetBattlePositionCenter.y });
    expect(liveMoveAnimationDuration(effect.request, view0.field)).toBe(rowsOf(f));
    for (const age of [0, 60, 120, rowsOf(f) - 1]) {
      const fb = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(fb, liveView(f, age));
      expect(fb.some((v) => v !== 0)).toBe(true);
    }
  });

  // later58 moved this pin: a later body (no firstBody) is live while both species rests are {0,0} and declines with an opponent ONIX
  // (docs/next-adapters-later58.md; tools/integration/fixtures/later58-live-receipt.json).
  it("declines an unknown order and a shiny battler; a later body only on rest-free battlers (later58)", () => {
    const f = fixtureAt("sheer-cold-player-dewgong-opponent-chansey");
    const view = liveView(f, 0);
    const effect = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: object };
    const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
    expect(call(effect.spriteOrderInput)).not.toBeNull();
    expect(call({ ...effect.spriteOrderInput, firstBody: undefined })).not.toBeNull();
    const onix = liveView({ ...f, target: { ...f.target, species: "ONIX" } }, 0);
    const onixEffect = onix.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: object };
    expect(liveMoveAnimationPresentation(onixEffect.request, onix.field, 0, undefined, undefined, onixEffect.spriteOrderInput as never)).not.toBeNull();
    expect(liveMoveAnimationPresentation(onixEffect.request, onix.field, 0, undefined, undefined,
      { ...onixEffect.spriteOrderInput, firstBody: undefined } as never)).toBeNull();
    // apx219: an unknown order still declines the proven body; it is drawn approximately with the known-entry first-action order.
    for (const unknown of [undefined, { known: false }]) {
      const sink: LiveMoveDeclineSink = {};
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, unknown as never, undefined, undefined,
        undefined, sink)).not.toBeNull();
      expect(sink.approximate).toBe("sprite-order-unknown");
    }
    const shiny = ((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) {
      expect(call(effect.spriteOrderInput, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
    }
  });

  it("route seed 267 / streak 35 (DEWGONG): body reached, adapter active every age, prompt reached, Scene ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(267, "on", [1], 35);
    const off = generatedCommandAnimationReplay(267, "off", [1], 35);
    const bodies = on.animations.filter((a) => a.moveId === 329 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(329, 191));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
  }, 240000);
});

describe("#150 receipt", () => {
  const path = "tools/integration/fixtures/fix150-live-receipt.json";
  it.skipIf(!existsSync(path))("pins every fixture 0 px twice fresh with identical digests", () => {
    const r = JSON.parse(readFileSync(path, "utf8"));
    expect(r.summary.allExactTwiceFresh).toBe(true);
    expect(r.summary.byGroup["sheer-cold-live"]).toBe(6);
    expect(r.summary.byGroup["audit6-defect-signal-beam-rattata"]).toBe(4);
    for (const row of r.rows) {
      expect(row.runs).toHaveLength(2);
      for (const run of row.runs) { expect(run.residualPixels).toBe(0); expect(run.exactRows).toBe(row.rows); }
      expect(row.freshRunsIdentical).toBe(true);
    }
  });
});
