// Reproducible source extraction for the WATER_ORB component checkpoint.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/water-orb.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  const palette = palettePath?.endsWith(".png")
    ? decodeIndexedPng(join(ref, palettePath)).palette
    : palettePath
      ? loadJascPal(join(ref, palettePath))
      : image.palette;
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette,
  };
}

function mon(name: string, side: "back" | "front") {
  return sprite(
    `graphics/pokemon/${name}/${side === "back" ? "back" : "anim_front"}.png`,
    `graphics/pokemon/${name}/normal.pal`,
  );
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    waterOrb:
      "graphics/battle_anims/sprites/water_orb.png + water_impact palette; ANIM_TAG_WATER_ORB",
    waterImpact:
      "graphics/battle_anims/sprites/water_impact.png; reused exact ANIM_TAG_WATER_IMPACT",
    masquerain:
      "FRONTIER_MON_MASQUERAIN_2 set 303; lowest Level-50 Hydro Pump carrier",
    wailmer:
      "FRONTIER_MON_WAILMER_1 set 170; lowest Level-50 Whirlpool carrier",
  },
  waterOrb: sprite(
    "graphics/battle_anims/sprites/water_orb.png",
    "graphics/battle_anims/sprites/water_impact.png",
  ),
  waterImpact: sprite("graphics/battle_anims/sprites/water_impact.png"),
  masquerainBack: mon("masquerain", "back"),
  masquerainFront: mon("masquerain", "front"),
  wailmerBack: mon("wailmer", "back"),
  wailmerFront: mon("wailmer", "front"),
})}\n`);
console.log(`wrote ${out}`);
