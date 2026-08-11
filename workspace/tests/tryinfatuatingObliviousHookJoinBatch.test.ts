import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };

type Row = Record<string, any>;
const manifest = data as unknown as Row;
const audit = manifest.coverage.hookCatalogs.ability.tryinfatuatingOblivious as Row;
const ROUTE = [
  "attackcanceler",
  "attackstring",
  "ppreduce",
  "accuracycheck",
  "tryinfatuating",
  "attackanimation",
  "waitanimation",
  "printstring",
  "waitmessage",
  "goto",
];

function endsAtMoveEnd(tail: Row): boolean {
  const last = (tail.statements as Row[]).at(-1)!;
  return last.mnemonic === "goto" && JSON.stringify(last.operands) === JSON.stringify(["BattleScript_MoveEnd"]);
}

describe("Attract / Oblivious Level-50 hook-join family", () => {
  it("has exactly the one executable EFFECT_ATTRACT candidate, promoted without exceptions, blockers, or roster-only rows", () => {
    expect(audit).toMatchObject({
      status: "source-proven-family",
      selector: "moveTable.effect === EFFECT_ATTRACT",
      candidateCount: 1,
      sourceProvenRows: ["MOVE_ATTRACT"],
      sourceExceptionRows: [],
      blockers: [],
    });
    expect(audit.sourceMoveCandidates).toEqual([{
      move: "MOVE_ATTRACT",
      moveId: 213,
      effect: "EFFECT_ATTRACT",
      entryScript: "BattleScript_EffectAttract",
      executionInventory: "level50-executable",
      blockerIds: [],
      exceptionId: null,
    }]);
    expect(audit.routeWitnesses).toHaveLength(1);
  });

  it("certifies the exact action prelude and every success/failure/Oblivious MoveEnd tail", () => {
    const family = (audit.routeWitnesses as Row[])[0]!.familyEvidence as Row;
    const graph = family.entryPath.graph as Row;
    const program = family.entryPath.program as Row;
    expect(family.category).toBe("tryinfatuating-oblivious");
    expect(family.selector).toMatchObject({ symbol: "MOVE_ATTRACT", effect: "EFFECT_ATTRACT", guard: "moveTable.effect === EFFECT_ATTRACT" });
    expect(family.entryPath).toMatchObject({ declaredEntryScript: "BattleScript_EffectAttract" });
    expect(graph.route).toEqual(program.route);
    expect((graph.route as Row[]).map((statement) => statement.mnemonic)).toEqual(ROUTE);
    expect(graph.attackCanceler).toMatchObject({ mnemonic: "attackcanceler" });
    expect(graph.accuracyCheck).toMatchObject({ mnemonic: "accuracycheck", operands: ["BattleScript_ButItFailed", "ACC_CURR_MOVE"] });
    expect(graph.tryInfatuating).toMatchObject({ mnemonic: "tryinfatuating", operands: ["BattleScript_ButItFailed"] });
    expect(endsAtMoveEnd(graph.entry)).toBe(true);
    expect(endsAtMoveEnd(graph.ordinaryFailureTail)).toBe(true);
    expect(endsAtMoveEnd(graph.obliviousTail)).toBe(true);
    expect(endsAtMoveEnd(program.entry)).toBe(true);
    expect(endsAtMoveEnd(program.ordinaryFailureTail)).toBe(true);
    expect(endsAtMoveEnd(program.obliviousTail)).toBe(true);
    expect(family.entryPath.tails).toEqual({
      success: "BattleScript_MoveEnd",
      ordinaryFailure: "BattleScript_ButItFailed -> BattleScript_MoveEnd",
      oblivious: "BattleScript_ObliviousPreventsAttraction -> BattleScript_MoveEnd",
    });
    expect((graph.route as Row[]).map((statement) => statement.mnemonic)).not.toContain("datahpupdate");
  });

  it("pins the Oblivious-first source guard, hardcoded reveal branch, ordinary operand failure, and five-byte love write", () => {
    const family = (audit.routeWitnesses as Row[])[0]!.familyEvidence as Row;
    expect(audit.runtimeGuardSignature).toMatchObject({
      ability: { symbol: "ABILITY_OBLIVIOUS", value: 12 },
      orderedGuards: [
        "gBattleMons[gBattlerTarget].ability == ABILITY_OBLIVIOUS first",
        "same attacker/target gender",
        "gBattleMons[gBattlerTarget].status2 & STATUS2_INFATUATION",
        "attacker gender == MON_GENDERLESS",
        "target gender == MON_GENDERLESS",
      ],
      oblivious: {
        destination: "BattleScript_ObliviousPreventsAttraction",
        destinationKind: "hardcoded-not-operand-pointer",
        lastUsedAbility: 12,
      },
      ordinaryFailure: { destination: "T1_READ_PTR(gBattlescriptCurrInstr + 1)", operandDestination: "BattleScript_ButItFailed" },
      success: { write: "gBattleMons[gBattlerTarget].status2 |= STATUS2_INFATUATED_WITH(gBattlerAttacker)", advanceBytes: 5 },
    });
    expect(family.runtimeGuardSignature.scopeBoundary).toMatch(/no datahpupdate.*MOVEEND state 12.*King's Rock.*Shell Bell.*charge.*faint/);

    const source = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const command = source.slice(source.indexOf("static void Cmd_tryinfatuating(void)\n{"), source.indexOf("static void Cmd_updatestatusicon(void)", source.indexOf("static void Cmd_tryinfatuating(void)\n{")));
    const orderedTokens = [
      "if (gBattleMons[gBattlerTarget].ability == ABILITY_OBLIVIOUS)",
      "gBattlescriptCurrInstr = BattleScript_ObliviousPreventsAttraction;",
      "gLastUsedAbility = ABILITY_OBLIVIOUS;",
      "RecordAbilityBattle(gBattlerTarget, ABILITY_OBLIVIOUS);",
      "GetGenderFromSpeciesAndPersonality(speciesAttacker, personalityAttacker) == GetGenderFromSpeciesAndPersonality(speciesTarget, personalityTarget)",
      "gBattleMons[gBattlerTarget].status2 & STATUS2_INFATUATION",
      "GetGenderFromSpeciesAndPersonality(speciesAttacker, personalityAttacker) == MON_GENDERLESS",
      "GetGenderFromSpeciesAndPersonality(speciesTarget, personalityTarget) == MON_GENDERLESS",
      "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);",
      "gBattleMons[gBattlerTarget].status2 |= STATUS2_INFATUATED_WITH(gBattlerAttacker);",
      "gBattlescriptCurrInstr += 5;",
    ];
    let cursor = 0;
    for (const token of orderedTokens) {
      const next = command.indexOf(token, cursor);
      expect(next, `missing or reordered ${token}`).toBeGreaterThanOrEqual(cursor);
      cursor = next + token.length;
    }
    expect(readFileSync("reference/pokeemerald/include/constants/abilities.h", "utf8")).toContain("#define ABILITY_OBLIVIOUS 12");
  });
});
