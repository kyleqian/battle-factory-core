/**
 * Executable-frontier census (2026-07-25): `B_SCR_OP_ORWORD` / `Cmd_orword`
 * (`battle_script_commands.c:3880-3887`). A trivial bitwise-or write --
 * `*memWord |= val` -- the sibling of the already-registered setbyte family
 * (`battleScriptSetByte.ts`) but for a 4-byte target with no read/jump
 * behavior of its own.
 *
 * `BattleScript_EffectHit`'s Surf-underwater sub-branch --
 * `orword gHitMarker, HITMARKER_IGNORE_UNDERWATER` (`data/battle_scripts_1.s:239`)
 * -- is the third of the census's three-opcode chokepoint set, reached only
 * when Surf's target is genuinely underwater (STATUS3_UNDERWATER set).
 *
 * Every concrete orword call site in the committed program (43 occurrences)
 * targets the same pointer, `gHitMarker`, OR-ing in one or more of only 11
 * named HITMARKER_* bits -- so this registration validates every concrete
 * instance at registration time (the same pattern `battleScriptSetByte.ts`
 * uses for `Cmd_setbyte`) and needs no runtime `unsupported-branch` barrier
 * at all -- (a), source-complete. This also covers
 * `docs/end-turn-ground-truth.md`'s own reachable orword pointers, which are
 * the same `gHitMarker` call sites.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP,
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
  BATTLE_SCRIPT_HITMARKER_CHARGING,
  BATTLE_SCRIPT_HITMARKER_GRUDGE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR,
  BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE,
} from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:182-204 -- every HITMARKER_* bit a concrete orword call site in the committed program names. */
const ORWORD_HITMARKER_BITS: ReadonlyMap<string, number> = new Map([
  ["HITMARKER_IGNORE_BIDE", BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE],
  ["HITMARKER_IGNORE_SUBSTITUTE", BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE],
  ["HITMARKER_ATTACKSTRING_PRINTED", BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED],
  ["HITMARKER_NO_PPDEDUCT", BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT],
  ["HITMARKER_IGNORE_ON_AIR", BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR],
  ["HITMARKER_IGNORE_UNDERGROUND", BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND],
  ["HITMARKER_IGNORE_UNDERWATER", BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER],
  ["HITMARKER_PASSIVE_HP_UPDATE", BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE],
  ["HITMARKER_GRUDGE", BATTLE_SCRIPT_HITMARKER_GRUDGE],
  ["HITMARKER_ALLOW_NO_PP", BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP],
  ["HITMARKER_CHARGING", BATTLE_SCRIPT_HITMARKER_CHARGING],
]);

/**
 * Every concrete orword call site's value operand is either a single named
 * HITMARKER_* constant or several joined by the source `|` operator -- the
 * topology captures the raw assembly text as one token, so this engine
 * splits and resolves each term itself rather than expecting the disassembler
 * to have pre-evaluated it.
 */
function resolveOrwordValue(expression: string): number | null {
  let result = 0;
  for (const term of expression.split("|")) {
    const bit = ORWORD_HITMARKER_BITS.get(term.trim());
    if (bit === undefined) return null;
    result |= bit;
  }
  return result >>> 0;
}

function createOrwordOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [, valueOperand] = context.instruction.operands;
    const rules = context.state.rulesContext;
    const value = resolveOrwordValue(valueOperand!.expression);
    if (value === null) {
      throw new Error(`validated B_SCR_OP_ORWORD became undecodable at ${context.state.programCounter}`);
    }

    const hitMarker = (rules.hitMarker | value) >>> 0;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, hitMarker }) },
    );
  };
}

/**
 * Source-complete Cmd_orword for the committed program. Registry creation
 * validates every concrete opcode start (all 43) before the opcode becomes
 * executable, matching Cmd_setbyte's own eager-validation pattern for a
 * fully-covered opcode.
 */
export function createBattleScriptOrwordOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_ORWORD",
  );
  if (starts.length !== 43) {
    throw new Error(`B_SCR_OP_ORWORD requires all 43 concrete starts, got ${starts.length}`);
  }
  for (const instruction of starts) {
    const [pointer, value] = instruction.operands;
    if (
      instruction.operands.length !== 2
      || pointer?.widthBytes !== 4
      || value?.widthBytes !== 4
    ) {
      throw new Error(`invalid B_SCR_OP_ORWORD shape at program counter ${instruction.programCounter}`);
    }
    if (pointer.expression !== "gHitMarker") {
      throw new Error(`unknown B_SCR_OP_ORWORD pointer ${pointer.expression}`);
    }
    if (resolveOrwordValue(value.expression) === null) {
      throw new Error(`unknown B_SCR_OP_ORWORD value ${value.expression}`);
    }
  }
  return Object.freeze({ [starts[0]!.opcodeId]: createOrwordOpcodeHandler() });
}
