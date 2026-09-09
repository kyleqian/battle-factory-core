// Reproducible dev-time extraction for MOVE_SPIDER_WEB's two owned sheets.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/spider-web.json");

function extract(relativePath: string) {
  const image = decodeIndexedPng(join(ref, relativePath));
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

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    spiderWeb: "graphics/battle_anims/sprites/spider_web.png; gSpiderWebSpriteTemplate; ANIM_TAG_SPIDER_WEB",
    webThread: "graphics/battle_anims/sprites/web_thread.png; gWebThreadSpriteTemplate; ANIM_TAG_WEB_THREAD",
  },
  spiderWeb: extract("graphics/battle_anims/sprites/spider_web.png"),
  webThread: extract("graphics/battle_anims/sprites/web_thread.png"),
})}\n`);
console.log(`wrote ${out}`);
