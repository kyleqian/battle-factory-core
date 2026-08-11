import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const body = scripts.slice(
  scripts.indexOf("Move_SLEEP_TALK:"),
  scripts.indexOf("Move_HYPER_FANG:"),
);
const callback = effects.slice(
  effects.indexOf("static void AnimLetterZ(struct Sprite *sprite)\n{"),
  effects.indexOf("static void AnimFang(struct Sprite *sprite)"),
);
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_SEAKING_2]"),
  mons.indexOf("[FRONTIER_MON_SEAKING_2]") + 500,
);

const requiredBody = [
  "loadspritegfx ANIM_TAG_LETTER_Z",
  "createvisualtask AnimTask_SwayMon, 5, 0, 4, 4096, 2, ANIM_ATTACKER",
  "playsewithpan SE_M_SNORE, SOUND_PAN_ATTACKER",
  "waitforvisualfinish",
  "end",
];
const requiredTemplate = [
  ".oam = &gOamData_AffineNormal_ObjNormal_32x32",
  "ANIMCMD_FRAME(0, 3)",
  "AFFINEANIMCMD_FRAME(-7, -7, -3, 16)",
  "AFFINEANIMCMD_FRAME(7, 7, 3, 16)",
  ".callback = AnimLetterZ",
];
const requiredCallback = [
  "SetSpriteCoordsToAnimAttackerCoords(sprite)",
  "sprite->data[1] = -1 * gBattleAnimArgs[2]",
  "sprite->data[0]++",
  "var0 = (sprite->data[0] * 20) & 0xFF",
  "sprite->x2 = sprite->data[3] / 2",
  "sprite->y2 = Sin(var0 & 0xFF, 5) + (sprite->data[4] / 2)",
  "if ((u16)(sprite->x + sprite->x2) > DISPLAY_WIDTH)",
];
if (
  !constants.includes("#define FRONTIER_MON_SEAKING_2      333")
  || !carrier.includes(".species = SPECIES_SEAKING")
  || !carrier.includes(".moves = {MOVE_HORN_DRILL, MOVE_MEGAHORN, MOVE_SLEEP_TALK, MOVE_REST}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_QUICK_CLAW")
  || !carrier.includes("F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP")
  || !carrier.includes("NATURE_IMPISH")
  || requiredBody.some((token) => !body.includes(token))
  || (body.match(/gLetterZSpriteTemplate/g) ?? []).length !== 9
  || (body.match(/playsewithpan SE_M_SNORE/g) ?? []).length !== 3
  || requiredTemplate.some((token) => !effects.includes(token))
  || requiredCallback.some((token) => !callback.includes(token))
  || !movement.includes("void AnimTask_SwayMon(u8 taskId)")
  || !movement.includes("gTasks[taskId].data[12] = 1")
  || !movement.includes("DestroyAnimVisualTask(taskId)")
) throw new Error("Sleep Talk source contract changed");

console.log(JSON.stringify({
  move: "MOVE_SLEEP_TALK",
  moveId: 214,
  carrier: 333,
  letterSprites: 9,
  snoreCues: 3,
  symbols: {
    move: "0x082d4473",
    template: "0x085ce190",
    callback: "0x0815a7ec",
  },
}));
