// Dev-time extractor: the nine window-frame tiles + palette that
// LoadBattleMenuWindowGfx (battle_bg.c:744-748) loads at BG0 tiles 0x22-0x2A /
// BG_PLTT_ID(1) via LoadUserWindowBorderGfx (default optionsWindowFrameType 0
// = gTextWindowFrame1, graphics/text_window/1.png), as drawn by
// HandleBattleWindow for the RUN forfeit yes/no box (frf250a).
// Run with: node --experimental-strip-types tools/extract/extract-battle-yesno-frame.ts
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const img = decodeIndexedPng(join(RUN_ROOT, "reference", "pokeemerald", "graphics", "text_window", "1.png"));
const { columns, rows, tiles } = sliceTiles(img);
if (columns !== 3 || rows !== 3) throw new Error(`expected a 3x3 frame, got ${columns}x${rows}`);
const out = join(RUN_ROOT, "src", "assets", "gen", "battle-yesno-frame.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({ tiles: tiles.map((t) => [...t.pixels]), palette: img.palette })}\n`);
console.log(`wrote ${out}`);
