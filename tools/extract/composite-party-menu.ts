// Composite verification: assembles turn 15's forced-switch party-select
// screen from the extracted assets alone and diffs pixel-for-pixel against
// a FRESH, independent oracle round trip (docs/party-menu-notes.md §4).
//
// Five composites:
//   1. "list, cursor on ONIX"   - decomposition: harvested chrome base
//      (src/assets/gen/party-menu-chrome.json) with ALL THREE icons
//      (ONIX/MAGBY/BAYLEEF) overwritten from src/assets/gen/party-mon-
//      icons.json at their own derived anchor+hop position - this only
//      passes if icon extraction+placement+the selected-icon hop model is
//      itself pixel-exact, not merely because the chrome already had the
//      right pixels underneath.
//   2. "list, cursor on MAGBY" and 3. "submenu" - the harvested chrome frame
//      used as-is: round-trip stability checks (these exact ticks are
//      hardware-reproducible, not a one-off transient).
//   4. "list, cursor on ONIX, mid-hop" and 5. "list, cursor on MAGBY,
//      mid-hop" - NEW this session: same decomposition idea as (1) but at
//      the OTHER half of the selected icon's bounce cycle (y2=+1 instead of
//      -3), proving the hop model generalizes off the original harvest tick
//      rather than being curve-fit to it.
//
// The selected icon's vertical "hop" (SpriteCB_BouncePartyMonIcon,
// party_menu.c:4003-4014) is modeled here (see HOP_MODEL below) - RAM-
// derived this session via tools/probe/dump-party-icon-bounce.py, see
// docs/party-menu-notes.md's newest section for the full derivation.
//
// Usage: node --experimental-strip-types tools/extract/composite-party-menu.ts
import { readFileSync, writeFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import chromeAsset from "../../src/assets/gen/party-menu-chrome.json" with { type: "json" };
import iconAsset from "../../src/assets/gen/party-mon-icons.json" with { type: "json" };
import statusOverlayAsset from "../../src/assets/gen/party-menu-status-overlay.json" with { type: "json" };
import magbyStatusOverlayAsset from "../../src/assets/gen/party-menu-status-overlay-magby.json" with { type: "json" };

type ChromeFrame = { tick: number; width: number; height: number; palette: number[]; indices: string };
const chrome = chromeAsset as unknown as Record<string, ChromeFrame>;

function chromePixels(frame: ChromeFrame): number[] {
  const indices = Buffer.from(frame.indices, "base64");
  const pixels: number[] = new Array(indices.length * 3);
  for (let p = 0, o = 0; p < indices.length; p += 1, o += 3) {
    const c = indices[p]! * 3;
    pixels[o] = frame.palette[c]!; pixels[o + 1] = frame.palette[c + 1]!; pixels[o + 2] = frame.palette[c + 2]!;
  }
  return pixels;
}

type Tileset = { columns: number; rows: number; tiles: number[][] };
type IconAsset = { frame0: Tileset; frame1: Tileset; palette: { r: number; g: number; b: number }[] };
const icons = iconAsset as unknown as Record<string, IconAsset>;
const statusOverlay = statusOverlayAsset as { x: number; y: number; width: number; height: number; pixels: number[] };
const magbyStatusOverlay = magbyStatusOverlayAsset as typeof statusOverlay;

function pasteStatusOverlay(fb: number[], topOverlay = statusOverlay): void {
  // Party layout keeps the ailment tile adjacent to the wide row's upper
  // right edge; the same OBJ tile also covers the lower icon-corner pixels
  // in this capture's subsprite arrangement.
  for (const [baseY, overlay] of [[24, topOverlay], [statusOverlay.y, statusOverlay]] as const) {
  for (let y = 0; y < statusOverlay.height; y += 1) for (let x = 0; x < statusOverlay.width; x += 1) {
    const src = (y * overlay.width + x) * 4;
    if (overlay.pixels[src + 3] === 0) continue;
    const dst = ((baseY + y) * 240 + overlay.x + x) * 3;
    fb[dst] = overlay.pixels[src]!;
    fb[dst + 1] = overlay.pixels[src + 1]!;
    fb[dst + 2] = overlay.pixels[src + 2]!;
  }
  }
}

// Each icon sprite's BASE (x, y) is its OAM *center* coordinate (confirmed
// this session via tools/probe/dump-party-icon-bounce.py - a 32x32 icon's
// top-left screen pixel is (baseX + x2 - 16, baseY + y2 - 16)). x2/y2 are
// the per-tick offsets `AnimateSelectedPartyIcon`/`SpriteCB_
// BouncePartyMonIcon` (party_menu.c:3978-4014) apply; see docs/party-menu-
// notes.md for the full derivation and the deselected-icon fixed-offset
// values baked into these bases.
const ICON_BASE: Record<string, { x: number; y: number }> = {
  ONIX: { x: 16, y: 40 },
  MAGBY: { x: 104, y: 18 },
  BAYLEEF: { x: 104, y: 42 },
};

// Per-species deselected-icon FIXED offset (AnimateSelectedPartyIcon,
// animNum param 0): box1 ("current"/big slot, sprite x==16) gets a fixed
// y2=-4; every other box (sprite x!=16) gets a fixed x2=-4. Both are
// permanent (no further animation) once deselected - RAM-confirmed stable
// across the whole probed window for BAYLEEF (never selected this turn)
// and for ONIX after its own deselect at tick 20191.
const DESELECTED_OFFSET: Record<string, { x2: number; y2: number }> = {
  ONIX: { x2: 0, y2: -4 },
  MAGBY: { x2: -4, y2: 0 },
  BAYLEEF: { x2: -4, y2: 0 },
};

// The selected icon's own hop: x2 is fixed at 0 (no horizontal movement);
// y2 alternates -3/+1 in sync with UpdateMonIconFrame's frame-advance
// events (pokemon_icon.c:1230-1264). RAM-confirmed period per animNum N
// (speed table, party-menu-icon-animation.json): hold(-3) = D_N+1 ticks,
// hold(+1) = D_N+2 ticks, full period = 2*D_N+3 - the asymmetry comes from
// sMonIconAnims's trailing JUMP(0) command, which silently re-arms the
// cycle one tick before the next visible frame copy without itself
// touching y2.
function selectedY2(phase: "minus3" | "plus1"): number {
  return phase === "minus3" ? -3 : 1;
}

interface IconPlacement {
  species: string;
  frame: 0 | 1;
  selected: boolean;
  phase?: "minus3" | "plus1";
}

function pasteIcon(fb: number[], fbWidth: number, fbHeight: number, placement: IconPlacement): void {
  const { species, frame } = placement;
  const base = ICON_BASE[species]!;
  const offset = placement.selected ? { x2: 0, y2: selectedY2(placement.phase!) } : DESELECTED_OFFSET[species]!;
  const ox = base.x + offset.x2 - 16;
  const oy = base.y + offset.y2 - 16;
  const ts = frame === 0 ? icons[species]!.frame0 : icons[species]!.frame1;
  const palette = icons[species]!.palette;
  pasteTileset(fb, fbWidth, fbHeight, ts, palette, ox, oy);
}

function pasteTileset(fb: number[], fbWidth: number, fbHeight: number, ts: Tileset, palette: { r: number; g: number; b: number }[], ox: number, oy: number): void {
  for (let ty = 0; ty < ts.rows; ty += 1) {
    for (let tx = 0; tx < ts.columns; tx += 1) {
      const tile = ts.tiles[ty * ts.columns + tx]!;
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const idx = tile[y * 8 + x]!;
          if (idx === 0) continue; // transparent - leave the chrome base pixel as-is
          const px = ox + tx * 8 + x;
          const py = oy + ty * 8 + y;
          if (px < 0 || py < 0 || px >= fbWidth || py >= fbHeight) continue;
          const c = palette[idx]!;
          const o = (py * fbWidth + px) * 3;
          fb[o] = c.r; fb[o + 1] = c.g; fb[o + 2] = c.b;
        }
      }
    }
  }
}

function diffCount(a: number[], b: Buffer, width: number, height: number): { count: number; bbox: [number, number, number, number] | null } {
  let count = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      const j = (y * width + x) * 4;
      if (a[i] !== b[j] || a[i + 1] !== b[j + 1] || a[i + 2] !== b[j + 2]) {
        count += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { count, bbox: count > 0 ? [minX, minY, maxX, maxY] : null };
}

async function main() {
  const trace = JSON.parse(readFileSync("tools/compare/traces-groundtruth/battle1-turn15-dense.json", "utf8")) as Trace;
  const ticks = {
    listOnix: chrome.listOnix!.tick,
    listMagby: chrome.listMagby!.tick,
    submenu: chrome.submenu!.tick,
    listOnixMidHop: chrome.listOnixMidHop!.tick,
    listMagbyMidHop: chrome.listMagbyMidHop!.tick,
  };
  trace.captureFrames = Object.values(ticks);
  console.log(`Fresh independent oracle round trip over ticks ${Object.values(ticks).join(", ")}...`);
  const result = await runOracleTrace(trace);
  const byTick = new Map(result.captures.map((c) => [c.frame, c]));
  const need = (t: number) => {
    const c = byTick.get(t);
    if (!c) throw new Error(`oracle didn't capture tick ${t}`);
    return c;
  };

  let failures = 0;
  function report(label: string, composite: number[], tick: number, totalPx: number) {
    const fresh = need(tick).rgba;
    const { count, bbox } = diffCount(composite, fresh, 240, 160);
    if (count === 0) {
      console.log(`PASS  ${label} (tick ${tick}): 0/${totalPx} px diff`);
    } else {
      failures += 1;
      console.log(`FAIL  ${label} (tick ${tick}): ${count}/${totalPx} px diff, bbox=${JSON.stringify(bbox)}`);
    }
  }

  // 1. "list, cursor on ONIX" (tick 20070): ONIX selected/phase -3,
  // MAGBY+BAYLEEF deselected/frame0 (RAM-confirmed, docs/party-menu-notes.md).
  {
    const fb = chromePixels(chrome.listOnix!);
    pasteIcon(fb, 240, 160, { species: "ONIX", frame: 0, selected: true, phase: "minus3" });
    pasteIcon(fb, 240, 160, { species: "MAGBY", frame: 0, selected: false });
    pasteIcon(fb, 240, 160, { species: "BAYLEEF", frame: 0, selected: false });
    pasteStatusOverlay(fb);
    report("list, cursor on ONIX (chrome + all 3 icons decomposed, selected hop phase -3)", fb, ticks.listOnix, 38400);
  }

  // 4. mid-hop: same screen, ONIX selected/phase +1 (tick 20150, RAM-confirmed).
  // MAGBY/BAYLEEF have independently advanced to frame1 by this tick.
  {
    const fb = chromePixels(chrome.listOnixMidHop!);
    pasteIcon(fb, 240, 160, { species: "ONIX", frame: 0, selected: true, phase: "plus1" });
    pasteIcon(fb, 240, 160, { species: "MAGBY", frame: 1, selected: false });
    pasteIcon(fb, 240, 160, { species: "BAYLEEF", frame: 1, selected: false });
    pasteStatusOverlay(fb);
    report("list, cursor on ONIX, MID-HOP (selected hop phase +1, off-sample tick)", fb, ticks.listOnixMidHop, 38400);
  }

  // 2. "list, cursor on MAGBY" (tick 20206): MAGBY selected/phase -3,
  // ONIX deselected (fixed y2=-4), BAYLEEF deselected/frame0.
  {
    const fb = chromePixels(chrome.listMagby!);
    pasteIcon(fb, 240, 160, { species: "ONIX", frame: 0, selected: false });
    pasteIcon(fb, 240, 160, { species: "MAGBY", frame: 0, selected: true, phase: "minus3" });
    pasteIcon(fb, 240, 160, { species: "BAYLEEF", frame: 0, selected: false });
    pasteStatusOverlay(fb);
    report("list, cursor on MAGBY (chrome + all 3 icons decomposed, selected hop phase -3)", fb, ticks.listMagby, 38400);
  }

  // 5. mid-hop: same screen, MAGBY selected/phase +1 (tick 20215, RAM-confirmed).
  {
    const fb = chromePixels(chrome.listMagbyMidHop!);
    pasteIcon(fb, 240, 160, { species: "ONIX", frame: 0, selected: false });
    pasteIcon(fb, 240, 160, { species: "MAGBY", frame: 1, selected: true, phase: "plus1" });
    pasteIcon(fb, 240, 160, { species: "BAYLEEF", frame: 1, selected: false });
    pasteStatusOverlay(fb, magbyStatusOverlay);
    report("list, cursor on MAGBY, MID-HOP (selected hop phase +1, off-sample tick)", fb, ticks.listMagbyMidHop, 38400);
  }

  report("submenu SEND OUT/SUMMARY/CANCEL (harvested chrome, round-trip check)", chromePixels(chrome.submenu!), ticks.submenu, 38400);

  console.log(`\n${failures === 0 ? "ALL COMPOSITES PASSED" : `${failures} COMPOSITE(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
