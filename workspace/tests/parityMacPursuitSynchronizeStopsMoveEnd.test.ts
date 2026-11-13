import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/pursuit-synchronize-moveend.md (fix 43). BattleScript_PursuitDmgOnSwitchOut runs the move-end steps with
// `moveendfromto MOVEEND_ON_DAMAGE_ABILITIES, MOVEEND_CHOICE_MOVE` (data/battle_scripts_1.s:3143): steps 3 to 5, then stop. Cmd_moveend's
// end check runs after every step, also after one that called a script (battle_script_commands.c:4489-4492), so when the Pursuit user's
// Synchronize fires (step 5, MOVEEND_SYNCHRONIZE_ATTACKER) the steps end there. ROM (Mechanic Lab, lab seed 801): the opponent's Umbreon
// (Synchronize, four Pursuit) hits the switching Electabuzz (Static), Static paralyses Umbreon, Synchronize paralyses Electabuzz back,
// the switch goes on, and both last-move records stay at 0.

const PURSUIT = 228;
const SPLASH = 150;
const ABILITY_STATIC = 9;
const ABILITY_SYNCHRONIZE = 28;
const STATUS1_PARALYSIS = 0x40;

function config(rngSeed: number): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    player: {
      species: 125, moveId: SPLASH, moves: [SPLASH, SPLASH, SPLASH, SPLASH], pp: [40, 40, 40, 40], ability: ABILITY_STATIC, abilityNum: 0,
      attack: 80, defense: 60, spAttack: 90, spDefense: 80, speed: 105, hp: 140, maxHp: 140,
    },
    trainer: {
      species: 197, moveId: PURSUIT, moves: [PURSUIT, PURSUIT, PURSUIT, PURSUIT], pp: [20, 20, 20, 20], ability: ABILITY_SYNCHRONIZE, abilityNum: 0,
      attack: 70, defense: 110, spAttack: 60, spDefense: 130, speed: 65, hp: 170, maxHp: 170,
    },
    playerBenchHp: [325, 120],
    playerBenchOverride: [
      { species: 113, abilityNum: 0, moves: [SPLASH, 0, 0, 0], maxHP: 325, attack: 10, defense: 10, speed: 50, spAttack: 35, spDefense: 105 },
      { species: 242, abilityNum: 0, moves: [SPLASH, 0, 0, 0], maxHP: 120, attack: 10, defense: 10, speed: 55, spAttack: 75, spDefense: 135 },
    ],
  } as unknown as FactoryFullTurnConfig;
}

/** The player switches Electabuzz out to Chansey; the opponent's Umbreon uses Pursuit. */
function switchTurn(rngSeed: number) {
  const initial = createFactoryFullTurnBattleState(config(rngSeed));
  const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: { kind: "switch", partyIndex: 1 } });
  if (afterPlayer.kind !== "decision-required") throw new Error(`expected the trainer's command, got ${afterPlayer.kind}`);
  const done = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  if (done.kind !== "decision-required") throw new Error(`expected the next command, got ${done.kind}`);
  return done.state.rules.rulesContext;
}

describe("Pursuit on a switching Pokemon: the Pursuit user's Synchronize ends the move-end steps", () => {
  it("Static paralyses the Pursuit user, Synchronize paralyses the switching Pokemon back, and the switch goes on (seed 5)", () => {
    const rules = switchTurn(5);
    expect(rules.battlers[1]!.status1 & STATUS1_PARALYSIS).toBe(STATUS1_PARALYSIS); // Umbreon, by Static
    expect(rules.party.player[0]!.status1 & STATUS1_PARALYSIS).toBe(STATUS1_PARALYSIS); // Electabuzz, by Synchronize, in the party
    expect(rules.battlers[0]).toMatchObject({ species: 113, partyIndex: 1 }); // the player's Chansey came in
    expect(rules.battlers[1]!.species).toBe(197); // the opponent's Umbreon is still on the field
    expect(rules.moveHistory.lastMoves.slice(0, 2)).toEqual([0, 0]); // MOVEEND_UPDATE_LAST_MOVES did not run (ROM: both stay 0)
  });

  it("control: without Static's paralysis the same turn ends the steps at MOVEEND_CHOICE_MOVE as always (seed 1)", () => {
    const rules = switchTurn(1);
    expect(rules.battlers[1]!.status1).toBe(0);
    expect(rules.battlers[0]).toMatchObject({ species: 113, partyIndex: 1 });
    expect(rules.moveHistory.lastMoves.slice(0, 2)).toEqual([0, 0]);
  });
});
