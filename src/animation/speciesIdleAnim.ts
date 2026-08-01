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
  | "H_SHAKE"
  | "RAPID_H_HOPS"
  | "V_SQUISH_AND_BOUNCE"
  | "V_SQUISH_AND_BOUNCE_SLOW"
  | "V_STRETCH"
  | "V_SHAKE";

const FRONT_ANIM_PREFIX = "ANIM_";
const PORTED_FRONT_FAMILIES = new Set<SpeciesFrontAnimFamily>([
  "H_SHAKE",
  "RAPID_H_HOPS",
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
