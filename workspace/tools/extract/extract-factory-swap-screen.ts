// Dev-time extractor: reads reference/pokeemerald's Battle Factory swap
// screen's genuinely-new-to-swap art (battle_factory_screen.c's Swap_* half)
// and writes committed, decoded artifacts under src/assets/gen/ +
// src/data/gen/. Everything else the swap screen draws (BG1 chrome, mon-pic
// backdrop, ball/cursor sprites, menu highlight, text palette, font) is
// verbatim reuse of the draft screen's own already-extracted assets
// (extract-factory-screen.ts) - see docs/battle-turn-notes.md S17's own
// asset inventory and this session's S17 ADDENDUM 3 for the reuse proof.
// Run with:
//   node --experimental-strip-types tools/extract/extract-factory-swap-screen.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { loadJascPal } from "./jascPal.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");
const FACTORY_SCREEN_DIR = join(REF, "graphics", "battle_frontier", "factory_screen");

mkdirSync(ASSETS_GEN, { recursive: true });
mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

function tilesetOf(pngPath: string) {
  const image = decodeIndexedPng(pngPath);
  const { columns, rows, tiles } = sliceTiles(image);
  return { columns, rows, tiles: tiles.map((t) => [...t.pixels]) };
}

// --- Action buttons: the on/off-screen slide BUTTONS' gfx ------------------
// (Swap_Task_SlideButtonOnOffScreen slides these; Swap_InitAllSprites
// composes each pill button from 2-3 of these sprites; sSwap_SpriteSheets
// loads them with GFXTAG_ACTION_BOX_*/GFXTAG_ACTION_HIGHLIGHT_*.) Both
// families are drawn via sSpriteTemplate_Swap_Arrow/sSpriteTemplate_Swap_
// MenuHighlightLeft with only tileTag swapped (battle_factory_screen.c
// :3469-3502) - paletteTag stays PALTAG_INTERFACE for all of them, i.e. the
// SAME sInterface_Pal already extracted (as arrow.json/menu-highlight.json's
// `palette`) by extract-factory-screen.ts. No new palette to extract here.
{
  const interfacePal = loadJascPal(join(FACTORY_SCREEN_DIR, "interface.pal"));
  const palette = interfacePal.slice(0, 16);

  // CANCEL (2 sprites, 48px) and PKMN FOR SWAP (3 sprites, 80px, box_right
  // reused twice) are both built from just these two pieces.
  writeJson(join(ASSETS_GEN, "action-box.json"), {
    left: tilesetOf(join(FACTORY_SCREEN_DIR, "action_box_left.png")), // 16x16
    right: tilesetOf(join(FACTORY_SCREEN_DIR, "action_box_right.png")), // 32x16
    palette,
  });

  // The pressed/selected-cursor overlay for the same buttons. Not exercised
  // on-screen in any committed ground-truth trace this dossier has (S17's
  // own "not delivered" list: the CANCEL path was never navigated to) - see
  // S17 ADDENDUM 3 for why this half is decode-validated but excluded from
  // the pixel-composite byte-exact claim.
  writeJson(join(ASSETS_GEN, "action-highlight.json"), {
    left: tilesetOf(join(FACTORY_SCREEN_DIR, "action_highlight_left.png")), // 16x16
    middle: tilesetOf(join(FACTORY_SCREEN_DIR, "action_highlight_middle.png")), // 32x16
    right: tilesetOf(join(FACTORY_SCREEN_DIR, "action_highlight_right.png")), // 32x16
    palette,
  });
}

// --- Swap screen BG/window layout, parsed straight from source -------------
// (sSwap_BgTemplates/sSwap_WindowTemplates, battle_factory_screen.c
// :896-1030) - mechanically parsed rather than hand-copied, to independently
// re-verify it the same way extract-battle-window.ts does for the battle
// action-menu geometry. Diffed against the draft screen's own
// sSelect_BgTemplates/sSelect_WindowTemplates (same file, :309-406) in the
// docs addendum, not here.
{
  const src = readFileSync(join(REF, "src", "battle_factory_screen.c"), "utf8");

  // PALNUM_FADE_TEXT/PALNUM_TEXT (:47-48) - the only symbolic #defines used
  // as struct-literal field values in these two tables.
  const localDefines: Record<string, number> = {};
  for (const dm of src.matchAll(/^#define (\w+)\s+(\d+)\s*$/gm)) {
    localDefines[dm[1]!] = Number(dm[2]);
  }

  function parseStructArray(header: string): Array<Record<string, number>> {
    const re = new RegExp(`static const struct \\w+ ${header}(?:\\[\\d*\\])?\\s*=\\s*\\{(.*?)\\n\\};`, "s");
    const m = re.exec(src);
    if (!m) throw new Error(`could not find ${header} in battle_factory_screen.c`);
    const body = m[1]!;
    const entries: Array<Record<string, number>> = [];
    const entryRe = /\{([^{}]*)\}/g;
    let em: RegExpExecArray | null;
    while ((em = entryRe.exec(body))) {
      const fields: Record<string, number> = {};
      const fieldRe = /\.(\w+)\s*=\s*(0[xX][0-9a-fA-F]+|-?\d+|[A-Z_]\w*)/g;
      let fm: RegExpExecArray | null;
      while ((fm = fieldRe.exec(em[1]!))) {
        const raw = fm[2]!;
        const value = /^[A-Z_]/.test(raw) ? localDefines[raw] : Number(raw);
        if (value === undefined) throw new Error(`unresolved symbolic field value ${raw} (.${fm[1]})`);
        fields[fm[1]!] = value;
      }
      if (Object.keys(fields).length > 0) entries.push(fields);
    }
    return entries;
  }

  const bgTemplates = parseStructArray("sSwap_BgTemplates\\[4\\]");
  const windowNamesMatch = /enum \{\s*(SWAP_WIN_TITLE.*?)\n\};/s.exec(src);
  if (!windowNamesMatch) throw new Error("could not find the SWAP_WIN_* enum in battle_factory_screen.c");
  const windowNames = [...windowNamesMatch[1]!.matchAll(/SWAP_WIN_\w+/g)].map((m) => m[0]);
  const windowEntries = parseStructArray("sSwap_WindowTemplates\\[\\]");
  if (windowEntries.length !== windowNames.length) {
    throw new Error(`parsed ${windowEntries.length} window templates but ${windowNames.length} SWAP_WIN_* names`);
  }
  const windowTemplates: Record<string, Record<string, number>> = {};
  windowNames.forEach((name, i) => {
    windowTemplates[name] = windowEntries[i]!;
  });

  // sSwapMenuOptionsTextColors / sSwapSpeciesNameTextColors (:1035-1036) -
  // byte-for-byte identical to the draft screen's own sMenuOptionTextColors/
  // sSpeciesNameTextColors (:409-410, already hardcoded into
  // factoryDraftScreen.ts's MENU_TEXT_COLORS/SPECIES_TEXT_COLORS), so no new
  // color mapping is needed - recorded here anyway for completeness.
  const menuColorsMatch = /sSwapMenuOptionsTextColors\[\]\s*=\s*\{([^}]*)\}/.exec(src);
  const speciesColorsMatch = /sSwapSpeciesNameTextColors\[\]\s*=\s*\{([^}]*)\}/.exec(src);
  if (!menuColorsMatch || !speciesColorsMatch) throw new Error("could not find Swap text color arrays");
  const TEXT_COLOR = { TEXT_COLOR_TRANSPARENT: 0, TEXT_COLOR_WHITE: 1, TEXT_COLOR_DARK_GRAY: 2, TEXT_COLOR_LIGHT_GRAY: 3, TEXT_COLOR_RED: 4, TEXT_COLOR_GREEN: 5, TEXT_COLOR_BLUE: 6 } as Record<string, number>;
  const parseColorList = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean).map((t) => TEXT_COLOR[t] ?? Number(t));

  writeJson(join(DATA_GEN, "swap-screen-windows.json"), {
    bgTemplates,
    windowTemplates,
    menuOptionsTextColors: parseColorList(menuColorsMatch[1]!),
    speciesNameTextColors: parseColorList(speciesColorsMatch[1]!),
  });
}

console.log("extraction complete");
