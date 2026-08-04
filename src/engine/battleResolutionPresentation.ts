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
  BattleOutcome,
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
import {
  BATTLE_INTRO_STRINGS,
  type BattleIntroStringEntry,
} from "../data/battleIntroStrings.ts";

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
export type BattleTrainerSlideTiming = Readonly<{ minimumFrames: 38 }>;

export type BattleResolutionPresentationCommand =
  | Readonly<{
      type: "message";
      eventSequence: number;
      lines: readonly string[];
      advance: "automatic" | "button";
      /**
       * True only for the two quote-placeholder ids
       * (`TERMINAL_SEAM_QUOTE_MESSAGE_IDS`) whose real printer path never
       * spawns the wait-cursor task, per that const's own citation.
       */
      noCursor: boolean;
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
      /**
       * True only when this transition is the real `CONTROLLER_RETURNMONTOBALL`
       * receipt (`Cmd_various`'s `VARIOUS_RETURN_OPPONENT_MON1`/`MON2`,
       * `BtlController_EmitReturnMonToBall` -- `battle_controller_opponent.c`'s
       * `OpponentHandleReturnMonToBall`/`FreeMonSpriteAfterSwitchOutAnim` both
       * call `SetHealthboxSpriteInvisible` alongside destroying the sprite),
       * distinguished from the unrelated `CONTROLLER_SPRITEINVISIBILITY`
       * receipt (`Cmd_moveend`'s semi-invulnerable Dig/Fly toggle,
       * `Cmd_makevisible` -- `OpponentHandleSpriteInvisibility` only ever
       * touches the sprite's own `invisible` flag) via the emitting
       * instruction's own opcode, not any window-specific context.
       */
      recall: boolean;
      timing: BattleSpriteVisibilityTiming;
    }>
  | Readonly<{
      type: "turn-end";
      timing: BattleTurnEndTiming;
    }>
  | Readonly<{
      /** `Cmd_trainerslidein`/`Cmd_trainerslideout` -- generic across any trainer/outcome, see `TRAINER_SLIDE_TIMING`. */
      type: "trainer-slide";
      eventSequence: number;
      battler: 0 | 1;
      direction: "in" | "out";
      timing: BattleTrainerSlideTiming;
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

/**
 * Frozen per-round trainer identity `messageLines` needs for the terminal
 * win-text seam (`STRINGID_PLAYERDEFEATEDTRAINER1`/`TRAINER1LOSETEXT`/
 * `TRAINER1WINTEXT`) in addition to the send-out/intro family's existing
 * `className`/`name` substitutions. `speechLose`/`speechWin` are
 * `factoryTrainerPresentationForOpponent`'s own already-formatted 2-line
 * Easy Chat tuples (`factoryTrainerPresentation.ts`). `speechWin` is optional
 * (unlike `speechLose`) so the many pre-existing WIN-side-only fixtures that
 * never reach `STRINGID_TRAINER1WINTEXT` don't need a dummy value; every real
 * production caller (`factoryTrainerPresentationForOpponent`'s return value)
 * always supplies it. LOSS-side terminal seam,
 * `docs/terminal-seam-loss-path-ground-truth.md` §5 item 3.
 *
 * `trainerPic` is the extracted Frontier trainer-picture symbol
 * (`FactoryTrainerPresentation.trainerPic`, resolvable via
 * `resolveFrontierTrainerPic`) the terminal-seam trainer-slide visual draws
 * -- optional for the same reason as `speechWin`: only real production
 * callers need it, synthetic non-terminal fixtures don't.
 */
export type BattleResolutionOpponentTrainer = Readonly<{
  className: string;
  name: string;
  speechLose: readonly [string, string];
  speechWin?: readonly [string, string];
  trainerPic?: string;
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
  opponentTrainer: BattleResolutionOpponentTrainer | null;
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
  opponentTrainer?: BattleResolutionOpponentTrainer | null;
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
 * ISSUES #73 rung B correction (2026-08-04): the prior port (53, from
 * `battleScene.ts`'s `TURN17_TRAINER_SLIDE_SETTLE_DELAY` doc comment) had two
 * independent errors -- (1) it was never fit-verified against pixels, and
 * (2) even its own arithmetic was wrong: source `OpponentHandleTrainerSlide`
 * (`reference/pokeemerald/src/battle_controller_opponent.c:1385-1390`)
 * creates the trainer sprite at `x2=96` with `sSpeedX=-2`, and the shared
 * `SpriteCB_TrainerSlideIn` (`battle_gfx_sfx_util.c:396-409`) adds `sSpeedX`
 * per callback until `x2==0` -- that is 96/2=48 callbacks, not 53.
 *
 * Fresh oracle pixel evidence settles the question directly (not just the
 * source math): `docs/terminal-seam-loss-path-ground-truth.md`'s committed
 * twice-identical fixture (`tools/battle-lab/loss-terminal-explosion-
 * dusclops-off.json`) has the opponent-controller command dispatch the slide
 * at tick 2996 (`opponentControllerCommand` 6->8) and the trainer sprite's
 * on-screen bounding box stop moving at tick 3034 -- **38 ticks**, re-derived
 * this session via a dense per-tick re-probe (frame 2994-3059) of that same
 * fixture. The observed leading edge fits `offscreenX2 = 2*(38-age)` exactly
 * at every sampled tick from first visibility (age 13, x=239) through settle
 * (age 38, x=189) -- not merely close, bit-exact against 8 independent
 * sample points. The remaining ~10-tick gap between dispatch and the sprite's
 * first visible pixel (age 0-12) is invisible either way (still fully
 * off-screen under this formula), so it does not distinguish a literal `x2`
 * register replay from this observable-motion model; the model is pinned to
 * what pixels can actually prove.
 */
export const TRAINER_SLIDE_TIMING = Object.freeze({ minimumFrames: 38 } as const);
/**
 * The three terminal win/loss-text STRINGIDs are printed by
 * `BattleScript_FrontierTrainerBattleWon(_LoseTexts)`/
 * `BattleScript_LocalBattleLost(PrintTrainersWinText)`, each followed by a
 * real `PAUSE_UNTIL_PRESS`-gated wait for input (oracle-confirmed dismiss:
 * `docs/terminal-seam-loss-path-ground-truth.md` §2 frame ~3230, the same
 * "A" dismiss shape already modeled for `STRINGID_TARGETFAINTED`/
 * `STRINGID_ATTACKERFAINTED`).
 */
const TERMINAL_SEAM_BUTTON_MESSAGE_IDS: ReadonlySet<string> = new Set([
  "STRINGID_PLAYERDEFEATEDTRAINER1",
  "STRINGID_TRAINER1LOSETEXT",
  "STRINGID_TRAINER1WINTEXT",
]);
/**
 * Only 2 of the 3 button ids above are wait-cursor-less -- this is NOT
 * uniform across `TERMINAL_SEAM_BUTTON_MESSAGE_IDS` (source-read for
 * ISSUES #73's LOSS-window cursor-gating step):
 *
 * `STRINGID_TRAINER1WINTEXT`/`STRINGID_TRAINER1LOSETEXT`'s own static
 * templates are bare placeholders with no literal pause code at all
 * (`reference/pokeemerald/src/battle_message.c:1424`
 * `sText_Trainer1WinText[] = _("{B_TRAINER1_WIN_TEXT}")`; `:55`
 * `sText_Trainer1LoseText[] = _("{B_TRAINER1_LOSE_TEXT}")`). Their wait
 * comes entirely from `BufferStringBattle`'s placeholder substitution
 * (`battle_message.c:2600-2748`): for exactly the 4
 * `B_TXT_TRAINER{1,2}_{WIN,LOSE}_TEXT` cases (`:2741-2748`), after copying
 * the resolved Easy Chat text it appends `EXT_CTRL_CODE_BEGIN` +
 * `EXT_CTRL_CODE_PAUSE_UNTIL_PRESS` -- an *extended* control code that
 * `text.c`'s render loop (`:1018-1022`) resolves to `RENDER_STATE_WAIT`,
 * serviced every tick by `TextPrinterWait` (`text.c:884-900`): waits for
 * `JOY_NEW(A_BUTTON|B_BUTTON)` and nothing else -- it never calls
 * `TextPrinterDrawDownArrow`.
 *
 * `STRINGID_PLAYERDEFEATEDTRAINER1` is different: its static template
 * (`battle_message.c:371` `sText_PlayerDefeatedLinkTrainerTrainer1[] =
 * _("Player defeated\n{B_TRAINER1_CLASS} {B_TRAINER1_NAME}!\p")`) ends in a
 * literal `\p` (`CHAR_PROMPT_CLEAR`, byte 0xFB per `charmap.txt:1088`,
 * *not* an extended code). `text.c`'s render loop resolves that byte
 * directly to `RENDER_STATE_CLEAR` (`:1102-1105`), serviced by
 * `TextPrinterWaitWithDownArrow` (`text.c:865-882`), which *does* call
 * `TextPrinterDrawDownArrow` every tick while waiting -- the exact
 * `sDownArrowYCoords`/8-tick-delay shape `CURSOR_Y_OFFSETS` in
 * `battleScene.ts` already ports. So the down-arrow/wait-cursor task is
 * genuinely spawned for this id; gating it off would be a regression, not a
 * fix. (This id is LOSS-window-inapplicable -- `BattleScript_LocalBattleLost`
 * never prints it, only `BattleScript_FrontierTrainerBattleWon` does -- so
 * it does not appear in this window's own compare, but the set membership
 * must still stay correct for the future WIN-side wiring, ISSUES #73.)
 *
 * `STRINGID_TRAINER2WINTEXT`/`STRINGID_TRAINER2LOSETEXT` share the identical
 * bare-placeholder-plus-`EXT_CTRL_CODE_PAUSE_UNTIL_PRESS` shape (same
 * `BufferStringBattle` cases) but aren't modeled at all yet (no two-opponent
 * Factory battle support) -- not added here since there is no command site
 * to gate.
 */
const TERMINAL_SEAM_QUOTE_MESSAGE_IDS: ReadonlySet<string> = new Set([
  "STRINGID_TRAINER1LOSETEXT",
  "STRINGID_TRAINER1WINTEXT",
]);

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

/**
 * `resolveBattleStringLines`-style segment splice for `battleIntroStrings.ts`'s
 * hand-mapped ids 0/1/2/5 (ISSUES #70's `STRINGID_INTROSENDOUT` extractor-gap
 * fix) -- those ids sit below the extracted table's own scoped range, so they
 * are never in `resolveBattleStringLines`'s `BY_SYMBOL` map. `battleIntroStrings.ts`'s
 * own segment shape is a strict subset of the extracted table's (text/
 * placeholder/linebreak only, no `{CONTROL ...}` segments), so this mirrors
 * `resolveBattleStringLines`'s walk exactly for that subset.
 */
function resolveIntroStringEntry(
  entry: BattleIntroStringEntry,
  resolvers: Record<string, () => string>,
): readonly string[] {
  const lines: string[] = [];
  let current = "";
  for (const segment of entry.segments) {
    if (segment.type === "text") {
      current += segment.value;
    } else if (segment.type === "placeholder") {
      const resolve = resolvers[segment.token];
      if (!resolve) {
        throw new Error(
          `battle resolution ${entry.symbol} references placeholder {${segment.token}} with no resolver supplied`,
        );
      }
      current += resolve();
    } else {
      lines.push(current);
      current = "";
    }
  }
  if (current !== "") lines.push(current);
  return Object.freeze(lines);
}

function findIntroStringEntry(
  id: BattleIntroStringEntry["id"],
  cSymbol: string,
): BattleIntroStringEntry {
  const entry = BATTLE_INTRO_STRINGS.find((e) => e.id === id && e.source.cSymbol === cSymbol);
  if (!entry) throw new Error(`battle resolution: no battleIntroStrings entry for id ${id} / ${cSymbol}`);
  return entry;
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
  opponentTrainer: BattleResolutionOpponentTrainer | null,
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
  if (messageId === "STRINGID_PKMNFELLFORTAUNT") {
    // BattleScript_EffectTaunt (reference/pokeemerald/data/battle_scripts_1.s:
    // 2308-2318): Cmd_settaunt operates on gBattlerTarget directly (no
    // gBattlerTarget reassignment precedes it, unlike Helping Hand), so
    // {B_DEF_NAME_WITH_PREFIX} is the taunted battler -- the move's own
    // (opposite-of-attacker) target, same relationship as
    // STRINGID_PKMNSUBJECTEDTOTORMENT/STRINGID_PKMNAVOIDEDATTACK above.
    const defender = requireMoveDefender(lastMoveAttacker, "fell-for-taunt message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNCANTUSEMOVETAUNT") {
    // BattleScript_MoveUsedIsTaunted (battle_scripts_1.s:3580-3583), reached
    // from advanceBattleScriptAttackCancelerTaunted's CANCELER_TAUNTED phase
    // (battleScriptActionAdmission.ts) *instead of* STRINGID_USEDMOVE for a
    // taunted battler's own blocked status-move action -- lastMoveAttacker
    // (tied to the last completed used-move message) is the wrong battler
    // here, sourced from the frozen action snapshot's own attacker/currentMove
    // like STRINGID_PKMNRAISEDDEF's {B_CURRENT_MOVE} above. {B_ACTIVE_NAME_
    // WITH_PREFIX} reads gActiveBattler == gBattlerAttacker at this print
    // (battle_message.c:2447), the taunted battler picking the blocked move.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId.toLowerCase()} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  // ISSUES #72 batch 1 (docs/issue72-reachability-triage.md, ranked rows
  // 1-13): the same Taunt-pair idiom extended to the highest-carrier-weight
  // REACHABLE printstring gaps -- the "already status" family, a few
  // standalone defender-only ids, and the ability-blocks-the-move's-own-
  // effect cluster.
  if (
    messageId === "STRINGID_PKMNALREADYASLEEP"
    || messageId === "STRINGID_PKMNALREADYCONFUSED"
    || messageId === "STRINGID_PKMNALREADYHASBURN"
    || messageId === "STRINGID_PKMNALREADYPOISONED"
    || messageId === "STRINGID_PKMNISALREADYPARALYZED"
  ) {
    // BattleScript_AlreadyAsleep/AlreadyConfused(+TeeterDance sibling)/
    // AlreadyBurned/AlreadyPoisoned/AlreadyParalyzed: each of EffectSleep/
    // EffectConfuse/EffectWillOWisp/EffectToxic/EffectParalyze's own
    // `jumpifstatus(2) BS_TARGET, STATUS1/2_X, BattleScript_AlreadyX` --
    // purely generic jumpifstatus+printstring opcodes (zero TS references to
    // any of these labels), so BS_TARGET is still the move's own target,
    // same relationship as STRINGID_PKMNFELLFORTAUNT above.
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNWASDEFROSTED") {
    // executeDefrost (battleScriptMoveEndControllers.ts:133-168): a special
    // Fire-type hit thawing its own (still-current) target.
    const defender = requireMoveDefender(lastMoveAttacker, "defrosted message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNFELLINLOVE") {
    // BattleScript_EffectAttract's own success tail, right after
    // Cmd_tryinfatuating's success branch (battleScriptTryinfatuatingOpcode.ts)
    // leaves gBattlerTarget unchanged -- the attracted battler.
    const defender = requireMoveDefender(lastMoveAttacker, "fell-in-love message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNPREVENTSSTATLOSSWITH") {
    // BattleScript_AbilityNoStatLoss (battleScriptStatBuffs.ts:265-271,
    // Clear Body/White Smoke) -- blockedMessage freezes scriptingBattler to
    // the battler about to lose the stat before the call-explicit transfer,
    // same shape as the STRINGID_PKMNPOISONEDBY family's scriptingBattler
    // read above. {B_SCR_ACTIVE_ABILITY} is engine-supplied via
    // prepareMessage (factoryBattleScriptFullTurnDecision.ts).
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
    });
  }
  if (
    messageId === "STRINGID_PKMNSXCUREDITSYPROBLEM"
    || messageId === "STRINGID_PKMNSXCUREDYPROBLEM"
  ) {
    // BattleScript_AbilityCuredStatus, MOVEEND_IMMUNITY_ABILITIES's quiet
    // scan (battleScriptMoveEndOpcode.ts:650-709) -- scriptingBattler is the
    // just-cured battler; {B_BUFF1} is the cured status's own display name
    // (battleTextBuff1Status, same source STRINGID_PKMNSITEMCUREDPROBLEM's
    // {B_BUFF1} above reads), engine-supplied alongside {B_SCR_ACTIVE_ABILITY}.
    // ISSUES #72 batch 6: STRINGID_PKMNSXCUREDYPROBLEM (Shed Skin's own
    // end-turn tick, runShedSkinTick) shares this identical template text and
    // substitution shape byte-for-byte.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability/status substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    const statusName = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_BUFF1: () => statusName,
    });
  }
  if (
    messageId === "STRINGID_PKMNPREVENTSCONFUSIONWITH"
    || messageId === "STRINGID_PKMNPREVENTSROMANCEWITH"
  ) {
    // BattleScript_OwnTempoPrevents/ObliviousPreventsAttraction -- both read
    // the ability off the move's own (still-current) target role, so
    // {B_DEF_ABILITY} is engine-supplied via prepareMessage keyed on
    // rules.selectorRoles.target, same battler requireMoveDefender resolves.
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
  // ISSUES #72 batch 2 (docs/issue72-reachability-triage.md, ranked rows
  // 14-25 starting from STRINGID_PKMNSXWOREOFF): the Taunt-pair idiom
  // continued -- EFFECT_ROAR's Ingrain/Suction Cups pair, the trainer-battle
  // force-out tail, the Intimidate switch-in loop, Damp/Volt Absorb/Water
  // Absorb/Inner Focus's ability-blocks-the-move's-own-effect shapes, Keen
  // Eye/Hyper Cutter's specific-stat-loss block, and Reflect/Light Screen/
  // Mist's end-of-turn wear-off.
  if (messageId === "STRINGID_PKMNANCHOREDITSELF") {
    // BattleScript_PrintMonIsRooted: EffectRoar's own `jumpifstatus3
    // BS_TARGET, STATUS3_ROOTED` -- a purely generic opcode (zero TS
    // references), so BS_TARGET is still the move's own target.
    const defender = requireMoveDefender(lastMoveAttacker, "anchored-itself message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNANCHORSITSELFWITH") {
    // BattleScript_AbilityPreventsPhasingOut: EffectRoar's own `jumpifability
    // BS_TARGET, ABILITY_SUCTION_CUPS` -- same purely generic shape as
    // ANCHOREDITSELF above, plus the ability substitution engine-supplied
    // via prepareMessage keyed on rules.selectorRoles.target.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "anchors-itself-with message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNWASDRAGGEDOUT") {
    // BattleScript_TrainerBattleForceOut's unconditional printstring, reached
    // from EffectRoar's forcerandomswitch success tail -- the move's own
    // (still-current) target, the battler that got switched out.
    const defender = requireMoveDefender(lastMoveAttacker, "dragged-out message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNCUTSATTACKWITH") {
    // BattleScript_IntimidateActivatesLoop: scriptingBattler is the
    // switching-in Intimidate holder (frozen before the loop starts,
    // factoryBattleStart.ts/battleScriptFaintedActionsOrchestration.ts);
    // targetBattler is the loop's own BS_TARGET, cycled per opposing battler
    // by trygetintimidatetarget -- NOT the generic requireMoveDefender
    // shape, since this isn't a move's own target relationship.
    if (
      event.payload.scriptingBattler === undefined
      || event.payload.targetBattler === undefined
      || event.payload.substitutions.length === 0
    ) {
      throw new Error(`battle resolution ${messageId} message has no scripting/target-battler or ability substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const targetBattler = singlesBattler(event.payload.targetBattler, `${messageId} target battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, targetBattler),
    });
  }
  if (messageId === "STRINGID_PREVENTEDFROMWORKING") {
    // BattleScript_IntimidatePrevented: BS_TARGET at this print is whichever
    // battler's Clear Body/Hyper Cutter/White Smoke just blocked the loop's
    // current Intimidate application; scriptingBattler is still the
    // Intimidate holder. {B_BUFF1} is fixed -- this label is only ever
    // reached from the Intimidate loop.
    if (
      event.payload.scriptingBattler === undefined
      || event.payload.targetBattler === undefined
      || event.payload.substitutions.length === 0
    ) {
      throw new Error(`battle resolution ${messageId} message has no scripting/target-battler or ability substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const targetBattler = singlesBattler(event.payload.targetBattler, `${messageId} target battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, targetBattler),
      B_DEF_ABILITY: () => ability,
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_BUFF1: () => "INTIMIDATE",
    });
  }
  if (messageId === "STRINGID_PKMNSXPREVENTSFLINCHING") {
    // BattleScript_FlinchPrevention: applyFlinchMoveEffect's own
    // effectBattler param (Fake Out's real target for the certain-flinch,
    // non-affectsUser case) is applySetMoveEffect's selectorRoles.effectBattler
    // write, same field the ability-prevention family above already reads.
    if (event.payload.effectBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no effect-battler/ability substitution`);
    }
    const effectBattler = singlesBattler(event.payload.effectBattler, `${messageId} effect battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_EFF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, effectBattler),
      B_EFF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXPREVENTSYLOSS") {
    // BattleScript_AbilityNoSpecificStatLoss: ChangeStatBuffs's blockedMessage
    // freezes scriptingBattler to the battler about to lose the stat (Keen
    // Eye/Hyper Cutter's own holder), same shape STRINGID_PKMNPREVENTSSTATLOSSWITH
    // (batch 1) already uses.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability/stat substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    const statName = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_BUFF1: () => statName,
    });
  }
  if (messageId === "STRINGID_PKMNPREVENTSUSAGE") {
    // BattleScript_DampStopsExplosion: Cmd_tryexplosion re-points
    // selectorRoles.target to the Damp holder before jumping here (the
    // common case: the move's own opposing-singles-battler, same relationship
    // requireMoveDefender resolves); {B_CURRENT_MOVE} is the actionSnapshot's
    // own currentMove, same idiom STRINGID_PKMNCANTUSEMOVETAUNT uses.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/ability substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "prevents-usage message");
    const defender = requireMoveDefender(lastMoveAttacker, "prevents-usage message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNRESTOREDHPUSING") {
    // BattleScript_MoveHPDrain: Volt Absorb/Water Absorb below-full-HP branch
    // -- selectorRoles.target unchanged from the move's own real target.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "restored-hp message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXMADEYUSELESS") {
    // BattleScript_MonMadeMoveUseless: same Volt Absorb/Water Absorb branch
    // at full HP; {B_CURRENT_MOVE} is the actionSnapshot's own currentMove.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "made-useless message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNSXWOREOFF") {
    // BattleScript_SideStatusWoreOff: runTickScript's own enterTickBattlerContext
    // sets selectorRoles.attacker to the affected side's own representative
    // battler (reflectBattlerId/lightscreenBattlerId/mistBattlerId), matching
    // real source's `gActiveBattler = gBattlerAttacker = gSideTimers[side].*BattlerId`
    // (battle_util.c:1224/1256/1276) -- {B_ATK_PREFIX1} is that battler's own
    // side ("Ally"/"Foe", battle_message.c:2649-2653), not a nickname.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/move substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_PREFIX1: () => (battler === 0 ? "Ally" : "Foe"),
      B_BUFF1: () => moveName,
    });
  }
  // ISSUES #72 batch 4 (docs/issue72-reachability-triage.md): the plain-idiom
  // tail starting at STRINGID_PKMNLAIDCURSE.
  if (messageId === "STRINGID_PKMNLAIDCURSE") {
    // BattleScript_DoGhostCurse: a Ghost-type Curse always targets the
    // opponent (MOVE_TARGET_SELECTED), so gBattlerAttacker != gBattlerTarget
    // and the label's own jumpifbytenotequal skips getmovetarget -- the
    // move's own (still-current) attacker/target roles are unchanged.
    const attacker = requireMoveAttacker(lastMoveAttacker, "laid-curse message");
    const defender = requireMoveDefender(lastMoveAttacker, "laid-curse message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNCOPIEDSTATCHANGES") {
    // BattleScript_EffectPsychUp: Cmd_copyfoestats reads/writes the move's own
    // (still-current) attacker/target roles unconditionally -- zero TS
    // references to this label (a purely generic printstring), same shape as
    // STRINGID_PKMNPREVENTSUSAGE's attacker+defender pair.
    const attacker = requireMoveAttacker(lastMoveAttacker, "copied-stat-changes message");
    const defender = requireMoveDefender(lastMoveAttacker, "copied-stat-changes message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNWASMADEDROWSY") {
    // BattleScript_EffectYawn's own unconditional success tail (after the
    // Insomnia/Vital Spirit/Safeguard/accuracy/jumpifcantmakeasleep gates all
    // pass) prints against the move's own (still-current) attacker/target
    // roles -- no role-changing opcode runs between setyawn and this print.
    const attacker = requireMoveAttacker(lastMoveAttacker, "made-drowsy message");
    const defender = requireMoveDefender(lastMoveAttacker, "made-drowsy message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNSXBLOCKSY") {
    // BattleScript_SoundproofProtected: the attack-canceler's own moves-block
    // Soundproof check (battleScriptAbilityMovesBlock.ts) reads
    // selectorRoles.target without reassigning it -- the move's own
    // (still-current) target is the Soundproof holder; {B_CURRENT_MOVE} is
    // the actionSnapshot's own currentMove, same idiom
    // STRINGID_PKMNSXMADEYUSELESS uses.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "blocks-move message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  // ISSUES #72 batch 5 (docs/issue72-reachability-triage.md): the
  // plain-idiom tail continued from STRINGID_PKMNFREEDFROM.
  if (messageId === "STRINGID_PKMNFREEDFROM") {
    // BattleScript_WrapEnds: runWrapTick's own release branch
    // (WRAP_ENDS_LABEL, battleEndTurnOrchestration.ts), sibling of
    // STRINGID_PKMNHURTBY's WRAP_TURN_DMG_LABEL branch -- same
    // enterTickBattlerContext reassignment, same wrappedMove substitution.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/move substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const trappingMoveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_BUFF1: () => trappingMoveName,
    });
  }
  if (messageId === "STRINGID_PKMNGOTFREE") {
    // BattleScript_WrapFree: Cmd_rapidspinfree's own Wrap branch
    // (battleScriptIngrainLeechSeedWrapOpcode.ts:495-526) -- the Rapid Spin
    // user's attacker role is never reassigned (only target/scriptingBattler
    // are, and both land on the same battler as requireMoveDefender in this
    // engine's singles-only scope), so {B_ATK_NAME_WITH_PREFIX} is the freed
    // battler and {B_DEF_NAME_WITH_PREFIX} is the wrap's original caster.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/move substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "got-free message");
    const defender = requireMoveDefender(lastMoveAttacker, "got-free message");
    const trappingMoveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => trappingMoveName,
    });
  }
  if (
    messageId === "STRINGID_PKMNDREAMEATEN"
    || messageId === "STRINGID_PKMNWASNTAFFECTED"
    || messageId === "STRINGID_PKMNGOTENCORE"
    || messageId === "STRINGID_TARGETCANTESCAPENOW"
  ) {
    // BattleScript_DreamEaterWorked/WasntAffected (EffectDreamEater's own
    // jumpifstatus-positive/negative branches), BattleScript_EffectEncore,
    // BattleScript_EffectMeanLook (Mean Look/Spider Web/Block share this
    // label) -- all zero-TS-reference move-effect entry scripts, so BS_TARGET
    // is still the move's own (still-current) target.
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNIDENTIFIED") {
    // BattleScript_EffectForesight: another zero-TS-reference move-effect
    // entry script, attacker/target both still the move's own unchanged
    // roles.
    const attacker = requireMoveAttacker(lastMoveAttacker, "identified message");
    const defender = requireMoveDefender(lastMoveAttacker, "identified message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (
    messageId === "STRINGID_PKMNSXINFATUATEDY"
    || messageId === "STRINGID_PKMNHURTSWITH"
    || messageId === "STRINGID_PKMNCOPIEDFOE"
  ) {
    // Cute Charm/Rough Skin (executeOnDamageAbilities, battleScriptMoveEndOpcode.ts:
    // 507-521,562-586) and Role Play (a zero-TS-reference move-effect entry
    // script) all read the ability holder off the move's own unchanged
    // target -- same battler requireMoveDefender resolves, {B_DEF_ABILITY}
    // engine-supplied via prepareMessage the same way STRINGID_PKMNRESTOREDHPUSING's
    // family already is.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNKNOCKEDOFF") {
    // MOVE_EFFECT_KNOCK_OFF handler (battleScriptHitChainOpcode.ts:3198-3239):
    // effectBattler === target here (Knock Off is not an affects-user
    // effect), and neither selectorRoles.attacker/target is ever reassigned
    // -- the item is cleared from rules state before the script runs, but
    // {B_LAST_ITEM} reads the already-owned `heldItems` snapshot, which still
    // holds the pre-removal name at this same print (the typed removeitem
    // controller receipt that would advance it comes later).
    const attacker = requireMoveAttacker(lastMoveAttacker, "knocked-off message");
    const defender = requireMoveDefender(lastMoveAttacker, "knocked-off message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_LAST_ITEM: () => factoryItemDisplayName(heldItems[defender]),
    });
  }
  if (messageId === "STRINGID_PKMNSXMADEITINEFFECTIVE") {
    // BattleScript_PrintAbilityMadeIneffective: reached by unlabeled
    // fallthrough from BattleScript_PrintBankAbilityMadeIneffective, whose own
    // `copybyte sBATTLER, sBATTLER_WITH_ABILITY` (battleScriptIngrainLeechSeed
    // WrapOpcode.ts:297-306) already writes scriptingBattler to the Insomnia/
    // Vital Spirit holder recorded by EffectYawn's own jumpifability checks --
    // the exact same scriptingBattler idiom STRINGID_PKMNSXCUREDITSYPROBLEM
    // already uses.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
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
  // ISSUES #70 batch 3 (docs/issue70-stringid-reachability.md rows 6-14,
  // 21-22, 40): the ability-prevention family, the Uproar family, Stockpile/
  // Swallow, and Transform.
  if (
    messageId === "STRINGID_PKMNPREVENTSPOISONINGWITH"
    || messageId === "STRINGID_PKMNSXPREVENTSBURNS"
    || messageId === "STRINGID_PKMNPREVENTSPARALYSISWITH"
  ) {
    // gPSNPreventionStringIds[0]/gBRNPreventionStringIds[0]/
    // gPRLZPreventionStringIds[0] (battle_message.c:391-405) -- the
    // direct-status-move context (Toxic/Will-O-Wisp/Thunder Wave-family vs
    // Immunity/Water Veil/Limber), reached via BattleScript_ImmunityProtected/
    // WaterVeilPrevents/LimberProtected's own `copybyte gEffectBattler,
    // gBattlerTarget` (battle_scripts_1.s:715,1035,2191), already ported as
    // Cmd_copyarray's gEffectBattler<-gBattlerTarget tuple
    // (battleScriptIngrainLeechSeedWrapOpcode.ts:277-290). Both template
    // variants ({B_DEF_ABILITY} for PSN/PRLZ, {B_EFF_ABILITY} for BRN) name
    // the same battler here, since this context never swaps effectBattler
    // away from the real move's target.
    if (event.payload.effectBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no effect-battler/ability substitution`);
    }
    const effectBattler = singlesBattler(event.payload.effectBattler, `${messageId} effect battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_EFF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, effectBattler),
      B_DEF_ABILITY: () => ability,
      B_EFF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXPREVENTSYSZ") {
    // idx1 of all three prevention tables (battle_message.c:391-405) -- only
    // reachable via Synchronize's own seteffectprimary re-application
    // (executeSynchronize, battleScriptMoveEndOpcode.ts), which sets
    // HITMARKER_STATUS_ABILITY_EFFECT before applySetMoveEffect runs.
    // {B_ATK_NAME_WITH_PREFIX}/{B_DEF_NAME_WITH_PREFIX} are the real, fixed
    // attacker/target (unaffected by Synchronize's own effectBattler/
    // scriptingBattler swap) -- lastMoveAttacker already tracks them.
    if (event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no ability substitutions`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "prevents-ability message");
    const defender = requireMoveDefender(lastMoveAttacker, "prevents-ability message");
    const attackerAbility = event.payload.substitutions[0]!;
    const defenderAbility = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_ATK_ABILITY: () => attackerAbility,
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => defenderAbility,
    });
  }
  if (messageId === "STRINGID_PKMNSXHADNOEFFECTONY") {
    // idx2 of all three prevention tables -- same Synchronize-only
    // reachability as above, but the type-immune (not ability-block) tail:
    // {B_SCR_ACTIVE_*} is the ability holder (scriptingBattler, always
    // Synchronize in practice), {B_EFF_NAME_WITH_PREFIX} is the type-immune
    // battler (effectBattler).
    if (
      event.payload.scriptingBattler === undefined
      || event.payload.effectBattler === undefined
      || event.payload.substitutions.length === 0
    ) {
      throw new Error(`battle resolution ${messageId} message has no scripting/effect-battler or ability substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const effectBattler = singlesBattler(event.payload.effectBattler, `${messageId} effect battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_EFF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, effectBattler),
    });
  }
  if (
    messageId === "STRINGID_PKMNCANTSLEEPINUPROAR2"
    || messageId === "STRINGID_UPROARKEPTPKMNAWAKE"
  ) {
    // gUproarAwakeStringIds[0]/[1] (battle_message.c:426-431),
    // createJumpifcantmakeasleepOpcodeHandler -- both choosers only differ in
    // wording on whose Uproar it is; the displayed battler is always the
    // sleep move's own real target either way.
    const target = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, target),
    });
  }
  if (messageId === "STRINGID_PKMNSTAYEDAWAKEUSING") {
    // gUproarAwakeStringIds[2] -- the Insomnia/Vital Spirit branch,
    // independent of any Uproar carrier.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const target = requireMoveDefender(lastMoveAttacker, "stayed-awake message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, target),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_USINGITEMSTATOFPKMNROSE") {
    // gStatUpStringIds[4] (battle_message.c:1006-1015), BattleScript_
    // BerryStatRaiseDoStatUp -- the same statbuffchange/BattleScript_StatUp
    // mechanism as ATTACKERSSTATROSE/DEFENDERSSTATROSE below, just a
    // different chooser index; {B_BUFF1}/{B_BUFF2} reuse that same
    // lastStatChange tracking. {B_SCR_ACTIVE_NAME_WITH_PREFIX}/{B_LAST_ITEM}
    // are the berry holder (scriptingBattler, battleEndTurnOrchestration.ts's
    // STAT_UP_BERRIES tick).
    if (event.payload.scriptingBattler === undefined || !lastStatChange) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/stat event`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const statName = STAT_DISPLAY_NAME[lastStatChange.stat];
    if (statName === undefined) {
      throw new Error(`battle resolution ${messageId} message has unknown stat ${lastStatChange.stat}`);
    }
    return resolveBattleStringLines(messageId, {
      B_LAST_ITEM: () => factoryItemDisplayName(heldItems[scriptingBattler]),
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_BUFF1: () => statName,
      B_BUFF2: () => (lastStatChange.requestedMagnitude === 2 ? "sharply rose!" : "rose!"),
    });
  }
  if (messageId === "STRINGID_PKMNSTOCKPILED") {
    // gStockpileUsedStringIds[0] (battle_message.c:341-345),
    // stockpileHandler -- {B_BUFF1} is the post-increment stockpile counter
    // (rulesContext.battleTextBuff1ByteNumber), the same shape as HITXTIMES.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no stockpile-count substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "stockpiled message");
    const count = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_BUFF1: () => count,
    });
  }
  if (messageId === "STRINGID_PKMNHPFULL") {
    // gSwallowFailStringIds[1] (battle_message.c:351-355) -- Swallow at full
    // HP self-targets (stockpileToHpHealHandler reassigns
    // selectorRoles.target to the attacker itself), so {B_DEF_NAME_WITH_PREFIX}
    // is the attacker, not the generic opposite-singles-battler defender.
    const attacker = requireMoveAttacker(lastMoveAttacker, "hp-full message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
    });
  }
  if (messageId === "STRINGID_PKMNTRANSFORMEDINTO") {
    // gTransformUsedStringIds[0] (battle_message.c:331-335) -- {B_BUFF1} is
    // the species Transform just copied (rulesContext.battleTextBuff1Species).
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no species substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "transformed-into message");
    const speciesName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_BUFF1: () => speciesName,
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
  // ISSUES #70's STRINGID_INTROSENDOUT extractor gap: ids 0/1/2/5 sit below
  // the extracted table's own scoped range (src/data/battleIntroStrings.ts's
  // own header), so they read that hand-mapped table instead of
  // resolveBattleStringLines, the same way STRINGID_SWITCHINMON (id 3, just
  // above) hand-builds its own lines. No engine path emits any of these 4
  // ids yet (ISSUES #71 owns the live send-out seam); this is resolver
  // completeness only, so a future emitter resolves instead of crashing.
  if (messageId === "STRINGID_INTROMSG") {
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution intro message requires a frozen trainer-name substitution",
      );
    }
    return resolveIntroStringEntry(
      findIntroStringEntry(0, "sText_Trainer1WantsToBattle"),
      {
        B_TRAINER1_CLASS: () => opponentTrainer.className,
        B_TRAINER1_NAME: () => opponentTrainer.name,
      },
    );
  }
  if (messageId === "STRINGID_INTROSENDOUT") {
    if (event.payload.introBattler === undefined) {
      throw new Error("battle resolution intro-sendout message has no intro battler");
    }
    const battler = singlesBattler(event.payload.introBattler, "intro-sendout message");
    if (battler === 0) {
      return resolveIntroStringEntry(findIntroStringEntry(1, "sText_GoPkmn"), {
        B_PLAYER_MON1_NAME: () => fieldBattler(field, 0).name,
      });
    }
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution opponent intro-sendout message requires a frozen trainer-name substitution",
      );
    }
    return resolveIntroStringEntry(findIntroStringEntry(1, "sText_Trainer1SentOutPkmn"), {
      B_TRAINER1_CLASS: () => opponentTrainer.className,
      B_TRAINER1_NAME: () => opponentTrainer.name,
      B_OPPONENT_MON1_NAME: () => fieldBattler(field, 1).name,
    });
  }
  if (messageId === "STRINGID_RETURNMON") {
    if (event.payload.introBattler === undefined) {
      throw new Error("battle resolution return-mon message has no intro battler");
    }
    const battler = singlesBattler(event.payload.introBattler, "return-mon message");
    const returning = fieldBattler(field, battler);
    if (battler === 0) {
      const hpScale = event.payload.introHpScale;
      if (hpScale === undefined) {
        throw new Error("battle resolution player return-mon message has no hp scale");
      }
      const cSymbolByHpScale: Readonly<Record<0 | 1 | 2 | 3, string>> = {
        0: "sText_PkmnThatsEnough",
        1: "sText_PkmnComeBack",
        2: "sText_PkmnOkComeBack",
        3: "sText_PkmnGoodComeBack",
      };
      return resolveIntroStringEntry(findIntroStringEntry(2, cSymbolByHpScale[hpScale]), {
        B_BUFF1: () => returning.name,
      });
    }
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution opponent return-mon message requires a frozen trainer-name substitution",
      );
    }
    return resolveIntroStringEntry(findIntroStringEntry(2, "sText_Trainer1WithdrewPkmn"), {
      B_TRAINER1_CLASS: () => opponentTrainer.className,
      B_TRAINER1_NAME: () => opponentTrainer.name,
      B_BUFF1: () => returning.name,
    });
  }
  if (messageId === "STRINGID_BATTLEEND") {
    if (event.payload.introOutcome === undefined) {
      throw new Error("battle resolution battle-end message has no outcome");
    }
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution battle-end message requires a frozen trainer-name substitution",
      );
    }
    const cSymbolByOutcome: Readonly<Record<BattleOutcome, string>> = {
      "player-win": "sText_PlayerDefeatedLinkTrainer",
      "trainer-win": "sText_PlayerLostAgainstLinkTrainer",
      draw: "sText_PlayerBattledToDrawLinkTrainer",
    };
    return resolveIntroStringEntry(
      findIntroStringEntry(5, cSymbolByOutcome[event.payload.introOutcome]),
      { B_LINK_OPPONENT1_NAME: () => opponentTrainer.name },
    );
  }
  // Terminal-seam increment (ii) (docs/terminal-seam-round-flow-scout.md §3,
  // ISSUES #72's Taunt-pair idiom extended to the win-side terminal ids):
  // BattleScript_FrontierTrainerBattleWon's own two printstrings, reachable
  // only now that increment (i) resumes the interpreter past checkteamslost's
  // end2 into that script.
  if (messageId === "STRINGID_PLAYERDEFEATEDTRAINER1") {
    // data/battle_scripts_1.s:3029-3030 -- {B_TRAINER1_CLASS}/{B_TRAINER1_NAME}
    // are the plain per-round opponent identity, same idiom as
    // STRINGID_INTROMSG/STRINGID_SWITCHINMON above.
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution player-defeated-trainer message requires a frozen trainer-name substitution",
      );
    }
    return resolveBattleStringLines(messageId, {
      B_TRAINER1_CLASS: () => opponentTrainer.className,
      B_TRAINER1_NAME: () => opponentTrainer.name,
    });
  }
  if (messageId === "STRINGID_TRAINER1LOSETEXT") {
    // data/battle_scripts_1.s:3035-3038 -- unlike every other id in this
    // file, the extracted template is a single bare {B_TRAINER1_LOSE_TEXT}
    // placeholder with no line-break segment of its own: the source's line
    // split lives entirely inside CopyFrontierTrainerText's Easy-Chat-word
    // buffer, already formatted into its fixed 2-line shape by
    // factoryTrainerPresentationForOpponent (formatFactoryEasyChatSpeech).
    // So this hand-builds the 2-line result directly, the same shape
    // STRINGID_SWITCHINMON's opponent branch uses above, rather than routing
    // through resolveBattleStringLines (which only knows how to split on the
    // template's own line-break segments).
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution trainer-lose-text message requires a frozen trainer-name substitution",
      );
    }
    return opponentTrainer.speechLose;
  }
  if (messageId === "STRINGID_TRAINER1WINTEXT") {
    // data/battle_scripts_1.s:2968 (BattleScript_LocalBattleLostPrintTrainersWinText)
    // -- the LOSS-side mirror of STRINGID_TRAINER1LOSETEXT just above: same
    // bare {B_TRAINER1_WIN_TEXT} placeholder with no line-break segment of
    // its own, same CopyFrontierTrainerText Easy-Chat-word buffer, just the
    // opposite per-trainer speech field (speechWin instead of speechLose).
    // docs/terminal-seam-loss-path-ground-truth.md §2(b): DESTIN's speechWin
    // ("I AM ABOUT TO OVERHEAT") pixel-confirmed against this exact field.
    if (opponentTrainer === null || opponentTrainer.speechWin === undefined) {
      throw new Error(
        "battle resolution trainer-win-text message requires a frozen trainer-name substitution",
      );
    }
    return opponentTrainer.speechWin;
  }
  // ISSUES #72 batch 6 (docs/issue72-reachability-triage.md): the plain-idiom
  // tail continued from STRINGID_PKMNSXCUREDYPROBLEM.
  if (messageId === "STRINGID_PKMNWISHCAMETRUE") {
    // BattleScript_WishComesTrue/WishButFullHp: Cmd_trywish's own heal-effect
    // state PREPARE_MON_NICK_WITH_PREFIX_BUFFERs the Wish target's own name
    // into {B_BUFF1} -- runDoFieldEndTurnEffects's own selectorRoles.target
    // write plus enterTickBattlerContext's generic attacker reassignment both
    // land on the same (no-switch-in-between) battler in this engine's scope.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_BUFF1: nameWithPrefixResolver(field, battler),
    });
  }
  if (messageId === "STRINGID_PKMNUSEDSAFEGUARD") {
    // BattleScript_SafeguardProtected/TeeterDanceSafeguardProtected: the
    // jumpifsideaffecting check reads BS_TARGET without reassigning it -- the
    // move's own (still-current) target, same plain shape
    // STRINGID_TARGETCANTESCAPENOW already uses.
    const defender = requireMoveDefender(lastMoveAttacker, "used-safeguard message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNSXRESTOREDHPALITTLE2") {
    // BattleScript_RainDishActivates: runAbilitiesTick's own Rain Dish branch
    // never reassigns scriptingBattler (unlike Shed Skin/Speed Boost) --
    // {B_ATK_NAME_WITH_PREFIX}/{B_ATK_ABILITY} read gBattlerAttacker, set
    // generically by enterTickBattlerContext for every end-turn tick
    // (battle_util.c:2604's own unconditional gBattlerAttacker = battler).
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/ability substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_ATK_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNMOVEISDISABLED") {
    // BattleScript_MoveUsedIsDisabled: same {B_ACTIVE_NAME_WITH_PREFIX}/
    // {B_CURRENT_MOVE} shape STRINGID_PKMNCANTUSEMOVETAUNT already uses -- the
    // attack-canceler's own handoff (battleScriptActionAdmission.ts:2192) is
    // wired the same Taunt/Imprison idiom.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNMOVEWASDISABLED") {
    // BattleScript_EffectDisable: disablelastusedattack and this printstring
    // run back-to-back with no role change in between
    // (data/battle_scripts_1.s:1183-1193) -- BS_TARGET is still the move's
    // own (still-current) defender, whose own disabledMove field
    // Cmd_disablelastusedattack just wrote.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no move substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "move-was-disabled message");
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => moveName,
    });
  }
  if (messageId === "STRINGID_PKMNPERISHCOUNTFELL") {
    // BattleScript_PerishSongCountGoesDown/PerishSongTakesLife share this
    // printstring (data/battle_scripts_1.s:3438-3450); runPerishSongAfterFutureAttacks
    // freezes selectorRoles.attacker to the counting battler and stamps the
    // pre-decrement count into battleTextBuff1ByteNumber (battle_util.c:1846's
    // own PREPARE_BYTE_NUMBER_BUFFER call, captured before the decrement).
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/count substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const count = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_BUFF1: () => count,
    });
  }
  if (messageId === "STRINGID_PKMNMOVEBOUNCED") {
    // BattleScript_MagicCoatBounce: the Magic Coat attack-canceler handoff
    // never reassigns attacker/target (battleScriptMagicCoat.ts:470-506) --
    // BS_ATTACKER/{B_CURRENT_MOVE} are still the original caster and their
    // own blocked status move.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "move-bounced message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNRAISEDSPEED") {
    // BattleScript_SpeedBoostActivates: runAbilitiesTick's own Speed Boost
    // branch now sets scriptingBattler the same way Shed Skin's own tick
    // already does (battle_util.c:2649's gBattleScripting.battler = battler).
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSHROUDEDITSELF") {
    // BattleScript_EffectMagicCoat's own success tail -- a zero-TS-reference
    // move-effect entry script, attacker/target both still the move's own
    // unchanged roles.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "shrouded-itself message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_STATSWONTDECREASE2") {
    // BattleScript_CantLowerMultipleStats (EffectTickle's own compound
    // both-stats-already-at-minimum gate) -- BS_TARGET unchanged, plain
    // defender-only shape.
    const defender = requireMoveDefender(lastMoveAttacker, "stats-wont-decrease message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNFELLINTONIGHTMARE") {
    // BattleScript_NightmareWorked (EffectNightmare's own compound
    // already-asleep gate) -- BS_TARGET unchanged, plain defender-only shape.
    const defender = requireMoveDefender(lastMoveAttacker, "fell-into-nightmare message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNHEALEDPARALYSIS") {
    // MOVE_EFFECT_REMOVE_PARALYSIS handler (Smelling Salt's sole carrier) --
    // BS_TARGET unchanged, plain defender-only shape.
    const defender = requireMoveDefender(lastMoveAttacker, "healed-paralysis message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  // ISSUES #72 batch 7: the small-plumbing + known-staging cluster of the
  // remaining REACHABLE-15 list (docs/issue72-reachability-triage.md,
  // PROGRESS 904's own classification).
  if (messageId === "STRINGID_PKMNCHANGEDTYPEWITH") {
    // BattleScript_ColorChangeActivates: executeOnDamageAbilities's own
    // Color Change branch never reassigns selectorRoles -- BS_TARGET stays
    // the move's own still-current target, the same battler whose types[]
    // just changed.
    if (event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no ability/type substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "changed-type-with message");
    const ability = event.payload.substitutions[0]!;
    const typeName = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
      B_BUFF1: () => typeName,
    });
  }
  if (messageId === "STRINGID_PKMNREDUCEDPP") {
    // Cmd_tryspiteppreduce (Spite): reads rules.selectorRoles.target
    // directly (requireBattlerRole), never reassigned -- the move's own
    // still-current target, whose last-used move/PP this reduces.
    if (event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no move/pp substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "reduced-pp message");
    const moveName = event.payload.substitutions[0]!;
    const ppAmount = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => moveName,
      B_BUFF2: () => ppAmount,
    });
  }
  if (messageId === "STRINGID_PKMNSITEMRESTOREDPP") {
    // BattleScript_BerryPPHealEnd2 (Leppa Berry): runItemsTick's own
    // HOLD_EFFECT_RESTORE_PP branch sets scriptingBattler to the berry
    // holder, same shape STRINGID_USINGITEMSTATOFPKMNROSE already uses for
    // {B_SCR_ACTIVE_NAME_WITH_PREFIX}/{B_LAST_ITEM}.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/move substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_LAST_ITEM: () => factoryItemDisplayName(heldItems[scriptingBattler]),
      B_BUFF1: () => moveName,
    });
  }
  if (messageId === "STRINGID_PKMNSTOLEITEM") {
    // MOVE_EFFECT_STEAL_ITEM handler (Thief/Covet): unlike Knock Off, this
    // handler's own set-battler-item events (attacker gains the stolen item,
    // target loses it) fire in the SAME transition that calls into
    // BattleScript_ItemSteal, i.e. strictly before this print in event
    // order -- so by print time heldItems[attacker] already holds the
    // transferred item (heldItems[defender] would read ITEM_NONE here).
    const attacker = requireMoveAttacker(lastMoveAttacker, "stole-item message");
    const defender = requireMoveDefender(lastMoveAttacker, "stole-item message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_LAST_ITEM: () => factoryItemDisplayName(heldItems[attacker]),
    });
  }
  if (messageId === "STRINGID_PKMNTRACED") {
    // ABILITYEFFECT_TRACE (battle_util.c:3017-3069): scriptingBattler is the
    // tracer itself; {B_BUFF1} is the traced-FROM battler's own
    // name-with-prefix (PREPARE_MON_NICK_WITH_PREFIX_BUFFER, a distinct
    // battler from scriptingBattler, threaded via prepareMessage's new
    // monNickBattler field since name resolution needs `field`); {B_BUFF2}
    // is the copied ability, engine-supplied via prepareMessage.
    if (
      event.payload.scriptingBattler === undefined
      || event.payload.monNickBattler === undefined
      || event.payload.substitutions.length === 0
    ) {
      throw new Error(`battle resolution ${messageId} message has no scripting/mon-nick-battler or ability substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const nickBattler = singlesBattler(event.payload.monNickBattler, `${messageId} mon-nick battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_BUFF1: nameWithPrefixResolver(field, nickBattler),
      B_BUFF2: () => ability,
    });
  }
  // ISSUES #72 batch 8 (docs/issue72-hard-tail-scout.md): the REACHABLE-10
  // hard tail.
  if (messageId === "STRINGID_PKMNPROTECTEDBY") {
    // Cmd_tryKO (battleScriptTryKOOpcode.ts:117-134): the Sturdy check never
    // reassigns selectorRoles -- the move's own (still-current) target is
    // the Sturdy holder, matching real source's unconditional
    // gBattlerTarget check (battle_script_commands.c:7511-7518) ahead of
    // any accuracy/hit roll -- deterministic, not RNG-gated.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "protected-by message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXWHIPPEDUPSANDSTORM") {
    // BattleScript_SandstreamActivates: Cmd_switchineffects's own Sand
    // Stream branch freezes scriptingBattler to the switching-in battler
    // (battleScriptSwitchinOpcode.ts:973-981), same shape
    // STRINGID_PKMNPREVENTSSTATLOSSWITH already uses.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXBLOCKSY2") {
    // BattleScript_PerishSongNotAffected: EffectPerishSong's own per-battler
    // Soundproof loop (setbyte/addbyte sBATTLER) -- scriptingBattler is
    // already the generic sBATTLER field (battleScriptSetByte.ts:267,304),
    // {B_CURRENT_MOVE} is the actionSnapshot's own currentMove, same idiom
    // STRINGID_PKMNSXBLOCKSY uses.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0 || actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability/action-snapshot`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNTOOKFOE") {
    // BattleScript_DestinyBondTakesLife: Cmd_tryfaintmon's nested
    // call-stack transition never reassigns selectorRoles.attacker/.target
    // (battleScriptHitChainOpcode.ts:4295-4340) -- the plain
    // attacker/defender pair from the original hit, unchanged. Destiny
    // Bond/Grudge can only ever fire off a BS_TARGET/BS_FAINTED
    // tryfaintmon call site (docs/issue72-hard-tail-scout.md §1b) since
    // both require the attacker role's own battler to still be alive.
    const attacker = requireMoveAttacker(lastMoveAttacker, "took-foe message");
    const defender = requireMoveDefender(lastMoveAttacker, "took-foe message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
    });
  }
  if (messageId === "STRINGID_PKMNLOSTPPGRUDGE") {
    // BattleScript_GrudgeTakesPP: scheduleGrudge (battleScriptHitChainOpcode.ts:
    // 4354-4376) captures battleTextBuff1Move off the ATTACKER role's own
    // chosen move (the battler that just landed the killing hit, real
    // source's gBattleMons[gBattlerAttacker].moves[moveIndex] --
    // battle_script_commands.c:3030), not the Grudge caster's own move --
    // same plain attacker/defender pair STRINGID_PKMNTOOKFOE above uses.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no move substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "lost-pp-grudge message");
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_BUFF1: () => moveName,
    });
  }
  if (messageId === "STRINGID_PKMNREGAINEDHEALTH") {
    // The 3-label split (docs/issue72-hard-tail-scout.md §3): the correct
    // battler differs per emitting label, since BattleScript_EffectRestoreHp/
    // the self-heal family reassign selectorRoles.target = attacker
    // (battleScriptTryhealhalfhealthOpcode.ts:47) while
    // BattleScript_PresentHealTarget's own Present sub-path never reassigns
    // (a genuinely opposing battler) and BattleScript_WishComesTrue is a
    // tick-scoped actionSnapshot.attacker read, same shape
    // STRINGID_PKMNWISHCAMETRUE already uses.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot`);
    }
    const MOVE_PRESENT = 217;
    const label = sourceLabelOf(event);
    if (label === "BattleScript_WishComesTrue") {
      const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
      return resolveBattleStringLines(messageId, {
        B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      });
    }
    if (label === "BattleScript_PresentHealTarget" && actionSnapshot.currentMove === MOVE_PRESENT) {
      const defender = requireMoveDefender(lastMoveAttacker, "regained-health message (Present)");
      return resolveBattleStringLines(messageId, {
        B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      });
    }
    // BattleScript_EffectRestoreHp, or PresentHealTarget reached via the
    // self-heal family (Rest/Moonlight/Synthesis/Swallow/Softboiled/MilkDrink).
    const attacker = requireMoveAttacker(lastMoveAttacker, "regained-health message (self-heal)");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
    });
  }
  if (messageId === "STRINGID_PKMNHUNGONWITHX") {
    // BattleScript_FocusBandActivates: Cmd_adjustnormaldamage's own Focus
    // Band branch (battleScriptHitChainOpcode.ts:1978-1996) never removes
    // the item (unlike Knock Off/Thief) -- heldItems[defender] already
    // holds it unchanged at print time, the plain requireMoveDefender +
    // item-name idiom STRINGID_PKMNSTOLEITEM's own B_LAST_ITEM read already
    // established.
    const defender = requireMoveDefender(lastMoveAttacker, "hung-on-with message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_LAST_ITEM: () => factoryItemDisplayName(heldItems[defender]),
    });
  }
  if (messageId === "STRINGID_PKMNSAFEGUARDEXPIRED") {
    // BattleScript_SafeguardEnds: runScreenFieldCase's own tick
    // (battleEndTurnOrchestration.ts:1916-1924) shares the identical
    // enterTickBattlerContext-set selectorRoles.attacker shape
    // STRINGID_PKMNSXWOREOFF already uses. {B_ATK_PREFIX3} resolves through
    // the identical "Ally"/"Foe" side text as {B_ATK_PREFIX1}
    // (battle_message.c:2649-2668: sText_AllyPkmnPrefix/AllyPkmnPrefix3 are
    // both literally "Ally", sText_FoePkmnPrefix2/FoePkmnPrefix4 both
    // literally "Foe" -- distinct string constants, identical text).
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_ATK_PREFIX3: () => (battler === 0 ? "Ally" : "Foe"),
    });
  }
  if (messageId === "STRINGID_PKMNTOOKATTACK") {
    // BattleScript_MonTookFutureAttack: runFutureAttacksAfterFaints's own
    // tick (battleEndTurnOrchestration.ts:2246-2264) reassigns selectorRoles
    // to the ORIGINAL caster (attacker) and the delayed hit's own recipient
    // (target) -- in this engine's singles-only scope the recipient is
    // always the singles-opposite of the caster, the same requireMoveDefender
    // relationship every other plain-idiom id already uses.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/move substitution`);
    }
    const caster = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const defender = requireMoveDefender(caster, "took-attack message");
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => moveName,
    });
  }
  if (messageId === "STRINGID_MAGNITUDESTRENGTH") {
    // BattleScript_EffectMagnitude (data/battle_scripts_1.s:1683-1692):
    // magnitudedamagecalculation runs (and prints) BEFORE the actual hit
    // lands (goto BattleScript_HitsAllWithUndergroundBonusLoop). Cmd_magnitude
    // damagecalculation (battle_script_commands.c:8670-8710) writes the
    // rolled tier straight into gBattleTextBuff1 via PREPARE_BYTE_NUMBER_BUFFER
    // -- the same battleTextBuff1ByteNumber shape STOCKPILE/PERISHCOUNTFELL
    // already use (magnitudeHandler, battleScriptRankedBatch1Opcode.ts:130).
    // {B_BUFF1} is the only placeholder; no attacker/defender name needed.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no magnitude substitution`);
    }
    const magnitude = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_BUFF1: () => magnitude,
    });
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
  opponentTrainer: BattleResolutionOpponentTrainer | null = null,
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
          || TERMINAL_SEAM_BUTTON_MESSAGE_IDS.has(payload.messageId)
            ? "button"
            : "automatic",
        noCursor: TERMINAL_SEAM_QUOTE_MESSAGE_IDS.has(payload.messageId),
        timing: STAT_CHANGE_MESSAGE_IDS.has(payload.messageId)
          ? STAT_CHANGE_MESSAGE_TIMING
          : MESSAGE_TIMING,
      }));
      pendingStatusMessageBattler = null;
      pendingHeldItemEffectBattler = null;
      continue;
    }
    if (payload.kind === "trainer-slide-in" || payload.kind === "trainer-slide-out") {
      commands.push(Object.freeze({
        type: "trainer-slide",
        eventSequence: event.sequence,
        battler: singlesBattler(payload.battler, "trainer slide"),
        direction: payload.kind === "trainer-slide-in" ? "in" as const : "out" as const,
        timing: TRAINER_SLIDE_TIMING,
      }));
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
        // Each of BtlController_EmitReturnMonToBall/EmitSpriteInvisibility is
        // one controller callback; the receipt itself owns the relative
        // display edge.
        timing: Object.freeze({ minimumFrames: 1 as const }),
        // See the "sprite-visibility" command type's own doc comment: only
        // Cmd_various's VARIOUS_RETURN_OPPONENT_MON1/MON2 case is the real
        // CONTROLLER_RETURNMONTOBALL receipt.
        recall: event.provenance?.opcodeName === "B_SCR_OP_VARIOUS",
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
