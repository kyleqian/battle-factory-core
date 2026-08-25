/** Authoritative-source audit for the unsupported MOVE_ERUPTION checkpoint. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (relative: string): string => readFileSync(resolve(root, relative), "utf8");
const bytes = (relative: string): Buffer => readFileSync(resolve(root, relative));
const hash = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");

const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fire = read("reference/pokeemerald/src/battle_anim_fire.c");
const ground = read("reference/pokeemerald/src/battle_anim_ground.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
function address(symbol: string): number {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)(?:\\s+[0-9a-fA-F]+)?\\s+\\S+\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing symbol ${symbol}`);
  return Number.parseInt(match[1]!, 16);
}
function requireToken(source: string, token: string, owner: string): void {
  if (!source.includes(token)) throw new Error(`${owner} drifted: ${token}`);
}

const body = scripts.slice(scripts.indexOf("Move_ERUPTION:"), scripts.indexOf("Move_SKILL_SWAP:"));
const commandRows = body.trim().split("\n").map((line) => line.trim());
const expectedComponents = [
  "asset:ANIM_TAG_WARM_ROCK",
  "sprite:gEruptionFallingRockSpriteTemplate",
  "task:AnimTask_EruptionLaunchRocks",
  "task:AnimTask_HorizontalShake",
  "visualCommand:simple_palette_blend",
];
const expectedCommands = [
  "Move_ERUPTION:",
  "loadspritegfx ANIM_TAG_WARM_ROCK",
  "simple_palette_blend selector=F_PAL_BG | F_PAL_BATTLERS, delay=2, initial_blend_y=0, target_blend_y=4, color=RGB_RED",
  "waitforvisualfinish",
  "createvisualtask AnimTask_EruptionLaunchRocks, 2",
  "waitplaysewithpan SE_M_EXPLOSION, SOUND_PAN_ATTACKER, 60",
  "waitforvisualfinish",
  "createvisualtask AnimTask_EruptionLaunchRocks, 2",
  "waitplaysewithpan SE_M_EXPLOSION, SOUND_PAN_ATTACKER, 60",
  "waitforvisualfinish",
  "delay 30",
  "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 200, -32, 0, 100, 0",
  "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 30, -32, 16, 90, 1",
  "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 150, -32, 32, 60, 2",
  "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 90, -32, 48, 80, 3",
  "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 110, -32, 64, 50, 0",
  "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 60, -32, 80, 70, 1",
  "delay 22",
  "createvisualtask AnimTask_HorizontalShake, 5, (MAX_BATTLERS_COUNT + 1), 8, 60",
  "createvisualtask AnimTask_HorizontalShake, 5, MAX_BATTLERS_COUNT, 8, 60",
  "loopsewithpan SE_M_ROCK_THROW, SOUND_PAN_TARGET, 16, 12",
  "delay 80",
  "simple_palette_blend unused_subpriority_offset=40, selector=F_PAL_BG | F_PAL_BATTLERS, delay=4, initial_blend_y=4, target_blend_y=0, color=RGB_RED",
  "end",
];
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_ERUPTION");
const moveInventory = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_ERUPTION");
const carriers = frontier.entries.filter((entry: { index: number; moves: string[] }) => entry.moves.includes("MOVE_ERUPTION"));
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "eruption-warm-rock");

for (const token of [
  "const struct SpriteTemplate gEruptionLaunchRockSpriteTemplate =", ".tileTag = ANIM_TAG_WARM_ROCK,",
  ".callback = AnimEruptionLaunchRock,", "const struct SpriteTemplate gEruptionFallingRockSpriteTemplate =",
  ".callback = AnimEruptionFallingRock,", "void AnimTask_EruptionLaunchRocks(u8 taskId)",
  "static void AnimTask_EruptionLaunchRocks_Step(u8 taskId)", "static void CreateEruptionLaunchRocks",
  "static void AnimEruptionLaunchRock(struct Sprite *sprite)", "static void AnimEruptionFallingRock(struct Sprite *sprite)",
  "static void AnimEruptionFallingRock_Step(struct Sprite *sprite)", "if (++j >= 5)",
  "if (++sprite->sEndTimer > 16)",
]) requireToken(fire, token, "Eruption fire source");
for (const token of [
  "void AnimTask_HorizontalShake(u8 taskId)", "MAX_BATTLERS_COUNT + 1", "task->func = AnimTask_ShakePlatforms;",
  "task->func = AnimTask_ShakeBattlers;",
]) requireToken(ground, token, "Eruption horizontal-shake source");
for (const token of [
  ".macro simple_palette_blend", "gSimplePaletteBlendSpriteTemplate",
]) requireToken(macros, token, "Eruption palette macro");
for (const token of [
  "const struct SpriteTemplate gSimplePaletteBlendSpriteTemplate =", "static void AnimSimplePaletteBlend(struct Sprite *sprite)",
  "UnpackSelectedBattlePalettes(cmd->selector)",
]) requireToken(normal, token, "Eruption palette source");
for (const token of [
  "{gBattleAnimSpriteGfx_WarmRock, 0x0a80, ANIM_TAG_WARM_ROCK}",
  "{gBattleAnimSpritePal_WarmRock, ANIM_TAG_WARM_ROCK}",
]) requireToken(animData, token, "Eruption Warm Rock asset table");
for (const token of [
  "gBattleAnimSpriteGfx_WarmRock[] = INCGFX_U32(\"graphics/battle_anims/sprites/warm_rock.png\", \".4bpp.lz\")",
  "gBattleAnimSpritePal_WarmRock[] = INCGFX_U32(\"graphics/battle_anims/sprites/warm_rock.png\", \".gbapal.lz\")",
]) requireToken(graphics, token, "Eruption Warm Rock graphics");
for (const token of ["#define ANIM_TAG_WARM_ROCK", "#define SE_M_ROCK_THROW             131", "#define SE_M_EXPLOSION              178"])
  requireToken(token.startsWith("#define ANIM") ? constants : songs, token, "Eruption constants");

const start = 0x082ce30b;
const end = 0x082ce3d8;
const rom = bytes("reference/pokeemerald/pokeemerald.gba");
const romDigest = hash(rom.subarray(start - 0x08000000, end - 0x08000000));
if (address("Move_ERUPTION") !== start || address("Move_SKILL_SWAP") !== end
  || address("AnimTask_EruptionLaunchRocks") !== 0x08109460
  || address("AnimTask_EruptionLaunchRocks_Step") !== 0x081094d0
  || address("CreateEruptionLaunchRocks") !== 0x081097b4
  || address("AnimEruptionLaunchRock") !== 0x081098ec
  || address("AnimEruptionFallingRock") !== 0x08109a10
  || address("AnimEruptionFallingRock_Step") !== 0x08109a64
  || address("AnimTask_HorizontalShake") !== 0x081152dc
  || address("gEruptionLaunchRockSpriteTemplate") !== 0x085955b4
  || address("gEruptionFallingRockSpriteTemplate") !== 0x085955e8
  || address("gBattleAnimSpriteGfx_WarmRock") !== 0x08c21874
  || address("gBattleAnimSpritePal_WarmRock") !== 0x08c21ee4
  || commandRows.join("\n") !== expectedCommands.join("\n")
  || Buffer.byteLength(body) !== 1370
  || hash(body) !== "4a8566a35ab12634ba5481049250003fc96033e2adb44421d9eb4faa72279559"
  || romDigest !== "d08f6fd6af6a0f7b6ded592cce73ba65c55df60a99397b14bb42d083a1bb507f"
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(expectedComponents)
  || moveInventory?.id !== 284 || moveInventory?.exampleMons?.join(",") !== "FRONTIER_MON_CAMERUPT_2"
  || carriers.length !== 1 || carriers[0]?.index !== 346 || carriers[0]?.label !== "FRONTIER_MON_CAMERUPT_2"
  || carriers[0]?.species !== "SPECIES_CAMERUPT" || carriers[0]?.moves.join(",") !== "MOVE_EARTHQUAKE,MOVE_ERUPTION,MOVE_BODY_SLAM,MOVE_SCARY_FACE"
  || track?.fulfilled !== false || JSON.stringify(track?.components) !== JSON.stringify(expectedComponents)) {
  throw new Error("MOVE_ERUPTION authoritative source/staging contract drifted");
}

console.log(JSON.stringify({
  move: "MOVE_ERUPTION", moveId: 284, status: "unsupported-source-staging-checkpoint",
  sourceBounds: { start: "0x082ce30b", endExclusive: "0x082ce3d8", bytes: end - start, sha256: romDigest, pointerContract: "half-open-byte-interval" },
  sourceText: { bytes: Buffer.byteLength(body), sha256: hash(body), commandRows },
  components: expectedComponents,
  callbacks: ["AnimTask_EruptionLaunchRocks", "AnimTask_EruptionLaunchRocks_Step", "AnimEruptionLaunchRock", "AnimEruptionFallingRock", "AnimEruptionFallingRock_Step", "AnimTask_HorizontalShake", "AnimSimplePaletteBlend"],
  templates: ["gEruptionLaunchRockSpriteTemplate", "gEruptionFallingRockSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"],
  assets: { tag: "ANIM_TAG_WARM_ROCK", gfx: "gBattleAnimSpriteGfx_WarmRock", palette: "gBattleAnimSpritePal_WarmRock", bytes: 0x0a80 },
  audio: { explosion: { id: 178, pan: "SOUND_PAN_ATTACKER", waits: 2, delay: 60 }, rockThrow: { id: 131, pan: "SOUND_PAN_TARGET", interval: 16, count: 12 } },
  carrier: { setId: 346, label: "FRONTIER_MON_CAMERUPT_2", species: "SPECIES_CAMERUPT", moves: carriers[0].moves, item: "BATTLE_FRONTIER_ITEM_LAX_INCENSE", nature: "NATURE_QUIRKY", evs: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_ATTACK"] },
  ownership: { gameplayState: false, damage: false, weather: false, rng: false, controller: false, reducer: false, renderer: false },
}, null, 2));
