/**
 * Deterministic, source-only contract for MOVE_GIGA_DRAIN.
 *
 * This deliberately does not contact the oracle or consume a recording.  It
 * exists to keep the future Scene-ON evidence/reducer work tied to the pinned
 * ROM, script, legal Factory carrier, and complete mechanicLab staging.
 */
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
const fire = read("reference/pokeemerald/src/battle_anim_fire.c");
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
  entries: Array<{ index: number; label: string; species: string; moves: string[]; nature: string }>;
};
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync("arm-none-eabi-nm", [
  "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

const STAGE_PATHS = [
  "tools/battle-lab/mechanic-giga-drain-player-roselia-opponent-onix.json",
  "tools/battle-lab/mechanic-giga-drain-opponent-roselia-player-onix.json",
] as const;

// The source has eight literal three-orb groups, including amplitudes larger
// than Mega Drain's paired body. Keep the values here rather than deriving a
// visual program from a recording.
const GIGA_DRAIN_ORB_GROUPS = [
  [
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 5, y: -18, waveAmplitude: -40, wavePeriod: 35 },
    { x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 },
  ],
  [
    { x: 0, y: 5, waveAmplitude: 28, wavePeriod: 26 },
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
    { x: -10, y: 20, waveAmplitude: 40, wavePeriod: 39 },
  ],
  [
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
    { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 },
    { x: 10, y: -5, waveAmplitude: -32, wavePeriod: 26 },
  ],
  [
    { x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 },
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
  ],
  [
    { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 },
    { x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 },
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
  ],
  [
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 },
    { x: 10, y: -5, waveAmplitude: -40, wavePeriod: 26 },
  ],
  [
    { x: -5, y: 15, waveAmplitude: 36, wavePeriod: 33 },
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
    { x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 },
  ],
  [
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 },
  ],
] as const satisfies readonly (readonly Orb[])[];

const expectedRootCommands = [
  "loadspritegfx ANIM_TAG_ORBS",
  "loadspritegfx ANIM_TAG_BLUE_STAR",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_DEF_PARTNER",
  "splitbgprio_foes ANIM_TARGET",
  "setalpha 12, 8",
  "simple_palette_blend selector=F_PAL_BG, delay=1, initial_blend_y=0, target_blend_y=12, color=RGB(13, 31, 12)",
  "waitforvisualfinish",
  "playsewithpan SE_M_ABSORB, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=0",
  "delay 2",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 5, 5, 1",
  "waitforvisualfinish",
  "delay 3",
  "call GigaDrainAbsorbEffect",
  "waitforvisualfinish",
  "delay 15",
  "call HealingEffect",
  "waitforvisualfinish",
  "simple_palette_blend selector=F_PAL_BG, delay=1, initial_blend_y=12, target_blend_y=0, color=RGB(13, 31, 12)",
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
  "subroutine:GigaDrainAbsorbEffect",
  "subroutine:HealingEffect",
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
const sameJson = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function scriptBlock(start: string, end: string): string {
  const from = scripts.indexOf(`${start}:`);
  const to = scripts.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing script block ${start}/${end}`);
  return scripts.slice(from, to);
}

function commandLines(block: string): string[] {
  return block.split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
}

function sourceBlock(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`missing source block ${start}/${end}`);
  return source.slice(from, to);
}

function orbCommand(orb: Orb): string {
  return "create_absorption_orb_sprite ANIM_ATTACKER, 3, "
    + `x=${orb.x}, y=${orb.y}, wave_amplitude=${orb.waveAmplitude}, wave_period=${orb.wavePeriod}`;
}

const move = scriptBlock("Move_GIGA_DRAIN", "GigaDrainAbsorbEffect");
const gigaDrainEffect = scriptBlock("GigaDrainAbsorbEffect", "Move_LEECH_LIFE");
const healingEffect = scriptBlock("HealingEffect", "HealingEffect2");
const rootCommands = commandLines(move);
const effectCommands = commandLines(gigaDrainEffect);
const healingCommands = commandLines(healingEffect);
const expectedEffectCommands = [
  ...GIGA_DRAIN_ORB_GROUPS.flatMap((group) => [
    "playsewithpan SE_M_GIGA_DRAIN, SOUND_PAN_TARGET",
    ...group.map(orbCommand),
    "delay 4",
  ]),
  "return",
];
const gigaComponents = graph.moves.find((entry) => entry.move === "MOVE_GIGA_DRAIN");
const level50Carriers = frontierMons.entries.filter((entry) =>
  entry.index >= inventory.tiers.level50.monIndices.first
  && entry.index <= inventory.tiers.level50.monIndices.last
  && entry.moves.includes("MOVE_GIGA_DRAIN"),
);
const constants = {
  ROSELIA: numericConstant(speciesConstants, "SPECIES_ROSELIA"),
  ONIX: numericConstant(speciesConstants, "SPECIES_ONIX"),
  GIGA_DRAIN: numericConstant(moveConstants, "MOVE_GIGA_DRAIN"),
  TACKLE: numericConstant(moveConstants, "MOVE_TACKLE"),
  DOCILE: numericConstant(natureConstants, "NATURE_DOCILE"),
  QUICK_CLAW: numericConstant(itemConstants, "ITEM_QUICK_CLAW"),
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

function isRoseliaStage(mon: StageMon): boolean {
  return mon.species === constants.ROSELIA
    && mon.level === 50
    && mon.nature === constants.DOCILE
    && mon.item === constants.QUICK_CLAW
    && mon.abilitySlot === 0
    && sameJson(mon.moves, Array(4).fill(constants.GIGA_DRAIN))
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
  const attackerSide = path.includes("player-roselia") ? "player" : "opponent";
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
    && attackerParty.every((mon) => isCompleteRecord(mon) && isRoseliaStage(mon))
    && defenderParty.every((mon) => isCompleteRecord(mon) && isOnixStage(mon))
    && level50Ids.every((id) => id >= inventory.tiers.level50.monIndices.first
      && id <= inventory.tiers.level50.monIndices.last);
  return {
    path,
    orientation: attackerSide === "player" ? "player-back" : "opponent-front",
    attacker: "ROSELIA",
    defender: "ONIX",
    sha256: sha256(bytes),
    valid,
  };
});

const sourceRanges = {
  moveBody: [address("Move_GIGA_DRAIN"), address("GigaDrainAbsorbEffect")],
  gigaDrainAbsorbEffect: [address("GigaDrainAbsorbEffect"), address("Move_LEECH_LIFE")],
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

const roseliaFactory = sourceBlock(
  frontierSource,
  "[FRONTIER_MON_ROSELIA_2] =",
  "[FRONTIER_MON_VOLBEAT_2] =",
);
const roseliaSpecies = sourceBlock(speciesInfo, "[SPECIES_ROSELIA]", "[SPECIES_SLAKOTH]");
const fireSpreadEffect = scriptBlock("FireSpreadEffect", "Move_LEER");
const sourceChecks: Record<string, boolean> = {
  exclusiveEvenPointerBody: address("Move_GIGA_DRAIN") === 0x082d1242
    && address("GigaDrainAbsorbEffect") === 0x082d12b1
    && address("Move_LEECH_LIFE") === 0x082d144a
    && (address("Move_GIGA_DRAIN") & 1) === 0,
  rootCommands: sameJson(rootCommands, expectedRootCommands),
  variableAmplitudeOrbs: sameJson(effectCommands, expectedEffectCommands)
    && GIGA_DRAIN_ORB_GROUPS.length === 8
    && GIGA_DRAIN_ORB_GROUPS.flat().length === 24
    && new Set(GIGA_DRAIN_ORB_GROUPS.flat().map((orb) => orb.waveAmplitude)).size > 4
    && (gigaDrainEffect.match(/playsewithpan SE_M_GIGA_DRAIN/g) ?? []).length === 8
    && (gigaDrainEffect.match(/create_absorption_orb_sprite/g) ?? []).length === 24,
  healingTail: sameJson(healingCommands, expectedHealingCommands),
  generatedGraph: sameJson(gigaComponents?.componentIds, expectedComponents),
  // The old coverage wording claimed three FireSpread sprites. The pinned
  // Giga Drain interval has zero; FireSpreadEffect itself owns seven.
  fireSpreadCorrection: !gigaDrainEffect.includes("gFireSpreadSpriteTemplate")
    && !move.includes("gFireSpreadSpriteTemplate")
    && !gigaComponents?.componentIds.includes("sprite:gFireSpreadSpriteTemplate")
    && (fireSpreadEffect.match(/createsprite gFireSpreadSpriteTemplate/g) ?? []).length === 7
    && fire.includes("const struct SpriteTemplate gFireSpreadSpriteTemplate"),
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
    && effects.includes("sprite->data[0] = cmd->wavePeriod;")
    && effects.includes("sprite->data[5] = cmd->waveAmplitude;")
    && effects.includes("TranslateAnimHorizontalArc(sprite)"),
  healingSprite: effects.includes("const struct SpriteTemplate gHealingBlueStarSpriteTemplate")
    && effects.includes(".tileTag = ANIM_TAG_BLUE_STAR,")
    && effects.includes(".oam = &gOamData_AffineOff_ObjNormal_32x32,")
    && effects.includes(".callback = AnimSpriteOnMonPos,"),
  paletteAndImpactSprites: macros.includes("createsprite gSimplePaletteBlendSpriteTemplate")
    && normal.includes("const struct SpriteTemplate gSimplePaletteBlendSpriteTemplate")
    && normal.includes("BeginNormalPaletteFade(selectedPalettes, cmd->delay, cmd->initialBlendY, cmd->targetBlendY, cmd->color);")
    && macros.includes("createsprite gBasicHitSplatSpriteTemplate")
    && normal.includes("const struct SpriteTemplate gBasicHitSplatSpriteTemplate")
    && normal.includes(".tileTag = ANIM_TAG_IMPACT,"),
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
  carrier: level50Carriers[0]?.index === 276
    && level50Carriers[0]?.label === "FRONTIER_MON_ROSELIA_2"
    && level50Carriers[0]?.species === "SPECIES_ROSELIA"
    && level50Carriers[0]?.nature === "NATURE_DOCILE"
    && sameJson(level50Carriers[0]?.moves, [
      "MOVE_GIGA_DRAIN", "MOVE_SLUDGE_BOMB", "MOVE_GRASS_WHISTLE", "MOVE_SYNTHESIS",
    ])
    && [
      ".species = SPECIES_ROSELIA",
      ".moves = {MOVE_GIGA_DRAIN, MOVE_SLUDGE_BOMB, MOVE_GRASS_WHISTLE, MOVE_SYNTHESIS}",
      ".itemTableId = BATTLE_FRONTIER_ITEM_QUICK_CLAW",
      ".evSpread = F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP",
      ".nature = NATURE_DOCILE",
    ].every((token) => roseliaFactory.includes(token)),
  carrierSpecies: constants.ROSELIA === 363
    && constants.GIGA_DRAIN === 202
    && constants.DOCILE === 6
    && constants.QUICK_CLAW === 183
    && [
      ".baseHP        = 50", ".baseAttack    = 60", ".baseDefense   = 45",
      ".baseSpeed     = 65", ".baseSpAttack  = 100", ".baseSpDefense = 80",
      ".types = { TYPE_GRASS, TYPE_POISON }", ".abilities = {ABILITY_NATURAL_CURE, ABILITY_POISON_POINT}",
    ].every((token) => roseliaSpecies.includes(token))
    && backPicTable.includes("SPECIES_SPRITE(ROSELIA, gMonBackPic_Roselia)")
    && frontPicTable.includes("SPECIES_SPRITE(ROSELIA,       gMonStillFrontPic_Roselia)")
    && pokemonGraphics.includes("gMonPalette_Roselia[]"),
  staging: stagedScenarios.every((scenario) => scenario.valid),
};

const failed = Object.entries(sourceChecks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`MOVE_GIGA_DRAIN source/staging contract changed: ${failed.join(", ")}`);

console.log(JSON.stringify({
  move: "MOVE_GIGA_DRAIN",
  sourceBounds: {
    start: "0x082d1242",
    endExclusive: "0x082d12b1",
    evenPointerStart: "0x082d1242",
    bytes: 111,
    through: "cleanup end before GigaDrainAbsorbEffect",
  },
  subroutineBounds: {
    GigaDrainAbsorbEffect: { start: "0x082d12b1", endExclusive: "0x082d144a", bytes: 409 },
    HealingEffect: { start: "0x082d79df", endExclusive: "0x082d7a28", bytes: 73 },
  },
  sourceRom,
  rootCommands,
  orbGroups: GIGA_DRAIN_ORB_GROUPS,
  audio: {
    impact: "SE_M_ABSORB/SOUND_PAN_TARGET",
    perGroup: "SE_M_GIGA_DRAIN/SOUND_PAN_TARGET",
    perGroupCount: 8,
    absorptionOrbCount: 24,
    healing: "SE_M_ABSORB_2/SOUND_PAN_ATTACKER",
  },
  fireSpread: {
    gigaDrainSpriteCommands: 0,
    generatedGraphComponent: false,
    sourceOwner: "FireSpreadEffect",
    sourceOwnerCommandCount: 7,
    correction: "Giga Drain has no FireSpread sprites; the previous three-sprite wording was not source-backed.",
  },
  differencesFromControls: {
    blend: { gigaDrain: 12, absorb: 4, megaDrain: 8 },
    impactAnimation: { gigaDrain: 0, absorb: 2, megaDrain: 1 },
    orbSchedule: { gigaDrain: "8 groups / 24 total", absorb: "8 sequential / 8 total", megaDrain: "8 pairs / 16 total" },
    orbAudio: { gigaDrain: "SE_M_GIGA_DRAIN", absorb: "SE_M_CRABHAMMER", megaDrain: "SE_M_BUBBLE3" },
    fireSpread: { gigaDrain: 0, absorb: 0, megaDrain: 0 },
  },
  components: expectedComponents,
  dependencies: {
    subroutines: ["GigaDrainAbsorbEffect", "HealingEffect"],
    tasks: ["AnimTask_ShakeMon"],
    sprites: [
      "gAbsorptionOrbSpriteTemplate", "gBasicHitSplatSpriteTemplate",
      "gHealingBlueStarSpriteTemplate", "gSimplePaletteBlendSpriteTemplate",
    ],
    assets: ["ANIM_TAG_ORBS", "ANIM_TAG_BLUE_STAR", "ANIM_TAG_IMPACT"],
    cleanup: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"],
  },
  carrier: {
    lowestLevel50: level50Carriers[0],
    allLevel50: level50Carriers,
    stageConstants: constants,
  },
  staging: stagedScenarios,
  controls: {
    MOVE_ABSORB: "exact control only; no latch, timeline, or acceptance inheritance",
    MOVE_MEGA_DRAIN: "exact control only; no latch, timeline, or acceptance inheritance",
    MOVE_GIGA_DRAIN: "source/staging checkpoint only; remains independently unsupported",
  },
  latchRequirement: "No Absorb or Mega Drain latch is inherited. No dynamic evidence, reducer, seam, compositor, or coverage credit is claimed by this source-only checkpoint.",
}));
