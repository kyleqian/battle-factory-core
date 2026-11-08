/**
 * ISSUES #97 remainder, residual (B) (`docs/turn5-confirmb-resolved-
 * residuals.md` §2): `turn5SitrusHealTextVisibleChars`/`turn5SitrusOnixHp`
 * (`battleScene.ts:10782`/`10788`) both key off `ONIX_SITRUS_IDENTITY_
 * RENDER_TICK` (= `ONIX_SITRUS_PROC_TRIGGER_RAM_TICK`(6872, `turn5Resolution
 * Adapter.ts:181`) + 2). ISSUES #97-C item 3 fixed the DISPATCH gate inside
 * `drawTurn5RockSlideWindow` with new scoped overrides (`TURN5_OFF_SITRUS_
 * HEAL_TEXT_START_TICK=6850` etc.) but explicitly did NOT touch this
 * separate, older epoch -- so once inside the gated branch, the TEXT REVEAL
 * and the HP OVERLAY still compute as if the real proc were at the stale
 * 6872/6874 anchor (`heldItemHeal.ts`'s own age offsets: heal-text-first-age
 * 204 -> reveal start 6874+204=7078; hp-climb-first-age 306 -> climb start
 * 6874+306=7180) -- both past this trace's entire capture window
 * (6810-7005), so the app's own heal text stays blank and the HP overlay
 * stays frozen at the pre-heal value the whole time.
 *
 * This script re-evaluates the CURRENT (buggy) formulas and PROPOSED fixes
 * against the given ground-truth ticks (heal text starts 6850, settles
 * 6885, hp jumps 1->31 at 6984 -- `ISSUES.md` #97-C dated addendum and the
 * brief's own CONTEXT, not re-derived here) plus oracle screenshots read
 * directly off `npm run compare` PNG captures this session:
 *
 *   `npm run compare -- turn5-resolve-off-d --capture-range 6960:6995`
 *   (out/run-2026-08-18-18-17-46Z-26836) and `--capture-range 6997:7005`
 *   (out/run-2026-08-18-18-14-57Z-26197)
 *
 * No `src/` edit -- analysis only, real exported symbols throughout.
 *
 * Run: node --experimental-strip-types tools/probe/analyze-turn5-resolved-sitrus-onixhp-epoch.ts
 */
import { createInitialState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { turn5SitrusHealTextVisibleChars, turn5SitrusOnixHp, TURN5_SITRUS_HEAL_LINE1, TURN5_SITRUS_HEAL_LINE2 } from "../../src/engine/battleScene.ts";
import { TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK, TURN5_SITRUS_HEAL_HP_START, TURN5_SITRUS_HEAL_HP_END } from "../../src/engine/battleSceneCanonical.ts";

createInitialState({ appRoute: "battle" as never });

const HEAL_TEXT_TOTAL = TURN5_SITRUS_HEAL_LINE1.length + TURN5_SITRUS_HEAL_LINE2.length;
console.log(JSON.stringify({ TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK, TURN5_SITRUS_HEAL_HP_START, TURN5_SITRUS_HEAL_HP_END, HEAL_TEXT_TOTAL }));

// --- Heal text reveal ---
// Proposed fix: anchor the SAME t-1/one-char-per-tick shape (residual A's
// own confirmed formula, analyze-turn5-confirmb-rockslide-text-delay.ts) at
// the ALREADY-CORRECT TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK=6850, instead of
// the stale procTrigger-derived epoch -- NOT `sitrusHealTextVisibleCharsAtAge`,
// whose own baked-in SITRUS_ITEM_HEAL_TEXT_FIRST_AGE=204 offset is exactly
// the ON-profile-timed value this fix replaces.
function proposedHealTextChars(t: number): number {
  if (t - 1 < TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK) return 0;
  return Math.min(HEAL_TEXT_TOTAL, (t - 1) - TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK + 1);
}

const HEAL_TEXT_ANCHORS: readonly { t: number; expectFull: boolean; note: string }[] = [
  { t: 6851, expectFull: false, note: "one tick after the 6850 anchor -- oracle showed a 44px diff (single glyph starting), same signature as residual A's own t=6185" },
  { t: 6885, expectFull: true, note: "given ground truth: 'settles (fully typed) 6885'" },
  { t: 6900, expectFull: true, note: "oracle PNG (out/run-.../oracle-06900.png): full 'ONIX's SITRUS BERRY / restored health!' shown; app PNG (app-06900.png): blank message box" },
];

console.log("\n-- heal text reveal --");
console.log("t, current(buggy, stale epoch), proposed-fix(anchor=6850,t-1), full-text-total-chars");
for (const { t, expectFull, note } of HEAL_TEXT_ANCHORS) {
  const current = turn5SitrusHealTextVisibleChars(t);
  const proposed = proposedHealTextChars(t);
  const totalAt6885 = proposedHealTextChars(6885);
  const isFull = proposed === totalAt6885;
  console.log(`${t}: current=${current} proposed=${proposed} isFullText=${isFull} expectFull=${expectFull} ${isFull === expectFull ? "MATCH" : "MISMATCH"} -- ${note}`);
}

// --- ONIX HP overlay ---
// Proposed fix: a hard step at the given RAM-exact jump tick 6984 (matching
// the GROVYLE-drain precedent, ISSUES.md #97-C item 2 / diagnosis doc §14
// Sweep A: real HP changes are single-tick STEPs under this profile, not
// live multi-tick ramps) -- NOT independently re-probed this session, see
// this doc's own caveat.
const ONIX_HP_JUMP_TICK = 6984;
function proposedOnixHp(t: number): number {
  return t < ONIX_HP_JUMP_TICK ? TURN5_SITRUS_HEAL_HP_START : TURN5_SITRUS_HEAL_HP_END;
}

const HP_ANCHORS: readonly { t: number; oracleHp: number; note: string }[] = [
  { t: 6900, oracleHp: TURN5_SITRUS_HEAL_HP_START, note: "before the jump, oracle still shows 1/117 (oracle-06900.png)" },
  { t: 6988, oracleHp: TURN5_SITRUS_HEAL_HP_END, note: "oracle already at 31/117 (oracle-06988.png), 4 ticks after the given 6984 jump" },
  { t: 7005, oracleHp: TURN5_SITRUS_HEAL_HP_END, note: "window's last frame, oracle 31/117 (oracle-07005.png) vs app's own current 1/117 (app-07005.png) -- the brief's own cited 258px/0.67% tail residual" },
];

console.log("\n-- onix hp overlay --");
console.log("t, current(buggy, stale epoch), proposed-fix(step@6984), oracle-observed");
let hpAllMatch = true;
for (const { t, oracleHp, note } of HP_ANCHORS) {
  const current = turn5SitrusOnixHp(t);
  const proposed = proposedOnixHp(t);
  const matches = proposed === oracleHp;
  hpAllMatch &&= matches;
  console.log(`${t}: current=${current} proposed=${proposed} oracle=${oracleHp} ${matches ? "MATCH" : "MISMATCH"} -- ${note}`);
}
console.log(hpAllMatch ? "PASS (tail mechanism): proposed step fix matches every oracle-observed hp anchor" : "FAIL: proposed step fix diverges from an oracle-observed hp anchor");
console.log("\nNOTE: this script does NOT model the separate, not-fully-pinned mid-window sparkle/particle-overlay mismatch (see the doc's own §2.3) -- fixing the two formulas above is necessary but not proven sufficient for the FULL 6851-6988 span.");
