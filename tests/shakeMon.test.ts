import { describe, expect, it } from "vitest";
import { shakeMonOffsetAtTick, shakeMonSequence } from "../src/engine/shakeMon.ts";

describe("AnimTask_ShakeMon 1:1 port", () => {
  it("reproduces QUICK_ATTACK's dense-oracle-pinned display ages exactly", () => {
    // Source call: AnimTask_ShakeMon(ANIM_TARGET,5,0,6,1), created the same
    // age impact becomes visible (age 58). Oracle-pinned nonzero ages:
    // 58, 61, 62, 65, 66 (quickAttack.test.ts / 219/219 + 214/214 comparators).
    const nonzeroTicks = shakeMonSequence(5, 0, 6, 1)
      .map((offset, tick) => ({ tick, x2: offset.x2 }))
      .filter(({ x2 }) => x2 !== 0)
      .map(({ tick }) => tick);
    expect(nonzeroTicks).toEqual([0, 3, 4, 7, 8]);
    expect([58, 61, 62, 65, 66].map((age) => shakeMonOffsetAtTick(5, 0, 6, 1, age - 58).x2))
      .toEqual([5, 5, 5, 5, 5]);
    expect(shakeMonOffsetAtTick(5, 0, 6, 1, 11).x2).toBe(0);
  });

  it(
    "reproduces FLY's dense-oracle-pinned display ages through a +1 same-frame-double-step skip",
    () => {
      // FlyUnleash's own instance: AnimTask_ShakeMon(ANIM_TARGET,6,0,8,1)
      // (battle_anim_scripts.s:6418), created in the same script-command
      // batch as the hitsplat (zero `delay` between them - both execute
      // inside one `RunAnimScriptCommand` do-while pass). The literal
      // port's tick 0 (the creation-time synchronous self-call, x2 still
      // holds xOffset) and tick 1 (the first regular toggle, back to zero)
      // are NEVER independently observable at this call site: RAM-probe
      // evidence (`dump-fly-shakemon-tasks.py`, both strike comparators)
      // shows the task's own first readable RAM tick already has
      // data[1] (numTimes) one less than a fresh creation would, i.e. it
      // has already been stepped twice before any frame renders. This
      // call site's task priority (5, vs QUICK_ATTACK's 2 in the test
      // above) causes `InsertTask` to place it AFTER the calling
      // controller task's position in `RunTasks`'s same-frame traversal,
      // so `RunTasks` revisits and steps it a second time on its own
      // creation frame - collapsing ticks 0 and 1 into one displayed
      // tick. Every later tick is a normal 1:1 step (confirmed through
      // self-destroy in both probes). This is a genuine per-call-site
      // scheduling fact pinned by evidence, not a curve fit: the isolated
      // leading tick this port predicts is provably never displayed here.
      const nonzeroTicks = shakeMonSequence(6, 0, 8, 1)
        .map((offset, tick) => ({ tick, x2: offset.x2 }))
        .filter(({ x2 }) => x2 !== 0)
        .map(({ tick }) => tick);
      expect(nonzeroTicks).toEqual([0, 3, 4, 7, 8, 11, 12]);
      // fly.ts's FLY_SHAKE_CREATION_AGE is FLY_IMPACT_FIRST_AGE (22): the
      // RAM-probed creation tick for both strike comparators (opponent-
      // and player-attacker) converts to display age 22 under each
      // fixture's own oracleFrame/presentationAge/animationAgeOffset
      // mapping plus the codebase's uniform 1-tick RAM-write-to-displayed-
      // pixel lag (also reconciles FLY_IMPACT_FIRST_AGE itself against the
      // hitsplat's RAM creation tick). Querying the port at
      // `age - creationAge + 1` (skipping index 0) reproduces
      // {24,25,28,29,32,33} - fly.ts's previously hand-fit
      // FLY_SHAKE_AGES set - exactly, dropping the never-displayed tick 0.
      const creationAge = 22;
      const displayAges = [24, 25, 28, 29, 32, 33];
      const x2AtDisplayAges = displayAges.map(
        (age) => shakeMonOffsetAtTick(6, 0, 8, 1, age - creationAge + 1).x2,
      );
      expect(x2AtDisplayAges).toEqual([6, 6, 6, 6, 6, 6]);
      // And every age strictly between the creation tick and the first
      // hand-fit-matching tick stays zero (the collapsed tick 0/1, plus
      // the delay-countdown ticks 22 and 23).
      expect(
        [22, 23].map(
          (age) => shakeMonOffsetAtTick(6, 0, 8, 1, age - creationAge + 1).x2,
        ),
      ).toEqual([0, 0]);
    },
  );
});
