import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/curse-player-target.md. The player's move menu sends a non-Ghost Curse with the USER as its target
// (HandleInputChooseMove, battle_controller_player.c:486-501); the opponent's controller keeps the foe
// (battle_controller_opponent.c:1581). Cmd_ppreduce's Pressure test is `gBattlerAttacker != gBattlerTarget`
// (battle_script_commands.c:1223-1225). ROM seed 3375: the player's Muk used Curse into Pressure Dusclops, 10 -> 9 PP;
// the engine took 2 and Muk ran out of PP turns early.

const TACKLE = 33;
const CURSE = 174;
const PRESSURE = 46;

function config(curseSide: "player" | "trainer"): FactoryFullTurnConfig {
  const curseUser = { moveId: CURSE, moves: [CURSE, TACKLE, 0, 0] as const, pp: [10, 35, 0, 0] as const };
  const pressureFoe = { moveId: TACKLE, moves: [TACKLE, 0, 0, 0] as const, pp: [35, 0, 0, 0] as const, ability: PRESSURE };
  const stats = { attack: 100, defense: 100, spAttack: 80, spDefense: 100, hp: 500 };
  return {
    requestId: 1,
    rngSeed: 3,
    player: { species: 89, speed: 50, ...stats, ...(curseSide === "player" ? curseUser : pressureFoe) }, // Muk (Poison)
    trainer: { species: 89, speed: 100, ...stats, ...(curseSide === "trainer" ? curseUser : pressureFoe) },
  } as FactoryFullTurnConfig;
}

/** The legal decisions of the state's pending command request. */
function commandDecisions(state: ReturnType<typeof createFactoryFullTurnBattleState>) {
  const boundary = state.boundary;
  if (boundary?.kind !== "decision-required" || boundary.request.kind !== "command") throw new Error("expected a command request");
  return boundary.request.legalDecisions;
}

function playTurn(curseSide: "player" | "trainer") {
  const initial = createFactoryFullTurnBattleState(config(curseSide));
  const playerLegal = commandDecisions(initial);
  const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: playerLegal[0]! });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command");
  const trainerLegal = commandDecisions(afterPlayer.state);
  const done = submitFactoryFullTurnDecision(afterPlayer.state, { requestId: 2, side: "trainer", decision: trainerLegal[0]! });
  if (done.kind !== "decision-required") throw new Error("expected the next turn's command");
  return { playerLegal, trainerLegal, rules: done.state.rules.rulesContext };
}

describe("a non-Ghost Curse and Pressure: the player's targets the user, the opponent's targets the foe", () => {
  it("player: the menu's Curse decision targets the user and costs 1 PP against Pressure", () => {
    const { playerLegal, rules } = playTurn("player");
    expect(playerLegal[0]).toMatchObject({ kind: "use-move", moveSlot: 0, targetBattler: 0 }); // unfixed: 1
    expect(rules.battlers[0].pp[0]).toBe(9); // unfixed: 8
    expect(rules.battlers[0].statStages[1]).toBe(7); // Curse still worked: Attack +1
  });

  it("opponent: its Curse keeps the foe as target and costs 2 PP against Pressure", () => {
    const { trainerLegal, rules } = playTurn("trainer");
    expect(trainerLegal[0]).toMatchObject({ kind: "use-move", moveSlot: 0, targetBattler: 0 });
    expect(rules.battlers[1].pp[0]).toBe(8);
    expect(rules.battlers[1].statStages[1]).toBe(7);
  });
});
