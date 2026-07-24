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

export interface ExtremeSpeedHitsplatState {
  /** Target displacement captured by `AnimHitSplatOnMonEdge` at creation. */
  readonly targetX2: number;
  readonly y2: -12 | 0 | 12;
  /** Reciprocal OAM matrix for affine animation 3's 0x80 scale. */
  readonly matrixScale: 512;
}

export interface ExtremeSpeedDustSpriteState {
  readonly x2: number;
  readonly y2: number;
  readonly frame: 0 | 1 | 2;
}

export const EXTREME_SPEED_FADE_FIRST_AGE = 52;
export const EXTREME_SPEED_BG_SWAP_AGE = 68;
export const EXTREME_SPEED_SCROLL_FIRST_AGE = 69;
export const EXTREME_SPEED_BG_SETTLED_AGE = 86;
export const EXTREME_SPEED_STRETCH_FIRST_AGE = 90;
export const EXTREME_SPEED_ATTACKER_HIDDEN_AGE = 98;
export const EXTREME_SPEED_IMPACT_FIRST_AGE = 123;
export const EXTREME_SPEED_IMPACT_LAST_AGE = 182;
export const EXTREME_SPEED_HITSPLAT_FIRST_AGE = 128;
export const EXTREME_SPEED_HITSPLAT_INTERVAL = 12;
export const EXTREME_SPEED_HITSPLAT_VISIBLE_TICKS = 10;
export const EXTREME_SPEED_DUST_FIRST_AGE = 183;
export const EXTREME_SPEED_REAPPEAR_FIRST_AGE = 193;
export const EXTREME_SPEED_RESTORE_FADE_FIRST_AGE = 318;
export const EXTREME_SPEED_DEFAULT_BG_SWAP_AGE = 335;
export const EXTREME_SPEED_DEFAULT_BG_VISIBLE_AGE = 353;
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
    // LoadDefaultBg runs behind a two-display fully-dark latch, then its
    // nominal 16->0 ramp becomes visible from coefficient 15.
    bldy: Math.min(
      16,
      Math.max(0, EXTREME_SPEED_DEFAULT_BG_VISIBLE_AGE - age),
    ),
    scrollX: 0,
  };
}

/**
 * Source affine command (96,-13,0,8), displayed after the task/OAM epochs.
 * `spriteYOffset` is the species/side coordinate-table y_offset consumed by
 * pret's `SetBattlerSpriteYOffsetFromYScale`.
 */
export function extremeSpeedAttackerAffineAtAge(
  age: number,
  spriteYOffset = 0,
): Readonly<{
  xScale: number;
  yScale: number;
  y2: number;
  invisible: boolean;
}> {
  if (age < EXTREME_SPEED_STRETCH_FIRST_AGE) {
    return { xScale: 256, yScale: 256, y2: 0, invisible: false };
  }
  if (age >= EXTREME_SPEED_ATTACKER_HIDDEN_AGE) {
    return { xScale: 256, yScale: 256, y2: 0, invisible: true };
  }
  const step = age - EXTREME_SPEED_STRETCH_FIRST_AGE + 1;
  const yScale = 256 - 13 * step;
  const anchoredHeight = 64 - spriteYOffset * 2;
  const scaledHeight = Math.min(
    128,
    Math.trunc((anchoredHeight * 256) / yScale),
  );
  return {
    xScale: 256 + 96 * step,
    yScale,
    y2: Math.trunc((anchoredHeight - scaledHeight) / 2),
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
  const direction = targetSide === "player" ? 1 : -1;
  let x2 = 0;
  let phase = 0;
  let delay = 0;
  let alternations = 0;
  let pulsesLeft = 3;
  for (
    let callbackAge = EXTREME_SPEED_IMPACT_FIRST_AGE;
    callbackAge <= age;
    callbackAge += 1
  ) {
    if (phase === 0) {
      x2 += direction * 8;
      delay = 0;
      alternations = 0;
      phase = 1;
    } else if (phase === 1) {
      delay += 1;
      if (delay > 1) {
        delay = 0;
        alternations += 1;
        // Pret signs only the initial displacement and final return. The
        // five intermediate oscillations are always +6/-6 in screen space.
        x2 += alternations % 2 ? 6 : -6;
        if (alternations > 4) {
          if (alternations % 2) x2 -= 6;
          phase = 2;
        }
      }
    } else if (phase === 2) {
      pulsesLeft -= 1;
      phase = pulsesLeft === 0 ? 3 : 0;
    } else {
      x2 -= direction;
    }
  }
  return {
    targetX2: x2,
    hitsplatIndex: (() => {
      const local = age - EXTREME_SPEED_HITSPLAT_FIRST_AGE;
      if (local < 0) return null;
      const index = Math.floor(local / EXTREME_SPEED_HITSPLAT_INTERVAL);
      return index <= 2
        && local % EXTREME_SPEED_HITSPLAT_INTERVAL
          < EXTREME_SPEED_HITSPLAT_VISIBLE_TICKS
        ? index as 0 | 1 | 2
        : null;
    })(),
  };
}

/**
 * The three source `gMonEdgeHitSplatSpriteTemplate` instances. Their center
 * captures the live target x/x2 when the sprite is created and no longer
 * follows the target shake. Affine animation 3 holds scale 0x80 for eight
 * callbacks; the reciprocal OAM matrix is 0x200 throughout its displayed
 * ten-frame create/destroy epoch.
 */
export function extremeSpeedHitsplatsAtAge(
  age: number,
  targetSide: ExtremeSpeedSide,
): readonly ExtremeSpeedHitsplatState[] {
  const local = age - EXTREME_SPEED_HITSPLAT_FIRST_AGE;
  if (local < 0) return [];
  const index = Math.floor(local / EXTREME_SPEED_HITSPLAT_INTERVAL);
  if (
    index > 2
    || local % EXTREME_SPEED_HITSPLAT_INTERVAL
      >= EXTREME_SPEED_HITSPLAT_VISIBLE_TICKS
  ) {
    return [];
  }
  const firstVisibleAge =
    EXTREME_SPEED_HITSPLAT_FIRST_AGE
    + index * EXTREME_SPEED_HITSPLAT_INTERVAL;
  const yOffsets = [-12, 12, 0] as const;
  return [{
    targetX2: extremeSpeedImpactAtAge(
      firstVisibleAge - 3,
      targetSide,
    ).targetX2,
    y2: yOffsets[index]!,
    matrixScale: 512,
  }];
}

/** OAM-visible attacker state for `AnimTask_ExtremeSpeedMonReappear`. */
export function extremeSpeedAttackerVisibleAtAge(age: number): boolean {
  if (age < EXTREME_SPEED_ATTACKER_HIDDEN_AGE) return true;
  // The task toggles after each pair of callbacks, fourteen times. OAM is
  // built before RunTasks, so the framebuffer observes the toggle one age
  // later than task state.
  const local = age - (EXTREME_SPEED_REAPPEAR_FIRST_AGE + 5);
  if (local < 0) return false;
  // The fourteenth toggle would hide the sprite, but the same callback
  // immediately forces it visible while destroying the task.
  if (local >= 26) return true;
  return Math.floor(local / 2) % 2 === 0;
}

/**
 * The 24 source dust spawns (four offsets, six rounds), including their
 * five-frame sheet program and the task-wide blink gate.
 */
export function extremeSpeedDustAtAge(
  age: number,
): readonly ExtremeSpeedDustSpriteState[] {
  const displayedTaskAge = age - 1;
  const taskLocal = displayedTaskAge - EXTREME_SPEED_DUST_FIRST_AGE;
  if (taskLocal < 1) return [];
  const firstBlink = taskLocal >= 106
    ? 1
    : taskLocal <= 42
      ? Math.floor(taskLocal / 2) % 2
      : taskLocal <= 63
        ? 0
        : Math.floor((taskLocal - 62) / 2) % 2;
  if (firstBlink !== 0) return [];
  const offsets = [[30, 28], [-20, 24], [16, 26], [-10, 28]] as const;
  const frames = [0, 1, 2, 1, 0] as const;
  const sprites: ExtremeSpeedDustSpriteState[] = [];
  for (let spawn = 0; spawn < 24; spawn += 1) {
    const spawnTaskAge = 1 + spawn * 5;
    const spriteAge = taskLocal - spawnTaskAge;
    // The callback observes animEnded and destroys the sprite after this
    // frame's OAM has already retained the fifth frame for one last display.
    if (spriteAge < 0 || spriteAge > 15) continue;
    const [x2, y2] = offsets[spawn % offsets.length]!;
    sprites.push({
      x2,
      y2,
      frame: frames[Math.min(4, Math.floor(spriteAge / 3))]!,
    });
  }
  return sprites;
}
