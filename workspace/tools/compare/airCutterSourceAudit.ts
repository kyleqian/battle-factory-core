/**
 * Authoritative source/classification receipt for MOVE_AIR_CUTTER.
 *
 * Development-only: this pins source ownership and the legal Factory census.
 * It deliberately contains no oracle output, reducer, seam, renderer, or
 * framebuffer data.
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
const macros = read("asm/macros/battle_anim_script.inc");
const effects1 = read("src/battle_anim_effects_1.c");
const effects2 = read("src/battle_anim_effects_2.c");
const movement = read("src/battle_anim_mon_movement.c");
const mons = read("src/battle_anim_mons.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const animationConstants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
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
    symbol: name, start: hex(value.address), endExclusive: hex(finish), byteLength: finish - value.address,
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
      else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1);
    }
  }
  throw new Error(`missing function ${name}`);
}

function bodyRecord(name: string, path: string, source: string, expectedAddress?: number): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name, undefined, expectedAddress) };
}

function objectRecord(name: string, path: string, source: string): Json {
  const token = source.indexOf(name);
  if (token < 0) throw new Error(`missing object ${name}`);
  const start = source.lastIndexOf("\n", token) + 1;
  const end = source.indexOf("};", token) + 2;
  if (end < 2) throw new Error(`missing object end ${name}`);
  return { source: sourceSpan(path, source, source.slice(start, end)), rom: romRange(name) };
}

function macroRecord(name: string): Json {
  const start = macros.indexOf(`.macro ${name}`);
  const end = macros.indexOf(".endm", start) + ".endm".length;
  if (start < 0 || end < ".endm".length) throw new Error(`missing macro ${name}`);
  return { source: sourceSpan("asm/macros/battle_anim_script.inc", macros, macros.slice(start, end)) };
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

const rootBody = sourceBlock(scripts, "Move_AIR_CUTTER:\n", "Move_ODOR_SLEUTH:\n");
const expectedCommands = [
  "loadspritegfx ANIM_TAG_AIR_WAVE", "loadspritegfx ANIM_TAG_CUT", "loadspritegfx ANIM_TAG_IMPACT", "delay 0",
  "monbg ANIM_DEF_PARTNER", "setalpha 12, 8", "delay 0",
  "createvisualtask AnimTask_AirCutterProjectile, 2, 32, -24, 6 * 256, 2, 128",
  "waitforvisualfinish", "playsewithpan SE_M_CUT, SOUND_PAN_TARGET",
  "createsprite gAirCutterSliceSpriteTemplate, ANIM_ATTACKER, 2, 40, -32, 0, 2", "delay 5",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_DEF_PARTNER, 2, 0, 8, 1",
  "waitforvisualfinish", "blendoff", "clearmonbg ANIM_DEF_PARTNER", "delay 0", "end",
] as const;
const rootStart = sym("Move_AIR_CUTTER").address;
const rootEnd = sym("Move_ODOR_SLEUTH").address;
const scriptNode = {
  source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody),
  rom: romRange("Move_AIR_CUTTER", rootEnd),
  commands: commandRows(rootBody),
};
if (JSON.stringify(scriptNode.commands) !== JSON.stringify(expectedCommands)) throw new Error("MOVE_AIR_CUTTER command order drifted");

const expectedComponents = [
  "asset:ANIM_TAG_AIR_WAVE", "asset:ANIM_TAG_CUT", "asset:ANIM_TAG_IMPACT",
  "sprite:gAirCutterSliceSpriteTemplate", "task:AnimTask_AirCutterProjectile", "task:AnimTask_ShakeMon2",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha",
] as const;
const airCutterGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_AIR_CUTTER");
if (!airCutterGraph || airCutterGraph.id !== 314 || airCutterGraph.rootScript !== "Move_AIR_CUTTER"
  || JSON.stringify(airCutterGraph.blocks) !== JSON.stringify(["Move_AIR_CUTTER"])
  || JSON.stringify(airCutterGraph.componentIds) !== JSON.stringify(expectedComponents)) {
  throw new Error("MOVE_AIR_CUTTER generated component graph drifted");
}
const componentUsers = Object.fromEntries(expectedComponents.map((component) => [
  component, graph.moves.filter((entry: Json) => entry.componentIds.includes(component)).map((entry: Json) => entry.move),
]));
const exclusiveComponents = ["sprite:gAirCutterSliceSpriteTemplate", "task:AnimTask_AirCutterProjectile"] as const;
const sharedControls = expectedComponents.filter((component) => !exclusiveComponents.includes(component as typeof exclusiveComponents[number]));
if (JSON.stringify(componentUsers["asset:ANIM_TAG_AIR_WAVE"]) !== JSON.stringify(["MOVE_SONIC_BOOM", "MOVE_AIR_CUTTER"])
  || exclusiveComponents.some((component) => componentUsers[component].length !== 1)
  || componentUsers["asset:ANIM_TAG_CUT"].length !== 6 || componentUsers["asset:ANIM_TAG_IMPACT"].length !== 114) {
  throw new Error("MOVE_AIR_CUTTER exclusive/shared component classification drifted");
}

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const openRanges = policy.rentalSelection.ranges.open as readonly { start: number; end: number }[];
const inRanges = (entry: Json, ranges: readonly { start: number; end: number }[]): boolean => ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_AIR_CUTTER"));
const level50Carriers = allCarriers.filter((entry: Json) => inRanges(entry, level50Ranges));
const openCarriers = allCarriers.filter((entry: Json) => inRanges(entry, openRanges));
const outsideLevel50 = allCarriers.filter((entry: Json) => !inRanges(entry, level50Ranges));
const openOnlyCarriers = openCarriers.filter((entry: Json) => !inRanges(entry, level50Ranges));
const expectedCarrierIndices = [231, 336, 386, 649];
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_AIR_CUTTER");
const openOnlyInventoryEntry = inventory.tiers.openOnly.moves.find((entry: Json) => entry.move === "MOVE_AIR_CUTTER");
if (inventoryEntry?.id !== 314 || inventoryEntry?.frontierMonCount !== 4
  || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedCarrierIndices)
  || outsideLevel50.length !== 0 || JSON.stringify(openCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([386, 649])
  || openOnlyCarriers.length !== 0 || openOnlyInventoryEntry !== undefined) {
  throw new Error("MOVE_AIR_CUTTER carrier census or Open-only distinction drifted");
}

const track = coverage.componentTracks.find((entry: Json) => entry.id === "air-cutter-projectile");
const moveEntry = coverage.entries.find((entry: Json) => entry.move === "MOVE_AIR_CUTTER");
if (!track || JSON.stringify(track.components) !== JSON.stringify([
  "asset:ANIM_TAG_AIR_WAVE", "sprite:gAirCutterSliceSpriteTemplate", "task:AnimTask_AirCutterProjectile",
]) || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_AIR_CUTTER"])
  || track.fulfilled !== true || moveEntry?.status !== "exact") {
  throw new Error("MOVE_AIR_CUTTER exact track boundary drifted");
}

requireTokens("Air Cutter script", rootBody, expectedCommands);
requireTokens("Air Cutter projectile", effects2, [
  "const struct SpriteTemplate gAirWaveProjectileSpriteTemplate", ".tileTag = ANIM_TAG_AIR_WAVE",
  "static void AnimAirWaveProjectile", "static void AirCutterProjectileStep1", "static void AirCutterProjectileStep2",
  "void AnimTask_AirCutterProjectile", "CreateSprite(&gAirWaveProjectileSpriteTemplate", "SE_M_BLIZZARD2",
  "SetAverageBattlerPositions", "GetBattlerSpriteSubpriority", "DestroyAnimVisualTask",
]);
requireTokens("Air Cutter slice", effects1, [
  "const struct SpriteTemplate gAirCutterSliceSpriteTemplate", ".tileTag = ANIM_TAG_CUT",
  ".callback = AnimAirCutterSlice", "static void AnimAirCutterSlice", "static void AnimSlice_Step",
  "BATTLE_PARTNER(gBattleAnimTarget)", "StoreSpriteCallbackInData6(sprite, DestroyAnimSprite)",
]);
requireTokens("Air Cutter controls", `${macros}\n${movement}\n${runtime}`, [
  ".macro monbg", ".macro clearmonbg", ".macro setalpha", ".macro blendoff", "void AnimTask_ShakeMon2",
  "static void AnimTask_ShakeMon2_Step", "static void Cmd_loadspritegfx", "static void Cmd_createsprite",
  "static void Cmd_createvisualtask", "static void Cmd_waitforvisualfinish", "static void Cmd_playsewithpan",
]);
requireTokens("Air Cutter resources", `${graphics}\n${registry}\n${animationConstants}`, [
  "gBattleAnimSpriteGfx_AirWave", "gBattleAnimSpritePal_AirWave", "gBattleAnimSpriteGfx_Cut",
  "gBattleAnimSpriteGfx_Impact", "{gBattleAnimSpriteGfx_AirWave, 0x0100, ANIM_TAG_AIR_WAVE}",
  "{gBattleAnimSpriteGfx_Cut, 0x0800, ANIM_TAG_CUT}", "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}",
  "#define ANIM_TAG_AIR_WAVE", "#define ANIM_TAG_CUT", "#define ANIM_TAG_IMPACT",
]);
requireTokens("Air Cutter move/audio", `${moves}\n${songs}`, [
  "[MOVE_AIR_CUTTER] =", ".effect = EFFECT_HIGH_CRITICAL", ".power = 55", ".type = TYPE_FLYING",
  "#define SE_M_CUT", "#define SE_M_BLIZZARD2",
]);
if (constantValue(animationConstants, "ANIM_SPRITES_START") !== 10000
  || constantValue(songs, "SE_M_CUT") !== 128 || constantValue(songs, "SE_M_BLIZZARD2") !== 154) {
  throw new Error("MOVE_AIR_CUTTER resource or audio constants drifted");
}

const runtimeBodies = {
  Cmd_loadspritegfx: bodyRecord("Cmd_loadspritegfx", "src/battle_anim.c", runtime),
  Cmd_createsprite: bodyRecord("Cmd_createsprite", "src/battle_anim.c", runtime),
  Cmd_createvisualtask: bodyRecord("Cmd_createvisualtask", "src/battle_anim.c", runtime),
  Cmd_delay: bodyRecord("Cmd_delay", "src/battle_anim.c", runtime),
  Cmd_waitforvisualfinish: bodyRecord("Cmd_waitforvisualfinish", "src/battle_anim.c", runtime),
  Cmd_monbg: bodyRecord("Cmd_monbg", "src/battle_anim.c", runtime),
  Cmd_clearmonbg: bodyRecord("Cmd_clearmonbg", "src/battle_anim.c", runtime),
  Cmd_setalpha: bodyRecord("Cmd_setalpha", "src/battle_anim.c", runtime),
  Cmd_blendoff: bodyRecord("Cmd_blendoff", "src/battle_anim.c", runtime),
  Cmd_playsewithpan: bodyRecord("Cmd_playsewithpan", "src/battle_anim.c", runtime),
  Cmd_end: bodyRecord("Cmd_end", "src/battle_anim.c", runtime, 0x080a3fc4),
};

console.log(JSON.stringify({
  schema: "air-cutter-source-audit/v1", move: "MOVE_AIR_CUTTER", moveId: 314,
  status: "unsupported-source-classification-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_AIR_CUTTER", nextDispatchLabel: "Move_ODOR_SLEUTH", source: scriptNode.source,
      rom: scriptNode.rom,
      pointerContract: "complete half-open dispatch-owned Move_AIR_CUTTER interval; source classification only, with no live timing, latch, reducer, seam, compositor, or framebuffer claim",
    },
    scriptNodes: { Move_AIR_CUTTER: scriptNode }, commands: { Move_AIR_CUTTER: expectedCommands },
    macros: { monbg: macroRecord("monbg"), clearmonbg: macroRecord("clearmonbg"), setalpha: macroRecord("setalpha"), blendoff: macroRecord("blendoff") },
    directBodies: {
      templates: {
        gAirWaveProjectileSpriteTemplate: objectRecord("gAirWaveProjectileSpriteTemplate", "src/battle_anim_effects_2.c", effects2),
        gAirCutterSliceSpriteTemplate: objectRecord("gAirCutterSliceSpriteTemplate", "src/battle_anim_effects_1.c", effects1),
      },
      callbacks: {
        AnimAirWaveProjectile: bodyRecord("AnimAirWaveProjectile", "src/battle_anim_effects_2.c", effects2),
        AnimAirWaveProjectile_Step1: bodyRecord("AnimAirWaveProjectile_Step1", "src/battle_anim_effects_2.c", effects2),
        AnimAirWaveProjectile_Step2: bodyRecord("AnimAirWaveProjectile_Step2", "src/battle_anim_effects_2.c", effects2),
        AnimAirCutterSlice: bodyRecord("AnimAirCutterSlice", "src/battle_anim_effects_1.c", effects1),
        AnimSlice_Step: bodyRecord("AnimSlice_Step", "src/battle_anim_effects_1.c", effects1),
        DestroyAnimSprite: bodyRecord("DestroyAnimSprite", "src/battle_anim.c", runtime),
        WaitAnimForDuration: bodyRecord("WaitAnimForDuration", "src/battle_anim_mons.c", mons),
        StoreSpriteCallbackInData6: bodyRecord("StoreSpriteCallbackInData6", "src/battle_anim_mons.c", mons),
      },
      tasks: {
        AnimTask_AirCutterProjectile: bodyRecord("AnimTask_AirCutterProjectile", "src/battle_anim_effects_2.c", effects2),
        AirCutterProjectileStep1: bodyRecord("AirCutterProjectileStep1", "src/battle_anim_effects_2.c", effects2),
        AirCutterProjectileStep2: bodyRecord("AirCutterProjectileStep2", "src/battle_anim_effects_2.c", effects2),
        AnimTask_ShakeMon2: bodyRecord("AnimTask_ShakeMon2", "src/battle_anim_mon_movement.c", movement),
        AnimTask_ShakeMon2_Step: bodyRecord("AnimTask_ShakeMon2_Step", "src/battle_anim_mon_movement.c", movement),
      },
      runtimeCommands: runtimeBodies,
    },
  },
  graph: {
    blocks: airCutterGraph.blocks, components: expectedComponents,
    exclusiveToAirCutter: exclusiveComponents,
    sharedControls,
    componentUsers,
    projectileTrack: {
      id: track.id, components: track.components, singletonRepresentative: "MOVE_AIR_CUTTER",
      classification: "The asset is source-shared with Sonic Boom, but the Air Cutter triple is singleton because its gAirCutterSliceSpriteTemplate and AnimTask_AirCutterProjectile are unique. AIR_WAVE never transfers this task/slice/timing acceptance.",
    },
  },
  behavior: {
    resources: ["ANIM_TAG_AIR_WAVE", "ANIM_TAG_CUT", "ANIM_TAG_IMPACT"],
    projectile: { task: "AnimTask_AirCutterProjectile", args: [32, -24, 1536, 2, 128], spawns: 3, template: "gAirWaveProjectileSpriteTemplate", audio: "SE_M_BLIZZARD2 attacker+1" },
    strike: { audio: "SE_M_CUT target", template: "gAirCutterSliceSpriteTemplate", args: [40, -32, 0, 2], targetShakes: ["ANIM_TARGET", "ANIM_DEF_PARTNER"], shakeArgs: [2, 0, 8, 1] },
    monbg: "ANIM_DEF_PARTNER", alpha: [12, 8], cleanup: ["blendoff", "clearmonbg ANIM_DEF_PARTNER"],
  },
  resources: {
    airWave: { tag: "ANIM_TAG_AIR_WAVE", tagValue: 10003, tileBytes: 256, gfx: romRange("gBattleAnimSpriteGfx_AirWave"), palette: romRange("gBattleAnimSpritePal_AirWave"), sourceIdentity: "graphics/battle_anims/sprites/air_wave.png; shared exact Sonic Boom asset control only" },
    cut: { tag: "ANIM_TAG_CUT", tagValue: 10138, tileBytes: 2048, gfx: romRange("gBattleAnimSpriteGfx_Cut"), palette: romRange("gBattleAnimSpritePal_Impact"), sourceIdentity: "graphics/battle_anims/sprites/cut.png; shared control only" },
    impact: { tag: "ANIM_TAG_IMPACT", tagValue: 10135, tileBytes: 512, gfx: romRange("gBattleAnimSpriteGfx_Impact"), palette: romRange("gBattleAnimSpritePal_Impact"), sourceIdentity: "graphics/battle_anims/sprites/impact.png; shared control only" },
  },
  carriers: {
    level50Ranges, count: level50Carriers.length,
    all: level50Carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })),
    lowest: level50Carriers[0], lowerTierOnly: outsideLevel50,
    openOnly: { inventoryEntry: null, carrierDifference: openOnlyCarriers.map((entry: Json) => entry.index), openCarriersAlsoLevel50: openCarriers.map((entry: Json) => entry.index), conclusion: "No Air Cutter-specific Open-only delta: Open carriers 386 and 649 are already Level-50 carriers." },
  },
  coverageBoundary: {
    moveEntryPresent: false, moveStatus: "unsupported-absent", componentTrack: track.id, componentTrackFulfilled: false,
    noCredit: "Sonic Boom's exact AIR_WAVE asset control and every CUT/IMPACT/ShakeMon2/monbg/alpha control remain controls only. They do not prove Air Cutter's unique projectile task, slice callback, dual target scheduling, or timing/latch/framebuffer behavior.",
  },
  checkpoint: {
    sourceAudit: true, completeCarrierCensus: true, legalBilateralStagingRequestAdded: false,
    oracleOrMgbaInvoked: false, denseWindowCaptured: false, latchMeasured: false,
    reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false,
    coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false,
    boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true,
  },
}, null, 2));
