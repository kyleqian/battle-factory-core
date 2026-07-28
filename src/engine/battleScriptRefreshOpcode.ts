/**
 * `B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED` /
 * `Cmd_cureifburnedparalyzedorpoisoned`
 * (`battle_script_commands.c:9119-9133`).
 *
 * Refresh owns only the attacker's primary-status clear and the matching
 * REQUEST_STATUS_BATTLE controller transfer. PP is spent by the preceding
 * shared Cmd_ppreduce step; the command itself draws no RNG.
 */
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  withBattleScriptPartyMemberStatus1,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import { BATTLE_SCRIPT_STATUS1_REFRESH_CURE_MASK } from "./battleScriptSourceConstants.ts";

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xcd
    || instruction.dispatcher !== "Cmd_cureifburnedparalyzedorpoisoned"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      "invalid B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED shape "
        + `at program counter ${instruction.programCounter}`,
    );
  }
  return failure.expression;
}

function createRefreshHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const attackerState = rules.battlers[attacker];
    if (
      (attackerState.status1 & BATTLE_SCRIPT_STATUS1_REFRESH_CURE_MASK) === 0
    ) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) {
        throw new Error(
          `Cmd_cureifburnedparalyzedorpoisoned: unresolved failure target ${failureExpression}`,
        );
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "jump",
          programCounter: failure.programCounter,
        }),
      );
    }

    const withClearedAttacker = withBattler(rules, attacker, { status1: 0 });
    const rulesContext = Object.freeze({
      ...withClearedAttacker,
      party: withBattleScriptPartyMemberStatus1(
        withClearedAttacker.party,
        attackerState.side,
        attackerState.partyIndex,
        0,
      ),
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        scheduler: markBattleScriptControllerPending(
          context.state.scheduler,
          attacker,
        ),
        rulesContext,
        events: Object.freeze([
          Object.freeze({
            kind: "set-battler-status-data" as const,
            battler: attacker,
            status1: 0,
          }),
        ]),
      },
    );
  };
}

export function createBattleScriptRefreshOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) =>
      instruction.opcodeName
      === "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED requires exactly 1 "
        + `concrete start, got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({
    [instructions[0]!.opcodeId]: createRefreshHandler(program),
  });
}
