import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/secret-power-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Secret Power / getsecretpowereffect registration evidence", () => {
  it("pins the one-byte 0xe4 instruction, effect-byte slot, every terrain value, and PC behavior", () => {
    expect(evidence.instruction).toEqual({
      opcode: 228,
      opcodeHex: "0xe4",
      length: 1,
      operandWidths: [],
      pc: "gBattlescriptCurrInstr++ on every terrain branch",
    });
    expect(evidence.sourceBehavior.terrainToMoveEffect).toEqual({
      BATTLE_ENVIRONMENT_GRASS: "MOVE_EFFECT_POISON",
      BATTLE_ENVIRONMENT_LONG_GRASS: "MOVE_EFFECT_SLEEP",
      BATTLE_ENVIRONMENT_SAND: "MOVE_EFFECT_ACC_MINUS_1",
      BATTLE_ENVIRONMENT_UNDERWATER: "MOVE_EFFECT_DEF_MINUS_1",
      BATTLE_ENVIRONMENT_WATER: "MOVE_EFFECT_ATK_MINUS_1",
      BATTLE_ENVIRONMENT_POND: "MOVE_EFFECT_SPD_MINUS_1",
      BATTLE_ENVIRONMENT_MOUNTAIN: "MOVE_EFFECT_CONFUSION",
      BATTLE_ENVIRONMENT_CAVE: "MOVE_EFFECT_FLINCH",
      "default (BUILDING and PLAIN)": "MOVE_EFFECT_PARALYSIS",
    });

    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const commandConstants = file("reference/pokeemerald/include/constants/battle_script_commands.h");
    expect(macro).toContain(".macro getsecretpowereffect\n\t.byte B_SCR_OP_GETSECRETPOWEREFFECT\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_GETSECRETPOWEREFFECT]            = Cmd_getsecretpowereffect,                    //0xE4");
    expect(commandConstants).toContain("#define MOVE_EFFECT_BYTE        3");
    expect(commands).toMatch(/static void Cmd_getsecretpowereffect\(void\)[\s\S]*?case BATTLE_ENVIRONMENT_GRASS:[\s\S]*?MOVE_EFFECT_POISON[\s\S]*?case BATTLE_ENVIRONMENT_LONG_GRASS:[\s\S]*?MOVE_EFFECT_SLEEP[\s\S]*?case BATTLE_ENVIRONMENT_SAND:[\s\S]*?MOVE_EFFECT_ACC_MINUS_1[\s\S]*?case BATTLE_ENVIRONMENT_UNDERWATER:[\s\S]*?MOVE_EFFECT_DEF_MINUS_1[\s\S]*?case BATTLE_ENVIRONMENT_WATER:[\s\S]*?MOVE_EFFECT_ATK_MINUS_1[\s\S]*?case BATTLE_ENVIRONMENT_POND:[\s\S]*?MOVE_EFFECT_SPD_MINUS_1[\s\S]*?case BATTLE_ENVIRONMENT_MOUNTAIN:[\s\S]*?MOVE_EFFECT_CONFUSION[\s\S]*?case BATTLE_ENVIRONMENT_CAVE:[\s\S]*?MOVE_EFFECT_FLINCH[\s\S]*?default:[\s\S]*?MOVE_EFFECT_PARALYSIS[\s\S]*?gBattlescriptCurrInstr\+\+;/);
  });

  it("pins Factory building terrain ownership, the genuine L50 carrier, and ordinary secondary-effect handoff", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "battle_factory.c": sha256("reference/pokeemerald/src/battle_factory.c"),
      "battle_setup.c": sha256("reference/pokeemerald/src/battle_setup.c"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
      "factory-battle-room.map.json": sha256("reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryBattleRoom/map.json"),
    }).toEqual(evidence.sourceSha256);

    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    const frontierIds = file("reference/pokeemerald/include/constants/battle_frontier_mons.h");
    const factory = file("reference/pokeemerald/src/battle_factory.c");
    const setup = file("reference/pokeemerald/src/battle_setup.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const room = file("reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryBattleRoom/map.json");
    expect(room).toContain('"map_type": "MAP_TYPE_INDOOR"');
    expect(setup).toContain("case MAP_TYPE_INDOOR:\n    case MAP_TYPE_SECRET_BASE:\n        return BATTLE_ENVIRONMENT_BUILDING;");
    expect(main).toContain("gBattleEnvironment = BattleSetup_GetEnvironmentId();");
    expect(factory).toContain("{FRONTIER_MON_GRIMER,     FRONTIER_MON_FURRET_1},   // 110 - 199");
    expect(frontierIds).toContain("#define FRONTIER_MON_DELCATTY_1     162");
    expect(frontier).toMatch(/\[FRONTIER_MON_DELCATTY_1\][\s\S]*?\.species = SPECIES_DELCATTY,[\s\S]*?\.moves = \{MOVE_SECRET_POWER, MOVE_FAINT_ATTACK, MOVE_DOUBLE_TEAM, MOVE_HEAL_BELL\},[\s\S]*?BATTLE_FRONTIER_ITEM_SITRUS_BERRY,[\s\S]*?NATURE_LONELY/);
    expect(moves).toMatch(/\[MOVE_SECRET_POWER\][\s\S]*?\.effect = EFFECT_SECRET_POWER,[\s\S]*?\.power = 70,[\s\S]*?\.pp = 20,[\s\S]*?\.secondaryEffectChance = 30,/);
    expect(scripts).toContain("BattleScript_EffectSecretPower::\n\tgetsecretpowereffect\n\tgoto BattleScript_EffectHit");
    expect(scripts).toContain("seteffectwithchance\n\ttryfaintmon BS_TARGET");
    expect(commands).toContain("if (gBattleMons[gBattlerAttacker].ability == ABILITY_SERENE_GRACE)");
    expect(commands).toContain("else if (Random() % 100 < percentChance");
    expect(commands).toContain("SetMoveEffect(FALSE, 0);");
    expect(commands).toContain("gEffectBattler = gBattlerTarget;");
    expect(commands).toContain("gBattleScripting.battler = gBattlerAttacker;");
    expect(commands).toContain("if (gBattleMons[gEffectBattler].ability == ABILITY_SHIELD_DUST");
    expect(commands).toContain("SIDE_STATUS_SAFEGUARD");
    expect(commands).toContain("STATUS2_SUBSTITUTE");
    expect(scripts).toContain("BattleScript_MoveEffectParalysis::\n\tstatusanimation BS_EFFECT_BATTLER\n\tprintfromtable gGotParalyzedStringIds");
  });

  it("keeps the complete-party Factory proc route reproducible while source-pinning the non-proc boundary", () => {
    expect(evidence.schema).toBe("secret-power-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.repeatability).toEqual({ runsPerCase: 2, comparison: "byte-identical full manifest.json", allMatched: true });
    expect(new Set(evidence.case.runManifestSha256).size).toBe(1);
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));

    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; seed: number; playerSetIds: number[]; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { segments: Array<{ buttons: string[] }>; captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off", seed: 3, playerSetIds: [162, 149, 180] });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 301, nature: 1, moves: [290, 185, 104, 215], item: 142 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [150, 150, 150, 150] });
    expect(scenario.trace.segments.filter(({ buttons }) => buttons.includes("A"))).toHaveLength(2);
    expect(evidence.case.captures.every(({ frame }) => scenario.trace.captureFrames.includes(frame))).toBe(true);

    const [initial, chosen, proc, settled] = evidence.case.captures;
    expect(initial).toMatchObject({ currentMove: 0, player: { hp: 138, maxHp: 138, pp: [20, 20, 15, 5] }, opponent: { hp: 362, maxHp: 362, status1: 0, status: "none" } });
    expect(chosen).toMatchObject({ currentMove: 290, player: { pp: [19, 20, 15, 5] }, opponent: { hp: 362, status1: 0, status: "none" } });
    expect(proc).toMatchObject({ currentMove: 290, player: { pp: [19, 20, 15, 5] }, opponent: { hp: 311, maxHp: 362, status1: 64, status: "paralysis", statStages: [6, 6, 6, 6, 6, 6, 6, 6] } });
    expect(settled).toMatchObject({ currentMove: 0, player: { hp: 138, pp: [19, 20, 15, 5] }, opponent: { hp: 311, status1: 64, status: "paralysis" } });
    expect(initial.opponent.hp - proc.opponent.hp).toBe(51);
  });
});
