/**
 * prep23: source-derived model of the Ghost-type MOVE_CURSE body (CurseGhost): monbg(attacker) + CurseStretchingBlackBg, nail sprite, three
 * ShakeMon2 hits, clearmonbg, monbg(target) + ghost sprite + ShakeMon2 + simple_palette_blend, clearmonbg.
 * Frame convention (measured, same as the stats body): a script command at frame c creates the object in frame c; the snapshot row r shows the state
 * after frame r (objects first appear in row c+1); a GPU register written in frame f is visible in row f+1.
 * No per-age corpus rows are read; `CurseGhostKnown` carries allocator/anchor constants of the first body.
 */
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import type { Oam3 } from "./prep23CurseStats.ts";

export interface CurseGhostKnown {
  readonly side: "player" | "opponent";                       // Curse user side
  readonly healthboxAttr: readonly Oam3[]; readonly healthboxSlots: readonly number[]; readonly dummyAttr: Oam3;
  readonly attackerSlot: number; readonly targetSlot: number; readonly attackerAttr: Oam3; readonly targetAttr: Oam3;
  readonly attackerX: number; readonly attackerY: number; readonly targetX: number; readonly targetY: number;   // battler sprite x/y (monbg anchors)
  readonly nailAnchor: { x: number; y: number }; readonly ghostAnchor: { x: number; y: number };               // InitSpritePosTo*Attacker/Target(TRUE)
  readonly nailTileBase: number; readonly nailBank: number; readonly ghostTileBase: number; readonly ghostBank: number; readonly sprite3: number;
  readonly bodyRegisters: Readonly<Record<string, number>>; readonly activationRegisters: Readonly<Record<string, number>>;
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly activationPalette: readonly number[]; readonly nailPalette: readonly number[]; readonly ghostPalette: readonly number[];   // assets-only palettes (curse.json)
  readonly spriteOrderAt: (state: number) => readonly number[];
}
const sin = (index: number, amp: number) => (amp * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
export const WIN_RANGE = (a: number, b: number) => (a << 8 | b) & 0xffff;

// ---- timeline (script edges GHOST_EDGES + `delay N` = N + 2 rows, measured)
export const T = { monbg1: 7, stretch: 9, nail: 54, shake1: 116, shake2: 159, shake3: 202, clear1: 287, monbg2: 293, ghost: 295 - 1 + 0, clear2: 367 } as const;

/** AnimTask_ShakeMon2 replay: returns the x2 of the sprite per frame (frame >= create) and the task data (undefined once destroyed). */
export function shakeMon2(create: number, xo: number, shakes: number, delay: number, spriteId: number) {
  const x2s = new Map<number, number>(), data = new Map<number, number[]>();
  let x2 = xo, d1 = shakes, d2 = delay, d3 = delay, d4 = xo; let f = create;
  const step = () => { if (d3 === 0) { x2 = x2 === d4 ? -d4 : d4; d3 = d2; if (--d1 === 0) { x2 = 0; return true; } } else d3 -= 1; return false; };
  let ended = step(); x2s.set(f, x2); if (!ended) data.set(f, [spriteId, d1, d2, d3, d4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  while (!ended) { f += 1; ended = step(); x2s.set(f, x2); if (!ended) data.set(f, [spriteId, d1, d2, d3, d4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); }
  return { x2s, data, last: f };
}
/** AnimTask_CurseStretchingBlackBg: Step1 x16 (WIN0 growing), Step16 -> full, Step2 until the palette fade is done. */
export function stretchWin(side: "player" | "opponent", step: number) {
  const startX = side === "player" ? 200 : 40, startY = 40, ld = startX, rd = 240 - startX, td = startY, bd = 72;
  if (step < 16) return { h: WIN_RANGE(Math.trunc(startX - ld * 0.0625 * step), Math.trunc(startX + rd * 0.0625 * step)), v: WIN_RANGE(Math.trunc(startY - td * 0.0625 * step), Math.trunc(startY + bd * 0.0625 * step)) };
  return { h: WIN_RANGE(0, 240), v: WIN_RANGE(0, 112) };
}

/** gCurseNailSpriteTemplate: AnimCurseNail / _Step1 / WaitAnimForDuration / _Step2 / _End. State per snapshot row (first visible row 55). */
export function nailSim(k: CurseGhostKnown, firstRow = 55, lastFrame = 400) {
  const player = k.side === "player", rows = new Map<number, { x: number; y: number; x2: number; tile: number; invisible: boolean }>(); const ev = new Map<number, Record<string, number>>();
  let x = k.nailAnchor.x + (player ? 24 : -24), x2 = 0, d0 = 60, d1 = player ? -2 : 2, d2 = 0, tile = k.nailTileBase, invisible = false, cb: "s1" | "wait" | "s2" | "end" | "gone" = "s1", s2d = [0, 0, 0];
  const set = (f: number, r: Record<string, number>) => ev.set(f - 1, { ...(ev.get(f - 1) ?? {}), ...r });   // nail SetGpuReg is visible in the same snapshot row (no VBlank lag)
  for (let f = firstRow; f <= lastFrame && cb !== "gone"; f += 1) {
    if (cb === "s1") { if (d0 > 0) d0 -= 1; else { x2 += d1; if (((x2 + 7) & 0xffff) > 14) { x += x2; x2 = 0; tile += 8; d2 += 1; if (d2 === 3) { d0 = 30; cb = "wait"; } else d0 = 40; } } }
    else if (cb === "wait") { if (d0 > 0) d0 -= 1; else cb = "s2"; }
    else if (cb === "s2") {
      if (s2d[0] === 0) { set(f, { bldcnt: 0x3f40, bldalpha: 16 }); s2d = [1, 0, 0]; }
      else if (s2d[1]! < 2) s2d[1]! += 1;
      else { s2d[1] = 0; s2d[2]! += 1; set(f, { bldalpha: (16 - s2d[2]!) | s2d[2]! << 8 }); if (s2d[2] === 16) { invisible = true; cb = "end"; } }
    } else if (cb === "end") { set(f, { bldcnt: 0, bldalpha: 0, win0h: 0, win0v: 0 }); cb = "gone"; continue; }
    rows.set(f, { x, y: k.nailAnchor.y, x2, tile, invisible });
  }
  return { rows, ev };
}
/** gCurseGhostSpriteTemplate: AnimGhostStatusSprite; call n runs in frame 294 + n (first visible row 296 with n = 2). */
export function ghostSim(k: CurseGhostKnown) {
  const rows = new Map<number, { x2: number; y2: number; invisible: boolean }>(), ev = new Map<number, Record<string, number>>();
  let d0 = 0, d1 = 0, d6 = 0, d7 = 0, x2 = 0, y2 = 0, invisible = false, done = false;
  for (let n = 1; !done; n += 1) {
    const f = 294 + n;
    if (invisible) { ev.set(f - 1, { bldcnt: 0, bldalpha: 0 }); done = true; continue; }
    x2 = sin(d0, 12); if (k.side !== "player") x2 = -x2; d0 = (d0 + 6) & 0xff; d1 += 0x100; y2 = -(d1 >> 8); d7 += 1;
    if (d7 === 1) { d6 = 0x050b; ev.set(f, { bldcnt: 0x3f40, bldalpha: d6 }); }
    else if (d7 > 30) { let b = d6 >> 8, a = d6 & 0xff; if (++b > 16) b = 16; a -= 1; if (a < 0) a = 0; d6 = a | b << 8; ev.set(f - 1, { bldalpha: d6 }); if (b === 16 && a === 0) invisible = true; }
    rows.set(f, { x2, y2, invisible });
  }
  return { rows, ev };
}

export interface CurseGhostRow {
  readonly hardwareOam: string[] | null; readonly registers: Record<string, number>; readonly battleBg: Record<string, number>;
  readonly tasks: { slot: number; callback: string; data: number[] }[]; readonly hardwarePalette: number[];
}
const STRETCH_END = 26 + 6, ATT_OAM_HIDE = [9, 288] as const, TGT_OAM_HIDE = [295, 368] as const;
const cache = new WeakMap<CurseGhostKnown, ReturnType<typeof build>>();
function build(k: CurseGhostKnown) {
  const shakes = [shakeMon2(T.shake1, 4, 10, 0, k.attackerSlot), shakeMon2(T.shake2, 4, 10, 0, k.attackerSlot), shakeMon2(T.shake3, 4, 10, 0, k.attackerSlot)];
  const tshake = shakeMon2(295, 2, 14, 1, k.targetSlot);
  return { shakes, tshake, nail: nailSim(k), ghost: ghostSim(k) };
}
const x2At = (sims: { x2s: Map<number, number>; last: number; }[], f: number) => { for (const s of sims) if (s.x2s.has(f) && f > [...s.x2s.keys()][0]!) return s.x2s.get(f)!; return 0; };
export function curseGhostRow(row: number, k: CurseGhostKnown): CurseGhostRow {
  let b = cache.get(k); if (!b) { b = build(k); cache.set(k, b); }
  const player = k.side === "player", att = player ? 2 : 1, tgt = player ? 1 : 2;       // BG index of the attacker / target monbg (player BG2, opponent BG1)
  const regs: Record<string, number> = { ...(row === 0 ? k.activationRegisters : k.bodyRegisters) };
  const bbg: Record<string, number> = { gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0, gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: 0 };
  const apply = (f: number) => {                                                          // everything executed in frame f (regs visible in row f + 1)
    const ev = (m: Record<string, number> | undefined) => { if (m) Object.assign(regs, m); };
    if (f === 9) ev({ winin: 0x3f3f, winout: 0x3f1f, bldcnt: 200, bldy: 16, win0h: 0, win0v: 0 });
    if (f >= 10 && f <= 26) { const w = stretchWin(k.side, f - 10); regs.win0h = w.h; regs.win0v = w.v; }
    if (f === STRETCH_END) ev({ win0h: 0, win0v: 0, winin: 0x3f3f, winout: 0x3f3f, bldcnt: 0, bldy: 0 });
    ev(b!.nail.ev.get(f)); ev(b!.ghost.ev.get(f));
    // monbg of the attacker (frames 7..290) and of the target (293..370): BGn scroll = -(x + x2) + 32
    const mon = (first: number, last: number, bg: number, x: number, y: number, x2: number) => {
      if (f < first || f > last) return;
      if (f === first) regs[`bg${bg}cnt`] = (regs[`bg${bg}cnt`]! & ~0xc003) | 0x4000 | 2;
      bbg[`gBattle_BG${bg}_X`] = -(x + x2) + 32; bbg[`gBattle_BG${bg}_Y`] = -y + 32;
      regs[`bg${bg}hofs`] = (-(x + x2) + 32) & 0x1ff; regs[`bg${bg}vofs`] = (-y + 32) & 0x1ff;
    };
    mon(T.monbg1, 290, att, k.attackerX, k.attackerY, x2At(b!.shakes, f));
    mon(T.monbg2 + 0, 370, tgt, k.targetX, k.targetY, x2At([b!.tshake], f));
    if (f === 291) { regs[`bg${att}hofs`] = 0; regs[`bg${att}vofs`] = 0; bbg[`gBattle_BG${att}_X`] = 0; bbg[`gBattle_BG${att}_Y`] = 0; }
    if (f === 371) { regs[`bg${tgt}hofs`] = 0; regs[`bg${tgt}vofs`] = 0; bbg[`gBattle_BG${tgt}_X`] = 0; bbg[`gBattle_BG${tgt}_Y`] = 0; }
  };
  // registers lag one row, battleBg is immediate
  const bgSnap = (f: number) => { const save = { ...regs }; apply(f); const snap = { ...bbg }; Object.assign(regs, save); return snap; };
  void bgSnap;
  const regRows: Record<string, number>[] = []; void regRows;
  const run: Record<string, number> = { ...regs }; const keep = { regs, bbg };
  // replay frames 0..row (registers up to row-1, battleBg up to row)
  const replay = (upto: number) => { for (const key of Object.keys(regs)) regs[key] = ((row === 0 ? k.activationRegisters : k.bodyRegisters) as Record<string, number>)[key]!; for (let f = 0; f <= upto; f += 1) apply(f); };
  replay(row - 1); const outRegs = { ...regs };
  for (const key of Object.keys(bbg)) bbg[key] = 0; replay(row); const outBbg = { ...bbg }; void run; void keep;
  // ---- tasks
  const tasks: CurseGhostRow["tasks"] = [];
  const z = () => new Array(16).fill(0);
  const sx = player ? 200 : 40;
  if (row >= 10 && row <= 31) { const d = z(); d[0] = row <= 25 ? row - 9 : 17; d[1] = sx; d[2] = 240 - sx; d[3] = 40; d[4] = 72; d[5] = sx; d[6] = 40;
    tasks.push({ slot: 0, callback: row <= 25 ? "AnimTask_CurseStretchingBlackBg_Step1" : "AnimTask_CurseStretchingBlackBg_Step2", data: d }); }
  for (const s of b.shakes) { const d = s.data.get(row); if (d && row > [...s.x2s.keys()][0]!) tasks.push({ slot: 0, callback: "AnimTask_ShakeMon2_Step", data: d }); }
  { const d = b.tshake.data.get(row); if (d && row > 295) tasks.push({ slot: 0, callback: "AnimTask_ShakeMon2_Step", data: d }); }
  for (const [first, last, d1, d2] of [[288, 290, 0, 0], [368, 370, 0, 1]] as const) if (row >= first && row <= last) { const d = z(); d[1] = row === first ? 1 : 2; d[2] = d2 ^ (player ? 0 : 1); tasks.push({ slot: 0, callback: "Task_ClearMonBg", data: d }); void d1; }
  const mb = (first: number, last: number, id: number, x: number, y: number, isPlayer: boolean) => { if (row < first || row > last) return; const d = z();
    d[0] = id; d[1] = x; d[2] = y; d[3] = -(x - 32); d[4] = -(y - 32); d[5] = isPlayer ? 1 : 0; d[6] = isPlayer ? 0 : 1; tasks.push({ slot: 1, callback: "Task_UpdateMonBg", data: d }); };
  mb(T.monbg1, 290, k.attackerSlot, k.attackerX, k.attackerY, player);
  mb(T.monbg2, 370, k.targetSlot, k.targetX, k.targetY, !player);
  tasks.sort((a, c) => a.slot - c.slot);
  // ---- OAM
  let oam: string[] | null = null;
  if (row >= 1) {
    const attrs = new Map<number, Oam3>();
    if (!(row >= ATT_OAM_HIDE[0] && row <= ATT_OAM_HIDE[1])) attrs.set(k.attackerSlot, k.attackerAttr);
    if (!(row >= TGT_OAM_HIDE[0] && row <= TGT_OAM_HIDE[1])) attrs.set(k.targetSlot, k.targetAttr);
    const n = b.nail.rows.get(row - 1);
    if (n && !n.invisible) attrs.set(k.sprite3, [0x4400 | (n.y - 8) & 0xff, 0x8000 | (player ? 0x1000 : 0) | (n.x + n.x2 - 16) & 0x1ff, n.tile | 2 << 10 | k.nailBank << 12]);
    const g = b.ghost.rows.get(row - 1);
    if (g && !g.invisible && row - 1 >= 296) attrs.set(k.sprite3, [0x0400 | (k.ghostAnchor.y + g.y2 - 16) & 0xff, 0x8000 | (k.ghostAnchor.x + g.x2 - 16) & 0x1ff, k.ghostTileBase | 2 << 10 | k.ghostBank << 12]);
    const list: Oam3[] = []; let health = false;
    for (const slot of k.spriteOrderAt(row - 1)) {
      if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
      const at = attrs.get(slot); if (at) list.push(at);
    }
    while (list.length < 128) list.push(k.dummyAttr);
    oam = list.map((q, i) => hex4(q[0]) + hex4(q[1]) + hex4(q[2]) + hex4(k.hardwareMatrices[i >> 2]![i & 3]!));
  }
  // ---- palette (hardware): asset loads, monbg BG-bank copies of the battler OBJ banks, black fade of BG banks 1-3
  const pal = [...k.activationPalette], put = (bank: number, src: readonly number[]) => { for (let i = 0; i < 16; i += 1) pal[bank * 16 + i] = src[i]!; };
  const obj = (attr: Oam3) => k.activationPalette.slice((16 + (attr[2] >> 12)) * 16, (16 + (attr[2] >> 12)) * 16 + 16);
  if (row >= 2) put(16 + k.nailBank, k.nailPalette);
  if (row >= 5) put(16 + k.ghostBank, k.ghostPalette);
  if (row >= T.monbg1) put(player ? 9 : 8, obj(k.attackerAttr));
  if (row >= T.monbg2) put(player ? 8 : 9, obj(k.targetAttr));
  const y = row < 26 ? 0 : row < 340 ? 16 : row > 361 ? 0 : 14 - 2 * Math.floor((row - 340) / 3);
  if (y) for (let i = 16; i < 64; i += 1) { const c = k.activationPalette[i]!; const f = (a: number) => a + ((-a * y) >> 4); pal[i] = f(c & 31) | f(c >> 5 & 31) << 5 | f(c >> 10 & 31) << 10; }
  return { hardwareOam: oam, registers: outRegs, battleBg: outBbg, tasks, hardwarePalette: pal };
}
