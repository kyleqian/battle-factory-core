/**
 * Environment-selected attacks from battle_script_commands.c:
 *
 * - Cmd_setweatherballtype doubles gBattleScripting.dmgMultiplier for any
 *   defined weather and writes the source F_DYNAMIC_TYPE_SET representation
 *   of Water/Rock/Fire/Ice (or Normal when no recognized weather bit wins).
 *   WEATHER_HAS_EFFECT suppresses both writes while any live battler carries
 *   Cloud Nine or Air Lock.
 *
 * - Cmd_callenvironmentattack replaces gCurrentMove from the exact ten-entry
 *   environment table, retargets, and pushes the selected effect script while
 *   advancing into Nature Power's own "turned into" continuation. That
 *   continuation's return then enters the selected script. This is deliberately
 *   not a direct jump or ordinary call.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";
import { abilityPresentOnField } from "./battleScriptJumpifabilitypresentOpcode.ts";
import { resolveDynamicMoveTarget } from "./battleScriptSleepTalkOpcode.ts";
import {
  resolveBattleScriptCurrentMoveEffect,
  resolveBattleScriptCurrentMovePower,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };

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
const BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED = 1 << 10;

type MoveRow = Readonly<{ id: number; move: string }>;
type EffectRow = Readonly<{ id: number; entryScript: string }>;
const MOVE_ID_BY_NAME = new Map(
  (movesData.moves as readonly MoveRow[]).map(({ id, move }) => [move, id]),
);
const EFFECT_ENTRY_BY_ID = new Map(
  (topologyData.effects as readonly EffectRow[]).map(({ id, entryScript }) => [
    id,
    entryScript,
  ]),
);

function requireMoveId(moveName: string): number {
  const move = MOVE_ID_BY_NAME.get(moveName);
  if (move === undefined) throw new Error(`missing source-derived ${moveName}`);
  return move;
}

/** battle_script_commands.c:sNaturePowerMoves, indexed by gBattleEnvironment. */
export const BATTLE_SCRIPT_NATURE_POWER_MOVES = Object.freeze([
  requireMoveId("MOVE_STUN_SPORE"),
  requireMoveId("MOVE_RAZOR_LEAF"),
  requireMoveId("MOVE_EARTHQUAKE"),
  requireMoveId("MOVE_HYDRO_PUMP"),
  requireMoveId("MOVE_SURF"),
  requireMoveId("MOVE_BUBBLE_BEAM"),
  requireMoveId("MOVE_ROCK_SLIDE"),
  requireMoveId("MOVE_SHADOW_BALL"),
  requireMoveId("MOVE_SWIFT"),
  requireMoveId("MOVE_SWIFT"),
]);

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

function createCallenvironmentattackHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = rules.selectorRoles.attacker;
    if (attacker === null) throw new Error("Cmd_callenvironmentattack requires gBattlerAttacker");
    const move = BATTLE_SCRIPT_NATURE_POWER_MOVES[rules.gBattleEnvironment];
    if (move === undefined) {
      throw new Error(`Cmd_callenvironmentattack invalid gBattleEnvironment ${rules.gBattleEnvironment}`);
    }
    const effect = resolveBattleScriptCurrentMoveEffect(move);
    const entryName = EFFECT_ENTRY_BY_ID.get(effect);
    const selectedEntry = entryName
      ? resolveBattleScriptLabel(program, entryName)
      : undefined;
    if (!selectedEntry) {
      throw new Error(
        `Cmd_callenvironmentattack move ${move} effect ${effect} has no effect-script entry`,
      );
    }
    const target = resolveDynamicMoveTarget(
      rules,
      attacker,
      move,
      context.instruction,
      context.state.rng,
      "nature-power-selected-move-target",
    );
    const nextRules = Object.freeze({
      ...rules,
      battlers: target.battlers,
      currentMove: move,
      currentMoveEffect: effect,
      currentMovePower: resolveBattleScriptCurrentMovePower(move),
      hitMarker: (rules.hitMarker & ~BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED) >>> 0,
      selectorRoles: Object.freeze({
        ...rules.selectorRoles,
        target: target.target,
      }),
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({
        kind: "call-stack",
        programCounter: context.state.programCounter + 1,
        returnProgramCounters: Object.freeze([selectedEntry.programCounter]),
      }),
      { rulesContext: nextRules, rng: target.rng },
    );
  };
}

export function createBattleScriptEnvironmentAttackOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const weatherBall = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETWEATHERBALLTYPE",
  );
  if (
    weatherBall.length !== 1
    || weatherBall[0]!.opcodeId !== 0xe9
    || weatherBall[0]!.dispatcher !== "Cmd_setweatherballtype"
    || weatherBall[0]!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_SETWEATHERBALLTYPE committed shape (${weatherBall.length})`,
    );
  }
  const naturePower = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_CALLENVIRONMENTATTACK",
  );
  if (
    naturePower.length !== 1
    || naturePower[0]!.opcodeId !== 0xcc
    || naturePower[0]!.dispatcher !== "Cmd_callenvironmentattack"
    || naturePower[0]!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_CALLENVIRONMENTATTACK committed shape (${naturePower.length})`,
    );
  }
  return Object.freeze({
    [weatherBall[0]!.opcodeId]: createSetweatherballtypeHandler(),
    [naturePower[0]!.opcodeId]: createCallenvironmentattackHandler(program),
  });
}
