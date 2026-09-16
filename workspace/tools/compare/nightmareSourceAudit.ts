/** Authoritative source/component/carrier classification for MOVE_NIGHTMARE. */
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
const ghost = read("src/battle_anim_ghost.c");
const mons = read("src/battle_anim_mons.c");
const movement = read("src/battle_anim_mon_movement.c");
const runtime = read("src/battle_anim.c");
const intro = read("src/battle_intro.c");
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

function sym(name: string, address?: number): SymbolEntry {
  const candidates = symbols.get(name) ?? [];
  const values = address === undefined ? candidates : candidates.filter((candidate) => candidate.address === address);
  if (values.length !== 1) throw new Error(`missing or ambiguous ELF symbol ${name}${address === undefined ? "" : ` at ${hex(address)}`}`);
  return values[0]!;
}
function romRange(name: string, end?: number, address?: number): Json {
  const value = sym(name, address);
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
function bodyRecord(name: string, path: string, source: string, address?: number): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name, undefined, address) };
}
function lineRecord(path: string, source: string, token: string): Json {
  const index = source.indexOf(token);
  if (index < 0) throw new Error(`missing source line ${token}`);
  const start = source.lastIndexOf("\n", index) + 1;
  const end = source.indexOf("\n", index);
  return { source: sourceSpan(path, source, source.slice(start, end < 0 ? source.length : end)) };
}
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const pointerBody = sourceBlock(scripts, "Move_NIGHTMARE:\n", "Move_FLAIL:\n");
const rootBody = sourceBlock(scripts, "Move_NIGHTMARE:\n", "NightmareInContest:\n");
const contestBody = sourceBlock(scripts, "NightmareInContest:\n", "Move_FLAIL:\n");
const rootCommands = [
  "fadetobg BG_GHOST", "waitbgfadein", "jumpifcontest NightmareInContest", "monbg ANIM_DEF_PARTNER",
  "createvisualtask AnimTask_NightmareClone, 2", "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 3, 0, 40, 1",
  "playsewithpan SE_M_NIGHTMARE, SOUND_PAN_TARGET", "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER",
  "restorebg", "waitbgfadein", "end",
] as const;
const contestCommands = [
  "createvisualtask AnimTask_BlendMonInAndOut, 2, ANIM_ATTACKER, RGB_WHITE, 10, 2, 1",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_ATTACKER, 3, 0, 32, 1", "playsewithpan SE_M_NIGHTMARE, SOUND_PAN_TARGET",
  "waitforvisualfinish", "restorebg", "waitbgfadein", "end",
] as const;
if (JSON.stringify(commands(rootBody)) !== JSON.stringify(rootCommands)) throw new Error("MOVE_NIGHTMARE root command order drifted");
if (JSON.stringify(commands(contestBody)) !== JSON.stringify(contestCommands)) throw new Error("NightmareInContest command order drifted");
const expectedComponents = [
  "subroutine:NightmareInContest", "task:AnimTask_BlendMonInAndOut", "task:AnimTask_NightmareClone", "task:AnimTask_ShakeMon",
  "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:waitbgfadein",
] as const;
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_NIGHTMARE");
if (!graphEntry || graphEntry.id !== 171 || graphEntry.rootScript !== "Move_NIGHTMARE" || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_NIGHTMARE", "NightmareInContest"]) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("generated Nightmare graph drifted");
const track = coverage.componentTracks.find((entry: Json) => entry.id === "nightmare-clone-blend");
if (!track || JSON.stringify(track.components) !== JSON.stringify(expectedComponents) || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_NIGHTMARE"]) || track.fulfilled !== false) throw new Error("Nightmare track drifted");
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_NIGHTMARE") || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_NIGHTMARE"])) throw new Error("Nightmare coverage boundary drifted");

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const inLevel50 = (entry: Json): boolean => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_NIGHTMARE"));
const level50Carriers = allCarriers.filter(inLevel50);
if (JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([284, 497]) || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify([284, 497])) throw new Error("Nightmare Factory carrier census drifted");
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_NIGHTMARE");
if (inventoryEntry?.frontierMonCount !== 2 || inventoryEntry?.speciesCount !== 2) throw new Error("Nightmare generated inventory drifted");
for (const carrier of allCarriers) requireTokens(`Nightmare carrier ${carrier.label}`, frontierConstants, [carrier.label]);
if ((frontierSource.match(/MOVE_NIGHTMARE/g) ?? []).length !== allCarriers.length) throw new Error("Nightmare source carrier count drifted");

const namedControlMoves = ["MOVE_FORESIGHT", "MOVE_SUPER_FANG", "MOVE_HIDDEN_POWER", "MOVE_FLAME_WHEEL", "MOVE_TORMENT", "MOVE_HELPING_HAND", "MOVE_RECYCLE", "MOVE_ENDEAVOR", "MOVE_SKILL_SWAP", "MOVE_EXTRASENSORY", "MOVE_RAGE", "MOVE_NIGHT_SHADE", "MOVE_SPITE", "MOVE_DESTINY_BOND"] as const;
const namedControls = Object.fromEntries(namedControlMoves.map((move) => {
  const entry = graph.moves.find((candidate: Json) => candidate.move === move);
  if (!entry) throw new Error(`missing Nightmare identity control ${move}`);
  requireTokens(`Nightmare identity control ${move}`, scripts, [`${move.replace("MOVE_", "Move_")}:`]);
  return [move, {
    status: coverage.entries.find((candidate: Json) => candidate.move === move)?.status ?? "unsupported",
    sharedComponents: expectedComponents.filter((component) => entry.componentIds.includes(component)),
  }];
}));

requireTokens("Nightmare runtime commands", runtime, ["static void Cmd_fadetobg", "static void Cmd_waitbgfadein", "static void Cmd_jumpifcontest", "static void Cmd_monbg", "static void Cmd_createvisualtask", "static void Cmd_playsewithpan", "static void Cmd_waitforvisualfinish", "static void Cmd_clearmonbg", "static void Cmd_restorebg", "static void Cmd_end", "Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg", "Task_FadeToBg", "LoadMoveBg", "MoveBattlerSpriteToBG"]);
requireTokens("Nightmare direct graph", `${ghost}\n${mons}\n${movement}\n${intro}`, ["void AnimTask_NightmareClone", "static void AnimTask_NightmareClone_Step", "CloneBattlerSpriteWithBlend", "DestroySpriteWithActiveSheet", "TranslateSpriteLinearFixedPoint", "void AnimTask_BlendMonInAndOut", "static void AnimTask_BlendMonInAndOut_Step", "void AnimTask_ShakeMon", "static void AnimTask_ShakeMon_Step", "void DrawBattlerOnBg"]);
requireTokens("Nightmare resources/audio", `${graphics}\n${registry}\n${constants}\n${songs}\n${moves}`, ["gBattleAnimBgImage_Ghost", "gBattleAnimBgPalette_Ghost", "gBattleAnimBgTilemap_Ghost", "[BG_GHOST]", "#define BG_GHOST 2", "#define SE_M_NIGHTMARE", "[MOVE_NIGHTMARE]", ".effect = EFFECT_NIGHTMARE", ".pp = 15", "SOUND_PAN_TARGET"]);

const rootStart = sym("Move_NIGHTMARE").address;
const rootEnd = sym("Move_FLAIL").address;
const directBodies = {
  nightmareClone: {
    start: bodyRecord("AnimTask_NightmareClone", "src/battle_anim_ghost.c", ghost),
    step: bodyRecord("AnimTask_NightmareClone_Step", "src/battle_anim_ghost.c", ghost),
    clone: bodyRecord("CloneBattlerSpriteWithBlend", "src/battle_anim_mons.c", mons),
    destroy: bodyRecord("DestroySpriteWithActiveSheet", "src/battle_anim_mons.c", mons),
    translate: bodyRecord("TranslateSpriteLinearFixedPoint", "src/battle_anim_mons.c", mons),
  },
  blend: {
    start: bodyRecord("AnimTask_BlendMonInAndOut", "src/battle_anim_mons.c", mons),
    step: bodyRecord("AnimTask_BlendMonInAndOut_Step", "src/battle_anim_mons.c", mons),
  },
  shake: {
    start: bodyRecord("AnimTask_ShakeMon", "src/battle_anim_mon_movement.c", movement),
    step: bodyRecord("AnimTask_ShakeMon_Step", "src/battle_anim_mon_movement.c", movement),
  },
  backgroundTasks: Object.fromEntries(["Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg", "Task_FadeToBg", "LoadMoveBg", "MoveBattlerSpriteToBG"].map((name) => [name, bodyRecord(name, "src/battle_anim.c", runtime)])),
  runtimeCommands: Object.fromEntries(["Cmd_fadetobg", "Cmd_waitbgfadein", "Cmd_jumpifcontest", "Cmd_monbg", "Cmd_createvisualtask", "Cmd_playsewithpan", "Cmd_waitforvisualfinish", "Cmd_clearmonbg", "Cmd_restorebg"].map((name) => [name, bodyRecord(name, "src/battle_anim.c", runtime)]).concat([["Cmd_end", bodyRecord("Cmd_end", "src/battle_anim.c", runtime, 0x080a3fc4)]])),
  drawHelper: bodyRecord("DrawBattlerOnBg", "src/battle_intro.c", intro),
};
const resources = {
  ghostBackground: {
    image: { source: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimBgImage_Ghost[]"), rom: romRange("gBattleAnimBgImage_Ghost") },
    palette: { source: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimBgPalette_Ghost[]"), rom: romRange("gBattleAnimBgPalette_Ghost") },
    tilemap: { source: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimBgTilemap_Ghost[]"), rom: romRange("gBattleAnimBgTilemap_Ghost") },
    registry: lineRecord("src/data/battle_anim.h", registry, "[BG_GHOST]"),
    id: lineRecord("include/constants/battle_anim.h", constants, "#define BG_GHOST 2"),
  },
  audio: { script: ["SE_M_NIGHTMARE", "SOUND_PAN_TARGET"], song: lineRecord("include/constants/songs.h", songs, "#define SE_M_NIGHTMARE") },
};
const carrier = (entry: Json): Json => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemTableId: entry.itemTableId, itemName: entry.itemName, evSpread: entry.evSpread, evSpreadStats: entry.evSpreadStats, nature: entry.nature });

console.log(JSON.stringify({
  schema: "nightmare-source-audit/v1", move: "MOVE_NIGHTMARE", moveId: 171,
  status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_NIGHTMARE", nextDispatchLabel: "Move_FLAIL", source: sourceSpan("data/battle_anim_scripts.s", scripts, pointerBody),
      rom: { ...romRange("Move_NIGHTMARE", rootEnd), start: hex(rootStart), endExclusive: hex(rootEnd) },
      branches: { directlyReachableBlocks: ["Move_NIGHTMARE", "NightmareInContest"], dispatchedBranches: ["NightmareInContest"], complete: true },
    },
    commands: { root: rootCommands, contest: contestCommands }, directBodies,
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents, track: { id: track.id, components: track.components, representatives: track.representatives, fulfilled: false } },
  resources,
  behavior: { background: "BG_GHOST", targetMonBg: "ANIM_DEF_PARTNER", clone: { task: "AnimTask_NightmareClone", priority: 2 }, shake: { task: "AnimTask_ShakeMon", args: ["ANIM_TARGET", 3, 0, 40, 1] }, contestBlend: { task: "AnimTask_BlendMonInAndOut", args: ["ANIM_ATTACKER", "RGB_WHITE", 10, 2, 1] }, audio: { sound: "SE_M_NIGHTMARE", pan: "SOUND_PAN_TARGET" }, cleanup: ["clearmonbg ANIM_DEF_PARTNER", "restorebg", "waitbgfadein", "end"] },
  carriers: { factoryCount: allCarriers.length, level50Count: level50Carriers.length, allFactory: allCarriers.map(carrier), level50: level50Carriers.map(carrier), excludedOutsideLevel50: allCarriers.filter((entry: Json) => !inLevel50(entry)).map((entry: Json) => entry.index), representative: carrier(level50Carriers[0]), inventory: inventoryEntry },
  controls: { kind: "source/component identity checks only; named controls confer no Nightmare timing, body, latch, component, sibling, track, or coverage credit", named: namedControls },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, commandOrder: true, completeReachableVisualGraph: true, directTaskCallbackResourceBodies: true, fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, oracleFreshnessCheckedBeforeLocalMgba: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, rawRgbRetained: false, latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true },
}, null, 2));
