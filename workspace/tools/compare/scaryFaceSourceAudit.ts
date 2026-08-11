import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const scripts = readFileSync(
  resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"),
  "utf8",
);
const fire = readFileSync(
  resolve(root, "reference/pokeemerald/src/battle_anim_fire.c"),
  "utf8",
);
const effects = readFileSync(
  resolve(root, "reference/pokeemerald/src/battle_anim_effects_2.c"),
  "utf8",
);

function body(label: string, nextLabel: string): string {
  const start = scripts.indexOf(`${label}:`);
  const end = scripts.indexOf(`${nextLabel}:`, start);
  if (start < 0 || end < 0) throw new Error(`missing ${label} source body`);
  return scripts.slice(start, end);
}

const scary = body("Move_SCARY_FACE", "Move_SWEET_KISS");
const glare = body("Move_GLARE", "Move_BARRAGE");
const thunder = body("Move_THUNDER", "Move_THUNDER_PUNCH");
const triAttack = body("Move_TRI_ATTACK", "Move_WILL_O_WISP");

const scaryRequired = [
  "loadspritegfx ANIM_TAG_EYE_SPARKLE",
  "simple_palette_blend selector=F_PAL_BG | F_PAL_ATK_SIDE | F_PAL_DEF_PARTNER, delay=3, initial_blend_y=0, target_blend_y=16, color=RGB_BLACK",
  "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER",
  "delay 10",
  "playsewithpan SE_M_LEER, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_ScaryFace, 5",
  "delay 13",
  "createsprite gEyeSparkleSpriteTemplate, ANIM_ATTACKER, 0, -16, -8",
  "createsprite gEyeSparkleSpriteTemplate, ANIM_ATTACKER, 0, 16, -8",
  "createvisualtask AnimTask_ShakeTargetInPattern, 3, 20, 1, FALSE",
  "playsewithpan SE_M_STRING_SHOT2, SOUND_PAN_TARGET",
  "simple_palette_blend selector=F_PAL_BG | F_PAL_ATK_SIDE | F_PAL_DEF_PARTNER, delay=3, initial_blend_y=16, target_blend_y=0, color=RGB_BLACK",
] as const;
for (const literal of scaryRequired) {
  if (!scary.includes(literal)) throw new Error(`SCARY_FACE lost literal: ${literal}`);
}
const shakeLiteral = "createvisualtask AnimTask_ShakeTargetInPattern, 3, 20, 1, FALSE";
const reverseBlend =
  "simple_palette_blend selector=F_PAL_BG | F_PAL_ATK_SIDE | F_PAL_DEF_PARTNER, delay=3, initial_blend_y=16, target_blend_y=0, color=RGB_BLACK";
if (scary.indexOf(reverseBlend) < scary.indexOf(shakeLiteral)) {
  throw new Error("SCARY_FACE no longer overwrites shared args after shake creation");
}

if (!effects.includes("gBattleAnimBgTilemap_ScaryFacePlayer")
  || !effects.includes("gBattleAnimBgTilemap_ScaryFaceOpponent")
  || !effects.includes("BLDALPHA_BLEND(gTasks[taskId].data[11], 16 - gTasks[taskId].data[11])")
  || !effects.includes("ANIMCMD_FRAME(8, 4)")
  || !effects.includes("InitSpritePosToAnimAttacker(sprite, TRUE)")) {
  throw new Error("SCARY_FACE BG/eye source contract changed");
}
if (!fire.includes("static const s8 sShakeDirsPattern0")
  || !fire.includes("gBattleAnimArgs[0]")
  || !fire.includes("gBattleAnimArgs[1] * dir")) {
  throw new Error("ShakeTargetInPattern source contract changed");
}

const siblingDifferences = {
  GLARE: glare.includes("AnimTask_GlareEyeDots")
    && glare.includes("createvisualtask AnimTask_ShakeTargetInPattern, 3, 20, 1, FALSE"),
  THUNDER: thunder.includes("createvisualtask AnimTask_ShakeTargetInPattern, 2, 30, 3, TRUE, 0")
    && thunder.includes("fadetobg BG_THUNDER"),
  TRI_ATTACK: triAttack.includes("createvisualtask AnimTask_ShakeTargetInPattern, 2, 20, 3, TRUE, 1")
    && triAttack.includes("createvisualtask AnimTask_ShakeTargetInPattern, 2, 20, 3, TRUE, 0")
    && triAttack.includes("gTriAttackTriangleSpriteTemplate"),
};
if (Object.values(siblingDifferences).some((proved) => !proved)) {
  throw new Error("patterned-shake sibling audit changed");
}

console.log(JSON.stringify({
  move: "MOVE_SCARY_FACE",
  taskLiteral: { maxShakes: 20, offset: 1, vertical: false, pattern: 0 },
  observedDelayedRuntimeArgs: {
    maxShakes: 20, offset: 3, vertical: false, pattern: 16,
  },
  eyeFrames: [0, 4, 8, 4, 0],
  eyeFrameDuration: 4,
  siblingsRemainUnsupported: Object.keys(siblingDifferences),
}, null, 2));
