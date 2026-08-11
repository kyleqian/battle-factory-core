/**
 * Curse's two source-complete commands:
 *
 * - `B_SCR_OP_JUMPIFTYPE2` / `Cmd_jumpiftype2`
 *   (`battle_script_commands.c:3981-3990`) resolves its battler selector and
 *   compares the encoded type against both source `gBattleMons[].types`
 *   slots. All eighteen Gen-3 `TYPE_*` immediates are accepted even though
 *   the committed program's sole call site uses `BS_ATTACKER, TYPE_GHOST`.
 * - `B_SCR_OP_CURSETARGET` / `Cmd_cursetarget`
 *   (`battle_script_commands.c:8468-8483`) rejects an already-cursed target;
 *   otherwise it sets `STATUS2_CURSED` and stages positive self-damage equal
 *   to floor(attacker.maxHP / 2), clamped to one.
 *
 * Neither command consumes RNG, emits an event, or touches controller state.
 */
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptBattlerSelectorResolverPort } from "./battleScriptSourceCommands.ts";
import {
  withBattler,
} from "./battleScriptHitChainOpcode.ts";
import {
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/pokemon.h:6-23 -- complete numeric type ABI, represented by the source names stored in the rules context. */
const SOURCE_BATTLE_TYPES = new Set([
  "TYPE_NORMAL",
  "TYPE_FIGHTING",
  "TYPE_FLYING",
  "TYPE_POISON",
  "TYPE_GROUND",
  "TYPE_ROCK",
  "TYPE_BUG",
  "TYPE_GHOST",
  "TYPE_STEEL",
  "TYPE_MYSTERY",
  "TYPE_FIRE",
  "TYPE_WATER",
  "TYPE_GRASS",
  "TYPE_ELECTRIC",
  "TYPE_PSYCHIC",
  "TYPE_ICE",
  "TYPE_DRAGON",
  "TYPE_DARK",
]);

function createJumpiftype2Handler(
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [battlerOperand, typeOperand, ptrOperand] = context.instruction.operands;
    const battler = resolveBattlerForBattleScript(context, battlerOperand!);
    if (battler === null) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: Object.freeze({
            kind: "source-context-unavailable",
            programCounter: context.state.programCounter,
            opcodeId: context.instruction.opcodeId,
            opcodeName: context.instruction.opcodeName,
            port: "resolve-battler-for-battle-script",
            operandExpression: battlerOperand!.expression,
          }),
        }),
      );
    }

    const battlerTypes = context.state.rulesContext.battlers[battler].types;
    if (battlerTypes[0] !== typeOperand!.expression && battlerTypes[1] !== typeOperand!.expression) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (!target) throw new Error(`Cmd_jumpiftype2: unresolved jump target ${ptrOperand!.expression}`);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

function requireRole(
  rules: BattleScriptRulesContext,
  role: "attacker" | "target",
) {
  const battler = rules.selectorRoles[role];
  if (battler === null) throw new Error(`Cmd_cursetarget requires a ${role} role`);
  return battler;
}

function createCursetargetHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireRole(rules, "attacker");
    const target = requireRole(rules, "target");
    const targetState = rules.battlers[target];

    if ((targetState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED) !== 0) {
      const [failOperand] = context.instruction.operands;
      const failTarget = resolveBattleScriptLabel(context.program, failOperand!.expression);
      if (!failTarget) throw new Error(`Cmd_cursetarget: unresolved jump target ${failOperand!.expression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failTarget.programCounter }),
      );
    }

    const cursedRules = withBattler(rules, target, {
      status2: (targetState.status2 | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED) >>> 0,
    });
    const battleMoveDamage = Math.max(1, Math.floor(rules.battlers[attacker].maxHP / 2));
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...cursedRules, battleMoveDamage }) },
    );
  };
}

export function createBattleScriptCurseOpcodeHandlers(
  program: BattleScriptProgram,
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const jumpiftype2Starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFTYPE2",
  );
  if (jumpiftype2Starts.length !== 1) {
    throw new Error(`B_SCR_OP_JUMPIFTYPE2 requires exactly 1 concrete start, got ${jumpiftype2Starts.length}`);
  }
  const [jumpiftype2] = jumpiftype2Starts;
  const [battlerOperand, typeOperand, jumpPtrOperand] = jumpiftype2!.operands;
  if (
    jumpiftype2!.dispatcher !== "Cmd_jumpiftype2"
    || jumpiftype2!.operands.length !== 3
    || battlerOperand?.widthBytes !== 1
    || typeOperand?.widthBytes !== 1
    || jumpPtrOperand?.widthBytes !== 4
    || !SOURCE_BATTLE_TYPES.has(typeOperand.expression)
    || !resolveBattleScriptLabel(program, jumpPtrOperand.expression)
  ) {
    throw new Error(`invalid B_SCR_OP_JUMPIFTYPE2 shape at program counter ${jumpiftype2!.programCounter}`);
  }

  const cursetargetStarts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_CURSETARGET",
  );
  if (cursetargetStarts.length !== 1) {
    throw new Error(`B_SCR_OP_CURSETARGET requires exactly 1 concrete start, got ${cursetargetStarts.length}`);
  }
  const [cursetarget] = cursetargetStarts;
  const [curseFailOperand] = cursetarget!.operands;
  if (
    cursetarget!.dispatcher !== "Cmd_cursetarget"
    || cursetarget!.operands.length !== 1
    || curseFailOperand?.widthBytes !== 4
    || !resolveBattleScriptLabel(program, curseFailOperand.expression)
  ) {
    throw new Error(`invalid B_SCR_OP_CURSETARGET shape at program counter ${cursetarget!.programCounter}`);
  }

  return Object.freeze({
    [jumpiftype2!.opcodeId]: createJumpiftype2Handler(resolveBattlerForBattleScript),
    [cursetarget!.opcodeId]: createCursetargetHandler(),
  });
}
