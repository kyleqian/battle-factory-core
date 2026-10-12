import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GENERAL_RAIN_SPAWN_AGES } from "../src/animation/rainDance.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { liveBattlerAnchors } from "../src/engine/liveMoveAnimation.ts";
import {
  activateLiveMovePresentationRng, GENERAL_RAIN_RANDOM2_PLAN, LIVE_MOVE_RANDOM2_PLANS, liveMovePresentationRngBodyKey, liveMoveRandom2Plan,
  tickLiveMovePresentationRngSession,
} from "../src/engine/liveMovePresentationRng.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, DEFERRED_LEND_MOVE_IDS, lendLiveSpriteOrder,
  markLiveSpriteOrderDeferredBody, type LiveSpriteOrderHost,
} from "../src/engine/liveSpriteOrderHost.ts";
import { liveDirtScatterProfile, liveWordsUnitPostFree } from "../src/engine/liveMoveAnimation.ts";
import { createPresentationRngState } from "../src/engine/presentationRng.ts";
import {
  advancePresentationRngHost, createPresentationRngHost, createPresentationRngSession, presentationRngBodyWords, presentationRngPlanWords,
  recordPresentationRngSubStream, type PresentationRngHost, type PresentationRngWords,
} from "../src/engine/presentationRngHost.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, resolveSpriteOrderDeferredLend, spriteOrderTrackerLend, type SpriteOrderDeferredLend,
} from "../src/engine/spriteOrderEventTransform.ts";
import {
  KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, knownEntrySpriteOrderState, spriteOrderWithOccupiedPrefix,
} from "../src/engine/spriteOrderProvider.ts";
import { generalAnimationPresentationRngKey, isWordsOrderDeferredUnit } from "../src/engine/wordsOrderUnits.ts";
import { PRESENTATION_RNG_POLICY_V1, presentationRngFromTrace, presentationRngTraceMetadata } from "../src/engine/presentationRngHost.ts";
import { words46Route } from "../tools/integration/words46RouteScan.ts";
import { iu120EffectAges } from "./helpers/iu120Rows.ts";

// S10A words46 (docs/next-adapters-prep46.md): the generalized seam-resolved deferred lend after Random2-words order units, against the prep46
// probe units (tools/integration/fixtures/words46/prep46-units.json: ROM sSpriteOrder free order F0 at every unit edge, RAM-read words; 12 jobs
// x 2 fresh direct-mGBA runs, A == B).
type Side = "player" | "opponent";
type Unit = { kind: "body" | "gap"; frame: number; F0: number[]; mv?: number; length?: number; draws?: number[][]; activationValue?: number };
type Job = { attackerSide: Side; species: Record<Side, number>; identicalAB: boolean; units: Unit[] };
const JOBS = (JSON.parse(readFileSync("tools/integration/fixtures/words46/prep46-units.json", "utf8")) as { jobs: Record<string, Job> }).jobs;

const isWordsBody = (unit: Unit) => unit.kind === "body" && unit.draws !== undefined && unit.draws.length > 0;
const isGeneralRain = (unit: Unit) => isWordsBody(unit) && unit.mv === 0;
const planOf = (unit: Unit) => isGeneralRain(unit) ? GENERAL_RAIN_RANDOM2_PLAN : LIVE_MOVE_RANDOM2_PLANS[unit.mv!]!;
/** The production words law from the RAM activation value (pinned provenance): the per-frame step, then the plan's draws. */
const wordsOf = (unit: Unit): PresentationRngWords =>
  presentationRngPlanWords(createPresentationRngState(unit.activationValue!, "pinned"), planOf(unit));
const anchorsOf = (job: Job) => {
  const art = createBattleCommandFieldArtView({ player: { species: job.species.player }, opponent: { species: job.species.opponent } } as never);
  return { player: liveBattlerAnchors("player", art).picOffsetPoint, opponent: liveBattlerAnchors("opponent", art).picOffsetPoint };
};
const foeOf = (side: Side): Side => side === "player" ? "opponent" : "player";
const unitOf = (unit: Unit, side: Side): Pick<SpriteOrderDeferredLend, "moveId" | "attackerSide" | "generalAnimation"> =>
  isGeneralRain(unit) ? { moveId: 0, attackerSide: "player", generalAnimation: "RAIN_CONTINUES" } : { moveId: unit.mv!, attackerSide: side };
/** The words unit's attacker side (Pidgeotto / Wooper are the job's attacker). */
const sideOf = (job: Job) => job.attackerSide;

describe("words46: words-unit carry through the production programs (ROM F0 + RAM words)", () => {
  it("GENERAL_RAIN_RANDOM2_PLAN draws at the drop program's spawn ages (rainDance.ts), 4 words each", () => {
    expect(GENERAL_RAIN_RANDOM2_PLAN.map((step) => step.ageOffset)).toEqual(GENERAL_RAIN_SPAWN_AGES);
    expect(GENERAL_RAIN_RANDOM2_PLAN.every((step) => step.count === 4)).toBe(true);
  });

  it("the production words law reproduces every RAM-read draw row (ages and words) from the RAM activation value", () => {
    let bodies = 0, words = 0;
    for (const [name, job] of Object.entries(JOBS)) {
      expect(job.identicalAB, name).toBe(true);
      for (const unit of job.units.filter(isWordsBody)) {
        const law = wordsOf(unit);
        expect(law.draws.map((row, k) => [planOf(unit)[k]!.ageOffset, ...row]), `${name} f${unit.frame}`).toEqual(unit.draws);
        bodies += 1; words += law.words.length;
      }
    }
    // Sand 8 x 60, Mud 6 x 60, Rain Dance 4 x 160, General_Rain 8 x 80
    expect({ bodies, words }).toEqual({ bodies: 26, words: 8 * 60 + 6 * 60 + 4 * 160 + 8 * 80 });
  });

  it("liveWordsUnitPostFree carries every words body from its ROM activation order to the ROM order at the next unit (26/26)", () => {
    const tally: Record<string, number> = {};
    for (const [name, job] of Object.entries(JOBS)) {
      job.units.forEach((unit, index) => {
        if (!isWordsBody(unit)) return;
        const next = job.units[index + 1]!;
        const post = liveWordsUnitPostFree(unitOf(unit, sideOf(job)), unit.F0, wordsOf(unit), anchorsOf(job));
        expect(post, `${name} ${unit.mv} f${unit.frame}`).toEqual(next.F0);
        const tag = isGeneralRain(unit) ? "RAIN_CONTINUES" : String(unit.mv);
        tally[tag] = (tally[tag] ?? 0) + 1;
      });
    }
    expect(tally).toEqual({ 28: 8, 189: 6, 240: 4, RAIN_CONTINUES: 8 });
  });

  it("negative controls: a wrong word set, or the words-free activation order, misses the ROM order", () => {
    let wrongWords = 0, identity = 0, checked = 0;
    for (const job of Object.values(JOBS)) {
      const bodies = job.units.filter(isWordsBody);
      job.units.forEach((unit, index) => {
        if (!isWordsBody(unit)) return;
        const other = bodies.find((b) => b !== unit && b.mv === unit.mv && b.activationValue !== unit.activationValue);
        const next = job.units[index + 1]!.F0;
        checked += 1;
        if (JSON.stringify(unit.F0) !== JSON.stringify(next)) identity += 1;
        if (other && JSON.stringify(liveWordsUnitPostFree(unitOf(unit, sideOf(job)), unit.F0, wordsOf(other), anchorsOf(job))) !== JSON.stringify(next)) wrongWords += 1;
      });
    }
    expect(checked).toBe(26);
    expect(identity).toBe(26);
    expect(wrongWords).toBeGreaterThan(0);
  });

  it("the dirt seed is the slide-helper carry: it equals Mud's former 4/3 swap where that rule applied and resolves the second Mud-Slap bodies", () => {
    let swapAgrees = 0, swapDeclines = 0;
    for (const job of Object.values(JOBS)) {
      for (const unit of job.units.filter((u) => isWordsBody(u) && u.mv === 189)) {
        const lent = spriteOrderWithOccupiedPrefix({ known: true, free: unit.F0, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!;
        const anchors = anchorsOf(job), side = sideOf(job);
        const profile = liveDirtScatterProfile(189, side, lent, wordsOf(unit).draws, anchors[side], anchors[foeOf(side)])!;
        const at = lent.indexOf(4);
        if (lent[at + 1] !== 3) { swapDeclines += 1; continue; }
        const swapped = lent.map((slot, i) => i === at ? 3 : i === at + 1 ? 4 : slot);
        if (JSON.stringify(profile.spriteOrderSeed.filter((s) => s !== 3)) === JSON.stringify(swapped.filter((s) => s !== 3))) swapAgrees += 1;
      }
    }
    // prep46: the former rule declined on both second Mud-Slap bodies (activation [3, 4, ...]); the helper carry is exact there (test above)
    expect({ swapAgrees, swapDeclines }).toEqual({ swapAgrees: 4, swapDeclines: 2 });
  });
});

// Production marker / lend / resolver: the order host is driven by the job's semantic events (one turn per prompt), each move body lent at
// its activation edge and marked as the orchestrator does; the render-seam resolution reads the words units' words by key from a pinned map.
const ev = (sequence: number, kind: string, extra: object = {}) =>
  Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
const battlerOf = (side: Side) => side === "player" ? 0 : 1;
type Step = readonly ["body", number, Side] | readonly ["hit", Side] | readonly ["stat", Side] | readonly ["rain"];
/** Turns per job (the prep46 chain steps: words body, hit blip, accuracy -1 stat animation 20, consumer, end-turn rain). */
function turnsOf(name: string, job: Job): readonly (readonly Step[])[] {
  const a = job.attackerSide, f = foeOf(a);
  const words = (mv: number) => ["body", mv, a] as const;
  switch (name) {
    case "ms-opp-lickitung": return [[words(189), ["hit", f], ["stat", f], ["body", 21, f]]];
    case "ms-opp-onix": return [[words(189), ["hit", f], ["stat", f]], [words(189), ["hit", f], ["stat", f]]];
    case "ms-ply-nosepass": return [[words(189), ["hit", f], ["stat", f], ["body", 86, f]]];
    case "ms-ply-onix": return [[words(189), ["hit", f], ["stat", f], ["body", 225, f], ["hit", a]], [words(189), ["hit", f], ["stat", f], ["body", 225, f]]];
    case "sa-opp-lickitung": return [[words(28), ["stat", f], ["body", 21, f], ["hit", a]], [words(28), ["stat", f], ["body", 21, f]]];
    case "sa-opp-onix": return [[words(28), ["stat", f], ["body", 157, f], ["hit", a]], [words(28), ["stat", f]]];
    case "sa-ply-nosepass": return [[words(28), ["stat", f]], [words(28), ["stat", f], ["body", 201, f]]];
    case "sa-ply-onix": return [[words(28), ["stat", f], ["body", 225, f]]];
    default: return [[["body", 33, f], ["hit", a], words(240), ["rain"]], [["body", 33, f]]]; // rd-*: Tackle, Rain Dance, end-turn rain; Tackle
  }
}

function driveJob(name: string, job: Job) {
  let host: LiveSpriteOrderHost = createLiveSpriteOrderHost(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  const wordsByKey = new Map<string, PresentationRngWords>();
  const bodyUnits = job.units.filter((u) => u.kind === "body");
  let cursor = 0;
  const checks: { label: string; lend: unknown; rom: number[] }[] = [];
  turnsOf(name, job).forEach((steps, t) => {
    const requestId = t + 1;
    host = beginLiveSpriteOrderTurn(host, requestId, true);
    const events: BattleKernelSemanticEvent[] = steps.map((step, i) => {
      const seq = 10 * requestId + i;
      if (step[0] === "body") {
        const who = battlerOf(step[2]);
        return ev(seq, "animation", { animationId: "MOVE_ANIMATION", battler: who, target: 1 - who, arguments: [String(step[1]), "0", "40", "10", "70", "0"] });
      }
      if (step[0] === "hit") return ev(seq, "animation", { animationId: "HIT_ANIMATION", battler: battlerOf(step[1]), target: battlerOf(step[1]), arguments: [] });
      if (step[0] === "stat") return ev(seq, "animation", { animationId: "STATS_CHANGE", battler: battlerOf(step[1]), target: battlerOf(step[1]), arguments: ["20"] });
      return ev(seq, "animation", { animationId: "RAIN_CONTINUES", battler: 0, target: 0, arguments: [] });
    });
    const resolution = { resolutionId: { requestId }, segmentIndex: 0, segments: [{ events }] };
    steps.forEach((step, commandIndex) => {
      if (step[0] !== "body" && step[0] !== "rain") return;
      // the next fixture body unit (stat animations are mv 0 without words; General_Rain is mv 0 with words)
      while (bodyUnits[cursor] && bodyUnits[cursor]!.mv === 0 && !isGeneralRain(bodyUnits[cursor]!)) cursor += 1;
      const unit = bodyUnits[cursor++]!;
      expect(step[0] === "rain" ? isGeneralRain(unit) : unit.mv === step[1], `${name} step ${commandIndex} vs f${unit.frame}`).toBe(true);
      const event = events[commandIndex]!;
      if (step[0] === "rain") {
        wordsByKey.set(generalAnimationPresentationRngKey(requestId, 0, event.sequence), wordsOf(unit));
        return;
      }
      host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true);
      const payload = event.payload as unknown as { battler: 0 | 1; target: 0 | 1; arguments: string[] };
      const request = battleMoveAnimationRequest(payload.battler, payload.target, payload.arguments);
      const lend = lendLiveSpriteOrder(host, request.moveId);
      checks.push({ label: `${name} ${unit.mv} f${unit.frame}`, lend, rom: unit.F0 });
      const key = liveMovePresentationRngBodyKey({ resolutionId: { requestId }, segmentIndex: 0, commandIndex });
      host = markLiveSpriteOrderDeferredBody(host, lend, request, key);
      if (isWordsBody(unit)) wordsByKey.set(key, wordsOf(unit));
    });
    host = advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY);
  });
  const anchors = anchorsOf(job);
  const carry = (unit: SpriteOrderDeferredLend, activationFree: readonly number[]) =>
    isWordsOrderDeferredUnit(unit) ? liveWordsUnitPostFree(unit, activationFree, wordsByKey.get(unit.key) ?? null, anchors) : null;
  return { host, checks, carry };
}

describe("words46: production marker / lend / resolver against the prep46 chains", () => {
  it("every lend after a words unit is the word-free deferred marker and resolves to the consumer's ROM activation order", () => {
    const tally = { entry: 0, resolved: 0, nested: 0, consumersOtherMove: 0 };
    for (const [name, job] of Object.entries(JOBS)) {
      const { checks, carry, host } = driveJob(name, job);
      expect(JSON.stringify(host)).not.toMatch(/words|presentationRng|activationValue/);
      for (const check of checks) {
        const lend = check.lend as { known: true; free: readonly number[]; deferred?: SpriteOrderDeferredLend } | undefined;
        expect(lend, check.label).toBeDefined();
        if (lend!.deferred === undefined) {
          // a tracker lend (battle entry, or after the rd jobs' planned Tackle + blip) equals the ROM order too
          expect(lend!.free, check.label).toEqual(check.rom);
          tally.entry += 1;
          continue;
        }
        expect(lend!.free).toEqual([]);
        expect(resolveSpriteOrderDeferredLend(lend!.deferred, carry), check.label).toEqual(check.rom);
        tally.resolved += 1;
        if ("deferred" in lend!.deferred.activation) tally.nested += 1;
        if (!DEFERRED_LEND_MOVE_IDS.includes(Number(check.label.split(" ")[1]))) tally.consumersOtherMove += 1;
      }
    }
    // 16 tracker lends (12 first bodies + the rd jobs' Rain Dance after a planned Tackle + blip); 18 lends resolved through a words marker:
    // the 15 prep46 chain consumers (13 of another move: Slam, Rock Slide, Thunder Wave, Dragon Breath, Sandstorm, Tackle after rain) plus 3
    // second words bodies after a consumer + prompt (Sand-Attack x2, Mud-Slap), 7 of them through a nested words chain.
    expect(tally).toEqual({ entry: 16, resolved: 18, nested: 7, consumersOtherMove: 13 });
  });

  it("without the words marker (the pre-prep46 host) every one of those consumers would decline", () => {
    for (const [name, job] of Object.entries(JOBS)) {
      const { checks } = driveJob(name, job);
      for (const check of checks.filter((c) => (c.lend as { deferred?: unknown }).deferred !== undefined)) {
        const deferred = (check.lend as { deferred: SpriteOrderDeferredLend }).deferred;
        expect(isWordsOrderDeferredUnit(deferred), check.label).toBe(true);
        // a carry that does not know the words (the Ice Ball-only seam) cannot resolve it
        expect(resolveSpriteOrderDeferredLend(deferred, () => null)).toBeNull();
      }
    }
  });

  it("an Ice Ball marker is a words marker (ice72): it lends to any consumer", () => {
    let host = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), 1, true);
    const ice = ev(10, "animation", { animationId: "MOVE_ANIMATION", battler: 0, target: 1, arguments: ["301", "0", "30", "10", "70", "0", "1"] });
    const resolution = { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events: [ice] }] };
    host = advanceLiveSpriteOrderHost(host, resolution, 10, true);
    host = markLiveSpriteOrderDeferredBody(host, lendLiveSpriteOrder(host, 301), { moveId: 301, attacker: 0, rolloutCounter: 1 }, "move:1:0:0");
    host = advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY);
    expect(isWordsOrderDeferredUnit(host.deferred!)).toBe(true);
    expect(lendLiveSpriteOrder(host, 33)?.deferred).toBe(host.deferred);
    expect(lendLiveSpriteOrder(host, 301)?.deferred).toBe(host.deferred);
  });
});

describe("words46: Ice Beam after Rain Dance + RAIN_CONTINUES (rdib-ply-onix probe, A == B)", () => {
  it("the production host + seam resolution reproduce the ROM order at General_Rain's end and at the next turn's Ice Beam", () => {
    const rdib = JSON.parse(readFileSync("tools/integration/fixtures/words46/rdib-ply-onix-units.json", "utf8")) as { job: Omit<Job, "units">; units: Unit[] };
    const job: Job = { ...rdib.job, units: rdib.units } as Job;
    expect(job.identicalAB).toBe(true);
    // carry: Rain Dance and both General_Rain bodies to the ROM order at the next unit
    let carried = 0;
    job.units.forEach((unit, index) => {
      if (!isWordsBody(unit)) return;
      expect(wordsOf(unit).draws.map((row, k) => [planOf(unit)[k]!.ageOffset, ...row])).toEqual(unit.draws);
      expect(liveWordsUnitPostFree(unitOf(unit, "player"), unit.F0, wordsOf(unit), anchorsOf(job)), `f${unit.frame}`).toEqual(job.units[index + 1]!.F0);
      carried += 1;
    });
    expect(carried).toBe(3);
    // marker / lend / resolver: Ice Beam (planned) + blip, Rain Dance (marker), end-turn RAIN_CONTINUES (nested marker), prompt, Ice Beam
    const bodies = job.units.filter((u) => u.kind === "body");
    let host: LiveSpriteOrderHost = createLiveSpriteOrderHost(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
    host = beginLiveSpriteOrderTurn(host, 1, true);
    const t1 = [ev(10, "animation", { animationId: "MOVE_ANIMATION", battler: 1, target: 0, arguments: ["58", "0", "95", "10", "70", "0"] }),
      ev(11, "animation", { animationId: "HIT_ANIMATION", battler: 0, target: 0, arguments: [] }),
      ev(12, "animation", { animationId: "MOVE_ANIMATION", battler: 0, target: 1, arguments: ["240", "0", "0", "10", "70", "0"] }),
      ev(13, "animation", { animationId: "RAIN_CONTINUES", battler: 0, target: 0, arguments: [] })];
    const r1 = { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events: t1 }] };
    host = advanceLiveSpriteOrderHost(host, r1, 10, true);
    expect(lendLiveSpriteOrder(host, 58)?.free).toEqual(bodies[0]!.F0);
    host = advanceLiveSpriteOrderHost(host, r1, 12, true);
    const rainDanceLend = lendLiveSpriteOrder(host, 240)!;
    expect(rainDanceLend.free).toEqual(bodies[1]!.F0);
    host = markLiveSpriteOrderDeferredBody(host, rainDanceLend, { moveId: 240, attacker: 0 }, "move:1:0:2");
    host = advanceLiveSpriteOrderHost(host, r1, Number.POSITIVE_INFINITY);
    expect(host.deferred).toMatchObject({ key: generalAnimationPresentationRngKey(1, 0, 13), generalAnimation: "RAIN_CONTINUES", units: [],
      activation: { deferred: { key: "move:1:0:2", moveId: 240, units: [] } } });
    host = beginLiveSpriteOrderTurn(host, 2, true);
    const r2 = { resolutionId: { requestId: 2 }, segmentIndex: 0, segments: [{ events: [
      ev(20, "animation", { animationId: "MOVE_ANIMATION", battler: 1, target: 0, arguments: ["58", "0", "95", "10", "70", "0"] })] }] };
    host = advanceLiveSpriteOrderHost(host, r2, 20, true);
    const lend = lendLiveSpriteOrder(host, 58)!;
    const wordsByKey = new Map([["move:1:0:2", wordsOf(bodies[1]!)], [generalAnimationPresentationRngKey(1, 0, 13), wordsOf(bodies[2]!)]]);
    const resolved = resolveSpriteOrderDeferredLend(lend.deferred!, (unit, free) => liveWordsUnitPostFree(unit, free, wordsByKey.get(unit.key) ?? null, anchorsOf(job)));
    expect(bodies[3]!.mv).toBe(58);
    expect(resolved).toEqual(bodies[3]!.F0);
    // the General_Rain words are needed: without them the lend declines
    wordsByKey.delete(generalAnimationPresentationRngKey(1, 0, 13));
    expect(resolveSpriteOrderDeferredLend(lend.deferred!, (unit, free) => liveWordsUnitPostFree(unit, free, wordsByKey.get(unit.key) ?? null, anchorsOf(job)))).toBeNull();
  });
});

describe("words46: KO + send-in (entry-label carry)", () => {
  it("a words unit after an opponent KO + send-in records its marker in entry labels (ice72: Ice Ball too) and any consumer resolves it", () => {
    // opponent KO + summary + send-out (docs/postko-consumer-audit.md s4.3: role-isomorphic occupancy, entry-label lend)
    const ko = [ev(10, "faint-animation", { battler: 1 }), ev(11, "message"), ev(12, "draw-party-status-summary", { battler: 1 }),
      ev(13, "switch", { side: "opponent", fromPartyIndex: 0, toPartyIndex: 1 }), ev(14, "message"), ev(15, "hide-party-status-summary", { battler: 1 }),
      ev(16, "switch-in-animation", { battler: 1, partyIndex: 1 })];
    let host = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), 1, true);
    host = advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events: ko }] }, Number.POSITIVE_INFINITY);
    host = beginLiveSpriteOrderTurn(host, 2, true);
    expect(host.tracker.cursor.order.known).toBe(true);
    expect(host.tracker.battlerSlots.opponent).not.toBe(8); // not the entry battler slots
    const job = JOBS["sa-opp-lickitung"]!;
    const sand = ev(20, "animation", { animationId: "MOVE_ANIMATION", battler: 1, target: 0, arguments: ["28", "0", "0", "10", "70", "0"] });
    const stat = ev(21, "animation", { animationId: "STATS_CHANGE", battler: 0, target: 0, arguments: ["20"] });
    const slam = ev(22, "animation", { animationId: "MOVE_ANIMATION", battler: 0, target: 1, arguments: ["21", "0", "80", "10", "70", "0"] });
    const resolution = { resolutionId: { requestId: 2 }, segmentIndex: 0, segments: [{ events: [sand, stat, slam] }] };
    host = advanceLiveSpriteOrderHost(host, resolution, 20, true);
    const sandLend = lendLiveSpriteOrder(host, 28)!;
    expect(sandLend.free).toEqual(spriteOrderTrackerLend(host.tracker)); // entry labels (rho)
    // ice72: an Ice Ball body off the entry battler slots records its marker in entry labels too
    expect(markLiveSpriteOrderDeferredBody(host, sandLend, { moveId: 301, attacker: 1, rolloutCounter: 1 }, "k").deferredBody?.activation)
      .toEqual({ free: sandLend.free });
    host = markLiveSpriteOrderDeferredBody(host, sandLend, { moveId: 28, attacker: 1 }, "move:2:0:0");
    expect(host.deferredBody?.activation).toEqual({ free: sandLend.free });
    host = advanceLiveSpriteOrderHost(host, resolution, 22, true);
    const lend = lendLiveSpriteOrder(host, 21)!;
    expect(lend.deferred?.units).toEqual([{ kind: "stat-animation", argument: 20 }]);
    const words = wordsOf(job.units.find(isWordsBody)!);
    const anchors = anchorsOf(job);
    const resolved = resolveSpriteOrderDeferredLend(lend.deferred!, (unit, activationFree) =>
      liveWordsUnitPostFree(unit, activationFree, unit.key === "move:2:0:0" ? words : null, anchors));
    // the carry runs in entry labels: the entry-label activation order through Sand-Attack, then the stat plan
    const post = liveWordsUnitPostFree({ moveId: 28, attackerSide: "opponent" }, sandLend.free, words, anchors)!;
    const expected = spriteOrderTrackerLend(applySpriteOrderPresentationEvent(createSpriteOrderTracker({ known: true, free: post, pendingDestroyed: [] }),
      { kind: "stat-animation", argument: 20 }));
    expect(resolved).toEqual(expected);
    expect(resolved).not.toBeNull();
  });
});

describe("words46: RAIN_CONTINUES non-consuming sub-stream (presentation RNG)", () => {
  type Ev = { frame: number; kind: "body"; moveId: number } | { frame: number; kind: "rain" };
  const moves = Object.keys(LIVE_MOVE_RANDOM2_PLANS).map(Number);
  const schedules: Ev[][] = Array.from({ length: 40 }, (_, s) => {
    const events: Ev[] = [];
    let frame = 30 + s;
    for (let k = 0; k < 8; k += 1) {
      events.push({ frame, kind: "body", moveId: moves[(s * 7 + k * 3) % moves.length]! });
      frame += 250 + ((s * 13 + k * 29) % 150);
      if (k % 2 === 1) { events.push({ frame, kind: "rain" }); frame += 130; }
    }
    return events;
  });
  const run = (schedule: readonly Ev[], rain: boolean, seed: number) => {
    let host: PresentationRngHost = createPresentationRngHost(seed, 0);
    const states: number[] = [];
    const words: Record<string, readonly number[]> = {};
    const last = Math.max(...schedule.map((e) => e.frame)) + 400;
    for (let frame = 1; frame <= last; frame += 1) {
      host = advancePresentationRngHost(host);
      schedule.forEach((e, i) => {
        if (e.frame !== frame) return;
        if (e.kind === "body") host = activateLiveMovePresentationRng(host, { moveId: e.moveId, attacker: 0, turn: 0 }, `move:${i}`);
        else if (rain) {
          const before = host;
          host = recordPresentationRngSubStream(host, `general:${i}`, GENERAL_RAIN_RANDOM2_PLAN);
          expect(host.state).toBe(before.state);
          expect(host.pendingDraws).toBe(before.pendingDraws);
          expect(recordPresentationRngSubStream(host, `general:${i}`, GENERAL_RAIN_RANDOM2_PLAN)).toBe(host); // exactly once per key
          expect(presentationRngBodyWords(host, `general:${i}`)).toEqual(presentationRngPlanWords(before.state, GENERAL_RAIN_RANDOM2_PLAN));
        }
      });
      states.push(host.state.value);
    }
    for (const body of host.bodies) words[body.key] = body.words.words;
    return { words, states };
  };
  it("40/40 schedules: every move-body word and every stream state identical with and without the 80-word General_Rain reads", () => {
    let identical = 0, bodies = 0, rains = 0;
    schedules.forEach((schedule, i) => {
      const base = run(schedule, false, 0x1234 + i), sub = run(schedule, true, 0x1234 + i);
      const moveKeys = Object.keys(base.words);
      bodies += moveKeys.length;
      rains += Object.keys(sub.words).filter((k) => k.startsWith("general:")).length;
      expect(sub.states).toEqual(base.states);
      if (moveKeys.every((k) => JSON.stringify(sub.words[k]) === JSON.stringify(base.words[k]))) identical += 1;
    });
    expect({ identical, bodies, rains }).toEqual({ identical: 40, bodies: 320, rains: 160 });
  });

  it("the tick seam records the sub-stream once, at the first command presented at/after the RAIN_CONTINUES event; re-ticks / repaints never draw", () => {
    const rainEvent = ev(41, "animation", { animationId: "RAIN_CONTINUES", battler: 0, target: 0, arguments: [] });
    const events = [ev(40, "message"), rainEvent, ev(42, "message")];
    const commands = [{ type: "message", eventSequence: 40 }, { type: "message", eventSequence: 42 }];
    const presenting = (commandIndex: number, phaseElapsed: number) => ({ activeBattleCallStart: 7, battleResolutionPresentation: {
      resolutionId: { requestId: 3 }, segmentIndex: 0, commandIndex, segments: [{ events, commands }],
      lifecycle: { phase: "presenting", phaseElapsed } } }) as never;
    const key = generalAnimationPresentationRngKey(3, 0, 41);
    let session = tickLiveMovePresentationRngSession(createPresentationRngSession(0x808db3eb), presenting(0, 0));
    for (let f = 1; f < 5; f += 1) session = tickLiveMovePresentationRngSession(session, presenting(0, f));
    expect(presentationRngBodyWords(session.host, key)).toBeNull(); // the event is after command 0
    const before = session.host!;
    session = tickLiveMovePresentationRngSession(session, presenting(1, 0));
    const stepped = advancePresentationRngHost(before);
    expect(session.host!.state).toEqual(stepped.state); // only the per-frame step: the sub-stream consumes nothing
    expect(presentationRngBodyWords(session.host, key)).toEqual(presentationRngPlanWords(stepped.state, GENERAL_RAIN_RANDOM2_PLAN));
    const recorded = session.host!.bodies;
    for (let f = 1; f < 4; f += 1) session = tickLiveMovePresentationRngSession(session, presenting(1, f));
    expect(session.host!.bodies).toBe(recorded);
    // replay from the same seed reproduces the same words (reset / export replay)
    let again = tickLiveMovePresentationRngSession(createPresentationRngSession(0x808db3eb), presenting(0, 0));
    for (let f = 1; f < 5; f += 1) again = tickLiveMovePresentationRngSession(again, presenting(0, f));
    again = tickLiveMovePresentationRngSession(again, presenting(1, 0));
    expect(presentationRngBodyWords(again.host, key)).toEqual(presentationRngBodyWords(session.host, key));
  });
});

describe("words46: ordinary rain route (generated rentals, production seams)", () => {
  // seed 19, slot 2 every turn (tools/integration/words46RouteScan.ts): an opponent Dive body goes live through the RAIN_CONTINUES marker.
  const SLOTS = [2, 2, 2, 2, 2, 2, 2, 2] as const;
  const rulesWithoutSceneMarker = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
  it("live through the rain marker; logic / RNG identical across presentation seeds and Scene ON/OFF; replay and export round trip reproduce the frames", () => {
    const A = words46Route(19, "on", SLOTS, 0x1234abcd, true), B = words46Route(19, "on", SLOTS, 0xfeed0042);
    const off = words46Route(19, "off", SLOTS, 0x1234abcd);
    const rainFrames = A.flagged.filter((f) => f.rain);
    expect(rainFrames.length).toBeGreaterThan(100);
    expect(new Set(rainFrames.map((f) => `${f.moveId}/${f.attacker}`))).toEqual(new Set(["291/1"]));
    // dive70: the opponent's Dive setup (115 rows) and, since the attack body adapter, its attack body (93 rows), both through the marker
    // iu120: each body holds age 0 over its P pre rows (tests/helpers/iu120Rows.ts).
    expect(rainFrames.map((f) => f.age)).toEqual([...iu120EffectAges(291, 115, "opponent"), ...iu120EffectAges(291, 93, "opponent")]);
    // a different presentation seed: different words, the same logic
    expect(B.run.boundaries).toEqual(A.run.boundaries);
    expect(B.run.state.facilityState).toEqual(A.run.state.facilityState);
    expect(B.run.state.round.rules.rngValue).toBe(A.run.state.round.rules.rngValue);
    expect(off.run.boundaries).toHaveLength(A.run.boundaries.length);
    for (let i = 0; i < A.run.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(off.run.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(A.run.boundaries[i]!));
      expect(off.run.boundaries[i]!.rng).toEqual(A.run.boundaries[i]!.rng);
      expect(off.run.boundaries[i]!.boundary).toEqual(A.run.boundaries[i]!.boundary);
    }
    expect(off.run.state.round.rules.rngValue).toBe(A.run.state.round.rules.rngValue);
    expect(off.run.state.facilityState).toEqual(A.run.state.facilityState);
    // the production tick seam recorded the RAIN_CONTINUES sub-stream(s) the resolution read
    expect(A.session.host?.bodies.some((b) => b.key.startsWith("general:"))).toBe(true);
    // export round trip (seed + policy, docs/presentation-rng.md) and replay: identical frames
    const exported = presentationRngTraceMetadata(A.session);
    expect(exported.policy).toBe(PRESENTATION_RNG_POLICY_V1);
    const replayed = words46Route(19, "on", SLOTS, presentationRngFromTrace({ presentationRng: exported }).seed, true);
    expect(replayed.flagged).toEqual(A.flagged);
  }, 240000);
});

describe("words46: render-view presentationRng pass-through (non-Random2 consumer)", () => {
  it("seed 3 / slot 0: Rock Slide (no Random2 plan) after Sand-Attack gets the presentation host from the render view and resolves the lend", () => {
    const { flagged } = words46Route(3, "on", [0, 0, 0, 0, 0, 0, 0, 0]);
    const rockSlide = flagged.filter((f) => f.moveId === 157);
    expect(liveMoveRandom2Plan({ moveId: 157 })).toBeNull();
    expect(rockSlide.length).toBeGreaterThan(0);
    expect(rockSlide.every((f) => f.hostPassed)).toBe(true);
  }, 120000);
});
