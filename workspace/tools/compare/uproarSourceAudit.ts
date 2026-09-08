/** Deterministic authoritative-source/classification audit for unsupported MOVE_UPROAR. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const block = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`missing source boundary ${start}/${end}`);
  return source.slice(from, to);
};
const requireTokens = (source: string, label: string, tokens: string[]) => {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${label} dependency drifted: ${token}`);
  }
};

const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const animationRuntime = read("reference/pokeemerald/src/battle_anim.c");
const animationMons = read("reference/pokeemerald/src/battle_anim_mons.c");
const registry = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animationConstants = read("reference/pokeemerald/include/constants/battle_anim.h");
const moveConstants = read("reference/pokeemerald/include/constants/moves.h");
const songConstants = read("reference/pokeemerald/include/constants/songs.h");
const speciesConstants = read("reference/pokeemerald/include/constants/species.h");
const frontierConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const frontierSource = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as Json;
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as Json;
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json")) as Json;

const body = block(scripts, "Move_UPROAR:\n", "Move_HEAT_WAVE:\n");
const commands = body.split("\n")
  .slice(1)
  .map((line) => line.replace(/@.*$/u, "").trim())
  .filter((line) => Boolean(line) && !line.endsWith(":"));
const expectedCommands = [
  "loadspritegfx ANIM_TAG_JAGGED_MUSIC_NOTE",
  "loadspritegfx ANIM_TAG_THIN_RING",
  "monbg ANIM_DEF_PARTNER",
  "createvisualtask AnimTask_UproarDistortion, 2, 0",
  "createsprite gUproarRingSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 0, 0, 31, 8",
  "playsewithpan SE_M_UPROAR, SOUND_PAN_ATTACKER",
  "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, 29, -12, 0",
  "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, -12, -29, 1",
  "delay 16",
  "createvisualtask AnimTask_UproarDistortion, 2, 0",
  "createsprite gUproarRingSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 0, 0, 31, 8",
  "playsewithpan SE_M_UPROAR, SOUND_PAN_ATTACKER",
  "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, 12, -29, 1",
  "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, -29, -12, 0",
  "delay 16",
  "createvisualtask AnimTask_UproarDistortion, 2, 0",
  "createsprite gUproarRingSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 0, 0, 31, 8",
  "playsewithpan SE_M_UPROAR, SOUND_PAN_ATTACKER",
  "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, 24, -24, 1",
  "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, -24, -24, 0",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "end",
];
const components = [
  "asset:ANIM_TAG_JAGGED_MUSIC_NOTE",
  "asset:ANIM_TAG_THIN_RING",
  "sprite:gJaggedMusicNoteSpriteTemplate",
  "sprite:gUproarRingSpriteTemplate",
  "task:AnimTask_UproarDistortion",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
];
const entry = graph.moves.find((item: Json) => item.move === "MOVE_UPROAR");
const carriers = frontier.entries.filter((item: Json) => item.index >= 110 && item.index <= 849 && item.moves.includes("MOVE_UPROAR"));
const carrierIds = [221];

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const parts = line.trim().split(/\s+/u);
  if (parts.length >= 4 && /^[0-9a-f]+$/iu.test(parts[0]!) && /^[0-9a-f]+$/iu.test(parts[1]!)) {
    symbols.set(parts.at(-1)!, { address: Number.parseInt(parts[0]!, 16), size: Number.parseInt(parts[1]!, 16) });
  } else if (parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!)) {
    symbols.set(parts[2]!, { address: Number.parseInt(parts[0]!, 16), size: 0 });
  }
}
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const address = (name: string): number => {
  const symbol = symbols.get(name);
  if (!symbol) throw new Error(`missing ELF symbol ${name}`);
  return symbol.address;
};
const pin = (name: string) => {
  const symbol = symbols.get(name);
  if (!symbol?.size) throw new Error(`missing sized ELF symbol ${name}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, symbol.address - 0x08000000 + symbol.size);
  return {
    start: `0x${symbol.address.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${(symbol.address + symbol.size).toString(16).padStart(8, "0")}`,
    byteLength: symbol.size,
    romSha256: sha(bytes),
  };
};
const rootStart = address("Move_UPROAR");
const rootEnd = address("Move_HEAT_WAVE");
if (rootEnd <= rootStart) throw new Error("Move_UPROAR ELF interval drifted");
const rootBytes = rom.subarray(rootStart - 0x08000000, rootEnd - 0x08000000);
const uproarRing = block(effects, "const struct SpriteTemplate gUproarRingSpriteTemplate =\n", "const union AffineAnimCmd gStretchAttackerAffineAnimCmds[] =\n");
const jaggedNote = block(effects, "static const union AffineAnimCmd sAffineAnims_UproarDistortion[] =\n", "const union AffineAnimCmd gPerishSongMusicNoteAffineAnimCmds1[] =\n");
const ringCallback = block(effects, "static void AnimUproarRing(struct Sprite *sprite)\n", "static void AnimSoftBoiledEgg(struct Sprite *sprite)\n");
const taskCallbacks = block(effects, "void AnimTask_UproarDistortion(u8 taskId)\n", "static void AnimPerishSongMusicNote2(struct Sprite *sprite)\n");
const lowestSource = block(frontierSource, "[FRONTIER_MON_VIGOROTH_1]", "[FRONTIER_MON_LUNATONE_1]");

requireTokens(uproarRing, "Uproar ring template", [
  ".tileTag = ANIM_TAG_THIN_RING", ".paletteTag = ANIM_TAG_THIN_RING",
  ".oam = &gOamData_AffineDouble_ObjBlend_64x64", ".affineAnims = gThinRingExpandingAffineAnimTable",
  ".callback = AnimUproarRing",
]);
requireTokens(jaggedNote, "Uproar distortion/music-note source", [
  "AFFINEANIMCMD_FRAME(-12, 8, 0, 4)", "AFFINEANIMCMD_FRAME(20, -20, 0, 4)",
  "AFFINEANIMCMD_FRAME(-8, 12, 0, 4)", "AFFINEANIMCMD_END",
  ".tileTag = ANIM_TAG_JAGGED_MUSIC_NOTE", ".paletteTag = ANIM_TAG_JAGGED_MUSIC_NOTE",
  ".oam = &gOamData_AffineOff_ObjNormal_32x32", ".callback = AnimJaggedMusicNote",
]);
requireTokens(ringCallback, "Uproar ring callback", [
  "IndexOfSpritePaletteTag(ANIM_TAG_THIN_RING)", "if (index != 0xFF)",
  "BlendPalette((OBJ_PLTT_ID(index) + 1), 15, gBattleAnimArgs[5], gBattleAnimArgs[4])",
  "StartSpriteAffineAnim(sprite, 1)", "sprite->callback = AnimSpriteOnMonPos", "sprite->callback(sprite)",
]);
requireTokens(taskCallbacks, "Uproar task/music-note callbacks", [
  "GetAnimBattlerSpriteId(gBattleAnimArgs[0])", "PrepareAffineAnimInTaskData(&gTasks[taskId], spriteId, sAffineAnims_UproarDistortion)",
  "gTasks[taskId].func = AnimTask_UproarDistortion_Step", "if (!RunAffineAnimFromTaskData(&gTasks[taskId]))",
  "DestroyAnimVisualTask(taskId)", "u8 battler = !gBattleAnimArgs[0] ? gBattleAnimAttacker : gBattleAnimTarget",
  "if (GetBattlerSide(battler) == B_SIDE_OPPONENT)", "gBattleAnimArgs[1] *= -1",
  "sprite->oam.tileNum += gBattleAnimArgs[3] * 16", "sprite->callback = AnimJaggedMusicNote_Step",
  "if (++sprite->data[0] > 16)", "DestroyAnimSprite(sprite)",
]);
requireTokens(effects, "Uproar ring affine program", [
  "const union AffineAnimCmd gThinRingExpandingAffineAnimCmds2[]", "AFFINEANIMCMD_FRAME(0x20, 0x20, 0, 15)",
  "AFFINEANIMCMD_END_ALT(1)",
]);
requireTokens(animationMons, "Uproar affine and ring runtime", [
  "void PrepareAffineAnimInTaskData(struct Task *task, u8 spriteId, const union AffineAnimCmd *affineAnimCmds)",
  "bool8 RunAffineAnimFromTaskData(struct Task *task)", "case AFFINEANIMCMDTYPE_END:",
  "void AnimSpriteOnMonPos(struct Sprite *sprite)", "if (sprite->animEnded || sprite->affineAnimEnded)",
]);
requireTokens(animationRuntime, "Uproar script/runtime cleanup", [
  "static void Cmd_loadspritegfx(void)", "LoadCompressedSpriteSheetUsingHeap", "LoadCompressedSpritePaletteUsingHeap", "AddSpriteIndex",
  "static void Cmd_createsprite(void)", "static void Cmd_createvisualtask(void)", "static void Cmd_delay(void)",
  "static void Cmd_waitforvisualfinish(void)", "static void Cmd_monbg(void)", "static void Cmd_clearmonbg(void)",
  "static void Cmd_playsewithpan(void)", "static void Cmd_end(void)", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag",
]);

if (
  JSON.stringify(commands) !== JSON.stringify(expectedCommands)
  || JSON.stringify(entry?.blocks) !== JSON.stringify(["Move_UPROAR"])
  || JSON.stringify(entry?.componentIds) !== JSON.stringify(components)
  || JSON.stringify(carriers.map((item: Json) => item.index)) !== JSON.stringify(carrierIds)
  || coverage.entries.some((item: Json) => item.move === "MOVE_UPROAR")
  || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_UPROAR"])
  || coverage.componentTracks.some((track: Json) => track.moves?.includes("MOVE_UPROAR"))
  || !moveConstants.includes("#define MOVE_UPROAR 253")
  || !songConstants.includes("#define SE_M_UPROAR                 241")
  || !speciesConstants.includes("#define SPECIES_VIGOROTH 365")
  || !frontierConstants.includes("#define FRONTIER_MON_VIGOROTH_1     221")
  || !lowestSource.includes(".species = SPECIES_VIGOROTH")
  || !lowestSource.includes(".moves = {MOVE_SLASH, MOVE_COUNTER, MOVE_ENCORE, MOVE_UPROAR}")
  || !lowestSource.includes("BATTLE_FRONTIER_ITEM_FOCUS_BAND")
  || !lowestSource.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !lowestSource.includes("NATURE_LONELY")
  || !registry.includes("{gBattleAnimSpriteGfx_ThinRing, 0x0800, ANIM_TAG_THIN_RING}")
  || !registry.includes("{gBattleAnimSpritePal_ThinRing, ANIM_TAG_THIN_RING}")
  || !registry.includes("{gBattleAnimSpriteGfx_JaggedMusicNote, 0x0400, ANIM_TAG_JAGGED_MUSIC_NOTE}")
  || !registry.includes("{gBattleAnimSpritePal_JaggedMusicNote, ANIM_TAG_JAGGED_MUSIC_NOTE}")
  || !graphics.includes('INCGFX_U32("graphics/battle_anims/sprites/thin_ring.png", ".4bpp.lz")')
  || !graphics.includes('INCGFX_U32("graphics/battle_anims/sprites/thin_ring.png", ".gbapal.lz")')
  || !graphics.includes('INCGFX_U32("graphics/battle_anims/sprites/jagged_music_note.png", ".4bpp.lz")')
  || !graphics.includes('INCGFX_U32("graphics/battle_anims/sprites/jagged_music_note.png", ".gbapal.lz")')
  || !animationConstants.includes("#define ANIM_TAG_THIN_RING                  (ANIM_SPRITES_START + 203)")
  || !animationConstants.includes("#define ANIM_TAG_JAGGED_MUSIC_NOTE          (ANIM_SPRITES_START + 225)")
) throw new Error("Uproar authoritative source/classification contract drifted");

console.log(JSON.stringify({
  move: "MOVE_UPROAR",
  moveId: 253,
  status: "unsupported",
  coverageCredit: false,
  source: {
    start: `0x${rootStart.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${rootEnd.toString(16).padStart(8, "0")}`,
    byteLength: rootBytes.length,
    romSha256: sha(rootBytes),
    sourceByteLength: Buffer.byteLength(body),
    sourceSha256: sha(body),
    commandRows: commands.length,
    pointerContract: "half-open ELF script interval starts at Move_UPROAR and stops exactly at the next dispatch label Move_HEAT_WAVE; the root has no local branch, call, return, or pointer-owned subroutine label",
  },
  graph: { blocks: entry.blocks, components },
  commands: expectedCommands,
  controlFlow: {
    root: { branches: [], calls: [], returns: [], pulses: 3, delays: [16, 16], terminal: "waitforvisualfinish -> clearmonbg ANIM_DEF_PARTNER -> end" },
    pulses: [
      { ordinal: 1, distortionArgs: [0], ringArgs: [0, 0, 0, 0, 31, 8], sound: "SE_M_UPROAR", notes: [[0, 29, -12, 0], [0, -12, -29, 1]] },
      { ordinal: 2, distortionArgs: [0], ringArgs: [0, 0, 0, 0, 31, 8], sound: "SE_M_UPROAR", notes: [[0, 12, -29, 1], [0, -29, -12, 0]] },
      { ordinal: 3, distortionArgs: [0], ringArgs: [0, 0, 0, 0, 31, 8], sound: "SE_M_UPROAR", notes: [[0, 24, -24, 1], [0, -24, -24, 0]] },
    ],
  },
  resources: {
    thinRing: {
      tag: "ANIM_TAG_THIN_RING", tagValue: 10203, tileBytes: 2048,
      gfx: pin("gBattleAnimSpriteGfx_ThinRing"), palette: pin("gBattleAnimSpritePal_ThinRing"),
      template: pin("gUproarRingSpriteTemplate"), affineTable: pin("gThinRingExpandingAffineAnimTable"),
      selectedAffine: pin("gThinRingExpandingAffineAnimCmds2"), oam: "gOamData_AffineDouble_ObjBlend_64x64",
    },
    jaggedMusicNote: {
      tag: "ANIM_TAG_JAGGED_MUSIC_NOTE", tagValue: 10225, tileBytes: 1024,
      gfx: pin("gBattleAnimSpriteGfx_JaggedMusicNote"), palette: pin("gBattleAnimSpritePal_JaggedMusicNote"),
      template: pin("gJaggedMusicNoteSpriteTemplate"), oam: "gOamData_AffineOff_ObjNormal_32x32",
    },
  },
  callbacks: Object.fromEntries([
    "AnimTask_UproarDistortion", "AnimTask_UproarDistortion_Step", "sAffineAnims_UproarDistortion",
    "PrepareAffineAnimInTaskData", "RunAffineAnimFromTaskData", "AnimUproarRing", "AnimSpriteOnMonPos",
    "AnimJaggedMusicNote", "AnimJaggedMusicNote_Step", "DestroyAnimSprite", "DestroyAnimVisualTask",
  ].map((name) => [name, pin(name)])),
  behavior: {
    distortion: {
      task: "AnimTask_UproarDistortion",
      attackerSelector: 0,
      affineFrames: [[-12, 8, 0, 4], [20, -20, 0, 4], [-8, 12, 0, 4]],
      cleanup: "RunAffineAnimFromTaskData resets battler rot/scale at END; AnimTask_UproarDistortion_Step destroys its visual task",
    },
    ring: {
      template: "gUproarRingSpriteTemplate", args: [0, 0, 0, 0, 31, 8],
      palette: "BlendPalette(OBJ_PLTT_ID(thin-ring)+1, 15, arg5=31, arg4=8)",
      affine: "StartSpriteAffineAnim(sprite, 1) selects gThinRingExpandingAffineAnimCmds2: identity then +0x20/+0x20 for 15 frames",
      cleanup: "AnimSpriteOnMonPos anchors to the attacker then destroys the sprite/matrix after affine completion",
    },
    notes: {
      template: "gJaggedMusicNoteSpriteTemplate", count: 6,
      anchoring: "arg0=0 selects the attacker; opponent-side attackers invert x velocity",
      tiles: "arg3 chooses tile offset arg3*16", lifetime: "fixed-point x/y increments for data[0] 0..16; then DestroyAnimSprite",
    },
    background: {
      command: "monbg ANIM_DEF_PARTNER", cleanup: "clearmonbg ANIM_DEF_PARTNER",
      intent: "move the defending target and, when present, its partner onto the battle-animation background while the attacker-owned rings and notes play",
    },
    audio: { command: "playsewithpan", sound: "SE_M_UPROAR", id: 241, pan: "SOUND_PAN_ATTACKER", pulses: 3 },
    resourceLifetime: {
      load: ["ANIM_TAG_JAGGED_MUSIC_NOTE", "ANIM_TAG_THIN_RING"], explicitUnload: false,
      release: "Cmd_end waits for visual/sound/monbg work, then frees all tracked loaded sprite sheet and palette tags",
    },
    cleanup: ["all three distortion tasks complete", "three ring affine callbacks complete", "six notes self-destroy", "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "end releases both tags"],
  },
  carriers: {
    level50Range: { first: 110, last: 849 }, setCount: carriers.length,
    speciesCount: new Set(carriers.map((item: Json) => item.species)).size,
    all: carriers.map((item: Json) => ({ index: item.index, label: item.label, species: item.species, moves: item.moves, itemName: item.itemName, nature: item.nature, evSpreadStats: item.evSpreadStats })),
    lowest: carriers[0],
    lowestLegalRoute: { challengeNum: 1, level50Range: [162, 266], trainerId: 80, regularTrainerRange: [80, 119] },
  },
  checkpoint: {
    sourceAudit: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, productionChanged: false,
    coveragePromotion: false, componentTrackCredit: false, latchPromotion: false, unsupportedNoCreditBoundary: true,
  },
}, null, 2));
