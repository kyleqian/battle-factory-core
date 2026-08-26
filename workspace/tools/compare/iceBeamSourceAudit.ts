/** Authoritative source audit for the unsupported MOVE_ICE_BEAM checkpoint. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const hash = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const ice = read("reference/pokeemerald/src/battle_anim_ice.c");
const sound = read("reference/pokeemerald/src/battle_anim_sound_tasks.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const registry = read("reference/pokeemerald/src/data/battle_anim.h");
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
function address(symbol: string): number {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)(?:\\s+[0-9a-fA-F]+)?\\s+\\S+\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing symbol ${symbol}`);
  return Number.parseInt(match[1]!, 16);
}
function requireTokens(source: string, owner: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${owner} drifted: ${token}`);
}

const mainBody = scripts.slice(scripts.indexOf("Move_ICE_BEAM:"), scripts.indexOf("Move_WITHDRAW:"));
const effectBody = scripts.slice(scripts.indexOf("IceCrystalEffectShort:"), scripts.indexOf("IceCrystalEffectLong:"));
const components = [
  "asset:ANIM_TAG_ICE_CRYSTALS", "soundTask:SoundTask_LoopSEAdjustPanning",
  "sprite:gIceBeamInnerCrystalSpriteTemplate", "sprite:gIceBeamOuterCrystalSpriteTemplate",
  "sprite:gIceCrystalHitLargeSpriteTemplate", "sprite:gIceCrystalHitSmallSpriteTemplate",
  "subroutine:IceBeamCreateCrystals", "subroutine:IceCrystalEffectShort", "task:AnimTask_ShakeMon2",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha",
  "visualCommand:simple_palette_blend", "visualCommand:splitbgprio",
] as const;

requireTokens(mainBody, "Ice Beam script", [
  "monbg ANIM_TARGET", "splitbgprio ANIM_TARGET", "setalpha 12, 8", "loadspritegfx ANIM_TAG_ICE_CRYSTALS",
  "createsoundtask SoundTask_LoopSEAdjustPanning, SE_M_BUBBLE_BEAM2, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, 4, 4, 0, 10",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 25, 1", "call IceCrystalEffectShort",
  "clearmonbg ANIM_TARGET", "blendoff", "IceBeamCreateCrystals:",
]);
requireTokens(effectBody, "IceCrystalEffectShort", [
  "gIceCrystalHitLargeSpriteTemplate", "gIceCrystalHitSmallSpriteTemplate", "SE_M_ICY_WIND", "return",
]);
requireTokens(ice, "Ice Beam sprite source", [
  "const struct SpriteTemplate gIceBeamInnerCrystalSpriteTemplate =", "const struct SpriteTemplate gIceBeamOuterCrystalSpriteTemplate =",
  "const struct SpriteTemplate gIceCrystalHitLargeSpriteTemplate =", "const struct SpriteTemplate gIceCrystalHitSmallSpriteTemplate =",
  "static void AnimIceBeamParticle(struct Sprite *sprite)", "static void AnimIceEffectParticle(struct Sprite *sprite)",
  "static void AnimFlickerIceEffectParticle(struct Sprite *sprite)", "sprite->callback = StartAnimLinearTranslation;",
  "sprite->callback = RunStoredCallbackWhenAffineAnimEnds;", "if (sprite->data[0] == 20)",
]);
requireTokens(sound, "looped panning source", ["void SoundTask_LoopSEAdjustPanning(u8 taskId)", "SoundTask_LoopSEAdjustPanning_Step", "PlaySE12WithPanning"]);
requireTokens(movement, "ShakeMon2 source", ["void AnimTask_ShakeMon2(u8 taskId)", "static void AnimTask_ShakeMon2_Step(u8 taskId)"]);
requireTokens(graphics, "Ice Crystal graphics", [
  'gBattleAnimSpriteGfx_IceCrystals[] = INCGFX_U32("graphics/battle_anims/sprites/ice_crystals.4bpp", ".lz")',
  'gBattleAnimSpritePal_IceCrystals[] = INCGFX_U32("graphics/battle_anims/sprites/ice_crystals.pal", ".gbapal.lz")',
]);
requireTokens(registry, "Ice Crystal registry", [
  "{gBattleAnimSpriteGfx_IceCrystals, 0x01c0, ANIM_TAG_ICE_CRYSTALS}",
  "{gBattleAnimSpritePal_IceCrystals, ANIM_TAG_ICE_CRYSTALS}",
]);

const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_ICE_BEAM");
const moveInventory = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_ICE_BEAM");
const carriers = frontier.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_ICE_BEAM"));
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const romRange = (start: number, end: number) => hash(rom.subarray(start - 0x08000000, end - 0x08000000));
if (address("Move_ICE_BEAM") !== 0x082d06c0 || address("IceBeamCreateCrystals") !== 0x082d07c1
  || address("Move_WITHDRAW") !== 0x082d07f7 || address("IceCrystalEffectShort") !== 0x082d7720
  || address("IceCrystalEffectLong") !== 0x082d77a4 || address("AnimIceBeamParticle") !== 0x0810b8ec
  || address("AnimIceEffectParticle") !== 0x0810b974 || address("SoundTask_LoopSEAdjustPanning") !== 0x08158c58
  || address("AnimTask_ShakeMon2") !== 0x080d52d0
  || hash(mainBody) !== "0b8f87e65f68fcf690954dde61caa5e67bfa74d743c91933a35de17f8509bf11"
  || hash(effectBody) !== "96031e55891f2051396b5ac2d28303b96f65724d841e8e8cfce7d8be1a004ef2"
  || romRange(0x082d06c0, 0x082d07f7) !== "1c5b2c5be7eb05ac6e51b5e5ecf8a822d234de534659d184f8749c16b8b9e080"
  || romRange(0x082d7720, 0x082d77a4) !== "3da0ca21634d29ab068ed61238f9bb3129e4403019d36dbdcf4a7f722f3e5772"
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(components)
  || moveInventory?.id !== 58 || moveInventory?.exampleMons?.[0] !== "FRONTIER_MON_DELCATTY_2"
  || carriers[0]?.index !== 267 || carriers[0]?.label !== "FRONTIER_MON_DELCATTY_2") {
  throw new Error("MOVE_ICE_BEAM authoritative source contract drifted");
}

console.log(JSON.stringify({
  move: "MOVE_ICE_BEAM", moveId: 58, status: "exact-source-asset-contract",
  sourceBounds: {
    main: { start: "0x082d06c0", endExclusive: "0x082d07f7", bytes: 311, sha256: romRange(0x082d06c0, 0x082d07f7) },
    effect: { start: "0x082d7720", endExclusive: "0x082d77a4", bytes: 132, sha256: romRange(0x082d7720, 0x082d77a4) },
  },
  sourceText: { mainBytes: Buffer.byteLength(mainBody), mainSha256: hash(mainBody), effectBytes: Buffer.byteLength(effectBody), effectSha256: hash(effectBody) },
  components, counts: {
    beamGroups: (mainBody.match(/call IceBeamCreateCrystals/g) ?? []).length,
    initialOuter: 2, terminalInner: 2,
    shortEffectLarge: (effectBody.match(/gIceCrystalHitLargeSpriteTemplate/g) ?? []).length,
    shortEffectSmall: (effectBody.match(/gIceCrystalHitSmallSpriteTemplate/g) ?? []).length,
  },
  asset: { tag: "ANIM_TAG_ICE_CRYSTALS", bytes: 0x01c0, largeTile: 4, smallTile: 6 },
  audio: { song: "SE_M_BUBBLE_BEAM2", songId: 183, schedule: [4, 4, 0, 10] },
  shake: { battler: "ANIM_TARGET", x: 2, y: 0, count: 25, delay: 1 },
  carrier: { setId: 267, label: "FRONTIER_MON_DELCATTY_2", species: "SPECIES_DELCATTY", moves: carriers[0].moves },
  controls: { ice: ["MOVE_BLIZZARD", "MOVE_ICY_WIND"], soundTask: "MOVE_PSYBEAM", siblingCredit: false },
  ownership: { reducer: true, seam: true, renderer: true, framebuffer: true, exact: true, partial: false, staged: false },
}, null, 2));
