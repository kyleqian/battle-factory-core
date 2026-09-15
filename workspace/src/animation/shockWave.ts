/**
 * Source-relative Scene-ON reducer for MOVE_SHOCK_WAVE.
 *
 * The source move is a small scheduler around four electric resources, one
 * growing orb, and two C tasks.  This module keeps that scheduler pure: the
 * scene supplies the current geometry, OAM/resource allocator, palette and
 * register snapshots, while gameplay state and gameplay RNG are opaque.
 * No recording, framebuffer, controller tick, or species-specific branch is
 * part of the production reducer.
 */

export type ShockWaveSide = "player" | "opponent";
export interface ShockWavePoint { readonly x: number; readonly y: number; }
export type ShockWaveMatrix = readonly [number, number, number, number];
export type ShockWaveOam = readonly [number, number, number];

export interface ShockWaveBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: ShockWaveMatrix;
  readonly attr: ShockWaveOam;
}

export interface ShockWaveResourceAllocation {
  readonly tag: number;
  readonly paletteBank: number;
  readonly tileSlot: number;
  readonly tileRange: readonly [number, number];
  /** The live 16-color palette uploaded for this resource, when available. */
  readonly palette?: readonly number[];
}

export interface ShockWaveLiveInputs {
  readonly attackerSide: ShockWaveSide;
  readonly targetSide: ShockWaveSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** `GetBattlerSpriteCoord(..., X_2/Y_PIC_OFFSET)` for each live battler. */
  readonly attackerPictureOrigin: Readonly<ShockWavePoint>;
  readonly targetPictureOrigin: Readonly<ShockWavePoint>;
  /** The base `BATTLER_COORD_X/Y` used by Shock Wave's lightning task. */
  readonly targetBattlePosition: Readonly<ShockWavePoint>;
  readonly attackerSprite: Readonly<ShockWaveBattlerSprite>;
  readonly targetSprite: Readonly<ShockWaveBattlerSprite>;
  readonly taskSlots: Readonly<{
    readonly charging: number;
    readonly progressing: number;
    readonly lightning: number;
    readonly shake: number;
    readonly blend: number;
    readonly monbg: number;
    readonly clear: number;
  }>;
  readonly spriteSlots: Readonly<{ readonly orb: number; readonly paletteBlend: number }>;
  readonly matrixSlots: Readonly<{ readonly orb: number }>;
  readonly resources: Readonly<{
    readonly circleOfLight: Readonly<ShockWaveResourceAllocation>;
    readonly electricOrbs: Readonly<ShockWaveResourceAllocation>;
    readonly spark: Readonly<ShockWaveResourceAllocation>;
    readonly lightning: Readonly<ShockWaveResourceAllocation>;
  }>;
  /** Live non-move slots and source SortSprites order at root age zero. */
  readonly allocator: Readonly<{
    readonly initialOccupiedSprites: readonly number[];
    readonly initialMatrixBitmap: number;
    readonly spriteOrder: readonly number[];
  }>;
  readonly oam: Readonly<{
    readonly charging: ShockWaveOam;
    readonly orb: ShockWaveOam;
    readonly progressing: ShockWaveOam;
    readonly lightning: ShockWaveOam;
    readonly paletteBlend: ShockWaveOam;
  }>;
  readonly palettes: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly background: Readonly<{
    readonly values: Readonly<Record<string, number>>;
    readonly key: string;
    readonly register: string;
    readonly setupX: number;
    readonly setupValue: number;
    readonly clearValue: number;
    readonly vram: unknown;
    readonly setupVram: unknown;
    readonly clearVram: unknown;
  }>;
  readonly registers: Readonly<Record<string, number>>;
  /** The source's animation-only gRng2 seed. */
  readonly animationRngSeed: number;
  /** Opaque gameplay state; this reducer returns the same value unchanged. */
  readonly gameplayRng: unknown;
}

export const SHOCK_WAVE_SOURCE_START = 0x082cf422;
export const SHOCK_WAVE_SOURCE_END_EXCLUSIVE = 0x082cf4c4;
export const SHOCK_WAVE_FIRST_INACTIVE_AGE = 266;
export const SHOCK_WAVE_RESOURCE_TAGS = {
  circleOfLight: 10212,
  electricOrbs: 10211,
  spark: 10001,
  lightning: 10037,
} as const;

const IDENTITY: ShockWaveMatrix = [256, 0, 0, 256];
const CHARGING_OFFSETS = [
  [58, -60], [-56, -36], [8, -56], [-16, 56],
  [58, -10], [-58, 10], [48, -18], [-8, 56],
  [16, -56], [-58, -42], [58, 30], [-48, 40],
  [12, -48], [48, -12], [-56, 18], [48, 48],
] as const;
const CHARGING_DURATIONS = [40, 40, 35, 35, 30, 30, 25, 25, 20, 20, 15, 15, 10, 10, 10, 10, 10, 10, 10, 10] as const;
const CHARGING_START = 31;
const ORB_START = 45;
const ORB_END = 105;
const PROGRESSING_START = 77;
const PLAYER_TIMING = { lightningStart: 159, shakeStart: 195, clearStart: 262, cleanupAge: 266 } as const;
const OPPONENT_TIMING = { lightningStart: 153, shakeStart: 191, clearStart: 258, cleanupAge: 262 } as const;

export type ShockWaveTiming = Readonly<{
  readonly lightningStart: number;
  readonly shakeStart: number;
  readonly clearStart: number;
  readonly cleanupAge: number;
}>;

export function shockWaveTimingFor(input: Readonly<Pick<ShockWaveLiveInputs, "attackerSide">>): ShockWaveTiming {
  return input.attackerSide === "player" ? PLAYER_TIMING : OPPONENT_TIMING;
}

export function shockWaveFirstInactiveAge(input: Readonly<Pick<ShockWaveLiveInputs, "attackerSide">>): number {
  return shockWaveTimingFor(input).cleanupAge;
}

export interface ShockWaveSourceCursor {
  readonly owner: "Move_SHOCK_WAVE";
  readonly pointer: number;
  readonly pointerOffset: 0 | 3 | 6 | 9 | 12 | 14 | 34 | 56 | 65 | 74 | 86 | 140 | 157 | 161;
  readonly active: boolean;
  readonly wait: number;
}

export interface ShockWaveTask {
  readonly slot: number;
  readonly callback:
    | "AnimTask_ElectricChargingParticles_Step"
    | "AnimTask_ShockWaveProgressingBolt"
    | "AnimTask_ShockWaveLightning"
    | "AnimTask_ShakeMon_Step"
    | "AnimTask_BlendSpriteColor_Step2"
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg";
  readonly role: "charging" | "progressing" | "lightning" | "shake" | "blend" | "monbg" | "clear";
  readonly data: readonly number[];
}

interface ShockWaveSpriteBase {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr: ShockWaveOam;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: ShockWaveMatrix;
  readonly flags: number;
  readonly data: readonly number[];
  readonly animNum: number;
  readonly animCmdIndex: number;
  readonly animDelayCounter: number;
  readonly sourceCreationOrder: number;
}

export interface ShockWaveChargingSprite extends ShockWaveSpriteBase {
  readonly kind: "charging";
  readonly template: "gElectricChargingParticlesSpriteTemplate";
  readonly callback: "RunStoredCallbackWhenAnimEnds" | "AnimElectricChargingParticles" | "AnimElectricChargingParticles_Step";
  readonly birthAge: number;
}
export interface ShockWaveOrbSprite extends ShockWaveSpriteBase {
  readonly kind: "orb";
  readonly template: "gGrowingShockWaveOrbSpriteTemplate";
  readonly callback: "AnimGrowingShockWaveOrb";
  readonly affine: "sAffineAnim_GrowingElectricOrb";
  readonly birthAge: 45;
}
export interface ShockWaveProgressingSprite extends ShockWaveSpriteBase {
  readonly kind: "progressing";
  readonly template: "gShockWaveProgressingBoltSpriteTemplate";
  readonly callback: "AnimShockWaveProgressingBolt";
  readonly birthAge: number;
}
export interface ShockWaveLightningSprite extends ShockWaveSpriteBase {
  readonly kind: "lightning";
  readonly template: "gLightningSpriteTemplate";
  readonly callback: "AnimShockWaveLightning";
  readonly birthAge: number;
}
export interface ShockWavePaletteSprite extends ShockWaveSpriteBase {
  readonly kind: "palette-blend";
  readonly template: "gSimplePaletteBlendSpriteTemplate";
  readonly callback: "AnimSimplePaletteBlend_Step";
  readonly birthAge: 16;
}
export type ShockWaveSprite = ShockWaveChargingSprite | ShockWaveOrbSprite | ShockWaveProgressingSprite | ShockWaveLightningSprite | ShockWavePaletteSprite;

export interface ShockWaveState {
  readonly age: number;
  readonly active: boolean;
  readonly source: ShockWaveSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: ShockWaveSide; readonly species: string; readonly sprite: ShockWaveBattlerSprite }>;
    readonly target: Readonly<{ readonly side: ShockWaveSide; readonly species: string; readonly sprite: ShockWaveBattlerSprite; readonly shake: ShockWavePoint; readonly displayedShake: ShockWavePoint }>;
  }>;
  readonly sprites: readonly ShockWaveSprite[];
  readonly tasks: readonly ShockWaveTask[];
  readonly resources: Readonly<{
    readonly tags: Readonly<Record<keyof typeof SHOCK_WAVE_RESOURCE_TAGS, Readonly<ShockWaveResourceAllocation & { readonly loaded: boolean }> >>;
    readonly matrixBitmap: number;
  }>;
  readonly palette: Readonly<{
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
    readonly banks: readonly number[];
    readonly simpleBlendCoefficient: number;
    readonly targetBlendCoefficient: number;
  }>;
  readonly background: Readonly<{ readonly values: Readonly<Record<string, number>>; readonly vram: unknown }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software";
    readonly palette: "initial" | "preceding-faded" | "same-row-monbg-setup";
    readonly selectedBackground: "initial" | "visible-after-age-14";
  }>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{ readonly sound: "se_m_charge" | "se_m_tri_attack2" | "se_m_thunderbolt"; readonly pan: number }>[];
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayUnchanged: true }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: 0; readonly ownedSprites: number; readonly resourcesReleased: boolean }>;
}

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Shock Wave source age ${age}`);
}
function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) throw new Error(`invalid Shock Wave ${label}`);
}
function assertInputs(input: Readonly<ShockWaveLiveInputs>): void {
  if (input.attackerSide === input.targetSide) throw new Error("Shock Wave requires opposing live battler sides");
  for (const [label, slot] of Object.entries(input.taskSlots)) assertSlot(slot, label, 16);
  for (const [label, slot] of Object.entries(input.spriteSlots)) assertSlot(slot, label, 64);
  assertSlot(input.matrixSlots.orb, "orb matrix", 32);
  if (input.allocator.spriteOrder.length !== 64 || new Set(input.allocator.spriteOrder).size !== 64
    || input.allocator.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error("Shock Wave requires a live 64-slot painter order seed");
  }
  if (input.palettes.unfaded.length !== 512 || input.palettes.faded.length !== 512 || input.palettes.hardware.length !== 512) {
    throw new Error("Shock Wave requires complete live palette banks");
  }
  for (const [name, resource] of Object.entries(input.resources)) {
    if (resource.tag !== SHOCK_WAVE_RESOURCE_TAGS[name as keyof typeof SHOCK_WAVE_RESOURCE_TAGS]) throw new Error(`Shock Wave resource tag mismatch: ${name}`);
    assertSlot(resource.paletteBank, `${name} palette bank`, 32);
    if (resource.palette && resource.palette.length !== 16) throw new Error(`Shock Wave ${name} palette must contain one bank`);
  }
}
function words(...values: number[]): readonly number[] {
  return [...values, ...Array.from({ length: Math.max(0, 16 - values.length) }, () => 0)].slice(0, 16);
}
function u32(value: number): number { return value >>> 0; }
function nextAnimationRng(value: number): number { return u32(Math.imul(value, 0x41c64e6d) + 0x6073); }
function animationRngAtAge(seed: number, age: number, cleanupAge: number): number {
  const draws = age < cleanupAge - 2 ? age : age < cleanupAge ? cleanupAge - 3 : cleanupAge - 2;
  let value = u32(seed);
  for (let index = 0; index < draws; index += 1) value = nextAnimationRng(value);
  return value;
}
function truncDiv(numerator: number, denominator: number): number { return Math.trunc(numerator / denominator); }
function signedFixedDelta(start: number, end: number, duration: number): number {
  const magnitude = truncDiv(Math.abs(end - start) << 8, duration) & ~1;
  return magnitude | (end < start ? 1 : 0);
}
function offsetFromFixed(value: number, accumulated: number): number { return (value & 1) !== 0 ? -(accumulated >> 8) : accumulated >> 8; }
function paletteBank(palette: readonly number[], bank: number): number[] { return palette.slice(bank * 16, bank * 16 + 16); }
function replaceBank(palette: number[], bank: number, values: readonly number[]): void { palette.splice(bank * 16, 16, ...values.slice(0, 16)); }
function blendColor(source: number, target: number, coefficient: number): number {
  const blend = (component: number, targetComponent: number): number => ((component * (16 - coefficient)) + targetComponent * coefficient) >> 4;
  return blend(source & 31, target & 31) | (blend((source >> 5) & 31, (target >> 5) & 31) << 5) | (blend((source >> 10) & 31, (target >> 10) & 31) << 10);
}

/** The actual move-script cursor, including its cleanup row. */
export function shockWaveSourceAtAge(age: number, lightningStart = PLAYER_TIMING.lightningStart): ShockWaveSourceCursor {
  assertAge(age);
  const shakeStart = lightningStart + (lightningStart === OPPONENT_TIMING.lightningStart ? 38 : 36);
  const clearStart = shakeStart + 67;
  const cleanupAge = clearStart + 4;
  let pointerOffset: ShockWaveSourceCursor["pointerOffset"];
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 7) { pointerOffset = 6; wait = age === 4 ? 1 : 0; }
  else if (age < 10) { pointerOffset = 9; wait = age === 7 ? 1 : 0; }
  else if (age < 13) { pointerOffset = 12; wait = age === 10 ? 1 : 0; }
  else if (age < 16) { pointerOffset = 14; wait = age === 13 ? 1 : 0; }
  else if (age < 31) { pointerOffset = 34; wait = 1; }
  else if (age < 45) { pointerOffset = 56; wait = Math.max(0, 43 - age); }
  else if (age < 77) { pointerOffset = 65; wait = Math.max(0, 75 - age); }
  else if (age < 91) { pointerOffset = 74; wait = Math.max(0, 89 - age); }
  else if (age < lightningStart) { pointerOffset = 74; wait = 1; }
  else if (age < shakeStart) { pointerOffset = 86; wait = 1; }
  else if (age < shakeStart + 6) { pointerOffset = 140; wait = Math.max(0, shakeStart + 4 - age); }
  else if (age < clearStart) { pointerOffset = 157; wait = 1; }
  else { pointerOffset = 161; wait = 1; }
  return { owner: "Move_SHOCK_WAVE", pointer: SHOCK_WAVE_SOURCE_START + pointerOffset, pointerOffset, active: age < cleanupAge, wait };
}

function sourceArgs(age: number, timing: ShockWaveTiming): ShockWaveState["animArgs"] {
  if (age < 16) return [0, 0, 0, 0, 0, 0, 0, 0];
  if (age < CHARGING_START) return [1, 2, 0, 4, 0, 0, 0, 0];
  if (age < timing.shakeStart) return [0, 20, 0, 2, 0, 0, 0, 0];
  if (age < timing.shakeStart + 6) return [4, 0, 16, 16, 0, 0, 0, 0];
  return [4, 0, 0, 0, 0, 0, 0, 0];
}

function allocateSlot(occupied: Set<number>): number {
  for (let slot = 0; slot < 64; slot += 1) if (!occupied.has(slot)) { occupied.add(slot); return slot; }
  throw new Error("Shock Wave exhausted the live sprite allocator");
}
interface Birth { readonly slot: number; readonly age: number; readonly end: number; readonly kind: "charging" | "orb" | "progressing" | "lightning" | "palette"; readonly x: number; readonly y: number; readonly tileOffset: number; }

function progressingTimeline(input: Readonly<ShockWaveLiveInputs>): { readonly taskByAge: Map<number, readonly number[]>; readonly births: readonly Omit<Birth, "slot">[] } {
  const taskByAge = new Map<number, readonly number[]>();
  const births: Array<Omit<Birth, "slot">> = [];
  const attackerX = input.attackerPictureOrigin.x;
  const attackerY = input.attackerPictureOrigin.y;
  const targetX = input.targetPictureOrigin.x;
  const panAttacker = input.attackerSide === "player" ? -64 : 63;
  const panTarget = input.targetSide === "player" ? -63 : 63;
  const d = words(1, 0, 0, 0, 7, -1, attackerX, attackerY, 4, truncDiv(targetX - attackerX, 5), targetX, 12, panAttacker, panTarget, panAttacker, truncDiv(panTarget - panAttacker, 3));
  const state = [...d];
  const live: Array<{ readonly age: number; readonly x: number; readonly y: number; readonly tileOffset: number }> = [];
  const timing = shockWaveTimingFor(input);
  const end = timing.lightningStart - 2;
  for (let age = PROGRESSING_START; age <= end; age += 1) {
    for (let index = live.length - 1; index >= 0; index -= 1) if (age - live[index]!.age > 12) { live.splice(index, 1); state[3] -= 1; }
    if (state[0] === 1) {
      state[1] += 1;
      if (state[1] > 0) {
        state[1] = 0;
        const tileOffset = state[4];
        births.push({ age, end: age + 12, kind: "progressing", x: state[6]!, y: state[7]!, tileOffset });
        live.push({ age, x: state[6]!, y: state[7]!, tileOffset }); state[3] += 1;
        state[4] += state[5]; if (state[4] < 0) state[4] = 7; if (state[4] > 7) state[4] = 0;
        if (state[4] === 0 && state[5]! > 0) state[14] += state[15]!;
        if ((state[5] < 0 && state[7]! <= state[8]!) || (state[5] > 0 && state[7]! >= state[8]!)) { state[2] += 1; state[6] += state[9]!; if (state[2] === 5) state[0] = 3; else state[0] += 1; }
        else state[7] += state[5]! * 8;
      }
      if (state[11]) state[11] -= 1;
    } else if (state[0] === 2) {
      if (state[11]) state[11] -= 1;
      state[1] += 1;
      if (state[1] > 4) {
        state[1] = 0;
        if ((state[2]! & 1) !== 0) { state[7] = 4; state[8] = 68; state[4] = 0; state[5] = 1; }
        else { state[7] = 68; state[8] = 4; state[4] = 7; state[5] = -1; }
        state[0] = state[11] ? 4 : 1;
      }
    } else if (state[0] === 4) {
      if (state[11]) state[11] -= 1; else state[0] = 1;
    }
    taskByAge.set(age, [...state]);
  }
  return { taskByAge, births };
}

function initialAllocator(input: Readonly<ShockWaveLiveInputs>, age: number): { readonly occupied: Set<number>; readonly births: Birth[] } {
  const timing = shockWaveTimingFor(input);
  const occupied = new Set(input.allocator.initialOccupiedSprites);
  const births: Birth[] = [];
  const progression = progressingTimeline(input);
  const pending: Array<Omit<Birth, "slot"> & { readonly priority: number; readonly requestedSlot?: number }> = [];
  // Creation order is source order.  The orb is created before the charging
  // task's age-45 callback on the shared frame.
  pending.push({ age: 16, end: 29, kind: "palette", x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, tileOffset: 0, priority: 0, requestedSlot: input.spriteSlots.paletteBlend });
  for (let index = 0; index < 20; index += 1) {
    const birthAge = CHARGING_START + index, duration = CHARGING_DURATIONS[index]!, [dx, dy] = CHARGING_OFFSETS[index % CHARGING_OFFSETS.length]!;
    pending.push({ age: birthAge, end: birthAge + duration + 8 - 1, kind: "charging", x: input.attackerPictureOrigin.x + dx, y: input.attackerPictureOrigin.y + dy, tileOffset: index, priority: birthAge === ORB_START ? 2 : 1 });
  }
  pending.push({ age: ORB_START, end: ORB_END, kind: "orb", x: input.attackerPictureOrigin.x, y: input.attackerPictureOrigin.y, tileOffset: 0, priority: 0, requestedSlot: input.spriteSlots.orb });
  pending.push(...progression.births.map((birth) => ({ ...birth, priority: 3 })));
  const lightningStart = timing.lightningStart;
  if (age >= lightningStart) {
    let y = input.targetBattlePosition.y + 32;
    while (y > 16) y -= 32;
    let birthAge = lightningStart + 1;
    while (y <= input.targetBattlePosition.y + 32 && birthAge <= age) {
      pending.push({ age: birthAge, end: birthAge + 29, kind: "lightning", x: input.targetPictureOrigin.x, y, tileOffset: 0, priority: 4 });
      y += 32; birthAge += 2;
    }
  }
  pending.sort((left, right) => left.age - right.age || left.priority - right.priority);
  for (const entry of pending) {
    if (entry.age > age) break;
    for (let index = births.length - 1; index >= 0; index -= 1) if (births[index]!.end < entry.age) { occupied.delete(births[index]!.slot); births.splice(index, 1); }
    const slot = entry.requestedSlot ?? allocateSlot(occupied);
    if (entry.requestedSlot !== undefined) { occupied.delete(slot); occupied.add(slot); }
    births.push({ slot, age: entry.age, end: entry.end, kind: entry.kind, x: entry.x, y: entry.y, tileOffset: entry.tileOffset });
  }
  return { occupied, births };
}

function sourceBirthsAtAge(age: number, input: Readonly<ShockWaveLiveInputs>): Birth[] {
  const births = initialAllocator(input, age).births;
  return births.filter((birth) => birth.age <= age && birth.end >= age);
}
function chargingSprite(birth: Birth, age: number, input: Readonly<ShockWaveLiveInputs>): ShockWaveChargingSprite {
  const local = age - birth.age;
  const duration = CHARGING_DURATIONS[birth.tileOffset]!;
  const steps = Math.max(0, local - 7);
  const dx = signedFixedDelta(birth.x, input.attackerPictureOrigin.x, duration);
  const dy = signedFixedDelta(birth.y, input.attackerPictureOrigin.y, duration);
  const accumX = dx * steps, accumY = dy * steps;
  let animNum = 0, animCmdIndex = local < 2 ? 0 : local === 2 ? 1 : local === 3 ? 2 : 3, animDelayCounter = 0;
  let callback: ShockWaveChargingSprite["callback"] = "RunStoredCallbackWhenAnimEnds";
  if (local >= 7) { animNum = 1; animCmdIndex = Math.min(3, Math.floor((local - 7) / 5)); animDelayCounter = animCmdIndex === 3 && local - 7 >= 20 ? 0 : 4 - ((local - 7) % 5); callback = "AnimElectricChargingParticles_Step"; }
  else if (local === 6) callback = "AnimElectricChargingParticles";
  const tile = (input.oam.charging[2] & 0x3ff) - 3 + (animNum === 0 ? Math.max(0, 3 - Math.max(0, local - 1)) : animCmdIndex);
  const attr: ShockWaveOam = local === 0 ? [0, 0, (input.oam.charging[2] & ~0x3ff) | tile] : [(birth.y + offsetFromFixed(dy, accumY) - 4) & 255, (birth.x + offsetFromFixed(dx, accumX) - 4) & 511, (input.oam.charging[2] & ~0x3ff) | tile];
  return { kind: "charging", slot: birth.slot, template: "gElectricChargingParticlesSpriteTemplate", callback, birthAge: birth.age, x: birth.x, y: birth.y, x2: offsetFromFixed(dx, accumX), y2: offsetFromFixed(dy, accumY), attr, subpriority: 2, oamPriority: (input.oam.charging[2] >>> 10) & 3, matrixNum: 0, matrix: IDENTITY, flags: 1, data: words(duration - steps, dx, dy, accumX, accumY, 0, -21311, 2064), animNum, animCmdIndex, animDelayCounter, sourceCreationOrder: birth.age };
}
function affineScale(local: number): number {
  if (local < 30) return 24 + local * 8;
  if (local < 60) return 256 - (local - 29) * 8;
  return 16;
}
function orbSprite(birth: Birth, age: number, input: Readonly<ShockWaveLiveInputs>): ShockWaveOrbSprite {
  const scale = affineScale(age - birth.age), reciprocal = Math.floor(0x10000 / scale);
  return { kind: "orb", slot: birth.slot, template: "gGrowingShockWaveOrbSpriteTemplate", callback: "AnimGrowingShockWaveOrb", affine: "sAffineAnim_GrowingElectricOrb", birthAge: 45, x: birth.x, y: birth.y, x2: 0, y2: 0, attr: input.oam.orb, subpriority: input.attackerSprite.subpriority - 2, oamPriority: (input.oam.orb[2] >>> 10) & 3, matrixNum: input.matrixSlots.orb, matrix: [reciprocal, 0, 0, reciprocal], flags: 1, data: words(1), animNum: 0, animCmdIndex: 0, animDelayCounter: 0, sourceCreationOrder: birth.age };
}
function progressingSprite(birth: Birth, age: number, input: Readonly<ShockWaveLiveInputs>): ShockWaveProgressingSprite {
  const local = age - birth.age;
  const baseTile = (input.oam.progressing[2] & 0x3ff) - 7;
  const attr: ShockWaveOam = local === 0 ? [0, 0, (input.oam.progressing[2] & ~0x3ff) | (baseTile + birth.tileOffset)] : [(birth.y - 4) & 255, (birth.x - 4) & 511, (input.oam.progressing[2] & ~0x3ff) | (baseTile + birth.tileOffset)];
  return { kind: "progressing", slot: birth.slot, template: "gShockWaveProgressingBoltSpriteTemplate", callback: "AnimShockWaveProgressingBolt", birthAge: birth.age, x: birth.x, y: birth.y, x2: 0, y2: 0, attr, subpriority: 35, oamPriority: (input.oam.progressing[2] >>> 10) & 3, matrixNum: 0, matrix: IDENTITY, flags: 1, data: words(local, 0, 0, 0, 0, 0, 2, 3), animNum: 0, animCmdIndex: 0, animDelayCounter: 0, sourceCreationOrder: birth.age };
}
function lightningFrame(local: number): readonly [number, number] {
  const durations = [6, 5, 8, 5, 6]; const starts = [0, 6, 11, 19, 24];
  const firstDelays = [4, 4, 7, 4, 4];
  for (let index = 0; index < durations.length; index += 1) {
    const start = starts[index]!, duration = durations[index]!;
    if (local < start + duration) {
      const firstDelay = index === 0 && local === 0 ? 0 : firstDelays[index]!;
      const elapsed = index === 0 ? Math.max(0, local - 1) : local - start;
      return [index, Math.max(0, firstDelay - elapsed)];
    }
  }
  return [4, 0];
}
function lightningSprite(birth: Birth, age: number, input: Readonly<ShockWaveLiveInputs>): ShockWaveLightningSprite {
  const [frame, delay] = lightningFrame(age - birth.age);
  const tile = (input.oam.lightning[2] & 0x3ff) + frame * 16;
  const attr: ShockWaveOam = age === birth.age ? [0, 0x8000, (input.oam.lightning[2] & ~0x3ff) | tile] : [(birth.y - 16) & 255, 0x8000 + ((birth.x - 16) & 511), (input.oam.lightning[2] & ~0x3ff) | tile];
  return { kind: "lightning", slot: birth.slot, template: "gLightningSpriteTemplate", callback: "AnimShockWaveLightning", birthAge: birth.age, x: birth.x, y: birth.y, x2: 0, y2: 0, attr, subpriority: input.targetSprite.subpriority - 2, oamPriority: (input.oam.lightning[2] >>> 10) & 3, matrixNum: 0, matrix: IDENTITY, flags: 1, data: words(0, 0, 0, 0, 0, 0, 0, 10), animNum: 0, animCmdIndex: frame, animDelayCounter: delay, sourceCreationOrder: birth.age };
}
function paletteSprite(age: number, input: Readonly<ShockWaveLiveInputs>): ShockWavePaletteSprite | null {
  if (age < 16 || age > 29) return null;
  return { kind: "palette-blend", slot: input.spriteSlots.paletteBlend, template: "gSimplePaletteBlendSpriteTemplate", callback: "AnimSimplePaletteBlend_Step", birthAge: 16, x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, x2: 0, y2: 0, attr: input.oam.paletteBlend, subpriority: input.attackerSprite.subpriority - 2, oamPriority: (input.oam.paletteBlend[2] >>> 10) & 3, matrixNum: 0, matrix: IDENTITY, flags: 5, data: words(), animNum: 0, animCmdIndex: 0, animDelayCounter: 0, sourceCreationOrder: 16 };
}

function progressingTaskAt(age: number, input: Readonly<ShockWaveLiveInputs>): ShockWaveTask | null {
  if (age < PROGRESSING_START || age > shockWaveTimingFor(input).lightningStart - 2) return null;
  const timeline = progressingTimeline(input).taskByAge.get(age);
  return timeline ? { slot: input.taskSlots.progressing, callback: "AnimTask_ShockWaveProgressingBolt", role: "progressing", data: timeline } : null;
}
function tasksAt(age: number, input: Readonly<ShockWaveLiveInputs>): ShockWaveTask[] {
  const timing = shockWaveTimingFor(input);
  const tasks: ShockWaveTask[] = [];
  const chargingIndex = Math.min(20, Math.max(0, age - CHARGING_START + 1));
  const chargingActive = CHARGING_DURATIONS.reduce((count, duration, index) => {
    const birthAge = CHARGING_START + index;
    return count + Number(birthAge <= age && age <= birthAge + duration + 8 - 1);
  }, 0);
  if (age >= CHARGING_START && chargingActive > 0) tasks.push({ slot: input.taskSlots.charging, callback: "AnimTask_ElectricChargingParticles_Step", role: "charging", data: words(0, 0, 0, 0, 0, 0, 20 - chargingIndex, chargingActive, Math.min(6, Math.floor(chargingIndex / 2)), chargingIndex < 20 ? chargingIndex % 16 : 4, chargingIndex < 20 ? chargingIndex % 2 : 0, 2, 0, 0, input.attackerPictureOrigin.x, input.attackerPictureOrigin.y) });
  const progression = progressingTaskAt(age, input); if (progression) tasks.push(progression);
  const lightningStart = timing.lightningStart;
  const lightningEnd = timing.shakeStart - 2;
  if (age >= lightningStart && age <= lightningEnd) {
    const local = age - lightningStart;
    const count = Math.floor((local + 1) / 2);
    const targetY = input.targetBattlePosition.y + 32;
    let firstY = targetY; while (firstY > 16) firstY -= 32;
    const maximum = Math.floor((targetY - firstY) / 32) + 1;
    const created = Math.min(count, maximum);
    const liveLightning = Array.from({ length: created }, (_, index) => lightningStart + 1 + index * 2)
      .filter((birthAge) => age <= birthAge + 29).length;
    const data14 = firstY + created * 32 >= targetY ? targetY : firstY + created * 32;
    const state = created >= maximum ? 2 : 1;
    // The source task resets data[1] as it enters its terminal state.  The
    // retained rows are the contract here: after the third bolt is created,
    // data[1] stays zero while the task waits for its live sprites to finish.
    tasks.push({ slot: input.taskSlots.lightning, callback: "AnimTask_ShockWaveLightning", role: "lightning", data: words(state, state === 2 ? 0 : local === 0 ? 1 : local % 2 === 0 ? 1 : 0, 0, 0, 0, 0, 0, 0, 0, 0, liveLightning, 0, input.targetSprite.subpriority - 2, input.targetPictureOrigin.x, data14, targetY) });
  }
  if (age >= timing.shakeStart && age <= timing.shakeStart + 33) { const local = age - timing.shakeStart; tasks.push({ slot: input.taskSlots.shake, callback: "AnimTask_ShakeMon_Step", role: "shake", data: words(input.targetSprite.slot, 17 - Math.floor(local / 2), 1, local % 2 === 0 ? 1 : 0, 0, 6) }); }
  if (age >= timing.shakeStart && age <= timing.clearStart - 2) { const local = age - timing.shakeStart; tasks.push({ slot: input.taskSlots.blend, callback: "AnimTask_BlendSpriteColor_Step2", role: "blend", data: words(14, 0, 3, 16, 0, 32767, 0, 0, 0, (local + 2) % 4, Math.max(0, 16 - Math.floor((local + 2) / 4)), 0) }); }
  if (age >= 13 && age <= timing.cleanupAge - 2) {
    const mode = input.attackerSide === "player" ? 6 : 8;
    tasks.push({ slot: input.taskSlots.monbg, callback: "Task_UpdateMonBg", role: "monbg", data: words(mode, input.attackerSprite.x, input.attackerSprite.y, input.background.setupX, input.background.setupValue, input.attackerSide === "player" ? 1 : 0, input.attackerSide === "player" ? 0 : 1) });
  }
  if (age >= timing.clearStart && age <= timing.clearStart + 2) tasks.push({ slot: input.taskSlots.clear, callback: "Task_ClearMonBg", role: "clear", data: words(0, Math.min(2, age - timing.clearStart + 1), input.attackerSide === "opponent" ? 1 : 0) });
  return tasks.sort((left, right) => left.slot - right.slot || left.callback.localeCompare(right.callback));
}

function paletteAtAge(age: number, input: Readonly<ShockWaveLiveInputs>, timing: ShockWaveTiming): { readonly faded: readonly number[]; readonly simple: number; readonly target: number } {
  const faded = input.palettes.faded.slice();
  const loaded = [input.resources.electricOrbs, input.resources.circleOfLight, input.resources.spark, input.resources.lightning];
  const resourceStarts = [1, 4, 7, 10];
  for (let index = 0; index < loaded.length; index += 1) if (age >= resourceStarts[index]! && age < timing.cleanupAge && loaded[index]!.palette) replaceBank(faded, loaded[index]!.paletteBank, loaded[index]!.palette!);
  const simple = age < 19 ? 0 : age < 23 ? 2 : age < timing.shakeStart + 2 ? 4 : 0;
  const target = age >= timing.shakeStart && age < timing.shakeStart + 6 ? 16 : 0;
  if (simple > 0) for (const bank of [1, 2, 3]) replaceBank(faded, bank, paletteBank(input.palettes.unfaded, bank).map((color) => blendColor(color, 0, simple)));
  if (target === 16) replaceBank(faded, input.targetSprite.attr[2] >>> 12 & 0xf, Array.from({ length: 16 }, () => 0));
  return { faded, simple, target };
}
function hardwarePaletteAtAge(age: number, input: Readonly<ShockWaveLiveInputs>, timing: ShockWaveTiming): readonly number[] {
  if (age === 0) return input.palettes.hardware.slice();
  const current = paletteAtAge(age, input, timing), previous = paletteAtAge(age - 1, input, timing);
  const hardware = previous.faded.slice();
  if (age === 13) return current.faded.slice();
  if (age === timing.shakeStart || age === timing.shakeStart + 6) return previous.faded.slice();
  return hardware;
}

function painterOrder(age: number, input: Readonly<ShockWaveLiveInputs>, sprites: readonly ShockWaveSprite[]): readonly number[] {
  const order = input.allocator.spriteOrder.filter((slot) => !sprites.some((sprite) => sprite.slot === slot));
  const transient = sprites.slice().sort((left, right) => left.sourceCreationOrder - right.sourceCreationOrder || left.slot - right.slot);
  return [...order, ...transient.map((sprite) => sprite.slot)];
}
function spriteForBirth(birth: Birth, age: number, input: Readonly<ShockWaveLiveInputs>): ShockWaveSprite {
  if (birth.kind === "palette") return paletteSprite(age, input)!;
  if (birth.kind === "charging") return chargingSprite(birth, age, input);
  if (birth.kind === "orb") return orbSprite(birth, age, input);
  if (birth.kind === "progressing") return progressingSprite(birth, age, input);
  return lightningSprite(birth, age, input);
}
function battlerAtAge(age: number, input: Readonly<ShockWaveLiveInputs>, timing: ShockWaveTiming): { readonly attacker: ShockWaveBattlerSprite; readonly target: ShockWaveBattlerSprite } {
  // ShakeMon's first visible write starts two source rows after task setup.
  const local = age - timing.shakeStart;
  const y2 = local >= 2 && local < 34 && Math.floor((local - 2) / 2) % 2 === 0 ? 6 : 0;
  return { attacker: { ...input.attackerSprite }, target: { ...input.targetSprite, x2: 0, y2 } };
}

/** Reduce one source-relative age of the complete Shock Wave root. */
export function shockWaveAtAge(age: number, input: Readonly<ShockWaveLiveInputs>): ShockWaveState {
  assertAge(age); assertInputs(input);
  const timing = shockWaveTimingFor(input), source = shockWaveSourceAtAge(age, timing.lightningStart), active = source.active;
  const sourceSprites = sourceBirthsAtAge(age, input).map((birth) => spriteForBirth(birth, age, input));
  const matrix = age >= ORB_START && age <= ORB_END ? [Math.floor(0x10000 / affineScale(age - ORB_START)), 0, 0, Math.floor(0x10000 / affineScale(age - ORB_START))] as ShockWaveMatrix : IDENTITY;
  const sprites = sourceSprites.map((sprite) => sprite.matrixNum === input.matrixSlots.orb ? { ...sprite, matrix } : sprite).sort((left, right) => left.slot - right.slot);
  const tasks = tasksAt(age, input);
  const battlerState = battlerAtAge(age, input, timing);
  const battlers = { attacker: { ...battlerState.attacker, matrix }, target: { ...battlerState.target, matrix } };
  const palette = paletteAtAge(age, input, timing);
  const faded = active ? palette.faded : input.palettes.faded.slice();
  const hardware = active ? hardwarePaletteAtAge(age, input, timing) : input.palettes.faded.slice();
  const values = { ...input.background.values };
  if (age >= 13 && age < timing.cleanupAge - 1) values[input.background.key] = input.background.setupValue;
  if (age >= timing.cleanupAge - 1) values[input.background.key] = input.background.clearValue;
  const registers = { ...input.registers };
  if (age >= 16 && age < timing.clearStart) { registers.bldcnt = 16192; registers.bldalpha = 2060; }
  if (age >= timing.clearStart) { registers.bldcnt = 0; registers.bldalpha = 0; registers[input.background.register] = 0; }
  if (age >= 14 && age < timing.cleanupAge) registers[input.background.register] = (input.background.setupValue + 512) % 512;
  const loaded = (name: keyof typeof SHOCK_WAVE_RESOURCE_TAGS, resource: ShockWaveResourceAllocation): ShockWaveResourceAllocation & { readonly loaded: boolean } => ({ ...resource, loaded: active && age >= ({ electricOrbs: 1, circleOfLight: 4, spark: 7, lightning: 10 } as const)[name] && age < timing.cleanupAge });
  const resourceTags = { circleOfLight: loaded("circleOfLight", input.resources.circleOfLight), electricOrbs: loaded("electricOrbs", input.resources.electricOrbs), spark: loaded("spark", input.resources.spark), lightning: loaded("lightning", input.resources.lightning) };
  const matrixBitmap = age >= ORB_START && age <= ORB_END ? input.allocator.initialMatrixBitmap | (1 << input.matrixSlots.orb) : input.allocator.initialMatrixBitmap;
  const monbgVram = age < 14 ? input.background.vram : age < timing.cleanupAge - 2 ? input.background.setupVram : input.background.clearVram;
  const audio: ShockWaveState["audio"] = [];
  if (age === CHARGING_START) audio.push({ sound: "se_m_charge", pan: input.attackerSide === "player" ? -64 : 63 });
  const lightningStart = timing.lightningStart;
  if (age === lightningStart) audio.push({ sound: "se_m_tri_attack2", pan: input.targetSide === "player" ? -63 : 63 });
  if (sprites.some((sprite) => sprite.kind === "progressing" && sprite.birthAge === age)) audio.push({ sound: "se_m_thunderbolt", pan: input.attackerSide === "player" ? -64 : 63 });
  return {
    age, active, source, animArgs: sourceArgs(age, timing),
    battlers: { attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: battlers.attacker }, target: { side: input.targetSide, species: input.targetSpecies, sprite: battlers.target, shake: { x: 0, y: battlers.target.y2 }, displayedShake: { x: 0, y: battlers.target.y2 } } },
    sprites, tasks,
    resources: { tags: resourceTags, matrixBitmap },
    palette: { faded, hardware, banks: [1, 2, 3, input.attackerSprite.attr[2] >>> 12 & 0xf, input.targetSprite.attr[2] >>> 12 & 0xf], simpleBlendCoefficient: palette.simple, targetBlendCoefficient: palette.target },
    background: { values, vram: monbgVram }, registers,
    displayTransfer: { oam: age === 0 ? "initial" : "preceding-software", matrices: age === 0 ? "initial" : "preceding-software", palette: age === 0 ? "initial" : age === 13 ? "same-row-monbg-setup" : "preceding-faded", selectedBackground: age >= 14 ? "visible-after-age-14" : "initial" },
    painterOrder: painterOrder(age, input, sprites),
    audio,
    rng: { animation: animationRngAtAge(input.animationRngSeed, age, timing.cleanupAge), sourceDraws: age, gameplay: input.gameplayRng, gameplayUnchanged: true },
    cleanup: { firstInactive: age === timing.cleanupAge, visualTasks: Number(tasks.some((task) => task.role === "charging")) + Number(sprites.some((sprite) => sprite.kind === "orb")) + Number(tasks.some((task) => task.role === "progressing")) + Number(tasks.some((task) => task.role === "lightning")) + Number(sprites.some((sprite) => sprite.kind === "palette-blend")) + Number(tasks.some((task) => task.role === "shake")) + Number(tasks.some((task) => task.role === "blend")), soundTasks: 0, ownedSprites: sprites.length, resourcesReleased: age >= timing.cleanupAge },
  };
}
