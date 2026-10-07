/**
 * Pure source model of the non-Ghost MOVE_CURSE body ("CurseStats", battle_anim_scripts.s): AnimTask_SwayMon, delay 10,
 * then AnimTask_DrawFallingWhiteLinesOnAttacker + AnimTask_BlendColorCycle (attacker palette towards RGB_RED). Ported from
 * the prep23 prototype (tools/integration/prep23CurseStats.ts, docs/next-adapters-prep23.md s1.3); it derives the per-row
 * live tasks, GPU registers, gBattle_BG* scroll, hardware palette and the attacker / OBJ-window copy sprite state from the
 * attacker side and anchors only. Row r is the snapshot after frame r of the activation (row 0 = the activation frame).
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type CurseStatsSide = "player" | "opponent";
/** AnimTask_SwayMon arguments of CurseStats: horizontal, amplitude 10 (negated for an opponent user), period 1536, 3 sways. */
export const CURSE_SWAY_AMPLITUDE = 10, CURSE_SWAY_PERIOD = 1536, CURSE_SWAY_SWAYS = 3;
/** Script rows (prep23 s1.2, all five stats windows): the DrawFallingWhiteLines task is created on row 77, steps from 79. */
export const CURSE_DRAW_CREATE_ROW = 77, CURSE_DRAW_STEP_FIRST_ROW = 79, CURSE_DRAW_TASK_LAST_ROW = 145;
export const CURSE_BLEND_TASK_LAST_ROW = 153;
/**
 * The OBJ-window copy sprite (CreateInvisibleSpriteCopy) is in the OAM of rows 80..147; the end of the step is observed 4 rows
 * late in OAM / palette (prep23 s0.2: measured constants, equal in all five windows).
 */
export const CURSE_COPY_FIRST_ROW = 80, CURSE_COPY_LAST_ROW = 147, CURSE_FINAL_FADE_EXTRA = 4;
/** The battler OAM follows its sprite's x2 by two rows (prep23 OAM_LAG). */
export const CURSE_BATTLER_OAM_LAG = 2;
/** curseSourceAtAge: the stats branch's first inactive age + 1. */
export const CURSE_STATS_ROWS = 176;

const s16 = (value: number): number => ((value & 0xffff) ^ 0x8000) - 0x8000;
/** trig.c Sin(): GBA sine table, arithmetic shift. */
const sin = (index: number, amplitude: number): number => (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;

export interface CurseSwayStep { readonly x2: number; readonly data: readonly number[]; readonly done: boolean }
/** AnimTask_SwayMon / AnimTask_SwayMonStep (battle_anim_mon_movement.c) replayed for n steps (one per row from row 1). */
export function curseSwayAtStep(side: CurseStatsSide, spriteId: number, n: number): CurseSwayStep {
  const d: number[] = new Array(16).fill(0);
  d[1] = side === "player" ? CURSE_SWAY_AMPLITUDE : -CURSE_SWAY_AMPLITUDE; d[2] = CURSE_SWAY_PERIOD; d[3] = CURSE_SWAY_SWAYS;
  d[4] = spriteId; d[5] = side === "player" ? 0 : 1; d[12] = 1;
  let x2 = 0, done = false;
  for (let i = 1; i <= n && !done; i += 1) {
    const index = (d[10]! + d[2]!) & 0xffff; d[10] = s16(index);
    const wave = index >> 8; x2 = sin(wave, d[1]!);
    if ((wave >= 0x80 && d[11] === 0 && d[12] === 1) || (wave < 0x7f && d[11] === 1 && d[12] === 0)) {
      d[11]! ^= 1; d[12]! ^= 1; d[3]! -= 1;
      if (d[3] === 0) { x2 = 0; done = true; }
    }
  }
  return { x2, data: d, done };
}
/** First row without the sway task (the script's waitforvisualfinish release). */
export function curseSwayEndRow(side: CurseStatsSide): number {
  for (let n = 1; ; n += 1) if (curseSwayAtStep(side, 0, n).done) return n;
}

/**
 * AnimTask_BlendColorCycle + BeginNormalPaletteFade / UpdateNormalPaletteFade (palette.c) state machine: the blend
 * coefficient y applied on each frame (0 -> 10 step 2 every 6 frames, then 10 -> 0).
 */
export function curseBlendCycleSchedule(createFrame: number, lastFrame: number): ReadonlyMap<number, number> {
  const st = { active: false, toggle: 0, counter: 0, delay: 4, y: 0, target: 0, fin: false, fc: 0, yDec: false };
  const log = new Map<number, number>(); let numBlends = 2, restore = 0; const INIT = 0, TARGET = 10;
  const update = (frame: number) => {
    if (!st.active) return;
    if (st.fin) { if (st.fc === 4) { st.active = false; st.fin = false; st.fc = 0; } else st.fc += 1; return; }
    if (st.toggle === 0) { if (st.counter < st.delay) { st.counter += 1; return; } st.counter = 0; } else log.set(frame, st.y);
    st.toggle ^= 1;
    if (st.toggle === 0) {
      if (st.y === st.target) st.fin = true;
      else st.y = st.yDec ? Math.max(st.y - 2, st.target) : Math.min(st.y + 2, st.target);
    }
  };
  const begin = (frame: number, start: number, target: number) => {
    Object.assign(st, { active: true, counter: st.delay, y: start, target, yDec: !(start < target), fin: false, fc: 0, toggle: 0 });
    update(frame);
  };
  for (let frame = createFrame; frame <= lastFrame; frame += 1) {
    if (frame === createFrame) { begin(frame, INIT, TARGET); numBlends -= 1; restore ^= 1; }
    else if (!st.active && numBlends > 0) {
      begin(frame, restore ? TARGET : INIT, numBlends === 1 ? 0 : (restore ? INIT : TARGET)); numBlends -= 1; restore ^= 1;
    }
    update(frame);
  }
  return log;
}
const BLEND_SCHEDULE = curseBlendCycleSchedule(CURSE_DRAW_STEP_FIRST_ROW, CURSE_BLEND_TASK_LAST_ROW + 6);
/** The second BeginNormalPaletteFade row flips BlendColorCycleLoop's numBlends / restore (simulated frame 115, visible 114). */
const BLEND_SECOND_ROW = 114;

export interface CurseStatsTask { readonly slot: number; readonly callback: string; readonly data: readonly number[] }
/** Live visual tasks of row `row` (task slots: the sway / draw task 0, the blend loop 1). */
export function curseStatsTasksAt(row: number, side: CurseStatsSide, attackerSpriteId: number, copySpriteId: number): CurseStatsTask[] {
  const tasks: CurseStatsTask[] = [];
  if (row >= 1 && row < curseSwayEndRow(side)) {
    tasks.push({ slot: 0, callback: "AnimTask_SwayMonStep", data: curseSwayAtStep(side, attackerSpriteId, row).data });
  }
  if (row >= CURSE_DRAW_CREATE_ROW && row <= CURSE_DRAW_TASK_LAST_ROW) {
    const d = new Array(16).fill(0);
    if (row < CURSE_DRAW_STEP_FIRST_ROW) tasks.push({ slot: 0, callback: "AnimTask_DrawFallingWhiteLinesOnAttacker", data: d });
    else {
      const n = row - 78, segment = Math.min(4, Math.floor(n / 16));
      d[0] = copySpriteId; d[10] = segment === 4 ? 0 : 4 * (n % 16); d[11] = segment;
      tasks.push({ slot: 0, callback: "AnimTask_DrawFallingWhiteLinesOnAttacker_Step", data: d });
    }
  }
  if (row >= CURSE_DRAW_STEP_FIRST_ROW && row <= CURSE_BLEND_TASK_LAST_ROW) {
    const second = row >= BLEND_SECOND_ROW, d = new Array(16).fill(0);
    d[0] = 2; d[1] = 4; d[2] = second ? 0 : 1; d[4] = 10; d[5] = 31; d[8] = second ? 0 : 1;
    tasks.push({ slot: 1, callback: "AnimTask_BlendColorCycleLoop", data: d });
  }
  return tasks;
}

/**
 * GPU registers of row `row` from the activation block (row 0) / the body block (rows >= 1): the task's SetGpuReg writes are
 * visible one row later, the BG1 mask scroll `32 - sprite.{x,y} - 4 * (n % 16)` one row after each step; the final step's
 * register reset lands on row 145 (DISPCNT ^= OBJWIN, BG1 charbase 0).
 */
export function curseStatsRegistersAt(row: number, activation: Readonly<Record<string, number>>, body: Readonly<Record<string, number>>,
  attackerSprite: Readonly<{ x: number; y: number }>): Record<string, number> {
  const r: Record<string, number> = { ...(row === 0 ? activation : body) };
  if (row >= CURSE_DRAW_CREATE_ROW && row < CURSE_DRAW_TASK_LAST_ROW) {
    r.bg1cnt = (r.bg1cnt! & ~0xc003 & ~0xc) | 4; r.dispcnt = r.dispcnt! | 0x8000; r.winin = 0x3f3f; r.winout = 0x3f3d;
    r.bldcnt = 0x3f42; r.bldalpha = 0x0c08; r.win0h = 0; r.win0v = 0;
    const n = Math.min(row - 79, 64);
    if (n >= 1) { r.bg1hofs = (32 - attackerSprite.x) & 0x1ff; r.bg1vofs = (32 - attackerSprite.y - 4 * (n % 16)) & 0x1ff; }
  } else if (row >= CURSE_DRAW_TASK_LAST_ROW) {
    r.bg1cnt = r.bg1cnt! & ~0xc003 & ~0xc; r.dispcnt = (r.dispcnt! | 0x8000) ^ 0x8000; r.winin = 0x3f3f; r.winout = 0x3f3f;
    r.bldcnt = 0; r.bldalpha = 0; r.bg1hofs = 0; r.bg1vofs = 0;
  }
  return r;
}

/** gBattle_BG0..3_X/Y of row `row` (the step writes gBattle_BG1_X/Y itself: same row). */
export function curseStatsBattleBgAt(row: number, attackerSprite: Readonly<{ x: number; y: number }>): Record<string, number> {
  const bg: Record<string, number> = { gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0,
    gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: 0 };
  if (row >= CURSE_DRAW_STEP_FIRST_ROW && row <= 143) {
    const n = Math.min(row - 78, 64);
    bg.gBattle_BG1_X = 32 - attackerSprite.x; bg.gBattle_BG1_Y = 32 - attackerSprite.y - 4 * (n % 16);
  }
  return bg;
}

/** BlendPalette (util.c:264) towards RGB_RED. */
const blendRed = (color: number, y: number): number => {
  const f = (a: number, t: number) => a + (((t - a) * y) >> 4);
  return f(color & 31, 31) | f(color >> 5 & 31, 0) << 5 | f(color >> 10 & 31, 0) << 10;
};
/**
 * The 512 hardware palette words of row `row`: the activation palette, the white Curse lines colour at BG index 129
 * (LoadPalette(sCurseLinesPalette, BG_PLTT_ID(8) + 1), row 79) and the attacker OBJ bank blended towards red by the
 * BlendColorCycle schedule (visible one row after each faded frame; the final y = 0 step 4 rows late, prep23 s0.2).
 */
export function curseStatsPaletteAt(row: number, activation: readonly number[], attackerObjBank: number): number[] {
  const palette = [...activation];
  if (row >= CURSE_DRAW_STEP_FIRST_ROW) palette[129] = 0x7fff;
  let y = 0;
  for (const [frame, value] of BLEND_SCHEDULE) {
    if (frame + 1 + (value === 0 && frame > 100 ? CURSE_FINAL_FADE_EXTRA : 0) <= row) y = value;
  }
  const base = (16 + attackerObjBank) * 16;
  if (y) for (let i = 0; i < 16; i += 1) palette[base + i] = blendRed(activation[base + i]!, y);
  return palette;
}

/** Sprite state (for the OAM build) after frame `state`: the attacker's sway x2 and whether the OBJ-window copy exists. */
export function curseStatsSpritesAt(state: number, side: CurseStatsSide): Readonly<{ attackerX2: number; copy: boolean }> {
  const sway = state - (CURSE_BATTLER_OAM_LAG - 1);
  return { attackerX2: sway >= 1 && sway < curseSwayEndRow(side) ? curseSwayAtStep(side, 0, sway).x2 : 0,
    copy: state >= CURSE_COPY_FIRST_ROW - 1 && state <= CURSE_COPY_LAST_ROW - 1 };
}
