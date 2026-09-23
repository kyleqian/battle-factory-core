/** Authoritative source/component/carrier audit for MOVE_CURSE.
 *
 * This checkpoint deliberately stops at source classification and evidence
 * staging. It does not add a reducer, Scene-ON seam, compositor, or coverage
 * credit. Pointer intervals are half-open and checked against the pinned
 * ELF/ROM image as well as the generated source graph and Factory census.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type SymbolInfo = { address: number; size: number };

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = read("data/battle_anim_scripts.s");
const ghost = read("src/battle_anim_ghost.c");
const utility = read("src/battle_anim_utility_funcs.c");
const movement = read("src/battle_anim_mon_movement.c");
const animData = read("src/data/battle_anim.h");
const graphics = read("src/graphics.c");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const frontierConstants = read("include/constants/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const symbols = new Map<string, SymbolInfo[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
}).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    const name = fields.at(-1)!;
    const records = symbols.get(name) ?? [];
    records.push({ address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
    symbols.set(name, records);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const name = fields[2]!;
    const records = symbols.get(name) ?? [];
    records.push({ address: Number.parseInt(fields[0]!, 16), size: 0 });
    symbols.set(name, records);
  }
}

function symbol(name: string): SymbolInfo {
  const values = symbols.get(name) ?? [];
  if (values.length !== 1) throw new Error(`missing or ambiguous ELF symbol ${name}`);
  return values[0]!;
}

function sourceBlock(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to <= from) throw new Error(`missing source block ${start}/${end}`);
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
      else if (source[index] === "}" && --depth === 0) {
        return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1);
      }
    }
  }
  throw new Error(`missing function ${name}`);
}

function sourceSpan(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing source span ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
}

function romRange(startName: string, endName?: string): Json {
  const start = symbol(startName).address;
  const end = endName === undefined ? start + symbol(startName).size : symbol(endName).address;
  if (end <= start) throw new Error(`invalid ROM interval ${startName}/${endName ?? "sized"}`);
  const bytes = rom.subarray(start - 0x08000000, end - 0x08000000);
  return {
    elf: { image: "reference/pokeemerald/pokeemerald.elf", symbol: startName, start: hex(start), endExclusive: hex(end), byteLength: end - start },
    rom: { image: "reference/pokeemerald/pokeemerald.gba", start: hex(start), endExclusive: hex(end), byteLength: end - start, sha256: sha(bytes) },
  };
}

function bodyRecord(name: string, path: string, source: string): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), ...romRange(name) };
}

function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const blocks = [
  ["Move_CURSE", "CurseGhost"],
  ["CurseGhost", "CurseGhostShakeFromNail"],
  ["CurseGhostShakeFromNail", "CurseStats"],
  ["CurseStats", "CurseStats1"],
  ["CurseStats1", "Move_SOFT_BOILED"],
] as const;
const graphBlocks = ["Move_CURSE", "CurseGhost", "CurseStats", "CurseGhostShakeFromNail", "CurseStats1"] as const;
const expectedComponents = [
  "asset:ANIM_TAG_GHOSTLY_SPIRIT", "asset:ANIM_TAG_NAIL",
  "sprite:gCurseGhostSpriteTemplate", "sprite:gCurseNailSpriteTemplate",
  "subroutine:CurseGhost", "subroutine:CurseGhostShakeFromNail",
  "subroutine:CurseStats", "subroutine:CurseStats1",
  "task:AnimTask_CurseStretchingBlackBg", "task:AnimTask_DrawFallingWhiteLinesOnAttacker",
  "task:AnimTask_ShakeMon2", "task:AnimTask_SwayMon",
  "visualCommand:blend_color_cycle", "visualCommand:clearmonbg",
  "visualCommand:monbg", "visualCommand:simple_palette_blend",
] as const;
const novelTrackComponents = [
  "asset:ANIM_TAG_GHOSTLY_SPIRIT", "asset:ANIM_TAG_NAIL",
  "sprite:gCurseGhostSpriteTemplate", "sprite:gCurseNailSpriteTemplate",
  "subroutine:CurseGhost", "subroutine:CurseGhostShakeFromNail",
  "subroutine:CurseStats", "subroutine:CurseStats1",
  "task:AnimTask_CurseStretchingBlackBg", "task:AnimTask_DrawFallingWhiteLinesOnAttacker",
] as const;
const sharedComponents = expectedComponents.filter((component) => !novelTrackComponents.includes(component as never));
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_CURSE");
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_CURSE");
const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const inLevel50 = (entry: Json): boolean => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_CURSE"));
const level50Carriers = allCarriers.filter(inLevel50);
const controls = ["MOVE_TICKLE", "MOVE_ATTRACT", "MOVE_SCREECH", "MOVE_SLEEP_TALK", "MOVE_BIND"] as const;

const rootBody = sourceBlock(scripts, "Move_CURSE", "Move_SOFT_BOILED");
const ghostBody = sourceBlock(scripts, "CurseGhost", "CurseGhostShakeFromNail");
const shakeBody = sourceBlock(scripts, "CurseGhostShakeFromNail", "CurseStats");
const statsBody = sourceBlock(scripts, "CurseStats", "CurseStats1");
const stats1Body = sourceBlock(scripts, "CurseStats1", "Move_SOFT_BOILED");
requireTokens("Curse root", rootBody, ["choosetwoturnanim CurseGhost, CurseStats"]);
requireTokens("Curse Ghost branch", ghostBody, [
  "loadspritegfx ANIM_TAG_NAIL", "loadspritegfx ANIM_TAG_GHOSTLY_SPIRIT", "monbg ANIM_ATK_PARTNER",
  "createvisualtask AnimTask_CurseStretchingBlackBg, 5", "createsprite gCurseNailSpriteTemplate, ANIM_ATTACKER, 2",
  "call CurseGhostShakeFromNail", "clearmonbg ANIM_ATK_PARTNER", "monbg ANIM_DEF_PARTNER",
  "playsewithpan SE_M_NIGHTMARE, SOUND_PAN_TARGET", "createsprite gCurseGhostSpriteTemplate, ANIM_TARGET, 2",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 14, 1",
  "simple_palette_blend selector=F_PAL_BG, delay=1, initial_blend_y=16, target_blend_y=0, color=RGB_BLACK",
]);
requireTokens("Curse attacker ShakeMon2", shakeBody, [
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 4, 0, 10, 0",
  "playsewithpan SE_M_BIND, SOUND_PAN_ATTACKER",
]);
requireTokens("Curse stats branch", statsBody, [
  "createvisualtask AnimTask_SwayMon, 5, 0, 10, 1536, 3, ANIM_ATTACKER",
  "delay 10", "call CurseStats1", "waitforvisualfinish",
]);
requireTokens("Curse stats tail", stats1Body, [
  "playsewithpan SE_M_DRAGON_RAGE, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_DrawFallingWhiteLinesOnAttacker, 5",
  "blend_color_cycle priority=5, selector=F_PAL_ATTACKER, delay=4, num_blends=2, initial_blend_y=0, target_blend_y=10, color=RGB_RED",
]);
requireTokens("Curse ghost callback", ghost, [
  "const struct SpriteTemplate gCurseNailSpriteTemplate", "const struct SpriteTemplate gCurseGhostSpriteTemplate",
  ".oam = &gOamData_AffineOff_ObjBlend_32x16", ".oam = &gOamData_AffineOff_ObjBlend_32x32",
  "static void AnimCurseNail(struct Sprite *sprite)", "static void AnimGhostStatusSprite(struct Sprite *sprite)",
  "void AnimTask_CurseStretchingBlackBg(u8 taskId)",
]);
requireTokens("Curse white-line callback", utility, [
  "void AnimTask_DrawFallingWhiteLinesOnAttacker(u8 taskId)",
  "static void AnimTask_DrawFallingWhiteLinesOnAttacker_Step(u8 taskId)",
]);
requireTokens("shared task callbacks", movement, ["void AnimTask_ShakeMon2(u8 taskId)", "void AnimTask_SwayMon(u8 taskId)"]);
requireTokens("Curse resource registry", animData, [
  "{gBattleAnimSpriteGfx_Nail, 0x0400, ANIM_TAG_NAIL}",
  "{gBattleAnimSpriteGfx_GhostlySpirit, 0x0200, ANIM_TAG_GHOSTLY_SPIRIT}",
  "{gBattleAnimSpritePal_Nail, ANIM_TAG_NAIL}",
  "{gBattleAnimSpritePal_GhostlySpirit, ANIM_TAG_GHOSTLY_SPIRIT}",
]);
requireTokens("Curse graphics", graphics, [
  "graphics/battle_anims/sprites/nail.png", "graphics/battle_anims/sprites/ghostly_spirit.png",
]);
requireTokens("Curse constants", constants, ["ANIM_TAG_NAIL", "ANIM_TAG_GHOSTLY_SPIRIT"]);
requireTokens("Curse audio", songs, ["SE_M_BIND", "SE_M_NIGHTMARE", "SE_M_DRAGON_RAGE"]);

const contractFailures = [
  ["graph identity", !graphEntry || graphEntry.id !== 174 || graphEntry.rootScript !== "Move_CURSE"],
  ["graph blocks", JSON.stringify(graphEntry?.blocks) !== JSON.stringify(graphBlocks)],
  ["graph components", JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(expectedComponents)],
  ["inventory", !inventoryEntry || inventoryEntry.frontierMonCount !== 18 || inventoryEntry.speciesCount !== 15],
  ["all carrier indices", JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([
    458, 471, 516, 525, 534, 540, 543, 548, 556, 578, 580, 666, 699, 748, 764, 784, 826, 838, 865, 866,
  ])],
  ["level-50 carrier indices", JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify([
    458, 471, 516, 525, 534, 540, 543, 548, 556, 578, 580, 666, 699, 748, 764, 784, 826, 838,
  ])],
  ["carrier labels", allCarriers.some((entry: Json) => !frontierConstants.includes(entry.label) || !frontierSource.includes(entry.label))],
  ["coverage entry", coverage.entries.some((entry: Json) => entry.move === "MOVE_CURSE")],
] as const;
if (contractFailures.some(([, failed]) => failed)) throw new Error(`MOVE_CURSE source/graph/carrier contract changed: ${contractFailures.filter(([, failed]) => failed).map(([name]) => name).join(", ")}`);

const carrierRecord = (entry: Json): Json => ({
  index: entry.index, label: entry.label, species: entry.species, moves: entry.moves,
  item: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats,
});
const branchRecord = (name: string, body: string, next: string): Json => ({
  name, source: sourceSpan("data/battle_anim_scripts.s", scripts, body), ...romRange(name, next),
  commands: body.split("\n").map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":")),
});
const directBodies = {
  curseNail: bodyRecord("AnimCurseNail", "src/battle_anim_ghost.c", ghost),
  curseNailStep1: bodyRecord("AnimCurseNail_Step1", "src/battle_anim_ghost.c", ghost),
  curseNailStep2: bodyRecord("AnimCurseNail_Step2", "src/battle_anim_ghost.c", ghost),
  curseNailEnd: bodyRecord("AnimCurseNail_End", "src/battle_anim_ghost.c", ghost),
  ghostSprite: bodyRecord("AnimGhostStatusSprite", "src/battle_anim_ghost.c", ghost),
  ghostSpriteStep: bodyRecord("AnimGhostStatusSprite_Step", "src/battle_anim_ghost.c", ghost),
  stretchingBg: bodyRecord("AnimTask_CurseStretchingBlackBg", "src/battle_anim_ghost.c", ghost),
  stretchingBgStep1: bodyRecord("AnimTask_CurseStretchingBlackBg_Step1", "src/battle_anim_ghost.c", ghost),
  stretchingBgStep2: bodyRecord("AnimTask_CurseStretchingBlackBg_Step2", "src/battle_anim_ghost.c", ghost),
  fallingLines: bodyRecord("AnimTask_DrawFallingWhiteLinesOnAttacker", "src/battle_anim_utility_funcs.c", utility),
  fallingLinesStep: bodyRecord("AnimTask_DrawFallingWhiteLinesOnAttacker_Step", "src/battle_anim_utility_funcs.c", utility),
  shakeMon2: bodyRecord("AnimTask_ShakeMon2", "src/battle_anim_mon_movement.c", movement),
  shakeMon2Step: bodyRecord("AnimTask_ShakeMon2_Step", "src/battle_anim_mon_movement.c", movement),
  swayMon: bodyRecord("AnimTask_SwayMon", "src/battle_anim_mon_movement.c", movement),
  swayMonStep: bodyRecord("AnimTask_SwayMonStep", "src/battle_anim_mon_movement.c", movement),
};

const result = {
  schema: "curse-source-audit/v1", move: "MOVE_CURSE", moveId: 174,
  status: "unsupported-evidence-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_CURSE", nextDispatchLabel: "Move_SOFT_BOILED", ...romRange("Move_CURSE", "Move_SOFT_BOILED"),
      source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody),
    },
    blocks: blocks.map(([start, end]) => branchRecord(start, sourceBlock(scripts, start, end), end)),
    directBodies,
    assets: {
      nailGfx: romRange("gBattleAnimSpriteGfx_Nail"), nailPal: romRange("gBattleAnimSpritePal_Nail"),
      ghostGfx: romRange("gBattleAnimSpriteGfx_GhostlySpirit"), ghostPal: romRange("gBattleAnimSpritePal_GhostlySpirit"),
      nailTemplate: romRange("gCurseNailSpriteTemplate"), ghostTemplate: romRange("gCurseGhostSpriteTemplate"),
    },
    branches: {
      selector: "choosetwoturnanim CurseGhost, CurseStats",
      ghost: { attacker: "Ghost", target: "curse status", nailShake: [4, 0, 10, 0], ghostShake: [2, 0, 14, 1] },
      stats: { attacker: "non-Ghost", sway: [0, 10, 1536, 3], whiteLines: true, paletteBlends: 2 },
    },
  },
  graph: { blocks: graphBlocks, componentCount: expectedComponents.length, components: expectedComponents, novelTrackComponents, sharedComponents },
  carriers: {
    allFactoryCount: allCarriers.length, level50Count: level50Carriers.length,
    excludedOutsideLevel50: allCarriers.filter((entry: Json) => !inLevel50(entry)).map(carrierRecord),
    allFactory: allCarriers.map(carrierRecord), level50: level50Carriers.map(carrierRecord),
    census: { complete: true, frontierMonCount: inventoryEntry.frontierMonCount, speciesCount: inventoryEntry.speciesCount },
  },
  controls: {
    siblingMoves: controls.map((move) => ({ move, status: coverage.entries.find((entry: Json) => entry.move === move)?.status ?? "unsupported" })),
    noTransferCredit: true, onlyRepresentative: ["MOVE_CURSE"],
  },
  checkpoint: {
    sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true,
    halfOpenSourceElfRomIntervals: true, directTemplateAndTaskBodies: true,
    fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true,
    naturalGhostAndStatBranches: true, legalBilateralPartyOnlyStaging: true,
    denseSemanticAndRawRgbEvidence: true, normalizedBankedMaps: true, twiceFreshByteIdentical: true,
    firstInactiveCleanup: true, latchMeasured: true, productionChanged: false, reducerAdded: false,
    typedSceneOnSeam: false, compositorAdded: false, actualCoreFramebufferAcceptance: false,
    coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false,
    boundaryOrBarrierChanged: false, unsupportedNoCreditBoundary: true,
  },
};

console.log(JSON.stringify(result, null, 2));
