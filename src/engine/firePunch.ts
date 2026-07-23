// Pure FIRE_PUNCH reducers. Ages are relative to the first animation-owned
// FIRE_PUNCH render (docs/turn16-notes.md §6.5), never absolute battle ticks.

import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import { advanceRngValue } from "./rng.ts";

export const FIRE_PUNCH_SPIRAL_FIRST_AGE = 41;
export const FIRE_PUNCH_SPIRAL_TICKS = 30;
export const FIRE_PUNCH_IMPACT_FIRST_AGE = 72;
export const FIRE_PUNCH_SPREAD_TICKS = 40;
export const FIRE_PUNCH_MONBG_FIRST_AGE = 37;
export const FIRE_PUNCH_MONBG_LAST_AGE = 122;
export const FIRE_PUNCH_HIT_WOBBLE_FIRST_AGE = 133;
export const FIRE_PUNCH_HIT_WOBBLE_TICKS = 20;
export const FIRE_PUNCH_HIT_BLINK_FIRST_AGE = 134;
export const FIRE_PUNCH_HP_DRAIN_FIRST_AGE = 168;
export const FIRE_PUNCH_HP_COMMIT_AGE = 236;
export const FIRE_PUNCH_SECONDARY_ROLL_AGE = 241;
export const FIRE_PUNCH_BURN_FLAME_FIRST_AGE = 247;
export const FIRE_PUNCH_TEXT_CLEAR_AGE = 283;
export const FIRE_PUNCH_BURN_MESSAGE_AGE = 283;
export const FIRE_PUNCH_BURN_BADGE_AGE = 372;
export const FIRE_PUNCH_CURRENT_MOVE_RESET_AGE = 383;
export const FIRE_PUNCH_BURN_MESSAGE_CLEAR_AGE = 387;
/** BattleMon status-turn bookkeeping: MURKROW becomes its own attacker. */
export const FIRE_PUNCH_RESIDUAL_PREPARE_AGE = 385;
/** `statusanimation BS_ATTACKER` reuses Status_Burn after the message hold. */
export const FIRE_PUNCH_RESIDUAL_FLAME_FIRST_AGE = 489;
/** Healthbar controller drains one HP per displayed VBlank, before RAM. */
export const FIRE_PUNCH_RESIDUAL_HP_DRAIN_FIRST_AGE = 527;
export const FIRE_PUNCH_RESIDUAL_HP_COMMIT_AGE = 544;
export const FIRE_PUNCH_TAIL_RNG_FIRST_AGE = 549;
export const FIRE_PUNCH_RESIDUAL_MESSAGE_CLEAR_AGE = 550;
export const FIRE_PUNCH_TAIL_RNG_SECOND_AGE = 554;
export const FIRE_PUNCH_TURN17_MENU_REDRAW_AGE = 555;

const FIRE_PUNCH_AFTER_BURN_RNG_VALUE = 2012156700;
const FIRE_PUNCH_AFTER_TAIL_RNG_1 = advanceRngValue(FIRE_PUNCH_AFTER_BURN_RNG_VALUE);
// Battle AI seeds four `simulatedRNG` slots, then chooses among the best
// moves: the second bookkeeping event therefore advances the LCG five times.
let FIRE_PUNCH_AFTER_TAIL_RNG_2 = FIRE_PUNCH_AFTER_TAIL_RNG_1;
for (let i = 0; i < 5; i += 1) {
  FIRE_PUNCH_AFTER_TAIL_RNG_2 = advanceRngValue(FIRE_PUNCH_AFTER_TAIL_RNG_2);
}

const SPIRAL_PHASES = [0, 64, 128, 196] as const;
const SPREAD_VELOCITIES = [
  [192, 176],
  [-192, 240],
  [192, -160],
  [-192, -112],
  [160, 48],
  [-224, -32],
  [112, -128],
] as const;

function sin(index: number, amplitude: number): number {
  const value = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((amplitude * value) / 256);
}

/** Target palette coefficient for the delay-2 0→9 and delay-0 9→0 tasks. */
export function firePunchTargetBlendCoeff(age: number): number {
  if (age < 46) return 0;
  if (age <= 114) return Math.min(9, 1 + Math.floor((age - 46) / 3));
  if (age <= 122) return 9 - (age - 114);
  return 0;
}

export interface FirePunchParticle {
  x: number;
  y: number;
  frame: 1 | 2 | 3;
  hFlip: boolean;
  vFlip: boolean;
}

/** Four source-phase `TranslateSpriteInGrowingCircle` embers. */
export function firePunchSpiralParticles(age: number): FirePunchParticle[] {
  const n = age - FIRE_PUNCH_SPIRAL_FIRST_AGE;
  if (n < 0 || n >= FIRE_PUNCH_SPIRAL_TICKS) return [];
  // The callback has already run twice by the RAM state displayed on the
  // first VBlank. The destroy callback leaves the final pose displayed once.
  const step = Math.min(n + 1, 29);
  const radius = 60 - step * 2;
  const frame = (1 + (Math.floor((n + 1) / 4) % 3)) as 1 | 2 | 3;
  return SPIRAL_PHASES.map((phase) => {
    const angle = phase + step * 9;
    return {
      x: 176 + sin(angle, radius),
      y: 51 + sin(angle + 64, radius),
      frame,
      hFlip: false,
      vFlip: false,
    };
  });
}

/** Seven fixed-point `TranslateSpriteLinearFixedPoint` spread embers. */
export function firePunchSpreadParticles(age: number): FirePunchParticle[] {
  const n = age - FIRE_PUNCH_IMPACT_FIRST_AGE;
  if (n < 0 || n > FIRE_PUNCH_SPREAD_TICKS) return [];
  const step = Math.min(n + 1, FIRE_PUNCH_SPREAD_TICKS);
  const frame = (1 + (Math.floor((n + 1) / 4) % 3)) as 1 | 2 | 3;
  return SPREAD_VELOCITIES.map(([vx, vy]) => ({
    x: 176 + ((vx * step) >> 8),
    y: 61 + ((vy * step) >> 8),
    frame,
    hFlip: false,
    vFlip: false,
  }));
}

function stableOamOrder(
  firstAge: number,
  age: number,
  seed: number[],
  particlesAt: (taskAge: number) => FirePunchParticle[],
): number[] {
  const order = [...seed];
  for (let taskAge = firstAge; taskAge <= age; taskAge += 1) {
    const particles = particlesAt(taskAge);
    order.sort((a, b) => particles[b]!.y - particles[a]!.y);
  }
  return order;
}

/**
 * Inverse OAM order for software compositing. `SortSprites` is stable on Y
 * ties. The spread seed is the allocator's inherited `sSpriteOrder` at this
 * script step (RAM: slots 8,7,13,12,11,10,9), not a per-frame pixel table.
 */
export function firePunchParticlesInDrawOrder(age: number): FirePunchParticle[] {
  const spiral = firePunchSpiralParticles(age);
  if (spiral.length) {
    const oam = stableOamOrder(
      FIRE_PUNCH_SPIRAL_FIRST_AGE,
      age,
      [0, 1, 2, 3],
      firePunchSpiralParticles,
    );
    return oam.reverse().map((index) => spiral[index]!);
  }
  const spread = firePunchSpreadParticles(age);
  if (spread.length) {
    const oam = stableOamOrder(
      FIRE_PUNCH_IMPACT_FIRST_AGE,
      age,
      [1, 0, 6, 5, 4, 3, 2],
      firePunchSpreadParticles,
    );
    return oam.reverse().map((index) => spread[index]!);
  }
  return [];
}

export function firePunchFistVisible(age: number): boolean {
  return age >= FIRE_PUNCH_IMPACT_FIRST_AGE && age < FIRE_PUNCH_IMPACT_FIRST_AGE + 9;
}

export function firePunchHitsplatVisible(age: number): boolean {
  return age >= FIRE_PUNCH_IMPACT_FIRST_AGE && age < FIRE_PUNCH_IMPACT_FIRST_AGE + 10;
}

export interface FirePunchResolutionState {
  targetInvisible: boolean;
  healthboxY2: number;
  displayedHp: number;
  battleHp: number;
  secondaryRollConsumed: boolean;
  secondaryRollSucceeded: boolean;
  status: "none" | "burn";
  healthboxStatus: "none" | "burn";
  currentMove: "FIRE_PUNCH" | null;
  message: "FIRE_PUNCH" | "BURNED" | "BURN_RESIDUAL" | "BLANK" | "ACTION_MENU";
  attacker: "MAGBY" | "MURKROW";
  target: "MAGBY" | "MURKROW";
  moveDamage: number;
  tailRngCallsConsumed: 0 | 1 | 6;
  rngValue: number | null;
}

/** `HandleTurnActionSelectionState`'s source formula, with its 1-HP floor. */
export function burnResidualDamage(maxHp: number): number {
  return Math.max(1, Math.floor(maxHp / 8));
}

/** Generic hit resolution, burn residual, and next-action-menu handoff. */
export function firePunchResolutionState(age: number): FirePunchResolutionState {
  const wobble = age - FIRE_PUNCH_HIT_WOBBLE_FIRST_AGE;
  const blink = age - FIRE_PUNCH_HIT_BLINK_FIRST_AGE;
  const burned = age >= FIRE_PUNCH_SECONDARY_ROLL_AGE;
  // The status-turn script's first visible controller frame follows two
  // MoveBattleBar calls; subsequent frames decrement currValue once.
  const residualDrain =
    age < FIRE_PUNCH_RESIDUAL_HP_DRAIN_FIRST_AGE
      ? 0
      : age - FIRE_PUNCH_RESIDUAL_HP_DRAIN_FIRST_AGE + 2;
  const residualPrepared = age >= FIRE_PUNCH_RESIDUAL_PREPARE_AGE;
  const firstTailRoll = age >= FIRE_PUNCH_TAIL_RNG_FIRST_AGE;
  const secondTailRoll = age >= FIRE_PUNCH_TAIL_RNG_SECOND_AGE;
  const message: FirePunchResolutionState["message"] =
    age < FIRE_PUNCH_TEXT_CLEAR_AGE
      ? "FIRE_PUNCH"
      : age < FIRE_PUNCH_BURN_MESSAGE_CLEAR_AGE
          ? "BURNED"
          : age < FIRE_PUNCH_RESIDUAL_MESSAGE_CLEAR_AGE
            ? "BURN_RESIDUAL"
            : age < FIRE_PUNCH_TURN17_MENU_REDRAW_AGE
              ? "BLANK"
              : "ACTION_MENU";
  return {
    healthboxY2: wobble >= 0 && wobble < FIRE_PUNCH_HIT_WOBBLE_TICKS
      ? (wobble % 2 === 0 ? 1 : -1)
      : 0,
    targetInvisible: blink >= 0 && blink < 32 && blink % 8 < 4,
    displayedHp: age < FIRE_PUNCH_HP_DRAIN_FIRST_AGE
      ? 142
      : residualDrain > 0
        ? Math.max(58, 75 - residualDrain)
        : Math.max(75, 142 - (age - FIRE_PUNCH_HP_DRAIN_FIRST_AGE + 1)),
    battleHp:
      age >= FIRE_PUNCH_RESIDUAL_HP_COMMIT_AGE
        ? 58
        : age >= FIRE_PUNCH_HP_COMMIT_AGE
          ? 75
          : 142,
    secondaryRollConsumed: burned,
    secondaryRollSucceeded: burned,
    status: burned ? "burn" : "none",
    healthboxStatus: age >= FIRE_PUNCH_BURN_BADGE_AGE ? "burn" : "none",
    currentMove: age >= FIRE_PUNCH_CURRENT_MOVE_RESET_AGE ? null : "FIRE_PUNCH",
    message,
    attacker:
      residualPrepared && !firstTailRoll
        ? "MURKROW"
        : "MAGBY",
    target:
      secondTailRoll
        ? "MAGBY"
        : firstTailRoll || !residualPrepared
          ? "MURKROW"
          : "MAGBY",
    moveDamage: residualPrepared && !firstTailRoll ? burnResidualDamage(142) : 0,
    tailRngCallsConsumed: secondTailRoll ? 6 : firstTailRoll ? 1 : 0,
    rngValue:
      !burned
        ? null
        : secondTailRoll
          ? FIRE_PUNCH_AFTER_TAIL_RNG_2
          : firstTailRoll
            ? FIRE_PUNCH_AFTER_TAIL_RNG_1
            : FIRE_PUNCH_AFTER_BURN_RNG_VALUE,
  };
}

export interface BurnFlameParticle {
  x: number;
  y: number;
  frame: 0 | 1 | 2 | 3 | 4;
}

const BURN_FLAME_START_AGES = [
  FIRE_PUNCH_BURN_FLAME_FIRST_AGE,
  FIRE_PUNCH_BURN_FLAME_FIRST_AGE + 6,
  FIRE_PUNCH_BURN_FLAME_FIRST_AGE + 12,
] as const;
const BURN_FLAME_VISIBLE_TICKS = 22;
// StartAnimLinearTranslation stores an 8.8 delta:
// ((200 - 152) << 8) / 20 = 614 after integer truncation.
const BURN_FLAME_X_DELTA_FIXED8 = 614;

/**
 * Status_Burn's three `gBurnFlameSpriteTemplate` sprites. The source script
 * calls BurnFlame three times; its four-tick script delays become six
 * displayed VBlanks apart. Returned in back-to-front software draw order:
 * later sprite slots lose equal-subpriority OAM ties to the first flame.
 */
export function firePunchBurnFlames(age: number): BurnFlameParticle[] {
  const particles: BurnFlameParticle[] = [];
  for (let i = BURN_FLAME_START_AGES.length - 1; i >= 0; i -= 1) {
    const n = age - BURN_FLAME_START_AGES[i]!;
    if (n < 0 || n >= BURN_FLAME_VISIBLE_TICKS) continue;
    particles.push({
      x: 152 + ((BURN_FLAME_X_DELTA_FIXED8 * Math.min(n, 20)) >> 8),
      y: 64,
      frame: (Math.floor((n + 1) / 4) % 5) as 0 | 1 | 2 | 3 | 4,
    });
  }
  return particles;
}

/** The end-turn burn script invokes the same Status_Burn animation again. */
export function firePunchResidualBurnFlames(age: number): BurnFlameParticle[] {
  return firePunchBurnFlames(
    age - FIRE_PUNCH_RESIDUAL_FLAME_FIRST_AGE + FIRE_PUNCH_BURN_FLAME_FIRST_AGE,
  );
}

/** Fresh `DoBounceEffect` phase for the turn-17 action menu. */
export function firePunchTurn17MenuBounceTick(age: number): number | null {
  if (age < FIRE_PUNCH_TURN17_MENU_REDRAW_AGE) return null;
  return 1748 + age - FIRE_PUNCH_TURN17_MENU_REDRAW_AGE;
}
