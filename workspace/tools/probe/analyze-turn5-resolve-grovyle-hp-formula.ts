/**
 * ISSUES #97-B rung (GROVYLE-side instrument, `docs/turn5-family-class3-diagnosis.md`
 * §14+): re-evaluates the app's own GROVYLE (opponent) HP-drain formula
 * `rockSlideOpponentHp` and faint-sink formula `faintSinkRowsAndY2`
 * (`battleScene.ts:10870-10876`, `drawTurn5RockSlideAttack`'s opponent
 * healthbox draw) at the same ticks the RAM probe
 * `dump-turn5-resolve-grovyle-side-driver.py` sampled, using only real
 * exported symbols - no `src/` edit.
 *
 * Run: node --experimental-strip-types tools/probe/analyze-turn5-resolve-grovyle-hp-formula.ts
 */
import { createInitialState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { rockSlideOpponentHp } from "../../src/engine/battleMenu.ts";
import { faintSinkRowsAndY2 } from "../../src/engine/battleSceneCanonical.ts";
import {
  TURN5_ROCKSLIDE_PRESS_TICK,
  TURN4_ROCKSLIDE_HP,
  TURN5_ROCKSLIDE_OPPONENT_TO_HP,
  TURN5_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY,
  GROVYLE_FAINT_SINK_START_TICK,
  GROVYLE_HEALTHBOX_VANISH_TICK,
  GROVYLE_FAINT_SINK_STEPS,
} from "../../src/engine/battleScene.ts";

createInitialState({ appRoute: "battle" as never });

const pressTick = TURN5_ROCKSLIDE_PRESS_TICK;
const startHp = TURN4_ROCKSLIDE_HP.to;
const endHp = TURN5_ROCKSLIDE_OPPONENT_TO_HP;

console.log(JSON.stringify({
  pressTick,
  startHp,
  endHp,
  GROVYLE_FAINT_SINK_START_TICK,
  GROVYLE_HEALTHBOX_VANISH_TICK,
  GROVYLE_FAINT_SINK_STEPS,
}));

for (const t of [6184, 6222, 6250, 6284, 6285, 6300, 6350, 6360, 6378, 6379, 6400, 6417, 6502, 6521, 6523]) {
  console.log(t, "opponentHp=", rockSlideOpponentHp(t, pressTick, startHp, endHp, TURN5_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY), "sink=", JSON.stringify(faintSinkRowsAndY2(t)));
}
