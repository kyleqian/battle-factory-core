import battleAnimSpark2Asset from "../assets/gen/battle-anim-spark-2.json" with { type: "json" };
import battleAnimSmallEmberAsset from "../assets/gen/battle-anim-small-ember.json" with { type: "json" };
import type { RgbColor } from "../engine/bg.ts";
import charmAsset from "./assets/charm.json" with { type: "json" };
import restAsset from "./assets/rest.json" with { type: "json" };
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";
import { statusConditionTarget, statusParticleDisplayRow, type StatusConditionDisplaySprite, type StatusParticleAnimation } from "./statusConditionAnimations.ts";

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

/**
 * sar131 (S10A, ISSUES #168 slice SA4, docs/sar131-status-animation-render.md): the B_ANIM_STATUS_* scripts drawn on the live
 * field, one case per animation (`liveStatusAnimationRow`; an animation without a case is not drawn: the field stays as it is).
 * Age a = the `status-animation` command's age; a = 0 is the ROM's first gAnimScriptActive row (sta123 firstActive 0 = the
 * statusanimation row + 1). Every task / sprite row below is the source script's own schedule (battle_anim_scripts.s), shown
 * through the measured display lag of the live field (OAM: a ShakeMon2 tick written at script row r shows on row r + 2).
 */
export type LiveStatusAnimationName = "PSN" | "PRZ" | "SLP" | "BRN" | "INFATUATION";

/** sae135: a live status-animation OBJ; `affine` = an affine-normal OBJ (the letter Z) drawn around its box centre with that matrix. */
export interface LiveStatusAnimationSprite extends StatusAnimationSprite {
  readonly affine?: Readonly<{ a: number; b: number; c: number; d: number }>;
}

export interface LiveStatusAnimationRow {
  /** The animated battler's x2 / y2: "rest" before its ShakeMon2 shows (the tracked idle rest), else the task's absolute value. */
  readonly battlerOffset: Readonly<{ x2: number; y2: number }> | "rest";
  /** blend_color_cycle F_PAL_ATTACKER: the battler's OBJ palette blended toward `color` by coeff / 16 (null = none). */
  readonly paletteBlend: Readonly<{ color: RgbColor; coeff: number }> | null;
  readonly sprites: readonly LiveStatusAnimationSprite[];
}

/** Status_Poison / Status_Paralysis: `AnimTask_ShakeMon2 ANIM_ATTACKER` (attacker = target = the battler, LaunchStatusAnimation). */
const PSN_SHAKE = [1, 0, 18, 2] as const;
const PRZ_SHAKE = [1, 0, 10, 1] as const;
/** RGB(30, 0, 31) as an 8-bit RgbColor (blendPaletteToward reads the 5-bit component back). */
const PSN_BLEND_COLOR: RgbColor = Object.freeze({ r: 30 << 3, g: 0, b: 31 << 3 });
/** sBattlerCoords[0] (battle_anim_mons.c): BATTLER_COORD_X / Y of the singles player / opponent. */
const STATUS_BATTLER_COORDS = Object.freeze({ player: { x: 72, y: 80 }, opponent: { x: 176, y: 40 } });

/**
 * The script row the ShakeMon2 task is created on, as command age: Status_Poison runs `loopsewithpan`, `createvisualtask`,
 * `blend_color_cycle` on the first script row (0); Status_Paralysis's `loadspritegfx` waits 1 (WaitAnimFrameCount: decrement, then
 * hand back, then run), so its `createvisualtask` and ElectricityEffect's first `createsprite` run on row 3. The task's tick k
 * (shakeMon2Sequence) is written on row creation + k and shows on row creation + k + 2 (OAM lag); before tick 0 shows, the
 * battler stands at its rest.
 */
function shakeMon2Row(
  age: number, creation: number, [x, y, n, delay]: readonly [number, number, number, number],
): LiveStatusAnimationRow["battlerOffset"] {
  const tick = age - creation - 2;
  if (tick < 0) return "rest";
  return shakeMon2OffsetAtTick(x, y, n, delay, tick);
}

/**
 * `blend_color_cycle` with delay 2, 2 blends, 0 -> 12 (Status_Poison; the same arguments as Move_SMOG's target blend, smog.ts
 * targetBlendAtAge, here from the task's creation row): BeginNormalPaletteFade's deltaY 2 steps every 4 rows (delay 2 plus the
 * BG / OBJ half alternation), 12 holds through the finishing sequence, then the second leg 12 -> 0. `t` = rows since the shown
 * palette's creation row (the palette RAM change shows on its own row; t = age - 2 for Status_Poison).
 */
function blendColorCycleDelay2To12(t: number): number {
  if (t < 4 || t > 54) return 0;
  if (t <= 24) return 2 * Math.floor(t / 4);
  if (t < 34) return 12;
  return Math.max(0, 12 - 2 * Math.floor((t - 30) / 4));
}

/** ElectricityEffect's i-th createsprite row (`delay 2` = 4 rows: decrement twice, hand back, run). */
const PRZ_ELECTRICITY_FIRST_ROW = 3;
/** AnimElectricity -> WaitAnimForDuration(5): the sprite's first shown row after its createsprite row, then 6 shown rows. */
const ELECTRICITY_SHOW_LAG = 2;
const ELECTRICITY_SHOWN_ROWS = 6;

function statusElectricity(age: number, side: "player" | "opponent"): StatusAnimationSprite[] {
  const center = STATUS_BATTLER_COORDS[side];
  return ELECTRICITY_SPAWNS.flatMap((spawn, index) => {
    const local = age - (PRZ_ELECTRICITY_FIRST_ROW + index * 4 + ELECTRICITY_SHOW_LAG);
    if (local < 0 || local >= ELECTRICITY_SHOWN_ROWS) return [];
    // InitSpritePosToAnimTarget(FALSE) + SetAnimSpriteInitialXOffset: attacker == target, so the opponent side subtracts the x
    // offset and the player side adds it; a 16x16 OAM centred on (x, y).
    const x = side === "player" ? center.x + spawn.x : center.x - spawn.x;
    return [{ x: x - 8, y: center.y + spawn.y - 8, tileset: flippedSparkTiles(spawn.frame), palette: spark2.palette }];
  });
}

type ParticleArt = Readonly<{ tileset: StatusAnimationSprite["tileset"]; palette: RgbColor[] }>;
const sleepLetterZ = (restAsset as unknown as { letterZ: ParticleArt }).letterZ;
const magentaHeart = (charmAsset as unknown as { magentaHeart: ParticleArt }).magentaHeart;
const smallEmber = battleAnimSmallEmberAsset as unknown as ParticleArt;

/** A 32x32 frame of battle-anim-small-ember.json (gAnims_BasicFire: frame = tileOffset / 16, 4x4 tiles). */
function smallEmberFrame(tileOffset: number): StatusAnimationSprite["tileset"] {
  return { columns: 4, rows: 4, tiles: smallEmber.tileset.tiles.slice(tileOffset, tileOffset + 16) };
}

function particleSprite(sprite: StatusConditionDisplaySprite): LiveStatusAnimationSprite {
  switch (sprite.template) {
    case "gSleepLetterZSpriteTemplate":
      return { x: sprite.left, y: sprite.top, tileset: sleepLetterZ.tileset, palette: sleepLetterZ.palette, affine: sprite.affine! };
    case "gBurnFlameSpriteTemplate":
      return { x: sprite.left, y: sprite.top, tileset: smallEmberFrame(sprite.tileOffset), palette: smallEmber.palette };
    case "gMagentaHeartSpriteTemplate":
      return { x: sprite.left, y: sprite.top, tileset: magentaHeart.tileset, palette: magentaHeart.palette };
    default:
      throw new Error(`liveStatusAnimationRow: unexpected status particle template ${sprite.template}`);
  }
}

/**
 * sae135 (S10A, ISSUES #168 slice SA5, docs/sae135-status-animation-render-3.md): Status_Sleep / Status_Burn / Status_Infatuation,
 * sprite-only scripts (the battler stays at its rest): statusConditionAnimations.ts statusParticleDisplayRow (stq132's reducer) at
 * rel = command age (rel 0 = the first gAnimScriptActive row = command age 0), back-to-front by SortSprites. `battler` = the battler
 * sprite's gSprites x / y (production's corner, elevation included, + 32): the letter Z starts from it; the flames / hearts start from
 * BATTLER_COORD_X / Y.
 */
function statusParticles(
  animation: StatusParticleAnimation, age: number, side: "player" | "opponent", battler: Readonly<{ x: number; y: number }>,
): LiveStatusAnimationRow {
  const row = statusParticleDisplayRow(animation, age, statusConditionTarget(side, battler.x, battler.y));
  return { battlerOffset: "rest", paletteBlend: null, sprites: row.sprites.map(particleSprite) };
}

/**
 * One row of a live B_ANIM_STATUS_* animation of a battler on `side`, or null when the animation is not drawn (yet). `battler` = the
 * battler sprite's gSprites x / y (sae135's particle animations need it; PSN / PRZ do not).
 */
export function liveStatusAnimationRow(
  animation: string, age: number, side: "player" | "opponent", battler: Readonly<{ x: number; y: number }> = { x: 0, y: 0 },
): LiveStatusAnimationRow | null {
  switch (animation) {
    case "PSN": {
      const coeff = blendColorCycleDelay2To12(age - 2);
      return {
        battlerOffset: shakeMon2Row(age, 0, PSN_SHAKE),
        paletteBlend: coeff === 0 ? null : { color: PSN_BLEND_COLOR, coeff },
        sprites: [],
      };
    }
    case "PRZ":
      return { battlerOffset: shakeMon2Row(age, PRZ_ELECTRICITY_FIRST_ROW, PRZ_SHAKE), paletteBlend: null, sprites: statusElectricity(age, side) };
    case "SLP":
      return statusParticles("SLP", age, side, battler);
    case "BRN":
      return statusParticles("BRN", age, side, battler);
    case "INFATUATION":
      return statusParticles("INFATUATION", age, side, battler);
    default:
      return null;
  }
}
