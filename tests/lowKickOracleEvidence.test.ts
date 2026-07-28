import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/low-kick-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Low Kick / weightdamagecalculation evidence", () => {
  it("pins 0xdd's one-byte shape, current-target weight lookup, all strict brackets, PC, and no local RNG/controller work", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 221, opcodeHex: "0xdd", length: 1, operands: [], target: "gBattlerTarget",
      destination: "gDynamicBasePower", pc: "gBattlescriptCurrInstr++", localRngCalls: 0, controllerEmissions: 0,
    });
    expect(evidence.brackets).toEqual([
      { weightHectograms: "0..99", weightKilograms: "0.0..9.9", power: 20 },
      { weightHectograms: "100..249", weightKilograms: "10.0..24.9", power: 40 },
      { weightHectograms: "250..499", weightKilograms: "25.0..49.9", power: 60 },
      { weightHectograms: "500..999", weightKilograms: "50.0..99.9", power: 80 },
      { weightHectograms: "1000..1999", weightKilograms: "100.0..199.9", power: 100 },
      { weightHectograms: "2000+", weightKilograms: "200.0+", power: 120 },
    ]);
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const handlerStart = commands.lastIndexOf("static void Cmd_weightdamagecalculation(void)");
    const handler = commands.slice(handlerStart, commands.indexOf("static void Cmd_assistattackselect(void)", handlerStart));
    expect(macro).toContain(".macro weightdamagecalculation\n\t.byte B_SCR_OP_WEIGHTDAMAGECALCULATION\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_WEIGHTDAMAGECALCULATION]         = Cmd_weightdamagecalculation,                 //0xDD");
    expect(commands).toMatch(/sWeightToDamageTable\[\] =[\s\S]*?100, 20,[\s\S]*?250, 40,[\s\S]*?500, 60,[\s\S]*?1000, 80,[\s\S]*?2000, 100,[\s\S]*?0xFFFF, 0xFFFF/);
    expect(handler).toContain(evidence.instruction.weightLookup);
    expect(handler).toMatch(/if \(sWeightToDamageTable\[i\] != 0xFFFF\)[\s\S]*?gDynamicBasePower = sWeightToDamageTable\[i \+ 1\];[\s\S]*?else[\s\S]*?gDynamicBasePower = 120;[\s\S]*?gBattlescriptCurrInstr\+\+;/);
    expect(handler).not.toMatch(/Random\(|BtlController_|MarkBattlerForControllerExec/);
  });

  it("pins Low Kick's script order, accumulator consumer/reset, selected target, and source boundary for misses and immunities", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle_move_effects.h": sha256("reference/pokeemerald/include/constants/battle_move_effects.h"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "pokedex.c": sha256("reference/pokeemerald/src/pokedex.c"),
      "pokedex.h": sha256("reference/pokeemerald/include/pokedex.h"),
      "pokedex_entries.h": sha256("reference/pokeemerald/src/data/pokemon/pokedex_entries.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const pokedex = file("reference/pokeemerald/src/pokedex.c");
    const entries = file("reference/pokeemerald/src/data/pokemon/pokedex_entries.h");
    expect(scripts).toContain("BattleScript_EffectLowKick::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tweightdamagecalculation\n\taccuracycheck BattleScript_MoveMissedPause, ACC_CURR_MOVE\n\tgoto BattleScript_HitFromCritCalc");
    expect(moves).toMatch(/\[MOVE_LOW_KICK\][\s\S]*?\.effect = EFFECT_LOW_KICK,[\s\S]*?\.power = 1,[\s\S]*?\.type = TYPE_FIGHTING,[\s\S]*?\.accuracy = 100,[\s\S]*?\.pp = 20,[\s\S]*?\.target = MOVE_TARGET_SELECTED,[\s\S]*?\.priority = 0,/);
    expect(commands).toMatch(/static void Cmd_damagecalc\(void\)[\s\S]*?CalculateBaseDamage\([\s\S]*?gDynamicBasePower,[\s\S]*?gBattleMoveDamage = gBattleMoveDamage \* gCritMultiplier \* gBattleScripting\.dmgMultiplier;/);
    expect(util).toMatch(/void HandleAction_ActionFinished\(void\)[\s\S]*?gDynamicBasePower = 0;/);
    expect(pokedex).toMatch(/u16 GetPokedexHeightWeight\(u16 dexNum, u8 data\)[\s\S]*?case 1:\s*\/\/ weight[\s\S]*?return gPokedexEntries\[dexNum\]\.weight;/);
    expect(entries).toMatch(/\[NATIONAL_DEX_CHANSEY\][\s\S]*?\.weight = 346,/);
    expect(entries).toMatch(/\[NATIONAL_DEX_SNORLAX\][\s\S]*?\.weight = 4600,/);
    expect(evidence.effect.failureAndImmunityBoundary).toContain("before accuracycheck");
  });

  it("keeps two complete-party, dense OFF receipts reproducible while separating public proof from source-only facts", () => {
    expect(evidence.schema).toBe("low-kick-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    for (const receipt of evidence.cases) {
      expect(sha256(receipt.scenario)).toBe(receipt.scenarioSha256);
      const scenario = JSON.parse(file(receipt.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
      const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
      expect(mons).toHaveLength(6);
      for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
      expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 67, moves: [67, 33, 33, 33] });
      expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: receipt.weight.species, moves: [150, 150, 150, 150] });
      for (const observation of Object.values(receipt.observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
      expect(receipt.repeatability).toMatchObject({ runs: 2, comparison: "byte-identical full manifest.json" });
    }
    const [chansey, snorlax] = evidence.cases;
    expect(chansey.weight).toMatchObject({ hectograms: 346, power: 60 });
    expect(snorlax.weight).toMatchObject({ hectograms: 4600, power: 120 });
    expect(chansey.observed.initial).toMatchObject({ playerPp: 20, opponentHp: 357, opponentPp: 40 });
    expect(chansey.observed.opponentSplash).toMatchObject({ playerPp: 20, opponentHp: 357, opponentPp: 39 });
    expect(chansey.observed.lowKickPp).toMatchObject({ playerPp: 19, opponentHp: 357, opponentPp: 39 });
    expect(chansey.observed.damageAndMessage).toMatchObject({ playerPp: 19, opponentHp: 131, opponentPp: 39, message: "It's super effective!" });
    expect(snorlax.observed.initial).toMatchObject({ playerPp: 20, opponentHp: 267, opponentPp: 40 });
    expect(snorlax.observed.lowKickPp).toMatchObject({ playerPp: 19, opponentHp: 267, opponentPp: 40 });
    expect(snorlax.observed.damageAndMessage).toMatchObject({ playerPp: 19, opponentHp: 47, opponentPp: 40, message: "It's super effective!" });
    expect(snorlax.observed.opponentSplash).toMatchObject({ playerPp: 19, opponentHp: 47, opponentPp: 39 });
    expect(evidence.boundedRemainder).toContain("gDynamicBasePower");
  });
});
