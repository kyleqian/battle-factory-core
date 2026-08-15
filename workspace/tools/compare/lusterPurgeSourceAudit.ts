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
const speciesConstants = read("reference/pokeemerald/include/constants/species.h");
const pokemonConstants = read("reference/pokeemerald/include/constants/pokemon.h");
const abilityConstants = read("reference/pokeemerald/include/constants/abilities.h");
const speciesInfo = read("reference/pokeemerald/src/data/pokemon/species_info.h");
const speciesNames = read("reference/pokeemerald/src/data/text/species_names.h");
const backPicTable = read("reference/pokeemerald/src/data/pokemon_graphics/back_pic_table.h");
const frontPicTable = read("reference/pokeemerald/src/data/pokemon_graphics/still_front_pic_table.h");
const pokemonGraphics = read("reference/pokeemerald/src/data/graphics/pokemon.h");
const battleInterface = read("reference/pokeemerald/src/battle_interface.c");
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
const numericConstant = (source: string, name: string): number => {
  const match = source.match(new RegExp(`^#define ${name}\\s+(\\d+)$`, "m"));
  if (!match) throw new Error(`missing numeric constant ${name}`);
  return Number(match[1]);
};
const blockFrom = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`missing source identity block ${start}/${end}`);
  return source.slice(from, to);
};
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

const speciesIds = {
  RELICANTH: numericConstant(speciesConstants, "SPECIES_RELICANTH"),
  LATIOS: numericConstant(speciesConstants, "SPECIES_LATIOS"),
};
const latiosInfo = blockFrom(speciesInfo, "[SPECIES_LATIOS]", "[SPECIES_JIRACHI]");
const speciesIdentity = {
  internalIds: {
    SPECIES_RELICANTH: speciesIds.RELICANTH,
    SPECIES_LATIOS: speciesIds.LATIOS,
  },
  names: {
    relicanth: speciesNames.includes("[SPECIES_RELICANTH] = _(\"RELICANTH\")"),
    latios: speciesNames.includes("[SPECIES_LATIOS] = _(\"LATIOS\")"),
  },
  latios: {
    types: [numericConstant(pokemonConstants, "TYPE_DRAGON"), numericConstant(pokemonConstants, "TYPE_PSYCHIC")],
    ability: numericConstant(abilityConstants, "ABILITY_LEVITATE"),
    baseStats: { hp: 80, attack: 90, defense: 80, speed: 110, spAttack: 130, spDefense: 110 },
    sourceInfo: [
      ".baseHP        = 80", ".baseAttack    = 90", ".baseDefense   = 80",
      ".baseSpeed     = 110", ".baseSpAttack  = 130", ".baseSpDefense = 110",
      ".types = { TYPE_DRAGON, TYPE_PSYCHIC }", ".abilities = {ABILITY_LEVITATE, ABILITY_NONE}",
    ].every((needle) => latiosInfo.includes(needle)),
    art: {
      back: backPicTable.includes("SPECIES_SPRITE(LATIOS, gMonBackPic_Latios)"),
      front: frontPicTable.includes("SPECIES_SPRITE(LATIOS,        gMonStillFrontPic_Latios)"),
      palette: pokemonGraphics.includes("gMonPalette_Latios[]"),
    },
    healthbox: {
      player: battleInterface.includes("sHealthboxPlayerSpriteTemplates"),
      opponent: battleInterface.includes("sHealthboxOpponentSpriteTemplates"),
      bar: battleInterface.includes("sHealthbarSpriteTemplates"),
    },
  },
};

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
  speciesIdentity: speciesIds.RELICANTH === 381 && speciesIds.LATIOS === 408
    && speciesIdentity.names.relicanth && speciesIdentity.names.latios
    && JSON.stringify(speciesIdentity.latios.types) === JSON.stringify([16, 14])
    && speciesIdentity.latios.ability === 26
    && JSON.stringify(speciesIdentity.latios.baseStats) === JSON.stringify({ hp: 80, attack: 90, defense: 80, speed: 110, spAttack: 130, spDefense: 110 })
    && speciesIdentity.latios.sourceInfo
    && Object.values(speciesIdentity.latios.art).every(Boolean)
    && Object.values(speciesIdentity.latios.healthbox).every(Boolean),
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
  sourceRom, components: expectedComponents, speciesIdentity,
  carrier: carriers.map((entry: { index: number; label: string; species: string; nature: string }) => ({ index: entry.index, label: entry.label, species: entry.species, speciesId: entry.species === "SPECIES_LATIOS" ? speciesIds.LATIOS : speciesIds.RELICANTH, nature: entry.nature })),
  randomDraws: { hitsplats: 6, visualRandom2PerHitsplat: 2 },
  siblings: { MOVE_MIST_BALL: "independent control", MOVE_FLAIL: "independent control", MOVE_HEAT_WAVE: "independent control", MOVE_CALM_MIND: "independent control" },
}));
