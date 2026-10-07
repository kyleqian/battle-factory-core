import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import paletteData from "../../src/data/gen/live-animation-palette-resources.json" with { type: "json" };
import { machPunchFirstInactiveAge } from "../../src/animation/machPunch.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../../src/engine/liveMovePresentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION } from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveMachPunchInputs } from "../../src/engine/liveQ2Moves.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { machPunchInputsFor } from "../../tools/compare/verifyMachPunchReducer.ts";

// D4a faithful timing (docs/faithful-timing.md, docs/faithful-timing-policy.md): Mach Punch through the Q2 builder family with the optional late lag
// from src/engine/liveMoveTimingPolicy.ts. Dense windows: tools/integration/fixtures/d4a-live/*.json (receipt d4a-live-receipt.json, checked by
// tools/integration/d4aTimingCheck.ts: zero residual in the policy phase, only the documented rows in the other phase).
const DIR = "tools/integration/fixtures/d4a-live";
type D4Fixture = Fixture & { timingPhase: "event" | "no-event" };
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as D4Fixture;
const NAMES = readdirSync(DIR).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/d4a-live-receipt.json", "utf8"));
const effectOf = (f: Fixture, age = 0) => {
  const view = liveView(f, age);
  return { view, effect: view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never } };
};

describe("faithful-timing registration (D4)", () => {
  it("Mach Punch is a faithful-timing adapter (never scoped exact / faithful random); the duration is the policy's dominant phase", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(183);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(183);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(183);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[183]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 40, damage: 10, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 183 })).toBe(110);
    }
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 183)!;
    const { evidence: _evidence, ...parameter } = LIVE_MOVE_TIMING_POLICY[183]!.parameters[0]!;
    expect(entry.timingParameters).toEqual([parameter]);
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(false);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 183)).toBe(false);
  });

  it("the accepted reducer default is unchanged (player 110 with the lag, opponent 109 without); the input selects the phase", () => {
    expect(machPunchFirstInactiveAge({ attackerSide: "player" })).toBe(110);
    expect(machPunchFirstInactiveAge({ attackerSide: "opponent" })).toBe(109);
    expect(machPunchFirstInactiveAge({ attackerSide: "opponent", optionalLateLag: true })).toBe(110);
    expect(machPunchFirstInactiveAge({ attackerSide: "player", optionalLateLag: false })).toBe(109);
  });
});

// The builder equals the accepted corpus-built reducer inputs field for field, except the phase input (the corpus is only the oracle of this test).
const diff = (a: any, b: any, path = ""): string[] => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diff(a[k], b[k], `${path}/${k}`));
  return [`${path}: built=${JSON.stringify(a)?.slice(0, 60)} corpus=${JSON.stringify(b)?.slice(0, 60)}`];
};
const IGNORE = /gameplayRng|animationRngSeed|^\/(attacker|target)(Side|Species)/;
describe("Mach Punch builder equals the accepted corpus-built inputs", () => {
  it.each(["player-back", "opponent-front"] as const)("%s", (o) => {
    const c: any = machPunchInputsFor(o);
    const anchors = (s: any, pic: any) => ({ picOffsetPoint: pic, spriteCenter: { x: s.x, y: s.y }, frontIdleRest: { x2: s.x2, y2: s.y2 } });
    const built = liveMachPunchInputs({ attackerSide: c.attackerSide, attacker: anchors(c.attackerSprite, { x: 0, y: 0 }), target: anchors(c.targetSprite, c.targetPictureOrigin),
      palettes: { unfaded: [], faded: [], hardware: [] } as never, spriteOrder: c.spriteOrder, firstBody: true, healthbarPalette: (paletteData as any).initial.healthbar });
    expect(diff(built, c).filter((l) => !IGNORE.test(l))).toEqual(["/optionalLateLag: built=true corpus=undefined"]);
  });
});

describe("Mach Punch dense windows (D4 check)", () => {
  const mp = NAMES.filter((n) => n.startsWith("mach-punch-"));
  it("8 windows (accepted, prep25 alternate, D4a SNORLAX / GOLBAT extras) x both orientations from each scenario's own activation", () => {
    expect(mp).toHaveLength(8);
    for (const side of ["player", "opponent"]) expect(mp.filter((n) => fixtureAt(n).attacker.geometry.side === side)).toHaveLength(4);
    for (const name of mp) {
      const f = fixtureAt(name);
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(f.timingPhase === "event" ? 110 : 109);
    }
  });

  it("the receipt: policy-phase windows exact twice fresh; other-phase windows differ only on the documented rows", () => {
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[]; maxPixelsPerRow: number } }[]).find((e) => e.id === 183)!.alternatePhaseResidual;
    const rows = (receipt.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string; affectedAges: number[]; maxPixelsPerRow: number }[] }[]).filter((r) => r.move === "MACH_PUNCH");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(mp);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.runs).toHaveLength(2);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      if (r.selectedPhase) {
        expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
        expect(r.window).toBe(r.expectedDuration);
      } else {
        expect(r.runs[0]!.affectedAges.every((age) => documented.ages.includes(age))).toBe(true);
        expect(r.runs[0]!.maxPixelsPerRow).toBeLessThanOrEqual(documented.maxPixelsPerRow);
      }
    }
    expect(rows.filter((r) => r.selectedPhase)).toHaveLength(5);
  });
});

describe("Mach Punch gates", () => {
  it("first body only; declines (scene-off fallback) without the lend, with an unknown order, after an earlier body, and for a shiny battler", () => {
    const f = fixtureAt("mach-punch-alt-player-machamp-golem");
    const { view, effect } = effectOf(f);
    const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
    const first = effect.spriteOrderInput as { known: true; free: number[]; firstBody?: true };
    expect(first.firstBody).toBe(true);
    const presentation = call(first);
    expect(presentation).not.toBeNull();
    expect((presentation!.config as any).animationInputs.optionalLateLag).toBe(true);
    expect((presentation!.config as any).animationInputs.tracePalette).toEqual({ bank: 9, bgr555: (paletteData as any).initial.healthbar });
    const { firstBody: _drop, ...later } = first;
    expect(call(later)).toBeNull();
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) expect(call(first, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
  });
});

describe("faithful-timing ordinary routes", () => {
  const rulesWithoutSceneMarker = (v: { rules: any }) => {
    const rc = v.rules.rulesContext;
    return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
  };
  // route = generated rentals, party member 0 knows the move, one turn (tools/integration/r3ProfileRouteSearch.ts 183 4 1 4000, seeds ascending:
  // 11/7 and 39/7 HITMONTOP: Mach Punch is the first MOVE body but Intimidate's switch-in stat animation is an earlier unit, so the first-body gate
  // declines the whole body (scene-off view, logic unchanged); 48/7 and 48/14 HITMONCHAN reach the body as the battle's first unit).
  it.each([
    ["MACH_PUNCH 48/7 HITMONCHAN", 183, 48, 7, 0 as const, 110, true],
    ["MACH_PUNCH 48/14 HITMONCHAN", 183, 48, 14, 1 as const, 110, true],
    ["MACH_PUNCH 11/7 HITMONTOP (later body: gate)", 183, 11, 7, 2 as const, 110, false],
  ])("route %s: body reached, following prompt reached, Scene ON/OFF parity", (_name, id, seed, streak, slot, ages, active) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const bodies = on.animations.filter((a) => a.moveId === id && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(Array.from({ length: ages }, (_, age) => age));
    if (active) expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    else expect(bodies[0]!.adapterActive.some(Boolean)).toBe(false);
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
