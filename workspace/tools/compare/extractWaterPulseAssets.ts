/** Reproducible source extraction for the one Water Pulse art asset not already present. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/water-pulse.json");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const ref = join(root, "reference/pokeemerald");
const scripts = readFileSync(join(ref, "data/battle_anim_scripts.s"), "utf8");
const start = scripts.indexOf("Move_WATER_PULSE:\n");
const end = scripts.indexOf("Move_PSYCHO_BOOST:\n", start);
if (start < 0 || end < 0) throw new Error("Move_WATER_PULSE source body missing");
const body = scripts.slice(start, end);
for (const token of ["loadspritegfx ANIM_TAG_BLUE_RING_2", "gWaterPulseRingSpriteTemplate", "loadspritegfx ANIM_TAG_SMALL_BUBBLES"]) {
  if (!body.includes(token)) throw new Error(`Move_WATER_PULSE lacks ${token}`);
}
const goldRing = decodeIndexedPng(join(ref, "graphics/battle_anims/sprites/gold_ring.png"));
const tiles = sliceTiles(goldRing);
const existingSmallBubbles = readFileSync(join(root, "src/animation/assets/water-gun.json"));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    script: "data/battle_anim_scripts.s Move_WATER_PULSE",
    scriptSha256: sha(body),
    blueRing2: "graphics/battle_anims/sprites/gold_ring.png tiles + graphics/battle_anims/sprites/blue_ring_2.pal palette; gWaterPulseRingSpriteTemplate; ANIM_TAG_BLUE_RING_2",
    smallBubbles: "reused without duplication from src/animation/assets/water-gun.json; graphics/battle_anims/sprites/small_bubbles.png; ANIM_TAG_SMALL_BUBBLES",
  },
  blueRing2: {
    tag: 10288,
    tileBytes: 256,
    dimensions: { width: goldRing.width, height: goldRing.height },
    tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
    palette: loadJascPal(join(ref, "graphics/battle_anims/sprites/blue_ring_2.pal")),
  },
  reusedSmallBubbles: {
    path: "src/animation/assets/water-gun.json",
    sha256: sha(existingSmallBubbles),
  },
})}\n`);
console.log(`wrote ${out}`);
