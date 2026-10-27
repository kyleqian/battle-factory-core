// Pure, seeded input generator for tools/browser/randomPlay.mjs (no browser or engine imports).

export type PlayButton = "A" | "B" | "START" | "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface PlayInput {
  button: PlayButton;
  holdMs: number;
  gapMs: number;
}

/** Key names src/input.ts binds to each GBA button. */
export const KEY_FOR_BUTTON: Readonly<Record<PlayButton, string>> = {
  A: "z",
  B: "x",
  START: "Enter",
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
};

/** mulberry32: small deterministic PRNG, returns floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Weights = ReadonlyArray<readonly [PlayButton, number]>;

// Mostly A so dialogue, menus and the battle loop keep advancing; the rest steers cursors and backs out.
const PROGRESS_WEIGHTS: Weights = [["A", 64], ["DOWN", 9], ["UP", 6], ["LEFT", 5], ["RIGHT", 5], ["B", 8], ["START", 3]];
// Used while the screen has not changed for a while: stop hammering A, wander and back out instead.
const STALLED_WEIGHTS: Weights = [["A", 25], ["DOWN", 18], ["UP", 14], ["LEFT", 12], ["RIGHT", 12], ["B", 14], ["START", 5]];

export function weightsFor(stalled: boolean): Weights {
  return stalled ? STALLED_WEIGHTS : PROGRESS_WEIGHTS;
}

function pickWeighted(weights: Weights, roll: number): PlayButton {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let target = roll * total;
  for (const [button, weight] of weights) {
    target -= weight;
    if (target < 0) return button;
  }
  return weights[weights.length - 1]![0];
}

/** Mostly short taps (>= ~3 frames at 59.7 Hz so the key is seen), occasionally a long hold for key-repeat paths. */
export function holdMsFor(roll: number): number {
  if (roll < 0.7) return 50 + Math.floor((roll / 0.7) * 70);
  if (roll < 0.95) return 120 + Math.floor(((roll - 0.7) / 0.25) * 180);
  return 300 + Math.floor(((roll - 0.95) / 0.05) * 700);
}

export function gapMsFor(roll: number): number {
  return 30 + Math.floor(roll * 220);
}

export interface InputGenerator {
  next(stalled?: boolean): PlayInput;
}

/** Same seed, same stall pattern: same sequence. */
export function createInputGenerator(seed: number): InputGenerator {
  const rng = createRng(seed);
  return {
    next(stalled = false) {
      const button = pickWeighted(weightsFor(stalled), rng());
      const holdMs = holdMsFor(rng());
      const gapMs = gapMsFor(rng());
      return { button, holdMs, gapMs };
    },
  };
}

/** `--seed` accepts decimal or 0x hex; the page's presentationSeed query is the same value as bare hex. */
export function parseSeed(text: string): number {
  const value = /^0x/i.test(text) ? Number.parseInt(text.slice(2), 16) : Number(text);
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) throw new Error(`invalid --seed: ${text}`);
  return value >>> 0;
}

export function presentationSeedHex(seed: number): string {
  return (seed >>> 0).toString(16);
}
