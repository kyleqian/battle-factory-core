import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

/**
 * fix274 / ISSUES #210: `HandleTurnActionSelectionState` writes
 * `gBattleStruct->chosenMovePositions[battler]` when the battler's move is
 * selected (battle_main.c:4398), before any action runs. `GetWhoStrikesFirst`
 * (ENDTURN_ORDER, `ignoreChosenMoves == FALSE`, battle_main.c:4694-4720) then
 * reads `gBattleMons[b].moves[chosenMovePositions[b]]` for a battler that may
 * have fainted before acting and been replaced. A mon that never acts must
 * still carry the slot it selected this turn, not the previous turn's.
 */
const TACKLE = 33;
const SCRATCH = 10;

const member = (moves: readonly [number, number, number, number]) => ({
  species: 27,
  abilityNum: 0,
  moves,
  maxHP: 150,
  attack: 80,
  defense: 200,
  speed: 50,
  spAttack: 40,
  spDefense: 100,
});

function config(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 919694434,
    player: {
      species: 43, moveId: TACKLE, moves: [TACKLE, SCRATCH, 0, 0], pp: [10, 10, 0, 0],
      attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 40, hp: 1,
    },
    trainer: {
      species: 1, moveId: TACKLE, moves: [TACKLE, SCRATCH, 0, 0], pp: [10, 10, 0, 0],
      attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 999,
    },
    playerBenchHp: [100, 100],
    playerBenchOverride: [member([TACKLE, SCRATCH, 0, 0]), member([TACKLE, SCRATCH, 0, 0])],
  };
}

const useMove = (moveSlot: 0 | 1 | 2 | 3, targetBattler: 0 | 1) =>
  ({ kind: "use-move" as const, moveSlot, targetBattler });

describe("fix274 #210: chosenMovePositions is written at selection, not only at action time", () => {
  it("a battler that faints before acting keeps the slot it selected this turn", () => {
    const initial = createFactoryFullTurnBattleState(config());
    expect(initial.rules.rulesContext.chosenMovePositions).toEqual([0, 0, 0, 0]);

    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: useMove(1, 1),
    });
    const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: useMove(0, 0),
    });

    // The faster trainer KOs the 1-HP lead; the player never executed slot 1.
    expect(afterTrainer.kind).toBe("decision-required");
    if (afterTrainer.kind !== "decision-required") return;
    expect(afterTrainer.state.boundary.kind === "decision-required" && afterTrainer.state.boundary.request.kind).toBe("forced-switch");
    expect(afterTrainer.state.rules.rulesContext.battlers[0].hp).toBe(0);
    expect(afterTrainer.state.rules.rulesContext.chosenMovePositions).toEqual([1, 0, 0, 0]);
  });

  it("a voluntary switch decision leaves the previous position untouched", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: { kind: "switch", partyIndex: 1 },
    });
    const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: useMove(1, 0),
    });
    expect(afterTrainer.state.rules.rulesContext.chosenMovePositions).toEqual([0, 1, 0, 0]);
  });
});
