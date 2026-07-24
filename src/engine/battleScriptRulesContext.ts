import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  acknowledgeBattleScriptController,
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  isBattleScriptBattlerId,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
  type BattleScriptSchedulerState,
} from "./battleScriptMachine.ts";
import type { BattleScriptOperand, BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  createBattleScriptMoveValuesCommandHandlers,
  type BattleScriptMoveValuesRulesContext,
} from "./battleScriptMoveValuesCommands.ts";
import {
  createBattleScriptSetByteCommandHandlers,
  type BattleScriptSetByteRulesContext,
} from "./battleScriptSetByte.ts";
import {
  createBattleScriptRuleCommandHandlers,
  type BattleScriptByteResolverPort,
} from "./battleScriptRuleCommands.ts";
import {
  createBattleScriptSourceCommandHandlers,
  type BattleScriptSourceCommandPorts,
  type BattleScriptStatusAnimationPreparation,
  type BattleScriptStatusAnimationPreparationPort,
} from "./battleScriptSourceCommands.ts";
import {
  BATTLE_SCRIPT_BATTLER_SELECTORS,
  BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "./battleScriptSourceConstants.ts";
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };
import itemHoldEffectsData from "../data/gen/item-hold-effects.json" with { type: "json" };
import movesData from "../data/gen/moves.json" with { type: "json" };

export const BATTLE_SCRIPT_NUM_BATTLE_STATS = 8;
export const BATTLE_SCRIPT_ITEM_ENIGMA_BERRY = 175;
export const BATTLE_SCRIPT_DYNAMIC_TYPE_MASK = 0x3f;
export const BATTLE_SCRIPT_HOLD_EFFECT_CHOICE_BAND = 29;
export const BATTLE_SCRIPT_MOVE_NONE = 0;
export const BATTLE_SCRIPT_MOVE_STRUGGLE = 165;
export const BATTLE_SCRIPT_MOVE_BATON_PASS = 226;
export const BATTLE_SCRIPT_MOVE_UNAVAILABLE = 0xffff;
export const BATTLE_SCRIPT_HITMARKER_OBEYS = 1 << 25;
export const BATTLE_SCRIPT_MOVE_RESULT_FAILED = 1 << 5;
const BATTLE_SCRIPT_ITEMS_COUNT = itemHoldEffectsData.itemsCount;

export type BattleScriptStatStages = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type BattleScriptSpecialStatus = Readonly<{
  restoredBattlerSprite: 0 | 1;
  physicalDmg: number;
  specialDmg: number;
}>;

type BattleScriptRulesBattlerBase = Readonly<{
  side: 0 | 1;
  ability: number;
  hp: number;
  moves: readonly [number, number, number, number];
  pp: readonly [number, number, number, number];
  status1: number;
  status2: number;
  status3: number;
  substituteHP: number;
  rolloutTimer: number;
  furyCutterCounter: number;
  truantCounter: 0 | 1;
  rechargeTimer: number;
  flinchImmobility: 0 | 1;
  disabledMove: number;
  usedDisabledMove: 0 | 1;
  tauntTimer: number;
  usedTauntedMove: 0 | 1;
  usedImprisonedMove: 0 | 1;
  /** ProtectStruct::bounceMove; absent legacy inputs normalize to zero at read sites. */
  bounceMove?: 0 | 1;
  /** ProtectStruct::confusionSelfDmg; absent legacy inputs normalize to zero. */
  confusionSelfDmg?: 0 | 1;
  /** ProtectStruct::prlzImmobility; absent legacy inputs normalize to zero. */
  prlzImmobility?: 0 | 1;
  /** ProtectStruct::loveImmobility; absent legacy inputs normalize to zero. */
  loveImmobility?: 0 | 1;
  /**
   * The already source-modified physical operands consumed by
   * CalculateBaseDamage's MOVE_POUND/powerOverride=40 confusion call.
   * Optional because non-self-hit branches never read these fields.
   */
  confusionDamage?: Readonly<{
    level: number;
    attack: number;
    defense: number;
    attackStage: number;
    defenseStage: number;
    isBurned: boolean;
    hasGuts: boolean;
  }>;
}>;

type BattleScriptMoveEndBattlerMetadata = Readonly<{
  /** Source u16 gBattleMons[battler].item. */
  item: number;
  /** Source s8 gBattleMons[battler].statStages[NUM_BATTLE_STATS]. */
  statStages: BattleScriptStatStages;
  /** Source gSpecialStatuses[battler] fields required by Cmd_moveend. */
  specialStatus: BattleScriptSpecialStatus;
  /** ProtectStruct::chargingTurn. */
  chargingTurn: 0 | 1;
}>;

/**
 * Construction input. Legacy focused fixtures may omit only the newly added
 * move-end metadata; createBattleScriptRulesContext materializes it once.
 */
export type BattleScriptRulesBattler = BattleScriptRulesBattlerBase & Readonly<{
  /**
   * Older focused fixtures normalize absent move-end metadata at this single
   * construction boundary. Production constructors supply source values.
   */
  item?: number;
  statStages?: readonly number[];
  specialStatus?: Readonly<{
    restoredBattlerSprite?: 0 | 1;
    physicalDmg?: number;
    specialDmg?: number;
  }>;
  chargingTurn?: 0 | 1;
}>;

export type BattleScriptRulesBattlerState =
  BattleScriptRulesBattlerBase & BattleScriptMoveEndBattlerMetadata;

export type BattleScriptRulesBattlers = readonly [
  BattleScriptRulesBattlerState,
  BattleScriptRulesBattlerState,
  BattleScriptRulesBattlerState,
  BattleScriptRulesBattlerState,
];

export type BattleScriptSelectorRoleBindings = Readonly<{
  attacker: BattleScriptBattlerId | null;
  target: BattleScriptBattlerId | null;
  effectBattler: BattleScriptBattlerId | null;
}>;

export type BattleScriptBideDamageByBattler = readonly [
  number,
  number,
  number,
  number,
];

export type BattleScriptBideTargetByBattler = readonly [
  BattleScriptBattlerId,
  BattleScriptBattlerId,
  BattleScriptBattlerId,
  BattleScriptBattlerId,
];

export type BattleScriptMoveEndHalfwords = readonly [
  number,
  number,
  number,
  number,
];

export type BattleScriptMoveEndBytes = readonly [
  number,
  number,
  number,
  number,
];

/**
 * First durable source-shaped Battle Script rules slice.
 *
 * The four indexed battlers mirror the source's MAX_BATTLERS_COUNT arrays.
 * The scalar move-value fields are exactly the u8/u32 globals mutated by
 * MoveValuesCleanUp. The selector bindings cover only roles observed at
 * opcodes 100-102. Null means the surrounding action has not supplied that
 * source role.
 */
export type BattleScriptRulesContext = Readonly<
  BattleScriptMoveValuesRulesContext & BattleScriptSetByteRulesContext & {
    battlers: BattleScriptRulesBattlers;
    selectorRoles: BattleScriptSelectorRoleBindings;
    scriptingBattler: BattleScriptBattlerId;
    atkCancelerTracker: number;
    battleOutcome: number;
    currentMove: number;
    currentMoveEffect: number;
    currentMovePower: number;
    currentMovePosition: number;
    /** Source u8 gLastUsedAbility. */
    lastUsedAbility: number;
    multiHitCounter: number;
    multistringChooser: number;
    battleMoveDamage: number;
    /** Source s32 gBideDmg[MAX_BATTLERS_COUNT]. */
    bideDmg: BattleScriptBideDamageByBattler;
    /** Source u8 gBideTarget[MAX_BATTLERS_COUNT], validated to battler ids. */
    bideTarget: BattleScriptBideTargetByBattler;
    /** Source s32 gBattleScripting.bideDmg. */
    scriptingBideDmg: number;
    /** Source u8 gAbsentBattlerFlags, limited to the four battler bits. */
    absentBattlerFlags: number;
    /** Source u16 gChosenMove, distinct from gCurrentMove. */
    chosenMove: number;
    /** Source u16 gBattleStruct->choicedMove[MAX_BATTLERS_COUNT]. */
    choicedMove: BattleScriptMoveEndHalfwords;
    /** Source u16 gBattleStruct->changedItems[MAX_BATTLERS_COUNT]. */
    changedItems: BattleScriptMoveEndHalfwords;
    /** Source u8 gBattleStruct->absentBattlerFlags, separate from the global mask. */
    battleStructAbsentBattlerFlags: number;
    /** Source u8 gBattleStruct->dynamicMoveType. */
    dynamicMoveType: number;
    /** Source u8 gEnigmaBerries[MAX_BATTLERS_COUNT].holdEffect values. */
    enigmaBerryHoldEffects: BattleScriptMoveEndBytes;
  }
>;

export type BattleScriptRulesContextInput = Readonly<{
  battlers: readonly BattleScriptRulesBattler[];
  selectorRoles?: Readonly<{
    attacker?: BattleScriptBattlerId | null;
    target?: BattleScriptBattlerId | null;
    effectBattler?: BattleScriptBattlerId | null;
  }>;
  scriptingBattler: BattleScriptBattlerId;
  atkCancelerTracker: number;
  battleOutcome: number;
  currentMove: number;
  currentMovePosition: number;
  lastUsedAbility?: number;
  moveResultFlags: number;
  dmgMultiplier: number;
  critMultiplier: number;
  moveEffectByte: number;
  missType: number;
  hitMarker: number;
  multiHitCounter: number;
  multistringChooser?: number;
  battleMoveDamage?: number;
  bideDmg?: readonly number[];
  bideTarget?: readonly BattleScriptBattlerId[];
  scriptingBideDmg?: number;
  absentBattlerFlags?: number;
  chosenMove?: number;
  choicedMove?: readonly number[];
  changedItems?: readonly number[];
  battleStructAbsentBattlerFlags?: number;
  dynamicMoveType?: number;
  enigmaBerryHoldEffects?: readonly number[];
  battleCommunication0?: number;
  battleCommunication1?: number;
  animTargetsHit?: number;
  animTurn?: number;
  giveExpState?: number;
  learnMoveState?: number;
  lvlBoxState?: number;
  moveendState?: number;
  multiHitEffect?: number;
  statChanger?: number;
  statAnimPlayed?: number;
  tripleKickPower?: number;
  twoTurnStringId?: number;
}>;

function requireUnsigned(value: number, maximum: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${field} must be an unsigned integer <= ${maximum}, got ${value}`);
  }
  return value;
}

function requireSigned32(value: number, field: string): number {
  if (
    !Number.isSafeInteger(value)
    || value < -0x8000_0000
    || value > 0x7fff_ffff
  ) {
    throw new Error(`${field} must be a signed 32-bit integer, got ${value}`);
  }
  return value | 0;
}

function requireSigned8(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < -0x80 || value > 0x7f) {
    throw new Error(`${field} must be a signed 8-bit integer, got ${value}`);
  }
  return value;
}

function createBattleScriptSpecialStatus(
  value: BattleScriptRulesBattler["specialStatus"],
  battler: number,
): BattleScriptSpecialStatus {
  if (
    value !== undefined
    && (
      value === null
      || typeof value !== "object"
      || Array.isArray(value)
    )
  ) {
    throw new Error(`battlers[${battler}].specialStatus must be a plain object`);
  }
  return Object.freeze({
    restoredBattlerSprite: requireUnsigned(
      value?.restoredBattlerSprite ?? 0,
      1,
      `battlers[${battler}].specialStatus.restoredBattlerSprite`,
    ) as 0 | 1,
    physicalDmg: requireSigned32(
      value?.physicalDmg ?? 0,
      `battlers[${battler}].specialStatus.physicalDmg`,
    ),
    specialDmg: requireSigned32(
      value?.specialDmg ?? 0,
      `battlers[${battler}].specialStatus.specialDmg`,
    ),
  });
}

type GeneratedMoveEffectRow = Readonly<{
  id: number;
  effectId: number;
}>;

type GeneratedMovePowerRow = Readonly<{
  id: number;
  power: number;
}>;

type GeneratedMoveTypeRow = Readonly<{
  id: number;
  type: string;
}>;

type GeneratedItemHoldEffectRow = Readonly<{
  itemId: number;
  holdEffectId: number;
}>;

// include/constants/pokemon.h:6-23. The order is the numeric TYPE_* ABI.
const BATTLE_SCRIPT_MOVE_TYPE_IDS = new Map<string, number>([
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
].map((name, id) => [name, id]));

const GENERATED_MOVE_EFFECTS = new Map<number, number>(
  (topologyData.moves as readonly GeneratedMoveEffectRow[]).map(
    ({ id, effectId }) => [id, effectId],
  ),
);

const GENERATED_MOVE_POWERS = new Map<number, number>(
  (movesData.moves as readonly GeneratedMovePowerRow[]).map(
    ({ id, power }) => [id, requireUnsigned(power, 0xff, `gBattleMoves[${id}].power`)],
  ),
);

const GENERATED_MOVE_TYPES = new Map<number, number>(
  (movesData.moves as readonly GeneratedMoveTypeRow[]).map(({ id, type }) => {
    const typeId = BATTLE_SCRIPT_MOVE_TYPE_IDS.get(type);
    if (typeId === undefined) throw new Error(`gBattleMoves[${id}] has unknown type ${type}`);
    return [id, typeId];
  }),
);

const GENERATED_ITEM_HOLD_EFFECTS = new Map<number, number>(
  (itemHoldEffectsData.items as readonly GeneratedItemHoldEffectRow[]).map(
    ({ itemId, holdEffectId }) => [itemId, holdEffectId],
  ),
);

/**
 * Resolves gBattleMoves[move].effect from the pinned generated source table.
 * Rules phases consume this typed context field rather than dispatching on a
 * move name, battle number, turn number, or presentation tick.
 */
export function resolveBattleScriptCurrentMoveEffect(currentMove: number): number {
  const effect = GENERATED_MOVE_EFFECTS.get(currentMove);
  if (effect === undefined) {
    throw new Error(
      `currentMove ${currentMove} has no source-derived gBattleMoves effect`,
    );
  }
  return effect;
}

/** Resolves the source u8 gBattleMoves[move].power field. */
export function resolveBattleScriptCurrentMovePower(currentMove: number): number {
  const power = GENERATED_MOVE_POWERS.get(currentMove);
  if (power === undefined) {
    throw new Error(
      `currentMove ${currentMove} has no source-derived gBattleMoves power`,
    );
  }
  return power;
}

/**
 * Exact GET_MOVE_TYPE expansion from include/battle.h:458-464.
 * A nonzero dynamic byte wins and is masked to its low six bits, including
 * F_DYNAMIC_TYPE_SET's representation of a dynamic Normal type.
 */
export function resolveBattleScriptMoveType(
  currentMove: number,
  dynamicMoveType: number,
): number {
  requireUnsigned(dynamicMoveType, 0xff, "dynamicMoveType");
  if (dynamicMoveType !== 0) return dynamicMoveType & BATTLE_SCRIPT_DYNAMIC_TYPE_MASK;
  const type = GENERATED_MOVE_TYPES.get(currentMove);
  if (type === undefined) {
    throw new Error(`currentMove ${currentMove} has no source-derived gBattleMoves type`);
  }
  return type;
}

/**
 * Cmd_moveend's source lookup at battle_script_commands.c:4228-4231.
 * Items without an explicit source holdEffect have the C initializer's zero.
 */
export function resolveBattleScriptBattlerHoldEffect(
  context: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
): number {
  const item = context.battlers[battler].item;
  if (item >= BATTLE_SCRIPT_ITEMS_COUNT) {
    throw new Error(`item ${item} is outside the source gItems corpus`);
  }
  return item === BATTLE_SCRIPT_ITEM_ENIGMA_BERRY
    ? context.enigmaBerryHoldEffects[battler]
    : (GENERATED_ITEM_HOLD_EFFECTS.get(item) ?? 0);
}

/**
 * Pure durable-state portion of MOVEEND_CHOICE_MOVE
 * (battle_script_commands.c:4296-4317). It intentionally owns no move-end
 * cursor, opcode dispatch, controller, item-effect, or history behavior.
 */
export function applyBattleScriptMoveEndChoiceOwnership(
  context: BattleScriptRulesContext,
): BattleScriptRulesContext {
  const attacker = context.selectorRoles.attacker;
  if (attacker === null) throw new Error("choice ownership requires an attacker battler");
  let choice = context.choicedMove[attacker];
  if (
    (context.hitMarker & BATTLE_SCRIPT_HITMARKER_OBEYS) !== 0
    && resolveBattleScriptBattlerHoldEffect(context, attacker)
      === BATTLE_SCRIPT_HOLD_EFFECT_CHOICE_BAND
    && context.chosenMove !== BATTLE_SCRIPT_MOVE_STRUGGLE
    && (choice === BATTLE_SCRIPT_MOVE_NONE || choice === BATTLE_SCRIPT_MOVE_UNAVAILABLE)
  ) {
    // Source breaks out of the case before its stale-choice cleanup.
    if (
      context.chosenMove === BATTLE_SCRIPT_MOVE_BATON_PASS
      && (context.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_FAILED) !== 0
    ) {
      return context;
    }
    choice = context.chosenMove;
  }
  if (!context.battlers[attacker].moves.includes(choice)) {
    choice = BATTLE_SCRIPT_MOVE_NONE;
  }
  if (choice === context.choicedMove[attacker]) return context;
  const choicedMove = Object.freeze(
    context.choicedMove.map((move, battler) => battler === attacker ? choice : move),
  ) as unknown as BattleScriptMoveEndHalfwords;
  return Object.freeze({ ...context, choicedMove });
}

/**
 * Pure durable-state portion of MOVEEND_CHANGED_ITEMS
 * (battle_script_commands.c:4318-4329). battlersCount remains a future
 * topology owner and is therefore an explicit validated dependency here.
 */
export function applyBattleScriptMoveEndChangedItemOwnership(
  context: BattleScriptRulesContext,
  battlersCount: number,
): BattleScriptRulesContext {
  requireUnsigned(battlersCount, 4, "battlersCount");
  let changed = false;
  const battlers = context.battlers.map((battler, index) => {
    const item = index < battlersCount ? context.changedItems[index] : BATTLE_SCRIPT_MOVE_NONE;
    if (item === BATTLE_SCRIPT_MOVE_NONE) return battler;
    changed = true;
    return Object.freeze({ ...battler, item });
  }) as unknown as BattleScriptRulesBattlers;
  if (!changed) return context;
  const changedItems = Object.freeze(
    context.changedItems.map((item, index) =>
      index < battlersCount && item !== BATTLE_SCRIPT_MOVE_NONE
        ? BATTLE_SCRIPT_MOVE_NONE
        : item
    ),
  ) as unknown as BattleScriptMoveEndHalfwords;
  return Object.freeze({
    ...context,
    battlers: Object.freeze(battlers),
    changedItems,
  });
}

function createMoveEndArray(
  input: readonly number[] | undefined,
  maximum: number,
  field: string,
): BattleScriptMoveEndHalfwords | BattleScriptMoveEndBytes {
  const values = input ?? [0, 0, 0, 0];
  if (!Array.isArray(values) || values.length !== 4) {
    throw new Error(`${field} must contain exactly four values`);
  }
  values.forEach((value, index) =>
    requireUnsigned(value, maximum, `${field}[${index}]`)
  );
  if (Object.isFrozen(values)) {
    return values as unknown as
      BattleScriptMoveEndHalfwords | BattleScriptMoveEndBytes;
  }
  return Object.freeze([...values]) as
    BattleScriptMoveEndHalfwords | BattleScriptMoveEndBytes;
}

function requireRole(
  value: BattleScriptBattlerId | null | undefined,
  field: string,
): BattleScriptBattlerId | null {
  if (value === undefined || value === null) return null;
  if (!isBattleScriptBattlerId(value)) {
    throw new Error(`${field} must be a battler id 0..3, null, or omitted, got ${value}`);
  }
  return value;
}

export function createBattleScriptRulesContext(
  input: BattleScriptRulesContextInput,
): BattleScriptRulesContext {
  if (!Array.isArray(input.battlers) || input.battlers.length !== 4) {
    throw new Error("Battle Script rules context must contain exactly four indexed battlers");
  }
  const battlers = input.battlers.map((battler, index) => Object.freeze({
    side: requireUnsigned(battler.side, 1, `battlers[${index}].side`) as 0 | 1,
    ability: requireUnsigned(battler.ability, 0xff, `battlers[${index}].ability`),
    hp: requireUnsigned(battler.hp, 0xffff, `battlers[${index}].hp`),
    item: requireUnsigned(battler.item ?? 0, 0xffff, `battlers[${index}].item`),
    moves: Object.freeze(
      (() => {
        if (!Array.isArray(battler.moves) || battler.moves.length !== 4) {
          throw new Error(`battlers[${index}].moves must contain exactly four move-slot values`);
        }
        return (battler.moves as readonly number[]).map((move, movePosition) =>
          requireUnsigned(
            move,
            0xffff,
            `battlers[${index}].moves[${movePosition}]`,
          )
        );
      })(),
    ) as unknown as readonly [number, number, number, number],
    pp: Object.freeze(
      (() => {
        if (!Array.isArray(battler.pp) || battler.pp.length !== 4) {
          throw new Error(`battlers[${index}].pp must contain exactly four move-slot values`);
        }
        return (battler.pp as readonly number[]).map((pp, movePosition) => requireUnsigned(
          pp,
          0xff,
          `battlers[${index}].pp[${movePosition}]`,
        ));
      })(),
    ) as unknown as readonly [number, number, number, number],
    statStages: Object.freeze(
      (() => {
        const statStages = battler.statStages
          ?? new Array<number>(BATTLE_SCRIPT_NUM_BATTLE_STATS).fill(0);
        if (
          !Array.isArray(statStages)
          || statStages.length !== BATTLE_SCRIPT_NUM_BATTLE_STATS
        ) {
          throw new Error(
            `battlers[${index}].statStages must contain exactly ${BATTLE_SCRIPT_NUM_BATTLE_STATS} signed stage values`,
          );
        }
        return statStages.map((stage, stat) =>
          requireSigned8(stage, `battlers[${index}].statStages[${stat}]`)
        );
      })(),
    ) as unknown as BattleScriptStatStages,
    status1: requireUnsigned(battler.status1, 0xffff_ffff, `battlers[${index}].status1`) >>> 0,
    status2: requireUnsigned(battler.status2, 0xffff_ffff, `battlers[${index}].status2`) >>> 0,
    status3: requireUnsigned(battler.status3, 0xffff_ffff, `battlers[${index}].status3`) >>> 0,
    specialStatus: createBattleScriptSpecialStatus(battler.specialStatus, index),
    substituteHP: requireUnsigned(
      battler.substituteHP,
      0xff,
      `battlers[${index}].substituteHP`,
    ),
    rolloutTimer: requireUnsigned(
      battler.rolloutTimer,
      0x0f,
      `battlers[${index}].rolloutTimer`,
    ),
    furyCutterCounter: requireUnsigned(
      battler.furyCutterCounter,
      0xff,
      `battlers[${index}].furyCutterCounter`,
    ),
    truantCounter: requireUnsigned(
      battler.truantCounter,
      1,
      `battlers[${index}].truantCounter`,
    ) as 0 | 1,
    rechargeTimer: requireUnsigned(
      battler.rechargeTimer,
      0xff,
      `battlers[${index}].rechargeTimer`,
    ),
    flinchImmobility: requireUnsigned(
      battler.flinchImmobility,
      1,
      `battlers[${index}].flinchImmobility`,
    ) as 0 | 1,
    disabledMove: requireUnsigned(
      battler.disabledMove,
      0xffff,
      `battlers[${index}].disabledMove`,
    ),
    usedDisabledMove: requireUnsigned(
      battler.usedDisabledMove,
      1,
      `battlers[${index}].usedDisabledMove`,
    ) as 0 | 1,
    tauntTimer: requireUnsigned(
      battler.tauntTimer,
      0x0f,
      `battlers[${index}].tauntTimer`,
    ),
    usedTauntedMove: requireUnsigned(
      battler.usedTauntedMove,
      1,
      `battlers[${index}].usedTauntedMove`,
    ) as 0 | 1,
    usedImprisonedMove: requireUnsigned(
      battler.usedImprisonedMove,
      1,
      `battlers[${index}].usedImprisonedMove`,
    ) as 0 | 1,
    ...(battler.bounceMove === undefined ? {} : {
      bounceMove: requireUnsigned(
        battler.bounceMove,
        1,
        `battlers[${index}].bounceMove`,
      ) as 0 | 1,
    }),
    ...(battler.confusionSelfDmg === undefined ? {} : {
      confusionSelfDmg: requireUnsigned(
        battler.confusionSelfDmg,
        1,
        `battlers[${index}].confusionSelfDmg`,
      ) as 0 | 1,
    }),
    ...(battler.prlzImmobility === undefined ? {} : {
      prlzImmobility: requireUnsigned(
        battler.prlzImmobility,
        1,
        `battlers[${index}].prlzImmobility`,
      ) as 0 | 1,
    }),
    ...(battler.loveImmobility === undefined ? {} : {
      loveImmobility: requireUnsigned(
        battler.loveImmobility,
        1,
        `battlers[${index}].loveImmobility`,
      ) as 0 | 1,
    }),
    chargingTurn: requireUnsigned(
      battler.chargingTurn ?? 0,
      1,
      `battlers[${index}].chargingTurn`,
    ) as 0 | 1,
    ...(battler.confusionDamage === undefined ? {} : {
      confusionDamage: Object.freeze({
        level: requireUnsigned(
          battler.confusionDamage.level,
          0xff,
          `battlers[${index}].confusionDamage.level`,
        ),
        attack: requireUnsigned(
          battler.confusionDamage.attack,
          0xffff,
          `battlers[${index}].confusionDamage.attack`,
        ),
        defense: requireUnsigned(
          battler.confusionDamage.defense,
          0xffff,
          `battlers[${index}].confusionDamage.defense`,
        ),
        attackStage: requireUnsigned(
          battler.confusionDamage.attackStage,
          12,
          `battlers[${index}].confusionDamage.attackStage`,
        ),
        defenseStage: requireUnsigned(
          battler.confusionDamage.defenseStage,
          12,
          `battlers[${index}].confusionDamage.defenseStage`,
        ),
        isBurned: Boolean(battler.confusionDamage.isBurned),
        hasGuts: Boolean(battler.confusionDamage.hasGuts),
      }),
    }),
  })) as unknown as BattleScriptRulesBattlers;
  const selectorRoles = Object.freeze({
    attacker: requireRole(input.selectorRoles?.attacker, "selectorRoles.attacker"),
    // For this source role only, null also preserves gBattlerTarget's explicit
    // BATTLER_NONE (0xFF) sentinel. UproarWakeUpCheck can replace that sentinel
    // with the first battler it finds using Uproar.
    target: requireRole(input.selectorRoles?.target, "selectorRoles.target"),
    effectBattler: requireRole(
      input.selectorRoles?.effectBattler,
      "selectorRoles.effectBattler",
    ),
  });
  const scriptingBattler = requireRole(input.scriptingBattler, "scriptingBattler");
  if (scriptingBattler === null) {
    throw new Error("scriptingBattler must be a battler id 0..3");
  }
  const currentMove = requireUnsigned(input.currentMove, 0xffff, "currentMove");
  const bideDmgInput = input.bideDmg ?? [0, 0, 0, 0];
  if (!Array.isArray(bideDmgInput) || bideDmgInput.length !== 4) {
    throw new Error("bideDmg must contain exactly four signed 32-bit values");
  }
  const bideDmg = Object.freeze(bideDmgInput.map((value, index) =>
    requireSigned32(value, `bideDmg[${index}]`)
  )) as unknown as BattleScriptBideDamageByBattler;
  const bideTargetInput = input.bideTarget ?? [0, 0, 0, 0];
  if (!Array.isArray(bideTargetInput) || bideTargetInput.length !== 4) {
    throw new Error("bideTarget must contain exactly four battler ids");
  }
  const bideTarget = Object.freeze(bideTargetInput.map((value, index) => {
    const target = requireRole(value, `bideTarget[${index}]`);
    if (target === null) {
      throw new Error(`bideTarget[${index}] must be a battler id 0..3`);
    }
    return target;
  })) as unknown as BattleScriptBideTargetByBattler;
  const choicedMove = createMoveEndArray(
    input.choicedMove,
    0xffff,
    "choicedMove",
  ) as BattleScriptMoveEndHalfwords;
  const changedItems = createMoveEndArray(
    input.changedItems,
    0xffff,
    "changedItems",
  ) as BattleScriptMoveEndHalfwords;
  const enigmaBerryHoldEffects = createMoveEndArray(
    input.enigmaBerryHoldEffects,
    0xff,
    "enigmaBerryHoldEffects",
  ) as BattleScriptMoveEndBytes;
  return Object.freeze({
    battlers: Object.freeze(battlers),
    selectorRoles,
    scriptingBattler,
    atkCancelerTracker: requireUnsigned(
      input.atkCancelerTracker,
      0xff,
      "atkCancelerTracker",
    ),
    battleOutcome: requireUnsigned(input.battleOutcome, 0xff, "battleOutcome"),
    currentMove,
    currentMoveEffect: resolveBattleScriptCurrentMoveEffect(currentMove),
    currentMovePower: resolveBattleScriptCurrentMovePower(currentMove),
    currentMovePosition: requireUnsigned(
      input.currentMovePosition,
      3,
      "currentMovePosition",
    ),
    lastUsedAbility: requireUnsigned(
      input.lastUsedAbility ?? 0,
      0xff,
      "lastUsedAbility",
    ),
    moveResultFlags: requireUnsigned(input.moveResultFlags, 0xff, "moveResultFlags"),
    dmgMultiplier: requireUnsigned(input.dmgMultiplier, 0xff, "dmgMultiplier"),
    critMultiplier: requireUnsigned(input.critMultiplier, 0xff, "critMultiplier"),
    moveEffectByte: requireUnsigned(input.moveEffectByte, 0xff, "moveEffectByte"),
    missType: requireUnsigned(input.missType, 0xff, "missType"),
    hitMarker: requireUnsigned(input.hitMarker, 0xffff_ffff, "hitMarker") >>> 0,
    multiHitCounter: requireUnsigned(input.multiHitCounter, 0xff, "multiHitCounter"),
    multistringChooser: requireUnsigned(
      input.multistringChooser ?? 0,
      0xff,
      "multistringChooser",
    ),
    battleMoveDamage: requireSigned32(
      input.battleMoveDamage ?? 0,
      "battleMoveDamage",
    ),
    bideDmg,
    bideTarget,
    scriptingBideDmg: requireSigned32(
      input.scriptingBideDmg ?? 0,
      "scriptingBideDmg",
    ),
    absentBattlerFlags: requireUnsigned(
      input.absentBattlerFlags ?? 0,
      0x0f,
      "absentBattlerFlags",
    ),
    chosenMove: requireUnsigned(input.chosenMove ?? 0, 0xffff, "chosenMove"),
    choicedMove,
    changedItems,
    battleStructAbsentBattlerFlags: requireUnsigned(
      input.battleStructAbsentBattlerFlags ?? 0,
      0x0f,
      "battleStructAbsentBattlerFlags",
    ),
    dynamicMoveType: requireUnsigned(input.dynamicMoveType ?? 0, 0xff, "dynamicMoveType"),
    enigmaBerryHoldEffects,
    battleCommunication0: requireUnsigned(
      input.battleCommunication0 ?? 0,
      0xff,
      "battleCommunication0",
    ),
    battleCommunication1: requireUnsigned(
      input.battleCommunication1 ?? 0,
      0xff,
      "battleCommunication1",
    ),
    animTargetsHit: requireUnsigned(input.animTargetsHit ?? 0, 0xff, "animTargetsHit"),
    animTurn: requireUnsigned(input.animTurn ?? 0, 0xff, "animTurn"),
    giveExpState: requireUnsigned(input.giveExpState ?? 0, 0xff, "giveExpState"),
    learnMoveState: requireUnsigned(input.learnMoveState ?? 0, 0xff, "learnMoveState"),
    lvlBoxState: requireUnsigned(input.lvlBoxState ?? 0, 0xff, "lvlBoxState"),
    moveendState: requireUnsigned(input.moveendState ?? 0, 0xff, "moveendState"),
    multiHitEffect: requireUnsigned(input.multiHitEffect ?? 0, 0xff, "multiHitEffect"),
    statChanger: requireUnsigned(input.statChanger ?? 0, 0xff, "statChanger"),
    statAnimPlayed: requireUnsigned(input.statAnimPlayed ?? 0, 0xff, "statAnimPlayed"),
    tripleKickPower: requireUnsigned(input.tripleKickPower ?? 0, 0xffff, "tripleKickPower"),
    twoTurnStringId: requireUnsigned(input.twoTurnStringId ?? 0, 0xff, "twoTurnStringId"),
  });
}

function decodeSupportedBattlerSelector(operand: BattleScriptOperand): number | null {
  const named = BATTLE_SCRIPT_BATTLER_SELECTORS[
    operand.expression as keyof typeof BATTLE_SCRIPT_BATTLER_SELECTORS
  ];
  if (named !== undefined) return named;
  if (!/^(?:0[xX][0-9a-fA-F]+|[0-9]+)$/.test(operand.expression)) return null;
  const numeric = Number(operand.expression);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

/**
 * Source-exact GetBattlerForBattleScript mapping for the selector roles proven
 * reachable by statusanimation/status2animation/chosenstatusanimation.
 * Other source cases remain unavailable until their own context is explicit.
 */
export const resolveRulesBattlerForBattleScript: NonNullable<
  BattleScriptSourceCommandPorts<BattleScriptRulesContext>["resolveBattlerForBattleScript"]
> = (context, selectorOperand) => {
  const selector = decodeSupportedBattlerSelector(selectorOperand);
  if (selector === BATTLE_SCRIPT_BATTLER_SELECTORS.BS_ATTACKER) {
    return context.state.rulesContext.selectorRoles.attacker;
  }
  if (selector === BATTLE_SCRIPT_BATTLER_SELECTORS.BS_EFFECT_BATTLER) {
    return context.state.rulesContext.selectorRoles.effectBattler;
  }
  return null;
};

export const prepareRulesStatusAnimation: BattleScriptStatusAnimationPreparationPort<
  BattleScriptRulesContext
> = (context, battler, request): BattleScriptStatusAnimationPreparation => {
  const rules = context.state.rulesContext;
  const sourceBattler = rules.battlers[battler];
  if (
    (sourceBattler.status3 & BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) !== 0
    || sourceBattler.substituteHP !== 0
    || (rules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0
  ) {
    return Object.freeze({ kind: "suppress" });
  }

  let isStatus2: number;
  let status: number;
  switch (request.kind) {
    case "live-status1":
      isStatus2 = 0;
      status = sourceBattler.status1;
      break;
    case "masked-live-status2":
      isStatus2 = 1;
      status = (sourceBattler.status2 & request.wantedMask) >>> 0;
      break;
    case "explicit-status":
      isStatus2 = request.isStatus2;
      status = request.status;
      break;
  }
  return Object.freeze({
    kind: "emit",
    receipt: Object.freeze({
      kind: "status-animation",
      battler,
      isStatus2,
      status,
    }),
  });
};

export type BattleScriptStatusRulesExternalPorts = Readonly<
  Omit<
    BattleScriptSourceCommandPorts<BattleScriptRulesContext>,
    "resolveBattlerForBattleScript" | "prepareStatusAnimation"
  > & {
    resolveByteOperand: BattleScriptByteResolverPort<BattleScriptRulesContext>;
  }
>;

/**
 * Production handler composition for the currently explicit rules context.
 * The generic command factories remain injectable; this bundle replaces only
 * the two status-family ports whose live source data now has durable owners
 * and includes cleanup because all of its mutated fields are owned here.
 */
export function createBattleScriptStatusRulesHandlers(
  program: BattleScriptProgram,
  externalPorts: BattleScriptStatusRulesExternalPorts,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const { resolveByteOperand, ...sourceExternalPorts } = externalPorts;
  const sourcePorts: BattleScriptSourceCommandPorts<BattleScriptRulesContext> =
    Object.freeze({
      ...sourceExternalPorts,
      resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
      prepareStatusAnimation: prepareRulesStatusAnimation,
    });
  return Object.freeze({
    ...createBattleScriptControlHandlers<BattleScriptRulesContext>(program),
    ...createBattleScriptSourceCommandHandlers(program, sourcePorts),
    ...createBattleScriptRuleCommandHandlers(program, resolveByteOperand),
    ...createBattleScriptMoveValuesCommandHandlers<BattleScriptRulesContext>(
      program,
    ),
    ...createBattleScriptSetByteCommandHandlers<BattleScriptRulesContext>(
      program,
    ),
  });
}

export type BattleScriptStatusRulesExecution = Readonly<{
  state: BattleScriptMachineState<BattleScriptRulesContext>;
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>;
}>;

export function createBattleScriptStatusRulesExecution(
  program: BattleScriptProgram,
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
  externalPorts: BattleScriptStatusRulesExternalPorts,
  scheduler?: BattleScriptSchedulerState,
): BattleScriptStatusRulesExecution {
  return Object.freeze({
    state: createBattleScriptMachine(
      program,
      entryLabel,
      rulesContext,
      rngSeed,
      scheduler,
    ),
    handlers: createBattleScriptStatusRulesHandlers(program, externalPorts),
  });
}

/** Named acknowledgement seam retained beside the production execution bundle. */
export const acknowledgeBattleScriptStatusRulesController =
  acknowledgeBattleScriptController;
