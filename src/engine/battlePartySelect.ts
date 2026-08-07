import partyMenuSourceData from "../assets/gen/party-menu-source.json" with { type: "json" };
import partyMenuGenderGlyphsData from "../assets/gen/party-menu-gender-glyphs.json" with { type: "json" };
import partyMonIconsData from "../assets/gen/party-mon-icons.json" with { type: "json" };
import stdWindowData from "../assets/gen/prebattle-room-std-window.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
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
import { setPixel } from "./framebuffer.ts";
import { drawText, type FontData } from "./font.ts";
import {
  drawStandardWindowFrame,
  drawStandardWindowText,
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
  message: string | null;
  outcome:
    | null
    | Readonly<{ kind: "cancel" }>
    | Readonly<{ kind: "select"; partyIndex: BattlePartyIndex }>;
  elapsed: number;
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
  | "field-hold"
  | "done";

/** Settled menu through fixture frame 1018 (confirm at 963, closeElapsed 0-55). */
export const PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES = 56;
/** Menu fade-out window 1019-1034 (closeElapsed 56-71). */
export const PARTY_SELECT_CLOSE_MENU_FADE_FRAMES = 16;
/** Full menu-visible span 963-1034 (closeElapsed 0-71). */
export const PARTY_SELECT_CLOSE_MENU_FRAMES =
  PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES + PARTY_SELECT_CLOSE_MENU_FADE_FRAMES;
/**
 * Field idle 1035-1043 (closeElapsed 72-80) -- the resolution's
 * null-handoff confirm phase holds the settled field before the recall
 * printstring's first glyph lands at fixture frame 1044.
 */
export const PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES = 9;
/** Full close span: confirm edge 963 -> recall first glyph 1044. */
export const PARTY_SELECT_CLOSE_TOTAL_FRAMES =
  PARTY_SELECT_CLOSE_MENU_FRAMES + PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES;

export function battlePartySelectClosePhase(
  closeElapsed: number,
): BattlePartySelectClosePhase {
  if (closeElapsed < PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES) return "menu-hold";
  if (closeElapsed < PARTY_SELECT_CLOSE_MENU_FRAMES) return "menu-fade";
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
    message: forced.message,
    outcome: null,
    elapsed: forced.elapsed,
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
    cursor: activePartyIndex <= 2 ? activePartyIndex as 0 | 1 | 2 : 0,
    rightColumnCursor: 1,
    submenuOpen: false,
    message: null,
    outcome: null,
    elapsed: 0,
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
  if (newKeys.has("A")) return Object.freeze({ ...next, submenuOpen: true });
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
  }>;
}>;
type PartyIcon = Readonly<{ frame0: Tileset; frame1: Tileset; palette: readonly RgbColor[] }>;

const partySource = partyMenuSourceData as unknown as PartySourceAsset;
const partyIcons = partyMonIconsData as unknown as Readonly<Record<string, PartyIcon>>;
const fontSmall = {
  ...(fontSmallData as unknown as FontData),
  glyphHeight: 12,
} satisfies FontData;
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
): void {
  const tile = partySource.tileset.tiles[tileIndex];
  if (tile === undefined) return;
  for (let py = 0; py < 8; py += 1) for (let px = 0; px < 8; px += 1) {
    const sx = hFlip ? 7 - px : px;
    const sy = vFlip ? 7 - py : py;
    const color = partySource.palette[paletteBank * 16 + tile[sy * 8 + sx]!];
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
): void {
  for (let ty = 0; ty < slot.height; ty += 1) for (let tx = 0; tx < slot.width; tx += 1) {
    drawTile(fb, slot.tiles[ty * slot.width + tx]!, paletteBank, x + tx * 8, y + ty * 8);
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
/** Unselected-card text ink (observed sPartyBoxEmptySlotPalIds bank); selected-card ink is the current-selection pal (123,214,239). */
const CARD_TEXT_FG_UNSELECTED: RgbColor = { r: 57, g: 148, b: 222 };
const CARD_TEXT_FG_SELECTED: RgbColor = { r: 123, g: 214, b: 239 };

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

function drawRowText(fb: Uint8Array, row: BattlePartySelectRow, selected: boolean): void {
  const info = PARTY_CARD_INFO[row.partyIndex];
  const fg = selected ? CARD_TEXT_FG_SELECTED : CARD_TEXT_FG_UNSELECTED;
  const palette: RgbColor[] = [
    { r: 0, g: 0, b: 0 },
    fg,
    CARD_TEXT_SHADOW,
  ];
  const colors = { fg: 1, bg: 0, shadow: 2 };
  drawText(fb, fontSmall, charmap, row.name, info.name.x, info.name.y, palette, colors);
  drawText(fb, fontSmall, charmap, `Lv${row.level}`, info.level.x, info.level.y, palette, colors);
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

/** Live voluntary party screen composed from source tiles, fonts, and icons. */
export function renderBattlePartySelect(
  fb: Uint8Array,
  state: BattlePartySelectState,
): void {
  drawSourceBackground(fb);
  // LoadPartyBoxPalette (party_menu.c:2205-2280) overwrites box banks 3/4/5
  // with the same "empty slot" colors (sPartyBoxEmptySlotPalIds {52,53,54} /
  // {49,55,56} -> gPartyMenuBg_Pal bank 3), so every normal box renders from
  // bank 3; fainted uses bank 6, the current-selection box bank 7.
  drawSlot(fb, partySource.slots.main, 8, 24, state.cursor === 0 ? 7 : state.rows[0].fainted ? 6 : 3);
  drawSlot(fb, partySource.slots.wide, 96, 8, state.cursor === 1 ? 7 : state.rows[1].fainted ? 6 : 3);
  drawSlot(fb, partySource.slots.wide, 96, 32, state.cursor === 2 ? 7 : state.rows[2].fainted ? 6 : 3);
  for (const row of state.rows) {
    drawRowText(fb, row, state.cursor === row.partyIndex);
    drawGenderGlyph(fb, row);
    drawHpBar(fb, row);
    drawIcon(fb, row, state.cursor === row.partyIndex, state.elapsed, state.selectedSinceElapsed);
  }

  if (state.submenuOpen) {
    drawStandardWindowFrame(fb, 144, 80, 10, 6);
    drawStandardWindowText(fb, "▶ SEND OUT", 152, 89);
    drawStandardWindowText(fb, "  SUMMARY", 152, 105);
    drawStandardWindowText(fb, "  CANCEL", 152, 121);
  }

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
