// Forced player-switch party menu state.  Rendering is intentionally kept
// separate: this reducer only owns the button-gated cursor/action sequence.
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
import { createFactoryCorpusPartyMember } from "./factoryCorpusParty.ts";

export type PartySelectCursor = "onix" | "magby";
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
  submenuOpen: boolean;
  /** Null until SEND OUT is confirmed; then frames since that input edge. */
  sendOutElapsed: number | null;
  /** Source party-menu refusal text; null during ordinary list/submenu input. */
  message: string | null;
  /** Immutable kernel request whose selection this presentation owns. */
  request: BattleForcedSwitchRequest;
  /** Full round identities/live HP used to construct the three visible rows. */
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
  const party = playerRentalRecords.map((record, index): PartySelectMember => {
    const partyIndex = index as 0 | 1 | 2;
    const corpusMember = createFactoryCorpusPartyMember(record);
    const battleMember = playerParty[partyIndex]!;
    const species = partySpeciesName(corpusMember.speciesName);
    if (partySpeciesName(battleMember.species) !== species) {
      throw new Error(
        `playerParty[${partyIndex}] species ${battleMember.species} does not match rental record species ${species}`,
      );
    }
    if (battleMember.maxHp !== corpusMember.maxHP) {
      throw new Error(
        `playerParty[${partyIndex}] max HP ${battleMember.maxHp} does not match rental record max HP ${corpusMember.maxHP}`,
      );
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
      fainted: partyIndex === request.faintedPartyIndex,
      legal: legalIndexes.has(partyIndex),
      item: corpusMember.item,
    });
  }) as unknown as readonly [PartySelectMember, PartySelectMember, PartySelectMember];

  const faintedPartyIndex = request.faintedPartyIndex as 0 | 1 | 2;
  if (party[faintedPartyIndex].hp !== 0) {
    throw new Error("party-select presentation requires the requested fainted member to have zero HP");
  }
  for (const legalPartyIndex of request.legalPartyIndexes) {
    if (
      legalPartyIndex > 2
      || party[legalPartyIndex as 0 | 1 | 2].hp === 0
    ) {
      throw new Error(
        `party-select presentation legal replacement ${legalPartyIndex} must be a living member of the three-mon Factory party`,
      );
    }
  }

  return {
    elapsed: 0,
    cursor: "onix",
    submenuOpen: false,
    sendOutElapsed: null,
    message: null,
    request,
    party,
  };
}

/**
 * The pre-seam canonical state remains an independent equivalence baseline.
 * The live route in core.ts constructs the same value through the generic
 * request/round-record entry point above.
 */
export const INITIAL_PARTY_SELECT_STATE: PartySelectState = {
  elapsed: 0,
  cursor: "onix",
  submenuOpen: false,
  sendOutElapsed: null,
  message: null,
  request: CANONICAL_FORCED_SWITCH_REQUEST,
  party: [
    {
      partyIndex: 0, id: "onix", speciesId: 95, speciesKey: "SPECIES_ONIX",
      species: "ONIX", level: 50, hp: 0, maxHp: 117,
      status: "none", personality: 1205102525, abilitySlot: 1,
      friendship: 0, fainted: true, legal: false, item: 0,
    },
    {
      partyIndex: 1, id: "magby", speciesId: 240, speciesKey: "SPECIES_MAGBY",
      species: "MAGBY", level: 50, hp: 138, maxHp: 138,
      status: "none", personality: 1534575931, abilitySlot: 0,
      friendship: 0, fainted: false, legal: true, item: 0,
    },
    {
      partyIndex: 2, id: "bayleef", speciesId: 153, speciesKey: "SPECIES_BAYLEEF",
      species: "BAYLEEF", level: 50, hp: 153, maxHp: 153,
      status: "none", personality: 1550278706, abilitySlot: 0,
      friendship: 0, fainted: false, legal: true, item: 0,
    },
  ],
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
/** True once the ordinary battle action controller owns input again. */
export function partySendOutBattleMenuReady(elapsed: number): boolean {
  return elapsed >= PARTY_SENDOUT_ACTION_MENU_START;
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
export function partySendOutGoTextVisibleChars(elapsed: number): number {
  return Math.max(0, Math.min(PARTY_SENDOUT_GO_TEXT.length, elapsed - PARTY_SENDOUT_GO_TEXT_START + 1));
}

export function partySendOutPhase(elapsed: number): PartySendOutPhase {
  if (elapsed < PARTY_SENDOUT_FADE_OUT_START) return "submenuHold";
  if (elapsed < PARTY_SENDOUT_BLACK_START) return "fadingOut";
  if (elapsed < PARTY_SENDOUT_BATTLE_FADE_IN_START) return "black";
  if (elapsed < PARTY_SENDOUT_BLANK_MESSAGE_START) return "battleFadeIn";
  if (elapsed < PARTY_SENDOUT_ACTION_MENU_START) return "blankMessage";
  return "actionMenu";
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
  if (state.cursor === "onix") {
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
  if (next.message !== null) {
    return newKeys.has("A") || newKeys.has("B")
      ? { ...next, message: null }
      : next;
  }
  if (!next.submenuOpen && newKeys.has("DOWN")) return { ...next, cursor: "magby" };
  if (newKeys.has("A")) {
    if (!next.submenuOpen) return { ...next, submenuOpen: true };
    const selected = next.party.find((member) => member.partyIndex === selectedPartyIndex(next));
    if (!selected?.legal) {
      return selected?.fainted
        ? {
            ...next,
            submenuOpen: false,
            message: `${selected.species} has no energy\nleft to battle!`,
          }
        : next;
    }
    return { ...next, sendOutElapsed: 0 };
  }
  return next;
}

function selectedPartyIndex(state: PartySelectState): BattlePartyIndex {
  return state.cursor === "onix"
    ? state.request.faintedPartyIndex
    : state.request.legalPartyIndexes[0]!;
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
