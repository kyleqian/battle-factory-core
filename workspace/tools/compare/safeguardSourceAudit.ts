/** Authoritative source, component, and Level-50 carrier audit for Safeguard. */
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
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
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

const move = sourceBlock(scripts, "Move_SAFEGUARD", "Move_PAIN_SPLIT");
const expectedComponents = [
  "asset:ANIM_TAG_GUARD_RING",
  "sprite:gGuardRingSpriteTemplate",
  "visualCommand:blend_color_cycle",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:setalpha",
];
const expectedRows = [
  "loadspritegfx ANIM_TAG_GUARD_RING",
  "monbg ANIM_ATK_PARTNER",
  "setalpha 8, 8",
  "playsewithpan SE_M_MILK_DRINK, SOUND_PAN_ATTACKER",
  "createsprite gGuardRingSpriteTemplate, ANIM_ATTACKER, 2",
  "delay 4",
  "waitforvisualfinish",
  "playsewithpan SE_SHINY, SOUND_PAN_ATTACKER",
  "blend_color_cycle priority=2, selector=F_PAL_ATK_SIDE, delay=0, num_blends=2, initial_blend_y=0, target_blend_y=10, color=RGB_WHITE",
  "clearmonbg ANIM_ATK_PARTNER",
  "blendoff",
  "end",
];
const safeguardMove = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_SAFEGUARD",
);
const safeguardGraph = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_SAFEGUARD",
);
const range = inventory.tiers.level50.monIndices;
const carriers = mons.entries.filter(
  (entry: { index: number; moves: string[] }) => entry.index >= range.first
    && entry.index <= range.last && entry.moves.includes("MOVE_SAFEGUARD"),
);
const firstCarrier = carriers[0];
const status = (moveName: string): string | undefined => coverage.entries.find(
  (entry: { move: string }) => entry.move === moveName,
)?.status;
const template = effects.slice(
  effects.indexOf("const struct SpriteTemplate gGuardRingSpriteTemplate"),
  effects.indexOf("#define sAmplitudeX", effects.indexOf("const struct SpriteTemplate gGuardRingSpriteTemplate")),
);

if (
  address("Move_SAFEGUARD") !== 0x082c_b6f7
  || address("Move_PAIN_SPLIT") !== 0x082c_b739
  || address("gGuardRingSpriteTemplate") !== 0x0859_3c64
  || address("AnimGuardRing") !== 0x0810_70ac
  || address("DestroyAnimSprite") !== 0x080a_3bfc
  || address("gBattleAnimSpriteGfx_GuardRing") !== 0x08c2_e554
  || address("gBattleAnimSpritePal_GuardRing") !== 0x08c2_e630
  // Fifteen source commands live between the label and terminal `end`.
  || move.trim().split("\n").slice(1, -1).length !== 15
  || expectedRows.some((row) => !move.includes(row))
  || (move.match(/createsprite gGuardRingSpriteTemplate/g) ?? []).length !== 3
  || !template.includes(".tileTag = ANIM_TAG_GUARD_RING")
  || !template.includes(".paletteTag = ANIM_TAG_GUARD_RING")
  || !template.includes(".oam = &gOamData_AffineDouble_ObjBlend_64x32")
  || !template.includes(".affineAnims = gGuardRingAffineAnimTable")
  || !template.includes(".callback = AnimGuardRing")
  || !effects.includes("AFFINEANIMCMD_FRAME(0x100, 0x100, 0, 0)")
  || !effects.includes("AFFINEANIMCMD_FRAME(0x200, 0x100, 0, 0)")
  || !effects.includes("sprite->y = GetBattlerSpriteCoord(gBattleAnimAttacker, BATTLER_COORD_Y) + 40")
  || !effects.includes("sprite->data[0] = 13")
  || !effects.includes("sprite->data[4] = sprite->y - 72")
  || !effects.includes("StoreSpriteCallbackInData6(sprite, DestroyAnimSprite)")
  || !graphics.includes('gBattleAnimSpriteGfx_GuardRing[] = INCGFX_U32("graphics/battle_anims/sprites/guard_ring.png"')
  || !graphics.includes('gBattleAnimSpritePal_GuardRing[] = INCGFX_U32("graphics/battle_anims/sprites/guard_ring.png"')
  || !battleAnimData.includes("{gBattleAnimSpriteGfx_GuardRing, 0x0400, ANIM_TAG_GUARD_RING}")
  || !battleAnimData.includes("{gBattleAnimSpritePal_GuardRing, ANIM_TAG_GUARD_RING}")
  || !constants.includes("#define ANIM_TAG_GUARD_RING                 (ANIM_SPRITES_START + 244)")
  || safeguardMove?.id !== 219
  || safeguardMove?.frontierMonCount !== 7
  || JSON.stringify(safeguardGraph?.componentIds) !== JSON.stringify(expectedComponents)
  || carriers.length !== 7
  || firstCarrier?.index !== 180
  || firstCarrier?.label !== "FRONTIER_MON_BAYLEEF_1"
  || firstCarrier?.species !== "SPECIES_BAYLEEF"
  || JSON.stringify(firstCarrier?.moves) !== JSON.stringify([
    "MOVE_RAZOR_LEAF", "MOVE_TOXIC", "MOVE_SAFEGUARD", "MOVE_LIGHT_SCREEN",
  ])
  || firstCarrier?.itemName !== "BATTLE_FRONTIER_ITEM_BRIGHT_POWDER"
  || JSON.stringify(firstCarrier?.evSpreadStats) !== JSON.stringify([
    "F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP",
  ])
  || firstCarrier?.nature !== "NATURE_DOCILE"
  || status("MOVE_SWEET_SCENT") !== "exact"
  || status("MOVE_BARRIER") !== "exact"
  || status("MOVE_LIGHT_SCREEN") !== "exact"
) {
  throw new Error("MOVE_SAFEGUARD source/carrier/component/control contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_SAFEGUARD",
  sourceBounds: { start: "0x082cb6f7", endExclusive: "0x082cb739", bytes: "0x42" },
  carrier: "set 180 FRONTIER_MON_BAYLEEF_1 / SPECIES_BAYLEEF / MOVE_SAFEGUARD",
  components: expectedComponents,
  controls: {
    moves: ["MOVE_SWEET_SCENT", "MOVE_BARRIER", "MOVE_LIGHT_SCREEN"],
    statuses: ["exact", "exact", "exact"],
    independence: "Safeguard alone may receive future credit; named controls remain independently exact.",
  },
}));
