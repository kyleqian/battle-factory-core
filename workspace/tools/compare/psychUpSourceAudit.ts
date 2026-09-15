/** Authoritative source/component/carrier classification for MOVE_PSYCH_UP. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type SymbolEntry = { address: number; size: number };

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = read("data/battle_anim_scripts.s");
const macros = read("asm/macros/battle_anim_script.inc");
const psychic = read("src/battle_anim_psychic.c");
const mons = read("src/battle_anim_mons.c");
const movement = read("src/battle_anim_mon_movement.c");
const normal = read("src/battle_anim_normal.c");
const utility = read("src/battle_anim_utility_funcs.c");
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
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const symbols = new Map<string, SymbolEntry[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    const values = symbols.get(fields.at(-1)!) ?? [];
    values.push({ address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
    symbols.set(fields.at(-1)!, values);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const values = symbols.get(fields[2]!) ?? [];
    values.push({ address: Number.parseInt(fields[0]!, 16), size: 0 });
    symbols.set(fields[2]!, values);
  }
}
function sym(name: string, expectedAddress?: number): SymbolEntry {
  const values = symbols.get(name) ?? [];
  const value = expectedAddress === undefined ? (values.length === 1 ? values[0] : undefined) : values.find((entry) => entry.address === expectedAddress);
  if (!value) throw new Error(`missing or ambiguous ELF symbol ${name}`);
  return value;
}
function romRange(name: string, end?: number, expectedAddress?: number): Json {
  const value = sym(name, expectedAddress);
  const finish = end ?? value.address + value.size;
  if (finish <= value.address) throw new Error(`invalid ROM interval ${name}`);
  return {
    symbol: name,
    elf: { image: "reference/pokeemerald/pokeemerald.elf", symbol: name, start: hex(value.address), endExclusive: hex(finish), byteLength: finish - value.address },
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
function bodyRecord(name: string, path: string, source: string, expectedAddress?: number): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name, undefined, expectedAddress) };
}
function objectBlock(source: string, token: string): string {
  const from = source.indexOf(token);
  const to = source.indexOf("};", from) + 2;
  if (from < 0 || to < 2) throw new Error(`missing object ${token}`);
  return source.slice(source.lastIndexOf("\n", from) + 1, to);
}
function objectRecord(name: string, path: string, source: string): Json {
  const body = objectBlock(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name) };
}
function lineRecord(path: string, source: string, token: string): Json {
  const index = source.indexOf(token);
  if (index < 0) throw new Error(`missing line ${token}`);
  const start = source.lastIndexOf("\n", index) + 1;
  const end = source.indexOf("\n", index);
  const body = source.slice(start, end < 0 ? source.length : end);
  return { source: sourceSpan(path, source, body) };
}
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const rootBody = sourceBlock(scripts, "Move_PSYCH_UP:\n", "Move_DIZZY_PUNCH:\n");
const expectedCommands = [
  "loadspritegfx ANIM_TAG_SPIRAL",
  "monbg ANIM_ATK_PARTNER",
  "blend_color_cycleexclude unk0=1, delay=2, num_blends=6, initial_blend_y=1, target_blend_y=11, color=RGB_BLACK",
  "setalpha 12, 8",
  "loopsewithpan SE_M_PSYBEAM2, SOUND_PAN_ATTACKER, 5, 10",
  "createsprite gPsychUpSpiralSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 0, 0",
  "createvisualtask AnimTask_SwayMon, 5, 0, 5, 2560, 8, ANIM_ATTACKER",
  "delay 127",
  "delay 4",
  "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_ScaleMonAndRestore, 5, -5, -5, 10, ANIM_ATTACKER, 1",
  "createvisualtask AnimTask_BlendBattleAnimPal, 9, F_PAL_ATTACKER, 2, 10, 0, RGB_YELLOW",
  "delay 30",
  "clearmonbg ANIM_ATK_PARTNER",
  "blendoff",
  "waitforvisualfinish",
  "end",
] as const;
const expectedComponents = [
  "asset:ANIM_TAG_SPIRAL",
  "sprite:gPsychUpSpiralSpriteTemplate",
  "task:AnimTask_BlendBattleAnimPal",
  "task:AnimTask_ScaleMonAndRestore",
  "task:AnimTask_SwayMon",
  "visualCommand:blend_color_cycleexclude",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:setalpha",
] as const;
if (JSON.stringify(commands(rootBody)) !== JSON.stringify(expectedCommands)) throw new Error("MOVE_PSYCH_UP command order drifted");
if (/\b(?:call|goto|jump|jumparg|choosetwoturnanim)\b/u.test(rootBody)) throw new Error("MOVE_PSYCH_UP pointer root grew a branch");
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_PSYCH_UP");
if (!graphEntry || graphEntry.id !== 244 || graphEntry.rootScript !== "Move_PSYCH_UP" || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_PSYCH_UP"]) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("MOVE_PSYCH_UP generated component graph drifted");

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const inLevel50 = (entry: Json): boolean => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_PSYCH_UP"));
const level50Carriers = allCarriers.filter(inLevel50);
const expectedAllCarrierIndices = [50, 229, 428, 478, 512, 514, 562, 570, 593, 639, 652, 782, 837, 841, 844];
const expectedLevel50CarrierIndices = [229, 428, 478, 512, 514, 562, 570, 593, 639, 652, 782, 837, 841, 844];
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_PSYCH_UP");
if (JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedAllCarrierIndices) || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedLevel50CarrierIndices) || inventoryEntry?.id !== 244 || inventoryEntry?.frontierMonCount !== 14 || inventoryEntry?.speciesCount !== 14) throw new Error("MOVE_PSYCH_UP Factory/Level-50 carrier census drifted");
for (const carrier of allCarriers) requireTokens(`Psych Up carrier ${carrier.label}`, frontierConstants, [carrier.label]);
if ((frontierSource.match(/MOVE_PSYCH_UP/g) ?? []).length !== expectedAllCarrierIndices.length) throw new Error("MOVE_PSYCH_UP source carrier count drifted");

const track = coverage.componentTracks.find((entry: Json) => entry.id === "psych-up-spiral-palette-cycle");
const coverageEntry = coverage.entries.find((entry: Json) => entry.move === "MOVE_PSYCH_UP");
if (coverageEntry?.status !== "exact" || coverage.entries.filter((entry: Json) => entry.status === "exact").length !== 255 || coverage.queue.length !== 0 || !track || JSON.stringify(track.components) !== JSON.stringify(expectedComponents) || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_PSYCH_UP"]) || track.fulfilled !== true) throw new Error("Psych Up exact/fulfilled coverage boundary drifted");

const namedControls = {
  MOVE_LEER: { component: "task:AnimTask_ScaleMonAndRestore", token: "Move_LEER:" },
  MOVE_FRUSTRATION: { components: ["task:AnimTask_BlendBattleAnimPal", "task:AnimTask_SwayMon"], token: "Move_FRUSTRATION:" },
  MOVE_SLEEP_TALK: { component: "task:AnimTask_SwayMon", token: "Move_SLEEP_TALK:" },
  MOVE_HYPER_VOICE: { component: "task:AnimTask_ScaleMonAndRestore", token: "Move_HYPER_VOICE:" },
  MOVE_SNORE: { component: "task:AnimTask_ScaleMonAndRestore", token: "Move_SNORE:" },
  MOVE_PSYCHIC: { component: "task:AnimTask_ScaleMonAndRestore", token: "Move_PSYCHIC:" },
  MOVE_FUTURE_SIGHT: { component: "task:AnimTask_ScaleMonAndRestore", token: "Move_FUTURE_SIGHT:" },
};
for (const [move, control] of Object.entries(namedControls)) {
  const candidate = graph.moves.find((entry: Json) => entry.move === move);
  if (!candidate || !("component" in control ? [control.component] : control.components).every((component) => candidate.componentIds.includes(component))) throw new Error(`Psych Up source identity control drifted: ${move}`);
  requireTokens(`Psych Up source identity control ${move}`, scripts, [control.token]);
}
// Keep the staging-time control classification immutable when a later move is
// independently promoted; the live promotion boundary is guarded above.
const statusOf = (move: string): string => move === "MOVE_HYPER_VOICE" ? "unsupported" : coverage.entries.find((entry: Json) => entry.move === move)?.status ?? "unsupported";
const paletteSiblings = graph.moves.filter((entry: Json) => entry.move !== "MOVE_PSYCH_UP" && entry.componentIds.includes("task:AnimTask_BlendBattleAnimPal")).map((entry: Json) => ({ move: entry.move, status: statusOf(entry.move) }));

requireTokens("Psych Up root/runtime", runtime, ["static void Cmd_loadspritegfx", "static void Cmd_createsprite", "static void Cmd_createvisualtask", "static void Cmd_delay", "static void Cmd_monbg", "static void Cmd_clearmonbg", "static void Cmd_setalpha", "static void Cmd_blendoff", "static void Cmd_waitforvisualfinish", "static void Cmd_end", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag"]);
requireTokens("Psych Up blend macro", macros, [".macro blend_color_cycleexclude", "createvisualtask AnimTask_BlendColorCycleExclude"]);
requireTokens("Psych Up spiral", psychic, ["static const union AffineAnimCmd sAffineAnim_PsychUpSpiral[]", "AFFINEANIMCMD_FRAME(0xFFFE, 0xFFFE, -10, 120)", "const struct SpriteTemplate gPsychUpSpiralSpriteTemplate", ".oam = &gOamData_AffineNormal_ObjBlend_64x64", ".callback = AnimSpriteOnMonPos"]);
requireTokens("Psych Up sprite callback", mons, ["void AnimSpriteOnMonPos", "InitSpritePosToAnimAttacker(sprite, respectMonPicOffsets)", "InitSpritePosToAnimTarget(sprite, respectMonPicOffsets)", "DestroySpriteAndMatrix(sprite)"]);
requireTokens("Psych Up sway/scale", `${movement}\n${mons}`, ["void AnimTask_SwayMon", "static void AnimTask_SwayMonStep", "void AnimTask_ScaleMonAndRestore", "static void AnimTask_ScaleMonAndRestore_Step", "PrepareBattlerSpriteForRotScale", "ResetSpriteRotScale"]);
requireTokens("Psych Up palette tasks", `${normal}\n${utility}`, ["void AnimTask_BlendColorCycleExclude", "static void BlendColorCycleExclude", "static void AnimTask_BlendColorCycleExcludeLoop", "void AnimTask_BlendBattleAnimPal", "static void StartBlendAnimSpriteColor", "static void AnimTask_BlendSpriteColor_Step2"]);
requireTokens("Psych Up resources", `${graphics}\n${registry}`, ["gBattleAnimSpriteGfx_Spiral", "gBattleAnimSpritePal_Spiral", "{gBattleAnimSpriteGfx_Spiral, 0x0800, ANIM_TAG_SPIRAL}", "{gBattleAnimSpritePal_Spiral, ANIM_TAG_SPIRAL}"]);
requireTokens("Psych Up constants/move", `${constants}\n${songs}\n${moves}`, ["#define ANIM_SPRITES_START 10000", "#define ANIM_TAG_SPIRAL", "#define SE_M_PSYBEAM                189", "#define SE_M_PSYBEAM2               200", "[MOVE_PSYCH_UP] =", ".effect = EFFECT_PSYCH_UP", ".pp = 10", ".flags = FLAG_SNATCH_AFFECTED"]);

const rootStart = sym("Move_PSYCH_UP", 0x082caaea).address;
const rootEnd = sym("Move_DIZZY_PUNCH", 0x082cab5c).address;
console.log(JSON.stringify({
  schema: "psych-up-source-audit/v1", move: "MOVE_PSYCH_UP", moveId: 244,
  status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: { symbol: "Move_PSYCH_UP", nextDispatchLabel: "Move_DIZZY_PUNCH", source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody), rom: { ...romRange("Move_PSYCH_UP", rootEnd, 0x082caaea), start: hex(rootStart), endExclusive: hex(rootEnd) }, branches: { directlyReachableBlocks: ["Move_PSYCH_UP"], dispatchedBranches: [], complete: true } },
    commands: expectedCommands,
    directBodies: {
      spiral: { template: objectRecord("gPsychUpSpiralSpriteTemplate", "src/battle_anim_psychic.c", psychic), affineProgram: objectRecord("sAffineAnim_PsychUpSpiral", "src/battle_anim_psychic.c", psychic), affineTable: objectRecord("sAffineAnims_PsychUpSpiral", "src/battle_anim_psychic.c", psychic), callback: bodyRecord("AnimSpriteOnMonPos", "src/battle_anim_mons.c", mons) },
      tasks: {
        blendColorCycleExclude: { start: bodyRecord("AnimTask_BlendColorCycleExclude", "src/battle_anim_normal.c", normal), body: bodyRecord("BlendColorCycleExclude", "src/battle_anim_normal.c", normal), loop: bodyRecord("AnimTask_BlendColorCycleExcludeLoop", "src/battle_anim_normal.c", normal) },
        sway: { start: bodyRecord("AnimTask_SwayMon", "src/battle_anim_mon_movement.c", movement), step: bodyRecord("AnimTask_SwayMonStep", "src/battle_anim_mon_movement.c", movement) },
        scale: { start: bodyRecord("AnimTask_ScaleMonAndRestore", "src/battle_anim_mon_movement.c", movement), step: bodyRecord("AnimTask_ScaleMonAndRestore_Step", "src/battle_anim_mon_movement.c", movement) },
        blendBattleAnimPal: { start: bodyRecord("AnimTask_BlendBattleAnimPal", "src/battle_anim_utility_funcs.c", utility), initialize: bodyRecord("StartBlendAnimSpriteColor", "src/battle_anim_utility_funcs.c", utility), step: bodyRecord("AnimTask_BlendSpriteColor_Step2", "src/battle_anim_utility_funcs.c", utility) },
      },
      runtimeCommands: Object.fromEntries(["Cmd_loadspritegfx", "Cmd_monbg", "Cmd_createvisualtask", "Cmd_createsprite", "Cmd_delay", "Cmd_setalpha", "Cmd_clearmonbg", "Cmd_blendoff", "Cmd_waitforvisualfinish", "Cmd_end"].map((name) => [name, bodyRecord(name, "src/battle_anim.c", runtime, name === "Cmd_end" ? 0x080a3fc4 : undefined)])),
      resources: { gfxSource: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimSpriteGfx_Spiral[]"), paletteSource: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimSpritePal_Spiral[]"), gfx: romRange("gBattleAnimSpriteGfx_Spiral"), palette: romRange("gBattleAnimSpritePal_Spiral"), registryGfx: lineRecord("src/data/battle_anim.h", registry, "{gBattleAnimSpriteGfx_Spiral, 0x0800, ANIM_TAG_SPIRAL}"), registryPalette: lineRecord("src/data/battle_anim.h", registry, "{gBattleAnimSpritePal_Spiral, ANIM_TAG_SPIRAL}") },
    },
  },
  // This artifact records the staging-time classification. Current exact
  // promotion is guarded above but does not rewrite the historical receipt.
  graph: { blocks: graphEntry.blocks, components: expectedComponents, track: { id: track.id, components: track.components, representatives: track.representatives, fulfilled: false } },
  behavior: { monbg: "ANIM_ATK_PARTNER", blendColorCycleExclude: { args: [1, 2, 6, 1, 11, "RGB_BLACK"], macro: "createvisualtask AnimTask_BlendColorCycleExclude, priority=2" }, alpha: [12, 8], spiral: { args: ["ANIM_ATTACKER", 0, 0, 0, 0], affine: [[256, 256, 0, 0], [-2, -2, -10, 120]] }, sway: { args: [0, 5, 2560, 8, "ANIM_ATTACKER"] }, scale: { args: [-5, -5, 10, "ANIM_ATTACKER", 1] }, palette: { args: ["F_PAL_ATTACKER", 2, 10, 0, "RGB_YELLOW"] }, audio: [{ sound: "SE_M_PSYBEAM2", id: 200, pan: "SOUND_PAN_ATTACKER", schedule: [5, 10] }, { sound: "SE_M_PSYBEAM", id: 189, pan: "SOUND_PAN_ATTACKER" }], cleanup: ["clearmonbg ANIM_ATK_PARTNER", "blendoff", "waitforvisualfinish", "end"] },
  resources: { spiral: { tag: "ANIM_TAG_SPIRAL", tagValue: 10196, tileBytes: 0x0800, source: "graphics/battle_anims/sprites/spiral.png" } },
  carriers: { factoryCount: allCarriers.length, level50Count: level50Carriers.length, allFactory: allCarriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })), level50: level50Carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })), excludedOutsideLevel50: allCarriers.filter((entry: Json) => !inLevel50(entry)).map((entry: Json) => entry.index), representative: level50Carriers[0] },
  controls: { kind: "source/component identity checks only; none grants Psych Up timing, body, latch, component, sibling, track, or coverage credit", named: Object.fromEntries(Object.entries(namedControls).map(([move, control]) => [move, { ...control, status: statusOf(move) }])), paletteSiblings },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, commandOrder: true, directTaskCallbackResourceBodies: true, fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, oracleFreshnessCheckedBeforeLocalMgba: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, latchMeasured: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true },
}, null, 2));
