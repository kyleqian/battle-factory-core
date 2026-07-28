/**
 * Environment-selected attacks from battle_script_commands.c:
 *
 * - Cmd_setweatherballtype doubles gBattleScripting.dmgMultiplier for any
 *   defined weather and writes the source F_DYNAMIC_TYPE_SET representation
 *   of Water/Rock/Fire/Ice (or Normal when no recognized weather bit wins).
 *   WEATHER_HAS_EFFECT suppresses both writes while any live battler carries
 *   Cloud Nine or Air Lock.
 *
 * This module initially owns Weather Ball's setter. Nature Power's distinct
 * script-stack call is kept separate until its return ordering is executable
 * and tested end-to-end.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { abilityPresentOnField } from "./battleScriptJumpifabilitypresentOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/abilities.h. */
const ABILITY_CLOUD_NINE = 13;
const ABILITY_AIR_LOCK = 77;
/** include/constants/battle.h:232-244. */
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_HAIL = 1 << 7;
const B_WEATHER_ANY =
  B_WEATHER_RAIN | B_WEATHER_SANDSTORM | B_WEATHER_SUN | B_WEATHER_HAIL;
/** include/constants/types.h and include/battle.h's F_DYNAMIC_TYPE_SET. */
const TYPE_NORMAL = 0;
const TYPE_ROCK = 5;
const TYPE_FIRE = 10;
const TYPE_WATER = 11;
const TYPE_ICE = 15;
const F_DYNAMIC_TYPE_SET = 1 << 7;

function weatherHasEffect(rules: BattleScriptRulesContext): boolean {
  return !abilityPresentOnField(rules, ABILITY_CLOUD_NINE)
    && !abilityPresentOnField(rules, ABILITY_AIR_LOCK);
}

function createSetweatherballtypeHandler():
BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    if (!weatherHasEffect(rules)) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }

    let type = TYPE_NORMAL;
    if ((rules.weather & B_WEATHER_RAIN) !== 0) type = TYPE_WATER;
    else if ((rules.weather & B_WEATHER_SANDSTORM) !== 0) type = TYPE_ROCK;
    else if ((rules.weather & B_WEATHER_SUN) !== 0) type = TYPE_FIRE;
    else if ((rules.weather & B_WEATHER_HAIL) !== 0) type = TYPE_ICE;

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rules,
          dmgMultiplier: (rules.weather & B_WEATHER_ANY) !== 0 ? 2 : rules.dmgMultiplier,
          dynamicMoveType: type | F_DYNAMIC_TYPE_SET,
        }),
      },
    );
  };
}

export function createBattleScriptEnvironmentAttackOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETWEATHERBALLTYPE",
  );
  if (
    instructions.length !== 1
    || instructions[0]!.opcodeId !== 0xe9
    || instructions[0]!.dispatcher !== "Cmd_setweatherballtype"
    || instructions[0]!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_SETWEATHERBALLTYPE committed shape (${instructions.length})`,
    );
  }
  return Object.freeze({
    [instructions[0]!.opcodeId]: createSetweatherballtypeHandler(),
  });
}
