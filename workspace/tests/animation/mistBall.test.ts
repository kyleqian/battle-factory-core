import { describe, expect, it } from "vitest";
import {
  MIST_BALL_DURATION_TICKS,
  MIST_BALL_FRAME_COUNT,
  MIST_BALL_LAST_VISIBLE_TICK,
  mistBallAtAge,
  mistBallSpritePosition,
} from "../../src/animation/mistBall.ts";
import mistBallProbe from "../fixtures/data/mist-ball-sprite-probe.json" with { type: "json" };

// RAM-probe evidence (`tools/probe/dump-mist-ball-sprite.py` against
// `tools/battle-lab/mechanic-mist-ball-latias-onix.json`, MOVE_MIST_BALL
// cast opponent (Latias) -> player (Onix)): every real tick the thrown
// mist-ball sprite (`gMistBallSpriteTemplate`, identified unambiguously by
// its `template` pointer, `0x08595c70`, matching `bin/oracle symbols
// gMistBallSpriteTemplate`) is in `gSprites`, from its creation tick (RAM
// tick 88 -> probe-relative tick 0) through the tick after
// `AnimTranslateLinear_WithFollowup` hands off to `DestroyAnimSprite`
// (RAM tick 119 -> probe-relative tick 31). This is dev-time-only test
// evidence (the executable-frontier ratchet forbids production imports of
// `*-probe.json`); `src/animation/mistBall.ts` derives every field from the
// ported `AnimThrowMistBall` -> `TranslateAnimSpriteToTargetMonLocation` ->
// `StartAnimLinearTranslation` chain, not from replaying this table.

interface MistBallProbeSprite {
  slot: number;
  template: string;
  isMistBall: boolean;
  callback: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
  animNum: number;
  data: number[];
  subpriority: number;
}

interface MistBallProbeRow {
  tick: number;
  animAttacker: number;
  animTarget: number;
  animScriptActive: number;
  mistBallSprite: MistBallProbeSprite | null;
}

const PROBE = mistBallProbe as {
  source: string;
  spawnTick: number;
  ticks: MistBallProbeRow[];
};

const SPAWN_TICK = PROBE.spawnTick;

// Attacker/target anchors read directly off the probe's own creation-tick
// row (`sprite->x/y`, fixed for the sprite's whole life) and its final
// `data[2]`/`data[4]` (the target's own `GetBattlerSpriteCoord` values,
// written once by `TranslateAnimSpriteToTargetMonLocation` and never
// touched again).
const CREATION_ROW = PROBE.ticks.find((row) => row.tick === SPAWN_TICK)!;
const ATTACKER = { x: CREATION_ROW.mistBallSprite!.x, y: CREATION_ROW.mistBallSprite!.y };
const TARGET = {
  x: CREATION_ROW.mistBallSprite!.data[2]!,
  y: CREATION_ROW.mistBallSprite!.data[4]!,
};

describe("AnimThrowMistBall / TranslateAnimSpriteToTargetMonLocation / StartAnimLinearTranslation port", () => {
  it("reads a nontrivial creation-tick geometry from the probe (sanity, not tautology)", () => {
    expect(ATTACKER).toEqual({ x: 176, y: 35 });
    expect(TARGET).toEqual({ x: 72, y: 88 });
  });

  it(`script decode: single createsprite, duration ${MIST_BALL_DURATION_TICKS}`, () => {
    expect(MIST_BALL_DURATION_TICKS).toBe(30);
    expect(MIST_BALL_LAST_VISIBLE_TICK).toBe(31);
  });

  it("matches every real RAM tick the probe recorded, field by field", () => {
    let checked = 0;
    for (const row of PROBE.ticks) {
      const sprite = row.mistBallSprite;
      if (!sprite) continue;
      const relTick = row.tick - SPAWN_TICK;
      const predicted = mistBallSpritePosition(relTick, { attacker: ATTACKER, target: TARGET });
      expect(predicted.x - ATTACKER.x, `x2 at relTick=${relTick}`).toBe(sprite.x2);
      expect(predicted.y - ATTACKER.y, `y2 at relTick=${relTick}`).toBe(sprite.y2);
      // sprite->x/y are the fixed attacker anchor for the sprite's whole
      // life - never re-derived from the target, unlike x2/y2.
      expect(sprite.x, `sprite.x at relTick=${relTick}`).toBe(ATTACKER.x);
      expect(sprite.y, `sprite.y at relTick=${relTick}`).toBe(ATTACKER.y);
      checked += 1;
    }
    // Every in-use tick from creation (31) through the freeze tick
    // (32nd) - see MIST_BALL_LAST_VISIBLE_TICK.
    expect(checked).toBe(MIST_BALL_LAST_VISIBLE_TICK + 1);
  });

  it("is absent from gSprites before creation and after DestroyAnimSprite runs (probe ticks flanking the window)", () => {
    const before = PROBE.ticks.filter((row) => row.tick < SPAWN_TICK);
    const after = PROBE.ticks.filter((row) => row.tick > SPAWN_TICK + MIST_BALL_LAST_VISIBLE_TICK);
    expect(before.length).toBeGreaterThan(0);
    expect(after.length).toBeGreaterThan(0);
    for (const row of [...before, ...after]) {
      expect(row.mistBallSprite, `tick ${row.tick}`).toBeNull();
    }
  });

  it("freezes at the final accumulated position for one extra tick before DestroyAnimSprite (data[0]==0 self-check tick)", () => {
    const at30 = mistBallSpritePosition(MIST_BALL_DURATION_TICKS, { attacker: ATTACKER, target: TARGET });
    const at31 = mistBallSpritePosition(MIST_BALL_LAST_VISIBLE_TICK, { attacker: ATTACKER, target: TARGET });
    expect(at31).toEqual(at30);
    expect(at30).toEqual({ x: 73, y: 87 });
  });

  it("the creation tick itself has zero accumulated offset (pre-callback, RAM-confirmed not a curve-fit assumption)", () => {
    const at0 = mistBallSpritePosition(0, { attacker: ATTACKER, target: TARGET });
    expect(at0).toEqual(ATTACKER);
  });
});

describe("MOVE_MIST_BALL complete source-relative reducer", () => {
  const geometry = {
    attacker: { x: 72, y: 90 },
    target: { x: 176, y: 43 },
  } as const;

  it("owns all 213 ages through the first inactive cleanup frame", () => {
    expect(MIST_BALL_FRAME_COUNT).toBe(213);
    expect(mistBallAtAge(0, geometry)).toMatchObject({
      active: true,
      smallBubblesLoaded: false,
      whiteFeatherLoaded: false,
      projectile: null,
      visualTaskCount: 0,
    });
    expect(mistBallAtAge(1, geometry).smallBubblesLoaded).toBe(true);
    expect(mistBallAtAge(4, geometry).whiteFeatherLoaded).toBe(true);
    expect(mistBallAtAge(211, geometry)).toMatchObject({
      active: true,
      smallBubblesLoaded: true,
      whiteFeatherLoaded: true,
      projectile: null,
      visualTaskCount: 0,
    });
    expect(mistBallAtAge(212, geometry)).toEqual({
      active: false,
      smallBubblesLoaded: false,
      whiteFeatherLoaded: false,
      projectile: null,
      shortShakeX2: 0,
      longShakeX2: 0,
      targetX2: 0,
      displayedTargetX2: 0,
      backgroundFlash: "none",
      targetBlendCoefficient: 0,
      fog: { loaded: false, taskActive: false, scrollX: 0, eva: 0, evb: 0 },
      visualTaskCount: 0,
      audio: { stringShot: false, sandAttackPulse: false, haze: false },
    });
  });

  it("ports the projectile, independent ShakeMon schedules, and real visual wait", () => {
    expect(mistBallAtAge(9, geometry).projectile).toMatchObject({ x: 72, y: 90, callbackAge: 0 });
    expect(mistBallAtAge(40, geometry).projectile).toMatchObject({ x: 175, y: 44, callbackAge: 31 });
    expect(mistBallAtAge(41, geometry).projectile).toBeNull();
    expect(mistBallAtAge(42, geometry)).toMatchObject({ shortShakeX2: 5, longShakeX2: 0, visualTaskCount: 2 });
    expect(mistBallAtAge(56, geometry)).toMatchObject({ shortShakeX2: 0, longShakeX2: 4, visualTaskCount: 3 });
    expect(mistBallAtAge(124, geometry)).toMatchObject({ targetX2: 0, displayedTargetX2: 4, visualTaskCount: 1 });
  });

  it("ports palette flash, fog load/ramp/hold/fade/register tail, and audio cleanup", () => {
    expect(mistBallAtAge(42, geometry).backgroundFlash).toBe("purple");
    expect(mistBallAtAge(43, geometry).backgroundFlash).toBe("white");
    expect(mistBallAtAge(48, geometry).backgroundFlash).toBe("none");
    expect(mistBallAtAge(44, geometry).fog).toEqual({ loaded: true, taskActive: true, scrollX: 0, eva: 0, evb: 16 });
    expect(mistBallAtAge(65, geometry).fog).toEqual({ loaded: true, taskActive: true, scrollX: -20, eva: 5, evb: 12 });
    expect(mistBallAtAge(149, geometry).fog).toEqual({ loaded: true, taskActive: true, scrollX: -104, eva: 5, evb: 12 });
    expect(mistBallAtAge(165, geometry).fog).toEqual({ loaded: true, taskActive: true, scrollX: -120, eva: 1, evb: 15 });
    expect(mistBallAtAge(166, geometry).fog).toEqual({ loaded: true, taskActive: true, scrollX: -121, eva: 0, evb: 16 });
    expect(mistBallAtAge(170, geometry).fog).toEqual({ loaded: false, taskActive: false, scrollX: 0, eva: 0, evb: 16 });
    expect(mistBallAtAge(181, geometry).targetBlendCoefficient).toBe(0);
    expect(mistBallAtAge(212, geometry).audio).toEqual({ stringShot: false, sandAttackPulse: false, haze: false });
  });
});
