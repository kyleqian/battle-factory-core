import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const psychic = read("reference/pokeemerald/src/battle_anim_psychic.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const battleCommands = read(
  "reference/pokeemerald/src/battle_script_commands.c",
);
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const species = read("reference/pokeemerald/include/constants/species.h");
const inventory = JSON.parse(read(
  "src/data/gen/factory-animation-inventory.json",
));

function body(label: string, next: string): string {
  const start = scripts.indexOf(`${label}:`);
  const end = scripts.indexOf(`${next}:`, start + label.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${label}/${next}`);
  return scripts.slice(start, end);
}

const lightScreen = body("Move_LIGHT_SCREEN", "SpecialScreenSparkle");
const sparkle = body("SpecialScreenSparkle", "Move_MIRROR_COAT");
const mirrorCoat = body("Move_MIRROR_COAT", "Move_REFLECT");
const exeggcute = mons.slice(
  mons.indexOf("[FRONTIER_MON_EXEGGCUTE]"),
  mons.indexOf("[FRONTIER_MON_EXEGGCUTE]") + 500,
);
const corsola = mons.slice(
  mons.indexOf("[FRONTIER_MON_CORSOLA]"),
  mons.indexOf("[FRONTIER_MON_CORSOLA]") + 500,
);
const lightInventory = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_LIGHT_SCREEN",
);
const mirrorInventory = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_MIRROR_COAT",
);

for (const literal of [
  "loadspritegfx ANIM_TAG_SPARKLE_3",
  "loadspritegfx ANIM_TAG_GREEN_LIGHT_WALL",
  "setalpha 0, 16",
  "waitplaysewithpan SE_M_REFLECT, SOUND_PAN_ATTACKER, 15",
  "gLightScreenWallSpriteTemplate",
  "call SpecialScreenSparkle",
  "blendoff",
]) if (!lightScreen.includes(literal)) {
  throw new Error(`LIGHT_SCREEN lost ${literal}`);
}
for (const literal of [
  "23, 0, ANIM_ATTACKER, TRUE",
  "31, -8, ANIM_ATTACKER, TRUE",
  "30, 20, ANIM_ATTACKER, TRUE",
  "10, -15, ANIM_ATTACKER, TRUE",
  "20, 10, ANIM_ATTACKER, TRUE",
  "10, 18, ANIM_ATTACKER, TRUE",
]) if (!sparkle.includes(literal)) {
  throw new Error(`SpecialScreenSparkle lost ${literal}`);
}
if (
  !lightInventory || lightInventory.id !== 113
  || lightInventory.exampleMons[0] !== "FRONTIER_MON_EXEGGCUTE"
  || !constants.includes("#define FRONTIER_MON_EXEGGCUTE      112")
  || !species.includes("#define SPECIES_EXEGGCUTE 102")
  || !exeggcute.includes(".species = SPECIES_EXEGGCUTE")
  || !exeggcute.includes("MOVE_LIGHT_SCREEN")
  || !exeggcute.includes("BATTLE_FRONTIER_ITEM_PERSIM_BERRY")
  || !exeggcute.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !exeggcute.includes("NATURE_NAUGHTY")
  || !psychic.includes("const struct SpriteTemplate gLightScreenWallSpriteTemplate")
  || !psychic.includes("const struct SpriteTemplate gSpecialScreenSparkleSpriteTemplate")
  || !psychic.includes("static void AnimDefensiveWall_Step5")
  || !psychic.includes("static void AnimWallSparkle")
  || !graphics.includes("gBattleAnimSpriteGfx_Sparkle3")
  || !graphics.includes("gBattleAnimSpriteGfx_GreenLightWall")
) throw new Error("Light Screen/SPARKLE_3 source contract changed");

if (
  !mirrorInventory || mirrorInventory.id !== 243
  || mirrorInventory.exampleMons[0] !== "FRONTIER_MON_CORSOLA"
  || !constants.includes("#define FRONTIER_MON_CORSOLA        151")
  || !species.includes("#define SPECIES_CORSOLA 222")
  || !corsola.includes(".species = SPECIES_CORSOLA")
  || !corsola.includes("MOVE_MIRROR_COAT")
  || !corsola.includes("BATTLE_FRONTIER_ITEM_SITRUS_BERRY")
  || !corsola.includes(
    "F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP",
  )
  || !corsola.includes("NATURE_IMPISH")
  || !mirrorCoat.includes("loadspritegfx ANIM_TAG_RED_LIGHT_WALL")
  || !mirrorCoat.includes("gMirrorCoatWallSpriteTemplate")
  || !mirrorCoat.includes("delay 10")
  || !mirrorCoat.includes("playsewithpan SE_M_REFLECT")
  || mirrorCoat.includes("waitplaysewithpan")
  || !mirrorCoat.includes("call SpecialScreenSparkle")
  || !psychic.includes("const struct SpriteTemplate gMirrorCoatWallSpriteTemplate")
  || !graphics.includes("gBattleAnimSpritePal_RedLightWall")
  || !battleScripts.includes("BattleScript_EffectMirrorCoat::")
  || !battleScripts.includes(
    "mirrorcoatdamagecalculator BattleScript_FailedFromAtkString",
  )
  || !battleScripts.includes("goto BattleScript_HitFromAtkAnimation")
  || !battleCommands.includes("static void Cmd_mirrorcoatdamagecalculator(void)")
  || !battleCommands.includes(
    "gBattleMoveDamage = gProtectStructs[gBattlerAttacker].specialDmg * 2",
  )
) throw new Error("Mirror Coat sibling audit changed");

console.log(JSON.stringify({
  carrier:
    "set 112 FRONTIER_MON_EXEGGCUTE / SPECIES_EXEGGCUTE / MOVE_LIGHT_SCREEN",
  components: [
    "asset:ANIM_TAG_GREEN_LIGHT_WALL",
    "asset:ANIM_TAG_SPARKLE_3",
    "sprite:gLightScreenWallSpriteTemplate",
    "sprite:gSpecialScreenSparkleSpriteTemplate",
    "subroutine:SpecialScreenSparkle",
    "visualCommand:setalpha",
    "visualCommand:blendoff",
  ],
  sibling: {
    move: "MOVE_MIRROR_COAT",
    lowestCarrier:
      "set 151 FRONTIER_MON_CORSOLA / SPECIES_CORSOLA",
    reachableBodies: [{
      name: "successful-special-damage-counter",
      route:
        "mirrorcoatdamagecalculator accepts nonzero opposing specialDmg, "
        + "doubles it, and reaches BattleScript_HitFromAtkAnimation",
      animation: "Move_MIRROR_COAT",
    }],
    failureRoute:
      "zero/invalid special damage jumps to BattleScript_FailedFromAtkString "
      + "and does not select a move-animation body",
    presentationDifference:
      "RED_LIGHT_WALL/gMirrorCoatWallSpriteTemplate; wall-before-audio "
      + "delay-10 then immediate playse, with no Light Screen sound task",
  },
}));
