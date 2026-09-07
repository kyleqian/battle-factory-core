/** Evidence-only source/classification audit for MOVE_DRAGON_DANCE. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const block = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`missing source boundary ${start}/${end}`);
  return source.slice(from, to);
};

const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const dragon = read("reference/pokeemerald/src/battle_anim_dragon.c");
const mons = read("reference/pokeemerald/src/battle_anim_mons.c");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const registry = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as Json;
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as Json;
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json")) as Json;
const body = block(scripts, "Move_DRAGON_DANCE:\n", "Move_SHOCK_WAVE:\n");
const commands = body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter(Boolean);
const expectedCommands = [
  "loadspritegfx ANIM_TAG_HOLLOW_ORB", "monbg ANIM_ATTACKER", "splitbgprio ANIM_ATTACKER", "delay 1",
  "createvisualtask AnimTask_DragonDanceWaver, 5", "playsewithpan SE_M_TELEPORT, SOUND_PAN_ATTACKER", "delay 8",
  "createvisualtask AnimTask_BlendPalInAndOutByTag, 5, ANIM_TAG_HOLLOW_ORB, RGB(0, 0, 19), 14, 0, 3",
  "create_dragon_dance_orb_sprite ANIM_ATTACKER, 2, angle=0/360",
  "create_dragon_dance_orb_sprite ANIM_ATTACKER, 2, angle=61/360",
  "create_dragon_dance_orb_sprite ANIM_ATTACKER, 2, angle=120/360",
  "create_dragon_dance_orb_sprite ANIM_ATTACKER, 2, angle=180/360",
  "create_dragon_dance_orb_sprite ANIM_ATTACKER, 2, angle=240/360",
  "create_dragon_dance_orb_sprite ANIM_ATTACKER, 2, angle=300/360",
  "delay 30", "playsewithpan SE_M_TELEPORT, SOUND_PAN_ATTACKER", "delay 30",
  "playsewithpan SE_M_TELEPORT, SOUND_PAN_ATTACKER", "waitforvisualfinish", "clearmonbg ANIM_ATTACKER", "delay 1", "end",
];
const components = [
  "asset:ANIM_TAG_HOLLOW_ORB", "task:AnimTask_BlendPalInAndOutByTag", "task:AnimTask_DragonDanceWaver",
  "visualCommand:clearmonbg", "visualCommand:create_dragon_dance_orb_sprite", "visualCommand:monbg", "visualCommand:splitbgprio",
];
const entry = graph.moves.find((item: Json) => item.move === "MOVE_DRAGON_DANCE");
const carriers = frontier.entries.filter((item: Json) => item.index >= 110 && item.index <= 849 && item.moves.includes("MOVE_DRAGON_DANCE"));
const carrierIds = [306, 310, 324, 459, 550, 604, 648, 653, 747, 749, 753, 828, 829, 848];
const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const parts = line.trim().split(/\s+/u);
  if (parts.length >= 4 && /^[0-9a-f]+$/iu.test(parts[0]!) && /^[0-9a-f]+$/iu.test(parts[1]!)) symbols.set(parts.at(-1)!, { address: Number.parseInt(parts[0]!, 16), size: Number.parseInt(parts[1]!, 16) });
  else if (parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!)) symbols.set(parts[2]!, { address: Number.parseInt(parts[0]!, 16), size: 0 });
}
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const pin = (name: string) => {
  const symbol = symbols.get(name); if (!symbol?.size) throw new Error(`missing sized symbol ${name}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, symbol.address - 0x08000000 + symbol.size);
  return { start: `0x${symbol.address.toString(16).padStart(8, "0")}`, endExclusive: `0x${(symbol.address + symbol.size).toString(16).padStart(8, "0")}`, byteLength: symbol.size, romSha256: sha(bytes) };
};
const start = symbols.get("Move_DRAGON_DANCE")!.address, end = symbols.get("Move_SHOCK_WAVE")!.address;
const moveBytes = rom.subarray(start - 0x08000000, end - 0x08000000);

for (const token of [
  "const struct SpriteTemplate gDragonDanceOrbSpriteTemplate", ".tileTag = ANIM_TAG_HOLLOW_ORB", ".oam = &gOamData_AffineOff_ObjNormal_16x16", ".callback = AnimDragonDanceOrb",
  "sprite->data[7] = r5 / 2", "sprite->data[7] = r0 / 2", "sprite->data[6] = (sprite->data[6] - sprite->data[5]) & 0xFF", "DestroyAnimSprite(sprite)",
  "void AnimTask_DragonDanceWaver(u8 taskId)", "GetBattlerSpriteBGPriorityRank(gBattleAnimAttacker)", "GetBattlerYCoordWithElevation(gBattleAnimAttacker)", "ScanlineEffect_SetParams(scanlineParams)", "gScanlineEffect.state = 3", "DestroyAnimVisualTask(taskId)",
]) if (!dragon.includes(token)) throw new Error(`dragon dependency drifted: ${token}`);
for (const token of [
  "void AnimTask_BlendPalInAndOutByTag(u8 task)", "IndexOfSpritePaletteTag(gBattleAnimArgs[0])", "AnimTask_BlendPalInAndOutSetup(&gTasks[task])", "BlendPalette(task->data[0], 15, task->data[2], task->data[1])",
]) if (!mons.includes(token)) throw new Error(`palette dependency drifted: ${token}`);
if (JSON.stringify(commands) !== JSON.stringify(expectedCommands)
  || JSON.stringify(entry?.blocks) !== JSON.stringify(["Move_DRAGON_DANCE"])
  || JSON.stringify(entry?.componentIds) !== JSON.stringify(components)
  || JSON.stringify(carriers.map((item: Json) => item.index)) !== JSON.stringify(carrierIds)
  || coverage.entries.some((item: Json) => item.move === "MOVE_DRAGON_DANCE")
  || !macros.includes("createsprite gDragonDanceOrbSpriteTemplate, \\anim_battler, \\subpriority_offset, 256 * \\angle")
  || !registry.includes("{gBattleAnimSpriteGfx_HollowOrb, 0x0080, ANIM_TAG_HOLLOW_ORB}")
  || !registry.includes("{gBattleAnimSpritePal_HollowOrb, ANIM_TAG_HOLLOW_ORB}")
  || !graphics.includes('INCGFX_U32("graphics/battle_anims/sprites/hollow_orb.png", ".4bpp.lz")')
  || !constants.includes("#define ANIM_TAG_HOLLOW_ORB                 (ANIM_SPRITES_START + 249)")
  || !songs.includes("#define SE_M_TELEPORT               203")) throw new Error("Dragon Dance source/classification contract drifted");

console.log(JSON.stringify({
  move: "MOVE_DRAGON_DANCE", moveId: 349, status: "unsupported", coverageCredit: false,
  source: { start: `0x${start.toString(16).padStart(8, "0")}`, endExclusive: `0x${end.toString(16).padStart(8, "0")}`, byteLength: moveBytes.length, romSha256: sha(moveBytes), sourceByteLength: Buffer.byteLength(body), sourceSha256: sha(body), commandRows: commands.length },
  graph: { blocks: entry.blocks, components }, commands: expectedCommands,
  resources: { tag: "ANIM_TAG_HOLLOW_ORB", tagValue: 10249, tileBytes: 128, gfx: pin("gBattleAnimSpriteGfx_HollowOrb"), palette: pin("gBattleAnimSpritePal_HollowOrb"), template: pin("gDragonDanceOrbSpriteTemplate") },
  callbacks: Object.fromEntries(["AnimDragonDanceOrb", "AnimDragonDanceOrb_Step", "AnimTask_BlendPalInAndOutByTag", "AnimTask_BlendPalInAndOutSetup", "AnimTask_DragonDanceWaver", "AnimTask_DragonDanceWaver_Step", "UpdateDragonDanceScanlineEffect"].map((name) => [name, pin(name)])),
  behavior: {
    orbs: "six 16x16 orbs start around attacker at angles 0/61/120/180/240/300; radius is half max live width/height; angular speed rises to 16, then radius expands to 150 before destroy",
    palette: "HOLLOW_ORB OBJ palette blends to RGB(0,0,19), coefficient 14, delay 0, for three in/out cycles",
    waver: "attacker BG1/BG2 priority selects HOFS DMA; live elevated Y bounds a clamped 64-line sine wave; amplitude ramps 0..3, holds 61 ticks, ramps down, stops scanline DMA, destroys",
    background: "monbg/splitbgprio isolate the attacker; clearmonbg follows all visual tasks",
    audio: { sound: "SE_M_TELEPORT", id: 203, calls: 3, pan: "SOUND_PAN_ATTACKER", delays: [0, 30, 30] },
  },
  carriers: { level50Range: { first: 110, last: 849 }, setCount: carriers.length, speciesCount: new Set(carriers.map((item: Json) => item.species)).size, all: carriers.map((item: Json) => ({ index: item.index, label: item.label, species: item.species, moves: item.moves, itemName: item.itemName, nature: item.nature, evSpreadStats: item.evSpreadStats })), lowest: carriers[0] },
  checkpoint: { legalBilateralPartyOnlyStaging: true, denseWindowCaptured: false, productionChanged: false, coveragePromotion: false, componentTrackCredit: false, latchPromotion: false },
}, null, 2));
