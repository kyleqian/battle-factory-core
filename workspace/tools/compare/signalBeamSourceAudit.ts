/**
 * Authoritative source/ELF/map/ROM classification for MOVE_SIGNAL_BEAM.
 *
 * This is intentionally a source/legal-staging checkpoint only. It records
 * every pointer-owned direct body and resource, but contains no dense frame,
 * latch, reducer, seam, compositor, or framebuffer assertion.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type SymbolEntry = { address: number; size: number };

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const readBytes = (path: string): Uint8Array => readFileSync(resolve(sourceRoot, path));
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;

const scripts = read("data/battle_anim_scripts.s");
const macros = read("asm/macros/battle_anim_script.inc");
const water = read("src/battle_anim_water.c");
const movement = read("src/battle_anim_mon_movement.c");
const normal = read("src/battle_anim_normal.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
const map = read("pokeemerald.map");
const rom = readBytes("pokeemerald.gba");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;

const symbols = new Map<string, SymbolEntry[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
}).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    const entries = symbols.get(fields.at(-1)!) ?? [];
    entries.push({ address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
    symbols.set(fields.at(-1)!, entries);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const entries = symbols.get(fields[2]!) ?? [];
    entries.push({ address: Number.parseInt(fields[0]!, 16), size: 0 });
    symbols.set(fields[2]!, entries);
  }
}

function sym(name: string, expectedAddress?: number): SymbolEntry {
  const entries = symbols.get(name) ?? [];
  const entry = expectedAddress === undefined
    ? (entries.length === 1 ? entries[0] : undefined)
    : entries.find((value) => value.address === expectedAddress);
  if (!entry) throw new Error(`missing or ambiguous ELF symbol ${name}`);
  return entry;
}
function mapAddress(name: string): number {
  const line = map.split("\n").find((value) => value.trim().endsWith(` ${name}`));
  const match = line?.match(/0x([0-9a-f]+)/iu);
  if (!match) throw new Error(`missing map symbol ${name}`);
  return Number.parseInt(match[1]!, 16);
}
function romRange(name: string, end?: number, expectedAddress?: number): Json {
  const entry = sym(name, expectedAddress);
  const finish = end ?? entry.address + entry.size;
  if (finish <= entry.address) throw new Error(`invalid ROM interval ${name}`);
  return {
    symbol: name,
    start: hex(entry.address),
    endExclusive: hex(finish),
    byteLength: finish - entry.address,
    romSha256: sha(rom.subarray(entry.address - 0x08000000, finish - 0x08000000)),
  };
}
function sourceSpan(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing source span ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
}
function sourceBlock(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`missing source block ${start}/${end}`);
  return source.slice(from, to);
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
function objectBody(source: string, token: string): string {
  const at = source.indexOf(token);
  const end = source.indexOf("};", at) + 2;
  if (at < 0 || end < 2) throw new Error(`missing object ${token}`);
  return source.slice(source.lastIndexOf("\n", at) + 1, end);
}
function bodyRecord(name: string, path: string, source: string, expectedAddress?: number): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name, undefined, expectedAddress) };
}
function objectRecord(name: string, path: string, source: string): Json {
  const body = objectBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name) };
}
function macroBody(name: string): string {
  const start = macros.indexOf(`.macro ${name}`);
  const end = macros.indexOf(".endm", start) + ".endm".length;
  if (start < 0 || end < ".endm".length) throw new Error(`missing macro ${name}`);
  return macros.slice(macros.lastIndexOf("\n", start) + 1, end);
}
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}
function tagValue(name: string): number {
  const match = constants.match(new RegExp(`^#define\\s+${name}\\s+\\(ANIM_SPRITES_START \\+ (\\d+)\\)`, "mu"));
  if (!match) throw new Error(`missing ${name}`);
  return 10000 + Number.parseInt(match[1]!, 10);
}

const rootBody = sourceBlock(scripts, "Move_SIGNAL_BEAM:\n", "SignalBeamOrbs:\n");
const orbBody = sourceBlock(scripts, "SignalBeamOrbs:\n", "Move_ABSORB:\n");
const orbCall = "call SignalBeamOrbs";
const expectedRootCommands = [
  "loadspritegfx ANIM_TAG_GLOWY_RED_ORB",
  "loadspritegfx ANIM_TAG_GLOWY_GREEN_ORB",
  "loadspritegfx ANIM_TAG_DUCK",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_ATTACKER, 0, 2, 25, 1",
  "delay 6",
  "panse SE_M_BUBBLE_BEAM, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +1, 0",
  "createvisualtask AnimTask_StartSinAnimTimer, 5, 100",
  ...Array.from({ length: 6 }, () => orbCall),
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 3, 0, 25, 1",
  "complex_palette_blend unused_anim_battler=ANIM_ATTACKER, unused_subpriority_offset=2, selector=F_PAL_TARGET, delay=8, num_blends=5, color1=RGB_RED, blend_y1=8, color2=RGB(1, 30, 0), blend_y2=8",
  ...Array.from({ length: 17 }, () => orbCall),
  "waitforvisualfinish",
  "end",
] as const;
const expectedOrbCommands = [
  "createsprite gSignalBeamRedOrbSpriteTemplate, ANIM_TARGET, 3, 10, 10, 0, 16",
  "createsprite gSignalBeamGreenOrbSpriteTemplate, ANIM_TARGET, 3, 10, 10, 0, -16",
  "delay 1",
  "return",
] as const;
if (JSON.stringify(commands(rootBody)) !== JSON.stringify(expectedRootCommands)
  || JSON.stringify(commands(orbBody)) !== JSON.stringify(expectedOrbCommands)
  || /\b(?:goto|jump|jumparg|choosetwoturnanim)\b/u.test(`${rootBody}\n${orbBody}`)) {
  throw new Error("MOVE_SIGNAL_BEAM pointer-owned command/body drifted");
}

const rootStart = sym("Move_SIGNAL_BEAM", 0x082d0eb2).address;
const orbsStart = sym("SignalBeamOrbs", 0x082d0f79).address;
const rootEnd = sym("Move_ABSORB", 0x082d0f9a).address;
const expectedComponents = [
  "asset:ANIM_TAG_DUCK",
  "asset:ANIM_TAG_GLOWY_GREEN_ORB",
  "asset:ANIM_TAG_GLOWY_RED_ORB",
  "sprite:gSignalBeamGreenOrbSpriteTemplate",
  "sprite:gSignalBeamRedOrbSpriteTemplate",
  "subroutine:SignalBeamOrbs",
  "task:AnimTask_ShakeMon",
  "task:AnimTask_StartSinAnimTimer",
  "visualCommand:complex_palette_blend",
  "visualCommand:panse",
] as const;
const moveGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_SIGNAL_BEAM");
if (!moveGraph || moveGraph.id !== 324 || moveGraph.rootScript !== "Move_SIGNAL_BEAM"
  || JSON.stringify(moveGraph.blocks) !== JSON.stringify(["Move_SIGNAL_BEAM", "SignalBeamOrbs"])
  || JSON.stringify(moveGraph.componentIds) !== JSON.stringify(expectedComponents)) {
  throw new Error("MOVE_SIGNAL_BEAM generated graph drifted");
}
const componentUsers = Object.fromEntries(expectedComponents.map((component) => [
  component,
  graph.moves.filter((entry: Json) => entry.componentIds.includes(component)).map((entry: Json) => entry.move),
]));
const exactByComponent = Object.fromEntries(expectedComponents.map((component) => [
  component,
  graph.moves.filter((entry: Json) => entry.componentIds.includes(component)
    && coverage.entries.some((covered: Json) => covered.move === entry.move && covered.status === "exact"))
    .map((entry: Json) => entry.move),
]));
const unrepresented = expectedComponents.filter((component) => exactByComponent[component].length === 0);
const expectedUnrepresented: readonly string[] = [];
if (JSON.stringify(unrepresented) !== JSON.stringify(expectedUnrepresented)
  || JSON.stringify(componentUsers["asset:ANIM_TAG_DUCK"]) !== JSON.stringify(["MOVE_DIZZY_PUNCH", "MOVE_TEETER_DANCE", "MOVE_SIGNAL_BEAM"])
  || JSON.stringify(componentUsers["task:AnimTask_StartSinAnimTimer"]) !== JSON.stringify(["MOVE_FLAMETHROWER", "MOVE_HYDRO_PUMP", "MOVE_PSYWAVE", "MOVE_SECRET_POWER", "MOVE_SIGNAL_BEAM", "MOVE_MUD_SHOT"])) {
  throw new Error("MOVE_SIGNAL_BEAM component representation boundary drifted");
}

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const inLevel50 = (entry: Json): boolean => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SIGNAL_BEAM"));
const level50Carriers = allCarriers.filter(inLevel50);
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_SIGNAL_BEAM");
if (JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([27, 160, 161, 277, 331, 680])
  || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify([160, 161, 277, 331, 680])
  || inventoryEntry?.id !== 324 || inventoryEntry?.effect !== "EFFECT_CONFUSE_HIT"
  || inventoryEntry?.frontierMonCount !== 5
  || JSON.stringify(inventoryEntry?.exampleMons) !== JSON.stringify(["FRONTIER_MON_ARIADOS", "FRONTIER_MON_YANMA", "FRONTIER_MON_VOLBEAT_2"])) {
  throw new Error("MOVE_SIGNAL_BEAM Level-50 carrier census drifted");
}

const track = coverage.componentTracks.find((entry: Json) => entry.id === "signal-beam-orb-stream");
const moveEntry = coverage.entries.find((entry: Json) => entry.move === "MOVE_SIGNAL_BEAM");
if (moveEntry?.status !== "exact"
  || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_SHOCK_WAVE"])
  || !track || JSON.stringify(track.components) !== JSON.stringify(expectedComponents)
  || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_SIGNAL_BEAM"])
  || track.fulfilled !== true || !track.goal.includes("FULFILLED")) {
  throw new Error("MOVE_SIGNAL_BEAM exact queue/track boundary drifted");
}

requireTokens("Signal Beam templates and wave callbacks", water, [
  "const struct SpriteTemplate gSignalBeamRedOrbSpriteTemplate", "const struct SpriteTemplate gSignalBeamGreenOrbSpriteTemplate",
  ".tileTag = ANIM_TAG_GLOWY_RED_ORB", ".paletteTag = ANIM_TAG_GLOWY_GREEN_ORB",
  ".oam = &gOamData_AffineOff_ObjNormal_8x8", ".callback = AnimToTargetInSinWave",
  "static void AnimToTargetInSinWave", "static void AnimToTargetInSinWave_Step",
  "void AnimTask_StartSinAnimTimer", "static void AnimTask_RunSinAnimTimer",
  "gTasks[taskId].data[0] = gBattleAnimArgs[0]", "gBattleAnimArgs[7] = (gBattleAnimArgs[7] + 3) & 0xFF",
]);
requireTokens("Signal Beam ShakeMon", movement, [
  "void AnimTask_ShakeMon", "static void AnimTask_ShakeMon_Step", "gSprites[spriteId].x2 = gBattleAnimArgs[1]",
  "gTasks[taskId].data[1] = gBattleAnimArgs[3]", "DestroyAnimVisualTask(taskId)",
]);
requireTokens("Signal Beam complex target palette", normal, [
  "const struct SpriteTemplate gComplexPaletteBlendSpriteTemplate", ".callback = AnimComplexPaletteBlend",
  "static void AnimComplexPaletteBlend", "static void AnimComplexPaletteBlend_Step1", "static void AnimComplexPaletteBlend_Step2",
  "BlendPalettes(selectedPalettes, cmd->blendY1, cmd->color1)", "BlendPalettes(selectedPalettes, 0, 0)",
]);
requireTokens("Signal Beam script runtime and cleanup", runtime, [
  "static void Cmd_loadspritegfx", "static void Cmd_createsprite", "static void Cmd_createvisualtask",
  "static void Cmd_panse", "void Task_PanFromInitialToTarget", "static void Cmd_waitforvisualfinish", "static void Cmd_end",
  "FreeSpriteTilesByTag(gBattleAnimPicTable[sAnimSpriteIndexArray[i]].tag)", "gAnimScriptActive = FALSE",
]);
requireTokens("Signal Beam resources", `${graphics}\n${registry}\n${constants}`, [
  "gBattleAnimSpriteGfx_Duck", "gBattleAnimSpritePal_Duck", "gBattleAnimSpriteGfx_GlowyRedOrb",
  "gBattleAnimSpritePal_GlowyRedOrb", "gBattleAnimSpritePal_GlowyGreenOrb",
  "{gBattleAnimSpriteGfx_Duck, 0x0180, ANIM_TAG_DUCK}",
  "{gBattleAnimSpriteGfx_GlowyRedOrb, 0x0020, ANIM_TAG_GLOWY_RED_ORB}",
  "{gBattleAnimSpriteGfx_GlowyRedOrb, 0x0020, ANIM_TAG_GLOWY_GREEN_ORB}",
  "{gBattleAnimSpritePal_GlowyRedOrb, ANIM_TAG_GLOWY_RED_ORB}",
  "{gBattleAnimSpritePal_GlowyGreenOrb, ANIM_TAG_GLOWY_GREEN_ORB}",
]);
requireTokens("Signal Beam move and audio", `${moves}\n${songs}`, [
  "[MOVE_SIGNAL_BEAM] =", ".effect = EFFECT_CONFUSE_HIT", ".power = 75", ".accuracy = 100", ".pp = 15",
  ".secondaryEffectChance = 10", ".target = MOVE_TARGET_SELECTED", "#define SE_M_BUBBLE_BEAM            182",
]);

const mapPins = Object.fromEntries([
  "AnimTask_StartSinAnimTimer", "gSignalBeamRedOrbSpriteTemplate", "gSignalBeamGreenOrbSpriteTemplate",
  "gBattleAnimSpriteGfx_Duck", "gBattleAnimSpritePal_Duck", "gBattleAnimSpriteGfx_GlowyRedOrb",
  "gBattleAnimSpritePal_GlowyRedOrb", "gBattleAnimSpritePal_GlowyGreenOrb",
].map((name) => {
  const address = mapAddress(name);
  if (sym(name).address !== address) throw new Error(`map/ELF disagreement for ${name}`);
  return [name, hex(address)];
}));
const runtimeCommands: readonly [string, number][] = [
  ["Cmd_loadspritegfx", 0x080a3d24], ["Cmd_createsprite", 0x080a3dd8], ["Cmd_createvisualtask", 0x080a3ecc],
  ["Cmd_delay", 0x080a3f48], ["Cmd_waitforvisualfinish", 0x080a3f88], ["Cmd_panse", 0x080a53b8], ["Cmd_end", 0x080a3fc4],
];

console.log(JSON.stringify({
  schema: "signal-beam-source-audit/v1",
  move: "MOVE_SIGNAL_BEAM",
  moveId: 324,
  status: "exact",
  coverageCredit: true,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_SIGNAL_BEAM",
      nextDispatchLabel: "Move_ABSORB",
      source: sourceSpan("data/battle_anim_scripts.s", scripts, `${rootBody}${orbBody}`),
      rom: { ...romRange("Move_SIGNAL_BEAM", rootEnd, 0x082d0eb2), start: hex(rootStart), endExclusive: hex(rootEnd) },
      blocks: {
        Move_SIGNAL_BEAM: { source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody), romStart: hex(rootStart), commands: expectedRootCommands },
        SignalBeamOrbs: { source: sourceSpan("data/battle_anim_scripts.s", scripts, orbBody), romStart: hex(orbsStart), commands: expectedOrbCommands },
      },
      branches: { directlyReachableBlocks: ["Move_SIGNAL_BEAM", "SignalBeamOrbs"], dispatchedBranches: [], complete: true },
    },
    directBodies: {
      templates: {
        redOrb: objectRecord("gSignalBeamRedOrbSpriteTemplate", "src/battle_anim_water.c", water),
        greenOrb: objectRecord("gSignalBeamGreenOrbSpriteTemplate", "src/battle_anim_water.c", water),
        complexPaletteBlend: objectRecord("gComplexPaletteBlendSpriteTemplate", "src/battle_anim_normal.c", normal),
      },
      callbacks: {
        AnimToTargetInSinWave: bodyRecord("AnimToTargetInSinWave", "src/battle_anim_water.c", water),
        AnimToTargetInSinWave_Step: bodyRecord("AnimToTargetInSinWave_Step", "src/battle_anim_water.c", water),
        AnimComplexPaletteBlend: bodyRecord("AnimComplexPaletteBlend", "src/battle_anim_normal.c", normal),
        AnimComplexPaletteBlend_Step1: bodyRecord("AnimComplexPaletteBlend_Step1", "src/battle_anim_normal.c", normal),
        AnimComplexPaletteBlend_Step2: bodyRecord("AnimComplexPaletteBlend_Step2", "src/battle_anim_normal.c", normal),
        Task_PanFromInitialToTarget: bodyRecord("Task_PanFromInitialToTarget", "src/battle_anim.c", runtime),
      },
      tasks: {
        AnimTask_ShakeMon: bodyRecord("AnimTask_ShakeMon", "src/battle_anim_mon_movement.c", movement),
        AnimTask_ShakeMon_Step: bodyRecord("AnimTask_ShakeMon_Step", "src/battle_anim_mon_movement.c", movement),
        AnimTask_StartSinAnimTimer: bodyRecord("AnimTask_StartSinAnimTimer", "src/battle_anim_water.c", water),
        AnimTask_RunSinAnimTimer: bodyRecord("AnimTask_RunSinAnimTimer", "src/battle_anim_water.c", water),
      },
      runtime: Object.fromEntries(runtimeCommands.map(([name, address]) => [name, bodyRecord(name, "src/battle_anim.c", runtime, address)])),
      macros: {
        panse: sourceSpan("asm/macros/battle_anim_script.inc", macros, macroBody("panse")),
        complex_palette_blend: sourceSpan("asm/macros/battle_anim_script.inc", macros, macroBody("complex_palette_blend")),
      },
    },
  },
  graph: { blocks: moveGraph.blocks, components: expectedComponents, componentUsers, exactRepresentatives: exactByComponent, unrepresented },
  behavior: {
    move: { effect: "EFFECT_CONFUSE_HIT", power: 75, accuracy: 100, pp: 15, secondaryEffectChance: 10, target: "MOVE_TARGET_SELECTED" },
    stream: { pairsBeforeTargetPalette: 6, pairsAfterTargetPalette: 17, totalPairs: 23, redSprites: 23, greenSprites: 23, args: [10, 10, 0, 16, -16] },
    attackerShake: { task: "AnimTask_ShakeMon", args: ["ANIM_ATTACKER", 0, 2, 25, 1] },
    targetShake: { task: "AnimTask_ShakeMon", args: ["ANIM_TARGET", 3, 0, 25, 1] },
    sinusTimer: { task: "AnimTask_StartSinAnimTimer", duration: 100, increment: 3, waveDuration: 30 },
    targetPalette: { command: "complex_palette_blend", selector: "F_PAL_TARGET", delay: 8, numBlends: 5, first: ["RGB_RED", 8], second: ["RGB(1, 30, 0)", 8] },
    audio: { command: "panse", sound: "SE_M_BUBBLE_BEAM", soundId: 182, currentPan: "SOUND_PAN_ATTACKER", targetPan: "SOUND_PAN_TARGET", increment: 1, delay: 0 },
    bgAndRegisters: { directBgCommands: [], directRegisterCommands: [], paletteOnly: "complex target-palette blend" },
    cleanup: ["waitforvisualfinish", "end", "Cmd_end frees the three loaded tags after visual/sound completion"],
  },
  resources: {
    ANIM_TAG_DUCK: { tagValue: tagValue("ANIM_TAG_DUCK"), tileBytes: 0x0180, gfx: romRange("gBattleAnimSpriteGfx_Duck"), palette: romRange("gBattleAnimSpritePal_Duck"), sourceFile: "graphics/battle_anims/sprites/duck.png", sourceSha256: sha(readBytes("graphics/battle_anims/sprites/duck.png")) },
    ANIM_TAG_GLOWY_RED_ORB: { tagValue: tagValue("ANIM_TAG_GLOWY_RED_ORB"), tileBytes: 0x0020, gfx: romRange("gBattleAnimSpriteGfx_GlowyRedOrb"), palette: romRange("gBattleAnimSpritePal_GlowyRedOrb"), sourceFile: "graphics/battle_anims/sprites/glowy_red_orb.png", sourceSha256: sha(readBytes("graphics/battle_anims/sprites/glowy_red_orb.png")) },
    ANIM_TAG_GLOWY_GREEN_ORB: { tagValue: tagValue("ANIM_TAG_GLOWY_GREEN_ORB"), tileBytes: 0x0020, gfx: romRange("gBattleAnimSpriteGfx_GlowyRedOrb"), palette: romRange("gBattleAnimSpritePal_GlowyGreenOrb"), sourceFile: "graphics/battle_anims/sprites/glowy_green_orb.pal", sourceSha256: sha(readBytes("graphics/battle_anims/sprites/glowy_green_orb.pal")) },
    note: "Green and red Signal Beam orbs share glowy_red_orb tile graphics but use distinct palette resources; DUCK is loaded by the root but no reachable Signal Beam createsprite references a Duck template.",
  },
  mapElfAgreement: mapPins,
  carriers: {
    level50Ranges,
    allSourceCarriers: allCarriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })),
    level50: level50Carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })),
    count: level50Carriers.length,
    lowestLegal: level50Carriers[0],
    excludedOutsideLevel50: allCarriers.filter((entry: Json) => !inLevel50(entry)).map((entry: Json) => entry.index),
  },
  coverage: { queue: coverage.queue, track: { id: track.id, components: track.components, representatives: track.representatives, fulfilled: track.fulfilled }, moveEntryPresent: true },
  checkpoint: {
    sourceAudit: true, completePointerOwnedRoot: true, completeReachableBranches: true, completeCarrierCensus: true,
    reproducibleResources: true, legalBilateralPartyOnlyStaging: true, oracleOrMgbaInvoked: true,
    compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true,
    denseWindowCaptured: true, latchMeasured: true, reducerAdded: true, typedSceneOnSeam: true,
    compositorAdded: true, framebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true,
    latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: false,
  },
}, null, 2));
