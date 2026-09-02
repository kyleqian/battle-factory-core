/** Pure source-age reducer for Move_AURORA_BEAM's complete presentation body. */
import {
  shakeMon2DisplayedOffsetAtAge,
  shakeMon2OffsetAtTick,
  type ShakeMon2Offset,
} from "./shakeMon2.ts";

export type AuroraBeamSide = "player" | "opponent";

export interface AuroraBeamGeometry {
  readonly attackerRingOrigin: Readonly<{ x: number; y: number }>;
  readonly targetPictureCenter: Readonly<{ x: number; y: number }>;
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
}

export interface AuroraBeamProfile {
  readonly ringSlots: readonly number[];
  readonly ringMatrixIds: readonly number[];
  readonly ringSubpriority: number;
  readonly spriteOrderSeed: readonly number[];
}

export interface AuroraBeamRing {
  readonly index: number;
  readonly sourceCreationAge: number;
  readonly localAge: number;
  readonly slot: number;
  readonly matrixId: number;
  readonly subpriority: number;
  readonly x: number;
  readonly y: number;
  readonly matrix: readonly [number, number, number, number];
  readonly released: boolean;
  readonly tileFrame: 0 | 1;
}

export interface AuroraBeamState {
  readonly age: number;
  readonly active: boolean;
  readonly attackerSide: AuroraBeamSide;
  readonly rings: readonly AuroraBeamRing[];
  readonly targetOffset: ShakeMon2Offset;
  readonly displayedTargetOffset: ShakeMon2Offset;
  readonly background: "field" | "aurora";
  readonly fadeY: number;
  readonly ringPaletteRotation: number;
  readonly resources: Readonly<{ rings: boolean; freed: boolean }>;
  readonly cleanup: Readonly<{ bgLoaded: boolean; fieldRestored: boolean; firstInactive: boolean }>;
}

function fadeYAtAge(age: number): number {
  if (age >= 6 && age <= 21) return age - 5;
  if (age >= 22 && age <= 24) return 16;
  if (age >= 25 && age <= 40) return 40 - age;
  if (age >= 178 && age <= 193) return age - 177;
  if (age >= 194 && age <= 197) return 16;
  if (age >= 198 && age <= 213) return 213 - age;
  return 0;
}

function targetOffsetAtAge(age: number): ShakeMon2Offset {
  if (age >= 54 && age <= 86) {
    return shakeMon2OffsetAtTick(1, 0, 17, 1, age - 54 + 1);
  }
  if (age >= 90 && age <= 168) {
    return shakeMon2OffsetAtTick(2, 0, 40, 1, age - 90 + 1);
  }
  return { x2: 0, y2: 0 };
}

function displayedTargetOffsetAtAge(age: number): ShakeMon2Offset {
  if (age >= 55 && age <= 87) {
    return shakeMon2DisplayedOffsetAtAge(1, 0, 17, 1, age, 54);
  }
  if (age >= 91 && age <= 169) {
    return shakeMon2DisplayedOffsetAtAge(2, 0, 40, 1, age, 90);
  }
  return { x2: 0, y2: 0 };
}

function ringsAtAge(
  age: number,
  geometry: Readonly<AuroraBeamGeometry>,
  profile: Readonly<AuroraBeamProfile>,
): readonly AuroraBeamRing[] {
  const dx = geometry.targetPictureCenter.x - geometry.attackerRingOrigin.x;
  const dy = geometry.targetPictureCenter.y - geometry.attackerRingOrigin.y;
  const fixedDelta = (delta: number): number => {
    const magnitude = Math.floor(Math.abs(delta) * 256 / 17);
    return delta < 0 ? magnitude | 1 : magnitude & ~1;
  };
  const xDelta = fixedDelta(dx);
  const yDelta = fixedDelta(dy);
  const rings: AuroraBeamRing[] = [];
  for (let index = 0; index < 40; index += 1) {
    const sourceCreationAge = 42 + index * 3;
    const localAge = age - sourceCreationAge;
    if (localAge < 0 || localAge > 15) continue;
    const progress = localAge + 2;
    rings.push({
      index, sourceCreationAge, localAge,
      slot: profile.ringSlots[index]!,
      matrixId: profile.ringMatrixIds[index]!,
      subpriority: profile.ringSubpriority,
      x: geometry.attackerRingOrigin.x + Math.sign(dx) * (xDelta * progress >> 8),
      y: geometry.attackerRingOrigin.y + Math.sign(dy) * (yDelta * progress >> 8),
      matrix: age >= 90 ? [186, 0, 0, 186] : [256, 0, 0, 256],
      released: age >= 90,
      tileFrame: age >= 90 ? 1 : 0,
    });
  }
  return rings;
}

export function auroraBeamAtAge(
  age: number,
  attackerSide: AuroraBeamSide,
  geometry: Readonly<AuroraBeamGeometry>,
  profile: Readonly<AuroraBeamProfile>,
): AuroraBeamState {
  return {
    age,
    active: age >= 0 && age < 215,
    attackerSide,
    rings: ringsAtAge(age, geometry, profile),
    targetOffset: targetOffsetAtAge(age),
    displayedTargetOffset: displayedTargetOffsetAtAge(age),
    background: age >= 23 && age < 195 ? "aurora" : "field",
    fadeY: fadeYAtAge(age),
    ringPaletteRotation: age < 44 ? 0 : Math.min(43, Math.floor((age - 44) / 3) + 1) % 8,
    resources: { rings: age >= 1 && age <= 214, freed: age >= 215 },
    cleanup: { bgLoaded: age === 23, fieldRestored: age === 195, firstInactive: age >= 215 },
  };
}
