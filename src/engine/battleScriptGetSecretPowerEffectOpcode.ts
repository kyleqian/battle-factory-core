/**
 * `B_SCR_OP_GETSECRETPOWEREFFECT` / `Cmd_getsecretpowereffect`
 * (`battle_script_commands.c:9619-9652`).
 *
 * Secret Power's operandless setup command maps the source u8
 * `gBattleEnvironment` to `gBattleCommunication[MOVE_EFFECT_BYTE]` and
 * advances. The shared EffectHit tail owns accuracy, PP, damage, the
 * secondary-effect chance roll, SetMoveEffect, messages, and fainting.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

const MOVE_EFFECT_SLEEP = 1;
const MOVE_EFFECT_POISON = 2;
const MOVE_EFFECT_PARALYSIS = 5;
const MOVE_EFFECT_CONFUSION = 7;
const MOVE_EFFECT_FLINCH = 8;
const MOVE_EFFECT_ATK_MINUS_1 = 22;
const MOVE_EFFECT_DEF_MINUS_1 = 23;
const MOVE_EFFECT_SPD_MINUS_1 = 24;
const MOVE_EFFECT_ACC_MINUS_1 = 27;

export function secretPowerMoveEffectForEnvironment(
  gBattleEnvironment: number,
): number {
  switch (gBattleEnvironment) {
    case 0:
      return MOVE_EFFECT_POISON;
    case 1:
      return MOVE_EFFECT_SLEEP;
    case 2:
      return MOVE_EFFECT_ACC_MINUS_1;
    case 3:
      return MOVE_EFFECT_DEF_MINUS_1;
    case 4:
      return MOVE_EFFECT_ATK_MINUS_1;
    case 5:
      return MOVE_EFFECT_SPD_MINUS_1;
    case 6:
      return MOVE_EFFECT_CONFUSION;
    case 7:
      return MOVE_EFFECT_FLINCH;
    default:
      return MOVE_EFFECT_PARALYSIS;
  }
}

const getSecretPowerEffectHandler: BattleScriptOpcodeHandler<
  BattleScriptRulesContext
> = (context) => {
  const rules = context.state.rulesContext;
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...rules,
        moveEffectByte: secretPowerMoveEffectForEnvironment(
          rules.gBattleEnvironment,
        ),
      }),
    },
  );
};

export function createBattleScriptGetSecretPowerEffectOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_GETSECRETPOWEREFFECT",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_GETSECRETPOWEREFFECT requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xe4
    || instruction!.dispatcher !== "Cmd_getsecretpowereffect"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      "invalid B_SCR_OP_GETSECRETPOWEREFFECT shape at program counter "
        + instruction!.programCounter,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: getSecretPowerEffectHandler,
  });
}
