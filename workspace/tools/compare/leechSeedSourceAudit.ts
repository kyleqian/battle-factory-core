import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as {
  moves: Array<{ move: string; tier: string; componentIds: string[] }>;
};
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json")) as {
  tiers: { level50: { monIndices: { first: number; last: number } } };
};
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as {
  entries: Array<{ index: number; label: string; species: string; moves: string[]; nature: string }>;
};
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root,
  "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing symbol ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const block = (source: string, start: string, end: string): string => {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
};
const commands = (source: string): string[] => source.split("\n").slice(1)
  .map((line) => line.replace(/@.*$/, "").trim()).filter(Boolean);
const sha = (start: number, end: number): string => createHash("sha256")
  .update(rom.subarray(start - 0x08000000, end - 0x08000000)).digest("hex");

const move = block(scripts, "Move_LEECH_SEED", "Move_EMBER");
const general = block(scripts, "General_LeechSeedDrain", "General_MonHit");
const expectedMove = [
  "loadspritegfx ANIM_TAG_SEED",
  "playsewithpan SE_M_POISON_POWDER, SOUND_PAN_ATTACKER",
  "createleechseedsprite ANIM_TARGET, 2, initial_x=15, initial_y=0, target_x=0, target_y=24, duration=35, wave_amplitude=-32",
  "delay 8",
  "playsewithpan SE_M_POISON_POWDER, SOUND_PAN_ATTACKER",
  "createleechseedsprite ANIM_TARGET, 2, initial_x=15, initial_y=0, target_x=-16, target_y=24, duration=35, wave_amplitude=-40",
  "delay 8",
  "playsewithpan SE_M_POISON_POWDER, SOUND_PAN_ATTACKER",
  "createleechseedsprite ANIM_TARGET, 2, initial_x=15, initial_y=0, target_x=16, target_y=24, duration=35, wave_amplitude=-37",
  "delay 12",
  "loopsewithpan SE_M_TAIL_WHIP, SOUND_PAN_TARGET, 10, 8",
  "waitforvisualfinish",
  "end",
];
const expectedGeneral = [
  "createvisualtask AnimTask_GetBattlersFromArg, 5", "delay 0", "goto Move_ABSORB",
];
if (JSON.stringify(commands(move)) !== JSON.stringify(expectedMove))
  throw new Error("Move_LEECH_SEED command stream changed");
if (JSON.stringify(commands(general)) !== JSON.stringify(expectedGeneral))
  throw new Error("General_LeechSeedDrain graph changed");

for (const needle of [
  ".tileTag = ANIM_TAG_SEED", ".paletteTag = ANIM_TAG_SEED",
  ".oam = &gOamData_AffineOff_ObjNormal_16x16", ".anims = gLeechSeedAnimTable",
  ".affineAnims = gDummySpriteAffineAnimTable", ".callback = AnimLeechSeed",
  "ANIMCMD_FRAME(0, 1)", "ANIMCMD_FRAME(4, 7)", "ANIMCMD_FRAME(8, 7)",
  "InitSpritePosToAnimAttacker(sprite, TRUE)", "cmd->targetX = -cmd->targetX",
  "InitAnimArcTranslation(sprite)", "TranslateAnimHorizontalArc(sprite)",
  "sprite->invisible = TRUE", "sprite->data[0] = 10",
  "StoreSpriteCallbackInData6(sprite, AnimLeechSeedSprouts)",
  "sprite->invisible = FALSE", "StartSpriteAnim(sprite, 1)", "sprite->data[0] = 60",
  "StoreSpriteCallbackInData6(sprite, DestroyAnimSprite)",
]) if (!effects.includes(needle)) throw new Error(`missing callback fact: ${needle}`);

const drainBattleScript = block(battleScripts, "BattleScript_LeechSeedTurnDrain",
  "BattleScript_BideStoringEnergy");
for (const needle of [
  "playanimation BS_ATTACKER, B_ANIM_LEECH_SEED_DRAIN, sB_ANIM_ARG1",
  "healthbarupdate BS_ATTACKER", "copyword gBattleMoveDamage, gHpDealt",
  "manipulatedamage DMG_CHANGE_SIGN", "healthbarupdate BS_TARGET",
]) if (!drainBattleScript.includes(needle)) throw new Error(`missing residual provenance: ${needle}`);

const moveGraph = graph.moves.find((entry) => entry.move === "MOVE_LEECH_SEED");
const bulletGraph = graph.moves.find((entry) => entry.move === "MOVE_BULLET_SEED");
const range = inventory.tiers.level50.monIndices;
const carriers = mons.entries.filter((entry) => entry.index >= range.first
  && entry.index <= range.last && entry.moves.includes("MOVE_LEECH_SEED"));
if (carriers[0]?.index !== 112) throw new Error("lowest legal Level-50 carrier changed");
if (JSON.stringify(moveGraph?.componentIds) !== JSON.stringify([
  "asset:ANIM_TAG_SEED", "visualCommand:createleechseedsprite",
])) throw new Error("Leech Seed generated component graph changed");
if (bulletGraph?.tier !== "outsideFactory") throw new Error("Bullet Seed scope changed");

const symbols = Object.fromEntries([
  "Move_LEECH_SEED", "Move_EMBER", "General_LeechSeedDrain", "General_MonHit",
  "AnimLeechSeed", "AnimLeechSeed_Step", "AnimLeechSeedSprouts", "AnimSporeParticle",
  "AnimTask_GetBattlersFromArg", "gLeechSeedSpriteTemplate", "gSporeParticleAnimCmds1",
  "gBattleAnimSpriteGfx_Seed", "gBattleAnimSpritePal_RainDrops",
  "gBattleAnimSpritePal_Seed", "gBattleAnimSpriteGfx_Needle",
].map((name) => [name, address(name)]));
const span = (start: string, end: string) => ({
  start: `0x${symbols[start].toString(16).padStart(8, "0")}`,
  endExclusive: `0x${symbols[end].toString(16).padStart(8, "0")}`,
  bytes: symbols[end] - symbols[start], sha256: sha(symbols[start], symbols[end]),
});

console.log(JSON.stringify({
  move: "MOVE_LEECH_SEED",
  sourceBounds: span("Move_LEECH_SEED", "Move_EMBER"),
  residualBounds: span("General_LeechSeedDrain", "General_MonHit"),
  callbacks: {
    AnimLeechSeed: span("AnimLeechSeed", "AnimLeechSeed_Step"),
    AnimLeechSeed_Step: span("AnimLeechSeed_Step", "AnimLeechSeedSprouts"),
    AnimLeechSeedSprouts: span("AnimLeechSeedSprouts", "AnimSporeParticle"),
  },
  template: span("gLeechSeedSpriteTemplate", "gSporeParticleAnimCmds1"),
  assets: {
    seedGfxLiteral: span("gBattleAnimSpriteGfx_Seed", "gBattleAnimSpritePal_RainDrops"),
    seedPaletteLiteral: span("gBattleAnimSpritePal_Seed", "gBattleAnimSpriteGfx_Needle"),
    decompressedTileBytes: 0x180, paletteColors: 16,
  },
  projectiles: [
    { targetX: 0, targetY: 24, duration: 35, waveAmplitude: -32 },
    { targetX: -16, targetY: 24, duration: 35, waveAmplitude: -40 },
    { targetX: 16, targetY: 24, duration: 35, waveAmplitude: -37 },
  ],
  lifecycle: { arcCallback: "TranslateAnimHorizontalArc", hiddenFrames: 10,
    sproutFrames: 60, sproutAnimation: "4/8 tile frames, 7 ticks each, looping" },
  audio: { launches: "3x SE_M_POISON_POWDER/SOUND_PAN_ATTACKER",
    sprouts: "SE_M_TAIL_WHIP/SOUND_PAN_TARGET every 10 frames, 8 plays" },
  residualGraph: ["BattleScript_LeechSeedTurnDrain", "B_ANIM_LEECH_SEED_DRAIN",
    "General_LeechSeedDrain", "AnimTask_GetBattlersFromArg", "Move_ABSORB"],
  components: moveGraph!.componentIds,
  carrier: { range, lowestLevel50: carriers[0], allLevel50: carriers.map(({ index, label }) => ({ index, label })) },
  sibling: { move: "MOVE_BULLET_SEED", tier: bulletGraph!.tier,
    role: "asset/source sibling only; never a Leech Seed coverage sibling" },
  acceptance: "main and naturally staged residual bodies remain independently required",
}));
