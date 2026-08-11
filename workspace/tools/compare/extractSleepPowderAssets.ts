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
  : join(root, "src/animation/assets/sleepPowder.json");
const powder = sliceTiles(decodeIndexedPng(
  join(ref, "graphics/battle_anims/sprites/poison_powder.png"),
));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier: "FRONTIER_MON_VENOMOTH_1 set 226 is the lowest Level-50 carrier; staged Scene-ON evidence uses legal SPECIES_HOPPIP 187; MOVE_SLEEP_POWDER 79",
    powder: "graphics/battle_anims/sprites/poison_powder.png; ANIM_TAG_SLEEP_POWDER",
    palette: "graphics/battle_anims/sprites/sleep_powder.pal; gBattleAnimSpritePal_SleepPowder",
  },
  powder: {
    tileset: {
      columns: powder.columns,
      rows: powder.rows,
      tiles: powder.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(
      ref, "graphics/battle_anims/sprites/sleep_powder.pal",
    )),
  },
})}\n`);
console.log(`wrote ${out}`);
