/**
 * land86 (docs/land86-flatter-words-unit.md; flat84, docs/next-adapters-flat84.md): Flatter 260 is a words-order unit. Its post-body free order
 * is the adapter's own carried order at its words (liveFlatterWordsPostFree) == the ROM end order on the 47 flat84 bodies, and any consumer
 * after a Flatter marker resolves the deferred lend (KO-chain vectors: the ROM activation order). Fails if the three src hunks are reverted.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import {
  liveBattlerAnchors, liveFlatterWordsPostFree, LIVE_WORDS_ORDER_DEFERRED_REPLAY, liveWordsOrderDeferredCarry,
} from "../src/engine/liveMoveAnimation.ts";
import { activateLiveMovePresentationRng, LIVE_MOVE_RANDOM2_PLANS, liveMovePresentationRngWords } from "../src/engine/liveMovePresentationRng.ts";
import { DEFERRED_LEND_MOVE_IDS, markLiveSpriteOrderDeferredBody, createLiveSpriteOrderHost } from "../src/engine/liveSpriteOrderHost.ts";
import { createPresentationRngState } from "../src/engine/presentationRng.ts";
import { createPresentationRngHostAt, presentationRngPlanWords } from "../src/engine/presentationRngHost.ts";
import { resolveSpriteOrderDeferredLend, spriteOrderEntryLabelRelabel, type SpriteOrderDeferredLend } from "../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { isWordsOrderDeferredUnit, WORDS_ORDER_UNIT_MOVE_IDS } from "../src/engine/wordsOrderUnits.ts";

type Side = "player" | "opponent";
const DIR = "tools/integration/fixtures/flat84";
const BODIES = JSON.parse(readFileSync(`${DIR}/flatter-vectors.json`, "utf8")) as {
  bodies: { scenario: string; flatter: number; attackerSide: Side; rng2: number; bodySpecies: Record<Side, number>;
    activationFree: number[]; romPostFree: number[] }[];
};
const KO = JSON.parse(readFileSync(`${DIR}/ko-chain/lend-vectors.json`, "utf8")) as {
  vectors: { job: string; consumer: string; species: Record<Side, number>; rom: { F0: number[]; mask0: string };
    replayLend: number[]; marker: SpriteOrderDeferredLend }[];
  words: Record<string, { activationValue: number; draws: number[][] }>;
};
const markers = (m: SpriteOrderDeferredLend): SpriteOrderDeferredLend[] => ["deferred" in m.activation ? markers(m.activation.deferred) : [], [m]].flat();

describe("land86: Flatter 260 words-order unit", () => {
  it("membership: a words-order unit and a deferred-lend body", () => {
    expect(WORDS_ORDER_UNIT_MOVE_IDS).toContain(260);
    expect(DEFERRED_LEND_MOVE_IDS).toContain(260);
    expect(isWordsOrderDeferredUnit({ moveId: 260 })).toBe(true);
  });

  it("plan == ROM on the 47 flat84 bodies (production words + liveFlatterWordsPostFree)", () => {
    expect(BODIES.bodies).toHaveLength(47);
    for (const b of BODIES.bodies) {
      const req = battleMoveAnimationRequest(b.attackerSide === "player" ? 0 : 1, b.attackerSide === "player" ? 1 : 0, ["260", "0", "0", "0", "70", "0"]);
      const key = `land86:${b.scenario}:${b.flatter}`;
      const host = createPresentationRngHostAt(createPresentationRngState(b.rng2, "pinned"));
      const words = liveMovePresentationRngWords({ host: activateLiveMovePresentationRng(host, req, key), key });
      expect(liveFlatterWordsPostFree({ attackerSide: b.attackerSide }, b.activationFree, words, b.bodySpecies), `${b.scenario} #${b.flatter}`)
        .toEqual(b.romPostFree);
    }
  });

  it("a Flatter marker records the body species; a species-free 260 marker declines", () => {
    const species = { player: 33, opponent: 30 };
    const host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory"));
    const lend = { free: BODIES.bodies[0]!.activationFree } as never;
    const marked = markLiveSpriteOrderDeferredBody(host, lend, { moveId: 260, attacker: 0 }, "move:1:0:0", species);
    expect(marked.deferredBody).toMatchObject({ moveId: 260, attackerSide: "player", bodySpecies: species });
    const free = BODIES.bodies[0]!;
    const carry = liveWordsOrderDeferredCarry(() => null, { player: { x: 0, y: 0 }, opponent: { x: 0, y: 0 } } as never);
    expect(carry({ key: "k", moveId: 260, attackerSide: free.attackerSide } as never, free.activationFree, false)).toBeNull();
  });

  it("a consumer after a Flatter marker gets the resolved lend == the ROM activation order (KO chain, 9 consumers)", () => {
    expect(KO.vectors).toHaveLength(9);
    for (const v of KO.vectors) {
      const label = `${v.job} ${v.consumer}`;
      const byKey = new Map(markers(v.marker).map((m) => {
        const ram = KO.words[m.key]!;
        return [m.key, presentationRngPlanWords(createPresentationRngState(ram.activationValue, "pinned"), LIVE_MOVE_RANDOM2_PLANS[m.moveId]!)] as const;
      }));
      const art = createBattleCommandFieldArtView({ player: { species: v.species.player }, opponent: { species: v.species.opponent } } as never);
      const anchors = { player: liveBattlerAnchors("player", art).picOffsetPoint, opponent: liveBattlerAnchors("opponent", art).picOffsetPoint };
      const lend = resolveSpriteOrderDeferredLend(v.marker, liveWordsOrderDeferredCarry((key) => byKey.get(key) ?? null, anchors),
        LIVE_WORDS_ORDER_DEFERRED_REPLAY);
      const mask = BigInt(`0x${v.rom.mask0}`);
      const occupied = Array.from({ length: 64 }, (_, s) => s).filter((s) => (mask >> BigInt(s) & 1n) === 1n);
      const battlers = occupied.filter((s) => ![0, 1, 2, 60, 61, 62, 63].includes(s));
      const player = battlers.includes(6) ? 6 : battlers.find((s) => s !== 8)!, opponent = battlers.find((s) => s !== player)!;
      const rho = spriteOrderEntryLabelRelabel({ free: v.rom.F0, occupied, battlerSlots: { player, opponent } })!;
      expect(lend, label).toEqual(v.rom.F0.map((s) => rho.get(s)!));
      expect(lend, label).toEqual(v.replayLend);
    }
  });
});
