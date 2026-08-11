import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { metallicShineAtAge, type MetallicShineState } from "./metallicShine.ts";

// Source-relative MOVE_METAL_CLAW timeline. Age zero is the non-permanent
// MetallicShine task's creation frame; the sweep then runs its full 96-step
// body before the script's two claw-slash strikes. The ages below are
// derived from the script command order and the dense RAM probe, matching the
// lunge/shake helpers' observed creation frames (the first strike's helper
// sprites are created one script step before their first visible callback).
export const METAL_CLAW_LUNGE_1_TICK = 98;
export const METAL_CLAW_SLASH_1_AGE = 103;
export const METAL_CLAW_LUNGE_2_TICK = 112;
export const METAL_CLAW_SLASH_2_AGE = 117;
export const METAL_CLAW_END_AGE = 138;

export interface MetalClawSlash {
  readonly spawnAge: number;
  readonly x: number;
  readonly y: number;
  readonly animation: 0 | 1;
  readonly animationFrame: number;
}

export interface MetalClawSoundEvent {
  readonly age: number;
  readonly song: "SE_M_RAZOR_WIND";
  readonly pan: number;
}

export interface MetalClawGeometry {
  readonly attackerSide: "player" | "opponent";
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface MetalClawState {
  readonly metallic: MetallicShineState;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly slashes: readonly MetalClawSlash[];
  readonly targetGlobalY: number;
  readonly soundEvents: readonly MetalClawSoundEvent[];
}

const SLASH_GROUPS = [
  { age: METAL_CLAW_SLASH_1_AGE, x: -10, animation: 0 as const },
  { age: METAL_CLAW_SLASH_2_AGE, x: 10, animation: 1 as const },
] as const;

export function metalClawSlashesAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly MetalClawSlash[] {
  return SLASH_GROUPS.flatMap((group) => {
    const local = age - group.age;
    if (local < 0 || local > 20) return [];
    const animationFrame = Math.min(4, Math.floor((local + 1) / 4));
    return [-10, 10].map((y) => ({
      spawnAge: group.age,
      x: targetCenter.x + group.x,
      y: targetCenter.y + y,
      animation: group.animation,
      animationFrame,
    }));
  });
}

/**
 * `gSpriteCoordOffsetY` driven by the `shake_mon_or_platform` helper
 * (`AnimShakeMonOrBattlePlatforms`, velocity -4, timer 1, duration 10,
 * SHAKE_MON_Y, SHAKE_MON_TARGET): the init stores the original offset, then
 * the step alternates the coordinate every other callback (the first callback
 * only decrements the shake timer), restoring and destroying the helper after
 * ten steps. The dense probe's RAM values therefore alternate in pairs and
 * restore to zero on the destroy frame.
 */
const SHAKE_Y_PATTERN = [0, 4, 4, 0, 0, 4, 4, 0, 0, 4, 0] as const;

export function metalClawTargetGlobalY(age: number): number {
  for (const spawn of [METAL_CLAW_SLASH_1_AGE, METAL_CLAW_SLASH_2_AGE]) {
    const local = age - spawn;
    if (local < 0 || local >= SHAKE_Y_PATTERN.length) continue;
    return SHAKE_Y_PATTERN[local]!;
  }
  return 0;
}

export function metalClawAtAge(
  age: number,
  geometry: MetalClawGeometry,
): MetalClawState {
  const firstLunge = horizontalLungeX2AtTick(
    6, 4, geometry.attackerSide, age - METAL_CLAW_LUNGE_1_TICK,
  );
  const secondLunge = horizontalLungeX2AtTick(
    6, 4, geometry.attackerSide, age - METAL_CLAW_LUNGE_2_TICK,
  );
  return {
    metallic: metallicShineAtAge(
      age,
      geometry.attackerCenter.x,
      geometry.attackerCenter.y,
      false,
    ),
    attackerOffset: { x2: firstLunge + secondLunge, y2: 0 },
    slashes: metalClawSlashesAtAge(age, geometry.targetCenter),
    targetGlobalY: metalClawTargetGlobalY(age),
    soundEvents: [METAL_CLAW_SLASH_1_AGE, METAL_CLAW_SLASH_2_AGE].includes(age)
      ? [{
          age,
          song: "SE_M_RAZOR_WIND",
          pan: geometry.attackerSide === "player" ? 63 : -63,
        }]
      : [],
  };
}
