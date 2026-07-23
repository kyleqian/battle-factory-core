// Battle Factory Battle 1 return-to-counter flow, relative to the real
// DESTIN loss-quote dismiss edge.  The timing is oracle/RAM-pinned in
// docs/postwin-notes.md's S8 engine-evidence addendum.

export type PostwinPhase =
  | "battleHold"
  | "battleFade"
  | "blackAfterBattle"
  | "battleRoom"
  | "blackBeforeCounter"
  | "counterRoom";

export interface PostwinState {
  /** Ticks since the accepted loss-quote dismiss (0 = the A edge). */
  elapsed: number;
  /** SaveBlock2.frontier.curChallengeBattleNum. */
  challengeBattleNum: 0 | 1;
  /** SaveBlock2.frontier.rentalMons[3..5].monId. */
  opponentRentalMonIds: readonly [number, number, number];
  /** Accepted heal-message A edge, in this state's relative elapsed clock. */
  healDismissElapsed: number | null;
  /** gPlayerParty[0..2] HP: ONIX / MAGBY / BAYLEEF. */
  playerPartyHp: readonly [number, number, number];
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
}

export const INITIAL_POSTWIN_STATE: PostwinState = {
  elapsed: 0,
  challengeBattleNum: 0,
  opponentRentalMonIds: [153, 179, 181],
  healDismissElapsed: null,
  playerPartyHp: [0, 27, 153],
  continuationCursorPos: null,
  continuationConfirmElapsed: null,
  dialoguePage: 0,
  dialoguePageEdgeElapsed: null,
  swapCursorPos: null,
};

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
export const POSTWIN_SCOUTING_LINES = [
  [
    "I’ve conducted a little investigation",
    "about your upcoming opponent.",
  ],
  [
    "The TRAINER appears to have no clear",
    "favorites when it comes to type.",
  ],
  [
    "The favorite battle style appears",
    "to be weakening the foe to start.",
  ],
  [
    "Before starting the battle, would you",
    "like to swap a POKéMON?",
  ],
] as const;
/** MSGBOX_DEFAULT: final glyph plus the source's three-frame WAIT handoff. */
export const POSTWIN_SCOUTING_INPUT_READY_DELAYS = [72, 74, 72] as const;
/** MSGBOX_YESNO: text settles at +63, menu copies at +66, accepts at +70. */
export const POSTWIN_SWAP_MENU_VISIBLE_DELAY = 66;
export const POSTWIN_SWAP_INPUT_READY_DELAY = 70;

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
  return {
    elapsed,
    challengeBattleNum:
      elapsed >= POSTWIN_CHALLENGE_BATTLE_WRITE_AGE ? 1 : state.challengeBattleNum,
    opponentRentalMonIds:
      elapsed >= POSTWIN_OPPONENT_RENTALS_WRITE_AGE
        ? POSTWIN_OPPONENT_RENTAL_IDS
        : state.opponentRentalMonIds,
    healDismissElapsed: state.healDismissElapsed,
    playerPartyHp: healed ? POSTWIN_HEALED_PARTY_HP : state.playerPartyHp,
    continuationCursorPos:
      menuVisible && state.continuationCursorPos === null
        ? 0
        : state.continuationCursorPos,
    continuationConfirmElapsed: state.continuationConfirmElapsed,
    dialoguePage: state.dialoguePage,
    dialoguePageEdgeElapsed: state.dialoguePageEdgeElapsed,
    swapCursorPos:
      swapMenuVisible && state.swapCursorPos === null
        ? 0
        : state.swapCursorPos,
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
  };
}

export function acceptPostwinContinuation(
  state: PostwinState,
): PostwinState {
  if (
    state.dialoguePage !== 0 ||
    state.continuationConfirmElapsed !== null ||
    state.continuationCursorPos !== 0 ||
    !postwinContinuationInputReady(state)
  ) return state;
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
  const lines = POSTWIN_SCOUTING_LINES[state.dialoguePage - 1];
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
  };
}
