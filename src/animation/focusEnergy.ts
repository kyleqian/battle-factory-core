export type FocusEnergySide = "player" | "opponent";

export interface FocusEnergySprite {
  readonly wave: 0 | 1 | 2;
  readonly index: 0 | 1 | 2 | 3 | 4;
  readonly oamSlot: 3 | 4 | 5 | 7 | 9;
  readonly x: number;
  readonly y: number;
  readonly frame: 0 | 1 | 2 | 3;
  readonly data0: number;
  readonly data1: 1 | 2 | 3;
  readonly callback: "AnimEndureEnergy_Step";
}

export interface FocusEnergySoundEvent {
  readonly age: 1;
  readonly song: "SE_M_DRAGON_RAGE";
  readonly pan: -64 | 63;
  readonly player: "SE1";
}

export interface FocusEnergyState {
  readonly active: boolean;
  readonly assetLoaded: boolean;
  readonly scriptOffset: 0 | 3 | 14 | 57 | 62 | 63 | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly sprites: readonly FocusEnergySprite[];
  readonly paletteTaskActive: boolean;
  readonly attackerPaletteY: number;
  readonly shakeTaskActive: boolean;
  readonly attackerX2: number;
  readonly soundEvents: readonly FocusEnergySoundEvent[];
  readonly battlerDisplayAge: number;
  readonly attackerShakeDisplayAge: number;
  readonly attackerDisplayX2: number;
}

const SPAWN_OFFSETS = [4, 10, 16, 22, 28] as const;
const WAVE_OFFSETS = [0, 34, 68] as const;
const OAM_SLOTS = [3, 4, 5, 7, 9] as const;
const X_OFFSETS = [-24, 14, -5, 28, -12] as const;
const Y_OFFSETS = [26, 28, 10, 26, 0] as const;
const STEP_DELAYS = [2, 1, 2, 3, 1] as const;

function spriteFrame(localAge: number): 0 | 1 | 2 | 3 {
  if (localAge <= 2) return 0;
  if (localAge <= 14) return 1;
  if (localAge <= 18) return 2;
  return 3;
}

function endureY(initialY: number, delay: number, localAge: number): {
  readonly y: number;
  readonly data0: number;
} {
  let y = initialY;
  let data0 = 0;
  for (let callback = 0; callback <= localAge; callback += 1) {
    data0 += 1;
    if (data0 > delay) {
      data0 = 0;
      y -= 1;
    }
    y -= data0;
  }
  return { y, data0 };
}

function focusSpritesAtAge(
  age: number,
  attackerCoord: Readonly<{ x: number; y: number }>,
): readonly FocusEnergySprite[] {
  const sprites: FocusEnergySprite[] = [];
  for (let wave = 0 as 0 | 1 | 2; wave < 3; wave = (wave + 1) as 0 | 1 | 2) {
    for (let index = 0 as 0 | 1 | 2 | 3 | 4; index < 5; index = (index + 1) as 0 | 1 | 2 | 3 | 4) {
      const spawnAge = WAVE_OFFSETS[wave] + SPAWN_OFFSETS[index];
      const localAge = age - spawnAge;
      if (localAge < 0 || localAge > 23) continue;
      const step = endureY(
        attackerCoord.y + Y_OFFSETS[index],
        STEP_DELAYS[index],
        localAge,
      );
      sprites.push({
        wave,
        index,
        oamSlot: OAM_SLOTS[index],
        x: attackerCoord.x + X_OFFSETS[index],
        y: step.y,
        frame: spriteFrame(localAge),
        data0: step.data0,
        data1: STEP_DELAYS[index],
        callback: "AnimEndureEnergy_Step",
      });
    }
  }
  return sprites.sort((left, right) => left.oamSlot - right.oamSlot);
}

function scriptOffsetAtAge(
  age: number,
): FocusEnergyState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age >= 28 && age <= 37) return 14;
  if (age >= 62 && age <= 71) return 57;
  if (age >= 96 && age <= 120) return 62;
  if (age >= 121) return 63;
  return null;
}

/**
 * OBJ coefficient produced by the literal delay=2, 0→11→0 white
 * BlendColorCycle. The source advances by two every four displays, holds the
 * clamped peak, then descends by two every four displays.
 */
function attackerPaletteYAtAge(age: number): number {
  if (age < 42 || age >= 92) return 0;
  if (age < 62) return Math.min(10, 2 + 2 * Math.floor((age - 42) / 4));
  if (age < 72) return 11;
  return Math.max(1, 9 - 2 * Math.floor((age - 72) / 4));
}

function attackerShakeX2AtAge(age: number): number {
  if (age < 38 || age >= 100) return 0;
  if (age === 97) return 1;
  if (age >= 98) return -1;
  return Math.floor((age - 38) / 2) % 2 === 0 ? -1 : 1;
}

/**
 * Pure source-relative port of Move_FOCUS_ENERGY's complete 122-display
 * envelope. Age 0 is the first FOCUS_ENERGY load display; age 121 is the
 * first inactive cleanup. Geometry is the already-resolved source
 * BATTLER_COORD_X/Y attacker anchor.
 */
export function focusEnergyAtAge(
  age: number,
  attackerSide: FocusEnergySide,
  attackerCoord: Readonly<{ x: number; y: number }>,
): FocusEnergyState {
  const sprites = focusSpritesAtAge(age, attackerCoord);
  const paletteTaskActive = age >= 38 && age <= 96;
  const shakeTaskActive = age >= 38 && age <= 99;
  return {
    active: age >= 0 && age <= 120,
    assetLoaded: age >= 1 && age <= 120,
    scriptOffset: scriptOffsetAtAge(age),
    visualTaskCount:
      sprites.length + Number(paletteTaskActive) + Number(shakeTaskActive),
    soundTaskCount: 0,
    sprites,
    paletteTaskActive,
    attackerPaletteY: attackerPaletteYAtAge(age),
    shakeTaskActive,
    attackerX2: attackerShakeX2AtAge(age),
    soundEvents: age === 1
      ? [{
          age: 1,
          song: "SE_M_DRAGON_RAGE",
          pan: attackerSide === "player" ? -64 : 63,
          player: "SE1",
        }]
      : [],
    battlerDisplayAge: age - 1,
    // BuildOamBuffer precedes this task's callback, then hardware OAM
    // receives that software buffer on the following display.
    attackerShakeDisplayAge: age - 2,
    // AnimTask_ShakeMon2 initializes x2=+1 before its immediate first step.
    // BuildOamBuffer exposes that initializer for one display at task start.
    attackerDisplayX2: age === 39
      ? 1
      : attackerShakeX2AtAge(age - 2),
  };
}
