/**
 * Differential structure check: replays the twice-fresh Noland (Frontier
 * Brain) ROM receipts (`tools/probe/receipts/noland-brain-party-{silver,gold}.json`,
 * dossier `docs/noland-brain-ground-truth.md`) against the ported
 * `generateFactoryBrainOpponent` (`src/engine/factoryBrainOpponentGeneration.ts`),
 * segment-wise. Distinct from `tools/probe/verify-noland-brain-receipts.ts`
 * (a standalone Node script that re-derives retail constants by hand and
 * never touches the TS engine): every check here goes through the engine's
 * own exported arithmetic instead of a hand-copied table.
 *
 * Both receipts span a real trace's ~28-frame `FillFactoryBrainParty`
 * window, during which the per-VBlank ambient `Random()` advance
 * interleaves with the function's own draws (31 VBlankIntr-attributed calls
 * for silver, 30 for gold -- see the dossier). A single-cursor engine
 * replay has no way to model that external interleave, so byte-exactness
 * below is claimed only against captured cursors: each mon's own
 * pre-draw cursor (per-mon reconstruction), and the whole-party start
 * cursor for mon 0 only (which precedes any ambient interleave).
 */

import { describe, expect, it } from "vitest";
import silverReceiptJson from "../tools/probe/receipts/noland-brain-party-silver.json" with { type: "json" };
import goldReceiptJson from "../tools/probe/receipts/noland-brain-party-gold.json" with { type: "json" };
import {
  generateFactoryBrainOpponent,
  type FactoryBrainOpponentGenerationInput,
} from "../src/engine/factoryBrainOpponentGeneration.ts";
import { getLevel50FactoryRentalRange } from "../src/engine/factoryRentalGeneration.ts";
import { natureFromPersonality, randomU16 } from "../src/engine/opponentGen.ts";

interface RandomCallRecord {
  frame: number;
  caller: string;
  lr: string;
  pre: number;
  post: number;
}

interface DrawLedgerRecord {
  drawIndex: number;
  frame: number;
  monId: number;
  species: number;
  heldItem: number;
  outcome: string;
  acceptSlot?: number;
  personalityAttempts: RandomCallRecord[];
}

interface EnemyMonRecord {
  personality: number;
  otId: number;
  species: number;
  item: number;
  nature: number;
  ivs: Record<string, number>;
}

interface NolandBrainReceipt {
  staged: {
    factoryWinStreakSingles50: number;
    rentalMons: number[];
    playerTrainerId: number;
  };
  derived: { challengeNum: number; expectedFixedIV: number; monIdRange: { lo: number; hi: number } };
  rngValueBeforeFirstFactoryDraw: number;
  randomCalls: RandomCallRecord[];
  drawLedger: DrawLedgerRecord[];
  enemyParty: EnemyMonRecord[];
}

const RECEIPTS: readonly {
  name: string;
  expectedChallengeNum: number;
  expectedFixedIv: number;
  receipt: NolandBrainReceipt;
}[] = [
  {
    name: "silver",
    expectedChallengeNum: 2,
    expectedFixedIv: 15,
    receipt: silverReceiptJson as unknown as NolandBrainReceipt,
  },
  {
    name: "gold",
    expectedChallengeNum: 5,
    expectedFixedIv: 31,
    receipt: goldReceiptJson as unknown as NolandBrainReceipt,
  },
];

function generationInputFor(receipt: NolandBrainReceipt, rngValue: number): FactoryBrainOpponentGenerationInput {
  return {
    rngValue,
    factoryWinStreak: receipt.staged.factoryWinStreakSingles50,
    playerRentalSetIds: receipt.staged.rentalMons,
    playerTrainerId: receipt.staged.playerTrainerId,
  };
}

/** The receipt's flat Random() log, filtered to the GetFactoryMonId call attributed to each drawLedger entry, in order. */
function factoryMonIdCalls(receipt: NolandBrainReceipt): RandomCallRecord[] {
  return receipt.randomCalls.filter((call) => call.caller.startsWith("GetFactoryMonId"));
}

/** Regenerates from mon `monIndex`'s own pre-draw cursor; `.opponents[0]` is that mon reconstructed in isolation. */
function reconstructMon(receipt: NolandBrainReceipt, monIndex: number) {
  const preCursor = factoryMonIdCalls(receipt)[monIndex]!.pre;
  return generateFactoryBrainOpponent(generationInputFor(receipt, preCursor));
}

function generateWholeParty(receipt: NolandBrainReceipt) {
  return generateFactoryBrainOpponent(generationInputFor(receipt, receipt.rngValueBeforeFirstFactoryDraw));
}

describe("Noland (Frontier Brain) ROM receipts vs generateFactoryBrainOpponent", () => {
  for (const { name, expectedChallengeNum, expectedFixedIv, receipt } of RECEIPTS) {
    describe(`${name} receipt (challengeNum ${expectedChallengeNum})`, () => {
      // Precondition for per-mon reconstruction below: no monId-level draw
      // was ever rejected by a chosen-party-context rule (saved-rental-set-id,
      // duplicate-species, duplicate-item -- each depends on prior *accepted*
      // mons in this same run). With zero such rejections, starting fresh at
      // any mon's own pre-draw cursor (empty chosen-party context) cannot
      // diverge from what the ROM actually accepted: removing context can
      // only make a context-dependent rule less likely to reject, never more.
      // A future re-capture with a real rejection would break this reasoning,
      // so it is asserted here, not assumed.
      it("has zero monId-level (chosen-party-context) rejections", () => {
        expect(receipt.drawLedger).toHaveLength(3);
        expect(receipt.drawLedger.every((draw) => draw.outcome === "accept")).toBe(true);
      });

      it("ledger replay: every factory-attributed Random() call matches the engine's own arithmetic", () => {
        const monIdCalls = factoryMonIdCalls(receipt);
        expect(monIdCalls).toHaveLength(receipt.drawLedger.length);
        const range = getLevel50FactoryRentalRange(receipt.derived.challengeNum, false);

        receipt.drawLedger.forEach((draw, i) => {
          // GetFactoryMonId (battle_factory.c:828-866): one Random() call,
          // monId = range.start + (u16 % rangeWidth).
          const call = monIdCalls[i]!;
          const replay = randomU16(call.pre);
          expect(replay.rngValue, `${name} monId draw ${i} LCG step`).toBe(call.post);
          const expectedMonId = range.start + (replay.value % (range.end - range.start + 1));
          expect(expectedMonId, `${name} monId draw ${i} range arithmetic`).toBe(draw.monId);

          // CreateMonWithEVSpreadNatureOTID (pokemon.c:2562-2593): a
          // Random32()-retry loop (low word then high word), accepting only
          // when natureFromPersonality(personality) matches this setId's
          // nature. That target nature comes from the engine's own
          // single-mon reconstruction (proven byte-exact in the next `it`),
          // not a hand-copied FRONTIER_MONS lookup.
          const targetNature = reconstructMon(receipt, i).opponents[0]!.nature;
          const attempts = draw.personalityAttempts;
          expect(attempts.length % 2, `${name} mon ${i} personality attempt count is even`).toBe(0);
          expect(attempts.length, `${name} mon ${i} has at least one attempt`).toBeGreaterThan(0);

          for (let j = 0; j < attempts.length; j += 2) {
            const low = attempts[j]!;
            const high = attempts[j + 1]!;
            const lowReplay = randomU16(low.pre);
            const highReplay = randomU16(high.pre);
            expect(lowReplay.rngValue, `${name} mon ${i} attempt ${j / 2} low LCG step`).toBe(low.post);
            expect(highReplay.rngValue, `${name} mon ${i} attempt ${j / 2} high LCG step`).toBe(high.post);
            const personality = (lowReplay.value | (highReplay.value << 16)) >>> 0;
            const accepted = natureFromPersonality(personality) === targetNature;
            const isFinalAttempt = j === attempts.length - 2;
            expect(accepted, `${name} mon ${i} attempt ${j / 2} accept/reject verdict`).toBe(isFinalAttempt);
            if (isFinalAttempt) {
              expect(personality, `${name} mon ${i} final personality matches the receipt's realized party`)
                .toBe(receipt.enemyParty[i]!.personality);
            }
          }
        });
      });

      it("per-mon adopted-cursor byte-exactness: the first generated opponent matches the ROM's mon i", () => {
        receipt.drawLedger.forEach((_, i) => {
          const opponent = reconstructMon(receipt, i).opponents[0]!;
          const romMon = receipt.enemyParty[i]!;
          expect(opponent.member.species, `${name} mon ${i} species`).toBe(romMon.species);
          expect(opponent.personality, `${name} mon ${i} personality`).toBe(romMon.personality);
          expect(opponent.itemId, `${name} mon ${i} item`).toBe(romMon.item);
          expect(opponent.nature, `${name} mon ${i} nature`).toBe(romMon.nature);
          expect(opponent.member.ivs, `${name} mon ${i} IVs`).toEqual(romMon.ivs);
          expect(opponent.otId, `${name} mon ${i} OT id`).toBe(romMon.otId);
        });
      });

      it("whole-party single-cursor replay reproduces mon 0 byte-exactly, ledger prefix included", () => {
        const result = generateWholeParty(receipt);
        const opponent = result.opponents[0]!;
        const romMon0 = receipt.enemyParty[0]!;
        expect(opponent.member.species, `${name} mon 0 species`).toBe(romMon0.species);
        expect(opponent.personality, `${name} mon 0 personality`).toBe(romMon0.personality);
        expect(opponent.itemId, `${name} mon 0 item`).toBe(romMon0.item);
        expect(opponent.nature, `${name} mon 0 nature`).toBe(romMon0.nature);
        expect(opponent.member.ivs, `${name} mon 0 IVs`).toEqual(romMon0.ivs);
        expect(opponent.otId, `${name} mon 0 OT id`).toBe(romMon0.otId);

        // Mons 1-2 legitimately diverge from here: FillFactoryBrainParty's
        // real ~28-frame span lets the per-VBlank ambient Random() advance
        // fire between mon 0's acceptance and mon 1's first draw (and again
        // before mon 2), an external cursor jump this single-cursor replay
        // cannot see. Only the mon-0 prefix -- entirely before any ambient
        // interleave -- is expected to line up, draw for draw.
        const draw0 = receipt.drawLedger[0]!;
        const receiptMon0Prefix: RandomCallRecord[] = [factoryMonIdCalls(receipt)[0]!, ...draw0.personalityAttempts];
        const engineMon0Ledger = result.drawLedger.filter((entry) => entry.opponentIndex === 0);
        expect(engineMon0Ledger).toHaveLength(receiptMon0Prefix.length);
        engineMon0Ledger.forEach((entry, idx) => {
          const call = receiptMon0Prefix[idx]!;
          expect(entry.rngBefore, `${name} mon-0 ledger[${idx}] rngBefore`).toBe(call.pre);
          expect(entry.rngAfter, `${name} mon-0 ledger[${idx}] rngAfter`).toBe(call.post);
          expect(entry.randomU16, `${name} mon-0 ledger[${idx}] randomU16`).toBe((call.post >>> 16) & 0xffff);
        });
      });

      it("structure: challengeNum, fixedIv, IV uniformity, draw range, and no duplicate/rental draws", () => {
        const result = generateWholeParty(receipt);
        expect(result.challengeNum, `${name} challengeNum`).toBe(expectedChallengeNum);
        expect(result.fixedIv, `${name} fixedIv`).toBe(expectedFixedIv);
        expect(receipt.derived.challengeNum, `${name} receipt challengeNum`).toBe(expectedChallengeNum);
        expect(receipt.derived.expectedFixedIV, `${name} receipt fixedIv`).toBe(expectedFixedIv);

        for (const mon of receipt.enemyParty) {
          expect(Object.values(mon.ivs), `${name} mon IVs all fixed at ${expectedFixedIv}`)
            .toEqual([expectedFixedIv, expectedFixedIv, expectedFixedIv, expectedFixedIv, expectedFixedIv, expectedFixedIv]);
        }

        const range = getLevel50FactoryRentalRange(receipt.derived.challengeNum, false);
        for (const draw of receipt.drawLedger) {
          expect(draw.monId, `${name} monId ${draw.monId} >= range.start`).toBeGreaterThanOrEqual(range.start);
          expect(draw.monId, `${name} monId ${draw.monId} <= range.end`).toBeLessThanOrEqual(range.end);
          expect(receipt.staged.rentalMons, `${name} monId ${draw.monId} is not a player rental`)
            .not.toContain(draw.monId);
        }
        expect(new Set(receipt.drawLedger.map((d) => d.species)).size, `${name} no duplicate species`)
          .toBe(receipt.drawLedger.length);
        expect(new Set(receipt.drawLedger.map((d) => d.heldItem)).size, `${name} no duplicate held item`)
          .toBe(receipt.drawLedger.length);
      });
    });
  }
});
