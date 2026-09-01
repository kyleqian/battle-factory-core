/** Source and boundary contract for the unsupported MOVE_RAZOR_WIND track. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const bytes = (path: string): Buffer => readFileSync(resolve(root, path));
const sha256 = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const flying = read("reference/pokeemerald/src/battle_anim_flying.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));

const components = [
  "asset:ANIM_TAG_AIR_WAVE_2", "asset:ANIM_TAG_GUST", "asset:ANIM_TAG_IMPACT",
  "sprite:gAirWaveCrescentSpriteTemplate", "sprite:gRazorWindTornadoSpriteTemplate",
  "subroutine:RazorWindEnd", "subroutine:RazorWindSetUp", "subroutine:RazorWindUnleash",
  "task:AnimTask_ShakeMon2", "visualCommand:monbg", "visualCommand:setalpha",
  "visualCommand:clearmonbg", "visualCommand:blendoff",
];
const sameSet = (left: readonly string[] | undefined, right: readonly string[]): boolean =>
  !!left && left.length === right.length && [...left].sort().join("|") === [...right].sort().join("|");
const start = 0x082d3981;
const end = 0x082d3a67;
const labels = { Move_RAZOR_WIND: start, RazorWindEnd: 0x082d398a, RazorWindSetUp: 0x082d398c, RazorWindUnleash: 0x082d39dc, Move_DISABLE: end };

function requireToken(source: string, token: string, owner: string): void {
  if (!source.includes(token)) throw new Error(`${owner} drifted: ${token}`);
}

const body = scripts.slice(scripts.indexOf("Move_RAZOR_WIND:"), scripts.indexOf("Move_DISABLE:"));
const rows = body.trim().split("\n").map((line) => line.trim());
const expectedRows = [
  "Move_RAZOR_WIND:", "choosetwoturnanim RazorWindSetUp, RazorWindUnleash",
  "RazorWindEnd:", "waitforvisualfinish", "end", "", "RazorWindSetUp:",
  "loadspritegfx ANIM_TAG_GUST", "playsewithpan SE_M_GUST, SOUND_PAN_ATTACKER",
  "createsprite gRazorWindTornadoSpriteTemplate, ANIM_ATTACKER, 2, 32, 0, 16, 16, 0, 7, 40",
  "createsprite gRazorWindTornadoSpriteTemplate, ANIM_ATTACKER, 2, 32, 0, 16, 16, 85, 7, 40",
  "createsprite gRazorWindTornadoSpriteTemplate, ANIM_ATTACKER, 2, 32, 0, 16, 16, 170, 7, 40",
  "waitforvisualfinish", "playsewithpan SE_M_GUST2, SOUND_PAN_ATTACKER", "goto RazorWindEnd", "",
  "RazorWindUnleash:", "loadspritegfx ANIM_TAG_AIR_WAVE_2", "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_TARGET", "setalpha 12, 8", "playsewithpan SE_M_RAZOR_WIND2, SOUND_PAN_ATTACKER",
  "createsprite gAirWaveCrescentSpriteTemplate, ANIM_ATTACKER, 2, 14, 8, 0, 0, 22, 2, 1",
  "delay 2", "playsewithpan SE_M_RAZOR_WIND2, SOUND_PAN_ATTACKER",
  "createsprite gAirWaveCrescentSpriteTemplate, ANIM_ATTACKER, 2, 14, -8, 16, 14, 22, 1, 1",
  "delay 2", "playsewithpan SE_M_RAZOR_WIND2, SOUND_PAN_ATTACKER",
  "createsprite gAirWaveCrescentSpriteTemplate, ANIM_ATTACKER, 2, 14, 12, -16, -14, 22, 0, 1",
  "delay 17", "playsewithpan SE_M_RAZOR_WIND, SOUND_PAN_TARGET",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 10, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_DEF_PARTNER, 2, 0, 10, 1",
  "waitforvisualfinish", "clearmonbg ANIM_TARGET", "blendoff", "goto RazorWindEnd",
];
if (JSON.stringify(rows) !== JSON.stringify(expectedRows)) throw new Error("Razor Wind script body drifted");

for (const token of [
  "const struct SpriteTemplate gRazorWindTornadoSpriteTemplate", ".tileTag = ANIM_TAG_GUST,",
  ".paletteTag = ANIM_TAG_GUST,", ".oam = &gOamData_AffineNormal_ObjNormal_32x64,",
  ".callback = AnimRazorWindTornado,", "static void AnimRazorWindTornado(struct Sprite *sprite)",
  "sprite->callback = TranslateSpriteInCircle;", "gRazorWindTornadoAffineAnimCmds",
]) requireToken(effects, token, "Razor Wind tornado");
for (const token of [
  "const struct SpriteTemplate gAirWaveCrescentSpriteTemplate", ".tileTag = ANIM_TAG_AIR_WAVE_2,",
  ".paletteTag = ANIM_TAG_AIR_WAVE_2,", ".oam = &gOamData_AffineOff_ObjNormal_32x16,",
  ".callback = AnimAirWaveCrescent,", "static void AnimAirWaveCrescent(struct Sprite *sprite)",
  "sprite->callback = StartAnimLinearTranslation;", "SeekSpriteAnim(sprite, gBattleAnimArgs[5])",
]) requireToken(flying, token, "Razor Wind crescent");
for (const token of [
  "void AnimTask_ShakeMon2(u8 taskId)", "static void AnimTask_ShakeMon2_Step(u8 taskId)",
  "gSprites[spriteId].x2 = gBattleAnimArgs[1];", "gSprites[spriteId].y2 = gBattleAnimArgs[2];",
]) requireToken(movement, token, "Razor Wind ShakeMon2");
for (const token of [
  "gBattleAnimSpriteGfx_AirWave2", "gBattleAnimSpriteGfx_Gust", "gBattleAnimSpriteGfx_Impact",
  "gBattleAnimSpritePal_AirWave2", "gBattleAnimSpritePal_Gust", "gBattleAnimSpritePal_Impact",
]) requireToken(graphics, token, "Razor Wind graphics");
for (const token of [
  "ANIM_TAG_AIR_WAVE_2", "ANIM_TAG_GUST", "ANIM_TAG_IMPACT",
  "{gBattleAnimSpriteGfx_AirWave2, 0x0100, ANIM_TAG_AIR_WAVE_2}",
  "{gBattleAnimSpriteGfx_Gust, 0x0400, ANIM_TAG_GUST}",
  "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}",
]) requireToken(animData + constants, token, "Razor Wind resource registry");

const move = inventory.tiers.level50.moves.find((entry: any) => entry.move === "MOVE_RAZOR_WIND");
const outsideAeroblast = inventory.tiers.outsideFactory.moves.find((entry: any) => entry.move === "MOVE_AEROBLAST");
const graphMove = graph.moves.find((entry: any) => entry.move === "MOVE_RAZOR_WIND");
const ranges = policy.rentalSelection.ranges.level50 as Array<{ start: number; end: number }>;
const carriers = frontier.entries.filter((entry: any) => ranges.some((range) => entry.index >= range.start && entry.index <= range.end)
  && entry.moves.includes("MOVE_RAZOR_WIND"));
const track = coverage.componentTracks.find((entry: any) => entry.id === "razor-wind-two-turn-air-wave");
const accepted = coverage.entries.find((entry: any) => entry.move === "MOVE_RAZOR_WIND");
if (move?.id !== 13 || move?.frontierMonCount !== 2 || JSON.stringify(move.exampleMons) !== JSON.stringify(["FRONTIER_MON_NUZLEAF", "FRONTIER_MON_ABSOL_1"])
  || outsideAeroblast?.frontierMonCount !== 0 || !sameSet(graphMove?.componentIds, components)
  || JSON.stringify(graphMove?.blocks) !== JSON.stringify(["Move_RAZOR_WIND", "RazorWindSetUp", "RazorWindUnleash", "RazorWindEnd"])
  || carriers.length !== 2 || carriers[0]?.index !== 130 || carriers[0]?.label !== "FRONTIER_MON_NUZLEAF"
  || carriers[1]?.index !== 247 || carriers[1]?.label !== "FRONTIER_MON_ABSOL_1"
  || !track || track.fulfilled !== true || JSON.stringify(track.components) !== JSON.stringify(components)
  || accepted?.status !== "exact") throw new Error("Razor Wind inventory/coverage boundary drifted");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)(?:\\s+[0-9a-fA-F]+)?\\s+\\S+\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing symbol ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
for (const [symbol, expected] of Object.entries(labels)) if (address(symbol) !== expected) throw new Error(`${symbol} address drifted`);
const rom = bytes("reference/pokeemerald/pokeemerald.gba");
const interval = { start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`, bytes: end - start, sha256: sha256(rom.subarray(start - 0x08000000, end - 0x08000000)) };
for (const moveName of ["MOVE_SONIC_BOOM", "MOVE_STEEL_WING", "MOVE_SCREECH"]) {
  const control = coverage.entries.find((entry: any) => entry.move === moveName);
  if (control?.status !== "exact") throw new Error(`${moveName} shared control is not exact`);
}
console.log(JSON.stringify({
  move: "MOVE_RAZOR_WIND", moveId: 13, status: "unsupported-source-contract", source: { root: interval, text: { bytes: Buffer.byteLength(body), sha256: sha256(body), rows } },
  labels, components, carrier: { lowestLegal: carriers[0], siblingLegal: carriers[1], legalRanges: ranges },
  controls: { gust: ["MOVE_STEEL_WING", "MOVE_SONIC_BOOM"], impact: ["MOVE_SONIC_BOOM", "MOVE_SCREECH"], shakeMon2: ["MOVE_SONIC_BOOM", "MOVE_SCREECH"], aeroblast: "outside-factory/no-credit" },
  lifecycle: { setupTornadoes: 3, unleashCrescents: 3, shakeMon2Invocations: 2, absentSinglesPartnerInvocation: true, sourceWindowMustEndAtFirstInactiveCleanup: true },
  ownership: { reducer: false, asset: false, stageEvidence: true, seam: false, renderer: false, framebuffer: false, gameplay: false },
}, null, 2));
