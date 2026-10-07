/**
 * MOVE_NIGHTMARE (171) live inputs (docs/next-adapters-prep32.md s1 / s3, D4 faithful timing). Every caller-owned per-age input of the
 * accepted reducer (`src/animation/nightmare.ts nightmareAtAge`) from the source-derived prep32 model, ported 1:1 from
 * tools/integration/prep32NightmareModel.ts (nmPalettes / nmRegisters / nmBattlers / nmClone / nmOrders / monbgOrigin / programAge) and
 * prep32NightmareLib.ts liveInputs. The row-0 snapshot of the prototype (knownFor) is replaced by host values: the activation register file
 * (the known-entry S0 block with WIN0 0,0: Nightmare always follows an earlier body, history H), the asset palette composite, the battler
 * anchors, the known-entry host sprites / occupied slots, the gBattleAnimBgPalette_Ghost asset and the lent activation order. Never a
 * capture row.
 *
 * Source (reference/pokeemerald): data/battle_anim_scripts.s Move_NIGHTMARE (fadetobg BG_GHOST, waitbgfadein, monbg ANIM_TARGET,
 * createvisualtask AnimTask_NightmareClone, AnimTask_ShakeMon(target, 3, 0, 40, 1), clearmonbg, restorebg, waitbgfadein);
 * battle_anim_ghost.c AnimTask_NightmareClone(_Step); battle_anim.c Task_FadeToBg / MoveBattlerSpriteToBG / Task_UpdateMonBg /
 * Task_ClearMonBg; battle_anim_mons.c CloneBattlerSpriteWithBlend; sprite.c BuildSpritePriorities + SortSprites.
 *
 * Two CPU-phase (D4) bits the source does not determine (prep32 s1.4) come from src/engine/liveMoveTimingPolicy.ts: `lag149` (the
 * optional lag at age 149) and `restoreRow` (the Task_FadeToBg BG-palette restore row 148 | 149; display-neutral: BLDY 16 on 146..150).
 */
import type { LiveSpriteOrderSort } from "./liveMoveOamAssembler.ts";

type Side = "player" | "opponent";
type Mat = readonly [number, number, number, number];
export interface LiveNightmareSprite {
  readonly slot: number; readonly template: string; readonly callback: string;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly subpriority: number;
  readonly attr: readonly [number, number, number]; readonly flags: number; readonly matrixNum: number; readonly matrix: Mat; readonly data: readonly number[];
}
/** T: the two CPU-phase bits (liveMoveTimingPolicy.ts MOVE_NIGHTMARE). */
export interface LiveNightmarePhase { readonly lag149: boolean; readonly restoreRow: 148 | 149 }
/** Activation state the model starts from (host values only). */
export interface LiveNightmareKnown {
  readonly attackerSide: Side;
  readonly registers0: Readonly<Record<string, number>>;
  readonly unfaded0: readonly number[]; readonly faded0: readonly number[]; readonly hardware0: readonly number[];
  readonly attacker0: LiveNightmareSprite; readonly target0: LiveNightmareSprite;
  /** The lent 64-slot sSpriteOrder at activation. */
  readonly order0: readonly number[];
  /** In-use non-battler host sprites (healthboxes / bars, shadow): attr + subpriority (sort keys). */
  readonly hostSprites: readonly Readonly<{ slot: number; attr: readonly [number, number, number]; subpriority: number }>[];
  readonly inUse0: readonly number[];
  /** gBattleAnimBgPalette_Ghost (16 BGR555 words). */
  readonly ghostPalette: readonly number[];
  /** The battlers' own matrices (first-inactive affine reset): player 1, opponent 2. */
  readonly battlerMatrix: Readonly<{ attacker: number; target: number }>;
  readonly spriteCallbackDummy: number;
}

export const LIVE_NIGHTMARE = Object.freeze({ GHOST_PAL: 21, MONBG: 40, MONBG_REG: 41, CLONE: 43, CLONE_LAST: 122, SHAKE_FIRST: 45, SHAKE_LAST: 120,
  BG_SHOWN_LAST: 126 });
const NM = LIVE_NIGHTMARE;

/** No-lag bodies are the lag program with row 149 deleted: program age of a body row. */
export const liveNightmareProgramAge = (row: number, p: LiveNightmarePhase): number => (!p.lag149 && row >= 149 ? row + 1 : row);
export const liveNightmareFirstInactive = (p: LiveNightmarePhase): number => (p.lag149 ? 168 : 167);
const shakeX = (age: number): number => (age < NM.SHAKE_FIRST || age > NM.SHAKE_LAST ? 0 : Math.floor((age - 45) / 2) % 2 === 0 ? 3 : 0);
const s16 = (v: number): number => ((v & 0xffff) ^ 0x8000) - 0x8000;

/** The monbg selection (MoveBattlerSpriteToBG): an opponent target goes to BG1, a player target to BG2 (singles). */
export const liveNightmareMonbgBg = (k: LiveNightmareKnown): "bg1" | "bg2" => (k.attackerSide === "player" ? "bg1" : "bg2");
/** gBattle_BGn_X / Y written by MoveBattlerSpriteToBG: -(x + x2) + 32 / -(y + y2) + 32 (both BGs in singles). */
export function liveNightmareMonbgOrigin(k: LiveNightmareKnown): { x: number; y: number } {
  const t = k.target0;
  return { x: -(t.x + t.x2) + 32, y: -(t.y + t.y2) + 32 };
}

/** Palettes of a body row (unfaded / faded: LoadPalette writes both; hardware = faded of the previous row, row 40 = same row). */
export function liveNightmarePalettes(row: number, k: LiveNightmareKnown, p: LiveNightmarePhase): { unfaded: number[]; faded: number[]; hardware: number[] } {
  const at = (r: number, base: readonly number[]): number[] => {
    const out = [...base];
    const restored = r >= p.restoreRow;
    if (r >= NM.GHOST_PAL && !restored) for (let i = 0; i < 16; i += 1) out[32 + i] = k.ghostPalette[i]!;
    if (r >= NM.MONBG) {                         // MoveBattlerSpriteToBG: target OBJ palette -> BG palette 8 (BG1) / 9 (BG2)
      const bank = liveNightmareMonbgBg(k) === "bg1" ? 8 : 9, obj = 16 + (k.target0.attr[2] >>> 12 & 0xf);
      for (let i = 0; i < 16; i += 1) out[bank * 16 + i] = base[obj * 16 + i]!;
    }
    return out;
  };
  const unfaded = at(row, k.unfaded0), faded = at(row, k.faded0);
  const hardware = row === 0 ? [...k.hardware0] : row === NM.MONBG ? faded : at(row - 1, k.faded0);
  return { unfaded, faded, hardware };
}

function fadeLevel(age: number): number {
  if (age >= 3 && age <= 18) return age - 2;
  if (age >= 19 && age <= 22) return 16;
  if (age >= 23 && age <= 38) return 38 - age;
  if (age >= 129 && age <= 131) return 1;
  if (age >= 132 && age <= 146) return age - 130;
  if (age >= 145 && age <= 150) return 16;
  if (age >= 151 && age <= 166) return 166 - age;
  return 0;
}
function cloneBlend(age: number): number {
  let eva = 15, evb = 2;
  for (let step = 1; step <= age - 43; step += 1) { const ph = step & 3; if (ph === 1 && eva > 0) eva -= 1; if (ph === 3 && evb <= 15) evb += 1; }
  return evb << 8 | eva;
}
/** Complete register file of a body row (S over registers0; only BLD*, the monbg BGnCNT / HOFS / VOFS move). */
export function liveNightmareRegisters(row: number, k: LiveNightmareKnown, p: LiveNightmarePhase): Record<string, number> {
  const a = liveNightmareProgramAge(row, p), reg: Record<string, number> = { ...k.registers0 }, bg = liveNightmareMonbgBg(k), o = liveNightmareMonbgOrigin(k);
  reg.bldcnt = (a >= 2 && a <= 38) || (a >= 128 && a <= 166) ? 0xe8 : a >= 43 && a <= 125 ? 0x3f40 : 0;
  reg.bldalpha = a >= 43 && a <= 125 ? cloneBlend(a) : 0;
  reg.bldy = fadeLevel(a);
  if (a >= NM.MONBG_REG) {
    reg[`${bg}cnt`] = (k.registers0[`${bg}cnt`]! & ~0xc003 | 0x4000 | 2) & 0xffff;   // MoveBattlerSpriteToBG: priority 2, 256x512 text BG
    const src = a - 1 >= 40 && a - 1 < 130 ? { x: o.x - shakeX(a - 1), y: o.y } : { x: 0, y: 0 }; // Task_UpdateMonBg copies the previous row's scroll
    reg[`${bg}hofs`] = src.x & 0x1ff; reg[`${bg}vofs`] = src.y & 0x1ff;
  }
  return reg;
}

/** Battler sprites of a body row: ShakeMon x2, invisible while on the monbg, first-inactive affine reset to the own matrix. */
export function liveNightmareBattlers(row: number, k: LiveNightmareKnown, p: LiveNightmarePhase): { attacker: LiveNightmareSprite; target: LiveNightmareSprite } {
  const a = liveNightmareProgramAge(row, p), end = row >= liveNightmareFirstInactive(p);
  const reset = (s: LiveNightmareSprite, m: number): LiveNightmareSprite =>
    ({ ...s, attr: [s.attr[0] | 0x100, (s.attr[1] & ~0x3e00) | m << 9, s.attr[2]], matrixNum: m });
  let target: LiveNightmareSprite = { ...k.target0, x2: shakeX(a), flags: a >= NM.MONBG && a <= NM.BG_SHOWN_LAST ? k.target0.flags | 4 : k.target0.flags };
  let attacker: LiveNightmareSprite = { ...k.attacker0 };
  if (end) { attacker = reset(attacker, k.battlerMatrix.attacker); target = reset(target, k.battlerMatrix.target); }
  return { attacker, target };
}

/** CloneBattlerSpriteWithBlend: first free slot, a struct copy of the target with OBJ blend and invisible cleared (S + K). */
export function liveNightmareClone(k: LiveNightmareKnown) {
  let slot = 0; while (k.inUse0.includes(slot)) slot += 1;
  const t = k.target0, cb = k.spriteCallbackDummy;
  return { slot, template: "gMultiuseSpriteTemplate" as const, attr: t.attr, flags: t.flags & ~4, matrixNum: t.matrixNum, matrix: t.matrix,
    subpriority: t.subpriority, dataTail: [t.data[5] ?? 0, s16(cb & 0xffff), s16(cb >>> 16)] as [number, number, number], sourceCreationOrder: 0 };
}
/** Clone OAM y (attr0 low byte) at a program age, as the reducer's TranslateSpriteLinearFixedPoint. The sort of row r runs
 *  (BuildOamBuffer) before that row's RunTasks: the clone created by the script command on row 43 is sorted on 43, the clone destroyed
 *  by AnimTask_NightmareClone_Step on row 123 still holds its key in row 123's sort (gone from 124). */
const cloneOamY = (a: number, k: LiveNightmareKnown): number | null => {
  if (a < NM.CLONE || a > NM.CLONE_LAST + 1) return null;
  const dy = k.attackerSide === "player" ? -112 : 112;   // target opponent: up-right (dy -112); target player: dy +112
  return (k.target0.attr[0] + Math.floor((dy * Math.min(a - 42, 80)) / 256)) & 0xff;
};
const signedY = (y: number): number => (y >= 160 ? y - 256 : y);

/** Painter order of every body row (one BuildSpritePriorities + SortSprites pass per row from the lent activation order; free slots carry
 *  the dummy key; lag rows hold the keys so the pass is idempotent). */
export function liveNightmareOrders(rows: number, k: LiveNightmareKnown, p: LiveNightmarePhase, sort: LiveSpriteOrderSort): number[][] {
  const clone = liveNightmareClone(k), out: number[][] = [];
  const host = new Map(k.hostSprites.map((s) => [s.slot, s] as const));
  let prev = [...k.order0];
  for (let r = 0; r < rows; r += 1) {
    if (r > 0) {
      const a = liveNightmareProgramAge(r, p), b = liveNightmareBattlers(r, k, p);
      const keyed = new Map<number, Readonly<{ attr: readonly [number, number, number]; subpriority: number; oamY: number }>>();
      for (const [slot, s] of host) keyed.set(slot, { attr: s.attr, subpriority: s.subpriority, oamY: s.attr[0] & 0xff });
      for (const s of [b.attacker, b.target]) keyed.set(s.slot, { attr: s.attr, subpriority: s.subpriority, oamY: s.attr[0] & 0xff });
      const cy = cloneOamY(a, k);
      if (cy !== null) keyed.set(clone.slot, { attr: clone.attr, subpriority: clone.subpriority, oamY: cy });
      prev = sort(prev, prev.map((slot) => {
        const s = keyed.get(slot);
        return s ? { slot, priority: (s.attr[2] >>> 10 & 3) as 0 | 1 | 2 | 3, subpriority: s.subpriority, y: signedY(s.oamY) }
          : { slot, priority: 3 as const, subpriority: 0xff, y: signedY(160) };
      }));
    }
    out.push(prev);
  }
  return out;
}
