export type PainSplitSide = "player" | "opponent";
export type PainSplitSpecies = "MISDREAVUS" | "GENGAR";
/** An accepted species cell, or the live pic-coords yOffset of any species. */
export type PainSplitPicture = PainSplitSpecies | number;

export interface PainSplitProjectile {
  readonly owner: "attacker" | "target";
  readonly phase: 0 | 1 | 2;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly tileOffset: 0 | 4 | 8;
}

export interface PainSplitBattlerTransform {
  readonly x2: number;
  readonly y2: number;
  readonly affine: boolean;
  readonly matrix: readonly [number, number, number, number];
}

export interface PainSplitState {
  readonly projectiles: readonly PainSplitProjectile[];
  readonly attackerTransform: PainSplitBattlerTransform;
  readonly targetTransform: PainSplitBattlerTransform;
  readonly soundRestart: "SE_M_SWAGGER2" | null;
  readonly tagsLoaded: boolean;
  readonly active: boolean;
}

export const PAIN_SPLIT_PROJECTILE_START_AGES = [4, 29, 54] as const;
export const PAIN_SPLIT_TASK_START_AGES = [16, 41, 66] as const;
export const PAIN_SPLIT_HORIZONTAL_OFFSETS = [-8, -24, 8] as const;
export const PAIN_SPLIT_MATRICES = [
  [224, 0, 0, 320],
  [194, -74, 109, 283],
  [194, 74, -109, 283],
] as const;
const IDENTITY = [256, 0, 0, 256] as const;

function projectileAtAge(
  age: number,
  phase: 0 | 1 | 2,
  owner: "attacker" | "target",
  center: Readonly<{ x: number; y: number }>,
): PainSplitProjectile | null {
  const local = age - PAIN_SPLIT_PROJECTILE_START_AGES[phase];
  // ANIMCMD_FRAME(0,5), FRAME(4,9), FRAME(8,5), END. Creation's
  // immediate animation/callback pass leaves 19 source-visible rows.
  if (local < 0 || local >= 19) return null;
  let horizontal = 0x80;
  let vertical = 0x300;
  let x2 = 0;
  let y2 = 0;
  let bounced = false;
  for (let callback = 0; callback <= local; callback += 1) {
    x2 = horizontal >> 8;
    y2 += vertical >> 8;
    if (!bounced && y2 > 42) {
      bounced = true;
      vertical = Math.trunc(-vertical / 3) * 2;
    }
    horizontal += 192;
    vertical += 128;
  }
  return {
    owner,
    phase,
    x: center.x + PAIN_SPLIT_HORIZONTAL_OFFSETS[phase],
    y: center.y - 42,
    x2,
    y2,
    tileOffset: local < 4 ? 0 : local < 13 ? 4 : 8,
  };
}

/**
 * Species pic-coordinate `yOffset` (back table for the player, front for the opponent) of the four accepted cells; every
 * other species supplies it directly (`GetBattlerSpriteCoordAttr(.., BATTLER_COORD_ATTR_..yOffset)`, liveBattlerCoordAttrs).
 */
const ACCEPTED_PIC_Y_OFFSET: Readonly<Record<string, number>> = {
  "MISDREAVUS/player": 10, "MISDREAVUS/opponent": 12, "GENGAR/player": 9, "GENGAR/opponent": 5,
};
const PHASE_MATRIX_D = [320, 283, 283] as const;

/**
 * Closed form of SetBattlerSpriteYOffsetFromYScale (battle_anim_mons.c:1897): var = 64 - 2*yOffset,
 * var2 = min((var << 8) / d, 128) for the matrix d, y2 = (var - var2) / 2 (C truncation); the latter two
 * tasks add the literal +16 on the player side. Matches the ROM 24/24 (docs/next-adapters-prep10.md s3.4).
 */
function battlerYOffset(
  phase: 0 | 1 | 2,
  side: PainSplitSide,
  species: PainSplitPicture,
): number {
  const yOffset = typeof species === "number" ? species : ACCEPTED_PIC_Y_OFFSET[`${species}/${side}`]!;
  const height = 64 - 2 * yOffset;
  const scaled = Math.min(Math.trunc((height << 8) / PHASE_MATRIX_D[phase]), 128);
  return Math.trunc((height - scaled) / 2) + (phase > 0 && side === "player" ? 16 : 0);
}

export function painSplitBattlerTransformAtSourceAge(
  age: number,
  side: PainSplitSide,
  species: PainSplitPicture,
): PainSplitBattlerTransform {
  const phase = PAIN_SPLIT_TASK_START_AGES.findIndex((start) =>
    age >= start && age < start + 12
  );
  if (phase < 0) return { x2: 0, y2: 0, affine: false, matrix: IDENTITY };
  const local = age - PAIN_SPLIT_TASK_START_AGES[phase]!;
  const sign = Math.floor((local + 1) / 3) % 2 === 0 ? 2 : -2;
  return {
    x2: sign,
    y2: battlerYOffset(phase as 0 | 1 | 2, side, species),
    affine: true,
    matrix: PAIN_SPLIT_MATRICES[phase]!,
  };
}

/**
 * Matrix shown by hardware for a display-relative age. Ordinary OAM uses
 * RAM+1. ResetSpriteRotScale runs after the task's OAM build, so its neutral
 * matrix needs one further transfer and first appears at RAM+2.
 */
export function painSplitDisplayedMatrixTransform(
  displayAge: number,
  side: PainSplitSide,
  species: PainSplitPicture,
): PainSplitBattlerTransform {
  const precedingSourceAge = displayAge - 1;
  const setupJustRan = PAIN_SPLIT_TASK_START_AGES.includes(
    precedingSourceAge as 16 | 41 | 66,
  );
  const resetJustRan = PAIN_SPLIT_TASK_START_AGES.some((start) =>
    precedingSourceAge === start + 12
  );
  const matrixSourceAge = resetJustRan ? precedingSourceAge - 1 : precedingSourceAge;
  // The movement task runs after this pass's battler OAM was assembled, so
  // x2/y2 first reach the framebuffer on the second display row. Setup's
  // matrix is installed early enough for RAM+1; this callback-order split is
  // why the task cannot use the ordinary whole-sprite latch wholesale.
  const position = painSplitBattlerTransformAtSourceAge(
    setupJustRan ? precedingSourceAge : displayAge - 2,
    side,
    species,
  );
  const matrix = painSplitBattlerTransformAtSourceAge(matrixSourceAge, side, species);
  return { ...position, affine: matrix.affine, matrix: matrix.matrix };
}

/** Complete Move_PAIN_SPLIT source body at an age relative to its first row. */
export function painSplitAtAge(
  age: number,
  attacker: Readonly<{ side: PainSplitSide; species: PainSplitPicture; center: Readonly<{ x: number; y: number }> }>,
  target: Readonly<{ side: PainSplitSide; species: PainSplitPicture; center: Readonly<{ x: number; y: number }> }>,
): PainSplitState {
  const projectiles: PainSplitProjectile[] = [];
  for (let phase = 0; phase < 3; phase += 1) {
    const attackerProjectile = projectileAtAge(age, phase as 0 | 1 | 2, "attacker", attacker.center);
    const targetProjectile = projectileAtAge(age, phase as 0 | 1 | 2, "target", target.center);
    if (attackerProjectile) projectiles.push(attackerProjectile);
    if (targetProjectile) projectiles.push(targetProjectile);
  }
  return {
    projectiles,
    attackerTransform: painSplitBattlerTransformAtSourceAge(age, attacker.side, attacker.species),
    targetTransform: painSplitBattlerTransformAtSourceAge(age, target.side, target.species),
    soundRestart: PAIN_SPLIT_TASK_START_AGES.includes(age as 16 | 41 | 66)
      ? "SE_M_SWAGGER2" : null,
    tagsLoaded: age >= 1 && age <= 79,
    active: age >= 0 && age <= 79,
  };
}
