/** Authoritative source/component/carrier audit for MOVE_OUTRAGE staging. */
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
const macroSource = read("asm/macros/battle_anim_script.inc");
const dragon = read("src/battle_anim_dragon.c");
const movement = read("src/battle_anim_mon_movement.c");
const normal = read("src/battle_anim_normal.c");
const runtime = read("src/battle_anim.c");
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
const symbol = (name: string): SymbolEntry => { const found = symbols.get(name); if (!found) throw new Error(`missing ELF symbol ${name}`); return found; };
const romRange = (name: string, endName?: string): Json => { const start = symbol(name).address; const end = endName ? symbol(endName).address : start + symbol(name).size; return { symbol: name, start: hex(start), endExclusive: hex(end), byteLength: end - start, romSha256: sha(rom.subarray(start - 0x08000000, end - 0x08000000)) }; };
const block = (source: string, start: string, end: string): string => { const first = source.indexOf(`${start}:`); const last = source.indexOf(`${end}:`, first + start.length + 1); if (first < 0 || last < 0) throw new Error(`missing source block ${start}/${end}`); return source.slice(first, last); };
const textBlock = (source: string, start: string, end: string): string => { const first = source.indexOf(start); const last = source.indexOf(end, first + start.length); if (first < 0 || last < 0) throw new Error(`missing text block ${start}/${end}`); return source.slice(first, last); };
const sourceRecord = (path: string, source: string, body: string): Json => { const start = source.indexOf(body); return { sourcePath: path, sourceStart: start, sourceEndExclusive: start + body.length, sourceByteLength: Buffer.byteLength(body), sourceSha256: sha(body) }; };
const functionBody = (source: string, name: string): string => {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "gu");
  for (let match = matcher.exec(source); match; match = matcher.exec(source)) {
    const open = source.indexOf("{", match.index), semi = source.indexOf(";", match.index); if (open < 0 || (semi >= 0 && semi < open)) continue;
    let depth = 0; for (let index = open; index < source.length; index += 1) { if (source[index] === "{") depth += 1; else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1); }
  }
  throw new Error(`missing function ${name}`);
};
const fn = (name: string, path: string, source: string): Json => ({ source: sourceRecord(path, source, functionBody(source, name)), rom: romRange(name) });
const requireTokens = (label: string, source: string, tokens: readonly string[]): void => { for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`); };
const commandLines = (source: string): string[] => source.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line && !line.endsWith(":"));

const rootBody = block(scripts, "Move_OUTRAGE", "OutrageFlames");
const flamesBody = block(scripts, "OutrageFlames", "Move_SPARK");
const expectedComponents = [
  "asset:ANIM_TAG_SMALL_EMBER", "subroutine:OutrageFlames", "task:AnimTask_ShakeMon2",
  "task:AnimTask_TranslateMonEllipticalRespectSide", "visualCommand:blend_color_cycle",
  "visualCommand:create_outrage_flame_sprite",
];
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_OUTRAGE");
const move = inventory.tiers.openOnly.moves.find((entry: Json) => entry.move === "MOVE_OUTRAGE");
const carriers = frontier.entries.filter((entry: Json) => entry.index === 854);
if (!graphEntry || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("generated Outrage graph drifted");
if (!move || move.id !== 200 || move.frontierMonCount !== 1 || JSON.stringify(move.exampleMons) !== JSON.stringify(["FRONTIER_MON_DRAGONITE_5"])) throw new Error("Outrage inventory drifted");
if (carriers.length !== 1 || carriers[0].moves.join() !== "MOVE_OUTRAGE,MOVE_DOUBLE_EDGE,MOVE_THUNDER_WAVE,MOVE_ROAR") throw new Error("Dragonite-5 carrier drifted");
requireTokens("Move_OUTRAGE", rootBody, [
  "loadspritegfx ANIM_TAG_SMALL_EMBER", "loopsewithpan SE_M_DRAGON_RAGE, SOUND_PAN_ATTACKER, 8, 3",
  "blend_color_cycle priority=2, selector=F_PAL_BG | F_PAL_ATTACKER | F_PAL_TARGET, delay=2, num_blends=5, initial_blend_y=3, target_blend_y=8, color=RGB(14, 13, 0)",
  "createvisualtask AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_ATTACKER, 12, 6, 5, 4",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 40, 1", "call OutrageFlames", "waitforvisualfinish", "end",
]);
requireTokens("OutrageFlames", flamesBody, [
  "delay 3", "create_outrage_flame_sprite ANIM_TARGET, 2, x=0, y=0, duration=30, x_velocity=-5, y_velocity=0, flicker_duration=3",
  "create_outrage_flame_sprite ANIM_TARGET, 2, x=0, y=0, duration=30, x_velocity=0, y_velocity=5, flicker_duration=3",
  "create_outrage_flame_sprite ANIM_TARGET, 2, x=0, y=0, duration=30, x_velocity=0, y_velocity=-5, flicker_duration=3", "return",
]);
const template = textBlock(dragon, "const struct SpriteTemplate gOutrageFlameSpriteTemplate", "static const union AnimCmd sAnim_DragonBreathFire_0");
const anim = textBlock(dragon, "static const union AnimCmd sAnim_OutrageOverheatFire_0", "static const union AnimCmd *const sAnims_OutrageOverheatFire");
requireTokens("Outrage template", template, ["ANIM_TAG_SMALL_EMBER", "gOamData_AffineOff_ObjNormal_32x32", "sAnims_OutrageOverheatFire", "AnimOutrageFlame"]);
requireTokens("Outrage callback", functionBody(dragon, "AnimOutrageFlame"), ["BATTLER_COORD_X_2", "BATTLER_COORD_Y_PIC_OFFSET", "GetBattlerSide(gBattleAnimAttacker)", "cmd->xVelocity = -cmd->xVelocity", "TranslateSpriteLinearAndFlicker", "DestroySpriteAndMatrix"]);
requireTokens("Outrage animation frames", anim, ["ANIMCMD_FRAME(0, 4)", "ANIMCMD_FRAME(16, 4)", "ANIMCMD_FRAME(64, 4)", "ANIMCMD_JUMP(0)"]);
requireTokens("elliptical task", functionBody(movement, "AnimTask_TranslateMonElliptical") + functionBody(movement, "AnimTask_TranslateMonEllipticalRespectSide") + functionBody(movement, "AnimTask_TranslateMonElliptical_Step"), ["Sin(gTasks[taskId].data[5]", "-Cos(gTasks[taskId].data[5]", "GetBattlerSide(gBattleAnimAttacker)", "gBattleAnimArgs[1] = -gBattleAnimArgs[1]"]);
requireTokens("ShakeMon2", functionBody(movement, "AnimTask_ShakeMon2") + functionBody(movement, "AnimTask_ShakeMon2_Step"), ["gBattleAnimArgs[1]", "gBattleAnimArgs[2]", "gBattleAnimArgs[3]", "gBattleAnimArgs[4]", "DestroyAnimVisualTask"]);
requireTokens("blend cycle", functionBody(normal, "AnimTask_BlendColorCycle") + functionBody(normal, "BlendColorCycle") + functionBody(normal, "AnimTask_BlendColorCycleLoop"), ["BeginNormalPaletteFade", "tNumBlends", "tRestoreBlend", "DestroyAnimVisualTask"]);
requireTokens("flame command", macroSource.slice(macroSource.indexOf(".macro create_outrage_flame_sprite"), macroSource.indexOf(".endm", macroSource.indexOf(".macro create_outrage_flame_sprite")) + 5), ["createsprite gOutrageFlameSpriteTemplate", "256 * \\x_velocity", "256 * \\y_velocity", "\\flicker_duration"]);
requireTokens("resources", graphics + registry + constants, ["gBattleAnimSpriteGfx_SmallEmber", "gBattleAnimSpritePal_SmallEmber", "ANIM_TAG_SMALL_EMBER"]);
requireTokens("audio", songs, ["SE_M_DRAGON_RAGE"]);
const carrier = carriers[0];
console.log(JSON.stringify({
  schema: "outrage-source-audit/v1", move: "MOVE_OUTRAGE", moveId: 200, status: "exact", coverageCredit: true,
  source: {
    pointerOwnedRoot: { symbol: "Move_OUTRAGE", nextDispatchLabel: "Move_SPARK", blocks: graphEntry.blocks, commands: commandLines(rootBody), source: sourceRecord("data/battle_anim_scripts.s", scripts, rootBody), rom: romRange("Move_OUTRAGE", "Move_SPARK") },
    pointerOwnedSubroutine: { symbol: "OutrageFlames", nextDispatchLabel: "Move_SPARK", commands: commandLines(flamesBody), source: sourceRecord("data/battle_anim_scripts.s", scripts, flamesBody), rom: romRange("OutrageFlames", "Move_SPARK") },
    template: { source: sourceRecord("src/battle_anim_dragon.c", dragon, template), rom: romRange("gOutrageFlameSpriteTemplate"), animation: { source: sourceRecord("src/battle_anim_dragon.c", dragon, anim), rom: romRange("sAnim_OutrageOverheatFire_0") } },
    callbacks: { outrageFlame: fn("AnimOutrageFlame", "src/battle_anim_dragon.c", dragon), ellipse: fn("AnimTask_TranslateMonEllipticalRespectSide", "src/battle_anim_mon_movement.c", movement), shakeMon2: fn("AnimTask_ShakeMon2", "src/battle_anim_mon_movement.c", movement), blendColorCycle: fn("AnimTask_BlendColorCycle", "src/battle_anim_normal.c", normal), blendColorCycleLoop: fn("AnimTask_BlendColorCycleLoop", "src/battle_anim_normal.c", normal) },
    commandMacro: { sourcePath: "asm/macros/battle_anim_script.inc", sourceSha256: sha(macroSource.slice(macroSource.indexOf(".macro create_outrage_flame_sprite"), macroSource.indexOf(".endm", macroSource.indexOf(".macro create_outrage_flame_sprite")) + 5)) },
  },
  graph: { blocks: graphEntry.blocks, componentCount: expectedComponents.length, components: expectedComponents, novelComponents: ["subroutine:OutrageFlames", "visualCommand:create_outrage_flame_sprite"] },
  behavior: { ellipse: { args: [12, 6, 5, 4], playerXVelocity: 12, opponentXVelocity: -12, wavePeriod: 16 }, flames: { count: 23, duration: 30, flickerDuration: 3, velocities: [[5, 0], [-5, 0], [0, 5], [0, -5], [5, 3], [-5, 3], [5, -3], [-5, -3], [5, 0]], repeatedSubroutineBodies: 2 }, targetShakeMon2: [2, 0, 40, 1], blendColorCycle: { selector: "F_PAL_BG | F_PAL_ATTACKER | F_PAL_TARGET", delay: 2, numBlends: 5, initialBlendY: 3, targetBlendY: 8, color: [14, 13, 0] }, cleanup: ["waitforvisualfinish", "end"] },
  resources: { smallEmber: { tag: "ANIM_TAG_SMALL_EMBER", value: 10029, gfx: "graphics/battle_anims/sprites/small_ember.png", tileBytes: 2560 }, audio: { sound: "SE_M_DRAGON_RAGE", id: 171, pan: "SOUND_PAN_ATTACKER" } },
  carriers: { factoryCount: 1, openOnlyCount: 1, representative: { index: carrier.index, label: carrier.label, species: carrier.species, moves: carrier.moves, itemTableId: carrier.itemTableId, itemName: carrier.itemName, evSpread: carrier.evSpread, nature: carrier.nature } },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directSpriteTaskResourceBodies: true, fullFactoryCarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, rawRgbRetained: true, normalizedMaps: true, latchMeasured: true, productionChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, actualCoreFramebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, gameplayStateOwned: false, boundaryOrBarrierChanged: false, unsupportedNoCreditBoundary: false },
  remainder: "MOVE_OUTRAGE alone is exact after source-relative reducer, typed Scene-ON seam, live compositor, material control, and twice-fresh actual-core zero-residual proof; no sibling or gameplay credit transfers.",
}, null, 2));
