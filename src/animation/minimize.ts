/**
 * Source-shaped reducer for MOVE_MINIMIZE.
 *
 * `data/battle_anim_scripts.s:Move_MINIMIZE` is
 *   setalpha 10, 8
 *   createvisualtask AnimTask_Minimize, 2
 *   loopsewithpan SE_M_MINIMIZE, SOUND_PAN_ATTACKER, 34, 3
 *   waitforvisualfinish
 *   blendoff
 *   end
 *
 * The new component is `task:AnimTask_Minimize` (`battle_anim_effects_2.c`).
 * `AnimTask_Minimize` prepares the attacker for rot/scale and
 * `AnimTask_Minimize_Step` runs three 32-frame shrink cycles (a larger affine
 * scale value means a SMALLER sprite), a ~33-frame hold, then a 16-step
 * grow-back:
 *   case 0 (shrink): at data[2]==0,3,6 CreateMinimizeSprite clones the
 *     attacker; data[2]++, scale += 0x28, SetSpriteRotScale, y2 offset.
 *     At data[2]==32: cycles++, state 1.
 *   case 1: once all clones expired (data[6]==0), after 3 cycles -> state 3
 *     (hold), else reset scale to 0x100 and go to state 2.
 *   case 2: state = 0 (next shrink cycle).
 *   case 3 (hold): ++data[2] > 32 -> state 4.
 *   case 4 (grow back): data[2] += 2, scale -= 0x50 (1536->256 in 16 steps),
 *     at data[2]==32 -> state 5.
 *   case 5: ResetSpriteRotScale, y2 = 0, destroy task.
 * Each `CreateMinimizeSprite` clone lives exactly 16 frames with its affine
 * matrix FROZEN at the spawn-time scale and subpriority = attackerSubpriority
 * - cloneIndex. The clone carries `oam.objMode = ST_OAM_OBJ_BLEND`, so it is
 * composited under the script's `setalpha 10, 8` BLDALPHA blend.
 *
 * Ages are move-relative (age 0 = the move script's first captured frame,
 * frame 210 in the fixture windows). The task is present ages 1-150 (destroyed
 * at 151) and BLDALPHA 0x80a is held ages 1-151 (blendoff lands on 152).
 */

export const MINIMIZE_FIRST_TASK_AGE = 1;
export const MINIMIZE_LAST_TASK_AGE = 150;
export const MINIMIZE_BLEND_OFF_AGE = 152;
export const MINIMIZE_SCALE_STEP = 0x28;
export const MINIMIZE_GROW_STEP = 0x50;
export const MINIMIZE_MAX_SCALE = 0x600;
export const MINIMIZE_HOLD_SCALE = 0x600;
export const MINIMIZE_CLONE_LIFETIME = 16;
export const MINIMIZE_CLONE_SPAWN_OFFSETS = [0, 3, 6] as const;

export interface MinimizeClone {
  /** Clone index within the cycle (0-2); subpriority = attackerSubpriority - index. */
  readonly index: number;
  /** Presentation age the clone was created at (spawn frame, window-relative). */
  readonly spawnAge: number;
  /** FROZEN software matrix scale captured at spawn (256, 376, 496). */
  readonly matrix: number;
  /** `SetBattlerSpriteYOffsetFromYScale` y2 from the clone's own matrix. */
  readonly y2: number;
  /** Remaining lifetime RAM ticks (`data[0]`), 16 at spawn down to 1. */
  readonly lifetime: number;
}

export interface MinimizeState {
  readonly age: number;
  readonly visualTaskCount: number;
  /** Attacker software affine scale at this age (identity 256 when idle). */
  readonly scale: number;
  /** Attacker sprite `y2` from `SetBattlerSpriteYOffsetFromYScale`. */
  readonly y2: number;
  /** Live `ClonedMinizeSprite_Step` clones at this age, oldest first. */
  readonly clones: readonly MinimizeClone[];
  /** `setalpha 10, 8` BLDALPHA blend active (BLDCNT/BLDALPHA held). */
  readonly blendActive: boolean;
}

/** `SetBattlerSpriteYOffsetFromYScale` y2 with GRIMER's var = 40. */
export function minimizeY2FromScale(scale: number, varValue = 40): number {
  const scaledHeight = Math.trunc((varValue << 8) / scale);
  return Math.trunc((varValue - scaledHeight) / 2);
}

/** Shrink-cycle start ages for the three cycles (1, 35, 69). */
export function minimizeCycleStartAge(cycle: 0 | 1 | 2): number {
  return MINIMIZE_FIRST_TASK_AGE + cycle * 34;
}

/** Clone spawn ages for a given cycle: start, start+3, start+6. */
export function minimizeCloneSpawnAges(
  cycle: 0 | 1 | 2,
): readonly number[] {
  const start = minimizeCycleStartAge(cycle);
  return MINIMIZE_CLONE_SPAWN_OFFSETS.map((offset) => start + offset);
}

/** Attacker software affine scale at move-relative `age`. */
export function minimizeScaleAtAge(age: number): number {
  if (age < MINIMIZE_FIRST_TASK_AGE || age > MINIMIZE_LAST_TASK_AGE) {
    return 0x100;
  }
  for (let cycle = 0 as 0 | 1 | 2; cycle < 3; cycle = (cycle + 1) as 0 | 1 | 2) {
    const start = minimizeCycleStartAge(cycle);
    if (age >= start && age < start + 32) {
      return 0x100 + MINIMIZE_SCALE_STEP * (age - start + 1);
    }
  }
  if (age >= 101 && age <= 134) return MINIMIZE_HOLD_SCALE;
  if (age >= 135 && age <= 150) {
    return MINIMIZE_HOLD_SCALE - MINIMIZE_GROW_STEP * (age - 134);
  }
  return 0x100;
}

/** Live clones at `age` from the source spawn/expire schedule. */
export function minimizeClonesAtAge(age: number): readonly MinimizeClone[] {
  const out: MinimizeClone[] = [];
  for (let cycle = 0 as 0 | 1 | 2; cycle < 3; cycle = (cycle + 1) as 0 | 1 | 2) {
    const spawnAges = minimizeCloneSpawnAges(cycle);
    for (let index = 0; index < spawnAges.length; index += 1) {
      const spawnAge = spawnAges[index]!;
      const lifetime = spawnAge + MINIMIZE_CLONE_LIFETIME - age;
      if (lifetime <= 0 || lifetime > MINIMIZE_CLONE_LIFETIME) continue;
      const matrix = 0x100 + MINIMIZE_SCALE_STEP * (spawnAge - minimizeCycleStartAge(cycle));
      out.push({
        index,
        spawnAge,
        matrix,
        y2: minimizeY2FromScale(matrix),
        lifetime,
      });
    }
  }
  return out;
}

/**
 * Clones actually painted at a DISPLAYED age.
 *
 * Two different render lags meet on the minimize clones and the window needs
 * BOTH. A clone can only be PAINTED once its freshly allocated OAM matrix has
 * reached the hardware — the two-display matrix lag — but its REMOVAL is a
 * plain OAM edit that lands one display behind. Measured on the player-back
 * probe: clone 0 lives RAM frames 211-226 (its `data[0]` counts 16 down to 1)
 * yet the oracle screen shows it only on frames 213-227 — two displays behind
 * its creation and one behind its destruction, so 15 displayed frames for a
 * 16-frame RAM life. Taking either lag alone provably fails: `age - 2` alone
 * leaves the expiry frames (228/231/234 and the same three in each later
 * cycle) over-drawn, while `age - 1` alone draws the spawn frames (212/215/218
 * and the same three in each later cycle) too early. The rule intersects them:
 * take the clone list and their FROZEN matrices from `age - 2`, then drop any
 * clone that is no longer alive at `age - 1`.
 */
export function minimizeDisplayedClonesAtAge(
  age: number,
): readonly MinimizeClone[] {
  const matrixDisplayed = minimizeClonesAtAge(age - 2);
  const oamDisplayed = minimizeClonesAtAge(age - 1);
  const stillInOam = new Set(oamDisplayed.map((clone) => clone.spawnAge));
  return matrixDisplayed.filter((clone) => stillInOam.has(clone.spawnAge));
}

export function minimizeAtAge(age: number): MinimizeState {
  const scale = minimizeScaleAtAge(age);
  return {
    age,
    visualTaskCount:
      age >= MINIMIZE_FIRST_TASK_AGE && age <= MINIMIZE_LAST_TASK_AGE ? 1 : 0,
    scale,
    y2: minimizeY2FromScale(scale),
    clones: minimizeClonesAtAge(age),
    blendActive: age >= MINIMIZE_FIRST_TASK_AGE && age < MINIMIZE_BLEND_OFF_AGE,
  };
}
