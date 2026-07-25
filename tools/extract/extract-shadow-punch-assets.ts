// MOVE_SHADOW_PUNCH's own new BG asset: `fadetobg BG_GHOST` (src/data/
// battle_anim.h:1600, gBattleAnimBgImage_Ghost/gBattleAnimBgPalette_Ghost/
// gBattleAnimBgTilemap_Ghost, src/graphics.c:1043-1045). Unlike MOVE_
// EXTREME_SPEED's BG_HIGHSPEED_{PLAYER,OPPONENT} (two side-selected
// tilemaps over one tileset), BG_GHOST has exactly one tilemap - Cmd_
// fadetobg/LoadMoveBg don't select by side for this bg id.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap } from "./tilemap.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const ref = join(root, "reference", "pokeemerald", "graphics", "battle_anims", "backgrounds");
const out = join(root, "src", "assets", "gen", "battle-anim-ghost-bg.json");

const image = decodeIndexedPng(join(ref, "ghost.png"));
const sliced = sliceTiles(image);
const tilemap = parseTilemap(readFileSync(join(ref, "ghost.bin")), 32, 32);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "Move_SHADOW_PUNCH -> BG_GHOST (src/data/battle_anim.h:1600, src/graphics.c:1043-1045)",
  tileset: {
    columns: sliced.columns,
    rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]),
  },
  palette: image.palette,
  tilemap,
})}\n`);
console.log(`wrote ${out}`);
