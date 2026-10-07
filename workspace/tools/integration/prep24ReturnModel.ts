/**
 * prep24: source-derived model of the non-OAM per-age inputs of the MOVE_RETURN (strongest) renderer branch: registers (21), battleBg, hardwarePalette
 * (+ unfadedPalette), live tasks.  OAM / matrices: prep24ReturnAssembler.ts.  Row / frame conventions as prep24MegahornModel.ts.
 */
import { RETURN_BLEND, RETURN_IMPACTS, RETURN_TRACES, returnAllocations, type ReturnKnown24 } from "./prep24ReturnAssembler.ts";
export type Side = "player" | "opponent";
export interface ReturnKnownInputs24 {
  readonly attackerSide: Side; readonly rows: number;
  readonly registers0: Readonly<Record<string, number>>; readonly bodyWin: Readonly<{ win0h: number; win0v: number }>;
  readonly palette0: readonly number[]; readonly unfaded0: readonly number[];
  readonly targetSlot: number; readonly targetBattler: number;
  readonly targetIdle: Readonly<{ x: number; y: number; x2: number; y2: number }>;
  readonly impactBank: number; readonly impactPalette: readonly number[];
  readonly phase: Readonly<{ monbgCntRow: number }>;       // H class: VBlank frame phase of the monbg BGnCNT write (4 | 5)
  readonly oamKnown: ReturnKnown24;                         // allocator inputs of the assembler (trace clone sprite slots)
}
export interface ReturnRow24 {
  readonly registers: Record<string, number>; readonly battleBg: Record<string, number>;
  readonly hardwarePalette: number[]; readonly unfadedPalette: number[];
  readonly tasks: { slot: number; callback: string; data: number[] }[];
  readonly target: { x2: number; y2: number };
}
const MONBG = 4, CLEAR = 277, SHAKES = [[67, 8, 6], [101, 8, 6], [120, 8, 6], [142, 8, 6], [157, 8, 6], [172, 8, 6], [187, 8, 6], [202, 8, 6], [217, 24, 8]] as const;   // [start, reps, x]
const blendTo = (c: number, y: number, to: number) => { const ch = (s: number) => { const a = c >> s & 31, b = to >> s & 31; return (a + ((b - a) * y >> 4)) & 31; }; return ch(0) | ch(5) << 5 | ch(10) << 10; };
const lowestFree = (used: Set<number>) => { let s = 0; while (used.has(s)) s += 1; return s; };
export function returnModel(k: ReturnKnownInputs24): ReturnRow24[] {
  const n = k.rows, side = k.attackerSide, monbg = side === "player" ? "bg1" : "bg2", monbgBank = side === "player" ? 8 : 9, objBank = 16 + k.targetBattler;
  const targetX = k.targetIdle.x + k.targetIdle.x2, targetY = k.targetIdle.y + k.targetIdle.y2, bgX0 = 32 - targetX, bgY0 = 32 - targetY;
  // --- task schedule: lowest-free slots in script creation order (UpdateMonBg = slot 1 from MONBG; GetReturnPowerLevel is a transient slot-0 task) ---
  type T = { kind: "shake" | "trace" | "update" | "clear"; first: number; last: number; slot: number; idx: number };
  const tasks: T[] = [{ kind: "update", first: MONBG, last: CLEAR + 2, slot: 1, idx: 0 }, { kind: "clear", first: CLEAR, last: CLEAR + 2, slot: 0, idx: 0 }];
  const created: { f: number; phase: number; kind: "shake" | "trace"; idx: number; life: number }[] = [];
  SHAKES.forEach(([f, reps], idx) => created.push({ f, phase: 1, kind: "shake", idx, life: 2 * (reps - 1) }));
  RETURN_TRACES.forEach((f, idx) => created.push({ f, phase: f === 120 && idx === 0 ? 0 : 2, kind: "trace", idx, life: 6 }));   // the first trace task of the 120 pair is created before the dip / splat / shake
  created.sort((a, b) => a.f - b.f || a.phase - b.phase || a.idx - b.idx);
  const live: T[] = [tasks[0]!];
  for (const c of created) { const used = new Set<number>(live.filter((t) => t.last >= c.f).map((t) => t.slot)); const t: T = { kind: c.kind, first: c.f, last: c.f + (c.kind === "shake" ? c.life : 5), slot: lowestFree(used), idx: c.idx }; live.push(t); tasks.push(t); }
  // --- target x2 (AnimTask_ShakeMon(target, x, 0, reps, 1): x2 = x at creation, creation call + RunTasks toggle) ---
  const x2s: number[] = []; let x2 = k.targetIdle.x2; const shakeData: (number[] | null)[] = new Array(n).fill(null).map(() => null);
  const active: { start: number; data: number[] }[] = [];
  for (let f = 0; f < n; f += 1) {
    for (const [i, [s, reps, x]] of SHAKES.entries()) if (f === s) { x2 = x; active.push({ start: s, data: [k.targetSlot, reps, 1, 1, x, 0] }); void i; }
    for (const a of [...active]) { const d = a.data;     // creation call (data[3] != 0 -> --) only in the creation frame, then RunTasks
      if (f === a.start) d[3] -= 1;
      if (d[3] === 0) { x2 = x2 === 0 ? d[4]! : 0; d[3] = d[2]!; if (--d[1] === 0) { x2 = 0; active.splice(active.indexOf(a), 1); } } else if (f !== a.start) d[3] -= 1; }
    x2s.push(x2); shakeData[f] = null; void shakeData;
  }
  const shakeAt = new Map<number, number[]>();
  { const act: { start: number; data: number[]; key: number }[] = []; let xx = k.targetIdle.x2; void xx;
    for (let f = 0; f < n; f += 1) {
      for (const [, [s, reps, x]] of SHAKES.entries()) if (f === s) act.push({ start: s, data: [k.targetSlot, reps, 1, 1, x, 0], key: s });
      for (const a of [...act]) { const d = a.data; if (f === a.start) d[3] -= 1;
        if (d[3] === 0) { d[3] = d[2]!; if (--d[1] === 0) { act.splice(act.indexOf(a), 1); continue; } } else if (f !== a.start) d[3] -= 1;
        shakeAt.set(f * 1000 + a.key, [...d]); } } }
  const traceSlots = returnAllocations(k.oamKnown).filter((l) => l.kind === "trace").sort((a, b) => a.idx - b.idx).map((l) => l.slot!);
  const rows: ReturnRow24[] = [];
  const faded = [...k.palette0], unfaded = [...k.unfaded0], impactBase = k.impactBank * 16;
  const blendY = (r: number) => { const [b1, b2] = RETURN_BLEND; return r >= b1 + 6 && r < b2 + 2 ? 6 : r >= b1 + 4 && r < b1 + 6 ? 4 : r >= b1 + 2 && r < b1 + 4 ? 2 : r >= b2 + 6 ? 0 : r >= b2 + 4 ? 2 : r >= b2 + 2 ? 4 : 0; };
  let prevBg: Record<string, number> = {};
  for (let r = 0; r < n; r += 1) {
    const reg: Record<string, number> = { ...k.registers0 };
    const bb: Record<string, number> = { gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0, gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: 0 };
    if (r === 1) for (let i = 0; i < 16; i += 1) unfaded[impactBase + i] = k.impactPalette[i]!;
    if (r === 2) for (let i = 0; i < 16; i += 1) faded[impactBase + i] = k.impactPalette[i]!;
    const y = blendY(r), by = (r >= RETURN_BLEND[0] + 2 && r < RETURN_BLEND[1] + 2) || r >= RETURN_BLEND[1] + 2 ? y : 0;
    for (const b of [1, 2, 3]) for (let i = 0; i < 16; i += 1) faded[b * 16 + i] = by ? blendTo(unfaded[b * 16 + i]!, by, 0) : unfaded[b * 16 + i]!;
    if (r >= MONBG) { for (let i = 0; i < 16; i += 1) faded[monbgBank * 16 + i] = faded[objBank * 16 + i]!; if (r === MONBG) for (let i = 0; i < 16; i += 1) unfaded[monbgBank * 16 + i] = faded[objBank * 16 + i]!; }
    if (r >= MONBG && r < CLEAR + 3) { const x = targetX - (k.targetIdle.x + x2s[r]!);
      bb[monbg === "bg1" ? "gBattle_BG1_X" : "gBattle_BG2_X"] = x + bgX0; bb[monbg === "bg1" ? "gBattle_BG1_Y" : "gBattle_BG2_Y"] = bgY0 + (targetY - (k.targetIdle.y + k.targetIdle.y2)); }
    if (r >= 1) { reg.win0h = k.bodyWin.win0h; reg.win0v = k.bodyWin.win0v; }
    const cnt = (v: number) => (v & ~0xc003 | 0x4000 | 2) & 0xffff;
    if (r >= k.phase.monbgCntRow) reg[`${monbg}cnt`] = cnt(k.registers0[`${monbg}cnt`]!);
    const early = r === MONBG && k.phase.monbgCntRow === MONBG;
    if (r >= 1) { const src = early ? bb : prevBg;
      reg[`${monbg}hofs`] = src[monbg === "bg1" ? "gBattle_BG1_X" : "gBattle_BG2_X"]! & 0x1ff; reg[`${monbg}vofs`] = src[monbg === "bg1" ? "gBattle_BG1_Y" : "gBattle_BG2_Y"]! & 0x1ff; }
    if (r >= 7 && r < CLEAR) { reg.bldcnt = 16192; reg.bldalpha = 2060; }
    const out: ReturnRow24["tasks"] = [];
    for (const t of [...tasks].sort((a, b) => a.slot - b.slot)) { if (r < t.first || r > t.last) continue;
      if (t.kind === "update") out.push({ slot: 1, callback: "Task_UpdateMonBg", data: [k.targetSlot, targetX, targetY, bgX0, bgY0, side === "player" ? 0 : 1, k.targetBattler, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
      if (t.kind === "clear") out.push({ slot: t.slot, callback: "Task_ClearMonBg", data: [0, r === CLEAR ? 1 : 2, k.targetBattler, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
      if (t.kind === "shake") { const d = shakeAt.get(r * 1000 + SHAKES[t.idx]![0]); if (d) out.push({ slot: t.slot, callback: "AnimTask_ShakeMon_Step", data: [...d, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }); }
      if (t.kind === "trace") out.push({ slot: t.slot, callback: "AnimTask_TraceMonBlended_Step", data: [0, 4, 4, 5, 0, 1, traceSlots[t.idx]!, 0, 0, 0, 0, 0, 0, 0, 0, 0] }); }
    rows.push({ registers: reg, battleBg: bb, hardwarePalette: faded.slice(), unfadedPalette: unfaded.slice(), tasks: out, target: { x2: x2s[r]!, y2: 0 } });
    prevBg = bb;
  }
  void RETURN_IMPACTS;
  return rows;
}
