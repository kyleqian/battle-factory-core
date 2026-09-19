/**
 * Authoritative source/classification audit for MOVE_SILVER_WIND.
 *
 * This is deliberately a source-only checkpoint.  It reads the pinned ROM and
 * source tree at development time, but production imports neither this file
 * nor the staged parties/receipts.
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
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = read("data/battle_anim_scripts.s");
const effects = read("src/battle_anim_effects_1.c");
const utility = read("src/battle_anim_utility_funcs.c");
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
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const symbols = new Map<string, SymbolEntry[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
}).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    const value = { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) };
    symbols.set(fields.at(-1)!, [...(symbols.get(fields.at(-1)!) ?? []), value]);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const value = { address: Number.parseInt(fields[0]!, 16), size: 0 };
    symbols.set(fields[2]!, [...(symbols.get(fields[2]!) ?? []), value]);
  }
}

function symbol(name: string): SymbolEntry {
  const values = symbols.get(name) ?? [];
  if (values.length !== 1) throw new Error(`missing or ambiguous ELF symbol ${name}`);
  return values[0]!;
}
function romRange(name: string, end?: number): Json {
  const value = symbol(name);
  const endExclusive = end ?? value.address + value.size;
  if (endExclusive <= value.address) throw new Error(`invalid ROM interval ${name}`);
  return {
    symbol: name,
    elf: { image: "reference/pokeemerald/pokeemerald.elf", symbol: name, start: hex(value.address), endExclusive: hex(endExclusive), byteLength: endExclusive - value.address },
    start: hex(value.address), endExclusive: hex(endExclusive), byteLength: endExclusive - value.address,
    romSha256: sha(rom.subarray(value.address - 0x08000000, endExclusive - 0x08000000)),
  };
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
function objectBody(source: string, token: string): string {
  const from = source.indexOf(token);
  const to = source.indexOf("};", from) + 2;
  if (from < 0 || to < 2) throw new Error(`missing object ${token}`);
  return source.slice(source.lastIndexOf("\n", from) + 1, to);
}
function bodyRecord(name: string, path: string, source: string): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name) };
}
function objectRecord(name: string): Json {
  const body = objectBody(effects, name);
  return { source: sourceSpan("src/battle_anim_effects_1.c", effects, body), rom: romRange(name) };
}
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const rootStart = 0x082d630b;
const rootEnd = 0x082d6523;
const rootBody = sourceBlock(scripts, "Move_SILVER_WIND:\n", "Move_SNATCH:\n");
const rootCommands = commands(rootBody);
const expectedComponents = [
  "asset:ANIM_TAG_SPARKLE_6", "sprite:gSilverWindBigSparkSpriteTemplate", "sprite:gSilverWindMediumSparkSpriteTemplate",
  "sprite:gSilverWindSmallSparkSpriteTemplate", "subroutine:SilverWindContinue", "subroutine:SilverWindOnPlayer",
  "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_BlendBattleAnimPalExclude", "task:AnimTask_GetTargetSide",
  "task:AnimTask_StartSlidingBg", "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg",
  "visualCommand:panse", "visualCommand:restorebg", "visualCommand:setarg", "visualCommand:splitbgprio_all",
  "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
] as const;
const rootRange = romRange("Move_SILVER_WIND", rootEnd);
const blocks = ["Move_SILVER_WIND", "SilverWindOnPlayer", "SilverWindContinue"] as const;
const spriteCommands = rootCommands.filter((line) => line.startsWith("createsprite gSilverWind"));
const taskCommands = rootCommands.filter((line) => line.startsWith("createvisualtask"));
const audioCommands = rootCommands.filter((line) => /^(?:panse|playsewithpan) /u.test(line));
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_SILVER_WIND");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_SILVER_WIND");
const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SILVER_WIND"));
const level50Carriers = allCarriers.filter((entry: Json) => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end));
const controls = ["MOVE_CALM_MIND", "MOVE_DESTINY_BOND", "MOVE_HEAL_BELL", "MOVE_LUSTER_PURGE", "MOVE_ROCK_TOMB"];

if (symbol("Move_SILVER_WIND").address !== rootStart || symbol("Move_SNATCH").address !== rootEnd
  || symbol("SilverWindContinue").address !== 0x082d6352 || symbol("SilverWindOnPlayer").address !== 0x082d650c) {
  throw new Error("MOVE_SILVER_WIND pointer-owned interval drifted");
}
if (JSON.stringify(graphEntry) === undefined || graphEntry.id !== 318 || graphEntry.rootScript !== "Move_SILVER_WIND"
  || JSON.stringify(graphEntry.blocks) !== JSON.stringify(blocks) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) {
  throw new Error("generated MOVE_SILVER_WIND component graph drifted");
}
if (!move || move.id !== 318 || move.effect !== "EFFECT_ALL_STATS_UP_HIT" || move.frontierMonCount !== 11 || move.speciesCount !== 9) {
  throw new Error("MOVE_SILVER_WIND inventory classification drifted");
}
if (coverage.entries.find((entry: Json) => entry.move === "MOVE_SILVER_WIND")?.status !== "exact"
  || coverage.queue.includes("MOVE_SILVER_WIND")) {
  throw new Error("MOVE_SILVER_WIND must remain exact and queue-absent");
}
if (spriteCommands.length !== 18 || taskCommands.length !== 6 || audioCommands.length !== 3
  || rootCommands.filter((line) => line === "fadetobg BG_BUG_OPPONENT").length !== 1
  || rootCommands.filter((line) => line === "fadetobg BG_BUG_PLAYER").length !== 1
  || rootCommands.filter((line) => line === "createvisualtask AnimTask_BlendBattleAnimPalExclude, 10, ANIM_TARGET, 0, 0, 4, RGB_BLACK").length !== 1
  || rootCommands.filter((line) => line === "createvisualtask AnimTask_BlendBattleAnimPalExclude, 10, ANIM_TARGET, 0, 4, 0, RGB_BLACK").length !== 1
  || !rootCommands.at(-1)?.match(/^goto SilverWindContinue$/u)) {
  throw new Error("MOVE_SILVER_WIND source topology drifted");
}
requireTokens("Silver Wind sprites", effects, [
  "const struct SpriteTemplate gSilverWindBigSparkSpriteTemplate", "const struct SpriteTemplate gSilverWindMediumSparkSpriteTemplate",
  "const struct SpriteTemplate gSilverWindSmallSparkSpriteTemplate", ".callback = AnimFlyingParticle", ".tileTag = ANIM_TAG_SPARKLE_6",
]);
requireTokens("Silver Wind tasks", utility, [
  "void AnimTask_BlendBattleAnimPal(u8 taskId)", "void AnimTask_BlendBattleAnimPalExclude(u8 taskId)",
  "void AnimTask_StartSlidingBg(u8 taskId)", "static void AnimTask_UpdateSlidingBg(u8 taskId)", "void AnimTask_GetTargetSide(u8 taskId)",
]);
requireTokens("Silver Wind resources", `${graphics}\n${registry}\n${constants}`, [
  "gBattleAnimSpriteGfx_Sparkle6", "gBattleAnimSpritePal_Sparkle6", "ANIM_TAG_SPARKLE_6", "BG_BUG_OPPONENT", "BG_BUG_PLAYER",
]);
requireTokens("Silver Wind audio", songs, ["#define SE_M_GUST                   132", "#define SE_M_GUST2                  133", "#define SE_M_MORNING_SUN            228"]);
if (allCarriers.length !== 12 || level50Carriers.length !== 11 || level50Carriers[0]?.index !== 153 || allCarriers.at(-1)?.index !== 711) {
  throw new Error("MOVE_SILVER_WIND Factory/Level-50 carrier census drifted");
}

console.log(JSON.stringify({
  schema: "silver-wind-source-audit/v1",
  move: "MOVE_SILVER_WIND", moveId: 318, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_SILVER_WIND", nextDispatchLabel: "Move_SNATCH", rom: rootRange,
      blocks, branches: { directlyReachableBlocks: blocks, targetSide: { false: "BG_BUG_OPPONENT / +1536", true: "BG_BUG_PLAYER / -1536" }, complete: true },
    },
    commands: rootCommands,
    commandSummary: {
      sparkSprites: { total: spriteCommands.length, big: 6, medium: 6, small: 6 }, taskCommands,
      audio: audioCommands, backgrounds: ["BG_BUG_OPPONENT", "BG_BUG_PLAYER"], cleanup: [
        "waitforvisualfinish", "playsewithpan SE_M_GUST2, SOUND_PAN_TARGET", "clearmonbg ANIM_DEF_PARTNER", "restorebg",
        "waitbgfadeout", "createvisualtask AnimTask_BlendBattleAnimPalExclude, 10, ANIM_TARGET, 0, 4, 0, RGB_BLACK", "setarg 7, 0xFFFF", "waitbgfadein", "end",
      ],
    },
    directBodies: {
      sprites: {
        big: objectRecord("gSilverWindBigSparkSpriteTemplate"), medium: objectRecord("gSilverWindMediumSparkSpriteTemplate"), small: objectRecord("gSilverWindSmallSparkSpriteTemplate"),
        flyingParticle: bodyRecord("AnimFlyingParticle", "src/battle_anim_effects_1.c", effects),
      },
      tasks: {
        blend: bodyRecord("AnimTask_BlendBattleAnimPal", "src/battle_anim_utility_funcs.c", utility),
        blendExclude: bodyRecord("AnimTask_BlendBattleAnimPalExclude", "src/battle_anim_utility_funcs.c", utility),
        targetSide: bodyRecord("AnimTask_GetTargetSide", "src/battle_anim_utility_funcs.c", utility),
        slidingBg: bodyRecord("AnimTask_StartSlidingBg", "src/battle_anim_utility_funcs.c", utility),
      },
      resources: {
        sparkleGfx: romRange("gBattleAnimSpriteGfx_Sparkle6"), sparklePalette: romRange("gBattleAnimSpritePal_Sparkle6"),
        bugBackgrounds: { opponent: "BG_BUG_OPPONENT = Highspeed image / Bug palette / opponent tilemap", player: "BG_BUG_PLAYER = Highspeed image / Bug palette / player tilemap" },
      },
    },
  },
  graph: { blocks, components: graphEntry.componentIds, coverage: { entryPresent: false, queueContainsMove: false, sharedTrackListedButUnfulfilled: "blend-battle-anim-palette-exclude" } },
  behavior: { effect: move.effect, power: move.power, accuracy: move.accuracy, pp: move.pp, secondaryEffectChance: move.secondaryEffectChance, target: move.target },
  resources: { tag: { name: "ANIM_TAG_SPARKLE_6", value: 271 }, audio: { SE_M_GUST: 132, SE_M_GUST2: 133, SE_M_MORNING_SUN: 228 } },
  carriers: { factoryCount: allCarriers.length, level50Count: level50Carriers.length, allFactory: allCarriers, level50: level50Carriers, excludedOutsideLevel50: allCarriers.filter((entry: Json) => !level50Carriers.includes(entry)).map((entry: Json) => entry.index), inventory: { frontierMonCount: move.frontierMonCount, speciesCount: move.speciesCount } },
  controls: { named: Object.fromEntries(controls.map((name) => [name, { graph: graph.moves.find((entry: Json) => entry.move === name)?.componentIds ?? [], coverage: coverage.entries.find((entry: Json) => entry.move === name)?.status ?? "none" }])) },
  checkpoint: {
    sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directTaskCallbackResourceBodies: true,
    fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true,
    compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, rawRgbRetained: false,
    latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false,
    compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false,
    queueChanged: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true,
  },
  remainder: "MOVE_SILVER_WIND remains unsupported and coverage-absent. A later move-owned step needs complete twice-fresh dense Battle Scene ON windows in both orientations, source-to-display latch maps for the two BUG backgrounds/sliding BG/split priority/exclude palettes/all eighteen spark callbacks/audio/cleanup, and independent live presentation acceptance before any reducer, seam, compositor, track, sibling, or coverage credit.",
}, null, 2));
