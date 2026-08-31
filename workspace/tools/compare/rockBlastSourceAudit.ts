/** Authoritative source, generated graph, carrier, and art-identity audit for Rock Blast. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (bytes: string): string => createHash("sha256").update(bytes).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const rock = read("reference/pokeemerald/src/battle_anim_rock.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const monMovement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animationData = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const movesSource = read("reference/pokeemerald/src/data/battle_moves.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const existingRocksAsset = JSON.parse(read("src/assets/gen/battle-anim-rocks.json"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});

function address(symbol: string): number {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
}

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

function labelBlock(source: string, start: string, end: string): string {
  return block(source, `${start}:`, `${end}:`);
}

const move = labelBlock(scripts, "Move_ROCK_BLAST", "Move_OVERHEAT");
const scriptRows = move.trim().split("\n").slice(1, -1).map((row: string) => row.trim());
const expectedComponents = [
  "asset:ANIM_TAG_IMPACT",
  "asset:ANIM_TAG_ROCKS",
  "sprite:gHorizontalLungeSpriteTemplate",
  "sprite:gRockBlastRockSpriteTemplate",
  "sprite:gRockFragmentSpriteTemplate",
  "task:AnimTask_ShakeMon",
  "visualCommand:create_basic_hitsplat_sprite",
];
const expectedRows = [
  "loadspritegfx ANIM_TAG_ROCKS",
  "loadspritegfx ANIM_TAG_IMPACT",
  "createsprite gHorizontalLungeSpriteTemplate, ANIM_ATTACKER, 2, 4, 6",
  "delay 3",
  "playsewithpan SE_M_SWAGGER, SOUND_PAN_ATTACKER",
  "createsprite gRockBlastRockSpriteTemplate, ANIM_TARGET, 2, 16, 0, 0, 0, 25, 257",
  "waitforvisualfinish",
  "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=1",
  "playsewithpan SE_M_ROCK_THROW, SOUND_PAN_TARGET",
  "createsprite gRockFragmentSpriteTemplate, ANIM_TARGET, 2, 0, 0, 20, 24, 14, 2",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 3, 0, 5, 1",
  "createsprite gRockFragmentSpriteTemplate, ANIM_TARGET, 2, 5, 0, -20, 24, 14, 1",
  "createsprite gRockFragmentSpriteTemplate, ANIM_TARGET, 2, 0, 5, 20, -24, 14, 2",
  "createsprite gRockFragmentSpriteTemplate, ANIM_TARGET, 2, -5, 0, -20, -24, 14, 2",
  "waitforvisualfinish",
];
const moveInventory = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_ROCK_BLAST");
const moveGraph = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_ROCK_BLAST");
const range = inventory.tiers.level50.monIndices;
const allCarriers = mons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_ROCK_BLAST"));
const legalCarriers = allCarriers.filter((entry: { index: number }) => entry.index >= range.first && entry.index <= range.last);
const firstCarrier = legalCarriers[0];
const lowOutOfTierCarrier = allCarriers[0];
const status = (moveName: string): string | undefined => coverage.entries.find(
  (entry: { move: string }) => entry.move === moveName,
)?.status;
const rockBlastTrack = coverage.componentTracks.find((track: { id: string }) => track.id === "rock-blast-first-body");

const rockBlastTemplate = block(rock, "const struct SpriteTemplate gRockBlastRockSpriteTemplate", "const struct SpriteTemplate gRockScatterSpriteTemplate");
const fragmentTemplate = block(rock, "const struct SpriteTemplate gRockFragmentSpriteTemplate", "const struct SpriteTemplate gSwirlingDirtSpriteTemplate");
const lungeTemplate = block(monMovement, "const struct SpriteTemplate gHorizontalLungeSpriteTemplate", "const struct SpriteTemplate gVerticalDipSpriteTemplate");
const hitSplatTemplate = block(normal, "const struct SpriteTemplate gBasicHitSplatSpriteTemplate", "const struct SpriteTemplate gHandleInvertHitSplatSpriteTemplate");
const rockBlastMove = block(movesSource, "[MOVE_ROCK_BLAST] =", "[MOVE_SHOCK_WAVE] =");

if (
  address("Move_ROCK_BLAST") !== 0x082d_65f7
  || address("Move_OVERHEAT") !== 0x082d_6694
  || address("gHorizontalLungeSpriteTemplate") !== 0x0857_fe28
  || address("gRockFragmentSpriteTemplate") !== 0x0859_6b1c
  || address("gRockBlastRockSpriteTemplate") !== 0x0859_6c98
  || address("gBasicHitSplatSpriteTemplate") !== 0x0859_7358
  || address("AnimTask_ShakeMon") !== 0x080d_51ac
  || address("AnimRockFragment") !== 0x0811_0ab4
  || address("AnimRockBlastRock") !== 0x0811_1418
  || address("gBattleAnimSpriteGfx_Rocks") !== 0x08c0_aa2c
  || address("gBattleAnimSpritePal_Rocks") !== 0x08c0_ae94
  || address("gBattleAnimSpriteGfx_Impact") !== 0x08c1_a3a0
  || address("gBattleAnimSpritePal_Impact") !== 0x08c1_a478
  || Buffer.byteLength(move) !== 860
  || sha(move) !== "42acd62b1a932dada9c90efddc72b12231930c4cf6e7fc97869b82c288f112c5"
  || JSON.stringify(scriptRows) !== JSON.stringify(expectedRows)
  || (move.match(/createsprite gRockFragmentSpriteTemplate/g) ?? []).length !== 4
  || !rockBlastTemplate.includes(".oam = &gOamData_AffineNormal_ObjNormal_32x32")
  || !rockBlastTemplate.includes(".anims = sAnims_BasicRock")
  || !rockBlastTemplate.includes(".affineAnims = sAffineAnims_BasicRock")
  || !rockBlastTemplate.includes(".callback = AnimRockBlastRock")
  || !fragmentTemplate.includes(".oam = &gOamData_AffineOff_ObjNormal_32x32")
  || !fragmentTemplate.includes(".anims = sAnims_FlyingRock")
  || !fragmentTemplate.includes(".callback = AnimRockFragment")
  || !lungeTemplate.includes(".tileTag = 0")
  || !lungeTemplate.includes(".callback = DoHorizontalLunge")
  || !hitSplatTemplate.includes(".tileTag = ANIM_TAG_IMPACT")
  || !hitSplatTemplate.includes(".oam = &gOamData_AffineNormal_ObjBlend_32x32")
  || !hitSplatTemplate.includes(".callback = AnimHitSplatBasic")
  || !rock.includes("StartSpriteAnim(sprite, gBattleAnimArgs[5])")
  || !rock.includes("TranslateAnimSpriteToTargetMonLocation(sprite)")
  || !normal.includes("StartSpriteAffineAnim(sprite, cmd->animation)")
  || !normal.includes("StoreSpriteCallbackInData6(sprite, DestroyAnimSprite)")
  || !monMovement.includes("gSprites[spriteId].x2 = gBattleAnimArgs[1]")
  || !macros.includes("createsprite gBasicHitSplatSpriteTemplate, \\anim_battler, \\subpriority_offset, \\x, \\y, \\relative_to, \\animation")
  || !graphics.includes('gBattleAnimSpriteGfx_Rocks[] = INCGFX_U32("graphics/battle_anims/sprites/rocks.png"')
  || !graphics.includes('gBattleAnimSpritePal_Rocks[] = INCGFX_U32("graphics/battle_anims/sprites/rocks.png"')
  || !graphics.includes('gBattleAnimSpriteGfx_Impact[] = INCGFX_U32("graphics/battle_anims/sprites/impact.png"')
  || !graphics.includes('gBattleAnimSpritePal_Impact[] = INCGFX_U32("graphics/battle_anims/sprites/impact.png"')
  || !animationData.includes("{gBattleAnimSpriteGfx_Rocks, 0x0C00, ANIM_TAG_ROCKS}")
  || !animationData.includes("{gBattleAnimSpritePal_Rocks, ANIM_TAG_ROCKS}")
  || !animationData.includes("{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}")
  || !animationData.includes("{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}")
  || !constants.includes("#define ANIM_TAG_ROCKS                      (ANIM_SPRITES_START + 58)")
  || !constants.includes("#define ANIM_TAG_IMPACT                     (ANIM_SPRITES_START + 135)")
  || !rockBlastMove.includes(".effect = EFFECT_MULTI_HIT")
  || !rockBlastMove.includes(".power = 25")
  || !rockBlastMove.includes(".accuracy = 80")
  || moveInventory?.id !== 350
  || moveInventory?.effect !== "EFFECT_MULTI_HIT"
  || moveInventory?.frontierMonCount !== 2
  || JSON.stringify(moveGraph?.componentIds) !== JSON.stringify(expectedComponents)
  || lowOutOfTierCarrier?.index !== 70
  || lowOutOfTierCarrier?.label !== "FRONTIER_MON_GEODUDE"
  || firstCarrier?.index !== 133
  || firstCarrier?.label !== "FRONTIER_MON_RHYHORN"
  || firstCarrier?.species !== "SPECIES_RHYHORN"
  || JSON.stringify(firstCarrier?.moves) !== JSON.stringify([
    "MOVE_ROCK_BLAST", "MOVE_DIG", "MOVE_SCARY_FACE", "MOVE_ROAR",
  ])
  || firstCarrier?.itemName !== "BATTLE_FRONTIER_ITEM_FOCUS_BAND"
  || firstCarrier?.nature !== "NATURE_HARDY"
  || JSON.stringify(firstCarrier?.evSpreadStats) !== JSON.stringify([
    "F_EV_SPREAD_ATTACK", "F_EV_SPREAD_HP",
  ])
  || legalCarriers.length !== 2
  || JSON.stringify(legalCarriers.map((entry: { index: number }) => entry.index)) !== JSON.stringify([133, 256])
  || existingRocksAsset.source !== "graphics/battle_anims/sprites/rocks.png (src/graphics.c:203-204, ANIM_TAG_ROCKS)"
  || JSON.stringify(existingRocksAsset.basicRockAnims) !== JSON.stringify({
    source: "src/battle_anim_rock.c:145-190 (sAnims_BasicRock)",
    cells: [0, 1, 2, 3, 4, 5],
    tileRowOffsets: [0, 4, 8, 12, 16, 20],
  })
  || status("MOVE_ROCK_BLAST") !== undefined
  || rockBlastTrack?.fulfilled !== false
  || JSON.stringify(rockBlastTrack?.representatives) !== JSON.stringify(["MOVE_ROCK_BLAST"])
  || JSON.stringify(rockBlastTrack?.components) !== JSON.stringify(expectedComponents)
  || status("MOVE_ROCK_THROW") !== "exact"
  || status("MOVE_ROCK_TOMB") !== "exact"
  || status("MOVE_ANCIENT_POWER") !== "exact"
) {
  throw new Error("MOVE_ROCK_BLAST source/carrier/component/art-identity/control contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_ROCK_BLAST",
  sourceBounds: { start: "0x082d65f7", endExclusive: "0x082d6694", bytes: "0x9d" },
  sourceText: { bytes: 860, sha256: "42acd62b1a932dada9c90efddc72b12231930c4cf6e7fc97869b82c288f112c5", commandRows: 15 },
  carrier: {
    firstLevel50: "set 133 FRONTIER_MON_RHYHORN / SPECIES_RHYHORN / MOVE_ROCK_BLAST",
    excludedOutOfTier: "set 70 FRONTIER_MON_GEODUDE is before the Level-50 inventory range 110..849",
    remainingLevel50: [133, 256],
  },
  components: expectedComponents,
  multiHit: {
    effect: "EFFECT_MULTI_HIT",
    ownership: "Evidence captures one first pointer-owned Move_ROCK_BLAST body through its first inactive cleanup; later hit bodies and battle outcome are excluded.",
  },
  artIdentity: {
    rocks: "battle-anim-rocks.json is the shared ANIM_TAG_ROCKS source asset; sAnims_BasicRock cells 0..5 map to tile rows 0,4,8,12,16,20, decoding the formerly missing cells 0/1/5",
    impact: "ANIM_TAG_IMPACT retains its existing source-derived production identity",
  },
  checkpoint: { coverageEntry: null, derivedStatus: "unsupported", track: "rock-blast-first-body", fulfilled: false },
  controls: {
    moves: ["MOVE_ROCK_THROW", "MOVE_ROCK_TOMB", "MOVE_ANCIENT_POWER"],
    statuses: ["exact", "exact", "exact"],
    independence: "Rock Blast receives no credit; exact controls retain independent acceptance.",
  },
}));
