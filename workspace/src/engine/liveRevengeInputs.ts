/**
 * MOVE_REVENGE (279) live inputs (docs/next-adapters-prep26.md s2 / s4, D4b faithful timing): the non-OAM per-row inputs of the REVENGE
 * renderer branch from the source-derived prep26 model below, ported 1:1 from tools/integration/prep26RevengeModel.ts (Move_REVENGE,
 * battle_anim_scripts.s:8749-8776): registers, gBattle_BGn scroll, the hardware / faded / unfaded palette, the live task records and the
 * target x2. Production values only (anchors, the asset palette composite, the purple-scratch / impact palettes, known-entry constants).
 * The OAM rows come from liveMoveOamAssembler.ts liveRevengeHardwareOamRows. Never a capture row.
 *
 * One CPU-phase (D4) parameter the source does not determine (prep26 s2.4): the monbg BGnCNT write row (4 | 5), from
 * src/engine/liveMoveTimingPolicy.ts. The blend-cycle arm rows [21, 34, 46, 58] are a measured constant (M), equal in every window.
 */
interface RevengeModelKnown26 {
  readonly rows: number; readonly registers0: Readonly<Record<string, number>>; readonly bodyWin: Readonly<{ win0h: number; win0v: number }>;
  readonly palette0: readonly number[]; readonly faded0: readonly number[]; readonly unfaded0: readonly number[];
  readonly attackerBattler: number; readonly targetBattler: number; readonly targetSlot: number;
  readonly targetIdle: Readonly<{ x: number; y: number; x2: number; y2: number }>;
  readonly scratchPalette: readonly number[]; readonly impactPalette: readonly number[]; readonly bank: number;       // palette bank (OBJ index 7) shared by scratch / swipe / impact
  readonly phase: Readonly<{ monbgCntRow: number }>;                                                                  // H
  readonly attackerSide: "player" | "opponent";
}
export interface LiveRevengeRow { registers: Record<string, number>; battleBg: Record<string, number>; hardwarePalette: number[]; fadedPalette: number[]; unfadedPalette: number[];
  tasks: { slot: number; callback: string; data: number[] }[]; targetX2: number; attackerX2: number }
const MONBG = 4, CLEAR = 128, ARMS = [21, 34, 46, 58] as const, FIRST_STEP = [2, 3, 3, 3] as const, YS = [[2, 4, 6, 8], [6, 4, 2], [4, 6, 8], [6, 4, 2, 0]] as const;
const blendTo = (c: number, y: number, to: number) => { const ch = (s: number) => { const a = c >> s & 31, b = to >> s & 31; return (a + ((b - a) * y >> 4)) & 31; }; return ch(0) | ch(5) << 5 | ch(10) << 10; };
/** AnimTask_ShakeMon2(target, 3, 0, 10, 1): x2 toggles -3 / +3 every 2nd row from row 99, task data [slot, 9 - k, 1, 1 - (odd row), 3]. */
const SHAKE = 99, SHAKE_END = 116;
const shakeX2 = (r: number) => (r < SHAKE || r > SHAKE_END ? 0 : ((r - SHAKE) >> 1) % 2 === 0 ? -3 : 3);
function revengeModel(k: RevengeModelKnown26): LiveRevengeRow[] {
  const side = k.attackerSide, monbg = side === "player" ? "bg1" : "bg2", monbgBank = side === "player" ? 8 : 9, objBank = 16 + k.targetBattler, attBank = 16 + k.attackerBattler;
  const targetX = k.targetIdle.x + k.targetIdle.x2, targetY = k.targetIdle.y + k.targetIdle.y2, bgX0 = 32 - targetX, bgY0 = 32 - targetY;
  const yAt = (r: number): number => { let y = 0; ARMS.forEach((a, i) => { const f = a + FIRST_STEP[i]!; if (r >= f) { const n = Math.min(Math.floor((r - f) / 2), YS[i]!.length - 1); y = YS[i]![n]!; } }); return y; };
  const rows: LiveRevengeRow[] = []; const unfaded = [...k.unfaded0], faded = [...k.faded0]; let prevBg: Record<string, number> = {}, prevFaded = [...k.palette0];
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
    const tasks: LiveRevengeRow["tasks"] = [];
    if (r >= 21 && r <= 71) { const n = ARMS.reduce((last: number, a, i) => (r >= a ? i : last), -1); tasks.push({ slot: 0, callback: "AnimTask_BlendColorCycleLoop", data: [2, 0, 3 - n, 2, 8, 31, 0, 0, n % 2 === 0 ? 1 : 0, 0, 0, 0, 0, 0, 0, 0] }); }
    if (r >= SHAKE && r <= SHAKE_END) { const kk = (r - SHAKE) >> 1; tasks.push({ slot: 0, callback: "AnimTask_ShakeMon2_Step", data: [k.targetSlot, 9 - kk, 1, (r - SHAKE) % 2 === 0 ? 1 : 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }); }
    if (r >= CLEAR && r <= CLEAR + 2) tasks.push({ slot: 0, callback: "Task_ClearMonBg", data: [0, r === CLEAR ? 1 : 2, k.targetBattler, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    if (r >= MONBG && r <= CLEAR + 2) tasks.push({ slot: 1, callback: "Task_UpdateMonBg", data: [k.targetSlot, targetX, targetY, bgX0, bgY0, side === "player" ? 0 : 1, k.targetBattler, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    rows.push({ registers: reg, battleBg: bb, hardwarePalette: hw, fadedPalette: faded.slice(), unfadedPalette: unfaded.slice(), tasks: tasks.sort((a, b) => a.slot - b.slot), targetX2: x2, attackerX2: 0 });
    prevBg = bb; prevFaded = faded.slice();
  }
  return rows;
}

type Rgb = Readonly<{ r: number; g: number; b: number }>;
const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
/** Body rows (activation .. first inactive, inclusive): 145 in every measured window, both sides (prep26 s2.2). */
export const LIVE_REVENGE_ROWS = 145;
export interface LiveRevengeModelArgs {
  readonly attackerSide: "player" | "opponent";
  readonly registers0: Readonly<Record<string, number>>;
  /** Hardware = faded = unfaded palette at activation (the asset composite). */
  readonly palette0: readonly number[];
  readonly targetSlot: number;
  /** Target sprite centre (gSprites x / y) and idle rest at activation. */
  readonly targetSpriteCenter: Readonly<{ x: number; y: number }>;
  readonly targetIdleRest: Readonly<{ x2: number; y2: number }>;
  readonly scratchPalette: readonly Rgb[];
  readonly impactPalette: readonly number[];
  /** Known-entry OBJ palette slot shared by ANIM_TAG_PURPLE_SCRATCH / PURPLE_SWIPE / IMPACT (slot 7 = OBJ bank 23). */
  readonly bank: number;
  /** D4 policy (liveMoveTimingPolicy.ts MOVE_REVENGE bg-write-row): the monbg BGnCNT write row. */
  readonly monbgCntRow: 4 | 5;
}
export function liveRevengeRows(args: LiveRevengeModelArgs): readonly LiveRevengeRow[] {
  return revengeModel({
    rows: LIVE_REVENGE_ROWS, registers0: args.registers0, bodyWin: { win0h: 0, win0v: 0 },
    palette0: args.palette0, faded0: args.palette0, unfaded0: args.palette0,
    attackerBattler: args.attackerSide === "player" ? 0 : 1, targetBattler: args.attackerSide === "player" ? 1 : 0, targetSlot: args.targetSlot,
    targetIdle: { x: args.targetSpriteCenter.x, y: args.targetSpriteCenter.y, x2: args.targetIdleRest.x2, y2: args.targetIdleRest.y2 },
    scratchPalette: args.scratchPalette.map(bgr555).concat(Array(16).fill(0)).slice(0, 16), impactPalette: args.impactPalette, bank: args.bank,
    phase: { monbgCntRow: args.monbgCntRow }, attackerSide: args.attackerSide,
  });
}
