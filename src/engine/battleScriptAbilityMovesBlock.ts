import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type {
  BattleScriptAttackCancelerLoopResult,
} from "./battleScriptAttackCanceler.ts";
import type {
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "./battleScriptSourceConstants.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };

type GeneratedSoundMove = Readonly<{
  move: string;
  id: number;
}>;

const GENERATED_SOUND_MOVES = Object.freeze(
  movesData.sourceTables.soundMoves.map(({ move, id }) => Object.freeze({
    move,
    id,
  })),
) as readonly GeneratedSoundMove[];

export type BattleScriptMovesBlockState = Readonly<{
  rulesContext: BattleScriptRulesContext;
  rngValue: number;
  rngCallsConsumed: number;
}>;

export type BattleScriptMovesBlockProgramCounter =
  | Readonly<{
    kind: "preserve";
    sourceProgramCounter: number;
  }>
  | Readonly<{
    kind: "handoff";
    sourceProgramCounter: number;
    targetLabel: "BattleScript_SoundproofProtected";
  }>;

export type BattleScriptMovesBlockReceipt = Readonly<{
  sourceFunction: "AbilityBattleEffects";
  sourceCase: "ABILITYEFFECT_MOVES_BLOCK";
  arguments: Readonly<{
    battler: Readonly<{
      sourceArgument: "gBattlerTarget";
      value: BattleScriptBattlerId;
    }>;
    ability: 0;
    special: 0;
    moveArg: 0;
  }>;
  targetAbility: Readonly<{
    sourceField: "gBattleMons[battler].ability";
    battler: BattleScriptBattlerId;
    value: number;
  }>;
  lastUsedAbility: Readonly<{
    sourceField: "gLastUsedAbility";
    before: number;
    after: number;
    sourceResolution: "special == 0 ? gBattleMons[battler].ability : special";
    isSoundproof: boolean;
  }>;
  move: Readonly<{
    sourceField: "gCurrentMove";
    sourceResolution: "moveArg == 0 ? gCurrentMove : moveArg";
    value: number;
  }>;
  soundMoveScan:
    | Readonly<{
      kind: "not-scanned";
      sourceTable: "sSoundMovesTable";
      reason: "last-used-ability-is-not-soundproof";
    }>
    | Readonly<{
      kind: "scanned";
      sourceTable: "sSoundMovesTable";
      checked: readonly Readonly<{
        index: number;
        move: number;
        sourceSymbol: string;
        matches: boolean;
      }>[];
      matchedIndex: number | null;
      isSoundMove: boolean;
      termination:
        | Readonly<{
          kind: "matching-move";
          index: number;
        }>
        | Readonly<{
          kind: "sentinel";
          sourceConstant: "SOUND_MOVES_END";
          value: 0xffff;
        }>;
    }>;
  attackerMultiTurn:
    | Readonly<{
      kind: "not-read";
      reason: "move-was-not-blocked";
    }>
    | Readonly<{
      kind: "read";
      battler: BattleScriptBattlerId;
      sourceField: "gBattleMons[gBattlerAttacker].status2";
      value: number;
      sourceMask: "STATUS2_MULTIPLETURNS";
      mask: number;
      isMultiTurn: boolean;
    }>;
  hitMarker: Readonly<{
    before: number;
    after: number;
    addedMask: number;
    clearedMask: 0;
  }>;
  programCounter: BattleScriptMovesBlockProgramCounter;
  effect: 0 | 1;
  rng: Readonly<{
    kind: "preserve";
    before: number;
    after: number;
    callsBefore: number;
    callsAfter: number;
    callsConsumed: 0;
  }>;
}>;

export type BattleScriptMovesBlockResult =
  BattleScriptMovesBlockState & Readonly<{
    kind: "continue" | "block";
    effect: 0 | 1;
    receipt: BattleScriptMovesBlockReceipt;
  }>;

export type BattleScriptAttackCancelerMovesBlockJoinReceipt =
  | Readonly<{
    sourceFunction: "Cmd_attackcanceler";
    canceler: BattleScriptAttackCancelerLoopResult["receipt"];
    sourceCondition: "AtkCanceler_UnableToUseMove() != 0";
    movesBlock: Readonly<{
      kind: "not-called";
      reason: "canceler-effect-nonzero";
    }>;
  }>
  | Readonly<{
    sourceFunction: "Cmd_attackcanceler";
    canceler: BattleScriptAttackCancelerLoopResult["receipt"];
    sourceCondition: "AtkCanceler_UnableToUseMove() == 0";
    movesBlock: BattleScriptMovesBlockReceipt;
  }>;

export type BattleScriptAttackCancelerMovesBlockJoinResult =
  BattleScriptMovesBlockState & Readonly<{
    kind: "canceler-effect" | "moves-block" | "continue";
    effect: 0 | 1 | 2;
    receipt: BattleScriptAttackCancelerMovesBlockJoinReceipt;
  }>;

function requireU32(value: number, field: string): number {
  if (
    !Number.isSafeInteger(value)
    || value < 0
    || value > 0xffff_ffff
  ) {
    throw new Error(`${field} must be a u32, got ${value}`);
  }
  return value >>> 0;
}

function requireCallCount(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${value} is not a valid nonnegative RNG call count`);
  }
  return value;
}

function requireRulesContext(
  value: BattleScriptRulesContext,
): BattleScriptRulesContext {
  if (
    value === null
    || typeof value !== "object"
    || !Array.isArray(value.battlers)
    || value.battlers.length !== 4
    || value.selectorRoles === null
    || typeof value.selectorRoles !== "object"
    || !Number.isSafeInteger(value.currentMove)
    || !Number.isSafeInteger(value.lastUsedAbility)
    || !Number.isSafeInteger(value.hitMarker)
  ) {
    throw new Error("Battle Script moves-block gate requires a typed rules context");
  }
  return value;
}

function requireState(
  state: BattleScriptMovesBlockState,
): BattleScriptMovesBlockState {
  if (state === null || typeof state !== "object") {
    throw new Error("Battle Script moves-block gate requires a state object");
  }
  return Object.freeze({
    rulesContext: requireRulesContext(state.rulesContext),
    rngValue: requireU32(state.rngValue, "Battle Script moves-block RNG value"),
    rngCallsConsumed: requireCallCount(state.rngCallsConsumed),
  });
}

function bitFieldEffect(before: number, after: number) {
  return Object.freeze({
    before,
    after,
    addedMask: (after & ~before) >>> 0,
    clearedMask: 0 as const,
  });
}

/**
 * Pure source-shaped port of the post-canceler
 * AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0)
 * call in Cmd_attackcanceler.
 *
 * It records the dispatcher prologue's gLastUsedAbility write, the exact
 * sSoundMovesTable scan, and the optional hit-marker/script handoff. It does
 * not register opcode 0 or execute any controller, round, or presentation
 * boundary.
 */
export function advanceBattleScriptMovesBlockAbility(
  state: BattleScriptMovesBlockState,
  sourceProgramCounter: number,
): BattleScriptMovesBlockResult {
  const source = requireState(state);
  const sourcePc = requireU32(
    sourceProgramCounter,
    "Battle Script source program counter",
  );
  const rules = source.rulesContext;
  const target = rules.selectorRoles.target;
  if (target === null) {
    throw new Error("Battle Script moves-block gate requires a target role");
  }
  const targetAbility = rules.battlers[target].ability;
  const isSoundproof = targetAbility === BATTLE_SCRIPT_ABILITY_SOUNDPROOF;
  const checked: Array<Readonly<{
    index: number;
    move: number;
    sourceSymbol: string;
    matches: boolean;
  }>> = [];
  let matchedIndex: number | null = null;
  if (isSoundproof) {
    for (const [index, selector] of GENERATED_SOUND_MOVES.entries()) {
      const matches = selector.id === rules.currentMove;
      checked.push(Object.freeze({
        index,
        move: selector.id,
        sourceSymbol: selector.move,
        matches,
      }));
      if (matches) {
        matchedIndex = index;
        break;
      }
    }
  }
  const blocked = isSoundproof && matchedIndex !== null;
  const attacker = rules.selectorRoles.attacker;
  if (blocked && attacker === null) {
    throw new Error(
      "Battle Script moves-block gate requires an attacker role when Soundproof blocks",
    );
  }
  const attackerStatus2 = blocked
    ? rules.battlers[attacker as BattleScriptBattlerId].status2
    : 0;
  const isMultiTurn = blocked
    && (
      attackerStatus2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
    ) !== 0;
  const nextHitMarker = isMultiTurn
    ? (rules.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT) >>> 0
    : rules.hitMarker;
  const nextRules = (
    rules.lastUsedAbility === targetAbility
    && nextHitMarker === rules.hitMarker
  )
    ? rules
    : Object.freeze({
      ...rules,
      lastUsedAbility: targetAbility,
      hitMarker: nextHitMarker,
    });
  const programCounter: BattleScriptMovesBlockProgramCounter = blocked
    ? Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_SoundproofProtected",
    })
    : Object.freeze({
      kind: "preserve",
      sourceProgramCounter: sourcePc,
    });
  const soundMoveScan: BattleScriptMovesBlockReceipt["soundMoveScan"] =
    isSoundproof
      ? Object.freeze({
        kind: "scanned",
        sourceTable: "sSoundMovesTable",
        checked: Object.freeze(checked),
        matchedIndex,
        isSoundMove: matchedIndex !== null,
        termination: matchedIndex === null
          ? Object.freeze({
            kind: "sentinel",
            sourceConstant: "SOUND_MOVES_END",
            value: 0xffff as const,
          })
          : Object.freeze({
            kind: "matching-move",
            index: matchedIndex,
          }),
      })
      : Object.freeze({
        kind: "not-scanned",
        sourceTable: "sSoundMovesTable",
        reason: "last-used-ability-is-not-soundproof",
      });
  const attackerMultiTurn: BattleScriptMovesBlockReceipt["attackerMultiTurn"] =
    blocked
      ? Object.freeze({
        kind: "read",
        battler: attacker as BattleScriptBattlerId,
        sourceField: "gBattleMons[gBattlerAttacker].status2",
        value: attackerStatus2,
        sourceMask: "STATUS2_MULTIPLETURNS",
        mask: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
        isMultiTurn,
      })
      : Object.freeze({
        kind: "not-read",
        reason: "move-was-not-blocked",
      });
  const receipt: BattleScriptMovesBlockReceipt = Object.freeze({
    sourceFunction: "AbilityBattleEffects",
    sourceCase: "ABILITYEFFECT_MOVES_BLOCK",
    arguments: Object.freeze({
      battler: Object.freeze({
        sourceArgument: "gBattlerTarget",
        value: target,
      }),
      ability: 0 as const,
      special: 0 as const,
      moveArg: 0 as const,
    }),
    targetAbility: Object.freeze({
      sourceField: "gBattleMons[battler].ability",
      battler: target,
      value: targetAbility,
    }),
    lastUsedAbility: Object.freeze({
      sourceField: "gLastUsedAbility",
      before: rules.lastUsedAbility,
      after: targetAbility,
      sourceResolution:
        "special == 0 ? gBattleMons[battler].ability : special",
      isSoundproof,
    }),
    move: Object.freeze({
      sourceField: "gCurrentMove",
      sourceResolution: "moveArg == 0 ? gCurrentMove : moveArg",
      value: rules.currentMove,
    }),
    soundMoveScan,
    attackerMultiTurn,
    hitMarker: bitFieldEffect(rules.hitMarker, nextHitMarker),
    programCounter,
    effect: blocked ? 1 : 0,
    rng: Object.freeze({
      kind: "preserve",
      before: source.rngValue,
      after: source.rngValue,
      callsBefore: source.rngCallsConsumed,
      callsAfter: source.rngCallsConsumed,
      callsConsumed: 0 as const,
    }),
  });

  return Object.freeze({
    kind: blocked ? "block" : "continue",
    effect: blocked ? 1 : 0,
    rulesContext: nextRules,
    rngValue: source.rngValue,
    rngCallsConsumed: source.rngCallsConsumed,
    receipt,
  });
}

/**
 * Source-order join after a supplied AtkCanceler_UnableToUseMove result.
 * A nonzero canceler effect returns before the ability dispatcher is called.
 */
export function joinBattleScriptAttackCancelerMovesBlock(
  cancelerResult: BattleScriptAttackCancelerLoopResult,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerMovesBlockJoinResult {
  if (cancelerResult === null || typeof cancelerResult !== "object") {
    throw new Error("Battle Script moves-block join requires a canceler result");
  }
  const sourcePc = requireU32(
    sourceProgramCounter,
    "Battle Script source program counter",
  );
  if (![0, 1, 2].includes(cancelerResult.effect)) {
    throw new Error(
      `Battle Script moves-block join requires canceler effect 0..2, got ${cancelerResult.effect}`,
    );
  }
  const state = requireState(cancelerResult);
  if (cancelerResult.effect !== 0) {
    return Object.freeze({
      kind: "canceler-effect",
      effect: cancelerResult.effect,
      ...state,
      receipt: Object.freeze({
        sourceFunction: "Cmd_attackcanceler",
        canceler: cancelerResult.receipt,
        sourceCondition: "AtkCanceler_UnableToUseMove() != 0",
        movesBlock: Object.freeze({
          kind: "not-called",
          reason: "canceler-effect-nonzero",
        }),
      }),
    });
  }

  const movesBlock = advanceBattleScriptMovesBlockAbility(state, sourcePc);
  return Object.freeze({
    kind: movesBlock.kind === "block" ? "moves-block" : "continue",
    effect: movesBlock.effect,
    rulesContext: movesBlock.rulesContext,
    rngValue: movesBlock.rngValue,
    rngCallsConsumed: movesBlock.rngCallsConsumed,
    receipt: Object.freeze({
      sourceFunction: "Cmd_attackcanceler",
      canceler: cancelerResult.receipt,
      sourceCondition: "AtkCanceler_UnableToUseMove() == 0",
      movesBlock: movesBlock.receipt,
    }),
  });
}
