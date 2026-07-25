/**
 * RUNG 1 of S10 step (ii): the miss-path prefix of BattleScript_EffectHit's
 * standard hit chain -- Cmd_accuracycheck, Cmd_attackstring, Cmd_ppreduce
 * (battle_script_commands.c:1099-1247). Consumes the already-pinned
 * calculateAccuracy/rollAccuracyHits ports from damageCalc.ts; does not
 * reimplement the accuracy math.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  drawBattleScriptRng,
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptBlockReason,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
  type BattleScriptRngState,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptOperand,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type {
  BattleScriptControllerIdlePort,
  BattleScriptMessagePreparationPort,
} from "./battleScriptSourceCommands.ts";
import {
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_ITEM_ENIGMA_BERRY,
  BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_MOVE_TARGET_BOTH,
  BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
  resolveBattleScriptBattlerHoldEffect,
  resolveBattleScriptMoveTarget,
  resolveBattleScriptMoveType,
  type BattleScriptMoveEndHalfwords,
  type BattleScriptMoveHistory,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FIRST_BATTLE,
  BATTLE_SCRIPT_BATTLE_TYPE_WALLY_TUTORIAL,
  BATTLE_SCRIPT_HITMARKER_GRUDGE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER,
  BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE,
  BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE,
  BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE,
  BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
  BATTLE_SCRIPT_STATUS2_FORESIGHT,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
  BATTLE_SCRIPT_STATUS3_ALWAYS_HITS,
  BATTLE_SCRIPT_STATUS3_CANT_SCORE_A_CRIT,
  BATTLE_SCRIPT_STATUS3_ON_AIR,
  BATTLE_SCRIPT_STATUS3_UNDERGROUND,
  BATTLE_SCRIPT_STATUS3_UNDERWATER,
} from "./battleScriptSourceConstants.ts";
import {
  applyRandomDamageMultiplier,
  applyStab,
  calculateAccuracy,
  calculateBaseDamage,
  CRITICAL_HIT_CHANCE_ONE_IN,
  isTypePhysical,
  rollAccuracyHits,
  rollIsCriticalHit,
  type TypeEffectivenessEntry,
} from "./damageCalc.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import itemHoldEffectsData from "../data/gen/item-hold-effects.json" with { type: "json" };
import typeEffectivenessData from "../data/gen/type-effectiveness.json" with { type: "json" };

type MoveRow = Readonly<{
  id: number;
  power: number;
  accuracy: number;
  effect: string;
  type: string;
  flags: readonly string[];
}>;

const MOVE_ROWS = new Map<number, MoveRow>(
  (movesData.moves as readonly MoveRow[]).map((row) => [row.id, row]),
);

function requireMoveRow(move: number): MoveRow {
  const row = MOVE_ROWS.get(move);
  if (!row) throw new Error(`accuracycheck/ppreduce: move ${move} has no source-derived gBattleMoves row`);
  return row;
}

const TYPE_NAME_BY_ID: readonly string[] = [
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY",
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC",
  "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK",
];

function resolveMoveTypeName(rulesContext: BattleScriptRulesContext, move: number): string {
  const id = resolveBattleScriptMoveType(move, rulesContext.dynamicMoveType);
  const name = TYPE_NAME_BY_ID[id];
  if (!name) throw new Error(`accuracycheck: unknown numeric type id ${id}`);
  return name;
}

const ABILITY_BATTLE_ARMOR = 4;
const ABILITY_LEVITATE = 26;
const ABILITY_WONDER_GUARD = 25;
const ABILITY_PRESSURE = 46;
const ABILITY_SHELL_ARMOR = 75;
const ABILITY_NAME_BY_ID: Readonly<Record<number, string>> = Object.freeze({
  8: "ABILITY_SAND_VEIL",
  14: "ABILITY_COMPOUND_EYES",
  55: "ABILITY_HUSTLE",
  62: "ABILITY_GUTS",
});

const SPECIES_FARFETCHD = 83;
const SPECIES_CHANSEY = 113;

/** hold_effects.h ids (item-hold-effects.json's `holdEffectId`). */
const HOLD_EFFECT_ID_FOCUS_BAND = 39;
const HOLD_EFFECT_ID_SCOPE_LENS = 41;
const HOLD_EFFECT_ID_LUCKY_PUNCH = 63;
const HOLD_EFFECT_ID_STICK = 66;

/** STATUS3_CHARGED_UP (include/constants/battle.h:166) - Charge's next-hit Electric ×2. */
const STATUS3_CHARGED_UP = 1 << 9;
/** STATUS1_BURN (include/constants/battle.h:118). */
const STATUS1_BURN = 1 << 4;

const B_MSG_MISSED = 0;
const B_MSG_PROTECTED = 1;
const B_MSG_AVOIDED_ATK = 2;
const B_MSG_AVOIDED_DMG = 3;
const B_MSG_GROUND_MISS = 4;
const MISS_STRING_ID_BY_TYPE: readonly string[] = [
  "STRINGID_ATTACKMISSED",
  "STRINGID_PKMNPROTECTEDITSELF",
  "STRINGID_PKMNAVOIDEDATTACK",
  "STRINGID_AVOIDEDDAMAGE",
  "STRINGID_PKMNMAKESGROUNDMISS",
];

/** include/constants/battle.h:220-227, the u8 gMoveResultFlags bits resultmessage/effectivenesssound switch on. */
const MOVE_RESULT_SUPER_EFFECTIVE = 1 << 1;
const MOVE_RESULT_NOT_VERY_EFFECTIVE = 1 << 2;
const MOVE_RESULT_DOESNT_AFFECT_FOE = 1 << 3;
const MOVE_RESULT_ONE_HIT_KO = 1 << 4;
const MOVE_RESULT_FOE_ENDURED = 1 << 6;
const MOVE_RESULT_FOE_HUNG_ON = 1 << 7;

/** include/constants/battle.h: hitMarker bits datahpupdate/hitanimation/healthbarupdate read. */
const HITMARKER_IGNORE_BIDE = 1 << 5;
const HITMARKER_IGNORE_SUBSTITUTE = 1 << 8;
const HITMARKER_PASSIVE_HP_UPDATE = 1 << 20;

/** include/battle.h:52-53, the doubles-only spread-move target bits attackanimation's early-return checks. */
const MOVE_TARGET_DEPENDS = 1 << 0;
const MOVE_TARGET_FOES_AND_ALLY = 1 << 5;

/** include/constants/songs.h:18-20. */
const SE_NOT_EFFECTIVE = 12;
const SE_EFFECTIVE = 13;
const SE_SUPER_EFFECTIVE = 14;

function stringOperand(expression: string, sourceMacroLine: number): BattleScriptOperand {
  return Object.freeze({
    widthBytes: 2,
    expression,
    sourceMacro: expression,
    sourceMacroLine,
    wrapperPath: Object.freeze([]),
  });
}

type HoldEffectRow = Readonly<{ itemId: number; holdEffect: string; holdEffectParam: number }>;
const HOLD_EFFECT_ROW_BY_ITEM = new Map<number, HoldEffectRow>(
  (itemHoldEffectsData.items as readonly HoldEffectRow[]).map((row) => [row.itemId, row]),
);
const HOLD_EFFECT_EVASION_UP_ID = 22;

const TYPE_EFFECTIVENESS = (typeEffectivenessData.typeEffectiveness as readonly TypeEffectivenessEntry[]);

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

function blockOnUnavailableMessage(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  operandExpression: string,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const reason: BattleScriptBlockReason = Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "prepare-message",
    operandExpression,
  });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
}

/**
 * GetBattlerForBattleScript's BS_TARGET/BS_ATTACKER cases, the only two
 * selectors hitanimation/healthbarupdate/datahpupdate are reached with
 * anywhere in the committed program (BattleScript_EffectHit's own chain
 * always uses BS_TARGET; a handful of recoil-family scripts elsewhere use
 * BS_ATTACKER). Other selector cases remain unavailable until their own
 * context is explicit, matching resolveRulesBattlerForBattleScript's own
 * documented scope.
 */
function resolveHitChainBattlerOperand(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
): BattleScriptBattlerId | "unsupported" {
  const expression = context.instruction.operands[0]?.expression;
  if (expression === "BS_TARGET") return requireBattlerRole(rulesContext, "target");
  if (expression === "BS_ATTACKER") return requireBattlerRole(rulesContext, "attacker");
  return "unsupported";
}

function requireBattlerRole(
  rulesContext: BattleScriptRulesContext,
  role: "attacker" | "target",
): BattleScriptBattlerId {
  const value = rulesContext.selectorRoles[role];
  if (value === null) throw new Error(`Battle Script hit-chain command requires a ${role} role`);
  return value;
}

function withBattler(
  rulesContext: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
  changes: Partial<BattleScriptRulesBattlerState>,
): BattleScriptRulesContext {
  const battlers = rulesContext.battlers.map((candidate, index) =>
    index === battler ? Object.freeze({ ...candidate, ...changes }) : candidate
  ) as unknown as BattleScriptRulesBattlers;
  return Object.freeze({ ...rulesContext, battlers: Object.freeze(battlers) });
}

function withClearedLandedMove(
  moveHistory: BattleScriptMoveHistory,
  target: BattleScriptBattlerId,
): BattleScriptMoveHistory {
  const clearAt = (halfwords: BattleScriptMoveEndHalfwords) =>
    Object.freeze(halfwords.map((value, index) => (index === target ? 0 : value))) as unknown as
      BattleScriptMoveEndHalfwords;
  return Object.freeze({
    ...moveHistory,
    lastLandedMoves: clearAt(moveHistory.lastLandedMoves),
    lastHitByType: clearAt(moveHistory.lastHitByType),
  });
}

/**
 * Cmd_accuracycheck's DEFENDER_IS_PROTECTED gate (JumpIfMoveAffectedByProtect,
 * battle_script_commands.c:1038-1048), and the identical macro reused by
 * Cmd_attackcanceler's own tail check -- exported so both call sites share
 * one source-faithful predicate.
 */
export function isDefenderProtected(
  targetBattler: BattleScriptRulesBattlerState,
  move: number,
): boolean {
  return targetBattler.protected === 1 && moveHasProtectFlag(move);
}

const MOVE_FLAGS_BY_ID = new Map<number, readonly string[]>(
  (movesData.moves as readonly MoveRow[]).map((row) => [row.id, row.flags]),
);

function moveHasProtectFlag(move: number): boolean {
  return (MOVE_FLAGS_BY_ID.get(move) ?? []).includes("FLAG_PROTECT_AFFECTED");
}

/**
 * JumpIfMoveFailed's two outcomes (battle_script_commands.c:1009-1024),
 * specialized to accuracycheck: this opcode only ever sets MOVE_RESULT_MISSED
 * (part of MOVE_RESULT_NO_EFFECT) before calling it, or leaves flags
 * untouched, so the branch always resolves to exactly one of these two
 * shapes -- never the type-immunity/failed forms other callers can produce.
 */
function jumpToMissTarget(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
  attacker: BattleScriptBattlerId,
  target: BattleScriptBattlerId,
  rng: BattleScriptRngState,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const targetLabelOperand = context.instruction.operands[0]!;
  const entry = resolveBattleScriptLabel(context.program, targetLabelOperand.expression);
  if (!entry) {
    throw new Error(`accuracycheck: committed program has no label ${targetLabelOperand.expression}`);
  }
  void attacker;
  const withHistory = Object.freeze({
    ...rulesContext,
    moveHistory: withClearedLandedMove(rulesContext.moveHistory, target),
  });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "jump", programCounter: entry.programCounter }),
    { rulesContext: withHistory, rng },
  );
}

/**
 * JumpIfMoveFailed's "not failed" branch: TrySetDestinyBondToHappen
 * (battle_util.c:8285-8294, fully modeled) plus AbilityBattleEffects
 * (ABILITYEFFECT_ABSORBING, ...) -- barriered whenever the target actually
 * holds an ability (ability 0/none is AbilityBattleEffects' only
 * structurally-representable no-op here; every other ability needs the full
 * generated ability-effect switch this engine does not model yet).
 */
function advancePastAccuracyCheck(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
  attacker: BattleScriptBattlerId,
  target: BattleScriptBattlerId,
  rng: BattleScriptRngState,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  if (targetBattler.ability !== 0) {
    return unsupportedBranch(
      context,
      `JumpIfMoveFailed's AbilityBattleEffects(ABILITYEFFECT_ABSORBING) check needs the full `
        + `generated ability-effect switch (target ability ${targetBattler.ability} is not none)`,
      "battle_script_commands.c",
      1020,
    );
  }
  const sideAttacker = attackerBattler.side;
  const sideTarget = targetBattler.side;
  const destinyBond = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND) !== 0
    && sideAttacker !== sideTarget
    && (rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_GRUDGE) === 0;
  const nextRulesContext = destinyBond
    ? withBattler(rulesContext, attacker, {
      status2: (attackerBattler.status2 | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND) >>> 0,
    })
    : rulesContext;
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRulesContext, rng },
  );
}

/** CheckWonderGuardAndLevitate (battle_script_commands.c:1426-1470), miss-only. */
type WonderGuardOutcome = Readonly<{
  lastUsedAbility?: number;
  missType?: number;
  targetNotAffected?: true;
}>;

function checkWonderGuardAndLevitate(
  move: number,
  moveType: string,
  targetBattler: BattleScriptRulesBattlerState,
): WonderGuardOutcome {
  const row = requireMoveRow(move);
  if (move === BATTLE_SCRIPT_MOVE_STRUGGLE || row.power === 0) return Object.freeze({});
  if (targetBattler.ability === ABILITY_LEVITATE && moveType === "TYPE_GROUND") {
    return Object.freeze({ lastUsedAbility: ABILITY_LEVITATE, missType: B_MSG_GROUND_MISS });
  }
  const hasForesight = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0;
  const distinctTypes = targetBattler.types[0] === targetBattler.types[1]
    ? [targetBattler.types[0]]
    : targetBattler.types;
  for (const defendingType of distinctTypes) {
    if (
      hasForesight
      && defendingType === "TYPE_GHOST"
      && (moveType === "TYPE_NORMAL" || moveType === "TYPE_FIGHTING")
    ) {
      continue;
    }
    const entry = TYPE_EFFECTIVENESS.find(
      (candidate) => candidate.attackingType === moveType && candidate.defendingType === defendingType,
    );
    if (entry && entry.multiplierTenths === 0) return Object.freeze({ targetNotAffected: true });
  }
  return Object.freeze({});
}

/**
 * Cmd_accuracycheck (battle_script_commands.c:1099-1189). Only the
 * `ACC_CURR_MOVE` argument form is source-complete: BattleScript_EffectHit
 * and 54 of the program's other 55 accuracycheck sites use it, while the
 * `NO_ACC_CALC`/`NO_ACC_CALC_CHECK_LOCK_ON`/explicit-deferred-move top branch
 * (9 sites, none on the hit chain) is an explicit barrier.
 */
export const accuracycheckOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const moveOperand = context.instruction.operands[1];
  if (!moveOperand || moveOperand.expression !== "ACC_CURR_MOVE") {
    return unsupportedBranch(
      context,
      `Cmd_accuracycheck's non-ACC_CURR_MOVE move argument `
        + `(${moveOperand?.expression ?? "<missing>"}) -- the NO_ACC_CALC/NO_ACC_CALC_CHECK_LOCK_ON/`
        + "explicit-deferred-move top branch is not used by BattleScript_EffectHit's hit chain",
      "battle_script_commands.c",
      1103,
    );
  }

  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const move = rulesContext.currentMove;
  const moveRow = requireMoveRow(move);
  const moveType = resolveMoveTypeName(rulesContext, move);

  if (isDefenderProtected(targetBattler, move)) {
    const withFlags = Object.freeze({
      ...rulesContext,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
      missType: B_MSG_PROTECTED,
    });
    return jumpToMissTarget(context, withFlags, attacker, target, context.state.rng);
  }

  if ((targetBattler.status3 & BATTLE_SCRIPT_STATUS3_ALWAYS_HITS) !== 0) {
    return unsupportedBranch(
      context,
      "AccuracyCalcHelper's STATUS3_ALWAYS_HITS Lock-On/Mind-Reader sure-hit branch needs "
        + "gDisableStructs[target].battlerWithSureHit, which this engine does not model yet",
      "battle_script_commands.c",
      1052,
    );
  }

  let hitMarker = rulesContext.hitMarker;
  if ((hitMarker & BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR) === 0 && (targetBattler.status3 & BATTLE_SCRIPT_STATUS3_ON_AIR) !== 0) {
    const withFlags = Object.freeze({
      ...rulesContext,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
    });
    return jumpToMissTarget(context, withFlags, attacker, target, context.state.rng);
  }
  hitMarker = (hitMarker & ~BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR) >>> 0;
  if ((hitMarker & BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND) === 0 && (targetBattler.status3 & BATTLE_SCRIPT_STATUS3_UNDERGROUND) !== 0) {
    const withFlags = Object.freeze({
      ...rulesContext,
      hitMarker,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
    });
    return jumpToMissTarget(context, withFlags, attacker, target, context.state.rng);
  }
  hitMarker = (hitMarker & ~BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND) >>> 0;
  if ((hitMarker & BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER) === 0 && (targetBattler.status3 & BATTLE_SCRIPT_STATUS3_UNDERWATER) !== 0) {
    const withFlags = Object.freeze({
      ...rulesContext,
      hitMarker,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
    });
    return jumpToMissTarget(context, withFlags, attacker, target, context.state.rng);
  }
  hitMarker = (hitMarker & ~BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER) >>> 0;

  // Rain-boosted Thunder is not representable: no weather state exists
  // anywhere in this engine yet (consistent with damageCalc.ts's documented
  // weather scope), so that disjunct is structurally always false.
  const alwaysHits = moveRow.effect === "EFFECT_ALWAYS_HIT" || moveRow.effect === "EFFECT_VITAL_THROW";
  if (alwaysHits) {
    return advancePastAccuracyCheck(
      context,
      Object.freeze({ ...rulesContext, hitMarker }),
      attacker,
      target,
      context.state.rng,
    );
  }

  if (targetBattler.item === BATTLE_SCRIPT_ITEM_ENIGMA_BERRY) {
    const holdEffectId = resolveBattleScriptBattlerHoldEffect(rulesContext, target);
    if (holdEffectId === HOLD_EFFECT_EVASION_UP_ID) {
      return unsupportedBranch(
        context,
        "the target's Enigma Berry evasion-up holdEffectParam is not modeled (gEnigmaBerries is absent)",
        "battle_script_commands.c",
        1163,
      );
    }
  }
  const holdEffectRow = HOLD_EFFECT_ROW_BY_ITEM.get(targetBattler.item);
  const targetHoldEffect = holdEffectRow?.holdEffect === "HOLD_EFFECT_EVASION_UP"
    ? "HOLD_EFFECT_EVASION_UP"
    : null;
  const targetHoldEffectParam = targetHoldEffect ? holdEffectRow!.holdEffectParam : 0;

  const calc = calculateAccuracy({
    moveAccuracy: moveRow.accuracy,
    attackerAccuracyStage: attackerBattler.statStages[6],
    targetEvasionStage: targetBattler.statStages[7],
    targetHasForesight: (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0,
    attackerAbility: ABILITY_NAME_BY_ID[attackerBattler.ability] ?? null,
    targetAbility: ABILITY_NAME_BY_ID[targetBattler.ability] ?? null,
    isSandstorm: false,
    moveType,
    targetHoldEffect,
    targetHoldEffectParam,
  });

  const { rng, randomValue } = drawBattleScriptRng(context.state.rng, context.instruction, "accuracycheck");
  const hit = rollAccuracyHits(calc, randomValue);
  const rulesContextWithHitMarker = Object.freeze({ ...rulesContext, hitMarker });

  if (hit) {
    return advancePastAccuracyCheck(
      context,
      Object.freeze({ ...rulesContextWithHitMarker }),
      attacker,
      target,
      rng,
    );
  }

  const moveTarget = resolveBattleScriptMoveTarget(move);
  const isDoubleAvoided = (rulesContext.battleTopology.battleTypeFlags & 1) !== 0
    && (moveTarget & BATTLE_SCRIPT_MOVE_TARGET_BOTH) !== 0;
  const wonderGuard = checkWonderGuardAndLevitate(move, moveType, targetBattler);
  let moveResultFlags = (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0;
  let attackerChanges: Partial<BattleScriptRulesBattlerState> = {};
  if (wonderGuard.targetNotAffected) {
    moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE) >>> 0;
    attackerChanges = { targetNotAffected: 1 };
  }
  let withFlags = Object.freeze({
    ...rulesContextWithHitMarker,
    moveResultFlags,
    missType: wonderGuard.missType ?? (isDoubleAvoided ? B_MSG_AVOIDED_ATK : B_MSG_MISSED),
    ...(wonderGuard.lastUsedAbility !== undefined ? { lastUsedAbility: wonderGuard.lastUsedAbility } : {}),
  });
  if (Object.keys(attackerChanges).length > 0) {
    withFlags = withBattler(withFlags, attacker, attackerChanges);
  }
  return jumpToMissTarget(context, withFlags, attacker, target, rng);
};

/**
 * Synthetic STRINGID_USEDMOVE operand: Cmd_attackstring's C body hardcodes
 * this string id rather than reading it from a script operand
 * (battle_script_commands.c:1198), so there is no real assembled operand to
 * reuse -- this stands in for one at the injected prepareMessage port's
 * boundary (only `.expression` is source-meaningful there; see
 * factoryBattleScriptDecision.ts's own port implementation).
 */
const STRINGID_USEDMOVE_OPERAND: BattleScriptOperand = Object.freeze({
  widthBytes: 2,
  expression: "STRINGID_USEDMOVE",
  sourceMacro: "STRINGID_USEDMOVE",
  sourceMacroLine: 1198,
  wrapperPath: Object.freeze([]),
});

/** Cmd_attackstring (battle_script_commands.c:1191-1202). */
export function createAttackstringOpcodeHandler(
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>,
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    const printed = (rulesContext.hitMarker
      & (BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING | BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED)) !== 0;
    if (printed) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: false }) },
      );
    }
    const message = prepareMessage(context, STRINGID_USEDMOVE_OPERAND);
    if (message === null) {
      const reason: BattleScriptBlockReason = Object.freeze({
        kind: "source-context-unavailable",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        port: "prepare-message",
        operandExpression: "STRINGID_USEDMOVE",
      });
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rulesContext,
          hitMarker: (rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED) >>> 0,
        }),
        scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: false }),
        events: Object.freeze([message]),
      },
    );
  };
}

/** Cmd_ppreduce (battle_script_commands.c:1204-1247). */
export const ppreduceOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const move = rulesContext.currentMove;

  let ppToDeduct = 1;
  if (attackerBattler.ppNotAffectedByPressure !== 1) {
    const moveTarget = resolveBattleScriptMoveTarget(move);
    if ((moveTarget & (1 << 5)) !== 0) {
      return unsupportedBranch(
        context,
        "Cmd_ppreduce's MOVE_TARGET_FOES_AND_ALLY AbilityBattleEffects(ABILITYEFFECT_COUNT_ON_FIELD) "
          + "Pressure count needs multi-battler doubles support this engine does not model yet",
        "battle_script_commands.c",
        1215,
      );
    }
    if ((moveTarget & (BATTLE_SCRIPT_MOVE_TARGET_BOTH | (1 << 6))) !== 0) {
      return unsupportedBranch(
        context,
        "Cmd_ppreduce's MOVE_TARGET_BOTH/MOVE_TARGET_OPPONENTS_FIELD "
          + "AbilityBattleEffects(ABILITYEFFECT_COUNT_OTHER_SIDE) Pressure count needs multi-battler "
          + "doubles support this engine does not model yet",
        "battle_script_commands.c",
        1218,
      );
    }
    if (attacker !== target && targetBattler.ability === ABILITY_PRESSURE) {
      ppToDeduct += 1;
    }
  }

  const slot = rulesContext.currentMovePosition;
  const hitMarker = rulesContext.hitMarker;
  const shouldDeduct = (hitMarker & (BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT | BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING)) === 0
    && attackerBattler.pp[slot] !== 0;

  let nextRulesContext = rulesContext;
  let scheduler = context.state.scheduler;
  let events: ReadonlyArray<Readonly<{ kind: "set-battler-pp-data"; battler: BattleScriptBattlerId; movePosition: number; pp: number }>> = [];

  if (shouldDeduct) {
    const currentPp = attackerBattler.pp[slot]!;
    const nextPp = currentPp > ppToDeduct ? currentPp - ppToDeduct : 0;
    const pp = attackerBattler.pp.map((value, index) => (index === slot ? nextPp : value)) as unknown as
      BattleScriptRulesBattlerState["pp"];
    nextRulesContext = withBattler(rulesContext, attacker, { pp });

    const isPermanent = (attackerBattler.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) === 0;
    if (isPermanent) {
      events = Object.freeze([
        Object.freeze({ kind: "set-battler-pp-data" as const, battler: attacker, movePosition: slot, pp: nextPp }),
      ]);
      scheduler = markBattleScriptControllerPending(scheduler, attacker);
    }
  }

  nextRulesContext = Object.freeze({
    ...nextRulesContext,
    hitMarker: (nextRulesContext.hitMarker & ~BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT) >>> 0,
  });

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRulesContext, scheduler, events },
  );
};

/**
 * Cmd_critcalc (battle_script_commands.c:1253-1286): the critChance stage
 * (sCriticalHitChance, :606) plus the roll that sets gCritMultiplier for
 * damagecalc to consume. Battle Armor/Shell Armor/STATUS3_CANT_SCORE_A_CRIT/
 * tutorial-battle immunity short-circuits the source's `&&` chain *before*
 * Random() runs -- immunity consumes zero RNG here, it does not waste a roll.
 */
export const critcalcOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const moveRow = requireMoveRow(rulesContext.currentMove);

  const holdEffectId = resolveBattleScriptBattlerHoldEffect(rulesContext, attacker);
  let critChance = 0;
  if ((attackerBattler.status2 & BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY) !== 0) critChance += 2;
  if (moveRow.effect === "EFFECT_HIGH_CRITICAL") critChance += 1;
  if (moveRow.effect === "EFFECT_SKY_ATTACK") critChance += 1;
  if (moveRow.effect === "EFFECT_BLAZE_KICK") critChance += 1;
  if (moveRow.effect === "EFFECT_POISON_TAIL") critChance += 1;
  if (holdEffectId === HOLD_EFFECT_ID_SCOPE_LENS) critChance += 1;
  if (holdEffectId === HOLD_EFFECT_ID_LUCKY_PUNCH && attackerBattler.species === SPECIES_CHANSEY) critChance += 2;
  if (holdEffectId === HOLD_EFFECT_ID_STICK && attackerBattler.species === SPECIES_FARFETCHD) critChance += 2;
  if (critChance >= CRITICAL_HIT_CHANCE_ONE_IN.length) critChance = CRITICAL_HIT_CHANCE_ONE_IN.length - 1;

  const immune = targetBattler.ability === ABILITY_BATTLE_ARMOR
    || targetBattler.ability === ABILITY_SHELL_ARMOR
    || (attackerBattler.status3 & BATTLE_SCRIPT_STATUS3_CANT_SCORE_A_CRIT) !== 0
    || (rulesContext.battleTopology.battleTypeFlags
      & (BATTLE_SCRIPT_BATTLE_TYPE_WALLY_TUTORIAL | BATTLE_SCRIPT_BATTLE_TYPE_FIRST_BATTLE)) !== 0;

  let isCrit = false;
  let rng = context.state.rng;
  if (!immune) {
    const drawn = drawBattleScriptRng(context.state.rng, context.instruction, "critcalc");
    rng = drawn.rng;
    isCrit = rollIsCriticalHit(critChance, drawn.randomValue);
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: Object.freeze({ ...rulesContext, critMultiplier: isCrit ? 2 : 1 }), rng },
  );
};

function toDamageCalcStatStages(battler: BattleScriptRulesBattlerState) {
  return {
    atk: battler.statStages[1]!,
    def: battler.statStages[2]!,
    spAtk: battler.statStages[4]!,
    spDef: battler.statStages[5]!,
  };
}

/**
 * Cmd_damagecalc (battle_script_commands.c:1288-1301): CalculateBaseDamage
 * (consumed via damageCalc.ts's pinned calculateBaseDamage) times
 * gCritMultiplier (set by critcalc above) times gBattleScripting.dmgMultiplier
 * -- the x2 crit step lives HERE, before Cmd_typecalc's STAB/type scaling, not
 * inside calculateBaseDamage itself (docs/hit-chain-ground-truth.md's crit
 * scenario). gDynamicBasePower (Low Kick/Flail-style power overrides) is 0 for
 * every EFFECT_HIT move so movePower is always gBattleMoves[move].power; side
 * Reflect/Light Screen and double-battle spread scaling are not modeled
 * anywhere in this engine yet (consistent with damageCalc.ts's own documented
 * scope) -- both are structurally always their C default (0/false) since no
 * side-condition or doubles subsystem exists to set them.
 */
export const damagecalcOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const move = rulesContext.currentMove;
  const moveRow = requireMoveRow(move);
  const moveType = resolveMoveTypeName(rulesContext, move);
  const isCriticalHit = rulesContext.critMultiplier === 2;

  let damage = calculateBaseDamage({
    attacker: {
      attack: attackerBattler.attack,
      defense: attackerBattler.defense,
      spAttack: attackerBattler.spAttack,
      spDefense: attackerBattler.spDefense,
      level: attackerBattler.level,
      types: attackerBattler.types,
      statStages: toDamageCalcStatStages(attackerBattler),
      isBurned: (attackerBattler.status1 & STATUS1_BURN) !== 0,
      ability: ABILITY_NAME_BY_ID[attackerBattler.ability] ?? null,
    },
    defender: {
      attack: targetBattler.attack,
      defense: targetBattler.defense,
      spAttack: targetBattler.spAttack,
      spDefense: targetBattler.spDefense,
      level: targetBattler.level,
      types: targetBattler.types,
      statStages: toDamageCalcStatStages(targetBattler),
    },
    movePower: moveRow.power,
    moveType,
    isCriticalHit,
  });

  damage = damage * rulesContext.critMultiplier * rulesContext.dmgMultiplier;
  if ((attackerBattler.status3 & STATUS3_CHARGED_UP) !== 0 && moveType === "TYPE_ELECTRIC") {
    damage *= 2;
  }
  if (attackerBattler.helpingHand === 1) {
    damage = Math.trunc((damage * 15) / 10);
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: Object.freeze({ ...rulesContext, battleMoveDamage: damage }) },
  );
};

/**
 * Cmd_typecalc (battle_script_commands.c:1355-1420): STAB, the Levitate/Ground
 * short-circuit (skips the whole type loop when it fires, distinct from
 * CheckWonderGuardAndLevitate's own copy consumed by RUNG 1's accuracycheck --
 * this is typecalc's independent branch, kept structurally consistent with
 * it), the type-effectiveness loop (ModulateDmgByType's TYPE_MUL_* result-flag
 * toggling), the Foresight-vs-Ghost immunity skip (the source table's single
 * TYPE_FORESIGHT sentinel row, positioned immediately before the Normal/
 * Fighting-vs-Ghost immunity entries at the very end of gTypeEffectiveness --
 * breaking there only ever skips those two entries, nothing earlier in the
 * table), and Wonder Guard's own miss branch. AttacksThisTurn(attacker, move)
 * is always 2 for BattleScript_EffectHit's own typecalc call (HITMARKER_CHARGING
 * is only set during a two-turn move's charging turn, which never reaches this
 * script), so the Wonder Guard branch's `== 2` guard is structurally always
 * true here and is not modeled as a separate condition.
 */
export const typecalcOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const move = rulesContext.currentMove;

  if (move === BATTLE_SCRIPT_MOVE_STRUGGLE) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }

  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const moveRow = requireMoveRow(move);
  const moveType = resolveMoveTypeName(rulesContext, move);

  let damage = applyStab(rulesContext.battleMoveDamage, attackerBattler.types, moveType);
  let moveResultFlags = rulesContext.moveResultFlags;
  let missType = rulesContext.missType;
  let lastUsedAbility = rulesContext.lastUsedAbility;
  let moveHistory = rulesContext.moveHistory;

  if (targetBattler.ability === ABILITY_LEVITATE && moveType === "TYPE_GROUND") {
    lastUsedAbility = ABILITY_LEVITATE;
    moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED | BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE) >>> 0;
    moveHistory = withClearedLandedMove(moveHistory, target);
    missType = B_MSG_GROUND_MISS;
  } else {
    const hasForesight = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0;
    const distinctTypes = targetBattler.types[0] === targetBattler.types[1]
      ? [targetBattler.types[0]]
      : targetBattler.types;
    for (const defType of distinctTypes) {
      if (hasForesight && defType === "TYPE_GHOST" && (moveType === "TYPE_NORMAL" || moveType === "TYPE_FIGHTING")) {
        continue;
      }
      const entry = TYPE_EFFECTIVENESS.find(
        (candidate) => candidate.attackingType === moveType && candidate.defendingType === defType,
      );
      if (!entry) continue;
      damage = Math.trunc((damage * entry.multiplierTenths) / 10);
      if (damage === 0 && entry.multiplierTenths !== 0) damage = 1;
      if (entry.multiplierTenths === 0) {
        moveResultFlags = (moveResultFlags
          | BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE)
          & ~BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE
          & ~BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE;
        moveResultFlags = moveResultFlags >>> 0;
      } else if (entry.multiplierTenths === 5) {
        if (moveRow.power !== 0 && (moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0) {
          if ((moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE) !== 0) {
            moveResultFlags = (moveResultFlags & ~BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE) >>> 0;
          } else {
            moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE) >>> 0;
          }
        }
      } else if (entry.multiplierTenths === 20) {
        if (moveRow.power !== 0 && (moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0) {
          if ((moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE) !== 0) {
            moveResultFlags = (moveResultFlags & ~BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE) >>> 0;
          } else {
            moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE) >>> 0;
          }
        }
      }
    }
  }

  if (
    targetBattler.ability === ABILITY_WONDER_GUARD
    && moveRow.power !== 0
    && (
      (moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE) === 0
      || (moveResultFlags & (BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE | BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE))
        === (BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE | BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE)
    )
  ) {
    lastUsedAbility = ABILITY_WONDER_GUARD;
    moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0;
    moveHistory = withClearedLandedMove(moveHistory, target);
    missType = B_MSG_AVOIDED_DMG;
  }

  let nextRulesContext = Object.freeze({
    ...rulesContext,
    battleMoveDamage: damage,
    moveResultFlags,
    missType,
    lastUsedAbility,
    moveHistory,
  });
  if ((moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE) !== 0) {
    nextRulesContext = withBattler(nextRulesContext, attacker, { targetNotAffected: 1 });
  }

  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
};

/**
 * Cmd_adjustnormaldamage (battle_script_commands.c:1658-1698): the always-run
 * ApplyRandomDmgMultiplier roll, then the False Swipe/Endure/Focus-Band HP
 * clamp. Focus Band's own roll (`Random() % 100 < param`, gated on the target
 * actually holding it) needs gSpecialStatuses[target].focusBanded, which this
 * engine does not model -- barriered, but ONLY when the target's resolved
 * holdEffect is actually Focus Band, never on the plain (no-item or
 * different-item) path, which is fully implemented per source.
 */
export const adjustnormaldamageOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const target = requireBattlerRole(rulesContext, "target");
  const targetBattler = rulesContext.battlers[target];

  const { rng, randomValue } = drawBattleScriptRng(context.state.rng, context.instruction, "adjustnormaldamage");
  let damage = applyRandomDamageMultiplier(rulesContext.battleMoveDamage, randomValue);

  const holdEffectId = resolveBattleScriptBattlerHoldEffect(rulesContext, target);
  if (holdEffectId === HOLD_EFFECT_ID_FOCUS_BAND) {
    return unsupportedBranch(
      context,
      "Cmd_adjustnormaldamage's HOLD_EFFECT_FOCUS_BAND roll needs gSpecialStatuses[target].focusBanded, "
        + "which this engine does not model yet",
      "battle_script_commands.c",
      1677,
    );
  }

  const moveRow = requireMoveRow(rulesContext.currentMove);
  const hasSubstitute = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0;
  const shouldClamp = !hasSubstitute
    && (moveRow.effect === "EFFECT_FALSE_SWIPE" || targetBattler.endured === 1)
    && targetBattler.hp <= damage;

  let moveResultFlags = rulesContext.moveResultFlags;
  if (shouldClamp) {
    damage = targetBattler.hp - 1;
    if (targetBattler.endured === 1) {
      moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED) >>> 0;
    }
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: Object.freeze({ ...rulesContext, battleMoveDamage: damage, moveResultFlags }), rng },
  );
};

/**
 * Cmd_attackanimation (battle_script_commands.c:1743-1799). MOVE_TRANSFORM/
 * MOVE_SUBSTITUTE never reach BattleScript_EffectHit's own hit chain (each
 * has its own dedicated effect script), so the HITMARKER_NO_ANIMATIONS
 * branch's move-id exclusion is structurally always true here -- only the
 * hitMarker bit itself gates it. animTurn/animTargetsHit are the already
 * source-shaped gBattleScripting counters (battleScriptSetByte.ts).
 */
function createAttackanimationOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;

    if ((rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0) {
      const pausex20 = resolveBattleScriptLabel(context.program, "BattleScript_Pausex20");
      if (!pausex20) throw new Error("attackanimation: committed program has no label BattleScript_Pausex20");
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter: pausex20.programCounter }),
        {
          rulesContext: Object.freeze({
            ...rulesContext,
            animTurn: (rulesContext.animTurn + 1) & 0xff,
            animTargetsHit: (rulesContext.animTargetsHit + 1) & 0xff,
          }),
        },
      );
    }

    const move = rulesContext.currentMove;
    const moveTarget = resolveBattleScriptMoveTarget(move);
    const isSpreadMove =
      (moveTarget & (BATTLE_SCRIPT_MOVE_TARGET_BOTH | MOVE_TARGET_FOES_AND_ALLY | MOVE_TARGET_DEPENDS)) !== 0;
    if (isSpreadMove && rulesContext.animTargetsHit !== 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }

    if ((rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
      const pausex20 = resolveBattleScriptLabel(context.program, "BattleScript_Pausex20");
      if (!pausex20) throw new Error("attackanimation: committed program has no label BattleScript_Pausex20");
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "call", programCounter: pausex20.programCounter }));
    }

    const attacker = requireBattlerRole(rulesContext, "attacker");
    const target = requireBattlerRole(rulesContext, "target");
    const attackerBattler = rulesContext.battlers[attacker];
    const targetBattler = rulesContext.battlers[target];
    const moveRow = requireMoveRow(move);

    let multihit: number;
    if ((targetBattler.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0) {
      multihit = rulesContext.multiHitCounter;
    } else if (rulesContext.multiHitCounter !== 0 && rulesContext.multiHitCounter !== 1) {
      multihit = targetBattler.hp <= rulesContext.battleMoveDamage ? 1 : rulesContext.multiHitCounter;
    } else {
      multihit = rulesContext.multiHitCounter;
    }

    const scheduler = markBattleScriptControllerPending(context.state.scheduler, attacker);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rulesContext,
          animTurn: (rulesContext.animTurn + 1) & 0xff,
          animTargetsHit: (rulesContext.animTargetsHit + 1) & 0xff,
        }),
        scheduler,
        events: Object.freeze([
          Object.freeze({
            kind: "animation" as const,
            animationId: "MOVE_ANIMATION",
            battler: attacker,
            arguments: Object.freeze([
              String(move),
              String(rulesContext.animTurn),
              String(moveRow.power),
              String(rulesContext.battleMoveDamage),
              String(attackerBattler.friendship),
              String(multihit),
            ]),
          }),
        ]),
      },
    );
  };
}

/** Cmd_effectivenesssound (battle_script_commands.c:2001-2046), always gBattlerTarget. */
function createEffectivenesssoundOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    const target = requireBattlerRole(rulesContext, "target");
    const flags = rulesContext.moveResultFlags;

    let songId: number | null = null;
    if ((flags & BATTLE_SCRIPT_MOVE_RESULT_MISSED) === 0) {
      const resultBits = (flags & ~BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0;
      if (resultBits === MOVE_RESULT_SUPER_EFFECTIVE) {
        songId = SE_SUPER_EFFECTIVE;
      } else if (resultBits === MOVE_RESULT_NOT_VERY_EFFECTIVE) {
        songId = SE_NOT_EFFECTIVE;
      } else if (resultBits === MOVE_RESULT_DOESNT_AFFECT_FOE || resultBits === BATTLE_SCRIPT_MOVE_RESULT_FAILED) {
        songId = null;
      } else if ((resultBits & MOVE_RESULT_SUPER_EFFECTIVE) !== 0) {
        songId = SE_SUPER_EFFECTIVE;
      } else if ((resultBits & MOVE_RESULT_NOT_VERY_EFFECTIVE) !== 0) {
        songId = SE_NOT_EFFECTIVE;
      } else if ((resultBits & (MOVE_RESULT_DOESNT_AFFECT_FOE | BATTLE_SCRIPT_MOVE_RESULT_FAILED)) === 0) {
        songId = SE_EFFECTIVE;
      }
    }

    if (songId === null) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, target);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { scheduler, events: Object.freeze([Object.freeze({ kind: "play-se" as const, battler: target, songId })]) },
    );
  };
}

/**
 * Cmd_hitanimation (battle_script_commands.c:5558-5576). Unlike its siblings
 * this opcode has no gBattleControllerExecFlags busy check at all -- it
 * always advances the same execution, matching the source exactly.
 */
export const hitanimationOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rulesContext = context.state.rulesContext;
  const resolved = resolveHitChainBattlerOperand(context, rulesContext);
  if (resolved === "unsupported") {
    return unsupportedBranch(
      context,
      `Cmd_hitanimation's GetBattlerForBattleScript selector `
        + `(${context.instruction.operands[0]?.expression ?? "<missing>"}) is not BS_TARGET/BS_ATTACKER`,
      "battle_script_commands.c",
      5560,
    );
  }
  const battler = resolved;
  const battlerState = rulesContext.battlers[battler];

  if ((rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }
  const substituteActive = (battlerState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0 && battlerState.substituteHP !== 0;
  const suppressedBySubstitute = (rulesContext.hitMarker & HITMARKER_IGNORE_SUBSTITUTE) !== 0 && substituteActive;
  if (suppressedBySubstitute) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }
  const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      scheduler,
      events: Object.freeze([
        Object.freeze({ kind: "animation" as const, animationId: "HIT_ANIMATION", battler, arguments: Object.freeze([]) }),
      ]),
    },
  );
};

/** Cmd_healthbarupdate (battle_script_commands.c:1807-1841). */
function createHealthbarupdateOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    if ((rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const resolved = resolveHitChainBattlerOperand(context, rulesContext);
    if (resolved === "unsupported") {
      return unsupportedBranch(
        context,
        `Cmd_healthbarupdate's GetBattlerForBattleScript selector `
          + `(${context.instruction.operands[0]?.expression ?? "<missing>"}) is not BS_TARGET/BS_ATTACKER`,
        "battle_script_commands.c",
        1814,
      );
    }
    const battler = resolved;
    const battlerState = rulesContext.battlers[battler];
    const substituteActive = (battlerState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0
      && battlerState.substituteHP !== 0
      && (rulesContext.hitMarker & HITMARKER_IGNORE_SUBSTITUTE) === 0;

    if (substituteActive) {
      const message = prepareMessage(context, stringOperand("STRINGID_SUBSTITUTEDAMAGED", 1818));
      if (message === null) return blockOnUnavailableMessage(context, "STRINGID_SUBSTITUTEDAMAGED");
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { events: Object.freeze([message]) });
    }

    const healthValue = Math.min(rulesContext.battleMoveDamage, 10000);
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { scheduler, events: Object.freeze([Object.freeze({ kind: "health-bar-update" as const, battler, healthValue })]) },
    );
  };
}

/**
 * Cmd_datahpupdate (battle_script_commands.c:1844-1986): the hit chain's real
 * HP mutation. Substitute-active damages the substitute instead (gHpDealt
 * bookkeeping matches source); the substitute-FADES sub-case
 * (BattleScriptPushCursor to BattleScript_SubstituteFade, an unrelated
 * cutscene subsystem) is barriered, gated strictly on the substitute's HP
 * actually reaching zero this hit. Negative damage (HP gain) is barriered --
 * it needs gBattleMons[battler].maxHP, unmodeled anywhere in this engine, and
 * is structurally unreachable from BattleScript_EffectHit's own EFFECT_HIT
 * moves regardless. Physical/special bookkeeping reuses the already-modeled
 * gSpecialStatuses[battler].{physicalDmg,specialDmg} fields (added for
 * Cmd_moveend); gProtectStructs' parallel copy and physicalBattlerId/
 * specialBattlerId (Counter/Mirror Coat's own attacker attribution) have no
 * reader anywhere in this engine's currently modeled scope and are not
 * tracked, matching the shellBellDmg/gBideDmg-via-gBattleScripting omissions
 * elsewhere in this rung.
 */
function createDatahpupdateOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;

    if ((rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }

    const resolved = resolveHitChainBattlerOperand(context, rulesContext);
    if (resolved === "unsupported") {
      return unsupportedBranch(
        context,
        `Cmd_datahpupdate's GetBattlerForBattleScript selector `
          + `(${context.instruction.operands[0]?.expression ?? "<missing>"}) is not BS_TARGET/BS_ATTACKER`,
        "battle_script_commands.c",
        1864,
      );
    }
    const battler = resolved;
    const isTargetOperand = context.instruction.operands[0]!.expression === "BS_TARGET";
    const battlerState = rulesContext.battlers[battler];
    const damage = rulesContext.battleMoveDamage;

    const substituteActive = (battlerState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0
      && battlerState.substituteHP !== 0
      && (rulesContext.hitMarker & HITMARKER_IGNORE_SUBSTITUTE) === 0;

    if (substituteActive) {
      const remaining = battlerState.substituteHP;
      if (remaining >= damage) {
        const nextRulesContext = withBattler(rulesContext, battler, { substituteHP: remaining - damage });
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "advance" }),
          { rulesContext: Object.freeze({ ...nextRulesContext, hpDealt: damage }) },
        );
      }
      return unsupportedBranch(
        context,
        "Cmd_datahpupdate's substitute-faints branch (BattleScriptPushCursor to "
          + "BattleScript_SubstituteFade, the fade cutscene) is not modeled",
        "battle_script_commands.c",
        1889,
      );
    }

    if (damage < 0) {
      return unsupportedBranch(
        context,
        "Cmd_datahpupdate's negative-damage (HP gain) branch needs gBattleMons[battler].maxHP, "
          + "which this engine does not model yet",
        "battle_script_commands.c",
        1899,
      );
    }

    let hitMarker = rulesContext.hitMarker;
    const ignoreBide = (hitMarker & HITMARKER_IGNORE_BIDE) !== 0;
    if (ignoreBide) {
      hitMarker = (hitMarker & ~HITMARKER_IGNORE_BIDE) >>> 0;
    }
    let bideDmg = rulesContext.bideDmg;
    let bideTarget = rulesContext.bideTarget;
    if (!ignoreBide) {
      bideDmg = bideDmg.map((value, index) => (index === battler ? value + damage : value)) as unknown as typeof bideDmg;
      const bideSource = isTargetOperand
        ? requireBattlerRole(rulesContext, "attacker")
        : requireBattlerRole(rulesContext, "target");
      bideTarget = bideTarget.map((value, index) => (index === battler ? bideSource : value)) as unknown as
        typeof bideTarget;
    }

    const currentHp = battlerState.hp;
    const dealt = currentHp > damage ? damage : currentHp;
    const nextHp = currentHp > damage ? currentHp - damage : 0;

    const noPassiveUpdate = (hitMarker & HITMARKER_PASSIVE_HP_UPDATE) === 0;
    let battlerChanges: Partial<BattleScriptRulesBattlerState> = { hp: nextHp };
    if (noPassiveUpdate) {
      const moveType = resolveMoveTypeName(rulesContext, rulesContext.currentMove);
      const physical = isTypePhysical(moveType);
      battlerChanges = {
        ...battlerChanges,
        specialStatus: physical
          ? Object.freeze({ ...battlerState.specialStatus, physicalDmg: dealt })
          : Object.freeze({ ...battlerState.specialStatus, specialDmg: dealt }),
      };
    }
    hitMarker = (hitMarker & ~HITMARKER_PASSIVE_HP_UPDATE) >>> 0;

    const nextRulesContext = withBattler(
      Object.freeze({ ...rulesContext, hitMarker, hpDealt: dealt, bideDmg, bideTarget }),
      battler,
      battlerChanges,
    );

    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: nextRulesContext,
        scheduler,
        events: Object.freeze([Object.freeze({ kind: "hp-change" as const, battler, from: currentHp, to: nextHp })]),
      },
    );
  };
}

/** Cmd_critmessage (battle_script_commands.c:1988-1999). */
function createCritmessageOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    const shouldPrint = rulesContext.critMultiplier === 2
      && (rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0;
    if (!shouldPrint) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const message = prepareMessage(context, stringOperand("STRINGID_CRITICALHIT", 1994));
    if (message === null) return blockOnUnavailableMessage(context, "STRINGID_CRITICALHIT");
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: true }), events: Object.freeze([message]) },
    );
  };
}

type ResultMessageOutcome =
  | Readonly<{ kind: "string"; stringId: string }>
  | Readonly<{ kind: "jump"; label: string; clearMask: number }>
  | Readonly<{ kind: "barrier"; construct: string; sourceLine: number }>
  | Readonly<{ kind: "none" }>;

/**
 * Cmd_resultmessage's stringId selection (battle_script_commands.c:2063-2128):
 * a switch on exact single-flag values, falling to a default if-chain of bit
 * tests when the flags don't exactly match one case (both phases modeled
 * here, in the source's own priority order). MOVE_RESULT_ONE_HIT_KO and
 * MOVE_RESULT_FOE_HUNG_ON are barriered -- both subsystems (BattleScript_
 * OneHitKOMsg's OHKO handling, BattleScript_FocusBandActivates' gLastUsedItem/
 * gPotentialItemEffectBattler) are unmodeled anywhere in this engine, gated
 * strictly on the corresponding flag bit actually being set.
 */
function classifyResultMessage(resultBits: number): ResultMessageOutcome {
  switch (resultBits) {
    case MOVE_RESULT_SUPER_EFFECTIVE:
      return Object.freeze({ kind: "string", stringId: "STRINGID_SUPEREFFECTIVE" });
    case MOVE_RESULT_NOT_VERY_EFFECTIVE:
      return Object.freeze({ kind: "string", stringId: "STRINGID_NOTVERYEFFECTIVE" });
    case MOVE_RESULT_ONE_HIT_KO:
      return Object.freeze({
        kind: "barrier",
        construct: "MOVE_RESULT_ONE_HIT_KO (STRINGID_ONEHITKO print path, OHKO subsystem unmodeled)",
        sourceLine: 2071,
      });
    case MOVE_RESULT_FOE_ENDURED:
      return Object.freeze({ kind: "string", stringId: "STRINGID_PKMNENDUREDHIT" });
    case BATTLE_SCRIPT_MOVE_RESULT_FAILED:
      return Object.freeze({ kind: "string", stringId: "STRINGID_BUTITFAILED" });
    case MOVE_RESULT_DOESNT_AFFECT_FOE:
      return Object.freeze({ kind: "string", stringId: "STRINGID_ITDOESNTAFFECT" });
    case MOVE_RESULT_FOE_HUNG_ON:
      return Object.freeze({
        kind: "barrier",
        construct: "MOVE_RESULT_FOE_HUNG_ON (BattleScript_FocusBandActivates, Focus Band subsystem unmodeled)",
        sourceLine: 2083,
      });
    default:
      if ((resultBits & MOVE_RESULT_DOESNT_AFFECT_FOE) !== 0) {
        return Object.freeze({ kind: "string", stringId: "STRINGID_ITDOESNTAFFECT" });
      }
      if ((resultBits & MOVE_RESULT_ONE_HIT_KO) !== 0) {
        return Object.freeze({
          kind: "barrier",
          construct: "combined MOVE_RESULT_ONE_HIT_KO (BattleScript_OneHitKOMsg, OHKO subsystem unmodeled)",
          sourceLine: 2095,
        });
      }
      if ((resultBits & MOVE_RESULT_FOE_ENDURED) !== 0) {
        return Object.freeze({
          kind: "jump",
          label: "BattleScript_EnduredMsg",
          clearMask: (MOVE_RESULT_FOE_ENDURED | MOVE_RESULT_FOE_HUNG_ON) >>> 0,
        });
      }
      if ((resultBits & MOVE_RESULT_FOE_HUNG_ON) !== 0) {
        return Object.freeze({
          kind: "barrier",
          construct: "combined MOVE_RESULT_FOE_HUNG_ON (BattleScript_FocusBandActivates, Focus Band subsystem unmodeled)",
          sourceLine: 2111,
        });
      }
      if ((resultBits & BATTLE_SCRIPT_MOVE_RESULT_FAILED) !== 0) {
        return Object.freeze({ kind: "string", stringId: "STRINGID_BUTITFAILED" });
      }
      return Object.freeze({ kind: "none" });
  }
}

/**
 * Cmd_resultmessage (battle_script_commands.c:2048-2135). The FOE_ENDURED
 * combo jump uses BattleScriptPushCursor (call-current, resume AT this same
 * instruction) -- BattleScript_EnduredMsg's own `return` re-enters
 * resultmessage with the ENDURED/HUNG_ON bits already cleared, so a combo
 * like SUPER_EFFECTIVE|FOE_ENDURED correctly prints the endured message first
 * and then re-evaluates to STRINGID_SUPEREFFECTIVE on re-entry, exactly like
 * the source.
 */
function createResultmessageOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    const flags = rulesContext.moveResultFlags;
    const missed = (flags & BATTLE_SCRIPT_MOVE_RESULT_MISSED) !== 0;
    const showMiss = missed
      && ((flags & MOVE_RESULT_DOESNT_AFFECT_FOE) === 0 || rulesContext.missType > B_MSG_AVOIDED_ATK);

    if (showMiss) {
      const stringId = MISS_STRING_ID_BY_TYPE[rulesContext.missType];
      if (!stringId) throw new Error(`resultmessage: missType ${rulesContext.missType} has no gMissStringIds entry`);
      const message = prepareMessage(context, stringOperand(stringId, 2057));
      if (message === null) return blockOnUnavailableMessage(context, stringId);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: true }), events: Object.freeze([message]) },
      );
    }

    const resultBits = (flags & ~BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0;
    const outcome = classifyResultMessage(resultBits);

    if (outcome.kind === "barrier") {
      return unsupportedBranch(context, `Cmd_resultmessage's ${outcome.construct}`, "battle_script_commands.c", outcome.sourceLine);
    }
    if (outcome.kind === "jump") {
      const target = resolveBattleScriptLabel(context.program, outcome.label);
      if (!target) throw new Error(`resultmessage: committed program has no label ${outcome.label}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call-current", programCounter: target.programCounter }),
        { rulesContext: Object.freeze({ ...rulesContext, moveResultFlags: (flags & ~outcome.clearMask) >>> 0 }) },
      );
    }
    if (outcome.kind === "none") {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: false }) },
      );
    }
    const message = prepareMessage(context, stringOperand(outcome.stringId, 2131));
    if (message === null) return blockOnUnavailableMessage(context, outcome.stringId);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: true }), events: Object.freeze([message]) },
    );
  };
}

export type BattleScriptHitChainPorts = Readonly<{
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>;
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>;
}>;

export function createBattleScriptHitChainOpcodeHandlers(
  program: BattleScriptProgram,
  ports: BattleScriptHitChainPorts,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>> = Object.create(null) as Record<
    number,
    BattleScriptOpcodeHandler<BattleScriptRulesContext>
  >;
  const install = (opcodeName: string, handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>) => {
    const instruction = program.instructions.find((candidate) => candidate.opcodeName === opcodeName);
    if (!instruction) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
    handlers[instruction.opcodeId] = handler;
  };
  install("B_SCR_OP_ACCURACYCHECK", accuracycheckOpcodeHandler);
  install("B_SCR_OP_ATTACKSTRING", createAttackstringOpcodeHandler(ports.prepareMessage, ports.isControllerIdle));
  install("B_SCR_OP_PPREDUCE", ppreduceOpcodeHandler);
  install("B_SCR_OP_CRITCALC", critcalcOpcodeHandler);
  install("B_SCR_OP_DAMAGECALC", damagecalcOpcodeHandler);
  install("B_SCR_OP_TYPECALC", typecalcOpcodeHandler);
  install("B_SCR_OP_ADJUSTNORMALDAMAGE", adjustnormaldamageOpcodeHandler);
  install("B_SCR_OP_ATTACKANIMATION", createAttackanimationOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_EFFECTIVENESSSOUND", createEffectivenesssoundOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_HITANIMATION", hitanimationOpcodeHandler);
  install("B_SCR_OP_HEALTHBARUPDATE", createHealthbarupdateOpcodeHandler(ports.isControllerIdle, ports.prepareMessage));
  install("B_SCR_OP_DATAHPUPDATE", createDatahpupdateOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_CRITMESSAGE", createCritmessageOpcodeHandler(ports.isControllerIdle, ports.prepareMessage));
  install("B_SCR_OP_RESULTMESSAGE", createResultmessageOpcodeHandler(ports.isControllerIdle, ports.prepareMessage));
  return Object.freeze(handlers);
}
