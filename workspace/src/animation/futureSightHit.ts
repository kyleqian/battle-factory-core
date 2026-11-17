import { scaleMonAndRestoreAtAge } from "./bind.ts";
import { shakeMonOffsetAtTick, shakeMonSequence } from "./shakeMon.ts";
import { psychicBgFadeRampAtLocalAge, psychicBgRotationCountAtAge } from "./psychicBackground.ts";

/**
 * wsh2: General_FutureSightHit (data/battle_anim_scripts.s, the B_ANIM_FUTURE_SIGHT_HIT table entry): SetPsychicBackground, setalpha 8, 8,
 * ShakeMon(target, 4, 0, 15, 1) + ScaleMonAndRestore(-5, -5, 15, target, 1), wait, ShakeMon(target, 4, 0, 24, 1), wait, clearmonbg, blendoff,
 * UnsetPsychicBackground. The BG family (fade ramps, rotation ring + the +2 pause at a blendoff gap) and the OAM / framebuffer lags are the
 * Psychic / Confusion ones (psychic.ts, sceneOnPresentation.ts sceneOnPsychicView); the age below is that family's age 0 (the first fade tick).
 * The four constants are fitted against the ROM (docs/wsh1-general-anim-commands.md "wsh2").
 */
export const FUTURE_SIGHT_HIT_PSYCHIC_AGE0 = 10;
export const FUTURE_SIGHT_HIT_SHAKE1_START = 37;
export const FUTURE_SIGHT_HIT_SHAKE2_START = 67;
export const FUTURE_SIGHT_HIT_MONBG_TAIL = 0;
export const FUTURE_SIGHT_HIT_FADE2_START = 120;

const FADE_RAMP_UP_END = 16;
const FADE_HOLD_END = 19;
const FADE_RAMP_DOWN_END = 35;
const FADE2_RAMP_UP_END = 16;
const FADE2_HOLD_END = 20;
const FADE2_RAMP_DOWN_END = 36;
const BG_PSYCHIC_FIRST_AGE = FADE_HOLD_END + 1;
const ROTATION_PAUSE_EXTRA = 2;
const SHAKE2_LENGTH = shakeMonSequence(4, 0, 24, 1).length;
const SCALE = { xDelta: -5, yDelta: -5, duration: 15 } as const;

export interface FutureSightHitRow {
  /** REG_BLDY (0 .. 16) of the BG. */
  readonly bgBldy: number;
  /** BG_PSYCHIC (vs the battle background) is the tileset in effect. */
  readonly bgIsPsychic: boolean;
  /** SetPsychicBackground_Step's rotate-right count of BG palette 2's entries 1 - 11, as displayed. */
  readonly rotationCount: number;
  readonly targetScale: Readonly<{ active: boolean; xScale: number; yScale: number }>;
  /** The OBJ is in alpha-blend (8:8) mode (ScaleMonAndRestore objMode 1 reaches the display one tick after the task). */
  readonly targetBlendActive: boolean;
  /** The target OBJ's x2 as displayed. */
  readonly targetX2: number;
  /** The frozen monbg copy exists (monbg DEF_PARTNER until clearmonbg after the second shake). */
  readonly monbgActive: boolean;
  /** The frozen monbg copy's x2 (it follows the live shake one tick behind). */
  readonly monbgX2: number;
  /** Whether the shake tasks own the target's x2 (it has left its idle rest). */
  readonly targetTouched: boolean;
}

function targetEffect(p: number): { scale: ReturnType<typeof scaleMonAndRestoreAtAge>; x2: number } {
  const local1 = p - FUTURE_SIGHT_HIT_SHAKE1_START;
  const local2 = p - FUTURE_SIGHT_HIT_SHAKE2_START;
  const scale = scaleMonAndRestoreAtAge(local1, SCALE);
  if (local2 >= 0) return { scale, x2: shakeMonOffsetAtTick(4, 0, 24, 1, local2 + 1).x2 };
  if (local1 >= 0) return { scale, x2: shakeMonOffsetAtTick(4, 0, 15, 1, local1 + 1).x2 };
  return { scale, x2: 0 };
}

// The first shake shows the task's creation value (tick 0) on the creation frame itself, then the steady one-tick copy lag takes over; the
// second shake's creation frame still shows the first shake's restored 0 on the OBJ and the creation value on the monbg copy (ROM-fitted).
function displayShakeX2(p: number): number {
  const local2 = p - FUTURE_SIGHT_HIT_SHAKE2_START;
  if (local2 >= 0) return shakeMonOffsetAtTick(4, 0, 24, 1, local2 - 1).x2;
  const local1 = p - FUTURE_SIGHT_HIT_SHAKE1_START;
  return shakeMonOffsetAtTick(4, 0, 15, 1, local1 === 0 ? 0 : local1 - 1).x2;
}

export function futureSightHitRowAtAge(effectAge: number): FutureSightHitRow {
  const p = effectAge - FUTURE_SIGHT_HIT_PSYCHIC_AGE0;
  const f2 = FUTURE_SIGHT_HIT_FADE2_START;
  const bgBldy = p < f2
    ? psychicBgFadeRampAtLocalAge(p, FADE_RAMP_UP_END, FADE_HOLD_END, FADE_RAMP_DOWN_END)
    : psychicBgFadeRampAtLocalAge(p - f2, FADE2_RAMP_UP_END, FADE2_HOLD_END, FADE2_RAMP_DOWN_END);
  return {
    bgBldy,
    bgIsPsychic: p >= BG_PSYCHIC_FIRST_AGE && p <= f2 + FADE2_RAMP_UP_END + 2,
    rotationCount: psychicBgRotationCountAtAge(p - 1, f2 - 4, ROTATION_PAUSE_EXTRA),
    targetScale: targetEffect(p - 2).scale,
    targetBlendActive: targetEffect(p - 1).scale.active || targetEffect(p - 2).scale.active,
    targetX2: displayShakeX2(p),
    monbgActive: p - 1 >= FUTURE_SIGHT_HIT_SHAKE1_START && p - 1 <= FUTURE_SIGHT_HIT_SHAKE2_START + SHAKE2_LENGTH + FUTURE_SIGHT_HIT_MONBG_TAIL,
    monbgX2: p === FUTURE_SIGHT_HIT_SHAKE2_START ? 4 : targetEffect(p - 1).x2,
    targetTouched: p >= FUTURE_SIGHT_HIT_SHAKE1_START,
  };
}
