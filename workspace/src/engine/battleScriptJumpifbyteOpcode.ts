/**
 * S10 step (iv) rung 3: B_SCR_OP_JUMPIFBYTE / Cmd_jumpifbyte
 * (battle_script_commands.c:3657-3692). A pure byte-compare + conditional
 * jump -- decode, all six CMP_* comparators, and the jump/advance branch are
 * implemented completely and match source exactly. The byte-value resolution
 * (both the memByte pointer and the immediate comparison byte) is the
 * injectable part: this engine models a known subset of the 56 concrete
 * jumpifbyte call sites' pointer/value universe (every pointer this rung's
 * WIN path touches, `gBattleOutcome` among them, plus every other pointer
 * this engine already tracks elsewhere); any other concrete call site's
 * unmodeled pointer or named constant (e.g. `sMULTIHIT_STRING`/`sBATTLE_STYLE`,
 * or a B_MSG_ / MOVE_RESULT_ named literal outside the small resolvable set) is a
 * single named (b) barrier citing that instruction's own source line, per the
 * (a)/(b) registration policy -- never a silent miscompute.
 */
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptSetByteValue } from "./battleScriptSetByte.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

const CMP_EQUAL = 0;
const CMP_NOT_EQUAL = 1;
const CMP_GREATER_THAN = 2;
const CMP_LESS_THAN = 3;
const CMP_COMMON_BITS = 4;
const CMP_NO_COMMON_BITS = 5;

/** include/constants/battle_script_commands.h:326-331. */
const JUMPIFBYTE_COMPARATORS: ReadonlyMap<string, number> = new Map([
  ["CMP_EQUAL", CMP_EQUAL],
  ["CMP_NOT_EQUAL", CMP_NOT_EQUAL],
  ["CMP_GREATER_THAN", CMP_GREATER_THAN],
  ["CMP_LESS_THAN", CMP_LESS_THAN],
  ["CMP_COMMON_BITS", CMP_COMMON_BITS],
  ["CMP_NO_COMMON_BITS", CMP_NO_COMMON_BITS],
]);

/**
 * The memByte pointer universe this engine can resolve today: every already
 * source-modeled scratch/global byte field any jumpifbyte call site in the
 * committed program actually reads (grepped across all 56 concrete
 * occurrences). `sBATTLE_STYLE` (the Set/Battle-Style option,
 * `include/constants/battle_script_commands.h:275`, read only by the
 * non-terminal switch-in Yes/No dialog) has no reader anywhere in this
 * engine and falls through to the unsupported-operand barrier.
 * `sMULTIHIT_STRING + 4` (Triple Kick's own hits-landed counter,
 * `include/constants/battle_script_commands.h:260`) is widened here per
 * docs/roar-multihit-registration-scout.md §4 rung 8 --
 * `BattleScript_TripleKickNoMoreHits`/`_PrintStrings`' own
 * `jumpifbyte CMP_EQUAL, sMULTIHIT_STRING + 4, 0, ...` reads, backed by the
 * `multiHitStringCounter` field `Cmd_addbyte` already writes on every
 * multi-hit iteration (`battleScriptDamagingWeatherOpcode.ts`, PROGRESS 525)
 * and `Cmd_initmultihitstring` now zeroes at script entry
 * (`battleScriptRuleCommands.ts`).
 */
function readJumpifbyteMemByte(
  rules: BattleScriptRulesContext,
  expression: string,
): number | null {
  switch (expression) {
    case "cMULTISTRING_CHOOSER": return rules.multistringChooser;
    case "gMoveResultFlags": return rules.moveResultFlags;
    case "gBattleCommunication": return rules.battleCommunication0;
    case "gBattleCommunication + 1": return rules.battleCommunication1;
    case "gBattleOutcome": return rules.battleOutcome;
    case "cMISS_TYPE": return rules.missType;
    case "gCritMultiplier": return rules.critMultiplier;
    case "sB_ANIM_TURN": return rules.animTurn;
    case "sMULTIHIT_STRING + 4": return rules.multiHitStringCounter;
    default: return null;
  }
}

function evaluateJumpifbyteComparison(caseId: number, memByte: number, value: number): boolean {
  switch (caseId) {
    case CMP_EQUAL: return memByte === value;
    case CMP_NOT_EQUAL: return memByte !== value;
    case CMP_GREATER_THAN: return memByte > value;
    case CMP_LESS_THAN: return memByte < value;
    case CMP_COMMON_BITS: return (memByte & value) !== 0;
    case CMP_NO_COMMON_BITS: return (memByte & value) === 0;
    default:
      throw new Error(`Cmd_jumpifbyte: caseID ${caseId} is outside the committed program's 0..5 domain`);
  }
}

function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  sourceConstruct: string,
  sourceLine: number,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: Object.freeze({
        kind: "unsupported-branch",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        sourceConstruct,
        sourceFile: "data/battle_scripts_1.s",
        sourceLine,
      }),
    }),
  );
}

function createJumpifbyteOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [ifflagOperand, memByteOperand, byteOperand, ptrOperand] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 4
      || ifflagOperand?.widthBytes !== 1
      || memByteOperand?.widthBytes !== 4
      || byteOperand?.widthBytes !== 1
      || ptrOperand?.widthBytes !== 4
    ) {
      throw new Error(
        `invalid B_SCR_OP_JUMPIFBYTE shape at program counter ${context.state.programCounter}`,
      );
    }
    const caseId = JUMPIFBYTE_COMPARATORS.get(ifflagOperand.expression);
    if (caseId === undefined) {
      throw new Error(`Cmd_jumpifbyte: unknown comparator ${ifflagOperand.expression}`);
    }

    const rules = context.state.rulesContext;
    const memByte = readJumpifbyteMemByte(rules, memByteOperand.expression);
    const value = resolveBattleScriptSetByteValue(byteOperand.expression);
    if (memByte === null || value === null) {
      return unsupportedBranch(
        context,
        `Cmd_jumpifbyte's operand (${memByte === null ? memByteOperand.expression : byteOperand.expression}) `
          + "is not modeled",
        context.instruction.source.statementLine,
      );
    }

    if (!evaluateJumpifbyteComparison(caseId, memByte, value)) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand.expression);
    if (!target) {
      throw new Error(`Cmd_jumpifbyte: unresolved jump target ${ptrOperand.expression}`);
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

export function createBattleScriptJumpifbyteOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_JUMPIFBYTE",
  );
  if (!instruction) throw new Error("committed Battle Script program does not emit B_SCR_OP_JUMPIFBYTE");
  return Object.freeze({ [instruction.opcodeId]: createJumpifbyteOpcodeHandler() });
}
