export type ExtremeSpeedSide = "player" | "opponent";

export interface ExtremeSpeedBackgroundState {
  readonly background: "default" | "highspeed";
  readonly bldy: number;
  readonly scrollX: number;
}

export interface ExtremeSpeedImpactState {
  readonly targetX2: number;
  readonly hitsplatIndex: 0 | 1 | 2 | null;
}

export const EXTREME_SPEED_FADE_FIRST_AGE = 52;
export const EXTREME_SPEED_BG_SWAP_AGE = 68;
export const EXTREME_SPEED_SCROLL_FIRST_AGE = 69;
export const EXTREME_SPEED_BG_SETTLED_AGE = 86;
export const EXTREME_SPEED_STRETCH_FIRST_AGE = 88;
export const EXTREME_SPEED_ATTACKER_HIDDEN_AGE = 96;
export const EXTREME_SPEED_IMPACT_FIRST_AGE = 123;
export const EXTREME_SPEED_IMPACT_LAST_AGE = 182;
export const EXTREME_SPEED_DUST_FIRST_AGE = 183;
export const EXTREME_SPEED_RESTORE_FADE_FIRST_AGE = 318;
export const EXTREME_SPEED_DEFAULT_BG_SWAP_AGE = 335;
export const EXTREME_SPEED_DONE_AGE = 354;

/** `BG_HIGHSPEED_*` names the side being attacked, not the attacker side. */
export function extremeSpeedBackgroundVariant(
  attackerSide: ExtremeSpeedSide,
): ExtremeSpeedSide {
  return attackerSide === "player" ? "opponent" : "player";
}

/**
 * Move-relative Task_FadeToBg/restorebg plus
 * AnimTask_StartSlidingBg(-2304,0,TRUE,-1). Opponent-side attackers negate
 * the supplied Q8.8 velocity; no battle/turn/absolute clock participates.
 */
export function extremeSpeedBackgroundAtAge(
  age: number,
  attackerSide: ExtremeSpeedSide,
): ExtremeSpeedBackgroundState {
  const sign = attackerSide === "player" ? -1 : 1;
  const scrollAtAge = (scrollAge: number) => {
    const displayedSteps = scrollAge - EXTREME_SPEED_SCROLL_FIRST_AGE;
    return displayedSteps <= 0 ? 0 : sign * 9 * displayedSteps;
  };
  if (age < EXTREME_SPEED_FADE_FIRST_AGE) {
    return { background: "default", bldy: 0, scrollX: 0 };
  }
  if (age < EXTREME_SPEED_BG_SWAP_AGE) {
    return {
      background: "default",
      bldy: age - EXTREME_SPEED_FADE_FIRST_AGE + 1,
      scrollX: 0,
    };
  }
  if (age < EXTREME_SPEED_BG_SETTLED_AGE) {
    return {
      background: "highspeed",
      bldy: age < 70 ? 16 : Math.max(0, 16 - (age - 70)),
      scrollX: scrollAtAge(age),
    };
  }
  if (age < EXTREME_SPEED_RESTORE_FADE_FIRST_AGE) {
    return {
      background: "highspeed",
      bldy: 0,
      scrollX: scrollAtAge(age),
    };
  }
  if (age < EXTREME_SPEED_DEFAULT_BG_SWAP_AGE) {
    return {
      background: "highspeed",
      bldy: Math.min(16, age - EXTREME_SPEED_RESTORE_FADE_FIRST_AGE + 1),
      scrollX: scrollAtAge(age),
    };
  }
  return {
    background: "default",
    bldy:
      age < EXTREME_SPEED_DONE_AGE
        ? Math.max(0, 16 - (age - EXTREME_SPEED_DEFAULT_BG_SWAP_AGE))
        : 0,
    scrollX: 0,
  };
}

/** Source affine command (96,-13,0,8), displayed after the task/OAM latch. */
export function extremeSpeedAttackerAffineAtAge(age: number): Readonly<{
  xScale: number;
  yScale: number;
  invisible: boolean;
}> {
  if (age < EXTREME_SPEED_STRETCH_FIRST_AGE) {
    return { xScale: 256, yScale: 256, invisible: false };
  }
  if (age >= EXTREME_SPEED_ATTACKER_HIDDEN_AGE) {
    return { xScale: 256, yScale: 256, invisible: true };
  }
  const step = age - EXTREME_SPEED_STRETCH_FIRST_AGE + 1;
  return {
    xScale: 256 + 96 * step,
    yScale: 256 - 13 * step,
    invisible: false,
  };
}

/**
 * Three source pulses. Each starts at side-signed ±8, alternates ±6 five
 * times, and walks the remaining displacement back one pixel per callback.
 */
export function extremeSpeedImpactAtAge(
  age: number,
  targetSide: ExtremeSpeedSide,
): ExtremeSpeedImpactState {
  if (age < EXTREME_SPEED_IMPACT_FIRST_AGE || age > EXTREME_SPEED_IMPACT_LAST_AGE) {
    return { targetX2: 0, hitsplatIndex: null };
  }
  const local = age - EXTREME_SPEED_IMPACT_FIRST_AGE;
  const pulse = Math.min(2, Math.floor(local / 20));
  const within = local - pulse * 20;
  const direction = targetSide === "player" ? 1 : -1;
  let magnitude: number;
  if (within < 2) magnitude = 8;
  else if (within < 12) magnitude = 8 + (Math.floor(within / 2) % 2 ? 6 : 0);
  else magnitude = Math.max(0, 20 - within);
  return {
    targetX2: direction * magnitude,
    hitsplatIndex: pulse as 0 | 1 | 2,
  };
}
