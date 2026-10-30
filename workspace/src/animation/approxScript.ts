// apx222 (docs/finish-plan.md Phase 2): approximate move bodies built from their battle_anim_scripts.s scripts for moves that have no
// proven adapter (the "no-adapter" class) and for the Ghost-type Curse (the "turn-0" class). Each body is a pure function of
// (age, battler geometry): the script's sprite templates and tasks reduced to battler offsets / affine matrices and a short sprite list,
// composed from the src/animation components (horizontalLunge, shakeMon, shakeMon2). They are classified `approx:*` and never counted
// exact: the BG blend / palette tasks, sound, OAM priorities and the exact sprite allocator are not modelled.
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { shakeMonSequence } from "./shakeMon.ts";
import { shakeMon2Sequence } from "./shakeMon2.ts";

export type ApproxScriptBody =
  | "PECK" | "ODOR_SLEUTH" | "FALSE_SWIPE" | "GUST" | "PAY_DAY" | "BARRAGE" | "CONVERSION_2" | "CURSE_GHOST";
export type ApproxScriptSheet = "impact" | "slash2" | "gust" | "coin" | "conversion" | "redBall" | "ghostlySpirit" | "nail" | "nailFlip";
export type ApproxScriptSide = "player" | "opponent";
export interface ApproxScriptPoint { readonly x: number; readonly y: number }
export interface ApproxScriptMatrix { readonly a: number; readonly b: number; readonly c: number; readonly d: number }
export interface ApproxScriptOffset { readonly x2: number; readonly y2: number }

export interface ApproxScriptContext {
  readonly attackerSide: ApproxScriptSide;
  readonly targetSide: ApproxScriptSide;
  readonly attackerCenter: ApproxScriptPoint;
  readonly targetCenter: ApproxScriptPoint;
}

export interface ApproxScriptSprite {
  readonly sheet: ApproxScriptSheet;
  /** First tile of the frame in the sheet's 1D tile order and its size in tiles. */
  readonly tile: number;
  readonly columns: number;
  readonly rows: number;
  /** Sprite center. */
  readonly x: number;
  readonly y: number;
  readonly matrix: ApproxScriptMatrix | null;
  /** BLDALPHA first-target coefficient (0..16) blended over what is drawn below; null: opaque. */
  readonly blend: number | null;
}

export interface ApproxScriptFrame {
  readonly active: boolean;
  readonly attackerOffset: ApproxScriptOffset;
  readonly attackerMatrix: ApproxScriptMatrix | null;
  readonly targetOffset: ApproxScriptOffset;
  readonly targetMatrix: ApproxScriptMatrix | null;
  /** Extra copies of the target battler (Odor Sleuth's clones), drawn over the target. */
  readonly targetClones: readonly ApproxScriptOffset[];
  /** BLDY darken (0..16) of the battle background only (Curse's black field). */
  readonly bgDark: number;
  readonly sprites: readonly ApproxScriptSprite[];
}

const ZERO: ApproxScriptOffset = Object.freeze({ x2: 0, y2: 0 });
const sineOf = (angle: number, amplitude: number) => GBA_SINE_TABLE_256[angle & 0xff]! * amplitude >> 8;
const cosineOf = (angle: number, amplitude: number) => GBA_SINE_TABLE_256[angle + 64 & 0xff]! * amplitude >> 8;

function rotationMatrix(angle: number): ApproxScriptMatrix {
  const index = angle >> 8 & 0xff;
  const sin = GBA_SINE_TABLE_256[index]!;
  const cos = GBA_SINE_TABLE_256[index + 64 & 0xff]!;
  return { a: cos, b: -sin, c: sin, d: cos };
}

/** gAffineAnims_HitSplat scale 0xB0 / 0x80 / 0xD8 -> the OAM matrix (256*256 / scale). */
const SPLAT_MATRIX: Readonly<Record<1 | 2 | 3, ApproxScriptMatrix>> = Object.freeze({
  1: { a: 303, b: 0, c: 0, d: 303 }, 2: { a: 372, b: 0, c: 0, d: 372 }, 3: { a: 512, b: 0, c: 0, d: 512 },
});

const SHEET_FRAME = { impact: [0, 4, 4], gust: [0, 4, 8], redBall: [0, 4, 4], ghostlySpirit: [0, 4, 4] } as const;

function sprite(sheet: ApproxScriptSheet, x: number, y: number, matrix: ApproxScriptMatrix | null = null,
  frame: readonly [number, number, number] | null = null, blend: number | null = null): ApproxScriptSprite {
  const [tile, columns, rows] = frame ?? (SHEET_FRAME as Record<string, readonly [number, number, number]>)[sheet]!;
  return { sheet, tile, columns, rows, x, y, matrix, blend };
}

/** SetAnimSpriteInitialXOffset: the x argument points toward the opponent for a player attacker. */
const towardTarget = (ctx: ApproxScriptContext) => (ctx.attackerSide === "player" ? 1 : -1);

/** AnimHitSplatBasic: the affine anim's single 8-tick frame, then destroyed. */
function basicSplat(age: number, spawn: number, ctx: ApproxScriptContext, animation: 1 | 2 | 3, dx = 0, dy = 0): ApproxScriptSprite[] {
  const local = age - spawn;
  if (local < 0 || local > 8) return [];
  return [sprite("impact", ctx.targetCenter.x + towardTarget(ctx) * dx, ctx.targetCenter.y + dy, SPLAT_MATRIX[animation])];
}

/** AnimFlashingHitSplat_Step: toggles every tick, destroyed after 14 callbacks. */
function flashingSplat(age: number, spawn: number, ctx: ApproxScriptContext, animation: 1 | 2 | 3, dx = 0, dy = 0, lastTick = 13): ApproxScriptSprite[] {
  const local = age - spawn;
  if (local < 0 || local > lastTick || local % 2 === 1) return [];
  return [sprite("impact", ctx.targetCenter.x + towardTarget(ctx) * dx, ctx.targetCenter.y + dy, SPLAT_MATRIX[animation])];
}

function atTick(sequence: readonly ApproxScriptOffset[], tick: number): ApproxScriptOffset {
  return tick < 0 ? ZERO : sequence[tick] ?? ZERO;
}

const frameOf = (age: number, last: number, parts: Partial<ApproxScriptFrame>): ApproxScriptFrame => ({
  active: age >= 0 && age <= last, attackerOffset: ZERO, attackerMatrix: null, targetOffset: ZERO, targetMatrix: null,
  targetClones: [], bgDark: 0, sprites: [], ...parts,
});

// ---- Move_PECK: AnimTask_RotateMonToSideAndRestore (3 ticks out, 3 back) + a flashing hit splat at x=-12 -------------------------
// The ROM draws nothing for 8 frames after the command starts; the driver holds age 0 for 4 rows, so the body starts at age 5.
// The flashing splat (14 callbacks) is last visible on its 11th tick; the splat sits at the target's pic offset, 8 px below the center.
const PECK_LEAD = 5;
const PECK_LAST = PECK_LEAD + 10;
function peck(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  const tick = age - PECK_LEAD;
  // data3 = -+768 * step (sign flips for an opponent target), the y2 offset is |matrix c| >> 3 (SetBattlerSpriteYOffsetFromRotation).
  const steps = [1, 2, 3, 2, 1, 0][tick] ?? 0;
  const angle = (ctx.targetSide === "opponent" ? -768 : 768) * steps;
  const targetMatrix = tick >= 0 && tick <= 4 ? rotationMatrix(angle) : null;
  return frameOf(age, PECK_LAST, {
    targetMatrix, targetOffset: targetMatrix ? { x2: 0, y2: Math.abs(targetMatrix.c) >> 3 } : ZERO,
    sprites: flashingSplat(tick, 0, ctx, 3, -12, 8, 10),
  });
}

// ---- Move_ODOR_SLEUTH: two blend clones of the target swinging +-24 px for 60 ticks, shrinking; two attacker lunges --------------
const ODOR_SLEUTH_LAST = 80;
function odorSleuth(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  // MoveOdorSleuthClone: x2 = Cos(angle, amplitude); angle steps +16 / -16; amplitude 24 for 60 ticks, then -2 per tick; the toggle runs first in each callback (tick n = age + 1), so one clone is visible per tick.
  const clone = (start: number, step: number, visibleFirst: boolean): ApproxScriptOffset[] => {
    if (age > 72) return [];
    const amplitude = age < 60 ? 24 : Math.max(0, 24 - 2 * (age - 60));
    const visible = (Math.floor((age + 1) / 2) % 2 === 0) === visibleFirst;
    return visible ? [{ x2: cosineOf(start + step * (age + 1), amplitude), y2: 0 }] : [];
  };
  const lunge = horizontalLungeX2AtTick(3, 4, ctx.attackerSide, age - 26) + horizontalLungeX2AtTick(3, 4, ctx.attackerSide, age - 34);
  return frameOf(age, ODOR_SLEUTH_LAST, {
    attackerOffset: { x2: lunge, y2: 0 }, targetClones: [...clone(0, 16, true), ...clone(128, -16, false)],
  });
}

// ---- Move_FALSE_SWIPE: a slash_2 slice sweeping the target, six positioned slices, then ShakeMon + a hit splat ---------------
// The ROM draws nothing for 10 frames after the command starts (the driver holds age 0 for 4 rows): the body starts at age 7. Its first
// slice frame is shown for 3 ticks, the main slice does not blink and is last drawn the tick before the splat.
const SLASH_FRAME = (frame: number) => [frame * 16, 4, 4] as const;
const FALSE_SWIPE_LEAD = 7;
const FALSE_SWIPE_SLICE_END = 58;
const FALSE_SWIPE_SHAKE = shakeMonSequence(5, 0, 6, 1);
const FALSE_SWIPE_LAST = FALSE_SWIPE_LEAD + FALSE_SWIPE_SLICE_END + FALSE_SWIPE_SHAKE.length;
function falseSwipe(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  const tick = age - FALSE_SWIPE_LEAD;
  const tx = ctx.targetCenter.x - 48;
  const sprites: ApproxScriptSprite[] = [];
  // AnimFalseSwipeSlice: 4 frames x 4 ticks, a 9-tick wait, then 12 steps of +8 px until it is destroyed.
  if (tick >= 0 && tick < FALSE_SWIPE_SLICE_END - 1) {
    sprites.push(sprite("slash2", tx + 8 * Math.min(12, Math.max(0, tick - 25)), ctx.targetCenter.y, null,
      SLASH_FRAME(Math.min(3, Math.floor((tick + 1) / 4)))));
  }
  // AnimFalseSwipePositionedSlice x6 every 4 ticks from tick 18: the last frame, blinking every 2 ticks for 18 ticks.
  for (let i = 0; i < 6; i += 1) {
    const local = tick - (18 + 4 * i);
    if (local < 0 || local > 17 || (local >= 2 && Math.floor(local / 2) % 2 === 1)) continue;
    sprites.push(sprite("slash2", tx + 16 * i, ctx.targetCenter.y, null, SLASH_FRAME(3)));
  }
  sprites.push(...basicSplat(tick, FALSE_SWIPE_SLICE_END, ctx, 3));
  return frameOf(age, FALSE_SWIPE_LAST, { targetOffset: atTick(FALSE_SWIPE_SHAKE, tick - FALSE_SWIPE_SLICE_END), sprites });
}

// ---- Move_GUST: AnimEllipticalGust (spawned at (0, -16) from the target, then y += 20; 71 ticks) -> ShakeMon2 + a hit splat -------------------------------------------------------
const GUST_END = 70;
const GUST_SHAKE = shakeMon2Sequence(1, 0, 7, 1);
const GUST_LAST = GUST_END + 1 + GUST_SHAKE.length;
function gust(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  const sprites: ApproxScriptSprite[] = [];
  if (age < GUST_END) {
    const angle = 191 + 5 * age;
    sprites.push(sprite("gust", ctx.targetCenter.x + sineOf(angle, 32), ctx.targetCenter.y + 4 + cosineOf(angle, 8)));
  }
  sprites.push(...basicSplat(age, GUST_END + 1, ctx, 2));
  return frameOf(age, GUST_LAST, { targetOffset: atTick(GUST_SHAKE, age - GUST_END - 1), sprites });
}

// ---- Move_PAY_DAY: a rotated coin thrown at the target (speed 1152), then a hit splat, ShakeMon2 and a bouncing falling coin ----
const PAY_DAY_SHAKE = shakeMon2Sequence(1, 0, 6, 1);
const COIN_FRAME = [8, 2, 2] as const;
const FALLING_COIN_LIFE = 50;
// The ROM draws nothing for 13 frames after the command starts (the driver holds age 0 for 4 rows): the body starts at age 10.
// InitAnimLinearTranslationWithSpeedAndPos at speed 1152: the coin is drawn for 19 ticks, the splat lands 20 ticks after the throw.
const PAY_DAY_LEAD = 10;
const PAY_DAY_COIN_TICKS = 19;
const PAY_DAY_FLIGHT_TICKS = 20;
const payDayFrom = (ctx: ApproxScriptContext): ApproxScriptPoint =>
  ({ x: ctx.attackerCenter.x + towardTarget(ctx) * 20, y: ctx.attackerCenter.y });
function payDay(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  const tick = age - PAY_DAY_LEAD;
  const from = payDayFrom(ctx);
  const to = ctx.targetCenter;
  const sprites: ApproxScriptSprite[] = [];
  if (tick >= 0 && tick < PAY_DAY_COIN_TICKS) {
    const t = tick / 18;
    const angle = Math.round(Math.atan2(to.y - from.y, to.x - from.x) * 65536 / (2 * Math.PI)) - 0x4000;
    sprites.push(sprite("coin", Math.round(from.x + (to.x - from.x) * t), Math.round(from.y + (to.y - from.y) * t),
      rotationMatrix(angle), COIN_FRAME));
  }
  const landed = PAY_DAY_FLIGHT_TICKS;
  sprites.push(...basicSplat(tick, landed, ctx, 2));
  // AnimFallingCoin_Step: x2 drifts away at half a pixel per tick, y2 = Sin(phase, -16) then -8, phase +5 per tick, two bounces.
  const k = tick - landed;
  if (k >= 0 && k < FALLING_COIN_LIFE) {
    const bounce = Math.floor(k / 26);
    const phase = (k % 26) * 5;
    const drift = (k + 1) >> 1;
    sprites.push(sprite("coin", ctx.targetCenter.x + (ctx.attackerSide === "player" ? -drift : drift),
      ctx.targetCenter.y + 8 + sineOf(phase, bounce === 0 ? -16 : -8), rotationMatrix(((k + 1) * 10 & 0xff) << 8), COIN_FRAME));
  }
  return frameOf(age, PAY_DAY_LEAD + landed + FALLING_COIN_LIFE, { targetOffset: atTick(PAY_DAY_SHAKE, k + 1), sprites });
}

// ---- Move_BARRAGE: AnimTask_BarrageBall (a red ball arcing to the target; affine anim 1: -4 per tick, anim 2 for an opponent: -64 then +4 per tick, 24 ticks) + ShakeMon at age 26 ---------------------------------
const BARRAGE_SHAKE = shakeMonSequence(0, 4, 20, 1);
const BARRAGE_SHAKE_START = 26;
const BARRAGE_BALL_END = 57;
const BARRAGE_LAST = Math.max(BARRAGE_BALL_END, BARRAGE_SHAKE_START + BARRAGE_SHAKE.length);
function barrage(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  const sprites: ApproxScriptSprite[] = [];
  if (age < BARRAGE_BALL_END) {
    // Two ticks per step for 8 steps, then one tick per step (16 in all); TranslateAnimHorizontalArc resets y2 to the linear y each step, then adds Sin(step * 0x8000/16 >> 8, -32).
    const steps = age < 2 ? 0 : age <= 16 ? Math.floor(age / 2) : Math.min(16, 8 + age - 16);
    // Y_PIC_OFFSET + HEIGHT / 4 (the species' own height is not carried by the context: 48 / 4).
    const target = { x: ctx.targetCenter.x, y: ctx.targetCenter.y + 12 };
    const arc = steps === 0 ? 0 : sineOf(steps * 8, -32);
    const flicker = age >= 27 ? Math.floor((age - 25) / 2) % 2 === 1 : false;
    if (!flicker) {
      sprites.push(sprite("redBall",
        Math.round(ctx.attackerCenter.x + (target.x - ctx.attackerCenter.x) * steps / 16),
        Math.round(ctx.attackerCenter.y + (target.y - ctx.attackerCenter.y) * steps / 16) + arc,
        rotationMatrix(((ctx.attackerSide === "opponent" ? -64 + 4 * Math.min(24, age) : -4 * Math.min(24, age)) & 0xff) << 8)));
    }
  }
  return frameOf(age, BARRAGE_LAST, { targetOffset: atTick(BARRAGE_SHAKE, age - BARRAGE_SHAKE_START), sprites });
}

// ---- Move_CONVERSION_2: 16 conversion tiles (16x16: affine 0x200 on 8x8) on the anim target, each held then flying to the attacker over 30 ticks; BLDALPHA 0 -> 16 ----
// MOVE_CONVERSION_2 is MOVE_TARGET_USER, so the anim target is the user: the grid sits on the user (ROM: the user whitens under the tiles
// and is revealed row by row as they converge on its centre).
const CONVERSION_GRID = [-24, -8, 8, 24] as const;
const CONVERSION_SPAWN = 2;
// The tiles start on BATTLER_COORD_Y_2 and land on Y_PIC_OFFSET; measured against the ROM the start sits 8 px above the pic-offset centre.
const CONVERSION_START_Y_RISE = 8;
const CONVERSION_MATRIX: ApproxScriptMatrix = Object.freeze({ a: 128, b: 0, c: 0, d: 128 });
const CONVERSION_LAST = CONVERSION_SPAWN + 135 + 31;
function conversion2(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  const sprites: ApproxScriptSprite[] = [];
  // AnimTask_Conversion2AlphaBlend: BLDALPHA first target +1 every 4 ticks from the task's creation (age 2).
  const blend = Math.min(16, Math.floor((age - CONVERSION_SPAWN) / 4));
  for (let i = 0; i < 16; i += 1) {
    const dx = CONVERSION_GRID[i % 4]!;
    const dy = CONVERSION_GRID[Math.floor(i / 4)]!;
    const hold = 60 + 5 * i;
    const start = { x: ctx.attackerCenter.x + towardTarget(ctx) * dx, y: ctx.attackerCenter.y + dy - CONVERSION_START_Y_RISE };
    const local = age - CONVERSION_SPAWN;
    const flightStart = hold + 1;
    if (local < 0 || local > flightStart + 30) continue;
    const t = Math.min(1, Math.max(0, (local - flightStart) / 30));
    const frame = local <= flightStart ? 0 : Math.min(3, Math.floor((local - flightStart) / 5));
    if (t === 1 || blend <= 0) continue;
    sprites.push(sprite("conversion", Math.round(start.x + (ctx.attackerCenter.x - start.x) * t),
      Math.round(start.y + (ctx.attackerCenter.y - start.y) * t), CONVERSION_MATRIX, [frame, 1, 1], blend));
  }
  return frameOf(age, CONVERSION_LAST, { sprites });
}

// ---- Move_CURSE, CurseGhost branch (turn-0): the field goes black, a nail scratches the attacker three times, a ghost rises from the target ----
// Not modelled: the expanding black window of AnimTask_CurseStretchingBlackBg (only its palette fade to black), sound, OAM priorities.
const CURSE_FADE_IN_START = 16;
const CURSE_NAIL_SPAWN = 56;
const CURSE_NAIL_HITS = [64, 108, 152] as const;
const CURSE_NAIL_FADE_START = 183;
const CURSE_NAIL_END = 231;
const CURSE_ATTACKER_SHAKE = shakeMon2Sequence(4, 0, 10, 0);
const CURSE_ATTACKER_SHAKE_STARTS = [62, 105, 148] as const;
const CURSE_GHOST_SPAWN = CURSE_NAIL_SPAWN + CURSE_NAIL_END + 2;
const CURSE_GHOST_TICKS = 40;
const CURSE_TARGET_SHAKE = shakeMon2Sequence(2, 0, 14, 1);
const CURSE_FADE_OUT_START = CURSE_GHOST_SPAWN + CURSE_GHOST_TICKS + 2;
const CURSE_LAST = CURSE_FADE_OUT_START + 17;
function curseGhost(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  const sprites: ApproxScriptSprite[] = [];
  // The nail (32x16, 4 frames, flipped for a player attacker): -+24 px from the attacker, 4 ticks of +-2 px per scratch.
  const nailAge = age - CURSE_NAIL_SPAWN;
  if (nailAge >= 0 && nailAge < CURSE_NAIL_END) {
    const player = ctx.attackerSide === "player";
    const step = player ? -2 : 2;
    const done = CURSE_NAIL_HITS.filter((hit) => nailAge >= hit).length;
    const last = done === 0 ? 0 : CURSE_NAIL_HITS[done - 1]!;
    const moving = nailAge - (done === 0 ? 60 : last + 40);
    const x2 = moving >= 1 && moving <= 3 && done < 3 ? step * moving : 0;
    const fade = nailAge < CURSE_NAIL_FADE_START ? null : nailAge < CURSE_NAIL_FADE_START + 3 ? 16
      : 16 - Math.floor((nailAge - CURSE_NAIL_FADE_START) / 3);
    sprites.push(sprite(player ? "nailFlip" : "nail", ctx.attackerCenter.x + (player ? 24 : -24) + done * 8 * (player ? -1 : 1) + x2,
      ctx.attackerCenter.y, null, [done * 8, 4, 2], fade));
  }
  const ghostAge = age - CURSE_GHOST_SPAWN;
  if (ghostAge >= 1 && ghostAge <= CURSE_GHOST_TICKS) {
    const sway = sineOf((ghostAge - 1) * 6 & 0xff, 12);
    sprites.push(sprite("ghostlySpirit", ctx.targetCenter.x + (ctx.attackerSide === "player" ? sway : -sway), ctx.targetCenter.y - ghostAge,
      null, null, ghostAge <= 30 ? 11 : 11 - (ghostAge - 30)));
  }
  const bgDark = age < CURSE_FADE_OUT_START ? Math.min(16, Math.max(0, age - CURSE_FADE_IN_START + 1))
    : Math.max(0, 16 - (age - CURSE_FADE_OUT_START));
  return frameOf(age, CURSE_LAST, {
    attackerOffset: { x2: CURSE_ATTACKER_SHAKE_STARTS.reduce((sum, start) => sum + atTick(CURSE_ATTACKER_SHAKE, age - start).x2, 0), y2: 0 },
    targetOffset: atTick(CURSE_TARGET_SHAKE, ghostAge), bgDark, sprites,
  });
}

type BodyFn = (age: number, ctx: ApproxScriptContext) => ApproxScriptFrame;
const BODIES: Readonly<Record<ApproxScriptBody, BodyFn>> = {
  PECK: peck, ODOR_SLEUTH: odorSleuth, FALSE_SWIPE: falseSwipe, GUST: gust, PAY_DAY: payDay, BARRAGE: barrage, CONVERSION_2: conversion2, CURSE_GHOST: curseGhost,
};

/** The move ids drawn by these bodies, classified `approx:no-adapter` (Curse's Ghost branch is `approx:turn-0`). */
export const APPROX_SCRIPT_MOVE_BODY: Readonly<Record<number, Exclude<ApproxScriptBody, "CURSE_GHOST">>> = Object.freeze({
  64: "PECK", 316: "ODOR_SLEUTH", 206: "FALSE_SWIPE", 16: "GUST", 6: "PAY_DAY", 140: "BARRAGE", 176: "CONVERSION_2",
});

export function approxScriptAtAge(body: ApproxScriptBody, age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  return BODIES[body](age, ctx);
}

const SAMPLE_CONTEXT: ApproxScriptContext = {
  attackerSide: "player", targetSide: "opponent", attackerCenter: { x: 72, y: 104 }, targetCenter: { x: 176, y: 56 },
};
/** Rows of a body: the first age past its last active age, plus the display latch (Drill Peck: last active 89, rows 91). */
export function approxScriptDuration(body: ApproxScriptBody, ctx: ApproxScriptContext = SAMPLE_CONTEXT): number {
  let age = 0;
  while (BODIES[body](age, ctx).active) age += 1;
  return age + 1;
}
