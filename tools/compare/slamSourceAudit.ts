import { readFileSync } from "node:fs";

const scripts = readFileSync(
  "reference/pokeemerald/data/battle_anim_scripts.s",
  "utf8",
);
const effects = readFileSync(
  "reference/pokeemerald/src/battle_anim_effects_1.c",
  "utf8",
);
const mons = readFileSync(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
  "utf8",
);

function block(source: string, label: string, nextLabel: string): string {
  const start = source.indexOf(`${label}:`);
  const end = source.indexOf(`${nextLabel}:`, start + label.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${label}/${nextLabel}`);
  return source.slice(start, end);
}

function requireText(body: string, text: string): void {
  if (!body.includes(text)) throw new Error(`missing source text: ${text}`);
}

const slam = block(scripts, "Move_SLAM", "Move_VINE_WHIP");
for (const text of [
  "loadspritegfx ANIM_TAG_SLAM_HIT",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_TARGET",
  "setalpha 12, 8",
  "playsewithpan SE_M_COMET_PUNCH, SOUND_PAN_ATTACKER",
  "gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 0, 20, 3, 0, 4",
  "gSlamHitSpriteTemplate, ANIM_ATTACKER, 2, 0, 0",
  "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=1",
  "gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 1, -12, 10, 0, 3",
  "gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 5",
  "AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 0, 3, 6, 1",
  "gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 1, 0, 6",
  "clearmonbg ANIM_TARGET",
  "blendoff",
]) requireText(slam, text);

for (const text of [
  "ANIMCMD_FRAME(64, 3)",
  "ANIMCMD_FRAME(80, 3)",
  "ANIMCMD_FRAME(96, 3)",
  "ANIMCMD_FRAME(112, 6)",
  "const struct SpriteTemplate gSlamHitSpriteTemplate",
  ".callback = AnimWhipHit",
  "StartSpriteAnim(sprite, 1)",
  "SetAnimSpriteInitialXOffset(sprite, cmd->unk0)",
  "sprite->callback = AnimWhipHit_WaitEnd",
]) requireText(effects, text);

const carrierStart = mons.indexOf("[FRONTIER_MON_LICKITUNG_1] = {");
const carrierEnd = mons.indexOf("[FRONTIER_MON_WEEPINBELL_1] = {", carrierStart);
if (carrierStart < 0 || carrierEnd < 0) {
  throw new Error("missing FRONTIER_MON_LICKITUNG_1 source block");
}
const carrier = mons.slice(carrierStart, carrierEnd);
for (const text of [
  ".species = SPECIES_LICKITUNG",
  ".moves = {MOVE_SLAM, MOVE_BRICK_BREAK, MOVE_LICK, MOVE_MUD_SLAP}",
  ".itemTableId = BATTLE_FRONTIER_ITEM_SITRUS_BERRY",
  ".evSpread = F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP",
  ".nature = NATURE_QUIRKY",
]) requireText(carrier, text);

const secretPower = block(scripts, "Move_SECRET_POWER", "Move_TWISTER");
requireText(
  secretPower,
  "jumpargeq 0, BATTLE_ENVIRONMENT_BUILDING,   Move_STRENGTH",
);
requireText(secretPower, "goto Move_SLAM");

console.log(JSON.stringify({
  move: "MOVE_SLAM",
  carrier: {
    setId: 164,
    set: "FRONTIER_MON_LICKITUNG_1",
    species: 108,
    nature: "NATURE_QUIRKY",
    item: "ITEM_SITRUS_BERRY",
  },
  body: {
    slamHitFrames: [64, 80, 96, 112],
    slamHitDurations: [3, 3, 3, 6],
    reused: [
      "ANIM_TAG_IMPACT",
      "gSlideMonToOffsetSpriteTemplate",
      "gSlideMonToOriginalPosSpriteTemplate",
      "AnimTask_ShakeMonInPlace",
    ],
  },
  sibling: {
    MOVE_SECRET_POWER:
      "unsupported: Factory BATTLE_ENVIRONMENT_BUILDING dispatches Move_STRENGTH; only the final non-Factory fallback reaches Move_SLAM",
  },
}));
