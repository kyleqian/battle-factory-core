import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const script = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects2 = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const data = read("reference/pokeemerald/src/data/battle_anim.h");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const body = script.slice(script.indexOf("Move_AROMATHERAPY:"), script.indexOf("Move_FAKE_TEARS:"));
const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_VILEPLUME_1]"), mons.indexOf("[FRONTIER_MON_VILEPLUME_1]") + 600);
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_AROMATHERAPY");

const required = [
  "loadspritegfx ANIM_TAG_FLOWER", "loadspritegfx ANIM_TAG_THIN_RING",
  "loadspritegfx ANIM_TAG_SPARKLE_2", "monbg ANIM_ATTACKER",
  "clearmonbg ANIM_ATTACKER", "AnimTask_StatusClearedEffect, 2, 1",
  "gAromatherapySmallFlowerSpriteTemplate", "gAromatherapyBigFlowerSpriteTemplate",
  "gSparklingStarsSpriteTemplate", "gBlendThinRingExpandingSpriteTemplate",
  "simple_palette_blend unused_subpriority_offset=0, selector=F_PAL_BG, delay=0, initial_blend_y=0, target_blend_y=7, color=RGB(13, 31, 12)",
  "simple_palette_blend unused_subpriority_offset=0, selector=F_PAL_BG | F_PAL_ATK_SIDE | F_PAL_ANIM_1, delay=3, initial_blend_y=10, target_blend_y=0, color=RGB(13, 31, 12)",
];

if (!move || move.id !== 312 || move.exampleMons[0] !== "FRONTIER_MON_VILEPLUME_1"
  || !constants.includes("#define FRONTIER_MON_VILEPLUME_1    394")
  || !carrier.includes(".species = SPECIES_VILEPLUME")
  || !carrier.includes(".moves = {MOVE_SLUDGE_BOMB, MOVE_PETAL_DANCE, MOVE_MOONLIGHT, MOVE_AROMATHERAPY}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_PERSIM_BERRY")
  || !carrier.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !carrier.includes("NATURE_IMPISH")
  || required.some((text) => !body.includes(text))
  || (body.match(/gAromatherapySmallFlowerSpriteTemplate/g) ?? []).length !== 7
  || (body.match(/gAromatherapyBigFlowerSpriteTemplate/g) ?? []).length !== 2
  || (body.match(/gSparklingStarsSpriteTemplate/g) ?? []).length !== 2
  || !effects1.includes("const struct SpriteTemplate gAromatherapySmallFlowerSpriteTemplate")
  || !effects1.includes("const struct SpriteTemplate gAromatherapyBigFlowerSpriteTemplate")
  || !effects1.includes("AFFINEANIMCMD_FRAME(0, 0, 4, 1)")
  || !effects1.includes(".callback = AnimFlyingParticle")
  || !effects2.includes("const struct SpriteTemplate gBlendThinRingExpandingSpriteTemplate")
  || !effects3.includes("void AnimTask_StatusClearedEffect(u8 taskId)")
  || !data.includes("{gBattleAnimSpriteGfx_Flower, 0x00a0, ANIM_TAG_FLOWER}")
  || !data.includes("{gBattleAnimSpritePal_Flower, ANIM_TAG_FLOWER}")) {
  throw new Error("Aromatherapy/FLOWER source contract changed");
}

console.log(
  "set 394/FRONTIER_MON_VILEPLUME_1 -> SPECIES_VILEPLUME 45/MOVE_AROMATHERAPY 312/"
  + "PERSIM_BERRY/ATTACK+HP/IMPISH; body owns FLOWER load (7 small + 2 big AnimFlyingParticle, big affine +4), green BG blend, monbg, StatusClearedEffect, two SPARKLE_2 stars and blended THIN_RING cleanup; closest FLOWER sibling Petal Dance uses gPetalDance callbacks and independent repeated source macros",
);
