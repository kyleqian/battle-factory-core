import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const monConstants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const species = read("reference/pokeemerald/include/constants/species.h");
const moves = read("reference/pokeemerald/include/constants/moves.h");
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const sweetKiss = block(scripts, "Move_SWEET_KISS", "Move_LOVELY_KISS");
const attract = block(scripts, "Move_ATTRACT", "Move_GROWTH");
const luvdisc = mons.slice(
  mons.indexOf("[FRONTIER_MON_LUVDISC]"),
  mons.indexOf("[FRONTIER_MON_LUVDISC]") + 500,
);
const entry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_SWEET_KISS",
);

const sweetKissRequired = [
  "loadspritegfx ANIM_TAG_RED_HEART",
  "loadspritegfx ANIM_TAG_ANGEL",
  "gAngelSpriteTemplate, ANIM_TARGET, 2, 16, -48",
  "SE_M_HEAL_BELL, SOUND_PAN_TARGET",
  "delay 23",
  "waitforvisualfinish",
  "gRedHeartBurstSpriteTemplate, ANIM_TARGET, 3, 160, -30",
  "gRedHeartBurstSpriteTemplate, ANIM_TARGET, 3, -256, -42",
  "gRedHeartBurstSpriteTemplate, ANIM_TARGET, 3, 128, -14",
  "gRedHeartBurstSpriteTemplate, ANIM_TARGET, 3, 416, -38",
  "gRedHeartBurstSpriteTemplate, ANIM_TARGET, 3, -128, -22",
  "gRedHeartBurstSpriteTemplate, ANIM_TARGET, 3, -384, -31",
];
const attractDistinct = [
  "gRedHeartProjectileSpriteTemplate",
  "gRedHeartRisingSpriteTemplate",
  "AnimTask_HeartsBackground",
  "AnimTask_SwayMon",
  "blend_color_cycle",
];
if (
  !entry || entry.id !== 186
  || entry.exampleMons[0] !== "FRONTIER_MON_LUVDISC"
  || !monConstants.includes("#define FRONTIER_MON_LUVDISC        123")
  || !species.includes("#define SPECIES_LUVDISC 325")
  || !moves.includes("#define MOVE_SWEET_KISS 186")
  || !luvdisc.includes(".species = SPECIES_LUVDISC")
  || !luvdisc.includes(
    ".moves = {MOVE_SWEET_KISS, MOVE_ATTRACT, MOVE_DIVE, MOVE_RAIN_DANCE}",
  )
  || !luvdisc.includes("BATTLE_FRONTIER_ITEM_QUICK_CLAW")
  || !luvdisc.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !luvdisc.includes("NATURE_RELAXED")
  || sweetKissRequired.some((text) => !sweetKiss.includes(text))
  || (sweetKiss.match(/gRedHeartBurstSpriteTemplate/g) ?? []).length !== 6
  || !effects.includes(".callback = AnimAngel")
  || !effects.includes("var0 = (sprite->data[0] * 10) & 0xFF")
  || !effects.includes("if (sprite->data[0] > 100)")
  || !effects.includes(".callback = AnimParticleBurst")
  || !effects.includes("if (sprite->data[3] > 120)")
  || attractDistinct.some((text) => !attract.includes(text))
) throw new Error("Sweet Kiss/RED_HEART source contract changed");

console.log(
  "set 123/FRONTIER_MON_LUVDISC -> SPECIES_LUVDISC 325/"
  + "MOVE_SWEET_KISS 186/QUICK_CLAW/SP_ATTACK+HP/RELAXED; Sweet Kiss owns "
  + "one gAngelSpriteTemplate and six gRedHeartBurstSpriteTemplate "
  + "lifecycles; MOVE_ATTRACT remains distinct with projectile/rising "
  + "hearts, HeartsBackground, SwayMon, and BlendColorCycle",
);
