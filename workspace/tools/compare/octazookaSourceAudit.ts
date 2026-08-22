import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const monConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const moves = read("reference/pokeemerald/include/constants/moves.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));

const block = (source: string, start: string, end: string): string => {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
};

const body = block(scripts, "Move_OCTAZOOKA", "Move_MIST");
const commands = body.split("\n").map((line) => line.replace(/@.*$/u, "").trim()).filter(Boolean).slice(1);
const expectedCommands = [
  "loadspritegfx ANIM_TAG_GRAY_SMOKE",
  "loadspritegfx ANIM_TAG_BLACK_BALL",
  "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_ATTACKER",
  "createsprite gOctazookaBallSpriteTemplate, ANIM_TARGET, 2, 20, 0, 0, 0, 20, 0",
  "waitforvisualfinish",
  "playsewithpan SE_M_SELF_DESTRUCT, SOUND_PAN_TARGET",
  "createsprite gOctazookaSmokeSpriteTemplate, ANIM_TARGET, 2, 8, 8, 1, 0",
  "delay 2",
  "createsprite gOctazookaSmokeSpriteTemplate, ANIM_TARGET, 2, -8, -8, 1, 0",
  "delay 2",
  "createsprite gOctazookaSmokeSpriteTemplate, ANIM_TARGET, 2, 8, -8, 1, 0",
  "delay 2",
  "createsprite gOctazookaSmokeSpriteTemplate, ANIM_TARGET, 2, -8, 8, 1, 0",
  "waitforvisualfinish",
  "end",
];
if (commands.join("\n") !== expectedCommands.join("\n")) throw new Error("Move_OCTAZOOKA script drifted");

const components = [
  "asset:ANIM_TAG_BLACK_BALL",
  "asset:ANIM_TAG_GRAY_SMOKE",
  "sprite:gOctazookaBallSpriteTemplate",
  "sprite:gOctazookaSmokeSpriteTemplate",
];
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_OCTAZOOKA");
if (!graphEntry || graphEntry.blocks.join(",") !== "Move_OCTAZOOKA" || graphEntry.componentIds.join(",") !== components.join(",")) {
  throw new Error("Octazooka component graph drifted");
}
const carrier = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_OCTAZOOKA");
const octillery = JSON.parse(read("src/data/gen/battle-frontier-mons.json")).entries.find((entry: { index: number }) => entry.index === 256);
if (!carrier || carrier.id !== 190 || carrier.exampleMons[0] !== "FRONTIER_MON_OCTILLERY_1"
  || !octillery || octillery.species !== "SPECIES_OCTILLERY"
  || octillery.itemName !== "BATTLE_FRONTIER_ITEM_SHELL_BELL" || octillery.nature !== "NATURE_HARDY"
  || octillery.evSpreadStats.join("|") !== "F_EV_SPREAD_SP_ATTACK|F_EV_SPREAD_ATTACK") {
  throw new Error("lowest Octazooka carrier drifted");
}
const carrierSource = mons.slice(mons.indexOf("[FRONTIER_MON_OCTILLERY_1]"), mons.indexOf("[FRONTIER_MON_HUNTAIL_1]"));
for (const token of [
  "#define MOVE_OCTAZOOKA 190", "#define SPECIES_OCTILLERY 224", "#define FRONTIER_MON_OCTILLERY_1    256",
  ".species = SPECIES_OCTILLERY", ".moves = {MOVE_OCTAZOOKA, MOVE_AURORA_BEAM, MOVE_PSYBEAM, MOVE_ROCK_BLAST}",
  "BATTLE_FRONTIER_ITEM_SHELL_BELL", "F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_ATTACK", "NATURE_HARDY",
]) if (![moves, species, monConstants, carrierSource].some((source) => source.includes(token))) throw new Error(`Octazooka carrier token drifted: ${token}`);

for (const token of [
  "const struct SpriteTemplate gOctazookaBallSpriteTemplate", ".tileTag = ANIM_TAG_BLACK_BALL",
  ".callback = TranslateAnimSpriteToTargetMonLocation", "const struct SpriteTemplate gOctazookaSmokeSpriteTemplate",
  ".tileTag = ANIM_TAG_GRAY_SMOKE", ".callback = AnimSpriteOnMonPos", "ANIMCMD_FRAME(64, 3)",
]) if (!effects.includes(token)) throw new Error(`Octazooka callback/template drifted: ${token}`);
for (const token of [
  "{gBattleAnimSpriteGfx_BlackBall, 0x0020, ANIM_TAG_BLACK_BALL}",
  "{gBattleAnimSpriteGfx_GraySmoke, 0x0A00, ANIM_TAG_GRAY_SMOKE}",
  "{gBattleAnimSpritePal_BlackSmoke, ANIM_TAG_BLACK_BALL}",
  "{gBattleAnimSpritePal_GraySmoke, ANIM_TAG_GRAY_SMOKE}",
]) if (!animData.includes(token)) throw new Error(`Octazooka asset drifted: ${token}`);
for (const token of ["#define SE_M_MEGA_KICK2             141", "#define SE_M_SELF_DESTRUCT          177"]) {
  if (!songs.includes(token)) throw new Error(`Octazooka audio drifted: ${token}`);
}
if (/(?:monbg|setalpha|blendoff|setbldcnt|fadetobg|changebg|createvisualtask)/u.test(body)) throw new Error("Octazooka unexpectedly owns task/GPU state");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map(nm.split("\n").map((line) => line.trim().split(/\s+/u)).filter((parts) => parts.length >= 3 && /^[0-9a-f]+$/iu.test(parts[0]!)).map((parts) => [parts.at(-1)!, Number.parseInt(parts[0]!, 16)]));
const start = symbols.get("Move_OCTAZOOKA"); const end = symbols.get("Move_MIST");
if (start !== 0x082d2b83 || end !== 0x082d2be9) throw new Error("Octazooka ROM interval drifted");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba")).subarray(start - 0x08000000, end - 0x08000000);
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== "1c86b2d6fc47a5825cd0e3f63d74c413d524eb025e09676de1e4d1851863c0a9") throw new Error("Octazooka ROM bytes drifted");

console.log(JSON.stringify({
  move: "MOVE_OCTAZOOKA", moveId: 190,
  sourceBounds: { start: "0x082d2b83", endExclusive: "0x082d2be9", byteLength: bytes.length, sha256: digest, pointerContract: "half-open-byte-interval" },
  graph: { blocks: graphEntry.blocks, components },
  carrier: { frontierMon: "FRONTIER_MON_OCTILLERY_1", setId: 256, speciesId: 224, item: "BATTLE_FRONTIER_ITEM_SHELL_BELL", nature: "NATURE_HARDY", evs: ["SP_ATTACK", "ATTACK"] },
  templates: ["gOctazookaBallSpriteTemplate", "gOctazookaSmokeSpriteTemplate"],
  callbacks: ["TranslateAnimSpriteToTargetMonLocation", "AnimSpriteOnMonPos", "DestroyAnimSprite"],
  audio: { launch: { soundEffect: "SE_M_MEGA_KICK2", id: 141, pan: "SOUND_PAN_ATTACKER" }, impact: { soundEffect: "SE_M_SELF_DESTRUCT", id: 177, pan: "SOUND_PAN_TARGET" } },
}, null, 2));
