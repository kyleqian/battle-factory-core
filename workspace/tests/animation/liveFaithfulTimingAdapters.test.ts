import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import paletteData from "../../src/data/gen/live-animation-palette-resources.json" with { type: "json" };
import { machPunchAtAge, machPunchFirstInactiveAge } from "../../src/animation/machPunch.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../../src/engine/liveMovePresentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION } from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveMachPunchInputs } from "../../src/engine/liveQ2Moves.ts";
import { LIVE_MOVE_RANDOM2_PLANS } from "../../src/engine/liveMovePresentationRng.ts";
import { meteorMashAtAge } from "../../src/animation/meteorMash.ts";
import { extrasensoryAtAge } from "../../src/animation/extrasensory.ts";
import { extrasensoryInputsFor } from "../../tools/compare/verifyExtrasensoryReducer.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { machPunchInputsFor } from "../../tools/compare/verifyMachPunchReducer.ts";
import { iu120Ages, iu120EffectAges } from "../helpers/iu120Rows.ts";

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

// Species audit 9 (ISSUES #152): AnimTask_AttackerPunchWithTrace moves the attacker relative to its idle rest, the traces copy it, the task ends
// with x2 = 0; a non-zero TARGET rest declines (unexplained age-60 residual). Receipts tools/integration/fixtures/s10a-part0/.
describe("Mach Punch idle rest (species audit 9)", () => {
  const c: any = machPunchInputsFor("opponent-front");
  const anchors = (s: any, pic: any, rest: { x2: number; y2: number }) => ({ picOffsetPoint: pic, spriteCenter: { x: s.x, y: s.y }, frontIdleRest: rest });
  const build = (attackerRest: { x2: number; y2: number }, targetRest: { x2: number; y2: number }) => liveMachPunchInputs({ attackerSide: c.attackerSide,
    attacker: anchors(c.attackerSprite, { x: 0, y: 0 }, attackerRest), target: anchors(c.targetSprite, c.targetPictureOrigin, targetRest),
    palettes: { unfaded: [], faded: [], hardware: [] } as never, spriteOrder: c.spriteOrder, firstBody: true, healthbarPalette: (paletteData as any).initial.healthbar });
  it("a non-zero target idle rest declines", () => {
    expect(build({ x2: 0, y2: 0 }, { x2: 2, y2: 0 })).toBeNull();
    expect(build({ x2: 0, y2: 0 }, { x2: 0, y2: 1 })).toBeNull();
  });
  it("the opponent attacker's rest offsets the punch and the traces, then x2 returns to 0", () => {
    // The host adds the sides / species (liveMoveAnimation.ts config); the corpus inputs carry them here.
    const zero = { ...c, ...build({ x2: 0, y2: 0 }, { x2: 0, y2: 0 })! }, rest = { ...c, ...build({ x2: -3, y2: 0 }, { x2: 0, y2: 0 })! };
    expect(machPunchAtAge(49, rest as never).battlers.attacker.sprite.x2).toBe(-3);
    for (let age = 50; age <= 57; age++) {
      expect(machPunchAtAge(age, rest as never).battlers.attacker.sprite.x2).toBe(machPunchAtAge(age, zero as never).battlers.attacker.sprite.x2 - 3);
      const traces = (s: any) => s.sprites.filter((t: any) => t.kind === "trace").map((t: any) => t.x2);
      expect(traces(machPunchAtAge(age, rest as never))).toEqual(traces(machPunchAtAge(age, zero as never)).map((x: number) => x - 3));
    }
    expect(machPunchAtAge(58, rest as never).battlers.attacker.sprite.x2).toBe(0);
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
  // later58 moved this pin: after an earlier body the lend is live while both species rests are {0,0} (docs/next-adapters-later58.md).
  it("declines (scene-off fallback) without the lend, with an unknown order and for a shiny battler; a later body only on rest-free battlers", () => {
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
    expect(call(later)).not.toBeNull();
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) expect(call(first, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
  });

  it("declines an opponent-side target with a non-zero idle rest (species audit 9 ONIX / RATTATA); engages an idle-rest opponent attacker", () => {
    const at = (path: string) => { const { view, effect } = effectOf(JSON.parse(readFileSync(path, "utf8")) as Fixture);
      return liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput); };
    const D9 = "tools/integration/fixtures/species-audit-9/derived";
    for (const species of ["onix", "rattata"]) {
      expect(at(`${D9}/${species}-mach-punch-player-hitmonchan-opponent-chansey.json`)).toBeNull();
      expect(at(`${D9}/${species}A-mach-punch-opponent-hitmonchan-player-chansey.json`)).not.toBeNull();
    }
  });
});

describe("faithful-timing ordinary routes", () => {
  const rulesWithoutSceneMarker = (v: { rules: any }) => {
    const rc = v.rules.rulesContext;
    return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
  };
  // route = generated rentals, party member 0 knows the move, one turn (tools/integration/r3ProfileRouteSearch.ts 183 4 1 4000, seeds ascending:
  // 11/7 and 39/7 HITMONTOP: Mach Punch is the first MOVE body but Intimidate's switch-in stat animation is an earlier unit; until later58 the
  // first-body gate declined it, now the later lend is live on rest-free battlers (docs/next-adapters-later58.md); 48/7 and 48/14 HITMONCHAN
  // reach the body as the battle's first unit).
  it.each([
    ["MACH_PUNCH 48/7 HITMONCHAN", 183, 48, 7, 0 as const, 110, true],
    ["MACH_PUNCH 48/14 HITMONCHAN", 183, 48, 14, 1 as const, 110, true],
    ["MACH_PUNCH 11/7 HITMONTOP (later body after Intimidate: later58)", 183, 11, 7, 2 as const, 110, true],
    // D4b: r3ProfileRouteSearch.ts 224 3 1 4000 (first candidates: 5/35 RHYDON active, 5/42 RHYDON declined, 23/14 SEAKING slot 1 active).
    ["MEGAHORN 5/35 RHYDON", 224, 5, 35, 0 as const, 177, true],
    // D4b: r3ProfileRouteSearch.ts 279 3 1 4000 (first candidates: 61/7 PINSIR slot 3 declined, 75/14 and 170/14 QWILFISH active).
    ["REVENGE 75/14 QWILFISH", 279, 75, 14, 0 as const, 145, true],
    // D4c: r3ProfileRouteSearch.ts 149 3 1 4000 (first candidates: 84/7 CHIMECHO active, 87/0 SPOINK active, 128/0 SPOINK no Psywave body).
    ["PSYWAVE 84/7 CHIMECHO", 149, 84, 7, 0 as const, 205, true],
    // D4c: r3ProfileRouteSearch.ts 326 4 1 4000 (first candidates: 9/35 EXPLOUD slot 3 active; 42/7 STANTLER declined: Intimidate's switch-in stat
    // animation is an earlier unit, so the first-body scanline gate declines the whole body (scene-off view, logic unchanged); 75/35 EXPLOUD active).
    ["EXTRASENSORY 9/35 EXPLOUD", 326, 9, 35, 3 as const, 161, true],
    // asl155: a player later body follows the player later lag policy (162 rows, 9 of 11) also when its adapter declines
    ["EXTRASENSORY 42/7 STANTLER (later body: scanline gate)", 326, 42, 7, 0 as const, 162, false],
  ])("route %s: body reached, following prompt reached, Scene ON/OFF parity", (_name, id, seed, streak, slot, ages, active) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const bodies = on.animations.filter((a) => a.moveId === id && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(id, ages));
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

// D4b faithful timing: Megahorn (prep24 source model + oam assembler, liveOamMoves.ts liveMegahornInputs) with both CPU-phase bits from the policy.
describe("D4b Megahorn (224) faithful timing", () => {
  const mh = NAMES.filter((n) => n.startsWith("megahorn-"));
  type MhFixture = D4Fixture & { timingPhases: Record<"optional-lag-age" | "bg-write-row", "event" | "no-event">; monbgCntRow: 7 | 8 };
  const receiptB = JSON.parse(readFileSync("tools/integration/fixtures/d4b-live-receipt.json", "utf8"));

  it("is a faithful-timing adapter (never scoped exact / faithful random); 177 rows both sides; the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(224);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(224);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(224);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[224]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 120, damage: 10, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 224 })).toBe(177);
    }
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 224)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[224]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(false);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 224)).toBe(false);
  });

  it("the policy counts are the measured phases of the 10 dense windows (prep24 six + the D4b tie-break four), both orientations", () => {
    expect(mh).toHaveLength(10);
    const fx = mh.map((n) => fixtureAt(n) as MhFixture);
    for (const side of ["player", "opponent"]) expect(fx.filter((f) => f.attacker.geometry.side === side)).toHaveLength(5);
    const [lag, row] = LIVE_MOVE_TIMING_POLICY[224]!.parameters;
    expect([lag!.kind, row!.kind]).toEqual(["optional-lag-age", "bg-write-row"]);
    for (const f of fx) {
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(f.timingPhases["optional-lag-age"] === "event" ? 177 : 176);
      expect(f.timingPhases["bg-write-row"]).toBe(f.monbgCntRow === 8 ? "event" : "no-event");
    }
    const count = (kind: "optional-lag-age" | "bg-write-row", phase: string) => fx.filter((f) => f.timingPhases[kind] === phase).length;
    expect(lag!.alternatives.map((a) => a.measured)).toEqual([count("optional-lag-age", "event"), count("optional-lag-age", "no-event")]);
    expect(row!.alternatives.map((a) => a.measured)).toEqual([count("bg-write-row", "event"), count("bg-write-row", "no-event")]);
    expect([lag!.chosen, row!.chosen, lag!.tieRuleUsed, row!.tieRuleUsed]).toEqual(["event", "event", false, false]);
  });

  it("the receipt: policy-phase windows exact twice fresh; other-phase windows differ only on the documented rows", () => {
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[]; maxPixelsPerRow: number } }[]).find((e) => e.id === 224)!.alternatePhaseResidual;
    const rows = (receiptB.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      measuredPhases: Record<string, string>; runs: { residualPixels: number; digest: string; affectedAges: number[]; maxPixelsPerRow: number }[] }[]).filter((r) => r.move === "MEGAHORN");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(mh);
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
        // The bg-write-row phase is pixel-neutral: a window whose only other-phase bit is the monbg row is exact.
        if (r.measuredPhases["optional-lag-age"] === "event") expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
      }
    }
    expect(rows.filter((r) => r.selectedPhase)).toHaveLength(6);
    expect(receiptB.testedSrcTree).toMatch(/^[0-9a-f]{40}$/);
    expect(receiptB.dirty).toBe(false);
  });

  it("gates: known lend required (any known lend, also after a Tackle); declines with an unknown order and for a shiny battler", () => {
    const f = fixtureAt("megahorn-alt-player-heracross-golem");
    const { view, effect } = effectOf(f);
    const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
    const lend = effect.spriteOrderInput as { known: true; free: number[]; firstBody?: true };
    expect(lend.known).toBe(true);
    expect(lend.firstBody).toBeUndefined();
    const presentation = call(lend);
    expect(presentation).not.toBeNull();
    expect((presentation!.config as any).move).toBe("MEGAHORN");
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) expect(call(lend, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
  });
});

// D4b faithful timing: Revenge (prep26 source model + oam assembler, liveOamMoves.ts liveRevengeInputs) with the monbg write row from the policy.
describe("D4b Revenge (279) faithful timing", () => {
  const rv = NAMES.filter((n) => n.startsWith("revenge-"));
  type RvFixture = D4Fixture & { timingPhases: Record<"bg-write-row", "event" | "no-event">; monbgCntRow: 4 | 5 };
  const receiptB = JSON.parse(readFileSync("tools/integration/fixtures/d4b-live-receipt.json", "utf8"));

  it("is a faithful-timing adapter (never scoped exact / faithful random); 145 rows both sides; the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(279);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(279);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(279);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[279]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 60, damage: 10, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 279 })).toBe(145);
    }
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 279)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[279]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(false);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 279)).toBe(false);
  });

  it("the policy counts are the measured monbg rows of the 6 dense windows (prep26 four + the D4b HITMONLEE -> GOLBAT pair)", () => {
    expect(rv).toHaveLength(6);
    const fx = rv.map((n) => fixtureAt(n) as RvFixture);
    for (const side of ["player", "opponent"]) expect(fx.filter((f) => f.attacker.geometry.side === side)).toHaveLength(3);
    const [row] = LIVE_MOVE_TIMING_POLICY[279]!.parameters;
    for (const f of fx) {
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(145);
      expect(f.timingPhases["bg-write-row"]).toBe(f.monbgCntRow === 5 ? "event" : "no-event");
    }
    expect(row!.alternatives.map((a) => a.measured)).toEqual([fx.filter((f) => f.monbgCntRow === 5).length, fx.filter((f) => f.monbgCntRow === 4).length]);
    expect([row!.kind, row!.age, row!.chosen, row!.tieRuleUsed]).toEqual(["bg-write-row", 5, "event", false]);
  });

  it("the receipt: every window exact twice fresh (the row-4 window too: the documented residual is empty)", () => {
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[] } }[]).find((e) => e.id === 279)!.alternatePhaseResidual;
    expect(documented.ages).toEqual([]);
    const rows = (receiptB.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string }[] }[]).filter((r) => r.move === "REVENGE");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(rv);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      expect(r.window).toBe(r.expectedDuration);
    }
    expect(rows.filter((r) => r.selectedPhase)).toHaveLength(5);
  });

  it("gates: known lend required; declines with an unknown order, for a shiny battler and for a non-zero idle rest", () => {
    const f = fixtureAt("revenge-alt-player-machoke-golem");
    const { view, effect } = effectOf(f);
    const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
    const lend = effect.spriteOrderInput as { known: true; free: number[]; firstBody?: true };
    expect(lend.known).toBe(true);
    const presentation = call(lend);
    expect(presentation).not.toBeNull();
    expect((presentation!.config as any).move).toBe("REVENGE");
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) expect(call(lend, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
  });

  it("the idle-rest gate is the target's only (species audit 9: ONIX / RATTATA opponent attackers engage, 0 px; targets decline)", () => {
    const at = (path: string) => { const { view, effect } = effectOf(JSON.parse(readFileSync(path, "utf8")) as Fixture);
      return liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput); };
    const D9 = "tools/integration/fixtures/species-audit-9/derived";
    for (const species of ["onix", "rattata"]) {
      expect(at(`${D9}/${species}-revenge-player-machamp-opponent-shuckle.json`)).toBeNull();
      expect((at(`${D9}/${species}A-revenge-opponent-qwilfish-player-shuckle.json`)!.config as any).move).toBe("REVENGE");
    }
  });
});

// D4b faithful timing + D3: Meteor Mash (the R1 reducer with the explicit restore lag from the policy; Random2 twinkles from the presentation host).
describe("D4b Meteor Mash (309) faithful timing with D3", () => {
  const mm = NAMES.filter((n) => n.startsWith("meteor-mash-"));
  const receiptB = JSON.parse(readFileSync("tools/integration/fixtures/d4b-live-receipt.json", "utf8"));

  it("counts once, in faithful timing with d3 (never faithful random / scoped exact); 215 rows both sides; the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(309);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(309);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(309);
    expect(LIVE_MOVE_RANDOM2_PLANS[309]!.reduce((n, step) => n + step.count, 0)).toBe(96);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[309]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 100, damage: 10, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 309 })).toBe(215);
    }
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 309)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[309]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(true);
    expect((status.faithfulRandomAdapters as { id: number }[]).some((e) => e.id === 309)).toBe(false);
  });

  it("the reducer's restore lag is an explicit input; absent = the accepted corpora's phases (the accepted player body is the L = 0 pin)", () => {
    const targets = { opponent: { x: 176, y: 42 }, player: { x: 72, y: 88 } } as const;
    for (const [targetSide, lag] of [["opponent", 0], ["player", 1]] as const) {
      const geometry = { targetSide, targetCenter: targets[targetSide] };
      for (let age = 0; age <= 215; age += 1) expect(meteorMashAtAge(age, { ...geometry, restoreLagRows: lag })).toEqual(meteorMashAtAge(age, geometry));
      expect(meteorMashAtAge(213 + lag - 1, { ...geometry, restoreLagRows: lag }).active).toBe(true);
      expect(meteorMashAtAge(213 + lag, { ...geometry, restoreLagRows: lag }).active).toBe(false);
    }
    // The policy phase L = 1 on a player-attacker body: one row longer, the fade-down one row later.
    const g = { targetSide: "opponent" as const, targetCenter: targets.opponent };
    expect(meteorMashAtAge(213, { ...g, restoreLagRows: 1 }).active).toBe(true);
    expect([196, 197].map((age) => meteorMashAtAge(age, { ...g, restoreLagRows: 1 }).fadeCoefficient)).toEqual([16, 15]);
    expect([196, 197].map((age) => meteorMashAtAge(age, g).fadeCoefficient)).toEqual([15, 14]);
  });

  it("the receipt: 5 windows x 2 fresh; the 3 lag windows exact, the 2 no-lag windows only on the documented fade rows", () => {
    expect(mm).toHaveLength(5);
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[]; maxPixelsPerRow: number } }[]).find((e) => e.id === 309)!.alternatePhaseResidual;
    const [lag] = LIVE_MOVE_TIMING_POLICY[309]!.parameters;
    const phases = mm.map((n) => fixtureAt(n).timingPhase);
    // prep17 banked 4 of 5 with the lag; the D4b METAGROSS -> GOLBAT pair adds one of each.
    expect(lag!.alternatives.map((a) => a.measured)).toEqual([4 + 1, 1 + 1]);
    expect(phases.filter((p) => p === "event")).toHaveLength(3);
    const rows = (receiptB.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string; affectedAges: number[]; maxPixelsPerRow: number }[] }[]).filter((r) => r.move === "METEOR_MASH");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(mm);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      if (r.selectedPhase) {
        expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
        expect(r.window).toBe(r.expectedDuration);
      } else {
        expect(r.runs[0]!.affectedAges).toEqual(documented.ages);
        expect(r.runs[0]!.maxPixelsPerRow).toBeLessThanOrEqual(documented.maxPixelsPerRow);
      }
    }
    for (const n of mm) expect(Number.isInteger((fixtureAt(n) as any).presentationRngActivation.value)).toBe(true);
  });

  it("D3 route 15/21 METAGROSS: live every age with surrogate words; two presentation seeds and Scene OFF keep gameplay / RNG / facility; same seed -> same frames", () => {
    const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
    const a = random2Route(15, "on", [0], 21, SEED_A), a2 = random2Route(15, "on", [0], 21, SEED_A);
    const b = random2Route(15, "on", [0], 21, SEED_B), off = random2Route(15, "off", [0], 21, SEED_A);
    const bodies = a.bodies.filter((body) => body.moveId === 309 && body.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120EffectAges(309, 215));
    expect(bodies[0]!.active.every(Boolean)).toBe(true);
    expect(bodies[0]!.provenance).toBe("surrogate");
    expect(bodies[0]!.words).toHaveLength(96);
    expect(a.run.stalled).toBe(false);
    expect(a.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(a2.bodies).toEqual(a.bodies);
    expect(b.bodies.filter((body) => body.moveId === 309)[0]!.words).not.toEqual(bodies[0]!.words);
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
});

// D4c faithful timing: Psywave (prep30 source model ported in livePsywaveInputs.ts + liveMoveOamAssembler.ts livePsywaveHardwareOamRows) with the
// optional late lag at task row 185 from the policy. Receipt tools/integration/fixtures/d4c-live-receipt.json (d4aTimingCheck.ts).
describe("D4c Psywave (149) faithful timing", () => {
  const pw = NAMES.filter((n) => n.startsWith("psywave-"));
  const receiptC = JSON.parse(readFileSync("tools/integration/fixtures/d4c-live-receipt.json", "utf8"));

  it("is a faithful-timing adapter (never scoped exact / faithful random); 205 rows both sides; the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(149);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(149);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(149);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[149]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 1, damage: 10, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 149 })).toBe(205);
    }
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 149)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[149]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(false);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 149)).toBe(false);
  });

  it("the policy counts are the measured phases of the 6 dense windows (accepted, prep25 ALAKAZAM -> GOLEM, prep30 ESPEON -> CROBAT, both orientations)", () => {
    expect(pw).toHaveLength(6);
    const fx = pw.map(fixtureAt);
    for (const side of ["player", "opponent"]) expect(fx.filter((f) => f.attacker.geometry.side === side)).toHaveLength(3);
    const [lag] = LIVE_MOVE_TIMING_POLICY[149]!.parameters;
    for (const f of fx) expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(f.timingPhase === "event" ? 205 : 204);
    expect(lag!.alternatives.map((a) => a.measured)).toEqual([fx.filter((f) => f.timingPhase === "event").length, fx.filter((f) => f.timingPhase === "no-event").length]);
    expect([lag!.kind, lag!.age, lag!.chosen, lag!.tieRuleUsed]).toEqual(["optional-lag-age", 185, "event", false]);
  });

  it("the receipt: the 4 lag windows exact twice fresh (ESPEON -> CROBAT player row 0 too); the 2 no-lag windows only on the documented fade rows", () => {
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[] } }[]).find((e) => e.id === 149)!.alternatePhaseResidual;
    expect(documented.ages).toEqual(Array.from({ length: 16 }, (_, i) => 186 + i));
    const rows = (receiptC.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string; affectedAges: number[] }[] }[]).filter((r) => r.move === "PSYWAVE");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(pw);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      if (r.selectedPhase) {
        expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
        expect(r.window).toBe(r.expectedDuration);
      } else {
        expect(r.runs[0]!.affectedAges).toEqual(documented.ages);
      }
    }
    expect(rows.filter((r) => r.selectedPhase)).toHaveLength(4);
  });

  it("gates: known lend required (first body and after a Tackle); declines with an unknown order and for a shiny battler", () => {
    for (const name of ["psywave-player-luvdisc-opponent-onix", "psywave-opponent-swablu-player-onix"]) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
      const lend = effect.spriteOrderInput as { known: true; free: number[] };
      expect(lend.known).toBe(true);
      const presentation = call(lend);
      expect(presentation).not.toBeNull();
      expect((presentation!.config as any).move).toBe("PSYWAVE");
      expect(call(undefined)).toBeNull();
      expect(call({ known: false })).toBeNull();
      const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
      for (const side of ["player", "opponent"] as const) expect(call(lend, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
    }
  });
});

// D4c faithful timing: Extrasensory (prep30 source model ported in liveExtrasensoryInputs.ts + liveMoveOamAssembler.ts liveExtrasensoryHardwareOamRows;
// reducer distortion window from the targetYElevation input) with two CPU-phase parameters from the policy (late lag, scanout split).
describe("D4c Extrasensory (326) faithful timing", () => {
  const xs = NAMES.filter((n) => n.startsWith("extrasensory-"));
  type XsFixture = D4Fixture & { timingPhases: Record<"optional-lag-age" | "scanline-split-line", "event" | "no-event"> };
  const receiptC = JSON.parse(readFileSync("tools/integration/fixtures/d4c-live-receipt.json", "utf8"));

  it("is a faithful-timing adapter (never scoped exact / faithful random); 161 rows both sides; the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(326);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(326);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(326);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[326]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 80, damage: 10, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 326 })).toBe(161);
    }
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 326)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[326]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(false);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 326)).toBe(false);
  });

  it("the policy counts are the measured phases of the 6 dense windows (accepted, prep25 ALAKAZAM -> GOLEM, prep30 ESPEON -> CROBAT, both orientations)", () => {
    expect(xs).toHaveLength(6);
    const fx = xs.map((n) => fixtureAt(n) as XsFixture);
    for (const side of ["player", "opponent"]) expect(fx.filter((f) => f.attacker.geometry.side === side)).toHaveLength(3);
    const [lag, split] = LIVE_MOVE_TIMING_POLICY[326]!.parameters;
    for (const f of fx) expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(f.timingPhases["optional-lag-age"] === "event" ? 162 : 161);
    for (const [p, kind] of [[lag, "optional-lag-age"], [split, "scanline-split-line"]] as const) {
      expect(p!.kind).toBe(kind);
      expect(p!.alternatives.map((a) => a.measured)).toEqual([fx.filter((f) => f.timingPhases[kind] === "event").length, fx.filter((f) => f.timingPhases[kind] === "no-event").length]);
      expect([p!.chosen, p!.tieRuleUsed]).toEqual(["no-event", false]);
    }
    // The split is measured on the opponent-target alternates only (player attackers vs GOLEM / CROBAT).
    expect(fx.filter((f) => f.timingPhases["scanline-split-line"] === "event").map((f) => [f.attacker.geometry.side, f.target.species]).sort())
      .toEqual([["player", "CROBAT"], ["player", "GOLEM"]]);
  });

  it("the receipt: policy-phase windows exact twice fresh; every other-phase window differs only on its documented rows", () => {
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[]; windows: Record<string, { ages: number[]; pixels: number }> } }[])
      .find((e) => e.id === 326)!.alternatePhaseResidual;
    expect(documented.ages).toEqual(Array.from({ length: 16 }, (_, i) => 143 + i));
    const rows = (receiptC.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string; affectedAges: number[] }[] }[]).filter((r) => r.move === "EXTRASENSORY");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(xs);
    for (const r of rows) {
      const tag = r.fixture.replace(`${DIR}/`, "").replace(".json", "");
      expect(r.violations).toEqual([]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      if (r.selectedPhase) {
        expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
        expect(r.window).toBe(r.expectedDuration);
      } else {
        expect(r.runs[0]!.affectedAges).toEqual(documented.windows[tag]!.ages);
        expect(r.runs[0]!.residualPixels).toBe(documented.windows[tag]!.pixels);
      }
    }
    expect(rows.filter((r) => r.selectedPhase)).toHaveLength(3);
    expect(documented.windows["extrasensory-alt-player-alakazam-golem"]!.pixels).toBe(1433);
  });

  it("the reducer's window is the target elevation input; absent = the accepted 8 / 48 windows (accepted corpora unchanged)", () => {
    for (const [window, lower] of [["player-back", 8], ["opponent-front", 48]] as const) {
      const input = extrasensoryInputsFor(window, undefined, 50);
      expect(extrasensoryAtAge(50, input).distortion.lower).toBe(lower);
      expect(extrasensoryAtAge(50, { ...input, targetYElevation: lower + 32 })).toEqual(extrasensoryAtAge(50, input));
      const elevated = extrasensoryAtAge(50, { ...input, targetYElevation: 34 }).distortion;
      expect([elevated.lower, elevated.upper]).toEqual([2, 66]);
    }
  });

  it("gates: first body only (scanline history); declines with an unknown order, after an earlier body, for a shiny battler", () => {
    const f = fixtureAt("extrasensory-alt-player-espeon-crobat");
    const { view, effect } = effectOf(f);
    const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
    const lend = effect.spriteOrderInput as { known: true; free: number[]; firstBody?: true };
    expect(lend.known).toBe(true);
    expect(lend.firstBody).toBe(true);
    const presentation = call(lend);
    expect(presentation).not.toBeNull();
    expect((presentation!.config as any).move).toBe("EXTRASENSORY");
    expect((presentation!.config as any).animationInputs.targetYElevation).toBe(34);
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    expect(call({ ...lend, firstBody: undefined })).toBeNull();
    const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) expect(call(lend, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
  });
});

// S10A faithful timing: Nightmare (prep32 source model ported in liveNightmareInputs.ts, packed by liveOamMoves.ts liveNightmareInputs) with two
// CPU-phase parameters from the policy (the optional lag at 149; the display-neutral BG-palette restore row). Every body follows Hypnosis + SLP.
// Receipt tools/integration/fixtures/ns-live-receipt.json (d4aTimingCheck.ts).
describe("Nightmare (171) faithful timing", () => {
  const nm = NAMES.filter((n) => n.startsWith("nightmare-"));
  const receiptN = JSON.parse(readFileSync("tools/integration/fixtures/ns-live-receipt.json", "utf8"));
  type NmFixture = D4Fixture & { timingPhases: Record<string, "event" | "no-event">; restoreRow: 148 | 149; precedingBodies: { moveId: number }[] };

  it("is a faithful-timing adapter (never scoped exact / faithful random); 168 rows both sides; the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(171);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(171);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(171);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[171]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 171 })).toBe(168);
    }
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 171)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[171]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(false);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 171)).toBe(false);
  });

  it("the policy counts are the measured phases of the 8 dense windows (accepted, prep25 GENGAR -> GOLEM, d4a HAUNTER -> SNORLAX / GENGAR -> GOLBAT)", () => {
    expect(nm).toHaveLength(8);
    const fx = nm.map(fixtureAt) as NmFixture[];
    for (const side of ["player", "opponent"]) expect(fx.filter((f) => f.attacker.geometry.side === side)).toHaveLength(4);
    // Nightmare needs a sleeping target: every window follows Hypnosis (95) and the SLP status animation.
    for (const f of fx) expect(f.precedingBodies.some((u) => u.moveId === 95)).toBe(true);
    const [lag, restore] = LIVE_MOVE_TIMING_POLICY[171]!.parameters;
    for (const f of fx) expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(f.timingPhases["optional-lag-age"] === "event" ? 168 : 167);
    const count = (kind: string, phase: string) => fx.filter((f) => f.timingPhases[kind] === phase).length;
    expect(lag!.alternatives.map((a) => a.measured)).toEqual([count("optional-lag-age", "event"), count("optional-lag-age", "no-event")]);
    expect(restore!.alternatives.map((a) => a.measured)).toEqual([count("palette-transfer-row", "event"), count("palette-transfer-row", "no-event")]);
    for (const f of fx) expect(f.timingPhases["palette-transfer-row"]).toBe(f.restoreRow === 149 ? "event" : "no-event");
    expect([lag!.kind, lag!.age, lag!.chosen, lag!.tieRuleUsed]).toEqual(["optional-lag-age", 149, "event", false]);
    expect([restore!.kind, restore!.age, restore!.chosen, restore!.tieRuleUsed]).toEqual(["palette-transfer-row", 149, "no-event", true]);
  });

  it("the receipt: every lag window exact twice fresh (GENGAR -> GOLBAT player row 0 too, either restore row); the no-lag windows only on 150..165", () => {
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[] } }[]).find((e) => e.id === 171)!.alternatePhaseResidual;
    expect(documented.ages).toEqual(Array.from({ length: 16 }, (_, i) => 150 + i));
    const rows = (receiptN.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string; affectedAges: number[] }[] }[]).filter((r) => r.move === "NIGHTMARE");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(nm);
    for (const r of rows) {
      const f = fixtureAt(r.fixture.replace(`${DIR}/`, "").replace(".json", "")) as NmFixture;
      expect(r.violations).toEqual([]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      if (f.timingPhases["optional-lag-age"] === "event") {
        expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
        expect(r.window).toBe(r.expectedDuration);
      } else {
        expect(r.runs[0]!.affectedAges).toEqual(documented.ages);
      }
    }
    expect(rows.filter((r) => r.selectedPhase)).toHaveLength(1);
  });

  it("gates: known lend required (every body follows Hypnosis + SLP); declines with an unknown order, for a shiny battler, for a non-zero idle rest", () => {
    for (const name of ["nightmare-player-haunter-opponent-shuckle", "nightmare-opponent-haunter-player-shuckle"]) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
      const lend = effect.spriteOrderInput as { known: true; free: number[] };
      expect(lend.known).toBe(true);
      const presentation = call(lend);
      expect(presentation).not.toBeNull();
      expect((presentation!.config as any).move).toBe("NIGHTMARE");
      expect(call(undefined)).toBeNull();
      expect(call({ known: false })).toBeNull();
      const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
      for (const side of ["player", "opponent"] as const) expect(call(lend, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
      // An opponent with a front idle rest (ONIX, species audit 9): the ShakeMon x2 program starts from 0, so the body declines; GOLEM (no rest) engages.
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 95, speciesSymbol: "ONIX", name: "ONIX" } as never })).toBeNull();
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 76, speciesSymbol: "GOLEM", name: "GOLEM" } as never })).not.toBeNull();
    }
  });

  // tools/integration/sleepRouteSearch.ts 171 4 1 4000 (first candidates: 30/28 HYPNO active, 71/14 HAUNTER and 96/28 HYPNO exceed the replay budget,
  // 166/14 HAUNTER active): Hypnosis on turn 1, Nightmare on turn 2.
  it.each([["30/28 HYPNO", 30, 28, [0, 1]], ["166/14 HAUNTER", 166, 14, [1, 2]]] as const)(
    "route %s: Hypnosis then Nightmare live on every age, following prompt reached, Scene ON/OFF parity", (_name, seed, streak, slots) => {
      const on = generatedCommandAnimationReplay(seed, "on", [...slots], streak);
      const off = generatedCommandAnimationReplay(seed, "off", [...slots], streak);
      const bodies = on.animations.filter((a) => a.moveId === 171 && a.attacker === 0);
      expect(bodies).toHaveLength(1);
      expect(bodies[0]!.ages).toEqual(iu120Ages(171, 168));
      expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
      expect(on.animations.some((a) => a.moveId === 95 && a.attacker === 0)).toBe(true);
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      expect(on.stalled).toBe(off.stalled);
      expect(off.boundaries).toHaveLength(on.boundaries.length);
      const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
      for (let i = 0; i < on.boundaries.length; i += 1) {
        expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
        expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
        expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
      }
      expect(on.state.facilityState).toEqual(off.state.facilityState);
      expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
    }, 240000);
});
