/**
 * Pure source-relative reducer for Move_RECYCLE.
 *
 * This ports the bounded presentation seam only: the Move_RECYCLE script,
 * `gRecycleSpriteTemplate` / `AnimRecycle_Step`, its affine animation, and
 * `AnimTask_BlendMonInAndOut`.  Recycle's item-history gate, item restoration,
 * HP, turn order, RNG, and all battle state remain owned by the battle engine.
 *
 * Source:
 * - `data/battle_anim_scripts.s:Move_RECYCLE`
 * - `src/battle_anim_effects_3.c:gRecycleSpriteTemplate` / `AnimRecycle*`
 * - `src/battle_anim_mons.c:AnimTask_BlendMonInAndOut*`
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export const RECYCLE_WINDOW_ROWS = 203;
export const RECYCLE_FIRST_INACTIVE_AGE = 202;
export const RECYCLE_TAG = 10278;

export type RecycleSide = "player" | "opponent";

export interface RecyclePoint {
  readonly x: number;
  readonly y: number;
}

/** Live source inputs; none are carrier- or trace-specific constants. */
export interface RecycleProfile {
  /** `GetBattlerSpriteCoordAttr(attacker, BATTLER_COORD_ATTR_TOP)`. */
  readonly attackerTop: number;
  /** `GetBattlerSpriteSubpriority(gBattleAnimAttacker)`. */
  readonly attackerSubpriority: number;
  /** Source-selected `CreateSprite` slot. */
  readonly spriteSlot: number;
  /** Source-selected affine matrix slot. */
  readonly matrixNum: number;
  /** `OBJ_PLTT_ID(gSprites[attacker].oam.paletteNum) + 1`. */
  readonly attackerPaletteIdPlusOne: number;
}

export interface RecycleSprite {
  readonly slot: number;
  readonly template: "gRecycleSpriteTemplate";
  readonly callback: "AnimRecycle_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly subpriority: number;
  readonly invisible: false;
  readonly matrixNum: number;
  /** `AFFINEANIMCMD_FRAME(0, 0, -4, 64)` after the source callback pass. */
  readonly matrix: readonly [number, number, number, number];
  readonly data: readonly [number, number, number, 0, 0, 0, number, number];
  /** Source affine-ObjBlend 64x64 OAM state, before generic OAM transfer. */
  readonly attr: readonly [number, number, 31025];
}

export interface RecycleBlendTask {
  readonly func: "AnimTask_BlendMonInAndOut_Step";
  /** The complete source `gTasks[taskId].data[0..7]` state. */
  readonly data: readonly [number, 32767, number, 12, number, 2, number, 1];
}

export interface RecycleState {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{
    readonly owner: "Move_RECYCLE";
    readonly offset: 0 | 3 | 5 | 10 | 23 | 45 | 51;
    readonly wait: 0 | 1;
    readonly args: readonly [number, number, number, number, number, number, number, number];
  }>;
  readonly resources: Readonly<{
    readonly recycleLoaded: boolean;
    readonly tileTags: readonly number[];
    readonly paletteTags: readonly number[];
  }>;
  /** `monbg` -> `clearmonbg`'s two-task cleanup ownership. */
  readonly monBg: "inactive" | "active" | "clearing";
  readonly registers: Readonly<{
    readonly bldcnt: 0 | 16192;
    readonly bldalpha: readonly [number, number];
  }>;
  readonly sprite: RecycleSprite | null;
  readonly blendTask: RecycleBlendTask | null;
  readonly visualTaskCount: 0 | 1;
  readonly soundTaskCount: 0 | 1;
  readonly audio: Readonly<{
    readonly sound: "SE_M_TAKE_DOWN";
    readonly pan: -64 | 63;
    /** `loopsewithpan` starts three cues; the script then starts one more. */
    readonly starts: readonly number[];
  }>;
}

const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const BLEND_ARGS = [0, 32767, 12, 2, 1, 0, 0, 0] as const;

function sourceAtAge(age: number): RecycleState["source"] {
  if (age <= 0) return { owner: "Move_RECYCLE", offset: 0, wait: 0, args: ZERO_ARGS };
  if (age <= 3) return { owner: "Move_RECYCLE", offset: 3, wait: age === 1 ? 1 : 0, args: ZERO_ARGS };
  if (age <= 6) return { owner: "Move_RECYCLE", offset: 5, wait: age === 4 ? 1 : 0, args: ZERO_ARGS };
  if (age <= 9) return { owner: "Move_RECYCLE", offset: 10, wait: age === 7 ? 1 : 0, args: ZERO_ARGS };
  if (age <= 148) return { owner: "Move_RECYCLE", offset: 23, wait: 1, args: ZERO_ARGS };
  if (age <= 196) return { owner: "Move_RECYCLE", offset: 45, wait: 1, args: BLEND_ARGS };
  return { owner: "Move_RECYCLE", offset: 51, wait: age === 197 ? 1 : 0, args: BLEND_ARGS };
}

function affineMatrixAtAge(age: number): readonly [number, number, number, number] {
  // The creation display gets the affine command's first -4 step and the
  // regular sprite affine updater, yielding source phase +8 at age 10.
  const phase = (age - 8) * 4;
  const cosine = GBA_SINE_TABLE_256[(phase + 64) & 0xff]!;
  const sine = GBA_SINE_TABLE_256[phase & 0xff]!;
  return [cosine, sine, -sine, cosine];
}

function recycleCallbackData(age: number): RecycleSprite["data"] {
  let data0 = 0;
  let data1 = 0;
  let data2 = 0;
  let data6 = 0;
  let data7 = 16;

  // `AnimRecycle` swaps callbacks on the creation row; each retained sprite
  // row then contains the post-`AnimRecycle_Step` state.
  for (let pass = 0; pass < age - 9; pass += 1) {
    if (data2 === 0) {
      data0 += 1;
      if (data0 > 1) {
        data0 = 0;
        if ((data1 & 1) === 0) {
          if (data6 < 16) data6 += 1;
        } else if (data7 !== 0) {
          data7 -= 1;
        }
        data1 += 1;
        if (data7 === 0) data2 += 1;
      }
    } else if (data2 === 1) {
      data0 += 1;
      if (data0 === 10) {
        data0 = 0;
        data1 = 0;
        data2 += 1;
      }
    } else if (data2 === 2) {
      data0 += 1;
      if (data0 > 1) {
        data0 = 0;
        if ((data1 & 1) === 0) {
          if (data6 !== 0) data6 -= 1;
        } else if (data7 < 16) {
          data7 += 1;
        }
        data1 += 1;
        if (data7 === 16) data2 += 1;
      }
    }
  }
  return [data0, data1, data2, 0, 0, 0, data6, data7];
}

function spriteAtAge(
  age: number,
  attackerCenter: Readonly<RecyclePoint>,
  profile: Readonly<RecycleProfile>,
): RecycleSprite | null {
  if (age < 10 || age > 147) return null;
  const y = Math.max(16, profile.attackerTop);
  return {
    slot: profile.spriteSlot,
    template: "gRecycleSpriteTemplate",
    callback: "AnimRecycle_Step",
    x: attackerCenter.x,
    y,
    x2: 0,
    y2: 0,
    subpriority: profile.attackerSubpriority - 2,
    invisible: false,
    matrixNum: profile.matrixNum,
    matrix: affineMatrixAtAge(age),
    data: recycleCallbackData(age),
    attr: [0x500 | ((y - 32) & 0xff), 0xc000 | ((attackerCenter.x - 32) & 0x1ff), 31025],
  };
}

function blendTaskAtAge(age: number, profile: Readonly<RecycleProfile>): RecycleBlendTask | null {
  if (age < 149 || age > 195) return null;
  const steps = age < 150 ? 0 : Math.floor((age - 150) / 2) + 1;
  const coefficient = steps <= 12 ? steps : 24 - steps;
  return {
    func: "AnimTask_BlendMonInAndOut_Step",
    data: [
      profile.attackerPaletteIdPlusOne,
      32767,
      coefficient,
      12,
      age & 1,
      2,
      steps >= 12 ? 1 : 0,
      1,
    ],
  };
}

/** Literal source state at one source-relative Move_RECYCLE age. */
export function recycleAtAge(
  age: number,
  side: RecycleSide,
  attackerCenter: Readonly<RecyclePoint>,
  profile: Readonly<RecycleProfile>,
): RecycleState {
  const sprite = spriteAtAge(age, attackerCenter, profile);
  const blendTask = blendTaskAtAge(age, profile);
  const alpha = sprite ? [sprite.data[6], sprite.data[7]] as const : age >= 7 && age <= 196 ? [0, 16] as const : [0, 0] as const;
  const loaded = age >= 1 && age <= 201;
  return {
    age,
    active: age >= 0 && age <= 201,
    source: sourceAtAge(age),
    resources: {
      recycleLoaded: loaded,
      tileTags: loaded ? [RECYCLE_TAG] : [],
      paletteTags: loaded ? [RECYCLE_TAG] : [],
    },
    monBg: age < 4 || age > 199 ? "inactive" : age >= 197 ? "clearing" : "active",
    registers: {
      bldcnt: age >= 7 && age <= 196 ? 16192 : 0,
      bldalpha: alpha,
    },
    sprite,
    blendTask,
    visualTaskCount: sprite || blendTask ? 1 : 0,
    soundTaskCount: age >= 10 && age <= 58 ? 1 : 0,
    audio: {
      sound: "SE_M_TAKE_DOWN",
      pan: side === "player" ? -64 : 63,
      starts: [10, 34, 59, 149].filter((start) => start <= age),
    },
  };
}
