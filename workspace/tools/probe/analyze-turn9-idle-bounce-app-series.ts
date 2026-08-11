/**
 * Side-lane bounded step (idle-bounce PHASE misalignment attribution):
 * app-side series for the turn-9 pre-move FIGHT-submenu idle-bounce window
 * (docs/rank5-off-ground-truth.md's "menu-window phase" section). Read-only
 * - imports the real production call chain `drawTurn9FightSubmenuWindow`
 * uses for its pre-press branch (`battleScene.ts:12294-12327`) directly from
 * their exported symbols, rather than re-deriving the arithmetic by hand -
 * so this script's own output is exactly what `battleScene.ts` renders, not
 * a paraphrase. No `src/` file touched.
 *
 * Pre-press formula (`sm.confirmElapsed === null` branch, line 12322-12323):
 *   bounceTick = t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT
 *   finalTick  = turn5SitrusResettledBounceTick(bounceTick + TURN9_REGIME4_TO_REGIME1_SHIFT)
 *   { onixY2, healthboxY2 } = menuIdleBounce(finalTick)
 * Valid for t < TURN9_QUICKATTACK_PRESS_TICK (10871) - the window this
 * step's brief names (10818-10873) is almost entirely pre-press; the last
 * few ticks (10871-10873) switch to the post-press `turnKickoffBounceTick`
 * frozen-bounce formula (not modeled here - out of scope, the assigned
 * window's own residual is characterized by the pre-press portion, see
 * docs/idle-bounce-phase-attribution.md).
 *
 * Run: node --experimental-strip-types tools/probe/analyze-turn9-idle-bounce-app-series.ts
 */
import {
  menuIdleBounce,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  MENU_IDLE_BLANK_END_TICK,
} from "../../src/engine/battleMenu.ts";
import {
  turn5SitrusResettledBounceTick,
  TURN9_REGIME4_TO_REGIME1_SHIFT,
  TURN8_BIND_PRESS_TICK,
  TURN8_MENU_REDRAW_DELAY,
  TURN9_QUICKATTACK_PRESS_TICK,
} from "../../src/engine/battleScene.ts";

const START = 10818;
const END = 10873;

console.log(
  `TURN9_REGIME4_TO_REGIME1_SHIFT=${TURN9_REGIME4_TO_REGIME1_SHIFT}  TURN8_BIND_PRESS_TICK=${TURN8_BIND_PRESS_TICK}  TURN8_MENU_REDRAW_DELAY=${TURN8_MENU_REDRAW_DELAY}  TURN9_QUICKATTACK_PRESS_TICK=${TURN9_QUICKATTACK_PRESS_TICK}`,
);

// Solve for the app's own predicted "n=0" reset instant in real absolute-tick
// space: menuIdleBounce's ramTick-1748===0 <=> finalTick===1749, and
// finalTick = (t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT + TURN9_REGIME4_TO_REGIME1_SHIFT)
//             - TURN5_SITRUS_MENU_REDRAW_TICK... but that internal constant
// isn't exported (private to battleScene.ts) - so invert turn5SitrusResettledBounceTick
// directly instead of assuming its internals: find x with turn5SitrusResettledBounceTick(x) === 1749
// by using its own documented closed form is linear (x - K), evaluate at two points to solve K.
const k = turn5SitrusResettledBounceTick(0); // turn5SitrusResettledBounceTick(x) = x + k
const xFor1749 = 1749 - k; // bounceTick + TURN9_REGIME4_TO_REGIME1_SHIFT value that reaches finalTick=1749
const predictedResetT = xFor1749 - TURN9_REGIME4_TO_REGIME1_SHIFT + FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
console.log(`App's predicted real-tick where menuIdleBounce's own n=0 (reset) lands: t=${predictedResetT}`);
console.log(
  `(compare: TURN8_BIND_PRESS_TICK + TURN8_MENU_REDRAW_DELAY = ${TURN8_BIND_PRESS_TICK + TURN8_MENU_REDRAW_DELAY})`,
);

console.log("\ntick\tbounceTick\tfinalTick\tonixY2\thealthboxY2");
for (let t = START; t <= END; t++) {
  if (t >= TURN9_QUICKATTACK_PRESS_TICK) {
    console.log(`${t}\t(post-press, not modeled by this script)`);
    continue;
  }
  const bounceTick = t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  const finalTick = turn5SitrusResettledBounceTick(bounceTick + TURN9_REGIME4_TO_REGIME1_SHIFT);
  const bounce = menuIdleBounce(finalTick);
  console.log(`${t}\t${bounceTick}\t${finalTick}\t${bounce.onixY2}\t${bounce.healthboxY2}`);
}
