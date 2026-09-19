/**
 * Pure, source-relative Scene-ON presentation reducer for MOVE_SKY_ATTACK.
 *
 * The controller chooses the body (the two-turn move has a setup and an
 * unleash script).  This module only owns the source script cursor and the
 * presentation resources/tasks/registers.  It deliberately has no damage,
 * accuracy, turn, facility, charge-choice, or gameplay-RNG dependency.
 */

export type SkyAttackBody = "setup" | "unleash";
export type SkyAttackSide = "player" | "opponent";
export type SkyAttackOam = readonly [number, number, number];
export type SkyAttackMatrix = readonly [number, number, number, number];
export interface SkyAttackPoint { readonly x: number; readonly y: number; }

export interface SkyAttackBattlerSprite {
  readonly slot: number; readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number; readonly attr: SkyAttackOam;
  readonly subpriority: number; readonly oamPriority: number;
  readonly matrixNum: number; readonly matrix: SkyAttackMatrix; readonly flags: number;
  readonly animNum: number; readonly animCmdIndex: number; readonly animDelayCounter: number;
  readonly data: readonly number[];
}

export interface SkyAttackBirdAllocation {
  readonly slot: number; readonly matrixNum: number; readonly attr: SkyAttackOam;
  readonly subpriority: number; readonly oamPriority: number; readonly flags: number;
}
export interface SkyAttackResourceAllocation {
  readonly tag: number; readonly tileSlot: number; readonly paletteAllocatorSlot: number;
  readonly paletteBank: number; readonly tileRange: readonly [number, number];
  readonly palette: readonly number[];
}
export interface SkyAttackLiveInputs {
  readonly attackerSide: SkyAttackSide; readonly targetSide: SkyAttackSide;
  readonly attackerSpecies: string; readonly targetSpecies: string;
  readonly attackerPictureOrigin: Readonly<SkyAttackPoint>;
  readonly targetPictureOrigin: Readonly<SkyAttackPoint>;
  readonly attackerSprite: Readonly<SkyAttackBattlerSprite>;
  readonly targetSprite: Readonly<SkyAttackBattlerSprite>;
  readonly taskSlots: Readonly<{
    readonly monbg: number; readonly blendSetup: number; readonly shake: number;
    readonly sound: number; readonly fade: number; readonly blendUnleash: number;
    readonly birdShake: number; readonly slidingBg: number; readonly clearMonbg: number;
    readonly fadeBg: number;
  }>;
  readonly bird: Readonly<SkyAttackBirdAllocation>;
  readonly resources: Readonly<{ readonly impact: Readonly<SkyAttackResourceAllocation>; readonly bird: Readonly<SkyAttackResourceAllocation> }>;
  readonly allocator: Readonly<{
    readonly matrixBitmap: number; readonly spriteOrder: readonly number[];
    readonly activeOrderKeys: readonly Readonly<{ readonly slot: number; readonly subpriority: number; readonly oamPriority: number; readonly oamY: number }>[];
  }>;
  readonly palettes: Readonly<{ readonly unfaded: readonly number[]; readonly faded: readonly number[]; readonly hardware: readonly number[] }>;
  readonly background: Readonly<{
    readonly values: Readonly<Record<string, number>>; readonly registers: Readonly<Record<string, number>>;
    readonly monbg: Readonly<{ readonly bg: 1 | 2; readonly unleashBg?: 1 | 2; readonly activeCnt: number; readonly paletteBank: number }>;
    readonly vram: Readonly<Record<string, number>>;
  }>;
  readonly animationRngSeed: number;
  readonly gameplayRng: unknown; readonly gameplayState?: unknown;
}

export const SKY_ATTACK_SETUP_FIRST_INACTIVE_AGE = 148;
export const SKY_ATTACK_UNLEASH_FIRST_INACTIVE_AGE = 180;
export const SKY_ATTACK_IMPACT_TAG = 10135;
export const SKY_ATTACK_BIRD_TAG = 10284;
export const SKY_ATTACK_SOURCE_START = 0x082cd17b;
export const SKY_ATTACK_SOURCE_SHARED = 0x082d7ce5;
export const SKY_ATTACK_SOURCE_END_EXCLUSIVE = 0x082cd313;

const IDENTITY: SkyAttackMatrix = [256, 0, 0, 256];
const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const words = (...values: number[]): number[] => [...values, ...Array.from({ length: Math.max(0, 16 - values.length) }, () => 0)].slice(0, 16);
const u32 = (value: number): number => value >>> 0;
const nextRng = (value: number): number => u32(Math.imul(value, 0x41c64e6d) + 0x6073);
const rngAtAge = (seed: number, age: number): number => { let value = u32(seed); for (let i = 0; i < age; i += 1) value = nextRng(value); return value; };
const sideSign = (side: SkyAttackSide): 1 | -1 => side === "player" ? -1 : 1;
const bodyLastAge = (body: SkyAttackBody): number => body === "setup" ? SKY_ATTACK_SETUP_FIRST_INACTIVE_AGE : SKY_ATTACK_UNLEASH_FIRST_INACTIVE_AGE;
const bgFor = (body: SkyAttackBody, input: Readonly<SkyAttackLiveInputs>): 1 | 2 => body === "unleash" ? (input.background.monbg.unleashBg ?? (input.background.monbg.bg === 1 ? 2 : 1)) : input.background.monbg.bg;

export interface SkyAttackSourceCursor {
  readonly owner: "Move_SKY_ATTACK"; readonly pointer: number; readonly pointerOffset: number;
  readonly pointerIdentity: number; readonly wait: number; readonly active: boolean;
}

function assertAge(body: SkyAttackBody, age: number, input: Readonly<SkyAttackLiveInputs>): void {
  if (!Number.isInteger(age) || age < 0 || age > bodyLastAge(body)) throw new Error(`MOVE_SKY_ATTACK ${body} age must be in [0, ${bodyLastAge(body)}], got ${age}`);
  if (input.attackerSide === input.targetSide) throw new Error("MOVE_SKY_ATTACK needs opposing live battler sides");
  if (input.resources.impact.tag !== SKY_ATTACK_IMPACT_TAG || input.resources.bird.tag !== SKY_ATTACK_BIRD_TAG) throw new Error("MOVE_SKY_ATTACK needs the live impact and bird allocations");
}

function setupSource(age: number): SkyAttackSourceCursor {
  let offset: number; let wait = 0;
  if (age === 0) offset = 0;
  else if (age < 4) { offset = 12; wait = age === 1 ? 1 : 0; }
  else if (age < 29) { offset = 54; wait = 1; }
  else if (age < 43) { offset = 57; wait = Math.max(0, 41 - age); }
  else if (age < 65) { offset = 112; wait = Math.max(0, 63 - age); }
  else if (age < 108) { offset = 129; wait = 1; }
  else if (age < 125) { offset = 147; wait = 1; }
  else { offset = 9; wait = 1; }
  return { owner: "Move_SKY_ATTACK", pointer: SKY_ATTACK_SOURCE_START + offset, pointerOffset: offset, pointerIdentity: SKY_ATTACK_SOURCE_START + offset, wait, active: age < SKY_ATTACK_SETUP_FIRST_INACTIVE_AGE };
}

function unleashSource(age: number): SkyAttackSourceCursor {
  let pointer: number; let offset: number; let wait = 1;
  if (age === 0) { offset = 0; pointer = SKY_ATTACK_SOURCE_START; wait = 0; }
  else if (age < 4) { offset = 278; pointer = SKY_ATTACK_SOURCE_START + offset; wait = age === 1 ? 1 : 0; }
  else if (age < 7) { offset = 281; pointer = SKY_ATTACK_SOURCE_START + offset; wait = age === 4 ? 1 : 0; }
  else if (age < 26) { offset = 7; pointer = SKY_ATTACK_SOURCE_SHARED + offset; }
  else if (age < 45) { offset = 23; pointer = SKY_ATTACK_SOURCE_SHARED + offset; }
  else if (age < 48) { offset = 288; pointer = SKY_ATTACK_SOURCE_START + offset; wait = age === 45 ? 1 : 0; }
  else if (age < 54) { offset = 307; pointer = SKY_ATTACK_SOURCE_START + offset; wait = Math.max(0, 52 - age); }
  else if (age < 70) { offset = 316; pointer = SKY_ATTACK_SOURCE_START + offset; }
  else if (age < 86) { offset = 337; pointer = SKY_ATTACK_SOURCE_START + offset; wait = Math.max(0, 84 - age); }
  else if (age < 108) { offset = 367; pointer = SKY_ATTACK_SOURCE_START + offset; wait = Math.max(0, 106 - age); }
  else if (age < 112) { offset = 378; pointer = SKY_ATTACK_SOURCE_START + offset; wait = Math.max(0, 110 - age); }
  else if (age < 140) { offset = 395; pointer = SKY_ATTACK_SOURCE_START + offset; }
  else if (age < 161) { offset = 49; pointer = SKY_ATTACK_SOURCE_SHARED + offset; }
  else if (age < 180) { offset = 54; pointer = SKY_ATTACK_SOURCE_SHARED + offset; }
  else { offset = 9; pointer = SKY_ATTACK_SOURCE_START + offset; wait = 0; }
  return { owner: "Move_SKY_ATTACK", pointer, pointerOffset: offset, pointerIdentity: pointer, wait, active: age < SKY_ATTACK_UNLEASH_FIRST_INACTIVE_AGE };
}

export function skyAttackSourceAtAge(body: SkyAttackBody, age: number): SkyAttackSourceCursor {
  if (!Number.isInteger(age) || age < 0 || age > bodyLastAge(body)) throw new Error(`invalid MOVE_SKY_ATTACK ${body} age ${age}`);
  return body === "setup" ? setupSource(age) : unleashSource(age);
}

function setupArgs(age: number): readonly number[] {
  if (age < 4) return ZERO_ARGS;
  if (age < 43) return [27, 1, 0, 12, 0, 0, 0, 0];
  if (age < 65) return [2, 1, 0, 15, 32767, 0, 0, 0];
  if (age < 108) return [2, 1, 15, 0, 32767, 0, 0, 0];
  return [25, 1, 8, 0, 0, 0, 0, 0];
}
function unleashArgs(age: number, side: SkyAttackSide): readonly number[] {
  if (age < 26) return ZERO_ARGS;
  if (age < 48) return [sideSign(side) * 2304, sideSign(side) === -1 ? 768 : -768, 1, -1, 0, 0, 0, 0];
  if (age < 54) return [2, 0, 0, 16, 32767, 0, 0, 0];
  if (age < 70) return [0, 0, 0, 16, 32767, 0, 0, 0];
  if (age < 86) return [238, -64, 0, 16, 32767, 0, 0, 0];
  if (age < 108) return [141, 63, 0, 18, 1, 0, 0, 0];
  if (age < 112) return [1, 63, 0, 18, 1, 0, 0, 0];
  if (age < 161) return [2, 0, 15, 0, 32767, 0, 0, 0];
  return [2, 0, 15, 0, 32767, 0, 0, -1];
}

export type SkyAttackTaskCallback = "Task_UpdateMonBg" | "Task_ClearMonBg" | "Task_FadeToBg" | "AnimTask_BlendSpriteColor_Step2" | "AnimTask_ShakeBattlers" | "Task_LoopAndPlaySE" | "AnimTask_AttackerFadeToInvisible_Step" | "AnimTask_AttackerFadeFromInvisible_Step" | "AnimTask_ShakeMon2_Step" | "AnimTask_UpdateSlidingBg";
export interface SkyAttackTask { readonly slot: number; readonly callback: SkyAttackTaskCallback; readonly data: readonly number[]; }

function updateMonBg(input: Readonly<SkyAttackLiveInputs>, body: SkyAttackBody): SkyAttackTask {
  const sprite = body === "setup" ? input.targetSprite : input.targetSprite;
  const bg = bgFor(body, input);
  return { slot: input.taskSlots.monbg, callback: "Task_UpdateMonBg", data: words(sprite.slot, sprite.x + sprite.x2, sprite.y + sprite.y2, -sprite.x - sprite.x2 + 32, -sprite.y - sprite.y2 + 32, bg === 2 ? 1 : 0, input.targetSide === "opponent" ? 1 : 0) };
}
function setupTasks(age: number, input: Readonly<SkyAttackLiveInputs>): SkyAttackTask[] {
  const tasks: SkyAttackTask[] = [];
  if (age >= 1 && age <= 127) tasks.push(updateMonBg(input, "setup"));
  if (age >= 4 && age <= 27) tasks.push({ slot: input.taskSlots.blendSetup, callback: "AnimTask_BlendSpriteColor_Step2", data: words(14, bgFor("setup", input), 1, 0, 12, 0, 0, 0, 0, age % 2, Math.min(12, Math.floor((age - 4) / 2) + 1)) });
  if (age >= 43 && age <= 64) tasks.push({ slot: input.taskSlots.blendSetup, callback: "AnimTask_BlendSpriteColor_Step2", data: words(0, bgFor("setup", input), 1, 8, 0, 32767, 0, 0, 0, age % 2, Math.max(0, 8 - Math.floor((age - 43) / 2))) });
  if (age >= 43 && age <= 72) tasks.push({ slot: input.taskSlots.blendUnleash, callback: "AnimTask_BlendSpriteColor_Step2", data: words(0, bgFor("setup", input), 1, 0, 15, 32767, 0, 0, 0, age % 2, Math.min(15, Math.floor((age - 43) / 2))) });
  if (age >= 65 && age <= 106) tasks.push({ slot: input.taskSlots.blendSetup, callback: "AnimTask_BlendSpriteColor_Step2", data: words(0, bgFor("setup", input), 1, 15, 0, 32767, 0, 0, 0, age % 2, Math.max(0, 15 - Math.floor((age - 65) / 2))) });
  if (age >= 43 && age <= 106) tasks.push({ slot: input.taskSlots.shake, callback: "AnimTask_ShakeBattlers", data: words(input.attackerSide === "player" ? 0 : 1, Math.max(0, 16 - Math.floor((age - 43) / 4)), 0, 16, 0, 0, 0, 0, 0, 6, 0, 0, 0, 1, 5, 5) });
  if (age >= 43 && age <= 76) tasks.push({ slot: input.taskSlots.sound, callback: "Task_LoopAndPlaySE", data: words(239, input.attackerSide === "player" ? -64 : 63, 4, 2, 0, 0, 0, 0, age - 43) });
  if (age >= 108 && age <= 123) tasks.push({ slot: input.taskSlots.blendSetup, callback: "AnimTask_BlendSpriteColor_Step2", data: words(25, bgFor("setup", input), 1, 8, 0) });
  if (age >= 125 && age <= 127) tasks.push({ slot: input.taskSlots.clearMonbg, callback: "Task_ClearMonBg", data: words(0, age - 124, input.targetSide === "opponent" ? 1 : 0) });
  return tasks.sort((a, b) => a.slot - b.slot);
}
function fadeTask(age: number, input: Readonly<SkyAttackLiveInputs>, fromInvisible: boolean): SkyAttackTask {
  const local = fromInvisible ? age - 108 : age - 54;
  return { slot: input.taskSlots.fade, callback: fromInvisible ? "AnimTask_AttackerFadeFromInvisible_Step" : "AnimTask_AttackerFadeToInvisible_Step", data: words(0, 271 + local * 2550, 0, 0, 0, 0, 0, 0) };
}
function unleashTasks(age: number, input: Readonly<SkyAttackLiveInputs>): SkyAttackTask[] {
  const tasks: SkyAttackTask[] = [];
  if (age >= 7 && age <= 178) tasks.push({ slot: input.taskSlots.fadeBg, callback: "Task_FadeToBg", data: words(age >= 140 ? -1 : 18, 0, 0, 0, 0, 0, 0, 0) });
  if (age >= 26 && age <= 160) tasks.push({ slot: input.taskSlots.slidingBg, callback: "AnimTask_UpdateSlidingBg", data: words(1, sideSign(input.attackerSide) * 2304, sideSign(input.attackerSide) === -1 ? 768 : -768, -1) });
  if (age >= 45 && age <= 142) tasks.push(updateMonBg(input, "unleash"));
  if (age >= 48 && age <= 63) tasks.push({ slot: input.taskSlots.blendUnleash, callback: "AnimTask_BlendSpriteColor_Step2", data: words(2, 0, 0, 16, 32767, 0, 0, 0, 0, age % 2, Math.max(0, 8 - Math.floor((age - 48) / 2))) });
  if (age >= 54 && age <= 68) tasks.push(fadeTask(age, input, false));
  if (age >= 70 && age <= 93) tasks.push({ slot: input.taskSlots.birdShake, callback: "AnimTask_ShakeBattlers", data: words(0, 1, 0, 0) });
  if (age >= 86 && age <= 119) tasks.push({ slot: input.taskSlots.birdShake, callback: "AnimTask_ShakeMon2_Step", data: words(input.targetSprite.slot, Math.max(0, 18 - (age - 86)), 1, age % 2, 10) });
  if (age >= 108 && age <= 138) tasks.push(fadeTask(age, input, true));
  if (age >= 112 && age <= 126) tasks.push({ slot: input.taskSlots.blendUnleash, callback: "AnimTask_BlendSpriteColor_Step2", data: words(2, 0, 15, 0, 32767, 0, 0, 0, 0, age % 2, Math.max(0, 15 - Math.floor((age - 112) / 2))) });
  if (age >= 140 && age <= 142) tasks.push({ slot: input.taskSlots.clearMonbg, callback: "Task_ClearMonBg", data: words(0, age - 139, input.attackerSide === "opponent" ? 1 : 0) });
  return tasks.sort((a, b) => a.slot - b.slot);
}

export interface SkyAttackBirdSprite {
  readonly slot: number; readonly template: "gSkyAttackBirdSpriteTemplate";
  readonly callback: "AnimTranslateLinear" | "DestroyAnimSprite";
  readonly attr: SkyAttackOam; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly subpriority: number; readonly oamPriority: number; readonly matrixNum: number; readonly matrix: SkyAttackMatrix;
  readonly flags: number; readonly data: readonly number[];
}
function birdAtAge(body: SkyAttackBody, age: number, input: Readonly<SkyAttackLiveInputs>): SkyAttackBirdSprite | null {
  if (body !== "unleash" || age < 70 || age > (input.attackerSide === "player" ? 93 : 92)) return null;
  const local = age - 70, dx = input.targetPictureOrigin.x - input.attackerPictureOrigin.x, dy = input.targetPictureOrigin.y - input.attackerPictureOrigin.y;
  const x2 = Math.trunc(dx * local / 12), y2 = Math.trunc(dy * local / 12);
  return { slot: input.bird.slot, template: "gSkyAttackBirdSpriteTemplate", callback: age === (input.attackerSide === "player" ? 93 : 92) ? "DestroyAnimSprite" : "AnimTranslateLinear", attr: input.bird.attr, x: input.attackerPictureOrigin.x, y: input.attackerPictureOrigin.y, x2, y2, subpriority: input.bird.subpriority, oamPriority: input.bird.oamPriority, matrixNum: input.bird.matrixNum, matrix: IDENTITY, flags: input.bird.flags, data: words(Math.max(0, 11 - local), dx, dy, x2, y2) };
}

function battlersAtAge(body: SkyAttackBody, age: number, input: Readonly<SkyAttackLiveInputs>) {
  let attacker = { ...input.attackerSprite }, target = { ...input.targetSprite };
  if (body === "setup" && age >= 43 && age <= 106) {
    const shake = [0, 3, 3, -2, -2, 3, 3, -2, -2, 3, 3, -2, -2, 3, 3, -2, -2, 3, 3, -2, -2, 3, 3, -2, -2, 3, 3, -2, -2, 3, 3, -2, -2, 2, 2, -2, -2, 2, 2, -2, -2, 2, 2, -1, -1, 2, 2, -1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 1, 1, 0, 0, 1, 1, 0, 0] as const;
    const x2 = shake[age - 43] ?? 0;
    attacker = { ...attacker, x2, attr: [attacker.attr[0], (attacker.attr[1] - x2) & 0xffff, attacker.attr[2]] };
  }
  if (body === "unleash" && age >= 86 && age <= 119) {
    const local = age - 86; const x2 = Math.floor(local / 2) % 2 === 0 ? -10 : 10;
    target = { ...target, x2, attr: [target.attr[0], (target.attr[1] - x2) & 0xffff, target.attr[2]] };
  }
  if (body === "setup" && age >= 1 && age <= 127) target = { ...target, flags: target.flags | 4 };
  if (body === "unleash" && age >= 54 && age <= 138) attacker = { ...attacker, flags: attacker.flags | 4 };
  return { attacker: { side: input.attackerSide, species: input.attackerSpecies, pictureOrigin: input.attackerPictureOrigin, sprite: attacker }, target: { side: input.targetSide, species: input.targetSpecies, pictureOrigin: input.targetPictureOrigin, sprite: target } };
}

function paletteAtAge(body: SkyAttackBody, age: number, input: Readonly<SkyAttackLiveInputs>) {
  const unfaded = input.palettes.unfaded.slice(), faded = input.palettes.faded.slice(), hardware = input.palettes.hardware.slice();
  const copy = (to: number, values: readonly number[]) => { unfaded.splice(to * 16, 16, ...values.slice(0, 16)); faded.splice(to * 16, 16, ...values.slice(0, 16)); };
  if (body === "unleash" && age >= 1 && age < 180) { copy(input.resources.impact.paletteBank, input.resources.impact.palette); copy(input.resources.bird.paletteBank, input.resources.bird.palette); }
  if (body === "unleash" && age >= 45 && age < 128) copy(input.background.monbg.paletteBank, input.palettes.unfaded.slice(input.background.monbg.paletteBank * 16, input.background.monbg.paletteBank * 16 + 16));
  if (age >= 2) hardware.splice(0, hardware.length, ...faded);
  return { unfaded, faded, hardware, transfer: age === 0 ? "initial" as const : age === 1 ? "faded-only" as const : "preceding-faded" as const };
}

function backgroundAtAge(body: SkyAttackBody, age: number, input: Readonly<SkyAttackLiveInputs>) {
  const values = { ...input.background.values }, registers = { ...input.background.registers };
  const bg = bgFor(body, input);
  if (body === "setup") {
    if (age >= 1 && age <= 127) { values[`gBattle_BG${bg}_X`] = -input.targetSprite.x - input.targetSprite.x2 + 32; values[`gBattle_BG${bg}_Y`] = -input.targetSprite.y - input.targetSprite.y2 + 32; }
    if (age >= 2 && age <= 128) { registers[`bg${bg}cnt`] = input.background.monbg.activeCnt; registers[`bg${bg}hofs`] = (input.targetSprite.x + 192) & 0x1ff; registers[`bg${bg}vofs`] = (input.targetSprite.y + 446) & 0x1ff; }
    if (age >= 129) { values[`gBattle_BG${bg}_X`] = 0; values[`gBattle_BG${bg}_Y`] = 0; registers[`bg${bg}hofs`] = 0; registers[`bg${bg}vofs`] = 0; }
  } else {
    if (age >= 26 && age <= 141) { const step = age - 25, sign = sideSign(input.attackerSide); values.gBattle_BG3_X = sign * 9 * step; values.gBattle_BG3_Y = sign === -1 ? 3 * step : -3 * step; }
    else if (age >= 144 && age <= 161) { const step = Math.max(0, 161 - age); values.gBattle_BG3_X = sideSign(input.attackerSide) * 9 * step; values.gBattle_BG3_Y = sideSign(input.attackerSide) === -1 ? 3 * step : -3 * step; }
    if (age >= 27 && age <= 142) { registers.bg3cnt = input.background.monbg.activeCnt; registers.bg3hofs = (input.background.registers.bg3hofs ?? 0) + (sideSign(input.attackerSide) === -1 ? -9 * (age - 26) : 9 * (age - 26)); registers.bg3vofs = (input.background.registers.bg3vofs ?? 0) + (sideSign(input.attackerSide) === -1 ? 3 * (age - 26) : -3 * (age - 26)); }
    if (age >= 145 && age <= 162) { registers.bg3hofs = input.background.registers.bg3hofs ?? 0; registers.bg3vofs = input.background.registers.bg3vofs ?? 0; }
  }
  return { values, registers, vram: { ...input.background.vram, phase: body === "setup" ? (age >= 129 ? 3 : age >= 2 ? 2 : 1) : (age >= 161 ? 3 : age >= 26 ? 2 : 1) } };
}

function orderAtAge(body: SkyAttackBody, age: number, input: Readonly<SkyAttackLiveInputs>, bird: SkyAttackBirdSprite | null): readonly number[] {
  const order = [...input.allocator.spriteOrder];
  if (!bird) return order;
  const transient = new Map(input.allocator.activeOrderKeys.map((entry) => [entry.slot, entry]));
  transient.set(bird.slot, { slot: bird.slot, subpriority: bird.subpriority, oamPriority: bird.oamPriority, oamY: bird.attr[0] & 0xff });
  return order.sort((left, right) => { const a = transient.get(left), b = transient.get(right); if (!a || !b) return left - right; return (a.oamPriority - b.oamPriority) || (a.subpriority - b.subpriority) || (a.oamY - b.oamY); });
}

export interface SkyAttackState {
  readonly body: SkyAttackBody; readonly age: number; readonly active: boolean; readonly source: SkyAttackSourceCursor; readonly animArgs: readonly number[];
  readonly battlers: ReturnType<typeof battlersAtAge>; readonly tasks: readonly SkyAttackTask[]; readonly sprites: Readonly<{ readonly bird: SkyAttackBirdSprite | null }>;
  readonly painterOrder: readonly number[]; readonly palette: ReturnType<typeof paletteAtAge>; readonly background: ReturnType<typeof backgroundAtAge>;
  readonly resources: Readonly<{ readonly impact: Readonly<{ readonly loaded: boolean; readonly tag: number | null; readonly allocation: SkyAttackResourceAllocation | null }>; readonly bird: Readonly<{ readonly loaded: boolean; readonly tag: number | null; readonly allocation: SkyAttackResourceAllocation | null }>; readonly matrixBitmap: number }>;
  readonly audio: Readonly<{ readonly events: readonly Readonly<{ readonly sound: "SE_M_STAT_INCREASE" | "SE_M_SKY_UPPERCUT" | "SE_M_MEGA_KICK2"; readonly pan: SkyAttackSide }>[] }>;
  readonly rng: Readonly<{ readonly animation: number; readonly gameplay: unknown; readonly gameplayState: unknown; readonly gameplayUnchanged: true }>;
  readonly displayTransfer: Readonly<{ readonly oam: "initial" | "preceding-software"; readonly matrices: "initial" | "preceding-software"; readonly palette: "initial" | "preceding-faded"; readonly bg: "initial" | "preceding-software" }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: number; readonly resourcesReleased: boolean }>;
}

export function skyAttackAtAge(body: SkyAttackBody, age: number, input: Readonly<SkyAttackLiveInputs>): SkyAttackState {
  assertAge(body, age, input);
  const source = skyAttackSourceAtAge(body, age), animArgs = body === "setup" ? setupArgs(age) : unleashArgs(age, input.attackerSide);
  const tasks = body === "setup" ? setupTasks(age, input) : unleashTasks(age, input), bird = birdAtAge(body, age, input);
  const loaded = body === "unleash" && age >= 1 && age < 180;
  const events = body === "setup" && age === 43 ? [{ sound: "SE_M_STAT_INCREASE" as const, pan: input.attackerSide }] : body === "unleash" && age === 70 ? [{ sound: "SE_M_SKY_UPPERCUT" as const, pan: input.attackerSide }] : body === "unleash" && age === 86 ? [{ sound: "SE_M_MEGA_KICK2" as const, pan: input.targetSide }] : [];
  return { body, age, active: source.active, source, animArgs, battlers: battlersAtAge(body, age, input), tasks, sprites: { bird }, painterOrder: orderAtAge(body, age, input, bird), palette: paletteAtAge(body, age, input), background: backgroundAtAge(body, age, input),
    resources: { impact: { loaded, tag: loaded ? SKY_ATTACK_IMPACT_TAG : null, allocation: loaded ? input.resources.impact : null }, bird: { loaded: body === "unleash" && age >= 4 && age < 180, tag: body === "unleash" && age >= 4 && age < 180 ? SKY_ATTACK_BIRD_TAG : null, allocation: body === "unleash" && age >= 4 && age < 180 ? input.resources.bird : null }, matrixBitmap: input.allocator.matrixBitmap },
    audio: { events }, rng: { animation: rngAtAge(input.animationRngSeed, age), gameplay: input.gameplayRng, gameplayState: input.gameplayState, gameplayUnchanged: true },
    displayTransfer: { oam: age === 0 ? "initial" : "preceding-software", matrices: age === 0 ? "initial" : "preceding-software", palette: age === 0 ? "initial" : "preceding-faded", bg: age === 0 ? "initial" : "preceding-software" },
    cleanup: { firstInactive: age === bodyLastAge(body), visualTasks: tasks.filter((task) => task.callback.startsWith("AnimTask_") || task.callback === "Task_FadeToBg").length + Number(bird !== null), soundTasks: Number(events.length > 0), resourcesReleased: age === bodyLastAge(body) } };
}
