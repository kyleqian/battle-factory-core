// Source-only assets for Move_EXTREME_SPEED's side-selected high-speed
// background and gSpeedDustSpriteTemplate.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap } from "./tilemap.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const ref = join(root, "reference", "pokeemerald", "graphics", "battle_anims");
const out = join(root, "src", "assets", "gen", "battle-anim-extreme-speed.json");

function indexedAsset(path: string) {
  const image = decodeIndexedPng(path);
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  };
}

const background = indexedAsset(join(ref, "backgrounds", "highspeed.png"));
const tilemap = (name: "opponent" | "player") => {
  const parsed = parseTilemap(
    readFileSync(join(ref, "backgrounds", `highspeed_${name}.bin`)),
    32,
    32,
  );
  return {
    ...parsed,
    // LoadMoveBg installs this one 16-color palette at hardware bank 2.
    entries: parsed.entries.map((entry) => ({
      ...entry,
      palette: entry.palette === 0 ? 0 : entry.palette - 2,
    })),
  };
};
const dust = indexedAsset(join(ref, "sprites", "speed_dust.png"));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "Move_EXTREME_SPEED -> BG_HIGHSPEED_{OPPONENT,PLAYER} and ANIM_TAG_SPEED_DUST",
  background: {
    ...background,
    opponentTilemap: tilemap("opponent"),
    playerTilemap: tilemap("player"),
  },
  dust: {
    ...dust,
    frameSizeTiles: 4,
    frames: [0, 1, 2, 1, 0],
    frameDuration: 3,
    spawnOffsets: [[30, 28], [-20, 24], [16, 26], [-10, 28]],
  },
})}\n`);
console.log(`wrote ${out}`);
