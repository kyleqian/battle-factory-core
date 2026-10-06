/**
 * prep20: pure source-derived hardware-OAM assembler prototype for MOVE_WILL_O_WISP.
 *
 * Replaces the corpus-fed `state.buffers.hardwareOam` of `willOWispDisplayPlan`.
 * Inputs: battler anchors (attacker/target animation centres), the known-entry
 * allocator constants (slots / tile bases / palette banks / subpriorities), battler
 * anchors + art words, the lent sprite order, and a BG-priority schedule. NOTHING is read
 * from a retained corpus row except where `WispKnownEntry` documents a measured constant.
 *
 * Row semantics (measured, all 4 corpora): hardwareOam[age] == the software OAM built from
 * the sprite state of age-1 (VBlank copy lag), i.e. buffer(age) = build(programs(age-1)).
 */
import { GBA_SINE_TABLE_256 as sinTable } from "../../src/engine/battleMenu.ts";

export type WispSide = "player" | "opponent";
export interface WispKnownEntry {
  /** 8-byte entries of the healthbox/healthbar sprites that precede every move sprite (measured constant, rows >= 1). */
  readonly healthboxChunk: readonly string[];
  /** Slots of the non-move OAM contributors in the lent order that emit entries (battlers); healthbox slots emit `healthboxChunk` once in total. */
  readonly healthboxSlots: readonly number[];
  readonly occupiedSlots: readonly number[];
  readonly attackerSlot: number; readonly targetSlot: number;
  readonly attackerSubpriority: number; readonly targetSubpriority: number;
  readonly orbTileBase: number; readonly fireTileBase: number;
  readonly orbPaletteBank: number; readonly firePaletteBank: number;
  /** attr0..2 of the attacker/target battler objects at activation (battler art). */
  readonly attackerAttr: readonly [number, number, number]; readonly targetAttr: readonly [number, number, number];
  /** The 8-byte dummy entry (attr0..2) written to the unused OAM tail; identity-matrix pad words are interleaved. */
  readonly dummyAttr: readonly [number, number, number];
}
export interface WispAssemblerInputs {
  readonly geometry: WispGeometry;
  readonly known: WispKnownEntry;
  /** lent per-row sprite order (sprite order provider); row `age` order = order after sorting at state age-1 */
  readonly spriteOrderAt: (programAge: number) => readonly number[];
}
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
const IDENT = [256, 0, 0, 256];
const entry = (a: readonly [number, number, number], pad: number) => hex4(a[0]) + hex4(a[1]) + hex4(a[2]) + hex4(pad);

/** Template facts from battle_anim_fire.c (source constants). */
const ORB = { size: 16, attr0Shape: 0x0000, attr1Size: 0x4000 } as const;     // gOamData_AffineOff_ObjNormal_16x16
const FIRE = { size: 32, attr0Shape: 0x0000, attr1Size: 0x8000 } as const;    // gOamData_AffineOff_ObjNormal_32x32

function animFrame(local: number): number { return Math.floor((local + 1) / 5); }
/** orb tile offset: anim 0 cycles 0/4/8/12 every 5 ticks (first frame 4 rows), anim 1 = 16, anim 2/3 = 20. */
export function orbTileOffset(animation: number, local: number): number {
  return animation === 0 ? (animFrame(local) % 4) * 4 : animation === 1 ? 16 : 20;
}
export function fireTileOffset(local: number): number { return (animFrame(local) % 4) * 16; }

export interface WispGeometry {
  readonly side: WispSide;                                   // attacker side
  readonly attackerCenter: Readonly<{ x: number; y: number }>;  // InitSpritePosToAnimAttacker origin (attacker X_2 / Y_PIC_OFFSET)
  readonly targetCenter: Readonly<{ x: number; y: number }>;    // createsprite default origin == target X_2 / Y_PIC_OFFSET
}
const SINE = (angle: number, amplitude: number): number => sinTable[angle & 255]! * amplitude >> 8;
const COS = (angle: number, amplitude: number): number => SINE(angle + 64, amplitude);

/** Source lifetimes derived from geometry: AnimWillOWispOrb case 2 (31 ticks) then AnimTranslateLinear for |dx| steps. */
export function wispTimeline(g: WispGeometry) {
  const dir = g.side === "player" ? -1 : 1;
  const x = g.attackerCenter.x + SINE(124, dir * 4), y = g.attackerCenter.y;   // sprite->x += x2 at tick 31
  const dx = g.targetCenter.x - x, dy = g.targetCenter.y - y;
  if (dx === 0) throw new Error("Will-O-Wisp orb division by zero (dx == 0)");
  const duration = Math.abs(dx);
  const xDelta = ((Math.abs(dx) << 8) / duration & 0xffff) & ~1 | (dx < 0 ? 1 : 0);
  const yDelta = (((Math.abs(dy) << 8) / duration | 0) & 0xffff & ~1) | (dy < 0 ? 1 : 0);
  const orbEnd = (ordinal: number) => 10 + ordinal * 5 + 31 + duration;
  const fireStart = orbEnd(3) + 2;                                               // waitforvisualfinish + splitbgprio_all
  return { dir, x, y, duration, xDelta, yDelta, orbEnd, fireStart, fireEnd: fireStart + 27 };
}
/** Target BG priority (GetBattlerSpriteBGPriority). Opponent-side target (BG1): foes 2 -> all 1 at fire start; player-side target (BG2): 2 throughout. */
export function wispTargetBgPriority(age: number, g: WispGeometry, fireStart: number): number {
  return g.side === "player" ? (age < fireStart ? 2 : 1) : 2;
}

export interface AssembledObject { readonly slot: number; readonly kind: "battler" | "orb" | "fire"; readonly attr: readonly [number, number, number]; }

interface Prog { readonly kind: "orb" | "fire"; readonly ordinal: number; readonly start: number; readonly end: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly invisible: boolean; readonly animation: number; }
/** Pure source programs (no reducer, no corpus) at sprite-state age `age`. */
export function wispPrograms(age: number, g: WispGeometry): Prog[] {
  const t = wispTimeline(g), out: Prog[] = [];
  for (let o = 0; o < 4; o += 1) {
    const start = 10 + o * 5, end = t.orbEnd(o);
    if (age < start || age > end) continue;
    const L = age - start;
    let x = g.attackerCenter.x, y = g.attackerCenter.y, x2 = SINE(L * 4, t.dir * 4), y2 = 0;
    if (L >= 31) {
      x = t.x; y = t.y; const n = L - 31;
      const v1 = t.xDelta, v2 = t.yDelta, X = (n * v1) & 0xffff, Y = (n * v2) & 0xffff;
      x2 = (v1 & 1 ? -(X >> 8) : X >> 8) + SINE(Math.max(0, n - 1) * 4, 16);
      y2 = v2 & 1 ? -(Y >> 8) : Y >> 8;
    }
    out.push({ kind: "orb", ordinal: o, start, end, x, y, x2, y2, invisible: false, animation: o });
  }
  for (let o = 0; o < 6; o += 1) {
    const start = t.fireStart, end = t.fireEnd;
    if (age < start || age > end) continue;
    const L = age - start, phase = (o * 42 + (L + 1) * 7) & 255;
    out.push({ kind: "fire", ordinal: o, start, end, x: g.targetCenter.x, y: g.targetCenter.y,
      x2: SINE(phase, ((L + 2) * 0x180) >> 8), y2: COS(phase, ((L + 2) * 0xa0) >> 8),
      invisible: L >= 19 && (L & 1) === 1, animation: 0 });
  }
  return out;
}

/** Software-OAM objects (move + battler sprites) built from the program state of `age`. */
export function wispObjectsAtAge(age: number, input: WispAssemblerInputs): Map<number, AssembledObject> {
  const { geometry: g, known: k } = input;
  const out = new Map<number, AssembledObject>();
  const t = wispTimeline(g);
  out.set(k.attackerSlot, { slot: k.attackerSlot, kind: "battler", attr: k.attackerAttr });
  // monbg hides the target battler from the OAM build of state 8 through fireEnd+1 (measured; the sprite flag itself flips at 7 / fireEnd+1)
  if (!(age >= 8 && age <= t.fireEnd + 1)) out.set(k.targetSlot, { slot: k.targetSlot, kind: "battler", attr: k.targetAttr });
  // lowest-free slot allocation over source lifetimes: creation order = (start, orbs before fires, ordinal)
  const all: { kind: "orb" | "fire"; ordinal: number; start: number; end: number }[] = [];
  for (let o = 0; o < 4; o += 1) all.push({ kind: "orb", ordinal: o, start: 10 + o * 5, end: t.orbEnd(o) });
  for (let o = 0; o < 6; o += 1) all.push({ kind: "fire", ordinal: o, start: t.fireStart, end: t.fireEnd });
  const slots = new Map<string, number>();
  for (const s of all) {
    const used = new Set(k.occupiedSlots);
    for (const q of all) if (slots.has(`${q.kind}${q.ordinal}`) && q.start <= s.start && s.start <= q.end) used.add(slots.get(`${q.kind}${q.ordinal}`)!);
    let slot = 0; while (used.has(slot)) slot += 1;
    slots.set(`${s.kind}${s.ordinal}`, slot);
  }
  for (const sprite of wispPrograms(age, g)) {
    if (sprite.invisible) continue;
    const slot = slots.get(`${sprite.kind}${sprite.ordinal}`)!, local = age - sprite.start;
    if (sprite.kind === "orb") {
      const y = (sprite.y + sprite.y2 - ORB.size / 2) & 0xff, x = (sprite.x + sprite.x2 - ORB.size / 2) & 0x1ff;
      const priority = wispTargetBgPriority(sprite.start, g, t.fireStart);
      out.set(slot, { slot, kind: "orb", attr: [ORB.attr0Shape | y, ORB.attr1Size | x,
        k.orbTileBase + orbTileOffset(sprite.animation, local) | priority << 10 | k.orbPaletteBank << 12] });
    } else {
      const y = (sprite.y + sprite.y2 - FIRE.size / 2) & 0xff, x = (sprite.x + sprite.x2 - FIRE.size / 2) & 0x1ff;
      const data1 = (sprite.ordinal * 42 + (local + 2) * 7) & 255;
      const priority = wispTargetBgPriority(age, g, t.fireStart) + (data1 < 64 || data1 > 195 ? 0 : 1);
      out.set(slot, { slot, kind: "fire", attr: [FIRE.attr0Shape | y, FIRE.attr1Size | x,
        k.fireTileBase + fireTileOffset(local) | priority << 10 | k.firePaletteBank << 12] });
    }
  }
  return out;
}

/** The 128-entry hardware OAM string buffer for `row` (= build(row-1)). */
export function assembleWispHardwareOam(row: number, input: WispAssemblerInputs): string[] {
  const { known: k } = input;
  const objects = wispObjectsAtAge(row - 1, input);
  const order = input.spriteOrderAt(row - 1);
  const entries: string[] = [];
  let healthEmitted = false;
  for (const slot of order) {
    if (k.healthboxSlots.includes(slot)) {
      if (!healthEmitted) { entries.push(...k.healthboxChunk); healthEmitted = true; }  // 6 healthbox slots lead the order in every row
      continue;
    }
    const object = objects.get(slot);
    if (object) entries.push(entry(object.attr, 0));
  }
  while (entries.length < 128) entries.push(entry(k.dummyAttr, 0));
  // interleave identity-matrix params into every 4th-halfword pad (OAM entry i carries param i % 4 of matrix floor(i/4))
  return entries.map((e, i) => e.slice(0, 12) + hex4(IDENT[i % 4]!));
}
