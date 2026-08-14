import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const anim = read("reference/pokeemerald/src/battle_anim.c");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const ground = read("reference/pokeemerald/src/battle_anim_ground.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const sound = read("reference/pokeemerald/src/battle_anim_sound_tasks.c");
const psychic = read("reference/pokeemerald/src/battle_anim_psychic.c");
const random = read("reference/pokeemerald/src/random.c");
const graphics = read("reference/pokeemerald/src/data/battle_anim.h");
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});

const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const sourceBytes = (start: number, endExclusive: number): string => sha256(
  rom.subarray(start - 0x08000000, endExclusive - 0x08000000),
);
const block = (start: string, end: string): string => {
  const from = scripts.indexOf(`${start}:`);
  const to = scripts.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing script block ${start}/${end}`);
  return scripts.slice(from, to);
};
const luster = block("Move_LUSTER_PURGE", "Move_MIST_BALL");
const unset = block("UnsetPsychicBackground", "SetSkyBg");
const lusterCommands = luster.split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
const unsetCommands = unset.split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
const lusterMove = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_LUSTER_PURGE");
const level50 = inventory.tiers.level50.monIndices;
const carriers = mons.entries.filter((entry: { index: number; moves: string[] }) =>
  entry.index >= level50.first && entry.index <= level50.last && entry.moves.includes("MOVE_LUSTER_PURGE"));

const expectedComponents = [
  "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_WHITE_CIRCLE_OF_LIGHT",
  "sprite:gLusterPurgeCircleSpriteTemplate", "subroutine:UnsetPsychicBackground",
  "task:AnimTask_BlendBattleAnimPalExclude", "task:AnimTask_BlendParticle",
  "task:AnimTask_FadeScreenToWhite", "task:AnimTask_HorizontalShake",
  "task:SoundTask_PlaySE1WithPanning", "visualCommand:blendoff",
  "visualCommand:clearmonbg", "visualCommand:create_random_pos_hitsplat_sprite",
  "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg",
  "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:waitbgfadein",
  "visualCommand:waitbgfadeout",
] as const;
const expectedScriptCommands = [
  "loadspritegfx ANIM_TAG_WHITE_CIRCLE_OF_LIGHT", "loadspritegfx ANIM_TAG_IMPACT",
  "fadetobg BG_PSYCHIC", "waitbgfadeout", "createvisualtask AnimTask_FadeScreenToWhite, 5",
  "waitbgfadein", "monbg ANIM_ATTACKER", "setalpha 12, 8",
  "playsewithpan SE_M_SOLAR_BEAM, SOUND_PAN_ATTACKER",
  "createsprite gLusterPurgeCircleSpriteTemplate, ANIM_ATTACKER, 41, 0, 0, 0, 0",
  "delay 20", "createvisualtask AnimTask_BlendBattleAnimPalExclude, 5, 5, 2, 0, 16, RGB_WHITEALPHA",
  "createvisualtask AnimTask_BlendParticle, 5, ANIM_TAG_WHITE_CIRCLE_OF_LIGHT, 2, 0, 16, RGB_WHITEALPHA",
  "waitforvisualfinish", "createvisualtask AnimTask_BlendParticle, 5, ANIM_TAG_IMPACT, 0, 12, 12, RGB(0, 0, 23)",
  "waitforvisualfinish",
  "create_random_pos_hitsplat_sprite ANIM_TARGET, 3, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask SoundTask_PlaySE1WithPanning, 5, SE_M_HYPER_BEAM, SOUND_PAN_TARGET",
  "delay 3",
  "create_random_pos_hitsplat_sprite ANIM_TARGET, 3, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask SoundTask_PlaySE1WithPanning, 5, SE_M_HYPER_BEAM, SOUND_PAN_TARGET",
  "delay 3",
  "create_random_pos_hitsplat_sprite ANIM_TARGET, 3, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask SoundTask_PlaySE1WithPanning, 5, SE_M_HYPER_BEAM, SOUND_PAN_TARGET",
  "delay 3",
  "create_random_pos_hitsplat_sprite ANIM_TARGET, 3, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask SoundTask_PlaySE1WithPanning, 5, SE_M_HYPER_BEAM, SOUND_PAN_TARGET",
  "delay 3",
  "create_random_pos_hitsplat_sprite ANIM_TARGET, 3, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask SoundTask_PlaySE1WithPanning, 5, SE_M_HYPER_BEAM, SOUND_PAN_TARGET",
  "delay 3",
  "create_random_pos_hitsplat_sprite ANIM_TARGET, 3, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask SoundTask_PlaySE1WithPanning, 5, SE_M_HYPER_BEAM, SOUND_PAN_TARGET",
  "waitforvisualfinish", "createvisualtask AnimTask_BlendBattleAnimPalExclude, 5, 5, 2, 16, 0, RGB_WHITEALPHA",
  "createvisualtask AnimTask_HorizontalShake, 5, ANIM_TARGET, 5, 14", "waitforvisualfinish",
  "clearmonbg ANIM_ATTACKER", "blendoff", "call UnsetPsychicBackground", "end",
] as const;
const expectedUnsetCommands = ["restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein", "return"] as const;

const sourceRanges = {
  moveScript: [0x082ce517, 0x082ce62e],
  unsetPsychicBackground: [0x082d7cdd, 0x082d7ce5],
  circleTemplate: [0x0859687c, 0x085968b0],
  blendBattleAnimPalExclude: [0x08116664, 0x0811675c],
  blendParticleBothTasks: [0x08116848, 0x08116960],
  fadeScreenToWhite: [0x0815a5c8, 0x0815adb0],
  horizontalShake: [0x081152dc, 0x08115588],
  soundSE1WithPanning: [0x08159210, 0x08159244],
} as const;
const sourceRom = Object.fromEntries(Object.entries(sourceRanges).map(([name, [start, end]]) => [name, {
  start: `0x${start.toString(16).padStart(8, "0")}`,
  endExclusive: `0x${end.toString(16).padStart(8, "0")}`,
  bytes: end - start, sha256: sourceBytes(start, end),
}]));

const checks: Record<string, boolean> = {
  intervals: address("Move_LUSTER_PURGE") === 0x082ce517
    && address("Move_MIST_BALL") === 0x082ce62e
    && address("UnsetPsychicBackground") === 0x082d7cdd
    && address("SetSkyBg") === 0x082d7ce5,
  script: JSON.stringify(lusterCommands) === JSON.stringify(expectedScriptCommands)
    && (luster.match(/create_random_pos_hitsplat_sprite/g) ?? []).length === 6
    && (luster.match(/SoundTask_PlaySE1WithPanning/g) ?? []).length === 6
    && (luster.match(/Random2/g) ?? []).length === 0,
  unset: JSON.stringify(unsetCommands) === JSON.stringify(expectedUnsetCommands),
  components: Boolean(lusterMove) && JSON.stringify(lusterMove.componentIds) === JSON.stringify(expectedComponents),
  carrier: carriers.length === 2 && carriers[0]?.index === 799 && carriers[0]?.label === "FRONTIER_MON_LATIOS_4"
    && carriers[0]?.species === "SPECIES_LATIOS" && carriers[0]?.nature === "NATURE_MODEST"
    && JSON.stringify(carriers[0]?.moves) === JSON.stringify([
      "MOVE_LUSTER_PURGE", "MOVE_THUNDERBOLT", "MOVE_ICE_BEAM", "MOVE_DRAGON_CLAW",
    ]),
  assets: graphics.includes("gBattleAnimSpriteGfx_CircleOfLight")
    && graphics.includes("ANIM_TAG_WHITE_CIRCLE_OF_LIGHT")
    && graphics.includes("gBattleAnimSpriteGfx_Impact")
    && graphics.includes("ANIM_TAG_IMPACT")
    && psychic.includes("gLusterPurgeCircleSpriteTemplate"),
  fadeWhite: effects.includes("void AnimTask_FadeScreenToWhite(u8 taskId)")
    && effects.includes("gPlttBufferUnfaded") && effects.includes("FadeScreenToWhite_Step"),
  paletteTasks: utility.includes("void AnimTask_BlendBattleAnimPalExclude(u8 taskId)")
    && utility.includes("case 5:") && utility.includes("void AnimTask_BlendParticle(u8 taskId)")
    && utility.includes("IndexOfSpritePaletteTag") && utility.includes("StartBlendAnimSpriteColor"),
  randomHits: normal.includes("static void AnimHitSplatRandom(struct Sprite *sprite)")
    && normal.includes("cmd->animation = Random2() & 3")
    && normal.includes("(Random2() % 48) - 24") && normal.includes("(Random2() % 24) - 12"),
  horizontal: ground.includes("void AnimTask_HorizontalShake(u8 taskId)")
    && ground.includes("task->func = AnimTask_ShakeBattlers") && ground.includes("gBattleAnimArgs[2]"),
  sound: sound.includes("void SoundTask_PlaySE1WithPanning(u8 taskId)")
    && sound.includes("PlaySE1WithPanning(songId, pan)") && sound.includes("DestroyAnimVisualTask(taskId)"),
  rng: random.includes("gRng2Value = ISO_RANDOMIZE1(gRng2Value)")
    && random.includes("return gRng2Value >> 16"),
  commandLifecycle: anim.includes("static void Cmd_monbg(void)")
    && anim.includes("static void Cmd_setalpha(void)") && anim.includes("static void Cmd_blendoff(void)")
    && anim.includes("static void Cmd_fadetobg(void)") && anim.includes("static void Cmd_restorebg(void)")
    && anim.includes("static void Cmd_waitbgfadeout(void)") && anim.includes("static void Cmd_waitbgfadein(void)"),
};
const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`MOVE_LUSTER_PURGE source contract changed: ${failed.join(", ")}`);

console.log(JSON.stringify({
  move: "MOVE_LUSTER_PURGE", sourceBounds: { start: "0x082ce517", endExclusive: "0x082ce62e", evenPointerStart: "0x082ce516", bytes: 0x117 },
  unsetBounds: { start: "0x082d7cdd", endExclusive: "0x082d7ce5", bytes: 8 },
  scriptCommands: expectedScriptCommands, unsetCommands: expectedUnsetCommands,
  sourceRom, components: expectedComponents, carrier: carriers.map((entry: { index: number; label: string; species: string; nature: string }) => ({ index: entry.index, label: entry.label, species: entry.species, nature: entry.nature })),
  randomDraws: { hitsplats: 6, visualRandom2PerHitsplat: 2 },
  siblings: { MOVE_MIST_BALL: "independent control", MOVE_FLAIL: "independent control", MOVE_HEAT_WAVE: "independent control", MOVE_CALM_MIND: "independent control" },
}));
