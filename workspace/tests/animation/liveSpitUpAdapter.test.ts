import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../../src/engine/liveMovePresentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveSpitUpInputs, liveSpitUpRows } from "../../src/engine/liveSpitUpInputs.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// Spit Up (255) live adapter, all three Stockpile counters (docs/next-adapters-prep31.md s3; src/engine/liveSpitUpInputs.ts). Dense proofs:
// tools/integration/fixtures/s10a-live/spit-up-*.json (2 fresh prep22Probe runs per scenario), receipt tools/integration/fixtures/r5-live-receipt.json.
const DIR = "tools/integration/fixtures/s10a-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("spit-up-") && n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture & { requestFields: { turn: number } };
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/r5-live-receipt.json", "utf8"));
const effectOf = (f: Fixture, age = 0) => {
  const view = liveView(f, age);
  return { view, effect: view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never } };
};

describe("Spit Up (255) live adapter registration", () => {
  it("is a scoped-exact adapter (not faithful random / timing); 108 / 108 / 109 rows by the Stockpile counter; shadow row 0", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(255);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(255);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).not.toContain(255);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[255]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { moveId: 255, attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 10, friendship: 70, multihit: 0 };
      expect([0, 1, 2, 3, 4].map((turn) => liveMoveAnimationDuration({ ...base, turn }))).toEqual([null, 108, 108, 109, null]);
    }
  });

  it("the program rows: burst rows 59 (+ 67 for counter 3), later script rows shifted by one per earlier burst", () => {
    expect(liveSpitUpRows(1)).toMatchObject({ bursts: [59], spriteLag: [60], wave2: 67, shakeTarget: 74, splat2: 81, rows: 108 });
    expect(liveSpitUpRows(2)).toMatchObject({ bursts: [59], spriteLag: [60], wave2: 67, shakeTarget: 74, splat2: 81, rows: 108 });
    expect(liveSpitUpRows(3)).toMatchObject({ bursts: [59, 67], spriteLag: [60, 68], wave2: 67, shakeTarget: 75, splat2: 82, rows: 109 });
  });
});

describe("Spit Up dense windows", () => {
  it("12 windows: accepted KECLEON -> BLISSEY + prep29 SEVIPER -> GOLEM, both orientations, counters 1..3, from each scenario's own activation", () => {
    expect(NAMES).toHaveLength(12);
    for (const side of ["player", "opponent"]) for (const turn of [1, 2, 3]) {
      expect(NAMES.filter((n) => { const f = fixtureAt(n); return f.attacker.geometry.side === side && f.requestFields.turn === turn; })).toHaveLength(2);
    }
    for (const name of NAMES) {
      const f = fixtureAt(name);
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(f.requestFields.turn === 3 ? 109 : 108);
      expect(f.precedingBodies!.filter((b) => b.moveId === 254 && b.side === f.attacker.geometry.side)).toHaveLength(f.requestFields.turn);
    }
  });

  it("every window engages the adapter (known lend after the Stockpile / Growl units) with the request's counter", () => {
    for (const name of NAMES) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      expect(effect.request.turn).toBe(f.requestFields.turn);
      const presentation = liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput);
      expect((presentation!.config as any).move).toBe("SPIT_UP");
      expect((presentation!.config as any).animationInputs.stockpiles).toBe(f.requestFields.turn);
    }
  });

  it("the receipt: every window exact twice fresh (1300 / 1300 rows, 0 px)", () => {
    const rows = (receipt.windows as { fixture: string; move: string; rows: number; exactRows: number; residualPixels: number; expectedDuration: number;
      freshRuns: number; digests: string[]; identical: boolean }[]).filter((r) => r.move === "SPIT_UP");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(NAMES);
    for (const r of rows) {
      expect(r.freshRuns).toBe(2);
      expect(r.identical).toBe(true);
      expect(r.digests[1]).toBe(r.digests[0]);
      expect(r.residualPixels).toBe(0);
      expect(r.exactRows).toBe(r.rows);
      expect(r.rows).toBe(r.expectedDuration);
    }
    expect(receipt.summary.SPIT_UP).toEqual({ windows: 12, rows: 1300, exactRows: 1300, residualPixels: 0 });
  });
});

describe("Spit Up gates and inputs", () => {
  const f = fixtureAt("spit-up-opponent-3");
  const { view, effect } = effectOf(f);
  const call = (order: unknown, field = view.field, request = effect.request) =>
    liveMoveAnimationPresentation(request, field, 0, undefined, undefined, order as never);

  it("declines without a known lend, for a shiny battler and for a counter outside 1..3", () => {
    expect(call(effect.spriteOrderInput)).not.toBeNull();
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) expect(call(effect.spriteOrderInput, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
    for (const turn of [0, 4]) expect(call(effect.spriteOrderInput, view.field, { ...effect.request, turn })).toBeNull();
  });

  it("declines a non-zero target idle rest (an attacker rest engages: species audit 10); the burst-lag rows repeat the previous hardware OAM row", () => {
    const anchors = { spriteCenter: { x: 176, y: 47 }, picOffsetPoint: { x: 176, y: 47 }, frontIdleRest: { x2: 0, y2: 0 } };
    const player = { spriteCenter: { x: 72, y: 93 }, picOffsetPoint: { x: 72, y: 101 }, frontIdleRest: { x2: 0, y2: 0 } };
    const order = Array.from({ length: 64 }, (_, i) => i);
    const base = { counter: 3 as const, attackerSide: "opponent" as const, attackerSpecies: "KECLEON", targetSpecies: "BLISSEY", attacker: anchors, target: player,
      attackerYDelta: 7, palettes: { unfaded: Array(512).fill(0), faded: Array(512).fill(0), hardware: Array(512).fill(0) } as never, redOrbPalette: Array(16).fill(0), activationOrder: order,
      sort: (previous: readonly number[]) => [...previous] };
    expect(liveSpitUpInputs({ ...base, attacker: { ...anchors, frontIdleRest: { x2: 2, y2: 0 } } })?.duration).toBe(109);
    expect(liveSpitUpInputs({ ...base, target: { ...player, frontIdleRest: { x2: 0, y2: 1 } } })).toBeNull();
    const built = liveSpitUpInputs(base)!;
    expect(built.duration).toBe(109);
    const oam = (age: number) => (built.animationInputsAt(age).buffers as { hardwareOam: string[] }).hardwareOam;
    expect(oam(60)).toEqual(oam(59));
    expect(oam(68)).toEqual(oam(67));
    expect(oam(61)).not.toEqual(oam(60));
    const resources = (age: number) => built.animationInputsAt(age).resources as { redOrbLoaded: boolean; impactLoaded: boolean };
    expect([0, 1, 3, 4].map((age) => [resources(age).redOrbLoaded, resources(age).impactLoaded])).toEqual([[false, false], [true, false], [true, false], [true, true]]);
  });
});

describe("Spit Up ordinary route", () => {
  const rulesWithoutSceneMarker = (v: { rules: any }) => {
    const rc = v.rules.rulesContext;
    return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
  };
  // route = generated rentals, party member 0 knows Stockpile + Spit Up; Stockpile then Spit Up (tools/integration/s10aSpitUpRouteSearch.ts 3 1 20000,
  // seeds ascending: 33/7 and 128/7 SWALOT active over 108 rows, 156/7 SWALOT no Spit Up body).
  it("route 33/7 SWALOT (Stockpile, Spit Up): body live every age at counter 1, following prompt reached, Scene ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(33, "on", [0, 2], 7);
    const off = generatedCommandAnimationReplay(33, "off", [0, 2], 7);
    const bodies = on.animations.filter((a) => a.moveId === 255 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(255, 108));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
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
});
