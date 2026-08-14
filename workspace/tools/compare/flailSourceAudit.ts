import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const random = read("reference/pokeemerald/src/random.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const nm = execFileSync("arm-none-eabi-nm", [
  "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const block = (start: string, end: string): string => scripts.slice(
  scripts.indexOf(`${start}:`), scripts.indexOf(`${end}:`),
);
const flail = block("Move_FLAIL", "Move_SPITE");
const luster = block("Move_LUSTER_PURGE", "Move_MIST_BALL");
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_FLAIL",
);
const sibling = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_LUSTER_PURGE",
);
const krabby = mons.slice(
  mons.indexOf("[FRONTIER_MON_KRABBY]"),
  mons.indexOf("[FRONTIER_MON_EXEGGCUTE]"),
);

const flailLines = [
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_TARGET",
  "setalpha 12, 8",
  "createvisualtask AnimTask_FlailMovement, 2, ANIM_ATTACKER",
  "loopsewithpan SE_M_HEADBUTT, SOUND_PAN_ATTACKER, 8, 2",
  "waitforvisualfinish",
  "create_random_pos_hitsplat_sprite ANIM_TARGET, 3, relative_to=ANIM_TARGET, animation=3",
  "createvisualtask AnimTask_ShakeTargetBasedOnMovePowerOrDmg, 2, FALSE, 1, 30, 1, 0",
  "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET",
  "clearmonbg ANIM_TARGET",
  "blendoff",
  "end",
];
const lusterRemainder = [
  "fadetobg BG_PSYCHIC",
  "createvisualtask AnimTask_FadeScreenToWhite, 5",
  "createsprite gLusterPurgeCircleSpriteTemplate",
  "createvisualtask AnimTask_BlendBattleAnimPalExclude",
  "createvisualtask AnimTask_BlendParticle",
  "createvisualtask SoundTask_PlaySE1WithPanning",
  "createvisualtask AnimTask_HorizontalShake",
  "call UnsetPsychicBackground",
];
const flailMovement = effects.slice(
  effects.indexOf("void AnimTask_FlailMovement(u8 taskId)"),
  effects.indexOf("// Makes a spark-like projectile fall on top of the mon."),
);
const randomHit = normal.slice(
  normal.indexOf("static void AnimHitSplatRandom(struct Sprite *sprite)"),
  normal.indexOf("static void AnimHitSplatOnMonEdge(struct Sprite *sprite)"),
);
const powerShake = movement.slice(
  movement.indexOf("void AnimTask_ShakeTargetBasedOnMovePowerOrDmg(u8 taskId)"),
);

const checks: Readonly<Record<string, boolean>> = {
  intervals: address("Move_FLAIL") === 0x082cd4f9
    && address("Move_SPITE") === 0x082cd536
    && address("Move_LUSTER_PURGE") === 0x082ce517
    && address("Move_MIST_BALL") === 0x082ce62e,
  symbols: address("gRandomPosHitSplatSpriteTemplate") === 0x085973a0
    && address("gRng2Value") === 0x03005d84,
  flailScript: flailLines.every((line) => flail.includes(line))
    && (flail.match(/create_random_pos_hitsplat_sprite/g) ?? []).length === 1,
  flailMovement: [
    "task->data[12] = 0x20;", "task->data[13] = 0x40;",
    "task->data[14] = 0x800;",
    "SetSpriteRotScale(task->data[15], 0x100, 0x100, task->data[2]);",
    "gSprites[task->data[15]].x2 = -",
  ].every((token) => flailMovement.includes(token)),
  randomHit: [
    "if (cmd->animation == -1)", "cmd->animation = Random2() & 3;",
    "sprite->x2 += (Random2() % 48) - 24;",
    "sprite->y2 += (Random2() % 24) - 12;",
  ].every((token) => randomHit.includes(token)),
  powerShake: [
    "gTasks[taskId].data[15] = gAnimMovePower / 12;",
    "if (gTasks[taskId].data[15] > 16)",
    "gTasks[taskId].data[2] = gBattleAnimArgs[2];",
  ].every((token) => powerShake.includes(token)),
  rng2: random.includes("gRng2Value = ISO_RANDOMIZE1(gRng2Value);")
    && random.includes("return gRng2Value >> 16;"),
  inventory: Boolean(move) && move.id === 175 && move.frontierMonCount === 11
    && move.speciesCount === 11
    && move.exampleMons.join() === "FRONTIER_MON_KRABBY,FRONTIER_MON_EEVEE,FRONTIER_MON_KINGLER_2",
  carrier: constants.includes("FRONTIER_MON_KRABBY")
    && [".species = SPECIES_KRABBY", ".moves = {MOVE_CRABHAMMER, MOVE_MUD_SHOT, MOVE_FLAIL, MOVE_KNOCK_OFF}",
      "BATTLE_FRONTIER_ITEM_FOCUS_BAND", "F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP", "NATURE_HARDY"]
      .every((token) => krabby.includes(token)),
  luster: lusterRemainder.every((line) => luster.includes(line))
    && (luster.match(/create_random_pos_hitsplat_sprite/g) ?? []).length === 6
    && Boolean(sibling) && sibling.id === 295 && sibling.frontierMonCount === 2,
};
const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`MOVE_FLAIL source contract changed: ${failed.join(", ")}`);

console.log(
  "MOVE_FLAIL exclusive 0x082cd4f9..0x082cd536 (0x3d bytes); 11 Level-50 legal species; "
  + "set 111 KRABBY is the lowest inventory carrier; fixed animation 3 consumes exactly two Random2 calls for x/y placement; "
  + "FlailMovement owns the live attacker rot-scale/x2 path; power-shake amplitude is clamp(gAnimMovePower/12,1,16).",
);
console.log(
  "MOVE_LUSTER_PURGE batch audit only: exclusive 0x082ce517..0x082ce62e, two LATIOS carriers, six RNG hitsplats, "
  + "psychic/white background, FadeScreenToWhite, luster circle, two particle blends, six sound tasks, HorizontalShake, and restore remain unsupported.",
);
