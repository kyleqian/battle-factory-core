/** Authoritative source/component/carrier receipt for MOVE_SMOG. */
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
const ice = read("src/battle_anim_ice.c");
const normal = read("src/battle_anim_normal.c");
const movement = read("src/battle_anim_mon_movement.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
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
function bodyRecord(name: string, path: string, source: string): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name) };
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
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim())
    .filter((line) => line.length > 0 && !line.endsWith(":"));
}
function constant(source: string, name: string): number {
  const match = source.match(new RegExp(`^#define\\s+${name}\\s+(\\d+)`, "mu"));
  if (!match) throw new Error(`missing numeric constant ${name}`);
  return Number.parseInt(match[1]!, 10);
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const moveBlock = sourceBlock(scripts, "Move_SMOG:\n", "SmogCloud:\n");
const cloudBlock = sourceBlock(scripts, "SmogCloud:\n", "Move_FAINT_ATTACK:\n");
const completeBody = sourceBlock(scripts, "Move_SMOG:\n", "Move_FAINT_ATTACK:\n");
const expectedRoot = [
  "loadspritegfx ANIM_TAG_PURPLE_GAS_CLOUD", "monbg ANIM_DEF_PARTNER", "splitbgprio_all", "setalpha 12, 8",
  "loopsewithpan SE_M_MIST, SOUND_PAN_TARGET, 17, 10", "call SmogCloud", "call SmogCloud", "call SmogCloud", "call SmogCloud", "call SmogCloud", "call SmogCloud", "call SmogCloud",
  "delay 120", "loopsewithpan SE_M_TOXIC, SOUND_PAN_TARGET, 18, 2", "blend_color_cycle priority=2, selector=F_PAL_TARGET, delay=2, num_blends=2, initial_blend_y=0, target_blend_y=12, color=RGB(26, 0, 26)", "delay 10",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 15, 1", "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end",
] as const;
const expectedCloud = ["createsprite gSmogCloudSpriteTemplate, ANIM_ATTACKER, 2, 0, -24, 48, 240, 1, 0", "delay 7", "return"] as const;
if (JSON.stringify(commands(moveBlock)) !== JSON.stringify(expectedRoot) || JSON.stringify(commands(cloudBlock)) !== JSON.stringify(expectedCloud)) throw new Error("MOVE_SMOG command order drifted");
if ((moveBlock.match(/\bcall SmogCloud\b/g) ?? []).length !== 7 || /\b(?:goto|jump|jumparg|choosetwoturnanim)\b/u.test(completeBody)) throw new Error("MOVE_SMOG root branch graph drifted");

const expectedComponents = [
  "asset:ANIM_TAG_PURPLE_GAS_CLOUD", "sprite:gSmogCloudSpriteTemplate", "subroutine:SmogCloud", "task:AnimTask_ShakeMon2", "visualCommand:blend_color_cycle", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:splitbgprio_all",
] as const;
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_SMOG");
if (!graphEntry || graphEntry.id !== 123 || graphEntry.rootScript !== "Move_SMOG" || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_SMOG", "SmogCloud"]) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("MOVE_SMOG generated graph drifted");

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const inRanges = (entry: Json): boolean => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SMOG"));
const level50Carriers = allCarriers.filter(inRanges);
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_SMOG");
if (inventoryEntry?.id !== 123 || inventoryEntry?.frontierMonCount !== 1 || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify([149]) || JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([149])) throw new Error("MOVE_SMOG Factory carrier census drifted");

const track = coverage.componentTracks.find((entry: Json) => entry.id === "smog-purple-gas-cloud");
const smogEntry = coverage.entries.find((entry: Json) => entry.move === "MOVE_SMOG");
const poisonGasGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_POISON_GAS");
const poisonGasTier = Object.entries(inventory.tiers).find(([, tier]: [string, any]) => tier.moves.some((entry: Json) => entry.move === "MOVE_POISON_GAS"))?.[0];
const acid = coverage.entries.find((entry: Json) => entry.move === "MOVE_ACID");
const grudge = coverage.entries.find((entry: Json) => entry.move === "MOVE_GRUDGE");
if (!track || JSON.stringify(track.components) !== JSON.stringify(expectedComponents) || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_SMOG"]) || track.fulfilled !== true || smogEntry?.status !== "exact" || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_SHOCK_WAVE"]) || !poisonGasGraph?.componentIds.includes("asset:ANIM_TAG_PURPLE_GAS_CLOUD") || poisonGasGraph.componentIds.includes("sprite:gSmogCloudSpriteTemplate") || poisonGasTier !== "outsideFactory" || acid?.status !== "exact" || grudge?.status !== "exact") throw new Error("MOVE_SMOG coverage/control boundary drifted");

requireTokens("Smog cloud/template", ice, [
  "static const union AnimCmd sAnim_Cloud[]", "ANIMCMD_FRAME(0, 8)", "ANIMCMD_FRAME(8, 8)", "ANIMCMD_JUMP(0)", "const struct SpriteTemplate gSmogCloudSpriteTemplate", ".tileTag = ANIM_TAG_PURPLE_GAS_CLOUD", ".paletteTag = ANIM_TAG_PURPLE_GAS_CLOUD", ".oam = &gOamData_AffineOff_ObjBlend_32x16", ".callback = InitSwirlingFogAnim", "static void InitSwirlingFogAnim", "static void AnimSwirlingFogAnim", "InitAnimLinearTranslation(sprite)", "sprite->data[5] = 64", "sprite->data[5] = (sprite->data[5] + 3) & 0xFF", "DestroyAnimSprite(sprite)",
]);
requireTokens("Smog blend/shake", `${normal}\n${movement}`, ["void AnimTask_BlendColorCycle", "BeginNormalPaletteFade(", "static void AnimTask_BlendColorCycleLoop", "void AnimTask_ShakeMon2", "static void AnimTask_ShakeMon2_Step", "gTasks[taskId].data[1] = gBattleAnimArgs[3]", "gTasks[taskId].data[2] = gBattleAnimArgs[4]"]);
requireTokens("Smog resources/runtime", `${graphics}\n${registry}\n${runtime}`, ["gBattleAnimSpriteGfx_MistCloud", "gBattleAnimSpritePal_PurpleGasCloud", "{gBattleAnimSpriteGfx_MistCloud, 0x0200, ANIM_TAG_PURPLE_GAS_CLOUD}", "{gBattleAnimSpritePal_PurpleGasCloud, ANIM_TAG_PURPLE_GAS_CLOUD}", "static void Cmd_loadspritegfx", "static void Cmd_monbg", "static void Cmd_splitbgprio_all", "static void Cmd_clearmonbg", "static void Cmd_blendoff", "static void Cmd_end"]);
if (constant(constants, "ANIM_SPRITES_START") + 172 !== 10172 || constant(songs, "SE_M_MIST") !== 168 || constant(songs, "SE_M_TOXIC") !== 148) throw new Error("Smog resource constants drifted");

const rootStart = sym("Move_SMOG", 0x082d01e5).address;
const cloudStart = sym("SmogCloud", 0x082d024a).address;
const end = sym("Move_FAINT_ATTACK", 0x082d0260).address;
console.log(JSON.stringify({
  schema: "smog-source-audit/v1", move: "MOVE_SMOG", moveId: 123, status: "exact", coverageCredit: true,
  source: {
    pointerOwnedRoot: { symbol: "Move_SMOG", nextDispatchLabel: "Move_FAINT_ATTACK", source: sourceSpan("data/battle_anim_scripts.s", scripts, completeBody), rom: { ...romRange("Move_SMOG", end, 0x082d01e5), start: hex(rootStart), endExclusive: hex(end) }, branches: { directlyReachableBlocks: ["Move_SMOG", "SmogCloud"], dispatchedBranches: [], complete: true } },
    blocks: {
      Move_SMOG: { source: sourceSpan("data/battle_anim_scripts.s", scripts, moveBlock), rom: { ...romRange("Move_SMOG", cloudStart, 0x082d01e5), start: hex(rootStart), endExclusive: hex(cloudStart) }, commands: expectedRoot },
      SmogCloud: { source: sourceSpan("data/battle_anim_scripts.s", scripts, cloudBlock), rom: { ...romRange("SmogCloud", end, 0x082d024a), start: hex(cloudStart), endExclusive: hex(end) }, commands: expectedCloud },
    },
    directBodies: {
      cloudFrames: { source: sourceSpan("src/battle_anim_ice.c", ice, objectBlock(ice, "static const union AnimCmd sAnim_Cloud[]")), frames: [[0, 8], [8, 8]], loop: 0 },
      smogCloudTemplate: objectRecord("gSmogCloudSpriteTemplate", "src/battle_anim_ice.c", ice),
      fogCallbacks: { InitSwirlingFogAnim: bodyRecord("InitSwirlingFogAnim", "src/battle_anim_ice.c", ice), AnimSwirlingFogAnim: bodyRecord("AnimSwirlingFogAnim", "src/battle_anim_ice.c", ice) },
      blendCycle: { AnimTask_BlendColorCycle: bodyRecord("AnimTask_BlendColorCycle", "src/battle_anim_normal.c", normal), AnimTask_BlendColorCycleLoop: bodyRecord("AnimTask_BlendColorCycleLoop", "src/battle_anim_normal.c", normal) },
      shake: { AnimTask_ShakeMon2: bodyRecord("AnimTask_ShakeMon2", "src/battle_anim_mon_movement.c", movement), AnimTask_ShakeMon2_Step: bodyRecord("AnimTask_ShakeMon2_Step", "src/battle_anim_mon_movement.c", movement) },
    },
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents, track: { id: track.id, components: track.components, representatives: track.representatives, fulfilled: track.fulfilled } },
  behavior: { move: { effect: "EFFECT_POISON_HIT", power: 20, accuracy: 70, pp: 20, secondaryEffectChance: 40, target: "MOVE_TARGET_SELECTED" }, clouds: { calls: 7, args: [0, -24, 48, 240, 1, 0], frameData: [[0, 8], [8, 8]], callback: "InitSwirlingFogAnim -> AnimSwirlingFogAnim" }, blendCycle: { priority: 2, selector: "F_PAL_TARGET", delay: 2, numBlends: 2, initialBlendY: 0, targetBlendY: 12, color: "RGB(26, 0, 26)" }, shake: { task: "AnimTask_ShakeMon2", args: ["ANIM_TARGET", 2, 0, 15, 1] }, monbg: { setup: "ANIM_DEF_PARTNER", split: "splitbgprio_all", alpha: [12, 8], cleanup: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"] } },
  resources: { purpleGasCloud: { tag: "ANIM_TAG_PURPLE_GAS_CLOUD", tagValue: 10172, tileBytes: 0x0200, gfx: romRange("gBattleAnimSpriteGfx_MistCloud"), palette: romRange("gBattleAnimSpritePal_PurpleGasCloud"), source: "graphics/battle_anims/sprites/mist_cloud.png + purple_gas_cloud.pal" }, audio: { SE_M_MIST: { id: 168, schedule: [17, 10], pan: "SOUND_PAN_TARGET" }, SE_M_TOXIC: { id: 148, schedule: [18, 2], pan: "SOUND_PAN_TARGET" } }, release: "Cmd_end releases tracked sprite graphics/palette after Smog cleanup." },
  carriers: { level50Ranges, count: level50Carriers.length, all: level50Carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })), lowest: level50Carriers[0], outsideLevel50: allCarriers.filter((entry: Json) => !inRanges(entry)).map((entry: Json) => entry.index) },
  controls: { poisonGas: { tier: poisonGasTier, shares: ["asset:ANIM_TAG_PURPLE_GAS_CLOUD"], distinctTemplate: "gPoisonGasCloudSpriteTemplate", distinctCallback: "InitPoisonGasCloudAnim -> MovePoisonGasCloud", factoryCredit: false }, acid: { status: acid.status, credit: "independent exact control only; no Smog timing/latch/body/track credit" }, grudge: { status: grudge.status, credit: "independent exact control only; no Smog timing/latch/body/track credit" } },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableBranches: true, completeCarrierCensus: true, legalBilateralPartyOnlyStaging: true, oracleOrMgbaInvoked: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: true, framebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, latchPromotion: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: false },
}, null, 2));
