// rc1 (Kyle, 2026-11-21: the Lobby after a challenge "kind of breaks the UX a bit for new people"): with the library option
// `lobby: "skip"` the game does not warp to the walkable Lobby after a round ends. It holds on a black frame instead, the moment
// the host draws its own result card, and every input but the round hold's release is ignored. Not a ROM state: the ROM always
// warps to the Lobby (docs/lbra-lobby-return.md, docs/lbrd-win-lobby-return.md); the default `lobby: "walk"` keeps that path.
//
//   "end"    after a loss or forfeit, from the first black frame of the battle's fade (postwin age 37, POSTWIN_BATTLE_BLACK_AGE);
//            after a RETIRE YES, from the first black frame of its warp (POSTWIN_RETIRE_BLACK_AGE_DELAY). Never released: the
//            challenge is over and the host mounts the next one.
//   "round"  after a 7-win, from the first black frame after the battle room (postwin age 96, POSTWIN_SECOND_BLACK_AGE; after
//            Noland's symbol scene when there is one). A or START from ROUND_HOLD_INPUT_DELAY ticks on deals the next round's draft.
//
// While holding, the frame counter and the per-VBlank RNG run as everywhere outside a battle (the next round's deal is made from
// the cursor of the release tick, deterministic from the trace like the Lobby's).

export type ResultHoldKind = "end" | "round";

export interface ResultHoldState {
  readonly kind: ResultHoldKind;
  /** Ticks since the hold began (0 = its first black frame). */
  readonly age: number;
}

/**
 * The round hold takes a press from this age on (half a second): a player still pressing A through the winner's text does not skip
 * the host's card by accident.
 */
export const ROUND_HOLD_INPUT_DELAY = 30;

export function createResultHold(kind: ResultHoldKind): ResultHoldState {
  return Object.freeze({ kind, age: 0 });
}

export function advanceResultHold(hold: ResultHoldState): ResultHoldState {
  return Object.freeze({ kind: hold.kind, age: hold.age + 1 });
}

/** Whether this tick's new presses release a round hold. */
export function releasesRoundHold(hold: ResultHoldState, newKeys: ReadonlySet<string>): boolean {
  return hold.kind === "round" && hold.age >= ROUND_HOLD_INPUT_DELAY && (newKeys.has("A") || newKeys.has("START"));
}
