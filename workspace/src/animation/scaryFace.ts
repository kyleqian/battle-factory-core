export type ScaryFaceSide = "player" | "opponent";

export interface ScaryFaceTaskState {
  readonly function: "AnimTask_ScaryFace" | "AnimTask_ScaryFace_Step";
  readonly counter: number;
  readonly blendCounter: number;
  readonly phase: 0 | 1 | 2 | 3;
  readonly blendY: number;
}

export interface ScaryFaceEye {
  readonly x: number;
  readonly y: number;
  readonly frame: 0 | 1 | 2 | 3 | 4;
}

export interface ScaryFaceState {
  readonly paletteBlend: "toBlack" | "fromBlack" | null;
  /** Hardware-visible coefficient for the selected battle BG banks. */
  readonly paletteBlackCoeff: number;
  /** Hardware-visible attacker OBJ coefficient (initial transfer is +1 display). */
  readonly attackerPaletteBlackCoeff: number;
  readonly background: null | Readonly<{
    tilemap: "gBattleAnimBgTilemap_ScaryFacePlayer"
      | "gBattleAnimBgTilemap_ScaryFaceOpponent";
    image: "gBattleAnimBgImage_ScaryFace";
    palette: "gBattleAnimBgPalette_ScaryFace";
    task: ScaryFaceTaskState;
  }>;
  readonly eyes: readonly ScaryFaceEye[];
  readonly targetOffset: Readonly<{ x2: number; y2: 0 }>;
  readonly shakeTask: null | Readonly<{
    shakeNum: number;
    sourceArgs: readonly [20, 1, false, 0];
    runtimeArgs: readonly [20, 3, false, 16];
  }>;
  readonly soundRestart:
    | "SE_M_PSYBEAM" | "SE_M_LEER" | "SE_M_STRING_SHOT2" | null;
  readonly soundPanSide: ScaryFaceSide | null;
  readonly clean: boolean;
}

export const SCARY_FACE_CLEAN_BOUNDARY_AGE = 189;
const PATTERN_1 = [-1, 0, 1, 0, -1, 1, 0, -1, 0, 1] as const;

/**
 * `simple_palette_blend(... delay=3, 0↔16, RGB_BLACK)` reaches display
 * palette memory in coefficient-two steps. The source fade starts at age 0
 * and age 143; the hardware transfer first exposes those steps at ages 5
 * and 149 respectively.
 */
export function scaryFacePaletteBlackCoeffAtAge(age: number): number {
  if (age < 0) return 0;
  if (age < 143) return Math.min(16, Math.floor(age / 5) * 2);
  return Math.max(0, 16 - Math.floor((age - 143) / 5) * 2);
}

export function scaryFaceAttackerPaletteBlackCoeffAtAge(age: number): number {
  if (age < 143) return scaryFacePaletteBlackCoeffAtAge(age - 1);
  if (age < 144) return 16;
  return Math.max(0, 16 - Math.floor((age - 144) / 5) * 2);
}

function taskAtAge(age: number): ScaryFaceTaskState | null {
  if (age < 59 || age > 141) return null;
  if (age <= 60) {
    return {
      function: "AnimTask_ScaryFace",
      counter: 0, blendCounter: 0, phase: 0, blendY: 0,
    };
  }
  let counter = 0;
  let blendCounter = 0;
  let phase: 0 | 1 | 2 | 3 = 0;
  for (let tick = 61; tick <= Math.min(age, 138); tick += 1) {
    if (phase === 0) {
      counter += 1;
      if (counter === 2) {
        counter = 0;
        blendCounter += 1;
        if (blendCounter === 14) {
          phase = 1;
          blendCounter = 0;
        }
      }
    } else if (phase === 1) {
      blendCounter += 1;
      if (blendCounter === 21) {
        blendCounter = 14;
        phase = 2;
      }
    } else if (phase === 2) {
      counter += 1;
      if (counter === 2) {
        counter = 0;
        blendCounter -= 1;
        if (blendCounter === 0) phase = 3;
      }
    }
  }
  return {
    function: "AnimTask_ScaryFace_Step",
    counter,
    blendCounter,
    phase,
    blendY: phase === 1 ? 14 : blendCounter,
  };
}

function eyesAtAge(
  age: number,
  attackerSide: ScaryFaceSide,
  center: Readonly<{ x: number; y: number }>,
): readonly ScaryFaceEye[] {
  const eyeAge = age - 76;
  if (eyeAge < 0 || eyeAge > 19) return [];
  const frame = Math.min(4, Math.trunc((eyeAge + 1) / 4)) as 0 | 1 | 2 | 3 | 4;
  const offsets = attackerSide === "player" ? [-16, 16] : [16, -16];
  return offsets.map((x) => ({
    x: center.x + x,
    y: center.y - 8,
    frame,
  }));
}

export function scaryFaceAtAge(
  age: number,
  attackerSide: ScaryFaceSide,
  targetSide: ScaryFaceSide,
  attackerEyeCenter: Readonly<{ x: number; y: number }>,
): ScaryFaceState {
  const task = taskAtAge(age);
  const shakeNum = age >= 143 && age <= 160 ? age - 141 : null;
  // The script literal is (20,1,FALSE,pattern0), but the task reads the
  // shared gBattleAnimArgs again after the following palette command has
  // replaced args 1/3. The legal ROM therefore executes offset 3/pattern1.
  const targetX2 = shakeNum === null ? 0 : 3 * PATTERN_1[shakeNum % 10]!;
  const soundRestart = age === 0 ? "SE_M_PSYBEAM"
    : age === 59 ? "SE_M_LEER"
    : age === 143 ? "SE_M_STRING_SHOT2"
    : null;
  return {
    paletteBlend: age >= 0 && age <= 45 ? "toBlack"
      : age >= 143 && age <= 188 ? "fromBlack" : null,
    paletteBlackCoeff: scaryFacePaletteBlackCoeffAtAge(age),
    attackerPaletteBlackCoeff: scaryFaceAttackerPaletteBlackCoeffAtAge(age),
    background: task === null ? null : {
      tilemap: targetSide === "opponent"
        ? "gBattleAnimBgTilemap_ScaryFacePlayer"
        : "gBattleAnimBgTilemap_ScaryFaceOpponent",
      image: "gBattleAnimBgImage_ScaryFace",
      palette: "gBattleAnimBgPalette_ScaryFace",
      task,
    },
    eyes: eyesAtAge(age, attackerSide, attackerEyeCenter),
    targetOffset: { x2: targetX2, y2: 0 },
    shakeTask: shakeNum === null ? null : {
      shakeNum,
      sourceArgs: [20, 1, false, 0],
      runtimeArgs: [20, 3, false, 16],
    },
    soundRestart,
    soundPanSide: soundRestart === null ? null
      : soundRestart === "SE_M_STRING_SHOT2" ? targetSide : attackerSide,
    clean: age >= SCARY_FACE_CLEAN_BOUNDARY_AGE,
  };
}
