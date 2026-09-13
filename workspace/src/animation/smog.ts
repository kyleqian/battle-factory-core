/**
 * Source-relative semantic reducer for MOVE_SMOG.
 *
 * This is deliberately presentation-only. The caller supplies live battler
 * facts, allocator slots, background configuration, and painter seed; the
 * reducer follows the complete pointer-owned Move_SMOG root through its first
 * inactive cleanup row without consulting a scenario, framebuffer, or battle
 * outcome.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  spriteSlotForOwner,
  type SpriteOrderKey,
} from "./spriteOrder.ts";
import smogAsset from "./assets/smog.json" with { type: "json" };

export type SmogSide = "player" | "opponent";
export type SmogBgLayer = "bg1" | "bg2";
export interface SmogPoint { readonly x: number; readonly y: number; }
export type SmogMatrix = readonly [number, number, number, number];
export interface SmogBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  /** Resting source `sprite->x2/y2`, before this move's ShakeMon2 writes it. */
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: SmogMatrix;
}
/** Fields consumed by the source `SortSprites` pass. */
export interface SmogPainterSprite {
  readonly slot: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly oamY: number;
  readonly affineMode?: "off" | "normal" | "double";
  readonly oamSize?: 0 | 1 | 2 | 3;
  readonly oamShape?: "square" | "horizontal" | "vertical";
}
export interface SmogResourceAllocation {
  readonly paletteBank: number;
  readonly tileSlot: number;
  readonly tileRange: readonly [number, number];
}

export interface SmogLiveInputs {
  readonly attackerSide: SmogSide;
  readonly targetSide: SmogSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** Source `GetBattlerSpriteCoord2(X/Y)` target point, supplied live. */
  readonly targetPictureOrigin: Readonly<SmogPoint>;
  /** Live `GetBattlerSpriteBGPriority(target)` result after monbg/split setup. */
  readonly targetBgPriority: number;
  readonly attackerSprite: SmogBattlerSprite;
  readonly targetSprite: SmogBattlerSprite;
  /** Seven source CreateSprite allocations, in SmogCloud call order. */
  readonly cloudSpriteSlots: readonly number[];
  readonly taskSlots: Readonly<{
    readonly updateMonBg: number;
    readonly mistSound: number;
    readonly blendColorCycle: number;
    readonly shakeMon2: number;
    readonly toxicSound: number;
    readonly clearMonBg: number;
  }>;
  readonly resources: Readonly<{ readonly purpleGasCloud: SmogResourceAllocation }>;
  readonly matrixBitmap: number;
  /** Live persistent `sSpriteOrder` seed, not retained output order. */
  readonly spriteOrder: readonly number[];
  readonly painterSprites: readonly SmogPainterSprite[];
  readonly monbg: Readonly<{
    readonly layer: SmogBgLayer;
    /** `Task_UpdateMonBg` setup's source `t2_BgX/Y`. */
    readonly scroll: Readonly<SmogPoint>;
  }>;
  /** All control values are live scene inputs, including split configuration. */
  readonly background: Readonly<{
    readonly baseBg1Cnt: number;
    readonly baseBg2Cnt: number;
    readonly monbgBg1Cnt: number;
    readonly monbgBg2Cnt: number;
    readonly splitBg1Cnt: number;
    readonly splitBg2Cnt: number;
  }>;
  /** Target's OBJ palette selected by F_PAL_TARGET. */
  readonly targetPaletteBank: number;
  /** Presentation RNG clock seed; gameplay RNG is only carried through. */
  readonly animationRngSeed: number;
  readonly gameplayRng: unknown;
}

export const SMOG_SOURCE_START = 0x082d01e5;
export const SMOG_SOURCE_END = 0x082d0260;
export const SMOG_FIRST_INACTIVE_AGE = 305;
export const SMOG_PURPLE_GAS_CLOUD_TAG = (smogAsset.resources.purpleGasCloud as { tag: number }).tag;
const IDENTITY: SmogMatrix = [256, 0, 0, 256];
const CLOUD_SPAWN_AGES = [7, 16, 25, 34, 43, 52, 61] as const;
const CLOUD_DURATION = 239;
const TARGET_PALETTE_EDGES = [196, 200, 204, 208, 212, 216, 226, 230, 234, 238, 242, 246] as const;

export interface SmogSourceCursor {
  readonly owner: "Move_SMOG";
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly active: boolean;
  readonly wait: number;
}
export interface SmogCloudSprite {
  readonly kind: "purple-gas-cloud";
  readonly index: number;
  readonly slot: number;
  readonly template: "gSmogCloudSpriteTemplate";
  readonly callback: "AnimSwirlingFogAnim";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly oamPriority: number;
  readonly subpriority: number;
  readonly matrixNum: 0;
  readonly matrix: SmogMatrix;
  readonly flags: 1;
  readonly animCmdIndex: 0 | 1;
  readonly animDelayCounter: number;
  readonly data: readonly number[];
}
export interface SmogTask {
  readonly slot: number;
  readonly callback: "Task_UpdateMonBg" | "Task_LoopAndPlaySE" | "AnimTask_BlendColorCycleLoop" | "AnimTask_ShakeMon2_Step" | "Task_ClearMonBg";
  readonly role: "monbg" | "mist-sound" | "toxic-sound" | "target-palette" | "shake" | "clear-monbg";
  readonly data: readonly number[];
}
export interface SmogState {
  readonly age: number;
  readonly active: boolean;
  readonly source: SmogSourceCursor;
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ side: SmogSide; species: string; sprite: SmogBattlerSprite }>;
    readonly target: Readonly<{ side: SmogSide; species: string; sprite: SmogBattlerSprite; pictureOrigin: SmogPoint; shake: SmogPoint }>;
  }>;
  readonly sprites: readonly SmogCloudSprite[];
  readonly tasks: readonly SmogTask[];
  readonly resources: Readonly<{
    readonly purpleGasCloud: Readonly<SmogResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly allocator: Readonly<{ readonly matrixBitmap: number; readonly matrixSlots: readonly number[]; readonly affineAllocated: false }>;
  }>;
  readonly background: Readonly<{
    readonly layer: SmogBgLayer;
    readonly monbg: boolean;
    readonly clearPending: boolean;
    readonly targetVisible: boolean;
    readonly softwareScroll: SmogPoint;
    readonly hardwareScroll: SmogPoint;
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
  readonly palette: Readonly<{
    readonly purpleGasCloud: Readonly<{ readonly fadedWrite: boolean; readonly hardwareWrite: boolean }>;
    readonly target: Readonly<{ readonly bank: number; readonly selector: "F_PAL_TARGET"; readonly blendAmount: number; readonly fadedWrite: boolean; readonly hardwareWrite: boolean }>;
  }>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{
    readonly sound: "SE_M_MIST" | "SE_M_TOXIC";
    readonly id: number;
    readonly pan: number;
    readonly startAge: number;
    readonly interval: number;
    readonly plays: number;
    readonly active: boolean;
  }>[];
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayUnchanged: true }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: number; readonly ownedSprites: number; readonly resourcesReleased: boolean }>;
}

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Smog source age ${age}`);
}
function zeroData(): number[] { return Array.from({ length: 16 }, () => 0); }
function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}
function stepRng(seed: number): number { return (Math.imul(seed, 1103515245) + 24691) >>> 0; }
function rngAtAge(seed: number, age: number): number {
  let value = seed >>> 0;
  for (let index = 0; index < age; index += 1) value = stepRng(value);
  return value;
}
function animationDrawsAtAge(age: number): number {
  // The source's two clear-monbg task frames (303/304) do not advance the
  // animation RNG clock; the terminal root dispatch resumes it on age 305.
  if (age <= 302) return age;
  return age <= 304 ? 302 : age - 2;
}

/** Pointer/cursor model for the root and its seven source subroutine calls. */
export function smogSourceAtAge(age: number): SmogSourceCursor {
  assertAge(age);
  let pointerOffset: number;
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 7) { pointerOffset = 5; wait = age === 4 ? 1 : 0; }
  else if (age < 70) {
    pointerOffset = 122;
    const local = (age - 7) % 9;
    wait = local === 0 ? 7 : local <= 7 ? 7 - local : 0;
  } else if (age < 192) { pointerOffset = 52; wait = age < 191 ? 120 - (age - 70) : 0; }
  else if (age < 204) { pointerOffset = 79; wait = age === 192 ? 10 : Math.max(0, 10 - (age - 192)); }
  else if (age < 301) { pointerOffset = 96; wait = 1; }
  else { pointerOffset = 100; wait = 1; }
  return {
    owner: "Move_SMOG", pointer: SMOG_SOURCE_START + pointerOffset, pointerOffset,
    active: age < SMOG_FIRST_INACTIVE_AGE, wait,
  };
}

function cloudAtAge(age: number, index: number, input: Readonly<SmogLiveInputs>): SmogCloudSprite | null {
  const spawn = CLOUD_SPAWN_AGES[index];
  const slot = input.cloudSpriteSlots[index];
  if (spawn === undefined || slot === undefined) throw new Error("Smog requires seven live cloud allocation slots");
  const local = age - spawn;
  if (local < 0 || local >= CLOUD_DURATION) return null;
  // InitSwirlingFogAnim calls the callback once during construction, hence
  // the retained row has phase 67/data[5]=70 rather than the literal 64.
  const phase = (67 + local * 3) & 0xff;
  const data = Array.from({ length: 8 }, () => 0);
  data[0] = 238 - local;
  data[1] = 0;
  data[2] = 50;
  data[3] = 0;
  data[4] = 100 + local * 50;
  data[5] = (70 + local * 3) & 0xff;
  data[6] = 32;
  data[7] = input.targetSide === "opponent" ? 1 : 0;
  return {
    kind: "purple-gas-cloud", index, slot, template: "gSmogCloudSpriteTemplate", callback: "AnimSwirlingFogAnim",
    x: input.targetPictureOrigin.x,
    y: input.targetPictureOrigin.y - 24 + (input.targetSide === "player" ? 8 : 0),
    x2: gbaSin(phase, 32),
    y2: (data[4] >> 8) + gbaSin((phase + 64) & 0xff, -6),
    oamPriority: input.targetBgPriority + (phase >= 64 && phase <= 191 ? 0 : 1),
    subpriority: input.attackerSprite.subpriority - 2,
    matrixNum: 0, matrix: IDENTITY, flags: 1,
    animCmdIndex: (Math.floor((local + 1) / 8) % 2) as 0 | 1,
    animDelayCounter: ((6 - local) % 8 + 8) % 8,
    data,
  };
}
function cloudsAtAge(age: number, input: Readonly<SmogLiveInputs>): SmogCloudSprite[] {
  if (input.cloudSpriteSlots.length !== CLOUD_SPAWN_AGES.length) throw new Error("Smog cloud allocation must have seven slots");
  return CLOUD_SPAWN_AGES.flatMap((_, index) => {
    const cloud = cloudAtAge(age, index, input);
    return cloud ? [cloud] : [];
  });
}
function targetShakeAtAge(age: number): SmogPoint {
  if (age < 204 || age >= 232) return { x: 0, y: 0 };
  const pair = Math.floor((age - 204) / 2);
  return { x: pair % 2 === 0 ? -2 : 2, y: 0 };
}
function sourceScrollAtAge(age: number, input: Readonly<SmogLiveInputs>): SmogPoint {
  if (age < 4 || age > 303) return { x: 0, y: 0 };
  const current = age < 204
    ? { x: input.targetSprite.x2, y: input.targetSprite.y2 }
    : targetShakeAtAge(age);
  // Cmd_monbg snapshots `sprite->x + x2` into t2_SpriteX/Y. ShakeMon2
  // subsequently changes the current x2/y2 (and terminally clears them), so
  // the BG tracks snapshot-minus-current, including a nonzero resting x2.
  return {
    x: input.monbg.scroll.x + input.targetSprite.x2 - current.x,
    y: input.monbg.scroll.y + input.targetSprite.y2 - current.y,
  };
}
function hardwareScrollAtAge(age: number, input: Readonly<SmogLiveInputs>): SmogPoint {
  return age < 5 ? { x: 0, y: 0 } : sourceScrollAtAge(age - 1, input);
}
function targetBlendAtAge(age: number): number {
  if (age < 196 || age > 246) return 0;
  if (age <= 216) return 2 * Math.floor((age - 192) / 4);
  if (age < 226) return 12;
  return Math.max(0, 12 - 2 * Math.floor((age - 222) / 4));
}
function loopTaskData(age: number, startAge: number, id: number, pan: number, interval: number, plays: number): number[] | null {
  // Cmd_loopsewithpan invokes the task once synchronously, then RunTasks
  // visits it once per source frame. This small simulation is the source
  // counter, not a retained-frame lookup.
  const data = zeroData();
  data[0] = id; data[1] = pan; data[2] = interval; data[3] = plays; data[8] = interval;
  const invoke = (): boolean => {
    // C is `if (counter++ >= framesToWait)`: comparison uses the old value.
    if (data[8] >= data[2]) {
      data[8] = 0;
      data[3] -= 1;
      return data[3] !== 0;
    }
    data[8] += 1;
    return true;
  };
  // Cmd_loopsewithpan calls the task synchronously before the frame's normal
  // RunTasks pass, exactly as the source function does.
  if (!invoke()) return null;
  for (let frame = startAge; frame <= age; frame += 1) {
    if (!invoke()) return null;
  }
  return data;
}
function taskList(age: number, input: Readonly<SmogLiveInputs>): SmogTask[] {
  if (age >= SMOG_FIRST_INACTIVE_AGE) return [];
  const tasks: SmogTask[] = [];
  if (age >= 4 && age <= 303) {
    const data = zeroData();
    data[0] = input.targetSprite.slot;
    data[1] = input.targetSprite.x + input.targetSprite.x2;
    data[2] = input.targetSprite.y + input.targetSprite.y2;
    data[3] = input.monbg.scroll.x;
    data[4] = input.monbg.scroll.y;
    data[5] = input.monbg.layer === "bg2" ? 1 : 0;
    data[6] = input.targetSide === "opponent" ? 1 : 0;
    tasks.push({ slot: input.taskSlots.updateMonBg, callback: "Task_UpdateMonBg", role: "monbg", data });
  }
  const pan = input.targetSide === "opponent" ? 63 : -63;
  const mist = age >= 7 && age <= 167 ? loopTaskData(age, 7, 168, pan, 17, 10) : null;
  if (mist) tasks.push({ slot: input.taskSlots.mistSound, callback: "Task_LoopAndPlaySE", role: "mist-sound", data: mist });
  if (age >= 192 && age <= 250) {
    const data = zeroData();
    data[0] = 4; data[1] = 2; data[2] = age <= 220 ? 1 : 0;
    data[3] = 0; data[4] = 12; data[5] = 26650; data[8] = age <= 220 ? 1 : 0;
    tasks.push({ slot: input.taskSlots.blendColorCycle, callback: "AnimTask_BlendColorCycleLoop", role: "target-palette", data });
  }
  const toxic = age >= 192 && age <= 209 ? loopTaskData(age, 192, 148, pan, 18, 2) : null;
  if (toxic) tasks.push({ slot: input.taskSlots.toxicSound, callback: "Task_LoopAndPlaySE", role: "toxic-sound", data: toxic });
  if (age >= 204 && age <= 231) {
    const data = zeroData();
    data[0] = input.targetSprite.slot;
    data[1] = 14 - Math.floor((age - 204) / 2);
    data[2] = 1; data[3] = age % 2 === 0 ? 1 : 0; data[4] = 2;
    tasks.push({ slot: input.taskSlots.shakeMon2, callback: "AnimTask_ShakeMon2_Step", role: "shake", data });
  }
  if (age >= 301 && age <= 303) {
    const data = zeroData();
    data[1] = age === 301 ? 1 : 2;
    data[2] = input.targetSide === "opponent" ? 1 : 0;
    tasks.push({ slot: input.taskSlots.clearMonBg, callback: "Task_ClearMonBg", role: "clear-monbg", data });
  }
  return tasks.sort((left, right) => left.slot - right.slot);
}
function cloudOrderKey(cloud: SmogCloudSprite): SpriteOrderKey {
  return { priority: cloud.oamPriority, subpriority: cloud.subpriority, oamY: cloud.y + cloud.y2, affineMode: "off", oamSize: 1, oamShape: "horizontal" };
}
/** Replay persistent SortSprites state, including dummy reset after cloud destroy. */
function painterOrderAtAge(age: number, input: Readonly<SmogLiveInputs>): number[] {
  const slots = [...input.spriteOrder];
  let state = createSpriteOrderState(slots, input.spriteOrder);
  const records = new Map(input.painterSprites.map((record) => [record.slot, record]));
  for (let step = 0; step <= age; step += 1) {
    const live = cloudsAtAge(step, input);
    for (const cloud of live) {
      if (spriteSlotForOwner(state, cloud.index) === null) {
        state = createOrderedSprite(state, cloud.index, cloudOrderKey(cloud));
      } else {
        // updateOrderedSprite would duplicate its object literal shape; seed a
        // fresh sorted state with the same slot/owner mapping instead below.
        state = { ...state, occupants: state.occupants.map((entry) => entry.owner === cloud.index ? { ...entry, ...cloudOrderKey(cloud) } : entry) };
      }
    }
    const activeOwners = new Set(live.map((cloud) => cloud.index));
    state = { ...state, occupants: state.occupants.filter((entry) => activeOwners.has(entry.owner)) };
    // Existing records are represented by their source-order seed; only cloud
    // slots need move-owned records. Add static records through a one-off map
    // sort equivalent below so their priority ties remain source-stable.
    const key = (slot: number): SpriteOrderKey => {
      const cloud = live.find((entry) => entry.slot === slot);
      if (cloud) return cloudOrderKey(cloud);
      const record = records.get(slot);
      return record
        ? {
          priority: record.oamPriority,
          subpriority: record.subpriority,
          oamY: record.oamY,
          affineMode: record.affineMode,
          oamSize: record.oamSize,
          oamShape: record.oamShape,
        }
        : { priority: 3, subpriority: 255, oamY: 160 };
    };
    const order = state.order.slice();
    for (let index = 1; index < order.length; index += 1) {
      let cursor = index;
      while (cursor > 0) {
        const left = key(order[cursor - 1]!); const right = key(order[cursor]!);
        const leftPriority = (left.priority << 8) | left.subpriority;
        const rightPriority = (right.priority << 8) | right.subpriority;
        const leftY = (left.oamY & 0xff) >= 160 ? (left.oamY & 0xff) - 256 : left.oamY & 0xff;
        const rightY = (right.oamY & 0xff) >= 160 ? (right.oamY & 0xff) - 256 : right.oamY & 0xff;
        if (leftPriority < rightPriority || (leftPriority === rightPriority && leftY >= rightY)) break;
        [order[cursor - 1], order[cursor]] = [order[cursor]!, order[cursor - 1]!]; cursor -= 1;
      }
    }
    state = { ...state, order };
  }
  return state.order.slice();
}
function hardwareOffset(value: number): number { return value & 0x1ff; }

/** Pure MOVE_SMOG reducer through resource/task/BG cleanup at age 305. */
export function smogAtAge(age: number, input: Readonly<SmogLiveInputs>): SmogState {
  assertAge(age);
  const source = smogSourceAtAge(age);
  const sprites = cloudsAtAge(age, input);
  const tasks = taskList(age, input);
  const shake = targetShakeAtAge(age);
  const softwareScroll = sourceScrollAtAge(age, input);
  const hardwareScroll = hardwareScrollAtAge(age, input);
  const monbg = age >= 4 && age <= 303;
  const split = age >= 7;
  const loaded = age >= 1 && age < SMOG_FIRST_INACTIVE_AGE;
  const blendLive = age >= 7 && age <= 300;
  const pan = input.targetSide === "opponent" ? 63 : -63;
  const bgs = input.background;
  const bg1cnt = age < 5 ? bgs.baseBg1Cnt : age < 7 ? bgs.monbgBg1Cnt : bgs.splitBg1Cnt;
  const bg2cnt = age < 5 ? bgs.baseBg2Cnt : age < 7 ? bgs.monbgBg2Cnt : bgs.splitBg2Cnt;
  return {
    age, active: source.active, source,
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: input.attackerSprite },
      target: { side: input.targetSide, species: input.targetSpecies, sprite: input.targetSprite, pictureOrigin: { ...input.targetPictureOrigin }, shake },
    },
    sprites, tasks,
    resources: {
      purpleGasCloud: { ...input.resources.purpleGasCloud, tag: loaded ? SMOG_PURPLE_GAS_CLOUD_TAG : null, loaded },
      allocator: { matrixBitmap: input.matrixBitmap, matrixSlots: [0], affineAllocated: false },
    },
    background: {
      layer: input.monbg.layer, monbg, clearPending: age >= 301 && age <= 303,
      targetVisible: age < 4 || age >= 301,
      softwareScroll, hardwareScroll,
      splitPriority: input.monbg.layer === "bg1"
        ? { bg1: split ? 2 : 0, bg2: 0 }
        : { bg1: split ? 1 : 0, bg2: split ? 2 : 0 },
    },
    registers: {
      bldcnt: blendLive ? 16192 : 0, bldalpha: blendLive ? 2060 : 0, bldy: 0,
      bg1hofs: input.monbg.layer === "bg1" ? hardwareOffset(hardwareScroll.x) : 0,
      bg1vofs: input.monbg.layer === "bg1" ? hardwareOffset(hardwareScroll.y) : 0,
      bg2hofs: input.monbg.layer === "bg2" ? hardwareOffset(hardwareScroll.x) : 0,
      bg2vofs: input.monbg.layer === "bg2" ? hardwareOffset(hardwareScroll.y) : 0,
      bg1cnt, bg2cnt,
    },
    displayTransfer: {
      oam: age === 0 ? "initial" : "preceding-software",
      matrices: age === 0 ? "initial" : "preceding-software",
      palette: age === 0 ? "initial" : age === 4 ? "same-row-monbg-setup" : "preceding-faded",
    },
    palette: {
      purpleGasCloud: { fadedWrite: age === 1, hardwareWrite: age === 2 },
      target: {
        bank: input.targetPaletteBank, selector: "F_PAL_TARGET", blendAmount: targetBlendAtAge(age),
        fadedWrite: TARGET_PALETTE_EDGES.includes(age as never),
        hardwareWrite: TARGET_PALETTE_EDGES.includes((age - 1) as never),
      },
    },
    painterOrder: painterOrderAtAge(age, input),
    audio: [
      { sound: "SE_M_MIST" as const, id: 168, pan, startAge: 7, interval: 17, plays: 10, active: age >= 7 && age <= 167 },
      { sound: "SE_M_TOXIC" as const, id: 148, pan, startAge: 192, interval: 18, plays: 2, active: age >= 192 && age <= 209 },
    ],
    rng: {
      animation: rngAtAge(input.animationRngSeed, animationDrawsAtAge(age)),
      sourceDraws: animationDrawsAtAge(age), gameplay: input.gameplayRng, gameplayUnchanged: true,
    },
    cleanup: {
      firstInactive: age === SMOG_FIRST_INACTIVE_AGE,
      visualTasks: sprites.length + tasks.filter((task) => task.role === "target-palette" || task.role === "shake").length,
      soundTasks: tasks.filter((task) => task.role === "mist-sound" || task.role === "toxic-sound").length,
      ownedSprites: sprites.length, resourcesReleased: age >= SMOG_FIRST_INACTIVE_AGE,
    },
  };
}
