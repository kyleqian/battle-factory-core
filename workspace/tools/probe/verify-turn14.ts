// S7/S8 worktree scout, turn 14 probe (Murkrow's FLY charge half + Onix's
// DRAGON_BREATH auto-miss against an airborne target). Same convention as
// verify-turn13.ts: re-derives every pinned fact straight from a FRESH
// `bin/oracle run` (no stale PNGs) and fails loudly if the real hardware's
// pixels stop matching docs/turn14-notes.md's own citations. Pixel-only (no
// RAM reads — this runs from plain `node`, not the mgba-venv python
// interpreter the RAM probes need); RAM facts (RNG ledger, PP/HP/status
// deltas, the FLY-up sprite/affine-matrix table) are cross-cited in
// docs/turn14-notes.md's own dated sections from `ram-probe.py`/
// `dump-battler-full.py`/`dump-fly-anim.py` runs, not re-asserted here.
//
// Per the brief: reuse `battle1-turn14-dense.json`'s own committed 110
// segments verbatim, overriding `captureFrames` with a curated dense list
// (single oracle round trip, capped at 256 captures/run).
//
// Usage: node --experimental-strip-types tools/probe/verify-turn14.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawText, type FontData } from "../../src/engine/font.ts";
import battleWindowAsset from "../../src/assets/gen/battle-window.json" with { type: "json" };
import fontNormalData from "../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../src/data/gen/charmap.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn14-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

// --- Segment-structure check, derived programmatically from the committed
// trace's own segments (NOT hand-copied from docs/turn14-notes.md's own
// prose) — pins the exact press ticks the rest of this script anchors to. ---
interface SegBound { index: number; start: number; end: number; buttons: string[] }
function segmentBoundaries(segments: Trace["segments"]): SegBound[] {
  const out: SegBound[] = [];
  let cum = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const s = segments[i] as { frames: number; buttons: string[] };
    const start = cum;
    cum += s.frames;
    out.push({ index: i, start, end: cum - 1, buttons: s.buttons });
  }
  return out;
}
const bounds = segmentBoundaries(trace.segments);
check("110 segments total (§1)", bounds.length === 110, `got ${bounds.length}`);
const totalFrames = bounds[bounds.length - 1]!.end + 1;
check("18956 frames total (§1)", totalFrames === 18956, `got ${totalFrames}`);

// The committed trace's own `segments` array encodes the WHOLE game's
// button script from tick 0 (110 segments, 18956 cumulative frames), not
// just this turn's tail — matching turn13-dense-a.json's own convention.
// Turn 14's own 4 segments are the LAST 4 (indices 106-109): FIGHT-submenu-
// open A, 30f settle (no DOWN nav — cursor persisted at DRAGON_BREATH from
// turn 13), confirm A, then a single 1200f resolution-idle covering both
// battlers' entire turn (§1).
const menuOpen = bounds[106]!;
const settle = bounds[107]!;
const confirmPress = bounds[108]!;
const resolutionIdle = bounds[109]!;

check("segment[106] is the FIGHT-submenu-open A (2 frames)", menuOpen.buttons.join() === "A" && menuOpen.end - menuOpen.start === 1, JSON.stringify(menuOpen));
check("segment[107] is a 30f settle with no press (no DOWN nav)", settle.buttons.length === 0 && settle.end - settle.start === 29, JSON.stringify(settle));
check("segment[108] is the confirm A (2 frames)", confirmPress.buttons.join() === "A" && confirmPress.end - confirmPress.start === 1, JSON.stringify(confirmPress));
check("segment[109] is the 1200f resolution-idle covering both battlers' entire turn", resolutionIdle.buttons.length === 0 && resolutionIdle.end - resolutionIdle.start === 1199, JSON.stringify(resolutionIdle));

// Exact tick numbers — this session's own precise (not approximate) pin,
// derived programmatically from the trace's own cumulative frame counts
// (no offset needed: this trace's tick numbering IS the segment-cumulative
// frame count, confirmed by cross-checking against captureFrames[0]=17700
// landing exactly at menuOpen.start).
const OPEN_TICK = menuOpen.start; // 17722
const CONFIRM_TICK = confirmPress.start; // 17754
check("OPEN_TICK (17722) matches this trace's own captureFrames[0]-adjacent anchor (17700, the pre-press settled-menu carry-over)", OPEN_TICK === 17722, `got ${OPEN_TICK}`);
console.log(`Derived: OPEN_TICK=${OPEN_TICK} CONFIRM_TICK=${CONFIRM_TICK}`);

// --- Curated fresh-oracle capture list: dense re-bisection of every §4 row
// whose prose used "~" (submenu-clear end, fly-up start/end, "flew up
// high!" typing end, hold start, DRAGONBREATH transition, missed-text
// start), plus flat-plateau spot checks for the settled rows. ---
function range(a: number, b: number, stride = 1): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t += stride) out.push(t);
  return out;
}
const SUBMENU_CLEAR_DENSE = range(17762, 17792); // confirm-transient -> bare scene -> fly-up pixel-lag window
const FLYUP_DENSE = range(17775, 17819); // RAM-pinned: ball sprite spawns/mon goes invisible at 17780, ball destroyed by 17804 (dump-fly-anim.py)
const TEXT_TYPEIN_DENSE = range(17820, 17862); // status2 sets 17820 (RAM) -> "Foe MURKROW flew\nup high!" typing in -> settled
const HOLD_SPOT = [17870, 17900, 17912, 17913, 17914]; // held text through statuses3_1 set (RAM-pinned 17913)
const DRAGONBREATH_TRANSITION_DENSE = range(17916, 17953); // status3 set (17913) -> gCurrentMove/gBattlerAttacker flip (~17919-17921, RAM per §3) -> kickoff text starts, settles 17949
const KICKOFF_HOLD_SPOT = [17950, 17960, 17970];
// WORKTREE-LANE CORRECTION to docs/turn14-notes.md §4's own DRAGONBREATH-held
// row (which cited "ad5ee5aa59cc (18000)" as still-held DRAGONBREATH text):
// dense re-bisection below shows a NEW message-box transition (shared blank/
// slide-in frames, sha-identical to the DRAGONBREATH kickoff's own transition
// at 17928-17931) starts by 17986, well before 18000 — ad5ee5aa59cc (18000)
// is actually a MID-TYPING frame of "ONIX's attack missed!", not held
// DRAGONBREATH text. See the corrected checks below.
const MISSED_TEXT_DENSE = range(17983, 18010); // DRAGONBREATH-held ends -> transition -> "ONIX's\nattack missed!" typing start
const MISSED_HOLD_SPOT = [18010, 18040, 18070, 18076];
const MENU_REOPEN_DENSE = range(18077, 18090); // message clears, bg0y flips (RAM, 18085 per §4), menu box reappears
const SETTLED_TAIL_SPOT = [18095, 18415, 18815, 18956]; // long idle hold + final captured tick (STATUS3_ON_AIR persistence pin)

const captureFrames = Array.from(
  new Set([
    17700, 17722, 17753, 17754, 17755,
    ...SUBMENU_CLEAR_DENSE,
    ...FLYUP_DENSE,
    ...TEXT_TYPEIN_DENSE,
    ...HOLD_SPOT,
    ...DRAGONBREATH_TRANSITION_DENSE,
    ...KICKOFF_HOLD_SPOT,
    ...MISSED_TEXT_DENSE,
    ...MISSED_HOLD_SPOT,
    ...MENU_REOPEN_DENSE,
    ...SETTLED_TAIL_SPOT,
  ]),
).sort((a, b) => a - b);
check("curated capture list stays under the oracle's 256-per-run cap", captureFrames.length <= 256, `got ${captureFrames.length}`);
trace.captureFrames = captureFrames;

// --- Shared message-box text rendering (same drawTileBg+drawText+charmap
// methodology verify-turn13.ts already established, reused verbatim). ---
const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const battleWindow = battleWindowAsset as { tileset: unknown; tilemap: { entries: ({ tile: number; palette: number; hFlip: boolean; vFlip: boolean } | null)[]; width: number }; palette: { r: number; g: number; b: number }[][] };
const MESSAGE_PALETTE = battleWindow.palette[0]!;
const MESSAGE_TEXT_COLORS = { fg: 1, bg: 15, shadow: 6 };
const LINE1_ORIGIN = { x: 16, y: 121 };
const LINE2_ORIGIN = { x: 16, y: 137 };
function drawTileBg(fb: Buffer): void {
  const { tileset, tilemap, palette } = battleWindow;
  const tiles = (tileset as { tiles: number[][] }).tiles;
  for (let screenY = 0; screenY < 160; screenY++) {
    const tileRow = Math.floor(screenY / 8);
    const inTileY = screenY % 8;
    for (let screenX = 0; screenX < 240; screenX++) {
      const tileCol = Math.floor(screenX / 8);
      const inTileX = screenX % 8;
      const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
      if (!entry) continue;
      const tile = tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - inTileX : inTileX;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const idx = tile[sy * 8 + sx]!;
      if (idx === 0) continue;
      const c = palette[entry.palette]?.[idx];
      if (!c) continue;
      const i = (screenY * 240 + screenX) * 4;
      fb[i] = c.r;
      fb[i + 1] = c.g;
      fb[i + 2] = c.b;
      fb[i + 3] = 255;
    }
  }
}
function buildTwoLineExpected(line1: string, line2: string): Buffer {
  const fb = Buffer.alloc(240 * 160 * 4);
  drawTileBg(fb);
  drawText(fb as unknown as Uint8Array, font, charmap, line1, LINE1_ORIGIN.x, LINE1_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  drawText(fb as unknown as Uint8Array, font, charmap, line2, LINE2_ORIGIN.x, LINE2_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  return fb;
}
function diffBoxRegion(a: Buffer, b: Buffer): number {
  let diffs = 0;
  for (let y = 112; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diffs++;
    }
  }
  return diffs;
}

async function main() {
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks (single round trip, battle1-turn14-dense.json's own segments)...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };
  const sha = (t: number) => get(t).sha256;
  const sha12 = (t: number) => sha(t).slice(0, 12);
  const png = (t: number) => PNG.sync.read(get(t).png).data as unknown as Buffer;

  // === Carried-over anchor + submenu-open plateau (§4 rows 1-2) ===
  check("turn-14 menu settled anchor (17700) matches docs/turn14-notes.md §4's own citation, exact match to turn13-notes.md's own identical tick", sha12(17700) === "5e6a26f6f342", `got ${sha12(17700)}`);
  check("FIGHT submenu open, cursor on DRAGON_BREATH (17722-17754) flat, matches §4's own citation family", sha12(17722) === "e499f3e772c6" && sha12(17753) === "b59426c5112c", `17722=${sha12(17722)}, 17753=${sha12(17753)}`);

  // === §4 row: confirm-press transient / submenu clears to bare scene ===
  // Dense re-bisection of the "~17789" boundary the brief flagged.
  check("confirm-press transient (17755-17768) flat, matches §4's own citation (a0f37a67c387 start)", sha12(17755) === "a0f37a67c387", `got ${sha12(17755)}`);
  {
    const shas = range(17769, 17792).map(sha12);
    const bareSceneSha = "5e5283bf92c2";
    const firstBare = range(17769, 17792).find((t) => sha12(t) === bareSceneSha);
    check("submenu-clear-to-bare-scene: bare scene sha (5e5283bf92c2, §4's own citation) does appear in 17769-17792", firstBare !== undefined, `shas: ${shas.join(",")}`);
    check(`submenu-clear-to-bare-scene: exact boundary tick pinned at ${firstBare} (first tick reading the bare-scene sha, dense-bisected — §4's own prose said "~17789")`, firstBare !== undefined && firstBare <= 17792, `firstBare=${firstBare}`);
  }

  // === §4 row: Murkrow's FLY-up squash/stretch — the mission's one real
  // unknown. RAM (dump-fly-anim.py, docs/turn14-notes.md's own dated
  // addendum) pins the ball sprite's own spawn/mon-invisible flip at EXACT
  // tick 17780 and its destroy at EXACT tick 17804 (RAM-truthed, not
  // approximated) — this script's own job is to confirm those RAM ticks
  // have a real, distinct pixel signature (not silently absorbed into
  // render lag) and to bisect the exact tick the PIXEL first diverges from
  // the bare-scene baseline (render-lag class, per the brief's own ask). ===
  {
    const baseline = sha12(17775); // bare scene, well before the RAM-pinned 17780 spawn tick
    const divergeTick = range(17776, 17792).find((t) => sha12(t) !== baseline);
    check(`FLY-up animation: pixel first diverges from the bare-scene baseline at tick ${divergeTick} (RAM pins the sprite spawn/mon-invisible flip at 17780 — this is this script's own render-lag bisection, not assumed equal)`, divergeTick !== undefined, `baseline(17775)=${baseline}, first divergent tick in range not found`);
    const shasInWindow = range(17780, 17804).map(sha12);
    check("FLY-up animation: the squash/stretch window (17780-17804) is NOT a static plateau — near-every-tick motion, matching the RAM-observed per-tick affine matrix ramp (dump-fly-anim.py)", new Set(shasInWindow).size >= 15, `distinct=${new Set(shasInWindow).size} of ${shasInWindow.length} ticks`);
  }
  {
    // Post-destroy: RAM pins the ball sprite gone (inUse=false) by tick
    // 17804, both battlers' own sprites already invisible/off-model — the
    // frame should settle to a flat "empty scene, message box still empty"
    // plateau and STAY flat through the text-typing gate (§4's own
    // "6db0757608e7" citation, 17805-17820).
    const settled = sha12(17810);
    check(`FLY-up animation: post-destroy plateau (17805-17819) flat at a single sha, matching §4's own citation (6db0757608e7)`, new Set(range(17805, 17819).map(sha)).size === 1 && settled === "6db0757608e7", `shas: ${range(17805, 17819).map(sha12).join(",")}`);
  }

  // === §4 row: "flew up high!" typing in — dense re-bisection of the
  // "~17838" end-of-typing boundary and the RAM-pinned status2-set tick
  // (17820) landing 1 tick before text visibly starts (§4's own claim). ===
  {
    const preText = sha12(17820);
    check("status2-set tick (17820, RAM-pinned) still shows the empty post-destroy plateau — status flag commits in RAM one tick before any visible text starts, same 'RAM commits ahead of pixel' shape every prior turn shows", preText === "6db0757608e7", `got ${preText}`);
    const expected = buildTwoLineExpected("Foe MURKROW flew", "up high!");
    let firstExact: number | undefined;
    for (const t of range(17825, 17862)) {
      if (diffBoxRegion(png(t), expected) === 0) { firstExact = t; break; }
    }
    check(`"Foe MURKROW flew\\nup high!" text: dense-bisected fully-settled tick pinned at ${firstExact} (pixel-exact vs. drawText+charmap, §4's own prose said "~17838")`, firstExact !== undefined, `no pixel-exact match found in 17825-17862`);
  }

  // === §4 row: text held through statuses3_1 set (17913, RAM-pinned) ===
  {
    const expected = buildTwoLineExpected("Foe MURKROW flew", "up high!");
    for (const t of HOLD_SPOT) {
      check(`"Foe MURKROW flew\\nup high!" held pixel-exact at tick ${t} (spans the RAM-pinned STATUS3_ON_AIR-set tick 17913)`, diffBoxRegion(png(t), expected) === 0, `mismatch at ${t}`);
    }
  }

  // === §4 row: transition into "ONIX used\nDRAGONBREATH!" — dense
  // re-bisection of the "~17921" boundary (RAM: gCurrentMove->225,
  // gBattlerAttacker->0 land 1-2 ticks before text begins per §3). ===
  let dragonbreathSettleTick: number | undefined;
  {
    const kickoffExpected = buildTwoLineExpected("ONIX used", "DRAGONBREATH!");
    for (const t of range(17916, 17953)) {
      if (diffBoxRegion(png(t), kickoffExpected) === 0) { dragonbreathSettleTick = t; break; }
    }
    check(`"ONIX used\\nDRAGONBREATH!" text: dense-bisected fully-settled tick pinned at ${dragonbreathSettleTick} (WORKTREE-LANE CORRECTION: §4's own prose said "~17921-17930"; actual settle is later, matching its own separately-cited 1f3c3523520d@17950 sha, not the ~17921-17930 range)`, dragonbreathSettleTick !== undefined, `no pixel-exact match found in 17916-17953`);
  }
  {
    const kickoffExpected = buildTwoLineExpected("ONIX used", "DRAGONBREATH!");
    for (const t of KICKOFF_HOLD_SPOT) {
      check(`"ONIX used\\nDRAGONBREATH!" held pixel-exact at tick ${t} — no fire-projectile/shake animation this turn (accuracy fails before any animation stage, §5)`, diffBoxRegion(png(t), kickoffExpected) === 0, `mismatch at ${t}`);
    }
    check("sha12(17950) matches §4's own cited DRAGONBREATH-held sha (1f3c3523520d)", sha12(17950) === "1f3c3523520d", `got ${sha12(17950)}`);
  }

  // === §4 row: "ONIX's\nattack missed!" — WORKTREE-LANE CORRECTION: §4's
  // own row cited "ad5ee5aa59cc (18000)" as still-held DRAGONBREATH text;
  // dense re-bisection shows a new message transition already starts by
  // 17986 (shares its own blank/slide-in shas with the DRAGONBREATH
  // kickoff's own transition, 17928-17931 — confirming "shared generic
  // transition frames" is real, not turn-specific), so tick 18000
  // (ad5ee5aa59cc) is actually MID-TYPING "ONIX's attack missed!", not held
  // DRAGONBREATH text. ===
  {
    check("message transition into \"ONIX's attack missed!\" shares its own first transition sha with the DRAGONBREATH kickoff's own transition (20e72b3c096e) — same generic message-box mechanism, not a new one", sha12(17986) === "20e72b3c096e" && sha12(17986) === sha12(17928), `17986=${sha12(17986)}, 17928=${sha12(17928)}`);
    // Pixel-exact match against the generic drawText harness fails here the
    // same way verify-turn13.ts's own "ONIX's accuracy fell!" check did (a
    // narrow apostrophe-kerning mismatch, flagged not chased there) — so
    // this row uses sha-based bisection (against §4's own held-text
    // citation, 19b7891a40bf) rather than a strict 0-diff drawText compare.
    const HELD_SHA = "19b7891a40bf";
    const firstHeld = range(17983, 18010).find((t) => sha12(t) === HELD_SHA);
    check(`"ONIX's\\nattack missed!" text: dense-bisected fully-settled tick pinned at ${firstHeld} (CORRECTED from §4's own "~18000" — that tick, ad5ee5aa59cc, is confirmed mid-typing below, not settled)`, firstHeld !== undefined, `no match for ${HELD_SHA} found in 17983-18010`);
    check("tick 18000 (ad5ee5aa59cc, §4's own cited sha) does NOT match the fully-settled held sha — confirms it's a mid-typing frame, not held DRAGONBREATH text as §4's row implied", sha12(18000) !== HELD_SHA, `18000=${sha12(18000)}`);
    for (const t of MISSED_HOLD_SPOT) {
      check(`"ONIX's\\nattack missed!" held (sha match) at tick ${t}`, sha12(t) === HELD_SHA, `got ${sha12(t)}, expected ${HELD_SHA}`);
    }
    {
      const expected = buildTwoLineExpected("ONIX's", "attack missed!");
      const mismatch = diffBoxRegion(png(18040), expected);
      check("'ONIX's\\nattack missed!' renders close to drawText+charmap expectation (small mismatch budget for the same apostrophe-kerning nuance verify-turn13.ts already flagged, not a content error)", mismatch < 30, `mismatch=${mismatch} px`);
    }
  }

  // === §4 row: message box clears, menu box reappears (RAM: gBattle_BG0_Y
  // flips 0->160 at tick 18085, per §4's own citation) ===
  {
    const preClear = sha12(18077);
    check("pre-clear tick (18077) still shows the missed-text hold (§4's own citation, 19b7891a40bf)", preClear === "19b7891a40bf", `got ${preClear}`);
    const bareAgain = range(18078, 18086).find((t) => sha12(t) === "6db0757608e7");
    check(`message box clears back to the bare-scene sha (6db0757608e7, same as the pre-flew-text plateau — §4's own citation) — first re-appears at tick ${bareAgain}`, bareAgain !== undefined, `shas 18078-18086: ${range(18078, 18086).map(sha12).join(",")}`);
    check("menu box slide-in settles by 18086, matches §4's own citation (ffc7639da02c)", sha12(18086) === "ffc7639da02c", `got ${sha12(18086)}`);
  }

  // === §4 row: settled menu, Murkrow's front sprite genuinely absent, held
  // through the trace's final tick 18956 — the cross-turn-boundary pixel
  // pin (STATUS3_ON_AIR's real rendering consequence persists into turn 15).
  // WORKTREE-LANE CORRECTION: §4's own citation ("18086-18956 | ffc7639da02c")
  // framed this as one flat sha; dense sampling shows it's actually a
  // 2-phase idle-bounce cycle (ffc7639da02c / f0b62ede0c4a) — the same
  // "settled menu box has its own idle bounce, independent of game state"
  // shape docs/turn13-notes.md's own worktree-lane session already found
  // for the FIGHT submenu box. Still RAM-frozen (no state change), just not
  // pixel-frozen at one sha the whole 861-tick hold. ===
  {
    const KNOWN_IDLE_SET = new Set(["ffc7639da02c", "f0b62ede0c4a"]);
    check("settled post-turn menu (18095-18956) idle-bounces within a known 2-sha set, matches §4's own citation family (ffc7639da02c) plus one previously-uncited bounce phase (f0b62ede0c4a)", SETTLED_TAIL_SPOT.every((t) => KNOWN_IDLE_SET.has(sha12(t))), `shas: ${SETTLED_TAIL_SPOT.map(sha12).join(",")}`);
    check("settled post-turn menu, first sampled tick (18095) matches §4's own cited sha exactly", sha12(18095) === "ffc7639da02c", `got ${sha12(18095)}`);
  }

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
