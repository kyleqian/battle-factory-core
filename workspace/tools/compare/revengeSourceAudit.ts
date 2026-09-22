/** Authoritative source/ELF/ROM/component/carrier checkpoint for MOVE_REVENGE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type SymbolEntry = { address: number; size: number };
const root = resolve(import.meta.dirname, "../..");
const ref = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(ref, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = read("data/battle_anim_scripts.s");
const fight = read("src/battle_anim_fight.c");
const movement = read("src/battle_anim_mon_movement.c");
const normal = read("src/battle_anim_normal.c");
const macros = read("asm/macros/battle_anim_script.inc");
const registry = read("src/data/battle_anim.h");
const graphics = read("src/graphics.c");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const rom = readFileSync(resolve(ref, "pokeemerald.gba"));
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;

const symbols = new Map<string, SymbolEntry>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(ref, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) symbols.set(fields.at(-1)!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
}
const symbol = (name: string): SymbolEntry => { const value = symbols.get(name); if (!value) throw new Error(`missing ELF symbol ${name}`); return value; };
const romRange = (name: string, endName?: string): Json => { const start = symbol(name).address; const end = endName ? symbol(endName).address : start + symbol(name).size; return { symbol: name, start: hex(start), endExclusive: hex(end), byteLength: end - start, romSha256: sha(rom.subarray(start - 0x08000000, end - 0x08000000)) }; };
const sourceBlock = (source: string, startToken: string, endToken: string): string => { const start = source.indexOf(startToken); const end = source.indexOf(endToken, start + startToken.length); if (start < 0 || end < 0) throw new Error(`missing ${startToken}/${endToken}`); return source.slice(start, end); };
const sourceRecord = (path: string, source: string, body: string): Json => { const start = source.indexOf(body); return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) }; };
function functionBody(source: string, name: string): string {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "gu");
  for (let match = matcher.exec(source); match; match = matcher.exec(source)) {
    const open = source.indexOf("{", match.index), semi = source.indexOf(";", match.index); if (open < 0 || (semi >= 0 && semi < open)) continue;
    let depth = 0; for (let index = open; index < source.length; index += 1) { if (source[index] === "{") depth += 1; else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1); }
  }
  throw new Error(`missing function ${name}`);
}
const bodyRecord = (name: string, path: string, source: string): Json => { const body = functionBody(source, name); return { source: sourceRecord(path, source, body), rom: romRange(name) }; };
const requireTokens = (label: string, source: string, tokens: readonly string[]): void => { for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`); };

const rootBody = sourceBlock(scripts, "Move_REVENGE:\n", "Move_POISON_FANG:\n");
const commands = rootBody.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line && !line.endsWith(":"));
const expectedComponents = ["asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_PURPLE_SCRATCH", "asset:ANIM_TAG_PURPLE_SWIPE", "sprite:gHorizontalLungeSpriteTemplate", "sprite:gRevengeBigScratchSpriteTemplate", "sprite:gRevengeSmallScratchSpriteTemplate", "task:AnimTask_ShakeMon2", "visualCommand:blend_color_cycle", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_persist_hitsplat_sprite", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:unloadspritegfx"];
const novelComponents = ["asset:ANIM_TAG_PURPLE_SCRATCH", "asset:ANIM_TAG_PURPLE_SWIPE", "sprite:gRevengeBigScratchSpriteTemplate", "sprite:gRevengeSmallScratchSpriteTemplate", "visualCommand:create_persist_hitsplat_sprite"];
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_REVENGE");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_REVENGE");
if (!graphEntry || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Revenge graph drifted");
if (!move || move.id !== 279 || move.frontierMonCount !== 3 || JSON.stringify(move.exampleMons) !== JSON.stringify(["FRONTIER_MON_PINSIR_1", "FRONTIER_MON_QWILFISH_2", "FRONTIER_MON_MACHAMP_8"])) throw new Error("Revenge inventory drifted");
const ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const legal = (entry: Json): boolean => ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_REVENGE"));
const level50 = allCarriers.filter(legal);
if (JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([82,264,316,811]) || JSON.stringify(level50.map((entry: Json) => entry.index)) !== JSON.stringify([264,316,811])) throw new Error("Revenge carrier census drifted");

requireTokens("root", rootBody, ["loadspritegfx ANIM_TAG_PURPLE_SCRATCH", "blend_color_cycle priority=2, selector=F_PAL_ATTACKER", "unloadspritegfx ANIM_TAG_PURPLE_SCRATCH", "loadspritegfx ANIM_TAG_PURPLE_SWIPE", "createsprite gHorizontalLungeSpriteTemplate, ANIM_ATTACKER, 2, 6, 4", "createsprite gRevengeBigScratchSpriteTemplate, ANIM_TARGET, 2, 10, -10", "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 3, 0, 10, 1", "create_persist_hitsplat_sprite ANIM_TARGET, 3, x=-10, y=-8", "create_persist_hitsplat_sprite ANIM_TARGET, 3, x=10, y=8", "clearmonbg ANIM_TARGET", "blendoff", "end"]);
const small = sourceBlock(fight, "static const union AnimCmd sAnim_RevengeSmallScratch_0[]", "static const union AnimCmd sAnim_RevengeBigScratch_0[]");
const big = sourceBlock(fight, "static const union AnimCmd sAnim_RevengeBigScratch_0[]", "static const union AffineAnimCmd sAffineAnim_FocusPunchFist[]");
requireTokens("small scratch", small, ["ANIMCMD_FRAME(0, 4)", "ANIMCMD_FRAME(16, 4)", "ANIMCMD_FRAME(32, 4)", "gRevengeSmallScratchSpriteTemplate", "AnimRevengeScratch"]);
requireTokens("big scratch", big, ["ANIMCMD_FRAME(0, 6)", "ANIMCMD_FRAME(64, 6)", "gRevengeBigScratchSpriteTemplate", "AnimRevengeScratch"]);
requireTokens("scratch callback", functionBody(fight, "AnimRevengeScratch"), ["InitSpritePosToAnimAttacker", "InitSpritePosToAnimTarget", "GetBattlerSide(gBattleAnimAttacker)", "StartSpriteAnim(sprite, 1)", "RunStoredCallbackWhenAnimEnds", "DestroyAnimSprite"]);
requireTokens("resources", registry + graphics + constants, ["gBattleAnimSpriteGfx_PurpleScratch, 0x0600, ANIM_TAG_PURPLE_SCRATCH", "gBattleAnimSpriteGfx_PurpleSwipe, 0x1000, ANIM_TAG_PURPLE_SWIPE", "gBattleAnimSpritePal_PurpleScratch, ANIM_TAG_PURPLE_SCRATCH", "gBattleAnimSpritePal_PurpleScratch, ANIM_TAG_PURPLE_SWIPE", "ANIM_TAG_PURPLE_SCRATCH", "ANIM_TAG_PURPLE_SWIPE"]);
requireTokens("persistent hitsplat", macros + normal, ["create_persist_hitsplat_sprite", "gPersistHitSplatSpriteTemplate", "AnimHitSplatPersistent", "CMD_ARGS(x, y, relativeTo, animation, duration)", "DestroyAnimSpriteAfterTimer"]);
requireTokens("shared mechanics", movement + normal, ["gHorizontalLungeSpriteTemplate", "DoHorizontalLunge", "AnimTask_ShakeMon2", "AnimTask_BlendColorCycle", "AnimTask_BlendColorCycleLoop"]);
requireTokens("audio", songs, ["SE_M_TAKE_DOWN", "SE_M_SWAGGER", "SE_M_VITAL_THROW2", "SE_M_MEGA_KICK2"]);

const output = JSON.stringify({
  schema: "revenge-source-audit/v1", move: "MOVE_REVENGE", moveId: 279, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: { pointerOwnedRoot: { symbol: "Move_REVENGE", nextDispatchLabel: "Move_POISON_FANG", blocks: graphEntry.blocks, commands, source: sourceRecord("data/battle_anim_scripts.s", scripts, rootBody), rom: romRange("Move_REVENGE", "Move_POISON_FANG") }, templates: { small: { source: sourceRecord("src/battle_anim_fight.c", fight, small), rom: romRange("gRevengeSmallScratchSpriteTemplate") }, big: { source: sourceRecord("src/battle_anim_fight.c", fight, big), rom: romRange("gRevengeBigScratchSpriteTemplate") }, callback: bodyRecord("AnimRevengeScratch", "src/battle_anim_fight.c", fight), persist: { template: romRange("gPersistHitSplatSpriteTemplate"), callback: bodyRecord("AnimHitSplatPersistent", "src/battle_anim_normal.c", normal) } } },
  graph: { blocks: graphEntry.blocks, componentCount: expectedComponents.length, components: expectedComponents, novelComponents },
  behavior: { smallScratch: { frames: [[0,4],[16,4],[32,4]], attackerSideAnim: { player: 0, opponent: 1 } }, bigScratch: { frames: [[0,6],[64,6]], attackerSideAnim: { player: 0, opponent: 1 } }, attackerBlend: { selector: "F_PAL_ATTACKER", delay: 0, blends: 4, from: 2, to: 8, color: "RGB_RED" }, lunge: [6,4], targetShake: [3,0,10,1], persistentHits: [[-10,-8,1,8],[10,8,1,8]], alpha: [12,8] },
  resources: { tags: { purpleScratch: 10245, purpleSwipe: 10246, impact: 10135 }, allocations: { purpleScratch: "0x0600", purpleSwipe: "0x1000" }, sharedPalette: "gBattleAnimSpritePal_PurpleScratch" },
  carriers: { factoryCount: level50.length, allSourceIndices: allCarriers.map((entry: Json) => entry.index), level50: level50.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves })), excludedOutsideLevel50: allCarriers.filter((entry: Json) => !legal(entry)).map((entry: Json) => entry.index) },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directSpriteTaskResourceBodies: true, fullFactoryCarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: false, rawRgbRetained: false, normalizedMaps: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
}, null, 2) + "\n";
if (process.argv.includes("--write")) writeFileSync(resolve(root, "tools/compare/evidence/revenge-source-audit.json"), output);
console.log(output.trimEnd());
