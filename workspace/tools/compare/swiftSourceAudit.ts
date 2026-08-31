/** Authoritative source, carrier, graph, side/callback, and staging audit for Swift. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const monMovement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const animCore = read("reference/pokeemerald/src/battle_anim.c");
const animMons = read("reference/pokeemerald/src/battle_anim_mons.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const registry = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const moveData = read("reference/pokeemerald/src/data/battle_moves.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const impactAsset = JSON.parse(read("src/assets/gen/battle-anim-hitsplat.json"));
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
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

const move = block(scripts, "Move_SWIFT:", "Move_STRENGTH:");
const scriptRows = move.trim().split("\n").slice(1, -1).map((row: string) => row.trim());
const expectedRows = [
  "loadspritegfx ANIM_TAG_YELLOW_STAR",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_DEF_PARTNER",
  "setalpha 12, 8",
  "playsewithpan SE_M_SWIFT, SOUND_PAN_ATTACKER",
  "create_swift_star_sprite ANIM_TARGET, 3, initial_x=20, initial_y=-10, target_x=20, target_y=0, duration=22, wave_amplitude=20, target_both=TRUE",
  "delay 5",
  "playsewithpan SE_M_SWIFT, SOUND_PAN_ATTACKER",
  "create_swift_star_sprite ANIM_TARGET, 3, initial_x=20, initial_y=-10, target_x=20, target_y=5, duration=22, wave_amplitude=-18, target_both=TRUE",
  "delay 5",
  "playsewithpan SE_M_SWIFT, SOUND_PAN_ATTACKER",
  "create_swift_star_sprite ANIM_TARGET, 3, initial_x=20, initial_y=-10, target_x=20, target_y=-10, duration=22, wave_amplitude=15, target_both=TRUE",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 18, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_DEF_PARTNER, 2, 0, 18, 1",
  "delay 5",
  "playsewithpan SE_M_SWIFT, SOUND_PAN_ATTACKER",
  "create_swift_star_sprite ANIM_TARGET, 3, initial_x=20, initial_y=-10, target_x=20, target_y=0, duration=22, wave_amplitude=-20, target_both=TRUE",
  "delay 5",
  "playsewithpan SE_M_SWIFT, SOUND_PAN_ATTACKER",
  "create_swift_star_sprite ANIM_TARGET, 3, initial_x=20, initial_y=-10, target_x=20, target_y=0, duration=22, wave_amplitude=12, target_both=TRUE",
  "delay 5",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
];
const components = [
  "asset:ANIM_TAG_IMPACT",
  "asset:ANIM_TAG_YELLOW_STAR",
  "task:AnimTask_ShakeMon2",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:create_swift_star_sprite",
  "visualCommand:monbg",
  "visualCommand:setalpha",
] as const;
const swiftTemplate = block(effects, "const struct SpriteTemplate gSwiftStarSpriteTemplate", "static const union AnimCmd sAnim_ConstrictBinding");
const sineCallback = block(effects, "// Animates a sprite that moves linearly from one location to another", "// Animates particles in the Twister move animation");
const shakeCallback = block(monMovement, "\nvoid AnimTask_ShakeMon2(u8 taskId)\n", "\nvoid AnimTask_ShakeMonInPlace(u8 taskId)\n");
const monbgCommand = block(animCore, "static void Cmd_monbg(void)", "bool8 IsBattlerSpriteVisible");
const clearMonbgCommand = block(animCore, "static void Cmd_clearmonbg(void)", "// Equivalent to Cmd_monbg but never creates");
const averagePositions = block(animMons, "void SetAverageBattlerPositions", "u8 CreateInvisibleSpriteCopy");
const romRange = (start: number, end: number): string => sha(rom.subarray(start - 0x0800_0000, end - 0x0800_0000));
const level50Range = inventory.tiers.level50.monIndices;
const allCarriers = frontier.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_SWIFT"));
const legalCarriers = allCarriers.filter((entry: { index: number }) => entry.index >= level50Range.first && entry.index <= level50Range.last);
const firstCarrier = legalCarriers[0];
const moveInventory = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_SWIFT");
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_SWIFT");
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "swift-stars-source-staging");
const status = (moveName: string): string | undefined => coverage.entries.find(
  (entry: { move: string }) => entry.move === moveName,
)?.status;

if (
  address("Move_SWIFT") !== 0x082c_97a9
  || address("Move_STRENGTH") !== 0x082c_9862
  || address("gSwiftStarSpriteTemplate") !== 0x0859_2404
  || address("AnimTranslateLinearSingleSineWave") !== 0x080f_f0f4
  || address("AnimTask_ShakeMon2") !== 0x080d_52d0
  || romRange(0x082c_97a9, 0x082c_9862) !== "e147ce5f87abbaec77139982f5f09cc62026b5144cb282cfa8ac5b11364532da"
  || Buffer.byteLength(move) !== 1326
  || sha(move) !== "ad929378372e5300d56e3b84acdbee4a552fde3d1f6026c398968ba98f981b14"
  || JSON.stringify(scriptRows) !== JSON.stringify(expectedRows)
  || (move.match(/create_swift_star_sprite/g) ?? []).length !== 5
  || (move.match(/playsewithpan SE_M_SWIFT/g) ?? []).length !== 5
  || (move.match(/createvisualtask AnimTask_ShakeMon2/g) ?? []).length !== 2
  || move.includes("unloadspritegfx")
  || !macros.includes("createsprite gSwiftStarSpriteTemplate, \\anim_battler, \\subpriority_offset, \\initial_x, \\initial_y, \\target_x, \\target_y, \\duration, \\wave_amplitude, \\target_both")
  || !swiftTemplate.includes(".tileTag = ANIM_TAG_YELLOW_STAR")
  || !swiftTemplate.includes(".paletteTag = ANIM_TAG_YELLOW_STAR")
  || !swiftTemplate.includes(".oam = &gOamData_AffineNormal_ObjNormal_32x32")
  || !swiftTemplate.includes(".anims = gDummySpriteAnimTable")
  || !swiftTemplate.includes(".affineAnims = gSwiftStarAffineAnimTable")
  || !swiftTemplate.includes(".callback = AnimTranslateLinearSingleSineWave")
  || !sineCallback.includes("if (GetBattlerSide(gBattleAnimAttacker) != B_SIDE_PLAYER)")
  || !sineCallback.includes("cmd->targetX = -cmd->targetX")
  || !sineCallback.includes("if (!cmd->targetBoth)")
  || !sineCallback.includes("SetAverageBattlerPositions(gBattleAnimTarget, TRUE, &sprite->data[2], &sprite->data[4])")
  || !sineCallback.includes("if (GetBattlerSide(gBattleAnimAttacker) == GetBattlerSide(gBattleAnimTarget))")
  || !sineCallback.includes("DestroyAnimSprite(sprite)")
  || !averagePositions.includes("if (IsDoubleBattle() && !IsContest())")
  || !averagePositions.includes("partnerX = battlerX")
  || !averagePositions.includes("partnerY = battlerY")
  || !shakeCallback.includes("spriteId = GetAnimBattlerSpriteId(gBattleAnimArgs[0])")
  || !shakeCallback.includes("if (spriteId == SPRITE_NONE)")
  || !shakeCallback.includes("DestroyAnimVisualTask(taskId)")
  || !shakeCallback.includes("gSprites[spriteId].x2 = gBattleAnimArgs[1]")
  || !shakeCallback.includes("gSprites[gTasks[taskId].data[0]].x2 = 0")
  || !monbgCommand.includes("if (animBattler & ANIM_TARGET)")
  || !monbgCommand.includes("battler ^= BIT_FLANK")
  || !clearMonbgCommand.includes("else if (animBattlerId == ANIM_TARGET)")
  || !clearMonbgCommand.includes("animBattlerId = ANIM_DEF_PARTNER")
  || !graphics.includes('gBattleAnimSpriteGfx_YellowStar[] = INCGFX_U32("graphics/battle_anims/sprites/yellow_star.png", ".4bpp.lz")')
  || !graphics.includes('gBattleAnimSpritePal_YellowStar[] = INCGFX_U32("graphics/battle_anims/sprites/yellow_star.png", ".gbapal.lz")')
  || !graphics.includes('gBattleAnimSpriteGfx_Impact[] = INCGFX_U32("graphics/battle_anims/sprites/impact.png", ".4bpp.lz")')
  || !graphics.includes('gBattleAnimSpritePal_Impact[] = INCGFX_U32("graphics/battle_anims/sprites/impact.png", ".gbapal.lz")')
  || !registry.includes("{gBattleAnimSpriteGfx_YellowStar, 0x0200, ANIM_TAG_YELLOW_STAR}")
  || !registry.includes("{gBattleAnimSpritePal_YellowStar, ANIM_TAG_YELLOW_STAR}")
  || !registry.includes("{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}")
  || !registry.includes("{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}")
  || !constants.includes("#define ANIM_TAG_YELLOW_STAR                (ANIM_SPRITES_START + 174)")
  || !constants.includes("#define ANIM_TAG_IMPACT                     (ANIM_SPRITES_START + 135)")
  || !moveData.includes("[MOVE_SWIFT] =")
  || !moveData.includes(".effect = EFFECT_ALWAYS_HIT")
  || !moveData.includes(".power = 60")
  || moveInventory?.id !== 129
  || moveInventory?.effect !== "EFFECT_ALWAYS_HIT"
  || moveInventory?.frontierMonCount !== 6
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(components)
  || firstCarrier?.index !== 128
  || firstCarrier?.label !== "FRONTIER_MON_STARYU"
  || firstCarrier?.species !== "SPECIES_STARYU"
  || JSON.stringify(firstCarrier?.moves) !== JSON.stringify(["MOVE_BUBBLE_BEAM", "MOVE_MINIMIZE", "MOVE_SWIFT", "MOVE_LIGHT_SCREEN"])
  || firstCarrier?.itemName !== "BATTLE_FRONTIER_ITEM_SHELL_BELL"
  || firstCarrier?.nature !== "NATURE_QUIRKY"
  || JSON.stringify(firstCarrier?.evSpreadStats) !== JSON.stringify(["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"])
  || JSON.stringify(allCarriers.slice(0, 2).map((entry: { index: number }) => entry.index)) !== JSON.stringify([24, 89])
  || JSON.stringify(legalCarriers.map((entry: { index: number }) => entry.index)) !== JSON.stringify([128, 143, 181, 225, 228, 396])
  || impactAsset.source !== "graphics/battle_anims/sprites/impact.png (src/graphics.c:464-465, ANIM_TAG_IMPACT)"
  || existsSync(resolve(root, "src/assets/gen/battle-anim-yellow-star.json"))
  || status("MOVE_SWIFT") !== undefined
  || track?.fulfilled !== false
  || JSON.stringify(track?.representatives) !== JSON.stringify(["MOVE_SWIFT"])
  || JSON.stringify(track?.components) !== JSON.stringify(components)
  || status("MOVE_ANCIENT_POWER") !== "exact"
  || status("MOVE_METEOR_MASH") !== "exact"
  || status("MOVE_MAGICAL_LEAF") !== "exact"
) {
  throw new Error("MOVE_SWIFT source/carrier/graph/side/staging contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_SWIFT",
  moveId: 129,
  sourceBounds: { start: "0x082c97a9", endExclusive: "0x082c9862", bytes: "0xb9", sha256: romRange(0x082c_97a9, 0x082c_9862) },
  sourceText: { bytes: 1326, sha256: "ad929378372e5300d56e3b84acdbee4a552fde3d1f6026c398968ba98f981b14", commandRows: 24 },
  carrier: {
    firstLevel50: "set 128 FRONTIER_MON_STARYU / SPECIES_STARYU / MOVE_SWIFT",
    excludedOutOfTier: "sets 24 FRONTIER_MON_ZIGZAGOON and 89 FRONTIER_MON_CYNDAQUIL precede the Level-50 inventory range 110..849",
    remainingLevel50: [128, 143, 181, 225, 228, 396],
  },
  components,
  sideAndBranches: {
    rootBranches: 0,
    targetBoth: "all five stars pass target_both=TRUE; SetAverageBattlerPositions uses the target/partner average in doubles and the target coordinate in singles",
    attackerMirror: "AnimTranslateLinearSingleSineWave negates target_x when the attacker is not on the player side",
    sameSide: "the callback selects its same-side arc mode when attacker and target sides match; both legal stages intentionally keep them opposed",
    targetShake: "AnimTask_ShakeMon2(ANIM_TARGET, 2, 0, 18, 1)",
    partnerShake: "AnimTask_ShakeMon2(ANIM_DEF_PARTNER, 2, 0, 18, 1); it aborts in a singles stage with no visible defender partner",
    monbg: "monbg/clearmonbg ANIM_DEF_PARTNER route through the target and conditionally include its visible partner",
  },
  callbacks: {
    star: "gSwiftStarSpriteTemplate is an affine-normal 32x32 YELLOW_STAR with a one-frame identity affine loop and AnimTranslateLinearSingleSineWave; the callback either destroys on flicker completion or off-screen bounds",
    shake: "AnimTask_ShakeMon2 writes the initial x2/y2, alternates signed offsets through count 18/delay 1, returns both axes to zero, and destroys its visual task",
  },
  audio: { song: "SE_M_SWIFT", songId: 206, calls: 5, pan: "SOUND_PAN_ATTACKER" },
  resources: {
    loaded: ["ANIM_TAG_YELLOW_STAR", "ANIM_TAG_IMPACT"],
    cleanup: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"],
    explicitUnload: false,
  },
  artIdentity: {
    yellowStar: "graphics/battle_anims/sprites/yellow_star.png is the exact ANIM_TAG_YELLOW_STAR source asset; no generated Yellow Star asset exists and no production art is added or reused by this checkpoint",
    impact: "existing src/assets/gen/battle-anim-hitsplat.json is source-identical to graphics/battle_anims/sprites/impact.png / ANIM_TAG_IMPACT, but Swift only loads that tag here and no production art is reused",
  },
  checkpoint: { coverageEntry: null, derivedStatus: "unsupported", track: "swift-stars-source-staging", fulfilled: false },
  controls: {
    moves: ["MOVE_ANCIENT_POWER", "MOVE_METEOR_MASH", "MOVE_MAGICAL_LEAF"],
    statuses: ["exact", "exact", "exact"],
    independence: "Swift receives no credit; exact controls retain independent acceptance.",
  },
}, null, 2));
