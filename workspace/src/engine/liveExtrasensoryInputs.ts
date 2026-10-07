/**
 * MOVE_EXTRASENSORY (326) live inputs (docs/next-adapters-prep30.md s1 / s3, D4c faithful timing): the non-OAM per-row inputs of the
 * EXTRASENSORY renderer branch from the source-derived prep30 model, ported 1:1 from tools/integration/prep30ExtrasensoryModel.ts
 * extrasensoryModel (Move_EXTRASENSORY + SetPsychicBackground / UnsetPsychicBackground): registers (two Task_FadeToBg C1 = 1 / C2 = 120,
 * setalpha 12,8, the monbg BGnCNT / HOFS / VOFS incl. the last HBlank-DMA word on distortion frames), gBattle_BGn, the hardware / faded /
 * unfaded palette (psychic BG load / rotation / restore, the monbg copy of the target OBJ bank, BlendMonInAndOut x2), the live tasks, the
 * scanline effect (state / srcBuffer / dmaDest / both 320-word buffers: the entry buffers + the three ExtrasensoryDistortion programs over
 * GetBattlerYCoordWithElevation(target) -+ 32), the VRAM-handle label and the clone y2. Production values only. Never a capture row.
 *
 * The entry scanline buffers are HISTORY (H): the caller passes the first-body battle-intro residue (liveMoveAnimation.ts gates the body on
 * the battle's first animation unit, so no earlier scanline body can have left other buffers).
 * One CPU-phase (D4) parameter the source does not determine here: the optional lag at task row 142 (src/engine/liveMoveTimingPolicy.ts).
 */
export const LIVE_EXTRASENSORY = Object.freeze({ FADE1: 1, PSY: 20, MONBG: 39, CNT: 40, STAGES: [42, 68, 94] as const, BLENDS: [42, 68] as const, CLONE: 94,
  CLEAR: 120, CLEAR_END: 122, TASK_LAGS: [122, 123] as const, LATE_LAG: 142, BODY: 160,
  SLOTS: { fade1: 0, psy: 1, monbg: 2, blend: 0, distortion: 3, clone: 0, clear: 0, restore: 3 }, VRAM_EDGES: [20, 40, 122, 124, 141] as const });
export interface LiveExtrasensoryKnown {
  readonly side: "player" | "opponent";
  readonly registers0: Readonly<Record<string, number>>;
  readonly palette0: readonly number[]; readonly faded0: readonly number[]; readonly unfaded0: readonly number[];
  readonly psychicPalette: readonly number[];
  readonly attackerSlot: number; readonly attackerObjBank: number;
  readonly target: Readonly<{ slot: number; x: number; y: number; x2: number; y2: number; objBank: number }>;
  readonly targetBattler: number;
  readonly cloneSlot: number; readonly cloneMatrix: number;
  readonly cloneStep: (j: number) => { angle: number; state: number; scale: number; y2: number };
  readonly targetYElevation: number;
  readonly scanline0: Readonly<{ state: number; srcBuffer: number; dmaDest: number; buffers: readonly (readonly number[])[] }>;
  readonly lateLag: boolean;
  readonly sine: readonly number[];
}
export interface LiveExtrasensoryRow {
  registers: Record<string, number>; battleBg: Record<string, number>;
  hardwarePalette: number[]; fadedPalette: number[]; unfadedPalette: number[];
  tasks: { slot: number; callback: string; data: number[] }[];
  scanline: { state: number; srcBuffer: number; dmaDest: number; buffers: [number[], number[]] };
  vram: number; clone: { x2: number; y2: number; matrix: number } | null;
}
const XS = LIVE_EXTRASENSORY;
const data16 = (v: readonly number[]) => [...v, ...Array(16).fill(0)].slice(0, 16);
const blendTo = (c: number, y: number, to: number) => { const ch = (s: number) => { const a = c >> s & 31, b = to >> s & 31; return (a + ((b - a) * y >> 4)) & 31; }; return ch(0) | ch(5) << 5 | ch(10) << 10; };
const fadeY = (e: number, c: number) => (e < c + 1 || e >= c + 37 ? { cnt: 0, y: 0 } : { cnt: 0xe8, y: e <= c + 1 ? 0 : e <= c + 17 ? e - c - 1 : e <= c + 20 ? 16 : 16 - (e - (c + 20)) });
const fadeState = (e: number, c: number) => (e < c || e >= c + 37 ? 0 : e <= c + 17 ? 1 : e === c + 18 ? 2 : 3);
/** Body rows (activation .. first inactive, inclusive): 161, 162 with the late lag. */
export const liveExtrasensoryRowCount = (lateLag: boolean): number => XS.BODY + 1 + (lateLag ? 1 : 0);
export function liveExtrasensoryRows(k: LiveExtrasensoryKnown): LiveExtrasensoryRow[] {
  // gSineTable[320]: index 320 reads the following zero word.
  const sine = (i: number) => (i < 320 ? k.sine[i & 0xff]! : 0);
  const rows = liveExtrasensoryRowCount(k.lateLag), lags = [...XS.TASK_LAGS, ...(k.lateLag ? [XS.LATE_LAG] : [])], e = (r: number) => r - lags.filter((l) => l <= r).length;
  const restoreRow = k.lateLag ? XS.LATE_LAG : XS.VRAM_EDGES[4];
  const targetOnBg1 = k.side === "player", bgx = targetOnBg1 ? "gBattle_BG1_X" : "gBattle_BG2_X", bgy = targetOnBg1 ? "gBattle_BG1_Y" : "gBattle_BG2_Y";
  const bgName = targetOnBg1 ? "bg1" : "bg2", monbgBank = targetOnBg1 ? 8 : 9, targetObj = 16 + k.target.objBank, attObj = 16 + k.attackerObjBank;
  const tx = k.target.x + k.target.x2, ty = k.target.y + k.target.y2, bgX0 = 32 - tx, bgY0 = 32 - ty;
  const lo = Math.max(0, k.targetYElevation - 32), hi = k.targetYElevation + 32;
  const bufs = k.scanline0.buffers.map((b) => [...b]); let state = k.scanline0.state, src = k.scanline0.srcBuffer, dmaDest = k.scanline0.dmaDest;
  const unfaded = [...k.unfaded0], faded = [...k.faded0]; let rotations = 0, prevFaded = [...k.palette0], prevBg: Record<string, number> = {}, prevState = state, prevSrc = src, prevBufs = bufs.map((b) => [...b]);
  const out: LiveExtrasensoryRow[] = [];
  for (let r = 0; r < rows; r += 1) {
    const er = e(r), tasks: LiveExtrasensoryRow["tasks"] = [];
    // VBlank of frame r: the scanline effect acts on the state left by frame r-1.
    const dmaActive = r > 0 && prevState === 1, dmaBuf = prevSrc;
    if (r > 0) { if (prevState === 3) state = 0; else if (prevState === 1) src ^= 1; }
    if (r === XS.PSY) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = k.psychicPalette[i]!; faded[32 + i] = k.psychicPalette[i]!; }
    if (r >= XS.PSY) { const last = Math.min(er, XS.CLEAR + 19), want = last < 23 ? 0 : Math.floor((last - 23) / 4) + 1;
      while (rotations < want) { const c11 = faded[32 + 11]!; for (let i = 10; i > 0; i -= 1) faded[32 + i + 1] = faded[32 + i]!; faded[32 + 1] = c11; rotations += 1; } }
    if (r === restoreRow) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = k.unfaded0[32 + i]!; faded[32 + i] = k.unfaded0[32 + i]!; }
    if (r === XS.MONBG) for (let i = 0; i < 16; i += 1) { unfaded[monbgBank * 16 + i] = faded[targetObj * 16 + i]!; faded[monbgBank * 16 + i] = faded[targetObj * 16 + i]!; }
    if (r >= XS.PSY && er <= XS.CLEAR + 18) tasks.push({ slot: XS.SLOTS.psy, callback: "SetPsychicBackground_Step", data: data16([0, 0, 0, 0, 0, (er - 19) % 4]) });
    const f1 = fadeState(r, XS.FADE1); if (f1 && r < XS.MONBG) tasks.push({ slot: XS.SLOTS.fade1, callback: "Task_FadeToBg", data: data16([3, 0, 0, 0, 0, 0, 0, 0, 0, 0, f1]) });
    // T: with the late lag the VBlank cuts the tState 2 -> 3 step (VRAM done, palette + tState one row later).
    const f2 = r >= XS.CLEAR ? (k.lateLag && r === XS.LATE_LAG - 1 ? 2 : fadeState(er, XS.CLEAR)) : 0;
    if (f2) tasks.push({ slot: XS.SLOTS.restore, callback: "Task_FadeToBg", data: data16([-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, f2]) });
    for (const b of XS.BLENDS) { const j = r - b; if (j < 0 || j > 23) continue; const c = j <= 11 ? j + 1 : 23 - j;
      for (let i = 1; i < 16; i += 1) faded[attObj * 16 + i] = blendTo(unfaded[attObj * 16 + i]!, c, 891);
      if (j < 23) tasks.push({ slot: XS.SLOTS.blend, callback: "AnimTask_BlendMonInAndOut_Step", data: data16([attObj * 16 + 1, 891, c, 12, 0, 1, j >= 11 ? 1 : 0, 1]) }); }
    for (let si = 0; si < 3; si += 1) { const c = XS.STAGES[si]!, j = r - c; if (j < 0 || j > 24) continue;
      const [step, shift, ph] = si === 2 ? [4, 4, 0] : [2, 5, si === 0 ? 64 : 192];
      if (j === 0) { for (let i = lo; i <= lo + 64; i += 1) { bufs[0]![i] = bgX0; bufs[1]![i] = bgX0; } state = 1; dmaDest = targetOnBg1 ? 0x4000014 : 0x4000018; }
      if (j <= 23) { let s = ph; for (let i = lo; i <= hi; i += 1) { let v = sine(s) >> shift; if (v > 0) v += j & 3; else if (v < 0) v -= j & 3; bufs[0]![i] = bgX0 + v; bufs[1]![i] = bgX0 + v; s += step; } }
      if (j === 24) state = 3;
      tasks.push({ slot: XS.SLOTS.distortion, callback: "AnimTask_ExtrasensoryDistortion_Step",
        data: data16([j <= 23 ? (j === 23 ? 1 : 0) : 2, Math.min(24, j + 1), 0, 0, 0, 0, 0, 0, 0, 0, bgX0, step, shift, ph, lo, hi]) }); }
    let clone: LiveExtrasensoryRow["clone"] = null;
    { const j = r - XS.CLONE; if (j >= 0 && j <= 24) { const st = k.cloneStep(j);
      tasks.push({ slot: XS.SLOTS.clone, callback: "AnimTask_TransparentCloneGrowAndShrink_Step", data: data16([st.state, st.angle, st.scale, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, k.attackerSlot, k.cloneMatrix, k.cloneSlot]) });
      if (j <= 23) clone = { x2: 0, y2: st.y2, matrix: st.scale }; } }
    if (r >= XS.MONBG && r <= XS.CLEAR_END) tasks.push({ slot: XS.SLOTS.monbg, callback: "Task_UpdateMonBg", data: data16([k.target.slot, tx, ty, bgX0, bgY0, k.side === "player" ? 0 : 1, k.targetBattler]) });
    if (r >= XS.CLEAR && r <= XS.CLEAR_END) tasks.push({ slot: XS.SLOTS.clear, callback: "Task_ClearMonBg", data: data16([0, r === XS.CLEAR ? 1 : 2, k.targetBattler]) });
    const bb: Record<string, number> = { gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0, gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: 0 };
    if (r >= XS.MONBG && r <= XS.CLEAR_END) { bb[bgx] = bgX0; bb[bgy] = bgY0; }
    const reg: Record<string, number> = { ...k.registers0 };
    const fr = r < XS.CLEAR ? fadeY(r, XS.FADE1) : r === XS.CLEAR ? { cnt: 0, y: 0 } : fadeY(e(r - 1) + 1, XS.CLEAR);
    reg.bldcnt = fr.cnt; reg.bldy = fr.y; reg.bldalpha = 0;
    if (r >= XS.STAGES[0] && r < XS.CLEAR) { reg.bldcnt = 0x3f40; reg.bldalpha = 0x080c; }
    if (r >= XS.CNT) reg[`${bgName}cnt`] = (k.registers0[`${bgName}cnt`]! & ~0xc003 | 0x4000 | 2) & 0xffff;
    // BGnHOFS = gBattle_BGn one row later; during HBlank-DMA frames the last DMA'd word (buffer[160]) stays in the register.
    if (r >= 1) { reg[`${bgName}hofs`] = (dmaActive ? prevBufs[dmaBuf]![160]! : (prevBg[bgx] ?? 0)) & 0x1ff; reg[`${bgName}vofs`] = (prevBg[bgy] ?? 0) & 0x1ff; }
    const hw = r === 0 ? [...k.palette0] : [...prevFaded]; if (r >= XS.MONBG) for (let i = 0; i < 16; i += 1) hw[monbgBank * 16 + i] = faded[monbgBank * 16 + i]!;
    out.push({ registers: reg, battleBg: bb, hardwarePalette: hw, fadedPalette: [...faded], unfadedPalette: [...unfaded],
      tasks: tasks.sort((a, b) => a.slot - b.slot), scanline: { state, srcBuffer: src, dmaDest, buffers: [[...bufs[0]!], [...bufs[1]!]] },
      vram: XS.VRAM_EDGES.filter((v) => v <= r).length, clone });
    prevFaded = [...faded]; prevBg = bb; prevState = state; prevSrc = src; prevBufs = bufs.map((b) => [...b]);
  }
  return out;
}
