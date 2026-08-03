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
  resolveMoveName,
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

/**
 * `holdFrames` is the source's own post-print `waitmessage B_WAIT_TIME_LONG`
 * (64, `reference/pokeemerald/include/constants/battle.h:324`), present after
 * every stat-change message's `printfromtable` (`BattleScript_StatUp`/
 * `BattleScript_StatDown`, `reference/pokeemerald/data/battle_scripts_1.s:
 * 513,559`; `BattleScript_AllStatsUp*`'s five identically-shaped per-stat
 * blocks, `:3464,3469,3474,3479,3483`) but not modeled for every message kind
 * here -- see `STAT_CHANGE_MESSAGE_IDS` at the call site.
 */
export type BattleMessageTiming = Readonly<{ minimumFrames: 24; holdFrames: 0 | 64 }>;
export type BattleMoveAnimationTiming = Readonly<{ minimumFrames: number }>;
export type BattleHitAnimationTiming = Readonly<{
  minimumFrames: 35;
  firstDisplayedAge: 1;
}>;
export type BattleHpTiming = Readonly<{ minimumFrames: 28 }>;
/**
 * The RAM stat write is silent for exactly 2 frames before the message box
 * clears (`docs/issue69-omniboost-off-ground-truth.md` §2: every one of the
 * 5 measured banners shows the same write-frame-to-box-clear-frame gap --
 * 283->285, 375->377, 468->470, 559->561, 652->654). The visible post-print
 * hold is a `message` property in source (`waitmessage` follows
 * `printfromtable`, not `statbuffchange`), not a `stat` one -- see
 * `BattleMessageTiming`.
 */
export type BattleStatTiming = Readonly<{ minimumFrames: 2 }>;
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

const MESSAGE_TIMING = Object.freeze({ minimumFrames: 24, holdFrames: 0 } as const);
/**
 * Every stat-change message id source prints via `printfromtable
 * gStatUpStringIds`/`gStatDownStringIds` immediately followed by
 * `waitmessage B_WAIT_TIME_LONG` -- `BattleScript_StatUp`/`StatDown`
 * (`reference/pokeemerald/data/battle_scripts_1.s:511-514,556-560`) for the
 * single-stat case, `BattleScript_AllStatsUp*`'s five identical per-stat
 * blocks (`:3458-3483`) for the omniboost case. `gStatUpStringIds`/
 * `gStatDownStringIds` (`reference/pokeemerald/src/battle_message.c:
 * 1006-1022`) resolve to exactly these six STRINGIDs, so this set is
 * exhaustive for that script shape, not a partial sample.
 */
const STAT_CHANGE_MESSAGE_IDS: ReadonlySet<string> = new Set([
  "STRINGID_ATTACKERSSTATROSE",
  "STRINGID_DEFENDERSSTATROSE",
  "STRINGID_STATSWONTINCREASE",
  "STRINGID_ATTACKERSSTATFELL",
  "STRINGID_DEFENDERSSTATFELL",
  "STRINGID_STATSWONTDECREASE",
]);
const STAT_CHANGE_MESSAGE_TIMING = Object.freeze({
  minimumFrames: 24,
  holdFrames: 64,
} as const);
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
const STAT_TIMING = Object.freeze({ minimumFrames: 2 } as const);
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

/**
 * `{B_BUFF1}`'s real source for every stat-change message, oracle-confirmed
 * (`tools/battle-lab/swords-dance-cap-wontincrease-off.json`): `ChangeStatBuffs`'s
 * `PREPARE_STAT_BUFFER(gBattleTextBuff1, statId)` (battle_script_commands.c:6958)
 * copies `gStatNamesTable` (battle_message.c:425-443) -- "ATTACK"/"DEFENSE"/
 * "SPEED"/"SP. ATK"/"SP. DEF" capitalized, "accuracy"/"evasiveness" lowercase --
 * not `lastStatChange.stat`'s own internal lowercase-always enum string.
 */
const STAT_DISPLAY_NAME: Readonly<Record<string, string>> = Object.freeze({
  "attack": "ATTACK",
  "defense": "DEFENSE",
  "speed": "SPEED",
  "special-attack": "SP. ATK",
  "special-defense": "SP. DEF",
  "accuracy": "accuracy",
  "evasion": "evasiveness",
});

/**
 * The move's own target battler, for the several presentation ids
 * (ISSUES #70 batch 1) whose source template's only nickname placeholder is
 * {B_DEF_NAME_WITH_PREFIX} -- Cmd_resultmessage/Cmd_healthbarupdate print
 * these while rulesContext.selectorRoles.target (== the opposite singles
 * battler of the attacker) is still the current action's target, the same
 * relationship STRINGID_ITDOESNTAFFECT/STRINGID_PKMNSUBJECTEDTOTORMENT above
 * already rely on.
 */
function requireMoveDefender(lastMoveAttacker: 0 | 1 | null, context: string): 0 | 1 {
  if (lastMoveAttacker === null) {
    throw new Error(`battle resolution ${context} has no preceding used-move event`);
  }
  return lastMoveAttacker === 0 ? 1 : 0;
}

function requireMoveAttacker(lastMoveAttacker: 0 | 1 | null, context: string): 0 | 1 {
  if (lastMoveAttacker === null) {
    throw new Error(`battle resolution ${context} has no preceding used-move event`);
  }
  return lastMoveAttacker;
}

function nameWithPrefixResolver(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
): () => string {
  const displayed = fieldBattler(field, battler);
  return () => resolveBattleNameWithPrefix({
    side: battler === 0 ? "player" : "opponent",
    isTrainerBattle: true,
    nickname: displayed.name,
  });
}

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
      && (
        candidate.payload.animationId === "MOVE_ANIMATION"
        || candidate.payload.animationId === "SCENE_OFF_ATTACK_PAUSE"
      )
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
  if (messageId === "STRINGID_PKMNSUBJECTEDTOTORMENT") {
    if (lastMoveAttacker === null) {
      throw new Error(
        "battle resolution subjected-to-torment message has no preceding used-move event",
      );
    }
    const target = lastMoveAttacker === 0 ? 1 : 0;
    const displayed = fieldBattler(field, target);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: target === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  // ISSUES #70 batch 1 (docs/issue70-stringid-reachability.md, ranked rows
  // 1-8): the STRINGIDs below hit battleStringResolver's completeness guard
  // whenever a currently-wired opcode reached them, because the generic
  // fallback (below) never supplied their placeholders.
  if (messageId === "STRINGID_PKMNENERGYDRAINED") {
    // gAbsorbDrainStringIds[0] (battle_message.c:441-444), Cmd_printfromtable
    // -- Absorb/Mega Drain/Giga Drain landing on a non-Liquid-Ooze target.
    const defender = requireMoveDefender(lastMoveAttacker, "energy-drained message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNPROTECTEDITSELF") {
    // MISS_STRING_ID_BY_TYPE[B_MSG_PROTECTED], Cmd_resultmessage -- any
    // attack a Protect/Detect use blocks.
    const defender = requireMoveDefender(lastMoveAttacker, "protected-itself message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNAVOIDEDATTACK") {
    // MISS_STRING_ID_BY_TYPE[B_MSG_AVOIDED_ATK], Cmd_resultmessage --
    // Wonder-Guard-style double-avoid tail (battleScriptHitChainOpcode.ts:1224).
    const defender = requireMoveDefender(lastMoveAttacker, "avoided-attack message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (
    messageId === "STRINGID_AVOIDEDDAMAGE"
    || messageId === "STRINGID_PKMNMAKESGROUNDMISS"
  ) {
    // MISS_STRING_ID_BY_TYPE[B_MSG_AVOIDED_DMG]/[B_MSG_GROUND_MISS],
    // Cmd_resultmessage -- Wonder Guard / Levitate, the same defending
    // battler checkWonderGuardAndLevitate/typecalc/typecalc2 tested
    // (battleScriptHitChainOpcode.ts:958-959,986-989,1617-1622,1672-1677,
    // 1778-1783,1818-1823). {B_DEF_ABILITY} is prepareMessage's own
    // substitution (factoryBattleScriptFullTurnDecision.ts), sourced from
    // that same target's rulesContext.battlers[target].ability.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (
    messageId === "STRINGID_PKMNPOISONEDBY"
    || messageId === "STRINGID_PKMNBURNEDBY"
    || messageId === "STRINGID_PKMNWASPARALYZEDBY"
    || messageId === "STRINGID_PKMNFROZENBY"
    || messageId === "STRINGID_PKMNMADESLEEP"
  ) {
    // gGotPoisonedStringIds[1]/gGotBurnedStringIds[1]/gGotParalyzedStringIds[1]
    // (battle_message.c:387-390) -- Poison Point/Flame Body/Static/Effect
    // Spore's on-contact status block (battleScriptMoveEndOpcode.ts:447-608).
    // B_SCR_ACTIVE_* is the ability holder (applySetMoveEffect's
    // scriptingBattler, battleScriptHitChainOpcode.ts:2841-2848); B_EFF_* is
    // the attacker who got statused, already tracked generically via
    // pendingStatusMessageBattler below. ISSUES #70 batch 2 (docs/issue70-
    // stringid-reachability.md rows 4/23): gGotFrozenStringIds[1]/
    // gFellAsleepStringIds[1] share this exact template shape and the same
    // generic applySetMoveEffect(abilityEffectHitmarkerSet) dispatch tail
    // (battleScriptHitChainOpcode.ts:3410-3413) -- wired and real, but no
    // rental ability drives MOVE_EFFECT_FREEZE/SLEEP through it in vanilla
    // Gen3 (zero-incidence per the doc's own sum-check).
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    if (pendingStatusMessageBattler === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding status event`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const effectDisplayed = fieldBattler(field, pendingStatusMessageBattler);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_EFF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: pendingStatusMessageBattler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: effectDisplayed.name,
      }),
    });
  }
  if (messageId === "STRINGID_PKMNSITEMCUREDPROBLEM") {
    // gBerryEffectStringIds[0] (battle_message.c:437-441),
    // BattleScript_BerryCureChosenStatusRet (Lum Berry/Mental Herb -- the
    // "any status" cure items; per-status berries print their own distinct
    // fixed-text STRINGIDs and never reach this template). {B_BUFF1} is
    // prepareMessage's substitution of rulesContext.battleTextBuff1Status,
    // captured pre-clear at both live call sites (battleScriptMoveEndOpcode.ts:
    // 793,811; battleEndTurnOrchestration.ts's HOLD_EFFECT_CURE_STATUS/
    // CURE_ATTRACT branches).
    if (pendingHeldItemEffectBattler === null) {
      throw new Error("battle resolution item-cured-problem message has no preceding held-item effect");
    }
    if (event.payload.substitutions.length === 0) {
      throw new Error("battle resolution item-cured-problem message has no status substitution");
    }
    const statusName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, pendingHeldItemEffectBattler),
      B_LAST_ITEM: () => factoryItemDisplayName(heldItems[pendingHeldItemEffectBattler]),
      B_BUFF1: () => statusName,
    });
  }
  if (messageId === "STRINGID_PKMNENDUREDHIT") {
    // classifyResultMessage's MOVE_RESULT_FOE_ENDURED case
    // (battleScriptHitChainOpcode.ts:2611-2612) -- an Endure carrier takes a
    // hit that would otherwise KO it.
    const defender = requireMoveDefender(lastMoveAttacker, "endured-hit message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_SUBSTITUTEDAMAGED") {
    // Cmd_healthbarupdate direct literal (battleScriptHitChainOpcode.ts:2354)
    // -- any damaging hit landing on a battler with an active Substitute.
    const defender = requireMoveDefender(lastMoveAttacker, "substitute-damaged message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (
    messageId === "STRINGID_PKMNRAISEDDEF"
    || messageId === "STRINGID_PKMNRAISEDSPDEF"
    || messageId === "STRINGID_PKMNCOVEREDBYVEIL"
    || messageId === "STRINGID_PKMNRAISEDDEFALITTLE"
    || messageId === "STRINGID_PKMNRAISEDSPDEFALITTLE"
  ) {
    // createSetSideStatusHandler's REFLECT_CONFIG/LIGHTSCREEN_CONFIG/
    // SAFEGUARD_CONFIG success choosers (battleScriptSetSideStatusOpcode.ts).
    // {B_ATK_PREFIX2} is the literal "Ally"/"Foe" side label (battle_message.c:
    // 2637-2641, sText_AllyPkmnPrefix2/sText_FoePkmnPrefix3), not a nicknamed
    // battler -- the attacking side that cast Reflect/Light Screen/Safeguard.
    // {B_CURRENT_MOVE} is gMoveNames[gBattleMsgDataPtr->currentMove]
    // (battle_message.c:2453-2456), the frozen action snapshot's own move.
    // ISSUES #70 batch 2 (docs/issue70-stringid-reachability.md rows 35/37):
    // gReflectLightScreenSafeguardStringIds[2]/[4] (the doubles-only "a
    // little" choosers) share this exact template shape; structurally
    // unreachable in this engine's singles-only scope
    // (battleScriptSetSideStatusOpcode.ts:14-19's own header comment).
    if (lastMoveAttacker === null || actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding used-move action snapshot`);
    }
    const prefix2 = lastMoveAttacker === 0 ? "Ally" : "Foe";
    return resolveBattleStringLines(messageId, {
      B_ATK_PREFIX2: () => prefix2,
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNSHROUDEDINMIST") {
    // MIST_CONFIG's own successChooser (B_MSG_SET_MIST), the same
    // createSetSideStatusHandler family as Reflect/Light Screen/Safeguard
    // above, but gText_PkmnShroudedInMist (battle_message.c:151) has no
    // {B_CURRENT_MOVE} placeholder -- Mist's own name is implied.
    if (lastMoveAttacker === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding used-move event`);
    }
    const prefix2 = lastMoveAttacker === 0 ? "Ally" : "Foe";
    return resolveBattleStringLines(messageId, {
      B_ATK_PREFIX2: () => prefix2,
    });
  }
  if (messageId === "STRINGID_PKMNCHOSEXASDESTINY") {
    // gFutureMoveUsedStringIds[1], battleScriptTrysetfutureattackOpcode.ts:
    // 129-165 -- multistringChooser=1 iff currentMove === MOVE_DOOM_DESIRE,
    // never a legal Factory L50 rental move (Jirachi-exclusive).
    if (lastMoveAttacker === null || actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding used-move action snapshot`);
    }
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, lastMoveAttacker),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (
    messageId === "STRINGID_PKMNSQUEEZEDBYBIND"
    || messageId === "STRINGID_PKMNWRAPPEDBY"
    || messageId === "STRINGID_PKMNTRAPPEDINVORTEX"
    || messageId === "STRINGID_PKMNCLAMPED"
    || messageId === "STRINGID_PKMNTRAPPEDBYSANDTOMB"
  ) {
    // gWrappedStringIds, applyWrapMoveEffect (battleScriptHitChainOpcode.ts:
    // 3692-3727) -- indexed by the move's own position in TRAPPING_MOVES
    // (Bind/Wrap/Fire Spin/Clamp/Whirlpool/Sand Tomb; Fire Spin and
    // Whirlpool share idx2's text, matching vanilla gWrappedStringIds).
    const attacker = requireMoveAttacker(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNHURTBY") {
    // BattleScript_WrapTurnDmg (reference/pokeemerald/data/battle_scripts_1.s:
    // 3829-3833), fired from ENDTURN_WRAP (battle_util.c:1592-1621,
    // runWrapTick/WRAP_TURN_DMG_LABEL, battleEndTurnOrchestration.ts) -- the
    // trap's own recurring damage tick, reachable the same turn a wrap-family
    // move (Bind/Wrap/Fire Spin/Clamp/Whirlpool/Sand Tomb) first lands.
    // BS_ATTACKER is reassigned to the trapped battler itself for this tick
    // (battle_util.c:1471, enterTickBattlerContext), not the last move's real
    // attacker, so this reads the print-time action snapshot rather than
    // lastMoveAttacker. {B_BUFF1} is the trapping move's own name --
    // prepareMessage's own battlers[...].wrappedMove substitution
    // (factoryBattleScriptFullTurnDecision.ts).
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot/substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId.toLowerCase()} action snapshot`);
    const trappingMoveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_BUFF1: () => trappingMoveName,
    });
  }
  if (
    messageId === "STRINGID_PKMNEVADEDATTACK"
    || messageId === "STRINGID_PKMNSEEDED"
  ) {
    // gLeechSeedStringIds[1]/[0], Cmd_setseeded
    // (battleScriptIngrainLeechSeedWrapOpcode.ts:87-120) -- Leech Seed
    // missing (already-seeded/accuracy-missed) or landing.
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (
    messageId === "STRINGID_PKMNOBTAINEDX"
    || messageId === "STRINGID_PKMNOBTAINEDX2"
    || messageId === "STRINGID_PKMNOBTAINEDXYOBTAINEDZ"
  ) {
    // gItemSwapStringIds, Cmd_tryswapitems (battleScriptTryswapitemsOpcode.ts:
    // 119-215, Trick) -- {B_BUFF1}/{B_BUFF2} are prepareMessage's own
    // battleTextBuff1Item/battleTextBuff2Item substitutions (already wired).
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no item substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const buff1 = event.payload.substitutions[0]!;
    const buff2 = messageId === "STRINGID_PKMNOBTAINEDXYOBTAINEDZ"
      ? event.payload.substitutions[1]!
      : event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => buff1,
      B_BUFF2: () => buff2,
    });
  }
  if (messageId === "STRINGID_PKMNUNAFFECTED") {
    // gKOFailedStringIds[1], Cmd_tryKO (battleScriptTryKOOpcode.ts:170-175) --
    // B_MSG_KO_UNAFFECTED iff targetLevel > attackerLevel, never true in this
    // engine's mirror-level L50 singles scope.
    const defender = requireMoveDefender(lastMoveAttacker, "unaffected message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (
    messageId === "STRINGID_PKMNRAISEDFIREPOWERWITH"
    || messageId === "STRINGID_PKMNSXMADEYINEFFECTIVE"
  ) {
    // gFlashFireStringIds, advancePastAccuracyCheck
    // (battleScriptHitChainOpcode.ts:908-925) -- first activation vs an
    // already-boosted re-activation. {B_DEF_ABILITY} is prepareMessage's own
    // substitution, sourced from that same target's rulesContext.battlers[
    // target].ability (same shape as AVOIDEDDAMAGE/PKMNMAKESGROUNDMISS above).
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const ability = event.payload.substitutions[0]!;
    const resolvers: Record<string, () => string> = {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    };
    if (messageId === "STRINGID_PKMNSXMADEYINEFFECTIVE") {
      if (actionSnapshot === null) {
        throw new Error(`battle resolution ${messageId} message has no preceding used-move action snapshot`);
      }
      resolvers.B_CURRENT_MOVE = () => resolveMoveName(actionSnapshot.currentMove);
    }
    return resolveBattleStringLines(messageId, resolvers);
  }
  if (messageId === "STRINGID_HITXTIMES") {
    // BattleScript_MultiHitPrintStrings's printstring, real script data
    // right after `copyarray gBattleTextBuff1, sMULTIHIT_STRING, 6`
    // (battleScriptIngrainLeechSeedWrapOpcode.ts:308-323). {B_BUFF1} is
    // prepareMessage's substitution of rulesContext.multiHitStringCounter,
    // the multi-hit family's own hits-landed counter.
    if (event.payload.substitutions.length === 0) {
      throw new Error("battle resolution hit-x-times message has no hit-count substitution");
    }
    const hitCount = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_BUFF1: () => hitCount,
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
    // ChangeStatBuffs's {B_BUFF2} "sharply"/"harshly" selection reads the
    // pre-clamp requested magnitude, not the post-clamp from/to delta
    // (battle_script_commands.c:7038,7061; docs/issue66b-preclamp-magnitude-verdict.md).
    const magnitude = lastStatChange.requestedMagnitude;
    const rose = messageId === "STRINGID_DEFENDERSSTATROSE";
    // {B_BUFF1} is ChangeStatBuffs's own PREPARE_STAT_BUFFER(gBattleTextBuff1,
    // statId) (battle_script_commands.c:6958), which copies gStatNamesTable
    // ("ATTACK" etc, not lastStatChange.stat's lowercase-always enum string) --
    // oracle-confirmed pixel mismatch, docs/issue66b-stat-name-capitalization-verdict.md.
    const statName = STAT_DISPLAY_NAME[lastStatChange.stat];
    if (statName === undefined) {
      throw new Error(`battle resolution stat-change message has unknown stat ${lastStatChange.stat}`);
    }
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: battler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
      B_BUFF1: () => statName,
      B_BUFF2: () =>
        rose
          ? magnitude === 2 ? "sharply rose!" : "rose!"
          : magnitude === 2 ? "harshly fell!" : "fell!",
    });
  }
  if (
    messageId === "STRINGID_ATTACKERSSTATROSE"
    || messageId === "STRINGID_ATTACKERSSTATFELL"
  ) {
    if (!lastStatChange) {
      throw new Error(
        "battle resolution stat-change message has no preceding stat event",
      );
    }
    const battler = singlesBattler(lastStatChange.battler, "stat-fell message");
    const displayed = fieldBattler(field, battler);
    const magnitude = lastStatChange.requestedMagnitude;
    const rose = messageId === "STRINGID_ATTACKERSSTATROSE";
    const statName = STAT_DISPLAY_NAME[lastStatChange.stat];
    if (statName === undefined) {
      throw new Error(`battle resolution stat-change message has unknown stat ${lastStatChange.stat}`);
    }
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: battler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
      B_BUFF1: () => statName,
      B_BUFF2: () =>
        rose
          ? magnitude === 2 ? "sharply rose!" : "rose!"
          : magnitude === 2 ? "harshly fell!" : "fell!",
    });
  }
  if (
    messageId === "STRINGID_STATSWONTINCREASE"
    || messageId === "STRINGID_STATSWONTDECREASE"
  ) {
    if (!lastStatChange) {
      throw new Error(
        "battle resolution stat-change message has no preceding stat event",
      );
    }
    const battler = singlesBattler(lastStatChange.battler, "stat-wont-change message");
    const displayed = fieldBattler(field, battler);
    const nameWithPrefix = () => resolveBattleNameWithPrefix({
      side: battler === 0 ? "player" : "opponent",
      isTrainerBattle: true,
      nickname: displayed.name,
    });
    const statName = STAT_DISPLAY_NAME[lastStatChange.stat];
    if (statName === undefined) {
      throw new Error(`battle resolution stat-wont-change message has unknown stat ${lastStatChange.stat}`);
    }
    if (messageId === "STRINGID_STATSWONTINCREASE") {
      return resolveBattleStringLines(messageId, {
        B_ATK_NAME_WITH_PREFIX: nameWithPrefix,
        B_BUFF1: () => statName,
      });
    }
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefix,
      B_BUFF1: () => statName,
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
        timing: STAT_CHANGE_MESSAGE_IDS.has(payload.messageId)
          ? STAT_CHANGE_MESSAGE_TIMING
          : MESSAGE_TIMING,
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
      && (
        payload.animationId === "MOVE_ANIMATION"
        || payload.animationId === "SCENE_OFF_ATTACK_PAUSE"
      )
    ) {
      const battler = singlesBattler(payload.battler ?? -1, "attack pause");
      const hit = nextHitAnimation(events, index);
      if (usedMoveInstructionExecution === null || hit === null) {
        // An attack receipt without a hit receipt has no target hit/drain
        // choreography. Existing typed effect/status commands own its
        // controller-specific presentation.
        continue;
      }
      const hitExecution = instructionExecutionOf(hit);
      // The interpreter provenance counts Cmd_pause's initial execution plus
      // each of B_WAIT_TIME_SHORT's blocked retries. The visual command owns
      // that source pause below, so exclude those callback executions before
      // applying the same attack-string-to-hit formula used by the controller
      // MOVE_ANIMATION receipt.
      const executedPauseCallbacks =
        payload.animationId === "SCENE_OFF_ATTACK_PAUSE"
          ? SCENE_OFF_MOVE_PAUSE_FRAMES + 1
          : 0;
      const interveningInstructions =
        hitExecution - usedMoveInstructionExecution - executedPauseCallbacks;
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
