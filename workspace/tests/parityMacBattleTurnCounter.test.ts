import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/ai-turn-counter.md (audit lead A5). gBattleResults.battleTurnCounter is 0 at battle start and BattleTurnPassed
// adds 1 per completed turn (battle_main.c:3995-3999). The opponent AI's get_turn_count reads it (battle_ai_script_commands.c:1111).

const TACKLE = 33;
const RAGE = 99;

function config(rngSeed: number): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    player: {
      species: 29,
      moveId: TACKLE,
      moves: [TACKLE, RAGE, 0, 0],
      pp: [35, 20, 0, 0],
      attack: 100,
      defense: 100,
      spAttack: 80,
      spDefense: 100,
      speed: 50,
      hp: 500,
    },
    trainer: {
      species: 32,
      moveId: TACKLE,
      moves: [TACKLE, 0, 0, 0],
      pp: [35, 0, 0, 0],
      attack: 80,
      defense: 100,
      spAttack: 80,
      spDefense: 100,
      speed: 100, // moves first every turn
      hp: 500,
    },
  };
}

/** Plays one turn (player slot, trainer Tackle) and returns the next turn's state. */
function turn(state: ReturnType<typeof createFactoryFullTurnBattleState>, requestId: number, playerSlot: 0 | 1) {
  const afterPlayer = submitFactoryFullTurnDecision(state, {
    requestId, side: "player", decision: { kind: "use-move", moveSlot: playerSlot, targetBattler: 1 },
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command");
  const done = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: requestId + 1, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  if (done.kind !== "decision-required") throw new Error("expected the next turn's player command");
  return done;
}

describe("BattleTurnPassed counts turns (gBattleResults.battleTurnCounter, battle_main.c:3995-3999)", () => {
  it("0 at battle start, +1 after each completed turn", () => {
    // docs/parity-mac/ai-turn-counter.md. Unfixed: the field did not exist and the AI's get_turn_count read 0 all battle.
    const start = createFactoryFullTurnBattleState(config(3));
    expect(start.rules.rulesContext.battleTurnCounter).toBe(0);
    const first = turn(start, 1, 0);
    expect(first.state.rules.rulesContext.battleTurnCounter).toBe(1);
    expect(turn(first.state, 3, 0).state.rules.rulesContext.battleTurnCounter).toBe(2);
  });
});
