/** Pure source-age port of Move_ZAP_CANNON and ElectricityEffect. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type ZapCannonSide = "player" | "opponent";
export interface ZapCannonGeometry {
  readonly attackerPictureCenter: Readonly<{ x: number; y: number }>;
  readonly targetPictureCenter: Readonly<{ x: number; y: number }>;
  readonly targetBattleCenter: Readonly<{ x: number; y: number }>;
}
export interface ZapCannonAllocation {
  readonly slot: number;
  readonly matrixNum: number;
  /** Persistent creation-order tie break; dynamic Y sorting remains compositor-owned. */
  readonly order: number;
  /** A script-created sprite can miss the first retained source row after allocation. */
  readonly visibleFrom?: number;
  /** Source row on which AnimZapCannonSpark first replaces the raw script args. */
  readonly initializedFrom?: number;
}
export interface ZapCannonProfile {
  readonly ball: ZapCannonAllocation;
  readonly sparks: readonly ZapCannonAllocation[];
  readonly arcs: readonly ZapCannonAllocation[];
}
export interface ZapCannonSprite {
  readonly kind: "ball" | "spark" | "arc";
  readonly index: number;
  readonly slot: number;
  readonly matrixNum: number;
  readonly order: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly tile: number;
  readonly hidden: boolean;
  readonly matrix: readonly [number, number, number, number];
}
export interface ZapCannonState {
  readonly age: number;
  readonly active: boolean;
  readonly sprites: readonly ZapCannonSprite[];
  readonly targetX2: number;
  readonly resources: Readonly<{ blackBall2: boolean; spark2: boolean }>;
  readonly phase: "load" | "projectile" | "shake" | "electricity" | "wait" | "cleanup";
  readonly sound: null | Readonly<{ song: "SE_M_THUNDER_WAVE" | "SE_M_THUNDERBOLT2"; pan: "attacker" | "target" }>;
  readonly cleanup: boolean;
}

const SPARKS = [
  [16, 0, 0], [16, 64, 1], [16, 128, 0], [16, 192, 2],
  [8, 32, 0], [8, 96, 1], [8, 160, 0], [8, 224, 2],
] as const;
const ARCS = [
  [5, 0, 0], [-5, 10, 1], [15, 20, 2], [-15, -10, 0],
  [25, 0, 1], [-8, 8, 2], [2, -8, 0], [-20, 15, 1],
] as const;
const sin = (angle: number): number => GBA_SINE_TABLE_256[angle & 255]!;
const sineOffset = (angle: number, radius: number): number =>
  Math.floor(sin(angle) * radius / 256);

function sparkHidden(initialPhase: number, callbacks: number): boolean {
  let hidden = false;
  for (let tick = 1; tick <= callbacks; tick += 1) {
    if (((initialPhase + tick * 40) & 255) % 3 === 0) hidden = !hidden;
  }
  return hidden;
}

export function zapCannonAtAge(
  age: number,
  targetSide: ZapCannonSide,
  geometry: Readonly<ZapCannonGeometry>,
  profile: Readonly<ZapCannonProfile>,
): ZapCannonState {
  const sprites: ZapCannonSprite[] = [];
  const dx = geometry.targetPictureCenter.x - geometry.attackerPictureCenter.x;
  const dy = geometry.targetPictureCenter.y - geometry.attackerPictureCenter.y;
  const deltaX = linearTranslationDeltaQ8(dx, 30);
  const deltaY = linearTranslationDeltaQ8(dy, 30);
  const neutral = [256, 0, 0, 256] as const;

  if (age >= 7 && age <= 38) {
    const callbacks = Math.max(0, Math.min(age - 7, 30));
    sprites.push({ kind: "ball", index: 0, ...profile.ball,
      x: geometry.attackerPictureCenter.x, y: geometry.attackerPictureCenter.y,
      x2: linearTranslationOffsetAfterCallbacks(deltaX, callbacks, 30),
      y2: linearTranslationOffsetAfterCallbacks(deltaY, callbacks, 30),
      subpriority: targetSide === "player" ? 27 : 37,
      tile: 0, hidden: false, matrix: neutral });
  }

  const callbacks = age - 6;
  if (callbacks >= 1 && callbacks <= 30) {
    const lineX = linearTranslationOffsetAfterCallbacks(deltaX, callbacks, 30);
    const lineY = linearTranslationOffsetAfterCallbacks(deltaY, callbacks, 30);
    const rotation = callbacks * 20;
    const matrix = [sin(rotation + 64), -sin(rotation),
      sin(rotation), sin(rotation + 64)] as const;
    for (const [index, [radius, initialPhase, tile]] of SPARKS.entries()) {
      const allocation = profile.sparks[index]!;
      if (age < (allocation.visibleFrom ?? 7)) continue;
      if (age < (allocation.initializedFrom ?? 7)) {
        sprites.push({ kind: "spark", index, ...allocation,
          x: geometry.attackerPictureCenter.x, y: geometry.attackerPictureCenter.y,
          x2: 0, y2: 0, subpriority: targetSide === "player" ? 26 : 36,
          tile, hidden: false, matrix: neutral });
        continue;
      }
      const orbitPhase = initialPhase + (callbacks - 1) * 40;
      sprites.push({ kind: "spark", index, ...allocation,
        x: geometry.attackerPictureCenter.x, y: geometry.attackerPictureCenter.y,
        x2: lineX + sineOffset(orbitPhase, radius),
        y2: lineY + sineOffset(orbitPhase + 64, radius),
        subpriority: targetSide === "player" ? 26 : 36,
        tile, hidden: sparkHidden(initialPhase, callbacks), matrix });
    }
  }

  for (const [index, [sourceX, sourceY, tile]] of ARCS.entries()) {
    const birth = 57 + index * 4;
    if (age < birth || age > birth + 5) continue;
    const allocation = profile.arcs[index]!;
    sprites.push({ kind: "arc", index, ...allocation,
      x: geometry.targetBattleCenter.x + (targetSide === "player" ? -sourceX : sourceX),
      y: geometry.targetBattleCenter.y + sourceY,
      x2: 0, y2: 0, subpriority: targetSide === "player" ? 28 : 38,
      tile, hidden: false, matrix: neutral });
  }

  const targetX2 = age < 40 || age >= 48 ? 0 : Math.floor((age - 40) / 2) % 2 ? 4 : -4;
  const phase = age >= 111 ? "cleanup" : age >= 91 ? "wait" : age >= 57
    ? "electricity" : age >= 40 ? "shake" : age >= 7 ? "projectile" : "load";
  return {
    age,
    active: age >= 0 && age < 111,
    sprites,
    targetX2,
    resources: { blackBall2: age >= 1 && age < 111, spark2: age >= 4 && age < 111 },
    phase,
    sound: age === 7 ? { song: "SE_M_THUNDER_WAVE", pan: "attacker" }
      : age === 57 ? { song: "SE_M_THUNDERBOLT2", pan: "target" } : null,
    cleanup: age >= 111,
  };
}
