/** Reproducible source extraction for MOVE_PETAL_DANCE's FLOWER sheet. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reference = join(root, "reference/pokeemerald");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/petal-dance.json");

function sprite(path: string, palettePath: string) {
  const image = decodeIndexedPng(join(reference, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(reference, palettePath)),
  };
}

function flowerSheet() {
  const big = sprite(
    "graphics/battle_anims/sprites/flower_0.png",
    "graphics/battle_anims/sprites/flower.pal",
  );
  const small = sprite(
    "graphics/battle_anims/sprites/flower_1.png",
    "graphics/battle_anims/sprites/flower.pal",
  );
  // `graphics_file_rules.mk` concatenates four 8x8 big-flower tiles followed
  // by one small-flower tile; `ANIMCMD_FRAME(4)` selects that final tile.
  return {
    tileset: {
      columns: 5,
      rows: 1,
      tiles: [...big.tileset.tiles, ...small.tileset.tiles],
    },
    palette: big.palette,
  };
}

const impactPath = join(root, "src/assets/gen/battle-anim-hitsplat.json");
const impactBytes = readFileSync(impactPath);
const impact = JSON.parse(impactBytes.toString("utf8")) as { source: string };

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    script: "data/battle_anim_scripts.s:6794-6829 Move_PETAL_DANCE",
    flower: "graphics/battle_anims/sprites/flower_{0,1}.png concatenated by graphics_file_rules.mk + flower.pal; ANIM_TAG_FLOWER",
    impact: "reused ANIM_TAG_IMPACT from src/assets/gen/battle-anim-hitsplat.json; gBasicHitSplatSpriteTemplate",
  },
  flower: flowerSheet(),
  impactReuse: {
    path: "src/assets/gen/battle-anim-hitsplat.json",
    source: impact.source,
    sha256: createHash("sha256").update(impactBytes).digest("hex"),
  },
})}\n`);
console.log(`wrote ${out}`);
