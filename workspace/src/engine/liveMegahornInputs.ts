/**
 * MOVE_MEGAHORN (224) live inputs (docs/next-adapters-prep24.md s1, D4b faithful timing). Every per-row input except the hardware OAM
 * (liveMoveOamAssembler.ts liveMegahornHardwareOamRows) comes from the source-derived prep24 model below, ported 1:1 from
 * tools/integration/prep24MegahornModel.ts (Move_MEGAHORN, battle_anim_scripts.s:6109-6145): registers, gBattle_BGn scroll, the
 * hardware / unfaded palette, the live task records and the target x2/y2 program. Production values only: the battler anchors, the
 * asset palette composite + the horn / impact / BG_DRILL palettes, the known-entry allocator constants and the lent activation
 * order. Never a capture row.
 *
 * Two CPU-phase (D4) parameters the source does not determine (prep24 s1.3) come from src/engine/liveMoveTimingPolicy.ts:
 * `endLate` (the restorebg fade ends one row late: 177 body rows vs 176) and `monbgCntRow` (the monbg BGnCNT write row 7 | 8).
 */
type Side = "player" | "opponent";
// ---------------------------------------------------------------- prep24 model (verbatim port) ----------------------------------
interface MegahornKnown24 {
  readonly attackerSide: Side; readonly rows: number;
  readonly registers0: Readonly<Record<string, number>>;
  readonly palette0: readonly number[]; readonly unfaded0: readonly number[];
  readonly attackerSlot: number; readonly targetSlot: number; readonly targetBattler: number;
  readonly targetIdle: Readonly<{ x: number; y: number; x2: number; y2: number }>;
  readonly hornBank: number; readonly impactBank: number;
  /** H class (VBlank frame phase of the capture; not derivable from the source): row of the monbg BGnCNT write (7|8) and whether the final restorebg fade ends one row late. */
  readonly phase: Readonly<{ monbgCntRow: 7 | 8; endLate: boolean }>;
  readonly hornPalette: readonly number[]; readonly impactPalette: readonly number[]; readonly drillPalette: readonly number[];
}
export interface LiveMegahornRow {
  readonly registers: Record<string, number>; readonly battleBg: Record<string, number>;
  readonly hardwarePalette: number[]; readonly unfadedPalette: number[];
  readonly tasks: { slot: number; callback: string; data: number[] }[];
  readonly target: { x2: number; y2: number };
}
// --- script chain (rows).  Every constant below is a delay/wait of Move_MEGAHORN (battle_anim_scripts.s:6109-6145) ---
const F = (() => {
  const LOAD_HORN = 2, LOAD_IMPACT = 5, MONBG = 7, FADE1 = 10;               // script prologue (loadspritegfx x2, monbg): K, equal in all windows
  const L1 = FADE1 + 19;                                                      // LoadMoveBg row: fade-out 0..16 (17 rows) + 2 state rows
  const SHAKE = L1 + 19;                                                      // waitbgfadein (17 rows) + 2
  const SHAKE_END = SHAKE + 2 * 14;                                           // 15 toggles, delay 1
  const SLIDE_A = SHAKE_END + 1 + 12;                                         // waitforvisualfinish (+1), delay 10 (= 10 + 2)
  const HORN = SLIDE_A + 5;                                                   // delay 3
  const SLIDE_T = HORN + 6;                                                   // delay 4; hit splat + target slide in the same frame
  const SPLAT_LIFE = 9;                                                       // gBasicHitSplat rows (prep20: states 100..108)
  const SHAKE_IN = SLIDE_T + SPLAT_LIFE + 1;                                  // waitforvisualfinish (+1) ; complex_palette_blend in the same frame
  const BACK_A = SHAKE_IN + 12, BACK_T = BACK_A + 5;                          // delay 10, delay 3
  const CLEAR = BACK_T + 7 + 1;                                               // 7 steps + destroy frame, then +1
  return { LOAD_HORN, LOAD_IMPACT, MONBG, FADE1, L1, SHAKE, SHAKE_END, SLIDE_A, HORN, SLIDE_T, SHAKE_IN, BACK_A, BACK_T, CLEAR, FLASH: SHAKE_IN };
})();
const FADE3_START_STALL = 2;                      // measured: y holds 1 for 3 rows at the restorebg fade (both sides)
const fade3EndStall = (k: MegahornKnown24) => k.phase.endLate ? 1 : 0;   // H: frame phase of the capture (5 of 6 windows late)
const sar = (v: number, n: number) => v >> n;
const trunc = (v: number) => Math.trunc(v);
const blend = (c: number, y: number, to: number) => {   // BlendPalette (util): per channel c + ((to - c) * y >> 4)
  const ch = (s: number) => { const a = c >> s & 31, b = to >> s & 31; return (a + ((b - a) * y >> 4)) & 31; };
  return ch(0) | ch(5) << 5 | ch(10) << 10;
};
const bgOfMonbg = (side: Side) => (side === "player" ? "bg1" : "bg2");   // target on the opposite side: opponent target -> BG1, player target -> BG2

interface TargetSim { x2: number[]; y2: number[]; shakeIn: (number[] | null)[]; shakeMon: (number[] | null)[]; }
/** Frame-by-frame replay of the target battler x2/y2 and the two shake tasks' data (battle_anim_mon_movement.c). */
function simulateSprites(k: MegahornKnown24): TargetSim {
  const n = k.rows, sideSign = k.attackerSide === "player" ? 1 : -1;   // target is on the opposite side: opponent target (+x slide) when the attacker is the player
  let x2 = k.targetIdle.x2, y2 = k.targetIdle.y2;
  const out: TargetSim = { x2: [], y2: [], shakeIn: [], shakeMon: [] };
  let slideT: { step: number; dx: number; dy: number; n: number } | null = null;
  let back: { d0: number; sx: number; sy: number; d3: number; d4: number; x5: number; y5: number } | null = null;
  let shakeIn: number[] | null = null, shakeMon: number[] | null = null;
  const stepShakeMon = () => { if (!shakeMon) return;
    if (shakeMon[3] === 0) { shakeMon[3] = shakeMon[2]; if (--shakeMon[1] === 0) shakeMon = null; } else shakeMon[3] -= 1; };
  const stepShakeIn = () => { const t = shakeIn; if (!t) return;
    if (t[3] === 0) { x2 += t[1] & 1 ? t[5]! : -t[5]!; y2 += t[1] & 1 ? t[6]! : -t[6]!; t[3] = t[4]!; t[1] += 1;
      if (t[1] >= t[2]!) { x2 += t[1] & 1 ? trunc(t[5]! / 2) : -trunc(t[5]! / 2); y2 += t[1] & 1 ? trunc(t[6]! / 2) : -trunc(t[6]! / 2); shakeIn = null; } }
    else t[3] -= 1; };
  for (let f = 0; f < n; f += 1) {
    if (f === F.SHAKE) { shakeMon = [k.attackerSlot, 15, 1, 1, 2, 0]; stepShakeMon(); }          // creation call (attacker x2 handled by prep20)
    if (f === F.SHAKE_IN) { x2 += -4; y2 += 1; shakeIn = [k.targetSlot, 0, 12, 0, 1, -8, 2]; stepShakeIn(); }   // AnimTask_ShakeMonInPlace(target, -4, 1, 12, 1)
    if (f === F.SLIDE_T) slideT = { step: 0, dx: sideSign * 16 * 256 / 4 | 0, dy: -sideSign * 4 * 256 / 4 | 0, n: 4 };   // SlideMonToOffset(1, -16, 4, mirror, 4)
    if (f === F.BACK_T) { const dx = -x2 * 256, dy = -y2 * 256;
      back = { d0: 7, sx: trunc(dx / 7), sy: trunc(dy / 7), d3: 0, d4: 0, x5: x2, y5: y2 }; }
    if (slideT) { if (slideT.n === 0) slideT = null; else { slideT.n -= 1; slideT.step += 1; x2 = sar(slideT.step * slideT.dx, 8); y2 = sar(slideT.step * slideT.dy, 8); } }
    if (back) { if (back.d0 === 0) { x2 = 0; y2 = 0; back = null; }
      else { back.d0 -= 1; back.d3 += back.sx; back.d4 += back.sy; x2 = (sar(back.d3, 8) << 24 >> 24) + back.x5; y2 = (sar(back.d4, 8) << 24 >> 24) + back.y5; } }
    stepShakeMon(); stepShakeIn();                                                               // RunTasks (slot 0)
    out.x2.push(x2); out.y2.push(y2); out.shakeIn.push(shakeIn ? [...shakeIn] : null); out.shakeMon.push(shakeMon ? [...shakeMon] : null);
  }
  return out;
}
const word = (v: number) => v & 0xffff;
function megahornModel(k: MegahornKnown24): LiveMegahornRow[] {
  const n = k.rows, side = k.attackerSide, sign = side === "player" ? 1 : -1, sprites = simulateSprites(k);
  const monbg = bgOfMonbg(side), monbgBank = side === "player" ? 8 : 9, objBank = 16 + k.targetBattler;
  const targetX = k.targetIdle.x + k.targetIdle.x2, targetY = k.targetIdle.y + k.targetIdle.y2;      // t2_SpriteX / t2_SpriteY at monbg creation
  const bgX0 = 32 - targetX, bgY0 = 32 - targetY;                                                    // GetBattleMonSpriteOffset / SetBattleAnimBg: BgX = 32 - spriteX
  // fade rows (hardware blend registers)
  const fade1Out = (r: number) => r < F.FADE1 + 1 ? 0 : Math.min(16, r - (F.FADE1 + 1));              // y = r - 11 for rows 12..27
  const L1 = F.L1, inY = (r: number, L: number) => r <= L + 1 ? 16 : Math.max(0, 16 - (r - (L + 1)));  // y = 16 - j at row L + 1 + j
  const F3 = F.CLEAR, f3Stall = FADE3_START_STALL;
  const f3Out = (r: number) => r < F3 + 2 ? 0 : r <= F3 + 2 + f3Stall ? 1 : Math.min(16, r - (F3 + f3Stall + 1));
  const outEnd3 = F3 + f3Stall + 17;                                                                // row where y reaches 16 (154)
  const S23 = outEnd3 + 1, L3 = S23 + 1 + fade3EndStall(k);                                      // tState 2 row (155); LoadDefaultBg row: 157 player / 156 opponent
  const stalled = (r: number) => r === F.CLEAR + 2 || r === F.CLEAR + 3;                           // measured: rows 137-138 run no task of slot >= 1 (ClearMonBg ResetBattleAnimBg frames)
  const eff = (r: number) => r - (r >= F.CLEAR + 3 ? 2 : r >= F.CLEAR + 2 ? 1 : 0);
  void stalled;
  const rows: LiveMegahornRow[] = [];
  const faded = [...k.palette0], unfaded = [...k.unfaded0];
  const hornBase = k.hornBank * 16, impactBase = k.impactBank * 16;
  const objPalSelected = [1, 2, 3, monbgBank, 16, 17];
  let prevBg: Record<string, number> = {};
  const slideStart = F.L1, slideEnd = F.CLEAR + 21;                                                  // BG3 slide: created at L1, destroyed by setarg 7 = 0xFFFF
  for (let r = 0; r < n; r += 1) {
    const reg: Record<string, number> = { ...k.registers0 };
    const bb: Record<string, number> = { gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0, gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: 0 };
    // --- palette events (rows) ---
    if (r === F.LOAD_HORN - 1) for (let i = 0; i < 16; i += 1) unfaded[hornBase + i] = k.hornPalette[i]!;
    if (r === F.LOAD_HORN) for (let i = 0; i < 16; i += 1) faded[hornBase + i] = k.hornPalette[i]!;
    if (r === F.LOAD_IMPACT - 1) for (let i = 0; i < 16; i += 1) unfaded[impactBase + i] = k.impactPalette[i]!;
    if (r === F.LOAD_IMPACT) for (let i = 0; i < 16; i += 1) faded[impactBase + i] = k.impactPalette[i]!;
    if (r === slideStart) for (let i = 0; i < 16; i += 1) unfaded[32 + i] = k.drillPalette[i]!;                                // LoadMoveBg / LoadCompressedPalette: unfaded now, faded buffer shows one row later
    if (r === slideStart + 1) for (let i = 0; i < 16; i += 1) faded[32 + i] = k.drillPalette[i]!;
    if (r === L3) for (let i = 0; i < 16; i += 1) unfaded[32 + i] = k.unfaded0[32 + i]!;                                         // LoadDefaultBg
    if (r === L3 + 1) for (let i = 0; i < 16; i += 1) faded[32 + i] = k.unfaded0[32 + i]!;
    if (r === F.FLASH + 1) for (const b of objPalSelected) for (let i = 0; i < 16; i += 1) faded[b * 16 + i] = blend(unfaded[b * 16 + i]!, 10, 0x7fff);   // complex_palette_blend selector BG|ATTACKER|TARGET
    if (r === F.FLASH + 6) for (const b of objPalSelected) for (let i = 0; i < 16; i += 1) faded[b * 16 + i] = unfaded[b * 16 + i]!;                      // blend_y2 = 0 after delay 5
    if (r >= F.MONBG) { for (let i = 0; i < 16; i += 1) faded[monbgBank * 16 + i] = faded[objBank * 16 + i]!; if (r === F.MONBG) for (let i = 0; i < 16; i += 1) unfaded[monbgBank * 16 + i] = faded[objBank * 16 + i]!; }
    // --- battleBg ---
    if (r >= F.MONBG && r < F.CLEAR + 3) {
      const x = targetX - (k.targetIdle.x + sprites.x2[r]!), y = targetY - (k.targetIdle.y + sprites.y2[r]!);
      bb[monbg === "bg1" ? "gBattle_BG1_X" : "gBattle_BG2_X"] = x + bgX0; bb[monbg === "bg1" ? "gBattle_BG1_Y" : "gBattle_BG2_Y"] = y + bgY0;
    }
    if (r >= slideStart && r < slideEnd) { const m = eff(r) - slideStart + 1;
      bb.gBattle_BG3_X = -9 * sign * m; bb.gBattle_BG3_Y = 3 * sign * m; }
    // --- registers ---
    const cnt = (v: number) => (v & ~0xc003 | 0x4000 | 2) & 0xffff;
    if (r >= k.phase.monbgCntRow) reg[`${monbg}cnt`] = cnt(k.registers0[`${monbg}cnt`]!);
    const earlyInit = r === F.MONBG && k.phase.monbgCntRow === F.MONBG;       // early phase: the init writes cnt + hofs/vofs of the current row
    if (r >= 1) { const prevBgOf = earlyInit ? bb : prevBg; const hofs = (name: string) => reg[name] = prevBgOf[name === `${monbg}hofs` ? (monbg === "bg1" ? "gBattle_BG1_X" : "gBattle_BG2_X") : name === `${monbg}vofs` ? (monbg === "bg1" ? "gBattle_BG1_Y" : "gBattle_BG2_Y") : name === "bg3hofs" ? "gBattle_BG3_X" : "gBattle_BG3_Y"]! & 0x1ff;
      hofs(`${monbg}hofs`); hofs(`${monbg}vofs`); hofs("bg3hofs"); hofs("bg3vofs"); }
    if (r >= slideStart) reg.bg3cnt = 14859;
    if (r >= slideEnd + 1) reg.bg3cnt = k.registers0.bg3cnt!;   // UpdateAnimBg3ScreenSize(TRUE) in the destroy frame, visible one row later
    // blend registers
    let bldcnt = 0, bldy = 0, bldalpha = 0;
    if (r >= F.FADE1 + 1 && r < L1 + 18) { bldcnt = 232; bldy = r < L1 + 1 ? fade1Out(r) : inY(r, L1); }
    if (r >= F.SHAKE && r < F.CLEAR) { bldcnt = 16192; bldalpha = 2060; }
    if (r >= F3 + 1 && r < L3 + 18) { bldcnt = 232; bldy = r < outEnd3 + 1 ? f3Out(r) : r <= L3 + 1 ? 16 : inY(r, L3); }
    reg.bldcnt = bldcnt; reg.bldy = bldy; reg.bldalpha = bldalpha;
    // --- tasks ---
    const tasks: LiveMegahornRow["tasks"] = [];
    if (r >= F.FADE1 && r < L1 + 18) tasks.push({ slot: 0, callback: "Task_FadeToBg", data: [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, r < L1 - 1 ? 1 : r === L1 - 1 ? 2 : 3, 0, 0, 0, 0, 0] });
    if (r >= F.SHAKE && r < F.SHAKE_END) tasks.push({ slot: 0, callback: "AnimTask_ShakeMon_Step", data: [...sprites.shakeMon[r]!, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    if (r >= F.SHAKE_IN && sprites.shakeIn[r]) tasks.push({ slot: 0, callback: "AnimTask_ShakeMonInPlace_Step", data: [...sprites.shakeIn[r]!, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    if (r >= F.CLEAR && r < F.CLEAR + 3) tasks.push({ slot: 0, callback: "Task_ClearMonBg", data: [0, r === F.CLEAR ? 1 : 2, side === "player" ? 1 : 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((v, i) => i === 2 ? k.targetBattler : v) });
    if (r >= F.MONBG && r < F.CLEAR + 3) tasks.push({ slot: 1, callback: "Task_UpdateMonBg", data: [k.targetSlot, targetX, targetY, bgX0, bgY0, side === "player" ? 0 : 1, k.targetBattler, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    if (r >= F.CLEAR && r < L3 + 18) tasks.push({ slot: 2, callback: "Task_FadeToBg", data: [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, r < S23 ? 1 : r < L3 ? 2 : 3, 0, 0, 0, 0, 0] });
    if (r >= slideStart && r < slideEnd) tasks.push({ slot: 3, callback: "AnimTask_UpdateSlidingBg", data: [1, -2304 * sign, 768 * sign, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    rows.push({ registers: reg, battleBg: bb, hardwarePalette: faded.slice(), unfadedPalette: unfaded.slice(), tasks, target: { x2: sprites.x2[r]!, y2: sprites.y2[r]! } });
    prevBg = bb;
  }
  void word;
  return rows;
}
// ---------------------------------------------------------------- production builder -------------------------------------------
type Point = Readonly<{ x: number; y: number }>;
type Rgb = Readonly<{ r: number; g: number; b: number }>;
const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;

export interface LiveMegahornArgs {
  readonly attackerSide: Side;
  /** Target sprite centre (gSprites x / y) and its idle rest (x2 / y2) at activation. */
  readonly targetSpriteCenter: Point;
  readonly targetIdleRest: Readonly<{ x2: number; y2: number }>;
  readonly attackerSlot: number;
  readonly targetSlot: number;
  /** BG register block at activation (the body overwrites every register the MEGAHORN renderer branch reads). */
  readonly registers0: Readonly<Record<string, number>>;
  /** Hardware (= unfaded) palette at activation: the asset composite. */
  readonly palette0: readonly number[];
  /** Known-entry allocator: ANIM_TAG_HORN_HIT_2 / ANIM_TAG_IMPACT OBJ palette banks. */
  readonly hornBank: number;
  readonly impactBank: number;
  readonly hornPalette: readonly Rgb[];
  readonly impactPalette: readonly number[];
  readonly drillPalette: readonly Rgb[];
  /** D4 policy parameters (liveMoveTimingPolicy.ts): restorebg fade one row late; monbg BGnCNT write row. */
  readonly endLate: boolean;
  readonly monbgCntRow: 7 | 8;
}

/** Body rows (activation .. first inactive): 176, + 1 when the final restorebg fade ends one row late. */
export const liveMegahornBodyRows = (endLate: boolean): number => 176 + (endLate ? 1 : 0);

/** All rows of the body (registers / battleBg / palettes / tasks / target x2,y2), pure in the arguments. */
export function liveMegahornRows(args: LiveMegahornArgs): readonly LiveMegahornRow[] {
  return megahornModel({
    attackerSide: args.attackerSide, rows: liveMegahornBodyRows(args.endLate),
    registers0: args.registers0, palette0: args.palette0, unfaded0: args.palette0,
    attackerSlot: args.attackerSlot, targetSlot: args.targetSlot, targetBattler: args.attackerSide === "player" ? 1 : 0,
    targetIdle: { x: args.targetSpriteCenter.x, y: args.targetSpriteCenter.y, x2: args.targetIdleRest.x2, y2: args.targetIdleRest.y2 },
    hornBank: args.hornBank, impactBank: args.impactBank,
    phase: { monbgCntRow: args.monbgCntRow, endLate: args.endLate },
    hornPalette: args.hornPalette.map(bgr555), impactPalette: args.impactPalette, drillPalette: args.drillPalette.map(bgr555),
  });
}
