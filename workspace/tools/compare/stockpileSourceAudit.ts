/** Authoritative source/component/carrier audit for MOVE_STOCKPILE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));

const from = scripts.indexOf("Move_STOCKPILE:");
const to = scripts.indexOf("Move_SPIT_UP:", from);
if (from < 0 || to <= from) throw new Error("missing Stockpile script interval");
const body = scripts.slice(from, to);
const components = [
  "asset:ANIM_TAG_GRAY_ORB",
  "subroutine:StockpileAbsorb",
  "task:AnimTask_StockpileDeformMon",
  "visualCommand:blend_color_cycle",
  "visualCommand:create_stockpile_absorption_orb_sprite",
  "visualCommand:simple_palette_blend",
];
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_STOCKPILE");
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_STOCKPILE");
const carriers = mons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_STOCKPILE"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map(nm.split("\n").map((line) => line.trim().split(/\s+/u))
  .filter((parts) => parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!))
  .map((parts) => [parts[2]!, Number.parseInt(parts[0]!, 16)]));
const start = symbols.get("Move_STOCKPILE");
const end = symbols.get("Move_SPIT_UP");
if (start !== 0x082d4934 || end !== 0x082d49eb) throw new Error("Stockpile ROM interval drifted");
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const bytes = rom.subarray(start - 0x08000000, end - 0x08000000);
const digest = createHash("sha256").update(bytes).digest("hex");

for (const token of [
  "loadspritegfx ANIM_TAG_GRAY_ORB",
  "playsewithpan SE_M_MEGA_KICK, SOUND_PAN_ATTACKER",
  "blend_color_cycle priority=2, selector=F_PAL_ATTACKER, delay=8, num_blends=1, initial_blend_y=0, target_blend_y=12, color=RGB_WHITE",
  "createvisualtask AnimTask_StockpileDeformMon, 5",
  "call StockpileAbsorb",
  "simple_palette_blend selector=F_PAL_ATTACKER, delay=0, initial_blend_y=12, target_blend_y=0, color=RGB_WHITE",
]) if (!body.includes(token)) throw new Error(`Stockpile script drifted: ${token}`);
if ((body.match(/call StockpileAbsorb/g) ?? []).length !== 2
  || (body.match(/create_stockpile_absorption_orb_sprite/g) ?? []).length !== 8
  || (body.match(/delay 1/g) ?? []).length !== 8
  || !graphEntry || graphEntry.blocks.join(",") !== "Move_STOCKPILE,StockpileAbsorb"
  || graphEntry.componentIds.join(",") !== components.join(",")
  || move?.id !== 254 || move?.frontierMonCount !== 2 || move?.speciesCount !== 2
  || carriers[0]?.index !== 213 || carriers[0]?.label !== "FRONTIER_MON_PELIPPER_1"
  || carriers[0]?.species !== "SPECIES_PELIPPER"
  || digest !== "577d34d17b25cd5a812079692caacba5c1719f6fab5b733dd492df3baf81e470"
) throw new Error("Stockpile source/component/carrier contract changed");
for (const token of [
  "const union AffineAnimCmd gStockpileAbsorptionOrbAffineCmds[]",
  "AFFINEANIMCMD_FRAME(320, 320, 0, 0)",
  "AFFINEANIMCMD_FRAME(-14, -14, 0, 1)",
  "const struct SpriteTemplate gStockpileAbsorptionOrbSpriteTemplate",
  ".oam = &gOamData_AffineDouble_ObjNormal_8x8",
  ".callback = AnimPowerAbsorptionOrb",
  "static void AnimPowerAbsorptionOrb(struct Sprite *sprite)",
  "sprite->callback = StartAnimLinearTranslation",
  "StoreSpriteCallbackInData6(sprite, DestroySpriteAndMatrix)",
]) if (!effects1.includes(token)) throw new Error(`Stockpile orb source drifted: ${token}`);
for (const token of [
  "const union AffineAnimCmd gStockpileDeformMonAffineAnimCmds[]",
  "AFFINEANIMCMD_FRAME(8, -8, 0, 12)",
  "AFFINEANIMCMD_FRAME(-16, 16, 0, 12)",
  "void AnimTask_StockpileDeformMon(u8 taskId)",
  "PrepareAffineAnimInTaskData(&gTasks[taskId], GetAnimBattlerSpriteId(ANIM_ATTACKER), gStockpileDeformMonAffineAnimCmds)",
]) if (!effects3.includes(token)) throw new Error(`Stockpile deform source drifted: ${token}`);
if (!macros.includes("createsprite gStockpileAbsorptionOrbSpriteTemplate, \\anim_battler, \\subpriority_offset, \\x, \\y, \\duration")
  || !graphics.includes('gBattleAnimSpriteGfx_GrayOrb[] = INCGFX_U32("graphics/battle_anims/sprites/gray_orb.png"')
  || !graphics.includes('gBattleAnimSpritePal_GrayOrb[] = INCGFX_U32("graphics/battle_anims/sprites/gray_orb.png"')
  || !animData.includes("{gBattleAnimSpriteGfx_GrayOrb, 0x0060, ANIM_TAG_GRAY_ORB}")
  || !animData.includes("{gBattleAnimSpritePal_GrayOrb, ANIM_TAG_GRAY_ORB}")) throw new Error("Stockpile asset/macro contract changed");

const status = (name: string): string | undefined => coverage.entries.find((entry: { move: string }) => entry.move === name)?.status;
if (["MOVE_SWALLOW", "MOVE_SAFEGUARD", "MOVE_CONFUSE_RAY", "MOVE_SOFT_BOILED"].some((name) => status(name) !== "exact")) {
  throw new Error("Stockpile control status changed");
}
console.log(JSON.stringify({
  move: "MOVE_STOCKPILE",
  moveId: 254,
  sourceBounds: { start: "0x082d4934", endExclusive: "0x082d49eb", byteLength: bytes.length, sha256: digest, pointerContract: "half-open-byte-interval" },
  graph: { blocks: graphEntry.blocks, components },
  carrier: { setId: 213, frontierMon: "FRONTIER_MON_PELIPPER_1", species: "SPECIES_PELIPPER", lowestLevel50: true },
  orbCreatesPerBody: 16,
  controls: {
    deformationFamily: { MOVE_SWALLOW: status("MOVE_SWALLOW"), MOVE_SPIT_UP: status("MOVE_SPIT_UP") ?? "unsupported" },
    retainedPalette: {
      MOVE_SAFEGUARD: status("MOVE_SAFEGUARD"),
      MOVE_CONFUSE_RAY: status("MOVE_CONFUSE_RAY"),
      MOVE_SOFT_BOILED: status("MOVE_SOFT_BOILED"),
    },
  },
}, null, 2));
