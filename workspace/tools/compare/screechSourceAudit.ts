/** Authoritative source and acceptance-graph audit for MOVE_SCREECH. */
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

function address(symbol: string): number {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error("missing " + symbol);
  return Number.parseInt(match[1]!, 16);
}

function sourceBlock(source: string, start: string, end: string): string {
  const from = source.indexOf(start + ":");
  const to = source.indexOf(end + ":", from + start.length + 1);
  if (from < 0 || to <= from) throw new Error("missing " + start + "/" + end);
  return source.slice(from, to);
}

const move = sourceBlock(scripts, "Move_SCREECH", "Move_FLAME_WHEEL");
const ring = sourceBlock(scripts, "ScreechRing", "Move_FLAME_WHEEL");
const expectedComponents = [
  "asset:ANIM_TAG_PURPLE_RING",
  "sprite:gScreechRingSpriteTemplate",
  "subroutine:ScreechRing",
  "task:AnimTask_ShakeMon2",
  "task:AnimTask_SwayMon",
];
const newComponents = expectedComponents.slice(0, 3);
const screechMove = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_SCREECH",
);
const screechGraph = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_SCREECH",
);
const range = inventory.tiers.level50.monIndices;
const carriers = mons.entries.filter(
  (entry: { index: number; moves: string[] }) =>
    entry.index >= range.first && entry.index <= range.last && entry.moves.includes("MOVE_SCREECH"),
);
const status = (moveName: string): string | undefined => coverage.entries.find(
  (entry: { move: string }) => entry.move === moveName,
)?.status;
const template = effects.slice(
  effects.indexOf("const struct SpriteTemplate gScreechRingSpriteTemplate"),
  effects.indexOf("const struct SpriteTemplate gMetalSoundSpriteTemplate"),
);

const moveRows = [
  "loadspritegfx ANIM_TAG_PURPLE_RING",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 3, 0, 2, 1",
  "delay 16",
  "createvisualtask AnimTask_SwayMon, 5, 0, 6, 2048, 2, ANIM_TARGET",
  "waitforvisualfinish",
  "end",
];
const ringRows = [
  "playsewithpan SE_M_SCREECH, SOUND_PAN_ATTACKER",
  "createsprite gScreechRingSpriteTemplate, ANIM_TARGET, 2, 16, 0, 0, 0, 30, 0",
  "delay 2",
  "return",
];
const firstCarrier = carriers[0];

if (
  address("Move_SCREECH") !== 0x082c9a19
  || address("ScreechRing") !== 0x082c9a4c
  || address("Move_FLAME_WHEEL") !== 0x082c9a66
  || address("gScreechRingSpriteTemplate") !== 0x08593440
  || address("gGrowingRingAffineAnimCmds") !== 0x085933c8
  || address("gGrowingRingAffineAnimTable") !== 0x08593420
  || address("TranslateAnimSpriteToTargetMonLocation") !== 0x080a7820
  || address("AnimTask_ShakeMon2") !== 0x080d52d0
  || address("AnimTask_ShakeMon2_Step") !== 0x080d53bc
  || address("AnimTask_SwayMon") !== 0x080d5eb8
  || address("AnimTask_SwayMonStep") !== 0x080d5f3c
  || address("gBattleAnimSpriteGfx_GoldRing") !== 0x08c1bee4
  || address("gBattleAnimSpritePal_PurpleRing") !== 0x08c1bf74
  || moveRows.some((row) => !move.includes(row))
  || (move.match(/call ScreechRing/g) ?? []).length !== 2
  || ringRows.some((row) => !ring.includes(row))
  || !template.includes(".tileTag = ANIM_TAG_PURPLE_RING")
  || !template.includes(".paletteTag = ANIM_TAG_PURPLE_RING")
  || !template.includes(".oam = &gOamData_AffineDouble_ObjNormal_16x32")
  || !template.includes(".affineAnims = gGrowingRingAffineAnimTable")
  || !template.includes(".callback = TranslateAnimSpriteToTargetMonLocation")
  || !effects.includes("AFFINEANIMCMD_FRAME(0x20, 0x20, 0, 0)")
  || !effects.includes("AFFINEANIMCMD_FRAME(0x7, 0x7, 0, -56)")
  || !graphics.includes('gBattleAnimSpriteGfx_GoldRing[] = INCGFX_U32("graphics/battle_anims/sprites/gold_ring.png"')
  || !graphics.includes('gBattleAnimSpritePal_PurpleRing[] = INCGFX_U32("graphics/battle_anims/sprites/purple_ring.pal"')
  || !battleAnimData.includes("{gBattleAnimSpriteGfx_GoldRing, 0x0100, ANIM_TAG_PURPLE_RING}")
  || !battleAnimData.includes("{gBattleAnimSpritePal_PurpleRing, ANIM_TAG_PURPLE_RING}")
  || !constants.includes("#define ANIM_TAG_PURPLE_RING                (ANIM_SPRITES_START + 164)")
  || screechMove?.id !== 103
  || screechMove?.frontierMonCount !== 12
  || JSON.stringify(screechGraph?.componentIds) !== JSON.stringify(expectedComponents)
  || carriers.length !== 12
  || firstCarrier?.index !== 115
  || firstCarrier?.label !== "FRONTIER_MON_VOLTORB"
  || firstCarrier?.species !== "SPECIES_VOLTORB"
  || JSON.stringify(firstCarrier?.moves) !== JSON.stringify([
    "MOVE_SPARK", "MOVE_SCREECH", "MOVE_ROLLOUT", "MOVE_LIGHT_SCREEN",
  ])
  || firstCarrier?.itemName !== "BATTLE_FRONTIER_ITEM_LAX_INCENSE"
  || JSON.stringify(firstCarrier?.evSpreadStats) !== JSON.stringify([
    "F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP",
  ])
  || firstCarrier?.nature !== "NATURE_DOCILE"
  || status("MOVE_SCREECH") !== "exact"
  || status("MOVE_SUPERSONIC") !== "exact"
  || status("MOVE_METAL_SOUND") !== "exact"
  || coverage.entries.filter((entry: { status: string }) => entry.status === "exact").length !== 224
) {
  throw new Error("MOVE_SCREECH source/carrier/component/control contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_SCREECH",
  sourceBounds: { start: "0x082c9a19", endExclusive: "0x082c9a66", bytes: "0x4d" },
  carrier: "set 115 FRONTIER_MON_VOLTORB / SPECIES_VOLTORB / MOVE_SCREECH",
  components: expectedComponents,
  newComponents,
  controls: {
    moves: ["MOVE_SUPERSONIC", "MOVE_METAL_SOUND"],
    statuses: ["exact", "exact"],
    independence: "Screech alone is exact; Supersonic and Metal Sound retain independent control credit only.",
  },
}));
