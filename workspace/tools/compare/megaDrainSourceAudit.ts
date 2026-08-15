import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Orb = Readonly<{
  x: number;
  y: number;
  waveAmplitude: number;
  wavePeriod: number;
}>;

type StageMon = Readonly<{
  abilitySlot: number;
  evs: Record<string, number>;
  friendship: number;
  gender: string;
  item: number;
  ivs: Record<string, number>;
  level: number;
  moves: number[];
  nature: number;
  ppUps: number[];
  shiny: boolean;
  species: number;
}>;

type Stage = Readonly<{
  mode: string;
  profile: string;
  level: number;
  playerSetIds: number[];
  opponentSetIds: number[];
  overrides: Readonly<{ parties: Readonly<{ player: StageMon[]; opponent: StageMon[] }> }>;
  trace: Record<string, unknown>;
}>;

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const animation = read("reference/pokeemerald/src/battle_anim.c");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const graphics = read("reference/pokeemerald/src/data/battle_anim.h");
const frontierSource = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const speciesInfo = read("reference/pokeemerald/src/data/pokemon/species_info.h");
const backPicTable = read("reference/pokeemerald/src/data/pokemon_graphics/back_pic_table.h");
const frontPicTable = read("reference/pokeemerald/src/data/pokemon_graphics/still_front_pic_table.h");
const pokemonGraphics = read("reference/pokeemerald/src/data/graphics/pokemon.h");
const speciesConstants = read("reference/pokeemerald/include/constants/species.h");
const moveConstants = read("reference/pokeemerald/include/constants/moves.h");
const natureConstants = read("reference/pokeemerald/include/constants/pokemon.h");
const itemConstants = read("reference/pokeemerald/include/constants/items.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as {
  moves: Array<{ move: string; componentIds: string[] }>;
};
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json")) as {
  tiers: { level50: { monIndices: { first: number; last: number } } };
};
const frontierMons = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as {
  entries: Array<{
    index: number;
    label: string;
    species: string;
    moves: string[];
    nature: string;
  }>;
};
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync("arm-none-eabi-nm", [
  "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

const STAGE_PATHS = [
  "tools/battle-lab/mechanic-mega-drain-player-skiploom-opponent-onix.json",
  "tools/battle-lab/mechanic-mega-drain-opponent-skiploom-player-onix.json",
] as const;

const MEGA_DRAIN_ORB_PAIRS = [
  [
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 },
  ],
  [
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
    { x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 },
  ],
  [
    { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 },
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
  ],
  [
    { x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 },
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
  ],
  [
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 },
  ],
  [
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
    { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 },
  ],
  [
    { x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 },
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
  ],
  [
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 },
  ],
] as const satisfies readonly (readonly [Orb, Orb])[];

const expectedRootCommands = [
  "loadspritegfx ANIM_TAG_ORBS",
  "loadspritegfx ANIM_TAG_BLUE_STAR",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_DEF_PARTNER",
  "splitbgprio_foes ANIM_TARGET",
  "setalpha 12, 8",
  "simple_palette_blend selector=F_PAL_BG, delay=1, initial_blend_y=0, target_blend_y=8, color=RGB(13, 31, 12)",
  "waitforvisualfinish",
  "playsewithpan SE_M_ABSORB, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=1",
  "delay 2",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 5, 5, 1",
  "waitforvisualfinish",
  "delay 3",
  "call MegaDrainAbsorbEffect",
  "waitforvisualfinish",
  "delay 15",
  "call HealingEffect",
  "waitforvisualfinish",
  "simple_palette_blend selector=F_PAL_BG, delay=1, initial_blend_y=8, target_blend_y=0, color=RGB(13, 31, 12)",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
  "end",
] as const;

const expectedHealingCommands = [
  "playsewithpan SE_M_ABSORB_2, SOUND_PAN_ATTACKER",
  "createsprite gHealingBlueStarSpriteTemplate, ANIM_ATTACKER, 2, 0, -5, 0, 0",
  "delay 7",
  "createsprite gHealingBlueStarSpriteTemplate, ANIM_ATTACKER, 2, -15, 10, 0, 0",
  "delay 7",
  "createsprite gHealingBlueStarSpriteTemplate, ANIM_ATTACKER, 2, -15, -15, 0, 0",
  "delay 7",
  "createsprite gHealingBlueStarSpriteTemplate, ANIM_ATTACKER, 2, 10, -5, 0, 0",
  "delay 7",
  "return",
] as const;

const expectedComponents = [
  "asset:ANIM_TAG_BLUE_STAR",
  "asset:ANIM_TAG_IMPACT",
  "asset:ANIM_TAG_ORBS",
  "sprite:gHealingBlueStarSpriteTemplate",
  "subroutine:HealingEffect",
  "subroutine:MegaDrainAbsorbEffect",
  "task:AnimTask_ShakeMon",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:create_absorption_orb_sprite",
  "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:monbg",
  "visualCommand:setalpha",
  "visualCommand:simple_palette_blend",
  "visualCommand:splitbgprio_foes",
] as const;

const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing symbol ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};

const numericConstant = (source: string, name: string): number => {
  const match = source.match(new RegExp(`^#define ${name}\\s+(\\d+)$`, "m"));
  if (!match) throw new Error(`missing numeric constant ${name}`);
  return Number(match[1]);
};

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const sourceBytes = (start: number, endExclusive: number): string => sha256(
  rom.subarray(start - 0x08000000, endExclusive - 0x08000000),
);

function scriptBlock(start: string, end: string): string {
  const from = scripts.indexOf(`${start}:`);
  const to = scripts.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing script block ${start}/${end}`);
  return scripts.slice(from, to);
}

function commandLines(block: string): string[] {
  return block.split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
}

function orbCommand(orb: Orb): string {
  return "create_absorption_orb_sprite ANIM_ATTACKER, 3, "
    + `x=${orb.x}, y=${orb.y}, wave_amplitude=${orb.waveAmplitude}, wave_period=${orb.wavePeriod}`;
}

function sourceBlock(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`missing source block ${start}/${end}`);
  return source.slice(from, to);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

const move = scriptBlock("Move_MEGA_DRAIN", "MegaDrainAbsorbEffect");
const megaDrainEffect = scriptBlock("MegaDrainAbsorbEffect", "Move_GIGA_DRAIN");
const healingEffect = scriptBlock("HealingEffect", "HealingEffect2");
const rootCommands = commandLines(move);
const effectCommands = commandLines(megaDrainEffect);
const healingCommands = commandLines(healingEffect);
const expectedEffectCommands = [
  ...MEGA_DRAIN_ORB_PAIRS.flatMap(([first, second]) => [
    "playsewithpan SE_M_BUBBLE3, SOUND_PAN_TARGET",
    orbCommand(first),
    orbCommand(second),
    "delay 4",
  ]),
  "return",
];
const megaComponents = graph.moves.find((entry) => entry.move === "MOVE_MEGA_DRAIN");
const level50Carriers = frontierMons.entries.filter((entry) =>
  entry.index >= inventory.tiers.level50.monIndices.first
  && entry.index <= inventory.tiers.level50.monIndices.last
  && entry.moves.includes("MOVE_MEGA_DRAIN"),
);
const constants = {
  SKIPLOOM: numericConstant(speciesConstants, "SPECIES_SKIPLOOM"),
  ONIX: numericConstant(speciesConstants, "SPECIES_ONIX"),
  MEGA_DRAIN: numericConstant(moveConstants, "MOVE_MEGA_DRAIN"),
  TACKLE: numericConstant(moveConstants, "MOVE_TACKLE"),
  DOCILE: numericConstant(natureConstants, "NATURE_DOCILE"),
  PERSIM_BERRY: numericConstant(itemConstants, "ITEM_PERSIM_BERRY"),
  NONE: numericConstant(itemConstants, "ITEM_NONE"),
};

const requiredRecordKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function isCompleteRecord(mon: StageMon): boolean {
  return sameJson(Object.keys(mon).sort(), [...requiredRecordKeys].sort())
    && sameJson(Object.keys(mon.ivs).sort(), statKeys)
    && sameJson(Object.keys(mon.evs).sort(), statKeys)
    && mon.moves.length === 4
    && mon.ppUps.length === 4;
}

function isSkiploomStage(mon: StageMon): boolean {
  return mon.species === constants.SKIPLOOM
    && mon.level === 50
    && mon.nature === constants.DOCILE
    && mon.item === constants.PERSIM_BERRY
    && mon.abilitySlot === 0
    && sameJson(mon.moves, Array(4).fill(constants.MEGA_DRAIN))
    && sameJson(mon.ppUps, [0, 0, 0, 0]);
}

function isOnixStage(mon: StageMon): boolean {
  return mon.species === constants.ONIX
    && mon.level === 50
    && mon.nature === 0
    && mon.item === constants.NONE
    && mon.abilitySlot === 0
    && sameJson(mon.moves, Array(4).fill(constants.TACKLE))
    && sameJson(mon.ppUps, [0, 0, 0, 0]);
}

const forbiddenTransientKeys = [
  "battlers", "hp", "outcome", "sideConditions", "stages", "status", "weather",
] as const;
const stagedScenarios = STAGE_PATHS.map((path) => {
  const bytes = readFileSync(resolve(root, path));
  const stage = JSON.parse(bytes.toString("utf8")) as Stage;
  const attackerSide = path.includes("player-skiploom") ? "player" : "opponent";
  const defenderSide = attackerSide === "player" ? "opponent" : "player";
  const attackerParty = stage.overrides.parties[attackerSide];
  const defenderParty = stage.overrides.parties[defenderSide];
  const level50Ids = [...stage.playerSetIds, ...stage.opponentSetIds];
  const valid = stage.mode === "mechanicLab"
    && stage.profile === "battle-scene-on"
    && stage.level === 50
    && Object.keys(stage.overrides).length === 1
    && Object.keys(stage.overrides)[0] === "parties"
    && forbiddenTransientKeys.every((key) => !(key in stage.overrides))
    && !("captureFrames" in stage.trace)
    && attackerParty.length === 3
    && defenderParty.length === 3
    && attackerParty.every((mon) => isCompleteRecord(mon) && isSkiploomStage(mon))
    && defenderParty.every((mon) => isCompleteRecord(mon) && isOnixStage(mon))
    && level50Ids.every((id) => id >= inventory.tiers.level50.monIndices.first
      && id <= inventory.tiers.level50.monIndices.last);
  return {
    path,
    orientation: attackerSide === "player" ? "player-back" : "opponent-front",
    attacker: "SKIPLOOM",
    defender: "ONIX",
    sha256: sha256(bytes),
    valid,
  };
});

const sourceRanges = {
  moveBody: [address("Move_MEGA_DRAIN"), address("MegaDrainAbsorbEffect")],
  megaDrainAbsorbEffect: [address("MegaDrainAbsorbEffect"), address("Move_GIGA_DRAIN")],
  healingEffect: [address("HealingEffect"), address("HealingEffect2")],
  shakeMon: [address("AnimTask_ShakeMon"), address("AnimTask_ShakeMon2")],
  absorptionOrb: [address("AnimAbsorptionOrb"), address("AnimHyperBeamOrb")],
  simplePaletteBlend: [address("AnimSimplePaletteBlend"), address("AnimComplexPaletteBlend")],
} as const;
const sourceRom = Object.fromEntries(Object.entries(sourceRanges).map(([name, [start, endExclusive]]) => [
  name,
  {
    start: `0x${start.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${endExclusive.toString(16).padStart(8, "0")}`,
    bytes: endExclusive - start,
    sha256: sourceBytes(start, endExclusive),
  },
]));

const skiploomFactory = sourceBlock(
  frontierSource,
  "[FRONTIER_MON_SKIPLOOM] =",
  "[FRONTIER_MON_LOMBRE] =",
);
const skiploomSpecies = sourceBlock(speciesInfo, "[SPECIES_SKIPLOOM]", "[SPECIES_JUMPLUFF]");
const sourceChecks: Record<string, boolean> = {
  exclusiveEvenPointerBody: address("Move_MEGA_DRAIN") === 0x082d10b2
    && address("MegaDrainAbsorbEffect") === 0x082d1121
    && address("Move_GIGA_DRAIN") === 0x082d1242
    && (address("Move_MEGA_DRAIN") & 1) === 0,
  rootCommands: sameJson(rootCommands, expectedRootCommands),
  pairedOrbCommands: sameJson(effectCommands, expectedEffectCommands)
    && (megaDrainEffect.match(/playsewithpan SE_M_BUBBLE3/g) ?? []).length === 8
    && (megaDrainEffect.match(/create_absorption_orb_sprite/g) ?? []).length === 16,
  healingTail: sameJson(healingCommands, expectedHealingCommands),
  generatedGraph: sameJson(megaComponents?.componentIds, expectedComponents),
  scriptsAndScheduler: animation.includes("static void Cmd_createvisualtask(void)")
    && animation.includes("taskFunc(taskId);")
    && animation.includes("gAnimVisualTaskCount++;")
    && animation.includes("static void Cmd_waitforvisualfinish(void)")
    && animation.includes("static void Cmd_playsewithpan(void)")
    && animation.includes("PlaySE12WithPanning(songId, BattleAnimAdjustPanning(pan));"),
  shakeTask: movement.includes("void AnimTask_ShakeMon(u8 taskId)")
    && movement.includes("gSprites[spriteId].y2 = gBattleAnimArgs[2];")
    && movement.includes("gTasks[taskId].func = AnimTask_ShakeMon_Step;")
    && movement.includes("gSprites[gTasks[taskId].data[0]].y2 = 0;")
    && movement.includes("DestroyAnimVisualTask(taskId);"),
  orbSprite: effects.includes("const struct SpriteTemplate gAbsorptionOrbSpriteTemplate")
    && effects.includes(".tileTag = ANIM_TAG_ORBS,")
    && effects.includes(".oam = &gOamData_AffineNormal_ObjBlend_16x16,")
    && effects.includes(".callback = AnimAbsorptionOrb,")
    && effects.includes("static void AnimAbsorptionOrb(struct Sprite *sprite)")
    && effects.includes("InitSpritePosToAnimTarget(sprite, TRUE);")
    && effects.includes("sprite->data[0] = cmd->wavePeriod;")
    && effects.includes("sprite->data[5] = cmd->waveAmplitude;")
    && effects.includes("InitAnimArcTranslation(sprite);")
    && effects.includes("TranslateAnimHorizontalArc(sprite)"),
  healingSprite: effects.includes("const struct SpriteTemplate gHealingBlueStarSpriteTemplate")
    && effects.includes(".tileTag = ANIM_TAG_BLUE_STAR,")
    && effects.includes(".oam = &gOamData_AffineOff_ObjNormal_32x32,")
    && effects.includes(".callback = AnimSpriteOnMonPos,"),
  paletteSprite: macros.includes("createsprite gSimplePaletteBlendSpriteTemplate")
    && normal.includes("const struct SpriteTemplate gSimplePaletteBlendSpriteTemplate")
    && normal.includes("static void AnimSimplePaletteBlend(struct Sprite *sprite)")
    && normal.includes("BeginNormalPaletteFade(selectedPalettes, cmd->delay, cmd->initialBlendY, cmd->targetBlendY, cmd->color);")
    && normal.includes("static void AnimSimplePaletteBlend_Step(struct Sprite *sprite)"),
  impactSprite: macros.includes("createsprite gBasicHitSplatSpriteTemplate")
    && normal.includes("const struct SpriteTemplate gBasicHitSplatSpriteTemplate")
    && normal.includes(".tileTag = ANIM_TAG_IMPACT,")
    && normal.includes(".oam = &gOamData_AffineNormal_ObjBlend_32x32,")
    && normal.includes(".callback = AnimHitSplatBasic,"),
  assets: [
    "gBattleAnimSpriteGfx_Orbs", "gBattleAnimSpriteGfx_BlueStar", "gBattleAnimSpriteGfx_Impact",
    "ANIM_TAG_ORBS", "ANIM_TAG_BLUE_STAR", "ANIM_TAG_IMPACT",
  ].every((token) => graphics.includes(token)),
  registerAndCleanup: animation.includes("static void Cmd_monbg(void)")
    && animation.includes("MoveBattlerSpriteToBG(battler, toBG_2, FALSE);")
    && animation.includes("static void Cmd_splitbgprio_foes(void)")
    && animation.includes("SetAnimBgAttribute(1, BG_ANIM_PRIORITY, 1);")
    && animation.includes("static void Cmd_setalpha(void)")
    && animation.includes("SetGpuReg(REG_OFFSET_BLDCNT, BLDCNT_EFFECT_BLEND | BLDCNT_TGT2_ALL);")
    && animation.includes("SetGpuReg(REG_OFFSET_BLDALPHA, half1 | half2);")
    && animation.includes("static void Cmd_clearmonbg(void)")
    && animation.includes("ResetBattleAnimBg(to_BG2);")
    && animation.includes("static void Cmd_blendoff(void)")
    && animation.includes("SetGpuReg(REG_OFFSET_BLDALPHA, 0);"),
  carrier: level50Carriers.length === 4
    && level50Carriers[0]?.index === 129
    && level50Carriers[0]?.label === "FRONTIER_MON_SKIPLOOM"
    && level50Carriers[0]?.species === "SPECIES_SKIPLOOM"
    && level50Carriers[0]?.nature === "NATURE_DOCILE"
    && sameJson(level50Carriers[0]?.moves, [
      "MOVE_MEGA_DRAIN", "MOVE_CONFUSION", "MOVE_COTTON_SPORE", "MOVE_SYNTHESIS",
    ])
    && [
      ".species = SPECIES_SKIPLOOM",
      ".moves = {MOVE_MEGA_DRAIN, MOVE_CONFUSION, MOVE_COTTON_SPORE, MOVE_SYNTHESIS}",
      ".itemTableId = BATTLE_FRONTIER_ITEM_PERSIM_BERRY",
      ".evSpread = F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP",
      ".nature = NATURE_DOCILE",
    ].every((token) => skiploomFactory.includes(token)),
  carrierSpecies: constants.SKIPLOOM === 188
    && constants.MEGA_DRAIN === 72
    && constants.DOCILE === 6
    && constants.PERSIM_BERRY === 140
    && [
      ".baseHP        = 55", ".baseAttack    = 45", ".baseDefense   = 50",
      ".baseSpeed     = 80", ".baseSpAttack  = 45", ".baseSpDefense = 65",
      ".types = { TYPE_GRASS, TYPE_FLYING }", ".abilities = {ABILITY_CHLOROPHYLL, ABILITY_NONE}",
    ].every((token) => skiploomSpecies.includes(token))
    && backPicTable.includes("SPECIES_SPRITE(SKIPLOOM, gMonBackPic_Skiploom)")
    && frontPicTable.includes("SPECIES_SPRITE(SKIPLOOM,      gMonStillFrontPic_Skiploom)")
    && pokemonGraphics.includes("gMonPalette_Skiploom[]"),
  staging: stagedScenarios.every((scenario) => scenario.valid),
};
const failed = Object.entries(sourceChecks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`MOVE_MEGA_DRAIN source/staging contract changed: ${failed.join(", ")}`);

console.log(JSON.stringify({
  move: "MOVE_MEGA_DRAIN",
  sourceBounds: {
    start: "0x082d10b2",
    endExclusive: "0x082d1121",
    evenPointerStart: "0x082d10b2",
    bytes: 111,
  },
  subroutineBounds: {
    MegaDrainAbsorbEffect: { start: "0x082d1121", endExclusive: "0x082d1242", bytes: 289 },
    HealingEffect: { start: "0x082d79df", endExclusive: "0x082d7a28", bytes: 73 },
  },
  sourceRom,
  rootCommands,
  orbPairs: MEGA_DRAIN_ORB_PAIRS,
  audio: {
    impact: "SE_M_ABSORB/SOUND_PAN_TARGET",
    perPair: "SE_M_BUBBLE3/SOUND_PAN_TARGET",
    perPairCount: 8,
    healing: "SE_M_ABSORB_2/SOUND_PAN_ATTACKER",
  },
  differencesFromAbsorb: {
    blend: { megaDrain: 8, absorb: 4 },
    impactAnimation: { megaDrain: 1, absorb: 2 },
    orbSchedule: { megaDrain: "8 pairs / 16 total", absorb: "8 sequential / 8 total" },
    orbAudio: { megaDrain: "SE_M_BUBBLE3", absorb: "SE_M_CRABHAMMER" },
    sharedOnlyBySourceIdentity: [
      "ANIM_TAG_ORBS", "ANIM_TAG_BLUE_STAR", "ANIM_TAG_IMPACT",
      "gAbsorptionOrbSpriteTemplate", "gHealingBlueStarSpriteTemplate",
      "HealingEffect", "AnimTask_ShakeMon", "monbg/splitbgprio_foes/setalpha/clearmonbg/blendoff",
    ],
  },
  components: expectedComponents,
  dependencies: {
    subroutines: ["MegaDrainAbsorbEffect", "HealingEffect"],
    tasks: ["AnimTask_ShakeMon"],
    sprites: [
      "gAbsorptionOrbSpriteTemplate", "gBasicHitSplatSpriteTemplate",
      "gHealingBlueStarSpriteTemplate", "gSimplePaletteBlendSpriteTemplate",
    ],
    assets: ["ANIM_TAG_ORBS", "ANIM_TAG_BLUE_STAR", "ANIM_TAG_IMPACT"],
    registers: ["monbg", "splitbgprio_foes", "setalpha(12,8)", "simple_palette_blend(F_PAL_BG, 0->8->0, RGB(13,31,12))"],
    cleanup: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"],
  },
  carrier: {
    lowestLevel50: level50Carriers[0],
    allLevel50: level50Carriers,
    stageConstants: constants,
  },
  stagedScenarios,
  controls: {
    MOVE_ABSORB: "exact control only; no latch, timeline, or acceptance inheritance",
    MOVE_DREAM_EATER: "source-audit control only; remains independently unsupported",
    MOVE_GIGA_DRAIN: "exact independent control; no latch, timeline, or acceptance inheritance",
  },
  latchRequirement: "No Absorb latch is inherited. Later-evidence hypotheses only: plain script-created sprite OAM/palette writes normally display RAM+1, AnimTask_ShakeMon normally displays RAM+1, and default visible events are one frame after RAM. After Scene-ON freshness is restored, measure every mechanism against Mega Drain's own bilateral banked change maps.",
}, null, 2));
