/**
 * Source-relative, host-geometry-only reference reducer for MOVE_REVENGE.
 *
 * This is deliberately a dev-time contract, not a production animation path.
 * Its input is the geometry/allocation that a future presentation seam would
 * supply; timing, side transforms, frame programs and cleanup are replayed
 * from Move_REVENGE and the purple-sheet audit rather than copied from either
 * bilateral trace.
 */
export type RevengeSide = "player-back" | "opponent-front";

export type RevengeGeometry = Readonly<{
  attacker: number;
  target: number;
  direction: 1 | -1;
  attackerCenter: readonly [number, number];
  targetCenter: readonly [number, number];
  hitTargetOrigin: readonly [number, number];
  allocations: Readonly<{
    smallMatrix: number;
    bigMatrix: number;
    firstHitMatrix: number;
    secondHitMatrix: number;
  }>;
}>;

export type RevengeComponent = Readonly<{
  kind: "small-scratch" | "big-scratch" | "lunge" | "shake" | "hitsplat";
  slot?: number;
  position?: readonly [number, number];
  animation?: number;
  frame?: number;
  hFlip?: boolean;
  vFlip?: boolean;
  timer?: number;
  matrix?: number;
  x2?: number;
}>;

export type RevengeFrame = Readonly<{
  age: number;
  active: boolean;
  scratchTag: "PURPLE_SCRATCH" | "PURPLE_SWIPE" | "IMPACT" | null;
  blendY: number | null;
  audio: "SE_M_TAKE_DOWN" | "SE_M_SWAGGER" | "SE_M_VITAL_THROW2" | "SE_M_MEGA_KICK2" | null;
  components: readonly RevengeComponent[];
  cleanup: boolean;
  hardwareUsesPreviousSoftware: boolean;
}>;

const smallFrames = [0, 16, 32] as const;
const bigFrames = [0, 64] as const;

function scratchFrame(age: number, start: number, durations: readonly number[]): number {
  const elapsed = age - start;
  let remaining = elapsed + 1; // Creation consumes the first animation tick.
  for (let index = 0; index < durations.length; index += 1) {
    if (remaining < durations[index]!) return index;
    remaining -= durations[index]!;
  }
  return durations.length - 1;
}

function scratchComponent(
  kind: "small-scratch" | "big-scratch",
  age: number,
  start: number,
  geometry: RevengeGeometry,
): RevengeComponent | null {
  const small = kind === "small-scratch";
  const end = small ? 19 : 94;
  if (age < start || age > end) return null;
  const frames = small ? smallFrames : bigFrames;
  const frame = scratchFrame(age, start, small ? [4, 4, 4] : [6, 6]);
  const origin = small ? geometry.attackerCenter : geometry.targetCenter;
  const [x, y] = [origin[0] + geometry.direction * 10, origin[1] - 10] as const;
  const animation = geometry.direction === 1 ? 0 : 1;
  return {
    kind,
    position: [x, y],
    animation,
    frame: frames[frame]!,
    hFlip: !small && animation === 1,
    vFlip: animation === 1,
    matrix: small ? geometry.allocations.smallMatrix : geometry.allocations.bigMatrix,
  };
}

function lunge(age: number, geometry: RevengeGeometry): RevengeComponent | null {
  if (age < 76 || age > 90) return null;
  const elapsed = age - 76;
  // The script's four-frame delay overlaps the turnaround's first tick, so
  // the peak is visible for two retained rows before the return trip.
  const units = elapsed <= 5 ? elapsed + 1 : elapsed <= 7 ? 6 : Math.max(0, 13 - elapsed);
  return { kind: "lunge", x2: geometry.direction * units * 4 };
}

function shake(age: number): RevengeComponent | null {
  if (age < 99 || age > 116) return null;
  const pair = Math.floor((age - 99) / 2);
  return { kind: "shake", x2: pair % 2 === 0 ? -3 : 3 };
}

function hitsplat(age: number, start: number, x: number, y: number, matrix: number): RevengeComponent | null {
  if (age < start || age > start + 17) return null;
  const elapsed = age - start;
  return { kind: "hitsplat", position: [x, y], timer: elapsed < 10 ? 8 : 17 - elapsed, matrix };
}

/** Replays one retained MOVE_REVENGE age for either battle orientation. */
export function replayRevenge(age: number, geometry: RevengeGeometry): RevengeFrame {
  if (!Number.isInteger(age) || age < 0 || age > 144) throw new Error(`MOVE_REVENGE age out of range: ${age}`);
  const components = [
    scratchComponent("small-scratch", age, 7, geometry),
    lunge(age, geometry),
    scratchComponent("big-scratch", age, 82, geometry),
    shake(age),
    hitsplat(age, 99, geometry.hitTargetOrigin[0] - geometry.direction * 10, geometry.hitTargetOrigin[1] - 8, geometry.allocations.firstHitMatrix),
    hitsplat(age, 109, geometry.hitTargetOrigin[0] + geometry.direction * 10, geometry.hitTargetOrigin[1] + 8, geometry.allocations.secondHitMatrix),
  ].filter((component): component is RevengeComponent => component !== null);
  const scratchTag = age >= 1 && age <= 72 ? "PURPLE_SCRATCH" : age >= 73 && age <= 95 ? "PURPLE_SWIPE" : age >= 96 && age <= 143 ? "IMPACT" : null;
  const blendY = age < 21 || age > 71 ? null : Math.max(0, 3 - Math.floor(Math.max(0, age - 22) / 12));
  const audio = age < 7 ? null : age < 82 ? "SE_M_TAKE_DOWN" : age < 99 ? "SE_M_SWAGGER" : age < 109 ? "SE_M_VITAL_THROW2" : "SE_M_MEGA_KICK2";
  return { age, active: age < 144, scratchTag, blendY, audio, components, cleanup: age === 144, hardwareUsesPreviousSoftware: age > 0 };
}
