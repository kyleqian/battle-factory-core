import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const battleAnimData = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);

const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const interval = (start: string, end: string): string => {
  const from = scripts.indexOf(`${start}:`);
  const to = scripts.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return scripts.slice(from, to);
};

const metalSound = interval("Move_METAL_SOUND", "Move_FOCUS_PUNCH");
const metalSoundRings = interval("MetalSoundRings", "Move_FOCUS_PUNCH");
const expectedComponents = [
  "asset:ANIM_TAG_METAL_SOUND_WAVES",
  "sprite:gMetalSoundSpriteTemplate",
  "subroutine:MetalSoundRings",
  "task:AnimTask_ShakeMon2",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:panse",
  "visualCommand:splitbgprio_foes",
];
const sharedWithSupersonic = [
  "task:AnimTask_ShakeMon2",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:splitbgprio_foes",
];
const metalMove = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_METAL_SOUND",
);
const metalComponents = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_METAL_SOUND",
);
const supersonicComponents = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_SUPERSONIC",
);
const level50Range = inventory.tiers.level50.monIndices;
const legalCarriers = mons.entries.filter(
  (entry: { index: number; moves: string[] }) =>
    entry.index >= level50Range.first
    && entry.index <= level50Range.last
    && entry.moves.includes("MOVE_METAL_SOUND"),
);
const supersonicCoverage = coverage.entries.find(
  (entry: { move: string }) => entry.move === "MOVE_SUPERSONIC",
);
const metalCoverage = coverage.entries.find(
  (entry: { move: string }) => entry.move === "MOVE_METAL_SOUND",
);
const rows = [
  "loadspritegfx ANIM_TAG_METAL_SOUND_WAVES",
  "monbg ANIM_DEF_PARTNER",
  "splitbgprio_foes ANIM_TARGET",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 2, 0, 8, 1",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "delay 0",
  "panse SE_M_SCREECH, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +2, 0",
  "createsprite gMetalSoundSpriteTemplate, ANIM_TARGET, 2, 16, 0, 0, 0, 30, 0",
  "delay 2",
  "return",
];

if (
  address("Move_METAL_SOUND") !== 0x082d59b7
  || address("Move_FOCUS_PUNCH") !== 0x082d5a07
  || address("gMetalSoundSpriteTemplate") !== 0x08593458
  || address("gGrowingRingAffineAnimCmds") !== 0x085933c8
  || address("gGrowingRingAffineAnimTable") !== 0x08593420
  || address("TranslateAnimSpriteToTargetMonLocation") !== 0x080a7820
  || address("AnimTask_ShakeMon2") !== 0x080d52d0
  || address("AnimTask_ShakeMon2_Step") !== 0x080d53bc
  || address("gBattleAnimSpriteGfx_MetalSoundWaves") !== 0x08d8dae0
  || address("gBattleAnimSpritePal_MetalSoundWaves") !== 0x08d8dc9c
  || rows.some((row) => !(row.includes("panse") || row.includes("createsprite") || row === "delay 2" || row === "return") && !metalSound.includes(row))
  || !metalSoundRings.includes(rows[7]!)
  || !metalSoundRings.includes(rows[8]!)
  || !metalSoundRings.includes(rows[9]!)
  || !metalSoundRings.includes(rows[10]!)
  || (metalSound.match(/call MetalSoundRings/g) ?? []).length !== 4
  || !effects.includes("const struct SpriteTemplate gMetalSoundSpriteTemplate")
  || !effects.includes(".oam = &gOamData_AffineDouble_ObjNormal_32x64")
  || !effects.includes(".affineAnims = gGrowingRingAffineAnimTable")
  || !effects.includes(".callback = TranslateAnimSpriteToTargetMonLocation")
  || !effects.includes("AFFINEANIMCMD_FRAME(0x20, 0x20, 0, 0)")
  || !effects.includes("AFFINEANIMCMD_FRAME(0x7, 0x7, 0, -56)")
  || !graphics.includes('gBattleAnimSpriteGfx_MetalSoundWaves[] = INCGFX_U32("graphics/battle_anims/sprites/metal_sound_waves.png"')
  || !graphics.includes('gBattleAnimSpritePal_MetalSoundWaves[] = INCGFX_U32("graphics/battle_anims/sprites/metal_sound_waves.png"')
  || !battleAnimData.includes("{gBattleAnimSpriteGfx_MetalSoundWaves, 0x0400, ANIM_TAG_METAL_SOUND_WAVES}")
  || !battleAnimData.includes("{gBattleAnimSpritePal_MetalSoundWaves, ANIM_TAG_METAL_SOUND_WAVES}")
  || !constants.includes("#define ANIM_TAG_METAL_SOUND_WAVES          (ANIM_SPRITES_START + 260)")
  || metalMove?.id !== 319
  || metalMove.frontierMonCount !== 2
  || JSON.stringify(metalMove.exampleMons) !== JSON.stringify(["FRONTIER_MON_ARON", "FRONTIER_MON_MAGNETON_2"])
  || JSON.stringify(metalComponents?.componentIds) !== JSON.stringify(expectedComponents)
  || legalCarriers.length !== 2
  || legalCarriers[0]?.index !== 122
  || legalCarriers[0]?.label !== "FRONTIER_MON_ARON"
  || legalCarriers[0]?.species !== "SPECIES_ARON"
  || JSON.stringify(legalCarriers[0]?.moves) !== JSON.stringify(["MOVE_METAL_CLAW", "MOVE_AERIAL_ACE", "MOVE_METAL_SOUND", "MOVE_ROAR"])
  || legalCarriers[0]?.itemName !== "BATTLE_FRONTIER_ITEM_PERSIM_BERRY"
  || JSON.stringify(legalCarriers[0]?.evSpreadStats) !== JSON.stringify(["F_EV_SPREAD_ATTACK", "F_EV_SPREAD_HP"])
  || legalCarriers[0]?.nature !== "NATURE_DOCILE"
  || legalCarriers[1]?.index !== 349
  || legalCarriers[1]?.label !== "FRONTIER_MON_MAGNETON_2"
  || JSON.stringify(supersonicComponents?.componentIds.filter((id: string) => expectedComponents.includes(id))) !== JSON.stringify(sharedWithSupersonic)
  || supersonicCoverage?.status !== "exact"
  || metalCoverage?.status !== "exact"
  || coverage.entries.length !== 173
) {
  throw new Error("MOVE_METAL_SOUND source/carrier/component/control contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_METAL_SOUND",
  sourceBounds: { start: "0x082d59b7", endExclusive: "0x082d5a07", bytes: "0x50" },
  carrier: "set 122 FRONTIER_MON_ARON / SPECIES_ARON / MOVE_METAL_SOUND",
  components: expectedComponents,
  control: {
    move: "MOVE_SUPERSONIC",
    status: "exact",
    sharedComponents: sharedWithSupersonic,
    independence: "Metal Sound is independently exact; its 32x64 metal-wave/panse/def-partner body is not inherited from Supersonic.",
  },
}));
