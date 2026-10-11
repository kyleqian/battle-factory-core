/** Pure source-relative Scene-ON reducer for MOVE_FURY_CUTTER. */
import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";

export type FuryCutterSide = "player" | "opponent";
/** gDisableStructs[attacker].furyCutterCounter after Cmd_furycuttercalc (1..5; 4 and 5 both take FuryCutterStrongest). */
export type FuryCutterCounter = 1 | 2 | 3 | 4 | 5;
export type FuryCutterMatrix = readonly [number, number, number, number];
export type FuryCutterOam = readonly [number, number, number];
export interface FuryCutterArt { readonly displaySpecies: string; readonly slot: number;
  readonly attr: FuryCutterOam; readonly subpriority: number; }
export interface FuryCutterSprite { readonly slot: number; readonly template: string;
  readonly callback: string; readonly attr: FuryCutterOam; readonly matrix: FuryCutterMatrix;
  readonly matrixNum: number; readonly data: readonly number[]; }
export interface FuryCutterLiveInputs {
  readonly counter: FuryCutterCounter;
  readonly attackerSide: FuryCutterSide; readonly targetSide: FuryCutterSide;
  readonly attackerSpecies: string; readonly targetSpecies: string;
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly attackerArt: FuryCutterArt; readonly targetArt: FuryCutterArt;
  readonly ownedSprites: readonly FuryCutterSprite[];
  readonly liveTasks: readonly Readonly<{ slot: number; callback: string; data: readonly number[] }>[];
  readonly buffers: Readonly<{ softwareOam: readonly unknown[]; hardwareOam: readonly unknown[];
    softwareMatrices: readonly FuryCutterMatrix[]; hardwareMatrices: readonly FuryCutterMatrix[] }>;
  readonly palette: Readonly<{ unfaded: readonly number[]; faded: readonly number[];
    hardware: readonly number[] }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly resources: Readonly<{ cutTileBase: number; cutLoaded: boolean; allocator: unknown }>;
  readonly order: readonly number[]; readonly audio: unknown;
  readonly liveCounts: Readonly<{ visualTasks: number; soundTasks: number; matrixBitmap: number }>;
  readonly animationRng: number; readonly gameplayRng: unknown; readonly gameplayState: unknown;
}
export interface FuryCutterSourceCursor { readonly owner: "Move_FURY_CUTTER";
  readonly pointer: number; readonly offset: number; readonly active: boolean;
  readonly counter: FuryCutterCounter; readonly power: 10 | 20 | 40 | 80 | 160;
  readonly direction: "left" | "right"; readonly paletteBlendRepeats: 0 | 1 | 3; }
export interface FuryCutterState {
  readonly age: number; readonly active: boolean; readonly source: FuryCutterSourceCursor;
  readonly battlers: Readonly<{ attacker: Readonly<{ side: FuryCutterSide; species: string;
    center: Readonly<{ x: number; y: number }>; art: FuryCutterArt }>;
    target: Readonly<{ side: FuryCutterSide; species: string;
      center: Readonly<{ x: number; y: number }>; art: FuryCutterArt }> }>;
  readonly sprites: readonly FuryCutterSprite[]; readonly tasks: FuryCutterLiveInputs["liveTasks"];
  readonly buffers: FuryCutterLiveInputs["buffers"]; readonly palette: FuryCutterLiveInputs["palette"];
  readonly registers: FuryCutterLiveInputs["registers"];
  readonly resources: FuryCutterLiveInputs["resources"]; readonly order: readonly number[];
  readonly audio: unknown;
  readonly rng: Readonly<{ animation: number; gameplay: unknown; gameplayUnchanged: true }>;
  readonly gameplay: unknown;
  readonly cleanup: Readonly<{ firstInactive: boolean; visualTasks: number; soundTasks: number;
    matrixBitmap: number; ownedSprites: number }>;
}
export interface FuryCutterDisplayPlan {
  readonly attacker: GbaHardwareOamObject<FuryCutterMatrix> | null;
  readonly target: GbaHardwareOamObject<FuryCutterMatrix> | null;
  readonly slices: readonly GbaHardwareOamObject<FuryCutterMatrix>[];
}

export const FURY_CUTTER_ROOT = 0x082c_ad4a;
const EDGES = [0, 1, 4, 7, 14, 33] as const;
const OFFSETS = [0, 3, 5, 70, 87, 92] as const;
const POWERS = [10, 20, 40, 80, 160] as const;
const IDENTITY: FuryCutterMatrix = [256, 0, 0, 256];

export function furyCutterSourceAtAge(age: number, counter: FuryCutterCounter): FuryCutterSourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Fury Cutter age ${age}`);
  if (![1, 2, 3, 4, 5].includes(counter)) throw new Error(`invalid Fury Cutter counter ${counter}`);
  let edge = 0;
  for (let index = 0; index < EDGES.length; index += 1) if (age >= EDGES[index]!) edge = index;
  return { owner: "Move_FURY_CUTTER", pointer: FURY_CUTTER_ROOT + OFFSETS[edge]!,
    offset: OFFSETS[edge]!, active: age < 42, counter, power: POWERS[counter - 1],
    direction: counter % 2 === 1 ? "right" : "left",
    paletteBlendRepeats: counter === 1 ? 0 : counter === 2 ? 1 : 3 };
}

export function furyCutterAtAge(age: number, input: Readonly<FuryCutterLiveInputs>): FuryCutterState {
  if (input.attackerSide === input.targetSide) throw new Error("Fury Cutter requires opposite sides");
  const source = furyCutterSourceAtAge(age, input.counter);
  return { age, active: source.active, source,
    battlers: { attacker: { side: input.attackerSide, species: input.attackerSpecies,
      center: input.attackerCenter, art: input.attackerArt },
    target: { side: input.targetSide, species: input.targetSpecies,
      center: input.targetCenter, art: input.targetArt } },
    sprites: input.ownedSprites, tasks: input.liveTasks, buffers: input.buffers,
    palette: input.palette, registers: input.registers, resources: input.resources,
    order: input.order, audio: input.audio,
    rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    cleanup: { firstInactive: age === 42, visualTasks: input.liveCounts.visualTasks,
      soundTasks: input.liveCounts.soundTasks, matrixBitmap: input.liveCounts.matrixBitmap,
      ownedSprites: input.ownedSprites.length } };
}

export function furyCutterDisplayPlan(state: Readonly<FuryCutterState>): FuryCutterDisplayPlan {
  const objects = decodeGbaHardwareOam(state.buffers.hardwareOam,
    state.buffers.hardwareMatrices, IDENTITY);
  const tile = (object: GbaHardwareOamObject<FuryCutterMatrix>): number => object.attr[2] & 0x3ff;
  const find = (art: FuryCutterArt): GbaHardwareOamObject<FuryCutterMatrix> | null =>
    objects.find((object) => object.attr[2] === art.attr[2]) ?? null;
  return { attacker: find(state.battlers.attacker.art), target: find(state.battlers.target.art),
    slices: state.resources.cutLoaded ? objects.filter((object) =>
      tile(object) >= state.resources.cutTileBase && tile(object) < state.resources.cutTileBase + 64) : [] };
}
