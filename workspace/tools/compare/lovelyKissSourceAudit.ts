import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
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

const body = block(scripts, "Move_LOVELY_KISS", "Move_FURY_SWIPES");
const commands = body.split("\n")
  .map((line) => line.replace(/@.*$/u, "").trim())
  .filter(Boolean)
  .slice(1);
const requiredCommands = [
  "loadspritegfx ANIM_TAG_PINK_HEART",
  "loadspritegfx ANIM_TAG_DEVIL",
  "createsprite gDevilSpriteTemplate, ANIM_TARGET, 2, 0, -24",
  "playsewithpan SE_M_PSYBEAM2, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "playsewithpan SE_M_ATTRACT, SOUND_PAN_TARGET",
  "createsprite gPinkHeartSpriteTemplate, ANIM_TARGET, 3, -256, -42",
  "createsprite gPinkHeartSpriteTemplate, ANIM_TARGET, 3, 128, -14",
  "createsprite gPinkHeartSpriteTemplate, ANIM_TARGET, 3, 416, -38",
  "createsprite gPinkHeartSpriteTemplate, ANIM_TARGET, 3, -128, -22",
  "end",
];
if (commands.join("\n") !== requiredCommands.join("\n")) {
  throw new Error("Move_LOVELY_KISS script drifted");
}

const expectedComponents = [
  "asset:ANIM_TAG_DEVIL",
  "asset:ANIM_TAG_PINK_HEART",
  "sprite:gDevilSpriteTemplate",
  "sprite:gPinkHeartSpriteTemplate",
];
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_LOVELY_KISS");
if (!graphEntry || graphEntry.componentIds.join(",") !== expectedComponents.join(",")) {
  throw new Error("Lovely Kiss component graph drifted");
}

const carrier = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_LOVELY_KISS",
);
const jynx = JSON.parse(read("src/data/gen/battle-frontier-mons.json")).entries.find(
  (entry: { index: number }) => entry.index === 377,
);
if (!carrier || carrier.id !== 142 || carrier.frontierMonCount !== 4
  || carrier.exampleMons[0] !== "FRONTIER_MON_JYNX_1"
  || !jynx || jynx.label !== "FRONTIER_MON_JYNX_1"
  || jynx.species !== "SPECIES_JYNX"
  || jynx.itemName !== "BATTLE_FRONTIER_ITEM_SHELL_BELL"
  || jynx.nature !== "NATURE_MODEST"
  || jynx.evSpreadStats.join("|") !== "F_EV_SPREAD_SP_ATTACK|F_EV_SPREAD_HP") {
  throw new Error("lowest Lovely Kiss carrier drifted");
}
const jynxSource = mons.slice(
  mons.indexOf("[FRONTIER_MON_JYNX_1]"),
  mons.indexOf("[FRONTIER_MON_DUSCLOPS_1]"),
);
for (const token of [
  "#define MOVE_LOVELY_KISS 142",
  "#define SPECIES_JYNX 124",
  "#define FRONTIER_MON_JYNX_1         377",
  ".species = SPECIES_JYNX",
  ".moves = {MOVE_ICE_BEAM, MOVE_FAKE_OUT, MOVE_LOVELY_KISS, MOVE_ATTRACT}",
  "BATTLE_FRONTIER_ITEM_SHELL_BELL",
  "F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP",
  "NATURE_MODEST",
]) {
  if (![moves, species, monConstants, jynxSource].some((source) => source.includes(token))) {
    throw new Error(`Lovely Kiss carrier/source token drifted: ${token}`);
  }
}
for (const token of [
  ".callback = AnimPinkHeart",
  ".callback = AnimDevil",
  "static void AnimPinkHeart_Step",
  "static void AnimDevil",
  "sprite->data[4] += sprite->data[1]",
  "sprite->data[3] = (sprite->data[3] + 3) & 0xFF",
  "DestroyAnimSprite(sprite)",
]) {
  if (!effects.includes(token)) throw new Error(`Lovely Kiss callback drifted: ${token}`);
}
for (const token of [
  "{gBattleAnimSpriteGfx_MagentaHeart, 0x0080, ANIM_TAG_PINK_HEART}",
  "{gBattleAnimSpriteGfx_Devil, 0x0400, ANIM_TAG_DEVIL}",
  "{gBattleAnimSpritePal_PinkHeart, ANIM_TAG_PINK_HEART}",
  "{gBattleAnimSpritePal_Devil, ANIM_TAG_DEVIL}",
]) {
  if (!animData.includes(token)) throw new Error(`Lovely Kiss asset identity drifted: ${token}`);
}
for (const token of ["SE_M_PSYBEAM2", "SE_M_ATTRACT"]) {
  if (!songs.includes(token)) throw new Error(`Lovely Kiss audio identity drifted: ${token}`);
}
if (/(?:monbg|setalpha|blendoff|setbldcnt|fadetobg|changebg)/u.test(body)) {
  throw new Error("Lovely Kiss unexpectedly owns GPU/background state");
}

const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length === 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields[3]!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}
const start = symbols.get("Move_LOVELY_KISS")?.address;
const end = symbols.get("Move_FURY_SWIPES")?.address;
if (start === undefined || end === undefined || end <= start) throw new Error("Lovely Kiss ROM interval missing");
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const bytes = rom.subarray(start - 0x08000000, end - 0x08000000);
const define = (name: string): number => {
  const match = songs.match(new RegExp(`#define\\s+${name}\\s+(\\d+)`));
  if (!match) throw new Error(`missing audio ID ${name}`);
  return Number.parseInt(match[1]!, 10);
};

console.log(JSON.stringify({
  move: "MOVE_LOVELY_KISS",
  moveId: 142,
  sourceBounds: {
    start: `0x${start.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${end.toString(16).padStart(8, "0")}`,
    byteLength: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    pointerContract: "half-open-byte-interval-with-even-and-odd-command-pointers-observed",
  },
  scriptCommands: commands,
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  callbacks: ["AnimDevil", "AnimPinkHeart", "AnimPinkHeart_Step"],
  assets: {
    devil: ["ANIM_TAG_DEVIL", "gBattleAnimSpriteGfx_Devil", "gBattleAnimSpritePal_Devil"],
    pinkHeart: ["ANIM_TAG_PINK_HEART", "gBattleAnimSpriteGfx_MagentaHeart", "gBattleAnimSpritePal_PinkHeart"],
  },
  audio: {
    first: { soundEffect: "SE_M_PSYBEAM2", id: define("SE_M_PSYBEAM2"), pan: "SOUND_PAN_TARGET" },
    hearts: { soundEffect: "SE_M_ATTRACT", id: define("SE_M_ATTRACT"), pan: "SOUND_PAN_TARGET" },
  },
  carrier: {
    frontierMon: "FRONTIER_MON_JYNX_1",
    setId: 377,
    speciesId: 124,
    item: "BATTLE_FRONTIER_ITEM_SHELL_BELL",
    nature: "NATURE_MODEST",
    evSpread: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"],
  },
  lifecycle: { devilCreates: 1, pinkHeartCreates: 4, visualTasks: 0 },
  controls: {
    sweetKiss: "source-neighbor control only: RED_HEART/ANGEL body is independent",
    attract: "source-neighbor control only: projectile/rising/background body is independent",
    sleep: "Sleep Powder/Yawn/Dream Eater are status/sleep controls only",
  },
  ownership: { gpuRegisters: false, gameplaySleep: false, damage: false, rngOutcome: false },
}, null, 2));
