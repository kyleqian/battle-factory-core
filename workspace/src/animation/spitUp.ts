/** Pure source-relative Scene-ON reducer for MOVE_SPIT_UP's three power branches. */
import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";

export type SpitUpSide = "player" | "opponent";
export type SpitUpBranch = 1 | 2 | 3;
export type SpitUpMatrix = readonly [number, number, number, number];
export type SpitUpOam = readonly [number, number, number];
export interface SpitUpArt { readonly displaySpecies: string; readonly slot: number;
  readonly attr: SpitUpOam; readonly subpriority: number; }
export interface SpitUpSprite { readonly slot: number; readonly template: string; readonly callback: string;
  readonly attr: SpitUpOam; readonly matrix: SpitUpMatrix; readonly matrixNum: number;
  readonly data: readonly number[]; }
export interface SpitUpLiveInputs {
  readonly stockpiles: SpitUpBranch;
  readonly attackerSide: SpitUpSide; readonly targetSide: SpitUpSide;
  readonly attackerSpecies: string; readonly targetSpecies: string;
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly attackerArt: SpitUpArt; readonly targetArt: SpitUpArt;
  readonly ownedSprites: readonly SpitUpSprite[];
  readonly liveTasks: readonly Readonly<{ slot: number; callback: string; data: readonly number[] }>[];
  readonly buffers: Readonly<{ softwareOam: readonly unknown[]; hardwareOam: readonly unknown[];
    softwareMatrices: readonly SpitUpMatrix[]; hardwareMatrices: readonly SpitUpMatrix[] }>;
  readonly palette: Readonly<{ unfaded: readonly number[]; faded: readonly number[]; hardware: readonly number[] }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly resources: Readonly<{ redOrbTileBase: number; impactTileBase: number;
    redOrbLoaded: boolean; impactLoaded: boolean; allocator: unknown }>;
  readonly order: readonly number[]; readonly audio: unknown;
  readonly liveCounts: Readonly<{ visualTasks: number; soundTasks: number; matrixBitmap: number }>;
  readonly animationRng: number; readonly gameplayRng: unknown; readonly gameplayState: unknown;
}
export interface SpitUpSourceCursor { readonly owner: "Move_SPIT_UP"; readonly pointer: number;
  readonly offset: number; readonly active: boolean; readonly branch: SpitUpBranch; }
export interface SpitUpState {
  readonly age: number; readonly active: boolean; readonly source: SpitUpSourceCursor;
  readonly battlers: Readonly<{ attacker: Readonly<{ side: SpitUpSide; species: string;
    center: Readonly<{ x: number; y: number }>; art: SpitUpArt }>;
    target: Readonly<{ side: SpitUpSide; species: string;
      center: Readonly<{ x: number; y: number }>; art: SpitUpArt }> }>;
  readonly sprites: readonly SpitUpSprite[]; readonly tasks: SpitUpLiveInputs["liveTasks"];
  readonly buffers: SpitUpLiveInputs["buffers"]; readonly palette: SpitUpLiveInputs["palette"];
  readonly registers: SpitUpLiveInputs["registers"]; readonly resources: SpitUpLiveInputs["resources"];
  readonly order: readonly number[]; readonly audio: unknown;
  readonly rng: Readonly<{ animation: number; gameplay: unknown; gameplayUnchanged: true }>;
  readonly gameplay: unknown;
  readonly cleanup: Readonly<{ firstInactive: boolean; visualTasks: number; soundTasks: number;
    matrixBitmap: number; ownedSprites: number }>;
}
export interface SpitUpDisplayPlan {
  readonly attacker: GbaHardwareOamObject<SpitUpMatrix> | null;
  readonly target: GbaHardwareOamObject<SpitUpMatrix> | null;
  readonly redOrbs: readonly GbaHardwareOamObject<SpitUpMatrix>[];
  readonly impacts: readonly GbaHardwareOamObject<SpitUpMatrix>[];
}

export const SPIT_UP_ROOT = 0x082d_49eb;
const EDGES = [0, 1, 4, 7, 54, 59, 67, 74, 81, 95] as const;
const OFFSETS = [0, 3, 6, 36, 42, 132, 146, 184, 203, 204] as const;
const IDENTITY: SpitUpMatrix = [256, 0, 0, 256];

export function spitUpSourceAtAge(age: number, branch: SpitUpBranch): SpitUpSourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Spit Up age ${age}`);
  if (branch !== 1 && branch !== 2 && branch !== 3) throw new Error(`invalid Spit Up branch ${branch}`);
  const shiftedAge = branch === 3 && age >= 74 ? age - 1 : age;
  let edge = 0;
  for (let index = 0; index < EDGES.length; index += 1) if (shiftedAge >= EDGES[index]!) edge = index;
  const firstInactive = branch === 3 ? 108 : 107;
  return { owner: "Move_SPIT_UP", pointer: SPIT_UP_ROOT + OFFSETS[edge]!,
    offset: OFFSETS[edge]!, active: age < firstInactive, branch };
}

export function spitUpAtAge(age: number, input: Readonly<SpitUpLiveInputs>): SpitUpState {
  if (input.attackerSide === input.targetSide) throw new Error("Spit Up requires opposite sides");
  const source = spitUpSourceAtAge(age, input.stockpiles);
  return { age, active: source.active, source,
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies,
        center: input.attackerCenter, art: input.attackerArt },
      target: { side: input.targetSide, species: input.targetSpecies,
        center: input.targetCenter, art: input.targetArt },
    },
    sprites: input.ownedSprites, tasks: input.liveTasks, buffers: input.buffers,
    palette: input.palette, registers: input.registers, resources: input.resources,
    order: input.order, audio: input.audio,
    rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    cleanup: { firstInactive: age === (input.stockpiles === 3 ? 108 : 107),
      visualTasks: input.liveCounts.visualTasks, soundTasks: input.liveCounts.soundTasks,
      matrixBitmap: input.liveCounts.matrixBitmap, ownedSprites: input.ownedSprites.length },
  };
}

export function spitUpDisplayPlan(state: Readonly<SpitUpState>): SpitUpDisplayPlan {
  const objects = decodeGbaHardwareOam(state.buffers.hardwareOam,
    state.buffers.hardwareMatrices, IDENTITY);
  const tile = (object: GbaHardwareOamObject<SpitUpMatrix>): number => object.attr[2] & 0x3ff;
  const find = (art: SpitUpArt): GbaHardwareOamObject<SpitUpMatrix> | null =>
    objects.find((object) => object.attr[2] === art.attr[2]) ?? null;
  return {
    attacker: find(state.battlers.attacker.art), target: find(state.battlers.target.art),
    redOrbs: state.resources.redOrbLoaded ? objects.filter((object) =>
      tile(object) >= state.resources.redOrbTileBase && tile(object) < state.resources.redOrbTileBase + 3) : [],
    impacts: state.resources.impactLoaded ? objects.filter((object) =>
      tile(object) >= state.resources.impactTileBase && tile(object) < state.resources.impactTileBase + 16) : [],
  };
}
