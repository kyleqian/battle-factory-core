import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const psychic = read("reference/pokeemerald/src/battle_anim_psychic.c");
const rock = read("reference/pokeemerald/src/battle_anim_rock.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const inventory = JSON.parse(read(
  "src/data/gen/factory-animation-inventory.json",
));
function block(label: string, next: string): string {
  const start = scripts.indexOf(`${label}:`);
  const end = scripts.indexOf(`${next}:`, start + label.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${label}/${next}`);
  return scripts.slice(start, end);
}
const body = block("Move_BLOCK", "Move_HOWL");
const sibling = block("Move_ROCK_TOMB", "Move_SILVER_WIND");
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_SUDOWOODO_1]"),
  mons.indexOf("[FRONTIER_MON_SUDOWOODO_1]") + 500,
);
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_BLOCK",
);
if (
  !move || move.id !== 335
  || move.exampleMons[0] !== "FRONTIER_MON_SUDOWOODO_1"
  || !carrier.includes(".species = SPECIES_SUDOWOODO")
  || !carrier.includes(
    ".moves = {MOVE_ROCK_SLIDE, MOVE_FAINT_ATTACK, MOVE_SANDSTORM, MOVE_BLOCK}",
  )
  || !carrier.includes("BATTLE_FRONTIER_ITEM_HARD_STONE")
  || !carrier.includes("F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_HP")
  || !carrier.includes("NATURE_HARDY")
  || !body.includes("loadspritegfx ANIM_TAG_X_SIGN")
  || !body.includes("createsprite gBlockXSpriteTemplate, ANIM_TARGET, 66")
  || !effects.includes("const struct SpriteTemplate gBlockXSpriteTemplate")
  || !effects.includes(".callback = AnimBlockX")
  || !effects.includes("sprite->y2 += 10")
  || !effects.includes("sprite->data[2] == 7")
  || !graphics.includes(
    'INCGFX_U32("graphics/battle_anims/sprites/x_sign.png", ".4bpp.lz")',
  )
  || !graphics.includes(
    'INCGFX_U32("graphics/battle_anims/sprites/hollow_orb.png", ".gbapal.lz")',
  )
) throw new Error("Block/X_SIGN source contract changed");

for (const text of [
  "loadspritegfx ANIM_TAG_X_SIGN",
  "loadspritegfx ANIM_TAG_ROCKS",
  "createsprite gRockTombRockSpriteTemplate",
  "createsprite gRedXSpriteTemplate",
  "createvisualtask AnimTask_ShakeMon",
  "shake_battle_platforms",
]) if (!sibling.includes(text)) throw new Error(`ROCK_TOMB lost ${text}`);
if (
  !psychic.includes("const struct SpriteTemplate gRedXSpriteTemplate")
  || !rock.includes("const struct SpriteTemplate gRockTombRockSpriteTemplate")
) throw new Error("ROCK_TOMB sibling templates changed");

console.log(JSON.stringify({
  carrier:
    "set 193 FRONTIER_MON_SUDOWOODO_1 / SPECIES_SUDOWOODO / MOVE_BLOCK",
  components: [
    "asset:ANIM_TAG_X_SIGN",
    "sprite:gBlockXSpriteTemplate",
  ],
  sibling: {
    move: "MOVE_ROCK_TOMB",
    remainder:
      "independent ROCKS load/free, four gRockTombRockSpriteTemplate falls, gRedXSpriteTemplate, AnimTask_ShakeMon, platform shakes, audio/waits, damage/stat/controller presentation, cleanup, and dense both-orientation acceptance",
  },
}));
