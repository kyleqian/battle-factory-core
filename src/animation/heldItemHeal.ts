/**
 * Source-composed `General_HeldItemEffect` / Sitrus presentation timeline.
 *
 * Age zero is the first identity rotation display. Callers supply that
 * controller-owned epoch plus already-resolved HP; this reducer never reads a
 * battle tick, applies an item, or calculates healing.
 */
export const SITRUS_ITEM_STAR_FIRST_VISIBLE_AGE = 96;
export const SITRUS_ITEM_SECOND_STAR_FIRST_VISIBLE_AGE = 106;
export const SITRUS_ITEM_RING_FIRST_AGE = 167;
export const SITRUS_ITEM_TINT_FIRST_AGE = 168;
export const SITRUS_ITEM_HEAL_TEXT_FIRST_AGE = 204;
export const SITRUS_ITEM_HP_CLIMB_FIRST_AGE = 306;
export const SITRUS_ITEM_TEXT_CLEAR_AGE = 342;
export const SITRUS_ITEM_ACTION_MENU_REVEAL_AGE = 348;

const ROTATION_CYCLE_TICKS = 32;
const ROTATION_CYCLE_COUNT = 3;
const ROTATION_TABLE: readonly (readonly [number, number, number, number])[] = [
  [256, 0, 0, 256],
  [255, 6, -6, 255],
  [255, 6, -6, 255],
  [255, 12, -12, 255],
  [255, 12, -12, 255],
  [255, 18, -18, 255],
  [255, 18, -18, 255],
  [254, 25, -25, 254],
  [254, 25, -25, 254],
  [254, 31, -31, 254],
  [254, 31, -31, 254],
  [253, 37, -37, 253],
  [253, 37, -37, 253],
  [252, 43, -43, 252],
  [252, 43, -43, 252],
  [251, 49, -49, 251],
  [251, 49, -49, 251],
  [251, 49, -49, 251],
  [252, 43, -43, 252],
  [252, 43, -43, 252],
  [253, 37, -37, 253],
  [253, 37, -37, 253],
  [254, 31, -31, 254],
  [254, 31, -31, 254],
  [254, 25, -25, 254],
  [254, 25, -25, 254],
  [255, 18, -18, 255],
  [255, 18, -18, 255],
  [255, 12, -12, 255],
  [255, 12, -12, 255],
  [255, 6, -6, 255],
  [255, 6, -6, 255],
];

export interface SitrusRotation {
  readonly pa: number;
  readonly pb: number;
  readonly pc: number;
  readonly pd: number;
  readonly y2: number;
}

/** `null` means the identity/static battler draw is sufficient. */
export function sitrusRotationAtAge(age: number): SitrusRotation | null {
  if (age < 0 || age >= ROTATION_CYCLE_TICKS * ROTATION_CYCLE_COUNT) {
    return null;
  }
  const [pa, pb, pc, pd] = ROTATION_TABLE[age % ROTATION_CYCLE_TICKS]!;
  if (pb === 0 && pc === 0) return null;
  return { pa, pb, pc, pd, y2: Math.abs(pc) >> 3 };
}

const STAR_SPAWNS = [
  { firstVisibleAge: SITRUS_ITEM_STAR_FIRST_VISIBLE_AGE, dx: -15, dy: 0 },
  { firstVisibleAge: SITRUS_ITEM_SECOND_STAR_FIRST_VISIBLE_AGE, dx: 12, dy: -5 },
] as const;
const STAR_VISIBLE_TICKS = 61;

export interface SitrusStarPlacement {
  readonly frameIndex: number;
  readonly cx: number;
  readonly cy: number;
}

export function sitrusStarPlacementAtAge(
  age: number,
  spawnIndex: number,
  center: Readonly<{ x: number; y: number }>,
): SitrusStarPlacement | null {
  const spawn = STAR_SPAWNS[spawnIndex];
  if (!spawn) return null;
  const local = age - spawn.firstVisibleAge;
  if (local < 0 || local >= STAR_VISIBLE_TICKS) return null;
  return {
    frameIndex: Math.floor((local + 1) / 7) % 8,
    cx: center.x + spawn.dx - 16,
    cy: center.y + spawn.dy + Math.floor((local + 1) / 8) - 16,
  };
}

const TINT_COEFFS = [7, 5, 3, 1] as const;

export function sitrusTintCoeffAtAge(age: number): number {
  const local = age - SITRUS_ITEM_TINT_FIRST_AGE;
  if (local < 0 || local >= 20) return 0;
  return TINT_COEFFS[Math.floor(local / 5)]!;
}

export interface SitrusRingMatrix {
  readonly pa: number;
  readonly pb: 0;
  readonly pc: 0;
  readonly pd: number;
}

export function sitrusRingMatrixAtAge(age: number): SitrusRingMatrix | null {
  const local = age - SITRUS_ITEM_RING_FIRST_AGE;
  if (local < 0 || local > 31) return null;
  const n = Math.min(31, local + 1);
  const a = Math.floor(4096 / n);
  return { pa: a, pb: 0, pc: 0, pd: a };
}

const HEAL_TEXT_LENGTH = "ONIX’s SITRUS BERRY".length + "restored health!".length;

export function sitrusHealTextVisibleCharsAtAge(age: number): number {
  if (age < SITRUS_ITEM_HEAL_TEXT_FIRST_AGE) return 0;
  return Math.min(
    HEAL_TEXT_LENGTH,
    age - SITRUS_ITEM_HEAL_TEXT_FIRST_AGE + 1,
  );
}

/** Generic display-only climb between controller-supplied resolved HP values. */
export function sitrusDisplayedHpAtAge(
  age: number,
  startHp: number,
  endHp: number,
): number {
  if (age < SITRUS_ITEM_HP_CLIMB_FIRST_AGE) return startHp;
  return Math.min(
    endHp,
    startHp + age - SITRUS_ITEM_HP_CLIMB_FIRST_AGE + 1,
  );
}
