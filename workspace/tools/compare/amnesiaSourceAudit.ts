import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const sourceBlock = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`missing source boundary ${start}/${end}`);
  return source.slice(from, to);
};

const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const psychic = read("reference/pokeemerald/src/battle_anim_psychic.c");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as Json;
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as Json;
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json")) as Json;

const rootBody = sourceBlock(scripts, "Move_AMNESIA:\n", "Move_KINESIS:\n");
const backgroundBody = sourceBlock(scripts, "SetPsychicBackground:\n", "SetSkyBg:\n");
const expectedCommands = [
  "loadspritegfx ANIM_TAG_AMNESIA", "call SetPsychicBackground", "delay 8",
  "createsprite gQuestionMarkSpriteTemplate, ANIM_ATTACKER, 20",
  "playsewithpan SE_M_METRONOME, SOUND_PAN_ATTACKER", "delay 54",
  "loopsewithpan SE_M_METRONOME, SOUND_PAN_ATTACKER, 16, 3",
  "waitforvisualfinish", "call UnsetPsychicBackground", "end",
];
const commands = rootBody.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter(Boolean);
if (commands.join("\n") !== expectedCommands.join("\n")) throw new Error("Move_AMNESIA command body drifted");
for (const token of [
  "SetPsychicBackground:\n\tfadetobg BG_PSYCHIC\n\twaitbgfadeout\n\tcreatevisualtask AnimTask_SetPsychicBackground, 5\n\twaitbgfadein\n\treturn",
  "UnsetPsychicBackground:\n\trestorebg\n\twaitbgfadeout\n\tsetarg 7, 0xFFFF\n\twaitbgfadein\n\treturn",
]) if (!backgroundBody.includes(token)) throw new Error(`psychic background body drifted: ${token.split(":")[0]}`);

const components = [
  "asset:ANIM_TAG_AMNESIA", "sprite:gQuestionMarkSpriteTemplate",
  "subroutine:SetPsychicBackground", "subroutine:UnsetPsychicBackground",
  "task:AnimTask_SetPsychicBackground", "visualCommand:fadetobg",
  "visualCommand:restorebg", "visualCommand:setarg",
  "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
];
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_AMNESIA");
if (!graphEntry || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_AMNESIA", "SetPsychicBackground", "UnsetPsychicBackground"])
  || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(components)) throw new Error("Amnesia ten-component graph drifted");

for (const token of [
  "const struct SpriteTemplate gQuestionMarkSpriteTemplate", ".tileTag = ANIM_TAG_AMNESIA",
  ".paletteTag = ANIM_TAG_AMNESIA", ".oam = &gOamData_AffineOff_ObjNormal_32x32",
  ".affineAnims = gDummySpriteAffineAnimTable", ".callback = AnimQuestionMark",
  "static void AnimQuestionMark(struct Sprite *sprite)", "BATTLER_COORD_ATTR_WIDTH",
  "BATTLER_COORD_ATTR_HEIGHT", "BATTLER_COORD_Y_PIC_OFFSET", "sprite->y < 16",
  "static void AnimQuestionMark_Step1(struct Sprite *sprite)", "InitSpriteAffineAnim(sprite)",
  "static void AnimQuestionMark_Step2(struct Sprite *sprite)", "FreeOamMatrix(sprite->oam.matrixNum)",
  "DestroyAnimSprite(sprite)",
]) if (!psychic.includes(token)) throw new Error(`question-mark dependency drifted: ${token}`);
for (const token of [
  "void AnimTask_SetPsychicBackground(u8 taskId)", "gAnimVisualTaskCount--",
  "static void SetPsychicBackground_Step(u8 taskId)", "GetBattleBgPaletteNum()",
  "if (++gTasks[taskId].data[5] == 4)", "gPlttBufferFaded[BG_PLTT_ID(paletteIndex) + 1] = lastColor",
  "if ((u16)gBattleAnimArgs[7] == 0xFFFF)", "DestroyTask(taskId)",
]) if (!effects.includes(token)) throw new Error(`psychic-background task drifted: ${token}`);
for (const token of [
  "#define ANIM_TAG_AMNESIA                    (ANIM_SPRITES_START + 93)",
  "{gBattleAnimSpriteGfx_Amnesia, 0x1000, ANIM_TAG_AMNESIA}",
  "{gBattleAnimSpritePal_Amnesia, ANIM_TAG_AMNESIA}",
]) if (![constants, animData].some((source) => source.includes(token))) throw new Error(`Amnesia resource drifted: ${token}`);
if (!songs.includes("#define SE_M_METRONOME              186")) throw new Error("Amnesia audio drifted");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const parts = line.trim().split(/\s+/u);
  if (parts.length >= 3 && /^[0-9a-f]+$/iu.test(parts[0]!) && /^[0-9a-f]+$/iu.test(parts[1]!)) symbols.set(parts.at(-1)!, { address: Number.parseInt(parts[0]!, 16), size: Number.parseInt(parts[1]!, 16) });
  else if (parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!)) symbols.set(parts[2]!, { address: Number.parseInt(parts[0]!, 16), size: 0 });
}
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const interval = (startName: string, endName: string) => {
  const start = symbols.get(startName)?.address, end = symbols.get(endName)?.address;
  if (start === undefined || end === undefined || end <= start) throw new Error(`bad interval ${startName}/${endName}`);
  const bytes = rom.subarray(start - 0x08000000, end - 0x08000000);
  return { start: `0x${start.toString(16).padStart(8, "0")}`, endExclusive: `0x${end.toString(16).padStart(8, "0")}`, byteLength: bytes.length, romSha256: sha(bytes) };
};
const symbolPin = (name: string) => {
  const symbol = symbols.get(name); if (!symbol?.size) throw new Error(`missing sized ELF symbol ${name}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, symbol.address - 0x08000000 + symbol.size);
  return { start: `0x${symbol.address.toString(16).padStart(8, "0")}`, endExclusive: `0x${(symbol.address + symbol.size).toString(16).padStart(8, "0")}`, byteLength: symbol.size, romSha256: sha(bytes) };
};

const carriers = frontier.entries.filter((entry: Json) => entry.index >= 110 && entry.index <= 849 && entry.moves.includes("MOVE_AMNESIA"));
const expectedCarrierIds = [252, 258, 259, 321, 364, 384, 410, 525, 563, 676, 763, 764, 786];
if (JSON.stringify(carriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedCarrierIds)) throw new Error("Level-50 Amnesia carrier census drifted");
const controls = ["MOVE_HYPNOSIS", "MOVE_CONFUSION", "MOVE_PSYCHIC", "MOVE_DREAM_EATER", "MOVE_PSYBEAM", "MOVE_LUSTER_PURGE"];
if (!controls.every((move) => coverage.entries.find((entry: Json) => entry.move === move)?.status === "exact")) throw new Error("Amnesia psychic-background control drifted");
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_AMNESIA")) throw new Error("Amnesia must remain unsupported");

console.log(JSON.stringify({
  move: "MOVE_AMNESIA", moveId: 133, status: "unsupported", coverageCredit: false,
  pointerOwned: {
    root: { ...interval("Move_AMNESIA", "Move_KINESIS"), sourceByteLength: Buffer.byteLength(rootBody), sourceSha256: sha(rootBody) },
    psychicBackground: { ...interval("SetPsychicBackground", "SetSkyBg"), sourceByteLength: Buffer.byteLength(backgroundBody), sourceSha256: sha(backgroundBody) },
  },
  graph: { blocks: graphEntry.blocks, components }, commands: expectedCommands,
  resources: {
    tag: "ANIM_TAG_AMNESIA", tagValue: 10093, tileBytes: 4096,
    gfx: symbolPin("gBattleAnimSpriteGfx_Amnesia"), palette: symbolPin("gBattleAnimSpritePal_Amnesia"),
    template: symbolPin("gQuestionMarkSpriteTemplate"), oam: "gOamData_AffineOff_ObjNormal_32x32",
  },
  callbacks: Object.fromEntries(["AnimQuestionMark", "AnimQuestionMark_Step1", "AnimQuestionMark_Step2", "AnimTask_SetPsychicBackground", "SetPsychicBackground_Step"].map((name) => [name, symbolPin(name)])),
  behavior: {
    questionMarks: 1, anchor: "attacker width/2 and height/-2; opponent mirrors x; y clamps to 16",
    affine: "question-mark image animation completes, then affine setup/teardown, 18-tick hold, destroy",
    background: "BG_PSYCHIC fade in; rotate selected battle-BG faded palette entries 1..11 every fourth task tick; stop on arg7=0xFFFF; restore BG",
    audio: { sound: "SE_M_METRONOME", id: 186, initial: { pan: "SOUND_PAN_ATTACKER" }, loop: { pan: "SOUND_PAN_ATTACKER", interval: 16, count: 3 } },
  },
  carriers: {
    level50Range: { first: 110, last: 849 }, count: carriers.length,
    all: carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })),
    lowest: { index: carriers[0].index, label: carriers[0].label, species: carriers[0].species, moves: carriers[0].moves, itemName: carriers[0].itemName, nature: carriers[0].nature, evSpreadStats: carriers[0].evSpreadStats },
  },
  controls: { exactPsychicBackground: controls, hypnosis: "distinct six-GoldRing target-path body; no Amnesia acceptance transfers", independence: "controls are status-only regression identities and confer no component, latch, or move acceptance" },
  checkpoint: { denseWindowCaptured: false, productionChanged: false, coveragePromotion: false },
}, null, 2));
