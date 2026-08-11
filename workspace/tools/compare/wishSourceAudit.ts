import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const species = read("reference/pokeemerald/include/constants/species.h");
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);
const wish = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_WISH",
);
const meteorMash = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_METEOR_MASH",
);
const wishBody = scripts.slice(
  scripts.indexOf("Move_WISH:"),
  scripts.indexOf("Move_STOCKPILE:"),
);
const meteorBody = scripts.slice(
  scripts.indexOf("Move_METEOR_MASH:"),
  scripts.indexOf("Move_ASTONISH:"),
);
const grantingBody = scripts.slice(
  scripts.indexOf("GrantingStarsEffect:"),
  scripts.indexOf("HealingEffect:"),
);
const illumise = mons.slice(
  mons.indexOf("[FRONTIER_MON_ILLUMISE_1]"),
  mons.indexOf("[FRONTIER_MON_ILLUMISE_1]") + 500,
);

if (
  !wish || wish.id !== 273 || wish.frontierMonCount !== 8
  || wish.exampleMons[0] !== "FRONTIER_MON_ILLUMISE_1"
  || !meteorMash || meteorMash.id !== 309
  || !constants.includes("#define FRONTIER_MON_ILLUMISE_1     173")
  || !species.includes("#define SPECIES_ILLUMISE 387")
  || !illumise.includes(".species = SPECIES_ILLUMISE")
  || !illumise.includes("MOVE_WISH")
  || !illumise.includes("BATTLE_FRONTIER_ITEM_LIECHI_BERRY")
  || !illumise.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !illumise.includes("NATURE_QUIRKY")
  || !wishBody.includes("loadspritegfx ANIM_TAG_GOLD_STARS")
  || !wishBody.includes("loadspritegfx ANIM_TAG_SPARKLE_2")
  || !wishBody.includes("gWishStarSpriteTemplate")
  || !wishBody.includes("panse_adjustall SE_M_REFLECT")
  || !wishBody.includes("loopsewithpan SE_M_HEAL_BELL")
  || !wishBody.includes("simple_palette_blend selector=F_PAL_BG")
  || !grantingBody.includes("gGrantingStarsSpriteTemplate")
  || !effects1.includes("static void AnimGrantingStars")
  || !effects3.includes("static void AnimWishStar")
  || !effects3.includes("static void AnimMiniTwinklingStar")
  || !effects3.includes("Random2() & 3")
  || !effects3.includes("Random2() & 7")
  || !meteorBody.includes("gMeteorMashStarSpriteTemplate")
  || !meteorBody.includes("fadetobg BG_COSMIC")
  || !meteorBody.includes("create_basic_hitsplat_sprite")
  || !meteorBody.includes("AnimTask_ShakeMon2")
) throw new Error("Wish/GOLD_STARS source contract changed");

console.log(
  "lowest challenge-0 Level-50 carrier set 173/FRONTIER_MON_ILLUMISE_1 -> "
  + "SPECIES_ILLUMISE 387/move 273/LIECHI_BERRY/ATTACK+HP/QUIRKY; "
  + "Wish ports GOLD_STARS, GrantingStarsEffect, BG blend, and pan audio; "
  + "Meteor Mash remains distinct: BG_COSMIC, spinning stars, IMPACT, "
  + "ShakeMon2, and hit choreography",
);
