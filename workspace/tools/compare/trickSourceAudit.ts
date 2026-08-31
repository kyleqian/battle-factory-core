/** Authoritative MOVE_TRICK source/component/carrier audit. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects2 = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const monMovement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animationData = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const covetAsset = JSON.parse(read("src/animation/assets/covet.json"));
const extremeSpeedAsset = JSON.parse(read("src/assets/gen/battle-anim-extreme-speed.json"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});

function address(symbol: string): number {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
}

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to <= from) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const move = block(scripts, "Move_TRICK", "Move_WISH");
const expectedComponents = [
  "asset:ANIM_TAG_ITEM_BAG",
  "asset:ANIM_TAG_SPEED_DUST",
  "task:AnimTask_ShakeMon",
  "task:AnimTask_StretchAttackerUp",
  "task:AnimTask_StretchTargetUp",
  "visualCommand:create_trick_bag_sprite",
];
const moveInventory = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_TRICK");
const moveGraph = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_TRICK");
const level50 = inventory.tiers.level50.monIndices;
const carriers = mons.entries.filter((entry: { index: number; moves: string[] }) =>
  entry.index >= level50.first && entry.index <= level50.last && entry.moves.includes("MOVE_TRICK"),
);
const carrier = carriers[0];
const status = (moveName: string): string | undefined => coverage.entries.find(
  (entry: { move: string }) => entry.move === moveName,
)?.status;
const trickBagTemplate = effects1.slice(
  effects1.indexOf("const struct SpriteTemplate gTrickBagSpriteTemplate"),
  effects1.indexOf("const s8 gTrickBagCoordinates"),
);
const speedDustTemplate = effects2.slice(
  effects2.indexOf("const struct SpriteTemplate gSpeedDustSpriteTemplate"),
  effects2.indexOf("const s8 gSpeedDustPosTable"),
);

const expectedScriptRows = [
  "loadspritegfx ANIM_TAG_ITEM_BAG",
  "loadspritegfx ANIM_TAG_SPEED_DUST",
  "create_trick_bag_sprite ANIM_ATTACKER, 2, initial_y=-40, wave_offset=80",
  "create_trick_bag_sprite ANIM_ATTACKER, 2, initial_y=-40, wave_offset=208",
  "delay 16",
  "playsewithpan SE_M_SKETCH, 0",
  "createvisualtask AnimTask_StretchTargetUp, 3",
  "createvisualtask AnimTask_StretchAttackerUp, 3",
  "delay 30",
  "playsewithpan SE_M_ATTRACT, 0",
  "createvisualtask AnimTask_ShakeMon, 3, ANIM_ATTACKER, 5, 0, 7, 2",
  "createvisualtask AnimTask_ShakeMon, 3, ANIM_TARGET, 5, 0, 7, 2",
  "waitforvisualfinish",
  "end",
];

if (
  address("Move_TRICK") !== 0x082d_486e
  || address("Move_WISH") !== 0x082d_48ec
  || address("gTrickBagSpriteTemplate") !== 0x0859_26e8
  || address("gSpeedDustSpriteTemplate") !== 0x0859_38dc
  || address("AnimTrickBag") !== 0x080f_fdbc
  || address("AnimTask_ShakeMon") !== 0x080d_51ac
  || address("AnimTask_StretchTargetUp") !== 0x0810_6020
  || address("AnimTask_StretchAttackerUp") !== 0x0810_60b0
  || expectedScriptRows.some((row) => !move.includes(row))
  || (move.match(/playsewithpan SE_M_DOUBLE_TEAM, 0/g) ?? []).length !== 6
  || !trickBagTemplate.includes(".tileTag = ANIM_TAG_ITEM_BAG")
  || !trickBagTemplate.includes(".oam = &gOamData_AffineNormal_ObjNormal_32x32")
  || !trickBagTemplate.includes(".affineAnims = gTrickBagAffineAnimTable")
  || !trickBagTemplate.includes(".callback = AnimTrickBag")
  || !effects1.includes("sprite->x = 120")
  || !effects1.includes("sprite->x2 = Cos(sprite->data[1], 60)")
  || !effects1.includes("sprite->y2 = Sin(sprite->data[1], 20)")
  || !effects1.includes("sprite->subpriority = 31")
  || !effects1.includes("sprite->invisible = sprite->data[0] % 2")
  || !effects1.includes("AFFINEANIMCMD_FRAME(0, -10, 0, 3)")
  || !effects1.includes("AFFINEANIMCMD_FRAME(0, 10, 0, 3)")
  || !speedDustTemplate.includes(".tileTag = ANIM_TAG_SPEED_DUST")
  || !speedDustTemplate.includes(".callback = AnimSpeedDust")
  || !effects2.includes("void AnimTask_StretchTargetUp(u8 taskId)")
  || !effects2.includes("void AnimTask_StretchAttackerUp(u8 taskId)")
  || !effects2.includes("AFFINEANIMCMD_FRAME(0x000A, 0xFFF3, 0x00, 0x0A)")
  || !effects2.includes("AFFINEANIMCMD_FRAME(0xFFF6, 0x000D, 0x00, 0x0A)")
  || !monMovement.includes("void AnimTask_ShakeMon(u8 taskId)")
  || !monMovement.includes("static void AnimTask_ShakeMon_Step(u8 taskId)")
  || move.includes("gSpeedDustSpriteTemplate")
  || move.includes("AnimTask_SpeedDust")
  || !graphics.includes('gBattleAnimSpriteGfx_ItemBag[] = INCGFX_U32("graphics/battle_anims/sprites/item_bag.png"')
  || !graphics.includes('gBattleAnimSpriteGfx_SpeedDust[] = INCGFX_U32("graphics/battle_anims/sprites/speed_dust.png"')
  || !animationData.includes("{gBattleAnimSpriteGfx_ItemBag, 0x0200, ANIM_TAG_ITEM_BAG}")
  || !animationData.includes("{gBattleAnimSpriteGfx_SpeedDust, 0x0180, ANIM_TAG_SPEED_DUST}")
  || !constants.includes("#define ANIM_TAG_SPEED_DUST                 (ANIM_SPRITES_START + 207)")
  || !constants.includes("#define ANIM_TAG_ITEM_BAG                   (ANIM_SPRITES_START + 224)")
  || covetAsset.source?.itemBag !== "graphics/battle_anims/sprites/item_bag.png; ANIM_TAG_ITEM_BAG 10224"
  || extremeSpeedAsset.source !== "Move_EXTREME_SPEED -> BG_HIGHSPEED_{OPPONENT,PLAYER} and ANIM_TAG_SPEED_DUST"
  || moveInventory?.id !== 271
  || moveInventory?.frontierMonCount !== 5
  || JSON.stringify(moveGraph?.componentIds) !== JSON.stringify(expectedComponents)
  || carriers.length !== 5
  || carrier?.index !== 304
  || carrier?.label !== "FRONTIER_MON_FURRET_2"
  || carrier?.species !== "SPECIES_FURRET"
  || JSON.stringify(carrier?.moves) !== JSON.stringify(["MOVE_TRICK", "MOVE_FRUSTRATION", "MOVE_SHADOW_BALL", "MOVE_FOLLOW_ME"])
  || carrier?.itemName !== "BATTLE_FRONTIER_ITEM_CHOICE_BAND"
  || status("MOVE_PRESENT") !== "exact"
  || status("MOVE_COVET") !== "exact"
  || status("MOVE_EXTREME_SPEED") !== "exact"
  || status("MOVE_FAKE_OUT") !== "exact"
  || status("MOVE_ASTONISH") !== "exact"
  || status("MOVE_SAND_TOMB") !== "exact"
) {
  throw new Error("MOVE_TRICK source/carrier/component/control contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_TRICK",
  sourceBounds: { start: "0x082d486e", endExclusive: "0x082d48ec", bytes: "0x7e" },
  carrier: "set 304 FRONTIER_MON_FURRET_2 / SPECIES_FURRET / MOVE_TRICK",
  components: expectedComponents,
  resources: {
    itemBag: "reused covet.json identity: item_bag.png / tag 10224",
    speedDust: "reused battle-anim-extreme-speed.json identity: speed_dust.png / tag 10207; resource-only in Move_TRICK",
  },
  controls: {
    moves: ["MOVE_PRESENT", "MOVE_COVET", "MOVE_EXTREME_SPEED", "MOVE_FAKE_OUT", "MOVE_ASTONISH", "MOVE_SAND_TOMB"],
    statuses: ["exact", "exact", "exact", "exact", "exact", "exact"],
    independence: "Controls are checked only; MOVE_TRICK alone may receive future credit.",
  },
}));
