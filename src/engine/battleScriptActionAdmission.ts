import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ABILITY_EARLY_BIRD,
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_ACTION_FINISHED,
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP,
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_MOVE_SLEEP_TALK,
  BATTLE_SCRIPT_MOVE_SNORE,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_STATUS1_SLEEP,
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
    targetLabel: "BattleScript_MoveUsedIsAsleep" | "BattleScript_MoveUsedWokeUp";
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
    sourceConstant: "B_MSG_WOKE_UP" | "B_MSG_WOKE_UP_UPROAR";
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
