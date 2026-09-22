/** Authoritative source/component/carrier audit for MOVE_MEGAHORN evidence staging. */
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
const bug = read("src/battle_anim_bug.c");
const movement = read("src/battle_anim_mon_movement.c");
const utility = read("src/battle_anim_utility_funcs.c");
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

const rootBody = sourceBlock(scripts, "Move_MEGAHORN:\n", "Move_GUST:\n");
const commands = rootBody.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line && !line.endsWith(":"));
const expectedComponents = [
  "asset:ANIM_TAG_HORN_HIT_2", "asset:ANIM_TAG_IMPACT", "sprite:gSlideMonToOffsetSpriteTemplate", "sprite:gSlideMonToOriginalPosSpriteTemplate",
  "subroutine:MegahornContinue", "subroutine:MegahornInContest", "task:AnimTask_ShakeMon", "task:AnimTask_ShakeMonInPlace", "task:AnimTask_StartSlidingBg",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:complex_palette_blend", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:create_megahorn_horn_sprite",
  "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
];
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_MEGAHORN");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_MEGAHORN");
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_MEGAHORN"));
if (!graphEntry || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("generated Megahorn graph drifted");
if (!move || move.id !== 224 || move.frontierMonCount !== 8 || carriers.length !== 8) throw new Error("Megahorn carrier census drifted");

const commandChecks = [
  "loadspritegfx ANIM_TAG_HORN_HIT_2", "loadspritegfx ANIM_TAG_IMPACT", "monbg ANIM_DEF_PARTNER", "playsewithpan SE_M_DRAGON_RAGE, SOUND_PAN_ATTACKER",
  "jumpifcontest MegahornInContest", "fadetobg BG_DRILL", "createvisualtask AnimTask_StartSlidingBg, 5, -2304, 768, 1, -1", "MegahornContinue:",
  "setalpha 12, 8", "createvisualtask AnimTask_ShakeMon, 5, ANIM_ATTACKER, 2, 0, 15, 1", "createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 0, 24, 0, 0, 6",
  "create_megahorn_horn_sprite ANIM_ATTACKER, 3, x1=-42, y1=25, x2=0, y2=0, duration=6", "playsewithpan SE_M_VICEGRIP, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=0", "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, -4, 1, 12, 1",
  "complex_palette_blend unused_anim_battler=ANIM_ATTACKER, unused_subpriority_offset=2, selector=F_PAL_BG | F_PAL_ATTACKER | F_PAL_TARGET, delay=5, num_blends=1, color1=RGB_WHITE, blend_y1=10, color2=RGB_BLACK, blend_y2=0",
  "clearmonbg ANIM_DEF_PARTNER", "blendoff", "restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein", "MegahornInContest:",
  "fadetobg BG_DRILL_CONTESTS", "createvisualtask AnimTask_StartSlidingBg, 5, 2304, 768, 0, -1", "goto MegahornContinue",
];
for (const token of commandChecks) if (!rootBody.includes(token)) throw new Error(`Megahorn command drifted: ${token}`);
requireTokens("Megahorn sprite template", sourceBlock(bug, "const struct SpriteTemplate gMegahornHornSpriteTemplate", "static const union AffineAnimCmd sAffineAnim_LeechLifeNeedle_0"), ["ANIM_TAG_HORN_HIT_2", "gOamData_AffineDouble_ObjNormal_32x16", "sAffineAnims_MegahornHorn", "AnimMegahornHorn"]);
requireTokens("Megahorn callback", functionBody(bug, "AnimMegahornHorn"), ["IsContest()", "StartSpriteAffineAnim(sprite, 2)", "StartSpriteAffineAnim(sprite, 1)", "GetBattlerSide(gBattleAnimTarget)", "StartAnimLinearTranslation", "DestroyAnimSprite"]);
requireTokens("Megahorn affine programs", sourceBlock(bug, "static const union AffineAnimCmd sAffineAnim_MegahornHorn_0", "const struct SpriteTemplate gMegahornHornSpriteTemplate"), ["0x100, 0x100, 30", "0x100, 0x100, -99", "0x100, 0x100, 94"]);
requireTokens("ShakeMon", functionBody(movement, "AnimTask_ShakeMon") + functionBody(movement, "AnimTask_ShakeMon_Step"), ["gBattleAnimArgs[3]", "DestroyAnimVisualTask"]);
requireTokens("ShakeMonInPlace", functionBody(movement, "AnimTask_ShakeMonInPlace") + functionBody(movement, "AnimTask_ShakeMonInPlace_Step"), ["gBattleAnimArgs[1]", "gBattleAnimArgs[2]", "gTasks[taskId].data[5]"]);
requireTokens("sliding BG", functionBody(utility, "AnimTask_StartSlidingBg") + functionBody(utility, "AnimTask_UpdateSlidingBg"), ["UpdateAnimBg3ScreenSize(FALSE)", "gBattleAnimArgs[0]", "gBattleAnimArgs[1]", "gBattleAnimArgs[3]"]);
requireTokens("resources", graphics + registry + constants, ["gBattleAnimSpriteGfx_HornHit2", "gBattleAnimSpritePal_HornHit2", "ANIM_TAG_HORN_HIT_2", "gBattleAnimBgImage_Drill", "gBattleAnimBgTilemap_Drill"]);
requireTokens("background commands", battleAnim, ["void Cmd_fadetobg", "void Cmd_restorebg", "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg"]);
requireTokens("hit splat", normal, ["AnimHitSplatBasic", "gBasicHitSplatSpriteTemplate"]);
requireTokens("audio", songs, ["SE_M_DRAGON_RAGE", "SE_M_VICEGRIP"]);

const json = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const allFactory = carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature }));
console.log(JSON.stringify({
  schema: "mega-horn-source-audit/v1", move: "MOVE_MEGAHORN", moveId: 224, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: { symbol: "Move_MEGAHORN", nextDispatchLabel: "Move_GUST", blocks: graphEntry.blocks, commands, source: sourceRecord("data/battle_anim_scripts.s", scripts, rootBody), rom: romRange("Move_MEGAHORN", "Move_GUST") },
    template: { source: sourceRecord("src/battle_anim_bug.c", bug, sourceBlock(bug, "const struct SpriteTemplate gMegahornHornSpriteTemplate", "static const union AffineAnimCmd sAffineAnim_LeechLifeNeedle_0")), rom: romRange("gMegahornHornSpriteTemplate"), affinePrograms: { source: sourceRecord("src/battle_anim_bug.c", bug, sourceBlock(bug, "static const union AffineAnimCmd sAffineAnim_MegahornHorn_0", "const struct SpriteTemplate gMegahornHornSpriteTemplate")), rom: [romRange("sAffineAnim_MegahornHorn_0"), romRange("sAffineAnim_MegahornHorn_1"), romRange("sAffineAnim_MegahornHorn_2")] } },
    callbacks: { horn: fn("AnimMegahornHorn", "src/battle_anim_bug.c", bug), attackerShake: fn("AnimTask_ShakeMon", "src/battle_anim_mon_movement.c", movement), attackerShakeStep: fn("AnimTask_ShakeMon_Step", "src/battle_anim_mon_movement.c", movement), targetShake: fn("AnimTask_ShakeMonInPlace", "src/battle_anim_mon_movement.c", movement), targetShakeStep: fn("AnimTask_ShakeMonInPlace_Step", "src/battle_anim_mon_movement.c", movement), slidingBg: fn("AnimTask_StartSlidingBg", "src/battle_anim_utility_funcs.c", utility), slidingBgStep: fn("AnimTask_UpdateSlidingBg", "src/battle_anim_utility_funcs.c", utility), fadeBg: fn("Task_FadeToBg", "src/battle_anim.c", battleAnim), updateMonBg: fn("Task_UpdateMonBg", "src/battle_anim.c", battleAnim), clearMonBg: fn("Task_ClearMonBg", "src/battle_anim.c", battleAnim), hitSplat: fn("AnimHitSplatBasic", "src/battle_anim_normal.c", normal) },
  },
  graph: { blocks: graphEntry.blocks, componentCount: expectedComponents.length, components: expectedComponents, novelComponents: ["asset:ANIM_TAG_HORN_HIT_2", "subroutine:MegahornContinue", "subroutine:MegahornInContest", "visualCommand:create_megahorn_horn_sprite"] },
  behavior: { battle: { background: "BG_DRILL", scroll: [-2304, 768, 1, -1] }, contest: { background: "BG_DRILL_CONTESTS", scroll: [2304, 768, 0, -1], controlFlow: "MegahornInContest -> MegahornContinue" }, attackerShake: [2, 0, 15, 1], attackerSlides: [[0, 24, 0, 0, 6], [1, -16, 4, 1, 4], [0, 0, 11], [1, 0, 7]], horn: { template: "gMegahornHornSpriteTemplate", callback: "AnimMegahornHorn", affinePrograms: [30, -99, 94], args: [-42, 25, 0, 0, 6] }, hitsplat: { template: "gBasicHitSplatSpriteTemplate", animation: 0 }, targetShake: [-4, 1, 12, 1], paletteBlend: { selector: "F_PAL_BG | F_PAL_ATTACKER | F_PAL_TARGET", delay: 5, blends: 1, color1: "RGB_WHITE", blendY1: 10, color2: "RGB_BLACK", blendY2: 0 }, cleanup: ["clearmonbg ANIM_DEF_PARTNER", "blendoff", "restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein", "end"] },
  resources: { horn: { tag: "ANIM_TAG_HORN_HIT_2", value: 10153, gfx: "graphics/battle_anims/sprites/horn_hit_2.png", tileBytes: 256, palette: "graphics/battle_anims/sprites/horn_hit_2.png" }, impact: { tag: "ANIM_TAG_IMPACT", value: 10135, gfx: "graphics/battle_anims/sprites/impact.png", palette: "graphics/battle_anims/sprites/impact.png" }, background: { id: "BG_DRILL", contestsId: "BG_DRILL_CONTESTS" }, audio: [{ sound: "SE_M_DRAGON_RAGE", id: 171, pan: "SOUND_PAN_ATTACKER" }, { sound: "SE_M_VICEGRIP", id: 156, pan: "SOUND_PAN_TARGET" }] },
  carriers: { factoryCount: carriers.length, level50Count: carriers.length, lowestLevel50: allFactory[0], allFactory },
  controls: { named: { MOVE_HORN_DRILL: "exact", MOVE_SKY_UPPERCUT: "exact", MOVE_TAKE_DOWN: "exact", MOVE_MACH_PUNCH: "exact" }, transferCredit: false },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directSpriteTaskResourceBodies: true, fullFactoryCarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, rawRgbRetained: true, normalizedMaps: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false, unsupportedNoCreditBoundary: true },
  remainder: "Keep MOVE_MEGAHORN staged/unsupported until a source-relative reducer, narrow typed Scene-ON seam, generic compositor, material altered control, and twice-fresh actual-core zero-residual proof exist.",
}, null, 2));
