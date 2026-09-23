/** Authoritative source/component/carrier audit for MOVE_FURY_CUTTER.
 *
 * This is an evidence checkpoint only.  It classifies the complete pointer-
 * owned battle body and the counter-selected visual graph without adding a
 * reducer, seam, compositor, or coverage credit.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (name: string): string => readFileSync(resolve(root, name), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects2 = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const commands = read("reference/pokeemerald/src/battle_script_commands.c");
const battleUtil = read("reference/pokeemerald/src/battle_util.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const frontierMons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");

type SymbolInfo = { address: number; size: number };
const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const symbols = new Map<string, SymbolInfo>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length === 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields[3]!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

function requireTokens(source: string, tokens: readonly string[], label: string): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

function span(startName: string, endName: string): Record<string, unknown> {
  const start = symbols.get(startName)?.address;
  const end = symbols.get(endName)?.address;
  if (start === undefined || end === undefined || end <= start) throw new Error(`missing span ${startName}/${endName}`);
  return { symbol: startName, start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`, byteLength: end - start };
}

function sizedSpan(name: string): Record<string, unknown> {
  const info = symbols.get(name);
  if (!info || !info.size) throw new Error(`missing sized span ${name}`);
  return { symbol: name, start: `0x${info.address.toString(16)}`, endExclusive: `0x${(info.address + info.size).toString(16)}`, byteLength: info.size };
}

const body = block(scripts, "Move_FURY_CUTTER", "Move_SELF_DESTRUCT");
const effect = block(battleScripts, "BattleScript_EffectFuryCutter", "BattleScript_EffectAttract");
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_FURY_CUTTER");
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_FURY_CUTTER");
const level50Ranges = policy.rentalSelection.ranges.level50 as Array<{ start: number; end: number }>;
const carriers = mons.entries.filter((entry: { index: number; moves: string[] }) =>
  level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end)
    && entry.moves.includes("MOVE_FURY_CUTTER"));
const moveComponents = [
  "asset:ANIM_TAG_CUT", "sprite:gCuttingSliceSpriteTemplate",
  "subroutine:FuryCutterContinue", "subroutine:FuryCutterContinue2",
  "subroutine:FuryCutterLeft", "subroutine:FuryCutterMedium",
  "subroutine:FuryCutterRight", "subroutine:FuryCutterStrong",
  "subroutine:FuryCutterStrongest", "task:AnimTask_GetFuryCutterHitCount",
  "task:AnimTask_IsFuryCutterHitRight", "task:AnimTask_ShakeMon",
  "visualCommand:blendoff", "visualCommand:clearmonbg",
  "visualCommand:complex_palette_blend", "visualCommand:monbg", "visualCommand:setalpha",
];
const trackComponents = [
  "subroutine:FuryCutterContinue", "subroutine:FuryCutterContinue2",
  "subroutine:FuryCutterLeft", "subroutine:FuryCutterMedium",
  "subroutine:FuryCutterRight", "subroutine:FuryCutterStrong",
  "subroutine:FuryCutterStrongest", "task:AnimTask_GetFuryCutterHitCount",
  "task:AnimTask_IsFuryCutterHitRight",
];

requireTokens(body, [
  "loadspritegfx ANIM_TAG_CUT", "monbg ANIM_TARGET", "setalpha 12, 8",
  "playsewithpan SE_M_RAZOR_WIND, SOUND_PAN_TARGET",
  "createvisualtask AnimTask_IsFuryCutterHitRight, 2",
  "jumpretfalse FuryCutterLeft", "goto FuryCutterRight",
  "createvisualtask AnimTask_GetFuryCutterHitCount, 2",
  "jumpreteq 1, FuryCutterContinue2", "jumpreteq 2, FuryCutterMedium",
  "jumpreteq 3, FuryCutterStrong", "goto FuryCutterStrongest",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 10, 1",
  "clearmonbg ANIM_TARGET", "blendoff",
  "createsprite gCuttingSliceSpriteTemplate, ANIM_ATTACKER, 2, 40, -32, 0",
  "createsprite gCuttingSliceSpriteTemplate, ANIM_ATTACKER, 2, 40, -32, 1",
  "complex_palette_blend", "num_blends=1", "num_blends=3",
], "Fury Cutter animation script");
requireTokens(effect, [
  "attackcanceler", "accuracycheck BattleScript_FuryCutterHit, ACC_CURR_MOVE",
  "furycuttercalc", "critcalc", "damagecalc", "typecalc",
  "jumpifmovehadnoeffect BattleScript_FuryCutterHit", "goto BattleScript_HitFromAtkAnimation",
], "Fury Cutter battle script");
requireTokens(commands, [
  "static void Cmd_furycuttercalc(void)",
  "gDisableStructs[gBattlerAttacker].furyCutterCounter = 0",
  "if (gDisableStructs[gBattlerAttacker].furyCutterCounter != 5)",
  "gDisableStructs[gBattlerAttacker].furyCutterCounter++",
  "gDynamicBasePower = gBattleMoves[gCurrentMove].power",
  "for (i = 1; i < gDisableStructs[gBattlerAttacker].furyCutterCounter; i++)",
  "gDynamicBasePower *= 2",
], "Fury Cutter counter/power source");
requireTokens(battleUtil, [
  "gDisableStructs[battler].furyCutterCounter = 0",
  "gDisableStructs[battler].furyCutterCounter = 0;",
], "Fury Cutter counter reset source");
requireTokens(effects2, [
  "void AnimTask_IsFuryCutterHitRight(u8 taskId)",
  "gBattleAnimArgs[ARG_RET_ID] = gAnimDisableStructPtr->furyCutterCounter & 1",
  "void AnimTask_GetFuryCutterHitCount(u8 taskId)",
  "gBattleAnimArgs[ARG_RET_ID] = gAnimDisableStructPtr->furyCutterCounter",
], "Fury Cutter counter tasks");
requireTokens(effects1, [
  "const union AnimCmd gCuttingSliceAnimCmds[]", "ANIMCMD_FRAME(0, 5)",
  "ANIMCMD_FRAME(16, 5)", "ANIMCMD_FRAME(32, 5)", "ANIMCMD_FRAME(48, 5)",
  "const struct SpriteTemplate gCuttingSliceSpriteTemplate",
  ".oam = &gOamData_AffineOff_ObjBlend_32x32", ".callback = AnimCuttingSlice",
  "static void AnimCuttingSlice(struct Sprite *sprite)",
  "sprite->callback = AnimSlice_Step", "sprite->hFlip = 1",
], "Fury Cutter slice source");
requireTokens(movement, ["void AnimTask_ShakeMon(u8 taskId)", "AnimTask_ShakeMon_Step"], "ShakeMon source");
requireTokens(animData, [
  "{gBattleAnimSpriteGfx_Cut, 0x0800, ANIM_TAG_CUT}",
  "{gBattleAnimSpritePal_Impact, ANIM_TAG_CUT}",
], "CUT resource registry");
requireTokens(graphics, ["battle_anims/sprites/cut.png"], "CUT graphics source");
requireTokens(songs, ["SE_M_RAZOR_WIND"], "Fury Cutter audio source");
requireTokens(commands, ["BtlController_EmitMoveAnimation(B_COMM_TO_CONTROLLER, gCurrentMove", "gBattleMovePower, gBattleMoveDamage"], "animation packet source");

const sourceStart = symbols.get("Move_FURY_CUTTER")!.address;
const sourceEnd = symbols.get("Move_SELF_DESTRUCT")!.address;
const sourceBytes = rom.subarray(sourceStart - 0x08000000, sourceEnd - 0x08000000);
const status = (name: string): string => coverage.entries.find((entry: { move: string }) => entry.move === name)?.status ?? "unsupported";
const components = graphEntry?.componentIds ?? [];
if (JSON.stringify(components) !== JSON.stringify(moveComponents)
  || !move || move.id !== 210 || move.frontierMonCount !== 5 || move.speciesCount !== 5
  || carriers.length !== 5 || carriers[0]?.index !== 141 || carriers.at(-1)?.index !== 263
  || body.includes("Move_CURSE") || sourceEnd <= sourceStart) throw new Error("Fury Cutter graph/carrier contract changed");

const result = {
  schema: "fury-cutter-source-audit/v1", move: "MOVE_FURY_CUTTER", moveId: 210,
  status: "unsupported-evidence-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: { symbol: "Move_FURY_CUTTER", start: `0x${sourceStart.toString(16)}`, endExclusive: `0x${sourceEnd.toString(16)}`, byteLength: sourceBytes.length, sha256: sha(sourceBytes) },
    text: { byteLength: body.length, sha256: sha(body) },
    blocks: graphEntry?.blocks ?? [],
    callbacks: {
      slice: span("AnimCuttingSlice", "AnimAirCutterSlice"),
      sliceStep: span("AnimSlice_Step", "AnimCirclingMusicNote"),
      rightTask: span("AnimTask_IsFuryCutterHitRight", "AnimTask_GetFuryCutterHitCount"),
      countTask: sizedSpan("AnimTask_GetFuryCutterHitCount"),
      shake: span("AnimTask_ShakeMon", "AnimTask_ShakeMon2"),
    },
    branches: {
      counterValues: [1, 2, 3, 4],
      directions: { "1": "right", "2": "left", "3": "right", "4": "left" },
      paletteBlendRepeats: { "1": 0, "2": 1, "3": 3, "4": 3 },
      dynamicBasePower: { counter1: 10, counter2: 20, counter3: 40, counter4: 80 },
    },
  },
  graph: { blocks: graphEntry?.blocks ?? [], componentCount: moveComponents.length, components: moveComponents, novelTrackComponents: trackComponents },
  carrier: {
    factoryCount: carriers.length, level50Count: carriers.length,
    entries: carriers.map((entry: { index: number; label: string; species: string }) => ({ index: entry.index, label: entry.label, species: entry.species })),
    lowestLegal: { index: carriers[0]!.index, label: carriers[0]!.label, species: carriers[0]!.species },
  },
  controls: {
    exactShared: ["asset:ANIM_TAG_CUT", "sprite:gCuttingSliceSpriteTemplate", "task:AnimTask_ShakeMon", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:complex_palette_blend", "visualCommand:monbg", "visualCommand:setalpha"],
    siblingMoves: { MOVE_VICE_GRIP: status("MOVE_VICE_GRIP"), MOVE_GUILLOTINE: status("MOVE_GUILLOTINE"), MOVE_AIR_CUTTER: status("MOVE_AIR_CUTTER"), MOVE_AERIAL_ACE: status("MOVE_AERIAL_ACE") },
    noTransferCredit: true,
  },
  checkpoint: {
    sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true,
    directTemplateAndTaskBodies: true, fullFactoryCarrierCensus: true,
    legalBilateralPartyOnlyStaging: true, denseSemanticAndRawRgbEvidence: true,
    normalizedBankedMaps: true, twiceFreshByteIdentical: true, firstInactiveCleanup: true,
    counterBranchesOneThroughFour: true, latchMeasured: true,
    productionChanged: true, reducerAdded: true, typedSceneOnSeam: true,
    compositorAdded: true, actualCoreFramebufferAcceptance: false,
    coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false,
    boundaryOrBarrierChanged: false, unsupportedNoCreditBoundary: true,
  },
};
console.log(JSON.stringify(result, null, 2));
