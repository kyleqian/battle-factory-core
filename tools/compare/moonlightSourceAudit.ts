import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
) as {
  tiers: { level50: { moves: readonly {
    move: string; id: number; exampleMons: readonly string[];
  }[] } };
};

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const moonlight = block(scripts, "Move_MOONLIGHT", "Move_EXTREME_SPEED");
const present = block(scripts, "Move_PRESENT", "Move_BATON_PASS");
const gloom = mons.slice(
  mons.indexOf("[FRONTIER_MON_GLOOM_1]"),
  mons.indexOf("[FRONTIER_MON_GLOOM_1]") + 500,
);
const moonInventory = inventory.tiers.level50.moves.find(
  (entry) => entry.move === "MOVE_MOONLIGHT",
);
const presentInventory = inventory.tiers.level50.moves.find(
  (entry) => entry.move === "MOVE_PRESENT",
);

const requiredMoonlight = [
  "loadspritegfx ANIM_TAG_MOON",
  "loadspritegfx ANIM_TAG_GREEN_SPARKLE",
  "loadspritegfx ANIM_TAG_BLUE_STAR",
  "setalpha 0, 16",
  "simple_palette_blend",
  "gMoonSpriteTemplate",
  "AnimTask_AlphaFadeIn",
  "AnimTask_MoonlightEndFade",
  "call HealingEffect",
];
const requiredPresent = [
  "loadspritegfx ANIM_TAG_ITEM_BAG",
  "AnimTask_IsHealingMove",
  "create_present_sprite",
  "jumpretfalse PresentDamage",
  "jumprettrue PresentHeal",
  "loadspritegfx ANIM_TAG_EXPLOSION",
  "gExplosionSpriteTemplate",
  "loadspritegfx ANIM_TAG_GREEN_SPARKLE",
  "create_present_heal_particle_sprite",
  "call HealingEffect2",
];

if (
  !moonInventory || moonInventory.id !== 236
  || moonInventory.exampleMons[0] !== "FRONTIER_MON_GLOOM_1"
  || !presentInventory || presentInventory.id !== 217
  || presentInventory.exampleMons[0] !== "FRONTIER_MON_DELIBIRD"
  || !gloom.includes(".species = SPECIES_GLOOM")
  || !gloom.includes(
    ".moves = {MOVE_PETAL_DANCE, MOVE_ACID, MOVE_STUN_SPORE, MOVE_MOONLIGHT}",
  )
  || !gloom.includes("BATTLE_FRONTIER_ITEM_PERSIM_BERRY")
  || !gloom.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !gloom.includes("NATURE_QUIRKY")
  || requiredMoonlight.some((text) => !moonlight.includes(text))
  || (moonlight.match(/gMoonlightSparkleSpriteTemplate/g) ?? []).length !== 5
  || requiredPresent.some((text) => !present.includes(text))
  || (present.match(/create_present_heal_particle_sprite/g) ?? []).length !== 9
  || (present.match(/gExplosionSpriteTemplate/g) ?? []).length !== 5
  || !effects1.includes("void AnimTask_MoonlightEndFade(u8 taskId)")
  || !effects1.includes("static void AnimTask_MoonlightEndFade_Step(u8 taskId)")
  || !effects1.includes("const struct SpriteTemplate gMoonSpriteTemplate")
  || !effects1.includes("const struct SpriteTemplate gMoonlightSparkleSpriteTemplate")
  || !effects1.includes("const struct SpriteTemplate gPresentSpriteTemplate")
  || !effects1.includes("const struct SpriteTemplate gPresentHealParticleSpriteTemplate")
  || !effects3.includes("void AnimTask_IsHealingMove(u8 taskId)")
) {
  throw new Error("Moonlight/GREEN_SPARKLE source contract changed");
}

console.log(
  "set 167 GLOOM_1 -> MOVE_MOONLIGHT 236/PERSIM_BERRY/SP_ATTACK+HP/"
  + "QUIRKY; Moonlight owns MOON, five GREEN_SPARKLE lifecycles, alpha/"
  + "BG fade, MoonlightEndFade, HealingEffect BLUE_STAR and cleanup; "
  + "MOVE_PRESENT remains distinct: IsHealingMove dispatch, ITEM_BAG "
  + "projectile, five EXPLOSION damage sprites or nine heal particles plus "
  + "HealingEffect2 on its target",
);
