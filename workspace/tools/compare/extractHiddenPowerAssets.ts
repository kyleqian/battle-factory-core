// Reproducible dev-time extraction for MOVE_HIDDEN_POWER's RED_ORB art.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/hidden-power-red-orb.json");
const image = decodeIndexedPng(join(
  root,
  "reference/pokeemerald/graphics/battle_anims/sprites/red_orb.png",
));
const sliced = sliceTiles(image);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/red_orb.png",
    graphics: { symbol: "gBattleAnimSpriteGfx_RedOrb", bytes: 0x80 },
    palette: "gBattleAnimSpritePal_RedOrb",
    tag: { name: "ANIM_TAG_RED_ORB", value: 10217 },
  },
  tileset: {
    columns: sliced.columns,
    rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]),
  },
  palette: image.palette,
})}\n`);
console.log(`wrote ${out}`);
