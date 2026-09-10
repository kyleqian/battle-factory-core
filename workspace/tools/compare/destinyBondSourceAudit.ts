/** Authoritative source/classification receipt for the Destiny Bond staging-only checkpoint. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Sym = { address: number; size: number };

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = read("data/battle_anim_scripts.s");
const ghost = read("src/battle_anim_ghost.c");
const utility = read("src/battle_anim_utility_funcs.c");
const movement = read("src/battle_anim_mon_movement.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
const frontierConstants = read("include/constants/battle_frontier_mons.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const symbols = new Map<string, Sym>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields.at(-1)!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}

function sym(name: string): Sym {
  const value = symbols.get(name);
  if (!value) throw new Error(`missing ELF symbol ${name}`);
  return value;
}
function romRange(name: string, end?: number): Json {
  const start = sym(name).address;
  const finish = end ?? start + sym(name).size;
  return { symbol: name, start: hex(start), endExclusive: hex(finish), byteLength: finish - start, romSha256: sha(rom.subarray(start - 0x08000000, finish - 0x08000000)) };
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
    for (let index = open; index < source.length; index++) {
      if (source[index] === "{") depth++;
      else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1);
    }
  }
  throw new Error(`missing function ${name}`);
}
function bodyRecord(name: string, path: string, source: string): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name) };
}
function objectRecord(name: string, path: string, source: string): Json {
  const token = source.indexOf(name);
  const start = source.lastIndexOf("\n", token) + 1;
  const end = source.indexOf("};", token) + 2;
  if (token < 0 || end < 2) throw new Error(`missing object ${name}`);
  return { source: sourceSpan(path, source, source.slice(start, end)), rom: romRange(name) };
}
function commandRows(body: string): string[] {
  return body.split("\n").map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const rootBody = sourceBlock(scripts, "Move_DESTINY_BOND:\n", "Move_ENDURE:\n");
const expectedCommands = [
  "loadspritegfx ANIM_TAG_WHITE_SHADOW",
  "fadetobg BG_GHOST",
  "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER",
  "waitbgfadein",
  "createvisualtask AnimTask_DestinyBondWhiteShadow, 5, 0, 48",
  "playsewithpan SE_M_CONFUSE_RAY, SOUND_PAN_ATTACKER",
  "delay 48",
  "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_ATTACKER, 2, 0, 24, 1",
  "createvisualtask AnimTask_BlendBattleAnimPalExclude, 2, 6, 1, 0, 12, RGB(29, 29, 29)",
  "delay 24",
  "createvisualtask AnimTask_BlendBattleAnimPalExclude, 2, 6, 1, 12, 0, RGB(29, 29, 29)",
  "playsewithpan SE_M_NIGHTMARE, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "restorebg",
  "waitbgfadein",
  "blendoff",
  "clearmonbg 5",
  "end",
] as const;
const expectedComponents = [
  "asset:ANIM_TAG_WHITE_SHADOW",
  "task:AnimTask_BlendBattleAnimPalExclude",
  "task:AnimTask_DestinyBondWhiteShadow",
  "task:AnimTask_ShakeMonInPlace",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:fadetobg",
  "visualCommand:restorebg",
  "visualCommand:waitbgfadein",
] as const;
const rootStart = sym("Move_DESTINY_BOND").address;
const rootEnd = sym("Move_ENDURE").address;
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_DESTINY_BOND");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_DESTINY_BOND");
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_DESTINY_BOND"));
const level50 = carriers.filter((entry: Json) => entry.index >= 110 && entry.index <= 849);
const outside = carriers.filter((entry: Json) => entry.index < 110);
const openOnly = carriers.filter((entry: Json) => entry.index > 849);
const track = coverage.componentTracks.find((entry: Json) => entry.id === "destiny-bond-white-shadow");

if (JSON.stringify(commandRows(rootBody)) !== JSON.stringify(expectedCommands)) throw new Error("Destiny Bond root command order drifted");
if (!graphEntry || graphEntry.id !== 194 || graphEntry.rootScript !== "Move_DESTINY_BOND" || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_DESTINY_BOND"]) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Destiny Bond component graph drifted");
if (!move || move.power !== 0 || move.accuracy !== 0 || move.pp !== 5 || move.effect !== "EFFECT_DESTINY_BOND" || move.frontierMonCount !== 10 || move.speciesCount !== 6 || JSON.stringify(move.exampleMons) !== JSON.stringify(["FRONTIER_MON_WOBBUFFET_2", "FRONTIER_MON_QWILFISH_2", "FRONTIER_MON_WEEZING_2"])) throw new Error("Destiny Bond inventory drifted");
if (JSON.stringify(level50.map((entry: Json) => entry.index)) !== JSON.stringify([290, 316, 501, 662, 709, 802, 803, 812, 813, 814]) || outside.length !== 0 || openOnly.length !== 0) throw new Error("Destiny Bond carrier census drifted");
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_DESTINY_BOND") || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_DESTINY_BOND"]) || !track || track.fulfilled !== false || JSON.stringify(track.components) !== JSON.stringify(expectedComponents) || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_DESTINY_BOND"])) throw new Error("Destiny Bond unfulfilled coverage boundary drifted");

requireTokens("Destiny Bond white shadow", ghost, [
  "const struct SpriteTemplate gDestinyBondWhiteShadowSpriteTemplate", ".tileTag = ANIM_TAG_WHITE_SHADOW", ".paletteTag = ANIM_TAG_WHITE_SHADOW", ".oam = &gOamData_AffineOff_ObjBlend_64x32", "static void AnimDestinyBondWhiteShadow", "static void AnimDestinyBondWhiteShadow_Step", "void AnimTask_DestinyBondWhiteShadow", "static void AnimTask_DestinyBondWhiteShadow_Step", "SetGpuReg(REG_OFFSET_BLDCNT, (BLDCNT_EFFECT_BLEND | BLDCNT_TGT2_ALL))", "BLDALPHA_BLEND(0, 0x10)", "CreateSprite(&gDestinyBondWhiteShadowSpriteTemplate", "DestroySprite(&gSprites[task->data[i + 13]])",
]);
requireTokens("Destiny Bond palette", utility, ["void AnimTask_BlendBattleAnimPalExclude", "case 6:", "BATTLE_PARTNER(gBattleAnimAttacker)", "StartBlendAnimSpriteColor", "static void StartBlendAnimSpriteColor", "static void AnimTask_BlendSpriteColor_Step2"]);
requireTokens("Destiny Bond shake", movement, ["void AnimTask_ShakeMonInPlace", "static void AnimTask_ShakeMonInPlace_Step", "gSprites[spriteId].x2 += gBattleAnimArgs[1]", "gTasks[taskId].data[5] = gBattleAnimArgs[1] * 2"]);
requireTokens("Destiny Bond lifecycle", runtime, ["static void Cmd_loadspritegfx", "static void Cmd_fadetobg", "static void Cmd_restorebg", "static void Cmd_waitbgfadein", "static void Cmd_blendoff", "static void Cmd_clearmonbg", "static void Task_FadeToBg", "static void Task_UpdateMonBg", "static void Task_ClearMonBg", "static void LoadMoveBg", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag"]);
requireTokens("Destiny Bond resources", registry, ["{gBattleAnimSpriteGfx_WhiteShadow, 0x0400, ANIM_TAG_WHITE_SHADOW}", "{gBattleAnimSpritePal_WhiteShadow, ANIM_TAG_WHITE_SHADOW}", "[BG_GHOST]"]);
requireTokens("Destiny Bond graphics", graphics, ["graphics/battle_anims/sprites/white_shadow.png", "gBattleAnimBgImage_Ghost", "gBattleAnimBgPalette_Ghost", "gBattleAnimBgTilemap_Ghost"]);
requireTokens("Destiny Bond constants", constants, ["#define ANIM_TAG_WHITE_SHADOW", "#define BG_GHOST 2"]);
requireTokens("Destiny Bond audio", songs, ["#define SE_M_NIGHTMARE              121", "#define SE_M_PSYBEAM                189", "#define SE_M_CONFUSE_RAY            196"]);
requireTokens("Destiny Bond move", moves, ["[MOVE_DESTINY_BOND] =", ".effect = EFFECT_DESTINY_BOND", ".power = 0", ".accuracy = 0", ".pp = 5"]);
requireTokens("Destiny Bond carrier constants", frontierConstants, ["FRONTIER_MON_WOBBUFFET_2", "FRONTIER_MON_QWILFISH_2", "FRONTIER_MON_WEEZING_2", "FRONTIER_MON_MISDREAVUS_4", "FRONTIER_MON_GENGAR_4", "FRONTIER_MON_GENGAR_7", "FRONTIER_MON_GENGAR_8", "FRONTIER_MON_GARDEVOIR_5", "FRONTIER_MON_GARDEVOIR_6", "FRONTIER_MON_GARDEVOIR_7"]);
requireTokens("Destiny Bond carrier source", frontierSource, [".moves = {MOVE_COUNTER, MOVE_MIRROR_COAT, MOVE_ENCORE, MOVE_DESTINY_BOND}", ".moves = {MOVE_REVENGE, MOVE_SLUDGE_BOMB, MOVE_SHADOW_BALL, MOVE_DESTINY_BOND}", ".moves = {MOVE_MEMENTO, MOVE_SLUDGE_BOMB, MOVE_FACADE, MOVE_DESTINY_BOND}", ".moves = {MOVE_DESTINY_BOND, MOVE_PSYCHIC, MOVE_SHADOW_BALL, MOVE_THUNDERBOLT}", ".moves = {MOVE_PSYCHIC, MOVE_FIRE_PUNCH, MOVE_ICE_PUNCH, MOVE_DESTINY_BOND}", ".moves = {MOVE_PSYCHIC, MOVE_THUNDERBOLT, MOVE_FIRE_PUNCH, MOVE_DESTINY_BOND}", ".moves = {MOVE_PSYCHIC, MOVE_THUNDERBOLT, MOVE_ICE_PUNCH, MOVE_DESTINY_BOND}", ".moves = {MOVE_PSYCHIC, MOVE_SHADOW_BALL, MOVE_ENDURE, MOVE_DESTINY_BOND}", ".moves = {MOVE_PSYCHIC, MOVE_THUNDERBOLT, MOVE_WILL_O_WISP, MOVE_DESTINY_BOND}", ".moves = {MOVE_PSYCHIC, MOVE_CALM_MIND, MOVE_WILL_O_WISP, MOVE_DESTINY_BOND}"]);

const callbacks = {
  AnimDestinyBondWhiteShadow: bodyRecord("AnimDestinyBondWhiteShadow", "src/battle_anim_ghost.c", ghost),
  AnimDestinyBondWhiteShadow_Step: bodyRecord("AnimDestinyBondWhiteShadow_Step", "src/battle_anim_ghost.c", ghost),
  AnimTask_DestinyBondWhiteShadow: bodyRecord("AnimTask_DestinyBondWhiteShadow", "src/battle_anim_ghost.c", ghost),
  AnimTask_DestinyBondWhiteShadow_Step: bodyRecord("AnimTask_DestinyBondWhiteShadow_Step", "src/battle_anim_ghost.c", ghost),
  AnimTask_BlendBattleAnimPalExclude: bodyRecord("AnimTask_BlendBattleAnimPalExclude", "src/battle_anim_utility_funcs.c", utility),
  StartBlendAnimSpriteColor: bodyRecord("StartBlendAnimSpriteColor", "src/battle_anim_utility_funcs.c", utility),
  AnimTask_BlendSpriteColor_Step2: bodyRecord("AnimTask_BlendSpriteColor_Step2", "src/battle_anim_utility_funcs.c", utility),
  AnimTask_ShakeMonInPlace: bodyRecord("AnimTask_ShakeMonInPlace", "src/battle_anim_mon_movement.c", movement),
  AnimTask_ShakeMonInPlace_Step: bodyRecord("AnimTask_ShakeMonInPlace_Step", "src/battle_anim_mon_movement.c", movement),
  Task_FadeToBg: bodyRecord("Task_FadeToBg", "src/battle_anim.c", runtime),
  Task_UpdateMonBg: bodyRecord("Task_UpdateMonBg", "src/battle_anim.c", runtime),
  Task_ClearMonBg: bodyRecord("Task_ClearMonBg", "src/battle_anim.c", runtime),
  LoadMoveBg: bodyRecord("LoadMoveBg", "src/battle_anim.c", runtime),
};
const runtimeCommands = Object.fromEntries(["Cmd_loadspritegfx", "Cmd_createvisualtask", "Cmd_delay", "Cmd_fadetobg", "Cmd_restorebg", "Cmd_waitbgfadein", "Cmd_blendoff", "Cmd_clearmonbg", "Cmd_playsewithpan"].map((name) => [name, bodyRecord(name, "src/battle_anim.c", runtime)]));
const controls = {
  MOVE_LUSTER_PURGE: { status: "exact", component: "task:AnimTask_BlendBattleAnimPalExclude", sourceToken: "createvisualtask AnimTask_BlendBattleAnimPalExclude, 5, 5, 2, 0, 16, RGB_WHITEALPHA" },
  MOVE_HI_JUMP_KICK: { status: "exact", component: "task:AnimTask_ShakeMonInPlace", sourceToken: "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 3, 0, 11, 1" },
  MOVE_THRASH: { status: "exact", component: "task:AnimTask_ShakeMonInPlace", sourceTokens: ["createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 4, 0, 7, 1", "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 8, 0, 16, 1"] },
  MOVE_HORN_DRILL: { status: "exact", component: "task:AnimTask_ShakeMonInPlace", sourceTokens: ["createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_ATTACKER, 2, 0, 40, 1", "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 10, 0, 40, 1"] },
  MOVE_SKY_UPPERCUT: { status: "exact", component: "task:AnimTask_ShakeMonInPlace", sourceToken: "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 0, 3, 6, 1" },
  MOVE_GRUDGE: { status: "exact", components: ["visualCommand:fadetobg", "visualCommand:restorebg"], sourceToken: "Move_GRUDGE:" },
  MOVE_AURORA_BEAM: { status: "exact", components: ["visualCommand:fadetobg", "visualCommand:restorebg"], sourceToken: "Move_AURORA_BEAM:" },
};
for (const [moveName, control] of Object.entries(controls)) {
  const entry = graph.moves.find((candidate: Json) => candidate.move === moveName);
  const coverageEntry = coverage.entries.find((candidate: Json) => candidate.move === moveName);
  if (!entry || coverageEntry?.status !== "exact") throw new Error(`Destiny Bond control drifted: ${moveName}`);
  const componentList = "component" in control ? [control.component] : control.components;
  if (!componentList.every((component) => entry.componentIds.includes(component))) throw new Error(`Destiny Bond control component drifted: ${moveName}`);
  const tokens = "sourceToken" in control ? [control.sourceToken] : control.sourceTokens;
  requireTokens(`Destiny Bond control ${moveName}`, scripts, tokens);
}

console.log(JSON.stringify({
  schema: "destiny-bond-source-audit/v1",
  move: "MOVE_DESTINY_BOND",
  moveId: 194,
  status: "unsupported-source-staging-checkpoint",
  coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_DESTINY_BOND",
      nextDispatchLabel: "Move_ENDURE",
      source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody),
      rom: { ...romRange("Move_DESTINY_BOND", rootEnd), start: hex(rootStart), endExclusive: hex(rootEnd) },
      pointerContract: "complete half-open pointer-owned Move_DESTINY_BOND interval",
    },
    commands: expectedCommands,
    directBodies: {
      whiteShadowTemplate: objectRecord("gDestinyBondWhiteShadowSpriteTemplate", "src/battle_anim_ghost.c", ghost),
      callbacks,
      runtimeCommands,
    },
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  behavior: {
    whiteShadow: { task: "AnimTask_DestinyBondWhiteShadow", args: [0, 48], template: "gDestinyBondWhiteShadowSpriteTemplate", animation: "attacker bottom to every visible non-attacker, non-partner battler; singles creates one shadow", blend: { initial: [0, 16], pulses: 24, cleanup: [0, 0] } },
    shake: { task: "AnimTask_ShakeMonInPlace", args: ["ANIM_ATTACKER", 2, 0, 24, 1] },
    palette: { task: "AnimTask_BlendBattleAnimPalExclude", args: [6, 1, 0, 12, "RGB(29, 29, 29)"], reverseArgs: [6, 1, 12, 0, "RGB(29, 29, 29)"] },
    background: { command: "fadetobg BG_GHOST", id: 2, cleanup: ["restorebg", "waitbgfadein", "blendoff", "clearmonbg 5", "end"] },
    audio: [{ sound: "SE_M_PSYBEAM", id: 189, pan: "SOUND_PAN_ATTACKER" }, { sound: "SE_M_CONFUSE_RAY", id: 196, pan: "SOUND_PAN_ATTACKER" }, { sound: "SE_M_NIGHTMARE", id: 121, pan: "SOUND_PAN_TARGET" }],
  },
  resources: {
    whiteShadow: { tag: "ANIM_TAG_WHITE_SHADOW", tagValue: 10238, tileBytes: 1024, gfx: romRange("gBattleAnimSpriteGfx_WhiteShadow"), palette: romRange("gBattleAnimSpritePal_WhiteShadow"), source: "graphics/battle_anims/sprites/white_shadow.png" },
    ghostBackground: { id: "BG_GHOST", idValue: 2, image: romRange("gBattleAnimBgImage_Ghost"), palette: romRange("gBattleAnimBgPalette_Ghost"), tilemap: romRange("gBattleAnimBgTilemap_Ghost"), source: "graphics/battle_anims/backgrounds/ghost.png + ghost.bin" },
    release: "Cmd_end frees tracked loadspritegfx sheets and palettes after the root cleanup commands finish",
  },
  carriers: {
    level50Range: [110, 849],
    count: level50.length,
    all: level50.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })),
    lowest: level50[0],
    excludedOutsideLevel50: outside.map((entry: Json) => entry.index),
    excludedOpenOnly: openOnly.map((entry: Json) => entry.index),
  },
  controls: { kind: "source/component identity checks only; controls confer no Destiny Bond, component, latch, or sibling acceptance", entries: controls },
  checkpoint: {
    sourceAudit: true,
    legalBilateralPartyOnlyStaging: true,
    denseWindowCaptured: false,
    reducerAdded: false,
    productionAssetWiring: false,
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
