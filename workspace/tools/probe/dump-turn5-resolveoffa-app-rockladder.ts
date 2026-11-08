// ISSUES #97 side-lane instrument (fifth), the §16-named next instrument
// ("What's left in resolve-off-a"): the app-side half of a hardware-vs-app
// comparison across the 6262-6354 mismatch band. Read-only - imports the
// same pure mechanism functions `drawTurn5RockSlideAttack` already calls
// (`rockSlideDrawOrder`/`rockSlideRockState`/`rockSlideBg3Y` from
// `src/engine/battleMenu.ts`, `TURN5_ROCKSLIDE_PRESS_TICK` from
// `src/engine/battleSceneCanonical.ts`) and reports, per named tick, every
// active falling rock's own on-screen bbox (`drawRockSprite`'s own
// `centerX-16, centerY-16, 32x32` convention, `battleScene.ts:15257-15259`)
// plus the BG3 shake value - no `src/` edit, this file only imports.
//
// Usage: node --experimental-strip-types tools/probe/dump-turn5-resolveoffa-app-rockladder.ts [tick ...]
// (defaults to the brief's own suggested ladder if no ticks given)

// Import order matters: battleMenu.ts, battleScene.ts, and
// battleSceneCanonical.ts form a circular trio, and `node
// --experimental-strip-types` (no bundler) hits a real TDZ crash
// (`battleScene.ts`'s own `TEXT_TOTAL_CHARS = LINE1.length + ...`) under
// the wrong resolution order. Importing battleMenu.ts first, then reaching
// `TURN5_ROCKSLIDE_PRESS_TICK` via battleScene.ts's own re-export (NOT
// battleSceneCanonical.ts directly, which would pull battleMenu.ts back in
// through a different edge first) is the same order
// `tools/probe/verify-turn11.ts` already uses successfully.
import { rockSlideDrawOrder, rockSlideRockState, rockSlideBg3Y } from "../../src/engine/battleMenu.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { TURN5_ROCKSLIDE_PRESS_TICK } from "../../src/engine/battleScene.ts";

const argTicks = process.argv.slice(2).map((s) => Number.parseInt(s, 10)).filter((n) => Number.isFinite(n));
const DEFAULT_LADDER = [6258, 6259, 6262, 6263, 6264, 6270, 6280, 6290, 6304, 6320, 6340, 6354];
const ticks = argTicks.length > 0 ? argTicks : DEFAULT_LADDER;

const pressTick = TURN5_ROCKSLIDE_PRESS_TICK;

const out = ticks.map((t) => {
  const bg3Y = rockSlideBg3Y(t, pressTick);
  const order = rockSlideDrawOrder(t, pressTick);
  const rocks = order.map((index) => {
    const state = rockSlideRockState(index, t, pressTick);
    if (!state) return null;
    const ox = state.centerX - 16;
    const oy = state.centerY - 16;
    return {
      index,
      animNum: state.animNum,
      centerX: state.centerX,
      centerY: state.centerY,
      bboxX: [ox, ox + 32],
      bboxY: [oy, oy + 32],
      overlapsRow0: oy <= 0 && oy + 32 > 0,
      overlapsRow10: oy <= 10 && oy + 32 > 10,
      onScreenX: ox < 240 && ox + 32 > 0,
      onScreenY: oy < 160 && oy + 32 > 0,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
  return { tick: t, pressTick, bg3Y, rocks };
});

console.log(JSON.stringify({ pressTick, ticks: out }, null, 2));
