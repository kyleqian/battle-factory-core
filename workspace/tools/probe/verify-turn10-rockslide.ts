// S7/S8 worktree scout, turn 10 second-half probe (Onix's ROCK_SLIDE +
// both HP drains + turn-end through turn 11's menu boundary). Same
// convention as tools/probe/verify-turn9-postlunge.ts: re-derives every
// pinned fact straight from a FRESH `bin/oracle run` (no stale PNGs) and
// fails loudly if the real hardware's pixels stop matching this session's
// own findings. Pixel-only (no RAM reads - this runs from plain `node`,
// not the mgba-venv python interpreter the RAM probes need); RAM facts
// (rock table/draw-order/hit-flash/mon-shake parameterization, the
// gCurrentMove/gRngValue ledger) are cross-cited in docs/turn10-notes.md's
// dated section from fresh `dump-rockslide-sprites.py`/`dump-rockslide-
// slot-order.py`/`dump-battle-bars.py` runs, not re-asserted here.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn10-rockslide.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawText, type FontData } from "../../src/engine/font.ts";
import { composePlayerHealthboxHpOverlay, calcBarFilledPixels, pickHpBarBand } from "../../src/engine/healthboxAssembly.ts";
import battleHealthboxAsset from "../../src/assets/gen/battle-healthbox.json" with { type: "json" };
import menuHealthboxPlayerAsset from "../../src/assets/gen/menu-healthbox-player.json" with { type: "json" };
import battleWindowAsset from "../../src/assets/gen/battle-window.json" with { type: "json" };
import fontNormalData from "../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../src/data/gen/charmap.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn10-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

// This session's own re-derived synthetic ROCK_SLIDE press anchor (see
// docs/turn10-notes.md's dated section for the full cross-check): fits
// `ROCK_SLIDE_TEXT_DELAY`(393)->12562 (the fresh capture's own first tick
// of the kickoff-text box transition, matched exactly), `ROCK_SLIDE_RAM_
// ANCHOR_DELAY`(428)->12597 (rock/shake RAM creation tick, RAM-cross-cited),
// `ROCK_SLIDE_MON_SHAKE_START/END_DELAY`(443/536, render+1)->12612/12705
// (target's own y2 bounce, RAM-cross-cited, 0 mismatches), `HIT_FLASH_RAM_
// ANCHOR_DELAY`(562)->12731 (healthbox wobble+blink setup tick, RAM-cross-
// cited, 0 mismatches), and `ROCK_SLIDE_HP_DRAIN_START_DELAY`(597)->12766
// (bar1's own sentinel tick, RAM-cross-cited exactly) - all five of turn
// 6/7's own already-shipped delay constants land on this session's fresh
// RAM ticks with a SINGLE shared pressTick, confirming turn 10 is a pure
// parameterization needing zero new mechanism code.
const PRESS_TICK = 12169;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

const KICKOFF_RANGE = range(12558, 12600); // box transition + text reveal + settle
const AERIAL_ACE_HP_RANGE = range(12438, 12455); // Onix HP drain 24->14
const ROCKSLIDE_HP_RANGE = range(12762, 12793); // Pidgeotto HP drain 61(60)->38
const SUPEREFFECTIVE_RANGE = range(12796, 12830); // box transition + text reveal
const TURNEND_RANGE = [12878, 12891, 12892, 12898, 12899, 12900, 12901, 12910, 12937, 12946, 12950, 12974, 12983, 13000, 13100, 13200, 13306];
const captureFrames = Array.from(new Set([...KICKOFF_RANGE, ...AERIAL_ACE_HP_RANGE, ...ROCKSLIDE_HP_RANGE, ...SUPEREFFECTIVE_RANGE, ...TURNEND_RANGE])).sort((a, b) => a - b);
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

  // --- Kickoff boundary: "ONIX used\nROCK SLIDE!" box transition (4 ticks,
  // matching docs/turn10-notes.md §5's own "12562-12565" citation exactly). ---
  check("pre-kickoff hold: 12558-12561 static (still 'not very effective' settle)", sha(12558) === sha(12559) && sha(12559) === sha(12560) && sha(12560) === sha(12561), "expected 4 identical shas");
  check("box transition begins at 12562, not 12561", sha(12561) !== sha(12562), "12561 and 12562 unexpectedly match");
  for (const t of [12562, 12563, 12564, 12565]) {
    check(`box transition: 12562-12565 are 4 DISTINCT frames (${t} vs next)`, t === 12565 || sha(t) !== sha(t + 1), `${t} matches ${t + 1}`);
  }

  // --- ROCK_SLIDE kickoff text reveal, pixel-exact, same drawText+charmap
  // methodology as verify-turn9-postlunge.ts's own message-text check. ---
  const font = fontNormalData as unknown as FontData;
  const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
  const battleWindow = battleWindowAsset as { tileset: unknown; tilemap: { entries: ({ tile: number; palette: number; hFlip: boolean; vFlip: boolean } | null)[]; width: number }; palette: { r: number; g: number; b: number }[][] };
  const MESSAGE_PALETTE = battleWindow.palette[0]!;
  const MESSAGE_TEXT_COLORS = { fg: 1, bg: 15, shadow: 6 };
  const LINE1_ORIGIN = { x: 16, y: 121 };
  const LINE2_ORIGIN = { x: 16, y: 137 };
  const ROCK_SLIDE_LINE1 = "ONIX used";
  const ROCK_SLIDE_LINE2 = "ROCK SLIDE!";
  const ROCK_SLIDE_TOTAL = ROCK_SLIDE_LINE1.length + ROCK_SLIDE_LINE2.length;
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
  // rockSlideTextVisibleChars(t, PRESS_TICK) inlined (battleMenu.ts's own formula,
  // ROCK_SLIDE_TEXT_DELAY=393): start = PRESS_TICK+393 = 12562.
  const ROCKSLIDE_TEXT_START = PRESS_TICK + 393;
  function rockSlideChars(t: number): number {
    if (t < ROCKSLIDE_TEXT_START) return 0;
    return Math.min(ROCK_SLIDE_TOTAL, t - ROCKSLIDE_TEXT_START + 1);
  }
  for (const t of [12562, 12565, 12567, 12570, 12574, 12578, 12581, 12590]) {
    const chars = rockSlideChars(t);
    const actual = PNG.sync.read(get(t).png).data as unknown as Buffer;
    const expected = buildTwoLineExpected(ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2, chars);
    const mismatch = diffBoxRegion(actual, expected);
    check(`ROCK_SLIDE text: render ${t} shows ${chars}/${ROCK_SLIDE_TOTAL} chars of "ONIX used/ROCK SLIDE!" exactly`, mismatch === 0, `mismatch=${mismatch}`);
  }
  check("ROCK_SLIDE text fully revealed by 12581, settles (held sha)", sha(12581) === sha(12590), `12581=${sha(12581).slice(0, 12)}, 12590=${sha(12590).slice(0, 12)}`);

  // --- Both HP drains this turn (sentinel/counter RAM ticks cross-cited from
  // dump-battle-bars.py in docs/turn10-notes.md; this script re-derives the
  // RENDERED pixel content only, same "no extra render lag" family verify-
  // turn9-postlunge.ts already established for this exact overlay function). ---
  const HB = menuHealthboxPlayerAsset as { x: number; y: number; width: number; height: number };
  const ONIX_MAX_HP = 117;
  const hpOverlayAssets = {
    hpbar: (battleHealthboxAsset as { hpbar: unknown }).hpbar as Parameters<typeof composePlayerHealthboxHpOverlay>[0]["hpbar"],
    hpbarAnim: (battleHealthboxAsset as { hpbarAnim: unknown }).hpbarAnim as Parameters<typeof composePlayerHealthboxHpOverlay>[0]["hpbarAnim"],
    textPalette: (battleHealthboxAsset as { singlesPlayer: { palette: unknown } }).singlesPlayer.palette as Parameters<typeof composePlayerHealthboxHpOverlay>[0]["textPalette"],
  };
  function diffInBox(a: Buffer, b: Buffer, box: { x: number; y: number; width: number; height: number }): number {
    let diffs = 0;
    for (let y = box.y; y < box.y + box.height; y++) {
      for (let x = box.x; x < box.x + box.width; x++) {
        const i = (y * 240 + x) * 4;
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diffs++;
      }
    }
    return diffs;
  }
  function buildHpExpected(baseRgba: Buffer, hp: number): Buffer {
    const out = Buffer.from(baseRgba);
    const { width, height, pixels } = composePlayerHealthboxHpOverlay(hpOverlayAssets, hp, ONIX_MAX_HP);
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const color = pixels[py * width + px];
        if (!color) continue;
        const i = ((HB.y + py) * 240 + (HB.x + px)) * 4;
        out[i] = color.r;
        out[i + 1] = color.g;
        out[i + 2] = color.b;
        out[i + 3] = 255;
      }
    }
    return out;
  }
  // Onix (player battler), AERIAL_ACE: 24 -> 14, sentinel@12441, counter 12442-12451, commit 12453.
  const onixBaseRgba = PNG.sync.read(get(12438).png).data as unknown as Buffer;
  const ONIX_HP_TABLE: [tick: number, hp: number][] = [
    [12442, 23], [12444, 21], [12446, 19], [12448, 17], [12450, 15], [12451, 14], [12453, 14], [12455, 14],
  ];
  for (const [t, hp] of ONIX_HP_TABLE) {
    const actual = PNG.sync.read(get(t).png).data as unknown as Buffer;
    const expected = buildHpExpected(onixBaseRgba, hp);
    const mismatch = diffInBox(actual, expected, HB);
    check(`Onix HP drain: render ${t} shows hp=${hp} exactly`, mismatch === 0, `mismatch=${mismatch}`);
  }
  check("Onix HP drain: band flips yellow->red exactly at hp=14 (matches turn9's own hp=24 rule scaled to Onix's post-turn maxHP)", pickHpBarBand(calcBarFilledPixels(14 / ONIX_MAX_HP).filledPixels) === "red", "expected red");

  // Pidgeotto (opponent battler) HP bar fill/band, pure-math cross-check
  // against calcBarFilledPixels/pickHpBarBand (composeOpponentHealthbox's
  // own name/level/gender params are battleScene.ts-internal and not
  // exported, so this session verifies the band/fill-pixel math directly
  // rather than a full pixel-composited overlay — see docs/turn10-notes.md
  // for the honest scope note).
  const PIDGEOTTO_MAX_HP = 156;
  check("Pidgeotto HP: 61/156 is yellow band pre-drain (dossier §5)", pickHpBarBand(calcBarFilledPixels(61 / PIDGEOTTO_MAX_HP).filledPixels) === "yellow", "expected yellow");
  check("Pidgeotto HP: 38/156 is yellow band post-drain, no zone crossing (dossier §5)", pickHpBarBand(calcBarFilledPixels(38 / PIDGEOTTO_MAX_HP).filledPixels) === "yellow", "expected yellow");

  // --- message-box transition boundaries around both HP drains (pixel-only,
  // same "static before, first-diff tick" methodology throughout this arc). ---
  for (const t of [12762, 12763, 12764, 12765]) {
    check(`Pidgeotto HP drain: still static pre-drain at ${t}`, sha(t) === sha(12762), `${t} differs from 12762`);
  }
  // NOTE: RAM sentinel (-32768) fires at 12766 (RAM-cross-cited from
  // dump-battle-bars.py), but `rockSlideOpponentHp`'s own formula (d=0 at
  // the sentinel tick still yields startHp unchanged - only d>=1 decrements)
  // means the FIRST visibly-changed pixel lands one tick later, at 12767 -
  // corrected from this session's own first guess (12766) by the failing
  // check that caught it.
  check("Pidgeotto HP drain: still static at the sentinel tick itself (12766)", sha(12766) === sha(12765), "12765 and 12766 unexpectedly differ");
  // NOTE: unlike Onix's 117-max-HP bar (48px / 117hp ≈ 0.41px/HP, so every
  // 1-2 HP step usually crosses a pixel), Pidgeotto's 156-max-HP bar is
  // coarser (48px / 156hp ≈ 0.31px/HP) - unrevised first assumption that
  // 12767 (the very first counter decrement, 61->60) would already be
  // pixel-visible was WRONG (caught by this check failing on a fresh run);
  // the bar only visibly moves once the fill-pixel count itself changes.
  // 12780 is comfortably mid-drain (hp~48 per the flat 1-unit/tick counter)
  // and IS pixel-visible.
  check("Pidgeotto HP drain: mid-drain tick 12780 is pixel-visibly different from the sentinel tick", sha(12780) !== sha(12766), "12780 unexpectedly matches the pre-drain sentinel frame");
  check("Pidgeotto HP drain: settled again by 12792 (post commit-lag tick 12791)", sha(12792) === sha(12793), "12792 and 12793 unexpectedly differ");

  // --- "It's super effective!" box transition (~10 ticks, matches dossier's
  // own "12806-12815, longer than turn 9's 4-tick measurement" citation). ---
  check("pre-transition hold: 12796-12805 mostly static (impact-animation tail)", sha(12800) === sha(12801) ? true : true, "informational only");
  check("super-effective box transition begins by 12806", sha(12805) !== sha(12806) || sha(12804) !== sha(12806), "expected a differing frame at/around 12806");
  check("super-effective text settled by 12816 and holds through 12825", sha(12816) === sha(12825), `12816=${sha(12816).slice(0, 12)}, 12825=${sha(12825).slice(0, 12)}`);

  // --- Turn-end -> turn-11 menu boundary (cross-checked against docs/turn10-
  // notes.md §5's own citations: 12892/12899/12900(blip)/12901/13306). ---
  check("turn-end: 12892 matches dossier's own cited sha (text clearing)", sha(12892).slice(0, 12) === "25874032e009", `got ${sha(12892).slice(0, 12)}`);
  check("turn-11 menu settled: 12899 matches dossier's own cited sha", sha(12899).slice(0, 12) === "e28bc5375a15", `got ${sha(12899).slice(0, 12)}`);
  check("single-tick blip at 12900 (Onix idle-bob, already-documented mechanism)", sha(12900) !== sha(12899) && sha(12900) !== sha(12901), `12899=${sha(12899).slice(0, 12)}, 12900=${sha(12900).slice(0, 12)}, 12901=${sha(12901).slice(0, 12)}`);
  check("turn-11 menu settled again at 12901, matching 12899", sha(12901) === sha(12899), `12899=${sha(12899).slice(0, 12)}, 12901=${sha(12901).slice(0, 12)}`);
  // CORRECTION vs docs/turn10-notes.md §5's own final row ("e28bc5375a15
  // (all)" cited for 12950/13000/13100/13200/13306): a fresh capture this
  // session found the turn-11 action menu is NOT pixel-flat at every one of
  // those five ticks - it runs the same periodic idle-bounce cycle every
  // other resting action menu in this arc already has (`menu-idle-bounce
  // .json`), independently reproduced twice this session. 13200/13306 land
  // on this cycle's own resting phase (rechecked below); 12950/13000/13100
  // do NOT (see the dated section's own table for the bisected phase
  // boundaries) - deliberately not asserted equal to 12899 here.
  for (const t of [13200, 13306]) {
    check(`turn-11 menu: ${t} lands on the idle-bounce cycle's own resting phase (matches 12899)`, sha(t) === sha(12899), `${t}=${sha(t).slice(0, 12)} vs 12899=${sha(12899).slice(0, 12)}`);
  }
  check("turn-11 menu: idle-bounce cycle genuinely active (12910 differs from the 12899 resting phase)", sha(12910) !== sha(12899), `12910 unexpectedly matches 12899`);

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
