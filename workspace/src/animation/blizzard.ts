import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type BlizzardAttackerSide = "player" | "opponent";

/** The generated graph for the exclusive Move_BLIZZARD script body. */
export const BLIZZARD_COMPONENTS = [
  "asset:ANIM_TAG_ICE_CRYSTALS",
  "sprite:gBlizzardIceCrystalSpriteTemplate",
  "sprite:gIceCrystalHitLargeSpriteTemplate",
  "sprite:gIceCrystalHitSmallSpriteTemplate",
  "sprite:gSwirlingSnowballSpriteTemplate",
  "subroutine:BlizzardAgainstPlayer",
  "subroutine:BlizzardContinue",
  "subroutine:BlizzardIceCrystals",
  "subroutine:IceCrystalEffectLong",
  "task:AnimTask_GetAttackerSide",
  "task:AnimTask_StartSlidingBg",
  "visualCommand:clearmonbg",
  "visualCommand:fadetobg",
  "visualCommand:monbg",
  "visualCommand:panse",
  "visualCommand:restorebg",
  "visualCommand:setarg",
  "visualCommand:waitbgfadein",
  "visualCommand:waitbgfadeout",
] as const;

/** Numeric identity of the lowest Level-50 Factory carrier audited for this move. */
export const BLIZZARD_SOURCE_SET_ID = 318;
export const BLIZZARD_SOURCE_SPECIES_ID = 310;
export const BLIZZARD_MOVE_ID = 59;

export interface BlizzardSnowballCall {
  readonly burst: 0 | 1;
  readonly index: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly sourceAge: number;
  readonly initialX: 0;
  readonly initialY: number;
  readonly targetX: 0;
  readonly targetY: number;
  readonly speed: 72;
  readonly multipleTargets: true;
}

/**
 * The two textual BlizzardIceCrystals calls are retained independently. The
 * source inserts three delay callbacks between each pair; these are source
 * ages relative to the first displayed Move_BLIZZARD script row, never engine
 * ticks or presentation paint ages.
 */
export const BLIZZARD_SNOWBALL_CALLS: readonly BlizzardSnowballCall[] = [
  { burst: 0, index: 0, sourceAge: 45, initialX: 0, initialY: -10, targetX: 0, targetY: -10, speed: 72, multipleTargets: true },
  { burst: 0, index: 1, sourceAge: 50, initialX: 0, initialY: -15, targetX: 0, targetY: -15, speed: 72, multipleTargets: true },
  { burst: 0, index: 2, sourceAge: 55, initialX: 0, initialY: -5, targetX: 0, targetY: -5, speed: 72, multipleTargets: true },
  { burst: 0, index: 3, sourceAge: 60, initialX: 0, initialY: -10, targetX: 0, targetY: -10, speed: 72, multipleTargets: true },
  { burst: 0, index: 4, sourceAge: 65, initialX: 0, initialY: -20, targetX: 0, targetY: -20, speed: 72, multipleTargets: true },
  { burst: 0, index: 5, sourceAge: 70, initialX: 0, initialY: -15, targetX: 0, targetY: -15, speed: 72, multipleTargets: true },
  { burst: 0, index: 6, sourceAge: 75, initialX: 0, initialY: -25, targetX: 0, targetY: -25, speed: 72, multipleTargets: true },
  { burst: 1, index: 0, sourceAge: 80, initialX: 0, initialY: -10, targetX: 0, targetY: -10, speed: 72, multipleTargets: true },
  { burst: 1, index: 1, sourceAge: 85, initialX: 0, initialY: -15, targetX: 0, targetY: -15, speed: 72, multipleTargets: true },
  { burst: 1, index: 2, sourceAge: 90, initialX: 0, initialY: -5, targetX: 0, targetY: -5, speed: 72, multipleTargets: true },
  { burst: 1, index: 3, sourceAge: 95, initialX: 0, initialY: -10, targetX: 0, targetY: -10, speed: 72, multipleTargets: true },
  { burst: 1, index: 4, sourceAge: 100, initialX: 0, initialY: -20, targetX: 0, targetY: -20, speed: 72, multipleTargets: true },
  { burst: 1, index: 5, sourceAge: 105, initialX: 0, initialY: -15, targetX: 0, targetY: -15, speed: 72, multipleTargets: true },
  { burst: 1, index: 6, sourceAge: 110, initialX: 0, initialY: -25, targetX: 0, targetY: -25, speed: 72, multipleTargets: true },
] as const;

export interface BlizzardSnowballStep1Input {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface BlizzardSnowballSwirlState {
  readonly side: BlizzardAttackerSide;
  readonly callback: "AnimSwirlingSnowball_Step2";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export function gbaSignedSin(angle: number, amplitude: number): number {
  const value = GBA_SINE_TABLE_256[((angle % 256) + 256) % 256]!;
  // pokeemerald's Sin/Cos use a signed C `>> 8`. JavaScript's bitwise shift
  // has the same arithmetic-floor behavior for these small signed products.
  return (value * amplitude) >> 8;
}

/**
 * Replays only the 32 Step2 writes that are determined by a captured Step1
 * row. Linear translation, the Step1 row itself, and End translation depend
 * on state not reconstructed here and are intentionally outside this reducer.
 */
export function blizzardSnowballSwirlState(
  initial: BlizzardSnowballStep1Input,
  step: number,
  side: BlizzardAttackerSide,
): BlizzardSnowballSwirlState {
  if (!Number.isInteger(step) || step < 0 || step > 31) {
    throw new RangeError(`Blizzard swirl step must be an integer in 0..31, got ${step}`);
  }
  const tempVar = side === "opponent" ? 20 : -20;
  const baseX = gbaSignedSin(128, tempVar);
  const baseY = gbaSignedSin(128 + 64, 15);
  const angleBeforeWrite = (128 + step * 16) & 0xff;
  const angleAfterWrite = (angleBeforeWrite + 16) & 0xff;
  return {
    side,
    callback: "AnimSwirlingSnowball_Step2",
    x: initial.x + initial.x2,
    y: initial.y + initial.y2,
    x2: gbaSignedSin(angleBeforeWrite, tempVar) - baseX,
    y2: gbaSignedSin(angleBeforeWrite + 64, 15) - baseY,
    data: [
      angleAfterWrite,
      initial.data[1],
      initial.data[2],
      baseX,
      baseY,
      step + 1,
      initial.data[6],
      initial.data[7],
    ],
  };
}

export interface BlizzardImpactCrystalCall {
  readonly index: number;
  readonly kind: "large" | "small";
  readonly x: number;
  readonly y: number;
  readonly targetMode: 1;
  readonly sourceDelayAfter: 4;
}

/** Exact IceCrystalEffectLong call order; no sibling Icy Wind calls are mixed in. */
export const BLIZZARD_IMPACT_CRYSTALS: readonly BlizzardImpactCrystalCall[] = [
  { index: 0, kind: "large", x: -10, y: -10, targetMode: 1, sourceDelayAfter: 4 },
  { index: 1, kind: "small", x: 10, y: 20, targetMode: 1, sourceDelayAfter: 4 },
  { index: 2, kind: "large", x: -29, y: 0, targetMode: 1, sourceDelayAfter: 4 },
  { index: 3, kind: "small", x: 29, y: -20, targetMode: 1, sourceDelayAfter: 4 },
  { index: 4, kind: "large", x: -5, y: 10, targetMode: 1, sourceDelayAfter: 4 },
  { index: 5, kind: "small", x: 17, y: -12, targetMode: 1, sourceDelayAfter: 4 },
  { index: 6, kind: "large", x: -20, y: 0, targetMode: 1, sourceDelayAfter: 4 },
  { index: 7, kind: "small", x: -15, y: 15, targetMode: 1, sourceDelayAfter: 4 },
  { index: 8, kind: "small", x: 26, y: -5, targetMode: 1, sourceDelayAfter: 4 },
  { index: 9, kind: "small", x: 0, y: 0, targetMode: 1, sourceDelayAfter: 4 },
  { index: 10, kind: "large", x: 20, y: 2, targetMode: 1, sourceDelayAfter: 4 },
] as const;

export const BLIZZARD_SOURCE_AUDIO = [
  "SE_M_BLIZZARD",
  "SE_M_BLIZZARD2",
  ...BLIZZARD_IMPACT_CRYSTALS.map(() => "SE_M_ICY_WIND"),
] as const;

export const BLIZZARD_CLEANUP = [
  "restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein",
  "clearmonbg ANIM_DEF_PARTNER", "end",
] as const;

export function blizzardSnowballCallsAtSourceAge(age: number): readonly BlizzardSnowballCall[] {
  return BLIZZARD_SNOWBALL_CALLS.filter((call) => call.sourceAge === age);
}
