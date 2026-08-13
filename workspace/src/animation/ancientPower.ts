/**
 * Source-relative MOVE_ANCIENT_POWER body.
 *
 * This module deliberately stops at the move-owned component boundary.  It
 * ports the literal rock callback and task schedules without owning damage,
 * RNG, turn order, or controller state.  The Scene-ON compositor remains
 * open until a Baltoy back/front seam can be checked against both dense raw
 * RGB windows.
 *
 * Source: reference/pokeemerald/data/battle_anim_scripts.s:6875-6906 and
 * reference/pokeemerald/src/battle_anim_rock.c:565-582.
 */
import {
  shakeMon2DisplayedOffsetAtAge,
  type ShakeMon2Offset,
} from "./shakeMon2.ts";

export const ANCIENT_POWER_MOVE_ID = 246;
export const ANCIENT_POWER_ATTACKER_SPECIES_ID = 318;
export const ANCIENT_POWER_SOURCE_SET_ID = 75;

export interface AncientPowerRockSpec {
  /** `InitSpritePosToAnimAttacker`'s signed initial x argument. */
  readonly xOffset: number;
  /** `StartSpriteAnim` argument, indexing `sAnims_BasicRock`. */
  readonly animNum: 1 | 2 | 3 | 4 | 5;
  /** `AnimRaiseSprite` terminal y offset. */
  readonly terminalY: number;
  /** `AnimRaiseSprite` linear duration. */
  readonly duration: number;
  /** First displayed age with this sprite allocated by the script. */
  readonly spawnAge: number;
}

/** The ten literal createsprite calls, grouped as 6 + 2 + 2 by the script. */
export const ANCIENT_POWER_ROCKS: readonly AncientPowerRockSpec[] = Object.freeze([
  { xOffset: 20, animNum: 2, terminalY: -48, duration: 50, spawnAge: 10 },
  { xOffset: 0, animNum: 5, terminalY: -38, duration: 25, spawnAge: 10 },
  { xOffset: 32, animNum: 3, terminalY: -28, duration: 40, spawnAge: 10 },
  { xOffset: -20, animNum: 2, terminalY: -48, duration: 50, spawnAge: 10 },
  { xOffset: 20, animNum: 1, terminalY: -28, duration: 60, spawnAge: 10 },
  { xOffset: 0, animNum: 4, terminalY: -28, duration: 30, spawnAge: 10 },
  { xOffset: 15, animNum: 5, terminalY: -48, duration: 25, spawnAge: 22 },
  { xOffset: -10, animNum: 4, terminalY: -42, duration: 30, spawnAge: 22 },
  { xOffset: 0, animNum: 5, terminalY: -42, duration: 25, spawnAge: 34 },
  { xOffset: -25, animNum: 4, terminalY: -48, duration: 30, spawnAge: 34 },
]);

export interface AncientPowerGeometry {
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly attackerBattlePositionCenter: Readonly<{ x: number; y: number }>;
  readonly attackerSide: "player" | "opponent";
}

export interface AncientPowerRockState extends AncientPowerRockSpec {
  readonly centerX: number;
  readonly centerY: number;
  readonly y2: number;
}

function signedInitialX(xOffset: number, side: AncientPowerGeometry["attackerSide"]): number {
  return side === "opponent" ? -xOffset : xOffset;
}

/**
 * `StartAnimLinearTranslation` uses a signed Q8.8 delta and emits the
 * preceding integer pixel at the callback pass.  The source row containing
 * the createsprite has already run that first callback, hence `step=1` at
 * `age === spawnAge`; this reproduces the observed 245/389/... data values.
 */
function raiseY2(spec: AncientPowerRockSpec, age: number): number {
  const step = age - spec.spawnAge + 1;
  if (step <= 0) return 0;
  const magnitude = Math.floor(
    (Math.abs(spec.terminalY) * 256 * step) / spec.duration,
  );
  const y2 = spec.terminalY < 0
    ? -Math.floor(magnitude / 256)
    : Math.floor(magnitude / 256);
  return y2 === 0 ? 0 : y2;
}

export function ancientPowerRockState(
  index: number,
  age: number,
  geometry: Readonly<AncientPowerGeometry>,
): AncientPowerRockState | null {
  const spec = ANCIENT_POWER_ROCKS[index];
  if (!spec || age < spec.spawnAge || age > spec.spawnAge + spec.duration) return null;
  const x = geometry.attackerCenter.x + signedInitialX(spec.xOffset, geometry.attackerSide);
  const y = geometry.attackerBattlePositionCenter.y + 32;
  return { ...spec, centerX: x, centerY: y, y2: raiseY2(spec, age) };
}

export function ancientPowerRocksAtAge(
  age: number,
  geometry: Readonly<AncientPowerGeometry>,
): readonly AncientPowerRockState[] {
  return ANCIENT_POWER_ROCKS.flatMap((_, index) => {
    const state = ancientPowerRockState(index, age, geometry);
    return state ? [state] : [];
  });
}

export interface AncientPowerTaskSchedule {
  readonly creationAge: number;
  readonly xOffset: number;
  readonly yOffset: number;
  readonly numTimes: number;
  readonly frameDelay: number;
}

export const ANCIENT_POWER_ATTACKER_SHAKE: Readonly<AncientPowerTaskSchedule> = Object.freeze({
  creationAge: 10,
  xOffset: 1,
  yOffset: 0,
  numTimes: 30,
  frameDelay: 1,
});

export const ANCIENT_POWER_TARGET_SHAKE: Readonly<AncientPowerTaskSchedule> = Object.freeze({
  creationAge: 77,
  xOffset: 3,
  yOffset: 0,
  numTimes: 6,
  frameDelay: 1,
});

export function ancientPowerShakeAtAge(
  age: number,
  schedule: Readonly<AncientPowerTaskSchedule>,
): ShakeMon2Offset {
  return shakeMon2DisplayedOffsetAtAge(
    schedule.xOffset,
    schedule.yOffset,
    schedule.numTimes,
    schedule.frameDelay,
    age,
    schedule.creationAge,
  );
}

/** The two source-side helpers temporarily move the attacker by sixteen px. */
export const ANCIENT_POWER_SLIDE_TO_OFFSET_AGE = 73;
export const ANCIENT_POWER_SLIDE_TO_ORIGINAL_AGE = 89;

/** Components claimed by this reducer; shared components remain independent acceptance units. */
export const ANCIENT_POWER_COMPONENTS = Object.freeze([
  "asset:ANIM_TAG_IMPACT",
  "asset:ANIM_TAG_ROCKS",
  "sprite:gAncientPowerRockSpriteTemplate",
  "sprite:gSlideMonToOffsetSpriteTemplate",
  "sprite:gSlideMonToOriginalPosSpriteTemplate",
  "task:AnimTask_ShakeMon2",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:monbg",
  "visualCommand:setalpha",
  "visualCommand:shake_mon_or_platform",
] as const);
