// MIST_BALL remainder, rung 3: the thrown ball sprite's own flight, driven
// by a direct port of `AnimThrowMistBall` -> `TranslateAnimSpriteToTargetMonLocation`
// -> `StartAnimLinearTranslation` (`reference/pokeemerald/src/battle_anim_ice.c:
// 1090-1095`, `src/battle_anim_mons.c:1546-1568`), wired through the shared
// anim-script interpreter's createsprite path (`animScriptInterpreter.ts`)
// and the already-ported linear-translation primitive
// (`animLinearTranslation.ts`) - see ANIMATION_PROGRESS.md's 2026-07-24
// "MIST_BALL remainder, rungs 1-2" and this step's own dated section.
//
// This module covers ONLY the thrown-ball sprite. MIST_BALL as a whole
// remains unsupported: `waitforvisualfinish` sprite-lifetime semantics,
// `AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s BG pipeline, and
// generalizing `AnimTask_BlendBattleAnimPal` are still open (see the
// "Interpreter generalization, second-move proof" section's remainder
// list) - this module is not wired into `battleScene.ts`'s move dispatch.
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
