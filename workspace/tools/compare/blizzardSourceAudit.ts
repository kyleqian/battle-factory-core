import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import animationComponents from "../../src/data/gen/battle-animation-components.json" with { type: "json" };
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  BLIZZARD_COMPONENTS,
  BLIZZARD_IMPACT_CRYSTALS,
  BLIZZARD_SNOWBALL_CALLS,
  BLIZZARD_SOURCE_SET_ID,
  BLIZZARD_SOURCE_SPECIES_ID,
} from "../../src/animation/blizzard.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const reference = join(root, "reference/pokeemerald");
const script = readFileSync(join(reference, "data/battle_anim_scripts.s"), "utf8");
const ice = readFileSync(join(reference, "src/battle_anim_ice.c"), "utf8");
const utility = readFileSync(join(reference, "src/battle_anim_utility_funcs.c"), "utf8");
const graphics = readFileSync(join(reference, "src/graphics.c"), "utf8");
const trig = readFileSync(join(reference, "src/trig.c"), "utf8");
const graph = animationComponents.moves.find(({ move }) => move === "MOVE_BLIZZARD");
const icyWind = animationComponents.moves.find(({ move }) => move === "MOVE_ICY_WIND");
const carrier = frontierMons.entries.find(({ index }) => index === BLIZZARD_SOURCE_SET_ID);
const carrierMoves = frontierMons.entries.filter(({ moves }) => moves.includes("MOVE_BLIZZARD"));
if (!graph || !icyWind || !carrier) throw new Error("generated Blizzard/source inventory is incomplete");

const requiredScript = [
  "Move_BLIZZARD:", "loadspritegfx ANIM_TAG_ICE_CRYSTALS", "monbg ANIM_DEF_PARTNER",
  "createvisualtask AnimTask_GetAttackerSide, 2", "fadetobg BG_HIGHSPEED_OPPONENT",
  "AnimTask_StartSlidingBg, 5, -2304, 0, 1, -1", "panse SE_M_BLIZZARD",
  "call BlizzardIceCrystals", "playsewithpan SE_M_BLIZZARD2",
  "call IceCrystalEffectLong", "restorebg", "setarg 7, 0xFFFF",
  "clearmonbg ANIM_DEF_PARTNER", "BlizzardAgainstPlayer:", "fadetobg BG_HIGHSPEED_PLAYER",
];
const requiredCallbacks = [
  "AnimSwirlingSnowball", "AnimSwirlingSnowball_Step1", "AnimSwirlingSnowball_Step2",
  "AnimSwirlingSnowball_End", "AnimMoveParticleBeyondTarget", "AnimWiggleParticleTowardsTarget",
  "AnimIceEffectParticle", "AnimFlickerIceEffectParticle",
];
const requiredSources = [
  "gSwirlingSnowballSpriteTemplate", "gBlizzardIceCrystalSpriteTemplate",
  "gIceCrystalHitLargeSpriteTemplate", "gIceCrystalHitSmallSpriteTemplate",
  "gBattleAnimSpriteGfx_IceCrystals", "ANIM_TAG_ICE_CRYSTALS",
];
const missing = [...requiredScript, ...requiredCallbacks, ...requiredSources]
  .filter((token) => ![script, ice, graphics].some((body) => body.includes(token)));
if (missing.length) throw new Error(`Blizzard source audit missing: ${missing.join(", ")}`);
if (!utility.includes("AnimTask_StartSlidingBg") || !utility.includes("AnimTask_GetAttackerSide")) {
  throw new Error("Blizzard task implementation audit missing");
}
const step2 = ice.slice(ice.indexOf("static void AnimSwirlingSnowball_Step2(struct Sprite *sprite)"), ice.indexOf("static void AnimSwirlingSnowball_End(struct Sprite *sprite)"));
const orderedStep2Writes = [
  "sprite->x2 = Sin(sprite->data[0], tempVar) - sprite->data[3];",
  "sprite->y2 = Cos(sprite->data[0], 15)      - sprite->data[4];",
  "sprite->data[0] = (sprite->data[0] + 16) & 0xFF;",
  "sprite->data[5] += 1;",
];
let previousWrite = -1;
for (const write of orderedStep2Writes) {
  const index = step2.indexOf(write);
  if (index <= previousWrite) throw new Error(`AnimSwirlingSnowball Step2 write order drifted: ${write}`);
  previousWrite = index;
}
if (!trig.includes("return (amplitude * gSineTable[index]) >> 8;")
  || !trig.includes("return (amplitude * gSineTable[index + 64]) >> 8;")) {
  throw new Error("signed Sin/Cos arithmetic-shift source drifted");
}
if (graph.componentIds.join("\0") !== BLIZZARD_COMPONENTS.join("\0")) {
  throw new Error("generated Blizzard graph drifted from source reducer");
}
if (!icyWind.componentIds.includes("sprite:gSwirlingSnowballSpriteTemplate")
  || BLIZZARD_COMPONENTS.some((component) => component === "sprite:gIceGroundSpikeSpriteTemplate")) {
  throw new Error("Blizzard/Icy Wind shared-component boundary changed");
}
if (carrier.label !== "FRONTIER_MON_PELIPPER_2" || carrier.species !== "SPECIES_PELIPPER"
  || !carrier.moves.includes("MOVE_BLIZZARD")) throw new Error("lowest Blizzard carrier identity drifted");
if (carrierMoves.length === 0 || Math.min(...carrierMoves.map(({ index }) => index)) !== BLIZZARD_SOURCE_SET_ID) {
  throw new Error("lowest legal Level-50 Blizzard carrier is not set 318");
}
for (const scenarioName of [
  "mechanic-blizzard-player-pelipper-opponent-onix.json",
  "mechanic-blizzard-opponent-pelipper-player-onix.json",
]) {
  const scenario = JSON.parse(readFileSync(join(root, "tools/battle-lab", scenarioName), "utf8"));
  const parties = scenario.overrides.parties;
  const found = [...parties.player, ...parties.opponent].find((mon) => mon.species === BLIZZARD_SOURCE_SPECIES_ID);
  if (!found || !found.moves.every((move: number) => move === 59)) throw new Error(`${scenarioName}: numeric carrier identity drifted`);
}

const nm = execFileSync("arm-none-eabi-nm", ["-a", join(reference, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map<string, number>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/);
  if (fields.length === 3 && /^[0-9a-f]+$/i.test(fields[0]!)) symbols.set(fields[2]!, Number.parseInt(fields[0]!, 16));
}
const start = symbols.get("Move_BLIZZARD")!;
const end = symbols.get("Move_PSYBEAM")!;
const bytes = readFileSync(join(reference, "pokeemerald.gba")).subarray(start - 0x08000000, end - 0x08000000);
const intervalSha = createHash("sha256").update(bytes).digest("hex");
console.log(JSON.stringify({
  move: "MOVE_BLIZZARD", moveId: 59, sourceInterval: { start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`, byteLength: bytes.length, sha256: intervalSha },
  graphBlocks: graph.blocks, componentCount: BLIZZARD_COMPONENTS.length,
  snowballCalls: BLIZZARD_SNOWBALL_CALLS.length, snowballSourceY: BLIZZARD_SNOWBALL_CALLS.map(({ initialY }) => initialY),
  impactCrystalCalls: BLIZZARD_IMPACT_CRYSTALS.length,
  lowestLevel50Carrier: { setId: BLIZZARD_SOURCE_SET_ID, speciesId: BLIZZARD_SOURCE_SPECIES_ID, label: carrier.label, species: carrier.species },
  carrierCount: carrierMoves.length, icyWindSharesSnowball: icyWind.componentIds.includes("sprite:gSwirlingSnowballSpriteTemplate"),
  cleanup: ["restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein", "clearmonbg", "end"],
}, null, 2));
