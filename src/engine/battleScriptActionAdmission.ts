import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  BATTLE_SCRIPT_HOLD_EFFECT_CHOICE_BAND,
  resolveBattleScriptBattlerHoldEffect,
  resolveBattleScriptCurrentMoveEffect,
  resolveBattleScriptCurrentMovePower,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  cancelBattleScriptMultiTurnMoves,
  type BattleScriptCancelMultiTurnMovesReceipt,
} from "./battleScriptMultiTurnCancellation.ts";
import { advanceRngValue } from "./rng.ts";
import {
  calculateBaseDamage,
  NEUTRAL_STAT_STAGES,
} from "./damageCalc.ts";
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
  BATTLE_SCRIPT_MOVE_BIDE,
  BATTLE_SCRIPT_MOVE_LIMITATIONS,
  BATTLE_SCRIPT_MOVE_POUND,
  BATTLE_SCRIPT_MOVE_SLEEP_TALK,
  BATTLE_SCRIPT_MOVE_SNORE,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
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
      | "BattleScript_MoveUsedIsTaunted"
      | "BattleScript_MoveUsedIsImprisoned"
      | "BattleScript_MoveUsedIsConfused"
      | "BattleScript_MoveUsedIsConfusedNoMore"
      | "BattleScript_MoveUsedIsParalyzed"
      | "BattleScript_MoveUsedIsInLove"
      | "BattleScript_BideStoringEnergy"
      | "BattleScript_BideAttack"
      | "BattleScript_BideNoEnergyToAttack";
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
      | "B_MSG_DEFROSTED"
      | "B_MSG_DEFROSTED_BY_MOVE"
      | "FALSE"
      | "TRUE";
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

export type BattleScriptImprisonedMovesScanBattler = Readonly<{
  battler: BattleScriptBattlerId;
  side: 0 | 1;
  isOpposing: boolean;
  status3: number;
  hasImprisonedOthers: boolean;
  moves: readonly [number, number, number, number];
  checkedMoveSlots: readonly number[];
  matchingMoveSlot: number | null;
  contributes: boolean;
}>;

export type BattleScriptImprisonedMovesScan = Readonly<{
  attacker: BattleScriptBattlerId;
  attackerSide: 0 | 1;
  move: number;
  checkedBattlers: readonly BattleScriptImprisonedMovesScanBattler[];
  imprisonedMovesCount: number;
  isImprisoned: boolean;
}>;

export type BattleScriptAttackCancelerImprisonedReason =
  | "move-not-imprisoned"
  | "imprisoned-move";

export type BattleScriptAttackCancelerImprisonedReceipt = Readonly<{
  sourcePhase: "CANCELER_IMPRISONED";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerImprisonedReason;
  imprisonedMoves: BattleScriptImprisonedMovesScan;
  usedImprisonedMove: Readonly<{ before: 0 | 1; after: 0 | 1 }>;
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
    sourcePhaseBefore: "CANCELER_IMPRISONED";
    sourcePhaseAfter: "CANCELER_CONFUSED";
  }>;
}>;

export type BattleScriptAttackCancelerImprisonedDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerImprisonedReason;
    rulesContext: BattleScriptRulesContext;
    receipt: BattleScriptAttackCancelerImprisonedReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    receipt: Readonly<{
      sourcePhase: "CANCELER_IMPRISONED";
      tracker: Readonly<{ before: number; after: number }>;
    }>;
  }>;

export type BattleScriptAttackCancelerConfusedReason =
  | "not-confused"
  | "snapped-out"
  | "confused-continues"
  | "confusion-self-hit";

export type BattleScriptAttackCancelerConfusedRngEffect =
  | Readonly<{
    kind: "preserve";
    value: number;
    callsConsumed: 0;
    reason: "not-confused" | "snapped-out";
  }>
  | Readonly<{
    kind: "draw";
    name: "CANCELER_CONFUSED_ACTION_CHECK";
    sourceCall: "Random";
    sourceOperation: "Random() & 1";
    before: number;
    after: number;
    randomValue: number;
    lowBit: 0 | 1;
    callsConsumed: 1;
  }>;

export type BattleScriptAttackCancelerConfusedReceipt = Readonly<{
  sourcePhase: "CANCELER_CONFUSED";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerConfusedReason;
  confusionCounter: Readonly<{
    before: number;
    after: number;
    decrement: 0 | 1;
    sourceMask: "STATUS2_CONFUSION";
  }>;
  status2: BattleScriptBitFieldEffect;
  rng: BattleScriptAttackCancelerConfusedRngEffect;
  targetBattler: Readonly<{
    before: BattleScriptBattlerId | null;
    after: BattleScriptBattlerId | null;
  }>;
  battleMoveDamage: Readonly<{
    before: number;
    after: number;
    calculation:
      | Readonly<{ kind: "not-performed" }>
      | Readonly<{
        kind: "CalculateBaseDamage";
        move: typeof BATTLE_SCRIPT_MOVE_POUND;
        sideStatus: 0;
        powerOverride: 40;
        typeOverride: 0;
        attacker: BattleScriptBattlerId;
        defender: BattleScriptBattlerId;
      }>;
  }>;
  confusionSelfDmg: Readonly<{ before: 0 | 1; after: 0 | 1 }>;
  multiTurnCancellation:
    | Readonly<{ kind: "not-requested" }>
    | Readonly<{
      kind: "deferred-to-script";
      targetLabel: "BattleScript_DoSelfConfusionDmg";
      sourceCommand: "cancelmultiturnmoves BS_ATTACKER";
    }>;
  hitMarker: BattleScriptBitFieldEffect;
  effect: 0 | 1;
  script: BattleScriptAttackCancelerScriptEffect;
  cursor: BattleScriptAttackCancelerCursorEffect;
  multistringChooser: BattleScriptAttackCancelerMultistringEffect;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_CONFUSED";
    sourcePhaseAfter: "CANCELER_PARALYZED";
  }>;
}>;

export type BattleScriptAttackCancelerConfusedDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerConfusedReason;
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: BattleScriptAttackCancelerConfusedReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: Readonly<{
      sourcePhase: "CANCELER_CONFUSED";
      tracker: Readonly<{ before: number; after: number }>;
      rng: Readonly<{ kind: "preserve"; value: number; callsConsumed: 0 }>;
    }>;
  }>;

export type BattleScriptAttackCancelerParalyzedReason =
  | "not-paralyzed"
  | "paralysis-check-passed"
  | "fully-paralyzed";

export type BattleScriptAttackCancelerParalyzedRngEffect =
  | Readonly<{
    kind: "preserve";
    value: number;
    callsConsumed: 0;
    reason: "not-paralyzed";
  }>
  | Readonly<{
    kind: "draw";
    name: "CANCELER_PARALYZED_IMMOBILITY_CHECK";
    sourceCall: "Random";
    sourceOperation: "Random() % 4";
    before: number;
    after: number;
    randomValue: number;
    modulo: 0 | 1 | 2 | 3;
    callsConsumed: 1;
  }>;

export type BattleScriptAttackCancelerParalyzedReceipt = Readonly<{
  sourcePhase: "CANCELER_PARALYZED";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerParalyzedReason;
  statusPredicate: Readonly<{
    status1: number;
    sourceMask: "STATUS1_PARALYSIS";
    mask: typeof BATTLE_SCRIPT_STATUS1_PARALYSIS;
    matches: boolean;
  }>;
  rng: BattleScriptAttackCancelerParalyzedRngEffect;
  prlzImmobility: Readonly<{ before: 0 | 1; after: 0 | 1 }>;
  multiTurnCancellation:
    | Readonly<{ kind: "not-requested" }>
    | Readonly<{
      kind: "deferred-to-script";
      targetLabel: "BattleScript_MoveUsedIsParalyzed";
      sourceCommand: "cancelmultiturnmoves BS_ATTACKER";
    }>;
  hitMarker: BattleScriptBitFieldEffect;
  effect: 0 | 1;
  script: BattleScriptAttackCancelerScriptEffect;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_PARALYZED";
    sourcePhaseAfter: "CANCELER_IN_LOVE";
  }>;
}>;

export type BattleScriptAttackCancelerParalyzedDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerParalyzedReason;
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: BattleScriptAttackCancelerParalyzedReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: Readonly<{
      sourcePhase: "CANCELER_PARALYZED";
      tracker: Readonly<{ before: number; after: number }>;
      rng: Readonly<{ kind: "preserve"; value: number; callsConsumed: 0 }>;
    }>;
  }>;

export type BattleScriptAttackCancelerInLoveReason =
  | "not-infatuated"
  | "love-check-passed"
  | "immobilized-by-love";

export type BattleScriptAttackCancelerInLoveRngEffect =
  | Readonly<{
    kind: "preserve";
    value: number;
    callsConsumed: 0;
    reason: "not-infatuated";
  }>
  | Readonly<{
    kind: "draw";
    name: "CANCELER_IN_LOVE_IMMOBILITY_CHECK";
    sourceCall: "Random";
    sourceOperation: "Random() & 1";
    before: number;
    after: number;
    randomValue: number;
    lowBit: 0 | 1;
    callsConsumed: 1;
  }>;

export type BattleScriptAttackCancelerInLoveStackEffect =
  | Readonly<{ kind: "preserve" }>
  | Readonly<{
    kind: "push-cursor";
    sourceFunction: "BattleScriptPushCursor";
    sourceProgramCounter: number;
  }>
  | Readonly<{
    kind: "push-script";
    sourceFunction: "BattleScriptPush";
    targetLabel: "BattleScript_MoveUsedIsInLoveCantAttack";
  }>;

export type BattleScriptAttackCancelerInLoveReceipt = Readonly<{
  sourcePhase: "CANCELER_IN_LOVE";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerInLoveReason;
  infatuation: Readonly<{
    status2: number;
    sourceMask: "STATUS2_INFATUATION";
    mask: typeof BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION;
    encodedBits: number;
    sourceBattler: BattleScriptBattlerId | null;
  }>;
  scriptingBattler:
    | Readonly<{
      kind: "preserve";
      before: BattleScriptBattlerId;
      after: BattleScriptBattlerId;
    }>
    | Readonly<{
      kind: "derive";
      before: BattleScriptBattlerId;
      after: BattleScriptBattlerId;
      sourceFunction: "CountTrailingZeroBits";
    }>;
  rng: BattleScriptAttackCancelerInLoveRngEffect;
  loveImmobility: Readonly<{ before: 0 | 1; after: 0 | 1 }>;
  multiTurnCancellation:
    | Readonly<{ kind: "not-requested" }>
    | Readonly<{
      kind: "immediate";
      sourceFunction: "CancelMultiTurnMoves";
      receipt: BattleScriptCancelMultiTurnMovesReceipt;
    }>;
  hitMarker: BattleScriptBitFieldEffect;
  effect: 0 | 1;
  script: BattleScriptAttackCancelerScriptEffect;
  scriptStack: BattleScriptAttackCancelerInLoveStackEffect;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_IN_LOVE";
    sourcePhaseAfter: "CANCELER_BIDE";
  }>;
}>;

export type BattleScriptAttackCancelerInLoveDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerInLoveReason;
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: BattleScriptAttackCancelerInLoveReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: Readonly<{
      sourcePhase: "CANCELER_IN_LOVE";
      tracker: Readonly<{ before: number; after: number }>;
      rng: Readonly<{ kind: "preserve"; value: number; callsConsumed: 0 }>;
    }>;
  }>;

export type BattleScriptAttackCancelerBideReason =
  | "not-biding"
  | "storing-energy"
  | "released-with-no-energy"
  | "released-attack";

export type BattleScriptAttackCancelerBideReceipt = Readonly<{
  sourcePhase: "CANCELER_BIDE";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerBideReason;
  counter: Readonly<{
    sourceMask: "STATUS2_BIDE";
    mask: typeof BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE;
    status2Before: number;
    encodedBefore: 0 | 1 | 2;
    decrement: 0 | 1;
    status2After: number;
    encodedAfter: 0 | 1;
  }>;
  multiTurnStatus: Readonly<{
    sourceMask: "STATUS2_MULTIPLETURNS";
    before: boolean;
    after: boolean;
    clearingOwner:
      | "not-requested"
      | "BattleScript_BideAttack"
      | "BattleScript_BideNoEnergyToAttack";
  }>;
  accumulatedDamage: Readonly<{
    sourceArray: "gBideDmg";
    before: number;
    after: number;
  }>;
  scriptingBideDamage:
    | Readonly<{ kind: "preserve"; before: number; after: number }>
    | Readonly<{
      kind: "set-doubled";
      before: number;
      after: number;
      sourceOperation: "gBideDmg[gBattlerAttacker] * 2";
      arithmetic: "signed-s32-two-complement";
    }>;
  currentMove:
    | Readonly<{ kind: "preserve"; before: number; after: number }>
    | Readonly<{
      kind: "set";
      before: number;
      after: typeof BATTLE_SCRIPT_MOVE_BIDE;
      sourceConstant: "MOVE_BIDE";
    }>;
  target:
    | Readonly<{
      kind: "preserve";
      before: BattleScriptBattlerId | null;
      after: BattleScriptBattlerId | null;
    }>
    | Readonly<{
      kind: "restore-saved";
      before: BattleScriptBattlerId | null;
      savedTarget: BattleScriptBattlerId;
      after: BattleScriptBattlerId;
      sourceArray: "gBideTarget";
      resolution: "saved-target-present";
    }>;
  singlesTargetInvariant: Readonly<{
    absentBattlerFlags: 0;
    rngCallsConsumed: 0;
    absentSavedTargetBranch:
      "source-unreachable-at-level-50-singles-action-boundary";
  }>;
  rng: Readonly<{
    kind: "preserve";
    value: number;
    callsConsumed: 0;
  }>;
  effect: 0 | 1;
  script: BattleScriptAttackCancelerScriptEffect;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_BIDE";
    sourcePhaseAfter: "CANCELER_THAW";
  }>;
}>;

export type BattleScriptAttackCancelerBideDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerBideReason;
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: BattleScriptAttackCancelerBideReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: Readonly<{
      sourcePhase: "CANCELER_BIDE";
      tracker: Readonly<{ before: number; after: number }>;
      rng: Readonly<{ kind: "preserve"; value: number; callsConsumed: 0 }>;
    }>;
  }>;

export type BattleScriptAttackCancelerThawReason =
  | "not-frozen"
  | "frozen-status-sync"
  | "defrosted-by-move";

export type BattleScriptAttackCancelerThawControllerSync =
  | Readonly<{
    kind: "none";
    reason: "effect-zero";
  }>
  | Readonly<{
    kind: "frozen-status1-sync";
    /**
     * The source assigns gActiveBattler immediately after the canceler loop.
     * It is a controller-routing global, not durable battle rules state.
     */
    activeBattler: Readonly<{
      sourceGlobal: "gActiveBattler";
      after: BattleScriptBattlerId;
    }>;
    emit: Readonly<{
      sourceFunction: "BtlController_EmitSetMonData";
      sourceRequest: "REQUEST_STATUS_BATTLE";
      offset: 0;
      size: 4;
      value: number;
    }>;
    mark: Readonly<{
      sourceFunction: "MarkBattlerForControllerExec";
      battler: BattleScriptBattlerId;
    }>;
  }>;

export type BattleScriptAttackCancelerThawReceipt = Readonly<{
  sourcePhase: "CANCELER_THAW";
  attacker: BattleScriptBattlerId;
  reason: BattleScriptAttackCancelerThawReason;
  freezePredicate: Readonly<{
    sourceMask: "STATUS1_FREEZE";
    mask: typeof BATTLE_SCRIPT_STATUS1_FREEZE;
    status1: number;
    matches: boolean;
  }>;
  moveEffect: Readonly<{
    currentMove: number;
    sourceField: "gBattleMoves[gCurrentMove].effect";
    value: number;
    sourceConstant: "EFFECT_THAW_HIT";
    thawHitValue: typeof BATTLE_SCRIPT_EFFECT_THAW_HIT;
    matches: boolean;
  }>;
  status1: BattleScriptBitFieldEffect;
  effect: 0 | 2;
  script: BattleScriptAttackCancelerScriptEffect;
  cursor: BattleScriptAttackCancelerCursorEffect;
  multistringChooser: BattleScriptAttackCancelerMultistringEffect;
  controllerSync: BattleScriptAttackCancelerThawControllerSync;
  rng: Readonly<{
    kind: "preserve";
    value: number;
    callsConsumed: 0;
  }>;
  tracker: Readonly<{
    before: number;
    after: number;
    sourcePhaseBefore: "CANCELER_THAW";
    sourcePhaseAfter: "CANCELER_END";
  }>;
}>;

export type BattleScriptAttackCancelerThawDecision =
  | Readonly<{
    kind: "advance";
    reason: BattleScriptAttackCancelerThawReason;
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: BattleScriptAttackCancelerThawReceipt;
  }>
  | Readonly<{
    kind: "not-at-source-phase";
    rulesContext: BattleScriptRulesContext;
    rngValue: number;
    receipt: Readonly<{
      sourcePhase: "CANCELER_THAW";
      tracker: Readonly<{ before: number; after: number }>;
      rng: Readonly<{
        kind: "preserve";
        value: number;
        callsConsumed: 0;
      }>;
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
 * Immutable port of GetImprisonedMovesCount (battle_util.c:1142-1163).
 *
 * Each battler owns the result of GetBattlerSide explicitly; the scan neither
 * assumes battler-id parity nor consults presentation positions.
 */
export function scanBattleScriptImprisonedMoves(
  rulesContext: BattleScriptRulesContext,
  attacker: BattleScriptBattlerId,
  move: number,
): BattleScriptImprisonedMovesScan {
  if (
    !Number.isSafeInteger(attacker)
    || attacker < 0
    || attacker > 3
  ) {
    throw new Error(`imprisoned-move attacker must be a battler id 0..3, got ${attacker}`);
  }
  if (!Number.isSafeInteger(move) || move < 0 || move > 0xffff) {
    throw new Error(`imprisoned-move move must be a u16, got ${move}`);
  }
  if (
    !rulesContext
    || !Array.isArray(rulesContext.battlers)
    || rulesContext.battlers.length !== 4
  ) {
    throw new Error("imprisoned-move scan requires exactly four indexed battlers");
  }
  const attackerSide = rulesContext.battlers[attacker].side;
  if (attackerSide !== 0 && attackerSide !== 1) {
    throw new Error(`imprisoned-move attacker side must be 0 or 1, got ${attackerSide}`);
  }

  let imprisonedMovesCount = 0;
  const checkedBattlers = rulesContext.battlers.map((battler, index) => {
    if (battler.side !== 0 && battler.side !== 1) {
      throw new Error(`imprisoned-move battler ${index} side must be 0 or 1, got ${battler.side}`);
    }
    if (!Array.isArray(battler.moves) || battler.moves.length !== 4) {
      throw new Error(`imprisoned-move battler ${index} must have exactly four move slots`);
    }
    const isOpposing = battler.side !== attackerSide;
    const hasImprisonedOthers = (
      battler.status3 & BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS
    ) !== 0;
    const checkedMoveSlots: number[] = [];
    let matchingMoveSlot: number | null = null;
    if (isOpposing && hasImprisonedOthers) {
      for (let moveSlot = 0; moveSlot < 4; moveSlot++) {
        const candidate = battler.moves[moveSlot];
        if (!Number.isSafeInteger(candidate) || candidate < 0 || candidate > 0xffff) {
          throw new Error(
            `imprisoned-move battler ${index} move slot ${moveSlot} must be a u16, got ${candidate}`,
          );
        }
        checkedMoveSlots.push(moveSlot);
        if (candidate === move) {
          matchingMoveSlot = moveSlot;
          break;
        }
      }
    }
    const contributes = (
      isOpposing
      && hasImprisonedOthers
      && matchingMoveSlot !== null
    );
    if (contributes) imprisonedMovesCount++;
    return Object.freeze({
      battler: index as BattleScriptBattlerId,
      side: battler.side,
      isOpposing,
      status3: battler.status3,
      hasImprisonedOthers,
      moves: battler.moves,
      checkedMoveSlots: Object.freeze(checkedMoveSlots),
      matchingMoveSlot,
      contributes,
    });
  });
  return Object.freeze({
    attacker,
    attackerSide,
    move,
    checkedBattlers: Object.freeze(checkedBattlers),
    imprisonedMovesCount,
    isImprisoned: imprisonedMovesCount !== 0,
  });
}

/**
 * Immutable `CheckMoveLimitations` port (`battle_util.c:1082-1123`).
 *
 * The returned low four bits correspond to the four source move slots.
 * Encore and Choice Band intentionally remain outside the `check` mask,
 * matching pret's source order and predicates exactly.
 */
export function checkBattleScriptMoveLimitations(
  rulesContext: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
  unusableMoves: number = 0,
  check: number = BATTLE_SCRIPT_MOVE_LIMITATIONS.MOVE_LIMITATIONS_ALL,
): number {
  if (!Number.isInteger(unusableMoves) || unusableMoves < 0 || unusableMoves > 0xff) {
    throw new Error(`move limitations initial mask must be a u8, got ${unusableMoves}`);
  }
  if (!Number.isInteger(check) || check < 0 || check > 0xff) {
    throw new Error(`move limitations check mask must be a u8, got ${check}`);
  }
  const source = rulesContext.battlers[battler];
  const lastMove = rulesContext.moveHistory.lastMoves[battler]!;
  const choicedMove = rulesContext.choicedMove[battler]!;
  const holdEffect = resolveBattleScriptBattlerHoldEffect(rulesContext, battler);
  let mask = unusableMoves;

  for (let slot = 0; slot < 4; slot += 1) {
    const move = source.moves[slot]!;
    const bit = 1 << slot;
    if (
      move === BATTLE_SCRIPT_MOVE_NONE
      && (check & BATTLE_SCRIPT_MOVE_LIMITATIONS.MOVE_LIMITATION_ZEROMOVE) !== 0
    ) {
      mask |= bit;
    }
    if (
      source.pp[slot] === 0
      && (check & BATTLE_SCRIPT_MOVE_LIMITATIONS.MOVE_LIMITATION_PP) !== 0
    ) {
      mask |= bit;
    }
    if (
      move === source.disabledMove
      && (check & BATTLE_SCRIPT_MOVE_LIMITATIONS.MOVE_LIMITATION_DISABLED) !== 0
    ) {
      mask |= bit;
    }
    if (
      move === lastMove
      && (check & BATTLE_SCRIPT_MOVE_LIMITATIONS.MOVE_LIMITATION_TORMENTED) !== 0
      && (source.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT) !== 0
    ) {
      mask |= bit;
    }
    if (
      source.tauntTimer !== 0
      && (check & BATTLE_SCRIPT_MOVE_LIMITATIONS.MOVE_LIMITATION_TAUNT) !== 0
      && resolveBattleScriptCurrentMovePower(move) === 0
    ) {
      mask |= bit;
    }
    if (
      (check & BATTLE_SCRIPT_MOVE_LIMITATIONS.MOVE_LIMITATION_IMPRISON) !== 0
      && scanBattleScriptImprisonedMoves(rulesContext, battler, move)
        .imprisonedMovesCount !== 0
    ) {
      mask |= bit;
    }
    if (source.encoreTimer !== 0 && source.encoredMove !== move) {
      mask |= bit;
    }
    if (
      holdEffect === BATTLE_SCRIPT_HOLD_EFFECT_CHOICE_BAND
      && choicedMove !== BATTLE_SCRIPT_MOVE_NONE
      && choicedMove !== 0xffff
      && choicedMove !== move
    ) {
      mask |= bit;
    }
  }
  return mask & 0xff;
}

/**
 * The source-shaped CANCELER_IMPRISONED phase of
 * AtkCanceler_UnableToUseMove. Ports battle_util.c:2145-2155 and advances
 * exactly once to CANCELER_CONFUSED without executing that later phase.
 */
export function advanceBattleScriptAttackCancelerImprisoned(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerImprisonedDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IMPRISONED
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_IMPRISONED",
        tracker: Object.freeze({ before: trackerBefore, after: trackerBefore }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler imprisoned phase requires an attacker role",
    );
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const imprisonedMoves = scanBattleScriptImprisonedMoves(
    rulesContext,
    attacker,
    rulesContext.currentMove,
  );
  const taken = imprisonedMoves.isImprisoned;
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
      usedImprisonedMove: 1 as const,
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
      targetLabel: "BattleScript_MoveUsedIsImprisoned",
    });
  }

  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_CONFUSED;
  nextRulesContext = Object.freeze({
    ...nextRulesContext,
    atkCancelerTracker: trackerAfter,
    hitMarker: nextHitMarker,
  });
  const reason = taken ? "imprisoned-move" : "move-not-imprisoned";
  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_IMPRISONED",
      attacker,
      reason,
      imprisonedMoves,
      usedImprisonedMove: Object.freeze({
        before: sourceBattler.usedImprisonedMove,
        after: taken ? 1 : sourceBattler.usedImprisonedMove,
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
        sourcePhaseBefore: "CANCELER_IMPRISONED",
        sourcePhaseAfter: "CANCELER_CONFUSED",
      }),
    }),
  });
}

/**
 * Immutable source phase for battle_util.c:2156-2187.
 *
 * The counter decrement precedes the conditional RNG call.  The self-hit
 * branch owns only the state written by this C case; its later
 * cancelmultiturnmoves command remains explicitly owned by
 * BattleScript_DoSelfConfusionDmg (battle_scripts_1.s:3801-3803).
 */
export function advanceBattleScriptAttackCancelerConfused(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
  rngValue: number,
): BattleScriptAttackCancelerConfusedDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const sourceRng = requireRngValue(rngValue);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (trackerBefore !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_CONFUSED) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      rngValue: sourceRng,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_CONFUSED",
        tracker: Object.freeze({ before: trackerBefore, after: trackerBefore }),
        rng: Object.freeze({
          kind: "preserve",
          value: sourceRng,
          callsConsumed: 0 as const,
        }),
      }),
    });
  }
  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error("Battle Script attack canceler confused phase requires an attacker role");
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const counterBefore = sourceBattler.status2
    & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION;
  if (counterBefore > 5) {
    throw new Error(`confusion counter must use the source-reachable encoding 0..5, got ${counterBefore}`);
  }

  let reason: BattleScriptAttackCancelerConfusedReason = "not-confused";
  let counterAfter = counterBefore;
  let nextStatus2 = sourceBattler.status2;
  let nextRng = sourceRng;
  let rng: BattleScriptAttackCancelerConfusedRngEffect = Object.freeze({
    kind: "preserve",
    value: sourceRng,
    callsConsumed: 0,
    reason: "not-confused",
  });
  let nextTarget = rulesContext.selectorRoles.target;
  let nextDamage = rulesContext.battleMoveDamage;
  let nextSelfDmg = sourceBattler.confusionSelfDmg ?? 0;
  let nextHitMarker = rulesContext.hitMarker;
  let effect: 0 | 1 = 0;
  let script: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });
  let cursor: BattleScriptAttackCancelerCursorEffect = Object.freeze({ kind: "preserve" });
  let chooser: BattleScriptAttackCancelerMultistringEffect =
    Object.freeze({ kind: "preserve" });
  let calculation: BattleScriptAttackCancelerConfusedReceipt["battleMoveDamage"]["calculation"] =
    Object.freeze({ kind: "not-performed" });
  let multiTurnCancellation: BattleScriptAttackCancelerConfusedReceipt["multiTurnCancellation"] =
    Object.freeze({ kind: "not-requested" });

  if (counterBefore !== 0) {
    effect = 1;
    counterAfter = counterBefore - 1;
    nextStatus2 = (sourceBattler.status2 - 1) >>> 0;
    if (counterAfter === 0) {
      reason = "snapped-out";
      cursor = Object.freeze({ kind: "push", sourceProgramCounter: sourcePc });
      script = Object.freeze({
        kind: "handoff",
        sourceProgramCounter: sourcePc,
        targetLabel: "BattleScript_MoveUsedIsConfusedNoMore",
      });
      rng = Object.freeze({
        kind: "preserve",
        value: sourceRng,
        callsConsumed: 0,
        reason: "snapped-out",
      });
    } else {
      nextRng = advanceRngValue(sourceRng);
      const randomValue = (nextRng >>> 16) & 0xffff;
      const lowBit = (randomValue & 1) as 0 | 1;
      rng = Object.freeze({
        kind: "draw",
        name: "CANCELER_CONFUSED_ACTION_CHECK",
        sourceCall: "Random",
        sourceOperation: "Random() & 1",
        before: sourceRng,
        after: nextRng,
        randomValue,
        lowBit,
        callsConsumed: 1,
      });
      script = Object.freeze({
        kind: "handoff",
        sourceProgramCounter: sourcePc,
        targetLabel: "BattleScript_MoveUsedIsConfused",
      });
      if (lowBit === 1) {
        reason = "confused-continues";
        chooser = Object.freeze({ kind: "set", sourceConstant: "FALSE", value: 0 });
        cursor = Object.freeze({ kind: "push", sourceProgramCounter: sourcePc });
      } else {
        reason = "confusion-self-hit";
        const damage = sourceBattler.confusionDamage
          ?? confusionDamageFromLiveBattler(
            sourceBattler,
          );
        if (damage.level === 0 || damage.attack === 0 || damage.defense === 0) {
          throw new Error("confusionDamage level, attack, and defense must be nonzero");
        }
        nextTarget = attacker;
        nextDamage = calculateBaseDamage({
          attacker: {
            level: damage.level,
            attack: damage.attack,
            defense: damage.defense,
            spAttack: 1,
            spDefense: 1,
            types: ["TYPE_NORMAL", "TYPE_NORMAL"],
            statStages: {
              ...NEUTRAL_STAT_STAGES,
              atk: damage.attackStage,
              def: damage.defenseStage,
            },
            isBurned: damage.isBurned,
            ability: damage.hasGuts ? "ABILITY_GUTS" : null,
          },
          defender: {
            level: damage.level,
            attack: damage.attack,
            defense: damage.defense,
            spAttack: 1,
            spDefense: 1,
            types: ["TYPE_NORMAL", "TYPE_NORMAL"],
            statStages: {
              ...NEUTRAL_STAT_STAGES,
              atk: damage.attackStage,
              def: damage.defenseStage,
            },
          },
          movePower: 40,
          moveType: "TYPE_NORMAL",
          isCriticalHit: false,
        });
        nextSelfDmg = 1;
        nextHitMarker = (
          rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
        ) >>> 0;
        chooser = Object.freeze({ kind: "set", sourceConstant: "TRUE", value: 1 });
        calculation = Object.freeze({
          kind: "CalculateBaseDamage",
          move: BATTLE_SCRIPT_MOVE_POUND,
          sideStatus: 0,
          powerOverride: 40,
          typeOverride: 0,
          attacker,
          defender: attacker,
        });
        multiTurnCancellation = Object.freeze({
          kind: "deferred-to-script",
          targetLabel: "BattleScript_DoSelfConfusionDmg",
          sourceCommand: "cancelmultiturnmoves BS_ATTACKER",
        });
      }
    }
  }

  const nextBattler = (
    nextStatus2 === sourceBattler.status2
    && nextSelfDmg === (sourceBattler.confusionSelfDmg ?? 0)
  ) ? sourceBattler : Object.freeze({
    ...sourceBattler,
    status2: nextStatus2,
    confusionSelfDmg: nextSelfDmg,
  });
  const nextBattlers = nextBattler === sourceBattler
    ? rulesContext.battlers
    : Object.freeze(rulesContext.battlers.map((candidate, index) =>
      index === attacker ? nextBattler : candidate
    )) as unknown as BattleScriptRulesContext["battlers"];
  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_PARALYZED;
  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battlers: nextBattlers,
    selectorRoles: nextTarget === rulesContext.selectorRoles.target
      ? rulesContext.selectorRoles
      : Object.freeze({ ...rulesContext.selectorRoles, target: nextTarget }),
    battleMoveDamage: nextDamage,
    multistringChooser: chooser.kind === "set"
      ? chooser.value
      : rulesContext.multistringChooser,
    hitMarker: nextHitMarker,
    atkCancelerTracker: trackerAfter,
  });
  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    rngValue: nextRng,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_CONFUSED",
      attacker,
      reason,
      confusionCounter: Object.freeze({
        before: counterBefore,
        after: counterAfter,
        decrement: counterBefore === 0 ? 0 : 1,
        sourceMask: "STATUS2_CONFUSION",
      }),
      status2: bitFieldEffect(sourceBattler.status2, nextStatus2),
      rng,
      targetBattler: Object.freeze({
        before: rulesContext.selectorRoles.target,
        after: nextTarget,
      }),
      battleMoveDamage: Object.freeze({
        before: rulesContext.battleMoveDamage,
        after: nextDamage,
        calculation,
      }),
      confusionSelfDmg: Object.freeze({
        before: sourceBattler.confusionSelfDmg ?? 0,
        after: nextSelfDmg,
      }),
      multiTurnCancellation,
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      effect,
      script,
      cursor,
      multistringChooser: chooser,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_CONFUSED",
        sourcePhaseAfter: "CANCELER_PARALYZED",
      }),
    }),
  });
}

/**
 * Immutable source phase for battle_util.c:2188-2199.
 *
 * Random is owned only after the paralysis predicate succeeds. The taken
 * branch records the later script-owned multi-turn cancellation without
 * executing that command, then advances exactly once to CANCELER_IN_LOVE.
 */
export function advanceBattleScriptAttackCancelerParalyzed(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
  rngValue: number,
): BattleScriptAttackCancelerParalyzedDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const sourceRng = requireRngValue(rngValue);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_PARALYZED
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      rngValue: sourceRng,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_PARALYZED",
        tracker: Object.freeze({ before: trackerBefore, after: trackerBefore }),
        rng: Object.freeze({
          kind: "preserve",
          value: sourceRng,
          callsConsumed: 0 as const,
        }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler paralyzed phase requires an attacker role",
    );
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const isParalyzed = (
    sourceBattler.status1 & BATTLE_SCRIPT_STATUS1_PARALYSIS
  ) !== 0;
  let nextRng = sourceRng;
  let modulo: 0 | 1 | 2 | 3 | null = null;
  let rng: BattleScriptAttackCancelerParalyzedRngEffect = Object.freeze({
    kind: "preserve",
    value: sourceRng,
    callsConsumed: 0,
    reason: "not-paralyzed",
  });
  if (isParalyzed) {
    nextRng = advanceRngValue(sourceRng);
    const randomValue = (nextRng >>> 16) & 0xffff;
    modulo = (randomValue % 4) as 0 | 1 | 2 | 3;
    rng = Object.freeze({
      kind: "draw",
      name: "CANCELER_PARALYZED_IMMOBILITY_CHECK",
      sourceCall: "Random",
      sourceOperation: "Random() % 4",
      before: sourceRng,
      after: nextRng,
      randomValue,
      modulo,
      callsConsumed: 1,
    });
  }
  const isFullyParalyzed = modulo === 0;
  const prlzBefore = sourceBattler.prlzImmobility ?? 0;
  const prlzAfter = isFullyParalyzed ? 1 : prlzBefore;
  const nextHitMarker = isFullyParalyzed
    ? (
      rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
    ) >>> 0
    : rulesContext.hitMarker;
  const nextBattler = prlzAfter === prlzBefore
    ? sourceBattler
    : Object.freeze({ ...sourceBattler, prlzImmobility: prlzAfter });
  const nextBattlers = nextBattler === sourceBattler
    ? rulesContext.battlers
    : Object.freeze(rulesContext.battlers.map((candidate, index) =>
      index === attacker ? nextBattler : candidate
    )) as unknown as BattleScriptRulesContext["battlers"];
  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IN_LOVE;
  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battlers: nextBattlers,
    hitMarker: nextHitMarker,
    atkCancelerTracker: trackerAfter,
  });
  const reason: BattleScriptAttackCancelerParalyzedReason = !isParalyzed
    ? "not-paralyzed"
    : isFullyParalyzed
      ? "fully-paralyzed"
      : "paralysis-check-passed";
  const script: BattleScriptAttackCancelerScriptEffect = isFullyParalyzed
    ? Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_MoveUsedIsParalyzed",
    })
    : Object.freeze({ kind: "preserve", sourceProgramCounter: sourcePc });
  const multiTurnCancellation:
    BattleScriptAttackCancelerParalyzedReceipt["multiTurnCancellation"] =
      isFullyParalyzed
        ? Object.freeze({
          kind: "deferred-to-script",
          targetLabel: "BattleScript_MoveUsedIsParalyzed",
          sourceCommand: "cancelmultiturnmoves BS_ATTACKER",
        })
        : Object.freeze({ kind: "not-requested" });

  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    rngValue: nextRng,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_PARALYZED",
      attacker,
      reason,
      statusPredicate: Object.freeze({
        status1: sourceBattler.status1,
        sourceMask: "STATUS1_PARALYSIS",
        mask: BATTLE_SCRIPT_STATUS1_PARALYSIS,
        matches: isParalyzed,
      }),
      rng,
      prlzImmobility: Object.freeze({
        before: prlzBefore,
        after: prlzAfter,
      }),
      multiTurnCancellation,
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      effect: isFullyParalyzed ? 1 : 0,
      script,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_PARALYZED",
        sourcePhaseAfter: "CANCELER_IN_LOVE",
      }),
    }),
  });
}

/**
 * Immutable source phase for battle_util.c:2200-2219.
 *
 * The four-bit infatuation field contains one source battler bit. Its
 * CountTrailingZeroBits owner is selected before the conditional Random call.
 * Odd draws push the current cursor; even draws push the unable script and
 * execute CancelMultiTurnMoves immediately. Both taken branches then hand off
 * to BattleScript_MoveUsedIsInLove and advance exactly once to CANCELER_BIDE.
 */
export function advanceBattleScriptAttackCancelerInLove(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
  rngValue: number,
): BattleScriptAttackCancelerInLoveDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const sourceRng = requireRngValue(rngValue);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IN_LOVE
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      rngValue: sourceRng,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_IN_LOVE",
        tracker: Object.freeze({ before: trackerBefore, after: trackerBefore }),
        rng: Object.freeze({
          kind: "preserve",
          value: sourceRng,
          callsConsumed: 0 as const,
        }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler in-love phase requires an attacker role",
    );
  }
  const sourceBattler = rulesContext.battlers[attacker];
  const infatuationMask = BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION;
  const encodedBits = (
    (sourceBattler.status2 & infatuationMask) >>> 16
  ) & 0xf;
  if (encodedBits !== 0 && (encodedBits & (encodedBits - 1)) !== 0) {
    throw new Error(
      "STATUS2_INFATUATION must encode exactly one source battler bit when nonzero",
    );
  }
  const sourceBattlerId = encodedBits === 0
    ? null
    : 31 - Math.clz32(encodedBits & -encodedBits);
  const infatuationSource = sourceBattlerId as BattleScriptBattlerId | null;

  let nextRng = sourceRng;
  let rng: BattleScriptAttackCancelerInLoveRngEffect = Object.freeze({
    kind: "preserve",
    value: sourceRng,
    callsConsumed: 0,
    reason: "not-infatuated",
  });
  let lowBit: 0 | 1 | null = null;
  if (infatuationSource !== null) {
    nextRng = advanceRngValue(sourceRng);
    const randomValue = (nextRng >>> 16) & 0xffff;
    lowBit = (randomValue & 1) as 0 | 1;
    rng = Object.freeze({
      kind: "draw",
      name: "CANCELER_IN_LOVE_IMMOBILITY_CHECK",
      sourceCall: "Random",
      sourceOperation: "Random() & 1",
      before: sourceRng,
      after: nextRng,
      randomValue,
      lowBit,
      callsConsumed: 1,
    });
  }

  const immobilized = lowBit === 0;
  const loveBefore = sourceBattler.loveImmobility ?? 0;
  const loveAfter = immobilized ? 1 : loveBefore;
  let workingContext = rulesContext;
  if (infatuationSource !== null) {
    const nextBattler = loveAfter === loveBefore
      ? sourceBattler
      : Object.freeze({ ...sourceBattler, loveImmobility: loveAfter });
    const nextBattlers = nextBattler === sourceBattler
      ? rulesContext.battlers
      : Object.freeze(rulesContext.battlers.map((candidate, index) =>
        index === attacker ? nextBattler : candidate
      )) as unknown as BattleScriptRulesContext["battlers"];
    workingContext = Object.freeze({
      ...rulesContext,
      battlers: nextBattlers,
      scriptingBattler: infatuationSource,
    });
  }

  let multiTurnCancellation:
    BattleScriptAttackCancelerInLoveReceipt["multiTurnCancellation"] =
      Object.freeze({ kind: "not-requested" });
  if (immobilized) {
    const cancellation = cancelBattleScriptMultiTurnMoves(
      workingContext,
      attacker,
    );
    workingContext = cancellation.rulesContext;
    multiTurnCancellation = Object.freeze({
      kind: "immediate",
      sourceFunction: "CancelMultiTurnMoves",
      receipt: cancellation.receipt,
    });
  }

  const nextHitMarker = immobilized
    ? (
      workingContext.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
    ) >>> 0
    : workingContext.hitMarker;
  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE;
  const nextRulesContext = Object.freeze({
    ...workingContext,
    hitMarker: nextHitMarker,
    atkCancelerTracker: trackerAfter,
  });
  const reason: BattleScriptAttackCancelerInLoveReason =
    infatuationSource === null
      ? "not-infatuated"
      : immobilized
        ? "immobilized-by-love"
        : "love-check-passed";
  const script: BattleScriptAttackCancelerScriptEffect =
    infatuationSource === null
      ? Object.freeze({ kind: "preserve", sourceProgramCounter: sourcePc })
      : Object.freeze({
        kind: "handoff",
        sourceProgramCounter: sourcePc,
        targetLabel: "BattleScript_MoveUsedIsInLove",
      });
  const scriptStack: BattleScriptAttackCancelerInLoveStackEffect =
    infatuationSource === null
      ? Object.freeze({ kind: "preserve" })
      : immobilized
        ? Object.freeze({
          kind: "push-script",
          sourceFunction: "BattleScriptPush",
          targetLabel: "BattleScript_MoveUsedIsInLoveCantAttack",
        })
        : Object.freeze({
          kind: "push-cursor",
          sourceFunction: "BattleScriptPushCursor",
          sourceProgramCounter: sourcePc,
        });

  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    rngValue: nextRng,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_IN_LOVE",
      attacker,
      reason,
      infatuation: Object.freeze({
        status2: sourceBattler.status2,
        sourceMask: "STATUS2_INFATUATION",
        mask: infatuationMask,
        encodedBits,
        sourceBattler: infatuationSource,
      }),
      scriptingBattler: infatuationSource === null
        ? Object.freeze({
          kind: "preserve",
          before: rulesContext.scriptingBattler,
          after: rulesContext.scriptingBattler,
        })
        : Object.freeze({
          kind: "derive",
          before: rulesContext.scriptingBattler,
          after: infatuationSource,
          sourceFunction: "CountTrailingZeroBits",
        }),
      rng,
      loveImmobility: Object.freeze({
        before: loveBefore,
        after: loveAfter,
      }),
      multiTurnCancellation,
      hitMarker: bitFieldEffect(rulesContext.hitMarker, nextHitMarker),
      effect: infatuationSource === null ? 0 : 1,
      script,
      scriptStack,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_IN_LOVE",
        sourcePhaseAfter: "CANCELER_BIDE",
      }),
    }),
  });
}

/**
 * Immutable source phase for battle_util.c:2220-2247.
 *
 * This seam is deliberately Level-50 singles-only. In the pinned source,
 * gAbsentBattlerFlags starts at zero, HasNoMonsToSwitch returns FALSE before
 * inspecting a singles party, and switch-in animation clears the active slot.
 * Therefore an absent saved Bide target cannot reach an action boundary while
 * the battle continues. The doubles-only GetMoveTarget fallback (including its
 * variable Random loop, Follow Me, and Lightning Rod hooks) is rejected here
 * instead of consuming ambient RNG or silently selecting a target.
 *
 * Reachable Bide counters are 2 (decrement and store) and 1 (decrement and
 * release). Cmd_setbide initializes 2 from the non-Bide state; 3 is not
 * reachable through the locked singles action flow. Release preserves
 * STATUS2_MULTIPLETURNS because the source defers clearing to the selected
 * BattleScript_Bide* program.
 */
export function advanceBattleScriptAttackCancelerBide(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
  rngValue: number,
): BattleScriptAttackCancelerBideDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const sourceRng = requireRngValue(rngValue);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      rngValue: sourceRng,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_BIDE",
        tracker: Object.freeze({ before: trackerBefore, after: trackerBefore }),
        rng: Object.freeze({
          kind: "preserve",
          value: sourceRng,
          callsConsumed: 0 as const,
        }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler Bide phase requires an attacker role",
    );
  }
  if (attacker > 1) {
    throw new Error(
      `CANCELER_BIDE Level-50 singles attacker must be battler 0 or 1, got ${attacker}`,
    );
  }
  if (rulesContext.absentBattlerFlags !== 0) {
    throw new Error(
      "CANCELER_BIDE does not accept absent battlers: the GetMoveTarget fallback "
      + "is source-unreachable at a continuing Level-50 singles action boundary",
    );
  }

  const sourceBattler = rulesContext.battlers[attacker];
  const bideMask = BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE;
  const encodedBefore = (
    (sourceBattler.status2 & bideMask) >>> 8
  ) as 0 | 1 | 2 | 3;
  if (encodedBefore === 3) {
    throw new Error(
      "STATUS2_BIDE counter 3 is not reachable from Cmd_setbide in the "
      + "Level-50 singles locked-action flow",
    );
  }

  const decrement = encodedBefore === 0 ? 0 : 1;
  const nextStatus2 = decrement === 0
    ? sourceBattler.status2
    : (sourceBattler.status2 - 0x100) >>> 0;
  const encodedAfter = (
    (nextStatus2 & bideMask) >>> 8
  ) as 0 | 1;
  const nextBattler = nextStatus2 === sourceBattler.status2
    ? sourceBattler
    : Object.freeze({ ...sourceBattler, status2: nextStatus2 });
  const nextBattlers = nextBattler === sourceBattler
    ? rulesContext.battlers
    : Object.freeze(rulesContext.battlers.map((candidate, index) =>
      index === attacker ? nextBattler : candidate
    )) as unknown as BattleScriptRulesContext["battlers"];

  const storedDamage = rulesContext.bideDmg[attacker];
  if (encodedBefore !== 0 && storedDamage < 0) {
    throw new Error(
      `gBideDmg[${attacker}] must be nonnegative in reachable Level-50 singles state`,
    );
  }

  let reason: BattleScriptAttackCancelerBideReason = "not-biding";
  let script: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });
  let nextCurrentMove = rulesContext.currentMove;
  let nextCurrentMoveEffect = rulesContext.currentMoveEffect;
  let nextCurrentMovePower = rulesContext.currentMovePower;
  let nextScriptingBideDmg = rulesContext.scriptingBideDmg;
  let nextSelectorRoles = rulesContext.selectorRoles;
  let target: BattleScriptAttackCancelerBideReceipt["target"] = Object.freeze({
    kind: "preserve",
    before: rulesContext.selectorRoles.target,
    after: rulesContext.selectorRoles.target,
  });
  let scriptingBideDamage:
    BattleScriptAttackCancelerBideReceipt["scriptingBideDamage"] =
      Object.freeze({
        kind: "preserve",
        before: rulesContext.scriptingBideDmg,
        after: rulesContext.scriptingBideDmg,
      });

  if (encodedBefore === 2) {
    reason = "storing-energy";
    script = Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_BideStoringEnergy",
    });
  } else if (encodedBefore === 1 && storedDamage === 0) {
    reason = "released-with-no-energy";
    script = Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_BideNoEnergyToAttack",
    });
  } else if (encodedBefore === 1) {
    const savedTarget = rulesContext.bideTarget[attacker];
    const expectedSinglesTarget = (attacker ^ 1) as BattleScriptBattlerId;
    if (
      savedTarget !== expectedSinglesTarget
      || rulesContext.battlers[savedTarget].side === sourceBattler.side
    ) {
      throw new Error(
        `gBideTarget[${attacker}] must be the opposing active singles slot `
        + `${expectedSinglesTarget}, got ${savedTarget}`,
      );
    }
    reason = "released-attack";
    nextCurrentMove = BATTLE_SCRIPT_MOVE_BIDE;
    nextCurrentMoveEffect = resolveBattleScriptCurrentMoveEffect(
      BATTLE_SCRIPT_MOVE_BIDE,
    );
    nextCurrentMovePower = resolveBattleScriptCurrentMovePower(
      BATTLE_SCRIPT_MOVE_BIDE,
    );
    // The target compiler uses 32-bit two's-complement registers. Math.imul
    // makes the width and wrap behavior explicit for every positive s32 input.
    nextScriptingBideDmg = Math.imul(storedDamage, 2);
    nextSelectorRoles = Object.freeze({
      ...rulesContext.selectorRoles,
      target: savedTarget,
    });
    target = Object.freeze({
      kind: "restore-saved",
      before: rulesContext.selectorRoles.target,
      savedTarget,
      after: savedTarget,
      sourceArray: "gBideTarget",
      resolution: "saved-target-present",
    });
    scriptingBideDamage = Object.freeze({
      kind: "set-doubled",
      before: rulesContext.scriptingBideDmg,
      after: nextScriptingBideDmg,
      sourceOperation: "gBideDmg[gBattlerAttacker] * 2",
      arithmetic: "signed-s32-two-complement",
    });
    script = Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_BideAttack",
    });
  }

  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_THAW;
  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battlers: nextBattlers,
    selectorRoles: nextSelectorRoles,
    currentMove: nextCurrentMove,
    currentMoveEffect: nextCurrentMoveEffect,
    currentMovePower: nextCurrentMovePower,
    scriptingBideDmg: nextScriptingBideDmg,
    atkCancelerTracker: trackerAfter,
  });
  const releaseClearingOwner =
    reason === "released-attack"
      ? "BattleScript_BideAttack" as const
      : reason === "released-with-no-energy"
        ? "BattleScript_BideNoEnergyToAttack" as const
        : "not-requested" as const;

  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    rngValue: sourceRng,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_BIDE",
      attacker,
      reason,
      counter: Object.freeze({
        sourceMask: "STATUS2_BIDE",
        mask: bideMask,
        status2Before: sourceBattler.status2,
        encodedBefore,
        decrement,
        status2After: nextStatus2,
        encodedAfter,
      }),
      multiTurnStatus: Object.freeze({
        sourceMask: "STATUS2_MULTIPLETURNS",
        before: (
          sourceBattler.status2
          & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
        ) !== 0,
        after: (
          nextStatus2
          & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
        ) !== 0,
        clearingOwner: releaseClearingOwner,
      }),
      accumulatedDamage: Object.freeze({
        sourceArray: "gBideDmg",
        before: storedDamage,
        after: storedDamage,
      }),
      scriptingBideDamage,
      currentMove: nextCurrentMove === rulesContext.currentMove
        ? Object.freeze({
          kind: "preserve",
          before: rulesContext.currentMove,
          after: rulesContext.currentMove,
        })
        : Object.freeze({
          kind: "set",
          before: rulesContext.currentMove,
          after: BATTLE_SCRIPT_MOVE_BIDE,
          sourceConstant: "MOVE_BIDE",
        }),
      target,
      singlesTargetInvariant: Object.freeze({
        absentBattlerFlags: 0 as const,
        rngCallsConsumed: 0 as const,
        absentSavedTargetBranch:
          "source-unreachable-at-level-50-singles-action-boundary" as const,
      }),
      rng: Object.freeze({
        kind: "preserve",
        value: sourceRng,
        callsConsumed: 0 as const,
      }),
      effect: encodedBefore === 0 ? 0 as const : 1 as const,
      script,
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_BIDE",
        sourcePhaseAfter: "CANCELER_THAW",
      }),
    }),
  });
}

/**
 * Immutable source phase for battle_util.c:2250-2264 plus the effect==2
 * controller synchronization at lines 2270-2275.
 *
 * The source quirk is intentional: any frozen attacker returns effect 2 and
 * synchronizes status1 after the canceler loop. Only EFFECT_THAW_HIT clears
 * STATUS1_FREEZE or changes the script/cursor/chooser. This seam records the
 * controller work semantically; it does not execute a controller or own
 * status-icon presentation.
 */
export function advanceBattleScriptAttackCancelerThaw(
  rulesContext: BattleScriptRulesContext,
  sourceProgramCounter: number,
  rngValue: number,
): BattleScriptAttackCancelerThawDecision {
  const sourcePc = requireSourceProgramCounter(sourceProgramCounter);
  const sourceRng = requireRngValue(rngValue);
  const trackerBefore = rulesContext.atkCancelerTracker;
  if (
    trackerBefore
    !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_THAW
  ) {
    return Object.freeze({
      kind: "not-at-source-phase",
      rulesContext,
      rngValue: sourceRng,
      receipt: Object.freeze({
        sourcePhase: "CANCELER_THAW",
        tracker: Object.freeze({
          before: trackerBefore,
          after: trackerBefore,
        }),
        rng: Object.freeze({
          kind: "preserve",
          value: sourceRng,
          callsConsumed: 0 as const,
        }),
      }),
    });
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error(
      "Battle Script attack canceler thaw phase requires an attacker role",
    );
  }
  if (attacker > 1) {
    throw new Error(
      `CANCELER_THAW Level-50 singles attacker must be battler 0 or 1, got ${attacker}`,
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
  const defrostedByMove = isFrozen && isThawHit;
  const nextStatus1 = defrostedByMove
    ? (
      sourceBattler.status1
      & ~BATTLE_SCRIPT_STATUS1_FREEZE
    ) >>> 0
    : sourceBattler.status1;
  const nextBattler = nextStatus1 === sourceBattler.status1
    ? sourceBattler
    : Object.freeze({ ...sourceBattler, status1: nextStatus1 });
  const nextBattlers = nextBattler === sourceBattler
    ? rulesContext.battlers
    : Object.freeze(rulesContext.battlers.map((candidate, index) =>
      index === attacker ? nextBattler : candidate
    )) as unknown as BattleScriptRulesContext["battlers"];
  const trackerAfter = BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_END;
  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battlers: nextBattlers,
    atkCancelerTracker: trackerAfter,
    multistringChooser: defrostedByMove
      ? 1
      : rulesContext.multistringChooser,
  });
  const reason: BattleScriptAttackCancelerThawReason = !isFrozen
    ? "not-frozen"
    : defrostedByMove
      ? "defrosted-by-move"
      : "frozen-status-sync";
  const effect = isFrozen ? 2 as const : 0 as const;
  const script: BattleScriptAttackCancelerScriptEffect = defrostedByMove
    ? Object.freeze({
      kind: "handoff",
      sourceProgramCounter: sourcePc,
      targetLabel: "BattleScript_MoveUsedUnfroze",
    })
    : Object.freeze({
      kind: "preserve",
      sourceProgramCounter: sourcePc,
    });
  const cursor: BattleScriptAttackCancelerCursorEffect = defrostedByMove
    ? Object.freeze({
      kind: "push",
      sourceProgramCounter: sourcePc,
    })
    : Object.freeze({ kind: "preserve" });
  const multistringChooser: BattleScriptAttackCancelerMultistringEffect =
    defrostedByMove
      ? Object.freeze({
        kind: "set",
        sourceConstant: "B_MSG_DEFROSTED_BY_MOVE",
        value: 1,
      })
      : Object.freeze({ kind: "preserve" });
  const controllerSync: BattleScriptAttackCancelerThawControllerSync =
    isFrozen
      ? Object.freeze({
        kind: "frozen-status1-sync",
        activeBattler: Object.freeze({
          sourceGlobal: "gActiveBattler",
          after: attacker,
        }),
        emit: Object.freeze({
          sourceFunction: "BtlController_EmitSetMonData",
          sourceRequest: "REQUEST_STATUS_BATTLE",
          offset: 0,
          size: 4,
          value: nextStatus1,
        }),
        mark: Object.freeze({
          sourceFunction: "MarkBattlerForControllerExec",
          battler: attacker,
        }),
      })
      : Object.freeze({
        kind: "none",
        reason: "effect-zero",
      });

  return Object.freeze({
    kind: "advance",
    reason,
    rulesContext: nextRulesContext,
    rngValue: sourceRng,
    receipt: Object.freeze({
      sourcePhase: "CANCELER_THAW",
      attacker,
      reason,
      freezePredicate: Object.freeze({
        sourceMask: "STATUS1_FREEZE",
        mask: BATTLE_SCRIPT_STATUS1_FREEZE,
        status1: sourceBattler.status1,
        matches: isFrozen,
      }),
      moveEffect: Object.freeze({
        currentMove: rulesContext.currentMove,
        sourceField: "gBattleMoves[gCurrentMove].effect",
        value: rulesContext.currentMoveEffect,
        sourceConstant: "EFFECT_THAW_HIT",
        thawHitValue: BATTLE_SCRIPT_EFFECT_THAW_HIT,
        matches: isThawHit,
      }),
      status1: bitFieldEffect(sourceBattler.status1, nextStatus1),
      effect,
      script,
      cursor,
      multistringChooser,
      controllerSync,
      rng: Object.freeze({
        kind: "preserve",
        value: sourceRng,
        callsConsumed: 0 as const,
      }),
      tracker: Object.freeze({
        before: trackerBefore,
        after: trackerAfter,
        sourcePhaseBefore: "CANCELER_THAW",
        sourcePhaseAfter: "CANCELER_END",
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

/**
 * battle_util.c:2157-2175 reads the active gBattleMons record directly:
 * after the sole `Random() & 1` draw selects self-damage, it targets the
 * attacker and calls CalculateBaseDamage with that same record as both
 * operands, MOVE_POUND, sideStatus=0, powerOverride=40, typeOverride=0.
 * Generated battles therefore need no separate staged operand object; the
 * optional object remains only as a focused-fixture override.
 */
function confusionDamageFromLiveBattler(
  battler: BattleScriptRulesContext["battlers"][number],
) {
  return Object.freeze({
    level: battler.level,
    attack: battler.attack,
    defense: battler.defense,
    attackStage: battler.statStages[1]!,
    defenseStage: battler.statStages[2]!,
    // include/constants/battle.h:118 -- STATUS1_BURN = 1 << 4.
    isBurned: (battler.status1 & (1 << 4)) !== 0,
    // include/constants/abilities.h:69 -- ABILITY_GUTS = 62.
    hasGuts: battler.ability === 62,
  });
}
