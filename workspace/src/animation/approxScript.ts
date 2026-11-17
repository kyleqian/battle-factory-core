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
  | "PECK" | "ODOR_SLEUTH" | "FALSE_SWIPE" | "GUST" | "PAY_DAY" | "BARRAGE" | "CONVERSION_2" | "CURSE_GHOST" | "WITHDRAW" | "ROCK_SMASH" | "BEAT_UP";
export type ApproxScriptSheet = "impact" | "slash2" | "gust" | "coin" | "conversion" | "redBall" | "ghostlySpirit" | "nail" | "nailFlip"
  | "handsAndFeet" | "rocks";
export type ApproxScriptSide = "player" | "opponent";
export interface ApproxScriptPoint { readonly x: number; readonly y: number }
export interface ApproxScriptMatrix { readonly a: number; readonly b: number; readonly c: number; readonly d: number }
export interface ApproxScriptOffset { readonly x2: number; readonly y2: number }

export interface ApproxScriptWindow { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }

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
  /** BLDALPHA second coefficient when it is not 16 - blend (a `setalpha 12, 8` splat). */
  readonly blendB?: number;
  /** What a semi-transparent affine sprite blends with: "static" the battle background alone (the target is an OBJ), "backdrop" the field before any sprite (the target is on the monbg). */
  readonly blendOver?: "static" | "backdrop" | "live";
}

export interface ApproxScriptFrame {
  readonly active: boolean;
  readonly attackerOffset: ApproxScriptOffset;
  readonly attackerMatrix: ApproxScriptMatrix | null;
  readonly targetOffset: ApproxScriptOffset;
  /** ShakeMon wrote x2/y2 (an overwrite, not an add): the opponent target's settled idle rest no longer applies. */
  readonly targetRestReset?: boolean;
  readonly targetMatrix: ApproxScriptMatrix | null;
  /** Extra copies of the target battler (Odor Sleuth's clones), drawn over the target. */
  readonly targetClones: readonly ApproxScriptOffset[];
  /** BLDY darken (0..16) of the battle background only (Curse's black field). */
  readonly bgDark: number;
  /** When set, `bgDark` darkens only this window (WIN0, [left, right) x [top, bottom)); null: the whole background. */
  readonly bgWindow: ApproxScriptWindow | null;
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
  frame: readonly [number, number, number] | null = null, blend: number | null = null,
  alpha?: { b: number; over: "static" | "backdrop" | "live" }): ApproxScriptSprite {
  const [tile, columns, rows] = frame ?? (SHEET_FRAME as Record<string, readonly [number, number, number]>)[sheet]!;
  return alpha ? { sheet, tile, columns, rows, x, y, matrix, blend, blendB: alpha.b, blendOver: alpha.over } : { sheet, tile, columns, rows, x, y, matrix, blend };
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
  targetClones: [], bgDark: 0, bgWindow: null, sprites: [], ...parts,
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
const CURSE_WINDOW_STEPS = 16;
const CURSE_HOLD_EXTRA = 10;
// The window task plus the palette snap take 4 ticks longer than the fade alone, so the nail starts 4 ticks later than a bare delay 20.
const CURSE_MIDDLE_LAG = 4;
const CURSE_NAIL_SPAWN = 56 + CURSE_MIDDLE_LAG;
const CURSE_NAIL_HITS = [64, 108, 152] as const;
const CURSE_NAIL_FADE_START = 183;
const CURSE_NAIL_END = 231;
const CURSE_ATTACKER_SHAKE = shakeMon2Sequence(4, 0, 10, 0);
const CURSE_ATTACKER_SHAKE_STARTS = [62 + CURSE_MIDDLE_LAG, 105 + CURSE_MIDDLE_LAG, 148 + CURSE_MIDDLE_LAG] as const;
const CURSE_GHOST_SPAWN = CURSE_NAIL_SPAWN + CURSE_NAIL_END + 2;
const CURSE_GHOST_TICKS = 40;
const CURSE_TARGET_SHAKE = shakeMon2Sequence(2, 0, 14, 1);
const CURSE_FADE_OUT_START = CURSE_GHOST_SPAWN + CURSE_GHOST_TICKS + 2 + CURSE_HOLD_EXTRA;
// simple_palette_blend selector=F_PAL_BG, delay=1, 16 -> 0: BLDY -2 every 3 ticks as measured on the ROM.
const CURSE_FADE_OUT_STEP_TICKS = 3;
const CURSE_LAST = CURSE_FADE_OUT_START + 8 * CURSE_FADE_OUT_STEP_TICKS;
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
  // AnimTask_CurseStretchingBlackBg: a BLDY-16 window grows from (200 | 40, 40) over 16 steps (bottom to 112), then the BG palettes snap black.
  const step = age - CURSE_FADE_IN_START;
  const startX = ctx.attackerSide === "player" ? 200 : 40;
  const grow = (from: number, distance: number, sign: 1 | -1) => Math.trunc(from + sign * distance * 0.0625 * step);
  const bgWindow = step >= 1 && step < CURSE_WINDOW_STEPS
    ? { left: grow(startX, startX, -1), right: grow(startX, 240 - startX, 1), top: grow(40, 40, -1), bottom: grow(40, 72, 1) } : null;
  const bgDark = age >= CURSE_FADE_OUT_START ? Math.max(0, 14 - 2 * Math.floor((age - CURSE_FADE_OUT_START) / CURSE_FADE_OUT_STEP_TICKS))
    : step >= 1 ? 16 : 0;
  return frameOf(age, CURSE_LAST, {
    attackerOffset: { x2: CURSE_ATTACKER_SHAKE_STARTS.reduce((sum, start) => sum + atTick(CURSE_ATTACKER_SHAKE, age - start).x2, 0), y2: 0 },
    targetOffset: atTick(CURSE_TARGET_SHAKE, ghostAge), bgDark, bgWindow, sprites,
  });
}


// ---- Move_WITHDRAW (adp1): AnimTask_Withdraw rotates the attacker 22 steps of 0xB0, holds 30 steps, and rotates back 22 steps ---------
// Callback 0 only prepares the sprite for rotation (no matrix yet); each later callback sets the matrix from the rotation BEFORE its
// own increment, and y2 = |matrix c| >> 3 (SetBattlerSpriteYOffsetFromRotation) except during the hold, which returns before that call.
const WITHDRAW_STEP = 0xb0;
const WITHDRAW_PHASE = 22;
const WITHDRAW_HOLD = 30;
/** Callbacks of the task (init + 22 + 30 + 22). */
export const WITHDRAW_TICKS = 1 + WITHDRAW_PHASE + WITHDRAW_HOLD + WITHDRAW_PHASE;
const WITHDRAW_LEAD = 2;
/** The rotation each step sets (step 0..73); the last step's matrix is replaced by ResetSpriteRotScale in the same callback. */
const withdrawRotation = (step: number) => step < WITHDRAW_PHASE ? step * WITHDRAW_STEP
  : step < WITHDRAW_PHASE + WITHDRAW_HOLD ? WITHDRAW_PHASE * WITHDRAW_STEP
  : (2 * WITHDRAW_PHASE + WITHDRAW_HOLD - step) * WITHDRAW_STEP;
function withdraw(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  const step = age - WITHDRAW_LEAD - 1;
  const sign = ctx.attackerSide === "player" ? -1 : 1;
  const matrixOf = (n: number) => rotationMatrix(sign * withdrawRotation(n));
  if (step < 0 || step >= WITHDRAW_TICKS - 2) return frameOf(age, WITHDRAW_TICKS - 1, {});
  const yFrom = step >= WITHDRAW_PHASE && step < WITHDRAW_PHASE + WITHDRAW_HOLD ? WITHDRAW_PHASE - 1 : step;
  return frameOf(age, WITHDRAW_TICKS - 1, { attackerMatrix: matrixOf(step), attackerOffset: { x2: 0, y2: Math.abs(matrixOf(yFrom).c) >> 3 } });
}

// ---- Move_ROCK_SMASH (adp1): hit splat + fist (8 ticks) + ShakeMon(3,0,5,1), then 8 rock fragments + ShakeMon(0,3,7,1) ------------
// monbg ANIM_DEF_PARTNER names a battler that does not exist in a single battle, so the target stays an OBJ and the splat (setalpha 12, 8)
// blends with the battle background alone.
const ROCK_SMASH_C1 = 16;
const ROCK_SMASH_C2 = 27;
const ROCK_SMASH_FIST_FIRST = 17;
const ROCK_SMASH_FIST_LAST = 25;
const ROCK_SMASH_FRAG_FIRST = 27;
const ROCK_SMASH_LAST = 76;
const FIST_FRAME = [0, 4, 4] as const;
const ROCK_FRAME = [[32, 4, 4], [48, 4, 4], [64, 4, 4]] as const;
/** gRockFragmentSpriteTemplate args: x, y (x mirrored by the attacker side), dx, dy (not mirrored), duration, anim. */
const ROCK_SMASH_FRAGMENTS: readonly (readonly [number, number, number, number, number, 0 | 1 | 2])[] = [
  [0, 0, 20, 24, 14, 2], [5, 0, -20, 24, 14, 1], [0, 5, 20, -24, 14, 2], [-5, 0, -20, -24, 14, 2],
  [0, -5, 30, 18, 8, 2], [0, 0, 30, -18, 8, 2], [0, 0, -30, 18, 8, 2], [0, 0, -30, -18, 8, 2],
];
const ROCK_SMASH_SHAKE_1 = shakeMonSequence(3, 0, 5, 1);
const ROCK_SMASH_SHAKE_2 = shakeMonSequence(0, 3, 7, 1);
/** Draw order among fragments of equal y (back to front); SortSprites keeps the previous frame's order for ties. */
const ROCK_TIE_RANK = [1, 0, 2, 3, 4, 5, 6, 7] as const;
function rockFragments(age: number, spawn: number, ctx: ApproxScriptContext, fragments: typeof ROCK_SMASH_FRAGMENTS): ApproxScriptSprite[] {
  const callbacks = age - spawn;
  if (callbacks < 1) return [];
  const out: { part: ApproxScriptSprite; rank: number }[] = [];
  fragments.forEach(([x, y, dx, dy, duration, anim], i) => {
    if (callbacks > duration + 1) return;
    const k = Math.min(callbacks, duration);
    const stepX = Math.trunc((dx << 8) / duration);
    const stepY = Math.trunc((dy << 8) / duration);
    out.push({ part: sprite("rocks", ctx.targetCenter.x + towardTarget(ctx) * x + (k * stepX >> 8), ctx.targetCenter.y + y + (k * stepY >> 8), null, ROCK_FRAME[anim]), rank: ROCK_TIE_RANK[i]! });
  });
  // SortSprites: equal subpriority, the sprite lower on screen is in front.
  return out.sort((a, b) => a.part.y - b.part.y || a.rank - b.rank).map((entry) => entry.part);
}
function rockSmash(age: number, ctx: ApproxScriptContext): ApproxScriptFrame {
  const sprites: ApproxScriptSprite[] = [];
  const fistAge = age - ROCK_SMASH_FIST_FIRST;
  if (fistAge >= 0 && fistAge <= ROCK_SMASH_FIST_LAST - ROCK_SMASH_FIST_FIRST) sprites.push(sprite("handsAndFeet", ctx.targetCenter.x, ctx.targetCenter.y, null, FIST_FRAME));
  if (fistAge >= 0 && fistAge <= 9) sprites.push(sprite("impact", ctx.targetCenter.x, ctx.targetCenter.y, SPLAT_MATRIX[1], null, 12, { b: 8, over: "backdrop" }));
  sprites.push(...rockFragments(age, ROCK_SMASH_FRAG_FIRST, ctx, ROCK_SMASH_FRAGMENTS));
  const one = age - ROCK_SMASH_C1 >= 1 ? atTick(ROCK_SMASH_SHAKE_1, age - ROCK_SMASH_C1) : ZERO;
  const two = age - ROCK_SMASH_C2 >= 1 ? atTick(ROCK_SMASH_SHAKE_2, age - ROCK_SMASH_C2) : ZERO;
  return frameOf(age, ROCK_SMASH_LAST, { targetOffset: { x2: one.x2 + two.x2, y2: one.y2 + two.y2 }, targetRestReset: age - ROCK_SMASH_C1 >= 1, sprites });
}

type BodyFn = (age: number, ctx: ApproxScriptContext) => ApproxScriptFrame;
const BODIES: Readonly<Record<ApproxScriptBody, BodyFn>> = {
  PECK: peck, ODOR_SLEUTH: odorSleuth, FALSE_SWIPE: falseSwipe, GUST: gust, PAY_DAY: payDay, BARRAGE: barrage, CONVERSION_2: conversion2, CURSE_GHOST: curseGhost, WITHDRAW: withdraw, ROCK_SMASH: rockSmash, BEAT_UP: rockSmash,
};

/** The move ids drawn by these bodies, classified `approx:no-adapter` (Curse's Ghost branch is `approx:turn-0`). */
export const APPROX_SCRIPT_MOVE_BODY: Readonly<Record<number, Exclude<ApproxScriptBody, "CURSE_GHOST">>> = Object.freeze({
  64: "PECK", 316: "ODOR_SLEUTH", 206: "FALSE_SWIPE", 16: "GUST", 6: "PAY_DAY", 140: "BARRAGE", 176: "CONVERSION_2",
});

/** adp1: moves drawn by a ROM-accepted script body (a live adapter, not approximate): Withdraw. */
export const ADP1_MOVE_BODY: Readonly<Record<number, Extract<ApproxScriptBody, "WITHDRAW" | "ROCK_SMASH" | "BEAT_UP">>> = Object.freeze({ 110: "WITHDRAW", 249: "ROCK_SMASH", 251: "BEAT_UP" });

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
