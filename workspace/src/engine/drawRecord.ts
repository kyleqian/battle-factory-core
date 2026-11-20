// pic3 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): what one render() call drew, at state level, so a check can compare the
// drawn battlers and healthboxes with the battle rules state frame by frame without comparing pixels.
//
// Recording is off unless a caller wraps a render in `recordDraws` (tests, tools/integration/drawnFieldCheck.ts); the hooks are one
// null check each when it is off. The hooks sit at the narrowest shared entry points:
//   - mon pictures: every battle front / back pic read goes through monPicPixels.ts (`frontPixels` / `backPixels`, the lazy sheets and
//     tables); a read of a sheet's pixels is recorded as (side, species).
//   - healthboxes: `composePlayerHealthbox` / `composeOpponentHealthbox` (healthboxAssembly.ts) record the name, level, gender and HP
//     they are asked to draw, before their memo.
//   - canonical samples: the legacy sample-battle helpers (the recorded BUG CATCHER DESTIN battle's MURKROW / MAGBY art and its fixed
//     healthboxes, battleScene.ts) and the room's generic opponent sheet call `noteCanonicalSample`. Inside `withLiveRender` (the live
//     Factory routes of core.ts's render) that is an error: the live path must draw from the live record, never from the sample
//     (thrown in strict mode, a contained presentation error in the browser; see `setCanonicalSampleStrict`).
//
// Overworld trainer sprites (battle room, lobby) are recorded by `noteOverworldSprite` so the room's opponent can be compared with the
// round's trainer.

import { recordContainedPresentationError } from "./presentationContainment.ts";

export type DrawnMonPic = Readonly<{ side: "front" | "back"; species: string }>;
export type DrawnHealthbox = Readonly<{
  side: "player" | "opponent";
  name: string;
  level: number;
  gender: string | null;
  /** Player healthbox: the printed HP; null on the opponent's (it prints no number). */
  currentHp: number | null;
  maxHp: number | null;
  /** Opponent healthbox: the bar fraction it is asked to fill; null on the player's. */
  hpFraction: number | null;
}>;
/** An overworld sprite: its sheet and its drawn top-left corner and size on screen. */
export type DrawnOverworldSprite = Readonly<{ role: string; graphicsId: string; x: number; y: number; width: number; height: number }>;
export type DrawRecord = {
  monPics: DrawnMonPic[];
  healthboxes: DrawnHealthbox[];
  overworldSprites: DrawnOverworldSprite[];
  canonicalSamples: string[];
};

export class CanonicalSampleInLiveRenderError extends Error {
  readonly sample: string;
  constructor(sample: string) {
    super(`live render reached the canonical sample battle's ${sample}`);
    this.name = "CanonicalSampleInLiveRenderError";
    this.sample = sample;
  }
}

let active: DrawRecord | null = null;
let liveDepth = 0;

/** Runs `draw` with recording on; nested calls share the outer record. */
export function recordDraws<T>(draw: () => T): { result: T; record: DrawRecord } {
  if (active !== null) return { result: draw(), record: active };
  const record: DrawRecord = { monPics: [], healthboxes: [], overworldSprites: [], canonicalSamples: [] };
  active = record;
  try {
    return { result: draw(), record };
  } finally {
    active = null;
  }
}

/** Marks `draw` as a live Factory route: a canonical sample helper reached inside it throws. */
export function withLiveRender<T>(draw: () => T): T {
  liveDepth += 1;
  try {
    return draw();
  } finally {
    liveDepth -= 1;
  }
}

export function insideLiveRender(): boolean {
  return liveDepth > 0;
}

export function noteMonPicRead(side: "front" | "back", species: string): void {
  if (active === null) return;
  const last = active.monPics[active.monPics.length - 1];
  if (last !== undefined && last.side === side && last.species === species) return;
  active.monPics.push({ side, species });
}

export function noteHealthboxComposed(healthbox: DrawnHealthbox): void {
  if (active === null) return;
  active.healthboxes.push(healthbox);
}

export function noteOverworldSprite(role: string, graphicsId: string, x: number, y: number, width: number, height: number): void {
  if (active === null) return;
  active.overworldSprites.push({ role, graphicsId, x, y, width, height });
}

/**
 * Strict mode throws a live-route sample; it is on under vitest and in the checking tools (drawnFieldCheck.ts). The browser records the
 * sample as a contained presentation error (presentationContainment.ts: visible to the soak, the bench ABI and the session export) and
 * keeps drawing, so a sample the checks have not reached degrades a picture instead of stopping the game.
 */
let strict = typeof process !== "undefined" && process.env?.VITEST === "true";
export function setCanonicalSampleStrict(on: boolean): void {
  strict = on;
}

/** A legacy sample-battle helper is drawing; an error inside a live route. */
export function noteCanonicalSample(sample: string): void {
  if (liveDepth > 0) {
    const error = new CanonicalSampleInLiveRenderError(sample);
    if (strict) throw error;
    recordContainedPresentationError("draw", "canonical-sample", error);
  }
  if (active !== null) active.canonicalSamples.push(sample);
}

/** Wraps a canonical sample accessor so every call notes the sample (an error inside a live render). */
export function canonicalSampleAccessor<A extends unknown[], R>(sample: string, accessor: (...args: A) => R): (...args: A) => R {
  return (...args: A): R => {
    noteCanonicalSample(sample);
    return accessor(...args);
  };
}
