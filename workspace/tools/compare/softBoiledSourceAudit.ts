import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const path = (relative: string): string => resolve(root, relative);
const read = (relative: string): string => readFileSync(path(relative), "utf8");
const sha256 = (relative: string): string => createHash("sha256")
  .update(readFileSync(path(relative))).digest("hex");

const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects2 = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/battle_anim_mons.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const battleCommands = read("reference/pokeemerald/src/battle_script_commands.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const moves = read("reference/pokeemerald/src/data/battle_moves.h");
const frontierMons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const frontierConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const factory = read("reference/pokeemerald/src/battle_factory.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const generatedMons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json"));
const rom = readFileSync(path("reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", "-S", path("reference/pokeemerald/pokeemerald.elf")],
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

const moveScript = scriptCommands("Move_SOFT_BOILED", "Move_HEAL_BELL");
const healingEffect2 = scriptCommands("HealingEffect2", "PoisonBubblesEffect");
const expectedMoveScript = [
  "loadspritegfx ANIM_TAG_BREAKING_EGG",
  "loadspritegfx ANIM_TAG_THIN_RING",
  "loadspritegfx ANIM_TAG_BLUE_STAR",
  "monbg ANIM_ATK_PARTNER",
  "playsewithpan SE_M_TAIL_WHIP, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_ATTACKER, 0, 2, 6, 1",
  "createsprite gSoftBoiledEggSpriteTemplate, ANIM_ATTACKER, 4, 0, 16, 0",
  "createsprite gSoftBoiledEggSpriteTemplate, ANIM_ATTACKER, 4, 0, 16, 1",
  "delay 120",
  "delay 7",
  "playsewithpan SE_M_HORN_ATTACK, SOUND_PAN_ATTACKER",
  "simple_palette_blend selector=F_PAL_BG | F_PAL_BATTLERS, delay=3, initial_blend_y=10, target_blend_y=0, color=RGB(12, 24, 30)",
  "createsprite gThinRingExpandingSpriteTemplate, ANIM_ATTACKER, 3, 31, 16, 0, 1",
  "delay 8",
  "createsprite gThinRingExpandingSpriteTemplate, ANIM_ATTACKER, 3, 31, 16, 0, 1",
  "delay 60",
  "setarg 7, 0xFFFF",
  "waitforvisualfinish",
  "clearmonbg ANIM_ATK_PARTNER",
  "call HealingEffect2",
  "end",
];
const expectedHealingEffect2 = [
  "playsewithpan SE_M_ABSORB_2, SOUND_PAN_TARGET",
  "createsprite gHealingBlueStarSpriteTemplate, ANIM_TARGET, 2, 0, -5, 1, 0",
  "delay 7",
  "createsprite gHealingBlueStarSpriteTemplate, ANIM_TARGET, 2, -15, 10, 1, 0",
  "delay 7",
  "createsprite gHealingBlueStarSpriteTemplate, ANIM_TARGET, 2, -15, -15, 1, 0",
  "delay 7",
  "createsprite gHealingBlueStarSpriteTemplate, ANIM_TARGET, 2, 10, -5, 1, 0",
  "delay 7",
  "return",
];
if (JSON.stringify(moveScript) !== JSON.stringify(expectedMoveScript)
  || JSON.stringify(healingEffect2) !== JSON.stringify(expectedHealingEffect2)) {
  throw new Error("Soft Boiled command order, waits, or called HealingEffect2 drifted");
}

for (const token of [
  "const union AffineAnimCmd gSoftBoiledEggAffineAnimCmds1[] =",
  "AFFINEANIMCMD_FRAME(0x0, 0x0, -8, 2)",
  "const union AffineAnimCmd gSoftBoiledEggAffineAnimCmds2[] =",
  "AFFINEANIMCMD_FRAME(0x100, 0x100, 0, 0)",
  "const union AffineAnimCmd gSoftBoiledEggAffineAnimCmds3[] =",
  "AFFINEANIMCMD_LOOP(0)",
  "const struct SpriteTemplate gSoftBoiledEggSpriteTemplate =",
  ".tileTag = ANIM_TAG_BREAKING_EGG,",
  ".oam = &gOamData_AffineDouble_ObjBlend_32x32,",
  ".affineAnims = gSoftBoiledEggAffineAnimTable,",
  ".callback = AnimSoftBoiledEgg,",
  "static void AnimSoftBoiledEgg(struct Sprite *sprite)",
  "InitSpritePosToAnimAttacker(sprite, FALSE);",
  "GetBattlerSide(gBattleAnimAttacker) != B_SIDE_PLAYER ? -160 : 160",
  "static void AnimSoftBoiledEgg_Step1(struct Sprite *sprite)",
  "static void AnimSoftBoiledEgg_Step2(struct Sprite *sprite)",
  "static void AnimSoftBoiledEgg_Step3(struct Sprite *sprite)",
  "static void AnimSoftBoiledEgg_Step3_Callback1(struct Sprite *sprite)",
  "SetGpuReg(REG_OFFSET_BLDCNT, BLDCNT_TGT2_ALL | BLDCNT_EFFECT_BLEND);",
  "static void AnimSoftBoiledEgg_Step3_Callback2(struct Sprite *sprite)",
  "static void AnimSoftBoiledEgg_Step4(struct Sprite *sprite)",
  "(u16)gBattleAnimArgs[7] == 0xFFFF",
  "static void AnimSoftBoiledEgg_Step4_Callback(struct Sprite *sprite)",
  "const struct SpriteTemplate gThinRingExpandingSpriteTemplate =",
  ".tileTag = ANIM_TAG_THIN_RING,",
  ".callback = AnimSpriteOnMonPos,",
]) requireToken(effects2, token, "Soft Boiled egg/ring source");

for (const token of [
  "const struct SpriteTemplate gHealingBlueStarSpriteTemplate =",
  ".tileTag = ANIM_TAG_BLUE_STAR,",
  ".callback = AnimSpriteOnMonPos,",
]) requireToken(effects1, token, "Soft Boiled blue-star source");
for (const token of [
  "void AnimTask_ShakeMon(u8 taskId)",
  "GetAnimBattlerSpriteId(gBattleAnimArgs[0])",
  "gTasks[taskId].data[1] = gBattleAnimArgs[3];",
  "static void AnimTask_ShakeMon_Step(u8 taskId)",
]) requireToken(movement, token, "Soft Boiled shake task source");
for (const token of [
  "void AnimSpriteOnMonPos(struct Sprite *sprite)",
  "InitSpritePosToAnimAttacker(sprite, respectMonPicOffsets);",
  "InitSpritePosToAnimTarget(sprite, respectMonPicOffsets);",
]) requireToken(mons, token, "Soft Boiled battler-position source");
for (const token of [
  "const struct SpriteTemplate gSimplePaletteBlendSpriteTemplate =",
  "static void AnimSimplePaletteBlend(struct Sprite *sprite)",
  "UnpackSelectedBattlePalettes(cmd->selector)",
  "BeginNormalPaletteFade(selectedPalettes, cmd->delay, cmd->initialBlendY, cmd->targetBlendY, cmd->color);",
  "F_PAL_BG, battle background palettes (BG palettes 1, 2, and 3)",
  "F_PAL_ATTACKER, gBattleAnimAttacker OBJ palette",
  "F_PAL_TARGET, gBattleAnimTarget OBJ palette",
]) requireToken(normal, token, "Soft Boiled palette source");
for (const token of [
  "{gBattleAnimSpriteGfx_BlueStar, 0x0E00, ANIM_TAG_BLUE_STAR}",
  "{gBattleAnimSpriteGfx_BreakingEgg, 0x0600, ANIM_TAG_BREAKING_EGG}",
  "{gBattleAnimSpriteGfx_ThinRing, 0x0800, ANIM_TAG_THIN_RING}",
  "{gBattleAnimSpritePal_BlueStar, ANIM_TAG_BLUE_STAR}",
  "{gBattleAnimSpritePal_BreakingEgg, ANIM_TAG_BREAKING_EGG}",
  "{gBattleAnimSpritePal_ThinRing, ANIM_TAG_THIN_RING}",
]) requireToken(animData, token, "Soft Boiled asset table");
for (const token of [
  "graphics/battle_anims/sprites/blue_star.png",
  "graphics/battle_anims/sprites/breaking_egg.png",
  "graphics/battle_anims/sprites/thin_ring.png",
]) requireToken(graphics, token, "Soft Boiled graphics source");
for (const token of [
  "#define SE_M_HORN_ATTACK            166",
  "#define SE_M_TAIL_WHIP              167",
  "#define SE_M_ABSORB_2               179",
]) requireToken(songs, token, "Soft Boiled audio source");
for (const token of [
  "[MOVE_SOFT_BOILED] =",
  ".effect = EFFECT_SOFTBOILED,",
  ".target = MOVE_TARGET_USER,",
  ".pp = 10,",
]) requireToken(moves, token, "Soft Boiled move source");
for (const token of [
  "BattleScript_EffectSoftboiled::",
  "tryhealhalfhealth BattleScript_AlreadyAtFullHp, BS_TARGET",
  "attackanimation",
  "healthbarupdate BS_TARGET",
  "datahpupdate BS_TARGET",
]) requireToken(battleScripts, token, "Soft Boiled battle-script source");
for (const token of [
  "static void Cmd_tryhealhalfhealth(void)",
  "gBattleMoveDamage = gBattleMons[gBattlerTarget].maxHP / 2;",
  "if (gBattleMons[gBattlerTarget].hp == gBattleMons[gBattlerTarget].maxHP)",
]) requireToken(battleCommands, token, "Soft Boiled HP source");

const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_SOFT_BOILED");
const components = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_SOFT_BOILED")?.componentIds;
const allCarriers = generatedMons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_SOFT_BOILED"));
const chansey2 = generatedMons.entries.find((entry: { index: number }) => entry.index === 332);
const chanseySource = frontierMons.slice(
  frontierMons.indexOf("[FRONTIER_MON_CHANSEY_2]"),
  frontierMons.indexOf("[FRONTIER_MON_SEAKING_2]"),
);
const expectedComponents = [
  "asset:ANIM_TAG_BLUE_STAR", "asset:ANIM_TAG_BREAKING_EGG", "asset:ANIM_TAG_THIN_RING",
  "sprite:gHealingBlueStarSpriteTemplate", "sprite:gSoftBoiledEggSpriteTemplate",
  "sprite:gThinRingExpandingSpriteTemplate", "subroutine:HealingEffect2", "task:AnimTask_ShakeMon",
  "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setarg",
  "visualCommand:simple_palette_blend",
];
const challenge2Range = policy.rentalSelection.ranges.level50[2];
if (!move || move.id !== 135 || move.animationScript !== "Move_SOFT_BOILED"
  || JSON.stringify(components) !== JSON.stringify(expectedComponents)
  || !chansey2 || chansey2.label !== "FRONTIER_MON_CHANSEY_2"
  || JSON.stringify(chansey2.moves) !== JSON.stringify([
    "MOVE_SEISMIC_TOSS", "MOVE_SHADOW_BALL", "MOVE_DOUBLE_TEAM", "MOVE_SOFT_BOILED",
  ])
  || !chanseySource.includes(".species = SPECIES_CHANSEY")
  || !chanseySource.includes("BATTLE_FRONTIER_ITEM_LEFTOVERS")
  || !chanseySource.includes("F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE")
  || !chanseySource.includes("NATURE_RELAXED")
  || !frontierConstants.includes("#define FRONTIER_MON_CHANSEY_2      332")
  || !factory.includes("{FRONTIER_MON_DELCATTY_2, FRONTIER_MON_CLOYSTER_2}, // 267 - 371")
  || JSON.stringify(challenge2Range) !== JSON.stringify({
    start: 267, end: 371, startLabel: "FRONTIER_MON_DELCATTY_2", endLabel: "FRONTIER_MON_CLOYSTER_2",
  })) throw new Error("Soft Boiled carrier/range/component graph drifted");

const sourcePaths = [
  "reference/pokeemerald/pokeemerald.gba",
  "reference/pokeemerald/pokeemerald.elf",
  "reference/pokeemerald/data/battle_anim_scripts.s",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "reference/pokeemerald/src/battle_anim_effects_1.c",
  "reference/pokeemerald/src/battle_anim_effects_2.c",
  "reference/pokeemerald/src/battle_anim_mon_movement.c",
  "reference/pokeemerald/src/battle_anim_mons.c",
  "reference/pokeemerald/src/battle_anim_normal.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/src/data/battle_anim.h",
  "reference/pokeemerald/src/data/battle_moves.h",
  "reference/pokeemerald/src/graphics.c",
  "reference/pokeemerald/include/constants/songs.h",
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
  "reference/pokeemerald/src/battle_factory.c",
  "src/data/gen/factory-animation-inventory.json",
  "src/data/gen/battle-animation-components.json",
  "src/data/gen/battle-frontier-mons.json",
  "src/data/gen/factory-round-policy.json",
] as const;
const sourceHashes = Object.fromEntries(sourcePaths.map((relative) => [relative, sha256(relative)]));

console.log(JSON.stringify({
  move: "MOVE_SOFT_BOILED",
  moveId: 135,
  status: "unsupported-source-staging-checkpoint",
  source: {
    moveScript: romInterval("Move_SOFT_BOILED", "Move_HEAL_BELL"),
    healingEffect2: romInterval("HealingEffect2", "PoisonBubblesEffect"),
    eggAffine1: romInterval("gSoftBoiledEggAffineAnimCmds1"),
    eggAffine2: romInterval("gSoftBoiledEggAffineAnimCmds2"),
    eggAffine3: romInterval("gSoftBoiledEggAffineAnimCmds3"),
    eggAffineTable: romInterval("gSoftBoiledEggAffineAnimTable"),
    eggTemplate: romInterval("gSoftBoiledEggSpriteTemplate"),
    eggInit: romInterval("AnimSoftBoiledEgg"),
    eggStep1: romInterval("AnimSoftBoiledEgg_Step1"),
    eggStep2: romInterval("AnimSoftBoiledEgg_Step2"),
    eggStep3: romInterval("AnimSoftBoiledEgg_Step3"),
    eggStep3Callback1: romInterval("AnimSoftBoiledEgg_Step3_Callback1"),
    eggStep3Callback2: romInterval("AnimSoftBoiledEgg_Step3_Callback2"),
    eggStep4: romInterval("AnimSoftBoiledEgg_Step4"),
    eggStep4Callback: romInterval("AnimSoftBoiledEgg_Step4_Callback"),
    thinRingAffine: romInterval("gThinRingExpandingAffineAnimTable"),
    thinRingTemplate: romInterval("gThinRingExpandingSpriteTemplate"),
    blueStarAnimCmds: romInterval("gHealingBlueStarAnimCmds"),
    blueStarTemplate: romInterval("gHealingBlueStarSpriteTemplate"),
    shakeMon: romInterval("AnimTask_ShakeMon"),
    shakeMonStep: romInterval("AnimTask_ShakeMon_Step"),
    onMonPos: romInterval("AnimSpriteOnMonPos"),
    simplePaletteTemplate: romInterval("gSimplePaletteBlendSpriteTemplate"),
    simplePaletteBlend: romInterval("AnimSimplePaletteBlend"),
    simplePaletteBlendStep: romInterval("AnimSimplePaletteBlend_Step"),
    battleEffect: romInterval("BattleScript_EffectSoftboiled", "BattleScript_EffectFakeOut"),
    tryHealHalfHealth: romInterval("Cmd_tryhealhalfhealth"),
    breakingEggGfx: romInterval("gBattleAnimSpriteGfx_BreakingEgg"),
    breakingEggPalette: romInterval("gBattleAnimSpritePal_BreakingEgg"),
    thinRingGfx: romInterval("gBattleAnimSpriteGfx_ThinRing"),
    thinRingPalette: romInterval("gBattleAnimSpritePal_ThinRing"),
    blueStarGfx: romInterval("gBattleAnimSpriteGfx_BlueStar"),
    blueStarPalette: romInterval("gBattleAnimSpritePal_BlueStar"),
  },
  sourceHashes,
  scripts: { Move_SOFT_BOILED: moveScript, HealingEffect2: healingEffect2 },
  lifecycle: {
    loads: ["ANIM_TAG_BREAKING_EGG", "ANIM_TAG_THIN_RING", "ANIM_TAG_BLUE_STAR"],
    eggCreates: 2,
    eggArgs: [[0, 16, 0], [0, 16, 1]],
    eggDelayBeforeBreak: 127,
    rings: 2,
    ringArgs: [31, 16, 0, 1],
    ringSpacing: 8,
    cleanupSignal: "setarg 7, 0xFFFF before waitforvisualfinish",
    monbg: ["monbg ANIM_ATK_PARTNER", "clearmonbg ANIM_ATK_PARTNER"],
    healingStars: 4,
    healingStarArgs: [[0, -5, 1, 0], [-15, 10, 1, 0], [-15, -15, 1, 0], [10, -5, 1, 0]],
    audio: [
      "SE_M_TAIL_WHIP/SOUND_PAN_ATTACKER",
      "SE_M_HORN_ATTACK/SOUND_PAN_ATTACKER",
      "SE_M_ABSORB_2/SOUND_PAN_TARGET",
    ],
    audioConstants: { SE_M_HORN_ATTACK: 166, SE_M_TAIL_WHIP: 167, SE_M_ABSORB_2: 179 },
  },
  called: {
    visualCommands: [
      "loadspritegfx", "monbg", "playsewithpan", "createvisualtask", "createsprite", "delay",
      "simple_palette_blend", "setarg", "waitforvisualfinish", "clearmonbg", "call", "end",
    ],
    tasks: ["AnimTask_ShakeMon"],
    templates: [
      "gSoftBoiledEggSpriteTemplate", "gThinRingExpandingSpriteTemplate",
      "gHealingBlueStarSpriteTemplate", "gSimplePaletteBlendSpriteTemplate",
    ],
    callbacks: [
      "AnimSoftBoiledEgg", "AnimSoftBoiledEgg_Step1", "AnimSoftBoiledEgg_Step2",
      "AnimSoftBoiledEgg_Step3", "AnimSoftBoiledEgg_Step3_Callback1",
      "AnimSoftBoiledEgg_Step3_Callback2", "AnimSoftBoiledEgg_Step4",
      "AnimSoftBoiledEgg_Step4_Callback", "AnimSpriteOnMonPos", "AnimSimplePaletteBlend",
    ],
    assets: ["ANIM_TAG_BREAKING_EGG", "ANIM_TAG_THIN_RING", "ANIM_TAG_BLUE_STAR"],
  },
  sideDependencies: {
    egg: "AnimSoftBoiledEgg anchors to ANIM_ATTACKER and reverses its 160-pixel Q8.8 horizontal impulse only when the attacker is not player-side.",
    shakeAndMonbg: "AnimTask_ShakeMon and monbg/clearmonbg select ANIM_ATTACKER / ANIM_ATK_PARTNER, so the active side is source-resolved rather than fixed coordinates.",
    rings: "Each thin ring is requested at ANIM_ATTACKER; AnimSpriteOnMonPos resolves its position from gBattleAnimArgs[2] and, for these zero args, selects the attacker with picture offsets.",
    healingStars: "HealingEffect2 requests ANIM_TARGET with gBattleAnimArgs[2]=1, so AnimSpriteOnMonPos resolves the current target side; MOVE_TARGET_USER target selection supplies that self target and the EFFECT_SOFTBOILED battle script consumes BS_TARGET before attackanimation.",
    palette: "F_PAL_BG | F_PAL_BATTLERS selects BG plus live attacker/target/partner OBJ palettes through UnpackSelectedBattlePalettes, not a fixed display region.",
    panning: "Root Tail Whip/Horn Attack use SOUND_PAN_ATTACKER; the called blue-star cue uses SOUND_PAN_TARGET, so both pan anchors reverse under bilateral staging.",
  },
  controls: {
    MOVE_RECOVER: "exact HealingEffect/RecoverAbsorbEffect BLUE_STAR control only; it has 21 attacker-side orb creates and does not prove Soft Boiled eggs, ring pair, target-side HealingEffect2, cleanup signal, or palette timing.",
    MOVE_MILK_DRINK: "exact bottle/thin-ring/target HealingEffect2 control only; it does not prove Soft Boiled's breaking-egg affine state machine, two egg creates, ring timing, palette blend, or audio sequence.",
    healingBlueStar: "the shared gHealingBlueStarSpriteTemplate remains a component control, never Soft Boiled move acceptance.",
  },
  components: expectedComponents,
  carrier: {
    allLevel50: allCarriers.map((entry: { index: number; label: string; species: string; moves: string[] }) => ({
      index: entry.index, label: entry.label, species: entry.species, moves: entry.moves,
    })),
    earliestLegal: {
      index: 332, label: "FRONTIER_MON_CHANSEY_2", species: "SPECIES_CHANSEY",
      moves: chansey2.moves, item: "BATTLE_FRONTIER_ITEM_LEFTOVERS",
      evSpread: ["F_EV_SPREAD_SP_DEFENSE", "F_EV_SPREAD_DEFENSE"], nature: "NATURE_RELAXED",
    },
    challenge2Range,
  },
  ownership: { gameplayState: false, damage: false, rng: false, ai: false, controller: false, renderer: false },
}, null, 2));
