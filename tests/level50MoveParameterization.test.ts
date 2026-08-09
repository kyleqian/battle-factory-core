import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };
import frontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };

type RoutePosition = { label: string; line: number };
type RouteTransition = {
  from: RoutePosition;
  to: RoutePosition | null;
  kind: string;
  macro: string | null;
};
type RouteStep = {
  kind: "fallthrough" | "guard" | "goto" | "accuracycheck" | string;
  label: string;
  line: number;
  mnemonic: string;
  operands: string[];
  target?: RoutePosition;
  outcome?: "taken" | "fallthrough";
  condition?: string;
};
type FamilyEvidence = {
  category: string;
  selector: { path: string; locator: string; [key: string]: unknown };
  entryPath: {
    kind?: string;
    source: { path: string; entryLine: number };
    graph: { path: string; entryLabel: string; attackCanceler?: RoutePosition; accuracyCheck?: RoutePosition; route: RouteStep[]; transitions?: RouteTransition[] };
    program: { path: string; entryLabel: string; attackCanceler?: RoutePosition; accuracyCheck?: RoutePosition; route: RouteStep[]; transitions?: RouteTransition[] };
    dataHpUpdate?: { label: string; line: number; mnemonic: string; operands: string[] };
    moveEnd?: { label: string; line: number; state: string; stateValue: number; [key: string]: unknown };
    alternatives?: Array<Record<string, unknown>>;
    assumptions?: string[];
  };
  dispatcher: { path: string; locator: string; line: number; call: string; order: string; [key: string]: unknown };
  familyVerification: { scope: string; implementation: string; batchTest: string; oracleReceipt: string; [key: string]: unknown };
  runtimeGuardSignature?: Record<string, unknown>;
};
type MoveRecord = {
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
      evidence?: { families: FamilyEvidence[] };
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
type AbsorbingCoverage = {
  sourceMoveCandidates: Array<{ move: string; category: string; type: string; power: number; entryScript: string }>;
  sourceProvenRows: string[];
  excludedCandidates: Array<{
    move: string;
    categories: string[];
    reason: string;
    entryPath: {
      graph: {
        route: RouteStep[];
        weatherFlow?: Array<{
          label: string;
          source: { path: string; entryLine: number };
          graph: { path: string; statements: Array<{ line: number; mnemonic: string; operands: string[] }> };
          program: { path: string; statements: Array<{ line: number; mnemonic: string; operands: string[] }> };
        }>;
      };
      program: {
        route: RouteStep[];
        weatherFlow?: Array<{
          label: string;
          source: { path: string; entryLine: number };
          graph: { path: string; statements: Array<{ line: number; mnemonic: string; operands: string[] }> };
          program: { path: string; statements: Array<{ line: number; mnemonic: string; operands: string[] }> };
        }>;
      };
    };
  }>;
};
type OnDamageCandidate = {
  category: string;
  move: string;
  moveId: number;
  effect: string;
  power: number;
  makesContact: boolean;
  entryScript: string;
  routeShapeId: string;
  blockerIds: string[];
  routeWitnessId?: string;
  routeStatus?: string;
};
type OnDamageAudit = {
  status: string;
  categories: Record<string, { selector: string; candidateRows: OnDamageCandidate[]; count: number }>;
  overlap: { definition: string; count: number; moves: string[] };
  sourceDispatcher: {
    moveEnd: { path: string; locator: string; call: string; order: string };
    targetAbilitySelection: { path: string; guard: string };
    targetTurnDamaged: { path: string; definition: string };
    abilityCases: Array<{ ability: string; category: string; selector: string; orderedGuards: string[]; outcome: string }>;
  };
  routeShapeCensus: {
    status: string;
    moveEndTarget: { graph: { statements: Array<{ mnemonic: string; operands: string[] }> }; program: { statements: Array<{ mnemonic: string; operands: string[] }> } };
    entryBlockShapeCounts: Record<string, number>;
    entries: Array<{
      id: string;
      entryScript: string;
      entryBlockShape: string;
      graph: { path: string; statements: Array<{ line: number; mnemonic: string; operands: string[] }> };
      program: { path: string; statements: Array<{ line: number; mnemonic: string; operands: string[] }> };
      candidates: Record<string, string[]>;
      contactRouteWitnessIds: Array<string | undefined>;
      colorChangeRouteWitnessIds: Array<string | undefined>;
      blockerIds: string[];
    }>;
  };
  semanticEvidence: { kernelSiblingBatch: { status: string; test: string; coverage: string }; oracleReceipt: { status: string; profile: string; checked: string } };
  blockers: Array<{ id: string; reason: string }>;
  retiredBlockers: Array<{ id: string; reason: string; fixture: string; probe: string; receipts: string[] }>;
  promotions: { sourceProvenRows: string[]; reason: string };
  contact: {
    status: string;
    selector: string;
    candidateCount: number;
    sourceProvenRows: string[];
    sourceExceptionRows: Array<{ id: string; reason: string }>;
    blockers: Array<{ id: string; reason: string }>;
    retiredBlockers: Array<{ id: string; reason: string }>;
    routeWitnesses: Array<Record<string, any>>;
    runtimeGuardSignature: Record<string, any>;
    promotions: { sourceProvenRows: string[]; reason: string };
  };
  colorChange: {
    status: string;
    selector: string;
    candidateCount: number;
    sourceProvenRows: string[];
    sourceExceptionRows: Array<{ id: string; reason: string }>;
    blockers: Array<{ id: string; reason: string }>;
    retiredBlockers: Array<{ id: string; reason: string }>;
    routeWitnesses: Array<Record<string, any>>;
    runtimeGuardSignature: Record<string, any>;
    promotions: { sourceProvenRows: string[]; reason: string };
  };
};
const manifest = data as unknown as {
  schema: string;
  coverage: {
    level50Roster: { frontierSetIds: { first: number; last: number; count: number }; moveCount: number; moveTableEffectFamilyCount: number };
    level50Executable: { moveCount: number; battleScriptEffectFamilyCount: number; rosterOnlyMoveCount: number; rosterOnlyMoveTableEffectFamilyCount: number };
    joins: { battleScriptGraphLabels: number; battleScriptProgramLabels: number; animationScripts: number; itemHookCategories: number; abilityHookCategories: number; itemHookUnsupportedCategories: null; abilityHookUnsupportedCategories: null; itemHookUnsupportedRows: number; abilityHookUnsupportedRows: number; abilityHookSourceProvenRows: number; itemHookSourceProvenRows: number };
    hookCatalogs: {
      item: { frontierHeldItemRows: number; explicitHoldEffectRows: number; moveToHookDispatchers: Array<{ id: string; dispatcher: string; selector: string; ownership: string }>; catalogedDispatcherCategories: number; completeness: string; unsupportedCategories: null; kingsRock: Record<string, any> };
      ability: { displayRows: number; moveToHookDispatchers: Array<{ id: string; dispatcher: string; selector: string; ownership: string }>; catalogedDispatcherCategories: number; soundproofSourceSelectorRows: number; soundproofLevel50RosterSelectorRows: number; soundproofSourceProvenRosterRows: number; soundproofUnsupportedLevel50RosterRows: number; absorbing: Record<string, AbsorbingCoverage>; onDamage: OnDamageAudit; completeness: string; unsupportedCategories: null };
    };
  };
  moves: MoveRecord[];
};
const sourceMoves = new Map((movesData.moves as SourceMove[]).map((move) => [move.move, move]));

const SOURCE_SOUND_MOVES = [
  "MOVE_GROWL", "MOVE_ROAR", "MOVE_SING", "MOVE_SUPERSONIC", "MOVE_SCREECH",
  "MOVE_SNORE", "MOVE_UPROAR", "MOVE_METAL_SOUND", "MOVE_GRASS_WHISTLE", "MOVE_HYPER_VOICE",
] as const;
const LEVEL50_SOUND_MOVES = SOURCE_SOUND_MOVES.filter((move) => move !== "MOVE_GROWL");
const MOVES_BLOCK_CALL = "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0)";
const ABSORBING_DISPATCHER_CALL = "AbilityBattleEffects(ABILITYEFFECT_ABSORBING, gBattlerTarget, 0, 0, move)";
const ABSORBING_FAMILIES = [
  { category: "absorbing-volt-absorb", type: "TYPE_ELECTRIC", requiresNonzeroPower: true },
  { category: "absorbing-water-absorb", type: "TYPE_WATER", requiresNonzeroPower: true },
  { category: "absorbing-flash-fire", type: "TYPE_FIRE", requiresNonzeroPower: false },
] as const;

function sourceSoundMoves(): string[] {
  const source = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
  const match = /static const u16 sSoundMovesTable\[\]\s*=\s*\{([\s\S]*?)\};/.exec(source);
  if (!match) throw new Error("missing source Soundproof selector table");
  return [...match[1]!.matchAll(/\bMOVE_[A-Z0-9_]+\b/g)].map((entry) => entry[0]!);
}

function graphAndProgram() {
  return {
    graph: JSON.parse(readFileSync("src/data/gen/battle-script-graph.json", "utf8")) as {
      labels: Array<{ name: string; line: number; nextLabel: string | null; statements: Array<{ line: number; mnemonic: string; operandTokens: string[]; labelOperands: string[] }> }>;
      controlFlow: {
        edges: Array<{ from: { label: string; line: number }; to: { label: string; line: number } | null; kind: string; provenance: { macro?: string } }>;
        conditionalGuards: Array<{ from: { label: string; line: number }; command: { macro: string }; operands: Array<{ parameter: string; token: string }>; takenDestination: { label: string; line: number } | null; notTakenSuccessor: { label: string; line: number } | null }>;
      };
    },
    program: JSON.parse(readFileSync("src/data/gen/battle-script-program.json", "utf8")) as {
      blocks: Array<{ label: string; line: number; statements: Array<{ source: { line: number }; mnemonic: string; actualOperands: string[] }> }>;
    },
  };
}

function level50RosterSymbols(): Set<string> {
  return new Set(
    frontierMons.entries
      .filter((set) => set.index <= 849)
      .flatMap((set) => set.moves)
      .filter((move) => move !== "MOVE_NONE"),
  );
}

function sourceAbsorbingCandidates(type: string, requiresNonzeroPower: boolean): string[] {
  const roster = level50RosterSymbols();
  return (movesData.moves as SourceMove[])
    .filter((move) => roster.has(move.move) && move.type === type && (!requiresNonzeroPower || move.power !== 0))
    .map((move) => move.move);
}

function familyFor(record: MoveRecord, category: string): FamilyEvidence {
  const family = record.hooks.ability.evidence?.families.find((candidate) => candidate.category === category);
  if (!family) throw new Error(`${record.move} lacks source-proven ${category} family evidence`);
  return family;
}

function assertAbsorbingRouteWitness(family: FamilyEvidence): void {
  const { graph, program } = graphAndProgram();
  const graphByLabel = new Map(graph.labels.map((label) => [label.name, label]));
  const programByLabel = new Map(program.blocks.map((block) => [block.label, block]));
  const route = family.entryPath.graph.route;
  expect(route).toEqual(family.entryPath.program.route);
  expect(route.length).toBeGreaterThan(0);
  expect(route.at(-1)).toMatchObject({ kind: "accuracycheck", mnemonic: "accuracycheck" });
  for (const step of route) {
    const graphLabel = graphByLabel.get(step.label);
    const programBlock = programByLabel.get(step.label);
    expect(graphLabel, `${step.label} is missing from graph`).toBeDefined();
    expect(programBlock, `${step.label} is missing from program`).toBeDefined();
    const graphStatement = graphLabel!.statements.find((statement) => statement.line === step.line);
    const programStatement = programBlock!.statements.find((statement) => statement.source.line === step.line);
    expect(graphStatement, `${step.label}:${step.line} missing graph statement`).toMatchObject({
      mnemonic: step.mnemonic, operandTokens: step.operands,
    });
    expect(programStatement, `${step.label}:${step.line} missing program statement`).toMatchObject({
      mnemonic: step.mnemonic, actualOperands: step.operands,
    });
    if (step.kind === "accuracycheck") continue;
    if (!step.target) throw new Error(`${step.label}:${step.line} route step has no target`);
    const edge = graph.controlFlow.edges.find((candidate) => (
      candidate.from.label === step.label
      && candidate.from.line === step.line
      && candidate.to?.label === step.target!.label
      && candidate.to.line === step.target!.line
    ));
    expect(edge, `${step.label}:${step.line} lacks an ordered edge to its witness target`).toBeDefined();
    if (step.kind === "fallthrough") {
      expect(edge).toMatchObject({ kind: "fallthrough" });
      continue;
    }
    if (step.kind === "goto") {
      expect(edge).toMatchObject({ kind: "jump", provenance: { macro: "goto" } });
      continue;
    }
    if (step.kind === "guard") {
      expect(step.condition?.trim().length).toBeGreaterThan(0);
      const guard = graph.controlFlow.conditionalGuards.find((candidate) => (
        candidate.from.label === step.label
        && candidate.from.line === step.line
        && candidate.command.macro === step.mnemonic
        && JSON.stringify(candidate.operands.map((operand) => operand.token)) === JSON.stringify(step.operands)
      ));
      expect(guard, `${step.label}:${step.line} lacks its generated guard`).toBeDefined();
      const destination = step.outcome === "taken" ? guard!.takenDestination : guard!.notTakenSuccessor;
      expect(destination).toMatchObject(step.target);
      expect(edge).toMatchObject(step.outcome === "taken"
        ? { kind: "jump", provenance: { macro: step.mnemonic } }
        : { kind: "fallthrough" });
      continue;
    }
    throw new Error(`unexpected absorption route step ${step.kind}`);
  }
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
    expect(manifest.schema).toBe("level50-move-parameterization/v4");
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
      itemHookCategories: 105, abilityHookCategories: 346,
      itemHookUnsupportedCategories: null, abilityHookUnsupportedCategories: null,
      itemHookUnsupportedRows: 195, abilityHookUnsupportedRows: 106, abilityHookSourceProvenRows: 194, itemHookSourceProvenRows: 105,
    });
    expect(manifest.coverage.hookCatalogs).toMatchObject({
      item: {
        frontierHeldItemRows: 63, explicitHoldEffectRows: 70, catalogedDispatcherCategories: 3,
        completeness: "intentionally-partial", unsupportedCategories: null,
      },
      ability: {
        // displayRows follows summary-info.json's species pool (6 anchors → full
        // 376-species rental pool on 2026-08-07, ISSUES #80 gender fix).
        displayRows: 74, catalogedDispatcherCategories: 11, soundproofSourceSelectorRows: 10,
        soundproofLevel50RosterSelectorRows: 9, soundproofSourceProvenRosterRows: 9,
        soundproofUnsupportedLevel50RosterRows: 291, completeness: "intentionally-partial", unsupportedCategories: null,
      },
    });
    expect(manifest.coverage.hookCatalogs.item.moveToHookDispatchers.map((hook) => hook.id)).toEqual([
      "selection-choice-band", "accuracy-target-evasion-item", "moveend-kings-rock",
    ]);
    expect(manifest.coverage.hookCatalogs.ability.moveToHookDispatchers.map((hook) => hook.id)).toEqual([
      "moves-block-soundproof", "absorbing-volt-absorb", "absorbing-water-absorb", "absorbing-flash-fire",
      "moveend-contact-on-damage", "moveend-color-change",
      "moveend-synchronize-status",
      "tryinfatuating-oblivious",
      "accuracy-compound-eyes", "accuracy-sand-veil", "accuracy-hustle-physical",
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
      "moveend-synchronize-status": ["ABILITYEFFECT_SYNCHRONIZE", "ABILITYEFFECT_ATK_SYNCHRONIZE", "HITMARKER_SYNCHRONIZE_EFFECT", "MOVEEND_SYNCHRONIZE_TARGET", "MOVEEND_SYNCHRONIZE_ATTACKER"],
      "tryinfatuating-oblivious": ["Cmd_tryinfatuating", "ABILITY_OBLIVIOUS", "BattleScript_ObliviousPreventsAttraction", "STATUS2_INFATUATED_WITH"],
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

  it("ratchets the finite ON_DAMAGE candidates and promotes contact plus Color Change with an explicit Future Sight exception", () => {
    const audit = manifest.coverage.hookCatalogs.ability.onDamage;
    const roster = level50RosterSymbols();
    const expectedByCategory: Record<string, string[]> = {
      "moveend-contact-on-damage": (movesData.moves as SourceMove[])
        .filter((move) => roster.has(move.move) && move.flags.includes("FLAG_MAKES_CONTACT"))
        .map((move) => move.move),
      "moveend-color-change": (movesData.moves as SourceMove[])
        .filter((move) => roster.has(move.move) && move.power !== 0)
        .map((move) => move.move),
    };
    const blockerIds = audit.blockers.map((blocker) => blocker.id);
    expect(audit.status).toBe("family-level-color-change-and-contact-promotion");
    expect(blockerIds).toEqual([]);
    expect(audit.retiredBlockers).toEqual(expect.arrayContaining([expect.objectContaining({
      id: "missing-direct-on-damage-off-receipt",
      fixture: "tools/battle-lab/mechanic-color-change-off.json",
      probe: "tools/probe/probe-color-change-ability-off.py",
      receipts: [
        "tools/probe/receipts/color-change-off-seed-610839776.json",
        "tools/probe/receipts/color-change-off-seed-324508639.json",
      ],
    }), expect.objectContaining({ id: "ordered-moveend-route-not-proven" }), expect.objectContaining({ id: "damage-state-guard-not-derived-from-selector" })]));
    expect(audit.retiredBlockers).toHaveLength(3);
    expect(blockerIds.every((id) => id.length > 0)).toBe(true);
    expect(audit.promotions.sourceProvenRows).toHaveLength(182);
    expect(audit.promotions.reason).toMatch(/all 94 contact rows are promoted/);
    expect(audit.contact).toMatchObject({
      status: "source-proven-family",
      selector: "moves.json flags includes FLAG_MAKES_CONTACT",
      candidateCount: 94,
      sourceProvenRows: expect.any(Array),
      sourceExceptionRows: [],
      blockers: [],
      retiredBlockers: [
        expect.objectContaining({ id: "ordered-moveend-route-not-proven" }),
        expect.objectContaining({ id: "damage-state-guard-not-derived-from-selector" }),
      ],
    });
    expect(audit.contact.sourceProvenRows).toHaveLength(94);
    expect(audit.contact.routeWitnesses).toHaveLength(94);
    expect(audit.colorChange).toMatchObject({
      status: "source-proven-family",
      selector: "moves.json power != 0",
      candidateCount: 183,
      sourceProvenRows: expect.arrayContaining(expectedByCategory["moveend-color-change"]!.filter((move) => move !== "MOVE_FUTURE_SIGHT")),
      sourceExceptionRows: [expect.objectContaining({ id: "future-sight-delayed-moveend-bypass" })],
      blockers: [],
      retiredBlockers: [
        expect.objectContaining({ id: "ordered-moveend-route-not-proven" }),
        expect.objectContaining({ id: "damage-state-guard-not-derived-from-selector" }),
      ],
    });
    expect(audit.colorChange.sourceProvenRows).toHaveLength(182);
    expect(audit.colorChange.routeWitnesses).toHaveLength(183);
    expect(audit.colorChange.runtimeGuardSignature).toMatchObject({
      selector: { guard: "gBattleMoves[move].power != 0", derivedFrom: "moveend-color-change candidate selector moves.json power != 0" },
      moveEnd: { state: "MOVEEND_ON_DAMAGE_ABILITIES", stateValue: 3, target: "gBattlerTarget" },
      dataHpUpdate: { target: "BS_TARGET", writes: expect.arrayContaining([
        "gSpecialStatuses[gActiveBattler].physicalDmg = gHpDealt",
        "gSpecialStatuses[gActiveBattler].specialDmg = gHpDealt",
      ]) },
      orderedAbilityGuards: expect.arrayContaining([
        "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
        "move != MOVE_STRUGGLE",
        "gBattleMoves[move].power != 0",
        "TARGET_TURN_DAMAGED",
        "!IS_BATTLER_OF_TYPE(battler, moveType)",
        "gBattleMons[battler].hp != 0",
      ]),
    });

    for (const [category, expectedMoves] of Object.entries(expectedByCategory)) {
      const coverage = audit.categories[category]!;
      const expectedBlockerIds: string[] = [];
      expect(coverage.count).toBe(expectedMoves.length);
      expect(coverage.candidateRows.map((candidate) => candidate.move)).toEqual(expectedMoves);
      expect(new Set(coverage.candidateRows.map((candidate) => candidate.move)).size).toBe(expectedMoves.length);
      for (const candidate of coverage.candidateRows) {
        const source = sourceMoves.get(candidate.move)!;
        const record = manifest.moves.find((move) => move.move === candidate.move)!;
        expect(candidate).toMatchObject({
          category,
          moveId: source.id,
          effect: source.effect,
          power: source.power,
          makesContact: source.flags.includes("FLAG_MAKES_CONTACT"),
          entryScript: record.battleScript.entryScript,
          routeShapeId: `on-damage-entry:${record.battleScript.entryScript}`,
          blockerIds: expectedBlockerIds,
        });
        expect(candidate.blockerIds).toEqual(expectedBlockerIds);
        if (category === "moveend-color-change") {
          expect(candidate.routeWitnessId).toBe(`color-change-route:${candidate.move}`);
          expect(candidate.routeStatus).toBe(candidate.move === "MOVE_FUTURE_SIGHT" ? "source-exception" : "source-proven");
        } else {
          expect(candidate.routeWitnessId).toBe(`contact-route:${candidate.move}`);
          expect(candidate.routeStatus).toBe("source-proven");
        }
      }
    }
    expect(audit.categories["moveend-contact-on-damage"]!.count).toBe(94);
    expect(audit.categories["moveend-color-change"]!.count).toBe(183);
    const expectedOverlap = expectedByCategory["moveend-contact-on-damage"]!
      .filter((move) => expectedByCategory["moveend-color-change"]!.includes(move));
    expect(audit.overlap).toEqual({
      definition: "moves satisfying both FLAG_MAKES_CONTACT and power != 0",
      count: expectedOverlap.length,
      moves: expectedOverlap,
    });
    expect(expectedOverlap).toHaveLength(94);

    const candidates = Object.values(audit.categories).flatMap((coverage) => coverage.candidateRows);
    expect(candidates).toHaveLength(277);
    expect(new Set(candidates.map((candidate) => `${candidate.category}:${candidate.move}`)).size).toBe(candidates.length);
    const { graph, program } = graphAndProgram();
    const expectedEntryScripts = [...new Set(candidates.map((candidate) => candidate.entryScript))]
      .sort((left, right) => graph.labels.find((label) => label.name === left)!.line - graph.labels.find((label) => label.name === right)!.line);
    expect(audit.routeShapeCensus.status).toBe("source-program-route-witness-for-color-change-and-contact-families");
    expect(audit.routeShapeCensus.entries.map((entry) => entry.entryScript)).toEqual(expectedEntryScripts);
    expect(audit.routeShapeCensus.entries).toHaveLength(78);
    expect(audit.routeShapeCensus.entryBlockShapeCounts).toEqual({
      "call-return-entry-block": 3,
      "conditional-entry-block": 22,
      "fallthrough-entry-block": 6,
      "goto-entry-block": 47,
    });
    for (const entry of audit.routeShapeCensus.entries) {
      const graphEntry = graph.labels.find((label) => label.name === entry.entryScript)!;
      const programEntry = program.blocks.find((block) => block.label === entry.entryScript)!;
      expect(entry.id).toBe(`on-damage-entry:${entry.entryScript}`);
      expect(entry.graph).toMatchObject({
        path: "src/data/gen/battle-script-graph.json",
        statements: graphEntry.statements.map((statement) => ({ line: statement.line, mnemonic: statement.mnemonic, operands: statement.operandTokens })),
      });
      expect(entry.program).toMatchObject({
        path: "src/data/gen/battle-script-program.json",
        statements: programEntry.statements.map((statement) => ({ line: statement.source.line, mnemonic: statement.mnemonic, operands: statement.actualOperands })),
      });
      expect(entry.blockerIds).toEqual([]);
      expect(entry.contactRouteWitnessIds).toEqual(candidates
        .filter((candidate) => candidate.category === "moveend-contact-on-damage" && candidate.entryScript === entry.entryScript)
        .map((candidate) => candidate.routeWitnessId));
      expect(entry.colorChangeRouteWitnessIds).toEqual(candidates
        .filter((candidate) => candidate.category === "moveend-color-change" && candidate.entryScript === entry.entryScript)
        .map((candidate) => candidate.routeWitnessId));
      for (const category of Object.keys(expectedByCategory)) {
        expect(entry.candidates[category]).toEqual(candidates
          .filter((candidate) => candidate.category === category && candidate.entryScript === entry.entryScript)
          .map((candidate) => candidate.move));
      }
    }
    expect(audit.routeShapeCensus.moveEndTarget.graph.statements.map((statement) => ({ mnemonic: statement.mnemonic, operands: statement.operands }))).toEqual([
      { mnemonic: "moveendall", operands: [] },
      { mnemonic: "end", operands: [] },
    ]);
    expect(audit.routeShapeCensus.moveEndTarget.program.statements).toEqual(audit.routeShapeCensus.moveEndTarget.graph.statements);

    const utilitySource = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
    const commandSource = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const headerSource = readFileSync("reference/pokeemerald/include/battle.h", "utf8");
    expect(audit.sourceDispatcher.moveEnd).toMatchObject({
      path: "reference/pokeemerald/src/battle_script_commands.c",
      locator: "Cmd_moveend MOVEEND_ON_DAMAGE_ABILITIES",
      call: "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE, gBattlerTarget, 0, 0, 0)",
    });
    expect(commandSource).toContain(audit.sourceDispatcher.moveEnd.call);
    expect(audit.sourceDispatcher.targetAbilitySelection).toMatchObject({
      path: "reference/pokeemerald/src/battle_util.c",
      guard: expect.stringMatching(/gBattlerTarget/),
    });
    expect(headerSource).toContain(audit.sourceDispatcher.targetTurnDamaged.definition);
    expect(audit.sourceDispatcher.abilityCases.map((entry) => entry.ability)).toEqual([
      "ABILITY_COLOR_CHANGE", "ABILITY_ROUGH_SKIN", "ABILITY_EFFECT_SPORE", "ABILITY_POISON_POINT",
      "ABILITY_STATIC", "ABILITY_FLAME_BODY", "ABILITY_CUTE_CHARM",
    ]);
    for (const ability of audit.sourceDispatcher.abilityCases) {
      const start = utilitySource.indexOf(`case ${ability.ability}:`);
      const next = utilitySource.indexOf("            case ", start + 1);
      const caseSource = utilitySource.slice(start, next < 0 ? undefined : next);
      let previous = -1;
      for (const guard of ability.orderedGuards) {
        const position = caseSource.indexOf(guard, previous + 1);
        expect(position, `${ability.ability} guard ${guard}`).toBeGreaterThan(previous);
        previous = position;
      }
      expect(ability.outcome.length).toBeGreaterThan(0);
    }
    expect(audit.semanticEvidence.kernelSiblingBatch).toMatchObject({
      status: "tier1-shared-dispatcher-semantics",
      test: "tests/battleScriptMoveEndOpcode.test.ts#MOVEEND_ON_DAMAGE_ABILITIES contact family",
    });
    expect(audit.semanticEvidence.oracleReceipt).toMatchObject({
      status: "direct-parameterized-oracle-receipt",
      profile: "battle-scene-off",
      fixture: "tools/battle-lab/mechanic-color-change-off.json",
      probe: "tools/probe/probe-color-change-ability-off.py",
    });

    const colorWitnessByMove = new Map(audit.colorChange.routeWitnesses.map((witness) => [witness.move, witness]));
    expect(audit.colorChange.sourceExceptionRows.map((exception) => exception.id)).toEqual(["future-sight-delayed-moveend-bypass"]);
    for (const move of expectedByCategory["moveend-color-change"]!) {
      const witness = colorWitnessByMove.get(move)!;
      expect(witness.id).toBe(`color-change-route:${move}`);
      if (move === "MOVE_FUTURE_SIGHT") {
        expect(witness).toMatchObject({ status: "source-exception", exception: {
          id: "future-sight-delayed-moveend-bypass",
          delayedMoveEnd: { mnemonic: "moveendfromto", operands: ["MOVEEND_ITEM_EFFECTS_ALL", "MOVEEND_UPDATE_LAST_MOVES"] },
          bypassedState: { state: "MOVEEND_ON_DAMAGE_ABILITIES", value: 3, startsAt: "MOVEEND_ITEM_EFFECTS_ALL" },
        } });
        expect(witness.exception.delayedDamagePath.graph.route).toEqual(witness.exception.delayedDamagePath.program.route);
        expect(witness.exception.delayedDamagePath.graph.route).toEqual(expect.arrayContaining([
          expect.objectContaining({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] }),
        ]));
        continue;
      }
      expect(audit.colorChange.sourceProvenRows).toContain(move);
      const family = witness.familyEvidence as FamilyEvidence;
      expect(family.category).toBe("moveend-color-change");
      expect(family.entryPath.graph.route).toEqual(family.entryPath.program.route);
      expect(family.entryPath.graph.route).toEqual(expect.arrayContaining([
        expect.objectContaining({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] }),
      ]));
      expect(family.entryPath.dataHpUpdate).toMatchObject({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] });
      expect(family.entryPath.moveEnd).toMatchObject({ state: "MOVEEND_ON_DAMAGE_ABILITIES", stateValue: 3 });
      expect(family.runtimeGuardSignature).toEqual(audit.colorChange.runtimeGuardSignature);
      expect(family.familyVerification).toMatchObject({
        batchTest: "tests/battleScriptMoveEndOpcode.test.ts#MOVEEND_ON_DAMAGE_ABILITIES contact family",
        oracleReceipt: "tests/colorChangeOracleEvidence.test.ts#shared ON_DAMAGE Color Change arm",
        oracleFixture: "tools/battle-lab/mechanic-color-change-off.json",
      });
      if (move === "MOVE_BIDE") expect(family.entryPath.alternatives).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "bide-charge-no-damage" }),
      ]));
      if (move === "MOVE_PRESENT") expect(family.entryPath.alternatives).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "present-negative-damage-heal" }),
        expect.objectContaining({ kind: "present-full-hp-heal-failure" }),
      ]));
      const record = manifest.moves.find((candidate) => candidate.move === move)!;
      expect(record.hooks.ability.supportedCategories).toContain("moveend-color-change");
    }
  });

  it("ratchets every source-proven Color Change certificate onto its successful-damage arm", () => {
    const audit = manifest.coverage.hookCatalogs.ability.onDamage;
    const witnesses = audit.colorChange.routeWitnesses
      .filter((witness) => witness.status === "source-proven");
    expect(witnesses).toHaveLength(182);
    expect(audit.colorChange.sourceExceptionRows.map((exception) => exception.id)).toEqual([
      "future-sight-delayed-moveend-bypass",
    ]);

    let checkedBranches = 0;
    let missOrNoEffectBranches = 0;
    for (const witness of witnesses) {
      const family = witness.familyEvidence as FamilyEvidence;
      const graph = family.entryPath.graph;
      const program = family.entryPath.program;
      expect(graph.transitions, `${witness.move} graph/program transition parity`).toEqual(program.transitions);
      const transitionBySource = new Map((graph.transitions ?? []).map((transition) => [
        `${transition.from.label}:${transition.from.line}`,
        transition,
      ]));

      for (const step of graph.route) {
        const isFocusPunchSetup = witness.move === "MOVE_FOCUS_PUNCH"
          && step.label === "BattleScript_EffectFocusPunch"
          && step.line === 2262
          && step.mnemonic === "jumpifnodamage";
        const requiredKind = step.mnemonic === "accuracycheck" || step.mnemonic === "jumpifmovehadnoeffect"
          ? "fallthrough"
          : isFocusPunchSetup ? "jump" : null;
        if (requiredKind !== null) {
          checkedBranches += 1;
          if (!isFocusPunchSetup) missOrNoEffectBranches += 1;
          const transition = transitionBySource.get(`${step.label}:${step.line}`);
          expect(transition, `${witness.move} ${step.label}:${step.line} needs its successful arm`).toBeDefined();
          expect(transition, `${witness.move} ${step.mnemonic} must not take its miss/no-effect arm`).toMatchObject({
            kind: requiredKind,
          });
        }
        if (step.mnemonic === "jumpifbyte"
          && step.operands.includes("gMoveResultFlags")
          && step.operands.some((operand) => operand.includes("MOVE_RESULT_NO_EFFECT"))) {
          throw new Error(`${witness.move} has an unmodeled direct MOVE_RESULT_NO_EFFECT route at ${step.label}:${step.line}`);
        }
        if (step.mnemonic === "jumpifnodamage" && !isFocusPunchSetup) {
          throw new Error(`${witness.move} has an unmodeled jumpifnodamage route at ${step.label}:${step.line}`);
        }
      }
    }
    // 181 accuracy checks + 19 source-spelled no-effect guards, plus Focus
    // Punch's one explicitly inverted pre-use cancellation condition.
    expect(checkedBranches).toBe(201);
    expect(missOrNoEffectBranches).toBe(200);

    const endeavor = witnesses.find((witness) => witness.move === "MOVE_ENDEAVOR");
    expect(endeavor).toBeDefined();
    const endeavorRoute = (endeavor!.familyEvidence as FamilyEvidence).entryPath.graph.route;
    const noEffectIndex = endeavorRoute.findIndex((step) => (
      step.label === "BattleScript_EffectEndeavor"
      && step.line === 2487
      && step.mnemonic === "jumpifmovehadnoeffect"
    ));
    expect(noEffectIndex).toBeGreaterThanOrEqual(0);
    expect(endeavorRoute.slice(noEffectIndex, noEffectIndex + 5).map((step) => ({
      line: step.line,
      mnemonic: step.mnemonic,
      operands: step.operands,
    }))).toEqual([
      { line: 2487, mnemonic: "jumpifmovehadnoeffect", operands: ["BattleScript_HitFromAtkAnimation"] },
      { line: 2488, mnemonic: "bicbyte", operands: ["gMoveResultFlags", "MOVE_RESULT_SUPER_EFFECTIVE | MOVE_RESULT_NOT_VERY_EFFECTIVE"] },
      { line: 2489, mnemonic: "copyword", operands: ["gBattleMoveDamage", "gHpDealt"] },
      { line: 2490, mnemonic: "adjustsetdamage", operands: [] },
      { line: 2491, mnemonic: "goto", operands: ["BattleScript_HitFromAtkAnimation"] },
    ]);
  });

  it("derives the Soundproof and shared-absorbing families from source without claiming other ability joins", () => {
    const sourceSelectors = sourceSoundMoves();
    expect(sourceSelectors).toEqual(SOURCE_SOUND_MOVES);
    expect(movesData.sourceTables.soundMoves).toEqual(sourceSelectors.map((move) => ({
      move,
      id: sourceMoves.get(move)!.id,
    })));
    const rosterSelectors = sourceSelectors.filter((move) => manifest.moves.some((record) => record.move === move));
    expect(rosterSelectors).toEqual(LEVEL50_SOUND_MOVES);
    expect(sourceSelectors.filter((move) => !rosterSelectors.includes(move))).toEqual(["MOVE_GROWL"]);

    const expectedCandidates: Record<string, string[]> = {
      "absorbing-volt-absorb": ["MOVE_THUNDER_PUNCH", "MOVE_THUNDERBOLT", "MOVE_THUNDER", "MOVE_ZAP_CANNON", "MOVE_SPARK", "MOVE_SHOCK_WAVE"],
      "absorbing-water-absorb": ["MOVE_WATER_GUN", "MOVE_HYDRO_PUMP", "MOVE_SURF", "MOVE_BUBBLE_BEAM", "MOVE_WATERFALL", "MOVE_CLAMP", "MOVE_CRABHAMMER", "MOVE_OCTAZOOKA", "MOVE_WHIRLPOOL", "MOVE_DIVE", "MOVE_WATER_SPOUT", "MOVE_MUDDY_WATER", "MOVE_WATER_PULSE"],
      "absorbing-flash-fire": ["MOVE_FIRE_PUNCH", "MOVE_EMBER", "MOVE_FLAMETHROWER", "MOVE_FIRE_SPIN", "MOVE_FIRE_BLAST", "MOVE_FLAME_WHEEL", "MOVE_SUNNY_DAY", "MOVE_HEAT_WAVE", "MOVE_WILL_O_WISP", "MOVE_ERUPTION", "MOVE_BLAZE_KICK", "MOVE_OVERHEAT"],
    };
    const expectedGuards: Record<string, string> = {
      "absorbing-volt-absorb": "moveType == TYPE_ELECTRIC && gBattleMoves[move].power != 0",
      "absorbing-water-absorb": "moveType == TYPE_WATER && gBattleMoves[move].power != 0",
      "absorbing-flash-fire": "moveType == TYPE_FIRE && !(gBattleMons[battler].status1 & STATUS1_FREEZE)",
    };
    const expectedExcluded: Record<string, string[]> = {
      "absorbing-volt-absorb": [],
      "absorbing-water-absorb": [],
      "absorbing-flash-fire": ["MOVE_SUNNY_DAY"],
    };
    const commandSource = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const battleUtilSource = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
    const battleScriptLines = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8").split("\n");
    expect(commandSource).toContain("JumpIfMoveFailed(7, move);");
    expect(commandSource).toContain(`TrySetDestinyBondToHappen();\n        if (${ABSORBING_DISPATCHER_CALL})\n            return;`);

    const expectedSourceProven = new Map<string, string[]>(LEVEL50_SOUND_MOVES.map((move) => [move, ["moves-block-soundproof"]]));
    for (const definition of ABSORBING_FAMILIES) {
      const candidates = sourceAbsorbingCandidates(definition.type, definition.requiresNonzeroPower);
      expect(candidates).toEqual(expectedCandidates[definition.category]);
      const coverage = manifest.coverage.hookCatalogs.ability.absorbing[definition.category]!;
      expect(coverage.sourceMoveCandidates.map((row) => row.move)).toEqual(candidates);
      expect(coverage.sourceMoveCandidates.map((row) => ({ type: row.type, power: row.power }))).toEqual(
        candidates.map((move) => ({ type: sourceMoves.get(move)!.type, power: sourceMoves.get(move)!.power })),
      );
      expect(coverage.excludedCandidates.map((row) => row.move)).toEqual(expectedExcluded[definition.category]);
      const proven = candidates.filter((move) => !expectedExcluded[definition.category].includes(move));
      expect(coverage.sourceProvenRows).toEqual(proven);
      for (const move of proven) {
        expectedSourceProven.set(move, [...(expectedSourceProven.get(move) ?? []), definition.category]);
        const record = manifest.moves.find((candidate) => candidate.move === move)!;
        const family = familyFor(record, definition.category);
        expect(family.selector).toMatchObject({
          path: "reference/pokeemerald/src/battle_util.c",
          ability: definition.category === "absorbing-volt-absorb" ? "ABILITY_VOLT_ABSORB" : definition.category === "absorbing-water-absorb" ? "ABILITY_WATER_ABSORB" : "ABILITY_FLASH_FIRE",
          moveType: definition.type,
          requiresNonzeroPower: definition.requiresNonzeroPower,
          sourceGuard: expectedGuards[definition.category],
        });
        expect(battleUtilSource).toContain(expectedGuards[definition.category]);
        expect(family.entryPath).toMatchObject({
          kind: "accuracycheck-jump-if-move-failed",
          source: { path: "reference/pokeemerald/data/battle_scripts_1.s", entryLine: expect.any(Number) },
          graph: { path: "src/data/gen/battle-script-graph.json", entryLabel: record.battleScript.entryScript },
          program: { path: "src/data/gen/battle-script-program.json", entryLabel: record.battleScript.entryScript },
        });
        expect(battleScriptLines[family.entryPath.source.entryLine - 1]).toContain(record.battleScript.entryScript);
        expect(family.entryPath.assumptions).toEqual(expect.arrayContaining([
          expect.stringMatching(/Cmd_attackcanceler/),
          expect.stringMatching(/MOVE_RESULT_NO_EFFECT/),
        ]));
        expect(family.dispatcher).toMatchObject({
          path: "reference/pokeemerald/src/battle_script_commands.c",
          locator: "JumpIfMoveFailed",
          call: ABSORBING_DISPATCHER_CALL,
          order: "after TrySetDestinyBondToHappen and before gBattlescriptCurrInstr = BS_ptr",
          accuracyCheck: { locator: "Cmd_accuracycheck", call: "JumpIfMoveFailed(7, move)" },
        });
        expect(family.familyVerification).toMatchObject({
          implementation: "src/engine/battleScriptHitChainOpcode.ts#advancePastAccuracyCheck",
          batchTest: "tests/battleScriptHitChainOpcode.test.ts#AbilityBattleEffects(ABILITYEFFECT_ABSORBING)",
          oracleFixture: "tools/battle-lab/mechanic-absorbing-volt-absorb-off.json",
          oracleProbe: "tools/probe/probe-absorbing-ability-off.py",
        });
        expect(family.familyVerification.scope).toMatch(/not fabricate per-move oracle receipts/);
        expect(String(family.familyVerification.targetStateGuard)).not.toHaveLength(0);
        for (const receipt of family.familyVerification.oracleReceiptFiles as string[]) expect(readFileSync(receipt, "utf8").length).toBeGreaterThan(0);
        assertAbsorbingRouteWitness(family);
      }
      for (const exclusion of coverage.excludedCandidates) {
        expect(exclusion.categories).toEqual([definition.category]);
        expect(exclusion.reason).toMatch(/without an accuracycheck or JumpIfMoveFailed absorbing handoff/);
        expect(exclusion.entryPath.graph.route).toEqual(exclusion.entryPath.program.route);
        expect(exclusion.entryPath.graph.route.map((step) => step.mnemonic)).not.toContain("accuracycheck");
        const weatherFlow = exclusion.entryPath.graph.weatherFlow;
        expect(weatherFlow?.map((block) => block.label)).toEqual([
          "BattleScript_MoveWeatherChange",
          "BattleScript_WeatherFormChanges",
          "BattleScript_WeatherFormChangesLoop",
        ]);
        expect(exclusion.entryPath.program.weatherFlow).toEqual(weatherFlow);
        for (const block of weatherFlow ?? []) {
          expect(block.source.path).toBe("reference/pokeemerald/data/battle_scripts_1.s");
          expect(block.graph.path).toBe("src/data/gen/battle-script-graph.json");
          expect(block.program.path).toBe("src/data/gen/battle-script-program.json");
          expect(block.graph.statements).toEqual(block.program.statements);
          expect(block.graph.statements.map((statement) => statement.mnemonic)).not.toContain("accuracycheck");
        }
        expect(weatherFlow?.[0]?.graph.statements.at(-1)).toEqual({
          line: 1755,
          mnemonic: "goto",
          operands: ["BattleScript_MoveEnd"],
        });
        expect(weatherFlow?.[2]?.graph.statements).toEqual(expect.arrayContaining([
          expect.objectContaining({ mnemonic: "jumpifbytenotequal", operands: ["sBATTLER", "gBattlersCount", "BattleScript_WeatherFormChangesLoop"] }),
          expect.objectContaining({ mnemonic: "return", operands: [] }),
        ]));
      }
    }

    for (const move of (movesData.moves as SourceMove[])
      .filter((candidate) => level50RosterSymbols().has(candidate.move) && candidate.flags.includes("FLAG_MAKES_CONTACT"))
      .map((candidate) => candidate.move)) {
      expectedSourceProven.set(move, [...(expectedSourceProven.get(move) ?? []), "moveend-contact-on-damage"]);
    }

    for (const move of (movesData.moves as SourceMove[])
      .filter((candidate) => level50RosterSymbols().has(candidate.move) && candidate.power !== 0 && candidate.move !== "MOVE_FUTURE_SIGHT")
      .map((candidate) => candidate.move)) {
      expectedSourceProven.set(move, [...(expectedSourceProven.get(move) ?? []), "moveend-color-change"]);
    }

    for (const move of (movesData.moves as SourceMove[])
      .filter((candidate) => level50RosterSymbols().has(candidate.move) && candidate.effect === "EFFECT_ATTRACT")
      .map((candidate) => candidate.move)) {
      expectedSourceProven.set(move, [...(expectedSourceProven.get(move) ?? []), "tryinfatuating-oblivious"]);
    }

    const synchronizeEntryLabels = new Set([
      "BattleScript_EffectPoisonHit", "BattleScript_EffectBurnHit", "BattleScript_EffectParalyzeHit",
      "BattleScript_EffectToxic", "BattleScript_EffectParalyze", "BattleScript_EffectThawHit",
      "BattleScript_EffectThunder", "BattleScript_EffectWillOWisp", "BattleScript_EffectTriAttack",
      "BattleScript_EffectTwineedle", "BattleScript_EffectSecretPower", "BattleScript_EffectPoisonFang",
      "BattleScript_EffectSemiInvulnerable",
    ]);
    for (const move of (movesData.moves as SourceMove[])
      .filter((candidate) => {
        if (!level50RosterSymbols().has(candidate.move)) return false;
        const entryScript = topologyData.moves.find((topologyMove) => topologyMove.move === candidate.move)?.entryScript;
        return synchronizeEntryLabels.has(entryScript ?? "")
          && (entryScript !== "BattleScript_EffectSemiInvulnerable" || candidate.move === "MOVE_BOUNCE");
      })
      .map((candidate) => candidate.move)) {
      expectedSourceProven.set(move, [...(expectedSourceProven.get(move) ?? []), "moveend-synchronize-status"]);
    }

    const { graph, program } = graphAndProgram();
    const graphByLabel = new Map(graph.labels.map((label) => [label.name, label]));
    const programByLabel = new Map(program.blocks.map((block) => [block.label, block]));
    const commandDeclaration = commandSource.indexOf("static void Cmd_attackcanceler(void)");
    const commandStart = commandSource.indexOf("static void Cmd_attackcanceler(void)", commandDeclaration + 1);
    const commandEnd = commandSource.indexOf("static void JumpIfMoveFailed", commandStart);
    const commandBody = commandSource.slice(commandStart, commandEnd);
    expect(commandBody).toContain(`if (${MOVES_BLOCK_CALL})\n        return;`);
    expect(commandBody.indexOf(MOVES_BLOCK_CALL)).toBeLessThan(commandBody.indexOf("gBattleMons[gBattlerAttacker].pp[gCurrMovePos]"));
    for (const move of LEVEL50_SOUND_MOVES) {
      const record = manifest.moves.find((candidate) => candidate.move === move)!;
      const family = familyFor(record, "moves-block-soundproof");
      expect(family.selector).toMatchObject({ path: "reference/pokeemerald/src/battle_util.c", locator: "sSoundMovesTable", symbol: move, index: sourceSelectors.indexOf(move) });
      expect(family.dispatcher).toMatchObject({ path: "reference/pokeemerald/src/battle_script_commands.c", locator: "Cmd_attackcanceler", call: MOVES_BLOCK_CALL });
      expect(family.entryPath.program.route).toEqual(family.entryPath.graph.route);
      const canceler = family.entryPath.graph.attackCanceler;
      if (!canceler) throw new Error(`${move} lacks Soundproof attackcanceler witness`);
      expect(graphByLabel.get(canceler.label)?.statements[0]).toMatchObject({ line: canceler.line, mnemonic: "attackcanceler" });
      expect(programByLabel.get(canceler.label)?.statements[0]).toMatchObject({ source: { line: canceler.line }, mnemonic: "attackcanceler" });
    }

    for (const record of manifest.moves) {
      const source = sourceMoves.get(record.move)!;
      expect(record.id).toBe(source.id);
      expect(record.moveTable.type).toBe(source.type);
      expect(record.battleScript).toMatchObject({ entryScript: expect.stringMatching(/^BattleScript_/), graphLabel: record.battleScript.entryScript, programLabel: record.battleScript.entryScript });
      const kingsRockCandidate = source.flags.includes("FLAG_KINGS_ROCK_AFFECTED") && source.power !== 0;
      expect(record.hooks.item).toMatchObject(kingsRockCandidate
        ? { status: "source-proven-family", supportedCategories: ["moveend-kings-rock"] }
        : { status: "unsupported", supportedCategories: [] });
      const expectedCategories = expectedSourceProven.get(record.move) ?? [];
      if (expectedCategories.length === 0) {
        expect(record.hooks.ability).toMatchObject({ status: "unsupported", supportedCategories: [] });
        expect(record.hooks.ability.evidence).toBeUndefined();
      } else {
        expect(record.hooks.ability).toMatchObject({ status: "source-proven-family", supportedCategories: expectedCategories });
        expect(record.hooks.ability.reason).toContain("does not claim unrelated ability families");
        expect(record.hooks.ability.evidence?.families.map((family) => family.category)).toEqual(expectedCategories);
      }
    }
    expect(manifest.moves.filter((record) => record.hooks.ability.status === "unsupported")).toHaveLength(106);
    expect(manifest.moves.filter((record) => record.hooks.item.status === "unsupported")).toHaveLength(195);
  });

  it("keeps zero-power Volt/Water noncandidates and Sunny Day's audited special flow unsupported", () => {
    const move = (symbol: string) => manifest.moves.find((record) => record.move === symbol)!;
    for (const symbol of ["MOVE_WITHDRAW", "MOVE_RAIN_DANCE", "MOVE_SUNNY_DAY", "MOVE_PROTECT"]) {
      expect(move(symbol).hooks).toMatchObject({
        item: { potentialCategories: null, status: "unsupported" },
        ability: { potentialCategories: null, status: "unsupported" },
      });
    }
    expect(move("MOVE_TACKLE").hooks.ability.supportedCategories).toEqual(["moveend-contact-on-damage", "moveend-color-change"]);
    expect(move("MOVE_THUNDER_WAVE").hooks.ability.supportedCategories).toEqual(["moveend-synchronize-status"]);
    expect(move("MOVE_WILL_O_WISP").hooks.ability.supportedCategories).toEqual(["absorbing-flash-fire", "moveend-synchronize-status"]);
  });

  it("accounts Synchronize status candidates and keeps excluded status bytes explicit", () => {
    type SynchronizeAudit = {
      status: string;
      candidateCount: number;
      sourceProvenRows: string[];
      sourceExceptionRows: unknown[];
      blockers: unknown[];
      routeWitnesses: unknown[];
      excludedOutcomes: Array<{ byte: string }>;
      runtimeGuardSignature: { selector: { effects: Array<{ byte: string }> } };
    };
    const audit = (manifest.coverage.hookCatalogs.ability as unknown as { synchronize: SynchronizeAudit }).synchronize;
    expect(audit).toMatchObject({ status: "source-proven-family", candidateCount: 30, sourceProvenRows: expect.any(Array), sourceExceptionRows: [], blockers: [] });
    expect(audit.sourceProvenRows).toHaveLength(30);
    expect(audit.routeWitnesses).toHaveLength(30);
    expect(audit.excludedOutcomes).toEqual(expect.arrayContaining([
      expect.objectContaining({ byte: "MOVE_EFFECT_SLEEP" }),
      expect.objectContaining({ byte: "MOVE_EFFECT_FREEZE" }),
      expect.objectContaining({ byte: "all other MOVE_EFFECT_* bytes" }),
    ]));
    const markerEffects = audit.runtimeGuardSignature.selector.effects.map((effect) => effect.byte);
    expect(markerEffects).toEqual(["MOVE_EFFECT_POISON", "MOVE_EFFECT_TOXIC", "MOVE_EFFECT_PARALYSIS", "MOVE_EFFECT_BURN"]);
    expect(manifest.moves.find((candidate) => candidate.move === "MOVE_BOUNCE")!.hooks.ability.supportedCategories).toContain("moveend-synchronize-status");
    expect(manifest.moves.find((candidate) => candidate.move === "MOVE_FLY")!.hooks.ability.supportedCategories).not.toContain("moveend-synchronize-status");
    expect(manifest.moves.find((candidate) => candidate.move === "MOVE_TRI_ATTACK")!.hooks.ability.supportedCategories).toContain("moveend-synchronize-status");
  });
});
