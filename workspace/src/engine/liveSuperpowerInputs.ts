/**
 * MOVE_SUPERPOWER (276) live inputs (docs/next-adapters-prep31.md s1 / s3; the prototype is tools/integration/prep31SuperpowerModel.ts, ported
 * 1:1): hardware OAM + matrices (hardwareOam[row] = build(sprite state of row - 1); the order carried by SortSprites passes from the host's lent
 * activation order), registers (S0 + win0, monbg BGnCNT / scroll, splitbgprio, setalpha 12,8, BG3 shake), palettes (composite + CIRCLE_OF_LIGHT /
 * METEOR / FLAT_ROCK at rows 1 / 4 / 7, the monbg copy of the attacker's OBJ bank) from production values only: battler anchors, the known-entry
 * allocator (orb tile 305 / bank 7, meteor 537 / 8, rock 433 / 9, the lowest free matrix 0), the first-body S0 registers. D4 faithful timing:
 * the monbg BGnCNT / HOFS write row (10 | 11, a CPU phase) comes from the timing policy (liveMoveTimingPolicy.ts MOVE_SUPERPOWER bg-write-row).
 * Script rows (Move_SUPERPOWER; `delay N` puts the next command N + 2 rows later): loads 1 / 4 / 7, monbg 10, orb 13, shake 35, rocks 77 + 10 i,
 * fireball 193, AnimTask_ShakeMon2(target, 8, 0, 16, 1) 211, clearmonbg 242; 248 rows. Never a capture row.
 */
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";
import { KNOWN_ENTRY_HEALTHBOX_OAM, KNOWN_ENTRY_HEALTHBOX_SLOTS, buildLiveHardwareOam, carryLiveSpriteOrder,
  type LiveOamSprite, type LiveSpriteOrderSort, type OamAttr } from "./liveMoveOamAssembler.ts";

type Side = "player" | "opponent";
type Point = Readonly<{ x: number; y: number }>;
type Matrix = readonly [number, number, number, number];
const after = (row: number, delay: number) => row + delay + 2;
const SP = (() => {
  const LOAD = [1, 4, 7] as const, MONBG = 10, ORB = 13, SHAKE = after(ORB, 20), ROCK0 = after(SHAKE, 40);
  const ROCKS = [0, 1, 2, 3, 4].map((i) => ROCK0 + i * after(0, 8));
  const FIREBALL = after(ROCKS[4]!, 74), SHAKEMON = after(FIREBALL, 16);
  return { LOAD, MONBG, ORB, SHAKE, ROCKS, FIREBALL, SHAKEMON, CLEAR: 242, ROWS: 248 } as const;
})();
export const SUPERPOWER_ROWS = SP.ROWS;
/** createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, x, speed, tileIndex, frames */
const ROCK_ARGS = [[200, 96, 1, 120], [20, 248, 4, 112], [130, 160, 2, 104], [160, 192, 0, 96], [60, 288, 3, 88]] as const;
const s16 = (v: number) => (v << 16) >> 16;
const ORB = { tile: 305, bank: 7, prio: 2 } as const, METEOR = { tile: 537, bank: 8, prio: 2 } as const, ROCK = { tile: 433, bank: 9, prio: 2 } as const;
const FREE_MATRIX = 0;
const OCCUPIED_SLOTS: readonly number[] = [0, 1, 2, 6, 8, 60, 61, 62, 63];
const BATTLER_ATTR2: Readonly<Record<Side, number>> = { player: 2417, opponent: 6617 };
const HEALTHBOX = { slots: KNOWN_ENTRY_HEALTHBOX_SLOTS, entries: KNOWN_ENTRY_HEALTHBOX_OAM };
/** The first-body BG register state S0 (liveBgSnapshotMoves.ts; prep16 s0.3). */
const S0: Readonly<Record<string, number>> = {
  dispcnt: 0xbf40, bg0cnt: 0x9800, bg1cnt: 0x9c00, bg2cnt: 0x5e00, bg3cnt: 0x5a0b,
  bg0hofs: 0, bg0vofs: 0, bg1hofs: 0, bg1vofs: 0, bg2hofs: 0, bg2vofs: 0, bg3hofs: 0, bg3vofs: 0,
  win0h: 240, win0v: 161, winin: 0x3f3f, winout: 0x3f3f, mosaic: 0, bldcnt: 0, bldalpha: 0, bldy: 0,
};
interface SpSprite { kind: "orb" | "shake" | "rock" | "fireball"; idx: number; slot: number; x: number; y: number; x2: number; y2: number; scale?: number }
/** sAffineAnim_SuperpowerOrb scale at state row r (r >= ORB): set 0x20, +4 x64, then -6 x8 / +6 x8 forever. */
function orbScale(r: number): number {
  const k = r - SP.ORB + 1; if (k <= 64) return 0x20 + 4 * k;
  const p = (k - 65) % 16; return p < 8 ? 0x120 - 6 * (p + 1) : 0xf0 + 6 * (p - 7);
}
const linear = (from: number, to: number) => { const d = to - from, q = ((Math.abs(d) << 8) / 16) & 0xffff; return d < 0 ? q | 1 : q & ~1; };
const linearStep = (q: number, j: number) => { const acc = (q * j) & 0xffff; return q & 1 ? -(acc >> 8) : acc >> 8; };
/** All move-owned sprites alive in the state of row r (AnimSuperpowerOrb / Rock / Fireball, the invisible shake sprite; lowest-free slots). */
function superpowerSprites(r: number, a: Point, t: Point): SpSprite[] {
  const out: SpSprite[] = [];
  const life: { kind: SpSprite["kind"]; idx: number; first: number; last: number }[] = [];
  life.push({ kind: "orb", idx: 0, first: SP.ORB, last: SP.ORB + 196 });
  life.push({ kind: "shake", idx: 0, first: SP.SHAKE, last: SP.SHAKE + 179 });
  const rockLast = ROCK_ARGS.map(([x, speed, , frames], i) => {
    const R = SP.ROCKS[i]!; let y = 120;
    for (let n = 1; n <= frames; n += 1) { y = ((120 << 8) - speed * n) >> 8; if (y < -8) return R + n - 1; }
    let X = x << 4, Y = y << 4;
    for (let m = 1; m < 400; m += 1) {
      X = s16(X + (t.x - a.x)); Y = s16(Y + (t.y - a.y)); const sx = X >> 4, sy = Y >> 4;
      if (((sx + 8) & 0xffff) > 256 || sy < -8 || sy > 120) return R + frames + m - 1;
    }
    return 9999;
  });
  ROCK_ARGS.forEach((_, i) => life.push({ kind: "rock", idx: i, first: SP.ROCKS[i]!, last: rockLast[i]! }));
  life.push({ kind: "fireball", idx: 0, first: SP.FIREBALL, last: SP.FIREBALL + 16 });
  const slots = new Map<string, number>(); const placed: { slot: number; last: number }[] = [];
  for (const l of [...life].sort((p, q) => p.first - q.first)) {
    const used = new Set(OCCUPIED_SLOTS); for (const o of placed) if (o.last >= l.first) used.add(o.slot);
    let s = 0; while (used.has(s)) s += 1; placed.push({ slot: s, last: l.last }); slots.set(`${l.kind}${l.idx}`, s);
  }
  for (const l of life) {
    if (r < l.first || r > l.last) continue;
    const slot = slots.get(`${l.kind}${l.idx}`)!;
    if (l.kind === "orb") {
      const n = r - SP.ORB + 1, qx = linear(a.x, t.x), qy = linear(a.y, t.y);
      if (n < 180) out.push({ kind: "orb", idx: 0, slot, x: a.x, y: a.y, x2: 0, y2: 0, scale: orbScale(r) });
      else { const j = Math.min(n - 180, 16); out.push({ kind: "orb", idx: 0, slot, x: a.x, y: a.y, x2: linearStep(qx, j), y2: linearStep(qy, j), scale: orbScale(r) }); }
    }
    if (l.kind === "shake") out.push({ kind: "shake", idx: 0, slot, x: t.x, y: t.y, x2: 0, y2: 0 });
    if (l.kind === "rock") {
      const [x, speed, , frames] = ROCK_ARGS[l.idx]!, n = r - l.first + 1;
      if (n <= frames) out.push({ kind: "rock", idx: l.idx, slot, x, y: ((120 << 8) - speed * n) >> 8, x2: 0, y2: 0 });
      else {
        const y0 = ((120 << 8) - speed * frames) >> 8, m = n - frames - 1;
        const X = s16((x << 4) + m * (t.x - a.x)), Y = s16((y0 << 4) + m * (t.y - a.y));
        out.push({ kind: "rock", idx: l.idx, slot, x: X >> 4, y: Y >> 4, x2: 0, y2: 0 });
      }
    }
    if (l.kind === "fireball") {
      const j = Math.min(r - SP.FIREBALL + 1, 16), qx = linear(a.x, t.x), qy = linear(a.y, t.y);
      out.push({ kind: "fireball", idx: 0, slot, x: a.x, y: a.y, x2: linearStep(qx, j), y2: linearStep(qy, j) });
    }
  }
  return out.sort((p, q) => p.slot - q.slot);
}
/** AnimTask_ShakeMon2(target, 8, 0, 16, 1): x2 = -8 / +8 every 2nd frame from the creation row, 15 toggles, then 0 (state row). */
function targetX2(r: number): number { const j = r - SP.SHAKEMON; if (j < 0 || j >= 30) return 0; return (j >> 1) % 2 === 0 ? -8 : 8; }
/** gBattle_BG3_Y (state row): the shake sprite applies velocity on every 2nd Step from SHAKE + 1, restores 0 after its 180 frames. */
function bg3Y(r: number): number { const steps = r - SP.SHAKE + 1; if (steps < 1 || steps > 180) return 0; return (steps >> 1) % 2 === 1 ? -4 : 0; }

type Anchors = Readonly<{ spriteCenter: Point; picOffsetPoint: Point; frontIdleRest: Readonly<{ x2: number; y2: number }> }>;
export interface LiveSuperpowerArgs {
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: Anchors;
  readonly target: Anchors;
  readonly palettes: LivePaletteComposite;
  /** Seam-provided (liveMoveAnimation.ts): superpower-rock-orb-fire.json circleOfLight / meteor / flatRock palettes (BGR555 words). */
  readonly orbPalette: readonly number[];
  readonly meteorPalette: readonly number[];
  readonly rockPalette: readonly number[];
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** D4 policy (liveMoveTimingPolicy.ts MOVE_SUPERPOWER bg-write-row): the monbg BGnCNT / HOFS write row. */
  readonly monbgCntRow: 10 | 11;
}
const cache = new Map<string, { oam: string[][]; matrices: Matrix[][] }>();

/** Superpower live inputs. Null for a non-zero idle rest on either battler (the monbg / shake programs are proven from a zero rest only). */
export function liveSuperpowerInputs(args: LiveSuperpowerArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } | null {
  const { attackerSide, attacker, target } = args;
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0 || target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player", player = attackerSide === "player";
  const battler = (side: Side, center: Point) => ({ slot: side === "player" ? 6 : 8, subpriority: side === "player" ? 30 : 40,
    attr: [(center.y - 32) & 0xff, 0xc000 | (center.x - 32) & 0x1ff, BATTLER_ATTR2[side]] as OamAttr });
  const A = battler(attackerSide, attacker.spriteCenter), Tg = battler(targetSide, target.spriteCenter);
  const a = attacker.picOffsetPoint, t = target.picOffsetPoint;
  // createsprite subpriority offsets: orb ANIM_TARGET 2, fireball ANIM_TARGET 3, rocks ANIM_ATTACKER 41 (clamped to 3).
  const orbSub = Tg.subpriority - 2, fireSub = Tg.subpriority - 3, rockSub = 3;
  const key = JSON.stringify([attackerSide, attacker.spriteCenter, a, target.spriteCenter, t, args.activationOrder]);
  let built = cache.get(key);
  if (!built) {
    const keysAt = (s: number): LiveOamSprite[] => {
      const out: LiveOamSprite[] = [
        { slot: A.slot, attr: A.attr, subpriority: A.subpriority, visible: true, oamY: A.attr[0] & 0xff },
        { slot: Tg.slot, attr: Tg.attr, subpriority: Tg.subpriority, visible: true, oamY: Tg.attr[0] & 0xff },
        ...HEALTHBOX.slots.map((slot) => ({ slot, attr: [0, 0, 0] as OamAttr, subpriority: 0, visible: true, oamY: 0 })),
      ];
      for (const sp of superpowerSprites(s, a, t)) {
        if (sp.kind === "orb") out.push({ slot: sp.slot, attr: [0, 0, ORB.prio << 10] as OamAttr, subpriority: orbSub, visible: true, oamY: (sp.y + sp.y2 - 64) & 0xff });
        if (sp.kind === "rock") out.push({ slot: sp.slot, attr: [0, 0, ROCK.prio << 10] as OamAttr, subpriority: rockSub, visible: true, oamY: (sp.y - 8) & 0xff });
        if (sp.kind === "fireball") out.push({ slot: sp.slot, attr: [0, 0, METEOR.prio << 10] as OamAttr, subpriority: fireSub, visible: true, oamY: (sp.y + sp.y2 - 32) & 0xff });
      }
      return out;
    };
    const flipFireball = player ? 0 : 0x3000;   // target on the player side -> HFLIP | VFLIP
    const objectsAt = (state: number): { sprites: LiveOamSprite[]; matrices: Matrix[] } => {
      const matrices: [number, number, number, number][] = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
      const sprites: LiveOamSprite[] = [];
      const push = (slot: number, attr: OamAttr) => sprites.push({ slot, attr, subpriority: 0, visible: true, oamY: attr[0] & 0xff });
      if (state < SP.MONBG + 1 || state >= SP.CLEAR) push(A.slot, A.attr);
      // createvisualtask runs the init (x2 = 8) before BuildOamBuffer, every Step (RunTasks) after it.
      const tx2 = state === SP.SHAKEMON ? 8 : targetX2(state - 1);
      push(Tg.slot, [Tg.attr[0], Tg.attr[1] & ~0x1ff | (Tg.attr[1] & 0x1ff) + tx2 & 0x1ff, Tg.attr[2]]);
      for (const s of superpowerSprites(state, a, t)) {
        if (s.kind === "orb") {
          const m = Math.trunc(0x10000 / s.scale!); matrices[FREE_MATRIX] = [m, 0, 0, m];
          push(s.slot, [0x0700 | (s.y + s.y2 - 64) & 0xff, 0xc000 | FREE_MATRIX << 9 | (s.x + s.x2 - 64) & 0x1ff, ORB.tile | ORB.prio << 10 | ORB.bank << 12]);
        }
        if (s.kind === "rock") push(s.slot, [(s.y - 8) & 0xff, 0x4000 | (s.x - 8) & 0x1ff, ROCK.tile + 4 * ROCK_ARGS[s.idx]![2] | ROCK.prio << 10 | ROCK.bank << 12]);
        if (s.kind === "fireball") push(s.slot, [(s.y + s.y2 - 32) & 0xff, 0xc000 | flipFireball | (s.x + s.x2 - 32) & 0x1ff, METEOR.tile | METEOR.prio << 10 | METEOR.bank << 12]);
      }
      return { sprites, matrices };
    };
    const oam: string[][] = [], matrices: Matrix[][] = [];
    let order: readonly number[] = args.activationOrder;
    for (let row = 0; row < SP.ROWS; row += 1) {
      const { sprites, matrices: m } = objectsAt(row - 1);
      oam.push(buildLiveHardwareOam(order, sprites, HEALTHBOX, m)); matrices.push(m);
      order = carryLiveSpriteOrder(order, keysAt(row), args.sort);
    }
    if (cache.size > 16) cache.clear();
    built = { oam, matrices };
    cache.set(key, built);
  }
  const rows = built;
  // Registers / battleBg / palettes (prep31SuperpowerModel.ts superpowerModel), per row.
  const bg = player ? "bg2" : "bg1", BG = player ? "gBattle_BG2" : "gBattle_BG1", monbgBank = player ? 9 : 8, objBank = player ? 16 : 17;
  const bgX0 = 32 - attacker.spriteCenter.x, bgY0 = 32 - attacker.spriteCenter.y;
  const banks = [[7, args.orbPalette], [8, args.meteorPalette], [9, args.rockPalette]] as const;
  const model: { registers: Record<string, number>; palette: { unfaded: number[]; faded: number[]; hardware: number[] } }[] = [];
  const unfaded = args.palettes.unfaded.slice(), faded = args.palettes.faded.slice();
  let prevBg: Record<string, number> = {}, prevFaded = args.palettes.hardware.slice();
  for (let r = 0; r < SP.ROWS; r += 1) {
    SP.LOAD.forEach((lr, i) => { if (r === lr) { const [bank, pal] = banks[i]!; for (let c = 0; c < 16; c += 1) { unfaded[(16 + bank) * 16 + c] = pal[c] ?? 0; faded[(16 + bank) * 16 + c] = pal[c] ?? 0; } } });
    if (r === SP.MONBG) for (let c = 0; c < 16; c += 1) { unfaded[monbgBank * 16 + c] = faded[objBank * 16 + c]!; faded[monbgBank * 16 + c] = faded[objBank * 16 + c]!; }
    const hw = r === 0 ? args.palettes.hardware.slice() : prevFaded.slice();
    if (r >= SP.MONBG) for (let c = 0; c < 16; c += 1) hw[monbgBank * 16 + c] = faded[monbgBank * 16 + c]!;
    const bb: Record<string, number> = { gBattle_BG3_Y: bg3Y(r) };
    if (r >= SP.MONBG && r < SP.CLEAR + 3) { bb[`${BG}_X`] = bgX0; bb[`${BG}_Y`] = bgY0; }
    const reg: Record<string, number> = { ...S0 };
    if (r >= 1) { reg.win0h = 0; reg.win0v = 0; }
    if (r >= args.monbgCntRow) reg[`${bg}cnt`] = (S0[`${bg}cnt`]! & ~0xc003 | 0x4000 | 2) & 0xffff;
    if (r >= 1) {
      // T: with the BGnCNT write on the monbg row the init writes HOFS / VOFS of the same row.
      const src = r === SP.MONBG && args.monbgCntRow === SP.MONBG ? bb : prevBg;
      reg[`${bg}hofs`] = (src[`${BG}_X`] ?? 0) & 0x1ff; reg[`${bg}vofs`] = (src[`${BG}_Y`] ?? 0) & 0x1ff; reg.bg3vofs = (prevBg.gBattle_BG3_Y ?? 0) & 0x1ff;
    }
    if (player && r >= SP.ORB) reg.bg1cnt = S0.bg1cnt! & ~3 | 1;   // splitbgprio(ATTACKER) for PLAYER_LEFT
    if (r >= SP.ORB && r < SP.CLEAR) reg.bldalpha = 8 << 8 | 12;
    if (r >= SP.ORB && r < SP.ORB + 179) reg.bldcnt = 0x3f40;
    model.push({ registers: reg, palette: { unfaded: unfaded.slice(), faded: faded.slice(), hardware: hw } });
    prevBg = bb; prevFaded = faded.slice();
  }
  const art = (species: string, object: typeof A) => ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority });
  return {
    duration: SP.ROWS,
    animationInputsAt: (age: number) => {
      const row = Math.min(Math.max(age, 0), SP.ROWS - 1), m = model[row]!;
      return {
        attackerArt: art(args.attackerSpecies, A), targetArt: art(args.targetSpecies, Tg), ownedSprites: [], liveTasks: [],
        buffers: { softwareOam: [], hardwareOam: rows.oam[row]!, softwareMatrices: [], hardwareMatrices: rows.matrices[row]! },
        palette: m.palette, registers: m.registers,
        background: { battleVram: null, currentVram: null, monbgPaletteBank: monbgBank },
        resources: { orbTileBase: ORB.tile, meteorTileBase: METEOR.tile, rockTileBase: ROCK.tile,
          orbPaletteBank: 16 + ORB.bank, meteorPaletteBank: 16 + METEOR.bank, rockPaletteBank: 16 + ROCK.bank,
          orbLoaded: age >= SP.LOAD[0], meteorLoaded: age >= SP.LOAD[1], rockLoaded: age >= SP.LOAD[2], allocator: null },
        spriteOrder: [], audio: null, liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 },
        animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}
