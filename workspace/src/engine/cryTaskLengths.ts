import { CRY_NATIVE_FRAMES } from "../data/cryNativeFrames.ts";

/**
 * cry1: frames from a cry-task PlayCry call to the frame IsCryPlaying turns false / the stop is scheduled, per mode, as D = min(cap, ceil(K * t) + 1)
 * with t = the species' native cry length (cryNativeFrames.ts). One K per mode, fitted to ROM step-mode windows (tools/audio/fixtures/cry1-*.json for the
 * first cries; the rest in .integration/evidence/cry1, docs/cry1-cry-tasks.md): the integer offset is fixed, K is the centre of the interval that reproduces every
 * measured species (zero residual on all of them); caps are the modes' length limits (PlayCryInternal). A fitted model, not a ROM table: a species near a step edge can be off by one.
 */
export type CryTaskLengthMode = "ECHO_START" | "ECHO_END" | "ROAR_2" | "HIGH_PITCH";

const MODEL: Readonly<Record<CryTaskLengthMode, Readonly<{ k: number; cap: number }>>> = {
  ECHO_START: { k: 0.94996, cap: 26 },
  ECHO_END: { k: 0.970325, cap: 141 },
  ROAR_2: { k: 0.944111, cap: 61 },
  HIGH_PITCH: { k: 0.919943, cap: 51 },
};

export function cryTaskLength(mode: CryTaskLengthMode, species: number): number | undefined {
  const native = CRY_NATIVE_FRAMES[species];
  if (native === undefined) return undefined;
  const { k, cap } = MODEL[mode];
  return Math.min(cap, Math.ceil(k * native) + 1);
}
