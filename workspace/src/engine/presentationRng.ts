/**
 * Presentation-only Random2 (gRng2Value) stream: docs/presentation-rng.md,
 * design docs/random2-trackability.md §7 (D3 option (a), user-approved 2026-10-06).
 *
 * The ROM's Random2 (reference/pokeemerald/src/random.c:29-33, include/random.h:16) steps
 * ISO_RANDOMIZE1 on its own word and returns the high half. This module reproduces that law
 * with exact u32 arithmetic and an O(log n) affine jump-ahead (random2StrictChain.py lcg_n).
 *
 * It is pure and imports nothing: it never reads, consumes, reseeds or derives from gameplay
 * RNG (gRngValue / EngineState.rngValue) or battle state.
 */

/** ISO_RANDOMIZE1 multiplier and increment (include/random.h:16). */
export const PRESENTATION_RNG_MULTIPLIER = 1103515245;
export const PRESENTATION_RNG_INCREMENT = 24691;

/**
 * `pinned`: the value at a known activation came from an oracle-pinned scenario (exact for that
 * controlled body). `surrogate`: seeded from the session presentation seed (faithful random,
 * never oracle-exact).
 */
export type PresentationRngProvenance = "pinned" | "surrogate";

export type PresentationRngState = Readonly<{
  /** gRng2Value-equivalent u32 state word. */
  value: number;
  provenance: PresentationRngProvenance;
}>;

/** One ISO_RANDOMIZE1 step on a u32 word (random.c:31). */
export function presentationRngStep(value: number): number {
  return (Math.imul(value >>> 0, PRESENTATION_RNG_MULTIPLIER) + PRESENTATION_RNG_INCREMENT) >>> 0;
}

/** `value` advanced by `n` ISO_RANDOMIZE1 steps, by squaring the affine map (O(log n)). */
export function presentationRngJump(value: number, n: number): number {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`presentation RNG jump must be a non-negative integer, got ${n}`);
  let a = PRESENTATION_RNG_MULTIPLIER;
  let c = PRESENTATION_RNG_INCREMENT;
  let ra = 1;
  let rc = 0;
  let k = n;
  while (k > 0) {
    if (k % 2 === 1) {
      ra = Math.imul(ra, a) >>> 0;
      rc = (Math.imul(rc, a) + c) >>> 0;
    }
    c = (Math.imul(c, a) + c) >>> 0;
    a = Math.imul(a, a) >>> 0;
    k = Math.floor(k / 2);
  }
  return (Math.imul(ra, value >>> 0) + rc) >>> 0;
}

export function createPresentationRngState(
  value: number,
  provenance: PresentationRngProvenance,
): PresentationRngState {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`presentation RNG state must be a u32, got ${value}`);
  }
  return Object.freeze({ value: value >>> 0, provenance });
}

/** `n` per-frame (or any) steps without drawing. */
export function advancePresentationRng(state: PresentationRngState, n = 1): PresentationRngState {
  return createPresentationRngState(presentationRngJump(state.value, n), state.provenance);
}

/** Random2(): advance one step, then return the high half (random.c:31-32). */
export function drawPresentationRng(state: PresentationRngState): Readonly<{
  state: PresentationRngState;
  word: number;
}> {
  const value = presentationRngStep(state.value);
  return Object.freeze({ state: createPresentationRngState(value, state.provenance), word: value >>> 16 });
}
