/** Authoritative source/classification audit for the unsupported MOVE_SEISMIC_TOSS checkpoint. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const rock = read("reference/pokeemerald/src/battle_anim_rock.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/battle_anim_mons.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const animation = read("reference/pokeemerald/src/battle_anim.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animationData = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const battleCommands = read("reference/pokeemerald/src/battle_script_commands.c");
const playerController = read("reference/pokeemerald/src/battle_controller_player.c");
const moveData = read("reference/pokeemerald/src/data/battle_moves.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const frontierMons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const gba = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync("arm-none-eabi-nm", ["-S", "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});

type Symbol = { address: number; size: number };
const symbols = new Map<string, Symbol>();
for (const line of nm.split("\n")) {
  const match = /^([0-9a-fA-F]+)(?:\s+([0-9a-fA-F]+))?\s+\w\s+(\S+)$/u.exec(line);
  if (match) symbols.set(match[3]!, { address: Number.parseInt(match[1]!, 16), size: match[2] ? Number.parseInt(match[2]!, 16) : 0 });
}

function symbol(name: string): Symbol {
  const value = symbols.get(name);
  if (!value) throw new Error("missing ELF symbol " + name);
  return value;
}

function romRange(name: string, endExclusive?: number) {
  const start = symbol(name).address;
  const end = endExclusive ?? start + symbol(name).size;
  const bytes = gba.subarray(start - 0x08000000, end - 0x08000000);
  return {
    symbol: name,
    start: "0x" + start.toString(16),
    endExclusive: "0x" + end.toString(16),
    byteLength: bytes.length,
    romSha256: sha256(bytes),
  };
}

function labelOffset(source: string, label: string): number {
  const offset = source.indexOf(label + ":");
  if (offset < 0) throw new Error("missing source label " + label);
  return offset;
}

function labelBlock(source: string, start: string, end: string): string {
  return source.slice(labelOffset(source, start), labelOffset(source, end));
}

function sourceBlock(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error("missing source block " + start + "/" + end);
  return source.slice(from, to);
}

function sourceRange(path: string, source: string, body: string) {
  const sourceStart = source.indexOf(body);
  if (sourceStart < 0) throw new Error("cannot find source body in " + path);
  return {
    sourcePath: path,
    sourceStart,
    sourceEndExclusive: sourceStart + body.length,
    sourceByteLength: Buffer.byteLength(body),
    sourceSha256: sha256(body),
  };
}

function functionBody(source: string, name: string): string {
  const match = new RegExp("(?:static\\s+)?(?:void|u8|u16|u32|s16|bool8)\\s+" + name + "\\s*\\([^)]*\\)\\s*\\{", "u").exec(source);
  if (!match || match.index === undefined) throw new Error("missing function " + name);
  let depth = 0;
  for (let index = match.index; index < source.length; index++) {
    const character = source[index]!;
    if (character === "{") depth++;
    else if (character === "}" && --depth === 0) return source.slice(match.index, index + 1);
  }
  throw new Error("unterminated function " + name);
}

function callbackRecord(name: string, sourcePath: string, source: string) {
  const body = functionBody(source, name);
  return { ...sourceRange(sourcePath, source, body), rom: romRange(name) };
}

function commands(body: string): string[] {
  return body.split("\n")
    .map((line) => line.replace(/@.*$/u, "").trim())
    .filter((line) => line.length > 0 && !line.endsWith(":"));
}

function requireTokens(source: string, owner: string, tokens: string[]): void {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(owner + " drifted: " + token);
  }
}

const labels = [
  "Move_SEISMIC_TOSS",
  "SeismicTossContinue",
  "SeismicTossWeak",
  "SeismicTossMedium",
  "SeismicTossStrong",
  "SeismicTossRockScatter1",
  "SeismicTossRockScatter2",
  "Move_MAGIC_COAT",
] as const;
const blockBodies = Object.fromEntries(labels.slice(0, -1).map((label, index) => [
  label,
  labelBlock(scripts, label, labels[index + 1]!),
]));
const labelAddresses = Object.fromEntries(labels.map((label) => [label, symbol(label).address]));
const blockRanges = Object.fromEntries(labels.slice(0, -1).map((label, index) => {
  const body = blockBodies[label]!;
  return [label, {
    ...romRange(label, labelAddresses[labels[index + 1]!]!),
    ...sourceRange("data/battle_anim_scripts.s", scripts, body),
    commandCount: commands(body).length,
    commands: commands(body),
  }];
}));
const rootBody = labelBlock(scripts, "Move_SEISMIC_TOSS", "Move_MAGIC_COAT");
const expectedComponents = [
  "asset:ANIM_TAG_IMPACT",
  "asset:ANIM_TAG_ROCKS",
  "sprite:gRockScatterSpriteTemplate",
  "subroutine:SeismicTossContinue",
  "subroutine:SeismicTossMedium",
  "subroutine:SeismicTossRockScatter1",
  "subroutine:SeismicTossRockScatter2",
  "subroutine:SeismicTossStrong",
  "subroutine:SeismicTossWeak",
  "task:AnimTask_GetSeismicTossDamageLevel",
  "task:AnimTask_MoveSeismicTossBg",
  "task:AnimTask_SeismicTossBgAccelerateDownAtEnd",
  "task:AnimTask_ShakeMon",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:fadetobg",
  "visualCommand:monbg",
  "visualCommand:restorebg",
  "visualCommand:setalpha",
  "visualCommand:setarg",
  "visualCommand:waitbgfadein",
  "visualCommand:waitbgfadeout",
] as const;
const expectedRows: Record<string, string[]> = {
  Move_SEISMIC_TOSS: [
    "loadspritegfx ANIM_TAG_IMPACT", "loadspritegfx ANIM_TAG_ROCKS", "setarg 7, 0",
    "monbg ANIM_DEF_PARTNER", "setalpha 12, 8", "waitforvisualfinish",
    "createvisualtask AnimTask_GetSeismicTossDamageLevel, 3", "delay 1", "fadetobg BG_IN_AIR",
    "waitbgfadeout", "createvisualtask AnimTask_MoveSeismicTossBg, 3", "playsewithpan SE_M_SKY_UPPERCUT, 0",
    "waitbgfadein", "waitforvisualfinish", "createvisualtask AnimTask_SeismicTossBgAccelerateDownAtEnd, 3",
    "jumpreteq 0, SeismicTossWeak", "jumpreteq 1, SeismicTossMedium", "jumpreteq 2, SeismicTossStrong",
  ],
  SeismicTossContinue: ["restorebg", "waitbgfadeout", "setarg 7, 0xFFF", "waitbgfadein", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"],
  SeismicTossWeak: ["call SeismicTossRockScatter1", "delay 16", "call SeismicTossRockScatter2", "goto SeismicTossContinue"],
  SeismicTossMedium: ["call SeismicTossRockScatter1", "delay 14", "call SeismicTossRockScatter2", "delay 14", "call SeismicTossRockScatter1", "goto SeismicTossContinue"],
  SeismicTossStrong: ["call SeismicTossRockScatter2", "delay 10", "call SeismicTossRockScatter1", "delay 10", "call SeismicTossRockScatter2", "delay 10", "call SeismicTossRockScatter1", "goto SeismicTossContinue"],
  SeismicTossRockScatter1: [
    "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=-10, y=-8, relative_to=ANIM_TARGET, animation=1",
    "playsewithpan SE_M_STRENGTH, SOUND_PAN_TARGET",
    "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 5, 1",
    "createsprite gRockScatterSpriteTemplate, ANIM_TARGET, 2, -12, 27, 2, 3",
    "createsprite gRockScatterSpriteTemplate, ANIM_TARGET, 2, 8, 28, 3, 4",
    "createsprite gRockScatterSpriteTemplate, ANIM_TARGET, 2, -4, 30, 2, 3",
    "createsprite gRockScatterSpriteTemplate, ANIM_TARGET, 2, 12, 25, 4, 4",
    "return",
  ],
  SeismicTossRockScatter2: [
    "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=10, y=-8, relative_to=ANIM_TARGET, animation=1",
    "playsewithpan SE_M_ROCK_THROW, SOUND_PAN_TARGET",
    "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 5, 1",
    "createsprite gRockScatterSpriteTemplate, ANIM_TARGET, 2, -12, 32, 3, 4",
    "createsprite gRockScatterSpriteTemplate, ANIM_TARGET, 2, 8, 31, 2, 2",
    "createsprite gRockScatterSpriteTemplate, ANIM_TARGET, 2, -4, 28, 2, 3",
    "createsprite gRockScatterSpriteTemplate, ANIM_TARGET, 2, 12, 30, 4, 3",
    "return",
  ],
};
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_SEISMIC_TOSS");
const moveInventory = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_SEISMIC_TOSS");
const level50Range = inventory.tiers.level50.monIndices;
const allCarriers = frontierMons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_SEISMIC_TOSS"));
const level50Carriers = allCarriers.filter((entry: { index: number }) => entry.index >= level50Range.first && entry.index <= level50Range.last);
const outsideCarriers = allCarriers.filter((entry: { index: number }) => entry.index < level50Range.first);
const openOnlyCarriers = allCarriers.filter((entry: { index: number }) => entry.index > level50Range.last);
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "seismic-toss-air-rock-scatter");
const status = (move: string): string => coverage.entries.find((entry: { move: string }) => entry.move === move)?.status ?? "unsupported";
const rockScatterTemplate = sourceBlock(rock, "const struct SpriteTemplate gRockScatterSpriteTemplate =", "const struct SpriteTemplate gTwisterRockSpriteTemplate =");
const hitSplatTemplate = sourceBlock(normal, "const struct SpriteTemplate gBasicHitSplatSpriteTemplate =", "const struct SpriteTemplate gHandleInvertHitSplatSpriteTemplate =");

requireTokens(rock, "Seismic Toss rock source", [
  ".callback = AnimRockScatter,", "void AnimTask_GetSeismicTossDamageLevel(u8 taskId)",
  "if (gAnimMoveDmg < 33)", "if ((u32)gAnimMoveDmg - 33 < 33)", "if (gAnimMoveDmg > 65)",
  "void AnimTask_MoveSeismicTossBg(u8 taskId)", "gTasks[taskId].data[1] = 200;",
  "gBattle_BG3_Y += gTasks[taskId].data[1] / 10;", "if (gTasks[taskId].data[0] == 120)",
  "void AnimTask_SeismicTossBgAccelerateDownAtEnd(u8 taskId)", "gBattleAnimArgs[7] == 0xFFF",
  "sprite->callback = AnimRockScatter_Step;", "sprite->data[0] += 8;", "if (sprite->data[0] > 140)",
]);
requireTokens(movement, "Seismic Toss ShakeMon source", [
  "void AnimTask_ShakeMon(u8 taskId)", "gSprites[spriteId].x2 = gBattleAnimArgs[1]",
  "gTasks[taskId].func = AnimTask_ShakeMon_Step;", "static void AnimTask_ShakeMon_Step(u8 taskId)",
  "DestroyAnimVisualTask(taskId);",
]);
requireTokens(animation, "Seismic Toss background source", [
  "static void Cmd_fadetobg(void)", "CreateTask(Task_FadeToBg, 5)", "static void Task_FadeToBg(u8 taskId)",
  "static void LoadMoveBg(u16 bgId)", "static void Cmd_restorebg(void)", "gTasks[taskId].tBackgroundId = -1",
]);
requireTokens(battleScripts, "Seismic Toss level-damage script", [
  "BattleScript_EffectLevelDamage::", "dmgtolevel", "adjustsetdamage", "BattleScript_HitFromAtkAnimation",
]);
requireTokens(battleCommands, "Seismic Toss level-damage command", [
  "static void Cmd_dmgtolevel(void)", "gBattleMoveDamage = gBattleMons[gBattlerAttacker].level;",
]);
requireTokens(playerController, "Seismic Toss animation packet", [
  "gAnimMoveDmg = gBattleBufferA[gActiveBattler][6]",
]);
requireTokens(graphics, "Seismic Toss art/background source", [
  "gBattleAnimSpriteGfx_Rocks[] = INCGFX_U32(\"graphics/battle_anims/sprites/rocks.png\"",
  "gBattleAnimSpritePal_Rocks[] = INCGFX_U32(\"graphics/battle_anims/sprites/rocks.png\"",
  "gBattleAnimSpriteGfx_Impact[] = INCGFX_U32(\"graphics/battle_anims/sprites/impact.png\"",
  "gBattleAnimSpritePal_Impact[] = INCGFX_U32(\"graphics/battle_anims/sprites/impact.png\"",
  "gBattleAnimBgImage_InAir[] = INCGFX_U32(\"graphics/battle_anims/backgrounds/in_air.png\"",
  "gBattleAnimBgPalette_InAir[] = INCGFX_U32(\"graphics/battle_anims/backgrounds/in_air.png\"",
  "gBattleAnimBgTilemap_InAir[] = INCGFX_U32(\"graphics/battle_anims/backgrounds/in_air.bin\"",
]);
requireTokens(animationData, "Seismic Toss resource registry", [
  "{gBattleAnimSpriteGfx_Rocks, 0x0C00, ANIM_TAG_ROCKS}", "{gBattleAnimSpritePal_Rocks, ANIM_TAG_ROCKS}",
  "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}", "{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}",
  "[BG_IN_AIR]              = {gBattleAnimBgImage_InAir,      gBattleAnimBgPalette_InAir,      gBattleAnimBgTilemap_InAir}",
]);
requireTokens(constants, "Seismic Toss constants", [
  "#define ANIM_TAG_ROCKS", "#define ANIM_TAG_IMPACT", "#define BG_IN_AIR 17",
]);
requireTokens(songs, "Seismic Toss sound constants", [
  "#define SE_M_ROCK_THROW             131", "#define SE_M_STRENGTH               214", "#define SE_M_SKY_UPPERCUT           238",
]);
requireTokens(macros, "Seismic Toss animation macros", [
  ".macro create_basic_hitsplat_sprite", ".macro fadetobg", ".macro restorebg", ".macro jumpreteq",
]);
requireTokens(moveData, "Seismic Toss move data", [
  "[MOVE_SEISMIC_TOSS] =", ".effect = EFFECT_LEVEL_DAMAGE,", ".power = 1,", ".type = TYPE_FIGHTING,", ".accuracy = 100,",
]);

if (
  JSON.stringify(graphEntry?.blocks) !== JSON.stringify([
    "Move_SEISMIC_TOSS", "SeismicTossWeak", "SeismicTossMedium", "SeismicTossStrong",
    "SeismicTossRockScatter1", "SeismicTossRockScatter2", "SeismicTossContinue",
  ])
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(expectedComponents)
  || !moveInventory || moveInventory.id !== 69 || moveInventory.effect !== "EFFECT_LEVEL_DAMAGE"
  || moveInventory.frontierMonCount !== 7 || moveInventory.speciesCount !== 7
  || JSON.stringify(Object.fromEntries(Object.entries(blockBodies).map(([name, body]) => [name, commands(body)]))) !== JSON.stringify(expectedRows)
  || level50Carriers.length !== 7 || outsideCarriers.length !== 4 || openOnlyCarriers.length !== 0
  || JSON.stringify(level50Carriers.map((entry: { index: number }) => entry.index)) !== JSON.stringify([220, 291, 332, 341, 378, 448, 558])
  || level50Carriers[0]?.label !== "FRONTIER_MON_KECLEON_1" || level50Carriers[0]?.species !== "SPECIES_KECLEON"
  || level50Carriers[0]?.itemName !== "BATTLE_FRONTIER_ITEM_FOCUS_BAND" || level50Carriers[0]?.nature !== "NATURE_NAIVE"
  || status("MOVE_SEISMIC_TOSS") !== "exact"
  || status("MOVE_ROCK_THROW") !== "exact" || status("MOVE_ROCK_SLIDE") !== "exact" || status("MOVE_ANCIENT_POWER") !== "exact"
  || track?.fulfilled !== true || JSON.stringify(track?.representatives) !== JSON.stringify(["MOVE_SEISMIC_TOSS"])
  || JSON.stringify(track?.components) !== JSON.stringify(expectedComponents)
) {
  throw new Error("MOVE_SEISMIC_TOSS source/classification/coverage boundary changed");
}

const rootStart = labelAddresses.Move_SEISMIC_TOSS!;
const rootEnd = labelAddresses.Move_MAGIC_COAT!;
const callbacks = {
  AnimTask_GetSeismicTossDamageLevel: callbackRecord("AnimTask_GetSeismicTossDamageLevel", "src/battle_anim_rock.c", rock),
  AnimTask_MoveSeismicTossBg: callbackRecord("AnimTask_MoveSeismicTossBg", "src/battle_anim_rock.c", rock),
  AnimTask_SeismicTossBgAccelerateDownAtEnd: callbackRecord("AnimTask_SeismicTossBgAccelerateDownAtEnd", "src/battle_anim_rock.c", rock),
  AnimTask_ShakeMon: callbackRecord("AnimTask_ShakeMon", "src/battle_anim_mon_movement.c", movement),
  AnimTask_ShakeMon_Step: callbackRecord("AnimTask_ShakeMon_Step", "src/battle_anim_mon_movement.c", movement),
  AnimRockScatter: callbackRecord("AnimRockScatter", "src/battle_anim_rock.c", rock),
  AnimRockScatter_Step: callbackRecord("AnimRockScatter_Step", "src/battle_anim_rock.c", rock),
  AnimHitSplatBasic: callbackRecord("AnimHitSplatBasic", "src/battle_anim_normal.c", normal),
  Cmd_fadetobg: callbackRecord("Cmd_fadetobg", "src/battle_anim.c", animation),
  Task_FadeToBg: callbackRecord("Task_FadeToBg", "src/battle_anim.c", animation),
  LoadMoveBg: callbackRecord("LoadMoveBg", "src/battle_anim.c", animation),
  Cmd_restorebg: callbackRecord("Cmd_restorebg", "src/battle_anim.c", animation),
  UpdateAnimBg3ScreenSize: callbackRecord("UpdateAnimBg3ScreenSize", "src/battle_anim_mons.c", mons),
  Cmd_dmgtolevel: callbackRecord("Cmd_dmgtolevel", "src/battle_script_commands.c", battleCommands),
};

console.log(JSON.stringify({
  move: "MOVE_SEISMIC_TOSS",
  moveId: 69,
  status: "exact",
  coverageCredit: true,
  pointerOwned: {
    root: {
      symbol: "Move_SEISMIC_TOSS",
      start: "0x" + rootStart.toString(16),
      endExclusive: "0x" + rootEnd.toString(16),
      byteLength: rootEnd - rootStart,
      romSha256: sha256(gba.subarray(rootStart - 0x08000000, rootEnd - 0x08000000)),
      ...sourceRange("data/battle_anim_scripts.s", scripts, rootBody),
    },
    blocks: blockRanges,
  },
  graph: { blocks: graphEntry!.blocks, components: graphEntry!.componentIds },
  damageBranch: {
    selector: "AnimTask_GetSeismicTossDamageLevel",
    returnArg: "ARG_RET_ID",
    returnArgIndex: 7,
    thresholds: [
      { animMoveDamage: "< 33", result: 0, branch: "SeismicTossWeak" },
      { animMoveDamage: "33..65", result: 1, branch: "SeismicTossMedium" },
      { animMoveDamage: "> 65", result: 2, branch: "SeismicTossStrong" },
    ],
    sourceRule: "EFFECT_LEVEL_DAMAGE runs BattleScript_EffectLevelDamage -> dmgtolevel, and Cmd_dmgtolevel writes gBattleMoveDamage from the attacker's level. The controller packet copies its signed damage field into gAnimMoveDmg before this visual task runs.",
    legalLevel50Stage: "The retained level-50 stage's internal species id 352 is GRUMPIG (KECLEON is internal id 317); it produces 50 damage. The legal Onix target begins above 50 HP at full HP, so the staged move survives to the animation and selects SeismicTossMedium without any injected transient HP/status/stage/outcome.",
  },
  callbacks,
  resources: {
    rocks: {
      tag: "ANIM_TAG_ROCKS",
      registry: { gfx: "gBattleAnimSpriteGfx_Rocks", tileBytes: 0x0c00, palette: "gBattleAnimSpritePal_Rocks" },
      source: "graphics/battle_anims/sprites/rocks.png",
      rom: { gfx: romRange("gBattleAnimSpriteGfx_Rocks"), palette: romRange("gBattleAnimSpritePal_Rocks") },
    },
    impact: {
      tag: "ANIM_TAG_IMPACT",
      registry: { gfx: "gBattleAnimSpriteGfx_Impact", tileBytes: 0x0200, palette: "gBattleAnimSpritePal_Impact" },
      source: "graphics/battle_anims/sprites/impact.png",
      rom: { gfx: romRange("gBattleAnimSpriteGfx_Impact"), palette: romRange("gBattleAnimSpritePal_Impact") },
      template: { ...romRange("gBasicHitSplatSpriteTemplate"), ...sourceRange("src/battle_anim_normal.c", normal, hitSplatTemplate) },
    },
    rockScatterTemplate: {
      ...romRange("gRockScatterSpriteTemplate"),
      ...sourceRange("src/battle_anim_rock.c", rock, rockScatterTemplate),
      definition: "AffineNormal ObjNormal 32x32, sAnims_BasicRock/sAffineAnims_BasicRock, AnimRockScatter then AnimRockScatter_Step.",
    },
  },
  background: {
    id: "BG_IN_AIR",
    idValue: 17,
    registry: "gBattleAnimBackgroundTable[BG_IN_AIR] = image/palette/tilemap InAir",
    resources: {
      image: romRange("gBattleAnimBgImage_InAir"),
      palette: romRange("gBattleAnimBgPalette_InAir"),
      tilemap: romRange("gBattleAnimBgTilemap_InAir"),
    },
    program: "Cmd_fadetobg creates Task_FadeToBg; it fades hardware palette, LoadMoveBg loads BG_IN_AIR, then restorebg repeats the task with background id -1. The two Seismic Toss BG tasks independently resize BG3 and use gBattleAnimArgs[7] = 0xFFF for terminal cleanup.",
  },
  audio: {
    root: [{ name: "SE_M_SKY_UPPERCUT", id: 238, pan: 0 }],
    rockScatter1: [{ name: "SE_M_STRENGTH", id: 214, pan: "SOUND_PAN_TARGET" }],
    rockScatter2: [{ name: "SE_M_ROCK_THROW", id: 131, pan: "SOUND_PAN_TARGET" }],
  },
  cleanup: {
    branch: "SeismicTossContinue",
    commands: expectedRows.SeismicTossContinue,
    resourceUnload: "no explicit unloadspritegfx; the script exits only after restorebg, terminal BG task argument, clearmonbg, and blendoff.",
  },
  carrier: {
    level50Range,
    lowestLevel50: {
      index: level50Carriers[0]!.index,
      label: level50Carriers[0]!.label,
      species: level50Carriers[0]!.species,
      moves: level50Carriers[0]!.moves,
      itemTableId: level50Carriers[0]!.itemTableId,
      itemName: level50Carriers[0]!.itemName,
      nature: level50Carriers[0]!.nature,
      evSpreadStats: level50Carriers[0]!.evSpreadStats,
    },
    completeLevel50Census: level50Carriers.map((entry: { index: number; label: string; species: string; moves: string[]; itemTableId: number; itemName: string; nature: string; evSpreadStats: string[] }) => ({
      index: entry.index, label: entry.label, species: entry.species, moves: entry.moves,
      itemTableId: entry.itemTableId, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats,
    })),
    excludedOutsideLevel50: outsideCarriers.map((entry: { index: number; label: string }) => ({ index: entry.index, label: entry.label })),
    excludedOpenOnly: openOnlyCarriers.map((entry: { index: number }) => entry.index),
  },
  controls: {
    moves: ["MOVE_ROCK_THROW", "MOVE_ROCK_SLIDE", "MOVE_ANCIENT_POWER"],
    statuses: [status("MOVE_ROCK_THROW"), status("MOVE_ROCK_SLIDE"), status("MOVE_ANCIENT_POWER")],
    independence: "These exact source-identity controls are batch-checked only. MOVE_SEISMIC_TOSS is independently exact, and its non-exclusive track grants no inferred sibling credit.",
  },
  checkpoint: {
    track: "seismic-toss-air-rock-scatter",
    trackFulfilled: true,
    denseWindowCaptured: true,
    latchMeasured: true,
    productionChanged: true,
    exactPromotion: true,
  },
  latchBoundary: "The complete twice-fresh bilateral Scene-ON corpus owns Seismic Toss-specific ShakeMon, fade, BG_IN_AIR, BG task, OAM/matrix/palette and cleanup measurements; none conveys sibling acceptance.",
}, null, 2));
