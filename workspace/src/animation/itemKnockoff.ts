// kno3 (docs/kno1-item-knockoff-plan.md "kno3"): B_ANIM_ITEM_KNOCKOFF's General_ItemKnockoff -- one ITEM_BAG sprite (gKnockOffItemSpriteTemplate,
// battle_anim_effects_1.c:3062 AnimKnockOffItem) created at the target's picture point, flying 40 callbacks along a linear path (moveAlongLinearPath)
// with the falling-bag bounce (Sin(data0 + 128, 30 - 8 * bounces), data0 += 6) to the screen edge behind the target: x = DISPLAY_WIDTH + 32 for an
// opponent target (AnimKnockOffOpponentsItem destroys the sprite on its 40th call), x = -32 for a player target (AnimItemSteal_Step1, then the
// off-screen AnimItemSteal_Step2 tail). The affine anim gFallingBagAffineAnimCmds1 wobbles it (-4 x 10, +4 x 20, -4 x 10).
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type ItemKnockoffSide = "player" | "opponent";
export interface ItemKnockoffPoint { readonly x: number; readonly y: number }
export interface ItemKnockoffBag {
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

/** moveAlongLinearPath's totalTime (InitItemBagData(sprite, 40)). */
export const ITEM_KNOCKOFF_PATH_ROWS = 40;
/** GetBattlerSpriteCoord(target, BATTLER_COORD_Y) (sBattlerCoords, singles); the path ends at that + 10. */
export const ITEM_KNOCKOFF_BATTLER_COORD_Y: Readonly<Record<ItemKnockoffSide, number>> = Object.freeze({ player: 80, opponent: 40 });

function matrixForAngle(angle: number): ItemKnockoffBag["matrix"] {
  const a = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
  const b = GBA_SINE_TABLE_256[angle & 0xff]!;
  return { a, b, c: -b, d: a };
}

/** The falling-bag affine anim's rotation on the sprite's `row`th row after its create row (row 1 = the first callback). */
function angleAtRow(row: number): number {
  if (row >= 1 && row <= 9) return 8 + (row - 1) * 4;
  if (row >= 10 && row <= 29) return 36 - (row - 10) * 4;
  if (row >= 30 && row <= 39) return -36 + (row - 30) * 4;
  return 0;
}

const trunc = (value: number): number => (value < 0 ? Math.ceil(value) : Math.floor(value));

/**
 * The bag `age` rows after its create row (age 0 = the row the sprite is created on), or null once it is gone / off-screen
 * (age >= 40: the opponent-side sprite is destroyed, the player-side one sits at x = -29 behind the screen edge).
 * `start` = the target's GetBattlerSpriteCoord (X_2 / Y_PIC_OFFSET), the createsprite origin.
 */
export function itemKnockoffAtAge(age: number, side: ItemKnockoffSide, start: ItemKnockoffPoint): ItemKnockoffBag | null {
  if (age < 0 || age >= ITEM_KNOCKOFF_PATH_ROWS) return null;
  const endX = side === "player" ? -32 : 240 + 32;
  const endY = ITEM_KNOCKOFF_BATTLER_COORD_Y[side] + 10;
  const elapsed = Math.max(0, age - 1);
  const callbacks = age;
  const phase = (callbacks * 6) % 132;
  const amplitude = 30 - Math.floor(callbacks * 6 / 132) * 8;
  return {
    x: start.x + trunc((endX - start.x) * elapsed / ITEM_KNOCKOFF_PATH_ROWS),
    y: start.y + trunc((endY - start.y) * elapsed / ITEM_KNOCKOFF_PATH_ROWS),
    y2: age === 0 ? 0 : Math.floor(GBA_SINE_TABLE_256[(phase + 128) & 0xff]! * amplitude / 256),
    matrix: matrixForAngle(angleAtRow(age)),
  };
}
