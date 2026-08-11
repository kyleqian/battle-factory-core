// ISSUES #80 settled-band pixel-forensics probe: `party-menu-status-item-off`
// frames across the 2050-2300 band (bbox 2,11-162,55, ~757/803 px/frame).
//
// Re-measures the two named residual classes (mon-icon ~525px + box-edge/text
// ~210px, ISSUES #80) and attributes every diff pixel to a named class:
//   per-slot menu Pokéball sprites (missing in app), the icon itself (match),
//   gender glyphs (oracle female slots 0/2 vs app male), the slot-2 level line
//   ("Lv50" glyph shape), held-item sprites, status icons.
//
// Usage: node --experimental-strip-types tools/probe/party-band-forensics.ts
//        <outDir> [frame ...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { PNG } from "pngjs";
const require = createRequire(import.meta.url);

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node tools/probe/party-band-forensics.ts <outDir> [frame ...]");
  process.exit(1);
}
const frames = (process.argv.slice(3).length ? process.argv.slice(3) : ["2060", "2150", "2280"]).map(Number);

const load = (f: number, side: string) =>
  PNG.sync.read(readFileSync(join(outDir, `${side}-${String(f).padStart(5, "0")}.png`))).data;
const key = (d: Uint8Array, i: number) => `${d[i]},${d[i + 1]},${d[i + 2]}`;

type Box = { x0: number; x1: number; y0: number; y1: number };
const inBox = (x: number, y: number, b: Box) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

// RATTATA icon palette_2 colors (party-mon-icons.json SPECIES_RATTATA palette),
// used to tag icon pixels (the icon itself is position/frame-exact).
const ICON_COLORS = new Set([
  "99,156,132", "123,123,123", "189,189,181", "255,255,255", "115,115,206",
  "165,173,247", "181,132,90", "239,198,140", "198,173,41", "247,247,41",
  "247,99,82", "148,123,206", "198,165,206", "189,41,156", "99,99,90", "66,66,66",
]);

// Menu-pokeball sprite colors, both frames (pokeball.png frame 0 closed =
// 181,66,0/198,82,0/181,189,206/74,74,99; frame 1 open = 107,107,132/
// 247,181,123/222,231,239/41,132,206).
const BALL_COLORS = new Set([
  "181,66,0", "198,82,0", "181,189,206", "74,74,99",
  "107,107,132", "247,181,123", "222,231,239", "41,132,206",
]);

// Ball sprite footprints (32x32 sheet centered at sPartyMenuSpriteCoords
// pokeball coord: slot0 (16,34), slot1 (102,25), slot2 (102,49)).
const BALL_BOXES = [
  { slot: 0, x0: 0, x1: 32, y0: 18, y1: 49 },
  { slot: 1, x0: 86, x1: 118, y0: 9, y1: 40 },
  { slot: 2, x0: 86, x1: 118, y0: 33, y1: 64 },
] as const;

// Gender glyph footprints: slot0 (72,48), slot1 (158,24), slot2 (158,48) for
// an 5-wide 8-tall glyph (drawGenderGlyph, battlePartySelect.ts:698-709).
const GENDER_BOXES = [
  { slot: 0, x0: 70, x1: 78, y0: 46, y1: 56 },
  { slot: 1, x0: 156, x1: 164, y0: 22, y1: 32 },
  { slot: 2, x0: 156, x1: 164, y0: 46, y1: 56 },
] as const;

// Level-line text bands (PARTY_CARD_INFO level + 4 for ink): slot2 only shows
// "Lv50" here (slots 0/1 are statused).
const LEVEL_BOXES = [
  { slot: 1, x0: 118, x1: 149, y0: 22, y1: 32 },
  { slot: 2, x0: 118, x1: 149, y0: 46, y1: 56 },
] as const;

// Held-item sprite footprints: slot0 (20,50), slot1 (108,28), slot2 (108,52),
// 8x8.
const ITEM_BOXES = [
  { slot: 0, x0: 16, x1: 24, y0: 46, y1: 54 },
  { slot: 1, x0: 104, x1: 112, y0: 24, y1: 32 },
  { slot: 2, x0: 104, x1: 112, y0: 48, y1: 56 },
] as const;

// Status-icon footprints: slot0 (50,52) 32x8, slot1 (136,27), slot2 (136,51).
const STATUS_BOXES = [
  { slot: 0, x0: 34, x1: 66, y0: 48, y1: 56 },
  { slot: 1, x0: 120, x1: 152, y0: 23, y1: 31 },
  { slot: 2, x0: 120, x1: 152, y0: 47, y1: 55 },
] as const;

const FEMALE = new Set(["255,156,148", "156,66,57"]);
const MALE = new Set(["66,206,255", "0,99,148"]);
const TEXT_INK = new Set(["255,255,255", "115,115,115"]);

type Stats = { count: number; x0: number; y0: number; x1: number; y1: number };
const emptyStats = (): Stats => ({ count: 0, x0: 9999, y0: 9999, x1: -1, y1: -1 });
const add = (s: Stats, x: number, y: number) => {
  s.count++;
  if (x < s.x0) s.x0 = x; if (x > s.x1) s.x1 = x;
  if (y < s.y0) s.y0 = y; if (y > s.y1) s.y1 = y;
};

function classify(ok: string, ak: string, x: number, y: number): string {
  // 1. Per-slot menu pokeball sprites (missing in the app) -- check by color
  //    and footprint.
  if (BALL_COLORS.has(ok)) {
    for (const b of BALL_BOXES) if (inBox(x, y, b)) return `pokeball_slot${b.slot}`;
  }
  // 2. Gender glyphs -- female/male fg+shadow colors in the glyph footprint,
  //    checked on EITHER side (the app may overpaint a male glyph where the
  //    oracle has box wash, or vice versa).
  for (const b of GENDER_BOXES) {
    if (inBox(x, y, b) && (FEMALE.has(ok) || MALE.has(ok) || FEMALE.has(ak) || MALE.has(ak))) {
      return `gender_slot${b.slot}`;
    }
  }
  // 3. Level-line text ink.
  for (const b of LEVEL_BOXES) {
    if (inBox(x, y, b) && (TEXT_INK.has(ok) || TEXT_INK.has(ak))) return `leveltext_slot${b.slot}`;
  }
  // 4. Held-item sprites.
  for (const b of ITEM_BOXES) if (inBox(x, y, b)) return `helditem_slot${b.slot}`;
  // 5. Status icons.
  for (const b of STATUS_BOXES) if (inBox(x, y, b)) return `status_slot${b.slot}`;
  // 6. Icon pixels (match) -- anything in the icon footprint that is an icon
  //    color on either side, or a box-wash color where the oracle draws the
  //    ball over the box.
  if (ICON_COLORS.has(ok) || ICON_COLORS.has(ak)) return "icon_pixels";
  return "UNCLASSIFIED";
}

for (const f of frames) {
  const ora = load(f, "oracle");
  const app = load(f, "app");
  const byCls = new Map<string, Stats>();
  let total = 0;

  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4;
    const ok = key(ora, i);
    if (ok === key(app, i)) continue;
    total++;
    const cls = classify(ok, key(app, i), x, y);
    let s = byCls.get(cls);
    if (!s) { s = emptyStats(); byCls.set(cls, s); }
    add(s, x, y);
  }

  const fmt = (s: Stats | undefined) => (s && s.count ? `(${s.x0},${s.y0})-(${s.x1},${s.y1}) ${s.count}px` : "-");
  console.log(`\n=== frame ${f}: total diff ${total}px ===`);
  const sorted = [...byCls.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [cls, s] of sorted) console.log(`  ${cls.padEnd(20)} ${fmt(s)}`);
  const un = byCls.get("UNCLASSIFIED");
  console.log(`  unattributed: ${un ? un.count : 0}px`);
}
