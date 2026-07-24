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
import movesData from "../data/gen/moves.json" with { type: "json" };

export type BattleScriptRulesBattler = Readonly<{
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

export type BattleScriptRulesBattlers = readonly [
  BattleScriptRulesBattler,
  BattleScriptRulesBattler,
  BattleScriptRulesBattler,
  BattleScriptRulesBattler,
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
  BattleScriptMoveValuesRulesContext & {
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

type GeneratedMoveEffectRow = Readonly<{
  id: number;
  effectId: number;
}>;

type GeneratedMovePowerRow = Readonly<{
  id: number;
  power: number;
}>;

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
    status1: requireUnsigned(battler.status1, 0xffff_ffff, `battlers[${index}].status1`) >>> 0,
    status2: requireUnsigned(battler.status2, 0xffff_ffff, `battlers[${index}].status2`) >>> 0,
    status3: requireUnsigned(battler.status3, 0xffff_ffff, `battlers[${index}].status3`) >>> 0,
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
    battleMoveDamage: requireUnsigned(
      input.battleMoveDamage ?? 0,
      0xffff_ffff,
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
