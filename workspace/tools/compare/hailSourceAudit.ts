import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const ice = read("reference/pokeemerald/src/battle_anim_ice.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));

const block = (source: string, from: string, to: string): string => {
  const start = source.indexOf(`${from}:`); const end = source.indexOf(`${to}:`, start + from.length);
  if (start < 0 || end < 0) throw new Error(`missing ${from}/${to}`); return source.slice(start, end);
};
const body = block(scripts, "Move_HAIL", "Move_TORMENT");
for (const token of [
  "loadspritegfx ANIM_TAG_HAIL", "loadspritegfx ANIM_TAG_ICE_CRYSTALS",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG, 3, 0, 6, RGB_BLACK",
  "createvisualtask AnimTask_Hail, 5", "loopsewithpan SE_M_HAIL, 0, 8, 10",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG, 3, 6, 0, RGB_BLACK",
]) if (!body.includes(token)) throw new Error(`Hail script drifted: ${token}`);
for (const token of [
  "static const struct HailStruct sHailCoordData[]", "void AnimTask_Hail(u8 taskId)", "static void AnimTask_Hail2(u8 taskId)",
  "GenerateHailParticle(task->tHailStructId, task->tHailAffineAnimNum, taskId, 1)",
  "CreateSprite(&gHailParticleSpriteTemplate, spriteX, -8, 18)",
  "CreateSprite(&gIceCrystalHitLargeSpriteTemplate", "gSprites[sprite->data[0]].callback = AnimHailContinue",
  "if (++sprite->sTimer == 20)", "FreeOamMatrix(sprite->oam.matrixNum)",
]) if (!ice.includes(token)) throw new Error(`Hail task/sprite drifted: ${token}`);
for (const token of [
  "{gBattleAnimSpriteGfx_Hail, 0x0080, ANIM_TAG_HAIL}", "{gBattleAnimSpritePal_Hail, ANIM_TAG_HAIL}",
  "{gBattleAnimSpriteGfx_IceCrystals, 0x01c0, ANIM_TAG_ICE_CRYSTALS}", "{gBattleAnimSpritePal_IceCrystals, ANIM_TAG_ICE_CRYSTALS}",
]) if (!animData.includes(token)) throw new Error(`Hail resource drifted: ${token}`);
for (const token of [
  "gBattleAnimSpriteGfx_Hail", "gBattleAnimSpritePal_Hail", "gBattleAnimSpriteGfx_IceCrystals", "gBattleAnimSpritePal_IceCrystals",
]) if (!graphics.includes(token)) throw new Error(`Hail graphics drifted: ${token}`);

const components = ["asset:ANIM_TAG_HAIL", "asset:ANIM_TAG_ICE_CRYSTALS", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_Hail"];
const graphEntry = graph.moves.find((entry: any) => entry.move === "MOVE_HAIL");
if (!graphEntry || graphEntry.blocks.join(",") !== "Move_HAIL" || graphEntry.componentIds.join(",") !== components.join(",")) throw new Error("Hail graph drifted");
const carrier = inventory.tiers.level50.moves.find((entry: any) => entry.move === "MOVE_HAIL");
const delibird = frontier.entries.find((entry: any) => entry.index === 118);
const carrierSource = mons.slice(mons.indexOf("[FRONTIER_MON_DELIBIRD]"), mons.indexOf("[FRONTIER_MON_HOUNDOUR]"));
if (!carrier || carrier.exampleMons[0] !== "FRONTIER_MON_DELIBIRD" || !delibird || delibird.species !== "SPECIES_DELIBIRD"
  || !carrierSource.includes(".moves = {MOVE_PRESENT, MOVE_ICE_BALL, MOVE_AERIAL_ACE, MOVE_HAIL}")) throw new Error("lowest legal Hail carrier drifted");

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map(nm.split("\n").map((line) => line.trim().split(/\s+/u)).filter((parts) => parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!)).map((parts) => [parts[2]!, Number.parseInt(parts[0]!, 16)]));
const start = symbols.get("Move_HAIL"); const end = symbols.get("Move_TORMENT");
if (start !== 0x082cdc76 || end !== 0x082cdcae) throw new Error("Hail ROM interval drifted");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba")).subarray(start - 0x08000000, end - 0x08000000);
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== "8a1e8e1583779dc1bd0dcacb4fbf64a923817a6a542beb2887ae9082481fd1bb") throw new Error("Hail ROM bytes drifted");

console.log(JSON.stringify({
  move: "MOVE_HAIL", moveId: 258,
  sourceBounds: { start: "0x082cdc76", endExclusive: "0x082cdcae", byteLength: bytes.length, sha256: digest, pointerContract: "half-open-byte-interval" },
  graph: { blocks: graphEntry.blocks, components },
  carrier: { frontierMon: "FRONTIER_MON_DELIBIRD", setId: 118, speciesId: 225, item: "BATTLE_FRONTIER_ITEM_NEVER_MELT_ICE", nature: "NATURE_DOCILE", evs: ["SP_ATTACK", "HP"] },
  tasks: ["AnimTask_BlendBattleAnimPal", "AnimTask_Hail"], templates: ["gHailParticleSpriteTemplate", "gIceCrystalHitLargeSpriteTemplate"],
  callbacks: ["AnimHailBegin", "AnimHailContinue"], audio: { soundEffect: "SE_M_HAIL", id: 242, pan: 0, interval: 8, count: 10 },
}, null, 2));
