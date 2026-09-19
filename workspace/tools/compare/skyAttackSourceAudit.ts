/** Authoritative source/component/carrier audit for MOVE_SKY_ATTACK. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Sym = { address: number; size: number };
const root = resolve(import.meta.dirname, "../..");
const ref = resolve(root, "reference/pokeemerald");
const readRef = (path: string): string => readFileSync(resolve(ref, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = readRef("data/battle_anim_scripts.s");
const battleScripts = readRef("data/battle_scripts_1.s");
const flying = readRef("src/battle_anim_flying.c");
const utility = readRef("src/battle_anim_utility_funcs.c");
const movement = readRef("src/battle_anim_mon_movement.c");
const ground = readRef("src/battle_anim_ground.c");
const sound = readRef("src/battle_anim_sound_tasks.c");
const dark = readRef("src/battle_anim_dark.c");
const battleAnim = readRef("src/battle_anim.c");
const scriptCommands = readRef("src/battle_script_commands.c");
const controllers = readRef("src/battle_controllers.c");
const playerController = readRef("src/battle_controller_player.c");
const opponentController = readRef("src/battle_controller_opponent.c");
const graphics = readRef("src/graphics.c");
const registry = readRef("src/data/battle_anim.h");
const constants = readRef("include/constants/battle_anim.h");
const songs = readRef("include/constants/songs.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const rom = readFileSync(resolve(ref, "pokeemerald.gba"));

const symbols = new Map<string, Sym[]>();
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
function symbol(name: string): Sym {
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
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`missing source block ${startToken}/${endToken}`);
  return source.slice(start, end);
}
function sourceRecord(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing source body ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
}
function functionBody(source: string, name: string): string {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "gu");
  for (let match = matcher.exec(source); match; match = matcher.exec(source)) {
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
function functionRecord(name: string, path: string, source: string): Json {
  const body = functionBody(source, name);
  return { source: sourceRecord(path, source, body), rom: romRange(name) };
}
function objectBody(source: string, token: string): string {
  const at = source.indexOf(token);
  const end = source.indexOf("};", at) + 2;
  if (at < 0 || end < 2) throw new Error(`missing object ${token}`);
  return source.slice(source.lastIndexOf("\n", at) + 1, end);
}
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const expectedBlocks = ["Move_SKY_ATTACK", "SkyAttackSetUp", "SkyAttackUnleash", "SkyAttackSetUpAgainstOpponent", "SkyAttackSetUpAgainstPartner", "SetSkyBg", "UnsetSkyBg", "SkyAttackEnd", "SetSkyBgContest", "SetSkyBgContinue"];
const expectedComponents = [
  "asset:ANIM_TAG_BIRD", "asset:ANIM_TAG_IMPACT", "sprite:gSkyAttackBirdSpriteTemplate", "subroutine:SetSkyBg", "subroutine:SetSkyBgContest", "subroutine:SetSkyBgContinue", "subroutine:SkyAttackEnd", "subroutine:SkyAttackSetUp", "subroutine:SkyAttackSetUpAgainstOpponent", "subroutine:SkyAttackSetUpAgainstPartner", "subroutine:SkyAttackUnleash", "subroutine:UnsetSkyBg", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_BlendBattleAnimPalExclude", "task:AnimTask_GetTargetIsAttackerPartner", "task:AnimTask_HorizontalShake", "task:AnimTask_ShakeMon2", "task:AnimTask_StartSlidingBg", "task:SoundTask_PlaySE1WithPanning", "task:SoundTask_PlaySE2WithPanning", "visualCommand:attacker_fade_from_invisible", "visualCommand:attacker_fade_to_invisible", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
];
const rootBody = sourceBlock(scripts, "Move_SKY_ATTACK:\n", "Move_FLASH:\n");
const skyBgBody = sourceBlock(scripts, "SetSkyBg:\n", "SetSolarBeamBg:\n");
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_SKY_ATTACK");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_SKY_ATTACK");
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SKY_ATTACK"));
if (JSON.stringify(graphEntry?.blocks) !== JSON.stringify(expectedBlocks) || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Sky Attack generated graph drifted");
if (!move || move.frontierMonCount !== 1 || move.speciesCount !== 1 || carriers.length !== 1 || carriers[0]?.index !== 663 || carriers[0]?.label !== "FRONTIER_MON_FEAROW_4") throw new Error("Sky Attack carrier census drifted");
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_SKY_ATTACK") || coverage.queue.length !== 0) throw new Error("Sky Attack must remain coverage-absent and queue-neutral");
requireTokens("root", rootBody, ["choosetwoturnanim SkyAttackSetUp, SkyAttackUnleash", "jumpretfalse SkyAttackSetUpAgainstOpponent", "goto SkyAttackSetUpAgainstPartner", "call SetSkyBg", "call UnsetSkyBg", "createsprite gSkyAttackBirdSpriteTemplate"]);
requireTokens("battle boundary", battleScripts, ["BattleScript_EffectSkyAttack::", "setbyte sB_ANIM_TURN, 1", "jumpifnotmove MOVE_SKY_ATTACK, BattleScript_HitFromAccCheck", "setmoveeffect MOVE_EFFECT_FLINCH", "orword gHitMarker, HITMARKER_CHARGING"]);
requireTokens("controller boundary", `${scriptCommands}\n${controllers}\n${playerController}\n${opponentController}\n${battleAnim}`, ["BtlController_EmitMoveAnimation", "gAnimMoveTurn = gBattleBufferA[gActiveBattler][3]", "if (gAnimMoveTurn & 1)", "if (!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT))"]);
requireTokens("resources", `${graphics}\n${registry}\n${constants}\n${songs}`, ["gBattleAnimSpriteGfx_Bird", "gBattleAnimSpritePal_Bird", "gBattleAnimSpriteGfx_Impact", "gBattleAnimSpritePal_Impact", "BG_SKY 18", "BG_SKY_CONTESTS 19", "SE_M_SKY_UPPERCUT", "SE_M_STAT_INCREASE", "SE_M_MEGA_KICK2"]);

const taskSources: Record<string, [string, string]> = {
  AnimTask_BlendBattleAnimPal: ["src/battle_anim_utility_funcs.c", utility], AnimTask_BlendBattleAnimPalExclude: ["src/battle_anim_utility_funcs.c", utility],
  AnimTask_GetTargetIsAttackerPartner: ["src/battle_anim_utility_funcs.c", utility], AnimTask_StartSlidingBg: ["src/battle_anim_utility_funcs.c", utility],
  AnimTask_HorizontalShake: ["src/battle_anim_ground.c", ground], AnimTask_ShakeMon2: ["src/battle_anim_mon_movement.c", movement],
  SoundTask_PlaySE1WithPanning: ["src/battle_anim_sound_tasks.c", sound], SoundTask_PlaySE2WithPanning: ["src/battle_anim_sound_tasks.c", sound],
  AnimTask_AttackerFadeToInvisible: ["src/battle_anim_dark.c", dark], AnimTask_AttackerFadeFromInvisible: ["src/battle_anim_dark.c", dark],
};

console.log(JSON.stringify({
  schema: "sky-attack-source-audit/v1", move: "MOVE_SKY_ATTACK", moveId: 143, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: { source: sourceRecord("data/battle_anim_scripts.s", scripts, rootBody), rom: romRange("Move_SKY_ATTACK", "Move_FLASH") },
    sharedSkyBackground: { source: sourceRecord("data/battle_anim_scripts.s", scripts, skyBgBody), rom: romRange("SetSkyBg", "SetSolarBeamBg") },
    commands: { root: commands(rootBody), skyBackground: commands(skyBgBody) },
    directBodies: {
      birdTemplate: { source: sourceRecord("src/battle_anim_flying.c", flying, objectBody(flying, "gSkyAttackBirdSpriteTemplate")), rom: romRange("gSkyAttackBirdSpriteTemplate") },
      birdCallback: functionRecord("AnimSkyAttackBird", "src/battle_anim_flying.c", flying), birdStep: functionRecord("AnimSkyAttackBird_Step", "src/battle_anim_flying.c", flying),
      tasks: Object.fromEntries(Object.entries(taskSources).map(([name, [path, source]]) => [name, functionRecord(name, path, source)])),
      interpreter: functionRecord("Cmd_choosetwoturnanim", "src/battle_anim.c", battleAnim),
      controllerEmit: functionRecord("BtlController_EmitMoveAnimation", "src/battle_controllers.c", controllers),
      playerController: functionRecord("PlayerHandleMoveAnimation", "src/battle_controller_player.c", playerController),
      opponentController: functionRecord("OpponentHandleMoveAnimation", "src/battle_controller_opponent.c", opponentController),
      attackAnimationGate: functionRecord("Cmd_attackanimation", "src/battle_script_commands.c", scriptCommands),
      resources: Object.fromEntries(["gBattleAnimSpriteGfx_Bird", "gBattleAnimSpritePal_Bird", "gBattleAnimSpriteGfx_Impact", "gBattleAnimSpritePal_Impact", "gBattleAnimBgImage_Drill", "gBattleAnimBgPalette_Sky", "gBattleAnimBgTilemap_Drill", "gBattleAnimBgTilemap_DrillContests"].map((name) => [name, romRange(name)])),
    },
  },
  graph: { blocks: graphEntry.blocks, componentCount: graphEntry.componentIds.length, components: graphEntry.componentIds },
  reachability: {
    factorySingles: { setup: ["Move_SKY_ATTACK", "SkyAttackSetUp", "SkyAttackSetUpAgainstOpponent", "SkyAttackEnd"], unleash: ["Move_SKY_ATTACK", "SkyAttackUnleash", "SetSkyBg", "SetSkyBgContinue", "UnsetSkyBg", "SkyAttackEnd"] },
    unreachable: { SkyAttackSetUpAgainstPartner: "target-selected singles cannot target the attacker's absent partner", SetSkyBgContest: "BATTLE_TYPE_FRONTIER is not contest", contestMoveTurnOverride: "contest.c only" },
    noCredit: ["SkyAttackSetUpAgainstPartner", "SetSkyBgContest"],
  },
  battleBoundary: {
    scripts: { effect: romRange("BattleScript_EffectSkyAttack", "BattleScript_EffectConfuseHit"), secondTurn: romRange("BattleScript_TwoTurnMovesSecondTurn", "BattleScriptFirstChargingTurn"), firstTurn: romRange("BattleScriptFirstChargingTurn", "BattleScript_EffectSuperFang") },
    firstTurn: "animTurn starts 0; attackanimation emits byte 3 = 0; choosetwoturnanim selects setup; primary effect sets STATUS2_MULTIPLETURNS; one PP is spent",
    secondTurnSuccess: "script sets sB_ANIM_TURN=1 and no-PP-deduct, clears charging, passes accuracy, adds flinch effect, attackanimation emits byte 3 = 1; controllers copy it to gAnimMoveTurn and odd selects unleash",
    secondTurnFailure: "accuracy miss sets MOVE_RESULT_NO_EFFECT; Cmd_attackanimation takes BattleScript_Pausex20 and does not call BtlController_EmitMoveAnimation, so no unleash presentation root executes",
  },
  behavior: { effect: move.effect, power: move.power, accuracy: move.accuracy, pp: move.pp, secondaryEffectChance: move.secondaryEffectChance, target: move.target, flags: move.flags },
  carrier: { soleFactoryAndLevel50: carriers[0], inventory: { frontierMonCount: move.frontierMonCount, speciesCount: move.speciesCount, examples: move.exampleMons } },
  componentTracks: coverage.componentTracks.filter((track: Json) => track.representatives?.includes("MOVE_SKY_ATTACK")).map((track: Json) => ({ id: track.id, fulfilled: track.fulfilled ?? false })),
  checkpoint: { sourceAudit: true, directElfRomIdentities: true, completeGeneratedGraph: true, completeCarrierCensus: true, legalBilateralPartyOnlyStaging: true, compactSetupAndUnleashReceipts: true, denseWindowCaptured: false, rawRgbRetained: false, latchMeasured: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, productionChanged: false, coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true },
  remainder: "MOVE_SKY_ATTACK remains unsupported. Exact work must retain complete twice-fresh dense bilateral setup and unleash windows, independently measure every move-owned latch and the reachable opponent setup/BG_SKY bodies, then add a source-derived reducer, typed seam, generic compositor, live core dispatch, and zero-residual actual-core acceptance. Partner and contest branches remain unreachable and uncredited in Factory singles.",
}, null, 2));
