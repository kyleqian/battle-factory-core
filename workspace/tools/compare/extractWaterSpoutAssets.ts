import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const outIndex = process.argv.indexOf("--out");
const output = outIndex >= 0 ? process.argv[outIndex + 1] : "src/animation/assets/water-spout-glowy-blue-orb.json";
if (!output) throw new Error("--out requires a path");
const artPath = resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites/glowy_red_orb.png");
const image = decodeIndexedPng(artPath);
const tiles = sliceTiles(image);
const palette = loadJascPal(resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites/glowy_blue_orb.pal"));
writeFileSync(resolve(root, output), `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/glowy_red_orb.png",
    palette: "graphics/battle_anims/sprites/glowy_blue_orb.pal",
    tag: { name: "ANIM_TAG_GLOWY_BLUE_ORB", value: 10268 },
    graphics: { symbol: "gBattleAnimSpriteGfx_GlowyRedOrb", bytes: 0x20 },
    paletteSymbol: "gBattleAnimSpritePal_GlowyBlueOrb",
    template: "gSmallWaterOrbSpriteTemplate / affine-off ObjNormal 8x8",
    waterImpactReuse: "src/animation/assets/water-gun.json#waterImpact / ANIM_TAG_WATER_IMPACT 10148",
  },
  tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
  palette,
})}\n`);
