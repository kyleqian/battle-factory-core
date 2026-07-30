import { readFileSync } from "node:fs";

const read = (path: string): string => readFileSync(path, "utf8");
const animScripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const commands = read("reference/pokeemerald/src/battle_script_commands.c");
const controllers = read("reference/pokeemerald/src/battle_controllers.c");
const playerController = read(
  "reference/pokeemerald/src/battle_controller_player.c",
);
const opponentController = read(
  "reference/pokeemerald/src/battle_controller_opponent.c",
);
const battleAnim = read("reference/pokeemerald/src/battle_anim.c");
const battleMain = read("reference/pokeemerald/src/battle_main.c");
const battleSetup = read("reference/pokeemerald/src/battle_setup.c");
const battleConstants = read("reference/pokeemerald/include/constants/battle.h");
const factory = read("reference/pokeemerald/src/battle_factory.c");
const frontierMons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const frontierIds = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const factoryRoom = read(
  "reference/pokeemerald/data/maps/"
    + "BattleFrontier_BattleFactoryBattleRoom/map.json",
);
const semanticOpcodeTest = read(
  "tests/battleScriptGetSecretPowerEffectOpcode.test.ts",
);
const semanticEvidenceTest = read("tests/secretPowerOracleEvidence.test.ts");
const generatedMons = JSON.parse(
  read("src/data/gen/battle-frontier-mons.json"),
) as {
  readonly entries: readonly {
    readonly index: number;
    readonly label: string;
    readonly species: string;
    readonly moves: readonly string[];
    readonly itemName: string;
    readonly evSpread: number;
    readonly nature: string;
  }[];
};

function block(source: string, label: string, nextLabel: string): string {
  const start = source.indexOf(`${label}:`);
  const end = source.indexOf(`${nextLabel}:`, start + label.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${label}/${nextLabel}`);
  return source.slice(start, end);
}

function between(source: string, startText: string, endText: string): string {
  const start = source.lastIndexOf(startText);
  const end = source.indexOf(endText, start + startText.length);
  if (start < 0 || end < 0) throw new Error(`missing ${startText}/${endText}`);
  return source.slice(start, end);
}

function requireText(source: string, text: string): void {
  if (!source.includes(text)) throw new Error(`missing source text: ${text}`);
}

const environments = [
  ["BATTLE_ENVIRONMENT_GRASS", 0, "Move_NEEDLE_ARM"],
  ["BATTLE_ENVIRONMENT_LONG_GRASS", 1, "Move_MAGICAL_LEAF"],
  ["BATTLE_ENVIRONMENT_SAND", 2, "Move_MUD_SHOT"],
  ["BATTLE_ENVIRONMENT_UNDERWATER", 3, "Move_WATERFALL"],
  ["BATTLE_ENVIRONMENT_WATER", 4, "Move_SURF"],
  ["BATTLE_ENVIRONMENT_POND", 5, "Move_BUBBLE_BEAM"],
  ["BATTLE_ENVIRONMENT_MOUNTAIN", 6, "Move_ROCK_THROW"],
  ["BATTLE_ENVIRONMENT_CAVE", 7, "Move_BITE"],
  ["BATTLE_ENVIRONMENT_BUILDING", 8, "Move_STRENGTH"],
  ["BATTLE_ENVIRONMENT_PLAIN", 9, "Move_SLAM"],
] as const;

const secretPower = block(animScripts, "Move_SECRET_POWER", "Move_TWISTER");
for (const [environment, value, body] of environments) {
  if (!new RegExp(`#define\\s+${environment}\\s+${value}\\b`).test(
    battleConstants,
  )) {
    throw new Error(`missing ${environment} = ${value}`);
  }
  if (environment === "BATTLE_ENVIRONMENT_PLAIN") {
    requireText(secretPower, "goto Move_SLAM");
  } else {
    const pattern = new RegExp(
      `jumpargeq 0, ${environment},\\s+${body}`,
    );
    if (!pattern.test(secretPower)) {
      throw new Error(`missing ${environment} -> ${body} dispatch`);
    }
  }
}
requireText(
  secretPower,
  "createvisualtask AnimTask_GetBattleEnvironment, 5",
);

const strength = block(animScripts, "Move_STRENGTH", "Move_TACKLE");
for (const text of [
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_DEF_PARTNER",
  "setalpha 12, 8",
  "playsewithpan SE_M_TAKE_DOWN, SOUND_PAN_ATTACKER",
  "AnimTask_ShakeAndSinkMon, 5, ANIM_ATTACKER, 2, 0, 96, 30",
  "gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 4",
  "AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_TARGET, 18, 6, 2, 4",
  "x=16, y=12, relative_to=ANIM_TARGET, animation=1",
  "x=-16, y=-12, relative_to=ANIM_TARGET, animation=1",
  "x=3, y=4, relative_to=ANIM_TARGET, animation=1",
  "AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
]) requireText(strength, text);

requireText(
  battleScripts,
  "BattleScript_EffectSecretPower::\n\tgetsecretpowereffect\n"
    + "\tgoto BattleScript_EffectHit",
);
const hit = block(
  battleScripts,
  "BattleScript_EffectHit",
  "BattleScript_MoveEnd",
);
requireText(hit, "accuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE");
requireText(hit, "attackanimation\n\twaitanimation");
requireText(hit, "resultmessage\n\twaitmessage B_WAIT_TIME_LONG\n\tseteffectwithchance");
const missed = block(
  battleScripts,
  "BattleScript_MakeMoveMissed",
  "BattleScript_EffectSleep",
);
if (missed.includes("attackanimation")) {
  throw new Error("miss route unexpectedly launches a move animation");
}

const attackAnimation = between(
  commands,
  "static void Cmd_attackanimation(void)",
  "static void Cmd_waitanimation(void)",
);
for (const text of [
  "gHitMarker & HITMARKER_NO_ANIMATIONS",
  "gMoveResultFlags & MOVE_RESULT_NO_EFFECT",
  "BtlController_EmitMoveAnimation",
  "gBattlescriptCurrInstr = BattleScript_Pausex20",
]) requireText(attackAnimation, text);
requireText(
  controllers,
  "sBattleBuffersTransferData[0] = CONTROLLER_MOVEANIMATION;",
);
for (const source of [playerController, opponentController]) {
  requireText(source, "DoMoveAnim(move);");
}
requireText(
  battleAnim,
  "LaunchBattleAnimation(gBattleAnims_Moves, move, TRUE);",
);
requireText(animScripts, "\t.4byte Move_SECRET_POWER");

requireText(factoryRoom, '"map_type": "MAP_TYPE_INDOOR"');
requireText(
  battleSetup,
  "case MAP_TYPE_INDOOR:\n    case MAP_TYPE_SECRET_BASE:\n"
    + "        return BATTLE_ENVIRONMENT_BUILDING;",
);
requireText(
  battleMain,
  "gBattleEnvironment = BattleSetup_GetEnvironmentId();",
);
for (const text of [
  "{FRONTIER_MON_GRIMER,     FRONTIER_MON_FURRET_1},   // 110 - 199",
  "monId += sInitialRentalMonRanges[adder + challengeNum][0];",
]) requireText(factory, text);

const carriers = generatedMons.entries.filter(
  ({ moves }) => moves.includes("MOVE_SECRET_POWER"),
);
const lowestLevel50 = carriers.find(({ index }) => index >= 110 && index <= 199);
if (lowestLevel50?.index !== 117 || lowestLevel50.label !== "FRONTIER_MON_TEDDIURSA") {
  throw new Error(`unexpected lowest Level-50 carrier ${lowestLevel50?.label}`);
}
for (const text of [
  "#define FRONTIER_MON_TEDDIURSA      117",
  "[FRONTIER_MON_TEDDIURSA] = {",
  ".species = SPECIES_TEDDIURSA",
  ".moves = {MOVE_SECRET_POWER, MOVE_FAKE_TEARS, MOVE_FAINT_ATTACK, MOVE_REST}",
  ".itemTableId = BATTLE_FRONTIER_ITEM_CHESTO_BERRY",
  ".evSpread = F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP",
  ".nature = NATURE_RELAXED",
]) requireText(
  text.startsWith("#define") ? frontierIds : frontierMons,
  text,
);

for (const text of [
  "for (let environment = 0; environment <= 0xff; environment += 1)",
  "secretPowerMoveEffectForEnvironment(environment)",
  "always advances exactly one byte and owns no RNG, events, HP, PP, or lock state",
]) requireText(semanticOpcodeTest, text);
for (const text of [
  "BattleScript_EffectSecretPower::\\n\\tgetsecretpowereffect"
    + "\\n\\tgoto BattleScript_EffectHit",
  "complete-party Factory proc route",
  "source-pinning the non-proc boundary",
]) requireText(semanticEvidenceTest, text);

console.log(JSON.stringify({
  move: "MOVE_SECRET_POWER",
  moveId: 290,
  carrier: {
    setId: lowestLevel50.index,
    set: lowestLevel50.label,
    species: lowestLevel50.species,
    moves: lowestLevel50.moves,
    item: lowestLevel50.itemName,
    evSpread: lowestLevel50.evSpread,
    nature: lowestLevel50.nature,
    legalRange: [110, 199],
    challengeNum: 0,
  },
  visualDispatch: Object.fromEntries(
    environments.map(([environment, value, body]) => [
      environment,
      { value, body },
    ]),
  ),
  factory: {
    mapType: "MAP_TYPE_INDOOR",
    environment: "BATTLE_ENVIRONMENT_BUILDING",
    environmentValue: 8,
    reachableBodies: ["Move_STRENGTH"],
  },
  selectionRoutes: {
    success: "CONTROLLER_MOVEANIMATION -> DoMoveAnim(290) -> Move_SECRET_POWER"
      + " -> AnimTask_GetBattleEnvironment -> Move_STRENGTH",
    accuracyMiss: "BattleScript_PrintMoveMissed bypasses attackanimation",
    noEffect: "Cmd_attackanimation selects BattleScript_Pausex20",
    animationsDisabled: "Cmd_attackanimation selects BattleScript_Pausex20",
    secondaryEffect:
      "seteffectwithchance runs after attackanimation/resultmessage",
  },
  factoryBody: {
    label: "Move_STRENGTH",
    components: [
      "ANIM_TAG_IMPACT",
      "AnimTask_ShakeAndSinkMon",
      "gSlideMonToOriginalPosSpriteTemplate",
      "AnimTask_TranslateMonEllipticalRespectSide",
      "three gBasicHitSplatSpriteTemplate animation-1 lifecycles",
      "AnimTask_ShakeMon2",
      "ANIM_DEF_PARTNER monbg",
      "12:8 alpha",
      "SE_M_TAKE_DOWN",
      "three SE_M_MEGA_KICK2",
      "cleanup",
    ],
  },
  semanticEvidence: [
    "tests/battleScriptGetSecretPowerEffectOpcode.test.ts",
    "tests/secretPowerOracleEvidence.test.ts",
  ],
  verdict: "unsupported: Factory reaches one body, Move_STRENGTH; "
    + "the reducer/evidence checkpoint lacks typed-seam and production-"
    + "framebuffer acceptance",
}));
