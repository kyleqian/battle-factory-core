import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type {
  BattleScriptAttackCancelerFactoryObedienceResult,
  BattleScriptFactoryObedienceBypassReceipt,
  BattleScriptFactoryObedienceReceipt,
} from "./battleScriptAbilityMovesBlock.ts";
import type {
  BattleScriptRulesBattler,
  BattleScriptRulesContext,
  BattleScriptRulesBattlers,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_HITMARKER_OBEYS,
} from "./battleScriptSourceConstants.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };

type GeneratedMoveFlags = Readonly<{
  move: string;
  id: number;
  flags: readonly string[];
}>;

const GENERATED_MOVE_FLAGS = new Map<number, GeneratedMoveFlags>(
  movesData.moves.map(({ move, id, flags }) => [
    id,
    Object.freeze({
      move,
      id,
      flags: Object.freeze([...flags]),
    }),
  ]),
);

const GENERATED_MAGIC_COAT_MOVE = movesData.moves.find(
  ({ move }) => move === "MOVE_MAGIC_COAT",
);
if (GENERATED_MAGIC_COAT_MOVE === undefined) {
  throw new Error("generated move data is missing MOVE_MAGIC_COAT");
}
const GENERATED_MAGIC_COAT_MOVE_ID = GENERATED_MAGIC_COAT_MOVE.id;

export type BattleScriptPressurePpLossRequest = Readonly<{
  kind: "delegate";
  sourceFunction: "PressurePPLose";
  arguments: Readonly<{
    pressureAbilityBattler: Readonly<{
      sourceArgument: "gBattlerAttacker";
      value: BattleScriptBattlerId;
    }>;
    moveOwnerBattler: Readonly<{
      sourceArgument: "gBattlerTarget";
      value: BattleScriptBattlerId;
    }>;
    move: Readonly<{
      sourceArgument: "MOVE_MAGIC_COAT";
      value: number;
    }>;
  }>;
  ownership: "delegated-without-PP-or-controller-mutation";
}>;

export type BattleScriptProgramCounterStackReceipt =
  | Readonly<{
    kind: "preserve";
    sourceStruct: "BattleScriptsStack";
    before: readonly number[];
    after: readonly number[];
  }>
  | Readonly<{
    kind: "push-cursor";
    sourceStruct: "BattleScriptsStack";
    sourceFunction: "BattleScriptPushCursor";
    before: readonly number[];
    pushedProgramCounter: number;
    after: readonly number[];
    resume: Readonly<{
      sourceFunction: "BattleScriptPop";
      programCounter: number;
      continuation: "resume-Cmd_attackcanceler";
    }>;
  }>;

type BattleScriptMagicCoatMoveReceipt = Readonly<{
  sourceField: "gBattleMoves[gCurrentMove].flags";
  move: number;
  sourceSymbol: string;
  sourceFlags: readonly string[];
  testedFlag: "FLAG_MAGIC_COAT_AFFECTED";
  affected: boolean;
}>;

export type BattleScriptMagicCoatReceipt = Readonly<{
  sourceFunction: "Cmd_attackcanceler";
  factoryObedience: BattleScriptFactoryObedienceReceipt;
  sourceCondition: "Factory obedience continued";
  attacker: BattleScriptBattlerId;
  target: BattleScriptBattlerId;
  protect: Readonly<{
    sourceField: "gProtectStructs[gBattlerTarget].bounceMove";
    battler: BattleScriptBattlerId;
    before: 0 | 1;
    after: 0 | 1;
    cleared: boolean;
  }>;
  move: BattleScriptMagicCoatMoveReceipt;
  pressurePpLoss:
    | Readonly<{
      kind: "not-requested";
      reason: "target-bounceMove-not-armed" | "move-not-Magic-Coat-affected";
    }>
    | BattleScriptPressurePpLossRequest;
  programCounter:
    | Readonly<{
      kind: "preserve";
      sourceProgramCounter: number;
      continuation: "before-Snatch";
      stack: BattleScriptProgramCounterStackReceipt;
    }>
    | Readonly<{
      kind: "handoff";
      sourceProgramCounter: number;
      targetLabel: "BattleScript_MagicCoatBounce";
      stack: BattleScriptProgramCounterStackReceipt;
    }>;
  rng: Readonly<{
    kind: "preserve";
    before: number;
    after: number;
    callsBefore: number;
    callsAfter: number;
    callsConsumed: 0;
  }>;
}>;

export type BattleScriptMagicCoatBypassReceipt = Readonly<{
  sourceFunction: "Cmd_attackcanceler";
  factoryObedience: BattleScriptFactoryObedienceBypassReceipt;
  sourceCondition:
    | "AtkCanceler_UnableToUseMove() != 0"
    | "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0) != 0"
    | "selected-slot PP admission stopped";
  magicCoat: Readonly<{
    kind: "not-checked";
    reason:
      | "canceler-effect-nonzero"
      | "moves-block-effect-nonzero"
      | "selected-move-has-no-pp";
  }>;
  programCounter: Readonly<{
    kind: "preserve-upstream";
    sourceProgramCounter: number;
    stack: BattleScriptProgramCounterStackReceipt;
  }>;
  rng: Readonly<{
    kind: "preserve";
    before: number;
    after: number;
    callsBefore: number;
    callsAfter: number;
    callsConsumed: 0;
  }>;
}>;

type BattleScriptMagicCoatSharedResult = Readonly<{
  rulesContext: BattleScriptRulesContext;
  rngValue: number;
  rngCallsConsumed: number;
  scriptCallStack: readonly number[];
  pressurePpLossRequests: readonly BattleScriptPressurePpLossRequest[];
}>;

export type BattleScriptAttackCancelerMagicCoatResult =
  BattleScriptMagicCoatSharedResult & (
    | Readonly<{
      kind: "canceler-effect" | "moves-block" | "selected-move-no-pp";
      effect: 0 | 1 | 2;
      receipt: BattleScriptMagicCoatBypassReceipt;
    }>
    | Readonly<{
      kind: "continue" | "magic-coat";
      effect: 0;
      receipt: BattleScriptMagicCoatReceipt;
    }>
  );

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

function freezeScriptCallStack(
  value: readonly number[],
): readonly number[] {
  if (!Array.isArray(value) || value.length > 8) {
    throw new Error(
      "Battle Script Magic Coat join requires a BattleScriptsStack with at most 8 entries",
    );
  }
  return Object.freeze(value.map((programCounter, index) =>
    requireU32(programCounter, `BattleScriptsStack.ptr[${index}]`)
  ));
}

function preserveRngReceipt(
  rngValue: number,
  rngCallsConsumed: number,
) {
  return Object.freeze({
    kind: "preserve" as const,
    before: rngValue,
    after: rngValue,
    callsBefore: rngCallsConsumed,
    callsAfter: rngCallsConsumed,
    callsConsumed: 0 as const,
  });
}

function preserveStackReceipt(
  stack: readonly number[],
): BattleScriptProgramCounterStackReceipt {
  return Object.freeze({
    kind: "preserve",
    sourceStruct: "BattleScriptsStack",
    before: stack,
    after: stack,
  });
}

function requireProtectState(battler: BattleScriptRulesBattler, index: number): 0 | 1 {
  const bounceMove = battler.bounceMove ?? 0;
  if (bounceMove !== 0 && bounceMove !== 1) {
    throw new Error(
      `Battle Script Magic Coat join requires battlers[${index}].bounceMove to be 0 or 1`,
    );
  }
  return bounceMove;
}

function requireComposition(
  result: BattleScriptAttackCancelerFactoryObedienceResult,
  sourceProgramCounter: number,
): void {
  const validKindAndEffect = (
    (
      result.kind === "canceler-effect"
      && (result.effect === 1 || result.effect === 2)
    )
    || (result.kind === "moves-block" && result.effect === 1)
    || (
      (
        result.kind === "selected-move-no-pp"
        || result.kind === "continue"
      )
      && result.effect === 0
    )
  );
  if (
    !validKindAndEffect
    || result.receipt === null
    || typeof result.receipt !== "object"
    || result.receipt.sourceFunction !== "Cmd_attackcanceler"
  ) {
    throw new Error(
      "Battle Script Magic Coat join requires a consistent Factory-obedience result",
    );
  }
  if (
    result.kind === "continue"
    && (
      result.receipt.sourceCondition !== "selected-slot PP admission continued"
      || result.receipt.programCounter.sourceProgramCounter
        !== sourceProgramCounter
      || (
        result.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_OBEYS
      ) === 0
    )
  ) {
    throw new Error(
      "Battle Script Magic Coat join requires the continuing Factory-obedience cursor and marker",
    );
  }
}

function requireState(
  result: BattleScriptAttackCancelerFactoryObedienceResult,
): Readonly<{
  rulesContext: BattleScriptRulesContext;
  rngValue: number;
  rngCallsConsumed: number;
}> {
  if (
    result === null
    || typeof result !== "object"
    || result.rulesContext === null
    || typeof result.rulesContext !== "object"
    || !Array.isArray(result.rulesContext.battlers)
    || result.rulesContext.battlers.length !== 4
  ) {
    throw new Error(
      "Battle Script Magic Coat join requires a Factory-obedience result",
    );
  }
  result.rulesContext.battlers.forEach(requireProtectState);
  return Object.freeze({
    rulesContext: result.rulesContext,
    rngValue: requireU32(result.rngValue, "Battle Script Magic Coat RNG value"),
    rngCallsConsumed: requireCallCount(result.rngCallsConsumed),
  });
}

function bypassDetails(
  kind: "canceler-effect" | "moves-block" | "selected-move-no-pp",
) {
  if (kind === "canceler-effect") {
    return Object.freeze({
      sourceCondition: "AtkCanceler_UnableToUseMove() != 0" as const,
      reason: "canceler-effect-nonzero" as const,
    });
  }
  if (kind === "moves-block") {
    return Object.freeze({
      sourceCondition:
        "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0) != 0" as const,
      reason: "moves-block-effect-nonzero" as const,
    });
  }
  return Object.freeze({
    sourceCondition: "selected-slot PP admission stopped" as const,
    reason: "selected-move-has-no-pp" as const,
  });
}

/**
 * Pure source-order Magic Coat intercept immediately after Factory obedience.
 *
 * Pressure PP handling is emitted as a typed request for its existing owner;
 * this seam only clears the target's bounceMove bit, pushes the unchanged
 * attackcanceler cursor, and hands off to BattleScript_MagicCoatBounce.
 * Resume-script role swapping and every later intercept remain outside it.
 */
export function joinBattleScriptAttackCancelerMagicCoat(
  factoryObedienceResult: BattleScriptAttackCancelerFactoryObedienceResult,
  scriptCallStack: readonly number[],
  sourceProgramCounter: number,
): BattleScriptAttackCancelerMagicCoatResult {
  if (
    factoryObedienceResult === null
    || typeof factoryObedienceResult !== "object"
  ) {
    throw new Error(
      "Battle Script Magic Coat join requires a Factory-obedience result",
    );
  }
  const sourcePc = requireU32(
    sourceProgramCounter,
    "Battle Script source program counter",
  );
  const stackBefore = freezeScriptCallStack(scriptCallStack);
  const state = requireState(factoryObedienceResult);
  requireComposition(factoryObedienceResult, sourcePc);
  const rng = preserveRngReceipt(state.rngValue, state.rngCallsConsumed);

  if (factoryObedienceResult.kind !== "continue") {
    const bypass = bypassDetails(factoryObedienceResult.kind);
    const stack = preserveStackReceipt(stackBefore);
    return Object.freeze({
      kind: factoryObedienceResult.kind,
      effect: factoryObedienceResult.effect,
      ...state,
      scriptCallStack: stackBefore,
      pressurePpLossRequests: Object.freeze([]),
      receipt: Object.freeze({
        sourceFunction: "Cmd_attackcanceler",
        factoryObedience: factoryObedienceResult.receipt,
        sourceCondition: bypass.sourceCondition,
        magicCoat: Object.freeze({
          kind: "not-checked",
          reason: bypass.reason,
        }),
        programCounter: Object.freeze({
          kind: "preserve-upstream",
          sourceProgramCounter: sourcePc,
          stack,
        }),
        rng,
      }),
    });
  }

  const attacker = state.rulesContext.selectorRoles.attacker;
  const target = state.rulesContext.selectorRoles.target;
  if (attacker === null || target === null) {
    throw new Error(
      "Battle Script Magic Coat join requires attacker and target roles",
    );
  }
  const targetBounceMove = requireProtectState(
    state.rulesContext.battlers[target],
    target,
  );
  const moveData = GENERATED_MOVE_FLAGS.get(state.rulesContext.currentMove);
  if (moveData === undefined) {
    throw new Error(
      `currentMove ${state.rulesContext.currentMove} has no source-derived gBattleMoves flags`,
    );
  }
  const affected = moveData.flags.includes("FLAG_MAGIC_COAT_AFFECTED");
  const intercepted = targetBounceMove === 1 && affected;
  const moveReceipt: BattleScriptMagicCoatMoveReceipt = Object.freeze({
    sourceField: "gBattleMoves[gCurrentMove].flags",
    move: moveData.id,
    sourceSymbol: moveData.move,
    sourceFlags: moveData.flags,
    testedFlag: "FLAG_MAGIC_COAT_AFFECTED",
    affected,
  });

  if (!intercepted) {
    const stack = preserveStackReceipt(stackBefore);
    return Object.freeze({
      kind: "continue",
      effect: 0 as const,
      ...state,
      scriptCallStack: stackBefore,
      pressurePpLossRequests: Object.freeze([]),
      receipt: Object.freeze({
        sourceFunction: "Cmd_attackcanceler",
        factoryObedience: factoryObedienceResult.receipt,
        sourceCondition: "Factory obedience continued",
        attacker,
        target,
        protect: Object.freeze({
          sourceField: "gProtectStructs[gBattlerTarget].bounceMove",
          battler: target,
          before: targetBounceMove,
          after: targetBounceMove,
          cleared: false,
        }),
        move: moveReceipt,
        pressurePpLoss: Object.freeze({
          kind: "not-requested",
          reason: targetBounceMove === 0
            ? "target-bounceMove-not-armed"
            : "move-not-Magic-Coat-affected",
        }),
        programCounter: Object.freeze({
          kind: "preserve",
          sourceProgramCounter: sourcePc,
          continuation: "before-Snatch",
          stack,
        }),
        rng,
      }),
    });
  }

  if (stackBefore.length === 8) {
    throw new Error(
      "Battle Script Magic Coat join cannot push a full BattleScriptsStack",
    );
  }
  const nextTarget = Object.freeze({
    ...state.rulesContext.battlers[target],
    bounceMove: 0 as const,
  });
  const nextBattlers = state.rulesContext.battlers.map((battler, index) =>
    index === target ? nextTarget : battler
  ) as unknown as BattleScriptRulesBattlers;
  Object.freeze(nextBattlers);
  const nextRulesContext = Object.freeze({
    ...state.rulesContext,
    battlers: nextBattlers,
  });
  const pressurePpLoss: BattleScriptPressurePpLossRequest = Object.freeze({
    kind: "delegate",
    sourceFunction: "PressurePPLose",
    arguments: Object.freeze({
      pressureAbilityBattler: Object.freeze({
        sourceArgument: "gBattlerAttacker",
        value: attacker,
      }),
      moveOwnerBattler: Object.freeze({
        sourceArgument: "gBattlerTarget",
        value: target,
      }),
      move: Object.freeze({
        sourceArgument: "MOVE_MAGIC_COAT",
        value: GENERATED_MAGIC_COAT_MOVE_ID,
      }),
    }),
    ownership: "delegated-without-PP-or-controller-mutation",
  });
  const stackAfter = Object.freeze([...stackBefore, sourcePc]);
  const stack: BattleScriptProgramCounterStackReceipt = Object.freeze({
    kind: "push-cursor",
    sourceStruct: "BattleScriptsStack",
    sourceFunction: "BattleScriptPushCursor",
    before: stackBefore,
    pushedProgramCounter: sourcePc,
    after: stackAfter,
    resume: Object.freeze({
      sourceFunction: "BattleScriptPop",
      programCounter: sourcePc,
      continuation: "resume-Cmd_attackcanceler",
    }),
  });

  return Object.freeze({
    kind: "magic-coat",
    effect: 0 as const,
    rulesContext: nextRulesContext,
    rngValue: state.rngValue,
    rngCallsConsumed: state.rngCallsConsumed,
    scriptCallStack: stackAfter,
    pressurePpLossRequests: Object.freeze([pressurePpLoss]),
    receipt: Object.freeze({
      sourceFunction: "Cmd_attackcanceler",
      factoryObedience: factoryObedienceResult.receipt,
      sourceCondition: "Factory obedience continued",
      attacker,
      target,
      protect: Object.freeze({
        sourceField: "gProtectStructs[gBattlerTarget].bounceMove",
        battler: target,
        before: 1,
        after: 0,
        cleared: true,
      }),
      move: moveReceipt,
      pressurePpLoss,
      programCounter: Object.freeze({
        kind: "handoff",
        sourceProgramCounter: sourcePc,
        targetLabel: "BattleScript_MagicCoatBounce",
        stack,
      }),
      rng,
    }),
  });
}
