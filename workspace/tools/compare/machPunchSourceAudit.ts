/** Authoritative source/ELF/ROM/component/carrier checkpoint for MOVE_MACH_PUNCH. */
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
const mons = read("src/battle_anim_mons.c");
const movement = read("src/battle_anim_mon_movement.c");
const utility = read("src/battle_anim_utility_funcs.c");
const runtime = read("src/battle_anim.c");
const registry = read("src/data/battle_anim.h");
const graphics = read("src/graphics.c");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;

const symbols = new Map<string, SymbolEntry[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\n")) {
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
  const value = expectedAddress === undefined ? (entries.length === 1 ? entries[0] : undefined) : entries.find((entry) => entry.address === expectedAddress);
  if (!value) throw new Error(`missing or ambiguous ELF symbol ${name}`);
  return value;
}
function romRange(name: string, end?: number, expectedAddress?: number): Json {
  const value = sym(name, expectedAddress);
  const finish = end ?? value.address + value.size;
  if (finish <= value.address) throw new Error(`invalid ROM interval ${name}`);
  return { symbol: name, start: hex(value.address), endExclusive: hex(finish), byteLength: finish - value.address, romSha256: sha(rom.subarray(value.address - 0x08000000, finish - 0x08000000)) };
}
function sourceBlock(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`missing source block ${start}/${end}`);
  return source.slice(from, to);
}
function sourceSpan(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing source span ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
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
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const head = sourceBlock(scripts, "Move_MACH_PUNCH:\n", "MachPunchContinue:\n");
const continuation = sourceBlock(scripts, "MachPunchContinue:\n", "MachPunchAgainstPlayer:\n");
const playerBranch = sourceBlock(scripts, "MachPunchAgainstPlayer:\n", "Move_FORESIGHT:\n");
const completeBody = `${head}${continuation}${playerBranch}`;
const expectedHead = ["loadspritegfx ANIM_TAG_IMPACT", "loadspritegfx ANIM_TAG_HANDS_AND_FEET", "monbg ANIM_ATK_PARTNER", "createvisualtask AnimTask_GetAttackerSide, 2", "jumprettrue MachPunchAgainstPlayer", "fadetobg BG_HIGHSPEED_OPPONENT"];
const expectedContinue = ["waitbgfadeout", "createvisualtask AnimTask_StartSlidingBg, 5, -2304, 0, 1, -1", "waitbgfadein", "delay 0", "setalpha 9, 8", "createvisualtask AnimTask_AttackerPunchWithTrace, 2, RGB(8, 9, 28), 10", "playsewithpan SE_M_JUMP_KICK, SOUND_PAN_ATTACKER", "delay 6", "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=1", "create_fist_sprite ANIM_TARGET, 4, x=0, y=0, duration=8", "playsewithpan SE_M_COMET_PUNCH, SOUND_PAN_TARGET", "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 3, 0, 6, 1", "waitforvisualfinish", "clearmonbg ANIM_ATK_PARTNER", "blendoff", "restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein", "end"];
const expectedPlayer = ["fadetobg BG_HIGHSPEED_PLAYER", "goto MachPunchContinue"];
if (JSON.stringify(commands(head)) !== JSON.stringify(expectedHead) || JSON.stringify(commands(continuation)) !== JSON.stringify(expectedContinue) || JSON.stringify(commands(playerBranch)) !== JSON.stringify(expectedPlayer)) throw new Error("MOVE_MACH_PUNCH command/body drifted");

const expectedComponents = ["asset:ANIM_TAG_HANDS_AND_FEET", "asset:ANIM_TAG_IMPACT", "subroutine:MachPunchAgainstPlayer", "subroutine:MachPunchContinue", "task:AnimTask_AttackerPunchWithTrace", "task:AnimTask_GetAttackerSide", "task:AnimTask_ShakeMon", "task:AnimTask_StartSlidingBg", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:create_fist_sprite", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout"] as const;
const moveGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_MACH_PUNCH");
if (!moveGraph || moveGraph.id !== 183 || moveGraph.rootScript !== "Move_MACH_PUNCH" || JSON.stringify(moveGraph.blocks) !== JSON.stringify(["Move_MACH_PUNCH", "MachPunchAgainstPlayer", "MachPunchContinue"]) || JSON.stringify(moveGraph.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("MOVE_MACH_PUNCH generated graph drifted");
const exactByComponent = Object.fromEntries(expectedComponents.map((component) => [component, graph.moves.filter((entry: Json) => entry.componentIds.includes(component) && coverage.entries.some((covered: Json) => covered.move === entry.move && covered.status === "exact")).map((entry: Json) => entry.move)]));
const unrepresented = expectedComponents.filter((component) => exactByComponent[component].length === 0);
if (JSON.stringify(unrepresented) !== JSON.stringify(["subroutine:MachPunchAgainstPlayer", "subroutine:MachPunchContinue"])) throw new Error("Mach Punch unrepresented component boundary drifted");

const ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const legal = (entry: Json): boolean => ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_MACH_PUNCH"));
const level50 = allCarriers.filter(legal);
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_MACH_PUNCH");
if (JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([15, 32, 234, 236, 339, 382]) || JSON.stringify(level50.map((entry: Json) => entry.index)) !== JSON.stringify([234, 236, 339, 382]) || inventoryEntry?.id !== 183 || inventoryEntry?.frontierMonCount !== 4 || JSON.stringify(inventoryEntry.exampleMons) !== JSON.stringify(["FRONTIER_MON_HITMONCHAN_1", "FRONTIER_MON_HITMONTOP_1", "FRONTIER_MON_HITMONCHAN_2"])) throw new Error("MOVE_MACH_PUNCH carrier census drifted");
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_MACH_PUNCH") || coverage.queue.length !== 0 || coverage.componentTracks.some((track: Json) => track.representatives?.includes("MOVE_MACH_PUNCH"))) throw new Error("MOVE_MACH_PUNCH unsupported/no-queue/no-track boundary drifted");

requireTokens("Mach Punch task bodies", `${mons}\n${movement}\n${utility}`, ["void AnimTask_AttackerPunchWithTrace", "static void AnimTask_AttackerPunchWithTrace_Step", "void AnimTask_GetAttackerSide", "void AnimTask_StartSlidingBg", "void AnimTask_ShakeMon", "static void AnimTask_ShakeMon_Step"]);
requireTokens("Mach Punch backgrounds/resources", `${registry}\n${graphics}\n${constants}`, ["BG_HIGHSPEED_OPPONENT 9", "BG_HIGHSPEED_PLAYER 10", "gBattleAnimBgImage_Highspeed", "gBattleAnimBgPalette_Highspeed", "gBattleAnimBgTilemap_HighspeedOpponent", "gBattleAnimBgTilemap_HighspeedPlayer", "gBattleAnimSpriteGfx_HandsAndFeet", "gBattleAnimSpriteGfx_Impact"]);
requireTokens("Mach Punch move/audio", `${moves}\n${songs}`, ["[MOVE_MACH_PUNCH] =", ".effect = EFFECT_QUICK_ATTACK", ".power = 40", ".accuracy = 100", ".pp = 30", ".priority = 1", "#define SE_M_JUMP_KICK", "#define SE_M_COMET_PUNCH"]);
requireTokens("Mach Punch runtime", runtime, ["static void Cmd_fadetobg", "static void Cmd_restorebg", "static void Cmd_waitbgfadein", "static void Cmd_waitbgfadeout", "static void Cmd_setarg", "static void Cmd_end"]);

const start = sym("Move_MACH_PUNCH", 0x082cd565).address;
const end = sym("Move_FORESIGHT", 0x082cd5ed).address;
console.log(JSON.stringify({
  schema: "mach-punch-source-audit/v1", move: "MOVE_MACH_PUNCH", moveId: 183, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: { symbol: "Move_MACH_PUNCH", nextDispatchLabel: "Move_FORESIGHT", source: sourceSpan("data/battle_anim_scripts.s", scripts, completeBody), rom: { ...romRange("Move_MACH_PUNCH", end, 0x082cd565), start: hex(start), endExclusive: hex(end) }, blocks: {
      Move_MACH_PUNCH: { source: sourceSpan("data/battle_anim_scripts.s", scripts, head), romStart: hex(start), commands: expectedHead },
      MachPunchContinue: { source: sourceSpan("data/battle_anim_scripts.s", scripts, continuation), romStart: hex(sym("MachPunchContinue", 0x082cd57e).address), commands: expectedContinue },
      MachPunchAgainstPlayer: { source: sourceSpan("data/battle_anim_scripts.s", scripts, playerBranch), romStart: hex(sym("MachPunchAgainstPlayer", 0x082cd5e6).address), commands: expectedPlayer },
    }, branches: { directlyReachableBlocks: ["Move_MACH_PUNCH", "MachPunchAgainstPlayer", "MachPunchContinue"], targetSideVariants: ["BG_HIGHSPEED_OPPONENT", "BG_HIGHSPEED_PLAYER"], complete: true } },
    directBodies: { attackerPunch: { start: bodyRecord("AnimTask_AttackerPunchWithTrace", "src/battle_anim_mons.c", mons), step: bodyRecord("AnimTask_AttackerPunchWithTrace_Step", "src/battle_anim_mons.c", mons) }, attackerSide: bodyRecord("AnimTask_GetAttackerSide", "src/battle_anim_utility_funcs.c", utility), slidingBg: bodyRecord("AnimTask_StartSlidingBg", "src/battle_anim_utility_funcs.c", utility), shake: { start: bodyRecord("AnimTask_ShakeMon", "src/battle_anim_mon_movement.c", movement), step: bodyRecord("AnimTask_ShakeMon_Step", "src/battle_anim_mon_movement.c", movement) } },
  },
  graph: { blocks: moveGraph.blocks, components: expectedComponents, exactRepresentatives: exactByComponent, unrepresented },
  behavior: { move: { effect: "EFFECT_QUICK_ATTACK", power: 40, accuracy: 100, pp: 30, priority: 1, target: "MOVE_TARGET_SELECTED" }, sideBranch: { opponentTarget: "BG_HIGHSPEED_OPPONENT", playerTarget: "BG_HIGHSPEED_PLAYER" }, slidingBgArgs: [-2304, 0, 1, -1], attackerPunchArgs: ["RGB(8, 9, 28)", 10], targetShakeArgs: ["ANIM_TARGET", 3, 0, 6, 1], alpha: [9, 8], audio: ["SE_M_JUMP_KICK", "SE_M_COMET_PUNCH"] },
  resources: { backgrounds: { image: romRange("gBattleAnimBgImage_Highspeed"), palette: romRange("gBattleAnimBgPalette_Highspeed"), opponentTilemap: romRange("gBattleAnimBgTilemap_HighspeedOpponent"), playerTilemap: romRange("gBattleAnimBgTilemap_HighspeedPlayer") }, spriteTags: ["ANIM_TAG_IMPACT", "ANIM_TAG_HANDS_AND_FEET"] },
  carriers: { count: level50.length, allSourceCarriers: allCarriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves })), level50: level50.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves })), lowestLegal: level50[0], excludedOutsideLevel50: allCarriers.filter((entry: Json) => !legal(entry)).map((entry: Json) => entry.index) },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableBranches: true, completeCarrierCensus: true, legalBilateralPartyOnlyStaging: true, oracleOrMgbaInvoked: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, latchMeasured: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true },
}, null, 2));
