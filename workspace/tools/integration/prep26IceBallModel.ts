/**
 * prep26: source-derived model of the non-OAM per-age inputs of the MOVE_ICE_BALL renderer branch (battleScene.ts ICE_BALL): registers (21),
 * battleBg, hardwarePalette / fadedPalette / unfadedPalette, live tasks, plus the sprite fields of the owned sprites.  OAM / matrices:
 * prep26IceBallAssembler.ts.  Script chain (Move_ICE_BALL, battle_anim_scripts.s): loadspritegfx rows 0 / 1 (palettes visible 1 / 4 unfaded, +1 hardware),
 * counter 4 `fadetobg BG_ICE` at step 7 (Task_FadeToBg, battle_anim.c:1148-1190: BLDCNT 0xe8 at C+1, BLDY 1..16 rows C+2..C+17, LoadMoveBg at
 * C+19, BLDY 15..0 rows C+21..C+36, destroy C+37), chunk step 7, shards + shake step 37, `waitbgfadein` + `delay 45` + `restorebg` = C2 = 7 + 37 + 1 + 45 + 2 = 92.
 * Lag rows (VBlank-overrun 0-step frames) are an INPUT (H class).
 */
import { IB_SHAKE, IB_SHARDS, chunkAt, shakeAt, shardsAt, stepOf, type IceBallKnown26 } from "./prep26IceBallAssembler.ts";
export interface IceBallModelKnown26 {
  readonly rows: number; readonly registers0: Readonly<Record<string, number>>;
  readonly registersBody: Readonly<Record<string, number>>;
  readonly palette0: readonly number[]; readonly faded0: readonly number[]; readonly unfaded0: readonly number[];   // hardware / faded / unfaded at activation (K)
  readonly chunkPalette: readonly number[]; readonly crystalPalette: readonly number[]; readonly icePalette: readonly number[];     // BGR555 words from the assets (P)
  readonly oam: IceBallKnown26;
}
export interface IceBallRow26 {
  readonly registers: Record<string, number>; readonly battleBg: Record<string, number>;
  readonly hardwarePalette: number[]; readonly unfadedPalette: number[]; readonly fadedPalette: number[];
  readonly tasks: { slot: number; callback: string; data: number[] }[];
  readonly chunk: ReturnType<typeof chunkAt>; readonly shards: ReturnType<typeof shardsAt>; readonly targetX2: number;
}
export const FADE_C1 = 7, FADE_C2 = 92, FADE_LEN = 37;
const fadeY = (e: number, c: number): { cnt: number; y: number } => {
  if (e < c + 1 || e >= c + FADE_LEN) return { cnt: 0, y: 0 };
  const y = e <= c + 1 ? 0 : e <= c + 17 ? e - c - 1 : e <= c + 20 ? 16 : 16 - (e - (c + 20));
  return { cnt: 0xe8, y };
};
const fadeState = (e: number, c: number): number => e < c || e >= c + FADE_LEN ? 0 : e <= c + 17 ? 1 : e === c + 18 ? 2 : 3;
export function iceBallModel(k: IceBallModelKnown26): IceBallRow26[] {
  const o = k.oam, counter = o.counter, rows: IceBallRow26[] = [];
  const strongest = counter === 4, unfadedAt = (e: number, base: readonly number[] = k.unfaded0): number[] => {
    const u = [...base];
    if (e >= 1) for (let i = 0; i < 16; i += 1) u[(16 + o.chunkBank) * 16 + i] = k.chunkPalette[i]!;
    if (e >= 4) for (let i = 0; i < 16; i += 1) u[(16 + o.crystalBank) * 16 + i] = k.crystalPalette[i]!;
    if (strongest && e >= FADE_C1 + 19 && e < FADE_C2 + 19) for (let i = 0; i < 16; i += 1) u[2 * 16 + i] = k.icePalette[i]!;
    return u;
  };
  for (let r = 0; r < k.rows; r += 1) {
    const e = stepOf(r, o.taskLagRows), eHw = stepOf(Math.max(r - 1, 0), o.taskLagRows), es = stepOf(r, o.lagRows);
    const reg: Record<string, number> = { ...(r === 0 ? k.registers0 : k.registersBody) }, bb: Record<string, number> = { gBattle_BG1_X: 0, gBattle_BG1_Y: 0, gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: 0 };
    const tasks: IceBallRow26["tasks"] = [];
    let slot0: "fade" | null = null;
    if (strongest) for (const c of [FADE_C1, FADE_C2]) { const f = fadeState(e, c);
      if (f) { slot0 = "fade"; tasks.push({ slot: 0, callback: "Task_FadeToBg", data: [c === FADE_C1 ? 15 : -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, f, 0, 0, 0, 0, 0] }); }
      const y = fadeY(e, c); if (y.cnt) { reg.bldcnt = y.cnt; reg.bldy = y.y; } }
    const sh = shakeAt(e, o, r);
    if (sh.data) tasks.push({ slot: strongest ? 1 : 0, callback: "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step", data: sh.data });
    const u = unfadedAt(e), fd = unfadedAt(e, k.faded0), hw = unfadedAt(eHw, r === 0 ? k.palette0 : k.faded0);
    rows.push({ registers: reg, battleBg: bb, hardwarePalette: hw, unfadedPalette: u, fadedPalette: fd, tasks, chunk: chunkAt(es, o), shards: shardsAt(es, o), targetX2: shakeAt(e, o, r).x2 });
  }
  void IB_SHAKE; void IB_SHARDS;
  return rows;
}
