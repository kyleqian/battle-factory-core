import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  cancelBattleScriptMultiTurnMoves,
  type BattleScriptCancelMultiTurnMovesReceipt,
} from "./battleScriptMultiTurnCancellation.ts";
import { advanceRngValue } from "./rng.ts";
import {
  BATTLE_SCRIPT_ABILITY_EARLY_BIRD,
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_ABILITY_TRUANT,
  BATTLE_SCRIPT_ACTION_FINISHED,
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_EFFECT_THAW_HIT,
  BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP,
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_MOVE_NONE,
  BATTLE_SCRIPT_MOVE_SLEEP_TALK,
  BATTLE_SCRIPT_MOVE_SNORE,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_GRUDGE,
} from "./battleScriptSourceConstants.ts";

export type BattleScriptActionAdmissionCheckpoint =
  | "entry"
  | "after-unable-and-move-block";

export type BattleScriptActionAdmissionReason =
  | "battle-outcome-finished"
  | "fainted-attacker"
  | "selected-move-has-no-pp"
  | "continue-to-unable-to-use-move"
  | "continue-to-obedience";

export type BattleScriptProgramCounterEffect =
  | Readonly<{
    kind: "preserve";
    sourceProgramCounter: number;
  }>
  | Readonly<{
    kind: "jump";
    sourceProgramCounter: number;
    targetLabel: "BattleScript_MoveEnd" | "BattleScript_NoPPForMove";
  }>;

export type BattleScriptCurrentActionEffect =
  | Readonly<{ kind: "preserve" }>
  | Readonly<{
    kind: "set";
    sourceConstant: "B_ACTION_FINISHED";
    value: typeof BATTLE_SCRIPT_ACTION_FINISHED;
  }>;

export type BattleScriptBitFieldEffect = Readonly<{
  before: number;
  after: number;
  addedMask: number;
  clearedMask: number;
}>;

export type BattleScriptActionAdmissionReceipt = Readonly<{
  sourceCheckpoint: BattleScriptActionAdmissionCheckpoint;
  programCounter: BattleScriptProgramCounterEffect;
  currentAction: BattleScriptCurrentActionEffect;
  moveResultFlags: BattleScriptBitFieldEffect;
  hitMarker: BattleScriptBitFieldEffect;
}>;

export type BattleScriptActionAdmissionDecision = Readonly<{
  kind: "stop" | "continue";
  reason: BattleScriptActionAdmissionReason;
  rulesContext: BattleScriptRulesContext;
  receipt: BattleScriptActionAdmissionReceipt;
}>;

export type BattleScriptAttackCancelerTrackerEffect = Readonly<{
  before: number;
  after: number;
  sourcePhaseBefore: "CANCELER_FLAGS";
  sourcePhaseAfter: "CANCELER_ASLEEP";
}>;

export type BattleScriptAttackCancelerFlagsReceipt = Readonly<{
  sourcePhase: "CANCELER_FLAGS";
  attacker: BattleScriptBattlerId;
  status2: BattleScriptBitFieldEffect;
  status3: BattleScriptBitFieldEffect;
  tracker: BattleScriptAttackCancelerTrackerEffect;
}>;

export type BattleScriptAttackCancelerFlagsGateReceipt = Readonly<{
  sourcePhase: "CANCELER_FLAGS";
  tracker: Readonly<{
    before: number;
    after: number;
  }>;
}>;

export type BattleScriptAttackCancelerFlagsDecision =
  | Readonly<{
    kind: "advance";
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerFlagsReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerFlagsGateReceipt;
  }>;

export type BattleScriptAttackCancelerSleepReason =
  | "not-asleep"
  | "sleep-move-allowed"
  | "asleep"
  | "woke-up"
  | "uproar-woke";

export type BattleScriptAttackCancelerScriptEffect =
  | Readonly<{
    kind: "preserve";
    sourceProgramCounter: number;
  }>
  | Readonly<{
    kind: "handoff";
    sourceProgramCounter: number;
    targetLabel:
      | "BattleScript_MoveUsedIsAsleep"
      | "BattleScript_MoveUsedWokeUp"
      | "BattleScript_MoveUsedIsFrozen"
      | "BattleScript_MoveUsedUnfroze"
      | "BattleScript_MoveUsedLoafingAround"
      | "BattleScript_MoveUsedMustRecharge"
      | "BattleScript_MoveUsedFlinched"
      | "BattleScript_MoveUsedIsDisabled"
      | "BattleScript_MoveUsedIsTaunted";
  }>;

export type BattleScriptAttackCancelerCursorEffect =
  | Readonly<{ kind: "preserve" }>
  | Readonly<{
    kind: "push";
    sourceProgramCounter: number;
  }>;

export type BattleScriptAttackCancelerMultistringEffect =
  | Readonly<{ kind: "preserve" }>
  | Readonly<{
    kind: "set";
    sourceConstant:
      | "B_MSG_WOKE_UP"
      | "B_MSG_WOKE_UP_UPROAR"
      | "B_MSG_DEFROSTED";
    value: 0 | 1;
  }>;

export type BattleScriptAttackCancelerStatusControllerEffect =
  | Readonly<{ kind: "none" }>
  | Readonly<{
    kind: "request-status1-write";
    battler: BattleScriptBattlerId;
    sourceRequest: "REQUEST_STATUS_BATTLE";
    offset: 0;
    size: 4;
    value: number;
    markForControllerExecution: true;
  }>;

export type BattleScriptAttackCancelerAsleepReceipt = Readonly<{
  sourcePhase: "CANCELER_ASLEEP";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerSleepReason;
  sleepCounter: Readonly<{
    before: number;
    after: number;
    decrement: 0 | 1 | 2;
  }>;
  uproarScan: Readonly<{
    performed: boolean;
    checkedBattlers: readonly BattleScriptBattlerId[];
    sourceBattler: BattleScriptBattlerId | null;
    blockedBySoundproof: boolean;
    scriptingBattler:
      | Readonly<{ kind: "preserve" }>
      | Readonly<{ kind: "set"; battler: BattleScriptBattlerId }>;
    targetBattler: Readonly<{
      kind: "preserve";
      battler: BattleScriptBattlerId;
      sourceSentinelWrite: "unreachable-at-attack-canceler-entry";
    }>;
    /**
     * UproarWakeUpCheck's chooser write is call-local here: when the target is
     * already a battler it selects one of these relation messages, then
     * CANCELER_ASLEEP overwrites it with B_MSG_WOKE_UP_UPROAR before returning
     * to the script interpreter. No controller or script handoff can observe
     * the intermediate value.
     */
    helperMultistringChooser:
      | Readonly<{
        kind: "not-written";
        reason: "no-uproar-source";
      }>
      | Readonly<{
        kind: "written-then-overwritten";
        targetRelation: "same-as-uproar-source" | "different-from-uproar-source";
        sourceConstant: "B_MSG_CANT_SLEEP_UPROAR" | "B_MSG_UPROAR_KEPT_AWAKE";
        value: 0 | 1;
        overwrittenBeforeHandoffBy: "B_MSG_WOKE_UP_UPROAR";
      }>;
  }>;
  status1: BattleScriptBitFieldEffect;
  status2: BattleScriptBitFieldEffect;
  hitMarker: BattleScriptBitFieldEffect;
  effect: 0 | 2;
  script: BattleScriptAttackCancelerScriptEffect;
  cursor: BattleScriptAttackCancelerCursorEffect;
  multistringChooser: BattleScriptAttackCancelerMultistringEffect;
  statusController: BattleScriptAttackCancelerStatusControllerEffect;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_ASLEEP";
    sourcePhaseAfter: "CANCELER_FROZEN";
  }>;
}>;

export type BattleScriptAttackCancelerAsleepGateReceipt = Readonly<{
  sourcePhase: "CANCELER_ASLEEP";
  tracker: Readonly<{ before: number; after: number }>;
}>;

export type BattleScriptAttackCancelerAsleepDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerSleepReason;
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerAsleepReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerAsleepGateReceipt;
  }>;

export type BattleScriptAttackCancelerFrozenReason =
  | "not-frozen"
  | "frozen"
  | "thaw-hit-allowed"
  | "thawed";

export type BattleScriptAttackCancelerFrozenRngEffect =
  | Readonly<{
    kind: "preserve";
    value: number;
    reason: "attacker-not-frozen";
  }>
  | Readonly<{
    kind: "draw";
    name: "CANCELER_FROZEN_THAW_CHECK";
    sourceCall: "Random";
    modulo: 5;
    before: number;
    after: number;
    randomValue: number;
    remainder: 0 | 1 | 2 | 3 | 4;
  }>;

export type BattleScriptAttackCancelerFrozenReceipt = Readonly<{
  sourcePhase: "CANCELER_FROZEN";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerFrozenReason;
  moveEffect: Readonly<{
    currentMove: number;
    sourceField: "gBattleMoves[gCurrentMove].effect";
    value: number;
    isThawHit: boolean;
  }>;
  rng: BattleScriptAttackCancelerFrozenRngEffect;
  status1: BattleScriptBitFieldEffect;
  hitMarker: BattleScriptBitFieldEffect;
  effect: 0 | 2;
  script: BattleScriptAttackCancelerScriptEffect;
  cursor: BattleScriptAttackCancelerCursorEffect;
  multistringChooser: BattleScriptAttackCancelerMultistringEffect;
  statusController: BattleScriptAttackCancelerStatusControllerEffect;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_FROZEN";
    sourcePhaseAfter: "CANCELER_TRUANT";
  }>;
}>;

export type BattleScriptAttackCancelerFrozenGateReceipt = Readonly<{
  sourcePhase: "CANCELER_FROZEN";
  tracker: Readonly<{ before: number; after: number }>;
  rng: Readonly<{ kind: "preserve"; value: number }>;
}>;

export type BattleScriptAttackCancelerFrozenDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerFrozenReason;
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: BattleScriptAttackCancelerFrozenReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: BattleScriptAttackCancelerFrozenGateReceipt;
  }>;

export type BattleScriptAttackCancelerTruantReason =
  | "not-truant"
  | "truant-active"
  | "truant-idle-turn";

export type BattleScriptAttackCancelerTruantReceipt = Readonly<{
  sourcePhase: "CANCELER_TRUANT";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerTruantReason;
  ability: Readonly<{
    value: number;
    sourceConstant: "ABILITY_TRUANT";
    matches: boolean;
  }>;
  truantCounter: Readonly<{ value: number; isNonzero: boolean }>;
  cancelMultiTurnMoves:
    | Readonly<{ kind: "not-invoked" }>
    | Readonly<{
      kind: "invoked";
      receipt: BattleScriptCancelMultiTurnMovesReceipt;
    }>;
  hitMarker: BattleScriptBitFieldEffect;
  moveResultFlags: BattleScriptBitFieldEffect;
  effect: 0 | 1;
  script: BattleScriptAttackCancelerScriptEffect;
  multistringChooser:
    | Readonly<{ kind: "preserve" }>
    | Readonly<{
      kind: "set";
      sourceConstant: "B_MSG_LOAFING";
      value: 0;
    }>;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_TRUANT";
    sourcePhaseAfter: "CANCELER_RECHARGE";
  }>;
}>;

export type BattleScriptAttackCancelerTruantDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerTruantReason;
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerTruantReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    receipt: Readonly<{
      sourcePhase: "CANCELER_TRUANT";
      tracker: Readonly<{ before: number; after: number }>;
    }>;
  }>;

export type BattleScriptAttackCancelerRechargeReason =
  | "not-recharging"
  | "must-recharge";

export type BattleScriptAttackCancelerRechargeReceipt = Readonly<{
  sourcePhase: "CANCELER_RECHARGE";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerRechargeReason;
  status2: BattleScriptBitFieldEffect;
  rechargeTimer: Readonly<{ before: number; after: number }>;
  cancelMultiTurnMoves:
    | Readonly<{ kind: "not-invoked" }>
    | Readonly<{
      kind: "invoked";
      receipt: BattleScriptCancelMultiTurnMovesReceipt;
    }>;
  hitMarker: BattleScriptBitFieldEffect;
  effect: 0 | 1;
  script: BattleScriptAttackCancelerScriptEffect;
  message:
    | Readonly<{ kind: "preserve" }>
    | Readonly<{
      kind: "script-owned";
      sourceConstant: "STRINGID_PKMNMUSTRECHARGE";
      value: 130;
    }>;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_RECHARGE";
    sourcePhaseAfter: "CANCELER_FLINCH";
  }>;
}>;

export type BattleScriptAttackCancelerRechargeDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerRechargeReason;
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerRechargeReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    receipt: Readonly<{
      sourcePhase: "CANCELER_RECHARGE";
      tracker: Readonly<{ before: number; after: number }>;
    }>;
  }>;

export type BattleScriptAttackCancelerFlinchReason =
  | "not-flinched"
  | "flinched";

export type BattleScriptAttackCancelerFlinchReceipt = Readonly<{
  sourcePhase: "CANCELER_FLINCH";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerFlinchReason;
  status2: BattleScriptBitFieldEffect;
  flinchImmobility: Readonly<{ before: 0 | 1; after: 0 | 1 }>;
  cancelMultiTurnMoves:
    | Readonly<{ kind: "not-invoked" }>
    | Readonly<{
      kind: "invoked";
      receipt: BattleScriptCancelMultiTurnMovesReceipt;
    }>;
  hitMarker: BattleScriptBitFieldEffect;
  effect: 0 | 1;
  script: BattleScriptAttackCancelerScriptEffect;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_FLINCH";
    sourcePhaseAfter: "CANCELER_DISABLED";
  }>;
}>;

export type BattleScriptAttackCancelerFlinchDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerFlinchReason;
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerFlinchReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    receipt: Readonly<{
      sourcePhase: "CANCELER_FLINCH";
      tracker: Readonly<{ before: number; after: number }>;
    }>;
  }>;

export type BattleScriptAttackCancelerDisabledReason =
  | "move-not-disabled"
  | "disabled-move";

export type BattleScriptAttackCancelerDisabledReceipt = Readonly<{
  sourcePhase: "CANCELER_DISABLED";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerDisabledReason;
  disabledMove: Readonly<{
    value: number;
    currentMove: number;
    matchesCurrentMove: boolean;
    isMoveNone: boolean;
  }>;
  usedDisabledMove: Readonly<{ before: 0 | 1; after: 0 | 1 }>;
  scriptingBattler: Readonly<{
    before: BattleScriptBattlerId;
    after: BattleScriptBattlerId;
  }>;
  cancelMultiTurnMoves:
    | Readonly<{ kind: "not-invoked" }>
    | Readonly<{
      kind: "invoked";
      receipt: BattleScriptCancelMultiTurnMovesReceipt;
    }>;
  hitMarker: BattleScriptBitFieldEffect;
  effect: 0 | 1;
  script: BattleScriptAttackCancelerScriptEffect;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_DISABLED";
    sourcePhaseAfter: "CANCELER_TAUNTED";
  }>;
}>;

export type BattleScriptAttackCancelerDisabledDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerDisabledReason;
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerDisabledReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    receipt: Readonly<{
      sourcePhase: "CANCELER_DISABLED";
      tracker: Readonly<{ before: number; after: number }>;
    }>;
  }>;

export type BattleScriptAttackCancelerTauntedReason =
  | "move-not-taunted"
  | "taunted-status-move";

export type BattleScriptAttackCancelerTauntedReceipt = Readonly<{
  sourcePhase: "CANCELER_TAUNTED";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerTauntedReason;
  tauntTimer: Readonly<{ value: number; isNonzero: boolean }>;
  movePower: Readonly<{
    currentMove: number;
    sourceField: "gBattleMoves[gCurrentMove].power";
    value: number;
    isZero: boolean;
  }>;
  usedTauntedMove: Readonly<{ before: 0 | 1; after: 0 | 1 }>;
  cancelMultiTurnMoves:
    | Readonly<{ kind: "not-invoked" }>
    | Readonly<{
      kind: "invoked";
      receipt: BattleScriptCancelMultiTurnMovesReceipt;
    }>;
  hitMarker: BattleScriptBitFieldEffect;
  effect: 0 | 1;
  script: BattleScriptAttackCancelerScriptEffect;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_TAUNTED";
    sourcePhaseAfter: "CANCELER_IMPRISONED";
  }>;
}>;

export type BattleScriptAttackCancelerTauntedDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerTauntedReason;
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerTauntedReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    receipt: Readonly<{
      sourcePhase: "CANCELER_TAUNTED";
      tracker: Readonly<{ before: number; after: number }>;
    }>;
  }>;

function requireSourceProgramCounter(sourceProgramCounter: number): number {
  if (
    !Number.isSafeInteger(sourceProgramCounter)
    || sourceProgramCounter < 0
    || sourceProgramCounter > 0xffff_ffff
  ) {
    throw new Error(
      `Battle Script source program counter must be a u32, got ${sourceProgramCounter}`,
    );
  }
  return sourceProgramCounter;
}

function requireRngValue(rngValue: number): number {
  if (
    !Number.isSafeInteger(rngValue)
    || rngValue < 0
    || rngValue > 0xffff_ffff
  ) {
    throw new Error(`Battle Script RNG value must be a u32, got ${rngValue}`);
  }
  return rngValue >>> 0;
}

function bitFieldEffect(before: number, after: number): BattleScriptBitFieldEffect {
  return Object.freeze({
    before,
    after,
    addedMask: (after & ~before) >>> 0,
    clearedMask: (before & ~after) >>> 0,
  });
}

function makeDecision(
  rulesContext: BattleScriptRulesContext,
  sourceCheckpoint: BattleScriptActionAdmissionCheckpoint,
  kind: BattleScriptActionAdmissionDecision["kind"],
  reason: BattleScriptActionAdmissionReason,
  programCounter: BattleScriptProgramCounterEffect,
  currentAction: BattleScriptCurrentActionEffect,
  nextMoveResultFlags: number,
  nextHitMarker: number,
): BattleScriptActionAdmissionDecision {
  const nextRulesContext = (
    nextMoveResultFlags === rulesContext.moveResultFlags
    && nextHitMarker === rulesContext.hitMarker
  )
    ? rulesContext
    : Object.freeze({
      ...rulesContext,
      moveResultFlags: nextMoveResultFlags,
      hitMarker: nextHitMarker,
    });
  return Object.freeze({
    kind,
    reason,
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      sourceCheckpoint,
      programCounter,
      currentAction,
      moveResultFlags: bitFieldEffect(
        rulesContext.moveResultFlags,
        nextMoveResultFlags,
      ),
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
    }),
  });
}

function preserveProgramCounter(
  sourceProgramCounter: number,
): BattleScriptProgramCounterEffect {
  return Object.freeze({ kind: "preserve", sourceProgramCounter });
}

function preserveCurrentAction(): BattleScriptCurrentActionEffect {
  return Object.freeze({ kind: "preserve" });
}

/**
 * The first source phase of AtkCanceler_UnableToUseMove.
 *
 * This performs exactly CANCELER_FLAGS and stops at CANCELER_ASLEEP. It does
 * not loop, decide whether an action is usable, or execute opcode 0.
 */
export function advanceBattleScriptAttackCancelerFlags(
  rulesContext: BattleScriptRulesContext,
): BattleScriptAttackCancelerFlagsDecision {
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FLAGS
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_FLAGS",
        tracker: Object.freeze({
          before: trackerBefore,
          after: trackerBefore,
        }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler flags phase requires an attacker role",
    );
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const nextStatus2 = (
    sourceBattler.status2
    & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND
  ) >>> 0;
  const nextStatus3 = (
    sourceBattler.status3
    & ~BATTLE_SCRIPT_STATUS3_GRUDGE
  ) >>> 0;
  const battlerChanged = (
    nextStatus2 !== sourceBattler.status2
    || nextStatus3 !== sourceBattler.status3
  );
  const nextBattler = battlerChanged
    ? Object.freeze({
      ...sourceBattler,
      status2: nextStatus2,
      status3: nextStatus3,
    })
    : sourceBattler;
  const nextBattlers = battlerChanged
    ? Object.freeze(
      rulesContext.battlers.map((battler, index) => (
        index === attacker ? nextBattler : battler
      )),
    ) as unknown as BattleScriptRulesContext["battlers"]
    : rulesContext.battlers;
  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_ASLEEP;
  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battlers: nextBattlers,
    atkCancelerTracker: trackerAfter,
  });

  return Object.freeze({
    kind: "advance",
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_FLAGS",
      attacker,
      status2: bitFieldEffect(sourceBattler.status2, nextStatus2),
      status3: bitFieldEffect(sourceBattler.status3, nextStatus3),
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_FLAGS",
        sourcePhaseAfter: "CANCELER_ASLEEP",
      }),
    }),
  });
}

/**
 * The source-shaped CANCELER_ASLEEP phase of AtkCanceler_UnableToUseMove.
 *
 * It returns the script/cursor/controller handoff as typed effects and stops
 * after advancing the tracker to CANCELER_FROZEN. It does not apply those
 * external effects, loop into freeze, or execute ATTACKCANCELER opcode 0.
 *
 * HandleAction_UseMove selects gBattlerTarget before it installs the move
 * effect script containing attackcanceler. Therefore UproarWakeUpCheck's
 * generic `gBattlerTarget == 0xFF` repair branch is unreachable at this call;
 * a missing target is rejected rather than modeled as a legal phase state.
 */
export function advanceBattleScriptAttackCancelerAsleep(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerAsleepDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_ASLEEP
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_ASLEEP",
        tracker: Object.freeze({
          before: trackerBefore,
          after: trackerBefore,
        }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler asleep phase requires an attacker role",
    );
  }

  const sourceBattler = rulesContext.battlers[attacker];
  const targetBefore = rulesContext.selectorRoles.target;
  if (targetBefore === null) {
    throw new Error(
      "Battle Script attack canceler asleep phase requires the target selected by HandleAction_UseMove",
    );
  }
  const sleepBefore = sourceBattler.status1 & BATTLE_SCRIPT_STATUS1_SLEEP;
  const checkedBattlers: BattleScriptBattlerId[] = [];
  let uproarSource: BattleScriptBattlerId | null = null;
  const blockedBySoundproof = (
    sleepBefore !== 0
    && sourceBattler.ability === BATTLE_SCRIPT_ABILITY_SOUNDPROOF
  );
  if (sleepBefore !== 0) {
    for (let battler = 0; battler < rulesContext.battlers.length; battler += 1) {
      const battlerId = battler as BattleScriptBattlerId;
      checkedBattlers.push(battlerId);
      if (
        !blockedBySoundproof
        && (
          rulesContext.battlers[battlerId].status2
          & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR
        ) !== 0
      ) {
        uproarSource = battlerId;
        break;
      }
    }
  }

  let reason: BattleScriptAttackCancelerSleepReason = "not-asleep";
  let sleepDecrement: 0 | 1 | 2 = 0;
  let nextStatus1 = sourceBattler.status1;
  let nextStatus2 = sourceBattler.status2;
  let nextHitMarker = rulesContext.hitMarker;
  let effect: 0 | 2 = 0;
  let script: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });
  let cursor: BattleScriptAttackCancelerCursorEffect = Object.freeze({
    kind: "preserve",
  });
  let multistringChooser: BattleScriptAttackCancelerMultistringEffect =
    Object.freeze({ kind: "preserve" });

  if (sleepBefore !== 0 && uproarSource !== null) {
    reason = "uproar-woke";
    nextStatus1 = (
      sourceBattler.status1
      & ~BATTLE_SCRIPT_STATUS1_SLEEP
    ) >>> 0;
    nextStatus2 = (
      sourceBattler.status2
      & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE
    ) >>> 0;
    effect = 2;
    script = Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_MoveUsedWokeUp",
    });
    cursor = Object.freeze({ kind: "push", sourceProgramCounter: sourcePc });
    multistringChooser = Object.freeze({
      kind: "set",
      sourceConstant: "B_MSG_WOKE_UP_UPROAR",
      value: 1,
    });
  } else if (sleepBefore !== 0) {
    sleepDecrement = sourceBattler.ability === BATTLE_SCRIPT_ABILITY_EARLY_BIRD
      ? 2
      : 1;
    nextStatus1 = sleepBefore < sleepDecrement
      ? (sourceBattler.status1 & ~BATTLE_SCRIPT_STATUS1_SLEEP) >>> 0
      : (sourceBattler.status1 - sleepDecrement) >>> 0;
    const sleepAfterDecrement = nextStatus1 & BATTLE_SCRIPT_STATUS1_SLEEP;
    if (sleepAfterDecrement !== 0) {
      if (
        rulesContext.currentMove === BATTLE_SCRIPT_MOVE_SNORE
        || rulesContext.currentMove === BATTLE_SCRIPT_MOVE_SLEEP_TALK
      ) {
        reason = "sleep-move-allowed";
      } else {
        reason = "asleep";
        effect = 2;
        nextHitMarker = (
          rulesContext.hitMarker
          | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
        ) >>> 0;
        script = Object.freeze({
          kind: "handoff",
          sourceProgramCounter: sourcePc,
          targetLabel: "BattleScript_MoveUsedIsAsleep",
        });
      }
    } else {
      reason = "woke-up";
      nextStatus2 = (
        sourceBattler.status2
        & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE
      ) >>> 0;
      effect = 2;
      script = Object.freeze({
        kind: "handoff",
        sourceProgramCounter: sourcePc,
        targetLabel: "BattleScript_MoveUsedWokeUp",
      });
      cursor = Object.freeze({ kind: "push", sourceProgramCounter: sourcePc });
      multistringChooser = Object.freeze({
        kind: "set",
        sourceConstant: "B_MSG_WOKE_UP",
        value: 0,
      });
    }
  }

  const battlerChanged = (
    nextStatus1 !== sourceBattler.status1
    || nextStatus2 !== sourceBattler.status2
  );
  const nextBattler = battlerChanged
    ? Object.freeze({
      ...sourceBattler,
      status1: nextStatus1,
      status2: nextStatus2,
    })
    : sourceBattler;
  const nextBattlers = battlerChanged
    ? Object.freeze(
      rulesContext.battlers.map((candidate, index) => (
        index === attacker ? nextBattler : candidate
      )),
    ) as unknown as BattleScriptRulesContext["battlers"]
    : rulesContext.battlers;
  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FROZEN;
  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battlers: nextBattlers,
    atkCancelerTracker: trackerAfter,
    hitMarker: nextHitMarker,
  });
  const statusController: BattleScriptAttackCancelerStatusControllerEffect =
    effect === 2
      ? Object.freeze({
        kind: "request-status1-write",
        battler: attacker,
        sourceRequest: "REQUEST_STATUS_BATTLE",
        offset: 0,
        size: 4,
        value: nextStatus1,
        markForControllerExecution: true,
      })
      : Object.freeze({ kind: "none" });

  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_ASLEEP",
      attacker,
      reason,
      sleepCounter: Object.freeze({
        before: sleepBefore,
        after: nextStatus1 & BATTLE_SCRIPT_STATUS1_SLEEP,
        decrement: sleepDecrement,
      }),
      uproarScan: Object.freeze({
        performed: sleepBefore !== 0,
        checkedBattlers: Object.freeze(checkedBattlers),
        sourceBattler: uproarSource,
        blockedBySoundproof,
        scriptingBattler: uproarSource === null
          ? Object.freeze({ kind: "preserve" })
          : Object.freeze({ kind: "set", battler: uproarSource }),
        targetBattler: Object.freeze({
          kind: "preserve",
          battler: targetBefore,
          sourceSentinelWrite: "unreachable-at-attack-canceler-entry",
        }),
        helperMultistringChooser: uproarSource === null
          ? Object.freeze({
            kind: "not-written",
            reason: "no-uproar-source",
          })
          : targetBefore === uproarSource
              ? Object.freeze({
                kind: "written-then-overwritten",
                targetRelation: "same-as-uproar-source",
                sourceConstant: "B_MSG_CANT_SLEEP_UPROAR",
                value: 0,
                overwrittenBeforeHandoffBy: "B_MSG_WOKE_UP_UPROAR",
              })
              : Object.freeze({
                kind: "written-then-overwritten",
                targetRelation: "different-from-uproar-source",
                sourceConstant: "B_MSG_UPROAR_KEPT_AWAKE",
                value: 1,
                overwrittenBeforeHandoffBy: "B_MSG_WOKE_UP_UPROAR",
              }),
      }),
      status1: bitFieldEffect(sourceBattler.status1, nextStatus1),
      status2: bitFieldEffect(sourceBattler.status2, nextStatus2),
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      effect,
      script,
      cursor,
      multistringChooser,
      statusController,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_ASLEEP",
        sourcePhaseAfter: "CANCELER_FROZEN",
      }),
    }),
  });
}

/**
 * The source-shaped CANCELER_FROZEN phase of AtkCanceler_UnableToUseMove.
 *
 * This consumes exactly the source's one conditional Random() draw, records
 * every script/controller side effect as an immutable receipt, and stops at
 * CANCELER_TRUANT. It neither loops the attack canceler nor executes opcode 0.
 */
export function advanceBattleScriptAttackCancelerFrozen(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
  rngValue: number,
): BattleScriptAttackCancelerFrozenDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const sourceRng = requireRngValue(rngValue);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FROZEN
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      rngValue: sourceRng,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_FROZEN",
        tracker: Object.freeze({
          before: trackerBefore,
          after: trackerBefore,
        }),
        rng: Object.freeze({ kind: "preserve", value: sourceRng }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler frozen phase requires an attacker role",
    );
  }

  const sourceBattler = rulesContext.battlers[attacker];
  const isFrozen = (
    sourceBattler.status1
    & BATTLE_SCRIPT_STATUS1_FREEZE
  ) !== 0;
  const isThawHit = (
    rulesContext.currentMoveEffect
    === BATTLE_SCRIPT_EFFECT_THAW_HIT
  );
  let reason: BattleScriptAttackCancelerFrozenReason = "not-frozen";
  let nextRng = sourceRng;
  let rng: BattleScriptAttackCancelerFrozenRngEffect = Object.freeze({
    kind: "preserve",
    value: sourceRng,
    reason: "attacker-not-frozen",
  });
  let nextStatus1 = sourceBattler.status1;
  let nextHitMarker = rulesContext.hitMarker;
  let effect: 0 | 2 = 0;
  let script: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });
  let cursor: BattleScriptAttackCancelerCursorEffect = Object.freeze({
    kind: "preserve",
  });
  let multistringChooser: BattleScriptAttackCancelerMultistringEffect =
    Object.freeze({ kind: "preserve" });

  if (isFrozen) {
    nextRng = advanceRngValue(sourceRng);
    const randomValue = (nextRng >>> 16) & 0xffff;
    const remainder = (randomValue % 5) as 0 | 1 | 2 | 3 | 4;
    rng = Object.freeze({
      kind: "draw",
      name: "CANCELER_FROZEN_THAW_CHECK",
      sourceCall: "Random",
      modulo: 5,
      before: sourceRng,
      after: nextRng,
      randomValue,
      remainder,
    });
    if (remainder !== 0) {
      if (isThawHit) {
        reason = "thaw-hit-allowed";
      } else {
        reason = "frozen";
        effect = 2;
        nextHitMarker = (
          rulesContext.hitMarker
          | BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING
        ) >>> 0;
        script = Object.freeze({
          kind: "handoff",
          sourceProgramCounter: sourcePc,
          targetLabel: "BattleScript_MoveUsedIsFrozen",
        });
      }
    } else {
      reason = "thawed";
      effect = 2;
      nextStatus1 = (
        sourceBattler.status1
        & ~BATTLE_SCRIPT_STATUS1_FREEZE
      ) >>> 0;
      script = Object.freeze({
        kind: "handoff",
        sourceProgramCounter: sourcePc,
        targetLabel: "BattleScript_MoveUsedUnfroze",
      });
      cursor = Object.freeze({ kind: "push", sourceProgramCounter: sourcePc });
      multistringChooser = Object.freeze({
        kind: "set",
        sourceConstant: "B_MSG_DEFROSTED",
        value: 0,
      });
    }
  }

  const battlerChanged = nextStatus1 !== sourceBattler.status1;
  const nextBattler = battlerChanged
    ? Object.freeze({ ...sourceBattler, status1: nextStatus1 })
    : sourceBattler;
  const nextBattlers = battlerChanged
    ? Object.freeze(
      rulesContext.battlers.map((candidate, index) => (
        index === attacker ? nextBattler : candidate
      )),
    ) as unknown as BattleScriptRulesContext["battlers"]
    : rulesContext.battlers;
  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TRUANT;
  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battlers: nextBattlers,
    atkCancelerTracker: trackerAfter,
    hitMarker: nextHitMarker,
  });
  // CANCELER_FROZEN mutates only gBattleMons on thaw. Unlike the preceding
  // sleep phase, it never emits REQUEST_STATUS_BATTLE; the selected
  // BattleScript_MoveUsedUnfroze later owns the status-icon presentation.
  const statusController: BattleScriptAttackCancelerStatusControllerEffect =
    Object.freeze({ kind: "none" });

  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    rngValue: nextRng,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_FROZEN",
      attacker,
      reason,
      moveEffect: Object.freeze({
        currentMove: rulesContext.currentMove,
        sourceField: "gBattleMoves[gCurrentMove].effect",
        value: rulesContext.currentMoveEffect,
        isThawHit,
      }),
      rng,
      status1: bitFieldEffect(sourceBattler.status1, nextStatus1),
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      effect,
      script,
      cursor,
      multistringChooser,
      statusController,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_FROZEN",
        sourcePhaseAfter: "CANCELER_TRUANT",
      }),
    }),
  });
}

/**
 * The source-shaped CANCELER_TRUANT phase of AtkCanceler_UnableToUseMove.
 *
 * CancelMultiTurnMoves is owned by the taken Truant branch. This advances
 * exactly once to CANCELER_RECHARGE and does not loop or execute opcode 0.
 */
export function advanceBattleScriptAttackCancelerTruant(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerTruantDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TRUANT
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_TRUANT",
        tracker: Object.freeze({
          before: trackerBefore,
          after: trackerBefore,
        }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler truant phase requires an attacker role",
    );
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const abilityMatches = sourceBattler.ability === BATTLE_SCRIPT_ABILITY_TRUANT;
  const counterIsNonzero = sourceBattler.truantCounter !== 0;
  const isLoafing = abilityMatches && counterIsNonzero;
  const reason: BattleScriptAttackCancelerTruantReason = !abilityMatches
    ? "not-truant"
    : counterIsNonzero
      ? "truant-active"
      : "truant-idle-turn";

  let helperResult: ReturnType<typeof cancelBattleScriptMultiTurnMoves> | null =
    null;
  let nextRulesContext = rulesContext;
  let nextHitMarker = rulesContext.hitMarker;
  let nextMoveResultFlags = rulesContext.moveResultFlags;
  let effect: 0 | 1 = 0;
  let script: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });
  let multistringChooser:
    BattleScriptAttackCancelerTruantReceipt["multistringChooser"] =
      Object.freeze({ kind: "preserve" });

  if (isLoafing) {
    helperResult = cancelBattleScriptMultiTurnMoves(rulesContext, attacker);
    nextRulesContext = helperResult.rulesContext;
    nextHitMarker = (
      rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
    ) >>> 0;
    nextMoveResultFlags = (
      rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED
    ) >>> 0;
    effect = 1;
    script = Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_MoveUsedLoafingAround",
    });
    multistringChooser = Object.freeze({
      kind: "set",
      sourceConstant: "B_MSG_LOAFING",
      value: 0,
    });
  }

  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_RECHARGE;
  nextRulesContext = Object.freeze({
    ...nextRulesContext,
    atkCancelerTracker: trackerAfter,
    hitMarker: nextHitMarker,
    moveResultFlags: nextMoveResultFlags,
  });

  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_TRUANT",
      attacker,
      reason,
      ability: Object.freeze({
        value: sourceBattler.ability,
        sourceConstant: "ABILITY_TRUANT",
        matches: abilityMatches,
      }),
      truantCounter: Object.freeze({
        value: sourceBattler.truantCounter,
        isNonzero: counterIsNonzero,
      }),
      cancelMultiTurnMoves: helperResult === null
        ? Object.freeze({ kind: "not-invoked" })
        : Object.freeze({
          kind: "invoked",
          receipt: helperResult.receipt,
        }),
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      moveResultFlags: bitFieldEffect(
        rulesContext.moveResultFlags,
        nextMoveResultFlags,
      ),
      effect,
      script,
      multistringChooser,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_TRUANT",
        sourcePhaseAfter: "CANCELER_RECHARGE",
      }),
    }),
  });
}

/**
 * The source-shaped CANCELER_RECHARGE phase of AtkCanceler_UnableToUseMove.
 *
 * The taken branch clears recharge state before invoking
 * CancelMultiTurnMoves, then advances exactly once to CANCELER_FLINCH.
 */
export function advanceBattleScriptAttackCancelerRecharge(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerRechargeDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_RECHARGE
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_RECHARGE",
        tracker: Object.freeze({
          before: trackerBefore,
          after: trackerBefore,
        }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler recharge phase requires an attacker role",
    );
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const isRecharging = (
    sourceBattler.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
  ) !== 0;
  const nextStatus2 = isRecharging
    ? (
      sourceBattler.status2
      & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
    ) >>> 0
    : sourceBattler.status2;
  let nextRulesContext = rulesContext;
  let helperResult: ReturnType<typeof cancelBattleScriptMultiTurnMoves> | null =
    null;
  let nextHitMarker = rulesContext.hitMarker;
  let effect: 0 | 1 = 0;
  let script: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });
  let message: BattleScriptAttackCancelerRechargeReceipt["message"] =
    Object.freeze({ kind: "preserve" });

  if (isRecharging) {
    const clearedBattler = Object.freeze({
      ...sourceBattler,
      status2: nextStatus2,
      rechargeTimer: 0,
    });
    const clearedBattlers = Object.freeze(
      rulesContext.battlers.map((candidate, index) => (
        index === attacker ? clearedBattler : candidate
      )),
    ) as unknown as BattleScriptRulesContext["battlers"];
    const clearedRulesContext = Object.freeze({
      ...rulesContext,
      battlers: clearedBattlers,
    });
    helperResult = cancelBattleScriptMultiTurnMoves(
      clearedRulesContext,
      attacker,
    );
    nextRulesContext = helperResult.rulesContext;
    nextHitMarker = (
      rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
    ) >>> 0;
    effect = 1;
    script = Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_MoveUsedMustRecharge",
    });
    message = Object.freeze({
      kind: "script-owned",
      sourceConstant: "STRINGID_PKMNMUSTRECHARGE",
      value: 130,
    });
  }

  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FLINCH;
  nextRulesContext = Object.freeze({
    ...nextRulesContext,
    atkCancelerTracker: trackerAfter,
    hitMarker: nextHitMarker,
  });
  return Object.freeze({
    kind: "advance",
    reason: isRecharging ? "must-recharge" : "not-recharging",
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_RECHARGE",
      attacker,
      reason: isRecharging ? "must-recharge" : "not-recharging",
      status2: bitFieldEffect(sourceBattler.status2, nextStatus2),
      rechargeTimer: Object.freeze({
        before: sourceBattler.rechargeTimer,
        after: isRecharging ? 0 : sourceBattler.rechargeTimer,
      }),
      cancelMultiTurnMoves: helperResult === null
        ? Object.freeze({ kind: "not-invoked" })
        : Object.freeze({
          kind: "invoked",
          receipt: helperResult.receipt,
        }),
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      effect,
      script,
      message,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_RECHARGE",
        sourcePhaseAfter: "CANCELER_FLINCH",
      }),
    }),
  });
}

/**
 * The source-shaped CANCELER_FLINCH phase of AtkCanceler_UnableToUseMove.
 *
 * The taken branch clears only STATUS2_FLINCHED and sets the one-bit
 * ProtectStruct flag before invoking CancelMultiTurnMoves. This advances
 * exactly once to CANCELER_DISABLED and does not implement that phase, loop,
 * select a message, or execute opcode 0.
 */
export function advanceBattleScriptAttackCancelerFlinch(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerFlinchDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FLINCH
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_FLINCH",
        tracker: Object.freeze({
          before: trackerBefore,
          after: trackerBefore,
        }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler flinch phase requires an attacker role",
    );
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const isFlinched = (
    sourceBattler.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED
  ) !== 0;
  const nextStatus2 = isFlinched
    ? (
      sourceBattler.status2
      & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED
    ) >>> 0
    : sourceBattler.status2;
  let nextRulesContext = rulesContext;
  let helperResult: ReturnType<typeof cancelBattleScriptMultiTurnMoves> | null =
    null;
  let nextHitMarker = rulesContext.hitMarker;
  let effect: 0 | 1 = 0;
  let script: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });

  if (isFlinched) {
    const clearedBattler = Object.freeze({
      ...sourceBattler,
      status2: nextStatus2,
      flinchImmobility: 1 as const,
    });
    const clearedBattlers = Object.freeze(
      rulesContext.battlers.map((candidate, index) => (
        index === attacker ? clearedBattler : candidate
      )),
    ) as unknown as BattleScriptRulesContext["battlers"];
    const clearedRulesContext = Object.freeze({
      ...rulesContext,
      battlers: clearedBattlers,
    });
    helperResult = cancelBattleScriptMultiTurnMoves(
      clearedRulesContext,
      attacker,
    );
    nextRulesContext = helperResult.rulesContext;
    nextHitMarker = (
      rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
    ) >>> 0;
    effect = 1;
    script = Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_MoveUsedFlinched",
    });
  }

  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_DISABLED;
  nextRulesContext = Object.freeze({
    ...nextRulesContext,
    atkCancelerTracker: trackerAfter,
    hitMarker: nextHitMarker,
  });
  return Object.freeze({
    kind: "advance",
    reason: isFlinched ? "flinched" : "not-flinched",
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_FLINCH",
      attacker,
      reason: isFlinched ? "flinched" : "not-flinched",
      status2: bitFieldEffect(sourceBattler.status2, nextStatus2),
      flinchImmobility: Object.freeze({
        before: sourceBattler.flinchImmobility,
        after: isFlinched ? 1 : sourceBattler.flinchImmobility,
      }),
      cancelMultiTurnMoves: helperResult === null
        ? Object.freeze({ kind: "not-invoked" })
        : Object.freeze({
          kind: "invoked",
          receipt: helperResult.receipt,
        }),
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      effect,
      script,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_FLINCH",
        sourcePhaseAfter: "CANCELER_DISABLED",
      }),
    }),
  });
}

/**
 * The source-shaped CANCELER_DISABLED phase of AtkCanceler_UnableToUseMove.
 *
 * This ports battle_util.c's disabled-move case only, including persistent
 * gBattleScripting.battler ownership, then advances exactly once to
 * CANCELER_TAUNTED without implementing it or looping phases.
 */
export function advanceBattleScriptAttackCancelerDisabled(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerDisabledDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_DISABLED
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_DISABLED",
        tracker: Object.freeze({ before: trackerBefore, after: trackerBefore }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler disabled phase requires an attacker role",
    );
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const matchesCurrentMove = sourceBattler.disabledMove === rulesContext.currentMove;
  const isMoveNone = sourceBattler.disabledMove === BATTLE_SCRIPT_MOVE_NONE;
  const isDisabled = matchesCurrentMove && !isMoveNone;
  let nextRulesContext = rulesContext;
  let helperResult: ReturnType<typeof cancelBattleScriptMultiTurnMoves> | null =
    null;
  let nextHitMarker = rulesContext.hitMarker;
  let effect: 0 | 1 = 0;
  let script: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });

  if (isDisabled) {
    const flaggedBattler = Object.freeze({
      ...sourceBattler,
      usedDisabledMove: 1 as const,
    });
    const flaggedBattlers = Object.freeze(
      rulesContext.battlers.map((candidate, index) => (
        index === attacker ? flaggedBattler : candidate
      )),
    ) as unknown as BattleScriptRulesContext["battlers"];
    const scriptedRulesContext = Object.freeze({
      ...rulesContext,
      battlers: flaggedBattlers,
      scriptingBattler: attacker,
    });
    helperResult = cancelBattleScriptMultiTurnMoves(
      scriptedRulesContext,
      attacker,
    );
    nextRulesContext = helperResult.rulesContext;
    nextHitMarker = (
      rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
    ) >>> 0;
    effect = 1;
    script = Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_MoveUsedIsDisabled",
    });
  }

  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TAUNTED;
  nextRulesContext = Object.freeze({
    ...nextRulesContext,
    atkCancelerTracker: trackerAfter,
    hitMarker: nextHitMarker,
  });
  return Object.freeze({
    kind: "advance",
    reason: isDisabled ? "disabled-move" : "move-not-disabled",
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_DISABLED",
      attacker,
      reason: isDisabled ? "disabled-move" : "move-not-disabled",
      disabledMove: Object.freeze({
        value: sourceBattler.disabledMove,
        currentMove: rulesContext.currentMove,
        matchesCurrentMove,
        isMoveNone,
      }),
      usedDisabledMove: Object.freeze({
        before: sourceBattler.usedDisabledMove,
        after: isDisabled ? 1 : sourceBattler.usedDisabledMove,
      }),
      scriptingBattler: Object.freeze({
        before: rulesContext.scriptingBattler,
        after: isDisabled ? attacker : rulesContext.scriptingBattler,
      }),
      cancelMultiTurnMoves: helperResult === null
        ? Object.freeze({ kind: "not-invoked" })
        : Object.freeze({ kind: "invoked", receipt: helperResult.receipt }),
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      effect,
      script,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_DISABLED",
        sourcePhaseAfter: "CANCELER_TAUNTED",
      }),
    }),
  });
}

/**
 * The source-shaped CANCELER_TAUNTED phase of AtkCanceler_UnableToUseMove.
 * Ports battle_util.c lines 2134-2145 and stops at CANCELER_IMPRISONED.
 */
export function advanceBattleScriptAttackCancelerTaunted(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerTauntedDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (trackerBefore !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TAUNTED) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_TAUNTED",
        tracker: Object.freeze({ before: trackerBefore, after: trackerBefore }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler taunted phase requires an attacker role",
    );
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const isTaunted = sourceBattler.tauntTimer !== 0;
  const isStatusMove = rulesContext.currentMovePower === 0;
  const taken = isTaunted && isStatusMove;
  let nextRulesContext = rulesContext;
  let helperResult: ReturnType<typeof cancelBattleScriptMultiTurnMoves> | null = null;
  let nextHitMarker = rulesContext.hitMarker;
  let script: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });

  if (taken) {
    const flaggedBattler = Object.freeze({
      ...sourceBattler,
      usedTauntedMove: 1 as const,
    });
    const flaggedBattlers = Object.freeze(
      rulesContext.battlers.map((candidate, index) => (
        index === attacker ? flaggedBattler : candidate
      )),
    ) as unknown as BattleScriptRulesContext["battlers"];
    helperResult = cancelBattleScriptMultiTurnMoves(
      Object.freeze({ ...rulesContext, battlers: flaggedBattlers }),
      attacker,
    );
    nextRulesContext = helperResult.rulesContext;
    nextHitMarker = (
      rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
    ) >>> 0;
    script = Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_MoveUsedIsTaunted",
    });
  }

  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IMPRISONED;
  nextRulesContext = Object.freeze({
    ...nextRulesContext,
    atkCancelerTracker: trackerAfter,
    hitMarker: nextHitMarker,
  });
  const reason = taken ? "taunted-status-move" : "move-not-taunted";
  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_TAUNTED",
      attacker,
      reason,
      tauntTimer: Object.freeze({
        value: sourceBattler.tauntTimer,
        isNonzero: isTaunted,
      }),
      movePower: Object.freeze({
        currentMove: rulesContext.currentMove,
        sourceField: "gBattleMoves[gCurrentMove].power",
        value: rulesContext.currentMovePower,
        isZero: isStatusMove,
      }),
      usedTauntedMove: Object.freeze({
        before: sourceBattler.usedTauntedMove,
        after: taken ? 1 : sourceBattler.usedTauntedMove,
      }),
      cancelMultiTurnMoves: helperResult === null
        ? Object.freeze({ kind: "not-invoked" })
        : Object.freeze({ kind: "invoked", receipt: helperResult.receipt }),
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      effect: taken ? 1 : 0,
      script,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_TAUNTED",
        sourcePhaseAfter: "CANCELER_IMPRISONED",
      }),
    }),
  });
}

/**
 * The two checks at Cmd_attackcanceler's source entry.
 *
 * A continuing result hands off to AtkCanceler_UnableToUseMove; it does not
 * skip or claim that helper, the move-block ability phase, or opcode 0.
 */
export function preflightBattleScriptActionEntry(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
): BattleScriptActionAdmissionDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  if (rulesContext.battleOutcome !== 0) {
    return makeDecision(
      rulesContext,
      "entry",
      "stop",
      "battle-outcome-finished",
      preserveProgramCounter(sourcePc),
      Object.freeze({
        kind: "set",
        sourceConstant: "B_ACTION_FINISHED",
        value: BATTLE_SCRIPT_ACTION_FINISHED,
      }),
      rulesContext.moveResultFlags,
      rulesContext.hitMarker,
    );
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error("Battle Script action admission requires an attacker role");
  }
  if (
    rulesContext.battlers[attacker].hp === 0
    && (
      rulesContext.hitMarker
      & BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING
    ) === 0
  ) {
    return makeDecision(
      rulesContext,
      "entry",
      "stop",
      "fainted-attacker",
      Object.freeze({
        kind: "jump",
        sourceProgramCounter: sourcePc,
        targetLabel: "BattleScript_MoveEnd",
      }),
      preserveCurrentAction(),
      rulesContext.moveResultFlags,
      (
        rulesContext.hitMarker
        | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
      ) >>> 0,
    );
  }

  return makeDecision(
    rulesContext,
    "entry",
    "continue",
    "continue-to-unable-to-use-move",
    preserveProgramCounter(sourcePc),
    preserveCurrentAction(),
    rulesContext.moveResultFlags,
    rulesContext.hitMarker,
  );
}

/**
 * The selected-slot PP check reached only after the unable-to-use helper and
 * ABILITYEFFECT_MOVES_BLOCK have both continued.
 *
 * The continuing receipt includes the immediately following source clear of
 * HITMARKER_ALLOW_NO_PP, then hands off to obedience. Nothing here performs
 * PP deduction.
 */
export function preflightBattleScriptSelectedMovePp(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
): BattleScriptActionAdmissionDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error("Battle Script selected-move PP admission requires an attacker role");
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const blocksForNoPp = (
    sourceBattler.pp[rulesContext.currentMovePosition] === 0
    && rulesContext.currentMove !== BATTLE_SCRIPT_MOVE_STRUGGLE
    && (
      rulesContext.hitMarker
      & (
        BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP
        | BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING
      )
    ) === 0
    && (
      sourceBattler.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
    ) === 0
  );
  if (blocksForNoPp) {
    return makeDecision(
      rulesContext,
      "after-unable-and-move-block",
      "stop",
      "selected-move-has-no-pp",
      Object.freeze({
        kind: "jump",
        sourceProgramCounter: sourcePc,
        targetLabel: "BattleScript_NoPPForMove",
      }),
      preserveCurrentAction(),
      (
        rulesContext.moveResultFlags
        | BATTLE_SCRIPT_MOVE_RESULT_MISSED
      ) >>> 0,
      rulesContext.hitMarker,
    );
  }

  return makeDecision(
    rulesContext,
    "after-unable-and-move-block",
    "continue",
    "continue-to-obedience",
    preserveProgramCounter(sourcePc),
    preserveCurrentAction(),
    rulesContext.moveResultFlags,
    (
      rulesContext.hitMarker
      & ~BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP
    ) >>> 0,
  );
}
