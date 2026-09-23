/** Source-derived presentation reducer for MOVE_ICE_BALL. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { advanceRngValue } from "../engine/rng.ts";
import { linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks } from "./animLinearTranslation.ts";
import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";

export type IceBallSide = "player" | "opponent";
export type IceBallCounter = 0 | 1 | 2 | 3 | 4;
export type IceBallMatrix = readonly [number, number, number, number];
export type IceBallOam = readonly [number, number, number];
export interface IceBallArt { readonly displaySpecies: string; readonly slot: number;
  readonly attr: IceBallOam; readonly subpriority: number; }
export interface IceBallPoint { readonly x: number; readonly y: number; }
export interface IceBallLiveInputs {
  readonly counter: IceBallCounter;
  readonly attackerSide: IceBallSide; readonly targetSide: IceBallSide;
  readonly attackerSpecies: string; readonly targetSpecies: string;
  readonly attackerPictureOffset: IceBallPoint; readonly targetPictureOffset: IceBallPoint;
  readonly attackerArt: IceBallArt; readonly targetArt: IceBallArt;
  readonly allocation: Readonly<{ chunkSlot: number; shardSlots: readonly number[]; state: unknown }>;
  readonly buffers: Readonly<{ softwareOam: readonly unknown[]; hardwareOam: readonly unknown[];
    softwareMatrices: readonly IceBallMatrix[]; hardwareMatrices: readonly IceBallMatrix[] }>;
  readonly palette: Readonly<{ unfaded: readonly number[]; faded: readonly number[];
    hardware: readonly number[] }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly resources: Readonly<{ chunkTileBase: number; chunkLoaded: boolean;
    crystalsTileBase: number; crystalsLoaded: boolean }>;
  readonly tasks: readonly Readonly<{ slot: number; callback: string; data: readonly number[] }>[];
  readonly order: readonly number[]; readonly audio: unknown;
  readonly liveCounts: Readonly<{ visualTasks: number; soundTasks: number; matrixBitmap: number }>;
  readonly initialPresentationRng: number; readonly gameplayRng: unknown; readonly gameplayState: unknown;
}
export interface IceBallSourceCursor { readonly owner: "Move_ICE_BALL"; readonly pointer: number;
  readonly offset: 0 | 3 | 6 | 48 | 118 | 126 | 129 | 130; readonly active: boolean; }
export interface IceBallChunk {
  readonly kind: "chunk"; readonly slot: number; readonly callback: "AnimThrowIceBall" | "RunStoredCallbackWhenAnimEnds" | "DestroyAnimSprite";
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly frame: 0 | 1 | 2 | 3 | 4; readonly matrix: IceBallMatrix;
  readonly data: readonly number[];
}
export interface IceBallShard {
  readonly kind: "shard"; readonly slot: number; readonly callback: "AnimIceBallParticle";
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly localAge: number; readonly randomA: number; readonly randomB: number;
  readonly data: readonly number[];
}
export interface IceBallState {
  readonly age: number; readonly active: boolean; readonly source: IceBallSourceCursor;
  readonly branch: Readonly<{ counter: IceBallCounter; shards: 5 | 7 | 9 | 10;
    shakeDuration: 8 | 10 | 14 | 18 | 30; affineScale: 224 | 280 | 336 | 384 | 448 }>;
  readonly battlers: Readonly<{ attacker: Readonly<{ side: IceBallSide; species: string;
    pictureOffset: IceBallPoint; art: IceBallArt }>; target: Readonly<{ side: IceBallSide;
      species: string; pictureOffset: IceBallPoint; art: IceBallArt }> }>;
  readonly sprites: readonly (IceBallChunk | IceBallShard)[];
  readonly shake: Readonly<{ active: boolean; sourceStartAge: 37; sourceEndAge: number; duration: number }>;
  readonly background: Readonly<{ phase: "battle" | "ice"; fadeActive: boolean;
    setupAge: 26; restoreAge: 111; delay: 45 }>;
  readonly buffers: IceBallLiveInputs["buffers"]; readonly palette: IceBallLiveInputs["palette"];
  readonly registers: IceBallLiveInputs["registers"]; readonly resources: IceBallLiveInputs["resources"];
  readonly tasks: IceBallLiveInputs["tasks"]; readonly allocation: IceBallLiveInputs["allocation"];
  readonly order: readonly number[]; readonly audio: unknown;
  readonly rng: Readonly<{ presentationInitial: number; presentation: number;
    gameplay: unknown; gameplayUnchanged: true }>;
  readonly gameplay: unknown;
  readonly cleanup: Readonly<{ firstInactive: boolean; visualTasks: number; soundTasks: number;
    matrixBitmap: number; ownedSprites: number }>;
}
export interface IceBallDisplayPlan {
  readonly attacker: GbaHardwareOamObject<IceBallMatrix> | null;
  readonly target: GbaHardwareOamObject<IceBallMatrix> | null;
  readonly chunks: readonly GbaHardwareOamObject<IceBallMatrix>[];
  readonly shards: readonly GbaHardwareOamObject<IceBallMatrix>[];
}

export const ICE_BALL_ROOT = 0x082d_72a4;
const SHARDS = [5, 7, 9, 10, 10] as const;
const SHAKE = [8, 10, 14, 18, 30] as const;
const SCALES = [0xe0, 0x118, 0x150, 0x180, 0x1c0] as const;
const INVERSE = [292, 234, 195, 170, 146] as const;
const IDENTITY: IceBallMatrix = [256, 0, 0, 256];
const sine = (index: number, amplitude: number): number =>
  (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;

function branch(counter: IceBallCounter): IceBallState["branch"] {
  return { counter, shards: SHARDS[counter], shakeDuration: SHAKE[counter], affineScale: SCALES[counter] };
}

export function iceBallSourceAtAge(age: number, counter: IceBallCounter): IceBallSourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Ice Ball age ${age}`);
  if (![0, 1, 2, 3, 4].includes(counter)) throw new Error(`invalid Ice Ball counter ${counter}`);
  const strongest = counter === 4; const end = strongest ? 131 : 75;
  let offset: IceBallSourceCursor["offset"] = 0;
  if (age >= 1) offset = 3;
  if (age >= 4) offset = 6;
  if (age >= 7) offset = 48;
  if (age >= 37) offset = strongest ? 126 : 118;
  if (strongest && age >= 45) offset = 129;
  if (strongest && age >= 92) offset = 130;
  if (age >= end) offset = 118;
  return { owner: "Move_ICE_BALL", pointer: ICE_BALL_ROOT + offset, offset, active: age < end };
}

function presentationRngAtAge(initial: number, age: number, shardCount: number): number {
  let value = initial >>> 0;
  for (let tick = 1; tick <= age; tick += 1) {
    value = advanceRngValue(value);
    if (tick === 37) for (let draw = 0; draw < shardCount * 2; draw += 1) value = advanceRngValue(value);
  }
  return value;
}

/** Retained player-back counter-3 row 38 is a single callback/VBlank hold. */
function callbackAge(age: number, input: Readonly<IceBallLiveInputs>): number {
  let held = age;
  if (input.attackerSide === "player" && input.counter === 3 && age >= 38) held -= 1;
  // `restorebg` performs one bilateral transfer-only display at age 112.
  if (input.counter === 4 && age >= 112) held -= 1;
  return held;
}

function chunkAtAge(age: number, input: Readonly<IceBallLiveInputs>): IceBallChunk | null {
  const effectiveAge = callbackAge(age, input);
  if (effectiveAge < 7 || effectiveAge > 54) return null;
  const callbacks = Math.min(30, effectiveAge - 6);
  const side = input.attackerSide === "player" ? 1 : -1;
  const x = input.attackerPictureOffset.x + 15 * side;
  const y = input.attackerPictureOffset.y;
  const targetX = input.targetPictureOffset.x - 12 * side;
  const targetY = input.targetPictureOffset.y - 16;
  const dx = linearTranslationDeltaQ8(targetX - x, 30);
  const dy = linearTranslationDeltaQ8(targetY - y, 30);
  const phaseStep = Math.trunc(0x8000 / 30);
  const x2 = linearTranslationOffsetAfterCallbacks(dx, callbacks, 30);
  const y2 = linearTranslationOffsetAfterCallbacks(dy, callbacks, 30)
    + sine(phaseStep * callbacks >> 8, -40);
  const afterArc = effectiveAge >= 37;
  const frame = afterArc ? Math.min(4, 1 + Math.floor((effectiveAge - 37) / 4)) as 1 | 2 | 3 | 4 : 0;
  return { kind: "chunk", slot: input.allocation.chunkSlot,
    callback: effectiveAge === 54 ? "DestroyAnimSprite" : afterArc
      ? "RunStoredCallbackWhenAnimEnds" : "AnimThrowIceBall",
    x, y, x2, y2, frame, matrix: [INVERSE[input.counter], 0, 0, INVERSE[input.counter]],
    data: afterArc ? [0, Math.abs(dx), Math.abs(dy), Math.abs(dx) * 30,
      Math.abs(dy) * 30, -40] : [30 - callbacks, Math.abs(dx), Math.abs(dy),
      Math.abs(dx) * callbacks, Math.abs(dy) * callbacks, -40,
      phaseStep, phaseStep * callbacks] };
}

function shardsAtAge(age: number, input: Readonly<IceBallLiveInputs>): IceBallShard[] {
  const effectiveAge = callbackAge(age, input);
  if (effectiveAge < 37 || effectiveAge > 56) return [];
  const count = SHARDS[input.counter];
  if (input.allocation.shardSlots.length < count) throw new Error("Ice Ball shard allocation is incomplete");
  let rng = input.initialPresentationRng >>> 0;
  for (let tick = 1; tick <= 37; tick += 1) rng = advanceRngValue(rng);
  const localAge = effectiveAge - 36;
  const side = input.attackerSide === "player" ? 1 : -1;
  const x = input.targetPictureOffset.x - 12 * side;
  const y = input.targetPictureOffset.y - 16;
  return Array.from({ length: count }, (_, index) => {
    rng = advanceRngValue(rng); const randomA = ((rng >>> 16) & 0xff) + 256;
    rng = advanceRngValue(rng); let randomB = (rng >>> 16) & 0x1ff;
    if (randomB > 0xff) randomB = 256 - randomB;
    const accumA = randomA * localAge, accumB = randomB * localAge;
    return { kind: "shard", slot: input.allocation.shardSlots[index]!,
      callback: "AnimIceBallParticle", x, y,
      x2: randomA & 1 ? -(accumA >> 8) : accumA >> 8, y2: accumB >> 8,
      localAge, randomA, randomB,
      data: [localAge, randomA, randomB, accumA, accumB, 0, 0, 0] };
  });
}

export function iceBallAtAge(age: number, input: Readonly<IceBallLiveInputs>): IceBallState {
  if (input.attackerSide === input.targetSide) throw new Error("Ice Ball requires opposite sides");
  const source = iceBallSourceAtAge(age, input.counter); const selected = branch(input.counter);
  const chunk = chunkAtAge(age, input); const shards = shardsAtAge(age, input);
  const sprites: (IceBallChunk | IceBallShard)[] = [...(chunk ? [chunk] : []), ...shards];
  const end = input.counter === 4 ? 131 : 75;
  return { age, active: source.active, source, branch: selected,
    battlers: { attacker: { side: input.attackerSide, species: input.attackerSpecies,
      pictureOffset: input.attackerPictureOffset, art: input.attackerArt },
    target: { side: input.targetSide, species: input.targetSpecies,
      pictureOffset: input.targetPictureOffset, art: input.targetArt } }, sprites,
    shake: { active: age >= 37 && age < 36 + selected.shakeDuration * 2,
      sourceStartAge: 37, sourceEndAge: 35 + selected.shakeDuration * 2,
      duration: selected.shakeDuration },
    background: { phase: input.counter === 4 && age >= 26 && age < 111 ? "ice" : "battle",
      fadeActive: input.counter === 4 && ((age >= 7 && age <= 43) || (age >= 92 && age <= 129)),
      setupAge: 26, restoreAge: 111, delay: 45 },
    buffers: input.buffers, palette: input.palette, registers: input.registers,
    resources: input.resources, tasks: input.tasks, allocation: input.allocation,
    order: input.order, audio: input.audio,
    rng: { presentationInitial: input.initialPresentationRng,
      presentation: presentationRngAtAge(input.initialPresentationRng,
        callbackAge(age, input), selected.shards),
      gameplay: input.gameplayRng, gameplayUnchanged: true }, gameplay: input.gameplayState,
    cleanup: { firstInactive: age === end, visualTasks: input.liveCounts.visualTasks,
      soundTasks: input.liveCounts.soundTasks, matrixBitmap: input.liveCounts.matrixBitmap,
      ownedSprites: sprites.length } };
}

export function iceBallDisplayPlan(state: Readonly<IceBallState>): IceBallDisplayPlan {
  const objects = decodeGbaHardwareOam(state.buffers.hardwareOam,
    state.buffers.hardwareMatrices, IDENTITY);
  const tile = (object: GbaHardwareOamObject<IceBallMatrix>): number => object.attr[2] & 0x3ff;
  const findArt = (art: IceBallArt): GbaHardwareOamObject<IceBallMatrix> | null =>
    objects.find((object) => object.attr[2] === art.attr[2]) ?? null;
  return { attacker: findArt(state.battlers.attacker.art), target: findArt(state.battlers.target.art),
    chunks: state.resources.chunkLoaded ? objects.filter((object) =>
      tile(object) >= state.resources.chunkTileBase && tile(object) < state.resources.chunkTileBase + 80) : [],
    shards: state.resources.crystalsLoaded ? objects.filter((object) =>
      tile(object) >= state.resources.crystalsTileBase + 6
      && tile(object) < state.resources.crystalsTileBase + 7) : [] };
}
