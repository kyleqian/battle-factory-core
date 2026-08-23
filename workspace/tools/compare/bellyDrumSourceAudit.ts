import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const monMovement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));

const start = scripts.indexOf("Move_BELLY_DRUM:");
const end = scripts.indexOf("Move_SLUDGE_BOMB:", start);
if (start < 0 || end < 0) throw new Error("Belly Drum source block drifted");
const body = scripts.slice(start, end);
for (const token of [
  "loadspritegfx ANIM_TAG_MUSIC_NOTES",
  "loadspritegfx ANIM_TAG_PURPLE_HAND_OUTLINE",
  "createvisualtask AnimTask_MusicNotesRainbowBlend, 2",
  "call BellyDrumRight",
  "call BellyDrumLeft",
  "createsprite gSlowFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 0, 0",
  "createsprite gSlowFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 1, 1, 1, 0",
  "createsprite gSlowFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 0, 3, 3, 128",
  "createsprite gSlowFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 1, 2, 0, 128",
  "createsprite gSlowFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 0, 1, 1, 0",
  "createsprite gSlowFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 1, 0, 3, 0",
  "playsewithpan SE_M_BELLY_DRUM, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_MusicNotesClearRainbowBlend, 2",
  "createsprite gBellyDrumHandSpriteTemplate, ANIM_ATTACKER, 3, 0",
  "createsprite gBellyDrumHandSpriteTemplate, ANIM_ATTACKER, 3, 1",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_ATTACKER, 0, 8, 2, 1",
]) if (!body.includes(token)) throw new Error(`Belly Drum script drifted: ${token}`);

for (const token of [
  "void AnimTask_MusicNotesRainbowBlend(u8 taskId)",
  "void AnimTask_MusicNotesClearRainbowBlend(u8 taskId)",
  "void AnimSlowFlyingMusicNotes(struct Sprite *sprite)",
  "static void AnimSlowFlyingMusicNotes_Step(struct Sprite *sprite)",
  "static void AnimBellyDrumHand(struct Sprite *sprite)",
]) if (!effects1.includes(token)) throw new Error(`Belly Drum effect drifted: ${token}`);
for (const token of [
  "void AnimTask_ShakeMon(u8 taskId)",
  "static void AnimTask_ShakeMon_Step(u8 taskId)",
]) if (!monMovement.includes(token)) throw new Error(`ShakeMon effect drifted: ${token}`);
for (const token of [
  "{gBattleAnimSpriteGfx_MusicNotes, 0x0300, ANIM_TAG_MUSIC_NOTES}",
  "{gBattleAnimSpriteGfx_PurpleHandOutline, 0x0200, ANIM_TAG_PURPLE_HAND_OUTLINE}",
  "{gBattleAnimSpritePal_PurpleHandOutline, ANIM_TAG_PURPLE_HAND_OUTLINE}",
]) if (!animData.includes(token)) throw new Error(`Belly Drum asset table drifted: ${token}`);

const graphEntry = graph.moves.find((entry: any) => entry.move === "MOVE_BELLY_DRUM");
const components = [
  "asset:ANIM_TAG_MUSIC_NOTES",
  "asset:ANIM_TAG_PURPLE_HAND_OUTLINE",
  "sprite:gBellyDrumHandSpriteTemplate",
  "sprite:gSlowFlyingMusicNotesSpriteTemplate",
  "subroutine:BellyDrumLeft",
  "subroutine:BellyDrumRight",
  "task:AnimTask_MusicNotesClearRainbowBlend",
  "task:AnimTask_MusicNotesRainbowBlend",
  "task:AnimTask_ShakeMon",
];
if (!graphEntry || graphEntry.blocks.join(",") !== "Move_BELLY_DRUM,BellyDrumRight,BellyDrumLeft"
  || graphEntry.componentIds.join(",") !== components.join(",")) {
  throw new Error("Belly Drum component graph drifted");
}
const carrier = inventory.tiers.level50.moves.find((entry: any) => entry.move === "MOVE_BELLY_DRUM");
const poliwrath = frontier.entries.find((entry: any) => entry.index === 367);
if (!carrier || carrier.exampleMons[0] !== "FRONTIER_MON_POLIWRATH_2"
  || !poliwrath || poliwrath.species !== "SPECIES_POLIWRATH"
  || poliwrath.moves.join(",") !== "MOVE_BRICK_BREAK,MOVE_HYPNOSIS,MOVE_REST,MOVE_BELLY_DRUM") {
  throw new Error("lowest legal Belly Drum carrier drifted");
}

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const symbols = new Map(nm.split("\n").map((line) => line.trim().split(/\s+/u))
  .filter((parts) => parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!))
  .map((parts) => [parts[2]!, Number.parseInt(parts[0]!, 16)]));
const sourceStart = symbols.get("Move_BELLY_DRUM");
const sourceEnd = symbols.get("Move_SLUDGE_BOMB");
if (sourceStart !== 0x082cf4d9 || sourceEnd !== 0x082d15ac) throw new Error("Belly Drum ROM interval drifted");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"))
  .subarray(sourceStart - 0x08000000, sourceEnd - 0x08000000);
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== "545ca5297336a1028f77ac7b5fb2d160b0aaea84671c1585953b73389e33455e") {
  throw new Error("Belly Drum ROM bytes drifted");
}

export const bellyDrumSourceReceipt = {
  move: "MOVE_BELLY_DRUM",
  moveId: 187,
  sourceBounds: {
    start: "0x082cf4d9", endExclusive: "0x082d15ac", byteLength: bytes.length,
    sha256: digest, pointerContract: "half-open-byte-interval",
  },
  graph: { blocks: graphEntry.blocks, components },
  carrier: {
    frontierMon: "FRONTIER_MON_POLIWRATH_2", setId: 367, speciesId: 62,
    item: "BATTLE_FRONTIER_ITEM_CHESTO_BERRY", nature: "NATURE_ADAMANT",
    evs: ["ATTACK", "HP"],
  },
  callbacks: [
    "AnimBellyDrumHand", "AnimSlowFlyingMusicNotes", "AnimSlowFlyingMusicNotes_Step",
    "AnimTask_MusicNotesRainbowBlend", "AnimTask_MusicNotesClearRainbowBlend",
    "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
  ],
  templates: ["gBellyDrumHandSpriteTemplate", "gSlowFlyingMusicNotesSpriteTemplate"],
  loadedAssets: ["ANIM_TAG_MUSIC_NOTES", "ANIM_TAG_PURPLE_HAND_OUTLINE"],
  audio: { soundEffect: "SE_M_BELLY_DRUM", pan: "SOUND_PAN_ATTACKER", id: 185, sourceCues: 6 },
} as const;

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(bellyDrumSourceReceipt, null, 2));
}
