import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  earthquakePaletteAtAge,
  horizontalShakeAtAge,
  type ComplexPaletteBlendState,
  type HorizontalShakeState,
} from "./earthquake.ts";

export type FissureSide = "player" | "opponent";
export const FISSURE_FRAME_COUNT = 254;
export const FISSURE_SHAKE_FIRST_AGE = 3;
export const FISSURE_DIRT_GROUP_AGES = [14, 48, 82] as const;

interface DirtPlumeSpec {
  readonly side: 0 | 1;
  readonly targetX: number;
  readonly targetY: number;
  readonly wave: number;
  readonly slot: 3 | 4 | 5 | 7;
}

const FAR_PLUMES: readonly DirtPlumeSpec[] = [
  { side: 0, targetX: 12, targetY: -48, wave: -16, slot: 3 },
  { side: 0, targetX: 16, targetY: -16, wave: -10, slot: 4 },
  { side: 1, targetX: 14, targetY: -52, wave: -18, slot: 5 },
  { side: 1, targetX: 12, targetY: -32, wave: -16, slot: 7 },
] as const;

const CLOSE_PLUMES: readonly DirtPlumeSpec[] = [
  { side: 0, targetX: 12, targetY: -24, wave: -16, slot: 3 },
  { side: 0, targetX: 16, targetY: -38, wave: -10, slot: 4 },
  { side: 1, targetX: 14, targetY: -20, wave: -18, slot: 5 },
  { side: 1, targetX: 12, targetY: -36, wave: -16, slot: 7 },
] as const;

export interface FissureDirtPlume {
  readonly slot: 3 | 4 | 5 | 7;
  readonly group: 0 | 1 | 2;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
}

export interface FissureSoundEvent {
  readonly age: number;
  readonly song: "SE_M_EARTHQUAKE" | "SE_M_DIG";
  readonly panSide: FissureSide;
}

export interface FissureState {
  readonly age: number;
  readonly active: boolean;
  readonly mudSandLoaded: boolean;
  readonly shake: HorizontalShakeState;
  readonly sourceTargetX2: number;
  readonly displayedTargetX2: number;
  readonly dirt: readonly FissureDirtPlume[];
  readonly displayedDirt: readonly FissureDirtPlume[];
  readonly palette: ComplexPaletteBlendState;
  readonly displayedPalette: ComplexPaletteBlendState;
  readonly background: "field" | "fissure";
  readonly bldcnt: 0 | 232;
  readonly bldy: number;
  readonly bg3Scroll: Readonly<{ x: number; y: number }>;
  readonly soundEvents: readonly FissureSoundEvent[];
}

function signedLinearOffset(distance: number, duration: number, callbacks: number): number {
  let delta = Math.trunc((Math.abs(distance) << 8) / duration);
  delta = distance < 0 ? delta | 1 : delta & ~1;
  const magnitude = (delta * Math.min(callbacks, duration)) >> 8;
  if (magnitude === 0) return 0;
  return distance < 0 ? -magnitude : magnitude;
}

function plumeAtLocalAge(
  localAge: number,
  group: 0 | 1 | 2,
  spec: DirtPlumeSpec,
  targetCenter: Readonly<{ x: number; y: number }>,
): FissureDirtPlume | null {
  if (localAge < 0 || localAge > 23) return null;
  const callbacks = localAge + 1;
  const direction = spec.side === 0 ? 1 : -1;
  const x = targetCenter.x + direction * 24;
  const y = targetCenter.y + 30;
  const phase = (callbacks * Math.floor(0x8000 / 24)) >> 8;
  return {
    slot: spec.slot,
    group,
    localAge,
    x,
    y,
    x2: signedLinearOffset(direction * spec.targetX, 24, callbacks),
    y2: signedLinearOffset(spec.targetY, 24, callbacks)
      + ((GBA_SINE_TABLE_256[phase & 0xff]! * spec.wave) >> 8),
  };
}

export function fissureDirtAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly FissureDirtPlume[] {
  const result: FissureDirtPlume[] = [];
  for (let group = 0 as 0 | 1 | 2; group < 3; group = (group + 1) as 0 | 1 | 2) {
    const specs = group === 1 ? CLOSE_PLUMES : FAR_PLUMES;
    const localAge = age - FISSURE_DIRT_GROUP_AGES[group];
    for (const spec of specs) {
      const plume = plumeAtLocalAge(localAge, group, spec, targetCenter);
      if (plume) result.push(plume);
    }
  }
  return result;
}

/**
 * Back-to-front software painter order for the equal-subpriority dirt OBJs.
 *
 * `BuildOamBuffer` emits the frontmost equal-subpriority OBJ first: larger
 * on-screen Y first, while a tie keeps the previous row's stable OAM order.
 * A framebuffer compositor therefore paints the inverse order.
 */
export function fissureDirtPainterOrder(
  plumes: readonly FissureDirtPlume[],
): readonly FissureDirtPlume[] {
  if (plumes.length <= 1) return plumes;
  const exemplar = plumes[0]!;
  const specs = exemplar.group === 1 ? CLOSE_PLUMES : FAR_PLUMES;
  const targetCenter = {
    x: exemplar.x - (specs.find(({ slot }) => slot === exemplar.slot)!.side === 0 ? 24 : -24),
    y: exemplar.y - 30,
  };
  // SortSprites is stable. Replaying its source-relative comparisons from
  // creation preserves the previous row's OAM order when two arcs cross at
  // the same Y; a slot-only tie-break loses that persistent state.
  let frontToBack = specs.map(({ slot }) => slot);
  for (let localAge = 0; localAge <= exemplar.localAge; localAge += 1) {
    const yBySlot = new Map(specs.map((spec) => [
      spec.slot,
      (() => {
        const plume = plumeAtLocalAge(localAge, exemplar.group, spec, targetCenter)!;
        return plume.y + plume.y2;
      })(),
    ]));
    frontToBack = [...frontToBack].sort((a, b) => yBySlot.get(b)! - yBySlot.get(a)!);
  }
  const bySlot = new Map(plumes.map((plume) => [plume.slot, plume]));
  return frontToBack.reverse().map((slot) => bySlot.get(slot)!);
}

export function fissurePaletteAtAge(age: number): ComplexPaletteBlendState {
  for (const startAge of [31, 65]) {
    const local = age - startAge;
    if (local < 0 || local > 7) continue;
    if (local <= 2) return {
      active: true, timer: 2 - local, remainingBlends: 1,
      color: "black", coefficient: 14,
    };
    return {
      active: true, timer: Math.max(0, 6 - local), remainingBlends: 0,
      color: "white", coefficient: 14,
    };
  }
  return earthquakePaletteAtAge(-1);
}

export function fissureBldyAtAge(age: number): number {
  if (age >= 136 && age <= 151) return age - 135;
  if (age >= 152 && age <= 154) return 16;
  if (age >= 155 && age <= 169) return 170 - age;
  if (age >= 216 && age <= 231) return age - 215;
  if (age >= 232 && age <= 235) return 16;
  if (age >= 236 && age <= 250) return 251 - age;
  return 0;
}

function targetShakeX2AtAge(age: number): number {
  return horizontalShakeAtAge(age - FISSURE_SHAKE_FIRST_AGE, 10, 50).battlerX2;
}

/** Complete pure source-age reducer for Move_FISSURE through first cleanup. */
export function fissureAtAge(
  age: number,
  targetSide: FissureSide,
  targetAnimationCenter: Readonly<{ x: number; y: number }>,
  targetBattleCenter: Readonly<{ x: number; y: number }>,
  initialTargetX2 = 0,
): FissureState {
  const shake = horizontalShakeAtAge(age - FISSURE_SHAKE_FIRST_AGE, 10, 50);
  const hold = {
    x: (32 - targetAnimationCenter.x) & 0x1ff,
    y: (64 - targetAnimationCenter.y) & 0xff,
  };
  const platformDisplay = horizontalShakeAtAge(
    age - 1 - FISSURE_SHAKE_FIRST_AGE,
    10,
    50,
  ).platformX;
  const firstTargetWriteDisplayed = age >= 6;
  return {
    age,
    active: age >= 0 && age < FISSURE_FRAME_COUNT - 1,
    mudSandLoaded: age >= 1 && age < FISSURE_FRAME_COUNT - 1,
    shake,
    sourceTargetX2: age < 5 ? initialTargetX2 : targetShakeX2AtAge(age),
    displayedTargetX2: firstTargetWriteDisplayed && age !== 6
        ? targetShakeX2AtAge(age - 2)
      : initialTargetX2,
    dirt: fissureDirtAtAge(age, targetBattleCenter),
    displayedDirt: fissureDirtAtAge(age - 1, targetBattleCenter),
    palette: fissurePaletteAtAge(age),
    displayedPalette: fissurePaletteAtAge(age - 1),
    background: age >= 154 && age <= 233 ? "fissure" : "field",
    bldcnt: age >= 135 && age <= 170 || age >= 215 && age <= 251 ? 232 : 0,
    bldy: fissureBldyAtAge(age),
    bg3Scroll: age >= 154 && age <= 233
      ? hold
      : { x: platformDisplay, y: 0 },
    soundEvents: [
      ...(age === 4 ? [{ age, song: "SE_M_EARTHQUAKE" as const, panSide: targetSide }] : []),
      ...([14, 48, 82].includes(age)
        ? [{ age, song: "SE_M_DIG" as const, panSide: targetSide }]
        : []),
    ],
  };
}
