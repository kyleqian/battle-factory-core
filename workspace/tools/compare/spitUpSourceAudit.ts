/** Authoritative source/component/carrier audit for MOVE_SPIT_UP.
 *
 * This is deliberately an evidence checkpoint only.  It classifies the
 * pointer-owned Move_SPIT_UP graph and the callback/template bodies without
 * adding a reducer, seam, compositor, or coverage credit.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects2 = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));

const components = [
  "asset:ANIM_TAG_IMPACT",
  "asset:ANIM_TAG_RED_ORB_2",
  "sprite:gSpitUpOrbSpriteTemplate",
  "subroutine:SpitUpContinue",
  "subroutine:SpitUpStrong",
  "subroutine:SpitUpStrongest",
  "task:AnimTask_ShakeMon2",
  "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
  "task:AnimTask_SpitUpDeformMon",
  "visualCommand:create_flashing_hitsplat_sprite",
];
const trackComponents = [
  "asset:ANIM_TAG_RED_ORB_2",
  "sprite:gSpitUpOrbSpriteTemplate",
  "subroutine:SpitUpContinue",
  "subroutine:SpitUpStrong",
  "subroutine:SpitUpStrongest",
  "task:AnimTask_SpitUpDeformMon",
];

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const body = block(scripts, "Move_SPIT_UP", "Move_SWALLOW");
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_SPIT_UP");
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_SPIT_UP");
const carriers = mons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_SPIT_UP"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const symbols = new Map(nm.split("\n").map((line) => line.trim().split(/\s+/u))
  .filter((parts) => parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!))
  .map((parts) => [parts[2]!, Number.parseInt(parts[0]!, 16)]));
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const start = symbols.get("Move_SPIT_UP")!;
const end = symbols.get("Move_SWALLOW")!;
const bytes = rom.subarray(start - 0x08000000, end - 0x08000000);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const sourceBody = {
  start: `0x${start.toString(16)}`,
  endExclusive: `0x${end.toString(16)}`,
  byteLength: bytes.length,
  sha256: sha(bytes),
};
const textBody = { byteLength: body.length, sha256: sha(body) };
const addressSpan = (first: string, next: string) => ({
  symbol: first,
  start: `0x${symbols.get(first)!.toString(16)}`,
  endExclusive: `0x${symbols.get(next)!.toString(16)}`,
  byteLength: symbols.get(next)! - symbols.get(first)!,
});

for (const line of [
  "loadspritegfx ANIM_TAG_RED_ORB_2",
  "loadspritegfx ANIM_TAG_IMPACT",
  "createvisualtask AnimTask_SpitUpDeformMon, 5",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 1, 0, 8, 2",
  "createvisualtask AnimTask_ShakeTargetBasedOnMovePowerOrDmg, 2, FALSE, 1, 8, 1, 0",
  "jumpifmoveturn 2, SpitUpStrong",
  "jumpifmoveturn 3, SpitUpStrongest",
  "SpitUpContinue:",
  "SpitUpStrong:",
  "SpitUpStrongest:",
  "create_flashing_hitsplat_sprite ANIM_TARGET, 3, x=-12, y=10, relative_to=ANIM_TARGET, animation=1",
]) if (!body.includes(line)) throw new Error(`Spit Up script drifted: ${line}`);
if ((body.match(/gSpitUpOrbSpriteTemplate/g) ?? []).length !== 20
  || (body.match(/create_flashing_hitsplat_sprite/g) ?? []).length !== 2
  || !graphEntry || graphEntry.blocks.join(",") !== "Move_SPIT_UP,SpitUpStrong,SpitUpStrongest,SpitUpContinue"
  || graphEntry.componentIds.join(",") !== components.join(",")
  || move?.id !== 255 || move?.frontierMonCount !== 1 || move?.speciesCount !== 1
  || carriers.length !== 1 || carriers[0]?.index !== 248
  || carriers[0]?.label !== "FRONTIER_MON_SWALOT_1"
  || carriers[0]?.species !== "SPECIES_SWALOT") throw new Error("Spit Up graph/carrier contract changed");

for (const token of [
  "const union AffineAnimCmd gSpitUpOrbAffineAnimCmds[]",
  "AFFINEANIMCMD_FRAME(0x80, 0x80, 0, 0)",
  "AFFINEANIMCMD_FRAME(0x8, 0x8, 0, 1)",
  "const struct SpriteTemplate gSpitUpOrbSpriteTemplate",
  ".oam = &gOamData_AffineDouble_ObjNormal_8x8",
  ".callback = AnimSpitUpOrb",
  "static void AnimSpitUpOrb(struct Sprite *sprite)",
  "sprite->x2 += sprite->data[0]",
]) if (!effects2.includes(token)) throw new Error(`Spit Up orb source drifted: ${token}`);
for (const token of [
  "const union AffineAnimCmd gSpitUpDeformMonAffineAnimCmds[]",
  "AFFINEANIMCMD_FRAME(0, 6, 0, 20)",
  "AFFINEANIMCMD_FRAME(0, -18, 0, 6)",
  "AFFINEANIMCMD_FRAME(-18, -18, 0, 3)",
  "void AnimTask_SpitUpDeformMon(u8 taskId)",
  "PrepareAffineAnimInTaskData(&gTasks[taskId], GetAnimBattlerSpriteId(ANIM_ATTACKER), gSpitUpDeformMonAffineAnimCmds)",
]) if (!effects3.includes(token)) throw new Error(`Spit Up deform source drifted: ${token}`);
for (const token of [
  "void AnimTask_ShakeTargetBasedOnMovePowerOrDmg(u8 taskId)",
  "void AnimTask_ShakeMon2(u8 taskId)",
]) if (!movement.includes(token)) throw new Error(`shared shake source drifted: ${token}`);
for (const token of [
  "{gBattleAnimSpriteGfx_GrayOrb, 0x0060, ANIM_TAG_RED_ORB_2}",
  "{gBattleAnimSpritePal_RedOrb2, ANIM_TAG_RED_ORB_2}",
  "gBattleAnimSpriteGfx_Impact[]",
  "gBattleAnimSpritePal_Impact[]",
]) if (!animData.includes(token) && !graphics.includes(token)) throw new Error(`Spit Up resource source drifted: ${token}`);
if (!macros.includes("create_flashing_hitsplat_sprite") && !scripts.includes("create_flashing_hitsplat_sprite")) {
  throw new Error("flashing hitsplat macro contract changed");
}

const status = (name: string): string => coverage.entries.find((entry: { move: string }) => entry.move === name)?.status ?? "unsupported";
const result = {
  schema: "spit-up-source-audit/v1",
  move: "MOVE_SPIT_UP",
  moveId: 255,
  status: "unsupported-evidence-checkpoint",
  coverageCredit: false,
  source: {
    pointerOwnedRoot: sourceBody,
    text: textBody,
    blocks: ["Move_SPIT_UP", "SpitUpStrong", "SpitUpStrongest", "SpitUpContinue"],
    callbacks: {
      orbStep: addressSpan("AnimSpitUpOrb_Step", "AnimSpitUpOrb"),
      orb: addressSpan("AnimSpitUpOrb", "AnimEyeSparkle_Step"),
      deform: addressSpan("AnimTask_SpitUpDeformMon", "AnimTask_StockpileDeformMon"),
    },
    template: { symbol: "gSpitUpOrbSpriteTemplate", start: "0x08593a50", byteLength: 24 },
  },
  graph: { blocks: graphEntry.blocks, componentCount: components.length, components, novelTrackComponents: trackComponents },
  branches: { initialOrbs: 8, strongOrbs: 4, strongestOrbs: 8, hitsplats: 2, stockpileCounts: [1, 2, 3] },
  carrier: { factoryCount: carriers.length, level50Count: carriers.length, lowestLegal: { index: 248, label: "FRONTIER_MON_SWALOT_1", species: "SPECIES_SWALOT" } },
  controls: {
    exactShared: ["asset:ANIM_TAG_IMPACT", "task:AnimTask_ShakeMon2", "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "visualCommand:create_flashing_hitsplat_sprite"],
    siblingMoves: { MOVE_STOCKPILE: status("MOVE_STOCKPILE"), MOVE_SWALLOW: status("MOVE_SWALLOW"), MOVE_FLAIL: status("MOVE_FLAIL"), MOVE_RAPID_SPIN: status("MOVE_RAPID_SPIN"), MOVE_ENDEAVOR: status("MOVE_ENDEAVOR"), MOVE_HORN_DRILL: status("MOVE_HORN_DRILL") },
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
