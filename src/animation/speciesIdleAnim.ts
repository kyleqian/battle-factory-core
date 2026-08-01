import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import frontierMons from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../data/gen/send-out-anim-selector-tables.json" with { type: "json" };

/**
 * Species send-out front-sprite animation port (`pokemon_animation.c`).
 *
 * Every battler plays exactly ONE of these once, at send-out
 * (`BattleAnimateFrontSprite` -> `DoMonFrontSpriteAnimation`,
 * `pokemon.c:6803-6856`, species selected via `sMonFrontAnimIdsTable`,
 * `pokemon.c:1405-...`). Every one of these `Anim_*` functions freezes its
 * sprite's `x2`/`y2` at whatever its own accumulator held on its LAST
 * active tick and hands the sprite off to `WaitAnimEnd` -> (once the OAM
 * frame-anim also ends) `SpriteCallbackDummy` (`pokemon_animation.c
 * :5540-5544`) - a PERMANENT residual offset for the rest of the battle,
 * until an unrelated mechanism (e.g. `AnimTask_ShakeMon`'s unconditional
 * `sprite->x2 = gBattleAnimArgs[1]` absolute set,
 * `battle_anim_mon_movement.c:98-99`) overwrites it. This is the
 * "idle-bob" residual DRAGON_RAGE's own dense window ran into for ONIX's
 * front sprite (ANIMATION_PROGRESS.md, DRAGON_RAGE rung 5 remainder) and
 * that `docs/aerial-ace-portable-staging-probe.md` independently hand-fit
 * for the same species/sprite ("the settled opponent-front Onix starts
 * with front-animation OAM x2=+1").
 *
 * RAM-probed this session (`tools/probe/dump-onix-front-idle-anim.py`,
 * `mechanic-dragon-rage-charmeleon-onix.json`): ONIX's own battler sprite
 * (`gBattlerSpriteIds[1]`) already carries `x2=1, y2=0, animNum=1` and a
 * `callback` resolving to `SpriteCallbackDummy` (`0x08007428`,
 * `nm pokeemerald.elf`) at the fixture's own first recorded tick - the
 * mechanicLab staging harness fast-forwards past the send-out intro
 * before the trace starts recording, so no committed window observes
 * `Anim_RapidHorizontalHops` mid-flight; only its already-settled
 * terminal state is directly RAM-observable. That terminal value matches
 * this port's own `computeTerminalOffset("RAPID_H_HOPS")` result
 * (`x2=1, y2=0`) exactly, cross-checked by hand against the source's own
 * arithmetic at its last active accumulator (2040) - see
 * `tests/speciesIdleAnim.test.ts`. The live per-tick sequence (ticks
 * 0-85) is ported faithfully from source but is NOT independently
 * RAM-pinned tick-by-tick this session (named limitation: no committed
 * fixture captures it running) - only the terminal freeze this move's
 * window actually needs is RAM-confirmed.
 */

export type SpeciesFrontAnimFamily =
  | "GROW_VIBRATE"
  | "H_SHAKE"
  | "RAPID_H_HOPS"
  | "SWING_CONCAVE"
  | "V_JUMPS_SMALL"
  | "V_SLIDE"
  | "V_SQUISH_AND_BOUNCE"
  | "V_SQUISH_AND_BOUNCE_SLOW"
  | "V_STRETCH"
  | "V_SHAKE";

const FRONT_ANIM_PREFIX = "ANIM_";
const PORTED_FRONT_FAMILIES = new Set<SpeciesFrontAnimFamily>([
  "GROW_VIBRATE",
  "H_SHAKE",
  "RAPID_H_HOPS",
  "SWING_CONCAVE",
  "V_JUMPS_SMALL",
  "V_SLIDE",
  "V_SQUISH_AND_BOUNCE",
  "V_SQUISH_AND_BOUNCE_SLOW",
  "V_STRETCH",
  "V_SHAKE",
]);

const generatedFrontAnimIds = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
const factoryFrontSpecies = new Set(
  (frontierMons.entries as readonly { readonly species: string }[])
    .map(({ species }) => species.replace(/^SPECIES_/, "")),
);

/**
 * Complete Factory-reachable `ANIM_V_SQUISH_AND_BOUNCE` front family,
 * derived from the generated `sMonFrontAnimIdsTable` extraction. Keep this
 * named export derived: a second literal species map would drift from source.
 */
export const V_SQUISH_AND_BOUNCE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_SQUISH_AND_BOUNCE")
    .map(([species]) => species),
);

/** Complete Factory-reachable slow squish/bounce family, source-derived. */
export const V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_SQUISH_AND_BOUNCE_SLOW")
    .map(([species]) => species),
);

/** Complete Factory-reachable `ANIM_V_STRETCH` front family, source-derived. */
export const V_STRETCH_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_STRETCH")
    .map(([species]) => species),
);

/**
 * All selector-table mappings for `ANIM_V_SHAKE`. This is 25 species, not a
 * Factory count: GROUDON is present in `sMonFrontAnimIdsTable` but absent from
 * every `gBattleFrontierMons` rental entry.
 */
export const V_SHAKE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_SHAKE")
    .map(([species]) => species),
);

/** The 24 `ANIM_V_SHAKE` species reachable through Factory rental sets. */
export const V_SHAKE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SHAKE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** Selector mappings outside the Factory pool (currently GROUDON alone). */
export const V_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SHAKE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/**
 * All 17 selector-table mappings for `ANIM_H_SHAKE`. RAYQUAZA is the sole
 * mapping outside the Factory rental pool.
 */
export const H_SHAKE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_SHAKE")
    .map(([species]) => species),
);

/** The 16 `ANIM_H_SHAKE` species reachable through Factory rental sets. */
export const H_SHAKE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SHAKE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** Selector mappings outside the Factory pool (RAYQUAZA alone). */
export const H_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SHAKE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/**
 * All 18 selector-table mappings for `ANIM_GROW_VIBRATE`. MEWTWO and HO_OH
 * are the only mappings outside the Factory rental pool.
 */
export const GROW_VIBRATE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_GROW_VIBRATE")
    .map(([species]) => species),
);

/** The 16 `ANIM_GROW_VIBRATE` species reachable through Factory rentals. */
export const GROW_VIBRATE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  GROW_VIBRATE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** Selector mappings outside the Factory pool (MEWTWO and HO_OH). */
export const GROW_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  GROW_VIBRATE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 11 source selector mappings for `ANIM_SWING_CONCAVE`. */
export const SWING_CONCAVE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_SWING_CONCAVE")
    .map(([species]) => species),
);

/** Every `ANIM_SWING_CONCAVE` mapping is reachable through Factory rentals. */
export const SWING_CONCAVE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  SWING_CONCAVE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no `ANIM_SWING_CONCAVE` selector mappings outside the Factory pool. */
export const SWING_CONCAVE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  SWING_CONCAVE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 10 source selector mappings for `ANIM_V_SLIDE`. */
export const V_SLIDE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_SLIDE")
    .map(([species]) => species),
);

/** Every `ANIM_V_SLIDE` mapping is reachable through Factory rentals. */
export const V_SLIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SLIDE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no `ANIM_V_SLIDE` selector mappings outside the Factory pool. */
export const V_SLIDE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SLIDE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 10 source selector mappings for `ANIM_V_JUMPS_SMALL`. */
export const V_JUMPS_SMALL_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_JUMPS_SMALL")
    .map(([species]) => species),
);

/** Every `ANIM_V_JUMPS_SMALL` mapping is reachable through Factory rentals. */
export const V_JUMPS_SMALL_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_JUMPS_SMALL_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no `ANIM_V_JUMPS_SMALL` selector mappings outside the Factory pool. */
export const V_JUMPS_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_JUMPS_SMALL_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

export interface SpeciesIdleOffset {
  readonly x2: number;
  readonly y2: number;
}

function gbaSin(index: number, amplitude: number): number {
  const v = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((amplitude * v) / 256);
}

const RAPID_H_HOPS_ACCUMULATOR_STEP = 24;
const RAPID_H_HOPS_ACCUMULATOR_LIMIT = 2048;

/**
 * 1:1 port of `Anim_RapidHorizontalHops`'s own per-call motion write
 * (`reference/pokeemerald/src/pokemon_animation.c:3567-3599`), given the
 * source's own `sprite->data[2]` value AT THE START of that call (i.e.
 * before that call's own `data[2] += 24`). `TryFlipX`'s hFlip toggling has
 * no pixel effect on the opponent-side geometry this move's window uses
 * (unmirrored), so it is not ported.
 */
function rapidHorizontalHopsOffsetAtAccumulator(accumulator: number): SpeciesIdleOffset {
  const phase = Math.floor(accumulator / 512) % 4;
  const local = accumulator % 512;
  // `+ 0` on every branch avoids a JS negative-zero result (`-0`) - C's
  // `s16` has no signed-zero distinction, so this is a representation fix,
  // not a value change.
  let x2: number;
  switch (phase) {
    case 0:
      x2 = -Math.trunc((local * 16) / 512) + 0;
      break;
    case 1:
      x2 = Math.trunc(local / 32) - 16;
      break;
    case 2:
      x2 = Math.trunc(local / 32);
      break;
    default:
      x2 = -Math.trunc((local * 16) / 512) + 16;
      break;
  }
  const y2 = -gbaSin(accumulator % 128, 4) + 0;
  return { x2, y2 };
}

/**
 * `Anim_RapidHorizontalHops` at `ticksSinceStart` (0-based from its own
 * creation tick), or `null` once it has frozen (`sprite->callback =
 * WaitAnimEnd`) - the source's own `sprite->data[2] > 2048` guard,
 * evaluated on the accumulator's value BEFORE this tick's own `+= 24`.
 */
export function rapidHorizontalHopsOffsetAtTick(ticksSinceStart: number): SpeciesIdleOffset | null {
  if (ticksSinceStart < 0) return null;
  const accumulator = ticksSinceStart * RAPID_H_HOPS_ACCUMULATOR_STEP;
  if (accumulator > RAPID_H_HOPS_ACCUMULATOR_LIMIT) return null;
  return rapidHorizontalHopsOffsetAtAccumulator(accumulator);
}

export interface VerticalSquishBounceFrame extends SpeciesIdleOffset {
  readonly data2: number;
  readonly data3: number;
  readonly data4: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly callback: "VerticalSquishBounce" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

const VERTICAL_SQUISH_BOUNCE_DURATION = 16;
const VERTICAL_SQUISH_BOUNCE_SLOW_DURATION = 32;

/** Shared source-order `VerticalSquishBounce` callback port
 * (`pokemon_animation.c:1834-1870`). The two source initializers select
 * duration 16 or 32 through `data[0]`; no other arithmetic differs. */
function verticalSquishBounceFrameAtDurationTick(
  ticksSinceStart: number,
  duration: number,
): VerticalSquishBounceFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let data3 = 0;
  let data4 = 0;
  let y2 = 0;
  let xScale = 256;
  let yScale = 256;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (data2 > duration * 3) {
      return {
        x2: 0,
        y2: 0,
        data2,
        data3,
        data4,
        xScale: 256,
        yScale: 256,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      };
    }

    yScale = gbaSin(data4, 32) + 256;
    if (data2 > duration && data2 < duration * 2) {
      data3 += Math.trunc(128 / duration);
    }
    const posY = yScale > 256 ? Math.trunc((256 - yScale) / 8) : 0;
    y2 = -gbaSin(data3, 10) - posY + 0;
    xScale = 256 - gbaSin(data4, 32);
    data2 += 1;
    data4 = (data4 + Math.trunc(128 / duration)) & 0xff;
  }

  return {
    x2: 0,
    y2,
    data2,
    data3,
    data4,
    xScale,
    yScale,
    callback: "VerticalSquishBounce",
    affineMode: "double",
  };
}

/**
 * `Anim_VerticalSquishBounce` (`pokemon_animation.c:1871-1876`). Tick 49
 * performs affine identity/y2 cleanup and hands off to `WaitAnimEnd`.
 */
export function verticalSquishBounceFrameAtTick(
  ticksSinceStart: number,
): VerticalSquishBounceFrame | null {
  return verticalSquishBounceFrameAtDurationTick(ticksSinceStart, VERTICAL_SQUISH_BOUNCE_DURATION);
}

/**
 * Source-order port of `Anim_VerticalSquishBounce_Slow`
 * (`pokemon_animation.c:3658-3663`). That initializer selects the same
 * `VerticalSquishBounce` callback as the normal family and changes only
 * `data[0]` from 16 to 32. Ticks 0..96 are active; tick 97 performs affine
 * identity/y2 cleanup and hands off to `WaitAnimEnd`.
 */
export function verticalSquishBounceSlowFrameAtTick(
  ticksSinceStart: number,
): VerticalSquishBounceFrame | null {
  return verticalSquishBounceFrameAtDurationTick(
    ticksSinceStart,
    VERTICAL_SQUISH_BOUNCE_SLOW_DURATION,
  );
}

export interface VerticalStretchFrame extends SpeciesIdleOffset {
  readonly data2: number;
  readonly data4: number;
  readonly data5: number;
  readonly data7: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly callback: "Anim_VerticalStretch" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

const VERTICAL_STRETCH_DURATION = 40;

/**
 * Source-order port of `Anim_VerticalStretch`
 * (`pokemon_animation.c:1597-1629`). The returned frame is the state after
 * the callback for `ticksSinceStart` has run. `dontFlip` is the source's
 * `sprite->sDontFlip` bit; it changes only the first affine scale argument.
 * Tick 41 performs the identity-affine/y2 cleanup, restores normal affine
 * mode, and hands off to `WaitAnimEnd`.
 */
export function verticalStretchFrameAtTick(
  ticksSinceStart: number,
  dontFlip = false,
): VerticalStretchFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let data4 = 0;
  let data5 = 0;
  let data7 = 0;
  let y2 = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (data2 > VERTICAL_STRETCH_DURATION) {
      // `HandleSetAffineData(256, 256, 0)` does not rewrite data[4]/data[5].
      data2 += 1;
      return {
        x2: 0,
        y2: 0,
        data2,
        data4,
        data5,
        data7,
        xScale: 256,
        yScale: 256,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      };
    }

    const index2 = Math.trunc((data2 * 128) / VERTICAL_STRETCH_DURATION);
    let index1 = 0;
    if (data2 >= 10 && data2 <= 29) {
      data7 += 51;
      index1 = data7 & 0xff;
    }

    data4 = dontFlip ? gbaSin(index2, 16) + 256 : -gbaSin(index2, 16) - 256;
    data5 = 256 - gbaSin(index2, 40) - gbaSin(index1, 8);
    const posY = data5 !== 256 ? Math.trunc((256 - data5) / 8) : 0;
    y2 = -posY + 0;
    data2 += 1;
  }

  return {
    x2: 0,
    y2,
    data2,
    data4,
    data5,
    data7,
    xScale: data4,
    yScale: data5,
    callback: "Anim_VerticalStretch",
    affineMode: "double",
  };
}

export interface VerticalShakeFrame extends SpeciesIdleOffset {
  readonly data0: number;
  readonly data2: number;
  readonly callback: "VerticalShake" | "WaitAnimEnd";
}

export interface HorizontalShakeFrame extends SpeciesIdleOffset {
  readonly data0: number;
  readonly data2: number;
  readonly data7: number;
  readonly callback: "HorizontalShake" | "WaitAnimEnd";
}

export interface GrowVibrateFrame extends SpeciesIdleOffset {
  readonly data2: number;
  readonly data4: number;
  readonly data5: number;
  readonly index: number | null;
  readonly amplitude: 8 | 32 | null;
  readonly xScale: number;
  readonly yScale: number;
  readonly startedAffine: boolean;
  readonly callback: "Anim_GrowVibrate" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export interface SwingConcaveFrame extends SpeciesIdleOffset {
  readonly data2: number;
  readonly animRotation: number;
  readonly animDelay: number;
  readonly animRuns: number;
  readonly animSpeed: number;
  readonly animData: number;
  readonly index: number | null;
  readonly xScale: number;
  readonly yScale: number;
  readonly affineRotation: number;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "SwingConcave" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export interface VerticalSlideFrame extends SpeciesIdleOffset {
  readonly data0: 40;
  readonly data2: number;
  readonly index: number | null;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly callback: "VerticalSlide" | "WaitAnimEnd";
}

export interface VerticalJumpsSmallFrame extends SpeciesIdleOffset {
  readonly data0: 3;
  readonly data2: number;
  readonly counter: number;
  readonly divCounter: 0 | 1 | 2 | 3 | null;
  readonly adjustedCounter: number | null;
  readonly sineIndex: number | null;
  readonly amplitude: 6 | 9 | null;
  readonly callback: "VerticalJumps" | "WaitAnimEnd";
}

const SWING_CONCAVE_DURATION = 100;

function tryFlipX(x2: number, dontFlip: boolean): number {
  return dontFlip ? x2 : -x2;
}

/**
 * Source-order port of `Anim_SwingConcave` / `SwingConcave`
 * (`pokemon_animation.c:1038-1059,2512-2542,3836-3843`) on the normal
 * opponent-front path. `AddNewAnim` calls `InitAnimData`, which explicitly
 * establishes rotation=0, delay=0, runs=1, speed=0, data=0; the initializer
 * then overwrites only data=100. `Task_HandleMonAnimation` has already set
 * `sDontFlip=TRUE`, so both source-order `TryFlipX` calls execute but leave x2
 * unchanged. Tick 0 starts affine mode before the first write, ticks 0..100
 * apply C-truncated index, x2 sine and affine rotation writes, and tick 101
 * observes the strict data2 > data guard, restores identity/x2/normal affine
 * state, installs `WaitAnimEnd`, and still performs the final data2 increment.
 */
export function swingConcaveFrameAtTick(ticksSinceStart: number): SwingConcaveFrame | null {
  if (ticksSinceStart < 0) return null;

  // `InitAnimData`, called by `AddNewAnim`, is the source of these defaults.
  const animRotation = 0;
  const animDelay = 0;
  const animRuns = 1;
  const animSpeed = 0;
  let animData = 0;
  animData = SWING_CONCAVE_DURATION;
  let data2 = 0;
  let x2 = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const startedAffine = data2 === 0;

    // First source-order `TryFlipX`; Task_HandleMonAnimation set sDontFlip.
    x2 = tryFlipX(x2, true);
    if (data2 > animData) {
      x2 = 0;
      data2 += 1;
      x2 = tryFlipX(x2, true);
      return {
        x2,
        y2: 0,
        data2,
        animRotation,
        animDelay,
        animRuns,
        animSpeed,
        animData,
        index: null,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      };
    }

    const index = Math.trunc((data2 * 256) / animData);
    x2 = -gbaSin(index, 10) + 0;
    const affineRotation = gbaSin(index, 3276);
    data2 += 1;
    x2 = tryFlipX(x2, true);

    if (tick === ticksSinceStart) {
      return {
        x2,
        y2: 0,
        data2,
        animRotation,
        animDelay,
        animRuns,
        animSpeed,
        animData,
        index,
        xScale: 256,
        yScale: 256,
        affineRotation,
        startedAffine,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "SwingConcave",
        affineMode: "double",
      };
    }
  }

  throw new Error("unreachable SwingConcave reducer state");
}

const VERTICAL_SLIDE_DURATION = 40;

/**
 * Source-order port of `Anim_VerticalSlide` / `VerticalSlide`
 * (`pokemon_animation.c:1156-1180`) on the normal opponent-front path.
 * The initializer sets data0=40 and invokes `VerticalSlide` immediately.
 * `Task_HandleMonAnimation` has already set `sDontFlip=TRUE`, so both
 * source-order `TryFlipX` calls execute without changing x2. Active ticks
 * 0..40 use C-truncated index arithmetic and write the negated sine to y2;
 * tick 41 observes the strict data2 > data0 guard, clears y2, installs
 * `WaitAnimEnd`, performs the final data2 increment, and executes the second
 * `TryFlipX` call.
 */
export function verticalSlideFrameAtTick(ticksSinceStart: number): VerticalSlideFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let x2 = 0;
  let y2 = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    x2 = tryFlipX(x2, true);
    if (data2 > VERTICAL_SLIDE_DURATION) {
      y2 = 0;
      data2 += 1;
      x2 = tryFlipX(x2, true);
      return {
        x2,
        y2,
        data0: VERTICAL_SLIDE_DURATION,
        data2,
        index: null,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "WaitAnimEnd",
      };
    }

    const index = Math.trunc((data2 * 384) / VERTICAL_SLIDE_DURATION) % 256;
    y2 = -gbaSin(index, 6) + 0;
    data2 += 1;
    x2 = tryFlipX(x2, true);

    if (tick === ticksSinceStart) {
      return {
        x2,
        y2,
        data0: VERTICAL_SLIDE_DURATION,
        data2,
        index,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "VerticalSlide",
      };
    }
  }

  throw new Error("unreachable VerticalSlide reducer state");
}

const VERTICAL_JUMPS_SMALL_AMPLITUDE = 3;
const VERTICAL_JUMPS_ACCUMULATOR_STEP = 12;
const VERTICAL_JUMPS_ACCUMULATOR_LIMIT = 384;

/**
 * Source-order port of `Anim_VerticalJumps_Small` / `VerticalJumps`
 * (`pokemon_animation.c:1181-1208,3768-3773`). The initializer sets data0=3
 * and invokes `VerticalJumps` immediately. Active ticks 0..32 preserve C's
 * signed division branch selection, counter adjustment, and the `u8` sine
 * argument conversion; branches 0/1 use data0*2 amplitude and branches 2/3
 * use data0*3. Tick 33 observes the strict counter > 384 guard, clears both
 * x2/y2, installs `WaitAnimEnd`, and still performs the final data2 += 12.
 */
export function verticalJumpsSmallFrameAtTick(
  ticksSinceStart: number,
): VerticalJumpsSmallFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let y2 = 0;
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const counter = data2;
    if (counter > VERTICAL_JUMPS_ACCUMULATOR_LIMIT) {
      data2 += VERTICAL_JUMPS_ACCUMULATOR_STEP;
      return {
        x2: 0,
        y2: 0,
        data0: VERTICAL_JUMPS_SMALL_AMPLITUDE,
        data2,
        counter,
        divCounter: null,
        adjustedCounter: null,
        sineIndex: null,
        amplitude: null,
        callback: "WaitAnimEnd",
      };
    }

    // C signed division truncates toward zero. The callback's reachable
    // counter is non-negative, but keep the source operation explicit.
    const divCounter = Math.trunc(counter / 128) as 0 | 1 | 2 | 3;
    const adjustedCounter = divCounter < 2 ? counter : counter - 256;
    const sineIndex = divCounter < 2 ? counter % 128 : adjustedCounter & 0xff;
    const amplitude = divCounter < 2
      ? VERTICAL_JUMPS_SMALL_AMPLITUDE * 2 as 6
      : VERTICAL_JUMPS_SMALL_AMPLITUDE * 3 as 9;
    y2 = -gbaSin(sineIndex, amplitude) + 0;
    data2 += VERTICAL_JUMPS_ACCUMULATOR_STEP;

    if (tick === ticksSinceStart) {
      return {
        x2: 0,
        y2,
        data0: VERTICAL_JUMPS_SMALL_AMPLITUDE,
        data2,
        counter,
        divCounter,
        adjustedCounter,
        sineIndex,
        amplitude,
        callback: "VerticalJumps",
      };
    }
  }

  throw new Error("unreachable VerticalJumps small reducer state");
}

const GROW_VIBRATE_DURATION = 40;

/**
 * Source-order port of `Anim_GrowVibrate`
 * (`pokemon_animation.c:1257-1284`) for the normal front-sprite path, where
 * `Task_HandleMonAnimation` sets `sDontFlip = TRUE`. Tick 0 performs
 * `HandleStartAffineAnim` before its first scale write. Active ticks 0..40
 * alternate sine amplitudes 32/8 after C-truncated index arithmetic; tick 41
 * observes the strict `data[2] > 40` guard, restores identity affine/normal
 * mode, installs `WaitAnimEnd`, and still performs the source's final
 * `data[2]++`.
 */
export function growVibrateFrameAtTick(ticksSinceStart: number): GrowVibrateFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let data4 = 0;
  let data5 = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const startedAffine = data2 === 0;
    if (data2 > GROW_VIBRATE_DURATION) {
      data2 += 1;
      return {
        x2: 0,
        y2: 0,
        data2,
        data4,
        data5,
        index: null,
        amplitude: null,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      };
    }

    const index = Math.trunc((data2 * 256) / GROW_VIBRATE_DURATION) % 256;
    const amplitude = data2 % 2 === 0 ? 32 : 8;
    data4 = gbaSin(index, amplitude) + 256;
    data5 = gbaSin(index, amplitude) + 256;
    data2 += 1;

    if (tick === ticksSinceStart) {
      return {
        x2: 0,
        y2: 0,
        data2,
        data4,
        data5,
        index,
        amplitude,
        xScale: data4,
        yScale: data5,
        startedAffine,
        callback: "Anim_GrowVibrate",
        affineMode: "double",
      };
    }
  }

  throw new Error("unreachable GrowVibrate reducer state");
}

const HORIZONTAL_SHAKE_ACCUMULATOR_STEP = 60;
const HORIZONTAL_SHAKE_ACCUMULATOR_LIMIT = 2304;
const HORIZONTAL_SHAKE_AMPLITUDE = 3;

/**
 * Source-order port of `Anim_HorizontalShake` / `HorizontalShake`
 * (`pokemon_animation.c:1343-1366`). The initializer sets data[0]=60 and
 * data[7]=3, invokes the callback once, then installs `HorizontalShake`.
 * Accumulators 0..2280 are active; tick 39 observes 2340 > 2304, clears x2,
 * and hands off to `WaitAnimEnd` before the final data[2] increment.
 */
export function horizontalShakeFrameAtTick(ticksSinceStart: number): HorizontalShakeFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let x2 = 0;
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const counter = data2;
    if (counter > HORIZONTAL_SHAKE_ACCUMULATOR_LIMIT) {
      data2 += HORIZONTAL_SHAKE_ACCUMULATOR_STEP;
      return {
        x2: 0,
        y2: 0,
        data0: HORIZONTAL_SHAKE_ACCUMULATOR_STEP,
        data2,
        data7: HORIZONTAL_SHAKE_AMPLITUDE,
        callback: "WaitAnimEnd",
      };
    }

    x2 = gbaSin(counter % 256, HORIZONTAL_SHAKE_AMPLITUDE);
    data2 += HORIZONTAL_SHAKE_ACCUMULATOR_STEP;
  }

  return {
    x2,
    y2: 0,
    data0: HORIZONTAL_SHAKE_ACCUMULATOR_STEP,
    data2,
    data7: HORIZONTAL_SHAKE_AMPLITUDE,
    callback: "HorizontalShake",
  };
}

const VERTICAL_SHAKE_ACCUMULATOR_STEP = 60;
const VERTICAL_SHAKE_ACCUMULATOR_LIMIT = 2304;

/**
 * Source-order port of `Anim_VerticalShake` / `VerticalShake`
 * (`pokemon_animation.c:1368-1391`). The initializer sets data[0]=60 and
 * immediately invokes `VerticalShake`, so tick 0 includes the accumulator-0
 * write. Accumulators 0..2280 are active; tick 39 observes 2340 > 2304,
 * clears y2, and hands off to `WaitAnimEnd`.
 */
export function verticalShakeFrameAtTick(ticksSinceStart: number): VerticalShakeFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let y2 = 0;
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const counter = data2;
    if (counter > VERTICAL_SHAKE_ACCUMULATOR_LIMIT) {
      data2 += VERTICAL_SHAKE_ACCUMULATOR_STEP;
      return {
        x2: 0,
        y2: 0,
        data0: VERTICAL_SHAKE_ACCUMULATOR_STEP,
        data2,
        callback: "WaitAnimEnd",
      };
    }

    y2 = gbaSin(counter % 256, 3);
    data2 += VERTICAL_SHAKE_ACCUMULATOR_STEP;
  }

  return {
    x2: 0,
    y2,
    data0: VERTICAL_SHAKE_ACCUMULATOR_STEP,
    data2,
    callback: "VerticalShake",
  };
}

function computeTerminalOffset(family: SpeciesFrontAnimFamily): SpeciesIdleOffset {
  switch (family) {
    case "GROW_VIBRATE": {
      const terminal = growVibrateFrameAtTick(41);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_GrowVibrate did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "H_SHAKE": {
      const terminal = horizontalShakeFrameAtTick(39);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_HorizontalShake did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "RAPID_H_HOPS": {
      let tick = 0;
      let last: SpeciesIdleOffset = { x2: 0, y2: 0 };
      for (;;) {
        const offset = rapidHorizontalHopsOffsetAtTick(tick);
        if (offset === null) return last;
        last = offset;
        tick += 1;
      }
    }
    case "SWING_CONCAVE": {
      const terminal = swingConcaveFrameAtTick(101);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_SwingConcave did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "V_JUMPS_SMALL": {
      const terminal = verticalJumpsSmallFrameAtTick(33);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalJumps_Small did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "V_SLIDE": {
      const terminal = verticalSlideFrameAtTick(41);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalSlide did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "V_SQUISH_AND_BOUNCE": {
      const terminal = verticalSquishBounceFrameAtTick(49);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalSquishBounce did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "V_SQUISH_AND_BOUNCE_SLOW": {
      const terminal = verticalSquishBounceSlowFrameAtTick(97);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalSquishBounce_Slow did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "V_STRETCH": {
      const terminal = verticalStretchFrameAtTick(41);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalStretch did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "V_SHAKE": {
      const terminal = verticalShakeFrameAtTick(39);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalShake did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
  }
}

const terminalOffsetCache = new Map<SpeciesFrontAnimFamily, SpeciesIdleOffset>();
function terminalOffsetForFamily(family: SpeciesFrontAnimFamily): SpeciesIdleOffset {
  let cached = terminalOffsetCache.get(family);
  if (cached === undefined) {
    cached = computeTerminalOffset(family);
    terminalOffsetCache.set(family, cached);
  }
  return cached;
}

/**
 * The settled (post-send-out, pre-any-other-mechanism) `x2`/`y2` residual
 * for `species`'s own FRONT sprite (opponent side only - the player's own
 * back sprite uses a completely separate table/function family,
 * `sSpeciesToBackAnimSet`/`BACK_ANIM_*`, not ported here). `null` if this
 * species' own front-anim family isn't ported yet.
 */
export function speciesFrontIdleRestOffset(species: string): SpeciesIdleOffset | null {
  const generatedFamily = generatedFrontAnimIds[species];
  if (!generatedFamily?.startsWith(FRONT_ANIM_PREFIX)) return null;
  const family = generatedFamily.slice(FRONT_ANIM_PREFIX.length) as SpeciesFrontAnimFamily;
  if (!PORTED_FRONT_FAMILIES.has(family)) return null;
  return terminalOffsetForFamily(family);
}
