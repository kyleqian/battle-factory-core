import battleAnimSpark2Asset from "../assets/gen/battle-anim-spark-2.json" with { type: "json" };
import type { RgbColor } from "../engine/bg.ts";

export type StatusAnimationKind = "paralysis";

export interface StatusAnimationTargetGeometry {
  /** Source singles BATTLER_COORD_X/Y base used by status-animation sprites. */
  readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
}

export interface StatusAnimationInput {
  readonly kind: StatusAnimationKind;
  /** Display age relative to the status animation's first shake pose. */
  readonly sourceAge: number;
  readonly targetGeometry: StatusAnimationTargetGeometry;
}

export interface AnimTaskShakeMon2Profile {
  readonly xOffset: number;
  readonly yOffset: number;
  readonly shakeCount: number;
  readonly frameDelay: number;
}

export interface StatusAnimationSprite {
  readonly x: number;
  readonly y: number;
  readonly tileset: {
    readonly columns: number;
    readonly rows: number;
    readonly tiles: number[][];
  };
  readonly palette: RgbColor[];
}

export interface StatusAnimationVisual {
  readonly battlerOffset: Readonly<{ x: number; y: number }>;
  readonly sprites: readonly StatusAnimationSprite[];
}

interface Spark2Asset {
  readonly frames: {
    readonly columns: number;
    readonly rows: number;
    readonly list: number[][][];
  };
  readonly palette: RgbColor[];
}

const spark2 = battleAnimSpark2Asset as Spark2Asset;

const PARALYSIS_SHAKE: Readonly<AnimTaskShakeMon2Profile> = Object.freeze({
  xOffset: 1,
  yOffset: 0,
  shakeCount: 10,
  frameDelay: 1,
});

const PARALYSIS_ELECTRICITY_FIRST_SOURCE_AGE = 2;
const PARALYSIS_VISIBLE_SHAKE_LAST_SOURCE_AGE = 20;

const ELECTRICITY_SPAWNS = [
  { x: 5, y: 0, frame: 0 },
  { x: -5, y: 10, frame: 1 },
  { x: 15, y: 20, frame: 2 },
  { x: -15, y: -10, frame: 0 },
  { x: 25, y: 0, frame: 1 },
  { x: -8, y: 8, frame: 2 },
  { x: 2, y: -8, frame: 0 },
  { x: -20, y: 15, frame: 1 },
] as const;

/**
 * Displayed `AnimTask_ShakeMon2` poses, parameterized by the task's source
 * arguments. Age zero is the task's initial positive pose; each later pose
 * lasts `frameDelay + 1` display frames before the task restores (0, 0).
 */
export function animTaskShakeMon2AtSourceAge(
  sourceAge: number,
  profile: Readonly<AnimTaskShakeMon2Profile>,
): Readonly<{ x: number; y: number }> {
  const poseDuration = profile.frameDelay + 1;
  const restoreAge = 1 + profile.shakeCount * poseDuration;
  if (sourceAge < 0 || sourceAge >= restoreAge) return { x: 0, y: 0 };
  if (sourceAge === 0) {
    return { x: profile.xOffset, y: profile.yOffset };
  }
  const toggle = Math.floor((sourceAge - 1) / poseDuration) + 1;
  const sign = toggle % 2 === 1 ? -1 : 1;
  return {
    x: profile.xOffset * sign,
    y: profile.yOffset === 0 ? 0 : profile.yOffset * sign,
  };
}

function flippedSparkTiles(
  frame: 0 | 1 | 2,
): StatusAnimationSprite["tileset"] {
  const hFlip = frame === 1;
  const vFlip = frame === 2;
  const source = spark2.frames.list[frame]!;
  return {
    columns: spark2.frames.columns,
    rows: spark2.frames.rows,
    tiles: source.map((_tile, tileIndex) => {
      const destTx = tileIndex % 2;
      const destTy = Math.floor(tileIndex / 2);
      const sourceTx = hFlip ? 1 - destTx : destTx;
      const sourceTy = vFlip ? 1 - destTy : destTy;
      const tile = source[sourceTy * 2 + sourceTx]!;
      if (!hFlip && !vFlip) return tile;
      const flipped = new Array<number>(64);
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const sx = hFlip ? 7 - x : x;
          const sy = vFlip ? 7 - y : y;
          flipped[y * 8 + x] = tile[sy * 8 + sx]!;
        }
      }
      return flipped;
    }),
  };
}

/**
 * Source `ElectricityEffect`: eight 16x16 sprites, spawned two animation
 * script ticks apart. The controller scheduler exposes those as four display
 * frames here; `WaitAnimForDuration(5)` contributes six displayed OAM frames.
 */
function paralysisElectricityAtSourceAge(
  sourceAge: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly StatusAnimationSprite[] {
  return ELECTRICITY_SPAWNS.flatMap((spawn, index) => {
    const localAge =
      sourceAge - PARALYSIS_ELECTRICITY_FIRST_SOURCE_AGE - index * 4;
    if (localAge < 0 || localAge > 5) return [];
    return [{
      x: targetCenter.x + spawn.x - 8,
      y: targetCenter.y + spawn.y - 8,
      tileset: flippedSparkTiles(spawn.frame),
      palette: spark2.palette,
    }];
  });
}

/**
 * Reusable visual-only status program. It owns no move identity, status
 * application/rules, controller progression, text, healthbox state, or RNG.
 */
export function statusAnimationAtSourceAge(
  input: Readonly<StatusAnimationInput>,
): StatusAnimationVisual {
  switch (input.kind) {
    case "paralysis": {
      const taskOffset = animTaskShakeMon2AtSourceAge(
        input.sourceAge,
        PARALYSIS_SHAKE,
      );
      // The framebuffer/OAM receipt is one task phase behind the post-callback
      // state while ElectricityEffect is visible. Setup-only poses are hidden.
      const shakeVisible =
        input.sourceAge >= PARALYSIS_ELECTRICITY_FIRST_SOURCE_AGE
        && input.sourceAge <= PARALYSIS_VISIBLE_SHAKE_LAST_SOURCE_AGE;
      return {
        battlerOffset: shakeVisible
          ? {
              x: taskOffset.x === 0 ? 0 : -taskOffset.x,
              y: taskOffset.y === 0 ? 0 : -taskOffset.y,
            }
          : { x: 0, y: 0 },
        sprites: paralysisElectricityAtSourceAge(
          input.sourceAge,
          input.targetGeometry.battlePositionCenter,
        ),
      };
    }
  }
}
