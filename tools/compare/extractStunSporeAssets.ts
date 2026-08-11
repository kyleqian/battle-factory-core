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
  : join(root, "src/animation/assets/stunSpore.json");

const image = decodeIndexedPng(
  join(ref, "graphics/battle_anims/sprites/poison_powder.png"),
);
const powder = sliceTiles(image);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_PARASECT_2 set 282; SPECIES_HOPPIP 187; MOVE_STUN_SPORE 78; Scene-ON",
    powder:
      "graphics/battle_anims/sprites/poison_powder.png; ANIM_TAG_STUN_SPORE",
    palette:
      "graphics/battle_anims/sprites/stun_spore.pal; gBattleAnimSpritePal_StunSpore",
  },
  powder: {
    tileset: {
      columns: powder.columns,
      rows: powder.rows,
      tiles: powder.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(
      join(ref, "graphics/battle_anims/sprites/stun_spore.pal"),
    ),
  },
})}\n`);
console.log(`wrote ${out}`);
