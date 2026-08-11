/**
 * `B_SCR_OP_FURYCUTTERCALC` / `Cmd_furycuttercalc`
 * (`battle_script_commands.c:8580-8601`).
 *
 * This operandless command owns only the attacking battler's Fury Cutter
 * counter and the dynamic power derived from the current move's source power.
 * Accuracy, type effectiveness, critical hits, and damage own their own RNG
 * and result flags. Unlike Rollout, this command creates no multi-turn lock.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

const FURY_CUTTER_COUNTER_FIXED_POINT = 5;
const U8_MASK = 0xff;
const U16_MASK = 0xffff;

const furyCutterCalcHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");

  if ((rules.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
    const missedPause = resolveBattleScriptLabel(context.program, "BattleScript_MoveMissedPause");
    if (!missedPause) {
      throw new Error("Cmd_furycuttercalc requires BattleScript_MoveMissedPause");
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: missedPause.programCounter }),
      {
        rulesContext: withBattler(rules, attacker, {
          furyCutterCounter: 0,
        }),
      },
    );
  }

  const sourceCounter = rules.battlers[attacker].furyCutterCounter;
  const counter = sourceCounter === FURY_CUTTER_COUNTER_FIXED_POINT
    ? sourceCounter
    : (sourceCounter + 1) & U8_MASK;
  let dynamicBasePower = rules.currentMovePower & U16_MASK;
  for (let i = 1; i < counter; i += 1) {
    dynamicBasePower = (dynamicBasePower * 2) & U16_MASK;
  }
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...withBattler(rules, attacker, { furyCutterCounter: counter }),
        dynamicBasePower,
      }),
    },
  );
};

export function createBattleScriptFuryCutterOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_FURYCUTTERCALC",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_FURYCUTTERCALC requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xb5
    || instruction!.dispatcher !== "Cmd_furycuttercalc"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_FURYCUTTERCALC shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: furyCutterCalcHandler,
  });
}
