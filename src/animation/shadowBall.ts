import { shakeMon2OffsetAtTick, type ShakeMon2Offset } from "./shakeMon2.ts";

export const SHADOW_BALL_SPRITE_FIRST_AGE = 55;
export const SHADOW_BALL_SPRITE_CALLBACKS = 40;
export const SHADOW_BALL_IMPACT_AGE = 95;
export const SHADOW_BALL_SHAKE_FIRST_AGE = 96;
export const SHADOW_BALL_RESTORE_FIRST_AGE = 112;
export const SHADOW_BALL_END_AGE = 147;

export interface ShadowBallGeometry {
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface ShadowBallSprite {
  readonly localAge: number;
  readonly phase: 0 | 1 | 2;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly pa: number;
  readonly pb: number;
  readonly pc: number;
  readonly pd: number;
}

export interface LoopSeAdjustPanningState {
  readonly remainingPlays: number;
  readonly delayCounter: number;
  readonly pan: number;
  readonly panCounter: number;
}

const truncDiv = (value: number, divisor: number): number =>
  Math.trunc(value / divisor);

/**
 * Literal `AnimShadowBall` reducer. The first leg advances for 16 callbacks
 * from the attacker to the exact midpoint, pauses there for 16 callbacks,
 * then reaches the target in 8 callbacks. All deltas use C signed-division
 * truncation before the Q4 accumulators are advanced.
 */
export function shadowBallSpriteAtAge(
  age: number,
  geometry: ShadowBallGeometry,
): ShadowBallSprite | null {
  const localAge = age - SHADOW_BALL_SPRITE_FIRST_AGE;
  if (localAge < 0 || localAge >= SHADOW_BALL_SPRITE_CALLBACKS) return null;
  const { attackerCenter: attacker, targetCenter: target } = geometry;
  const midpoint = {
    x: truncDiv(attacker.x + target.x, 2),
    y: truncDiv(attacker.y + target.y, 2),
  };
  let phase: 0 | 1 | 2;
  let x: number;
  let y: number;
  if (localAge < 16) {
    phase = 0;
    const dx = truncDiv((midpoint.x - attacker.x) << 4, 16);
    const dy = truncDiv((midpoint.y - attacker.y) << 4, 16);
    x = (attacker.x * 16 + dx * (localAge + 1)) >> 4;
    y = (attacker.y * 16 + dy * (localAge + 1)) >> 4;
  } else if (localAge < 32) {
    phase = 1;
    x = midpoint.x;
    y = midpoint.y;
  } else {
    phase = 2;
    const dx = truncDiv((target.x - midpoint.x) << 4, 8);
    const dy = truncDiv((target.y - midpoint.y) << 4, 8);
    const step = localAge - 31;
    x = step === 8 ? target.x : (midpoint.x * 16 + dx * step) >> 4;
    y = step === 8 ? target.y : (midpoint.y * 16 + dy * step) >> 4;
  }
  // The creation pass is identity; subsequent hardware OAM skips directly
  // to the affine program's second +10 callback.
  const rotation = localAge === 0 ? 0 : ((localAge + 1) * 10) & 0xff;
  const radians = rotation * 2 * Math.PI / 256;
  const cosine = Math.trunc(256 * Math.cos(radians));
  const sine = Math.trunc(256 * Math.sin(radians));
  return {
    localAge, phase, x, y, rotation,
    pa: cosine, pb: sine === 0 ? 0 : -sine, pc: sine, pd: cosine,
  };
}

/** Source `SoundTask_LoopSEAdjustPanning` for Shadow Ball's 5/5/0/5 argv. */
export function shadowBallLoopSoundAtAge(
  age: number,
  attackerSide: "player" | "opponent",
): LoopSeAdjustPanningState | null {
  const localAge = age - SHADOW_BALL_SPRITE_FIRST_AGE;
  if (localAge < 0) return null;
  const sourcePan = attackerSide === "player" ? -64 : 63;
  const targetPan = attackerSide === "player" ? 63 : -63;
  const increment = attackerSide === "player" ? 5 : -5;
  let remainingPlays = 5;
  let delayCounter = 5;
  let pan = sourcePan;
  let panCounter = 0;
  const step = () => {
    if (delayCounter++ === 5) {
      delayCounter = 0;
      remainingPlays -= 1;
      if (remainingPlays === 0) return false;
    }
    if (panCounter++ === 0) {
      panCounter = 0;
      const next = pan + increment;
      pan = increment > 0
        ? Math.min(next, targetPan)
        : Math.max(next, targetPan);
    }
    return true;
  };
  // Initializer invokes the step directly and the scheduler invokes the
  // installed callback once more on the creation pass.
  if (!step() || !step()) return null;
  for (let callback = 0; callback < localAge; callback += 1) {
    if (!step()) return null;
  }
  return { remainingPlays, delayCounter, pan, panCounter };
}

export function shadowBallTargetShakeAtAge(age: number): ShakeMon2Offset {
  if (age < SHADOW_BALL_SHAKE_FIRST_AGE) return { x2: 0, y2: 0 };
  return shakeMon2OffsetAtTick(
    4, 0, 8, 1,
    age - SHADOW_BALL_SHAKE_FIRST_AGE + 1,
  );
}

/** OAM-to-framebuffer transfer: the initializer's +4 pose appears at age 97. */
export function shadowBallDisplayedTargetShakeAtAge(
  age: number,
): ShakeMon2Offset {
  if (age < 97) return { x2: 0, y2: 0 };
  return shakeMon2OffsetAtTick(4, 0, 8, 1, age - 97);
}

export function shadowBallBackgroundBldy(age: number): number {
  const fadeIn = (localAge: number): number => {
    if (localAge < 0 || localAge > 35) return 0;
    if (localAge <= 16) return localAge;
    if (localAge <= 19) return 16;
    return 35 - localAge;
  };
  return age < SHADOW_BALL_RESTORE_FIRST_AGE
    ? age <= 16 ? age : age <= 20 ? 16 : Math.max(0, 36 - age)
    : fadeIn(age - SHADOW_BALL_RESTORE_FIRST_AGE);
}

export function shadowBallBackgroundIsGhost(age: number): boolean {
  return age >= 16 && age < SHADOW_BALL_RESTORE_FIRST_AGE + 16;
}
