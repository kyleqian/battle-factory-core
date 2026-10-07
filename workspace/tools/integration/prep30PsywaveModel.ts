/**
 * prep30: source-derived per-age model of the MOVE_PSYWAVE inputs (src/animation/psywave.ts reducer + battleScene.ts PSYWAVE branch): the 12
 * BLUE_RING sprites (slot / matrix lowest-free, AnimToTargetInSinWave: InitAnimLinearTranslation 30 steps + Sin(data6 >> 8, +-16), data6 += 0xD200 / 30,
 * phase from AnimTask_RunSinAnimTimer gBattleAnimArgs[7] += 3; gGrowingRingAffineAnims: scale 0x20 then +7 per frame), hardware OAM + matrices
 * (prep20 assembler method: ring fields are sprite-callback driven -> OAM row r = sprite state r-1), registers (bldcnt / bldy of the two Task_FadeToBg),
 * palettes (BLUE_RING bank at row 1, psychic BG load / rotation / restore), tasks (fades, SetPsychicBackground_Step, RunSinAnimTimer), VRAM handle label.
 * blend_color_cycle (AnimTask_BlendColorCycle, battle_anim_normal.c; BeginNormalPaletteFade delay 1, y 0 <-> 12 step 2, RGB(31,18,31)) on the target OBJ bank:
 * the arm rows [69, 93, 117, 141] are class M (equal in 6/6 windows; the gPaletteFade.active latency between blends is measured, not derived).
 * NOT modelled (reported by the checker as such): the AnimTask_BlendColorCycleLoop / SoundTask_LoopSEAdjustPanning task data.
 * Script (battle_anim_scripts.s Move_PSYWAVE): loadspritegfx BLUE_RING (row 1), fadetobg BG_PSYCHIC C1 = 4, AnimTask_SetPsychicBackground row 23,
 * StartSinAnimTimer + rings every 6 rows from 42 (12 rings), restorebg C2 = 165, late lag (T, D4) at task row 185 (VRAM / palette split).
 */
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import type { Attr } from "./prep30ExtrasensoryModel.ts";
export interface PwKnown30 {
  readonly side: "player" | "opponent";
  readonly registers0: Readonly<Record<string, number>>; readonly registersBody: Readonly<Record<string, number>>;
  readonly palette0: readonly number[]; readonly faded0: readonly number[]; readonly unfaded0: readonly number[];
  readonly psychicPalette: readonly number[]; readonly ringPalette: readonly number[];       // P
  readonly ringBank: number; readonly ringTile: number;                                      // K: BLUE_RING tile / palette slots (allocator at activation)
  readonly attacker: Readonly<{ slot: number; attr: Attr }>; readonly target: Readonly<{ slot: number; attr: Attr }>;
  readonly origin: Readonly<{ x: number; y: number }>; readonly dest: Readonly<{ x: number; y: number }>;   // A / PD: attacker X_2 / Y_PIC_OFFSET (+-10, +10), target X_2 / Y_PIC_OFFSET
  readonly occupiedSlots: readonly number[]; readonly freeMatrices: readonly number[];
  readonly healthboxAttr: readonly Attr[]; readonly healthboxSlots: readonly number[]; readonly dummyAttr: Attr;
  readonly phase: Readonly<{ lateLag: boolean }>;
}
export const PW = { CYCLE_ARMS: [69, 93, 117, 141] as const, CYCLE_COLOR: 31 | 18 << 5 | 31 << 10, FADE1: 1 + 3, PSY: 23, TIMER: 42, RINGS: Array.from({ length: 12 }, (_, i) => 42 + 6 * i), RING_LIFE: 29, C2: 165, LATE_LAG: 185, BODY: 203,
  SLOTS: { fade: 0, psy: 1, timer: 0 }, VRAM_EDGES: [23, 184] as const } as const;
export interface PwRing { idx: number; birth: number; slot: number; matrix: number }
export interface PwRingState { idx: number; slot: number; matrix: number; x: number; y: number; x2: number; y2: number; data: number[]; scale: number; pa: number }
export interface PwRow30 { registers: Record<string, number>; hardwarePalette: number[]; fadedPalette: number[]; unfadedPalette: number[];
  tasks: { slot: number; callback: string; data: number[] }[]; rings: PwRingState[]; vram: number }
const blendTo = (c: number, y: number, to: number) => { const ch = (sh: number) => { const a = c >> sh & 31, b = to >> sh & 31; return (a + ((b - a) * y >> 4)) & 31; }; return ch(0) | ch(5) << 5 | ch(10) << 10; };
/** Target-bank blend amount at row r (M arm rows; up blends 2..12, down blends 10..0, one step of 2 every 3 rows, hold until the next arm). */
export const cycleY = (r: number): number => { let y = 0; PW.CYCLE_ARMS.forEach((a, i) => { if (r < a) return; const j = Math.floor((r - a) / 3); y = i % 2 === 0 ? Math.min(12, 2 * (j + 1)) : Math.max(0, 10 - 2 * j); }); return y; };
const data16 = (v: readonly number[]) => [...v, ...Array(16).fill(0)].slice(0, 16);
const fadeY = (e: number, c: number) => (e < c + 1 || e >= c + 37 ? { cnt: 0, y: 0 } : { cnt: 0xe8, y: e <= c + 1 ? 0 : e <= c + 17 ? e - c - 1 : e <= c + 20 ? 16 : 16 - (e - (c + 20)) });
const fadeState = (e: number, c: number) => (e < c || e >= c + 37 ? 0 : e <= c + 17 ? 1 : e === c + 18 ? 2 : 3);
export const pwRows = (k: Pick<PwKnown30, "phase">) => PW.BODY + 1 + (k.phase.lateLag ? 1 : 0);
export function psywaveRings(k: PwKnown30): PwRing[] {
  const out: PwRing[] = [];
  for (const [idx, birth] of PW.RINGS.entries()) {
    const alive = out.filter((o) => o.birth + PW.RING_LIFE > birth), used = new Set([...k.occupiedSlots, ...alive.map((o) => o.slot)]), mu = new Set(alive.map((o) => o.matrix));
    let slot = 0; while (used.has(slot)) slot += 1;
    out.push({ idx, birth, slot, matrix: k.freeMatrices.find((m) => !mu.has(m))! });
  }
  return out;
}
/** Ring state at row r (age a = r - birth; the creation call + the same frame's AnimateSprites = 2 callback steps at the birth row). */
export function ringState(ring: PwRing, r: number, k: PwKnown30): PwRingState | null {
  const a = r - ring.birth; if (a < 0 || a >= PW.RING_LIFE) return null;
  const x = k.origin.x, y = k.origin.y, dx = k.dest.x - x, dy = k.dest.y - y;
  let xd = Math.floor((Math.abs(dx) << 8) / 30) & 0xffff, yd = Math.floor((Math.abs(dy) << 8) / 30) & 0xffff;
  xd = dx < 0 ? xd | 1 : xd & ~1; yd = dy < 0 ? yd | 1 : yd & ~1;
  const args7 = 3 * (ring.birth - PW.TIMER) & 0xff; let d6 = args7 > 127 ? (args7 - 127) * 256 : args7 * 256, d7 = args7 > 127 ? -16 : 16;
  let xa = 0, ya = 0, x2 = 0, y2 = 0; const steps = a + 2;
  for (let s = 0; s < steps; s += 1) {
    xa = xa + xd & 0xffff; ya = ya + yd & 0xffff; x2 = xd & 1 ? -(xa >> 8) : xa >> 8; y2 = yd & 1 ? -(ya >> 8) : ya >> 8;
    y2 += (GBA_SINE_TABLE_256[(d6 >> 8) & 0xff]! * d7) >> 8;
    if ((d6 + 1792) >> 8 > 127) { d6 = 0; d7 = -d7; } else d6 += 1792;
  }
  const scale = 32 + 7 * (a + 1);
  return { idx: ring.idx, slot: ring.slot, matrix: ring.matrix, x, y, x2, y2, data: [30 - steps, xd, yd, xa << 16 >> 16, ya << 16 >> 16, 1792, d6 << 16 >> 16, d7], scale, pa: Math.floor(65536 / scale) };
}
export function psywaveModel(k: PwKnown30): PwRow30[] {
  const rows = pwRows(k), lags = k.phase.lateLag ? [PW.LATE_LAG] : [], e = (r: number) => r - lags.filter((l) => l <= r).length;
  const restoreRow = k.phase.lateLag ? PW.LATE_LAG : PW.VRAM_EDGES[1], rings = psywaveRings(k);
  const unfaded = [...k.unfaded0], faded = [...k.faded0]; let rotations = 0, prevFaded = [...k.palette0];
  const out: PwRow30[] = [];
  for (let r = 0; r < rows; r += 1) {
    const er = e(r), tasks: PwRow30["tasks"] = [];
    if (r === 1) for (let i = 0; i < 16; i += 1) { unfaded[(16 + k.ringBank) * 16 + i] = k.ringPalette[i]!; faded[(16 + k.ringBank) * 16 + i] = k.ringPalette[i]!; }
    if (r === PW.PSY) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = k.psychicPalette[i]!; faded[32 + i] = k.psychicPalette[i]!; }
    if (r >= PW.PSY) { const last = Math.min(er, PW.C2 + 19), first = PW.PSY + 3, want = last < first ? 0 : Math.floor((last - first) / 4) + 1;
      while (rotations < want) { const c11 = faded[32 + 11]!; for (let i = 10; i > 0; i -= 1) faded[32 + i + 1] = faded[32 + i]!; faded[32 + 1] = c11; rotations += 1; } }
    if (r === restoreRow) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = k.unfaded0[32 + i]!; faded[32 + i] = k.unfaded0[32 + i]!; }
    { const tb = (16 + (k.target.attr[2] >> 12 & 0xf)) * 16, y = cycleY(r); for (let i = 0; i < 16; i += 1) faded[tb + i] = y ? blendTo(unfaded[tb + i]!, y, PW.CYCLE_COLOR) : unfaded[tb + i]!; }
    if (r >= PW.PSY && er <= PW.C2 + 18) tasks.push({ slot: PW.SLOTS.psy, callback: "SetPsychicBackground_Step", data: data16([0, 0, 0, 0, 0, (er - PW.PSY + 1) % 4]) });
    const f1 = fadeState(r, PW.FADE1); if (f1 && r < PW.TIMER) tasks.push({ slot: PW.SLOTS.fade, callback: "Task_FadeToBg", data: data16([3, 0, 0, 0, 0, 0, 0, 0, 0, 0, f1]) });
    const f2 = r >= PW.C2 ? (k.phase.lateLag && r === PW.LATE_LAG - 1 ? 2 : fadeState(er, PW.C2)) : 0;
    if (f2) tasks.push({ slot: PW.SLOTS.fade, callback: "Task_FadeToBg", data: data16([-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, f2]) });
    if (r >= PW.TIMER && r <= PW.TIMER + 98) tasks.push({ slot: PW.SLOTS.timer, callback: "AnimTask_RunSinAnimTimer", data: data16([PW.TIMER + 99 - r]) });
    const reg: Record<string, number> = { ...(r === 0 ? k.registers0 : k.registersBody) };
    const fr = r < PW.C2 ? fadeY(r, PW.FADE1) : fadeY(e(r - 1) + 1, PW.C2); reg.bldcnt = fr.cnt; reg.bldy = fr.y;
    const hw = r === 0 ? [...k.palette0] : [...prevFaded];
    out.push({ registers: reg, hardwarePalette: hw, fadedPalette: [...faded], unfadedPalette: [...unfaded], tasks: tasks.sort((a, b) => a.slot - b.slot),
      rings: rings.map((g) => ringState(g, r, k)).filter((s): s is PwRingState => s !== null), vram: PW.VRAM_EDGES.filter((v) => v <= r).length });
    prevFaded = [...faded];
  }
  return out;
}
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
/** Hardware OAM + matrices of row `row` (>= 1) = BuildOamBuffer over the sprite state of row-1 (ring fields are callback / affine-anim driven). */
export function assemblePsywaveHardwareOam(row: number, k: PwKnown30, model: readonly PwRow30[], spriteOrderAt: (state: number) => readonly number[]): { oam: string[]; matrices: number[][] } {
  const attrs = new Map<number, Attr>(), matrices = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
  attrs.set(k.attacker.slot, k.attacker.attr); attrs.set(k.target.slot, k.target.attr);
  for (const s of model[row - 1]!.rings) {
    attrs.set(s.slot, [0x8000 | 0x0300 | (s.y + s.y2 - 32) & 0xff, 0x8000 | s.matrix << 9 | (s.x + s.x2 - 16) & 0x1ff, k.ringTile | 2 << 10 | k.ringBank << 12]);
    matrices[s.matrix] = [s.pa, 0, 0, s.pa];
  }
  const list: Attr[] = []; let health = false;
  for (const slot of spriteOrderAt(row - 1)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const a = attrs.get(slot); if (a) list.push(a); }
  while (list.length < 128) list.push(k.dummyAttr);
  return { oam: list.map((a, i) => hex4(a[0]) + hex4(a[1]) + hex4(a[2]) + hex4(matrices[i >> 2]![i & 3]!)), matrices };
}
