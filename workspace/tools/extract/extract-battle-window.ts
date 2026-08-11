// Dev-time extractor: reads reference/pokeemerald's battle text-window frame
// art and the first action menu's window geometry
// (docs/battle-bringup-notes.md S3 "First action menu geometry").
// LoadBattleTextboxAndBackground (src/battle_bg.c:859-865) loads
// gBattleTextboxTiles/_Tilemap/_Palette onto bg0 - the border/frame all of
// bg0's text windows (message box, action prompt, action menu) are drawn
// against. Palette source note: the real ROM loads a raw-binary
// textbox.gbapal, but the checked-in graphics/ dir also carries a JASC-text
// sibling pair (textbox_0.pal + textbox_1.pal, 16 colors each) that is this
// project's normal decode path (loadJascPal) for the identical 32 colors
// (2 * PLTT_SIZE_4BPP, battle_bg.c:864) - used here instead of adding a new
// raw .gbapal binary parser for one file.
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-window.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap } from "./tilemap.ts";
import { loadJascPal } from "./jascPal.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");
const BATTLE_INTERFACE = join(REF, "graphics", "battle_interface");

mkdirSync(ASSETS_GEN, { recursive: true });
mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

// --- Battle textbox frame (gBattleTextboxTiles/_Tilemap/_Palette) -----------
{
  const img = decodeIndexedPng(join(BATTLE_INTERFACE, "textbox.png"));
  const { columns, rows, tiles } = sliceTiles(img);
  const mapBuf = readFileSync(join(BATTLE_INTERFACE, "textbox_map.bin"));
  // bg0's template (gBattleBgTemplates[0], battle_bg.c:123-131) is
  // screenSize=2 (32 tiles wide x 64 tall), NOT screenSize=1 - confirmed
  // against the oracle the same way extract-battle-bg.ts's static tilemap
  // was (a naive 64x32 read of this same byte count scores far worse than
  // a 32x64 read against a live frame's window-border tiles).
  const tilemap = parseTilemap(mapBuf, 32, 64);
  const pal0 = loadJascPal(join(BATTLE_INTERFACE, "textbox_0.pal"));
  const pal1 = loadJascPal(join(BATTLE_INTERFACE, "textbox_1.pal"));
  // gBattleWindowTextPalette (graphics.c:965, from text.pal) - the glyph
  // fg/bg/shadow color palette loaded at BG_PLTT_ID(5), what B_WIN_ACTION_MENU's
  // fgColor=13/bgColor=14/shadowColor=15 (battle_message.c:1506-1508) index into.
  const textPal = loadJascPal(join(BATTLE_INTERFACE, "text.pal"));
  writeJson(join(ASSETS_GEN, "battle-window.json"), {
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    tilemap,
    palette: [pal0, pal1],
    textPalette: textPal,
  });
}

// --- First action menu window geometry (sStandardBattleWindowTemplates) ----
// Parsed straight from source rather than hand-copied from the dossier, to
// independently re-verify it.
{
  const bgC = readFileSync(join(REF, "src", "battle_bg.c"), "utf8");
  const tableMatch = /static const struct WindowTemplate sStandardBattleWindowTemplates\[\]\s*=\s*\{(.*?)\n\};/s.exec(bgC);
  if (!tableMatch) throw new Error("could not find sStandardBattleWindowTemplates in battle_bg.c");
  const body = tableMatch[1]!;
  const entryRe = /\[(B_WIN_\w+)\]\s*=\s*\{([^}]*)\}/gs;
  const wanted = ["B_WIN_MSG", "B_WIN_ACTION_PROMPT", "B_WIN_ACTION_MENU"];
  const templates: Record<string, { bg: number; tilemapLeft: number; tilemapTop: number; width: number; height: number; paletteNum: number; baseBlock: number }> = {};
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(body))) {
    const name = m[1]!;
    if (!wanted.includes(name)) continue;
    const fields = m[2]!;
    const num = (field: string): number => {
      const fm = new RegExp(`\\.${field}\\s*=\\s*(0x[0-9a-fA-F]+|\\d+)`).exec(fields);
      if (!fm) throw new Error(`${name}: missing .${field}`);
      return Number(fm[1]);
    };
    templates[name] = {
      bg: num("bg"),
      tilemapLeft: num("tilemapLeft"),
      tilemapTop: num("tilemapTop"),
      width: num("width"),
      height: num("height"),
      paletteNum: num("paletteNum"),
      baseBlock: num("baseBlock"),
    };
  }
  for (const name of wanted) {
    if (!templates[name]) throw new Error(`sStandardBattleWindowTemplates missing ${name}`);
  }
  writeJson(join(DATA_GEN, "battle-window-templates.json"), templates);
}
