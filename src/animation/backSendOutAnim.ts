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

function growAffineWrite(scale: number): BackGrowAffineWrite {
  return Object.freeze({
    xScale: scale,
    yScale: scale,
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
    initializerCalled: true,
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
    initializerCalled: true,
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

/** The task's terminal restoration after SpriteCallbackDummy is installed. */
export function backSendOutTerminalSpriteData(
  battlerId: number,
  speciesId: number,
): readonly [number, 0, number, 0, 0, 0, 0, 0] | null {
  if (!Number.isInteger(battlerId) || !Number.isInteger(speciesId)) return null;
  return [toS16(battlerId), 0, toS16(speciesId), 0, 0, 0, 0, 0];
}
