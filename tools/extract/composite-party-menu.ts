// Composite verification: assembles turn 15's forced-switch party-select
// screen from the extracted assets alone and diffs pixel-for-pixel against
// a FRESH, independent oracle round trip (docs/party-menu-notes.md §4).
//
// Three composites:
//   1. "list, cursor on ONIX"   - genuine decomposition: takes the
//      pixel-harvested chrome base (src/assets/gen/party-menu-chrome.json)
//      and OVERWRITES the MAGBY/BAYLEEF icon bboxes with bitmaps rendered
//      from src/assets/gen/party-mon-icons.json (extracted independently
//      from reference/pokeemerald's own icon.png+embedded palette) - this
//      only passes if the icon extraction+placement is itself pixel-exact,
//      not merely because the chrome already contained the right pixels.
//   2. "list, cursor on MAGBY" and 3. "submenu" - the harvested chrome frame
//      used as-is (the selected/bouncing icon's own position-hop mechanism
//      is not independently re-derived to the pixel level this session -
//      see docs/party-menu-notes.md's own open-item note), so these two
//      verify round-trip stability against a fresh capture rather than a
//      from-parts reconstruction.
//
// Usage: node --experimental-strip-types tools/extract/composite-party-menu.ts
import { readFileSync, writeFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import chromeAsset from "../../src/assets/gen/party-menu-chrome.json" with { type: "json" };
import iconAsset from "../../src/assets/gen/party-mon-icons.json" with { type: "json" };

type ChromeFrame = { tick: number; width: number; height: number; pixels: number[] };
const chrome = chromeAsset as unknown as Record<string, ChromeFrame>;

type Tileset = { columns: number; rows: number; tiles: number[][] };
type IconAsset = { frame0: Tileset; frame1: Tileset; palette: { r: number; g: number; b: number }[] };
const icons = iconAsset as unknown as Record<string, IconAsset>;

// Empirically-derived icon anchors (top-left of the 32x32 sprite canvas
// within the 240x160 screen), pixel-confirmed this session against the
// oracle's own unselected-icon rendering (diff 2px/17px residual out of
// ~300-400 opaque pixels at tick 20070 - see docs/party-menu-notes.md §3).
const ICON_ANCHOR: Record<string, { x: number; y: number }> = {
  MAGBY: { x: 84, y: 2 },
  BAYLEEF: { x: 84, y: 26 },
};

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

function buildListOnixComposite(): number[] {
  const base = chrome.listOnix!;
  const fb = [...base.pixels];
  // Both MAGBY and BAYLEEF show frame0 at this tick (pixel-confirmed, §3).
  pasteTileset(fb, base.width, base.height, icons.MAGBY!.frame0, icons.MAGBY!.palette, ICON_ANCHOR.MAGBY!.x, ICON_ANCHOR.MAGBY!.y);
  pasteTileset(fb, base.width, base.height, icons.BAYLEEF!.frame0, icons.BAYLEEF!.palette, ICON_ANCHOR.BAYLEEF!.x, ICON_ANCHOR.BAYLEEF!.y);
  return fb;
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
  const ticks = { listOnix: chrome.listOnix!.tick, listMagby: chrome.listMagby!.tick, submenu: chrome.submenu!.tick };
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

  report("list, cursor on ONIX (chrome + reference-extracted MAGBY/BAYLEEF icons)", buildListOnixComposite(), ticks.listOnix, 38400);
  report("list, cursor on MAGBY (harvested chrome, round-trip check)", [...chrome.listMagby!.pixels], ticks.listMagby, 38400);
  report("submenu SEND OUT/SUMMARY/CANCEL (harvested chrome, round-trip check)", [...chrome.submenu!.pixels], ticks.submenu, 38400);

  console.log(`\n${failures === 0 ? "ALL COMPOSITES PASSED" : `${failures} COMPOSITE(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
