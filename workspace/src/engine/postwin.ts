import { PLAYER_NAME } from "./playerName.ts";
// Battle Factory Battle 1 return-to-counter flow, relative to the real
// DESTIN loss-quote dismiss edge.  The timing is oracle/RAM-pinned in
// docs/postwin-notes.md's S8 engine-evidence addendum.

import {
  getFactoryOpponentCommentary,
  type FactoryCommentaryParty,
} from "./factoryCommentary.ts";
import {
  createFactoryCorpusParty,
  type FactoryCorpusPartyInstance,
} from "./factoryCorpusParty.ts";
import type {
  BattleIndex,
  BattleParty,
} from "./battleScenario.ts";
import type { RoundControllerState } from "./roundController.ts";
import type { BattleResolutionPresentationRenderView } from "./battleResolutionPresentationRender.ts";
import walkupScript from "../data/gen/factory-brain-walkup-script.json" with { type: "json" };

export type FactoryPostwinOpponentRentalRecords = readonly [
  FactoryCorpusPartyInstance,
  FactoryCorpusPartyInstance,
  FactoryCorpusPartyInstance,
];

export type PostwinScoutingLines = readonly [
  readonly [string, string],
  readonly [string, string],
  readonly [string, string],
  readonly [string, string],
];

export type PostwinPhase =
  | "battleHold"
  | "battleFade"
  | "blackAfterBattle"
  | "battleRoom"
  | "blackBeforeCounter"
  | "counterRoom";

/** RECORD/RETIRE question branch kind (docs/postwin-record-retire-ground-truth.md §1-§2). */
export type PostwinQuestionKind = "record" | "retire";

export interface PostwinState {
  /** Ticks since the accepted loss-quote dismiss (0 = the A edge). */
  elapsed: number;
  /** SaveBlock2.frontier.curChallengeBattleNum. */
  challengeBattleNum: BattleIndex;
  /** Typed round value written at the source bookkeeping boundary. */
  challengeBattleNumAfterWrite: BattleIndex;
  /** SaveBlock2.frontier.rentalMons[3..5].monId. */
  opponentRentalMonIds: readonly [number, number, number];
  /** Typed rental ids written at the source bookkeeping boundary. */
  opponentRentalMonIdsAfterWrite: readonly [number, number, number];
  /** Attendant pages derived from the upcoming opponent party. */
  scoutingLines: PostwinScoutingLines;
  /** Accepted heal-message A edge, in this state's relative elapsed clock. */
  healDismissElapsed: number | null;
  /** gPlayerParty[0..2] HP: ONIX / MAGBY / BAYLEEF. */
  playerPartyHp: readonly [number, number, number];
  /** Typed full-heal values written after the heal-message edge. */
  healedPlayerPartyHp: readonly [number, number, number];
  /** MULTI_GO_ON_RECORD_REST_RETIRE cursor; null until the menu exists. */
  continuationCursorPos: 0 | 1 | 2 | 3 | null;
  /** Accepted GO ON edge; every following dialogue clock is edge-relative. */
  continuationConfirmElapsed: number | null;
  /** 0 = continuation menu, 1..3 = scouting pages, 4 = swap offer. */
  dialoguePage: 0 | 1 | 2 | 3 | 4;
  /** Accepted edge which opened the current dialogue page. */
  dialoguePageEdgeElapsed: number | null;
  /** MSGBOX_YESNO cursor; null until the swap menu is visibly created. */
  swapCursorPos: 0 | 1 | null;
  /** Cursor copied to the field window one VBlank after the logical move. */
  swapCursorDisplayPos: 0 | 1 | null;
  /** Accepted swap-cursor edge, used for the one-VBlank display handoff. */
  swapCursorMoveElapsed: number | null;
  /** Accepted NO edge; the following field-message clock is edge-relative. */
  swapDeclineElapsed: number | null;
  /**
   * RECORD/RETIRE question phase. `edgeElapsed` is the accepted selection
   * A edge (this state's relative elapsed clock, matching the oracle's
   * canonical select tick). Non-null only while a question is active;
   * after the dismiss it stays non-null until the re-ask re-enters the
   * continuation menu. See docs/postwin-record-retire-ground-truth.md §5.
   */
  question: { kind: PostwinQuestionKind; edgeElapsed: number } | null;
  /** YES/NO window cursor: 0 = YES, 1 = NO (the multichoicedefault). */
  questionCursorPos: 0 | 1;
  /** Cursor copied to the field window one VBlank after the logical move. */
  questionCursorDisplayPos: 0 | 1;
  /** Accepted question-cursor move edge (this state's relative clock). */
  questionCursorMoveElapsed: number | null;
  /**
   * Accepted A-on-YES edge for the active question (edge-relative, same
   * canonical-edge convention as `questionDismissElapsed`). Non-null only
   * while a question is active and resolved YES; RECORD types the recorded
   * message, RETIRE warps to the Lobby LOSS flow.
   */
  questionYesElapsed: number | null;
  /** Accepted dismiss-A edge for the active question (default NO), edge-relative. */
  questionDismissElapsed: number | null;
  /** Cursor copied to the field window one VBlank after the logical move. */
  continuationCursorDisplayPos: 0 | 1 | 2 | 3 | null;
  /** Accepted continuation-cursor edge, used for the one-VBlank display handoff. */
  continuationCursorMoveElapsed: number | null;
  /**
   * `frontier.disableRecordBattle` session flag
   * (docs/postwin-record-retire-ground-truth.md §7a): `SaveRecordBattle`
   * sets it on every successful RECORD save, and the next re-asked
   * continuation menu drops the RECORD entry (the 3-option
   * GO ON / REST / RETIRE variant). The ROM clears it at the next battle
   * start; a fresh `createPostwinState*` (one per battle) already does so.
   */
  disableRecordBattle: boolean;
  /**
   * Accepted dismiss-A edge for the RECORD-YES "{PLAYER}'s battle was
   * recorded" message (canonical, edge-relative). The re-ask that follows
   * resolves back to the continuation menu via the same
   * `POSTWIN_QUESTION_*` reprint schedule as the NO dismiss.
   */
  recordedMessageDismissElapsed: number | null;
  /** Accepted "Right this way" dismiss edge; walk/warp clocks derive from it. */
  rightThisWayDismissElapsed: number | null;
  /**
   * True when `round.rules.currentOpponent.frontierBrain` was set at
   * creation (walk-up build step A, `docs/walkup-step-a-design.md` Brief 1).
   * Selects the call-scene + `AskReadyForHead` branch below in place of the
   * ordinary route's direct heal -> continuation-menu fall-through; the
   * continuation-menu machinery itself (`continuationCursorPos`,
   * `acceptPostwinContinuation`, RECORD/REST/RETIRE) is reused unchanged.
   * Always false on every existing construction path (`createPostwinState`,
   * `createBattleReturnHoldState`) so the ordinary flow stays byte-identical.
   */
  frontierBrain: boolean;
  /** lbw7: ticks the post-battle black / room / black tail runs ahead of the WIN-measured boundaries (forfeit: 1, one black tick shorter on the ROM). Absent = 0. */
  tailLead?: number;
  /**
   * Brain-only call-scene box index: 0 = inactive (ordinary path, or the
   * brain path before the heal-dismiss box-clear boundary), 1-5 = the five
   * JSON-sourced boxes (`CALL_SCENE_BOX_TEXTS`: "wait a few moments" /
   * "understood, sir" / boss-message pages 1-3). Mirrors `dialoguePage`'s
   * own index convention. Unused (stays 0) when `frontierBrain` is false.
   */
  callScenePage: 0 | 1 | 2 | 3 | 4 | 5;
  /**
   * Accepted edge that opened the CURRENT call-scene box. Box 1 is armed
   * directly off `healDismissElapsed` (see `advancePostwin`); boxes 2-5 are
   * armed at the prior box's accepted A edge, mirroring
   * `dialoguePageEdgeElapsed`.
   */
  callScenePageEdgeElapsed: number | null;
  /**
   * Walk-up build step A follow-on: the accepted dismiss-A of boxes 1/2,
   * pending the attendant's own walk-away/walk-back movement -- the CURRENT
   * box (`callScenePage`/`callScenePageEdgeElapsed`) stays put and keeps
   * rendering its already-fully-typed content (matching the ground-truth
   * doc's own "box 1 held" span after its dismiss-A) until `advancePostwin`
   * performs the deferred bump once `elapsed` reaches this value, mirroring
   * box 1's own `healDismissElapsed`-armed deferred activation. Null outside
   * a pending box-1/2 transition (always null on every other box turn,
   * which stays instant).
   */
  callScenePendingElapsed: number | null;
  /**
   * Accepted dismiss edge of the call scene's last box (box 5) -- starts
   * the `AskReadyForHead` prompt's own clock, mirroring `swapDeclineElapsed`
   * 's role for the ordinary route's "Right this way" text.
   */
  callSceneDismissElapsed: number | null;
  /**
   * Battle Scene OFF only (docs/post-terminal-return-to-lobby-ground-truth.md
   * §3): a frozen snapshot of the terminal message's own last rendered scene,
   * held then BeginFastPaletteFade(3)'d to black by the shared battleHold/
   * battleFade phases below. `state.battleScene` (Turn17 canonical's own
   * equivalent) is always null on this route, so this is its OFF-profile
   * stand-in. Null on the canonical Turn17 route, which has real
   * `battleScene` state instead.
   */
  frozenSceneView: BattleResolutionPresentationRenderView | null;
}

/** gMain.inBattle clears and outside-battle VBlank RNG resumes at dismiss+43. */
export const POSTWIN_IN_BATTLE_CLEAR_AGE = 43;

/** Visual boundaries, all inclusive at their start age. */
export const POSTWIN_BATTLE_FADE_FIRST_AGE = 7;
export const POSTWIN_BATTLE_BLACK_AGE = 37;
export const POSTWIN_BATTLE_ROOM_FIRST_AGE = 57;
export const POSTWIN_BATTLE_ROOM_FADE_OUT_AGE = 81;
export const POSTWIN_SECOND_BLACK_AGE = 96;
export const POSTWIN_COUNTER_ROOM_FIRST_AGE = 115;
export const POSTWIN_COUNTER_ROOM_SETTLED_AGE = 130;
export const POSTWIN_HEAL_BOX_AGE = 139;
export const POSTWIN_HEAL_TEXT_FIRST_AGE = 140;

export const POSTWIN_HEAL_LINE1 = "Thank you for competing!";
export const POSTWIN_HEAL_LINE2 = "Let us restore your POKéMON!";
export const POSTWIN_HEAL_TEXT_TOTAL =
  POSTWIN_HEAL_LINE1.length + POSTWIN_HEAL_LINE2.length;
export const POSTWIN_HEAL_TEXT_SETTLED_AGE =
  POSTWIN_HEAL_TEXT_FIRST_AGE + POSTWIN_HEAL_TEXT_TOTAL - 1;
/** Earliest A accepted by MSGBOX_DEFAULT: 23796, dismiss+194. */
export const POSTWIN_HEAL_INPUT_READY_AGE = 194;

/** Script-relative schedule after the accepted heal-message A edge. */
export const POSTWIN_PARTY_HEAL_DELAY = 163;
export const POSTWIN_NEXT_BOX_CLEAR_DELAY = 166;
export const POSTWIN_NEXT_TEXT_FIRST_DELAY = 167;
export const POSTWIN_NEXT_TEXT_SETTLED_DELAY = 202;
export const POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY = 206;
export const POSTWIN_CONTINUATION_INPUT_READY_DELAY = 207;
export const POSTWIN_HEALED_PARTY_HP = [117, 138, 153] as const;
/** The battle-1 anchor's prompt (ReadyFor2ndOpponent); later matches pick their own line (`postwinNextLine1`). */
export const POSTWIN_NEXT_LINE1 = "The 2nd match is next!";
export const POSTWIN_NEXT_LINE2 = "Are you ready?";
export const POSTWIN_NEXT_TEXT_TOTAL =
  POSTWIN_NEXT_LINE1.length + POSTWIN_NEXT_LINE2.length;

/**
 * pmn238: AskReadyForRegularOpponent (data/maps/BattleFrontier_BattleFactoryPreBattleRoom/
 * scripts.inc:82-89) reads FRONTIER_DATA_BATTLE_NUM -- the wins so far, 1..6 -- and calls
 * ReadyFor2ndOpponent .. ReadyFor7thOpponent (:460-482): "The Nth match is next!" with the
 * ordinary ordinals, and "Finally, the 7th match is next!" before the last one; line 2 is
 * always "Are you ready?". The Frontier Brain's AskReadyForHead is chosen before this by
 * frontier_getbrainstatus and keeps its own text (`CALL_SCENE_HEAD_PROMPT_*`). The
 * RECORD / RETIRE NO branch falls back through AskReadyForOpponent, so the reprint uses
 * the same line. The script reads the counter AFTER the postwin's own bookkeeping write
 * (`challengeBattleNumAfterWrite` = SaveBlock2.frontier.curChallengeBattleNum once this win
 * is counted: 1 after the first win, 6 after the sixth), so the next match is that + 1
 * (2..7). The generated route's snapshot already holds the counted value in both fields;
 * only the "after write" one is the ROM's at the time of the read.
 */
export function postwinNextLine1(nextMatch: number): string {
  if (nextMatch === 7) return "Finally, the 7th match is next!";
  const ordinal = nextMatch === 2 ? "2nd" : nextMatch === 3 ? "3rd" : `${nextMatch}th`;
  return `The ${ordinal} match is next!`;
}

export function postwinNextMatch(state: Pick<PostwinState, "challengeBattleNumAfterWrite">): number {
  return state.challengeBattleNumAfterWrite + 1;
}

export function postwinNextLines(state: Pick<PostwinState, "challengeBattleNumAfterWrite">): readonly [string, string] {
  return [postwinNextLine1(postwinNextMatch(state)), POSTWIN_NEXT_LINE2];
}

export function postwinNextTextTotal(state: Pick<PostwinState, "challengeBattleNumAfterWrite">): number {
  const [line1, line2] = postwinNextLines(state);
  return line1.length + line2.length;
}

/**
 * The prompt's settled / continuation-menu-visible / input-ready delays after the heal dismiss,
 * derived from the chosen line the way the 2nd-match constants were fit (202 = 167 + 36 - 1;
 * 206 = settled + 4; 207 = settled + 5): identical for matches 2-6 (36 glyphs), 9 later for
 * the 7th (45 glyphs).
 */
export function postwinNextTextSettledDelay(state: Pick<PostwinState, "challengeBattleNumAfterWrite">): number {
  return POSTWIN_NEXT_TEXT_FIRST_DELAY + postwinNextTextTotal(state) - 1;
}

export function postwinContinuationMenuVisibleDelay(state: Pick<PostwinState, "challengeBattleNumAfterWrite">): number {
  return postwinNextTextSettledDelay(state) + (POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY - POSTWIN_NEXT_TEXT_SETTLED_DELAY);
}

export function postwinContinuationInputReadyDelay(state: Pick<PostwinState, "challengeBattleNumAfterWrite">): number {
  return postwinNextTextSettledDelay(state) + (POSTWIN_CONTINUATION_INPUT_READY_DELAY - POSTWIN_NEXT_TEXT_SETTLED_DELAY);
}

export const POSTWIN_DIALOGUE_TEXT_FIRST_DELAY = 4;
export const POSTWIN_DIALOGUE_OLD_TEXT_END_DELAY = 2;
export const POSTWIN_DIALOGUE_BLANK_DELAY = 3;

// Walk-up build step A, Brief 1 (docs/walkup-step-a-design.md): the brain
// call-scene + AskReadyForHead menu text, pulled directly from
// factory-brain-walkup-script.json rather than retyped (its own extraction
// is source-pinned by tests/factoryBrainWalkupScript.test.ts). Per-box
// timing reuses this file's own established MSGBOX_DEFAULT conventions
// (first-glyph delay, 1 tick/char, +2-after-settle accept-ready) rather than
// inventing new magic numbers -- structural defaults, NOT independently
// oracle-measured for this specific window (no oracle evidence exists yet
// for the brain call-scene, docs/walkup-step-a-design.md §4; dense
// calibration is a later step -- same reuse discipline battleRoom.ts's own
// brain-speech box queue already documents for its own unmeasured window).
type WalkupMessageEvent = Readonly<{
  kind: string;
  pages?: readonly string[];
  nonBrainSpecific?: boolean;
  frames?: number;
}>;
const callSceneEvents =
  walkupScript.scenes.preBattleRoomCallScene.events as readonly WalkupMessageEvent[];
const callSceneMessageEvents = callSceneEvents.filter(
  (event): event is Readonly<{ kind: string; pages: readonly string[] }> =>
    event.kind === "message" && !event.nonBrainSpecific,
);
// The extraction JSON preserves source spelling with a plain ASCII
// apostrophe; the font's own apostrophe glyph is the localized right-single-
// quote character (same normalization battleRoom.ts's splitSpeechBoxes /
// factoryTrainerPresentation.ts's displayEasyChatWord already apply).
function normalizeCallSceneApostrophe(text: string): string {
  return text.replaceAll("'", "’");
}
function splitCallSceneBoxLines(page: string): readonly [string, string] {
  const [line1, line2] = page.split("\\n") as [string, string];
  return [normalizeCallSceneApostrophe(line1), normalizeCallSceneApostrophe(line2)];
}
/** The five call-scene boxes in order: "wait a few moments" / "understood, sir" / boss-message pages 1-3. */
export const CALL_SCENE_BOX_TEXTS: readonly (readonly [string, string])[] =
  callSceneMessageEvents.flatMap((event) => event.pages.map(splitCallSceneBoxLines));
/** `EventScript_ReturnToRoomFromBattle`'s trailing `delay 16` (scripts.inc:54-77), between the boss message closing and `AskReadyForHead`'s own prompt. */
export const CALL_SCENE_TRAILING_DELAY = callSceneEvents.at(-1)!.frames!;

const [CALL_SCENE_HEAD_PROMPT_LINE1, CALL_SCENE_HEAD_PROMPT_LINE2] = splitCallSceneBoxLines(
  (walkupScript.scenes.askReadyForHead.events[0] as WalkupMessageEvent).pages![0]!,
);
export { CALL_SCENE_HEAD_PROMPT_LINE1, CALL_SCENE_HEAD_PROMPT_LINE2 };
export const CALL_SCENE_HEAD_PROMPT_TOTAL =
  CALL_SCENE_HEAD_PROMPT_LINE1.length + CALL_SCENE_HEAD_PROMPT_LINE2.length;

// Walk-up build step A, Brief 2 (docs/walkup-step-a-design.md §2.1 item 3):
// `AskSwapBeforeHead`'s one-liner, pulled from the same JSON as the call
// scene/prompt above rather than retyped. Brain's post-GO ON path shows
// this single box in place of the three ordinary scouting pages
// (`dialoguePage` 1-3 have no brain analogue at all -- see the short-path
// wiring on `postwinDialogueVisibleChars`/`acceptPostwinDialoguePage` below).
const [POSTWIN_BRAIN_CANT_TELL_LINE1, POSTWIN_BRAIN_CANT_TELL_LINE2] = splitCallSceneBoxLines(
  (walkupScript.scenes.askSwapBeforeHead.events[0] as WalkupMessageEvent).pages![0]!,
);
export const POSTWIN_BRAIN_CANT_TELL_TEXT: readonly [string, string] =
  [POSTWIN_BRAIN_CANT_TELL_LINE1, POSTWIN_BRAIN_CANT_TELL_LINE2];
export const POSTWIN_BRAIN_CANT_TELL_TEXT_TOTAL =
  POSTWIN_BRAIN_CANT_TELL_LINE1.length + POSTWIN_BRAIN_CANT_TELL_LINE2.length;
/**
 * `AskSwapBeforeHead`'s one-liner accept-ready delay: same structural
 * "first-glyph +4, then +2-after-settle" MSGBOX_DEFAULT convention as the
 * call-scene boxes (`postwinCallSceneInputReady`), not an oracle-measured
 * tick. docs/walkup-call-scene-ground-truth.md's Window 3 confirms this box
 * types out over exactly this text's char count then holds well past any
 * plausible accept boundary before the fixture's own dismiss press, but
 * that fixture used a generous margin (not a tight accept-boundary probe),
 * so this constant is evidence-aligned-not-calibrated, same honesty label
 * Brief 1 already applied to the call-scene boxes.
 */
export const POSTWIN_BRAIN_CANT_TELL_INPUT_READY_DELAY =
  POSTWIN_DIALOGUE_TEXT_FIRST_DELAY + POSTWIN_BRAIN_CANT_TELL_TEXT_TOTAL + 1;

/**
 * Ticks the just-arrived box's own frame graphic stays hidden past its edge
 * before it visibly reopens (index 0 = box 2, after the walk-away; index 1 =
 * box 3, after the walk-back) -- both boxes fully `closemessage`d before
 * their `applymovement` (scripts.inc:66/70), unlike every other box turn in
 * this file, which reuses an already-open box (no closemessage between
 * them) and so has no such gap. MEASURED (fixture 01: box 2's frame
 * reappears oracle frame 954, edge 951, gap 3; fixture 02: box 3's frame
 * reappears oracle frame 1089, edge 1085, gap 4).
 */
const CALL_SCENE_BOX_REOPEN_LAG: readonly [number, number] = [3, 4];

/**
 * Extra tick every call-scene box inherits relative to the ordinary route's
 * own post-heal schedule: the brain branch runs one script command pair the
 * ordinary branch does not (`playse SE_POKENAV_CALL; waitse`, the JSON's own
 * event right after `frontier_getbrainstatus`) before its first `message`.
 * MEASURED +1 on fixture 01 (oracle: heal text still up at 828, box clears
 * empty at 829, first glyph 830, fully typed 894 -- the app's own
 * `POSTWIN_NEXT_*` schedule lands each of those one tick early).
 */
const CALL_SCENE_BRAIN_BRANCH_LAG = 1;
export { CALL_SCENE_BRAIN_BRANCH_LAG };

/**
 * Whether each call-scene box is a non-final page of its own source message
 * (i.e. the printer stops on `\p`/`CHAR_PROMPT_CLEAR` rather than `$`/EOS).
 * Derived structurally from the JSON's own per-event `pages` split, never
 * hardcoded: only the boss message (`Text_MessageFromHeadComeRightNow`) is
 * multi-page, so this is [false, false, true, true, false].
 *
 * The distinction is load-bearing twice over (`text.c`):
 * - `CHAR_PROMPT_CLEAR` is consumed by one whole `RENDER_STATE_HANDLE_CHAR`
 *   frame that returns `RENDER_UPDATE`, and only the frame after it enters
 *   `RENDER_STATE_CLEAR`, where `TextPrinterWaitWithDownArrow` first polls
 *   `JOY_NEW(A|B)`. `$`/EOS instead returns `RENDER_FINISH` immediately, so
 *   `waitmessage` releases and the script's own `waitbuttonpress` polls one
 *   tick after the last glyph. Hence the `+1` in the accept delay below.
 * - `TextPrinterWaitWithDownArrow` also draws the bobbing down arrow every
 *   frame it waits; `waitbuttonpress` does not (`postwinCallSceneWaitArrow`).
 */
const CALL_SCENE_BOX_PROMPT_PAGE: readonly boolean[] =
  callSceneMessageEvents.flatMap((event) =>
    event.pages.map((_page, index) => index < event.pages.length - 1),
  );

/** Boxes that fully `closemessage`+reopen before their own content (see `CALL_SCENE_BOX_REOPEN_LAG`'s doc) -- their arrival is never a `\p` continuation, whatever precedes them. */
const CALL_SCENE_REOPENED_PAGES: readonly number[] = [2, 3];

/**
 * True when `page`'s own arrival is a LATER `\p` transition continuing an
 * already-open run -- its source box (`page - 1`) was itself `\p`-arrived,
 * not freshly (re)opened -- as opposed to a run's FIRST `\p` transition.
 * Derived structurally from `CALL_SCENE_BOX_PROMPT_PAGE` (does the source
 * end in `\p`?) and `CALL_SCENE_REOPENED_PAGES` (was the source itself a
 * reopen, i.e. not a `\p` arrival?) -- not a page-number branch. Box 4's
 * source (box 3) is a reopen, so box 4 = first `\p` in its run. Box 5's
 * source (box 4) is itself `\p`-arrived and not a reopen, so box 5 =
 * continuing the same run. See `CALL_SCENE_TEXT_FIRST_DELAYS`' own doc for
 * the oracle evidence this asymmetry is built on.
 */
function callSceneIsLaterPromptArrival(page: 2 | 3 | 4 | 5): boolean {
  if (CALL_SCENE_REOPENED_PAGES.includes(page)) return false;
  const sourcePage = page - 1;
  if (!CALL_SCENE_BOX_PROMPT_PAGE[sourcePage - 1]) return false;
  return !CALL_SCENE_REOPENED_PAGES.includes(sourcePage);
}

/**
 * Per-box first-glyph delay, relative to the box's own edge.
 * - Box 1's edge is `healDismissElapsed`, so it reuses the ordinary route's
 *   own post-heal `POSTWIN_NEXT_TEXT_FIRST_DELAY` plus the brain branch's
 *   own extra `playse/waitse` tick (`CALL_SCENE_BRAIN_BRANCH_LAG`).
 * - Boxes 2/3 arrive after a `closemessage` + `applymovement`, so their own
 *   window is reopened from scratch: the first glyph lands exactly one tick
 *   after the box frame itself reappears (`CALL_SCENE_BOX_REOPEN_LAG`),
 *   MEASURED on both fixtures (box 2 frame 954 / glyph 955 = edge+4; box 3
 *   frame 1089 / glyph 1090 = edge+5). Box 2's value coincides with the
 *   generic `POSTWIN_DIALOGUE_TEXT_FIRST_DELAY` it used before; box 3's is
 *   one tick later, which that shared constant could not express.
 * - Boxes 4/5 are `\p` page turns inside one already-open message: their own
 *   edge is the 1-tick-deferred bump (`CALL_SCENE_PAGE_TRANSITION_DELAY[2]`/
 *   `[3]`, see that constant's doc). Box 4 is this window's FIRST `\p`
 *   transition (its source, box 3, was freshly reopened, not `\p`-arrived):
 *   the first glyph lands right on the edge itself, firstDelay 0 (PROGRESS
 *   1293: the generic MSGBOX_DEFAULT value produced a several-tick-too-long
 *   blank box after each page turn). Box 5 is the SAME window's SECOND `\p`
 *   transition (its source, box 4, WAS itself `\p`-arrived) and MEASURED one
 *   tick slower: a genuine cleared (0-char) frame precedes its first glyph,
 *   so firstDelay 1, not 0 -- direct oracle PNG diff, this step: local 813
 *   (box 4, fully typed, still held) -> 814 (cleared box, no text at all) ->
 *   816 (2 chars already printed, so 815 is the first-glyph tick). This is
 *   the mirror image of noland-brain-intro-gold-ground-truth.md's §9‴
 *   finding (there, a window's FIRST `\p` needs the extra clear tick and
 *   LATER ones don't); here the window's SECOND `\p` needs it. The two
 *   windows are proven NOT the same engine-model class (§9‴'s fix,
 *   `battleRoomAcceptedState`'s shared `brainSpeechIdle`->`brainSpeech`
 *   accept/print model, is untouched by this box 4/5 asymmetry and vice
 *   versa) -- see `callSceneIsLaterPromptArrival`'s own doc for the
 *   structural (not page-number-hardcoded) derivation.
 */
const CALL_SCENE_TEXT_FIRST_DELAYS: readonly number[] = [
  POSTWIN_NEXT_TEXT_FIRST_DELAY + CALL_SCENE_BRAIN_BRANCH_LAG,
  CALL_SCENE_BOX_REOPEN_LAG[0] + 1,
  CALL_SCENE_BOX_REOPEN_LAG[1] + 1,
  0,
  callSceneIsLaterPromptArrival(5) ? 1 : 0,
];

function callSceneBoxTotal(page: 1 | 2 | 3 | 4 | 5): number {
  const [line1, line2] = CALL_SCENE_BOX_TEXTS[page - 1]!;
  return line1.length + line2.length;
}

/**
 * `AskReadyForHead`'s own prompt text-settle -> menu-appear/menu-ready
 * shape, reusing the exact same "+4 visible / +5 ready" convention
 * `POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY`/`POSTWIN_CONTINUATION_INPUT_
 * READY_DELAY` already derive from `POSTWIN_NEXT_TEXT_SETTLED_DELAY` for the
 * ordinary route's own menu (206 = settled(202)+4, 207 = settled+5) -- same
 * shape, computed from this prompt's own (JSON-exact) character count
 * instead of a re-guessed absolute tick.
 */
const CALL_SCENE_HEAD_PROMPT_SETTLED_DELAY =
  POSTWIN_DIALOGUE_TEXT_FIRST_DELAY + CALL_SCENE_HEAD_PROMPT_TOTAL - 1;
export const CALL_SCENE_HEAD_MENU_VISIBLE_DELAY = CALL_SCENE_HEAD_PROMPT_SETTLED_DELAY + 4;
export const CALL_SCENE_HEAD_MENU_READY_DELAY = CALL_SCENE_HEAD_PROMPT_SETTLED_DELAY + 5;

const POSTWIN_SCOUTING_INTRO =
  ["I’ve conducted a little investigation", "about your upcoming opponent."] as const;
const POSTWIN_SCOUTING_SWAP_OFFER =
  ["Before starting the battle, would you", "like to swap a POKéMON?"] as const;
const CANONICAL_POSTWIN_OPPONENT_PARTY = createFactoryCorpusParty([
  { setId: 153, personality: 24, fixedIv: 3, abilitySlot: 0 },
  { setId: 179, personality: 19, fixedIv: 3, abilitySlot: 1 },
  { setId: 181, personality: 6, fixedIv: 3, abilitySlot: 0 },
]);

export function createPostwinScoutingLines(
  opponentParty: FactoryCommentaryParty,
): PostwinScoutingLines {
  const commentary = getFactoryOpponentCommentary(opponentParty);
  if (commentary.favoriteTypeLines === null) {
    throw new Error("Factory opponent has no favorite-type commentary branch");
  }
  return [
    POSTWIN_SCOUTING_INTRO,
    commentary.favoriteTypeLines,
    commentary.battleStyleLines,
    POSTWIN_SCOUTING_SWAP_OFFER,
  ];
}

export const POSTWIN_SCOUTING_LINES =
  createPostwinScoutingLines(CANONICAL_POSTWIN_OPPONENT_PARTY);

type PostwinSnapshot = Readonly<{
  challengeBattleNum: BattleIndex;
  challengeBattleNumAfterWrite: BattleIndex;
  opponentRentalMonIds: readonly [number, number, number];
  opponentRentalMonIdsAfterWrite: readonly [number, number, number];
  opponentParty: FactoryCommentaryParty;
  playerPartyHp: readonly [number, number, number];
  healedPlayerPartyHp: readonly [number, number, number];
}>;

const CANONICAL_POSTWIN_SNAPSHOT: PostwinSnapshot = Object.freeze({
  challengeBattleNum: 0,
  challengeBattleNumAfterWrite: 1,
  opponentRentalMonIds: [153, 179, 181] as const,
  opponentRentalMonIdsAfterWrite: [188, 184, 135] as const,
  opponentParty: CANONICAL_POSTWIN_OPPONENT_PARTY,
  playerPartyHp: [0, 27, 153] as const,
  healedPlayerPartyHp: [117, 138, 153] as const,
});

function createPostwinStateFromSnapshot(
  snapshot: PostwinSnapshot,
): PostwinState {
  return {
    elapsed: 0,
    challengeBattleNum: snapshot.challengeBattleNum,
    challengeBattleNumAfterWrite: snapshot.challengeBattleNumAfterWrite,
    opponentRentalMonIds: snapshot.opponentRentalMonIds,
    opponentRentalMonIdsAfterWrite: snapshot.opponentRentalMonIdsAfterWrite,
    scoutingLines: createPostwinScoutingLines(snapshot.opponentParty),
    healDismissElapsed: null,
    playerPartyHp: snapshot.playerPartyHp,
    healedPlayerPartyHp: snapshot.healedPlayerPartyHp,
    continuationCursorPos: null,
    continuationConfirmElapsed: null,
    dialoguePage: 0,
    dialoguePageEdgeElapsed: null,
    swapCursorPos: null,
    swapCursorDisplayPos: null,
    swapCursorMoveElapsed: null,
    swapDeclineElapsed: null,
    question: null,
    questionCursorPos: 1,
    questionCursorDisplayPos: 1,
    questionCursorMoveElapsed: null,
    questionYesElapsed: null,
    questionDismissElapsed: null,
    continuationCursorDisplayPos: null,
    continuationCursorMoveElapsed: null,
    disableRecordBattle: false,
    recordedMessageDismissElapsed: null,
    rightThisWayDismissElapsed: null,
    frontierBrain: false,
    callScenePage: 0,
    callScenePageEdgeElapsed: null,
    callScenePendingElapsed: null,
    callSceneDismissElapsed: null,
    frozenSceneView: null,
  };
}

export function createPostwinState(
  opponentParty: FactoryCommentaryParty = CANONICAL_POSTWIN_OPPONENT_PARTY,
): PostwinState {
  return createPostwinStateFromSnapshot({
    ...CANONICAL_POSTWIN_SNAPSHOT,
    opponentParty,
  });
}

/**
 * Presentation-boundary adapter for the source rental records owned by the
 * round controller and dev-time app stages.
 */
export function createPostwinStateFromOpponentRentalRecords(
  opponentRentalRecords: FactoryPostwinOpponentRentalRecords,
): PostwinState {
  return createPostwinState(createFactoryCorpusParty(opponentRentalRecords));
}

function partyHp(
  party: BattleParty,
  field: "hp" | "maxHp",
): readonly [number, number, number] {
  return party.map((member) => member[field]) as unknown as readonly [
    number,
    number,
    number,
  ];
}

function sameBattlePartySnapshot(
  actual: BattleParty,
  expected: BattleParty,
): boolean {
  return actual.every((member, index) => {
    const other = expected[index]!;
    return member.id === other.id
      && member.species === other.species
      && member.hp === other.hp
      && member.maxHp === other.maxHp
      && member.status === other.status;
  });
}

/**
 * Battle Scene OFF's `finishBattle` handoff completes one tick later
 * (relative to its own real dismiss edge) than the canonical Turn17 route's
 * own handoff does relative to ITS dismiss edge -- a two-tick real dismiss
 * press (this route) vs. Turn17's one-tick press, both oracle-confirmed
 * (docs/post-terminal-return-to-lobby-ground-truth.md §3;
 * docs/terminal-seam-win-window-probe.md §5's own citation of the two-tick
 * press). Starting this route's own `elapsed` clock at 1 (not 0, the
 * canonical route's own start value) re-aligns it to the exact same
 * `postwinPhase`/`POSTWIN_*_AGE` boundaries Turn17 already pins, with no
 * changes to those shared constants themselves.
 */
const GENERATED_ROUTE_INITIAL_ELAPSED = 1;

/**
 * Generated-route adapter. The pending battleWon command and retained
 * last-battle snapshot are the presentation boundary; all mutable-looking
 * rows are frozen from that same typed round before postwin clocks begin.
 */
export function createPostwinStateFromRound(
  round: RoundControllerState,
  frozenSceneView: BattleResolutionPresentationRenderView | null,
): PostwinState {
  const pending = round.presentation;
  const lastBattle = round.rules.lastBattle;
  const opponentRentalRecords =
    round.rules.currentOpponent.rentalRecords;
  if (
    pending?.command.type !== "battleWon"
    || pending.completed
    || round.rules.phase !== "presentingBattleWin"
    || lastBattle?.outcome !== "win"
    || opponentRentalRecords === undefined
  ) {
    throw new Error(
      "generated postwin requires an uncompleted battleWon with a full win snapshot",
    );
  }
  if (
    pending.command.battleIndex !== round.rules.battleIndex
    || !sameBattlePartySnapshot(
      pending.command.playerParty,
      lastBattle.playerParty,
    )
    || !sameBattlePartySnapshot(
      pending.command.opponentParty,
      lastBattle.opponentParty,
    )
  ) {
    throw new Error(
      "generated postwin battleWon does not match the retained battle snapshot",
    );
  }
  const nextBattleIndex = round.rules.battleIndex + 1;
  if (nextBattleIndex > 6) {
    throw new Error("a seventh win has no postwin swap offer");
  }
  const opponentRentalMonIds = opponentRentalRecords.map(
    ({ setId }) => setId,
  ) as unknown as readonly [number, number, number];
  return {
    ...createPostwinStateFromSnapshot({
      challengeBattleNum: round.rules.battleIndex,
      challengeBattleNumAfterWrite: nextBattleIndex as BattleIndex,
      opponentRentalMonIds,
      opponentRentalMonIdsAfterWrite: opponentRentalMonIds,
      opponentParty: createFactoryCorpusParty(opponentRentalRecords),
      playerPartyHp: partyHp(lastBattle.playerParty, "hp"),
      healedPlayerPartyHp: partyHp(lastBattle.playerParty, "maxHp"),
    }),
    elapsed: GENERATED_ROUTE_INITIAL_ELAPSED,
    // Walk-up build step A (docs/walkup-step-a-design.md §2.2): presence of
    // the UPCOMING opponent's `frontierBrain` alone selects the call-scene +
    // AskReadyForHead branch; the `.status` tier is not needed by this step.
    frontierBrain: round.rules.currentOpponent.frontierBrain !== undefined,
    frozenSceneView,
  };
}

/**
 * Shared return-to-field adapter for the generated route's non-WIN terminal
 * outcomes (roundLost; a terminal 7th-battle roundCompleted also warps to
 * the Lobby per docs/post-terminal-return-to-lobby-ground-truth.md §3's own
 * note). dismiss+8..+115's fade/black/battle-room-flash/black sequence is
 * byte- and callback-identical to WIN's own (§3) -- this reuses the exact
 * same `PostwinState` phase machine and elapsed convention as
 * `createPostwinStateFromRound`; only the fields `postwinPhase`'s
 * "counterRoom" branch reads (scoutingLines, heal message, swap offer -- all
 * WIN-only content, out of this slice's dismiss+115 boundary) stay at inert
 * placeholder values, since a non-WIN outcome is never meant to reach them.
 */
export function createBattleReturnHoldState(
  frozenSceneView: BattleResolutionPresentationRenderView | null,
  tailLead = 0,
): PostwinState {
  return {
    ...(tailLead === 0 ? {} : { tailLead }),
    elapsed: GENERATED_ROUTE_INITIAL_ELAPSED,
    challengeBattleNum: 0,
    challengeBattleNumAfterWrite: 0,
    opponentRentalMonIds: [0, 0, 0],
    opponentRentalMonIdsAfterWrite: [0, 0, 0],
    scoutingLines: [["", ""], ["", ""], ["", ""], ["", ""]],
    healDismissElapsed: null,
    playerPartyHp: [0, 0, 0],
    healedPlayerPartyHp: [0, 0, 0],
    continuationCursorPos: null,
    continuationConfirmElapsed: null,
    dialoguePage: 0,
    dialoguePageEdgeElapsed: null,
    swapCursorPos: null,
    swapCursorDisplayPos: null,
    swapCursorMoveElapsed: null,
    swapDeclineElapsed: null,
    question: null,
    questionCursorPos: 1,
    questionCursorDisplayPos: 1,
    questionCursorMoveElapsed: null,
    questionYesElapsed: null,
    questionDismissElapsed: null,
    continuationCursorDisplayPos: null,
    continuationCursorMoveElapsed: null,
    disableRecordBattle: false,
    recordedMessageDismissElapsed: null,
    rightThisWayDismissElapsed: null,
    frontierBrain: false,
    callScenePage: 0,
    callScenePageEdgeElapsed: null,
    callScenePendingElapsed: null,
    callSceneDismissElapsed: null,
    frozenSceneView,
  };
}

export const INITIAL_POSTWIN_STATE = createPostwinState();
/** MSGBOX_DEFAULT: final glyph plus the source's three-frame WAIT handoff. */
export const POSTWIN_SCOUTING_INPUT_READY_DELAYS = [72, 74, 72] as const;
/** MSGBOX_YESNO: text settles at +63, menu copies at +66, accepts at +70. */
export const POSTWIN_SWAP_MENU_VISIBLE_DELAY = 66;
export const POSTWIN_SWAP_INPUT_READY_DELAY = 70;
export const POSTWIN_RIGHT_THIS_WAY = "Right this way, please!";
export const POSTWIN_RIGHT_THIS_WAY_TEXT_FIRST_DELAY = 4;
export const POSTWIN_RIGHT_THIS_WAY_TEXT_SETTLED_DELAY =
  POSTWIN_RIGHT_THIS_WAY_TEXT_FIRST_DELAY +
  POSTWIN_RIGHT_THIS_WAY.length - 1;
/** MSGBOX_DEFAULT accepts A two ticks after the final glyph. */
export const POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY =
  POSTWIN_RIGHT_THIS_WAY_TEXT_SETTLED_DELAY + 2;

// RECORD/RETIRE question phase (docs/postwin-record-retire-ground-truth.md
// §1-§2). All delays are relative to the canonical select tick (the oracle's
// own canonical tick numbers; the app's accept edge lands one tick later, so
// `beginPostwinQuestion` stores the canonical edge = its accept frame - 1,
// keeping these offsets verbatim from the ground-truth ledger).
/** First question glyph at select-edge + 5 (canonical). */
export const POSTWIN_QUESTION_TEXT_FIRST_DELAY = 5;
/** YES/NO multichoice window draws 3 ticks after the final glyph. */
export const POSTWIN_QUESTION_WINDOW_DELAY = 3;
/** Box clears 4 ticks after the accepted dismiss edge. */
export const POSTWIN_QUESTION_BOX_CLEAR_DELAY = 4;
/** "The 2nd match is next!" reprint first glyph, dismiss + 5. */
export const POSTWIN_QUESTION_REPRINT_FIRST_DELAY = 5;
/** Reprint settles (menu + 2nd-match message + wait cursor), dismiss + 40. */
export const POSTWIN_QUESTION_REPRINT_SETTLED_DELAY = 40;
/** Re-asked continuation menu input-ready, dismiss + 44. */
export const POSTWIN_QUESTION_MENU_READY_DELAY = 44;

export const POSTWIN_QUESTION_RECORD_TEXT: readonly [string, string] = [
  "Would you like to record your latest",
  "battle on your FRONTIER PASS?",
] as const;
export const POSTWIN_QUESTION_RETIRE_TEXT: readonly [string, string] = [
  "Would you like to retire from your",
  "Battle Swap challenge?",
] as const;
export const POSTWIN_QUESTION_TEXT_TOTAL: Readonly<Record<PostwinQuestionKind, number>> = {
  record:
    POSTWIN_QUESTION_RECORD_TEXT[0].length +
    POSTWIN_QUESTION_RECORD_TEXT[1].length,
  retire:
    POSTWIN_QUESTION_RETIRE_TEXT[0].length +
    POSTWIN_QUESTION_RETIRE_TEXT[1].length,
};
/** Canonical last-glyph edge-offset per kind (record: +69, retire: +60). */
export const POSTWIN_QUESTION_LAST_GLYPH_DELAY: Readonly<Record<PostwinQuestionKind, number>> = {
  record: POSTWIN_QUESTION_TEXT_FIRST_DELAY + POSTWIN_QUESTION_TEXT_TOTAL.record - 1,
  retire: POSTWIN_QUESTION_TEXT_FIRST_DELAY + POSTWIN_QUESTION_TEXT_TOTAL.retire - 1,
};
/** Canonical YES/NO window edge-offset per kind (record: +72, retire: +63). */
export const POSTWIN_QUESTION_WINDOW_DELAYS: Readonly<Record<PostwinQuestionKind, number>> = {
  record: POSTWIN_QUESTION_LAST_GLYPH_DELAY.record + POSTWIN_QUESTION_WINDOW_DELAY,
  retire: POSTWIN_QUESTION_LAST_GLYPH_DELAY.retire + POSTWIN_QUESTION_WINDOW_DELAY,
};

// A-on-YES clocks (docs/postwin-record-retire-ground-truth.md §3a + the
// banked up-a probes, canonical-edge-relative). All offsets are relative to
// the accepted A-on-YES canonical edge (`questionYesElapsed`).
/** YES/NO window clears this many ticks after the A-on-YES edge. */
export const POSTWIN_QUESTION_WINDOW_CLEAR_DELAY = 2;
/** RECORD: box clears at +23; the save-SE hold keeps the question up to then. */
export const POSTWIN_RECORDED_BOX_CLEAR_DELAY = 23;
export const POSTWIN_RECORDED_TEXT: readonly [string, string] = [
  `${PLAYER_NAME}\u2019s battle was recorded`,
  "on the FRONTIER PASS.",
] as const;
export const POSTWIN_RECORDED_TEXT_TOTAL =
  POSTWIN_RECORDED_TEXT[0].length + POSTWIN_RECORDED_TEXT[1].length;
/** RECORD: first "{PLAYER}'s battle was recorded" glyph at +24. */
export const POSTWIN_RECORDED_TEXT_FIRST_DELAY = 24;
/** RECORD: final glyph edge-offset (+72). */
export const POSTWIN_RECORDED_LAST_GLYPH_DELAY =
  POSTWIN_RECORDED_TEXT_FIRST_DELAY + POSTWIN_RECORDED_TEXT_TOTAL - 1;
/** RECORD-YES message is MSGBOX_DEFAULT: A accepted two ticks after the final glyph. */
export const POSTWIN_RECORDED_INPUT_READY_DELAY =
  POSTWIN_RECORDED_LAST_GLYPH_DELAY + 2;
/** RETIRE: fade-to-black first frame at +4 (the shared WARP_FADE_OUT start). */
export const POSTWIN_RETIRE_FADE_FIRST_DELAY = 4;
/** RETIRE: first fully-black frame at +19. */
export const POSTWIN_RETIRE_BLACK_AGE_DELAY = 19;
/** RETIRE: Lobby arrival fade-in first frame at +38. */
export const POSTWIN_RETIRE_FADE_IN_DELAY = 38;

// Exact write ages are filled by the dense RAM audit accompanying this
// slice. They remain relative state boundaries, never canonical ticks.
export const POSTWIN_CHALLENGE_BATTLE_WRITE_AGE = 79;
export const POSTWIN_OPPONENT_RENTALS_WRITE_AGE = 137;
export const POSTWIN_OPPONENT_RENTAL_IDS =
  [188, 184, 135] as const;

/** The age the post-battle tail boundaries are read at: unchanged through the black start, `tailLead` ticks ahead after it. */
export function postwinTailAge(age: number, tailLead: number | undefined): number {
  return age >= POSTWIN_BATTLE_BLACK_AGE ? age + (tailLead ?? 0) : age;
}

export function postwinPhase(age: number): PostwinPhase {
  if (age < POSTWIN_BATTLE_FADE_FIRST_AGE) return "battleHold";
  if (age < POSTWIN_BATTLE_BLACK_AGE) return "battleFade";
  if (age < POSTWIN_BATTLE_ROOM_FIRST_AGE) return "blackAfterBattle";
  if (age < POSTWIN_SECOND_BLACK_AGE) return "battleRoom";
  if (age < POSTWIN_COUNTER_ROOM_FIRST_AGE) return "blackBeforeCounter";
  return "counterRoom";
}

/** Number of LCG calls made while advancing into this relative age. */
export function postwinRngSteps(
  age: number,
  continuationConfirmElapsed: number | null = null,
  rightThisWayDismissElapsed: number | null = null,
): number {
  if (age < POSTWIN_IN_BATTLE_CLEAR_AGE) return 0;
  // Baseline outside-battle VBlank call plus source-observed transition
  // bursts at 23645/23647/23648 and 23707/23708.
  if (age === 43 || age === 45) return 2;
  if (age === 46 || age === 105) return 3;
  if (age === 106) return 4;
  // `factory_getopponentintro`'s four on-demand draws occur one tick after
  // GO ON, on top of the ordinary outside-battle VBlank call.
  if (
    continuationConfirmElapsed !== null &&
    age === continuationConfirmElapsed + 1
  ) return 5;
  // Field warp/map-load init: two source-observed bursts, relative to the
  // accepted guide-message dismiss edge (ordinary VBlank call included).
  if (
    rightThisWayDismissElapsed !== null &&
    age === rightThisWayDismissElapsed + 109
  ) return 3;
  if (
    rightThisWayDismissElapsed !== null &&
    age === rightThisWayDismissElapsed + 110
  ) return 4;
  return 1;
}

export function postwinHealVisibleChars(age: number): number {
  if (age < POSTWIN_HEAL_TEXT_FIRST_AGE) return 0;
  return Math.min(
    POSTWIN_HEAL_TEXT_TOTAL,
    age - POSTWIN_HEAL_TEXT_FIRST_AGE + 1,
  );
}

export function postwinHealInputReady(age: number): boolean {
  return age >= POSTWIN_HEAL_INPUT_READY_AGE;
}

export function advancePostwin(state: PostwinState): PostwinState {
  const elapsed = state.elapsed + 1;
  const healed =
    state.healDismissElapsed !== null &&
    elapsed >= state.healDismissElapsed + POSTWIN_PARTY_HEAL_DELAY;
  // Walk-up build step A: the brain route's call-scene box 1 is armed at the
  // exact same post-heal boundary the ordinary route's own "next text"
  // starts typing at (`POSTWIN_NEXT_TEXT_FIRST_DELAY`) -- the JSON's own
  // `frontier_getbrainstatus` branch sits right there, before either route's
  // divergent content begins.
  const callSceneFirstBoxReady =
    state.frontierBrain &&
    state.callScenePage === 0 &&
    state.healDismissElapsed !== null &&
    elapsed >= state.healDismissElapsed + POSTWIN_NEXT_TEXT_FIRST_DELAY;
  // Walk-up build step A follow-on: boxes 1/2's deferred bump (see
  // `callScenePendingElapsed`'s own doc) fires once the attendant's
  // walk-away/walk-back movement has run its full course.
  const callScenePendingReady =
    state.callScenePendingElapsed !== null &&
    elapsed >= state.callScenePendingElapsed;
  // The AskReadyForHead prompt/menu becomes visible relative to the call
  // scene's own last-box dismiss edge (+ its trailing delay), never relative
  // to healDismissElapsed directly -- the ordinary route's fixed
  // POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY has no bearing on brain's much
  // longer call-scene content.
  const brainMenuBaseElapsed =
    state.callSceneDismissElapsed !== null
      ? state.callSceneDismissElapsed + CALL_SCENE_TRAILING_DELAY
      : null;
  const menuVisible = state.frontierBrain
    ? brainMenuBaseElapsed !== null &&
      elapsed >= brainMenuBaseElapsed + CALL_SCENE_HEAD_MENU_VISIBLE_DELAY
    : state.healDismissElapsed !== null &&
      elapsed >= state.healDismissElapsed + postwinContinuationMenuVisibleDelay(state);
  const swapMenuVisible =
    state.dialoguePage === 4 &&
    state.dialoguePageEdgeElapsed !== null &&
    elapsed >= state.dialoguePageEdgeElapsed + POSTWIN_SWAP_MENU_VISIBLE_DELAY;
  // The re-asked continuation menu after a RECORD/RETIRE question is a fresh
  // menu: cursor back on GO ON (ground-truth §1: re-asked menu byte-identical
  // to the original held menu, which sits on GO ON). The re-ask edge is the
  // NO dismiss OR the RECORD-YES recorded-message dismiss (§7b) -- both run
  // the same ReadyFor2ndOpponent reprint schedule.
  const reAskElapsed = postwinReaskElapsed(state);
  const reAskMenuReady =
    reAskElapsed !== null &&
    elapsed >= reAskElapsed + postwinQuestionReprintMenuReadyDelay(state);
  return {
    ...(state.tailLead === undefined ? {} : { tailLead: state.tailLead }),
    elapsed,
    challengeBattleNum:
      elapsed >= POSTWIN_CHALLENGE_BATTLE_WRITE_AGE
        ? state.challengeBattleNumAfterWrite
        : state.challengeBattleNum,
    challengeBattleNumAfterWrite: state.challengeBattleNumAfterWrite,
    opponentRentalMonIds:
      elapsed >= POSTWIN_OPPONENT_RENTALS_WRITE_AGE
        ? state.opponentRentalMonIdsAfterWrite
        : state.opponentRentalMonIds,
    opponentRentalMonIdsAfterWrite: state.opponentRentalMonIdsAfterWrite,
    scoutingLines: state.scoutingLines,
    healDismissElapsed: state.healDismissElapsed,
    playerPartyHp: healed ? state.healedPlayerPartyHp : state.playerPartyHp,
    healedPlayerPartyHp: state.healedPlayerPartyHp,
    continuationCursorPos:
      menuVisible && state.continuationCursorPos === null
        ? 0
        : reAskMenuReady
          ? 0
          : state.continuationCursorPos,
    continuationConfirmElapsed: state.continuationConfirmElapsed,
    dialoguePage: state.dialoguePage,
    dialoguePageEdgeElapsed: state.dialoguePageEdgeElapsed,
    swapCursorPos:
      swapMenuVisible && state.swapCursorPos === null
        ? 0
        : state.swapCursorPos,
    swapCursorDisplayPos:
      swapMenuVisible && state.swapCursorDisplayPos === null
        ? 0
        : state.swapCursorMoveElapsed !== null &&
            elapsed > state.swapCursorMoveElapsed
          ? state.swapCursorPos
          : state.swapCursorDisplayPos,
    swapCursorMoveElapsed: state.swapCursorMoveElapsed,
    swapDeclineElapsed: state.swapDeclineElapsed,
    // A declined RECORD/RETIRE (or a dismissed RECORD-success message)
    // returns through AskReadyForOpponent. Once that re-asked continuation
    // menu is input-ready, the old question no longer owns input: retaining
    // it makes core.tick permanently refuse the continuation branch.
    question: reAskMenuReady ? null : state.question,
    // One-VBlank display handoff for the YES/NO question cursor, mirroring
    // the continuation/swap cursors: the logical pos moves on the press
    // frame, the field window copies it one tick later (the oracle's
    // visible cursor swap is the press edge + 2; the app processes the
    // press one tick later, so the copy is `elapsed > edge`).
    questionCursorDisplayPos:
      reAskMenuReady
        ? 1
        : state.questionCursorMoveElapsed !== null &&
        elapsed > state.questionCursorMoveElapsed
        ? state.questionCursorPos
        : state.questionCursorDisplayPos,
    questionCursorPos:
      reAskMenuReady ? 1 : state.question !== null ? state.questionCursorPos : 1,
    questionCursorMoveElapsed:
      reAskMenuReady ? null : state.questionCursorMoveElapsed,
    questionYesElapsed: reAskMenuReady ? null : state.questionYesElapsed,
    questionDismissElapsed:
      reAskMenuReady ? null : state.questionDismissElapsed,
    disableRecordBattle: state.disableRecordBattle,
    recordedMessageDismissElapsed:
      reAskMenuReady ? null : state.recordedMessageDismissElapsed,
    // One-VBlank display handoff for the continuation-menu cursor, mirroring
    // the swap cursor: the logical pos moves on the press frame, the field
    // window copies it one tick later (docs/...-ground-truth.md §5).
    continuationCursorDisplayPos:
      menuVisible && state.continuationCursorDisplayPos === null
        ? 0
        : reAskMenuReady
          ? 0
          : state.continuationCursorMoveElapsed !== null &&
              elapsed > state.continuationCursorMoveElapsed
            ? state.continuationCursorPos
            : state.continuationCursorDisplayPos,
    continuationCursorMoveElapsed: state.continuationCursorMoveElapsed,
    rightThisWayDismissElapsed: state.rightThisWayDismissElapsed,
    frontierBrain: state.frontierBrain,
    callScenePage: callSceneFirstBoxReady
      ? 1
      : callScenePendingReady
        ? ((state.callScenePage + 1) as 2 | 3 | 4 | 5)
        : state.callScenePage,
    callScenePageEdgeElapsed: callSceneFirstBoxReady
      ? state.healDismissElapsed
      : callScenePendingReady
        ? state.callScenePendingElapsed
        : state.callScenePageEdgeElapsed,
    callScenePendingElapsed: callScenePendingReady ? null : state.callScenePendingElapsed,
    callSceneDismissElapsed: state.callSceneDismissElapsed,
    frozenSceneView: state.frozenSceneView,
  };
}

export function acceptPostwinHealDismiss(state: PostwinState): PostwinState {
  if (state.healDismissElapsed !== null || !postwinHealInputReady(state.elapsed)) {
    return state;
  }
  return { ...state, healDismissElapsed: state.elapsed };
}

/** Delay since `AskReadyForHead`'s own base edge (the call scene's last-box dismiss + its trailing delay); null while that edge hasn't happened yet. */
function postwinHeadPromptDelay(state: PostwinState): number | null {
  if (state.callSceneDismissElapsed === null) return null;
  return state.elapsed - state.callSceneDismissElapsed - CALL_SCENE_TRAILING_DELAY;
}

export function postwinNextVisibleChars(state: PostwinState): number {
  if (state.frontierBrain) {
    const delay = postwinHeadPromptDelay(state);
    if (delay === null || delay < POSTWIN_DIALOGUE_TEXT_FIRST_DELAY) return 0;
    return Math.min(
      CALL_SCENE_HEAD_PROMPT_TOTAL,
      delay - POSTWIN_DIALOGUE_TEXT_FIRST_DELAY + 1,
    );
  }
  if (state.healDismissElapsed === null) return 0;
  const delay = state.elapsed - state.healDismissElapsed;
  if (delay < POSTWIN_NEXT_TEXT_FIRST_DELAY) return 0;
  return Math.min(
    postwinNextTextTotal(state),
    delay - POSTWIN_NEXT_TEXT_FIRST_DELAY + 1,
  );
}

export function postwinContinuationInputReady(state: PostwinState): boolean {
  if (state.frontierBrain) {
    const delay = postwinHeadPromptDelay(state);
    return delay !== null && delay >= CALL_SCENE_HEAD_MENU_READY_DELAY;
  }
  return state.healDismissElapsed !== null &&
    state.elapsed >=
      state.healDismissElapsed + postwinContinuationInputReadyDelay(state);
}

/** Delay since the current call-scene box's own edge; null while no box is active. */
function postwinCallSceneDelay(state: PostwinState): number | null {
  if (state.callScenePage === 0) return null;
  const edge = state.callScenePageEdgeElapsed;
  if (edge === null) return null;
  return state.elapsed - edge;
}

export function postwinCallSceneVisibleChars(state: PostwinState): number {
  const delay = postwinCallSceneDelay(state);
  if (delay === null) return 0;
  const firstDelay = CALL_SCENE_TEXT_FIRST_DELAYS[state.callScenePage - 1]!;
  if (delay < firstDelay) return 0;
  const total = callSceneBoxTotal(state.callScenePage as 1 | 2 | 3 | 4 | 5);
  return Math.min(total, delay - firstDelay + 1);
}

/**
 * Ticks from a call-scene box's own last glyph to the first tick that box
 * polls `JOY_NEW(A|B)` -- `text.c`'s two distinct message endings (see
 * `CALL_SCENE_BOX_PROMPT_PAGE`): `$`/EOS accepts at last-glyph + 1 (the
 * printer finishes, `waitmessage` releases, `waitbuttonpress` polls), a `\p`
 * page break at last-glyph + 2 (one frame consumes `CHAR_PROMPT_CLEAR`, the
 * next enters `RENDER_STATE_CLEAR` and polls). MEASURED on fixture 01's own
 * box 1: last glyph oracle 894, dismiss-A registers 895.
 */
function callSceneAcceptLagAfterLastGlyph(page: 1 | 2 | 3 | 4 | 5): number {
  return CALL_SCENE_BOX_PROMPT_PAGE[page - 1] ? 2 : 1;
}

export function postwinCallSceneInputReady(state: PostwinState): boolean {
  const delay = postwinCallSceneDelay(state);
  if (delay === null) return false;
  const page = state.callScenePage as 1 | 2 | 3 | 4 | 5;
  const firstDelay = CALL_SCENE_TEXT_FIRST_DELAYS[page - 1]!;
  const total = callSceneBoxTotal(page);
  // Last glyph lands at firstDelay + total - 1; the accept edge is that plus
  // this ending's own lag. Boxes 3/4 (the `\p` pages) keep the old
  // "settled + 2" value; the `$`-terminated boxes are one tick earlier, and
  // since box 1's first glyph moved one tick LATER by the same amount, no
  // call-scene box's absolute accept tick moves.
  return delay >= firstDelay + total - 1 + callSceneAcceptLagAfterLastGlyph(page);
}

/**
 * The bobbing down-arrow phase for a `\p`-terminated call-scene box that is
 * waiting on input, or null when this box draws no arrow. `text.c`'s
 * `DrawDownArrow` redraws it every 9th frame it is waiting, cycling
 * `sDownArrowYCoords` (0,1,2,1) -- the same cycle battleScene.ts's
 * `cursorState`/battleRoom.ts's `brainSpeechCursorYOffset` already model for
 * this identical glyph, re-anchored to this box's own first waiting tick
 * (which is also its own accept edge, both being `RENDER_STATE_CLEAR`'s
 * first frame).
 */
const CALL_SCENE_WAIT_ARROW_Y_OFFSETS = [0, 1, 2, 1] as const;
export function postwinCallSceneWaitArrowYOffset(state: PostwinState): number | null {
  const delay = postwinCallSceneDelay(state);
  if (delay === null) return null;
  const page = state.callScenePage as 1 | 2 | 3 | 4 | 5;
  if (!CALL_SCENE_BOX_PROMPT_PAGE[page - 1]) return null;
  const firstDelay = CALL_SCENE_TEXT_FIRST_DELAYS[page - 1]!;
  const waitStart = firstDelay + callSceneBoxTotal(page) - 1
    + callSceneAcceptLagAfterLastGlyph(page);
  if (delay < waitStart) return null;
  const phase = Math.floor((delay - waitStart) / 9)
    % CALL_SCENE_WAIT_ARROW_Y_OFFSETS.length;
  return CALL_SCENE_WAIT_ARROW_Y_OFFSETS[phase]!;
}

// Walk-up step A follow-on (docs/walkup-call-scene-ground-truth.md Window 1):
// the attendant's walk-away (box 1 dismiss -> box 2) and walk-back (box 2
// dismiss -> box 3) movements, `EventScript_ReturnToRoomFromBattle`'s
// `applymovement ...MoveToReceiveCall`/`applymovement ...ReturnToPlayer`
// (scripts.inc:67/71) - each 3 tiles (`walk_left`/`walk_right` x3,
// scripts.inc:437-448). Pixel-probed directly against the committed
// fixtures (tools/battle-lab/factory-brain-silver-walkup-callscene-0{1,2}-
// off.json), tracking the attendant sprite's own hair-color marker frame by
// frame (not the ground-truth doc's own coarser box-level table, which folds
// the pre-movement message hold into the same row):
// - Away (fixture 01): box1's dismiss-A registers at oracle frame 895; the
//   attendant sprite is still at rest through frame 902 (closemessage/task-
//   dispatch lead-in, MEASURED 8 ticks); it then shifts exactly 1px/tick
//   left from frame 903 (-1px) through frame 950 (-48px = 3 tiles), holding
//   at -48 from then on.
// - Back (fixture 02): box2's dismiss-A registers at oracle frame 1037 and
//   the attendant shifts the SAME tick (MEASURED 0-tick lead-in, unlike the
//   away leg) - 1px/tick right from frame 1037 (-47px) through frame 1084
//   (0px, home), holding there.
// Both legs move at the same already-established 16-ticks/tile rate
// (prebattleRoom.ts's WALK_STEPS module doc) - 3 tiles = 48 ticks, MEASURED
// identical on both fixtures.
/** Ticks from box 1's dismiss edge to the walk-away's first visible pixel (closemessage/task-dispatch lead-in). MEASURED (fixture 01: 895 -> 903). */
const CALL_SCENE_MOVE_AWAY_START_DELAY = 8;
/** Ticks from box 2's dismiss edge to the walk-back's first visible pixel: starts the same tick (MEASURED, fixture 02: 1037 -> 1037). */
const CALL_SCENE_MOVE_BACK_START_DELAY = 0;
/** Continuous 1px/tick walk duration, either direction: 3 tiles * 16 ticks/tile. MEASURED identical on both fixtures (48 ticks each). */
const CALL_SCENE_MOVE_DURATION = 48;
/** Total px displacement at rest, either direction: 3 tiles * 16px/tile (MEASURED, matches CALL_SCENE_MOVE_DURATION 1:1 - a clean 1px/tick rate). */
const CALL_SCENE_MOVE_DISTANCE = 48;
const CALL_SCENE_MOVE_AWAY_TOTAL_DELAY =
  CALL_SCENE_MOVE_AWAY_START_DELAY + CALL_SCENE_MOVE_DURATION;
const CALL_SCENE_MOVE_BACK_TOTAL_DELAY =
  CALL_SCENE_MOVE_BACK_START_DELAY + CALL_SCENE_MOVE_DURATION;
/**
 * Per-callScenePage-transition delay from the accepted dismiss edge to the
 * next box's own content edge (index = `callScenePage - 1` BEFORE the
 * transition). Boxes 3->4 and 4->5 (the boss message's own `\p` page turns)
 * have no attendant movement, but are NOT instant either: PROGRESS 1293
 * pixel-derived (oracle hashes identical across local 805-813, changed at
 * 814) that the OLD page's fully-typed content stays on screen through the
 * accept tick itself, and the new page's first glyph appears exactly one
 * tick later (`text.c`'s `RENDER_STATE_CLEAR` clears off-screen and returns
 * `RENDER_UPDATE`, so the clear/new-first-glyph swap is invisible until the
 * next frame's `RENDER_PRINT` - see the ground-truth doc's per-tick printer
 * write-up). Modelled as a 1-tick deferred bump via the same
 * `callScenePendingElapsed` mechanism boxes 1/2 already use for their own
 * (much longer) walk-gated transitions, paired with `CALL_SCENE_TEXT_FIRST_
 * DELAYS[3]/[4]` = 0 so the new page's first glyph lands exactly on the
 * bump tick (accept + 1 total, matching the measurement).
 */
export const CALL_SCENE_PAGE_TRANSITION_DELAY: readonly [number, number, number, number] = [
  CALL_SCENE_MOVE_AWAY_TOTAL_DELAY,
  CALL_SCENE_MOVE_BACK_TOTAL_DELAY,
  1,
  1,
];

/**
 * Picture-table pose during the walk, cycling every 8 ticks: stand(2)
 * alternating with the two lead-leg indices (7, 8). Duration/step-count
 * matches `sAnim_GoWest`/`sAnim_GoEast` (reference/pokeemerald/src/data/
 * object_events/object_event_anims.h:220-235: 4 steps of 8 ticks each,
 * `ANIMCMD_FRAME(7,8)`, `ANIMCMD_FRAME(2,8)`, `ANIMCMD_FRAME(8,8)`,
 * `ANIMCMD_FRAME(2,8)`, loop - GoEast is the literal same table with
 * `hFlip=TRUE` added, i.e. same leg order as GoWest by the decomp source).
 *
 * PROGRESS 1293 rendered both candidate leg-index orders at the
 * attendant's actual on-screen position against oracle pixel data and
 * found the two walk legs (page 1 = walk-away, hFlip false; page 2 =
 * walk-back, hFlip true) do NOT share one order despite GoWest/GoEast
 * being the literal same table: page 1 is pixel-exact (0/31 diff) with
 * leg8-then-leg7 (`tools/compare/traces/factory-brain-silver-walkup-
 * callscene-01-off.json` frames 447 cyclePos0-7, 429 cyclePos16-23),
 * while page 2 is pixel-exact with the literal decomp order, leg7-then-
 * leg8 (`...-callscene-02-off.json` frame 547 cyclePos0-7; frames 563-569
 * cyclePos16-23 already matched pre-fix). The raw per-index art itself is
 * confirmed correct first (`tools/extract/extract-prebattle-room.ts`'s
 * frame extraction is byte-identical to the source PNG's own columns
 * 7/8), so this is a picture-index/imageValue ordering fix (per walk
 * direction), not a pixel-fit. Unclear why the two legs diverge from the
 * shared-table reading; not re-derived further within this step's bound.
 */
function callSceneWalkFrame(walkTick: number, leadLeg: 7 | 8): 2 | 7 | 8 {
  const otherLeg = leadLeg === 7 ? 8 : 7;
  const cyclePos = walkTick % 32;
  if (cyclePos < 8) return leadLeg;
  if (cyclePos < 16) return 2;
  if (cyclePos < 24) return otherLeg;
  return 2;
}

export interface CallSceneAttendantVisual {
  /** Signed px offset from the attendant's rest position (negative = west/away). */
  readonly dx: number;
  /** Picture-table frame (prebattle-room-npcs.json indexing): 0 = face south (rest), 2 = face west/east stand, 7/8 = west/east walk legs. */
  readonly frame: 0 | 2 | 7 | 8;
  readonly hFlip: boolean;
}
const CALL_SCENE_HOME_VISUAL: CallSceneAttendantVisual = { dx: 0, frame: 0, hFlip: false };
/** Held pose once the walk-away settles (MEASURED: the last GoWest cycle tick before `waitmovement 0` returns is frame 2, west-stand - matches `callSceneWalkFrame`'s own last value). */
const CALL_SCENE_AWAY_HOLD_VISUAL: CallSceneAttendantVisual = { dx: -CALL_SCENE_MOVE_DISTANCE, frame: 2, hFlip: false };

/** The attendant's current on-screen offset/pose for the brain call scene - null-safe for every non-brain / pre-movement state (returns the rest visual). */
export function callSceneAttendantVisual(state: PostwinState): CallSceneAttendantVisual {
  if (!state.frontierBrain || state.callScenePage === 0) return CALL_SCENE_HOME_VISUAL;
  if (state.callScenePage === 1) {
    if (state.callScenePendingElapsed === null) return CALL_SCENE_HOME_VISUAL;
    const dismissEdge = state.callScenePendingElapsed - CALL_SCENE_MOVE_AWAY_TOTAL_DELAY;
    const localTick = state.elapsed - dismissEdge;
    if (localTick < CALL_SCENE_MOVE_AWAY_START_DELAY) return CALL_SCENE_HOME_VISUAL;
    const walkTick = Math.min(
      localTick - CALL_SCENE_MOVE_AWAY_START_DELAY,
      CALL_SCENE_MOVE_DURATION - 1,
    );
    return { dx: -(walkTick + 1), frame: callSceneWalkFrame(walkTick, 8), hFlip: false };
  }
  if (state.callScenePage === 2) {
    if (state.callScenePendingElapsed === null) return CALL_SCENE_AWAY_HOLD_VISUAL;
    const dismissEdge = state.callScenePendingElapsed - CALL_SCENE_MOVE_BACK_TOTAL_DELAY;
    const localTick = Math.max(0, state.elapsed - dismissEdge - CALL_SCENE_MOVE_BACK_START_DELAY);
    const walkTick = Math.min(localTick, CALL_SCENE_MOVE_DURATION - 1);
    return {
      dx: -CALL_SCENE_MOVE_DISTANCE + (walkTick + 1),
      frame: callSceneWalkFrame(walkTick, 7),
      hFlip: true,
    };
  }
  return CALL_SCENE_HOME_VISUAL;
}

/**
 * True while the call-scene message box is fully hidden: the attendant's
 * walk-away/walk-back movement span itself (box already dismissed, still
 * displaying the OLD page number until the deferred bump -- see
 * `callScenePendingElapsed`), the just-arrived box's own short reopen lag
 * (`CALL_SCENE_BOX_REOPEN_LAG`), and box 5's own dismiss -> `AskReadyForHead`
 * reopen gap. Ground-truth doc: no message box visible for either walk's
 * full span.
 *
 * Box 5's `$`-terminated dismiss runs `closemessage` (script's own trailing
 * `delay 16`, `CALL_SCENE_TRAILING_DELAY`) before `AskReadyForHead`'s box
 * reopens -- the SAME closemessage-then-reopen shape boxes 2/3 already use,
 * reusing their own measured reopen lag rather than a new constant. MEASURED
 * (this step, direct oracle PNG diff, fixture 02): dismiss registers local
 * 948 (`He says...` still fully held, matching the app through that tick);
 * oracle shows the room with NO box at all through local 966 (`closemessage`
 * has already run: msgbox border gone, room fully visible); the box frame
 * reappears (still textless) exactly at local 967 = dismiss(948) +
 * `CALL_SCENE_TRAILING_DELAY`(16) + `CALL_SCENE_BOX_REOPEN_LAG[0]`(3). Before
 * this fix the app kept drawing box 5's own frame (with a spurious 0-char
 * head-prompt render underneath) for the entire gap instead of hiding it.
 */
export function callSceneBoxHidden(state: PostwinState): boolean {
  if (!state.frontierBrain || state.callScenePage === 0) return false;
  if (state.callSceneDismissElapsed !== null) {
    // Box 5's own fully-typed content still renders through the dismiss
    // (accept) tick itself, same "old content survives the accept tick"
    // shape as every other call-scene turn -- only elapsed > dismiss enters
    // the closemessage gap.
    if (state.elapsed <= state.callSceneDismissElapsed) return false;
    const edge = state.callSceneDismissElapsed + CALL_SCENE_TRAILING_DELAY;
    return state.elapsed - edge < CALL_SCENE_BOX_REOPEN_LAG[0];
  }
  if (state.callScenePendingElapsed !== null) {
    if (state.callScenePage === 1) {
      const dismissEdge = state.callScenePendingElapsed - CALL_SCENE_MOVE_AWAY_TOTAL_DELAY;
      return state.elapsed - dismissEdge >= CALL_SCENE_MOVE_AWAY_START_DELAY;
    }
    if (state.callScenePage === 2) {
      const dismissEdge = state.callScenePendingElapsed - CALL_SCENE_MOVE_BACK_TOTAL_DELAY;
      return state.elapsed - dismissEdge >= CALL_SCENE_MOVE_BACK_START_DELAY;
    }
    return false;
  }
  if (state.callScenePage === 2 || state.callScenePage === 3) {
    const edge = state.callScenePageEdgeElapsed;
    if (edge === null) return false;
    return state.elapsed - edge < CALL_SCENE_BOX_REOPEN_LAG[state.callScenePage - 2]!;
  }
  return false;
}

/**
 * Advances the call scene's current box on an accepted A-press. Boxes 1 and
 * 2 arm a PENDING transition (`callScenePendingElapsed`) gated behind the
 * attendant's walk-away/walk-back movement instead of turning over
 * instantly -- the box itself stays put (still fully typed/held, matching
 * the ground-truth doc's own post-dismiss hold) until `advancePostwin`
 * performs the deferred bump. Boxes 3/4 (no movement) still turn over
 * instantly, mirroring `acceptPostwinDialoguePage`; box 5 (the boss
 * message's last page) instead records `callSceneDismissElapsed`, starting
 * `AskReadyForHead`'s own prompt clock.
 */
export function acceptPostwinCallScenePage(state: PostwinState): PostwinState {
  if (
    !state.frontierBrain ||
    state.callScenePage === 0 ||
    state.callSceneDismissElapsed !== null ||
    state.callScenePendingElapsed !== null ||
    !postwinCallSceneInputReady(state)
  ) return state;
  if (state.callScenePage < 5) {
    const transitionDelay = CALL_SCENE_PAGE_TRANSITION_DELAY[state.callScenePage - 1]!;
    if (transitionDelay === 0) {
      return {
        ...state,
        callScenePage: (state.callScenePage + 1) as 2 | 3 | 4 | 5,
        callScenePageEdgeElapsed: state.elapsed,
      };
    }
    return { ...state, callScenePendingElapsed: state.elapsed + transitionDelay };
  }
  return { ...state, callSceneDismissElapsed: state.elapsed };
}

/**
 * Continuation menu entry count: 4 (GO ON/RECORD/REST/RETIRE) until a
 * successful RECORD-YES sets `disableRecordBattle`, then 3
 * (GO ON/REST/RETIRE, the MULTI_GO_ON_REST_RETIRE variant at §7a).
 */
export function postwinContinuationChoiceCount(state: PostwinState): 3 | 4 {
  return state.disableRecordBattle ? 3 : 4;
}

export function movePostwinContinuationCursor(
  state: PostwinState,
  direction: 1 | -1,
): PostwinState {
  if (!postwinContinuationInputReady(state) || state.continuationCursorPos === null) {
    return state;
  }
  const count = postwinContinuationChoiceCount(state);
  const next = (state.continuationCursorPos + direction + count) % count;
  return {
    ...state,
    continuationCursorPos: next as 0 | 1 | 2 | 3,
    continuationCursorMoveElapsed: state.elapsed,
  };
}

export function beginPostwinQuestion(
  state: PostwinState,
  kind: PostwinQuestionKind,
): PostwinState {
  if (
    state.dialoguePage !== 0 ||
    state.question !== null ||
    state.continuationCursorPos === null ||
    !postwinContinuationInputReady(state)
  ) return state;
  return {
    ...state,
    // The app's accepted A edge lands one tick after the oracle's canonical
    // select tick; storing the canonical edge keeps every POSTWIN_QUESTION_*
    // offset verbatim (docs/postwin-record-retire-ground-truth.md §5).
    question: { kind, edgeElapsed: state.elapsed - 1 },
    questionCursorPos: 1,
    questionCursorDisplayPos: 1,
    questionCursorMoveElapsed: null,
    questionYesElapsed: null,
    questionDismissElapsed: null,
  };
}

/** Earliest age (this state's relative clock) the YES/NO window accepts input. */
export function postwinQuestionInputReadyAge(state: PostwinState): number {
  const question = state.question;
  if (question === null) return Number.POSITIVE_INFINITY;
  return question.edgeElapsed +
    POSTWIN_QUESTION_WINDOW_DELAYS[question.kind];
}

export function movePostwinQuestionCursor(
  state: PostwinState,
  direction: 1 | -1,
): PostwinState {
  if (
    state.question === null ||
    state.questionDismissElapsed !== null ||
    state.questionYesElapsed !== null ||
    state.elapsed < postwinQuestionInputReadyAge(state)
  ) return state;
  return {
    ...state,
    questionCursorPos: direction === 1 ? 1 : 0,
    questionCursorMoveElapsed: state.elapsed,
  };
}

export function acceptPostwinQuestionYes(
  state: PostwinState,
): PostwinState {
  if (
    state.question === null ||
    state.questionDismissElapsed !== null ||
    state.questionYesElapsed !== null ||
    state.questionCursorPos !== 0 ||
    state.elapsed < postwinQuestionInputReadyAge(state)
  ) return state;
  return {
    ...state,
    // Same canonical-edge convention as beginPostwinQuestion.
    questionYesElapsed: state.elapsed - 1,
    // `SaveRecordBattle` unconditionally sets
    // `frontier.disableRecordBattle = TRUE` on every successful save
    // (frontier_util.c:2173-2177); the re-asked continuation menu then drops
    // the RECORD entry (docs/postwin-record-retire-ground-truth.md §7a).
    disableRecordBattle:
      state.question.kind === "record" || state.disableRecordBattle,
  };
}

/** RECORD-YES recorded message: MSGBOX_DEFAULT accepts A two ticks after the final glyph. */
export function postwinRecordedInputReady(state: PostwinState): boolean {
  return postwinQuestionYesDelay(state) >= POSTWIN_RECORDED_INPUT_READY_DELAY;
}

/**
 * RECORD-YES: accept the recorded-message dismiss-A. This resolves
 * "{PLAYER}'s battle was recorded / on the FRONTIER PASS." back to the
 * continuation menu -- the re-ask runs the same ReadyFor2ndOpponent reprint
 * schedule as a NO dismiss (§7b), keyed to this edge.
 */
export function acceptPostwinRecordedMessageDismiss(
  state: PostwinState,
): PostwinState {
  if (
    state.question === null ||
    state.question.kind !== "record" ||
    state.questionYesElapsed === null ||
    state.recordedMessageDismissElapsed !== null ||
    !postwinRecordedInputReady(state)
  ) return state;
  return {
    ...state,
    // Same canonical-edge convention as beginPostwinQuestion.
    recordedMessageDismissElapsed: state.elapsed - 1,
  };
}

export function acceptPostwinQuestionDismiss(
  state: PostwinState,
): PostwinState {
  if (state.question === null) return state;
  const delay = state.elapsed - state.question.edgeElapsed;
  if (
    state.questionDismissElapsed !== null ||
    state.questionYesElapsed !== null ||
    delay < POSTWIN_QUESTION_WINDOW_DELAYS[state.question.kind]
  ) return state;
  return {
    ...state,
    // Same canonical-edge convention as beginPostwinQuestion.
    questionDismissElapsed: state.elapsed - 1,
  };
}

export function postwinQuestionVisibleChars(state: PostwinState): number {
  if (state.question === null) return 0;
  const delay = state.elapsed - state.question.edgeElapsed;
  if (delay < POSTWIN_QUESTION_TEXT_FIRST_DELAY) return 0;
  return Math.min(
    POSTWIN_QUESTION_TEXT_TOTAL[state.question.kind],
    delay - POSTWIN_QUESTION_TEXT_FIRST_DELAY + 1,
  );
}

export function postwinQuestionWindowVisible(state: PostwinState): boolean {
  if (state.question === null) return false;
  const delay = state.elapsed - state.question.edgeElapsed;
  return delay >= POSTWIN_QUESTION_WINDOW_DELAYS[state.question.kind];
}

/**
 * RECORD-YES: delay relative to the accepted A-on-YES canonical edge
 * (`questionYesElapsed`). Returns -1 when the YES route is not active.
 */
export function postwinQuestionYesDelay(state: PostwinState): number {
  if (state.question === null || state.questionYesElapsed === null) return -1;
  return state.elapsed - state.questionYesElapsed;
}

/** RECORD-YES "{PLAYER}'s battle was recorded" visible glyph count. */
export function postwinRecordedVisibleChars(state: PostwinState): number {
  const delay = postwinQuestionYesDelay(state);
  if (delay < POSTWIN_RECORDED_TEXT_FIRST_DELAY) return 0;
  return Math.min(
    POSTWIN_RECORDED_TEXT_TOTAL,
    delay - POSTWIN_RECORDED_TEXT_FIRST_DELAY + 1,
  );
}

/**
 * The re-ask reference edge for the current question: the NO dismiss-A edge
 * (default-NO answer) or the RECORD-YES recorded-message dismiss-A edge.
 * Null while neither has resolved. Both routes re-enter the continuation
 * menu through the same ReadyFor2ndOpponent reprint schedule
 * (docs/postwin-record-retire-ground-truth.md §1/§7b).
 */
export function postwinReaskElapsed(state: PostwinState): number | null {
  return state.questionDismissElapsed !== null
    ? state.questionDismissElapsed
    : state.recordedMessageDismissElapsed;
}

/**
 * Re-ask prompt total glyph count: the ordinary route's "2nd match is next!"
 * (`POSTWIN_NEXT_TEXT_TOTAL`, matches the standalone `POSTWIN_QUESTION_
 * REPRINT_SETTLED_DELAY`/`POSTWIN_QUESTION_MENU_READY_DELAY` constants below
 * via the same `firstDelay+total-1[+4]` shape those were fit from) or the
 * brain route's own longer `AskReadyForHead` prompt
 * (`CALL_SCENE_HEAD_PROMPT_TOTAL`) -- `AskRecordBattle`/`AskRetireChallenge`'s
 * NO branch falls through `AskReadyForOpponent` on EITHER route, so the
 * re-ask always re-prints whichever prompt that route's own AskReadyForHead/
 * ReadyFor2ndOpponent uses, not always the ordinary one. Walk-up build step A
 * follow-on: this branch didn't exist when `postwinQuestionReprintVisibleChars`
 * was first written (ordinary-route-only at the time), so the brain route's
 * RECORD/RETIRE re-ask rendered the wrong (short) text -- found this session
 * via the RECORD/RETIRE compare traces
 * (docs/walkup-call-scene-ground-truth.md Windows 4-5).
 */
function postwinQuestionReprintTotal(state: PostwinState): number {
  return state.frontierBrain ? CALL_SCENE_HEAD_PROMPT_TOTAL : postwinNextTextTotal(state);
}

/** Re-ask "2nd match is next!" (or brain's AskReadyForHead) visible glyph count after a question dismiss. */
export function postwinQuestionReprintVisibleChars(state: PostwinState): number {
  const reAsk = postwinReaskElapsed(state);
  if (state.question === null || reAsk === null) return 0;
  const delay = state.elapsed - reAsk;
  if (delay < POSTWIN_QUESTION_REPRINT_FIRST_DELAY) return 0;
  return Math.min(
    postwinQuestionReprintTotal(state),
    delay - POSTWIN_QUESTION_REPRINT_FIRST_DELAY + 1,
  );
}

export function postwinQuestionReprintSettled(state: PostwinState): boolean {
  const reAsk = postwinReaskElapsed(state);
  if (state.question === null || reAsk === null) return false;
  // One shape for both routes (pmn238): first glyph + total - 1 (= POSTWIN_QUESTION_REPRINT_SETTLED_DELAY,
  // 40, for the 2nd-match line; 49 for the 7th; the brain's own prompt as before).
  return state.elapsed - reAsk >=
    POSTWIN_QUESTION_REPRINT_FIRST_DELAY + postwinQuestionReprintTotal(state) - 1;
}

/**
 * Same "settled + 4" shape `POSTWIN_QUESTION_MENU_READY_DELAY` (44) already
 * encodes for the ordinary route (`5 + POSTWIN_NEXT_TEXT_TOTAL(36) - 1 + 4`)
 * -- re-derived per-route instead of a second hardcoded constant so it stays
 * correct for whichever prompt `postwinQuestionReprintTotal` selects. Brain:
 * `5 + 63 - 1 + 4 = 71`, structural (same reuse discipline as
 * `CALL_SCENE_HEAD_MENU_VISIBLE_DELAY`/`READY_DELAY`), not independently
 * oracle-measured for this specific re-ask window.
 */
function postwinQuestionReprintMenuReadyDelay(state: PostwinState): number {
  // = POSTWIN_QUESTION_MENU_READY_DELAY (44) for the 2nd-match line; 53 for the 7th.
  return POSTWIN_QUESTION_REPRINT_FIRST_DELAY + postwinQuestionReprintTotal(state) - 1 + 4;
}

export function postwinQuestionMenuReady(state: PostwinState): boolean {
  const reAsk = postwinReaskElapsed(state);
  if (state.question === null || reAsk === null) return false;
  return state.elapsed - reAsk >=
    postwinQuestionReprintMenuReadyDelay(state);
}

export function acceptPostwinContinuation(
  state: PostwinState,
): PostwinState {
  if (
    state.dialoguePage !== 0 ||
    state.continuationConfirmElapsed !== null ||
    state.question !== null ||
    state.continuationCursorPos === null ||
    !postwinContinuationInputReady(state)
  ) return state;
  if (state.continuationCursorPos === 0) return {
    ...state,
    continuationConfirmElapsed: state.elapsed,
    dialoguePage: 1,
    dialoguePageEdgeElapsed: state.elapsed,
  };
  if (state.disableRecordBattle) {
    // 3-option variant: 1 = REST (guarded), 2 = RETIRE.
    if (state.continuationCursorPos === 1) return state;
    if (state.continuationCursorPos === 2) {
      return beginPostwinQuestion(state, "retire");
    }
    return state;
  }
  if (state.continuationCursorPos === 1) {
    return beginPostwinQuestion(state, "record");
  }
  if (state.continuationCursorPos === 3) {
    return beginPostwinQuestion(state, "retire");
  }
  return state;
}

export function postwinDialogueDelay(state: PostwinState): number | null {
  return state.dialoguePageEdgeElapsed === null
    ? null
    : state.elapsed - state.dialoguePageEdgeElapsed;
}

export function postwinDialogueVisibleChars(state: PostwinState): number {
  const delay = postwinDialogueDelay(state);
  if (delay === null || delay < POSTWIN_DIALOGUE_TEXT_FIRST_DELAY) return 0;
  // Brain's short path (Brief 2): dialoguePage 1 is the AskSwapBeforeHead
  // one-liner instead of the ordinary route's first scouting page.
  const lines = state.frontierBrain && state.dialoguePage === 1
    ? POSTWIN_BRAIN_CANT_TELL_TEXT
    : state.scoutingLines[state.dialoguePage - 1];
  if (!lines) return 0;
  return Math.min(
    lines[0].length + lines[1].length,
    delay - POSTWIN_DIALOGUE_TEXT_FIRST_DELAY + 1,
  );
}

export function postwinDialogueInputReady(state: PostwinState): boolean {
  const delay = postwinDialogueDelay(state);
  if (delay === null) return false;
  if (state.frontierBrain && state.dialoguePage === 1) {
    return delay >= POSTWIN_BRAIN_CANT_TELL_INPUT_READY_DELAY;
  }
  if (state.dialoguePage >= 1 && state.dialoguePage <= 3) {
    return delay >= POSTWIN_SCOUTING_INPUT_READY_DELAYS[state.dialoguePage - 1]!;
  }
  if (state.dialoguePage === 4) return delay >= POSTWIN_SWAP_INPUT_READY_DELAY;
  return false;
}

export function acceptPostwinDialoguePage(state: PostwinState): PostwinState {
  if (
    state.dialoguePage < 1 ||
    state.dialoguePage > 3 ||
    !postwinDialogueInputReady(state)
  ) return state;
  // Brain's short path (Brief 2, docs/walkup-step-a-design.md §2.1 item 3):
  // AskSwapBeforeHead's one-liner goes straight to the swap ask, skipping
  // the ordinary route's scouting pages 2-3 entirely.
  const nextPage: 2 | 3 | 4 = state.frontierBrain && state.dialoguePage === 1
    ? 4
    : (state.dialoguePage + 1) as 2 | 3 | 4;
  return {
    ...state,
    dialoguePage: nextPage,
    dialoguePageEdgeElapsed: state.elapsed,
    swapCursorPos: null,
    swapCursorDisplayPos: null,
    swapCursorMoveElapsed: null,
    swapDeclineElapsed: null,
    rightThisWayDismissElapsed: null,
  };
}

export function movePostwinSwapCursor(
  state: PostwinState,
  direction: 1 | -1,
): PostwinState {
  if (
    state.swapDeclineElapsed !== null ||
    !postwinDialogueInputReady(state) ||
    state.swapCursorPos === null
  ) return state;
  return {
    ...state,
    swapCursorPos: direction === 1 ? 1 : 0,
    swapCursorMoveElapsed: state.elapsed,
  };
}

export function acceptPostwinSwapDecline(state: PostwinState): PostwinState {
  if (
    state.swapDeclineElapsed !== null ||
    state.swapCursorPos !== 1 ||
    !postwinDialogueInputReady(state)
  ) return state;
  return { ...state, swapDeclineElapsed: state.elapsed };
}

/** Shared field-script continuation after either NO or a completed swap. */
export function beginPostwinNextBattleGuide(
  state: PostwinState,
): PostwinState {
  if (
    state.swapDeclineElapsed !== null ||
    !postwinDialogueInputReady(state)
  ) return state;
  return { ...state, swapDeclineElapsed: state.elapsed };
}

export function postwinRightThisWayVisibleChars(state: PostwinState): number {
  if (state.swapDeclineElapsed === null) return 0;
  const delay = state.elapsed - state.swapDeclineElapsed;
  if (delay < POSTWIN_RIGHT_THIS_WAY_TEXT_FIRST_DELAY) return 0;
  return Math.min(
    POSTWIN_RIGHT_THIS_WAY.length,
    delay - POSTWIN_RIGHT_THIS_WAY_TEXT_FIRST_DELAY + 1,
  );
}

export function postwinRightThisWayInputReady(state: PostwinState): boolean {
  return state.swapDeclineElapsed !== null &&
    state.elapsed >=
      state.swapDeclineElapsed + POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY;
}

export function acceptPostwinRightThisWayDismiss(
  state: PostwinState,
): PostwinState {
  if (
    state.rightThisWayDismissElapsed !== null ||
    !postwinRightThisWayInputReady(state)
  ) return state;
  return { ...state, rightThisWayDismissElapsed: state.elapsed };
}
