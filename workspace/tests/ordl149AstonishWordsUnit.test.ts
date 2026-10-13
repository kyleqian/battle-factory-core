/**
 * asl155 (docs/asl155-astonish-extrasensory-live.md; ord149, docs/ord149-astonish-extrasensory.md): Astonish 310 is a words-order unit. Its
 * post-body free order follows its droplets' rises (liveAstonishWordsPlanText / liveAstonishWordsPostFree), exact per allocation window on the
 * 36 ord149 ROM bodies; a 310:player body (no table row) marks and defers, a 310:opponent body (its prep45 row) drops its marker. Fails if the
 * banked ord149 src hunks are reverted.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import {
  liveAstonishDropletRise, liveAstonishWordsPlanText, liveAstonishWordsPostFree, liveWordsOrderDeferredCarry,
} from "../src/engine/liveMoveAnimation.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, DEFERRED_LEND_MOVE_IDS, lendLiveSpriteOrder,
  markLiveSpriteOrderDeferredBody,
} from "../src/engine/liveSpriteOrderHost.ts";
import type { PresentationRngWords } from "../src/engine/presentationRngHost.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { isWordsOrderDeferredUnit, WORDS_ORDER_UNIT_MOVE_IDS } from "../src/engine/wordsOrderUnits.ts";
import { ord149CheckUnit, ord149DropletRise, ord149PlanText } from "../tools/integration/ord149Check.ts";

const F = "tools/integration/fixtures/ord149";
interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; windows: Win[];
  astonish?: { steps: number; droplets: { slot: number; rise: number }[] } | null }
const units = JSON.parse(readFileSync(`${F}/ord149-units.json`, "utf8")) as { jobs: Record<string, { units: Unit[] }> };
const bodies = Object.values(units.jobs).flatMap((job) => job.units)
  .filter((unit) => unit.kind === "body" && !unit.truncated && /^body 310:(player|opponent)$/.test(unit.label));
// the creation row already shows the first step (3 px for every word): the 30-step rise is the observed rise + 3
const rises = (unit: Unit) => unit.astonish!.droplets.map((drop) => drop.rise + 3) as [number, number];
// a v2 word (word & 0x7f) of each rise class; x / v1 (words 0 / 2) never enter the sort key
const V2_OF_RISE = new Map<number, number>();
for (let v2 = 127; v2 >= 0; v2--) V2_OF_RISE.set(liveAstonishDropletRise(v2), v2);
const wordsOf = (r1: number, r2: number, high = 0): PresentationRngWords =>
  ({ words: [0x1ff, high | V2_OF_RISE.get(r1)!, 0x155, high | V2_OF_RISE.get(r2)!] }) as unknown as PresentationRngWords;
const ev = (sequence: number, kind: string, extra: object = {}) =>
  Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;

describe("asl155 A: Astonish 310 words-order unit (ord149 landed)", () => {
  it("membership: a words-order unit and a deferred-lend body", () => {
    expect(WORDS_ORDER_UNIT_MOVE_IDS).toContain(310);
    expect(DEFERRED_LEND_MOVE_IDS).toContain(310);
    expect(isWordsOrderDeferredUnit({ moveId: 310 })).toBe(true);
  });

  it("liveAstonishDropletRise == ord149DropletRise on all 128 v2 words (8 classes)", () => {
    for (let v2 = 0; v2 < 128; v2++) expect(liveAstonishDropletRise(v2), `v2 ${v2}`).toBe(ord149DropletRise(v2));
    expect(V2_OF_RISE.size).toBe(8);
  });

  it("the production plan text at each body's words == ord149PlanText and is exact per window on 36 / 36 ROM bodies", () => {
    expect(bodies).toHaveLength(36);
    for (const unit of bodies) {
      const [r1, r2] = rises(unit);
      // the high bits of the v2 words (& 0x7f) do not matter
      for (const high of [0, 0x80, 0xff80]) {
        const text = liveAstonishWordsPlanText(wordsOf(r1, r2, high));
        expect(text).toBe(ord149PlanText(r1, r2));
        expect(ord149CheckUnit(unit, text!), `${unit.label}@${unit.frame}`).toEqual([]);
      }
    }
  });

  it("revert experiment: the static D1,2 text (no words) fails 21 / 36 bodies", () => {
    expect(bodies.filter((unit) => ord149CheckUnit(unit, "Cf;D0;Cff;D1,2").length > 0)).toHaveLength(21);
  });

  it("post-free: the pair leaves by rise (ties in lend order); null without 4 words", () => {
    const free = [5, 4, 3, 21, 20];
    // Cf;D0 (the lunge controller frees first), Cff (droplets 1 / 2 take the next two slots), then the pair by rise
    const lower = liveAstonishWordsPostFree(free, wordsOf(22, 48))!, upper = liveAstonishWordsPostFree(free, wordsOf(48, 22))!;
    expect(lower).not.toEqual(upper);
    expect([...lower].sort()).toEqual([...free].sort());
    expect(liveAstonishWordsPostFree(free, wordsOf(30, 30))).toEqual(liveAstonishWordsPostFree(free, wordsOf(22, 48)));
    expect(liveAstonishWordsPostFree(free, null)).toBeNull();
    expect(liveAstonishWordsPostFree(free, { words: [1, 2, 3] } as unknown as PresentationRngWords)).toBeNull();
    expect(liveAstonishWordsPlanText(null)).toBeNull();
    // the words-unit carry routes 310 to it (species-free: no bodySpecies needed)
    const carry = liveWordsOrderDeferredCarry((key) => (key === "k" ? wordsOf(22, 48) : null), { player: { x: 0, y: 0 }, opponent: { x: 0, y: 0 } } as never);
    expect(carry({ key: "k", moveId: 310, attackerSide: "player", activation: { free }, units: [] }, free, false)).toEqual(lower);
  });

  it("a 310:player body (no table row) marks and defers; a 310:opponent body (prep45 row) drops its marker", () => {
    const drive = (attacker: 0 | 1) => {
      let host = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), 1, true);
      const body = ev(10, "animation", { animationId: "MOVE_ANIMATION", battler: attacker, target: 1 - attacker, arguments: ["310", "0", "30", "10", "70", "0"] });
      const resolution = { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events: [body] }] };
      host = advanceLiveSpriteOrderHost(host, resolution, 10, true);
      host = markLiveSpriteOrderDeferredBody(host, lendLiveSpriteOrder(host, 310), { moveId: 310, attacker }, "move:1:0:0");
      expect(host.deferredBody?.moveId).toBe(310);
      return advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY);
    };
    const player = drive(0);
    expect(player.deferred?.moveId).toBe(310);
    expect(isWordsOrderDeferredUnit(player.deferred!)).toBe(true);
    expect(lendLiveSpriteOrder(player, 33)?.deferred).toBe(player.deferred);
    const opponent = drive(1);
    expect(opponent.deferred).toBeUndefined();
    expect(opponent.deferredBody).toBeUndefined();
    expect(opponent.tracker.cursor.order.known).toBe(true);
  });
});
