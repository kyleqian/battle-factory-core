/**
 * Pure source-age presentation reduction for `Move_SNORE`.
 *
 * Only Scene-ON presentation inputs cross this boundary. Damage, sleep
 * legality, turn state, and gameplay RNG remain opaque and unchanged.
 */

export type SnoreSide = "player" | "opponent";
export type SnoreOam = readonly [number, number, number];
export type SnoreMatrix = readonly [number, number, number, number];
export interface SnorePoint { readonly x: number; readonly y: number; }

export interface SnoreBattlerSprite {
  readonly slot: number; readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number; readonly attr: SnoreOam;
  readonly subpriority: number; readonly oamPriority: number;
  readonly matrixNum: number; readonly matrix: SnoreMatrix; readonly flags: number;
  readonly animNum: number; readonly animCmdIndex: number; readonly animDelayCounter: number;
  readonly data: readonly number[];
}
export interface SnoreSpriteAllocation {
  readonly slot: number; readonly attr: SnoreOam; readonly subpriority: number;
  readonly oamPriority: number; readonly flags: number;
}
export interface SnoreResourceAllocation {
  readonly tag: 10197; readonly tileSlot: number; readonly paletteAllocatorSlot: number;
  readonly paletteBank: number; readonly tileRange: readonly [number, number];
  readonly palette: readonly number[];
}
export interface SnoreOrderKey {
  readonly slot: number; readonly subpriority: number; readonly oamPriority: number; readonly oamY: number;
}
export interface SnoreLiveInputs {
  readonly attackerSide: SnoreSide; readonly targetSide: SnoreSide;
  readonly attackerSpecies: string; readonly targetSpecies: string;
  readonly attackerPictureOrigin: Readonly<SnorePoint>;
  readonly targetPictureOrigin: Readonly<SnorePoint>;
  readonly attackerSprite: Readonly<SnoreBattlerSprite>;
  readonly targetSprite: Readonly<SnoreBattlerSprite>;
  readonly taskSlots: Readonly<{ readonly scale: number; readonly monbg: number; readonly targetShake: number; readonly clearMonbg: number }>;
  readonly effectAllocations: readonly Readonly<{
    readonly platform: Readonly<SnoreSpriteAllocation>;
    readonly z: readonly Readonly<SnoreSpriteAllocation>[];
  }>[];
  readonly scaleMatrixNum: number;
  readonly resource: Readonly<SnoreResourceAllocation>;
  readonly allocator: Readonly<{ readonly matrixBitmap: number; readonly spriteOrder: readonly number[]; readonly activeOrderKeys: readonly Readonly<SnoreOrderKey>[] }>;
  readonly palettes: Readonly<{ readonly unfaded: readonly number[]; readonly faded: readonly number[]; readonly hardware: readonly number[] }>;
  readonly background: Readonly<{
    readonly values: Readonly<Record<string, number>>; readonly registers: Readonly<Record<string, number>>;
    readonly monbg: Readonly<{ readonly bg: 1 | 2; readonly activeCnt: number; readonly paletteBank: number }>;
  }>;
  readonly animationRngSeed: number;
  readonly gameplayRng: unknown; readonly gameplayState?: unknown;
}

export const SNORE_SOURCE_START = 0x082cff5d;
export const SNORE_SOURCE_END_EXCLUSIVE = 0x082cffed;
export const SNORE_FIRST_INACTIVE_AGE = 69;
export const SNORE_Z_TAG = 10197;
const EFFECT_STARTS = [7, 39] as const;
const IDENTITY: SnoreMatrix = [256, 0, 0, 256];

export interface SnoreSourceCursor {
  readonly owner: "Move_SNORE"; readonly pointer: number; readonly pointerOffset: 0 | 3 | 5 | 15 | 20 | 24;
  readonly wait: number; readonly active: boolean;
}
export interface SnoreTask { readonly slot: number; readonly callback: "Task_UpdateMonBg" | "Task_ClearMonBg" | "AnimTask_ScaleMonAndRestore_Step" | "AnimTask_ShakeMon2_Step"; readonly data: readonly number[]; }
export interface SnoreZSprite {
  readonly slot: number; readonly template: "gSnoreZSpriteTemplate";
  readonly callback: "AnimTranslateLinear_WithFollowup" | "DestroyAnimSprite";
  readonly attr: SnoreOam; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly subpriority: number; readonly oamPriority: number; readonly matrixNum: 0; readonly matrix: SnoreMatrix;
  readonly flags: number; readonly data: readonly number[]; readonly animNum: 0; readonly animCmdIndex: 0; readonly animDelayCounter: 0;
}
export interface SnorePlatformSprite {
  readonly slot: number; readonly template: "gShakeMonOrPlatformSpriteTemplate"; readonly callback: "AnimShakeMonOrBattlePlatforms_Step";
  readonly attr: SnoreOam; readonly x: number; readonly y: number; readonly x2: 0; readonly y2: 0;
  readonly subpriority: number; readonly oamPriority: number; readonly matrixNum: 0; readonly matrix: SnoreMatrix;
  readonly flags: number; readonly data: readonly number[];
}

function words(...values: number[]): number[] { return [...values, ...Array.from({ length: Math.max(0, 16 - values.length) }, () => 0)].slice(0, 16); }
function u32(value: number): number { return value >>> 0; }
function nextRng(value: number): number { return u32(Math.imul(value, 0x41c64e6d) + 0x6073); }
function rngDrawsAtAge(age: number): number { return age - Number(age >= 67) - Number(age >= 68); }
function rngAtAge(seed: number, age: number): number { let value = u32(seed); for (let i = 0; i < rngDrawsAtAge(age); i += 1) value = nextRng(value); return value; }
function signed8(value: number): number { const byte = value & 0xff; return byte >= 128 ? byte - 256 : byte; }
function effectAtAge(age: number): { call: 1 | 2; start: number; local: number } | null {
  for (const [index, start] of EFFECT_STARTS.entries()) if (age >= start && age <= start + 24) return { call: (index + 1) as 1 | 2, start, local: age - start };
  return null;
}
function latestEffectLocal(age: number): number | null { const start = [...EFFECT_STARTS].reverse().find((value) => age >= value); return start === undefined ? null : age - start; }

function assertInputs(age: number, input: Readonly<SnoreLiveInputs>): void {
  if (!Number.isInteger(age) || age < 0 || age > SNORE_FIRST_INACTIVE_AGE) throw new Error(`MOVE_SNORE age must be an integer in [0, ${SNORE_FIRST_INACTIVE_AGE}], got ${age}`);
  if (input.attackerSide === input.targetSide) throw new Error("MOVE_SNORE needs opposing live battler sides");
  if (input.effectAllocations.length !== 2 || input.effectAllocations.some((entry) => entry.z.length !== 3)) throw new Error("MOVE_SNORE needs two complete live SnoreEffect allocations");
  if (input.resource.tag !== SNORE_Z_TAG || input.resource.palette.length !== 16) throw new Error("MOVE_SNORE needs the live ANIM_TAG_SNORE_Z allocation");
  if (input.allocator.spriteOrder.length !== 64 || new Set(input.allocator.spriteOrder).size !== 64) throw new Error("MOVE_SNORE needs the live 64-slot painter order");
}

export function snoreSourceAtAge(age: number): SnoreSourceCursor {
  if (!Number.isInteger(age) || age < 0 || age > SNORE_FIRST_INACTIVE_AGE) throw new Error(`invalid Snore source age ${age}`);
  let pointerOffset: SnoreSourceCursor["pointerOffset"], wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 7) { pointerOffset = 5; wait = age === 4 ? 1 : 0; }
  else if (age < 39) { pointerOffset = 15; wait = Math.max(0, 37 - age); }
  else if (age < 65) { pointerOffset = 20; wait = 1; }
  else { pointerOffset = 24; wait = 1; }
  return { owner: "Move_SNORE", pointer: SNORE_SOURCE_START + pointerOffset, pointerOffset, wait, active: age < SNORE_FIRST_INACTIVE_AGE };
}

function scaleTask(local: number, input: Readonly<SnoreLiveInputs>): SnoreTask {
  const shrinking = local <= 5;
  const scale = local <= 6 ? 256 - 7 * (local + 1) : 207 + 7 * (local - 6);
  return { slot: input.taskSlots.scale, callback: "AnimTask_ScaleMonAndRestore_Step", data: words(shrinking ? -7 : 7, shrinking ? -7 : 7, shrinking ? 6 - local : 13 - local, shrinking ? 7 : 0, input.attackerSprite.slot, 0, 0, 0, 0, 0, scale, scale) };
}
function shakeX(local: number): number { return local >= 12 ? 0 : (Math.floor(local / 2) % 2 === 0 ? -4 : 4); }
function shakeTask(local: number, input: Readonly<SnoreLiveInputs>): SnoreTask {
  return { slot: input.taskSlots.targetShake, callback: "AnimTask_ShakeMon2_Step", data: words(input.targetSprite.slot, 6 - Math.floor(local / 2), 1, local % 2 === 0 ? 1 : 0, 4) };
}
function monbgTask(input: Readonly<SnoreLiveInputs>): SnoreTask {
  const sprite = input.attackerSprite;
  return { slot: input.taskSlots.monbg, callback: "Task_UpdateMonBg", data: words(sprite.slot, sprite.x + sprite.x2, sprite.y + sprite.y2, -sprite.x - sprite.x2 + 32, -sprite.y - sprite.y2 + 32, input.background.monbg.bg === 2 ? 1 : 0, input.attackerSide === "opponent" ? 1 : 0) };
}
function tasksAtAge(age: number, input: Readonly<SnoreLiveInputs>): SnoreTask[] {
  const tasks: SnoreTask[] = [];
  const effect = effectAtAge(age);
  if (effect && effect.local <= 12) tasks.push(scaleTask(effect.local, input));
  if (age >= 4 && age <= 67) tasks.push(monbgTask(input));
  if (effect && effect.local <= 11) tasks.push(shakeTask(effect.local, input));
  if (age >= 65 && age <= 67) tasks.push({ slot: input.taskSlots.clearMonbg, callback: "Task_ClearMonBg", data: words(0, Math.min(2, age - 64), input.attackerSide === "opponent" ? 1 : 0) });
  return tasks.sort((a, b) => a.slot - b.slot);
}

function delta(target: number): number { const value = Math.trunc(Math.abs(target) * 256 / 24) & ~1; return target < 0 ? value | 1 : value; }
function displacement(encoded: number, accumulator: number): number { return (encoded & 1) !== 0 ? -(accumulator >> 8) : accumulator >> 8; }
function zSpritesAtAge(age: number, input: Readonly<SnoreLiveInputs>): SnoreZSprite[] {
  const effect = effectAtAge(age); if (!effect) return [];
  const allocations = input.effectAllocations[effect.call - 1]!.z;
  const sign = input.attackerSide === "player" ? 1 : -1;
  const targets = [[-42 * sign, -38], [0, -42], [42 * sign, -38]] as const;
  return targets.map(([targetX, targetY], index) => {
    const allocation = allocations[index]!, xDelta = delta(targetX), yDelta = delta(targetY);
    const steps = Math.min(effect.local + 1, 24), xAccum = xDelta * steps, yAccum = yDelta * steps;
    const x2 = displacement(xDelta, xAccum), y2 = displacement(yDelta, yAccum);
    const attr: SnoreOam = [
      (allocation.attr[0] & ~0xff) | ((input.attackerPictureOrigin.y + y2 - 16) & 0xff),
      (allocation.attr[1] & ~0x1ff) | ((input.attackerPictureOrigin.x + x2 - 16) & 0x1ff), allocation.attr[2],
    ];
    return { slot: allocation.slot, template: "gSnoreZSpriteTemplate", callback: effect.local === 24 ? "DestroyAnimSprite" : "AnimTranslateLinear_WithFollowup", attr,
      x: input.attackerPictureOrigin.x, y: input.attackerPictureOrigin.y, x2, y2, subpriority: allocation.subpriority, oamPriority: allocation.oamPriority,
      matrixNum: 0, matrix: IDENTITY, flags: allocation.flags, data: [Math.max(0, 23 - effect.local), xDelta, yDelta, xAccum, yAccum, 0, 15357, 2058], animNum: 0, animCmdIndex: 0, animDelayCounter: 0 };
  });
}
function platformAtAge(age: number, input: Readonly<SnoreLiveInputs>): SnorePlatformSprite | null {
  const effect = effectAtAge(age); if (!effect || effect.local > 13) return null;
  const allocation = input.effectAllocations[effect.call - 1]!.platform;
  const pair = Math.floor((effect.local + 1) / 2), velocity = pair % 2 === 0 ? -6 : 6;
  return { slot: allocation.slot, template: "gShakeMonOrPlatformSpriteTemplate", callback: "AnimShakeMonOrBattlePlatforms_Step", attr: allocation.attr,
    x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, x2: 0, y2: 0, subpriority: allocation.subpriority, oamPriority: allocation.oamPriority,
    matrixNum: 0, matrix: IDENTITY, flags: allocation.flags, data: [velocity, effect.local % 2, 1, 13 - effect.local, 0, 0, 11808, 514] };
}

function battlersAtAge(age: number, input: Readonly<SnoreLiveInputs>) {
  const local = latestEffectLocal(age);
  let attacker = { ...input.attackerSprite, flags: age >= 4 && age < 7 ? input.attackerSprite.flags | 4 : input.attackerSprite.flags };
  if (local !== null && local <= 13) {
    const matrix = local <= 12 ? 256 - 7 * (local <= 6 ? local + 1 : 13 - local) : 256;
    const attr0 = local <= 12 ? ((input.attackerSprite.attr[0] - 32) & 0xff) | 0x700 : ((input.attackerSprite.attr[0] - 32) & 0xff) | 0x100;
    const x = input.attackerSprite.attr[1] & 0x1ff;
    const attr1 = (input.attackerSprite.attr[1] & ~0x3fff) | (input.scaleMatrixNum << 9) | ((local <= 12 ? x - 32 : x) & 0x1ff);
    attacker = { ...attacker, attr: [attr0, attr1, input.attackerSprite.attr[2]] as SnoreOam, matrixNum: input.scaleMatrixNum, matrix: [matrix, 0, 0, matrix] as SnoreMatrix, flags: input.attackerSprite.flags, animDelayCounter: local <= 12 ? 128 : 0 };
  } else if (local !== null) {
    attacker = { ...attacker, attr: [(input.attackerSprite.attr[0] & 0xff) | 0x100, (input.attackerSprite.attr[1] & ~0x3fff) | (input.scaleMatrixNum << 9) | (input.attackerSprite.attr[1] & 0x1ff), input.attackerSprite.attr[2]], matrixNum: input.scaleMatrixNum, matrix: IDENTITY, flags: input.attackerSprite.flags, animDelayCounter: 0 };
  }
  const effect = effectAtAge(age), targetX2 = effect && effect.local <= 12 ? shakeX(effect.local) : 0;
  const target = { ...input.targetSprite, x2: targetX2, attr: [input.targetSprite.attr[0], (input.targetSprite.attr[1] - targetX2) & 0xffff, input.targetSprite.attr[2]] as SnoreOam };
  return { attacker: { side: input.attackerSide, species: input.attackerSpecies, pictureOrigin: input.attackerPictureOrigin, sprite: attacker }, target: { side: input.targetSide, species: input.targetSpecies, pictureOrigin: input.targetPictureOrigin, sprite: target } };
}

function painterOrderAtAge(age: number, input: Readonly<SnoreLiveInputs>): readonly number[] {
  let order = [...input.allocator.spriteOrder];
  for (let current = 0; current <= age; current += 1) {
    const z = zSpritesAtAge(current, input), platform = platformAtAge(current, input);
    const transient = [...z, ...(platform ? [platform] : [])];
    const transientSlots = new Set(transient.map((sprite) => sprite.slot));
    const keys = new Map<number, { priority: number; subpriority: number; y: number }>();
    for (const entry of input.allocator.activeOrderKeys) if (!transientSlots.has(entry.slot)) keys.set(entry.slot, { priority: entry.oamPriority, subpriority: entry.subpriority, y: signed8(entry.oamY) });
    for (const sprite of transient) keys.set(sprite.slot, { priority: sprite.oamPriority, subpriority: sprite.subpriority, y: signed8(sprite.attr[0]) });
    order.sort((left, right) => {
      const a = keys.get(left), b = keys.get(right); if (!a && !b) return 0; if (!a) return 1; if (!b) return -1;
      return (a.subpriority | (a.priority << 8)) - (b.subpriority | (b.priority << 8)) || b.y - a.y;
    });
  }
  return order;
}

function paletteAtAge(age: number, input: Readonly<SnoreLiveInputs>) {
  const unfaded = input.palettes.unfaded.slice(), faded = input.palettes.faded.slice(), hardware = input.palettes.hardware.slice();
  const start = input.resource.paletteBank * 16;
  if (age >= 1) { unfaded.splice(start, 16, ...input.resource.palette); faded.splice(start, 16, ...input.resource.palette); }
  if (age >= 2) hardware.splice(start, 16, ...input.resource.palette);
  if (age >= 4) {
    const attackerBank = 16 + ((input.attackerSprite.attr[2] >>> 12) & 0xf);
    const source = input.palettes.unfaded.slice(attackerBank * 16, attackerBank * 16 + 16);
    const monbgStart = input.background.monbg.paletteBank * 16;
    unfaded.splice(monbgStart, 16, ...source); faded.splice(monbgStart, 16, ...source); hardware.splice(monbgStart, 16, ...source);
  }
  return { unfaded, faded, hardware, bank: input.resource.paletteBank, transfer: age === 0 ? "initial" as const : age === 1 ? "faded-only" as const : "hardware-latched" as const };
}
function backgroundAtAge(age: number, input: Readonly<SnoreLiveInputs>) {
  const values = { ...input.background.values }, registers = { ...input.background.registers }, bg = input.background.monbg.bg;
  const x = -input.attackerSprite.x - input.attackerSprite.x2 + 32, y = -input.attackerSprite.y - input.attackerSprite.y2 + 32;
  if (age >= 4 && age <= 67) { values[`gBattle_BG${bg}_X`] = x; values[`gBattle_BG${bg}_Y`] = y; }
  else if (age >= 68) { values[`gBattle_BG${bg}_X`] = 0; values[`gBattle_BG${bg}_Y`] = 0; }
  const registerStart = input.attackerSide === "player" ? 5 : 4;
  if (age >= registerStart) registers[`bg${bg}cnt`] = input.background.monbg.activeCnt;
  if (age >= registerStart && age < 69) { registers[`bg${bg}hofs`] = x & 0x1ff; registers[`bg${bg}vofs`] = y & 0x1ff; }
  if (age >= 69) { registers[`bg${bg}hofs`] = 0; registers[`bg${bg}vofs`] = 0; }
  const effect = effectAtAge(age), local = effect?.local;
  const sourcePlatformX = local !== undefined && local <= 13 && local >= 1 && Math.floor((local + 1) / 2) % 2 === 1 ? -6 : 0;
  values.gBattle_BG3_X = sourcePlatformX; values.gBattle_BG3_Y = 0;
  const previous = effectAtAge(Math.max(0, age - 1)), priorLocal = previous?.local;
  registers.bg3hofs = priorLocal !== undefined && priorLocal <= 13 && priorLocal >= 1 && Math.floor((priorLocal + 1) / 2) % 2 === 1 ? 506 : 0;
  if (age >= 7 && age < 65) { registers.bldcnt = 0x3f40; registers.bldalpha = 0x0808; }
  else { registers.bldcnt = 0; registers.bldalpha = 0; }
  return { values, registers, monbg: { active: age >= 4 && age <= 67, bg, clearActive: age >= 65 && age <= 67 }, platform: { sourceX: sourcePlatformX, hardwareX: registers.bg3hofs === 506 ? -6 : 0 } };
}

export interface SnoreState {
  readonly age: number; readonly active: boolean; readonly source: SnoreSourceCursor; readonly animArgs: readonly number[];
  readonly effect: Readonly<{ readonly call: 1 | 2 | null; readonly localAge: number | null; readonly callsStarted: number }>;
  readonly battlers: ReturnType<typeof battlersAtAge>; readonly tasks: readonly SnoreTask[];
  readonly sprites: Readonly<{ readonly z: readonly SnoreZSprite[]; readonly platform: SnorePlatformSprite | null }>;
  readonly painterOrder: readonly number[]; readonly palette: ReturnType<typeof paletteAtAge>; readonly background: ReturnType<typeof backgroundAtAge>;
  readonly resources: Readonly<{ readonly snoreZ: Readonly<{ readonly loaded: boolean; readonly tag: 10197 | null; readonly allocation: SnoreResourceAllocation | null }>; readonly matrixBitmap: number }>;
  readonly audio: Readonly<{ readonly events: readonly Readonly<{ readonly sound: "SE_M_SNORE"; readonly pan: "attacker"; readonly call: 1 | 2 }>[] }>;
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayState: unknown; readonly gameplayUnchanged: true }>;
  readonly displayTransfer: Readonly<{ readonly oam: "initial" | "preceding-software"; readonly scaleMatrix: "initial" | "two-source-rows"; readonly targetShake: "initial" | "two-source-rows"; readonly platform: "initial" | "preceding-software"; readonly palette: "initial" | "preceding-faded" }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: 0; readonly ownedSprites: number; readonly resourcesReleased: boolean }>;
}

export function snoreAtAge(age: number, input: Readonly<SnoreLiveInputs>): SnoreState {
  assertInputs(age, input); const source = snoreSourceAtAge(age), effect = effectAtAge(age), z = zSpritesAtAge(age, input), platform = platformAtAge(age, input);
  const tasks = tasksAtAge(age, input), loaded = age >= 1 && age < SNORE_FIRST_INACTIVE_AGE;
  const inScale = EFFECT_STARTS.some((start) => age >= start + 2 && age <= start + 15);
  const inShake = EFFECT_STARTS.some((start) => age >= start + 2 && age <= start + 14);
  const audio = EFFECT_STARTS.includes(age as 7 | 39) ? [{ sound: "SE_M_SNORE" as const, pan: "attacker" as const, call: (age === 7 ? 1 : 2) as 1 | 2 }] : [];
  return { age, active: source.active, source,
    animArgs: age < 7 ? [0,0,0,0,0,0,0,0] : [0,0,input.attackerSide === "player" ? 42 : -42,-38,24,0,0,0],
    effect: { call: effect?.call ?? null, localAge: effect?.local ?? null, callsStarted: EFFECT_STARTS.filter((start) => age >= start).length },
    battlers: battlersAtAge(age, input), tasks, sprites: { z, platform }, painterOrder: painterOrderAtAge(age, input), palette: paletteAtAge(age, input), background: backgroundAtAge(age, input),
    resources: { snoreZ: { loaded, tag: loaded ? SNORE_Z_TAG : null, allocation: loaded ? input.resource : null }, matrixBitmap: input.allocator.matrixBitmap },
    audio: { events: audio }, rng: { animation: rngAtAge(input.animationRngSeed, age), sourceDraws: rngDrawsAtAge(age), gameplay: input.gameplayRng, gameplayState: input.gameplayState, gameplayUnchanged: true },
    displayTransfer: { oam: age === 0 ? "initial" : "preceding-software", scaleMatrix: inScale ? "two-source-rows" : "initial", targetShake: inShake ? "two-source-rows" : "initial", platform: age === 0 ? "initial" : "preceding-software", palette: age < 2 ? "initial" : "preceding-faded" },
    cleanup: { firstInactive: age === SNORE_FIRST_INACTIVE_AGE, visualTasks: tasks.filter((task) => task.callback.startsWith("AnimTask_")).length + z.length + Number(platform !== null), soundTasks: 0, ownedSprites: z.length + Number(platform !== null), resourcesReleased: age === SNORE_FIRST_INACTIVE_AGE } };
}
