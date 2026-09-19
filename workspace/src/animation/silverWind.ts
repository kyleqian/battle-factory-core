/**
 * Pure, source-relative Scene-ON reducer for `Move_SILVER_WIND`.
 *
 * This is deliberately the presentation body only: script scheduling, the
 * target-monbg/split-priority setup, BUG-background sliding state, palette
 * work, Sparkle6 particles, sound tasks, and cleanup.  Damage, turn state,
 * battle RNG, and the framebuffer are caller-owned opaque values.
 */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { sortGbaSpriteOrder } from "./gbaObjCompositor.ts";

export type SilverWindSide = "player" | "opponent";
export interface SilverWindPoint { readonly x: number; readonly y: number; }
export type SilverWindOam = readonly [number, number, number];
export type SilverWindMatrix = readonly [number, number, number, number];

export interface SilverWindBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr: SilverWindOam;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: SilverWindMatrix;
  readonly flags: number;
}

/** A live OBJ/matrix allocation chosen by the scene before the move starts. */
export interface SilverWindSparkleAllocation {
  readonly slot: number;
  readonly matrixNum: number;
  /** OAM words at the particle's first displayed callback pass. */
  readonly attr: SilverWindOam;
  readonly subpriority: number;
  readonly oamPriority: number;
}

export interface SilverWindResourceAllocation {
  readonly tag: number;
  readonly tileSlot: number;
  readonly paletteAllocatorSlot: number;
  readonly paletteBank: number;
  readonly tileRange: readonly [number, number];
  readonly palette: readonly number[];
}

export interface SilverWindLiveInputs {
  readonly attackerSide: SilverWindSide;
  readonly targetSide: SilverWindSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerPictureOrigin: Readonly<SilverWindPoint>;
  readonly targetPictureOrigin: Readonly<SilverWindPoint>;
  readonly attackerSprite: Readonly<SilverWindBattlerSprite>;
  readonly targetSprite: Readonly<SilverWindBattlerSprite>;
  readonly taskSlots: Readonly<{
    readonly pan: number;
    readonly monbg: number;
    readonly firstExclude: number;
    readonly firstFade: number;
    readonly slidingBg: number;
    readonly clearMonbg: number;
    readonly restoreFade: number;
    readonly secondExclude: number;
  }>;
  /** Source order: four big, four medium, four small, then 2×3 final sparks. */
  readonly sparkleSlots: readonly Readonly<SilverWindSparkleAllocation>[];
  readonly resources: Readonly<{ readonly sparkle6: Readonly<SilverWindResourceAllocation> }>;
  readonly allocator: Readonly<{
    readonly initialMatrixBitmap: number;
    readonly spriteOrder: readonly number[];
    readonly initialSprites: readonly Readonly<{
      readonly slot: number;
      readonly subpriority: number;
      readonly oamPriority: number;
      readonly oamY: number;
    }>[];
  }>;
  readonly palettes: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly background: Readonly<{
    readonly values: Readonly<Record<string, number>>;
    readonly registers: Readonly<Record<string, number>>;
    /** The BG selected by target monbg; the scene owns its concrete scanout. */
    readonly monbg: Readonly<{
      readonly bg: 1 | 2;
      readonly paletteBank: number;
      readonly activeCnt: number;
      readonly splitBg1Cnt: number;
      readonly splitBg2Cnt: number;
    }>;
    /** Source-derived identifiers; asset/compositor ownership remains external. */
    readonly bugBackground: Readonly<{ readonly player: string; readonly opponent: string }>;
    /** Live FadeToBg identifiers selected by the source side branch. */
    readonly bugBackgroundTaskId: Readonly<{ readonly player: number; readonly opponent: number }>;
  }>;
  /** `gRng2` at the root row.  This reducer never advances gameplay RNG. */
  readonly animationRngSeed: number;
  readonly gameplayRng: unknown;
  readonly gameplayState?: unknown;
}

export const SILVER_WIND_SOURCE_START = 0x082d630b;
export const SILVER_WIND_SOURCE_END_EXCLUSIVE = 0x082d6523;
export const SILVER_WIND_FIRST_INACTIVE_AGE = { player: 192, opponent: 195 } as const;
export const SILVER_WIND_SPARKLE_TAG = 10271;

type SparkleKind = "big" | "medium" | "small";
interface SparkleProgram {
  readonly age: number;
  readonly kind: SparkleKind;
  readonly y: number;
  readonly amplitude: number;
  readonly initialAngle: number;
  readonly speed: number;
  readonly angularSpeed: number;
  readonly mode: 1 | 2 | 3;
}

/* Direct transcription of SilverWindContinue's eighteen createsprite rows. */
const SPARKLE_PROGRAMS: readonly SparkleProgram[] = [
  { age: 49, kind: "big", y: -32, amplitude: 16, initialAngle: 0, speed: 6, angularSpeed: 2, mode: 3 },
  { age: 49, kind: "big", y: -8, amplitude: 18, initialAngle: 64, speed: 3, angularSpeed: 2, mode: 2 },
  { age: 49, kind: "big", y: -24, amplitude: 18, initialAngle: 90, speed: 5, angularSpeed: 1, mode: 2 },
  { age: 49, kind: "big", y: -40, amplitude: 14, initialAngle: 128, speed: 4, angularSpeed: 1, mode: 2 },
  { age: 51, kind: "medium", y: -32, amplitude: 16, initialAngle: 0, speed: 6, angularSpeed: 2, mode: 3 },
  { age: 51, kind: "medium", y: -8, amplitude: 18, initialAngle: 64, speed: 3, angularSpeed: 2, mode: 2 },
  { age: 51, kind: "medium", y: -24, amplitude: 18, initialAngle: 90, speed: 5, angularSpeed: 1, mode: 2 },
  { age: 51, kind: "medium", y: -40, amplitude: 14, initialAngle: 128, speed: 4, angularSpeed: 1, mode: 2 },
  { age: 53, kind: "small", y: -32, amplitude: 16, initialAngle: 0, speed: 6, angularSpeed: 2, mode: 3 },
  { age: 53, kind: "small", y: -8, amplitude: 18, initialAngle: 64, speed: 3, angularSpeed: 2, mode: 2 },
  { age: 53, kind: "small", y: -24, amplitude: 18, initialAngle: 90, speed: 5, angularSpeed: 1, mode: 2 },
  { age: 53, kind: "small", y: -40, amplitude: 14, initialAngle: 128, speed: 4, angularSpeed: 1, mode: 2 },
  { age: 61, kind: "big", y: -4, amplitude: 16, initialAngle: 0, speed: 6, angularSpeed: 1, mode: 2 },
  { age: 61, kind: "big", y: -16, amplitude: 12, initialAngle: 192, speed: 5, angularSpeed: 2, mode: 3 },
  { age: 63, kind: "medium", y: -4, amplitude: 16, initialAngle: 0, speed: 6, angularSpeed: 1, mode: 2 },
  { age: 63, kind: "medium", y: -16, amplitude: 12, initialAngle: 192, speed: 5, angularSpeed: 2, mode: 3 },
  { age: 65, kind: "small", y: -4, amplitude: 16, initialAngle: 0, speed: 6, angularSpeed: 1, mode: 2 },
  { age: 65, kind: "small", y: -16, amplitude: 12, initialAngle: 192, speed: 5, angularSpeed: 2, mode: 3 },
] as const;

const SCALE: Record<SparkleKind, number> = { big: 256, medium: 192, small: 143 };
const ROTATION: Record<SparkleKind, number> = { big: 10, medium: 12, small: 15 };
const TEMPLATE: Record<SparkleKind, string> = {
  big: "gSilverWindBigSparkSpriteTemplate",
  medium: "gSilverWindMediumSparkSpriteTemplate",
  small: "gSilverWindSmallSparkSpriteTemplate",
};
const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;

function assertAge(age: number, input: Readonly<SilverWindLiveInputs>): void {
  const last = SILVER_WIND_FIRST_INACTIVE_AGE[input.attackerSide];
  if (!Number.isInteger(age) || age < 0 || age > last) {
    throw new Error(`MOVE_SILVER_WIND age must be an integer in [0, ${last}], got ${age}`);
  }
  if (input.targetSide === input.attackerSide) throw new Error("MOVE_SILVER_WIND needs opposing live sides");
  if (input.sparkleSlots.length !== 18) throw new Error("MOVE_SILVER_WIND needs all eighteen live Sparkle6 allocations");
}
function u32(value: number): number { return value >>> 0; }
function nextRng(value: number): number { return u32(Math.imul(value, 0x41c64e6d) + 0x6073); }
function words(...values: number[]): number[] { return [...values, ...Array.from({ length: Math.max(0, 16 - values.length) }, () => 0)].slice(0, 16); }
/** Copy one already-selected 16-colour source bank into the target bank. */
function copyBank(palette: number[], index: number, values: readonly number[]): void { palette.splice(index * 16, 16, ...values.slice(0, 16)); }
function blendColour(source: number, target: number, coefficient: number): number {
  const mix = (left: number, right: number) => ((left * (16 - coefficient)) + right * coefficient) >> 4;
  return mix(source & 31, target & 31) | (mix((source >> 5) & 31, (target >> 5) & 31) << 5) | (mix((source >> 10) & 31, (target >> 10) & 31) << 10);
}
function blendBanks(faded: number[], unfaded: readonly number[], banks: readonly number[], coefficient: number): void {
  for (const bank of banks) for (let offset = 0; offset < 16; offset += 1) faded[bank * 16 + offset] = blendColour(unfaded[bank * 16 + offset]!, 0, coefficient);
}
function signed8(value: number): number { const byte = value & 0xff; return byte >= 128 ? byte - 256 : byte; }
function sideRange(input: Readonly<SilverWindLiveInputs>) {
  const clearStart = input.attackerSide === "player" ? 142 : 145;
  const clearEnd = clearStart + 2;
  const restoreStart = clearEnd + 2;
  const slideEnd = input.attackerSide === "player" ? 165 : 168;
  const inactive = SILVER_WIND_FIRST_INACTIVE_AGE[input.attackerSide];
  return { clearStart, clearEnd, restoreStart, slideEnd, inactive };
}

export interface SilverWindSourceCursor {
  readonly owner: "Move_SILVER_WIND";
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly wait: number;
  readonly active: boolean;
}

/** Exact source scheduler for both pointer-owned branch paths. */
export function silverWindSourceAtAge(age: number, attackerSide: SilverWindSide): SilverWindSourceCursor {
  const { clearStart, restoreStart, slideEnd, inactive } = sideRange({ attackerSide } as SilverWindLiveInputs);
  let pointerOffset = 0, wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 6) { pointerOffset = 16; wait = age === 4 ? -1 : 0; }
  else if (age < 9) { pointerOffset = 18; wait = age === 6 ? 1 : 0; }
  else if (age < 11) { pointerOffset = 21; wait = age === 9 ? -1 : 0; }
  else if (age < 30) { pointerOffset = attackerSide === "player" ? 515 : 55; wait = 1; }
  else if (age < 32) { pointerOffset = 73; wait = age === 30 ? -1 : 0; }
  else if (age < 49) { pointerOffset = 90; wait = 1; }
  else if (age < 51) { pointerOffset = 177; wait = age === 49 ? -1 : 0; }
  else if (age < 53) { pointerOffset = 263; wait = age === 51 ? -1 : 0; }
  else if (age < 61) { pointerOffset = 349; wait = Math.max(0, 59 - age); }
  else if (age < 63) { pointerOffset = 393; wait = age === 61 ? -1 : 0; }
  else if (age < 65) { pointerOffset = 437; wait = age === 63 ? -1 : 0; }
  else if (age < clearStart) { pointerOffset = 479; wait = 1; }
  else if (age < restoreStart) { pointerOffset = 488; wait = age === clearStart ? -1 : 0; }
  else if (age < slideEnd) { pointerOffset = 489; wait = 1; }
  else if (age < inactive - 7) { pointerOffset = 511; wait = 1; }
  else { pointerOffset = 512; wait = 1; }
  return { owner: "Move_SILVER_WIND", pointer: SILVER_WIND_SOURCE_START + pointerOffset, pointerOffset, wait, active: age < inactive };
}

function argsAtAge(age: number, input: Readonly<SilverWindLiveInputs>): readonly number[] {
  const { clearStart, restoreStart, slideEnd } = sideRange(input);
  if (age < 11) return ZERO_ARGS;
  if (age < 30) return [1, 0, 0, 4, 0, 0, 0, input.attackerSide === "player" ? 1 : 0];
  if (age < 32) return [input.attackerSide === "player" ? -1536 : 1536, 0, 0, -1, 0, 0, 0, input.attackerSide === "player" ? 1 : 0];
  if (age < 49) return [1, 0, 4, 4, 0, 0, 0, input.attackerSide === "player" ? 1 : 0];
  const program = [...SPARKLE_PROGRAMS].reverse().find((entry) => entry.age <= age);
  if (program && age < clearStart) return [program.y, program.amplitude, program.initialAngle, program.speed, program.angularSpeed, program.mode, 1, input.attackerSide === "player" ? 1 : 0];
  if (age < restoreStart) return [program?.y ?? -16, program?.amplitude ?? 12, program?.initialAngle ?? 192, program?.speed ?? 5, program?.angularSpeed ?? 2, program?.mode ?? 3, 1, input.attackerSide === "player" ? 1 : 0];
  if (age < slideEnd) return [program?.y ?? -16, program?.amplitude ?? 12, program?.initialAngle ?? 192, program?.speed ?? 5, program?.angularSpeed ?? 2, program?.mode ?? 3, 1, input.attackerSide === "player" ? 1 : 0];
  return [1, 0, 4, 0, 0, 3, 1, -1];
}

export interface SilverWindTask { readonly slot: number; readonly callback: string; readonly role: string; readonly data: readonly number[]; }
export interface SilverWindSparkle {
  readonly slot: number;
  readonly template: string;
  readonly callback: "AnimFlyingParticle_Step";
  readonly kind: SparkleKind;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly attr: SilverWindOam; readonly subpriority: number; readonly oamPriority: number;
  readonly matrixNum: number; readonly matrix: SilverWindMatrix; readonly flags: number;
  readonly data: readonly number[]; readonly animNum: 0; readonly animCmdIndex: 0; readonly animDelayCounter: 0;
}

function particleAtAge(age: number, index: number, input: Readonly<SilverWindLiveInputs>): SilverWindSparkle | null {
  const program = SPARKLE_PROGRAMS[index]!, allocation = input.sparkleSlots[index]!;
  if (age < program.age) return null;
  const local = age - program.age + 1;
  // `AnimFlyingParticle_Step` destroys after crossing the far clip edge.
  const direction = input.targetSide === "player" ? -1 : 1;
  const baseX = input.targetSide === "player" ? 256 : -16;
  const x2 = direction * program.speed * (local - 1);
  if ((direction > 0 && baseX + x2 >= 248) || (direction < 0 && baseX + x2 <= -16)) return null;
  const priorAngle = local === 1 ? program.initialAngle : program.angularSpeed * (local - 2);
  const y2 = (program.amplitude * GBA_SINE_TABLE_256[priorAngle & 0xff]!) >> 8;
  const data0 = (program.angularSpeed * (local - 1)) & 0xff;
  const scale = Math.floor(0x10000 / SCALE[program.kind]);
  const angle = ROTATION[program.kind] * local * Math.PI / 128;
  // `ConvertScaleParam` gives ObjAffineSet the reciprocal Q8 scale.  Its
  // matrix entries are the truncating cosf/sinf products (the exact path the
  // Scene-ON oracle uses), rather than the battle callback's Q8 sine table.
  const cos = Math.trunc(Math.cos(angle) * scale);
  const sin = Math.trunc(Math.sin(angle) * scale);
  const targetY = input.targetPictureOrigin.y + program.y;
  const birthY2 = (program.amplitude * GBA_SINE_TABLE_256[program.initialAngle & 0xff]!) >> 8;
  // BuildOamBuffer receives the source sprite's `pos + pos2 - half-size`.
  // The live allocation carries that birth OAM value, so preserve its mode/
  // affine bits and advance only the packed coordinate from the source
  // callback's x2/y2 fields.
  const attr0 = (allocation.attr[0] & ~0xff) | (((allocation.attr[0] & 0xff) + y2 - birthY2) & 0xff);
  const attr1 = (allocation.attr[1] & ~0x1ff) | (((allocation.attr[1] & 0x1ff) + x2) & 0x1ff);
  return {
    slot: allocation.slot, template: TEMPLATE[program.kind], callback: "AnimFlyingParticle_Step", kind: program.kind,
    x: baseX, y: targetY, x2, y2, attr: [attr0, attr1, allocation.attr[2]],
    subpriority: allocation.subpriority, oamPriority: allocation.oamPriority, matrixNum: allocation.matrixNum,
    matrix: [cos, sin, -sin, cos], flags: 1,
    data: [data0, program.amplitude, direction * program.speed, program.angularSpeed, input.targetSide === "player" ? 1 : 0, 0, 0, local],
    animNum: 0, animCmdIndex: 0, animDelayCounter: 0,
  };
}

function fadeTask(slot: number, backgroundId: number, age: number, start: number): SilverWindTask {
  // FadeToBg reaches its second source state after eighteen display passes.
  // `restorebg` retains that state for its extra wait pass before phase 3.
  const phaseTwoAt = start + 18;
  const phase = age < phaseTwoAt ? 1 : age <= phaseTwoAt + (backgroundId === -1 ? 1 : 0) ? 2 : 3;
  return { slot, callback: "Task_FadeToBg", role: backgroundId === -1 ? "restore-bg" : "bug-bg", data: words(backgroundId, 0, 0, 0, 0, 0, 0, 0, 0, 0, phase) };
}
function blendTask(slot: number, coefficient: number, reverse: boolean, banks: readonly number[]): SilverWindTask {
  const maskLow = banks.filter((bank) => bank < 16).reduce((mask, bank) => mask | (1 << bank), 0);
  const maskHigh = banks.filter((bank) => bank >= 16).reduce((mask, bank) => mask | (1 << (bank - 16)), 0);
  return {
    slot,
    callback: "AnimTask_BlendSpriteColor_Step2",
    role: reverse ? "exclude-return" : "exclude-black",
    // `AnimTask_BlendBattleAnimPalExclude` uses (start, end) = (0, 4)
    // for the black pass and (4, 0) during restore.
    data: words(maskLow, maskHigh, 0, reverse ? 4 : 0, reverse ? 0 : 4, 0, 0, 0, 0, 0, coefficient),
  };
}
function tasksAtAge(age: number, input: Readonly<SilverWindLiveInputs>): SilverWindTask[] {
  const { clearStart, clearEnd, restoreStart, slideEnd, inactive } = sideRange(input);
  if (age >= inactive) return [];
  const tasks: SilverWindTask[] = [];
  if (age >= 4 && age <= (input.attackerSide === "player" ? 66 : 65)) {
    const initial = input.attackerSide === "player" ? -64 : 63;
    const delta = input.attackerSide === "player" ? 2 : -2;
    const current = initial + (age - 3) * delta;
    tasks.push({ slot: input.taskSlots.pan, callback: "Task_PanFromInitialToTarget", role: "gust-pan", data: words(initial, input.attackerSide === "player" ? 63 : -63, delta, 0, current) });
  }
  if (age >= 6 && age <= clearEnd) {
    const target = input.targetSprite;
    const inBg2 = input.background.monbg.bg === 2 ? 1 : 0;
    tasks.push({ slot: input.taskSlots.monbg, callback: "Task_UpdateMonBg", role: "target-monbg", data: words(target.slot, target.x + target.x2, target.y + target.y2, -target.x - target.x2 + 32, -target.y - target.y2 + 32, inBg2, input.targetSide === "player" ? 0 : 1) });
  }
  if (age >= 11 && age <= 13) tasks.push(blendTask(input.taskSlots.firstExclude, Math.min(4, age - 9), false, [1, 2, 3, 16 + ((input.attackerSprite.attr[2] >>> 12) & 0xf)]));
  if (age >= 11 && age <= 47) tasks.push(fadeTask(input.taskSlots.firstFade, input.background.bugBackgroundTaskId[input.attackerSide], age, 11));
  if (age >= 30 && age < slideEnd) {
    const direction = input.attackerSide === "player" ? -1 : 1;
    tasks.push({ slot: input.taskSlots.slidingBg, callback: "AnimTask_UpdateSlidingBg", role: "sliding-bug-bg", data: words(1, direction * 1536, 0, -1, 0, 0, 0, 0, 0, 0, (direction * 1536 * (age - 29)) & 0xff, 0) });
  }
  if (age >= clearStart && age <= clearEnd) tasks.push({ slot: input.taskSlots.clearMonbg, callback: "Task_ClearMonBg", role: "clear-target-monbg", data: words(0, Math.min(2, age - clearStart + 1), input.targetSide === "player" ? 0 : 1) });
  if (age >= restoreStart && age <= restoreStart + 37) tasks.push(fadeTask(input.taskSlots.restoreFade, -1, age, restoreStart));
  if (age >= slideEnd && age <= slideEnd + 3) tasks.push(blendTask(input.taskSlots.secondExclude, Math.max(0, 4 - (age - slideEnd + 1)), true, [1, 2, 3, 16 + ((input.attackerSprite.attr[2] >>> 12) & 0xf)]));
  return tasks.sort((left, right) => left.slot - right.slot);
}

function paletteAtAge(age: number, input: Readonly<SilverWindLiveInputs>) {
  const { clearEnd, slideEnd, inactive } = sideRange(input);
  const unfaded = [...input.palettes.unfaded], faded = [...input.palettes.faded];
  const attackerBank = 16 + ((input.attackerSprite.attr[2] >>> 12) & 0xf);
  const targetBank = 16 + ((input.targetSprite.attr[2] >>> 12) & 0xf);
  if (age >= 1 && age < inactive) {
    const resource = input.resources.sparkle6;
    unfaded.splice(resource.paletteBank * 16, 16, ...resource.palette.slice(0, 16));
    faded.splice(resource.paletteBank * 16, 16, ...resource.palette.slice(0, 16));
  }
  if (age >= 6 && age <= clearEnd) {
    copyBank(unfaded, input.background.monbg.paletteBank, input.palettes.unfaded.slice(targetBank * 16, targetBank * 16 + 16));
    copyBank(faded, input.background.monbg.paletteBank, input.palettes.faded.slice(targetBank * 16, targetBank * 16 + 16));
  }
  const blend = age >= 12 && age <= 14 ? age - 11
    : age >= 15 && age <= slideEnd ? 4 : 0;
  if (blend) blendBanks(faded, unfaded, [1, 2, 3, attackerBank], blend);
  if (age > slideEnd && age <= slideEnd + 4) blendBanks(faded, unfaded,
    [1, 2, 3, attackerBank], Math.max(0, 4 - (age - slideEnd)));
  const hardware = age === 0 ? [...input.palettes.hardware] : [...faded];
  // The hardware latch is RAM+1 except for the synchronous monbg palette load.
  const displayPalette = age === 6 ? "same-row-monbg" as const : age === 0 ? "initial" as const : "preceding-faded" as const;
  return { unfaded, faded, hardware, attackerBank, targetBank, blend, displayPalette };
}

function backgroundAtAge(age: number, input: Readonly<SilverWindLiveInputs>) {
  const { clearEnd, restoreStart, slideEnd } = sideRange(input);
  const values = { ...input.background.values }, registers = { ...input.background.registers };
  const monbg = input.background.monbg;
  const xKey = `gBattle_BG${monbg.bg}_X`, yKey = `gBattle_BG${monbg.bg}_Y`;
  const hofs = `bg${monbg.bg}hofs`, vofs = `bg${monbg.bg}vofs`;
  const monbgX = -input.targetSprite.x - input.targetSprite.x2 + 32;
  const monbgY = -input.targetSprite.y - input.targetSprite.y2 + 32;
  if (age >= 6 && age <= clearEnd) {
    values[xKey] = monbgX;
    values[yKey] = monbgY;
    registers[`bg${monbg.bg}cnt`] = age >= 7 ? monbg.activeCnt : registers[`bg${monbg.bg}cnt`] ?? monbg.activeCnt;
  }
  if (age >= 7 && age <= clearEnd + 1) {
    registers[hofs] = monbgX & 0x1ff;
    registers[vofs] = monbgY & 0x1ff;
    registers.bg1cnt = monbg.splitBg1Cnt;
    registers.bg2cnt = monbg.splitBg2Cnt;
  }
  if (age >= clearEnd + 1) { values[xKey] = 0; values[yKey] = 0; if (age >= clearEnd + 2) { registers[hofs] = 0; registers[vofs] = 0; } }
  const slidingX = (sourceAge: number): number => {
    if (sourceAge < 30 || sourceAge >= slideEnd) return 0;
    // `restorebg` suspends the update task for its two clear-monbg source
    // passes. Resume uses the same source task state, not a captured age.
    const paused = sourceAge >= clearEnd ? Math.min(2, sourceAge - clearEnd + 1) : 0;
    return (input.attackerSide === "player" ? -6 : 6) * (sourceAge - 29 - paused);
  };
  values.gBattle_BG3_X = slidingX(age);
  // StartSlidingBg writes gBattle_BG3_X in software; BG3HOFS receives that
  // value on the next callback pass, including the final zero after cleanup.
  if (age >= 31) registers.bg3hofs = slidingX(age - 1) & 0x1ff;
  // Task_FadeToBg uses BeginHardwarePaletteFade(0xE8): BG1/BG2/BG3 and
  // OBJ are darkened by BLDY while BG0 (the message window) stays intact.
  const hardwareFade = (start: number, downAt: number): number | null => {
    if (age < start + 1 || age > start + 37) return null;
    if (age <= start + 17) return age - start - 1;
    if (age < downAt) return 16;
    return Math.max(0, 16 - (age - downAt + 1));
  };
  const firstFade = hardwareFade(11, 32);
  const restoreFade = hardwareFade(restoreStart, slideEnd + 3);
  const fade = restoreFade ?? firstFade;
  if (fade !== null) {
    registers.bldcnt = 0x00e8;
    registers.bldy = fade;
  } else {
    registers.bldcnt = 0;
    registers.bldy = 0;
  }
  return { values, registers, monbgActive: age >= 6 && age <= clearEnd, sliding: age >= 30 && age < slideEnd, bugBackground: age >= 11 && age < slideEnd ? input.background.bugBackground[input.attackerSide] : null };
}

function animationRngAtAge(age: number, input: Readonly<SilverWindLiveInputs>): { animation: number; sourceDraws: number } {
  const { clearEnd, slideEnd } = sideRange(input);
  let rng = u32(input.animationRngSeed), draws = 0;
  for (let current = 1; current <= age; current += 1) {
    // The retained body holds gRng2 across the final two clear-monbg passes
    // and the source frame immediately after StartSlidingBg releases it.
    if (current === clearEnd || current === clearEnd + 1 || current === slideEnd + 1) continue;
    rng = nextRng(rng); draws += 1;
  }
  return { animation: rng, sourceDraws: draws };
}

export interface SilverWindState {
  readonly age: number; readonly active: boolean; readonly source: SilverWindSourceCursor; readonly animArgs: readonly number[];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ side: SilverWindSide; species: string; pictureOrigin: SilverWindPoint; sprite: SilverWindBattlerSprite }>;
    readonly target: Readonly<{ side: SilverWindSide; species: string; pictureOrigin: SilverWindPoint; sprite: SilverWindBattlerSprite }>;
  }>;
  readonly tasks: readonly SilverWindTask[]; readonly sprites: readonly SilverWindSparkle[];
  readonly palette: ReturnType<typeof paletteAtAge>;
  readonly background: ReturnType<typeof backgroundAtAge>;
  readonly registers: Readonly<Record<string, number>>;
  readonly resources: Readonly<{ sparkle6: Readonly<{ loaded: boolean; tag: number | null; allocation: SilverWindResourceAllocation | null }>; matrixBitmap: number }>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{ sound: "SE_M_GUST" | "SE_M_MORNING_SUN" | "SE_M_GUST2"; pan: "attacker" | "target" | 0 }>[];
  readonly rng: Readonly<{ animation: number; sourceDraws: number; gameplay: unknown; gameplayState: unknown; gameplayUnchanged: true }>;
  readonly latches: Readonly<{ oamAndMatrices: "initial" | "preceding-software"; palette: "initial" | "same-row-monbg" | "preceding-faded"; targetExcludedBank: number }>;
  readonly cleanup: Readonly<{ visualTasks: number; soundTasks: number; ownedSprites: number; ownedTasks: number; firstInactive: boolean; resourcesReleased: boolean }>;
}

/**
 * Replay Emerald's persistent `sSpriteOrder` carrier through the requested
 * source row. SortSprites is stable for equal priority/subpriority/wrapped Y,
 * so recomputing a row from the root order loses information once moving
 * Sparkle6 objects cross. Newly created slots append before that row's sort;
 * destroyed slots drop without resetting the surviving order.
 */
function painterOrderAtAge(age: number, input: Readonly<SilverWindLiveInputs>): readonly number[] {
  let order = [...input.allocator.spriteOrder];
  for (let currentAge = 0; currentAge <= age; currentAge += 1) {
    const currentSprites = SPARKLE_PROGRAMS
      .map((_, index) => particleAtAge(currentAge, index, input))
      .filter((entry): entry is SilverWindSparkle => entry !== null);
    const activeSlots = new Set(currentSprites.map((sprite) => sprite.slot));
    const keys = [
      ...input.allocator.initialSprites.filter((sprite) => !activeSlots.has(sprite.slot)),
      ...currentSprites.map((sprite) => ({
        slot: sprite.slot,
        subpriority: sprite.subpriority,
        oamPriority: sprite.oamPriority,
        oamY: sprite.attr[0] & 0xff,
      })),
    ];
    const liveSlots = new Set(keys.map((key) => key.slot));
    order = order.filter((slot) => liveSlots.has(slot));
    for (const sprite of currentSprites) if (!order.includes(sprite.slot)) order.push(sprite.slot);
    order = sortGbaSpriteOrder(order, keys.map((key) => ({
      slot: key.slot,
      priority: key.oamPriority as 0 | 1 | 2 | 3,
      subpriority: key.subpriority,
      y: signed8(key.oamY),
    })));
  }
  return order;
}

export function silverWindAtAge(age: number, input: Readonly<SilverWindLiveInputs>): SilverWindState {
  assertAge(age, input);
  const source = silverWindSourceAtAge(age, input.attackerSide), palette = paletteAtAge(age, input), background = backgroundAtAge(age, input);
  const sprites = SPARKLE_PROGRAMS.map((_, index) => particleAtAge(age, index, input)).filter((entry): entry is SilverWindSparkle => entry !== null);
  const tasks = tasksAtAge(age, input);
  const painterOrder = painterOrderAtAge(age, input);
  const range = sideRange(input), resourceLoaded = age >= 1 && age < range.inactive;
  const rng = animationRngAtAge(age, input);
  const audio: Array<{ sound: "SE_M_GUST" | "SE_M_MORNING_SUN" | "SE_M_GUST2"; pan: "attacker" | "target" | 0 }> = [];
  if (age === 4) { audio.push({ sound: "SE_M_GUST", pan: "attacker" }, { sound: "SE_M_MORNING_SUN", pan: 0 }); }
  if (age === range.clearStart) audio.push({ sound: "SE_M_GUST2", pan: "target" });
  let matrixBitmap = input.allocator.initialMatrixBitmap;
  for (const sprite of sprites) matrixBitmap |= 1 << sprite.matrixNum;
  return {
    age, active: source.active, source, animArgs: argsAtAge(age, input),
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, pictureOrigin: input.attackerPictureOrigin, sprite: input.attackerSprite },
      target: { side: input.targetSide, species: input.targetSpecies, pictureOrigin: input.targetPictureOrigin, sprite: input.targetSprite },
    },
    tasks, sprites, palette, background, registers: background.registers,
    resources: { sparkle6: { loaded: resourceLoaded, tag: resourceLoaded ? SILVER_WIND_SPARKLE_TAG : null, allocation: resourceLoaded ? input.resources.sparkle6 : null }, matrixBitmap },
    painterOrder, audio, rng: { ...rng, gameplay: input.gameplayRng, gameplayState: input.gameplayState, gameplayUnchanged: true },
    latches: { oamAndMatrices: age === 0 ? "initial" : "preceding-software", palette: palette.displayPalette, targetExcludedBank: palette.targetBank },
    cleanup: { visualTasks: tasks.filter((task) => task.callback !== "Task_PanFromInitialToTarget").length, soundTasks: age >= 4 && age < (input.attackerSide === "player" ? 67 : 66) ? 1 : 0, ownedSprites: sprites.length, ownedTasks: tasks.length, firstInactive: age === range.inactive, resourcesReleased: age === range.inactive },
  };
}

/**
 * Source-relative scanout plan used by any live compositor. Ordinary OBJ,
 * matrix and palette DMA consume the preceding software row; monbg's palette
 * setup at age 6 is the sole same-row exception measured by this move.
 */
export function silverWindDisplayPlanAtAge(
  age: number,
  input: Readonly<SilverWindLiveInputs>,
): Readonly<{
  current: SilverWindState;
  displayed: SilverWindState;
  hardwarePalette: readonly number[];
  bugBackgroundVisible: boolean;
}> {
  const current = silverWindAtAge(age, input);
  const displayed = silverWindAtAge(Math.max(0, age - 1), input);
  return {
    current,
    displayed,
    hardwarePalette: age === 6 ? current.palette.faded : age === 0
      ? input.palettes.hardware : displayed.palette.faded,
    // LoadBattleAnimBackground writes the BUG VRAM at age 30 while the
    // brightness fade is fully black. The newly loaded BG3 first becomes
    // distinguishable at age 32; this is independent of the age-31 BG3HOFS
    // latch and the following palette-exclude transfer.
    bugBackgroundVisible: age >= 32 && age < sideRange(input).slideEnd,
  };
}
