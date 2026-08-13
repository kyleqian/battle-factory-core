import {
  blizzardSnowballSwirlState,
  gbaSignedSin,
  type BlizzardAttackerSide,
  type BlizzardSnowballStep1Input,
  type BlizzardSnowballSwirlState,
} from "./blizzard.ts";

/** Exact generated source graph for Icy Wind; none of these imply pixel acceptance. */
export const ICY_WIND_COMPONENTS = [
  "asset:ANIM_TAG_ICE_CRYSTALS",
  "asset:ANIM_TAG_ICE_SPIKES",
  "sprite:gIceGroundSpikeSpriteTemplate",
  "sprite:gSwirlingSnowballSpriteTemplate",
  "subroutine:IceSpikesEffectLong",
  "subroutine:IcyWindSwirlingSnowballs",
  "task:AnimTask_BlendBattleAnimPal",
  "visualCommand:clearmonbg",
  "visualCommand:fadetobg",
  "visualCommand:monbg",
  "visualCommand:panse",
  "visualCommand:restorebg",
  "visualCommand:waitbgfadein",
  "visualCommand:waitbgfadeout",
] as const;

export const ICY_WIND_MOVE_ID = 196;
export const ICY_WIND_SOURCE_SET_ID = 31;
export const ICY_WIND_SOURCE_SPECIES_ID = 220;

/** Source lines in exact execution order for the exclusive root block. */
export const ICY_WIND_ROOT_SCRIPT = [
  "loadspritegfx ANIM_TAG_ICE_CRYSTALS",
  "loadspritegfx ANIM_TAG_ICE_SPIKES",
  "monbg ANIM_DEF_PARTNER",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG | F_PAL_ATK_SIDE, 4, 0, 4, RGB_BLACK",
  "fadetobg BG_ICE",
  "waitbgfadeout",
  "playsewithpan SE_M_ICY_WIND, 0",
  "waitbgfadein",
  "waitforvisualfinish",
  "panse SE_M_GUST, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +2, 0",
  "call IcyWindSwirlingSnowballs",
  "delay 5",
  "call IcyWindSwirlingSnowballs",
  "playsewithpan SE_M_GUST2, SOUND_PAN_TARGET",
  "delay 55",
  "call IceSpikesEffectLong",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "restorebg",
  "waitbgfadeout",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG | F_PAL_ATK_SIDE, 4, 4, 0, RGB_BLACK",
  "waitbgfadein",
  "end",
] as const;

export interface IcyWindSnowballCall {
  readonly burst: 0 | 1;
  readonly index: number;
  readonly initialX: 0;
  readonly initialY: number;
  readonly targetX: 0;
  readonly targetY: number;
  readonly speed: 72;
  readonly multipleTargets: true;
  readonly delayAfter: 5 | 0;
}

export type IcyWindSide = "player" | "opponent";

export interface IcyWindGeometry {
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly spikeTargetCenter: Readonly<{ x: number; y: number }>;
}

export interface IcyWindSnowballState {
  readonly callIndex: number;
  readonly oamSlot: number;
  readonly callback: "AnimFastTranslateLinearWaitEnd" | "AnimSwirlingSnowball_Step1" | "AnimSwirlingSnowball_Step2" | "AnimSwirlingSnowball_End";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface IcyWindSpikeState {
  readonly callIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly tileFrame: 0 | 2 | 4 | 6;
}

export interface IcyWindState {
  readonly age: number;
  readonly active: boolean;
  readonly snowballs: readonly IcyWindSnowballState[];
  readonly spikes: readonly IcyWindSpikeState[];
  readonly background: "field" | "ice";
  readonly backgroundBldy: number;
  readonly paletteBlackCoefficient: number;
  readonly monBgActive: boolean;
  readonly blendCnt: 0 | 232;
}

const SNOWBALL_Y = [0, 10, -10, 15, -5] as const;
export const ICY_WIND_SNOWBALL_CALLS: readonly IcyWindSnowballCall[] = [0, 1].flatMap((burst) =>
  SNOWBALL_Y.map((y, index) => ({
    burst: burst as 0 | 1,
    index,
    initialX: 0 as const,
    initialY: y,
    targetX: 0 as const,
    targetY: y,
    speed: 72 as const,
    multipleTargets: true as const,
    delayAfter: (index === SNOWBALL_Y.length - 1 ? 0 : 5) as 0 | 5,
  })),
);

export interface IcyWindSpikeCall {
  readonly index: number;
  readonly x: number;
  readonly y: 24;
  readonly averageTargets: true;
  readonly delayAfter: 4 | 0;
}

const SPIKE_X = [0, 8, -8, 16, -16, 24, -24, 32, -32, 40, -40, 48, -48] as const;
export const ICY_WIND_SPIKE_CALLS: readonly IcyWindSpikeCall[] = SPIKE_X.map((x, index) => ({
  index,
  x,
  y: 24,
  averageTargets: true,
  delayAfter: ([0, 2, 4, 6, 8, 10].includes(index) ? 4 : 0) as 0 | 4,
}));

const SNOWBALL_CREATE_AGES = [48, 55, 62, 69, 76, 83, 90, 97, 104, 111] as const;
const SNOWBALL_OAM_SLOTS = [3, 4, 5, 7, 9, 10, 11, 12, 13, 14] as const;
const SPIKE_CREATE_AGES = [168, 174, 174, 180, 180, 186, 186, 192, 192, 198, 198, 204, 204] as const;
const SPIKE_OAM_SLOTS = [3, 4, 5, 7, 9, 10, 11, 15, 16, 12, 13, 3, 17] as const;

interface MutableSnowball {
  callback: IcyWindSnowballState["callback"];
  x: number;
  y: number;
  x2: number;
  y2: number;
  data: number[];
  destroyed: boolean;
}

function initFastTranslation(sprite: MutableSnowball): void {
  const xDiff = sprite.data[2]! - sprite.data[1]!;
  const yDiff = sprite.data[4]! - sprite.data[3]!;
  const duration = Math.trunc((Math.abs(xDiff) << 4) / sprite.data[0]!);
  let dx = Math.trunc((Math.abs(xDiff) << 4) / duration);
  let dy = Math.trunc((Math.abs(yDiff) << 4) / duration);
  dx = xDiff < 0 ? (dx | 1) : (dx & ~1);
  dy = yDiff < 0 ? (dy | 1) : (dy & ~1);
  sprite.data[0] = duration;
  sprite.data[1] = dx;
  sprite.data[2] = dy;
  sprite.data[3] = 0;
  sprite.data[4] = 0;
}

function fastTranslate(sprite: MutableSnowball): boolean {
  if (sprite.data[0] === 0) return true;
  sprite.data[3] = (sprite.data[3]! + sprite.data[1]!) & 0xffff;
  sprite.data[4] = (sprite.data[4]! + sprite.data[2]!) & 0xffff;
  sprite.x2 = (sprite.data[1]! & 1) !== 0 ? -(sprite.data[3]! >>> 4) : sprite.data[3]! >>> 4;
  sprite.y2 = (sprite.data[2]! & 1) !== 0 ? -(sprite.data[4]! >>> 4) : sprite.data[4]! >>> 4;
  sprite.data[0] = sprite.data[0]! - 1;
  return false;
}

function createSnowball(callIndex: number, geometry: IcyWindGeometry): MutableSnowball {
  const call = ICY_WIND_SNOWBALL_CALLS[callIndex]!;
  const saved = [
    call.speed,
    geometry.attackerCenter.x,
    geometry.targetCenter.x,
    geometry.attackerCenter.y + call.initialY,
    // `multipleTargets=TRUE` takes SetAverageBattlerPositions verbatim; the
    // source does not apply gBattleAnimArgs[3] on this branch.
    geometry.targetCenter.y,
    0, 0, 0,
  ];
  const sprite: MutableSnowball = {
    callback: "AnimFastTranslateLinearWaitEnd",
    x: saved[1]!, y: saved[3]!, x2: 0, y2: 0, data: [...saved], destroyed: false,
  };
  initFastTranslation(sprite);
  sprite.data[1] = sprite.data[1]! ^ 1;
  sprite.data[2] = sprite.data[2]! ^ 1;
  while (true) {
    sprite.data[0] = 1;
    fastTranslate(sprite);
    if (sprite.x + sprite.x2 > 256 || sprite.x + sprite.x2 < -16 || sprite.y + sprite.y2 > 160 || sprite.y + sprite.y2 < -16) break;
  }
  sprite.x += sprite.x2;
  sprite.y += sprite.y2;
  sprite.x2 = 0;
  sprite.y2 = 0;
  sprite.data = [...saved];
  sprite.data[1] = sprite.x;
  sprite.data[3] = sprite.y;
  initFastTranslation(sprite);
  fastTranslate(sprite);
  return sprite;
}

function advanceSnowball(sprite: MutableSnowball, side: IcyWindSide): void {
  switch (sprite.callback) {
    case "AnimFastTranslateLinearWaitEnd":
      if (fastTranslate(sprite)) sprite.callback = "AnimSwirlingSnowball_Step1";
      return;
    case "AnimSwirlingSnowball_Step1": {
      sprite.x += sprite.x2; sprite.y += sprite.y2; sprite.x2 = 0; sprite.y2 = 0;
      const temp = side === "opponent" ? 20 : -20;
      sprite.data[0] = 128;
      sprite.data[3] = gbaSignedSin(128, temp);
      sprite.data[4] = gbaSignedSin(192, 15);
      sprite.data[5] = 0;
      sprite.callback = "AnimSwirlingSnowball_Step2";
      advanceSnowball(sprite, side);
      return;
    }
    case "AnimSwirlingSnowball_Step2": {
      if (sprite.data[5]! <= 31) {
        const temp = side === "opponent" ? 20 : -20;
        sprite.x2 = gbaSignedSin(sprite.data[0]!, temp) - sprite.data[3]!;
        sprite.y2 = gbaSignedSin(sprite.data[0]! + 64, 15) - sprite.data[4]!;
        sprite.data[0] = (sprite.data[0]! + 16) & 0xff;
        sprite.data[5] = sprite.data[5]! + 1;
      } else {
        sprite.x += sprite.x2; sprite.y += sprite.y2; sprite.x2 = 0; sprite.y2 = 0;
        sprite.data[3] = 0; sprite.data[4] = 0; sprite.callback = "AnimSwirlingSnowball_End";
      }
      return;
    }
    case "AnimSwirlingSnowball_End":
      sprite.data[0] = 1;
      fastTranslate(sprite);
      sprite.destroyed = sprite.x + sprite.x2 > 256 || sprite.x + sprite.x2 < -16 || sprite.y + sprite.y2 > 256 || sprite.y + sprite.y2 < -16;
  }
}

function snowballAtAge(callIndex: number, age: number, side: IcyWindSide, geometry: IcyWindGeometry): IcyWindSnowballState | null {
  const localAge = age - SNOWBALL_CREATE_AGES[callIndex]!;
  if (localAge < 0) return null;
  const sprite = createSnowball(callIndex, geometry);
  for (let tick = 0; tick < localAge && !sprite.destroyed; tick += 1) advanceSnowball(sprite, side);
  if (sprite.destroyed) return null;
  return {
    callIndex, oamSlot: SNOWBALL_OAM_SLOTS[callIndex]!, callback: sprite.callback, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    data: sprite.data as unknown as IcyWindSnowballState["data"],
  };
}

function paletteCoefficient(age: number): number {
  if (age < 18 || age >= 285) return 0;
  if (age < 33) return Math.floor((age - 18) / 5) + 1;
  if (age < 270) return 4;
  return 3 - Math.floor((age - 270) / 5);
}

function backgroundBldy(age: number): number {
  if (age >= 12 && age <= 27) return age - 11;
  if (age >= 28 && age <= 30) return 16;
  if (age >= 31 && age <= 46) return 46 - age;
  if (age >= 242 && age <= 244) return 1;
  if (age >= 245 && age <= 259) return age - 243;
  if (age >= 260 && age <= 263) return 16;
  if (age >= 264 && age <= 279) return 279 - age;
  return 0;
}

/** Complete source-relative Move_ICY_WIND reducer. `age=0` is frame 220. */
export function icyWindAtAge(age: number, side: IcyWindSide, geometry: IcyWindGeometry): IcyWindState {
  if (!Number.isInteger(age)) throw new RangeError(`Icy Wind age must be an integer, got ${age}`);
  const snowballs = age < 0 ? [] : SNOWBALL_CREATE_AGES.map((_, index) => snowballAtAge(index, age, side, geometry)).filter((row): row is IcyWindSnowballState => row !== null);
  const spikes = age < 0 ? [] : SPIKE_CREATE_AGES.flatMap((startAge, callIndex) => {
    const local = age - startAge;
    if (local < 0 || local >= 35) return [];
    // Sprite animation advances on the creation display, so each five-tick
    // command after the first begins at source local ages 4, 9, … .
    const frame = [0, 2, 4, 6, 4, 2, 0][Math.min(6, Math.floor((local + 1) / 5))]! as 0 | 2 | 4 | 6;
    const sourceX = ICY_WIND_SPIKE_CALLS[callIndex]!.x * (side === "opponent" ? -1 : 1);
    return [{ callIndex, oamSlot: SPIKE_OAM_SLOTS[callIndex]!, x: geometry.spikeTargetCenter.x + sourceX, y: geometry.spikeTargetCenter.y + 24, tileFrame: frame }];
  });
  const bldy = backgroundBldy(age);
  return {
    age,
    active: age >= 0 && age <= 285,
    snowballs,
    spikes,
    background: age >= 29 && age <= 262 ? "ice" : "field",
    backgroundBldy: bldy,
    paletteBlackCoefficient: paletteCoefficient(age),
    monBgActive: age >= 7 && age <= 239,
    blendCnt: (bldy > 0 || age === 11 || age === 241) ? 232 : 0,
  };
}

export const ICY_WIND_CALLBACKS = {
  snowball: ["AnimSwirlingSnowball", "AnimSwirlingSnowball_Step1", "AnimSwirlingSnowball_Step2", "AnimSwirlingSnowball_End"],
  spike: ["AnimWaveFromCenterOfTarget"],
} as const;

export const ICY_WIND_AUDIO = [
  ["playsewithpan", "SE_M_ICY_WIND", 0],
  ["panse", "SE_M_GUST", "SOUND_PAN_ATTACKER", "SOUND_PAN_TARGET", 2, 0],
  ["playsewithpan", "SE_M_GUST2", "SOUND_PAN_TARGET"],
  ["loopsewithpan", "SE_M_ICY_WIND", "SOUND_PAN_TARGET", 6, 4],
] as const;

export const ICY_WIND_PRESENTATION_EFFECTS = {
  background: "BG_ICE",
  monbg: "ANIM_DEF_PARTNER",
  paletteIn: ["F_PAL_BG | F_PAL_ATK_SIDE", 4, 0, 4, "RGB_BLACK"],
  paletteOut: ["F_PAL_BG | F_PAL_ATK_SIDE", 4, 4, 0, "RGB_BLACK"],
  cleanup: [
    "clearmonbg ANIM_DEF_PARTNER", "restorebg", "waitbgfadeout",
    "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG | F_PAL_ATK_SIDE, 4, 4, 0, RGB_BLACK",
    "waitbgfadein", "end",
  ],
} as const;

/**
 * Component-level reuse only: both moves invoke the same callback with the
 * same speed/multiple-target contract. No Blizzard source age or paint latch
 * is accepted for Icy Wind by this wrapper.
 */
export function icyWindSnowballStep2State(
  initial: BlizzardSnowballStep1Input,
  step: number,
  side: BlizzardAttackerSide,
): BlizzardSnowballSwirlState {
  return blizzardSnowballSwirlState(initial, step, side);
}
