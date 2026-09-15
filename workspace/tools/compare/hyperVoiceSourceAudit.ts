/** Authoritative source/component/carrier classification for MOVE_HYPER_VOICE. */
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
const effects = read("src/battle_anim_effects_2.c");
const movement = read("src/battle_anim_mon_movement.c");
const sound = read("src/battle_anim_sound_tasks.c");
const normal = read("src/battle_anim_normal.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
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
    start: hex(value.address), endExclusive: hex(finish), byteLength: finish - value.address,
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
function objectRecord(name: string, path: string, source: string, expectedAddress?: number): Json {
  const body = objectBlock(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name, undefined, expectedAddress) };
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

const rootBody = sourceBlock(scripts, "Move_HYPER_VOICE:\n", "Move_SAND_TOMB:\n");
const effectBody = rootBody.slice(rootBody.indexOf("HyperVoiceEffect:\n"));
if (!effectBody.startsWith("HyperVoiceEffect:\n")) throw new Error("missing HyperVoiceEffect source body");
const expectedCommands = [
  "loadspritegfx ANIM_TAG_THIN_RING",
  "createvisualtask SoundTask_PlayCryWithEcho, 5, FALSE",
  "call HyperVoiceEffect",
  "waitforvisualfinish",
  "delay 8",
  "createvisualtask SoundTask_PlayCryWithEcho, 5, TRUE",
  "call HyperVoiceEffect",
  "waitforvisualfinish",
  "end",
  "simple_palette_blend selector=F_PAL_BG | F_PAL_BATTLERS, delay=3, initial_blend_y=8, target_blend_y=0, color=RGB_YELLOW",
  "createvisualtask AnimTask_ScaleMonAndRestore, 5, -5, -5, 5, ANIM_ATTACKER, 0",
  "createsprite gHyperVoiceRingSpriteTemplate, ANIM_ATTACKER, 0, 45, 0, 0, 0, 0, 0, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 1, 0, 6, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_DEF_PARTNER, 1, 0, 6, 1",
  "shake_battle_platforms x_offset=1, y_offset=0, shakes=6, delay=1",
  "createvisualtask SoundTask_WaitForCry, 5",
  "return",
] as const;
const expectedComponents = [
  "asset:ANIM_TAG_THIN_RING",
  "sprite:gHyperVoiceRingSpriteTemplate",
  "subroutine:HyperVoiceEffect",
  "task:AnimTask_ScaleMonAndRestore",
  "task:AnimTask_ShakeMon2",
  "task:SoundTask_PlayCryWithEcho",
  "task:SoundTask_WaitForCry",
  "visualCommand:shake_battle_platforms",
  "visualCommand:simple_palette_blend",
] as const;
if (JSON.stringify(commands(rootBody)) !== JSON.stringify(expectedCommands)) throw new Error("MOVE_HYPER_VOICE command order drifted");
const labels = [...rootBody.matchAll(/^([A-Za-z0-9_]+):$/gmu)].map((match) => match[1]);
if (JSON.stringify(labels) !== JSON.stringify(["Move_HYPER_VOICE", "HyperVoiceEffect"])) throw new Error("MOVE_HYPER_VOICE pointer-owned labels drifted");
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_HYPER_VOICE");
if (!graphEntry || graphEntry.id !== 304 || graphEntry.rootScript !== "Move_HYPER_VOICE" || JSON.stringify(graphEntry.blocks) !== JSON.stringify(labels) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("MOVE_HYPER_VOICE generated component graph drifted");

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const inLevel50 = (entry: Json): boolean => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_HYPER_VOICE"));
const level50Carriers = allCarriers.filter(inLevel50);
const expectedCarrierIndices = [397];
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_HYPER_VOICE");
if (JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedCarrierIndices) || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedCarrierIndices) || inventoryEntry?.id !== 304 || inventoryEntry?.frontierMonCount !== 1 || inventoryEntry?.speciesCount !== 1) throw new Error("MOVE_HYPER_VOICE Factory/Level-50 carrier census drifted");
for (const carrier of allCarriers) requireTokens(`Hyper Voice carrier ${carrier.label}`, frontierConstants, [carrier.label]);
if ((frontierSource.match(/MOVE_HYPER_VOICE/g) ?? []).length !== 1) throw new Error("MOVE_HYPER_VOICE source carrier count drifted");

const track = coverage.componentTracks.find((entry: Json) => entry.id === "hyper-voice-ring-cry-platform");
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_HYPER_VOICE") || !track || JSON.stringify(track.components) !== JSON.stringify(expectedComponents) || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_HYPER_VOICE"]) || track.fulfilled !== false) throw new Error("Hyper Voice unsupported coverage boundary drifted");
const namedControls = {
  MOVE_UPROAR: { components: ["asset:ANIM_TAG_THIN_RING", "sprite:gUproarRingSpriteTemplate"], token: "Move_UPROAR:" },
  MOVE_ROAR: { components: ["task:AnimTask_ScaleMonAndRestore", "task:SoundTask_WaitForCry"], token: "Move_ROAR:" },
  MOVE_ROCK_TOMB: { components: ["visualCommand:shake_battle_platforms"], token: "Move_ROCK_TOMB:" },
  MOVE_SNORE: { components: ["task:AnimTask_ScaleMonAndRestore", "task:AnimTask_ShakeMon2"], token: "Move_SNORE:" },
};
for (const [move, control] of Object.entries(namedControls)) {
  const candidate = graph.moves.find((entry: Json) => entry.move === move);
  if (!candidate || !control.components.every((component) => candidate.componentIds.includes(component))) throw new Error(`Hyper Voice source identity control drifted: ${move}`);
  requireTokens(`Hyper Voice source identity control ${move}`, scripts, [control.token]);
}
const statusOf = (move: string): string => coverage.entries.find((entry: Json) => entry.move === move)?.status ?? "unsupported";

requireTokens("Hyper Voice root/runtime", runtime, ["static void Cmd_loadspritegfx", "static void Cmd_createsprite", "static void Cmd_createvisualtask", "static void Cmd_delay", "static void Cmd_waitforvisualfinish", "static void Cmd_call", "static void Cmd_return", "static void Cmd_end", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag"]);
requireTokens("Hyper Voice macros", macros, [".macro simple_palette_blend", "gSimplePaletteBlendSpriteTemplate", ".macro shake_battle_platforms", "createvisualtask AnimTask_ShakeBattlePlatforms"]);
requireTokens("Hyper Voice ring", effects, ["const union AffineAnimCmd gHyperVoiceRingAffineAnimCmds[]", "AFFINEANIMCMD_FRAME(0xB, 0xB, 0, 45)", "const struct SpriteTemplate gHyperVoiceRingSpriteTemplate", ".callback = AnimHyperVoiceRing", "static void AnimHyperVoiceRing_WaitEnd", "InitAnimLinearTranslation(sprite)"]);
requireTokens("Hyper Voice task bodies", `${movement}\n${normal}\n${sound}`, ["void AnimTask_ScaleMonAndRestore", "static void AnimTask_ScaleMonAndRestore_Step", "void AnimTask_ShakeMon2", "static void AnimTask_ShakeMon2_Step", "void AnimTask_ShakeBattlePlatforms", "static void AnimTask_ShakeBattlePlatforms_Step", "const struct SpriteTemplate gSimplePaletteBlendSpriteTemplate", "static void AnimSimplePaletteBlend", "static void AnimSimplePaletteBlend_Step", "void SoundTask_PlayCryWithEcho", "static void SoundTask_PlayCryWithEcho_Step", "void SoundTask_WaitForCry"]);
requireTokens("Hyper Voice resources", `${graphics}\n${registry}`, ["gBattleAnimSpriteGfx_ThinRing", "gBattleAnimSpritePal_ThinRing", "{gBattleAnimSpriteGfx_ThinRing, 0x0800, ANIM_TAG_THIN_RING}", "{gBattleAnimSpritePal_ThinRing, ANIM_TAG_THIN_RING}"]);
requireTokens("Hyper Voice constants/move", `${constants}\n${moves}`, ["#define ANIM_TAG_THIN_RING", "[MOVE_HYPER_VOICE] =", ".power = 90", ".pp = 10", ".flags = FLAG_SNATCH_AFFECTED"]);

const rootStart = sym("Move_HYPER_VOICE", 0x082d50d6).address;
const effectStart = sym("HyperVoiceEffect", 0x082d50fa).address;
const rootEnd = sym("Move_SAND_TOMB", 0x082d516a).address;
const runtimeAddresses: Record<string, number> = {
  Cmd_loadspritegfx: 0x080a3d24, Cmd_createsprite: 0x080a3dd8, Cmd_createvisualtask: 0x080a3ecc,
  Cmd_delay: 0x080a3f48, Cmd_waitforvisualfinish: 0x080a3f88, Cmd_end: 0x080a3fc4,
  Cmd_call: 0x080a4ccc, Cmd_return: 0x080a4d00,
};
console.log(JSON.stringify({
  schema: "hyper-voice-source-audit/v1", move: "MOVE_HYPER_VOICE", moveId: 304,
  status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_HYPER_VOICE", nextDispatchLabel: "Move_SAND_TOMB", source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody),
      rom: { ...romRange("Move_HYPER_VOICE", rootEnd, 0x082d50d6), start: hex(rootStart), endExclusive: hex(rootEnd) },
      branches: { directlyReachableBlocks: labels, dispatchedBranches: ["HyperVoiceEffect"], complete: true },
    },
    commands: expectedCommands,
    directBodies: {
      hyperVoiceEffect: { source: sourceSpan("data/battle_anim_scripts.s", scripts, effectBody), rom: { ...romRange("HyperVoiceEffect", rootEnd, 0x082d50fa), start: hex(effectStart), endExclusive: hex(rootEnd) } },
      ring: {
        template: objectRecord("gHyperVoiceRingSpriteTemplate", "src/battle_anim_effects_2.c", effects, 0x08593880),
        affineProgram: objectRecord("gHyperVoiceRingAffineAnimCmds", "src/battle_anim_effects_2.c", effects, 0x085937f8),
        affineTable: objectRecord("gHyperVoiceRingAffineAnimTable", "src/battle_anim_effects_2.c", effects, 0x08593818),
        callback: bodyRecord("AnimHyperVoiceRing", "src/battle_anim_effects_2.c", effects, 0x081052a4),
        waitEnd: bodyRecord("AnimHyperVoiceRing_WaitEnd", "src/battle_anim_effects_2.c", effects, 0x08105284),
      },
      tasks: {
        scale: { start: bodyRecord("AnimTask_ScaleMonAndRestore", "src/battle_anim_mon_movement.c", movement, 0x080d6064), step: bodyRecord("AnimTask_ScaleMonAndRestore_Step", "src/battle_anim_mon_movement.c", movement, 0x080d60bc) },
        shakeMon2: { start: bodyRecord("AnimTask_ShakeMon2", "src/battle_anim_mon_movement.c", movement, 0x080d52d0), step: bodyRecord("AnimTask_ShakeMon2_Step", "src/battle_anim_mon_movement.c", movement, 0x080d53bc) },
        platform: { start: bodyRecord("AnimTask_ShakeBattlePlatforms", "src/battle_anim_normal.c", normal, 0x081162a4), step: bodyRecord("AnimTask_ShakeBattlePlatforms_Step", "src/battle_anim_normal.c", normal, 0x081162f8) },
        cry: { start: bodyRecord("SoundTask_PlayCryWithEcho", "src/battle_anim_sound_tasks.c", sound, 0x081590b8), step: bodyRecord("SoundTask_PlayCryWithEcho_Step", "src/battle_anim_sound_tasks.c", sound, 0x0815913c), wait: bodyRecord("SoundTask_WaitForCry", "src/battle_anim_sound_tasks.c", sound, 0x08159078) },
        simplePaletteBlend: { template: objectRecord("gSimplePaletteBlendSpriteTemplate", "src/battle_anim_normal.c", normal, 0x08597274), start: bodyRecord("AnimSimplePaletteBlend", "src/battle_anim_normal.c", normal, 0x081157fc), step: bodyRecord("AnimSimplePaletteBlend_Step", "src/battle_anim_normal.c", normal, 0x08115884) },
      },
      runtimeCommands: Object.fromEntries(Object.entries(runtimeAddresses).map(([name, address]) => [name, bodyRecord(name, "src/battle_anim.c", runtime, address)])),
      resources: {
        gfxSource: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimSpriteGfx_ThinRing[]"),
        paletteSource: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimSpritePal_ThinRing[]"),
        gfx: romRange("gBattleAnimSpriteGfx_ThinRing", undefined, 0x08c22234), palette: romRange("gBattleAnimSpritePal_ThinRing", undefined, 0x08c223e0),
        registryGfx: lineRecord("src/data/battle_anim.h", registry, "{gBattleAnimSpriteGfx_ThinRing, 0x0800, ANIM_TAG_THIN_RING}"),
        registryPalette: lineRecord("src/data/battle_anim.h", registry, "{gBattleAnimSpritePal_ThinRing, ANIM_TAG_THIN_RING}"),
      },
    },
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents, track: { id: track.id, components: track.components, representatives: track.representatives, fulfilled: false } },
  behavior: { effectCalls: 2, palette: { selector: "F_PAL_BG | F_PAL_BATTLERS", delay: 3, initialBlendY: 8, targetBlendY: 0, color: "RGB_YELLOW" }, scale: { args: [-5, -5, 5, "ANIM_ATTACKER", 0] }, ring: { args: [45, 0, 0, 0, 0, 0, 1], affine: [[16, 16, 0, 0], [11, 11, 0, 45]] }, targetShake: { args: ["ANIM_TARGET", 1, 0, 6, 1] }, partnerShake: { args: ["ANIM_DEF_PARTNER", 1, 0, 6, 1] }, platforms: { args: [1, 0, 6, 1] }, cries: [false, true], cleanup: ["waitforvisualfinish", "end"] },
  resources: { thinRing: { tag: "ANIM_TAG_THIN_RING", tagValue: 10203, tileBytes: 0x0800, source: "graphics/battle_anims/sprites/thin_ring.png" } },
  carriers: { factoryCount: allCarriers.length, level50Count: level50Carriers.length, allFactory: allCarriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemTableId: entry.itemTableId, itemName: entry.itemName, evSpread: entry.evSpread, evSpreadStats: entry.evSpreadStats, nature: entry.nature })), level50: level50Carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemTableId: entry.itemTableId, itemName: entry.itemName, evSpread: entry.evSpread, evSpreadStats: entry.evSpreadStats, nature: entry.nature })), excludedOutsideLevel50: allCarriers.filter((entry: Json) => !inLevel50(entry)).map((entry: Json) => entry.index), representative: level50Carriers[0] },
  controls: { kind: "source/component identity checks only; Uproar, Roar, Rock Tomb, and Snore receive no Hyper Voice timing, body, latch, component, sibling, track, or coverage credit", named: Object.fromEntries(Object.entries(namedControls).map(([move, control]) => [move, { ...control, status: statusOf(move) }])) },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, commandOrder: true, directTaskCallbackResourceBodies: true, fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, oracleFreshnessCheckedBeforeLocalMgba: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, latchMeasured: false, durableLatchRowAdded: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true },
}, null, 2));
