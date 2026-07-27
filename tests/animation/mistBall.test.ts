import { describe, expect, it } from "vitest";
import {
  MIST_BALL_DURATION_TICKS,
  MIST_BALL_LAST_VISIBLE_TICK,
  mistBallSpritePosition,
} from "../../src/animation/mistBall.ts";
import mistBallProbe from "../../src/data/gen/mist-ball-sprite-probe.json" with { type: "json" };

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
