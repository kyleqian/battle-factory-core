import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

/** The two legal singles orientations used by the Scene-ON receipts. */
export type SleepTalkSide = "player" | "opponent";

export type SleepTalkLetterIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type SleepTalkLetterSlot = 3 | 4 | 5 | 7 | 9 | 10;

export interface SleepTalkMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface SleepTalkOam {
  /** The three software OAM attributes written by UpdateOamCoords. */
  readonly attr: readonly [number, number, number];
  readonly matrixNum: 0 | 3 | 4 | 5 | 6 | 7;
  readonly affineMode: "normal";
  readonly objMode: "normal";
  readonly shape: "32x32";
  readonly priority: 2;
  readonly tileNum: 305;
  readonly paletteNum: 7;
}

export interface SleepTalkLetter {
  readonly index: SleepTalkLetterIndex;
  readonly slot: SleepTalkLetterSlot;
  readonly group: 0 | 1 | 2;
  /** Display age at which the first callback result reaches software OAM. */
  readonly spawnAge: number;
  /** Display age relative to this letter's first visible callback result. */
  readonly localAge: number;
  /** `sprite->x/y` from SetSpriteCoordsToAnimAttackerCoords. */
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  /** The complete probed software data[0..7] row. */
  readonly data: readonly [number, number, number, number, number, number, number, number];
  readonly matrix: SleepTalkMatrix;
  readonly matrixNum: 0 | 3 | 4 | 5 | 6 | 7;
  readonly oam: SleepTalkOam;
  /** One VBlank/OAM transfer behind the software sprite, or absent at spawn. */
  readonly hardwareOam: SleepTalkOam | null;
  /** Hardware affine matrix after the same one-frame transfer latch. */
  readonly hardwareMatrix: SleepTalkMatrix;
  readonly template: "gLetterZSpriteTemplate";
  readonly callback: "AnimLetterZ";
}

export interface SleepTalkSwayTask {
  readonly slot: 0;
  readonly callback: "AnimTask_SwayMonStep";
  readonly initialCallback: "AnimTask_SwayMon";
  readonly target: "attacker";
  readonly axis: "horizontal";
  /** The complete probed task data[0..15] row. */
  readonly data: readonly [
    number, number, number, number, number, number, number, number,
    number, number, number, number, number, number, number, number,
  ];
  readonly sineIndex: number;
  readonly waveIndex: number;
  readonly offsetX2: number;
}

export interface SleepTalkRegisters {
  readonly dispcnt: 48960;
  readonly bg0cnt: 38912;
  readonly bg1cnt: number;
  readonly bg2cnt: number;
  readonly bg3cnt: 23051;
  readonly bldcnt: 0;
  readonly bldalpha: 0;
  readonly bldy: 0;
}

export interface SleepTalkState {
  readonly active: boolean;
  readonly gAnimScriptActive: boolean;
  readonly frameCount: 186 | 189;
  readonly letterZLoaded: boolean;
  readonly scriptOffset: number;
  readonly scriptWait: number;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly swayTask: SleepTalkSwayTask | null;
  readonly letters: readonly SleepTalkLetter[];
  readonly soundRestart: "SE_M_SNORE" | null;
  readonly soundPanSide: SleepTalkSide | null;
  readonly soundPan: -64 | 63 | null;
  readonly assetTags: Readonly<{
    readonly tileTag: "ANIM_TAG_LETTER_Z";
    readonly paletteTag: "ANIM_TAG_LETTER_Z";
    readonly tileTagId: 10228;
    readonly paletteTagId: 10228;
    readonly tileLoaded: boolean;
    readonly paletteLoaded: boolean;
  }>;
  readonly oamBuffer: Readonly<{
    readonly softwareEntries: 128;
    readonly hardwareEntries: 128;
    readonly matrixEntries: 32;
    readonly hardwareTransferLag: 1;
  }>;
  readonly registers: SleepTalkRegisters;
}

/** Source pointer ages are 186 frames player-back and 189 opponent-front. */
export const SLEEP_TALK_FRAME_COUNT = {
  player: 186,
  opponent: 189,
} as const;

/** Display ages at which the nine `gLetterZSpriteTemplate` rows appear. */
export const SLEEP_TALK_LETTER_SPAWN_AGES = [
  26, 34, 42, 64, 72, 80, 102, 110, 118,
] as const;

export const SLEEP_TALK_SNORE_AGES = [26, 64, 102] as const;

const LETTER_SLOTS: readonly SleepTalkLetterSlot[] = [3, 4, 5, 7, 9, 10, 3, 4, 5];
const LETTER_MATRICES: readonly (0 | 3 | 4 | 5 | 6 | 7)[] = [0, 3, 4, 5, 6, 7, 0, 3, 4];
const IDENTITY: SleepTalkMatrix = { a: 256, b: 0, c: 0, d: 256 };

// The affine program is source-owned (`AFFINEANIMCMD_FRAME(-7,-7,-3,16)` /
// `(+7,+7,+3,16)` with a jump back to zero). These are the 32 Q8.8 matrix
// rows emitted by the GBA affine animator; data[0]=2 is the first displayed
// callback row and the program repeats every 32 callback values.
const LETTER_MATRIX_CYCLE: readonly SleepTalkMatrix[] = [
  { a: 267, b: 39, c: -39, d: 267 },
  { a: 271, b: 60, c: -60, d: 271 },
  { a: 274, b: 83, c: -83, d: 274 },
  { a: 276, b: 106, c: -106, d: 276 },
  { a: 276, b: 130, c: -130, d: 276 },
  { a: 274, b: 155, c: -155, d: 274 },
  { a: 271, b: 181, c: -181, d: 271 },
  { a: 267, b: 208, c: -208, d: 267 },
  { a: 260, b: 236, c: -236, d: 260 },
  { a: 252, b: 265, c: -265, d: 252 },
  { a: 241, b: 294, c: -294, d: 241 },
  { a: 228, b: 324, c: -324, d: 228 },
  { a: 212, b: 355, c: -355, d: 212 },
  { a: 195, b: 387, c: -387, d: 195 },
  { a: 174, b: 420, c: -420, d: 174 },
  { a: 195, b: 387, c: -387, d: 195 },
  { a: 212, b: 355, c: -355, d: 212 },
  { a: 228, b: 324, c: -324, d: 228 },
  { a: 241, b: 294, c: -294, d: 241 },
  { a: 252, b: 265, c: -265, d: 252 },
  { a: 260, b: 236, c: -236, d: 260 },
  { a: 267, b: 208, c: -208, d: 267 },
  { a: 271, b: 181, c: -181, d: 271 },
  { a: 274, b: 155, c: -155, d: 274 },
  { a: 276, b: 130, c: -130, d: 276 },
  { a: 276, b: 106, c: -106, d: 276 },
  { a: 274, b: 83, c: -83, d: 274 },
  { a: 271, b: 60, c: -60, d: 271 },
  { a: 267, b: 39, c: -39, d: 267 },
  { a: 262, b: 19, c: -19, d: 262 },
  { a: 256, b: 0, c: 0, d: 256 },
  { a: 262, b: 19, c: -19, d: 262 },
];

const PLAYER_REGISTERS: SleepTalkRegisters = {
  dispcnt: 48960,
  bg0cnt: 38912,
  bg1cnt: 39936,
  bg2cnt: 24066,
  bg3cnt: 23051,
  bldcnt: 0,
  bldalpha: 0,
  bldy: 0,
};
const OPPONENT_REGISTERS: SleepTalkRegisters = {
  dispcnt: 48960,
  bg0cnt: 38912,
  bg1cnt: 23554,
  bg2cnt: 24064,
  bg3cnt: 23051,
  bldcnt: 0,
  bldalpha: 0,
  bldy: 0,
};

function signed16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

/** `Sin(index, 5)` with the ROM's signed arithmetic-right-shift semantics. */
function gbaSin(index: number, amplitude: number): number {
  return (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;
}

export function sleepTalkLetterMatrixAtData0(data0: number): SleepTalkMatrix {
  return LETTER_MATRIX_CYCLE[(data0 - 2) & 31]!;
}

function scriptOffsetAtAge(age: number, frameCount: number): number {
  if (age <= 0) return 0;
  if (age >= frameCount - 1) return 186;
  if (age <= 3) return 3;
  if (age <= 25) return 22;
  if (age <= 33) return 43;
  if (age <= 41) return 60;
  if (age <= 63) return 77;
  if (age <= 71) return 98;
  if (age <= 79) return 115;
  if (age <= 101) return 132;
  if (age <= 109) return 153;
  if (age <= 117) return 170;
  return 185;
}

function scriptWaitAtAge(age: number, frameCount: number): number {
  if (age <= 0 || age >= frameCount - 1) return 0;
  if (age === 1) return 1;
  if (age <= 3) return 0;
  if (age <= 25) return 20 - (age - 4);
  if (age <= 33) return 6 - (age - 26);
  if (age <= 41) return 6 - (age - 34);
  if (age <= 63) return 20 - (age - 42);
  if (age <= 71) return 6 - (age - 64);
  if (age <= 79) return 6 - (age - 72);
  if (age <= 101) return 20 - (age - 80);
  if (age <= 109) return 6 - (age - 102);
  if (age <= 117) return 6 - (age - 110);
  return 1;
}

function swayTaskAtAge(age: number, side: SleepTalkSide): SleepTalkSwayTask | null {
  if (age < 4 || age > 18) return null;
  const amplitude = side === "player" ? 4 : -4;
  const sineIndex = ((age - 3) * 4096) & 0xffff;
  const data10 = signed16(sineIndex);
  const waveIndex = sineIndex >>> 8;
  const data11 = age >= 11 ? 1 : 0;
  const data12 = age >= 11 ? 0 : 1;
  const remainingSways = age >= 11 ? 1 : 2;
  const spriteId = side === "player" ? 6 : 8;
  const battlerId = side === "player" ? 0 : 1;
  return {
    slot: 0,
    callback: "AnimTask_SwayMonStep",
    initialCallback: "AnimTask_SwayMon",
    target: "attacker",
    axis: "horizontal",
    data: [
      0, amplitude, 4096, remainingSways, spriteId, battlerId,
      0, 0, 0, 0, data10, data11, data12, 0, 0, 0,
    ],
    sineIndex,
    waveIndex,
    offsetX2: gbaSin(waveIndex, amplitude),
  };
}

function letterAtAge(
  age: number,
  side: SleepTalkSide,
  center: Readonly<{ x: number; y: number }>,
  index: SleepTalkLetterIndex,
): SleepTalkLetter | null {
  const spawnAge = SLEEP_TALK_LETTER_SPAWN_AGES[index]!;
  const localAge = age - spawnAge;
  if (localAge < 0) return null;
  const sign = side === "player" ? 1 : -1;
  const group = (index < 3 ? 0 : index < 6 ? 1 : 2) as 0 | 1 | 2;
  const data1 = sign * 5;
  const data2 = sign * (group === 0 ? -1 : group === 1 ? -5 : -3);
  const data0 = localAge + 2;
  const data3 = data1 * data0;
  const data4 = data2 * data0;
  const x2 = Math.trunc(data3 / 2);
  const y2 = gbaSin(data0 * 20, 5) + Math.trunc(data4 / 2);
  // AnimLetterZ destroys on the unsigned 16-bit right-edge test. This keeps
  // the player-back lifetime at +65 and the opponent-front lifetime at +68
  // without baking either last-age receipt into the reducer.
  if (((center.x + x2) & 0xffff) > 240) return null;
  const matrixNum = LETTER_MATRICES[index]!;
  const matrix = sleepTalkLetterMatrixAtData0(data0);
  const attr0 = (((center.y + y2 - 16) & 0xff) | 0x100) & 0xffff;
  const attr1 = (((center.x + x2 - 16) & 0x1ff) | (matrixNum << 9) | 0x8000) & 0xffff;
  const oam: SleepTalkOam = {
    attr: [attr0, attr1, 0x7931],
    matrixNum,
    affineMode: "normal",
    objMode: "normal",
    shape: "32x32",
    priority: 2,
    tileNum: 305,
    paletteNum: 7,
  };
  const previous = letterAtAgeWithoutHardware(age - 1, side, center, index);
  return {
    index,
    slot: LETTER_SLOTS[index]!,
    group,
    spawnAge,
    localAge,
    x: center.x,
    y: center.y,
    x2,
    y2,
    data: [data0, data1, data2, data3, data4, 0, 0, 0],
    matrix,
    matrixNum,
    oam,
    hardwareOam: previous?.oam ?? null,
    hardwareMatrix: previous?.matrix ?? IDENTITY,
    template: "gLetterZSpriteTemplate",
    callback: "AnimLetterZ",
  };
}

function letterAtAgeWithoutHardware(
  age: number,
  side: SleepTalkSide,
  center: Readonly<{ x: number; y: number }>,
  index: SleepTalkLetterIndex,
): Omit<SleepTalkLetter, "hardwareOam" | "hardwareMatrix"> | null {
  const spawnAge = SLEEP_TALK_LETTER_SPAWN_AGES[index]!;
  const localAge = age - spawnAge;
  if (localAge < 0) return null;
  const sign = side === "player" ? 1 : -1;
  const group = (index < 3 ? 0 : index < 6 ? 1 : 2) as 0 | 1 | 2;
  const data1 = sign * 5;
  const data2 = sign * (group === 0 ? -1 : group === 1 ? -5 : -3);
  const data0 = localAge + 2;
  const data3 = data1 * data0;
  const data4 = data2 * data0;
  const x2 = Math.trunc(data3 / 2);
  const y2 = gbaSin(data0 * 20, 5) + Math.trunc(data4 / 2);
  if (((center.x + x2) & 0xffff) > 240) return null;
  const matrixNum = LETTER_MATRICES[index]!;
  const matrix = sleepTalkLetterMatrixAtData0(data0);
  const attr0 = (((center.y + y2 - 16) & 0xff) | 0x100) & 0xffff;
  const attr1 = (((center.x + x2 - 16) & 0x1ff) | (matrixNum << 9) | 0x8000) & 0xffff;
  return {
    index,
    slot: LETTER_SLOTS[index]!,
    group,
    spawnAge,
    localAge,
    x: center.x,
    y: center.y,
    x2,
    y2,
    data: [data0, data1, data2, data3, data4, 0, 0, 0],
    matrix,
    matrixNum,
    oam: {
      attr: [attr0, attr1, 0x7931],
      matrixNum,
      affineMode: "normal",
      objMode: "normal",
      shape: "32x32",
      priority: 2,
      tileNum: 305,
      paletteNum: 7,
    },
    template: "gLetterZSpriteTemplate",
    callback: "AnimLetterZ",
  };
}

function lettersAtAge(
  age: number,
  side: SleepTalkSide,
  center: Readonly<{ x: number; y: number }>,
  active: boolean,
): readonly SleepTalkLetter[] {
  if (!active) return [];
  const letters: SleepTalkLetter[] = [];
  for (let index = 0 as SleepTalkLetterIndex; index < 9; index = (index + 1) as SleepTalkLetterIndex) {
    const letter = letterAtAge(age, side, center, index);
    if (letter) letters.push(letter);
  }
  return letters;
}

/**
 * Pure source-relative port of `Move_SLEEP_TALK`'s presentation body.
 * `age=0` is the first pointer-bounded displayed frame and the last age is
 * the first inactive cleanup frame. The reducer never resolves Sleep Talk's
 * chosen move, status, damage, RNG, or controller progression.
 */
export function sleepTalkAtAge(
  age: number,
  side: SleepTalkSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
): SleepTalkState {
  const frameCount = SLEEP_TALK_FRAME_COUNT[side];
  const active = age >= 0 && age < frameCount - 1;
  const letters = lettersAtAge(age, side, attackerCenter, active);
  const swayTask = active ? swayTaskAtAge(age, side) : null;
  const sound = SLEEP_TALK_SNORE_AGES.includes(age as 26 | 64 | 102)
    ? "SE_M_SNORE" as const
    : null;
  const loaded = active && age >= 1;
  return {
    active,
    gAnimScriptActive: active,
    frameCount,
    letterZLoaded: loaded,
    scriptOffset: scriptOffsetAtAge(age, frameCount),
    scriptWait: scriptWaitAtAge(age, frameCount),
    visualTaskCount: letters.length + (swayTask ? 1 : 0),
    soundTaskCount: 0,
    swayTask,
    letters,
    soundRestart: sound,
    soundPanSide: sound ? side : null,
    soundPan: sound ? (side === "player" ? -64 : 63) : null,
    assetTags: {
      tileTag: "ANIM_TAG_LETTER_Z",
      paletteTag: "ANIM_TAG_LETTER_Z",
      tileTagId: 10228,
      paletteTagId: 10228,
      tileLoaded: loaded,
      paletteLoaded: loaded,
    },
    oamBuffer: {
      softwareEntries: 128,
      hardwareEntries: 128,
      matrixEntries: 32,
      hardwareTransferLag: 1,
    },
    registers: side === "player" ? PLAYER_REGISTERS : OPPONENT_REGISTERS,
  };
}
