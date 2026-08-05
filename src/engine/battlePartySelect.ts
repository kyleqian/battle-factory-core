import partyMenuSourceData from "../assets/gen/party-menu-source.json" with { type: "json" };
import partyMonIconsData from "../assets/gen/party-mon-icons.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import fontSmallData from "../data/gen/font-small.json" with { type: "json" };
import speciesNamesData from "../data/gen/species-names.json" with { type: "json" };
import type { GbaButton } from "../input.ts";
import type {
  BattleCommandRequest,
  BattlePartyIndex,
} from "./battleDecisionBoundary.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
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
    closeElapsed: null,
  });
}

type SpeciesNameRow = Readonly<{ species: string; name: string }>;
const SPECIES_NAMES = (speciesNamesData as { species: SpeciesNameRow[] }).species;

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
  return direction === undefined ? next : Object.freeze({ ...next, ...moveCursor(state, direction) });
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

function drawIcon(fb: Uint8Array, row: BattlePartySelectRow, selected: boolean, elapsed: number): void {
  const icon = partyIcons[row.speciesKey];
  if (!icon) return fail(`missing icon catalog entry ${row.speciesKey}`);
  const centers = [{ x: 16, y: 40 }, { x: 104, y: 18 }, { x: 104, y: 42 }] as const;
  const center = centers[row.partyIndex];
  const sheet = Math.floor(elapsed / 8) % 2 === 0 ? icon.frame0 : icon.frame1;
  const x2 = selected || row.partyIndex === 0 ? 0 : -4;
  const y2 = selected ? (Math.floor(elapsed / 16) % 2 === 0 ? -3 : 1) : row.partyIndex === 0 ? -4 : 0;
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

function drawRowText(fb: Uint8Array, row: BattlePartySelectRow): void {
  const origins = [
    { x: 32, nameY: 35, detailX: 40, detailY: 45 },
    { x: 118, nameY: 11, detailX: 126, detailY: 20 },
    { x: 118, nameY: 35, detailX: 126, detailY: 44 },
  ] as const;
  const origin = origins[row.partyIndex];
  const palette = partySource.palette.slice(3 * 16, 4 * 16);
  drawText(fb, fontSmall, charmap, row.name, origin.x, origin.nameY, palette, { fg: 1, bg: 0, shadow: 2 });
  drawText(
    fb,
    fontSmall,
    charmap,
    `Lv${row.level} ${row.hp}/${row.maxHP}`,
    origin.detailX,
    origin.detailY,
    palette,
    { fg: 1, bg: 0, shadow: 2 },
  );
}

/** Live voluntary party screen composed from source tiles, fonts, and icons. */
export function renderBattlePartySelect(
  fb: Uint8Array,
  state: BattlePartySelectState,
): void {
  drawSourceBackground(fb);
  drawSlot(fb, partySource.slots.main, 8, 24, state.cursor === 0 ? 7 : state.rows[0].fainted ? 6 : 3);
  drawSlot(fb, partySource.slots.wide, 96, 8, state.cursor === 1 ? 7 : state.rows[1].fainted ? 6 : 4);
  drawSlot(fb, partySource.slots.wide, 96, 32, state.cursor === 2 ? 7 : state.rows[2].fainted ? 6 : 5);
  for (const row of state.rows) {
    drawRowText(fb, row);
    drawIcon(fb, row, state.cursor === row.partyIndex, state.elapsed);
  }

  if (state.submenuOpen) {
    drawStandardWindowFrame(fb, 144, 80, 10, 6);
    drawStandardWindowText(fb, "▶ SEND OUT", 152, 89);
    drawStandardWindowText(fb, "  SUMMARY", 152, 105);
    drawStandardWindowText(fb, "  CANCEL", 152, 121);
  }

  drawStandardWindowFrame(fb, 0, 112, 28, 4);
  const message = state.message ?? "Choose a POKéMON.";
  const [line1, line2] = message.split("\n");
  drawStandardWindowText(fb, line1!, 8, 121);
  if (line2) drawStandardWindowText(fb, line2, 8, 137);
  if (state.cursor === "cancel") drawStandardWindowText(fb, "▶ CANCEL", 168, 145);
}
