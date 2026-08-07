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
  /** Accepted dismiss-A edge for the active question (default NO), edge-relative. */
  questionDismissElapsed: number | null;
  /** Cursor copied to the field window one VBlank after the logical move. */
  continuationCursorDisplayPos: 0 | 1 | 2 | 3 | null;
  /** Accepted continuation-cursor edge, used for the one-VBlank display handoff. */
  continuationCursorMoveElapsed: number | null;
  /** Accepted "Right this way" dismiss edge; walk/warp clocks derive from it. */
  rightThisWayDismissElapsed: number | null;
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
export const POSTWIN_NEXT_LINE1 = "The 2nd match is next!";
export const POSTWIN_NEXT_LINE2 = "Are you ready?";
export const POSTWIN_NEXT_TEXT_TOTAL =
  POSTWIN_NEXT_LINE1.length + POSTWIN_NEXT_LINE2.length;

export const POSTWIN_DIALOGUE_TEXT_FIRST_DELAY = 4;
export const POSTWIN_DIALOGUE_OLD_TEXT_END_DELAY = 2;
export const POSTWIN_DIALOGUE_BLANK_DELAY = 3;
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
    questionDismissElapsed: null,
    continuationCursorDisplayPos: null,
    continuationCursorMoveElapsed: null,
    rightThisWayDismissElapsed: null,
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
  frozenSceneView: BattleResolutionPresentationRenderView,
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
  frozenSceneView: BattleResolutionPresentationRenderView,
): PostwinState {
  return {
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
    questionDismissElapsed: null,
    continuationCursorDisplayPos: null,
    continuationCursorMoveElapsed: null,
    rightThisWayDismissElapsed: null,
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

// Exact write ages are filled by the dense RAM audit accompanying this
// slice. They remain relative state boundaries, never canonical ticks.
export const POSTWIN_CHALLENGE_BATTLE_WRITE_AGE = 79;
export const POSTWIN_OPPONENT_RENTALS_WRITE_AGE = 137;
export const POSTWIN_OPPONENT_RENTAL_IDS =
  [188, 184, 135] as const;

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
  const menuVisible =
    state.healDismissElapsed !== null &&
    elapsed >= state.healDismissElapsed + POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY;
  const swapMenuVisible =
    state.dialoguePage === 4 &&
    state.dialoguePageEdgeElapsed !== null &&
    elapsed >= state.dialoguePageEdgeElapsed + POSTWIN_SWAP_MENU_VISIBLE_DELAY;
  // The re-asked continuation menu after a RECORD/RETIRE question is a fresh
  // menu: cursor back on GO ON (ground-truth §1: re-asked menu byte-identical
  // to the original held menu, which sits on GO ON).
  const reAskMenuReady =
    state.question !== null &&
    state.questionDismissElapsed !== null &&
    elapsed >= state.questionDismissElapsed + POSTWIN_QUESTION_MENU_READY_DELAY;
  return {
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
    question: state.question,
    questionDismissElapsed: state.questionDismissElapsed,
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
    frozenSceneView: state.frozenSceneView,
  };
}

export function acceptPostwinHealDismiss(state: PostwinState): PostwinState {
  if (state.healDismissElapsed !== null || !postwinHealInputReady(state.elapsed)) {
    return state;
  }
  return { ...state, healDismissElapsed: state.elapsed };
}

export function postwinNextVisibleChars(state: PostwinState): number {
  if (state.healDismissElapsed === null) return 0;
  const delay = state.elapsed - state.healDismissElapsed;
  if (delay < POSTWIN_NEXT_TEXT_FIRST_DELAY) return 0;
  return Math.min(
    POSTWIN_NEXT_TEXT_TOTAL,
    delay - POSTWIN_NEXT_TEXT_FIRST_DELAY + 1,
  );
}

export function postwinContinuationInputReady(state: PostwinState): boolean {
  return state.healDismissElapsed !== null &&
    state.elapsed >=
      state.healDismissElapsed + POSTWIN_CONTINUATION_INPUT_READY_DELAY;
}

export function movePostwinContinuationCursor(
  state: PostwinState,
  direction: 1 | -1,
): PostwinState {
  if (!postwinContinuationInputReady(state) || state.continuationCursorPos === null) {
    return state;
  }
  return {
    ...state,
    continuationCursorPos:
      ((state.continuationCursorPos + direction + 4) % 4) as 0 | 1 | 2 | 3,
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
    questionDismissElapsed: null,
  };
}

export function acceptPostwinQuestionDismiss(
  state: PostwinState,
): PostwinState {
  if (state.question === null) return state;
  const delay = state.elapsed - state.question.edgeElapsed;
  if (
    state.questionDismissElapsed !== null ||
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

/** Re-ask "2nd match is next!" visible glyph count after a question dismiss. */
export function postwinQuestionReprintVisibleChars(state: PostwinState): number {
  if (state.question === null || state.questionDismissElapsed === null) return 0;
  const delay = state.elapsed - state.questionDismissElapsed;
  if (delay < POSTWIN_QUESTION_REPRINT_FIRST_DELAY) return 0;
  return Math.min(
    POSTWIN_NEXT_TEXT_TOTAL,
    delay - POSTWIN_QUESTION_REPRINT_FIRST_DELAY + 1,
  );
}

export function postwinQuestionReprintSettled(state: PostwinState): boolean {
  if (state.question === null || state.questionDismissElapsed === null) return false;
  return state.elapsed - state.questionDismissElapsed >=
    POSTWIN_QUESTION_REPRINT_SETTLED_DELAY;
}

export function postwinQuestionMenuReady(state: PostwinState): boolean {
  if (state.question === null || state.questionDismissElapsed === null) return false;
  return state.elapsed - state.questionDismissElapsed >=
    POSTWIN_QUESTION_MENU_READY_DELAY;
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
  if (state.continuationCursorPos === 1) {
    return beginPostwinQuestion(state, "record");
  }
  if (state.continuationCursorPos === 3) {
    return beginPostwinQuestion(state, "retire");
  }
  if (state.continuationCursorPos !== 0) return state;
  return {
    ...state,
    continuationConfirmElapsed: state.elapsed,
    dialoguePage: 1,
    dialoguePageEdgeElapsed: state.elapsed,
  };
}

export function postwinDialogueDelay(state: PostwinState): number | null {
  return state.dialoguePageEdgeElapsed === null
    ? null
    : state.elapsed - state.dialoguePageEdgeElapsed;
}

export function postwinDialogueVisibleChars(state: PostwinState): number {
  const delay = postwinDialogueDelay(state);
  if (delay === null || delay < POSTWIN_DIALOGUE_TEXT_FIRST_DELAY) return 0;
  const lines = state.scoutingLines[state.dialoguePage - 1];
  if (!lines) return 0;
  return Math.min(
    lines[0].length + lines[1].length,
    delay - POSTWIN_DIALOGUE_TEXT_FIRST_DELAY + 1,
  );
}

export function postwinDialogueInputReady(state: PostwinState): boolean {
  const delay = postwinDialogueDelay(state);
  if (delay === null) return false;
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
  return {
    ...state,
    dialoguePage: (state.dialoguePage + 1) as 2 | 3 | 4,
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
