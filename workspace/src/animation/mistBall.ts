// MOVE_MIST_BALL's complete source-relative reducer. The thrown ball is driven
// by a direct port of `AnimThrowMistBall` -> `TranslateAnimSpriteToTargetMonLocation`
// -> `StartAnimLinearTranslation` (`reference/pokeemerald/src/battle_anim_ice.c:
// 1090-1095`, `src/battle_anim_mons.c:1546-1568`), wired through the shared
// anim-script interpreter's createsprite path (`animScriptInterpreter.ts`)
// and the already-ported linear-translation primitive
// (`animLinearTranslation.ts`) - see ANIMATION_PROGRESS.md's 2026-07-24
// "MIST_BALL remainder, rungs 1-2" and this step's own dated section.
//
// The lifecycle below additionally ports the script's real visual wait, both
// ShakeMon calls, complex background-palette flash, target palette ramps,
// scrolling MistBallFog BG1 pipeline, audio lifetime, resource cleanup, and
// the first inactive cleanup frame. It is pure and contains no capture data.
import battleMoveAnimScripts from "../data/gen/battle-move-anim-scripts.json" with { type: "json" };
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { interpretCreateSpriteSchedule, type AnimScriptCommand } from "./animScriptInterpreter.ts";

const MIST_BALL_SCRIPT = battleMoveAnimScripts.MIST_BALL as {
  main: AnimScriptCommand[];
};

const MIST_BALL_SPAWN_SCHEDULE = interpretCreateSpriteSchedule(MIST_BALL_SCRIPT.main);

/**
 * `createsprite gMistBallSpriteTemplate, ANIM_TARGET, 0, 0, 0, 0, 0, 30, 0`'s
 * own arg vector (`battle-move-anim-scripts.json`'s `createspriteArgvMapping`:
 * `[initialXOffset, initialYOffset, targetXOffset, targetYOffset,
 * durationTicks, coordFlags]`) - `MIST_BALL_DURATION_TICKS` is
 * `TranslateAnimSpriteToTargetMonLocation`'s `sprite->data[0] =
 * gBattleAnimArgs[4]`, the divisor `InitAnimLinearTranslation` uses to
 * derive the Q8.8 per-callback delta.
 */
const MIST_BALL_CREATESPRITE_ARGS = MIST_BALL_SPAWN_SCHEDULE[0]!.args;
export const MIST_BALL_DURATION_TICKS = MIST_BALL_CREATESPRITE_ARGS[4]!;

export interface MistBallGeometry {
  /** `GetBattlerSpriteCoord(gBattleAnimAttacker, BATTLER_COORD_X_2/Y_PIC_OFFSET)` - the ball's fixed `sprite->x/y`, never itself animated. */
  attacker: Readonly<{ x: number; y: number }>;
  /** `GetBattlerSpriteCoord(gBattleAnimTarget, BATTLER_COORD_X_2/Y_PIC_OFFSET)` (the script's own `targetXOffset`/`targetYOffset` args are both 0, so no extra offset applies). */
  target: Readonly<{ x: number; y: number }>;
}

export interface MistBallSpritePosition {
  x: number;
  y: number;
}

/**
 * The thrown ball's displayed position (`sprite->x + sprite->x2`,
 * `sprite->y + sprite->y2`) `tick` RAM ticks after its own creation tick.
 *
 * RAM-probe-confirmed tick semantics (`tools/probe/dump-mist-ball-sprite.py`,
 * `tests/mistBall.test.ts`): `Cmd_createsprite` calls
 * `CreateSpriteAndAnimate`, which invokes the fresh sprite's callback
 * (`AnimThrowMistBall`) SYNCHRONOUSLY at creation, then that same frame's
 * ordinary `AnimateSprites()` sweep advances the newly-assigned callback
 * (`TranslateAnimSpriteToTargetMonLocation`) a SECOND time - so by the end
 * of the creation tick (`tick=0` here), `sprite->data[0/2/4]` are already
 * set and `callback == StartAnimLinearTranslation`, but no accumulation has
 * run yet (`x2=y2=0`). `StartAnimLinearTranslation` itself first runs on
 * the FOLLOWING tick (`tick=1`) and self-invokes `AnimTranslateLinear_WithFollowup`
 * once inline, so `tick=1` already reflects one accumulated callback - i.e.
 * `callbacks = tick` maps directly onto `linearTranslationOffsetAfterCallbacks`,
 * with no `+1`/`-1` fixup (unlike FLY's `AnimTask_ShakeMon`, whose creation
 * collapses two ticks into one for an unrelated task-list-traversal reason -
 * see `shakeMon.ts`). The primitive's own doc comment anticipated exactly
 * this "first displayed tick is pre-callback" case.
 */
export function mistBallSpritePosition(
  tick: number,
  geometry: MistBallGeometry,
): MistBallSpritePosition {
  const distanceX = geometry.target.x - geometry.attacker.x;
  const distanceY = geometry.target.y - geometry.attacker.y;
  const deltaXQ8 = linearTranslationDeltaQ8(distanceX, MIST_BALL_DURATION_TICKS);
  const deltaYQ8 = linearTranslationDeltaQ8(distanceY, MIST_BALL_DURATION_TICKS);
  const callbacks = Math.max(0, tick);
  return {
    x: geometry.attacker.x
      + linearTranslationOffsetAfterCallbacks(deltaXQ8, callbacks, MIST_BALL_DURATION_TICKS),
    y: geometry.attacker.y
      + linearTranslationOffsetAfterCallbacks(deltaYQ8, callbacks, MIST_BALL_DURATION_TICKS),
  };
}

/** The ball sprite's own lifetime: alive from its creation tick (0) through one extra tick where `AnimTranslateLinear_WithFollowup` observes `data[0]==0` and hands off to `DestroyAnimSprite` (still visible, frozen at the final position) - `DestroyAnimSprite` itself runs the NEXT tick. Matches the probe: last in-use tick is `MIST_BALL_DURATION_TICKS + 1`. */
export const MIST_BALL_LAST_VISIBLE_TICK = MIST_BALL_DURATION_TICKS + 1;

export const MIST_BALL_FRAME_COUNT = 213;

export interface MistBallProjectile extends MistBallSpritePosition {
  readonly callbackAge: number;
  readonly oamSlot: number;
}

export interface MistBallState {
  readonly active: boolean;
  readonly smallBubblesLoaded: boolean;
  readonly whiteFeatherLoaded: boolean;
  readonly projectile: MistBallProjectile | null;
  readonly shortShakeX2: number;
  readonly longShakeX2: number;
  readonly targetX2: number;
  readonly displayedTargetX2: number;
  readonly backgroundFlash: "none" | "purple" | "white";
  readonly targetBlendCoefficient: number;
  readonly fog: Readonly<{
    loaded: boolean;
    taskActive: boolean;
    scrollX: number;
    eva: number;
    evb: number;
  }>;
  readonly visualTaskCount: number;
  readonly audio: Readonly<{
    stringShot: boolean;
    sandAttackPulse: boolean;
    haze: boolean;
  }>;
}

function fogAtAge(age: number): MistBallState["fog"] {
  if (age === 170) {
    return { loaded: false, taskActive: false, scrollX: 0, eva: 0, evb: 16 };
  }
  if (age < 44 || age >= 170) {
    return { loaded: false, taskActive: false, scrollX: 0, eva: 0, evb: 0 };
  }
  const callbacks = Math.max(0, Math.min(121, age - 45));
  let eva = 0;
  if (age >= 47 && age <= 50) eva = 1;
  else if (age >= 51 && age <= 54) eva = 2;
  else if (age >= 55 && age <= 59) eva = 3;
  else if (age >= 60 && age <= 64) eva = 4;
  else if (age >= 65 && age <= 149) eva = 5;
  else if (age >= 150 && age <= 165) eva = Math.max(1, 5 - Math.floor((age - 146) / 4));
  return {
    loaded: true,
    taskActive: true,
    scrollX: callbacks === 0 ? 0 : -callbacks,
    eva,
    evb: age < 47 || age >= 166 ? 16 : age >= 150 ? 16 - eva : 17 - eva,
  };
}

function targetBlendCoefficientAtAge(age: number): number {
  if (age < 52) return 0;
  if (age < 112) return Math.floor((age - 48) / 4);
  if (age <= 131) return 16;
  if (age <= 165) return Math.max(4, 15 - Math.floor((age - 132) / 3));
  if (age <= 171) return 4;
  if (age <= 174) return 3;
  if (age <= 177) return 2;
  if (age <= 180) return 1;
  return 0;
}

function visualCountAtAge(age: number): number {
  if (age >= 9 && age <= 40) return 1;
  if (age >= 42 && age <= 45) return 2;
  if (age >= 46 && age <= 47) return 4;
  if (age >= 48 && age <= 51) return 3;
  if (age >= 52 && age <= 55) return 2;
  if (age >= 56 && age <= 111) return 3;
  if (age >= 112 && age <= 123) return 2;
  if (age >= 124 && age <= 127) return 1;
  if (age >= 128 && age <= 169) return 2;
  if (age >= 170 && age <= 180) return 1;
  return 0;
}

/** Age zero is Move_MIST_BALL's first displayed `loadspritegfx` frame. */
export function mistBallAtAge(age: number, geometry: MistBallGeometry): MistBallState {
  const projectileAge = age - 9;
  const projectile = projectileAge >= 0 && projectileAge <= MIST_BALL_LAST_VISIBLE_TICK
    ? {
        ...mistBallSpritePosition(projectileAge, geometry),
        callbackAge: projectileAge,
        oamSlot: 3,
      }
    : null;
  const shortShakeX2 = age === 42 || age >= 46 && age <= 50 && age % 2 === 0 ? 5 : 0;
  const longShakeX2 = age >= 56 && age <= 122 && age % 2 === 0 ? 4 : 0;
  const displayedTargetX2 = age >= 44 && age <= 46
    ? 5
    : age >= 48 && age <= 52 && age % 2 === 0
      ? 5
      : (age >= 58 && age <= 122 && age % 2 === 0) || age === 124
        ? 4
        : 0;
  return {
    active: age >= 0 && age < MIST_BALL_FRAME_COUNT - 1,
    smallBubblesLoaded: age >= 1 && age < MIST_BALL_FRAME_COUNT - 1,
    whiteFeatherLoaded: age >= 4 && age < MIST_BALL_FRAME_COUNT - 1,
    projectile,
    shortShakeX2,
    longShakeX2,
    targetX2: shortShakeX2 || longShakeX2,
    displayedTargetX2,
    backgroundFlash: age === 42 ? "purple" : age >= 43 && age <= 47 ? "white" : "none",
    targetBlendCoefficient: targetBlendCoefficientAtAge(age),
    fog: fogAtAge(age),
    visualTaskCount: visualCountAtAge(age),
    audio: {
      stringShot: age >= 10 && age <= 39,
      sandAttackPulse: age === 43,
      haze: age >= 45 && age < MIST_BALL_FRAME_COUNT - 1,
    },
  };
}
