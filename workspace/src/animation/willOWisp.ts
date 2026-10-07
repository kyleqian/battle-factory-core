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

const gbaSin = (angle: number, amplitude: number): number =>
  GBA_SINE_TABLE_256[angle & 255]! * amplitude >> 8;
const gbaCos = (angle: number, amplitude: number): number => gbaSin(angle + 64, amplitude);

/**
 * Source timeline from the live anchors (battle_anim_effects / AnimWillOWispOrb + InitAnimLinearTranslationWithSpeed,
 * prep20 s0.2.1): each orb wobbles 31 ticks at the attacker picture anchor, then translates linearly for |dx| ticks
 * (speed 256: duration = |dx|) to the target anchor; Q8.8 deltas `(|d| << 8) / duration` with the sign in bit 0. The
 * fires start two ticks after the last orb ends (waitforvisualfinish + splitbgprio_all) and live 28 ticks; the body
 * cleans up 23 ticks after them. The singles sBattlerCoords X_2 anchors give |dx| = 105 (player) / 104 (opponent).
 */
export function willOWispTimeline(attackerSide: WillOWispSide, attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>) {
  const dir = attackerSide === "player" ? -1 : 1;
  const x = attackerCenter.x + gbaSin(124, dir * 4), y = attackerCenter.y;
  const dx = targetCenter.x - x, dy = targetCenter.y - y;
  if (dx === 0) throw new Error("Will-O-Wisp orb translation has dx == 0");
  const duration = Math.abs(dx);
  const xDelta = (Math.trunc((Math.abs(dx) << 8) / duration) & 0xffff & ~1) | (dx < 0 ? 1 : 0);
  const yDelta = (Math.trunc((Math.abs(dy) << 8) / duration) & 0xffff & ~1) | (dy < 0 ? 1 : 0);
  const orbEnd = 10 + 31 + duration, fireStart = orbEnd + 15 + 2, fireEnd = fireStart + 27;
  return { dir, x, y, duration, xDelta, yDelta, orbEnd, fireStart, fireEnd, cleanup: fireEnd + 23 };
}
const profile = (input: Readonly<Pick<WillOWispLiveInputs, "attackerSide" | "attackerCenter" | "targetCenter">>) => {
  const t = willOWispTimeline(input.attackerSide, input.attackerCenter, input.targetCenter);
  return { ...t, panEnd: input.attackerSide === "player" ? 128 : 127, shakeStart: t.fireStart, shakeEnd: t.fireStart + 23 };
};

export function willOWispSourceAtAge(age: number,
  input: Readonly<Pick<WillOWispLiveInputs, "attackerSide" | "attackerCenter" | "targetCenter">>) {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Will-O-Wisp age ${age}`);
  const p = profile(input);
  const active = age < p.cleanup;
  const offset = age === 0 ? 0 : age < 4 ? 3 : age < 7 ? 6 : age < 10 ? 8
    : age < 15 ? 49 : age < 20 ? 64 : age < 25 ? 79 : age < 67 ? 94
      : age < p.fireStart ? 109 : age <= p.fireEnd + 1 ? 186 : 189;
  return { owner: "Move_WILL_O_WISP" as const, pointer: WILL_O_WISP_ROOT + offset,
    offset, wait: active && (offset === 94 || offset === 109 || offset === 186 || offset === 189) ? 1 : 0 };
}

function orbAt(age: number, ordinal: number, input: Readonly<WillOWispLiveInputs>): WillOWispSpriteProgram | null {
  const p = profile(input), start = 10 + ordinal * 5, end = p.orbEnd + ordinal * 5;
  if (age < start || age > end) return null;
  const local = age - start;
  let callback: WillOWispSpriteProgram["callback"] = "AnimWillOWispOrb", x = input.attackerCenter.x, y = input.attackerCenter.y;
  let x2 = gbaSin(local * 4, p.dir * 4), y2 = 0;
  if (local >= 31) {
    // AnimTranslateLinear: u16 Q8.8 accumulators, the sign of each axis in bit 0 of its delta.
    callback = "AnimWillOWispOrb_Step";
    x = p.x; y = p.y;
    const step = local - 31, accX = (step * p.xDelta) & 0xffff, accY = (step * p.yDelta) & 0xffff;
    x2 = (p.xDelta & 1 ? -(accX >> 8) : accX >> 8) + gbaSin(Math.max(0, step - 1) * 4, 16);
    y2 = p.yDelta & 1 ? -(accY >> 8) : accY >> 8;
  }
  return { kind: "orb", ordinal, start, end, callback, animation: ordinal,
    x, y, x2, y2, invisible: false, priority: 0 };
}

function fireAt(age: number, ordinal: number, input: Readonly<WillOWispLiveInputs>): WillOWispSpriteProgram | null {
  const p = profile(input), start = p.fireStart, end = p.fireEnd;
  if (age < start || age > end) return null;
  const local = age - start, phase = (ordinal * 42 + (local + 1) * 7) & 255;
  const radialX = Math.trunc(((local + 2) * 0x180) / 256);
  const radialY = Math.trunc(((local + 2) * 0xa0) / 256);
  return { kind: "fire", ordinal, start, end, callback: "AnimWillOWispFire", animation: 0,
    x: input.targetCenter.x, y: input.targetCenter.y,
    x2: gbaSin(phase, radialX), y2: gbaCos(phase, radialY), invisible: local >= 19 && (local & 1) === 1,
    priority: 0 };
}

/** The four orb and six fire source programs alive at `age` (geometry only; the live OAM provider builds from these). */
export function willOWispSpritesAtAge(age: number,
  input: Readonly<Pick<WillOWispLiveInputs, "attackerSide" | "attackerCenter" | "targetCenter">>): WillOWispSpriteProgram[] {
  const geometry = input as Readonly<WillOWispLiveInputs>;
  return [...Array.from({length: 4}, (_, i) => orbAt(age, i, geometry)),
    ...Array.from({length: 6}, (_, i) => fireAt(age, i, geometry))]
    .filter((entry): entry is WillOWispSpriteProgram => entry !== null);
}

export function willOWispAtAge(age: number, input: Readonly<WillOWispLiveInputs>): WillOWispState {
  if (input.attackerSide === input.targetSide) throw new Error("Will-O-Wisp requires opposite sides");
  const p = profile(input), source = willOWispSourceAtAge(age, input);
  const sprites = willOWispSpritesAtAge(age, input);
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
