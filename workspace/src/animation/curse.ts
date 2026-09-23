/** Pure source-relative Scene-ON reducer for both natural MOVE_CURSE branches. */
import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";

export type CurseSide = "player" | "opponent";
export type CurseBranch = "ghost" | "stats";
export type CurseMatrix = readonly [number, number, number, number];
export type CurseOam = readonly [number, number, number];
export interface CurseArt { readonly displaySpecies: string; readonly slot: number;
  readonly attr: CurseOam; readonly subpriority: number; }
export interface CurseSprite { readonly slot: number; readonly template: string;
  readonly callback: string; readonly attr: CurseOam; readonly matrix: CurseMatrix;
  readonly matrixNum: number; readonly data: readonly number[]; readonly invisible: boolean; }
export interface CurseLiveInputs {
  readonly branch: CurseBranch;
  readonly attackerSide: CurseSide; readonly defenderSide: CurseSide;
  readonly attackerSpecies: string; readonly defenderSpecies: string;
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly defenderCenter: Readonly<{ x: number; y: number }>;
  readonly attackerArt: CurseArt; readonly defenderArt: CurseArt;
  /** `gBattleAnimTarget` aliases the attacker in the natural non-Ghost branch. */
  readonly animationTargetArt: CurseArt;
  readonly ownedSprites: readonly CurseSprite[];
  readonly liveTasks: readonly Readonly<{ slot: number; callback: string; data: readonly number[] }>[];
  readonly buffers: Readonly<{ softwareOam: readonly unknown[]; hardwareOam: readonly unknown[];
    softwareMatrices: readonly CurseMatrix[]; hardwareMatrices: readonly CurseMatrix[];
    scanlineBuffers: readonly unknown[] }>;
  readonly palette: Readonly<{ unfaded: readonly number[]; faded: readonly number[];
    hardware: readonly number[] }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly battleBg: Readonly<Record<string, number>>;
  readonly resources: Readonly<{ nailTileBase: number; ghostTileBase: number;
    nailLoaded: boolean; ghostLoaded: boolean; allocator: unknown }>;
  readonly order: readonly number[]; readonly audio: unknown;
  readonly liveCounts: Readonly<{ visualTasks: number; soundTasks: number; matrixBitmap: number }>;
  readonly animationRng: number; readonly gameplayRng: unknown; readonly gameplayState: unknown;
}
export interface CurseSourceCursor { readonly owner: "Move_CURSE"; readonly pointer: number;
  readonly offset: number; readonly active: boolean; readonly branch: CurseBranch; }
export interface CurseState {
  readonly age: number; readonly active: boolean; readonly source: CurseSourceCursor;
  readonly branch: CurseBranch;
  readonly battlers: Readonly<{ attacker: Readonly<{ side: CurseSide; species: string;
    center: Readonly<{ x: number; y: number }>; art: CurseArt }>;
    defender: Readonly<{ side: CurseSide; species: string;
      center: Readonly<{ x: number; y: number }>; art: CurseArt }>;
    animationTargetArt: CurseArt }>;
  readonly sprites: readonly CurseSprite[]; readonly tasks: CurseLiveInputs["liveTasks"];
  readonly buffers: CurseLiveInputs["buffers"]; readonly palette: CurseLiveInputs["palette"];
  readonly registers: CurseLiveInputs["registers"]; readonly battleBg: CurseLiveInputs["battleBg"];
  readonly resources: CurseLiveInputs["resources"]; readonly order: readonly number[];
  readonly audio: unknown;
  readonly rng: Readonly<{ animation: number; gameplay: unknown; gameplayUnchanged: true }>;
  readonly gameplay: unknown;
  readonly cleanup: Readonly<{ firstInactive: boolean; visualTasks: number; soundTasks: number;
    matrixBitmap: number; ownedSprites: number }>;
}
export interface CurseDisplayPlan {
  readonly attacker: GbaHardwareOamObject<CurseMatrix> | null;
  readonly defender: GbaHardwareOamObject<CurseMatrix> | null;
  readonly nails: readonly GbaHardwareOamObject<CurseMatrix>[];
  readonly ghosts: readonly GbaHardwareOamObject<CurseMatrix>[];
}

export const CURSE_ROOT = 0x082d_3bf2;
const IDENTITY: CurseMatrix = [256, 0, 0, 256];
const GHOST_EDGES = [0, 1, 4, 7, 10, 33, 55, 117, 160, 203, 288, 293, 296, 337, 368] as const;
const GHOST_OFFSETS = [0, 12, 15, 17, 24, 27, 36, 43, 50, 55, 60, 62, 90, 108, 111] as const;
const STATS_EDGES = [0, 1, 65, 77, 79, 155] as const;
const STATS_OFFSETS = [0, 151, 154, 172, 159, 160] as const;

export function curseSourceAtAge(age: number, branch: CurseBranch): CurseSourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Curse age ${age}`);
  if (branch !== "ghost" && branch !== "stats") throw new Error(`invalid Curse branch ${branch}`);
  const edges = branch === "ghost" ? GHOST_EDGES : STATS_EDGES;
  const offsets = branch === "ghost" ? GHOST_OFFSETS : STATS_OFFSETS;
  let edge = 0; for (let index = 0; index < edges.length; index += 1) if (age >= edges[index]!) edge = index;
  const firstInactive = branch === "ghost" ? 372 : 175;
  return { owner: "Move_CURSE", pointer: CURSE_ROOT + offsets[edge]!, offset: offsets[edge]!,
    active: age < firstInactive, branch };
}

export function curseAtAge(age: number, input: Readonly<CurseLiveInputs>): CurseState {
  if (input.attackerSide === input.defenderSide) throw new Error("Curse requires opposite field sides");
  const source = curseSourceAtAge(age, input.branch);
  return { age, active: source.active, source, branch: input.branch,
    battlers: { attacker: { side: input.attackerSide, species: input.attackerSpecies,
      center: input.attackerCenter, art: input.attackerArt },
    defender: { side: input.defenderSide, species: input.defenderSpecies,
      center: input.defenderCenter, art: input.defenderArt },
    animationTargetArt: input.animationTargetArt },
    sprites: input.ownedSprites, tasks: input.liveTasks, buffers: input.buffers,
    palette: input.palette, registers: input.registers, battleBg: input.battleBg,
    resources: input.resources, order: input.order, audio: input.audio,
    rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    cleanup: { firstInactive: age === (input.branch === "ghost" ? 372 : 175),
      visualTasks: input.liveCounts.visualTasks, soundTasks: input.liveCounts.soundTasks,
      matrixBitmap: input.liveCounts.matrixBitmap, ownedSprites: input.ownedSprites.length } };
}

export function curseDisplayPlan(state: Readonly<CurseState>): CurseDisplayPlan {
  const objects = decodeGbaHardwareOam(state.buffers.hardwareOam,
    state.buffers.hardwareMatrices, IDENTITY);
  const tile = (object: GbaHardwareOamObject<CurseMatrix>): number => object.attr[2] & 0x3ff;
  const find = (art: CurseArt): GbaHardwareOamObject<CurseMatrix> | null =>
    objects.find((object) => object.attr[2] === art.attr[2]) ?? null;
  return { attacker: find(state.battlers.attacker.art), defender: find(state.battlers.defender.art),
    nails: state.resources.nailLoaded ? objects.filter((object) => tile(object) >= state.resources.nailTileBase
      && tile(object) < state.resources.nailTileBase + 32) : [],
    ghosts: state.resources.ghostLoaded ? objects.filter((object) => tile(object) >= state.resources.ghostTileBase
      && tile(object) < state.resources.ghostTileBase + 16) : [] };
}
