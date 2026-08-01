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
  | "BOUNCE_ROTATE_TO_SIDES_SMALL"
  | "BOUNCE_ROTATE_TO_SIDES_SLOW"
  | "CIRCULAR_STRETCH_TWICE"
  | "GROW_VIBRATE"
  | "FLASH_YELLOW"
  | "H_JUMPS"
  | "H_SLIDE_SLOW"
  | "H_SLIDE_WOBBLE"
  | "H_STRETCH"
  | "H_VIBRATE"
  | "H_JUMPS_V_STRETCH"
  | "H_SHAKE"
  | "RAPID_H_HOPS"
  | "SHRINK_GROW"
  | "SWING_CONVEX"
  | "SWING_CONCAVE"
  | "V_JUMPS_SMALL"
  | "V_SLIDE"
  | "V_SLIDE_WOBBLE"
  | "V_SQUISH_AND_BOUNCE"
  | "V_SQUISH_AND_BOUNCE_SLOW"
  | "V_STRETCH"
  | "V_SHAKE"
  | "V_SHAKE_TWICE";

const FRONT_ANIM_PREFIX = "ANIM_";
const PORTED_FRONT_FAMILIES = new Set<SpeciesFrontAnimFamily>([
  "BOUNCE_ROTATE_TO_SIDES_SMALL",
  "BOUNCE_ROTATE_TO_SIDES_SLOW",
  "CIRCULAR_STRETCH_TWICE",
  "GROW_VIBRATE",
  "FLASH_YELLOW",
  "H_JUMPS",
  "H_SLIDE_SLOW",
  "H_SLIDE_WOBBLE",
  "H_STRETCH",
  "H_VIBRATE",
  "H_JUMPS_V_STRETCH",
  "H_SHAKE",
  "RAPID_H_HOPS",
  "SHRINK_GROW",
  "SWING_CONVEX",
  "SWING_CONCAVE",
  "V_JUMPS_SMALL",
  "V_SLIDE",
  "V_SLIDE_WOBBLE",
  "V_SQUISH_AND_BOUNCE",
  "V_SQUISH_AND_BOUNCE_SLOW",
  "V_STRETCH",
  "V_SHAKE",
  "V_SHAKE_TWICE",
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

/** All 10 source selector mappings for `ANIM_H_JUMPS_V_STRETCH`. */
export const H_JUMPS_V_STRETCH_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_JUMPS_V_STRETCH")
    .map(([species]) => species),
);

/** Every `ANIM_H_JUMPS_V_STRETCH` mapping is Factory-reachable. */
export const H_JUMPS_V_STRETCH_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_JUMPS_V_STRETCH_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no mappings for this family outside the Factory rental pool. */
export const H_JUMPS_V_STRETCH_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_JUMPS_V_STRETCH_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 9 source selector mappings for `ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW`. */
export const BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW")
    .map(([species]) => species),
);

/** Every normal slow bounce/rotate mapping is Factory-reachable. */
export const BOUNCE_ROTATE_TO_SIDES_SLOW_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no normal slow bounce/rotate mappings outside the Factory pool. */
export const BOUNCE_ROTATE_TO_SIDES_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] =
  Object.freeze(
    BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES.filter(
      (species) => !factoryFrontSpecies.has(species),
    ),
  );

/** All 8 source selector mappings for `ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL`. */
export const BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL")
    .map(([species]) => species),
);

/** Every small normal-speed bounce/rotate mapping is Factory-reachable. */
export const BOUNCE_ROTATE_TO_SIDES_SMALL_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no small normal-speed bounce/rotate mappings outside the Factory pool. */
export const BOUNCE_ROTATE_TO_SIDES_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] =
  Object.freeze(
    BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES.filter(
      (species) => !factoryFrontSpecies.has(species),
    ),
  );

/** All 8 source selector mappings for `ANIM_V_SHAKE_TWICE`. */
export const V_SHAKE_TWICE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_SHAKE_TWICE")
    .map(([species]) => species),
);

/** Every normal-speed vertical-shake-twice mapping is Factory-reachable. */
export const V_SHAKE_TWICE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SHAKE_TWICE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no normal-speed vertical-shake-twice mappings outside the Factory pool. */
export const V_SHAKE_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SHAKE_TWICE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 8 source selector mappings for the normal `ANIM_V_SLIDE_WOBBLE`. */
export const V_SLIDE_WOBBLE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_SLIDE_WOBBLE")
    .map(([species]) => species),
);

/** Every normal vertical-slide-wobble mapping is Factory-reachable. */
export const V_SLIDE_WOBBLE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SLIDE_WOBBLE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no normal vertical-slide-wobble mappings outside the Factory pool. */
export const V_SLIDE_WOBBLE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SLIDE_WOBBLE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 8 source selector mappings for `ANIM_H_SLIDE_WOBBLE`. */
export const H_SLIDE_WOBBLE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_SLIDE_WOBBLE")
    .map(([species]) => species),
);

/** Every horizontal-slide-wobble mapping is Factory-reachable. */
export const H_SLIDE_WOBBLE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SLIDE_WOBBLE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no horizontal-slide-wobble mappings outside the Factory pool. */
export const H_SLIDE_WOBBLE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SLIDE_WOBBLE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 8 source selector mappings for `ANIM_H_JUMPS`. */
export const H_JUMPS_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_JUMPS")
    .map(([species]) => species),
);

/** Every horizontal-jumps mapping is Factory-reachable. */
export const H_JUMPS_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_JUMPS_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no horizontal-jumps mappings outside the Factory pool. */
export const H_JUMPS_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_JUMPS_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 7 source selector mappings for the normal `ANIM_H_VIBRATE`. */
export const H_VIBRATE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_VIBRATE")
    .map(([species]) => species),
);

/** Every normal horizontal-vibrate mapping is Factory-reachable. */
export const H_VIBRATE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_VIBRATE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no normal horizontal-vibrate mappings outside the Factory pool. */
export const H_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_VIBRATE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 7 source selector mappings for the normal front `ANIM_H_STRETCH`. */
export const H_STRETCH_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_STRETCH")
    .map(([species]) => species),
);

/** Every normal horizontal-stretch mapping is Factory-reachable. */
export const H_STRETCH_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_STRETCH_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no normal horizontal-stretch mappings outside the Factory pool. */
export const H_STRETCH_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_STRETCH_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 7 source selector mappings for the palette-only `ANIM_FLASH_YELLOW`. */
export const FLASH_YELLOW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_FLASH_YELLOW")
    .map(([species]) => species),
);

/** Every yellow-flash mapping is reachable through Factory rentals. */
export const FLASH_YELLOW_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  FLASH_YELLOW_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no yellow-flash mappings outside the Factory rental pool. */
export const FLASH_YELLOW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  FLASH_YELLOW_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 7 source selector mappings for the slow `ANIM_H_SLIDE_SLOW`. */
export const H_SLIDE_SLOW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_SLIDE_SLOW")
    .map(([species]) => species),
);

/** Every slow horizontal-slide mapping is reachable through Factory rentals. */
export const H_SLIDE_SLOW_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SLIDE_SLOW_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no slow horizontal-slide mappings outside the Factory rental pool. */
export const H_SLIDE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SLIDE_SLOW_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 6 source selector mappings for `ANIM_CIRCULAR_STRETCH_TWICE`. */
export const CIRCULAR_STRETCH_TWICE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_CIRCULAR_STRETCH_TWICE")
    .map(([species]) => species),
);

/** Every circular-stretch-twice mapping is reachable through Factory rentals. */
export const CIRCULAR_STRETCH_TWICE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  CIRCULAR_STRETCH_TWICE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no circular-stretch-twice mappings outside the Factory rental pool. */
export const CIRCULAR_STRETCH_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  CIRCULAR_STRETCH_TWICE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 6 source selector mappings for the normal front `ANIM_SHRINK_GROW`. */
export const SHRINK_GROW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_SHRINK_GROW")
    .map(([species]) => species),
);

/** Every normal shrink/grow mapping is reachable through Factory rentals. */
export const SHRINK_GROW_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  SHRINK_GROW_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no normal shrink/grow mappings outside the Factory rental pool. */
export const SHRINK_GROW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  SHRINK_GROW_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 6 source selector mappings for the normal front `ANIM_SWING_CONVEX`. */
export const SWING_CONVEX_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_SWING_CONVEX")
    .map(([species]) => species),
);

/** The four normal SwingConvex mappings reachable through Factory rentals. */
export const SWING_CONVEX_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  SWING_CONVEX_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** The two source mappings absent from the Factory rental pool. */
export const SWING_CONVEX_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  SWING_CONVEX_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

export interface SpeciesIdleOffset {
  readonly x2: number;
  readonly y2: number;
}

function gbaSin(index: number, amplitude: number): number {
  const v = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((amplitude * v) / 256);
}

function gbaCos(index: number, amplitude: number): number {
  return gbaSin(index + 64, amplitude);
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

export type VerticalShakeTwiceTableEntry = readonly [amplitude: number, duration: number];

/**
 * Complete `sVerticalShakeData` table (`pokemon_animation.c:622-628`) after
 * its source `u8` storage conversions. Thus -2 and -1 are 254 and 255.
 */
export const VERTICAL_SHAKE_TWICE_DATA: readonly VerticalShakeTwiceTableEntry[] = Object.freeze([
  [6, 30],
  [254, 15],
  [6, 30],
  [255, 0],
] as const);

/**
 * The accepted normal initializer uses data0=48. The data0=24 initializer is
 * the distinct, source-labelled unused `ANIM_V_SHAKE_TWICE_SLOW` selector;
 * it is recorded here for distinction only and is not a ported front family.
 */
export const VERTICAL_SHAKE_TWICE_INITIALIZERS = Object.freeze({
  normal: Object.freeze({ selector: "ANIM_V_SHAKE_TWICE", data0: 48, used: true }),
  slow: Object.freeze({ selector: "ANIM_V_SHAKE_TWICE_SLOW", data0: 24, used: false }),
} as const);

/** Data slots explicitly zeroed by `Task_HandleMonAnimation` before dispatch. */
export const TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES = Object.freeze([
  0, 2, 3, 4, 5, 6, 7,
] as const);

export interface VerticalShakeTwiceFrame extends SpeciesIdleOffset {
  readonly data0: 48;
  readonly data2: number;
  readonly data3: 0;
  readonly data4: 0;
  readonly data5: number;
  readonly data6: number;
  readonly data7: 0;
  readonly index: number;
  readonly var5: number;
  readonly var6: number;
  readonly var7: number;
  readonly amplitude: number;
  readonly callback: "VerticalShakeTwice" | "WaitAnimEnd";
}

/**
 * The Small initializer is a source sibling that shares `VerticalSlideWobble`
 * but is not accepted by this rung. Its selector mappings therefore remain
 * outside `PORTED_FRONT_FAMILIES`.
 */
export const VERTICAL_SLIDE_WOBBLE_INITIALIZERS = Object.freeze({
  normal: Object.freeze({ selector: "ANIM_V_SLIDE_WOBBLE", data0: 10, accepted: true }),
  small: Object.freeze({ selector: "ANIM_V_SLIDE_WOBBLE_SMALL", data0: 5, accepted: false }),
} as const);

export interface VerticalSlideWobbleFrame extends SpeciesIdleOffset {
  readonly data0: 10;
  readonly data2: number;
  readonly index: number | null;
  readonly varBeforeMask: number | null;
  readonly wobbleIndex: number | null;
  readonly rotationSigned: number;
  readonly affineRotation: number;
  readonly xScale: 256;
  readonly yScale: 256;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "VerticalSlideWobble" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export interface HorizontalSlideWobbleFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2: number;
  readonly index: number | null;
  readonly varBeforeMask: number | null;
  readonly wobbleIndex: number | null;
  readonly rotationSigned: number;
  readonly affineRotation: number;
  readonly xScale: 256;
  readonly yScale: 256;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "HorizontalSlideWobble" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

/**
 * The three initializers share `HorizontalSlide`, but selector acceptance is
 * per family. This rung accepts only the slow data0=80 front initializer.
 */
export const HORIZONTAL_SLIDE_INITIALIZERS = Object.freeze({
  slow: Object.freeze({ selector: "ANIM_H_SLIDE_SLOW", data0: 80, accepted: true }),
  normal: Object.freeze({ selector: "ANIM_H_SLIDE", data0: 40, accepted: false }),
  fast: Object.freeze({ selector: "ANIM_H_SLIDE_FAST", data0: 20, accepted: false }),
} as const);

export interface HorizontalSlideFrame extends SpeciesIdleOffset {
  readonly data0: 80;
  readonly data2: number;
  readonly index: number | null;
  readonly amplitude: 6;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly callback: "HorizontalSlide" | "WaitAnimEnd";
}

export interface CircularStretchTwiceFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2: number;
  readonly data4: number;
  readonly data5: number;
  readonly index: number | null;
  readonly xScale: number;
  readonly yScale: number;
  readonly affineRotation: 0;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Anim_CircularStretchTwice" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

/**
 * The three selectors share `ShrinkGrow`, but their initializers establish
 * different run counts or phase steps. Only the normal front selector is
 * accepted by this rung; FAST and SLOW remain independently unaccepted.
 */
export const SHRINK_GROW_INITIALIZERS = Object.freeze({
  normal: Object.freeze({
    selector: "ANIM_SHRINK_GROW", data6: 8, data7: 3, accepted: true,
  }),
  fast: Object.freeze({
    selector: "ANIM_SHRINK_GROW_FAST", data6: 8, data7: 5, accepted: false,
  }),
  slow: Object.freeze({
    selector: "ANIM_SHRINK_GROW_SLOW", data6: 4, data7: 3, accepted: false,
  }),
} as const);

export interface ShrinkGrowFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2: number;
  readonly data4: number;
  readonly data6: 8;
  readonly data7: 3;
  readonly phaseIndex: number | null;
  readonly yScaleBeforePosition: number | null;
  readonly posY: number | null;
  readonly xScale: number;
  readonly yScale: number;
  readonly affineRotation: 0;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Anim_ShrinkGrow" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export interface HorizontalJumpsFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2: number;
  readonly counter: number;
  readonly divCounter: 0 | 1 | 2 | 3 | null;
  readonly remainder: number | null;
  readonly sineIndex: number | null;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly callback: "Anim_HorizontalJumps" | "WaitAnimEnd";
}

/**
 * The adjacent amplitude-only callbacks are distinct selectors. This rung
 * accepts the normal amplitude-6 family only; Fast and Fastest remain named
 * here so they cannot be mistaken for covered aliases.
 */
export const HORIZONTAL_VIBRATE_VARIANTS = Object.freeze({
  normal: Object.freeze({ selector: "ANIM_H_VIBRATE", amplitude: 6, accepted: true }),
  fast: Object.freeze({ selector: "ANIM_H_VIBRATE_FAST", amplitude: 9, accepted: false }),
  fastest: Object.freeze({ selector: "ANIM_H_VIBRATE_FASTEST", amplitude: 12, accepted: false }),
} as const);

export interface HorizontalVibrateFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2: number;
  readonly counter: number;
  readonly index: number | null;
  readonly sign: 1 | -1 | null;
  readonly amplitude: 6;
  readonly callback: "Anim_HorizontalVibrate" | "WaitAnimEnd";
}

/**
 * The back-sprite selectors share only a name prefix with this front callback;
 * their `HorizontalStretchFar` implementation is a distinct source family.
 */
export const HORIZONTAL_STRETCH_VARIANTS = Object.freeze({
  front: Object.freeze({ selector: "ANIM_H_STRETCH", accepted: true }),
  far: Object.freeze({ selector: "ANIM_H_STRETCH_FAR", accepted: false }),
  farTwice: Object.freeze({ selector: "ANIM_H_STRETCH_FAR_TWICE", accepted: false }),
  farSlow: Object.freeze({ selector: "ANIM_H_STRETCH_FAR_SLOW", accepted: false }),
} as const);

export interface HorizontalStretchFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2: number;
  readonly data4: number;
  readonly data5: number;
  readonly data7: number;
  readonly index1: number | null;
  readonly index2: number | null;
  readonly xScale: number;
  readonly yScale: number;
  readonly affineRotation: 0;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Anim_HorizontalStretch" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export type YellowFlashTableEntry = readonly [flashYellow: boolean, duration: number];

/** Exact `sYellowFlashData` rows, excluding the source's `{FALSE, (u8)-1}` sentinel. */
export const YELLOW_FLASH_DATA: readonly YellowFlashTableEntry[] = Object.freeze([
  [false, 5], [true, 1], [false, 15], [true, 4],
  [false, 2], [true, 2], [false, 2], [true, 2],
  [false, 2], [true, 2], [false, 2], [true, 2], [false, 2],
] as const);

export interface FlashYellowFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2: number;
  readonly data4: number;
  readonly data5: number;
  readonly data6: number;
  readonly data7: number;
  readonly tableFlashYellow: boolean | null;
  readonly tableDuration: number | null;
  readonly paletteNum: number;
  readonly paletteStart: number;
  readonly paletteCount: 16;
  readonly blendCoefficient: 0 | 16;
  readonly blendColor: 0x03ff;
  readonly paletteWrite: boolean;
  readonly callback: "Anim_FlashYellow" | "WaitAnimEnd";
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

export interface SwingFrame<Callback extends "SwingConcave" | "SwingConvex">
  extends SpeciesIdleOffset {
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
  readonly callback: Callback | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export type SwingConcaveFrame = SwingFrame<"SwingConcave">;
export type SwingConvexFrame = SwingFrame<"SwingConvex">;

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

export interface HorizontalJumpsVerticalStretchFrame extends SpeciesIdleOffset {
  readonly data2: number;
  readonly data3: number;
  readonly data4: number;
  readonly animRotation: 0;
  readonly animDelay: 0;
  readonly animRuns: 1;
  readonly animSpeed: 0;
  readonly animData: -1;
  readonly counter: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback:
    | "HorizontalJumpsVerticalStretch_0"
    | "HorizontalJumpsVerticalStretch_1"
    | "HorizontalJumpsVerticalStretch_2"
    | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

const SWING_CONCAVE_DURATION = 100;

/**
 * The normal, fast, and unused fast-short selectors all share `SwingConvex`.
 * This rung accepts only the normal single-run duration-100 initializer.
 */
export const SWING_CONVEX_INITIALIZERS = Object.freeze({
  normal: Object.freeze({
    selector: "ANIM_SWING_CONVEX", data: 100, runs: 1, accepted: true,
  }),
  fast: Object.freeze({
    selector: "ANIM_SWING_CONVEX_FAST", data: 50, runs: 2, accepted: false,
  }),
  fastShort: Object.freeze({
    selector: "ANIM_SWING_CONVEX_FAST_SHORT",
    data: 50,
    runs: 1,
    unused: true,
    accepted: false,
  }),
} as const);

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
function swingFrameAtTick<Callback extends "SwingConcave" | "SwingConvex">(
  ticksSinceStart: number,
  callback: Callback,
  rotationSign: 1 | -1,
): SwingFrame<Callback> | null {
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
    const affineRotation = rotationSign * gbaSin(index, 3276) + 0;
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
        callback,
        affineMode: "double",
      };
    }
  }

  throw new Error(`unreachable ${callback} reducer state`);
}

export function swingConcaveFrameAtTick(ticksSinceStart: number): SwingConcaveFrame | null {
  return swingFrameAtTick(ticksSinceStart, "SwingConcave", 1);
}

/**
 * Source-order port of the normal `Anim_SwingConvex` initializer and shared
 * `SwingConvex` lifecycle (`pokemon_animation.c:1038-1059,2552-2589,
 * 3855-3871`) on the normal opponent-front path. It reuses the exact swing
 * callback reducer accepted for `SwingConcave`; only the affine rotation
 * write changes sign. Tick 0 starts affine mode, ticks 0..100 are active, and
 * tick 101 restores identity/x2, resets the sprite, installs `WaitAnimEnd`,
 * and performs the callback's final data2 increment.
 */
export function swingConvexFrameAtTick(ticksSinceStart: number): SwingConvexFrame | null {
  return swingFrameAtTick(ticksSinceStart, "SwingConvex", -1);
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

/**
 * Source-order port of the single-run `Anim_HorizontalJumpsVerticalStretch`
 * initializer and callbacks `_0`/`_1`/`_2`
 * (`pokemon_animation.c:1037-1059,2755-2868`). `AddNewAnim` establishes
 * rotation=0, delay=0, runs=1, speed=0, data=0 before this initializer changes
 * only data to -1. This is intentionally distinct from the `_Twice`
 * initializer at lines 3805-3815, which instead selects data=1/runs=2.
 *
 * `Task_HandleMonAnimation` has set `sDontFlip=TRUE` for the normal opponent
 * front sprite, so every source-order `TryFlipX` call executes without changing
 * x2. Tick 0 starts affine mode and immediately invokes callback `_0`; callback
 * transitions and strict guards are represented exactly, including their data2
 * resets and the terminal `_2` increment after `ResetSpriteAfterAnim`.
 */
export function horizontalJumpsVerticalStretchFrameAtTick(
  ticksSinceStart: number,
): HorizontalJumpsVerticalStretchFrame | null {
  if (ticksSinceStart < 0) return null;

  // `InitAnimData` defaults, followed by the single-run initializer override.
  const animRotation = 0;
  let animDelay = 0;
  const animRuns = 1;
  const animSpeed = 0;
  const animData = -1;
  let data2 = 0;
  let data3 = 0;
  let data4 = 0;
  let x2 = 0;
  let y2 = 0;
  let xScale = 256;
  let yScale = 256;
  let callback: HorizontalJumpsVerticalStretchFrame["callback"] =
    "HorizontalJumpsVerticalStretch_0";

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const startedAffine = tick === 0;
    let counter = data2;
    let resetSpriteAfterAnim = false;

    if (callback === "HorizontalJumpsVerticalStretch_0") {
      if (animDelay !== 0) {
        animDelay -= 1;
      } else {
        x2 = tryFlipX(x2, true);
        counter = data2;
        if (data2 > 128) {
          data2 = 0;
          callback = "HorizontalJumpsVerticalStretch_1";
        } else {
          const value = 8 * animData;
          // C `s16` has no negative zero; normalize JS's `Math.trunc(-0)`.
          x2 = Math.trunc((value * (counter % 128)) / 128) + 0;
          y2 = -gbaSin(counter % 128, 8) + 0;
          data2 += 12;
        }
        x2 = tryFlipX(x2, true);
      }
    } else if (callback === "HorizontalJumpsVerticalStretch_1") {
      x2 = tryFlipX(x2, true);
      counter = data2;
      if (data2 > 48) {
        xScale = 256;
        yScale = 256;
        y2 = 0;
        data2 = 0;
        callback = "HorizontalJumpsVerticalStretch_2";
      } else {
        yScale = gbaSin(data4, 64) + 256;
        if (data2 >= 16 && data2 <= 31) {
          data3 += 8;
          x2 -= animData;
        }

        const yDelta = yScale > 256 ? Math.trunc((256 - yScale) / 8) : 0;
        y2 = -gbaSin(data3, 20) - yDelta + 0;
        xScale = 256 - gbaSin(data4, 32);
        data2 += 1;
        data4 = (data4 + 8) & 0xff;
      }
      x2 = tryFlipX(x2, true);
    } else if (callback === "HorizontalJumpsVerticalStretch_2") {
      x2 = tryFlipX(x2, true);
      counter = data2;
      if (counter > 128) {
        // `animRuns` is the AddNewAnim default 1, so the repeat branch used by
        // `_Twice` is unreachable for this family.
        resetSpriteAfterAnim = true;
        callback = "WaitAnimEnd";
        x2 = 0;
        y2 = 0;
      } else {
        x2 = Math.trunc((animData * ((counter % 128) * 8)) / 128) + 8 * -animData;
        y2 = -gbaSin(counter % 128, 8) + 0;
      }
      data2 += 12;
      x2 = tryFlipX(x2, true);
    }

    if (tick === ticksSinceStart || callback === "WaitAnimEnd") {
      return {
        x2,
        y2,
        data2,
        data3,
        data4,
        animRotation,
        animDelay: 0,
        animRuns,
        animSpeed,
        animData,
        counter,
        xScale,
        yScale,
        startedAffine,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim,
        callback,
        affineMode: resetSpriteAfterAnim ? "normal" : "double",
      };
    }
  }

  throw new Error("unreachable HorizontalJumpsVerticalStretch reducer state");
}

export type BounceRotateToSidesTableEntry = readonly [
  startX: number,
  endX: number,
  duration: number,
];

/**
 * Complete source table from `sBounceRotateToSidesData`
 * (`pokemon_animation.c:1915-1937`). Index 0 is the normal-speed table and
 * index 1 the slow table selected by `sprite->data[6] = 1`.
 */
export const BOUNCE_ROTATE_TO_SIDES_DATA: readonly (
  readonly BounceRotateToSidesTableEntry[]
)[] = Object.freeze([
  Object.freeze([
    [0, 8, 8], [8, -8, 12], [-8, 8, 12], [8, -8, 12],
    [-8, 8, 12], [8, -8, 12], [-8, 0, 12], [0, 0, 0],
  ] as const),
  Object.freeze([
    [0, 8, 16], [8, -8, 24], [-8, 8, 24], [8, -8, 24],
    [-8, 8, 24], [8, -8, 24], [-8, 0, 24], [0, 0, 0],
  ] as const),
]);

/**
 * Source initializer distinctions. In particular, the requested normal Slow
 * family reaches `Anim_BounceRotateToSides` and therefore uses rotation 4096;
 * rotation 2048 belongs to the Small/SmallSlow sibling initializer.
 */
export const BOUNCE_ROTATE_TO_SIDES_VARIANTS = Object.freeze({
  normal: Object.freeze({ data6: 0, rotation: 4096 }),
  small: Object.freeze({ data6: 0, rotation: 2048 }),
  slow: Object.freeze({ data6: 1, rotation: 4096 }),
  smallSlow: Object.freeze({ data6: 1, rotation: 2048 }),
} as const);

export interface BounceRotateToSidesFrame extends SpeciesIdleOffset {
  readonly data2: number;
  readonly data3: number;
  readonly data4: number;
  readonly data6: number;
  readonly animRotation: number;
  readonly animDelay: number;
  readonly animRuns: number;
  readonly animSpeed: number;
  readonly animData: number;
  readonly legIndex: number;
  readonly legStartX: number;
  readonly legEndX: number;
  readonly legDuration: number;
  readonly legProgress: number;
  readonly affineRotationU16: number;
  readonly xScale: 256;
  readonly yScale: 256;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "BounceRotateToSides" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

function bounceRotateToSidesFrameAtTick(
  ticksSinceStart: number,
  variant: (typeof BOUNCE_ROTATE_TO_SIDES_VARIANTS)[keyof typeof BOUNCE_ROTATE_TO_SIDES_VARIANTS],
): BounceRotateToSidesFrame | null {
  if (ticksSinceStart < 0) return null;

  // `AddNewAnim`/`InitAnimData` defaults, followed in source order by the
  // selected initializer's rotation and slow-table overrides.
  const animDelay = 0;
  const animRuns = 1;
  const animSpeed = 0;
  const data6 = variant.data6;
  const animRotation = variant.rotation;
  const animData = data6;
  let data2 = 0;
  let data3 = 0;
  let data4 = 0;
  let x2 = 0;
  let y2 = 0;
  let affineRotationU16 = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const startedAffine = data2 === 0;
    const legIndex = data4;
    const [legStartX, legEndX, legDuration] = BOUNCE_ROTATE_TO_SIDES_DATA[animData]![
      legIndex
    ]!;
    const legProgress = data3;

    // Both source-order `TryFlipX` calls are no-ops because the ordinary
    // opponent-front task set `sDontFlip=TRUE` before dispatch.
    if (data2 === 0) data2 += 1;

    if (legDuration === 0) {
      affineRotationU16 = 0;
      x2 = 0;
      y2 = 0;
      return {
        x2,
        y2,
        data2,
        data3,
        data4,
        data6,
        animRotation,
        animDelay,
        animRuns,
        animSpeed,
        animData,
        legIndex,
        legStartX,
        legEndX,
        legDuration,
        legProgress,
        affineRotationU16,
        xScale: 256,
        yScale: 256,
        startedAffine,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      };
    }

    const deltaX = legEndX - legStartX;
    // The interpolation is signed C arithmetic: division truncates toward
    // zero, including the alternating negative-delta legs.
    y2 = -gbaSin(Math.trunc((legProgress * 128) / legDuration), 10) + 0;
    x2 = Math.trunc((deltaX * legProgress) / legDuration) + legStartX;
    // The C destination is `u16`: perform signed division first, then wrap.
    affineRotationU16 = Math.trunc((-(animRotation * x2)) / 8) & 0xffff;

    if (legProgress === legDuration) {
      data4 += 1;
      data3 = 0;
    } else {
      data3 += 1;
    }

    if (tick === ticksSinceStart) {
      return {
        x2,
        y2,
        data2,
        data3,
        data4,
        data6,
        animRotation,
        animDelay,
        animRuns,
        animSpeed,
        animData,
        legIndex,
        legStartX,
        legEndX,
        legDuration,
        legProgress,
        affineRotationU16,
        xScale: 256,
        yScale: 256,
        startedAffine,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "BounceRotateToSides",
        affineMode: "double",
      };
    }
  }

  throw new Error("unreachable BounceRotateToSides reducer state");
}

/**
 * Exact source-order normal `Anim_BounceRotateToSides_Slow` lifecycle:
 * initializer -> normal rotation-4096 initializer -> shared callback. Active
 * ticks are 0..166; tick 167 consumes the zero-duration sentinel and performs
 * identity/x2/y2/`ResetSpriteAfterAnim`/`WaitAnimEnd` cleanup.
 */
export function bounceRotateToSidesSlowFrameAtTick(
  ticksSinceStart: number,
): BounceRotateToSidesFrame | null {
  return bounceRotateToSidesFrameAtTick(ticksSinceStart, BOUNCE_ROTATE_TO_SIDES_VARIANTS.slow);
}

/**
 * Exact source-order `Anim_BounceRotateToSides_Small` lifecycle. `AddNewAnim`
 * leaves `data6`/animation data at zero, the initializer selects rotation
 * 2048, and the shared callback consumes the normal-speed seven-leg table.
 * Active ticks are 0..86; tick 87 consumes the zero-duration sentinel.
 */
export function bounceRotateToSidesSmallFrameAtTick(
  ticksSinceStart: number,
): BounceRotateToSidesFrame | null {
  return bounceRotateToSidesFrameAtTick(ticksSinceStart, BOUNCE_ROTATE_TO_SIDES_VARIANTS.small);
}

/** Source sibling retained explicitly: small rotation with the slow table. */
export function bounceRotateToSidesSmallSlowFrameAtTick(
  ticksSinceStart: number,
): BounceRotateToSidesFrame | null {
  return bounceRotateToSidesFrameAtTick(
    ticksSinceStart,
    BOUNCE_ROTATE_TO_SIDES_VARIANTS.smallSlow,
  );
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

function toU8(value: number): number {
  return value & 0xff;
}

/**
 * Source-order port of `Anim_VerticalShakeTwice` / `VerticalShakeTwice`
 * (`pokemon_animation.c:622-628,911-939,1638-1678`). The normal front task
 * first clears data0 and data2..data7, then the initializer sets data0=48 and
 * immediately invokes the callback. Every callback reads data2/data6 and the
 * table bytes through the source's `u8` conversions before calculating the
 * decaying amplitude and GBA sine write.
 *
 * Ticks 0..30, 31..46, and 47..77 are the complete 31/16/31 active table
 * phases. Each phase boundary writes y2 first, increments data5, and resets
 * data6 without advancing data2. Tick 78 reads the 255/0 sentinel and performs
 * y2=0/WaitAnimEnd cleanup. The compiled `__divsi3` returns zero for the
 * sentinel's source-order 0/0 amplitude expression before that cleanup.
 */
export function verticalShakeTwiceFrameAtTick(
  ticksSinceStart: number,
): VerticalShakeTwiceFrame | null {
  if (ticksSinceStart < 0) return null;

  const data0 = VERTICAL_SHAKE_TWICE_INITIALIZERS.normal.data0;
  let data2 = 0;
  const data3 = 0;
  const data4 = 0;
  let data5 = 0;
  let data6 = 0;
  const data7 = 0;
  let y2 = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const index = toU8(data2);
    const var7 = toU8(data6);
    const tableEntry = VERTICAL_SHAKE_TWICE_DATA[data5];
    if (tableEntry === undefined) {
      throw new Error(`VerticalShakeTwice table index ${data5} is out of range`);
    }
    const var5 = toU8(tableEntry[0]);
    const var6 = toU8(tableEntry[1]);
    let amplitude = 0;

    if (var5 !== 254) {
      // The ROM's compiled `__divsi3` returns 0 for the terminal 0/0 case.
      amplitude = var6 === 0
        ? 0
        : toU8(Math.trunc(((var6 - var7) * var5) / var6));
    }

    if (var5 === 255) {
      y2 = 0;
      return {
        x2: 0,
        y2,
        data0,
        data2,
        data3,
        data4,
        data5,
        data6,
        data7,
        index,
        var5,
        var6,
        var7,
        amplitude,
        callback: "WaitAnimEnd",
      };
    }

    // C's s16 has no signed-zero representation.
    y2 = gbaSin(index, amplitude) + 0;
    if (var7 === var6) {
      data5 += 1;
      data6 = 0;
    } else {
      data2 += data0;
      data6 += 1;
    }

    if (tick === ticksSinceStart) {
      return {
        x2: 0,
        y2,
        data0,
        data2,
        data3,
        data4,
        data5,
        data6,
        data7,
        index,
        var5,
        var6,
        var7,
        amplitude,
        callback: "VerticalShakeTwice",
      };
    }
  }

  throw new Error("unreachable VerticalShakeTwice reducer state");
}

function toU16(value: number): number {
  return value & 0xffff;
}

interface SlideWobbleCoreFrame {
  readonly offset: number;
  readonly data2: number;
  readonly index: number | null;
  readonly varBeforeMask: number | null;
  readonly wobbleIndex: number | null;
  readonly rotationSigned: number;
  readonly affineRotation: number;
  readonly startedAffine: boolean;
  readonly resetSpriteAfterAnim: boolean;
  readonly waiting: boolean;
  readonly affineMode: "double" | "normal";
}

/** Shared source arithmetic used by both slide-wobble callbacks. */
function slideWobbleCoreFrameAtTick(
  ticksSinceStart: number,
  amplitude: number,
): SlideWobbleCoreFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const startedAffine = data2 === 0;
    if (data2 > 100) {
      data2 += 1;
      return {
        offset: 0,
        data2,
        index: null,
        varBeforeMask: null,
        wobbleIndex: null,
        rotationSigned: 0,
        affineRotation: 0,
        startedAffine: false,
        resetSpriteAfterAnim: true,
        waiting: true,
        affineMode: "normal",
      };
    }

    const index = Math.trunc((data2 * 256) / 100);
    const varBeforeMask = Math.trunc((data2 * 512) / 100);
    const wobbleIndex = varBeforeMask & 0xff;
    const offset = gbaSin(index, amplitude) + 0;
    const rotationSigned = gbaSin(wobbleIndex, 3276);
    const affineRotation = toU16(rotationSigned);
    data2 += 1;

    if (tick === ticksSinceStart) {
      return {
        offset,
        data2,
        index,
        varBeforeMask,
        wobbleIndex,
        rotationSigned,
        affineRotation,
        startedAffine,
        resetSpriteAfterAnim: false,
        waiting: false,
        affineMode: "double",
      };
    }
  }

  throw new Error("unreachable slide-wobble reducer state");
}

/**
 * Source-order port of `Anim_VerticalSlideWobble` / `VerticalSlideWobble`
 * (`pokemon_animation.c:911-939,984-1028,1735-1766`). The front-animation
 * task has zeroed data0/data2..data7 and set `sDontFlip=TRUE`; the normal
 * initializer then sets data0=10 and immediately calls the shared callback.
 *
 * Tick 0 starts affine mode before the first writes. Ticks 0..100 use C
 * truncation for both integer indices, mask the doubled wobble index to u8,
 * write GBA sine y2, and cross the signed-s16 `Sin` result into the u16
 * `HandleSetAffineData` rotation parameter without opponent-front flipping.
 * Tick 101 restores identity affine/y2, calls `ResetSpriteAfterAnim`, installs
 * `WaitAnimEnd`, and still performs the source's final data2 increment.
 */
export function verticalSlideWobbleFrameAtTick(
  ticksSinceStart: number,
): VerticalSlideWobbleFrame | null {
  const data0 = VERTICAL_SLIDE_WOBBLE_INITIALIZERS.normal.data0;
  const core = slideWobbleCoreFrameAtTick(ticksSinceStart, data0);
  if (core === null) return null;
  return {
    x2: 0,
    y2: core.offset,
    data0,
    data2: core.data2,
    index: core.index,
    varBeforeMask: core.varBeforeMask,
    wobbleIndex: core.wobbleIndex,
    rotationSigned: core.rotationSigned,
    affineRotation: core.affineRotation,
    xScale: 256,
    yScale: 256,
    startedAffine: core.startedAffine,
    normalFrontDontFlip: true,
    resetSpriteAfterAnim: core.resetSpriteAfterAnim,
    callback: core.waiting ? "WaitAnimEnd" : "VerticalSlideWobble",
    affineMode: core.affineMode,
  };
}

/**
 * Source-order port of `Anim_HorizontalSlide_Slow` and `HorizontalSlide`
 * (`pokemon_animation.c:911-939,1131-1153,3665-3669`). The front task
 * zeroes data2 and sets `sDontFlip=TRUE`; the slow initializer sets data0=80
 * and immediately runs the shared callback. Ticks 0..80 perform both no-op
 * `TryFlipX` calls, write the C-truncated sine index/x2, and increment data2.
 * Tick 81 clears x2, installs `WaitAnimEnd`, increments data2 to 82, and
 * performs the second no-op flip.
 */
export function horizontalSlideSlowFrameAtTick(
  ticksSinceStart: number,
): HorizontalSlideFrame | null {
  if (ticksSinceStart < 0) return null;

  const data0 = HORIZONTAL_SLIDE_INITIALIZERS.slow.data0;
  if (ticksSinceStart > data0) {
    return {
      x2: 0,
      y2: 0,
      data0,
      data2: data0 + 2,
      index: null,
      amplitude: 6,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      callback: "WaitAnimEnd",
    };
  }

  const data2BeforeIncrement = ticksSinceStart;
  const index = Math.trunc((data2BeforeIncrement * 384) / data0) % 256;
  return {
    x2: gbaSin(index, 6),
    y2: 0,
    data0,
    data2: data2BeforeIncrement + 1,
    index,
    amplitude: 6,
    normalFrontDontFlip: true,
    tryFlipXCalls: 2,
    callback: "HorizontalSlide",
  };
}

const CIRCULAR_STRETCH_TWICE_DURATION = 40;

/**
 * Source-order port of `Anim_CircularStretchTwice`
 * (`pokemon_animation.c:911-939,1087-1109`) on the opponent-front path.
 * `Task_HandleMonAnimation` zeroes data0/data2..data7 and sets
 * `sDontFlip=TRUE`. Tick 0 enters affine mode before its first write. Active
 * ticks 0..40 use C-truncated division before the `% 256`, store the GBA
 * sine/cosine scales in data4/data5, and write them without front-side
 * negation. Tick 41 writes identity affine, resets the sprite to normal
 * affine mode, installs `WaitAnimEnd`, and still increments data2 to 42.
 */
export function circularStretchTwiceFrameAtTick(
  ticksSinceStart: number,
): CircularStretchTwiceFrame | null {
  if (ticksSinceStart < 0) return null;

  if (ticksSinceStart > CIRCULAR_STRETCH_TWICE_DURATION) {
    return {
      x2: 0,
      y2: 0,
      data0: 0,
      data2: CIRCULAR_STRETCH_TWICE_DURATION + 2,
      data4: 256,
      data5: 288,
      index: null,
      xScale: 256,
      yScale: 256,
      affineRotation: 0,
      startedAffine: false,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    };
  }

  const data2BeforeIncrement = ticksSinceStart;
  const index = Math.trunc(
    (data2BeforeIncrement * 512) / CIRCULAR_STRETCH_TWICE_DURATION,
  ) % 256;
  const data4 = gbaSin(index, 32) + 256;
  const data5 = gbaCos(index, 32) + 256;
  return {
    x2: 0,
    y2: 0,
    data0: 0,
    data2: data2BeforeIncrement + 1,
    data4,
    data5,
    index,
    xScale: data4,
    yScale: data5,
    affineRotation: 0,
    startedAffine: data2BeforeIncrement === 0,
    normalFrontDontFlip: true,
    resetSpriteAfterAnim: false,
    callback: "Anim_CircularStretchTwice",
    affineMode: "double",
  };
}

const SHRINK_GROW_NORMAL_ACTIVE_LIMIT =
  Math.trunc(128 / SHRINK_GROW_INITIALIZERS.normal.data6)
  * SHRINK_GROW_INITIALIZERS.normal.data7;

/**
 * Source-order port of the normal `Anim_ShrinkGrow` initializer and shared
 * `ShrinkGrow` callback (`pokemon_animation.c:911-939,1878-1912`) on the
 * opponent-front path. `Task_HandleMonAnimation` zeroes data0/data2..data7
 * and sets `sDontFlip=TRUE`. Tick 0 starts affine mode and installs the normal
 * `(data6,data7)=(8,3)` parameters before entering `ShrinkGrow`. Active ticks
 * 0..48 use the exact GBA sine table, C signed division for the positive-sine
 * vertical compensation, and u8-masked phase advance. Tick 49 observes the
 * strict limit, restores identity and y2=0, resets the affine state, and
 * installs `WaitAnimEnd` without incrementing data2 or data4.
 */
export function shrinkGrowFrameAtTick(ticksSinceStart: number): ShrinkGrowFrame | null {
  if (ticksSinceStart < 0) return null;

  const data6 = SHRINK_GROW_INITIALIZERS.normal.data6;
  const data7 = SHRINK_GROW_INITIALIZERS.normal.data7;
  if (ticksSinceStart > SHRINK_GROW_NORMAL_ACTIVE_LIMIT) {
    const activeCallbacks = SHRINK_GROW_NORMAL_ACTIVE_LIMIT + 1;
    return {
      x2: 0,
      y2: 0,
      data0: 0,
      data2: activeCallbacks,
      data4: (activeCallbacks * data6) & 0xff,
      data6,
      data7,
      phaseIndex: null,
      yScaleBeforePosition: null,
      posY: null,
      xScale: 256,
      yScale: 256,
      affineRotation: 0,
      startedAffine: false,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    };
  }

  const phaseIndex = (ticksSinceStart * data6) & 0xff;
  const yScaleBeforePosition = gbaSin(phaseIndex, 32) + 256;
  const posY = yScaleBeforePosition > 256
    ? Math.trunc((256 - yScaleBeforePosition) / 8)
    : 0;
  const xScale = gbaSin(phaseIndex, 48) + 256;
  return {
    x2: 0,
    y2: -posY + 0,
    data0: 0,
    data2: ticksSinceStart + 1,
    data4: (phaseIndex + data6) & 0xff,
    data6,
    data7,
    phaseIndex,
    yScaleBeforePosition,
    posY,
    xScale,
    yScale: yScaleBeforePosition,
    affineRotation: 0,
    startedAffine: ticksSinceStart === 0,
    normalFrontDontFlip: true,
    resetSpriteAfterAnim: false,
    callback: "Anim_ShrinkGrow",
    affineMode: "double",
  };
}

/**
 * Source-order port of `Anim_HorizontalSlideWobble`
 * (`pokemon_animation.c:911-939,1803-1833`). `Task_HandleMonAnimation`
 * leaves data0/data2..data7 zeroed and sets `sDontFlip=TRUE`, so the two
 * source-order `TryFlipX` calls are no-ops. Tick 0 starts affine mode;
 * ticks 0..100 write the shared C-truncated indices, horizontal GBA sine,
 * and signed-s16-to-u16 affine rotation before incrementing data2. Tick 101
 * restores identity affine/x2, resets the sprite, installs `WaitAnimEnd`,
 * increments data2, and performs the second no-op flip.
 */
export function horizontalSlideWobbleFrameAtTick(
  ticksSinceStart: number,
): HorizontalSlideWobbleFrame | null {
  const core = slideWobbleCoreFrameAtTick(ticksSinceStart, 8);
  if (core === null) return null;
  return {
    x2: core.offset,
    y2: 0,
    data0: 0,
    data2: core.data2,
    index: core.index,
    varBeforeMask: core.varBeforeMask,
    wobbleIndex: core.wobbleIndex,
    rotationSigned: core.rotationSigned,
    affineRotation: core.affineRotation,
    xScale: 256,
    yScale: 256,
    startedAffine: core.startedAffine,
    normalFrontDontFlip: true,
    tryFlipXCalls: 2,
    resetSpriteAfterAnim: core.resetSpriteAfterAnim,
    callback: core.waiting ? "WaitAnimEnd" : "HorizontalSlideWobble",
    affineMode: core.affineMode,
  };
}

const HORIZONTAL_JUMPS_STEP = 12;
const HORIZONTAL_JUMPS_LIMIT = 512;

/**
 * Source-order port of `Anim_HorizontalJumps`
 * (`pokemon_animation.c:911-939,2720-2753`) on the normal opponent-front
 * path. `Task_HandleMonAnimation` leaves data0/data2..data7 zeroed and sets
 * `sDontFlip=TRUE`, so both source-order `TryFlipX` calls execute as no-ops.
 * Ticks 0..42 observe counters 0..504 in steps of 12, use the source's exact
 * C-truncated counter/128 switch and remainder arithmetic for all four x2
 * legs, write y2 from the GBA sine table, and then increment data2. Tick 43
 * observes counter 516, clears x2/y2, installs `WaitAnimEnd`, increments data2
 * to 528, and performs the second no-op flip.
 */
export function horizontalJumpsFrameAtTick(
  ticksSinceStart: number,
): HorizontalJumpsFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let x2 = 0;
  let y2 = 0;
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const counter = data2;
    if (counter > HORIZONTAL_JUMPS_LIMIT) {
      x2 = 0;
      y2 = 0;
      data2 += HORIZONTAL_JUMPS_STEP;
      return {
        x2,
        y2,
        data0: 0,
        data2,
        counter,
        divCounter: null,
        remainder: null,
        sineIndex: null,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "WaitAnimEnd",
      };
    }

    const divCounter = Math.trunc(counter / 128) as 0 | 1 | 2 | 3;
    const remainder = counter % 128;
    switch (divCounter) {
      case 0:
        x2 = -Math.trunc((remainder * 8) / 128) + 0;
        break;
      case 1:
        x2 = Math.trunc(remainder / 16) - 8;
        break;
      case 2:
        x2 = Math.trunc(remainder / 16);
        break;
      case 3:
        x2 = -Math.trunc((remainder * 8) / 128) + 8;
        break;
    }
    const sineIndex = counter % 128;
    y2 = -gbaSin(sineIndex, 8) + 0;
    data2 += HORIZONTAL_JUMPS_STEP;

    if (tick === ticksSinceStart) {
      return {
        x2,
        y2,
        data0: 0,
        data2,
        counter,
        divCounter,
        remainder,
        sineIndex,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "Anim_HorizontalJumps",
      };
    }
  }

  throw new Error("unreachable HorizontalJumps reducer state");
}

/**
 * Source-order port of `Anim_HorizontalVibrate`
 * (`pokemon_animation.c:911-939,1110-1129`). The front-animation task leaves
 * data0/data2..data7 zeroed. Ticks 0..40 select +1 for even data2 and -1 for
 * odd data2, calculate the C-truncated sine index, write x2 from the exact GBA
 * sine table at amplitude 6, then increment data2. Tick 41 installs
 * `WaitAnimEnd`, clears x2, and increments data2 to 42. Unlike adjacent
 * families and its separate back-animation selectors, this callback performs
 * no affine setup and no `TryFlipX` call.
 */
export function horizontalVibrateFrameAtTick(
  ticksSinceStart: number,
): HorizontalVibrateFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let x2 = 0;
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const counter = data2;
    if (counter > 40) {
      x2 = 0;
      data2 += 1;
      return {
        x2,
        y2: 0,
        data0: 0,
        data2,
        counter,
        index: null,
        sign: null,
        amplitude: HORIZONTAL_VIBRATE_VARIANTS.normal.amplitude,
        callback: "WaitAnimEnd",
      };
    }

    const sign = counter % 2 === 0 ? 1 : -1;
    const index = Math.trunc((counter * 128) / 40) % 256;
    x2 = gbaSin(index, HORIZONTAL_VIBRATE_VARIANTS.normal.amplitude) * sign + 0;
    data2 += 1;

    if (tick === ticksSinceStart) {
      return {
        x2,
        y2: 0,
        data0: 0,
        data2,
        counter,
        index,
        sign,
        amplitude: HORIZONTAL_VIBRATE_VARIANTS.normal.amplitude,
        callback: "Anim_HorizontalVibrate",
      };
    }
  }

  throw new Error("unreachable HorizontalVibrate reducer state");
}

const HORIZONTAL_STRETCH_DURATION = 40;

function toS16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

/**
 * Source-order port of `Anim_HorizontalStretch`
 * (`pokemon_animation.c:911-939,1562-1595`) on the normal opponent-front
 * path. The front-animation task starts data0/data2..data7 at zero and sets
 * `sDontFlip=TRUE`. Tick 0 enters affine mode. Active ticks 0..40 preserve
 * the callback-local zero `index1` outside data2=10..29, the s16 data7
 * addition and u8 mask inside that band, exact GBA sine arithmetic, and the
 * signed affine scales written by `SetAffineData`. Tick 41 writes identity,
 * resets the sprite to normal affine mode, installs `WaitAnimEnd`, then still
 * increments data2 to 42.
 *
 * `initialData7` is an arithmetic-test seam only: production dispatch uses
 * the task-zeroed default. It lets Tier 1 exercise the source's s16 wrap even
 * though the reachable 20 increments end at 1020.
 */
export function horizontalStretchFrameAtTick(
  ticksSinceStart: number,
  initialData7 = 0,
): HorizontalStretchFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let data4 = 0;
  let data5 = 0;
  let data7 = toS16(initialData7);

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const startedAffine = data2 === 0;
    if (data2 > HORIZONTAL_STRETCH_DURATION) {
      data2 = toS16(data2 + 1);
      return {
        x2: 0,
        y2: 0,
        data0: 0,
        data2,
        data4,
        data5,
        data7,
        index1: null,
        index2: null,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: false,
        normalFrontDontFlip: true,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      };
    }

    const index2 = Math.trunc((data2 * 128) / HORIZONTAL_STRETCH_DURATION);
    let index1 = 0;
    if (data2 >= 10 && data2 <= 29) {
      data7 = toS16(data7 + 51);
      index1 = data7 & 0xff;
    }

    // Normal opponent-front path: Task_HandleMonAnimation sets sDontFlip.
    data4 = toS16((256 - gbaSin(index2, 40)) - gbaSin(index1, 16));
    data5 = toS16(gbaSin(index2, 16) + 256);
    data2 = toS16(data2 + 1);

    if (tick === ticksSinceStart) {
      return {
        x2: 0,
        y2: 0,
        data0: 0,
        data2,
        data4,
        data5,
        data7,
        index1,
        index2,
        xScale: data4,
        yScale: data5,
        affineRotation: 0,
        startedAffine,
        normalFrontDontFlip: true,
        resetSpriteAfterAnim: false,
        callback: "Anim_HorizontalStretch",
        affineMode: "double",
      };
    }
  }

  throw new Error("unreachable HorizontalStretch reducer state");
}

/**
 * Source-order port of `Anim_FlashYellow` and `sYellowFlashData`
 * (`pokemon_animation.c:603-620,2473-2509`). The front-animation task
 * zeroes data0/data2..data7. On tick 0 the callback captures
 * `OBJ_PLTT_ID(oam.paletteNum)`. A table transition sets data4 only after
 * that callback's palette-write check, so every yellow/restore write occurs
 * on the following callback. Active ticks are 0..55; tick 56 observes the
 * `(u8)-1` sentinel and installs `WaitAnimEnd`. The last write restores the
 * unfaded palette at coefficient 0 before cleanup.
 */
export function flashYellowFrameAtTick(
  ticksSinceStart: number,
  paletteNum = 0,
): FlashYellowFrame | null {
  if (ticksSinceStart < 0) return null;

  const normalizedPaletteNum = paletteNum & 0xf;
  const paletteStart = 0x100 + normalizedPaletteNum * 16;
  let data2 = 0;
  let data4 = 0;
  let data5 = 0;
  let data6 = 0;
  let data7 = 0;
  let blendCoefficient: 0 | 16 = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    data2 = toS16(data2 + 1);
    if (data2 === 1) {
      data7 = paletteStart;
      data6 = 0;
      data5 = 0;
      data4 = 0;
    }

    const entry = YELLOW_FLASH_DATA[data6];
    if (entry === undefined) {
      return {
        x2: 0,
        y2: 0,
        data0: 0,
        data2,
        data4,
        data5,
        data6,
        data7,
        tableFlashYellow: null,
        tableDuration: null,
        paletteNum: normalizedPaletteNum,
        paletteStart,
        paletteCount: 16,
        blendCoefficient,
        blendColor: 0x03ff,
        paletteWrite: false,
        callback: "WaitAnimEnd",
      };
    }

    let paletteWrite = false;
    if (data4 === 1) {
      blendCoefficient = entry[0] ? 16 : 0;
      paletteWrite = true;
      data4 = 0;
    }

    if (entry[1] === data5) {
      data4 = 1;
      data5 = 0;
      data6 += 1;
    } else {
      data5 += 1;
    }

    if (tick === ticksSinceStart) {
      return {
        x2: 0,
        y2: 0,
        data0: 0,
        data2,
        data4,
        data5,
        data6,
        data7,
        tableFlashYellow: entry[0],
        tableDuration: entry[1],
        paletteNum: normalizedPaletteNum,
        paletteStart,
        paletteCount: 16,
        blendCoefficient,
        blendColor: 0x03ff,
        paletteWrite,
        callback: "Anim_FlashYellow",
      };
    }
  }

  throw new Error("unreachable FlashYellow reducer state");
}

function computeTerminalOffset(family: SpeciesFrontAnimFamily): SpeciesIdleOffset {
  switch (family) {
    case "BOUNCE_ROTATE_TO_SIDES_SMALL": {
      const terminal = bounceRotateToSidesSmallFrameAtTick(87);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_BounceRotateToSides_Small did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "BOUNCE_ROTATE_TO_SIDES_SLOW": {
      const terminal = bounceRotateToSidesSlowFrameAtTick(167);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_BounceRotateToSides_Slow did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "CIRCULAR_STRETCH_TWICE": {
      const terminal = circularStretchTwiceFrameAtTick(41);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_CircularStretchTwice did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "SHRINK_GROW": {
      const terminal = shrinkGrowFrameAtTick(49);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_ShrinkGrow did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "SWING_CONVEX": {
      const terminal = swingConvexFrameAtTick(101);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_SwingConvex did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "GROW_VIBRATE": {
      const terminal = growVibrateFrameAtTick(41);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_GrowVibrate did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "FLASH_YELLOW": {
      const terminal = flashYellowFrameAtTick(56);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_FlashYellow did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "H_JUMPS": {
      const terminal = horizontalJumpsFrameAtTick(43);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_HorizontalJumps did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "H_SLIDE_SLOW": {
      const terminal = horizontalSlideSlowFrameAtTick(81);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_HorizontalSlide_Slow did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "H_VIBRATE": {
      const terminal = horizontalVibrateFrameAtTick(41);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_HorizontalVibrate did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "H_SLIDE_WOBBLE": {
      const terminal = horizontalSlideWobbleFrameAtTick(101);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_HorizontalSlideWobble did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "H_STRETCH": {
      const terminal = horizontalStretchFrameAtTick(41);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_HorizontalStretch did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "H_JUMPS_V_STRETCH": {
      const terminal = horizontalJumpsVerticalStretchFrameAtTick(73);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_HorizontalJumpsVerticalStretch did not reach terminal cleanup");
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
    case "V_SLIDE_WOBBLE": {
      const terminal = verticalSlideWobbleFrameAtTick(101);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalSlideWobble did not reach terminal cleanup");
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
    case "V_SHAKE_TWICE": {
      const terminal = verticalShakeTwiceFrameAtTick(78);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalShakeTwice did not reach its source terminal cleanup");
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
