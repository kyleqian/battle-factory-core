/** Authoritative source/component census for MOVE_ZAP_CANNON. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_electric.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");

const expectedComponents = [
  "asset:ANIM_TAG_BLACK_BALL_2",
  "asset:ANIM_TAG_SPARK_2",
  "sprite:gElectricitySpriteTemplate",
  "sprite:gZapCannonBallSpriteTemplate",
  "sprite:gZapCannonSparkSpriteTemplate",
  "subroutine:ElectricityEffect",
  "task:AnimTask_ShakeMon2",
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
  for (const token of required) if (!body.includes(token)) throw new Error(`missing source text: ${token}`);
}

const zap = sourceBlock("Move_ZAP_CANNON", "Move_STEEL_WING");
const electricity = sourceBlock("ElectricityEffect", "ConfusionEffect");
const zapCommands = commandCounts(zap);
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
    symbol: label, start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`,
    byteLength: bytes.length, romSha256: sha(bytes), sourceByteLength: Buffer.byteLength(body), sourceSha256: sha(body), bytes,
  };
}

const rootInterval = pointerOwned("Move_ZAP_CANNON", "Move_STEEL_WING", zap);
const electricityInterval = pointerOwned("ElectricityEffect", "ConfusionEffect", electricity);
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_ZAP_CANNON");
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_ZAP_CANNON");
const level50 = inventory.tiers.level50.monIndices;
const allCarriers = mons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_ZAP_CANNON"));
const level50Carriers = allCarriers.filter((entry: { index: number }) => entry.index >= level50.first && entry.index <= level50.last);
const firstCarrier = level50Carriers[0];
const status = coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_ZAP_CANNON")?.status ?? "unsupported";
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "spark-2-electricity");
const siblingStatus = (moveName: string) => coverage.entries.find((entry: { move: string }) => entry.move === moveName)?.status ?? "unsupported";
const siblingGraph = (moveName: string) => graph.moves.find((entry: { move: string }) => entry.move === moveName);

requireText(zap, [
  "loadspritegfx ANIM_TAG_BLACK_BALL_2", "loadspritegfx ANIM_TAG_SPARK_2",
  "playsewithpan SE_M_THUNDER_WAVE, SOUND_PAN_ATTACKER",
  "createsprite gZapCannonBallSpriteTemplate, ANIM_TARGET, 3, 10, 0, 0, 0, 30, 0",
  "createsprite gZapCannonSparkSpriteTemplate, ANIM_TARGET, 4, 10, 0, 16, 30, 0, 40, 0",
  "createsprite gZapCannonSparkSpriteTemplate, ANIM_TARGET, 4, 10, 0, 8, 30, 224, 40, 2",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 5, 1",
  "waitplaysewithpan SE_M_THUNDERBOLT2, SOUND_PAN_TARGET, 19", "call ElectricityEffect",
]);
requireText(electricity, ["playsewithpan SE_M_THUNDERBOLT2, SOUND_PAN_TARGET", "createsprite gElectricitySpriteTemplate", "return"]);
requireText(effects, [
  "const struct SpriteTemplate gZapCannonBallSpriteTemplate", "const struct SpriteTemplate gZapCannonSparkSpriteTemplate",
  ".tileTag = ANIM_TAG_BLACK_BALL_2", ".callback = TranslateAnimSpriteToTargetMonLocation",
  ".callback = AnimZapCannonSpark", "static void AnimZapCannonSpark_Step",
  "const struct SpriteTemplate gElectricitySpriteTemplate",
  "static void AnimElectricity", "DestroyAnimSprite",
]);
requireText(animData, [
  "{gBattleAnimSpriteGfx_BlackBall2, 0x0080, ANIM_TAG_BLACK_BALL_2}",
  "{gBattleAnimSpritePal_BlackBall2, ANIM_TAG_BLACK_BALL_2}",
  "{gBattleAnimSpriteGfx_Spark2, 0x0180, ANIM_TAG_SPARK_2}",
  "{gBattleAnimSpritePal_Spark2, ANIM_TAG_SPARK_2}",
]);

if (JSON.stringify(graphEntry?.blocks) !== JSON.stringify(["Move_ZAP_CANNON", "ElectricityEffect"])
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(expectedComponents)
  || zapCommands.loadspritegfx !== 2 || zapCommands.createsprite !== 9
  || zapCommands.createvisualtask !== 1 || zapCommands.waitforvisualfinish !== 2
  || zapCommands.delay !== 1 || zapCommands.playsewithpan !== 1
  || zapCommands.waitplaysewithpan !== 1 || zapCommands.call !== 1 || zapCommands.end !== 1
  || electricityCommands.playsewithpan !== 1 || electricityCommands.createsprite !== 8
  || electricityCommands.delay !== 7 || electricityCommands.return !== 1
  || move?.id !== 192 || move?.effect !== "EFFECT_PARALYZE_HIT" || move?.frontierMonCount !== 1 || move?.speciesCount !== 1
  || allCarriers.length !== 1 || level50Carriers.length !== 1
  || firstCarrier?.index !== 575 || firstCarrier?.label !== "FRONTIER_MON_FORRETRESS_3"
  || firstCarrier?.species !== "SPECIES_FORRETRESS" || firstCarrier?.itemName !== "BATTLE_FRONTIER_ITEM_FOCUS_BAND"
  || firstCarrier?.nature !== "NATURE_QUIET" || status !== "exact" || track?.fulfilled !== true
  || JSON.stringify(track?.components) !== JSON.stringify([
    "asset:ANIM_TAG_SPARK_2", "sprite:gSparkElectricitySpriteTemplate", "sprite:gSparkElectricityFlashingSpriteTemplate",
    "sprite:gElectricitySpriteTemplate", "subroutine:ElectricityEffect", "visualCommand:blend_color_cycle",
    "sprite:gHorizontalLungeSpriteTemplate", "task:AnimTask_ShakeMon", "visualCommand:create_basic_hitsplat_sprite",
  ])) throw new Error("MOVE_ZAP_CANNON source/carrier/component/status contract changed");

console.log(JSON.stringify({
  move: "MOVE_ZAP_CANNON", moveId: 192, status,
  pointerOwned: {
    root: { ...rootInterval, bytes: undefined }, subroutine: { ...electricityInterval, bytes: undefined },
    combined: {
      byteLength: rootInterval.byteLength + electricityInterval.byteLength,
      romSha256: sha(Buffer.concat([rootInterval.bytes, electricityInterval.bytes])),
      sourceByteLength: Buffer.byteLength(zap) + Buffer.byteLength(electricity),
      sourceSha256: sha(`${zap}${electricity}`),
    },
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  commands: { root: zapCommands, electricityEffect: electricityCommands },
  dispatch: {
    assets: ["ANIM_TAG_BLACK_BALL_2", "ANIM_TAG_SPARK_2"],
    projectile: { template: "gZapCannonBallSpriteTemplate", args: [10, 0, 0, 0, 0, 30, 0], lifetime: "TranslateAnimSpriteToTargetMonLocation" },
    orbitingSparks: { template: "gZapCannonSparkSpriteTemplate", count: 8, radii: [16, 16, 16, 16, 8, 8, 8, 8], phase: [0, 64, 128, 192, 32, 96, 160, 224], period: 40, tileVariants: [0, 1, 0, 2, 0, 1, 0, 2] },
    targetShake: { task: "AnimTask_ShakeMon2", args: ["ANIM_TARGET", 4, 0, 5, 1] },
    electricityArcs: { subroutine: "ElectricityEffect", count: 8, lifetime: 5 },
  },
  assets: {
    blackBall2: { tileBytes: 0x80, palette: "gBattleAnimSpritePal_BlackBall2", template: "gZapCannonBallSpriteTemplate", oam: "gOamData_AffineOff_ObjNormal_16x16" },
    spark2: { tileBytes: 0x180, palette: "gBattleAnimSpritePal_Spark2", template: "gZapCannonSparkSpriteTemplate", electricityTemplate: "gElectricitySpriteTemplate" },
  },
  audio: {
    initial: ["SE_M_THUNDER_WAVE", "SOUND_PAN_ATTACKER"],
    completion: ["SE_M_THUNDERBOLT2", "SOUND_PAN_TARGET", 19],
    electricity: ["SE_M_THUNDERBOLT2", "SOUND_PAN_TARGET"],
  },
  cleanup: ["all sprite callbacks self-destroy", "AnimTask_ShakeMon2 completes", "waitforvisualfinish", "end"],
  carrier: {
    lowestLevel50Set: firstCarrier.index, frontierMon: firstCarrier.label, speciesId: 205, itemId: 196, nature: "NATURE_QUIET",
    allLevel50Sets: level50Carriers.map((entry: { index: number }) => entry.index),
    allInventorySets: allCarriers.map((entry: { index: number }) => entry.index), excludedOpenOnly: [],
  },
  siblings: ["MOVE_SPARK", "MOVE_THUNDERBOLT", "MOVE_THUNDER_WAVE", "MOVE_SHOCK_WAVE", "MOVE_ZAP_CANNON"].filter((name) => name !== "MOVE_ZAP_CANNON").concat("MOVE_ZAP_CANNON").map((moveName) => ({
    move: moveName, status: siblingStatus(moveName), blocks: siblingGraph(moveName)?.blocks,
  })),
}, null, 2));
