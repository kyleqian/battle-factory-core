/**
 * Authoritative source/classification receipt for MOVE_DIG.
 *
 * This is deliberately development-only: it maps the source-owned dispatch
 * graph and carrier inventory, but contains no oracle, mGBA, framebuffer, or
 * runtime presentation data.
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
const ground = read("src/battle_anim_ground.c");
const normal = read("src/battle_anim_normal.c");
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
    const name = fields.at(-1)!;
    const candidates = symbols.get(name) ?? [];
    candidates.push({ address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
    symbols.set(name, candidates);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const name = fields[2]!;
    const candidates = symbols.get(name) ?? [];
    candidates.push({ address: Number.parseInt(fields[0]!, 16), size: 0 });
    symbols.set(name, candidates);
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
  return body.split("\n")
    .map((line) => line.replace(/@.*$/u, "").trim())
    .filter((line) => line.length > 0 && !line.endsWith(":"));
}

function scriptRecord(start: string, end: string): Json {
  const body = sourceBlock(scripts, `${start}:\n`, `${end}:\n`);
  return {
    source: sourceSpan("data/battle_anim_scripts.s", scripts, body),
    rom: romRange(start, sym(end).address),
    commands: commandRows(body),
  };
}

function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

function constantValue(source: string, name: string): number {
  const match = source.match(new RegExp(`^#define\\s+${name}\\s+(\\d+)`, "mu"));
  if (!match) throw new Error(`missing numeric constant ${name}`);
  return Number.parseInt(match[1]!, 10);
}

const rootBody = sourceBlock(scripts, "Move_DIG:\n", "Move_MEDITATE:\n");
const scriptNodes = {
  Move_DIG: scriptRecord("Move_DIG", "DigEnd"),
  DigEnd: scriptRecord("DigEnd", "DigSetUp"),
  DigSetUp: scriptRecord("DigSetUp", "DigUnleash"),
  DigUnleash: scriptRecord("DigUnleash", "DigThrowDirt"),
  DigThrowDirt: scriptRecord("DigThrowDirt", "Move_MEDITATE"),
};
const expectedCommands = {
  Move_DIG: ["choosetwoturnanim DigSetUp, DigUnleash"],
  DigEnd: ["end"],
  DigSetUp: [
    "loadspritegfx ANIM_TAG_MUD_SAND",
    "loadspritegfx ANIM_TAG_DIRT_MOUND",
    "createsprite gDirtMoundSpriteTemplate, ANIM_ATTACKER, 1, 0, 0, 180",
    "createsprite gDirtMoundSpriteTemplate, ANIM_ATTACKER, 1, 0, 1, 180",
    "monbg_static ANIM_ATTACKER",
    "delay 1",
    "createvisualtask AnimTask_DigDownMovement, 2, FALSE",
    "delay 6",
    "call DigThrowDirt",
    "call DigThrowDirt",
    "call DigThrowDirt",
    "call DigThrowDirt",
    "call DigThrowDirt",
    "waitforvisualfinish",
    "clearmonbg_static ANIM_ATTACKER",
    "delay 1",
    "createvisualtask AnimTask_DigDownMovement, 2, TRUE",
    "goto DigEnd",
  ],
  DigUnleash: [
    "loadspritegfx ANIM_TAG_IMPACT",
    "loadspritegfx ANIM_TAG_DIRT_MOUND",
    "createvisualtask AnimTask_DigUpMovement, 2, FALSE",
    "waitforvisualfinish",
    "monbg ANIM_ATTACKER",
    "createsprite gDirtMoundSpriteTemplate, ANIM_ATTACKER, 1, 0, 0, 48",
    "createsprite gDirtMoundSpriteTemplate, ANIM_ATTACKER, 1, 0, 1, 48",
    "delay 1",
    "createvisualtask AnimTask_DigUpMovement, 2, TRUE",
    "delay 16",
    "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=-8, y=0, relative_to=ANIM_TARGET, animation=2",
    "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 6, 1",
    "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_ATTACKER",
    "clearmonbg ANIM_ATTACKER",
    "goto DigEnd",
  ],
  DigThrowDirt: [
    "createsprite gDirtPlumeSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 12, 4, -16, 18",
    "createsprite gDirtPlumeSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 16, 4, -10, 18",
    "createsprite gDirtPlumeSpriteTemplate, ANIM_ATTACKER, 2, 0, 1, 14, 4, -18, 18",
    "createsprite gDirtPlumeSpriteTemplate, ANIM_ATTACKER, 2, 0, 1, 12, 4, -16, 18",
    "playsewithpan SE_M_DIG, SOUND_PAN_ATTACKER",
    "delay 32",
    "return",
  ],
} as const;

for (const [name, expected] of Object.entries(expectedCommands)) {
  if (JSON.stringify(scriptNodes[name as keyof typeof scriptNodes].commands) !== JSON.stringify(expected)) {
    throw new Error(`MOVE_DIG ${name} command order drifted`);
  }
}

const rootStart = sym("Move_DIG").address;
const rootEnd = sym("Move_MEDITATE").address;
const rootOffset = rootStart - 0x08000000;
const chooser = {
  opcode: rom[rootOffset],
  evenPointer: rom.readUInt32LE(rootOffset + 1),
  oddPointer: rom.readUInt32LE(rootOffset + 5),
};
if (chooser.opcode !== 0x11 || chooser.evenPointer !== sym("DigSetUp").address || chooser.oddPointer !== sym("DigUnleash").address) {
  throw new Error("MOVE_DIG choosetwoturnanim ROM routing drifted");
}

const expectedComponents = [
  "asset:ANIM_TAG_DIRT_MOUND",
  "asset:ANIM_TAG_IMPACT",
  "asset:ANIM_TAG_MUD_SAND",
  "sprite:gDirtMoundSpriteTemplate",
  "sprite:gDirtPlumeSpriteTemplate",
  "subroutine:DigEnd",
  "subroutine:DigSetUp",
  "subroutine:DigThrowDirt",
  "subroutine:DigUnleash",
  "task:AnimTask_DigDownMovement",
  "task:AnimTask_DigUpMovement",
  "task:AnimTask_ShakeMon",
  "visualCommand:clearmonbg",
  "visualCommand:clearmonbg_static",
  "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:monbg",
  "visualCommand:monbg_static",
] as const;
const digGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_DIG");
const fissureGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_FISSURE");
const sharedWithFissure = digGraph?.componentIds.filter((id: string) => fissureGraph.componentIds.includes(id));
if (!digGraph || digGraph.id !== 91 || digGraph.rootScript !== "Move_DIG"
  || JSON.stringify(digGraph.blocks) !== JSON.stringify(["Move_DIG", "DigSetUp", "DigUnleash", "DigThrowDirt", "DigEnd"])
  || JSON.stringify(digGraph.componentIds) !== JSON.stringify(expectedComponents)
  || JSON.stringify(sharedWithFissure) !== JSON.stringify(["asset:ANIM_TAG_MUD_SAND", "sprite:gDirtPlumeSpriteTemplate"])) {
  throw new Error("MOVE_DIG generated component graph or Fissure intersection drifted");
}

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const openRanges = policy.rentalSelection.ranges.open as readonly { start: number; end: number }[];
const inRanges = (entry: Json, ranges: readonly { start: number; end: number }[]): boolean => ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_DIG"));
const level50Carriers = allCarriers.filter((entry: Json) => inRanges(entry, level50Ranges));
const openCarriers = allCarriers.filter((entry: Json) => inRanges(entry, openRanges));
const outsideLevel50 = allCarriers.filter((entry: Json) => !inRanges(entry, level50Ranges));
const openOnlyCarriers = openCarriers.filter((entry: Json) => !inRanges(entry, level50Ranges));
const expectedLevel50CarrierIndices = [132, 133, 192, 195, 210, 217, 230, 236, 238, 261, 262, 265, 282, 287, 297, 418, 494, 528, 539];
const expectedOutsideLevel50 = [14, 31, 41, 53, 58, 67, 74];
const expectedOpenShared = [418, 494, 528, 539];
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_DIG");
const openOnlyInventoryEntry = inventory.tiers.openOnly.moves.find((entry: Json) => entry.move === "MOVE_DIG");
if (inventoryEntry?.id !== 91 || inventoryEntry?.frontierMonCount !== 19
  || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedLevel50CarrierIndices)
  || JSON.stringify(outsideLevel50.map((entry: Json) => entry.index)) !== JSON.stringify(expectedOutsideLevel50)
  || JSON.stringify(openCarriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedOpenShared)
  || openOnlyCarriers.length !== 0 || openOnlyInventoryEntry !== undefined) {
  throw new Error("MOVE_DIG carrier census or Open-only distinction drifted");
}

const track = coverage.componentTracks.find((entry: Json) => entry.id === "dirt-plume-fissure-dig");
const digCoverage = coverage.entries.find((entry: Json) => entry.move === "MOVE_DIG");
const fissureCoverage = coverage.entries.find((entry: Json) => entry.move === "MOVE_FISSURE");
if (!track || JSON.stringify(track.components) !== JSON.stringify(["asset:ANIM_TAG_MUD_SAND", "sprite:gDirtPlumeSpriteTemplate"])
  || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_FISSURE", "MOVE_DIG"])
  || digCoverage !== undefined || fissureCoverage?.status !== "exact") {
  throw new Error("MOVE_DIG unsupported boundary or independent Fissure control drifted");
}

requireTokens("Dig move script", rootBody, [
  "choosetwoturnanim DigSetUp, DigUnleash", "monbg_static ANIM_ATTACKER", "clearmonbg_static ANIM_ATTACKER",
  "createvisualtask AnimTask_DigDownMovement, 2, FALSE", "createvisualtask AnimTask_DigDownMovement, 2, TRUE",
  "createvisualtask AnimTask_DigUpMovement, 2, FALSE", "createvisualtask AnimTask_DigUpMovement, 2, TRUE",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=-8, y=0, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 6, 1", "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_ATTACKER",
  "playsewithpan SE_M_DIG, SOUND_PAN_ATTACKER", "delay 32", "goto DigEnd",
]);
requireTokens("Dig templates and callbacks", ground, [
  "const struct SpriteTemplate gDirtPlumeSpriteTemplate", ".tileTag = ANIM_TAG_MUD_SAND", ".callback = AnimDirtPlumeParticle",
  "const struct SpriteTemplate gDirtMoundSpriteTemplate", ".tileTag = ANIM_TAG_DIRT_MOUND", ".callback = AnimDigDirtMound",
  "void AnimTask_DigDownMovement", "static void AnimTask_DigBounceMovement", "static void AnimTask_DigEndBounceMovementSetInvisible",
  "void AnimTask_DigUpMovement", "static void AnimTask_DigSetVisibleUnderground", "static void AnimTask_DigRiseUpFromHole",
  "static void SetDigScanlineEffect", "void AnimDirtPlumeParticle", "static void AnimDirtPlumeParticle_Step", "static void AnimDigDirtMound",
]);
requireTokens("Dig IMPACT macro/template", `${macros}\n${normal}`, [
  ".macro create_basic_hitsplat_sprite", "createsprite gBasicHitSplatSpriteTemplate", "const struct SpriteTemplate gBasicHitSplatSpriteTemplate",
  ".tileTag = ANIM_TAG_IMPACT", ".callback = AnimHitSplatBasic", "sAffineAnim_HitSplat_2", "static void AnimHitSplatBasic",
]);
requireTokens("Dig movement and runtime", `${movement}\n${mons}\n${runtime}`, [
  "void AnimTask_ShakeMon", "static void AnimTask_ShakeMon_Step", "void WaitAnimForDuration", "void InitAnimArcTranslation",
  "bool8 TranslateAnimHorizontalArc", "void RunStoredCallbackWhenAffineAnimEnds", "static void Cmd_choosetwoturnanim",
  "if (gAnimMoveTurn & 1)", "static void Cmd_monbg_static", "static void Cmd_clearmonbg_static", "static void Task_ClearMonBgStatic",
]);
requireTokens("Dig resources", `${graphics}\n${registry}\n${animationConstants}`, [
  "gBattleAnimSpriteGfx_DirtMound", "gBattleAnimSpritePal_DirtMound", "graphics/battle_anims/sprites/dirt_mound.png",
  "{gBattleAnimSpriteGfx_DirtMound, 0x0200, ANIM_TAG_DIRT_MOUND}", "{gBattleAnimSpritePal_DirtMound, ANIM_TAG_DIRT_MOUND}",
  "{gBattleAnimSpriteGfx_MudSand, 0x00A0, ANIM_TAG_MUD_SAND}", "{gBattleAnimSpritePal_MudSand, ANIM_TAG_MUD_SAND}",
  "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}", "{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}",
  "#define ANIM_TAG_MUD_SAND                   (ANIM_SPRITES_START + 74)",
  "#define ANIM_TAG_IMPACT                     (ANIM_SPRITES_START + 135)",
  "#define ANIM_TAG_DIRT_MOUND                 (ANIM_SPRITES_START + 281)",
]);
requireTokens("Dig move/audio", `${moves}\n${songs}`, [
  "[MOVE_DIG] =", ".effect = EFFECT_SEMI_INVULNERABLE", ".power = 60", ".accuracy = 100", ".pp = 10",
  "#define SE_M_MEGA_KICK2", "#define SE_M_DIG",
]);
if (constantValue(animationConstants, "ANIM_SPRITES_START") !== 10000
  || constantValue(songs, "SE_M_MEGA_KICK2") !== 141
  || constantValue(songs, "SE_M_DIG") !== 175) {
  throw new Error("MOVE_DIG tag or audio constant drifted");
}

const runtimeBodies = {
  Cmd_loadspritegfx: bodyRecord("Cmd_loadspritegfx", "src/battle_anim.c", runtime),
  Cmd_createsprite: bodyRecord("Cmd_createsprite", "src/battle_anim.c", runtime),
  Cmd_createvisualtask: bodyRecord("Cmd_createvisualtask", "src/battle_anim.c", runtime),
  Cmd_delay: bodyRecord("Cmd_delay", "src/battle_anim.c", runtime),
  Cmd_waitforvisualfinish: bodyRecord("Cmd_waitforvisualfinish", "src/battle_anim.c", runtime),
  Cmd_end: bodyRecord("Cmd_end", "src/battle_anim.c", runtime, 0x080a3fc4),
  Cmd_monbg: bodyRecord("Cmd_monbg", "src/battle_anim.c", runtime),
  Cmd_clearmonbg: bodyRecord("Cmd_clearmonbg", "src/battle_anim.c", runtime),
  Cmd_monbg_static: bodyRecord("Cmd_monbg_static", "src/battle_anim.c", runtime),
  Cmd_clearmonbg_static: bodyRecord("Cmd_clearmonbg_static", "src/battle_anim.c", runtime),
  Task_ClearMonBgStatic: bodyRecord("Task_ClearMonBgStatic", "src/battle_anim.c", runtime),
  Cmd_call: bodyRecord("Cmd_call", "src/battle_anim.c", runtime, 0x080a4ccc),
  Cmd_return: bodyRecord("Cmd_return", "src/battle_anim.c", runtime, 0x080a4d00),
  Cmd_goto: bodyRecord("Cmd_goto", "src/battle_anim.c", runtime, 0x080a4dcc),
  Cmd_choosetwoturnanim: bodyRecord("Cmd_choosetwoturnanim", "src/battle_anim.c", runtime),
  Cmd_playsewithpan: bodyRecord("Cmd_playsewithpan", "src/battle_anim.c", runtime),
  Task_InitUpdateMonBg: bodyRecord("Task_InitUpdateMonBg", "src/battle_anim.c", runtime),
  Task_UpdateMonBg: bodyRecord("Task_UpdateMonBg", "src/battle_anim.c", runtime),
  Task_ClearMonBg: bodyRecord("Task_ClearMonBg", "src/battle_anim.c", runtime),
};

console.log(JSON.stringify({
  schema: "dig-source-audit/v1",
  move: "MOVE_DIG",
  moveId: 91,
  status: "unsupported-source-classification-checkpoint",
  coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_DIG",
      nextDispatchLabel: "Move_MEDITATE",
      source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody),
      rom: romRange("Move_DIG", rootEnd),
      pointerContract: "complete half-open dispatch-owned Move_DIG interval, including DigEnd, DigSetUp, DigUnleash, and DigThrowDirt; no live timing, latch, or framebuffer claim",
    },
    scriptNodes,
    commands: expectedCommands,
    twoTurnRouting: {
      macro: macroRecord("choosetwoturnanim"),
      handler: runtimeBodies.Cmd_choosetwoturnanim,
      encoding: { opcode: chooser.opcode, evenPointer: hex(chooser.evenPointer), oddPointer: hex(chooser.oddPointer) },
      branch: {
        bit: "gAnimMoveTurn & 1",
        even: "DigSetUp",
        odd: "DigUnleash",
        note: "Animation-dispatch classification only; it neither implements nor infers battle-state routing.",
      },
    },
    macros: {
      create_basic_hitsplat_sprite: macroRecord("create_basic_hitsplat_sprite"),
      monbg_static: macroRecord("monbg_static"),
      clearmonbg_static: macroRecord("clearmonbg_static"),
    },
    directBodies: {
      templates: {
        gDirtPlumeSpriteTemplate: objectRecord("gDirtPlumeSpriteTemplate", "src/battle_anim_ground.c", ground),
        gDirtMoundSpriteTemplate: objectRecord("gDirtMoundSpriteTemplate", "src/battle_anim_ground.c", ground),
        gBasicHitSplatSpriteTemplate: objectRecord("gBasicHitSplatSpriteTemplate", "src/battle_anim_normal.c", normal),
      },
      hitSplatAffinePrograms: {
        sAffineAnim_HitSplat_0: objectRecord("sAffineAnim_HitSplat_0", "src/battle_anim_normal.c", normal),
        sAffineAnim_HitSplat_1: objectRecord("sAffineAnim_HitSplat_1", "src/battle_anim_normal.c", normal),
        sAffineAnim_HitSplat_2: objectRecord("sAffineAnim_HitSplat_2", "src/battle_anim_normal.c", normal),
        sAffineAnim_HitSplat_3: objectRecord("sAffineAnim_HitSplat_3", "src/battle_anim_normal.c", normal),
        sAffineAnims_HitSplat: objectRecord("sAffineAnims_HitSplat", "src/battle_anim_normal.c", normal),
      },
      callbacks: {
        AnimDirtPlumeParticle: bodyRecord("AnimDirtPlumeParticle", "src/battle_anim_ground.c", ground),
        AnimDirtPlumeParticle_Step: bodyRecord("AnimDirtPlumeParticle_Step", "src/battle_anim_ground.c", ground),
        AnimDigDirtMound: bodyRecord("AnimDigDirtMound", "src/battle_anim_ground.c", ground),
        AnimHitSplatBasic: bodyRecord("AnimHitSplatBasic", "src/battle_anim_normal.c", normal),
        InitAnimArcTranslation: bodyRecord("InitAnimArcTranslation", "src/battle_anim_mons.c", mons),
        TranslateAnimHorizontalArc: bodyRecord("TranslateAnimHorizontalArc", "src/battle_anim_mons.c", mons),
        StoreSpriteCallbackInData6: bodyRecord("StoreSpriteCallbackInData6", "src/battle_anim_mons.c", mons),
        WaitAnimForDuration: bodyRecord("WaitAnimForDuration", "src/battle_anim_mons.c", mons),
        RunStoredCallbackWhenAffineAnimEnds: bodyRecord("RunStoredCallbackWhenAffineAnimEnds", "src/battle_anim_mons.c", mons),
        DestroyAnimSprite: bodyRecord("DestroyAnimSprite", "src/battle_anim.c", runtime),
      },
      tasks: {
        AnimTask_DigDownMovement: bodyRecord("AnimTask_DigDownMovement", "src/battle_anim_ground.c", ground),
        AnimTask_DigBounceMovement: bodyRecord("AnimTask_DigBounceMovement", "src/battle_anim_ground.c", ground),
        AnimTask_DigEndBounceMovementSetInvisible: bodyRecord("AnimTask_DigEndBounceMovementSetInvisible", "src/battle_anim_ground.c", ground),
        AnimTask_DigUpMovement: bodyRecord("AnimTask_DigUpMovement", "src/battle_anim_ground.c", ground),
        AnimTask_DigSetVisibleUnderground: bodyRecord("AnimTask_DigSetVisibleUnderground", "src/battle_anim_ground.c", ground),
        AnimTask_DigRiseUpFromHole: bodyRecord("AnimTask_DigRiseUpFromHole", "src/battle_anim_ground.c", ground),
        SetDigScanlineEffect: bodyRecord("SetDigScanlineEffect", "src/battle_anim_ground.c", ground),
        AnimTask_ShakeMon: bodyRecord("AnimTask_ShakeMon", "src/battle_anim_mon_movement.c", movement),
        AnimTask_ShakeMon_Step: bodyRecord("AnimTask_ShakeMon_Step", "src/battle_anim_mon_movement.c", movement),
      },
      runtimeCommands: runtimeBodies,
    },
  },
  graph: {
    blocks: digGraph.blocks,
    components: expectedComponents,
    sharedWithExactFissure: sharedWithFissure,
    distinctFromFissure: digGraph.componentIds.filter((id: string) => !sharedWithFissure.includes(id)),
  },
  behavior: {
    setup: {
      resources: ["ANIM_TAG_MUD_SAND", "ANIM_TAG_DIRT_MOUND"],
      dirtMounds: [{ half: 0, duration: 180 }, { half: 1, duration: 180 }],
      background: "monbg_static ANIM_ATTACKER -> clearmonbg_static ANIM_ATTACKER",
      tasks: ["AnimTask_DigDownMovement(FALSE)", "AnimTask_DigDownMovement(TRUE)"],
      dirtBursts: { calls: 5, spritesPerCall: 4, callback: "DigThrowDirt", delayAfterEach: 32 },
    },
    unleash: {
      resources: ["ANIM_TAG_IMPACT", "ANIM_TAG_DIRT_MOUND"],
      tasks: ["AnimTask_DigUpMovement(FALSE)", "AnimTask_DigUpMovement(TRUE)", "AnimTask_ShakeMon(ANIM_TARGET, 5, 0, 6, 1)"],
      dirtMounds: [{ half: 0, duration: 48 }, { half: 1, duration: 48 }],
      impact: "gBasicHitSplatSpriteTemplate with x=-8, y=0, relative_to=ANIM_TARGET, affine animation 2",
      background: "monbg ANIM_ATTACKER -> clearmonbg ANIM_ATTACKER",
    },
    audio: [
      { sound: "SE_M_DIG", id: constantValue(songs, "SE_M_DIG"), site: "DigThrowDirt x5", pan: "SOUND_PAN_ATTACKER" },
      { sound: "SE_M_MEGA_KICK2", id: constantValue(songs, "SE_M_MEGA_KICK2"), site: "DigUnleash", pan: "SOUND_PAN_ATTACKER" },
    ],
  },
  resources: {
    dirtMound: {
      tag: "ANIM_TAG_DIRT_MOUND", tagValue: 10281, tileBytes: 512,
      gfx: romRange("gBattleAnimSpriteGfx_DirtMound"), palette: romRange("gBattleAnimSpritePal_DirtMound"),
      source: "graphics/battle_anims/sprites/dirt_mound.png; gDirtMoundSpriteTemplate; deterministic asset src/animation/assets/dig-dirt-mound.json",
    },
    reusedMudSand: {
      tag: "ANIM_TAG_MUD_SAND", tagValue: 10074, tileBytes: 160,
      gfx: romRange("gBattleAnimSpriteGfx_MudSand"), palette: romRange("gBattleAnimSpritePal_MudSand"),
      sourceIdentity: "graphics/battle_anims/sprites/mud_sand.4bpp + mud_sand.pal; gDirtPlumeSpriteTemplate; source-identical existing src/assets/gen/battle-anim-mud-sand.json is reused without a Dig copy",
    },
    reusedImpact: {
      tag: "ANIM_TAG_IMPACT", tagValue: 10135, tileBytes: 512,
      gfx: romRange("gBattleAnimSpriteGfx_Impact"), palette: romRange("gBattleAnimSpritePal_Impact"),
      sourceIdentity: "graphics/battle_anims/sprites/impact.png; gBasicHitSplatSpriteTemplate affine animation 2; exact shared source identity is reused without a Dig copy",
    },
  },
  carriers: {
    level50Ranges,
    count: level50Carriers.length,
    all: level50Carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })),
    lowest: level50Carriers[0],
    lowerTierOnly: outsideLevel50.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species })),
    openOnly: {
      inventoryEntry: null,
      carrierDifference: openOnlyCarriers.map((entry: Json) => entry.index),
      openCarriersAlsoLevel50: openCarriers.map((entry: Json) => entry.index),
      conclusion: "No Dig-specific Open-only inventory or carrier difference: all Open-range Dig carriers are already in the Level-50 census.",
    },
  },
  coverageBoundary: {
    digEntryPresent: false,
    digStatus: "unsupported-absent",
    componentTrack: track.id,
    componentTrackPreexisting: true,
    exactFissureControlUnchanged: true,
    sharedOnly: sharedWithFissure,
    noCredit: "Fissure's exact MUD_SAND plume evidence does not prove Dig's dirt mound, DigDown/DigUp, static monbg, hitsplat, ShakeMon, two-turn branch, or any Dig timing/latch/framebuffer behavior.",
  },
  futureHypotheses: {
    rule1: "Measure every Dig task/sprite mechanism separately; no task category implies a shared latch.",
    rule2: "Do not transfer Fissure's dirt-plume timing or latch to Dig despite source-identical MUD_SAND/plume art.",
    rule3: "A future Dig change map outranks this source receipt if displayed and RAM timing differ.",
    rule4: "Future staging must bank dense change maps in both attacker orientations before any reducer or promotion.",
    rule5: "Use one-frame-after-RAM only as the initial visible-event hypothesis; Dig task/scanline/monbg mechanisms require their own map.",
  },
  checkpoint: {
    sourceAudit: true,
    sourceDerivedDirtMoundAsset: true,
    completeCarrierCensus: true,
    legalBilateralStagingRequestAdded: false,
    oracleOrMgbaInvoked: false,
    denseWindowCaptured: false,
    latchMeasured: false,
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
