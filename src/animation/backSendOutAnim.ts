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

function toS16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

function gbaSin(index: number, amplitude: number): number {
  // `Sin` returns s16 and C's integer division truncates toward zero. Every
  // reachable H-vibrate accumulator is non-negative, but retain the explicit
  // source-shaped truncation rather than relying on a JS float coincidence.
  return toS16(Math.trunc((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256));
}

export interface BackHorizontalVibrateFrame {
  readonly x2: number;
  readonly y2: 0;
  readonly data0: 0;
  /** Task_HandleMonAnimation preserves this static-back-sprite slot. */
  readonly data1: 0;
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
): BackHorizontalVibrateFrame | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;
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
        data1: 0,
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
        data1: 0,
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

/** The task's terminal restoration after SpriteCallbackDummy is installed. */
export function backSendOutTerminalSpriteData(
  battlerId: number,
  speciesId: number,
): readonly [number, 0, number, 0, 0, 0, 0, 0] | null {
  if (!Number.isInteger(battlerId) || !Number.isInteger(speciesId)) return null;
  return [toS16(battlerId), 0, toS16(speciesId), 0, 0, 0, 0, 0];
}
