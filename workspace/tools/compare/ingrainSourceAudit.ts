/** Authoritative source and acceptance-graph audit for MOVE_INGRAIN. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const graphics = read("reference/pokeemerald/src/graphics.c");
const battleAnimData = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const frontierConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const frontierMons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);

function address(symbol: string): number {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error("missing " + symbol);
  return Number.parseInt(match[1]!, 16);
}

function scriptBlock(source: string, start: string, end: string): string {
  const from = source.indexOf(start + ":");
  const to = source.indexOf(end + ":", from + start.length + 1);
  if (from < 0 || to <= from) throw new Error("missing " + start + "/" + end);
  return source.slice(from, to);
}

function sourceHash(source: string): string {
  return createHash("sha256").update(source).digest("hex");
}

const move = scriptBlock(scripts, "Move_INGRAIN", "Move_PRESENT");
const expectedComponents = [
  "asset:ANIM_TAG_ORBS",
  "asset:ANIM_TAG_ROOTS",
  "visualCommand:create_ingrain_orb_sprite",
  "visualCommand:create_ingrain_root_sprite",
];
const expectedRows = [
  "loadspritegfx ANIM_TAG_ROOTS",
  "loadspritegfx ANIM_TAG_ORBS",
  "create_ingrain_root_sprite ANIM_ATTACKER, 2, offset_x=16, offset_y=26, subpriority=29, animation=2, duration=150",
  "playsewithpan SE_M_SCRATCH, SOUND_PAN_ATTACKER",
  "create_ingrain_root_sprite ANIM_ATTACKER, 2, offset_x=-32, offset_y=20, subpriority=31, animation=1, duration=140",
  "create_ingrain_root_sprite ANIM_ATTACKER, 2, offset_x=32, offset_y=22, subpriority=31, animation=0, duration=130",
  "create_ingrain_root_sprite ANIM_ATTACKER, 2, offset_x=-16, offset_y=25, subpriority=29, animation=3, duration=120",
  "create_ingrain_orb_sprite ANIM_ATTACKER, 3, initial_x=32, initial_y=26, velocity_x=-1, wave_amplitude=3, duration=30",
  "create_ingrain_orb_sprite ANIM_ATTACKER, 3, initial_x=-48, initial_y=20, velocity_x=1, wave_amplitude=2, duration=30",
  "create_ingrain_orb_sprite ANIM_ATTACKER, 3, initial_x=48, initial_y=26, velocity_x=-2, wave_amplitude=3, duration=18",
  "playsewithpan SE_M_BUBBLE3, SOUND_PAN_ATTACKER",
  "waitforvisualfinish",
  "end",
];
const expectedMacroRows = [
  "createsprite gIngrainRootSpriteTemplate, \\anim_battler, \\subpriority_offset, \\offset_x, \\offset_y, \\subpriority - 30, \\animation, \\duration",
  "createsprite gIngrainOrbSpriteTemplate, \\anim_battler, \\subpriority_offset, \\initial_x, \\initial_y, \\velocity_x, \\wave_amplitude, \\duration",
];
const ingrain = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_INGRAIN",
);
const ingrainGraph = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_INGRAIN",
);
const carrier = mons.entries.find((entry: { index: number }) => entry.index === 140);
const status = (moveName: string): string | undefined => coverage.entries.find(
  (entry: { move: string }) => entry.move === moveName,
)?.status;
const track = coverage.componentTracks.find(
  (entry: { id: string }) => entry.id === "ingrain-roots-orbs",
);
const templateBlock = effects.slice(
  effects.indexOf("const union AnimCmd gIngrainRootAnimCmds1[]"),
  effects.indexOf("const union AnimCmd gFallingBagAnimCmds[]"),
);
const rootTemplate = effects.slice(
  effects.indexOf("const struct SpriteTemplate gIngrainRootSpriteTemplate"),
  effects.indexOf("const struct SpriteTemplate gFrenzyPlantRootSpriteTemplate"),
);
const orbTemplate = effects.slice(
  effects.indexOf("const struct SpriteTemplate gIngrainOrbSpriteTemplate"),
  effects.indexOf("const union AnimCmd gFallingBagAnimCmds[]"),
);

if (
  address("Move_INGRAIN") !== 0x082d40e0
  || address("Move_PRESENT") !== 0x082d4191
  || address("gIngrainRootAnimCmds1") !== 0x085924f4
  || address("gIngrainRootAnimCmds2") !== 0x08592508
  || address("gIngrainRootAnimCmds3") !== 0x0859251c
  || address("gIngrainRootAnimCmds4") !== 0x0859252c
  || address("gIngrainRootAnimTable") !== 0x0859253c
  || address("gIngrainRootSpriteTemplate") !== 0x0859254c
  || address("gIngrainOrbAnimCmds") !== 0x0859257c
  || address("gIngrainOrbAnimTable") !== 0x08592588
  || address("gIngrainOrbSpriteTemplate") !== 0x0859258c
  || address("AnimIngrainRoot") !== 0x080ff768
  || address("AnimRootFlickerOut") !== 0x080ff8dc
  || address("AnimIngrainOrb") !== 0x080ff934
  || address("gBattleAnimSpriteGfx_Orbs") !== 0x08c1af6c
  || address("gBattleAnimSpritePal_Orbs") !== 0x08c1b080
  || address("gBattleAnimSpriteGfx_Roots") !== 0x08c254e0
  || address("gBattleAnimSpritePal_Roots") !== 0x08c254c0
  || Buffer.byteLength(move) !== 1382
  || sourceHash(move) !== "da8b20518a08d8473576c030359f26340ba646ade90c72c697ae29970d4ae56e"
  || move.split("\n").filter((line) => line.trim()).length - 1 !== 28
  || expectedRows.some((row) => !move.includes(row))
  || (move.match(/create_ingrain_root_sprite/g) ?? []).length !== 4
  || (move.match(/create_ingrain_orb_sprite/g) ?? []).length !== 3
  || (move.match(/playsewithpan SE_M_SCRATCH/g) ?? []).length !== 4
  || (move.match(/playsewithpan SE_M_BUBBLE3/g) ?? []).length !== 4
  || expectedMacroRows.some((row) => !macros.includes(row))
  || sourceHash(templateBlock) !== "97695a4f8c80e08b0fd140c9da7a28138247c9f4bdada82b288a3f3b497d2545"
  || !templateBlock.includes("ANIMCMD_FRAME(48, 7, .hFlip = TRUE)")
  || !templateBlock.includes("ANIMCMD_JUMP(0)")
  || !rootTemplate.includes(".tileTag = ANIM_TAG_ROOTS")
  || !rootTemplate.includes(".paletteTag = ANIM_TAG_ROOTS")
  || !rootTemplate.includes(".oam = &gOamData_AffineOff_ObjNormal_32x32")
  || !rootTemplate.includes(".anims = gIngrainRootAnimTable")
  || !rootTemplate.includes(".affineAnims = gDummySpriteAffineAnimTable")
  || !rootTemplate.includes(".callback = AnimIngrainRoot")
  || !orbTemplate.includes(".tileTag = ANIM_TAG_ORBS")
  || !orbTemplate.includes(".paletteTag = ANIM_TAG_ORBS")
  || !orbTemplate.includes(".oam = &gOamData_AffineOff_ObjNormal_8x8")
  || !orbTemplate.includes(".anims = gIngrainOrbAnimTable")
  || !orbTemplate.includes(".affineAnims = gDummySpriteAffineAnimTable")
  || !orbTemplate.includes(".callback = AnimIngrainOrb")
  || !effects.includes("sprite->callback = AnimRootFlickerOut;")
  || !effects.includes("sprite->invisible = sprite->data[0] % 2;")
  || !effects.includes("sprite->y2 = Sin((sprite->data[0] * 20) & 0xFF, sprite->data[2]);")
  || !graphics.includes('gBattleAnimSpriteGfx_Orbs[] = INCGFX_U32("graphics/battle_anims/sprites/orbs.png", ".4bpp.lz")')
  || !graphics.includes('gBattleAnimSpritePal_Orbs[] = INCGFX_U32("graphics/battle_anims/sprites/orbs.png", ".gbapal.lz")')
  || !graphics.includes('gBattleAnimSpriteGfx_Roots[] = INCGFX_U32("graphics/battle_anims/sprites/roots.png", ".4bpp.lz")')
  || !graphics.includes('gBattleAnimSpritePal_Roots[] = INCGFX_U32("graphics/battle_anims/sprites/roots.png", ".gbapal.lz")')
  || !battleAnimData.includes("{gBattleAnimSpriteGfx_Orbs, 0x0180, ANIM_TAG_ORBS}")
  || !battleAnimData.includes("{gBattleAnimSpritePal_Orbs, ANIM_TAG_ORBS}")
  || !battleAnimData.includes("{gBattleAnimSpriteGfx_Roots, 0x0800, ANIM_TAG_ROOTS}")
  || !battleAnimData.includes("{gBattleAnimSpritePal_Roots, ANIM_TAG_ROOTS}")
  || !constants.includes("#define ANIM_TAG_ORBS                       (ANIM_SPRITES_START + 147)")
  || !constants.includes("#define ANIM_TAG_ROOTS                      (ANIM_SPRITES_START + 223)")
  || !frontierConstants.includes("#define FRONTIER_MON_LILEEP         140")
  || !frontierMons.includes("[FRONTIER_MON_LILEEP] = {\n        .species = SPECIES_LILEEP,\n        .moves = {MOVE_ANCIENT_POWER, MOVE_ACID, MOVE_INGRAIN, MOVE_CONFUSE_RAY}")
  || ingrain?.id !== 275
  || ingrain?.frontierMonCount !== 5
  || JSON.stringify(ingrainGraph?.componentIds) !== JSON.stringify(expectedComponents)
  || carrier?.label !== "FRONTIER_MON_LILEEP"
  || carrier?.species !== "SPECIES_LILEEP"
  || JSON.stringify(carrier?.moves) !== JSON.stringify([
    "MOVE_ANCIENT_POWER", "MOVE_ACID", "MOVE_INGRAIN", "MOVE_CONFUSE_RAY",
  ])
  || status("MOVE_INGRAIN") !== "exact"
  || status("MOVE_ABSORB") !== "exact"
  || status("MOVE_MEGA_DRAIN") !== "exact"
  || status("MOVE_DREAM_EATER") !== "exact"
  || status("MOVE_GIGA_DRAIN") !== "exact"
  || track?.fulfilled !== true
  || JSON.stringify(track?.components) !== JSON.stringify(expectedComponents)
  || JSON.stringify(track?.representatives) !== JSON.stringify(["MOVE_INGRAIN"])
  || coverage.entries.filter((entry: { status: string }) => entry.status === "exact").length !== 230
) {
  throw new Error("MOVE_INGRAIN source/carrier/component/control contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_INGRAIN",
  sourceBounds: { start: "0x082d40e0", endExclusive: "0x082d4191", bytes: "0xb1" },
  sourceBody: {
    executableLines: 28,
    sha256: "da8b20518a08d8473576c030359f26340ba646ade90c72c697ae29970d4ae56e",
  },
  carrier: "set 140 FRONTIER_MON_LILEEP / SPECIES_LILEEP / MOVE_INGRAIN",
  components: expectedComponents,
  controls: {
    moves: ["MOVE_ABSORB", "MOVE_MEGA_DRAIN", "MOVE_DREAM_EATER", "MOVE_GIGA_DRAIN"],
    statuses: ["exact", "exact", "exact", "exact"],
    independence: "Ingrain is independently exact; shared ORBS controls retain independent exact status and receive no sibling credit.",
  },
}));
