/**
 * Authoritative source/classification receipt for MOVE_SHEER_COLD.
 *
 * Development-only: this pins the complete pointer-owned root, the only
 * directly-reachable task/callback/resource graph, and the complete legal
 * Factory census.  It deliberately contains no oracle capture, reducer,
 * presentation seam, compositor, or framebuffer data.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Symbol = { address: number; size: number };

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;

const scripts = read("data/battle_anim_scripts.s");
const battleScripts = read("data/battle_scripts_1.s");
const statusEffects = read("src/battle_anim_status_effects.c");
const battleCommands = read("src/battle_script_commands.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const battleConstants = read("include/constants/battle.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
const frontierConstants = read("include/constants/battle_frontier_mons.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const symbols = new Map<string, Symbol[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
}).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    const candidates = symbols.get(fields.at(-1)!) ?? [];
    candidates.push({ address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
    symbols.set(fields.at(-1)!, candidates);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const candidates = symbols.get(fields[2]!) ?? [];
    candidates.push({ address: Number.parseInt(fields[0]!, 16), size: 0 });
    symbols.set(fields[2]!, candidates);
  }
}

function sym(name: string, expectedAddress?: number): Symbol {
  const candidates = symbols.get(name) ?? [];
  const value = expectedAddress === undefined
    ? candidates.length === 1 ? candidates[0] : undefined
    : candidates.find((candidate) => candidate.address === expectedAddress);
  if (!value) throw new Error(`missing or ambiguous ELF symbol ${name}`);
  return value;
}

function romRange(name: string, end?: number, expectedAddress?: number): Json {
  const value = sym(name, expectedAddress);
  const finish = end ?? value.address + value.size;
  if (finish <= value.address) throw new Error(`invalid ROM interval ${name}`);
  return {
    symbol: name,
    start: hex(value.address),
    endExclusive: hex(finish),
    byteLength: finish - value.address,
    romSha256: sha(rom.subarray(value.address - 0x08000000, finish - 0x08000000)),
  };
}

function sourceSpan(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing source span ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
}

function sourceBlock(source: string, startToken: string, endToken: string): string {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`missing source block ${startToken}`);
  return source.slice(start, end);
}

function functionBody(source: string, name: string): string {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "g");
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(source)) !== null) {
    const open = source.indexOf("{", match.index);
    const semi = source.indexOf(";", match.index);
    if (open < 0 || (semi >= 0 && semi < open)) continue;
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      else if (source[index] === "}" && --depth === 0) {
        return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1);
      }
    }
  }
  throw new Error(`missing function ${name}`);
}

function bodyRecord(name: string, path: string, source: string, expectedAddress?: number): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name, undefined, expectedAddress) };
}

function sourceBodyRecord(name: string, path: string, source: string): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body) };
}

function objectRecord(name: string, path: string, source: string): Json {
  const token = source.indexOf(name);
  if (token < 0) throw new Error(`missing object ${name}`);
  const start = source.lastIndexOf("\n", token) + 1;
  const end = source.indexOf("};", token) + 2;
  if (end < 2) throw new Error(`missing object end ${name}`);
  return { source: sourceSpan(path, source, source.slice(start, end)), rom: romRange(name) };
}

function commandRows(body: string): string[] {
  return body.split("\n").map((line) => line.replace(/@.*$/u, "").trim())
    .filter((line) => line.length > 0 && !line.endsWith(":"));
}

function constantValue(source: string, name: string): number {
  const match = source.match(new RegExp(`^#define\\s+${name}\\s+(\\d+)`, "mu"));
  if (!match) throw new Error(`missing numeric constant ${name}`);
  return Number.parseInt(match[1]!, 10);
}

function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const rootBody = sourceBlock(scripts, "Move_SHEER_COLD:\n", "Move_ARM_THRUST:\n");
const expectedCommands = [
  "fadetobg BG_ICE",
  "waitbgfadeout",
  "playsewithpan SE_M_ICY_WIND, 0",
  "waitbgfadein",
  "loadspritegfx ANIM_TAG_ICE_CUBE",
  "monbg ANIM_DEF_PARTNER",
  "splitbgprio ANIM_TARGET",
  "setalpha 12, 8",
  "createvisualtask AnimTask_FrozenIceCube, 2",
  "waitplaysewithpan SE_M_HAIL, SOUND_PAN_TARGET, 17",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
  "restorebg",
  "waitbgfadein",
  "end",
] as const;
const rootStart = sym("Move_SHEER_COLD").address;
const rootEnd = sym("Move_ARM_THRUST").address;
const scriptNode = {
  source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody),
  rom: romRange("Move_SHEER_COLD", rootEnd),
  commands: commandRows(rootBody),
};
if (JSON.stringify(scriptNode.commands) !== JSON.stringify(expectedCommands)) {
  throw new Error("MOVE_SHEER_COLD command order drifted");
}
if (/\b(?:call|goto|jump|jumparg|choosetwoturnanim)\b/u.test(rootBody)) {
  throw new Error("MOVE_SHEER_COLD unexpectedly gained a dispatched root branch");
}

const ohkoBody = sourceBlock(battleScripts, "BattleScript_EffectOHKO::\n", "BattleScript_EffectRazorWind::\n");
const expectedOhkoCommands = [
  "attackcanceler", "attackstring", "ppreduce", "accuracycheck BattleScript_ButItFailed, NO_ACC_CALC_CHECK_LOCK_ON",
  "typecalc", "jumpifmovehadnoeffect BattleScript_HitFromAtkAnimation", "tryKO BattleScript_KOFail",
  "trysetdestinybondtohappen", "goto BattleScript_HitFromAtkAnimation", "pause B_WAIT_TIME_LONG",
  "printfromtable gKOFailedStringIds", "waitmessage B_WAIT_TIME_LONG", "goto BattleScript_MoveEnd",
] as const;
const ohkoStart = sym("BattleScript_EffectOHKO").address;
const ohkoEnd = sym("BattleScript_EffectRazorWind").address;
const ohkoNode = {
  source: sourceSpan("data/battle_scripts_1.s", battleScripts, ohkoBody),
  rom: romRange("BattleScript_EffectOHKO", ohkoEnd),
  commands: commandRows(ohkoBody),
};
if (JSON.stringify(ohkoNode.commands) !== JSON.stringify(expectedOhkoCommands)) {
  throw new Error("EFFECT_OHKO battle-script branch order drifted");
}

const expectedComponents = [
  "asset:ANIM_TAG_ICE_CUBE",
  "task:AnimTask_FrozenIceCube",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:fadetobg",
  "visualCommand:monbg",
  "visualCommand:restorebg",
  "visualCommand:setalpha",
  "visualCommand:splitbgprio",
  "visualCommand:waitbgfadein",
  "visualCommand:waitbgfadeout",
] as const;
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_SHEER_COLD");
if (!graphEntry || graphEntry.id !== 329 || graphEntry.rootScript !== "Move_SHEER_COLD"
  || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_SHEER_COLD"])
  || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) {
  throw new Error("MOVE_SHEER_COLD generated component graph drifted");
}
const componentUsers = Object.fromEntries(expectedComponents.map((component) => [
  component,
  graph.moves.filter((entry: Json) => entry.componentIds.includes(component)).map((entry: Json) => entry.move),
]));
const newTrackComponents = ["asset:ANIM_TAG_ICE_CUBE", "task:AnimTask_FrozenIceCube"] as const;
if (newTrackComponents.some((component) => JSON.stringify(componentUsers[component]) !== JSON.stringify(["MOVE_SHEER_COLD"]))) {
  throw new Error("MOVE_SHEER_COLD exclusive source component classification drifted");
}

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const openRanges = policy.rentalSelection.ranges.open as readonly { start: number; end: number }[];
const inRanges = (entry: Json, ranges: readonly { start: number; end: number }[]): boolean =>
  ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SHEER_COLD"));
const level50Carriers = allCarriers.filter((entry: Json) => inRanges(entry, level50Ranges));
const openCarriers = allCarriers.filter((entry: Json) => inRanges(entry, openRanges));
const outsideLevel50 = allCarriers.filter((entry: Json) => !inRanges(entry, level50Ranges));
const openOnlyCarriers = openCarriers.filter((entry: Json) => !inRanges(entry, level50Ranges));
const expectedCarrierIndices = [584, 644, 680, 740, 822, 823];
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_SHEER_COLD");
const openOnlyInventoryEntry = inventory.tiers.openOnly.moves.find((entry: Json) => entry.move === "MOVE_SHEER_COLD");
if (inventoryEntry?.id !== 329 || inventoryEntry?.power !== 1 || inventoryEntry?.accuracy !== 30
  || inventoryEntry?.pp !== 5 || inventoryEntry?.effect !== "EFFECT_OHKO" || inventoryEntry?.frontierMonCount !== 6
  || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedCarrierIndices)
  || outsideLevel50.length !== 0 || JSON.stringify(openCarriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedCarrierIndices)
  || openOnlyCarriers.length !== 0
  || openOnlyInventoryEntry !== undefined) {
  throw new Error("MOVE_SHEER_COLD carrier census or OHKO inventory drifted");
}

const track = coverage.componentTracks.find((entry: Json) => entry.id === "ice-cube-frozen-ice-cube");
const moveEntry = coverage.entries.find((entry: Json) => entry.move === "MOVE_SHEER_COLD");
if (!track || JSON.stringify(track.components) !== JSON.stringify(newTrackComponents)
  || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_SHEER_COLD"])
  || track.fulfilled !== true || moveEntry?.status !== "exact") {
  throw new Error("MOVE_SHEER_COLD exact track boundary drifted");
}

const statusFreezeBody = sourceBlock(scripts, "Status_Freeze:\n", "Status_Curse:\n");
const icePunchControl = coverage.entries.find((entry: Json) => entry.move === "MOVE_ICE_PUNCH");
if (icePunchControl?.status !== "exact" || !statusFreezeBody.includes("createvisualtask AnimTask_FrozenIceCube, 2")
  || rootBody.includes("Status_Freeze") || rootBody.includes("createvisualtask AnimTask_FrozenIceCube, 2\n\tcall")) {
  throw new Error("FrozenIceCube control/independence classification drifted");
}

requireTokens("Sheer Cold task/template", statusEffects, [
  "static const struct Subsprite sFrozenIceCubeSubsprites[]",
  "static const struct SubspriteTable sFrozenIceCubeSubspriteTable[]",
  "static const struct SpriteTemplate sFrozenIceCubeSpriteTemplate",
  ".tileTag = ANIM_TAG_ICE_CUBE",
  ".paletteTag = ANIM_TAG_ICE_CUBE",
  ".oam = &gOamData_AffineOff_ObjBlend_64x64",
  "void AnimTask_FrozenIceCube", "static void AnimTask_FrozenIceCube_Step1",
  "static void AnimTask_FrozenIceCube_Step2", "static void AnimTask_FrozenIceCube_Step3",
  "static void AnimTask_FrozenIceCube_Step4", "GetBattlerSpriteCoord(gBattleAnimTarget, BATTLER_COORD_X_2) - 32",
  "GetBattlerSpriteCoord(gBattleAnimTarget, BATTLER_COORD_Y_PIC_OFFSET) - 36",
  "SetSubspriteTables(&gSprites[spriteId], sFrozenIceCubeSubspriteTable)",
  "IndexOfSpritePaletteTag(ANIM_TAG_ICE_CUBE)", "FreeSpriteOamMatrix(&gSprites[spriteId])",
  "DestroyAnimVisualTask(taskId)",
]);
requireTokens("Sheer Cold runtime", runtime, [
  "static void Cmd_fadetobg", "static void Cmd_restorebg", "static void Cmd_waitbgfadeout",
  "static void Cmd_waitbgfadein", "static void Cmd_loadspritegfx", "static void Cmd_monbg",
  "static void Cmd_splitbgprio", "static void Cmd_setalpha", "static void Cmd_createvisualtask",
  "static void Cmd_waitplaysewithpan", "static void Cmd_waitforvisualfinish", "static void Cmd_clearmonbg",
  "static void Cmd_blendoff", "static void Task_FadeToBg", "static void Task_UpdateMonBg",
  "static void Task_ClearMonBg", "static void LoadMoveBg", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag",
]);
requireTokens("Sheer Cold resources", `${graphics}\n${registry}\n${constants}`, [
  "gBattleAnimSpriteGfx_IceCube", "gBattleAnimSpritePal_IceCube",
  "graphics/battle_anims/sprites/ice_cube.4bpp", "graphics/battle_anims/sprites/ice_cube.pal",
  "{gBattleAnimSpriteGfx_IceCube, 0x1200, ANIM_TAG_ICE_CUBE}",
  "{gBattleAnimSpritePal_IceCube, ANIM_TAG_ICE_CUBE}", "#define ANIM_TAG_ICE_CUBE                   (ANIM_SPRITES_START + 10)",
  "gBattleAnimBgImage_Ice", "gBattleAnimBgPalette_Ice", "gBattleAnimBgTilemap_Ice",
  "[BG_ICE]", "#define BG_ICE 15",
]);
requireTokens("Sheer Cold move/audio", `${moves}\n${songs}`, [
  "[MOVE_SHEER_COLD] =", ".effect = EFFECT_OHKO", ".power = 1", ".accuracy = 30", ".pp = 5",
  "#define SE_M_ICY_WIND               137", "#define SE_M_HAIL                   242",
]);
requireTokens("Sheer Cold OHKO resolution", `${battleScripts}\n${battleCommands}\n${battleConstants}`, [
  "BattleScript_EffectOHKO::", "accuracycheck BattleScript_ButItFailed, NO_ACC_CALC_CHECK_LOCK_ON",
  "tryKO BattleScript_KOFail", "BattleScript_KOFail::", "printfromtable gKOFailedStringIds",
  "static void Cmd_tryKO(void)", "gBattleMoves[gCurrentMove].accuracy + (gBattleMons[gBattlerAttacker].level - gBattleMons[gBattlerTarget].level)",
  "gBattleMons[gBattlerAttacker].level >= gBattleMons[gBattlerTarget].level", "gMoveResultFlags |= MOVE_RESULT_ONE_HIT_KO",
  "gMoveResultFlags |= MOVE_RESULT_MISSED", "#define MOVE_RESULT_MISSED             (1 << 0)",
  "#define MOVE_RESULT_ONE_HIT_KO         (1 << 4)",
]);
requireTokens("Sheer Cold carrier constants", frontierConstants, [
  "FRONTIER_MON_DEWGONG_3", "FRONTIER_MON_WALREIN_3", "FRONTIER_MON_DEWGONG_4",
  "FRONTIER_MON_WALREIN_4", "FRONTIER_MON_LAPRAS_7", "FRONTIER_MON_LAPRAS_8",
]);
for (const carrier of level50Carriers) {
  requireTokens(`Sheer Cold carrier ${carrier.label}`, frontierSource, [
    `.moves = {${carrier.moves.join(", ")}}`,
  ]);
}
if (constantValue(constants, "ANIM_SPRITES_START") !== 10000
  || constantValue(constants, "BG_ICE") !== 15
  || constantValue(songs, "SE_M_ICY_WIND") !== 137
  || constantValue(songs, "SE_M_HAIL") !== 242) {
  throw new Error("MOVE_SHEER_COLD resource or audio constants drifted");
}

const taskBodies = {
  AnimTask_FrozenIceCube: bodyRecord("AnimTask_FrozenIceCube", "src/battle_anim_status_effects.c", statusEffects),
  AnimTask_FrozenIceCube_Step1: bodyRecord("AnimTask_FrozenIceCube_Step1", "src/battle_anim_status_effects.c", statusEffects),
  AnimTask_FrozenIceCube_Step2: bodyRecord("AnimTask_FrozenIceCube_Step2", "src/battle_anim_status_effects.c", statusEffects),
  AnimTask_FrozenIceCube_Step3: bodyRecord("AnimTask_FrozenIceCube_Step3", "src/battle_anim_status_effects.c", statusEffects),
  AnimTask_FrozenIceCube_Step4: bodyRecord("AnimTask_FrozenIceCube_Step4", "src/battle_anim_status_effects.c", statusEffects),
};
const runtimeBodies = Object.fromEntries([
  "Cmd_fadetobg", "Cmd_restorebg", "Cmd_waitbgfadeout", "Cmd_waitbgfadein", "Cmd_loadspritegfx",
  "Cmd_monbg", "Cmd_splitbgprio", "Cmd_setalpha", "Cmd_createvisualtask", "Cmd_waitplaysewithpan",
  "Cmd_waitforvisualfinish", "Cmd_clearmonbg", "Cmd_blendoff", "Cmd_end", "Task_FadeToBg",
  "Task_UpdateMonBg", "Task_ClearMonBg", "LoadMoveBg",
].map((name) => [name, bodyRecord(name, "src/battle_anim.c", runtime, name === "Cmd_end" ? 0x080a3fc4 : undefined)]));

console.log(JSON.stringify({
  schema: "sheer-cold-source-audit/v1",
  move: "MOVE_SHEER_COLD",
  moveId: 329,
  status: "unsupported-source-legal-staging-checkpoint",
  coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_SHEER_COLD", nextDispatchLabel: "Move_ARM_THRUST",
      source: scriptNode.source,
      rom: { ...scriptNode.rom, start: hex(rootStart), endExclusive: hex(rootEnd) },
      commands: expectedCommands,
      branches: { directlyReachableBlocks: ["Move_SHEER_COLD"], dispatchedBranches: [], complete: true },
    },
    directBodies: {
      frozenIceCubeTemplate: objectRecord("sFrozenIceCubeSpriteTemplate", "src/battle_anim_status_effects.c", statusEffects),
      frozenIceCubeSubsprites: objectRecord("sFrozenIceCubeSubsprites", "src/battle_anim_status_effects.c", statusEffects),
      frozenIceCubeSubspriteTable: objectRecord("sFrozenIceCubeSubspriteTable", "src/battle_anim_status_effects.c", statusEffects),
      tasks: taskBodies,
      runtime: runtimeBodies,
    },
    ohkoResolution: {
      pointerOwnedBattleScript: {
        symbol: "BattleScript_EffectOHKO", nextDispatchLabel: "BattleScript_EffectRazorWind",
        source: ohkoNode.source,
        rom: { ...ohkoNode.rom, start: hex(ohkoStart), endExclusive: hex(ohkoEnd) },
        commands: expectedOhkoCommands,
        branches: [
          "BattleScript_ButItFailed via accuracycheck",
          "BattleScript_HitFromAtkAnimation via no-effect or successful tryKO",
          "BattleScript_KOFail via unsuccessful tryKO",
        ],
      },
      tryKO: sourceBodyRecord("Cmd_tryKO", "src/battle_script_commands.c", battleCommands),
    },
  },
  graph: {
    blocks: graphEntry.blocks,
    components: expectedComponents,
    newTrack: { id: "ice-cube-frozen-ice-cube", components: newTrackComponents, singletonRepresentative: "MOVE_SHEER_COLD" },
    componentUsers,
  },
  behavior: {
    move: { effect: "EFFECT_OHKO", power: 1, accuracy: 30, pp: 5, target: "MOVE_TARGET_SELECTED" },
    ohko: {
      sourceRule: "chance = accuracy + attackerLevel - targetLevel; hit only when Random()%100+1 < chance and attackerLevel >= targetLevel",
      resultFlags: { missed: 1, oneHitKo: 16 },
      stagingRequirement: "use complete equal-level legal parties and retain the stock-ROM hit/miss result; never inject damage, HP, outcome, status, or stages",
    },
    root: { background: "BG_ICE", targetMonBg: "ANIM_DEF_PARTNER", alpha: [12, 8], task: "AnimTask_FrozenIceCube", audio: ["SE_M_ICY_WIND", "SE_M_HAIL"], cleanup: ["clearmonbg ANIM_DEF_PARTNER", "blendoff", "restorebg", "waitbgfadein", "end"] },
    frozenIceCube: {
      targetAnchor: { x: "BATTLER_COORD_X_2 - 32", y: "BATTLER_COORD_Y_PIC_OFFSET - 36" },
      stages: ["create/fade-in", "two palette-rotation cycles", "fade-out", "destroy sprite at 37 / task at 39"],
      sourceControl: { statusScript: "Status_Freeze", rootReachableFromSheerCold: false, icePunchStatusOutcome: "independent exact MOVE_ICE_PUNCH control only" },
    },
  },
  resources: {
    iceCube: {
      tag: "ANIM_TAG_ICE_CUBE", tagValue: 10010, tileBytes: 0x1200,
      gfx: romRange("gBattleAnimSpriteGfx_IceCube"), palette: romRange("gBattleAnimSpritePal_IceCube"),
      source: "graphics/battle_anims/sprites/ice_cube.4bpp + ice_cube.pal",
    },
    iceBackground: {
      id: "BG_ICE", idValue: 15,
      image: romRange("gBattleAnimBgImage_Ice"), palette: romRange("gBattleAnimBgPalette_Ice"), tilemap: romRange("gBattleAnimBgTilemap_Ice"),
      source: "graphics/battle_anims/backgrounds/ice.png + ice.bin",
    },
    release: "Cmd_end frees tracked ANIM_TAG_ICE_CUBE sheet and palette after root cleanup.",
  },
  carriers: {
    level50Ranges,
    count: level50Carriers.length,
    all: level50Carriers.map((entry: Json) => ({
      index: entry.index, label: entry.label, species: entry.species, moves: entry.moves,
      itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats,
    })),
    lowest: level50Carriers[0],
    outsideLevel50: outsideLevel50.map((entry: Json) => entry.index),
    openOnly: {
      inventoryEntry: openOnlyInventoryEntry ?? null,
      carrierDifference: openOnlyCarriers.map((entry: Json) => entry.index),
      openCarriersAlsoLevel50: openCarriers.map((entry: Json) => entry.index),
    },
  },
  controls: {
    icePunch: { status: icePunchControl.status, shares: ["ANIM_TAG_ICE_CUBE", "AnimTask_FrozenIceCube via Status_Freeze"], credit: "source/art control only; no Sheer Cold body, timing, latch, track, or move credit" },
  },
  checkpoint: {
    sourceAudit: true,
    completePointerOwnedRoot: true,
    completeReachableBranches: true,
    completeCarrierCensus: true,
    legalBilateralPartyOnlyStaging: true,
    oracleOrMgbaInvoked: true,
    compactBilateralEndpointReceipts: true,
    twiceFreshPerOrientation: true,
    denseWindowCaptured: false,
    reducerAdded: false,
    typedSceneOnSeam: false,
    compositorAdded: false,
    framebufferAcceptance: false,
    coveragePromotion: false,
    componentTrackFulfilled: false,
    latchPromotion: false,
    boundaryOrBarrierChanged: false,
    gameplayStateOwned: false,
    unsupportedNoCreditBoundary: true,
  },
}, null, 2));
