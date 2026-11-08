/**
 * ISSUES #97-B remainder (`docs/turn5-confirm-pools-diagnosis.md` §1/§2):
 * cross-checks the two proposed turn5-off-scoped ENDEAVOR-hold formulas
 * against oracle-read ground truth, the same style as the sibling
 * `analyze-turn5-confirmb-rockslide-text-delay.ts` instrument. No `src/`
 * edit - this only proves the constants before a fix worker lands them.
 *
 * (1) HP-drain start delay: pixel-read ONIX HP digits off fresh
 * `npm run compare -- turn5-confirm-off-{a,b} --capture-range ...` PNGs
 * (Read tool, not automated here) at four ticks: 6053=88 (unstarted),
 * 6120=43, 6150=13, 6183=1 (settled). A linear rate=1/tick drain fits
 * exactly with start=pressTick+116 - the SAME `TURN2_OFF_ENDEAVOR_HP_
 * DRAIN_START_DELAY`/`TURN3_OFF_ENDEAVOR_HP_DRAIN_START_DELAY` value
 * turn2/turn3 already use (`battleSceneCanonical.ts:91,99`), just never
 * threaded into turn5's own `endeavorHp` call
 * (`battleScene.ts:10452`, which passes no override and falls back to the
 * shared `ENDEAVOR_HP_DRAIN_START_DELAY=153`).
 *
 * (2) Flicker start: dense oracle-only pixel sampling (`tools/compare/out`
 * PNGs, coordinates (60,80)/(75,90)/(85,70) inside Onix's own back-sprite
 * silhouette) at every tick 6040-6072 shows a clean period-8 (4-on/4-off)
 * invisible/visible cycle, 4 cycles, first invisible tick render=6042 -
 * matching `endeavorOnixInvisible`'s own formula (`ramTick=t-1`,
 * `n=ramTick-pressTick-start`) with `start=82` - again the SAME
 * `TURN2_OFF_ENDEAVOR_FLICKER_START`/`TURN3_OFF_ENDEAVOR_FLICKER_START`
 * value (`TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START(81)+1`), never
 * threaded into `drawEndeavorSquish`'s own internal
 * `endeavorOnixInvisible(t, pressTick)` call (`battleScene.ts:9410`,
 * no override - always uses the shared default `ENDEAVOR_FLICKER_START=119`).
 *
 * Run: node --experimental-strip-types tools/probe/analyze-turn5-confirm-endeavor-drain-flicker.ts
 */
import { endeavorHp } from "../../src/engine/battleMenu.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import {
  TURN2_OFF_ENDEAVOR_HP_DRAIN_START_DELAY,
  TURN2_OFF_ENDEAVOR_FLICKER_START,
  TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START,
  TURN3_OFF_ENDEAVOR_HP_DRAIN_START_DELAY,
  TURN3_OFF_ENDEAVOR_FLICKER_START,
  TURN5_CONFIRM_PRESS_TICK,
} from "../../src/engine/battleScene.ts";

let ok = true;
function check(label: string, actual: unknown, expected: unknown): void {
  const pass = actual === expected;
  if (!pass) ok = false;
  console.log(`${pass ? "PASS" : "FAIL"}: ${label} = ${actual} (expected ${expected})`);
}

// TURN2/TURN3's own already-landed scoped constants are bit-for-bit what
// this session independently re-derived for turn 5 from fresh oracle pixels
// - the fix is reusing the SAME values under a new turn5-scoped name, not
// discovering new numbers.
check("TURN2_OFF_ENDEAVOR_HP_DRAIN_START_DELAY", TURN2_OFF_ENDEAVOR_HP_DRAIN_START_DELAY, 116);
check("TURN3_OFF_ENDEAVOR_HP_DRAIN_START_DELAY", TURN3_OFF_ENDEAVOR_HP_DRAIN_START_DELAY, 116);
check("TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START", TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START, 81);
check("TURN2_OFF_ENDEAVOR_FLICKER_START", TURN2_OFF_ENDEAVOR_FLICKER_START, 82);
check("TURN3_OFF_ENDEAVOR_FLICKER_START", TURN3_OFF_ENDEAVOR_FLICKER_START, 82);

const PROPOSED_TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY = 116;
const PROPOSED_TURN5_OFF_ENDEAVOR_FLICKER_START = 82;

// (1) HP-drain formula vs. 4 independently oracle-pixel-read anchors
// (turn5-confirm-off-a/-b PNGs, `npm run compare -- turn5-confirm-off-a
// --capture-range 6050:6055`, `turn5-confirm-off-b --capture-range
// 6118:6122`/`6148:6152`/`6181:6185`, read with the Read tool this session).
const HP_ANCHORS: Array<{ tick: number; oracleHp: number }> = [
  { tick: 6053, oracleHp: 88 },
  { tick: 6120, oracleHp: 43 },
  { tick: 6150, oracleHp: 13 },
  { tick: 6183, oracleHp: 1 },
];
for (const { tick, oracleHp } of HP_ANCHORS) {
  const predicted = endeavorHp(tick, TURN5_CONFIRM_PRESS_TICK, 88, 1, PROPOSED_TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY);
  check(`endeavorHp(${tick}) proposed-formula`, predicted, oracleHp);
}

// (2) Flicker formula vs. the dense 6040-6072 oracle pixel sweep (invisible
// blocks read at (60,80)/(75,90)/(85,70): [6042,6045],[6050,6053],
// [6058,6061],[6066,6069], visible everywhere else in range).
function proposedOnixInvisible(t: number, pressTick: number, start: number): boolean {
  const ramTick = t - 1; // ENDEAVOR_FLICKER_RENDER_LAG
  const n = ramTick - pressTick - start;
  if (n < 0 || n >= 8 * 4) return false; // PERIOD * CYCLES
  return n % 8 < 4; // ON_TICKS
}
const FLICKER_INVISIBLE_TICKS = new Set([
  6042, 6043, 6044, 6045,
  6050, 6051, 6052, 6053,
  6058, 6059, 6060, 6061,
  6066, 6067, 6068, 6069,
]);
let flickerMismatches = 0;
for (let t = 6040; t <= 6072; t++) {
  const predicted = proposedOnixInvisible(t, TURN5_CONFIRM_PRESS_TICK, PROPOSED_TURN5_OFF_ENDEAVOR_FLICKER_START);
  const oracle = FLICKER_INVISIBLE_TICKS.has(t);
  if (predicted !== oracle) {
    flickerMismatches++;
    console.log(`FAIL: flicker(${t}) proposed=${predicted} oracle=${oracle}`);
  }
}
check("flicker sweep 6040-6072 mismatches", flickerMismatches, 0);

console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
