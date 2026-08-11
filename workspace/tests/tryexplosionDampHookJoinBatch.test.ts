import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };

type Row = Record<string, any>;
const audit = (data as unknown as Row).coverage.hookCatalogs.ability.tryexplosionDamp as Row;

describe("Explosion / Damp Level-50 hook-join family", () => {
  it("pins the exact two executable selectors and 25-selectable/26-carrier census", () => {
    expect(audit).toMatchObject({ status: "source-proven-family", selector: "moveTable.effect === EFFECT_EXPLOSION", candidateCount: 2, selectableSetOccurrences: 25, fullLevel50CarrierRows: 26, sourceProvenRows: ["MOVE_SELF_DESTRUCT", "MOVE_EXPLOSION"], sourceExceptionRows: [], blockers: [] });
    expect(audit.sourceMoveCandidates).toEqual([
      expect.objectContaining({ move: "MOVE_SELF_DESTRUCT", moveId: 120, power: 200, accuracy: 100, pp: 5, selectableSetOccurrences: 1, fullLevel50CarrierRows: 2, executionInventory: "level50-executable" }),
      expect.objectContaining({ move: "MOVE_EXPLOSION", moveId: 153, power: 250, accuracy: 100, pp: 5, selectableSetOccurrences: 24, fullLevel50CarrierRows: 24, executionInventory: "level50-executable" }),
    ]);
    expect(audit.nonselectableCarrierRows).toEqual([{ setId: 57, label: "FRONTIER_MON_PINECO", move: "MOVE_SELF_DESTRUCT" }]);
  });

  it("certifies identical graph/program preludes, the fixed failure tail, and the no-damage guard boundary", () => {
    expect(audit.routeWitnesses).toHaveLength(2);
    for (const witness of audit.routeWitnesses as Row[]) {
      const family = witness.familyEvidence as Row;
      expect(family.selector).toMatchObject({ symbol: witness.move, effect: "EFFECT_EXPLOSION", guard: "moveTable.effect === EFFECT_EXPLOSION" });
      expect(family.entryPath.graph.prelude).toEqual(family.entryPath.program.prelude);
      expect(family.entryPath.graph.prelude.map((row: Row) => row.mnemonic)).toEqual(["attackcanceler", "attackstring", "ppreduce", "tryexplosion"]);
      expect(family.entryPath.graph.dampTail.statements).toEqual(family.entryPath.program.dampTail.statements);
      expect(family.entryPath.graph.dampTail.statements.map((row: Row) => [row.mnemonic, row.operands])).toEqual([
        ["pause", ["B_WAIT_TIME_SHORT"]], ["printstring", ["STRINGID_PKMNPREVENTSUSAGE"]], ["pause", ["B_WAIT_TIME_LONG"]], ["goto", ["BattleScript_MoveEnd"]],
      ]);
      expect(family.runtimeGuardSignature).toMatchObject({ ability: { symbol: "ABILITY_DAMP", value: 6 }, damp: { destination: "BattleScript_DampStopsExplosion", lastUsedAbility: 6 }, rng: expect.stringContaining("no Random call") });
      expect(family.runtimeGuardSignature.scopeBoundary).toMatch(/no HP update.*datahpupdate.*MOVEEND_NEXT_TARGET.*Shell Bell.*damage.*faint/);
    }
  });

  it("pins Cmd_tryexplosion's controller gate, first-holder scan, record, and fixed jump directly to source", () => {
    const source = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const command = source.slice(source.indexOf("static void Cmd_tryexplosion(void)\n{"), source.indexOf("static void Cmd_setatkhptozero(void)", source.indexOf("static void Cmd_tryexplosion(void)\n{")));
    const tokens = ["if (gBattleControllerExecFlags)", "for (gBattlerTarget = 0; gBattlerTarget < gBattlersCount; gBattlerTarget++)", "if (gBattleMons[gBattlerTarget].ability == ABILITY_DAMP)", "gLastUsedAbility = ABILITY_DAMP;", "RecordAbilityBattle(gBattlerTarget, gBattleMons[gBattlerTarget].ability);", "gBattlescriptCurrInstr = BattleScript_DampStopsExplosion;"];
    let cursor = 0;
    for (const token of tokens) {
      const next = command.indexOf(token, cursor);
      expect(next, token).toBeGreaterThanOrEqual(cursor);
      cursor = next + token.length;
    }
    expect(command).not.toContain("Random(");
  });
});
