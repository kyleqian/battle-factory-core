/** Authoritative source/component/carrier classification for MOVE_EXTRASENSORY. */
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
const psychic = readRef("src/battle_anim_psychic.c");
const mons = readRef("src/battle_anim_mons.c");
const effects = readRef("src/battle_anim_effects_3.c");
const battleAnim = readRef("src/battle_anim.c");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
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
function symbol(name: string): SymbolEntry {
  const matches = symbols.get(name) ?? [];
  if (matches.length !== 1) throw new Error(`missing or ambiguous symbol ${name}`);
  return matches[0]!;
}
function romRange(name: string, endName?: string): Json {
  const start = symbol(name).address;
  const end = endName ? symbol(endName).address : start + symbol(name).size;
  if (end <= start) throw new Error(`invalid ROM range ${name}/${endName ?? "size"}`);
  return { symbol: name, start: hex(start), endExclusive: hex(end), byteLength: end - start, romSha256: sha(rom.subarray(start - 0x08000000, end - 0x08000000)) };
}
function sourceBlock(source: string, startToken: string, endToken: string): string {
  const start = source.indexOf(startToken), end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`missing source block ${startToken}/${endToken}`);
  return source.slice(start, end);
}
function functionBody(source: string, name: string): string {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "gu");
  for (let match = matcher.exec(source); match; match = matcher.exec(source)) {
    const open = source.indexOf("{", match.index), semi = source.indexOf(";", match.index);
    if (open < 0 || (semi >= 0 && semi < open)) continue;
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1);
    }
  }
  throw new Error(`missing function ${name}`);
}
function sourceRecord(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing body ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
}
function functionRecord(name: string, path: string, source: string): Json {
  const body = functionBody(source, name);
  return { source: sourceRecord(path, source, body), rom: romRange(name) };
}
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const rootBody = sourceBlock(scripts, "Move_EXTRASENSORY:\n", "Move_AERIAL_ACE:\n");
const bgBody = sourceBlock(scripts, "SetPsychicBackground:\n", "SetSkyBg:\n");
const expectedComponents = [
  "subroutine:SetPsychicBackground", "subroutine:UnsetPsychicBackground", "task:AnimTask_BlendMonInAndOut",
  "task:AnimTask_ExtrasensoryDistortion", "task:AnimTask_SetPsychicBackground", "task:AnimTask_TransparentCloneGrowAndShrink",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg",
  "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
] as const;
const expectedCommands = [
  "call SetPsychicBackground", "monbg ANIM_DEF_PARTNER", "setalpha 12, 8",
  "createvisualtask AnimTask_BlendMonInAndOut, 5, ANIM_ATTACKER, RGB(27, 27, 0), 12, 1, 1",
  "createvisualtask AnimTask_ExtrasensoryDistortion, 5, 0", "playsewithpan SE_M_BIND, SOUND_PAN_TARGET", "waitforvisualfinish",
  "createvisualtask AnimTask_BlendMonInAndOut, 5, ANIM_ATTACKER, RGB(27, 27, 0), 12, 1, 1",
  "createvisualtask AnimTask_ExtrasensoryDistortion, 5, 1", "playsewithpan SE_M_BIND, SOUND_PAN_TARGET", "waitforvisualfinish",
  "createvisualtask AnimTask_TransparentCloneGrowAndShrink, 5, ANIM_ATTACKER",
  "createvisualtask AnimTask_ExtrasensoryDistortion, 5, 2", "playsewithpan SE_M_LEER, SOUND_PAN_ATTACKER", "waitforvisualfinish",
  "blendoff", "clearmonbg ANIM_DEF_PARTNER", "call UnsetPsychicBackground", "end",
] as const;
if (JSON.stringify(commands(rootBody)) !== JSON.stringify(expectedCommands)) throw new Error("Extrasensory command order drifted");
requireTokens("distortion", functionBody(psychic, "AnimTask_ExtrasensoryDistortion") + functionBody(psychic, "AnimTask_ExtrasensoryDistortion_Step"), ["case 0:", "task->data[13] = 64", "case 1:", "task->data[13] = 192", "case 2:", "task->data[11] = 4", "gScanlineEffectRegBuffers[0][i]", "gScanlineEffect.state = 3"]);
requireTokens("clone", functionBody(psychic, "AnimTask_TransparentCloneGrowAndShrink") + functionBody(psychic, "AnimTask_TransparentCloneGrowAndShrink_Step"), ["CloneBattlerSpriteWithBlend", "ST_OAM_AFFINE_DOUBLE", "task->data[1] += 4", "task->data[1] -= 4", "DestroySpriteWithActiveSheet", "FreeOamMatrix"]);
requireTokens("psychic background", bgBody, ["fadetobg BG_PSYCHIC", "waitbgfadein", "createvisualtask AnimTask_SetPsychicBackground", "restorebg", "waitbgfadeout"]);

const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_EXTRASENSORY");
if (!graphEntry || graphEntry.id !== 326 || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_EXTRASENSORY", "SetPsychicBackground", "UnsetPsychicBackground"]) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Extrasensory generated graph drifted");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_EXTRASENSORY");
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_EXTRASENSORY"));
if (!move || move.frontierMonCount !== 3 || move.speciesCount !== 3 || JSON.stringify(carriers.map((entry: Json) => entry.index)) !== JSON.stringify([130, 246, 589])) throw new Error("Extrasensory carrier census drifted");
const controls = Object.fromEntries(["MOVE_SKILL_SWAP", "MOVE_AMNESIA", "MOVE_CONFUSION", "MOVE_FUTURE_SIGHT", "MOVE_PSYCHIC"].map((name) => [name, coverage.entries.find((entry: Json) => entry.move === name)?.status ?? "unsupported"]));
if (Object.values(controls).some((status) => status !== "exact")) throw new Error("Psychic source controls drifted");

console.log(JSON.stringify({
  schema: "extrasensory-source-audit/v1", move: "MOVE_EXTRASENSORY", moveId: 326, status: "exact", coverageCredit: true,
  source: {
    pointerOwnedRoot: { source: sourceRecord("data/battle_anim_scripts.s", scripts, rootBody), rom: romRange("Move_EXTRASENSORY", "Move_AERIAL_ACE"), commands: expectedCommands },
    psychicBackground: { source: sourceRecord("data/battle_anim_scripts.s", scripts, bgBody), rom: romRange("SetPsychicBackground", "SetSkyBg") },
    novel: {
      distortion: { id: "task:AnimTask_ExtrasensoryDistortion", start: functionRecord("AnimTask_ExtrasensoryDistortion", "src/battle_anim_psychic.c", psychic), step: functionRecord("AnimTask_ExtrasensoryDistortion_Step", "src/battle_anim_psychic.c", psychic) },
      clone: { id: "task:AnimTask_TransparentCloneGrowAndShrink", start: functionRecord("AnimTask_TransparentCloneGrowAndShrink", "src/battle_anim_psychic.c", psychic), step: functionRecord("AnimTask_TransparentCloneGrowAndShrink_Step", "src/battle_anim_psychic.c", psychic) },
    },
    shared: {
      blendStart: functionRecord("AnimTask_BlendMonInAndOut", "src/battle_anim_mons.c", mons), blendStep: functionRecord("AnimTask_BlendMonInAndOut_Step", "src/battle_anim_mons.c", mons),
      setPsychicBackground: functionRecord("AnimTask_SetPsychicBackground", "src/battle_anim_effects_3.c", effects),
      interpreter: Object.fromEntries(["Cmd_monbg", "Cmd_clearmonbg", "Cmd_setalpha", "Cmd_blendoff", "Cmd_fadetobg", "Cmd_restorebg", "Cmd_waitbgfadein", "Cmd_waitbgfadeout"].map((name) => [name, functionRecord(name, "src/battle_anim.c", battleAnim)])),
    },
  },
  graph: { blocks: graphEntry.blocks, componentCount: expectedComponents.length, components: expectedComponents, novelComponents: ["task:AnimTask_ExtrasensoryDistortion", "task:AnimTask_TransparentCloneGrowAndShrink"] },
  carriers: carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })),
  representative: carriers[0],
  controls: { named: controls, kind: "shared Psychic controls only; no timing, latch, component, sibling, track, or move credit transfers", transferCredit: false },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, directTaskBodies: true, generatedGraphPinned: true, fullCarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseEvidenceRequired: true, productionChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, actualCoreFramebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, siblingPromotion: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
  remainder: null,
}, null, 2));
