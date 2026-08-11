/**
 * `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` /
 * `Cmd_friendshiptodamagecalculation` (`battle_script_commands.c:8603-8611`).
 *
 * Return and Frustration share one source instruction. It writes only
 * `gDynamicBasePower`, using Gen III's integer division:
 *
 *   Return:      (10 * friendship) / 25
 *   Frustration: (10 * (255 - friendship)) / 25
 *
 * The opcode is reachable only from the two consecutive effect labels, so
 * the source's bare `else` means EFFECT_FRUSTRATION. Keep that reachability
 * invariant explicit here: a different generated move effect is an invalid
 * interpreter context, not an invitation to calculate Frustration power.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

export const BATTLE_SCRIPT_EFFECT_RETURN = 121;
export const BATTLE_SCRIPT_EFFECT_FRUSTRATION = 123;
export const BATTLE_SCRIPT_MAX_FRIENDSHIP = 255;

export function friendshipToDynamicBasePower(
  currentMoveEffect: number,
  attackerFriendship: number,
): number {
  if (
    !Number.isSafeInteger(attackerFriendship)
    || attackerFriendship < 0
    || attackerFriendship > BATTLE_SCRIPT_MAX_FRIENDSHIP
  ) {
    throw new Error(
      `attacker friendship must be a source u8, got ${attackerFriendship}`,
    );
  }
  if (currentMoveEffect === BATTLE_SCRIPT_EFFECT_RETURN) {
    return Math.trunc((10 * attackerFriendship) / 25);
  }
  if (currentMoveEffect === BATTLE_SCRIPT_EFFECT_FRUSTRATION) {
    return Math.trunc(
      (10 * (BATTLE_SCRIPT_MAX_FRIENDSHIP - attackerFriendship)) / 25,
    );
  }
  throw new Error(
    "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION is reachable only for "
      + `EFFECT_RETURN/EFFECT_FRUSTRATION, got effect ${currentMoveEffect}`,
  );
}

const friendshipToDamageHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const attacker = requireBattlerRole(context.state.rulesContext, "attacker");
  const dynamicBasePower = friendshipToDynamicBasePower(
    context.state.rulesContext.currentMoveEffect,
    context.state.rulesContext.battlers[attacker].friendship,
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...context.state.rulesContext,
        dynamicBasePower,
      }),
    },
  );
};

export function createBattleScriptFriendshipToDamageOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (candidate) =>
      candidate.opcodeName === "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION requires exactly 1 concrete "
        + `start, got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.dispatcher !== "Cmd_friendshiptodamagecalculation"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      "invalid B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION shape at program "
        + `counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({ [instruction!.opcodeId]: friendshipToDamageHandler });
}
