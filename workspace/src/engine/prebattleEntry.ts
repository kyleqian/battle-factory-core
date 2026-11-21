// lbr-e: the PreBattleRoom entry between the Lobby door fade and the rental draft, for a challenge started in-game
// (BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc EventScript_EnterRoom, lines 28-42). Every tick count below is
// ROM-measured from the lbrb happy-path window (traces lbre-prebattle-*-off); age 0 is the hand-off tick (the frame the
// room's fade-in starts). docs/lbre-prebattle-briefing.md.
//
// Script order: both NPCs walk 5 tiles (applymovement + waitmovement), THEN factory_generaterentalmons /
// factory_generateopponentmons run, THEN the briefing texts (opponent type, battle style), then "First, we will hold
// your POKéMON ..." and a fadescreen into the draft. The deal therefore reads the live vblank cursor at the end of the
// walk, not the cursor of the door fade.
import { createFactoryCorpusParty } from "./factoryCorpusParty.ts";
import { getFactoryOpponentCommentary } from "./factoryCommentary.ts";
import { createFactoryRoundBattleOrchestrator } from "./factoryRoundBattleOrchestrator.ts";
import { ANCHOR_FACTORY_METADATA } from "./factoryAnchorSession.ts";
import {
  generateFactoryChallengeDraft,
  type FactoryCarry,
  type FactoryGeneratedChallengeDraft,
} from "./factoryRoundChaining.ts";

export const PREBATTLE_ENTRY_TIMING = Object.freeze({
  /** Room fade-in (FADE_IN, 15 ticks) then a settled hold before the walk. */
  fadeInTicks: 15,
  holdTicks: 8,
  /** 5 tiles at 16 frames per tile; the camera scrolls 1 px per tick, the player stays screen-fixed. */
  walkTicks: 80,
  /** Ticks after the walk's last tick until the generator runs (frame 6660 of the lbrb window: 13 RNG steps in one frame). */
  dealAfterWalk: 1,
  /** Ticks from the deal tick to the briefing box's first (blank) frame. */
  boxOpenAfterDeal: 2,
  /**
   * Ticks after the first A tick (the tick that accepts the A): the next message's first glyph (the old text clears
   * one tick earlier), the next page's first glyph after a `\p`, and the box closing before the fade to black.
   */
  messageFirstGlyph: 4,
  pageTurnFirstGlyph: 2,
  closeTicks: 3,
  fadeOutTicks: 15,
  blackTicks: 72,
  draftFadeInTicks: 15,
  /** Arrow blink: 9-frame groups over the 4-entry bob table (same as the attendant's). */
  arrowGroupFrames: 9,
  /** ROM RNG consumed by the door warp's map load that the app does not model otherwise (frames 6546 / 6547). */
  warpExtraRng: Object.freeze([
    Object.freeze({ fadeTick: 27, extra: 2 }),
    Object.freeze({ fadeTick: 28, extra: 3 }),
  ]),
});

const T = PREBATTLE_ENTRY_TIMING;
export const PREBATTLE_ENTRY_WALK_START_AGE = T.fadeInTicks + T.holdTicks;
export const PREBATTLE_ENTRY_WALK_END_AGE = PREBATTLE_ENTRY_WALK_START_AGE + T.walkTicks;
/** The tick that runs the generator (age 104, ROM frame 6660). */
export const PREBATTLE_ENTRY_DEAL_AGE = PREBATTLE_ENTRY_WALK_END_AGE + T.dealAfterWalk;
export const PREBATTLE_ENTRY_BOX_OPEN_AGE = PREBATTLE_ENTRY_DEAL_AGE + T.boxOpenAfterDeal;

export interface BriefingPage {
  readonly lines: readonly string[];
  /** `p`: wait arrow, A or B clears to the next page. `end`: last page of the message. */
  readonly end: "p" | "end";
}
export type BriefingMessage = readonly BriefingPage[];

export type PrebattleEntryPhase = "intro" | "talk" | "closing" | "fadeOut" | "black" | "draftFadeIn";

export interface BriefingPrev {
  readonly message: number;
  readonly page: number;
  /** Text age of the old page at the A press; it keeps counting while the lead-in plays. */
  readonly textAge: number;
  readonly kind: "turn" | "message";
}

export interface PrebattleEntryState {
  /** Ticks since the hand-off tick (the frame the room fade-in starts). */
  readonly age: number;
  readonly phase: PrebattleEntryPhase;
  /** Ticks in the current non-intro phase. */
  readonly phaseTick: number;
  readonly carry: FactoryCarry;
  /** Null until the deal tick. */
  readonly messages: readonly BriefingMessage[] | null;
  readonly message: number;
  readonly page: number;
  /** Ticks since this page's first glyph (negative while a lead-in plays; -1 is the blank box). */
  readonly textAge: number;
  readonly prev: BriefingPrev | null;
}

export function createPrebattleEntryState(carry: FactoryCarry): PrebattleEntryState {
  return Object.freeze({
    age: 0,
    phase: "intro",
    phaseTick: 0,
    carry,
    messages: null,
    message: 0,
    page: 0,
    textAge: -1,
    prev: null,
  });
}

export function briefingGlyphCount(page: BriefingPage): number {
  return page.lines.reduce((n, line) => n + line.length, 0);
}

function wrapLines(lines: readonly string[] | null | undefined): readonly string[] {
  return lines === null || lines === undefined ? [] : lines;
}

/**
 * The four script messages. The type and style lines depend only on the deal (the opponent mons come from the cursor
 * right after the six rental set ids, before the personalities: the ROM's order, generateFactoryRoundDeal), never on the
 * player's later picks, and there is no streak-dependent text: a continued streak changes the opponent set range, not the script.
 */
export function buildBriefingMessages(
  carry: FactoryCarry,
  rngValueBefore: number,
): readonly BriefingMessage[] {
  const orchestrator = createFactoryRoundBattleOrchestrator({
    battleScene: "off",
    id: "prebattle-briefing",
    rngValue: rngValueBefore,
    factoryWinStreak: carry.factoryWinStreak,
    playerTrainerId: carry.playerTrainerId,
    battleTowerLevel50WinStreak: ANCHOR_FACTORY_METADATA.battleTowerLevel50WinStreak,
    factorySymbolsCount: carry.factorySymbolsCount,
    facilityState: { rentsCount: carry.rentsCount },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  });
  const records = orchestrator.round.rules.currentOpponent.rentalRecords;
  const commentary = getFactoryOpponentCommentary(createFactoryCorpusParty(records as Parameters<typeof createFactoryCorpusParty>[0]));
  const one = (...lines: string[]): BriefingMessage => Object.freeze([Object.freeze({ lines: Object.freeze(lines), end: "end" as const })]);
  return Object.freeze([
    one("I've conducted a little investigation", "about your upcoming opponent."),
    one(...wrapLines(commentary.favoriteTypeLines)),
    one(...wrapLines(commentary.battleStyleLines)),
    Object.freeze([
      Object.freeze({ lines: Object.freeze(["First, we will hold your POKéMON for", "safekeeping."]), end: "p" as const }),
      Object.freeze({ lines: Object.freeze(["You may then choose from our", "selection of POKéMON."]), end: "end" as const }),
    ]),
  ]);
}

export interface PrebattleEntryDeal {
  readonly draft: FactoryGeneratedChallengeDraft;
  readonly rngValueBefore: number;
}

export interface PrebattleEntryInput {
  /**
   * A or B was pressed this tick (lbb1): every briefing message is `msgbox ..., MSGBOX_DEFAULT` (pre-battle room scripts.inc:38, :208 and the
   * type / style comments), whose `waitbuttonpress` is WaitForAorBPress (scrcmd.c:1323-1330), and a `\p` page waits in
   * TextPrinterWaitWithDownArrow, JOY_NEW(A_BUTTON | B_BUTTON) (text.c:865-882).
   */
  readonly press: boolean;
}

export interface PrebattleEntryAdvance {
  readonly state: PrebattleEntryState | null;
  /** True on the deal tick only: core runs dealPrebattleEntry with the cursor at the end of the previous tick. */
  readonly deal: boolean;
  /** True when the entry is over and the draft owns the screen (state is null). */
  readonly done: boolean;
}

/** Is the finished page ready to take A or B (typing done)? Mirrors the attendant's gate: from the tick after the last glyph. */
export function briefingAcceptsInput(state: PrebattleEntryState): boolean {
  if (state.phase !== "talk" || state.messages === null || state.prev !== null) return false;
  const page = state.messages[state.message]![state.page]!;
  return state.textAge > briefingGlyphCount(page) - 1;
}

export function advancePrebattleEntry(state: PrebattleEntryState, input: PrebattleEntryInput): PrebattleEntryAdvance {
  const age = state.age + 1;
  switch (state.phase) {
    case "intro": {
      const dealTick = age === PREBATTLE_ENTRY_DEAL_AGE;
      if (age === PREBATTLE_ENTRY_BOX_OPEN_AGE) {
        return { state: Object.freeze({ ...state, age, phase: "talk", phaseTick: 0, textAge: -1 }), deal: false, done: false };
      }
      return { state: Object.freeze({ ...state, age }), deal: dealTick, done: false };
    }
    case "talk": {
      const messages = state.messages!;
      const textAge = state.textAge + 1;
      if (state.prev !== null) {
        const prev = state.prev;
        const next = textAge >= 0 ? null : Object.freeze({ ...prev, textAge: prev.textAge + 1 });
        return { state: Object.freeze({ ...state, age, textAge, prev: next }), deal: false, done: false };
      }
      const ticked: PrebattleEntryState = Object.freeze({ ...state, age, textAge });
      if (!briefingAcceptsInput(state) || !input.press) return { state: ticked, deal: false, done: false };
      const message = messages[state.message]!;
      const pageDef = message[state.page]!;
      if (pageDef.end === "p") {
        return {
          state: Object.freeze({
            ...ticked,
            page: state.page + 1,
            textAge: -T.pageTurnFirstGlyph,
            prev: Object.freeze({ message: state.message, page: state.page, textAge: state.textAge, kind: "turn" as const }),
          }),
          deal: false,
          done: false,
        };
      }
      if (state.message + 1 < messages.length) {
        return {
          state: Object.freeze({
            ...ticked,
            message: state.message + 1,
            page: 0,
            textAge: -T.messageFirstGlyph,
            prev: Object.freeze({ message: state.message, page: state.page, textAge: state.textAge, kind: "message" as const }),
          }),
          deal: false,
          done: false,
        };
      }
      return { state: Object.freeze({ ...ticked, phase: "closing", phaseTick: 0 }), deal: false, done: false };
    }
    case "closing": {
      const phaseTick = state.phaseTick + 1;
      if (phaseTick < T.closeTicks) return { state: Object.freeze({ ...state, age, phaseTick }), deal: false, done: false };
      return { state: Object.freeze({ ...state, age, phase: "fadeOut", phaseTick: 0 }), deal: false, done: false };
    }
    case "fadeOut": {
      const phaseTick = state.phaseTick + 1;
      if (phaseTick < T.fadeOutTicks) return { state: Object.freeze({ ...state, age, phaseTick }), deal: false, done: false };
      return { state: Object.freeze({ ...state, age, phase: "black", phaseTick: 0 }), deal: false, done: false };
    }
    case "black": {
      const phaseTick = state.phaseTick + 1;
      if (phaseTick < T.blackTicks) return { state: Object.freeze({ ...state, age, phaseTick }), deal: false, done: false };
      return { state: Object.freeze({ ...state, age, phase: "draftFadeIn", phaseTick: 0 }), deal: false, done: false };
    }
    case "draftFadeIn": {
      const phaseTick = state.phaseTick + 1;
      if (phaseTick < T.draftFadeInTicks) return { state: Object.freeze({ ...state, age, phaseTick }), deal: false, done: false };
      return { state: null, deal: false, done: true };
    }
  }
}

/** The deal itself, run by core on the deal tick with the cursor at the end of the previous tick. */
export function dealPrebattleEntry(carry: FactoryCarry, rngValueBefore: number): PrebattleEntryDeal & { messages: readonly BriefingMessage[] } {
  return {
    draft: generateFactoryChallengeDraft(carry, rngValueBefore),
    rngValueBefore,
    messages: buildBriefingMessages(carry, rngValueBefore),
  };
}

/** Walk-phase pose tables: 8 ticks per pose per tile, alternating a leg frame with the standing frame. */
const ATTENDANT_WALK_POSE = [6, 1, 5, 1, 6, 1, 5, 1, 6, 1] as const;
const PLAYER_WALK_POSE = [5, 1, 6, 1, 5, 1, 6, 1, 5, 1] as const;
const CAMERA_ORIGIN_X = 16;
const CAMERA_START_Y = 136;
const CAMERA_END_Y = 56;

export interface PrebattleEntryScene {
  readonly originY: number;
  readonly attendantFrame: number;
  readonly playerFrame: number;
}

/** Camera and pose for the (non-faded) room at `age`. */
export function prebattleEntryScene(age: number): PrebattleEntryScene {
  if (age < PREBATTLE_ENTRY_WALK_START_AGE) return { originY: CAMERA_START_Y, attendantFrame: 1, playerFrame: 1 };
  const t = age - PREBATTLE_ENTRY_WALK_START_AGE;
  if (t >= T.walkTicks) {
    return { originY: CAMERA_END_Y, attendantFrame: 0, playerFrame: 1 };
  }
  const group = Math.floor(t / 8);
  return { originY: CAMERA_START_Y - (t + 1), attendantFrame: ATTENDANT_WALK_POSE[group]!, playerFrame: PLAYER_WALK_POSE[group]! };
}

export { CAMERA_ORIGIN_X };
