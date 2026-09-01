import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const ghost = read("reference/pokeemerald/src/battle_anim_ghost.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));

const block = (source: string, start: string, end: string): string => {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
};
const body = block(scripts, "Move_GRUDGE", "Move_CAMOUFLAGE");
const commands = body.split("\n").map((line) => line.replace(/@.*$/u, "").trim())
  .filter(Boolean).slice(1);
const expectedCommands = [
  "loadspritegfx ANIM_TAG_PURPLE_FLAME",
  "monbg ANIM_ATTACKER",
  "splitbgprio_all",
  "fadetobg BG_GHOST",
  "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER",
  "waitbgfadein",
  "createvisualtask AnimTask_GrudgeFlames, 3",
  "loopsewithpan SE_M_EMBER, SOUND_PAN_ATTACKER, 16, 4",
  "delay 10",
  "delay 80",
  "playsewithpan SE_M_NIGHTMARE, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "restorebg",
  "waitbgfadein",
  "clearmonbg ANIM_ATTACKER",
  "end",
];
if (commands.join("\n") !== expectedCommands.join("\n")) throw new Error("Move_GRUDGE script drifted");

const components = [
  "asset:ANIM_TAG_PURPLE_FLAME", "task:AnimTask_GrudgeFlames",
  "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg",
  "visualCommand:restorebg", "visualCommand:splitbgprio_all", "visualCommand:waitbgfadein",
];
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_GRUDGE");
if (!graphEntry || graphEntry.blocks.join(",") !== "Move_GRUDGE"
  || graphEntry.componentIds.join(",") !== components.join(",")) throw new Error("Grudge graph drifted");
const carrier = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_GRUDGE");
const haunter = frontier.entries.find((entry: { index: number }) => entry.index === 179);
if (!carrier || carrier.id !== 288 || carrier.exampleMons[0] !== "FRONTIER_MON_HAUNTER_1"
  || !haunter || haunter.species !== "SPECIES_HAUNTER" || haunter.itemName !== "BATTLE_FRONTIER_ITEM_PERSIM_BERRY"
  || haunter.nature !== "NATURE_RASH" || haunter.evSpreadStats.join("|") !== "F_EV_SPREAD_ATTACK|F_EV_SPREAD_HP") {
  throw new Error("lowest Level-50 Grudge carrier drifted");
}
for (const token of [
  "[FRONTIER_MON_HAUNTER_1]", ".species = SPECIES_HAUNTER",
  ".moves = {MOVE_SHADOW_PUNCH, MOVE_CONFUSE_RAY, MOVE_SPITE, MOVE_GRUDGE}",
  "BATTLE_FRONTIER_ITEM_PERSIM_BERRY", "F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP", "NATURE_RASH",
]) if (!mons.includes(token)) throw new Error(`Grudge carrier token drifted: ${token}`);

for (const token of [
  "static const union AnimCmd sAnim_GrudgeFlame[]", "ANIMCMD_FRAME(0, 4)",
  "ANIMCMD_FRAME(8, 4)", "ANIMCMD_FRAME(16, 4)", "ANIMCMD_FRAME(24, 4)", "ANIMCMD_JUMP(0)",
  "const struct SpriteTemplate gGrudgeFlameSpriteTemplate", ".tileTag = ANIM_TAG_PURPLE_FLAME",
  ".paletteTag = ANIM_TAG_PURPLE_FLAME", ".oam = &gOamData_AffineOff_ObjBlend_16x32",
  ".callback = AnimGrudgeFlame", "void AnimTask_GrudgeFlames(u8 taskId)",
  "static void AnimTask_GrudgeFlames_Step(u8 taskId)", "for (i = 0; i < 6; i++)",
  "gSprites[spriteId].data[2] = (i * 42) & 0xFF", "gSprites[spriteId].data[5] = i * 6",
  "static void AnimGrudgeFlame(struct Sprite *sprite)", "sprite->x2 = Sin(sprite->data[2], sprite->data[3])",
  "sprite->y2 = Sin(sprite->data[6], 7)", "DestroySprite(sprite)",
]) if (!ghost.includes(token)) throw new Error(`Grudge task/template drifted: ${token}`);
for (const token of [
  "#define ANIM_TAG_PURPLE_FLAME               (ANIM_SPRITES_START + 253)",
  "{gBattleAnimSpriteGfx_PurpleFlame, 0x0400, ANIM_TAG_PURPLE_FLAME}",
  "{gBattleAnimSpritePal_PurpleFlame, ANIM_TAG_PURPLE_FLAME}",
]) if (![constants, animData].some((source) => source.includes(token))) throw new Error(`Grudge asset drifted: ${token}`);
for (const token of [
  "gBattleAnimSpriteGfx_PurpleFlame[] = INCGFX_U32(\"graphics/battle_anims/sprites/purple_flame.png\"",
  "gBattleAnimSpritePal_PurpleFlame[] = INCGFX_U32(\"graphics/battle_anims/sprites/purple_flame.png\"",
]) if (!graphics.includes(token)) throw new Error(`Grudge graphics drifted: ${token}`);
for (const token of ["#define SE_M_NIGHTMARE              121", "#define SE_M_EMBER                  151", "#define SE_M_PSYBEAM                189"])
  if (!songs.includes(token)) throw new Error(`Grudge audio drifted: ${token}`);

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const symbols = new Map(nm.split("\n").map((line) => line.trim().split(/\s+/u))
  .filter((parts) => parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!))
  .map((parts) => [parts[2]!, Number.parseInt(parts[0]!, 16)]));
const start = symbols.get("Move_GRUDGE"); const end = symbols.get("Move_CAMOUFLAGE");
if (start !== 0x082ce466 || end !== 0x082ce48e) throw new Error("Grudge ROM interval drifted");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"))
  .subarray(start - 0x08000000, end - 0x08000000);
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== "222dda812d624b75879ca36ea709c7530ce83e604a14d08d6e508476a6f26270") throw new Error("Grudge ROM bytes drifted");

console.log(JSON.stringify({
  move: "MOVE_GRUDGE", moveId: 288,
  sourceBounds: { start: "0x082ce466", endExclusive: "0x082ce48e", byteLength: bytes.length, sha256: digest, pointerContract: "half-open-byte-interval" },
  graph: { blocks: graphEntry.blocks, components },
  carrier: { frontierMon: "FRONTIER_MON_HAUNTER_1", setId: 179, speciesId: 93, itemId: 140, nature: "NATURE_RASH" },
  template: "gGrudgeFlameSpriteTemplate", callbacks: ["AnimTask_GrudgeFlames", "AnimTask_GrudgeFlames_Step", "AnimGrudgeFlame", "DestroySprite"],
  affine: "off-only; gOamData_AffineOff_ObjBlend_16x32",
  audio: { opening: { sound: "SE_M_PSYBEAM", id: 189 }, loop: { sound: "SE_M_EMBER", id: 151, delay: 16, count: 4 }, closing: { sound: "SE_M_NIGHTMARE", id: 121 } },
  commands: expectedCommands,
}, null, 2));
