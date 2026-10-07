/**
 * Source-relative Scene-ON reducer for MOVE_MACH_PUNCH.
 *
 * The root is intentionally a semantic presentation model.  It consumes
 * current battler geometry and allocator state, then reproduces the source
 * command cursor, task/sprite lifetime, register ownership, and cleanup.  It
 * does not consume a recording, framebuffer, controller tick, or gameplay
 * state.
 */

export type MachPunchSide = "player" | "opponent";
export interface MachPunchPoint { readonly x: number; readonly y: number; }
export type MachPunchMatrix = readonly [number, number, number, number];

export interface MachPunchBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: MachPunchMatrix;
}

export interface MachPunchPainterSprite {
  readonly slot: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly oamY: number;
}

export interface MachPunchResourceAllocation {
  readonly paletteBank: number;
  readonly tileSlot: number;
  readonly tileRange: readonly [number, number];
}

export interface MachPunchLiveInputs {
  readonly attackerSide: MachPunchSide;
  readonly targetSide: MachPunchSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerPictureOrigin: Readonly<MachPunchPoint>;
  readonly targetPictureOrigin: Readonly<MachPunchPoint>;
  readonly attackerSprite: Readonly<MachPunchBattlerSprite>;
  readonly targetSprite: Readonly<MachPunchBattlerSprite>;
  readonly taskSlots: Readonly<{
    readonly monBg: number;
    readonly initialFade: number;
    readonly slidingBg: number;
    readonly punch: number;
    readonly shake: number;
    readonly clearMonBg: number;
    readonly restoreFade: number;
  }>;
  /** Eight source trace slots are reused as the punch callback advances. */
  readonly traceSlots: readonly [number, number, number, number, number, number, number, number];
  readonly hitSplatSlot: number;
  readonly fistSlot: number;
  readonly matrixSlot: number;
  readonly resources: Readonly<{
    readonly impact: MachPunchResourceAllocation;
    readonly handsAndFeet: MachPunchResourceAllocation;
  }>;
  /** Unfaded contents of the live OBJ palette bank allocated to traces. */
  readonly tracePalette: Readonly<{
    readonly bank: number;
    readonly bgr555: readonly number[];
  }>;
  readonly matrixBitmap: number;
  readonly matrixSlots: readonly MachPunchMatrix[];
  readonly fistMatrix: MachPunchMatrix;
  readonly spriteOrder: readonly number[];
  readonly painterSprites: readonly MachPunchPainterSprite[];
  readonly registers: Readonly<{
    readonly bg3hofs: number;
    readonly bldcnt: number;
    readonly bldalpha: number;
    readonly bldy: number;
  }>;
  readonly animationRngSeed: number;
  /** Gameplay RNG is opaque and is returned byte-for-byte unchanged. */
  readonly gameplayRng: unknown;
  /**
   * The optional late lag frame at age 91 (a VBlank overrun, CPU phase; prep25 lag-frames.json). Absent: the accepted fixtures' side rule
   * (player attacker with the lag, 110 rows; opponent without, 109). The live seam sets it from the D4 timing policy (liveMoveTimingPolicy.ts).
   */
  readonly optionalLateLag?: boolean;
}

export const MACH_PUNCH_SOURCE_START = 0x082cd565;
export const MACH_PUNCH_SOURCE_END_EXCLUSIVE = 0x082cd5ed;
export const MACH_PUNCH_IMPACT_TAG = 10135;
export const MACH_PUNCH_HANDS_AND_FEET_TAG = 10143;
export const MACH_PUNCH_TRACE_COUNT = 8;
export const MACH_PUNCH_PLAYER_FIRST_INACTIVE = 110;
export const MACH_PUNCH_OPPONENT_FIRST_INACTIVE = 109;

export interface MachPunchSourceCursor {
  readonly owner: "Move_MACH_PUNCH";
  readonly pointer: number;
  readonly pointerOffset: 0 | 3 | 6 | 8 | 25 | 41 | 44 | 64 | 117 | 122 | 127 | 128;
  readonly active: boolean;
  readonly wait: number;
}

export interface MachPunchTask {
  readonly slot: number;
  readonly callback:
    | "Task_UpdateMonBg"
    | "Task_FadeToBg"
    | "AnimTask_UpdateSlidingBg"
    | "AnimTask_AttackerPunchWithTrace_Step"
    | "AnimTask_ShakeMon_Step"
    | "Task_ClearMonBg";
  readonly role: "monbg" | "fade-initial" | "sliding-bg" | "punch" | "shake" | "clear-monbg" | "fade-restore";
  readonly data: readonly number[];
}

export interface MachPunchTraceSprite {
  readonly kind: "trace";
  readonly slot: number;
  readonly template: "gMultiuseSpriteTemplate";
  readonly callback: "AnimBattlerTrace";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: MachPunchMatrix;
  readonly data: readonly number[];
  readonly sourceCreationOrder: number;
}

export interface MachPunchHitSplatSprite {
  readonly kind: "hitsplat";
  readonly slot: number;
  readonly template: "gBasicHitSplatSpriteTemplate";
  readonly callback: "RunStoredCallbackWhenAffineAnimEnds" | "DestroyAnimSprite";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: MachPunchMatrix;
  readonly data: readonly number[];
  readonly sourceCreationOrder: 8;
}

export interface MachPunchFistSprite {
  readonly kind: "fist";
  readonly slot: number;
  readonly template: "gFistFootSpriteTemplate";
  readonly callback: "WaitAnimForDuration" | "DestroyAnimSprite";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly data: readonly number[];
  readonly sourceCreationOrder: 9;
}

export type MachPunchSprite = MachPunchTraceSprite | MachPunchHitSplatSprite | MachPunchFistSprite;

export interface MachPunchState {
  readonly age: number;
  readonly active: boolean;
  readonly source: MachPunchSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: MachPunchSide; readonly species: string; readonly sprite: MachPunchBattlerSprite }>;
    readonly target: Readonly<{ readonly side: MachPunchSide; readonly species: string; readonly sprite: MachPunchBattlerSprite }>;
  }>;
  readonly background: Readonly<{
    readonly id: "BG_HIGHSPEED_PLAYER" | "BG_HIGHSPEED_OPPONENT";
    readonly branch: "player" | "opponent";
    readonly scrollX: number;
    readonly highSpeed: boolean;
  }>;
  readonly sprites: readonly MachPunchSprite[];
  readonly tasks: readonly MachPunchTask[];
  readonly attackerOnMonBg: boolean;
  readonly alpha: Readonly<{ readonly eva: 9; readonly evb: 8 }> | null;
  readonly resources: Readonly<{
    readonly impact: Readonly<{ readonly tag: number | null; readonly loaded: boolean; readonly allocation: MachPunchResourceAllocation | null }>;
    readonly handsAndFeet: Readonly<{ readonly tag: number | null; readonly loaded: boolean; readonly allocation: MachPunchResourceAllocation | null }>;
    readonly allocator: Readonly<{ readonly matrixBitmap: number; readonly matrixSlots: readonly MachPunchMatrix[]; readonly affineAllocated: boolean }>;
  }>;
  readonly registers: Readonly<{ readonly bg3hofs: number; readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number }>;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software";
    readonly palette: "initial" | "preceding-faded" | "same-row-monbg";
    readonly bg3Scroll: "initial" | "preceding-software";
  }>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{
    readonly channel: "SE1";
    readonly sound: "SE_M_JUMP_KICK" | "SE_M_COMET_PUNCH";
    readonly sourcePan: "SOUND_PAN_ATTACKER" | "SOUND_PAN_TARGET";
    readonly pan: number;
  }>[];
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayUnchanged: true }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: number; readonly ownedSprites: number; readonly resourcesReleased: boolean }>;
}

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Mach Punch source age ${age}`);
}

function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) throw new Error(`invalid Mach Punch ${label}`);
}

function assertInputs(input: Readonly<MachPunchLiveInputs>): void {
  if (input.attackerSide === input.targetSide) throw new Error("Mach Punch requires opposing live battler sides");
  for (const [label, slot] of Object.entries(input.taskSlots)) assertSlot(slot, label, 16);
  for (const [index, slot] of input.traceSlots.entries()) assertSlot(slot, `trace ${index}`, 64);
  if (new Set(input.traceSlots).size !== MACH_PUNCH_TRACE_COUNT) throw new Error("Mach Punch trace slots must be distinct");
  assertSlot(input.hitSplatSlot, "hit splat sprite", 64);
  assertSlot(input.fistSlot, "fist sprite", 64);
  assertSlot(input.matrixSlot, "matrix", input.matrixSlots.length || 32);
  assertSlot(input.tracePalette.bank, "trace palette", 16);
  if (input.tracePalette.bgr555.length !== 16
    || input.tracePalette.bgr555.some((color) => !Number.isInteger(color) || color < 0 || color > 0x7fff)) {
    throw new Error("Mach Punch requires one live 16-color trace OBJ palette");
  }
  if (input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64 || input.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error("Mach Punch requires a 64-slot painter order seed");
  }
}

const lateLag = (input: Readonly<Pick<MachPunchLiveInputs, "attackerSide" | "optionalLateLag">>): boolean =>
  input.optionalLateLag ?? input.attackerSide === "player";

export function machPunchFirstInactiveAge(input: Readonly<Pick<MachPunchLiveInputs, "attackerSide" | "optionalLateLag">>): number {
  return lateLag(input) ? MACH_PUNCH_PLAYER_FIRST_INACTIVE : MACH_PUNCH_OPPONENT_FIRST_INACTIVE;
}

export function machPunchSourceAtAge(age: number, firstInactiveAge: number): MachPunchSourceCursor {
  assertAge(age);
  let pointerOffset: MachPunchSourceCursor["pointerOffset"];
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 7) { pointerOffset = 6; wait = age === 4 ? 1 : 0; }
  else if (age < 10) { pointerOffset = 8; wait = age === 7 ? 1 : 0; }
  else if (age < 29) { pointerOffset = 25; wait = 1; }
  else if (age < 48) { pointerOffset = 41; wait = 1; }
  else if (age < 50) { pointerOffset = 44; wait = age === 48 ? -1 : 0; }
  else if (age < 58) { pointerOffset = 64; wait = Math.max(0, 6 - (age - 50)); }
  else if (age < 69) { pointerOffset = 117; wait = 1; }
  else if (age < 90) { pointerOffset = 122; wait = 1; }
  else if (age < firstInactiveAge) { pointerOffset = 127; wait = 1; }
  else pointerOffset = 128;
  return { owner: "Move_MACH_PUNCH", pointer: MACH_PUNCH_SOURCE_START + pointerOffset, pointerOffset, active: age < firstInactiveAge, wait };
}

function animationDrawsAtAge(age: number, optionalLateLag: boolean): number {
  let draws = age;
  if (age >= 71) draws -= 1;
  if (age >= 72) draws -= 1;
  if (optionalLateLag && age >= 91) draws -= 1;
  return draws;
}

function animationRngAtAge(seed: number, draws: number): number {
  let result = seed >>> 0;
  for (let draw = 0; draw < draws; draw += 1) result = (Math.imul(result, 1103515245) + 24691) >>> 0;
  return result;
}

function slideX(age: number, input: Readonly<MachPunchLiveInputs>): number {
  if (age < 29 || age >= 90) return 0;
  // The source task is live for 29..89, but its callback is held for two
  // scanout rows at the BG3 handoff (71/72).  Hardware BG3HOFS then observes
  // the preceding software scroll, including that hold.
  const effectiveAge = age <= 72 ? Math.min(age, 70) : age - 2;
  const distance = (effectiveAge - 28) * 9;
  return input.targetSide === "opponent" ? -distance : distance;
}

function registerHofs(age: number, input: Readonly<MachPunchLiveInputs>): number {
  const previous = slideX(Math.max(0, age - 1), input);
  return age === 0 ? input.registers.bg3hofs : ((previous % 512) + 512) % 512;
}

function initialFadeValue(age: number): number {
  if (age < 11 || age === 46) return 0;
  return Math.max(0, Math.min(16, Math.min(age - 11, 46 - age)));
}

function restoreFadeValue(age: number, firstInactive: number): number {
  const end = firstInactive - 2;
  if (age < 71 || age > end) return 0;
  if (age <= 73) return 1;
  const holdEnd = firstInactive - 18;
  if (age <= holdEnd) return Math.min(16, age - 72);
  return Math.max(0, end - age);
}

function bldState(age: number, firstInactive: number, input: Readonly<MachPunchLiveInputs>): { readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number } {
  if (age < 11) return input.registers;
  if (age >= 11 && age <= 46) return { bldcnt: 232, bldalpha: 0, bldy: initialFadeValue(age) };
  if (age >= 50 && age <= 68) return { bldcnt: 16192, bldalpha: 2057, bldy: 0 };
  if (age >= 70 && age <= firstInactive - 2) return { bldcnt: 232, bldalpha: 0, bldy: restoreFadeValue(age, firstInactive) };
  return { bldcnt: 0, bldalpha: 0, bldy: 0 };
}

function targetShakeAtAge(age: number): MachPunchPoint {
  if (age < 58 || age >= 68) return { x: 0, y: 0 };
  const local = age - 58;
  const pulse = Math.floor(local / 2) % 2 === 1;
  return { x: pulse ? 3 : 0, y: 0 };
}

// AnimTask_AttackerPunchWithTrace (battle_anim_mons.c:2408-2466) moves x2 RELATIVE to the battler's current x2 (the idle rest) and ends
// with an absolute x2 = 0 (species audit 9: ONIX / RATTATA opponent attackers).
function attackerPunchOffset(age: number, input: Readonly<MachPunchLiveInputs>): number {
  if (age < 50) return input.attackerSprite.x2;
  if (age > 57) return 0;
  const player = [2, 10, 18, 26, 34, 26, 18, 10];
  const opponent = [-16, -24, -32, -40, -48, -40, -32, -24];
  return input.attackerSprite.x2 + (input.attackerSide === "player" ? player : opponent)[age - 50]!;
}

function battlerSpriteAtAge(age: number, input: Readonly<MachPunchLiveInputs>, sprite: "attacker" | "target"): MachPunchBattlerSprite {
  const firstInactive = machPunchFirstInactiveAge(input);
  const source = sprite === "attacker" ? input.attackerSprite : input.targetSprite;
  const side = sprite === "attacker" ? input.attackerSide : input.targetSide;
  const matrix = age >= 58 && age < 68 && source.matrixNum === input.matrixSlot ? input.fistMatrix : source.matrix;
  if (age >= firstInactive) {
    return { ...source, x2: 0, y2: 0, matrixNum: side === "player" ? 1 : 2, matrix: source.matrix };
  }
  if (sprite === "attacker") {
    return {
      ...source,
      x2: attackerPunchOffset(age, input),
      matrix,
    };
  }
  // AnimTask_ShakeMon sets x2 absolutely when it starts (age 58); before that the target keeps its idle rest.
  const shake = age <= 58 ? { x: source.x2, y: source.y2 } : targetShakeAtAge(age);
  return { ...source, x2: shake.x, y2: shake.y, matrix };
}

function taskData(...values: number[]): readonly number[] {
  return [...values, ...Array.from({ length: 16 - values.length }, () => 0)];
}

function fadeTaskData(background: number, phase: number): readonly number[] {
  const data = taskData(background) as number[];
  data[10] = phase;
  return data;
}

function taskAtAge(age: number, input: Readonly<MachPunchLiveInputs>, firstInactive: number): MachPunchTask[] {
  const targetDeltaX = input.targetSide === "opponent" ? -40 : -144;
  const targetDeltaY = input.targetSide === "opponent" ? -60 : -12;
  const tasks: MachPunchTask[] = [];
  if (age >= 7 && age <= 71) {
    tasks.push({ slot: input.taskSlots.monBg, callback: "Task_UpdateMonBg", role: "monbg", data: taskData(input.attackerSprite.slot, input.attackerSprite.x, input.attackerSprite.y, targetDeltaX, targetDeltaY, input.targetSide === "player" ? 0 : 1, input.attackerSide === "opponent" ? 1 : 0) });
  }
  if (age >= 10 && age <= 46) {
    const phase = age < 28 ? 1 : age === 28 ? 2 : 3;
    tasks.push({ slot: input.taskSlots.initialFade, callback: "Task_FadeToBg", role: "fade-initial", data: fadeTaskData(input.targetSide === "opponent" ? 9 : 10, phase) });
  }
  if (age >= 29 && age <= 89) {
    const direction = input.targetSide === "opponent" ? -2304 : 2304;
    tasks.push({ slot: input.taskSlots.slidingBg, callback: "AnimTask_UpdateSlidingBg", role: "sliding-bg", data: taskData(1, direction, 0, -1) });
  }
  if (age >= 50 && age <= 65) {
    const punchX = input.attackerSide === "player" ? 8 : -8;
    const local = age - 50;
    const tracePhase = local < 4 ? 0 : local < 8 ? 1 : 2;
    const traceFrame = local < 4 ? local + 1 : local < 8 ? 8 - local : 0;
    const traceLife = local < 8 ? local + 1 : 8 - (local - 8);
    tasks.push({ slot: input.taskSlots.punch, callback: "AnimTask_AttackerPunchWithTrace_Step", role: "punch", data: taskData(input.attackerSprite.slot, punchX, tracePhase, traceFrame, 9, traceLife, input.attackerSide === "player" ? 3 : 2, 0) });
  }
  if (age >= 58 && age <= 67) {
    const local = age - 58;
    tasks.push({ slot: input.taskSlots.shake, callback: "AnimTask_ShakeMon_Step", role: "shake", data: taskData(input.targetSprite.slot, 5 - Math.floor(local / 2), 1, local % 2 === 0 ? 1 : 0, 3, 0, 0, 0) });
  }
  if (age >= 69 && age <= 71) {
    tasks.push({ slot: input.taskSlots.clearMonBg, callback: "Task_ClearMonBg", role: "clear-monbg", data: taskData(0, age === 69 ? 1 : 2, input.attackerSide === "player" ? 0 : 1, 0) });
  }
  if (age >= 69 && age <= firstInactive - 2) {
    const phase = age < 89 ? 1 : age === 89 || (lateLag(input) && age === 90) ? 2 : 3;
    tasks.push({ slot: input.taskSlots.restoreFade, callback: "Task_FadeToBg", role: "fade-restore", data: fadeTaskData(-1, phase) });
  }
  return tasks.sort((left, right) => left.slot - right.slot || left.role.localeCompare(right.role));
}

function traceSpritesAtAge(age: number, input: Readonly<MachPunchLiveInputs>): MachPunchTraceSprite[] {
  if (age < 50 || age > 65) return [];
  const firstCycle = input.attackerSide === "player"
    ? [-6, 2, 10, 18, 26, 34, 26, 18]
    : [-8, -16, -24, -32, -40, -48, -40, -32];
  const laterCycle = input.attackerSide === "player"
    ? [10, 2, 10, 18, 26, 34, 26, 18]
    : [-24, -16, -24, -32, -40, -48, -40, -32];
  const indices: number[] = age < 58
    ? Array.from({ length: age - 49 }, (_, index) => index)
    : [0, ...Array.from({ length: 7 - (age - 58) }, (_, index) => index + age - 58 + 1)];
  return indices.map((index) => {
    const spawned = age < 58 ? 50 + index : (index === 0 ? 58 : 50 + index);
    const life = Math.max(0, 8 - (age - spawned));
    // The trace clones copy the attacker's x2, which includes its idle rest.
    const x2 = (age < 58 ? firstCycle[index]! : laterCycle[index]!) + input.attackerSprite.x2;
    return {
      kind: "trace", slot: input.traceSlots[index]!, template: "gMultiuseSpriteTemplate", callback: "AnimBattlerTrace",
      x: input.attackerPictureOrigin.x, y: input.attackerPictureOrigin.y, x2, y2: 0,
      subpriority: input.attackerSprite.subpriority,
      oamPriority: input.attackerSprite.subpriority === 20 || input.attackerSprite.subpriority === 40 ? 2 : 3,
      matrixNum: input.attackerSprite.matrixNum,
      matrix: age >= 58 && input.attackerSprite.matrixNum === input.matrixSlot ? input.fistMatrix : input.attackerSprite.matrix,
      data: [life, 0, input.traceSlots[index]!, input.attackerSide === "player" ? 3 : 0, input.attackerSide === "player" ? 0 : 256, input.attackerSide === "player" ? 2 : 256, 0, 0], sourceCreationOrder: index,
    };
  });
}

function impactSpritesAtAge(age: number, input: Readonly<MachPunchLiveInputs>): MachPunchSprite[] {
  const sprites: MachPunchSprite[] = traceSpritesAtAge(age, input);
  if (age >= 58 && age <= 67) {
    sprites.push({
      kind: "hitsplat", slot: input.hitSplatSlot, template: "gBasicHitSplatSpriteTemplate",
      callback: age === 67 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds",
      x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, x2: 0, y2: 0,
      subpriority: input.targetSprite.subpriority - 3, oamPriority: input.targetSprite.oamPriority,
      matrixNum: input.matrixSlot, matrix: input.fistMatrix, data: [0, 0, 0, 0, 0, 0, 15357, 2058], sourceCreationOrder: 8,
    });
  }
  if (age >= 58 && age <= 66) {
    sprites.push({
      kind: "fist", slot: input.fistSlot, template: "gFistFootSpriteTemplate",
      callback: age === 66 ? "DestroyAnimSprite" : "WaitAnimForDuration",
      x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, x2: 0, y2: 0,
      subpriority: input.targetSprite.subpriority - 4, oamPriority: input.targetSprite.oamPriority,
      data: [Math.max(0, 7 - (age - 58)), 0, 0, 0, 0, 0, 15357, 2058], sourceCreationOrder: 9,
    });
  }
  return sprites;
}

function dynamicOrderKey(sprite: MachPunchSprite, input: Readonly<MachPunchLiveInputs>): MachPunchPainterSprite {
  const oamY = sprite.kind === "trace"
    ? input.painterSprites.find((entry) => entry.slot === input.attackerSprite.slot)?.oamY ?? input.attackerSprite.y
    : sprite.y - 16;
  return { slot: sprite.slot, subpriority: sprite.subpriority, oamPriority: sprite.oamPriority, oamY };
}

function painterOrderAtAge(age: number, input: Readonly<MachPunchLiveInputs>): readonly number[] {
  let order = input.spriteOrder.slice();
  const owned = new Set<number>([...input.traceSlots, input.hitSplatSlot, input.fistSlot]);
  for (let current = 1; current <= age; current += 1) {
    const keys = new Map(input.painterSprites.map((sprite) => [sprite.slot, sprite]));
    for (const slot of owned) keys.set(slot, { slot, subpriority: 0xff, oamPriority: 3, oamY: 160 });
    for (const sprite of impactSpritesAtAge(current, input)) {
      // Task-created traces are allocated after this row's SortSprites pass.
      if (sprite.kind === "trace" && sprite.data[0] === 8) continue;
      keys.set(sprite.slot, dynamicOrderKey(sprite, input));
    }
    const keyFor = (slot: number): MachPunchPainterSprite => keys.get(slot) ?? { slot, subpriority: 0xff, oamPriority: 3, oamY: 160 };
    for (let index = 1; index < order.length; index += 1) {
      let cursor = index;
      while (cursor > 0) {
        const before = keyFor(order[cursor - 1]!); const currentKey = keyFor(order[cursor]!);
        const beforePriority = (before.oamPriority << 8) | before.subpriority;
        const currentPriority = (currentKey.oamPriority << 8) | currentKey.subpriority;
        const swap = beforePriority > currentPriority || (beforePriority === currentPriority && ((before.oamY & 0xff) < (currentKey.oamY & 0xff)));
        if (!swap) break;
        const saved = order[cursor]!; order[cursor] = order[cursor - 1]!; order[cursor - 1] = saved; cursor -= 1;
      }
    }
  }
  return order;
}

function animArgsAtAge(age: number, input: Readonly<MachPunchLiveInputs>): MachPunchState["animArgs"] {
  const sideArg = input.attackerSide === "opponent" && age >= 10 ? 1 : 0;
  if (age < 29) return [0, 0, 0, 0, 0, 0, 0, sideArg];
  if (age < 50) return [input.targetSide === "opponent" ? -2304 : 2304, 0, 1, -1, 0, 0, 0, sideArg];
  if (age < 58) return [28968, 10, 1, -1, 0, 0, 0, sideArg];
  return [1, 3, 0, 6, 1, 0, 0, age >= 90 ? -1 : sideArg];
}

/** Complete MOVE_MACH_PUNCH source-root reduction through its inactive cleanup row. */
export function machPunchAtAge(age: number, input: Readonly<MachPunchLiveInputs>): MachPunchState {
  assertAge(age); assertInputs(input);
  const firstInactive = machPunchFirstInactiveAge(input);
  const source = machPunchSourceAtAge(age, firstInactive);
  const tasks = taskAtAge(age, input, firstInactive);
  const sprites = source.active ? impactSpritesAtAge(age, input) : [];
  const attackerSprite = battlerSpriteAtAge(age, input, "attacker");
  const targetSprite = battlerSpriteAtAge(age, input, "target");
  const backgroundId = input.targetSide === "opponent" ? "BG_HIGHSPEED_OPPONENT" : "BG_HIGHSPEED_PLAYER";
  const fadeState = bldState(age, firstInactive, input);
  const impactLoaded = age >= 1 && age < firstInactive;
  const handsLoaded = age >= 4 && age < firstInactive;
  const matrixAllocated = age >= 58 && age < 68;
  const matrixSlots = input.matrixSlots.map((matrix, slot) => matrixAllocated && slot === input.matrixSlot ? input.fistMatrix : matrix);
  const sourceDraws = animationDrawsAtAge(age, lateLag(input));
  const audio = age === 50
    ? [{ channel: "SE1" as const, sound: "SE_M_JUMP_KICK" as const, sourcePan: "SOUND_PAN_ATTACKER" as const, pan: input.attackerSide === "player" ? -64 : 63 }]
    : age === 58
      ? [{ channel: "SE1" as const, sound: "SE_M_COMET_PUNCH" as const, sourcePan: "SOUND_PAN_TARGET" as const, pan: input.targetSide === "opponent" ? 63 : -63 }]
      : [];
  const cleanup = !source.active && age === firstInactive;
  return {
    age, active: source.active, source, animArgs: animArgsAtAge(age, input),
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: attackerSprite },
      target: { side: input.targetSide, species: input.targetSpecies, sprite: targetSprite },
    },
    background: { id: backgroundId, branch: input.targetSide, scrollX: slideX(age, input), highSpeed: age >= 29 && age < 90 },
    sprites, tasks: source.active ? tasks : [], attackerOnMonBg: age >= 7 && age < 69,
    alpha: age >= 50 && age <= 68 ? { eva: 9, evb: 8 } : null,
    resources: {
      impact: { tag: impactLoaded ? MACH_PUNCH_IMPACT_TAG : null, loaded: impactLoaded, allocation: impactLoaded ? input.resources.impact : null },
      handsAndFeet: { tag: handsLoaded ? MACH_PUNCH_HANDS_AND_FEET_TAG : null, loaded: handsLoaded, allocation: handsLoaded ? input.resources.handsAndFeet : null },
      allocator: { matrixBitmap: input.matrixBitmap | (matrixAllocated ? (1 << input.matrixSlot) : 0), matrixSlots, affineAllocated: matrixAllocated },
    },
    registers: { bg3hofs: registerHofs(age, input), bldcnt: fadeState.bldcnt, bldalpha: fadeState.bldalpha, bldy: fadeState.bldy },
    displayTransfer: { oam: age === 0 ? "initial" : "preceding-software", matrices: age === 0 ? "initial" : "preceding-software", palette: age === 0 ? "initial" : age === 7 ? "same-row-monbg" : "preceding-faded", bg3Scroll: age === 0 ? "initial" : "preceding-software" },
    painterOrder: painterOrderAtAge(age, input), audio,
    rng: { animation: animationRngAtAge(input.animationRngSeed, sourceDraws), sourceDraws, gameplay: input.gameplayRng, gameplayUnchanged: true },
    cleanup: {
      firstInactive: cleanup,
      visualTasks: age >= 50 && age <= 57 ? 1 : age >= 58 && age <= 65 ? 4 : age === 66 ? 3 : age === 67 ? 2 : 0,
      soundTasks: 0,
      ownedSprites: sprites.length,
      resourcesReleased: age >= firstInactive,
    },
  };
}
