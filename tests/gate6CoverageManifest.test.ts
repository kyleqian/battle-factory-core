import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };
import parameterizationData from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };
import trainersData from "../src/data/gen/battle-frontier-trainers.json" with { type: "json" };
import monsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import hooksData from "../src/data/gen/ability-item-hooks.json" with { type: "json" };

type JsonObject = Record<string, unknown>;

const JSON_PATH = "docs/gate6-coverage-manifest.json";
const MARKDOWN_PATH = "docs/gate6-coverage-manifest.md";
const PER_MOVE_HOOK_JOIN_AXES = ["item", "ability"] as const;
const SOURCE_PROVEN_FAMILY_STATUS = "source-proven-family";
const SOUNDPROOF_MOVES_BLOCK_CATEGORY = "moves-block-soundproof";
const SOUNDPROOF_ROSTER_MOVES = [
  "MOVE_ROAR", "MOVE_SING", "MOVE_SUPERSONIC", "MOVE_SCREECH", "MOVE_SNORE",
  "MOVE_UPROAR", "MOVE_METAL_SOUND", "MOVE_GRASS_WHISTLE", "MOVE_HYPER_VOICE",
] as const;
const SOUNDPROOF_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "reference/pokeemerald/src/battle_script_commands.c",
  "src/engine/battleScriptAbilityMovesBlock.ts",
  "tests/battleScriptAbilityMovesBlock.test.ts",
  "tests/soundproofOracleEvidence.test.ts",
  "tests/fixtures/soundproof-off-evidence.json",
] as const;

const EXPLICIT_STATE_BEHAVIOR_ROWS = [
  [
    "BATTLE_SCRIPT_STATUS3_CANT_SCORE_A_CRIT",
    [[
      "tests/battleScriptHitChainOpcode.test.ts",
      "STATUS3_CANT_SCORE_A_CRIT short-circuits a would-crit roll without consuming RNG",
    ]],
  ],
  [
    "BATTLE_SCRIPT_STATUS3_LEECHSEED",
    [
      ["tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts", "Leech Seed setter writes STATUS3_LEECHSEED plus its encoded seeder id"],
      ["tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts", "Rapid Spin lifecycle clears STATUS3_LEECHSEED and its encoded seeder before the LeechSeedFree continuation"],
    ],
  ],
  [
    "BATTLE_SCRIPT_STATUS3_LEECHSEED_BATTLER_MASK",
    [
      ["tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts", "Leech Seed setter writes STATUS3_LEECHSEED plus its encoded seeder id"],
      ["tests/battleEndTurnOrchestration.test.ts", "Leech Seed end-turn decodes a nonzero encoded seeder owner and retains the seed lifecycle bit"],
      ["tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts", "Rapid Spin lifecycle clears STATUS3_LEECHSEED and its encoded seeder before the LeechSeedFree continuation"],
    ],
  ],
  [
    "BATTLE_SCRIPT_STATUS3_YAWN",
    [
      ["tests/battleEndTurnOrchestration.test.ts", "first end-turn pass only decrements the counter (TURN(2) -> TURN(1)), no sleep transition, zero RNG"],
      ["tests/battleEndTurnOrchestration.test.ts", "second end-turn pass empties the counter and fires the real sleep transition"],
    ],
  ],
  [
    "SIDE_STATUS_WORE_OFF_LABEL",
    [[
      "tests/battleScriptScreensWeatherOrchestration.test.ts",
      "Light Screen: set -> 4 silent decrement ticks -> SideStatusWoreOff message/buffer on tick 5 -> re-set succeeds",
    ]],
  ],
] as const;

function readManifest(): JsonObject {
  return JSON.parse(readFileSync(JSON_PATH, "utf8")) as JsonObject;
}

function record(value: unknown): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("expected object");
  return value as JsonObject;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("expected array");
  return value;
}

function pathWithoutLocator(value: unknown): string {
  const path = record(value).path;
  if (typeof path !== "string") throw new Error("evidence path is not a string");
  return path.split("#", 1)[0]!;
}

function collectEvidenceRows(value: unknown, rows: JsonObject[] = []): JsonObject[] {
  if (Array.isArray(value)) {
    for (const child of value) collectEvidenceRows(child, rows);
    return rows;
  }
  if (value === null || typeof value !== "object") return rows;
  const object = record(value);
  if (Array.isArray(object.evidence)) rows.push(object);
  for (const child of Object.values(object)) collectEvidenceRows(child, rows);
  return rows;
}

function assertPerMoveHookJoinContract(manifest: JsonObject): void {
  const summary = record(manifest.summary);
  const hookJoinSummary = record(summary.perMoveHookJoins);
  const sections = record(manifest.sections);
  const hookJoinSections = record(sections.perMoveHookJoins);
  let totalRows = 0;
  let totalUnsupported = 0;
  let totalGaps = 0;

  for (const axis of PER_MOVE_HOOK_JOIN_AXES) {
    const rows = array(hookJoinSections[axis]);
    const axisSummary = record(hookJoinSummary[axis]);
    const rowsByMove = new Map<string, JsonObject>();
    for (const candidate of rows) {
      const row = record(candidate);
      if (typeof row.move !== "string" || rowsByMove.has(row.move)) {
        throw new Error(`${axis} hook-join rows must enumerate each move exactly once`);
      }
      rowsByMove.set(row.move, row);
    }
    if (rows.length !== parameterizationData.moves.length) {
      throw new Error(`${axis} hook-join row count is not derived from the parameterization artifact`);
    }

    let unsupported = 0;
    for (const sourceMove of parameterizationData.moves) {
      const sourceHook = record(record(sourceMove.hooks)[axis]);
      if (!String(sourceHook.reason).trim()) throw new Error(`parameterization ${axis} hook for ${sourceMove.move} lacks a reason`);
      const row = rowsByMove.get(sourceMove.move);
      if (!row) throw new Error(`missing ${axis} hook-join row for ${sourceMove.move}`);
      if (row.axis !== axis || row.status !== sourceHook.status || !String(row.reason).trim()) {
        throw new Error(`${axis} hook-join row for ${sourceMove.move} drifts from its source status/reason`);
      }
      if (row.effect !== sourceMove.moveTable.effect || row.entryScript !== sourceMove.battleScript.entryScript) {
        throw new Error(`${axis} hook-join row for ${sourceMove.move} lost its identity/effect evidence`);
      }
      const locator = `moves:${sourceMove.move}.hooks.${axis}`;
      const sourceArtifact = record(row.sourceArtifact);
      if (sourceArtifact.path !== "src/data/gen/level50-move-parameterization.json" || sourceArtifact.locator !== locator) {
        throw new Error(`${axis} hook-join row for ${sourceMove.move} lost its source artifact locator`);
      }
      if (!array(row.evidence).some((item) => {
        const evidence = record(item);
        return evidence.path === sourceArtifact.path && evidence.locator === locator;
      })) {
        throw new Error(`${axis} hook-join row for ${sourceMove.move} lacks source artifact evidence`);
      }
      if (sourceHook.status === "unsupported") {
        if (array(sourceHook.supportedCategories).length !== 0 || array(row.categories).length !== 0) {
          throw new Error(`unsupported ${axis} hook-join row for ${sourceMove.move} claims a category`);
        }
        unsupported += 1;
      } else if (sourceHook.status === SOURCE_PROVEN_FAMILY_STATUS) {
        if (axis !== "ability") throw new Error(`item hook ${sourceMove.move} cannot be source-proven in this bounded family`);
        if (
          JSON.stringify(array(sourceHook.supportedCategories)) !== JSON.stringify([SOUNDPROOF_MOVES_BLOCK_CATEGORY])
          || JSON.stringify(array(row.categories)) !== JSON.stringify([SOUNDPROOF_MOVES_BLOCK_CATEGORY])
          || !String(row.notes).includes("unrelated ability families")
        ) {
          throw new Error(`source-proven ${axis} hook-join row for ${sourceMove.move} overclaims coverage`);
        }
        for (const path of SOUNDPROOF_PROOF_PATHS) {
          if (!array(row.evidence).some((item) => record(item).path === path)) {
            throw new Error(`source-proven ${axis} hook-join row for ${sourceMove.move} lacks ${path}`);
          }
        }
      } else {
        throw new Error(`unknown ${axis} hook-join status for ${sourceMove.move}: ${String(sourceHook.status)}`);
      }
    }

    if (axisSummary.rows !== rows.length || axisSummary.unsupported !== unsupported || axisSummary.gaps !== unsupported) {
      throw new Error(`${axis} hook-join summary makes a false count or zero-gap claim`);
    }
    totalRows += rows.length;
    totalUnsupported += unsupported;
    totalGaps += unsupported;
  }

  const total = record(hookJoinSummary.total);
  if (total.rows !== totalRows || total.unsupported !== totalUnsupported || total.gaps !== totalGaps) {
    throw new Error("per-move hook-join total makes a false count or zero-gap claim");
  }
}

function assertManifestContract(manifest: JsonObject): void {
  const gate6 = record(manifest.gate6);
  expect(gate6.closed).toBe(false);
  expect(String(gate6.verdict)).toMatch(/open/i);
  expect(String(gate6.nextAcceptanceUnit).trim().length).toBeGreaterThan(0);
  expect(JSON.stringify(manifest)).not.toMatch(/\bgate\s*6\s+is\s+(closed|complete)\b/i);
  expect(String(gate6.nextAcceptanceUnit)).toMatch(/^Per-move hook-join family:/);
  assertPerMoveHookJoinContract(manifest);
  for (const row of collectEvidenceRows(manifest.sections)) {
    expect(String(row.status)).not.toMatch(/^(closed|complete)$/i);
    for (const item of array(row.evidence)) {
      const path = pathWithoutLocator(item);
      expect(path.startsWith("/")).toBe(false);
      expect(path.includes("..")).toBe(false);
      expect(existsSync(path)).toBe(true);
    }
  }
}

describe("Gate-6 mechanics coverage manifest", () => {
  it("regenerates both artifacts byte-identically in an isolated output directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-gate6-manifest-"));
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/report/gate6-coverage-manifest.ts", "--out-dir", outputDirectory],
      { stdio: "pipe" },
    );
    expect(readFileSync(join(outputDirectory, "gate6-coverage-manifest.json"), "utf8")).toBe(
      readFileSync(JSON_PATH, "utf8"),
    );
    expect(readFileSync(join(outputDirectory, "gate6-coverage-manifest.md"), "utf8")).toBe(
      readFileSync(MARKDOWN_PATH, "utf8"),
    );
  });

  it("recomputes finite effect, roster, hook, and receipt counts from committed inputs", () => {
    const manifest = readManifest();
    const summary = record(manifest.summary);
    const effects = record(summary.effects);
    const moves = record(summary.moves);
    const perMoveHookJoins = record(summary.perMoveHookJoins);
    const corpus = record(summary.corpus);
    const hooks = record(summary.hooks);
    const abilities = record(hooks.abilities);
    const holdEffects = record(hooks.holdEffects);
    const oracle = record(summary.parameterizedOracle);
    const sections = record(manifest.sections);
    const moveEffect = record(sections.moveEffect);
    const manifestEffects = array(moveEffect.effects);
    const manifestMoves = array(moveEffect.moves);
    const manifestHookJoinSections = record(sections.perMoveHookJoins);
    const stateFamilies = array(sections.stateFamilies);
    const manifestTrainers = array(record(sections.corpus).trainers);
    const manifestSets = array(record(sections.corpus).level50Sets);
    const manifestAbilities = array(record(sections.hooks).abilities);
    const manifestHoldEffects = array(record(sections.hooks).holdEffects);
    const manifestScenarios = array(record(sections.parameterizedOracle).scenarios);

    expect(manifestEffects).toHaveLength(topologyData.effects.length);
    expect(manifestMoves).toHaveLength(topologyData.moves.length);
    expect(effects).toEqual({ total: 214, staticExecutable: 214 });
    for (const effect of manifestEffects) {
      expect(record(effect)).toMatchObject({
        status: "static-executable",
        semanticAcceptance: "not-established-by-static-census",
      });
    }
    expect(manifestTrainers).toHaveLength(trainersData.entries.length);
    expect(manifestSets).toHaveLength(monsData.entries.filter((entry) => entry.index < 850).length);
    expect(manifestAbilities).toHaveLength(hooksData.universes.abilities.length);
    expect(manifestHoldEffects).toHaveLength(hooksData.universes.holdEffects.length);
    expect(manifestScenarios).toHaveLength(
      readdirSync("tools/battle-lab").filter((name) => /^gate6-.*\.json$/.test(name)).length,
    );
    expect(effects.total).toBe(manifestEffects.length);
    expect(moves.total).toBe(manifestMoves.length);
    expect(moves.level50Roster).toBe(parameterizationData.moves.length);
    expect(moves.level50Executable).toBe(
      parameterizationData.moves.filter((move) => move.battleScript.executionInventory === "level50-executable").length,
    );
    expect(moves.level50RosterOnly).toBe(
      parameterizationData.moves.filter((move) => move.battleScript.executionInventory === "level50-roster-only").length,
    );
    for (const axis of PER_MOVE_HOOK_JOIN_AXES) {
      const rows = array(manifestHookJoinSections[axis]);
      const sourceUnsupported = parameterizationData.moves.filter((move) => move.hooks[axis].status === "unsupported").length;
      const axisSummary = record(perMoveHookJoins[axis]);
      expect(rows).toHaveLength(parameterizationData.moves.length);
      expect(axisSummary).toEqual({ rows: rows.length, unsupported: sourceUnsupported, gaps: sourceUnsupported });
      expect(sourceUnsupported).toBe(axis === "item" ? 300 : 291);
    }
    expect(record(perMoveHookJoins.total)).toEqual({ rows: 600, unsupported: 591, gaps: 591 });
    const sourceProven = parameterizationData.moves
      .filter((move) => move.hooks.ability.status === SOURCE_PROVEN_FAMILY_STATUS)
      .map((move) => move.move)
      .sort();
    expect(sourceProven).toEqual([...SOUNDPROOF_ROSTER_MOVES].sort());
    const sourceProvenRows = array(manifestHookJoinSections.ability)
      .map(record)
      .filter((row) => row.status === SOURCE_PROVEN_FAMILY_STATUS);
    expect(sourceProvenRows.map((row) => String(row.move)).sort()).toEqual([...SOUNDPROOF_ROSTER_MOVES].sort());
    for (const row of sourceProvenRows) {
      expect(array(row.categories)).toEqual([SOUNDPROOF_MOVES_BLOCK_CATEGORY]);
      expect(String(row.notes)).toMatch(/unrelated ability families/);
      for (const path of SOUNDPROOF_PROOF_PATHS) {
        expect(array(row.evidence).map((item) => record(item).path)).toContain(path);
      }
    }
    expect(corpus.ordinaryTrainers).toBe(300);
    expect(corpus.level50Sets).toBe(850);
    expect(abilities.total).toBe(manifestAbilities.length);
    expect(holdEffects.total).toBe(manifestHoldEffects.length);
    expect(oracle.scenarioRequests).toBe(manifestScenarios.length);
    expect(oracle.receiptDocumented).toBe(
      manifestScenarios.filter((scenario) => record(scenario).status === "oracle-receipted").length,
    );
    expect(oracle.receiptGaps).toBe(
      manifestScenarios.filter((scenario) => record(scenario).status !== "oracle-receipted").length,
    );
    expect(record(summary.stateFamilies)).toEqual({ total: 55, tier1Covered: 55 });
    expect(record(summary.interactions)).toEqual({ total: 28, kernelProven: 6, oracleReceipted: 22, receiptGaps: 0 });
    for (const [symbol, expectedEvidence] of EXPLICIT_STATE_BEHAVIOR_ROWS) {
      const row = stateFamilies.find((candidate) => record(candidate).label === symbol);
      expect(row).toBeDefined();
      const stateRow = record(row);
      expect(stateRow.status).toBe("tier1-covered");
      expect(array(stateRow.evidence)).toEqual(expect.arrayContaining(
        expectedEvidence.map(([path, locator]) => expect.objectContaining({
          path,
          locator,
          kind: "tier-1-behavior-test",
        })),
      ));
    }
  });

  it("rejects unknown evidence paths, false hook-join zeroes, and false closure claims", () => {
    const manifest = readManifest();
    assertManifestContract(manifest);

    const unknownPath = structuredClone(manifest);
    const firstRow = collectEvidenceRows(unknownPath.sections)[0]!;
    const firstEvidence = array(firstRow.evidence)[0] as JsonObject;
    firstEvidence.path = "docs/this-gate6-evidence-does-not-exist.md";
    expect(() => assertManifestContract(unknownPath)).toThrow();

    const falseClosure = structuredClone(manifest);
    const falseGate6 = record(falseClosure.gate6);
    falseGate6.closed = true;
    expect(() => assertManifestContract(falseClosure)).toThrow();

    const falseItemZero = structuredClone(manifest);
    const falseItemJoins = record(record(falseItemZero.summary).perMoveHookJoins);
    falseItemJoins.item = {
      ...record(falseItemJoins.item),
      gaps: 0,
    };
    expect(() => assertManifestContract(falseItemZero)).toThrow();

    const falseTotalZero = structuredClone(manifest);
    const falseTotalJoins = record(record(falseTotalZero.summary).perMoveHookJoins);
    falseTotalJoins.total = {
      ...record(falseTotalJoins.total),
      gaps: 0,
    };
    expect(() => assertManifestContract(falseTotalZero)).toThrow();
  });

  it("keeps widened scope and receipts unchanged while surfacing the hook-join gap", () => {
    const manifest = readManifest();
    const sections = record(manifest.sections);
    const hookSections = record(sections.hooks);
    const widened = [
      ...array(hookSections.abilities),
      ...array(hookSections.holdEffects),
    ].filter((row) => {
      const item = record(row);
      return item.factoryCarrierCount === 0 && Number(item.legalCarrierCount) > 0;
    });
    expect(widened.length).toBeGreaterThan(0);
    for (const row of widened) expect(record(row).status).toBe("zero-factory-carrier-widened-scope");

    const oracle = record(record(manifest.summary).parameterizedOracle);
    const scenarios = array(record(sections.parameterizedOracle).scenarios);
    const r12b = record(scenarios.find((scenario) => record(scenario).cardId === "R12b"));
    const r11 = record(scenarios.find((scenario) => record(scenario).cardId === "R11"));
    const r6 = record(scenarios.find((scenario) => record(scenario).cardId === "R6"));
    const r15 = record(scenarios.find((scenario) => record(scenario).cardId === "R15"));
    const r3 = record(scenarios.find((scenario) => record(scenario).cardId === "R3"));
    const r9 = record(scenarios.find((scenario) => record(scenario).cardId === "R9"));
    const r2 = scenarios
      .filter((scenario) => record(scenario).cardId === "R2")
      .map((scenario) => record(scenario));
    const r12 = record(scenarios.find((scenario) => record(scenario).cardId === "R12"));
    expect(r12b).toMatchObject({ status: "oracle-receipted", captureCount: 20 });
    expect(r11).toMatchObject({ status: "oracle-receipted", captureCount: 44 });
    expect(r6).toMatchObject({ status: "oracle-receipted", captureCount: 23 });
    expect(r15).toMatchObject({ status: "oracle-receipted", captureCount: 12 });
    expect(r3).toMatchObject({ status: "oracle-receipted", captureCount: 18 });
    expect(r9).toMatchObject({ status: "oracle-receipted", captureCount: 20 });
    expect(r2).toHaveLength(2);
    expect(r2.map((scenario) => scenario.captureCount).sort((a, b) => Number(a) - Number(b))).toEqual([14, 17]);
    for (const scenario of r2) expect(scenario.status).toBe("oracle-receipted");
    expect(r12).toMatchObject({ status: "oracle-receipted", captureCount: 10 });
    expect(oracle.receiptDocumented).toBe(24);
    expect(oracle.receiptGaps).toBe(0);
    expect(String(record(manifest.gate6).nextAcceptanceUnit)).toMatch(/^Per-move hook-join family:/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Gate 6 is OPEN/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/\*\*300 item join gaps\*\* and \*\*291 ability join gaps\*\*/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/9 ability rows are source-proven only for the Soundproof moves-block family/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/24\/24.*scenario receipts documented; \*\*0\*\* request-level gaps/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Receipt count alone does not close the broader Gate-6 breadth acceptance/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).not.toMatch(/fixture-only-no-committed-receipt/);
  });
});
