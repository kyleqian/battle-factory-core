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
  | "BACK_AND_LUNGE"
  | "BOUNCE_ROTATE_TO_SIDES"
  | "BOUNCE_ROTATE_TO_SIDES_SMALL"
  | "BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW"
  | "BOUNCE_ROTATE_TO_SIDES_SLOW"
  | "CIRCLE_INTO_BG"
  | "CIRCLE_C_CLOCKWISE_SLOW"
  | "CIRCULAR_VIBRATE"
  | "CIRCULAR_STRETCH_TWICE"
  | "FOUR_PETAL"
  | "GROW_VIBRATE"
  | "GROW_IN_STAGES"
  | "GLOW_BLACK"
  | "LUNGE_GROW"
  | "FLASH_YELLOW"
  | "FLICKER_INCREASING"
  | "FIGURE_8"
  | "H_JUMPS"
  | "H_SLIDE"
  | "H_SLIDE_SLOW"
  | "H_SLIDE_WOBBLE"
  | "H_STRETCH"
  | "H_VIBRATE"
  | "H_JUMPS_V_STRETCH"
  | "H_JUMPS_V_STRETCH_TWICE"
  | "H_SHAKE"
  | "H_SHAKE_SLOW"
  | "RAPID_H_HOPS"
  | "ROTATE_UP_TO_SIDES"
  | "SHRINK_GROW"
  | "SPIN"
  | "TUMBLING_FRONT_FLIP_TWICE"
  | "SWING_CONVEX"
  | "SWING_CONCAVE"
  | "TWIST"
  | "TWIST_TWICE"
  | "V_JUMPS_BIG"
  | "V_JUMPS_SMALL"
  | "V_JUMPS_H_JUMPS"
  | "V_SLIDE"
  | "V_SLIDE_SLOW"
  | "V_SLIDE_WOBBLE"
  | "V_SLIDE_WOBBLE_SMALL"
  | "V_SQUISH_AND_BOUNCE"
  | "V_SQUISH_AND_BOUNCE_SLOW"
  | "V_STRETCH"
  | "V_SHAKE"
  | "V_SHAKE_TWICE"
  | "ZIGZAG_FAST"
  | "ZIGZAG_SLOW";

const FRONT_ANIM_PREFIX = "ANIM_";
const PORTED_FRONT_FAMILIES = new Set<SpeciesFrontAnimFamily>([
  "BACK_AND_LUNGE",
  "BOUNCE_ROTATE_TO_SIDES",
  "BOUNCE_ROTATE_TO_SIDES_SMALL",
  "BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW",
  "BOUNCE_ROTATE_TO_SIDES_SLOW",
  "CIRCLE_INTO_BG",
  "CIRCLE_C_CLOCKWISE_SLOW",
  "CIRCULAR_VIBRATE",
  "CIRCULAR_STRETCH_TWICE",
  "FOUR_PETAL",
  "GROW_VIBRATE",
  "GROW_IN_STAGES",
  "GLOW_BLACK",
  "LUNGE_GROW",
  "FLASH_YELLOW",
  "FLICKER_INCREASING",
  "FIGURE_8",
  "H_JUMPS",
  "H_SLIDE",
  "H_SLIDE_SLOW",
  "H_SLIDE_WOBBLE",
  "H_STRETCH",
  "H_VIBRATE",
  "H_JUMPS_V_STRETCH",
  "H_JUMPS_V_STRETCH_TWICE",
  "H_SHAKE",
  "H_SHAKE_SLOW",
  "RAPID_H_HOPS",
  "ROTATE_UP_TO_SIDES",
  "SHRINK_GROW",
  "SPIN",
  "TUMBLING_FRONT_FLIP_TWICE",
  "SWING_CONVEX",
  "SWING_CONCAVE",
  "TWIST",
  "TWIST_TWICE",
  "V_JUMPS_BIG",
  "V_JUMPS_SMALL",
  "V_JUMPS_H_JUMPS",
  "V_SLIDE",
  "V_SLIDE_SLOW",
  "V_SLIDE_WOBBLE",
  "V_SLIDE_WOBBLE_SMALL",
  "V_SQUISH_AND_BOUNCE",
  "V_SQUISH_AND_BOUNCE_SLOW",
  "V_STRETCH",
  "V_SHAKE",
  "V_SHAKE_TWICE",
  "ZIGZAG_FAST",
  "ZIGZAG_SLOW",
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

/** All source selector mappings for `ANIM_H_SHAKE_SLOW`. */
export const H_SHAKE_SLOW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_SHAKE_SLOW")
    .map(([species]) => species),
);

/** Every slow horizontal-shake mapping is reachable through Factory rentals. */
export const H_SHAKE_SLOW_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SHAKE_SLOW_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no slow horizontal-shake mappings outside the Factory rental pool. */
export const H_SHAKE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SHAKE_SLOW_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All source selector mappings for the one-run `ANIM_TWIST` entry point. */
export const TWIST_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_TWIST")
    .map(([species]) => species),
);

/** Every normal-twist mapping is reachable through Factory rentals. */
export const TWIST_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  TWIST_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no normal-twist selector mappings outside the Factory pool. */
export const TWIST_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  TWIST_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** The sole source selector mapping for `ANIM_TWIST_TWICE` (STARYU). */
export const TWIST_TWICE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_TWIST_TWICE")
    .map(([species]) => species),
);

/** STARYU's twice-twist selector is reachable through the Level-50 Factory pool. */
export const TWIST_TWICE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  TWIST_TWICE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no `ANIM_TWIST_TWICE` mappings outside the Factory rental pool. */
export const TWIST_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  TWIST_TWICE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
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

/** All 5 source selector mappings for the slow `ANIM_V_SLIDE_SLOW`. */
export const V_SLIDE_SLOW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_SLIDE_SLOW")
    .map(([species]) => species),
);

/** Every slow vertical-slide mapping is reachable through Factory rentals. */
export const V_SLIDE_SLOW_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SLIDE_SLOW_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no slow vertical-slide mappings outside the Factory pool. */
export const V_SLIDE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SLIDE_SLOW_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
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

/** All 5 source selector mappings for `ANIM_V_JUMPS_BIG`. */
export const V_JUMPS_BIG_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_JUMPS_BIG")
    .map(([species]) => species),
);

/** Every `ANIM_V_JUMPS_BIG` mapping is reachable through Factory rentals. */
export const V_JUMPS_BIG_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_JUMPS_BIG_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no `ANIM_V_JUMPS_BIG` selector mappings outside the Factory pool. */
export const V_JUMPS_BIG_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_JUMPS_BIG_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 5 source selector mappings for `ANIM_V_JUMPS_H_JUMPS`. */
export const V_JUMPS_H_JUMPS_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_JUMPS_H_JUMPS")
    .map(([species]) => species),
);

/** Every vertical-jumps/horizontal-jumps mapping is Factory-reachable. */
export const V_JUMPS_H_JUMPS_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_JUMPS_H_JUMPS_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no mappings for this family outside the Factory rental pool. */
export const V_JUMPS_H_JUMPS_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_JUMPS_H_JUMPS_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
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

/** All 2 source selector mappings for `ANIM_H_JUMPS_V_STRETCH_TWICE`. */
export const H_JUMPS_V_STRETCH_TWICE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_JUMPS_V_STRETCH_TWICE")
    .map(([species]) => species),
);

/** Every twice horizontal-jumps/vertical-stretch mapping is Factory-reachable. */
export const H_JUMPS_V_STRETCH_TWICE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_JUMPS_V_STRETCH_TWICE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no twice mappings outside the Factory rental pool. */
export const H_JUMPS_V_STRETCH_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] =
  Object.freeze(
    H_JUMPS_V_STRETCH_TWICE_FRONT_SPECIES.filter(
      (species) => !factoryFrontSpecies.has(species),
    ),
  );

/** The sole source selector mapping for `ANIM_ROTATE_UP_TO_SIDES`. */
export const ROTATE_UP_TO_SIDES_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_ROTATE_UP_TO_SIDES")
    .map(([species]) => species),
);

/** The complete Factory-reachable rotate-up-to-sides family (HARIYAMA). */
export const ROTATE_UP_TO_SIDES_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  ROTATE_UP_TO_SIDES_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no rotate-up-to-sides mappings outside the Factory pool. */
export const ROTATE_UP_TO_SIDES_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] =
  Object.freeze(
    ROTATE_UP_TO_SIDES_FRONT_SPECIES.filter(
      (species) => !factoryFrontSpecies.has(species),
    ),
  );

/** All source selector mappings for `ANIM_FLICKER_INCREASING`. */
export const FLICKER_INCREASING_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_FLICKER_INCREASING")
    .map(([species]) => species),
);

/** Every increasing-flicker mapping is Factory-reachable. */
export const FLICKER_INCREASING_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  FLICKER_INCREASING_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no increasing-flicker mappings outside the Factory pool. */
export const FLICKER_INCREASING_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] =
  Object.freeze(
    FLICKER_INCREASING_FRONT_SPECIES.filter(
      (species) => !factoryFrontSpecies.has(species),
    ),
  );

/** All source selector mappings for `ANIM_GROW_IN_STAGES`. */
export const GROW_IN_STAGES_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_GROW_IN_STAGES")
    .map(([species]) => species),
);

/** The Factory-reachable staged-growth mappings (GENGAR and QWILFISH). */
export const GROW_IN_STAGES_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  GROW_IN_STAGES_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** The staged-growth mappings outside the Factory pool (LUGIA). */
export const GROW_IN_STAGES_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  GROW_IN_STAGES_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All source selector mappings for `ANIM_LUNGE_GROW`. */
export const LUNGE_GROW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_LUNGE_GROW")
    .map(([species]) => species),
);

/** Every lunge/grow selector mapping is reachable through Factory rentals. */
export const LUNGE_GROW_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  LUNGE_GROW_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no lunge/grow mappings outside the Factory rental pool. */
export const LUNGE_GROW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  LUNGE_GROW_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** The sole source selector mapping for `ANIM_CIRCLE_INTO_BG`. */
export const CIRCLE_INTO_BG_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_CIRCLE_INTO_BG")
    .map(([species]) => species),
);

/** The complete Factory-reachable circle-into-background family (KINGDRA). */
export const CIRCLE_INTO_BG_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  CIRCLE_INTO_BG_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no circle-into-background mappings outside the Factory pool. */
export const CIRCLE_INTO_BG_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  CIRCLE_INTO_BG_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** The sole source selector mapping for selector 83, `ANIM_SPIN`. */
export const SPIN_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_SPIN")
    .map(([species]) => species),
);

/** SPHEAL's spin selector is reachable through the Level-50 Factory pool. */
export const SPIN_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  SPIN_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no `ANIM_SPIN` mappings outside the Factory rental pool. */
export const SPIN_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  SPIN_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** The sole source selector mapping for selector 84, `ANIM_TUMBLING_FRONT_FLIP_TWICE`. */
export const TUMBLING_FRONT_FLIP_TWICE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_TUMBLING_FRONT_FLIP_TWICE")
    .map(([species]) => species),
);

/** MAGNEMITE's twice-tumbling selector is reachable through the Factory pool. */
export const TUMBLING_FRONT_FLIP_TWICE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  TUMBLING_FRONT_FLIP_TWICE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no selector-84 mappings outside the Factory rental pool. */
export const TUMBLING_FRONT_FLIP_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] =
  Object.freeze(
    TUMBLING_FRONT_FLIP_TWICE_FRONT_SPECIES.filter(
      (species) => !factoryFrontSpecies.has(species),
    ),
  );

/** All source selector mappings for selector 79, `ANIM_CIRCLE_C_CLOCKWISE_SLOW`. */
export const CIRCLE_C_CLOCKWISE_SLOW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_CIRCLE_C_CLOCKWISE_SLOW")
    .map(([species]) => species),
);

/** Every slow circle-counterclockwise mapping is reachable through Factory rentals. */
export const CIRCLE_C_CLOCKWISE_SLOW_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  CIRCLE_C_CLOCKWISE_SLOW_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no slow circle-counterclockwise mappings outside the Factory pool. */
export const CIRCLE_C_CLOCKWISE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  CIRCLE_C_CLOCKWISE_SLOW_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** The sole source selector mapping for `ANIM_FOUR_PETAL`. */
export const FOUR_PETAL_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_FOUR_PETAL")
    .map(([species]) => species),
);

/** The complete Factory-reachable four-petal family (REGICE). */
export const FOUR_PETAL_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  FOUR_PETAL_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no four-petal mappings outside the Factory rental pool. */
export const FOUR_PETAL_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  FOUR_PETAL_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All source selector mappings for `ANIM_ZIGZAG_FAST`. */
export const ZIGZAG_FAST_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_ZIGZAG_FAST")
    .map(([species]) => species),
);

/** Every fast-zigzag mapping is reachable through Factory rentals. */
export const ZIGZAG_FAST_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  ZIGZAG_FAST_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no fast-zigzag mappings outside the Factory pool. */
export const ZIGZAG_FAST_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  ZIGZAG_FAST_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All source selector mappings for `ANIM_ZIGZAG_SLOW`. */
export const ZIGZAG_SLOW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_ZIGZAG_SLOW")
    .map(([species]) => species),
);

/** Every slow-zigzag mapping is reachable through Factory rentals. */
export const ZIGZAG_SLOW_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  ZIGZAG_SLOW_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no slow-zigzag mappings outside the Factory rental pool. */
export const ZIGZAG_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  ZIGZAG_SLOW_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All 5 source selector mappings for the normal `ANIM_BOUNCE_ROTATE_TO_SIDES`. */
export const BOUNCE_ROTATE_TO_SIDES_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES")
    .map(([species]) => species),
);

/** Every normal bounce/rotate selector mapping is Factory-reachable. */
export const BOUNCE_ROTATE_TO_SIDES_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  BOUNCE_ROTATE_TO_SIDES_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no normal bounce/rotate mappings outside the Factory pool. */
export const BOUNCE_ROTATE_TO_SIDES_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] =
  Object.freeze(
    BOUNCE_ROTATE_TO_SIDES_FRONT_SPECIES.filter(
      (species) => !factoryFrontSpecies.has(species),
    ),
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

/** Both source selector mappings for `ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW`. */
export const BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW")
    .map(([species]) => species),
);

/** Every small-slow bounce/rotate mapping is Factory-reachable. */
export const BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FACTORY_FRONT_SPECIES: readonly string[] =
  Object.freeze(
    BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FRONT_SPECIES.filter(
      (species) => factoryFrontSpecies.has(species),
    ),
  );

/** There are no small-slow bounce/rotate mappings outside the Factory pool. */
export const BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] =
  Object.freeze(
    BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FRONT_SPECIES.filter(
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

/** All 4 source selector mappings for `ANIM_V_SLIDE_WOBBLE_SMALL`. */
export const V_SLIDE_WOBBLE_SMALL_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_V_SLIDE_WOBBLE_SMALL")
    .map(([species]) => species),
);

/** Every small vertical-slide-wobble mapping is Factory-reachable. */
export const V_SLIDE_WOBBLE_SMALL_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SLIDE_WOBBLE_SMALL_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no small vertical-slide-wobble mappings outside the Factory pool. */
export const V_SLIDE_WOBBLE_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  V_SLIDE_WOBBLE_SMALL_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
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

/** All 4 source selector mappings for the normal `ANIM_H_SLIDE`. */
export const H_SLIDE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_H_SLIDE")
    .map(([species]) => species),
);

/** Every normal horizontal-slide mapping is reachable through Factory rentals. */
export const H_SLIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SLIDE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no normal horizontal-slide mappings outside the Factory rental pool. */
export const H_SLIDE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  H_SLIDE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All source selector mappings for `ANIM_FIGURE_8`. */
export const FIGURE_8_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_FIGURE_8")
    .map(([species]) => species),
);

/** Every Figure8 mapping is reachable through Factory rentals. */
export const FIGURE_8_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  FIGURE_8_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no Figure8 mappings outside the Factory rental pool. */
export const FIGURE_8_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  FIGURE_8_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All source selector mappings for `ANIM_CIRCULAR_VIBRATE`. */
export const CIRCULAR_VIBRATE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_CIRCULAR_VIBRATE")
    .map(([species]) => species),
);

/** Every circular-vibrate mapping is reachable through Factory rentals. */
export const CIRCULAR_VIBRATE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  CIRCULAR_VIBRATE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no circular-vibrate mappings outside the Factory pool. */
export const CIRCULAR_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  CIRCULAR_VIBRATE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All source selector mappings for the palette-only `ANIM_GLOW_BLACK`. */
export const GLOW_BLACK_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_GLOW_BLACK")
    .map(([species]) => species),
);

/** Every black-glow mapping is reachable through Factory rentals. */
export const GLOW_BLACK_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  GLOW_BLACK_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no black-glow mappings outside the Factory rental pool. */
export const GLOW_BLACK_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  GLOW_BLACK_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
);

/** All source selector mappings for `ANIM_BACK_AND_LUNGE`. */
export const BACK_AND_LUNGE_FRONT_SPECIES: readonly string[] = Object.freeze(
  Object.entries(generatedFrontAnimIds)
    .filter(([, family]) => family === "ANIM_BACK_AND_LUNGE")
    .map(([species]) => species),
);

/** Every back-and-lunge mapping is reachable through Factory rentals. */
export const BACK_AND_LUNGE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  BACK_AND_LUNGE_FRONT_SPECIES.filter((species) => factoryFrontSpecies.has(species)),
);

/** There are no back-and-lunge mappings outside the Factory rental pool. */
export const BACK_AND_LUNGE_OUTSIDE_FACTORY_FRONT_SPECIES: readonly string[] = Object.freeze(
  BACK_AND_LUNGE_FRONT_SPECIES.filter((species) => !factoryFrontSpecies.has(species)),
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
 * The two source initializers share `VerticalSlideWobble`; each calls that
 * callback once before installing it. Selector 28 supplies amplitude 10 and
 * selector 81 supplies amplitude 5.
 */
export const VERTICAL_SLIDE_WOBBLE_INITIALIZERS = Object.freeze({
  normal: Object.freeze({
    selector: "ANIM_V_SLIDE_WOBBLE",
    sourceId: 28,
    data0: 10,
    accepted: true,
  }),
  small: Object.freeze({
    selector: "ANIM_V_SLIDE_WOBBLE_SMALL",
    sourceId: 81,
    data0: 5,
    accepted: true,
  }),
} as const);

export interface VerticalSlideWobbleFrame extends SpeciesIdleOffset {
  readonly data0: 5 | 10;
  readonly data2: number;
  readonly index: number | null;
  readonly varBeforeMask: number | null;
  readonly wobbleIndex: number | null;
  readonly rotationSigned: number;
  readonly affineRotation: number;
  readonly xScale: 256;
  readonly yScale: 256;
  /** Tick zero is the initializer's immediate callback before it installs the callback. */
  readonly initializerCallBeforeCallbackInstall: boolean;
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
 * per family. The normal data0=40 and slow data0=80 front initializers are
 * accepted independently; the fast data0=20 back-sprite route is not.
 */
export const HORIZONTAL_SLIDE_INITIALIZERS = Object.freeze({
  slow: Object.freeze({ selector: "ANIM_H_SLIDE_SLOW", data0: 80, accepted: true }),
  normal: Object.freeze({ selector: "ANIM_H_SLIDE", data0: 40, accepted: true }),
  fast: Object.freeze({ selector: "ANIM_H_SLIDE_FAST", data0: 20, accepted: false }),
} as const);

export interface HorizontalSlideFrame extends SpeciesIdleOffset {
  readonly data0: 40 | 80;
  readonly data2: number;
  readonly index: number | null;
  readonly amplitude: 6;
  /** Tick zero is the initializer's immediate callback before it installs the callback. */
  readonly initializerCallBeforeCallbackInstall: boolean;
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

export interface VerticalJumpsHorizontalJumpsFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2: number;
  /** The source `counter` value before case 2 can rewrite its local copy. */
  readonly counter: number;
  readonly divCounter: 0 | 1 | 2 | 3 | 4 | 5 | 6 | null;
  /** Counter used by the final y2 sine write; case 2 alone rewrites it to 0. */
  readonly yCounter: number | null;
  readonly remainder: number | null;
  readonly x2Written: boolean;
  readonly normalFrontDontFlip: true;
  readonly callback: "Anim_VerticalJumpsHorizontalJumps" | "WaitAnimEnd";
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

/**
 * Both initializers invoke `VerticalSlide` immediately and then install that
 * same callback after it returns. The final write deliberately overwrites any
 * callback selected by the immediate call; task-zeroed data2=0 keeps the real
 * tick-zero path active rather than terminal.
 */
export const VERTICAL_SLIDE_INITIALIZERS = Object.freeze({
  normal: Object.freeze({
    selector: "ANIM_V_SLIDE",
    initializer: "Anim_VerticalSlide",
    data0: 40,
    immediateCallback: "VerticalSlide",
    installedCallback: "VerticalSlide",
    sourceOverwriteAfterImmediateCall: true,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_V_SLIDE_SLOW",
    initializer: "Anim_VerticalSlide_Slow",
    data0: 80,
    immediateCallback: "VerticalSlide",
    installedCallback: "VerticalSlide",
    sourceOverwriteAfterImmediateCall: true,
    accepted: true,
  }),
} as const);

export interface VerticalSlideFrame extends SpeciesIdleOffset {
  readonly data0: 40 | 80;
  readonly data2: number;
  readonly index: number | null;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly callback: "VerticalSlide" | "WaitAnimEnd";
}

export type VerticalSlideNormalFrame = VerticalSlideFrame & { readonly data0: 40 };
export type VerticalSlideSlowFrame = VerticalSlideFrame & { readonly data0: 80 };

export interface VerticalJumpsFrame extends SpeciesIdleOffset {
  readonly data0: 3 | 4;
  readonly data2: number;
  readonly counter: number;
  readonly divCounter: 0 | 1 | 2 | 3 | null;
  readonly adjustedCounter: number | null;
  readonly sineIndex: number | null;
  readonly amplitude: 6 | 8 | 9 | 12 | null;
  readonly callback: "VerticalJumps" | "WaitAnimEnd";
}

export type VerticalJumpsSmallFrame = VerticalJumpsFrame & { readonly data0: 3 };
export type VerticalJumpsBigFrame = VerticalJumpsFrame & { readonly data0: 4 };

export interface HorizontalJumpsVerticalStretchFrame extends SpeciesIdleOffset {
  readonly data2: number;
  readonly data3: number;
  readonly data4: number;
  readonly animRotation: 0;
  readonly animDelay: number;
  readonly animRuns: number;
  readonly animSpeed: 0;
  readonly animData: -1 | 1;
  readonly counter: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 0 | 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback:
    | "HorizontalJumpsVerticalStretch_0"
    | "HorizontalJumpsVerticalStretch_1"
    | "HorizontalJumpsVerticalStretch_2"
    | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export interface RotateUpToSidesFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2: 1;
  readonly data7: number;
  readonly sineIndex: number | null;
  readonly ySineIndex: number | null;
  readonly rotationSigned: number | null;
  readonly rotationU16: number;
  readonly affineRotationU16: number;
  readonly xScale: 256;
  readonly yScale: 256;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Anim_RotateUpToSides" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export interface FlickerIncreasingFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2Before: number;
  readonly data7Before: number;
  readonly data2: number;
  readonly data7: number;
  readonly resetData7AtStart: boolean;
  readonly equalityBranch: boolean;
  readonly invisible: boolean;
  readonly terminalGuard: boolean;
  readonly callback: "Anim_FlickerIncreasing" | "WaitAnimEnd";
}

export interface GrowInStagesFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2Before: number;
  readonly data5Before: number;
  readonly data6Before: number;
  readonly data7Before: number;
  readonly data2: 1;
  readonly data5: number;
  readonly data6: number;
  readonly data7: number;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly delayBranch: boolean;
  readonly cScaleOffset: number | null;
  readonly sineFunction: "Sin" | "Cos" | null;
  readonly sineIndex: number | null;
  readonly sineValue: number | null;
  readonly xScale: number;
  readonly yScale: number;
  readonly affineWriteCount: 0 | 1 | 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Anim_GrowInStages" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export interface LungeGrowFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2Before: 0 | 1;
  readonly data2: 1;
  readonly data7Before: number;
  readonly data7: number;
  readonly xSineIndex: number | null;
  readonly xSineValue: number | null;
  readonly scaleSineIndex: number | null;
  readonly scaleSineValue: number | null;
  readonly xScale: number;
  readonly yScale: number;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly affineWriteCount: 1;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Anim_LungeGrow" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export interface CircleIntoBackgroundFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2Before: 0 | 1;
  readonly data2: 1;
  readonly data7Before: number;
  readonly data7: number;
  readonly xSineIndex: number | null;
  readonly xSineValue: number | null;
  readonly scaleSineIndex: number | null;
  readonly scaleSineValue: number | null;
  readonly xScale: number;
  readonly yScale: number;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly affineWriteCount: 1;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Anim_CircleIntoBackground" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

export interface FourPetalFrame extends SpeciesIdleOffset {
  readonly data0: 0;
  readonly data2Before: 0 | 1;
  readonly data2: 1;
  readonly data6Before: number;
  readonly data6: number;
  readonly data7Before: number;
  readonly data7AfterInitialization: number;
  readonly data7AfterIncrement: number;
  readonly data7: number;
  readonly initialized: boolean;
  readonly phaseGuardLimit: 63 | 127;
  readonly phaseTransition: boolean;
  readonly switchArm: 0 | 1 | 2 | 3 | 4 | "default";
  readonly xTrigFunction: "Sin" | "Cos" | null;
  readonly xTrigIndex: number | null;
  readonly xTrigValue: number | null;
  readonly yTrigFunction: "Sin" | "Cos" | null;
  readonly yTrigIndex: number | null;
  readonly yTrigValue: number | null;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly callback: "Anim_FourPetal" | "WaitAnimEnd";
}

/** `InitAnimData`, called by `AddNewAnim`, source defaults adjacent to this family. */
export const ADD_NEW_ANIM_DEFAULTS = Object.freeze({
  rotation: 0,
  delay: 0,
  runs: 1,
  speed: 0,
  data: 0,
});

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

/**
 * Shared source-order port of `VerticalSlide`
 * (`pokemon_animation.c:1156-1173`) on the normal opponent-front path.
 * Its normal and slow initializers set data0=40/80, invoke this callback
 * immediately, and install it after return (`:1175-1180,3672-3677`).
 * `Task_HandleMonAnimation` has already set `sDontFlip=TRUE`, so both
 * source-order `TryFlipX` calls execute without changing x2. Active callbacks
 * use C-truncated `(data2 * 384 / data0)` before modulo and signed GBA sine;
 * the first callback after the strict `data2 > data0` edge clears y2, installs
 * `WaitAnimEnd`, still increments data2, and performs the second flip call.
 */
function verticalSlideFrameAtTickForDuration(
  ticksSinceStart: number,
  data0: 40 | 80,
): VerticalSlideFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let x2 = 0;
  let y2 = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    x2 = tryFlipX(x2, true);
    if (data2 > data0) {
      y2 = 0;
      data2 += 1;
      x2 = tryFlipX(x2, true);
      return {
        x2,
        y2,
        data0,
        data2,
        index: null,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "WaitAnimEnd",
      };
    }

    const index = Math.trunc((data2 * 384) / data0) % 256;
    y2 = -gbaSin(index, 6) + 0;
    data2 += 1;
    x2 = tryFlipX(x2, true);

    if (tick === ticksSinceStart) {
      return {
        x2,
        y2,
        data0,
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

/** Normal data0=40 initializer routed through the shared callback reducer. */
export function verticalSlideFrameAtTick(
  ticksSinceStart: number,
): VerticalSlideNormalFrame | null {
  return verticalSlideFrameAtTickForDuration(ticksSinceStart, 40) as VerticalSlideNormalFrame | null;
}

/** Slow data0=80 initializer routed through the same shared callback reducer. */
export function verticalSlideSlowFrameAtTick(
  ticksSinceStart: number,
): VerticalSlideSlowFrame | null {
  return verticalSlideFrameAtTickForDuration(ticksSinceStart, 80) as VerticalSlideSlowFrame | null;
}

const VERTICAL_JUMPS_ACCUMULATOR_STEP = 12;
const VERTICAL_JUMPS_ACCUMULATOR_LIMIT = 384;

/**
 * Shared source-order port of `VerticalJumps`
 * (`pokemon_animation.c:1181-1208`). Both accepted initializers immediately
 * invoke this callback: Big sets data0=4 (`:1210-1215`) and Small sets data0=3
 * (`:3768-3773`). Active ticks 0..32 preserve C's signed division, the
 * counter-=256 branch, and u8 sine-index conversion. Tick 33 observes the
 * strict counter > 384 guard, clears x2/y2, installs `WaitAnimEnd`, and still
 * performs data2 += 12. `Task_HandleMonAnimation` zeroes data2 first
 * (`:911-939`); `WaitAnimEnd` remains stable until animEnded (`:5540-5544`).
 */
function verticalJumpsFrameAtTick(
  ticksSinceStart: number,
  data0: 3 | 4,
): VerticalJumpsFrame | null {
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
        data0,
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
      ? data0 * 2 as 6 | 8
      : data0 * 3 as 9 | 12;
    y2 = -gbaSin(sineIndex, amplitude) + 0;
    data2 += VERTICAL_JUMPS_ACCUMULATOR_STEP;

    if (tick === ticksSinceStart) {
      return {
        x2: 0,
        y2,
        data0,
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

  throw new Error("unreachable VerticalJumps reducer state");
}

export function verticalJumpsSmallFrameAtTick(
  ticksSinceStart: number,
): VerticalJumpsSmallFrame | null {
  return verticalJumpsFrameAtTick(ticksSinceStart, 3) as VerticalJumpsSmallFrame | null;
}

export function verticalJumpsBigFrameAtTick(
  ticksSinceStart: number,
): VerticalJumpsBigFrame | null {
  return verticalJumpsFrameAtTick(ticksSinceStart, 4) as VerticalJumpsBigFrame | null;
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
function horizontalJumpsVerticalStretchVariantFrameAtTick(
  ticksSinceStart: number,
  initializer: { readonly animData: -1 | 1; readonly animRuns: 1 | 2 },
): HorizontalJumpsVerticalStretchFrame | null {
  if (ticksSinceStart < 0) return null;

  // `InitAnimData` defaults, followed by the single-run initializer override.
  const animRotation = 0;
  let animDelay = 0;
  let animRuns = initializer.animRuns;
  const animSpeed = 0;
  const animData = initializer.animData;
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
    let tryFlipXCalls: 0 | 2 = 0;

    if (callback === "HorizontalJumpsVerticalStretch_0") {
      if (animDelay !== 0) {
        animDelay -= 1;
      } else {
        tryFlipXCalls = 2;
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
      tryFlipXCalls = 2;
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
      tryFlipXCalls = 2;
      x2 = tryFlipX(x2, true);
      counter = data2;
      if (counter > 128) {
        if (animRuns > 1) {
          animRuns -= 1;
          animDelay = 10;
          data3 = 0;
          data2 = 0;
          data4 = 0;
          callback = "HorizontalJumpsVerticalStretch_0";
        } else {
          resetSpriteAfterAnim = true;
          callback = "WaitAnimEnd";
        }
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
        animDelay,
        animRuns,
        animSpeed,
        animData,
        counter,
        xScale,
        yScale,
        startedAffine,
        normalFrontDontFlip: true,
        tryFlipXCalls,
        resetSpriteAfterAnim,
        callback,
        affineMode: resetSpriteAfterAnim ? "normal" : "double",
      };
    }
  }

  throw new Error("unreachable HorizontalJumpsVerticalStretch reducer state");
}

export function horizontalJumpsVerticalStretchFrameAtTick(
  ticksSinceStart: number,
): HorizontalJumpsVerticalStretchFrame | null {
  return horizontalJumpsVerticalStretchVariantFrameAtTick(
    ticksSinceStart,
    { animData: -1, animRuns: 1 },
  );
}

/**
 * Source-order port of `Anim_HorizontalJumpsVerticalStretch_Twice`
 * (`pokemon_animation.c:3805-3815`) through the callbacks shared with the
 * accepted single-run family (`:2755-2868`). The initializer differs only by
 * selecting data=1/runs=2. At the first `_2` terminal edge the shared tail
 * carries data2 from the reset value 0 to 12, while delay=10 suppresses the
 * next ten `_0` bodies; the second pass then finishes through the ordinary
 * `ResetSpriteAfterAnim` / `WaitAnimEnd` path.
 */
export function horizontalJumpsVerticalStretchTwiceFrameAtTick(
  ticksSinceStart: number,
): HorizontalJumpsVerticalStretchFrame | null {
  return horizontalJumpsVerticalStretchVariantFrameAtTick(
    ticksSinceStart,
    { animData: 1, animRuns: 2 },
  );
}

/**
 * Source-order port of `Anim_RotateUpToSides`
 * (`pokemon_animation.c:911-939,1037-1059,2918-2951,5540-5544`). The first
 * callback starts affine mode exactly once. Active callbacks consume data7
 * 0..248 in steps of eight; the next callback observes the strict `> 254`
 * guard at data7=256, restores identity offsets/affine state, resets the
 * sprite, and installs stable `WaitAnimEnd`. Both source-order `TryFlipX`
 * calls are preserved and are no-ops for the ordinary opponent-front sprite.
 */
export function rotateUpToSidesFrameAtTick(
  ticksSinceStart: number,
): RotateUpToSidesFrame | null {
  if (ticksSinceStart < 0) return null;

  const terminalTick = 32;
  if (ticksSinceStart >= terminalTick) {
    return {
      x2: 0,
      y2: 0,
      data0: 0,
      data2: 1,
      data7: 256,
      sineIndex: null,
      ySineIndex: null,
      rotationSigned: null,
      rotationU16: 0,
      affineRotationU16: 0,
      xScale: 256,
      yScale: 256,
      startedAffine: false,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    };
  }

  const data7 = ticksSinceStart * 8;
  const sineIndex = data7;
  const ySineIndex = data7 % 128;
  const rotationSigned = gbaSin(sineIndex, 32);
  // `u16 rotation = Sin(...)`, followed by `rotation << 8` and conversion
  // back to the u16 HandleSetAffineData parameter.
  const rotationU16 = rotationSigned & 0xffff;
  const affineRotationU16 = (rotationU16 << 8) & 0xffff;
  return {
    x2: -gbaSin(sineIndex, 16) + 0,
    y2: -gbaSin(ySineIndex, 16) + 0,
    data0: 0,
    data2: 1,
    data7: data7 + 8,
    sineIndex,
    ySineIndex,
    rotationSigned,
    rotationU16,
    affineRotationU16,
    xScale: 256,
    yScale: 256,
    startedAffine: ticksSinceStart === 0,
    normalFrontDontFlip: true,
    tryFlipXCalls: 2,
    resetSpriteAfterAnim: false,
    callback: "Anim_RotateUpToSides",
    affineMode: "double",
  };
}

/**
 * Source-order port of `Anim_FlickerIncreasing`
 * (`pokemon_animation.c:911-939,2949-2974,5540-5544`). The front-animation
 * task supplies zeroed data2/data7. Tick 0 first resets data7, then takes the
 * equality branch and advances data2 to one while visible. Each phase n=1..10
 * performs n invisible callbacks followed by its visible equality callback;
 * the phase-10 equality callback advances data2 to 11, then the strict
 * `data2 > 10` guard installs stable `WaitAnimEnd` and forces visibility.
 * This callback neither allocates `sAnims` state nor touches sprite offsets.
 */
export function flickerIncreasingFrameAtTick(
  ticksSinceStart: number,
): FlickerIncreasingFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let data7 = 0;
  let invisible = false;
  let terminal: FlickerIncreasingFrame | null = null;
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal !== null) return terminal;

    const data2Before = data2;
    const data7Before = data7;
    const resetData7AtStart = data2 === 0;
    if (resetData7AtStart) data7 = 0;

    const equalityBranch = data2 === data7;
    if (equalityBranch) {
      data7 = 0;
      data2 += 1;
      invisible = false;
    } else {
      data7 += 1;
      invisible = true;
    }

    const terminalGuard = data2 > 10;
    if (terminalGuard) invisible = false;
    const frame: FlickerIncreasingFrame = {
      x2: 0,
      y2: 0,
      data0: 0,
      data2Before,
      data7Before,
      data2,
      data7,
      resetData7AtStart,
      equalityBranch,
      invisible,
      terminalGuard,
      callback: terminalGuard ? "WaitAnimEnd" : "Anim_FlickerIncreasing",
    };
    if (terminalGuard) terminal = frame;
    if (tick === ticksSinceStart) return frame;
  }

  throw new Error("unreachable FlickerIncreasing reducer state");
}

/**
 * Source-order normal-front port of `Anim_GrowInStages`
 * (`pokemon_animation.c:911-939,1037-1059,3198-3267,5540-5544` and
 * `trig.c:514-518`). The task zeroes data2/data5/data6/data7 before callback
 * zero. Both `TryFlipX` calls are retained as normal-front no-ops. In
 * particular, the stage-3 delay decrements without an affine write, and the
 * terminal callback preserves the source's reset/callback assignment before
 * its cosine, data7 increment, and second identity affine write.
 */
export function growInStagesFrameAtTick(
  ticksSinceStart: number,
): GrowInStagesFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let data5 = 0;
  let data6 = 0;
  let data7 = 0;
  let xScale = 256;
  let yScale = 256;
  let terminal: GrowInStagesFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal !== null) return terminal;

    const data2Before = data2;
    const data5Before = data5;
    const data6Before = data6;
    const data7Before = data7;
    const startedAffine = data2 === 0;
    if (startedAffine) {
      data5 = 0;
      data6 = 0;
      data7 = 0;
      data2 += 1;
    }

    const delayBranch = data6 > 0;
    let cScaleOffset: number | null = null;
    let sineFunction: "Sin" | "Cos" | null = null;
    let sineIndex: number | null = null;
    let sineValue: number | null = null;
    let affineWriteCount: 0 | 1 | 2 = 0;
    let resetSpriteAfterAnim = false;
    let callback: GrowInStagesFrame["callback"] = "Anim_GrowInStages";
    let affineMode: GrowInStagesFrame["affineMode"] = "double";

    if (delayBranch) {
      data6 -= 1;
      if (data5 !== 3) {
        cScaleOffset = Math.trunc((8 * data6) / 20);
        sineFunction = "Sin";
        sineIndex = data7 - cScaleOffset;
        sineValue = gbaSin(sineIndex, 64);
        xScale = 256 - sineValue;
        yScale = 256 - sineValue;
        affineWriteCount = 1;
      }
    } else {
      if (data5 === 3) {
        if (data7 > 63) {
          data7 = 64;
          xScale = 256;
          yScale = 256;
          affineWriteCount = 1;
          resetSpriteAfterAnim = true;
          callback = "WaitAnimEnd";
          affineMode = "normal";
        }
        sineFunction = "Cos";
        sineIndex = data7;
        sineValue = gbaCos(data7, 64);
      } else {
        sineFunction = "Sin";
        sineIndex = data7;
        sineValue = gbaSin(data7, 64);
        if (data7 > 63) {
          data5 = 3;
          data6 = 10;
          data7 = 0;
        } else if (sineValue > 48 && data5 === 1) {
          data5 = 2;
          data6 = 20;
        } else if (sineValue > 16 && data5 === 0) {
          data5 = 1;
          data6 = 20;
        }
      }

      data7 += 2;
      xScale = 256 - sineValue;
      yScale = 256 - sineValue;
      affineWriteCount = affineWriteCount === 1 ? 2 : 1;
    }

    const frame: GrowInStagesFrame = {
      x2: 0,
      y2: 0,
      data0: 0,
      data2Before,
      data5Before,
      data6Before,
      data7Before,
      data2: 1,
      data5,
      data6,
      data7,
      startedAffine,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      delayBranch,
      cScaleOffset,
      sineFunction,
      sineIndex,
      sineValue,
      xScale,
      yScale,
      affineWriteCount,
      resetSpriteAfterAnim,
      callback,
      affineMode,
    };
    if (callback === "WaitAnimEnd") terminal = frame;
    if (tick === ticksSinceStart) return frame;
  }

  throw new Error("unreachable GrowInStages reducer state");
}

/**
 * Source-order normal-front port of `Anim_LungeGrow`
 * (`pokemon_animation.c:911-939,984-1064,3507-3534,5540-5544` and
 * `trig.c:514-518`). `Task_HandleMonAnimation` zeroes data2/data7 before
 * callback zero. Tick zero starts affine mode before performing its ordinary
 * motion/scale write. Active callbacks consume data7 0..512 inclusive; only
 * the next callback observes the strict `data7 > 512` guard, clears x2,
 * restores identity affine state, resets the sprite, and installs stable
 * `WaitAnimEnd`. Both source-order normal-front `TryFlipX` calls are no-ops.
 */
export function lungeGrowFrameAtTick(
  ticksSinceStart: number,
): LungeGrowFrame | null {
  if (ticksSinceStart < 0) return null;

  const terminalTick = 65;
  if (ticksSinceStart >= terminalTick) {
    return {
      x2: 0,
      y2: 0,
      data0: 0,
      data2Before: 1,
      data2: 1,
      data7Before: 520,
      data7: 520,
      xSineIndex: null,
      xSineValue: null,
      scaleSineIndex: null,
      scaleSineValue: null,
      xScale: 256,
      yScale: 256,
      startedAffine: false,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      affineWriteCount: 1,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    };
  }

  const data7Before = ticksSinceStart * 8;
  const xSineIndex = Math.trunc((data7Before % 256) / 2);
  const xSineValue = gbaSin(xSineIndex, 16);
  const data7 = data7Before + 8;
  const scaleSineIndex = Math.trunc((data7 % 256) / 2);
  const scaleSineValue = gbaSin(scaleSineIndex, 64);
  const scale = 256 - scaleSineValue;
  return {
    x2: -xSineValue + 0,
    y2: 0,
    data0: 0,
    data2Before: ticksSinceStart === 0 ? 0 : 1,
    data2: 1,
    data7Before,
    data7,
    xSineIndex,
    xSineValue,
    scaleSineIndex,
    scaleSineValue,
    xScale: scale,
    yScale: scale,
    startedAffine: ticksSinceStart === 0,
    normalFrontDontFlip: true,
    tryFlipXCalls: 2,
    affineWriteCount: 1,
    resetSpriteAfterAnim: false,
    callback: "Anim_LungeGrow",
    affineMode: "double",
  };
}

/**
 * Source-order normal-front port of `Anim_CircleIntoBackground`
 * (`pokemon_animation.c:911-939,984-1064,3537-3565,5540-5544` and
 * `trig.c:514-518`). The front-animation task zeroes data2/data7. Tick zero
 * starts affine mode before its ordinary motion and scale write. Active
 * callbacks consume data7 0..512 inclusive in steps of eight; tick 65 alone
 * observes the strict `data7 > 512` guard at 520, clears x2, resets the
 * sprite, writes identity affine state, and installs stable `WaitAnimEnd`.
 * Both source-order `TryFlipX` calls are normal-front no-ops.
 */
export function circleIntoBackgroundFrameAtTick(
  ticksSinceStart: number,
): CircleIntoBackgroundFrame | null {
  if (ticksSinceStart < 0) return null;

  const terminalTick = 65;
  if (ticksSinceStart >= terminalTick) {
    return {
      x2: 0,
      y2: 0,
      data0: 0,
      data2Before: 1,
      data2: 1,
      data7Before: 520,
      data7: 520,
      xSineIndex: null,
      xSineValue: null,
      scaleSineIndex: null,
      scaleSineValue: null,
      xScale: 256,
      yScale: 256,
      startedAffine: false,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      affineWriteCount: 1,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    };
  }

  const data7Before = ticksSinceStart * 8;
  const xSineIndex = data7Before % 256;
  const xSineValue = gbaSin(xSineIndex, 8);
  const data7 = data7Before + 8;
  const scaleSineIndex = Math.trunc((data7 % 256) / 2);
  const scaleSineValue = gbaSin(scaleSineIndex, 96);
  const scale = 256 + scaleSineValue;
  return {
    x2: -xSineValue + 0,
    y2: 0,
    data0: 0,
    data2Before: ticksSinceStart === 0 ? 0 : 1,
    data2: 1,
    data7Before,
    data7,
    xSineIndex,
    xSineValue,
    scaleSineIndex,
    scaleSineValue,
    xScale: scale,
    yScale: scale,
    startedAffine: ticksSinceStart === 0,
    normalFrontDontFlip: true,
    tryFlipXCalls: 2,
    affineWriteCount: 1,
    resetSpriteAfterAnim: false,
    callback: "Anim_CircleIntoBackground",
    affineMode: "double",
  };
}

/**
 * Source-order normal-front port of `Anim_FourPetal`
 * (`pokemon_animation.c:911-939,3601-3656,5540-5544` and
 * `trig.c:514-518`). `Task_HandleMonAnimation` zeroes data2/data6/data7.
 * Callback zero writes data6=0/data7=64/data2=1 in that order, then every
 * active callback increments data7 by eight before applying its phase guard.
 * Phases 0..3 use the strict `> 127` guard; phase 4 alone uses `> 63`.
 * Every switch arm uses the signed GBA sine table, and both source-order
 * `TryFlipX` calls are retained as normal-front no-ops. The default arm
 * clears both offsets, installs `WaitAnimEnd`, and remains stable.
 */
export function fourPetalFrameAtTick(
  ticksSinceStart: number,
): FourPetalFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2: 0 | 1 = 0;
  let data6 = 0;
  let data7 = 0;
  let terminal: FourPetalFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal !== null) return terminal;

    const data2Before = data2;
    const data6Before = data6;
    const data7Before = data7;
    const initialized = data2 === 0;
    if (initialized) {
      data6 = 0;
      data7 = 64;
      data2 = 1;
    }
    const data7AfterInitialization = data7;

    data7 += 8;
    const data7AfterIncrement = data7;
    const phaseGuardLimit: 63 | 127 = data6 === 4 ? 63 : 127;
    const phaseTransition = data7 > phaseGuardLimit;
    if (phaseTransition) {
      data7 = 0;
      data6 += 1;
    }

    let x2 = 0;
    let y2 = 0;
    let switchArm: FourPetalFrame["switchArm"] = "default";
    let xTrigFunction: FourPetalFrame["xTrigFunction"] = null;
    let xTrigIndex: number | null = null;
    let xTrigValue: number | null = null;
    let yTrigFunction: FourPetalFrame["yTrigFunction"] = null;
    let yTrigIndex: number | null = null;
    let yTrigValue: number | null = null;
    let callback: FourPetalFrame["callback"] = "Anim_FourPetal";

    switch (data6) {
      case 1:
        switchArm = 1;
        xTrigFunction = "Cos";
        xTrigIndex = data7;
        xTrigValue = gbaCos(data7, 8);
        yTrigFunction = "Sin";
        yTrigIndex = data7;
        yTrigValue = gbaSin(data7, 8);
        x2 = -xTrigValue + 0;
        y2 = yTrigValue - 8;
        break;
      case 2:
        switchArm = 2;
        xTrigFunction = "Sin";
        xTrigIndex = data7 + 128;
        xTrigValue = gbaSin(data7 + 128, 8);
        yTrigFunction = "Cos";
        yTrigIndex = data7;
        yTrigValue = gbaCos(data7, 8);
        x2 = xTrigValue + 8;
        y2 = -yTrigValue + 0;
        break;
      case 3:
        switchArm = 3;
        xTrigFunction = "Cos";
        xTrigIndex = data7;
        xTrigValue = gbaCos(data7, 8);
        yTrigFunction = "Sin";
        yTrigIndex = data7 + 128;
        yTrigValue = gbaSin(data7 + 128, 8);
        x2 = xTrigValue + 0;
        y2 = yTrigValue + 8;
        break;
      case 0:
      case 4:
        switchArm = data6;
        xTrigFunction = "Sin";
        xTrigIndex = data7;
        xTrigValue = gbaSin(data7, 8);
        yTrigFunction = "Cos";
        yTrigIndex = data7;
        yTrigValue = gbaCos(data7, 8);
        x2 = xTrigValue - 8;
        y2 = yTrigValue + 0;
        break;
      default:
        callback = "WaitAnimEnd";
        break;
    }

    const frame: FourPetalFrame = {
      x2,
      y2,
      data0: 0,
      data2Before,
      data2: 1,
      data6Before,
      data6,
      data7Before,
      data7AfterInitialization,
      data7AfterIncrement,
      data7,
      initialized,
      phaseGuardLimit,
      phaseTransition,
      switchArm,
      xTrigFunction,
      xTrigIndex,
      xTrigValue,
      yTrigFunction,
      yTrigIndex,
      yTrigValue,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      callback,
    };
    if (callback === "WaitAnimEnd") terminal = frame;
    if (tick === ticksSinceStart) return frame;
  }

  throw new Error("unreachable FourPetal reducer state");
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

function bounceRotateToSidesVariantFrameAtTick(
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
 * Exact source-order normal `Anim_BounceRotateToSides` lifecycle. The
 * task-zeroed `data6=0` selects table 0, while `AddNewAnim` defaults are
 * followed by the normal initializer's rotation 4096. Active ticks are
 * 0..86; tick 87 consumes the zero-duration sentinel.
 */
export function bounceRotateToSidesFrameAtTick(
  ticksSinceStart: number,
): BounceRotateToSidesFrame | null {
  return bounceRotateToSidesVariantFrameAtTick(
    ticksSinceStart,
    BOUNCE_ROTATE_TO_SIDES_VARIANTS.normal,
  );
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
  return bounceRotateToSidesVariantFrameAtTick(
    ticksSinceStart,
    BOUNCE_ROTATE_TO_SIDES_VARIANTS.slow,
  );
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
  return bounceRotateToSidesVariantFrameAtTick(
    ticksSinceStart,
    BOUNCE_ROTATE_TO_SIDES_VARIANTS.small,
  );
}

/**
 * Exact source-order `Anim_BounceRotateToSides_SmallSlow` lifecycle. The
 * wrapper first writes sprite `data6=1`, then Small allocates a zeroed
 * `AddNewAnim` entry, writes rotation 2048 and copies `data6` into animation
 * data before immediately invoking the shared slow-table callback.
 */
export function bounceRotateToSidesSmallSlowFrameAtTick(
  ticksSinceStart: number,
): BounceRotateToSidesFrame | null {
  return bounceRotateToSidesVariantFrameAtTick(
    ticksSinceStart,
    BOUNCE_ROTATE_TO_SIDES_VARIANTS.smallSlow,
  );
}

/** Source `sZigzagData`: x delta, y delta, callback count. */
export const ZIGZAG_DATA: readonly (readonly [number, number, number])[] = Object.freeze([
  [-1, -1, 6], [2, 0, 6], [-2, 2, 6], [2, 0, 6], [-2, -2, 6],
  [2, 0, 6], [-2, 2, 6], [2, 0, 6], [-1, -1, 6], [0, 0, 0],
]);

interface ZigzagSharedState {
  x2: number;
  y2: number;
  data2: number;
  data3: number;
}

interface ZigzagSharedStep {
  readonly moved: boolean;
  readonly tryFlipXCalls: 1 | 2;
  readonly reachedTerminal: boolean;
}

/**
 * Shared source-order `Zigzag` callback (`pokemon_animation.c:1290-1322`).
 * Its callers retain their own callback identities: the fast initializer
 * installs `Zigzag` after this first invocation, while the slow wrapper keeps
 * itself installed until this routine consumes the zero-duration sentinel.
 */
function zigzagSharedStep(state: ZigzagSharedState): ZigzagSharedStep {
  if (state.data2 === 0) state.data3 = 0;

  let leg = ZIGZAG_DATA[state.data3]!;
  if (leg[2] === state.data2) {
    if (leg[2] === 0) return { moved: false, tryFlipXCalls: 1, reachedTerminal: true };
    state.data3 += 1;
    state.data2 = 0;
  }

  leg = ZIGZAG_DATA[state.data3]!;
  if (leg[2] === 0) return { moved: false, tryFlipXCalls: 1, reachedTerminal: true };

  state.x2 += leg[0];
  state.y2 += leg[1];
  state.data2 += 1;
  return { moved: true, tryFlipXCalls: 2, reachedTerminal: false };
}

export interface ZigzagFastFrame extends SpeciesIdleOffset {
  readonly data0: number;
  readonly data2: number;
  readonly data3: number;
  readonly moved: boolean;
  readonly initializerCalled: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 0 | 1 | 2;
  readonly callback: "Zigzag" | "WaitAnimEnd";
}

/**
 * Exact source-order normal-front `Anim_ZigzagFast` lifecycle. Its
 * initializer calls `Zigzag` on tick 0 and only then overwrites the sprite
 * callback with `Zigzag`; all remaining motion is one callback per tick.
 * Ticks 0..53 apply the nine six-callback legs, and tick 54 alone consumes
 * the zero-duration sentinel and hands off to `WaitAnimEnd`.
 */
export function zigzagFastFrameAtTick(ticksSinceStart: number): ZigzagFastFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;
  const state: ZigzagSharedState = { x2: 0, y2: 0, data2: 0, data3: 0 };
  let callback: "Anim_ZigzagFast" | ZigzagFastFrame["callback"] = "Anim_ZigzagFast";
  let moved = false;
  let initializerCalled = false;
  let tryFlipXCalls: ZigzagFastFrame["tryFlipXCalls"] = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    moved = false;
    initializerCalled = false;
    tryFlipXCalls = 0;
    if (callback === "WaitAnimEnd") continue;

    const step = zigzagSharedStep(state);
    moved = step.moved;
    tryFlipXCalls = step.tryFlipXCalls;
    if (callback === "Anim_ZigzagFast") {
      // `Anim_ZigzagFast` overwrites even its callee's callback result.
      initializerCalled = true;
      callback = "Zigzag";
    } else if (step.reachedTerminal) {
      callback = "WaitAnimEnd";
    }
  }

  return {
    x2: state.x2,
    y2: state.y2,
    data0: 0,
    data2: state.data2,
    data3: state.data3,
    moved,
    initializerCalled,
    normalFrontDontFlip: true,
    tryFlipXCalls,
    callback: callback === "Anim_ZigzagFast" ? "Zigzag" : callback,
  };
}

export interface ZigzagSlowFrame extends SpeciesIdleOffset {
  readonly data0: number;
  readonly data2: number;
  readonly data3: number;
  readonly moved: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXCalls: 0 | 1 | 2;
  readonly callback: "Anim_ZigzagSlow" | "WaitAnimEnd";
}

/** Source-order normal-front `Anim_ZigzagSlow` plus shared `Zigzag`. */
export function zigzagSlowFrameAtTick(ticksSinceStart: number): ZigzagSlowFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;
  const state: ZigzagSharedState = { x2: 0, y2: 0, data2: 0, data3: 0 };
  let data0 = 0;
  let callback: ZigzagSlowFrame["callback"] = "Anim_ZigzagSlow";
  let moved = false;
  let tryFlipXCalls: ZigzagSlowFrame["tryFlipXCalls"] = 0;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    moved = false;
    tryFlipXCalls = 0;
    if (callback === "WaitAnimEnd") continue;
    if (state.data2 === 0) data0 = 0;
    if (data0 <= 0) {
      const step = zigzagSharedStep(state);
      moved = step.moved;
      tryFlipXCalls = step.tryFlipXCalls;
      if (step.reachedTerminal) callback = "WaitAnimEnd";
      data0 = 1;
    } else {
      data0 -= 1;
    }
  }
  return { x2: state.x2, y2: state.y2, data0, data2: state.data2, data3: state.data3, moved, normalFrontDontFlip: true,
    tryFlipXCalls, callback };
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

const HORIZONTAL_SHAKE_ACCUMULATOR_LIMIT = 2304;
const HORIZONTAL_SHAKE_AMPLITUDE = 3;

/** Source initializer data[0] values for the normal and slow entry points. */
export const HORIZONTAL_SHAKE_INITIALIZERS = Object.freeze({
  normal: 60,
  slow: 30,
} as const);

function horizontalShakeFrameAtTickWithStep(
  ticksSinceStart: number,
  accumulatorStep: 30 | 60,
): HorizontalShakeFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;

  let data2 = 0;
  let x2 = 0;
  let callback: HorizontalShakeFrame["callback"] = "HorizontalShake";
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (callback === "WaitAnimEnd") continue;
    const counter = data2;
    if (counter > HORIZONTAL_SHAKE_ACCUMULATOR_LIMIT) {
      callback = "WaitAnimEnd";
      x2 = 0;
    } else {
      x2 = gbaSin(counter % 256, HORIZONTAL_SHAKE_AMPLITUDE);
    }
    data2 += accumulatorStep;
  }

  return {
    x2,
    y2: 0,
    data0: accumulatorStep,
    data2,
    data7: HORIZONTAL_SHAKE_AMPLITUDE,
    callback,
  };
}

/**
 * Source-order port of `Anim_HorizontalShake` / `HorizontalShake`
 * (`pokemon_animation.c:1343-1366`). The initializer sets data[0]=60 and
 * data[7]=3, invokes the callback once, then installs `HorizontalShake`.
 * Accumulators 0..2280 are active; tick 39 observes 2340 > 2304, clears x2,
 * and hands off to `WaitAnimEnd` before the final data[2] increment.
 */
export function horizontalShakeFrameAtTick(ticksSinceStart: number): HorizontalShakeFrame | null {
  return horizontalShakeFrameAtTickWithStep(ticksSinceStart, HORIZONTAL_SHAKE_INITIALIZERS.normal);
}

/**
 * Source-order `Anim_HorizontalShake_Slow` port (`pokemon_animation.c:3717-3722`).
 * The initializer writes data[0]=30/data[7]=3, calls the shared reducer once,
 * then installs `HorizontalShake`; active counters 0..2280 occupy ticks 0..76.
 */
export function horizontalShakeSlowFrameAtTick(
  ticksSinceStart: number,
): HorizontalShakeFrame | null {
  return horizontalShakeFrameAtTickWithStep(ticksSinceStart, HORIZONTAL_SHAKE_INITIALIZERS.slow);
}

/** Source-specific initializer for selector 79. */
export const CIRCLE_C_CLOCKWISE_SLOW_INITIALIZER = Object.freeze({
  selector: "ANIM_CIRCLE_C_CLOCKWISE_SLOW",
  sourceId: 79,
  rotation: 512,
  data: 3,
  speed: 12,
  accepted: true,
} as const);

export interface CircleCCounterclockwiseSlowFrame extends SpeciesIdleOffset {
  /** `sprite->data[2]` immediately before this source callback. */
  readonly data2Before: number;
  /** `sprite->data[2]` after the source's final `+= speed`. */
  readonly data2: number;
  /** `(data2 + 192) % 256`, only for active callbacks. */
  readonly index: number | null;
  /** Signed GBA `Sin(index, data)` result, only for active callbacks. */
  readonly sin: number | null;
  /** Signed GBA `Cos(index, data * 2)` result, only for active callbacks. */
  readonly cos: number | null;
  readonly animRotation: 512;
  readonly animData: 3;
  readonly animSpeed: 12;
  /** Tick zero is the initializer's immediate call before callback install. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXBeforeBranch: true;
  readonly tryFlipXAfterCounterIncrement: true;
  /** Both source-order `TryFlipX` calls run, including the terminal branch. */
  readonly tryFlipXCalls: 2;
  readonly callback: "CircleCounterclockwise" | "WaitAnimEnd";
}

/**
 * Source-order port of `Anim_CircleCounterclockwise_Slow` ->
 * `CircleCounterclockwise` (`pokemon_animation.c:1504-1536,3743-3751`) for
 * the ordinary opponent-front path. `AddNewAnim` supplies zeroed animation
 * data before the selector writes rotation=512, data=3, and speed=12. The
 * initializer calls the shared callback once before installing it, so tick
 * zero already consumes counter 0. The callback flips before its strict
 * `data[2] > rotation` guard, clears both offsets on the terminal callback,
 * increments the counter after either branch, and flips once more after the
 * branch. `sDontFlip=TRUE` makes both flips no-ops for a normal front sprite,
 * but their source-order presence remains part of this reducer's contract.
 */
export function circleCCounterclockwiseSlowFrameAtTick(
  ticksSinceStart: number,
): CircleCCounterclockwiseSlowFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;

  const { rotation: animRotation, data: animData, speed: animSpeed } =
    CIRCLE_C_CLOCKWISE_SLOW_INITIALIZER;
  let data2 = 0;
  let callback: CircleCCounterclockwiseSlowFrame["callback"] = "CircleCounterclockwise";
  let lastFrame: CircleCCounterclockwiseSlowFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    // `WaitAnimEnd` only polls the sprite's frame animation. Once the shared
    // callback hands off, this reducer's terminal state remains stable.
    if (callback === "WaitAnimEnd") continue;

    const data2Before = data2;
    let index: number | null = null;
    let sin: number | null = null;
    let cos: number | null = null;
    let x2 = 0;
    let y2 = 0;

    // Source order: TryFlipX, branch, data2 += speed, TryFlipX.
    if (data2 > animRotation) {
      callback = "WaitAnimEnd";
    } else {
      index = (data2 + 192) % 256;
      cos = gbaCos(index, animData * 2);
      sin = gbaSin(index, animData);
      // C's integer negation stores plain zero, not JavaScript's `-0`.
      x2 = cos === 0 ? 0 : -cos;
      y2 = sin + animData;
    }
    data2 += animSpeed;

    lastFrame = {
      x2,
      y2,
      data2Before,
      data2,
      index,
      sin,
      cos,
      animRotation,
      animData,
      animSpeed,
      initializerCallBeforeCallbackInstall: tick === 0,
      normalFrontDontFlip: true,
      tryFlipXBeforeBranch: true,
      tryFlipXAfterCounterIncrement: true,
      tryFlipXCalls: 2,
      callback,
    };
  }

  if (lastFrame === null) throw new Error("unreachable CircleCounterclockwise reducer state");
  return lastFrame;
}

/** Source-specific `Anim_Spin` initializer for front selector 83. */
export const SPIN_INITIALIZER = Object.freeze({
  selector: "ANIM_SPIN",
  sourceId: 83,
  delay: 60,
  data: 30,
  accepted: true,
} as const);

export interface SpinFrame extends SpeciesIdleOffset {
  /** `sprite->data[2]` immediately before this source callback. */
  readonly data2Before: number;
  /** `sprite->data[2]` after the source's unconditional final increment. */
  readonly data2: number;
  /** Signed `s16 sprite->data[6]`; retained across the terminal reset. */
  readonly data6: number;
  readonly animDelay: 60;
  readonly animData: 30;
  /** C-truncated `65536 / animData`, prior to the `s16` product store. */
  readonly rotationStep: 2184;
  /** Tick zero invokes `Spin` before `sprite->callback = Spin` is written. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  readonly startedAffine: boolean;
  readonly affineWriteRotationSigned: number;
  /** Rotation after C converts the signed source argument to `u16`. */
  readonly affineWriteRotationU16: number;
  readonly xScale: 256;
  readonly yScale: 256;
  readonly normalFrontDontFlip: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Spin" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

/**
 * Source-order port of selector 83's `Anim_Spin` -> `Spin`
 * (`pokemon_animation.c:1037-1059,1472-1492,3775-3782,5540-5544`) on the
 * ordinary opponent-front path. `AddNewAnim` clears the animation record,
 * then the initializer writes delay=60/data=30, invokes `Spin` immediately,
 * and only afterward installs `Spin` as the sprite callback.
 *
 * Tick zero starts affine mode and writes rotation zero. Active ticks 0..60
 * calculate `(65536 / 30) * data2` with C's integer division, assign the
 * product through signed `sprite->data[6]`, and pass that bit pattern through
 * `HandleSetAffineData`'s unsigned rotation parameter. Tick 61 alone satisfies
 * the strict `data2 > delay` guard, writes identity, resets affine mode, and
 * installs `WaitAnimEnd`; the source then still increments data2. Subsequent
 * calls model `WaitAnimEnd` polling without mutating this reducer's state.
 */
export function spinFrameAtTick(ticksSinceStart: number): SpinFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;

  const { delay: animDelay, data: animData } = SPIN_INITIALIZER;
  const rotationStep = Math.trunc(65536 / animData) as 2184;
  let data2 = 0;
  let data6 = 0;
  let callback: SpinFrame["callback"] = "Spin";
  let affineMode: SpinFrame["affineMode"] = "normal";
  let lastFrame: SpinFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (callback === "WaitAnimEnd") continue;

    const data2Before = data2;
    const startedAffine = data2 === 0;
    if (startedAffine) affineMode = "double";

    let affineWriteRotationSigned: number;
    let resetSpriteAfterAnim = false;
    if (data2 > animDelay) {
      affineWriteRotationSigned = 0;
      resetSpriteAfterAnim = true;
      affineMode = "normal";
      callback = "WaitAnimEnd";
    } else {
      data6 = toS16(rotationStep * data2);
      affineWriteRotationSigned = data6;
    }
    data2 = toS16(data2 + 1);

    lastFrame = {
      x2: 0,
      y2: 0,
      data2Before,
      data2,
      data6,
      animDelay,
      animData,
      rotationStep,
      initializerCallBeforeCallbackInstall: tick === 0,
      startedAffine,
      affineWriteRotationSigned,
      affineWriteRotationU16: toU16(affineWriteRotationSigned),
      xScale: 256,
      yScale: 256,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim,
      callback,
      affineMode,
    };
  }

  if (lastFrame === null) throw new Error("unreachable Spin reducer state");
  return lastFrame;
}

/** Source-specific `Anim_TumblingFrontFlip_Twice` initializer for selector 84. */
export const TUMBLING_FRONT_FLIP_TWICE_INITIALIZER = Object.freeze({
  selector: "ANIM_TUMBLING_FRONT_FLIP_TWICE",
  sourceId: 84,
  rotation: 0,
  delay: 0,
  runs: 2,
  speed: 1,
  data: 0,
  accepted: true,
} as const);

export interface TumblingFrontFlipTwiceFrame extends SpeciesIdleOffset {
  /** Signed s16 sprite data registers before and after this callback. */
  readonly data2Before: number;
  readonly data2: number;
  readonly data3Before: number;
  readonly data3: number;
  readonly data4Before: number;
  readonly data4: number;
  readonly data5Before: number;
  readonly data5: number;
  readonly data6Before: number;
  readonly data6: number;
  readonly data7Before: number;
  readonly data7: number;
  readonly animRotation: 0;
  readonly animDelayBefore: number;
  readonly animDelay: number;
  readonly animRunsBefore: 1 | 2;
  readonly animRuns: 1 | 2;
  readonly animSpeed: 1;
  readonly animData: 0;
  /** The source tests x-boundaries before its else-if y-boundary. */
  readonly boundary: "x" | "y" | null;
  /** Raw `sprite->data[6] << 8` before HandleSetAffineData's u16 argument. */
  readonly affineRotationShifted: number | null;
  readonly affineRotationU16: number | null;
  readonly affineWriteCount: 0 | 1;
  /** Tick zero invokes TumblingFrontFlip before callback installation. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXBeforeMotion: boolean;
  readonly tryFlipXAfterAffine: boolean;
  readonly tryFlipXCalls: 0 | 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "TumblingFrontFlip" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

/**
 * Source-order port of selector 84's `Anim_TumblingFrontFlip_Twice` ->
 * `TumblingFrontFlip` (`pokemon_animation.c:1037-1059,2366-2433,3785-3793,
 * 5540-5544`) on the ordinary opponent-front path. `AddNewAnim` supplies
 * rotation=0/delay=0/runs=1/speed=0/data=0; the selector changes only speed to
 * one and runs to two, calls the shared callback immediately, then installs
 * it. The task has already set `sDontFlip=TRUE`, so both source-order
 * `TryFlipX` calls are retained as no-ops.
 *
 * All sprite position/data registers are GBA s16 values. The x-boundary test
 * is deliberately an `if` before the y-boundary `else if`; after six
 * crossings the next x2<=0 callback completes a run, arms ten delay-only
 * callbacks, and leaves the direction registers intact for the second run.
 * The affine write uses the source's `data[6] << 8` expression and then the
 * `u16` HandleSetAffineData parameter conversion. Tick 137 resets affine mode
 * and installs stable `WaitAnimEnd`; later calls leave the terminal receipt
 * unchanged.
 */
export function tumblingFrontFlipTwiceFrameAtTick(
  ticksSinceStart: number,
): TumblingFrontFlipTwiceFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;

  const { animRotation, delay: initialDelay, runs: initialRuns, speed: animSpeed, data: animData } = {
    animRotation: TUMBLING_FRONT_FLIP_TWICE_INITIALIZER.rotation,
    delay: TUMBLING_FRONT_FLIP_TWICE_INITIALIZER.delay,
    runs: TUMBLING_FRONT_FLIP_TWICE_INITIALIZER.runs,
    speed: TUMBLING_FRONT_FLIP_TWICE_INITIALIZER.speed,
    data: TUMBLING_FRONT_FLIP_TWICE_INITIALIZER.data,
  } as const;
  let animDelay: number = initialDelay;
  let animRuns: 1 | 2 = initialRuns;
  let data2 = 0;
  let data3 = 0;
  let data4 = 0;
  let data5 = 0;
  let data6 = 0;
  let data7 = 0;
  let x2 = 0;
  let y2 = 0;
  let callback: TumblingFrontFlipTwiceFrame["callback"] = "TumblingFrontFlip";
  let affineMode: TumblingFrontFlipTwiceFrame["affineMode"] = "normal";
  let lastFrame: TumblingFrontFlipTwiceFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (callback === "WaitAnimEnd") continue;

    const data2Before = data2;
    const data3Before = data3;
    const data4Before = data4;
    const data5Before = data5;
    const data6Before = data6;
    const data7Before = data7;
    const animDelayBefore = animDelay;
    const animRunsBefore = animRuns;
    let boundary: TumblingFrontFlipTwiceFrame["boundary"] = null;
    let affineRotationShifted: number | null = null;
    let affineRotationU16: number | null = null;
    let startedAffine = false;
    let tryFlipXBeforeMotion = false;
    let tryFlipXAfterAffine = false;
    let resetSpriteAfterAnim = false;

    if (animDelay !== 0) {
      animDelay = toS16(animDelay - 1);
    } else {
      // TryFlipX(sprite) is a no-op for the normal opponent-front task.
      tryFlipXBeforeMotion = true;
      if (data2 === 0) {
        data2 = toS16(data2 + 1);
        startedAffine = true;
        affineMode = "double";
        data7 = toS16(animSpeed);
        data3 = -1;
        data4 = -1;
        data5 = 0;
        data6 = 0;
      }

      x2 = toS16(x2 + data7 * 2 * data3);
      y2 = toS16(y2 + data7 * data4);
      data6 = toS16(data6 + 8);
      if (x2 <= -16 || x2 >= 16) {
        boundary = "x";
        x2 = toS16(data3 * 16);
        data3 = toS16(data3 * -1);
        data5 = toS16(data5 + 1);
      } else if (y2 <= -16 || y2 >= 16) {
        boundary = "y";
        y2 = toS16(data4 * 16);
        data4 = toS16(data4 * -1);
        data5 = toS16(data5 + 1);
      }

      if (data5 > 5 && x2 <= 0) {
        x2 = 0;
        y2 = 0;
        if (animRuns > 1) {
          animRuns = toS16(animRuns - 1) as 1;
          data5 = 0;
          data6 = 0;
          animDelay = 10;
        } else {
          resetSpriteAfterAnim = true;
          affineMode = "normal";
          callback = "WaitAnimEnd";
        }
      }

      affineRotationShifted = data6 << 8;
      affineRotationU16 = affineRotationShifted & 0xffff;
      tryFlipXAfterAffine = true;
    }

    lastFrame = {
      x2,
      y2,
      data2Before,
      data2,
      data3Before,
      data3,
      data4Before,
      data4,
      data5Before,
      data5,
      data6Before,
      data6,
      data7Before,
      data7,
      animRotation,
      animDelayBefore,
      animDelay,
      animRunsBefore,
      animRuns,
      animSpeed,
      animData,
      boundary,
      affineRotationShifted,
      affineRotationU16,
      affineWriteCount: affineRotationShifted === null ? 0 : 1,
      initializerCallBeforeCallbackInstall: tick === 0,
      startedAffine,
      normalFrontDontFlip: true,
      tryFlipXBeforeMotion,
      tryFlipXAfterAffine,
      tryFlipXCalls: tryFlipXBeforeMotion ? 2 : 0,
      resetSpriteAfterAnim,
      callback,
      affineMode,
    };
  }

  if (lastFrame === null) throw new Error("unreachable TumblingFrontFlip reducer state");
  return lastFrame;
}

/**
 * Source-specific `Anim_Twist` initializer (source selector 18). `AddNewAnim`
 * supplies `runs=1`; this initializer explicitly changes only rotation and
 * delay before its immediate `Twist` call.
 */
export const TWIST_INITIALIZER = Object.freeze({
  selector: "ANIM_TWIST",
  sourceId: 18,
  rotation: 512,
  delay: 0,
  runs: 1,
  accepted: true,
} as const);

/** Source-specific selector-78 initializer for STARYU's twice-twist path. */
export const TWIST_TWICE_INITIALIZER = Object.freeze({
  selector: "ANIM_TWIST_TWICE",
  sourceId: 78,
  rotation: 1024,
  delay: 0,
  runs: 2,
  accepted: true,
} as const);

type TwistInitializer = typeof TWIST_INITIALIZER | typeof TWIST_TWICE_INITIALIZER;

/** Observable source callback state shared by normal and twice-twist. */
export interface TwistFrame extends SpeciesIdleOffset {
  /** `sprite->data[2]` immediately before this source callback. */
  readonly data2Before: number;
  /** `sprite->data[2]` after the source's optional final `+= 16`. */
  readonly data2: number;
  /** Signed `s16 sprite->data[6]`, set only by a rotation-body callback. */
  readonly data6: number;
  /** `AddNewAnim`/`InitAnimData` fields after the initializer overrides. */
  readonly animRotation: 512 | 1024;
  readonly animDelayBefore: number;
  readonly animDelay: number;
  readonly animRunsBefore: 1 | 2;
  readonly animRuns: 1 | 2;
  readonly animSpeed: 0;
  readonly animDataBefore: 0 | 1;
  readonly animData: 1;
  /** Tick zero invokes `Twist` before `sprite->callback = Twist` is written. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  readonly startedAffine: boolean;
  readonly affineWriteCount: 0 | 1;
  /** Signed source rotation argument passed to `HandleSetAffineData`, if any. */
  readonly affineWriteRotationSigned: number | null;
  /** The same rotation after C's `u16` parameter conversion. */
  readonly affineWriteRotationU16: number | null;
  readonly xScale: 256;
  readonly yScale: 256;
  readonly normalFrontDontFlip: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Twist" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

/** Compatibility name for STARYU's already accepted twice-twist reducer. */
export type TwistTwiceFrame = TwistFrame;

/**
 * Shared source-order port of `Anim_Twist` / `Anim_Twist_Twice` -> `Twist`
 * (`pokemon_animation.c:1037-1059,1420-1470,3732-3741,5540-5544`) for the
 * ordinary opponent-front path. `Task_HandleMonAnimation` has already zeroed
 * sprite data and set `sDontFlip=TRUE`; `AddNewAnim` clears its animation-slot
 * record before the source-specific initializer changes its fields, invokes
 * `Twist` immediately, and only then installs it as the sprite callback.
 *
 * The normal selector runs counters 0..512 by 16, then its strict `>` branch
 * writes identity, calls `ResetSpriteAfterAnim`, and hands off to stable
 * `WaitAnimEnd`. The twice selector retains its accepted 1024/2-run behavior:
 * the first strict boundary arms ten delay callbacks and the second terminal
 * boundary restores identity and hands off to `WaitAnimEnd`.
 */
function twistFrameForInitializer(
  initializer: TwistInitializer,
  ticksSinceStart: number,
): TwistFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;

  const animRotation = initializer.rotation;
  let animDelay: number = initializer.delay;
  let animRuns: 1 | 2 = initializer.runs;
  const animSpeed = 0;
  let animData: 0 | 1 = 0;
  let data2 = 0;
  let data6 = 0;
  let callback: TwistFrame["callback"] = "Twist";
  let affineMode: TwistFrame["affineMode"] = "normal";
  let lastFrame: TwistFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    // `WaitAnimEnd` only polls sprite animation completion; this reducer's
    // settled record is intentionally byte-stable until it reaches the dummy.
    if (callback === "WaitAnimEnd") continue;

    const data2Before = data2;
    const animDelayBefore = animDelay;
    const animRunsBefore = animRuns;
    const animDataBefore = animData;
    let startedAffine = false;
    let affineWriteRotationSigned: number | null = null;
    let resetSpriteAfterAnim = false;

    if (animDelay !== 0) {
      animDelay -= 1;
    } else {
      if (data2 === 0 && animData === 0) {
        startedAffine = true;
        affineMode = "double";
        animData = 1;
      }

      if (data2 > animRotation) {
        // `HandleSetAffineData(sprite, 256, 256, 0)` precedes both repeat
        // setup and the terminal ResetSpriteAfterAnim branch.
        affineWriteRotationSigned = 0;
        if (animRuns > 1) {
          animRuns = 1;
          animDelay = 10;
          data2 = 0;
        } else {
          resetSpriteAfterAnim = true;
          affineMode = "normal";
          callback = "WaitAnimEnd";
        }
      } else {
        data6 = gbaSin(data2 % 256, 4096);
        affineWriteRotationSigned = data6;
      }

      // This executes after both repeat and terminal branches in the source.
      data2 += 16;
    }

    // Tick zero's immediate `Twist` body is the only path from InitAnimData's
    // zero to the stable initialized record; every observable callback ends
    // after that source increment.
    if (animData !== 1) throw new Error("Anim_Twist did not initialize animation data");

    lastFrame = {
      x2: 0,
      y2: 0,
      data2Before,
      data2,
      data6,
      animRotation,
      animDelayBefore,
      animDelay,
      animRunsBefore,
      animRuns,
      animSpeed,
      animDataBefore,
      animData,
      initializerCallBeforeCallbackInstall: tick === 0,
      startedAffine,
      affineWriteCount: affineWriteRotationSigned === null ? 0 : 1,
      affineWriteRotationSigned,
      affineWriteRotationU16: affineWriteRotationSigned === null
        ? null
        : affineWriteRotationSigned & 0xffff,
      xScale: 256,
      yScale: 256,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim,
      callback,
      affineMode,
    };
  }

  if (lastFrame === null) throw new Error("unreachable Twist reducer state");
  return lastFrame;
}

/** Exact one-run selector-18 `Anim_Twist` lifecycle. */
export function twistFrameAtTick(ticksSinceStart: number): TwistFrame | null {
  return twistFrameForInitializer(TWIST_INITIALIZER, ticksSinceStart);
}

/** Exact twice-twist selector-78 lifecycle, retained as a regression export. */
export function twistTwiceFrameAtTick(ticksSinceStart: number): TwistTwiceFrame | null {
  return twistFrameForInitializer(TWIST_TWICE_INITIALIZER, ticksSinceStart);
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
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;

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
 * Shared source-order port of `Anim_VerticalSlideWobble` /
 * `Anim_VerticalSlideWobble_Small` -> `VerticalSlideWobble`
 * (`pokemon_animation.c:911-939,984-1028,1735-1766,3753-3758`). The
 * front-animation task has zeroed data0/data2..data7 and set
 * `sDontFlip=TRUE`; each initializer writes its amplitude and immediately
 * calls the shared callback before installing it.
 *
 * Tick 0 starts affine mode before the first writes. Ticks 0..100 use C
 * truncation for both integer indices, mask the doubled wobble index to u8,
 * write GBA sine y2, and cross the signed-s16 `Sin` result into the u16
 * `HandleSetAffineData` rotation parameter without opponent-front flipping.
 * Tick 101 restores identity affine/y2, calls `ResetSpriteAfterAnim`, installs
 * `WaitAnimEnd`, and still performs the source's final data2 increment.
 */
function verticalSlideWobbleFrameAtTickWithAmplitude(
  ticksSinceStart: number,
  data0: 5 | 10,
): VerticalSlideWobbleFrame | null {
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
    initializerCallBeforeCallbackInstall: ticksSinceStart === 0,
    startedAffine: core.startedAffine,
    normalFrontDontFlip: true,
    resetSpriteAfterAnim: core.resetSpriteAfterAnim,
    callback: core.waiting ? "WaitAnimEnd" : "VerticalSlideWobble",
    affineMode: core.affineMode,
  };
}

/** Selector 28's normal-amplitude `Anim_VerticalSlideWobble` entry point. */
export function verticalSlideWobbleFrameAtTick(
  ticksSinceStart: number,
): VerticalSlideWobbleFrame | null {
  return verticalSlideWobbleFrameAtTickWithAmplitude(
    ticksSinceStart,
    VERTICAL_SLIDE_WOBBLE_INITIALIZERS.normal.data0,
  );
}

/** Selector 81's small-amplitude `Anim_VerticalSlideWobble_Small` entry point. */
export function verticalSlideWobbleSmallFrameAtTick(
  ticksSinceStart: number,
): VerticalSlideWobbleFrame | null {
  return verticalSlideWobbleFrameAtTickWithAmplitude(
    ticksSinceStart,
    VERTICAL_SLIDE_WOBBLE_INITIALIZERS.small.data0,
  );
}

/**
 * Source-order `HorizontalSlide` reducer shared by the normal and slow
 * opponent-front initializers (`pokemon_animation.c:911-939,1131-1153,
 * 3665-3669`). `Task_HandleMonAnimation` zeroes data2 and sets
 * `sDontFlip=TRUE`; each initializer writes data0, immediately runs this
 * callback, and then installs it. Active ticks perform both no-op `TryFlipX`
 * calls, write the C-truncated sine index/x2, and increment data2. The first
 * tick after data2 exceeds data0 clears x2, installs `WaitAnimEnd`, still
 * increments data2, and performs the second no-op flip.
 */
function horizontalSlideFrameAtTickWithDuration(
  ticksSinceStart: number,
  data0: 40 | 80,
): HorizontalSlideFrame | null {
  if (ticksSinceStart < 0) return null;

  if (ticksSinceStart > data0) {
    return {
      x2: 0,
      y2: 0,
      data0,
      data2: data0 + 2,
      index: null,
      amplitude: 6,
      initializerCallBeforeCallbackInstall: false,
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
    initializerCallBeforeCallbackInstall: ticksSinceStart === 0,
    normalFrontDontFlip: true,
    tryFlipXCalls: 2,
    callback: "HorizontalSlide",
  };
}

/** Selector 3's normal-duration `Anim_HorizontalSlide` entry point. */
export function horizontalSlideFrameAtTick(
  ticksSinceStart: number,
): HorizontalSlideFrame | null {
  return horizontalSlideFrameAtTickWithDuration(
    ticksSinceStart,
    HORIZONTAL_SLIDE_INITIALIZERS.normal.data0,
  );
}

/** Selector 70's slow-duration `Anim_HorizontalSlide_Slow` entry point. */
export function horizontalSlideSlowFrameAtTick(
  ticksSinceStart: number,
): HorizontalSlideFrame | null {
  return horizontalSlideFrameAtTickWithDuration(
    ticksSinceStart,
    HORIZONTAL_SLIDE_INITIALIZERS.slow.data0,
  );
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

const VERTICAL_JUMPS_HORIZONTAL_JUMPS_STEP = 12;
const VERTICAL_JUMPS_HORIZONTAL_JUMPS_LIMIT = 768;

/**
 * Source-order opponent-front port of `Anim_VerticalJumpsHorizontalJumps`
 * (`pokemon_animation.c:911-939,1217-1255`). `Task_HandleMonAnimation`
 * zeroes data2 before installing this callback. Counters 0..768 in steps of
 * 12 are active and use the ROM's `Sin` helper (`trig.c:514-518`, signed
 * multiply followed by arithmetic `>> 8`); counter 780 satisfies the strict
 * `> 768` guard, clears x2/y2, installs `WaitAnimEnd`, and increments data2.
 *
 * The switch is intentionally stateful: case 2 rewrites only its local
 * counter before y2, while switch ranges without an x2 assignment retain the
 * preceding callback's x2. That includes divCounter 6 at counter 768.
 * `WaitAnimEnd` then restores `SpriteCallbackDummy` once the OAM anim ends
 * (`pokemon_animation.c:5540-5544`) without changing these fields.
 */
export function verticalJumpsHorizontalJumpsFrameAtTick(
  ticksSinceStart: number,
): VerticalJumpsHorizontalJumpsFrame | null {
  if (ticksSinceStart < 0) return null;

  let data2 = 0;
  let x2 = 0;
  let y2 = 0;
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const counter = data2;
    if (counter > VERTICAL_JUMPS_HORIZONTAL_JUMPS_LIMIT) {
      x2 = 0;
      y2 = 0;
      data2 += VERTICAL_JUMPS_HORIZONTAL_JUMPS_STEP;
      return {
        x2,
        y2,
        data0: 0,
        data2,
        counter,
        divCounter: null,
        yCounter: null,
        remainder: null,
        x2Written: true,
        normalFrontDontFlip: true,
        callback: "WaitAnimEnd",
      };
    }

    const divCounter = Math.trunc(counter / 128) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    let yCounter = counter;
    let x2Written = false;
    switch (divCounter) {
      case 0:
      case 1:
        x2 = 0;
        x2Written = true;
        break;
      case 2:
        yCounter = 0;
        break;
      case 3:
        x2 = Math.trunc(-((counter % 128) * 8) / 128) + 0;
        x2Written = true;
        break;
      case 4:
        x2 = Math.trunc((counter % 128) / 8) - 8;
        x2Written = true;
        break;
      case 5:
        x2 = Math.trunc(-((counter % 128) * 8) / 128) + 8;
        x2Written = true;
        break;
      case 6:
        break;
    }

    const remainder = yCounter % 128;
    y2 = -gbaSin(remainder, 8) + 0;
    data2 += VERTICAL_JUMPS_HORIZONTAL_JUMPS_STEP;

    if (tick === ticksSinceStart) {
      return {
        x2,
        y2,
        data0: 0,
        data2,
        counter,
        divCounter,
        yCounter,
        remainder,
        x2Written,
        normalFrontDontFlip: true,
        callback: "Anim_VerticalJumpsHorizontalJumps",
      };
    }
  }

  throw new Error("unreachable VerticalJumpsHorizontalJumps reducer state");
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

/** Source selector 17's task-installed direct callback receipt. */
export const CIRCULAR_VIBRATE_ENTRY = Object.freeze({
  selector: "ANIM_CIRCULAR_VIBRATE",
  sourceId: 17,
  taskZeroedData2: true,
  callbackInstalled: "Anim_CircularVibrate",
  callbackInvokedByInitializer: false,
  normalFrontDontFlip: true,
  accepted: true,
} as const);

export interface CircularVibrateFrame extends SpeciesIdleOffset {
  /** `sprite->data[2]` before this callback's strict terminal guard. */
  readonly data2Before: number;
  /** `sprite->data[2]` after this callback's unconditional `+= 9`. */
  readonly data2: number;
  /** C-truncated `data[2] / 4` passed to the amplitude sine. */
  readonly amplitudeIndex: number | null;
  /** `Sin(amplitudeIndex, 8)`, then used as the next sine/cosine amplitude. */
  readonly amplitude: number | null;
  /** `data[2] % 256` passed to the motion sine/cosine pair. */
  readonly index: number | null;
  readonly sign: -1 | 1 | null;
  readonly motionX2: number | null;
  readonly motionY2: number | null;
  readonly normalFrontDontFlip: true;
  readonly resetPosition: boolean;
  readonly callback: "Anim_CircularVibrate" | "WaitAnimEnd";
}

/**
 * Source-order normal-front port of selector 17's direct
 * `Anim_CircularVibrate` callback (`pokemon_animation.c:1392-1418`).
 * `Task_HandleMonAnimation` already zeroes data[2] and installs this function,
 * so callback tick zero begins at accumulator zero; unlike neighboring
 * animation families it has no separate initializer and no `TryFlipX` call.
 *
 * The active callbacks are ticks 0..56 (accumulators 0..504). Each derives a
 * signed amplitude before applying the parity-selected sign to both sine and
 * cosine position writes. Tick 57 sees 513, clears both position fields,
 * installs `WaitAnimEnd`, and still performs the source's final `+= 9`.
 */
export function circularVibrateFrameAtTick(
  ticksSinceStart: number,
): CircularVibrateFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;

  let data2 = 0;
  let x2 = 0;
  let y2 = 0;
  let callback: CircularVibrateFrame["callback"] = "Anim_CircularVibrate";
  let lastFrame: CircularVibrateFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (callback === "WaitAnimEnd") continue;

    const data2Before = data2;
    let amplitudeIndex: number | null = null;
    let amplitude: number | null = null;
    let index: number | null = null;
    let sign: -1 | 1 | null = null;
    let motionX2: number | null = null;
    let motionY2: number | null = null;
    let resetPosition = false;

    if (data2 > 512) {
      x2 = 0;
      y2 = 0;
      resetPosition = true;
      callback = "WaitAnimEnd";
    } else {
      sign = (data2 & 1) === 0 ? 1 : -1;
      amplitudeIndex = Math.trunc(data2 / 4);
      amplitude = gbaSin(amplitudeIndex, 8);
      index = data2 % 256;
      motionY2 = toS16(gbaSin(index, amplitude) * sign);
      motionX2 = toS16(gbaCos(index, amplitude) * sign);
      y2 = motionY2;
      x2 = motionX2;
    }

    data2 = toS16(data2 + 9);
    lastFrame = {
      x2,
      y2,
      data2Before,
      data2,
      amplitudeIndex,
      amplitude,
      index,
      sign,
      motionX2,
      motionY2,
      normalFrontDontFlip: true,
      resetPosition,
      callback,
    };
  }

  if (lastFrame === null) throw new Error("unreachable CircularVibrate reducer state");
  return lastFrame;
}

/** Source selector 21's task-installed direct callback receipt. */
export const GLOW_BLACK_ENTRY = Object.freeze({
  selector: "ANIM_GLOW_BLACK",
  sourceId: 21,
  taskZeroedData2: true,
  taskZeroedData6: true,
  taskZeroedData7: true,
  callbackInstalled: "Anim_GlowBlack",
  callbackInvokedByInitializer: false,
  normalFrontDontFlip: true,
  accepted: true,
} as const);

export interface GlowBlackFrame extends SpeciesIdleOffset {
  /** `sprite->data[2]` before the callback's strict terminal guard. */
  readonly data2Before: number;
  /** `sprite->data[2]` after the callback's unconditional signed-s16 increment. */
  readonly data2: number;
  /** Last sine result stored in signed `sprite->data[6]`. */
  readonly data6: number;
  /** Captured OBJ palette start stored in signed `sprite->data[7]`. */
  readonly data7: number;
  readonly paletteNum: number;
  readonly paletteStart: number;
  readonly paletteCount: 16;
  readonly blendCoefficient: number;
  readonly blendColor: 0;
  readonly paletteWrite: boolean;
  readonly restoredPalette: boolean;
  readonly normalFrontDontFlip: true;
  readonly callback: "Anim_GlowBlack" | "WaitAnimEnd";
}

/**
 * Source-order normal-front port of selector 21's `GlowColor(RGB_BLACK, 16, 1)`
 * expansion (`pokemon_animation.c:911-939,1539-1560`). The task zeroes
 * data2/data6/data7 and directly installs `Anim_GlowBlack`; callback zero
 * captures `OBJ_PLTT_ID(oam.paletteNum)`. Active callbacks 0..128 write the
 * GBA sine coefficient to all 16 OBJ-palette entries. Callback 129 observes
 * the strict `data2 > 128` boundary, restores coefficient zero, installs
 * `WaitAnimEnd`, and still increments data2. The terminal receipt is stable.
 */
export function glowBlackFrameAtTick(
  ticksSinceStart: number,
  paletteNum = 0,
): GlowBlackFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;
  if (!Number.isInteger(paletteNum) || !Number.isFinite(paletteNum)) return null;

  const normalizedPaletteNum = paletteNum & 0xf;
  const paletteStart = 0x100 + normalizedPaletteNum * 16;
  let data2 = 0;
  let data6 = 0;
  let data7 = 0;
  let callback: GlowBlackFrame["callback"] = "Anim_GlowBlack";
  let lastFrame: GlowBlackFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (callback === "WaitAnimEnd") continue;

    const data2Before = data2;
    if (data2 === 0) data7 = toS16(paletteStart);

    let blendCoefficient: number;
    let restoredPalette = false;
    if (data2 > 128) {
      blendCoefficient = 0;
      restoredPalette = true;
      callback = "WaitAnimEnd";
    } else {
      data6 = toS16(gbaSin(data2, 16));
      blendCoefficient = data6;
    }

    data2 = toS16(data2 + 1);
    lastFrame = {
      x2: 0,
      y2: 0,
      data2Before,
      data2,
      data6,
      data7,
      paletteNum: normalizedPaletteNum,
      paletteStart,
      paletteCount: 16,
      blendCoefficient,
      blendColor: 0,
      paletteWrite: true,
      restoredPalette,
      normalFrontDontFlip: true,
      callback,
    };
  }

  if (lastFrame === null) throw new Error("unreachable GlowBlack reducer state");
  return lastFrame;
}

/** Source selector 43's initializer-only `Anim_Figure8` receipt. */
export const FIGURE_8_INITIALIZER = Object.freeze({
  selector: "ANIM_FIGURE_8",
  sourceId: 43,
  handleStartAffineAnimCalls: 1,
  data6: 0,
  data7: 0,
  callbackInstalled: "Figure8",
  figure8BodyCalls: 0,
  normalFrontDontFlip: true,
  affineMode: "double",
  accepted: true,
} as const);

export interface Figure8AffineWrite {
  readonly source: "phase-negative" | "phase-identity" | "terminal-identity";
  readonly xScaleSigned: -256 | 256;
  /** The signed x-scale's exact 16-bit argument pattern. */
  readonly xScaleU16: 0xff00 | 0x0100;
  readonly yScaleSigned: 256;
  readonly yScaleU16: 0x0100;
  readonly rotationSigned: 0;
  readonly rotationU16: 0;
}

export interface Figure8Frame extends SpeciesIdleOffset {
  readonly data6Before: number;
  readonly data6: number;
  readonly data7Before: 0 | 1 | 2;
  readonly data7: 0 | 1 | 2;
  readonly xSineIndex: number;
  readonly ySineIndex: number;
  readonly xSine: number;
  readonly ySine: number;
  /** Position writes immediately after both source `Sin` calls. */
  readonly motionX2: number;
  readonly motionY2: number;
  readonly affineWrites: readonly Figure8AffineWrite[];
  readonly affineWriteCount: 0 | 1;
  readonly affineXScaleSigned: -256 | 256;
  readonly affineXScaleU16: 0xff00 | 0x0100;
  readonly affineYScaleSigned: 256;
  readonly affineYScaleU16: 0x0100;
  readonly affineRotationU16: 0;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXBeforeMotion: true;
  readonly tryFlipXAfterTerminalCheck: true;
  readonly tryFlipXCalls: 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "Figure8" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

function figure8AffineWrite(
  source: Figure8AffineWrite["source"],
  xScaleSigned: -256 | 256,
): Figure8AffineWrite {
  return {
    source,
    xScaleSigned,
    xScaleU16: toU16(xScaleSigned) as 0xff00 | 0x0100,
    yScaleSigned: 256,
    yScaleU16: 0x0100,
    rotationSigned: 0,
    rotationU16: 0,
  };
}

/**
 * Source-order port of selector 43's `Anim_Figure8` -> `Figure8`
 * (`pokemon_animation.c:1003-1034,2435-2471,5540-5544`) for the ordinary
 * opponent-front `Task_HandleMonAnimation` path. The initializer starts
 * affine mode, zeroes data6/data7, and installs `Figure8` without invoking
 * its body. Callback tick zero is therefore the first body call.
 *
 * Every callback retains both source-order `TryFlipX` calls as no-ops because
 * the task set `sDontFlip=TRUE`, increments signed data6 by four before both
 * signed GBA sine writes, and evaluates the `>192` phase before the `>64`
 * phase. The strict terminal callback is tick 63 (data6 252 -> 256); it clears
 * position, writes identity, resets affine mode, and installs stable
 * `WaitAnimEnd` on that same callback.
 */
export function figure8FrameAtTick(ticksSinceStart: number): Figure8Frame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;

  let data6: number = FIGURE_8_INITIALIZER.data6;
  let data7: 0 | 1 | 2 = FIGURE_8_INITIALIZER.data7;
  let x2 = 0;
  let y2 = 0;
  let affineXScaleSigned: -256 | 256 = 256;
  let callback: Figure8Frame["callback"] = "Figure8";
  let affineMode: Figure8Frame["affineMode"] = "double";
  let lastFrame: Figure8Frame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (callback === "WaitAnimEnd") continue;

    const data6Before = data6;
    const data7Before = data7;
    data6 = toS16(data6 + 4);
    const xSineIndex = data6;
    const ySineIndex = (data6 * 2) & 0xff;
    const xSine = gbaSin(xSineIndex, 16);
    const ySine = gbaSin(ySineIndex, 8);
    const motionX2 = toS16(-xSine);
    const motionY2 = toS16(-ySine);
    x2 = motionX2;
    y2 = motionY2;

    const affineWrites: Figure8AffineWrite[] = [];
    if (data6 > 192 && data7 === 1) {
      affineXScaleSigned = 256;
      affineWrites.push(figure8AffineWrite("phase-identity", affineXScaleSigned));
      data7 = 2;
    } else if (data6 > 64 && data7 === 0) {
      affineXScaleSigned = -256;
      affineWrites.push(figure8AffineWrite("phase-negative", affineXScaleSigned));
      data7 = 1;
    }

    let resetSpriteAfterAnim = false;
    if (data6 > 255) {
      x2 = 0;
      y2 = 0;
      affineXScaleSigned = 256;
      affineWrites.push(figure8AffineWrite("terminal-identity", affineXScaleSigned));
      resetSpriteAfterAnim = true;
      affineMode = "normal";
      callback = "WaitAnimEnd";
    }

    lastFrame = {
      x2,
      y2,
      data6Before,
      data6,
      data7Before,
      data7,
      xSineIndex,
      ySineIndex,
      xSine,
      ySine,
      motionX2,
      motionY2,
      affineWrites,
      affineWriteCount: affineWrites.length as 0 | 1,
      affineXScaleSigned,
      affineXScaleU16: toU16(affineXScaleSigned) as 0xff00 | 0x0100,
      affineYScaleSigned: 256,
      affineYScaleU16: 0x0100,
      affineRotationU16: 0,
      normalFrontDontFlip: true,
      tryFlipXBeforeMotion: true,
      tryFlipXAfterTerminalCheck: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim,
      callback,
      affineMode,
    };
  }

  if (lastFrame === null) throw new Error("unreachable Figure8 reducer state");
  return lastFrame;
}

/** Source selector 37's direct `Anim_BackAndLunge` initializer receipt. */
export const BACK_AND_LUNGE_INITIALIZER = Object.freeze({
  selector: "ANIM_BACK_AND_LUNGE",
  sourceId: 37,
  handleStartAffineAnimCalls: 1,
  callbackInvokedByInitializer: false,
  callbackInstalled: "BackAndLunge_0",
  normalFrontDontFlip: true,
  affineMode: "double",
  accepted: true,
} as const);

export interface BackAndLungeFrame extends SpeciesIdleOffset {
  readonly phase: "BackAndLunge_0" | "BackAndLunge_1" | "BackAndLunge_2" | "BackAndLunge_3" | "BackAndLunge_4";
  readonly data2Before: number;
  readonly data2: number;
  readonly data3Before: number;
  readonly data3: number;
  readonly data4Before: number;
  readonly data4: number;
  readonly data5Before: number;
  readonly data5: number;
  readonly data6Before: number;
  readonly data6: number;
  readonly data7Before: number;
  readonly data7: number;
  readonly rotationU8: number | null;
  readonly affineRotationShifted: number | null;
  readonly affineRotationU16: number | null;
  readonly affineWriteCount: 0 | 1;
  readonly initializerCalled: boolean;
  readonly callbackInvokedByInitializer: false;
  readonly startedAffine: boolean;
  readonly normalFrontDontFlip: true;
  readonly tryFlipXBeforeMotion: true;
  readonly tryFlipXAfterMotion: true;
  readonly tryFlipXCalls: 2;
  readonly resetSpriteAfterAnim: boolean;
  readonly callback: "BackAndLunge_0" | "BackAndLunge_1" | "BackAndLunge_2" | "BackAndLunge_3" | "BackAndLunge_4" | "WaitAnimEnd";
  readonly affineMode: "double" | "normal";
}

/**
 * Source-order normal-front port of selector 37's
 * `Anim_BackAndLunge` -> `BackAndLunge_0` through `_4`
 * (`pokemon_animation.c:1037-1059,2028-2140,5540-5544`). The task has
 * already set `sDontFlip=TRUE` and zeroed data[2..7], so both source-order
 * `TryFlipX` calls in every active callback are retained as no-ops.
 *
 * All sprite/data registers are reduced as signed s16 values. The local
 * `var` in `_1` is a u8, and `_2`'s rotation is the source u8 quotient. The
 * affine writes preserve the source's shifted rotation before its u16
 * `HandleSetAffineData` argument conversion. Tick 32 is the strict terminal
 * `_4` callback; `WaitAnimEnd` then remains stable.
 */
export function backAndLungeFrameAtTick(ticksSinceStart: number): BackAndLungeFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;

  let x2 = 0;
  let y2 = 0;
  let data2 = 0;
  let data3 = 0;
  let data4 = 0;
  let data5 = 0;
  let data6 = 0;
  let data7 = 0;
  let callback: BackAndLungeFrame["callback"] = "BackAndLunge_0";
  let affineMode: BackAndLungeFrame["affineMode"] = "double";
  let lastFrame: BackAndLungeFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (callback === "WaitAnimEnd") continue;

    const phase = callback as BackAndLungeFrame["phase"];
    const data2Before = data2;
    const data3Before = data3;
    const data4Before = data4;
    const data5Before = data5;
    const data6Before = data6;
    const data7Before = data7;
    let rotationU8: number | null = null;
    let affineRotationShifted: number | null = null;
    let affineRotationU16: number | null = null;
    let resetSpriteAfterAnim = false;

    if (phase === "BackAndLunge_0") {
      x2 = toS16(x2 + 1);
      if (x2 > 7) {
        x2 = 8;
        data7 = 2;
        callback = "BackAndLunge_1";
      }
    } else if (phase === "BackAndLunge_1") {
      x2 = toS16(x2 - data7);
      data7 = toS16(data7 + 1);
      if (x2 <= 0) {
        let subResult = x2;
        let varU8 = data7 & 0xff;
        data6 = 0;
        do {
          subResult = toS16(subResult - varU8);
          data6 = toS16(data6 + 1);
          varU8 = (varU8 + 1) & 0xff;
        } while (subResult > -8);
        data5 = 1;
        callback = "BackAndLunge_2";
      }
    } else if (phase === "BackAndLunge_2") {
      x2 = toS16(x2 - data7);
      data7 = toS16(data7 + 1);
      rotationU8 = Math.trunc((data5 * 6) / data6) & 0xff;
      data5 = toS16(data5 + 1);
      if (data5 > data6) data5 = data6;
      affineRotationShifted = rotationU8 * 256;
      affineRotationU16 = affineRotationShifted & 0xffff;
      if (x2 < -8) {
        x2 = -8;
        data4 = 2;
        data3 = 0;
        data2 = rotationU8;
        callback = "BackAndLunge_3";
      }
    } else if (phase === "BackAndLunge_3") {
      if (data3 > 11) {
        data2 = toS16(data2 - 2);
        if (data2 < 0) data2 = 0;
        affineRotationShifted = data2 << 8;
        affineRotationU16 = affineRotationShifted & 0xffff;
        if (data2 === 0) callback = "BackAndLunge_4";
      } else {
        x2 = toS16(x2 + data4);
        data4 = toS16(data4 * -1);
        data3 = toS16(data3 + 1);
      }
    } else {
      x2 = toS16(x2 + 2);
      if (x2 > 0) {
        x2 = 0;
        resetSpriteAfterAnim = true;
        affineMode = "normal";
        callback = "WaitAnimEnd";
      }
    }

    lastFrame = {
      x2,
      y2,
      phase,
      data2Before,
      data2,
      data3Before,
      data3,
      data4Before,
      data4,
      data5Before,
      data5,
      data6Before,
      data6,
      data7Before,
      data7,
      rotationU8,
      affineRotationShifted,
      affineRotationU16,
      affineWriteCount: affineRotationShifted === null ? 0 : 1,
      initializerCalled: tick === 0,
      callbackInvokedByInitializer: BACK_AND_LUNGE_INITIALIZER.callbackInvokedByInitializer,
      startedAffine: tick === 0,
      normalFrontDontFlip: true,
      tryFlipXBeforeMotion: true,
      tryFlipXAfterMotion: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim,
      callback,
      affineMode,
    };
  }

  if (lastFrame === null) throw new Error("unreachable BackAndLunge reducer state");
  return lastFrame;
}

function computeTerminalOffset(family: SpeciesFrontAnimFamily): SpeciesIdleOffset {
  switch (family) {
    case "BACK_AND_LUNGE": {
      const terminal = backAndLungeFrameAtTick(32);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_BackAndLunge did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "BOUNCE_ROTATE_TO_SIDES": {
      const terminal = bounceRotateToSidesFrameAtTick(87);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_BounceRotateToSides did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "BOUNCE_ROTATE_TO_SIDES_SMALL": {
      const terminal = bounceRotateToSidesSmallFrameAtTick(87);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_BounceRotateToSides_Small did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW": {
      const terminal = bounceRotateToSidesSmallSlowFrameAtTick(167);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_BounceRotateToSides_SmallSlow did not reach terminal cleanup");
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
    case "CIRCLE_INTO_BG": {
      const terminal = circleIntoBackgroundFrameAtTick(65);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_CircleIntoBackground did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "CIRCLE_C_CLOCKWISE_SLOW": {
      const terminal = circleCCounterclockwiseSlowFrameAtTick(43);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_CircleCounterclockwise_Slow did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "CIRCULAR_VIBRATE": {
      const terminal = circularVibrateFrameAtTick(57);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_CircularVibrate did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "GLOW_BLACK": {
      const terminal = glowBlackFrameAtTick(129);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_GlowBlack did not restore its palette at the terminal boundary");
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
    case "FOUR_PETAL": {
      const terminal = fourPetalFrameAtTick(63);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_FourPetal did not reach terminal cleanup");
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
    case "SPIN": {
      const terminal = spinFrameAtTick(61);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_Spin did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "TUMBLING_FRONT_FLIP_TWICE": {
      const terminal = tumblingFrontFlipTwiceFrameAtTick(137);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_TumblingFrontFlip_Twice did not reach terminal cleanup");
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
    case "FLICKER_INCREASING": {
      const terminal = flickerIncreasingFrameAtTick(65);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_FlickerIncreasing did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "FIGURE_8": {
      const terminal = figure8FrameAtTick(63);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_Figure8 did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "GROW_IN_STAGES": {
      const terminal = growInStagesFrameAtTick(114);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_GrowInStages did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "LUNGE_GROW": {
      const terminal = lungeGrowFrameAtTick(65);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_LungeGrow did not reach terminal cleanup");
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
    case "H_SLIDE": {
      const terminal = horizontalSlideFrameAtTick(41);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_HorizontalSlide did not reach terminal cleanup");
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
    case "H_JUMPS_V_STRETCH_TWICE": {
      const terminal = horizontalJumpsVerticalStretchTwiceFrameAtTick(156);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error(
          "Anim_HorizontalJumpsVerticalStretch_Twice did not reach terminal cleanup",
        );
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
    case "H_SHAKE_SLOW": {
      const terminal = horizontalShakeSlowFrameAtTick(77);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_HorizontalShake_Slow did not reach its source terminal cleanup");
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
    case "ROTATE_UP_TO_SIDES": {
      const terminal = rotateUpToSidesFrameAtTick(32);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_RotateUpToSides did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "SWING_CONCAVE": {
      const terminal = swingConcaveFrameAtTick(101);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_SwingConcave did not reach its source terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "TWIST": {
      const terminal = twistFrameAtTick(33);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_Twist did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "TWIST_TWICE": {
      const terminal = twistTwiceFrameAtTick(140);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_Twist_Twice did not reach terminal cleanup");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "V_JUMPS_BIG": {
      const terminal = verticalJumpsBigFrameAtTick(33);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalJumps_Big did not reach its source terminal cleanup");
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
    case "V_JUMPS_H_JUMPS": {
      const terminal = verticalJumpsHorizontalJumpsFrameAtTick(65);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error(
          "Anim_VerticalJumpsHorizontalJumps did not reach its source terminal cleanup",
        );
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
    case "V_SLIDE_SLOW": {
      const terminal = verticalSlideSlowFrameAtTick(81);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalSlide_Slow did not reach its source terminal cleanup");
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
    case "V_SLIDE_WOBBLE_SMALL": {
      const terminal = verticalSlideWobbleSmallFrameAtTick(101);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_VerticalSlideWobble_Small did not reach terminal cleanup");
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
    case "ZIGZAG_FAST": {
      const terminal = zigzagFastFrameAtTick(54);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_ZigzagFast did not reach its source terminal sentinel");
      }
      return { x2: terminal.x2, y2: terminal.y2 };
    }
    case "ZIGZAG_SLOW": {
      const terminal = zigzagSlowFrameAtTick(108);
      if (terminal === null || terminal.callback !== "WaitAnimEnd") {
        throw new Error("Anim_ZigzagSlow did not reach its source terminal sentinel");
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
