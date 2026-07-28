// Reproducible byte-preserving extraction for the ANIM_TAG_SPARK track.
// Thunder Wave also loads SPARK_H; SPARK_2 is already generated separately.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/assets/gen/battle-anim-spark.json");

const raw = (path: string) => {
  const bytes = readFileSync(join(ref, path));
  return { bytes: [...bytes], sha256: createHash("sha256").update(bytes).digest("hex") };
};
const sparkH = decodeIndexedPng(join(ref, "graphics/battle_anims/sprites/spark_h.png"));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    script: "data/battle_anim_scripts.s:1124-1144 Move_THUNDER_WAVE",
    spark: "graphics/battle_anims/sprites/spark.4bpp + spark.pal; src/graphics.c:568-569; ANIM_TAG_SPARK; 0x300 bytes",
    sparkH: "graphics/battle_anims/sprites/spark_h.png; src/graphics.c:571 and src/data/battle_anim.h:1185/1478; ANIM_TAG_SPARK_H; gThunderWaveSpriteTemplate",
    spark2: "src/assets/gen/battle-anim-spark-2.json; ANIM_TAG_SPARK_2 is already source-extracted",
  },
  spark4bpp: raw("graphics/battle_anims/sprites/spark.4bpp"),
  sparkPaletteJasc: raw("graphics/battle_anims/sprites/spark.pal"),
  sparkH: {
    width: sparkH.width, height: sparkH.height,
    indices: [...sparkH.indices], palette: sparkH.palette,
  },
  templates: {
    electricBolt: "src/battle_anim_electric.c:221-229 gElectricBoltSegmentSpriteTemplate; 8x8 non-affine",
    thunderWave: "src/battle_anim_electric.c:231-239 gThunderWaveSpriteTemplate; 32x16 non-affine",
  },
})}\n`);
console.log(`wrote ${out}`);
