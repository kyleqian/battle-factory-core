/** Authoritative source/classification audit for MOVE_THUNDERBOLT. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));

const expectedComponents = [
  "asset:ANIM_TAG_SHOCK_3",
  "asset:ANIM_TAG_SPARK",
  "asset:ANIM_TAG_SPARK_2",
  "sprite:gElectricitySpriteTemplate",
  "sprite:gSparkElectricityFlashingSpriteTemplate",
  "sprite:gThunderboltOrbSpriteTemplate",
  "subroutine:ElectricityEffect",
  "task:AnimTask_BlendBattleAnimPal",
  "task:AnimTask_ElectricBolt",
];

function sourceBlock(label: string, nextLabel: string): string {
  const start = scripts.indexOf(`${label}:`);
  const end = scripts.indexOf(`${nextLabel}:`, start + label.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${label}/${nextLabel}`);
  return scripts.slice(start, end);
}

function commandCounts(body: string): Record<string, number> {
  const rows = body.split("\n")
    .map((row) => row.replace(/@.*$/u, "").trim())
    .filter((row) => row && !row.endsWith(":"));
  return Object.fromEntries([...new Set(rows.map((row) => row.split(/\s+/u)[0]!))]
    .map((command) => [command, rows.filter((row) => row === command || row.startsWith(`${command} `)).length]));
}

function requireText(body: string, required: readonly string[]): void {
  for (const token of required) {
    if (!body.includes(token)) throw new Error(`missing source text: ${token}`);
  }
}

const thunderbolt = sourceBlock("Move_THUNDERBOLT", "Move_THUNDER_WAVE");
const electricity = sourceBlock("ElectricityEffect", "ConfusionEffect");
const rootCommands = commandCounts(thunderbolt);
const electricityCommands = commandCounts(electricity);

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
function address(symbol: string): number {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
}

const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
function pointerOwned(label: string, nextLabel: string, body: string) {
  const start = address(label);
  const end = address(nextLabel);
  const bytes = rom.subarray(start - 0x08000000, end - 0x08000000);
  return {
    symbol: label,
    start: `0x${start.toString(16)}`,
    endExclusive: `0x${end.toString(16)}`,
    byteLength: bytes.length,
    romSha256: createHash("sha256").update(bytes).digest("hex"),
    sourceByteLength: Buffer.byteLength(body),
    sourceSha256: createHash("sha256").update(body).digest("hex"),
    bytes,
  };
}

const rootInterval = pointerOwned("Move_THUNDERBOLT", "Move_THUNDER_WAVE", thunderbolt);
const electricityInterval = pointerOwned("ElectricityEffect", "ConfusionEffect", electricity);
const effects = read("reference/pokeemerald/src/battle_anim_electric.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_THUNDERBOLT");
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_THUNDERBOLT");
const level50 = inventory.tiers.level50.monIndices;
const allCarriers = mons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_THUNDERBOLT"));
const level50Carriers = allCarriers.filter((entry: { index: number }) => entry.index >= level50.first && entry.index <= level50.last);
const firstCarrier = level50Carriers[0];
const status = coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_THUNDERBOLT")?.status ?? "unsupported";
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "spark-2-electricity");
const siblingStatus = (moveName: string) => coverage.entries.find((entry: { move: string }) => entry.move === moveName)?.status ?? "unsupported";
const siblingGraph = (moveName: string) => graph.moves.find((entry: { move: string }) => entry.move === moveName);

requireText(thunderbolt, [
  "loadspritegfx ANIM_TAG_SPARK",
  "loadspritegfx ANIM_TAG_SHOCK_3",
  "loadspritegfx ANIM_TAG_SPARK_2",
  "createvisualtask AnimTask_ElectricBolt, 5, 24, -52, 0",
  "createvisualtask AnimTask_ElectricBolt, 5, -24, -52, 0",
  "createvisualtask AnimTask_ElectricBolt, 5, 0, -60, 1",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 0, 0, 13, RGB_BLACK",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 0, 13, 0, RGB_BLACK",
  "createsprite gThunderboltOrbSpriteTemplate, ANIM_TARGET, 3, 44, 0, 0, 3",
  "playsewithpan SE_M_HYPER_BEAM, SOUND_PAN_TARGET",
  "waitplaysewithpan SE_M_THUNDERBOLT2, SOUND_PAN_TARGET, 19",
  "call ElectricityEffect",
]);
requireText(electricity, [
  "playsewithpan SE_M_THUNDERBOLT2, SOUND_PAN_TARGET",
  "createsprite gElectricitySpriteTemplate, ANIM_TARGET, 2, 5, 0, 5, 0",
  "createsprite gElectricitySpriteTemplate, ANIM_TARGET, 2, -20, 15, 5, 1",
  "return",
]);
requireText(effects, [
  "const struct SpriteTemplate gThunderboltOrbSpriteTemplate",
  ".oam = &gOamData_AffineNormal_ObjNormal_32x32",
  ".anims = sAnims_ThunderboltOrb",
  ".affineAnims = sAffineAnims_ThunderboltOrb",
  ".callback = AnimThunderboltOrb",
  "static void AnimThunderboltOrb_Step(struct Sprite *sprite)",
  "const struct SpriteTemplate gSparkElectricityFlashingSpriteTemplate",
  ".callback = AnimSparkElectricityFlashing",
  "static void AnimSparkElectricityFlashing_Step(struct Sprite *sprite)",
  "const struct SpriteTemplate gElectricitySpriteTemplate",
  ".oam = &gOamData_AffineOff_ObjNormal_16x16",
  ".callback = AnimElectricity",
  "void AnimTask_ElectricBolt(u8 taskId)",
  "static void AnimTask_ElectricBolt_Step(u8 taskId)",
  "static void AnimElectricBoltSegment(struct Sprite *sprite)",
  "DestroyAnimVisualTask(taskId)",
]);
requireText(animData, [
  "{gBattleAnimSpriteGfx_Spark, 0x0300, ANIM_TAG_SPARK}",
  "{gBattleAnimSpriteGfx_Spark2, 0x0180, ANIM_TAG_SPARK_2}",
  "{gBattleAnimSpriteGfx_Shock3, 0x0600, ANIM_TAG_SHOCK_3}",
  "{gBattleAnimSpritePal_Spark, ANIM_TAG_SPARK}",
  "{gBattleAnimSpritePal_Spark2, ANIM_TAG_SPARK_2}",
  "{gBattleAnimSpritePal_Shock3, ANIM_TAG_SHOCK_3}",
]);

if (JSON.stringify(graphEntry?.blocks) !== JSON.stringify(["Move_THUNDERBOLT", "ElectricityEffect"])
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(expectedComponents)
  || rootCommands.loadspritegfx !== 3 || rootCommands.createvisualtask !== 11
  || rootCommands.waitforvisualfinish !== 6 || rootCommands.delay !== 11
  || rootCommands.playsewithpan !== 4 || rootCommands.createsprite !== 9
  || rootCommands.waitplaysewithpan !== 1 || rootCommands.call !== 1 || rootCommands.end !== 1
  || electricityCommands.playsewithpan !== 1 || electricityCommands.createsprite !== 8
  || electricityCommands.delay !== 7 || electricityCommands.return !== 1
  || !utility.includes("void AnimTask_BlendBattleAnimPal(u8 taskId)")
  || move?.id !== 85 || move?.effect !== "EFFECT_PARALYZE_HIT" || move?.frontierMonCount !== 68 || move?.speciesCount !== 35
  || allCarriers.length !== 76 || level50Carriers.length !== 68
  || firstCarrier?.index !== 267 || firstCarrier?.label !== "FRONTIER_MON_DELCATTY_2"
  || firstCarrier?.species !== "SPECIES_DELCATTY" || firstCarrier?.itemName !== "BATTLE_FRONTIER_ITEM_QUICK_CLAW"
  || firstCarrier?.nature !== "NATURE_MODEST" || status !== "unsupported"
  || JSON.stringify(track?.components) !== JSON.stringify([
    "asset:ANIM_TAG_SPARK_2", "sprite:gSparkElectricitySpriteTemplate", "sprite:gSparkElectricityFlashingSpriteTemplate",
    "sprite:gElectricitySpriteTemplate", "subroutine:ElectricityEffect", "visualCommand:blend_color_cycle",
    "sprite:gHorizontalLungeSpriteTemplate", "task:AnimTask_ShakeMon", "visualCommand:create_basic_hitsplat_sprite",
  ])) {
  throw new Error("MOVE_THUNDERBOLT source/carrier/component/status contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_THUNDERBOLT", moveId: 85, status,
  pointerOwned: {
    root: { ...rootInterval, bytes: undefined },
    subroutine: { ...electricityInterval, bytes: undefined },
    combined: {
      byteLength: rootInterval.byteLength + electricityInterval.byteLength,
      romSha256: createHash("sha256").update(rootInterval.bytes).update(electricityInterval.bytes).digest("hex"),
      sourceByteLength: Buffer.byteLength(thunderbolt) + Buffer.byteLength(electricity),
      sourceSha256: createHash("sha256").update(thunderbolt).update(electricity).digest("hex"),
    },
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  commands: { root: rootCommands, electricityEffect: electricityCommands },
  dispatch: {
    assets: ["ANIM_TAG_SPARK", "ANIM_TAG_SHOCK_3", "ANIM_TAG_SPARK_2"],
    electricBolts: [[24, -52, 0], [-24, -52, 0], [0, -60, 1]],
    targetPalette: [[0, 13], [13, 0]],
    backgroundPalette: [[0, 6], [2, 2], [6, 6], [2, 2], [6, 6], [6, 0]],
    orb: { count: 1, args: [44, 0, 0, 3] },
    flashingSparks: { count: 8, radii: [32, 32, 32, 32, 16, 16, 16, 16], phase: [0, 64, 128, 192, 32, 96, 160, 224], tileVariants: [0, 1, 0, 2, 0, 1, 0, 2], targetFlag: -32765 },
    electricityArcs: { count: 8, offsets: [[5, 0, 0], [-5, 10, 1], [15, 20, 2], [-15, -10, 0], [25, 0, 1], [-8, 8, 2], [2, -8, 0], [-20, 15, 1]], lifetime: 5 },
  },
  callbacks: {
    orb: "AnimThunderboltOrb -> AnimThunderboltOrb_Step: target X_2/Y_PIC_OFFSET, target-side x mirror, 44-tick lifetime and invisibility period 3",
    flashing: "AnimSparkElectricityFlashing -> Step: target-selected by high-bit arg, affine 20-degree loop, phase/cosine offsets, tile variants, 44-tick lifetime",
    electricity: "AnimElectricity: target placement, tile variants 0/1/2 (normal/H-flip/V-flip), 5-tick WaitAnimForDuration then DestroyAnimSprite",
    bolt: "AnimTask_ElectricBolt -> Step creates five descending gElectricBoltSegmentSpriteTemplate pieces every two task ticks, then destroys the visual task",
  },
  assets: {
    spark: { tileBytes: 0x300, palette: "gBattleAnimSpritePal_Spark", boltTemplate: "gElectricBoltSegmentSpriteTemplate", oam: "gOamData_AffineOff_ObjNormal_8x8" },
    spark2: { tileBytes: 0x180, palette: "gBattleAnimSpritePal_Spark2", flashingTemplate: "gSparkElectricityFlashingSpriteTemplate", electricityTemplate: "gElectricitySpriteTemplate" },
    shock3: { tileBytes: 0x600, palette: "gBattleAnimSpritePal_Shock3", orbTemplate: "gThunderboltOrbSpriteTemplate", oam: "gOamData_AffineNormal_ObjNormal_32x32" },
  },
  audio: {
    bolt: ["SE_M_THUNDERBOLT", "SOUND_PAN_TARGET", 3],
    impact: ["SE_M_HYPER_BEAM", "SOUND_PAN_TARGET"],
    completion: ["SE_M_THUNDERBOLT2", "SOUND_PAN_TARGET", 19],
    electricity: ["SE_M_THUNDERBOLT2", "SOUND_PAN_TARGET"],
  },
  cleanup: ["all sprite callbacks self-destroy", "AnimTask_ElectricBolt destroys its visual task", "waitforvisualfinish", "F_PAL_BG 6->0", "end"],
  carrier: {
    lowestLevel50Set: 267, frontierMon: "FRONTIER_MON_DELCATTY_2", speciesId: 316, itemId: 183, nature: "NATURE_MODEST",
    allLevel50Sets: level50Carriers.map((entry: { index: number }) => entry.index),
    allInventorySets: allCarriers.map((entry: { index: number }) => entry.index),
    excludedOpenOnly: allCarriers.filter((entry: { index: number }) => entry.index > level50.last).map((entry: { index: number }) => entry.index),
  },
  siblings: ["MOVE_SPARK", "MOVE_THUNDER_WAVE", "MOVE_ZAP_CANNON", "MOVE_SHOCK_WAVE"].map((moveName) => ({
    move: moveName, status: siblingStatus(moveName), blocks: siblingGraph(moveName)?.blocks,
  })),
}, null, 2));
