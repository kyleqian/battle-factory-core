/**
 * The primary status-move opcode cluster's jump-family quartet
 * (docs/status-cluster-ground-truth.md, the shared blocker set for
 * EFFECT_SLEEP/TOXIC/POISON/PARALYZE/CONFUSE alongside
 * Cmd_seteffectprimary in battleScriptHitChainOpcode.ts and the
 * Cmd_jumpifability/Cmd_jumpifstatus2 concrete-value widenings in
 * battleScriptIngrainLeechSeedWrapOpcode.ts/battleScriptStatbuffchangeOpcode.ts):
 *
 *   Cmd_jumpifstatus (battle_script_commands.c:3081-3091),
 *   Cmd_jumpiftype (:3243-3253), Cmd_jumpifsideaffecting (:3158-3176),
 *   Cmd_jumpifcantmakeasleep (:6828-6848) + UproarWakeUpCheck (:6801-6826).
 *
 * All four are pure state reads -- no RNG, no controller interaction.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import { recordBattleScriptAbilityReveal } from "./battleScriptAiReveal.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { isBattlerOfType, unsupportedBranch } from "./battleScriptHitChainOpcode.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";
import type { BattleScriptBattlerSelectorResolverPort } from "./battleScriptSourceCommands.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/abilities.h. */
const ABILITY_SOUNDPROOF = 43;
const ABILITY_INSOMNIA = 15;
const ABILITY_VITAL_SPIRIT = 72;

/** battle_message.c:999-1004 -- gUproarAwakeStringIds' own MULTISTRING_CHOOSER indices. */
const B_MSG_CANT_SLEEP_UPROAR = 0;
const B_MSG_UPROAR_KEPT_AWAKE = 1;
const B_MSG_STAYED_AWAKE_USING = 2;

/** include/constants/battle.h:214 -- the one concrete jumpifsideaffecting value this cluster needs. */
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const SIDE_STATUS_VALUES: ReadonlyMap<string, number> = new Map([
  ["SIDE_STATUS_SAFEGUARD", SIDE_STATUS_SAFEGUARD],
]);

/**
 * include/constants/battle.h:114-125 -- the six single-bit STATUS1_* values
 * plus their STATUS1_ANY union. `Cmd_jumpifstatus`'s own concrete call sites
 * also use a 4-way OR (`STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS |
 * STATUS1_TOXIC_POISON`), so this resolves arbitrary `|`-joined combinations
 * of the named set rather than a fixed enumerated tuple.
 */
const STATUS1_SINGLE_BITS: ReadonlyMap<string, number> = new Map([
  ["STATUS1_SLEEP", 0x7],
  ["STATUS1_POISON", 1 << 3],
  ["STATUS1_BURN", 1 << 4],
  ["STATUS1_FREEZE", 1 << 5],
  ["STATUS1_PARALYSIS", 1 << 6],
  ["STATUS1_TOXIC_POISON", 1 << 7],
]);
const STATUS1_ANY = 0xff;

function resolveStatus1Mask(expression: string): number | null {
  let result = 0;
  for (const term of expression.split("|")) {
    const trimmed = term.trim();
    if (trimmed === "STATUS1_ANY") {
      result |= STATUS1_ANY;
      continue;
    }
    const bit = STATUS1_SINGLE_BITS.get(trimmed);
    if (bit === undefined) return null;
    result |= bit;
  }
  return result >>> 0;
}

/** asm/macros/battle_script.inc:181-186 -- the 18 real TYPE_* tokens jumpiftype's type operand can carry. */
const TYPE_NAMES: ReadonlySet<string> = new Set([
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY",
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC",
  "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK",
]);

function sourceContextUnavailableBlock(
  context: Parameters<BattleScriptOpcodeHandler<BattleScriptRulesContext>>[0],
  operandExpression: string,
): ReturnType<BattleScriptOpcodeHandler<BattleScriptRulesContext>> {
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
        operandExpression,
      }),
    }),
  );
}

/** Cmd_jumpifstatus (battle_script_commands.c:3081-3091). */
export function createJumpifstatusOpcodeHandler(
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [battlerOperand, statusOperand, ptrOperand] = context.instruction.operands;
    const mask = resolveStatus1Mask(statusOperand!.expression);
    if (mask === null) {
      return unsupportedBranch(
        context,
        `Cmd_jumpifstatus's status1 value ${statusOperand!.expression} is outside the registered set`,
        "battle_script_commands.c",
        3081,
      );
    }
    const battler = resolveBattlerForBattleScript(context, battlerOperand!);
    if (battler === null) return sourceContextUnavailableBlock(context, battlerOperand!.expression);
    const battlerState = context.state.rulesContext.battlers[battler];
    const shouldJump = (battlerState.status1 & mask) !== 0 && battlerState.hp !== 0;
    if (!shouldJump) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (!target) throw new Error(`Cmd_jumpifstatus: unresolved jump target ${ptrOperand!.expression}`);
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "jump", programCounter: target.programCounter }));
  };
}

/** Cmd_jumpiftype (battle_script_commands.c:3243-3253). */
export function createJumpiftypeOpcodeHandler(
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [battlerOperand, typeOperand, ptrOperand] = context.instruction.operands;
    if (!TYPE_NAMES.has(typeOperand!.expression)) {
      return unsupportedBranch(
        context,
        `Cmd_jumpiftype's type operand ${typeOperand!.expression} is not a recognized TYPE_* constant`,
        "battle_script_commands.c",
        3243,
      );
    }
    const battler = resolveBattlerForBattleScript(context, battlerOperand!);
    if (battler === null) return sourceContextUnavailableBlock(context, battlerOperand!.expression);
    const battlerState = context.state.rulesContext.battlers[battler];
    if (!isBattlerOfType(battlerState, typeOperand!.expression)) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (!target) throw new Error(`Cmd_jumpiftype: unresolved jump target ${ptrOperand!.expression}`);
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "jump", programCounter: target.programCounter }));
  };
}

/**
 * Cmd_jumpifsideaffecting (battle_script_commands.c:3158-3176). Source
 * resolves `side` from `GET_BATTLER_SIDE` on either the attacker or target
 * (any non-BS_ATTACKER operand defaults to target); every concrete call site
 * in the committed program passes BS_TARGET, so the generic battler-selector
 * port (BS_TARGET/BS_ATTACKER) covers the real topology exactly.
 */
export function createJumpifsideaffectingOpcodeHandler(
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [battlerOperand, flagsOperand, ptrOperand] = context.instruction.operands;
    const flags = SIDE_STATUS_VALUES.get(flagsOperand!.expression);
    if (flags === undefined) {
      return unsupportedBranch(
        context,
        `Cmd_jumpifsideaffecting's side-status value ${flagsOperand!.expression} is outside the registered set`,
        "battle_script_commands.c",
        3158,
      );
    }
    const battler = resolveBattlerForBattleScript(context, battlerOperand!);
    if (battler === null) return sourceContextUnavailableBlock(context, battlerOperand!.expression);
    const rulesContext = context.state.rulesContext;
    const side = rulesContext.battlers[battler].side;
    const shouldJump = (rulesContext.sideStatuses[side] & flags) !== 0;
    if (!shouldJump) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (!target) throw new Error(`Cmd_jumpifsideaffecting: unresolved jump target ${ptrOperand!.expression}`);
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "jump", programCounter: target.programCounter }));
  };
}

/**
 * Cmd_jumpifcantmakeasleep (battle_script_commands.c:6828-6848) +
 * UproarWakeUpCheck (:6801-6826). No battler selector operand -- always
 * gBattlerTarget (rulesContext.selectorRoles.target). The Uproar loop is
 * bounded by battlersCount (2 in Level-50 singles), the same shape as
 * battleScriptActionAdmission.ts's own AtkCanceler_UnableToUseMove sleep
 * phase (:1344-1357).
 */
export function createJumpifcantmakeasleepOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const target = rulesContext.selectorRoles.target;
    if (target === null) throw new Error("Cmd_jumpifcantmakeasleep requires a target role");
    const targetState = rulesContext.battlers[target];

    let uproarBattler: BattleScriptBattlerId | null = null;
    if (targetState.ability !== ABILITY_SOUNDPROOF) {
      const { battlersCount } = rulesContext.battleTopology;
      for (let i = 0; i < battlersCount; i += 1) {
        const battlerId = i as BattleScriptBattlerId;
        if ((rulesContext.battlers[battlerId].status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR) !== 0) {
          uproarBattler = battlerId;
          break;
        }
      }
    }

    const [ptrOperand] = context.instruction.operands;
    const resolveJumpProgramCounter = (): number => {
      const label = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
      if (!label) throw new Error(`Cmd_jumpifcantmakeasleep: unresolved jump target ${ptrOperand!.expression}`);
      return label.programCounter;
    };

    if (uproarBattler !== null) {
      const multistringChooser = uproarBattler === target ? B_MSG_CANT_SLEEP_UPROAR : B_MSG_UPROAR_KEPT_AWAKE;
      const nextRulesContext = Object.freeze({ ...rulesContext, multistringChooser, scriptingBattler: uproarBattler });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: resolveJumpProgramCounter() }),
        { rulesContext: nextRulesContext },
      );
    }
    if (targetState.ability === ABILITY_INSOMNIA || targetState.ability === ABILITY_VITAL_SPIRIT) {
      const nextRulesContext = recordBattleScriptAbilityReveal(
        Object.freeze({
          ...rulesContext,
          multistringChooser: B_MSG_STAYED_AWAKE_USING,
          lastUsedAbility: targetState.ability,
        }),
        target,
        targetState.ability,
      );
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: resolveJumpProgramCounter() }),
        { rulesContext: nextRulesContext },
      );
    }
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  };
}

export function createBattleScriptStatusPrimaryOpcodeHandlers(
  program: BattleScriptProgram,
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const findOpcodeId = (opcodeName: string): number => {
    const instruction = program.instructions.find((candidate) => candidate.opcodeName === opcodeName);
    if (!instruction) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
    return instruction.opcodeId;
  };
  return Object.freeze({
    [findOpcodeId("B_SCR_OP_JUMPIFSTATUS")]: createJumpifstatusOpcodeHandler(resolveBattlerForBattleScript),
    [findOpcodeId("B_SCR_OP_JUMPIFTYPE")]: createJumpiftypeOpcodeHandler(resolveBattlerForBattleScript),
    [findOpcodeId("B_SCR_OP_JUMPIFSIDEAFFECTING")]: createJumpifsideaffectingOpcodeHandler(resolveBattlerForBattleScript),
    [findOpcodeId("B_SCR_OP_JUMPIFCANTMAKEASLEEP")]: createJumpifcantmakeasleepOpcodeHandler(),
  });
}
