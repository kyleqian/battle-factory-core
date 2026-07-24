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
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_MOVE_TARGET_BOTH,
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
  BATTLE_SCRIPT_HITMARKER_GRUDGE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_STATUS2_FORESIGHT,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
  BATTLE_SCRIPT_STATUS3_ALWAYS_HITS,
  BATTLE_SCRIPT_STATUS3_ON_AIR,
  BATTLE_SCRIPT_STATUS3_UNDERGROUND,
  BATTLE_SCRIPT_STATUS3_UNDERWATER,
} from "./battleScriptSourceConstants.ts";
import {
  calculateAccuracy,
  rollAccuracyHits,
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

const ABILITY_LEVITATE = 26;
const ABILITY_PRESSURE = 46;
const ABILITY_NAME_BY_ID: Readonly<Record<number, string>> = Object.freeze({
  8: "ABILITY_SAND_VEIL",
  14: "ABILITY_COMPOUND_EYES",
  55: "ABILITY_HUSTLE",
});

const B_MSG_MISSED = 0;
const B_MSG_PROTECTED = 1;
const B_MSG_AVOIDED_ATK = 2;
const B_MSG_GROUND_MISS = 4;

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
  return Object.freeze(handlers);
}
