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

export interface LiveReturnOamInputs {
  readonly attackerSide: Side;
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  /** The attacker's / target's idle rest at activation (their OBJ attr rows include it; the move replaces it). */
  readonly attackerIdleY2: number;
  readonly targetIdle: Readonly<{ x2: number; y2: number }>;
  readonly scene: LiveOamScene;
  /** InitSpritePosToAnimTarget: the target's X_2 / Y_PIC_OFFSET. */
  readonly impactCenter: Point;
  /** Known-entry allocator values of ANIM_TAG_IMPACT (tile base, palette slot) and the free matrix ids in ascending order. */
  readonly impactTileBase: number;
  readonly impactPaletteSlot: number;
  readonly freeMatrices: readonly number[];
  readonly occupiedSlots: readonly number[];
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** Move_RETURN branch (default ReturnStrongest; ret88: ReturnWeak). */
  readonly branch?: LiveReturnBranch;
}

/**
 * Move_RETURN ReturnStrongest (friendship 255, the only branch the Factory reaches; docs/next-adapters-prep24.md s2): event
 * schedule of src/animation/return.ts PROGRAMS.strongest. Dips [start, steps, dy]; impacts [start, x, y, anim]; trace starts;
 * gSimplePaletteBlend helper births.
 */
export const RETURN_ROWS = 282;
const RETURN_MONBG_BIRTH = 4, RETURN_CLEAR_MONBG = 277;
const RETURN_DIPS = [[24, 16, 1], [60, 12, 1], [94, 8, 1], [120, 4, 1], [135, 4, 2], [157, 4, 3], [172, 4, 3], [187, 4, 3], [202, 4, 3]] as const;
const RETURN_IMPACTS = [[34, 3, -5, 2], [67, -10, -8, 2], [101, -10, -8, 2], [120, -10, -8, 2], [142, -10, -8, 2], [157, 0, 0, 2],
  [172, 0, 0, 2], [187, 0, 0, 2], [202, 0, 0, 2], [217, -10, -8, 0], [225, 10, 10, 0], [233, 3, -5, 0], [241, -5, 3, 0]] as const;
const RETURN_TRACES = [120, 120, 142, 157, 172, 187, 202] as const;
const RETURN_BLEND = [11, 264] as const;
const RETURN_SPLAT_LIFE = { 2: 10, 0: 9 } as const, RETURN_TRACE_LIFE = 6, RETURN_BLEND_LIFE = 12;
/** ret88: ReturnWeak (gAnimFriendship < 61, the kernel's friendship 0; battle_anim_scripts.s:8939-8948 = return.ts PROGRAMS.weak): two
 * gVerticalDipSpriteTemplate dips (16, 1) at 11 / 47, one basic hitsplat (x -10, y -8, animation 2) at 54, clearmonbg at 83, first
 * inactive age 87 (88 rows). No trace clones, palette blends or target ShakeMon (the target keeps its idle rest). */
export const RETURN_WEAK_ROWS = 88;
export type LiveReturnBranch = "weak" | "strongest";
interface LiveReturnProgram {
  readonly rows: number; readonly clearMonbg: number;
  readonly dips: readonly (readonly [number, number, number])[]; readonly impacts: readonly (readonly [number, number, number, 0 | 2])[];
  readonly traces: readonly number[]; readonly blends: readonly number[];
  /** ReturnStrongest's AnimTask_ShakeMon tasks end with the target x2 = 0: it is back at its art attr minus the idle rest. */
  readonly targetRestZeroed: boolean;
}
const RETURN_PROGRAMS: Readonly<Record<LiveReturnBranch, LiveReturnProgram>> = Object.freeze({
  strongest: { rows: RETURN_ROWS, clearMonbg: RETURN_CLEAR_MONBG, dips: RETURN_DIPS, impacts: RETURN_IMPACTS, traces: RETURN_TRACES,
    blends: RETURN_BLEND, targetRestZeroed: true },
  weak: { rows: RETURN_WEAK_ROWS, clearMonbg: 83, dips: [[11, 16, 1], [47, 16, 1]], impacts: [[54, -10, -8, 2]], traces: [], blends: [],
    targetRestZeroed: false },
});
export const liveReturnProgram = (branch: LiveReturnBranch): Readonly<{ rows: number; clearMonbg: number }> => RETURN_PROGRAMS[branch];

/** DoVerticalDip + TranslateSpriteLinearById: d steps of +dy, 2 hold rows, d steps of -dy. */
function returnDipY2(state: number, start: number, steps: number, dy: number): number {
  const k = state - start;
  if (k < 0) return 0;
  if (k < steps) return dy * (k + 1);
  if (k < steps + 2) return dy * steps;
  if (k < 2 * steps + 2) return dy * (2 * steps + 2 - k - 1);
  return 0;
}
export function liveReturnAttackerY2(state: number, branch: LiveReturnBranch = "strongest"): number {
  let y = 0;
  for (const [start, steps, dy] of RETURN_PROGRAMS[branch].dips) y += returnDipY2(state, start, steps, dy);
  return y;
}
interface ReturnLife { kind: "dip" | "splat" | "trace" | "blend"; first: number; last: number; idx: number; slot: number; matrix: number }
/** Lowest-free sprite slots / matrix ids over the helper lifetimes in script creation order. */
function returnLives(occupied: readonly number[], freeMatrices: readonly number[], branch: LiveReturnBranch): ReturnLife[] {
  const program = RETURN_PROGRAMS[branch];
  const events: { f: number; phase: number; kind: ReturnLife["kind"]; life: number; idx: number }[] = [];
  program.dips.forEach(([f, d], idx) => events.push({ f, phase: 0, kind: "dip", life: 2 * d + 3, idx }));
  program.impacts.forEach(([f, , , a], idx) => events.push({ f, phase: 1, kind: "splat", life: RETURN_SPLAT_LIFE[a], idx }));
  program.traces.forEach((f, idx) => events.push({ f, phase: 2, kind: "trace", life: RETURN_TRACE_LIFE, idx }));
  program.blends.forEach((f, idx) => events.push({ f, phase: -1, kind: "blend", life: RETURN_BLEND_LIFE, idx }));
  events.sort((a, b) => a.f - b.f || a.phase - b.phase || a.idx - b.idx);
  const held: ReturnLife[] = [];
  for (const e of events) {
    const alive = held.filter((o) => o.last >= e.f && o.first <= e.f);
    const used = new Set([...occupied, ...alive.map((o) => o.slot)]);
    let slot = 0;
    while (used.has(slot)) slot += 1;
    let matrix = 0;
    if (e.kind === "splat") {
      const taken = new Set(alive.filter((o) => o.kind === "splat").map((o) => o.matrix));
      matrix = freeMatrices.find((m) => !taken.has(m)) ?? 0;
    }
    held.push({ kind: e.kind, first: e.f, last: e.f + e.life - 1, idx: e.idx, slot, matrix });
  }
  return held;
}
export const liveReturnLives = (occupied: readonly number[], freeMatrices: readonly number[], branch: LiveReturnBranch = "strongest") =>
  returnLives(occupied, freeMatrices, branch);

/**
 * Per-row hardware OAM + matrices of one Return (strongest) body (rows 0..281): `hardwareOam[row] = build(sprite state of
 * row - 1)`. Move objects: the attacker (vertical dip y2 programs, the idle rest replaced), the target (monbg: absent from state
 * 5 to 276, back at its art attr minus the idle rest), up to two basic hit splats (affine 372 for anim 2, identity for anim 0),
 * up to two blended trace clones of the attacker; vertical-dip / simple-palette-blend helpers are invisible slot holders keyed
 * into the carried sort (subpriority attacker - 2; the splats too; the trace clones keep the attacker's).
 */
export function liveReturnHardwareOamRows(input: LiveReturnOamInputs): { oam: string[][]; matrices: (readonly [number, number, number, number])[][] } {
  const branch = input.branch ?? "strongest", program = RETURN_PROGRAMS[branch];
  const lives = returnLives(input.occupiedSlots, input.freeMatrices, branch);
  const { attacker, target } = input;
  const helperAttr: OamAttr = [0x00a0, 0x0130, 0xffff];
  const stale = new Map<number, number>();
  const spritesAt = (state: number): LiveOamSprite[] => {
    const out: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    const y2 = liveReturnAttackerY2(state, branch) - input.attackerIdleY2;
    const attackerAttr: OamAttr = [attacker.attr[0] + y2 & 0xff | attacker.attr[0] & ~0xff, attacker.attr[1], attacker.attr[2]];
    out.push({ ...attacker, attr: attackerAttr, visible: true, oamY: attackerAttr[0] & 0xff });
    const away = state >= RETURN_MONBG_BIRTH + 1 && state < program.clearMonbg;
    const back = state >= program.clearMonbg && program.targetRestZeroed;
    const targetAttr: OamAttr = back
      ? [target.attr[0] & ~0xff | target.attr[0] - input.targetIdle.y2 & 0xff, target.attr[1] & ~0x1ff | target.attr[1] - input.targetIdle.x2 & 0x1ff, target.attr[2]]
      : target.attr;
    out.push({ ...target, attr: targetAttr, visible: !away, oamY: targetAttr[0] & 0xff });
    if (state < 0) return out;
    const helperSubpriority = attacker.subpriority - 2;
    for (const life of lives) {
      if (state < life.first || state > life.last) continue;
      if (life.kind === "dip" || life.kind === "blend") {
        out.push({ slot: life.slot, attr: helperAttr, subpriority: helperSubpriority, visible: false, oamY: 0xa0 });
      } else if (life.kind === "splat") {
        const [, x, y] = program.impacts[life.idx]!;
        const sign = input.attackerSide === "opponent" ? -1 : 1;
        const attr: OamAttr = [0x0100 | 0x0400 | input.impactCenter.y + y - 16 & 0xff,
          0x8000 | life.matrix << 9 | input.impactCenter.x + sign * x - 16 & 0x1ff, input.impactTileBase | 2 << 10 | input.impactPaletteSlot << 12];
        out.push({ slot: life.slot, attr, subpriority: helperSubpriority, visible: true, oamY: attr[0] & 0xff });
      } else {
        const created = attacker.attr[0] + liveReturnAttackerY2(life.first, branch) - input.attackerIdleY2 & 0xff | 0x0400 | attacker.attr[0] & ~0xff;
        const attr: OamAttr = [created, attacker.attr[1], attacker.attr[2] & ~0xc00 | 2 << 10];
        const visible = state > life.first;
        stale.set(life.slot, created & 0xff);
        out.push({ slot: life.slot, attr, subpriority: attacker.subpriority, visible, oamY: created & 0xff });
      }
    }
    return out;
  };
  const matricesAt = (state: number): (readonly [number, number, number, number])[] => {
    const m = Array.from({ length: 32 }, () => IDENTITY as readonly [number, number, number, number]);
    for (const life of lives) {
      if (life.kind === "splat" && program.impacts[life.idx]![3] === 2 && state >= life.first && state <= life.last) m[life.matrix] = [372, 0, 0, 372];
    }
    return m;
  };
  const oam: string[][] = [], matrices: (readonly [number, number, number, number])[][] = [];
  let order: readonly number[] = input.activationOrder;
  let previous = spritesAt(-1);
  for (let row = 0; row < program.rows; row += 1) {
    const m = matricesAt(row - 1);
    oam.push(buildLiveHardwareOam(order, previous, input.scene.healthbox, m));
    matrices.push(m);
    previous = spritesAt(row);
    order = carryLiveSpriteOrder(order, previous, input.sort);
  }
  return { oam, matrices };
}

/** Move_MEGAHORN (prep20 megahorn assembler + prep24): attacker ShakeMon x15 at state 48, slide out 89, slide back 122; horn 94..100. */
const MEGAHORN_HORN_FIRST = 94, MEGAHORN_HORN_LAST = 100;
const MEGAHORN_TARGET_HIDDEN_FIRST = 8, MEGAHORN_TARGET_HIDDEN_LAST = 134;
const MEGAHORN_SHAKE_FIRST = 48, MEGAHORN_SLIDE_OUT_FIRST = 89, MEGAHORN_SLIDE_BACK_FIRST = 122;
/**
 * Sprite lifetimes (states) in script order with their createsprite subpriority offsets from the attacker (Move_MEGAHORN:
 * gSlideMonToOffsetSpriteTemplate 2, horn 3, hit splat 2, slide 2, complex_palette_blend 2, SlideMonToOriginalPos 2 x2).
 * The slide / blend helpers are invisible (gDummyOamData) but hold their lowest-free slots and sort keys.
 */
const MEGAHORN_SPRITES = [["slideA", 89, 95, 2], ["horn", 94, 100, 3], ["splat", 100, 108, 2], ["slideB", 100, 104, 2],
  ["blend", 110, 121, 2], ["backA", 122, 132, 2], ["backB", 127, 133, 2]] as const;
/** Attacker x2: AnimTask_ShakeMon(2, 0, 15, 1), SlideMonToOffset(0, 24, .., 6), SlideMonToOriginalPos (24 << 8) / 11 per step. */
export function liveMegahornAttackerX2(state: number, side: Side): number {
  const sign = side === "player" ? 1 : -1;
  const shake = state - MEGAHORN_SHAKE_FIRST;
  if (shake === 0 || (shake >= 3 && shake <= 28 && ((shake - 3) & 3) < 2)) return 2;
  if (state >= MEGAHORN_SLIDE_OUT_FIRST && state < MEGAHORN_SLIDE_BACK_FIRST) return sign * 4 * Math.min(state - MEGAHORN_SLIDE_OUT_FIRST + 1, 6);
  if (state >= MEGAHORN_SLIDE_BACK_FIRST && state < MEGAHORN_SLIDE_BACK_FIRST + 11) {
    const step = Math.floor((24 << 8) / 11);
    return (sign * ((24 << 8) - (state - MEGAHORN_SLIDE_BACK_FIRST + 1) * step)) >> 8;
  }
  return 0;
}
/** InitAnimLinearTranslation + AnimTranslateLinear: Q8 per-step deltas with a sign flag in the low bit. */
function megahornLinear(dx: number, dy: number, duration: number, n: number) {
  const xd = ((Math.abs(dx) << 8) / duration | 0) & 0xffff & ~1 | (dx < 0 ? 1 : 0), yd = ((Math.abs(dy) << 8) / duration | 0) & 0xffff & ~1 | (dy < 0 ? 1 : 0);
  const X = (n * xd) & 0xffff, Y = (n * yd) & 0xffff;
  return { x2: xd & 1 ? -(X >> 8) : X >> 8, y2: yd & 1 ? -(Y >> 8) : Y >> 8 };
}
/** sAffineAnim_MegahornHorn_0 / _1 (AFFINEANIMCMD_FRAME(0x100, 0x100, rot, 0)): HLE ObjAffineSet at unit scale, signed truncation. */
export function liveMegahornHornMatrix(side: Side): readonly [number, number, number, number] {
  const rotation = side === "player" ? 30 : -99, radians = (rotation & 0xff) * 2 * Math.PI / 256, c = Math.cos(radians), s = Math.sin(radians);
  return [Math.trunc(256 * c), Math.trunc(-256 * s), Math.trunc(256 * s), Math.trunc(256 * c)];
}
export interface LiveMegahornOamInputs {
  readonly attackerSide: Side;
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  /** Target idle rest at activation (SlideMonToOriginalPos / ShakeMonInPlace leave it at 0 after the monbg window). */
  readonly targetIdle: Readonly<{ x2: number; y2: number }>;
  /** BATTLER_COORD_X_2 / Y_PIC_OFFSET of the target (the hit splat and the horn's destination). */
  readonly targetPicCenter: Point;
  readonly scene: LiveOamScene;
  /** Known-entry allocator: ANIM_TAG_HORN_HIT_2 / ANIM_TAG_IMPACT tile bases, palette slots, matrix numbers. */
  readonly hornTileBase: number;
  readonly hornPaletteSlot: number;
  readonly hornMatrixNum: number;
  readonly impactTileBase: number;
  readonly impactPaletteSlot: number;
  readonly impactMatrixNum: number;
  readonly occupiedSlots: readonly number[];
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  readonly rows: number;
}
/** hardwareOam[row] / hardwareMatrices[row] of the Megahorn body over the carried lent order. */
export function liveMegahornHardwareOamRows(input: LiveMegahornOamInputs): { oam: string[][]; matrices: (readonly [number, number, number, number])[][] } {
  const held = new Map<string, number>();
  for (const [name, first] of MEGAHORN_SPRITES) {
    const used = new Set(input.occupiedSlots);
    for (const [other, f, l] of MEGAHORN_SPRITES) if (held.has(other) && f <= first && first <= l) used.add(held.get(other)!);
    let slot = 0; while (used.has(slot)) slot += 1;
    held.set(name, slot);
  }
  const { attacker, target } = input, side = input.attackerSide, flip = side === "opponent" ? -1 : 1, t = input.targetPicCenter;
  const spritesAt = (state: number): LiveOamSprite[] => {
    const out: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    const x2 = state < 0 ? 0 : liveMegahornAttackerX2(state, side);
    const attackerAttr: OamAttr = [attacker.attr[0], attacker.attr[1] & ~0x1ff | attacker.attr[1] + x2 & 0x1ff, attacker.attr[2]];
    out.push({ ...attacker, attr: attackerAttr, visible: true, oamY: attackerAttr[0] & 0xff });
    const back = state > MEGAHORN_TARGET_HIDDEN_LAST, o = input.targetIdle;
    const targetAttr: OamAttr = back
      ? [target.attr[0] & ~0xff | target.attr[0] - o.y2 & 0xff, target.attr[1] & ~0x1ff | target.attr[1] - o.x2 & 0x1ff, target.attr[2]]
      : target.attr;
    out.push({ ...target, attr: targetAttr, visible: state < MEGAHORN_TARGET_HIDDEN_FIRST || back, oamY: targetAttr[0] & 0xff });
    for (const [name, first, last, offset] of MEGAHORN_SPRITES) {
      if (state < first || state > last) continue;
      const slot = held.get(name)!, subpriority = attacker.subpriority - offset;
      if (name === "horn") {
        const sx = t.x - 42 * flip, sy = t.y + 25 * flip, d = megahornLinear(t.x - sx, t.y - sy, 6, Math.min(state - MEGAHORN_HORN_FIRST + 1, 6));
        const attr: OamAttr = [0x4000 | 0x0300 | sy + d.y2 - 16 & 0xff, 0x8000 | input.hornMatrixNum << 9 | sx + d.x2 - 32 & 0x1ff,
          input.hornTileBase | 2 << 10 | input.hornPaletteSlot << 12];
        out.push({ slot, attr, subpriority, visible: true, oamY: attr[0] & 0xff });
      } else if (name === "splat") {
        const attr: OamAttr = [0x0100 | 0x0400 | t.y - 16 & 0xff, 0x8000 | input.impactMatrixNum << 9 | t.x - 16 & 0x1ff,
          input.impactTileBase | 2 << 10 | input.impactPaletteSlot << 12];
        out.push({ slot, attr, subpriority, visible: true, oamY: attr[0] & 0xff });
      } else {
        out.push({ slot, attr: GBA_DUMMY_OAM_ATTR, subpriority, visible: false, oamY: 0xa0 });
      }
    }
    return out;
  };
  const matricesAt = (state: number): (readonly [number, number, number, number])[] => {
    const m = Array.from({ length: 32 }, () => IDENTITY as readonly [number, number, number, number]);
    if (state >= MEGAHORN_HORN_FIRST && state <= MEGAHORN_HORN_LAST) m[input.hornMatrixNum] = liveMegahornHornMatrix(side);
    return m;
  };
  const oam: string[][] = [], matrices: (readonly [number, number, number, number])[][] = [];
  let order: readonly number[] = input.activationOrder;
  let previous = spritesAt(-1);
  for (let row = 0; row < input.rows; row += 1) {
    const m = matricesAt(row - 1);
    oam.push(buildLiveHardwareOam(order, previous, input.scene.healthbox, m));
    matrices.push(m);
    previous = spritesAt(row);
    order = carryLiveSpriteOrder(order, previous, input.sort);
  }
  return { oam, matrices };
}

/**
 * Move_REVENGE (prep26 assembler): gRevengeSmallScratch (attacker - 2; states 7..19, frames at ages 0 / 3 / 7), gHorizontalLunge (invisible,
 * attacker - 2; 76..90; drives the attacker x2: +4 x6, hold 2, -4 x5), gRevengeBigScratch (target - 2; 82..94, frames at 0 / 5), two
 * gPersistHitSplat (target - 3; 99..116 / 109..126, affine anim 1 = matrix 303, lowest free matrix). Target on the monbg from state 5 to 127.
 */
const REVENGE_SPRITES = [["small", 7, 13, 0], ["lunge", 76, 15, 0], ["big", 82, 13, 0], ["splat", 99, 18, 0], ["splat", 109, 18, 1]] as const;
const REVENGE_MONBG_BIRTH = 4, REVENGE_CLEAR_MONBG = 128;
export function liveRevengeAttackerX2(state: number, side: Side): number {
  const k = state - 76, sign = side === "player" ? 1 : -1;
  const v = k >= 0 && k <= 5 ? 4 * (k + 1) : k >= 6 && k <= 7 ? 24 : k >= 8 && k <= 12 ? 24 - 4 * (k - 7) : 0;
  return sign * v;
}
export interface LiveRevengeOamInputs {
  readonly attackerSide: Side;
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  readonly targetIdle: Readonly<{ x2: number; y2: number }>;
  /** sBattlerCoords of the attacker (small scratch) and of the target (big scratch); target Y_PIC_OFFSET point (hit splats). */
  readonly attackerCoord: Point;
  readonly targetCoord: Point;
  readonly targetPic: Point;
  readonly scene: LiveOamScene;
  /** Known-entry allocator: PURPLE_SCRATCH / PURPLE_SWIPE / IMPACT tile bases, their shared palette slot, the free matrices. */
  readonly scratchTileBase: number;
  readonly swipeTileBase: number;
  readonly impactTileBase: number;
  readonly paletteSlot: number;
  readonly freeMatrices: readonly number[];
  readonly occupiedSlots: readonly number[];
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  readonly rows: number;
}
export function liveRevengeHardwareOamRows(input: LiveRevengeOamInputs): { oam: string[][]; matrices: (readonly [number, number, number, number])[][] } {
  type Life = { kind: string; first: number; last: number; slot: number; idx: number; matrix: number };
  const lives: Life[] = [];
  for (const [kind, first, life, idx] of REVENGE_SPRITES) {
    const used = new Set(input.occupiedSlots);
    for (const o of lives) if (o.last >= first) used.add(o.slot);
    let slot = 0; while (used.has(slot)) slot += 1;
    const busy = new Set(lives.filter((o) => o.kind === "splat" && o.last >= first).map((o) => o.matrix));
    lives.push({ kind, first, last: first + life - 1, slot, idx, matrix: kind === "splat" ? input.freeMatrices.find((m) => !busy.has(m))! : -1 });
  }
  const { attacker, target } = input, side = input.attackerSide, xs = side === "player" ? 1 : -1, flip = side === "player" ? 0 : 1;
  const lungeAttr: OamAttr = [0x00a0, 0x0130, 0xffff];
  const spritesAt = (state: number): LiveOamSprite[] => {
    const out: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    const x2 = state < 0 ? 0 : liveRevengeAttackerX2(state, side);
    const attackerAttr: OamAttr = [attacker.attr[0], attacker.attr[1] & ~0x1ff | (attacker.attr[1] & 0x1ff) + x2 & 0x1ff, attacker.attr[2]];
    out.push({ ...attacker, attr: attackerAttr, visible: true, oamY: attackerAttr[0] & 0xff });
    const back = state >= REVENGE_CLEAR_MONBG, o = input.targetIdle;
    const targetAttr: OamAttr = back
      ? [target.attr[0] & ~0xff | target.attr[0] - o.y2 & 0xff, target.attr[1] & ~0x1ff | target.attr[1] - o.x2 & 0x1ff, target.attr[2]]
      : target.attr;
    out.push({ ...target, attr: targetAttr, visible: state < REVENGE_MONBG_BIRTH + 1 || back, oamY: targetAttr[0] & 0xff });
    for (const l of lives) {
      if (state < l.first || state > l.last) continue;
      const age = state - l.first;
      if (l.kind === "small") {
        const x = input.attackerCoord.x + 10 * xs, y = input.attackerCoord.y - 10, f = age < 3 ? 0 : age < 7 ? 1 : 2;
        const attr: OamAttr = [y - 16 & 0xff, 0x8000 | (flip ? 0x2000 : 0) | x - 16 & 0x1ff, input.scratchTileBase + 16 * f | 2 << 10 | input.paletteSlot << 12];
        out.push({ slot: l.slot, attr, subpriority: attacker.subpriority - 2, visible: true, oamY: attr[0] & 0xff });
      } else if (l.kind === "lunge") {
        out.push({ slot: l.slot, attr: lungeAttr, subpriority: attacker.subpriority - 2, visible: false, oamY: 0xa0 });
      } else if (l.kind === "big") {
        const x = input.targetCoord.x + 10 * xs, y = input.targetCoord.y - 10, f = age < 5 ? 0 : 1;
        const attr: OamAttr = [y - 32 & 0xff, 0xc000 | (flip ? 0x3000 : 0) | x - 32 & 0x1ff, input.swipeTileBase + 64 * f | 2 << 10 | input.paletteSlot << 12];
        out.push({ slot: l.slot, attr, subpriority: target.subpriority - 2, visible: true, oamY: attr[0] & 0xff });
      } else {
        const [sx, sy] = l.idx === 0 ? [-10, -8] : [10, 8], cx = input.targetPic.x + xs * sx, cy = input.targetPic.y + sy;
        const attr: OamAttr = [0x0100 | 0x0400 | cy - 16 & 0xff, 0x8000 | l.matrix << 9 | cx - 16 & 0x1ff, input.impactTileBase | 2 << 10 | input.paletteSlot << 12];
        out.push({ slot: l.slot, attr, subpriority: target.subpriority - 3, visible: true, oamY: attr[0] & 0xff });
      }
    }
    return out;
  };
  const matricesAt = (state: number): (readonly [number, number, number, number])[] => {
    const m = Array.from({ length: 32 }, () => IDENTITY as readonly [number, number, number, number]);
    for (const l of lives) if (l.kind === "splat" && state >= l.first && state <= l.last) m[l.matrix] = [303, 0, 0, 303];
    return m;
  };
  const oam: string[][] = [], matrices: (readonly [number, number, number, number])[][] = [];
  let order: readonly number[] = input.activationOrder;
  let previous = spritesAt(-1);
  for (let row = 0; row < input.rows; row += 1) {
    const m = matricesAt(row - 1);
    oam.push(buildLiveHardwareOam(order, previous, input.scene.healthbox, m));
    matrices.push(m);
    previous = spritesAt(row);
    order = carryLiveSpriteOrder(order, previous, input.sort);
  }
  return { oam, matrices };
}

/**
 * Move_PSYWAVE (docs/next-adapters-prep30.md s2; ported from tools/integration/prep30PsywaveModel.ts psywaveRings / ringState /
 * assemblePsywaveHardwareOam): 12 BLUE_RING sprites born on rows 42 + 6k, 29 rows each, slots / matrices lowest-free over the source
 * lifetimes; AnimToTargetInSinWave (InitAnimLinearTranslation 30 steps with u16 accumulators + Sin(data6 >> 8, +-16), data6 += 0xD200 / 30
 * with the > 127 wrap, phase seed gBattleAnimArgs[7] = 3 * (birth - 42)); two callback steps on the birth row; gGrowingRingAffineAnims
 * scale 0x20 + 7 (a + 1), matrix 0x10000 / scale. Ring fields are callback / affine-anim driven: OAM row r = sprite state r - 1.
 * Subpriority = target subpriority - 3 (createsprite ANIM_TARGET, 3).
 */
export const PSYWAVE_RING_BIRTHS: readonly number[] = Object.freeze(Array.from({ length: 12 }, (_, i) => 42 + 6 * i));
const PSYWAVE_RING_LIFE = 29, PSYWAVE_TIMER = 42;
export interface LivePsywaveRingState {
  readonly idx: number; readonly slot: number; readonly matrix: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly data: readonly number[]; readonly scale: number; readonly pa: number;
}
type PsywaveRingLife = { idx: number; birth: number; slot: number; matrix: number };
function psywaveRingLives(occupied: readonly number[], freeMatrices: readonly number[]): PsywaveRingLife[] {
  const out: PsywaveRingLife[] = [];
  for (const [idx, birth] of PSYWAVE_RING_BIRTHS.entries()) {
    const alive = out.filter((o) => o.birth + PSYWAVE_RING_LIFE > birth), used = new Set([...occupied, ...alive.map((o) => o.slot)]);
    const busy = new Set(alive.map((o) => o.matrix));
    let slot = 0; while (used.has(slot)) slot += 1;
    out.push({ idx, birth, slot, matrix: freeMatrices.find((m) => !busy.has(m))! });
  }
  return out;
}
function psywaveRingState(ring: PsywaveRingLife, r: number, origin: Point, dest: Point, sine: readonly number[]): LivePsywaveRingState | null {
  const a = r - ring.birth; if (a < 0 || a >= PSYWAVE_RING_LIFE) return null;
  const { x, y } = origin, dx = dest.x - x, dy = dest.y - y;
  let xd = Math.floor((Math.abs(dx) << 8) / 30) & 0xffff, yd = Math.floor((Math.abs(dy) << 8) / 30) & 0xffff;
  xd = dx < 0 ? xd | 1 : xd & ~1; yd = dy < 0 ? yd | 1 : yd & ~1;
  const args7 = 3 * (ring.birth - PSYWAVE_TIMER) & 0xff;
  let d6 = args7 > 127 ? (args7 - 127) * 256 : args7 * 256, d7 = args7 > 127 ? -16 : 16;
  let xa = 0, ya = 0, x2 = 0, y2 = 0; const steps = a + 2;
  for (let s = 0; s < steps; s += 1) {
    xa = xa + xd & 0xffff; ya = ya + yd & 0xffff; x2 = xd & 1 ? -(xa >> 8) : xa >> 8; y2 = yd & 1 ? -(ya >> 8) : ya >> 8;
    y2 += (sine[(d6 >> 8) & 0xff]! * d7) >> 8;
    if ((d6 + 1792) >> 8 > 127) { d6 = 0; d7 = -d7; } else d6 += 1792;
  }
  const scale = 32 + 7 * (a + 1);
  return { idx: ring.idx, slot: ring.slot, matrix: ring.matrix, x, y, x2, y2,
    data: [30 - steps, xd, yd, xa << 16 >> 16, ya << 16 >> 16, 1792, d6 << 16 >> 16, d7], scale, pa: Math.floor(65536 / scale) };
}
export interface LivePsywaveOamInputs {
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  /** InitSpritePosToAnimAttacker origin (attacker X_2 +-10, Y_PIC_OFFSET + 10) and the target X_2 / Y_PIC_OFFSET destination. */
  readonly origin: Point;
  readonly dest: Point;
  readonly scene: LiveOamScene;
  /** Known-entry allocator: BLUE_RING tile base and palette slot, the free matrices. */
  readonly ringTileBase: number;
  readonly ringPaletteSlot: number;
  readonly freeMatrices: readonly number[];
  readonly occupiedSlots: readonly number[];
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** GBA_SINE_TABLE_256 (battleMenu.ts gSineTable[0..255]). */
  readonly sine: readonly number[];
  readonly rows: number;
}
export const livePsywaveRingAttr = (s: LivePsywaveRingState, tileBase: number, paletteSlot: number): OamAttr =>
  [0x8000 | 0x0300 | (s.y + s.y2 - 32) & 0xff, 0x8000 | s.matrix << 9 | (s.x + s.x2 - 16) & 0x1ff, tileBase | 2 << 10 | paletteSlot << 12];
export function livePsywaveHardwareOamRows(input: LivePsywaveOamInputs): {
  oam: string[][]; matrices: (readonly [number, number, number, number])[][]; orders: number[][]; rings: LivePsywaveRingState[][];
  allocations: readonly Readonly<{ slot: number; matrixNum: number; sourceCreationOrder: number }>[];
} {
  const lives = psywaveRingLives(input.occupiedSlots, input.freeMatrices);
  const ringSub = input.target.subpriority - 3;
  const ringsAt = (state: number): LivePsywaveRingState[] => state < 0 ? []
    : lives.map((l) => psywaveRingState(l, state, input.origin, input.dest, input.sine)).filter((s): s is LivePsywaveRingState => s !== null);
  const spritesAt = (rings: readonly LivePsywaveRingState[]): LiveOamSprite[] => {
    const out: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    for (const b of [input.attacker, input.target]) out.push({ ...b, visible: true, oamY: b.attr[0] & 0xff });
    for (const s of rings) {
      const attr = livePsywaveRingAttr(s, input.ringTileBase, input.ringPaletteSlot);
      out.push({ slot: s.slot, attr, subpriority: ringSub, visible: true, oamY: attr[0] & 0xff });
    }
    return out;
  };
  const matricesOf = (rings: readonly LivePsywaveRingState[]): (readonly [number, number, number, number])[] => {
    const m = Array.from({ length: 32 }, () => IDENTITY as readonly [number, number, number, number]);
    for (const s of rings) m[s.matrix] = [s.pa, 0, 0, s.pa];
    return m;
  };
  const oam: string[][] = [], matrices: (readonly [number, number, number, number])[][] = [], orders: number[][] = [], rings: LivePsywaveRingState[][] = [];
  let order: readonly number[] = input.activationOrder;
  let previousRings: LivePsywaveRingState[] = [], previous = spritesAt(previousRings);
  for (let row = 0; row < input.rows; row += 1) {
    const m = matricesOf(previousRings);
    oam.push(buildLiveHardwareOam(order, previous, input.scene.healthbox, m));
    matrices.push(m);
    previousRings = ringsAt(row);
    rings.push(previousRings);
    previous = spritesAt(previousRings);
    order = carryLiveSpriteOrder(order, previous, input.sort);
    orders.push([...order]);
  }
  return { oam, matrices, orders, rings, allocations: lives.map((l) => ({ slot: l.slot, matrixNum: l.matrix, sourceCreationOrder: l.idx })) };
}

/**
 * Move_EXTRASENSORY (docs/next-adapters-prep30.md s1; ported from tools/integration/prep30ExtrasensoryModel.ts cloneStep /
 * assembleExtrasensoryHardwareOam): the battlers (the target is on the monbg for OAM rows 41..120), the CloneBattlerSpriteWithBlend clone
 * (attacker attrs, double affine, blend, corner -64) on OAM rows 95..119 whose scale / y2 are written by AnimTask_TransparentCloneGrowAndShrink:
 * BuildOamBuffer precedes RunTasks, so OAM row r carries task step r - 2 (row 95: y2 0, identity). Clone subpriority = attacker + 1.
 */
export const EXTRASENSORY_CLONE_FIRST = 94, EXTRASENSORY_MONBG = 39, EXTRASENSORY_CLEAR = 120;
/** AnimTask_TransparentCloneGrowAndShrink_Step task step j (row 94 + j): scale 256 - sin(4j) >> 1; SetBattlerSpriteYOffsetFromOtherYScale y2. */
export function liveExtrasensoryCloneStep(j: number, pictureHeight: number, sine: readonly number[]): { angle: number; state: number; scale: number; y2: number } {
  const angle = j <= 11 ? 4 * (j + 1) : j <= 23 ? 4 * (23 - j) : 0, state = j <= 10 ? 0 : j <= 22 ? 1 : j === 23 ? 2 : 3;
  const scale = 256 - (sine[angle]! >> 1), v = pictureHeight, v2 = Math.min(Math.trunc((v << 8) / scale), 128);
  return { angle, state, scale, y2: Math.trunc((v - v2) / 2) };
}
export interface LiveExtrasensoryOamInputs {
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  /** The attacker's sprite position (gSprites x / y, no idle rest) and picture height 64 - 2 y_offset. */
  readonly attackerPosition: Point;
  readonly attackerPictureHeight: number;
  readonly scene: LiveOamScene;
  /** Lowest free sprite slot / matrix at the known entry. */
  readonly cloneSlot: number;
  readonly cloneMatrix: number;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  readonly sine: readonly number[];
  readonly rows: number;
}
export function liveExtrasensoryHardwareOamRows(input: LiveExtrasensoryOamInputs): {
  oam: string[][]; matrices: (readonly [number, number, number, number])[][]; orders: number[][];
} {
  const { attacker, target } = input, a = attacker.attr;
  const cloneAt = (row: number): { attr: OamAttr; scale: number } | null => {
    if (row < EXTRASENSORY_CLONE_FIRST + 1 || row > EXTRASENSORY_CLONE_FIRST + 25) return null;
    const j = row - 2 - EXTRASENSORY_CLONE_FIRST;
    const st = j < 0 ? { scale: 256, y2: 0 } : liveExtrasensoryCloneStep(j, input.attackerPictureHeight, input.sine);
    return { scale: st.scale, attr: [a[0] & 0xc000 | 0x0700 | (input.attackerPosition.y + st.y2 - 64) & 0xff,
      a[1] & 0xc000 | input.cloneMatrix << 9 | (input.attackerPosition.x - 64) & 0x1ff, a[2]] };
  };
  // Sprite state s is what OAM row s + 1 shows.
  const spritesAt = (state: number): LiveOamSprite[] => {
    const out: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    out.push({ ...attacker, visible: true, oamY: attacker.attr[0] & 0xff });
    const row = state + 1;
    out.push({ ...target, visible: row < EXTRASENSORY_MONBG + 2 || row > EXTRASENSORY_CLEAR, oamY: target.attr[0] & 0xff });
    const clone = cloneAt(row);
    if (clone) out.push({ slot: input.cloneSlot, attr: clone.attr, subpriority: attacker.subpriority + 1, visible: true, oamY: clone.attr[0] & 0xff });
    return out;
  };
  const matricesAt = (row: number): (readonly [number, number, number, number])[] => {
    const m = Array.from({ length: 32 }, () => IDENTITY as readonly [number, number, number, number]);
    const clone = cloneAt(row); if (clone) m[input.cloneMatrix] = [clone.scale, 0, 0, clone.scale];
    return m;
  };
  const oam: string[][] = [], matrices: (readonly [number, number, number, number])[][] = [], orders: number[][] = [];
  let order: readonly number[] = input.activationOrder;
  let previous = spritesAt(-1);
  for (let row = 0; row < input.rows; row += 1) {
    const m = matricesAt(row);
    oam.push(buildLiveHardwareOam(order, previous, input.scene.healthbox, m));
    matrices.push(m);
    previous = spritesAt(row);
    order = carryLiveSpriteOrder(order, previous, input.sort);
    orders.push([...order]);
  }
  return { oam, matrices, orders };
}

/**
 * Move_SKILL_SWAP (docs/next-adapters-prep35.md s1.2; ported 1:1 from tools/integration/prep35SkillSwapModel.ts orbLives35 / orbScale35 /
 * orbMatrix35 / skillSwapDisplayRows35). 24 orbs (12 per leg from rows 42 / 60, one every 7 rows, each alive 16 AnimateSprite calls and
 * destroyed + FreeOamMatrix on the 17th), (slot, matrix) by chronological lowest-free over the known-entry pairs; the affine anim is
 * StartSpriteAffineAnim(sprite, task->data[2] & 3) with data[2] = the leg ordinal before its increment (battle_anim_psychic.c:925-930).
 * Task-created orbs are born after that frame's BuildOamBuffer: build f sees the orbs with spawn < f, hardware row r = build of frame r - 1.
 */
export const SKILL_SWAP_ORB_PAIRS: readonly (readonly [number, number])[] = Object.freeze([[3, 0], [4, 3], [5, 4], [7, 5], [9, 6]] as const);
export const SKILL_SWAP_ORB = Object.freeze({ legStart: { target: 42, attacker: 60 } as const, cadence: 7, life: 16, attr2: 31025, subpriority: 0 });
export interface LiveSkillSwapOrbLife { readonly leg: "target" | "attacker"; readonly ordinal: number; readonly order: number; readonly spawn: number;
  readonly slot: number; readonly matrixNum: number; readonly anim: number }
export function liveSkillSwapOrbLives(): LiveSkillSwapOrbLife[] {
  const all: { leg: "target" | "attacker"; ordinal: number; order: number; spawn: number; slot: number; matrixNum: number; anim: number }[] = [];
  for (const leg of ["target", "attacker"] as const) for (let o = 0; o < 12; o += 1)
    all.push({ leg, ordinal: o, order: (leg === "target" ? 0 : 12) + o, spawn: SKILL_SWAP_ORB.legStart[leg] + o * SKILL_SWAP_ORB.cadence, slot: -1, matrixNum: -1, anim: o & 3 });
  const live: { pair: number; end: number }[] = [];
  for (const orb of [...all].sort((l, r) => l.spawn - r.spawn || l.order - r.order)) {
    for (let i = live.length - 1; i >= 0; i -= 1) if (live[i]!.end < orb.spawn) live.splice(i, 1);
    const used = new Set(live.map((l) => l.pair)), pair = SKILL_SWAP_ORB_PAIRS.findIndex((_, i) => !used.has(i));
    live.push({ pair, end: orb.spawn + SKILL_SWAP_ORB.life }); [orb.slot, orb.matrixNum] = SKILL_SWAP_ORB_PAIRS[pair]!;
  }
  return all;
}
/** sAffineAnims_SkillSwapOrb (battle_anim_psychic.c:308-348): [scale delta / absolute, duration] or a jump target. */
const SKILL_SWAP_AFFINE: readonly (readonly (readonly ["frame", number, number] | readonly ["jump", number])[])[] = [
  [["frame", -8, 8], ["frame", 8, 8], ["jump", 0]],
  [["frame", 0xf0, 0], ["frame", -8, 6], ["frame", 8, 8], ["frame", -8, 2], ["jump", 1]],
  [["frame", 0xd0, 0], ["frame", -8, 4], ["frame", 8, 8], ["frame", -8, 4], ["jump", 1]],
  [["frame", 0xb0, 0], ["frame", -8, 2], ["frame", 8, 8], ["frame", -8, 6], ["jump", 1]],
];
/** sprite.c affine engine: the xScale (= yScale) after `steps` AnimateSprite calls (BeginAffineAnim on the first; a duration-0 frame is absolute). */
export function liveSkillSwapOrbScale(anim: number, steps: number): number {
  const cmds = SKILL_SWAP_AFFINE[anim]!; let scale = 0x100, cmd = 0, delay = 0;
  const apply = (c: number) => { const f = cmds[c]! as readonly ["frame", number, number]; if (f[2]) { scale += f[1]; delay = f[2] - 1; } else { scale = f[1]; delay = 0; } };
  for (let n = 1; n <= steps; n += 1) {
    if (n === 1) { cmd = 0; apply(0); continue; }
    if (delay) { scale += (cmds[cmd]! as readonly ["frame", number, number])[1]; delay -= 1; continue; }
    cmd += 1; if (cmds[cmd]![0] === "jump") cmd = (cmds[cmd] as readonly ["jump", number])[1];
    apply(cmd);
  }
  return scale;
}
/** Orb position of one reducer state (skillSwap.ts skillSwapAtAge orbs, passed in by the seam). */
export interface LiveSkillSwapOrbPosition { readonly sourceCreationOrder: number; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number }
export interface LiveSkillSwapOamInputs {
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  readonly scene: LiveOamScene;
  readonly lives: readonly LiveSkillSwapOrbLife[];
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  readonly orbsAt: (state: number) => readonly LiveSkillSwapOrbPosition[];
  readonly rows: number;
}
export function liveSkillSwapHardwareOamRows(input: LiveSkillSwapOamInputs): {
  oam: string[][]; matrices: (readonly [number, number, number, number])[][]; softwareMatrices: (readonly [number, number, number, number])[][]; orders: number[][];
} {
  const atBuild = (f: number): { sprites: LiveOamSprite[]; matrices: (readonly [number, number, number, number])[] } => {
    const sprites: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    for (const b of [input.attacker, input.target]) sprites.push({ ...b, visible: true, oamY: b.attr[0] & 0xff });
    const matrices = Array.from({ length: 32 }, () => IDENTITY as readonly [number, number, number, number]);
    if (f < 0) return { sprites, matrices };
    const orbs = input.orbsAt(f);
    for (const l of input.lives) {
      const n = f - l.spawn; if (n < 1 || n > SKILL_SWAP_ORB.life) continue;
      const o = orbs.find((x) => x.sourceCreationOrder === l.order)!;
      const attr: OamAttr = [0x0100 | (o.y + o.y2 - 8) & 0xff, 0x4000 | l.matrixNum << 9 | (o.x + o.x2 - 8) & 0x1ff, SKILL_SWAP_ORB.attr2];
      sprites.push({ slot: l.slot, attr, subpriority: SKILL_SWAP_ORB.subpriority, visible: true, oamY: attr[0] & 0xff });
      const p = Math.trunc(0x10000 / liveSkillSwapOrbScale(l.anim, n)); // ConvertScaleParam + ObjAffineSet at rotation 0
      matrices[l.matrixNum] = [p, 0, 0, p];
    }
    return { sprites, matrices };
  };
  const oam: string[][] = [], matrices: (readonly [number, number, number, number])[][] = [], softwareMatrices: (readonly [number, number, number, number])[][] = [], orders: number[][] = [];
  let order: readonly number[] = input.activationOrder, previous = atBuild(-1);
  for (let row = 0; row < input.rows; row += 1) {
    oam.push(buildLiveHardwareOam(order, previous.sprites, input.scene.healthbox, previous.matrices));
    matrices.push(previous.matrices);
    previous = atBuild(row);
    softwareMatrices.push(previous.matrices);
    order = carryLiveSpriteOrder(order, previous.sprites, input.sort);
    orders.push([...order]);
  }
  return { oam, matrices, softwareMatrices, orders };
}

/**
 * Move_FLATTER (docs/next-adapters-prep35.md s2.2; ported 1:1 from tools/integration/prep35FlatterModel.ts flatterOamRows35). Per build: the
 * scene occupants, the battlers (target y2 = the reducer's VerticalDip offset), the spotlight (affine double, OBJ window, hidden while
 * `flags & 4`), the two invisible VerticalDip sort keys (priority 3, attacker subpriority - 2, y 160) and the 38 confetti (subpriority 3, the
 * createsprite floor). One carryLiveSpriteOrder pass per executed build. Script-created sprites are in the build of their creation frame;
 * hardware row r = build of state r - 1, except the confetti burst: one main-loop iteration spans the VBlanks of rows 65..67 with no
 * BuildOamBuffer, so rows 66..68 repeat row 65's latch (build of state 64) and row 69 is the build of state 68 (measured, 4 of 4 windows).
 */
export const FLATTER_ROWS = 219;
export const liveFlatterBuildState = (row: number): number => (row >= 66 && row <= 68 ? 64 : row - 1);
/** The reducer state a build reads (flatter.ts flatterAtAge, passed in by the seam). */
export interface LiveFlatterBuildSprites {
  readonly spotlight: Readonly<{ slot: number; x: number; y: number; matrixNum: number; matrix: readonly [number, number, number, number]; flags: number }> | null;
  readonly verticalDipSlots: readonly number[];
  readonly confetti: readonly Readonly<{ slot: number; x: number; y: number; x2: number; y2: number }>[];
  /** Target dip offset relative to its idle rest (the reducer's target offset y2 - the initial y2). */
  readonly targetDipY2: number;
}
export interface LiveFlatterOamInputs {
  readonly attacker: LiveOamBattler;
  readonly target: LiveOamBattler;
  readonly scene: LiveOamScene;
  readonly spotlightAttr2: number;
  readonly spotlightSubpriority: number;
  /** Confetti tile base (ANIM_TAG_CONFETTI tile range) and palette slot; the per-confetti tile offsets by slot. */
  readonly confettiTileBase: number;
  readonly confettiPaletteSlot: number;
  readonly confettiTileOffsets: ReadonlyMap<number, number>;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  readonly stateAt: (state: number) => LiveFlatterBuildSprites;
}
export function liveFlatterHardwareOamRows(input: LiveFlatterOamInputs): {
  oam: string[][]; matrices: (readonly [number, number, number, number])[][]; orders: number[][];
} {
  type Mat = readonly [number, number, number, number];
  const build = (f: number): { sprites: LiveOamSprite[]; matrices: Mat[] } => {
    const matrices = Array.from({ length: 32 }, () => IDENTITY as Mat);
    const sprites: LiveOamSprite[] = input.scene.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
    const st = f >= 0 ? input.stateAt(f) : null;
    for (const [b, y2] of [[input.attacker, 0], [input.target, st?.targetDipY2 ?? 0]] as const) {
      const attr: OamAttr = [b.attr[0] & 0xff00 | (b.attr[0] + y2) & 0xff, b.attr[1], b.attr[2]];
      sprites.push({ slot: b.slot, attr, subpriority: b.subpriority, visible: true, oamY: attr[0] & 0xff });
    }
    if (!st) return { sprites, matrices };
    if (st.spotlight) {
      const s = st.spotlight, attr: OamAttr = [0x0b00 | (s.y - 64) & 0xff, 0xc000 | s.matrixNum << 9 | (s.x - 64) & 0x1ff, input.spotlightAttr2];
      sprites.push({ slot: s.slot, attr, subpriority: input.spotlightSubpriority, visible: (s.flags & 4) === 0, oamY: attr[0] & 0xff });
      matrices[s.matrixNum] = s.matrix;
    }
    for (const slot of st.verticalDipSlots) sprites.push({ slot, attr: [160, 304, 0xffff], subpriority: input.attacker.subpriority - 2, visible: false, oamY: 160 });
    for (const c of st.confetti) {
      const attr: OamAttr = [(c.y + c.y2 - 4) & 0xff, (c.x + c.x2 - 4) & 0x1ff,
        (input.confettiTileBase + input.confettiTileOffsets.get(c.slot)!) | 2 << 10 | input.confettiPaletteSlot << 12];
      sprites.push({ slot: c.slot, attr, subpriority: 3, visible: true, oamY: attr[0] & 0xff });
    }
    return { sprites, matrices };
  };
  // order after build f; one pass per executed build (no build inside the burst)
  const orderAfter = new Map<number, number[]>(); let order: readonly number[] = input.activationOrder;
  orderAfter.set(-1, [...order]);
  const builds = new Map<number, ReturnType<typeof build>>();
  for (const f of [...new Set(Array.from({ length: FLATTER_ROWS }, (_, r) => liveFlatterBuildState(r)))].filter((f) => f >= 0).sort((x, y) => x - y)) {
    const b = build(f); builds.set(f, b);
    order = carryLiveSpriteOrder(order, b.sprites, input.sort); orderAfter.set(f, [...order]);
  }
  const oam: string[][] = [], matrices: Mat[][] = [], orders: number[][] = [];
  for (let r = 0; r < FLATTER_ROWS; r += 1) {
    const f = liveFlatterBuildState(r), b = builds.get(f) ?? build(f);
    oam.push(buildLiveHardwareOam(orderAfter.get(f)!, b.sprites, input.scene.healthbox, b.matrices));
    matrices.push(b.matrices); orders.push(orderAfter.get(f)!);
  }
  return { oam, matrices, orders };
}
