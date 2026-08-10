export type RolePlaySide = "player" | "opponent";

export interface RolePlaySilhouetteState {
  readonly side: RolePlaySide;
  readonly art: "back" | "front";
  readonly x: number;
  readonly y: number;
  readonly slot: 3;
  readonly subpriority: 5;
  readonly priority: 2;
  readonly objMode: 1;
  readonly affineMode: 1 | 3;
  readonly paletteTag: 55125;
  readonly tileNum: 305;
  readonly paletteNum: 7;
  readonly matrix: Readonly<{ a: number; b: 0; c: 0; d: number }>;
}

export interface RolePlayState {
  readonly active: boolean;
  readonly scriptOffset: 0 | 2 | 36 | 53 | 75 | null;
  readonly attackerOnMonBg: boolean;
  readonly targetWhiteCoefficient: number;
  readonly bgBlackCoefficient: number;
  readonly silhouette: RolePlaySilhouetteState | null;
  readonly silhouetteResourceLoaded: boolean;
  readonly blend: Readonly<{ eva: number; evb: number }> | null;
  readonly visualTaskCount: 0 | 1 | 2;
  readonly sound: "SE_M_TRI_ATTACK" | "SE_M_DETECT" | null;
}

function scriptOffset(age: number): RolePlayState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 2;
  if (age <= 53) return 36;
  if (age <= 93) return 53;
  if (age <= 105) return 75;
  return null;
}

function targetWhiteCoefficient(age: number): number {
  if (age < 8 || age >= 145) return 0;
  if (age <= 52) return 1 + Math.floor((age - 8) / 3);
  if (age <= 99) return 16;
  return 15 - Math.floor((age - 100) / 3);
}

function bgBlackCoefficient(age: number): number {
  if (age < 7 || age >= 125) return 0;
  if (age <= 22) return 2 + 2 * Math.floor((age - 7) / 4);
  if (age <= 108) return 10;
  return 8 - 2 * Math.floor((age - 109) / 4);
}

function visualTaskCount(age: number): 0 | 1 | 2 {
  if (age <= 3 || age === 53 || age === 93 || age >= 145) return 0;
  if (age <= 29 || (age >= 106 && age <= 131)) return 2;
  return 1;
}

/**
 * Pure source-age port of Move_ROLE_PLAY from its first in-bounds pointer
 * display through first inactive cleanup. Ability copying remains engine-owned.
 */
export function rolePlayAtAge(
  age: number,
  attackerSide: RolePlaySide,
  attackerCenter: Readonly<{ x: number; y: number }>,
): RolePlayState {
  const silhouetteAlive = age >= 54 && age <= 91;
  const affineStep = age >= 84 ? age - 83 : 0;
  const alpha = age < 55 || age > 93
    ? null
    : Math.min(10, Math.max(0, 1 + Math.floor((age - 57) / 3)));
  return {
    active: age >= 0 && age <= 145,
    scriptOffset: scriptOffset(age),
    attackerOnMonBg: age >= 1 && age <= 93,
    targetWhiteCoefficient: targetWhiteCoefficient(age),
    bgBlackCoefficient: bgBlackCoefficient(age),
    silhouette: silhouetteAlive ? {
      side: attackerSide,
      art: attackerSide === "player" ? "back" : "front",
      x: attackerCenter.x + (attackerSide === "player" ? -20 : 20),
      y: attackerCenter.y,
      slot: 3,
      subpriority: 5,
      priority: 2,
      objMode: 1,
      affineMode: affineStep === 0 ? 1 : 3,
      paletteTag: 55125,
      tileNum: 305,
      paletteNum: 7,
      matrix: {
        a: affineStep === 0 ? 256 : 256 - 16 * affineStep,
        b: 0,
        c: 0,
        d: affineStep === 0 ? 256 : 256 + 128 * affineStep,
      },
    } : null,
    silhouetteResourceLoaded: silhouetteAlive,
    blend: alpha === null ? null : { eva: alpha, evb: 16 - alpha },
    visualTaskCount: visualTaskCount(age),
    sound: age === 54 ? "SE_M_TRI_ATTACK" : age === 84 ? "SE_M_DETECT" : null,
  };
}
