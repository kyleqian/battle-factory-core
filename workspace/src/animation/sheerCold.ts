/**
 * Source-relative semantic reducer for MOVE_SHEER_COLD.
 *
 * This is the pointer-owned presentation body, not the OHKO resolver.  The
 * battle engine supplies the live battlers and allocation state; this module
 * only describes the source script, visual tasks, hardware-facing transfer
 * latches, and FrozenIceCube's off-affine presentation.
 */
import sheerColdAsset from "./assets/sheer-cold.json" with { type: "json" };

export type SheerColdSide = "player" | "opponent";
export type SheerColdBgLayer = "bg1" | "bg2";
export interface SheerColdPoint { readonly x: number; readonly y: number; }
export type SheerColdMatrix = readonly [number, number, number, number];
export interface SheerColdBattlerSprite {
  readonly slot: number;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: SheerColdMatrix;
}
/** The fields BuildSpritePriorities/SortSprites read from a live sprite. */
export interface SheerColdPainterSprite {
  readonly slot: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly y: number;
  readonly affineDouble?: boolean;
  readonly largeAffine?: boolean;
}
export interface SheerColdResourceAllocation {
  readonly paletteBank: number;
  readonly tileSlot: number;
  readonly tileRange: readonly [number, number];
}

export interface SheerColdLiveInputs {
  readonly attackerSide: SheerColdSide;
  readonly targetSide: SheerColdSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** `BATTLER_COORD_X_2` / `BATTLER_COORD_Y_PIC_OFFSET` for the target. */
  readonly targetAnimationCenter?: Readonly<SheerColdPoint>;
  /** Live sprite coordinates used by MoveBattlerSpriteToBG/Task_UpdateMonBg. */
  readonly targetBattlePositionCenter: Readonly<SheerColdPoint>;
  readonly attackerSprite: SheerColdBattlerSprite;
  readonly targetSprite: SheerColdBattlerSprite;
  readonly cubeSpriteSlot: number;
  readonly taskSlots: Readonly<{
    readonly fadeToBg: number;
    readonly cube: number;
    readonly updateMonBg: number;
    readonly sound: number;
    readonly clearMonBg: number;
    readonly restoreBg: number;
  }>;
  readonly resources: Readonly<{ readonly iceCube: SheerColdResourceAllocation }>;
  readonly matrixBitmap: number;
  /** Existing source `SortSprites` order before the cube allocation. */
  readonly spriteOrder: readonly number[];
  /** Optional live records for replaying the source's insertion sort. */
  readonly painterSprites?: readonly SheerColdPainterSprite[];
  readonly monbg: Readonly<{
    readonly layer: SheerColdBgLayer;
    readonly scroll: Readonly<SheerColdPoint>;
  }>;
  readonly background?: Readonly<{
    readonly bg1Cnt?: number;
    readonly bg2Cnt?: number;
  }>;
  /** Sheer Cold itself consumes no animation RNG; these are carried for audit. */
  readonly animationRng?: number;
  readonly gameplayRng?: unknown;
  /** Optional source-relative fade endpoint for a decoded hardware profile. */
  readonly restoreFadeEndAge?: number;
}

export const SHEER_COLD_SOURCE_START = 0x082d5242;
export const SHEER_COLD_SOURCE_END = 0x082d5267;
export const SHEER_COLD_FIRST_RESOURCE_AGE = 39;
export const SHEER_COLD_CUBE_TASK_START_AGE = 45;
export const SHEER_COLD_CUBE_SPRITE_END_AGE = 146;
export const SHEER_COLD_CUBE_SOFTWARE_OAM_END_AGE = 147;
export const SHEER_COLD_CUBE_HARDWARE_OAM_END_AGE = 148;
export const SHEER_COLD_FIRST_INACTIVE_AGE_BY_TARGET: Readonly<Record<SheerColdSide, number>> = {
  player: 190,
  opponent: 191,
};
const IDENTITY: SheerColdMatrix = [256, 0, 0, 256];
const ICE_CUBE_TAG = (sheerColdAsset.resources.iceCube as { tag: number }).tag;
const BG_ICE_ID = (sheerColdAsset.resources.iceBackground as { id: number }).id;

export interface SheerColdSourceCursor {
  readonly owner: "Move_SHEER_COLD";
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly active: boolean;
  readonly wait: number;
}

export interface SheerColdTask {
  readonly slot: number;
  readonly callback:
    | "Task_FadeToBg"
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg"
    | "Task_WaitAndPlaySE"
    | "AnimTask_FrozenIceCube_Step1"
    | "AnimTask_FrozenIceCube_Step2"
    | "AnimTask_FrozenIceCube_Step3"
    | "AnimTask_FrozenIceCube_Step4";
  readonly data: readonly number[];
  readonly role: "fade-to-bg" | "restore-bg" | "monbg" | "clear-monbg" | "sound" | "cube";
}

export interface SheerColdCubeSprite {
  readonly kind: "frozen-ice-cube";
  readonly slot: number;
  readonly template: "sFrozenIceCubeSpriteTemplate";
  readonly callback: "SpriteCallbackDummy";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly matrixNum: 0;
  readonly matrix: SheerColdMatrix;
  readonly subpriority: 4;
  readonly flags: 1;
  readonly data: readonly number[];
}

export interface SheerColdCubeSubsprite {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: 32;
  readonly height: 32;
  readonly tileOffset: number;
  readonly priority: 2;
  readonly flipX: boolean;
  readonly flipY: boolean;
}

export interface SheerColdState {
  readonly age: number;
  readonly active: boolean;
  readonly source: SheerColdSourceCursor;
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ side: SheerColdSide; species: string; sprite: SheerColdBattlerSprite }>;
    readonly target: Readonly<{ side: SheerColdSide; species: string; sprite: SheerColdBattlerSprite; center: SheerColdPoint; animationCenter: SheerColdPoint }>;
  }>;
  readonly sprites: readonly SheerColdCubeSprite[];
  readonly subsprites: Readonly<{ readonly software: readonly SheerColdCubeSubsprite[]; readonly hardware: readonly SheerColdCubeSubsprite[] }>;
  readonly tasks: readonly SheerColdTask[];
  readonly resources: Readonly<{
    readonly iceCube: Readonly<SheerColdResourceAllocation & { readonly tag: number | null; readonly loaded: boolean; readonly paletteRotation: number }>;
    readonly allocator: Readonly<{ readonly matrixBitmap: number; readonly matrixSlots: readonly number[]; readonly affineAllocated: false }>;
  }>;
  readonly background: Readonly<{
    readonly id: number;
    readonly layer: SheerColdBgLayer;
    readonly monbg: boolean;
    readonly targetVisible: boolean;
    readonly vram: "battle" | "ice" | "target-monbg" | "clear-pending" | "battle-cleared" | "battle-restored";
    readonly softwareScroll: SheerColdPoint;
    readonly hardwareScroll: SheerColdPoint;
    readonly splitPriority: Readonly<{ readonly bg1: number; readonly bg2: number }>;
  }>;
  readonly registers: Readonly<{
    readonly bldcnt: number;
    readonly bldalpha: number;
    readonly bldy: number;
    readonly bg1hofs: number;
    readonly bg1vofs: number;
    readonly bg2hofs: number;
    readonly bg2vofs: number;
    readonly bg1cnt: number;
    readonly bg2cnt: number;
  }>;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software";
    readonly palette: "initial" | "preceding-faded" | "same-row-monbg-setup";
  }>;
  readonly palette: Readonly<{ readonly cubeRotation: number; readonly fadedWrite: boolean; readonly hardwareWrite: boolean }>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{ readonly age: number; readonly sound: "SE_M_ICY_WIND" | "SE_M_HAIL"; readonly pan: number }>[];
  readonly rng: Readonly<{ readonly animation: number | null; readonly sourceDraws: 0; readonly gameplay: unknown; readonly gameplayUnchanged: true }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: number; readonly ownedSprites: number; readonly resourcesReleased: boolean }>;
}

function integerAge(age: number): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Sheer Cold source age ${age}`);
}

function restoreEndAge(input: SheerColdLiveInputs): number {
  return input.restoreFadeEndAge ?? (input.targetSide === "opponent" ? 189 : 188);
}

export function sheerColdFirstInactiveAge(input: Readonly<SheerColdLiveInputs>): number {
  return restoreEndAge(input) + 2;
}

export function sheerColdSourceAtAge(age: number, input: Readonly<SheerColdLiveInputs>): SheerColdSourceCursor {
  integerAge(age);
  const inactiveAge = sheerColdFirstInactiveAge(input);
  let pointerOffset: number;
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 20) { pointerOffset = 2; wait = 1; }
  else if (age < 39) { pointerOffset = 7; wait = 1; }
  else if (age < 42) { pointerOffset = 11; wait = age === 39 ? 1 : 0; }
  else if (age < 45) { pointerOffset = 13; wait = age === 42 ? 1 : 0; }
  else if (age < 150) { pointerOffset = 30; wait = 1; }
  else if (age < inactiveAge) { pointerOffset = 35; wait = 1; }
  else { pointerOffset = 36; wait = 0; }
  return { owner: "Move_SHEER_COLD", pointer: SHEER_COLD_SOURCE_START + pointerOffset, pointerOffset, active: age < inactiveAge, wait };
}

function alphaAtAge(age: number): number {
  if (age < 45 || age >= 150) return 0;
  let eva: number;
  if (age <= 54) eva = age - 45;
  else if (age <= 101) eva = 9;
  else eva = Math.max(0, 110 - age);
  return eva | ((16 - eva) << 8);
}

function bldyAtAge(age: number, restoreEnd: number): number {
  if (age >= 2 && age <= 37) {
    if (age <= 18) return Math.max(0, age - 2);
    if (age <= 21) return 16;
    return 37 - age;
  }
  if (age < 151 || age > restoreEnd) return 0;
  if (age === 151) return 0;
  if (age <= 154) return 1;
  if (age <= 169) return age - 153;
  const downStart = restoreEnd - 15;
  if (age < downStart) return 16;
  return Math.max(0, restoreEnd - age);
}

function cubeRotationAtAge(age: number): number {
  return [71, 74, 77, 94, 97, 100].filter((edge) => age >= edge).length;
}

function cubeTask(age: number, input: SheerColdLiveInputs): SheerColdTask | null {
  if (age < 45 || age > 148) return null;
  let callback: SheerColdTask["callback"];
  let data1: number;
  let data2 = 0;
  let data3 = 0;
  let data4 = 0;
  if (age <= 53) {
    callback = "AnimTask_FrozenIceCube_Step1";
    data1 = age - 44;
  } else if (age <= 99) {
    callback = "AnimTask_FrozenIceCube_Step2";
    const cycleStart = age < 77 ? 54 : 77;
    const local = age - cycleStart;
    data1 = local;
    data2 = local >= 14 ? (local - 14) % 3 : 0;
    const rotations = cubeRotationAtAge(age);
    data3 = rotations % 3;
    data4 = Math.floor(rotations / 3);
  } else if (age <= 109) {
    callback = "AnimTask_FrozenIceCube_Step3";
    data1 = 109 - age;
    data4 = 2;
  } else {
    callback = "AnimTask_FrozenIceCube_Step4";
    data1 = age - 110;
    data4 = 2;
  }
  const data = Array.from({ length: 16 }, () => 0);
  data[1] = data1; data[2] = data2; data[3] = data3; data[4] = data4; data[15] = input.cubeSpriteSlot;
  return { slot: input.taskSlots.cube, callback, data, role: "cube" };
}

function fadeTask(slot: number, restore: boolean, age: number, restoreEnd: number): SheerColdTask {
  const data = Array.from({ length: 16 }, () => 0);
  data[0] = restore ? -1 : BG_ICE_ID;
  data[10] = restore
    ? age < 170 ? 1 : age < restoreEnd - 17 ? 2 : 3
    : age < 19 ? 1 : age < 20 ? 2 : 3;
  return { slot, callback: "Task_FadeToBg", data, role: restore ? "restore-bg" : "fade-to-bg" };
}

function taskList(age: number, input: SheerColdLiveInputs, inactiveAge: number): SheerColdTask[] {
  if (age >= inactiveAge) return [];
  const tasks: SheerColdTask[] = [];
  const restoreEnd = restoreEndAge(input);
  if (age >= 1 && age <= 37) tasks.push(fadeTask(input.taskSlots.fadeToBg, false, age, restoreEnd));
  if (age >= 42 && age <= 152) {
    const data = Array.from({ length: 16 }, () => 0);
    data[0] = input.targetSprite.slot;
    data[1] = input.targetBattlePositionCenter.x;
    data[2] = input.targetBattlePositionCenter.y;
    data[3] = input.monbg.scroll.x;
    data[4] = input.monbg.scroll.y;
    data[5] = input.monbg.layer === "bg2" ? 1 : 0;
    data[6] = input.targetSide === "opponent" ? 1 : 0;
    tasks.push({ slot: input.taskSlots.updateMonBg, callback: "Task_UpdateMonBg", data, role: "monbg" });
  }
  const cube = cubeTask(age, input);
  if (cube) tasks.push(cube);
  if (age >= 45 && age <= 61) {
    const data = Array.from({ length: 16 }, () => 0);
    data[0] = 242; data[1] = input.targetSide === "opponent" ? 63 : -63; data[2] = 16 - (age - 45);
    tasks.push({ slot: input.taskSlots.sound, callback: "Task_WaitAndPlaySE", data, role: "sound" });
  }
  if (age >= 150 && age <= 152) {
    const data = Array.from({ length: 16 }, () => 0);
    data[1] = age === 150 ? 1 : 2;
    data[2] = input.targetSide === "opponent" ? 1 : 0;
    tasks.push({ slot: input.taskSlots.clearMonBg, callback: "Task_ClearMonBg", data, role: "clear-monbg" });
  }
  if (age >= 150 && age <= restoreEnd) tasks.push(fadeTask(input.taskSlots.restoreBg, true, age, restoreEnd));
  return tasks.sort((left, right) => left.slot - right.slot);
}

function cubeSprite(age: number, input: SheerColdLiveInputs): SheerColdCubeSprite | null {
  if (age < 45 || age > SHEER_COLD_CUBE_SPRITE_END_AGE) return null;
  const center = input.targetAnimationCenter ?? input.targetBattlePositionCenter;
  const data = Array.from({ length: 8 }, () => 0);
  return {
    kind: "frozen-ice-cube", slot: input.cubeSpriteSlot, template: "sFrozenIceCubeSpriteTemplate",
    callback: "SpriteCallbackDummy", x: center.x - 32, y: center.y - 36, x2: 0, y2: 0,
    matrixNum: 0, matrix: IDENTITY, subpriority: 4, flags: 1, data,
  };
}

function cubeSubsprites(age: number, input: SheerColdLiveInputs): SheerColdState["subsprites"] {
  const software = age >= 45 && age <= SHEER_COLD_CUBE_SOFTWARE_OAM_END_AGE;
  const hardware = age >= 46 && age <= SHEER_COLD_CUBE_HARDWARE_OAM_END_AGE;
  const center = input.targetAnimationCenter ?? input.targetBattlePositionCenter;
  const x = center.x - 32, y = center.y - 36;
  const offsets = sheerColdAsset.subsprites.map((piece) => [piece.x, piece.y] as const);
  const tiles = sheerColdAsset.subsprites.map((piece) => piece.tileOffset);
  const make = (): SheerColdCubeSubsprite[] => offsets.map(([dx, dy], index) => ({
    index, x: x + dx, y: y + dy, width: 32, height: 32, tileOffset: tiles[index]!, priority: 2,
    flipX: false, flipY: false,
  }));
  return { software: software ? make() : [], hardware: hardware ? make() : [] };
}

function painterOrder(age: number, input: SheerColdLiveInputs): number[] {
  if (!input.painterSprites) {
    const cubeInOam = age >= 45 && age <= SHEER_COLD_CUBE_SOFTWARE_OAM_END_AGE;
    if (!cubeInOam) return [...input.spriteOrder];
    const base = input.spriteOrder.filter((slot) => slot !== input.cubeSpriteSlot);
    const index = Math.max(0, base.indexOf(input.attackerSprite.slot));
    return [...base.slice(0, index), input.cubeSpriteSlot, ...base.slice(index)];
  }

  // This is the source SortSprites insertion pass.  Unlisted slots are the
  // reset dummy sprite (subpriority 0xff, OAM priority 3), so a destroyed
  // cube naturally settles among the other dummy slots in stable order.
  const records = new Map(input.painterSprites.map((record) => [record.slot, record]));
  const cubeLive = age >= 45 && age <= SHEER_COLD_CUBE_SPRITE_END_AGE + 1;
  const cube = cubeLive
    ? { slot: input.cubeSpriteSlot, subpriority: 4, oamPriority: 2, y: (input.targetAnimationCenter ?? input.targetBattlePositionCenter).y - 32 }
    : null;
  const sort = (start: readonly number[], current: ReadonlyMap<number, SheerColdPainterSprite>): number[] => {
    const priority = (slot: number): number => {
      const record = current.get(slot);
      return record ? (record.subpriority | (record.oamPriority << 8)) : (0xff | (3 << 8));
    };
    const sortY = (slot: number): number => {
      const record = current.get(slot);
      if (!record) return 160;
      // The only large affine source sprite is not part of this move, but
      // keep the exact source wrap rule available to live callers.
      let y = record.y;
      if (y >= 160) y -= 256;
      if (record.affineDouble && record.largeAffine && y > 128) y -= 256;
      return y;
    };
    const order = [...start];
    for (let i = 1; i < order.length; i += 1) {
      let j = i;
      while (j > 0) {
        const left = order[j - 1]!;
        const right = order[j]!;
        const shouldSwap = priority(left) > priority(right)
          || (priority(left) === priority(right) && sortY(left) < sortY(right));
        if (!shouldSwap) break;
        [order[j - 1], order[j]] = [order[j]!, order[j - 1]!];
        j -= 1;
      }
    }
    return order;
  };
  if (cube) {
    records.set(cube.slot, cube);
    return sort(input.spriteOrder, records);
  }
  records.delete(input.cubeSpriteSlot);
  // DestroySprite resets the cube while preserving the order produced by the
  // preceding BuildOamBuffer pass.  Replaying that prior pass is what makes
  // the reset dummy settle before the next pre-existing dummy slot.
  const preDestroy = age >= SHEER_COLD_CUBE_SPRITE_END_AGE + 2
    ? sort(input.spriteOrder, new Map([...records, [input.cubeSpriteSlot, {
      slot: input.cubeSpriteSlot, subpriority: 4, oamPriority: 2,
      y: (input.targetAnimationCenter ?? input.targetBattlePositionCenter).y - 32,
    }]]))
    : input.spriteOrder;
  return sort(preDestroy, records);
}

function hardwareOffset(point: SheerColdPoint): SheerColdPoint {
  // The GBA display registers retain the low nine bits of the signed
  // background offset.  This is the value exposed by the source's REG_BGnHOFS
  // / REG_BGnVOFS writes, rather than a widened host integer.
  return { x: point.x & 0x1ff, y: point.y & 0x1ff };
}

/** Pure source-relative reducer through the first fully clean inactive row. */
export function sheerColdAtAge(age: number, input: Readonly<SheerColdLiveInputs>): SheerColdState {
  integerAge(age);
  const inactiveAge = sheerColdFirstInactiveAge(input);
  const source = sheerColdSourceAtAge(age, input);
  const restoreEnd = restoreEndAge(input);
  const cube = cubeSprite(age, input);
  const subsprites = cubeSubsprites(age, input);
  const tasks = taskList(age, input, inactiveAge);
  const activeMonbg = age >= 42 && age <= 152 && age < inactiveAge;
  const layer = input.monbg.layer;
  const hardwareScrollAge = layer === "bg1" ? 42 : 43;
  const hardwareScroll = age >= hardwareScrollAge && age < 154 ? input.monbg.scroll : { x: 0, y: 0 };
  const softwareScroll = age >= 42 && age <= 152 ? { ...input.monbg.scroll } : { x: 0, y: 0 };
  const baseBg1 = input.background?.bg1Cnt ?? 39936;
  const baseBg2 = input.background?.bg2Cnt ?? 24064;
  // MoveBattlerSpriteToBG changes the selected BG's control register during
  // setup.  The source does not restore that register when the task clears;
  // restorebg only returns the image/palette/VRAM state.
  const bg1cnt = layer === "bg1" && age >= 42 ? 23554
    : layer === "bg2" && age >= 45 ? (baseBg1 | 1) : baseBg1;
  const bg2cnt = layer === "bg2" && age >= 43 ? (baseBg2 | 2) : baseBg2;
  const bldcnt = age >= 45 && age <= 149 ? 16192
    : age >= 2 && age <= 37 ? 232
      : age >= 151 && age <= restoreEnd ? 232 : 0;
  const vram: SheerColdState["background"]["vram"] = age < 20 ? "battle"
    : age < 43 ? "ice" : age < 152 ? "target-monbg" : age < 154 ? "clear-pending"
      : age < 171 ? "battle-cleared" : "battle-restored";
  const audio = age === 20
    ? [{ age, sound: "SE_M_ICY_WIND" as const, pan: 0 }]
    : age === 62
      ? [{ age, sound: "SE_M_HAIL" as const, pan: input.targetSide === "opponent" ? 63 : -63 }]
      : [];
  const targetVisible = age < 42 || age >= 150;
  const displayTransfer = {
    oam: age === 0 ? "initial" as const : "preceding-software" as const,
    matrices: age === 0 ? "initial" as const : "preceding-software" as const,
    palette: age === 0 ? "initial" as const : age === 42 ? "same-row-monbg-setup" as const : "preceding-faded" as const,
  };
  const active = source.active;
  const sourceDraws = 0 as const;
  return {
    age, active, source,
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: input.attackerSprite },
      target: {
        side: input.targetSide, species: input.targetSpecies, sprite: input.targetSprite,
        center: { ...input.targetBattlePositionCenter }, animationCenter: { ...(input.targetAnimationCenter ?? input.targetBattlePositionCenter) },
      },
    },
    sprites: cube ? [cube] : [],
    subsprites,
    tasks,
    resources: {
      iceCube: {
        ...input.resources.iceCube, tag: age >= SHEER_COLD_FIRST_RESOURCE_AGE && age < inactiveAge ? ICE_CUBE_TAG : null,
        loaded: age >= SHEER_COLD_FIRST_RESOURCE_AGE && age < inactiveAge,
        paletteRotation: cubeRotationAtAge(age),
      },
      allocator: { matrixBitmap: input.matrixBitmap, matrixSlots: [0], affineAllocated: false },
    },
    background: {
      id: BG_ICE_ID, layer, monbg: activeMonbg, targetVisible, vram,
      softwareScroll, hardwareScroll,
      splitPriority: layer === "bg1"
        ? { bg1: age >= 42 ? 2 : 0, bg2: 0 }
        : { bg1: age >= 45 ? 1 : 0, bg2: age >= 43 ? 2 : 0 },
    },
    registers: {
      bldcnt, bldalpha: alphaAtAge(age), bldy: bldyAtAge(age, restoreEnd),
      bg1hofs: layer === "bg1" ? hardwareOffset(hardwareScroll).x : 0,
      bg1vofs: layer === "bg1" ? hardwareOffset(hardwareScroll).y : 0,
      bg2hofs: layer === "bg2" ? hardwareOffset(hardwareScroll).x : 0,
      bg2vofs: layer === "bg2" ? hardwareOffset(hardwareScroll).y : 0,
      bg1cnt, bg2cnt,
    },
    displayTransfer,
    palette: { cubeRotation: cubeRotationAtAge(age), fadedWrite: age >= 39 && age < inactiveAge, hardwareWrite: age > 39 && age < inactiveAge },
    painterOrder: painterOrder(age, input),
    audio,
    rng: { animation: input.animationRng ?? null, sourceDraws, gameplay: input.gameplayRng, gameplayUnchanged: true },
    cleanup: {
      firstInactive: age === inactiveAge, visualTasks: age >= 45 && age <= 148 && active ? 1 : 0,
      soundTasks: age >= 45 && age <= 61 && active ? 1 : 0,
      ownedSprites: cube ? 1 : 0,
      resourcesReleased: age >= inactiveAge,
    },
  };
}

export const SHEER_COLD_ICE_CUBE_TAG = ICE_CUBE_TAG;
export const SHEER_COLD_BG_ICE_ID = BG_ICE_ID;
