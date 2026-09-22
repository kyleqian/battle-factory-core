/** Source-relative Scene-ON reducer for MOVE_WILL_O_WISP. */
import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type WillOWispSide = "player" | "opponent";
export type WillOWispMatrix = readonly [number, number, number, number];
export type WillOWispOam = readonly [number, number, number];
export interface WillOWispArt { readonly displaySpecies: string; readonly slot: number;
  readonly attr: WillOWispOam; readonly subpriority: number; }
export interface WillOWispLiveInputs {
  readonly attackerSide: WillOWispSide; readonly targetSide: WillOWispSide;
  readonly attackerSpecies: string; readonly targetSpecies: string;
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly attackerArt: WillOWispArt; readonly targetArt: WillOWispArt;
  readonly taskSlots: Readonly<{ updateMonBg: number; clearMonBg: number; panning: number; shake: number }>;
  readonly liveTasks: readonly Readonly<{ slot: number; callback: string; data: readonly number[] }>[];
  readonly buffers: Readonly<{ softwareOam: readonly unknown[]; hardwareOam: readonly unknown[];
    softwareMatrices: readonly WillOWispMatrix[]; hardwareMatrices: readonly WillOWispMatrix[] }>;
  readonly palette: Readonly<{ unfaded: readonly number[]; faded: readonly number[]; hardware: readonly number[] }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly background: Readonly<{ battleVram: unknown; currentVram: unknown; monbgPaletteBank: number }>;
  readonly resources: Readonly<{ orbTileBase: number; fireTileBase: number; orbPaletteBank: number;
    firePaletteBank: number; orbLoaded: boolean; fireLoaded: boolean; allocator: unknown }>;
  readonly spriteOrder: readonly number[]; readonly audio: unknown;
  readonly liveCounts: Readonly<{ visualTasks: number; soundTasks: number; matrixBitmap: number }>;
  readonly animationRng: number; readonly gameplayRng: unknown; readonly gameplayState: unknown;
}
export interface WillOWispSpriteProgram {
  readonly kind: "orb" | "fire"; readonly ordinal: number; readonly start: number; readonly end: number;
  readonly callback: "AnimWillOWispOrb" | "AnimWillOWispOrb_Step" | "AnimWillOWispFire";
  readonly animation: number; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly invisible: boolean; readonly priority: number;
}
export interface WillOWispState {
  readonly age: number; readonly active: boolean;
  readonly source: Readonly<{ owner: "Move_WILL_O_WISP"; pointer: number; offset: number; wait: number }>;
  readonly battlers: Readonly<{ attacker: Readonly<{ side: WillOWispSide; species: string; center: Readonly<{x:number;y:number}>; art: WillOWispArt }>;
    target: Readonly<{ side: WillOWispSide; species: string; center: Readonly<{x:number;y:number}>; art: WillOWispArt }> }>;
  readonly sprites: readonly WillOWispSpriteProgram[];
  readonly tasks: WillOWispLiveInputs["liveTasks"];
  readonly panning: Readonly<{ active: boolean; startPan: number; endPan: number; increment: number; value: number | null }>;
  readonly shake: Readonly<{ active: boolean; sourceX2: number; displayedX2: number }>;
  readonly monbg: Readonly<{ active: boolean; clearing: boolean; selected: "bg1" | "bg2"; paletteBank: number; split: "foes" | "all" }>;
  readonly buffers: WillOWispLiveInputs["buffers"]; readonly palette: WillOWispLiveInputs["palette"];
  readonly registers: WillOWispLiveInputs["registers"]; readonly background: WillOWispLiveInputs["background"];
  readonly resources: WillOWispLiveInputs["resources"]; readonly spriteOrder: readonly number[];
  readonly audio: unknown; readonly rng: Readonly<{ animation: number; gameplay: unknown; gameplayUnchanged: true }>;
  readonly gameplay: unknown;
  readonly cleanup: Readonly<{ firstInactive: boolean; visualTasks: number; soundTasks: number; matrixBitmap: number; ownedSprites: number }>;
}
export interface WillOWispDisplayPlan {
  readonly attacker: GbaHardwareOamObject<WillOWispMatrix>; readonly target: GbaHardwareOamObject<WillOWispMatrix> | null;
  readonly orbs: readonly GbaHardwareOamObject<WillOWispMatrix>[]; readonly fires: readonly GbaHardwareOamObject<WillOWispMatrix>[];
}
const IDENTITY: WillOWispMatrix = [256, 0, 0, 256];
export const WILL_O_WISP_ROOT = 0x082d4709;

const profile = (side: WillOWispSide) => side === "player"
  ? { cleanup: 213, orbEnd: 146, fireStart: 163, fireEnd: 190, panEnd: 128, shakeStart: 163, shakeEnd: 186 }
  : { cleanup: 212, orbEnd: 145, fireStart: 162, fireEnd: 189, panEnd: 127, shakeStart: 162, shakeEnd: 185 };
const gbaSin = (angle: number, amplitude: number): number =>
  GBA_SINE_TABLE_256[angle & 255]! * amplitude >> 8;
const gbaCos = (angle: number, amplitude: number): number => gbaSin(angle + 64, amplitude);

export function willOWispSourceAtAge(age: number, side: WillOWispSide) {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Will-O-Wisp age ${age}`);
  const p = profile(side);
  const active = age < p.cleanup;
  const offset = age === 0 ? 0 : age < 4 ? 3 : age < 7 ? 6 : age < 10 ? 8
    : age < 15 ? 49 : age < 20 ? 64 : age < 25 ? 79 : age < 67 ? 94
      : age < p.fireStart ? 109 : age <= p.fireEnd + 1 ? 186 : 189;
  return { owner: "Move_WILL_O_WISP" as const, pointer: WILL_O_WISP_ROOT + offset,
    offset, wait: active && (offset === 94 || offset === 109 || offset === 186 || offset === 189) ? 1 : 0 };
}

function orbAt(age: number, ordinal: number, input: Readonly<WillOWispLiveInputs>): WillOWispSpriteProgram | null {
  const p = profile(input.attackerSide), start = 10 + ordinal * 5, end = p.orbEnd + ordinal * 5;
  if (age < start || age > end) return null;
  const local = age - start, direction = input.attackerSide === "player" ? -1 : 1;
  const startX = input.attackerCenter.x, startY = input.attackerCenter.y;
  let callback: WillOWispSpriteProgram["callback"] = "AnimWillOWispOrb", x = startX, y = startY;
  let x2 = gbaSin(local * 4, direction * 4), y2 = 0;
  if (local >= 31) {
    callback = "AnimWillOWispOrb_Step";
    x = startX + gbaSin(124, direction * 4); y = startY;
    const step = local - 31;
    const xDelta = input.targetCenter.x - x;
    const yDelta = input.targetCenter.y - y;
    // InitAnimLinearTranslationWithSpeed stores these Q8.8 increments after
    // its signed speed rounding; the two singles orientations round on
    // opposite sides of zero.
    const xStep = input.attackerSide === "player" ? 256 : 257;
    const yStep = input.attackerSide === "player" ? 75 : 144;
    x2 = Math.sign(xDelta) * (step * xStep >> 8) + gbaSin(Math.max(0, step - 1) * 4, 16);
    y2 = Math.sign(yDelta) * (step * yStep >> 8);
  }
  return { kind: "orb", ordinal, start, end, callback, animation: ordinal,
    x, y, x2, y2, invisible: false, priority: 0 };
}

function fireAt(age: number, ordinal: number, input: Readonly<WillOWispLiveInputs>): WillOWispSpriteProgram | null {
  const p = profile(input.attackerSide), start = p.fireStart, end = p.fireEnd;
  if (age < start || age > end) return null;
  const local = age - start, phase = (ordinal * 42 + (local + 1) * 7) & 255;
  const radialX = Math.trunc(((local + 2) * 0x180) / 256);
  const radialY = Math.trunc(((local + 2) * 0xa0) / 256);
  return { kind: "fire", ordinal, start, end, callback: "AnimWillOWispFire", animation: 0,
    x: input.targetCenter.x, y: input.targetCenter.y,
    x2: gbaSin(phase, radialX), y2: gbaCos(phase, radialY), invisible: local >= 19 && (local & 1) === 1,
    priority: 0 };
}

export function willOWispAtAge(age: number, input: Readonly<WillOWispLiveInputs>): WillOWispState {
  if (input.attackerSide === input.targetSide) throw new Error("Will-O-Wisp requires opposite sides");
  const p = profile(input.attackerSide), source = willOWispSourceAtAge(age, input.attackerSide);
  const sprites = [...Array.from({length: 4}, (_, i) => orbAt(age, i, input)),
    ...Array.from({length: 6}, (_, i) => fireAt(age, i, input))]
    .filter((entry): entry is WillOWispSpriteProgram => entry !== null);
  const panActive = age >= 67 && age <= p.panEnd;
  const panStart = input.attackerSide === "player" ? -64 : 63;
  const panEnd = -panStart, panValue = panActive
    ? panStart + (input.attackerSide === "player" ? 2 : -2) * (age - 67 + 2) : null;
  const shakeActive = age >= p.shakeStart && age <= p.shakeEnd;
  const shakeLeg = Math.floor((age - p.shakeStart) / 2);
  const sourceX2 = shakeActive ? (shakeLeg % 2 ? 4 : -4) : 0;
  return { age, active: source.offset !== 189 || age < p.cleanup, source,
    battlers: { attacker: { side: input.attackerSide, species: input.attackerSpecies,
      center: input.attackerCenter, art: input.attackerArt }, target: { side: input.targetSide,
      species: input.targetSpecies, center: input.targetCenter, art: input.targetArt } },
    sprites, tasks: input.liveTasks,
    panning: { active: panActive, startPan: panStart, endPan: panEnd,
      increment: input.attackerSide === "player" ? 2 : -2, value: panValue },
    shake: { active: shakeActive, sourceX2, displayedX2: shakeActive ? sourceX2 : 0 },
    monbg: { active: age >= 7 && age <= p.fireEnd + 4, clearing: age >= p.fireEnd + 1 && age <= p.fireEnd + 4,
      selected: input.targetSide === "opponent" ? "bg1" : "bg2", paletteBank: input.background.monbgPaletteBank,
      split: age < p.fireStart ? "foes" : "all" },
    buffers: input.buffers, palette: input.palette, registers: input.registers,
    background: input.background, resources: input.resources, spriteOrder: input.spriteOrder,
    audio: input.audio, rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState, cleanup: { firstInactive: age === p.cleanup,
      visualTasks: input.liveCounts.visualTasks, soundTasks: input.liveCounts.soundTasks,
      matrixBitmap: input.liveCounts.matrixBitmap, ownedSprites: sprites.length } };
}

export function willOWispDisplayPlan(state: Readonly<WillOWispState>): WillOWispDisplayPlan {
  const objects = decodeGbaHardwareOam(state.buffers.hardwareOam, state.buffers.hardwareMatrices, IDENTITY);
  const tile = (object: GbaHardwareOamObject<WillOWispMatrix>) => object.attr[2] & 0x3ff;
  const inRange = (value: number, base: number, length: number) => value >= base && value < base + length;
  const orbs = objects.filter((object) => inRange(tile(object), state.resources.orbTileBase, 28));
  const fires = objects.filter((object) => inRange(tile(object), state.resources.fireTileBase, 64));
  const findBattler = (art: WillOWispArt) => objects.find((object) => object.attr[2] === art.attr[2]) ?? null;
  const attacker = findBattler(state.battlers.attacker.art);
  if (!attacker) throw new Error("missing Will-O-Wisp attacker hardware OAM");
  return { attacker, target: findBattler(state.battlers.target.art), orbs, fires };
}
