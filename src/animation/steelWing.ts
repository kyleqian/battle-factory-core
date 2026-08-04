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

/** Exact `AnimTask_TranslateMonElliptical(0, 12, 4, 1, 4)` callback body. */
export function steelWingEllipticalAtTick(tick: number): Readonly<{ x2: number; y2: number; active: boolean }> {
  if (tick < 0 || tick >= 16) return { x2: 0, y2: 0, active: false };
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
  if (tick < 0 || tick >= 44) return null;
  const scriptX = index === 0 ? -25 : 25;
  const startX = attackerCenter.x + scriptX;
  const targetX = targetCenter.x + (attackerSide === "player" ? 0 : -0);
  const affineAge = Math.min(tick, 24);
  const xScale = tick < 24 ? 16 + Math.trunc((246 * tick) / 24) : 256;
  const callbacks = Math.max(0, tick - 23);
  const dx = linearTranslationDeltaQ8(targetX - startX, 20);
  const dy = linearTranslationDeltaQ8(targetCenter.y - attackerCenter.y, 20);
  return {
    index,
    x: startX + linearTranslationOffsetAfterCallbacks(dx, callbacks, 20),
    y: attackerCenter.y + linearTranslationOffsetAfterCallbacks(dy, callbacks, 20),
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
  const contactAge = age - 100;
  const ellipse = steelWingEllipticalAtTick(contactAge);
  const slideOut = slideMonToOffsetAtTick({
    battlerSide: attackerSide,
    targetXOffset: 24,
    targetYOffset: 0,
    mirrorVertical: false,
    durationTicks: 9,
  }, contactAge - 24);
  const slideBack = slideMonToOriginalPosAtTick({
    currentX2: attackerSide === "player" ? 24 : -24,
    currentY2: 0,
    axisSnapMode: 0,
    durationTicks: 11,
  }, contactAge - 85);
  const attackerOffset = contactAge >= 85 ? slideBack
    : contactAge >= 24 ? slideOut : ellipse;
  const gusts = ([0, 1] as const)
    .map((index) => steelWingGustAtTick(
      contactAge, index, attackerSide, attackerCenter, targetCenter,
    ))
    .filter((gust): gust is SteelWingGust => gust !== null);
  const hitsplatAge = contactAge - 41;
  const hitsplats = hitsplatAge >= 0 && hitsplatAge <= 9
    ? ([16, -16] as const).map((x) => ({
        x: targetCenter.x + x,
        y: targetCenter.y,
        animation: 1 as const,
      }))
    : [];
  return {
    active: age >= 0 && contactAge <= 97,
    metallic: metallicShineAtAge(age, attackerCenter.x, attackerCenter.y, false),
    attackerX2: attackerOffset.x2,
    attackerY2: attackerOffset.y2,
    gusts,
    gustPaletteRotation: steelWingGustPaletteRotationAtTick(contactAge),
    hitsplats,
    monbg: contactAge >= 0 && contactAge <= 96,
    alpha: contactAge >= 0 && contactAge <= 96,
  };
}
