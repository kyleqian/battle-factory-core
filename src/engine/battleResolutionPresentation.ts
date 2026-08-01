import {
  createBattleCommandPresentation,
  type BattleCommandFieldBattler,
  type BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import { createBattleCommandFieldArtView } from "./battleCommandFieldArt.ts";
import type {
  BattleBoundary,
  BattleCommandDecision,
  BattleCommandRequest,
  BattleDecisionTransitionResult,
  BattleForcedSwitchRequest,
  BattleKernelSemanticEvent,
  BattlePartyIndex,
  BattleState,
} from "./battleDecisionBoundary.ts";
import type { FactoryFullTurnDecisionRules } from "./factoryBattleScriptFullTurnDecision.ts";
import type {
  BattleScriptActionMessageSnapshot,
  BattleScriptSemanticEventPayload,
} from "./battleScriptEvents.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  resolveBattleNameWithPrefix,
  resolveBattleStringLines,
  resolveMoveNameExclaim,
} from "./battleStringResolver.ts";
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };

const FACTORY_ITEM_NAME_BY_ID = new Map(
  (frontierHeldItemsData.entries as readonly Readonly<{
    itemId: number;
    displayName: string;
  }>[]).map(({ itemId, displayName }) => [itemId, displayName]),
);

export type BattleStatName = Extract<
  BattleScriptSemanticEventPayload,
  { kind: "stat-stage-change" }
>["stat"];

export type PartyBallState = "empty" | "healthy" | "status" | "fainted";

export type BattleMessageTiming = Readonly<{ minimumFrames: 24 }>;
export type BattleMoveAnimationTiming = Readonly<{ minimumFrames: number }>;
export type BattleHitAnimationTiming = Readonly<{
  minimumFrames: 35;
  firstDisplayedAge: 1;
}>;
export type BattleHpTiming = Readonly<{ minimumFrames: 28 }>;
export type BattleStatTiming = Readonly<{ minimumFrames: 32 }>;
export type BattleStatusTiming = Readonly<{ minimumFrames: 32 }>;
export type BattleStatusIconTiming = Readonly<{ minimumFrames: 1 }>;
export type BattleFaintTiming =
  | Readonly<{
      minimumFrames: number;
      sink: "opponent-tile-rows";
      steps: number;
      healthboxVanishFrame: number;
    }>
  | Readonly<{
      minimumFrames: number;
      sink: "player-pixel-rows";
      pixelsPerFrame: 5;
      spriteRows: number;
      healthboxVanishFrame: number;
    }>;
export type BattleSwitchInTiming = Readonly<{ minimumFrames: 1 }>;
export type BattleSpriteVisibilityTiming = Readonly<{ minimumFrames: 1 }>;
export type BattleTurnEndTiming = Readonly<{ minimumFrames: 8 }>;

export type BattleResolutionPresentationCommand =
  | Readonly<{
      type: "message";
      eventSequence: number;
      lines: readonly string[];
      advance: "automatic" | "button";
      timing: BattleMessageTiming;
    }>
  | Readonly<{
      type: "move-animation";
      eventSequence: number;
      battler: 0 | 1;
      timing: BattleMoveAnimationTiming;
    }>
  | Readonly<{
      type: "hit-animation";
      eventSequence: number;
      battler: 0 | 1;
      timing: BattleHitAnimationTiming;
    }>
  | Readonly<{
      type: "hp";
      eventSequence: number;
      battler: 0 | 1;
      from: number;
      to: number;
      healthValue: number;
      timing: BattleHpTiming;
    }>
  | Readonly<{
      type: "stat";
      eventSequence: number;
      battler: 0 | 1;
      stat: BattleStatName;
      from: number;
      to: number;
      timing: BattleStatTiming;
    }>
  | Readonly<{
      type: "status";
      eventSequence: number;
      battler: 0 | 1;
      before: number;
      after: number;
      timing: BattleStatusTiming;
    }>
  | Readonly<{
      /** BtlController_EmitStatusIconUpdate's distinct healthbox display receipt. */
      type: "status-icon";
      eventSequence: number;
      battler: 0 | 1;
      status1: number;
      status2: number;
      timing: BattleStatusIconTiming;
    }>
  | Readonly<{
      type: "faint";
      eventSequence: number;
      battler: 0 | 1;
      partyIndex: BattlePartyIndex;
      timing: BattleFaintTiming;
    }>
  | Readonly<{
      type: "party-summary";
      eventSequence: number;
      battler: 0 | 1;
      visible: boolean;
      states: readonly PartyBallState[];
    }>
  | Readonly<{
      type: "switch-in";
      eventSequence: number;
      battler: 0 | 1;
      fromPartyIndex: BattlePartyIndex;
      toPartyIndex: BattlePartyIndex;
      incoming: BattleCommandFieldBattler;
      timing: BattleSwitchInTiming;
    }>
  | Readonly<{
      type: "sprite-visibility";
      eventSequence: number;
      battler: 0 | 1;
      visible: boolean;
      timing: BattleSpriteVisibilityTiming;
    }>
  | Readonly<{
      type: "turn-end";
      timing: BattleTurnEndTiming;
    }>;

export type BattleResolutionDisplayedField = Readonly<{
  player: BattleCommandFieldBattler;
  opponent: BattleCommandFieldBattler;
}>;

/**
 * Narrow compatibility receipt for the already-exact terminal battle window.
 * The immutable terminal boundary and all rendered strings are frozen before
 * the adapter starts; battleScene may consume its relative clocks, but may
 * not rediscover an outcome or trainer string from turn flags.
 */
export type BattleTerminalResolutionPresentationState = Readonly<{
  pendingBoundary: Extract<BattleBoundary, { kind: "terminal" }>;
  command: Readonly<{
    type: "terminal-result";
    resultLines: readonly [string, string];
    opponentLossLines: readonly [string, string];
  }>;
  confirmElapsed: number;
  menuRedrawElapsed: number;
  faintDismissElapsed: number | null;
  resultDismissElapsed: number | null;
  lossDismissElapsed: number | null;
}>;

export function createBattleTerminalResolutionPresentation(input: Readonly<{
  pendingBoundary: Extract<BattleBoundary, { kind: "terminal" }>;
  resultLines: readonly [string, string];
  opponentLossLines: readonly [string, string];
  confirmElapsed: number;
  menuRedrawElapsed: number;
}>): BattleTerminalResolutionPresentationState {
  return Object.freeze({
    pendingBoundary: input.pendingBoundary,
    command: Object.freeze({
      type: "terminal-result" as const,
      resultLines: Object.freeze([...input.resultLines]) as unknown as readonly [string, string],
      opponentLossLines: Object.freeze([...input.opponentLossLines]) as unknown as readonly [string, string],
    }),
    confirmElapsed: input.confirmElapsed,
    menuRedrawElapsed: input.menuRedrawElapsed,
    faintDismissElapsed: null,
    resultDismissElapsed: null,
    lossDismissElapsed: null,
  });
}

export function storeBattleTerminalPresentationDismiss(
  state: BattleTerminalResolutionPresentationState,
  gate: "faint" | "result" | "loss",
  elapsed: number,
): BattleTerminalResolutionPresentationState {
  const key = gate === "faint"
    ? "faintDismissElapsed"
    : gate === "result"
      ? "resultDismissElapsed"
      : "lossDismissElapsed";
  if (state[key] !== null) return state;
  return Object.freeze({ ...state, [key]: elapsed });
}

export type BattleResolutionSegment = Readonly<{
  /** Display field at this segment's real reducer boundary. */
  field: BattleResolutionDisplayedField;
  beforeRules: FactoryFullTurnDecisionRules;
  afterRules: FactoryFullTurnDecisionRules;
  events: readonly BattleKernelSemanticEvent[];
  commands: readonly BattleResolutionPresentationCommand[];
}>;

/**
 * The one-main-callback-at-a-time path from HandleInputChooseMove's accepted
 * response to Cmd_attackstring. These are source controller/interpreter
 * states, not a fitted duration:
 *
 * - battle_controller_player.c:481-527,200-213
 * - battle_main.c:4354-4402,4458-4551,4756-4854,4906-4957
 * - battle_util.c:78-292
 * - battle_scripts_1.s:236-247
 * - battle_script_commands.c:915-1006,1191-1203
 */
export type BattleResolutionConfirmHandoffStage =
  | "move-selection-response"
  | "selection-accepted"
  | "stop-bounce-request"
  | "actions-confirmed"
  | "turn-order"
  | "before-turn"
  | "action-dispatch"
  | "attack-canceler"
  | "accuracy-check";

export type BattleResolutionConfirmHandoff = Readonly<{
  stage: BattleResolutionConfirmHandoffStage;
  fightDisplayCursor: 0 | 1 | 2 | 3;
  idleBounceElapsed: number;
  bounceReset: boolean;
}>;

export type BattleResolutionPresentationState = Readonly<{
  resolutionId: Readonly<{
    requestId: number;
    side: "player";
    battler: 0;
  }>;
  sourceDecision: BattleCommandDecision;
  segments: readonly BattleResolutionSegment[];
  segmentIndex: number;
  commandIndex: number;
  lifecycle: Readonly<{
    phase:
      | "confirm-handoff"
      | "presenting"
      | "awaiting-message-dismiss"
      | "forced-party-handoff"
      | "presenting-switch-in"
      | "next-command-handoff"
      | "terminal-handoff";
    phaseElapsed: number;
  }>;
  confirmHandoff: BattleResolutionConfirmHandoff | null;
  field: BattleResolutionDisplayedField;
  pendingBoundary: BattleBoundary;
  pendingBattle: BattleState<FactoryFullTurnDecisionRules>;
  forcedRequest: BattleForcedSwitchRequest | null;
  opponentTrainer: Readonly<{ className: string; name: string }> | null;
}>;

export type CreateBattleResolutionPresentationInput = Readonly<{
  sourceRequest: BattleCommandRequest;
  sourceDecision: BattleCommandDecision;
  beforeRules: FactoryFullTurnDecisionRules;
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  fieldBoundary: BattleCommandPresentationState["field"];
  confirmHandoff: Readonly<{
    fightDisplayCursor: 0 | 1 | 2 | 3;
    idleBounceElapsed: number;
  }>;
  opponentTrainer?: Readonly<{ className: string; name: string }> | null;
}>;

const MESSAGE_TIMING = Object.freeze({ minimumFrames: 24 } as const);
/**
 * Scene-OFF hit controller lifetime:
 * setup, 32 blink callbacks, completion, and waitstate release.
 * battle_controller_opponent.c:1804-1816,440-456;
 * battle_script_commands.c:3927-3931.
 */
const HIT_ANIMATION_TIMING = Object.freeze({
  minimumFrames: 35,
  firstDisplayedAge: 1,
} as const);
/** BattleScript_Pausex20's `pause B_WAIT_TIME_SHORT`. */
const SCENE_OFF_MOVE_PAUSE_FRAMES = 32;
const HP_TIMING = Object.freeze({ minimumFrames: 28 } as const);
const STAT_TIMING = Object.freeze({ minimumFrames: 32 } as const);
const STATUS_TIMING = Object.freeze({ minimumFrames: 32 } as const);
/**
 * Cmd_updatestatusicon emits one controller request and waits for it
 * (battle_script_commands.c:7699-7730). Its player/opponent controller
 * handlers copy the healthbox status tile on that callback, then install the
 * ordinary completion callback (battle_controller_{player,opponent}.c:
 * 1712-1722 / 2755-2765). The display edge is therefore the receipt's own
 * one callback, independent of any skipped Scene-OFF status animation.
 */
const STATUS_ICON_TIMING = Object.freeze({ minimumFrames: 1 } as const);
const SWITCH_IN_TIMING = Object.freeze({ minimumFrames: 1 } as const);
const TURN_END_TIMING = Object.freeze({ minimumFrames: 8 } as const);

function singlesBattler(battler: number, context: string): 0 | 1 {
  if (battler === 0 || battler === 1) return battler;
  throw new Error(`${context} cannot present non-singles battler ${battler}`);
}

function fieldBattler(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
): BattleCommandFieldBattler {
  return battler === 0 ? field.player : field.opponent;
}

function factoryItemDisplayName(itemId: number): string {
  const name = FACTORY_ITEM_NAME_BY_ID.get(itemId);
  if (name === undefined) {
    throw new Error(`battle resolution cannot resolve Factory held item ${itemId}`);
  }
  return name;
}

function sourceLabelOf(event: BattleKernelSemanticEvent): string {
  if (!event.provenance) {
    throw new Error(
      `battle resolution event ${event.sequence}/${event.payload.kind} has no interpreter provenance`,
    );
  }
  return event.provenance.sourceLabel;
}

function instructionExecutionOf(event: BattleKernelSemanticEvent): number {
  sourceLabelOf(event);
  return event.provenance!.instructionExecution;
}

function nextHitAnimation(
  events: readonly BattleKernelSemanticEvent[],
  moveIndex: number,
): BattleKernelSemanticEvent | null {
  for (let index = moveIndex + 1; index < events.length; index += 1) {
    const candidate = events[index]!;
    if (
      candidate.payload.kind === "animation"
      && candidate.payload.animationId === "HIT_ANIMATION"
    ) return candidate;
    if (
      candidate.payload.kind === "animation"
      && candidate.payload.animationId === "MOVE_ANIMATION"
    ) break;
  }
  return null;
}

/**
 * Compatibility only for staged/synthetic message receipts that intentionally
 * lack the production Cmd_printstring action snapshot. Real full-turn
 * STRINGID_USEDMOVE receipts never need to discover a later PP controller
 * event, which is absent for a locked continuation.
 */
function ppEventAfter(
  events: readonly BattleKernelSemanticEvent[],
  messageIndex: number,
): Extract<BattleScriptSemanticEventPayload, { kind: "set-battler-pp-data" }> {
  for (let index = messageIndex + 1; index < events.length; index += 1) {
    const payload = events[index]!.payload;
    if (payload.kind === "message" && payload.messageId === "STRINGID_USEDMOVE") break;
    if (payload.kind === "set-battler-pp-data") return payload;
  }
  throw new Error("battle resolution used-move event has no same-action PP event");
}

function messageLines(
  event: BattleKernelSemanticEvent,
  eventIndex: number,
  events: readonly BattleKernelSemanticEvent[],
  field: BattleResolutionDisplayedField,
  switchInBattler: 0 | 1 | null,
  afterField: BattleResolutionDisplayedField | null,
  lastStatChange: Extract<
    BattleScriptSemanticEventPayload,
    { kind: "stat-stage-change" }
  > | null,
  lastFaintBattler: 0 | 1 | null,
  pendingStatusMessageBattler: 0 | 1 | null,
  lastMoveAttacker: 0 | 1 | null,
  pendingHeldItemEffectBattler: 0 | 1 | null,
  heldItems: readonly [number, number],
  actionSnapshot: BattleScriptActionMessageSnapshot | null,
  opponentTrainer: Readonly<{ className: string; name: string }> | null,
): readonly string[] {
  if (event.payload.kind !== "message") {
    throw new Error("battle resolution message resolver received a non-message event");
  }
  const { messageId } = event.payload;
  if (messageId === "STRINGID_USEDMOVE") {
    const pp = actionSnapshot === null ? ppEventAfter(events, eventIndex) : null;
    const battler = actionSnapshot === null
      ? singlesBattler(pp!.battler, "used-move message")
      : singlesBattler(actionSnapshot.attacker, "used-move action snapshot");
    const displayed = fieldBattler(field, battler);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: battler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
      // Cmd_attackstring/Cmd_printstring sees gCurrentMove, not the move in
      // the PP-owning slot. This distinction is observable for Assist-called
      // FLY: the source slot is Assist, while the locked continuation prints
      // FLY and emits no second PP update.
      B_BUFF2: () => resolveMoveNameExclaim(
        actionSnapshot?.currentMove ?? displayed.moveIds[pp!.movePosition]!,
      ),
    });
  }
  if (messageId === "STRINGID_ITDOESNTAFFECT") {
    if (lastMoveAttacker === null) {
      throw new Error(
        "battle resolution no-effect message has no preceding used-move event",
      );
    }
    const defender = lastMoveAttacker === 0 ? 1 : 0;
    const displayed = fieldBattler(field, defender);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: defender === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  if (messageId === "STRINGID_ATTACKMISSED") {
    if (lastMoveAttacker === null) {
      throw new Error(
        "battle resolution attack-missed message has no preceding used-move event",
      );
    }
    const displayed = fieldBattler(field, lastMoveAttacker);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: lastMoveAttacker === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  if (
    messageId === "STRINGID_DEFENDERSSTATROSE"
    || messageId === "STRINGID_DEFENDERSSTATFELL"
  ) {
    if (!lastStatChange) {
      throw new Error(
        "battle resolution stat-change message has no preceding stat event",
      );
    }
    const battler = singlesBattler(lastStatChange.battler, "stat-fell message");
    const displayed = fieldBattler(field, battler);
    const amount = Math.abs(lastStatChange.from - lastStatChange.to);
    const rose = messageId === "STRINGID_DEFENDERSSTATROSE";
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: battler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
      B_BUFF1: () => lastStatChange.stat,
      B_BUFF2: () =>
        rose
          ? amount >= 2 ? "sharply rose!" : "rose!"
          : amount >= 2 ? "harshly fell!" : "fell!",
    });
  }
  if (messageId === "STRINGID_TARGETFAINTED") {
    if (lastFaintBattler === null) {
      throw new Error("battle resolution target-fainted message has no faint event");
    }
    const displayed = fieldBattler(field, lastFaintBattler);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: lastFaintBattler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  if (messageId === "STRINGID_ATTACKERFAINTED") {
    if (lastFaintBattler === null) {
      throw new Error("battle resolution attacker-fainted message has no faint event");
    }
    const displayed = fieldBattler(field, lastFaintBattler);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: lastFaintBattler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  if (messageId === "STRINGID_SWITCHINMON") {
    if (switchInBattler === null || afterField === null) {
      throw new Error(
        "battle resolution switch-in message has no preceding switch/post-switch field",
      );
    }
    const incoming = fieldBattler(afterField, switchInBattler);
    if (switchInBattler === 0) {
      return Object.freeze([`Go! ${incoming.name}!`]);
    }
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution opponent switch-in message requires a frozen trainer-name substitution",
      );
    }
    return Object.freeze([
      `${opponentTrainer.className} ${opponentTrainer.name} sent`,
      `out ${incoming.name}!`,
    ]);
  }
  const resolvers: Record<string, () => string> = {};
  if (lastMoveAttacker !== null) {
    const displayed = fieldBattler(field, lastMoveAttacker);
    // Some effect scripts print their action-specific result after a
    // controller PP receipt without STRINGID_USEDMOVE (two-turn charge is
    // one source example). Supplying the already-owned attacker token is
    // generic; templates that do not reference it ignore it.
    resolvers.B_ATK_NAME_WITH_PREFIX = () => resolveBattleNameWithPrefix({
      side: lastMoveAttacker === 0 ? "player" : "opponent",
      isTrainerBattle: true,
      nickname: displayed.name,
    });
  }
  if (pendingStatusMessageBattler !== null) {
    const displayed = fieldBattler(field, pendingStatusMessageBattler);
    // SetMoveEffect's raw REQUEST_STATUS_BATTLE receipt precedes its result
    // text. Keep that target only until the next text receipt, so a
    // B_EFF_NAME_WITH_PREFIX template is sourced from the status write—not
    // inferred from a move, species, or later battle state.
    resolvers.B_EFF_NAME_WITH_PREFIX = () => resolveBattleNameWithPrefix({
      side: pendingStatusMessageBattler === 0 ? "player" : "opponent",
      isTrainerBattle: true,
      nickname: displayed.name,
    });
  }
  if (pendingHeldItemEffectBattler !== null) {
    const displayed = fieldBattler(field, pendingHeldItemEffectBattler);
    // Every source held-item result script presents B_ANIM_HELD_ITEM_EFFECT
    // for the same BS_ATTACKER/BS_SCRIPTING battler before printing its text.
    // Preserve that typed controller receipt as gBattleScripting.battler's
    // presentation owner; do not rediscover the owner from a move or species.
    resolvers.B_SCR_ACTIVE_NAME_WITH_PREFIX = () => resolveBattleNameWithPrefix({
      side: pendingHeldItemEffectBattler === 0 ? "player" : "opponent",
      isTrainerBattle: true,
      nickname: displayed.name,
    });
    // gLastUsedItem is the item which fired, before the later removeitem
    // controller receipt consumes it. `heldItems` starts at the segment's
    // reducer boundary and follows any typed item writes in event order.
    resolvers.B_LAST_ITEM = () => factoryItemDisplayName(
      heldItems[pendingHeldItemEffectBattler],
    );
  }
  return resolveBattleStringLines(messageId, resolvers);
}

function partyBallStates(
  rules: BattleScriptRulesContext,
  battler: 0 | 1,
): readonly PartyBallState[] {
  const party = battler === 0
    ? rules.party.player
    : rules.party.opponent;
  return Object.freeze(party.map((member): PartyBallState => {
    if (member.species === 0 || member.isEgg) return "empty";
    if (member.hp === 0) return "fainted";
    if (member.status1 !== 0) return "status";
    return "healthy";
  }));
}

function fieldAfter(
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
): BattleResolutionDisplayedField | null {
  if (
    transition.state.boundary.kind !== "decision-required"
    || transition.state.boundary.request.kind !== "command"
    || transition.state.boundary.request.side !== "player"
  ) return null;
  return createBattleCommandPresentation(
    transition.state.boundary.request,
    transition.state.rules.rulesContext,
  ).field;
}

export function projectBattleResolutionCommands(
  events: readonly BattleKernelSemanticEvent[],
  beforeRules: BattleScriptRulesContext,
  afterRules: BattleScriptRulesContext,
  field: BattleResolutionDisplayedField,
  afterField: BattleResolutionDisplayedField | null,
  opponentTrainer: Readonly<{ className: string; name: string }> | null = null,
): readonly BattleResolutionPresentationCommand[] {
  const commands: BattleResolutionPresentationCommand[] = [];
  const pendingHealth = new Map<0 | 1, { eventSequence: number; healthValue: number }>();
  const pendingSwitch = new Map<
    0 | 1,
    { eventSequence: number; fromPartyIndex: BattlePartyIndex; toPartyIndex: BattlePartyIndex }
  >();
  let lastSequence = -1;
  let lastStatChange: Extract<
    BattleScriptSemanticEventPayload,
    { kind: "stat-stage-change" }
  > | null = null;
  let lastFaintBattler: 0 | 1 | null = null;
  let pendingStatusMessageBattler: 0 | 1 | null = null;
  let lastMoveAttacker: 0 | 1 | null = null;
  let pendingHeldItemEffectBattler: 0 | 1 | null = null;
  const heldItems = [
    beforeRules.battlers[0]!.item,
    beforeRules.battlers[1]!.item,
  ] as [number, number];
  let usedMoveInstructionExecution: number | null = null;
  const zeroHpBattlers = new Set<0 | 1>();
  const fieldArt = createBattleCommandFieldArtView(field);

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (!Number.isSafeInteger(event.sequence) || event.sequence <= lastSequence) {
      throw new Error(
        `battle resolution event sequence ${event.sequence} is not strictly increasing after ${lastSequence}`,
      );
    }
    lastSequence = event.sequence;
    const payload = event.payload;
    if (payload.kind === "set-battler-pp-data") {
      lastMoveAttacker = singlesBattler(payload.battler, "PP update");
      continue;
    }
    if (payload.kind === "message") {
      sourceLabelOf(event);
      const actionSnapshot = payload.actionSnapshot ?? null;
      if (actionSnapshot !== null) {
        // The full-turn receipt is frozen at Cmd_printstring time. Keeping
        // this current message's source owner also makes generic subsequent
        // attacker templates independent of controller PP timing.
        lastMoveAttacker = singlesBattler(
          actionSnapshot.attacker,
          "message action snapshot",
        );
      }
      if (payload.messageId === "STRINGID_USEDMOVE") {
        usedMoveInstructionExecution = instructionExecutionOf(event);
        if (actionSnapshot === null) {
          // Synthetic fixtures that predate the frozen snapshot retain the
          // former PP-receipt bridge deliberately.
          lastMoveAttacker = singlesBattler(
            ppEventAfter(events, index).battler,
            "used-move message",
          );
        }
      }
      const switchInBattler = payload.messageId === "STRINGID_SWITCHINMON"
        ? ([...pendingSwitch.keys()].at(-1) ?? null)
        : null;
      commands.push(Object.freeze({
        type: "message",
        eventSequence: event.sequence,
        lines: messageLines(
          event,
          index,
          events,
          field,
          switchInBattler,
          afterField,
          lastStatChange,
          lastFaintBattler,
          pendingStatusMessageBattler,
          lastMoveAttacker,
          pendingHeldItemEffectBattler,
          heldItems,
          actionSnapshot,
          opponentTrainer,
        ),
        advance:
          payload.messageId === "STRINGID_TARGETFAINTED"
          || payload.messageId === "STRINGID_ATTACKERFAINTED"
            ? "button"
            : "automatic",
        timing: MESSAGE_TIMING,
      }));
      pendingStatusMessageBattler = null;
      pendingHeldItemEffectBattler = null;
      continue;
    }
    if (
      payload.kind === "animation"
      && payload.animationId === "HELD_ITEM_EFFECT"
    ) {
      pendingHeldItemEffectBattler = singlesBattler(
        payload.battler ?? -1,
        "held-item effect animation",
      );
      continue;
    }
    if (
      payload.kind === "animation"
      && payload.animationId === "MOVE_ANIMATION"
    ) {
      const battler = singlesBattler(payload.battler ?? -1, "move animation");
      const hit = nextHitAnimation(events, index);
      if (usedMoveInstructionExecution === null || hit === null) {
        // A move animation without a hit receipt has no target hit/drain
        // choreography. Existing typed effect/status commands own its
        // controller-specific presentation.
        continue;
      }
      const hitExecution = instructionExecutionOf(hit);
      const interveningInstructions =
        hitExecution - usedMoveInstructionExecution;
      if (interveningInstructions <= 0) {
        throw new Error("battle resolution move/hit provenance is not ordered");
      }
      commands.push(Object.freeze({
        type: "move-animation",
        eventSequence: event.sequence,
        battler,
        // The attack-string text printer releases one callback after the
        // final displayed glyph. Then every source instruction through
        // Cmd_hitanimation runs once, while Scene OFF substitutes the
        // attackanimation command with BattleScript_Pausex20.
        timing: Object.freeze({
          minimumFrames:
            1 + interveningInstructions + SCENE_OFF_MOVE_PAUSE_FRAMES,
        }),
      }));
      continue;
    }
    if (
      payload.kind === "animation"
      && payload.animationId === "HIT_ANIMATION"
    ) {
      commands.push(Object.freeze({
        type: "hit-animation",
        eventSequence: event.sequence,
        battler: singlesBattler(payload.battler ?? -1, "hit animation"),
        timing: HIT_ANIMATION_TIMING,
      }));
      continue;
    }
    if (payload.kind === "health-bar-update") {
      const battler = singlesBattler(payload.battler, "health-bar update");
      if (pendingHealth.has(battler)) {
        throw new Error(`battle resolution has two unpaired HP updates for battler ${battler}`);
      }
      pendingHealth.set(battler, {
        eventSequence: event.sequence,
        healthValue: payload.healthValue,
      });
      continue;
    }
    if (payload.kind === "hp-change") {
      const battler = singlesBattler(payload.battler, "HP change");
      const health = pendingHealth.get(battler);
      if (!health) {
        throw new Error(`battle resolution HP change for battler ${battler} has no health-bar update`);
      }
      pendingHealth.delete(battler);
      commands.push(Object.freeze({
        type: "hp",
        eventSequence: health.eventSequence,
        battler,
        from: payload.from,
        to: payload.to,
        healthValue: health.healthValue,
        timing: HP_TIMING,
      }));
      if (payload.to === 0) zeroHpBattlers.add(battler);
      continue;
    }
    if (payload.kind === "stat-stage-change") {
      const battler = singlesBattler(payload.battler, "stat change");
      lastStatChange = payload;
      commands.push(Object.freeze({
        type: "stat",
        eventSequence: event.sequence,
        battler,
        stat: payload.stat,
        from: payload.from,
        to: payload.to,
        timing: STAT_TIMING,
      }));
      continue;
    }
    if (payload.kind === "set-battler-status-data") {
      const battler = singlesBattler(payload.battler, "status change");
      pendingStatusMessageBattler = battler;
      commands.push(Object.freeze({
        type: "status",
        eventSequence: event.sequence,
        battler,
        before: beforeRules.battlers[battler]!.status1,
        after: payload.status1,
        timing: STATUS_TIMING,
      }));
      continue;
    }
    if (payload.kind === "set-battler-item") {
      const battler = singlesBattler(payload.battler, "held-item update");
      heldItems[battler] = payload.item;
      continue;
    }
    if (payload.kind === "status-icon-update") {
      pendingStatusMessageBattler = null;
      commands.push(Object.freeze({
        type: "status-icon",
        eventSequence: event.sequence,
        battler: singlesBattler(payload.battler, "status icon update"),
        status1: payload.status1,
        status2: payload.status2,
        timing: STATUS_ICON_TIMING,
      }));
      continue;
    }
    if (payload.kind === "set-battler-sprite-visibility") {
      commands.push(Object.freeze({
        type: "sprite-visibility",
        eventSequence: event.sequence,
        battler: singlesBattler(payload.battler, "sprite visibility"),
        visible: !payload.invisible,
        // BtlController_EmitSpriteInvisibility is one controller callback;
        // the receipt itself owns the relative display edge.
        timing: Object.freeze({ minimumFrames: 1 as const }),
      }));
      continue;
    }
    if (payload.kind === "faint-animation") {
      const battler = singlesBattler(payload.battler, "faint animation");
      if (!zeroHpBattlers.has(battler)) {
        throw new Error(
          `battle resolution faint animation for battler ${battler} has no zero-HP event`,
        );
      }
      const timing: BattleFaintTiming = battler === 1
        ? (() => {
            const steps = 8 - Math.floor(fieldArt.opponent.coords.yOffset / 8);
            const healthboxVanishFrame = 2 * steps + 3;
            return Object.freeze({
              minimumFrames: healthboxVanishFrame + 2,
              sink: "opponent-tile-rows" as const,
              steps,
              healthboxVanishFrame,
            });
          })()
        : (() => {
            const spriteRows = fieldArt.player.pic.tileset.rows * 8;
            const healthboxVanishFrame = Math.ceil(spriteRows / 5) + 5;
            return Object.freeze({
              minimumFrames: healthboxVanishFrame + 2,
              sink: "player-pixel-rows" as const,
              pixelsPerFrame: 5 as const,
              spriteRows,
              healthboxVanishFrame,
            });
          })();
      commands.push(Object.freeze({
        type: "faint",
        eventSequence: event.sequence,
        battler,
        partyIndex: fieldBattler(field, battler).partyIndex,
        timing,
      }));
      lastFaintBattler = battler;
      continue;
    }
    if (
      payload.kind === "draw-party-status-summary"
      || payload.kind === "hide-party-status-summary"
    ) {
      const battler = singlesBattler(payload.battler, "party summary");
      commands.push(Object.freeze({
        type: "party-summary",
        eventSequence: event.sequence,
        battler,
        visible: payload.kind === "draw-party-status-summary",
        states: partyBallStates(afterRules, battler),
      }));
      continue;
    }
    if (payload.kind === "switch") {
      const battler = payload.side === "player" ? 0 : 1;
      const fromPartyIndex = payload.fromPartyIndex as BattlePartyIndex;
      const toPartyIndex = payload.toPartyIndex as BattlePartyIndex;
      if (
        fromPartyIndex < 0 || fromPartyIndex > 5
        || toPartyIndex < 0 || toPartyIndex > 5
      ) {
        throw new Error("battle resolution switch party index is outside 0..5");
      }
      pendingSwitch.set(battler, {
        eventSequence: event.sequence,
        fromPartyIndex,
        toPartyIndex,
      });
      continue;
    }
    if (payload.kind === "switch-in-animation") {
      const battler = singlesBattler(payload.battler, "switch-in animation");
      const switched = pendingSwitch.get(battler);
      if (!switched) {
        throw new Error(
          `battle resolution switch-in marker for battler ${battler} has no preceding switch event`,
        );
      }
      if (
        payload.partyIndex !== switched.toPartyIndex
        || afterField === null
      ) {
        throw new Error(
          `battle resolution switch-in marker for battler ${battler} has no matching post-switch field`,
        );
      }
      const incoming = fieldBattler(afterField, battler);
      if (incoming.partyIndex !== switched.toPartyIndex) {
        throw new Error(
          `battle resolution post-switch field has party index ${incoming.partyIndex}, expected ${switched.toPartyIndex}`,
        );
      }
      pendingSwitch.delete(battler);
      commands.push(Object.freeze({
        type: "switch-in",
        eventSequence: event.sequence,
        battler,
        fromPartyIndex: switched.fromPartyIndex,
        toPartyIndex: switched.toPartyIndex,
        incoming,
        timing: SWITCH_IN_TIMING,
      }));
    }
  }
  if (pendingHealth.size !== 0) {
    throw new Error("battle resolution has an unpaired health-bar update");
  }
  if (pendingSwitch.size !== 0) {
    throw new Error(
      "battle resolution switch has no switch-in-animation presentation marker",
    );
  }
  if (!commands.some(
    (command) => command.type === "message" && command.advance === "button",
  )) {
    commands.push(Object.freeze({ type: "turn-end", timing: TURN_END_TIMING }));
  }
  return Object.freeze(commands);
}

export function createBattleResolutionPresentation(
  input: CreateBattleResolutionPresentationInput,
): BattleResolutionPresentationState {
  if (input.sourceRequest.side !== "player" || input.sourceRequest.battler !== 0) {
    throw new Error("battle resolution requires a player-side singles source request");
  }
  if (!input.sourceRequest.legalDecisions.some((decision) =>
    JSON.stringify(decision) === JSON.stringify(input.sourceDecision)
  )) {
    throw new Error("battle resolution source decision is not legal for its source request");
  }
  if (
    input.sourceDecision.kind !== "use-move"
    || input.sourceDecision.moveSlot !== input.confirmHandoff.fightDisplayCursor
  ) {
    throw new Error(
      "battle resolution confirm handoff requires the confirmed move cursor",
    );
  }
  const field = Object.freeze({
    player: input.fieldBoundary.player,
    opponent: input.fieldBoundary.opponent,
  });
  const segment = Object.freeze({
    field,
    beforeRules: input.beforeRules,
    afterRules: input.transition.state.rules,
    events: input.transition.events,
    commands: projectBattleResolutionCommands(
      input.transition.events,
      input.beforeRules.rulesContext,
      input.transition.state.rules.rulesContext,
      field,
      fieldAfter(input.transition),
      input.opponentTrainer ?? null,
    ),
  });
  const boundary = input.transition.state.boundary;
  const forcedRequest =
    boundary.kind === "decision-required"
    && boundary.request.kind === "forced-switch"
    && boundary.request.side === "player"
      ? boundary.request
      : null;
  return Object.freeze({
    resolutionId: Object.freeze({
      requestId: input.sourceRequest.requestId,
      side: "player" as const,
      battler: 0 as const,
    }),
    sourceDecision: Object.freeze({ ...input.sourceDecision }),
    segments: Object.freeze([segment]),
    segmentIndex: 0,
    commandIndex: 0,
    lifecycle: Object.freeze({
      phase: "confirm-handoff" as const,
      phaseElapsed: 0,
    }),
    confirmHandoff: Object.freeze({
      stage: "move-selection-response" as const,
      bounceReset: false,
      ...input.confirmHandoff,
    }),
    field,
    pendingBoundary: boundary,
    pendingBattle: input.transition.state,
    forcedRequest,
    opponentTrainer: input.opponentTrainer ?? null,
  });
}

const CONFIRM_HANDOFF_NEXT = Object.freeze({
  "move-selection-response": "selection-accepted",
  "selection-accepted": "stop-bounce-request",
  "stop-bounce-request": "actions-confirmed",
  "actions-confirmed": "turn-order",
  "turn-order": "before-turn",
  "before-turn": "action-dispatch",
  "action-dispatch": "attack-canceler",
  "attack-canceler": "accuracy-check",
  "accuracy-check": null,
} satisfies Readonly<
  Record<
    BattleResolutionConfirmHandoffStage,
    BattleResolutionConfirmHandoffStage | null
  >
>);

/**
 * Advances one source battle-main/controller callback. The bouncer sprite
 * runs before controllers each frame, so the selection-accepted and
 * stop-bounce-request callbacks still contribute a step; once the STOP_BOUNCE
 * controller completes, the confirmed field remains frozen.
 */
export function advanceBattleResolutionConfirmHandoff(
  state: BattleResolutionPresentationState,
): BattleResolutionPresentationState {
  const handoff = state.confirmHandoff;
  if (state.lifecycle.phase !== "confirm-handoff" || handoff === null) {
    return state;
  }
  const nextStage = CONFIRM_HANDOFF_NEXT[handoff.stage];
  if (nextStage === null) {
    return Object.freeze({
      ...state,
      lifecycle: Object.freeze({
        phase: "presenting" as const,
        phaseElapsed: 0,
      }),
      confirmHandoff: null,
    });
  }
  const bounceRuns =
    nextStage === "selection-accepted"
    || nextStage === "stop-bounce-request";
  return Object.freeze({
    ...state,
    lifecycle: Object.freeze({
      phase: "confirm-handoff" as const,
      phaseElapsed: 0,
    }),
    confirmHandoff: Object.freeze({
      ...handoff,
      stage: nextStage,
      // EndBounceEffect destroys both invisible bouncers and writes x2/y2=0
      // when LINK_STANDBY_MSG_STOP_BOUNCE is handled
      // (battle_main.c:2940-2965).
      bounceReset:
        handoff.bounceReset || nextStage === "actions-confirmed",
      idleBounceElapsed:
        handoff.idleBounceElapsed + (bounceRuns ? 1 : 0),
    }),
  });
}

export type AppendBattleResolutionContinuationInput = Readonly<{
  resolution: BattleResolutionPresentationState;
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  fieldBoundary: BattleResolutionDisplayedField;
}>;

export type AppendBattleResolutionActionContinuationInput = Readonly<{
  resolution: BattleResolutionPresentationState;
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  /** The completed prior segment's frozen display field. */
  fieldBoundary: BattleResolutionDisplayedField;
}>;

export type BattleResolutionLockedActionIdentity = Readonly<{
  battler: 0 | 1;
  currentMove: number;
  currentMovePosition: 0 | 1 | 2 | 3;
}>;

export type AppendBattleResolutionLockedActionContinuationInput = Readonly<{
  resolution: BattleResolutionPresentationState;
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  /** The completed charge segment's frozen display field. */
  fieldBoundary: BattleResolutionDisplayedField;
  lockedAction: BattleResolutionLockedActionIdentity;
}>;

/**
 * `Cmd_printstring` freezes the action globals at every action-owned message.
 * A continuation need not print `STRINGID_USEDMOVE`: recharge and Bide-family
 * paths print their own source strings. The frozen action tuple is therefore
 * the narrow receipt that proves this driven transition resumed the retained
 * action rather than merely containing another battler's result text.
 */
function matchesRetainedLockedActionSnapshot(
  snapshot: BattleScriptActionMessageSnapshot | undefined,
  lockedAction: BattleResolutionLockedActionIdentity,
): boolean {
  return snapshot !== undefined
    && Object.isFrozen(snapshot)
    && snapshot.attacker === lockedAction.battler
    && snapshot.currentMove === lockedAction.currentMove
    && snapshot.currentMovePosition === lockedAction.currentMovePosition;
}

function hasRetainedLockedActionReceipt(
  events: readonly BattleKernelSemanticEvent[],
  lockedAction: BattleResolutionLockedActionIdentity,
): boolean {
  return events.some(({ payload }) =>
    payload.kind === "message"
    && matchesRetainedLockedActionSnapshot(payload.actionSnapshot, lockedAction)
  );
}

function appendResolutionSegment(
  resolution: BattleResolutionPresentationState,
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  fieldBoundary: BattleResolutionDisplayedField,
): BattleResolutionSegment {
  const priorSequence = resolution.segments
    .flatMap((segment) => segment.events)
    .at(-1)?.sequence ?? -1;
  const firstSequence = transition.events[0]?.sequence;
  if (firstSequence !== undefined && firstSequence <= priorSequence) {
    throw new Error(
      `battle resolution continuation event sequence ${firstSequence} is not after ${priorSequence}`,
    );
  }
  return Object.freeze({
    field: fieldBoundary,
    beforeRules: resolution.pendingBattle.rules,
    afterRules: transition.state.rules,
    events: transition.events,
    commands: projectBattleResolutionCommands(
      transition.events,
      resolution.pendingBattle.rules.rulesContext,
      transition.state.rules.rulesContext,
      fieldBoundary,
      fieldAfter(transition),
      resolution.opponentTrainer,
    ),
  });
}

/**
 * Appends the genuine forced-switch submission receipt without minting a
 * second resolution identity. Presentation may continue to hold the forced
 * selector while Slice 5's send-out renderer consumes this segment.
 */
export function appendBattleResolutionContinuation(
  input: AppendBattleResolutionContinuationInput,
): BattleResolutionPresentationState {
  const { resolution, transition, fieldBoundary } = input;
  if (resolution.forcedRequest === null) {
    throw new Error("battle resolution continuation requires a forced-switch request");
  }
  if (
    resolution.pendingBoundary.kind !== "decision-required"
    || resolution.pendingBoundary.request.requestId
      !== resolution.forcedRequest.requestId
  ) {
    throw new Error("battle resolution continuation does not match its pending boundary");
  }
  const segment = appendResolutionSegment(resolution, transition, fieldBoundary);
  return Object.freeze({
    ...resolution,
    segments: Object.freeze([...resolution.segments, segment]),
    segmentIndex: resolution.segments.length,
    commandIndex: 0,
    lifecycle: Object.freeze({
      phase: "presenting-switch-in" as const,
      phaseElapsed: 0,
    }),
    field: fieldBoundary,
    pendingBoundary: transition.state.boundary,
    pendingBattle: transition.state,
    forcedRequest: null,
  });
}

/**
 * Groups the automatic follow-up after a multi-turn player action without
 * pretending its two reducer passes were one event list. After the charge
 * turn, HandleTurnActionSelectionState has auto-confirmed the player's locked
 * action and published only the real trainer command. The round controller
 * drives that command, then appends its untouched receipt as a new segment.
 */
export function appendBattleResolutionActionContinuation(
  input: AppendBattleResolutionActionContinuationInput,
): BattleResolutionPresentationState {
  const { resolution, transition, fieldBoundary } = input;
  if (resolution.forcedRequest !== null) {
    throw new Error("automatic action continuation cannot replace a forced-switch receipt");
  }
  if (
    resolution.pendingBoundary.kind !== "decision-required"
    || resolution.pendingBoundary.request.kind !== "command"
    || resolution.pendingBoundary.request.side !== "trainer"
  ) {
    throw new Error("automatic action continuation requires a genuine trainer command boundary");
  }
  const segment = appendResolutionSegment(resolution, transition, fieldBoundary);
  return Object.freeze({
    ...resolution,
    segments: Object.freeze([...resolution.segments, segment]),
    segmentIndex: resolution.segments.length,
    commandIndex: 0,
    lifecycle: Object.freeze({
      phase: "presenting" as const,
      phaseElapsed: 0,
    }),
    field: fieldBoundary,
    pendingBoundary: transition.state.boundary,
    pendingBattle: transition.state,
    forcedRequest:
      transition.state.boundary.kind === "decision-required"
      && transition.state.boundary.request.kind === "forced-switch"
      && transition.state.boundary.request.side === "player"
        ? transition.state.boundary.request
        : null,
  });
}

/**
 * Reclaims a resolution owner after the opposing battler's locked action has
 * survived a genuine command request. The command request remains a distinct
 * kernel/UI identity; only the immutable charge and strike presentation
 * segments share an owner.
 */
export function appendBattleResolutionLockedActionContinuation(
  input: AppendBattleResolutionLockedActionContinuationInput,
): BattleResolutionPresentationState {
  const { resolution, transition, fieldBoundary, lockedAction } = input;
  const pending = resolution.pendingBoundary;
  if (
    resolution.forcedRequest !== null
    || pending.kind !== "decision-required"
    || pending.request.kind !== "command"
  ) {
    throw new Error("locked action continuation requires a genuine command boundary");
  }
  const pendingBattler = pending.request.battler;
  if (pendingBattler === lockedAction.battler) {
    throw new Error("locked action continuation must cross the opposing battler's command");
  }
  if (!hasRetainedLockedActionReceipt(transition.events, lockedAction)) {
    throw new Error(
      "locked action continuation receipt has no immutable matching action snapshot",
    );
  }
  const segment = appendResolutionSegment(resolution, transition, fieldBoundary);
  return Object.freeze({
    ...resolution,
    segments: Object.freeze([...resolution.segments, segment]),
    segmentIndex: resolution.segments.length,
    commandIndex: 0,
    lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
    field: fieldBoundary,
    pendingBoundary: transition.state.boundary,
    pendingBattle: transition.state,
    forcedRequest:
      transition.state.boundary.kind === "decision-required"
      && transition.state.boundary.request.kind === "forced-switch"
      && transition.state.boundary.request.side === "player"
        ? transition.state.boundary.request
        : null,
  });
}
