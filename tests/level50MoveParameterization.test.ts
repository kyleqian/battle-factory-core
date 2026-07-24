import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };
import frontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };

type Record = {
  id: number;
  move: string;
  name: string;
  moveTable: { effect: string; secondaryEffectChance: number; type: string; power: number; accuracy: number; pp: number; target: string[]; priority: number; flags: string[] };
  frontierSets: { ids: number[]; count: number };
  battleScript: { effectId: number; entryScript: string; graphLabel: string | null; programLabel: string | null; executionInventory: string };
  animation: { script: string | null; componentIds: string[] };
  hooks: { item: { category: null; status: string; reason: string }; ability: { category: null; status: string; reason: string } };
};
type SourceMove = {
  id: number;
  move: string;
  name: string;
  effect: string;
  secondaryEffectChance: number;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  target: string[];
  priority: number;
  flags: string[];
};
const manifest = data as { schema: string; coverage: { level50Roster: { frontierSetIds: { first: number; last: number; count: number }; moveCount: number; moveTableEffectFamilyCount: number }; level50Executable: { moveCount: number; battleScriptEffectFamilyCount: number; rosterOnlyMoveCount: number; rosterOnlyMoveTableEffectFamilyCount: number }; joins: { battleScriptGraphLabels: number; battleScriptProgramLabels: number; animationScripts: number; itemHookCategories: number; abilityHookCategories: number }; hookCatalogs: { item: { frontierHeldItemRows: number; explicitHoldEffectRows: number; moveToHookDispatcher: null }; ability: { displayRows: number; moveToHookDispatcher: null } } }; moves: Record[] };
const sourceMoves = new Map((movesData.moves as SourceMove[]).map((move) => [move.move, move]));

describe("Level-50 move parameterization manifest", () => {
  it("regenerates byte-for-byte into an isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-level50-move-parameterization-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-level50-move-parameterization.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    expect(readFileSync(join(outputDirectory, "level50-move-parameterization.json"), "utf8")).toBe(
      readFileSync("src/data/gen/level50-move-parameterization.json", "utf8"),
    );
  });

  it("enumerates every non-NONE move used by the exact 0..849 Level-50 roster boundary", () => {
    expect(manifest.schema).toBe("level50-move-parameterization/v1");
    expect(manifest.coverage.level50Roster).toEqual({
      frontierSetIds: { first: 0, last: 849, count: 850 }, moveCount: 300, moveTableEffectFamilyCount: 176,
    });
    expect(manifest.moves).toHaveLength(300);
    const expected = new Map<string, number[]>();
    for (const set of frontierMons.entries.filter((set) => set.index <= 849)) {
      for (const move of new Set(set.moves.filter((move) => move !== "MOVE_NONE"))) expected.set(move, [...(expected.get(move) ?? []), set.index]);
    }
    expect(expected.size).toBe(300);
    for (const record of manifest.moves) {
      expect(record.frontierSets.ids).toEqual(expected.get(record.move));
      expect(record.frontierSets.count).toBe(record.frontierSets.ids.length);
    }
  });

  it("keeps roster move-table effects distinct from the narrower Battle Script executable-family denominator", () => {
    expect(manifest.coverage.level50Executable).toEqual({
      moveCount: 276, battleScriptEffectFamilyCount: 166, rosterOnlyMoveCount: 24, rosterOnlyMoveTableEffectFamilyCount: 10,
    });
    expect(manifest.coverage.joins).toMatchObject({
      battleScriptGraphLabels: 300, battleScriptProgramLabels: 300, animationScripts: 300,
      itemHookCategories: 0, abilityHookCategories: 0,
    });
    expect(manifest.coverage.hookCatalogs).toMatchObject({
      item: { frontierHeldItemRows: 63, explicitHoldEffectRows: 70, moveToHookDispatcher: null },
      ability: { displayRows: 8, moveToHookDispatcher: null },
    });
  });

  it("preserves move-table values and complete exact source joins without inventing item or ability hook categories", () => {
    for (const record of manifest.moves) {
      const source = sourceMoves.get(record.move)!;
      expect(record.id).toBe(source.id);
      expect(record.name).toBe(source.name);
      expect(record.moveTable).toEqual({
        effect: source.effect, secondaryEffectChance: source.secondaryEffectChance, type: source.type,
        power: source.power, accuracy: source.accuracy, pp: source.pp, target: source.target,
        priority: source.priority, flags: source.flags,
      });
      expect(record.battleScript).toMatchObject({ entryScript: expect.stringMatching(/^BattleScript_/), graphLabel: record.battleScript.entryScript, programLabel: record.battleScript.entryScript });
      if (record.animation.script === null) expect(record.animation.componentIds).toEqual([]);
      else expect(record.animation.componentIds.length).toBeGreaterThan(0);
      for (const hook of [record.hooks.item, record.hooks.ability]) {
        expect(hook.category).toBeNull();
        expect(hook.status).toBe("not-yet-extracted");
        expect(hook.reason.length).toBeGreaterThan(0);
      }
    }
  });
});
