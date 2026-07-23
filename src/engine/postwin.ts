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
}

export const INITIAL_POSTWIN_STATE: PostwinState = {
  elapsed: 0,
  challengeBattleNum: 0,
  opponentRentalMonIds: [153, 179, 181],
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
export function postwinRngSteps(age: number): number {
  if (age < POSTWIN_IN_BATTLE_CLEAR_AGE) return 0;
  // Baseline outside-battle VBlank call plus source-observed transition
  // bursts at 23645/23647/23648 and 23707/23708.
  if (age === 43 || age === 45) return 2;
  if (age === 46 || age === 105) return 3;
  if (age === 106) return 4;
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
  return {
    elapsed,
    challengeBattleNum:
      elapsed >= POSTWIN_CHALLENGE_BATTLE_WRITE_AGE ? 1 : state.challengeBattleNum,
    opponentRentalMonIds:
      elapsed >= POSTWIN_OPPONENT_RENTALS_WRITE_AGE
        ? POSTWIN_OPPONENT_RENTAL_IDS
        : state.opponentRentalMonIds,
  };
}
