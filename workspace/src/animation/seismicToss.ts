/** Pure source-age port of Factory level-50 SeismicTossMedium. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type SeismicTossSide = "player" | "opponent";
export const SEISMIC_TOSS_FIRST_INACTIVE_AGE = 227;
export const SEISMIC_TOSS_WAVE_AGES = [152, 168, 184] as const;

const WAVE_ARGS = [
  [[-12, 27, 2, 3], [8, 28, 3, 4], [-4, 30, 2, 3], [12, 25, 4, 4]],
  [[-12, 32, 3, 4], [8, 31, 2, 2], [-4, 28, 2, 3], [12, 30, 4, 3]],
  [[-12, 27, 2, 3], [8, 28, 3, 4], [-4, 30, 2, 3], [12, 25, 4, 4]],
] as const;

export interface SeismicTossAllocation {
  readonly slot: number;
  readonly matrixNum: number;
  readonly persistentOrder: number;
}
export interface SeismicTossProfile {
  readonly rocks: readonly (readonly SeismicTossAllocation[])[];
  readonly hitsplats: readonly SeismicTossAllocation[];
  readonly attackerSubpriority: number;
  readonly targetSubpriority: number;
  readonly attackerPalette: readonly Readonly<{ r: number; g: number; b: number }>[];
  readonly targetPalette: readonly Readonly<{ r: number; g: number; b: number }>[];
  readonly attackerAnimFrame: 0 | 1;
  readonly targetAnimFrame: 0 | 1;
}
export interface SeismicTossGeometry {
  readonly targetEffectCenter: Readonly<{ x: number; y: number }>;
  readonly targetRockCenter: Readonly<{ x: number; y: number }>;
  readonly attackerRestOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
}
export interface SeismicTossRock {
  readonly wave: number; readonly index: number; readonly localAge: number;
  readonly slot: number; readonly matrixNum: number; readonly persistentOrder: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly animation: number; readonly subpriority: number;
  readonly matrix: readonly [number, number, number, number];
}
export interface SeismicTossHitsplat {
  readonly wave: number; readonly localAge: number; readonly slot: number;
  readonly matrixNum: number; readonly persistentOrder: number;
  readonly x: number; readonly y: number; readonly subpriority: number;
  readonly matrix: readonly [303, 0, 0, 303];
}
export interface SeismicTossState {
  readonly age: number; readonly active: boolean; readonly scriptActive: boolean;
  readonly branch: "medium"; readonly rocks: readonly SeismicTossRock[];
  readonly hitsplats: readonly SeismicTossHitsplat[];
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetMonbg: boolean; readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly background: "field" | "in-air"; readonly bldy: number;
  readonly bg3Y: number; readonly visualTasks: readonly string[];
  readonly resources: Readonly<{ impact: boolean; rocks: boolean }>;
  readonly audio: readonly Readonly<{ age: number; song: string; pan: SeismicTossSide | "center" }>[];
}

function rockAtAge(age: number, wave: number, index: number,
  center: Readonly<{ x: number; y: number }>, allocation: SeismicTossAllocation,
  targetSubpriority: number): SeismicTossRock | null {
  const localAge = age - SEISMIC_TOSS_WAVE_AGES[wave]!;
  if (localAge < 0 || localAge > 16) return null;
  const [dx, dy, amplitude, animation] = WAVE_ARGS[wave]![index]!;
  let x2 = 0, y2 = 0;
  for (let callback = 1; callback <= localAge + 1; callback += 1) {
    x2 += Math.trunc(dx * callback / 40);
    y2 -= (GBA_SINE_TABLE_256[(callback * 8) & 0xff]! * amplitude) >> 8;
  }
  const angle = ((localAge + 2) * 5) & 0xff;
  const sin = GBA_SINE_TABLE_256[angle]!;
  const cos = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
  return { wave, index, localAge, ...allocation, x: center.x + dx, y: center.y + dy,
    x2, y2, animation, subpriority: targetSubpriority - 2,
    matrix: [cos, sin, -sin, cos] };
}

function targetOffsetAtAge(age: number, initial: Readonly<{ x2: number; y2: number }>) {
  for (const birth of SEISMIC_TOSS_WAVE_AGES) {
    const local = age - birth;
    if (local >= 0 && local <= 7) return { x2: 0, y2: Math.floor(local / 2) % 2 ? 3 : 0 };
    if (local === 8) return { x2: 0, y2: 0 };
  }
  return age >= 152 ? { x2: 0, y2: 0 } : initial;
}

function sourceBg3Y(age: number): number {
  if (age < 32 || age >= 203) return 0;
  let y = 0;
  const callbacks = Math.min(121, age - 30);
  for (let tick = 0; tick < callbacks; tick += 1) y += Math.trunc((200 - tick * 3) / 10);
  if (age <= 151) return y & 0xffff;
  const amplitude = ((age - 150) * 80) & 0xff;
  return (y + ((GBA_SINE_TABLE_256[(4 + 64) & 0xff]! * amplitude) >> 8)) & 0xffff;
}

function bldyAtAge(age: number): number {
  if (age >= 15 && age <= 30) return age - 14;
  if (age >= 31 && age <= 33) return 16;
  if (age >= 34 && age <= 49) return 49 - age;
  if (age >= 186 && age <= 201) return age - 185;
  if (age >= 202 && age <= 205) return 16;
  if (age >= 206 && age <= 221) return 221 - age;
  return 0;
}

export function seismicTossAtAge(age: number, targetSide: SeismicTossSide,
  geometry: Readonly<SeismicTossGeometry>, profile: Readonly<SeismicTossProfile>): SeismicTossState {
  const rocks = WAVE_ARGS.flatMap((wave, waveIndex) => wave.map((_args, index) =>
    rockAtAge(age, waveIndex, index, geometry.targetRockCenter,
      profile.rocks[waveIndex]![index]!, profile.targetSubpriority)))
    .filter((rock): rock is SeismicTossRock => rock !== null);
  const hitsplats = SEISMIC_TOSS_WAVE_AGES.map((birth, wave) => {
    const localAge = age - birth;
    if (localAge < 0 || localAge > 9) return null;
    const allocation = profile.hitsplats[wave]!;
    return { wave, localAge, ...allocation,
      x: geometry.targetEffectCenter.x
        + (targetSide === "player" ? (wave === 1 ? -10 : 10) : (wave === 1 ? 10 : -10)),
      y: geometry.targetEffectCenter.y - 8, subpriority: profile.targetSubpriority - 3,
      matrix: [303, 0, 0, 303] as const };
  }).filter((hit): hit is SeismicTossHitsplat => hit !== null);
  const visualTasks: string[] = [];
  if (age >= 7 && age <= 225) visualTasks.push("Task_UpdateMonBg");
  if (age >= 13 && age <= 49 || age >= 184 && age <= 221) visualTasks.push("Task_FadeToBg");
  if (age >= 32 && age <= 150) visualTasks.push("AnimTask_MoveSeismicTossBg");
  if (age >= 152 && age <= 202) visualTasks.push("AnimTask_SeismicTossBgAccelerateDownAtEnd");
  for (const birth of SEISMIC_TOSS_WAVE_AGES) if (age >= birth && age <= birth + 7) visualTasks.push("AnimTask_ShakeMon");
  if (age >= 223 && age <= 225) visualTasks.push("Task_ClearMonBg");
  return { age, active: age >= 0 && age <= 227, scriptActive: age >= 0 && age < 227,
    branch: "medium", rocks, hitsplats,
    targetOffset: targetOffsetAtAge(age, geometry.targetRestOffset),
    targetMonbg: age >= 7 && age <= 225,
    alpha: age >= 10 && age <= 222 ? { eva: 12, evb: 8 } : null,
    background: age >= 32 && age <= 203 ? "in-air" : "field",
    bldy: bldyAtAge(age), bg3Y: sourceBg3Y(age), visualTasks,
    resources: { impact: age >= 1 && age < 227, rocks: age >= 4 && age < 227 },
    audio: [
      ...(age === 32 ? [{ age, song: "SE_M_SKY_UPPERCUT", pan: "center" as const }] : []),
      ...SEISMIC_TOSS_WAVE_AGES.filter((birth) => birth === age).map((_birth, wave) =>
        ({ age, song: wave === 1 ? "SE_M_ROCK_THROW" : "SE_M_STRENGTH", pan: targetSide })),
    ],
  };
}
