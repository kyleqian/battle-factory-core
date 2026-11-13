import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/follow-me-redirect.md (fix 42). HandleAction_UseMove's "choose target" block (battle_util.c:148-156) sends every
// MOVE_TARGET_SELECTED move to the foe's Follow Me user. In singles the banked target of such a move is the foe already, except one: the
// player's Curse while the user is not a Ghost type is banked with the user itself as target (battle_controller_player.c:486-501). With the
// foe's Follow Me up, the game aims that Curse at the Follow Me user, and Cmd_ppreduce's Pressure test (battle_script_commands.c:1223-1225,
// `gBattlerAttacker != gBattlerTarget`) takes one more PP when that Pokemon has Pressure. ROM (Mechanic Lab, lab seed 801): Snorlax's Curse
// PP 10 -> 8 against Dusclops (Pressure) using Follow Me; 10 -> 9 when Dusclops uses Splash.

const CURSE = 174;
const SPLASH = 150;
const FOLLOW_ME = 266;
const SPECIES_SNORLAX = 143;
const SPECIES_DUSCLOPS = 362;
const ABILITY_IMMUNITY = 17;
const ABILITY_PRESSURE = 46;

function config(foeMove: number): FactoryFullTurnConfig {
  return Object.freeze({
    requestId: 1,
    rngSeed: 7,
    player: {
      species: SPECIES_SNORLAX, moveId: CURSE, moves: [CURSE, SPLASH, SPLASH, SPLASH] as [number, number, number, number], pp: [10, 40, 40, 40] as [number, number, number, number],
      ability: ABILITY_IMMUNITY, attack: 100, defense: 100, spAttack: 60, spDefense: 100, speed: 30, hp: 235,
    },
    trainer: {
      species: SPECIES_DUSCLOPS, moveId: foeMove, moves: [foeMove, foeMove, foeMove, foeMove] as [number, number, number, number], pp: [20, 20, 20, 20] as [number, number, number, number],
      ability: ABILITY_PRESSURE, attack: 60, defense: 130, spAttack: 60, spDefense: 130, speed: 25, hp: 115,
    },
  }) as FactoryFullTurnConfig;
}

/** The player uses Curse (slot 0) and the foe uses its only move, one turn. Returns the player's Curse PP after the turn. */
function cursePpAfterOneTurn(foeMove: number): number {
  const initial = createFactoryFullTurnBattleState(config(foeMove));
  const first = initial.boundary;
  if (first?.kind !== "decision-required" || first.request.kind !== "command") throw new Error("expected the player's command");
  const curse = first.request.legalDecisions.find((d) => d.kind === "use-move" && d.moveSlot === 0);
  if (!curse || curse.kind !== "use-move") throw new Error("Curse is not offered");
  expect(curse.targetBattler).toBe(0); // the non-Ghost Curse is banked with the user as target
  const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: curse });
  if (afterPlayer.kind !== "decision-required" || afterPlayer.nextRequest.kind !== "command") throw new Error("expected the trainer's command");
  const done = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2, side: "trainer", decision: afterPlayer.nextRequest.legalDecisions.find((d) => d.kind === "use-move")!,
  });
  if (done.kind === "machine-barrier") throw new Error(`unexpected machine-barrier: ${JSON.stringify(done.barrier)}`);
  return done.state.rules.rulesContext.battlers[0]!.pp[0]!;
}

describe("the foe's Follow Me redirects the player's self-aimed Curse", () => {
  it("against a Pressure Follow Me user the Curse costs two PP (ROM: 10 -> 8)", () => {
    expect(cursePpAfterOneTurn(FOLLOW_ME)).toBe(8);
  });

  it("control: without Follow Me the Curse stays aimed at its user and costs one PP (ROM: 10 -> 9)", () => {
    expect(cursePpAfterOneTurn(SPLASH)).toBe(9);
  });
});
