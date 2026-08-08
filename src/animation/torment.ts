/**
 * Source-shaped reducer for MOVE_TORMENT.
 *
 * Source:
 * - `data/battle_anim_scripts.s:Move_TORMENT`
 * - `battle_anim_effects_3.c:AnimTask_TormentAttacker` / `TormentAttacker_Step`
 * - `battle_anim_effects_3.c:sAffineAnims_Torment`
 * - `battle_anim_mons.c:AnimTask_BlendMonInAndOut` + `BlendPalette`
 * - `battle_anim_effects_1.c:gThoughtBubbleSpriteTemplate`
 *   (`gMetronomeThroughtBubbleAnimTable` anim 2 = the forward 4-frame bubble)
 * - `battle_anim_effects_2.c:gAngerMarkSpriteTemplate` / `AnimAngerMark`
 *
 * Ages are move-relative: age 0 = the move script's first in-bounds frame
 * (frame 68 player-back, frame 72 opponent-front). The six thought bubbles
 * spawn at ages 7/32/57/72/87/102 with ABSOLUTE subpriorities 6..1
 * (6 - data[1]); the attacker wobbles under `sAffineAnims_Torment`
 * (12 ticks, restarting with each bubble); `AnimTask_BlendMonInAndOut`
 * (RGB_RED, 10/1/1/1) runs ages 136-154 on the target's palette; the two
 * anger marks spawn ages 136 and 158 on the target.
 */

import {
  swaggerAngerMarkAtAge,
  type SwaggerAngerMark,
  type SwaggerPoint,
  type SwaggerSide,
} from "./swagger.ts";

export type TormentSide = SwaggerSide;
export type TormentPoint = SwaggerPoint;

export interface TormentBubble {
  readonly kind: "thoughtBubble";
  /** Bubble index 0..5 (subpriority = 6 - index). */
  readonly index: number;
  /** Move-relative age the bubble was created at. */
  readonly spawnAge: number;
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  /** `gSprites[i].hFlip = data[1] & 1` at creation. */
  readonly hFlip: boolean;
  /**
   * Thought-bubble tileset frame. The bubble is statically frame 0 from
   * creation; state 4 (`StartSpriteAnim(anim 2)`) runs the forward 4-frame
   * animation once at the tail.
   */
  readonly frame: 0 | 1 | 2 | 3;
}

export type TormentSound = "SE_M_METRONOME" | "SE_M_SWAGGER2";

export interface TormentState {
  readonly age: number;
  readonly visualTaskCount: number;
  /** Live thought bubbles, creation order (subpriority 6..1). */
  readonly bubbles: readonly TormentBubble[];
  /** Attacker software affine matrix (`sAffineAnims_Torment`, identity 256 idle). */
  readonly attackerScale: Readonly<{ x: number; y: number }>;
  /** Attacker `SetBattlerSpriteYOffsetFromYScale` y2. */
  readonly attackerY2: number;
  /** Target anger marks (`gAngerMarkSpriteTemplate`), spawn order. */
  readonly angerMarks: readonly SwaggerAngerMark[];
  /** `AnimTask_BlendMonInAndOut` palette ramp 1..10 in / 9..1 out, 0 idle. */
  readonly blendCoeff: number;
  readonly soundRestart: TormentSound | null;
}

export const TORMENT_FIRST_BUBBLE_AGE = 7;
/** Bubble spawn-age offsets from the first: 0, 25, 50, 65, 80, 95. */
export const TORMENT_BUBBLE_OFFSETS = [0, 25, 50, 65, 80, 95] as const;
export const TORMENT_STATE4_AGE = 124;
export const TORMENT_REPLAY_FIRST_AGE = 127;
export const TORMENT_LAST_TASK_AGE = 134;
export const TORMENT_BLEND_FIRST_AGE = 136;
export const TORMENT_BLEND_LAST_AGE = 154;
export const TORMENT_FIRST_ANGER_AGE = 136;
export const TORMENT_SECOND_ANGER_AGE = 158;

/** The 12-tick `sAffineAnims_Torment` series (x, y scale). */
const TORMENT_AFFINE_SERIES: readonly (readonly [number, number])[] = [
  [244, 264], [232, 272], [220, 280], [208, 288],
  [228, 268], [248, 248], [268, 228], [288, 208],
  [280, 220], [272, 232], [264, 244], [256, 256],
];

export function tormentBubbleSpawnAges(): readonly number[] {
  return TORMENT_BUBBLE_OFFSETS.map((offset) => TORMENT_FIRST_BUBBLE_AGE + offset);
}

/** Attacker software affine scale at move-relative `age`. */
export function tormentAttackerScaleAtAge(
  age: number,
): Readonly<{ x: number; y: number }> {
  for (const spawnAge of tormentBubbleSpawnAges()) {
    const tick = age - spawnAge;
    if (tick >= 1 && tick <= TORMENT_AFFINE_SERIES.length) {
      const [x, y] = TORMENT_AFFINE_SERIES[tick - 1]!;
      return { x, y };
    }
  }
  return { x: 256, y: 256 };
}

/** `SetBattlerSpriteYOffsetFromYScale` y2 from the attacker's scale. */
export function tormentY2FromScale(scale: number, varValue: number): number {
  const scaledHeight = Math.trunc((varValue << 8) / scale);
  return Math.trunc((varValue - scaledHeight) / 2);
}

function bubbleFrameAtAge(age: number, spawnAge: number): 0 | 1 | 2 | 3 {
  if (age >= TORMENT_REPLAY_FIRST_AGE) {
    // State 4 (software age 124) calls StartSpriteAnim(sprite, 2), which is
    // anim index 2 = gMetronomeThroughtBubbleAnimCmds3 — the REVERSED program
    // (48,32,16,0), so the bubbles shrink back toward the small cloud. The
    // restart only reaches the DISPLAY from frame 197 (age 129) and, measured,
    // starts at frame 2 (the 48 frame of the replay has already left the
    // screen); the reducer frame below shows 2,1,0 at two ticks each.
    const animAge = age - TORMENT_REPLAY_FIRST_AGE;
    if (animAge < 2) return 2;
    if (animAge < 4) return 1;
    return 0;
  }
  // The default anim (cmds1) is ALSO the forward 4-frame program with hFlip,
  // so a freshly created bubble grows 0,1,2,3 at two ticks each then HOLDS
  // frame 3 (the full cloud) until state 4.
  const spriteAge = age - spawnAge;
  if (spriteAge < 2) return 0;
  if (spriteAge < 4) return 1;
  if (spriteAge < 6) return 2;
  return 3;
}

export function tormentBubbleAtAge(
  age: number,
  index: number,
  origin: TormentPoint,
): TormentBubble | null {
  const spawnAge = TORMENT_FIRST_BUBBLE_AGE + TORMENT_BUBBLE_OFFSETS[index]!;
  if (age < spawnAge || age > TORMENT_LAST_TASK_AGE) return null;
  const span = [32, 32, 26, 26, 20, 20][index]!;
  const drop = [20, 20, 26, 26, 32, 32][index]!;
  const x = index % 2 === 0 ? origin.x + span : origin.x - span;
  const y = origin.y - drop;
  return {
    kind: "thoughtBubble",
    index,
    spawnAge,
    x,
    y,
    subpriority: 6 - index,
    hFlip: index % 2 === 1,
    frame: bubbleFrameAtAge(age, spawnAge),
  };
}

/** Live thought bubbles at `age`, creation order. */
export function tormentBubblesAtAge(age: number, origin: TormentPoint): TormentBubble[] {
  const out: TormentBubble[] = [];
  for (let index = 0; index < 6; index += 1) {
    const bubble = tormentBubbleAtAge(age, index, origin);
    if (bubble) out.push(bubble);
  }
  return out;
}

export function tormentAtAge(
  age: number,
  attackerOrigin: TormentPoint,
  attackerVar: number,
  targetSide: TormentSide,
  targetOrigin: TormentPoint,
): TormentState {
  const attackerScale = tormentAttackerScaleAtAge(age);
  const bubbles = tormentBubblesAtAge(age, attackerOrigin);
  const angerMarks = [
    swaggerAngerMarkAtAge(
      age, 0, TORMENT_FIRST_ANGER_AGE, targetSide, targetOrigin,
    ),
    swaggerAngerMarkAtAge(
      age, 1, TORMENT_SECOND_ANGER_AGE, targetSide, targetOrigin,
    ),
  ].filter((mark): mark is SwaggerAngerMark => mark !== null);
  const taskAlive = age >= TORMENT_FIRST_BUBBLE_AGE && age <= TORMENT_LAST_TASK_AGE;
  const blendCoeff = age >= TORMENT_BLEND_FIRST_AGE && age <= TORMENT_BLEND_LAST_AGE
    ? (age <= TORMENT_BLEND_FIRST_AGE + 9 ? age - TORMENT_BLEND_FIRST_AGE + 1 : TORMENT_BLEND_LAST_AGE + 1 - age)
    : 0;
  const mark1Alive = age >= TORMENT_FIRST_ANGER_AGE && age < TORMENT_FIRST_ANGER_AGE + 17;
  const mark2Alive = age >= TORMENT_SECOND_ANGER_AGE && age < TORMENT_SECOND_ANGER_AGE + 17;
  const visualTaskCount = (taskAlive ? 1 : 0)
    + (blendCoeff > 0 ? 1 : 0)
    + (mark1Alive ? 1 : 0)
    + (mark2Alive ? 1 : 0);
  const soundRestart = TORMENT_BUBBLE_OFFSETS.includes(
    (age - TORMENT_FIRST_BUBBLE_AGE) as (typeof TORMENT_BUBBLE_OFFSETS)[number],
  ) && age >= TORMENT_FIRST_BUBBLE_AGE
    ? "SE_M_METRONOME"
    : age === TORMENT_FIRST_ANGER_AGE || age === TORMENT_SECOND_ANGER_AGE
      ? "SE_M_SWAGGER2"
      : null;
  return {
    age,
    visualTaskCount,
    bubbles,
    attackerScale,
    attackerY2: tormentY2FromScale(attackerScale.y, attackerVar),
    angerMarks,
    blendCoeff,
    soundRestart,
  };
}
