/**
 * Authoritative source/ELF/ROM classification for MOVE_BONEMERANG.
 *
 * This intentionally carries no dense capture, reducer, presentation seam,
 * compositor, framebuffer, or latch assertion.  It is a source/staging-only
 * checkpoint for the singleton Level-50 representative.
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
const movement = read("src/battle_anim_mon_movement.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
// Keep this move's committed source-audit payload stable as later exact moves
// join shared visual commands; validate the live ledger separately below.
const historicalCoverageEntries = coverage.entries.filter((entry: Json) => entry.move !== "MOVE_PSYCH_UP" && entry.move !== "MOVE_HYPER_VOICE");
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const symbols = new Map<string, Symbol[]>();
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
function sym(name: string, expectedAddress?: number): Symbol {
  const entries = symbols.get(name) ?? [];
  const entry = expectedAddress === undefined ? (entries.length === 1 ? entries[0] : undefined) : entries.find((value) => value.address === expectedAddress);
  if (!entry) throw new Error(`missing or ambiguous ELF symbol ${name}`);
  return entry;
}
function romRange(name: string, end?: number, expectedAddress?: number): Json {
  const entry = sym(name, expectedAddress);
  const finish = end ?? entry.address + entry.size;
  if (finish <= entry.address) throw new Error(`invalid ROM interval ${name}`);
  return { symbol: name, start: hex(entry.address), endExclusive: hex(finish), byteLength: finish - entry.address, romSha256: sha(rom.subarray(entry.address - 0x08000000, finish - 0x08000000)) };
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
function objectBody(source: string, token: string): string {
  const at = source.indexOf(token);
  const end = source.indexOf("};", at) + 2;
  if (at < 0 || end < 2) throw new Error(`missing object ${token}`);
  return source.slice(source.lastIndexOf("\n", at) + 1, end);
}
function objectRecord(name: string, path: string, source: string): Json {
  const body = objectBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name) };
}
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}
function constant(source: string, name: string): number {
  const match = source.match(new RegExp(`^#define\\s+${name}\\s+(\\d+)`, "mu"));
  if (!match) throw new Error(`missing numeric constant ${name}`);
  return Number.parseInt(match[1]!, 10);
}

const rootBody = sourceBlock(scripts, "Move_BONEMERANG:\n", "Move_BONE_CLUB:\n");
const expectedCommands = [
  "loadspritegfx ANIM_TAG_BONE", "loadspritegfx ANIM_TAG_IMPACT", "monbg ANIM_DEF_PARTNER", "splitbgprio ANIM_TARGET", "setalpha 12, 8",
  "playsewithpan SE_M_BONEMERANG, SOUND_PAN_ATTACKER", "createsprite gBonemerangSpriteTemplate, ANIM_ATTACKER, 2", "delay 20",
  "playsewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET", "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=1",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 5, 0, 5, 1", "delay 17", "playsewithpan SE_M_VITAL_THROW, SOUND_PAN_ATTACKER",
  "createsprite gHorizontalLungeSpriteTemplate, ANIM_ATTACKER, 2, 6, -4", "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end",
] as const;
if (JSON.stringify(commands(rootBody)) !== JSON.stringify(expectedCommands) || /\b(?:call|goto|jump|jumparg|choosetwoturnanim)\b/u.test(rootBody)) throw new Error("MOVE_BONEMERANG root command/branch drifted");
const rootStart = sym("Move_BONEMERANG", 0x082d17cc).address;
const rootEnd = sym("Move_BONE_CLUB", 0x082d1820).address;

const expectedComponents = [
  "asset:ANIM_TAG_BONE", "asset:ANIM_TAG_IMPACT", "sprite:gBonemerangSpriteTemplate", "sprite:gHorizontalLungeSpriteTemplate", "task:AnimTask_ShakeMon",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:splitbgprio",
] as const;
const moveGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_BONEMERANG");
if (!moveGraph || moveGraph.id !== 155 || moveGraph.rootScript !== "Move_BONEMERANG" || JSON.stringify(moveGraph.blocks) !== JSON.stringify(["Move_BONEMERANG"]) || JSON.stringify(moveGraph.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("MOVE_BONEMERANG generated graph drifted");
const componentUsers = Object.fromEntries(expectedComponents.map((component) => [component, graph.moves.filter((entry: Json) => entry.componentIds.includes(component)).map((entry: Json) => entry.move)]));
const exactByComponent = Object.fromEntries(expectedComponents.map((component) => [component, graph.moves.filter((entry: Json) => entry.componentIds.includes(component) && historicalCoverageEntries.some((covered: Json) => covered.move === entry.move && covered.status === "exact")).map((entry: Json) => entry.move)]));
const unrepresented = expectedComponents.filter((component) => exactByComponent[component].length === 0);
if (JSON.stringify(componentUsers["asset:ANIM_TAG_BONE"]) !== JSON.stringify(["MOVE_BONEMERANG", "MOVE_BONE_CLUB", "MOVE_BONE_RUSH"]) || JSON.stringify(componentUsers["sprite:gBonemerangSpriteTemplate"]) !== JSON.stringify(["MOVE_BONEMERANG"]) || JSON.stringify(unrepresented) !== JSON.stringify([])) throw new Error("BONEMERANG component representation boundary drifted");

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const inLevel50 = (entry: Json): boolean => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_BONEMERANG"));
const level50Carriers = allCarriers.filter(inLevel50);
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_BONEMERANG");
if (inventoryEntry?.id !== 155 || inventoryEntry?.effect !== "EFFECT_DOUBLE_HIT" || inventoryEntry?.frontierMonCount !== 1 || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify([387]) || JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([387])) throw new Error("MOVE_BONEMERANG Level-50 carrier census drifted");

const track = coverage.componentTracks.find((entry: Json) => entry.id === "bone-projectile-bonemerang");
const moveEntry = coverage.entries.find((entry: Json) => entry.move === "MOVE_BONEMERANG");
const boneClub = graph.moves.find((entry: Json) => entry.move === "MOVE_BONE_CLUB");
const boneRush = graph.moves.find((entry: Json) => entry.move === "MOVE_BONE_RUSH");
const tierFor = (move: string): string | undefined => Object.entries(inventory.tiers).find(([, tier]: [string, any]) => tier.moves.some((entry: Json) => entry.move === move))?.[0];
if (!track || JSON.stringify(track.components) !== JSON.stringify(expectedComponents) || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_BONEMERANG"]) || track.fulfilled !== true || moveEntry?.status !== "exact" || coverage.entries.filter((entry: Json) => entry.status === "exact").length !== 256 || coverage.entries.find((entry: Json) => entry.move === "MOVE_PSYCH_UP")?.status !== "exact" || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_NIGHTMARE"]) || tierFor("MOVE_BONE_CLUB") !== "outsideFactory" || tierFor("MOVE_BONE_RUSH") !== "outsideFactory" || !boneClub?.componentIds.includes("asset:ANIM_TAG_BONE") || !boneRush?.componentIds.includes("asset:ANIM_TAG_BONE")) throw new Error("BONEMERANG coverage/control boundary drifted");

requireTokens("Bonemerang template and callbacks", ground, [
  "static const union AffineAnimCmd sAffineAnim_Bonemerang[]", "AFFINEANIMCMD_FRAME(0x0, 0x0, 15, 1)", "const struct SpriteTemplate gBonemerangSpriteTemplate",
  ".tileTag = ANIM_TAG_BONE", ".paletteTag = ANIM_TAG_BONE", ".oam = &gOamData_AffineNormal_ObjNormal_32x32", ".affineAnims = sAffineAnims_Bonemerang", ".callback = AnimBonemerangProjectile",
  "static void AnimBonemerangProjectile", "static void AnimBonemerangProjectile_Step", "static void AnimBonemerangProjectile_End", "InitAnimArcTranslation(sprite)", "TranslateAnimHorizontalArc(sprite)", "sprite->data[5] = -40", "sprite->data[5] = 40",
]);
requireTokens("Bonemerang lunge and shake", movement, [
  "const struct SpriteTemplate gHorizontalLungeSpriteTemplate", ".callback = DoHorizontalLunge", "static void DoHorizontalLunge", "void AnimTask_ShakeMon", "static void AnimTask_ShakeMon_Step", "gTasks[taskId].data[1] = gBattleAnimArgs[3]",
]);
requireTokens("Bonemerang runtime/resources", `${macros}\n${runtime}\n${graphics}\n${registry}\n${constants}`, [
  ".macro create_basic_hitsplat_sprite", "static void Cmd_loadspritegfx", "static void Cmd_monbg", "static void Cmd_splitbgprio", "static void Cmd_setalpha", "static void Cmd_createsprite", "static void Cmd_createvisualtask", "static void Cmd_waitforvisualfinish", "static void Cmd_clearmonbg", "static void Cmd_blendoff", "static void Cmd_end",
  "gBattleAnimSpriteGfx_Bone", "gBattleAnimSpritePal_Bone", "{gBattleAnimSpriteGfx_Bone, 0x0200, ANIM_TAG_BONE}", "{gBattleAnimSpritePal_Bone, ANIM_TAG_BONE}", "gBattleAnimSpriteGfx_Impact", "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}", "#define ANIM_TAG_BONE                       (ANIM_SPRITES_START + 0)",
]);
requireTokens("Bonemerang move/audio", `${moves}\n${songs}`, [
  "[MOVE_BONEMERANG] =", ".effect = EFFECT_DOUBLE_HIT", ".power = 50", ".accuracy = 90", ".pp = 10", ".target = MOVE_TARGET_SELECTED", "#define SE_M_VITAL_THROW            122", "#define SE_M_HORN_ATTACK            166", "#define SE_M_BONEMERANG             187",
]);
if (constant(constants, "ANIM_SPRITES_START") !== 10000 || constant(songs, "SE_M_VITAL_THROW") !== 122 || constant(songs, "SE_M_HORN_ATTACK") !== 166 || constant(songs, "SE_M_BONEMERANG") !== 187) throw new Error("BONEMERANG constant drifted");

console.log(JSON.stringify({
  schema: "bonemerang-source-audit/v1", move: "MOVE_BONEMERANG", moveId: 155,
  status: "exact", coverageCredit: true,
  source: {
    pointerOwnedRoot: { symbol: "Move_BONEMERANG", nextDispatchLabel: "Move_BONE_CLUB", source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody), rom: { ...romRange("Move_BONEMERANG", rootEnd, 0x082d17cc), start: hex(rootStart), endExclusive: hex(rootEnd) }, commands: expectedCommands, branches: { directlyReachableBlocks: ["Move_BONEMERANG"], dispatchedBranches: [], complete: true } },
    directBodies: {
      bonemerangAffine: { source: sourceSpan("src/battle_anim_ground.c", ground, objectBody(ground, "static const union AffineAnimCmd sAffineAnim_Bonemerang[]")) },
      bonemerangTemplate: objectRecord("gBonemerangSpriteTemplate", "src/battle_anim_ground.c", ground),
      horizontalLungeTemplate: objectRecord("gHorizontalLungeSpriteTemplate", "src/battle_anim_mon_movement.c", movement),
      callbacks: { AnimBonemerangProjectile: bodyRecord("AnimBonemerangProjectile", "src/battle_anim_ground.c", ground), AnimBonemerangProjectile_Step: bodyRecord("AnimBonemerangProjectile_Step", "src/battle_anim_ground.c", ground), AnimBonemerangProjectile_End: bodyRecord("AnimBonemerangProjectile_End", "src/battle_anim_ground.c", ground), DoHorizontalLunge: bodyRecord("DoHorizontalLunge", "src/battle_anim_mon_movement.c", movement) },
      shake: { AnimTask_ShakeMon: bodyRecord("AnimTask_ShakeMon", "src/battle_anim_mon_movement.c", movement), AnimTask_ShakeMon_Step: bodyRecord("AnimTask_ShakeMon_Step", "src/battle_anim_mon_movement.c", movement) },
    },
  },
  graph: { blocks: moveGraph.blocks, components: expectedComponents, componentUsers, exactRepresentatives: exactByComponent, unrepresented },
  behavior: { move: { effect: "EFFECT_DOUBLE_HIT", power: 50, accuracy: 90, pp: 10, target: "MOVE_TARGET_SELECTED" }, bone: { duration: 20, arcHeights: [-40, 40], template: "gBonemerangSpriteTemplate" }, hit: { delay: 20, hitsplatAnimation: 1, shake: { task: "AnimTask_ShakeMon", args: ["ANIM_TARGET", 5, 0, 5, 1] } }, lunge: { delay: 17, template: "gHorizontalLungeSpriteTemplate", args: [6, -4] }, monbg: { setup: "ANIM_DEF_PARTNER", split: "ANIM_TARGET", alpha: [12, 8], cleanup: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"] } },
  resources: { bone: { tag: "ANIM_TAG_BONE", tagValue: 10000, tileBytes: 0x0200, gfx: romRange("gBattleAnimSpriteGfx_Bone"), palette: romRange("gBattleAnimSpritePal_Bone"), source: "graphics/battle_anims/sprites/bone.png" }, impact: { tag: "ANIM_TAG_IMPACT", tileBytes: 0x0200, gfx: romRange("gBattleAnimSpriteGfx_Impact"), palette: romRange("gBattleAnimSpritePal_Impact") }, audio: { SE_M_VITAL_THROW: 122, SE_M_HORN_ATTACK: 166, SE_M_BONEMERANG: 187 } },
  carriers: { level50Ranges, count: level50Carriers.length, all: level50Carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })), lowest: level50Carriers[0], outsideLevel50: allCarriers.filter((entry: Json) => !inLevel50(entry)).map((entry: Json) => entry.index) },
  controls: { boneClub: { tier: tierFor("MOVE_BONE_CLUB"), graph: boneClub.componentIds, credit: "outside-Factory source control only; no Bonemerang timing, latch, move, or track credit" }, boneRush: { tier: tierFor("MOVE_BONE_RUSH"), graph: boneRush.componentIds, credit: "outside-Factory source control only; no Bonemerang timing, latch, move, or track credit" } },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableBranches: true, completeCarrierCensus: true, reproducibleBoneAsset: true, legalBilateralPartyOnlyStaging: true, oracleOrMgbaInvoked: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: true, latchMeasured: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: true, framebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, latchPromotion: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: false },
}, null, 2));
