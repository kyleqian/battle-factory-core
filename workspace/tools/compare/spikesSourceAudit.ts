import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const animConstants = read("reference/pokeemerald/include/constants/battle_anim.h");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const moveConstants = read("reference/pokeemerald/include/constants/moves.h");
const monConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const speciesConstants = read("reference/pokeemerald/include/constants/species.h");
const itemConstants = read("reference/pokeemerald/include/constants/items.h");
const natureConstants = read("reference/pokeemerald/include/constants/pokemon.h");
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

const body = block(scripts, "Move_SPIKES", "Move_MEGAHORN");
const commands = body
  .split("\n")
  .map((line) => line.replace(/@.*$/u, "").trim())
  .filter(Boolean)
  .slice(1);
const expectedCommands = [
  "loadspritegfx ANIM_TAG_SPIKES",
  "monbg ANIM_DEF_PARTNER",
  "playsewithpan SE_M_JUMP_KICK, SOUND_PAN_ATTACKER",
  "waitplaysewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET, 28",
  "createsprite gSpikesSpriteTemplate, ANIM_TARGET, 2, 20, 0, 0, 24, 30",
  "delay 10",
  "playsewithpan SE_M_JUMP_KICK, SOUND_PAN_ATTACKER",
  "waitplaysewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET, 28",
  "createsprite gSpikesSpriteTemplate, ANIM_TARGET, 2, 20, 0, -24, 24, 30",
  "delay 10",
  "waitplaysewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET, 28",
  "createsprite gSpikesSpriteTemplate, ANIM_TARGET, 2, 20, 0, 24, 24, 30",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "end",
];
if (commands.join("\n") !== expectedCommands.join("\n")) throw new Error("Move_SPIKES script drifted");

const components = [
  "asset:ANIM_TAG_SPIKES",
  "sprite:gSpikesSpriteTemplate",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
];
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_SPIKES");
if (!graphEntry || graphEntry.blocks.join(",") !== "Move_SPIKES" || graphEntry.componentIds.join(",") !== components.join(",")) {
  throw new Error("Spikes component graph drifted");
}

const carrier = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_SPIKES");
const qwilfish = frontier.entries.find((entry: { index: number }) => entry.index === 211);
const carrierStart = mons.indexOf("[FRONTIER_MON_QWILFISH_1]");
const carrierEnd = mons.indexOf("[FRONTIER_MON_SNEASEL_1]", carrierStart + 1);
if (carrierStart < 0 || carrierEnd < 0) throw new Error("missing Qwilfish source carrier");
const carrierSource = mons.slice(carrierStart, carrierEnd);
if (!carrier || carrier.id !== 191 || carrier.frontierMonCount !== 3
  || carrier.exampleMons[0] !== "FRONTIER_MON_QWILFISH_1"
  || !qwilfish || qwilfish.species !== "SPECIES_QWILFISH"
  || qwilfish.itemName !== "BATTLE_FRONTIER_ITEM_CHERI_BERRY"
  || qwilfish.nature !== "NATURE_IMPISH"
  || qwilfish.evSpreadStats.join("|") !== "F_EV_SPREAD_SP_DEFENSE|F_EV_SPREAD_SP_ATTACK") {
  throw new Error("lowest Spikes carrier drifted");
}
for (const token of [
  "#define MOVE_SPIKES 191", "#define SPECIES_QWILFISH 211", "#define FRONTIER_MON_QWILFISH_1     211",
  "#define ITEM_CHERI_BERRY 133", "#define NATURE_IMPISH   8",
  ".species = SPECIES_QWILFISH", ".moves = {MOVE_BUBBLE_BEAM, MOVE_PIN_MISSILE, MOVE_SPIKES, MOVE_MINIMIZE}",
  "BATTLE_FRONTIER_ITEM_CHERI_BERRY", "F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_SP_ATTACK", "NATURE_IMPISH",
]) if (![moveConstants, speciesConstants, monConstants, itemConstants, natureConstants, carrierSource].some((source) => source.includes(token))) {
  throw new Error(`Spikes carrier token drifted: ${token}`);
}

for (const token of [
  "const struct SpriteTemplate gSpikesSpriteTemplate", ".tileTag = ANIM_TAG_SPIKES", ".paletteTag = ANIM_TAG_SPIKES",
  ".oam = &gOamData_AffineOff_ObjNormal_16x16", ".affineAnims = gDummySpriteAffineAnimTable", ".callback = AnimSpikes",
  "static void AnimSpikes(struct Sprite *sprite)", "InitSpritePosToAnimAttacker(sprite, TRUE)",
  "SetAverageBattlerPositions(gBattleAnimTarget, FALSE, &x, &y)", "gBattleAnimArgs[2] = -gBattleAnimArgs[2]",
  "InitAnimArcTranslation(sprite)", "sprite->callback = AnimSpikes_Step1", "static void AnimSpikes_Step1(struct Sprite *sprite)",
  "TranslateAnimHorizontalArc(sprite)", "sprite->data[0] = 30", "StoreSpriteCallbackInData6(sprite, AnimSpikes_Step2)",
  "static void AnimSpikes_Step2(struct Sprite *sprite)", "sprite->invisible ^= 1", "++sprite->data[1] == 16", "DestroyAnimSprite(sprite)",
]) if (!effects.includes(token)) throw new Error(`Spikes template/callback drifted: ${token}`);
for (const token of [
  "#define ANIM_TAG_SPIKES                     (ANIM_SPRITES_START + 152)",
  "{gBattleAnimSpriteGfx_Spikes, 0x0080, ANIM_TAG_SPIKES}",
  "{gBattleAnimSpritePal_Spikes, ANIM_TAG_SPIKES}",
]) if (![animConstants, animData].some((source) => source.includes(token))) throw new Error(`Spikes asset drifted: ${token}`);
for (const token of ["#define SE_M_JUMP_KICK              143", "#define SE_M_HORN_ATTACK            166"]) {
  if (!songs.includes(token)) throw new Error(`Spikes audio drifted: ${token}`);
}

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map(nm.split("\n").map((line) => line.trim().split(/\s+/u)).filter((parts) => parts.length >= 3 && /^[0-9a-f]+$/iu.test(parts[0]!)).map((parts) => [parts.at(-1)!, Number.parseInt(parts[0]!, 16)]));
const start = symbols.get("Move_SPIKES");
const end = symbols.get("Move_MEGAHORN");
if (start !== 0x082d18cd || end !== 0x082d1924) throw new Error("Spikes ROM interval drifted");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba")).subarray(start - 0x08000000, end - 0x08000000);
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== "298cbadac0aef90b702035bcce3ab005bc05be84b312d4b9d77fd313e960929f") throw new Error("Spikes ROM bytes drifted");

console.log(JSON.stringify({
  move: "MOVE_SPIKES", moveId: 191,
  sourceBounds: { start: "0x082d18cd", endExclusive: "0x082d1924", byteLength: bytes.length, sha256: digest, pointerContract: "half-open-byte-interval" },
  graph: { blocks: graphEntry.blocks, components },
  carrier: { frontierMon: "FRONTIER_MON_QWILFISH_1", setId: 211, speciesId: 211, item: "BATTLE_FRONTIER_ITEM_CHERI_BERRY", itemId: 133, nature: "NATURE_IMPISH", evs: ["SP_DEFENSE", "SP_ATTACK"] },
  templates: ["gSpikesSpriteTemplate"],
  callbacks: ["AnimSpikes", "AnimSpikes_Step1", "WaitAnimForDuration", "AnimSpikes_Step2", "DestroyAnimSprite"],
  affine: "off-only; gOamData_AffineOff_ObjNormal_16x16; no fresh-affine credit",
  audio: {
    launch: { soundEffect: "SE_M_JUMP_KICK", id: 143, pan: "SOUND_PAN_ATTACKER", calls: 2 },
    landing: { soundEffect: "SE_M_HORN_ATTACK", id: 166, pan: "SOUND_PAN_TARGET", delayedCalls: 3, delay: 28 },
  },
  commands: expectedCommands,
}, null, 2));
