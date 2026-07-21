// S7 slice R rungs (c3)/(c4) prep — mandatory first step for whoever picks this
// up next, same convention as tools/compare/scratch/diag-quickattack-anchor.ts.
// Re-derives the pinned facts in docs/turn9-shake-notes.md straight from a FRESH
// `bin/oracle run` (no stale PNGs, no trusting the doc's own prose) and fails
// loudly if the real hardware's pixels ever stop matching this session's own
// findings. Pixel-only (no RAM reads — this runs from plain `node`, not the
// mgba-venv python interpreter the RAM probes need); RAM facts are cross-cited
// in the notes doc from tools/probe/dump-endeavor-tail.py / dump-quickattack-
// anim.py runs, not re-asserted here.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn9-postlunge.ts
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

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn9-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

// Union of every tick this script's assertions touch, across both windows.
const EP1_RANGE = range(10924, 10950);
const EP2_RANGE = range(10945, 10986);
const MSG_RANGE = range(10999, 11006);
// 2026-07-21 addendum: HP-drain (§1), message-text-reveal (§2), settled-hold
// (§3) ranges - see docs/turn9-shake-notes.md's own dated section.
const HP_RANGE = range(10985, 11002);
const TEXT_RANGE = range(11003, 11032);
const HOLD_RANGE = [11018, 11028, 11060, 11109, 11110, 11113];
const captureFrames = Array.from(new Set([...EP1_RANGE, ...EP2_RANGE, ...MSG_RANGE, ...HP_RANGE, ...TEXT_RANGE, ...HOLD_RANGE])).sort((a, b) => a - b);
trace.captureFrames = captureFrames;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

// Bboxes (screen-space, half-open) — see docs/turn9-shake-notes.md's own methodology section.
const ONIX_BOX = { x0: 44, x1: 99, y0: 49, y1: 111 }; // Onix's own real sprite (battler0, gBattlerSpriteIds slot 6)
const HITSPLAT_BOX = { x0: 56, x1: 88, y0: 72, y1: 104 }; // the AnimHitSplatBasic sprite footprint (32x32 @ center 72,88)
const HEALTHBOX_BOX = { x0: 127, x1: 229, y0: 74, y1: 110 }; // Onix's own healthbox + border sub-pieces

function inBox(x: number, y: number, b: { x0: number; x1: number; y0: number; y1: number }): boolean {
  return x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1;
}

interface RegionDiff {
  total: number;
  onix: number; // ONIX_BOX minus HITSPLAT_BOX
  hitsplat: number; // HITSPLAT_BOX
  healthbox: number; // HEALTHBOX_BOX
  other: number;
}

function diffRegions(png: Buffer, basePng: Buffer): RegionDiff {
  const img = PNG.sync.read(png);
  const base = PNG.sync.read(basePng);
  const out: RegionDiff = { total: 0, onix: 0, hitsplat: 0, healthbox: 0, other: 0 };
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      if (img.data[i] === base.data[i] && img.data[i + 1] === base.data[i + 1] && img.data[i + 2] === base.data[i + 2]) continue;
      out.total += 1;
      if (inBox(x, y, HITSPLAT_BOX)) out.hitsplat += 1;
      else if (inBox(x, y, ONIX_BOX)) out.onix += 1;
      else if (inBox(x, y, HEALTHBOX_BOX)) out.healthbox += 1;
      else out.other += 1;
    }
  }
  return out;
}

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

  // --- Episode 1 (lunge-adjacent x2 shake + hitsplat), RAM ticks 10934-10943 ---
  const ep1Base = get(10924).png;
  const ep1 = (t: number) => diffRegions(get(t).png, ep1Base);

  check("10924-10928 settle: 0 diff vs self (sanity)", ep1(10928).total === 0, `got ${JSON.stringify(ep1(10928))}`);

  // Hitsplat (slot 7): RAM live 10934-10943 (10 ticks) -> render 10935-10944
  // (RAM+1 lag, ENDEAVOR_HITSPLAT_RENDER_LAG's own family).
  check("hitsplat NOT yet visible at 10934", ep1(10934).hitsplat === 0, `got ${ep1(10934).hitsplat}`);
  for (const t of range(10935, 10944)) {
    check(`hitsplat visible at ${t}`, ep1(t).hitsplat > 0, `got ${ep1(t).hitsplat}`);
  }
  check("hitsplat gone by 10945", ep1(10945).hitsplat === 0, `got ${ep1(10945).hitsplat}`);

  // Onix's own x2 shake (excl. hitsplat box): RAM x2=5/0 pairs at 10936-10943 ->
  // render+2 lag puts the shifted silhouette at 10938/10939/10942/10943, PLUS an
  // extra stall tick at 10935 (the shake task's own creation-tick stall, same
  // family as the fade-out task's stall docs/battle-menu-notes.md §10 notes).
  for (const t of [10935, 10938, 10939, 10942, 10943]) {
    check(`onix silhouette shifted at ${t} (x2 shake active)`, ep1(t).onix > 0, `got ${ep1(t).onix}`);
  }
  for (const t of [10936, 10937, 10940, 10941, 10944]) {
    check(`onix silhouette at rest at ${t} (x2=0)`, ep1(t).onix === 0, `got ${ep1(t).onix}`);
  }

  check("frame 10947 byte-identical to pre-window baseline (§36's own 0-diff-at-10947 claim)", ep1(10947).total === 0, `got ${ep1(10947).total}`);

  // --- Episode 2 (target shake, RAM ticks 10957-10977), healthbox wobble + Onix flicker ---
  const ep2Base = get(10945).png;
  const ep2 = (t: number) => diffRegions(get(t).png, ep2Base);

  check("no episode-2 activity yet at 10957 (pre-render-lag)", ep2(10957).onix === 0 && ep2(10957).healthbox === 0, `got ${JSON.stringify(ep2(10957))}`);

  // Healthbox/border y2 wobble: render 10958-10977 (20 ticks, RAM+1 lag off the
  // RAM 10957-10976 alternation) — every tick in this span must differ from the
  // pre-window baseline in the healthbox region.
  for (const t of range(10958, 10977)) {
    check(`healthbox wobble active at ${t}`, ep2(t).healthbox > 0, `got ${ep2(t).healthbox}`);
  }
  check("healthbox settled by 10978", ep2(10978).healthbox === 0, `got ${ep2(10978).healthbox}`);

  // Healthbox alternation parity: same-phase ticks 4 apart must match EXACTLY
  // (both reflect the same RAM y2 sign), matching the "identical diff count"
  // shape §36 flagged (root-caused here: it's the invisible-gated onix box that
  // looks deceptively constant, NOT the healthbox, which genuinely alternates).
  check("healthbox phase-locked: diff(10958) === diff(10962)", ep2(10958).healthbox === ep2(10962).healthbox, `${ep2(10958).healthbox} vs ${ep2(10962).healthbox}`);
  check("healthbox alternates: diff(10958) !== diff(10959)", ep2(10958).healthbox !== ep2(10959).healthbox, `both ${ep2(10958).healthbox}`);

  // Onix's own sprite: NOT a positional shift (RAM x2=y2=0 throughout episode 2,
  // tools/probe/dump-endeavor-tail.py) — the only thing gating the onix bbox is
  // the independent invisible-flicker, three 4-tick blocks at render
  // 10959-10962/10967-10970/10975-10978 (RAM+1 lag off RAM 10958-61/66-69/74-77).
  const invisibleBlocks = [range(10959, 10962), range(10967, 10970), range(10975, 10978)];
  for (const block of invisibleBlocks) {
    for (const t of block) check(`onix hidden (flicker) at ${t}`, ep2(t).onix > 0, `got ${ep2(t).onix}`);
  }
  for (const t of [10963, 10964, 10965, 10966, 10971, 10972, 10973, 10974]) {
    check(`onix visible (between flicker blocks) at ${t}`, ep2(t).onix === 0, `got ${ep2(t).onix}`);
  }
  // The three invisible blocks are pixel-identical to each other (same erasure,
  // no residual y2 dependence) — confirms the onix bbox is gated by visibility
  // alone, not by the healthbox's own y2 parity.
  check("flicker erasure identical across all 3 blocks", ep2(10959).onix === ep2(10967).onix && ep2(10967).onix === ep2(10975).onix, `${ep2(10959).onix}, ${ep2(10967).onix}, ${ep2(10975).onix}`);

  // (`.other` stays nonzero here — Pidgeotto's own still-unmodeled animation
  // loop, rung (c2)'s territory, keeps churning throughout; out of scope.)
  check(
    "episode 2 (onix+healthbox) fully settled by 10979",
    ep2(10979).onix === 0 && ep2(10979).healthbox === 0,
    `got onix=${ep2(10979).onix} healthbox=${ep2(10979).healthbox}`,
  );

  // --- HP-drain / message-box transition boundary (C4 territory, partial) ---
  const msgBase = get(10999).png;
  const msg = (t: number) => diffRegions(get(t).png, msgBase);
  for (const t of [11000, 11001, 11002, 11003, 11004]) {
    check(`still static pre-message at ${t}`, msg(t).other === 0, `got ${msg(t).other}`);
  }
  check("message-box transition begins at 11005 (not 11004 or 11006)", msg(11004).other === 0 && msg(11005).other > 0, `10999-11004 flat=${msg(11004).other===0}, 11005 diff=${msg(11005).other}`);

  // --- §1 (2026-07-21 addendum): HP-drain per-tick displayed HP + bar band,
  // RAM tick == render tick directly (same "no extra lag" family as
  // endeavorOnixHp), using composePlayerHealthboxHpOverlay (already-proven,
  // unmodified code) as the candidate generator. ---
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
  const hpBaseRgba = PNG.sync.read(get(10985).png).data as unknown as Buffer;
  const HP_TABLE: [tick: number, hp: number][] = [
    [10992, 31],
    [10993, 30],
    [10994, 29],
    [10995, 28],
    [10996, 27],
    [10997, 26],
    [10998, 25],
    [10999, 24],
    [11000, 24],
    [11002, 24],
  ];
  for (const [t, hp] of HP_TABLE) {
    const actual = PNG.sync.read(get(t).png).data as unknown as Buffer;
    const expected = buildHpExpected(hpBaseRgba, hp);
    const mismatch = diffInBox(actual, expected, HB);
    check(`HP drain: render ${t} shows hp=${hp} exactly (composePlayerHealthboxHpOverlay)`, mismatch === 0, `mismatch=${mismatch}`);
  }
  check("HP drain: band flips yellow->red exactly at hp=24 (9px)", pickHpBarBand(calcBarFilledPixels(24 / ONIX_MAX_HP).filledPixels) === "red" && pickHpBarBand(calcBarFilledPixels(25 / ONIX_MAX_HP).filledPixels) === "yellow", "calcBarFilledPixels/pickHpBarBand mismatch");

  // --- §2 (2026-07-21 addendum): message text is a SINGLE line (correcting
  // turn9-notes.md §5's "It's not\nvery effective.." two-line transcription),
  // 1 char/tick from render 11005, fully revealed at render 11028. ---
  const font = fontNormalData as unknown as FontData;
  const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
  const battleWindow = battleWindowAsset as { tileset: unknown; tilemap: { entries: ({ tile: number; palette: number; hFlip: boolean; vFlip: boolean } | null)[]; width: number }; palette: { r: number; g: number; b: number }[][] };
  const MESSAGE_PALETTE = battleWindow.palette[0]!;
  const MESSAGE_TEXT_COLORS = { fg: 1, bg: 15, shadow: 6 };
  const LINE1_ORIGIN = { x: 16, y: 121 };
  const NOT_VERY_EFFECTIVE_LINE = "It’s not very effective…";
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
  function buildTextExpected(chars: number): Buffer {
    const fb = Buffer.alloc(240 * 160 * 4);
    drawTileBg(fb);
    if (chars > 0) {
      const l1 = NOT_VERY_EFFECTIVE_LINE.slice(0, Math.min(chars, NOT_VERY_EFFECTIVE_LINE.length));
      drawText(fb as unknown as Uint8Array, font, charmap, l1, LINE1_ORIGIN.x, LINE1_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
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
  const TEXT_TABLE: [tick: number, chars: number][] = [
    [11005, 1],
    [11010, 6],
    [11014, 10],
    [11020, 16],
    [11027, 23],
    [11028, 24],
    [11032, 24],
  ];
  for (const [t, chars] of TEXT_TABLE) {
    const actual = PNG.sync.read(get(t).png).data as unknown as Buffer;
    const expected = buildTextExpected(chars);
    const mismatch = diffBoxRegion(actual, expected);
    check(`message text: render ${t} shows ${chars}/24 chars of the SINGLE-line "It’s not very effective…" exactly`, mismatch === 0, `mismatch=${mismatch}`);
  }
  // The single-line correction itself: line-2's row band (y:137-151) must
  // show pure background at every text-reveal tick, since the (wrong) doc
  // claim would have put line2 content there by ~11014.
  {
    const bgSample = PNG.sync.read(get(11004).png).data;
    const bgIdx = (137 * 240 + 20) * 4;
    const bgColor = [bgSample[bgIdx], bgSample[bgIdx + 1], bgSample[bgIdx + 2]];
    let line2HasInk = false;
    for (const t of [11014, 11020, 11028]) {
      const png = PNG.sync.read(get(t).png).data;
      for (let y = 137; y < 152 && !line2HasInk; y++) {
        for (let x = 10; x < 230; x++) {
          const i = (y * 240 + x) * 4;
          if (png[i] !== bgColor[0] || png[i + 1] !== bgColor[1] || png[i + 2] !== bgColor[2]) {
            line2HasInk = true;
            break;
          }
        }
      }
    }
    check("message text is SINGLE-line: line-2 row band never gets ink (corrects turn9-notes.md §5)", !line2HasInk, `line2HasInk=${line2HasInk}`);
  }

  // --- §3 (2026-07-21 addendum): settled hold is flat (no periodic content),
  // sha-identical 11028-11109; transition to ROCK_SLIDE kickoff begins 11110.
  // Corrects turn9-notes.md §5's "11018" hold-start claim (still mid-typing). ---
  const holdSha = get(11028).sha256;
  check("settled hold: render 11018 is still mid-typing, NOT yet the held sha (corrects turn9-notes.md §5)", get(11018).sha256 !== holdSha, `11018 sha ${get(11018).sha256.slice(0, 12)} unexpectedly matches hold`);
  for (const t of [11060, 11109]) {
    check(`settled hold: render ${t} byte-identical to render 11028 (flat, no periodic content)`, get(t).sha256 === holdSha, `11028=${holdSha.slice(0, 12)}, ${t}=${get(t).sha256.slice(0, 12)}`);
  }
  check("settled hold ends: render 11110 differs from the held sha (ROCK_SLIDE-kickoff transition begins)", get(11110).sha256 !== holdSha, `got ${get(11110).sha256.slice(0, 12)}`);

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
