/**
 * MOVE_SPIT_UP (255) live inputs, all three Stockpile-counter branches (docs/next-adapters-prep31.md s2 / s3; the prototype is
 * tools/integration/prep31SpitUpModel.ts, ported 1:1). Every per-row input of the evidence-replayer reducer (spitUp.ts, unchanged) comes
 * from production values: the counter (request.turn = gBattleScripting.animTurn - 1 at activation, gameplay-owned, read only), battler
 * anchors (liveBattlerAnchors), the attacker pic y_offset (GetBattlerYDeltaFromSpriteId), the known-entry allocator (RED_ORB_2 tile 305 /
 * OBJ bank 7, IMPACT tile 308 / bank 8, battler matrices 1 / 2), the asset palettes and the host's lent 64-slot activation order (the L input,
 * carried by SortSprites passes). Script (Move_SPIT_UP; `delay N` puts the next command N + 2 rows later): loadspritegfx rows 1 / 4;
 * AnimTask_SpitUpDeformMon + AnimTask_ShakeMon2(ATTACKER, 1, 0, 8, 2) row 7; wave 1 (8 x AnimSpitUpOrb, angles 0..224 step 32) row 59;
 * jumpifmoveturn: counter 2 adds 4 orbs, counter 3 adds 8 (nominal row 66); AnimTask_ShakeTargetBasedOnMovePowerOrDmg + flashing hit splat
 * (nominal 73); hit splat 2 (nominal 80). M (measured constant, prep29 / prep31: identical in all 12 windows): an 8-orb createsprite burst
 * overruns its frame: the tasks hold on the burst row, the sprite step of that frame completes on the next row, whose hardware OAM repeats the
 * previous row (missed transfer); later script rows shift by one per earlier burst. Never a capture row.
 */
import paletteData from "../data/gen/live-animation-palette-resources.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";
import { KNOWN_ENTRY_HEALTHBOX_OAM, KNOWN_ENTRY_HEALTHBOX_SLOTS, buildLiveHardwareOam, carryLiveSpriteOrder,
  type LiveOamSprite, type LiveSpriteOrderSort, type OamAttr } from "./liveMoveOamAssembler.ts";

type Side = "player" | "opponent";
type Point = Readonly<{ x: number; y: number }>;
type Matrix = readonly [number, number, number, number];
export type SpitUpCounter = 1 | 2 | 3;

const sin = (a: number, amp: number) => (GBA_SINE_TABLE_256[a & 0xff]! * amp) >> 8;
const cos = (a: number, amp: number) => (GBA_SINE_TABLE_256[((a & 0xff) + 64) & 0xff]! * amp) >> 8;
const WAVE1 = [0, 32, 64, 96, 128, 160, 192, 224] as const;
const WAVE2: Readonly<Record<SpitUpCounter, readonly number[]>> = { 1: [], 2: [16, 80, 144, 208], 3: [16, 48, 80, 112, 144, 176, 208, 240] };
/** gSpitUpDeformMonAffineAnimCmds: [dx, dy, frames]. */
const DEFORM = [[0, 6, 20], [0, 0, 20], [0, -18, 6], [-18, -18, 3], [0, 0, 15], [4, 4, 13]] as const;
/** Battler OBJ attr2 (tile | priority 2 | palette bank << 12) and the battlers' own affine matrices (known entry). */
const BATTLER_ATTR2: Readonly<Record<Side, number>> = { player: 2417, opponent: 6617 };
const BATTLER_MATRIX: Readonly<Record<Side, number>> = { player: 1, opponent: 2 };
const OCCUPIED_SLOTS: readonly number[] = [0, 1, 2, 6, 8, 60, 61, 62, 63];
const MATRIX_BITMAP = 0b110;
const ORB = { tile: 305, bank: 7, prio: 2 } as const, IMPACT = { tile: 308, bank: 8, prio: 2 } as const;
const HEALTHBOX = { slots: KNOWN_ENTRY_HEALTHBOX_SLOTS, entries: KNOWN_ENTRY_HEALTHBOX_OAM };

export function liveSpitUpRows(counter: SpitUpCounter) {
  const bursts = [59, ...(WAVE2[counter].length === 8 ? [67] : [])];
  const script = (nominal: number) => nominal + bursts.filter((b) => b < nominal).length;
  return { bursts, spriteLag: bursts.map((b) => b + 1), wave1: 59, wave2: script(66), shakeTarget: script(73), splat2: script(80),
    rows: counter === 3 ? 109 : 108 };
}
/** liveMoveAnimationDuration: 108 rows (counters 1, 2), 109 (counter 3: the second burst row). */
export const liveSpitUpDuration = (counter: number): number | null => counter === 3 ? 109 : counter === 1 || counter === 2 ? 108 : null;

type Rows = ReturnType<typeof liveSpitUpRows>;
const stepsSince = (birth: number, r: number, holds: readonly number[]) =>
  r < birth ? 0 : r - birth + 1 - holds.filter((h) => h >= birth && h <= r).length;
/** RunAffineAnimFromTaskData over gSpitUpDeformMonAffineAnimCmds (tasks hold on the burst rows) + SetBattlerSpriteYOffsetFromYScale. */
function deformState(r: number, T: Rows, yDelta: number) {
  const n = stepsSince(7, r, T.bursts);
  let x = 256, y = 256, left = n;
  for (const [dx, dy, dur] of DEFORM) { if (left <= 0) break; const s = Math.min(left, dur); x += dx * s; y += dy * s; left -= s; }
  const ended = n > 77, varH = 64 - 2 * yDelta, v2 = Math.min(Math.trunc((varH << 8) / y), 128);
  return { active: n >= 1 && !ended, ended, xScale: x, yScale: y, y2: n >= 1 && !ended ? Math.trunc((varH - v2) / 2) : 0 };
}
/** AnimTask_ShakeMon2(ATTACKER, 1, 0, 8, 2): x2 = 1 on row 7, toggled every 3rd row from row 8, 0 after 8 counts. */
function attackerX2(r: number): number {
  if (r < 7) return 0; const t = r - 8; if (t < 0) return 1;
  const toggles = Math.floor(t / 3) + 1; return toggles >= 8 ? 0 : toggles % 2 === 1 ? -1 : 1;
}
/** AnimTask_ShakeTargetBasedOnMovePowerOrDmg(FALSE, 1, 8, 1, 0) at power 100: +4 / -4 every 2nd row from birth + 1. */
function targetX2(r: number, birth: number): number {
  const t = r - birth; if (t < 1) return 0;
  const toggles = Math.floor((t - 1) / 2) + 1; return toggles >= 8 ? 0 : toggles % 2 === 1 ? 4 : -4;
}
interface SpitUpSprite { kind: "orb" | "splat"; slot: number; matrixNum: number; x: number; y: number; x2: number; y2: number; invisible: boolean; scale: number }
interface Geometry { readonly side: Side; readonly T: Rows; readonly counter: SpitUpCounter; readonly attackerAnchor: Point; readonly targetAnchor: Point }
/** AnimSpitUpOrb (x2 += Sin(a, 10), y2 += Cos(a, 7), destroyed on the 13th step) and AnimFlashingHitSplat; lowest-free slots / matrices. */
function spitUpSprites(r: number, g: Geometry): SpitUpSprite[] {
  const { T } = g, xs = g.side === "player" ? 1 : -1;
  const births: { kind: "orb" | "splat"; birth: number; angle: number; idx: number; last: number; partial: boolean }[] = [];
  const orbLife = (birth: number, burst: boolean) => {
    for (let r2 = birth; r2 < 400; r2 += 1) {
      const s = burst ? r2 - birth + 1 - T.spriteLag.filter((h) => h >= birth && h <= r2).length : r2 - birth + 1;
      if (s >= 13) return r2 - 1;
    }
    return 400;
  };
  WAVE1.forEach((a, i) => births.push({ kind: "orb", birth: T.wave1, angle: a, idx: i, last: orbLife(T.wave1, true), partial: true }));
  const w2 = WAVE2[g.counter], burst2 = w2.length === 8;
  w2.forEach((a, i) => births.push({ kind: "orb", birth: T.wave2, angle: a, idx: i, last: orbLife(T.wave2, burst2), partial: burst2 }));
  births.push({ kind: "splat", birth: T.shakeTarget, angle: 0, idx: 0, last: T.shakeTarget + 12, partial: false },
    { kind: "splat", birth: T.splat2, angle: 0, idx: 1, last: T.splat2 + 12, partial: false });
  const placed: { slot: number; matrix: number; last: number }[] = [], out: SpitUpSprite[] = [];
  for (const b of births) {
    const used = new Set(OCCUPIED_SLOTS), mused = new Set<number>();
    for (const p of placed) if (p.last >= b.birth) { used.add(p.slot); mused.add(p.matrix); }
    let s = 0; while (used.has(s)) s += 1;
    let m = 0; while ((MATRIX_BITMAP >> m & 1) || mused.has(m)) m += 1;
    placed.push({ slot: s, matrix: m, last: b.last });
    if (r < b.birth || r > b.last) continue;
    if (b.kind === "orb") {
      let steps: number;
      if (!b.partial) steps = r - b.birth + 1;
      else if (r === b.birth) steps = b.idx < 4 ? 1 : 0;   // M: the burst row's partial snapshot (state only: that OAM row is never transferred)
      else steps = r - b.birth + 1 - T.spriteLag.filter((h) => h >= b.birth && h <= r).length;
      out.push({ kind: "orb", slot: s, matrixNum: m, x: g.attackerAnchor.x, y: g.attackerAnchor.y, x2: steps * sin(b.angle, 10), y2: steps * cos(b.angle, 7),
        invisible: false, scale: 0x80 + 8 * steps });
    } else {
      const n = r - b.birth + 1, [ox, oy] = b.idx === 0 ? [-12, 10] : [12, -10];
      out.push({ kind: "splat", slot: s, matrixNum: m, x: g.targetAnchor.x + xs * ox, y: g.targetAnchor.y + oy, x2: 0, y2: 0, invisible: n % 2 === 1, scale: 0xd8 });
    }
  }
  return out.sort((p, q) => p.slot - q.slot);
}

export interface LiveSpitUpArgs {
  readonly counter: SpitUpCounter;
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: Readonly<{ spriteCenter: Point; picOffsetPoint: Point; frontIdleRest: Readonly<{ x2: number; y2: number }> }>;
  readonly target: Readonly<{ spriteCenter: Point; picOffsetPoint: Point; frontIdleRest: Readonly<{ x2: number; y2: number }> }>;
  /** GetBattlerYDeltaFromSpriteId: the attacker's pic coords y_offset (back table for the player, front for the opponent). */
  readonly attackerYDelta: number;
  readonly palettes: LivePaletteComposite;
  /** Seam-provided (liveMoveAnimation.ts): spit-up-red-orb.json RED_ORB_2 palette (BGR555 words). */
  readonly redOrbPalette: readonly number[];
  /** The host's lent full 64-slot order at activation (the L input). */
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
}
const IMPACT_PALETTE = (paletteData.resources as Record<string, { colors: readonly number[] }>).ANIM_TAG_IMPACT!.colors;
const cache = new Map<string, { oam: string[][]; matrices: Matrix[][] }>();

/**
 * Spit Up live inputs. Null for a non-zero idle rest on either battler (the ShakeMon2 / ShakeTarget x2 programs are proven from a zero rest
 * only) or a counter outside 1..3.
 */
export function liveSpitUpInputs(args: LiveSpitUpArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } | null {
  const { counter, attackerSide, attacker, target } = args;
  if (counter !== 1 && counter !== 2 && counter !== 3) return null;
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0 || target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const T = liveSpitUpRows(counter);
  const g: Geometry = { side: attackerSide, T, counter, attackerAnchor: attacker.picOffsetPoint, targetAnchor: target.picOffsetPoint };
  const battler = (side: Side, center: Point) => ({ slot: side === "player" ? 6 : 8, subpriority: side === "player" ? 30 : 40,
    attr: [(center.y - 32) & 0xff, 0xc000 | (center.x - 32) & 0x1ff, BATTLER_ATTR2[side]] as OamAttr });
  const A = battler(attackerSide, attacker.spriteCenter), Tg = battler(targetSide, target.spriteCenter);
  const attackerMatrix = BATTLER_MATRIX[attackerSide];
  // createsprite subpriority offsets: gSpitUpOrbSpriteTemplate ANIM_ATTACKER 2, gFlashingHitSplatSpriteTemplate ANIM_TARGET 3.
  const orbSub = A.subpriority - 2, splatSub = Tg.subpriority - 3;
  const key = JSON.stringify([counter, attackerSide, attacker.spriteCenter, attacker.picOffsetPoint, target.spriteCenter, target.picOffsetPoint, args.attackerYDelta, args.activationOrder]);
  let built = cache.get(key);
  if (!built) {
    /** SortSprites keys of state row s (the sprites' own y after that row's step; the attacker's double-size affine y while deformed). */
    const keysAt = (s: number): LiveOamSprite[] => {
      const d = deformState(s, T, args.attackerYDelta);
      const ay = d.active ? (attacker.spriteCenter.y + d.y2 - 64) & 0xff : d.ended ? (attacker.spriteCenter.y - 32) & 0xff : A.attr[0] & 0xff;
      const out: LiveOamSprite[] = [
        { slot: A.slot, attr: A.attr, subpriority: A.subpriority, visible: true, oamY: ay },
        { slot: Tg.slot, attr: Tg.attr, subpriority: Tg.subpriority, visible: true, oamY: Tg.attr[0] & 0xff },
        ...HEALTHBOX.slots.map((slot) => ({ slot, attr: [0, 0, 0] as OamAttr, subpriority: 0, visible: true, oamY: 0 })),
      ];
      for (const sp of spitUpSprites(s, g)) out.push(sp.kind === "orb"
        ? { slot: sp.slot, attr: [0, 0, ORB.prio << 10] as OamAttr, subpriority: orbSub, visible: true, oamY: (sp.y + sp.y2 - 8) & 0xff }
        : { slot: sp.slot, attr: [0, 0, IMPACT.prio << 10] as OamAttr, subpriority: splatSub, visible: true, oamY: (sp.y - 16) & 0xff });
      return out;
    };
    /** hardwareOam[row] = build(sprite state of row - 1); task-written fields (deform matrix / y2, shake x2) as of the previous task run. */
    const objectsAt = (state: number): { sprites: LiveOamSprite[]; matrices: Matrix[] } => {
      const matrices: [number, number, number, number][] = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
      const sprites: LiveOamSprite[] = [];
      const push = (slot: number, attr: OamAttr) => sprites.push({ slot, attr, subpriority: 0, visible: true, oamY: attr[0] & 0xff });
      const dPrev = deformState(state - 1, T, args.attackerYDelta);
      const ax = attacker.spriteCenter.x + (state === 7 ? 1 : attackerX2(state - 1)), ay = attacker.spriteCenter.y;
      if (state < 7) push(A.slot, A.attr);
      else if (!dPrev.ended) {
        matrices[attackerMatrix] = [dPrev.xScale, 0, 0, dPrev.yScale];
        push(A.slot, [0x0300 | (ay + dPrev.y2 - 64) & 0xff, 0xc000 | attackerMatrix << 9 | (ax - 64) & 0x1ff, A.attr[2]]);
      } else push(A.slot, [0x0100 | (ay - 32) & 0xff, 0xc000 | attackerMatrix << 9 | (ax - 32) & 0x1ff, A.attr[2]]);
      const tx = target.spriteCenter.x + (state === T.shakeTarget ? 0 : targetX2(state - 1, T.shakeTarget));
      push(Tg.slot, [Tg.attr[0], Tg.attr[1] & ~0x1ff | (tx - 32) & 0x1ff, Tg.attr[2]]);
      for (const s of spitUpSprites(state, g)) {
        if (s.kind === "orb") {
          const m = Math.trunc(0x10000 / s.scale); matrices[s.matrixNum] = [m, 0, 0, m];
          push(s.slot, [0x0300 | (s.y + s.y2 - 8) & 0xff, s.matrixNum << 9 | (s.x + s.x2 - 8) & 0x1ff, ORB.tile | ORB.prio << 10 | ORB.bank << 12]);
        } else {
          matrices[s.matrixNum] = [303, 0, 0, 303];
          if (!s.invisible) push(s.slot, [0x0100 | (s.y - 16) & 0xff, 0x8000 | s.matrixNum << 9 | (s.x - 16) & 0x1ff, IMPACT.tile | IMPACT.prio << 10 | IMPACT.bank << 12]);
        }
      }
      return { sprites, matrices };
    };
    const orders: (readonly number[])[] = [];
    let order: readonly number[] = args.activationOrder;
    for (let s = 0; s < T.rows; s += 1) {
      // A burst frame completes (and sorts) on the next row.
      if (!T.bursts.includes(s)) order = carryLiveSpriteOrder(order, keysAt(s), args.sort);
      orders.push(order);
    }
    const oam: string[][] = [], matrices: Matrix[][] = [];
    for (let row = 0; row < T.rows; row += 1) {
      if (row >= 1 && T.spriteLag.includes(row)) { oam.push(oam[row - 1]!); matrices.push(matrices[row - 1]!); continue; }   // M: missed OAM transfer
      const state = row - 1, { sprites, matrices: m } = objectsAt(state);
      oam.push(buildLiveHardwareOam(state < 0 ? args.activationOrder : orders[state]!, sprites, HEALTHBOX, m));
      matrices.push(m);
    }
    if (cache.size > 16) cache.clear();
    built = { oam, matrices };
    cache.set(key, built);
  }
  const rows = built;
  const orbBank = 16 + ORB.bank, impactBank = 16 + IMPACT.bank;
  /** loadspritegfx RED_ORB_2 (row 1) / IMPACT (row 4) into the unfaded and faded buffers; the hardware palette follows one row later. */
  const loaded = (base: readonly number[], age: number): number[] => {
    const out = base.slice();
    if (age >= 1) for (let i = 0; i < 16; i += 1) out[orbBank * 16 + i] = args.redOrbPalette[i] ?? 0;
    if (age >= 4) for (let i = 0; i < 16; i += 1) out[impactBank * 16 + i] = IMPACT_PALETTE[i]!;
    return out;
  };
  const art = (species: string, object: typeof A) => ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority });
  return {
    duration: T.rows,
    animationInputsAt: (age: number) => {
      const row = Math.min(Math.max(age, 0), rows.oam.length - 1);
      return {
        stockpiles: counter, attackerArt: art(args.attackerSpecies, A), targetArt: art(args.targetSpecies, Tg),
        ownedSprites: [], liveTasks: [],
        buffers: { softwareOam: [], hardwareOam: rows.oam[row]!, softwareMatrices: [], hardwareMatrices: rows.matrices[row]! },
        palette: { unfaded: loaded(args.palettes.unfaded, age), faded: loaded(args.palettes.faded, age),
          hardware: age === 0 ? args.palettes.hardware.slice() : loaded(args.palettes.faded, age - 1) },
        registers: {},
        resources: { redOrbTileBase: ORB.tile, impactTileBase: IMPACT.tile, redOrbLoaded: age >= 1, impactLoaded: age >= 4, allocator: null },
        order: [], audio: null, liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: MATRIX_BITMAP },
        animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}
