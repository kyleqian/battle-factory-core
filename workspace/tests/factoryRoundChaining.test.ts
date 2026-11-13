import { describe, expect, it } from "vitest";
import type { GbaButton } from "../src/input.ts";
import { tick, type EngineState } from "../src/engine/core.ts";
import type { FactoryRoundBattleOrchestratorState } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  driveGeneratedRoundToCompletion,
  PLAYER_TRAINER_ID,
  stateAtDecidedRound,
} from "./helpers/factoryRoundCarrier.ts";
import {
  advanceFactoryCarry,
  createInitialFactoryCarry,
  generateFactoryChallengeDraft,
  type FactoryCarry,
} from "../src/engine/factoryRoundChaining.ts";
import { getFactoryRentalRank } from "../src/engine/factoryRentalGeneration.ts";
import { TRAINER_FRONTIER_BRAIN } from "../src/engine/factoryAiMaskSelection.ts";
import { getFactoryFrontierBrainStatus } from "../src/engine/frontierBrainStatus.ts";

// The orchestrator-level round driver (the strong 664 / 678 / 527 trio, scripted wins or a scripted loss) lives in
// tests/helpers/factoryRoundCarrier.ts (shared with lbrd.test.ts).

/**
 * tick()s an EngineState already parked at a decided round's terminal
 * (factoryRoundBattleOrchestrator set, factoryTerminal null) forward by
 * holding A every other frame (JOY_NEW is edge-triggered - see keyRepeat.ts)
 * without ever touching UP/DOWN, so the record menu's cursor stays at its
 * default (NO). Since lbra / lbr-d1 every round end returns to the walkable
 * Lobby, so the mashed A also runs the attendant conversation; it stops the
 * instant the hand-off deals the next draft (pendingGeneratedRound becomes
 * non-null). The pure carry / seed of that boundary is `nextChallenge`.
 */
function driveTerminalToNextDraft(state: EngineState, maxTicks = 8_000): EngineState {
  let s = state;
  const A: ReadonlySet<GbaButton> = new Set(["A"]);
  const NONE: ReadonlySet<GbaButton> = new Set();
  for (let i = 0; i < maxTicks; i += 1) {
    if (s.pendingGeneratedRound !== null) return s;
    s = tick(s, i % 2 === 0 ? A : NONE);
  }
  throw new Error(`terminal did not chain into the next draft within ${maxTicks} ticks`);
}

/**
 * The carry the Lobby entry banks for a decided round (core.ts) and the end cursor of the orchestrator round
 * (the draft seed before lbr-d1; since then the live Lobby cursor deals the draft, so a trajectory test that
 * wants a stable chain drives the next round from the round's own end cursor).
 */
function nextChallenge(
  round: FactoryRoundBattleOrchestratorState,
  carry: FactoryCarry,
): { readonly carry: FactoryCarry; readonly seed: number } {
  return {
    carry: advanceFactoryCarry(
      carry,
      round.round.rules.phase === "roundComplete",
      round.roundOutcome!,
      round.facilityState.rentsCount,
    ),
    seed: round.round.rules.rngValue,
  };
}

describe("factoryRoundChaining (pure carry + generation)", () => {
  it("advances the streak by a full challenge and carries symbols/BP/rents on a win", () => {
    const carry = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const next = advanceFactoryCarry(
      carry,
      true,
      { battlePointsAwarded: 5, symbolGranted: false, newSymbolsCount: 0 },
      3,
    );
    expect(next).toEqual({
      factoryWinStreak: 7,
      factorySymbolsCount: 0,
      battlePoints: 5,
      rentsCount: 3,
      playerTrainerId: PLAYER_TRAINER_ID,
    });
  });

  it("resets the streak to zero and zeroes rentsCount on a loss (source InitFactoryChallenge:208-212), but keeps symbols/BP", () => {
    const carry: FactoryCarry = {
      factoryWinStreak: 21,
      factorySymbolsCount: 1,
      battlePoints: 42,
      rentsCount: 9,
      playerTrainerId: PLAYER_TRAINER_ID,
    };
    const next = advanceFactoryCarry(
      carry,
      false,
      { battlePointsAwarded: 0, symbolGranted: false, newSymbolsCount: 1 },
      9,
    );
    expect(next).toEqual({
      factoryWinStreak: 0,
      factorySymbolsCount: 1,
      battlePoints: 42,
      rentsCount: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
    });
  });

  it("generates the challenge draft with the rank derived from the carried rents count", () => {
    const carry: FactoryCarry = {
      factoryWinStreak: 7,
      factorySymbolsCount: 0,
      battlePoints: 3,
      rentsCount: 15,
      playerTrainerId: PLAYER_TRAINER_ID,
    };
    const { generation, draftScreen } = generateFactoryChallengeDraft(carry, 42);
    expect(generation.challengeNum).toBe(1);
    expect(generation.rentalRank).toBe(getFactoryRentalRank(15));
    expect(draftScreen.rentals).toHaveLength(6);
    expect(draftScreen.rentals.map((r) => r.source.setId)).toEqual(
      generation.rentals.map((r) => r.setId),
    );
  });

  it("is deterministic: identical carry + rngValue produce identical generated drafts", () => {
    const carry: FactoryCarry = {
      factoryWinStreak: 14,
      factorySymbolsCount: 1,
      battlePoints: 20,
      rentsCount: 22,
      playerTrainerId: PLAYER_TRAINER_ID,
    };
    const a = generateFactoryChallengeDraft(carry, 999_999);
    const b = generateFactoryChallengeDraft(carry, 999_999);
    expect(a.generation).toEqual(b.generation);
    expect(a.draftScreen).toEqual(b.draftScreen);
  });
});

describe("factory round chaining (tick() scenario)", () => {
  it("(a) a completed round's terminal returns to the Lobby and the attendant then deals a generated draft that keeps the streak", () => {
    const carry = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry, 17);
    expect(round1.round.rules.phase).toBe("roundComplete");
    expect(round1.roundOutcome).not.toBeNull();

    const chained = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry));

    expect(chained.pendingGeneratedRound).not.toBeNull();
    expect(chained.factoryTerminal).toBeNull();
    expect(chained.factoryRoundBattleOrchestrator).toBeNull();
    expect(chained.factoryCarry.factoryWinStreak).toBe(7);
    expect(chained.factoryCarry.rentsCount).toBe(round1.facilityState.rentsCount);
    // lbr-d1: the draft is dealt from the Lobby's live vblank cursor at the hand-off, not the round's end cursor.
    expect(chained.pendingGeneratedRound!.rngValueBefore).not.toBe(round1.round.rules.rngValue);
    expect(chained.pendingGeneratedRound!.carry).toEqual(chained.factoryCarry);
    expect(chained.lobbyStreakKept).toBe(false);

    const expected = generateFactoryChallengeDraft(
      chained.factoryCarry,
      chained.pendingGeneratedRound!.rngValueBefore,
    );
    expect(chained.draftScreen).toEqual(expected.draftScreen);
    expect(expected.generation.rentalRank).toBe(getFactoryRentalRank(chained.factoryCarry.rentsCount));
  });

  it("(b) streak/symbols/BP/rents carry across four consecutive completed rounds, reaching the silver Frontier Brain at hop 3", () => {
    // seed 3 is a curated starting rngValue: unlike this file's other cases
    // (seed 17), it happens to string together four real wins in a row with
    // the 664/678/527 scripted-win recipe, including against the silver
    // Frontier Brain's generated party at hop 3 - found by scanning starting
    // seeds for one whose *natural* battle outcomes (not scripted swap
    // decisions) chain that deep. The streak values below (7/14/21/28) are
    // pure carry arithmetic and hold for ANY winning seed; only reaching
    // hop 3/4 at all depends on this specific seed's battle outcomes.
    // Re-scanned from 0 to 3 for ISSUES #128: recording battle-start
    // Intimidate/Trace onto aiObservedAbilityIds[0] removes the AI's
    // `get_ability` draws against two-ability player mons, so every
    // trajectory that rides the shared RNG cursor shifts. Nothing about the
    // carry arithmetic below changed.
    // Re-scanned again 3 -> 6 (2026-08-25) for the four end-turn source fixes
    // (ISSUES #130 isFirstTurn/rechargeTimer decay, #131 ENDTURN_ORDER re-sort
    // + tie draw, #132 case-major field loop, #133 end-turn STATUS2_FLINCHED
    // clear): Fake Out now fails from turn 2 and a shadowed flinch no longer
    // costs a second turn, so seed 3's hop-3 round loses. Scanned 0..60 for a
    // seed whose natural outcomes still chain four wins deep and took the
    // first, 6. The carry arithmetic below is unchanged, as before.
    //
    // ISSUES #140 (GetMoveTarget's MOVE_TARGET_SELECTED draw loop on
    // HandleAction_UseMove's four re-target branches) moved every trajectory
    // again and seed 6's hop-3 round now loses, so the same rule re-applies:
    // 6 -> 0, again the first seed in 0..60 that chains four wins deep. The
    // carry arithmetic below is unchanged. ROM receipt:
    // tools/probe/receipts/issue140-getmovetarget-off.json.
    // aip262 (the live AI view fills usablePartyMons, so Roar / Baton Pass / Explosion / Memento score on the real bench counts) moved every trajectory
    // again and seed 0's hop-4 round now loses: 0 -> 1, again the first seed in 0..60 that chains four wins deep. The carry arithmetic below is unchanged.
    // fix274 (#209 effect byte / #210 chosen position) moved every trajectory again and seed 1's hop-3 round now loses: 1 -> 5,
    // the first seed in 0..60 that chains four wins deep (0, 2, 3, 4 lose). The carry arithmetic below is unchanged.
    // parity-mac (docs/parity-mac/STATUS.md "Re-pins": AI draw counts, the opponent's replacement, Encore / Struggle selection, Toxic
    // counter) moved every trajectory again and seed 5's hop-3 round now loses: 5 -> 9, the first seed in 0..30 that chains four wins
    // deep (0..8 lose). The carry arithmetic below is unchanged.
    const carry0 = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry0, 9);
    expect(round1.round.rules.phase).toBe("roundComplete");
    const { carry: carry1, seed: seed2 } = nextChallenge(round1, carry0);
    expect(carry1.factoryWinStreak).toBe(7);
    expect(generateFactoryChallengeDraft(carry1, seed2).generation.challengeNum)
      .toBe(Math.floor(carry1.factoryWinStreak / 7));

    const round2 = driveGeneratedRoundToCompletion(carry1, seed2);
    expect(round2.round.rules.phase).toBe("roundComplete");
    const { carry: carry2, seed: seed3 } = nextChallenge(round2, carry1);
    expect(carry2.factoryWinStreak).toBe(14);
    expect(carry2.battlePoints).toBeGreaterThan(carry1.battlePoints);
    expect(carry2.rentsCount).toBe(round2.facilityState.rentsCount);
    expect(carry2.factorySymbolsCount).toBe(round2.roundOutcome!.newSymbolsCount);
    expect(generateFactoryChallengeDraft(carry2, seed3).generation.challengeNum)
      .toBe(Math.floor(carry2.factoryWinStreak / 7));

    // hop 3: entering streak 14 + battleIndex 6 + the source's +1 modifier
    // (getFactoryFrontierBrainStatus) = 21, the silver threshold - this
    // round's seventh battle is a genuine Frontier Brain encounter reached
    // via real carried streak, not a synthetic starting-streak override.
    const round3 = driveGeneratedRoundToCompletion(carry2, seed3);
    expect(round3.round.rules.phase).toBe("roundComplete");
    expect(round3.round.rules.battleIndex).toBe(6);
    expect(round3.round.rules.currentOpponent.id).toBe(`factory-trainer-${TRAINER_FRONTIER_BRAIN}`);
    expect(round3.round.rules.currentOpponent.frontierBrain).toMatchObject({ status: "silver" });
    expect(getFactoryFrontierBrainStatus({
      battleMode: "singles",
      winStreak: carry2.factoryWinStreak + round3.round.rules.battleIndex,
      symbolsCount: carry2.factorySymbolsCount,
    })).toBe("silver");
    const { carry: carry3, seed: seed4 } = nextChallenge(round3, carry2);
    expect(carry3.factoryWinStreak).toBe(21);
    expect(carry3.battlePoints).toBeGreaterThan(carry2.battlePoints);
    expect(carry3.rentsCount).toBe(round3.facilityState.rentsCount);
    expect(carry3.factorySymbolsCount).toBe(round3.roundOutcome!.newSymbolsCount);
    expect(generateFactoryChallengeDraft(carry3, seed4).generation.challengeNum)
      .toBe(Math.floor(carry3.factoryWinStreak / 7));

    const round4 = driveGeneratedRoundToCompletion(carry3, seed4);
    expect(round4.round.rules.phase).toBe("roundComplete");
    const { carry: carry4, seed: seed5 } = nextChallenge(round4, carry3);
    expect(carry4.factoryWinStreak).toBe(28);
    expect(carry4.battlePoints).toBeGreaterThan(carry3.battlePoints);
    expect(carry4.rentsCount).toBe(round4.facilityState.rentsCount);
    expect(carry4.factorySymbolsCount).toBe(round4.roundOutcome!.newSymbolsCount);
    expect(generateFactoryChallengeDraft(carry4, seed5).generation.challengeNum).toBe(Math.floor(carry4.factoryWinStreak / 7));
  });

  it("(c) a loss resets the streak but keeps symbols/BP, and still re-enters a draft", () => {
    const carry0 = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry0, 17);
    const { carry: carry1 } = nextChallenge(round1, carry0);
    expect(carry1.battlePoints).toBeGreaterThan(0);

    const round2Lost = driveGeneratedRoundToCompletion(
      carry1,
      17,
      undefined,
      "weak",
    );
    expect(round2Lost.round.rules.phase).toBe("roundLost");

    const chained2 = driveTerminalToNextDraft(stateAtDecidedRound(round2Lost, carry1));
    const carry2 = chained2.factoryCarry;

    expect(carry2.factoryWinStreak).toBe(0);
    expect(carry2.rentsCount).toBe(0);
    expect(carry2.battlePoints).toBe(carry1.battlePoints);
    expect(carry2.factorySymbolsCount).toBe(carry1.factorySymbolsCount);
    expect(chained2.pendingGeneratedRound).not.toBeNull();
    expect(chained2.draftScreen.rentals).toHaveLength(6);
    expect(chained2.lobbyFreeRoam).toBeNull();
  });

  it("(d) determinism: replaying the identical decided-round state chains into an identical draft", () => {
    const carry = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry, 17);

    const chainedA = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry));
    const chainedB = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry));

    expect(chainedA.draftScreen).toEqual(chainedB.draftScreen);
    expect(chainedA.factoryCarry).toEqual(chainedB.factoryCarry);
    expect(chainedA.pendingGeneratedRound).toEqual(chainedB.pendingGeneratedRound);
  });
});
