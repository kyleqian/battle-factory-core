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
  : join(root, "src/animation/assets/fake-tears.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_DELCATTY_2 set 267; SPECIES_DELCATTY; complete legal parties",
    script:
      "Move_FAKE_TEARS loads SMALL_BUBBLES, THOUGHT_BUBBLE, MUSIC_NOTES; only SMALL_BUBBLES supplies gTearDropSpriteTemplate art",
    delcattyBack: "graphics/pokemon/delcatty/back.png; normal.pal",
    delcattyFront: "graphics/pokemon/delcatty/anim_front.png frame 0; normal.pal",
    smallBubbles:
      "graphics/battle_anims/sprites/small_bubbles.png; gTearDropSpriteTemplate tileNum += 4",
    thoughtBubble:
      "graphics/battle_anims/sprites/thought_bubble.png; loaded/free lifecycle, no Fake Tears sprite",
    musicNotes:
      "graphics/battle_anims/sprites/music_notes.png; loaded/free lifecycle, no Fake Tears sprite",
  },
  delcattyBack: sprite(
    "graphics/pokemon/delcatty/back.png",
    "graphics/pokemon/delcatty/normal.pal",
  ),
  delcattyFront: sprite(
    "graphics/pokemon/delcatty/anim_front.png",
    "graphics/pokemon/delcatty/normal.pal",
  ),
  smallBubbles: sprite("graphics/battle_anims/sprites/small_bubbles.png"),
  thoughtBubble: sprite("graphics/battle_anims/sprites/thought_bubble.png"),
  musicNotes: sprite("graphics/battle_anims/sprites/music_notes.png"),
})}\n`);
console.log(`wrote ${out}`);
