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
  const f = line.trim().split(/\s+/u);
  if (f.length === 4 && /^[0-9a-f]+$/iu.test(f[0]!) && /^[0-9a-f]+$/iu.test(f[1]!)) symbols.set(f[3]!, { address: Number.parseInt(f[0]!, 16), size: Number.parseInt(f[1]!, 16) });
  else if (f.length === 3 && /^[0-9a-f]+$/iu.test(f[0]!)) symbols.set(f[2]!, { address: Number.parseInt(f[0]!, 16), size: 0 });
}
const slice = (name: string, endName?: string) => {
  const s = symbols.get(name); if (!s) throw new Error(`missing ${name}`);
  const next = Math.min(...[...symbols.values()].map((v) => v.address).filter((v) => v > s.address));
  const end = endName ? symbols.get(endName)?.address : (s.size ? s.address + s.size : next);
  if (!end) throw new Error(`missing end ${endName}`);
  const bytes = rom.subarray(s.address - 0x08000000, end - 0x08000000);
  return { start: `0x${s.address.toString(16).padStart(8, "0")}`, endExclusive: `0x${end.toString(16).padStart(8, "0")}`, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
};
const block = scripts.slice(scripts.indexOf("Move_YAWN:"), scripts.indexOf("Move_ENDEAVOR:"));
const lines = block.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter(Boolean);
const expected = ["loadspritegfx ANIM_TAG_PINK_CLOUD", "createvisualtask AnimTask_DeepInhale, 2, ANIM_ATTACKER", "playsewithpan SE_M_YAWN, SOUND_PAN_ATTACKER", "waitforvisualfinish", "createsprite gYawnCloudSpriteTemplate, ANIM_TARGET, 5, 2", "playsewithpan SE_M_SPIT_UP, SOUND_PAN_ATTACKER", "delay 4", "createsprite gYawnCloudSpriteTemplate, ANIM_TARGET, 5, 1", "delay 4", "createsprite gYawnCloudSpriteTemplate, ANIM_TARGET, 5, 0", "waitforvisualfinish", "createvisualtask AnimTask_DeepInhale, 2, ANIM_TARGET", "playsewithpan SE_M_YAWN, SOUND_PAN_TARGET", "end"];
if (lines.join("\n") !== expected.join("\n")) throw new Error("Yawn script drifted");
for (const token of ["AFFINEANIMCMD_FRAME(16, 0, 0, 4)", "AFFINEANIMCMD_FRAME(0, -3, 0, 16)", "AFFINEANIMCMD_FRAME(-5, 3, 0, 16)", ".oam = &gOamData_AffineNormal_ObjNormal_32x32", ".affineAnims = gYawnCloudAffineAnimTable", ".callback = AnimYawnCloud", "StartSpriteAffineAnim(sprite, gBattleAnimArgs[0])", "InitYawnCloudPosition(sprite, sprite->x, sprite->y, destX, destY, 64)", "sprite->y2 = Sin(index, 8)", "if (sprite->data[0] > 58)", "DestroySpriteAndMatrix(sprite)", "PrepareAffineAnimInTaskData(&gTasks[taskId], task->data[15], gDeepInhaleAffineAnimCmds)", "gSprites[task->data[15]].x2 = 1", "gSprites[task->data[15]].x2 = -1", "RunAffineAnimFromTaskData", "DestroyAnimVisualTask(taskId)"]) if (!effects.includes(token)) throw new Error(`Yawn callback/task drifted: ${token}`);
if (!animData.includes("{gBattleAnimSpriteGfx_PinkCloud, 0x0200, ANIM_TAG_PINK_CLOUD}") || !animData.includes("{gBattleAnimSpritePal_PinkCloud, ANIM_TAG_PINK_CLOUD}") || !graphics.includes('sprites/pink_cloud.png')) throw new Error("Yawn assets drifted");
const move = inventory.tiers.level50.moves.find((e: any) => e.move === "MOVE_YAWN");
const components = graph.moves.find((e: any) => e.move === "MOVE_YAWN")?.componentIds;
if (move.id !== 281 || move.frontierMonCount !== 10 || components.join(",") !== "asset:ANIM_TAG_PINK_CLOUD,sprite:gYawnCloudSpriteTemplate,task:AnimTask_DeepInhale") throw new Error("Yawn inventory drifted");
const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_TOGETIC_2]"), mons.indexOf("[FRONTIER_MON_MURKROW_2]"));
for (const token of [".species = SPECIES_TOGETIC", "MOVE_YAWN", "BATTLE_FRONTIER_ITEM_SCOPE_LENS", "F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP", "NATURE_RELAXED"]) if (!carrier.includes(token)) throw new Error(`Yawn carrier drifted: ${token}`);
if (/\b(?:monbg|setalpha|blendoff|setbldcnt|fadetobg|changebg)\b/.test(block)) throw new Error("Yawn unexpectedly owns GPU state");
console.log(JSON.stringify({ move: "MOVE_YAWN", moveId: 281, status: "unsupported-source-evidence-checkpoint", source: { moveScript: slice("Move_YAWN", "Move_ENDEAVOR"), deepInhaleAffine: slice("gDeepInhaleAffineAnimCmds"), cloudAffine1: slice("gYawnCloudAffineAnimCmds1"), cloudAffine2: slice("gYawnCloudAffineAnimCmds2"), cloudAffine3: slice("gYawnCloudAffineAnimCmds3"), cloudAffineTable: slice("gYawnCloudAffineAnimTable"), template: slice("gYawnCloudSpriteTemplate"), deepInhaleInit: slice("AnimTask_DeepInhale"), deepInhaleStep: slice("AnimTask_DeepInhale_Step"), cloudInit: slice("AnimYawnCloud"), cloudStep: slice("AnimYawnCloud_Step"), gfx: slice("gBattleAnimSpriteGfx_PinkCloud"), palette: slice("gBattleAnimSpritePal_PinkCloud"), oam: slice("gOamData_AffineNormal_ObjNormal_32x32"), yawnAudio: slice("se_m_yawn"), spitUpAudio: slice("se_m_spit_up") }, scriptCommands: lines, components, cloudCreates: 3, deepInhaleTasks: 2, audioCues: 3, carrier: { setId: 288, label: "FRONTIER_MON_TOGETIC_2", species: 176 }, ownership: { gpuRegisters: false, gameplayState: false } }, null, 2));
