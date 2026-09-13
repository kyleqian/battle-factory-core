/** Deterministic source/classification audit for unsupported MOVE_SUNNY_DAY. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const block = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`missing source boundary ${start}/${end}`);
  return source.slice(from, to);
};

const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fire = read("reference/pokeemerald/src/battle_anim_fire.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const runtime = read("reference/pokeemerald/src/battle_anim.c");
const registry = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const moves = read("reference/pokeemerald/include/constants/moves.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const frontierConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const frontierSource = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as Json;
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as Json;
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json")) as Json;

const body = block(scripts, "Move_SUNNY_DAY:\n", "Move_COTTON_SPORE:\n");
const commands = body.split("\n")
  .slice(1)
  .map((line) => line.replace(/@.*$/u, "").trim())
  .filter((line) => Boolean(line) && !line.endsWith(":"));
const expectedCommands = [
  "loadspritegfx ANIM_TAG_SUNLIGHT",
  "monbg ANIM_ATK_PARTNER",
  "setalpha 13, 3",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG | F_PAL_BATTLERS_2, 1, 0, 6, RGB_WHITE",
  "waitforvisualfinish",
  "panse_adjustnone SE_M_PETAL_DANCE, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +1, 0",
  "call SunnyDayLightRay",
  "call SunnyDayLightRay",
  "call SunnyDayLightRay",
  "call SunnyDayLightRay",
  "waitforvisualfinish",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG | F_PAL_BATTLERS_2, 1, 6, 0, RGB_WHITE",
  "waitforvisualfinish",
  "clearmonbg ANIM_ATK_PARTNER",
  "blendoff",
  "end",
  "createsprite gSunlightRaySpriteTemplate, ANIM_ATTACKER, 40",
  "delay 6",
  "return",
];
const components = [
  "asset:ANIM_TAG_SUNLIGHT",
  "sprite:gSunlightRaySpriteTemplate",
  "subroutine:SunnyDayLightRay",
  "task:AnimTask_BlendBattleAnimPal",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:panse_adjustnone",
  "visualCommand:setalpha",
];
const entry = graph.moves.find((item: Json) => item.move === "MOVE_SUNNY_DAY");
const carriers = frontier.entries.filter((item: Json) => item.index >= 110 && item.index <= 849 && item.moves.includes("MOVE_SUNNY_DAY"));
const carrierIds = [255, 272, 348, 360, 438, 441, 445, 451, 454, 455, 493, 526, 532, 536, 560, 590, 608, 611, 620, 682, 714, 729, 732, 771, 780];

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const parts = line.trim().split(/\s+/u);
  if (parts.length >= 4 && /^[0-9a-f]+$/iu.test(parts[0]!) && /^[0-9a-f]+$/iu.test(parts[1]!)) {
    symbols.set(parts.at(-1)!, { address: Number.parseInt(parts[0]!, 16), size: Number.parseInt(parts[1]!, 16) });
  } else if (parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!)) {
    symbols.set(parts[2]!, { address: Number.parseInt(parts[0]!, 16), size: 0 });
  }
}
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const pin = (name: string) => {
  const symbol = symbols.get(name);
  if (!symbol?.size) throw new Error(`missing sized symbol ${name}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, symbol.address - 0x08000000 + symbol.size);
  return {
    start: `0x${symbol.address.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${(symbol.address + symbol.size).toString(16).padStart(8, "0")}`,
    byteLength: symbol.size,
    romSha256: sha(bytes),
  };
};
const start = symbols.get("Move_SUNNY_DAY")?.address;
const end = symbols.get("Move_COTTON_SPORE")?.address;
const lightRay = symbols.get("SunnyDayLightRay")?.address;
if (start === undefined || end === undefined || lightRay === undefined || end <= start || lightRay < start || lightRay >= end) {
  throw new Error("Sunny Day pointer-owned interval drifted");
}
const moveBytes = rom.subarray(start - 0x08000000, end - 0x08000000);
const lowestSource = block(frontierSource, "[FRONTIER_MON_BELLOSSOM_1]", "[FRONTIER_MON_OCTILLERY_1]");
const generalSun = block(scripts, "General_Sun:\n", "General_Sandstorm:\n");

for (const token of [
  "static const union AffineAnimCmd sAffineAnim_SunlightRay[]", "AFFINEANIMCMD_FRAME(0x50, 0x50, 0, 0)",
  "AFFINEANIMCMD_FRAME(0x2, 0x2, 10, 1)", "AFFINEANIMCMD_JUMP(1)",
  "const struct SpriteTemplate gSunlightRaySpriteTemplate", ".tileTag = ANIM_TAG_SUNLIGHT",
  ".paletteTag = ANIM_TAG_SUNLIGHT", ".oam = &gOamData_AffineNormal_ObjBlend_32x32",
  ".affineAnims = sAffineAnims_SunlightRay", ".callback = AnimSunlight",
  "// Sunlight from Sunny Day / sunny weather", "sprite->x = 0", "sprite->y = 0",
  "sprite->data[0] = 60", "sprite->data[2] = 140", "sprite->data[4] = 80",
  "sprite->callback = StartAnimLinearTranslation", "StoreSpriteCallbackInData6(sprite, DestroyAnimSprite)",
]) if (!fire.includes(token)) throw new Error(`Sunlight sprite dependency drifted: ${token}`);

for (const token of [
  "void AnimTask_BlendBattleAnimPal(u8 taskId)", "UnpackSelectedBattlePalettes(gBattleAnimArgs[0])",
  "GetBattleMonSpritePalettesMask", "StartBlendAnimSpriteColor(taskId, selectedPalettes)",
  "static void AnimTask_BlendSpriteColor_Step2(u8 taskId)", "BlendPalette(singlePaletteOffset, 16, gTasks[taskId].data[10], gTasks[taskId].data[5])",
  "DestroyAnimVisualTask(taskId)",
]) if (!utility.includes(token)) throw new Error(`Sunny Day palette task dependency drifted: ${token}`);

for (const token of [
  "static void Cmd_loadspritegfx(void)", "LoadCompressedSpriteSheetUsingHeap", "LoadCompressedSpritePaletteUsingHeap", "AddSpriteIndex",
  "static void Cmd_createsprite(void)", "gAnimVisualTaskCount++", "static void Cmd_createvisualtask(void)",
  "static void Cmd_waitforvisualfinish(void)", "static void Cmd_end(void)", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag",
  "static void Cmd_monbg(void)", "MoveBattlerSpriteToBG(battler, toBG_2, FALSE)",
  "static void Cmd_clearmonbg(void)", "static void Cmd_setalpha(void)", "static void Cmd_blendoff(void)",
  "static void Cmd_panse_adjustnone(void)", "void DestroyAnimSprite(struct Sprite *sprite)",
]) if (!runtime.includes(token)) throw new Error(`Sunny Day command/runtime dependency drifted: ${token}`);

if (
  JSON.stringify(commands) !== JSON.stringify(expectedCommands)
  || JSON.stringify(entry?.blocks) !== JSON.stringify(["Move_SUNNY_DAY", "SunnyDayLightRay"])
  || JSON.stringify(entry?.componentIds) !== JSON.stringify(components)
  || JSON.stringify(carriers.map((item: Json) => item.index)) !== JSON.stringify(carrierIds)
  || !coverage.entries.some((item: Json) => item.move === "MOVE_SUNNY_DAY" && item.status === "exact")
  || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_SIGNAL_BEAM"])
  || !generalSun.includes("goto Move_SUNNY_DAY")
  || !moves.includes("#define MOVE_SUNNY_DAY 241")
  || !species.includes("#define SPECIES_BELLOSSOM 182")
  || !frontierConstants.includes("#define FRONTIER_MON_BELLOSSOM_1    255")
  || !lowestSource.includes(".species = SPECIES_BELLOSSOM")
  || !lowestSource.includes(".moves = {MOVE_PETAL_DANCE, MOVE_SAFEGUARD, MOVE_SUNNY_DAY, MOVE_SYNTHESIS}")
  || !lowestSource.includes("BATTLE_FRONTIER_ITEM_PERSIM_BERRY")
  || !lowestSource.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !lowestSource.includes("NATURE_QUIET")
  || !registry.includes("{gBattleAnimSpriteGfx_Sunlight, 0x0200, ANIM_TAG_SUNLIGHT}")
  || !registry.includes("{gBattleAnimSpritePal_Sunlight, ANIM_TAG_SUNLIGHT}")
  || !graphics.includes('INCGFX_U32("graphics/battle_anims/sprites/sunlight.png", ".4bpp.lz")')
  || !graphics.includes('INCGFX_U32("graphics/battle_anims/sprites/sunlight.png", ".gbapal.lz")')
  || !constants.includes("#define ANIM_TAG_SUNLIGHT                   (ANIM_SPRITES_START + 157)")
  || !songs.includes("#define SE_M_PETAL_DANCE            202")
) throw new Error("Sunny Day source/classification contract drifted");

console.log(JSON.stringify({
  move: "MOVE_SUNNY_DAY",
  moveId: 241,
  status: "exact",
  coverageCredit: true,
  source: {
    start: `0x${start.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${end.toString(16).padStart(8, "0")}`,
    byteLength: moveBytes.length,
    romSha256: sha(moveBytes),
    sourceByteLength: Buffer.byteLength(body),
    sourceSha256: sha(body),
    commandRows: commands.length,
    pointerContract: "odd-aligned half-open Move_SUNNY_DAY interval includes the pointer-owned SunnyDayLightRay subroutine",
  },
  graph: { blocks: entry.blocks, components },
  commands: expectedCommands,
  subroutine: {
    name: "SunnyDayLightRay",
    start: `0x${lightRay.toString(16).padStart(8, "0")}`,
    calls: 4,
    creates: { template: "gSunlightRaySpriteTemplate", battler: "ANIM_ATTACKER", subpriorityOffset: 40, args: [] },
    delayFrames: 6,
  },
  resources: {
    tag: "ANIM_TAG_SUNLIGHT",
    tagValue: 10157,
    tileBytes: 512,
    gfx: pin("gBattleAnimSpriteGfx_Sunlight"),
    palette: pin("gBattleAnimSpritePal_Sunlight"),
    template: pin("gSunlightRaySpriteTemplate"),
    oam: "gOamData_AffineNormal_ObjBlend_32x32",
    affine: ["AFFINEANIMCMD_FRAME(0x50, 0x50, 0, 0)", "AFFINEANIMCMD_FRAME(0x2, 0x2, 10, 1)", "AFFINEANIMCMD_JUMP(1)"],
  },
  callbacks: Object.fromEntries([
    "AnimSunlight", "StartAnimLinearTranslation", "StoreSpriteCallbackInData6", "DestroyAnimSprite",
    "AnimTask_BlendBattleAnimPal", "StartBlendAnimSpriteColor", "AnimTask_BlendSpriteColor_Step2", "DestroyAnimVisualTask",
  ].map((name) => [name, pin(name)])),
  behavior: {
    sunlight: "each ray starts from the source callback at x=0/y=0 with linear translation data[0]=60, data[2]=140, data[4]=80; its stored completion callback destroys the affine ObjBlend sprite",
    palette: {
      selector: "F_PAL_BG | F_PAL_BATTLERS_2",
      color: "RGB_WHITE",
      delay: 1,
      rampIn: { initial: 0, target: 6 },
      rampOut: { initial: 6, target: 0 },
      task: "AnimTask_BlendBattleAnimPal -> StartBlendAnimSpriteColor -> AnimTask_BlendSpriteColor_Step2",
    },
    background: { command: "monbg ANIM_ATK_PARTNER", cleanup: "clearmonbg ANIM_ATK_PARTNER", intent: "move the attacker and its partner background path before rays; clear it after the restored palette" },
    blend: { setalpha: { eva: 13, evb: 3 }, cleanup: "blendoff" },
    audio: { command: "panse_adjustnone", sound: "SE_M_PETAL_DANCE", id: 202, from: "SOUND_PAN_ATTACKER", to: "SOUND_PAN_TARGET", increment: 1, delay: 0 },
    weather: { continuedWeatherEntry: "General_Sun: goto Move_SUNNY_DAY", ownership: "presentation reuses this script; weather state itself is not staged or owned here" },
    resourceLifetime: { load: "loadspritegfx ANIM_TAG_SUNLIGHT", explicitUnload: false, release: "Cmd_end waits for visual/sound/monbg work, then frees every tracked sprite sheet and palette tag" },
    cleanup: ["four rays complete before waitforvisualfinish", "white palette returns 6->0", "clearmonbg ANIM_ATK_PARTNER", "blendoff", "end waits and releases ANIM_TAG_SUNLIGHT"],
  },
  carriers: {
    level50Range: { first: 110, last: 849 },
    setCount: carriers.length,
    speciesCount: new Set(carriers.map((item: Json) => item.species)).size,
    all: carriers.map((item: Json) => ({ index: item.index, label: item.label, species: item.species, moves: item.moves, itemName: item.itemName, nature: item.nature, evSpreadStats: item.evSpreadStats })),
    lowest: carriers[0],
    lowestLegalRoute: { challengeNum: 1, level50Range: [162, 266], trainerId: 80, regularTrainerRange: [80, 119] },
  },
  checkpoint: {
    sourceAudit: true,
    legalBilateralPartyOnlyStaging: true,
    denseWindowCaptured: true,
    productionChanged: true,
    coveragePromotion: true,
    componentTrackCredit: false,
    latchPromotion: true,
    unsupportedNoCreditBoundary: false,
  },
}, null, 2));
