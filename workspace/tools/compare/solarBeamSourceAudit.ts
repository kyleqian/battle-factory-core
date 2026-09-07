/** Authoritative source/classification audit for the unsupported MOVE_SOLAR_BEAM body. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const from = scripts.indexOf("Move_SOLAR_BEAM:");
const to = scripts.indexOf("Move_BLIZZARD:", from);
if (from < 0 || to < 0) throw new Error("missing Solar Beam source interval");
const body = scripts.slice(from, to);

const components = [
  "asset:ANIM_TAG_ORBS",
  "subroutine:SetSolarBeamBg", "subroutine:SetSolarBeamBgContest",
  "subroutine:SetSolarBeamBgContinue", "subroutine:SetSolarBeamBgOpponent",
  "subroutine:SetSolarBeamBgPlayer", "subroutine:SolarBeamAbsorbEffect",
  "subroutine:SolarBeamEnd", "subroutine:SolarBeamSetUp",
  "subroutine:SolarBeamUnleash", "subroutine:SolarBeamUnleash1",
  "subroutine:UnsetSolarBeamBg",
  "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_CreateSmallSolarBeamOrbs",
  "task:AnimTask_IsContest", "task:AnimTask_IsTargetPlayerSide",
  "task:AnimTask_ShakeMon2", "visualCommand:blend_color_cycle",
  "visualCommand:blendoff", "visualCommand:clearmonbg",
  "visualCommand:create_power_absorption_orb_sprite",
  "visualCommand:create_solar_beam_big_orb_sprite", "visualCommand:fadetobg",
  "visualCommand:monbg", "visualCommand:panse", "visualCommand:restorebg",
  "visualCommand:setalpha", "visualCommand:waitbgfadein",
] as const;

const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const graphMove = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_SOLAR_BEAM");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_SOLAR_BEAM");
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const allCarriers = frontier.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_SOLAR_BEAM"));
const ranges = inventory.tiers.level50.monIndices;
const carriers = allCarriers.filter((entry: { index: number }) => entry.index >= ranges.first && entry.index <= ranges.last);
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "contest-target-side-impact-bg");
const entry = coverage.entries.find((item: { move: string }) => item.move === "MOVE_SOLAR_BEAM");
const status = entry?.status ?? "unsupported";

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)(?:\\s+[0-9a-fA-F]+)?\\s+\\S+\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const labels = {
  Move_SOLAR_BEAM: 0x082d08d8,
  SolarBeamEnd: 0x082d08e4,
  SolarBeamSetUp: 0x082d08e6,
  SolarBeamAbsorbEffect: 0x082d0910,
  SolarBeamUnleash: 0x082d09e3,
  SolarBeamUnleash1: 0x082d0ab5,
  Move_BLIZZARD: 0x082d0b2d,
  SetSolarBeamBg: 0x082d7d1d,
  SetSolarBeamBgContinue: 0x082d7d40,
  SetSolarBeamBgContest: 0x082d7d42,
  SetSolarBeamBgPlayer: 0x082d7d49,
  SetSolarBeamBgOpponent: 0x082d7d50,
  UnsetSolarBeamBg: 0x082d7d57,
} as const;
for (const [symbol, expected] of Object.entries(labels)) {
  if (address(symbol) !== expected) throw new Error(`${symbol} address drifted`);
}
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const romBytes = rom.subarray(labels.Move_SOLAR_BEAM - 0x08000000, labels.Move_BLIZZARD - 0x08000000);

const requireToken = (source: string, token: string, owner: string): void => {
  if (!source.includes(token)) throw new Error(`${owner} drifted: ${token}`);
};
for (const token of [
  "choosetwoturnanim SolarBeamSetUp, SolarBeamUnleash",
  "monbg ANIM_ATK_PARTNER", "blend_color_cycle priority=2, selector=F_PAL_ATTACKER",
  "playsewithpan SE_M_MEGA_KICK, SOUND_PAN_ATTACKER", "call SolarBeamAbsorbEffect",
  "create_power_absorption_orb_sprite", "call SetSolarBeamBg",
  "panse SE_M_SOLAR_BEAM, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +2, 0",
  "createvisualtask AnimTask_CreateSmallSolarBeamOrbs, 5",
  "create_solar_beam_big_orb_sprite", "createvisualtask AnimTask_BlendBattleAnimPal",
  "createvisualtask AnimTask_ShakeMon2, 5, ANIM_TARGET, 2, 0, 65, 1",
  "call SolarBeamUnleash1", "call UnsetSolarBeamBg", "clearmonbg ANIM_ATK_PARTNER", "blendoff",
] as const) requireToken(body, token, "Solar Beam script");
for (const token of [
  "SetSolarBeamBg:", "createvisualtask AnimTask_IsContest, 2",
  "fadetobg BG_SOLAR_BEAM_CONTESTS", "fadetobg BG_SOLAR_BEAM_PLAYER",
  "fadetobg BG_SOLAR_BEAM_OPPONENT", "UnsetSolarBeamBg:", "restorebg",
] as const) requireToken(scripts, token, "Solar Beam selector");

const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const anim = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
for (const token of [
  "const struct SpriteTemplate gPowerAbsorptionOrbSpriteTemplate",
  "const struct SpriteTemplate gSolarBeamBigOrbSpriteTemplate",
  "const struct SpriteTemplate gSolarBeamSmallOrbSpriteTemplate",
  ".oam = &gOamData_AffineNormal_ObjBlend_16x16",
  ".oam = &gOamData_AffineOff_ObjNormal_8x8",
  "static void AnimPowerAbsorptionOrb(struct Sprite *sprite)",
  "static void AnimSolarBeamBigOrb(struct Sprite *sprite)",
  "static void AnimSolarBeamSmallOrb(struct Sprite *sprite)",
  "void AnimTask_CreateSmallSolarBeamOrbs(u8 taskId)",
]) requireToken(effects, token, "Solar Beam effect source");
for (const token of [
  "void AnimTask_ShakeMon2(u8 taskId)", "gSprites[spriteId].x2 = gBattleAnimArgs[1]",
  "gSprites[spriteId].y2 = gBattleAnimArgs[2]",
]) requireToken(movement, token, "Solar Beam ShakeMon2 source");
for (const token of [
  "gBattleAnimSpriteGfx_Orbs", "gBattleAnimSpritePal_Orbs",
  "gBattleAnimBgPalette_SolarBeam", "gBattleAnimBgTilemap_SolarBeam",
]) requireToken(graphics, token, "Solar Beam graphics source");
for (const token of [
  "ANIM_TAG_ORBS", "{gBattleAnimSpriteGfx_Orbs", "{gBattleAnimSpritePal_Orbs",
  "[BG_SOLAR_BEAM_OPPONENT]", "[BG_SOLAR_BEAM_PLAYER]", "[BG_SOLAR_BEAM_CONTESTS]",
]) requireToken(anim, token, "Solar Beam resource registry");

const controlRoots = ["MOVE_HYPER_FANG", "MOVE_MEGA_PUNCH", "MOVE_MEGA_KICK", "MOVE_FOCUS_PUNCH"];
for (const control of controlRoots) {
  const controlEntry = coverage.entries.find((item: { move: string }) => item.move === control);
  if (controlEntry?.status !== "exact") throw new Error(`${control} control is not exact`);
}
if (move?.id !== 76 || move.frontierMonCount !== 16 || move.speciesCount !== 16
  || !graphMove || JSON.stringify(graphMove.componentIds) !== JSON.stringify(components)
  || JSON.stringify(graphMove.blocks) !== JSON.stringify([
    "Move_SOLAR_BEAM", "SolarBeamSetUp", "SolarBeamUnleash", "SolarBeamAbsorbEffect",
    "SolarBeamEnd", "SetSolarBeamBg", "SolarBeamUnleash1", "UnsetSolarBeamBg",
    "SetSolarBeamBgContest", "SetSolarBeamBgOpponent", "SetSolarBeamBgPlayer", "SetSolarBeamBgContinue",
  ]) || allCarriers.length !== 16 || carriers.length !== 16 || status !== "unsupported"
  || !track || track.fulfilled !== false || JSON.stringify(track.representatives) !== JSON.stringify([
    "MOVE_HYPER_FANG", "MOVE_MEGA_PUNCH", "MOVE_MEGA_KICK", "MOVE_SOLAR_BEAM", "MOVE_FOCUS_PUNCH",
  ])) throw new Error("MOVE_SOLAR_BEAM inventory/graph/coverage contract changed");

console.log(JSON.stringify({
  move: "MOVE_SOLAR_BEAM", moveId: 76, status,
  source: {
    elf: { start: `0x${labels.Move_SOLAR_BEAM.toString(16)}`, endExclusive: `0x${labels.Move_BLIZZARD.toString(16)}` },
    romByteLength: romBytes.length, romSha256: sha256(romBytes), sourceByteLength: Buffer.byteLength(body), sourceSha256: sha256(body),
  },
  labels, graph: { blocks: graphMove.blocks, componentIds: components },
  carrierCensus: { count: carriers.length, setIds: carriers.map((item: { index: number }) => item.index), labels: carriers.map((item: { label: string }) => item.label), allCarriers: allCarriers.map((item: { index: number }) => item.index) },
  dispatch: {
    setupAbsorptionOrbs: 14, unleashBigOrbs: 21, unleashSmallOrbs: 15, shakeMon2: [2, 0, 65, 1],
    setupAudio: "SE_M_MEGA_KICK", unleashAudio: "SE_M_SOLAR_BEAM", targetBackgrounds: [4, 5, 6],
  },
  controls: controlRoots, ownership: { reducer: false, seam: false, compositor: false, framebuffer: false, gameplay: false },
}, null, 2));
