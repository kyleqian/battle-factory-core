// Tier-1 pin for the opt-in "oracle-strength" soak policy
// (tools/soak/randomRoundSoakDriver.ts): the player's fight-slot choice is
// delegated to the ENGINE'S OWN source-derived Factory AI scorer,
// `chooseFactoryAiScoredDecision`, fed a `FactoryAiScoredView` that mirrors
// the live opponent driver's own with the two sides swapped.
//
// The equality pin below deliberately asserts NO literal slot: it stages a
// real fight menu by driving the production tick loop, then builds BOTH the
// policy's answer and the scorer's own answer from that same state and the
// same RNG cursor, and requires them to be the same slot. A future change to
// the scorer moves both sides together; a change that quietly stops
// delegating breaks the pin.

import { describe, expect, it } from "vitest";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";
import {
  chooseFactoryAiScoredDecision,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { selectFactoryAiMask } from "../src/engine/factoryAiMaskSelection.ts";
import type {
  BattleMoveDecision,
  BattleMoveSlot,
} from "../src/engine/battleDecisionBoundary.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";
import {
  buildOracleStrengthPlayerView,
  pickOracleStrengthFightSlot,
  ORACLE_STRENGTH_FACTORY_INPUT,
  RandomPlayer,
  Rng,
  ActionLog,
  runSeed,
} from "../tools/soak/randomRoundSoakDriver.ts";

/**
 * Drives the real production play path (createInitialState + tick, button
 * presses only) with the oracle-strength player until battle 1's fight menu
 * is open with a live battle attached, and returns that staged state.
 */
function stageFightMenuState(seed: number, maxFrames = 20_000): EngineState {
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "oracle-strength");
  let state = createInitialState();
  for (let frame = 0; frame < maxFrames; frame += 1) {
    const orch = state.factoryRoundBattleOrchestrator;
    const presentation = orch?.battleCommandPresentation;
    if (
      presentation?.lifecycle.phase === "fight-menu"
      && orch?.battle !== null
      && orch?.battle !== undefined
      && orch.battlePartySelect === null
    ) {
      return state;
    }
    const buttons: ReadonlySet<GbaButton> = player.decide(state);
    state = tick(state, buttons);
  }
  throw new Error(`seed ${seed}: no fight menu within ${maxFrames} frames`);
}

function legalSlotsOf(state: EngineState): readonly boolean[] {
  return state.factoryRoundBattleOrchestrator!.battleCommandPresentation!
    .legalMoveBySlot.map((slot) => slot !== null);
}

function rulesContextOf(state: EngineState): BattleScriptRulesContext {
  return state.factoryRoundBattleOrchestrator!.battle!.rules.rulesContext;
}

describe("oracle-strength soak policy (opt-in, engine-scorer move choice)", () => {
  it("picks exactly the slot chooseFactoryAiScoredDecision returns for the same view pair", () => {
    // Several staged fight menus, so the pin covers more than one movesest /
    // legality shape rather than a single lucky state.
    for (const seed of [0, 3, 12] as const) {
      const state = stageFightMenuState(seed);
      const rulesContext = rulesContextOf(state);
      const legalSlots = legalSlotsOf(state);
      const battleTurnCount = 0;
      // Any cursor works as long as BOTH sides use the same one -- the pin is
      // "the policy delegates", not "the scorer scores X".
      const rngValue = 0x1234_5678;

      const legalDecisions: BattleMoveDecision[] = [];
      for (let slot = 0; slot < 4; slot += 1) {
        if (!legalSlots[slot]) continue;
        if (rulesContext.battlers[0].moves[slot] === 0) continue;
        legalDecisions.push({
          kind: "use-move",
          moveSlot: slot as BattleMoveSlot,
          targetBattler: 0,
        });
      }
      expect(legalDecisions.length, `seed ${seed}: staged menu has a legal slot`)
        .toBeGreaterThan(0);

      const expected = chooseFactoryAiScoredDecision({
        view: buildOracleStrengthPlayerView({ rulesContext, battleTurnCount }),
        request: {
          kind: "command",
          requestId: 0,
          side: "trainer",
          battler: 1,
          legalDecisions,
        },
        rng: { value: rngValue, calls: 0 },
      });
      const expectedDecision = expected.submission.decision;
      expect(expectedDecision.kind).toBe("use-move");

      const actual = pickOracleStrengthFightSlot({
        rulesContext,
        legalSlots,
        battleTurnCount,
        rngValue,
      });
      expect(actual.fallbackReason, `seed ${seed}: no fallback expected`).toBeNull();
      expect(actual.slot, `seed ${seed}`).toBe(
        (expectedDecision as BattleMoveDecision).moveSlot,
      );
      // ...and it is the scorer's full triad that produced it.
      expect(expected.trace.mask).toBe(7);
    }
  });

  it("runs the scorer under the full mask 7 (CHECK_BAD_MOVE|TRY_TO_FAINT|CHECK_VIABILITY)", () => {
    const selection = selectFactoryAiMask(ORACLE_STRENGTH_FACTORY_INPUT);
    expect(selection.mask).toBe(7);
    expect(selection.receipt.branch.id).toBe("challengeAtLeast4");
  });

  it("falls back (with a reason) when no fight slot is legal", () => {
    const rulesContext = rulesContextOf(stageFightMenuState(0));
    const pick = pickOracleStrengthFightSlot({
      rulesContext,
      legalSlots: [false, false, false, false],
      battleTurnCount: 0,
      rngValue: 0x1234_5678,
    });
    expect(pick.slot).toBeNull();
    expect(pick.fallbackReason).toBe("no legal fight slot");
  });

  it("reaches battle 1's first action menu and is deterministic per seed", () => {
    const options = {
      maxFrames: 6_000,
      renderEvery: 8,
      policy: "oracle-strength" as const,
      stopAtFirstActionMenu: true,
    } as const;
    const first = runSeed(12, options);
    expect(first).toMatchObject({
      outcome: "OK",
      endState: "milestone:first-action-menu",
    });
    expect(runSeed(12, options)).toEqual(first);
  });
});
