/**
 * `B_SCR_OP_TRYSPITEPPREDUCE` / `Cmd_tryspiteppreduce`
 * (`battle_script_commands.c:8318-8364`).
 */
import {
  drawBattleScriptRng,
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
  type BattleScriptSchedulerState,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import { cancelBattleScriptMultiTurnMoves } from "./battleScriptMultiTurnCancellation.ts";
import {
  withBattleScriptPartyMemberPp,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_TRANSFORMED } from "./battleScriptSourceConstants.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

const MOVE_NONE = 0;
const MOVE_UNAVAILABLE = 0xffff;

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xad
    || instruction.dispatcher !== "Cmd_tryspiteppreduce"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      `invalid B_SCR_OP_TRYSPITEPPREDUCE shape at program counter ${instruction.programCounter}`,
    );
  }
  return failure.expression;
}

function handler(program: BattleScriptProgram): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const target = requireBattlerRole(rules, "target");
    const targetState = rules.battlers[target];
    const lastMove = rules.moveHistory.lastMoves[target]!;
    const movePosition = targetState.moves.findIndex((move) => move === lastMove);
    if (
      lastMove === MOVE_NONE
      || lastMove === MOVE_UNAVAILABLE
      || movePosition === -1
      || targetState.pp[movePosition]! <= 1
    ) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) throw new Error(`Cmd_tryspiteppreduce unresolved failure target ${failureExpression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      );
    }

    const drawn = drawBattleScriptRng(
      context.state.rng,
      context.instruction,
      "Spite PP reduction ((Random() & 3) + 2)",
    );
    const rolled = (drawn.randomValue & 3) + 2;
    const ppToDeduct = Math.min(targetState.pp[movePosition]!, rolled);
    const nextPpValue = targetState.pp[movePosition]! - ppToDeduct;
    const pp = targetState.pp.map((value, index) =>
      index === movePosition ? nextPpValue : value
    ) as unknown as BattleScriptRulesBattlerState["pp"];
    let nextRules = withBattler(rules, target, { pp });
    nextRules = Object.freeze({
      ...nextRules,
      battleTextBuff1Move: lastMove,
      battleTextBuff2ByteNumber: ppToDeduct,
    });

    const permanent = (targetState.mimickedMoves & (1 << movePosition)) === 0
      && (targetState.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) === 0;
    let scheduler: BattleScriptSchedulerState = Object.freeze({
      ...context.state.scheduler,
      activeBattler: target,
    });
    const events = permanent
      ? Object.freeze([
        Object.freeze({
          kind: "set-battler-pp-data" as const,
          battler: target,
          movePosition,
          pp: nextPpValue,
        }),
      ])
      : Object.freeze([]);
    if (permanent) {
      nextRules = Object.freeze({
        ...nextRules,
        party: withBattleScriptPartyMemberPp(
          nextRules.party,
          targetState.side,
          targetState.partyIndex,
          movePosition,
          nextPpValue,
        ),
      });
      scheduler = markBattleScriptControllerPending(scheduler, target);
    }
    if (nextPpValue === 0) {
      nextRules = cancelBattleScriptMultiTurnMoves(nextRules, target).rulesContext;
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRules, scheduler, rng: drawn.rng, events },
    );
  };
}

export function createBattleScriptTryspiteppreduceOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSPITEPPREDUCE",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_TRYSPITEPPREDUCE requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({ [instructions[0]!.opcodeId]: handler(program) });
}
