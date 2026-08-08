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
import type { BattleStatus } from "./battleScenario.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { getMonGender, type MonGender } from "./monGender.ts";
import type { PartySelectState } from "./partySelect.ts";
import type { RgbColor } from "./bg.ts";
import { blendComponentToBlack } from "./paletteFade.ts";
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

export type BattlePartySelectCursor = 0 | 1 | 2 | "cancel";

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
  | null;

/**
 * GetAilmentFromStatus -> status-icon frame: the frame index is the ailment
 * (PSN/PRZ/SLP/FRZ/BRN) minus one, so the primary status maps one-to-one
 * onto the banked variant. `AILMENT_NONE` renders no sprite (and, per
 * DisplayPartyPokemonLevelCheck, keeps the level line).
 */
export function primaryStatusFromStatus1(status1: number): PartyMenuPrimaryStatus {
  if ((status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0) return "sleep";
  if ((status1 & (BATTLE_SCRIPT_STATUS1_POISON | BATTLE_SCRIPT_STATUS1_TOXIC_POISON)) !== 0) return "poison";
  if ((status1 & BATTLE_SCRIPT_STATUS1_BURN) !== 0) return "burn";
  if ((status1 & BATTLE_SCRIPT_STATUS1_FREEZE) !== 0) return "frozen";
  if ((status1 & BATTLE_SCRIPT_STATUS1_PARALYSIS) !== 0) return "paralyzed";
  return null;
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
  partyIndex: 0 | 1 | 2;
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
  /** Primary status; non-null hides the "Lv50" line and draws the status icon. */
  status: PartyMenuPrimaryStatus;
}>;

export type BattlePartySelectState = Readonly<{
  requestId: number;
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
  message: string | null;
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
  const selectedPartyIndex = forced.cursor === "onix"
    ? forced.request.faintedPartyIndex
    : forced.request.legalPartyIndexes[0]!;
  if (selectedPartyIndex > 2) {
    return fail(`forced cursor points outside the three-mon party: ${selectedPartyIndex}`);
  }
  const rows = forced.party.map((member): BattlePartySelectRow => Object.freeze({
    partyIndex: member.partyIndex,
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
    status: primaryStatusFromBattleStatus(member.status),
  })) as unknown as BattlePartySelectState["rows"];
  return Object.freeze({
    requestId: forced.request.requestId,
    rows: Object.freeze(rows),
    cursor: selectedPartyIndex as 0 | 1 | 2,
    rightColumnCursor: selectedPartyIndex === 2 ? 2 : 1,
    submenuOpen:
      forced.submenuOpen
      && (forced.sendOutElapsed === null || forced.sendOutElapsed === 0),
    submenuOpened:
      forced.submenuOpen
      && (forced.sendOutElapsed === null || forced.sendOutElapsed === 0),
    message: forced.message,
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

/** Constructs the voluntary selector from the live party, never a faint anchor. */
export function createBattlePartySelectState(
  request: BattleCommandRequest,
  rules: BattleScriptRulesContext,
): BattlePartySelectState {
  const legal = new Set(
    request.legalDecisions
      .filter((decision) => decision.kind === "switch")
      .map((decision) => decision.partyIndex),
  );
  const activePartyIndex = rules.battlers[request.battler]!.partyIndex;
  const rows = ([0, 1, 2] as const).map((partyIndex) => {
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
      status: primaryStatusFromStatus1(member.status1 ?? 0),
    });
  }) as unknown as BattlePartySelectState["rows"];
  return Object.freeze({
    requestId: request.requestId,
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
    message: null,
    outcome: null,
    elapsed: 0,
    openElapsed: 0,
    selectedSinceElapsed: -MON_ICON_CREATION_ELAPSED_OFFSET,
    closeElapsed: null,
  });
}

export function battlePartyNoEnergyMessage(row: BattlePartySelectRow): string {
  return `${row.name}${PARTY_NO_ENERGY_LINE_1_SUFFIX}\n${PARTY_NO_ENERGY_LINE_2}`;
}

function moveCursor(
  state: BattlePartySelectState,
  direction: "UP" | "DOWN" | "LEFT" | "RIGHT",
): Pick<BattlePartySelectState, "cursor" | "rightColumnCursor"> {
  const { cursor } = state;
  if (direction === "UP") {
    if (cursor === 0) return { cursor: "cancel", rightColumnCursor: state.rightColumnCursor };
    if (cursor === "cancel") return { cursor: 2, rightColumnCursor: 2 };
    return { cursor: (cursor - 1) as 0 | 1, rightColumnCursor: cursor === 2 ? 1 : state.rightColumnCursor };
  }
  if (direction === "DOWN") {
    if (cursor === "cancel") return { cursor: 0, rightColumnCursor: state.rightColumnCursor };
    if (cursor === 2) return { cursor: "cancel", rightColumnCursor: 2 };
    return { cursor: (cursor + 1) as 1 | 2, rightColumnCursor: (cursor + 1) as 1 | 2 };
  }
  if (direction === "LEFT" && cursor !== 0 && cursor !== "cancel") {
    return { cursor: 0, rightColumnCursor: cursor };
  }
  if (direction === "RIGHT" && cursor === 0) {
    return { cursor: state.rightColumnCursor, rightColumnCursor: state.rightColumnCursor };
  }
  return { cursor, rightColumnCursor: state.rightColumnCursor };
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
  });
  if (state.outcome !== null) return next;
  if (state.message !== null) {
    return newKeys.has("A") || newKeys.has("B")
      ? Object.freeze({ ...next, message: null })
      : next;
  }
  if (state.submenuOpen) {
    if (newKeys.has("B")) return Object.freeze({ ...next, submenuOpen: false });
    if (!newKeys.has("A") || state.cursor === "cancel") return next;
    const row = state.rows[state.cursor];
    if (row.fainted) {
      return Object.freeze({
        ...next,
        submenuOpen: false,
        message: battlePartyNoEnergyMessage(row),
      });
    }
    if (!row.legal) return next;
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
  if (newKeys.has("B") || (newKeys.has("A") && state.cursor === "cancel")) {
    return Object.freeze({
      ...next,
      outcome: Object.freeze({ kind: "cancel" }),
      closeElapsed: 0,
    });
  }
  if (newKeys.has("A")) {
    return Object.freeze({ ...next, submenuOpen: true, submenuOpened: true });
  }
  const direction = (["UP", "DOWN", "LEFT", "RIGHT"] as const)
    .find((button) => newKeys.has(button));
  if (direction === undefined) return next;
  const moved = Object.freeze({ ...next, ...moveCursor(state, direction) });
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
  paletteBank: number,
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
    const color = partySource.palette[paletteBank * 16 + colorIndex];
    if (color) setPixel(fb, x + px, y + py, color.r, color.g, color.b);
  }
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
  paletteBank: number,
  transparentZero = false,
): void {
  for (let ty = 0; ty < slot.height; ty += 1) for (let tx = 0; tx < slot.width; tx += 1) {
    drawTile(
      fb,
      slot.tiles[ty * slot.width + tx]!,
      paletteBank,
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
  const center = centers[row.partyIndex];
  const sheet = monIconFrameAt(elapsed) === 0 ? icon.frame0 : icon.frame1;
  const x2 = selected || row.partyIndex === 0 ? 0 : -4;
  const y2 = selected
    ? monIconSelectedY2(elapsed, selectedSinceElapsed)
    : row.partyIndex === 0 ? -4 : 0;
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
  const [centerX, centerY] = partyMenuSpriteCoords.layouts.single[row.partyIndex]!.heldItem;
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
  const [centerX, centerY] = partyMenuSpriteCoords.layouts.single[row.partyIndex]!.status;
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
  const [centerX, centerY] = partyMenuSpriteCoords.layouts.single[row.partyIndex]!.pokeball;
  const ball = partyMenuPokeballData as unknown as {
    frame: IconTilesetFrame;
    frameOpen: IconTilesetFrame;
    palette: readonly RgbColor[];
  };
  const open = cursor === row.partyIndex;
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
  const info = PARTY_CARD_INFO[row.partyIndex];
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
  const { x, y } = PARTY_CARD_INFO[row.partyIndex].hpBar;
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
  const info = PARTY_CARD_INFO[row.partyIndex];
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
  const hpString = `${row.hp}/`;
  drawText(fb, fontSmall, charmap, hpString, info.hp.x, info.hp.y, hpPalette, colors);
  drawText(fb, fontSmall, charmap, `/${row.maxHP}`, info.maxHp.x, info.maxHp.y, hpPalette, colors);
}

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

const CANCEL_FRAME_COLOR: RgbColor = { r: 74, g: 74, b: 99 };
const CANCEL_INTERIOR_COLOR: RgbColor = { r: 115, g: 90, b: 181 };
const CANCEL_CHECKER_L: RgbColor = { r: 206, g: 214, b: 123 };
const CANCEL_CHECKER_O: RgbColor = { r: 181, g: 181, b: 90 };

function drawCancelFrameRows(fb: Uint8Array): void {
  for (const [y, ranges] of CANCEL_FRAME_ROWS) {
    for (const part of ranges.split(",")) {
      const [a, b] = part.split("-").map(Number);
      for (let x = a!; x <= (b ?? a)!; x += 1) {
        setPixel(fb, x, y, CANCEL_FRAME_COLOR.r, CANCEL_FRAME_COLOR.g, CANCEL_FRAME_COLOR.b);
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

function drawCancelWindow(fb: Uint8Array): void {
  drawCancelWindowBackground(fb);
  // Interior color15 fills the right half (x202-235) between the divider and
  // the right frame; the ball + CANCEL text overpaint their own footprints.
  for (let y = 138; y <= 149; y += 1) {
    for (let x = 202; x <= 235; x += 1) {
      setPixel(fb, x, y, CANCEL_INTERIOR_COLOR.r, CANCEL_INTERIOR_COLOR.g, CANCEL_INTERIOR_COLOR.b);
    }
  }
  drawCancelFrameRows(fb);
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
function drawCancelPokeball(fb: Uint8Array): void {
  const ball = partyMenuPokeballData as unknown as {
    frame: IconTilesetFrame;
    palette: readonly RgbColor[];
  };
  const bx = 198 - 16;
  const by = 148 - 16;
  for (let ty = 0; ty < ball.frame.rows; ty += 1) for (let tx = 0; tx < ball.frame.columns; tx += 1) {
    const tile = ball.frame.tiles[ty * ball.frame.columns + tx]!;
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
  // bank 3; fainted uses bank 6, the current-selection box bank 7.
  drawSlot(fb, partySource.slots.main, 8, 24, state.cursor === 0 ? 7 : state.rows[0].fainted ? 6 : 3, true);
  drawSlot(fb, partySource.slots.wide, 96, 8, state.cursor === 1 ? 7 : state.rows[1].fainted ? 6 : 3, true);
  drawSlot(fb, partySource.slots.wide, 96, 32, state.cursor === 2 ? 7 : state.rows[2].fainted ? 6 : 3, true);
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

  const submenuVisible = state.submenuOpen && (state.closeElapsed === null || state.closeElapsed === 0);
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
    // Line 1 is gText_Shift: this is the voluntary mid-battle switch, whose
    // action list is sPartyMenuAction_ShiftSummaryCancel (data/party_menu.h)
    // because GetPartyMenuActionsTypeInBattle (party_menu.c:5788-5796) returns
    // ACTIONS_SHIFT unless gPartyMenu.action == PARTY_ACTION_SEND_OUT.
    drawStandardWindowText(fb, "SHIFT", 160, 105);
    drawStandardWindowText(fb, "SUMMARY", 160, 121);
    drawStandardWindowText(fb, "CANCEL", 160, 137);
    // Cursor: a separate "▶" glyph (gText_SelectorArrow3, strings.c:1468)
    // drawn by RedrawMenuCursor (menu.c:945) at window-relative (0,16*0+1) ->
    // screen (152,105), i.e. on the SHIFT line (cursorPos 0, per
    // InitMenuInUpperLeftCorner(...,0,TRUE)). NOT baked into the label text.
    drawStandardWindowText(fb, "▶", 152, 105);
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
  const messageWindowSwapped = state.submenuOpen || state.closeElapsed !== null;
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
    const message = state.message ?? "Choose a POKéMON.";
    const [line1, line2] = message.split("\n");
    drawStandardWindowText(fb, line1!, 8, 137);
    if (line2) drawStandardWindowText(fb, line2, 8, 153);
    if (state.cursor === "cancel") drawStandardWindowText(fb, "▶ CANCEL", 168, 145);
  }
  if (!submenuVisible) drawCancelWindow(fb);
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
    drawIcon(fb, row, state.cursor === row.partyIndex, iconElapsed, iconSelectionElapsed);
    // sPartyMenuSpriteCoords per-slot order: icon, heldItem, status, pokeball --
    // the item sprite draws on top of the mon icon's lower-left corner.
    drawHeldItemIcon(fb, row);
    drawStatusIcon(fb, row);
  }
  // The SHIFT submenu window replaces the CANCEL pokeball button while open
  // (including its confirm-tick frame, closeElapsed 0).
  if (!state.submenuOpen || (state.closeElapsed !== null && state.closeElapsed !== 0)) {
    drawCancelPokeball(fb);
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
