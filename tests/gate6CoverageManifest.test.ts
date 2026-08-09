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

function assertManifestContract(manifest: JsonObject): void {
  const gate6 = record(manifest.gate6);
  expect(gate6.closed).toBe(false);
  expect(String(gate6.verdict)).toMatch(/open/i);
  expect(String(gate6.nextAcceptanceUnit).trim().length).toBeGreaterThan(0);
  expect(JSON.stringify(manifest)).not.toMatch(/\bgate\s*6\s+is\s+(closed|complete)\b/i);
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
    const corpus = record(summary.corpus);
    const hooks = record(summary.hooks);
    const abilities = record(hooks.abilities);
    const holdEffects = record(hooks.holdEffects);
    const oracle = record(summary.parameterizedOracle);
    const sections = record(manifest.sections);
    const moveEffect = record(sections.moveEffect);
    const manifestEffects = array(moveEffect.effects);
    const manifestMoves = array(moveEffect.moves);
    const manifestTrainers = array(record(sections.corpus).trainers);
    const manifestSets = array(record(sections.corpus).level50Sets);
    const manifestAbilities = array(record(sections.hooks).abilities);
    const manifestHoldEffects = array(record(sections.hooks).holdEffects);
    const manifestScenarios = array(record(sections.parameterizedOracle).scenarios);

    expect(manifestEffects).toHaveLength(topologyData.effects.length);
    expect(manifestMoves).toHaveLength(topologyData.moves.length);
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
  });

  it("rejects unknown evidence paths and false closure claims", () => {
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
  });

  it("keeps the widened zero-Factory scope and ranked receipt gap inspectable", () => {
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
    expect(r12b).toMatchObject({ status: "oracle-receipted", captureCount: 20 });
    expect(r11).toMatchObject({ status: "oracle-receipted", captureCount: 44 });
    expect(oracle.receiptDocumented).toBe(19);
    expect(oracle.receiptGaps).toBe(5);
    expect(String(record(manifest.gate6).nextAcceptanceUnit)).toMatch(/R6/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Gate 6 is OPEN/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/19\/24.*scenario receipts documented; \*\*5\*\* request-level gaps/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/fixture-only-no-committed-receipt/);
  });
});
