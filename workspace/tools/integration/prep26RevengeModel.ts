/**
 * prep26: source-derived model of the non-OAM per-age inputs of the MOVE_REVENGE renderer branch: registers (21), battleBg, hardware / faded / unfaded
 * palette, live tasks, attacker / target x2.  OAM + matrices: prep26RevengeAssembler.ts.  Row conventions as prep24 (Return): row = snapshot after
 * frame `row`; BGnHOFS/VOFS lag gBattle_BGn_* by one row; hardware palette = faded one row later (except the monbg copy); a task created by
 * createvisualtask runs once at creation and once in RunTasks.  Script (Move_REVENGE): monbg 4, setalpha 12,8 at 7, small scratch 7 (13 rows), blend_color_cycle
 * (BeginNormalPaletteFade ATTACKER red, delay 0, 4 blends 2<->8) armed rows [21, 34, 46, 58] (M: the 5-row gap between the last step of a fade and the next arm is measured; first step +2 for the first, +3 after), lunge 76, big scratch 82,
 * ShakeMon2 + hit splat 99 / 109, ClearMonBg 128.
 */
import { RV, xsOf, type RevengeKnown26 } from "./prep26RevengeAssembler.ts";
export interface RevengeModelKnown26 {
  readonly rows: number; readonly registers0: Readonly<Record<string, number>>; readonly bodyWin: Readonly<{ win0h: number; win0v: number }>;
  readonly palette0: readonly number[]; readonly faded0: readonly number[]; readonly unfaded0: readonly number[];
  readonly attackerBattler: number; readonly targetBattler: number; readonly targetSlot: number;
  readonly targetIdle: Readonly<{ x: number; y: number; x2: number; y2: number }>;
  readonly scratchPalette: readonly number[]; readonly impactPalette: readonly number[]; readonly bank: number;       // palette bank (OBJ index 7) shared by scratch / swipe / impact
  readonly phase: Readonly<{ monbgCntRow: number }>;                                                                  // H
  readonly oam: RevengeKnown26;
}
export interface RevengeRow26 { registers: Record<string, number>; battleBg: Record<string, number>; hardwarePalette: number[]; fadedPalette: number[]; unfadedPalette: number[];
  tasks: { slot: number; callback: string; data: number[] }[]; targetX2: number; attackerX2: number }
const MONBG = 4, CLEAR = 128, ARMS = [21, 34, 46, 58] as const, FIRST_STEP = [2, 3, 3, 3] as const, YS = [[2, 4, 6, 8], [6, 4, 2], [4, 6, 8], [6, 4, 2, 0]] as const;
const blendTo = (c: number, y: number, to: number) => { const ch = (s: number) => { const a = c >> s & 31, b = to >> s & 31; return (a + ((b - a) * y >> 4)) & 31; }; return ch(0) | ch(5) << 5 | ch(10) << 10; };
/** AnimTask_ShakeMon2(target, 3, 0, 10, 1): x2 toggles -3 / +3 every 2nd row from row 99, task data [slot, 9 - k, 1, 1 - (odd row), 3]. */
const SHAKE = 99, SHAKE_END = 116;
export const shakeX2 = (r: number) => (r < SHAKE || r > SHAKE_END ? 0 : ((r - SHAKE) >> 1) % 2 === 0 ? -3 : 3);
export function revengeModel(k: RevengeModelKnown26): RevengeRow26[] {
  const o = k.oam, side = o.attackerSide, monbg = side === "player" ? "bg1" : "bg2", monbgBank = side === "player" ? 8 : 9, objBank = 16 + k.targetBattler, attBank = 16 + k.attackerBattler;
  const targetX = k.targetIdle.x + k.targetIdle.x2, targetY = k.targetIdle.y + k.targetIdle.y2, bgX0 = 32 - targetX, bgY0 = 32 - targetY;
  const yAt = (r: number): number => { let y = 0; ARMS.forEach((a, i) => { const f = a + FIRST_STEP[i]!; if (r >= f) { const n = Math.min(Math.floor((r - f) / 2), YS[i]!.length - 1); y = YS[i]![n]!; } }); return y; };
  const rows: RevengeRow26[] = []; const unfaded = [...k.unfaded0], faded = [...k.faded0]; let prevBg: Record<string, number> = {}, prevFaded = [...k.palette0];
  for (let r = 0; r < k.rows; r += 1) {
    if (r === 1) for (let i = 0; i < 16; i += 1) { unfaded[k.bank * 16 + 256 + i] = k.scratchPalette[i]!; faded[k.bank * 16 + 256 + i] = k.scratchPalette[i]!; }
    if (r === 96) for (let i = 0; i < 16; i += 1) { unfaded[k.bank * 16 + 256 + i] = k.impactPalette[i]!; faded[k.bank * 16 + 256 + i] = k.impactPalette[i]!; }
    if (r === MONBG) for (let i = 0; i < 16; i += 1) { unfaded[monbgBank * 16 + i] = faded[objBank * 16 + i]!; faded[monbgBank * 16 + i] = faded[objBank * 16 + i]!; }
    const y = yAt(r); for (let i = 0; i < 16; i += 1) faded[attBank * 16 + i] = y ? blendTo(unfaded[attBank * 16 + i]!, y, 0x1f) : unfaded[attBank * 16 + i]!;
    const hw = r === 0 ? [...k.palette0] : [...prevFaded]; if (r >= MONBG) for (let i = 0; i < 16; i += 1) hw[monbgBank * 16 + i] = faded[monbgBank * 16 + i]!;
    const x2 = shakeX2(r);
    const reg: Record<string, number> = { ...k.registers0 }, bb: Record<string, number> = { gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0, gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: 0 };
    if (r >= MONBG && r < CLEAR + 3) { bb[monbg === "bg1" ? "gBattle_BG1_X" : "gBattle_BG2_X"] = targetX - (k.targetIdle.x + x2) + bgX0; bb[monbg === "bg1" ? "gBattle_BG1_Y" : "gBattle_BG2_Y"] = bgY0 + (targetY - (k.targetIdle.y + k.targetIdle.y2)); }
    if (r >= 1) { reg.win0h = k.bodyWin.win0h; reg.win0v = k.bodyWin.win0v; }
    const cnt = (v: number) => (v & ~0xc003 | 0x4000 | 2) & 0xffff;
    if (r >= k.phase.monbgCntRow) reg[`${monbg}cnt`] = cnt(k.registers0[`${monbg}cnt`]!);
    if (r >= 1) { const early = r === MONBG && k.phase.monbgCntRow === MONBG, src = early ? bb : prevBg;   // H: with the BGnCNT write on row 4 the init writes hofs / vofs of the same row
      reg[`${monbg}hofs`] = src[monbg === "bg1" ? "gBattle_BG1_X" : "gBattle_BG2_X"]! & 0x1ff; reg[`${monbg}vofs`] = src[monbg === "bg1" ? "gBattle_BG1_Y" : "gBattle_BG2_Y"]! & 0x1ff; }
    if (r >= 7 && r < CLEAR) { reg.bldcnt = 16192; reg.bldalpha = 2060; }
    const tasks: RevengeRow26["tasks"] = [];
    if (r >= 21 && r <= 71) { const n = ARMS.findLastIndex((a) => r >= a); tasks.push({ slot: 0, callback: "AnimTask_BlendColorCycleLoop", data: [2, 0, 3 - n, 2, 8, 31, 0, 0, n % 2 === 0 ? 1 : 0, 0, 0, 0, 0, 0, 0, 0] }); }
    if (r >= SHAKE && r <= SHAKE_END) { const kk = (r - SHAKE) >> 1; tasks.push({ slot: 0, callback: "AnimTask_ShakeMon2_Step", data: [k.targetSlot, 9 - kk, 1, (r - SHAKE) % 2 === 0 ? 1 : 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }); }
    if (r >= CLEAR && r <= CLEAR + 2) tasks.push({ slot: 0, callback: "Task_ClearMonBg", data: [0, r === CLEAR ? 1 : 2, k.targetBattler, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    if (r >= MONBG && r <= CLEAR + 2) tasks.push({ slot: 1, callback: "Task_UpdateMonBg", data: [k.targetSlot, targetX, targetY, bgX0, bgY0, side === "player" ? 0 : 1, k.targetBattler, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    rows.push({ registers: reg, battleBg: bb, hardwarePalette: hw, fadedPalette: faded.slice(), unfadedPalette: unfaded.slice(), tasks: tasks.sort((a, b) => a.slot - b.slot), targetX2: x2, attackerX2: 0 });
    prevBg = bb; prevFaded = faded.slice();
  }
  void xsOf; void RV;
  return rows;
}
