/**
 * Executable-frontier census's own top-ranked next registration:
 * `B_SCR_OP_JUMPIFNEXTTARGETVALID` / `Cmd_jumpifnexttargetvalid`
 * (`battle_script_commands.c:6590-6613`) and
 * `B_SCR_OP_SELECTFIRSTVALIDTARGET` / `Cmd_selectfirstvalidtarget`
 * (`battle_script_commands.c:8917-8927`) -- registering exactly this pair
 * flips EFFECT_EARTHQUAKE executable (1 Factory-L50 move, 147 weighted, the
 * census's single largest entry).
 *
 * `Cmd_selectfirstvalidtarget` has no `BATTLE_TYPE_DOUBLE` branch at all: the
 * same loop (skip the attacker, skip any battler with its gAbsentBattlerFlags
 * bit set, take the first match) runs identically for singles and doubles, so
 * it registers source-complete with zero barriers.
 *
 * `Cmd_jumpifnexttargetvalid` DOES branch on `BATTLE_TYPE_DOUBLE`: the `else`
 * arm (not double battle) is `gBattlescriptCurrInstr += 5` unconditionally --
 * singles always falls through, never jumps, regardless of the jump-target
 * operand. The `if` arm's own incrementing scan for the next active battler
 * slot (continuing a multi-target spread-move loop, e.g. Earthquake hitting
 * every other battler in doubles) is unreachable for Level-50 singles and is
 * a named (b) barrier per ROADMAP S10 Executable-frontier reset §1.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

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
        sourceFile: "battle_script_commands.c",
        sourceLine,
      }),
    }),
  );
}

/**
 * Source Cmd_selectfirstvalidtarget's loop (battle_script_commands.c:8919-8925),
 * identical for singles and doubles. Exported: Cmd_tryexplosion's own success
 * branch (battle_script_commands.c:6559-6566, battleScriptExplosionOpcode.ts)
 * inlines this exact same loop to re-point gBattlerTarget after the Damp scan.
 */
export function resolveFirstValidTarget(rules: BattleScriptRulesContext): BattleScriptBattlerId {
  const attacker = rules.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error("Cmd_selectfirstvalidtarget requires a bound gBattlerAttacker");
  }
  for (let battler = 0; battler < rules.battleTopology.battlersCount; battler += 1) {
    if (battler === attacker) continue;
    if ((rules.absentBattlerFlags & (1 << battler)) === 0) {
      return battler as BattleScriptBattlerId;
    }
  }
  throw new Error(
    "Cmd_selectfirstvalidtarget found no valid target -- every non-attacker battler slot is absent, "
      + "a state the source never guards against and this engine's legal-decision invariants exclude",
  );
}

function createSelectFirstValidTargetOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (context.instruction.operands.length !== 0) {
      throw new Error(
        `invalid B_SCR_OP_SELECTFIRSTVALIDTARGET shape at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    const target = resolveFirstValidTarget(rules);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rules,
          selectorRoles: Object.freeze({ ...rules.selectorRoles, target }),
        }),
      },
    );
  };
}

function createJumpIfNextTargetValidOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [ptrOperand] = context.instruction.operands;
    if (context.instruction.operands.length !== 1 || ptrOperand?.widthBytes !== 4) {
      throw new Error(
        `invalid B_SCR_OP_JUMPIFNEXTTARGETVALID shape at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    if ((rules.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE) !== 0) {
      return unsupportedBranch(
        context,
        "Cmd_jumpifnexttargetvalid's BATTLE_TYPE_DOUBLE next-target scan (continuing a multi-target "
          + "spread-move loop to the next active, non-attacker, non-absent battler slot) is not "
          + "modeled -- unreachable for Level-50 singles",
        6594,
      );
    }
    // Source `else { gBattlescriptCurrInstr += 5; }` (battle_script_commands.c:6611) -- singles
    // always falls through, never jumps, regardless of the jump-target operand.
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  };
}

export function createBattleScriptTargetIterationOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const selectFirstValidTarget = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_SELECTFIRSTVALIDTARGET",
  );
  if (!selectFirstValidTarget) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_SELECTFIRSTVALIDTARGET");
  }
  const jumpIfNextTargetValid = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_JUMPIFNEXTTARGETVALID",
  );
  if (!jumpIfNextTargetValid) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_JUMPIFNEXTTARGETVALID");
  }
  return Object.freeze({
    [selectFirstValidTarget.opcodeId]: createSelectFirstValidTargetOpcodeHandler(),
    [jumpIfNextTargetValid.opcodeId]: createJumpIfNextTargetValidOpcodeHandler(),
  });
}
