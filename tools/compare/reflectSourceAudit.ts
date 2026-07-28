// Source-only guardrail for the BLUE_LIGHT_WALL component track. This does
// not promote siblings: their move-owned bodies remain independently distinct.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
const psychic = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_psychic.c"), "utf8");
const fight = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_fight.c"), "utf8");
const dark = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_dark.c"), "utf8");
function body(label: string, next: string): string {
  const start = scripts.indexOf(`${label}:`), end = scripts.indexOf(`${next}:`, start);
  if (start < 0 || end < 0) throw new Error(`missing ${label}`);
  return scripts.slice(start, end);
}
const reflect = body("Move_REFLECT", "Move_BARRIER");
const brick = body("Move_BRICK_BREAK", "Move_SLACK_OFF");
const crush = body("Move_CRUSH_CLAW", "Move_AROMATHERAPY");
for (const literal of [
  "loadspritegfx ANIM_TAG_SPARKLE_4", "loadspritegfx ANIM_TAG_BLUE_LIGHT_WALL",
  "setalpha 0, 16", "waitplaysewithpan SE_M_REFLECT, SOUND_PAN_ATTACKER, 15",
  "createsprite gReflectWallSpriteTemplate, ANIM_ATTACKER, 1, 40, 0, ANIM_TAG_BLUE_LIGHT_WALL",
  "createsprite gReflectSparkleSpriteTemplate, ANIM_ATTACKER, 2, 30, 0, ANIM_ATTACKER, TRUE",
  "createsprite gReflectSparkleSpriteTemplate, ANIM_ATTACKER, 2, 19, -12, ANIM_ATTACKER, TRUE",
  "createsprite gReflectSparkleSpriteTemplate, ANIM_ATTACKER, 2, 10, 20, ANIM_ATTACKER, TRUE",
  "blendoff",
] as const) if (!reflect.includes(literal)) throw new Error(`REFLECT lost ${literal}`);
if (!psychic.includes("gReflectWallSpriteTemplate") || !psychic.includes("AnimDefensiveWall")
  || !psychic.includes("ANIMCMD_FRAME(64, 3)") || !psychic.includes("DestroySpriteAndMatrix")) {
  throw new Error("Reflect wall/sparkle template contract changed");
}
if (!brick.includes("choosetwoturnanim BrickBreakNormal, BrickBreakShatteredWall")
  || !brick.includes("gBrickBreakWallSpriteTemplate") || !brick.includes("gBrickBreakWallShardSpriteTemplate")
  || !fight.includes("AnimBrickBreakWall") || !fight.includes("AnimBrickBreakWallShard")) {
  throw new Error("Brick Break's independent shattered-wall branch changed");
}
if (!crush.includes("loadspritegfx ANIM_TAG_BLUE_LIGHT_WALL") || crush.includes("gReflectWallSpriteTemplate")
  || !crush.includes("gHorizontalLungeSpriteTemplate") || !crush.includes("create_claw_slash_sprite")
  || !dark.includes("AnimClawSlash")) throw new Error("Crush Claw audit changed");
console.log(JSON.stringify({
  move: "MOVE_REFLECT", body: "wall + three SPARKLE_4 sprites + alpha/audio/teardown",
  siblingsRemainUnsupported: {
    MOVE_BRICK_BREAK: "loads BLUE_LIGHT_WALL but chooses normal or separate gBrickBreakWall/shard shattered-wall body",
    MOVE_CRUSH_CLAW: "loads BLUE_LIGHT_WALL yet creates no wall template; its lunge/shake/four claw-slash body is distinct",
  },
}, null, 2));
