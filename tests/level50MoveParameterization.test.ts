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
    item: { potentialCategories: null; status: string; supportedCategories: string[]; unsupportedCategories: null; reason: string };
    ability: {
      potentialCategories: null;
      status: string;
      supportedCategories: string[];
      unsupportedCategories: null;
      reason: string;
      evidence?: {
        category: string;
        selector: { path: string; locator: string; symbol: string; index: number; tableLine: number };
        entryPath: {
          kind: string;
          source: { path: string; entryLine: number };
          graph: { path: string; entryLabel: string; attackCanceler: { label: string; line: number }; route: Array<{ [key: string]: unknown }> };
          program: { path: string; entryLabel: string; attackCanceler: { label: string; line: number }; route: Array<{ [key: string]: unknown }> };
        };
        dispatcher: { path: string; locator: string; line: number; call: string; order: string };
        familyVerification: { scope: string; implementation: string; batchTest: string; oracleReceipt: string; oracleControl: string };
      };
    };
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
const manifest = data as { schema: string; coverage: { level50Roster: { frontierSetIds: { first: number; last: number; count: number }; moveCount: number; moveTableEffectFamilyCount: number }; level50Executable: { moveCount: number; battleScriptEffectFamilyCount: number; rosterOnlyMoveCount: number; rosterOnlyMoveTableEffectFamilyCount: number }; joins: { battleScriptGraphLabels: number; battleScriptProgramLabels: number; animationScripts: number; itemHookCategories: number; abilityHookCategories: number; itemHookUnsupportedCategories: null; abilityHookUnsupportedCategories: null; itemHookUnsupportedRows: number; abilityHookUnsupportedRows: number; abilityHookSourceProvenRows: number }; hookCatalogs: { item: { frontierHeldItemRows: number; explicitHoldEffectRows: number; moveToHookDispatchers: Array<{ id: string; dispatcher: string; selector: string; ownership: string }>; catalogedDispatcherCategories: number; completeness: string; unsupportedCategories: null }; ability: { displayRows: number; moveToHookDispatchers: Array<{ id: string; dispatcher: string; selector: string; ownership: string }>; catalogedDispatcherCategories: number; soundproofSourceSelectorRows: number; soundproofLevel50RosterSelectorRows: number; soundproofSourceProvenRosterRows: number; soundproofUnsupportedLevel50RosterRows: number; completeness: string; unsupportedCategories: null } } }; moves: Record[] };
const sourceMoves = new Map((movesData.moves as SourceMove[]).map((move) => [move.move, move]));

const SOURCE_SOUND_MOVES = [
  "MOVE_GROWL", "MOVE_ROAR", "MOVE_SING", "MOVE_SUPERSONIC", "MOVE_SCREECH",
  "MOVE_SNORE", "MOVE_UPROAR", "MOVE_METAL_SOUND", "MOVE_GRASS_WHISTLE", "MOVE_HYPER_VOICE",
] as const;
const LEVEL50_SOUND_MOVES = SOURCE_SOUND_MOVES.filter((move) => move !== "MOVE_GROWL");
const MOVES_BLOCK_CALL = "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0)";

function sourceSoundMoves(): string[] {
  const source = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
  const match = /static const u16 sSoundMovesTable\[\]\s*=\s*\{([\s\S]*?)\};/.exec(source);
  if (!match) throw new Error("missing source Soundproof selector table");
  return [...match[1]!.matchAll(/\bMOVE_[A-Z0-9_]+\b/g)].map((entry) => entry[0]!);
}

function graphAndProgram() {
  return {
    graph: JSON.parse(readFileSync("src/data/gen/battle-script-graph.json", "utf8")) as {
      labels: Array<{ name: string; line: number; statements: Array<{ line: number; mnemonic: string; operandTokens: string[]; labelOperands: string[] }> }>;
      controlFlow: {
        edges: Array<{ from: { label: string; line: number }; to: { label: string; line: number } | null; kind: string; provenance: { macro?: string } }>;
        conditionalGuards: Array<{ from: { label: string; line: number }; command: { macro: string }; operands: Array<{ parameter: string; token: string }>; takenDestination: { label: string; line: number } | null }>;
      };
    },
    program: JSON.parse(readFileSync("src/data/gen/battle-script-program.json", "utf8")) as {
      blocks: Array<{ label: string; line: number; statements: Array<{ source: { line: number }; mnemonic: string; actualOperands: string[] }> }>;
    },
  };
}

describe("Level-50 move parameterization manifest", () => {
  it("regenerates byte-for-byte into an isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-level50-move-parameterization-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-level50-move-parameterization.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    expect(readFileSync(join(outputDirectory, "level50-move-parameterization.json"), "utf8")).toBe(
      readFileSync("src/data/gen/level50-move-parameterization.json", "utf8"),
    );
  });

  it("enumerates every non-NONE move used by the exact 0..849 Level-50 roster boundary", () => {
    expect(manifest.schema).toBe("level50-move-parameterization/v3");
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
      itemHookCategories: 0, abilityHookCategories: 9,
      itemHookUnsupportedCategories: null, abilityHookUnsupportedCategories: null,
      itemHookUnsupportedRows: 300, abilityHookUnsupportedRows: 291, abilityHookSourceProvenRows: 9,
    });
    expect(manifest.coverage.hookCatalogs).toMatchObject({
      item: {
        frontierHeldItemRows: 63, explicitHoldEffectRows: 70, catalogedDispatcherCategories: 3,
        completeness: "intentionally-partial", unsupportedCategories: null,
      },
      ability: {
        // displayRows follows summary-info.json's species pool (6 anchors → full
        // 376-species rental pool on 2026-08-07, ISSUES #80 gender fix).
        displayRows: 74, catalogedDispatcherCategories: 9, soundproofSourceSelectorRows: 10,
        soundproofLevel50RosterSelectorRows: 9, soundproofSourceProvenRosterRows: 9,
        soundproofUnsupportedLevel50RosterRows: 291, completeness: "intentionally-partial", unsupportedCategories: null,
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

  it("derives the exact Soundproof roster family from source and preserves all other hook gaps", () => {
    const sourceSelectors = sourceSoundMoves();
    expect(sourceSelectors).toEqual(SOURCE_SOUND_MOVES);
    expect(movesData.sourceTables.soundMoves).toEqual(sourceSelectors.map((move) => ({
      move,
      id: sourceMoves.get(move)!.id,
    })));
    const rosterSelectors = sourceSelectors.filter((move) => manifest.moves.some((record) => record.move === move));
    expect(rosterSelectors).toEqual(LEVEL50_SOUND_MOVES);
    expect(sourceSelectors.filter((move) => !rosterSelectors.includes(move))).toEqual(["MOVE_GROWL"]);

    const { graph, program } = graphAndProgram();
    const graphByLabel = new Map(graph.labels.map((label) => [label.name, label]));
    const programByLabel = new Map(program.blocks.map((block) => [block.label, block]));
    const commandSource = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const commandDeclaration = commandSource.indexOf("static void Cmd_attackcanceler(void)");
    const commandStart = commandSource.indexOf("static void Cmd_attackcanceler(void)", commandDeclaration + 1);
    const commandEnd = commandSource.indexOf("static void JumpIfMoveFailed", commandStart);
    const commandBody = commandSource.slice(commandStart, commandEnd);
    expect(commandDeclaration).toBeGreaterThan(0);
    expect(commandStart).toBeGreaterThan(commandDeclaration);
    expect(commandEnd).toBeGreaterThan(commandStart);
    expect(commandBody).toContain(`if (${MOVES_BLOCK_CALL})\n        return;`);
    expect(commandBody.indexOf(MOVES_BLOCK_CALL)).toBeLessThan(commandBody.indexOf("gBattleMons[gBattlerAttacker].pp[gCurrMovePos]"));

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
      expect(record.hooks.item).toMatchObject({
        potentialCategories: null,
        status: "unsupported",
        supportedCategories: [],
        unsupportedCategories: null,
      });
      expect(record.hooks.item.reason).toContain("implicit fallthrough");

      if (!rosterSelectors.includes(record.move as typeof LEVEL50_SOUND_MOVES[number])) {
        expect(record.hooks.ability).toMatchObject({
          potentialCategories: null,
          status: "unsupported",
          supportedCategories: [],
          unsupportedCategories: null,
        });
        expect(record.hooks.ability.reason).toContain("implicit fallthrough");
        expect(record.hooks.ability.evidence).toBeUndefined();
        continue;
      }

      const evidence = record.hooks.ability.evidence;
      if (!evidence) throw new Error(`missing Soundproof evidence for ${record.move}`);
      expect(record.hooks.ability).toMatchObject({
        potentialCategories: null,
        status: "source-proven-family",
        supportedCategories: ["moves-block-soundproof"],
        unsupportedCategories: null,
      });
      expect(record.hooks.ability.reason).toContain("does not claim unrelated ability families");
      expect(evidence).toMatchObject({
        category: "moves-block-soundproof",
        selector: {
          path: "reference/pokeemerald/src/battle_util.c",
          locator: "sSoundMovesTable",
          symbol: record.move,
          index: sourceSelectors.indexOf(record.move),
        },
        dispatcher: {
          path: "reference/pokeemerald/src/battle_script_commands.c",
          locator: "Cmd_attackcanceler",
          call: MOVES_BLOCK_CALL,
          order: "after AtkCanceler_UnableToUseMove and before selected-slot PP admission",
        },
        familyVerification: {
          scope: "This proves only the selected-move ATTACKCANCELER route; Uproar continuation and Perish Song use separate Soundproof paths.",
          implementation: "src/engine/battleScriptAbilityMovesBlock.ts#advanceBattleScriptMovesBlockAbility",
          batchTest: "tests/battleScriptAbilityMovesBlock.test.ts#blocks every and only source sound selector in both singles orientations",
          oracleReceipt: "tests/fixtures/soundproof-off-evidence.json#hyper-voice-blocked-by-soundproof",
          oracleControl: "tests/fixtures/soundproof-off-evidence.json#tackle-control-still-hits-soundproof",
        },
      });
      expect(evidence.entryPath.source.path).toBe("reference/pokeemerald/data/battle_scripts_1.s");
      expect(evidence.entryPath.graph.path).toBe("src/data/gen/battle-script-graph.json");
      expect(evidence.entryPath.program.path).toBe("src/data/gen/battle-script-program.json");
      expect(evidence.entryPath.graph.entryLabel).toBe(record.battleScript.entryScript);
      expect(evidence.entryPath.program.entryLabel).toBe(record.battleScript.entryScript);
      expect(evidence.entryPath.program.route).toEqual(evidence.entryPath.graph.route);

      const graphEntry = graphByLabel.get(record.battleScript.entryScript)!;
      const programEntry = programByLabel.get(record.battleScript.entryScript)!;
      const graphCanceler = graphByLabel.get(evidence.entryPath.graph.attackCanceler.label)!;
      const programCanceler = programByLabel.get(evidence.entryPath.program.attackCanceler.label)!;
      expect(graphEntry).toBeDefined();
      expect(programEntry).toBeDefined();
      expect(graphCanceler.statements[0]).toMatchObject({
        line: evidence.entryPath.graph.attackCanceler.line,
        mnemonic: "attackcanceler",
      });
      expect(programCanceler.statements[0]).toMatchObject({
        source: { line: evidence.entryPath.program.attackCanceler.line },
        mnemonic: "attackcanceler",
      });

      if (evidence.entryPath.kind === "direct-attackcanceler") {
        expect(evidence.entryPath.graph.attackCanceler.label).toBe(record.battleScript.entryScript);
        expect(graphEntry.statements[0]).toMatchObject({ mnemonic: "attackcanceler" });
        expect(programEntry.statements[0]).toMatchObject({ mnemonic: "attackcanceler" });
      } else if (evidence.entryPath.kind === "goto-attackcanceler") {
        const route = evidence.entryPath.graph.route[0]!;
        expect(route).toMatchObject({ kind: "goto", label: record.battleScript.entryScript });
        const line = route.line as number;
        const targetLabel = route.targetLabel as string;
        expect(graphEntry.statements.find((statement) => statement.line === line)).toMatchObject({
          mnemonic: "goto", labelOperands: [targetLabel],
        });
        expect(programEntry.statements.find((statement) => statement.source.line === line)).toMatchObject({
          mnemonic: "goto", actualOperands: [targetLabel],
        });
        expect(graph.controlFlow.edges.find((edge) => (
          edge.from.label === record.battleScript.entryScript
          && edge.from.line === line
          && edge.to?.label === targetLabel
          && edge.to.line === evidence.entryPath.graph.attackCanceler.line
        ))).toMatchObject({
          from: { label: record.battleScript.entryScript, line },
          to: { label: targetLabel, line: evidence.entryPath.graph.attackCanceler.line },
          kind: "jump",
          provenance: expect.objectContaining({ macro: "goto" }),
        });
      } else if (evidence.entryPath.kind === "guarded-jumpifnotmove-attackcanceler") {
        const route = evidence.entryPath.graph.route[0]!;
        expect(route).toMatchObject({
          kind: "jumpifnotmove",
          label: record.battleScript.entryScript,
          currentMove: record.move,
          comparedMove: "MOVE_SURF",
          targetLabel: evidence.entryPath.graph.attackCanceler.label,
          satisfied: true,
        });
        const line = route.line as number;
        expect(graphEntry.statements.find((statement) => statement.line === line)).toMatchObject({
          mnemonic: "jumpifnotmove",
          operandTokens: ["MOVE_SURF", evidence.entryPath.graph.attackCanceler.label],
        });
        expect(programEntry.statements.find((statement) => statement.source.line === line)).toMatchObject({
          mnemonic: "jumpifnotmove",
          actualOperands: ["MOVE_SURF", evidence.entryPath.graph.attackCanceler.label],
        });
        expect(graph.controlFlow.conditionalGuards.find((guard) => (
          guard.from.label === record.battleScript.entryScript
          && guard.from.line === line
          && guard.command.macro === "jumpifnotmove"
          && guard.takenDestination?.label === evidence.entryPath.graph.attackCanceler.label
          && guard.takenDestination.line === evidence.entryPath.graph.attackCanceler.line
        ))).toMatchObject({
          from: { label: record.battleScript.entryScript, line },
          command: { macro: "jumpifnotmove" },
          takenDestination: expect.objectContaining(evidence.entryPath.graph.attackCanceler),
        });
      } else {
        throw new Error(`unknown Soundproof route ${evidence.entryPath.kind}`);
      }
    }

    expect(manifest.moves
      .filter((record) => record.hooks.ability.status === "source-proven-family")
      .sort((left, right) => sourceSelectors.indexOf(left.move) - sourceSelectors.indexOf(right.move))
      .map((record) => record.move))
      .toEqual(LEVEL50_SOUND_MOVES);
    expect(manifest.moves.filter((record) => record.hooks.ability.status === "unsupported")).toHaveLength(291);
    expect(manifest.moves.filter((record) => record.hooks.item.status === "unsupported")).toHaveLength(300);
  });

  it("does not underclassify source-obvious guard moves through an incomplete named-operand walk", () => {
    const move = (symbol: string) => manifest.moves.find((record) => record.move === symbol)!;
    for (const symbol of [
      "MOVE_THUNDER", "MOVE_SURF", "MOVE_FIRE_PUNCH", "MOVE_TACKLE",
      "MOVE_WILL_O_WISP", "MOVE_PROTECT",
    ]) {
      expect(move(symbol).hooks).toMatchObject({
        item: { potentialCategories: null, status: "unsupported" },
        ability: { potentialCategories: null, status: "unsupported" },
      });
    }
  });
});
