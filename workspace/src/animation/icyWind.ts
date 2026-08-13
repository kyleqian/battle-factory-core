import {
  blizzardSnowballSwirlState,
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
