/** Source-relative Scene-ON reducer for MOVE_EXTRASENSORY. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";

export type ExtrasensorySide = "player" | "opponent";
export type ExtrasensoryMatrix = readonly [number, number, number, number];
export type ExtrasensoryOam = readonly [number, number, number];

export interface ExtrasensoryArt {
  readonly displaySpecies: string;
  readonly slot: number;
  readonly attr: ExtrasensoryOam;
  readonly subpriority: number;
}

export interface ExtrasensoryLiveInputs {
  readonly attackerSide: ExtrasensorySide;
  readonly targetSide: ExtrasensorySide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly attackerArt: Readonly<ExtrasensoryArt>;
  readonly targetArt: Readonly<ExtrasensoryArt>;
  readonly taskSlots: Readonly<{
    fadeToPsychic: number;
    psychicBackground: number;
    blend: number;
    distortion: number;
    clone: number;
    updateMonBg: number;
    clearMonBg: number;
    restoreBattle: number;
  }>;
  /** Shared exact controls retain their own current task data. */
  readonly sharedTaskData: Readonly<Record<string, readonly number[]>>;
  readonly clone: Readonly<{
    readonly slot: number;
    readonly matrixNum: number;
    readonly attr: ExtrasensoryOam;
    readonly subpriority: number;
    readonly x: number;
    readonly y: number;
    readonly x2: number;
    readonly y2: number;
  }> | null;
  readonly spriteOrder: readonly number[];
  readonly buffers: Readonly<{
    readonly softwareOam: readonly unknown[];
    readonly hardwareOam: readonly unknown[];
    readonly softwareMatrices: readonly ExtrasensoryMatrix[];
    readonly hardwareMatrices: readonly ExtrasensoryMatrix[];
  }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly background: Readonly<{
    readonly currentVram: unknown;
    readonly battleVram: unknown;
    readonly psychicVram: unknown;
    readonly monbgPaletteBank: number;
  }>;
  readonly scanline: Readonly<{
    readonly state: number;
    readonly srcBuffer: number;
    readonly dmaDest: number;
    readonly buffers: readonly [readonly number[], readonly number[]];
  }>;
  readonly allocator: unknown;
  readonly audio: unknown;
  readonly liveCounts: Readonly<{ visualTasks: number; soundTasks: number; matrixBitmap: number }>;
  readonly animationRng: number;
  readonly gameplayRng: unknown;
  readonly gameplayState: unknown;
  /**
   * GetBattlerYCoordWithElevation(target) (AnimTask_ExtrasensoryDistortion: lines max(0, y - 32) .. y + 32). Absent = the accepted corpora's
   * unelevated windows (opponent target 40 -> 8..72, player target 80 -> 48..112); the live provider passes the species elevation.
   */
  readonly targetYElevation?: number;
  /**
   * asl155 (D4 faithful timing): the source-fitted stage-2 data[1] 5 split row (lines <= 28 show the preceding row). Absent / true = the
   * first-body phase; false = a player attacker's later body, whose dominant measured phase is S = 0 on that row (liveMoveTimingPolicy.ts 326).
   */
  readonly scanoutSplitRow?: boolean;
}

export interface ExtrasensoryTask {
  readonly slot: number;
  readonly callback: string;
  readonly role: string;
  readonly data: readonly number[];
}

export interface ExtrasensorySourceCursor {
  readonly owner: "Move_EXTRASENSORY";
  readonly segment: "root" | "set-psychic-background" | "unset-psychic-background";
  readonly pointer: number;
  readonly active: boolean;
  readonly wait: number;
}

export interface ExtrasensoryState {
  readonly age: number;
  readonly active: boolean;
  readonly source: ExtrasensorySourceCursor;
  readonly animArgs: readonly number[];
  readonly battlers: Readonly<{
    attacker: Readonly<{ side: ExtrasensorySide; species: string; center: Readonly<{ x: number; y: number }>; art: ExtrasensoryArt }>;
    target: Readonly<{ side: ExtrasensorySide; species: string; center: Readonly<{ x: number; y: number }>; art: ExtrasensoryArt }>;
  }>;
  readonly tasks: readonly ExtrasensoryTask[];
  readonly clone: ExtrasensoryLiveInputs["clone"];
  readonly distortion: Readonly<{
    readonly active: boolean;
    readonly stage: 0 | 1 | 2 | null;
    readonly displayed: boolean;
    readonly lower: number;
    readonly upper: number;
    readonly baseHofs: number;
    readonly sourceScanlineHofs: readonly number[];
    readonly scanlineHofs: readonly number[];
  }>;
  readonly psychicBackground: boolean;
  readonly targetOnMonBg: boolean;
  readonly spriteOrder: readonly number[];
  readonly buffers: ExtrasensoryLiveInputs["buffers"];
  readonly palette: ExtrasensoryLiveInputs["palette"];
  readonly registers: ExtrasensoryLiveInputs["registers"];
  readonly background: ExtrasensoryLiveInputs["background"];
  readonly scanline: ExtrasensoryLiveInputs["scanline"];
  readonly allocator: unknown;
  readonly audio: Readonly<{ live: unknown; events: readonly Readonly<{ sound: "SE_M_BIND" | "SE_M_LEER"; pan: "target" | "attacker" }>[] }>;
  readonly rng: Readonly<{ animation: number; gameplay: unknown; gameplayUnchanged: true }>;
  readonly gameplay: unknown;
  readonly cleanup: Readonly<{ firstInactive: boolean; visualTasks: number; soundTasks: number; matrixBitmap: number; ownedTasks: number; cloneSprites: number }>;
}

export interface ExtrasensoryDisplayPlan {
  readonly attacker: GbaHardwareOamObject<ExtrasensoryMatrix>;
  readonly target: GbaHardwareOamObject<ExtrasensoryMatrix>;
  readonly clone: GbaHardwareOamObject<ExtrasensoryMatrix> | null;
}

export const EXTRASENSORY_ROOT = 0x082c_efec;
export const EXTRASENSORY_SET_PSYCHIC = 0x082d_7cd1;
export const EXTRASENSORY_UNSET_PSYCHIC = 0x082d_7cde;
export const EXTRASENSORY_FIRST_INACTIVE_AGE = 160;
const IDENTITY: ExtrasensoryMatrix = [256, 0, 0, 256];

function data16(values: readonly number[]): readonly number[] {
  return [...values, ...Array(Math.max(0, 16 - values.length)).fill(0)].slice(0, 16);
}

export function extrasensorySourceAtAge(age: number): ExtrasensorySourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Extrasensory age ${age}`);
  if (age === 0) return { owner: "Move_EXTRASENSORY", segment: "root", pointer: EXTRASENSORY_ROOT, active: true, wait: 0 };
  if (age <= 19) return { owner: "Move_EXTRASENSORY", segment: "set-psychic-background", pointer: EXTRASENSORY_SET_PSYCHIC + 2, active: true, wait: 1 };
  if (age <= 38) return { owner: "Move_EXTRASENSORY", segment: "set-psychic-background", pointer: EXTRASENSORY_SET_PSYCHIC + 10, active: true, wait: 1 };
  if (age === 39) return { owner: "Move_EXTRASENSORY", segment: "root", pointer: EXTRASENSORY_ROOT + 7, active: true, wait: 1 };
  if (age <= 41) return { owner: "Move_EXTRASENSORY", segment: "root", pointer: EXTRASENSORY_ROOT + 7, active: true, wait: 0 };
  if (age <= 67) return { owner: "Move_EXTRASENSORY", segment: "root", pointer: EXTRASENSORY_ROOT + 40, active: true, wait: 1 };
  if (age <= 93) return { owner: "Move_EXTRASENSORY", segment: "root", pointer: EXTRASENSORY_ROOT + 71, active: true, wait: 1 };
  if (age <= 119) return { owner: "Move_EXTRASENSORY", segment: "root", pointer: EXTRASENSORY_ROOT + 94, active: true, wait: 1 };
  if (age <= 140) return { owner: "Move_EXTRASENSORY", segment: "unset-psychic-background", pointer: EXTRASENSORY_UNSET_PSYCHIC, active: true, wait: 1 };
  if (age < EXTRASENSORY_FIRST_INACTIVE_AGE) return { owner: "Move_EXTRASENSORY", segment: "unset-psychic-background", pointer: EXTRASENSORY_UNSET_PSYCHIC + 5, active: true, wait: 1 };
  return { owner: "Move_EXTRASENSORY", segment: "root", pointer: EXTRASENSORY_ROOT + 103, active: false, wait: 0 };
}

function stageAt(age: number): Readonly<{ stage: 0 | 1 | 2; start: number; step: number; shift: number; phase: number }> | null {
  if (age >= 42 && age <= 66) return { stage: 0, start: 42, step: 2, shift: 5, phase: 64 };
  if (age >= 68 && age <= 92) return { stage: 1, start: 68, step: 2, shift: 5, phase: 192 };
  if (age >= 94 && age <= 118) return { stage: 2, start: 94, step: 4, shift: 4, phase: 0 };
  return null;
}

/** The distortion window (task data[14] / data[15]): GetBattlerYCoordWithElevation(target) -+ 32, the lower bound clamped at 0. */
function distortionWindow(input: Readonly<ExtrasensoryLiveInputs>): Readonly<{ lower: number; upper: number }> {
  const y = input.targetYElevation ?? (input.targetSide === "opponent" ? 40 : 80);
  return { lower: Math.max(0, y - 32), upper: y + 32 };
}

function distortionData(age: number, input: Readonly<ExtrasensoryLiveInputs>): readonly number[] | null {
  const stage = stageAt(age);
  if (!stage) return null;
  const local = age - stage.start;
  const phase = local <= 22 ? 0 : local === 23 ? 1 : 2;
  const base = input.targetSide === "opponent" ? -144 : -40;
  const { lower, upper } = distortionWindow(input);
  return data16([phase, Math.min(24, local + 1), 0, 0, 0, 0, 0, 0, 0, 0,
    base, stage.step, stage.shift, stage.phase, lower, upper]);
}

function blendData(age: number, input: Readonly<ExtrasensoryLiveInputs>): readonly number[] | null {
  const start = age >= 42 && age <= 64 ? 42 : age >= 68 && age <= 90 ? 68 : -1;
  if (start < 0) return null;
  const local = age - start;
  const coefficient = local <= 11 ? local + 1 : 23 - local;
  const paletteOffset = (16 + (input.attackerArt.attr[2] >>> 12 & 0xf)) * 16 + 1;
  return data16([paletteOffset, 891, coefficient, 12, 0, 1, Number(local >= 11), 1]);
}

function cloneData(age: number, input: Readonly<ExtrasensoryLiveInputs>): readonly number[] | null {
  if (age < 94 || age > 118) return null;
  const local = age - 94;
  const angle = local <= 11 ? (local + 1) * 4 : local <= 23 ? (23 - local) * 4 : 0;
  const state = local <= 10 ? 0 : local <= 22 ? 1 : local === 23 ? 2 : 3;
  const scale = 256 - (GBA_SINE_TABLE_256[angle]! >> 1);
  return data16([state, angle, scale, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    input.attackerArt.slot, input.clone?.matrixNum ?? 0, input.clone?.slot ?? 3]);
}

function sharedTask(slot: number, callback: string, role: string,
  input: Readonly<ExtrasensoryLiveInputs>): ExtrasensoryTask | null {
  const data = input.sharedTaskData[callback];
  return data ? { slot, callback, role, data } : null;
}

function generatedScanline(age: number, input: Readonly<ExtrasensoryLiveInputs>): readonly number[] {
  const stage = stageAt(age);
  const base = input.targetSide === "opponent" ? -144 : -40;
  const { lower, upper } = distortionWindow(input);
  const result = Array(160).fill(base) as number[];
  if (!stage) return result;
  let sineIndex = stage.phase;
  // The scanline buffer is written with data[1] before the callback's
  // terminal pre-increment reflected by the retained task row.
  const phase = Math.min(23, age - stage.start);
  for (let y = lower; y <= upper; y += 1) {
    // The ROM table carries the first quadrant again through index 319;
    // the stage-1 terminal sample at 320 reads the following zero word.
    const sine = sineIndex < 320 ? GBA_SINE_TABLE_256[sineIndex & 0xff]! : 0;
    let offset = sine >> stage.shift;
    if (offset > 0) offset += phase & 3;
    else if (offset < 0) offset -= phase & 3;
    result[y] = base + offset;
    sineIndex += stage.step;
  }
  return result;
}

export function extrasensoryAtAge(age: number, input: Readonly<ExtrasensoryLiveInputs>): ExtrasensoryState {
  if (input.attackerSide === input.targetSide) throw new Error("Extrasensory requires opposite sides");
  const source = extrasensorySourceAtAge(age);
  const stage = stageAt(age);
  const novel = [
    blendData(age, input) ? { slot: input.taskSlots.blend, callback: "AnimTask_BlendMonInAndOut_Step", role: "attacker-blend", data: blendData(age, input)! } : null,
    distortionData(age, input) ? { slot: input.taskSlots.distortion, callback: "AnimTask_ExtrasensoryDistortion_Step", role: `distortion-${stage!.stage}`, data: distortionData(age, input)! } : null,
    cloneData(age, input) ? { slot: input.taskSlots.clone, callback: "AnimTask_TransparentCloneGrowAndShrink_Step", role: "transparent-clone", data: cloneData(age, input)! } : null,
  ];
  const shared = [
    age >= 1 && age <= 37 ? sharedTask(input.taskSlots.fadeToPsychic, "Task_FadeToBg", "fade-to-psychic", input) : null,
    age >= 20 && age <= 140 ? sharedTask(input.taskSlots.psychicBackground, "SetPsychicBackground_Step", "psychic-background", input) : null,
    age >= 39 && age <= 122 ? sharedTask(input.taskSlots.updateMonBg, "Task_UpdateMonBg", "target-monbg", input) : null,
    age >= 120 && age <= 122 ? sharedTask(input.taskSlots.clearMonBg, "Task_ClearMonBg", "clear-target-monbg", input) : null,
    age >= 120 && age <= 158 ? sharedTask(input.taskSlots.restoreBattle, "Task_FadeToBg", "restore-battle", input) : null,
  ];
  const tasks = [...novel, ...shared].filter((task): task is ExtrasensoryTask => task !== null)
    .sort((left, right) => left.slot - right.slot || left.callback.localeCompare(right.callback));
  const args = age < 42 ? [0, 0, 0, 0, 0, 0, 0, 0]
    : age < 68 ? [0, 891, 12, 1, 1, 0, 0, 0]
      : age < 141 ? [age < 94 ? 1 : 2, 891, 12, 1, 1, 0, 0, age >= 141 ? -1 : 0]
        : [2, 891, 12, 1, 1, 0, 0, -1];
  const displayedAge = age - 1;
  // The stop-state row is retained in RAM at source ages 66/92/118, but
  // mGBA has already restored the base HOFS on the following scanout.
  const displayedStage = age >= 43 && age <= 66 ? stageAt(age - 1)
    : age >= 69 && age <= 92 ? stageAt(age - 1)
      : age >= 95 && age <= 118 ? stageAt(age - 1) : null;
  const currentScanline = input.scanline.buffers[input.scanline.srcBuffer]!.slice(0, 160);
  const precedingScanline = generatedScanline(displayedAge, input);
  // During the severe-distortion program's data[1]=5 callback, the
  // concurrently growing affine clone pushes the player-back task workload
  // across the scanline-DMA handoff: scanlines through 28 have consumed the
  // preceding bank while 29 onward consume the current bank.  This is keyed
  // to live component state, not a battle tick; the opponent slice begins at
  // 48 and is wholly after the boundary.
  // asl155 (D4 faithful timing, liveMoveTimingPolicy.ts 326 player later): a player attacker's LATER body renders the dominant measured
  // later phase, S = 0 on this row too (5 of 5 measured later bodies; docs/asl155-astonish-extrasensory-live.md): scanoutSplitRow false.
  const splitScanout = input.targetSide === "opponent" && input.scanoutSplitRow !== false
    && stage?.stage === 2 && distortionData(age, input)?.[1] === 5;
  const displayedScanline = splitScanout
    ? currentScanline.map((value, y) => y <= 28 ? precedingScanline[y]! : value)
    : currentScanline;
  const audioEvents = [42, 68, 94].includes(age)
    ? [{ sound: age === 94 ? "SE_M_LEER" as const : "SE_M_BIND" as const,
      pan: age === 94 ? "attacker" as const : "target" as const }]
    : [];
  return {
    age, active: source.active, source, animArgs: args,
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, center: input.attackerCenter, art: input.attackerArt },
      target: { side: input.targetSide, species: input.targetSpecies, center: input.targetCenter, art: input.targetArt },
    },
    tasks,
    clone: age >= 94 && age <= 117 ? input.clone : null,
    distortion: {
      active: stage !== null, stage: stage?.stage ?? null,
      displayed: displayedStage !== null,
      lower: distortionWindow(input).lower,
      upper: distortionWindow(input).upper,
      baseHofs: input.targetSide === "opponent" ? -144 : -40,
      sourceScanlineHofs: generatedScanline(age, input),
      scanlineHofs: displayedStage ? displayedScanline : precedingScanline,
    },
    psychicBackground: age >= 20 && age < 141,
    targetOnMonBg: age >= 39 && age <= 122,
    spriteOrder: input.spriteOrder,
    buffers: input.buffers, palette: input.palette, registers: input.registers,
    background: input.background, scanline: input.scanline, allocator: input.allocator,
    audio: { live: input.audio, events: audioEvents },
    rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    cleanup: { firstInactive: age === EXTRASENSORY_FIRST_INACTIVE_AGE,
      visualTasks: input.liveCounts.visualTasks, soundTasks: input.liveCounts.soundTasks,
      matrixBitmap: input.liveCounts.matrixBitmap, ownedTasks: tasks.length,
      cloneSprites: age >= 94 && age <= 117 ? 1 : 0 },
  };
}

export function extrasensoryDisplayPlan(state: Readonly<ExtrasensoryState>): ExtrasensoryDisplayPlan {
  const objects = decodeGbaHardwareOam(state.buffers.hardwareOam, state.buffers.hardwareMatrices, IDENTITY);
  const find = (attr2: number, role: string) => {
    const matches = objects.filter((entry) => entry.attr[2] === attr2);
    const result = role === "attacker" && matches.length > 1
      ? matches.find((entry) => (entry.attr[0] & 0x0300) !== 0x0300)
      : matches[0];
    if (!result && role === "target" && state.targetOnMonBg) {
      return { oamIndex: 127, attr: state.battlers.target.art.attr,
        matrixNum: 0, matrix: IDENTITY };
    }
    if (!result) throw new Error(`missing Extrasensory ${role} hardware OAM`);
    return result;
  };
  const clone = objects.find((entry) => entry.attr[2] === state.battlers.attacker.art.attr[2]
    && (entry.attr[0] & 0x0300) === 0x0300) ?? null;
  return { attacker: find(state.battlers.attacker.art.attr[2], "attacker"),
    target: find(state.battlers.target.art.attr[2], "target"), clone };
}
