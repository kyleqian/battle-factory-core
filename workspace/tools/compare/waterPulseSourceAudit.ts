/**
 * Authoritative source/classification receipt for the MOVE_WATER_PULSE
 * source and legal-staging checkpoint.  This development-only program never
 * supplies runtime presentation data.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Symbol = { address: number; size: number };

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;

const scripts = read("data/battle_anim_scripts.s");
const macros = read("asm/macros/battle_anim_script.inc");
const water = read("src/battle_anim_water.c");
const effects = read("src/battle_anim_effects_2.c");
const normal = read("src/battle_anim_normal.c");
const movement = read("src/battle_anim_mon_movement.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const animationConstants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const symbols = new Map<string, Symbol>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
}).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields.at(-1)!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}

function sym(name: string): Symbol {
  const value = symbols.get(name);
  if (!value) throw new Error(`missing ELF symbol ${name}`);
  return value;
}
function romRange(name: string, end?: number): Json {
  const start = sym(name).address;
  const finish = end ?? start + sym(name).size;
  if (finish <= start) throw new Error(`invalid ROM interval ${name}`);
  return {
    symbol: name,
    start: hex(start),
    endExclusive: hex(finish),
    byteLength: finish - start,
    romSha256: sha(rom.subarray(start - 0x08000000, finish - 0x08000000)),
  };
}
function sourceSpan(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing source span ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
}
function sourceBlock(source: string, startToken: string, endToken: string): string {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`missing source block ${startToken}`);
  return source.slice(start, end);
}
function functionBody(source: string, name: string): string {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "g");
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(source)) !== null) {
    const open = source.indexOf("{", match.index);
    const semi = source.indexOf(";", match.index);
    if (open < 0 || (semi >= 0 && semi < open)) continue;
    let depth = 0;
    for (let index = open; index < source.length; index++) {
      if (source[index] === "{") depth++;
      else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1);
    }
  }
  throw new Error(`missing function ${name}`);
}
function bodyRecord(name: string, path: string, source: string): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name) };
}
function objectRecord(name: string, path: string, source: string): Json {
  const token = source.indexOf(name);
  const start = source.lastIndexOf("\n", token) + 1;
  const end = source.indexOf("};", token) + 2;
  if (token < 0 || end < 2) throw new Error(`missing object ${name}`);
  return { source: sourceSpan(path, source, source.slice(start, end)), rom: romRange(name) };
}
function commandRows(body: string): string[] {
  return body.split("\n").map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const rootBody = sourceBlock(scripts, "Move_WATER_PULSE:\n", "Move_PSYCHO_BOOST:\n");
const expectedCommands = [
  "loadspritegfx ANIM_TAG_SMALL_BUBBLES",
  "loadspritegfx ANIM_TAG_BLUE_RING_2",
  "monbg ANIM_TARGET",
  "splitbgprio ANIM_TARGET",
  "playsewithpan SE_M_BUBBLE3, SOUND_PAN_ATTACKER",
  "simple_palette_blend selector=F_PAL_BG, delay=0, initial_blend_y=0, target_blend_y=7, color=RGB(0, 25, 28)",
  "delay 10",
  "createsprite gWaterPulseBubbleSpriteTemplate, ANIM_ATTACKER, 66, 100, 100, 8, 1, 20, 40, 0",
  "createsprite gWaterPulseBubbleSpriteTemplate, ANIM_ATTACKER, 66, 20, 100, 16, 2, 10, 35, 1",
  "createsprite gWaterPulseBubbleSpriteTemplate, ANIM_ATTACKER, 66, 200, 80, 8, 1, 40, 20, 0",
  "createsprite gWaterPulseBubbleSpriteTemplate, ANIM_ATTACKER, 66, 80, 60, 10, 3, 20, 50, 0",
  "createsprite gWaterPulseBubbleSpriteTemplate, ANIM_ATTACKER, 66, 140, 100, 16, 1, 20, 30, 1",
  "playsewithpan SE_M_BUBBLE3, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "playsewithpan SE_M_GIGA_DRAIN, SOUND_PAN_ATTACKER",
  "createsprite gWaterPulseRingSpriteTemplate, ANIM_TARGET, 2, 0, 0, 40, 15",
  "delay 5",
  "playsewithpan SE_M_GIGA_DRAIN, SOUND_PAN_ATTACKER",
  "createsprite gWaterPulseRingSpriteTemplate, ANIM_TARGET, 2, 0, 0, 40, 15",
  "delay 5",
  "playsewithpan SE_M_GIGA_DRAIN, SOUND_PAN_ATTACKER",
  "createsprite gWaterPulseRingSpriteTemplate, ANIM_TARGET, 2, 0, 0, 40, 15",
  "delay 13",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 8, 18, 1",
  "waitforvisualfinish",
  "simple_palette_blend selector=F_PAL_BG, delay=1, initial_blend_y=7, target_blend_y=0, color=RGB(0, 25, 28)",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "end",
] as const;
const expectedComponents = [
  "asset:ANIM_TAG_BLUE_RING_2",
  "asset:ANIM_TAG_SMALL_BUBBLES",
  "sprite:gWaterPulseBubbleSpriteTemplate",
  "sprite:gWaterPulseRingSpriteTemplate",
  "task:AnimTask_ShakeMon",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:simple_palette_blend",
  "visualCommand:splitbgprio",
] as const;
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_WATER_PULSE");
const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_WATER_PULSE"));
const level50 = carriers.filter((entry: Json) => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end));
const outside = carriers.filter((entry: Json) => !level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end));
const rootStart = sym("Move_WATER_PULSE").address;
const rootEnd = sym("Move_PSYCHO_BOOST").address;
const track = coverage.componentTracks.find((entry: Json) => entry.id === "water-gun-small-bubbles-water-impact");

if (JSON.stringify(commandRows(rootBody)) !== JSON.stringify(expectedCommands)) throw new Error("Water Pulse root command order drifted");
if (!graphEntry || graphEntry.id !== 352 || graphEntry.rootScript !== "Move_WATER_PULSE"
  || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_WATER_PULSE"])
  || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Water Pulse generated nine-component graph drifted");
if (JSON.stringify(level50.map((entry: Json) => entry.index)) !== JSON.stringify([131, 147, 155, 176, 182, 204, 213, 228, 242, 259, 309, 756])) throw new Error("Water Pulse Level-50 carrier census drifted");
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_WATER_PULSE") || !track?.representatives.includes("MOVE_WATER_PULSE")) throw new Error("Water Pulse unsupported coverage boundary drifted");

requireTokens("Water Pulse macro", macros, [".macro simple_palette_blend", "createsprite gSimplePaletteBlendSpriteTemplate"]);
requireTokens("Water Pulse bubble templates", water, [
  "const struct SpriteTemplate gWaterPulseBubbleSpriteTemplate", "const struct SpriteTemplate gWaterPulseRingBubbleSpriteTemplate",
  ".tileTag = ANIM_TAG_SMALL_BUBBLES", ".callback = AnimWaterPulseBubble", ".callback = AnimWaterPulseRingBubble",
  "static void AnimWaterPulseBubble", "static void AnimWaterPulseBubble_Step", "static void AnimWaterPulseRingBubble",
]);
requireTokens("Water Pulse ring", effects, [
  "const union AffineAnimCmd gWaterPulseRingAffineAnimCmds[]", "const union AffineAnimCmd *const gWaterPulseRingAffineAnimTable[]",
  "const struct SpriteTemplate gWaterPulseRingSpriteTemplate", ".tileTag = ANIM_TAG_BLUE_RING_2", ".callback = AnimWaterPulseRing",
]);
requireTokens("Water Pulse ring callbacks", water, [
  "void AnimWaterPulseRing", "static void AnimWaterPulseRing_Step", "static void CreateWaterPulseRingBubbles",
  "Random2() % 10", "CreateSprite(&gWaterPulseRingBubbleSpriteTemplate", "FreeSpriteOamMatrix(sprite)",
]);
requireTokens("Water Pulse shake", movement, ["void AnimTask_ShakeMon", "static void AnimTask_ShakeMon_Step", "gTasks[taskId].data[1] = gBattleAnimArgs[3]"]);
requireTokens("Water Pulse simple palette blend", normal, [
  "const struct SpriteTemplate gSimplePaletteBlendSpriteTemplate", "static void AnimSimplePaletteBlend", "static void AnimSimplePaletteBlend_Step",
  "BeginNormalPaletteFade(selectedPalettes, cmd->delay, cmd->initialBlendY, cmd->targetBlendY, cmd->color)",
]);
requireTokens("Water Pulse runtime", runtime, [
  "static void Cmd_loadspritegfx", "static void Cmd_createsprite", "static void Cmd_createvisualtask", "static void Cmd_delay",
  "static void Cmd_waitforvisualfinish", "static void Cmd_end", "static void Cmd_monbg", "static void Cmd_clearmonbg",
  "static void Cmd_splitbgprio", "static void Cmd_playsewithpan", "static void Task_InitUpdateMonBg", "static void Task_UpdateMonBg", "static void Task_ClearMonBg",
]);
requireTokens("Water Pulse resources", `${graphics}\n${registry}\n${animationConstants}`, [
  "gBattleAnimSpriteGfx_SmallBubbles", "gBattleAnimSpritePal_SmallBubbles", "gBattleAnimSpriteGfx_GoldRing", "gBattleAnimSpritePal_BlueRing2",
  "graphics/battle_anims/sprites/small_bubbles.png", "graphics/battle_anims/sprites/gold_ring.png", "graphics/battle_anims/sprites/blue_ring_2.pal",
  "ANIM_TAG_SMALL_BUBBLES", "ANIM_TAG_BLUE_RING_2",
]);
requireTokens("Water Pulse move", moves, ["[MOVE_WATER_PULSE] =", ".effect = EFFECT_CONFUSE_HIT", ".power = 60", ".accuracy = 100", ".pp = 20", ".secondaryEffectChance = 20"]);
requireTokens("Water Pulse audio", songs, ["#define SE_M_BUBBLE3                126", "#define SE_M_GIGA_DRAIN             199"]);

const callbacks = {
  AnimWaterPulseBubble: bodyRecord("AnimWaterPulseBubble", "src/battle_anim_water.c", water),
  AnimWaterPulseBubble_Step: bodyRecord("AnimWaterPulseBubble_Step", "src/battle_anim_water.c", water),
  AnimWaterPulseRingBubble: bodyRecord("AnimWaterPulseRingBubble", "src/battle_anim_water.c", water),
  AnimWaterPulseRing: bodyRecord("AnimWaterPulseRing", "src/battle_anim_water.c", water),
  AnimWaterPulseRing_Step: bodyRecord("AnimWaterPulseRing_Step", "src/battle_anim_water.c", water),
  CreateWaterPulseRingBubbles: bodyRecord("CreateWaterPulseRingBubbles", "src/battle_anim_water.c", water),
  AnimTask_ShakeMon: bodyRecord("AnimTask_ShakeMon", "src/battle_anim_mon_movement.c", movement),
  AnimTask_ShakeMon_Step: bodyRecord("AnimTask_ShakeMon_Step", "src/battle_anim_mon_movement.c", movement),
  AnimSimplePaletteBlend: bodyRecord("AnimSimplePaletteBlend", "src/battle_anim_normal.c", normal),
  AnimSimplePaletteBlend_Step: bodyRecord("AnimSimplePaletteBlend_Step", "src/battle_anim_normal.c", normal),
  Task_InitUpdateMonBg: bodyRecord("Task_InitUpdateMonBg", "src/battle_anim.c", runtime),
  Task_UpdateMonBg: bodyRecord("Task_UpdateMonBg", "src/battle_anim.c", runtime),
  Task_ClearMonBg: bodyRecord("Task_ClearMonBg", "src/battle_anim.c", runtime),
};
const runtimeCommands = Object.fromEntries([
  "Cmd_loadspritegfx", "Cmd_createsprite", "Cmd_createvisualtask", "Cmd_delay", "Cmd_waitforvisualfinish", "Cmd_end",
  "Cmd_monbg", "Cmd_clearmonbg", "Cmd_splitbgprio", "Cmd_playsewithpan",
].map((name) => [name, bodyRecord(name, "src/battle_anim.c", runtime)]));

console.log(JSON.stringify({
  schema: "water-pulse-source-audit/v1",
  move: "MOVE_WATER_PULSE",
  moveId: 352,
  status: "unsupported-source-staging-checkpoint",
  coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_WATER_PULSE",
      nextDispatchLabel: "Move_PSYCHO_BOOST",
      source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody),
      rom: { ...romRange("Move_WATER_PULSE", rootEnd), start: hex(rootStart), endExclusive: hex(rootEnd) },
      pointerContract: "complete half-open pointer-owned Move_WATER_PULSE interval; no local branch, call, return, or subroutine label",
    },
    commands: expectedCommands,
    directBodies: {
      waterPulseBubbleTemplate: objectRecord("gWaterPulseBubbleSpriteTemplate", "src/battle_anim_water.c", water),
      waterPulseRingBubbleTemplate: objectRecord("gWaterPulseRingBubbleSpriteTemplate", "src/battle_anim_water.c", water),
      waterPulseRingTemplate: objectRecord("gWaterPulseRingSpriteTemplate", "src/battle_anim_effects_2.c", effects),
      waterPulseBubbleAnim0: objectRecord("sAnim_WaterPulseBubble_0", "src/battle_anim_water.c", water),
      waterPulseBubbleAnim1: objectRecord("sAnim_WaterPulseBubble_1", "src/battle_anim_water.c", water),
      waterPulseBubbleAnimTable: objectRecord("sAnims_WaterPulseBubble", "src/battle_anim_water.c", water),
      waterPulseRingBubbleAffine0: objectRecord("sAffineAnim_WaterPulseRingBubble_0", "src/battle_anim_water.c", water),
      waterPulseRingBubbleAffine1: objectRecord("sAffineAnim_WaterPulseRingBubble_1", "src/battle_anim_water.c", water),
      waterPulseRingBubbleAffineTable: objectRecord("sAffineAnims_WaterPulseRingBubble", "src/battle_anim_water.c", water),
      waterPulseRingAffineCommands: objectRecord("gWaterPulseRingAffineAnimCmds", "src/battle_anim_effects_2.c", effects),
      waterPulseRingAffineTable: objectRecord("gWaterPulseRingAffineAnimTable", "src/battle_anim_effects_2.c", effects),
      simplePaletteBlendMacro: { source: sourceSpan("asm/macros/battle_anim_script.inc", macros, sourceBlock(macros, ".macro simple_palette_blend", ".macro complex_palette_blend")) },
      simplePaletteBlendTemplate: objectRecord("gSimplePaletteBlendSpriteTemplate", "src/battle_anim_normal.c", normal),
      callbacks,
      runtimeCommands,
    },
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  behavior: {
    initialPalette: { selector: "F_PAL_BG", delay: 0, from: 0, to: 7, color: "RGB(0, 25, 28)" },
    bubbles: { count: 5, template: "gWaterPulseBubbleSpriteTemplate", animations: ["frame 8", "frame 9"], callback: "AnimWaterPulseBubble -> AnimWaterPulseBubble_Step" },
    rings: { count: 3, template: "gWaterPulseRingSpriteTemplate", travel: [40, 15], callback: "AnimWaterPulseRing -> AnimWaterPulseRing_Step -> CreateWaterPulseRingBubbles", ringBubbles: "gWaterPulseRingBubbleSpriteTemplate x2 each emission; Random2-derived offset" },
    shake: { task: "AnimTask_ShakeMon", args: ["ANIM_TARGET", 0, 8, 18, 1] },
    finalPalette: { selector: "F_PAL_BG", delay: 1, from: 7, to: 0, color: "RGB(0, 25, 28)" },
    background: { setup: ["monbg ANIM_TARGET", "splitbgprio ANIM_TARGET"], cleanup: ["clearmonbg ANIM_DEF_PARTNER", "end"] },
    audio: [{ sound: "SE_M_BUBBLE3", id: 126 }, { sound: "SE_M_GIGA_DRAIN", id: 199 }],
  },
  resources: {
    smallBubbles: { tag: "ANIM_TAG_SMALL_BUBBLES", tagValue: 10155, tileBytes: 320, gfx: romRange("gBattleAnimSpriteGfx_SmallBubbles"), palette: romRange("gBattleAnimSpritePal_SmallBubbles"), source: "graphics/battle_anims/sprites/small_bubbles.png" },
    blueRing2: { tag: "ANIM_TAG_BLUE_RING_2", tagValue: 10288, tileBytes: 256, gfx: romRange("gBattleAnimSpriteGfx_GoldRing"), palette: romRange("gBattleAnimSpritePal_BlueRing2"), source: "graphics/battle_anims/sprites/gold_ring.png + blue_ring_2.pal" },
  },
  carriers: {
    level50Ranges,
    count: level50.length,
    all: level50.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })),
    lowest: level50[0],
    excludedOutsideLevel50: outside.map((entry: Json) => entry.index),
    excludedOpenOnly: [],
  },
  coverageBoundary: {
    waterPulseEntryPresent: false,
    waterPulseStatus: "unsupported-absent",
    componentTrack: track?.id,
    componentTrackPreexisting: true,
    waterPulseDoesNotAlterTrack: true,
    noTimingOrLatchTransfer: "SMALL_BUBBLES, BLUE_RING_2, ShakeMon, monbg/clearmonbg/splitbgprio, and simple_palette_blend remain Water Pulse source identities only; no other move transfers a Water Pulse timing or latch receipt.",
  },
  checkpoint: {
    sourceAudit: true,
    legalBilateralPartyOnlyStaging: true,
    denseWindowCaptured: false,
    sourceBoundedSemanticCheckpoint: true,
    productionAssetWiring: false,
    reducerAdded: false,
    typedSceneOnSeam: false,
    compositorAdded: false,
    framebufferAcceptance: false,
    coveragePromotion: false,
    componentTrackFulfilled: false,
    latchPromotion: false,
    boundaryOrBarrierChanged: false,
    gameplayStateOwned: false,
    unsupportedNoCreditBoundary: true,
  },
}, null, 2));
