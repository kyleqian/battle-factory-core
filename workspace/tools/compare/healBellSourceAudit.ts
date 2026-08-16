import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects2 = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const animMons = read("reference/pokeemerald/src/battle_anim_mons.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const frontierMons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const frontierConstants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const factory = read("reference/pokeemerald/src/battle_factory.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const generatedMons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json"));
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);

type Symbol = { readonly address: number; readonly size: number };
const symbols = new Map<string, Symbol>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length === 4 && /^[0-9a-f]+$/iu.test(fields[0]!)
    && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields[3]!, {
      address: Number.parseInt(fields[0]!, 16),
      size: Number.parseInt(fields[1]!, 16),
    });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}

function romInterval(name: string, endName?: string) {
  const symbol = symbols.get(name);
  if (!symbol) throw new Error(`missing ELF symbol ${name}`);
  const end = endName
    ? symbols.get(endName)?.address
    : symbol.size ? symbol.address + symbol.size : undefined;
  if (!end) throw new Error(`missing end for ${name}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, end - 0x08000000);
  return {
    start: `0x${symbol.address.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${end.toString(16).padStart(8, "0")}`,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function scriptCommands(start: string, end: string): string[] {
  const from = scripts.indexOf(`${start}:`);
  const to = scripts.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing script block ${start}/${end}`);
  return scripts.slice(from, to).split("\n").slice(1)
    .map((line) => line.replace(/@.*$/u, "").trim())
    .filter(Boolean);
}

function requireToken(source: string, token: string, label: string): void {
  if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const moveScript = scriptCommands("Move_HEAL_BELL", "HealBellRing");
const ringScript = scriptCommands("HealBellRing", "Move_FAKE_OUT");
const expectedMoveScript = [
  "loadspritegfx ANIM_TAG_BELL",
  "loadspritegfx ANIM_TAG_MUSIC_NOTES_2",
  "loadspritegfx ANIM_TAG_THIN_RING",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_ATK_SIDE, 0, 0, 10, RGB_WHITE",
  "waitforvisualfinish",
  "createvisualtask AnimTask_LoadMusicNotesPals, 5",
  "createsprite gBellSpriteTemplate, ANIM_ATTACKER, 2, 0, -24, 0, 1",
  "delay 12",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, 48, -18, 35, 0, 0",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, -48, 20, 30, 1, 1",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, -38, -29, 30, 2, 2",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, 36, 18, 30, 3, 3",
  "call HealBellRing",
  "delay 33",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, 19, 26, 35, 4, 4",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, -34, -12, 30, 5, 5",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, 41, -20, 34, 6, 2",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, -15, 26, 32, 7, 0",
  "call HealBellRing",
  "delay 33",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, -48, 18, 31, 0, 2",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, 48, -20, 30, 2, 5",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, 38, 29, 33, 4, 3",
  "createsprite gHealBellMusicNoteSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, -36, -18, 30, 6, 1",
  "call HealBellRing",
  "waitforvisualfinish",
  "createvisualtask AnimTask_FreeMusicNotesPals, 5",
  "waitforvisualfinish",
  "unloadspritegfx ANIM_TAG_BELL",
  "unloadspritegfx ANIM_TAG_MUSIC_NOTES_2",
  "unloadspritegfx ANIM_TAG_THIN_RING",
  "loadspritegfx ANIM_TAG_SPARKLE_2",
  "playsewithpan SE_M_MORNING_SUN, SOUND_PAN_ATTACKER",
  "createsprite gSparklingStarsSpriteTemplate, ANIM_ATTACKER, 16, -15, 0, 0, 0, 32, 60, 1",
  "delay 8",
  "createsprite gSparklingStarsSpriteTemplate, ANIM_ATTACKER, 16, 12, -5, 0, 0, 32, 60, 1",
  "waitforvisualfinish",
  "unloadspritegfx ANIM_TAG_SPARKLE_2",
  "loadspritegfx ANIM_TAG_THIN_RING",
  "playsewithpan SE_SHINY, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_BlendBattleAnimPalExclude, 10, 4, 3, 10, 0, RGB(12, 24, 30)",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_ATK_SIDE, 3, 10, 0, RGB_WHITE",
  "createsprite gBlendThinRingExpandingSpriteTemplate, ANIM_ATTACKER, 16, 0, 0, 0, 1",
  "end",
];
const expectedRingScript = [
  "createvisualtask AnimTask_BlendBattleAnimPalExclude, 10, 4, 3, 8, 0, RGB(12, 24, 30)",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_ATK_SIDE, 3, 2, 10, RGB_WHITE",
  "createsprite gThinRingExpandingSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, 0, 1",
  "playsewithpan SE_M_HEAL_BELL, SOUND_PAN_ATTACKER",
  "return",
];
if (JSON.stringify(moveScript) !== JSON.stringify(expectedMoveScript)
  || JSON.stringify(ringScript) !== JSON.stringify(expectedRingScript)) {
  throw new Error("Heal Bell script command order or timing drifted");
}

const noteCreates = moveScript.filter((line) => line.startsWith(
  "createsprite gHealBellMusicNoteSpriteTemplate",
)).map((line) => {
  const match = line.match(/, 40, 0, -24, (-?\d+), (-?\d+), (\d+), (\d+), (\d+)$/u);
  if (!match) throw new Error(`unparseable Heal Bell note path: ${line}`);
  return {
    x: Number(match[1]), y: Number(match[2]), duration: Number(match[3]),
    tileVariant: Number(match[4]), paletteVariant: Number(match[5]),
  };
});
const noteGroups = [noteCreates.slice(0, 4), noteCreates.slice(4, 8), noteCreates.slice(8, 12)];
const expectedNoteGroups = [
  [
    { x: 48, y: -18, duration: 35, tileVariant: 0, paletteVariant: 0 },
    { x: -48, y: 20, duration: 30, tileVariant: 1, paletteVariant: 1 },
    { x: -38, y: -29, duration: 30, tileVariant: 2, paletteVariant: 2 },
    { x: 36, y: 18, duration: 30, tileVariant: 3, paletteVariant: 3 },
  ],
  [
    { x: 19, y: 26, duration: 35, tileVariant: 4, paletteVariant: 4 },
    { x: -34, y: -12, duration: 30, tileVariant: 5, paletteVariant: 5 },
    { x: 41, y: -20, duration: 34, tileVariant: 6, paletteVariant: 2 },
    { x: -15, y: 26, duration: 32, tileVariant: 7, paletteVariant: 0 },
  ],
  [
    { x: -48, y: 18, duration: 31, tileVariant: 0, paletteVariant: 2 },
    { x: 48, y: -20, duration: 30, tileVariant: 2, paletteVariant: 5 },
    { x: 38, y: 29, duration: 33, tileVariant: 4, paletteVariant: 3 },
    { x: -36, y: -18, duration: 30, tileVariant: 6, paletteVariant: 1 },
  ],
];
if (JSON.stringify(noteGroups) !== JSON.stringify(expectedNoteGroups)) {
  throw new Error("Heal Bell note-path table drifted");
}

for (const token of [
  "#define NUM_MUSIC_NOTE_PAL_TAGS  3",
  "ANIM_TAG_MUSIC_NOTES_2,",
  "ANIM_SPRITES_START - 1,",
  "ANIM_SPRITES_START - 2,",
  ".callback = AnimSpriteOnMonPos,",
  ".callback = AnimHealBellMusicNote,",
  "sprite->data[0] = gBattleAnimArgs[4];",
  "gBattleAnimArgs[2] = -gBattleAnimArgs[2];",
  "sprite->callback = StartAnimLinearTranslation;",
  "SetMusicNotePalette(sprite, gBattleAnimArgs[5], gBattleAnimArgs[6]);",
  "u8 tile = (b & 1) ? 32 : 0;",
  "sprite->oam.tileNum += tile + a * 4;",
  "sprite->oam.paletteNum = IndexOfSpritePaletteTag(sMusicNotePaletteTagsTable[b >> 1]);",
  "paletteNums[0] = IndexOfSpritePaletteTag(ANIM_TAG_MUSIC_NOTES_2);",
  "paletteNums[i] = AllocSpritePalette(ANIM_SPRITES_START - i);",
  "LZDecompressWram(gBattleAnimSpritePal_MusicNotes2, gMonSpritesGfxPtr->buffer);",
  "FreeSpritePaletteByTag(sMusicNotePaletteTagsTable[i]);",
  ".oam = &gOamData_AffineDouble_ObjNormal_64x64,",
  ".oam = &gOamData_AffineDouble_ObjBlend_64x64,",
  ".callback = AnimBlendThinRing,",
]) requireToken(effects2, token, "Heal Bell sprite/resource source");

for (const token of [
  ".callback = AnimGrantingStars,",
  ".callback = AnimSparklingStars,",
  "if (!cmd->unk2)\n        battler = gBattleAnimAttacker;",
  "SetAverageBattlerPositions(battler, cmd->unk6, &sprite->x, &sprite->y);",
  "SetAnimSpriteInitialXOffset(sprite, cmd->unk0);",
  "sprite->callback = TranslateSpriteLinearFixedPoint;",
]) requireToken(effects1, token, "Sparkle callback source");
for (const token of [
  "void AnimTask_BlendBattleAnimPal(u8 taskId)",
  "void AnimTask_BlendBattleAnimPalExclude(u8 taskId)",
  "case 4:",
  "animBattlers[0] = gBattleAnimAttacker;",
  "animBattlers[1] = gBattleAnimTarget;",
]) requireToken(utility, token, "Heal Bell palette task source");
for (const token of [
  "InitSpritePosToAnimAttacker(sprite, respectMonPicOffsets);",
  "DestroySpriteAndMatrix(sprite);",
]) requireToken(animMons, token, "Bell/ring side-position source");
for (const token of [
  "{gBattleAnimSpriteGfx_ThinRing, 0x0800, ANIM_TAG_THIN_RING}",
  "{gBattleAnimSpriteGfx_Bell, 0x0600, ANIM_TAG_BELL}",
  "{gBattleAnimSpriteGfx_MusicNotes2, 0x0800, ANIM_TAG_MUSIC_NOTES_2}",
  "{gBattleAnimSpriteGfx_Sparkle1, 0x1000, ANIM_TAG_SPARKLE_2}",
  "{gBattleAnimSpritePal_Sparkle2, ANIM_TAG_SPARKLE_2}",
  "{gBattleAnimSpritePal_ThinRing, ANIM_TAG_THIN_RING}",
  "{gBattleAnimSpritePal_Bell, ANIM_TAG_BELL}",
  "{gBattleAnimSpritePal_MusicNotes2, ANIM_TAG_MUSIC_NOTES_2}",
]) requireToken(animData, token, "Heal Bell asset table");
for (const token of [
  "graphics/battle_anims/sprites/bell.png",
  "graphics/battle_anims/sprites/music_notes_2.png",
  "graphics/battle_anims/sprites/thin_ring.png",
  "graphics/battle_anims/sprites/sparkle_1.png",
  "graphics/battle_anims/sprites/sparkle_2.pal",
]) requireToken(graphics, token, "Heal Bell graphics source");

const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_HEAL_BELL");
const components = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_HEAL_BELL")?.componentIds;
const allCarriers = generatedMons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_HEAL_BELL"));
const chimecho2 = generatedMons.entries.find((entry: { index: number }) => entry.index === 314);
const chimechoSource = frontierMons.slice(
  frontierMons.indexOf("[FRONTIER_MON_CHIMECHO_2]"),
  frontierMons.indexOf("[FRONTIER_MON_GLIGAR_2]"),
);
const expectedComponents = [
  "asset:ANIM_TAG_BELL", "asset:ANIM_TAG_MUSIC_NOTES_2", "asset:ANIM_TAG_SPARKLE_2",
  "asset:ANIM_TAG_THIN_RING", "sprite:gBellSpriteTemplate",
  "sprite:gBlendThinRingExpandingSpriteTemplate", "sprite:gHealBellMusicNoteSpriteTemplate",
  "sprite:gSparklingStarsSpriteTemplate", "sprite:gThinRingExpandingSpriteTemplate",
  "subroutine:HealBellRing", "task:AnimTask_BlendBattleAnimPal",
  "task:AnimTask_BlendBattleAnimPalExclude", "task:AnimTask_FreeMusicNotesPals",
  "task:AnimTask_LoadMusicNotesPals", "visualCommand:unloadspritegfx",
];
if (!move || move.id !== 215 || move.exampleMons.join(",")
  !== "FRONTIER_MON_DELCATTY_1,FRONTIER_MON_CHIMECHO_1,FRONTIER_MON_CHIMECHO_2"
  || JSON.stringify(components) !== JSON.stringify(expectedComponents)
  || !chimecho2 || chimecho2.label !== "FRONTIER_MON_CHIMECHO_2"
  || JSON.stringify(chimecho2.moves) !== JSON.stringify([
    "MOVE_PSYCHIC", "MOVE_HYPNOSIS", "MOVE_DREAM_EATER", "MOVE_HEAL_BELL",
  ])
  || !chimechoSource.includes(".species = SPECIES_CHIMECHO")
  || !chimechoSource.includes("BATTLE_FRONTIER_ITEM_TWISTED_SPOON")
  || !chimechoSource.includes("F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP")
  || !chimechoSource.includes("NATURE_QUIET")
  || !frontierConstants.includes("#define FRONTIER_MON_CHIMECHO_2     314")
  || !factory.includes("{FRONTIER_MON_DELCATTY_2, FRONTIER_MON_CLOYSTER_2}, // 267 - 371")
  || JSON.stringify(policy.rentalSelection.ranges.level50[2]) !== JSON.stringify({
    start: 267, end: 371, startLabel: "FRONTIER_MON_DELCATTY_2", endLabel: "FRONTIER_MON_CLOYSTER_2",
  })) throw new Error("Heal Bell carrier/range/component graph drifted");

console.log(JSON.stringify({
  move: "MOVE_HEAL_BELL",
  moveId: 215,
  status: "unsupported-source-staging-checkpoint",
  source: {
    moveScript: romInterval("Move_HEAL_BELL", "HealBellRing"),
    healBellRing: romInterval("HealBellRing", "Move_FAKE_OUT"),
    bellAnimCmds: romInterval("gBellAnimCmds"),
    bellTemplate: romInterval("gBellSpriteTemplate"),
    noteTemplate: romInterval("gHealBellMusicNoteSpriteTemplate"),
    noteCallback: romInterval("AnimHealBellMusicNote"),
    loadMusicNotesPals: romInterval("AnimTask_LoadMusicNotesPals"),
    freeMusicNotesPals: romInterval("AnimTask_FreeMusicNotesPals"),
    blendBattleAnimPal: romInterval("AnimTask_BlendBattleAnimPal"),
    blendBattleAnimPalExclude: romInterval("AnimTask_BlendBattleAnimPalExclude"),
    musicNotePaletteTags: romInterval("sMusicNotePaletteTagsTable"),
    thinRingExpandingAffine: romInterval("gThinRingExpandingAffineAnimTable"),
    thinRingTemplate: romInterval("gThinRingExpandingSpriteTemplate"),
    blendThinRingTemplate: romInterval("gBlendThinRingExpandingSpriteTemplate"),
    sharedStarsAnimCmds: romInterval("gGrantingStarsAnimCmds"),
    sparklingStarsTemplate: romInterval("gSparklingStarsSpriteTemplate"),
    sparklingStarsCallback: romInterval("AnimSparklingStars"),
    bellGfx: romInterval("gBattleAnimSpriteGfx_Bell"),
    bellPalette: romInterval("gBattleAnimSpritePal_Bell"),
    musicNotesGfx: romInterval("gBattleAnimSpriteGfx_MusicNotes2"),
    musicNotesPalette: romInterval("gBattleAnimSpritePal_MusicNotes2"),
    thinRingGfx: romInterval("gBattleAnimSpriteGfx_ThinRing"),
    thinRingPalette: romInterval("gBattleAnimSpritePal_ThinRing"),
    sparkle2Gfx: romInterval("gBattleAnimSpriteGfx_Sparkle1"),
    sparkle2Palette: romInterval("gBattleAnimSpritePal_Sparkle2"),
  },
  scripts: { Move_HEAL_BELL: moveScript, HealBellRing: ringScript },
  noteGroups,
  lifecycle: {
    initialLoads: ["ANIM_TAG_BELL", "ANIM_TAG_MUSIC_NOTES_2", "ANIM_TAG_THIN_RING"],
    notePaletteTags: ["ANIM_TAG_MUSIC_NOTES_2", "ANIM_SPRITES_START - 1", "ANIM_SPRITES_START - 2"],
    ringCalls: 3,
    healBellAudioCues: 3,
    noteUnloadBeforeSparkles: ["ANIM_TAG_BELL", "ANIM_TAG_MUSIC_NOTES_2", "ANIM_TAG_THIN_RING"],
    sparkleReloadBoundary: ["load ANIM_TAG_SPARKLE_2", "unload ANIM_TAG_SPARKLE_2", "load ANIM_TAG_THIN_RING"],
    audio: ["SE_M_HEAL_BELL/SOUND_PAN_ATTACKER x3", "SE_M_MORNING_SUN/SOUND_PAN_ATTACKER", "SE_SHINY/SOUND_PAN_ATTACKER"],
  },
  sideDependencies: {
    bellAndRings: "ANIM_ATTACKER positions via AnimSpriteOnMonPos; source resolves the attacker side and picture offsets",
    notes: "AnimHealBellMusicNote flips only its target x offset when attacker is opponent, then linearly translates from attacker coordinates",
    sparklingStars: "AnimSparklingStars chooses attacker because arg2=0; in doubles it averages visible partner positions, otherwise it uses attacker X/Y or X_2/PIC_OFFSET according to arg6; SetAnimSpriteInitialXOffset is side-relative",
    palettes: "BlendBattleAnimPal uses F_PAL_ATK_SIDE; BlendBattleAnimPalExclude selector 4 excludes attacker and target palettes while retaining visible non-animated battlers",
  },
  sharedControls: {
    musicNotes2: "MOVE_PERISH_SONG is an exact MUSIC_NOTES_2 asset control only: its Perish Song note templates, panse, grayscale sentinel, fades, and palette lifetime are not Heal Bell's twelve note paths or Load/FreeMusicNotesPals lifecycle",
    sparkle2: "MOVE_AROMATHERAPY is an exact gSparklingStars control; MOVE_SYNTHESIS, MOVE_REFRESH, MOVE_WISH, and MOVE_COSMIC_POWER use gGrantingStars/GrantingStarsEffect. Both star templates share gGrantingStarsAnimCmds, but gSparklingStarsSpriteTemplate calls AnimSparklingStars rather than AnimGrantingStars",
    thinRing: "Existing thin-ring controls do not prove Heal Bell's three per-ring palette tasks, unload/reload boundary, or final ObjBlend expansion",
  },
  components: expectedComponents,
  carrier: {
    allLevel50: allCarriers.map((entry: { index: number; label: string; species: string }) => ({
      index: entry.index, label: entry.label, species: entry.species,
    })),
    legalChallenge2: {
      index: 314, label: "FRONTIER_MON_CHIMECHO_2", species: "SPECIES_CHIMECHO",
      moves: chimecho2.moves, item: "BATTLE_FRONTIER_ITEM_TWISTED_SPOON",
      evSpread: ["F_EV_SPREAD_SP_DEFENSE", "F_EV_SPREAD_DEFENSE", "F_EV_SPREAD_HP"],
      nature: "NATURE_QUIET",
    },
    challenge2Range: policy.rentalSelection.ranges.level50[2],
  },
  ownership: { gpuRegisters: false, gameplayState: false, renderer: false },
}, null, 2));
