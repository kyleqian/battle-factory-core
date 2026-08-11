/**
 * Charge and the two field-sport setters.
 *
 * This module starts with Charge's source-complete setter; Mud/Water Sport's
 * shared opcode is registered beside it because all three effects share the
 * same status3/damage-lifetime ownership.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import {
  resolveBattleScriptCurrentMoveEffect,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:166. */
export const BATTLE_SCRIPT_STATUS3_CHARGED_UP = 1 << 9;
export const BATTLE_SCRIPT_STATUS3_MUDSPORT = 1 << 16;
export const BATTLE_SCRIPT_STATUS3_WATERSPORT = 1 << 17;
const EFFECT_MUD_SPORT = 201;
const EFFECT_WATER_SPORT = 210;

function jumpToFailure(
  context: Parameters<BattleScriptOpcodeHandler<BattleScriptRulesContext>>[0],
) {
  const target = context.instruction.operands[0]
    ? resolveBattleScriptLabel(context.program, context.instruction.operands[0]!.expression)
    : undefined;
  if (!target) throw new Error("unresolved Mud/Water Sport failure target");
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "jump", programCounter: target.programCounter }),
  );
}

export function createBattleScriptChargeSportOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const charge = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETCHARGE",
  );
  if (
    charge.length !== 1
    || charge[0]!.opcodeId !== 0xcb
    || charge[0]!.dispatcher !== "Cmd_setcharge"
    || charge[0]!.operands.length !== 0
  ) {
    throw new Error(`invalid B_SCR_OP_SETCHARGE committed shape (${charge.length})`);
  }
  const sports = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETTYPEBASEDHALVERS",
  );
  if (
    sports.length !== 1
    || sports[0]!.opcodeId !== 0xe8
    || sports[0]!.dispatcher !== "Cmd_settypebasedhalvers"
    || sports[0]!.operands.length !== 1
    || sports[0]!.operands[0]!.widthBytes !== 4
    || sports[0]!.operands[0]!.expression !== "BattleScript_ButItFailed"
  ) {
    throw new Error(`invalid B_SCR_OP_SETTYPEBASEDHALVERS committed shape (${sports.length})`);
  }

  return Object.freeze({
    [charge[0]!.opcodeId]: (context) => {
      const rules = context.state.rulesContext;
      const attacker = requireBattlerRole(rules, "attacker");
      const battler = rules.battlers[attacker];
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: withBattler(rules, attacker, {
            status3: (battler.status3 | BATTLE_SCRIPT_STATUS3_CHARGED_UP) >>> 0,
            chargeTimer: 2,
            chargeTimerStartValue: 2,
          }),
        },
      );
    },
    [sports[0]!.opcodeId]: (context) => {
      const rules = context.state.rulesContext;
      const attacker = requireBattlerRole(rules, "attacker");
      const battler = rules.battlers[attacker];
      const effect = resolveBattleScriptCurrentMoveEffect(rules.currentMove);
      const isMudSport = effect === EFFECT_MUD_SPORT;
      if (!isMudSport && effect !== EFFECT_WATER_SPORT) {
        throw new Error(`Cmd_settypebasedhalvers received effect ${effect}`);
      }
      const bit = isMudSport
        ? BATTLE_SCRIPT_STATUS3_MUDSPORT
        : BATTLE_SCRIPT_STATUS3_WATERSPORT;
      if ((battler.status3 & bit) !== 0) return jumpToFailure(context);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({
            ...withBattler(rules, attacker, {
              status3: (battler.status3 | bit) >>> 0,
            }),
            multistringChooser: isMudSport ? 0 : 1,
          }),
        },
      );
    },
  });
}
