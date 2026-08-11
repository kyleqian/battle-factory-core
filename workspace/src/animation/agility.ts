import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type AgilitySide = "player" | "opponent";

export interface AgilityOffset {
  readonly x2: number;
  readonly y2: number;
}

export interface AgilityAfterimage extends AgilityOffset {
  readonly slot: 3 | 4;
}

export interface AgilityState {
  readonly attackerOffset: AgilityOffset;
  readonly afterimages: readonly AgilityAfterimage[];
  /** Monbg copy present (ages 1..76 software). */
  readonly monbgLoaded: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  /** Dense-age SE_M_DOUBLE_TEAM restarts (script offsets 43/49/55/61/67). */
  readonly soundRestart: boolean;
}

/**
 * Dense Scene-ON window for `Move_AGILITY`: first active source-script frame
 * through the first inactive/clear cleanup. Measured 87 frames for both the
 * player-back Ledyba and opponent-front Ledyba orientations. Ages are
 * relative to the controller's gCurrentMove installation; the reducer is
 * source-relative and never owns stat application, RNG, or round state (the
 * attacker's Speed is already +2 at the first dense frame).
 */
export const AGILITY_FRAME_COUNT = 87;
/** First software monbg/alpha frame (monbg copy task created one frame later). */
export const AGILITY_MONBG_LOAD_AGE = 1;
/** Software-age window for the elliptical monbg offset (task ages 3..65). */
export const AGILITY_FIRST_TRAVEL_AGE = 3;
export const AGILITY_LAST_TRAVEL_AGE = 65;
/** `TraceMonBlended(0,4,7,10)` clone creation software ages. */
const AGILITY_CLONE_CREATION_AGES: readonly number[] = [
  4, 9, 14, 19, 24, 29, 34, 39, 44, 49,
];
/** First software clear/cleanup frame (clearmonbg task begins). */
export const AGILITY_FIRST_CLEAR_AGE = 74;

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

/**
 * `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER, 24, 6, 4, 4)`.
 * Speed 4 -> wavePeriod 16, four loops. The creation frame double-steps
 * (init renders θ=0, then the frame's own dispatch renders θ=16), so the
 * visible software θ at age A is `16*(A-3)` for ages 3..65. The four-loop
 * wrap resets and destroys the task at the end of age 66 (its θ=240 render
 * is immediately overwritten by the reset to the origin), so ages 66+ read
 * as the origin. The width is negated for the opponent side
 * (`RespectSide`); the height is never negated.
 */
export function agilityAttackerOffset(
  age: number,
  attackerSide: AgilitySide,
): AgilityOffset {
  if (age < AGILITY_FIRST_TRAVEL_AGE || age > AGILITY_LAST_TRAVEL_AGE) {
    return { x2: 0, y2: 0 };
  }
  const angle = 16 * (age - AGILITY_FIRST_TRAVEL_AGE);
  const width = attackerSide === "player" ? 24 : -24;
  return {
    x2: gbaSin(angle, width),
    y2: -gbaSin(angle + 64, 6) + 6,
  };
}

/**
 * `AnimTask_TraceMonBlended(0,4,7,10)`: ten clones at software ages
 * 4,9,...,49, each holding the attacker's software offset at its creation
 * age. The software clone is drawn from the frame AFTER its creation
 * (`C+1`) through its last lifetime frame (`C+7`) — the creation frame and
 * the life-0 terminal are both skipped, matching QUICK_ATTACK's accepted
 * clone table. The allocator alternates slots 3/4, and each clone's
 * `oam.priority` is 2 (`data[0]==0`).
 */
export function agilityAfterimagesAtAge(
  age: number,
  attackerSide: AgilitySide,
): readonly AgilityAfterimage[] {
  const images: AgilityAfterimage[] = [];
  for (let i = 0; i < AGILITY_CLONE_CREATION_AGES.length; i += 1) {
    const creation = AGILITY_CLONE_CREATION_AGES[i]!;
    if (age < creation + 1 || age > creation + 7) continue;
    images.push({
      slot: i % 2 === 0 ? 3 : 4,
      ...agilityAttackerOffset(creation, attackerSide),
    });
  }
  return images;
}

export function agilityAnimationAtAge(
  age: number,
  attackerSide: AgilitySide,
): AgilityState {
  return {
    attackerOffset: agilityAttackerOffset(age, attackerSide),
    afterimages: agilityAfterimagesAtAge(age, attackerSide),
    monbgLoaded: age >= AGILITY_MONBG_LOAD_AGE && age <= 76,
    alpha: age >= 4 && age <= 73 ? { eva: 12, evb: 8 } : null,
    soundRestart:
      age === 4 || age === 18 || age === 32 || age === 46 || age === 60,
  };
}
