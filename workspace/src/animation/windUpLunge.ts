/**
 * Source-relative port of `AnimTask_WindUpLunge` and its two step callbacks
 * (`reference/pokeemerald/src/battle_anim_mon_movement.c:637-688`).
 *
 * Tick zero is the constructor tick's immediately dispatched Step1 callback.
 * The source task mutates the two horizontal arguments for an opponent-side
 * attacker before initializing its Q8.8 accumulators; the reducer keeps that
 * side inversion inside this shared component.
 *
 * The wind-up wave (`gBattleAnimArgs[2]`, via `Sin((u8)(data[10]>>8), amp)`)
 * is the shared GBA sine table indexed by the wave accumulator's high byte —
 * `gSineTable`, the same 256-entry table the engine's send-out arcs use. The
 * SPIKE_CANNON/BRICK_BREAK components used amplitude zero; TAKE_DOWN is the
 * first exact move to exercise the nonzero branch.
 */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type WindUpLungeSide = "player" | "opponent";

export interface WindUpLungeArgs {
  readonly horizontalSpeed: number;
  readonly waveAmplitude: number;
  readonly windUpDuration: number;
  readonly delayBeforeLunge: number;
  readonly targetXOffset: number;
  readonly lungeDuration: number;
}

export interface WindUpLungeState {
  readonly offset: Readonly<{ x2: number; y2: number }>;
  readonly phase: "step1" | "step2" | "complete";
  readonly active: boolean;
}

function sine(index: number, amplitude: number): number {
  // `Sin(index, amplitude)` = `(amplitude * gSineTable[index]) >> 8` with the
  // signed ARM shift (negative fractions round down, unlike JS `Math.trunc`).
  // JS `>>` is already an arithmetic shift, so it floors negative products
  // exactly like the ARM one — no extra rounding correction.
  return (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;
}

export function windUpLungeAtTick(
  args: WindUpLungeArgs,
  attackerSide: WindUpLungeSide,
  tick: number,
): WindUpLungeState {
  if (tick < 0) {
    return { offset: { x2: 0, y2: 0 }, phase: "complete", active: false };
  }

  const invert = attackerSide === "opponent" ? -1 : 1;
  const speed = args.horizontalSpeed * invert;
  const target = args.targetXOffset * invert;
  const windDelta = Math.trunc((speed << 8) / args.windUpDuration);
  const lungeDelta = Math.trunc((target << 8) / args.lungeDuration);
  const wavePeriod = Math.trunc(0x8000 / args.windUpDuration);
  let windRemaining = args.windUpDuration;
  let delayRemaining = args.delayBeforeLunge;
  let lungeRemaining = args.lungeDuration;
  let windAccumulator = 0;
  let lungeAccumulator = 0;
  let waveAccumulator = 0;
  let x2 = 0;
  let y2 = 0;
  let phase: "step1" | "step2" = "step1";

  for (let callback = 0; callback <= tick; callback += 1) {
    if (phase === "step1") {
      windAccumulator += windDelta;
      x2 = windAccumulator >> 8;
      y2 = sine(waveAccumulator >> 8 & 0xff, args.waveAmplitude);
      waveAccumulator += wavePeriod;
      windRemaining -= 1;
      if (windRemaining === 0) phase = "step2";
      continue;
    }

    if (delayRemaining > 0) {
      delayRemaining -= 1;
      continue;
    }
    lungeAccumulator += lungeDelta;
    x2 = (lungeAccumulator >> 8) + (windAccumulator >> 8);
    lungeRemaining -= 1;
    if (lungeRemaining === 0) {
      return {
        offset: { x2, y2 },
        phase: "complete",
        active: false,
      };
    }
  }

  return { offset: { x2, y2 }, phase, active: true };
}
