import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  advanceBattleScriptAttackCancelerAsleep,
  advanceBattleScriptAttackCancelerBide,
  advanceBattleScriptAttackCancelerConfused,
  advanceBattleScriptAttackCancelerDisabled,
  advanceBattleScriptAttackCancelerFlags,
  advanceBattleScriptAttackCancelerFlinch,
  advanceBattleScriptAttackCancelerFrozen,
  advanceBattleScriptAttackCancelerImprisoned,
  advanceBattleScriptAttackCancelerInLove,
  advanceBattleScriptAttackCancelerParalyzed,
  advanceBattleScriptAttackCancelerRecharge,
  advanceBattleScriptAttackCancelerTaunted,
  advanceBattleScriptAttackCancelerThaw,
  advanceBattleScriptAttackCancelerTruant,
  type BattleScriptAttackCancelerAsleepDecision,
  type BattleScriptAttackCancelerBideDecision,
  type BattleScriptAttackCancelerConfusedDecision,
  type BattleScriptAttackCancelerDisabledDecision,
  type BattleScriptAttackCancelerFlagsDecision,
  type BattleScriptAttackCancelerFlinchDecision,
  type BattleScriptAttackCancelerFrozenDecision,
  type BattleScriptAttackCancelerImprisonedDecision,
  type BattleScriptAttackCancelerInLoveDecision,
  type BattleScriptAttackCancelerParalyzedDecision,
  type BattleScriptAttackCancelerRechargeDecision,
  type BattleScriptAttackCancelerScriptEffect,
  type BattleScriptAttackCancelerTauntedDecision,
  type BattleScriptAttackCancelerThawDecision,
  type BattleScriptAttackCancelerTruantDecision,
} from "./battleScriptActionAdmission.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
} from "./battleScriptSourceConstants.ts";

type Advanced<T> = Extract<T, Readonly<{ kind: "advance" }>>;

export type BattleScriptAttackCancelerPhaseDecision =
  | Advanced<BattleScriptAttackCancelerFlagsDecision>
  | Advanced<BattleScriptAttackCancelerAsleepDecision>
  | Advanced<BattleScriptAttackCancelerFrozenDecision>
  | Advanced<BattleScriptAttackCancelerTruantDecision>
  | Advanced<BattleScriptAttackCancelerRechargeDecision>
  | Advanced<BattleScriptAttackCancelerFlinchDecision>
  | Advanced<BattleScriptAttackCancelerDisabledDecision>
  | Advanced<BattleScriptAttackCancelerTauntedDecision>
  | Advanced<BattleScriptAttackCancelerImprisonedDecision>
  | Advanced<BattleScriptAttackCancelerConfusedDecision>
  | Advanced<BattleScriptAttackCancelerParalyzedDecision>
  | Advanced<BattleScriptAttackCancelerInLoveDecision>
  | Advanced<BattleScriptAttackCancelerBideDecision>
  | Advanced<BattleScriptAttackCancelerThawDecision>;

export type BattleScriptAttackCancelerLoopState = Readonly<{
  rulesContext: BattleScriptRulesContext;
  rngValue: number;
  /** Cumulative Random() calls owned by the rules state before this helper. */
  rngCallsConsumed: number;
}>;

export type BattleScriptAttackCancelerLoopControllerSync =
  | Readonly<{
    kind: "none";
    sourceCondition: "effect != 2";
  }>
  | Readonly<{
    kind: "request-status1-write";
    sourceCondition: "effect == 2";
    sourceOwner: "AtkCanceler_UnableToUseMove";
    battler: BattleScriptBattlerId;
    sourceRequest: "REQUEST_STATUS_BATTLE";
    offset: 0;
    size: 4;
    value: number;
    markForControllerExecution: true;
  }>;

export type BattleScriptAttackCancelerLoopReceipt = Readonly<{
  sourceFunction: "AtkCanceler_UnableToUseMove";
  tracker: Readonly<{
    before: number;
    after: number;
  }>;
  /** Exact switch-case order executed by the source do/while. */
  phases: readonly BattleScriptAttackCancelerPhaseDecision[];
  effect: 0 | 1 | 2;
  programCounter: BattleScriptAttackCancelerScriptEffect;
  rng: Readonly<{
    before: number;
    after: number;
    callsBefore: number;
    callsAfter: number;
    callsConsumed: number;
  }>;
  /**
   * The source's single post-loop effect==2 controller synchronization.
   * Phase decisions remain present verbatim, including any phase-local
   * semantic controller ownership they already expose.
   */
  controllerSync: BattleScriptAttackCancelerLoopControllerSync;
}>;

export type BattleScriptAttackCancelerLoopResult =
  BattleScriptAttackCancelerLoopState & Readonly<{
    kind: "end" | "effect";
    effect: 0 | 1 | 2;
    receipt: BattleScriptAttackCancelerLoopReceipt;
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
    throw new Error(
      `Battle Script attack canceler RNG call count must be a nonnegative safe integer, got ${value}`,
    );
  }
  return value;
}

function requireRulesContext(
  value: BattleScriptRulesContext,
): BattleScriptRulesContext {
  if (
    value === null
    || typeof value !== "object"
    || !Number.isSafeInteger(value.atkCancelerTracker)
  ) {
    throw new Error(
      "Battle Script attack canceler loop requires a typed rules context",
    );
  }
  const tracker = value.atkCancelerTracker;
  if (
    tracker < BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FLAGS
    || tracker > BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_END
  ) {
    throw new Error(
      `AtkCanceler_UnableToUseMove tracker must be CANCELER_FLAGS..CANCELER_END (0..14), got ${tracker}`,
    );
  }
  return value;
}

function requireAdvance<T extends Readonly<{ kind: string }>>(
  decision: T,
  tracker: number,
): Extract<T, Readonly<{ kind: "advance" }>> {
  if (decision.kind !== "advance") {
    throw new Error(
      `Attack canceler dispatcher failed to advance source tracker ${tracker}`,
    );
  }
  return decision as Extract<T, Readonly<{ kind: "advance" }>>;
}

function phaseEffect(
  decision: BattleScriptAttackCancelerPhaseDecision,
): 0 | 1 | 2 {
  if (decision.receipt.sourcePhase === "CANCELER_FLAGS") return 0;
  return decision.receipt.effect;
}

function phaseScript(
  decision: BattleScriptAttackCancelerPhaseDecision,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerScriptEffect {
  if (decision.receipt.sourcePhase === "CANCELER_FLAGS") {
    return Object.freeze({
      kind: "preserve",
      sourceProgramCounter,
    });
  }
  return decision.receipt.script;
}

function phaseRngCalls(
  decision: BattleScriptAttackCancelerPhaseDecision,
): number {
  switch (decision.receipt.sourcePhase) {
    case "CANCELER_FROZEN":
      return decision.receipt.rng.kind === "draw" ? 1 : 0;
    case "CANCELER_CONFUSED":
    case "CANCELER_PARALYZED":
    case "CANCELER_IN_LOVE":
    case "CANCELER_BIDE":
    case "CANCELER_THAW":
      return decision.receipt.rng.callsConsumed;
    default:
      return 0;
  }
}

/**
 * `AtkCanceler_UnableToUseMove` owns writes to
 * `gBattleCommunication[MULTISTRING_CHOOSER]` before handing a later battle
 * script to `printfromtable`. Phase receipts preserve that source ownership;
 * this loop is the durable rules-context seam between the source phase and
 * the script interpreter. Project every typed selector write here instead of
 * coupling a particular table (for example `gWokeUpStringIds`) to the loop.
 */
function projectPhaseMultistringChooser(
  rulesContext: BattleScriptRulesContext,
  decision: BattleScriptAttackCancelerPhaseDecision,
): BattleScriptRulesContext {
  if (!("multistringChooser" in decision.receipt)) {
    return rulesContext;
  }
  const selector = decision.receipt.multistringChooser;
  if (selector.kind !== "set" || selector.value === rulesContext.multistringChooser) {
    return rulesContext;
  }
  return Object.freeze({
    ...rulesContext,
    multistringChooser: selector.value,
  });
}

/**
 * Immutable composition of battle_util.c's complete
 * AtkCanceler_UnableToUseMove do/while helper.
 *
 * This is a pure rules seam. It dispatches the already source-pinned phase
 * helpers, owns their ordered RNG state, and records controller/script
 * handoffs without executing either system. It does not register opcode 0 or
 * integrate the battle decision, round, or presentation controllers.
 *
 * The returned result is itself a valid next `state` input. A nonzero effect
 * leaves the tracker advanced past its owner, so a later invocation resumes
 * at the next source phase; an all-clear call reaches CANCELER_END.
 */
export function advanceBattleScriptAttackCancelerUnableToUseMove(
  state: BattleScriptAttackCancelerLoopState,
  sourceProgramCounter: number,
): BattleScriptAttackCancelerLoopResult {
  if (state === null || typeof state !== "object") {
    throw new Error("Battle Script attack canceler loop requires a state object");
  }
  const sourcePc = requireU32(
    sourceProgramCounter,
    "Battle Script source program counter",
  );
  let rulesContext = requireRulesContext(state.rulesContext);
  let rngValue = requireU32(
    state.rngValue,
    "Battle Script attack canceler RNG value",
  );
  const rngBefore = rngValue;
  const callsBefore = requireCallCount(state.rngCallsConsumed);
  let rngCallsConsumed = callsBefore;
  const trackerBefore = rulesContext.atkCancelerTracker;
  const phases: BattleScriptAttackCancelerPhaseDecision[] = [];
  let effect: 0 | 1 | 2 = 0;
  let programCounter: BattleScriptAttackCancelerScriptEffect = Object.freeze({
    kind: "preserve",
    sourceProgramCounter: sourcePc,
  });

  while (
    rulesContext.atkCancelerTracker
      !== BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_END
    && effect === 0
  ) {
    const tracker = rulesContext.atkCancelerTracker;
    let decision: BattleScriptAttackCancelerPhaseDecision;
    switch (tracker) {
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FLAGS:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerFlags(rulesContext),
          tracker,
        );
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_ASLEEP:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerAsleep(rulesContext, sourcePc),
          tracker,
        );
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FROZEN:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerFrozen(
            rulesContext,
            sourcePc,
            rngValue,
          ),
          tracker,
        );
        rngValue = decision.rngValue;
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TRUANT:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerTruant(rulesContext, sourcePc),
          tracker,
        );
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_RECHARGE:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerRecharge(rulesContext, sourcePc),
          tracker,
        );
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FLINCH:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerFlinch(rulesContext, sourcePc),
          tracker,
        );
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_DISABLED:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerDisabled(rulesContext, sourcePc),
          tracker,
        );
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TAUNTED:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerTaunted(rulesContext, sourcePc),
          tracker,
        );
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IMPRISONED:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerImprisoned(rulesContext, sourcePc),
          tracker,
        );
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_CONFUSED:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerConfused(
            rulesContext,
            sourcePc,
            rngValue,
          ),
          tracker,
        );
        rngValue = decision.rngValue;
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_PARALYZED:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerParalyzed(
            rulesContext,
            sourcePc,
            rngValue,
          ),
          tracker,
        );
        rngValue = decision.rngValue;
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IN_LOVE:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerInLove(
            rulesContext,
            sourcePc,
            rngValue,
          ),
          tracker,
        );
        rngValue = decision.rngValue;
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerBide(
            rulesContext,
            sourcePc,
            rngValue,
          ),
          tracker,
        );
        rngValue = decision.rngValue;
        break;
      case BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_THAW:
        decision = requireAdvance(
          advanceBattleScriptAttackCancelerThaw(
            rulesContext,
            sourcePc,
            rngValue,
          ),
          tracker,
        );
        rngValue = decision.rngValue;
        break;
      default:
        throw new Error(
          `AtkCanceler_UnableToUseMove has no source phase for tracker ${tracker}`,
        );
    }

    phases.push(decision);
    rulesContext = projectPhaseMultistringChooser(
      decision.rulesContext,
      decision,
    );
    rngCallsConsumed += phaseRngCalls(decision);
    effect = phaseEffect(decision);
    programCounter = phaseScript(decision, sourcePc);
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (effect === 2 && attacker === null) {
    throw new Error(
      "AtkCanceler_UnableToUseMove effect 2 requires an attacker for status synchronization",
    );
  }
  const controllerSync: BattleScriptAttackCancelerLoopControllerSync =
    effect === 2
      ? Object.freeze({
        kind: "request-status1-write",
        sourceCondition: "effect == 2",
        sourceOwner: "AtkCanceler_UnableToUseMove",
        battler: attacker as BattleScriptBattlerId,
        sourceRequest: "REQUEST_STATUS_BATTLE",
        offset: 0,
        size: 4,
        value: rulesContext.battlers[attacker as BattleScriptBattlerId].status1,
        markForControllerExecution: true,
      })
      : Object.freeze({
        kind: "none",
        sourceCondition: "effect != 2",
      });
  const frozenPhases = Object.freeze(phases);
  const receipt = Object.freeze({
    sourceFunction: "AtkCanceler_UnableToUseMove" as const,
    tracker: Object.freeze({
      before: trackerBefore,
      after: rulesContext.atkCancelerTracker,
    }),
    phases: frozenPhases,
    effect,
    programCounter,
    rng: Object.freeze({
      before: rngBefore,
      after: rngValue,
      callsBefore,
      callsAfter: rngCallsConsumed,
      callsConsumed: rngCallsConsumed - callsBefore,
    }),
    controllerSync,
  });

  return Object.freeze({
    kind: effect === 0 ? "end" : "effect",
    effect,
    rulesContext,
    rngValue,
    rngCallsConsumed,
    receipt,
  });
}
