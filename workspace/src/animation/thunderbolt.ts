/** Pure source-age port of Move_THUNDERBOLT and ElectricityEffect. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type ThunderboltSide = "player" | "opponent";
export interface ThunderboltGeometry {
  readonly targetBattleCenter: Readonly<{ x: number; y: number }>;
  readonly targetPictureCenter: Readonly<{ x: number; y: number }>;
}
export interface ThunderboltAllocation {
  readonly slot: number; readonly matrixNum: number; readonly order: number;
}
export interface ThunderboltProfile {
  readonly bolts: readonly ThunderboltAllocation[];
  readonly orb: ThunderboltAllocation;
  readonly flashes: readonly ThunderboltAllocation[];
  readonly arcs: readonly ThunderboltAllocation[];
}
export interface ThunderboltSprite {
  readonly kind: "bolt" | "orb" | "flash" | "arc";
  readonly index: number; readonly slot: number; readonly matrixNum: number;
  readonly order: number; readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number; readonly subpriority: number;
  readonly tile: number; readonly hidden: boolean;
  readonly matrix: readonly [number, number, number, number];
}
export interface ThunderboltState {
  readonly age: number; readonly active: boolean;
  readonly sprites: readonly ThunderboltSprite[];
  readonly backgroundPaletteY: number; readonly targetPaletteY: number;
  readonly cleanup: boolean;
}

const BOLTS = [
  [28, 24, -52, 0], [30, 24, -52, 0], [32, 24, -52, 0],
  [34, 24, -52, 0], [36, 24, -52, 0], [37, -24, -52, 0],
  [39, -24, -52, 0], [41, -24, -52, 0], [43, -24, -52, 0],
  [45, -24, -52, 0], [46, 0, -60, 1], [48, 0, -60, 1],
  [50, 0, -60, 1], [52, 0, -60, 1], [54, 0, -60, 1],
] as const;
const FLASH = [
  [32, 0, 0], [32, 64, 1], [32, 128, 0], [32, 192, 2],
  [16, 32, 0], [16, 96, 1], [16, 160, 0], [16, 224, 2],
] as const;
const ARCS = [[5, 0, 0], [-5, 10, 1], [15, 20, 2], [-15, -10, 0],
  [25, 0, 1], [-8, 8, 2], [2, -8, 0], [-20, 15, 1]] as const;
const sin = (angle: number) => GBA_SINE_TABLE_256[angle & 255]!;

function palette(age: number): [number, number] {
  let bg = age < 10 ? 0 : age <= 15 ? age - 9 : age < 108 ? 6
    : age < 116 ? 2 : age < 124 ? 6 : age < 132 ? 2 : age < 230 ? 6
      : age <= 235 ? 235 - age : 0;
  const target = age < 57 ? 0 : age <= 69 ? age - 56
    : age <= 82 ? 82 - age : 0;
  return [bg, target];
}

export function thunderboltAtAge(age: number, targetSide: ThunderboltSide,
  geometry: Readonly<ThunderboltGeometry>, profile: Readonly<ThunderboltProfile>): ThunderboltState {
  const sprites: ThunderboltSprite[] = [];
  for (const [index, [birth, dx, dy, wide]] of BOLTS.entries()) {
    const local = age - birth;
    if (local < 0 || local >= 14) continue;
    const alloc = profile.bolts[index]!;
    sprites.push({ kind: "bolt", index, ...alloc,
      x: geometry.targetBattleCenter.x + dx, y: geometry.targetBattleCenter.y + dy + 16 * (index % 5 + 1),
      x2: 0, y2: 0, subpriority: 2,
      tile: wide ? 8 + (index % 5 === 4 ? 0 : index % 5 * 4) : index % 5,
      hidden: false, matrix: [256, 0, 0, 256] });
  }
  if (age >= 105 && age <= 149) {
    const local = age - 105;
    const phase = local % 20;
    const scale = phase <= 10 ? 232 - phase * 8 : 152 + (phase - 10) * 8;
    const blink = Math.floor(local / 4) % 2 === 1;
    sprites.push({ kind: "orb", index: 0, ...profile.orb,
      x: geometry.targetPictureCenter.x,
      y: geometry.targetPictureCenter.y, x2: 0, y2: 0,
      subpriority: targetSide === "player" ? 27 : 37,
      tile: Math.floor((local % 18) / 6) * 16, hidden: age === 149 || blink,
      matrix: [Math.trunc(65536 / scale), 0, 0, Math.trunc(65536 / scale)] });
  }
  for (const [index, [radius, angle, tile]] of FLASH.entries()) {
    const birth = index === 7 ? 106 : 105;
    const local = age - birth;
    if (local < 0 || local > (index === 7 ? 42 : 43)) continue;
    const alloc = profile.flashes[index]!;
    const callbackLead = index === 7 ? 1 : 0;
    const phase = (angle + (local + callbackLead) * 40) & 255;
    const rotation = (local + (index === 7 ? 2 : 1)) * 20 & 255;
    let hidden = false;
    for (let tick = 0; tick <= local + callbackLead; tick += 1) {
      if (((angle + (tick + 1) * 40) & 255) % 3 === 0) hidden = !hidden;
    }
    sprites.push({ kind: "flash", index, ...alloc,
      x: geometry.targetPictureCenter.x, y: geometry.targetPictureCenter.y,
      x2: Math.floor(sin(phase) * radius / 256), y2: Math.floor(sin(phase + 64) * radius / 256),
      subpriority: targetSide === "player" ? 26 : 36, tile: tile * 4,
      hidden,
      matrix: [sin(rotation + 64), -sin(rotation), sin(rotation), sin(rotation + 64)] });
  }
  for (const [index, [dx, dy, tile]] of ARCS.entries()) {
    const birth = 173 + index * 4, local = age - birth;
    if (local < 0 || local > 5) continue;
    const alloc = profile.arcs[index]!;
    sprites.push({ kind: "arc", index, ...alloc,
      x: geometry.targetBattleCenter.x + (targetSide === "player" ? -dx : dx),
      y: geometry.targetBattleCenter.y + dy,
      x2: 0, y2: 0, subpriority: targetSide === "player" ? 28 : 38,
      tile: tile * 4, hidden: false, matrix: [256, 0, 0, 256] });
  }
  const [backgroundPaletteY, targetPaletteY] = palette(age);
  return { age, active: age >= 0 && age < 236, sprites,
    backgroundPaletteY, targetPaletteY, cleanup: age >= 236 };
}
