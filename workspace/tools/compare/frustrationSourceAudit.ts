/** Authoritative source/classification audit for MOVE_FRUSTRATION. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const factory = read("reference/pokeemerald/src/battle_factory.c");
const monsCode = read("reference/pokeemerald/src/battle_anim_mons.c");
const effects2 = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const battleCommands = read("reference/pokeemerald/src/battle_script_commands.c");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const frontierMons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));

function between(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

function functionBody(source: string, name: string): string {
  const match = new RegExp(`(?:static\\s+)?(?:void|u8|u16|u32|s16|bool8)\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, "u").exec(source);
  if (!match || match.index === undefined) throw new Error(`missing function ${name}`);
  let depth = 0;
  for (let index = match.index; index < source.length; index++) {
    const char = source[index]!;
    if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return source.slice(match.index, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

const nm = execFileSync("arm-none-eabi-nm", ["-S", "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const match = /^([0-9a-fA-F]+)(?:\s+([0-9a-fA-F]+))?\s+\w\s+(\S+)$/u.exec(line);
  if (match) symbols.set(match[3]!, { address: Number.parseInt(match[1]!, 16), size: match[2] ? Number.parseInt(match[2], 16) : 0 });
}
const gba = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
function symbol(name: string): { address: number; size: number } {
  const value = symbols.get(name);
  if (!value) throw new Error(`missing ELF symbol ${name}`);
  return value;
}
function romRange(name: string, endExclusive?: number): { symbol: string; start: string; endExclusive: string; byteLength: number; romSha256: string } {
  const start = symbol(name).address;
  const end = endExclusive ?? start + symbol(name).size;
  const bytes = gba.subarray(start - 0x08000000, end - 0x08000000);
  return { symbol: name, start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`, byteLength: bytes.length, romSha256: sha256(bytes) };
}
function sourceRange(path: string, source: string, body: string): { sourcePath: string; sourceStart: number; sourceEndExclusive: number; sourceByteLength: number; sourceSha256: string } {
  const sourceStart = source.indexOf(body);
  if (sourceStart < 0) throw new Error(`cannot locate ${path} body`);
  return { sourcePath: path, sourceStart, sourceEndExclusive: sourceStart + body.length, sourceByteLength: Buffer.byteLength(body), sourceSha256: sha256(body) };
}
function commands(body: string): string[] {
  return body.split("\n").map((line) => line.replace(/@.*$/u, "").trim())
    .filter((line) => line && !line.endsWith(":"));
}
function commandCounts(body: string): Record<string, number> {
  const rows = commands(body);
  return Object.fromEntries([...new Set(rows.map((row) => row.split(/\s+/u)[0]!))]
    .map((command) => [command, rows.filter((row) => row === command || row.startsWith(`${command} `)).length]));
}
function callbackRecord(name: string, sourcePath: string, source: string): object {
  const body = functionBody(source, name);
  return { ...sourceRange(sourcePath, source, body), rom: romRange(name) };
}

const rootBody = between(scripts, "Move_FRUSTRATION", "Move_SAFEGUARD");
const labels = ["Move_FRUSTRATION", "Frustration_Continue", "Frustration_Strongest", "Frustration_Strong", "Frustration_Medium", "Frustration_Weak", "Move_SAFEGUARD"];
const labelAddresses = Object.fromEntries(labels.map((label) => [label, symbol(label).address]));
const blockBodies = Object.fromEntries(labels.slice(0, -1).map((label, index) => [label, between(scripts, label, labels[index + 1]!)]));
const blockRanges = Object.fromEntries(labels.slice(0, -1).map((label, index) => {
  const end = labelAddresses[labels[index + 1]!]!;
  const body = blockBodies[label]!;
  return [label, { ...romRange(label, end), ...sourceRange("data/battle_anim_scripts.s", scripts, body), commandCount: commands(body).length, commands: commands(body) }];
}));
const expectedComponents = [
  "asset:ANIM_TAG_ANGER", "asset:ANIM_TAG_IMPACT", "sprite:gAngerMarkSpriteTemplate",
  "sprite:gHorizontalLungeSpriteTemplate", "sprite:gWeakFrustrationAngerMarkSpriteTemplate",
  "subroutine:Frustration_Continue", "subroutine:Frustration_Medium", "subroutine:Frustration_Strong",
  "subroutine:Frustration_Strongest", "subroutine:Frustration_Weak", "task:AnimTask_BlendBattleAnimPal",
  "task:AnimTask_GetFrustrationPowerLevel", "task:AnimTask_ShakeMon2",
  "task:AnimTask_StrongFrustrationGrowAndShrink", "task:AnimTask_SwayMon", "visualCommand:blendoff",
  "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:monbg", "visualCommand:setalpha",
];
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_FRUSTRATION");
const level50 = inventory.tiers.level50.monIndices;
const allCarriers = frontierMons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_FRUSTRATION"));
const level50Carriers = allCarriers.filter((entry: { index: number }) => entry.index >= level50.first && entry.index <= level50.last);
const openOnlyCarriers = allCarriers.filter((entry: { index: number }) => entry.index > level50.last);
const outsideCarriers = allCarriers.filter((entry: { index: number }) => entry.index < level50.first);
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_FRUSTRATION");
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "anger-mark-grow-breath");
const statuses = Object.fromEntries(["MOVE_SWAGGER", "MOVE_FRUSTRATION", "MOVE_TORMENT", "MOVE_TAUNT"].map((moveName) => [moveName, coverage.entries.find((entry: { move: string }) => entry.move === moveName)?.status ?? "unsupported"]));
const historicalCoverageEntries = coverage.entries.filter((entry: { move: string }) => entry.move !== "MOVE_PSYCH_UP" && entry.move !== "MOVE_HYPER_VOICE");

const requiredTokens = [
  "#define ARG_RET_ID 7",
  "loadspritegfx ANIM_TAG_IMPACT", "loadspritegfx ANIM_TAG_ANGER", "monbg ANIM_DEF_PARTNER", "setalpha 12, 8",
  "createvisualtask AnimTask_GetFrustrationPowerLevel, 1", "jumpreteq 0, Frustration_Strongest",
  "jumpreteq 1, Frustration_Strong", "jumpreteq 2, Frustration_Medium", "goto Frustration_Weak",
  "friendship = 0;", "SetMonData(&gPlayerParty[i], MON_DATA_FRIENDSHIP, &friendship);",
  "SetMonData(&gEnemyParty[i], MON_DATA_FRIENDSHIP, &friendship);", "if (moveArg == MOVE_RETURN)", "move = MOVE_FRUSTRATION;",
  "if (gAnimFriendship <= 30)", "else if (gAnimFriendship <= 100)", "else if (gAnimFriendship <= 200)",
  "gBattleAnimArgs[ARG_RET_ID] = powerLevel;", "BattleScript_EffectFrustration::", "friendshiptodamagecalculation",
  "gDynamicBasePower = 10 * (MAX_FRIENDSHIP - gBattleMons[gBattlerAttacker].friendship) / 25;",
  "{gBattleAnimSpriteGfx_Anger, 0x0080, ANIM_TAG_ANGER}", "{gBattleAnimSpritePal_Anger, ANIM_TAG_ANGER}",
  "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}", "{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}",
  ".callback = AnimAngerMark", ".callback = AnimWeakFrustrationAngerMark", ".callback = DoHorizontalLunge", ".callback = AnimHitSplatBasic",
];
if (requiredTokens.some((token) => ![constants, rootBody, factory, monsCode, battleScripts, battleCommands, animData, effects2, effects3, movement, normal].some((source) => source.includes(token)))) {
  throw new Error("MOVE_FRUSTRATION source/resource/factory contract changed");
}
if (
  !graphEntry || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_FRUSTRATION", "Frustration_Strongest", "Frustration_Strong", "Frustration_Medium", "Frustration_Weak", "Frustration_Continue"])
  || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)
  || !move || move.id !== 218 || move.effect !== "EFFECT_FRUSTRATION" || move.frontierMonCount !== 10 || move.speciesCount !== 10
  || level50Carriers.length !== 10 || openOnlyCarriers.length !== 0 || outsideCarriers.length !== 0
  || level50Carriers[0]?.index !== 304 || level50Carriers[0]?.label !== "FRONTIER_MON_FURRET_2" || level50Carriers[0]?.species !== "SPECIES_FURRET"
  || level50Carriers[0]?.itemName !== "BATTLE_FRONTIER_ITEM_CHOICE_BAND" || level50Carriers[0]?.nature !== "NATURE_ADAMANT"
  || statuses.MOVE_SWAGGER !== "exact" || statuses.MOVE_FRUSTRATION !== "exact" || statuses.MOVE_TORMENT !== "exact" || statuses.MOVE_TAUNT !== "exact"
  || coverage.entries.filter((entry: { status: string }) => entry.status === "exact").length !== 258
  || coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_PSYCH_UP")?.status !== "exact"
  || track?.fulfilled !== true || JSON.stringify(track?.components) !== JSON.stringify([
    "asset:ANIM_TAG_ANGER", "sprite:gAngerMarkSpriteTemplate", "asset:ANIM_TAG_BREATH", "sprite:gBreathPuffSpriteTemplate", "task:AnimTask_GrowAndShrink",
  ])
) throw new Error("MOVE_FRUSTRATION graph/census/coverage boundary changed");

const rootStart = labelAddresses.Move_FRUSTRATION!;
const rootEnd = labelAddresses.Move_SAFEGUARD!;
const rootRom = gba.subarray(rootStart - 0x08000000, rootEnd - 0x08000000);
const callbacks = {
  AnimTask_GetFrustrationPowerLevel: callbackRecord("AnimTask_GetFrustrationPowerLevel", "src/battle_anim_mons.c", monsCode),
  AnimTask_ShakeMon2: callbackRecord("AnimTask_ShakeMon2", "src/battle_anim_mon_movement.c", movement),
  AnimTask_SwayMon: callbackRecord("AnimTask_SwayMon", "src/battle_anim_mon_movement.c", movement),
  AnimTask_StrongFrustrationGrowAndShrink: callbackRecord("AnimTask_StrongFrustrationGrowAndShrink", "src/battle_anim_effects_3.c", effects3),
  AnimTask_BlendBattleAnimPal: callbackRecord("AnimTask_BlendBattleAnimPal", "src/battle_anim_utility_funcs.c", utility),
  AnimAngerMark: callbackRecord("AnimAngerMark", "src/battle_anim_effects_2.c", effects2),
  AnimWeakFrustrationAngerMark: callbackRecord("AnimWeakFrustrationAngerMark", "src/battle_anim_effects_3.c", effects3),
  DoHorizontalLunge: callbackRecord("DoHorizontalLunge", "src/battle_anim_mon_movement.c", movement),
  AnimHitSplatBasic: callbackRecord("AnimHitSplatBasic", "src/battle_anim_normal.c", normal),
};

console.log(JSON.stringify({
  move: "MOVE_FRUSTRATION", moveId: 218, status: statuses.MOVE_FRUSTRATION, coverageCredit: true,
  pointerOwned: {
    root: { symbol: "Move_FRUSTRATION", start: `0x${rootStart.toString(16)}`, endExclusive: `0x${rootEnd.toString(16)}`, byteLength: rootRom.length, romSha256: sha256(rootRom), ...sourceRange("data/battle_anim_scripts.s", scripts, rootBody) },
    blocks: blockRanges,
  },
  branches: {
    selector: { task: "AnimTask_GetFrustrationPowerLevel", returnArg: "ARG_RET_ID", returnArgIndex: 7, friendshipBands: [
      { friendship: "0..30", result: 0, label: "Frustration_Strongest" }, { friendship: "31..100", result: 1, label: "Frustration_Strong" },
      { friendship: "101..200", result: 2, label: "Frustration_Medium" }, { friendship: "201..255", result: 3, label: "Frustration_Weak" },
    ] },
    strongest: { label: "Frustration_Strongest", shakeTasks: [["ANIM_ATTACKER", 1, 0, 15, 1], ["ANIM_TARGET", 4, 0, 30, 1]], sway: [0, 16, 6144, 8, "ANIM_ATTACKER"], angerMarks: 2, hitSplats: 6, attackerBlend: ["F_PAL_ATTACKER", 3, 0, 9, "RGB_RED", 9, 0] },
    strong: { label: "Frustration_Strong", shakeTasks: [["ANIM_ATTACKER", 1, 0, 15, 1], ["ANIM_TARGET", 4, 0, 6, 1]], angerMarks: 1, strongGrowShrink: true, hitSplats: 3 },
    medium: { label: "Frustration_Medium", angerMarks: 1, horizontalLunges: 2, hitSplats: 2, targetShake: ["ANIM_TARGET", 3, 0, 6, 1] },
    weak: { label: "Frustration_Weak", weakAngerMarks: 1, horizontalLunges: 1, hitSplats: 1, targetShake: ["ANIM_TARGET", 1, 0, 6, 1] },
    cleanup: { label: "Frustration_Continue", commands: commands(blockBodies.Frustration_Continue!), visualFinishBeforeCleanup: true },
  },
  graph: { blocks: graphEntry.blocks, components: graphEntry.componentIds },
  callbacks,
  resources: {
    anger: { tag: "ANIM_TAG_ANGER", gfx: "gBattleAnimSpriteGfx_Anger", tileBytes: 0x80, palette: "gBattleAnimSpritePal_Anger", templates: ["gAngerMarkSpriteTemplate", "gWeakFrustrationAngerMarkSpriteTemplate"] },
    impact: { tag: "ANIM_TAG_IMPACT", gfx: "gBattleAnimSpriteGfx_Impact", tileBytes: 0x200, palette: "gBattleAnimSpritePal_Impact", template: "gBasicHitSplatSpriteTemplate" },
    templates: {
      anger: "AffineNormal ObjNormal 16x16 -> AnimAngerMark -> RunStoredCallbackWhenAffineAnimEnds/DestroySpriteAndMatrix",
      weakAnger: "AffineOff ObjNormal 16x16 -> AnimWeakFrustrationAngerMark -> DestroyAnimSprite",
      horizontalLunge: "dummy OAM -> DoHorizontalLunge -> ReverseHorizontalLungeDirection -> DestroyAnimSprite",
      impact: "AffineNormal ObjBlend 32x32 -> AnimHitSplatBasic -> RunStoredCallbackWhenAffineAnimEnds/DestroyAnimSprite",
    },
    trackControlsNotInFrustration: ["ANIM_TAG_BREATH", "gBreathPuffSpriteTemplate", "AnimTask_GrowAndShrink"],
  },
  audio: {
    strongest: [["SE_M_DRAGON_RAGE", "SOUND_PAN_ATTACKER", 1], ["SE_M_SWAGGER2", "SOUND_PAN_ATTACKER", 2], ["SE_M_COMET_PUNCH", "SOUND_PAN_TARGET", 6]],
    strong: [["SE_M_DRAGON_RAGE", "SOUND_PAN_ATTACKER", 1], ["SE_M_SWAGGER2", "SOUND_PAN_ATTACKER", 1], ["SE_M_COMET_PUNCH", "SOUND_PAN_TARGET", 3]],
    medium: [["SE_M_SWAGGER2", "SOUND_PAN_ATTACKER", 1], ["SE_M_COMET_PUNCH", "SOUND_PAN_TARGET", 2]],
    weak: [["SE_M_COMET_PUNCH", "SOUND_PAN_TARGET", 1]],
  },
  factoryFriendship: {
    construction: "battle_factory.c writes friendship = 0 then MON_DATA_FRIENDSHIP for player and enemy Factory parties before battle.",
    returnReplacement: "SetMonMoveAvoidReturn rewrites MOVE_RETURN to MOVE_FRUSTRATION.",
    animationResult: "Factory-legal Frustration carriers enter Frustration_Strongest (result 0) only; the other three source branches remain pointer-owned and pinned but need non-Factory evidence if ever accepted.",
  },
  carrier: {
    lowestLevel50Set: level50Carriers[0]!.index, frontierMon: level50Carriers[0]!.label, species: level50Carriers[0]!.species,
    itemTableId: level50Carriers[0]!.itemTableId, itemName: level50Carriers[0]!.itemName, nature: level50Carriers[0]!.nature,
    allLevel50Sets: level50Carriers.map((entry: { index: number }) => entry.index), allInventorySets: allCarriers.map((entry: { index: number }) => entry.index),
    excludedOpenOnly: openOnlyCarriers.map((entry: { index: number }) => entry.index), excludedOutsideFactory: outsideCarriers.map((entry: { index: number }) => entry.index),
  },
  coverage: { level50Exact: historicalCoverageEntries.filter((entry: { status: string }) => entry.status === "exact").length, level50Unsupported: 276 - historicalCoverageEntries.filter((entry: { status: string }) => entry.status === "exact").length, trackFulfilled: track.fulfilled === true, siblingStatuses: statuses },
  siblingBoundary: "MOVE_SWAGGER, MOVE_TORMENT, and MOVE_TAUNT remain independently exact controls; Frustration's later production closure grants them no new acceptance.",
  latchMeasurement: "the later bilateral dense receipt owns the Frustration-specific ANIMATION_LATCHES row; this source audit remains its immutable source/classification foundation.",
}, null, 2));
