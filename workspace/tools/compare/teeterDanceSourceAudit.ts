import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));

const start = scripts.indexOf("Move_TEETER_DANCE:");
const end = scripts.indexOf("Move_MUD_SPORT:", start);
if (start < 0 || end < 0) throw new Error("Teeter Dance source block drifted");
const body = scripts.slice(start, end);
for (const token of [
  "loadspritegfx ANIM_TAG_MUSIC_NOTES",
  "loadspritegfx ANIM_TAG_DUCK",
  "createvisualtask AnimTask_TeeterDanceMovement, 5",
  "createsprite gFastFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 0, 16, -2",
  "createsprite gFastFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, -2",
  "createsprite gFastFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 0, -16, -2",
  "createsprite gFastFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 1, -8, -2",
  "createsprite gFastFlyingMusicNotesSpriteTemplate, ANIM_ATTACKER, 2, 2, 8, -2",
  "playsewithpan SE_M_TEETER_DANCE, SOUND_PAN_ATTACKER",
  "delay 24",
]) if (!body.includes(token)) throw new Error(`Teeter Dance script drifted: ${token}`);
for (const token of [
  "void AnimTask_TeeterDanceMovement(u8 taskId)",
  "static void AnimTask_TeeterDanceMovement_Step(u8 taskId)",
  "task->data[4] = GetBattlerSide(gBattleAnimAttacker) == B_SIDE_PLAYER ? 1 : -1",
  "gSprites[task->data[3]].x2 = gSineTable[task->data[11]] >> 5",
  "gSprites[task->data[3]].x = (gSineTable[task->data[9]] >> 3) * task->data[4] + task->data[5]",
]) if (!effects3.includes(token)) throw new Error(`Teeter task drifted: ${token}`);
for (const token of [
  "static void AnimFlyingMusicNotes(struct Sprite *sprite)",
  "static void AnimFlyingMusicNotes_Step(struct Sprite *sprite)",
  "sprite->data[6] = (cmd->unk1 << 4) / 5",
  "sprite->data[7] = (cmd->unk2 << 7) / 5",
  "if (++sprite->data[0] == 48)",
  ".callback = AnimFlyingMusicNotes",
]) if (!effects1.includes(token)) throw new Error(`Teeter note callback drifted: ${token}`);
for (const token of [
  "{gBattleAnimSpriteGfx_Duck, 0x0180, ANIM_TAG_DUCK}",
  "{gBattleAnimSpritePal_Duck, ANIM_TAG_DUCK}",
]) if (!animData.includes(token)) throw new Error(`Teeter asset table drifted: ${token}`);

const graphEntry = graph.moves.find((entry: any) => entry.move === "MOVE_TEETER_DANCE");
const components = [
  "asset:ANIM_TAG_DUCK",
  "asset:ANIM_TAG_MUSIC_NOTES",
  "sprite:gFastFlyingMusicNotesSpriteTemplate",
  "task:AnimTask_TeeterDanceMovement",
];
if (!graphEntry || graphEntry.blocks.join(",") !== "Move_TEETER_DANCE"
  || graphEntry.componentIds.join(",") !== components.join(",")) {
  throw new Error("Teeter Dance component graph drifted");
}
const carrier = inventory.tiers.level50.moves.find((entry: any) => entry.move === "MOVE_TEETER_DANCE");
const spinda = frontier.entries.find((entry: any) => entry.index === 145);
if (!carrier || carrier.exampleMons[0] !== "FRONTIER_MON_SPINDA"
  || !spinda || spinda.species !== "SPECIES_SPINDA"
  || spinda.moves.join(",") !== "MOVE_DIZZY_PUNCH,MOVE_TEETER_DANCE,MOVE_PSYBEAM,MOVE_FAINT_ATTACK") {
  throw new Error("lowest legal Teeter Dance carrier drifted");
}

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map(nm.split("\n").map((line) => line.trim().split(/\s+/u))
  .filter((parts) => parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!))
  .map((parts) => [parts[2]!, Number.parseInt(parts[0]!, 16)]));
const sourceStart = symbols.get("Move_TEETER_DANCE");
const sourceEnd = symbols.get("Move_MUD_SPORT");
if (sourceStart !== 0x082ce78d || sourceEnd !== 0x082ce7f8) throw new Error("Teeter Dance ROM interval drifted");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"))
  .subarray(sourceStart - 0x08000000, sourceEnd - 0x08000000);
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== "5dd532744b7f9bff1f8a88567122573d7da66e956961db734f56119247b21572") {
  throw new Error("Teeter Dance ROM bytes drifted");
}

console.log(JSON.stringify({
  move: "MOVE_TEETER_DANCE", moveId: 298,
  sourceBounds: { start: "0x082ce78d", endExclusive: "0x082ce7f8", byteLength: bytes.length, sha256: digest, pointerContract: "half-open-byte-interval" },
  graph: { blocks: graphEntry.blocks, components },
  carrier: { frontierMon: "FRONTIER_MON_SPINDA", setId: 145, speciesId: 308, item: "BATTLE_FRONTIER_ITEM_SITRUS_BERRY", nature: "NATURE_RELAXED", evs: ["ATTACK", "HP"] },
  callbacks: ["AnimFlyingMusicNotes", "AnimFlyingMusicNotes_Step", "AnimTask_TeeterDanceMovement", "AnimTask_TeeterDanceMovement_Step"],
  template: "gFastFlyingMusicNotesSpriteTemplate", loadedAssets: ["ANIM_TAG_DUCK", "ANIM_TAG_MUSIC_NOTES"],
  audio: { soundEffect: "SE_M_TEETER_DANCE", pan: "SOUND_PAN_ATTACKER", id: 244, sourceCues: 5 },
}, null, 2));
