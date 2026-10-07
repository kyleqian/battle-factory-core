/**
 * prep32: source-derived per-age caller-owned inputs for MOVE_NIGHTMARE (171, `src/animation/nightmare.ts`).
 *
 * The accepted reducer reads caller-owned per-age state that `tools/compare/verifyNightmareReducer.ts` feeds row by row from the corpus:
 * palettes (unfaded / faded / hardware), the complete register file, the battler sprites (target x2 shake, invisible on the monbg,
 * the first-inactive affine reset), the 64-slot painter order, allocation, clone / task slots and the monbg origin. This module
 * derives every one of them from the activation snapshot (K), the battler anchors (A), the ghost BG palette asset (P) and the
 * source program (S), with two CPU-phase bits (T): the optional lag at age 149 and the row (148 / 149) of the BG-palette restore.
 *
 * Source (reference/pokeemerald): data/battle_anim_scripts.s Move_NIGHTMARE (fadetobg BG_GHOST, waitbgfadein, monbg ANIM_TARGET,
 * createvisualtask AnimTask_NightmareClone, AnimTask_ShakeMon(target, 3, 0, 40, 1), clearmonbg, restorebg, waitbgfadein);
 * battle_anim_ghost.c AnimTask_NightmareClone(_Step); battle_anim.c Task_FadeToBg / MoveBattlerSpriteToBG / Task_UpdateMonBg /
 * Task_ClearMonBg; battle_anim_mons.c CloneBattlerSpriteWithBlend; sprite.c BuildSpritePriorities + SortSprites.
 */
export type Side = "player" | "opponent";
export type Mat = readonly [number, number, number, number];
export interface NmSprite {
  readonly slot: number; readonly template: string; readonly callback: string;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly subpriority: number;
  readonly attr: readonly [number, number, number]; readonly flags: number; readonly matrixNum: number; readonly matrix: Mat; readonly data: readonly number[];
}
/** T: the two CPU-phase bits measured per window (never derived). */
export interface NmPhase { readonly lag149: boolean; readonly restoreRow: 148 | 149 }
/** Activation (row 0) known entry + anchors + asset palette: everything the model starts from. */
export interface NmKnown {
  readonly attackerSide: Side;
  readonly registers0: Readonly<Record<string, number>>;              // K
  readonly unfaded0: readonly number[]; readonly faded0: readonly number[]; readonly hardware0: readonly number[]; // K (composite)
  readonly attacker0: NmSprite; readonly target0: NmSprite;           // K / A (battler sprites at activation)
  readonly order0: readonly number[];                                  // L (lent 64-slot sSpriteOrder at activation)
  readonly hostKeys: ReadonlyMap<number, readonly [number, number]>;   // K: in-use host sprites (healthboxes ...) sort keys
  readonly inUse0: readonly number[];                                  // K: occupied slots at activation
  readonly ghostPalette: readonly number[];                            // P: gBattleAnimBgPalette_Ghost (16 BGR555 words)
  readonly battlerMatrix: Readonly<{ attacker: number; target: number }>; // K: the battlers' own matrices (first-inactive reset)
  readonly spriteCallbackDummy: number;                                // K: SpriteCallbackDummy address (StoreSpriteCallbackInData6)
}

export const NM = { GHOST_PAL: 21, MONBG: 40, MONBG_REG: 41, CLONE: 43, CLONE_LAST: 122, SHAKE_FIRST: 45, SHAKE_LAST: 120, BG_SHOWN_LAST: 126, FIRST_INACTIVE_LAG: 168 } as const;

/** No-lag windows are the lag program with row 149 deleted: program age of a window row. */
export const programAge = (row: number, p: NmPhase): number => (!p.lag149 && row >= 149 ? row + 1 : row);
export const firstInactive = (p: NmPhase): number => (p.lag149 ? 168 : 167);
const shakeX = (age: number): number => (age < NM.SHAKE_FIRST || age > NM.SHAKE_LAST ? 0 : Math.floor((age - 45) / 2) % 2 === 0 ? 3 : 0);
const s16 = (v: number): number => ((v & 0xffff) ^ 0x8000) - 0x8000;

/** The monbg selection (MoveBattlerSpriteToBG): an opponent target goes to BG1, a player target to BG2 (singles). */
export const monbgBg = (k: NmKnown): "bg1" | "bg2" => (k.attackerSide === "player" ? "bg1" : "bg2");
/** gBattle_BGn_X / Y written by MoveBattlerSpriteToBG: -(x + x2) + 32 / -(y + y2) + 32 (both BGs in singles). */
export function monbgOrigin(k: NmKnown): { x: number; y: number } {
  const t = k.target0;
  return { x: -(t.x + t.x2) + 32, y: -(t.y + t.y2) + 32 };
}

/** Palettes of a window row (unfaded / faded: LoadPalette writes both; hardware = faded of the previous row, row 40 = same row). */
export function nmPalettes(row: number, k: NmKnown, p: NmPhase): { unfaded: number[]; faded: number[]; hardware: number[] } {
  const at = (r: number, base: readonly number[]): number[] => {
    const out = [...base];
    const restored = r >= p.restoreRow;
    if (r >= NM.GHOST_PAL && !restored) for (let i = 0; i < 16; i += 1) out[32 + i] = k.ghostPalette[i]!;
    if (r >= NM.MONBG) {                         // MoveBattlerSpriteToBG: target OBJ palette -> BG palette 8 (BG1) / 9 (BG2)
      const bank = monbgBg(k) === "bg1" ? 8 : 9, obj = 16 + (k.target0.attr[2] >>> 12 & 0xf);
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
/** Complete register file of a window row (S over registers0; only BLD*, the monbg BGnCNT / HOFS / VOFS move). */
export function nmRegisters(row: number, k: NmKnown, p: NmPhase): Record<string, number> {
  const a = programAge(row, p), reg: Record<string, number> = { ...k.registers0 }, bg = monbgBg(k), o = monbgOrigin(k);
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

/** Battler sprites of a window row: ShakeMon x2, invisible while on the monbg, first-inactive affine reset to the own matrix. */
export function nmBattlers(row: number, k: NmKnown, p: NmPhase): { attacker: NmSprite; target: NmSprite } {
  const a = programAge(row, p), end = row >= firstInactive(p);
  const reset = (s: NmSprite, m: number): NmSprite => ({ ...s, attr: [s.attr[0] | 0x100, (s.attr[1] & ~0x3e00) | m << 9, s.attr[2]], matrixNum: m });
  let target: NmSprite = { ...k.target0, x2: shakeX(a), flags: a >= NM.MONBG && a <= NM.BG_SHOWN_LAST ? k.target0.flags | 4 : k.target0.flags };
  let attacker: NmSprite = { ...k.attacker0 };
  if (end) { attacker = reset(attacker, k.battlerMatrix.attacker); target = reset(target, k.battlerMatrix.target); }
  return { attacker, target };
}

/** CloneBattlerSpriteWithBlend: first free slot, a struct copy of the target with OBJ blend and invisible cleared (S + K). */
export function nmClone(k: NmKnown) {
  let slot = 0; while (k.inUse0.includes(slot)) slot += 1;
  const t = k.target0, cb = k.spriteCallbackDummy;
  return { slot, template: "gMultiuseSpriteTemplate" as const, attr: t.attr, flags: t.flags & ~4, matrixNum: t.matrixNum, matrix: t.matrix,
    subpriority: t.subpriority, dataTail: [t.data[5]!, s16(cb & 0xffff), s16(cb >>> 16)] as [number, number, number], sourceCreationOrder: 0 };
}
/** Clone OAM y (attr0 low byte) at a program age, as the reducer's TranslateSpriteLinearFixedPoint. */
/** The sort of row r runs (BuildOamBuffer) before that row's RunTasks: the clone created by the script command on row 43 is sorted on 43,
 *  the clone destroyed by AnimTask_NightmareClone_Step on row 123 still holds its key in row 123's sort (gone from 124). */
const cloneOamY = (a: number, k: NmKnown): number | null => {
  if (a < NM.CLONE || a > NM.CLONE_LAST + 1) return null;
  const dy = k.attackerSide === "player" ? -112 : 112;   // target opponent: up-right (dy -112); target player: dy +112
  return (k.target0.attr[0] + Math.floor((dy * Math.min(a - 42, 80)) / 256)) & 0xff;
};

/** BuildSpritePriorities + SortSprites (sprite.c): priority << 8 | subpriority ascending, equal -> larger signed oam.y first; free = dummy (3 << 8 | 0xff, y 160). */
export function sortOnce(prev: readonly number[], keys: ReadonlyMap<number, readonly [number, number]>): number[] {
  const key = (s: number): readonly [number, number] => keys.get(s) ?? [3 << 8 | 0xff, 160];
  const sy = (y: number): number => (y >= 160 ? y - 256 : y);
  const o = [...prev];
  for (let i = 1; i < o.length; i += 1) {
    let j = i;
    while (j > 0) {
      const [p1, y1] = key(o[j - 1]!), [p2, y2] = key(o[j]!);
      if (p1 > p2 || (p1 === p2 && sy(y1) < sy(y2))) { [o[j - 1], o[j]] = [o[j]!, o[j - 1]!]; j -= 1; } else break;
    }
  }
  return o;
}
/** Painter order of every window row (one pass per row from the lent activation order; lag rows hold the keys so the pass is idempotent). */
export function nmOrders(rows: number, k: NmKnown, p: NmPhase): number[][] {
  const clone = nmClone(k), out: number[][] = [];
  let prev = [...k.order0];
  for (let r = 0; r < rows; r += 1) {
    if (r > 0) {
      const a = programAge(r, p), b = nmBattlers(r, k, p), keys = new Map(k.hostKeys);
      for (const s of [b.attacker, b.target]) keys.set(s.slot, [(s.attr[2] >>> 10 & 3) << 8 | s.subpriority, s.attr[0] & 0xff]);
      const cy = cloneOamY(a, k);
      if (cy !== null) keys.set(clone.slot, [(clone.attr[2] >>> 10 & 3) << 8 | clone.subpriority, cy]);
      prev = sortOnce(prev, keys);
    }
    out.push(prev);
  }
  return out;
}
