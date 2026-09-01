import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const block = (source: string, start: string, end: string): string => {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
};

const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const body = block(scripts, "Move_HIDDEN_POWER", "Move_REVERSAL");
const commands = body.split("\n").map((line) => line.replace(/@.*$/u, "").trim()).filter(Boolean).slice(1);
const expectedCommands = [
  "loadspritegfx ANIM_TAG_RED_ORB",
  "playsewithpan SE_M_TAKE_DOWN, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_ScaleMonAndRestore, 5, -7, -7, 11, ANIM_ATTACKER, 0",
  "waitforvisualfinish",
  "delay 30",
  "createvisualtask AnimTask_BlendMonInAndOut, 5, ANIM_ATTACKER, RGB(31, 31, 19), 12, 5, 1",
  "delay 4",
  "createvisualtask AnimTask_ScaleMonAndRestore, 5, -7, -7, 11, ANIM_ATTACKER, 0",
  "playsewithpan SE_M_REVERSAL, SOUND_PAN_ATTACKER",
  ...[0, 42, 84, 126, 168, 210].map((phase) => `createsprite gHiddenPowerOrbSpriteTemplate, ANIM_ATTACKER, 2, 26, ${phase}`),
  "delay 52",
  "setarg 7, 0xFFFF",
  "playsewithpan SE_M_REFLECT, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_ScaleMonAndRestore, 5, -7, -7, 11, ANIM_ATTACKER, 0",
  ...[0, 32, 64, 96, 128, 160, 192, 224].map((phase) => `createsprite gHiddenPowerOrbScatterSpriteTemplate, ANIM_TARGET, 2, ${phase}`),
  "end",
];
if (commands.join("\n") !== expectedCommands.join("\n")) throw new Error("Move_HIDDEN_POWER script drifted");

const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const components = [
  "asset:ANIM_TAG_RED_ORB",
  "sprite:gHiddenPowerOrbScatterSpriteTemplate",
  "sprite:gHiddenPowerOrbSpriteTemplate",
  "task:AnimTask_BlendMonInAndOut",
  "task:AnimTask_ScaleMonAndRestore",
  "visualCommand:setarg",
];
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_HIDDEN_POWER");
if (!graphEntry || graphEntry.blocks.join(",") !== "Move_HIDDEN_POWER" || graphEntry.componentIds.join(",") !== components.join(",")) {
  throw new Error("Hidden Power component graph drifted");
}

const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_HIDDEN_POWER");
const carrier = frontier.entries[126];
if (!move || move.id !== 237 || move.exampleMons.join(",") !== "FRONTIER_MON_UNOWN"
  || carrier.label !== "FRONTIER_MON_UNOWN" || carrier.species !== "SPECIES_UNOWN"
  || carrier.moves.join(",") !== "MOVE_HIDDEN_POWER,MOVE_NONE,MOVE_NONE,MOVE_NONE"
  || carrier.itemName !== "BATTLE_FRONTIER_ITEM_LAX_INCENSE" || carrier.nature !== "NATURE_HARDY"
  || carrier.evSpreadStats.join(",") !== "F_EV_SPREAD_SP_ATTACK,F_EV_SPREAD_ATTACK,F_EV_SPREAD_HP") {
  throw new Error("Hidden Power inventory carrier drifted");
}
const factory = read("reference/pokeemerald/src/battle_factory.c");
if (!factory.includes("// Unown (FRONTIER_MON_UNOWN) is forbidden on opponent Factory teams.")
  || !factory.includes("gFacilityTrainerMons[monId].species == SPECIES_UNOWN")) {
  throw new Error("Hidden Power carrier exclusion drifted");
}

const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
for (const token of [
  "const union AffineAnimCmd gHiddenPowerOrbAffineAnimCmds[]",
  "AFFINEANIMCMD_FRAME(0x80, 0x80, 0, 0)",
  "AFFINEANIMCMD_FRAME(0x8, 0x8, 0, 1)",
  "const struct SpriteTemplate gHiddenPowerOrbSpriteTemplate",
  ".callback = AnimOrbitFast",
  "const struct SpriteTemplate gHiddenPowerOrbScatterSpriteTemplate",
  ".callback = AnimOrbitScatter",
  "static void AnimOrbitFast_Step(struct Sprite *sprite)",
  "if ((u16)gBattleAnimArgs[7] == 0xFFFF)",
  "static void AnimOrbitScatter_Step(struct Sprite *sprite)",
]) if (!effects.includes(token)) throw new Error(`Hidden Power orb source drifted: ${token}`);
for (const [path, tokens] of [
  ["reference/pokeemerald/src/battle_anim_mon_movement.c", ["void AnimTask_ScaleMonAndRestore(u8 taskId)", "static void AnimTask_ScaleMonAndRestore_Step(u8 taskId)", "ResetSpriteRotScale(spriteId)"]],
  ["reference/pokeemerald/src/battle_anim_mons.c", ["void AnimTask_BlendMonInAndOut(u8 task)", "static void AnimTask_BlendMonInAndOut_Step(u8 taskId)", "BlendPalette(task->data[0], 15"]],
] as const) for (const token of tokens) if (!read(path).includes(token)) throw new Error(`Hidden Power task source drifted: ${token}`);
for (const token of [
  "gBattleAnimSpriteGfx_RedOrb[] = INCGFX_U32(\"graphics/battle_anims/sprites/red_orb.png\"",
  "gBattleAnimSpritePal_RedOrb[] = INCGFX_U32(\"graphics/battle_anims/sprites/red_orb.png\"",
]) if (!read("reference/pokeemerald/src/graphics.c").includes(token)) throw new Error(`Hidden Power art source drifted: ${token}`);

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const symbols = new Map(nm.split("\n").map((line) => line.trim().split(/\s+/u))
  .filter((parts) => parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!))
  .map((parts) => [parts[2]!, Number.parseInt(parts[0]!, 16)]));
const start = symbols.get("Move_HIDDEN_POWER"); const end = symbols.get("Move_REVERSAL");
if (start !== 0x082ca7bc || end !== 0x082ca8a5) throw new Error("Hidden Power ROM interval drifted");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba")).subarray(start - 0x08000000, end - 0x08000000);
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== "68b6a189a36cacd319614b20e5b265c08b4308f4e1063b94aaf2a3812aa0b76d") throw new Error("Hidden Power ROM bytes drifted");

console.log(JSON.stringify({
  move: "MOVE_HIDDEN_POWER", moveId: 237,
  sourceBounds: { start: "0x082ca7bc", endExclusive: "0x082ca8a5", byteLength: bytes.length, sha256: digest, pointerContract: "half-open-byte-interval" },
  graph: { blocks: graphEntry.blocks, components },
  carrier: { frontierMon: "FRONTIER_MON_UNOWN", setId: 126, speciesId: 201, itemId: 221, nature: "NATURE_HARDY", factorySelectable: false },
  templates: ["gHiddenPowerOrbSpriteTemplate", "gHiddenPowerOrbScatterSpriteTemplate"],
  callbacks: ["AnimOrbitFast", "AnimOrbitFast_Step", "AnimOrbitScatter", "AnimOrbitScatter_Step"],
  tasks: ["AnimTask_ScaleMonAndRestore", "AnimTask_BlendMonInAndOut"],
  audio: ["SE_M_TAKE_DOWN", "SE_M_REVERSAL", "SE_M_REFLECT"],
  commands: expectedCommands,
}, null, 2));
