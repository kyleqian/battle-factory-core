import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import type { BlendColorCycleTiming } from "./blendColorCycle.ts";

/** Pure source-relative presentation state for Move_SWEET_SCENT. */
export type SweetScentSide = "player" | "opponent";

export const SWEET_SCENT_SOURCE_BASE = 0x082d4c86;
export const SWEET_SCENT_SOURCE_END = 0x082d4d70;
export const SWEET_SCENT_TAG = 10239;
/** First retained callback row through the first row after all petals die. */
export const SWEET_SCENT_FRAME_COUNT = 166;
export const SWEET_SCENT_FIRST_INACTIVE_AGE = SWEET_SCENT_FRAME_COUNT - 1;

/** `blend_color_cycle F_PAL_DEF_SIDE, 1, 5, 5, 13, RGB(31,21,21)`. */
export const SWEET_SCENT_BLEND_TIMING: Readonly<BlendColorCycleTiming> = {
  legs: [
    // BlendColorCycle forces the final leg's target to zero when one blend
    // remains, regardless of the command's literal target argument.
    { startY: 5, targetY: 0 },
    { startY: 13, targetY: 5 },
    { startY: 5, targetY: 13 },
    { startY: 13, targetY: 5 },
    { startY: 5, targetY: 13 },
  ],
  deltaY: 2,
};

export interface SweetScentPoint {
  readonly x: number;
  readonly y: number;
}

/** Source-selected runtime allocation facts; no species or pair is encoded. */
export interface SweetScentProfile {
  readonly spriteSlots?: readonly number[];
  readonly targetSubpriority?: number;
}

export interface SweetScentPetal {
  readonly index: number;
  readonly slot: number;
  readonly template: "gSweetScentPetalSpriteTemplate";
  readonly callback: "AnimSweetScentPetal" | "AnimSweetScentPetal_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animNum: 0 | 1;
  /** The eight-frame source anim command index, before its 8-tick loop. */
  readonly animFrame: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
  readonly subpriority: number;
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface SweetScentState {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{
    readonly owner: "Move_SWEET_SCENT" | "SweetScentEffect" | null;
    readonly offset: number;
    readonly wait: number;
    readonly args: readonly number[];
  }>;
  readonly petals: readonly SweetScentPetal[];
  readonly visualTaskCount: 0 | 1;
  readonly sound: "SE_M_SWEET_SCENT" | null;
  readonly soundPanSide: SweetScentSide | null;
  readonly blend: Readonly<{
    readonly active: boolean;
    readonly bgY: number;
    readonly objY: number;
    readonly color: readonly [31, 21, 21];
  }>;
  readonly resources: Readonly<{
    readonly loaded: boolean;
    readonly tileTag: number;
    readonly paletteTag: number;
  }>;
}

const EFFECT_ARGS = [
  [70, 1, 64],
  [60, 0, 64],
  [80, 1, 64],
  [58, 0, 120],
  [100, 0, 120],
  [90, 0, 64],
  [48, 0, 64],
  [95, 1, 80],
  [100, 0, 120],
  [75, 1, 64],
  [85, 0, 120],
] as const;

const SPAWNS = [
  { age: 0, args: [100, 0, 100] },
  // The source delays are measured between retained callback rows.  The
  // first effect starts at row 27 after Move_SWEET_SCENT's delay 25; each
  // following row includes the callback's first step.
  ...EFFECT_ARGS.map((args, index) => ({ age: [27, 31, 38, 42, 46, 50, 54, 58, 62, 66, 70][index]!, args })),
  // The thirteenth direct create shares the final effect's 120-tick
  // lifetime argument; only its y initializer is the distinct 55 value.
  { age: 74, args: [55, 0, 120] },
  ...EFFECT_ARGS.map((args, index) => ({ age: [74, 78, 85, 89, 93, 97, 101, 105, 109, 113, 117][index]!, args })),
] as const;

const SWEET_SCENT_BLEND_START_AGE = 74;

/**
 * Selected defender OBJ coefficient in the software faded buffer. The
 * command's delay=1 makes each two-point step span three scheduler rows;
 * the longer target/start holds are BeginNormalPaletteFade completion and
 * BlendColorCycle restart rows. This source-relative schedule is pinned by
 * both retained hardware palettes with their ordinary RAM+1 transfer.
 */
export function sweetScentDefenderObjYAtAge(age: number): number {
  const segments = [
    [77, 79, 2], [80, 82, 4], [83, 85, 6], [86, 88, 8],
    [89, 91, 10], [92, 94, 12], [95, 103, 13], [104, 106, 11],
    [107, 109, 9], [110, 112, 7], [113, 121, 5], [122, 124, 7],
    [125, 127, 9], [128, 130, 11], [131, 139, 13], [140, 142, 11],
    [143, 145, 9], [146, 148, 7], [149, 157, 5], [158, 160, 3],
    [161, 163, 1],
  ] as const;
  return segments.find(([start, end]) => age >= start && age <= end)?.[2] ?? 0;
}

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

function sourceAtAge(age: number): SweetScentState["source"] {
  if (age <= 0) return { owner: "Move_SWEET_SCENT", offset: 0, wait: 0, args: [100, 0, 100] };
  if (age < 27) return { owner: "Move_SWEET_SCENT", offset: 17, wait: Math.max(0, 27 - age), args: [100, 0, 100] };
  if (age < 118) return { owner: "SweetScentEffect", offset: 0, wait: 1, args: SPAWNS[Math.min(23, Math.floor((age - 27) / 4) + 1)]!.args };
  return { owner: "Move_SWEET_SCENT", offset: 0xE6, wait: 1, args: [85, 0, 120] };
}

function petalAtAge(
  age: number,
  index: number,
  side: SweetScentSide,
  _origin: SweetScentPoint,
  profile: SweetScentProfile,
): SweetScentPetal | null {
  const spawn = SPAWNS[index]!;
  const elapsed = age - spawn.age;
  if (elapsed < 0 || elapsed >= 48) return null;
  const args = spawn.args;
  const player = side === "player";
  const data0 = (elapsed + 1) * 3;
  const step = elapsed + 1;
  const x = player ? step * 5 : 240 - step * 5;
  const y = player ? args[0] - step : args[0] - 30 + step;
  const x2 = 0;
  const y2 = player ? gbaSin(data0, 16) : gbaSin(data0 + 64, 16);
  // The source command advances after seven elapsed callback rows: the
  // first displayed cell is 0, and cell 1 is present at elapsed 7.
  const animFrame = (Math.floor((elapsed + 1) / 8) & 7) as SweetScentPetal["animFrame"];
  return {
    index,
    slot: profile.spriteSlots?.[index] ?? index,
    template: "gSweetScentPetalSpriteTemplate",
    callback: elapsed === 0 ? "AnimSweetScentPetal" : "AnimSweetScentPetal_Step",
    x,
    y,
    x2,
    y2,
    animNum: args[1] as 0 | 1,
    animFrame,
    hFlip: args[1] === 1,
    vFlip: animFrame >= 4,
    subpriority: profile.targetSubpriority ?? 2,
    data: [data0, 0, args[2], 0, 0, 0, 0, 0],
  };
}

/**
 * Reduce one source-relative row. `origin` is deliberately typed and passed
 * through the seam so the caller supplies live battler geometry; this source
 * callback itself uses screen-edge coordinates and therefore does not invent
 * a species-specific anchor.
 */
export function sweetScentAtAge(
  age: number,
  side: SweetScentSide,
  origin: SweetScentPoint,
  profile: SweetScentProfile = {},
): SweetScentState {
  const petals = SPAWNS.map((_, index) => petalAtAge(age, index, side, origin, profile))
    .filter((petal): petal is SweetScentPetal => petal !== null);
  const objY = sweetScentDefenderObjYAtAge(age);
  const blendActive = age >= SWEET_SCENT_BLEND_START_AGE + 1 && age < 165;
  return {
    age,
    active: age >= 0 && age < SWEET_SCENT_FIRST_INACTIVE_AGE,
    source: sourceAtAge(age),
    petals,
    visualTaskCount: blendActive ? 1 : 0,
    sound: age === 0 ? "SE_M_SWEET_SCENT" : null,
    soundPanSide: age === 0 ? side : null,
    blend: { active: blendActive, bgY: objY, objY, color: [31, 21, 21] },
    resources: { loaded: age >= 0 && age < SWEET_SCENT_FIRST_INACTIVE_AGE, tileTag: SWEET_SCENT_TAG, paletteTag: SWEET_SCENT_TAG },
  };
}
