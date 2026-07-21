// S7/S8 worktree scout, turn 11 probe (Pidgeotto's FEATHER_DANCE, blocked by
// Onix's own floored ATK stage, + Onix's own ROCK_SLIDE + both halves' turn-
// end through turn 12's menu boundary). Same convention as
// tools/probe/verify-turn10-rockslide.ts: re-derives every pinned fact
// straight from a FRESH `bin/oracle run` (no stale PNGs) and fails loudly if
// the real hardware's pixels stop matching this session's own findings.
// Pixel-only (no RAM reads — this runs from plain `node`, not the mgba-venv
// python interpreter the RAM probes need); RAM facts (rock table/draw-order/
// hit-flash/mon-shake parameterization, the feather-sprite-table absence,
// the gCurrentMove/gRngValue ledger) are cross-cited in docs/turn11-notes.md's
// dated section from fresh `dump-rockslide-sprites.py`/`dump-rockslide-slot-
// order.py`/`dump-feather-dance-sprites.py`/`dump-battle-bars.py` runs, not
// re-asserted here.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn11.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawText, type FontData } from "../../src/engine/font.ts";
import { calcBarFilledPixels, pickHpBarBand } from "../../src/engine/healthboxAssembly.ts";
import { rockSlideTextVisibleChars, rockSlideOpponentHp, ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2, ROCK_SLIDE_TEXT_TOTAL } from "../../src/engine/battleMenu.ts";
import { turn6FeatherDanceTextVisibleChars, TURN6_FEATHERDANCE_LINE1, TURN6_FEATHERDANCE_LINE2, TURN6_FEATHERDANCE_TEXT_TOTAL } from "../../src/engine/battleScene.ts";
import battleWindowAsset from "../../src/assets/gen/battle-window.json" with { type: "json" };
import fontNormalData from "../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../src/data/gen/charmap.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn11-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

// FEATHER_DANCE's own pressTick is the REAL A-confirm press tick (13339, "A
// held 13339-13340" per docs/turn11-notes.md §5) — the same convention
// turns 6/7/8's own drawTurnXFeatherDanceKickoffText dispatchers use
// (`pressTick = TICK0 + sm.confirmElapsed`), NOT a synthetic anchor.
// `turn6FeatherDanceTextStartTick(FEATHER_PRESS_TICK)` = 13352, matching a
// fresh oracle capture's own first typing tick exactly (re-confirmed below).
const FEATHER_PRESS_TICK = 13339;

// The ATK-floor "won't go any lower!" message's own start tick (13422,
// fresh-oracle-confirmed below: sha `492ccf070e80` holds flat 13385-13421,
// changes at 13422) is a GENUINELY NEW delay this turn — turns 6-8's own
// FEATHER_DANCE always continues into the ~270-tick feather/starburst
// animation + stat-fall banner at this point, since their own stat changes
// land; turn 11's is blocked (Onix's ATK already floored), so the battle
// script short-circuits straight to this substituted message instead. No
// existing constant predicts 13422 — it's pinned fresh this session as
// `ATKFLOOR_TEXT_START_DELAY` below (relative to FEATHER_PRESS_TICK).
const ATKFLOOR_TEXT_START_DELAY = 83; // FEATHER_PRESS_TICK + 83 = 13422
// Apostrophe is U+2019 (RIGHT SINGLE QUOTATION MARK, `charmap.json` code
// 180), NOT ASCII 0x27 — same convention every other apostrophe'd message
// in this codebase already uses (`TURN6_ATKFELL_LINE1`'s "ONIX’s ATTACK",
// `TURN9_NOTVERYEFFECTIVE_LINE`'s "It’s..."; caught by this check's own
// first failing run, same "let the check catch it" discipline turn10's
// script used for its HP-bar-visibility assumption).
const ATKFLOOR_LINE1 = "ONIX’s ATTACK";
const ATKFLOOR_LINE2 = "won’t go lower!";
const ATKFLOOR_TOTAL = ATKFLOOR_LINE1.length + ATKFLOOR_LINE2.length;
function atkFloorTextStartTick(pressTick: number): number {
  return pressTick + ATKFLOOR_TEXT_START_DELAY;
}
function atkFloorVisibleChars(t: number, pressTick: number): number {
  const start = atkFloorTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(ATKFLOOR_TOTAL, t - start + 1);
}

// ROCK_SLIDE's own pressTick is a SYNTHETIC anchor (same reasoning as turns
// 3/5/6/7/9/10's own TURNn_ROCKSLIDE_PRESS_TICK constants — there's no
// player button press for the AI's own second move). Fit against this
// session's own fresh RAM/pixel data (docs/turn11-notes.md's dated section
// has the full derivation): `rockSlideTextStartTick`(393)->13530 (kickoff
// text box transition, pixel-confirmed below), `ROCK_SLIDE_RAM_ANCHOR_
// DELAY`(428)->13565 (rock+shake RAM creation, RAM-cross-cited), `ROCK_
// SLIDE_MON_SHAKE_START/END_DELAY`(443/536, render+1)->13580/13673 (target's
// own y2 bounce, RAM-cross-cited, 0 mismatches over 841 sampled ticks),
// `HIT_FLASH_RAM_ANCHOR_DELAY`(562)->13699 (blink/wobble first-active RAM
// tick, RAM-cross-cited exactly), and `ROCK_SLIDE_HP_DRAIN_START_DELAY`
// (597)->13734 (bar1's own sentinel tick, RAM-cross-cited exactly) — all
// five of the already-shipped delay constants land on this session's own
// fresh RAM ticks with a SINGLE shared pressTick, and `rockSlideRockState`/
// `rockSlideDrawOrder` (the real, unmodified functions) reproduce every one
// of 980 sampled rock-center reads (0 mismatches) and the FULL draw-order
// sequence at all 117 multi-rock RAM ticks (0 mismatches, not just an
// alive-set check) — confirming turn 11's own ROCK_SLIDE half needs no new
// mechanism code, only this new pressTick + Pidgeotto's own HP endpoints.
const ROCKSLIDE_PRESS_TICK = 13137;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

const PRESUBMIT_RANGE = [13296, 13302, 13303]; // pre-press baseline + submenu-open settle
const FEATHER_PRESS_RANGE = [13334, 13340, 13341, 13351]; // confirm-press transient
const FEATHER_KICKOFF_RANGE = [13352, 13360, 13365, 13372, 13378, 13383, 13384, 13385, 13421]; // feather kickoff text typing + 33-tick blocked hold (NO animation)
const ATKFLOOR_RANGE = [13421, 13422, 13430, 13435, 13440, 13445, 13448, 13449]; // ATK-floor message transition + reveal + settle
const ATKFLOOR_HOLD_RANGE = [13528, 13529]; // held through Onix's own curMove/target update + ROCK_SLIDE accuracy roll
const ROCKSLIDE_KICKOFF_RANGE = [13526, 13529, 13530, 13535, 13540, 13545, 13548, 13549, 13557]; // pre-transition hold + box transition + text reveal + settle
const ROCKSLIDE_HP_RANGE = [13730, 13731, 13732, 13733, 13734, 13745, 13756, 13757, 13761, 13762]; // Pidgeotto HP drain 38(37)->16 + healthbar color-zone crossing
const SUPEREFFECTIVE_RANGE = [13760, 13786, 13787, 13800, 13857]; // box transition + text reveal + settle
const TURNEND_RANGE = [13859, 13897, 14000, 14340];
const captureFrames = Array.from(new Set([...PRESUBMIT_RANGE, ...FEATHER_PRESS_RANGE, ...FEATHER_KICKOFF_RANGE, ...ATKFLOOR_RANGE, ...ATKFLOOR_HOLD_RANGE, ...ROCKSLIDE_KICKOFF_RANGE, ...ROCKSLIDE_HP_RANGE, ...SUPEREFFECTIVE_RANGE, ...TURNEND_RANGE])).sort((a, b) => a - b);
trace.captureFrames = captureFrames;

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

async function main() {
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };
  const sha = (t: number) => get(t).sha256;

  // --- Shared message-box text rendering (same drawTileBg+drawText+charmap
  // methodology verify-turn9-postlunge.ts/verify-turn10-rockslide.ts already
  // established, reused verbatim for all three of this turn's messages). ---
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
  function buildTwoLineExpected(line1: string, line2: string, chars: number): Buffer {
    const fb = Buffer.alloc(240 * 160 * 4);
    drawTileBg(fb);
    const l1 = line1.slice(0, Math.min(chars, line1.length));
    if (l1.length > 0) drawText(fb as unknown as Uint8Array, font, charmap, l1, LINE1_ORIGIN.x, LINE1_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
    const remaining = chars - line1.length;
    if (remaining > 0) {
      const l2 = line2.slice(0, Math.min(remaining, line2.length));
      drawText(fb as unknown as Uint8Array, font, charmap, l2, LINE2_ORIGIN.x, LINE2_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
    }
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
  function checkTextReveal(label: string, ticks: number[], line1: string, line2: string, total: number, visibleChars: (t: number) => number): void {
    for (const t of ticks) {
      const chars = visibleChars(t);
      const actual = PNG.sync.read(get(t).png).data as unknown as Buffer;
      const expected = buildTwoLineExpected(line1, line2, chars);
      const mismatch = diffBoxRegion(actual, expected);
      check(`${label}: render ${t} shows ${chars}/${total} chars exactly`, mismatch === 0, `mismatch=${mismatch}`);
    }
  }

  // === FEATHER_DANCE half ===
  check("pre-press baseline settled (13296-13302 static)", sha(13296) === sha(13302), "expected static idle-bob plateau");
  check("pre-press baseline sha matches turn10-notes.md's own tick-12900 citation", sha(13296).slice(0, 12) === "63e2d272402d", `got ${sha(13296).slice(0, 12)}`);
  check("FIGHT submenu settled by 13303, cursor on ROCK_SLIDE", sha(13303).slice(0, 12) === "e28bc5375a15", `got ${sha(13303).slice(0, 12)}`);
  check("confirm-press transient: 13341-13351 static (pre-kickoff plateau persists)", sha(13341) === sha(13351), "expected static plateau");

  checkTextReveal("FEATHER_DANCE kickoff text", [13352, 13360, 13365, 13372, 13378, 13383, 13384], TURN6_FEATHERDANCE_LINE1, TURN6_FEATHERDANCE_LINE2, TURN6_FEATHERDANCE_TEXT_TOTAL, (t) => turn6FeatherDanceTextVisibleChars(t, FEATHER_PRESS_TICK));
  check("FEATHER_DANCE kickoff text fully typed, holds 13385-13421 (NO feather animation — blocked stat change short-circuits before it)", sha(13385) === sha(13421), `13385=${sha(13385).slice(0, 12)}, 13421=${sha(13421).slice(0, 12)}`);
  check("FEATHER_DANCE kickoff hold sha matches dossier's own citation", sha(13385).slice(0, 12) === "492ccf070e80", `got ${sha(13385).slice(0, 12)}`);

  // === ATK-floor message half (genuinely new this turn — §above) ===
  check("ATK-floor message: transition begins exactly at 13422, not 13421", sha(13421) !== sha(13422), "13421 and 13422 unexpectedly match");
  checkTextReveal("ATK-floor message", [13422, 13430, 13435, 13440, 13445, 13448], ATKFLOOR_LINE1, ATKFLOOR_LINE2, ATKFLOOR_TOTAL, (t) => atkFloorVisibleChars(t, FEATHER_PRESS_TICK));
  check("ATK-floor message fully typed, settles at 13449 (start+TOTAL-1, plain cap rule, no extra lag)", sha(13448) !== sha(13449), "expected the settle transition exactly at 13449");
  check("ATK-floor message holds 13449-13529 (80 ticks, through Onix's own curMove/target update + ROCK_SLIDE's own accuracy roll, all silent)", sha(13449) === sha(13528) && sha(13528) === sha(13529), "expected a static 80-tick hold");
  check("ATK-floor message hold sha matches dossier's own citation", sha(13449).slice(0, 12) === "82aa7ca871df", `got ${sha(13449).slice(0, 12)}`);

  // === ROCK_SLIDE half ===
  check("pre-kickoff hold: 13526-13529 static (still ATK-floor message settle)", sha(13526) === sha(13529), "expected 4 identical shas");
  check("ROCK_SLIDE box transition begins at 13530, not 13529", sha(13529) !== sha(13530), "13529 and 13530 unexpectedly match");
  checkTextReveal("ROCK_SLIDE kickoff text", [13530, 13535, 13540, 13545, 13548, 13549], ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2, ROCK_SLIDE_TEXT_TOTAL, (t) => rockSlideTextVisibleChars(t, ROCKSLIDE_PRESS_TICK));
  check("ROCK_SLIDE kickoff text fully revealed, settles by 13549, holds through crit/spread rolls", sha(13549) === sha(13557), `13549=${sha(13549).slice(0, 12)}, 13557=${sha(13557).slice(0, 12)}`);

  // --- Pidgeotto (opponent battler) HP drain 38(37)->16, own healthbar
  // color-zone crossing — new to this sub-chain (docs/turn11-notes.md §5).
  // composeOpponentHealthbox's own name/level/gender params are
  // battleScene.ts-internal (not exported), so this session verifies the
  // HP-bar fill/band math directly via `rockSlideOpponentHp`/
  // `calcBarFilledPixels`/`pickHpBarBand`, same honest-scope convention
  // verify-turn10-rockslide.ts already established for this same battler. ---
  const PIDGEOTTO_MAX_HP = 156;
  for (const [t, expectedHp] of [
    [13733, 38],
    [13734, 38], // sentinel tick itself: d=0 still yields startHp unchanged, first decrement takes effect at 13735 (turn10-notes.md's own "d=0/d>=1" rule, re-verified here)
    [13745, 27],
    [13756, 16],
    [13757, 16],
    [13800, 16],
  ] as const) {
    const hp = rockSlideOpponentHp(t, ROCKSLIDE_PRESS_TICK, 38, 16);
    check(`rockSlideOpponentHp(${t}) === ${expectedHp}`, hp === expectedHp, `got ${hp}`);
  }
  check("Pidgeotto HP: 38/156 is yellow band pre-drain (dossier §5)", pickHpBarBand(calcBarFilledPixels(38 / PIDGEOTTO_MAX_HP).filledPixels) === "yellow", "expected yellow");
  check("Pidgeotto HP: 33/156 is still yellow (dossier's own crossing citation, upper bracket)", pickHpBarBand(calcBarFilledPixels(33 / PIDGEOTTO_MAX_HP).filledPixels) === "yellow", "expected yellow");
  check("Pidgeotto HP: 32/156 is red (dossier's own crossing citation, lower bracket — first crossing in this sub-chain)", pickHpBarBand(calcBarFilledPixels(32 / PIDGEOTTO_MAX_HP).filledPixels) === "red", "expected red");
  check("Pidgeotto HP: 16/156 is red post-drain", pickHpBarBand(calcBarFilledPixels(16 / PIDGEOTTO_MAX_HP).filledPixels) === "red", "expected red");

  for (const t of [13730, 13731, 13732, 13733]) {
    check(`Pidgeotto HP drain: still static pre-drain at ${t}`, sha(t) === sha(13730), `${t} differs from 13730`);
  }
  check("Pidgeotto HP drain: still static at the sentinel tick itself (13734)", sha(13734) === sha(13733), "13733 and 13734 unexpectedly differ");
  check("Pidgeotto HP drain: mid-drain tick 13745 is pixel-visibly different from the sentinel tick", sha(13745) !== sha(13734), "13745 unexpectedly matches the pre-drain sentinel frame");
  check("Pidgeotto HP drain: settled 13756-13761 (drain done)", sha(13756) === sha(13761), `13756=${sha(13756).slice(0, 12)}, 13761=${sha(13761).slice(0, 12)}`);
  check("message-box transition into 'super effective' begins at 13762, not held further", sha(13761) !== sha(13762), "13761 and 13762 unexpectedly match");

  // --- "It's super effective!" transition + turn-end (matches docs/turn11-
  // notes.md §5's own citations). ---
  check("super-effective box transition begins by 13786 (differs from the settled impact-tail frame)", sha(13787) !== sha(13760), "expected a differing frame by 13787");
  check("super-effective text settled and holds 13787-13857", sha(13787) === sha(13857), `13787=${sha(13787).slice(0, 12)}, 13857=${sha(13857).slice(0, 12)}`);
  check("super-effective settle sha matches dossier's own citation", sha(13800).slice(0, 12) === "6ccb690b57b3", `got ${sha(13800).slice(0, 12)}`);

  check("turn-end: 13859 matches dossier's own cited sha (text clearing)", sha(13859).slice(0, 12) === "cf34cbe53962", `got ${sha(13859).slice(0, 12)}`);
  check("turn-12 menu settled: 13897 matches dossier's own cited sha", sha(13897).slice(0, 12) === "db251fad6c61", `got ${sha(13897).slice(0, 12)}`);
  // The turn-12 menu's own idle-bounce is a multi-plateau cycle (not a
  // single-tick blip like tick 13296's — docs/turn11-notes.md §5's own
  // "not perfectly flat" finding, matching turn10-notes.md's own §4
  // correction for its equivalent resting menu). Assert only what was
  // actually bisected there: RAM stays flat (cited, not re-asserted here),
  // and the resting-phase sha recurs at widely-spaced ticks.
  const TURN12_IDLE_CYCLE_SHAS = new Set(["db251fad6c61", "1b57eb51635c", "55822ddf41b2"]);
  check("turn-12 menu: 14000 lands on one of the known idle-cycle shas (not a new mechanism)", TURN12_IDLE_CYCLE_SHAS.has(sha(14000).slice(0, 12)), `got ${sha(14000).slice(0, 12)}`);
  check("turn-12 menu: 14340 (trace end) lands back on the resting-phase sha (13897)", sha(14340) === sha(13897), `14340=${sha(14340).slice(0, 12)} vs 13897=${sha(13897).slice(0, 12)}`);

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
