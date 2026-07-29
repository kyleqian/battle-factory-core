/**
 * S10 step (iii): opcode 73, B_SCR_OP_MOVEEND / Cmd_moveend
 * (battle_script_commands.c:4210-4498). The state loop, moveendState
 * increment semantics, and the endMode/endState postlude are the opcode and
 * are implemented completely; every individual state is either implemented
 * source-completely or barriered on its own real trigger condition per the
 * (a)/(b) registration policy (ROADMAP S10's Executable-frontier reset §1).
 *
 * Numeric dispatch is authoritative and strictly sequential (0,1,2,...,16,17)
 * -- moveendState is a plain counter, so execution order matches the MOVEEND_*
 * constant values, not the case bodies' physical order in the source file
 * (which is 0..7, 11, 12, 8..10, 13..17; see
 * docs/battle-script-move-end-state-ownership.md).
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  drawBattleScriptRng,
  transitionBattleScriptCommand,
  type BattleScriptBlockReason,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
  type BattleScriptRngState,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  applyBattleScriptMoveEndChangedItemOwnership,
  applyBattleScriptMoveEndChoiceOwnership,
  applyBattleScriptMoveEndMirrorMoveOwnership,
  applyBattleScriptMoveEndSubstituteOwnership,
  applyBattleScriptMoveEndUpdateLastMovesOwnership,
  BATTLE_SCRIPT_MOVE_FLAG_MAKES_CONTACT,
  resolveBattleScriptBattlerHoldEffect,
  resolveBattleScriptMoveFlags,
  resolveBattleScriptMoveTypeName,
  resolveBattleScriptMoveEndNextTarget,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  BATTLE_SCRIPT_NUM_BATTLE_STATS,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
  type BattleScriptStatStages,
} from "./battleScriptRulesContext.ts";
import { executeBattleScriptMoveEndControllerCase } from "./battleScriptMoveEndControllers.ts";
import { resolveBattleScriptMonGender } from "./battleScriptGender.ts";

const MOVEEND_RAGE = 0;
const MOVEEND_DEFROST = 1;
const MOVEEND_SYNCHRONIZE_TARGET = 2;
const MOVEEND_ON_DAMAGE_ABILITIES = 3;
const MOVEEND_IMMUNITY_ABILITIES = 4;
const MOVEEND_SYNCHRONIZE_ATTACKER = 5;
const MOVEEND_CHOICE_MOVE = 6;
const MOVEEND_CHANGED_ITEMS = 7;
const MOVEEND_ATTACKER_INVISIBLE = 8;
const MOVEEND_ATTACKER_VISIBLE = 9;
const MOVEEND_TARGET_VISIBLE = 10;
const MOVEEND_ITEM_EFFECTS_ALL = 11;
const MOVEEND_KINGSROCK_SHELLBELL = 12;
const MOVEEND_SUBSTITUTE = 13;
const MOVEEND_UPDATE_LAST_MOVES = 14;
const MOVEEND_MIRROR_MOVE = 15;
const MOVEEND_NEXT_TARGET = 16;
const MOVEEND_COUNT = 17;

const STATUS2_RAGE = 1 << 23;
const STAT_ATK = 1;
const MAX_STAT_STAGE = 12;
const HITMARKER_SYNCHRONIZE_EFFECT = 1 << 14;
const HITMARKER_STATUS_ABILITY_EFFECT = 1 << 13;
const ABILITY_SYNCHRONIZE = 28;

/** include/constants/abilities.h -- AbilityBattleEffects' ON_DAMAGE case (battle_util.c:2749-2871). */
const ABILITY_COLOR_CHANGE = 16;
const ABILITY_ROUGH_SKIN = 24;
const ABILITY_EFFECT_SPORE = 27;
const ABILITY_POISON_POINT = 38;
const ABILITY_STATIC = 9;
const ABILITY_FLAME_BODY = 49;
const ABILITY_CUTE_CHARM = 56;
const ABILITY_OBLIVIOUS = 12;
const MOVE_EFFECT_AFFECTS_USER = 1 << 6;
const MOVE_EFFECT_POISON = 2;
const MOVE_EFFECT_BURN = 3;
const MOVE_EFFECT_PARALYSIS = 5;

/**
 * AbilityBattleEffects' ABILITYEFFECT_IMMUNITY case (battle_util.c:2873-
 * 2954): each ability only cures when its own specific status bit is
 * actually set (`switch (ability) { case ABILITY_X: if (status & Y) ... }`)
 * -- ability membership alone is a no-op in source (falls through the
 * `if`, `effect` stays 0, nothing happens), so the barrier below must gate
 * on the same per-ability status check, not just "does this battler hold
 * one of these eight abilities" (that over-fired for e.g. an Oblivious
 * battler with no active infatuation, blocking EFFECT_ATTRACT's own
 * Oblivious-fails-to-attract tail even though no cure was ever relevant).
 */
const STATUS1_POISON = 1 << 3;
const STATUS1_BURN = 1 << 4;
const STATUS1_FREEZE = 1 << 5;
const STATUS1_PARALYSIS = 1 << 6;
const STATUS1_TOXIC_POISON = 1 << 7;
const STATUS1_TOXIC_COUNTER = (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11);
const STATUS1_SLEEP = (1 << 0) | (1 << 1) | (1 << 2);
const STATUS2_CONFUSION = (1 << 0) | (1 << 1) | (1 << 2);
const STATUS2_INFATUATION = (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19);

function immunityAbilityCuresStatus(ability: number, battlerState: BattleScriptRulesBattlerState): boolean {
  switch (ability) {
    case 17: // ABILITY_IMMUNITY
      return (battlerState.status1 & (STATUS1_POISON | STATUS1_TOXIC_POISON | STATUS1_TOXIC_COUNTER)) !== 0;
    case 20: // ABILITY_OWN_TEMPO
      return (battlerState.status2 & STATUS2_CONFUSION) !== 0;
    case 7: // ABILITY_LIMBER
      return (battlerState.status1 & STATUS1_PARALYSIS) !== 0;
    case 15: // ABILITY_INSOMNIA
    case 72: // ABILITY_VITAL_SPIRIT
      return (battlerState.status1 & STATUS1_SLEEP) !== 0;
    case 41: // ABILITY_WATER_VEIL
      return (battlerState.status1 & STATUS1_BURN) !== 0;
    case 40: // ABILITY_MAGMA_ARMOR
      return (battlerState.status1 & STATUS1_FREEZE) !== 0;
    case 12: // ABILITY_OBLIVIOUS
      return (battlerState.status2 & STATUS2_INFATUATION) !== 0;
    default:
      return false;
  }
}

/** include/constants/hold_effects.h -- ItemBattleEffects' ITEMEFFECT_MOVE_END case (battle_util.c:3625-3767). */
const ITEM_MOVE_END_HOLD_EFFECTS: ReadonlySet<number> = new Set([
  2, // HOLD_EFFECT_CURE_PAR
  3, // HOLD_EFFECT_CURE_SLP
  4, // HOLD_EFFECT_CURE_PSN
  5, // HOLD_EFFECT_CURE_BRN
  6, // HOLD_EFFECT_CURE_FRZ
  8, // HOLD_EFFECT_CURE_CONFUSION
  9, // HOLD_EFFECT_CURE_STATUS
  23, // HOLD_EFFECT_RESTORE_STATS
  28, // HOLD_EFFECT_CURE_ATTRACT
]);

const HOLD_EFFECT_FLINCH = 30;
const HOLD_EFFECT_SHELL_BELL = 62;

function moveEndItemEffectApplies(
  holdEffect: number,
  battlerState: BattleScriptRulesBattlerState,
): boolean {
  switch (holdEffect) {
    case 2: // HOLD_EFFECT_CURE_PAR
      return (battlerState.status1 & STATUS1_PARALYSIS) !== 0;
    case 3: // HOLD_EFFECT_CURE_SLP
      return (battlerState.status1 & STATUS1_SLEEP) !== 0;
    case 4: // HOLD_EFFECT_CURE_PSN
      return (battlerState.status1 & (STATUS1_POISON | STATUS1_TOXIC_POISON)) !== 0;
    case 5: // HOLD_EFFECT_CURE_BRN
      return (battlerState.status1 & STATUS1_BURN) !== 0;
    case 6: // HOLD_EFFECT_CURE_FRZ
      return (battlerState.status1 & STATUS1_FREEZE) !== 0;
    case 8: // HOLD_EFFECT_CURE_CONFUSION
      return (battlerState.status2 & STATUS2_CONFUSION) !== 0;
    case 9: // HOLD_EFFECT_CURE_STATUS
      return (battlerState.status1 & (
        STATUS1_SLEEP
        | STATUS1_POISON
        | STATUS1_BURN
        | STATUS1_FREEZE
        | STATUS1_PARALYSIS
        | STATUS1_TOXIC_POISON
      )) !== 0 || (battlerState.status2 & STATUS2_CONFUSION) !== 0;
    case 23: // HOLD_EFFECT_RESTORE_STATS
      return battlerState.statStages.some((stage) => stage < 6);
    case 28: // HOLD_EFFECT_CURE_ATTRACT
      return (battlerState.status2 & STATUS2_INFATUATION) !== 0;
    default:
      return false;
  }
}

const MOVEEND_STATE_NAME_TO_VALUE: Readonly<Record<string, number>> = Object.freeze({
  MOVEEND_RAGE,
  MOVEEND_DEFROST,
  MOVEEND_SYNCHRONIZE_TARGET,
  MOVEEND_ON_DAMAGE_ABILITIES,
  MOVEEND_IMMUNITY_ABILITIES,
  MOVEEND_SYNCHRONIZE_ATTACKER,
  MOVEEND_CHOICE_MOVE,
  MOVEEND_CHANGED_ITEMS,
  MOVEEND_ATTACKER_INVISIBLE,
  MOVEEND_ATTACKER_VISIBLE,
  MOVEEND_TARGET_VISIBLE,
  MOVEEND_ITEM_EFFECTS_ALL,
  MOVEEND_KINGSROCK_SHELLBELL,
  MOVEEND_SUBSTITUTE,
  MOVEEND_UPDATE_LAST_MOVES,
  MOVEEND_MIRROR_MOVE,
  MOVEEND_NEXT_TARGET,
  MOVEEND_COUNT,
});

function parseMoveendOperand(expression: string | undefined, field: string): number {
  if (expression === undefined) {
    throw new Error(`Cmd_moveend: missing ${field} operand`);
  }
  if (/^\d+$/.test(expression)) return Number(expression);
  const value = MOVEEND_STATE_NAME_TO_VALUE[expression];
  if (value === undefined) {
    throw new Error(`Cmd_moveend: unknown ${field} operand expression ${expression}`);
  }
  return value;
}

function requireBattlerRole(
  rules: BattleScriptRulesContext,
  role: "attacker" | "target",
): BattleScriptBattlerId {
  const battler = rules.selectorRoles[role];
  if (battler === null) {
    throw new Error(`Cmd_moveend requires a bound gBattler${role === "attacker" ? "Attacker" : "Target"}`);
  }
  return battler;
}

function advanceMoveend(rules: BattleScriptRulesContext): BattleScriptRulesContext {
  return Object.freeze({ ...rules, moveendState: rules.moveendState + 1 });
}

function replaceBattlerAt(
  battlers: BattleScriptRulesBattlers,
  battler: BattleScriptBattlerId,
  next: BattleScriptRulesBattlerState,
): BattleScriptRulesBattlers {
  const mutable = [...battlers] as [
    BattleScriptRulesBattlerState,
    BattleScriptRulesBattlerState,
    BattleScriptRulesBattlerState,
    BattleScriptRulesBattlerState,
  ];
  mutable[battler] = next;
  return Object.freeze(mutable);
}

function replaceStatStage(
  stages: BattleScriptStatStages,
  index: number,
  value: number,
): BattleScriptStatStages {
  const mutable = [...stages] as number[];
  mutable[index] = value;
  if (mutable.length !== BATTLE_SCRIPT_NUM_BATTLE_STATS) {
    throw new Error("Cmd_moveend: statStages width invariant violated");
  }
  return Object.freeze(mutable) as unknown as BattleScriptStatStages;
}

/** One pass through Cmd_moveend's do-while body for the current moveendState. */
type MoveendStateOutcome =
  | Readonly<{ kind: "continue"; rules: BattleScriptRulesContext; rng?: BattleScriptRngState }>
  | Readonly<{ kind: "transfer"; transition: BattleScriptCommandTransition<BattleScriptRulesContext> }>;

function continueState(
  rules: BattleScriptRulesContext,
  rng?: BattleScriptRngState,
): MoveendStateOutcome {
  return Object.freeze({ kind: "continue", rules, ...(rng === undefined ? {} : { rng }) });
}

function transferState(
  transition: BattleScriptCommandTransition<BattleScriptRulesContext>,
): MoveendStateOutcome {
  return Object.freeze({ kind: "transfer", transition });
}

function abilitySynchronizeApplies(rules: BattleScriptRulesContext, battler: BattleScriptBattlerId): boolean {
  return rules.battlers[battler].ability === ABILITY_SYNCHRONIZE
    && (rules.hitMarker & HITMARKER_SYNCHRONIZE_EFFECT) !== 0;
}

function executeRage(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rules: BattleScriptRulesContext,
): MoveendStateOutcome {
  const attacker = requireBattlerRole(rules, "attacker");
  const target = requireBattlerRole(rules, "target");
  const targetState = rules.battlers[target];
  const applies =
    (targetState.status2 & STATUS2_RAGE) !== 0
    && targetState.hp !== 0
    && attacker !== target
    && rules.battlers[attacker].side !== targetState.side
    && (rules.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0
    && (targetState.specialStatus.physicalDmg !== 0 || targetState.specialStatus.specialDmg !== 0)
    && rules.currentMovePower !== 0
    && targetState.statStages[STAT_ATK] < MAX_STAT_STAGE;
  if (!applies) return continueState(advanceMoveend(rules));

  const nextTarget = Object.freeze({
    ...targetState,
    statStages: replaceStatStage(targetState.statStages, STAT_ATK, targetState.statStages[STAT_ATK] + 1),
  });
  const nextRules = advanceMoveend(
    Object.freeze({ ...rules, battlers: replaceBattlerAt(rules.battlers, target, nextTarget) }),
  );
  const label = resolveBattleScriptLabel(context.program, "BattleScript_RageIsBuilding");
  if (!label) throw new Error("committed Battle Script program lacks BattleScript_RageIsBuilding");
  return transferState(
    transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "call-current", programCounter: label.programCounter }),
      { rulesContext: nextRules },
    ),
  );
}

function callCurrentMoveendScript(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rules: BattleScriptRulesContext,
  labelName: string,
): MoveendStateOutcome {
  const label = resolveBattleScriptLabel(context.program, labelName);
  if (!label) throw new Error(`committed Battle Script program lacks ${labelName}`);
  return transferState(
    transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "call-current", programCounter: label.programCounter }),
      { rulesContext: advanceMoveend(rules) },
    ),
  );
}

/** AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE), battle_util.c:2749-2872. */
function executeOnDamageAbilities(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rules: BattleScriptRulesContext,
): MoveendStateOutcome {
  const attacker = requireBattlerRole(rules, "attacker");
  const target = requireBattlerRole(rules, "target");
  const attackerState = rules.battlers[attacker];
  const targetState = rules.battlers[target];
  const ability = targetState.ability;
  const isOnDamageAbility = ability === ABILITY_COLOR_CHANGE
    || ability === ABILITY_ROUGH_SKIN
    || ability === ABILITY_EFFECT_SPORE
    || ability === ABILITY_POISON_POINT
    || ability === ABILITY_STATIC
    || ability === ABILITY_FLAME_BODY
    || ability === ABILITY_CUTE_CHARM;
  // Preserve the existing moveend seam's scope for unrelated abilities; the
  // seven implemented cases all expose their actual gLastUsedAbility value.
  const baseRules = isOnDamageAbility
    ? Object.freeze({ ...rules, lastUsedAbility: ability })
    : rules;
  const targetTurnDamaged =
    targetState.specialStatus.physicalDmg !== 0 || targetState.specialStatus.specialDmg !== 0;
  if (
    (rules.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0
    || !targetTurnDamaged
  ) {
    return continueState(advanceMoveend(baseRules));
  }

  const makesContact =
    (resolveBattleScriptMoveFlags(rules.currentMove) & BATTLE_SCRIPT_MOVE_FLAG_MAKES_CONTACT) !== 0;
  const ordinaryContactGate =
    attackerState.hp !== 0 && attackerState.confusionSelfDmg !== 1 && makesContact;

  if (ability === ABILITY_COLOR_CHANGE) {
    const moveType = resolveBattleScriptMoveTypeName(rules.currentMove, rules.dynamicMoveType);
    if (
      rules.currentMove !== BATTLE_SCRIPT_MOVE_STRUGGLE
      && rules.currentMovePower !== 0
      && !targetState.types.includes(moveType)
      && targetState.hp !== 0
    ) {
      const changed = replaceBattlerAt(baseRules.battlers, target, Object.freeze({
        ...targetState,
        types: Object.freeze([moveType, moveType] as const),
      }));
      return callCurrentMoveendScript(
        context,
        Object.freeze({ ...baseRules, battlers: changed, battleTextBuff1Type: moveType }),
        "BattleScript_ColorChangeActivates",
      );
    }
    return continueState(advanceMoveend(baseRules));
  }

  if (ability === ABILITY_ROUGH_SKIN) {
    if (!ordinaryContactGate) return continueState(advanceMoveend(baseRules));
    return callCurrentMoveendScript(
      context,
      Object.freeze({
        ...baseRules,
        battleMoveDamage: Math.max(1, Math.floor(attackerState.maxHP / 16)),
      }),
      "BattleScript_RoughSkinActivates",
    );
  }

  if (
    ability !== ABILITY_EFFECT_SPORE
    && ability !== ABILITY_POISON_POINT
    && ability !== ABILITY_STATIC
    && ability !== ABILITY_FLAME_BODY
    && ability !== ABILITY_CUTE_CHARM
  ) {
    return continueState(advanceMoveend(baseRules));
  }
  if (!ordinaryContactGate) return continueState(advanceMoveend(baseRules));
  if (ability === ABILITY_CUTE_CHARM && targetState.hp === 0) {
    return continueState(advanceMoveend(baseRules));
  }

  let rng = context.state.rng;
  const abilityName = ability === ABILITY_EFFECT_SPORE
    ? "Effect Spore"
    : ability === ABILITY_POISON_POINT
      ? "Poison Point"
      : ability === ABILITY_STATIC
        ? "Static"
        : ability === ABILITY_FLAME_BODY
          ? "Flame Body"
          : "Cute Charm";
  const proc = drawBattleScriptRng(
    rng,
    context.instruction,
    `${abilityName} contact proc`,
  );
  rng = proc.rng;
  const contextAfterProc = Object.freeze({
    ...context,
    state: Object.freeze({ ...context.state, rng }),
  });
  const procDivisor = ability === ABILITY_EFFECT_SPORE ? 10 : 3;
  if ((proc.randomValue % procDivisor) !== 0) {
    return continueState(advanceMoveend(baseRules), rng);
  }

  if (ability === ABILITY_CUTE_CHARM) {
    const attackerGender = resolveBattleScriptMonGender(attackerState.species, attackerState.personality);
    const targetGender = resolveBattleScriptMonGender(targetState.species, targetState.personality);
    const eligible = targetState.hp !== 0
      && attackerState.ability !== ABILITY_OBLIVIOUS
      && attackerGender !== targetGender
      && (attackerState.status2 & STATUS2_INFATUATION) === 0
      && attackerGender !== "genderless"
      && targetGender !== "genderless";
    if (!eligible) {
      return continueState(advanceMoveend(baseRules), rng);
    }
    const infatuated = replaceBattlerAt(baseRules.battlers, attacker, Object.freeze({
      ...attackerState,
      status2: (attackerState.status2 | ((1 << target) << 16)) >>> 0,
    }));
    return callCurrentMoveendScript(
      contextAfterProc,
      Object.freeze({ ...baseRules, battlers: infatuated }),
      "BattleScript_CuteCharmActivates",
    );
  }

  let moveEffect: number;
  if (ability === ABILITY_EFFECT_SPORE) {
    do {
      const selection = drawBattleScriptRng(rng, context.instruction, "Effect Spore status selector");
      rng = selection.rng;
      moveEffect = selection.randomValue & 3;
    } while (moveEffect === 0);
    if (moveEffect === MOVE_EFFECT_BURN) moveEffect = MOVE_EFFECT_PARALYSIS;
  } else {
    moveEffect = ability === ABILITY_POISON_POINT
      ? MOVE_EFFECT_POISON
      : ability === ABILITY_STATIC
        ? MOVE_EFFECT_PARALYSIS
        : MOVE_EFFECT_BURN;
  }
  const statusRules = Object.freeze({
    ...baseRules,
    aiObservedAbilityIds: Object.freeze(
      baseRules.aiObservedAbilityIds.map((value, index) => index === target ? ability : value),
    ) as BattleScriptRulesContext["aiObservedAbilityIds"],
    moveEffectByte: MOVE_EFFECT_AFFECTS_USER | moveEffect,
    hitMarker: (baseRules.hitMarker | HITMARKER_STATUS_ABILITY_EFFECT) >>> 0,
  });
  const statusContext = Object.freeze({
    ...context,
    state: Object.freeze({ ...context.state, rng }),
  });
  return callCurrentMoveendScript(statusContext, statusRules, "BattleScript_ApplySecondaryEffect");
}

function executeControllerDelegatedState(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rules: BattleScriptRulesContext,
): MoveendStateOutcome {
  const patched: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext> = Object.freeze({
    program: context.program,
    instruction: context.instruction,
    state: Object.freeze({ ...context.state, rulesContext: rules }),
  });
  const transition = executeBattleScriptMoveEndControllerCase(patched);
  if (transition.control.kind === "jump") {
    // The dependency-step helper's no-op continuation; Cmd_moveend's do-while
    // keeps looping in the same C call, so this stays internal to this opcode.
    return continueState(transition.rulesContext);
  }
  return transferState(transition);
}

function executeMoveendState(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rules: BattleScriptRulesContext,
): MoveendStateOutcome {
  switch (rules.moveendState) {
    case MOVEEND_RAGE:
      return executeRage(context, rules);
    case MOVEEND_DEFROST:
    case MOVEEND_ATTACKER_INVISIBLE:
    case MOVEEND_ATTACKER_VISIBLE:
    case MOVEEND_TARGET_VISIBLE:
      return executeControllerDelegatedState(context, rules);
    case MOVEEND_SYNCHRONIZE_TARGET: {
      const target = requireBattlerRole(rules, "target");
      if (abilitySynchronizeApplies(rules, target)) {
        return transferState(unsupportedBranch(
          context,
          "AbilityBattleEffects(ABILITYEFFECT_SYNCHRONIZE)'s ABILITY_SYNCHRONIZE branch "
            + "(gBattleStruct->synchronizeMoveEffect, BattleScript_SynchronizeActivates transfer) is not modeled",
          "battle_util.c",
          2971,
        ));
      }
      return continueState(advanceMoveend(rules));
    }
    case MOVEEND_ON_DAMAGE_ABILITIES:
      return executeOnDamageAbilities(context, rules);
    case MOVEEND_IMMUNITY_ABILITIES: {
      const count = rules.battleTopology.battlersCount;
      for (let battler = 0; battler < count; battler += 1) {
        const battlerState = rules.battlers[battler as BattleScriptBattlerId];
        const ability = battlerState.ability;
        if (immunityAbilityCuresStatus(ability, battlerState)) {
          return transferState(unsupportedBranch(
            context,
            `AbilityBattleEffects(ABILITYEFFECT_IMMUNITY)'s status-curing branch (battler ${battler}, `
              + `ability ${ability}: Immunity/Own Tempo/Limber/Insomnia/Vital Spirit/Water Veil/Magma Armor/`
              + "Oblivious) needs the BtlController_EmitSetMonData/BattleScript_AbilityCuredStatus transfer "
              + "not modeled here",
            "battle_util.c",
            2876,
          ));
        }
      }
      return continueState(advanceMoveend(rules));
    }
    case MOVEEND_SYNCHRONIZE_ATTACKER: {
      const attacker = requireBattlerRole(rules, "attacker");
      if (abilitySynchronizeApplies(rules, attacker)) {
        return transferState(unsupportedBranch(
          context,
          "AbilityBattleEffects(ABILITYEFFECT_ATK_SYNCHRONIZE)'s ABILITY_SYNCHRONIZE branch "
            + "(gBattleStruct->synchronizeMoveEffect, BattleScript_SynchronizeActivates transfer) is not modeled",
          "battle_util.c",
          2987,
        ));
      }
      return continueState(advanceMoveend(rules));
    }
    case MOVEEND_CHOICE_MOVE:
      return continueState(advanceMoveend(applyBattleScriptMoveEndChoiceOwnership(rules)));
    case MOVEEND_CHANGED_ITEMS:
      return continueState(advanceMoveend(applyBattleScriptMoveEndChangedItemOwnership(rules)));
    case MOVEEND_ITEM_EFFECTS_ALL: {
      const count = rules.battleTopology.battlersCount;
      for (let battler = 0; battler < count; battler += 1) {
        const battlerState = rules.battlers[battler as BattleScriptBattlerId];
        const holdEffect = resolveBattleScriptBattlerHoldEffect(rules, battler as BattleScriptBattlerId);
        if (
          ITEM_MOVE_END_HOLD_EFFECTS.has(holdEffect)
          && moveEndItemEffectApplies(holdEffect, battlerState)
        ) {
          return transferState(unsupportedBranch(
            context,
            `ItemBattleEffects(ITEMEFFECT_MOVE_END)'s status/stat-restoring branch (battler ${battler}, `
              + `holdEffect ${holdEffect}) needs the BattleScriptPushCursor/controller cutscene transfer `
              + "not modeled here",
            "battle_util.c",
            3639,
          ));
        }
      }
      // Source increments moveendState only when ItemBattleEffects reports no effect.
      return continueState(advanceMoveend(rules));
    }
    case MOVEEND_KINGSROCK_SHELLBELL: {
      const attacker = requireBattlerRole(rules, "attacker");
      if (rules.battleMoveDamage !== 0) {
        const atkHoldEffect = resolveBattleScriptBattlerHoldEffect(rules, attacker);
        if (atkHoldEffect === HOLD_EFFECT_FLINCH || atkHoldEffect === HOLD_EFFECT_SHELL_BELL) {
          return transferState(unsupportedBranch(
            context,
            `ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL)'s ${
              atkHoldEffect === HOLD_EFFECT_FLINCH ? "King's Rock flinch" : "Shell Bell heal"
            } branch needs RNG/script-transfer subsystems not modeled here`,
            "battle_util.c",
            3772,
          ));
        }
      }
      // Source increments moveendState unconditionally here, unlike state 11.
      return continueState(advanceMoveend(rules));
    }
    case MOVEEND_SUBSTITUTE:
      return continueState(advanceMoveend(applyBattleScriptMoveEndSubstituteOwnership(rules)));
    case MOVEEND_UPDATE_LAST_MOVES:
      return continueState(applyBattleScriptMoveEndUpdateLastMovesOwnership(rules));
    case MOVEEND_MIRROR_MOVE:
      return continueState(applyBattleScriptMoveEndMirrorMoveOwnership(rules));
    case MOVEEND_NEXT_TARGET: {
      const resolution = resolveBattleScriptMoveEndNextTarget(rules);
      if (resolution.kind === "replay-partner") {
        return transferState(unsupportedBranch(
          context,
          "Cmd_moveend's MOVEEND_NEXT_TARGET doubles replay (MoveValuesCleanUp + "
            + "BattleScript_FlushMessageBox script transfer) is not modeled -- unreachable for Level-50 singles",
          "battle_script_commands.c",
          4467,
        ));
      }
      return continueState(
        Object.freeze({ ...rules, hitMarker: resolution.hitMarker, moveendState: rules.moveendState + 1 }),
      );
    }
    case MOVEEND_COUNT:
      return continueState(rules);
    default:
      throw new Error(
        `Cmd_moveend: moveendState ${rules.moveendState} is outside the committed program's 0..17 domain`,
      );
  }
}

function controllerBusyBlock(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const reason: BattleScriptBlockReason = Object.freeze({
    kind: "controller-busy",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
  });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
}

function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  sourceConstruct: string,
  sourceFile: string,
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
        sourceFile,
        sourceLine,
      }),
    }),
  );
}

/**
 * Cmd_moveend (battle_script_commands.c:4210-4498). The do-while/switch state
 * loop, moveendState increment semantics, and endMode/endState postlude are
 * the opcode; every source branch inside an individual state is either
 * implemented completely or an explicit unsupported-branch barrier on its own
 * trigger, per the (a)/(b) registration policy.
 */
function createMoveendOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (context.state.scheduler.pendingControllerBattlers.length !== 0) {
      return controllerBusyBlock(context);
    }
    const endMode = parseMoveendOperand(context.instruction.operands[0]?.expression, "endMode");
    const endState = parseMoveendOperand(context.instruction.operands[1]?.expression, "endState");
    if (endMode !== 0 && endMode !== 1 && endMode !== 2) {
      throw new Error(`Cmd_moveend: endMode ${endMode} is outside the committed program's 0/1/2 domain`);
    }

    let rules = context.state.rulesContext;
    let rng = context.state.rng;
    for (;;) {
      if (rules.moveendState === MOVEEND_COUNT) {
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "advance" }),
          { rulesContext: rules, rng },
        );
      }
      const currentContext = Object.freeze({
        ...context,
        state: Object.freeze({ ...context.state, rulesContext: rules, rng }),
      });
      const outcome = executeMoveendState(currentContext, rules);
      if (outcome.kind === "transfer") {
        return outcome.transition;
      }
      rules = outcome.rules;
      rng = outcome.rng ?? rng;
      if (endMode === 1) {
        rules = Object.freeze({ ...rules, moveendState: MOVEEND_COUNT });
      } else if (endMode === 2 && rules.moveendState === endState) {
        rules = Object.freeze({ ...rules, moveendState: MOVEEND_COUNT });
      }
    }
  };
}

export function createBattleScriptMoveEndOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find((candidate) => candidate.opcodeName === "B_SCR_OP_MOVEEND");
  if (!instruction) throw new Error("committed Battle Script program does not emit B_SCR_OP_MOVEEND");
  return Object.freeze({ [instruction.opcodeId]: createMoveendOpcodeHandler() });
}
