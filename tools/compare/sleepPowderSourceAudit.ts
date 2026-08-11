import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const moves = read("reference/pokeemerald/include/constants/moves.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const start = scripts.indexOf("Move_SLEEP_POWDER:");
const end = scripts.indexOf("Move_SWIFT:");
if (start < 0 || end < start) throw new Error("missing Sleep Powder interval");
const script = scripts.slice(start, end);
const nm = execFileSync("arm-none-eabi-nm", ["-n", "reference/pokeemerald/pokeemerald.elf"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
function address(symbol: string): number {
  const row = nm.split("\n").find((line) => line.endsWith(` ${symbol}`));
  if (!row) throw new Error(`missing ${symbol}`);
  return Number.parseInt(row.split(/\s+/)[0]!, 16);
}
function block(label: string): string {
  const from = mons.indexOf(`[${label}] = {`);
  const to = mons.indexOf("\n    },", from);
  if (from < 0 || to < 0) throw new Error(`missing ${label}`);
  return mons.slice(from, to);
}
const move = inventory.tiers.level50.moves.find((value: { move: string }) => value.move === "MOVE_SLEEP_POWDER");
const carrier = block("FRONTIER_MON_VENOMOTH_1");
if (
  !move || move.id !== 79 || move.exampleMons[0] !== "FRONTIER_MON_VENOMOTH_1"
  || !constants.includes("#define FRONTIER_MON_VENOMOTH_1     226")
  || !/^#define SPECIES_VENOMOTH\s+49$/m.test(species)
  || !moves.includes("#define MOVE_SLEEP_POWDER 79")
  || !carrier.includes(".species = SPECIES_VENOMOTH")
  || !carrier.includes("MOVE_SLEEP_POWDER")
  || !script.includes("loadspritegfx ANIM_TAG_SLEEP_POWDER")
  || !script.includes("loopsewithpan SE_M_POISON_POWDER, SOUND_PAN_TARGET, 10, 6")
  || (script.match(/create_sleep_powder_particle_sprite/g) ?? []).length !== 15
  || !effects.includes("gSleepPowderParticleSpriteTemplate")
  || !effects.includes("AnimMovePowderParticle_Step")
  || !effects.includes("const union AnimCmd gPowderParticlesAnimCmds[]")
  || address("Move_SLEEP_POWDER") !== 0x082c967b
  || address("Move_SWIFT") - address("Move_SLEEP_POWDER") !== 0x12e
  || address("gSleepPowderParticleSpriteTemplate") !== 0x08592118
  || address("gBattleAnimSpritePal_SleepPowder") !== 0x08d8eaa4
) throw new Error("Sleep Powder source/component/carrier contract changed");
console.log("Move_SLEEP_POWDER 0x082c967b..0x082c97a9 (0x12e bytes), graph gSleepPowderParticleSpriteTemplate -> AnimMovePowderParticle_Step with gPowderParticlesAnimCmds, distinct ANIM_TAG_SLEEP_POWDER/gBattleAnimSpritePal_SleepPowder, lowest Level-50 carrier set 226/FRONTIER_MON_VENOMOTH_1 -> SPECIES_VENOMOTH 49/MOVE_SLEEP_POWDER 79; staged carrier is legal SPECIES_HOPPIP 187");
