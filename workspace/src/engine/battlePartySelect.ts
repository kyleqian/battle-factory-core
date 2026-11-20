import partyMenuSourceData from "../assets/gen/party-menu-source.json" with { type: "json" };
import partyMenuGenderGlyphsData from "../assets/gen/party-menu-gender-glyphs.json" with { type: "json" };
import partyMonIconsData from "../assets/gen/party-mon-icons.json" with { type: "json" };
import partyMenuHeldItemData from "../assets/gen/party-menu-held-item.json" with { type: "json" };
import partyMenuContentData from "../assets/gen/party-menu-content.json" with { type: "json" };
import partyMenuSpriteCoordsData from "../assets/gen/party-menu-sprite-coords.json" with { type: "json" };
import partyMenuPokeballData from "../assets/gen/party-menu-pokeball.json" with { type: "json" };
import stdWindowData from "../assets/gen/prebattle-room-std-window.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import fontSmallData from "../data/gen/font-small.json" with { type: "json" };
import speciesNamesData from "../data/gen/species-names.json" with { type: "json" };
import summaryInfoData from "../data/gen/summary-info.json" with { type: "json" };
import type { GbaButton } from "../input.ts";
import {
  BATTLE_SCRIPT_STATUS1_BURN,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS1_POISON,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
} from "./battleScriptSourceConstants.ts";
import type {
  BattleCommandRequest,
  BattlePartyIndex,
} from "./battleDecisionBoundary.ts";
import type { BattleStatus, FactoryRentalParty } from "./battleScenario.ts";
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
  type BattlePartyActionCursor,
  type BattlePartyActions,
  type BattlePartySummaryMons,
} from "./battlePartySummary.ts";
import type { SummaryScreenState } from "./summaryScreen.ts";
import { battlePartyDisplayRows, IDENTITY_BATTLE_PARTY_ORDER, type BattlePartyCurrentOrder } from "./battlePartyOrder.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { voluntarySwitchTrap } from "./battleSwitchTrap.ts";
import { getMonGender, type MonGender } from "./monGender.ts";
import type { PartySelectState } from "./partySelect.ts";
import { movePartyMenuCursor, partyMenuDirection, type PartyMenuCursor } from "./partyMenuCursor.ts";
import { playSelectSe } from "./screenSounds.ts";
import type { RgbColor } from "./bg.ts";
import { blendComponentToBlack } from "./paletteFade.ts";
import { PARTY_MESSAGE_CLOCK_START, partyMessageLines, stepPartyMessage } from "./partyMenuMessage.ts";
import { fillFramebuffer, setPixel } from "./framebuffer.ts";
import { drawText, drawGlyphCodes, codeForChar, type FontData } from "./font.ts";
import {
  drawStandardWindowFrame,
  drawStandardWindowText,
  MESSAGE_PALETTE,
  MESSAGE_TEXT_COLORS,
} from "./prebattleRoomRender.ts";

export const PARTY_NO_ENERGY_LINE_1_SUFFIX = " has no energy";
export const PARTY_NO_ENERGY_LINE_2 = "left to battle!";
export const PARTY_ALREADY_IN_BATTLE_LINE_1_SUFFIX = " is already";
export const PARTY_ALREADY_IN_BATTLE_LINE_2 = "in battle!";

export type BattlePartySelectCursor = PartyMenuCursor;

/**
 * Primary (non-volatile) status as a party-menu status-icon variant name,
 * mirroring the banked `party-menu-content.json` `statusIcons.frames` keys.
 */
export type PartyMenuPrimaryStatus =
  | "poison"
  | "paralyzed"
  | "sleep"
  | "frozen"
  | "burn"
  | "faint"
  | null;

/**
 * GetAilmentFromStatus -> status-icon frame: the frame index is the ailment
 * (PSN/PRZ/SLP/FRZ/BRN) minus one, so the primary status maps one-to-one
 * onto the banked variant. `AILMENT_NONE` renders no sprite (and, per
 * DisplayPartyPokemonLevelCheck, keeps the level line).
 */
export function primaryStatusFromStatus1(status1: number): PartyMenuPrimaryStatus {
  if ((status1 & (BATTLE_SCRIPT_STATUS1_POISON | BATTLE_SCRIPT_STATUS1_TOXIC_POISON)) !== 0) return "poison";
  if ((status1 & BATTLE_SCRIPT_STATUS1_PARALYSIS) !== 0) return "paralyzed";
  if ((status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0) return "sleep";
  if ((status1 & BATTLE_SCRIPT_STATUS1_FREEZE) !== 0) return "frozen";
  if ((status1 & BATTLE_SCRIPT_STATUS1_BURN) !== 0) return "burn";
  return null;
}

/**
 * GetMonAilment (party_menu.c:1924-1936): 0 HP is AILMENT_FNT before any
 * status is consulted. The status-icon sprite replaces the "Lv" line for every
 * ailment but NONE / PKRS (DisplayPartyPokemonLevelCheck, party_menu.c:2300).
 */
export function partyMenuAilment(
  hp: number,
  status: PartyMenuPrimaryStatus,
): PartyMenuPrimaryStatus {
  return hp === 0 ? "faint" : status;
}

function primaryStatusFromBattleStatus(status: BattleStatus): PartyMenuPrimaryStatus {
  switch (status) {
    case "none":
      return null;
    case "poison":
    case "toxic":
      return "poison";
    case "paralysis":
      return "paralyzed";
    case "sleep":
      return "sleep";
    case "freeze":
      return "frozen";
    case "burn":
      return "burn";
  }
}

export type BattlePartySelectRow = Readonly<{
  /** Raw party index: the kernel decision a confirmed row names. */
  partyIndex: 0 | 1 | 2;
  /** Menu row the card is drawn in (the ROM's battle order); equals the array index and the cursor value. */
  slot: 0 | 1 | 2;
  species: number;
  speciesKey: string;
  name: string;
  level: number;
  hp: number;
  maxHP: number;
  fainted: boolean;
  active: boolean;
  legal: boolean;
  gender: MonGender;
  /** Source party record's held item (`ITEM_NONE` hides the icon). */
  item: number;
  /** GetMonAilment result (FNT first, then status1); non-null hides the "Lv50" line and draws the status icon. */
  status: PartyMenuPrimaryStatus;
}>;

export type BattlePartySelectState = Readonly<{
  requestId: number;
  /** TrySwitchInPokemon's PARTY_ACTION_CANT_SWITCH / ABILITY_PREVENTS refusal text for a bench pick; null when the switch is not trapped. */
  trapMessage?: string | null;
  rows: readonly [
    BattlePartySelectRow,
    BattlePartySelectRow,
    BattlePartySelectRow,
  ];
  cursor: BattlePartySelectCursor;
  rightColumnCursor: 1 | 2;
  submenuOpen: boolean;
  /**
   * True once the SEND OUT submenu has ever opened (the A-press edge at
   * frames 922-923 in the mid-battle-switch fixture). The oracle's mon-icon
   * animation clock stalls by 2 frames during the submenu-open processing and
   * never catches back up, so this stays set through the close
   * (docs/fade-layer-forensics.md §7(e)) -- unlike `submenuOpen`, which clears
   * on the confirm edge.
   */
  submenuOpened: boolean;
  /**
   * Frames since the submenu first opened (0 on the A-press edge, then
   * incrementing each tick while `submenuOpen`). The oracle pops the submenu
   * window 3 frames after that edge (A-press 922-923, window + swapped message
   * window land together at 926; docs/fade-layer-forensics.md §10(d)), so the
   * render gates the action window + message-window swap on
   * `>= SUBMENU_OPEN_VISUAL_DELAY` -- before that the pre-open state (wide
   * "Choose a POKéMON." window + CANCEL button) is held.
   */
  submenuOpenElapsed: number;
  /** sPartyMenuAction_ShiftSummaryCancel ("shift", voluntary) or sPartyMenuAction_SendOutSummaryCancel ("sendOut", forced): the window's first row. */
  actions: BattlePartyActions;
  /**
   * The action window's own cursor (sum241, Task_HandleSelectionMenuInput): 0 = SHIFT / SEND OUT, 1 = SUMMARY, 2 = CANCEL.
   * DisplaySelectionWindow re-creates the window at 0 every time it opens.
   */
  actionCursor: BattlePartyActionCursor;
  /** The three rows' summary presentations in menu order; null when the menu was built without rental records (SUMMARY then throws). */
  summaryMons: BattlePartySummaryMons | null;
  /**
   * Non-null from the SUMMARY press (CursorCb_Summary) until the summary's exit fade has settled on the re-inited menu
   * (CB2_ReturnToPartyMenuFromSummaryScreen); while set it owns input, and the composition root draws it over this menu.
   */
  summary: SummaryScreenState | null;
  message: string | null;
  /** Print / dismiss clock of `message` (partyMenuMessage.ts); meaningless while `message` is null. */
  messageElapsed: number;
  messageDismissElapsed: number | null;
  outcome:
    | null
    | Readonly<{ kind: "cancel" }>
    | Readonly<{ kind: "select"; partyIndex: BattlePartyIndex }>;
  elapsed: number;
  /**
   * Frames since the POKéMON A-press that opened this selector (oracle frame
   * 763), mirroring `closeElapsed`. Drives the open animation
   * (`battlePartySelectOpenPhase`): bright-hold 0-2, field-fade-out 3-18,
   * black-hold 19-45, menu-fade-in 46-61, done 62+. Increments alongside
   * `elapsed`; ignored once `closeElapsed` is set (the close takes over).
   */
  openElapsed: number;
  /**
   * The `elapsed` value when the current cursor slot was last selected (the
   * party menu's `AnimatePartySlot(slot, 1)` edge). Drives the selected
   * mon-icon bounce's initial y2 hold and phase. Initialized to
   * `MON_ICON_CREATION_ELAPSED_OFFSET` so a menu-open selection is treated as
   * having happened at icon creation (the hold is already over).
   */
  selectedSinceElapsed: number;
  /**
   * Frames since the SEND OUT confirm edge (the tick that set `outcome`), or
   * null before it. The voluntary-switch teardown keeps the settled menu on
   * screen through the real menu-close cadence
   * (`docs/mid-battle-switch-presentation-ground-truth.md` §2: menu visible
   * to 1019, fade 1019-1034, field idle 1035-1043, recall printstring 1044)
   * before the orchestrator clears the selector and hands the switch to the
   * resolution presentation -- see `battlePartySelectClosePhase`.
   */
  closeElapsed: number | null;
}>;

export type BattlePartySelectClosePhase =
  | "menu-hold"
  | "menu-fade"
  | "black-hold"
  | "field-reveal"
  | "field-hold"
  | "done";

/**
 * Open schedule (docs/fade-layer-forensics.md §6(g), ISSUES #80 open remainder
 * item (b)): the party menu's open animation. The A-press on POKéMON completes
 * at oracle frame 763 (`openElapsed 0`); the oracle holds the settled battle
 * scene through 765, fades the whole field out 766-781 (BG at y_bg, the OBJ
 * layer one blend step behind -- no BG/OBJ split for the battle scene), holds
 * solid black 782-808, then fades the party menu in from black 809-824 (BG at
 * `y_bg`, OBJ one tick behind at `y_obj`, layer-split blend). From openElapsed
 * 62 (frame 825) the settled menu renders exactly as before.
 */
export type BattlePartySelectOpenPhase =
  | "bright-hold"
  | "field-fade-out"
  | "black-hold"
  | "menu-fade-in"
  | "done";

/** Bright-hold: the settled battle scene, unfaded (frames 763-765). */
export const PARTY_SELECT_OPEN_BRIGHT_HOLD_FRAMES = 3;
/** Field fade-out: the battle scene blended at `y_bg` (frames 766-781). */
export const PARTY_SELECT_OPEN_FIELD_FADE_FRAMES = 16;
/** Full black hold (frames 782-808). */
export const PARTY_SELECT_OPEN_BLACK_HOLD_FRAMES = 27;
/** Menu fade-in from black (frames 809-824). */
export const PARTY_SELECT_OPEN_MENU_FADE_FRAMES = 16;
/** Full open span: bright-hold + field-fade-out + black-hold + menu-fade-in. */
export const PARTY_SELECT_OPEN_TOTAL_FRAMES =
  PARTY_SELECT_OPEN_BRIGHT_HOLD_FRAMES
  + PARTY_SELECT_OPEN_FIELD_FADE_FRAMES
  + PARTY_SELECT_OPEN_BLACK_HOLD_FRAMES
  + PARTY_SELECT_OPEN_MENU_FADE_FRAMES;

/**
 * ISSUES #80 Class B (`docs/fade-layer-forensics.md` §9 RAM probe): the
 * player healthbox sprite's real `y2` steps 0→1 at oracle frame 770
 * (`openElapsed 7`), so from there it is drawn one row lower. Applied as a
 * +1px draw-origin offset on the open field-fade-out's settled scene.
 */
export const PARTY_SELECT_OPEN_HEALTHBOX_Y2_START = 7;
/**
 * ISSUES #80 Class B (`docs/fade-layer-forensics.md` §9 RAM probe): the
 * player back sprite's real `y2` steps 1→0 at oracle frame 779
 * (`openElapsed 16`), so from there it is drawn one row higher. Applied as a
 * −1px draw-origin offset on the open field-fade-out's settled scene.
 */
export const PARTY_SELECT_OPEN_BACK_SPRITE_Y2_START = 16;

export function battlePartySelectOpenPhase(
  openElapsed: number,
): BattlePartySelectOpenPhase {
  if (openElapsed < PARTY_SELECT_OPEN_BRIGHT_HOLD_FRAMES) return "bright-hold";
  if (
    openElapsed
    < PARTY_SELECT_OPEN_BRIGHT_HOLD_FRAMES + PARTY_SELECT_OPEN_FIELD_FADE_FRAMES
  ) {
    return "field-fade-out";
  }
  if (
    openElapsed
    < PARTY_SELECT_OPEN_BRIGHT_HOLD_FRAMES
      + PARTY_SELECT_OPEN_FIELD_FADE_FRAMES
      + PARTY_SELECT_OPEN_BLACK_HOLD_FRAMES
  ) {
    return "black-hold";
  }
  if (openElapsed < PARTY_SELECT_OPEN_TOTAL_FRAMES) return "menu-fade-in";
  return "done";
}

/**
 * Field fade-out BG coefficient, `docs/fade-layer-forensics.md` §6(b):
 * `y_bg(e) = min(16, 2 * max(0, floor((e - 1) / 2)))` -- steps 2,4,...,16
 * each held 2 frames. The battle scene has no OBJ/BG split, so the whole
 * draw is blended at `y_bg`; the OBJ pixels stay one blend step bright on
 * the odd `e` frames (known residual, excluded from the spec).
 */
export function partySelectOpenFieldFadeBgY(openElapsed: number): number {
  return Math.min(16, 2 * Math.max(0, Math.floor((openElapsed - 1) / 2)));
}

/**
 * Field fade-out OBJ coefficient, `docs/fade-layer-forensics.md` §6(b):
 * `y_obj(e) = min(16, 2 * max(0, floor((e - 2) / 2)))` -- the OBJ layer is
 * exactly one blend step behind the BG (`objPaletteToggle` alternation). On
 * the even `e` frames (766/768/.../780) `y_obj = y_bg - 2`, so a single
 * whole-frame blend cannot be right there; the OBJ pixels must be blended
 * at `y_obj` (ISSUES #80 Class A).
 */
export function partySelectOpenFieldFadeObjY(openElapsed: number): number {
  return Math.min(16, 2 * Math.max(0, Math.floor((openElapsed - 2) / 2)));
}

/**
 * Menu fade-in coefficients, `docs/fade-layer-forensics.md` §2, with
 * `m = openElapsed - 46` (m = 0..15): `y_bg(m) = 14 - 2 * floor(m / 2)`
 * (14,14,12,12,...,0,0) and the OBJ layer one blend step behind,
 * `y_obj(m) = 16 - 2 * floor((m + 1) / 2)` (16,14,14,12,...,2,0). Both
 * descend toward 0 (full brightness); the menu is drawn BG-then-OBJ and
 * each layer blended at its own coefficient.
 */
export function partySelectOpenMenuFadeBgY(m: number): number {
  return 14 - 2 * Math.floor(m / 2);
}

export function partySelectOpenMenuFadeObjY(m: number): number {
  return 16 - 2 * Math.floor((m + 1) / 2);
}

/**
 * Measured close schedule (docs/party-menu-rank6-ground-truth.md §7 +
 * docs/fade-layer-forensics.md §1, oracle-verified against
 * `mid-battle-switch-dense-a-off`): confirm A at 963; menu fade-out 965-979
 * (standard fade-to-black, y=2..16 held 2 frames each -- the OBJ layer trails
 * the BG by exactly one blend step, `objPaletteToggle`); full black 980-1018;
 * battle field fades in from black 1019-1034 (16 frames); field idle
 * 1035-1043; recall first glyph 1044. closeElapsed 0 is the confirm tick
 * (fixture frame 963), so:
 *   menu-hold    0-1  = frames 963-964
 *   menu-fade    2-16 = frames 965-979
 *   black-hold   17-55 = frames 980-1018
 *   field-reveal 56-71 = frames 1019-1034
 *   field-hold   72-80 = frames 1035-1043
 *   done         81+   = frame 1044+
 */
export const PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES = 2;
/**
 * Menu fade-out window 965-979 (closeElapsed 2-16, y=2..16). Per
 * `docs/fade-layer-forensics.md` §1 the BG blend is `closeElapsed & ~1` and
 * the OBJ blend is one step behind, `(closeElapsed - 1) & ~1` -- frame 979
 * (closeElapsed 16) is the discriminator: BG fully black (y=16), OBJ at
 * y=14.
 */
export const PARTY_SELECT_CLOSE_MENU_FADE_FRAMES = 15;
/** Full black hold 980-1018 (closeElapsed 17-55). */
export const PARTY_SELECT_CLOSE_BLACK_HOLD_FRAMES = 39;
/** Battle field fade-in from black 1019-1034 (closeElapsed 56-71). */
export const PARTY_SELECT_CLOSE_FIELD_REVEAL_FRAMES = 16;
/** Full party-select-visible span 963-1034 (closeElapsed 0-71). */
export const PARTY_SELECT_CLOSE_MENU_FRAMES =
  PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES
  + PARTY_SELECT_CLOSE_MENU_FADE_FRAMES
  + PARTY_SELECT_CLOSE_BLACK_HOLD_FRAMES
  + PARTY_SELECT_CLOSE_FIELD_REVEAL_FRAMES;
/**
 * Field idle 1035-1043 (closeElapsed 72-80) -- the resolution's
 * null-handoff confirm phase holds the settled field before the recall
 * printstring's first glyph lands at fixture frame 1044.
 */
export const PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES = 9;
/** Full close span: confirm edge 963 -> recall first glyph 1044. */
export const PARTY_SELECT_CLOSE_TOTAL_FRAMES =
  PARTY_SELECT_CLOSE_MENU_FRAMES
  + PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES;

/**
 * pic6 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): B / CANCEL on the voluntary in-battle menu closes through the same
 * fade as SHIFT. HandleChooseMonCancel's default action (party_menu.c:1394-1403: SE_SELECT, then Task_ClosePartyMenu) runs
 * BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16, RGB_BLACK) (party_menu.c:1227) and, once black, the battle's exit callback rebuilds
 * the field and fades it in. ROM lab (tools/battle-lab/pic6-party-cancel-{on,off}.json, B first held at trace frame 160; both scenes
 * frame-identical): menu fade 163-177, black 178-216, field fade-in 217-232, field with the empty message box 233-238, "What will
 * RATTATA do?" and the action menu at 239. The SHIFT run of the same lab (A at 206) reaches black at press + 18 and starts the field
 * fade-in at press + 57 too, so the cancel shares PARTY_SELECT_CLOSE_MENU_FRAMES; it then holds the field 6 frames (SHIFT holds 10
 * before the recall text: the engine's 9 + its confirm-edge convention) and the action menu returns.
 */
export const PARTY_SELECT_CANCEL_FIELD_HOLD_FRAMES = 6;
export const PARTY_SELECT_CANCEL_CLOSE_TOTAL_FRAMES =
  PARTY_SELECT_CLOSE_MENU_FRAMES
  + PARTY_SELECT_CANCEL_FIELD_HOLD_FRAMES;

export function battlePartySelectClosePhase(
  closeElapsed: number,
): BattlePartySelectClosePhase {
  if (closeElapsed < PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES) return "menu-hold";
  if (closeElapsed < PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES + PARTY_SELECT_CLOSE_MENU_FADE_FRAMES) {
    return "menu-fade";
  }
  if (
    closeElapsed
    < PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES
      + PARTY_SELECT_CLOSE_MENU_FADE_FRAMES
      + PARTY_SELECT_CLOSE_BLACK_HOLD_FRAMES
  ) {
    return "black-hold";
  }
  if (
    closeElapsed
    < PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES
      + PARTY_SELECT_CLOSE_MENU_FADE_FRAMES
      + PARTY_SELECT_CLOSE_BLACK_HOLD_FRAMES
      + PARTY_SELECT_CLOSE_FIELD_REVEAL_FRAMES
  ) {
    return "field-reveal";
  }
  if (closeElapsed < PARTY_SELECT_CLOSE_TOTAL_FRAMES) return "field-hold";
  return "done";
}

/**
 * Shares the source-composed voluntary selector's row/icon renderer with a
 * request-owned forced selector. Forced cancel semantics remain in
 * partySelect.ts; this is a frozen render projection only.
 */
export function battlePartySelectStateForForcedParty(
  forced: PartySelectState,
): BattlePartySelectState {
  if (forced.cursor !== "cancel" && forced.cursor > 2) {
    return fail(`forced cursor points outside the three-mon party: ${forced.cursor}`);
  }
  const rows = forced.party.map((member, slot): BattlePartySelectRow => Object.freeze({
    partyIndex: member.partyIndex,
    slot: slot as 0 | 1 | 2,
    species: member.speciesId,
    speciesKey: member.speciesKey,
    name: member.species,
    level: member.level,
    hp: member.hp,
    maxHP: member.maxHp,
    fainted: member.fainted,
    active: member.partyIndex === forced.request.faintedPartyIndex,
    legal: member.legal,
    gender: memberGender(member.speciesId, member.personality),
    item: member.item,
    status: partyMenuAilment(member.hp, primaryStatusFromBattleStatus(member.status)),
  })) as unknown as BattlePartySelectState["rows"];
  return Object.freeze({
    requestId: forced.request.requestId,
    rows: Object.freeze(rows),
    cursor: forced.cursor,
    rightColumnCursor: forced.rightColumnCursor,
    submenuOpen:
      forced.submenuOpen
      && (forced.sendOutElapsed === null || forced.sendOutElapsed === 0),
    submenuOpened:
      forced.submenuOpen
      && (forced.sendOutElapsed === null || forced.sendOutElapsed === 0),
    // The forced route renders the submenu already-open (its own edge is not
    // this lane's), so it always reads as past the open-delay window.
    submenuOpenElapsed: forced.submenuOpen ? SUBMENU_OPEN_VISUAL_DELAY : 0,
    actions: "sendOut",
    actionCursor: forced.actionCursor,
    summaryMons: forced.summaryMons,
    summary: forced.summary,
    message: forced.message,
    messageElapsed: forced.messageElapsed,
    messageDismissElapsed: forced.messageDismissElapsed,
    outcome: null,
    elapsed: forced.elapsed,
    openElapsed: 0,
    selectedSinceElapsed: -MON_ICON_CREATION_ELAPSED_OFFSET,
    closeElapsed: null,
  });
}

type SpeciesNameRow = Readonly<{ species: string; name: string }>;
const SPECIES_NAMES = (speciesNamesData as { species: SpeciesNameRow[] }).species;

type SpeciesStatsRow = Readonly<{ dexNumber: number; genderRatio: number }>;
const SPECIES_STATS_BY_ID = new Map(
  (summaryInfoData as { species: SpeciesStatsRow[] }).species.map((row) => [row.dexNumber, row]),
);

/** GetGenderFromSpeciesAndPersonality (src/pokemon.c:3471-3485) for a party member. */
function memberGender(species: number, personality: number): MonGender {
  const stats = SPECIES_STATS_BY_ID.get(species);
  if (stats === undefined) return "male";
  return getMonGender(stats.genderRatio, personality);
}

function fail(message: string): never {
  throw new Error(`battle party select: ${message}`);
}

/**
 * The oracle's in-battle party submenu pops 3 frames after the A-press that
 * opens it: the press lands on fixture frames 922-923, yet frames 923-925
 * still show the pre-open state (wide "Choose a POKéMON." window + CANCEL
 * button) and the full SHIFT/SUMMARY/CANCEL window + swapped message window
 * land together at frame 926, one-frame-pop, no animation
 * (docs/fade-layer-forensics.md §10(d)). The app sets `submenuOpen` on the
 * press edge (the state that renders frame 923), so the submenu visuals are
 * gated on `submenuOpenElapsed >= SUBMENU_OPEN_VISUAL_DELAY` to hold the
 * pre-open frame those 3 frames. Frames 926+ are byte-exact with the delay in
 * place; the mon-icon +2 stall (`submenuOpened`) and the close edge are not
 * part of this gate.
 */
export const SUBMENU_OPEN_VISUAL_DELAY = 3;

/** Constructs the voluntary selector from the live party, never a faint anchor. */
export function createBattlePartySelectState(
  request: BattleCommandRequest,
  rules: BattleScriptRulesContext,
  order: BattlePartyCurrentOrder = IDENTITY_BATTLE_PARTY_ORDER,
  /** The party's rental records: with them SUMMARY shows each row's live summary (sum241); without, SUMMARY throws when pressed. */
  records: FactoryRentalParty | null = null,
): BattlePartySelectState {
  const legal = new Set(
    request.legalDecisions
      .filter((decision) => decision.kind === "switch")
      .map((decision) => decision.partyIndex),
  );
  const activePartyIndex = rules.battlers[request.battler]!.partyIndex;
  const rows = battlePartyDisplayRows(order).map((partyIndex, slot) => {
    const member = rules.party.player[partyIndex]!;
    const species = SPECIES_NAMES[member.species];
    if (
      member.species === 0
      || member.isEgg
      || species === undefined
      || !species.species.startsWith("SPECIES_")
    ) {
      return fail(`player slot ${partyIndex} is not a live Factory Pokémon`);
    }
    return Object.freeze({
      partyIndex,
      slot: slot as 0 | 1 | 2,
      species: member.species,
      speciesKey: species.species,
      name: species.name,
      level: member.level,
      hp: member.hp,
      maxHP: member.maxHP,
      fainted: member.hp === 0,
      active: partyIndex === activePartyIndex,
      legal: legal.has(partyIndex),
      gender: memberGender(member.species, member.personality),
      item: member.item ?? 0,
      status: partyMenuAilment(member.hp, primaryStatusFromStatus1(member.status1 ?? 0)),
    });
  }) as unknown as BattlePartySelectState["rows"];
  const trap = voluntarySwitchTrap(rules, request.battler as 0 | 1);
  let trapMessage: string | null = null;
  if (trap !== null) {
    if (trap.kind === "cant-switch") {
      trapMessage = battlePartyCantSwitchOutMessage(SPECIES_NAMES[rules.party.player[activePartyIndex]!.species]!.name);
    } else {
      const foe = rules.battlers[request.battler === 0 ? 1 : 0]!;
      trapMessage = battlePartyAbilityPreventsMessage(
        SPECIES_NAMES[rules.party.opponent[foe.partyIndex]!.species]!.name,
        trap.abilityName,
      );
    }
  }
  return Object.freeze({
    requestId: request.requestId,
    trapMessage,
    rows: Object.freeze(rows),
    // OpenPartyMenuInBattle (party_menu.c:5774-5779) calls
    // InitPartyMenu(..., keepCursorPos=FALSE, ...) which forces slot 0
    // (party_menu.c:524-525), never the active battler's slot -- for BOTH the
    // voluntary and forced routes (the latter's fainted-mon default is slot 0
    // in every canonical fixture). docs/party-menu-rank6-ground-truth.md §2.
    cursor: 0,
    rightColumnCursor: 1,
    submenuOpen: false,
    submenuOpened: false,
    submenuOpenElapsed: 0,
    actions: "shift",
    actionCursor: 0,
    summaryMons: records === null
      ? null
      : buildBattlePartySummaryMons(rows, records, (partyIndex) => liveSummaryViewFromPartyMember(rules.party.player[partyIndex]!)),
    summary: null,
    message: null,
    ...PARTY_MESSAGE_CLOCK_START,
    outcome: null,
    elapsed: 0,
    openElapsed: 0,
    selectedSinceElapsed: -MON_ICON_CREATION_ELAPSED_OFFSET,
    closeElapsed: null,
  });
}

function requireSummaryMons(state: BattlePartySelectState): BattlePartySummaryMons {
  if (state.summaryMons === null) return fail("SUMMARY needs the party's rental records (createBattlePartySelectState's records argument)");
  return state.summaryMons;
}

/** CursorCb_Cancel1 (and the refusals' DisplayPartyMenuMessage): the action window closes; it re-opens at row 0 next time. */
function closeActionWindow(next: BattlePartySelectState): BattlePartySelectState {
  return Object.freeze({ ...next, submenuOpen: false, actionCursor: 0 });
}

/**
 * CB2_ReturnToPartyMenuFromSummaryScreen (party_menu.c:2790-2795): InitPartyMenu(KEEP_PARTY_LAYOUT, keepCursorPos on
 * gLastViewedMonIndex, PARTY_MSG_DO_WHAT_WITH_MON, Task_TryCreateSelectionWindow) -- the menu comes back on the slot the summary
 * last showed with its action window open at row 0 and the "Do what with this POKéMON?" message, fading in from black; its icons
 * are re-created (the selection bounce restarts as at creation). These fields land when the exit fade begins so the fade-in
 * reveals the re-inited menu.
 */
function menuAfterSummaryReturn(next: BattlePartySelectState, lastViewedSlot: number): BattlePartySelectState {
  const cursor = lastViewedSlot as 0 | 1 | 2;
  return Object.freeze({
    ...next,
    cursor,
    rightColumnCursor: cursor === 0 ? next.rightColumnCursor : cursor,
    submenuOpen: true,
    submenuOpened: true,
    submenuOpenElapsed: SUBMENU_OPEN_VISUAL_DELAY,
    actionCursor: 0,
    message: null,
    selectedSinceElapsed: next.elapsed - MON_ICON_CREATION_ELAPSED_OFFSET,
  });
}

export function battlePartyNoEnergyMessage(row: BattlePartySelectRow): string {
  return `${row.name}${PARTY_NO_ENERGY_LINE_1_SUFFIX}\n${PARTY_NO_ENERGY_LINE_2}`;
}

/** gText_PkmnAlreadyInBattle ("{STR_VAR_1} is already\nin battle!"): TrySwitchInPokemon's refusal for the active battler's own slot. */
export function battlePartyAlreadyInBattleMessage(row: BattlePartySelectRow): string {
  return `${row.name}${PARTY_ALREADY_IN_BATTLE_LINE_1_SUFFIX}\n${PARTY_ALREADY_IN_BATTLE_LINE_2}`;
}

/** gText_PkmnCantSwitchOut ("{STR_VAR_1} can't be switched\nout!"): STR_VAR_1 is the ACTIVE battler's nickname. */
export function battlePartyCantSwitchOutMessage(activeName: string): string {
  return `${activeName} can't be switched\nout!`;
}

/** gText_PkmnsXPreventsSwitching ("{B_BUFF1}'s {B_LAST_ABILITY}\nprevents switching!\p"): B_BUFF1 is the trapping foe with its "Foe " prefix. */
export function battlePartyAbilityPreventsMessage(foeName: string, abilityName: string): string {
  return `Foe ${foeName}'s ${abilityName}\nprevents switching!`;
}

/** Source-shaped list/submenu input for a three-mon singles Factory party. */
export function advanceBattlePartySelect(
  state: BattlePartySelectState,
  newKeys: ReadonlySet<GbaButton>,
): BattlePartySelectState {
  const next = Object.freeze({
    ...state,
    elapsed: state.elapsed + 1,
    openElapsed: state.openElapsed + 1,
    closeElapsed: state.closeElapsed === null ? null : state.closeElapsed + 1,
    submenuOpenElapsed: state.submenuOpen ? state.submenuOpenElapsed + 1 : 0,
  });
  if (state.outcome !== null) return next;
  if (state.summary !== null) {
    // The summary screen owns the screen and every key (sum241, battlePartySummary.ts).
    const summary = stepBattlePartySummary(state.summary, newKeys, requireSummaryMons(state));
    if (battlePartySummaryReturned(summary)) return Object.freeze({ ...next, summary: null });
    if (battlePartySummaryExitBegins(state.summary, summary)) {
      return Object.freeze({ ...menuAfterSummaryReturn(next, summary.selectedSlot), summary });
    }
    return Object.freeze({ ...next, summary });
  }
  // Task_HandleChooseMonInput / Task_HandleSelectionMenuInput run only once the open palette fade has settled
  // (!gPaletteFade.active, party_menu.c:1261): every earlier press is ignored.
  const inputLive = state.openElapsed >= PARTY_SELECT_OPEN_TOTAL_FRAMES;
  if (!inputLive) return next;
  if (state.message !== null) {
    // TextPrinterWait (text.c:884-899): the refusal message's A / B press, read only once the printer is done.
    const step = stepPartyMessage(state.message, state, newKeys.has("A") || newKeys.has("B"));
    if (step.accepted) playSelectSe();
    return Object.freeze({ ...next, ...step.clock, message: step.cleared ? null : state.message });
  }
  if (state.submenuOpen) {
    // Task_HandleSelectionMenuInput (party_menu.c:2740-2768) over the three-row window, Menu_ProcessInputNoWrapAround_other's
    // own priority: A runs the row under the action cursor, B runs the last row (CANCEL), UP / DOWN move without wrapping.
    if (newKeys.has("A")) {
      if (state.cursor === "cancel") return next;
      // The window is InitMenuInUpperLeftCorner(..., APressMuted = TRUE): menu.c plays nothing, so each CursorCb_* is the
      // one SE_SELECT of an A (CancelCb1, Summary, SendMon; SendMon plays it before TrySwitchInPokemon's refusals).
      playSelectSe();
      if (state.actionCursor === PARTY_ACTION_CANCEL) return closeActionWindow(next);
      if (state.actionCursor === PARTY_ACTION_SUMMARY) {
        // CursorCb_Summary -> CB2_ShowPokemonSummaryScreen on this battle-order row.
        const summaryMons = requireSummaryMons(state);
        return Object.freeze({ ...next, summary: openBattlePartySummary(state.cursor, summaryMons) });
      }
      const row = state.rows[state.cursor];
      if (row.fainted) {
        return Object.freeze({
          ...closeActionWindow(next),
          ...PARTY_MESSAGE_CLOCK_START,
          message: battlePartyNoEnergyMessage(row),
        });
      }
      if (!row.legal) {
        // TrySwitchInPokemon (party_menu.c:5811-5850), after the HP test above: the active battler's own slot
        // refuses with "is already in battle!" first; any other illegal pick is a trapped switch
        // (PARTY_ACTION_CANT_SWITCH / ABILITY_PREVENTS, the last two checks). Both go through
        // DisplayPartyMenuMessage, the same WIN_MSG route as the no-energy refusal (fsw235).
        return Object.freeze({
          ...closeActionWindow(next),
          ...PARTY_MESSAGE_CLOCK_START,
          message: row.active || state.trapMessage == null
            ? battlePartyAlreadyInBattleMessage(row)
            : state.trapMessage,
        });
      }
      // The confirm A lands while the SEND OUT submenu is open; the real menu
      // keeps the submenu window rendered through the confirm tick (oracle frame
      // 963) and only drops it on the next frame (964), so `submenuOpen` stays
      // true while closeElapsed is 0; the render gates the window off from
      // closeElapsed 1 (see `submenuVisible`).
      return Object.freeze({
        ...next,
        outcome: Object.freeze({ kind: "select", partyIndex: row.partyIndex }),
        closeElapsed: 0,
      });
    }
    if (newKeys.has("B")) {
      // Task_HandleSelectionMenuInput's MENU_B_PRESSED SE, then CursorCb_Cancel1's.
      playSelectSe();
      playSelectSe();
      return closeActionWindow(next);
    }
    const actionDirection = partyActionWindowDirection(newKeys);
    if (actionDirection === undefined) return next;
    const actionCursor = movePartyActionCursor(state.actionCursor, actionDirection);
    // Menu_ProcessInputNoWrapAround_other sounds only when the cursor moved.
    if (actionCursor !== state.actionCursor) playSelectSe();
    return Object.freeze({ ...next, actionCursor });
  }
  if (newKeys.has("B") || (newKeys.has("A") && state.cursor === "cancel")) {
    // HandleChooseMonCancel, default action (PARTY_ACTION_CHOOSE_MON): SE_SELECT, no yes/no for the in-battle menu, close.
    playSelectSe();
    return Object.freeze({
      ...next,
      outcome: Object.freeze({ kind: "cancel" }),
      closeElapsed: 0,
    });
  }
  if (newKeys.has("A")) {
    // HandleChooseMonSelection default branch: SE_SELECT, then Task_TryCreateSelectionWindow.
    playSelectSe();
    // DisplaySelectionWindow: InitMenuInUpperLeftCorner(..., cursorPos 0, ...) -- the window always opens on its first row.
    return Object.freeze({ ...next, submenuOpen: true, submenuOpened: true, actionCursor: 0 });
  }
  const direction = partyMenuDirection(newKeys);
  if (direction === undefined) return next;
  const moved = Object.freeze({ ...next, ...movePartyMenuCursor(state, direction) });
  // UpdateCurrentPartySelection sounds only when the slot changed (a LEFT / RIGHT that cannot move is silent).
  if (moved.cursor !== state.cursor) playSelectSe();
  // AnimatePartySlot(newSlotId, 1): the moved-to slot starts bouncing on this
  // edge, so its bounce phase resets at the new elapsed.
  return moved.cursor === state.cursor
    ? moved
    : Object.freeze({ ...moved, selectedSinceElapsed: next.elapsed });
}

type Tileset = Readonly<{ columns: number; rows: number; tiles: readonly (readonly number[])[] }>;
type PartySourceAsset = Readonly<{
  tileset: Tileset;
  palette: readonly RgbColor[];
  background: Readonly<{
    width: number;
    height: number;
    entries: readonly Readonly<{
      tile: number; hFlip: boolean; vFlip: boolean; palette: number;
    }>[];
  }>;
  slots: Readonly<{
    main: Readonly<{ width: number; height: number; tiles: readonly number[] }>;
    wide: Readonly<{ width: number; height: number; tiles: readonly number[] }>;
    wideEmpty: Readonly<{ width: number; height: number; tiles: readonly number[] }>;
    cancelButton: Readonly<{ width: number; height: number; tiles: readonly number[] }>;
  }>;
}>;
type PartyIcon = Readonly<{ frame0: Tileset; frame1: Tileset; palette: readonly RgbColor[] }>;

const partySource = partyMenuSourceData as unknown as PartySourceAsset;
const partyIcons = partyMonIconsData as unknown as Readonly<Record<string, PartyIcon>>;
const fontSmall = {
  ...(fontSmallData as unknown as FontData),
  glyphHeight: 12,
} satisfies FontData;
const fontNormal = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>(
  (charmapData as { entries: [string, number][] }).entries,
);

function drawTile(
  fb: Uint8Array,
  tileIndex: number,
  palette: number | readonly RgbColor[],
  x: number,
  y: number,
  hFlip = false,
  vFlip = false,
  transparentZero = false,
): void {
  const tile = partySource.tileset.tiles[tileIndex];
  if (tile === undefined) return;
  for (let py = 0; py < 8; py += 1) for (let px = 0; px < 8; px += 1) {
    const sx = hFlip ? 7 - px : px;
    const sy = vFlip ? 7 - py : py;
    const colorIndex = tile[sy * 8 + sx]!;
    if (transparentZero && colorIndex === 0) continue;
    const color = typeof palette === "number" ? partySource.palette[palette * 16 + colorIndex] : palette[colorIndex];
    if (color) setPixel(fb, x + px, y + py, color.r, color.g, color.b);
  }
}

/**
 * LoadPartyBoxPalette (party_menu.c:2205-2280) builds a box's palette by loading three
 * colours into bank offsets {4,5,6} (sPartyBoxPalOffsets1) and three into {1,7,8}
 * (sPartyBoxPalOffsets2) from gPartyMenuBg_Pal -- `partySource.palette`, the
 * 176-colour bg.png palette the ids below index (data/party_menu.h:574-596). The
 * normal box (sPartyBoxEmptySlotPalIds {52,53,54} / {49,55,56}) is bank 3 as
 * harvested; every other state is composed from it here. GetPartyBoxPaletteFlags
 * (:1166): PARTY_PAL_SELECTED = the cursor slot, PARTY_PAL_FAINTED = HP 0; the
 * SWITCHING / TO_SWITCH / SOFTBOILED flags belong to the field menu's actions
 * and never apply in battle (CHOOSE_MON / SEND_OUT), so a fainted slot is never
 * the green "selected for action" box.
 */
type PartyBoxPalIds = readonly [readonly [number, number, number], readonly [number, number, number]];
const PARTY_BOX_PAL_OFFSETS: PartyBoxPalIds = [[4, 5, 6], [1, 7, 8]];
const PARTY_BOX_CURR_SELECTION_PAL_IDS: PartyBoxPalIds = [[116, 117, 118], [97, 103, 104]];
const PARTY_BOX_FAINTED_PAL_IDS: PartyBoxPalIds = [[84, 85, 86], [81, 87, 88]];
const PARTY_BOX_CURR_SELECTION_FAINTED_PAL_IDS: PartyBoxPalIds = [[148, 149, 150], [97, 103, 104]];
const PARTY_BOX_NORMAL_BANK = 3;
const partyBoxPaletteCache = new Map<string, readonly RgbColor[]>();

function partyBoxPalette(ids: PartyBoxPalIds): readonly RgbColor[] {
  const key = ids.flat().join(",");
  const cached = partyBoxPaletteCache.get(key);
  if (cached) return cached;
  const palette = partySource.palette.slice(PARTY_BOX_NORMAL_BANK * 16, PARTY_BOX_NORMAL_BANK * 16 + 16);
  ids.forEach((group, g) => group.forEach((id, k) => { palette[PARTY_BOX_PAL_OFFSETS[g]![k]!] = partySource.palette[id]!; }));
  partyBoxPaletteCache.set(key, palette);
  return palette;
}

/** The box palette for a slot: `selected` = the cursor slot (animNum 1), `fainted` = HP 0. */
export function partyBoxPaletteFor(selected: boolean, fainted: boolean): number | readonly RgbColor[] {
  if (fainted) return partyBoxPalette(selected ? PARTY_BOX_CURR_SELECTION_FAINTED_PAL_IDS : PARTY_BOX_FAINTED_PAL_IDS);
  return selected ? partyBoxPalette(PARTY_BOX_CURR_SELECTION_PAL_IDS) : PARTY_BOX_NORMAL_BANK;
}

function drawSourceBackground(fb: Uint8Array): void {
  for (let ty = 0; ty < 20; ty += 1) for (let tx = 0; tx < 30; tx += 1) {
    const entry = partySource.background.entries[ty * partySource.background.width + tx]!;
    drawTile(fb, entry.tile, entry.palette, tx * 8, ty * 8, entry.hFlip, entry.vFlip);
  }
}

function drawSlot(
  fb: Uint8Array,
  slot: PartySourceAsset["slots"]["main"],
  x: number,
  y: number,
  palette: number | readonly RgbColor[],
  transparentZero = false,
): void {
  for (let ty = 0; ty < slot.height; ty += 1) for (let tx = 0; tx < slot.width; tx += 1) {
    drawTile(
      fb,
      slot.tiles[ty * slot.width + tx]!,
      palette,
      x + tx * 8,
      y + ty * 8,
      false,
      false,
      transparentZero,
    );
  }
}

/**
 * ROM-accurate party-menu mon-icon animation (pokemon_icon.c sAnim_0 +
 * UpdateMonIconFrame + SpriteCB_BouncePartyMonIcon, party_menu.c
 * AnimateSelectedPartyIcon/SpriteCB_BouncePartyMonIcon). Each icon's anim
 * starts with a fresh frame-0 copy at its creation tick and advances once per
 * frame; frame 0 shows for 7 ticks, frame 1 for 8 (FRAME durations of 6 plus
 * the trailing ANIMCMD_JUMP's extra tick), a 15-tick cycle. The creation
 * clock is offset from the selector's `elapsed` clock by
 * `MON_ICON_CREATION_ELAPSED_OFFSET`, calibrated against the oracle's settled
 * menu window (frame-905 acceptance: slot 0/2 byte-exact, selected slot 1
 * bouncing at the oracle's phase).
 */
const MON_ICON_CREATION_ELAPSED_OFFSET = -30;
const MON_ICON_FRAME_CYCLE = 15;
/** First frame-1 copy at anim-clock tick 7; frame 0's first copy at 15. */
const MON_ICON_FRAME1_FIRST_TICK = 7;
const MON_ICON_FRAME1_TICKS = 8;

/**
 * The oracle's mon-icon animation clock stalls by exactly 2 frames while the
 * SEND OUT submenu opens (A-press 922-923, window lands 926), so from the
 * submenu-open edge the displayed phase lags the raw `elapsed` clock by 2:
 * toggles land at 930/937/945/... not 928/935/943/... and the frame-0 B phase
 * holds 920-929 (docs/fade-layer-forensics.md §7(e)). The stall is permanent
 * once the submenu has opened.
 */
export const MON_ICON_SUBMENU_OPEN_STALL = 2;

/**
 * The icon-anim clock value to feed `monIconFrameAt`/`monIconSelectedY2`,
 * applying the §7(e) submenu-open stall to a raw `elapsed`.
 */
export function monIconElapsedAfterSubmenuStall(
  elapsed: number,
  submenuOpened: boolean,
): number {
  return elapsed - (submenuOpened ? MON_ICON_SUBMENU_OPEN_STALL : 0);
}

/**
 * The rendered tail of gText_DoWhatWithPokemon = "Do what with this {PKMN}?"
 * (strings.c:434): `{PKMN}` is NOT a nickname splice -- the ROM charmap encodes
 * it as the two ligature glyph bytes 0x53/0x54 (PK/MN, charmap.txt:51) and the
 * trailing "?" as 0xAC (decimal 172), drawn at FONT_NORMAL origin (8,137) one
 * line, no wrap (docs/fade-layer-forensics.md §7(c)).
 */
export const DO_WHAT_WITH_MON_TAIL_CODES = [83, 84, 172] as const;

/** sAnim_0 displayed frame at `elapsed` (frame 0 in [15+15k, 7+15(k+1))). */
export function monIconFrameAt(elapsed: number): 0 | 1 {
  const tick = elapsed + MON_ICON_CREATION_ELAPSED_OFFSET;
  const r = ((tick - MON_ICON_FRAME1_FIRST_TICK) % MON_ICON_FRAME_CYCLE + MON_ICON_FRAME_CYCLE) % MON_ICON_FRAME_CYCLE;
  return r < MON_ICON_FRAME1_TICKS ? 1 : 0;
}

/** Next frame-copy tick strictly after `animClock`, in anim-clock terms. */
function monIconNextFrameChange(animClock: number): number {
  // Frame-1 copies at 7+15k, frame-0 copies at 15+15k.
  const frame1 = MON_ICON_FRAME1_FIRST_TICK
    + MON_ICON_FRAME_CYCLE
      * (Math.floor((animClock - MON_ICON_FRAME1_FIRST_TICK) / MON_ICON_FRAME_CYCLE) + 1);
  const frame0FirstTick = MON_ICON_FRAME1_FIRST_TICK + MON_ICON_FRAME_CYCLE - MON_ICON_FRAME1_TICKS;
  const frame0 = frame0FirstTick
    + MON_ICON_FRAME_CYCLE * (Math.floor((animClock - frame0FirstTick) / MON_ICON_FRAME_CYCLE) + 1);
  return Math.min(frame1, frame0);
}

/**
 * SpriteCB_BouncePartyMonIcon: a selected icon holds y2 = 0 until its first
 * frame change after selection, then sits at y2 = -3 while frame 0 shows and
 * y2 = +1 while frame 1 shows (animCmd = 1 flips to -3, animCmd = 2 to +1).
 */
export function monIconSelectedY2(elapsed: number, selectedSinceElapsed: number): number {
  const animClock = elapsed + MON_ICON_CREATION_ELAPSED_OFFSET;
  const selectionClock = selectedSinceElapsed + MON_ICON_CREATION_ELAPSED_OFFSET;
  if (animClock < monIconNextFrameChange(selectionClock)) return 0;
  return monIconFrameAt(elapsed) === 0 ? -3 : 1;
}

function drawIcon(fb: Uint8Array, row: BattlePartySelectRow, selected: boolean, elapsed: number, selectedSinceElapsed: number): void {
  const icon = partyIcons[row.speciesKey];
  if (!icon) return fail(`missing icon catalog entry ${row.speciesKey}`);
  const centers = [{ x: 16, y: 40 }, { x: 104, y: 18 }, { x: 104, y: 42 }] as const;
  const center = centers[row.slot];
  const sheet = monIconFrameAt(elapsed) === 0 ? icon.frame0 : icon.frame1;
  const x2 = selected || row.slot === 0 ? 0 : -4;
  const y2 = selected
    ? monIconSelectedY2(elapsed, selectedSinceElapsed)
    : row.slot === 0 ? -4 : 0;
  for (let ty = 0; ty < sheet.rows; ty += 1) for (let tx = 0; tx < sheet.columns; tx += 1) {
    const tile = sheet.tiles[ty * sheet.columns + tx]!;
    for (let py = 0; py < 8; py += 1) for (let px = 0; px < 8; px += 1) {
      const colorIndex = tile[py * 8 + px]!;
      if (colorIndex === 0) continue;
      const color = icon.palette[colorIndex]!;
      setPixel(
        fb,
        center.x + x2 - 16 + tx * 8 + px,
        center.y + y2 - 16 + ty * 8 + py,
        color.r,
        color.g,
        color.b,
      );
    }
  }
}

type IconTilesetFrame = Readonly<{
  columns: number;
  rows: number;
  tiles: readonly (readonly number[])[];
}>;
type HeldItemAsset = Readonly<{
  palette: readonly RgbColor[];
  frames: Readonly<{ item: IconTilesetFrame; mail: IconTilesetFrame }>;
}>;
type StatusIconAsset = Readonly<{
  palette: readonly RgbColor[];
  frames: Readonly<Record<string, IconTilesetFrame>>;
}>;
type PartyMenuSpriteCoords = Readonly<{
  layouts: Readonly<{
    single: readonly Readonly<{
      heldItem: readonly [number, number];
      status: readonly [number, number];
      pokeball: readonly [number, number];
    }>[];
  }>;
}>;

const heldItemAsset = partyMenuHeldItemData as unknown as HeldItemAsset;
const statusIconAsset = partyMenuContentData as unknown as Readonly<{
  statusIcons: StatusIconAsset;
}>;
const partyMenuSpriteCoords = partyMenuSpriteCoordsData as unknown as PartyMenuSpriteCoords;

/** Blit an OBJ 4bpp tile frame centered at (centerX, centerY), honoring the banked palette. */
function blitIconFrame(
  fb: Uint8Array,
  frame: IconTilesetFrame,
  palette: readonly RgbColor[],
  centerX: number,
  centerY: number,
): void {
  const offsetX = Math.floor(frame.columns * 8 / 2);
  const offsetY = Math.floor(frame.rows * 8 / 2);
  for (let ty = 0; ty < frame.rows; ty += 1) for (let tx = 0; tx < frame.columns; tx += 1) {
    const tile = frame.tiles[ty * frame.columns + tx]!;
    for (let py = 0; py < 8; py += 1) for (let px = 0; px < 8; px += 1) {
      const colorIndex = tile[py * 8 + px]!;
      if (colorIndex === 0) continue;
      const color = palette[colorIndex];
      if (!color) continue;
      setPixel(
        fb,
        centerX - offsetX + tx * 8 + px,
        centerY - offsetY + ty * 8 + py,
        color.r,
        color.g,
        color.b,
      );
    }
  }
}

/**
 * CreatePartyMonHeldItemSprite (party_menu.c:4021-4038): an 8x8 generic item
 * sprite at the slot's `heldItem` center; `ShowOrHideHeldItemSprite` hides it
 * for ITEM_NONE (the glyph itself is shared by every held item).
 */
function drawHeldItemIcon(fb: Uint8Array, row: BattlePartySelectRow): void {
  if (row.item === 0) return;
  const [centerX, centerY] = partyMenuSpriteCoords.layouts.single[row.slot]!.heldItem;
  blitIconFrame(fb, heldItemAsset.frames.item, heldItemAsset.palette, centerX, centerY);
}

/**
 * CreatePartyMonStatusSprite / UpdatePartyMonAilmentGfx (party_menu.c:4185-4220):
 * the 32x8 status-icon frame at the slot's `status` center, selected by the
 * row's primary status; AILMENT_NONE renders nothing.
 */
function drawStatusIcon(fb: Uint8Array, row: BattlePartySelectRow): void {
  if (row.status === null) return;
  const frame = statusIconAsset.statusIcons.frames[row.status];
  if (!frame) return fail(`missing status-icon frame ${row.status}`);
  const [centerX, centerY] = partyMenuSpriteCoords.layouts.single[row.slot]!.status;
  blitIconFrame(fb, frame, statusIconAsset.statusIcons.palette, centerX, centerY);
}

/**
 * CreatePartyMonPokeballSprite (party_menu.c:4122-4126) at the slot's
 * `pokeball` coord (sPartyMenuSpriteCoords, data/party_menu.h:68-78), using
 * sSpriteTemplate_MenuPokeball's 32x32 frame. AnimatePartySlot
 * (party_menu.c:861-865) shows the OPEN frame (anim 1, sheet rows [32,64)) on
 * the cursor slot and the CLOSED frame (anim 0) on every other slot; with the
 * cursor on "cancel" no slot is open. The ball draws BEHIND the mon icon
 * (icon oam.priority 1 vs the ball's default 3), so the icon overpaints the
 * overlap exactly like the oracle.
 */
function drawMenuPokeball(fb: Uint8Array, row: BattlePartySelectRow, cursor: BattlePartySelectCursor): void {
  const [centerX, centerY] = partyMenuSpriteCoords.layouts.single[row.slot]!.pokeball;
  const ball = partyMenuPokeballData as unknown as {
    frame: IconTilesetFrame;
    frameOpen: IconTilesetFrame;
    palette: readonly RgbColor[];
  };
  const open = cursor === row.slot;
  blitIconFrame(fb, open ? ball.frameOpen : ball.frame, ball.palette, centerX, centerY);
}

/**
 * sPartyBoxInfoRects (data/party_menu.h:32-62), per-card absolute pixel
 * positions (window origin + relative rect). HP bar geometry: left column
 * (24,35,48x3) rel; right column (88,10,48x3) rel.
 */
const PARTY_CARD_INFO = [
  { name: { x: 32, y: 35 }, level: { x: 40, y: 44 }, gender: { x: 72, y: 44 }, hp: { x: 46, y: 61 }, maxHp: { x: 61, y: 61 }, hpBar: { x: 32, y: 59 } },
  { name: { x: 118, y: 11 }, level: { x: 126, y: 20 }, gender: { x: 158, y: 20 }, hp: { x: 198, y: 20 }, maxHp: { x: 213, y: 20 }, hpBar: { x: 184, y: 18 } },
  { name: { x: 118, y: 35 }, level: { x: 126, y: 44 }, gender: { x: 158, y: 44 }, hp: { x: 198, y: 44 }, maxHp: { x: 213, y: 44 }, hpBar: { x: 184, y: 42 } },
] as const;

const CARD_TEXT_SHADOW: RgbColor = { r: 115, g: 115, b: 115 };

type GenderGlyph = Readonly<{ width: number; pixels: readonly number[] }>;
type GenderGlyphAsset = Readonly<{
  glyphs: Readonly<{ male: GenderGlyph; female: GenderGlyph }>;
  colors: Readonly<{
    male: Readonly<{ fg: RgbColor; shadow: RgbColor }>;
    female: Readonly<{ fg: RgbColor; shadow: RgbColor }>;
  }>;
}>;
const genderGlyphAsset = partyMenuGenderGlyphsData as unknown as GenderGlyphAsset;

/**
 * Party-menu message-window frame palette: the standard 3x3 window-frame tiles
 * (graphics/text_window/1.png) with the corner/edge color 0 replaced by the
 * party-menu olive (140,156,41) -- observed on the oracle's settled
 * "Choose a POKéMON." window (the LoadUserWindowBorderGfx(0, 0x4F, 13) bank).
 */
const PARTY_MESSAGE_WINDOW_PALETTE: readonly RgbColor[] = [
  { r: 140, g: 156, b: 41 },
  ...(stdWindowData as { palette: readonly RgbColor[] }).palette.slice(1),
];

function drawGenderGlyph(fb: Uint8Array, row: BattlePartySelectRow): void {
  if (row.gender === "genderless") return;
  const glyph = genderGlyphAsset.glyphs[row.gender];
  const colors = genderGlyphAsset.colors[row.gender];
  const info = PARTY_CARD_INFO[row.slot];
  for (let py = 0; py < 8; py += 1) for (let px = 0; px < glyph.width; px += 1) {
    const value = glyph.pixels[py * glyph.width + px]!;
    if (value === 0) continue;
    const color = value === 1 ? colors.fg : colors.shadow;
    setPixel(fb, info.gender.x + px, info.gender.y + 4 + py, color.r, color.g, color.b);
  }
}

/**
 * DisplayPartyPokemonHPBar (src/party_menu.c:2402-2434): the filled portion
 * uses sHPBarPalOffsets[1] (dark, 1px) over sHPBarPalOffsets[0] (light, 2px)
 * from the sHPBar{Green,Yellow,Red}PalIds color family, spanning
 * GetScaledHPFraction(hp, maxhp, 48) pixels (min 1 for any damage).
 */
function drawHpBar(fb: Uint8Array, row: BattlePartySelectRow): void {
  const { x, y } = PARTY_CARD_INFO[row.slot].hpBar;
  const palette = partySource.palette;
  const fraction = row.hp <= 0 ? 0 : Math.max(1, Math.floor((row.hp * 48) / row.maxHP));
  // GetHPBarLevel (battle_interface.c:2527-2549): fraction > 50% green, > 20% yellow, else red.
  let light: RgbColor;
  let dark: RgbColor;
  if (fraction > 24) {
    light = palette[57]!;
    dark = palette[58]!;
  } else if (fraction > 9) {
    light = palette[73]!;
    dark = palette[74]!;
  } else {
    light = palette[89]!;
    dark = palette[90]!;
  }
  for (let px = 0; px < fraction; px += 1) {
    setPixel(fb, x + px, y, dark.r, dark.g, dark.b);
    setPixel(fb, x + px, y + 1, light.r, light.g, light.b);
    setPixel(fb, x + px, y + 2, light.r, light.g, light.b);
  }
}

function drawRowText(fb: Uint8Array, row: BattlePartySelectRow): void {
  const info = PARTY_CARD_INFO[row.slot];
  // DisplayPartyPokemonNickname/Level (party_menu.c:2287-2321) print with
  // sFontColorTable[0] = LIGHT_GRAY (the window bank's color3), which is white
  // (255,255,255) in every box bank -- not the blue CARD_TEXT_FG_* the app
  // previously used (ground truth docs/party-menu-rank6-ground-truth.md §5).
  const fg: RgbColor = { r: 255, g: 255, b: 255 };
  const palette: RgbColor[] = [
    { r: 0, g: 0, b: 0 },
    fg,
    CARD_TEXT_SHADOW,
  ];
  const colors = { fg: 1, bg: 0, shadow: 2 };
  drawText(fb, fontSmall, charmap, row.name, info.name.x, info.name.y, palette, colors);
  // DisplayPartyPokemonLevelCheck (party_menu.c:2290-2298): the level line
  // prints only when the ailment is AILMENT_NONE (or PKRS); a statused mon
  // suppresses it and the status icon takes the level line's position.
  if (row.status === null) {
    // DisplayPartyPokemonLevelCheck prints gText_LevelSymbol = "{LV}"
    // (strings.c:208) + the level digits. The charmap's `LV = 34` is HEX
    // (charmap.txt:45): 0x34 = 52, the FONT_SMALL "Lv" ligature glyph (widths
    // [52]=8). Drawing glyph 34 (decimal) instead showed a lone "v" and drew
    // the line 3px too narrow (ISSUES #80 settled band leveltext class).
    const lvCode = 52;
    const digitCodes = String(row.level).split("").map((digit) => {
      const code = codeForChar(charmap, digit);
      if (code === undefined) return fail(`no font-small glyph for digit ${digit}`);
      return code;
    });
    drawGlyphCodes(fb, fontSmall, [lvCode, ...digitCodes], info.level.x, info.level.y, palette, colors);
  }
  // DisplayPartyPokemonHP/MaxHP (party_menu.c:2367-2394): "105/" + "/105" printed
  // on the HP-number box already in the card tilemap (white ink, dark shadow).
  const hpPalette: RgbColor[] = [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
    CARD_TEXT_SHADOW,
  ];
  // DisplayPartyPokemonHP (party_menu.c:2367) prints ConvertIntToDecimalStringN(hp,
  // STR_CONV_MODE_RIGHT_ALIGN, 3) + "/": the current HP is padded on the left to
  // three characters with CHAR_SPACER (0x77, a blank 5 px wide in FONT_SMALL like
  // every digit and the slash), so its "/" always lands 15 px in, on the very
  // pixels DisplayPartyPokemonMaxHP's "/" (dimensions[16]) prints again. A
  // left-aligned "40/" put its slash 10 px in and the card showed "40//137".
  const hpDigitCodes = String(row.hp).split("").map((digit) => {
    const code = codeForChar(charmap, digit);
    if (code === undefined) return fail(`no font-small glyph for digit ${digit}`);
    return code;
  });
  const slashCode = codeForChar(charmap, "/");
  if (slashCode === undefined) return fail("no font-small glyph for /");
  const hpCodes = [...Array.from({ length: Math.max(0, 3 - hpDigitCodes.length) }, () => CHAR_SPACER), ...hpDigitCodes, slashCode];
  drawGlyphCodes(fb, fontSmall, hpCodes, info.hp.x, info.hp.y, hpPalette, colors);
  drawText(fb, fontSmall, charmap, `/${row.maxHP}`, info.maxHp.x, info.maxHp.y, hpPalette, colors);
}

/** charmap.txt / include/constants/characters.h: CHAR_SPACER 0x77, the blank cell STR_CONV_MODE_RIGHT_ALIGN pads with. */
const CHAR_SPACER = 0x77;

/**
 * ISSUES #80 slice 5: the CANCEL pokeball-button window over the baked bg box.
 * The window is the oracle's composited CANCEL window (x184-237 y134-153):
 * a 2px box-frame with stepped corners and a divider at x202, interior color15
 * (115,90,181), the 16x16 pokeball sprite (pixel-0 transparent) at center
 * (198,148), and "CANCEL" printed with sFontColorTable[0] (white ink,
 * (115,115,115) shadow). All coordinates are oracle-measured
 * (`docs/party-menu-rank6-ground-truth.md` §6 addendum + the slice-5
 * forensics probe); nothing here is hand-guessed geometry.
 */

/** The oracle window frame (74,74,99), exact per-row x-ranges (inclusive). */
const CANCEL_FRAME_ROWS: ReadonlyArray<readonly [number, string]> = [
  [134, "191-196"],
  [135, "189-198"],
  [136, "200-233"],
  [137, "200-235"],
  [138, "233-236"],
  [139, "185,202,235-236"],
  [140, "185,202,235-237"],
  [141, "184-185,202-203,236-237"],
  [142, "184-185,202-203,236-237"],
  [143, "184-185,202-203,236-237"],
  [144, "184-185,202-203,236-237"],
  [145, "184-185,202-203,236-237"],
  [146, "184-185,202-203,236-237"],
  [147, "185,202,235-237"],
  [148, "185,202,235-236"],
  [149, "233-236"],
  [150, "200-235"],
  [151, "200-233"],
  [152, "189-198"],
  [153, "191-196"],
];

/**
 * The CANCEL button window is bg1 tiles (23,17) 7x2 in palette bank 1; AnimatePartySlot
 * (party_menu.c:1141, case PARTY_SIZE + 1) switches them to bank 2 while the cursor is
 * on CANCEL (SetBgTilemapPalette(1, 23, 17, 7, 2, 2)) and back to bank 1 when it
 * leaves. Of the colours the window uses only the frame (colour 1: (74,74,99) ->
 * (255,115,49)) and the interior (colour 15: (115,90,181) -> (165,115,247)) differ
 * between the banks; the checkerboard (4/5) is the same in both.
 */
const cancelFrameColor = (selected: boolean): RgbColor => partySource.palette[(selected ? 2 : 1) * 16 + 1]!;
const cancelInteriorColor = (selected: boolean): RgbColor => partySource.palette[(selected ? 2 : 1) * 16 + 15]!;
const CANCEL_CHECKER_L: RgbColor = { r: 206, g: 214, b: 123 };
const CANCEL_CHECKER_O: RgbColor = { r: 181, g: 181, b: 90 };

function drawCancelFrameRows(fb: Uint8Array, selected: boolean): void {
  const color = cancelFrameColor(selected);
  for (const [y, ranges] of CANCEL_FRAME_ROWS) {
    for (const part of ranges.split(",")) {
      const [a, b] = part.split("-").map(Number);
      for (let x = a!; x <= (b ?? a)!; x += 1) {
        setPixel(fb, x, y, color.r, color.g, color.b);
      }
    }
  }
}

/**
 * The app's baked bg box (x186-228 y136-151) sits 2px low-right of the oracle
 * window, so the slice first repaints the window footprint (x184-237 y134-153)
 * with the party-menu checkerboard rows (L/O alternating, as in bg.png), then
 * overpaints frame + interior + ball + text.
 */
function drawCancelWindowBackground(fb: Uint8Array): void {
  for (let y = 134; y <= 153; y += 1) {
    const color = (y - 134) % 2 === 0 ? CANCEL_CHECKER_L : CANCEL_CHECKER_O;
    for (let x = 184; x <= 237; x += 1) {
      setPixel(fb, x, y, color.r, color.g, color.b);
    }
  }
}

function drawCancelWindow(fb: Uint8Array, selected: boolean): void {
  drawCancelWindowBackground(fb);
  // Interior color15 fills the right half (x202-235) between the divider and
  // the right frame; the ball + CANCEL text overpaint their own footprints.
  const interior = cancelInteriorColor(selected);
  for (let y = 138; y <= 149; y += 1) {
    for (let x = 202; x <= 235; x += 1) {
      setPixel(fb, x, y, interior.r, interior.g, interior.b);
    }
  }
  drawCancelFrameRows(fb, selected);
  // "CANCEL" (sFontColorTable[0]: white ink + dark-grey shadow) centered in the
  // window's right half; FONT_SMALL's ink lands 4px below the draw origin, so
  // (204,137) puts the glyph bbox at the oracle's x204-233 y141-148.
  const cancelPalette: RgbColor[] = [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
    { r: 115, g: 115, b: 115 },
  ];
  drawText(fb, fontSmall, charmap, "CANCEL", 204, 137, cancelPalette, { fg: 1, bg: 0, shadow: 2 });
}

/**
 * The CANCEL window's 16x16 pokeball (png offset (4,4)-(19,19) of the 32x32
 * frame 0), blitted pixel-0 transparent so the window frame shows through its
 * corners. OBJ-layer sprite (sprite priority over the BG window), drawn by
 * `drawPartySelectObjLayer` -- the close fade's layer split keys it to the
 * OBJ blend coefficient.
 */
function drawCancelPokeball(fb: Uint8Array, open: boolean): void {
  const ball = partyMenuPokeballData as unknown as {
    frame: IconTilesetFrame;
    frameOpen: IconTilesetFrame;
    palette: readonly RgbColor[];
  };
  // AnimatePartySlot (party_menu.c:1141) starts the cancel ball's anim 1 (sPokeballAnim_Open) while the cursor is on
  // CANCEL and anim 0 (closed) when it leaves, like the slot balls.
  const frame = open ? ball.frameOpen : ball.frame;
  const bx = 198 - 16;
  const by = 148 - 16;
  for (let ty = 0; ty < frame.rows; ty += 1) for (let tx = 0; tx < frame.columns; tx += 1) {
    const tile = frame.tiles[ty * frame.columns + tx]!;
    for (let py = 0; py < 8; py += 1) for (let px = 0; px < 8; px += 1) {
      const colorIndex = tile[py * 8 + px]!;
      if (colorIndex === 0) continue;
      const color = ball.palette[colorIndex];
      if (!color) continue;
      const x = bx + tx * 8 + px;
      const y = by + ty * 8 + py;
      if (x < 0 || x >= 240 || y < 0 || y >= 160) continue;
      setPixel(fb, x, y, color.r, color.g, color.b);
    }
  }
}

/**
 * The SHIFT/SUMMARY/CANCEL action window is visible only past the
 * `SUBMENU_OPEN_VISUAL_DELAY` open hold (§10(d)) and through the confirm-tick
 * frame (`closeElapsed` 0; the render drops it from closeElapsed 1, ISSUES #80
 * close edge). During the 3-frame pre-open hold the oracle still shows the
 * pre-open state -- wide "Choose a POKéMON." window + CANCEL button.
 */
function submenuWindowVisible(state: BattlePartySelectState): boolean {
  // A refusal closes the window on its setting tick, but the ROM's first capture of the refusal still shows it.
  const refusalTick = state.message !== null && state.messageElapsed === 0;
  return (state.submenuOpen || refusalTick)
    && state.submenuOpenElapsed >= SUBMENU_OPEN_VISUAL_DELAY
    && (state.closeElapsed === null || state.closeElapsed === 0);
}

/**
 * The message window stays the wide "Choose a POKéMON." sDefaultPartyMsgWindowTemplate
 * (21x2, frame to x182) through the submenu's 3-frame pre-open hold and only
 * swaps to sDoWhatWithMonMsgWindowTemplate (16x2, frame to x141) together with
 * the submenu window at the 926 pop edge; from the close it stays swapped.
 */
function messageWindowSwappedFor(state: BattlePartySelectState): boolean {
  return submenuWindowVisible(state)
    || state.closeElapsed !== null;
}

/**
 * BG pass of the voluntary party screen: battle-area background, the six box
 * tiles, the per-card text/gender/HP-bar rows, the SEND OUT submenu window,
 * the message window + text, and the CANCEL window's background/interior/
 * frame/CANCEL-text (NOT its pokeball, which is an OBJ sprite).
 */
function drawPartySelectBgLayer(fb: Uint8Array, state: BattlePartySelectState): void {
  drawSourceBackground(fb);
  // LoadPartyBoxPalette (party_menu.c:2205-2280) overwrites box banks 3/4/5
  // with the same "empty slot" colors (sPartyBoxEmptySlotPalIds {52,53,54} /
  // {49,55,56} -> gPartyMenuBg_Pal bank 3), so every normal box renders from
  // bank 3; the cursor slot and fainted slots take their own three-colour loads
  // (`partyBoxPaletteFor`): bank 6 was the field menu's green "selected for
  // action" box, never a battle state, and the pink current-selection-fainted
  // box was missing.
  drawSlot(fb, partySource.slots.main, 8, 24, partyBoxPaletteFor(state.cursor === 0, state.rows[0].fainted), true);
  drawSlot(fb, partySource.slots.wide, 96, 8, partyBoxPaletteFor(state.cursor === 1, state.rows[1].fainted), true);
  drawSlot(fb, partySource.slots.wide, 96, 32, partyBoxPaletteFor(state.cursor === 2, state.rows[2].fainted), true);
  // DrawEmptySlot (party_menu.c:824-870, 2193-2195): a 3-mon party still
  // renders the six right-column boxes; slots 4-6 are empty boxes drawn from
  // sSlotTilemap_WideEmpty with the PARTY_PAL_NO_MON palette
  // (sPartyBoxNoMonPalIds {17,27,28} -> gPartyMenuBg_Pal bank 1, color1/11/12
  // = (74,74,99)/(231,239,140)/(99,90,0)).
  drawSlot(fb, partySource.slots.wideEmpty, 96, 56, 1, true);
  drawSlot(fb, partySource.slots.wideEmpty, 96, 80, 1, true);
  drawSlot(fb, partySource.slots.wideEmpty, 96, 104, 1, true);
  for (const row of state.rows) {
    drawRowText(fb, row);
    drawGenderGlyph(fb, row);
    drawHpBar(fb, row);
  }

  const submenuVisible = submenuWindowVisible(state);
  if (submenuVisible) {
    // The SHIFT / SUMMARY / CANCEL action window: the party-menu action
    // window (SELECTWINDOW_ACTIONS, DisplaySelectionWindow, party_menu.c:2534)
    // is a 10x6-tile window whose frame overhangs the tilemap by 6px, drawing
    // the same text_window frame tiles at outer origin (144,96) ->
    // (145,97)-(238,159), interior white (150,102)-(233,153).
    // docs/fade-layer-forensics.md §10(a): the old scaffold was 16px too high.
    drawStandardWindowFrame(fb, 144, 96, 10, 6);
    // Three option labels, FONT_NORMAL (party_menu.c:2557), printed at
    // window-relative x=cursorDimension=8, y=(i*16)+1 -> screen origins
    // (160,105)/(160,121)/(160,137); ink rows 108-117/124-133/140-149.
    // Line 1 is gText_Shift for the voluntary mid-battle switch, whose action
    // list is sPartyMenuAction_ShiftSummaryCancel (data/party_menu.h:697)
    // because GetPartyMenuActionsTypeInBattle (party_menu.c:5788-5796) returns
    // ACTIONS_SHIFT unless gPartyMenu.action == PARTY_ACTION_SEND_OUT -- the
    // forced send-out, whose list is sPartyMenuAction_SendOutSummaryCancel
    // (gText_SendOut, sum241).
    drawStandardWindowText(fb, state.actions === "sendOut" ? "SEND OUT" : "SHIFT", 160, 105);
    drawStandardWindowText(fb, "SUMMARY", 160, 121);
    drawStandardWindowText(fb, "CANCEL", 160, 137);
    // Cursor: a separate "▶" glyph (gText_SelectorArrow3, strings.c:1468)
    // drawn by RedrawMenuCursor (menu.c:945) at window-relative (0,16*pos+1) ->
    // screen (152,105) on the first line (cursorPos 0, per
    // InitMenuInUpperLeftCorner(...,0,TRUE)) and 16 px per row below it
    // (sum241). NOT baked into the label text.
    drawStandardWindowText(fb, "▶", 152, 105 + 16 * state.actionCursor);
  }

  // ISSUES #80 open remainder (c): from the submenu-open edge through the
  // close, the oracle swaps the message window from sDefaultPartyMsgWindowTemplate
  // (21x2, frame to x182) to sDoWhatWithMonMsgWindowTemplate (16x2, frame to
  // x141, data/party_menu.h:430-439) and prints gText_DoWhatWithPokemon =
  // "Do what with this {PKMN}?" (strings.c:434) -- the {PKMN} tail is the two
  // PK/MN ligature glyphs 0x53/0x54 + the full-width "?" 0xAC, NOT a nickname
  // splice (docs/fade-layer-forensics.md §7). The submenu window closes on the
  // confirm edge but the swapped message window stays through the close fade;
  // the CANCEL window is suppressed only while the submenu window covers it.
  const messageWindowSwapped = messageWindowSwappedFor(state);
  if (messageWindowSwapped) {
    drawStandardWindowFrame(fb, 0, 128, 16, 2, PARTY_MESSAGE_WINDOW_PALETTE);
    drawText(
      fb,
      fontNormal,
      charmap,
      "Do what with this ",
      8,
      137,
      MESSAGE_PALETTE,
      MESSAGE_TEXT_COLORS,
    );
    drawGlyphCodes(
      fb,
      fontNormal,
      DO_WHAT_WITH_MON_TAIL_CODES,
      100,
      137,
      MESSAGE_PALETTE,
      MESSAGE_TEXT_COLORS,
    );
  } else {
    // sDefaultPartyMsgWindowTemplate (data/party_menu.h:419-428): bg 2, tilemap
    // (1,17), 21x2 = px (8,136)-(176,152); the frame is one tile around. Uses
    // the party-menu message-window frame style (frame1 tiles, olive corner).
    drawStandardWindowFrame(fb, 0, 128, 21, 2, PARTY_MESSAGE_WINDOW_PALETTE);
    drawStandardWindowText(fb, "Choose a POKéMON.", 8, 137);
  }
  // The cursor on CANCEL is shown by the button itself (bank 2 + the open ball), nothing is printed in the prompt box.
  if (!submenuVisible) drawCancelWindow(fb, state.cursor === "cancel");
  if (state.message !== null) {
    // A refusal ("X has no energy / left to battle!", "X is already / in battle!") is DisplayPartyMenuMessage's
    // PrintMessage into WIN_MSG (sSinglePartyMenuWindowTemplate[WIN_MSG]: bg 2, tilemap (1,15), 28x4 = px (8,120)-(232,152))
    // behind the standard frame (DrawStdFrameWithCustomTileAndPalette(WIN_MSG, FALSE, 0x4F, 13)): two text rows over the
    // "Choose a POKéMON." box and the CANCEL button, the same drawing the canonical forced route uses
    // (battleScene.ts drawTurn15PartySelectList). The 21x2 box clipped the second line.
    const lines = partyMessageLines(state.message, state.messageElapsed);
    if (lines !== null) {
      drawStandardWindowFrame(fb, 0, 112, 28, 4);
      drawStandardWindowText(fb, lines[0], 8, 121);
      if (lines[1]) drawStandardWindowText(fb, lines[1], 8, 137);
    }
  }
}

/**
 * OBJ (sprite) pass of the voluntary party screen: the per-slot menu Pokéball
 * sprites, mon icons, held-item icons, and status icons, plus the CANCEL
 * window's pokeball sprite. Drawn over the BG layer so the sprites overpaint
 * the box/tile content exactly like the real OAM priorities. During the
 * menu-fade close this pass is rendered into a scratch buffer and blended at
 * its own (one-tick-trailing) coefficient.
 */
function drawPartySelectObjLayer(fb: Uint8Array, state: BattlePartySelectState): void {
  // The submenu-open processing stalls the oracle's mon-icon clock by 2 frames
  // (§7(e)), so the icon/bounce clocks feed the shifted elapsed.
  const iconElapsed = monIconElapsedAfterSubmenuStall(state.elapsed, state.submenuOpened);
  const iconSelectionElapsed = monIconElapsedAfterSubmenuStall(
    state.selectedSinceElapsed,
    state.submenuOpened,
  );
  for (const row of state.rows) {
    // The per-slot menu Pokéball sprite sits under the mon icon (icon
    // oam.priority 1, ball default 3), so it draws first.
    drawMenuPokeball(fb, row, state.cursor);
    drawIcon(fb, row, state.cursor === row.slot, iconElapsed, iconSelectionElapsed);
    // sPartyMenuSpriteCoords per-slot order: icon, heldItem, status, pokeball --
    // the item sprite draws on top of the mon icon's lower-left corner.
    drawHeldItemIcon(fb, row);
    drawStatusIcon(fb, row);
  }
  // The SHIFT submenu window replaces the CANCEL pokeball button while visible
  // (including its confirm-tick frame, closeElapsed 0); during the 3-frame
  // pre-open hold and from the close the button is drawn again.
  const messageShown = state.message !== null && partyMessageLines(state.message, state.messageElapsed) !== null;
  if (!submenuWindowVisible(state) && !messageShown) {
    drawCancelPokeball(fb, state.cursor === "cancel");
  }
}

/**
 * Live voluntary party screen composed from source tiles, fonts, and icons,
 * rendered BG-first then OBJ-on-top. The menu-fade close (ISSUES #80 open
 * remainder item (a), `docs/fade-layer-forensics.md` §1) blends the two
 * layers at their own coefficients: BG at `closeElapsed & ~1`, OBJ one blend
 * step behind at `(closeElapsed - 1) & ~1`, so frame 979 shows the OBJ sprite
 * stack at y=14 over a fully black BG.
 */
export function renderBattlePartySelect(
  fb: Uint8Array,
  state: BattlePartySelectState,
  close: PartySelectCloseRenderAssets | undefined = undefined,
): void {
  const closeElapsed = state.closeElapsed;
  const phase = closeElapsed === null
    ? null
    : battlePartySelectClosePhase(closeElapsed);
  if (phase === "black-hold") {
    fillFramebuffer(fb, 0, 0, 0);
    return;
  }
  if (phase === "field-reveal" || phase === "field-hold" || phase === "done") {
    // field-reveal draws the settled battle field (overwriting the menu) and
    // fades it in from black; field-hold/done are unreachable here -- the
    // orchestrator clears the selector at the field-hold edge -- and
    // `renderPartySelectClose` leaves the caller's buffer untouched for them,
    // matching the pre-split draw-then-noop behaviour's output.
    renderPartySelectClose(fb, state, close);
    return;
  }
  // ISSUES #80 open remainder (b): the menu's open animation. Only the live
  // voluntary route supplies the battle-scene asset (`close`); every other
  // caller (forced snapshots without assets) renders the menu settled,
  // exactly as before the open-fade existed.
  const openPhase = closeElapsed === null && close !== undefined
    ? battlePartySelectOpenPhase(state.openElapsed)
    : "done";
  if (openPhase === "bright-hold" || openPhase === "field-fade-out") {
    if (close === undefined) {
      drawPartySelectBgLayer(fb, state);
      drawPartySelectObjLayer(fb, state);
      return;
    }
    // The oracle holds the settled action-menu battle scene through frame 765
    // and fades it out 766-781. The scene's OBJ layer (battler sprites,
    // shadows, healthboxes) is one blend step behind its BG layer
    // (`objPaletteToggle`, palette.c:454): on the even `e` frames
    // (766/768/.../780) `y_obj = y_bg - 2`, so those pixels are blended at
    // `y_obj` while the rest go at `y_bg` -- the same scratch-buffer +
    // alpha-coverage composite idiom as the close menu-fade. The OBJ layer is
    // the app's own sprite-only scratch render (`drawBattleSceneObjOnly`); a
    // scratch pixel counts only where the settled full scene still shows it
    // (the BG message-box chrome overpaints the sprite rows it covers, and
    // the oracle keys those to the BG palette instead --
    // docs/fade-layer-forensics.md §8(d)).
    close.drawBattleScene(fb, state.openElapsed);
    if (openPhase === "field-fade-out") {
      const yBg = partySelectOpenFieldFadeBgY(state.openElapsed);
      const yObj = partySelectOpenFieldFadeObjY(state.openElapsed);
      if (yBg === yObj) {
        applyFadeToBlack(fb, yBg);
        return;
      }
      const full = new Uint8Array(fb.length);
      full.set(fb);
      applyFadeToBlack(fb, yBg);
      const objSettled = new Uint8Array(fb.length);
      close.drawBattleSceneObjOnly(objSettled, state.openElapsed);
      const obj = new Uint8Array(fb.length);
      obj.set(objSettled);
      applyFadeToBlack(obj, yObj);
      for (let p = 0; p < fb.length; p += 4) {
        if (
          objSettled[p + 3] !== 0
          && objSettled[p] === full[p]
          && objSettled[p + 1] === full[p + 1]
          && objSettled[p + 2] === full[p + 2]
        ) {
          fb[p] = obj[p]!;
          fb[p + 1] = obj[p + 1]!;
          fb[p + 2] = obj[p + 2]!;
        }
      }
    }
    return;
  }
  if (openPhase === "black-hold") {
    fillFramebuffer(fb, 0, 0, 0);
    return;
  }
  if (openPhase === "menu-fade-in") {
    // Same scratch-buffer + alpha-coverage composite idiom as the close
    // menu-fade, but descending from black: BG at `y_bg(m)`, OBJ one blend
    // step behind at `y_obj(m)`, m = openElapsed - 46 (docs/fade-layer-
    // forensics.md §2). At m=15 both layers are at y=0 = the settled menu.
    const m = state.openElapsed
      - (PARTY_SELECT_OPEN_BRIGHT_HOLD_FRAMES
        + PARTY_SELECT_OPEN_FIELD_FADE_FRAMES
        + PARTY_SELECT_OPEN_BLACK_HOLD_FRAMES);
    drawPartySelectBgLayer(fb, state);
    applyFadeToBlack(fb, partySelectOpenMenuFadeBgY(m));
    const obj = new Uint8Array(fb.length);
    drawPartySelectObjLayer(obj, state);
    applyFadeToBlack(obj, partySelectOpenMenuFadeObjY(m));
    for (let p = 0; p < fb.length; p += 4) {
      if (obj[p + 3] !== 0) {
        fb[p] = obj[p]!;
        fb[p + 1] = obj[p + 1]!;
        fb[p + 2] = obj[p + 2]!;
      }
    }
    return;
  }
  drawPartySelectBgLayer(fb, state);
  if (phase === "menu-fade") {
    if (closeElapsed === null) fail("menu-fade phase requires a non-null closeElapsed");
    // y_bg = closeElapsed & ~1 (identical to the pre-split formula); the OBJ
    // layer is always exactly one blend step (y-2) behind, blended into a
    // scratch buffer and composited over the faded BG. `setPixel` writes
    // alpha 255, so alpha !== 0 is the exact sprite coverage mask.
    applyFadeToBlack(fb, closeElapsed & ~1);
    const obj = new Uint8Array(fb.length);
    drawPartySelectObjLayer(obj, state);
    applyFadeToBlack(obj, (closeElapsed - 1) & ~1);
    for (let p = 0; p < fb.length; p += 4) {
      if (obj[p + 3] !== 0) {
        fb[p] = obj[p]!;
        fb[p + 1] = obj[p + 1]!;
        fb[p + 2] = obj[p + 2]!;
      }
    }
    return;
  }
  drawPartySelectObjLayer(fb, state);
}

/**
 * ISSUES #80 slice 6: drive the party-menu close from `closeElapsed` instead
 * of holding the settled frame through the whole close. Measured schedule
 * (docs/party-menu-rank6-ground-truth.md §7, oracle-verified): menu fade-out
 * 965-979 (standard fade-to-black, y=2..16 held 2 frames each; the two-layer
 * blend lives in `renderBattlePartySelect`), full black 980-1018, battle
 * field fade-in from black 1019-1034.
 */
export type PartySelectCloseRenderAssets = Readonly<{
  /** Draws the settled battle field (the resolution's own scene view). */
  drawField(fb: Uint8Array): void;
  /**
   * Draws the settled pre-party-menu battle scene the open window holds
   * (oracle frames 763-765): the battle-command presentation frozen in
   * party-handoff, rendered as if still in its action-menu phase (field +
   * sprites + healthboxes + the "What will X do?" message box + the
   * FIGHT/BAG/POKéMON/RUN action menu). The close path's `drawField` omits
   * that bottom chrome, so the open side needs this separate drawable.
   * `openElapsed` gates the ISSUES #80 Class B per-sprite row offsets (the
   * player healthbox +1 from e=7, the player back sprite −1 from e=16,
   * `docs/fade-layer-forensics.md` §9).
   */
  drawBattleScene(fb: Uint8Array, openElapsed?: number): void;
  /**
   * Draws the same settled action-menu battle scene's OBJ (sprite) layer only
   * (shadow, battler sprites, healthboxes) into a scratch buffer. The open
   * field-fade-out blends the full scene at `y_bg`, then blends this scratch
   * at `y_obj` -- one blend step behind `y_bg` -- and composites it over the
   * frame using its alpha-255 coverage, so the OBJ pixels track the oracle's
   * own OBJ palette schedule (ISSUES #80 Class A,
   * docs/fade-layer-forensics.md §8(d)). `openElapsed` gates the same Class B
   * per-sprite row offsets as `drawBattleScene`.
   */
  drawBattleSceneObjOnly(fb: Uint8Array, openElapsed?: number): void;
}>;

function renderPartySelectClose(
  fb: Uint8Array,
  state: BattlePartySelectState,
  close: PartySelectCloseRenderAssets | undefined,
): void {
  if (state.closeElapsed === null) return;
  const phase = battlePartySelectClosePhase(state.closeElapsed);
  if (phase === "black-hold") {
    fillFramebuffer(fb, 0, 0, 0);
  } else if (phase === "field-reveal") {
    if (close === undefined) {
      fillFramebuffer(fb, 0, 0, 0);
      return;
    }
    close.drawField(fb);
    // k = 1..16 across the 16 reveal frames (closeElapsed 56-71).
    const k = state.closeElapsed
      - (PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES
        + PARTY_SELECT_CLOSE_MENU_FADE_FRAMES
        + PARTY_SELECT_CLOSE_BLACK_HOLD_FRAMES)
      + 1;
    applyFadeFromBlack(fb, k);
  } else if (phase === "field-hold" && state.outcome?.kind === "cancel" && close !== undefined) {
    // pic6: a cancelled menu holds the settled field (empty message box) until the action menu returns; a SEND OUT hands the
    // field-hold frames to the resolution presentation instead (factoryRoundBattleOrchestrator.ts).
    close.drawField(fb);
  }
}

/** Standard `BlendPalette` fade-to-black over the whole framebuffer (5-bit). */
function applyFadeToBlack(fb: Uint8Array, y: number): void {
  for (let p = 0; p < fb.length; p += 4) {
    fb[p] = blendComponentToBlack(fb[p]!, y);
    fb[p + 1] = blendComponentToBlack(fb[p + 1]!, y);
    fb[p + 2] = blendComponentToBlack(fb[p + 2]!, y);
  }
}

/**
 * Field reveal from black, 8-bit linear blend, k = 1..16. Measured on the
 * oracle the reveal ramp is a straight 8-bit blend (non-5-bit-quantized
 * values like 15/31 prove it is not a palette fade) with a per-channel
 * rounding quirk: the red byte rounds UP (`(c*k + 15) >> 4`) while green and
 * blue round DOWN (`(c*k) >> 4`). Pinned per-frame against
 * `mid-battle-switch-dense-a-off` frames 1019-1034.
 */
function applyFadeFromBlack(fb: Uint8Array, k: number): void {
  for (let p = 0; p < fb.length; p += 4) {
    fb[p] = (fb[p]! * k + 15) >> 4;
    fb[p + 1] = (fb[p + 1]! * k) >> 4;
    fb[p + 2] = (fb[p + 2]! * k) >> 4;
  }
}
