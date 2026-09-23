/** Source, component, and legal-carrier audit for the Ice Ball checkpoint.
 *
 * This file intentionally stops at source/evidence staging.  It does not add
 * an animation reducer, Scene-ON seam, compositor, or coverage credit.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (name: string): string => readFileSync(resolve(root, name), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const ice = read("reference/pokeemerald/src/battle_anim_ice.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const components = [
  "asset:ANIM_TAG_ICE_CHUNK", "asset:ANIM_TAG_ICE_CRYSTALS",
  "sprite:gIceBallChunkSpriteTemplate", "sprite:gIceBallImpactShardSpriteTemplate",
  "subroutine:IceBallContinue", "subroutine:IceBallContinue2", "subroutine:IceBallEnd",
  "subroutine:IceBallImpactShard", "subroutine:IceBallMediun", "subroutine:IceBallSetIceBg",
  "subroutine:IceBallStrong", "subroutine:IceBallStrongest", "subroutine:IceBallUnsetIceBg",
  "subroutine:IceBallWeak", "subroutine:IceBallWeakest",
  "task:AnimTask_GetIceBallCounter", "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
  "visualCommand:fadetobg", "visualCommand:restorebg", "visualCommand:waitbgfadein",
];
const novelTrackComponents = components.filter((id) => id !== "asset:ANIM_TAG_ICE_CRYSTALS");

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing source block ${start}/${end}`);
  return source.slice(from, to);
}

function requireToken(source: string, token: string, label: string): void {
  if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const body = block(scripts, "Move_ICE_BALL", "Move_WEATHER_BALL");
const moveScript = body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter(Boolean);
const expectedRoot = [
  "loadspritegfx ANIM_TAG_ICE_CHUNK", "loadspritegfx ANIM_TAG_ICE_CRYSTALS",
  "createvisualtask AnimTask_GetIceBallCounter, 5, 0", "jumpargeq 0, 4, IceBallSetIceBg",
  "IceBallContinue:", "playsewithpan SE_M_ICY_WIND, SOUND_PAN_ATTACKER",
  "createsprite gIceBallChunkSpriteTemplate, ANIM_TARGET, 2, 15, 0, -12, -16, 30, -40",
  "delay 28", "playsewithpan SE_M_BRICK_BREAK, SOUND_PAN_TARGET",
  "createvisualtask AnimTask_GetIceBallCounter, 5, 0",
];
for (const token of expectedRoot) requireToken(body, token, "Ice Ball script");
for (const [label, count] of [["IceBallWeakest", 5], ["IceBallWeak", 7], ["IceBallMediun", 9], ["IceBallStrong", 10], ["IceBallStrongest", 10]] as const) {
  const branch = block(body, label, label === "IceBallStrongest" ? "IceBallImpactShard" : ["IceBallWeak", "IceBallMediun", "IceBallStrong", "IceBallStrongest"][(["IceBallWeakest", "IceBallWeak", "IceBallMediun", "IceBallStrong"].indexOf(label))]);
  if ((branch.match(/call IceBallImpactShard/g) ?? []).length !== count) throw new Error(`${label} shard count drifted`);
}
for (const token of [
  "fadetobg BG_ICE", "waitbgfadein", "delay 45", "restorebg",
  "createsprite gIceBallImpactShardSpriteTemplate, ANIM_TARGET, 4, -12, -16",
]) requireToken(body, token, "Ice Ball BG/shard script");

for (const token of [
  "static void InitIceBallAnim(struct Sprite *sprite)",
  "static void AnimThrowIceBall(struct Sprite *sprite)",
  "static void InitIceBallParticle(struct Sprite *sprite)",
  "static void AnimIceBallParticle(struct Sprite *sprite)",
  "void AnimTask_GetIceBallCounter(u8 taskId)",
  "StartSpriteAffineAnim(sprite, animNum)",
  "sprite->data[0] = gBattleAnimArgs[4]",
  "InitAnimArcTranslation(sprite)",
  "if (++sprite->data[0] == 21)",
  "Random2() & 0xFF", "Random2() & 0x1FF",
  "gAnimDisableStructPtr->rolloutTimerStartValue - gAnimDisableStructPtr->rolloutTimer - 1",
]) requireToken(ice, token, "Ice Ball sprite/task source");
for (const token of [
  "void AnimTask_ShakeTargetBasedOnMovePowerOrDmg(u8 taskId)",
  "gTasks[taskId].data[10] = gBattleAnimArgs[3]",
  "gTasks[taskId].data[11] = gBattleAnimArgs[4]",
  "gTasks[taskId].data[7] = GetAnimBattlerSpriteId(ANIM_TARGET)",
]) requireToken(movement, token, "Ice Ball target shake source");
for (const token of [
  "{gBattleAnimSpriteGfx_IceChunk, 0x0A00, ANIM_TAG_ICE_CHUNK}",
  "{gBattleAnimSpriteGfx_IceCrystals, 0x01c0, ANIM_TAG_ICE_CRYSTALS}",
  "{gBattleAnimSpritePal_IceChunk, ANIM_TAG_ICE_CHUNK}",
  "{gBattleAnimSpritePal_IceCrystals, ANIM_TAG_ICE_CRYSTALS}",
]) requireToken(animData, token, "Ice Ball resource table");
for (const token of [
  "graphics/battle_anims/sprites/ice_chunk.png",
  "graphics/battle_anims/sprites/ice_crystals.4bpp",
]) requireToken(graphics, token, "Ice Ball graphics source");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const parts = line.trim().split(/\s+/u);
  if (parts.length === 4 && /^[0-9a-f]+$/iu.test(parts[0]!) && /^[0-9a-f]+$/iu.test(parts[1]!)) {
    symbols.set(parts[3]!, { address: Number.parseInt(parts[0]!, 16), size: Number.parseInt(parts[1]!, 16) });
  } else if (parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!)) {
    symbols.set(parts[2]!, { address: Number.parseInt(parts[0]!, 16), size: 0 });
  }
}
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function interval(name: string, next?: string) {
  const symbol = symbols.get(name); if (!symbol) throw new Error(`missing ELF symbol ${name}`);
  const end = next ? symbols.get(next)?.address : symbol.address + symbol.size;
  if (!end || end <= symbol.address) throw new Error(`missing end for ${name}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, end - 0x08000000);
  return { symbol: name, start: `0x${symbol.address.toString(16)}`, endExclusive: `0x${end.toString(16)}`, byteLength: bytes.length, sha256: sha(bytes) };
}

const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_ICE_BALL");
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_ICE_BALL");
const carriers = mons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_ICE_BALL"));
if (!move || move.id !== 301 || move.frontierMonCount !== 2 || move.speciesCount !== 2
  || !graphEntry || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(components)
  || carriers.map((entry: { index: number }) => entry.index).join(",") !== "59,118,196") {
  throw new Error("Ice Ball graph/census drifted");
}
const status = (name: string): string => coverage.entries.find((entry: { move: string }) => entry.move === name)?.status ?? "unsupported";
const result = {
  schema: "ice-ball-source-audit/v1", move: "MOVE_ICE_BALL", moveId: 301,
  status: "unsupported-evidence-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: interval("Move_ICE_BALL", "Move_WEATHER_BALL"),
    text: { byteLength: body.length, sha256: sha(body) },
    script: moveScript,
    blocks: ["Move_ICE_BALL", "IceBallSetIceBg", "IceBallContinue", "IceBallWeakest", "IceBallWeak", "IceBallMediun", "IceBallStrong", "IceBallStrongest", "IceBallImpactShard", "IceBallContinue2", "IceBallUnsetIceBg", "IceBallEnd"],
    callbacks: ["InitIceBallAnim", "AnimThrowIceBall", "InitIceBallParticle", "AnimIceBallParticle", "AnimTask_GetIceBallCounter", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg"].map((name) => interval(name)),
    affineScales: [0xE0, 0x118, 0x150, 0x180, 0x1C0],
  },
  graph: { blockCount: graphEntry.blocks.length, componentCount: components.length, components, novelTrackComponents },
  branches: { counters: [1, 2, 3, 4, 5], shardCounts: [5, 7, 9, 10, 10], shakeDurations: [8, 10, 14, 18, 30], shardLife: 21, arcDuration: 30 },
  carrier: {
    factoryCount: carriers.length, level50Count: carriers.length, inventoryFactoryCount: move.frontierMonCount,
    entries: carriers.map((entry: Record<string, unknown>) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves })),
    preferred: { index: 59, label: "FRONTIER_MON_SPHEAL", species: "SPECIES_SPHEAL" },
    sourceControls: [{ index: 118, label: "FRONTIER_MON_DELIBIRD" }, { index: 196, label: "FRONTIER_MON_SEALEO_1" }],
  },
  controls: {
    exactShared: ["asset:ANIM_TAG_ICE_CRYSTALS", "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "visualCommand:fadetobg", "visualCommand:restorebg", "visualCommand:waitbgfadein"],
    siblingMoves: { MOVE_ROLLOUT: status("MOVE_ROLLOUT"), MOVE_ICE_BEAM: status("MOVE_ICE_BEAM"), MOVE_HAIL: status("MOVE_HAIL"), MOVE_BLIZZARD: status("MOVE_BLIZZARD"), MOVE_SHEER_COLD: status("MOVE_SHEER_COLD") },
    noTransferCredit: true,
  },
  checkpoint: {
    sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true,
    directTemplateAndTaskBodies: true, fullFactoryCarrierCensus: true, legalBilateralPartyOnlyStaging: true,
    denseSemanticAndRawRgbEvidence: true, normalizedBankedMaps: true, twiceFreshByteIdentical: true,
    firstInactiveCleanup: true, latchMeasured: true, productionChanged: false, reducerAdded: false,
    typedSceneOnSeam: false, compositorAdded: false, actualCoreFramebufferAcceptance: false,
    coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false,
    boundaryOrBarrierChanged: false, unsupportedNoCreditBoundary: true,
  },
};
console.log(JSON.stringify(result, null, 2));
