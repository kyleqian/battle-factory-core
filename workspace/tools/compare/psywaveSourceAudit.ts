/** Authoritative source/ELF/ROM/component/carrier checkpoint for MOVE_PSYWAVE. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type SymbolEntry = { address: number; size: number };
const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const readSource = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = readSource("data/battle_anim_scripts.s");
const water = readSource("src/battle_anim_water.c");
const normal = readSource("src/battle_anim_normal.c");
const effects = readSource("src/battle_anim_effects_3.c");
const sound = readSource("src/battle_anim_sound_tasks.c");
const runtime = readSource("src/battle_anim.c");
const registry = readSource("src/data/battle_anim.h");
const graphics = readSource("src/graphics.c");
const constants = readSource("include/constants/battle_anim.h");
const songs = readSource("include/constants/songs.h");
const moves = readSource("src/data/battle_moves.h");
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;

const symbols = new Map<string, SymbolEntry[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields.at(-1)!, [...(symbols.get(fields.at(-1)!) ?? []), { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) }]);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, [...(symbols.get(fields[2]!) ?? []), { address: Number.parseInt(fields[0]!, 16), size: 0 }]);
  }
}
function sym(name: string): SymbolEntry { const found = symbols.get(name) ?? []; if (found.length !== 1) throw new Error(`missing/ambiguous ELF symbol ${name}`); return found[0]!; }
function romRange(name: string, end?: number): Json { const value = sym(name); const finish = end ?? value.address + value.size; if (finish <= value.address) throw new Error(`invalid ROM range ${name}`); return { symbol: name, start: hex(value.address), endExclusive: hex(finish), byteLength: finish - value.address, romSha256: sha(rom.subarray(value.address - 0x08000000, finish - 0x08000000)) }; }
function block(start: string, end: string): string { const from = scripts.indexOf(`${start}:`); const to = scripts.indexOf(`${end}:`, from + start.length + 1); if (from < 0 || to < 0) throw new Error(`missing block ${start}/${end}`); return scripts.slice(from, to); }
function functionBody(source: string, name: string): string { const match = new RegExp(`\\b${name}\\s*\\(`, "g"); let found: RegExpExecArray | null; while ((found = match.exec(source))) { const open = source.indexOf("{", found.index), semi = source.indexOf(";", found.index); if (open < 0 || (semi >= 0 && semi < open)) continue; let depth = 0; for (let i = open; i < source.length; i++) { if (source[i] === "{") depth++; else if (source[i] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", found.index) + 1, i + 1); } } throw new Error(`missing function ${name}`); }
function sourceRecord(path: string, source: string, body: string): Json { const start = source.indexOf(body); if (start < 0) throw new Error(`missing source record ${path}`); return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) }; }
function bodyRecord(path: string, source: string, name: string): Json { const body = functionBody(source, name); return { source: sourceRecord(path, source, body), rom: romRange(name) }; }
function commands(body: string): string[] { return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line && !line.endsWith(":")); }
function requireTokens(label: string, source: string, tokens: readonly string[]): void { for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`); }

const rootBody = block("Move_PSYWAVE", "Move_ZAP_CANNON");
const ringBody = block("PsywaveRings", "Move_ZAP_CANNON");
const setBg = block("SetPsychicBackground", "UnsetPsychicBackground");
const unsetBg = block("UnsetPsychicBackground", "SetSkyBg");
const rootCommands = commands(rootBody.slice(0, rootBody.indexOf("PsywaveRings:")));
const expectedRoot = ["loadspritegfx ANIM_TAG_BLUE_RING", "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER", "call SetPsychicBackground", "createvisualtask AnimTask_StartSinAnimTimer, 5, 100", "createsoundtask SoundTask_LoopSEAdjustPanning, SE_M_TELEPORT, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, 2, 9, 0, 10", "call PsywaveRings", "call PsywaveRings", "blend_color_cycle priority=2, selector=F_PAL_TARGET, delay=1, num_blends=4, initial_blend_y=0, target_blend_y=12, color=RGB(31, 18, 31)", "call PsywaveRings", "call PsywaveRings", "call PsywaveRings", "call PsywaveRings", "waitforvisualfinish", "delay 1", "call UnsetPsychicBackground", "end"];
const expectedRing = ["createsprite gPsywaveRingSpriteTemplate, ANIM_TARGET, 3, 10, 10, 0, 16", "delay 4", "createsprite gPsywaveRingSpriteTemplate, ANIM_TARGET, 3, 10, 10, 0, 16", "delay 4", "return"];
if (JSON.stringify(rootCommands) !== JSON.stringify(expectedRoot) || JSON.stringify(commands(ringBody)) !== JSON.stringify(expectedRing)) throw new Error("Psywave script/body drifted");

const expectedComponents = ["asset:ANIM_TAG_BLUE_RING", "soundTask:SoundTask_LoopSEAdjustPanning", "sprite:gPsywaveRingSpriteTemplate", "subroutine:PsywaveRings", "subroutine:SetPsychicBackground", "subroutine:UnsetPsychicBackground", "task:AnimTask_SetPsychicBackground", "task:AnimTask_StartSinAnimTimer", "visualCommand:blend_color_cycle", "visualCommand:fadetobg", "visualCommand:restorebg", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout"];
const moveGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_PSYWAVE");
if (moveGraph?.id !== 149 || moveGraph.rootScript !== "Move_PSYWAVE" || JSON.stringify(moveGraph.blocks) !== JSON.stringify(["Move_PSYWAVE", "SetPsychicBackground", "PsywaveRings", "UnsetPsychicBackground"]) || JSON.stringify(moveGraph.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Psywave generated graph drifted");
const ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const legal = (entry: Json): boolean => ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_PSYWAVE"));
const level50 = allCarriers.filter(legal);
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_PSYWAVE");
if (JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([121, 209]) || JSON.stringify(level50.map((entry: Json) => entry.index)) !== JSON.stringify([121, 209]) || inventoryEntry?.frontierMonCount !== 2) throw new Error("Psywave carrier census drifted");
const coverageEntry = coverage.entries.find((entry: Json) => entry.move === "MOVE_PSYWAVE");
const status = coverageEntry?.status ?? "unsupported";
if (status !== "unsupported" || coverageEntry !== undefined) throw new Error("Psywave unsupported boundary drifted");

requireTokens("Psywave sprite/timer", water, ["const struct SpriteTemplate gPsywaveRingSpriteTemplate", ".oam = &gOamData_AffineDouble_ObjNormal_16x32", ".affineAnims = gGrowingRingAffineAnimTable", ".callback = AnimToTargetInSinWave", "void AnimTask_StartSinAnimTimer", "static void AnimTask_RunSinAnimTimer"]);
requireTokens("Psywave palette cycle", normal, ["void AnimTask_BlendColorCycle", "static void BlendColorCycle", "static void AnimTask_BlendColorCycleLoop"]);
requireTokens("Psywave background", effects, ["void AnimTask_SetPsychicBackground", "static void SetPsychicBackground_Step", "GetBattleBgPaletteNum()"]);
requireTokens("Psywave resources", `${registry}\n${graphics}\n${constants}`, ["gBattleAnimSpriteGfx_GoldRing, 0x0100, ANIM_TAG_BLUE_RING", "gBattleAnimSpritePal_BlueRing, ANIM_TAG_BLUE_RING", "[BG_PSYCHIC]", "#define ANIM_TAG_BLUE_RING", "gBattleAnimBgImage_Psychic", "gBattleAnimBgPalette_Psychic", "gBattleAnimBgTilemap_Psychic"]);
requireTokens("Psywave audio/runtime", `${sound}\n${songs}\n${runtime}`, ["void SoundTask_LoopSEAdjustPanning", "static void SoundTask_LoopSEAdjustPanning_Step", "#define SE_M_PSYBEAM", "#define SE_M_TELEPORT", "static void Cmd_fadetobg", "static void Cmd_restorebg"]);
requireTokens("Psywave move", moves, ["[MOVE_PSYWAVE] =", ".effect = EFFECT_PSYWAVE", ".power = 1", ".accuracy = 80", ".pp = 15"]);

console.log(JSON.stringify({
  schema: "psywave-source-audit/v1", move: "MOVE_PSYWAVE", moveId: 149, status, coverageCredit: false,
  source: { pointerOwnedRoot: { ...romRange("Move_PSYWAVE", sym("Move_ZAP_CANNON").address), nextDispatchLabel: "Move_ZAP_CANNON", source: sourceRecord("data/battle_anim_scripts.s", scripts, rootBody) }, blocks: {
    Move_PSYWAVE: { commands: expectedRoot }, PsywaveRings: { romStart: hex(sym("PsywaveRings").address), commands: expectedRing },
    SetPsychicBackground: { rom: romRange("SetPsychicBackground", sym("UnsetPsychicBackground").address), commands: commands(setBg) },
    UnsetPsychicBackground: { rom: romRange("UnsetPsychicBackground", sym("SetSkyBg").address), commands: commands(unsetBg) },
  }, bodies: {
    ring: { template: romRange("gPsywaveRingSpriteTemplate"), start: bodyRecord("src/battle_anim_water.c", water, "AnimToTargetInSinWave"), step: bodyRecord("src/battle_anim_water.c", water, "AnimToTargetInSinWave_Step") },
    sinTimer: { start: bodyRecord("src/battle_anim_water.c", water, "AnimTask_StartSinAnimTimer"), step: bodyRecord("src/battle_anim_water.c", water, "AnimTask_RunSinAnimTimer") },
    paletteCycle: { start: bodyRecord("src/battle_anim_normal.c", normal, "AnimTask_BlendColorCycle"), blend: bodyRecord("src/battle_anim_normal.c", normal, "BlendColorCycle"), step: bodyRecord("src/battle_anim_normal.c", normal, "AnimTask_BlendColorCycleLoop") },
    psychicBg: { start: bodyRecord("src/battle_anim_effects_3.c", effects, "AnimTask_SetPsychicBackground"), step: bodyRecord("src/battle_anim_effects_3.c", effects, "SetPsychicBackground_Step") },
    loopAudio: { start: bodyRecord("src/battle_anim_sound_tasks.c", sound, "SoundTask_LoopSEAdjustPanning"), step: bodyRecord("src/battle_anim_sound_tasks.c", sound, "SoundTask_LoopSEAdjustPanning_Step") },
  } },
  graph: { blocks: moveGraph.blocks, components: expectedComponents },
  behavior: { move: { effect: "EFFECT_PSYWAVE", power: 1, accuracy: 80, pp: 15, target: "MOVE_TARGET_SELECTED" }, rings: { calls: 6, perCall: 2, total: 12, args: [10, 10, 0, 16], delay: 4 }, sinTimer: 100, targetPaletteCycle: { selector: "F_PAL_TARGET", delay: 1, blends: 4, initial: 0, target: 12, color: "RGB(31, 18, 31)" }, audio: { initial: "SE_M_PSYBEAM", loop: "SE_M_TELEPORT", loopArgs: [2, 9, 0, 10] }, branches: { playerBack: "reachable", opponentFront: "reachable", contest: "unreachable-in-Factory-singles", partnerBattlers: "unreachable-in-singles" } },
  resources: { sprite: { tile: romRange("gBattleAnimSpriteGfx_GoldRing"), palette: romRange("gBattleAnimSpritePal_BlueRing"), template: romRange("gPsywaveRingSpriteTemplate"), affineTable: romRange("gGrowingRingAffineAnimTable"), oam: romRange("gOamData_AffineDouble_ObjNormal_16x32") }, background: { id: "BG_PSYCHIC", image: romRange("gBattleAnimBgImage_Psychic"), palette: romRange("gBattleAnimBgPalette_Psychic"), tilemap: romRange("gBattleAnimBgTilemap_Psychic") }, sounds: [hex(sym("se_m_psybeam").address), hex(sym("se_m_teleport").address)] },
  carriers: { count: level50.length, allSourceCarriers: allCarriers, level50, excludedOutsideLevel50: allCarriers.filter((entry: Json) => !legal(entry)).map((entry: Json) => entry.index), inventoryExamples: inventoryEntry.exampleMons },
  checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableGraph: true, completeCarrierCensus: true, bilateralReachability: true, unreachableFactorySinglesBranchesNamed: true, denseWindowCaptured: true, latchMeasured: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
}, null, 2));
