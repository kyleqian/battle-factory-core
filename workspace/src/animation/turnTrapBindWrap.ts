import { shakeMon2DisplayedOffsetAtAge } from "./shakeMon2.ts";

/**
 * trp1 (docs/trp1-turn-trap-animation.md): General_TurnTrap's Status_BindWrap (data/battle_anim_scripts.s:10368-10380), the end-of-turn
 * animation of a battler trapped by Bind, Wrap or any move other than Fire Spin / Whirlpool / Clamp / Sand Tomb
 * (AnimTask_GetTrappedMoveAnimId). Its attacker and target are both the trapped battler.
 *
 *   loadspritegfx ANIM_TAG_TENDRILS                                   script frame 0 (waits 1: resumes at 3)
 *   loopsewithpan SE_M_SCRATCH, SOUND_PAN_TARGET, 6, 2                3
 *   create_constrict_binding_sprite ANIM_TARGET, 4, 0, 16, 0, 1       3  (gConstrictBindingSpriteTemplate)
 *   delay 7                                                           -> 12
 *   create_constrict_binding_sprite ANIM_TARGET, 2, 0, 8, 1, 1        12
 *   delay 3                                                           -> 17
 *   createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1   17
 *   delay 20                                                          -> 39
 *   setarg 7, 0xFFFF; playsewithpan SE_M_BIND, SOUND_PAN_TARGET        39
 *   waitforvisualfinish; end
 *
 * Command age a = script frame a - 1 (the trap body's command clock, battleResolutionPresentationRender.ts TURN_TRAP_BODY_START_AGE). ROM
 * (tools/battle-lab/trp1-{wrap,bind}-{player,opp}-on.json, every row of the command identical on both sides): the first tendril shows at
 * age 5, its frames step at 8 / 12 / 16, the second shows at 14 (17 / 21 / 25), the target's ShakeMon2 x2 shows at 19 and is 0 again
 * from 34, the squeeze runs 41 .. 52 and both tendrils are gone at 54.
 *
 * AnimConstrictBinding (battle_anim_effects_1.c:2719-2766): the sprite sits at GetBattlerSpriteCoord2(target, X / Y) (the battle position
 * centre) + (0, initial_y), its affine anim paused at frame 0 (identity, or the x-mirrored identity for affine anim 1) until
 * gBattleAnimArgs[7] == 0xFFFF; then the affine anim runs (x scale -11 per frame for 6 frames, +11 for 6, END) and the sprite is destroyed
 * on the call after it ends (squeezes = 1). The image anim (sAnim_ConstrictBinding: tile frames 0 / 32 / 64 / 96, 4 calls each, END) runs
 * from creation; CreateSpriteAndAnimate gives the creation frame two calls. Every state is displayed one frame later (OAM latch).
 */
export interface TurnTrapTendril {
  /** OBJ centre (the sprite's x / y; the 64x32 box is centred on it). */
  readonly x: number;
  readonly y: number;
  /** sAnim_ConstrictBinding frame (tile offset frame * 32). */
  readonly frame: 0 | 1 | 2 | 3;
  /** OAM matrix (ConvertScaleParam of the affine x / y scale; pa < 0 for the mirrored second tendril). */
  readonly pa: number;
  readonly pd: number;
}

export interface TurnTrapBindWrapState {
  /** Back to front: the second tendril (subpriority target - 2) under the first (target - 4). */
  readonly tendrils: readonly TurnTrapTendril[];
  /** The target's ShakeMon2 x2 once the task has shown (absolute), else null (the battler stands as it is). */
  readonly targetX2: number | null;
}

const TENDRILS = [
  { createAge: 4, yOffset: 16, mirrored: false },
  { createAge: 13, yOffset: 8, mirrored: true },
] as const;
const RELEASE_AGE = 40;
const SQUEEZE_STEP = 11;
const SQUEEZE_FRAMES = 6;
/** The affine anim's END row; the sprite is destroyed on the next call (age 53). */
const AFFINE_END_AGE = RELEASE_AGE + 2 * SQUEEZE_FRAMES;
const SHAKE = { xOffset: 2, yOffset: 0, numTimes: 8, frameDelay: 1, createAge: 18 } as const;

/** ConvertScaleParam (sprite.c): 0x10000 / scale, truncated as the C division. */
const matrixParam = (scale: number): number => Math.trunc(0x10000 / scale);

function tendrilAtState(age: number, index: 0 | 1, center: Readonly<{ x: number; y: number }>): TurnTrapTendril | null {
  const tendril = TENDRILS[index];
  if (age < tendril.createAge || age > AFFINE_END_AGE) return null;
  const calls = age - tendril.createAge + 2;
  const frame = Math.min(3, Math.floor((calls - 1) / 4)) as 0 | 1 | 2 | 3;
  const applied = age < RELEASE_AGE ? 0 : Math.min(age - RELEASE_AGE + 1, 2 * SQUEEZE_FRAMES);
  const magnitude = 0x100 - SQUEEZE_STEP * Math.min(applied, SQUEEZE_FRAMES) + SQUEEZE_STEP * Math.max(applied - SQUEEZE_FRAMES, 0);
  return {
    x: center.x,
    y: center.y + tendril.yOffset,
    frame,
    pa: matrixParam(tendril.mirrored ? -magnitude : magnitude),
    pd: 0x100,
  };
}

/** The displayed Status_BindWrap state at command age `age`; `center` = the trapped battler's GetBattlerSpriteCoord(X / Y). */
export function turnTrapBindWrapAtAge(age: number, center: Readonly<{ x: number; y: number }>): TurnTrapBindWrapState {
  const state = age - 1;
  const tendrils = ([1, 0] as const)
    .map((index) => tendrilAtState(state, index, center))
    .filter((tendril): tendril is TurnTrapTendril => tendril !== null);
  // The common AnimTask_ShakeMon2 scanout (shakeMon2DisplayedOffsetAtAge): display createAge + 1 shows sequence tick 0.
  const targetX2 = age <= SHAKE.createAge ? null
    : shakeMon2DisplayedOffsetAtAge(SHAKE.xOffset, SHAKE.yOffset, SHAKE.numTimes, SHAKE.frameDelay, age, SHAKE.createAge).x2;
  return { tendrils, targetX2 };
}
