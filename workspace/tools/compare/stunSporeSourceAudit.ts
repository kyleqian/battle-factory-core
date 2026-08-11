import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const species = read("reference/pokeemerald/include/constants/species.h");
const moves = read("reference/pokeemerald/include/constants/moves.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));

const start = scripts.indexOf("Move_STUN_SPORE:");
const end = scripts.indexOf("Move_SLEEP_POWDER:");
if (start < 0 || end < start) throw new Error("missing Stun Spore script interval");
const script = scripts.slice(start, end);
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-n", "reference/pokeemerald/pokeemerald.elf"],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
function symbolAddress(symbol: string): number {
  const row = nm.split("\n").find((line) => line.endsWith(` ${symbol}`));
  if (!row) throw new Error(`missing symbol ${symbol}`);
  return Number.parseInt(row.split(/\s+/)[0]!, 16);
}
function block(source: string, label: string): string {
  const from = source.indexOf(`[${label}] = {`);
  const to = source.indexOf("\n    },", from);
  if (from < 0 || to < 0) throw new Error(`missing ${label}`);
  return source.slice(from, to);
}

const stun = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_STUN_SPORE",
);
const gloom = block(mons, "FRONTIER_MON_GLOOM_1");
const requiredScript = [
  "loadspritegfx ANIM_TAG_STUN_SPORE",
  "loopsewithpan SE_M_POISON_POWDER, SOUND_PAN_TARGET, 10, 6",
  "create_stun_spore_particle_sprite ANIM_TARGET, 2, x=-30, y=-22, duration=117, y_velocity=80/256, wave_amplitude=5, wave_speed=1",
  "create_stun_spore_particle_sprite ANIM_TARGET, 2, x=10, y=-22, duration=117, y_velocity=80/256, wave_amplitude=-5, wave_speed=1",
  "create_stun_spore_particle_sprite ANIM_TARGET, 2, x=-25, y=-22, duration=117, y_velocity=112/256, wave_amplitude=5, wave_speed=3",
];
const requiredGraph = [
  "gStunSporeParticleSpriteTemplate",
  "AnimMovePowderParticle_Step",
  "const union AnimCmd gPowderParticlesAnimCmds[]",
  "sprite->x2 = Sin(sprite->data[5], sprite->data[3])",
  "sprite->data[5] = (sprite->data[5] + sprite->data[4]) & 0xFF",
];
if (
  !stun
  || stun.id !== 78
  || !stun.exampleMons.includes("FRONTIER_MON_GLOOM_1")
  || !constants.includes("#define FRONTIER_MON_GLOOM_1        167")
  || !/^#define SPECIES_GLOOM\s+44$/m.test(species)
  || !moves.includes("#define MOVE_STUN_SPORE 78")
  || !gloom.includes(".species = SPECIES_GLOOM")
  || !gloom.includes("MOVE_STUN_SPORE")
  || requiredScript.some((text) => !script.includes(text))
  || (script.match(/create_stun_spore_particle_sprite/g) ?? []).length !== 15
  || requiredGraph.some((text) => !effects.includes(text))
  || symbolAddress("Move_SLEEP_POWDER") - symbolAddress("Move_STUN_SPORE") !== 0x12e
  || symbolAddress("gStunSporeParticleSpriteTemplate") !== 0x08592130
) {
  throw new Error("Stun Spore source/component/carrier contract changed");
}

console.log(
  "Move_STUN_SPORE 0x082c954d..0x082c967b (0x12e bytes), graph "
  + "gStunSporeParticleSpriteTemplate -> AnimMovePowderParticle_Step "
  + "with gPowderParticlesAnimCmds, lowest Level-50 carrier set "
  + "167/FRONTIER_MON_GLOOM_1 -> SPECIES_GLOOM 44/MOVE_STUN_SPORE 78; "
  + "staged dense Scene-ON carrier is legal SPECIES_HOPPIP 187",
);
