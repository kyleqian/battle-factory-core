/** Source-relative Scene-ON state for Move_FORESIGHT.
 *
 * This is deliberately expressed in source callback ages and live geometry.
 * It does not retain a framebuffer, an oracle row, or a canonical species.
 */

export type ForesightSide = "player" | "opponent";
export interface ForesightPoint { readonly x: number; readonly y: number }

export interface ForesightBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  /** The ROM's front/back coordinate attributes differ by one pixel here. */
  readonly rightTop?: number;
  readonly leftTop?: number;
}

export interface ForesightMonBgInput {
  readonly layer: "bg1" | "bg2";
  readonly spriteX: number;
  readonly spriteY: number;
  readonly bgX: number;
  readonly bgY: number;
  readonly inBg2: boolean;
  readonly battlerId: 0 | 1;
}

export interface ForesightLiveInputs {
  readonly targetSide: ForesightSide;
  readonly targetSpecies: string;
  readonly attackerSpecies: string;
  readonly targetBounds: ForesightBounds;
  readonly targetPictureOffset: ForesightPoint;
  readonly targetSpriteSlot: number;
  readonly glassSpriteSlot: number;
  readonly blendTaskSlot: number;
  readonly updateMonBgTaskSlot: number;
  readonly clearMonBgTaskSlot: number;
  readonly spriteOrder: readonly number[];
  readonly glassPaletteBank: number;
  readonly glassTileSlot: number;
  readonly matrixBitmap: number;
  readonly monbg: ForesightMonBgInput;
}

export interface ForesightTask {
  readonly slot: number;
  readonly callback: "AnimTask_BlendMonInAndOut_Step" | "Task_UpdateMonBg" | "Task_ClearMonBg";
  readonly data: readonly number[];
}

export interface ForesightGlass {
  readonly slot: number;
  readonly template: "gForesightMagnifyingGlassSpriteTemplate";
  readonly callback: "AnimForesightMagnifyingGlass_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly hFlip: boolean;
  readonly priority: number;
  readonly subpriority: number;
  readonly visible: boolean;
  readonly data: readonly number[];
}

export interface ForesightFrame {
  readonly age: number;
  readonly active: boolean;
  readonly firstInactiveCleanup: boolean;
  readonly source: Readonly<{
    owner: "Move_FORESIGHT";
    offset: 0 | 3 | 5 | 21 | 29 | 31 | 37 | 58 | 62;
    pointer: number;
    pointerParity: 0 | 1;
    wait: number;
  }>;
  readonly glass: ForesightGlass | null;
  readonly blendTask: ForesightTask | null;
  readonly updateMonBgTask: ForesightTask | null;
  readonly clearMonBgTask: ForesightTask | null;
  readonly monbg: Readonly<{
    active: boolean;
    layer: "bg1" | "bg2";
    bgX: number;
    bgY: number;
    registers: Readonly<{ bg1hofs: number; bg1vofs: number; bg2hofs: number; bg2vofs: number }>;
  }>;
  readonly resources: Readonly<{
    glassLoaded: boolean;
    glassPaletteBank: number | null;
    glassTileSlot: number | null;
    matrixBitmap: number;
  }>;
  readonly painterSlots: readonly number[];
  readonly paletteCoefficient: number;
  readonly blendAlpha: Readonly<{ eva: number; evb: number }>;
  readonly audio: Readonly<{ sketch: boolean; detect: boolean }>;
  readonly displayTransfer: Readonly<{ oam: "predecessor"; matrices: "predecessor"; palette: "predecessor" }>;
}

const MOVE_POINTER = 0x082c_d5ed;
const GLASS_POINTERS = new Set([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
  60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,
  79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97,
  98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113,
  114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129,
  130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144]);

function sourceAtAge(age: number): ForesightFrame["source"] {
  let offset: ForesightFrame["source"]["offset"] = 62;
  let wait = 1;
  if (age === 0) { offset = 0; wait = 0; }
  else if (age <= 3) { offset = 3; wait = age === 1 ? 1 : 0; }
  else if (age <= 6) { offset = 5; wait = age === 4 ? 1 : 0; }
  else if (age <= 25) { offset = 21; wait = Math.max(0, 24 - age); }
  else if (age <= 75) { offset = 29; wait = Math.max(0, 74 - age); }
  else if (age <= 101) { offset = 31; wait = Math.max(0, 100 - age); }
  else if (age <= 113) { offset = 37; wait = Math.max(0, 112 - age); }
  else if (age <= 161) { offset = 58; wait = 1; }
  return { owner: "Move_FORESIGHT", offset, pointer: MOVE_POINTER + offset,
    pointerParity: ((MOVE_POINTER + offset) & 1) as 0 | 1, wait };
}

function q8Offset(value: number, progress: number): number {
  const product = Math.abs(value) * progress;
  return value < 0 ? -(product >> 8) : product >> 8;
}

function glassAtAge(age: number, input: Readonly<ForesightLiveInputs>): ForesightGlass | null {
  if (!GLASS_POINTERS.has(age)) return null;
  const b = input.targetBounds;
  const topRight = b.rightTop ?? b.top;
  const topLeft = b.leftTop ?? b.top;
  const p = input.targetPictureOffset;
  const destinations: readonly ForesightPoint[] = [
    { x: b.right - 4, y: b.bottom - 4 }, { x: b.right - 4, y: topRight + 4 },
    { x: b.left + 4, y: b.bottom - 4 }, { x: b.left + 4, y: topLeft - 4 },
    { x: b.right - 4, y: b.bottom - 4 }, p,
  ];
  let x = p.x, y = p.y, x2 = 0, y2 = 0, remaining = 0, leg = 0, stage = 0;
  if (age <= 19) { leg = 0; remaining = 19 - age; const progress = age - 7; x2 = q8Offset(512, progress); y2 = q8Offset(596, progress); stage = 1; }
  else if (age <= 24) { leg = 1; remaining = age - 19; x = destinations[0]!.x; y = destinations[0]!.y; stage = 2; }
  else if (age <= 37) { leg = 1; remaining = 37 - age; x = destinations[0]!.x; y = destinations[0]!.y; const progress = age - 25; x2 = 0; y2 = q8Offset(-1173, progress); stage = 1; }
  else if (age <= 42) { leg = 2; remaining = age - 37; x = destinations[1]!.x; y = destinations[1]!.y; stage = 2; }
  else if (age <= 55) { leg = 2; remaining = 55 - age; x = destinations[1]!.x; y = destinations[1]!.y; const progress = age - 43; x2 = q8Offset(-1025, progress); y2 = q8Offset(1172, progress); stage = 1; }
  else if (age <= 60) { leg = 3; remaining = age - 55; x = destinations[2]!.x; y = destinations[2]!.y; stage = 2; }
  else if (age <= 73) { leg = 3; remaining = 73 - age; x = destinations[2]!.x; y = destinations[2]!.y; const progress = age - 61; x2 = 0; y2 = q8Offset(-1345, progress); stage = 1; }
  else if (age <= 78) { leg = 4; remaining = age - 73; x = destinations[3]!.x; y = destinations[3]!.y; stage = 2; }
  else if (age <= 103) { leg = 4; remaining = 103 - age; x = destinations[3]!.x; y = destinations[3]!.y; const progress = age - 79; x2 = q8Offset(512, progress); y2 = q8Offset(682, progress); stage = 1; }
  else if (age === 104) { leg = 5; x = destinations[4]!.x; y = destinations[4]!.y; stage = 0; }
  else if (age <= 111) { leg = 5; remaining = 111 - age; x = destinations[4]!.x; y = destinations[4]!.y; const progress = age - 105; x2 = q8Offset(-1025, progress); y2 = q8Offset(-1153, progress); stage = 1; }
  else { leg = 5; x = destinations[5]!.x; y = destinations[5]!.y; stage = age === 144 ? 4 : 3; }
  const qx = x2 * 256, qy = y2 * 256;
  const start = leg < 4 ? destinations[Math.max(0, leg - (stage === 1 ? 0 : 1))]! : destinations[leg === 4 ? 3 : 4]!;
  const data = stage === 2 ? [remaining, 0, 0, 0, 0, 2, leg, input.targetSide === "opponent" ? 1 : 0]
    : stage >= 3 ? [Math.max(0, age - 111), 16 - Math.ceil(Math.max(0, age - 112) / 2), Math.floor(Math.max(0, age - 113) / 2), 6150, 6918, stage, leg, input.targetSide === "opponent" ? 1 : 0]
    : [remaining, start.x * 256, start.y * 256, qx, qy, stage, leg, input.targetSide === "opponent" ? 1 : 0];
  return { slot: input.glassSpriteSlot, template: "gForesightMagnifyingGlassSpriteTemplate",
    callback: "AnimForesightMagnifyingGlass_Step", x, y, x2, y2,
    hFlip: input.targetSide === "opponent", priority: input.monbg.inBg2 ? 1 : 0,
    subpriority: input.targetSide === "opponent" ? 38 : 28, visible: age < 144, data };
}

function blendCoefficient(age: number): number {
  if (age < 114 || age > 160) return 0;
  return age <= 138 ? Math.min(12, Math.trunc((age - 113) / 2)) : Math.max(1, Math.ceil((161 - age) / 2));
}

export function foresightAtAge(age: number, input: Readonly<ForesightLiveInputs>): ForesightFrame {
  if (!Number.isInteger(age)) throw new Error("Foresight age must be an integer");
  if (age < 0) return { ...foresightAtAge(0, input), age, active: false, firstInactiveCleanup: false };
  const source = sourceAtAge(age);
  const active = age < 166;
  const monbgActive = age >= 4 && age <= 164;
  const clear = age >= 162 && age <= 164;
  const coefficient = blendCoefficient(age);
  const eva = age < 113 ? 16 : age <= 144 ? Math.max(0, 16 - Math.ceil((age - 112) / 2)) : 0;
  const evb = age < 113 ? 0 : age <= 144 ? Math.min(16, Math.floor((age - 112) / 2)) : 16;
  const mon = input.monbg;
  const monData = [input.targetSpriteSlot, mon.spriteX, mon.spriteY, mon.bgX, mon.bgY,
    mon.inBg2 ? 1 : 0, mon.battlerId, 0];
  const clearData = [0, age - 161, mon.battlerId, 0];
  const blendData = [input.targetSide === "opponent" ? 273 : 257, 0x7fff, coefficient,
    12, (age - 114) & 1, 2, coefficient >= 12 ? 1 : 0, 1];
  return {
    age, active, firstInactiveCleanup: age === 166, source,
    glass: glassAtAge(age, input),
    blendTask: age >= 114 && age <= 160 ? { slot: input.blendTaskSlot, callback: "AnimTask_BlendMonInAndOut_Step", data: blendData } : null,
    updateMonBgTask: monbgActive ? { slot: input.updateMonBgTaskSlot, callback: "Task_UpdateMonBg", data: monData } : null,
    clearMonBgTask: clear ? { slot: input.clearMonBgTaskSlot, callback: "Task_ClearMonBg", data: clearData } : null,
    monbg: { active: monbgActive && !clear, layer: mon.layer, bgX: mon.bgX, bgY: mon.bgY,
      registers: { bg1hofs: mon.layer === "bg1" ? (mon.bgX & 0x1ff) : 0, bg1vofs: mon.layer === "bg1" ? (mon.bgY & 0x1ff) : 0,
        bg2hofs: mon.layer === "bg2" ? (mon.bgX & 0x1ff) : 0, bg2vofs: mon.layer === "bg2" ? (mon.bgY & 0x1ff) : 0 } },
    resources: { glassLoaded: age >= 1 && age < 166, glassPaletteBank: age >= 1 && age < 166 ? input.glassPaletteBank : null,
      glassTileSlot: age >= 1 && age < 166 ? input.glassTileSlot : null, matrixBitmap: input.matrixBitmap },
    painterSlots: age >= 7 && age <= 144 ? input.spriteOrder : input.spriteOrder,
    paletteCoefficient: coefficient, blendAlpha: { eva, evb },
    audio: { sketch: age >= 26 && age <= 73, detect: age >= 114 },
    displayTransfer: { oam: "predecessor", matrices: "predecessor", palette: "predecessor" },
  };
}
