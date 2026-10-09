import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors, LIVE_WORDS_ORDER_DEFERRED_REPLAY, liveWordsOrderDeferredCarry } from "../src/engine/liveMoveAnimation.ts";
import { GENERAL_RAIN_RANDOM2_PLAN, LIVE_MOVE_RANDOM2_PLANS } from "../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngState } from "../src/engine/presentationRng.ts";
import { presentationRngPlanWords, type PresentationRngWords } from "../src/engine/presentationRngHost.ts";
import {
  resolveSpriteOrderDeferredLend, spriteOrderEntryLabelRelabel, type SpriteOrderDeferredLend, type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } from "../src/engine/spriteOrderProvider.ts";

// S10A words57 (docs/next-adapters-words57.md): the words-deferred replay past battle units. Vectors = tools/integration/words57Chain.ts on
// 23 direct-mGBA jobs (Scene ON, explicit lab seed, A == B in two fresh batches): at every consumer body, the production-shaped deferred
// marker (nested as liveSpriteOrderHost nests it; units = the production events read off the ROM allocation windows, every window and frame
// ROM-checked by the chain check), the ROM consumer free order + occupancy, and the RAM-read words of every words body.
type Side = "player" | "opponent";
type Vector = { job: string; consumer: string; afterBattleUnit: boolean; species: Record<Side, number>; rom: { F0: number[]; mask0: string };
  replayLend: number[] | null; marker: SpriteOrderDeferredLend };
const FIXTURE = JSON.parse(readFileSync("tools/integration/fixtures/words57/words57-lend-vectors.json", "utf8")) as {
  vectors: Vector[]; words: Record<string, { activationValue: number; draws: number[][] }> };

const BATTLE_UNITS = new Set(["faint", "party-summary-next", "party-summary-hide", "next-mon-send-out", "switch-out", "forced-switch-out",
  "switch-in-start", "switch-in-finish"]);
const markers = (m: SpriteOrderDeferredLend): SpriteOrderDeferredLend[] => ["deferred" in m.activation ? markers(m.activation.deferred) : [], [m]].flat();
const planOf = (m: SpriteOrderDeferredLend) => m.generalAnimation === "RAIN_CONTINUES" ? GENERAL_RAIN_RANDOM2_PLAN : LIVE_MOVE_RANDOM2_PLANS[m.moveId]!;
/** The production words law from the RAM activation value (pinned provenance); its draws must equal the RAM-read rows. */
function wordsFor(vector: Vector): (key: string) => PresentationRngWords | null {
  const byKey = new Map<string, PresentationRngWords>();
  for (const m of markers(vector.marker)) {
    const ram = FIXTURE.words[m.key]!;
    const words = presentationRngPlanWords(createPresentationRngState(ram.activationValue, "pinned"), planOf(m));
    expect(words.words, m.key).toEqual(ram.draws.flatMap((row) => row.slice(1)));
    byKey.set(m.key, words);
  }
  return (key) => byKey.get(key) ?? null;
}
const anchorsOf = (species: Record<Side, number>) => {
  const art = createBattleCommandFieldArtView({ player: { species: species.player }, opponent: { species: species.opponent } } as never);
  return { player: liveBattlerAnchors("player", art).picOffsetPoint, opponent: liveBattlerAnchors("opponent", art).picOffsetPoint };
};
/** The ROM consumer order in entry labels (the lend's labels): rho from the ROM occupancy (roles 0 / 1 / 2, one battler replaced). */
function romLend(rom: Vector["rom"]): readonly number[] {
  const mask = BigInt(`0x${rom.mask0}`);
  const occupied = Array.from({ length: 64 }, (_, slot) => slot).filter((slot) => (mask >> BigInt(slot) & 1n) === 1n);
  const battlers = occupied.filter((slot) => ![0, 1, 2, 60, 61, 62, 63].includes(slot));
  expect(battlers).toHaveLength(2);
  const player = battlers.includes(6) ? 6 : battlers.find((slot) => slot !== 8)!, opponent = battlers.find((slot) => slot !== player)!;
  const rho = spriteOrderEntryLabelRelabel({ free: rom.F0, occupied, battlerSlots: { player, opponent } })!;
  return rom.F0.map((slot) => rho.get(slot)!);
}
/** A Sand-Attack / Mud-Slap body with a send-out / switch-in after it anywhere in the chain (its anchors are no longer the field's). */
function dirtBeforeReplacement(marker: SpriteOrderDeferredLend): boolean {
  const chain = markers(marker);
  return chain.some((m, i) => (m.moveId === 28 || m.moveId === 189)
    && chain.slice(i).some((later) => later.units.some((u) => u.kind === "next-mon-send-out" || u.kind === "switch-in-finish")));
}
const hasBattleUnit = (marker: SpriteOrderDeferredLend) => markers(marker).some((m) => m.units.some((u) => BATTLE_UNITS.has(u.kind)));

describe("words57: the words-deferred replay past battle units (ROM vectors)", () => {
  it("every consumer: the production resolution equals the ROM order, or declines exactly for a dirt body before a battler replacement", () => {
    const tally = { vectors: 0, resolvedThroughBattleUnits: 0, resolvedWithoutBattleUnits: 0, dirtDeclines: 0, kinds: new Set<string>() };
    for (const vector of FIXTURE.vectors) {
      const label = `${vector.job} ${vector.consumer}`;
      const carry = liveWordsOrderDeferredCarry(wordsFor(vector), anchorsOf(vector.species));
      const lend = resolveSpriteOrderDeferredLend(vector.marker, carry, LIVE_WORDS_ORDER_DEFERRED_REPLAY);
      tally.vectors += 1;
      // the chain check's real-slot replay lend is the ROM order relabelled (independent: rho from the ROM occupancy)
      expect(vector.replayLend, label).toEqual(romLend(vector.rom));
      if (dirtBeforeReplacement(vector.marker)) {
        expect(lend, label).toBeNull();
        tally.dirtDeclines += 1;
        continue;
      }
      expect(lend, label).toEqual(romLend(vector.rom));
      if (hasBattleUnit(vector.marker)) {
        tally.resolvedThroughBattleUnits += 1;
        for (const m of markers(vector.marker)) for (const u of m.units) if (BATTLE_UNITS.has(u.kind)) tally.kinds.add(`${u.kind}${"side" in u && u.side ? ` ${u.side}` : ""}`);
        // before words57 the replay allow-list declined every one of these
        expect(resolveSpriteOrderDeferredLend(vector.marker, carry), label).toBeNull();
      } else tally.resolvedWithoutBattleUnits += 1;
    }
    expect({ ...tally, kinds: [...tally.kinds].sort() }).toEqual({ vectors: 79, resolvedThroughBattleUnits: 11, resolvedWithoutBattleUnits: 41,
      dirtDeclines: 27, kinds: ["faint opponent", "forced-switch-out opponent", "forced-switch-out player", "next-mon-send-out",
        "party-summary-hide", "party-summary-next", "switch-in-finish opponent", "switch-in-finish player", "switch-in-start opponent",
        "switch-in-start player", "switch-out opponent"] });
  });
});

describe("words57: replay rules", () => {
  const free = KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER;
  const marker = (units: SpriteOrderPresentationEvent[], extra: Partial<SpriteOrderDeferredLend> = {}): SpriteOrderDeferredLend =>
    ({ key: "k", moveId: 0, attackerSide: "player", generalAnimation: "RAIN_CONTINUES", activation: { free }, units, ...extra });
  const identity = () => free;
  const ko: SpriteOrderPresentationEvent[] = [{ kind: "faint", side: "opponent" }, { kind: "party-summary-next" }, { kind: "party-summary-hide" },
    { kind: "next-mon-send-out" }, { kind: "action-prompt" }, { kind: "actions-committed" }];

  it("unproven units keep declining: a player faint, the player's recall, a party menu, a reshow, an invalidation, the win slide", () => {
    expect(resolveSpriteOrderDeferredLend(marker(ko), identity, LIVE_WORDS_ORDER_DEFERRED_REPLAY)).not.toBeNull();
    for (const unit of [{ kind: "faint", side: "player" }, { kind: "switch-out" }, { kind: "switch-out", side: "player" }, { kind: "party-menu-reset" },
      { kind: "battle-reshow", playerBattlerPresent: true }, { kind: "invalidate", reason: "x" }, { kind: "trainer-slide-end" }] as SpriteOrderPresentationEvent[]) {
      expect(resolveSpriteOrderDeferredLend(marker([unit]), identity, LIVE_WORDS_ORDER_DEFERRED_REPLAY), unit.kind).toBeNull();
    }
  });

  it("only a marker that opts in replays battle units: an Ice Ball marker (and the option-free seam) still declines", () => {
    const ice = marker(ko, { moveId: 301, generalAnimation: undefined, rolloutCounter: 1 });
    expect(resolveSpriteOrderDeferredLend(ice, identity, LIVE_WORDS_ORDER_DEFERRED_REPLAY)).toBeNull();
    expect(resolveSpriteOrderDeferredLend(marker(ko), identity)).toBeNull();
  });

  it("a battler replacement anywhere after a body reaches that body's carry (nested), and the words carry declines it for dirt only", () => {
    const inner = marker([{ kind: "action-prompt" }, { kind: "actions-committed" }], { key: "inner", moveId: 28, generalAnimation: undefined });
    const outer = marker(ko, { key: "outer", activation: { deferred: inner } });
    const seen: [string, boolean][] = [];
    expect(resolveSpriteOrderDeferredLend(outer, (body, activation, replaced) => { seen.push([body.key, replaced]); return activation; },
      { replayBattleUnits: () => true })).not.toBeNull();
    expect(seen).toEqual([["inner", true], ["outer", true]]);
    const anchors = anchorsOf({ player: 18, opponent: 95 });
    const words = () => ({ words: [], draws: [] }) as unknown as PresentationRngWords;
    expect(liveWordsOrderDeferredCarry(words, anchors)(inner, free, true)).toBeNull();
    // rain carries are species-free: the replacement flag does not reach them (a null here would be the words' own check)
    const rainWords = presentationRngPlanWords(createPresentationRngState(0x1234, "pinned"), GENERAL_RAIN_RANDOM2_PLAN);
    expect(liveWordsOrderDeferredCarry(() => rainWords, anchors)(outer, free, true))
      .toEqual(liveWordsOrderDeferredCarry(() => rainWords, anchors)(outer, free, false));
    expect(liveWordsOrderDeferredCarry(() => rainWords, anchors)(outer, free, true)).not.toBeNull();
  });
});
