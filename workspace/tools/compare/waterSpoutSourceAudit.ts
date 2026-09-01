/** Authoritative source, generated graph, carrier, callback, and staging audit for Water Spout. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const water = read("reference/pokeemerald/src/battle_anim_water.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const registry = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

function address(symbol: string): number {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
}
function block(source: string, start: string, end: string): string {
  const from = source.indexOf(start); const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const move = block(scripts, "Move_WATER_SPOUT:", "Move_SHADOW_PUNCH:");
const rows = move.trim().split("\n").slice(1, -1).map((row: string) => row.trim());
const expectedRows = [
  "loadspritegfx ANIM_TAG_GLOWY_BLUE_ORB", "loadspritegfx ANIM_TAG_WATER_IMPACT",
  "monbg ANIM_DEF_PARTNER", "setalpha 12, 8", "createvisualtask AnimTask_WaterSpoutLaunch, 5",
  "playsewithpan SE_M_HEADBUTT, SOUND_PAN_ATTACKER", "delay 44",
  "playsewithpan SE_M_DIVE, SOUND_PAN_ATTACKER", "waitforvisualfinish", "delay 16",
  "createvisualtask AnimTask_WaterSpoutRain, 5", "playsewithpan SE_M_SURF, SOUND_PAN_TARGET",
  "clearmonbg ANIM_DEF_PARTNER", "blendoff",
];
const components = [
  "asset:ANIM_TAG_GLOWY_BLUE_ORB", "asset:ANIM_TAG_WATER_IMPACT",
  "task:AnimTask_WaterSpoutLaunch", "task:AnimTask_WaterSpoutRain",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha",
] as const;
const launch = block(water, "\nvoid AnimTask_WaterSpoutLaunch(u8 taskId)\n", "\nvoid AnimTask_WaterSpoutRain(u8 taskId)\n");
const rain = block(water, "\nvoid AnimTask_WaterSpoutRain(u8 taskId)\n", "\nvoid AnimTask_WaterSport(u8 taskId)\n");
const orbTemplate = block(water, "const struct SpriteTemplate gSmallWaterOrbSpriteTemplate", "static const union AnimCmd sAnim_WaterPulseBubble_0");
const impactTemplate = block(normal, "const struct SpriteTemplate gWaterHitSplatSpriteTemplate", "const struct SpriteTemplate gRandomPosHitSplatSpriteTemplate");
const moveInventory = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_WATER_SPOUT");
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_WATER_SPOUT");
const carriers = frontier.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_WATER_SPOUT"));
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "water-spout-launch-rain");
const coverageEntry = coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_WATER_SPOUT");
const romSha = sha(rom.subarray(0x082c_ef63 - 0x0800_0000, 0x082c_ef91 - 0x0800_0000));

if (
  address("Move_WATER_SPOUT") !== 0x082c_ef63 || address("Move_SHADOW_PUNCH") !== 0x082c_ef91
  || romSha !== "12cfc67aec4cbf0c9c3f298f5bf167b59ab62f85ddd08dba047b9e8a4d081a40"
  || Buffer.byteLength(move) !== 449 || sha(move) !== "1686e737688e28e8f0a76d50964216fc846e0a1545a569295a6eff1bdbc0c2d7"
  || JSON.stringify(rows) !== JSON.stringify(expectedRows)
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(components)
  || moveInventory?.id !== 323 || moveInventory?.effect !== "EFFECT_ERUPTION" || moveInventory?.frontierMonCount !== 1
  || carriers.length !== 1 || carriers[0]?.index !== 275 || carriers[0]?.label !== "FRONTIER_MON_WAILMER_2"
  || carriers[0]?.species !== "SPECIES_WAILMER" || carriers[0]?.nature !== "NATURE_DOCILE"
  || JSON.stringify(carriers[0]?.moves) !== JSON.stringify(["MOVE_WATER_SPOUT", "MOVE_EARTHQUAKE", "MOVE_BODY_SLAM", "MOVE_REST"])
  || JSON.stringify(carriers[0]?.evSpreadStats) !== JSON.stringify(["F_EV_SPREAD_SP_DEFENSE", "F_EV_SPREAD_DEFENSE"])
  || address("gSmallWaterOrbSpriteTemplate") !== 0x0859_5268 || address("gWaterHitSplatSpriteTemplate") !== 0x0859_7388
  || address("AnimTask_WaterSpoutLaunch") !== 0x0810_80e4 || address("AnimTask_WaterSpoutRain") !== 0x0810_85c8
  || !orbTemplate.includes(".tileTag = ANIM_TAG_GLOWY_BLUE_ORB") || !orbTemplate.includes(".oam = &gOamData_AffineOff_ObjNormal_8x8")
  || !orbTemplate.includes(".callback = AnimSmallWaterOrb")
  || !impactTemplate.includes(".tileTag = ANIM_TAG_WATER_IMPACT") || !impactTemplate.includes(".oam = &gOamData_AffineNormal_ObjBlend_32x32")
  || !launch.includes("task->data[1] = GetWaterSpoutPowerForAnim()") || !launch.includes("maxhp /= 4")
  || !launch.includes("s16 increment = 4 - task->data[1]") || !launch.includes("for (i = 0; i < 20; i += increment)")
  || !launch.includes("PrepareBattlerSpriteForRotScale") || !launch.includes("ResetSpriteRotScale")
  || !rain.includes("task->data[12] = task->data[1] * 5 + 5") || !rain.includes("ISO_RANDOMIZE2(task->data[7])")
  || !rain.includes("CreateTask(AnimTask_HorizontalShake, 80)") || !rain.includes("gBattleAnimArgs[0] = ANIM_DEF_PARTNER")
  || !rain.includes("StartSpriteAffineAnim(&gSprites[sprite->data[1]], 3)") || !rain.includes("FreeOamMatrix(sprite->oam.matrixNum)")
  || !graphics.includes('gBattleAnimSpriteGfx_GlowyRedOrb[] = INCGFX_U32("graphics/battle_anims/sprites/glowy_red_orb.png"')
  || !graphics.includes('gBattleAnimSpritePal_GlowyBlueOrb[] = INCGFX_U32("graphics/battle_anims/sprites/glowy_blue_orb.pal"')
  || !graphics.includes('gBattleAnimSpriteGfx_WaterImpact[] = INCGFX_U32("graphics/battle_anims/sprites/water_impact.png"')
  || !registry.includes("{gBattleAnimSpriteGfx_GlowyRedOrb, 0x0020, ANIM_TAG_GLOWY_BLUE_ORB}")
  || !registry.includes("{gBattleAnimSpriteGfx_WaterImpact, 0x0200, ANIM_TAG_WATER_IMPACT}")
  || !constants.includes("#define ANIM_TAG_GLOWY_BLUE_ORB             (ANIM_SPRITES_START + 268)")
  || !constants.includes("#define ANIM_TAG_WATER_IMPACT               (ANIM_SPRITES_START + 148)")
  || coverageEntry !== undefined || track?.fulfilled !== false || JSON.stringify(track?.components) !== JSON.stringify(components)
) throw new Error("MOVE_WATER_SPOUT source/carrier/graph/callback/coverage contract changed");

console.log(JSON.stringify({
  move: "MOVE_WATER_SPOUT", moveId: 323,
  sourceBounds: { start: "0x082cef63", endExclusive: "0x082cef91", bytes: "0x2e", sha256: romSha },
  sourceText: { bytes: 449, sha256: "1686e737688e28e8f0a76d50964216fc846e0a1545a569295a6eff1bdbc0c2d7", commandRows: 14 },
  carrier: { firstLevel50: "set 275 FRONTIER_MON_WAILMER_2 / SPECIES_WAILMER / MOVE_WATER_SPOUT", remainingLevel50: [275] },
  components,
  liveFacts: {
    powerTier: "GetWaterSpoutPowerForAnim returns 0..3 from the live attacker's current HP quarter; the legal full-HP stages prove tier 3 only",
    launch: "tier controls increment=4-tier for the 0..<20 launch-orb loop; attacker affine deformation and geometry are live",
    rain: "tier controls 5*tier+5 rain attempts; side selects x/y bounds, ISO_RANDOMIZE2 controls x layout, impacts use affine animation 3",
    shake: "first rain impact creates HorizontalShake(target,0,12) and a defender-partner task that aborts in singles",
  },
  audio: ["SE_M_HEADBUTT / SOUND_PAN_ATTACKER", "SE_M_DIVE / SOUND_PAN_ATTACKER after 44 frames", "SE_M_SURF / SOUND_PAN_TARGET"],
  checkpoint: { coverageEntry: "absent/unsupported", track: "water-spout-launch-rain", fulfilled: false },
}, null, 2));
