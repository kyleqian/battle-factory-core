// Tier-1 pins for the class-4 bounce bind (ISSUES #81 / ISSUES #78 residual
// (3), docs/fight-menu-chrome-ground-truth.md §8).
//
// `commandMenuBounceY2(age)` is the live generated command menu's
// entry-relative `SpriteCB_BounceEffect` y2 for the PLAYER healthbox and
// PLAYER battler sprite only. Source contract (battle_main.c):
//   - DoBounceEffect (battle_main.c:2899-2938) seeds the invisible bouncer's
//     `sSinIndex` = 128 (BOUNCE_HEALTHBOX) / 192 (BOUNCE_MON);
//   - SpriteCB_BounceEffect (battle_main.c:2967-2979) steps `sSinIndex += 7`
//     each frame and writes `y2 = Sin(index, 1) + 1` where
//     `Sin(index, 1) = gSineTable[index] >> 8` (trig.c:515-518);
//   - the opponent never bounces in singles: only
//     `DoBounceEffect(gActiveBattler, ...)` runs, and gActiveBattler's sprite
//     is the player's side (§8(b)).
// `age` is the menu-entry-relative clock (`idleBounceElapsed`); age < 1 is
// the menu's first interactive tick (no bounce yet -- the seed only fires on
// the next screen tick), and age >= 1 uses index = 7 * (age - 1).
//
// The oracle-schedule checks below are the measured torment-fixture frames
// (tools/compare/out/run-2026-08-06-21-23-36Z-11569, oracle y2 measured via
// vertical cross-correlation against the frame-765 rest pose); the app stage
// seeds idleBounceElapsed = 7 (1 first-tick reveal + 6 pre-stage bounce
// frames), so frame f renders commandMenuBounceY2(7 + n(f)).

import { describe, expect, it } from "vitest";
import { commandMenuBounceY2 } from "../src/engine/battleMenu.ts";

describe("commandMenuBounceY2: entry-relative SpriteCB_BounceEffect y2 (class-4 bind)", () => {
  it("age 0 (the menu's first interactive tick) shows no bounce -- DoBounceEffect has not fired a screen tick yet", () => {
    expect(commandMenuBounceY2(0)).toEqual({ onixY2: 0, healthboxY2: 0 });
  });

  it("age 1 renders the seed values: healthbox seed 128 -> +1, mon seed 192 -> 0", () => {
    // bounceSin(128) = gSineTable[128] >> 8 = 0 -> healthboxY2 1;
    // bounceSin(192) = -236 >> 8 = -1 -> onixY2 0.
    expect(commandMenuBounceY2(1)).toEqual({ onixY2: 0, healthboxY2: 1 });
  });

  it("healthbox y2 sequence over two full sine periods (seeds 128, +7/frame, y2 = table[index]>>8 + 1)", () => {
    const seq = Array.from({ length: 73 }, (_, i) => commandMenuBounceY2(i + 1).healthboxY2);
    // age 65 is table[64] = 256 -> Sin = 1 -> y2 = 2 (the amplitude-1 peak).
    expect(seq).toEqual([
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1,
    ]);
  });

  it("mon (player sprite) y2 sequence over two full sine periods (seeds 192, +7/frame)", () => {
    const seq = Array.from({ length: 73 }, (_, i) => commandMenuBounceY2(i + 1).onixY2);
    expect(seq).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("the seeded entry phase reproduces the oracle's torment-fixture y2 at its settled windows (seed = 7)", () => {
    // (frame, seeded age, oracle {healthboxY2, onixY2}) -- oracle measured from
    // the run-2026-08-06-21-23-36Z-11569 captures; every settled window matches.
    const oracleByAge: ReadonlyArray<readonly [number, { readonly healthboxY2: number; readonly onixY2: number }]> = [
      [7, { healthboxY2: 0, onixY2: 0 }],   // 734 action menu entry
      [11, { healthboxY2: 0, onixY2: 1 }],  // 740 fight menu reveal
      [21, { healthboxY2: 1, onixY2: 1 }],  // 750
      [31, { healthboxY2: 1, onixY2: 0 }],  // 760
      [36, { healthboxY2: 1, onixY2: 0 }],  // 765 move-menu settled rest
      [38, { healthboxY2: 0, onixY2: 0 }],  // 767 rejection message entry
      [51, { healthboxY2: 0, onixY2: 1 }],  // 780
      [71, { healthboxY2: 1, onixY2: 0 }],  // 800
      [91, { healthboxY2: 0, onixY2: 1 }],  // 820
      [102, { healthboxY2: 1, onixY2: 0 }], // 831
      [121, { healthboxY2: 0, onixY2: 1 }], // 850
      [171, { healthboxY2: 1, onixY2: 1 }], // 900
      [221, { healthboxY2: 0, onixY2: 0 }], // 950
      [236, { healthboxY2: 0, onixY2: 1 }], // 965
      [249, { healthboxY2: 1, onixY2: 0 }], // 978 reopened menu
      [255, { healthboxY2: 1, onixY2: 0 }], // 984
      [257, { healthboxY2: 1, onixY2: 0 }], // 986
      [258, { healthboxY2: 0, onixY2: 0 }], // 987
      [265, { healthboxY2: 0, onixY2: 0 }], // 994
      [267, { healthboxY2: 0, onixY2: 1 }], // 996
      [271, { healthboxY2: 0, onixY2: 1 }], // 1000
      [281, { healthboxY2: 1, onixY2: 1 }], // 1010
      [291, { healthboxY2: 1, onixY2: 0 }], // 1020
      [311, { healthboxY2: 0, onixY2: 1 }], // 1040
      [313, { healthboxY2: 1, onixY2: 1 }], // 1042 confirm handoff (GUST)
    ];
    for (const [age, expected] of oracleByAge) {
      expect(commandMenuBounceY2(age)).toEqual(expected);
    }
  });

  it("the unseeded (battle-1-calibrated) phase is the WRONG phase at the same frames -- the stage seed is load-bearing", () => {
    // Without the stage's idleBounceElapsed = 7 seed, frame 740 renders at
    // age 4 and frame 1043's confirm handoff at age 307 -- both miss the
    // oracle's measured y2 (0,1) / (1,1).
    expect(commandMenuBounceY2(4)).not.toEqual({ healthboxY2: 0, onixY2: 1 });
    expect(commandMenuBounceY2(307)).not.toEqual({ healthboxY2: 1, onixY2: 1 });
    expect(commandMenuBounceY2(4).onixY2).toBe(0); // wrong phase: oracle has +1
    expect(commandMenuBounceY2(307).healthboxY2).toBe(0); // wrong phase: oracle has +1
  });
});
