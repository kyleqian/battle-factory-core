import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const graphicsTable = read("reference/pokeemerald/src/data/battle_anim.h");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const start = scripts.indexOf("Move_PROTECT:");
const end = scripts.indexOf("Move_DETECT:", start);
if (start < 0 || end < 0) throw new Error("Protect source body missing");
const body = scripts.slice(start, end);
for (const literal of [
  "loadspritegfx ANIM_TAG_PROTECT", "monbg ANIM_ATK_PARTNER",
  "splitbgprio ANIM_ATTACKER",
  "waitplaysewithpan SE_M_REFLECT, SOUND_PAN_ATTACKER, 16",
  "createsprite gProtectSpriteTemplate, ANIM_ATTACKER, 2, 24, 0, 90",
  "waitforvisualfinish", "clearmonbg ANIM_ATK_PARTNER", "end",
]) if (!body.includes(literal)) throw new Error(`Move_PROTECT lost ${literal}`);
if (body.trim().split("\n").length !== 9) throw new Error("Protect body size changed");
for (const literal of [
  "const struct SpriteTemplate gProtectSpriteTemplate",
  ".tileTag = ANIM_TAG_PROTECT", ".paletteTag = ANIM_TAG_PROTECT",
  ".oam = &gOamData_AffineOff_ObjBlend_64x64", ".callback = AnimProtect",
  "GetBattlerSpriteCoord2(gBattleAnimAttacker, BATTLER_COORD_X) + cmd->unk0",
  "sprite->data[0] = cmd->unk2", "sprite->data[7] = 16",
  "sprite->data[5] += 96", "sprite->x2 = -(sprite->data[5] >> 8)",
  "gPlttBufferFaded[id] = gPlttBufferFaded[id + 1]",
  "DestroyAnimSpriteAndDisableBlend",
]) if (!effects.includes(literal)) throw new Error(`AnimProtect lost ${literal}`);
for (const literal of [
  "{gBattleAnimSpriteGfx_Protect, 0x0800, ANIM_TAG_PROTECT}",
  "{gBattleAnimSpritePal_Protect, ANIM_TAG_PROTECT}",
]) if (!graphicsTable.includes(literal)) throw new Error(`graphics table lost ${literal}`);
const houndour = mons.slice(mons.indexOf("[FRONTIER_MON_HOUNDOUR]"), mons.indexOf("[FRONTIER_MON_HOUNDOUR]") + 430);
const entry = inventory.tiers.level50.moves.find((item: { move: string }) => item.move === "MOVE_PROTECT");
if (!constants.includes("#define FRONTIER_MON_HOUNDOUR       119")
  || !houndour.includes(".species = SPECIES_HOUNDOUR")
  || !houndour.includes("{MOVE_CRUNCH, MOVE_EMBER, MOVE_ROAR, MOVE_PROTECT}")
  || !houndour.includes("BATTLE_FRONTIER_ITEM_CHARCOAL")
  || !houndour.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !houndour.includes("NATURE_DOCILE")
  || !entry || entry.id !== 182 || entry.exampleMons[0] !== "FRONTIER_MON_HOUNDOUR") {
  throw new Error("Protect inventory contract changed");
}
const nm = execFileSync("arm-none-eabi-nm", ["-a", "reference/pokeemerald/pokeemerald.elf"], {
  encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
});
if (!nm.includes("082cb3b5 d Move_PROTECT") || !nm.includes("082cb3d2 d Move_DETECT")) {
  throw new Error("Protect nm bounds changed");
}
console.log(JSON.stringify({
  move: "MOVE_PROTECT", moveId: 182,
  sourceBounds: { start: "0x082cb3b4", endInclusive: "0x082cb3d1", byteBody: "0x1e" },
  lowestCarrier: "set 119 FRONTIER_MON_HOUNDOUR / SPECIES_HOUNDOUR 228",
  components: ["asset:ANIM_TAG_PROTECT", "sprite:gProtectSpriteTemplate", "visualCommand:monbg", "visualCommand:splitbgprio", "visualCommand:clearmonbg"],
}));
