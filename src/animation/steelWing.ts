import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { metallicShineAtAge, type MetallicShineState } from "./metallicShine.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
} from "./slideMon.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type SteelWingSide = "player" | "opponent";

export interface SteelWingGust {
  readonly index: 0 | 1;
  readonly x: number;
  readonly y: number;
  readonly xScale: number;
  readonly yScale: 256;
  readonly affineAge: number;
}

export interface SteelWingState {
  readonly active: boolean;
  readonly metallic: MetallicShineState;
  readonly attackerX2: number;
  readonly attackerY2: number;
  readonly gusts: readonly SteelWingGust[];
  readonly gustPaletteRotation: number;
  readonly hitsplats: readonly Readonly<{ x: number; y: number; animation: 1 }>[];
  readonly monbg: boolean;
  readonly alpha: boolean;
}

function sin(index: number, amplitude: number): number {
  return Math.floor(GBA_SINE_TABLE_256[index & 0xff]! * amplitude / 256) || 0;
}

/**
 * Exact `AnimTask_TranslateMonElliptical(0, 12, 4, 1, 4)` callback body.
 *
 * Speed 4 -> wavePeriod 16. The wrap frame (data[5] wraps to 0) writes
 * (-5,1) then immediately resets to (0,0) and destroys the task, so tick 15
 * is never a visible frame — the active window is 0..14.
 */
export function steelWingEllipticalAtTick(tick: number): Readonly<{ x2: number; y2: number; active: boolean }> {
  if (tick < 0 || tick >= 15) return { x2: 0, y2: 0, active: false };
  const phase = (tick * 16) & 0xff;
  return { x2: sin(phase, 12), y2: -sin(phase + 64, 4) + 4, active: true };
}

/** Exact faded-palette row rotation count for `(delay=1, duration=70)`. */
export function steelWingGustPaletteRotationAtTick(tick: number): number {
  if (tick < 0) return 0;
  return Math.min(35, Math.floor((Math.min(tick, 69) + 1) / 2));
}

/**
 * `gGustToTargetSpriteTemplate`: 24 affine callbacks, then the 20-callback
 * `InitAnimLinearTranslation` leg. Creation age zero is retained in software
 * OAM; the production compositor applies the shared one-display transfer.
 */
export function steelWingGustAtTick(
  tick: number,
  index: 0 | 1,
  attackerSide: SteelWingSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SteelWingGust | null {
  if (tick < 0 || tick > 45) return null;
  const scriptX = index === 0 ? -25 : 25;
  const startX = attackerCenter.x + scriptX;
  const targetX = targetCenter.x;
  // Y_PIC_OFFSET: player-back attacker spawns +8, opponent-front +0.
  const startY = attackerCenter.y + (attackerSide === "player" ? 8 : 0);
  const affineAge = Math.min(tick, 24);
  // AFFINEANIMCMD_FRAME(0x10, 0x100, 0, 0) is followed by the
  // duration-24 +0xA command; its first update is retained immediately.
  const xScale = tick < 24 ? 26 + 10 * tick : 256;
  // Two neutral-scale callback displays bridge RunStoredCallbackWhenAffineAnimEnds.
  const callbacks = Math.max(0, tick - 25);
  const dx = linearTranslationDeltaQ8(targetX - startX, 20);
  const dy = linearTranslationDeltaQ8(targetCenter.y - startY, 20);
  return {
    index,
    x: startX + linearTranslationOffsetAfterCallbacks(dx, callbacks, 20),
    y: startY + linearTranslationOffsetAfterCallbacks(dy, callbacks, 20),
    xScale,
    yScale: 256,
    affineAge,
  };
}

/** Complete successful-hit `Move_STEEL_WING` body, relative to MetallicShine. */
export function steelWingAtAge(
  age: number,
  attackerSide: SteelWingSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SteelWingState {
  // Dense source window begins at loadspritegfx GUST. The interpreter then
  // spends eight displays loading both tags/starting the HARDEN loop before
  // MetallicShine's initializer, and the contact body begins at display 110.
  const shineAge = age - 8;
  const contactAge = age - 110;
  const ellipse = steelWingEllipticalAtTick(contactAge);
  const slideOut = slideMonToOffsetAtTick({
    battlerSide: attackerSide,
    targetXOffset: 24,
    targetYOffset: 0,
    mirrorVertical: false,
    durationTicks: 9,
  }, contactAge - 26);
  const slideBack = slideMonToOriginalPosAtTick({
    currentX2: attackerSide === "player" ? 24 : -24,
    currentY2: 0,
    axisSnapMode: 0,
    durationTicks: 11,
  }, contactAge - 70);
  const attackerOffset = contactAge >= 70 ? slideBack
    : contactAge >= 26 ? slideOut : ellipse;
  const gusts = ([0, 1] as const)
    .map((index) => steelWingGustAtTick(
      contactAge, index, attackerSide, attackerCenter, targetCenter,
    ))
    .filter((gust): gust is SteelWingGust => gust !== null);
  const hitsplatAge = contactAge - 45;
  const hitsplats = hitsplatAge >= 0 && hitsplatAge <= 9
    ? ([16, -16] as const).map((x) => ({
        x: targetCenter.x + x,
        y: targetCenter.y,
        animation: 1 as const,
      }))
    : [];
  return {
    active: age >= 0 && age <= 196,
    metallic: metallicShineAtAge(shineAge, attackerCenter.x, attackerCenter.y, false),
    attackerX2: attackerOffset.x2,
    attackerY2: attackerOffset.y2,
    gusts,
    gustPaletteRotation: steelWingGustPaletteRotationAtTick(contactAge),
    hitsplats,
    monbg: age >= 107 && age <= 194,
    alpha: age >= 110 && age <= 191,
  };
}
