/**
 * ice72 (docs/ice72-ice-ball-words-unit.md): Ice Ball 301 is a words-order unit for ANY consumer. Receipts: tools/integration/ice72Run.sh
 * (direct mGBA, explicit lab seed, r1 == r2): every Ice Ball body's production carry (liveIceBallWordsPostFree at its RAM-read words, rollout
 * counter and RAM-read displayed species) equals the ROM post-body free order, and every consumer's production deferred-lend resolution
 * (liveWordsOrderDeferredCarry + LIVE_WORDS_ORDER_DEFERRED_REPLAY, the render seam's resolveWordsOrderLend) equals the ROM activation order.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import {
  liveBattlerAnchors, liveIceBallWordsPostFree, LIVE_WORDS_ORDER_DEFERRED_REPLAY, liveWordsOrderDeferredCarry,
} from "../src/engine/liveMoveAnimation.ts";
import { LIVE_MOVE_RANDOM2_PLANS, liveMoveRandom2Plan } from "../src/engine/liveMovePresentationRng.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, DEFERRED_LEND_MOVE_IDS, lendLiveSpriteOrder,
  markLiveSpriteOrderDeferredBody,
} from "../src/engine/liveSpriteOrderHost.ts";
import { createPresentationRngState } from "../src/engine/presentationRng.ts";
import { presentationRngPlanWords, type PresentationRngWords } from "../src/engine/presentationRngHost.ts";
import {
  resolveSpriteOrderDeferredLend, spriteOrderEntryLabelRelabel, spriteOrderTrackerLend, type SpriteOrderDeferredLend,
} from "../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { isWordsOrderDeferredUnit, WORDS_ORDER_UNIT_MOVE_IDS } from "../src/engine/wordsOrderUnits.ts";

type Side = "player" | "opponent";
const FIXTURE = JSON.parse(readFileSync("tools/integration/fixtures/ice72/ice72-lend-vectors.json", "utf8")) as {
  vectors: { job: string; consumer: string; afterBattleUnit: boolean; species: Record<Side, number>; rom: { F0: number[]; mask0: string };
    replayLend: number[]; marker: SpriteOrderDeferredLend }[];
  bodies: { job: string; body: string; key: string; attackerSide: Side; rolloutCounter: number; bodySpecies: Record<Side, number>;
    activation: string; entryLabels: boolean; activationFree: number[]; romPostFree: number[] }[];
  words: Record<string, { activationValue: number; draws: number[][] }>;
};
const markers = (m: SpriteOrderDeferredLend): SpriteOrderDeferredLend[] => ["deferred" in m.activation ? markers(m.activation.deferred) : [], [m]].flat();
const planOf = (m: Pick<SpriteOrderDeferredLend, "moveId" | "rolloutCounter">) =>
  m.moveId === 301 ? liveMoveRandom2Plan({ moveId: 301, rolloutCounter: m.rolloutCounter })! : LIVE_MOVE_RANDOM2_PLANS[m.moveId]!;
/** The production presentation host's words of a body (pinned activation value, production plan); they must equal the RAM-read draws. */
function hostWords(key: string, m: Pick<SpriteOrderDeferredLend, "moveId" | "rolloutCounter">): PresentationRngWords {
  const ram = FIXTURE.words[key]!;
  const words = presentationRngPlanWords(createPresentationRngState(ram.activationValue, "pinned"), planOf(m));
  expect(words.words, key).toEqual(ram.draws.flatMap((row) => row.slice(1)));
  return words;
}
const anchorsOf = (species: Record<Side, number>) => {
  const art = createBattleCommandFieldArtView({ player: { species: species.player }, opponent: { species: species.opponent } } as never);
  return { player: liveBattlerAnchors("player", art).picOffsetPoint, opponent: liveBattlerAnchors("opponent", art).picOffsetPoint };
};
/** The ROM consumer activation order in the lend's entry labels (rho of the ROM occupancy; words59DeferredBodySpecies.test.ts). */
function romLend(rom: { F0: number[]; mask0: string }): readonly number[] {
  const mask = BigInt(`0x${rom.mask0}`);
  const occupied = Array.from({ length: 64 }, (_, slot) => slot).filter((slot) => (mask >> BigInt(slot) & 1n) === 1n);
  const battlers = occupied.filter((slot) => ![0, 1, 2, 60, 61, 62, 63].includes(slot));
  expect(battlers).toHaveLength(2);
  const player = battlers.includes(6) ? 6 : battlers.find((slot) => slot !== 8)!, opponent = battlers.find((slot) => slot !== player)!;
  const rho = spriteOrderEntryLabelRelabel({ free: rom.F0, occupied, battlerSlots: { player, opponent } })!;
  return rom.F0.map((slot) => rho.get(slot)!);
}
const resolveVector = (v: (typeof FIXTURE.vectors)[number]) => {
  const byKey = new Map(markers(v.marker).map((m) => [m.key, hostWords(m.key, m)] as const));
  return resolveSpriteOrderDeferredLend(v.marker, liveWordsOrderDeferredCarry((key) => byKey.get(key) ?? null, anchorsOf(v.species)),
    LIVE_WORDS_ORDER_DEFERRED_REPLAY);
};

describe("ice72: Ice Ball 301 words-order unit (ROM receipts, tools/integration/ice72Run.sh)", () => {
  it("is a words unit: a deferred-lend body whose marker any consumer takes", () => {
    expect(WORDS_ORDER_UNIT_MOVE_IDS).toContain(301);
    expect(DEFERRED_LEND_MOVE_IDS).toEqual(WORDS_ORDER_UNIT_MOVE_IDS);
    expect(isWordsOrderDeferredUnit({ moveId: 301 })).toBe(true);
  });

  it("plan == ROM per body: the production carry at the body's words / counter / species equals the ROM post-body free order", () => {
    const tally = { bodies: 0, exact: 0, declined: [] as string[], nonEntryLabels: 0, counters: new Set<string>() };
    for (const b of FIXTURE.bodies) {
      const label = `${b.job} ${b.body}`;
      tally.bodies += 1;
      tally.counters.add(`${b.attackerSide}:${b.rolloutCounter}`);
      if (!b.entryLabels) tally.nonEntryLabels += 1;
      const post = liveIceBallWordsPostFree(b, b.activationFree, hostWords(b.key, { moveId: 301, rolloutCounter: b.rolloutCounter }), b.bodySpecies);
      if (post === null) { tally.declined.push(`${label} vs ${b.bodySpecies.opponent}`); continue; }
      expect(post, label).toEqual(b.romPostFree);
      tally.exact += 1;
    }
    // the order is words-dependent: the 31 carried bodies leave 29 distinct post-body orders (two 5-shard collisions)
    expect(new Set(FIXTURE.bodies.filter((b) => b.body !== "301 f12131" || b.job !== "ply-glalie-wg").map((b) => JSON.stringify(b.romPostFree))).size)
      .toBe(29);
    // the decline: ply-glalie-wg's counter-4 body against the sent-in Onix, whose species idle rest x2 = 1 (liveIceBallInputs' rest rule)
    expect(tally.declined).toEqual(["ply-glalie-wg 301 f12131 vs 95"]);
    expect({ bodies: tally.bodies, exact: tally.exact, nonEntryLabels: tally.nonEntryLabels }).toEqual({ bodies: 32, exact: 31, nonEntryLabels: 10 });
    expect([...tally.counters].sort()).toEqual(["opponent:1", "opponent:2", "opponent:3", "opponent:4", "opponent:5",
      "player:1", "player:2", "player:3", "player:4", "player:5"]);
  });

  it("lends == ROM: every non-Ice-Ball consumer after an Ice Ball marker (Water Gun / Swift / Tackle, also past a KO + send-out) resolves to the ROM order", () => {
    const tally: Record<string, number> = {};
    let pastBattleUnit = 0, withoutIceBall = 0;
    for (const v of FIXTURE.vectors) {
      const label = `${v.job} ${v.consumer}`;
      expect(resolveVector(v), label).toEqual(romLend(v.rom));
      // ko-opp-ms-sealeo's first Swift follows the Mud-Slap marker only (before the Sealeo send-in): a words57 control
      if (!markers(v.marker).some((m) => m.moveId === 301)) { withoutIceBall += 1; continue; }
      expect(romLend(v.rom), label).toEqual(v.replayLend);
      const move = v.consumer.split(" ")[0]!;
      tally[move] = (tally[move] ?? 0) + 1;
      if (v.afterBattleUnit) pastBattleUnit += 1;
    }
    expect(withoutIceBall).toBe(1);
    expect(tally).toEqual({ 55: 16, 129: 5, 33: 5 });
    expect(pastBattleUnit).toBe(2);
  });

  it("a marker without the body species declines (the carry needs the body's target anchors)", () => {
    const v = FIXTURE.vectors.find((x) => markers(x.marker).filter((m) => m.moveId === 301).length >= 2)!;
    const strip = (m: SpriteOrderDeferredLend): SpriteOrderDeferredLend => {
      const { bodySpecies: _s, ...rest } = m;
      return { ...rest, activation: "deferred" in m.activation ? { deferred: strip(m.activation.deferred) } : m.activation };
    };
    expect(resolveVector({ ...v, marker: strip(v.marker) })).toBeNull();
  });
});

describe("ice72: marker arms and lends (production host)", () => {
  const ev = (sequence: number, kind: string, extra: object = {}) =>
    Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
  const iceBall = (sequence: number, battler: 0 | 1, counter: number) => ev(sequence, "animation", { animationId: "MOVE_ANIMATION", battler,
    target: 1 - battler, arguments: ["301", "0", String(30 << (counter - 1)), "0", "70", "0", String(counter)] });
  const species = { player: 347, opponent: 143 };

  it("a non-entry Ice Ball body (after an opponent KO + send-out) arms its marker in entry labels with the body species", () => {
    const ko = [ev(10, "faint-animation", { battler: 1 }), ev(11, "message"), ev(12, "draw-party-status-summary", { battler: 1 }),
      ev(13, "switch", { side: "opponent", fromPartyIndex: 0, toPartyIndex: 1 }), ev(14, "message"), ev(15, "hide-party-status-summary", { battler: 1 }),
      ev(16, "switch-in-animation", { battler: 1, partyIndex: 1 })];
    let host = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), 1, true);
    host = advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events: ko }] }, Number.POSITIVE_INFINITY);
    host = beginLiveSpriteOrderTurn(host, 2, true);
    expect(host.tracker.battlerSlots.opponent).not.toBe(8);
    const resolution = { resolutionId: { requestId: 2 }, segmentIndex: 0, segments: [{ events: [iceBall(20, 0, 1)] }] };
    host = advanceLiveSpriteOrderHost(host, resolution, 20, true);
    const lend = lendLiveSpriteOrder(host, 301)!;
    expect(lend.free).toEqual(spriteOrderTrackerLend(host.tracker));
    const marked = markLiveSpriteOrderDeferredBody(host, lend, { moveId: 301, attacker: 0, rolloutCounter: 1 }, "move:2:0:0", species);
    expect(marked.deferredBody).toEqual({ key: "move:2:0:0", moveId: 301, attackerSide: "player", rolloutCounter: 1, bodySpecies: species,
      activation: { free: lend.free } });
  });

  it("a non-Ice-Ball consumer takes the Ice Ball marker's deferred lend; an Ice Ball after it nests it", () => {
    let host = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), 1, true);
    const water = ev(12, "animation", { animationId: "MOVE_ANIMATION", battler: 1, target: 0, arguments: ["55", "0", "40", "0", "70", "0"] });
    const resolution = { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events: [iceBall(10, 0, 1), water] }] };
    host = advanceLiveSpriteOrderHost(host, resolution, 10, true);
    host = markLiveSpriteOrderDeferredBody(host, lendLiveSpriteOrder(host, 301), { moveId: 301, attacker: 0, rolloutCounter: 1 }, "move:1:0:0", species);
    host = advanceLiveSpriteOrderHost(host, resolution, 12, true);
    const consumer = lendLiveSpriteOrder(host, 55)!;
    expect(consumer.free).toEqual([]);
    expect(consumer.deferred).toEqual({ ...host.deferred!, units: [] });
    expect(consumer.deferred!.bodySpecies).toEqual(species);
    host = advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY);
    host = beginLiveSpriteOrderTurn(host, 2, true);
    const second = { resolutionId: { requestId: 2 }, segmentIndex: 0, segments: [{ events: [iceBall(20, 0, 2)] }] };
    host = advanceLiveSpriteOrderHost(host, second, 20, true);
    const lend = lendLiveSpriteOrder(host, 301)!;
    host = markLiveSpriteOrderDeferredBody(host, lend, { moveId: 301, attacker: 0, rolloutCounter: 2 }, "move:2:0:0", species);
    expect(host.deferredBody!.activation).toEqual({ deferred: lend.deferred });
    expect(host.deferredBody!.rolloutCounter).toBe(2);
  });
});
