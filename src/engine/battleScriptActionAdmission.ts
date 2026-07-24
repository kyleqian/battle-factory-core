import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ACTION_FINISHED,
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP,
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
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
