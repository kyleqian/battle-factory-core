/**
 * Production hardware-OAM provider for the live move bodies whose display plans decode a per-frame OAM buffer
 * (docs/next-adapters-prep20.md). Pure and source-derived: never a capture row.
 *
 * Model (prep20 s0.1, all corpora): `hardwareOam[row] = build(sprite state of row - 1)` (the VBlank copy lags one frame);
 * row 0 is the pre-activation idle scene. One build walks the full 64-slot `sSpriteOrder` once: the healthbox group
 * contributes its measured entry block, every visible in-use sprite its attr triple, the tail is the dummy entry, and
 * each entry's pad halfword carries one parameter of hardware matrix `index >> 2`.
 *
 * Sprite order (gap G1): `BuildSpritePriorities` + `SortSprites` run over ALL 64 slots every frame with the keys
 * `(oam.priority << 8 | subpriority, oam.y)`. A free slot holds `ResetSprite`'s `sDummySprite` (priority 3, subpriority
 * 0xFF, oam.y 160), an invisible sprite keeps its last written oam.y (UpdateOamCoords skips it). With those keys the
 * lent activation order carried through the body with `sortGbaSpriteOrder` equals the ROM `sSpriteOrder` on every row.
 */
// src/engine consumes src/animation only through the pinned seam (tests/animation/animationBoundaryRatchet.test.ts): the
// GBA sort pass and the move source programs are passed in by liveMoveAnimation.ts.

/** `gbaObjCompositor.ts sortGbaSpriteOrder` (one stable BuildSpritePriorities/SortSprites pass). */
export type LiveSpriteOrderSort = (precedingOrder: readonly number[],
  keys: readonly Readonly<{ slot: number; priority: 0 | 1 | 2 | 3; subpriority: number; y: number }>[]) => number[];

export type OamAttr = readonly [number, number, number];
export interface LiveOamSprite {
  readonly slot: number;
  /** attr0..2 written to the OAM buffer when visible. */
  readonly attr: OamAttr;
  readonly subpriority: number;
  readonly visible: boolean;
  /** The sprite's oam.y byte used by SortSprites (stale while invisible). */
  readonly oamY: number;
}
const IDENTITY = [256, 0, 0, 256] as const;
/** `sDummySprite` (sprite.c ResetSprite): DUMMY_OAM_DATA y 160, x 304, priority 3; subpriority 0xFF. */
export const GBA_DUMMY_OAM_ATTR: OamAttr = Object.freeze([0x00a0, 0x0130, 0x0c00] as const);
const DUMMY_KEY = Object.freeze({ priority: 3 as const, subpriority: 0xff, y: 160 - 256 });

/**
 * Known-entry healthbox / healthbar OAM block (9 entries from slots 62, 60, 0, 63, 1, 61; subsprite tables) that leads
 * every build while those occupants are unchanged. Measured constant (prep20 WISP_HEALTHBOX; equal in the Will-O-Wisp,
 * Pursuit normal and Fury Cutter corpora and alternates). No renderer branch draws it (healthboxes are composed by the
 * controller), it only keeps every move entry's `oamIndex` source-exact.
 */
export const KNOWN_ENTRY_HEALTHBOX_OAM: readonly string[] = Object.freeze([
  "58409e401c610001", "5840be4020610000", "1e40244024610000", "1e40444028610001", "1e0014002c610001",
  "48007ec01c500000", "4800bec05c500000", "0e400cc09c500001", "0e404cc0bc500001",
]);
export const KNOWN_ENTRY_HEALTHBOX_SLOTS: readonly number[] = Object.freeze([62, 60, 0, 63, 1, 61]);

const signedY = (oamY: number): number => { const y = oamY & 0xff; return y >= 160 ? y - 256 : y; };

/** One SortSprites pass over the full 64-slot order (free slots carry the dummy key). */
export function carryLiveSpriteOrder(previous: readonly number[], sprites: readonly LiveOamSprite[], sort: LiveSpriteOrderSort): number[] {
  const bySlot = new Map(sprites.map((sprite) => [sprite.slot, sprite] as const));
  return sort(previous, previous.map((slot) => {
    const sprite = bySlot.get(slot);
    return sprite ? { slot, priority: (sprite.attr[2] >>> 10 & 3) as 0 | 1 | 2 | 3, subpriority: sprite.subpriority, y: signedY(sprite.oamY) }
      : { slot, ...DUMMY_KEY } as const;
  }));
}

const hex4 = (value: number): string => ((value & 0xff) << 8 | value >>> 8 & 0xff).toString(16).padStart(4, "0");
const entry = (attr: OamAttr, pad: number): string => hex4(attr[0]) + hex4(attr[1]) + hex4(attr[2]) + hex4(pad);

/** The 128-entry hardware OAM strings (retained-corpus hex layout) of one build. */
export function buildLiveHardwareOam(
  order: readonly number[], sprites: readonly LiveOamSprite[],
  healthbox: Readonly<{ slots: readonly number[]; entries: readonly string[] }>,
  matrices: readonly (readonly [number, number, number, number])[] = [],
): string[] {
  const bySlot = new Map(sprites.map((sprite) => [sprite.slot, sprite] as const));
  const entries: string[] = [];
  let healthboxEmitted = false;
  for (const slot of order) {
    if (healthbox.slots.includes(slot)) {
      if (!healthboxEmitted) { entries.push(...healthbox.entries); healthboxEmitted = true; }
      continue;
    }
    const sprite = bySlot.get(slot);
    if (sprite?.visible) entries.push(entry(sprite.attr, 0));
    if (entries.length >= 128) break;
  }
  while (entries.length < 128) entries.push(entry(GBA_DUMMY_OAM_ATTR, 0));
  return entries.slice(0, 128).map((value, index) =>
    value.slice(0, 12) + hex4((matrices[index >> 2] ?? IDENTITY)[index & 3]!));
}

type Point = Readonly<{ x: number; y: number }>;
type Side = "player" | "opponent";
export interface LiveOamBattler {
  readonly slot: number;
  readonly attr: OamAttr;
  readonly subpriority: number;
}
/** Known-entry occupants other than the battlers (healthboxes, healthbars, the invisible slot-2 shadow helper). */
export interface LiveOamScene {
  readonly occupants: readonly Readonly<{ slot: number; attr: OamAttr; subpriority: number; visible: boolean }>[];
  readonly healthbox: Readonly<{ slots: readonly number[]; entries: readonly string[] }>;
}

export interface LiveWillOWispOamInputs {
  readonly attackerSide: Side;
  /** Orb origin (attacker sBattlerCoords X / Y) and fire origin (target X_2 / Y_PIC_OFFSET). */
  readonly attackerCenter: Point;
  readonly targetCenter: Point;
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  readonly scene: LiveOamScene;
  /** Known-entry allocator values: ANIM_TAG_WISP_ORB / ANIM_TAG_WISP_FIRE tile bases and palette slots. */
  readonly orbTileBase: number;
  readonly fireTileBase: number;
  readonly orbPaletteSlot: number;
  readonly firePaletteSlot: number;
  /** Occupied slots at activation (lowest-free allocation skips them). */
  readonly occupiedSlots: readonly number[];
  /** The lent full 64-slot activation order. */
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** willOWisp.ts source programs: `willOWispTimeline` of this geometry and `willOWispSpritesAtAge`. */
  readonly timeline: Readonly<{ orbEnd: number; fireStart: number; fireEnd: number; cleanup: number }>;
  readonly spritesAt: (state: number) => readonly WispProgram[];
}
export interface WispProgram {
  readonly kind: "orb" | "fire"; readonly ordinal: number; readonly start: number; readonly animation: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly invisible: boolean;
}

/** createsprite subpriority offsets of Move_WILL_O_WISP (orbs 2, 3, 4, 4; fires 2), from the attacker's subpriority. */
const ORB_SUBPRIORITY_OFFSET = [2, 3, 4, 4] as const;
const FIRE_SUBPRIORITY_OFFSET = 2;

/** Lowest-free slots over the source lifetimes, creation order (start, orbs before fires, ordinal). */
function wispSlots(input: LiveWillOWispOamInputs): Map<string, number> {
  const t = input.timeline;
  const lives: { key: string; start: number; end: number }[] = [];
  for (let o = 0; o < 4; o += 1) lives.push({ key: `orb${o}`, start: 10 + o * 5, end: t.orbEnd + o * 5 });
  for (let o = 0; o < 6; o += 1) lives.push({ key: `fire${o}`, start: t.fireStart, end: t.fireEnd });
  const slots = new Map<string, number>();
  for (const life of lives) {
    const used = new Set(input.occupiedSlots);
    for (const other of lives) {
      const slot = slots.get(other.key);
      if (slot !== undefined && other.start <= life.start && life.start <= other.end) used.add(slot);
    }
    let slot = 0;
    while (used.has(slot)) slot += 1;
    slots.set(life.key, slot);
  }
  return slots;
}

/**
 * Per-row hardware OAM of one Will-O-Wisp body (rows 0..cleanup): the reducer's own source programs (orb linear
 * translation, fire spiral) placed in lowest-free slots, keyed into the carried full sprite order. Orb priority is the
 * target's BG priority at creation (2); fire priority = the target's BG priority (opponent target BG1 drops to 1 at
 * splitbgprio_all) + 1 while `data[1]` is in [64, 195]. The target battler is absent from the build of states
 * [8, fireEnd + 1] (monbg; prep20 s0.2.3).
 */
export function liveWillOWispHardwareOamRows(input: LiveWillOWispOamInputs): string[][] {
  const t = input.timeline;
  const slots = wispSlots(input);
  const staleY = new Map<number, number>();
  const spritesAt = (state: number): LiveOamSprite[] => {
    const out: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    out.push({ ...input.attacker, visible: true, oamY: input.attacker.attr[0] & 0xff });
    out.push({ ...input.target, visible: !(state >= 8 && state <= t.fireEnd + 1), oamY: input.target.attr[0] & 0xff });
    if (state < 0) return out;
    for (const sprite of input.spritesAt(state)) {
      const slot = slots.get(`${sprite.kind}${sprite.ordinal}`)!, local = state - sprite.start;
      const frame = Math.floor((local + 1) / 5);
      let attr: OamAttr, subpriority: number;
      if (sprite.kind === "orb") {
        const tile = input.orbTileBase + (sprite.animation === 0 ? (frame % 4) * 4 : sprite.animation === 1 ? 16 : 20);
        attr = [(sprite.y + sprite.y2 - 8) & 0xff, 0x4000 | (sprite.x + sprite.x2 - 8) & 0x1ff,
          tile | 2 << 10 | input.orbPaletteSlot << 12];
        subpriority = input.attacker.subpriority - ORB_SUBPRIORITY_OFFSET[sprite.ordinal]!;
      } else {
        const data1 = (sprite.ordinal * 42 + (local + 2) * 7) & 255;
        const priority = (input.attackerSide === "player" ? 1 : 2) + (data1 < 64 || data1 > 195 ? 0 : 1);
        attr = [(sprite.y + sprite.y2 - 16) & 0xff, 0x8000 | (sprite.x + sprite.x2 - 16) & 0x1ff,
          input.fireTileBase + (frame % 4) * 16 | priority << 10 | input.firePaletteSlot << 12];
        subpriority = input.attacker.subpriority - FIRE_SUBPRIORITY_OFFSET;
      }
      if (!sprite.invisible) staleY.set(slot, attr[0] & 0xff);
      out.push({ slot, attr, subpriority, visible: !sprite.invisible, oamY: staleY.get(slot) ?? attr[0] & 0xff });
    }
    return out;
  };
  const rows: string[][] = [];
  let order: readonly number[] = input.activationOrder;
  let previous = spritesAt(-1);
  for (let row = 0; row <= t.cleanup; row += 1) {
    rows.push(buildLiveHardwareOam(order, previous, input.scene.healthbox));
    previous = spritesAt(row);
    order = carryLiveSpriteOrder(order, previous, input.sort);
  }
  return rows;
}

export interface LivePursuitOamInputs {
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  readonly scene: LiveOamScene;
  /** InitSpritePosToAnimTarget(TRUE): the target's X_2 / Y_PIC_OFFSET. */
  readonly impactCenter: Point;
  /** Known-entry allocator values of the IMPACT hit splat (lowest-free slot, matrix, tile base, palette slot). */
  readonly impactSlot: number;
  readonly impactMatrixNum: number;
  readonly impactTileBase: number;
  readonly impactPaletteSlot: number;
  /** sBasicHitSplat affine anim end scale: 372 (anim 2, normal) / 303 (anim 1, switch interception). */
  readonly impactScale: number;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
}

/** createsprite gBasicHitSplatSpriteTemplate, ANIM_TARGET, 3: subpriority = attacker subpriority - 3 (prep20 s1.2). */
const PURSUIT_IMPACT_SUBPRIORITY_OFFSET = 3;
export const PURSUIT_ROWS = 103;

/**
 * Per-row hardware OAM of one Pursuit body (rows 0..102): the static attacker, the target absent from the builds of states
 * [5, 58] (monbg), and the IMPACT hit splat (AffineNormal ObjBlend 32x32, priority 2) alive for states 47..56 with its
 * constant end matrix in its matrix slot, folded into the entry pad words like the hardware buffer.
 */
export function livePursuitHardwareOamRows(input: LivePursuitOamInputs): { oam: string[][]; matrices: (readonly [number, number, number, number])[][] } {
  const impactAttr: OamAttr = [0x0100 | 0x0400 | (input.impactCenter.y - 16) & 0xff,
    0x8000 | input.impactMatrixNum << 9 | (input.impactCenter.x - 16) & 0x1ff,
    input.impactTileBase | 2 << 10 | input.impactPaletteSlot << 12];
  const spritesAt = (state: number): LiveOamSprite[] => {
    const out: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    out.push({ ...input.attacker, visible: true, oamY: input.attacker.attr[0] & 0xff });
    out.push({ ...input.target, visible: !(state >= 5 && state <= 58), oamY: input.target.attr[0] & 0xff });
    if (state >= 47 && state <= 56) out.push({ slot: input.impactSlot, attr: impactAttr, visible: true, oamY: impactAttr[0] & 0xff,
      subpriority: input.attacker.subpriority - PURSUIT_IMPACT_SUBPRIORITY_OFFSET });
    return out;
  };
  const matricesAt = (state: number) => Array.from({ length: 32 }, (_, index) =>
    state >= 47 && state <= 56 && index === input.impactMatrixNum
      ? [input.impactScale, 0, 0, input.impactScale] as const : IDENTITY);
  const oam: string[][] = [], matrices: (readonly [number, number, number, number])[][] = [];
  let order: readonly number[] = input.activationOrder;
  let previous = spritesAt(-1);
  for (let row = 0; row < PURSUIT_ROWS; row += 1) {
    const m = matricesAt(row - 1);
    oam.push(buildLiveHardwareOam(order, previous, input.scene.healthbox, m));
    matrices.push(m);
    previous = spritesAt(row);
    order = carryLiveSpriteOrder(order, previous, input.sort);
  }
  return { oam, matrices };
}

export interface LiveFuryCutterOamInputs {
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  readonly targetSide: Side;
  readonly scene: LiveOamScene;
  /** AnimTask_IsFuryCutterHitRight: furyCutterCounter & 1. */
  readonly rightHit: boolean;
  /** Known-entry allocator values of ANIM_TAG_CUT (lowest-free slot, tile base, palette slot). */
  readonly sliceSlot: number;
  readonly cutTileBase: number;
  readonly cutPaletteSlot: number;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
}
/** sBattlerCoords (battle_anim_mons.c): AnimCuttingSlice anchors on GetBattlerSpriteCoord(X / Y), the static table (prep20 s0.2.4). */
const SINGLES_BATTLER_COORDS: Readonly<Record<Side, Point>> = Object.freeze({ player: { x: 72, y: 80 }, opponent: { x: 176, y: 40 } });
export const FURY_CUTTER_ROWS = 43;

/**
 * Per-row hardware OAM of one Fury Cutter body (rows 0..42): the cutting slice (gCuttingSliceSpriteTemplate, ObjBlend 32x32,
 * priority 2, subpriority attacker - 2) alive for states 7..30 (AnimSlice_Step x20 in Q8, then WaitAnimForDuration(3)),
 * h-flipped for the right hit; the target absent from the builds of states [5, 32] (monbg).
 */
export function liveFuryCutterHardwareOamRows(input: LiveFuryCutterOamInputs): string[][] {
  const c = SINGLES_BATTLER_COORDS[input.targetSide];
  const x = c.x + (input.rightHit ? -40 : 40), y = c.y + (input.targetSide === "player" ? 8 : 0) - 32;
  const sliceAt = (state: number): OamAttr | null => {
    if (state < 7 || state > 30) return null;
    const local = state - 7, steps = Math.min(local + 1, 20);
    let d1 = input.rightHit ? 0x400 : -0x400, d2 = 0x400, d3 = 0, d4 = 0;
    for (let i = 0; i < steps; i += 1) { d3 += d1; d4 += d2; d1 += input.rightHit ? -0x18 : 0x18; d2 -= 0x18; }
    const tile = input.cutTileBase + Math.min(3, Math.floor((local + 1) / 5)) * 16;
    return [0x0400 | (y + (d4 >> 8) - 16) & 0xff, 0x8000 | (input.rightHit ? 0x1000 : 0) | (x + (d3 >> 8) - 16) & 0x1ff,
      tile | 2 << 10 | input.cutPaletteSlot << 12];
  };
  const spritesAt = (state: number): LiveOamSprite[] => {
    const out: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    out.push({ ...input.attacker, visible: true, oamY: input.attacker.attr[0] & 0xff });
    out.push({ ...input.target, visible: !(state >= 5 && state <= 32), oamY: input.target.attr[0] & 0xff });
    const slice = sliceAt(state);
    if (slice) out.push({ slot: input.sliceSlot, attr: slice, visible: true, oamY: slice[0] & 0xff, subpriority: input.attacker.subpriority - 2 });
    return out;
  };
  const rows: string[][] = [];
  let order: readonly number[] = input.activationOrder;
  let previous = spritesAt(-1);
  for (let row = 0; row < FURY_CUTTER_ROWS; row += 1) {
    rows.push(buildLiveHardwareOam(order, previous, input.scene.healthbox));
    previous = spritesAt(row);
    order = carryLiveSpriteOrder(order, previous, input.sort);
  }
  return rows;
}
