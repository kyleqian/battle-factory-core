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

type BackHSlideSelector = typeof BACK_H_SLIDE_VARIANTS[keyof typeof BACK_H_SLIDE_VARIANTS]["selector"];
type BackHSlideCallback = typeof BACK_H_SLIDE_VARIANTS[keyof typeof BACK_H_SLIDE_VARIANTS]["callback"];
type BackHSlideDuration = typeof BACK_H_SLIDE_VARIANTS[keyof typeof BACK_H_SLIDE_VARIANTS]["duration"];
type BackHSpringSelector = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["selector"];
type BackHSpringCallback = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["callback"];
type BackHSpringSpeed = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["speed"];
type BackHSpringLimit = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["limit"];
type BackHSpringAmplitude = typeof BACK_H_SPRING_VARIANTS[keyof typeof BACK_H_SPRING_VARIANTS]["amplitude"];

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

function toS16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

function gbaSin(index: number, amplitude: number): number {
  // `Sin` returns `(amplitude * gSineTable[index]) >> 8`; the signed ARM
  // shift rounds negative fractional values down, unlike JS's `Math.trunc`.
  return toS16(Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256));
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

/** The task's terminal restoration after SpriteCallbackDummy is installed. */
export function backSendOutTerminalSpriteData(
  battlerId: number,
  speciesId: number,
): readonly [number, 0, number, 0, 0, 0, 0, 0] | null {
  if (!Number.isInteger(battlerId) || !Number.isInteger(speciesId)) return null;
  return [toS16(battlerId), 0, toS16(speciesId), 0, 0, 0, 0, 0];
}
