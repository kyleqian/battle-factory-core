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
  hooks: {
    item: { potentialCategories: null; status: string; unsupportedCategories: null; reason: string };
    ability: { potentialCategories: null; status: string; unsupportedCategories: null; reason: string };
  };
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
const manifest = data as { schema: string; coverage: { level50Roster: { frontierSetIds: { first: number; last: number; count: number }; moveCount: number; moveTableEffectFamilyCount: number }; level50Executable: { moveCount: number; battleScriptEffectFamilyCount: number; rosterOnlyMoveCount: number; rosterOnlyMoveTableEffectFamilyCount: number }; joins: { battleScriptGraphLabels: number; battleScriptProgramLabels: number; animationScripts: number; itemHookCategories: number; abilityHookCategories: number; itemHookUnsupportedCategories: null; abilityHookUnsupportedCategories: null }; hookCatalogs: { item: { frontierHeldItemRows: number; explicitHoldEffectRows: number; moveToHookDispatchers: Array<{ id: string; dispatcher: string; selector: string; ownership: string }>; catalogedDispatcherCategories: number; completeness: string; unsupportedCategories: null }; ability: { displayRows: number; moveToHookDispatchers: Array<{ id: string; dispatcher: string; selector: string; ownership: string }>; catalogedDispatcherCategories: number; soundproofSourceSelectorRows: number; soundproofLevel50RosterSelectorRows: number; completeness: string; unsupportedCategories: null } } }; moves: Record[] };
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
    expect(manifest.schema).toBe("level50-move-parameterization/v2");
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
      itemHookUnsupportedCategories: null, abilityHookUnsupportedCategories: null,
    });
    expect(manifest.coverage.hookCatalogs).toMatchObject({
      item: {
        frontierHeldItemRows: 63, explicitHoldEffectRows: 70, catalogedDispatcherCategories: 3,
        completeness: "intentionally-partial", unsupportedCategories: null,
      },
      ability: {
        displayRows: 8, catalogedDispatcherCategories: 9, soundproofSourceSelectorRows: 10,
        soundproofLevel50RosterSelectorRows: 9, completeness: "intentionally-partial", unsupportedCategories: null,
      },
    });
    expect(manifest.coverage.hookCatalogs.item.moveToHookDispatchers.map((hook) => hook.id)).toEqual([
      "selection-choice-band", "accuracy-target-evasion-item", "moveend-kings-rock",
    ]);
    expect(manifest.coverage.hookCatalogs.ability.moveToHookDispatchers.map((hook) => hook.id)).toEqual([
      "moves-block-soundproof", "absorbing-volt-absorb", "absorbing-water-absorb", "absorbing-flash-fire",
      "moveend-contact-on-damage", "moveend-color-change", "accuracy-compound-eyes", "accuracy-sand-veil", "accuracy-hustle-physical",
    ]);
  });

  it("pins every partial dispatcher row to its named source selector", () => {
    const source = [
      readFileSync("reference/pokeemerald/src/battle_util.c", "utf8"),
      readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8"),
    ].join("\n");
    const requiredTokensByCategory: { [category: string]: string[] } = {
      "selection-choice-band": ["HOLD_EFFECT_CHOICE_BAND", "CheckMoveLimitations"],
      "accuracy-target-evasion-item": ["HOLD_EFFECT_EVASION_UP", "Cmd_accuracycheck"],
      "moveend-kings-rock": ["ITEMEFFECT_KINGSROCK_SHELLBELL", "FLAG_KINGS_ROCK_AFFECTED"],
      "moves-block-soundproof": ["ABILITYEFFECT_MOVES_BLOCK", "sSoundMovesTable", "ABILITY_SOUNDPROOF"],
      "absorbing-volt-absorb": ["ABILITYEFFECT_ABSORBING", "ABILITY_VOLT_ABSORB", "TYPE_ELECTRIC"],
      "absorbing-water-absorb": ["ABILITYEFFECT_ABSORBING", "ABILITY_WATER_ABSORB", "TYPE_WATER"],
      "absorbing-flash-fire": ["ABILITYEFFECT_ABSORBING", "ABILITY_FLASH_FIRE", "TYPE_FIRE"],
      "moveend-contact-on-damage": ["ABILITYEFFECT_ON_DAMAGE", "FLAG_MAKES_CONTACT", "ABILITY_ROUGH_SKIN"],
      "moveend-color-change": ["ABILITYEFFECT_ON_DAMAGE", "ABILITY_COLOR_CHANGE"],
      "accuracy-compound-eyes": ["Cmd_accuracycheck", "ABILITY_COMPOUND_EYES"],
      "accuracy-sand-veil": ["Cmd_accuracycheck", "ABILITY_SAND_VEIL", "B_WEATHER_SANDSTORM"],
      "accuracy-hustle-physical": ["Cmd_accuracycheck", "ABILITY_HUSTLE", "IS_TYPE_PHYSICAL(type)"],
    };
    const rows = [
      ...manifest.coverage.hookCatalogs.item.moveToHookDispatchers,
      ...manifest.coverage.hookCatalogs.ability.moveToHookDispatchers,
    ];
    expect(Object.keys(requiredTokensByCategory)).toHaveLength(rows.length);
    for (const row of rows) {
      expect(requiredTokensByCategory[row.id], `missing source pin for ${row.id}`).toBeDefined();
      for (const token of requiredTokensByCategory[row.id]!) expect(source, `${row.id}: ${token}`).toContain(token);
    }
  });

  it("preserves move-table values while leaving every per-move hook join explicitly unsupported", () => {
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
        expect(hook.status).toBe("unsupported");
        expect(hook.potentialCategories).toBeNull();
        expect(hook.unsupportedCategories).toBeNull();
        expect(hook.reason).toContain("implicit fallthrough");
        expect(hook.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it("does not underclassify source-obvious guard moves through an incomplete named-operand walk", () => {
    const move = (symbol: string) => manifest.moves.find((record) => record.move === symbol)!;
    for (const symbol of [
      "MOVE_THUNDER", "MOVE_SURF", "MOVE_FIRE_PUNCH", "MOVE_TACKLE",
      "MOVE_WILL_O_WISP", "MOVE_ROAR", "MOVE_PROTECT",
    ]) {
      expect(move(symbol).hooks).toMatchObject({
        item: { potentialCategories: null, status: "unsupported" },
        ability: { potentialCategories: null, status: "unsupported" },
      });
    }
  });
});
