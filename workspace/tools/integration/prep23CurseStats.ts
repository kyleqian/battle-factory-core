/**
 * prep23: pure source-derived model of the non-Ghost MOVE_CURSE body ("CurseStats": SwayMon -> delay 10 -> DrawFallingWhiteLinesOnAttacker + BlendColorCycle red).
 * Replaces the corpus inputs of `curseAtAge` for the stats branch: hardware OAM (128 x 8 B), hardware matrices, GPU registers, hardware palette, live tasks.
 * Nothing here reads a per-age corpus row; the known-entry block (`CurseStatsKnown`) is the first-body allocator/battler/activation state.
 * Row convention (measured, prep20 §0.1): hardwareOam[row] = build(sprite state of row - OAM_LAG); tasks/palette/registers are keyed to the rows below.
 */
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";

export type Oam3 = readonly [number, number, number];
export interface CurseStatsKnown {
  readonly side: "player" | "opponent";                  // attacker side (Curse user)
  readonly healthboxAttr: readonly Oam3[]; readonly healthboxSlots: readonly number[]; readonly dummyAttr: Oam3;
  readonly attackerSlot: number; readonly targetSlot: number; readonly attackerAttr: Oam3; readonly targetAttr: Oam3;
  readonly attackerX: number; readonly attackerY: number;          // gSprites[attacker].x / .y (BG1 scroll anchor)
  readonly occupiedSlots: readonly number[];
  readonly activationRegisters: Readonly<Record<string, number>>;  // first-body activation state (dispcnt 0xbf40, bg1cnt 0x9c00 ...)
  readonly bodyRegisters: Readonly<Record<string, number>>;        // registers from row 1 on (row 0 keeps host leftovers, e.g. win0h/win0v 240/161 in the Miltank alternate)
  readonly activationPalette: readonly number[];                    // 512 hardware words at activation (BG + species art banks)
  readonly attackerObjBank: number;                                 // OBJ palette bank (0 / 1) of the attacker sprite
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly spriteOrderAt: (state: number) => readonly number[];     // lent
  readonly spriteTemplateOrder?: never;
}
/** Script/task timeline (battle_anim_scripts.s CurseStats; Sway first, then delay 10, then the DrawFallingWhiteLines + BlendColorCycle pair). */
export const SWAY_AMPLITUDE = 10, SWAY_PERIOD = 1536, SWAY_SWAYS = 3;
export const DRAW_CREATE = 77, DRAW_STEP_FIRST = 79, DRAW_STEP_SEGMENTS = 4, DRAW_TASK_LAST_ROW = 145, BLEND_TASK_LAST_ROW = 153;
export const OAM_LAG = 2;
const s16 = (v: number) => ((v & 0xffff) ^ 0x8000) - 0x8000;
const sin = (index: number, amp: number) => (amp * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;   // trig.c Sin(): arithmetic shift

interface SwayStep { readonly n: number; readonly x2: number; readonly data: number[]; readonly done: boolean }
/** AnimTask_SwayMon / AnimTask_SwayMonStep replayed: one step per row, rows 1.. (row 0 predates the task). */
export function swayAtStep(side: "player" | "opponent", spriteId: number, n: number): SwayStep {
  const amp = side === "player" ? SWAY_AMPLITUDE : -SWAY_AMPLITUDE;
  const d: number[] = new Array(16).fill(0);
  d[0] = 0; d[1] = amp; d[2] = SWAY_PERIOD; d[3] = SWAY_SWAYS; d[4] = spriteId; d[5] = side === "player" ? 0 : 1; d[12] = 1;
  let x2 = 0, done = false;
  for (let i = 1; i <= n && !done; i += 1) {
    const idx = (d[10]! + d[2]!) & 0xffff; d[10] = s16(idx);
    const wave = idx >> 8; x2 = sin(wave, d[1]!);
    if ((wave >= 0x80 && d[11] === 0 && d[12] === 1) || (wave < 0x7f && d[11] === 1 && d[12] === 0)) {
      d[11]! ^= 1; d[12]! ^= 1; d[3]! -= 1;
      if (d[3] === 0) { x2 = 0; done = true; }
    }
  }
  return { n, x2, data: d, done };
}
/** First row with no Sway task (== the script's waitforvisualfinish release). */
export function swayEndRow(side: "player" | "opponent"): number { for (let n = 1; ; n += 1) if (swayAtStep(side, 0, n).done) return n; }

/** BlendColorCycle + BeginNormalPaletteFade state machine (palette.c UpdateNormalPaletteFade, battle_anim_normal.c): returns the OBJ-half blend coefficient per faded-frame. */
export function blendCycleSchedule(createFrame: number, lastFrame: number): Map<number, number> {
  const st = { active: false, toggle: 0, counter: 0, delay: 4, y: 0, target: 0, fin: false, fc: 0, yDec: false };
  const log = new Map<number, number>(); let numBlends = 2, restore = 0; const INIT = 0, TARGET = 10;
  const update = (f: number) => {
    if (!st.active) return;
    if (st.fin) { if (st.fc === 4) { st.active = false; st.fin = false; st.fc = 0; } else st.fc += 1; return; }
    if (st.toggle === 0) { if (st.counter < st.delay) { st.counter += 1; return; } st.counter = 0; } else log.set(f, st.y);
    st.toggle ^= 1;
    if (st.toggle === 0) { if (st.y === st.target) st.fin = true; else st.y = st.yDec ? Math.max(st.y - 2, st.target) : Math.min(st.y + 2, st.target); }
  };
  const begin = (f: number, s: number, t: number) => { Object.assign(st, { active: true, counter: st.delay, y: s, target: t, yDec: !(s < t), fin: false, fc: 0, toggle: 0 }); update(f); };
  for (let f = createFrame; f <= lastFrame; f += 1) {
    if (f === createFrame) { begin(f, INIT, TARGET); numBlends -= 1; restore ^= 1; }
    else if (!st.active && numBlends > 0) { const s = restore ? TARGET : INIT; const t = numBlends === 1 ? 0 : (restore ? INIT : TARGET); begin(f, s, t); numBlends -= 1; restore ^= 1; }
    update(f);
  }
  return log;
}

export interface CurseStatsRow {
  readonly hardwareOam: string[] | null;                            // null at row 0 (pre-activation frame, not assembled)
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly registers: Record<string, number>;
  readonly hardwarePalette: number[];
  readonly tasks: { slot: number; callback: string; data: number[] }[];
}
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
const blend555 = (c: number, y: number, t = 0x1f) => {   // BlendPalette (util.c:264), RGB_RED
  const f = (a: number, x: number) => a + (((x - a) * y) >> 4);
  return f(c & 31, t & 31) | f(c >> 5 & 31, t >> 5 & 31) << 5 | f(c >> 10 & 31, t >> 10 & 31) << 10;
};
export const COPY_FIRST_ROW = 80, COPY_LAST_ROW = 147, COPY_SLOT = 3, FINAL_FADE_EXTRA = 4;

export function curseStatsRow(row: number, k: CurseStatsKnown): CurseStatsRow {
  const side = k.side, swayEnd = swayEndRow(side);
  // ---- tasks
  const tasks: CurseStatsRow["tasks"] = [];
  if (row >= 1 && row < swayEnd) tasks.push({ slot: 0, callback: "AnimTask_SwayMonStep", data: swayAtStep(side, k.attackerSlot, row).data });
  const sched = blendCycleSchedule(DRAW_STEP_FIRST, BLEND_TASK_LAST_ROW + 6);
  if (row >= DRAW_CREATE && row <= DRAW_TASK_LAST_ROW) {
    const d = new Array(16).fill(0);
    if (row < DRAW_STEP_FIRST) tasks.push({ slot: 0, callback: "AnimTask_DrawFallingWhiteLinesOnAttacker", data: d });
    else { const n = row - 78, seg = Math.min(4, Math.floor(n / 16)); d[0] = COPY_SLOT; d[10] = seg === 4 ? 0 : 4 * (n % 16); d[11] = seg;
      tasks.push({ slot: 0, callback: "AnimTask_DrawFallingWhiteLinesOnAttacker_Step", data: d }); }
  }
  if (row >= DRAW_STEP_FIRST && row <= BLEND_TASK_LAST_ROW) {
    const second = [...sched.keys()].length ? row >= 114 : false;   // second BeginNormalPaletteFade frame (sim: 115) flips numBlends/restore
    const d = new Array(16).fill(0); d[0] = 2; d[1] = 4; d[2] = second ? 0 : 1; d[3] = 0; d[4] = 10; d[5] = 31; d[8] = second ? 0 : 1;
    tasks.push({ slot: 1, callback: "AnimTask_BlendColorCycleLoop", data: d });
  }
  // ---- registers
  const r: Record<string, number> = { ...(row === 0 ? k.activationRegisters : k.bodyRegisters) };
  if (row >= DRAW_CREATE && row < DRAW_TASK_LAST_ROW) {
    r.bg1cnt = (r.bg1cnt! & ~0xc003 & ~0xc) | 4; r.dispcnt = r.dispcnt! | 0x8000; r.winin = 0x3f3f; r.winout = 0x3f3d; r.bldcnt = 0x3f42; r.bldalpha = 0x0c08;
    r.win0h = 0; r.win0v = 0;
    const n = Math.min(row - 79, 64);
    if (n >= 1) { r.bg1hofs = (32 - k.attackerX) & 0x1ff; r.bg1vofs = (32 - k.attackerY - 4 * (n % 16)) & 0x1ff; }
  } else if (row >= DRAW_TASK_LAST_ROW) {
    r.bg1cnt = (r.bg1cnt! & ~0xc003 & ~0xc) | 0; r.dispcnt = (r.dispcnt! | 0x8000) ^ 0x8000; r.winin = 0x3f3f; r.winout = 0x3f3f; r.bldcnt = 0; r.bldalpha = 0; r.bg1hofs = 0; r.bg1vofs = 0;
  }
  // ---- palette
  const pal = [...k.activationPalette];
  if (row >= 79) pal[129] = 0x7fff;                                   // LoadPalette(sCurseLinesPalette, BG_PLTT_ID(8) + 1)
  let y = 0; for (const [f, v] of sched) if (f + 1 + (v === 0 && f > 100 ? FINAL_FADE_EXTRA : 0) <= row) y = v;
  const base = (16 + k.attackerObjBank) * 16;
  if (y) for (let i = 0; i < 16; i += 1) pal[base + i] = blend555(k.activationPalette[base + i]!, y);
  // ---- OAM
  let oam: string[] | null = null;
  if (row >= 1) {
    const state = row - 1, attrs = new Map<number, Oam3>(); const x2 = row - OAM_LAG >= 1 && row - OAM_LAG < swayEnd ? swayAtStep(side, 0, row - OAM_LAG).x2 : 0;
    const a = k.attackerAttr, att: Oam3 = [a[0], a[1] & ~0x1ff | (a[1] + x2) & 0x1ff, a[2]];
    attrs.set(k.attackerSlot, att); attrs.set(k.targetSlot, k.targetAttr);
    if (row >= COPY_FIRST_ROW && row <= COPY_LAST_ROW) attrs.set(COPY_SLOT, [a[0] | 0x800, a[1], a[2] & ~0xc00]);
    const list: Oam3[] = []; let health = false;
    for (const slot of k.spriteOrderAt(state)) {
      if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
      const at = attrs.get(slot); if (at) list.push(at);
    }
    while (list.length < 128) list.push(k.dummyAttr);
    oam = list.map((q, i) => hex4(q[0]) + hex4(q[1]) + hex4(q[2]) + hex4(k.hardwareMatrices[i >> 2]![i & 3]!));
  }
  return { hardwareOam: oam, hardwareMatrices: k.hardwareMatrices, registers: r, hardwarePalette: pal, tasks };
}
