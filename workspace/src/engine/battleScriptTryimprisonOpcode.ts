/**
 * `B_SCR_OP_TRYIMPRISON` / `Cmd_tryimprison`
 * (`battle_script_commands.c:9412-9451`) including the command's dedicated
 * Pressure PP loop (`battle_util.c:767-797`).
 */
import {
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
import {
  withBattleScriptPartyMemberPp,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
  BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
} from "./battleScriptSourceConstants.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

const ABILITY_PRESSURE = 46;
const MOVE_NONE = 0;
const MOVE_IMPRISON = 286;

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xdb
    || instruction.dispatcher !== "Cmd_tryimprison"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      `invalid B_SCR_OP_TRYIMPRISON shape at program counter ${instruction.programCounter}`,
    );
  }
  return failure.expression;
}

function handler(program: BattleScriptProgram): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const failure = resolveBattleScriptLabel(program, failureExpression);
    if (!failure) {
      throw new Error(`Cmd_tryimprison unresolved failure target ${failureExpression}`);
    }
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const attackerState = rules.battlers[attacker];

    if ((attackerState.status3 & BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS) !== 0) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      );
    }

    // PressurePPLoseOnUsingImprison runs before the overlap scan. It searches
    // for Imprison independently for every opposing Pressure battler, loses
    // one PP per holder while nonzero, then emits exactly one persistent
    // controller update after the complete loop.
    const attackerSide = attackerState.side;
    const { battlersCount } = rules.battleTopology;
    let nextPpValue: number | null = null;
    let imprisonPosition = -1;
    for (let battler = 0; battler < battlersCount; battler += 1) {
      const candidate = rules.battlers[battler]!;
      if (candidate.side === attackerSide || candidate.ability !== ABILITY_PRESSURE) continue;
      const position = attackerState.moves.findIndex((move) => move === MOVE_IMPRISON);
      if (position === -1) continue;
      imprisonPosition = position;
      const currentPp: number = nextPpValue ?? attackerState.pp[position]!;
      nextPpValue = currentPp === 0 ? 0 : currentPp - 1;
    }

    let nextRules = rules;
    let scheduler: BattleScriptSchedulerState = context.state.scheduler;
    let events: ReadonlyArray<Readonly<{
      kind: "set-battler-pp-data";
      battler: typeof attacker;
      movePosition: number;
      pp: number;
    }>> = Object.freeze([]);
    if (imprisonPosition !== -1 && nextPpValue !== null) {
      const pp = attackerState.pp.map((value, position) =>
        position === imprisonPosition ? nextPpValue : value
      ) as unknown as BattleScriptRulesBattlerState["pp"];
      nextRules = withBattler(nextRules, attacker, { pp });
      const permanent = (attackerState.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) === 0
        && (attackerState.mimickedMoves & (1 << imprisonPosition)) === 0;
      if (permanent) {
        nextRules = Object.freeze({
          ...nextRules,
          party: withBattleScriptPartyMemberPp(
            nextRules.party,
            attackerState.side,
            attackerState.partyIndex,
            imprisonPosition,
            nextPpValue,
          ),
        });
        scheduler = markBattleScriptControllerPending(
          Object.freeze({ ...scheduler, activeBattler: attacker }),
          attacker,
        );
        events = Object.freeze([
          Object.freeze({
            kind: "set-battler-pp-data" as const,
            battler: attacker,
            movePosition: imprisonPosition,
            pp: nextPpValue,
          }),
        ]);
      }
    }

    let overlap = false;
    const nextAttackerState = nextRules.battlers[attacker];
    for (let battler = 0; battler < battlersCount && !overlap; battler += 1) {
      const candidate = nextRules.battlers[battler]!;
      if (candidate.side === attackerSide) continue;
      for (let attackerMove = 0; attackerMove < 4 && !overlap; attackerMove += 1) {
        const move = nextAttackerState.moves[attackerMove]!;
        for (let defenderMove = 0; defenderMove < 4; defenderMove += 1) {
          if (move !== MOVE_NONE && move === candidate.moves[defenderMove]) {
            overlap = true;
            break;
          }
        }
      }
    }

    if (overlap) {
      nextRules = withBattler(nextRules, attacker, {
        status3: (
          nextAttackerState.status3 | BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS
        ) >>> 0,
      });
    }
    return transitionBattleScriptCommand(
      context,
      overlap
        ? Object.freeze({ kind: "advance" })
        : Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      { rulesContext: nextRules, scheduler, events },
    );
  };
}

export function createBattleScriptTryimprisonOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYIMPRISON",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_TRYIMPRISON requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({ [instructions[0]!.opcodeId]: handler(program) });
}
