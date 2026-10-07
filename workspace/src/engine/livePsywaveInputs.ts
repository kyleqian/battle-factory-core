/**
 * MOVE_PSYWAVE (149) live inputs (docs/next-adapters-prep30.md s2 / s3, D4c faithful timing): the non-OAM per-row inputs of the PSYWAVE
 * renderer branch from the source-derived prep30 model, ported 1:1 from tools/integration/prep30PsywaveModel.ts psywaveModel
 * (Move_PSYWAVE, battle_anim_scripts.s): registers (bldcnt / bldy of the two Task_FadeToBg, C1 = 4, C2 = 165), the hardware / faded /
 * unfaded palette (BLUE_RING bank at row 1, psychic BG load row 23 / SetPsychicBackground_Step rotation of colours 1..11 every 4th
 * step / restore), the target-bank AnimTask_BlendColorCycle y (RGB(31,18,31), up / down every 3 rows from the arm rows), the modelled task
 * records and the VRAM-handle label. Production values only (the asset palette composite, the psychic BG / BLUE_RING palettes, known-entry
 * constants). The OAM rows come from liveMoveOamAssembler.ts livePsywaveHardwareOamRows. Never a capture row.
 *
 * One CPU-phase (D4) parameter the source does not determine (prep30 s0.2 T): the optional late lag at task row 185 (VRAM / palette split),
 * from src/engine/liveMoveTimingPolicy.ts. The blend-cycle arm rows [69, 93, 117, 141] are a measured constant (M), equal in all 6 windows.
 */
export const LIVE_PSYWAVE = Object.freeze({ CYCLE_ARMS: [69, 93, 117, 141] as const, CYCLE_COLOR: 31 | 18 << 5 | 31 << 10, FADE1: 1 + 3, PSY: 23, TIMER: 42,
  C2: 165, LATE_LAG: 185, BODY: 203, SLOTS: { fade: 0, psy: 1, timer: 0 }, VRAM_EDGES: [23, 184] as const });
export interface LivePsywaveKnown {
  readonly registers0: Readonly<Record<string, number>>;
  readonly palette0: readonly number[]; readonly faded0: readonly number[]; readonly unfaded0: readonly number[];
  readonly psychicPalette: readonly number[]; readonly ringPalette: readonly number[];
  readonly ringBank: number;
  /** The target battler's OBJ palette bank (attr2 >> 12). */
  readonly targetObjBank: number;
  readonly lateLag: boolean;
}
export interface LivePsywaveRow { registers: Record<string, number>; hardwarePalette: number[]; fadedPalette: number[]; unfadedPalette: number[];
  tasks: { slot: number; callback: string; data: number[] }[]; vram: number }
const PW = LIVE_PSYWAVE;
const blendTo = (c: number, y: number, to: number) => { const ch = (sh: number) => { const a = c >> sh & 31, b = to >> sh & 31; return (a + ((b - a) * y >> 4)) & 31; }; return ch(0) | ch(5) << 5 | ch(10) << 10; };
/** Target-bank blend amount at row r (M arm rows; up blends 2..12, down blends 10..0, one step of 2 every 3 rows, hold until the next arm). */
const cycleY = (r: number): number => { let y = 0; PW.CYCLE_ARMS.forEach((a, i) => { if (r < a) return; const j = Math.floor((r - a) / 3); y = i % 2 === 0 ? Math.min(12, 2 * (j + 1)) : Math.max(0, 10 - 2 * j); }); return y; };
const data16 = (v: readonly number[]) => [...v, ...Array(16).fill(0)].slice(0, 16);
const fadeY = (e: number, c: number) => (e < c + 1 || e >= c + 37 ? { cnt: 0, y: 0 } : { cnt: 0xe8, y: e <= c + 1 ? 0 : e <= c + 17 ? e - c - 1 : e <= c + 20 ? 16 : 16 - (e - (c + 20)) });
const fadeState = (e: number, c: number) => (e < c || e >= c + 37 ? 0 : e <= c + 17 ? 1 : e === c + 18 ? 2 : 3);
/** Body rows (activation .. first inactive, inclusive): 204, 205 with the late lag. */
export const livePsywaveRowCount = (lateLag: boolean): number => PW.BODY + 1 + (lateLag ? 1 : 0);
export function livePsywaveRows(k: LivePsywaveKnown): LivePsywaveRow[] {
  const rows = livePsywaveRowCount(k.lateLag), lags = k.lateLag ? [PW.LATE_LAG] : [], e = (r: number) => r - lags.filter((l) => l <= r).length;
  const restoreRow = k.lateLag ? PW.LATE_LAG : PW.VRAM_EDGES[1];
  const unfaded = [...k.unfaded0], faded = [...k.faded0]; let rotations = 0, prevFaded = [...k.palette0];
  const out: LivePsywaveRow[] = [];
  for (let r = 0; r < rows; r += 1) {
    const er = e(r), tasks: LivePsywaveRow["tasks"] = [];
    if (r === 1) for (let i = 0; i < 16; i += 1) { unfaded[(16 + k.ringBank) * 16 + i] = k.ringPalette[i]!; faded[(16 + k.ringBank) * 16 + i] = k.ringPalette[i]!; }
    if (r === PW.PSY) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = k.psychicPalette[i]!; faded[32 + i] = k.psychicPalette[i]!; }
    if (r >= PW.PSY) { const last = Math.min(er, PW.C2 + 19), first = PW.PSY + 3, want = last < first ? 0 : Math.floor((last - first) / 4) + 1;
      while (rotations < want) { const c11 = faded[32 + 11]!; for (let i = 10; i > 0; i -= 1) faded[32 + i + 1] = faded[32 + i]!; faded[32 + 1] = c11; rotations += 1; } }
    if (r === restoreRow) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = k.unfaded0[32 + i]!; faded[32 + i] = k.unfaded0[32 + i]!; }
    { const tb = (16 + k.targetObjBank) * 16, y = cycleY(r); for (let i = 0; i < 16; i += 1) faded[tb + i] = y ? blendTo(unfaded[tb + i]!, y, PW.CYCLE_COLOR) : unfaded[tb + i]!; }
    if (r >= PW.PSY && er <= PW.C2 + 18) tasks.push({ slot: PW.SLOTS.psy, callback: "SetPsychicBackground_Step", data: data16([0, 0, 0, 0, 0, (er - PW.PSY + 1) % 4]) });
    const f1 = fadeState(r, PW.FADE1); if (f1 && r < PW.TIMER) tasks.push({ slot: PW.SLOTS.fade, callback: "Task_FadeToBg", data: data16([3, 0, 0, 0, 0, 0, 0, 0, 0, 0, f1]) });
    const f2 = r >= PW.C2 ? (k.lateLag && r === PW.LATE_LAG - 1 ? 2 : fadeState(er, PW.C2)) : 0;
    if (f2) tasks.push({ slot: PW.SLOTS.fade, callback: "Task_FadeToBg", data: data16([-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, f2]) });
    if (r >= PW.TIMER && r <= PW.TIMER + 98) tasks.push({ slot: PW.SLOTS.timer, callback: "AnimTask_RunSinAnimTimer", data: data16([PW.TIMER + 99 - r]) });
    const reg: Record<string, number> = { ...k.registers0 };
    const fr = r < PW.C2 ? fadeY(r, PW.FADE1) : fadeY(e(r - 1) + 1, PW.C2); reg.bldcnt = fr.cnt; reg.bldy = fr.y;
    const hw = r === 0 ? [...k.palette0] : [...prevFaded];
    out.push({ registers: reg, hardwarePalette: hw, fadedPalette: [...faded], unfadedPalette: [...unfaded], tasks: tasks.sort((a, b) => a.slot - b.slot),
      vram: PW.VRAM_EDGES.filter((v) => v <= r).length });
    prevFaded = [...faded];
  }
  return out;
}
