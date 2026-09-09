/** Authoritative source/classification audit for the unsupported Sky Uppercut checkpoint. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = read("data/battle_anim_scripts.s");
const movement = read("src/battle_anim_mon_movement.c");
const fight = read("src/battle_anim_fight.c");
const mons = read("src/battle_anim_mons.c");
const normal = read("src/battle_anim_normal.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
const frontierConstants = read("include/constants/battle_frontier_mons.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

type Sym = { address: number; size: number };
const symbols = new Map<string, Sym>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) symbols.set(fields.at(-1)!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
}
function sym(name: string): Sym { const value = symbols.get(name); if (!value) throw new Error(`missing ELF symbol ${name}`); return value; }
function romRange(name: string, end?: number): Json { const start = sym(name).address; const finish = end ?? start + sym(name).size; return { symbol: name, start: hex(start), endExclusive: hex(finish), byteLength: finish - start, romSha256: sha(rom.subarray(start - 0x08000000, finish - 0x08000000)) }; }
function sourceSpan(path: string, source: string, body: string): Json { const start = source.indexOf(body); if (start < 0) throw new Error(`missing source span ${path}`); return { sourcePath: path, sourceStart: start, sourceEndExclusive: start + body.length, sourceByteLength: Buffer.byteLength(body), sourceSha256: sha(body) }; }
function sourceBlock(source: string, startToken: string, endToken: string): string { const start = source.indexOf(startToken); const end = source.indexOf(endToken, start + startToken.length); if (start < 0 || end < 0) throw new Error(`missing source block ${startToken}`); return source.slice(start, end); }
function functionBody(source: string, name: string): string { const matcher = new RegExp(`\\b${name}\\s*\\(`, "g"); let match: RegExpExecArray | null; while ((match = matcher.exec(source)) !== null) { const open = source.indexOf("{", match.index); const semi = source.indexOf(";", match.index); if (open < 0 || (semi >= 0 && semi < open)) continue; let depth = 0; for (let i = open; i < source.length; i++) { if (source[i] === "{") depth++; else if (source[i] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, i + 1); } } throw new Error(`missing function ${name}`); }
function bodyRecord(name: string, path: string, source: string): Json { const body = functionBody(source, name); return { source: sourceSpan(path, source, body), rom: romRange(name) }; }
function objectRecord(name: string, path: string, source: string): Json { const token = source.indexOf(name); const start = source.lastIndexOf("\n", token) + 1; const end = source.indexOf("};", token) + 2; if (token < 0 || end < 2) throw new Error(`missing object ${name}`); return { source: sourceSpan(path, source, source.slice(start, end)), rom: romRange(name) }; }
function requireTokens(label: string, source: string, tokens: readonly string[]): void { for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`); }
function commands(body: string): string[] { return body.split("\n").map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":")); }

const rootBody = sourceBlock(scripts, "Move_SKY_UPPERCUT:\n", "Move_SECRET_POWER:\n");
const expectedCommands = [
  "loadspritegfx ANIM_TAG_IMPACT", "monbg ANIM_DEF_PARTNER", "splitbgprio ANIM_TARGET", "fadetobg BG_IN_AIR", "waitbgfadeout",
  "playsewithpan SE_M_SKY_UPPERCUT, SOUND_PAN_ATTACKER", "createvisualtask AnimTask_MoveSkyUppercutBg, 5, 55", "waitbgfadein", "setalpha 12, 8", "delay 38",
  "createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 0, 28, 0, 0, 5", "delay 4", "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 6, 1", "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=-28, y=28, relative_to=ANIM_TARGET, animation=1", "delay 1", "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET", "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=-15, y=8, relative_to=ANIM_TARGET, animation=1",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET", "delay 1", "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET", "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=-5, y=-12, relative_to=ANIM_TARGET, animation=1", "delay 1", "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=0, y=-32, relative_to=ANIM_TARGET, animation=1", "delay 1", "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET", "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=5, y=-52, relative_to=ANIM_TARGET, animation=1",
  "createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 1, -26, 16, 1, 4", "delay 4", "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 0, 3, 6, 1", "delay 30",
  "createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 6", "delay 4", "createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 1, 0, 6", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein", "end"] as const;
if (JSON.stringify(commands(rootBody)) !== JSON.stringify(expectedCommands)) throw new Error("Sky Uppercut root command order drifted");
const rootStart = sym("Move_SKY_UPPERCUT").address; const rootEnd = sym("Move_SECRET_POWER").address;
const expectedComponents = ["asset:ANIM_TAG_IMPACT", "sprite:gSlideMonToOffsetSpriteTemplate", "sprite:gSlideMonToOriginalPosSpriteTemplate", "task:AnimTask_MoveSkyUppercutBg", "task:AnimTask_ShakeMon2", "task:AnimTask_ShakeMonInPlace", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:splitbgprio", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout"];
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_SKY_UPPERCUT");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_SKY_UPPERCUT");
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SKY_UPPERCUT"));
const level50 = carriers.filter((entry: Json) => entry.index >= 110 && entry.index <= 849);
const outside = carriers.filter((entry: Json) => entry.index < 110); const openOnly = carriers.filter((entry: Json) => entry.index > 849);
if (!graphEntry || graphEntry.id !== 327 || graphEntry.rootScript !== "Move_SKY_UPPERCUT" || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_SKY_UPPERCUT"]) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Sky Uppercut component graph drifted");
if (!move || move.power !== 85 || move.accuracy !== 90 || move.pp !== 15 || move.effect !== "EFFECT_SKY_UPPERCUT" || move.frontierMonCount !== 3 || move.speciesCount !== 3 || JSON.stringify(move.exampleMons) !== JSON.stringify(["FRONTIER_MON_HITMONCHAN_1", "FRONTIER_MON_COMBUSKEN_2", "FRONTIER_MON_BRELOOM_1"])) throw new Error("Sky Uppercut inventory drifted");
if (JSON.stringify(level50.map((entry: Json) => entry.index)) !== JSON.stringify([234, 294, 382]) || outside.length !== 0 || openOnly.length !== 0) throw new Error("Sky Uppercut carrier census drifted");
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_SKY_UPPERCUT")) throw new Error("Sky Uppercut must remain absent from exact coverage");
requireTokens("Sky Uppercut movement", movement, ["gSlideMonToOffsetSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate", "static void SlideMonToOffset", "sprite->callback = TranslateSpriteLinearByIdFixedPoint", "static void SlideMonToOriginalPos_Step", "void AnimTask_ShakeMon2", "static void AnimTask_ShakeMon2_Step", "void AnimTask_ShakeMonInPlace", "static void AnimTask_ShakeMonInPlace_Step"]);
requireTokens("Sky Uppercut BG task", fight, ["void AnimTask_MoveSkyUppercutBg", "UpdateAnimBg3ScreenSize(FALSE)", "task->data[8] = gBattleAnimArgs[0]", "task->data[9] += 1280", "task->data[10] += 2816", "gBattleAnimArgs[7] == -1", "UpdateAnimBg3ScreenSize(TRUE)"]);
requireTokens("Sky Uppercut runtime", runtime, ["static void Cmd_fadetobg(void)", "static void Cmd_restorebg(void)", "static void Task_FadeToBg(u8 taskId)", "static void Task_UpdateMonBg(u8 taskId)", "static void Task_ClearMonBg(u8 taskId)", "static void LoadMoveBg(u16 bgId)", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag"]);
requireTokens("Sky Uppercut impact", normal, ["gBasicHitSplatSpriteTemplate", ".tileTag = ANIM_TAG_IMPACT", ".oam = &gOamData_AffineNormal_ObjBlend_32x32", "AnimHitSplatBasic"]);
requireTokens("Sky Uppercut resources", registry, ["{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}", "{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}", "[BG_IN_AIR]"]);
requireTokens("Sky Uppercut graphics", graphics, ["graphics/battle_anims/sprites/impact.png", "gBattleAnimBgImage_InAir", "gBattleAnimBgPalette_InAir", "gBattleAnimBgTilemap_InAir"]);
requireTokens("Sky Uppercut constants", constants, ["#define ANIM_TAG_IMPACT", "#define BG_IN_AIR 17"]);
requireTokens("Sky Uppercut songs", songs, ["#define SE_M_SKY_UPPERCUT           238", "#define SE_M_VITAL_THROW2"]);
requireTokens("Sky Uppercut move", moves, ["[MOVE_SKY_UPPERCUT] =", ".effect = EFFECT_SKY_UPPERCUT", ".power = 85", ".accuracy = 90", ".pp = 15"]);
requireTokens("Sky Uppercut carrier", frontierConstants, ["FRONTIER_MON_HITMONCHAN_1", "FRONTIER_MON_COMBUSKEN_2", "FRONTIER_MON_BRELOOM_1"]);
requireTokens("Sky Uppercut carrier source", frontierSource, [".moves = {MOVE_MACH_PUNCH, MOVE_SKY_UPPERCUT, MOVE_DETECT, MOVE_COUNTER}", ".moves = {MOVE_FLAMETHROWER, MOVE_SKY_UPPERCUT, MOVE_SLASH, MOVE_SAND_ATTACK}", ".moves = {MOVE_SKY_UPPERCUT, MOVE_MACH_PUNCH, MOVE_HEADBUTT, MOVE_COUNTER}"]);

const callbackSource: Record<string, [string, string]> = {
  SlideMonToOffset: ["src/battle_anim_mon_movement.c", movement], SlideMonToOriginalPos: ["src/battle_anim_mon_movement.c", movement], SlideMonToOriginalPos_Step: ["src/battle_anim_mon_movement.c", movement],
  AnimTask_MoveSkyUppercutBg: ["src/battle_anim_fight.c", fight], AnimTask_ShakeMon2: ["src/battle_anim_mon_movement.c", movement], AnimTask_ShakeMon2_Step: ["src/battle_anim_mon_movement.c", movement], AnimTask_ShakeMonInPlace: ["src/battle_anim_mon_movement.c", movement], AnimTask_ShakeMonInPlace_Step: ["src/battle_anim_mon_movement.c", movement],
  AnimHitSplatBasic: ["src/battle_anim_normal.c", normal], Cmd_fadetobg: ["src/battle_anim.c", runtime], Cmd_restorebg: ["src/battle_anim.c", runtime], Task_FadeToBg: ["src/battle_anim.c", runtime], Task_UpdateMonBg: ["src/battle_anim.c", runtime], Task_ClearMonBg: ["src/battle_anim.c", runtime], LoadMoveBg: ["src/battle_anim.c", runtime], UpdateAnimBg3ScreenSize: ["src/battle_anim_mons.c", mons],
};
const callbacks = Object.fromEntries(Object.entries(callbackSource).map(([name, [path, source]]) => [name, bodyRecord(name, path, source)]));
const templateSource = sourceBlock(movement, "const struct SpriteTemplate gSlideMonToOffsetSpriteTemplate =", "const struct SpriteTemplate gSlideMonToOffsetAndBackSpriteTemplate =");
const originalSource = sourceBlock(movement, "const struct SpriteTemplate gSlideMonToOriginalPosSpriteTemplate =", "const struct SpriteTemplate gSlideMonToOffsetSpriteTemplate =");
const impactSource = sourceBlock(normal, "const struct SpriteTemplate gBasicHitSplatSpriteTemplate =", "const struct SpriteTemplate gHandleInvertHitSplatSpriteTemplate =");
const span = (name: string) => romRange(name);

console.log(JSON.stringify({
  schema: "sky-uppercut-source-audit/v1", move: "MOVE_SKY_UPPERCUT", moveId: 327, status: "unsupported-evidence", coverageCredit: false,
  source: { pointerOwnedRoot: { symbol: "Move_SKY_UPPERCUT", nextDispatchLabel: "Move_SECRET_POWER", source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody), rom: { ...romRange("Move_SKY_UPPERCUT", rootEnd), start: hex(rootStart), endExclusive: hex(rootEnd) }, pointerContract: "complete half-open pointer-owned Move_SKY_UPPERCUT interval" }, commands: expectedCommands,
    directBodies: { slideOffsetTemplate: { source: sourceSpan("src/battle_anim_mon_movement.c", movement, templateSource), rom: span("gSlideMonToOffsetSpriteTemplate") }, slideOriginalTemplate: { source: sourceSpan("src/battle_anim_mon_movement.c", movement, originalSource), rom: span("gSlideMonToOriginalPosSpriteTemplate") }, impactTemplate: { source: sourceSpan("src/battle_anim_normal.c", normal, impactSource), rom: span("gBasicHitSplatSpriteTemplate") }, callbacks },
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  behavior: { bg: { task: "AnimTask_MoveSkyUppercutBg", initialArg: 55, deltaX: 1280, deltaY: 2816, cleanupArg7: -1, background: "BG_IN_AIR" }, slides: [{ template: "gSlideMonToOffsetSpriteTemplate", args: [0, 28, 0, 0, 5] }, { template: "gSlideMonToOffsetSpriteTemplate", args: [1, -26, 16, 1, 4] }, { template: "gSlideMonToOriginalPosSpriteTemplate", args: [0, 0, 6] }, { template: "gSlideMonToOriginalPosSpriteTemplate", args: [1, 0, 6] }], impacts: { asset: "ANIM_TAG_IMPACT", count: 5, callback: "AnimHitSplatBasic" }, shakes: [{ task: "AnimTask_ShakeMon2", args: ["ANIM_TARGET", 4, 0, 6, 1] }, { task: "AnimTask_ShakeMonInPlace", args: ["ANIM_TARGET", 0, 3, 6, 1] }], audio: [{ sound: "SE_M_SKY_UPPERCUT", id: 238, pan: "SOUND_PAN_ATTACKER" }, { sound: "SE_M_VITAL_THROW2", pan: "SOUND_PAN_TARGET", occurrences: 5 }], cleanup: ["clearmonbg", "blendoff", "restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein", "end"] },
  resources: { impact: { tag: "ANIM_TAG_IMPACT", tagValue: 10135, tileBytes: 512, gfx: span("gBattleAnimSpriteGfx_Impact"), palette: span("gBattleAnimSpritePal_Impact"), source: "graphics/battle_anims/sprites/impact.png" }, background: { id: "BG_IN_AIR", idValue: 17, image: span("gBattleAnimBgImage_InAir"), palette: span("gBattleAnimBgPalette_InAir"), tilemap: span("gBattleAnimBgTilemap_InAir") }, release: "Cmd_end releases tracked loadspritegfx sheets and palettes after the visual/audio/background cleanup" },
  carriers: { level50Range: [110, 849], all: level50.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })), lowest: level50[0], excludedOutsideLevel50: outside.map((entry: Json) => entry.index), excludedOpenOnly: openOnly.map((entry: Json) => entry.index) },
  controls: { sourceSharedSiblings: ["MOVE_SLAM", "MOVE_HI_JUMP_KICK", "MOVE_ANCIENT_POWER", "MOVE_SECRET_POWER"], independence: "shared IMPACT/slides/shakes/visual commands are measured only for Sky Uppercut; no sibling receives credit" },
  checkpoint: { sourceAudit: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, productionChanged: false, coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false, unsupportedNoCreditBoundary: true },
}, null, 2));
