import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length === 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields[3]!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}
const slice = (name: string, endName?: string) => {
  const symbol = symbols.get(name);
  if (!symbol) throw new Error(`missing ELF symbol ${name}`);
  const nextAddress = Math.min(...[...symbols.values()].map((entry) => entry.address).filter((address) => address > symbol.address));
  const end = endName ? symbols.get(endName)?.address : (symbol.size ? symbol.address + symbol.size : nextAddress);
  if (!end) throw new Error(`missing end symbol ${endName}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, end - 0x08000000);
  return { start: `0x${symbol.address.toString(16).padStart(8, "0")}`, endExclusive: `0x${end.toString(16).padStart(8, "0")}`, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
};
const block = scripts.slice(scripts.indexOf("Move_PAIN_SPLIT:"), scripts.indexOf("Move_VICE_GRIP:"));
const lines = block.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter(Boolean);
const expected = [
  "loadspritegfx ANIM_TAG_PAIN_SPLIT",
  "createsprite gPainSplitProjectileSpriteTemplate, ANIM_ATTACKER, 2, -8, -42, ANIM_ATTACKER",
  "createsprite gPainSplitProjectileSpriteTemplate, ANIM_TARGET, 2, -8, -42, ANIM_TARGET",
  "delay 10", "playsewithpan SE_M_SWAGGER2, 0",
  "createvisualtask AnimTask_PainSplitMovement, 2, ANIM_ATTACKER, 0",
  "createvisualtask AnimTask_PainSplitMovement, 2, ANIM_TARGET, 0", "waitforvisualfinish",
  "createsprite gPainSplitProjectileSpriteTemplate, ANIM_ATTACKER, 2, -24, -42, ANIM_ATTACKER",
  "createsprite gPainSplitProjectileSpriteTemplate, ANIM_TARGET, 2, -24, -42, ANIM_TARGET",
  "delay 10", "playsewithpan SE_M_SWAGGER2, 0",
  "createvisualtask AnimTask_PainSplitMovement, 2, ANIM_ATTACKER, 1",
  "createvisualtask AnimTask_PainSplitMovement, 2, ANIM_TARGET, 1", "waitforvisualfinish",
  "createsprite gPainSplitProjectileSpriteTemplate, ANIM_ATTACKER, 2, 8, -42, ANIM_ATTACKER",
  "createsprite gPainSplitProjectileSpriteTemplate, ANIM_TARGET, 2, 8, -42, ANIM_TARGET",
  "delay 10", "playsewithpan SE_M_SWAGGER2, 0",
  "createvisualtask AnimTask_PainSplitMovement, 2, ANIM_ATTACKER, 2",
  "createvisualtask AnimTask_PainSplitMovement, 2, ANIM_TARGET, 2", "end",
];
if (lines.join("\n") !== expected.join("\n")) throw new Error("Pain Split script body drifted");
for (const token of [
  "ANIMCMD_FRAME(0, 5)", "ANIMCMD_FRAME(4, 9)", "ANIMCMD_FRAME(8, 5)",
  ".oam = &gOamData_AffineOff_ObjNormal_16x16", ".callback = AnimPainSplitProjectile",
  "sprite->data[1] = 0x80", "sprite->data[2] = 0x300", "sprite->data[1] += 192",
  "sprite->data[2] += 128", "if (sprite->animEnded)", "DestroyAnimSprite(sprite)",
  "PrepareBattlerSpriteForRotScale(spriteId, ST_OAM_OBJ_NORMAL)",
  "SetSpriteRotScale(spriteId, 0xE0, 0x140, 0)",
  "SetSpriteRotScale(spriteId, 0xD0, 0x130, 0xF00)",
  "SetSpriteRotScale(spriteId, 0xD0, 0x130, 0xF100)",
  "if (++gTasks[taskId].data[2] == 3)", "if (++gTasks[taskId].data[1] == 13)",
  "ResetSpriteRotScale(spriteId)", "DestroyAnimVisualTask(taskId)",
]) if (!effects.includes(token)) throw new Error(`Pain Split callback/task drifted: ${token}`);
if (!animData.includes("{gBattleAnimSpriteGfx_PainSplit, 0x0180, ANIM_TAG_PAIN_SPLIT}")
  || !animData.includes("{gBattleAnimSpritePal_PainSplit, ANIM_TAG_PAIN_SPLIT}")
  || !graphics.includes('graphics/battle_anims/sprites/pain_split.png')) throw new Error("Pain Split asset inventory drifted");
const move = inventory.tiers.level50.moves.find((entry: any) => entry.move === "MOVE_PAIN_SPLIT");
const components = graph.moves.find((entry: any) => entry.move === "MOVE_PAIN_SPLIT")?.componentIds;
if (move.id !== 220 || move.exampleMons.join(",") !== "FRONTIER_MON_MISDREAVUS_1,FRONTIER_MON_DUSCLOPS_1"
  || components.join(",") !== "asset:ANIM_TAG_PAIN_SPLIT,sprite:gPainSplitProjectileSpriteTemplate,task:AnimTask_PainSplitMovement") throw new Error("Pain Split generated inventory drifted");
const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_MISDREAVUS_1]"), mons.indexOf("[FRONTIER_MON_FEAROW_1]"));
for (const token of [".species = SPECIES_MISDREAVUS", "MOVE_PAIN_SPLIT", "BATTLE_FRONTIER_ITEM_FOCUS_BAND", "F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP", "NATURE_IMPISH"])
  if (!carrier.includes(token)) throw new Error(`Pain Split carrier drifted: ${token}`);
const callbackBody = effects.slice(effects.lastIndexOf("static void AnimPainSplitProjectile"), effects.indexOf("// Move a piece of confetti", effects.lastIndexOf("static void AnimPainSplitProjectile")));
if (/\b(?:monbg|setalpha|blendoff|setbldcnt|fadetobg|changebg)\b/.test(block) || callbackBody.includes("SetGpuReg"))
  throw new Error("Pain Split unexpectedly acquired GPU ownership");

console.log(JSON.stringify({
  move: "MOVE_PAIN_SPLIT", moveId: 220, status: "unsupported-source-checkpoint",
  source: {
    moveScript: slice("Move_PAIN_SPLIT", "Move_VICE_GRIP"),
    projectileCallback: slice("AnimPainSplitProjectile", "AnimTask_PainSplitMovement"),
    movementTask: slice("AnimTask_PainSplitMovement"),
    gfx: slice("gBattleAnimSpriteGfx_PainSplit"), palette: slice("gBattleAnimSpritePal_PainSplit"),
    animCmds: slice("gPainSplitAnimCmds"), template: slice("gPainSplitProjectileSpriteTemplate"),
    oam: slice("gOamData_AffineOff_ObjNormal_16x16"), audio: slice("se_m_swagger2"),
  },
  scriptCommands: lines, components, projectileCreates: 6, movementTasks: 6, audioCues: 3,
  carrier: { setId: 374, label: "FRONTIER_MON_MISDREAVUS_1", species: 200 },
  ownership: { gpuRegisters: false, gameplayState: false },
}, null, 2));
