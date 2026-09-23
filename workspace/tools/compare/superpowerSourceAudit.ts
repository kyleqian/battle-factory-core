/** Authoritative source/component/carrier audit for MOVE_SUPERPOWER staging. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type SymbolEntry = { address: number; size: number };
const root = resolve(import.meta.dirname, "../..");
const ref = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(ref, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = read("data/battle_anim_scripts.s");
const fight = read("src/battle_anim_fight.c");
const movement = read("src/battle_anim_mon_movement.c");
const sound = read("src/battle_anim_sound_tasks.c");
const normal = read("src/battle_anim_normal.c");
const battleAnim = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const rom = readFileSync(resolve(ref, "pokeemerald.gba"));

const symbols = new Map<string, SymbolEntry>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(ref, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) symbols.set(fields.at(-1)!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
}
const symbol = (name: string): SymbolEntry => { const value = symbols.get(name); if (!value) throw new Error(`missing ELF symbol ${name}`); return value; };
const romRange = (name: string, endName?: string): Json => { const start = symbol(name).address; const end = endName ? symbol(endName).address : start + symbol(name).size; return { symbol: name, start: hex(start), endExclusive: hex(end), byteLength: end - start, romSha256: sha(rom.subarray(start - 0x08000000, end - 0x08000000)) }; };
const sourceBlock = (source: string, startToken: string, endToken: string): string => { const start = source.indexOf(startToken); const end = source.indexOf(endToken, start + startToken.length); if (start < 0 || end < 0) throw new Error(`missing source block ${startToken}/${endToken}`); return source.slice(start, end); };
const functionBody = (source: string, name: string): string => {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "gu");
  for (let match = matcher.exec(source); match; match = matcher.exec(source)) {
    const open = source.indexOf("{", match.index), semi = source.indexOf(";", match.index); if (open < 0 || (semi >= 0 && semi < open)) continue;
    let depth = 0; for (let index = open; index < source.length; index += 1) { if (source[index] === "{") depth += 1; else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1); }
  }
  throw new Error(`missing function ${name}`);
};
const sourceRecord = (path: string, source: string, body: string): Json => { const start = source.indexOf(body); return { sourcePath: path, sourceStart: start, sourceEndExclusive: start + body.length, sourceByteLength: Buffer.byteLength(body), sourceSha256: sha(body) }; };
const fn = (name: string, path: string, source: string): Json => ({ source: sourceRecord(path, source, functionBody(source, name)), rom: romRange(name) });
const requireTokens = (label: string, source: string, tokens: readonly string[]): void => { for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`); };

const rootBody = sourceBlock(scripts, "Move_SUPERPOWER:\n", "Move_RECYCLE:\n");
const commands = rootBody.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line && !line.endsWith(":"));
const expectedComponents = [
  "asset:ANIM_TAG_CIRCLE_OF_LIGHT", "asset:ANIM_TAG_FLAT_ROCK", "asset:ANIM_TAG_METEOR",
  "sprite:gSuperpowerFireballSpriteTemplate", "sprite:gSuperpowerOrbSpriteTemplate", "sprite:gSuperpowerRockSpriteTemplate",
  "task:AnimTask_ShakeMon2", "task:SoundTask_PlaySE2WithPanning", "visualCommand:blendoff", "visualCommand:clearmonbg",
  "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:shake_mon_or_platform", "visualCommand:splitbgprio",
];
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_SUPERPOWER");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_SUPERPOWER");
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SUPERPOWER"));
if (!graphEntry || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("generated Superpower graph drifted");
if (!move || move.id !== 276 || move.frontierMonCount !== 3 || JSON.stringify(move.exampleMons) !== JSON.stringify(["FRONTIER_MON_NIDOQUEEN_4", "FRONTIER_MON_REGIROCK_1", "FRONTIER_MON_REGISTEEL_6"])) throw new Error("Superpower inventory drifted");
if (JSON.stringify(carriers.map((entry: Json) => entry.index)) !== JSON.stringify([701, 762, 841])) throw new Error("Superpower Factory carrier census drifted");

const commandChecks = [
  "loadspritegfx ANIM_TAG_CIRCLE_OF_LIGHT", "loadspritegfx ANIM_TAG_METEOR", "loadspritegfx ANIM_TAG_FLAT_ROCK", "monbg ANIM_ATK_PARTNER", "splitbgprio ANIM_ATTACKER", "setalpha 12, 8",
  "createsprite gSuperpowerOrbSpriteTemplate, ANIM_TARGET, 2, ANIM_ATTACKER", "playsewithpan SE_M_MEGA_KICK, SOUND_PAN_ATTACKER", "delay 20",
  "shake_mon_or_platform velocity=4, shake_timer=1, shake_duration=180, type=SHAKE_BG_Y", "createvisualtask SoundTask_PlaySE2WithPanning, 5, SE_M_EARTHQUAKE, 0", "delay 40",
  "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 200, 96, 1, 120", "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 20, 248, 4, 112",
  "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 130, 160, 2, 104", "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 160, 192, 0, 96", "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 60, 288, 3, 88",
  "delay 74", "createsprite gSuperpowerFireballSpriteTemplate, ANIM_TARGET, 3, ANIM_ATTACKER", "playsewithpan SE_M_SWAGGER, SOUND_PAN_ATTACKER", "delay 16",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 8, 0, 16, 1", "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET", "waitforvisualfinish", "clearmonbg ANIM_ATK_PARTNER", "blendoff", "delay 1", "end",
];
for (const token of commandChecks) if (!rootBody.includes(token)) throw new Error(`Superpower command drifted: ${token}`);

const orbTemplate = sourceBlock(fight, "const struct SpriteTemplate gSuperpowerOrbSpriteTemplate", "const struct SpriteTemplate gSuperpowerRockSpriteTemplate");
const rockTemplate = sourceBlock(fight, "const struct SpriteTemplate gSuperpowerRockSpriteTemplate", "const struct SpriteTemplate gSuperpowerFireballSpriteTemplate");
const fireballTemplate = sourceBlock(fight, "const struct SpriteTemplate gSuperpowerFireballSpriteTemplate", "const struct SpriteTemplate gArmThrustHandSpriteTemplate");
const affineOrb = sourceBlock(fight, "static const union AffineAnimCmd sAffineAnim_SuperpowerOrb[]", "static const union AffineAnimCmd *const sAffineAnims_SuperpowerOrb[]");
requireTokens("orb template", orbTemplate, ["ANIM_TAG_CIRCLE_OF_LIGHT", "gOamData_AffineDouble_ObjBlend_64x64", "sAffineAnims_SuperpowerOrb", "AnimSuperpowerOrb"]);
requireTokens("rock template", rockTemplate, ["ANIM_TAG_FLAT_ROCK", "gOamData_AffineOff_ObjNormal_16x16", "AnimSuperpowerRock"]);
requireTokens("fireball template", fireballTemplate, ["ANIM_TAG_METEOR", "gOamData_AffineOff_ObjNormal_64x64", "AnimSuperpowerFireball"]);
requireTokens("orb affine", affineOrb, ["0x20, 0x20, 0, 0", "0x4, 0x4, 0, 64", "0xFFFA, 0xFFFA, 0, 8", "0x6, 0x6, 0, 8", "AFFINEANIMCMD_JUMP(2)"]);
requireTokens("orb callback", functionBody(fight, "AnimSuperpowerOrb") + functionBody(fight, "AnimSuperpowerOrb_Step"), ["GetBattlerSpriteCoord", "GetBattlerSpriteBGPriority", "sprite->data[7]", "SetGpuReg(REG_OFFSET_BLDCNT, 0)", "InitAnimLinearTranslation", "DestroySpriteAndMatrix"]);
requireTokens("rock callback", functionBody(fight, "AnimSuperpowerRock") + functionBody(fight, "AnimSuperpowerRock_Step1") + functionBody(fight, "AnimSuperpowerRock_Step2"), ["sprite->y = 120", "gBattleAnimArgs[2] * 4", "StorePointerInVars", "sprite->y < -8", "sprite->data[2] += sprite->data[0]", "edgeX > 256", "DestroyAnimSprite"]);
requireTokens("fireball callback", functionBody(fight, "AnimSuperpowerFireball"), ["ST_OAM_HFLIP", "ST_OAM_VFLIP", "InitAnimLinearTranslation", "StoreSpriteCallbackInData6", "DestroyAnimSprite"]);
requireTokens("ShakeMon2", functionBody(movement, "AnimTask_ShakeMon2") + functionBody(movement, "AnimTask_ShakeMon2_Step"), ["gBattleAnimArgs[1]", "gBattleAnimArgs[2]", "gBattleAnimArgs[3]", "gBattleAnimArgs[4]", "gSprites[gTasks[taskId].data[0]].x2", "DestroyAnimVisualTask"]);
requireTokens("sound task", functionBody(sound, "SoundTask_PlaySE2WithPanning"), ["gBattleAnimArgs[0]", "gBattleAnimArgs[1]", "PlaySE2WithPanning", "DestroyAnimVisualTask"]);
requireTokens("BG-Y shake", sourceBlock(normal, "static void AnimShakeMonOrBattlePlatforms(struct Sprite *sprite)", "static void AnimShakeMonOrBattlePlatforms_Step(struct Sprite *sprite"), ["SHAKE_BG_Y", "gBattle_BG3_Y", "sprite->sTimer = cmd->shakeDuration", "sprite->sShakeTimer = cmd->shakeTimer"]);
requireTokens("resources", graphics + registry + constants, ["gBattleAnimSpriteGfx_CircleOfLight", "gBattleAnimSpriteGfx_Meteor", "gBattleAnimSpriteGfx_FlatRock", "gBattleAnimSpritePal_ElectricOrbs, ANIM_TAG_CIRCLE_OF_LIGHT", "gBattleAnimSpritePal_Meteor, ANIM_TAG_METEOR", "gBattleAnimSpritePal_FlatRock, ANIM_TAG_FLAT_ROCK", "0x0800, ANIM_TAG_CIRCLE_OF_LIGHT", "0x0800, ANIM_TAG_METEOR", "0x0280, ANIM_TAG_FLAT_ROCK"]);
requireTokens("visual commands", battleAnim, ["static void Cmd_monbg", "static void Cmd_clearmonbg", "static void Cmd_setalpha", "static void Cmd_blendoff", "static void Cmd_splitbgprio"]);
requireTokens("audio", songs, ["SE_M_MEGA_KICK", "SE_M_EARTHQUAKE", "SE_M_SWAGGER", "SE_M_MEGA_KICK2"]);

const source = {
  pointerOwnedRoot: { symbol: "Move_SUPERPOWER", nextDispatchLabel: "Move_RECYCLE", blocks: graphEntry.blocks, commands, source: sourceRecord("data/battle_anim_scripts.s", scripts, rootBody), rom: romRange("Move_SUPERPOWER", "Move_RECYCLE") },
  templates: {
    orb: { source: sourceRecord("src/battle_anim_fight.c", fight, orbTemplate), rom: romRange("gSuperpowerOrbSpriteTemplate"), callback: fn("AnimSuperpowerOrb", "src/battle_anim_fight.c", fight), callbackStep: fn("AnimSuperpowerOrb_Step", "src/battle_anim_fight.c", fight), affine: { source: sourceRecord("src/battle_anim_fight.c", fight, affineOrb), rom: romRange("sAffineAnim_SuperpowerOrb") } },
    rock: { source: sourceRecord("src/battle_anim_fight.c", fight, rockTemplate), rom: romRange("gSuperpowerRockSpriteTemplate"), callback: fn("AnimSuperpowerRock", "src/battle_anim_fight.c", fight), step1: fn("AnimSuperpowerRock_Step1", "src/battle_anim_fight.c", fight), step2: fn("AnimSuperpowerRock_Step2", "src/battle_anim_fight.c", fight) },
    fireball: { source: sourceRecord("src/battle_anim_fight.c", fight, fireballTemplate), rom: romRange("gSuperpowerFireballSpriteTemplate"), callback: fn("AnimSuperpowerFireball", "src/battle_anim_fight.c", fight) },
  },
  tasks: { shakeMon2: { body: fn("AnimTask_ShakeMon2", "src/battle_anim_mon_movement.c", movement), step: fn("AnimTask_ShakeMon2_Step", "src/battle_anim_mon_movement.c", movement) }, soundSE2: fn("SoundTask_PlaySE2WithPanning", "src/battle_anim_sound_tasks.c", sound), shakeBgY: { template: romRange("gShakeMonOrPlatformSpriteTemplate"), callback: fn("AnimShakeMonOrBattlePlatforms", "src/battle_anim_normal.c", normal), step: fn("AnimShakeMonOrBattlePlatforms_Step", "src/battle_anim_normal.c", normal) } },
  resources: { tags: { circleOfLight: 10212, meteor: 10256, flatRock: 10257 }, gfx: { circleOfLight: "graphics/battle_anims/sprites/circle_of_light.png", meteor: "graphics/battle_anims/sprites/meteor.png", flatRock: "graphics/battle_anims/sprites/flat_rock.png" }, allocations: { circleOfLight: "0x0800", meteor: "0x0800", flatRock: "0x0280" }, palette: { circleOfLight: "gBattleAnimSpritePal_ElectricOrbs", meteor: "gBattleAnimSpritePal_Meteor", flatRock: "gBattleAnimSpritePal_FlatRock" } },
};
console.log(JSON.stringify({ schema: "superpower-source-audit/v1", move: "MOVE_SUPERPOWER", moveId: 276, status: "unsupported-source-staging-checkpoint", coverageCredit: false, source, graph: { blocks: graphEntry.blocks, componentCount: expectedComponents.length, components: expectedComponents, novelComponents: ["asset:ANIM_TAG_FLAT_ROCK", "asset:ANIM_TAG_METEOR", "sprite:gSuperpowerFireballSpriteTemplate", "sprite:gSuperpowerOrbSpriteTemplate", "sprite:gSuperpowerRockSpriteTemplate"] }, behavior: { attackerOrb: { affine: [32, 4, -6, 6], blend: [12, 8], start: "attacker coordinate via target-relative template" }, shakeBgY: { velocity: 4, timer: 1, duration: 180, type: "SHAKE_BG_Y", storage: "gBattle_BG3_Y" }, rocks: [[200, 96, 1, 120], [20, 248, 4, 112], [130, 160, 2, 104], [160, 192, 0, 96], [60, 288, 3, 88]], fireball: { flips: { playerTarget: ["HFLIP", "VFLIP"], opponentTarget: [] }, duration: 16 }, targetShake: [8, 0, 16, 1], cleanup: ["clearmonbg ANIM_ATK_PARTNER", "blendoff", "delay 1", "end"] }, resources: { audio: [{ sound: "SE_M_MEGA_KICK", id: 140, pan: "SOUND_PAN_ATTACKER" }, { sound: "SE_M_EARTHQUAKE", id: 234, pan: 0 }, { sound: "SE_M_SWAGGER", id: 193, pan: "SOUND_PAN_ATTACKER" }, { sound: "SE_M_MEGA_KICK2", id: 141, pan: "SOUND_PAN_TARGET" }] }, carriers: { factoryCount: carriers.length, level50Count: carriers.length, allFactory: carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature })) }, controls: { named: { MOVE_TAIL_GLOW: "exact", MOVE_SHOCK_WAVE: "exact", MOVE_SNORE: "exact", MOVE_ANCIENT_POWER: "exact" }, transferCredit: false }, checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directSpriteTaskResourceBodies: true, fullFactoryCarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, rawRgbRetained: true, normalizedMaps: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false, unsupportedNoCreditBoundary: true }, remainder: "Keep MOVE_SUPERPOWER staged/unsupported and the five-component superpower-rock-orb-fireball track unfulfilled until the source-relative reducer, narrow typed seam, generic compositor, material control, and twice-fresh actual-core zero-residual proof exist." }, null, 2));
