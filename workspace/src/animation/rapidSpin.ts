import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type RapidSpinSide = "player" | "opponent";
export interface RapidSpinPoint { readonly x: number; readonly y: number }

export interface RapidSpinMonBgInput {
  readonly layer: "bg1" | "bg2";
  readonly spriteX: number;
  readonly spriteY: number;
  readonly bgX: number;
  readonly bgY: number;
  readonly inBg2: boolean;
  readonly battlerId: 0 | 1;
}

export interface RapidSpinLiveInputs {
  readonly attackerSide: RapidSpinSide;
  readonly targetSide: RapidSpinSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerCenter: RapidSpinPoint;
  readonly targetCenter: RapidSpinPoint;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  readonly rapidSpriteSlot: number;
  readonly impactSpriteSlot: number;
  readonly impactMatrixSlot: number;
  readonly elevationTaskSlot: number;
  readonly shakeTaskSlot: number;
  readonly monbgTaskSlot: number;
  readonly clearTaskSlot: number;
  readonly soundTaskSlot: number;
  readonly spriteOrder: readonly number[];
  readonly paletteBanks: Readonly<{ impact: number; rapidSpin: number }>;
  readonly tileSlots: Readonly<{ impact: number; rapidSpin: number }>;
  readonly baseMatrixBitmap: number;
  readonly movePower: number;
  readonly moveDamage: number;
  readonly targetInitialOffset: RapidSpinPoint;
  readonly animationRng: number;
  readonly monbg: RapidSpinMonBgInput;
  readonly initialScanlineSrcBuffer: 0 | 1;
  /** Live banks at source entry; the task only overwrites its elevation band. */
  readonly initialScanlineBanks: readonly [readonly number[], readonly number[]];
}

export interface RapidSpinTask {
  readonly slot: number;
  readonly callback:
    | "RapinSpinMonElevation_Step"
    | "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg"
    | "Task_LoopAndPlaySE";
  readonly data: readonly number[];
}

export interface RapidSpinSprite {
  readonly slot: number;
  readonly template: "gRapidSpinSpriteTemplate";
  readonly callback: "AnimRapidSpin_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animationFrame: 0 | 1 | 2;
  readonly animationDelay: 0 | 1;
  readonly data: readonly [1, number, 40, -2, -32, 0, 0, 0];
}

export interface RapidSpinImpact {
  readonly slot: number;
  readonly matrixSlot: number;
  readonly template: "gBasicHitSplatSpriteTemplate";
  readonly callback: "RunStoredCallbackWhenAffineAnimEnds" | "DestroyAnimSprite";
  readonly x: number;
  readonly y: number;
  readonly animation: 2;
  readonly matrix: readonly [372, 0, 0, 372];
  readonly data: readonly [0, 0, 0, 0, 0, 0, 15357, 2058];
}

export interface RapidSpinFrame {
  readonly age: number;
  readonly active: boolean;
  readonly firstInactiveCleanup: boolean;
  readonly source: Readonly<{
    owner: "Move_RAPID_SPIN";
    offset: 0 | 3 | 6 | 8 | 46 | 83 | 86 | 105 | 108;
    pointer: number;
    pointerParity: 0 | 1;
    wait: number;
  }>;
  readonly battlers: Readonly<{
    attacker: Readonly<{ side: RapidSpinSide; species: string; center: RapidSpinPoint }>;
    target: Readonly<{ side: RapidSpinSide; species: string; center: RapidSpinPoint }>;
  }>;
  readonly rapidSpin: RapidSpinSprite | null;
  readonly impact: RapidSpinImpact | null;
  readonly elevationTask: RapidSpinTask | null;
  readonly shakeTask: RapidSpinTask | null;
  readonly monbgTask: RapidSpinTask | null;
  readonly clearTask: RapidSpinTask | null;
  readonly soundTask: RapidSpinTask | null;
  readonly targetOffset: RapidSpinPoint;
  readonly painterSlots: readonly number[];
  readonly resources: Readonly<{
    impactLoaded: boolean;
    rapidSpinLoaded: boolean;
    impactPaletteBank: number | null;
    rapidSpinPaletteBank: number | null;
    impactTileSlot: number | null;
    rapidSpinTileSlot: number | null;
    matrixBitmap: number;
  }>;
  readonly monbg: Readonly<{
    active: boolean;
    update: boolean;
    clear: boolean;
    layer: "bg1" | "bg2";
    bgX: number;
    bgY: number;
    registers: Readonly<{ bg1hofs: number; bg1vofs: number; bg2hofs: number; bg2vofs: number }>;
  }>;
  readonly scanline: Readonly<{
    state: 0 | 1 | 3;
    srcBuffer: 0 | 1;
    layer: "bg1" | "bg2";
    banks: readonly [readonly number[], readonly number[]];
  }>;
  readonly audio: Readonly<{
    event: "SE_M_RAZOR_WIND2" | "SE_M_DOUBLE_SLAP" | null;
    pan: number | null;
  }>;
  readonly moveInputs: Readonly<{
    power: number;
    damage: number;
    shakeSource: "power";
  }>;
  readonly animationRng: number;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0 | 1;
  readonly displayTransfer: Readonly<{ oam: "predecessor"; matrices: "predecessor"; palette: "predecessor" }>;
}

const BASE = 0x082c_d941;
const FRAME_COUNT = 131;

function assertInputs(input: Readonly<RapidSpinLiveInputs>): void {
  const slots = [input.attackerSpriteSlot, input.targetSpriteSlot,
    input.rapidSpriteSlot, input.impactSpriteSlot];
  const taskSlots = [input.elevationTaskSlot, input.shakeTaskSlot,
    input.monbgTaskSlot, input.clearTaskSlot, input.soundTaskSlot];
  const banks = [input.paletteBanks.impact, input.paletteBanks.rapidSpin];
  if (input.attackerSide === input.targetSide || !input.attackerSpecies
    || !input.targetSpecies || slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || taskSlots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 16)
    || !Number.isInteger(input.impactMatrixSlot) || input.impactMatrixSlot < 0 || input.impactMatrixSlot >= 32
    || input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64
    || banks.some((bank) => !Number.isInteger(bank) || bank < 0 || bank >= 16)
    || input.initialScanlineBanks.some((bank) => bank.length !== 320)
    || input.monbg.layer !== (input.attackerSide === "player" ? "bg2" : "bg1")) {
    throw new Error("invalid live Rapid Spin inputs");
  }
}

function sourceAtAge(age: number): RapidSpinFrame["source"] {
  let offset: RapidSpinFrame["source"]["offset"] = 108;
  let wait = 1;
  if (age === 0) { offset = 0; wait = 0; }
  else if (age <= 3) { offset = 3; wait = age === 1 ? 1 : 0; }
  else if (age <= 6) { offset = 6; wait = age === 4 ? 1 : 0; }
  else if (age <= 9) { offset = 8; wait = age === 7 ? 1 : 0; }
  else if (age <= 52) offset = 46;
  else if (age <= 72) offset = 83;
  else if (age <= 82) { offset = 86; wait = Math.max(0, 81 - age); }
  else if (age <= 125) offset = 105;
  const pointer = BASE + offset;
  return { owner: "Move_RAPID_SPIN", offset, pointer,
    pointerParity: (pointer & 1) as 0 | 1, wait };
}

function rapidSpriteAtAge(age: number, input: Readonly<RapidSpinLiveInputs>): RapidSpinSprite | null {
  const localAge = age - 10;
  if (localAge < 0 || localAge > 31) return null;
  const phase = ((localAge + 1) * 40) & 0xff;
  const animationFrame = [0, 1, 1, 2, 2, 0][localAge % 6] as 0 | 1 | 2;
  return {
    slot: input.rapidSpriteSlot, template: "gRapidSpinSpriteTemplate",
    callback: "AnimRapidSpin_Step", x: input.attackerCenter.x,
    y: input.attackerCenter.y, x2: GBA_SINE_TABLE_256[phase]! >> 4,
    y2: 30 - localAge * 2, animationFrame,
    animationDelay: (localAge & 1) as 0 | 1,
    data: [1, phase, 40, -2, -32, 0, 0, 0],
  };
}

function impactAtAge(age: number, input: Readonly<RapidSpinLiveInputs>): RapidSpinImpact | null {
  if (age < 53 || age > 62) return null;
  return {
    slot: input.impactSpriteSlot, matrixSlot: input.impactMatrixSlot,
    template: "gBasicHitSplatSpriteTemplate",
    callback: age === 62 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds",
    x: input.targetCenter.x, y: input.targetCenter.y, animation: 2,
    matrix: [372, 0, 0, 372], data: [0, 0, 0, 0, 0, 0, 15357, 2058],
  };
}

function elevationData(
  localAge: number,
  returning: boolean,
  input: Readonly<RapidSpinLiveInputs>,
): number[] {
  const top = input.attackerCenter.y + 36;
  const bottom = Math.max(0, input.attackerCenter.y - 33);
  const left = input.monbg.bgX;
  const right = left + 240;
  const data = [top, top, bottom, top, 8, 2, 0, 0, left, right,
    Number(returning), returning ? left : right, 0, 0, 0, 0];
  for (let tick = 0; tick <= localAge; tick += 1) {
    data[0] = Math.max(bottom, data[0]! - data[5]!);
    if (data[4] === 0) {
      data[1] = data[1]! - data[5]!;
      if (data[1]! < bottom) { data[1] = bottom; data[15] = 1; }
    } else data[4] = data[4]! - 1;
    data[6] = data[6]! + 1;
    if (data[6]! > 1) {
      data[6] = 0; data[7] = data[7] === 0 ? 1 : 0;
      data[12] = data[7] ? left : right;
    }
  }
  return data;
}

function elevationTaskAtAge(age: number, input: Readonly<RapidSpinLiveInputs>): RapidSpinTask | null {
  const firstLocal = age - 10;
  const secondLocal = age - 83;
  if (firstLocal >= 0 && firstLocal <= 41) return {
    slot: input.elevationTaskSlot, callback: "RapinSpinMonElevation_Step",
    data: elevationData(firstLocal, false, input),
  };
  if (secondLocal >= 0 && secondLocal <= 41) return {
    slot: input.elevationTaskSlot, callback: "RapinSpinMonElevation_Step",
    data: elevationData(secondLocal, true, input),
  };
  return null;
}

function shakeAtAge(age: number, input: Readonly<RapidSpinLiveInputs>): Readonly<{
  task: RapidSpinTask | null; offset: RapidSpinPoint;
}> {
  const localAge = age - 53;
  if (localAge < 0 || localAge > 18) {
    return { task: null, offset: localAge >= 19 ? { x: 0, y: 0 } : input.targetInitialOffset };
  }
  const amplitude = Math.min(16, Math.max(1, Math.trunc(input.movePower / 12)));
  const data = [0, 1, 10, 0, 0, 0, 0, input.targetSpriteSlot,
    input.targetInitialOffset.x, input.targetInitialOffset.y, 1, 0, 0,
    Math.trunc(amplitude / 2) + (amplitude & 1), Math.trunc(amplitude / 2), amplitude];
  let x = input.targetInitialOffset.x;
  for (let tick = 0; tick <= localAge; tick += 1) {
    data[0] = data[0]! + 1;
    if (data[0]! > data[1]!) {
      data[0] = 0; data[12] = (data[12]! + 1) & 1;
      x = data[8]! + (data[12] ? data[13]! : -data[14]!);
      data[2] = data[2]! - 1;
    }
  }
  return {
    task: { slot: input.shakeTaskSlot,
      callback: "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step", data },
    offset: { x, y: input.targetInitialOffset.y },
  };
}

function soundTaskAtAge(age: number, input: Readonly<RapidSpinLiveInputs>): RapidSpinTask | null {
  const start = age >= 83 ? 83 : 10;
  const localAge = age - start;
  if (localAge < 0 || localAge > 25) return null;
  const data = [160, input.attackerSide === "player" ? -64 : 63, 8, 4,
    0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0];
  for (let tick = 0; tick <= localAge + 1; tick += 1) {
    if (data[8]!++ >= data[2]!) {
      data[8] = 0; data[3] = data[3]! - 1;
    }
  }
  return { slot: input.soundTaskSlot, callback: "Task_LoopAndPlaySE", data };
}

function scanlineBanksAtAge(age: number, input: Readonly<RapidSpinLiveInputs>): readonly [readonly number[], readonly number[]] {
  const banks: [number[], number[]] = [
    [...input.initialScanlineBanks[0]], [...input.initialScanlineBanks[1]],
  ];
  const apply = (localAge: number, returning: boolean): void => {
    const top = input.attackerCenter.y + 36;
    const bottom = Math.max(0, input.attackerCenter.y - 33);
    const initial = returning ? input.monbg.bgX + 240 : input.monbg.bgX;
    for (const bank of banks) {
      for (let y = bottom; y <= top; y += 1) bank[y] = initial;
    }
    for (let tick = 0; tick <= localAge; tick += 1) {
      const data = elevationData(tick, returning, input);
      for (const bank of banks) {
        for (let y = data[0]!; y < data[1]!; y += 1) bank[y] = data[12]!;
        for (let y = data[1]!; y <= data[3]!; y += 1) bank[y] = data[11]!;
      }
    }
  };
  if (age >= 10) apply(Math.min(age - 10, 41), false);
  // The scanline runtime's first row after the non-stopping ascent restores
  // the inclusive lower edge to the constructor's far-side value.
  if (age >= 52) {
    const bottom = Math.max(0, input.attackerCenter.y - 33);
    for (const bank of banks) bank[bottom] = input.monbg.bgX + 240;
  }
  if (age >= 83) apply(Math.min(age - 83, 41), true);
  return banks;
}

function wrapped(value: number): number { return ((value % 512) + 512) % 512; }

/** Pure source-relative reducer through Rapid Spin's first inactive row. */
export function rapidSpinAtAge(age: number, input: Readonly<RapidSpinLiveInputs>): RapidSpinFrame {
  assertInputs(input);
  if (!Number.isInteger(age)) throw new Error("Rapid Spin source age must be an integer");
  const rapidSpin = rapidSpriteAtAge(age, input);
  const impact = impactAtAge(age, input);
  const elevationTask = elevationTaskAtAge(age, input);
  const shake = shakeAtAge(age, input);
  const soundTask = soundTaskAtAge(age, input);
  const monbgTask = age >= 7 && age <= 128 ? {
    slot: input.monbgTaskSlot, callback: "Task_UpdateMonBg" as const,
    data: [input.attackerSpriteSlot, input.monbg.spriteX, input.monbg.spriteY,
      input.monbg.bgX, input.monbg.bgY, Number(input.monbg.inBg2), input.monbg.battlerId,
      0, 0, 0, 0, 0, 0, 0, 0, 0],
  } : null;
  const clearTask = age >= 126 && age <= 128 ? {
    slot: input.clearTaskSlot, callback: "Task_ClearMonBg" as const,
    data: [0, age === 126 ? 1 : 2, input.monbg.battlerId, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  } : null;
  const selectedHofs = age >= 8 && age <= 129
    ? (age <= 10 || age >= 126 ? wrapped(input.monbg.bgX) : 0) : 0;
  const selectedVofs = age >= 8 && age <= 129 ? wrapped(input.monbg.bgY) : 0;
  const registers = input.monbg.layer === "bg1"
    ? { bg1hofs: selectedHofs, bg1vofs: selectedVofs, bg2hofs: 0, bg2vofs: 0 }
    : { bg1hofs: 0, bg1vofs: 0, bg2hofs: selectedHofs, bg2vofs: selectedVofs };
  const ownedSlots = [rapidSpin?.slot, impact?.slot].filter((slot): slot is number => slot !== undefined);
  return {
    age, active: age >= 0 && age < FRAME_COUNT - 1,
    firstInactiveCleanup: age === FRAME_COUNT - 1, source: sourceAtAge(age),
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, center: input.attackerCenter },
      target: { side: input.targetSide, species: input.targetSpecies, center: input.targetCenter },
    },
    rapidSpin, impact, elevationTask, shakeTask: shake.task, monbgTask, clearTask, soundTask,
    targetOffset: shake.offset,
    painterSlots: input.spriteOrder.filter((slot) => ownedSlots.includes(slot)),
    resources: {
      impactLoaded: age >= 1 && age <= 129,
      rapidSpinLoaded: age >= 4 && age <= 129,
      impactPaletteBank: age >= 1 && age <= 129 ? input.paletteBanks.impact : null,
      rapidSpinPaletteBank: age >= 4 && age <= 129 ? input.paletteBanks.rapidSpin : null,
      impactTileSlot: age >= 1 && age <= 129 ? input.tileSlots.impact : null,
      rapidSpinTileSlot: age >= 4 && age <= 129 ? input.tileSlots.rapidSpin : null,
      matrixBitmap: age >= 53 && age <= 62
        ? input.baseMatrixBitmap | (1 << input.impactMatrixSlot) : input.baseMatrixBitmap,
    },
    monbg: { active: age >= 7 && age <= 128, update: monbgTask !== null,
      clear: clearTask !== null, layer: input.monbg.layer,
      bgX: age >= 7 && age <= 128 ? input.monbg.bgX : 0,
      bgY: age >= 7 && age <= 128 ? input.monbg.bgY : 0, registers },
    scanline: {
      state: age >= 10 && age <= 124 ? 1 : age === 125 ? 3 : 0,
      srcBuffer: age < 10 ? input.initialScanlineSrcBuffer
        : age <= 124 ? (age % 2 === 0 ? 1 : 0) : 0,
      layer: input.monbg.layer, banks: scanlineBanksAtAge(age, input),
    },
    audio: age === 10 || age === 83
      ? { event: "SE_M_RAZOR_WIND2", pan: input.attackerSide === "player" ? -64 : 63 }
      : age === 53
        ? { event: "SE_M_DOUBLE_SLAP", pan: input.targetSide === "player" ? -63 : 63 }
        : { event: null, pan: null },
    moveInputs: { power: input.movePower, damage: input.moveDamage, shakeSource: "power" },
    animationRng: input.animationRng,
    visualTaskCount: Number(rapidSpin !== null) + Number(impact !== null)
      + Number(elevationTask !== null) + Number(shake.task !== null),
    soundTaskCount: soundTask ? 1 : 0,
    displayTransfer: { oam: "predecessor", matrices: "predecessor", palette: "predecessor" },
  };
}
