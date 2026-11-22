// Forced player-switch party menu state.  Rendering is intentionally kept
// separate: this reducer only owns the button-gated cursor/action sequence.
import { PARTY_MESSAGE_CLOCK_START, stepPartyMessage } from "./partyMenuMessage.ts";
import anchorStateData from "../data/gen/anchor-state.json" with { type: "json" };
import type { GbaButton } from "../input.ts";
import type {
  BattleParty,
  BattleStatus,
  FactoryRentalParty,
} from "./battleScenario.ts";
import {
  createBattleForcedSwitchRequest,
  submitBattleDecision,
  type BattleDecisionReducer,
  type BattleDecisionTransitionResult,
  type BattleForcedSwitchRequest,
  type BattleJsonObject,
  type BattlePartyIndex,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import { battlePartyDisplayRows, IDENTITY_BATTLE_PARTY_ORDER, type BattlePartyCurrentOrder } from "./battlePartyOrder.ts";
import type { BattleScriptPartyMemberState } from "./battleScriptRulesContext.ts";
import {
  battlePartySummaryExitBegins,
  battlePartySummaryReturned,
  buildBattlePartySummaryMons,
  liveSummaryViewFromPartyMember,
  movePartyActionCursor,
  openBattlePartySummary,
  partyActionWindowDirection,
  PARTY_ACTION_CANCEL,
  PARTY_ACTION_SUMMARY,
  stepBattlePartySummary,
  summaryAilmentFromBattleStatus,
  type BattlePartyActionCursor,
  type BattlePartySummaryMons,
} from "./battlePartySummary.ts";
import { createFactoryCorpusPartyMember, type FactoryCorpusPartyMemberState } from "./factoryCorpusParty.ts";
import type { LiveBattleMemberView } from "./factoryRentalPresentation.ts";
import type { SummaryScreenState } from "./summaryScreen.ts";
import { movePartyMenuCursor, partyMenuDirection, type PartyMenuCursor, type PartyMenuRightColumn } from "./partyMenuCursor.ts";
import { playFailureSe, playSelectSe } from "./screenSounds.ts";

/** Slot 0 / 1 / 2 or the CANCEL button (party_menu.c's gPartyMenu.slotId; PARTY_SIZE + 1 = CANCEL), shared with the voluntary menu. */
export type PartySelectCursor = PartyMenuCursor;
export type PartyMenuChromeKey = "listOnix" | "listOnixFrame1" | "listOnixMidHop" | "listMagby" | "listMagbyMidHop" | "submenu" | "sendOutExit" | "sendOutExitFrame0";
export type PartyMenuIconLayer = {
  partyIndex: 0 | 1 | 2;
  species: string;
  frame: 0 | 1;
  selected: boolean;
  y2: -3 | 1 | -4 | 0;
  x2: -4 | 0;
};
export interface PartyMenuLayers {
  chromeKey: PartyMenuChromeKey;
  icons: readonly PartyMenuIconLayer[];
  /** The selected MAGBY position needs its distinct extracted status OBJ. */
  status: "normal" | "magby";
}

export interface PartySelectMember {
  readonly partyIndex: 0 | 1 | 2;
  readonly id: string;
  readonly speciesId: number;
  readonly speciesKey: string;
  readonly species: string;
  readonly level: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly status: BattleStatus;
  readonly personality: number;
  readonly abilitySlot: 0 | 1;
  readonly friendship: number;
  readonly fainted: boolean;
  readonly legal: boolean;
  /** Source rental party record's held item (ITEM_NONE renders no icon). */
  readonly item: number;
}

export interface PartySelectState {
  /** Frames since the actual faint-message dismiss edge. */
  elapsed: number;
  cursor: PartySelectCursor;
  /** The right column's remembered slot for LEFT/RIGHT (partyMenuCursor.ts). */
  rightColumnCursor: PartyMenuRightColumn;
  submenuOpen: boolean;
  /** The SEND OUT / SUMMARY / CANCEL window's own cursor (sum241): 0 = SEND OUT, 1 = SUMMARY, 2 = CANCEL; 0 whenever the window opens. */
  actionCursor: BattlePartyActionCursor;
  /** The three rows' summary presentations in menu order (records + the live party), never null for a forced menu. */
  summaryMons: BattlePartySummaryMons;
  /** Non-null from the SUMMARY press until the summary's exit fade has settled on the re-inited menu (battlePartySummary.ts). */
  summary: SummaryScreenState | null;
  /** Null until SEND OUT is confirmed; then frames since that input edge. */
  sendOutElapsed: number | null;
  /** Source party-menu refusal text; null during ordinary list/submenu input. */
  message: string | null;
  /** Print / dismiss clock of `message` (partyMenuMessage.ts); meaningless while `message` is null. */
  messageElapsed: number;
  messageDismissElapsed: number | null;
  /** Immutable kernel request whose selection this presentation owns. */
  request: BattleForcedSwitchRequest;
  /**
   * The three visible rows in the ROM's battle order (OpenPartyMenuInBattle: the active, or just-fainted, mon is row 0), each carrying
   * its raw `partyIndex`; `cursor` is a row, and the confirmed decision names the row's raw index.
   */
  party: readonly [PartySelectMember, PartySelectMember, PartySelectMember];
}

/**
 * The forced-switch transition is anchored to the A edge that dismisses
 * "ONIX fainted!", never to an absolute battle tick.  The boundaries are
 * oracle-pinned for the canonical trace and repeat unchanged when that A is
 * delayed: 21 held battle frames, 15 fade-out frames, 28 black frames, then
 * 16 fade-in frames before the live party list is usable.
 */
export type PartySelectEntryPhase = "battleHold" | "fadingOut" | "black" | "fadingIn" | "settled";
// `elapsed` is advanced on the first VBlank after the A edge.  The frozen
// source therefore owns rendered elapsed 0..20; rendered elapsed 21 is the
// first palette-update frame (canonical trace 20012, delayed trace +30).
export const PARTY_ENTRY_BATTLE_HOLD_FRAMES = 21;
export const PARTY_ENTRY_FADE_OUT_FRAMES = 15;
export const PARTY_ENTRY_BLACK_FRAMES = 28;
export const PARTY_ENTRY_FADE_IN_FRAMES = 16;
export const PARTY_ENTRY_FADE_OUT_START = PARTY_ENTRY_BATTLE_HOLD_FRAMES;
export const PARTY_ENTRY_BLACK_START = PARTY_ENTRY_FADE_OUT_START + PARTY_ENTRY_FADE_OUT_FRAMES;
export const PARTY_ENTRY_FADE_IN_START = PARTY_ENTRY_BLACK_START + PARTY_ENTRY_BLACK_FRAMES;
export const PARTY_ENTRY_SETTLED_START = PARTY_ENTRY_FADE_IN_START + PARTY_ENTRY_FADE_IN_FRAMES;

export function partySelectEntryPhase(elapsed: number): PartySelectEntryPhase {
  if (elapsed < PARTY_ENTRY_FADE_OUT_START) return "battleHold";
  if (elapsed < PARTY_ENTRY_BLACK_START) return "fadingOut";
  if (elapsed < PARTY_ENTRY_FADE_IN_START) return "black";
  if (elapsed < PARTY_ENTRY_SETTLED_START) return "fadingIn";
  return "settled";
}

type AnchorRental = Readonly<{
  species: string;
  frontierMonIndex: number;
  personality: number;
  ivs: Readonly<Record<"hp" | "attack" | "defense" | "speed" | "spAttack" | "spDefense", number>>;
  abilityNum: 0 | 1;
  stats: Readonly<{ maxHp: number }>;
}>;

const anchorRentals = (anchorStateData as { rentals: AnchorRental[] }).rentals;

function canonicalRentalRecord(index: 0 | 1 | 2) {
  const rental = anchorRentals[index]!;
  const ivs = Object.values(rental.ivs);
  if (!ivs.every((iv) => iv === ivs[0])) {
    throw new Error(`canonical forced-switch rental ${index} does not have uniform IVs`);
  }
  return {
    setId: rental.frontierMonIndex,
    personality: rental.personality,
    fixedIv: ivs[0]!,
    abilitySlot: rental.abilityNum,
  };
}

export const CANONICAL_FORCED_SWITCH_REQUEST =
  createBattleForcedSwitchRequest({
    kind: "forced-switch",
    requestId: 0,
    side: "player",
    battler: 0,
    faintedPartyIndex: 0,
    legalPartyIndexes: [1, 2],
  });

export const CANONICAL_FORCED_SWITCH_RENTAL_RECORDS = Object.freeze([
  canonicalRentalRecord(0),
  canonicalRentalRecord(1),
  canonicalRentalRecord(2),
]) as unknown as FactoryRentalParty;

export const CANONICAL_FORCED_SWITCH_PARTY = Object.freeze(
  ([0, 1, 2] as const).map((index) => {
    const rental = anchorRentals[index]!;
    return Object.freeze({
      id: rental.species.replace(/^SPECIES_/, "").toLowerCase(),
      species: rental.species.replace(/^SPECIES_/, ""),
      maxHp: rental.stats.maxHp,
      hp: index === 0 ? 0 : rental.stats.maxHp,
      status: "none" as const,
    });
  }),
) as unknown as BattleParty;

/**
 * lsf2: the identity fields a party-menu row reads from a `FactoryCorpusPartyMemberState`. A lab (tools/compare/labMon.ts) builds its
 * three mons directly (levels, EVs and sets no rental record can express) and hands them to a forced selector in place of the records;
 * the record path keeps its species / max HP check.
 */
export type PartySelectLabMember = Pick<
  FactoryCorpusPartyMemberState,
  "species" | "speciesName" | "level" | "personality" | "abilitySlot" | "friendship" | "item"
>;
export type PartySelectLabParty = readonly [PartySelectLabMember, PartySelectLabMember, PartySelectLabMember];

function partySpeciesName(species: string): string {
  return species.replace(/^SPECIES_/, "");
}

/**
 * Request-driven forced-switch entry. This slice constructs arbitrary round
 * identities and live row state, but deliberately does not claim arbitrary
 * icon/chrome rendering; `partyMenuLayers` retains the canonical asset guard.
 */
export function createPartySelectStateFromForcedSwitch(
  requestInput: BattleForcedSwitchRequest,
  playerRentalRecords: FactoryRentalParty,
  playerParty: BattleParty,
  order: BattlePartyCurrentOrder = IDENTITY_BATTLE_PARTY_ORDER,
  /**
   * The kernel's gPlayerParty mirror (moves, PP, held item, status1) for the SUMMARY rows (sum241); without it the summary
   * takes HP / status from `playerParty` and the record's own moves, PP and item.
   */
  liveParty: readonly BattleScriptPartyMemberState[] | null = null,
  /** lsf2: when given, the rows' identity comes from these members, not from the records (whose species / max HP check is then skipped). */
  labParty: PartySelectLabParty | null = null,
): PartySelectState {
  const request = createBattleForcedSwitchRequest(requestInput);
  if (request.side !== "player") {
    throw new Error("party-select presentation only accepts a player forced-switch request");
  }
  if (request.faintedPartyIndex > 2) {
    throw new Error("party-select presentation requires a fainted index in the three-mon Factory party");
  }
  if (request.legalPartyIndexes.length === 0) {
    throw new Error("party-select presentation requires at least one legal replacement");
  }

  const legalIndexes = new Set(request.legalPartyIndexes);
  const rawParty = playerRentalRecords.map((record, index): PartySelectMember => {
    const partyIndex = index as 0 | 1 | 2;
    const lab = labParty?.[partyIndex];
    const corpusMember = lab ?? createFactoryCorpusPartyMember(record);
    const battleMember = playerParty[partyIndex]!;
    const species = partySpeciesName(corpusMember.speciesName);
    if (lab === undefined) {
      const recordMember = corpusMember as FactoryCorpusPartyMemberState;
      if (partySpeciesName(battleMember.species) !== species) {
        throw new Error(
          `playerParty[${partyIndex}] species ${battleMember.species} does not match rental record species ${species}`,
        );
      }
      if (battleMember.maxHp !== recordMember.maxHP) {
        throw new Error(
          `playerParty[${partyIndex}] max HP ${battleMember.maxHp} does not match rental record max HP ${recordMember.maxHP}`,
        );
      }
    }
    return Object.freeze({
      partyIndex,
      id: battleMember.id,
      speciesId: corpusMember.species,
      speciesKey: corpusMember.speciesName,
      species,
      level: corpusMember.level,
      hp: battleMember.hp,
      maxHp: battleMember.maxHp,
      status: battleMember.status,
      personality: corpusMember.personality,
      abilitySlot: corpusMember.abilitySlot,
      friendship: corpusMember.friendship,
      // The party menu tags every zero-HP member FNT (party_menu.c's HP /
      // status draw reads each slot's own HP), not only the slot that just
      // went down: a second forced switch in one battle lists the earlier
      // casualty as fainted too (fsw235). `faintedPartyIndex` names the
      // outgoing slot generically (`Cmd_openpartyscreen`'s own convention,
      // `battleScriptOpenPartyScreenOpcode.ts`) -- ISSUES #89's Baton Pass
      // switch opens this same screen for a still-living outgoing member,
      // which therefore stays unfainted, matching `createBattlePartySelectState`
      // (`battlePartySelect.ts`)'s own `fainted: member.hp === 0`.
      fainted: battleMember.hp === 0,
      legal: legalIndexes.has(partyIndex),
      item: corpusMember.item,
    });
  }) as unknown as readonly [PartySelectMember, PartySelectMember, PartySelectMember];
  const party = battlePartyDisplayRows(order).map((rawIndex) => rawParty[rawIndex]!) as unknown as typeof rawParty;
  const summaryMons = buildBattlePartySummaryMons(party, playerRentalRecords, (partyIndex) => {
    const live = liveParty?.[partyIndex];
    if (live !== undefined) return liveSummaryViewFromPartyMember(live);
    return recordSummaryView(playerRentalRecords[partyIndex], rawParty[partyIndex]);
  });

  for (const legalPartyIndex of request.legalPartyIndexes) {
    if (
      legalPartyIndex > 2
      || rawParty[legalPartyIndex as 0 | 1 | 2].hp === 0
    ) {
      throw new Error(
        `party-select presentation legal replacement ${legalPartyIndex} must be a living member of the three-mon Factory party`,
      );
    }
  }

  return {
    elapsed: 0,
    // InitPartyMenu(..., keepCursorPos = FALSE, ...) forces slot 0 (party_menu.c:524-525) for the forced send-out exactly like
    // the voluntary menu, whichever slot fainted; the fainted slot refuses with "has no energy" when picked.
    cursor: 0,
    rightColumnCursor: 1,
    submenuOpen: false,
    actionCursor: 0,
    summaryMons,
    summary: null,
    sendOutElapsed: null,
    message: null,
    ...PARTY_MESSAGE_CLOCK_START,
    request,
    party,
  };
}

/** A row's summary view from its rental record plus the menu's own HP / status (no live kernel party available). */
function recordSummaryView(record: FactoryRentalParty[number], member: PartySelectMember): LiveBattleMemberView {
  const corpus = createFactoryCorpusPartyMember(record);
  return Object.freeze({
    hp: member.hp,
    maxHP: member.maxHp,
    item: member.item,
    moves: corpus.moves,
    pp: corpus.pp,
    ailment: summaryAilmentFromBattleStatus(member.hp, member.status),
  });
}

/**
 * The pre-seam canonical state remains an independent equivalence baseline.
 * The live route in core.ts constructs the same value through the generic
 * request/round-record entry point above.
 */
const CANONICAL_PARTY_ROWS: PartySelectState["party"] = [
  {
    partyIndex: 0, id: "onix", speciesId: 95, speciesKey: "SPECIES_ONIX",
    species: "ONIX", level: 50, hp: 0, maxHp: 117,
    status: "none", personality: 1205102525, abilitySlot: 1,
    friendship: 0, fainted: true, legal: false, item: 142,
  },
  {
    partyIndex: 1, id: "magby", speciesId: 240, speciesKey: "SPECIES_MAGBY",
    species: "MAGBY", level: 50, hp: 138, maxHp: 138,
    status: "none", personality: 1534575931, abilitySlot: 0,
    friendship: 0, fainted: false, legal: true, item: 221,
  },
  {
    partyIndex: 2, id: "bayleef", speciesId: 153, speciesKey: "SPECIES_BAYLEEF",
    species: "BAYLEEF", level: 50, hp: 153, maxHp: 153,
    status: "none", personality: 1550278706, abilitySlot: 0,
    friendship: 0, fainted: false, legal: true, item: 179,
  },
];

export const INITIAL_PARTY_SELECT_STATE: PartySelectState = {
  elapsed: 0,
  cursor: 0,
  rightColumnCursor: 1,
  submenuOpen: false,
  actionCursor: 0,
  summaryMons: buildBattlePartySummaryMons(
    CANONICAL_PARTY_ROWS,
    CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
    (partyIndex) => recordSummaryView(CANONICAL_FORCED_SWITCH_RENTAL_RECORDS[partyIndex], CANONICAL_PARTY_ROWS[partyIndex]),
  ),
  summary: null,
  sendOutElapsed: null,
  message: null,
  ...PARTY_MESSAGE_CLOCK_START,
  request: CANONICAL_FORCED_SWITCH_REQUEST,
  party: CANONICAL_PARTY_ROWS,
};

/**
 * SEND OUT's own transition is separate from menu entry.  The source leaves
 * the confirmed submenu visible for two rendered frames, fades it for 16,
 * then holds generated black until the battle palette's first fade-in step.
 * Every boundary is relative to the confirming A edge (not battle time).
 */
export type PartySendOutPhase = "submenuHold" | "fadingOut" | "black" | "battleFadeIn" | "blankMessage" | "actionMenu";
// The A edge is observed on the following rendered VBlank: elapsed 0 is
// canonical frame 20246 (the last held submenu frame), so the fade itself
// begins at elapsed 1 / canonical 20247.
export const PARTY_SENDOUT_SUBMENU_HOLD_FRAMES = 1;
export const PARTY_SENDOUT_FADE_OUT_FRAMES = 16;
export const PARTY_SENDOUT_BLACK_FRAMES = 39;
export const PARTY_SENDOUT_FADE_OUT_START = PARTY_SENDOUT_SUBMENU_HOLD_FRAMES;
export const PARTY_SENDOUT_BLACK_START = PARTY_SENDOUT_FADE_OUT_START + PARTY_SENDOUT_FADE_OUT_FRAMES;
export const PARTY_SENDOUT_BATTLE_FADE_IN_START = PARTY_SENDOUT_BLACK_START + PARTY_SENDOUT_BLACK_FRAMES;
/** First `Go! MAGBY!` glyph, after the field's palette has settled. */
export const PARTY_SENDOUT_GO_TEXT_START = PARTY_SENDOUT_BATTLE_FADE_IN_START + 28;
export const PARTY_SENDOUT_GO_TEXT = "Go! MAGBY!";

/**
 * The forced-switch ball is a player Poké Ball, not a Brendan sprite.  Its
 * software slot is allocated two VBlanks before it first owns a displayed
 * texel; these boundaries are deliberately confirmation-relative so the
 * delayed SEND OUT trace reuses the same schedule.
 */
export const PARTY_SENDOUT_BALL_VISIBLE_START = PARTY_SENDOUT_BATTLE_FADE_IN_START + 43;
export const PARTY_SENDOUT_BALL_SPIN_START = PARTY_SENDOUT_BALL_VISIBLE_START + 8;
export const PARTY_SENDOUT_BALL_LAST_VISIBLE = PARTY_SENDOUT_BALL_VISIBLE_START + 43;
/** First displayed VBlank owned by MAGBY's release task and particles. */
export const PARTY_SENDOUT_RELEASE_VISIBLE_START = PARTY_SENDOUT_BALL_LAST_VISIBLE + 3;
/** Populated player-healthbox slide, using StartHealthboxSlideIn's 23 poses. */
export const PARTY_SENDOUT_HEALTHBOX_VISIBLE_START = PARTY_SENDOUT_RELEASE_VISIBLE_START + 16;
export const PARTY_SENDOUT_HEALTHBOX_SLIDE_START = PARTY_SENDOUT_HEALTHBOX_VISIBLE_START + 1;
export const PARTY_SENDOUT_HEALTHBOX_SLIDE_SPAN = 22;
export const PARTY_SENDOUT_HEALTHBOX_START_DX = 110;
export const PARTY_SENDOUT_HEALTHBOX_STEP = 5;
/**
 * The completed send-out clears its text for six rendered VBlanks, then
 * atomically hands control to the normal action menu.  Both boundaries are
 * measured from the SEND OUT confirmation edge: canonical elapsed 305 is
 * frame 20551 and delayed-confirm elapsed 305 is frame 20581.
 */
export const PARTY_SENDOUT_BLANK_MESSAGE_START = 305;
export const PARTY_SENDOUT_ACTION_MENU_START = PARTY_SENDOUT_BLANK_MESSAGE_START + 6;
/**
 * pfr192 (ISSUES #146 remainder): the player's faint-replacement send-in is keyed on (species, nickname length, nature, scene) like the
 * ROM's forced-player chain (docs/pfr185-player-faint-replacement-send-in.md): the ball spawns at B = 91 + length(name) frames after the
 * SEND OUT confirm and the action prompt follows at B + D + 17.  The MAGBY / Scene ON constants above are the default (`timing` absent:
 * the canonical turn-15..17 trace, whose party select never leaves this clock).  Every ball-relative rung (ball, release, healthbox slide)
 * is MAGBY's calibration shifted by `ballShift` (+ `releaseExtra` for CASTFORM's late release); `readyAt` is where the span hands the
 * lifecycle on (the prompt minus any following turn-end + next-command handoff, which sit INSIDE the ROM's B + D + 17).
 */
export type PartySendOutTiming = Readonly<{
  ballShift: number;
  releaseExtra: number;
  readyAt: number;
  blankStart: number;
  goTextChars: number;
}>;
export const PARTY_SENDOUT_DEFAULT_TIMING: PartySendOutTiming = Object.freeze({
  ballShift: 0,
  releaseExtra: 0,
  readyAt: PARTY_SENDOUT_ACTION_MENU_START,
  blankStart: PARTY_SENDOUT_BLANK_MESSAGE_START,
  goTextChars: PARTY_SENDOUT_GO_TEXT.length,
});
/** True once the ordinary battle action controller owns input again. */
export function partySendOutBattleMenuReady(elapsed: number, timing: PartySendOutTiming = PARTY_SENDOUT_DEFAULT_TIMING): boolean {
  return elapsed >= timing.readyAt;
}
/** The elapsed the MAGBY-calibrated ball, release and healthbox-slide rungs see: ball-relative, and CASTFORM's whole post-spawn timeline (first ball texel included) runs one frame late (pfr192 dense ROM frames). */
export function partySendOutReleaseClock(elapsed: number, timing: PartySendOutTiming = PARTY_SENDOUT_DEFAULT_TIMING): number {
  return elapsed - timing.ballShift - timing.releaseExtra;
}
/** Re-anchor the freshly-created action-menu bounce task onto its original generator. */
export function partySendOutMenuBounceTick(elapsed: number): number {
  return elapsed - PARTY_SENDOUT_ACTION_MENU_START + 1748;
}

export type PartySendOutBallPhase = "none" | "closed" | "spin" | "landed";

/** Visible-only ownership; MAGBY and the particle system start after this rung. */
export function partySendOutBallPhase(elapsed: number): PartySendOutBallPhase {
  if (elapsed < PARTY_SENDOUT_BALL_VISIBLE_START) return "none";
  if (elapsed < PARTY_SENDOUT_BALL_SPIN_START) return "closed";
  if (elapsed <= PARTY_SENDOUT_BALL_LAST_VISIBLE) return "spin";
  return "landed";
}

/**
 * Relative clock shared by the released battler, its clean open-particle
 * burst, and the normal-palette fade.  Keeping this downstream of
 * `sendOutElapsed` makes delayed confirmation replay the same mechanism.
 */
export function partySendOutReleaseLogicalTick(elapsed: number): number | null {
  if (elapsed < PARTY_SENDOUT_RELEASE_VISIBLE_START) return null;
  return elapsed - PARTY_SENDOUT_RELEASE_VISIBLE_START;
}

/** SEND-OUT-relative player-healthbox x2, or null before first visibility. */
export function partySendOutHealthboxDx(elapsed: number): number | null {
  // Creation/population occurs on VISIBLE_START while the objects remain
  // wholly offscreen; x2=110 reaches the display on the next VBlank.
  if (elapsed < PARTY_SENDOUT_HEALTHBOX_SLIDE_START) return null;
  const age = elapsed - PARTY_SENDOUT_HEALTHBOX_SLIDE_START;
  if (age >= PARTY_SENDOUT_HEALTHBOX_SLIDE_SPAN) return 0;
  return PARTY_SENDOUT_HEALTHBOX_START_DX - PARTY_SENDOUT_HEALTHBOX_STEP * age;
}

/**
 * The battle field begins at BLDY=15 and brightens one coefficient per
 * rendered VBlank.  This is deliberately separate from the party fade:
 * it is anchored to SEND OUT's confirmation edge and uses the transferred
 * field PPU state as its palette source.
 */
export function partySendOutBattleFadeBldy(elapsed: number): number {
  return Math.max(0, 15 - Math.max(0, elapsed - PARTY_SENDOUT_BATTLE_FADE_IN_START));
}

/** FAST text speed: one charged character per VBlank, including the space. */
export function partySendOutGoTextVisibleChars(elapsed: number, timing: PartySendOutTiming = PARTY_SENDOUT_DEFAULT_TIMING): number {
  return Math.max(0, Math.min(timing.goTextChars, elapsed - PARTY_SENDOUT_GO_TEXT_START + 1));
}

export function partySendOutPhase(elapsed: number, timing: PartySendOutTiming = PARTY_SENDOUT_DEFAULT_TIMING): PartySendOutPhase {
  if (elapsed < PARTY_SENDOUT_FADE_OUT_START) return "submenuHold";
  if (elapsed < PARTY_SENDOUT_BLACK_START) return "fadingOut";
  if (elapsed < PARTY_SENDOUT_BATTLE_FADE_IN_START) return "black";
  if (elapsed >= timing.readyAt) return "actionMenu";
  if (elapsed < timing.blankStart) return "battleFadeIn";
  return "blankMessage";
}

/** The list is usable only after its press-relative fade-in has settled. */
export const PARTY_LIST_INPUT_ELAPSED = PARTY_ENTRY_SETTLED_START;

// RAM-derived from `dump-party-icon-bounce.py`, documented in
// docs/party-menu-notes.md.  The normal full-HP icon animation has a
// 7/8-frame cadence (the trailing JUMP stretches one half by a frame); both
// full-HP icons share the two-frame cadence while ONIX's fainted animNum=4
// keeps bitmap frame 0.  The two-frame 20205-20207 global pause is expressed
// relative to party-menu entry, so delayed dismiss traces keep the same OAM.
const FULL_ICON_FRAME1_START = 160;
const FULL_ICON_PERIOD = 15;
const FULL_ICON_FRAME1_HOLD = 8;
const PARTY_ICON_GLOBAL_STALL_START = 214;
const PARTY_ICON_GLOBAL_STALL_FRAMES = 2;

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/** Bitmap frame for MAGBY/BAYLEEF at this menu-relative render tick. */
export function fullPartyIconFrame(elapsed: number): 0 | 1 {
  const runningElapsed = elapsed - (elapsed >= PARTY_ICON_GLOBAL_STALL_START + PARTY_ICON_GLOBAL_STALL_FRAMES ? PARTY_ICON_GLOBAL_STALL_FRAMES : 0);
  return mod(runningElapsed - FULL_ICON_FRAME1_START, FULL_ICON_PERIOD) < FULL_ICON_FRAME1_HOLD ? 1 : 0;
}


/** ONIX animNum=4's selected y2 bounce: -3 for 30 frames, +1 for 31. */
export function onixSelectedHopY2(elapsed: number): -3 | 1 {
  return mod(elapsed - 154, 61) < 31 ? 1 : -3;
}

/**
 * The renderer consumes this state-derived layer list, never trace ticks or
 * captured icon pixels.  The five icon-free chrome variants are only panel/
 * text/palette snapshots; every OBJ texel is drawn below from ROM extraction.
 */
export function partyMenuLayers(state: PartySelectState): PartyMenuLayers {
  const [first, second, third] = state.party;
  const fullFrame = fullPartyIconFrame(state.elapsed);
  // `Task_HandleChooseMonInput` removes the SEND OUT window on the first
  // fade VBlank but leaves the party rows and their live OBJ icons in place.
  // The exit chrome is source-erased like the settled variants; it is not a
  // transition screenshot and is still fed through the palette fade below.
  if (state.sendOutElapsed !== null && state.sendOutElapsed >= PARTY_SENDOUT_FADE_OUT_START) {
    const y2: -3 | 1 = fullFrame === 1 ? 1 : -3;
    return {
      chromeKey: fullFrame === 1 ? "sendOutExit" : "sendOutExitFrame0",
      icons: [
        { partyIndex: 0, species: first.species, frame: 0, selected: false, x2: 0, y2: -4 },
        { partyIndex: 1, species: second.species, frame: fullFrame, selected: true, x2: 0, y2 },
        { partyIndex: 2, species: third.species, frame: fullFrame, selected: false, x2: -4, y2: 0 },
      ],
      status: fullFrame === 1 ? "magby" : "normal",
    };
  }
  if (state.submenuOpen) {
    return {
      chromeKey: "submenu",
      icons: [
        { partyIndex: 0, species: first.species, frame: 0, selected: false, x2: 0, y2: -4 },
        { partyIndex: 1, species: second.species, frame: 1, selected: true, x2: 0, y2: 1 },
        { partyIndex: 2, species: third.species, frame: 1, selected: false, x2: -4, y2: 0 },
      ],
      status: "magby",
    };
  }
  if (state.cursor === 0) {
    const y2 = onixSelectedHopY2(state.elapsed);
    return {
      // The persisted chrome is deliberately icon-free only at the source
      // frame it was harvested from.  During entry, UpdateMonIconFrame's
      // queued copy reaches OBJ VRAM one VBlank after its command advance:
      // the first visible BAYLEEF/MAGBY frame is frame 1, so use the
      // matching, still press-relative chrome layer rather than exposing a
      // frame-0 erase sentinel through frame-1 transparency.
      chromeKey: y2 === 1 && fullFrame === 1 ? "listOnixMidHop" : fullFrame === 1 ? "listOnixFrame1" : "listOnix",
      icons: [
        { partyIndex: 0, species: first.species, frame: 0, selected: true, x2: 0, y2 },
        { partyIndex: 1, species: second.species, frame: fullFrame, selected: false, x2: -4, y2: 0 },
        { partyIndex: 2, species: third.species, frame: fullFrame, selected: false, x2: -4, y2: 0 },
      ],
      status: "normal",
    };
  }
  const y2: -3 | 1 = fullFrame === 1 ? 1 : -3;
  return {
    chromeKey: fullFrame === 1 ? "listMagbyMidHop" : "listMagby",
    icons: [
      { partyIndex: 0, species: first.species, frame: 0, selected: false, x2: 0, y2: -4 },
      { partyIndex: 1, species: second.species, frame: fullFrame, selected: true, x2: 0, y2 },
      { partyIndex: 2, species: third.species, frame: fullFrame, selected: false, x2: -4, y2: 0 },
    ],
    status: fullFrame === 1 ? "magby" : "normal",
  };
}

export function advancePartySelect(state: PartySelectState, newKeys: ReadonlySet<GbaButton>): PartySelectState {
  const next = {
    ...state,
    elapsed: state.elapsed + 1,
    sendOutElapsed: state.sendOutElapsed === null ? null : state.sendOutElapsed + 1,
  };
  if (next.sendOutElapsed !== null || next.elapsed < PARTY_LIST_INPUT_ELAPSED) return next;
  if (next.summary !== null) {
    // The summary screen owns the screen and every key (sum241, battlePartySummary.ts).
    const summary = stepBattlePartySummary(next.summary, newKeys, next.summaryMons);
    if (battlePartySummaryReturned(summary)) return { ...next, summary: null };
    if (battlePartySummaryExitBegins(next.summary, summary)) {
      // CB2_ReturnToPartyMenuFromSummaryScreen: the menu re-inits on gLastViewedMonIndex with its action window open at row 0
      // and PARTY_MSG_DO_WHAT_WITH_MON; those fields land now so the exit fade-in reveals the re-inited menu.
      const cursor = summary.selectedSlot as 0 | 1 | 2;
      return {
        ...next,
        summary,
        cursor,
        rightColumnCursor: cursor === 0 ? next.rightColumnCursor : cursor,
        submenuOpen: true,
        actionCursor: 0,
        message: null,
      };
    }
    return { ...next, summary };
  }
  if (next.message !== null) {
    // TextPrinterWait (text.c:884-899): the refusal message's A / B press, read only once the printer is done.
    const step = stepPartyMessage(next.message, next, newKeys.has("A") || newKeys.has("B"));
    if (step.accepted) playSelectSe();
    return { ...next, ...step.clock, message: step.cleared ? null : next.message };
  }
  if (next.submenuOpen) {
    // The SEND OUT / SUMMARY / CANCEL window (Task_TryCreateSelectionWindow -> Task_HandleSelectionMenuInput,
    // Menu_ProcessInputNoWrapAround_other): A runs the row under the action cursor, B runs CANCEL (CursorCb_Cancel1, back to
    // the list on the same slot), UP / DOWN move the action cursor without wrapping (sum241; SUMMARY was unreachable before).
    if (newKeys.has("A")) {
      if (next.cursor === "cancel") return next;
      // APressMuted window: each CursorCb_* (CancelCb1, Summary, SendMon) is the one SE_SELECT of an A.
      playSelectSe();
      if (next.actionCursor === PARTY_ACTION_CANCEL) return { ...next, submenuOpen: false, actionCursor: 0 };
      if (next.actionCursor === PARTY_ACTION_SUMMARY) return { ...next, summary: openBattlePartySummary(next.cursor, next.summaryMons) };
      const selected = next.party[next.cursor];
      if (!selected.legal) {
        // TrySwitchInPokemon (party_menu.c:5811-5823) tests the slot's HP
        // first: any zero-HP member -- the slot that just went down or an
        // earlier casualty in the same battle -- refuses with "has no energy";
        // only a still-living outgoing slot (ISSUES #89, Baton Pass's own
        // switch) refuses with "is already in battle". Either way the submenu
        // must close and show a real message, not silently no-op (a no-op here
        // left the driver's DOWN/A cycle permanently stuck, since DOWN is
        // refused while the submenu is open).
        return {
          ...next,
          submenuOpen: false,
          actionCursor: 0,
          ...PARTY_MESSAGE_CLOCK_START,
          message: selected.hp === 0
            ? `${selected.species} has no energy\nleft to battle!`
            : `${selected.species} is already\nin battle!`,
        };
      }
      return { ...next, sendOutElapsed: 0 };
    }
    if (newKeys.has("B")) {
      // Task_HandleSelectionMenuInput's MENU_B_PRESSED SE, then CursorCb_Cancel1's.
      playSelectSe();
      playSelectSe();
      return { ...next, submenuOpen: false, actionCursor: 0 };
    }
    const actionDirection = partyActionWindowDirection(newKeys);
    if (actionDirection === undefined) return next;
    const actionCursor = movePartyActionCursor(next.actionCursor, actionDirection);
    // Menu_ProcessInputNoWrapAround_other sounds only when the cursor moved.
    if (actionCursor !== next.actionCursor) playSelectSe();
    return { ...next, actionCursor };
  }
  // HandleChooseMonCancel, PARTY_ACTION_SEND_OUT (party_menu.c:1378-1384): B and A on the CANCEL button only play SE_FAILURE;
  // the menu stays until a replacement is sent out.
  if (newKeys.has("B") || (newKeys.has("A") && next.cursor === "cancel")) {
    playFailureSe();
    return next;
  }
  // HandleChooseMonSelection default branch: SE_SELECT, then Task_TryCreateSelectionWindow.
  // DisplaySelectionWindow: InitMenuInUpperLeftCorner(..., cursorPos 0, ...) -- the window always opens on SEND OUT.
  if (newKeys.has("A")) {
    playSelectSe();
    return { ...next, submenuOpen: true, actionCursor: 0 };
  }
  const direction = partyMenuDirection(newKeys);
  if (direction === undefined) return next;
  const moved = { ...next, ...movePartyMenuCursor(next, direction) };
  // UpdateCurrentPartySelection sounds only when the slot changed.
  if (moved.cursor !== next.cursor) playSelectSe();
  return moved;
}

function selectedPartyIndex(state: PartySelectState): BattlePartyIndex {
  if (state.cursor === "cancel") throw new Error("party select: the CANCEL button names no party slot");
  return state.party[state.cursor].partyIndex;
}

/**
 * Bridges a confirmed SEND OUT choice through the ordinary immutable battle
 * boundary. Before confirmation presentation owns the interaction and this
 * returns null; no separate semantic-event acknowledgement is introduced.
 */
export function submitPartySelectBattleDecision<
  RulesState extends BattleJsonObject,
>(
  battleState: BattleState<RulesState>,
  presentation: PartySelectState,
  reducer: BattleDecisionReducer<RulesState>,
): BattleDecisionTransitionResult<RulesState> | null {
  if (presentation.sendOutElapsed === null) return null;
  return submitBattleDecision(
    battleState,
    {
      requestId: presentation.request.requestId,
      side: presentation.request.side,
      decision: {
        kind: "switch",
        partyIndex: selectedPartyIndex(presentation),
      },
    },
    reducer,
  );
}
