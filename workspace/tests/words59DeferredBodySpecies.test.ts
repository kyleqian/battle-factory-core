import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors, LIVE_WORDS_ORDER_DEFERRED_REPLAY, liveWordsOrderDeferredCarry } from "../src/engine/liveMoveAnimation.ts";
import { GENERAL_RAIN_RANDOM2_PLAN, LIVE_MOVE_RANDOM2_PLANS } from "../src/engine/liveMovePresentationRng.ts";
import { createLiveSpriteOrderHost, markLiveSpriteOrderDeferredBody } from "../src/engine/liveSpriteOrderHost.ts";
import { createPresentationRngState } from "../src/engine/presentationRng.ts";
import { presentationRngPlanWords, type PresentationRngWords } from "../src/engine/presentationRngHost.ts";
import {
  resolveSpriteOrderDeferredLend, spriteOrderEntryLabelRelabel, type SpriteOrderDeferredLend,
} from "../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";

// S10A words59 (docs/next-adapters-words59.md): a Sand-Attack / Mud-Slap marker records the species displayed at its body
// (`bodySpecies`, markLiveSpriteOrderDeferredBody at the orchestrator call site) and the dirt carry aims at THOSE pic points, so the
// words-deferred replay passes the words57-proven battle units for 28 / 189 too. Vectors: words57's committed ROM vectors
// (tools/integration/fixtures/words57/words57-lend-vectors.json, 79 consumers on 23 direct-mGBA jobs) with each dirt marker given the
// body species the words57 chain check carried it with (chain.json: `speciesInferred` where a send-in preceded the body, else the leads).
type Side = "player" | "opponent";
type Vector = { job: string; consumer: string; species: Record<Side, number>; rom: { F0: number[]; mask0: string }; marker: SpriteOrderDeferredLend };
const FIXTURE = JSON.parse(readFileSync("tools/integration/fixtures/words57/words57-lend-vectors.json", "utf8")) as {
  vectors: Vector[]; words: Record<string, { activationValue: number; draws: number[][] }> };
const CHAIN = JSON.parse(readFileSync("tools/integration/fixtures/words57/chain.json", "utf8")) as {
  chains: { job: string; words: string; speciesInferred?: Record<Side, number> }[] };
const INFERRED = new Map<string, Record<Side, number>>(CHAIN.chains.filter((row) => row.speciesInferred !== undefined)
  .map((row) => [`words57:${row.job}:${row.words.split(" f")[1]}`, row.speciesInferred!] as const));

const isDirt = (m: SpriteOrderDeferredLend) => m.moveId === 28 || m.moveId === 189;
const markers = (m: SpriteOrderDeferredLend): SpriteOrderDeferredLend[] => ["deferred" in m.activation ? markers(m.activation.deferred) : [], [m]].flat();
const planOf = (m: SpriteOrderDeferredLend) => m.generalAnimation === "RAIN_CONTINUES" ? GENERAL_RAIN_RANDOM2_PLAN : LIVE_MOVE_RANDOM2_PLANS[m.moveId]!;
/** The marker as the orchestrator now records it: every dirt body (nested too) with its displayed species. */
function withBodySpecies(m: SpriteOrderDeferredLend, leads: Record<Side, number>, species = (key: string) => INFERRED.get(key) ?? leads): SpriteOrderDeferredLend {
  return { ...m, ...(isDirt(m) ? { bodySpecies: species(m.key) } : {}),
    activation: "deferred" in m.activation ? { deferred: withBodySpecies(m.activation.deferred, leads, species) } : m.activation };
}
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
function romLend(rom: Vector["rom"]): readonly number[] {
  const mask = BigInt(`0x${rom.mask0}`);
  const occupied = Array.from({ length: 64 }, (_, slot) => slot).filter((slot) => (mask >> BigInt(slot) & 1n) === 1n);
  const battlers = occupied.filter((slot) => ![0, 1, 2, 60, 61, 62, 63].includes(slot));
  expect(battlers).toHaveLength(2);
  const player = battlers.includes(6) ? 6 : battlers.find((slot) => slot !== 8)!, opponent = battlers.find((slot) => slot !== player)!;
  const rho = spriteOrderEntryLabelRelabel({ free: rom.F0, occupied, battlerSlots: { player, opponent } })!;
  return rom.F0.map((slot) => rho.get(slot)!);
}
const replaces = (m: SpriteOrderDeferredLend) => m.units.some((u) => u.kind === "next-mon-send-out" || u.kind === "switch-in-finish");
/** words57's decline class: a dirt body with a send-out / switch-in after it anywhere in the chain. */
const dirtBeforeReplacement = (marker: SpriteOrderDeferredLend) => markers(marker).some((m, i, chain) => isDirt(m) && chain.slice(i).some(replaces));
const resolve = (marker: SpriteOrderDeferredLend, vector: Vector, consumer: Record<Side, number> = vector.species) =>
  resolveSpriteOrderDeferredLend(marker, liveWordsOrderDeferredCarry(wordsFor(vector), anchorsOf(consumer)), LIVE_WORDS_ORDER_DEFERRED_REPLAY);
const vector = (job: string, consumer: string) => FIXTURE.vectors.find((v) => v.job === job && v.consumer === consumer)!;

describe("words59: the dirt carry reads the body's displayed species (ROM vectors)", () => {
  it("every words57 consumer resolves to the ROM order; the 27 dirt declines now resolve, and the species-free marker still declines them", () => {
    const tally = { vectors: 0, formerDirtDeclines: 0, inferredBodies: new Set<string>() };
    for (const v of FIXTURE.vectors) {
      const label = `${v.job} ${v.consumer}`;
      tally.vectors += 1;
      expect(resolve(withBodySpecies(v.marker, v.species), v), label).toEqual(romLend(v.rom));
      for (const m of markers(v.marker)) if (INFERRED.has(m.key)) tally.inferredBodies.add(m.key);
      if (!dirtBeforeReplacement(v.marker)) continue;
      tally.formerDirtDeclines += 1;
      // without the recorded species (words57's marker) the carry declines past the replacement
      expect(resolve(v.marker, v), label).toBeNull();
    }
    expect({ ...tally, inferredBodies: tally.inferredBodies.size }).toEqual({ vectors: 79, formerDirtDeclines: 27, inferredBodies: 4 });
  });

  it("species swap: the consumer shows another species; the recorded body species keep the ROM order, the consumer's field would not", () => {
    // Pinned from a sweep over species 1..411 on the consumer's side (the first species whose pic point changes the dirt carry):
    // a replacement Spearow (21) on the opponent side / Raticate (19) on the player side after the Mud-Slap body + KO + send-out.
    for (const [job, consumer, side, species] of [["ko-ms-opp-pidgeotto", "33 f6951", "opponent", 21], ["ko-ms-opp-pidgeotto", "129 f7097", "player", 19],
      ["ai-sa-opp-snorlax", "129 f9789", "opponent", 6]] as const) {
      const v = vector(job, consumer), label = `${job} ${consumer} ${side}=${species}`;
      const swapped = { ...v.species, [side]: species };
      expect(dirtBeforeReplacement(v.marker), label).toBe(true);
      // (1)-(2): recorded body species -> the ROM order whatever the consumer shows
      expect(resolve(withBodySpecies(v.marker, v.species), v, swapped), label).toEqual(romLend(v.rom));
      // without them: the species-free marker declines, and the consumer's field (the words57 decline lifted) is NOT the ROM order
      expect(resolve(v.marker, v, swapped), label).toBeNull();
      const carry = liveWordsOrderDeferredCarry(wordsFor(v), anchorsOf(swapped));
      const lifted = resolveSpriteOrderDeferredLend(v.marker, (body, free) => carry(body, free, false), LIVE_WORDS_ORDER_DEFERRED_REPLAY);
      expect(lifted, label).not.toEqual(romLend(v.rom));
      // and a wrong RECORDED species changes the lend too: the carry reads the marker's species
      expect(resolve(withBodySpecies(v.marker, v.species, () => swapped), v), label).not.toEqual(romLend(v.rom));
    }
  });
});

describe("words59: the marker records the body species for the dirt units only", () => {
  const host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory"));
  const lend = { known: true as const, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER };
  const species = { player: 18, opponent: 95 };
  it("Sand-Attack / Mud-Slap carry it; Rain Dance / Ice Ball and a call without species do not", () => {
    for (const moveId of [28, 189]) {
      expect(markLiveSpriteOrderDeferredBody(host, lend, { moveId, attacker: 0 }, "k", species).deferredBody?.bodySpecies).toEqual(species);
      expect(markLiveSpriteOrderDeferredBody(host, lend, { moveId, attacker: 1 }, "k").deferredBody).not.toHaveProperty("bodySpecies");
    }
    for (const body of [{ moveId: 240, attacker: 0 }, { moveId: 301, attacker: 0, rolloutCounter: 1 }]) {
      const marked = markLiveSpriteOrderDeferredBody(host, lend, body, "k", species);
      expect(marked.deferredBody, String(body.moveId)).toBeDefined();
      expect(marked.deferredBody, String(body.moveId)).not.toHaveProperty("bodySpecies");
    }
  });
});

describe("words59: order-dependent-consumer probes (tools/integration/words59Run.sh; Water Pulse / Silver Wind / Tackle after a dirt body + KO + send-out)", () => {
  const W59 = JSON.parse(readFileSync("tools/integration/fixtures/words59/words59-lend-vectors.json", "utf8")) as typeof FIXTURE;
  it("every consumer resolves to the ROM order with the body species; the species-free marker declines past the send-out", () => {
    const tally = { vectors: 0, pastReplacement: 0 };
    for (const v of W59.vectors) {
      const label = `${v.job} ${v.consumer}`;
      const byKey = new Map<string, PresentationRngWords>();
      for (const m of markers(v.marker)) {
        const ram = W59.words[m.key]!;
        const words = presentationRngPlanWords(createPresentationRngState(ram.activationValue, "pinned"), planOf(m));
        expect(words.words, m.key).toEqual(ram.draws.flatMap((row) => row.slice(1)));
        byKey.set(m.key, words);
      }
      const carry = liveWordsOrderDeferredCarry((key) => byKey.get(key) ?? null, anchorsOf(v.species));
      tally.vectors += 1;
      expect(resolveSpriteOrderDeferredLend(withBodySpecies(v.marker, v.species, () => v.species), carry, LIVE_WORDS_ORDER_DEFERRED_REPLAY), label)
        .toEqual(romLend(v.rom));
      if (!dirtBeforeReplacement(v.marker)) continue;
      tally.pastReplacement += 1;
      expect(resolveSpriteOrderDeferredLend(v.marker, carry, LIVE_WORDS_ORDER_DEFERRED_REPLAY), label).toBeNull();
    }
    expect(tally).toEqual({ vectors: 16, pastReplacement: 11 });
  });
});
