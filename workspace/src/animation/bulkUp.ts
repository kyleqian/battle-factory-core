/**
 * Source-shaped reducer for MOVE_BULK_UP.
 *
 * Source `data/battle_anim_scripts.s:Move_BULK_UP` is precisely the already
 * exact Move_SWAGGER prefix: ANIM_TAG_BREATH, AnimTask_GrowAndShrink, a
 * playsewithpan SE_M_SWAGGER, waitforvisualfinish, the gBreathPuff createsprite
 * with the looping SE_M_SWAGGER 4,2, waitforvisualfinish, then end — no anger
 * marks, no monbg. Every component reducer is the shared SWAGGER one; this
 * module only binds them to the legal FRONTIER_MON_PRIMEAPE_2 carrier's
 * species-specific picture height and breath origin.
 *
 * Ages are relative to the first displayed GrowAndShrink task frame, matching
 * `swagger.ts`. Sharing the swagger reducer does not accept any sibling move.
 */

import {
  swaggerBreathAtAge,
  swaggerGrowAndShrinkAtAge,
  growAndShrinkY2AtAge,
  type SwaggerBreathPuff,
  type SwaggerSide,
} from "./swagger.ts";

export interface BulkUpState {
  readonly attackerScale: Readonly<{ x: number; y: number }>;
  readonly attackerY2: number;
  readonly breath: SwaggerBreathPuff | null;
}

export const BULK_UP_BREATH_CREATION_AGE = 49;

export function bulkUpAtAge(
  age: number,
  attackerSide: SwaggerSide,
  breathOrigin: Readonly<{ x: number; y: number }>,
  battlerHeight: number,
): BulkUpState {
  return {
    attackerScale: swaggerGrowAndShrinkAtAge(age),
    attackerY2: growAndShrinkY2AtAge(age, battlerHeight),
    breath: swaggerBreathAtAge(age, attackerSide, breathOrigin),
  };
}
