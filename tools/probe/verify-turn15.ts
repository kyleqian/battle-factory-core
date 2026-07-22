// S7/S8 worktree scout, turn 15 probe (FLY's strike half — Murkrow reappears
// and attacks, rolls real accuracy this time — Onix's faint, and the
// battle's FIRST forced PLAYER-side switch, Onix -> MAGBY). Same convention
// as verify-turn13.ts/verify-turn14.ts: re-derives every pinned fact from a
// FRESH `bin/oracle run` (no stale PNGs) and fails loudly if the real
// hardware's pixels stop matching docs/turn15-notes.md's own citations.
// Pixel-only (no RAM reads — this runs from plain `node`, not the mgba-venv
// python interpreter the RAM probes need); RAM facts (RNG ledger, PP/HP/
// status deltas, the FLY-strike sprite/affine table) are cross-cited in
// docs/turn15-notes.md's own dated sections from `ram-probe.py`/
// `dump-battler-full.py`/`dump-fly-anim.py` runs, not re-asserted here.
//
// Per the brief: reuse `battle1-turn15-dense.json`'s own committed 122
// segments verbatim, overriding `captureFrames` with a curated dense list
// (single oracle round trip, capped at 256 captures/run) that densely
// re-bisects every approximate ("~") or wide-range boundary docs/turn15-
// notes.md §4 cited.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn15.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawText, type FontData } from "../../src/engine/font.ts";
import battleWindowAsset from "../../src/assets/gen/battle-window.json" with { type: "json" };
import fontNormalData from "../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../src/data/gen/charmap.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn15-dense.json";
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
// trace's own segments (NOT hand-copied from docs/turn15-notes.md's own
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
check("122 segments total (§1)", bounds.length === 122, `got ${bounds.length}`);
const totalFrames = bounds[bounds.length - 1]!.end + 1;
check("20745 frames total (§1)", totalFrames === 20745, `got ${totalFrames}`);

// This turn's own 12 segments are the LAST 12 (indices 110-121): FIGHT-
// submenu-open A, 30f settle (cursor persisted at DRAGON_BREATH, no nav),
// confirm A, a single 1000f resolution-idle covering Murkrow's entire
// FLY-strike-to-Onix's-faint sequence, then the four switch-flow presses/
// idles from §16's own HEADLINE 2 table (§1).
const menuOpen = bounds[110]!;
const settle = bounds[111]!;
const confirmPress = bounds[112]!;
const resolutionIdle = bounds[113]!;
const dismissFaint = bounds[114]!;
const dismissIdle = bounds[115]!;
const downPress = bounds[116]!;
const downIdle = bounds[117]!;
const selectMagby = bounds[118]!;
const selectIdle = bounds[119]!;
const confirmSendOut = bounds[120]!;
const finalIdle = bounds[121]!;

check("segment[110] is the FIGHT-submenu-open A", menuOpen.buttons.join() === "A", JSON.stringify(menuOpen));
check("segment[111] is a 30f settle with no press (no nav, cursor persisted)", settle.buttons.length === 0 && settle.end - settle.start === 29, JSON.stringify(settle));
check("segment[112] is the confirm A", confirmPress.buttons.join() === "A", JSON.stringify(confirmPress));
check("segment[113] is the 1000f resolution-idle covering the FLY-strike-to-faint sequence", resolutionIdle.buttons.length === 0 && resolutionIdle.end - resolutionIdle.start === 999, JSON.stringify(resolutionIdle));
check("segment[114] is the 'ONIX fainted!' dismiss A", dismissFaint.buttons.join() === "A", JSON.stringify(dismissFaint));
check("segment[115] is a 199f idle", dismissIdle.buttons.length === 0 && dismissIdle.end - dismissIdle.start === 198, JSON.stringify(dismissIdle));
check("segment[116] is the DOWN nav press", downPress.buttons.join() === "DOWN", JSON.stringify(downPress));
check("segment[117] is a 14f idle", downIdle.buttons.length === 0 && downIdle.end - downIdle.start === 13, JSON.stringify(downIdle));
check("segment[118] is the select-MAGBY A", selectMagby.buttons.join() === "A", JSON.stringify(selectMagby));
check("segment[119] is a 39f idle", selectIdle.buttons.length === 0 && selectIdle.end - selectIdle.start === 38, JSON.stringify(selectIdle));
check("segment[120] is the confirm-SEND-OUT A", confirmSendOut.buttons.join() === "A", JSON.stringify(confirmSendOut));
check("segment[121] is a 499f idle (materialize + settle)", finalIdle.buttons.length === 0 && finalIdle.end - finalIdle.start === 498, JSON.stringify(finalIdle));

// Exact tick numbers — derived programmatically from the trace's own
// cumulative frame counts (this trace's tick numbering IS the segment-
// cumulative frame count, same convention verify-turn14.ts established).
const OPEN_TICK = menuOpen.start; // 18956
const CONFIRM_TICK = confirmPress.start; // 18988
const DISMISS_TICK = dismissFaint.start; // 19990
const DOWN_TICK = downPress.start; // 20190
const SELECT_MAGBY_TICK = selectMagby.start; // 20205
const CONFIRM_SENDOUT_TICK = confirmSendOut.start; // 20245
check("OPEN_TICK matches §1/§4's own carried anchor (18956)", OPEN_TICK === 18956, `got ${OPEN_TICK}`);
check("CONFIRM_TICK matches §4's own citation (18988->18990 transient)", CONFIRM_TICK === 18988, `got ${CONFIRM_TICK}`);
check("DISMISS_TICK matches §4's own citation (19990)", DISMISS_TICK === 19990, `got ${DISMISS_TICK}`);
check("DOWN_TICK matches §4's own citation family (20190/20191)", DOWN_TICK === 20190, `got ${DOWN_TICK}`);
check("SELECT_MAGBY_TICK lands inside §4's own citation window (20205-20206->20246)", SELECT_MAGBY_TICK === 20205, `got ${SELECT_MAGBY_TICK}`);
check("CONFIRM_SENDOUT_TICK matches §4's own citation (20245->20246 transient)", CONFIRM_SENDOUT_TICK === 20245, `got ${CONFIRM_SENDOUT_TICK}`);
console.log(`Derived: OPEN=${OPEN_TICK} CONFIRM=${CONFIRM_TICK} DISMISS=${DISMISS_TICK} DOWN=${DOWN_TICK} SELECT_MAGBY=${SELECT_MAGBY_TICK} CONFIRM_SENDOUT=${CONFIRM_SENDOUT_TICK}`);

// --- Curated fresh-oracle capture list: dense re-bisection of every §4 row
// that used an approximate ("~") boundary or a wide multi-sha range, plus
// the mission's own new-mechanism windows (FLY strike-half sprite/text
// core, the faint-vanish render-lag boundary, the party-switch transitions)
// and flat-plateau spot checks for the long holds. ---
function range(a: number, b: number, stride = 1): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t += stride) out.push(t);
  return out;
}
const ANCHOR_SPOT = [18956, 18988, 19003, 19010, 19990];
// FLY strike-half core: submenu-clear -> accuracy roll -> attack string ->
// Murkrow's ball-attack sprite arrives/departs (RAM-pinned destroy tick
// 19075, dump-fly-anim.py) -> Onix's own hit-flash blink (RAM-pinned
// 19102-19135, NOT a Murkrow/Onix sprite overlap — see dossier append) ->
// "not very effective" typing start.
const STRIKE_TEXT_DENSE = range(19076, 19085);
const HITFLASH_SPOT = [19102, 19107, 19111, 19115, 19119, 19123, 19127, 19131, 19135];
// Bridges the "Foe MURKROW used FLY!" hold -> "It's not very effective..."
// typing-in -> its own held plateau (§4's own row cited a wide 19150-19301
// range spanning both a mid-typing sha and a held sha without pinning the
// exact transition tick).
const NOT_VERY_EFFECTIVE_DENSE = range(19150, 19180);
// The "not very effective" hold -> RAM sprite/healthbox teardown (19325) ->
// pixel-confirmed vanish (19330) -> "ONIX fainted!" typing in. This is the
// mission's flagged render-lag boundary (dossier headline's own "5 ticks
// after the HP write" claim, cross-checked against the RAM teardown tick).
// WORKTREE-LANE CORRECTION: dense re-bisection (this session) shows the
// held "not very effective" plateau actually runs 19174-19308 (not §4's own
// cited 19195-19301), and the endpoint sha e699bba4ad9c actually lands at
// tick 19321, not §4's own cited 19325 — both off by a few ticks, same
// class of citation slip prior retrofits found.
const VANISH_DENSE = range(19300, 19345);
const FAINT_HOLD_SPOT = [19365, 19400, 19600, 19800, 19985];
// The flagged "~20020-20040" fade-to-black boundary — dense re-bisection.
const FADE_DENSE = range(20010, 20040);
const PARTYLIST_SETTLE_DENSE = range(20058, 20068);
const PARTYLIST_HOLD_SPOT = [20100, 20150, 20184];
const CURSOR_MOVE_DENSE = range(20188, 20206);
const SUBMENU_SPOT = [20246, 20260, 20300, 20302, 20350];
const MATERIALIZE_START_DENSE = range(20397, 20412);
const MATERIALIZE_MID_SPOT = [20450, 20478, 20484, 20492, 20510];
const SETTLE_DENSE = range(20535, 20560);
const TAIL_SPOT = [20600, 20700, 20744];

const captureFrames = Array.from(
  new Set([
    ...ANCHOR_SPOT,
    ...STRIKE_TEXT_DENSE,
    ...HITFLASH_SPOT,
    ...NOT_VERY_EFFECTIVE_DENSE,
    ...VANISH_DENSE,
    ...FAINT_HOLD_SPOT,
    ...FADE_DENSE,
    ...PARTYLIST_SETTLE_DENSE,
    ...PARTYLIST_HOLD_SPOT,
    ...CURSOR_MOVE_DENSE,
    ...SUBMENU_SPOT,
    ...MATERIALIZE_START_DENSE,
    ...MATERIALIZE_MID_SPOT,
    ...SETTLE_DENSE,
    ...TAIL_SPOT,
  ]),
).sort((a, b) => a - b);
check("curated capture list stays under the oracle's 256-per-run cap", captureFrames.length <= 256, `got ${captureFrames.length}`);
trace.captureFrames = captureFrames;

// --- Shared message-box text rendering (same drawTileBg+drawText+charmap
// methodology verify-turn13.ts/verify-turn14.ts already established, reused
// verbatim). ---
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
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks (single round trip, battle1-turn15-dense.json's own segments)...`);
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

  // === §4 row 1: carried settled "What will ONIX do?" menu (regression pin
  // against docs/turn15-notes.md §1's own footnote — sha differs from
  // turn14-notes.md's cited ffc7639da02c only by cursor-bounce phase). ===
  check("carried settled menu anchor (18956) matches §4's own citation (f0b62ede0c4a)", sha12(18956) === "f0b62ede0c4a", `got ${sha12(18956)}`);

  // === §4 row 2: FIGHT submenu open, cursor on DRAGON_BREATH ===
  check("FIGHT submenu open (18988) matches §4's own citation (6fabb2bc7338)", sha12(18988) === "6fabb2bc7338", `got ${sha12(18988)}`);

  // === §4 row 3: confirm-press transient ===
  check("confirm-press transient (19003) matches §4's own citation (6e80aba602ff)", sha12(19003) === "6e80aba602ff", `got ${sha12(19003)}`);

  // === §4 row 4: "Foe MURKROW us..." typing in ===
  check("'Foe MURKROW us...' typing-in (19010) matches §4's own citation (b29f811a79ff)", sha12(19010) === "b29f811a79ff", `got ${sha12(19010)}`);

  // === §4 row 5: "Foe MURKROW used\nFLY!" held + the "~19110 overlap" claim.
  // RAM (dump-fly-anim.py, this session's own dossier append) shows NO
  // sprite-position overlap at any tick: Murkrow's own mon sprite is
  // stationary at (176,51) from the moment it reappears (RAM-pinned tick
  // 19075) onward, while Onix sits at (72,80) the whole window — a ~40px+
  // gap, not an overlap. What actually cycles at 19102-19135 is a plain
  // 2-frame hit-flash blink on ONIX's own sprite (RAM: invisible toggles
  // true/false every ~4 ticks) — this script verifies that blink is real
  // (an alternating 2-sha set) and settles by pinning the fully-typed text. ===
  {
    const expected = buildTwoLineExpected("Foe MURKROW used", "FLY!");
    let firstExact: number | undefined;
    for (const t of STRIKE_TEXT_DENSE) {
      if (diffBoxRegion(png(t), expected) === 0) { firstExact = t; break; }
    }
    check(`"Foe MURKROW used\\nFLY!" text: dense-bisected fully-settled tick pinned at ${firstExact} (§4's own row cited a wide 19035-19090 range for the held text)`, firstExact !== undefined, `no pixel-exact match found in 19076-19100`);
  }
  {
    const shas = HITFLASH_SPOT.map(sha12);
    const distinct = new Set(shas);
    check(`ONIX hit-flash blink (19102-19135): a dynamic multi-frame cycle (RAM-confirmed invisible-toggle on ONIX's own sprite, period ~4 ticks — NOT a Murkrow/Onix sprite overlap as §4's "around tick 19110" prose could be misread; RAM shows Murkrow's own sprite stationary at (176,51) the whole window, ~40px+ from Onix's (72,80)) — got ${distinct.size} distinct frames`, distinct.size >= 3, `shas: ${shas.join(",")}`);
    check("hit-flash blink genuinely alternates (adjacent sampled ticks differ), not a monotonic one-way transition", shas[0] !== shas[1] && shas[1] !== shas[2], `shas: ${shas.join(",")}`);
  }

  // === §4 row 6: "It's not very effective..." typed and held, well before
  // the stat-stage reset / vanish. WORKTREE-LANE CORRECTION: dense
  // re-bisection shows the held sha (48472e3852a7) first appears at tick
  // 19174, not §4's own cited "19195" start — sha-based bisection used here
  // (not pixel drawText compare) since this string hits the same
  // apostrophe/ellipsis-kerning mismatch verify-turn13.ts/verify-turn14.ts
  // already flagged and didn't chase. ===
  {
    const heldSha = "48472e3852a7"; // §4's own cited "not very effective" held sha
    const firstHeld = NOT_VERY_EFFECTIVE_DENSE.find((t) => sha12(t) === heldSha);
    check(`"It's not very effective..." text: dense-bisected fully-settled tick pinned at ${firstHeld} (CORRECTED from §4's own cited "19195" — actual settle is earlier)`, firstHeld !== undefined, `no match for ${heldSha} found in 19150-19180`);
    check("sha12(19150) does NOT yet match the held sha — confirms 19150 is mid-typing, not settled, contrary to how §4's own row could be read", sha12(19150) !== heldSha, `got ${sha12(19150)}`);
  }

  // === §4 row 6→7: the vanish render-lag boundary — RAM (this session's
  // dossier append, dump-fly-anim.py) pins the sprite/healthbox teardown at
  // tick 19325; this dense pixel bisection finds the exact tick the
  // RENDERED frame first shows Onix's healthbox/sprite gone, cross-checking
  // the headline's own "5 ticks after..." framing (this session's append
  // corrects it to "5 ticks after the RAM teardown," not "after the HP
  // write"). WORKTREE-LANE CORRECTION: §4's own citation "e699bba4ad9c
  // (19325)" is off by 4 ticks — that sha actually reads at tick 19321, and
  // ticks 19322-19329 are a further multi-frame transition (not a flat
  // hold) before the healthbox/sprite-gone frame settles at 19330. ===
  {
    const heldSha = "48472e3852a7";
    const midTransitionSha = "e699bba4ad9c"; // §4's own cited sha, mis-cited at tick 19325
    const goneSha = "43f28321bf88"; // §4's own cited healthbox/sprite-gone sha (19330)
    check("tick 19300 (well inside the plateau) still shows the 'not very effective' hold", sha12(19300) === heldSha, `got ${sha12(19300)}`);
    const midTick = VANISH_DENSE.find((t) => sha12(t) === midTransitionSha);
    check(`§4's own cited transition sha (e699bba4ad9c) actually reads at tick ${midTick} (CORRECTED from §4's own "19325")`, midTick === 19321, `got ${midTick}`);
    const firstGone = VANISH_DENSE.find((t) => sha12(t) === goneSha);
    check(`healthbox/sprite-gone frame: dense-bisected first tick pinned at ${firstGone}, matching §4's own citation (19330) exactly`, firstGone === 19330, `got ${firstGone}`);
  }

  // === §4 row 8: "ONIX\nfainted!♥" held (button-gated). WORKTREE-LANE
  // CORRECTION: §4's own row cites only 2 shas (2d6c41d94131 @ 19365,
  // ef43e683de1a @ 19990) as if the hold were flat/bistable; dense
  // re-bisection (this session) shows it's actually a 3-PHASE idle bounce
  // (ef43e683de1a -> b27912b6eda4 -> 2d6c41d94131, ~9 ticks each, repeating)
  // — the same "settled box has its own idle bounce" family turn13/14
  // already documented for menu boxes, just with 3 phases here instead of
  // 2 (likely the heart icon "♥" blinking on its own sub-cycle). ===
  {
    const FAINT_HOLD_SHAS = new Set(["ef43e683de1a", "b27912b6eda4", "2d6c41d94131"]);
    for (const t of FAINT_HOLD_SPOT) {
      check(`"ONIX fainted!" held, matches one of the 3 known idle-bounce phases at tick ${t}`, FAINT_HOLD_SHAS.has(sha12(t)), `got ${sha12(t)}`);
    }
    check("sha12(19365) matches §4's own cited sha exactly (2d6c41d94131)", sha12(19365) === "2d6c41d94131", `got ${sha12(19365)}`);
    check("still un-dismissed at the dismiss-press tick (19990), matches §4's own citation (ef43e683de1a)", sha12(19990) === "ef43e683de1a", `got ${sha12(19990)}`);
  }

  // === §4 row 9: fade to black — WORKTREE-LANE dense re-bisection of the
  // flagged "~20020-20040" approximate boundary. ===
  {
    const fadeSha = "d8b443032200";
    const firstFade = FADE_DENSE.find((t) => sha12(t) === fadeSha);
    const lastFade = [...FADE_DENSE].reverse().find((t) => sha12(t) === fadeSha);
    check(`fade-to-black: dense-bisected exact window pinned at ${firstFade}-${lastFade} (CORRECTED from §4's own approximate "~20020-20040" prose)`, firstFade !== undefined, `no pure-black frame found in 20008-20042; shas: ${FADE_DENSE.map(sha12).join(",")}`);
    check("tick 20028 (§4's own cited mid-fade tick) does read the pure-black sha", sha12(20028) === fadeSha, `got ${sha12(20028)}`);
  }

  // === §4 row 10: "Choose a POKéMON." list settles, cursor on ONIX.
  // WORKTREE-LANE CORRECTION: §4's own row cites just 2 shas
  // (2945edd25751/aea9c5c07c9c) as if the hold were flat/bistable; dense
  // re-bisection (this session) shows the settled cursor-on-ONIX plateau
  // actually idle-bounces through (at least) 4 phases —
  // {bce90c709d33, aea9c5c07c9c, 35a120289fcc, f0ff81cff21d} — the same
  // "settled screen has its own idle bounce" family already documented
  // elsewhere, just richer here. Critically, one of those 4 phases
  // (bce90c709d33) is the EXACT sha §4's own row 11 cited as marking the
  // post-DOWN "cursor moved to MAGBY" transition — that citation is a
  // false-positive attribution (see row 11 below). ===
  {
    const listSha = "2945edd25751";
    const CURSOR_ON_ONIX_BOUNCE = new Set(["2945edd25751", "bce90c709d33", "aea9c5c07c9c", "35a120289fcc", "f0ff81cff21d"]);
    const firstList = PARTYLIST_SETTLE_DENSE.find((t) => sha12(t) === listSha);
    check(`party-list settle: dense-bisected first tick pinned at ${firstList} (§4's own row cited a wide 20064-20185 range)`, firstList !== undefined, `no match for ${listSha} found in 20058-20068; shas: ${PARTYLIST_SETTLE_DENSE.map(sha12).join(",")}`);
    for (const t of PARTYLIST_HOLD_SPOT) {
      check(`party-list hold, cursor still on ONIX at tick ${t} (one of the 4 known idle-bounce phases, CORRECTED from §4's own 2-sha citation)`, CURSOR_ON_ONIX_BOUNCE.has(sha12(t)), `got ${sha12(t)}`);
    }
  }

  // === §4 row 11: cursor moved to MAGBY after DOWN. WORKTREE-LANE
  // CORRECTION: §4's own row cites "bce90c709d33 (20191)" as the start of
  // this transition, but dense re-bisection shows bce90c709d33 is already
  // present in the PRE-DOWN cursor-on-ONIX idle-bounce set (row 10 above,
  // recurring well before tick 20190) — it is not caused by the DOWN press
  // at all. The genuinely new, uniquely-post-DOWN state is 1e158bc9fb46
  // (confirmed absent from the entire pre-DOWN bounce set), which this
  // dense bisection pins to tick 20204. ===
  {
    const preExistingBounceSha = "bce90c709d33"; // §4's own cited "post-DOWN" sha — actually pre-existing
    const afterSha = "1e158bc9fb46";
    check(`DOWN_TICK (${DOWN_TICK}) already reads §4's own cited "post-move" sha (bce90c709d33) — but this is the PRE-EXISTING idle-bounce phase, not a DOWN-caused change (see correction above)`, sha12(DOWN_TICK) === preExistingBounceSha, `got ${sha12(DOWN_TICK)}`);
    const firstMoved = CURSOR_MOVE_DENSE.find((t) => sha12(t) === afterSha);
    check(`cursor-moved-to-MAGBY: dense-bisected first tick of the genuinely-new state pinned at ${firstMoved} (CORRECTED — §4's own row cited a wide, misleading 20191-20206 range built around a false-positive sha)`, firstMoved !== undefined, `no match for ${afterSha} found in 20188-20206; shas: ${CURSOR_MOVE_DENSE.map(sha12).join(",")}`);
  }

  // === §4 row 12: "Do what with this Pokémon?" SEND OUT/SUMMARY/CANCEL ===
  check("SEND OUT submenu (20246) matches §4's own citation (4e987c2ebe0b)", sha12(20246) === "4e987c2ebe0b", `got ${sha12(20246)}`);

  // === §4 row 13: fade transition ===
  check("fade transition (20302) matches §4's own citation (4da3117d37db)", sha12(20302) === "4da3117d37db", `got ${sha12(20302)}`);

  // === §4 row 14: "Go! MAGBY!" + ball-throw/materialize ===
  {
    const shas = [...MATERIALIZE_START_DENSE, ...MATERIALIZE_MID_SPOT].map(sha12);
    check("ball-throw/materialize window is NOT a static plateau — motion across the sampled ticks, matching the same materialize shape turn5-switchin.json's own precedent shows", new Set(shas).size >= 5, `distinct=${new Set(shas).size} of ${shas.length} ticks`);
    check("tick 20400 matches §4's own cited sha (07d53943f65a)", sha12(20400) === "07d53943f65a", `got ${sha12(20400)}`);
    check("tick 20484 matches §4's own cited sha (0f9a943dbb41)", sha12(20484) === "0f9a943dbb41", `got ${sha12(20484)}`);
  }

  // === §4 row 15: message box clears (blank) — the §5h negative finding
  // (no "Get 'em, MAGBY!" quip). Dense-bisected here too, re-confirming §5h
  // independently from this worktree lane. ===
  {
    const blankSha = "a7a1d6374012";
    const inWindow = SETTLE_DENSE.filter((t) => t >= 20548 && t <= 20558).map((t) => ({ t, sha: sha12(t) }));
    const hasBlank = inWindow.some((r) => r.sha === blankSha);
    check("message box clears to the cited blank sha (a7a1d6374012) somewhere in 20548-20558, re-confirming §5h's own negative finding (no flavor-quip text)", hasBlank, `shas: ${JSON.stringify(inWindow)}`);
  }

  // === §4 row 16: settled "What will MAGBY do?" — dense-bisected settle
  // tick. WORKTREE-LANE CORRECTION: §4's own citation said settle lands at
  // 20558; dense re-bisection pins it 1 tick earlier, at 20557. Also, the
  // "5950e7b3d8ba (20560-20745, held)" framing implies a flat plateau —
  // dense re-bisection (this session) shows it's actually a 4-phase idle
  // bounce {5950e7b3d8ba, 083f11ed7f87, d725501bc9e3, 6e2f6409169f}, same
  // "settled menu has its own idle bounce" family as turn13/14's own
  // findings for the FIGHT submenu box. ===
  {
    const settledSha = "5950e7b3d8ba";
    const SETTLED_MENU_BOUNCE = new Set(["5950e7b3d8ba", "083f11ed7f87", "d725501bc9e3", "6e2f6409169f"]);
    const firstSettled = SETTLE_DENSE.find((t) => sha12(t) === settledSha);
    check(`settled "What will MAGBY do?" menu: dense-bisected first tick pinned at ${firstSettled} (CORRECTED from §4's own cited "20558")`, firstSettled !== undefined, `no match for ${settledSha} found in 20535-20560; shas: ${SETTLE_DENSE.map(sha12).join(",")}`);
    check("settle tick is 1 earlier than §4's own citation (20557, not 20558)", firstSettled === 20557, `got ${firstSettled}`);
    for (const t of TAIL_SPOT) {
      check(`settled menu held at tick ${t} (one of the 4 known idle-bounce phases, CORRECTED from §4's own single-sha citation)`, SETTLED_MENU_BOUNCE.has(sha12(t)), `got ${sha12(t)}`);
    }
  }

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
