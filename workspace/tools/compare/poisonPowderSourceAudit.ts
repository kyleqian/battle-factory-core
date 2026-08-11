import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const battleAnimData = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const learnsets = read("reference/pokeemerald/src/data/pokemon/level_up_learnsets.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const components = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const factoryMons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));

const start = scripts.indexOf("Move_POISON_POWDER:");
const end = scripts.indexOf("Move_STUN_SPORE:");
if (start < 0 || end < start) throw new Error("missing Poison Powder interval");
const script = scripts.slice(start, end);
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-n", "reference/pokeemerald/pokeemerald.elf"],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);

function address(symbol: string): number {
  const row = nm.split("\n").find((line) => line.endsWith(` ${symbol}`));
  if (!row) throw new Error(`missing ${symbol}`);
  return Number.parseInt(row.split(/\s+/)[0]!, 16);
}

const outside = inventory.tiers.outsideFactory.moves.find(
  (value: { move: string }) => value.move === "MOVE_POISON_POWDER",
);
const level50 = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_POISON_POWDER",
);
const component = components.moves.find(
  (value: { move: string }) => value.move === "MOVE_POISON_POWDER",
);
const factoryCarriers = factoryMons.entries.filter(
  (mon: { moves: string[] }) => mon.moves.includes("MOVE_POISON_POWDER"),
);

if (
  !outside
  || outside.id !== 77
  || outside.tier === "level50"
  || outside.frontierMonCount !== 0
  || outside.speciesCount !== 0
  || level50 !== undefined
  || factoryCarriers.length !== 0
  || component?.tier !== "outsideFactory"
  || JSON.stringify(component.componentIds) !== JSON.stringify([
    "asset:ANIM_TAG_POISON_BUBBLE",
    "asset:ANIM_TAG_POISON_POWDER",
    "visualCommand:create_poison_powder_particle_sprite",
  ])
  || !script.includes("loadspritegfx ANIM_TAG_POISON_POWDER")
  || !script.includes("loadspritegfx ANIM_TAG_POISON_BUBBLE")
  || !script.includes(
    "loopsewithpan SE_M_POISON_POWDER, SOUND_PAN_TARGET, 10, 6",
  )
  || (script.match(/create_poison_powder_particle_sprite/g) ?? []).length !== 15
  || script.includes("gPoisonBubbleSpriteTemplate")
  || !effects.includes("gPoisonPowderParticleSpriteTemplate")
  || !effects.includes("AnimMovePowderParticle_Step")
  || !effects.includes("const union AnimCmd gPowderParticlesAnimCmds[]")
  || !graphics.includes(
    'gBattleAnimSpriteGfx_PoisonPowder[] = INCGFX_U32("graphics/battle_anims/sprites/poison_powder.png"',
  )
  || !graphics.includes(
    'gBattleAnimSpritePal_PoisonPowder[] = INCGFX_U32("graphics/battle_anims/sprites/poison_powder.png"',
  )
  || !graphics.includes(
    'gBattleAnimSpriteGfx_PoisonBubble[] = INCGFX_U32("graphics/battle_anims/sprites/poison_bubble.png"',
  )
  || !graphics.includes(
    'gBattleAnimSpritePal_PoisonBubble[] = INCGFX_U32("graphics/battle_anims/sprites/poison_bubble.png"',
  )
  || !battleAnimData.includes(
    "{gBattleAnimSpriteGfx_PoisonPowder, 0x0200, ANIM_TAG_POISON_POWDER}",
  )
  || !battleAnimData.includes(
    "{gBattleAnimSpriteGfx_PoisonBubble, 0x0180, ANIM_TAG_POISON_BUBBLE}",
  )
  || !battleAnimData.includes(
    "{gBattleAnimSpritePal_PoisonPowder, ANIM_TAG_POISON_POWDER}",
  )
  || !battleAnimData.includes(
    "{gBattleAnimSpritePal_PoisonBubble, ANIM_TAG_POISON_BUBBLE}",
  )
  || !constants.includes(
    "#define ANIM_TAG_POISON_POWDER              (ANIM_SPRITES_START + 65)",
  )
  || !constants.includes(
    "#define ANIM_TAG_POISON_BUBBLE              (ANIM_SPRITES_START + 150)",
  )
  || !learnsets.slice(
    learnsets.indexOf("static const u16 sBulbasaurLevelUpLearnset[]"),
    learnsets.indexOf("static const u16 sIvysaurLevelUpLearnset[]"),
  ).includes("LEVEL_UP_MOVE(15, MOVE_POISON_POWDER)")
  || address("Move_POISON_POWDER") !== 0x082c941c
  || address("Move_STUN_SPORE") - address("Move_POISON_POWDER") !== 0x131
  || address("gPoisonPowderParticleSpriteTemplate") !== 0x08592148
  || address("gBattleAnimSpriteGfx_PoisonPowder") !== 0x08c0b6bc
  || address("gBattleAnimSpritePal_PoisonPowder") !== 0x08c0b7d0
  || address("gBattleAnimSpriteGfx_PoisonBubble") !== 0x08c1b328
  || address("gBattleAnimSpritePal_PoisonBubble") !== 0x08c1b3fc
) {
  throw new Error("Poison Powder source/classification contract changed");
}

console.log(
  "Move_POISON_POWDER 0x082c941c..0x082c954d (0x131 bytes); "
  + "three-component graph asset:ANIM_TAG_POISON_BUBBLE, "
  + "asset:ANIM_TAG_POISON_POWDER, and "
  + "gPoisonPowderParticleSpriteTemplate -> AnimMovePowderParticle_Step "
  + "with gPowderParticlesAnimCmds; Poison Bubble is loaded but not instantiated; "
  + "factory inventory tier outsideFactory, frontierMonCount 0, "
  + "no Level-50 Factory carrier; lowest source-legal species is "
  + "SPECIES_BULBASAUR (level-15 learnset, legal by level 50)",
);
