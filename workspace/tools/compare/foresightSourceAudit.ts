/** Authoritative source/component/carrier audit for MOVE_FORESIGHT. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const ref = resolve(root, "reference/pokeemerald");
const sha = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const scripts = readFileSync(resolve(ref, "data/battle_anim_scripts.s"), "utf8");
const effects = readFileSync(resolve(ref, "src/battle_anim_effects_3.c"), "utf8");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const startToken = "Move_FORESIGHT:\n", endToken = "Move_DESTINY_BOND:\n";
const sourceStart = scripts.indexOf(startToken), sourceEnd = scripts.indexOf(endToken, sourceStart);
if (sourceStart < 0 || sourceEnd < 0) throw new Error("Foresight script boundary drift");
const body = scripts.slice(sourceStart, sourceEnd);
for (const token of [
  "loadspritegfx ANIM_TAG_MAGNIFYING_GLASS", "monbg ANIM_DEF_PARTNER",
  "splitbgprio ANIM_TARGET", "setalpha 16, 0",
  "createsprite gForesightMagnifyingGlassSpriteTemplate, ANIM_TARGET, 2, ANIM_TARGET",
  "delay 17", "loopsewithpan SE_M_SKETCH, SOUND_PAN_TARGET, 16, 4",
  "delay 48", "delay 24", "playsewithpan SE_M_SKETCH, SOUND_PAN_TARGET",
  "delay 10", "createvisualtask AnimTask_BlendMonInAndOut, 5, ANIM_TARGET, RGB_WHITE, 12, 2, 1",
  "playsewithpan SE_M_DETECT, SOUND_PAN_TARGET", "waitforvisualfinish",
  "blendoff", "clearmonbg ANIM_DEF_PARTNER", "end",
]) if (!body.includes(token)) throw new Error(`Foresight command drift: ${token}`);
for (const token of [
  "gForesightMagnifyingGlassSpriteTemplate", ".tileTag = ANIM_TAG_MAGNIFYING_GLASS",
  ".oam = &gOamData_AffineOff_ObjBlend_32x32", ".callback = AnimForesightMagnifyingGlass",
  "static void AnimForesightMagnifyingGlass_Step", "InitAnimLinearTranslation(sprite)",
  "SetGpuReg(REG_OFFSET_BLDALPHA", "DestroyAnimSprite(sprite)",
]) if (!effects.includes(token)) throw new Error(`Foresight callback drift: ${token}`);

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(ref, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
});
const addresses = new Map<string, number>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) addresses.set(fields[2]!, Number.parseInt(fields[0]!, 16));
}
const start = addresses.get("Move_FORESIGHT")!, endExclusive = addresses.get("Move_DESTINY_BOND")!;
const rom = readFileSync(resolve(ref, "pokeemerald.gba"));
const bytes = rom.subarray(start - 0x08000000, endExclusive - 0x08000000);
const generated = graph.moves.find((move: Json) => move.move === "MOVE_FORESIGHT");
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_FORESIGHT"));
const output = {
  move: "MOVE_FORESIGHT", moveId: 193,
  source: { start: `0x${start.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${endExclusive.toString(16).padStart(8, "0")}`,
    byteLength: bytes.length, romSha256: sha(bytes), sourceSha256: sha(body) },
  graph: { root: generated.rootScript, blocks: generated.blocks, components: generated.componentIds },
  carriers: carriers.map((entry: Json) => ({ setId: entry.index, label: entry.label,
    species: entry.species, moves: entry.moves, ppUps: [0, 0, 0, 0] })),
  template: "gForesightMagnifyingGlassSpriteTemplate",
  callbacks: ["AnimForesightMagnifyingGlass", "AnimForesightMagnifyingGlass_Step"],
  task: "AnimTask_BlendMonInAndOut",
  audio: ["SE_M_SKETCH", "SE_M_DETECT"],
};
console.log(JSON.stringify(output, null, 2));
