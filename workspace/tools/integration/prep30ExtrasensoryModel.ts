/**
 * prep30: source-derived per-age model of EVERY input the accepted MOVE_EXTRASENSORY reducer (src/animation/extrasensory.ts) and its renderer branch
 * (battleScene.ts EXTRASENSORY) read: hardware OAM + matrices (prep20 assembler method), registers (bldcnt / bldy / bldalpha, monbg BGnCNT / HOFS / VOFS),
 * battleBg, hardware / faded / unfaded palettes, live tasks (slot, callback, data[16]), scanline state (state, srcBuffer, dmaDest, both 320-word buffers),
 * VRAM handle label, plus the clone sprite.  Row = snapshot after frame `row` (prep24 conventions).
 * Script (battle_anim_scripts.s Move_EXTRASENSORY + SetPsychicBackground / UnsetPsychicBackground):
 *   fadetobg BG_PSYCHIC (Task_FadeToBg, battle_anim.c:1148: BLDCNT 0xe8 at C+1, BLDY 1..16 rows C+2..C+17, LoadMoveBg C+19, BLDY 15..0 C+21..C+36, destroy C+37) C1 = 1;
 *   AnimTask_SetPsychicBackground (row 20; SetPsychicBackground_Step, battle_anim_effects_3.c:1378: rotate faded BG bank colours 1..11 every 4th step);
 *   monbg ANIM_DEF_PARTNER (row 39); setalpha 12,8 + BlendMonInAndOut x2 (battle_anim_mons.c:1714; rows 42 / 68) + ExtrasensoryDistortion x3
 *   (battle_anim_psychic.c:954; rows 42 / 68 / 94; window = GetBattlerYCoordWithElevation(target) -+ 32) + TransparentCloneGrowAndShrink (row 94,
 *   battle_anim_psychic.c:1052; SetBattlerSpriteYOffsetFromOtherYScale); blendoff + clearmonbg + restorebg at row 120 (C2 = 120).
 * Classes: K = constant rows / slots (equal in every measured window), A/PD = species tables + battler anchors, P = asset palette,
 * H = activation history (scanline buffer contents outside the window, row-0 OAM / registers / palettes), T = CPU phase (`lateLag`, D4).
 */
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
export type Attr = readonly [number, number, number];
export interface XsKnown30 {
  readonly side: "player" | "opponent";                          // attacker side
  readonly registers0: Readonly<Record<string, number>>; readonly registersBody: Readonly<Record<string, number>>;
  readonly palette0: readonly number[]; readonly faded0: readonly number[]; readonly unfaded0: readonly number[];
  readonly psychicPalette: readonly number[];                     // P: battle-anim-psychic-bg palette (BGR555)
  readonly attacker: Readonly<{ slot: number; x: number; y: number; attr: Attr }>;
  readonly target: Readonly<{ slot: number; x: number; y: number; x2: number; y2: number; attr: Attr }>;
  readonly targetBattler: number;
  readonly attackerYDelta: number; readonly targetYElevation: number;      // A / PD (prep30Species.ts)
  readonly healthboxAttr: readonly Attr[]; readonly healthboxSlots: readonly number[]; readonly dummyAttr: Attr;
  readonly cloneSlot: number; readonly cloneMatrix: number;               // PD: lowest free sprite slot / matrix bit at activation
  readonly scanline0: Readonly<{ state: number; srcBuffer: number; dmaDest: number; buffers: readonly (readonly number[])[] }>;   // H
  readonly phase: Readonly<{ lateLag: boolean }>;                         // T (D4)
}
export interface XsRow30 {
  registers: Record<string, number>; battleBg: Record<string, number>;
  hardwarePalette: number[]; fadedPalette: number[]; unfadedPalette: number[];
  tasks: { slot: number; callback: string; data: number[] }[];
  scanline: { state: number; srcBuffer: number; dmaDest: number; buffers: number[][] };
  vram: number; clone: { x2: number; y2: number; matrix: number } | null;
}
export const XS = { FADE1: 1, PSY: 20, MONBG: 39, CNT: 40, STAGES: [42, 68, 94] as const, BLENDS: [42, 68] as const, CLONE: 94, CLEAR: 120,
  CLEAR_END: 122, TASK_LAGS: [122, 123] as const, LATE_LAG: 142, BODY: 160, SLOTS: { fade1: 0, psy: 1, monbg: 2, blend: 0, distortion: 3, clone: 0, clear: 0, restore: 3 },
  VRAM_EDGES: [20, 40, 122, 124, 141] as const } as const;
const data16 = (v: readonly number[]) => [...v, ...Array(16).fill(0)].slice(0, 16);
const sine = (i: number) => (i < 320 ? GBA_SINE_TABLE_256[i & 0xff]! : 0);       // gSineTable[320]; index 320 reads the following zero word
const blendTo = (c: number, y: number, to: number) => { const ch = (s: number) => { const a = c >> s & 31, b = to >> s & 31; return (a + ((b - a) * y >> 4)) & 31; }; return ch(0) | ch(5) << 5 | ch(10) << 10; };
const fadeY = (e: number, c: number) => (e < c + 1 || e >= c + 37 ? { cnt: 0, y: 0 } : { cnt: 0xe8, y: e <= c + 1 ? 0 : e <= c + 17 ? e - c - 1 : e <= c + 20 ? 16 : 16 - (e - (c + 20)) });
const fadeState = (e: number, c: number) => (e < c || e >= c + 37 ? 0 : e <= c + 17 ? 1 : e === c + 18 ? 2 : 3);
export const xsRows = (k: Pick<XsKnown30, "phase">) => XS.BODY + 1 + (k.phase.lateLag ? 1 : 0);
/** Clone grow/shrink (AnimTask_TransparentCloneGrowAndShrink_Step): task step j (row CLONE + j). */
export function cloneStep(j: number, attackerYDelta: number): { angle: number; state: number; scale: number; y2: number } {
  const angle = j <= 11 ? 4 * (j + 1) : j <= 23 ? 4 * (23 - j) : 0, state = j <= 10 ? 0 : j <= 22 ? 1 : j === 23 ? 2 : 3;
  const scale = 256 - (GBA_SINE_TABLE_256[angle]! >> 1), v = 64 - attackerYDelta * 2, v2 = Math.min(Math.trunc((v << 8) / scale), 128);
  return { angle, state, scale, y2: Math.trunc((v - v2) / 2) };
}
export function extrasensoryModel(k: XsKnown30): XsRow30[] {
  const rows = xsRows(k), lags = [...XS.TASK_LAGS, ...(k.phase.lateLag ? [XS.LATE_LAG] : [])], e = (r: number) => r - lags.filter((l) => l <= r).length;
  const restoreRow = k.phase.lateLag ? XS.LATE_LAG : XS.VRAM_EDGES[4];
  const targetOnBg1 = k.side === "player", bgx = targetOnBg1 ? "gBattle_BG1_X" : "gBattle_BG2_X", bgy = targetOnBg1 ? "gBattle_BG1_Y" : "gBattle_BG2_Y";
  const bgName = targetOnBg1 ? "bg1" : "bg2", monbgBank = targetOnBg1 ? 8 : 9, targetObj = 16 + (k.target.attr[2] >> 12 & 0xf), attObj = 16 + (k.attacker.attr[2] >> 12 & 0xf);
  const tx = k.target.x + k.target.x2, ty = k.target.y + k.target.y2, bgX0 = 32 - tx, bgY0 = 32 - ty;
  const lo = Math.max(0, k.targetYElevation - 32), hi = k.targetYElevation + 32;
  const bufs = k.scanline0.buffers.map((b) => [...b]); let state = k.scanline0.state, src = k.scanline0.srcBuffer, dmaDest = k.scanline0.dmaDest;
  const unfaded = [...k.unfaded0], faded = [...k.faded0]; let rotations = 0, prevFaded = [...k.palette0], prevBg: Record<string, number> = {}, prevState = state, prevSrc = src, prevBufs = bufs.map((b) => [...b]);
  const out: XsRow30[] = [];
  for (let r = 0; r < rows; r += 1) {
    const er = e(r), tasks: XsRow30["tasks"] = [];
    // VBlank of frame r: scanline effect (ScanlineEffect_InitHBlankDmaTransfer) acts on the state left by frame r-1.
    const dmaActive = r > 0 && prevState === 1, dmaBuf = prevSrc;
    if (r > 0) { if (prevState === 3) state = 0; else if (prevState === 1) src ^= 1; }
    // Psychic background: LoadMoveBg at C1 + 19, rotation every 4th SetPsychicBackground_Step, LoadDefaultBg at the restore row.
    if (r === XS.PSY) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = k.psychicPalette[i]!; faded[32 + i] = k.psychicPalette[i]!; }
    if (r >= XS.PSY) { const last = Math.min(er, XS.CLEAR + 19), want = last < 23 ? 0 : Math.floor((last - 23) / 4) + 1;
      while (rotations < want) { const c11 = faded[32 + 11]!; for (let i = 10; i > 0; i -= 1) faded[32 + i + 1] = faded[32 + i]!; faded[32 + 1] = c11; rotations += 1; } }
    if (r === restoreRow) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = k.unfaded0[32 + i]!; faded[32 + i] = k.unfaded0[32 + i]!; }
    if (r === XS.MONBG) for (let i = 0; i < 16; i += 1) { unfaded[monbgBank * 16 + i] = faded[targetObj * 16 + i]!; faded[monbgBank * 16 + i] = faded[targetObj * 16 + i]!; }
    if (r >= XS.PSY && er <= XS.CLEAR + 18) tasks.push({ slot: XS.SLOTS.psy, callback: "SetPsychicBackground_Step", data: data16([0, 0, 0, 0, 0, (er - 19) % 4]) });
    // Fades (bldcnt / bldy registers lag the task by one row: value of step e(r-1)+1).
    const f1 = fadeState(r, XS.FADE1); if (f1 && r < XS.MONBG) tasks.push({ slot: XS.SLOTS.fade1, callback: "Task_FadeToBg", data: data16([3, 0, 0, 0, 0, 0, 0, 0, 0, 0, f1]) });
    const f2 = r >= XS.CLEAR ? (k.phase.lateLag && r === XS.LATE_LAG - 1 ? 2 : fadeState(er, XS.CLEAR)) : 0;   /* T: with the late lag the VBlank cuts the tState 2 -> 3 step (VRAM done, palette + tState one row later) */ if (f2) tasks.push({ slot: XS.SLOTS.restore, callback: "Task_FadeToBg", data: data16([-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, f2]) });
    // Blend in / out (BlendPalette on faded from unfaded, colours 1..15 of the attacker OBJ bank).
    for (const b of XS.BLENDS) { const j = r - b; if (j < 0 || j > 23) continue; const c = j <= 11 ? j + 1 : 23 - j;
      for (let i = 1; i < 16; i += 1) faded[attObj * 16 + i] = blendTo(unfaded[attObj * 16 + i]!, c, 891);
      if (j < 23) tasks.push({ slot: XS.SLOTS.blend, callback: "AnimTask_BlendMonInAndOut_Step", data: data16([attObj * 16 + 1, 891, c, 12, 0, 1, j >= 11 ? 1 : 0, 1]) }); }
    // Distortion (scanline): init writes the base, then one step per row; case 1 sets state 3, case 2 destroys.
    for (let si = 0; si < 3; si += 1) { const c = XS.STAGES[si]!, j = r - c; if (j < 0 || j > 24) continue;
      const [step, shift, ph] = si === 2 ? [4, 4, 0] : [2, 5, si === 0 ? 64 : 192];
      if (j === 0) { for (let i = lo; i <= lo + 64; i += 1) { bufs[0]![i] = bgX0; bufs[1]![i] = bgX0; } state = 1; dmaDest = targetOnBg1 ? 0x4000014 : 0x4000018; }
      if (j <= 23) { let s = ph; for (let i = lo; i <= hi; i += 1) { let v = sine(s) >> shift; if (v > 0) v += j & 3; else if (v < 0) v -= j & 3; bufs[0]![i] = bgX0 + v; bufs[1]![i] = bgX0 + v; s += step; } }
      if (j === 24) state = 3;
      tasks.push({ slot: XS.SLOTS.distortion, callback: "AnimTask_ExtrasensoryDistortion_Step",
        data: data16([j <= 23 ? (j === 23 ? 1 : 0) : 2, Math.min(24, j + 1), 0, 0, 0, 0, 0, 0, 0, 0, bgX0, step, shift, ph, lo, hi]) }); }
    // Clone task.
    let clone: XsRow30["clone"] = null;
    { const j = r - XS.CLONE; if (j >= 0 && j <= 24) { const st = cloneStep(j, k.attackerYDelta);
      tasks.push({ slot: XS.SLOTS.clone, callback: "AnimTask_TransparentCloneGrowAndShrink_Step", data: data16([st.state, st.angle, st.scale, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, k.attacker.slot, k.cloneMatrix, k.cloneSlot]) });
      if (j <= 23) clone = { x2: 0, y2: st.y2, matrix: st.scale }; } }
    if (r >= XS.MONBG && r <= XS.CLEAR_END) tasks.push({ slot: XS.SLOTS.monbg, callback: "Task_UpdateMonBg", data: data16([k.target.slot, tx, ty, bgX0, bgY0, k.side === "player" ? 0 : 1, k.targetBattler]) });
    if (r >= XS.CLEAR && r <= XS.CLEAR_END) tasks.push({ slot: XS.SLOTS.clear, callback: "Task_ClearMonBg", data: data16([0, r === XS.CLEAR ? 1 : 2, k.targetBattler]) });
    // battleBg + registers.
    const bb: Record<string, number> = { gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0, gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: 0 };
    if (r >= XS.MONBG && r <= XS.CLEAR_END) { bb[bgx] = bgX0; bb[bgy] = bgY0; }
    const reg: Record<string, number> = { ...(r === 0 ? k.registers0 : k.registersBody) };
    const fr = r < XS.CLEAR ? fadeY(r, XS.FADE1) : r === XS.CLEAR ? { cnt: 0, y: 0 } : fadeY(e(r - 1) + 1, XS.CLEAR);
    reg.bldcnt = fr.cnt; reg.bldy = fr.y; reg.bldalpha = 0;
    if (r >= XS.STAGES[0] && r < XS.CLEAR) { reg.bldcnt = 0x3f40; reg.bldalpha = 0x080c; }
    if (r >= XS.CNT) reg[`${bgName}cnt`] = (k.registers0[`${bgName}cnt`]! & ~0xc003 | 0x4000 | 2) & 0xffff;
    if (r >= 1) { reg[`${bgName}hofs`] = (dmaActive ? prevBufs[dmaBuf]![160]! : (prevBg[bgx] ?? 0)) & 0x1ff; reg[`${bgName}vofs`] = (prevBg[bgy] ?? 0) & 0x1ff; }
    // Hardware palette = previous faded, except the monbg bank (copied straight to hardware).
    const hw = r === 0 ? [...k.palette0] : [...prevFaded]; if (r >= XS.MONBG) for (let i = 0; i < 16; i += 1) hw[monbgBank * 16 + i] = faded[monbgBank * 16 + i]!;
    out.push({ registers: reg, battleBg: bb, hardwarePalette: hw, fadedPalette: [...faded], unfadedPalette: [...unfaded],
      tasks: tasks.sort((a, b) => a.slot - b.slot), scanline: { state, srcBuffer: src, dmaDest, buffers: bufs.map((b) => [...b]) },
      vram: XS.VRAM_EDGES.filter((v) => v <= r).length, clone });
    prevFaded = [...faded]; prevBg = bb; prevState = state; prevSrc = src; prevBufs = bufs.map((b) => [...b]);
  }
  return out;
}
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
/** Hardware OAM + matrices of row `row` (>= 1): BuildOamBuffer of frame row-1 runs before RunTasks, so task-driven clone fields come from step row-2. */
export function assembleExtrasensoryHardwareOam(row: number, k: XsKnown30, spriteOrderAt: (state: number) => readonly number[]): { oam: string[]; matrices: number[][] } {
  const attrs = new Map<number, Attr>(), matrices = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
  attrs.set(k.attacker.slot, k.attacker.attr);
  if (row < XS.MONBG + 2 || row > XS.CLEAR) attrs.set(k.target.slot, k.target.attr);
  if (row >= XS.CLONE + 1 && row <= XS.CLONE + 25) {
    const j = row - 2 - XS.CLONE, st = j < 0 ? { scale: 256, y2: 0 } : cloneStep(j, k.attackerYDelta), a = k.attacker.attr;
    attrs.set(k.cloneSlot, [a[0] & 0xc000 | 0x0700 | (k.attacker.y + st.y2 - 64) & 0xff, a[1] & 0xc000 | k.cloneMatrix << 9 | (k.attacker.x - 64) & 0x1ff, a[2]]);
    matrices[k.cloneMatrix] = [st.scale, 0, 0, st.scale];
  }
  const list: Attr[] = []; let health = false;
  for (const slot of spriteOrderAt(row - 1)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const a = attrs.get(slot); if (a) list.push(a); }
  while (list.length < 128) list.push(k.dummyAttr);
  return { oam: list.map((a, i) => hex4(a[0]) + hex4(a[1]) + hex4(a[2]) + hex4(matrices[i >> 2]![i & 3]!)), matrices };
}
