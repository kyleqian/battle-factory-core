/** Source, pointer, legal-carrier, and ownership contract for MOVE_DIVE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const flying = read("reference/pokeemerald/src/battle_anim_flying.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const water = read("reference/pokeemerald/src/battle_anim_water.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const resources = read("reference/pokeemerald/src/data/battle_anim.h")
  + read("reference/pokeemerald/src/graphics.c")
  + read("reference/pokeemerald/include/constants/battle_anim.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));

const components = [
  "asset:ANIM_TAG_ROUND_SHADOW", "asset:ANIM_TAG_SMALL_BUBBLES",
  "asset:ANIM_TAG_SPLASH", "asset:ANIM_TAG_SWEAT_BEAD",
  "asset:ANIM_TAG_WATER_IMPACT", "sprite:gDiveBallSpriteTemplate",
  "sprite:gDiveWaterSplashSpriteTemplate", "sprite:gSmallDriftingBubblesSpriteTemplate",
  "sprite:gSprayWaterDropletSpriteTemplate", "sprite:gWaterHitSplatSpriteTemplate",
  "subroutine:DiveAttack", "subroutine:DiveAttackWaterDroplets",
  "subroutine:DiveSetUp", "subroutine:DiveSetUpWaterDroplets",
  "subroutine:RisingWaterHitEffect", "task:AnimTask_ShakeMon2",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg",
  "visualCommand:setalpha", "visualCommand:visible",
];
const start = 0x082d653d;
const end = 0x082d65f7;
const risingStart = 0x082cb102;
const risingEnd = 0x082cb275;
const labels = {
  Move_DIVE: start, DiveSetUp: 0x082d654c,
  DiveSetUpWaterDroplets: 0x082d658a, DiveAttack: 0x082d65a1,
  DiveAttackWaterDroplets: 0x082d65e0, Move_ROCK_BLAST: end,
  RisingWaterHitEffect: risingStart, Move_EXPLOSION: risingEnd,
};

function need(source: string, token: string, owner: string): void {
  if (!source.includes(token)) throw new Error(`${owner} drifted: ${token}`);
}
const rootBody = scripts.slice(scripts.indexOf("Move_DIVE:"), scripts.indexOf("Move_ROCK_BLAST:"));
const risingBody = scripts.slice(scripts.indexOf("RisingWaterHitEffect:"), scripts.indexOf("Move_EXPLOSION:"));
for (const token of [
  "choosetwoturnanim DiveSetUp, DiveAttack",
  "createsprite gDiveBallSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 13, 336",
  "createsprite gDiveWaterSplashSpriteTemplate, ANIM_ATTACKER, 3, 0",
  "createsprite gDiveWaterSplashSpriteTemplate, ANIM_TARGET, 3, 1",
  "call DiveSetUpWaterDroplets", "call DiveAttackWaterDroplets",
  "call RisingWaterHitEffect", "visible ANIM_ATTACKER",
  "monbg ANIM_DEF_PARTNER", "setalpha 12, 8",
  "clearmonbg ANIM_DEF_PARTNER", "blendoff",
]) need(rootBody, token, "Dive script");
if ((rootBody.match(/call DiveSetUpWaterDroplets/g) ?? []).length !== 5
  || (rootBody.match(/call DiveAttackWaterDroplets/g) ?? []).length !== 5
  || (rootBody.match(/createsprite gSprayWaterDropletSpriteTemplate/g) ?? []).length !== 4) {
  throw new Error("Dive paired spray choreography drifted");
}
if ((risingBody.match(/createsprite gWaterHitSplatSpriteTemplate/g) ?? []).length !== 9
  || (risingBody.match(/createsprite gSmallDriftingBubblesSpriteTemplate/g) ?? []).length !== 18) {
  throw new Error("RisingWaterHitEffect 9+18 choreography drifted");
}
for (const token of [
  "createvisualtask AnimTask_ShakeMon2, 5, ANIM_TARGET, 4, 0, 17, 1",
  "playsewithpan SE_M_WATERFALL, SOUND_PAN_TARGET",
]) need(risingBody, token, "RisingWaterHitEffect");
for (const token of [
  "const struct SpriteTemplate gDiveBallSpriteTemplate", ".callback = AnimDiveBall,",
  "void AnimDiveBall_Step1(struct Sprite *sprite)", "static void AnimDiveBall_Step2(struct Sprite *sprite)",
  "const struct SpriteTemplate gDiveWaterSplashSpriteTemplate", ".callback = AnimDiveWaterSplash,",
  "const struct SpriteTemplate gSprayWaterDropletSpriteTemplate", ".callback = AnimSprayWaterDroplet,",
  "static void AnimSprayWaterDroplet_Step(struct Sprite *sprite)",
  "int v1 = 0x1ff & Random2();", "int v2 = 0x7f & Random2();",
]) need(flying, token, "Dive flying callbacks");
for (const token of [
  "const struct SpriteTemplate gWaterHitSplatSpriteTemplate",
  ".tileTag = ANIM_TAG_WATER_IMPACT,", ".callback = AnimHitSplatBasic,",
]) need(normal, token, "Dive water impact");
for (const token of [
  "const struct SpriteTemplate gSmallDriftingBubblesSpriteTemplate",
  ".tileTag = ANIM_TAG_SMALL_BUBBLES,", ".callback = AnimSmallDriftingBubbles,",
  "static void AnimSmallDriftingBubbles_Step(struct Sprite *sprite)",
]) need(water, token, "Dive drifting bubbles");
for (const token of [
  "void AnimTask_ShakeMon2(u8 taskId)", "static void AnimTask_ShakeMon2_Step(u8 taskId)",
]) need(movement, token, "Dive ShakeMon2");
for (const token of [
  "ANIM_TAG_ROUND_SHADOW", "ANIM_TAG_SPLASH", "ANIM_TAG_SWEAT_BEAD",
  "ANIM_TAG_WATER_IMPACT", "ANIM_TAG_SMALL_BUBBLES",
  "gBattleAnimSpriteGfx_RoundShadow", "gBattleAnimSpriteGfx_Splash",
  "gBattleAnimSpriteGfx_SweatBead", "gBattleAnimSpriteGfx_WaterImpact",
  "gBattleAnimSpriteGfx_SmallBubbles",
]) need(resources, token, "Dive resources");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)(?:\\s+[0-9a-fA-F]+)?\\s+\\S+\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing symbol ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
for (const [symbol, expected] of Object.entries(labels)) {
  if (address(symbol) !== expected) throw new Error(`${symbol} address drifted`);
}
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const graphMove = graph.moves.find((entry: any) => entry.move === "MOVE_DIVE");
const inventoryMove = inventory.tiers.level50.moves.find((entry: any) => entry.move === "MOVE_DIVE");
const ranges = policy.rentalSelection.ranges.level50 as Array<{ start: number; end: number }>;
const carriers = frontier.entries.filter((entry: any) =>
  ranges.some((range) => entry.index >= range.start && entry.index <= range.end)
  && entry.moves.includes("MOVE_DIVE"));
const track = coverage.componentTracks.find((entry: any) => entry.id === "two-turn-semi-invulnerable");
if (JSON.stringify(graphMove?.componentIds) !== JSON.stringify(components)
  || JSON.stringify(graphMove?.blocks) !== JSON.stringify([
    "Move_DIVE", "DiveSetUp", "DiveAttack", "DiveSetUpWaterDroplets",
    "DiveAttackWaterDroplets", "RisingWaterHitEffect",
  ]) || inventoryMove?.frontierMonCount !== 6 || carriers.length !== 6
  || carriers[0]?.index !== 116 || track?.fulfilled !== true
  || coverage.entries.find((entry: any) => entry.move === "MOVE_DIVE")?.status !== "exact") {
  throw new Error("Dive graph/legal/exact boundary drifted");
}

console.log(JSON.stringify({
  schema: "dive-source-audit/v1", move: "MOVE_DIVE", moveId: 291,
  status: "exact-source-contract", labels, components,
  source: {
    root: { start, endExclusive: end, bytes: end - start, sha256: sha(rom.subarray(start - 0x08000000, end - 0x08000000)), textSha256: sha(rootBody) },
    risingWater: { start: risingStart, endExclusive: risingEnd, bytes: risingEnd - risingStart, sha256: sha(rom.subarray(risingStart - 0x08000000, risingEnd - 0x08000000)), textSha256: sha(risingBody) },
  },
  lifecycle: { diveBall: 1, splashes: 2, sprayDroplets: 20, waterImpacts: 9, driftingBubbles: 18, shakeMon2: 1 },
  carriers: carriers.map(({ index, label, species, moves, itemName, nature, evSpreadStats }: any) => ({ index, label, species, moves, itemName, nature, evSpreadStats })),
  ownership: { reducer: true, seam: true, compositor: true, gameplay: false, coverageCredit: true, trackFulfilled: true },
}, null, 2));
