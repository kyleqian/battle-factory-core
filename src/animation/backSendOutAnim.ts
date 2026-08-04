import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import frontierMons from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../data/gen/send-out-anim-selector-tables.json" with { type: "json" };

/**
 * Player-side back-sprite send-out animations (`pokemon_animation.c`).
 *
 * This is deliberately separate from `speciesIdleAnim.ts`: a front sprite is
 * selected by `sMonFrontAnimIdsTable`, while `BattleAnimateBackSprite` calls
 * `GetSpeciesBackAnimSet` and then selects one of three back callbacks from
 * the player's nature. Sharing a callback spelling (for example
 * `ANIM_H_VIBRATE`) is not a coverage alias between the two routes.
 */

const speciesToBackAnimSet = selectorTables.speciesToBackAnimSet.species as Readonly<Record<string, string>>;
const backAnimNatureMod = selectorTables.backAnimNatureMod.natures as Readonly<Record<string, number>>;
const backAnimationIds = selectorTables.backAnimationIds.sets as Readonly<Record<string, readonly string[]>>;
const frontAnimIds = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;

const BACK_ANIM_SET_NAMES = Object.freeze(Object.keys(backAnimationIds));
const BACK_ANIM_NATURE_NAMES = Object.freeze(Object.keys(backAnimNatureMod));
const factorySpecies = new Set(
  (frontierMons.entries as readonly { readonly species: string }[])
    .map(({ species }) => species.replace(/^SPECIES_/, "")),
);

/** The source's complete generated back-routing census, not a front count. */
export const BACK_SEND_OUT_ANIMATION_CENSUS = Object.freeze({
  backAnimSets: BACK_ANIM_SET_NAMES.length,
  selectorVariants: Object.values(backAnimationIds).flat().length,
  speciesMappings: Object.keys(speciesToBackAnimSet).length,
  factoryMappings: Object.keys(speciesToBackAnimSet)
    .filter((species) => factorySpecies.has(species)).length,
  outsideFactoryMappings: Object.keys(speciesToBackAnimSet)
    .filter((species) => !factorySpecies.has(species)).length,
} as const);

/** Source-order numeric nature ids used by `GetNature` / `sBackAnimNatureModTable`. */
export const BACK_ANIM_NATURE_ORDER: readonly string[] = BACK_ANIM_NATURE_NAMES;

/** Every species selected by the generated `BACK_ANIM_H_VIBRATE` source row. */
export const BACK_H_VIBRATE_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_H_VIBRATE")
    .map(([species]) => species),
);

/** The complete H-vibrate back set is Factory-reachable. */
export const BACK_H_VIBRATE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_VIBRATE_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** There are no outside-Factory mappings for this one bounded back set. */
export const BACK_H_VIBRATE_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_VIBRATE_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_H_SLIDE` source row. */
export const BACK_H_SLIDE_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_H_SLIDE")
    .map(([species]) => species),
);

/** The complete H-slide back set is Factory-reachable. */
export const BACK_H_SLIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_SLIDE_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** There are no outside-Factory mappings for this one bounded back set. */
export const BACK_H_SLIDE_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_SLIDE_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_H_SPRING` source row. */
export const BACK_H_SPRING_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_H_SPRING")
    .map(([species]) => species),
);

/** The complete H-spring back set is Factory-reachable. */
export const BACK_H_SPRING_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_SPRING_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** There are no outside-Factory mappings for this one bounded back set. */
export const BACK_H_SPRING_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_SPRING_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_H_SPRING_REPEATED` row. */
export const BACK_H_SPRING_REPEATED_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_H_SPRING_REPEATED")
    .map(([species]) => species),
);

/** Both repeated-spring mappings are reachable in the Factory rental pool. */
export const BACK_H_SPRING_REPEATED_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_SPRING_REPEATED_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** There are no outside-Factory mappings for this one bounded back set. */
export const BACK_H_SPRING_REPEATED_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_SPRING_REPEATED_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_SHRINK_GROW` source row. */
export const BACK_SHRINK_GROW_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_SHRINK_GROW")
    .map(([species]) => species),
);

/** The complete shrink/grow back set is Factory-reachable. */
export const BACK_SHRINK_GROW_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_SHRINK_GROW_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** There are no outside-Factory mappings for this bounded back set. */
export const BACK_SHRINK_GROW_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_SHRINK_GROW_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_GROW` source row. */
export const BACK_GROW_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_GROW")
    .map(([species]) => species),
);

/** The complete Grow back set is Factory-reachable. */
export const BACK_GROW_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_GROW_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** There are no outside-Factory mappings for this bounded back set. */
export const BACK_GROW_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_GROW_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_CIRCLE_COUNTERCLOCKWISE` row. */
export const BACK_CIRCLE_COUNTERCLOCKWISE_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_CIRCLE_COUNTERCLOCKWISE")
    .map(([species]) => species),
);

/** Both circle-counterclockwise mappings are Factory-reachable. */
export const BACK_CIRCLE_COUNTERCLOCKWISE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_CIRCLE_COUNTERCLOCKWISE_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** There are no outside-Factory mappings for this bounded back set. */
export const BACK_CIRCLE_COUNTERCLOCKWISE_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_CIRCLE_COUNTERCLOCKWISE_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_H_SHAKE` source row. */
export const BACK_H_SHAKE_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_H_SHAKE")
    .map(([species]) => species),
);

/** All thirteen H-shake mappings are reachable through Factory rentals. */
export const BACK_H_SHAKE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_SHAKE_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** This bounded back set has no non-Factory selector mappings. */
export const BACK_H_SHAKE_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_SHAKE_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_V_SHAKE` source row. */
export const BACK_V_SHAKE_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_V_SHAKE")
    .map(([species]) => species),
);

/** All thirty-eight V-shake mappings are reachable through Factory rentals. */
export const BACK_V_SHAKE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_V_SHAKE_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** This bounded back set has no non-Factory selector mappings. */
export const BACK_V_SHAKE_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_V_SHAKE_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_V_SHAKE_H_SLIDE` row. */
export const BACK_V_SHAKE_H_SLIDE_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_V_SHAKE_H_SLIDE")
    .map(([species]) => species),
);

/** All nine V-shake/H-slide mappings are reachable through Factory rentals. */
export const BACK_V_SHAKE_H_SLIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_V_SHAKE_H_SLIDE_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** This bounded back set has no non-Factory selector mappings. */
export const BACK_V_SHAKE_H_SLIDE_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_V_SHAKE_H_SLIDE_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_V_STRETCH` row. */
export const BACK_V_STRETCH_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_V_STRETCH")
    .map(([species]) => species),
);

/** All fourteen V-stretch mappings are reachable through Factory rentals. */
export const BACK_V_STRETCH_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_V_STRETCH_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** This bounded back set has no non-Factory selector mappings. */
export const BACK_V_STRETCH_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_V_STRETCH_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_H_STRETCH` row. */
export const BACK_H_STRETCH_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_H_STRETCH")
    .map(([species]) => species),
);

/** Both horizontal-stretch mappings are reachable in the Factory rental pool. */
export const BACK_H_STRETCH_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_STRETCH_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** This bounded back set has no non-Factory selector mappings. */
export const BACK_H_STRETCH_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_H_STRETCH_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_GROW_STUTTER` row. */
export const BACK_GROW_STUTTER_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_GROW_STUTTER")
    .map(([species]) => species),
);

/** Three GrowStutter mappings have real Factory rental records. */
export const BACK_GROW_STUTTER_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_GROW_STUTTER_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** MEWTWO and RAYQUAZA require staged legal parties for this source row. */
export const BACK_GROW_STUTTER_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_GROW_STUTTER_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_V_SHAKE_LOW` row. */
export const BACK_V_SHAKE_LOW_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_V_SHAKE_LOW")
    .map(([species]) => species),
);

/** All low vertical-shake mappings have real Factory rental records. */
export const BACK_V_SHAKE_LOW_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_V_SHAKE_LOW_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** This bounded back set has no non-Factory selector mappings. */
export const BACK_V_SHAKE_LOW_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_V_SHAKE_LOW_SPECIES.filter((species) => !factorySpecies.has(species)),
);

/** Every species selected by the generated `BACK_ANIM_TRIANGLE_DOWN` row. */
export const BACK_TRIANGLE_DOWN_SPECIES: readonly string[] = Object.freeze(
  Object.entries(speciesToBackAnimSet)
    .filter(([, set]) => set === "BACK_ANIM_TRIANGLE_DOWN")
    .map(([species]) => species),
);

/** All triangle-down mappings have real Factory rental records. */
export const BACK_TRIANGLE_DOWN_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_TRIANGLE_DOWN_SPECIES.filter((species) => factorySpecies.has(species)),
);

/** This bounded back set has no non-Factory selector mappings. */
export const BACK_TRIANGLE_DOWN_OUTSIDE_FACTORY_SPECIES: readonly string[] = Object.freeze(
  BACK_TRIANGLE_DOWN_SPECIES.filter((species) => !factorySpecies.has(species)),
);

export const BACK_H_VIBRATE_VARIANTS = Object.freeze({
  fastest: Object.freeze({
    selector: "ANIM_H_VIBRATE_FASTEST",
    callback: "Anim_HorizontalVibrate_Fastest",
    natureMod: 0,
    amplitude: 12,
    accepted: true,
  }),
  fast: Object.freeze({
    selector: "ANIM_H_VIBRATE_FAST",
    callback: "Anim_HorizontalVibrate_Fast",
    natureMod: 1,
    amplitude: 9,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_H_VIBRATE",
    callback: "Anim_HorizontalVibrate",
    natureMod: 2,
    amplitude: 6,
    accepted: true,
  }),
} as const);

type BackHVibrateSelector = typeof BACK_H_VIBRATE_VARIANTS[keyof typeof BACK_H_VIBRATE_VARIANTS]["selector"];
type BackHVibrateCallback = typeof BACK_H_VIBRATE_VARIANTS[keyof typeof BACK_H_VIBRATE_VARIANTS]["callback"];
type BackHVibrateAmplitude = typeof BACK_H_VIBRATE_VARIANTS[keyof typeof BACK_H_VIBRATE_VARIANTS]["amplitude"];

/**
 * `BACK_ANIM_H_SLIDE` is its own player-back triple. The shared source
 * callback is selected after the task's nature lookup; each initializer then
 * writes its own duration before immediately invoking `HorizontalSlide`.
 */
export const BACK_H_SLIDE_VARIANTS = Object.freeze({
  fast: Object.freeze({
    selector: "ANIM_H_SLIDE_FAST",
    callback: "Anim_HorizontalSlide_Fast",
    natureMod: 0,
    duration: 20,
    amplitude: 6,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_H_SLIDE",
    callback: "Anim_HorizontalSlide",
    natureMod: 1,
    duration: 40,
    amplitude: 6,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_H_SLIDE_SLOW",
    callback: "Anim_HorizontalSlide_Slow",
    natureMod: 2,
    duration: 80,
    amplitude: 6,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_H_SPRING` is the affine player-back triple. The three entry
 * points initialize the shared HorizontalSpring state, then invoke it without
 * replacing their own callback; the selected entry-point callback therefore
 * remains visible until HorizontalSpring installs WaitAnimEnd at the end.
 */
export const BACK_H_SPRING_VARIANTS = Object.freeze({
  fast: Object.freeze({
    selector: "ANIM_H_SPRING_FAST",
    callback: "Anim_HorizontalSpring_Fast",
    sourceId: 109,
    natureMod: 0,
    speed: 8,
    limit: 512,
    amplitude: 16,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_H_SPRING",
    callback: "Anim_HorizontalSpring",
    sourceId: 62,
    natureMod: 1,
    speed: 8,
    limit: 512,
    amplitude: 8,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_H_SPRING_SLOW",
    callback: "Anim_HorizontalSpring_Slow",
    sourceId: 110,
    natureMod: 2,
    speed: 4,
    limit: 256,
    amplitude: 16,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_H_SPRING_REPEATED` uses the same entry-point/task lifecycle as
 * H-spring, but its shared helper advances a 64-step affine phase twice per
 * sine-table turn. The nature-selected amplitudes and limits remain source
 * data, not a species-specific production branch.
 */
export const BACK_H_SPRING_REPEATED_VARIANTS = Object.freeze({
  fast: Object.freeze({
    selector: "ANIM_H_REPEATED_SPRING_FAST",
    callback: "Anim_HorizontalRepeatedSpring_Fast",
    sourceId: 111,
    natureMod: 0,
    speed: 8,
    limit: 512,
    amplitude: 16,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_H_REPEATED_SPRING",
    callback: "Anim_HorizontalRepeatedSpring",
    sourceId: 112,
    natureMod: 1,
    speed: 8,
    limit: 512,
    amplitude: 8,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_H_REPEATED_SPRING_SLOW",
    callback: "Anim_HorizontalRepeatedSpring_Slow",
    sourceId: 63,
    natureMod: 2,
    speed: 4,
    limit: 256,
    amplitude: 16,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_SHRINK_GROW` uses the shared ShrinkGrow helper with three
 * source-relative initializer parameter pairs. `phaseLimit` is written to
 * data[7], while `speed` is written to data[6].
 */
export const BACK_SHRINK_GROW_VARIANTS = Object.freeze({
  fast: Object.freeze({
    selector: "ANIM_SHRINK_GROW_FAST",
    callback: "Anim_ShrinkGrow_Fast",
    sourceId: 113,
    natureMod: 0,
    speed: 8,
    phaseLimit: 5,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_SHRINK_GROW",
    callback: "Anim_ShrinkGrow",
    sourceId: 19,
    natureMod: 1,
    speed: 8,
    phaseLimit: 3,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_SHRINK_GROW_SLOW",
    callback: "Anim_ShrinkGrow_Slow",
    sourceId: 114,
    natureMod: 2,
    speed: 4,
    phaseLimit: 3,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_GROW` has two entry points over the shared Grow helper and one
 * deliberately separate staged callback. The source ids are the ids in
 * `pokemon_animation.h`, not callback-table indices synthesized by this
 * reducer.
 */
export const BACK_GROW_VARIANTS = Object.freeze({
  twice: Object.freeze({
    selector: "ANIM_GROW_TWICE",
    callback: "Anim_Grow_Twice",
    sourceId: 108,
    natureMod: 0,
    speed: 8,
    runs: 2,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_GROW",
    callback: "Anim_Grow",
    sourceId: 107,
    natureMod: 1,
    speed: 4,
    runs: 1,
    accepted: true,
  }),
  inStages: Object.freeze({
    selector: "ANIM_GROW_IN_STAGES",
    callback: "Anim_GrowInStages",
    sourceId: 58,
    natureMod: 2,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_CIRCLE_COUNTERCLOCKWISE` selects the three source initializers
 * around the shared non-affine `CircleCounterclockwise` callback. The
 * initializer allocates the callback's four-slot animation record, invokes
 * the callback immediately, and then installs the shared callback.
 */
export const BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS = Object.freeze({
  long: Object.freeze({
    selector: "ANIM_CIRCLE_C_CLOCKWISE_LONG",
    callback: "Anim_CircleCounterclockwise_Long",
    sourceId: 100,
    natureMod: 0,
    rotation: 1024,
    data: 6,
    speed: 24,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_CIRCLE_C_CLOCKWISE",
    callback: "Anim_CircleCounterclockwise",
    sourceId: 20,
    natureMod: 1,
    rotation: 512,
    data: 6,
    speed: 24,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_CIRCLE_C_CLOCKWISE_SLOW",
    callback: "Anim_CircleCounterclockwise_Slow",
    sourceId: 79,
    natureMod: 2,
    rotation: 512,
    data: 3,
    speed: 12,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_H_SHAKE` selects three source initializers around the shared
 * non-affine `HorizontalShake` callback. The initializer first writes the
 * step/amplitude pair, invokes the helper once, then installs that helper.
 */
export const BACK_H_SHAKE_VARIANTS = Object.freeze({
  fast: Object.freeze({
    selector: "ANIM_H_SHAKE_FAST",
    callback: "Anim_HorizontalShake_Fast",
    sourceId: 93,
    natureMod: 0,
    step: 70,
    amplitude: 6,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_H_SHAKE",
    callback: "Anim_HorizontalShake",
    sourceId: 15,
    natureMod: 1,
    step: 60,
    amplitude: 3,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_H_SHAKE_SLOW",
    callback: "Anim_HorizontalShake_Slow",
    sourceId: 76,
    natureMod: 2,
    step: 30,
    amplitude: 3,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_V_SHAKE` selects three source initializers around the shared
 * non-affine `VerticalShakeBack` callback. The initializer first writes the
 * step/amplitude pair, invokes the helper once, then installs that helper.
 */
export const BACK_V_SHAKE_VARIANTS = Object.freeze({
  fast: Object.freeze({
    selector: "ANIM_V_SHAKE_BACK_FAST",
    callback: "Anim_VerticalShakeBack_Fast",
    sourceId: 97,
    natureMod: 0,
    step: 70,
    amplitude: 6,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_V_SHAKE_BACK",
    callback: "Anim_VerticalShakeBack",
    sourceId: 87,
    natureMod: 1,
    step: 60,
    amplitude: 3,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_V_SHAKE_BACK_SLOW",
    callback: "Anim_VerticalShakeBack_Slow",
    sourceId: 88,
    natureMod: 2,
    step: 30,
    amplitude: 3,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_V_SHAKE_LOW` selects three initializers around
 * `VerticalShakeLowTwice`.  The helper walks the source's three pulse/gap/
 * pulse rows in `sVerticalShakeData`; all three variants differ only in the
 * increment and maximum amplitude stored by their initializer.
 */
export const BACK_V_SHAKE_LOW_VARIANTS = Object.freeze({
  fast: Object.freeze({
    selector: "ANIM_V_SHAKE_LOW_TWICE_FAST",
    callback: "Anim_VerticalShakeLowTwice_Fast",
    sourceId: 99,
    natureMod: 0,
    step: 56,
    amplitude: 9,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_V_SHAKE_LOW_TWICE",
    callback: "Anim_VerticalShakeLowTwice",
    sourceId: 92,
    natureMod: 1,
    step: 40,
    amplitude: 6,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_V_SHAKE_LOW_TWICE_SLOW",
    callback: "Anim_VerticalShakeLowTwice_Slow",
    sourceId: 98,
    natureMod: 2,
    step: 24,
    amplitude: 6,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_TRIANGLE_DOWN` selects three initializers around the shared
 * non-affine TriangleDown callback. Its `data[5]` is both the signed source
 * divisor and the per-tick vector amplitude; `data[6]` is the run count.
 */
export const BACK_TRIANGLE_DOWN_VARIANTS = Object.freeze({
  twice: Object.freeze({
    selector: "ANIM_TRIANGLE_DOWN_TWICE",
    callback: "Anim_TriangleDown_Fast",
    sourceId: 106,
    natureMod: 0,
    amplitude: 2,
    runs: 2,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_TRIANGLE_DOWN",
    callback: "Anim_TriangleDown",
    sourceId: 105,
    natureMod: 1,
    amplitude: 2,
    runs: 1,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_TRIANGLE_DOWN_SLOW",
    callback: "Anim_TriangleDown_Slow",
    sourceId: 104,
    natureMod: 2,
    amplitude: 1,
    runs: 1,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_V_SHAKE_H_SLIDE` selects three standalone source callbacks.
 * Unlike the preceding shake triples, each callback stays installed directly
 * after the task dispatches it; the source does not use a shared helper or a
 * callback-installing initializer. Its first/second `TryFlipX` calls remain
 * no-ops because the player-back task has set `sDontFlip`.
 */
export const BACK_V_SHAKE_H_SLIDE_VARIANTS = Object.freeze({
  fast: Object.freeze({
    selector: "ANIM_V_SHAKE_H_SLIDE_FAST",
    callback: "Anim_VerticalShakeHorizontalSlide_Fast",
    sourceId: 103,
    natureMod: 0,
    step: 64,
    modulus: 96,
    amplitude: 4,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_V_SHAKE_H_SLIDE",
    callback: "Anim_VerticalShakeHorizontalSlide",
    sourceId: 102,
    natureMod: 1,
    step: 48,
    modulus: 128,
    amplitude: 4,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_V_SHAKE_H_SLIDE_SLOW",
    callback: "Anim_VerticalShakeHorizontalSlide_Slow",
    sourceId: 89,
    natureMod: 2,
    step: 24,
    modulus: 128,
    amplitude: 4,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_V_STRETCH` selects the three source initializers around the
 * shared affine VerticalStretchBothEnds callback. The initializer remains
 * installed while it invokes the helper, so its first-call data[2] guard is
 * part of the live callback cadence.
 */
export const BACK_V_STRETCH_VARIANTS = Object.freeze({
  twice: Object.freeze({
    selector: "ANIM_V_STRETCH_BOTH_ENDS_TWICE",
    callback: "Anim_VerticalStretchBothEnds_Twice",
    sourceId: 116,
    natureMod: 0,
    duration: 20,
    amplitude: 70,
    runs: 2,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_V_STRETCH_BOTH_ENDS",
    callback: "Anim_VerticalStretchBothEnds",
    sourceId: 115,
    natureMod: 1,
    duration: 30,
    amplitude: 60,
    runs: 1,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_V_STRETCH_BOTH_ENDS_SLOW",
    callback: "Anim_VerticalStretchBothEnds_Slow",
    sourceId: 90,
    natureMod: 2,
    duration: 40,
    amplitude: 40,
    runs: 1,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_H_STRETCH` selects the three source initializers around the
 * shared affine HorizontalStretchFar callback. It has the same callback
 * lifecycle as the vertical-stretch family but composes only x-scale.
 */
export const BACK_H_STRETCH_VARIANTS = Object.freeze({
  twice: Object.freeze({
    selector: "ANIM_H_STRETCH_FAR_TWICE",
    callback: "Anim_HorizontalStretchFar_Twice",
    sourceId: 117,
    natureMod: 0,
    duration: 20,
    amplitude: 70,
    runs: 2,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_H_STRETCH_FAR",
    callback: "Anim_HorizontalStretchFar",
    sourceId: 118,
    natureMod: 1,
    duration: 30,
    amplitude: 60,
    runs: 1,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_H_STRETCH_FAR_SLOW",
    callback: "Anim_HorizontalStretchFar_Slow",
    sourceId: 91,
    natureMod: 2,
    duration: 40,
    amplitude: 40,
    runs: 1,
    accepted: true,
  }),
} as const);

/**
 * `BACK_ANIM_GROW_STUTTER` selects the shared affine GrowStutter helper.
 * Initializers write the run count, duration, and amplitude, then invoke the
 * helper while leaving their own callback installed.
 */
export const BACK_GROW_STUTTER_VARIANTS = Object.freeze({
  twice: Object.freeze({
    selector: "ANIM_GROW_STUTTER_TWICE",
    callback: "Anim_GrowStutter_Twice",
    sourceId: 119,
    natureMod: 0,
    duration: 20,
    amplitude: 70,
    runs: 2,
    accepted: true,
  }),
  normal: Object.freeze({
    selector: "ANIM_GROW_STUTTER",
    callback: "Anim_GrowStutter",
    sourceId: 120,
    natureMod: 1,
    duration: 30,
    amplitude: 60,
    runs: 1,
    accepted: true,
  }),
  slow: Object.freeze({
    selector: "ANIM_GROW_STUTTER_SLOW",
    callback: "Anim_GrowStutter_Slow",
    sourceId: 101,
    natureMod: 2,
    duration: 40,
    amplitude: 40,
    runs: 1,
    accepted: true,
  }),
} as const);

type BackHSlideSelector = typeof BACK_H_SLIDE_VARIANTS[keyof typeof BACK_H_SLIDE_VARIANTS]["selector"];
type BackHSlideCallback = typeof BACK_H_SLIDE_VARIANTS[keyof typeof BACK_H_SLIDE_VARIANTS]["callback"];
type BackHSlideDuration = typeof BACK_H_SLIDE_VARIANTS[keyof typeof BACK_H_SLIDE_VARIANTS]["duration"];
type BackHSpringSelector = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["selector"];
type BackHSpringCallback = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["callback"];
type BackHSpringSpeed = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["speed"];
type BackHSpringLimit = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["limit"];
type BackHSpringAmplitude = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["amplitude"];
type BackHRepeatedSpringSelector = typeof BACK_H_SPRING_REPEATED_VARIANTS[keyof typeof BACK_H_SPRING_REPEATED_VARIANTS]["selector"];
type BackHRepeatedSpringCallback = typeof BACK_H_SPRING_REPEATED_VARIANTS[keyof typeof BACK_H_SPRING_REPEATED_VARIANTS]["callback"];
type BackHRepeatedSpringSourceId = typeof BACK_H_SPRING_REPEATED_VARIANTS[keyof typeof BACK_H_SPRING_REPEATED_VARIANTS]["sourceId"];
type BackHRepeatedSpringSpeed = typeof BACK_H_SPRING_REPEATED_VARIANTS[keyof typeof BACK_H_SPRING_REPEATED_VARIANTS]["speed"];
type BackHRepeatedSpringLimit = typeof BACK_H_SPRING_REPEATED_VARIANTS[keyof typeof BACK_H_SPRING_REPEATED_VARIANTS]["limit"];
type BackHRepeatedSpringAmplitude = typeof BACK_H_SPRING_REPEATED_VARIANTS[keyof typeof BACK_H_SPRING_REPEATED_VARIANTS]["amplitude"];
type BackShrinkGrowSelector = typeof BACK_SHRINK_GROW_VARIANTS[keyof typeof BACK_SHRINK_GROW_VARIANTS]["selector"];
type BackShrinkGrowCallback = typeof BACK_SHRINK_GROW_VARIANTS[keyof typeof BACK_SHRINK_GROW_VARIANTS]["callback"];
type BackShrinkGrowSourceId = typeof BACK_SHRINK_GROW_VARIANTS[keyof typeof BACK_SHRINK_GROW_VARIANTS]["sourceId"];
type BackShrinkGrowSpeed = typeof BACK_SHRINK_GROW_VARIANTS[keyof typeof BACK_SHRINK_GROW_VARIANTS]["speed"];
type BackShrinkGrowPhaseLimit = typeof BACK_SHRINK_GROW_VARIANTS[keyof typeof BACK_SHRINK_GROW_VARIANTS]["phaseLimit"];
type BackGrowSelector = typeof BACK_GROW_VARIANTS[keyof typeof BACK_GROW_VARIANTS]["selector"];
type BackGrowCallback = typeof BACK_GROW_VARIANTS[keyof typeof BACK_GROW_VARIANTS]["callback"];
type BackGrowSourceId = typeof BACK_GROW_VARIANTS[keyof typeof BACK_GROW_VARIANTS]["sourceId"];
type BackCircleCounterclockwiseSelector = typeof BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS[keyof typeof BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS]["selector"];
type BackCircleCounterclockwiseCallback = typeof BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS[keyof typeof BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS]["callback"];
type BackCircleCounterclockwiseSourceId = typeof BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS[keyof typeof BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS]["sourceId"];
type BackHShakeSelector = typeof BACK_H_SHAKE_VARIANTS[keyof typeof BACK_H_SHAKE_VARIANTS]["selector"];
type BackHShakeCallback = typeof BACK_H_SHAKE_VARIANTS[keyof typeof BACK_H_SHAKE_VARIANTS]["callback"];
type BackHShakeSourceId = typeof BACK_H_SHAKE_VARIANTS[keyof typeof BACK_H_SHAKE_VARIANTS]["sourceId"];
type BackHShakeStep = typeof BACK_H_SHAKE_VARIANTS[keyof typeof BACK_H_SHAKE_VARIANTS]["step"];
type BackHShakeAmplitude = typeof BACK_H_SHAKE_VARIANTS[keyof typeof BACK_H_SHAKE_VARIANTS]["amplitude"];
type BackVShakeSelector = typeof BACK_V_SHAKE_VARIANTS[keyof typeof BACK_V_SHAKE_VARIANTS]["selector"];
type BackVShakeCallback = typeof BACK_V_SHAKE_VARIANTS[keyof typeof BACK_V_SHAKE_VARIANTS]["callback"];
type BackVShakeSourceId = typeof BACK_V_SHAKE_VARIANTS[keyof typeof BACK_V_SHAKE_VARIANTS]["sourceId"];
type BackVShakeStep = typeof BACK_V_SHAKE_VARIANTS[keyof typeof BACK_V_SHAKE_VARIANTS]["step"];
type BackVShakeAmplitude = typeof BACK_V_SHAKE_VARIANTS[keyof typeof BACK_V_SHAKE_VARIANTS]["amplitude"];
type BackVShakeLowSelector = typeof BACK_V_SHAKE_LOW_VARIANTS[keyof typeof BACK_V_SHAKE_LOW_VARIANTS]["selector"];
type BackVShakeLowCallback = typeof BACK_V_SHAKE_LOW_VARIANTS[keyof typeof BACK_V_SHAKE_LOW_VARIANTS]["callback"];
type BackVShakeLowSourceId = typeof BACK_V_SHAKE_LOW_VARIANTS[keyof typeof BACK_V_SHAKE_LOW_VARIANTS]["sourceId"];
type BackVShakeLowStep = typeof BACK_V_SHAKE_LOW_VARIANTS[keyof typeof BACK_V_SHAKE_LOW_VARIANTS]["step"];
type BackVShakeLowAmplitude = typeof BACK_V_SHAKE_LOW_VARIANTS[keyof typeof BACK_V_SHAKE_LOW_VARIANTS]["amplitude"];
type BackTriangleDownSelector = typeof BACK_TRIANGLE_DOWN_VARIANTS[keyof typeof BACK_TRIANGLE_DOWN_VARIANTS]["selector"];
type BackTriangleDownCallback = typeof BACK_TRIANGLE_DOWN_VARIANTS[keyof typeof BACK_TRIANGLE_DOWN_VARIANTS]["callback"];
type BackTriangleDownSourceId = typeof BACK_TRIANGLE_DOWN_VARIANTS[keyof typeof BACK_TRIANGLE_DOWN_VARIANTS]["sourceId"];
type BackTriangleDownAmplitude = typeof BACK_TRIANGLE_DOWN_VARIANTS[keyof typeof BACK_TRIANGLE_DOWN_VARIANTS]["amplitude"];
type BackTriangleDownRuns = typeof BACK_TRIANGLE_DOWN_VARIANTS[keyof typeof BACK_TRIANGLE_DOWN_VARIANTS]["runs"];
type BackVShakeHSlideSelector = typeof BACK_V_SHAKE_H_SLIDE_VARIANTS[keyof typeof BACK_V_SHAKE_H_SLIDE_VARIANTS]["selector"];
type BackVShakeHSlideCallback = typeof BACK_V_SHAKE_H_SLIDE_VARIANTS[keyof typeof BACK_V_SHAKE_H_SLIDE_VARIANTS]["callback"];
type BackVShakeHSlideSourceId = typeof BACK_V_SHAKE_H_SLIDE_VARIANTS[keyof typeof BACK_V_SHAKE_H_SLIDE_VARIANTS]["sourceId"];
type BackVShakeHSlideStep = typeof BACK_V_SHAKE_H_SLIDE_VARIANTS[keyof typeof BACK_V_SHAKE_H_SLIDE_VARIANTS]["step"];
type BackVShakeHSlideModulus = typeof BACK_V_SHAKE_H_SLIDE_VARIANTS[keyof typeof BACK_V_SHAKE_H_SLIDE_VARIANTS]["modulus"];
type BackVStretchSelector = typeof BACK_V_STRETCH_VARIANTS[keyof typeof BACK_V_STRETCH_VARIANTS]["selector"];
type BackVStretchCallback = typeof BACK_V_STRETCH_VARIANTS[keyof typeof BACK_V_STRETCH_VARIANTS]["callback"];
type BackVStretchSourceId = typeof BACK_V_STRETCH_VARIANTS[keyof typeof BACK_V_STRETCH_VARIANTS]["sourceId"];
type BackVStretchDuration = typeof BACK_V_STRETCH_VARIANTS[keyof typeof BACK_V_STRETCH_VARIANTS]["duration"];
type BackVStretchAmplitude = typeof BACK_V_STRETCH_VARIANTS[keyof typeof BACK_V_STRETCH_VARIANTS]["amplitude"];
type BackVStretchRuns = typeof BACK_V_STRETCH_VARIANTS[keyof typeof BACK_V_STRETCH_VARIANTS]["runs"];
type BackHStretchSelector = typeof BACK_H_STRETCH_VARIANTS[keyof typeof BACK_H_STRETCH_VARIANTS]["selector"];
type BackHStretchCallback = typeof BACK_H_STRETCH_VARIANTS[keyof typeof BACK_H_STRETCH_VARIANTS]["callback"];
type BackHStretchSourceId = typeof BACK_H_STRETCH_VARIANTS[keyof typeof BACK_H_STRETCH_VARIANTS]["sourceId"];
type BackHStretchDuration = typeof BACK_H_STRETCH_VARIANTS[keyof typeof BACK_H_STRETCH_VARIANTS]["duration"];
type BackHStretchAmplitude = typeof BACK_H_STRETCH_VARIANTS[keyof typeof BACK_H_STRETCH_VARIANTS]["amplitude"];
type BackHStretchRuns = typeof BACK_H_STRETCH_VARIANTS[keyof typeof BACK_H_STRETCH_VARIANTS]["runs"];
type BackGrowStutterSelector = typeof BACK_GROW_STUTTER_VARIANTS[keyof typeof BACK_GROW_STUTTER_VARIANTS]["selector"];
type BackGrowStutterCallback = typeof BACK_GROW_STUTTER_VARIANTS[keyof typeof BACK_GROW_STUTTER_VARIANTS]["callback"];
type BackGrowStutterSourceId = typeof BACK_GROW_STUTTER_VARIANTS[keyof typeof BACK_GROW_STUTTER_VARIANTS]["sourceId"];
type BackGrowStutterDuration = typeof BACK_GROW_STUTTER_VARIANTS[keyof typeof BACK_GROW_STUTTER_VARIANTS]["duration"];
type BackGrowStutterAmplitude = typeof BACK_GROW_STUTTER_VARIANTS[keyof typeof BACK_GROW_STUTTER_VARIANTS]["amplitude"];
type BackGrowStutterRuns = typeof BACK_GROW_STUTTER_VARIANTS[keyof typeof BACK_GROW_STUTTER_VARIANTS]["runs"];

/**
 * Source facts at the `LaunchAnimationTaskForBackSprite` seam. The shared
 * task sets `sDontFlip` and zeroes the signed sprite registers before the
 * nature-selected callback runs; data[1] is deliberately preserved until
 * `SpriteCallbackDummy` receives the task's final restoration.
 */
export const BACK_SEND_OUT_TASK_LIFECYCLE = Object.freeze({
  launch: "LaunchAnimationTaskForBackSprite",
  speciesSetLookup: "GetSpeciesBackAnimSet",
  sharedTask: "Task_HandleMonAnimation",
  sourceBackSetIsOneBased: true,
  getSpeciesBackAnimSetReturnsZeroBased: true,
  taskData: Object.freeze({ state: 0, pointerHi: 1, pointerLo: 2, animId: 3, battlerId: 4, speciesId: 5 }),
  spriteDataZeroed: Object.freeze([0, 2, 3, 4, 5, 6, 7]),
  spriteDataPreserved: Object.freeze([1]),
  backSpriteDontFlip: true,
  terminalCallback: "SpriteCallbackDummy",
  terminalRestores: Object.freeze(["data[0]=battler", "data[2]=species", "data[1]=0"]),
} as const);

export interface BackSendOutAnimationSelection {
  readonly species: string;
  /** The numeric `GetNature` result supplied by the party record. */
  readonly natureId: number;
  readonly nature: string;
  /** `GetSpeciesBackAnimSet`'s zero-based result. */
  readonly backAnimSetIndex: number;
  readonly backAnimSet: string;
  readonly natureMod: 0 | 1 | 2;
  readonly selector: string;
}

function validSourceSpecies(species: string): boolean {
  // Both generated selector tables omit the unused legacy Unown ids. Their C
  // array slots still zero-default to BACK_ANIM_NONE, so preserve that source
  // behaviour without treating arbitrary host strings as species ids.
  return Object.hasOwn(speciesToBackAnimSet, species)
    || Object.hasOwn(frontAnimIds, species)
    || /^OLD_UNOWN_[B-Z]$/.test(species);
}

/**
 * Exact `GetSpeciesBackAnimSet` routing: source `BACK_ANIM_*` values are
 * one-based, while the task consumes the zero-based `sBackAnimationIds`
 * triple index. An omitted valid legacy species has C's BACK_ANIM_NONE
 * default and therefore returns H-vibrate index 0.
 */
export function getSpeciesBackAnimSet(species: string): number | null {
  if (!validSourceSpecies(species)) return null;
  const sourceSet = speciesToBackAnimSet[species];
  if (sourceSet === undefined) return 0;
  const index = BACK_ANIM_SET_NAMES.indexOf(sourceSet);
  if (index < 0) throw new Error(`unknown generated back animation set ${sourceSet}`);
  return index;
}

/**
 * Explicit species+nature seam for player back sprites. It follows
 * `LaunchAnimationTaskForBackSprite`'s `3 * backAnimSet + natureMod` lookup;
 * callers cannot accidentally inherit front-animation acceptance.
 */
export function selectBackSendOutAnimation(
  species: string,
  natureId: number,
): BackSendOutAnimationSelection | null {
  if (!Number.isInteger(natureId) || natureId < 0 || natureId >= BACK_ANIM_NATURE_ORDER.length) {
    return null;
  }
  const backAnimSetIndex = getSpeciesBackAnimSet(species);
  if (backAnimSetIndex === null) return null;
  const nature = BACK_ANIM_NATURE_ORDER[natureId]!;
  const rawNatureMod = backAnimNatureMod[nature];
  if (rawNatureMod !== 0 && rawNatureMod !== 1 && rawNatureMod !== 2) {
    throw new Error(`invalid generated back nature modifier ${rawNatureMod}`);
  }
  const backAnimSet = BACK_ANIM_SET_NAMES[backAnimSetIndex]!;
  const selector = backAnimationIds[backAnimSet]![rawNatureMod]!;
  return Object.freeze({
    species,
    natureId,
    nature,
    backAnimSetIndex,
    backAnimSet,
    natureMod: rawNatureMod,
    selector,
  });
}

function hVibrateVariant(selector: string): {
  readonly selector: BackHVibrateSelector;
  readonly callback: BackHVibrateCallback;
  readonly amplitude: BackHVibrateAmplitude;
} | null {
  for (const variant of Object.values(BACK_H_VIBRATE_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function hSlideVariant(selector: string): {
  readonly selector: BackHSlideSelector;
  readonly callback: BackHSlideCallback;
  readonly duration: BackHSlideDuration;
  readonly amplitude: 6;
} | null {
  for (const variant of Object.values(BACK_H_SLIDE_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function hSpringVariant(selector: string): {
  readonly selector: BackHSpringSelector;
  readonly callback: BackHSpringCallback;
  readonly sourceId: 62 | 109 | 110;
  readonly speed: BackHSpringSpeed;
  readonly limit: BackHSpringLimit;
  readonly amplitude: BackHSpringAmplitude;
} | null {
  for (const variant of Object.values(BACK_H_SPRING_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function hRepeatedSpringVariant(selector: string): {
  readonly selector: BackHRepeatedSpringSelector;
  readonly callback: BackHRepeatedSpringCallback;
  readonly sourceId: BackHRepeatedSpringSourceId;
  readonly speed: BackHRepeatedSpringSpeed;
  readonly limit: BackHRepeatedSpringLimit;
  readonly amplitude: BackHRepeatedSpringAmplitude;
} | null {
  for (const variant of Object.values(BACK_H_SPRING_REPEATED_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function shrinkGrowVariant(selector: string): {
  readonly selector: BackShrinkGrowSelector;
  readonly callback: BackShrinkGrowCallback;
  readonly sourceId: BackShrinkGrowSourceId;
  readonly speed: BackShrinkGrowSpeed;
  readonly phaseLimit: BackShrinkGrowPhaseLimit;
} | null {
  for (const variant of Object.values(BACK_SHRINK_GROW_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function growVariant(selector: string): {
  readonly selector: BackGrowSelector;
  readonly callback: BackGrowCallback;
  readonly sourceId: BackGrowSourceId;
  readonly speed?: 4 | 8;
  readonly runs?: 1 | 2;
} | null {
  for (const variant of Object.values(BACK_GROW_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function growStutterVariant(selector: string): {
  readonly selector: BackGrowStutterSelector;
  readonly callback: BackGrowStutterCallback;
  readonly sourceId: BackGrowStutterSourceId;
  readonly duration: BackGrowStutterDuration;
  readonly amplitude: BackGrowStutterAmplitude;
  readonly runs: BackGrowStutterRuns;
} | null {
  for (const variant of Object.values(BACK_GROW_STUTTER_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function circleCounterclockwiseVariant(selector: string): {
  readonly selector: BackCircleCounterclockwiseSelector;
  readonly callback: BackCircleCounterclockwiseCallback;
  readonly sourceId: BackCircleCounterclockwiseSourceId;
  readonly rotation: 512 | 1024;
  readonly data: 3 | 6;
  readonly speed: 12 | 24;
} | null {
  for (const variant of Object.values(BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function hShakeVariant(selector: string): {
  readonly selector: BackHShakeSelector;
  readonly callback: BackHShakeCallback;
  readonly sourceId: BackHShakeSourceId;
  readonly step: BackHShakeStep;
  readonly amplitude: BackHShakeAmplitude;
} | null {
  for (const variant of Object.values(BACK_H_SHAKE_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function vShakeVariant(selector: string): {
  readonly selector: BackVShakeSelector;
  readonly callback: BackVShakeCallback;
  readonly sourceId: BackVShakeSourceId;
  readonly step: BackVShakeStep;
  readonly amplitude: BackVShakeAmplitude;
} | null {
  for (const variant of Object.values(BACK_V_SHAKE_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function vShakeLowVariant(selector: string): {
  readonly selector: BackVShakeLowSelector;
  readonly callback: BackVShakeLowCallback;
  readonly sourceId: BackVShakeLowSourceId;
  readonly step: BackVShakeLowStep;
  readonly amplitude: BackVShakeLowAmplitude;
} | null {
  for (const variant of Object.values(BACK_V_SHAKE_LOW_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function triangleDownVariant(selector: string): {
  readonly selector: BackTriangleDownSelector;
  readonly callback: BackTriangleDownCallback;
  readonly sourceId: BackTriangleDownSourceId;
  readonly amplitude: BackTriangleDownAmplitude;
  readonly runs: BackTriangleDownRuns;
} | null {
  for (const variant of Object.values(BACK_TRIANGLE_DOWN_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function vShakeHSlideVariant(selector: string): {
  readonly selector: BackVShakeHSlideSelector;
  readonly callback: BackVShakeHSlideCallback;
  readonly sourceId: BackVShakeHSlideSourceId;
  readonly step: BackVShakeHSlideStep;
  readonly modulus: BackVShakeHSlideModulus;
  readonly amplitude: 4;
} | null {
  for (const variant of Object.values(BACK_V_SHAKE_H_SLIDE_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function vStretchVariant(selector: string): {
  readonly selector: BackVStretchSelector;
  readonly callback: BackVStretchCallback;
  readonly sourceId: BackVStretchSourceId;
  readonly duration: BackVStretchDuration;
  readonly amplitude: BackVStretchAmplitude;
  readonly runs: BackVStretchRuns;
} | null {
  for (const variant of Object.values(BACK_V_STRETCH_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function hStretchVariant(selector: string): {
  readonly selector: BackHStretchSelector;
  readonly callback: BackHStretchCallback;
  readonly sourceId: BackHStretchSourceId;
  readonly duration: BackHStretchDuration;
  readonly amplitude: BackHStretchAmplitude;
  readonly runs: BackHStretchRuns;
} | null {
  for (const variant of Object.values(BACK_H_STRETCH_VARIANTS)) {
    if (variant.selector === selector) return variant;
  }
  return null;
}

function toS16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

function gbaSin(index: number, amplitude: number): number {
  // `Sin` returns `(amplitude * gSineTable[index]) >> 8`; the signed ARM
  // shift rounds negative fractional values down, unlike JS's `Math.trunc`.
  return toS16(Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256));
}

function gbaCos(index: number, amplitude: number): number {
  return gbaSin(index + 64, amplitude);
}

export interface BackHorizontalVibrateFrame {
  readonly x2: number;
  readonly y2: 0;
  readonly data0: 0;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  readonly data2: number;
  readonly counter: number;
  readonly index: number | null;
  readonly sign: 1 | -1 | null;
  readonly selector: BackHVibrateSelector;
  readonly amplitude: BackHVibrateAmplitude;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 0;
  readonly affineWriteCount: 0;
  readonly affineMode: "normal";
  readonly callback: BackHVibrateCallback | "WaitAnimEnd";
}

/**
 * Source-order reducer for the entire BACK_ANIM_H_VIBRATE triple. `tick 0`
 * is the first selected `Anim_HorizontalVibrate_*` callback after the shared
 * task has zeroed sprite data. Active counters 0..40 use the selected
 * amplitude; counter 41 clears x2 and installs WaitAnimEnd. Back sprites have
 * no front-picture program, so the following WaitAnimEnd callback is free to
 * hand the task back its dummy terminal on the next sprite update.
 */
export function backHorizontalVibrateFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackHorizontalVibrateFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_H_VIBRATE") return null;
  const variant = hVibrateVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected H-vibrate selector ${selection.selector}`);

  let data2 = 0;
  let x2 = 0;
  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    const counter = data2;
    if (counter > 40) {
      return {
        x2: 0,
        y2: 0,
        data0: 0,
        data1: toS16(preservedData1),
        data2: toS16(counter + 1),
        counter,
        index: null,
        sign: null,
        selector: variant.selector,
        amplitude: variant.amplitude,
        normalBackDontFlip: true,
        tryFlipXCalls: 0,
        affineWriteCount: 0,
        affineMode: "normal",
        callback: "WaitAnimEnd",
      };
    }

    const sign = counter & 1 ? -1 : 1;
    const index = Math.trunc((counter * 128) / 40) % 256;
    x2 = toS16(gbaSin(index, variant.amplitude) * sign);
    data2 = toS16(counter + 1);
    if (tick === ticksSinceStart) {
      return {
        x2,
        y2: 0,
        data0: 0,
        data1: toS16(preservedData1),
        data2,
        counter,
        index,
        sign,
        selector: variant.selector,
        amplitude: variant.amplitude,
        normalBackDontFlip: true,
        tryFlipXCalls: 0,
        affineWriteCount: 0,
        affineMode: "normal",
        callback: variant.callback,
      };
    }
  }

  throw new Error("unreachable back H-vibrate reducer state");
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backHorizontalVibrateWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackHorizontalSlideFrame {
  readonly x2: number;
  readonly y2: 0;
  readonly data0: BackHSlideDuration;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  readonly data2: number;
  /** `data[2]` at the start of the source callback invocation. */
  readonly counter: number;
  readonly index: number | null;
  readonly selector: BackHSlideSelector;
  readonly duration: BackHSlideDuration;
  readonly amplitude: 6;
  /** The initializer invokes HorizontalSlide before installing it as callback. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly affineWriteCount: 0;
  readonly affineMode: "normal";
  readonly callback: "HorizontalSlide" | "WaitAnimEnd";
}

/**
 * Source-order reducer for every `BACK_ANIM_H_SLIDE` selector. Tick zero is
 * the selected initializer itself, which writes data0 and immediately calls
 * HorizontalSlide before replacing its callback. Both TryFlipX calls are
 * retained even though the back task has set sDontFlip=TRUE.
 */
export function backHorizontalSlideFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackHorizontalSlideFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_H_SLIDE") return null;
  const variant = hSlideVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected H-slide selector ${selection.selector}`);

  if (ticksSinceStart > variant.duration) {
    return {
      x2: 0,
      y2: 0,
      data0: variant.duration,
      data1: toS16(preservedData1),
      data2: toS16(variant.duration + 2),
      counter: variant.duration + 1,
      index: null,
      selector: variant.selector,
      duration: variant.duration,
      amplitude: variant.amplitude,
      initializerCallBeforeCallbackInstall: false,
      normalBackDontFlip: true,
      tryFlipXCalls: 2,
      affineWriteCount: 0,
      affineMode: "normal",
      callback: "WaitAnimEnd",
    };
  }

  const counter = ticksSinceStart;
  const index = Math.trunc((counter * 384) / variant.duration) % 256;
  return {
    x2: gbaSin(index, variant.amplitude),
    y2: 0,
    data0: variant.duration,
    data1: toS16(preservedData1),
    data2: toS16(counter + 1),
    counter,
    index,
    selector: variant.selector,
    duration: variant.duration,
    amplitude: variant.amplitude,
    initializerCallBeforeCallbackInstall: counter === 0,
    normalBackDontFlip: true,
    tryFlipXCalls: 2,
    affineWriteCount: 0,
    affineMode: "normal",
    callback: "HorizontalSlide",
  };
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backHorizontalSlideWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackHorizontalSpringAffineWrite {
  readonly xScale: number;
  readonly yScale: 256;
  readonly rotationSigned: 0;
  readonly rotationU16: 0;
}

export interface BackHorizontalSpringFrame {
  readonly x2: number;
  readonly y2: 0;
  readonly data0: 0;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** The initializer guard is set once and then remains set. */
  readonly data2: 1;
  readonly data4: BackHSpringAmplitude;
  readonly data5: BackHSpringLimit;
  readonly data6: BackHSpringSpeed;
  readonly data7Before: number;
  readonly data7: number;
  readonly selector: BackHSpringSelector;
  readonly sourceId: 62 | 109 | 110;
  readonly speed: BackHSpringSpeed;
  readonly limit: BackHSpringLimit;
  readonly amplitude: BackHSpringAmplitude;
  readonly xScale: number;
  readonly yScale: 256;
  readonly initializerCalled: boolean;
  readonly handleStartAffineAnimCalls: 0 | 1;
  readonly callbackInvokedByInitializer: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 0;
  readonly affineWriteCount: 1;
  readonly affineWrites: readonly [BackHorizontalSpringAffineWrite];
  readonly affineMode: "double" | "normal";
  readonly callback: BackHSpringCallback | "WaitAnimEnd";
}

/**
 * Source-order reducer for the complete `BACK_ANIM_H_SPRING` triple.
 * `ticksSinceStart` starts at the first invocation of the selected entry
 * point, after Task_HandleMonAnimation has installed it and zeroed data[2..7].
 * The entry point invokes HorizontalSpring immediately and keeps its own
 * callback installed; the shared helper owns only the active/terminal writes.
 */
export function backHorizontalSpringFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackHorizontalSpringFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_H_SPRING") return null;
  const variant = hSpringVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected H-spring selector ${selection.selector}`);

  const requestedData7Before = variant.speed * ticksSinceStart;
  // Once the helper has crossed the guard it is waiting on the task-owned
  // callback handoff; keep the terminal snapshot stable for later queries.
  const data7Before = requestedData7Before > variant.limit
    ? variant.limit + variant.speed
    : requestedData7Before;
  const terminal = data7Before > variant.limit;
  const data7 = terminal ? data7Before : data7Before + variant.speed;
  const x2 = terminal ? 0 : gbaSin(data7Before % 256, variant.amplitude);
  const xScale = terminal ? 256 : toS16(256 + gbaSin(data7 % 128, 96));
  const write = Object.freeze({
    xScale,
    yScale: 256 as const,
    rotationSigned: 0 as const,
    rotationU16: 0 as const,
  });
  return Object.freeze({
    x2,
    y2: 0 as const,
    data0: 0 as const,
    data1: toS16(preservedData1),
    data2: 1 as const,
    data4: variant.amplitude,
    data5: variant.limit,
    data6: variant.speed,
    data7Before: toS16(data7Before),
    data7: toS16(data7),
    selector: variant.selector,
    sourceId: variant.sourceId,
    speed: variant.speed,
    limit: variant.limit,
    amplitude: variant.amplitude,
    xScale,
    yScale: 256 as const,
    initializerCalled: ticksSinceStart === 0,
    handleStartAffineAnimCalls: ticksSinceStart === 0 ? 1 as const : 0 as const,
    callbackInvokedByInitializer: true as const,
    resetSpriteAfterAnim: terminal,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 0 as const,
    affineWriteCount: 1 as const,
    affineWrites: [write] as const,
    affineMode: terminal ? "normal" as const : "double" as const,
    callback: terminal ? "WaitAnimEnd" as const : variant.callback,
  });
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backHorizontalSpringWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackHorizontalRepeatedSpringAffineWrite {
  readonly xScale: number;
  readonly yScale: 256;
  readonly rotationSigned: 0;
  readonly rotationU16: 0;
}

export interface BackHorizontalRepeatedSpringFrame {
  readonly x2: number;
  readonly y2: 0;
  readonly data0: 0;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** The initializer guard is set once and then remains set. */
  readonly data2: 1;
  readonly data4: BackHRepeatedSpringAmplitude;
  readonly data5: BackHRepeatedSpringLimit;
  readonly data6: BackHRepeatedSpringSpeed;
  readonly data7Before: number;
  readonly data7: number;
  readonly selector: BackHRepeatedSpringSelector;
  readonly sourceId: BackHRepeatedSpringSourceId;
  readonly speed: BackHRepeatedSpringSpeed;
  readonly limit: BackHRepeatedSpringLimit;
  readonly amplitude: BackHRepeatedSpringAmplitude;
  readonly xScale: number;
  readonly yScale: 256;
  readonly initializerCalled: boolean;
  readonly handleStartAffineAnimCalls: 0 | 1;
  readonly callbackInvokedByInitializer: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 0;
  readonly affineWriteCount: 1;
  readonly affineWrites: readonly [BackHorizontalRepeatedSpringAffineWrite];
  readonly affineMode: "double" | "normal";
  readonly callback: BackHRepeatedSpringCallback | "WaitAnimEnd";
}

/**
 * Source-order reducer for the complete `BACK_ANIM_H_SPRING_REPEATED` triple.
 * It preserves the live species+nature selector seam while sharing the task,
 * signed-s16, affine, WaitAnimEnd, and terminal restoration lifecycle of the
 * adjacent H-spring family. The only family-specific operation is the source
 * helper's repeated affine phase: `(data[7] % 64) * 2` at amplitude 128.
 */
export function backHorizontalRepeatedSpringFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackHorizontalRepeatedSpringFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_H_SPRING_REPEATED") return null;
  const variant = hRepeatedSpringVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected repeated H-spring selector ${selection.selector}`);

  const requestedData7Before = variant.speed * ticksSinceStart;
  // Once the helper has crossed the guard it is waiting on the task-owned
  // callback handoff; keep the terminal snapshot stable for later queries.
  const data7Before = requestedData7Before > variant.limit
    ? variant.limit + variant.speed
    : requestedData7Before;
  const terminal = data7Before > variant.limit;
  const data7 = terminal ? data7Before : data7Before + variant.speed;
  const x2 = terminal ? 0 : gbaSin(data7Before % 256, variant.amplitude);
  const xScale = terminal ? 256 : toS16(256 + gbaSin((data7 % 64) * 2, 128));
  const write = Object.freeze({
    xScale,
    yScale: 256 as const,
    rotationSigned: 0 as const,
    rotationU16: 0 as const,
  });
  return Object.freeze({
    x2,
    y2: 0 as const,
    data0: 0 as const,
    data1: toS16(preservedData1),
    data2: 1 as const,
    data4: variant.amplitude,
    data5: variant.limit,
    data6: variant.speed,
    data7Before: toS16(data7Before),
    data7: toS16(data7),
    selector: variant.selector,
    sourceId: variant.sourceId,
    speed: variant.speed,
    limit: variant.limit,
    amplitude: variant.amplitude,
    xScale,
    yScale: 256 as const,
    initializerCalled: ticksSinceStart === 0,
    handleStartAffineAnimCalls: ticksSinceStart === 0 ? 1 as const : 0 as const,
    callbackInvokedByInitializer: true as const,
    resetSpriteAfterAnim: terminal,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 0 as const,
    affineWriteCount: 1 as const,
    affineWrites: [write] as const,
    affineMode: terminal ? "normal" as const : "double" as const,
    callback: terminal ? "WaitAnimEnd" as const : variant.callback,
  });
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backHorizontalRepeatedSpringWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackShrinkGrowAffineWrite {
  readonly xScale: number;
  readonly yScale: number;
  readonly rotationSigned: 0;
  readonly rotationU16: 0;
}

export interface BackShrinkGrowFrame {
  readonly x2: 0;
  readonly y2: number;
  readonly data0: 0;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  readonly data2: number;
  readonly data4: number;
  readonly data5: 0;
  readonly data6: BackShrinkGrowSpeed;
  readonly data7: BackShrinkGrowPhaseLimit;
  readonly phaseBefore: number;
  readonly phaseAfter: number;
  readonly duration: number;
  readonly selector: BackShrinkGrowSelector;
  readonly sourceId: BackShrinkGrowSourceId;
  readonly speed: BackShrinkGrowSpeed;
  readonly phaseLimit: BackShrinkGrowPhaseLimit;
  readonly xScale: number;
  readonly yScale: number;
  readonly initializerCalled: boolean;
  readonly handleStartAffineAnimCalls: 0 | 1;
  readonly callbackInvokedByInitializer: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 0;
  readonly affineWriteCount: 1;
  readonly affineWrites: readonly [BackShrinkGrowAffineWrite];
  readonly affineMode: "double" | "normal";
  readonly callback: BackShrinkGrowCallback | "WaitAnimEnd";
}

/**
 * Source-order reducer for the complete `BACK_ANIM_SHRINK_GROW` triple.
 * The selected initializer first calls HandleStartAffineAnim, writes data[7]
 * and data[6], then immediately invokes ShrinkGrow. ShrinkGrow runs while
 * `data[2] <= (128 / data[6]) * data[7]`, using C integer division for the
 * y2 correction and source signed GBA Sin/affine writes.
 */
export function backShrinkGrowFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackShrinkGrowFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_SHRINK_GROW") return null;
  const variant = shrinkGrowVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected shrink/grow selector ${selection.selector}`);

  // This is the source expression, including its C integer division order.
  const duration = Math.floor(128 / variant.speed) * variant.phaseLimit;
  const terminal = ticksSinceStart > duration;
  const activeTick = terminal ? duration : ticksSinceStart;
  const phaseBefore = (activeTick * variant.speed) & 0xff;
  const phaseAfter = (phaseBefore + variant.speed) & 0xff;
  const data2 = terminal ? duration + 1 : activeTick + 1;
  const sinY = gbaSin(phaseBefore, 32);
  const yScale = terminal ? 256 : sinY + 256;
  // `posY = (256 - yScale) / 8` is C s16 division (towards zero), not a
  // floating-point floor for the negative numerator.
  const posY = !terminal && yScale > 256 ? Math.trunc((256 - yScale) / 8) : 0;
  // A GBA s16 write canonicalizes the source expression's `-(0)` to zero;
  // keep JS's signed-zero distinction out of the observable sprite state.
  const y2 = terminal || posY === 0 ? 0 : -posY;
  const xScale = terminal ? 256 : gbaSin(phaseBefore, 48) + 256;
  const write = Object.freeze({
    xScale,
    yScale,
    rotationSigned: 0 as const,
    rotationU16: 0 as const,
  });
  return Object.freeze({
    x2: 0 as const,
    y2,
    data0: 0 as const,
    data1: toS16(preservedData1),
    data2,
    data4: phaseAfter,
    data5: 0 as const,
    data6: variant.speed,
    data7: variant.phaseLimit,
    phaseBefore,
    phaseAfter,
    duration,
    selector: variant.selector,
    sourceId: variant.sourceId,
    speed: variant.speed,
    phaseLimit: variant.phaseLimit,
    xScale,
    yScale,
    initializerCalled: ticksSinceStart === 0,
    handleStartAffineAnimCalls: ticksSinceStart === 0 ? 1 as const : 0 as const,
    callbackInvokedByInitializer: true as const,
    resetSpriteAfterAnim: terminal,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 0 as const,
    affineWriteCount: 1 as const,
    affineWrites: [write] as const,
    affineMode: terminal ? "normal" as const : "double" as const,
    callback: terminal ? "WaitAnimEnd" as const : variant.callback,
  });
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backShrinkGrowWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackGrowAffineWrite {
  readonly xScale: number;
  readonly yScale: number;
  readonly rotationSigned: 0;
  readonly rotationU16: 0;
}

export interface BackGrowFrame {
  readonly x2: 0;
  readonly y2: 0;
  readonly data0: 0;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  readonly data2: 1;
  readonly data4: 0;
  readonly data5: number;
  readonly data6: number;
  readonly data7: number;
  readonly selector: BackGrowSelector;
  readonly sourceId: BackGrowSourceId;
  readonly speed: number | null;
  readonly runs: number | null;
  readonly xScale: number;
  readonly yScale: number;
  readonly initializerCalled: boolean;
  readonly handleStartAffineAnimCalls: 0 | 1;
  readonly callbackInvokedByInitializer: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 2;
  readonly affineWriteCount: number;
  readonly affineWrites: readonly BackGrowAffineWrite[];
  /** The staged callback writes twice on its terminal invocation. */
  readonly terminalAffineWriteOrdering: readonly string[];
  readonly affineMode: "double" | "normal";
  readonly callback: BackGrowCallback | "WaitAnimEnd";
}

function growAffineWrite(xScale: number, yScale = xScale): BackGrowAffineWrite {
  return Object.freeze({
    xScale,
    yScale,
    rotationSigned: 0 as const,
    rotationU16: 0 as const,
  });
}

/**
 * Source-order reducer for `Anim_Grow` and `Anim_Grow_Twice` plus their shared
 * `Grow` helper. The extra invocation that clears `data[7]` between the two
 * cycles is retained; it has no affine write in the C source.
 */
export function backGrowFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackGrowFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_GROW") return null;
  const variant = growVariant(selection.selector);
  if (variant === null || variant.speed === undefined || variant.runs === undefined) return null;

  let data5 = variant.runs;
  let data6 = variant.speed;
  let data7 = 0;
  let xScale = 256;
  let yScale = 256;
  let affineMode: "double" | "normal" = "double";
  let callback: BackGrowCallback | "WaitAnimEnd" = variant.callback;
  let resetSpriteAfterAnim = false;
  let terminal = false;
  let writes: readonly BackGrowAffineWrite[] = [];

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal) break;
    writes = [];
    if (data7 > 255) {
      if (data5 <= 1) {
        // Grow resets the affine mode, then performs its final identity write.
        resetSpriteAfterAnim = true;
        affineMode = "normal";
        callback = "WaitAnimEnd";
        xScale = 256;
        yScale = 256;
        writes = [growAffineWrite(256)];
        terminal = true;
      } else {
        data5 -= 1;
        data7 = 0;
      }
    } else {
      data7 += data6;
      if (data7 > 256) data7 = 256;
      const scale = gbaSin(Math.trunc(data7 / 2), 64);
      xScale = 256 - scale;
      yScale = xScale;
      writes = [growAffineWrite(xScale)];
    }
  }

  return Object.freeze({
    x2: 0 as const,
    y2: 0 as const,
    data0: 0 as const,
    data1: toS16(preservedData1),
    data2: 1 as const,
    data4: 0 as const,
    data5,
    data6,
    data7,
    selector: variant.selector,
    sourceId: variant.sourceId,
    speed: variant.speed,
    runs: variant.runs,
    xScale,
    yScale,
    initializerCalled: ticksSinceStart === 0,
    handleStartAffineAnimCalls: ticksSinceStart === 0 ? 1 as const : 0 as const,
    callbackInvokedByInitializer: true as const,
    resetSpriteAfterAnim,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 2 as const,
    affineWriteCount: writes.length,
    affineWrites: writes,
    terminalAffineWriteOrdering: [],
    affineMode,
    callback,
  });
}

/**
 * Source-order reducer for the distinct `Anim_GrowInStages` callback. Its
 * stage transitions and data[6] pauses intentionally do not share the Grow
 * reducer above, even though both callbacks ultimately scale the sprite.
 */
export function backGrowInStagesFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackGrowFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_GROW") return null;
  const variant = growVariant(selection.selector);
  if (variant === null || variant.speed !== undefined || variant.runs !== undefined) return null;

  let data2 = 0;
  let data5 = 0;
  let data6 = 0;
  let data7 = 0;
  let xScale = 256;
  let yScale = 256;
  let affineMode: "double" | "normal" = "double";
  let callback: BackGrowCallback | "WaitAnimEnd" = variant.callback;
  let resetSpriteAfterAnim = false;
  let terminal = false;
  let writes: readonly BackGrowAffineWrite[] = [];
  let terminalAffineWriteOrdering: readonly string[] = [];

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal) break;
    writes = [];
    terminalAffineWriteOrdering = [];
    if (data2 === 0) data2 = 1;

    if (data6 > 0) {
      data6 -= 1;
      if (data5 !== 3) {
        const pauseScale = Math.trunc((8 * data6) / 20);
        const scale = gbaSin(data7 - pauseScale, 64);
        xScale = 256 - scale;
        yScale = xScale;
        writes = [growAffineWrite(xScale)];
      }
    } else {
      let variable: number;
      if (data5 === 3) {
        if (data7 > 63) {
          data7 = 64;
          // The source writes identity before ResetSpriteAfterAnim and then
          // writes the same identity again after computing Cos(data[7], 64).
          xScale = 256;
          yScale = 256;
          writes = [growAffineWrite(256)];
          resetSpriteAfterAnim = true;
          affineMode = "normal";
          callback = "WaitAnimEnd";
          terminal = true;
          terminalAffineWriteOrdering = [
            "HandleSetAffineData(256, 256, 0)",
            "HandleSetAffineData(256, 256, 0)",
          ];
        }
        variable = gbaCos(data7, 64);
      } else {
        variable = gbaSin(data7, 64);
        if (data7 > 63) {
          data5 = 3;
          data6 = 10;
          data7 = 0;
        } else if (variable > 48 && data5 === 1) {
          data5 = 2;
          data6 = 20;
        } else if (variable > 16 && data5 === 0) {
          data5 = 1;
          data6 = 20;
        }
      }

      data7 += 2;
      xScale = 256 - variable;
      yScale = xScale;
      writes = terminal
        ? [...writes, growAffineWrite(xScale)]
        : [growAffineWrite(xScale)];
    }
  }

  return Object.freeze({
    x2: 0 as const,
    y2: 0 as const,
    data0: 0 as const,
    data1: toS16(preservedData1),
    data2: 1 as const,
    data4: 0 as const,
    data5,
    data6,
    data7,
    selector: variant.selector,
    sourceId: variant.sourceId,
    speed: null,
    runs: null,
    xScale,
    yScale,
    initializerCalled: ticksSinceStart === 0,
    handleStartAffineAnimCalls: ticksSinceStart === 0 ? 1 as const : 0 as const,
    callbackInvokedByInitializer: true as const,
    resetSpriteAfterAnim,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 2 as const,
    affineWriteCount: writes.length,
    affineWrites: writes,
    terminalAffineWriteOrdering,
    affineMode,
    callback,
  });
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backGrowWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackGrowStutterFrame {
  readonly x2: 0;
  readonly y2: 0;
  readonly data0: 0;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  readonly data2: 1;
  readonly data3: BackGrowStutterAmplitude;
  readonly data4: number;
  readonly data5: number;
  readonly data6: BackGrowStutterDuration;
  readonly data7: number;
  readonly index1: number;
  readonly index2: number;
  readonly selector: BackGrowStutterSelector;
  readonly sourceId: BackGrowStutterSourceId;
  readonly duration: BackGrowStutterDuration;
  readonly amplitude: BackGrowStutterAmplitude;
  readonly runs: BackGrowStutterRuns;
  readonly xScale: number;
  readonly yScale: number;
  readonly initializerCalled: boolean;
  readonly handleStartAffineAnimCalls: 0 | 1;
  readonly callbackInvokedByInitializer: true;
  readonly resetSpriteAfterAnim: boolean;
  readonly normalBackDontFlip: true;
  /** GrowStutter has no source TryFlipX calls. */
  readonly tryFlipXCalls: 0;
  readonly affineWriteCount: number;
  readonly affineWrites: readonly BackGrowAffineWrite[];
  readonly affineMode: "double" | "normal";
  readonly callback: BackGrowStutterCallback | "WaitAnimEnd";
}

/**
 * Source-order reducer for the complete `BACK_ANIM_GROW_STUTTER` triple.
 * `GrowStutter` is shared by all three initializers: the selected initializer
 * runs on the first task tick and remains installed while it invokes the
 * helper. The extra boundary invocation resets data[5]/data[7] between the
 * twice variant's two cycles and writes affine identity without advancing the
 * phase.
 */
export function backGrowStutterFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackGrowStutterFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_GROW_STUTTER") return null;
  const variant = growStutterVariant(selection.selector);
  if (variant === null) return null;

  let data2 = 0;
  let data3 = variant.amplitude;
  let data4 = variant.runs;
  let data5 = 0;
  let data6 = variant.duration;
  let data7 = 0;
  let index1 = 0;
  let index2 = 0;
  let xScale = 256;
  let yScale = 256;
  let affineMode: "double" | "normal" = "double";
  let callback: BackGrowStutterCallback | "WaitAnimEnd" = variant.callback;
  let resetSpriteAfterAnim = false;
  let terminal = false;
  let writes: readonly BackGrowAffineWrite[] = [];

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal) break;
    writes = [];
    resetSpriteAfterAnim = false;
    if (data2 === 0) data2 = 1;

    if (data5 > data6) {
      data5 = 0;
      yScale = 256;
      xScale = 256;
      writes = [growAffineWrite(256)];
      if (data4 <= 1) {
        resetSpriteAfterAnim = true;
        affineMode = "normal";
        callback = "WaitAnimEnd";
        terminal = true;
      } else {
        data4 -= 1;
        data7 = 0;
      }
      continue;
    }

    index2 = Math.trunc((data5 * 128) / data6);
    const cmpVal1 = Math.trunc(data6 / 4);
    const cmpVal2 = cmpVal1 * 3;
    index1 = 0;
    if (data5 >= cmpVal1 && data5 < cmpVal2) {
      data7 += 51;
      index1 = data7 & 0xff;
    }
    const xJitter = gbaSin(index1, Math.trunc(data3 / 5) * 2);
    const bodyScale = gbaSin(index2, data3);
    const yJitter = gbaSin(index1, Math.trunc(data3 / 5));
    xScale = 256 - xJitter - bodyScale;
    yScale = 256 - yJitter - bodyScale;
    writes = [growAffineWrite(xScale, yScale)];
    // The C helper increments data[5] after the affine write.
    data5 += 1;
  }

  return Object.freeze({
    x2: 0 as const,
    y2: 0 as const,
    data0: 0 as const,
    data1: toS16(preservedData1),
    data2: 1 as const,
    data3,
    data4,
    data5,
    data6,
    data7,
    index1,
    index2,
    selector: variant.selector,
    sourceId: variant.sourceId,
    duration: variant.duration,
    amplitude: variant.amplitude,
    runs: variant.runs,
    xScale,
    yScale,
    initializerCalled: ticksSinceStart === 0,
    handleStartAffineAnimCalls: ticksSinceStart === 0 ? 1 as const : 0 as const,
    callbackInvokedByInitializer: true as const,
    resetSpriteAfterAnim,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 0 as const,
    affineWriteCount: writes.length,
    affineWrites: writes,
    affineMode,
    callback,
  });
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backGrowStutterWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackCircleCounterclockwiseFrame {
  readonly x2: number;
  readonly y2: number;
  /** `AddNewAnim`'s four-slot animation record id. */
  readonly data0: number;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** `sprite->data[2]` immediately before the shared source callback. */
  readonly data2Before: number;
  /** The source increments data[2] after either branch. */
  readonly data2: number;
  readonly index: number | null;
  readonly sin: number | null;
  readonly cos: number | null;
  readonly selector: BackCircleCounterclockwiseSelector;
  readonly sourceId: BackCircleCounterclockwiseSourceId;
  readonly rotation: 512 | 1024;
  readonly data: 3 | 6;
  readonly speed: 12 | 24;
  /** Tick zero invokes the selected initializer before it installs the helper. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  readonly normalBackDontFlip: true;
  /** Both source-order flips are no-ops after the shared back task sets this flag. */
  readonly tryFlipXCalls: 2;
  readonly affineWriteCount: 0;
  readonly affineMode: "normal";
  readonly resetSpriteAfterAnim: false;
  readonly callback: "CircleCounterclockwise" | "WaitAnimEnd";
}

/**
 * Source-order reducer for every `BACK_ANIM_CIRCLE_COUNTERCLOCKWISE` route.
 * The species + party-nature seam selects one initializer; that initializer
 * stores an `AddNewAnim` slot, writes its rotation/data/speed record, invokes
 * CircleCounterclockwise once, then replaces itself with that shared callback.
 * `animationSlot` is the source global's circular `sAnimIdx` result, not a
 * species selector (the task normally starts the isolated receipt at slot 0).
 */
export function backCircleCounterclockwiseFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
  animationSlot = 0,
): BackCircleCounterclockwiseFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0
    || !Number.isInteger(preservedData1)
    || !Number.isInteger(animationSlot) || animationSlot < 0 || animationSlot >= 4) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_CIRCLE_COUNTERCLOCKWISE") return null;
  const variant = circleCounterclockwiseVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected circle-counterclockwise selector ${selection.selector}`);

  let data2 = 0;
  let callback: BackCircleCounterclockwiseFrame["callback"] = "CircleCounterclockwise";
  let lastFrame: BackCircleCounterclockwiseFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    // WaitAnimEnd merely polls the static OAM animation after the source
    // helper hands off. Preserve the terminal source writes for later ticks.
    if (callback === "WaitAnimEnd") continue;

    const data2Before = data2;
    let x2 = 0;
    let y2 = 0;
    let index: number | null = null;
    let sin: number | null = null;
    let cos: number | null = null;

    // Source order: TryFlipX, strict guard/body, data[2] += speed, TryFlipX.
    if (data2 > variant.rotation) {
      callback = "WaitAnimEnd";
    } else {
      index = (data2 + 192) % 256;
      cos = gbaCos(index, variant.data * 2);
      sin = gbaSin(index, variant.data);
      // A signed GBA store canonicalizes a negated zero to an ordinary zero.
      x2 = cos === 0 ? 0 : -cos;
      y2 = toS16(sin + variant.data);
    }
    data2 = toS16(data2 + variant.speed);

    lastFrame = Object.freeze({
      x2,
      y2,
      data0: animationSlot,
      data1: toS16(preservedData1),
      data2Before,
      data2,
      index,
      sin,
      cos,
      selector: variant.selector,
      sourceId: variant.sourceId,
      rotation: variant.rotation,
      data: variant.data,
      speed: variant.speed,
      initializerCallBeforeCallbackInstall: tick === 0,
      normalBackDontFlip: true as const,
      tryFlipXCalls: 2 as const,
      affineWriteCount: 0 as const,
      affineMode: "normal" as const,
      resetSpriteAfterAnim: false as const,
      callback,
    });
  }

  if (lastFrame === null) throw new Error("unreachable back circle-counterclockwise reducer state");
  return lastFrame;
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backCircleCounterclockwiseWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackHorizontalShakeFrame {
  readonly x2: number;
  readonly y2: 0;
  readonly data0: BackHShakeStep;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** `sprite->data[2]` immediately before the shared source callback. */
  readonly data2Before: number;
  /** The source adds `data[0]` even on its terminal callback. */
  readonly data2: number;
  readonly data7: BackHShakeAmplitude;
  readonly index: number | null;
  readonly selector: BackHShakeSelector;
  readonly sourceId: BackHShakeSourceId;
  readonly step: BackHShakeStep;
  readonly amplitude: BackHShakeAmplitude;
  /** Tick zero invokes the selected initializer before installing the helper. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 0;
  readonly affineWriteCount: 0;
  readonly affineMode: "normal";
  readonly resetSpriteAfterAnim: false;
  readonly callback: "HorizontalShake" | "WaitAnimEnd";
}

/**
 * Source-order reducer for every `BACK_ANIM_H_SHAKE` selector. The selected
 * initializer writes `data[0]`/`data[7]`, invokes HorizontalShake once, then
 * installs it as callback. HorizontalShake clears x2 and installs WaitAnimEnd
 * only after the strict `counter > 2304` guard; it still increments data[2]
 * on that terminal call. Back sprites set `sDontFlip`, but this helper makes
 * no TryFlipX calls at all.
 */
export function backHorizontalShakeFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackHorizontalShakeFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_H_SHAKE") return null;
  const variant = hShakeVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected H-shake selector ${selection.selector}`);

  const terminalTick = Math.floor(2304 / variant.step) + 1;
  const effectiveTick = Math.min(ticksSinceStart, terminalTick);
  const data2Before = effectiveTick * variant.step;
  const terminal = effectiveTick === terminalTick;
  const data2 = toS16(data2Before + variant.step);
  const index = terminal ? null : data2Before % 256;
  return Object.freeze({
    x2: terminal ? 0 : gbaSin(index!, variant.amplitude),
    y2: 0 as const,
    data0: variant.step,
    data1: toS16(preservedData1),
    data2Before: toS16(data2Before),
    data2,
    data7: variant.amplitude,
    index,
    selector: variant.selector,
    sourceId: variant.sourceId,
    step: variant.step,
    amplitude: variant.amplitude,
    initializerCallBeforeCallbackInstall: effectiveTick === 0,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 0 as const,
    affineWriteCount: 0 as const,
    affineMode: "normal" as const,
    resetSpriteAfterAnim: false as const,
    callback: terminal ? "WaitAnimEnd" as const : "HorizontalShake" as const,
  });
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backHorizontalShakeWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackVerticalShakeFrame {
  readonly x2: 0;
  readonly y2: number;
  readonly data0: BackVShakeStep;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** `sprite->data[2]` immediately before the shared source callback. */
  readonly data2Before: number;
  /** The source adds `data[0]` even on its terminal callback. */
  readonly data2: number;
  readonly data7: BackVShakeAmplitude;
  readonly index: number | null;
  readonly selector: BackVShakeSelector;
  readonly sourceId: BackVShakeSourceId;
  readonly step: BackVShakeStep;
  readonly amplitude: BackVShakeAmplitude;
  /** Tick zero invokes the selected initializer before installing the helper. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 0;
  readonly affineWriteCount: 0;
  readonly affineMode: "normal";
  readonly resetSpriteAfterAnim: false;
  readonly callback: "VerticalShakeBack" | "WaitAnimEnd";
}

/**
 * Source-order reducer for every `BACK_ANIM_V_SHAKE` selector. The selected
 * initializer writes `data[0]`/`data[7]`, invokes VerticalShakeBack once,
 * then installs it as callback. VerticalShakeBack clears y2 and installs
 * WaitAnimEnd only after the strict `counter > 2304` guard; it still
 * increments data[2] on that terminal call. The shared helper offsets its
 * sine phase by 192 and adds the amplitude, and makes no TryFlipX calls.
 */
export function backVerticalShakeFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackVerticalShakeFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_V_SHAKE") return null;
  const variant = vShakeVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected V-shake selector ${selection.selector}`);

  const terminalTick = Math.floor(2304 / variant.step) + 1;
  const effectiveTick = Math.min(ticksSinceStart, terminalTick);
  const data2Before = effectiveTick * variant.step;
  const terminal = effectiveTick === terminalTick;
  const data2 = toS16(data2Before + variant.step);
  const index = terminal ? null : (data2Before + 192) % 256;
  return Object.freeze({
    x2: 0 as const,
    y2: terminal ? 0 : gbaSin(index!, variant.amplitude) + variant.amplitude,
    data0: variant.step,
    data1: toS16(preservedData1),
    data2Before: toS16(data2Before),
    data2,
    data7: variant.amplitude,
    index,
    selector: variant.selector,
    sourceId: variant.sourceId,
    step: variant.step,
    amplitude: variant.amplitude,
    initializerCallBeforeCallbackInstall: effectiveTick === 0,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 0 as const,
    affineWriteCount: 0 as const,
    affineMode: "normal" as const,
    resetSpriteAfterAnim: false as const,
    callback: terminal ? "WaitAnimEnd" as const : "VerticalShakeBack" as const,
  });
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backVerticalShakeWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

const VERTICAL_SHAKE_LOW_PHASES = Object.freeze([
  Object.freeze({ sourceMultiplier: 6, duration: 30 }),
  Object.freeze({ sourceMultiplier: -2, duration: 15 }),
  Object.freeze({ sourceMultiplier: 6, duration: 30 }),
] as const);

export interface BackVerticalShakeLowFrame {
  readonly x2: 0;
  readonly y2: number;
  readonly data0: BackVShakeLowStep;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** The phase-row cursor into source `sVerticalShakeData`. */
  readonly data5: 0 | 1 | 2 | 3;
  /** Progress in the current pulse/gap row, reset at each source boundary. */
  readonly data6: number;
  readonly data7: BackVShakeLowAmplitude;
  /** `u8 var8 = sprite->data[2]` before the shared helper call. */
  readonly data2Before: number;
  readonly data2: number;
  readonly sourceRowMultiplier: 6 | -2 | -1;
  readonly sourceRowDuration: 30 | 15 | 0;
  /** Source `var7`: the damped signed GBA sine amplitude for this callback. */
  readonly effectiveAmplitude: number;
  readonly sineIndex: number | null;
  readonly phaseBoundary: boolean;
  readonly selector: BackVShakeLowSelector;
  readonly sourceId: BackVShakeLowSourceId;
  readonly step: BackVShakeLowStep;
  readonly amplitude: BackVShakeLowAmplitude;
  /** Tick zero calls the selected initializer before it installs the helper. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  readonly normalBackDontFlip: true;
  /** This source family has no TryFlipX or affine operations. */
  readonly tryFlipXCalls: 0;
  readonly affineWriteCount: 0;
  readonly affineMode: "normal";
  readonly resetSpriteAfterAnim: false;
  readonly callback: "VerticalShakeLowTwice" | "WaitAnimEnd";
}

/**
 * Exact source-order reducer for `BACK_ANIM_V_SHAKE_LOW`.  Its terminating
 * `{-1, 0}` row does not advance any state: it clears y2 and hands off to
 * WaitAnimEnd on the callback after the second pulse's duration boundary.
 * The middle `{-2, 15}` row intentionally forces amplitude zero while still
 * advancing the u8-derived sine counter on all but its boundary callback.
 */
export function backVerticalShakeLowFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackVerticalShakeLowFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_V_SHAKE_LOW") return null;
  const variant = vShakeLowVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected V-shake-low selector ${selection.selector}`);

  let data2 = 0;
  let data5 = 0 as 0 | 1 | 2 | 3;
  let data6 = 0;
  let terminal = false;
  let result: BackVerticalShakeLowFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal) break;
    const data2Before = data2;
    if (data5 === 3) {
      result = Object.freeze({
        x2: 0 as const,
        y2: 0,
        data0: variant.step,
        data1: toS16(preservedData1),
        data5,
        data6,
        data7: variant.amplitude,
        data2Before: toS16(data2Before),
        data2: toS16(data2),
        sourceRowMultiplier: -1 as const,
        sourceRowDuration: 0 as const,
        effectiveAmplitude: 0,
        sineIndex: null,
        phaseBoundary: false,
        selector: variant.selector,
        sourceId: variant.sourceId,
        step: variant.step,
        amplitude: variant.amplitude,
        initializerCallBeforeCallbackInstall: tick === 0,
        normalBackDontFlip: true as const,
        tryFlipXCalls: 0 as const,
        affineWriteCount: 0 as const,
        affineMode: "normal" as const,
        resetSpriteAfterAnim: false as const,
        callback: "WaitAnimEnd" as const,
      });
      terminal = true;
      continue;
    }

    const phase = VERTICAL_SHAKE_LOW_PHASES[data5]!;
    const effectiveAmplitude = phase.sourceMultiplier === -2
      ? 0
      : Math.trunc(((phase.duration - data6) * variant.amplitude) / phase.duration);
    const sineIndex = ((data2Before & 0xff) + 192) & 0xff;
    const phaseBoundary = data6 === phase.duration;
    if (phaseBoundary) {
      data5 = (data5 + 1) as 0 | 1 | 2 | 3;
      data6 = 0;
    } else {
      data2 = toS16(data2 + variant.step);
      data6 += 1;
    }
    result = Object.freeze({
      x2: 0 as const,
      y2: gbaSin(sineIndex, effectiveAmplitude) + effectiveAmplitude,
      data0: variant.step,
      data1: toS16(preservedData1),
      data5,
      data6,
      data7: variant.amplitude,
      data2Before: toS16(data2Before),
      data2: toS16(data2),
      sourceRowMultiplier: phase.sourceMultiplier,
      sourceRowDuration: phase.duration,
      effectiveAmplitude,
      sineIndex,
      phaseBoundary,
      selector: variant.selector,
      sourceId: variant.sourceId,
      step: variant.step,
      amplitude: variant.amplitude,
      initializerCallBeforeCallbackInstall: tick === 0,
      normalBackDontFlip: true as const,
      tryFlipXCalls: 0 as const,
      affineWriteCount: 0 as const,
      affineMode: "normal" as const,
      resetSpriteAfterAnim: false as const,
      callback: "VerticalShakeLowTwice" as const,
    });
  }
  return result;
}

/** Source WaitAnimEnd lifecycle after the static back OAM reports animEnded. */
export function backVerticalShakeLowWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

const TRIANGLE_DOWN_ROWS = Object.freeze([
  Object.freeze({ x: 1, y: 1, timer: 12 }),
  Object.freeze({ x: -2, y: 0, timer: 12 }),
  Object.freeze({ x: 1, y: -1, timer: 12 }),
  Object.freeze({ x: 0, y: 0, timer: 0 }),
] as const);

function cS16Division(numerator: number, denominator: number): number {
  const signedNumerator = toS16(numerator);
  const signedDenominator = toS16(denominator);
  if (signedDenominator === 0) throw new Error("source s16 division by zero");
  return toS16(Math.trunc(signedNumerator / signedDenominator));
}

export interface BackTriangleDownFrame {
  readonly x2: number;
  readonly y2: number;
  /** The shared task zeroes this register and TriangleDown never writes it. */
  readonly data0: 0;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** Progress within the selected source row before/after the callback. */
  readonly data2Before: number;
  readonly data2: number;
  /** Source `sTriangleDownData` row cursor after the callback. */
  readonly data3: 0 | 1 | 2 | 3;
  /** Shared task register; TriangleDown leaves it zeroed. */
  readonly data4: 0;
  /** Source amplitude and signed `timer / data[5]` divisor. */
  readonly data5: BackTriangleDownAmplitude;
  /** Source repeat count after the callback's terminal-row decrement. */
  readonly data6: 0 | 1 | 2;
  /** Shared task register; TriangleDown leaves it zeroed. */
  readonly data7: 0;
  readonly sourceRowIndex: 0 | 1 | 2 | 3;
  readonly sourceRowX: -2 | 0 | 1;
  readonly sourceRowY: -1 | 0 | 1;
  readonly sourceRowTimer: 0 | 12;
  /** Exact C signed division of `sourceRowTimer / data[5]`. */
  readonly sourceRowDuration: 0 | 6 | 12;
  /** The first conditional branch advanced rows before this row was used. */
  readonly phaseBoundary: boolean;
  /** A non-final terminal row restarts because `data[2] == 0` next callback. */
  readonly repeatWillRestart: boolean;
  readonly selector: BackTriangleDownSelector;
  readonly sourceId: BackTriangleDownSourceId;
  readonly amplitude: BackTriangleDownAmplitude;
  readonly runs: BackTriangleDownRuns;
  /** Tick zero is the initializer's immediate helper invocation. */
  readonly initializerCallBeforeCallbackInstall: boolean;
  /** First TryFlipX always runs; active vector rows call it once more. */
  readonly tryFlipXCalls: 1 | 2;
  /** Both source TryFlipX calls are no-ops under Task_HandleMonAnimation. */
  readonly normalBackDontFlip: true;
  /** TriangleDown neither changes affine state nor hides the OAM entry. */
  readonly affineWriteCount: 0;
  readonly affineMode: "normal";
  readonly oamVisible: true;
  readonly resetSpriteAfterAnim: false;
  readonly callback: "TriangleDown" | "WaitAnimEnd";
}

/**
 * Source-order reducer for `BACK_ANIM_TRIANGLE_DOWN`. The terminal row is
 * deliberately inspected after the row-boundary check. On the twice variant,
 * its first visit decrements `data[6]` but leaves `data[3] == 3`; the next
 * callback's `data[2] == 0` reset is what starts the second triangle.
 */
export function backTriangleDownFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackTriangleDownFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_TRIANGLE_DOWN") return null;
  const variant = triangleDownVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected triangle-down selector ${selection.selector}`);

  let x2 = 0;
  let y2 = 0;
  let data2 = 0;
  let data3 = 0 as 0 | 1 | 2 | 3;
  let data6: 0 | 1 | 2 = variant.runs;
  let terminal = false;
  let result: BackTriangleDownFrame | null = null;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal) break;
    const data2Before = data2;
    if (data2 === 0) data3 = 0;

    const rowBeforeBoundary = TRIANGLE_DOWN_ROWS[data3]!;
    const durationBeforeBoundary = cS16Division(rowBeforeBoundary.timer, variant.amplitude);
    const phaseBoundary = durationBeforeBoundary === data2;
    if (phaseBoundary) {
      data3 = (data3 + 1) as 0 | 1 | 2 | 3;
      data2 = 0;
    }

    const row = TRIANGLE_DOWN_ROWS[data3]!;
    const sourceRowDuration = cS16Division(row.timer, variant.amplitude) as 0 | 6 | 12;
    const isTerminalRow = sourceRowDuration === 0;
    let callback: "TriangleDown" | "WaitAnimEnd" = "TriangleDown";
    if (isTerminalRow) {
      data6 = toS16(data6 - 1) as 0 | 1 | 2;
      if (data6 === 0) {
        callback = "WaitAnimEnd";
        terminal = true;
      } else {
        data2 = 0;
      }
    } else {
      x2 = toS16(x2 + row.x * variant.amplitude);
      y2 = toS16(y2 + row.y * variant.amplitude);
      data2 = toS16(data2 + 1);
    }

    result = Object.freeze({
      x2,
      y2,
      data0: 0 as const,
      data1: toS16(preservedData1),
      data2Before: toS16(data2Before),
      data2: toS16(data2),
      data3,
      data4: 0 as const,
      data5: variant.amplitude,
      data6,
      data7: 0 as const,
      sourceRowIndex: data3,
      sourceRowX: row.x,
      sourceRowY: row.y,
      sourceRowTimer: row.timer,
      sourceRowDuration,
      phaseBoundary,
      repeatWillRestart: isTerminalRow && data6 > 0,
      selector: variant.selector,
      sourceId: variant.sourceId,
      amplitude: variant.amplitude,
      runs: variant.runs,
      initializerCallBeforeCallbackInstall: tick === 0,
      tryFlipXCalls: isTerminalRow ? 1 as const : 2 as const,
      normalBackDontFlip: true as const,
      affineWriteCount: 0 as const,
      affineMode: "normal" as const,
      oamVisible: true as const,
      resetSpriteAfterAnim: false as const,
      callback,
    });
  }
  return result;
}

/** Source WaitAnimEnd lifecycle after the static back OAM reports animEnded. */
export function backTriangleDownWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

/**
 * Task_HandleMonAnimation restores battler/data[0], species/data[2], and
 * clears only data[1] after TriangleDown reaches the dummy. The source helper
 * intentionally leaves its terminal row cursor and amplitude in data[3]/[5].
 */
export function backTriangleDownTerminalSpriteData(
  species: string,
  natureId: number,
  battlerId: number,
  speciesId: number,
): readonly [number, 0, number, 3, 0, BackTriangleDownAmplitude, 0, 0] | null {
  if (!Number.isInteger(battlerId) || !Number.isInteger(speciesId)) return null;
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_TRIANGLE_DOWN") return null;
  const variant = triangleDownVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected triangle-down selector ${selection.selector}`);
  return [toS16(battlerId), 0, toS16(speciesId), 3, 0, variant.amplitude, 0, 0];
}

export interface BackVerticalShakeHorizontalSlideFrame {
  readonly x2: number;
  readonly y2: number;
  /** The shared player-back task owns this zeroed register. */
  readonly data0: 0;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** `sprite->data[2]` immediately before the selected source callback. */
  readonly data2Before: number;
  /** Active calls add the selected step; the terminal call retains it. */
  readonly data2: number;
  /** The source explicitly writes this zero only at the terminal branch. */
  readonly data6: 0;
  readonly horizontalPhase: 0 | 1 | 2 | 3 | null;
  readonly horizontalRemainder: number | null;
  readonly ySineIndex: number | null;
  readonly selector: BackVShakeHSlideSelector;
  readonly sourceId: BackVShakeHSlideSourceId;
  readonly step: BackVShakeHSlideStep;
  readonly modulus: BackVShakeHSlideModulus;
  readonly amplitude: 4;
  /** The task dispatches the selected callback directly; no helper install occurs. */
  readonly callbackInvokedDirectlyFromTask: true;
  readonly normalBackDontFlip: true;
  /** Both selected source callbacks call TryFlipX around their body. */
  readonly tryFlipXCalls: 2;
  readonly affineWriteCount: 0;
  readonly affineMode: "normal";
  readonly resetSpriteAfterAnim: false;
  readonly callback: BackVShakeHSlideCallback | "WaitAnimEnd";
}

/** Exact signed-C arithmetic for the source's four 512-counter X phases. */
function verticalShakeHorizontalSlideX2(counter: number): {
  readonly horizontalPhase: 0 | 1 | 2 | 3;
  readonly horizontalRemainder: number;
  readonly x2: number;
} {
  const horizontalPhase = Math.trunc(counter / 512) % 4 as 0 | 1 | 2 | 3;
  const horizontalRemainder = counter % 512;
  switch (horizontalPhase) {
    case 0:
      return { horizontalPhase, horizontalRemainder, x2: Math.trunc(horizontalRemainder / 32) };
    case 1:
      return {
        horizontalPhase,
        horizontalRemainder,
        x2: Math.trunc(-(horizontalRemainder * 16) / 512) + 16,
      };
    case 2:
      return {
        horizontalPhase,
        horizontalRemainder,
        x2: Math.trunc(-(horizontalRemainder * 16) / 512),
      };
    case 3:
      return { horizontalPhase, horizontalRemainder, x2: Math.trunc(horizontalRemainder / 32) - 16 };
  }
}

/**
 * Source-order reducer for every `BACK_ANIM_V_SHAKE_H_SLIDE` selector. Tick
 * zero is the selected callback's first direct task invocation after the
 * shared task has zeroed its registers. The strict `counter > 2048` branch
 * does not increment data[2] or clear x2/y2: it only installs WaitAnimEnd and
 * writes data[6] = 0, so the final active offsets remain visible.
 */
export function backVerticalShakeHorizontalSlideFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackVerticalShakeHorizontalSlideFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_V_SHAKE_H_SLIDE") return null;
  const variant = vShakeHSlideVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected V-shake/H-slide selector ${selection.selector}`);

  // The terminal callback is the first one whose initial counter is greater
  // than 2048. Clamp later reducer queries because WaitAnimEnd only polls.
  const terminalTick = Math.floor(2048 / variant.step) + 1;
  const effectiveTick = Math.min(ticksSinceStart, terminalTick);
  const terminal = effectiveTick === terminalTick;
  const data2Before = effectiveTick * variant.step;
  const activeCounter = terminal ? (terminalTick - 1) * variant.step : data2Before;
  const horizontal = verticalShakeHorizontalSlideX2(activeCounter);
  const ySineIndex = activeCounter % variant.modulus;

  return Object.freeze({
    x2: toS16(horizontal.x2),
    y2: gbaSin(ySineIndex, variant.amplitude),
    data0: 0 as const,
    data1: toS16(preservedData1),
    data2Before: toS16(data2Before),
    data2: toS16(terminal ? data2Before : data2Before + variant.step),
    data6: 0 as const,
    horizontalPhase: terminal ? null : horizontal.horizontalPhase,
    horizontalRemainder: terminal ? null : horizontal.horizontalRemainder,
    ySineIndex: terminal ? null : ySineIndex,
    selector: variant.selector,
    sourceId: variant.sourceId,
    step: variant.step,
    modulus: variant.modulus,
    amplitude: variant.amplitude,
    callbackInvokedDirectlyFromTask: true as const,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 2 as const,
    affineWriteCount: 0 as const,
    affineMode: "normal" as const,
    resetSpriteAfterAnim: false as const,
    callback: terminal ? "WaitAnimEnd" as const : variant.callback,
  });
}

/** Source WaitAnimEnd lifecycle after the static back OAM reports animEnded. */
export function backVerticalShakeHorizontalSlideWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackVerticalStretchAffineWrite {
  readonly xScale: number;
  readonly yScale: number;
  readonly rotationSigned: 0;
  readonly rotationU16: 0;
}

export interface BackVerticalStretchFrame {
  readonly x2: 0;
  /** VerticalStretchBothEnds clears y2 on both the cycle boundary and terminal path. */
  readonly y2: 0;
  /** Task_HandleMonAnimation zeroes this slot before the selected initializer. */
  readonly data0: 0 | 1;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** The initializer writes one before the first shared-helper invocation. */
  readonly data2: 1;
  readonly data3: BackVStretchAmplitude;
  /** Remaining helper cycles after the current callback. */
  readonly data4: number;
  /** Progress within the current stretch cycle. */
  readonly data5: number;
  readonly data6: BackVStretchDuration;
  /** The mid-window phase accumulator, s16-wrapped. */
  readonly data7: number;
  readonly index1: number;
  readonly index2: number | null;
  readonly phaseBoundary: boolean;
  readonly selector: BackVStretchSelector;
  readonly sourceId: BackVStretchSourceId;
  readonly duration: BackVStretchDuration;
  readonly amplitude: BackVStretchAmplitude;
  readonly runs: BackVStretchRuns;
  /** Tick zero invokes the initializer before the next callback update. */
  readonly initializerCalled: boolean;
  readonly handleStartAffineAnimCalls: 0 | 1;
  readonly callbackInvokedByInitializer: true;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 0;
  readonly resetSpriteAfterAnim: boolean;
  readonly affineWriteCount: number;
  readonly affineWrites: readonly BackVerticalStretchAffineWrite[];
  readonly affineMode: "double" | "normal";
  readonly callback: BackVStretchCallback | "WaitAnimEnd";
}

function verticalStretchAffineWrite(xScale: number, yScale: number): BackVerticalStretchAffineWrite {
  return Object.freeze({
    xScale: toS16(xScale),
    yScale: toS16(yScale),
    rotationSigned: 0 as const,
    rotationU16: 0 as const,
  });
}

/**
 * Source-order reducer for every `BACK_ANIM_V_STRETCH` selector. The
 * initializer sets data[2] to one, starts double-affine mode, writes the
 * duration/amplitude/run pair, and immediately calls VerticalStretchBothEnds.
 * The helper uses a strict `data[5] > data[6]` boundary: a cycle therefore
 * contains duration + 1 affine calls, with the boundary call writing identity
 * and either resetting the next run or installing WaitAnimEnd.
 */
export function backVerticalStretchFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackVerticalStretchFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_V_STRETCH") return null;
  const variant = vStretchVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected V-stretch selector ${selection.selector}`);

  let data0 = 0 as 0 | 1;
  let data2 = 0;
  let data4 = variant.runs;
  let data5 = 0;
  let data7 = 0;
  let xScale = 256;
  let yScale = 256;
  let index1 = 0;
  let index2: number | null = 0;
  let phaseBoundary = false;
  let resetSpriteAfterAnim = false;
  let affineMode: "double" | "normal" = "normal";
  let callback: BackVStretchCallback | "WaitAnimEnd" = variant.callback;
  let writes: readonly BackVerticalStretchAffineWrite[] = [];
  let terminal = false;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal) break;
    writes = [];
    phaseBoundary = false;
    if (data2 === 0) {
      data2 = 1;
      affineMode = "double";
      xScale = 256;
      yScale = 256;
      writes = [verticalStretchAffineWrite(256, 256)];
    }

    if (data5 > variant.duration) {
      phaseBoundary = true;
      yScale = 256;
      data5 = 0;
      index1 = 0;
      xScale = 256;
      writes = [verticalStretchAffineWrite(256, 256)];
      if (data4 <= 1) {
        resetSpriteAfterAnim = true;
        affineMode = "normal";
        callback = "WaitAnimEnd";
        terminal = true;
      } else {
        data4 -= 1;
        data7 = 0;
      }
      index2 = null;
    } else {
      index2 = Math.trunc((data5 * 128) / variant.duration);
      const cmpVal1 = Math.trunc(variant.duration / 4);
      const cmpVal2 = cmpVal1 * 3;
      if (data5 >= cmpVal1 && data5 < cmpVal2) {
        data7 = toS16(data7 + 51);
        index1 = data7 & 0xff;
      } else {
        index1 = 0;
      }
      xScale = 256 + gbaSin(index2, 16);
      yScale = 256 - gbaSin(index2, variant.amplitude)
        - gbaSin(index1, Math.trunc(variant.amplitude / 5));
      writes = [verticalStretchAffineWrite(xScale, yScale)];
      data5 += 1;
    }
  }

  return Object.freeze({
    x2: 0 as const,
    y2: 0 as const,
    data0,
    data1: toS16(preservedData1),
    data2: 1 as const,
    data3: variant.amplitude,
    data4,
    data5,
    data6: variant.duration,
    data7: toS16(data7),
    index1,
    index2,
    phaseBoundary,
    selector: variant.selector,
    sourceId: variant.sourceId,
    duration: variant.duration,
    amplitude: variant.amplitude,
    runs: variant.runs,
    initializerCalled: ticksSinceStart === 0,
    handleStartAffineAnimCalls: ticksSinceStart === 0 ? 1 as const : 0 as const,
    callbackInvokedByInitializer: true as const,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 0 as const,
    resetSpriteAfterAnim,
    affineWriteCount: writes.length,
    affineWrites: writes,
    affineMode,
    callback,
  });
}

/** Source WaitAnimEnd lifecycle after static back OAM reports animEnded. */
export function backVerticalStretchWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

export interface BackHorizontalStretchAffineWrite {
  readonly xScale: number;
  readonly yScale: 256;
  readonly rotationSigned: 0;
  readonly rotationU16: 0;
}

export interface BackHorizontalStretchFrame {
  /** HorizontalStretchFar never writes offsets after the task zeroes them. */
  readonly x2: 0;
  readonly y2: 0;
  /** Task_HandleMonAnimation zeroes this slot before the selected initializer. */
  readonly data0: 0 | 1;
  /** Task_HandleMonAnimation preserves this sprite-owned slot verbatim. */
  readonly data1: number;
  /** The initializer writes one before the first shared-helper invocation. */
  readonly data2: 1;
  readonly data3: BackHStretchAmplitude;
  /** Remaining helper cycles after the current callback. */
  readonly data4: number;
  /** Progress within the current stretch cycle. */
  readonly data5: number;
  readonly data6: BackHStretchDuration;
  /** The mid-window phase accumulator, s16-wrapped. */
  readonly data7: number;
  readonly index1: number;
  readonly index2: number | null;
  readonly phaseBoundary: boolean;
  readonly selector: BackHStretchSelector;
  readonly sourceId: BackHStretchSourceId;
  readonly duration: BackHStretchDuration;
  readonly amplitude: BackHStretchAmplitude;
  readonly runs: BackHStretchRuns;
  /** Tick zero invokes the initializer before the next callback update. */
  readonly initializerCalled: boolean;
  readonly handleStartAffineAnimCalls: 0 | 1;
  readonly callbackInvokedByInitializer: true;
  readonly normalBackDontFlip: true;
  readonly tryFlipXCalls: 0;
  readonly resetSpriteAfterAnim: boolean;
  readonly affineWriteCount: number;
  readonly affineWrites: readonly BackHorizontalStretchAffineWrite[];
  readonly affineMode: "double" | "normal";
  readonly callback: BackHStretchCallback | "WaitAnimEnd";
}

function horizontalStretchAffineWrite(xScale: number): BackHorizontalStretchAffineWrite {
  return Object.freeze({
    xScale: toS16(xScale),
    yScale: 256 as const,
    rotationSigned: 0 as const,
    rotationU16: 0 as const,
  });
}

/**
 * Source-order reducer for every `BACK_ANIM_H_STRETCH` selector. The three
 * initializers all install affine mode, write their duration/amplitude/run
 * tuple, and invoke HorizontalStretchFar on their first callback. The helper
 * holds y-scale at 256 and follows the source's left-to-right C division in
 * `(amplitude / 5) * 2` for the second signed sine term.
 */
export function backHorizontalStretchFrameAtTick(
  species: string,
  natureId: number,
  ticksSinceStart: number,
  preservedData1 = 0,
): BackHorizontalStretchFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0 || !Number.isInteger(preservedData1)) {
    return null;
  }
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_H_STRETCH") return null;
  const variant = hStretchVariant(selection.selector);
  if (variant === null) throw new Error(`unexpected H-stretch selector ${selection.selector}`);

  let data0 = 0 as 0 | 1;
  let data2 = 0;
  let data4 = variant.runs;
  let data5 = 0;
  let data7 = 0;
  let xScale = 256;
  let index1 = 0;
  let index2: number | null = 0;
  let phaseBoundary = false;
  let resetSpriteAfterAnim = false;
  let affineMode: "double" | "normal" = "normal";
  let callback: BackHStretchCallback | "WaitAnimEnd" = variant.callback;
  let writes: readonly BackHorizontalStretchAffineWrite[] = [];
  let terminal = false;

  for (let tick = 0; tick <= ticksSinceStart; tick += 1) {
    if (terminal) break;
    writes = [];
    phaseBoundary = false;
    // Both callback-local values are initialized before every helper call in
    // the source, including the strict cycle-boundary path.
    index1 = 0;
    index2 = null;
    if (data2 === 0) {
      data2 = 1;
      affineMode = "double";
      xScale = 256;
    }

    if (data5 > variant.duration) {
      phaseBoundary = true;
      data5 = 0;
      xScale = 256;
      writes = [horizontalStretchAffineWrite(256)];
      if (data4 <= 1) {
        resetSpriteAfterAnim = true;
        affineMode = "normal";
        callback = "WaitAnimEnd";
        terminal = true;
      } else {
        data4 -= 1;
        data7 = 0;
      }
    } else {
      index2 = Math.trunc((data5 * 128) / variant.duration);
      const cmpVal1 = Math.trunc(variant.duration / 4);
      const cmpVal2 = cmpVal1 * 3;
      if (data5 >= cmpVal1 && data5 < cmpVal2) {
        data7 = toS16(data7 + 51);
        index1 = data7 & 0xff;
      }
      const modulationAmplitude = Math.trunc(variant.amplitude / 5) * 2;
      xScale = 256
        - gbaSin(index2, variant.amplitude)
        - gbaSin(index1, modulationAmplitude);
      writes = [horizontalStretchAffineWrite(xScale)];
      data5 += 1;
    }
  }

  return Object.freeze({
    x2: 0 as const,
    y2: 0 as const,
    data0,
    data1: toS16(preservedData1),
    data2: 1 as const,
    data3: variant.amplitude,
    data4,
    data5,
    data6: variant.duration,
    data7: toS16(data7),
    index1,
    index2,
    phaseBoundary,
    selector: variant.selector,
    sourceId: variant.sourceId,
    duration: variant.duration,
    amplitude: variant.amplitude,
    runs: variant.runs,
    initializerCalled: ticksSinceStart === 0,
    handleStartAffineAnimCalls: ticksSinceStart === 0 ? 1 as const : 0 as const,
    callbackInvokedByInitializer: true as const,
    normalBackDontFlip: true as const,
    tryFlipXCalls: 0 as const,
    resetSpriteAfterAnim,
    affineWriteCount: writes.length,
    affineWrites: writes,
    affineMode,
    callback,
  });
}

/** Source WaitAnimEnd lifecycle after the static back OAM reports animEnded. */
export function backHorizontalStretchWaitAnimEndCallback(
  animEnded: boolean,
): "WaitAnimEnd" | "SpriteCallbackDummy" {
  return animEnded ? "SpriteCallbackDummy" : "WaitAnimEnd";
}

/** The task's terminal restoration after SpriteCallbackDummy is installed. */
export function backSendOutTerminalSpriteData(
  battlerId: number,
  speciesId: number,
): readonly [number, 0, number, 0, 0, 0, 0, 0] | null {
  if (!Number.isInteger(battlerId) || !Number.isInteger(speciesId)) return null;
  return [toS16(battlerId), 0, toS16(speciesId), 0, 0, 0, 0, 0];
}
