import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import animationComponents from "../../src/data/gen/battle-animation-components.json" with { type: "json" };
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  ICY_WIND_AUDIO,
  ICY_WIND_CALLBACKS,
  ICY_WIND_COMPONENTS,
  ICY_WIND_MOVE_ID,
  ICY_WIND_ROOT_SCRIPT,
  ICY_WIND_SNOWBALL_CALLS,
  ICY_WIND_SOURCE_SET_ID,
  ICY_WIND_SOURCE_SPECIES_ID,
  ICY_WIND_SPIKE_CALLS,
} from "../../src/animation/icyWind.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const reference = join(root, "reference/pokeemerald");
const script = readFileSync(join(reference, "data/battle_anim_scripts.s"), "utf8");
const ice = readFileSync(join(reference, "src/battle_anim_ice.c"), "utf8");
const utility = readFileSync(join(reference, "src/battle_anim_utility_funcs.c"), "utf8");
const inventory = readFileSync(join(reference, "src/data/battle_anim.h"), "utf8");
const graph = animationComponents.moves.find(({ move }) => move === "MOVE_ICY_WIND");
const blizzard = animationComponents.moves.find(({ move }) => move === "MOVE_BLIZZARD");
const carrier = frontierMons.entries.find(({ index }) => index === ICY_WIND_SOURCE_SET_ID);
const carriers = frontierMons.entries.filter(({ moves }) => moves.includes("MOVE_ICY_WIND"));
if (!graph || !blizzard || !carrier) throw new Error("generated Icy Wind inventory is incomplete");

function blockLines(label: string, nextLabel: string): string[] {
  const body = script.slice(script.indexOf(`${label}:`) + label.length + 1, script.indexOf(`${nextLabel}:`));
  return body.split("\n").map((line) => line.replace(/@.*$/u, "").trim()).filter(Boolean);
}
const rootLines = blockLines("Move_ICY_WIND", "IcyWindSwirlingSnowballs");
if (rootLines.join("\n") !== ICY_WIND_ROOT_SCRIPT.join("\n")) throw new Error("Move_ICY_WIND call order/arguments drifted");

const snowballLines = blockLines("IcyWindSwirlingSnowballs", "Move_SMOKESCREEN");
const expectedSnowballLines = ICY_WIND_SNOWBALL_CALLS.slice(0, 5).flatMap((call) => [
  `createsprite gSwirlingSnowballSpriteTemplate, ANIM_TARGET, 40, 0, ${call.initialY}, 0, ${call.targetY}, 72, 1`,
  ...(call.delayAfter ? [`delay ${call.delayAfter}`] : ["return"]),
]);
if (snowballLines.join("\n") !== expectedSnowballLines.join("\n")) throw new Error("IcyWindSwirlingSnowballs arguments drifted");

const spikeLines = blockLines("IceSpikesEffectLong", "GrantingStarsEffect");
const expectedSpikeLines = ["loopsewithpan SE_M_ICY_WIND, SOUND_PAN_TARGET, 6, 4", ...ICY_WIND_SPIKE_CALLS.flatMap((call) => [
  `createsprite gIceGroundSpikeSpriteTemplate, ANIM_TARGET, 2, ${call.x}, 24, 1`,
  ...(call.delayAfter ? [`delay ${call.delayAfter}`] : []),
]), "return"];
if (spikeLines.join("\n") !== expectedSpikeLines.join("\n")) throw new Error("IceSpikesEffectLong arguments drifted");

for (const callback of [...ICY_WIND_CALLBACKS.snowball, ...ICY_WIND_CALLBACKS.spike]) {
  if (!ice.includes(callback)) throw new Error(`missing callback ${callback}`);
}
for (const token of ["gSwirlingSnowballSpriteTemplate", "gIceGroundSpikeSpriteTemplate", "sAnim_IceGroundSpike", "AnimTask_BlendBattleAnimPal"]) {
  if (![ice, utility].some((body) => body.includes(token))) throw new Error(`missing source component ${token}`);
}
for (const token of ["gBattleAnimSpriteGfx_IceCrystals", "gBattleAnimSpriteGfx_IceSpikes", "gBattleAnimSpritePal_IceCrystals"]) {
  if (!inventory.includes(token)) throw new Error(`missing asset inventory ${token}`);
}
if (graph.componentIds.join("\0") !== ICY_WIND_COMPONENTS.join("\0")) throw new Error("generated Icy Wind graph drifted");
const sharedGraph = graph.componentIds.filter((component) => blizzard.componentIds.includes(component));
const selectedShared = sharedGraph.filter((component) => component === "asset:ANIM_TAG_ICE_CRYSTALS" || component === "sprite:gSwirlingSnowballSpriteTemplate");
if (selectedShared.join("\0") !== ["asset:ANIM_TAG_ICE_CRYSTALS", "sprite:gSwirlingSnowballSpriteTemplate"].join("\0")) {
  throw new Error(`Icy Wind/Blizzard selected component boundary drifted: ${selectedShared.join(", ")}`);
}
if (carrier.label !== "FRONTIER_MON_SWINUB" || carrier.species !== "SPECIES_SWINUB"
  || Math.min(...carriers.map(({ index }) => index)) !== ICY_WIND_SOURCE_SET_ID) throw new Error("lowest Icy Wind carrier drifted");

const nm = execFileSync("arm-none-eabi-nm", ["-a", join(reference, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map<string, number>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) symbols.set(fields[2]!, Number.parseInt(fields[0]!, 16));
}
const rom = readFileSync(join(reference, "pokeemerald.gba"));
const interval = (startName: string, endName: string) => {
  const start = symbols.get(startName)!;
  const end = symbols.get(endName)!;
  const bytes = rom.subarray(start - 0x08000000, end - 0x08000000);
  return { start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`, byteLength: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
};
console.log(JSON.stringify({
  move: "MOVE_ICY_WIND", moveId: ICY_WIND_MOVE_ID,
  exclusiveIntervals: [interval("Move_ICY_WIND", "Move_SMOKESCREEN"), interval("IceSpikesEffectLong", "GrantingStarsEffect")],
  graphBlocks: graph.blocks, components: graph.componentIds,
  lowestLevel50Carrier: { setId: ICY_WIND_SOURCE_SET_ID, speciesId: ICY_WIND_SOURCE_SPECIES_ID, label: carrier.label, species: carrier.species },
  snowballCalls: ICY_WIND_SNOWBALL_CALLS.length, spikeCalls: ICY_WIND_SPIKE_CALLS.length,
  selectedSharedWithBlizzard: selectedShared, sharedGraphCommands: sharedGraph.filter((component) => component.startsWith("visualCommand:")), audio: ICY_WIND_AUDIO,
  status: "unsupported-source-checkpoint",
}, null, 2));
