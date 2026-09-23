/** Authoritative source/component/carrier classification for MOVE_WILL_O_WISP. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type SymbolEntry = { address: number; size: number };
const root = resolve(import.meta.dirname, "../..");
const ref = resolve(root, "reference/pokeemerald");
const readRef = (path: string): string => readFileSync(resolve(ref, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = readRef("data/battle_anim_scripts.s");
const fire = readRef("src/battle_anim_fire.c");
const movement = readRef("src/battle_anim_mon_movement.c");
const sound = readRef("src/battle_anim_sound_tasks.c");
const battleAnim = readRef("src/battle_anim.c");
const graphics = readRef("src/graphics.c");
const registry = readRef("src/data/battle_anim.h");
const constants = readRef("include/constants/battle_anim.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const rom = readFileSync(resolve(ref, "pokeemerald.gba"));

const symbols = new Map<string, SymbolEntry[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(ref, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    const entry = { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) };
    symbols.set(fields.at(-1)!, [...(symbols.get(fields.at(-1)!) ?? []), entry]);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const entry = { address: Number.parseInt(fields[0]!, 16), size: 0 };
    symbols.set(fields[2]!, [...(symbols.get(fields[2]!) ?? []), entry]);
  }
}
function symbol(name: string): SymbolEntry { const matches = symbols.get(name) ?? []; if (matches.length !== 1) throw new Error(`missing or ambiguous symbol ${name}`); return matches[0]!; }
function romRange(name: string, endName?: string): Json { const start = symbol(name).address, end = endName ? symbol(endName).address : start + symbol(name).size; return { symbol: name, start: hex(start), endExclusive: hex(end), byteLength: end - start, romSha256: sha(rom.subarray(start - 0x08000000, end - 0x08000000)) }; }
function sourceBlock(source: string, startToken: string, endToken: string): string { const start = source.indexOf(startToken), end = source.indexOf(endToken, start + startToken.length); if (start < 0 || end < 0) throw new Error(`missing source block ${startToken}/${endToken}`); return source.slice(start, end); }
function functionBody(source: string, name: string): string {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "gu");
  for (let match = matcher.exec(source); match; match = matcher.exec(source)) {
    const open = source.indexOf("{", match.index), semi = source.indexOf(";", match.index); if (open < 0 || (semi >= 0 && semi < open)) continue;
    let depth = 0; for (let index = open; index < source.length; index += 1) { if (source[index] === "{") depth += 1; else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1); }
  }
  throw new Error(`missing function ${name}`);
}
function record(path: string, source: string, body: string): Json { const start = source.indexOf(body); return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) }; }
function fn(name: string, path: string, source: string): Json { const body = functionBody(source, name); return { source: record(path, source, body), rom: romRange(name) }; }
function requireTokens(label: string, source: string, tokens: readonly string[]): void { for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`); }

const rootBody = sourceBlock(scripts, "Move_WILL_O_WISP:\n", "Move_ENCORE:\n");
const expectedComponents = ["asset:ANIM_TAG_WISP_FIRE", "asset:ANIM_TAG_WISP_ORB", "sprite:gWillOWispFireSpriteTemplate", "sprite:gWillOWispOrbSpriteTemplate", "task:AnimTask_ShakeMon2", "task:SoundTask_AdjustPanningVar", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:splitbgprio_all", "visualCommand:splitbgprio_foes"];
const expectedCommands = [
  "loadspritegfx ANIM_TAG_WISP_FIRE", "loadspritegfx ANIM_TAG_WISP_ORB", "monbg ANIM_DEF_PARTNER", "splitbgprio_foes ANIM_TARGET",
  "playsewithpan SE_M_EMBER, SOUND_PAN_ATTACKER", "waitplaysewithpan SE_M_EMBER, SOUND_PAN_ATTACKER, 10", "createvisualtask SoundTask_AdjustPanningVar, 2, SOUND_PAN_ATTACKER, SOUND_PAN_ATTACKER, 1, 0",
  "createsprite gWillOWispOrbSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 0", "delay 3", "createsprite gWillOWispOrbSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 1", "delay 3",
  "createsprite gWillOWispOrbSpriteTemplate, ANIM_ATTACKER, 4, 0, 0, 2", "delay 3", "createsprite gWillOWispOrbSpriteTemplate, ANIM_ATTACKER, 4, 0, 0, 3", "delay 40",
  "createvisualtask SoundTask_AdjustPanningVar, 2, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, 2, 0", "waitforvisualfinish", "splitbgprio_all", "playsewithpan SE_M_FLAME_WHEEL2, SOUND_PAN_TARGET",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 13, 1",
  ...[0, 42, 84, 126, 168, 210].map((angle) => `createsprite gWillOWispFireSpriteTemplate, ANIM_ATTACKER, 2, ${angle}`),
  "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "end",
];
const commands = rootBody.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line && !line.endsWith(":"));
if (JSON.stringify(commands) !== JSON.stringify(expectedCommands)) throw new Error("Will-O-Wisp command order drifted");
const orbTemplate = sourceBlock(fire, "const struct SpriteTemplate gWillOWispOrbSpriteTemplate", "static const union AnimCmd sAnim_WillOWispFire");
const fireTemplate = sourceBlock(fire, "const struct SpriteTemplate gWillOWispFireSpriteTemplate", "// Directions for shaking");
requireTokens("orb template", orbTemplate, ["ANIM_TAG_WISP_ORB", "gOamData_AffineOff_ObjNormal_16x16", "sAnims_WillOWispOrb", "AnimWillOWispOrb"]);
requireTokens("fire template", fireTemplate, ["ANIM_TAG_WISP_FIRE", "gOamData_AffineOff_ObjNormal_32x32", "sAnims_WillOWispFire", "AnimWillOWispFire"]);
requireTokens("orb callback", functionBody(fire, "AnimWillOWispOrb") + functionBody(fire, "AnimWillOWispOrb_Step"), ["StartSpriteAnim", "InitAnimLinearTranslationWithSpeed", "Sin(sprite->data[5], 16)", "PlaySE12WithPanning", "DestroyAnimSprite"]);
requireTokens("fire callback", functionBody(fire, "AnimWillOWispFire"), ["sprite->data[3] += 0xC0 * 2", "sprite->data[4] += 0xA0", "sprite->oam.priority", "sprite->invisible ^= 1", "sprite->data[2] == 0x1E"]);
requireTokens("resources", registry + graphics + constants, ["gBattleAnimSpriteGfx_WispOrb", "gBattleAnimSpriteGfx_WispFire", "gBattleAnimSpritePal_WispOrb", "ANIM_TAG_WISP_ORB", "ANIM_TAG_WISP_FIRE"]);
requireTokens("shake", functionBody(movement, "AnimTask_ShakeMon2") + functionBody(movement, "AnimTask_ShakeMon2_Step"), ["gSprites[spriteId].x2 = gBattleAnimArgs[1]", "gTasks[taskId].data[1] = gBattleAnimArgs[3]", "DestroyAnimVisualTask"]);
requireTokens("panning", functionBody(sound, "SoundTask_AdjustPanningVar") + functionBody(sound, "SoundTask_AdjustPanningVar_Step"), ["gAnimCustomPanning", "CalculatePanIncrement", "KeepPanInRange"]);
for (const name of ["Cmd_monbg", "Cmd_clearmonbg", "Cmd_splitbgprio_all", "Cmd_splitbgprio_foes"]) functionBody(battleAnim, name);

const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_WILL_O_WISP");
if (!graphEntry || graphEntry.id !== 261 || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Will-O-Wisp graph drifted");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_WILL_O_WISP");
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_WILL_O_WISP"));
if (!move || move.frontierMonCount !== 10 || carriers.length !== 13 || !carriers.some((entry: Json) => entry.index === 62 && entry.species === "SPECIES_SHUPPET")) throw new Error("Will-O-Wisp carrier census drifted");

console.log(JSON.stringify({
  schema: "will-o-wisp-source-audit/v1", move: "MOVE_WILL_O_WISP", moveId: 261, status: "unsupported-source-staged", coverageCredit: false,
  source: { pointerOwnedRoot: { source: record("data/battle_anim_scripts.s", scripts, rootBody), rom: romRange("Move_WILL_O_WISP", "Move_ENCORE"), commands: expectedCommands }, templates: { orb: { source: record("src/battle_anim_fire.c", fire, orbTemplate), rom: romRange("gWillOWispOrbSpriteTemplate") }, fire: { source: record("src/battle_anim_fire.c", fire, fireTemplate), rom: romRange("gWillOWispFireSpriteTemplate") } }, callbacks: { orb: fn("AnimWillOWispOrb", "src/battle_anim_fire.c", fire), orbStep: fn("AnimWillOWispOrb_Step", "src/battle_anim_fire.c", fire), fire: fn("AnimWillOWispFire", "src/battle_anim_fire.c", fire) }, shake: { start: fn("AnimTask_ShakeMon2", "src/battle_anim_mon_movement.c", movement), step: fn("AnimTask_ShakeMon2_Step", "src/battle_anim_mon_movement.c", movement) }, panning: { start: fn("SoundTask_AdjustPanningVar", "src/battle_anim_sound_tasks.c", sound), step: fn("SoundTask_AdjustPanningVar_Step", "src/battle_anim_sound_tasks.c", sound) } },
  graph: { blocks: graphEntry.blocks, componentCount: expectedComponents.length, components: expectedComponents }, carrierCensus: { level50: move.frontierMonCount, allFactoryTiers: carriers.length }, carriers: carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature })), representative: carriers.find((entry: Json) => entry.index === 62),
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, directSpriteAndTaskBodies: true, generatedGraphPinned: true, fullCarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseEvidenceRequired: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
  remainder: "Capture complete bilateral dense state/RGB twice fresh, normalize every touched bank, and retain unsupported evidence until a reducer/seam/compositor and actual-core proof exist.",
}, null, 2));
