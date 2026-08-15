/**
 * Deterministic, source-only contract for MOVE_DREAM_EATER.
 *
 * This is deliberately a staging checkpoint, not an oracle receipt: it reads
 * the pinned source/ROM and validates complete mechanicLab requests without
 * running a capture, reducer, presentation seam, or compositor.
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

type TraceSegment = Readonly<{ frames: number; buttons: string[] }>;

type Stage = Readonly<{
  mode: string;
  profile: string;
  level: number;
  challengeNum: number;
  battleNum: number;
  trainerId: number;
  playerSetIds: number[];
  opponentSetIds: number[];
  seed: number;
  overrides: Readonly<{ parties: Readonly<{ player: StageMon[]; opponent: StageMon[] }> }>;
  trace: Readonly<{ segments: TraceSegment[]; captureFrames?: unknown }>;
}>;

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const animation = read("reference/pokeemerald/src/battle_anim.c");
const battleCommands = read("reference/pokeemerald/src/battle_script_commands.c");
const graphics = read("reference/pokeemerald/src/data/battle_anim.h");
const moveData = read("reference/pokeemerald/src/data/battle_moves.h");
const factorySource = read("reference/pokeemerald/src/battle_factory.c");
const frontierSource = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const speciesInfo = read("reference/pokeemerald/src/data/pokemon/species_info.h");
const speciesConstants = read("reference/pokeemerald/include/constants/species.h");
const moveConstants = read("reference/pokeemerald/include/constants/moves.h");
const natureConstants = read("reference/pokeemerald/include/constants/pokemon.h");
const itemConstants = read("reference/pokeemerald/include/constants/items.h");
const frontierMonConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as {
  moves: Array<{ move: string; componentIds: string[] }>;
};
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json")) as {
  tiers: { level50: { monIndices: { first: number; last: number } } };
};
const factoryPolicy = JSON.parse(read("src/data/gen/factory-round-policy.json")) as {
  rentalSelection: {
    ranges: { level50: Array<{ start: number; end: number; startLabel: string; endLabel: string }> };
  };
};
const frontierMons = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as {
  entries: Array<{ index: number; label: string; species: string; moves: string[]; nature: string }>;
};
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync("arm-none-eabi-nm", [
  "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

const STAGE_PATHS = [
  "tools/battle-lab/mechanic-dream-eater-player-wigglytuff-opponent-onix.json",
  "tools/battle-lab/mechanic-dream-eater-opponent-wigglytuff-player-onix.json",
] as const;

const CHALLENGE_2_RANGE = {
  challengeNum: 2,
  start: 267,
  end: 371,
  startLabel: "FRONTIER_MON_DELCATTY_2",
  endLabel: "FRONTIER_MON_CLOYSTER_2",
} as const;
const WIGGLYTUFF_SIDE_SET_IDS = [312, 313, 314] as const;
const ONIX_SIDE_SET_IDS = [267, 268, 269] as const;
const LEGAL_STAGE_INVENTORY = [
  { index: 267, label: "FRONTIER_MON_DELCATTY_2" },
  { index: 268, label: "FRONTIER_MON_SABLEYE_2" },
  { index: 269, label: "FRONTIER_MON_LICKITUNG_2" },
  { index: 312, label: "FRONTIER_MON_WIGGLYTUFF_2" },
  { index: 313, label: "FRONTIER_MON_SUNFLORA_2" },
  { index: 314, label: "FRONTIER_MON_CHIMECHO_2" },
] as const;

// This is DreamEaterAbsorb's source-owned Swagger cadence, not a capture
// transcription. Each group has its own source sound restart and three arcs.
const DREAM_EATER_ORB_GROUPS = [
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
  "monbg ANIM_DEF_PARTNER",
  "splitbgprio_foes ANIM_TARGET",
  "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER",
  "call SetPsychicBackground",
  "setalpha 8, 8",
  "playsewithpan SE_M_MINIMIZE, SOUND_PAN_TARGET",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 15, 1",
  "createvisualtask AnimTask_ScaleMonAndRestore, 5, -6, -6, 15, ANIM_TARGET, 1",
  "waitforvisualfinish",
  "setalpha 12, 8",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 2, 25, 1",
  "call DreamEaterAbsorb",
  "waitforvisualfinish",
  "delay 15",
  "call HealingEffect",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
  "delay 1",
  "call UnsetPsychicBackground",
  "end",
] as const;

const expectedSetPsychicCommands = [
  "fadetobg BG_PSYCHIC",
  "waitbgfadeout",
  "createvisualtask AnimTask_SetPsychicBackground, 5",
  "waitbgfadein",
  "return",
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

const expectedUnsetPsychicCommands = [
  "restorebg",
  "waitbgfadeout",
  "setarg 7, 0xFFFF",
  "waitbgfadein",
  "return",
] as const;

const expectedComponents = [
  "asset:ANIM_TAG_BLUE_STAR",
  "asset:ANIM_TAG_ORBS",
  "sprite:gHealingBlueStarSpriteTemplate",
  "subroutine:DreamEaterAbsorb",
  "subroutine:HealingEffect",
  "subroutine:SetPsychicBackground",
  "subroutine:UnsetPsychicBackground",
  "task:AnimTask_ScaleMonAndRestore",
  "task:AnimTask_SetPsychicBackground",
  "task:AnimTask_ShakeMon",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:create_absorption_orb_sprite",
  "visualCommand:fadetobg",
  "visualCommand:monbg",
  "visualCommand:restorebg",
  "visualCommand:setalpha",
  "visualCommand:setarg",
  "visualCommand:splitbgprio_foes",
  "visualCommand:waitbgfadein",
  "visualCommand:waitbgfadeout",
] as const;

const expectedBattleScriptCommands = [
  "attackcanceler",
  "jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_DreamEaterNoEffect",
  "jumpifstatus BS_TARGET, STATUS1_SLEEP, BattleScript_DreamEaterWorked",
  "attackstring",
  "ppreduce",
  "waitmessage B_WAIT_TIME_LONG",
  "goto BattleScript_WasntAffected",
  "accuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE",
  "attackstring",
  "ppreduce",
  "critcalc",
  "damagecalc",
  "typecalc",
  "adjustnormaldamage",
  "attackanimation",
  "waitanimation",
  "effectivenesssound",
  "hitanimation BS_TARGET",
  "waitstate",
  "healthbarupdate BS_TARGET",
  "datahpupdate BS_TARGET",
  "critmessage",
  "waitmessage B_WAIT_TIME_LONG",
  "resultmessage",
  "waitmessage B_WAIT_TIME_LONG",
  "negativedamage",
  "orword gHitMarker, HITMARKER_IGNORE_SUBSTITUTE",
  "healthbarupdate BS_ATTACKER",
  "datahpupdate BS_ATTACKER",
  "jumpifmovehadnoeffect BattleScript_DreamEaterTryFaintEnd",
  "printstring STRINGID_PKMNDREAMEATEN",
  "waitmessage B_WAIT_TIME_LONG",
  "tryfaintmon BS_TARGET",
  "goto BattleScript_MoveEnd",
] as const;

const playerWigglytuffActions = [
  { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["RIGHT"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["LEFT"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["DOWN"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 1200, buttons: [] },
] as const;

const opponentWigglytuffActions = [
  { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 1200, buttons: [] },
] as const;

type SymbolInfo = Readonly<{ address: number; type: string }>;

const symbol = (name: string): SymbolInfo => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+(\\w)\\s+${name}$`, "m"));
  if (!match) throw new Error(`missing symbol ${name}`);
  return Object.freeze({ address: Number.parseInt(match[1]!, 16), type: match[2]! });
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

const rootScript = scriptBlock("Move_DREAM_EATER", "DreamEaterAbsorb");
const absorbScript = scriptBlock("DreamEaterAbsorb", "Move_POISON_GAS");
const healingScript = scriptBlock("HealingEffect", "HealingEffect2");
const setPsychicScript = scriptBlock("SetPsychicBackground", "UnsetPsychicBackground");
const unsetPsychicScript = scriptBlock("UnsetPsychicBackground", "SetSkyBg");
const rootCommands = commandLines(rootScript);
const absorbCommands = commandLines(absorbScript);
const healingCommands = commandLines(healingScript);
const setPsychicCommands = commandLines(setPsychicScript);
const unsetPsychicCommands = commandLines(unsetPsychicScript);
const expectedAbsorbCommands = [
  ...DREAM_EATER_ORB_GROUPS.flatMap((group) => [
    "playsewithpan SE_M_SWAGGER, SOUND_PAN_TARGET",
    ...group.map(orbCommand),
    "delay 4",
  ]),
  "return",
];
const battleDreamEaterScript = sourceBlock(
  battleScripts,
  "BattleScript_EffectDreamEater::",
  "BattleScript_EffectMirrorMove::",
);
const battleDreamEaterCommands = battleDreamEaterScript.split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !/^[A-Za-z0-9_]+::?$/.test(line));
const dreamEaterComponents = graph.moves.find((entry) => entry.move === "MOVE_DREAM_EATER");
const level50Carriers = frontierMons.entries.filter((entry) =>
  entry.index >= inventory.tiers.level50.monIndices.first
  && entry.index <= inventory.tiers.level50.monIndices.last
  && entry.moves.includes("MOVE_DREAM_EATER"),
);
const constants = {
  WIGGLYTUFF: numericConstant(speciesConstants, "SPECIES_WIGGLYTUFF"),
  ONIX: numericConstant(speciesConstants, "SPECIES_ONIX"),
  DREAM_EATER: numericConstant(moveConstants, "MOVE_DREAM_EATER"),
  SING: numericConstant(moveConstants, "MOVE_SING"),
  FAKE_TEARS: numericConstant(moveConstants, "MOVE_FAKE_TEARS"),
  BRICK_BREAK: numericConstant(moveConstants, "MOVE_BRICK_BREAK"),
  TACKLE: numericConstant(moveConstants, "MOVE_TACKLE"),
  DOCILE: numericConstant(natureConstants, "NATURE_DOCILE"),
  SITRUS_BERRY: numericConstant(itemConstants, "ITEM_SITRUS_BERRY"),
  NONE: numericConstant(itemConstants, "ITEM_NONE"),
  DELCATTY_2: numericConstant(frontierMonConstants, "FRONTIER_MON_DELCATTY_2"),
  CLOYSTER_2: numericConstant(frontierMonConstants, "FRONTIER_MON_CLOYSTER_2"),
  WIGGLYTUFF_2: numericConstant(frontierMonConstants, "FRONTIER_MON_WIGGLYTUFF_2"),
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

function isWigglytuffStage(mon: StageMon, constrainedForStockAi: boolean): boolean {
  return mon.species === constants.WIGGLYTUFF
    && mon.level === 50
    && mon.nature === constants.DOCILE
    && mon.item === constants.SITRUS_BERRY
    && mon.abilitySlot === 0
    && mon.friendship === 0
    && sameJson(mon.moves, constrainedForStockAi
      ? [constants.SING, constants.SING, constants.DREAM_EATER, constants.DREAM_EATER]
      : [constants.FAKE_TEARS, constants.SING, constants.DREAM_EATER, constants.BRICK_BREAK])
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
  const playerAttacker = path.includes("player-wigglytuff");
  const attackerParty = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
  const defenderParty = playerAttacker ? stage.overrides.parties.opponent : stage.overrides.parties.player;
  const level50Ids = [...stage.playerSetIds, ...stage.opponentSetIds];
  const expectedPlayerSetIds = playerAttacker ? WIGGLYTUFF_SIDE_SET_IDS : ONIX_SIDE_SET_IDS;
  const expectedOpponentSetIds = playerAttacker ? ONIX_SIDE_SET_IDS : WIGGLYTUFF_SIDE_SET_IDS;
  const expectedSegments = playerAttacker ? playerWigglytuffActions : opponentWigglytuffActions;
  const valid = stage.mode === "mechanicLab"
    && stage.profile === "battle-scene-on"
    && stage.level === 50
    && stage.challengeNum === CHALLENGE_2_RANGE.challengeNum
    && stage.battleNum === 2
    && stage.trainerId === 110
    && stage.seed === (playerAttacker ? 305419897 : 305419899)
    && Object.keys(stage.overrides).length === 1
    && Object.keys(stage.overrides)[0] === "parties"
    && forbiddenTransientKeys.every((key) => !(key in stage.overrides))
    && !("captureFrames" in stage.trace)
    && attackerParty.length === 3
    && defenderParty.length === 3
    && attackerParty.every((mon) => isCompleteRecord(mon) && isWigglytuffStage(mon, !playerAttacker))
    && defenderParty.every((mon) => isCompleteRecord(mon) && isOnixStage(mon))
    && sameJson(stage.trace.segments, expectedSegments)
    && sameJson(stage.playerSetIds, expectedPlayerSetIds)
    && sameJson(stage.opponentSetIds, expectedOpponentSetIds)
    && level50Ids.every((id) => LEGAL_STAGE_INVENTORY.some((entry) => entry.index === id));
  return {
    path,
    orientation: playerAttacker ? "player-back" : "opponent-front",
    attacker: "WIGGLYTUFF",
    defender: "ONIX",
    sha256: sha256(bytes),
    valid,
    realInputRoute: playerAttacker
      ? "player selects source slot 1 SING, waits for the ROM to apply sleep, then selects source slot 2 DREAM_EATER"
      : "player submits ordinary TACKLE choices while stock Factory AI chooses among duplicated source-set SING/DREAM_EATER slots; no opponent decision or status is injected",
  };
});

const sourceRanges = {
  moveBody: [symbol("Move_DREAM_EATER").address, symbol("DreamEaterAbsorb").address],
  dreamEaterAbsorb: [symbol("DreamEaterAbsorb").address, symbol("Move_POISON_GAS").address],
  healingEffect: [symbol("HealingEffect").address, symbol("HealingEffect2").address],
  setPsychicBackground: [symbol("SetPsychicBackground").address, symbol("UnsetPsychicBackground").address],
  unsetPsychicBackground: [symbol("UnsetPsychicBackground").address, symbol("SetSkyBg").address],
  shakeMon: [symbol("AnimTask_ShakeMon").address, symbol("AnimTask_ShakeMon2").address],
  absorptionOrb: [symbol("AnimAbsorptionOrb").address, symbol("AnimHyperBeamOrb").address],
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

const wigglytuffFactory = sourceBlock(
  frontierSource,
  "[FRONTIER_MON_WIGGLYTUFF_2] =",
  "[FRONTIER_MON_SUNFLORA_2] =",
);
const wigglytuffSpecies = sourceBlock(speciesInfo, "[SPECIES_WIGGLYTUFF] =", "[SPECIES_ZUBAT] =");
const dreamEaterMoveData = sourceBlock(moveData, "[MOVE_DREAM_EATER] =", "[MOVE_POISON_GAS] =");
const singMoveData = sourceBlock(moveData, "[MOVE_SING] =", "[MOVE_SUPERSONIC] =");
const movePointer = symbol("Move_DREAM_EATER");
const absorbPointer = symbol("DreamEaterAbsorb");
const poisonGasPointer = symbol("Move_POISON_GAS");

const sourceChecks: Record<string, boolean> = {
  // Script labels are bytecode data, not Thumb functions. Dream Eater starts
  // at the genuinely odd raw data address; future pointer tests must use it
  // unchanged and compare it against the next source label exclusively.
  oddDataPointerBounds: movePointer.address === 0x082d2de7
    && movePointer.type === "d"
    && absorbPointer.address === 0x082d2e51
    && poisonGasPointer.address === 0x082d2fea
    && (movePointer.address & 1) === 1,
  rootCommands: sameJson(rootCommands, expectedRootCommands),
  fiveScriptStructure: sameJson(setPsychicCommands, expectedSetPsychicCommands)
    && sameJson(absorbCommands, expectedAbsorbCommands)
    && sameJson(healingCommands, expectedHealingCommands)
    && sameJson(unsetPsychicCommands, expectedUnsetPsychicCommands),
  swaggerOrbBody: DREAM_EATER_ORB_GROUPS.length === 8
    && DREAM_EATER_ORB_GROUPS.flat().length === 24
    && (absorbScript.match(/playsewithpan SE_M_SWAGGER, SOUND_PAN_TARGET/g) ?? []).length === 8
    && (absorbScript.match(/create_absorption_orb_sprite/g) ?? []).length === 24,
  sleepPreconditionAndEffect: sameJson(battleDreamEaterCommands, expectedBattleScriptCommands)
    && dreamEaterMoveData.includes(".effect = EFFECT_DREAM_EATER,")
    && dreamEaterMoveData.includes(".accuracy = 100,")
    && singMoveData.includes(".effect = EFFECT_SLEEP,")
    && singMoveData.includes(".accuracy = 55,")
    && battleCommands.includes("gBattleMons[gEffectBattler].status1 |= STATUS1_SLEEP_TURN((Random() & 3) + 2);"),
  generatedGraph: sameJson(dreamEaterComponents?.componentIds, expectedComponents),
  noImpactAsset: !rootCommands.some((command) => command.includes("ANIM_TAG_IMPACT"))
    && !dreamEaterComponents?.componentIds.includes("asset:ANIM_TAG_IMPACT"),
  schedulerAndTasks: animation.includes("static void Cmd_createvisualtask(void)")
    && animation.includes("taskFunc(taskId);")
    && animation.includes("gAnimVisualTaskCount++;")
    && animation.includes("static void Cmd_waitforvisualfinish(void)")
    && movement.includes("void AnimTask_ShakeMon(u8 taskId)")
    && movement.includes("gSprites[spriteId].y2 = gBattleAnimArgs[2];")
    && movement.includes("void AnimTask_ScaleMonAndRestore(u8 taskId)")
    && movement.includes("SetSpriteRotScale(spriteId, gTasks[taskId].data[10], gTasks[taskId].data[11], 0);")
    && movement.includes("ResetSpriteRotScale(spriteId);")
    && effects3.includes("void AnimTask_SetPsychicBackground(u8 taskId)")
    && effects3.includes("if ((u16)gBattleAnimArgs[7] == 0xFFFF)"),
  spritesAndAssets: effects.includes("const struct SpriteTemplate gAbsorptionOrbSpriteTemplate")
    && effects.includes(".tileTag = ANIM_TAG_ORBS,")
    && effects.includes(".callback = AnimAbsorptionOrb,")
    && effects.includes("sprite->data[0] = cmd->wavePeriod;")
    && effects.includes("sprite->data[5] = cmd->waveAmplitude;")
    && effects.includes("TranslateAnimHorizontalArc(sprite)")
    && effects.includes("const struct SpriteTemplate gHealingBlueStarSpriteTemplate")
    && effects.includes(".tileTag = ANIM_TAG_BLUE_STAR,")
    && effects.includes(".callback = AnimSpriteOnMonPos,")
    && ["gBattleAnimSpriteGfx_Orbs", "gBattleAnimSpriteGfx_BlueStar", "ANIM_TAG_ORBS", "ANIM_TAG_BLUE_STAR"]
      .every((token) => graphics.includes(token)),
  backgroundsAndCleanup: animation.includes("static void Cmd_monbg(void)")
    && animation.includes("MoveBattlerSpriteToBG(battler, toBG_2, FALSE);")
    && animation.includes("static void Cmd_splitbgprio_foes(void)")
    && animation.includes("SetAnimBgAttribute(1, BG_ANIM_PRIORITY, 1);")
    && animation.includes("static void Cmd_setalpha(void)")
    && animation.includes("SetGpuReg(REG_OFFSET_BLDCNT, BLDCNT_EFFECT_BLEND | BLDCNT_TGT2_ALL);")
    && animation.includes("static void Cmd_fadetobg(void)")
    && animation.includes("static void Cmd_restorebg(void)")
    && animation.includes("static void Cmd_waitbgfadeout(void)")
    && animation.includes("static void Cmd_waitbgfadein(void)")
    && animation.includes("static void Cmd_clearmonbg(void)")
    && animation.includes("static void Cmd_blendoff(void)"),
  lowestLegalCarrier: constants.WIGGLYTUFF_2 === 312
    && level50Carriers[0]?.index === 312
    && level50Carriers[0]?.label === "FRONTIER_MON_WIGGLYTUFF_2"
    && level50Carriers[0]?.species === "SPECIES_WIGGLYTUFF"
    && level50Carriers[0]?.nature === "NATURE_DOCILE"
    && sameJson(level50Carriers[0]?.moves, ["MOVE_FAKE_TEARS", "MOVE_SING", "MOVE_DREAM_EATER", "MOVE_BRICK_BREAK"])
    && [
      ".species = SPECIES_WIGGLYTUFF",
      ".moves = {MOVE_FAKE_TEARS, MOVE_SING, MOVE_DREAM_EATER, MOVE_BRICK_BREAK}",
      ".itemTableId = BATTLE_FRONTIER_ITEM_SITRUS_BERRY",
      ".evSpread = F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE",
      ".nature = NATURE_DOCILE",
    ].every((token) => wigglytuffFactory.includes(token))
    && constants.WIGGLYTUFF === 40
    && constants.DREAM_EATER === 138
    && constants.SING === 47
    && constants.SITRUS_BERRY === 142
    && [
      ".baseHP        = 140", ".baseAttack    = 70", ".baseDefense   = 45",
      ".baseSpeed     = 45", ".baseSpAttack  = 75", ".baseSpDefense = 50",
      ".types = { TYPE_NORMAL, TYPE_NORMAL }",
    ].every((token) => wigglytuffSpecies.includes(token)),
  challenge2LegalSelection: sameJson(factoryPolicy.rentalSelection.ranges.level50[2], {
    start: CHALLENGE_2_RANGE.start,
    end: CHALLENGE_2_RANGE.end,
    startLabel: CHALLENGE_2_RANGE.startLabel,
    endLabel: CHALLENGE_2_RANGE.endLabel,
  })
    && constants.DELCATTY_2 === CHALLENGE_2_RANGE.start
    && constants.CLOYSTER_2 === CHALLENGE_2_RANGE.end
    && factorySource.includes(
      "{FRONTIER_MON_DELCATTY_2, FRONTIER_MON_CLOYSTER_2}, // 267 - 371",
    )
    && LEGAL_STAGE_INVENTORY.every(({ index, label }) => {
      const generated = frontierMons.entries[index];
      return generated?.index === index
        && generated.label === label
        && numericConstant(frontierMonConstants, label) === index
        && frontierSource.includes(`[${label}] =`);
    }),
  staging: stagedScenarios.every((scenario) => scenario.valid),
};

const failed = Object.entries(sourceChecks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`MOVE_DREAM_EATER source/staging contract changed: ${failed.join(", ")}`);

console.log(JSON.stringify({
  move: "MOVE_DREAM_EATER",
  status: "unsupported",
  sourceBounds: {
    start: "0x082d2de7",
    endExclusive: "0x082d2e51",
    bytes: 106,
    rawSymbolType: movePointer.type,
    pointerRule: "raw bytecode data pointer; odd address is exact and must not be even-normalized",
  },
  subroutineBounds: {
    DreamEaterAbsorb: { start: "0x082d2e51", endExclusive: "0x082d2fea", bytes: 409 },
    HealingEffect: { start: "0x082d79df", endExclusive: "0x082d7a28", bytes: 73 },
    SetPsychicBackground: { start: "0x082d7cd1", endExclusive: "0x082d7cdd", bytes: 12 },
    UnsetPsychicBackground: { start: "0x082d7cdd", endExclusive: "0x082d7ce5", bytes: 8 },
  },
  sourceRom,
  scripts: {
    Move_DREAM_EATER: rootCommands,
    SetPsychicBackground: setPsychicCommands,
    DreamEaterAbsorb: absorbCommands,
    HealingEffect: healingCommands,
    UnsetPsychicBackground: unsetPsychicCommands,
  },
  battlePrecondition: {
    targetMustBeSleeping: "jumpifstatus BS_TARGET, STATUS1_SLEEP, BattleScript_DreamEaterWorked",
    substituteFailsFirst: "jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_DreamEaterNoEffect",
    workedPath: battleDreamEaterCommands,
  },
  orbGroups: DREAM_EATER_ORB_GROUPS,
  audio: {
    opening: "SE_M_PSYBEAM/SOUND_PAN_ATTACKER",
    scale: "SE_M_MINIMIZE/SOUND_PAN_TARGET",
    perGroup: "SE_M_SWAGGER/SOUND_PAN_TARGET",
    perGroupCount: 8,
    healing: "SE_M_ABSORB_2/SOUND_PAN_ATTACKER",
  },
  components: expectedComponents,
  dependencies: {
    subroutines: ["SetPsychicBackground", "DreamEaterAbsorb", "HealingEffect", "UnsetPsychicBackground"],
    tasks: ["AnimTask_SetPsychicBackground", "AnimTask_ShakeMon", "AnimTask_ScaleMonAndRestore"],
    sprites: ["gAbsorptionOrbSpriteTemplate", "gHealingBlueStarSpriteTemplate"],
    assets: ["ANIM_TAG_ORBS", "ANIM_TAG_BLUE_STAR"],
    background: ["fadetobg BG_PSYCHIC", "monbg ANIM_DEF_PARTNER", "splitbgprio_foes ANIM_TARGET", "setalpha 8,8 then 12,8", "restorebg/setarg 7,0xFFFF"],
    cleanup: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "UnsetPsychicBackground", "end"],
  },
  carrier: {
    lowestLevel50: level50Carriers[0],
    allLevel50: level50Carriers,
    stageConstants: constants,
  },
  legalSelection: {
    challenge2Range: CHALLENGE_2_RANGE,
    wigglytuffSideSetIds: WIGGLYTUFF_SIDE_SET_IDS,
    onixSideSetIds: ONIX_SIDE_SET_IDS,
    inventory: LEGAL_STAGE_INVENTORY,
    provenance: [
      "reference/pokeemerald/src/battle_factory.c:sInitialRentalMonRanges[2]",
      "reference/pokeemerald/include/constants/battle_frontier_mons.h",
      "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "src/data/gen/factory-round-policy.json:rentalSelection.ranges.level50[2]",
      "src/data/gen/battle-frontier-mons.json:entries",
    ],
  },
  staging: stagedScenarios,
  controls: {
    MOVE_ABSORB: "exact control only; no Dream Eater latch, timeline, or acceptance inheritance",
    MOVE_MEGA_DRAIN: "exact control only; no Dream Eater latch, timeline, or acceptance inheritance",
    MOVE_GIGA_DRAIN: "exact control only; no Dream Eater latch, timeline, or acceptance inheritance",
    MOVE_DREAM_EATER: "source/staging checkpoint only; remains independently unsupported",
  },
  latchRequirement: "No display latch is measured here. Future Dream Eater evidence must measure its own plain OAM/palette and ShakeMon RAM+1 hypotheses, ScaleMonAndRestore affine RAM+2 hypothesis, psychic-BG/monbg/split priority, shadow teardown, and equal-subpriority SortSprites/OAM ordering before any visual claim.",
}, null, 2));
