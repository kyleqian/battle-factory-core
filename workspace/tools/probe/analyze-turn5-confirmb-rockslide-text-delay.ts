/**
 * ISSUES #97 remainder, residual (A) (`docs/turn5-confirmb-resolved-residuals.md`
 * §1): `drawTurn5RockSlideWindow`'s own attack/text branch
 * (`battleScene.ts:14888`) calls `rockSlideTextVisibleChars(t, pressTick)`
 * with NO delay argument -- it silently falls back to the shared
 * `ROCK_SLIDE_TEXT_DELAY=393` default instead of this trace family's own
 * `TURN5_OFF_ROCKSLIDE_TEXT_DELAY=355` scoped override (the constant ISSUES
 * #97-C item 1 already used to fix the DISPATCH gate one call up,
 * `drawTurn5EndeavorText`'s own `rockSlideTextStartTick(TURN5_ROCKSLIDE_
 * PRESS_TICK, TURN5_OFF_ROCKSLIDE_TEXT_DELAY)` check at line 10447) -- so
 * the text reveal itself doesn't start until pressTick+393=6222, 38 ticks
 * after the dispatch gate already entered this function at 6184. This
 * script re-evaluates the CURRENT (buggy) formula and a PROPOSED fix
 * (delay=355 + the codebase's own standard `t-1` display-basis correction,
 * `drawTurn6FieldBase`'s own doc comment at battleScene.ts:14829-14835)
 * against oracle-observed char counts read directly off `npm run compare`
 * PNG captures this session (frame N -> visible-char count, hand-counted
 * from the message box text, cited by capture-range so it's rerunnable):
 *
 *   `npm run compare -- turn5-confirm-off-b --capture-range 6183:6221`
 *   (out/run-2026-08-18-18-05-49Z-24951, and two re-crops of the same range,
 *   out/run-2026-08-18-18-07-06Z-25309 and out/run-2026-08-18-18-08-26Z-25423)
 *
 * No `src/` edit -- analysis only, real exported symbols throughout.
 *
 * Run: node --experimental-strip-types tools/probe/analyze-turn5-confirmb-rockslide-text-delay.ts
 */
import { createInitialState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { rockSlideTextVisibleChars } from "../../src/engine/battleMenu.ts";
import { TURN5_ROCKSLIDE_PRESS_TICK, TURN5_OFF_ROCKSLIDE_TEXT_DELAY } from "../../src/engine/battleSceneCanonical.ts";

createInitialState({ appRoute: "battle" as never });

const pressTick = TURN5_ROCKSLIDE_PRESS_TICK;

// Oracle-observed visible-char counts, hand-read off the PNG captures cited
// above ("ONIX used" + "ROCK SLIDE!" = 9+11 = 20 chars total).
const ORACLE_OBSERVED: readonly { t: number; chars: number; note: string }[] = [
  { t: 6184, chars: 0, note: "still showing the OLD held ENDEAVOR text (pre-transition), not blank -- edge frame, formula not expected to explain this one tick" },
  { t: 6185, chars: 1, note: "'O' starting to appear" },
  { t: 6190, chars: 6, note: "'ONIX u'" },
  { t: 6195, chars: 11, note: "'ONIX used' + 'RO'" },
  { t: 6200, chars: 16, note: "'ONIX used' + 'ROCK SL'" },
  { t: 6203, chars: 19, note: "'ONIX used' + 'ROCK SLIDE' (missing final '!')" },
  { t: 6204, chars: 20, note: "full text, plateau starts (diff magnitude 689px flat 6204-6221)" },
  { t: 6221, chars: 20, note: "window's last frame, still full" },
];

console.log(JSON.stringify({ pressTick, TURN5_OFF_ROCKSLIDE_TEXT_DELAY }));
console.log("t, current(buggy: default delay=393, raw t), proposed-fix(delay=355, t-1), oracle-observed, fix-matches-oracle?");
let allMatch = true;
for (const { t, chars, note } of ORACLE_OBSERVED) {
  const current = rockSlideTextVisibleChars(t, pressTick);
  const proposed = rockSlideTextVisibleChars(t - 1, pressTick, TURN5_OFF_ROCKSLIDE_TEXT_DELAY);
  const matches = proposed === chars;
  if (t !== 6184) allMatch &&= matches;
  console.log(`${t}: current=${current} proposed=${proposed} oracle=${chars} ${matches ? "MATCH" : "MISMATCH"}  -- ${note}`);
}
console.log(allMatch ? "PASS: proposed fix matches every oracle-observed anchor (t=6184 excluded, a known single-tick transition edge case)" : "FAIL: proposed fix diverges from at least one oracle-observed anchor");
