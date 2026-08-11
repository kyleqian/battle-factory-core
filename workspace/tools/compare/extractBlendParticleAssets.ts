// Byte-preserving source extraction for the palette consumed by
// AnimTask_BlendParticle in the Fake Tears representative.  The task never
// creates a software sprite, so its loaded particle palette is the only asset
// this evidence checkpoint needs.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/blend-particle-small-bubbles.json");
const image = decodeIndexedPng(join(
  root, "reference/pokeemerald/graphics/battle_anims/sprites/small_bubbles.png",
));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    component: "AnimTask_BlendParticle",
    representative: "MOVE_FAKE_TEARS",
    carrier: "FRONTIER_MON_DELCATTY_2 set 267; SPECIES_DELCATTY; MOVE_FAKE_TEARS",
    tag: "ANIM_TAG_SMALL_BUBBLES (ANIM_SPRITES_START + 155)",
    graphics: "graphics/battle_anims/sprites/small_bubbles.png; gBattleAnimSpriteGfx_SmallBubbles",
    palette: "graphics/battle_anims/sprites/small_bubbles.png; gBattleAnimSpritePal_SmallBubbles",
    excluded: "Fake Tears loads thought-bubble/music-note assets later, but BlendParticle selects only SMALL_BUBBLES' OBJ palette and creates no sprite",
  },
  palette: image.palette,
})}\n`);
console.log(`wrote ${out}`);
