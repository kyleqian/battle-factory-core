/**
 * Executable-frontier census (2026-07-25), the single highest-leverage
 * registration: `B_SCR_OP_JUMPIFHALFWORD` / `Cmd_jumpifhalfword`
 * (`battle_script_commands.c:3695-3731`). A pure 2-byte halfword compare +
 * conditional jump -- structurally the sibling of `Cmd_jumpifword`
 * (`battleScriptJumpifwordOpcode.ts`) and `Cmd_jumpifbyte`, except the
 * immediate comparison value is 2 bytes wide while the memory pointer
 * operand stays 4 bytes.
 *
 * `BattleScript_EffectHit`'s own first instruction --
 * `jumpifnotmove MOVE_SURF, BattleScript_HitFromAtkCanceler`
 * (`data/battle_scripts_1.s:237`) -- expands to this opcode comparing
 * `gCurrentMove` against a literal move id. Every hit-chain effect in the
 * committed program funnels through this instruction first, Surf or not, so
 * `gCurrentMove` is the load-bearing memHword pointer this engine models.
 * `gChosenMove` (the multi-hit family's own Sleep-Talk gate,
 * `BattleScript_MultiHitLoop`/`BattleScript_TripleKickLoop`) is also modeled,
 * per docs/roar-multihit-registration-scout.md §4 rung 4. Every other
 * concrete jumpifhalfword call site in the committed program compares a
 * different, unmodeled pointer (`gBattleWeather`, `gTrainerBattleOpponent_A`)
 * and is a named (b) barrier -- those effects (EFFECT_SOLAR_BEAM,
 * EFFECT_SEMI_INVULNERABLE...) remain blocked on their own separate missing
 * opcodes regardless.
 */
import movesData from "../data/gen/moves.json" with { type: "json" };
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
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

const CMP_EQUAL = 0;
const CMP_NOT_EQUAL = 1;
const CMP_GREATER_THAN = 2;
const CMP_LESS_THAN = 3;
const CMP_COMMON_BITS = 4;
const CMP_NO_COMMON_BITS = 5;

/** include/constants/battle_script_commands.h:326-331 -- same 6 comparators as jumpifbyte/jumpifword. */
const JUMPIFHALFWORD_COMPARATORS: ReadonlyMap<string, number> = new Map([
  ["CMP_EQUAL", CMP_EQUAL],
  ["CMP_NOT_EQUAL", CMP_NOT_EQUAL],
  ["CMP_GREATER_THAN", CMP_GREATER_THAN],
  ["CMP_LESS_THAN", CMP_LESS_THAN],
  ["CMP_COMMON_BITS", CMP_COMMON_BITS],
  ["CMP_NO_COMMON_BITS", CMP_NO_COMMON_BITS],
]);

type GeneratedMoveIdRow = Readonly<{ move: string; id: number }>;
/**
 * Every concrete jumpifhalfword call site whose memHword pointer this engine
 * models (gCurrentMove) compares it against a MOVE_* literal, so the
 * source-derived move catalog (already the id<->name join every other move
 * lookup in this engine uses) is the complete value universe -- not a
 * hand-picked subset.
 */
const MOVE_ID_BY_NAME: ReadonlyMap<string, number> = new Map(
  (movesData.moves as readonly GeneratedMoveIdRow[]).map((row) => [row.move, row.id]),
);

/**
 * The memHword pointer universe this engine can resolve today:
 * `BattleScript_EffectHit`'s own Surf guard, the only reachable jumpifhalfword
 * call site under Level-50 Factory singles -- plus `gChosenMove`, widened
 * per docs/roar-multihit-registration-scout.md §4 rung 4: every multi-hit
 * effect's `jumpifhalfword CMP_EQUAL, gChosenMove, MOVE_SLEEP_TALK, ...`
 * Sleep-Talk gate (`BattleScript_MultiHitLoop`/`BattleScript_TripleKickLoop`).
 * `gChosenMove` is the move actually selected before Sleep-Talk substitution
 * (distinct from `gCurrentMove`, the move actually executing), already a
 * durable `BattleScriptRulesContext` field (`chosenMove`,
 * `battleScriptRulesContext.ts:494`).
 */
function readJumpifhalfwordMemHword(
  rules: BattleScriptRulesContext,
  expression: string,
): number | null {
  switch (expression) {
    case "gCurrentMove": return rules.currentMove;
    case "gChosenMove": return rules.chosenMove;
    default: return null;
  }
}

function resolveJumpifhalfwordValue(expression: string): number | null {
  return MOVE_ID_BY_NAME.get(expression) ?? null;
}

function evaluateJumpifhalfwordComparison(caseId: number, memHword: number, value: number): boolean {
  switch (caseId) {
    case CMP_EQUAL: return memHword === value;
    case CMP_NOT_EQUAL: return memHword !== value;
    case CMP_GREATER_THAN: return memHword > value;
    case CMP_LESS_THAN: return memHword < value;
    case CMP_COMMON_BITS: return (memHword & value) !== 0;
    case CMP_NO_COMMON_BITS: return (memHword & value) === 0;
    default:
      throw new Error(`Cmd_jumpifhalfword: caseID ${caseId} is outside the committed program's 0..5 domain`);
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

function createJumpifhalfwordOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [ifflagOperand, memHwordOperand, hwordValueOperand, ptrOperand] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 4
      || ifflagOperand?.widthBytes !== 1
      || memHwordOperand?.widthBytes !== 4
      || hwordValueOperand?.widthBytes !== 2
      || ptrOperand?.widthBytes !== 4
    ) {
      throw new Error(
        `invalid B_SCR_OP_JUMPIFHALFWORD shape at program counter ${context.state.programCounter}`,
      );
    }
    const caseId = JUMPIFHALFWORD_COMPARATORS.get(ifflagOperand.expression);
    if (caseId === undefined) {
      throw new Error(`Cmd_jumpifhalfword: unknown comparator ${ifflagOperand.expression}`);
    }

    const rules = context.state.rulesContext;
    const memHword = readJumpifhalfwordMemHword(rules, memHwordOperand.expression);
    const value = resolveJumpifhalfwordValue(hwordValueOperand.expression);
    if (memHword === null || value === null) {
      return unsupportedBranch(
        context,
        `Cmd_jumpifhalfword's operand (${memHword === null ? memHwordOperand.expression : hwordValueOperand.expression}) `
          + "is not modeled",
        context.instruction.source.statementLine,
      );
    }

    if (!evaluateJumpifhalfwordComparison(caseId, memHword, value)) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand.expression);
    if (!target) {
      throw new Error(`Cmd_jumpifhalfword: unresolved jump target ${ptrOperand.expression}`);
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

export function createBattleScriptJumpifhalfwordOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_JUMPIFHALFWORD",
  );
  if (!instruction) throw new Error("committed Battle Script program does not emit B_SCR_OP_JUMPIFHALFWORD");
  return Object.freeze({ [instruction.opcodeId]: createJumpifhalfwordOpcodeHandler() });
}
