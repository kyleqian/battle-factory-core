#!/usr/bin/env node --experimental-strip-types
/**
 * Gate-6 mechanics coverage manifest.
 *
 * This report is deliberately a join, not a second implementation of the
 * battle engine.  It joins the executable-frontier census, the ability/item
 * census, the finite Factory catalogs, the Gate-6 interaction scout, and the
 * committed mechanicLab request cards.  Static reachability and an engine
 * token reference remain separate from semantic/oracle receipt status.
 *
 * Rerun:
 *   node --experimental-strip-types tools/report/gate6-coverage-manifest.ts
 *
 * `--out-dir DIR` writes both generated artifacts to an isolated directory.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const OUTPUT_DIR = outDirArg ?? join(REPO_ROOT, "docs");
const JSON_OUTPUT = join(OUTPUT_DIR, "gate6-coverage-manifest.json");
const MARKDOWN_OUTPUT = join(OUTPUT_DIR, "gate6-coverage-manifest.md");
const RERUN_COMMAND = "node --experimental-strip-types tools/report/gate6-coverage-manifest.ts";

if (!existsSync(OUTPUT_DIR)) throw new Error(`Gate-6 manifest output directory does not exist: ${OUTPUT_DIR}`);

type AnyRecord = Record<string, any>;
type Evidence = Readonly<{ path: string; locator?: string; kind: string }>;
type Row = Readonly<{
  id: string;
  label: string;
  status: string;
  evidence: readonly Evidence[];
  notes?: string;
  [key: string]: any;
}>;

function repoPath(path: string): string {
  return join(REPO_ROOT, path);
}

function readText(path: string): string {
  return readFileSync(repoPath(path), "utf8");
}

function readJson<T = AnyRecord>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

function evidence(path: string, kind: string, locator?: string): Evidence {
  return Object.freeze(locator === undefined ? { path, kind } : { path, locator, kind });
}

function uniqueEvidence(entries: readonly Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.path}#${entry.locator ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function listFiles(dir: string, suffix: string): string[] {
  const absolute = repoPath(dir);
  const result: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = join(absolute, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(join(dir, entry.name), suffix));
    else if (entry.name.endsWith(suffix)) result.push(relative(REPO_ROOT, child));
  }
  return result.sort();
}

function splitMarkdownRow(line: string): string[] | null {
  if (!line.startsWith("|")) return null;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  return cells.length > 0 ? cells : null;
}

function markdownPaths(text: string): string[] {
  return [...text.matchAll(/(?:src|tests|docs|tools)\/[A-Za-z0-9_./-]+\.(?:json|md|ts|py|sh)/g)]
    .map((match) => match[0]!)
    .filter((path, index, paths) => paths.indexOf(path) === index);
}

function requirePath(path: string): void {
  const bare = path.split("#", 1)[0]!;
  if (bare.length === 0 || bare.startsWith("/") || bare.includes("..")) {
    throw new Error(`Gate-6 manifest has unsafe evidence path: ${path}`);
  }
  if (!existsSync(repoPath(bare))) throw new Error(`Gate-6 manifest has unknown evidence path: ${path}`);
}

function assertManifest(manifest: AnyRecord): void {
  if (manifest.schema !== "gate6-coverage-manifest/v1") throw new Error("unexpected Gate-6 manifest schema");
  if (manifest.gate6?.closed !== false) throw new Error("Gate-6 manifest must remain explicitly open");
  if (!String(manifest.gate6?.verdict ?? "").toLowerCase().includes("open")) {
    throw new Error("Gate-6 manifest verdict must explicitly say open");
  }
  if (!String(manifest.gate6?.nextAcceptanceUnit ?? "").trim()) {
    throw new Error("Gate-6 manifest must name the next acceptance unit");
  }
  const forbiddenClosure = JSON.stringify(manifest).match(/\bgate\s*6\s+is\s+(closed|complete)\b/i);
  if (forbiddenClosure) throw new Error(`Gate-6 manifest contains a false closure claim: ${forbiddenClosure[0]}`);

  const hookJoinSection = manifest.sections?.perMoveHookJoins as AnyRecord | undefined;
  const hookJoinSummary = manifest.summary?.perMoveHookJoins as AnyRecord | undefined;
  if (!hookJoinSection || !hookJoinSummary) throw new Error("Gate-6 manifest lacks the per-move hook-join ratchet");
  for (const axis of PER_MOVE_HOOK_JOIN_AXES) {
    const rows = hookJoinSection[axis];
    const summary = hookJoinSummary[axis] as AnyRecord | undefined;
    if (!Array.isArray(rows) || !summary) throw new Error(`Gate-6 manifest lacks ${axis} per-move hook-join rows`);
    if (rows.length !== parameterizationMoves.length) {
      throw new Error(`Gate-6 manifest ${axis} hook-join row count is not derived from the Level-50 parameterization`);
    }
    const rowsByMove = new Map<string, AnyRecord>();
    for (const row of rows as AnyRecord[]) {
      if (typeof row.move !== "string" || rowsByMove.has(row.move)) {
        throw new Error(`Gate-6 manifest ${axis} hook-join rows must enumerate each move exactly once`);
      }
      rowsByMove.set(row.move, row);
    }
    let unsupported = 0;
    for (const move of parameterizationMoves) {
      const sourceHook = parameterizedHook(move, axis);
      const row = rowsByMove.get(move.move);
      if (!row) throw new Error(`Gate-6 manifest lacks ${axis} hook-join row for ${move.move}`);
      if (row.status !== sourceHook.status || !String(row.reason ?? "").trim()) {
        throw new Error(`Gate-6 manifest ${axis} hook-join status/reason drift for ${move.move}`);
      }
      if (row.effect !== move.moveTable?.effect || row.entryScript !== move.battleScript?.entryScript) {
        throw new Error(`Gate-6 manifest ${axis} hook-join identity/effect drift for ${move.move}`);
      }
      const sourceLocator = `moves:${move.move}.hooks.${axis}`;
      if (row.sourceArtifact?.path !== PARAMETERIZATION_PATH || row.sourceArtifact?.locator !== sourceLocator) {
        throw new Error(`Gate-6 manifest ${axis} hook-join source artifact drift for ${move.move}`);
      }
      if (!(row.evidence as Evidence[] | undefined)?.some((item) => item.path === PARAMETERIZATION_PATH && item.locator === sourceLocator)) {
        throw new Error(`Gate-6 manifest ${axis} hook-join evidence lacks ${move.move}`);
      }
      if (row.status === "unsupported") {
        if (!Array.isArray(row.categories) || row.categories.length !== 0) {
          throw new Error(`unsupported ${axis} hook-join row for ${move.move} claims a category`);
        }
        unsupported += 1;
      } else if (row.status === SOURCE_PROVEN_FAMILY_STATUS) {
        if (axis !== "ability" || !Array.isArray(row.categories) || row.categories.length === 0 || !String(row.notes ?? "").includes("unrelated ability families")) {
          throw new Error(`source-proven ${axis} hook-join row for ${move.move} overclaims coverage`);
        }
        const requiredEvidencePaths = sourceProvenHookEvidence(sourceHook).map((item) => item.path);
        for (const path of new Set(requiredEvidencePaths)) {
          if (!(row.evidence as Evidence[]).some((item) => item.path === path)) {
            throw new Error(`source-proven ${axis} hook-join row for ${move.move} lacks ${path}`);
          }
        }
      } else {
        throw new Error(`Gate-6 manifest ${axis} hook-join row for ${move.move} has an unknown status`);
      }
    }
    if (summary.rows !== rows.length || summary.unsupported !== unsupported || summary.gaps !== unsupported) {
      throw new Error(`Gate-6 manifest ${axis} hook-join summary has a false count or zero-gap claim`);
    }
  }
  if (hookJoinSummary.total?.rows !== perMoveHookJoinTotals.rows
    || hookJoinSummary.total?.unsupported !== perMoveHookJoinTotals.unsupported
    || hookJoinSummary.total?.gaps !== perMoveHookJoinTotals.gaps) {
    throw new Error("Gate-6 manifest per-move hook-join total has a false count or zero-gap claim");
  }
  if (perMoveHookJoinTotals.gaps > 0 && !/hook-join/i.test(String(manifest.gate6?.nextAcceptanceUnit ?? ""))) {
    throw new Error("Gate-6 manifest must name a bounded per-move hook-join acceptance unit while gaps remain");
  }

  const rows: Row[] = [];
  function walk(value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (value === null || typeof value !== "object") return;
    const record = value as AnyRecord;
    if (typeof record.status === "string" && Array.isArray(record.evidence)) rows.push(record as Row);
    for (const child of Object.values(record)) walk(child);
  }
  walk(manifest.sections);
  for (const row of rows) {
    if (/^(closed|complete)$/i.test(row.status)) throw new Error(`false closure row: ${row.id}`);
    for (const item of row.evidence) requirePath(item.path);
  }
}

const EXECUTABLE_DOC_PATH = "docs/executable-frontier-census.md";
const ABILITY_ITEM_DOC_PATH = "docs/ability-item-parity-census.md";
const SCOUT_PATH = "docs/gate6-interaction-matrix-scout.md";
const TOPOLOGY_PATH = "src/data/gen/battle-script-topology.json";
const PARAMETERIZATION_PATH = "src/data/gen/level50-move-parameterization.json";
const TRAINERS_PATH = "src/data/gen/battle-frontier-trainers.json";
const MONS_PATH = "src/data/gen/battle-frontier-mons.json";
const HELD_ITEMS_PATH = "src/data/gen/battle-frontier-held-items.json";
const SPECIES_PATH = "src/data/gen/species-stats.json";
const ITEM_HOLD_EFFECTS_PATH = "src/data/gen/item-hold-effects.json";
const MOVES_PATH = "src/data/gen/moves.json";
const HOOKS_PATH = "src/data/gen/ability-item-hooks.json";

const executableDoc = readText(EXECUTABLE_DOC_PATH);
const abilityItemDoc = readText(ABILITY_ITEM_DOC_PATH);
const scout = readText(SCOUT_PATH);
const topology = readJson(TOPOLOGY_PATH);
const parameterization = readJson(PARAMETERIZATION_PATH);
const trainers = readJson(TRAINERS_PATH);
const mons = readJson(MONS_PATH);
const heldItems = readJson(HELD_ITEMS_PATH);
const speciesData = readJson(SPECIES_PATH);
const itemHoldEffects = readJson(ITEM_HOLD_EFFECTS_PATH);
const movesData = readJson(MOVES_PATH);
const hooks = readJson(HOOKS_PATH);
const LEVEL50_SET_COUNT = parameterization.coverage.level50Roster.frontierSetIds.count as number;
if (!Number.isSafeInteger(LEVEL50_SET_COUNT) || LEVEL50_SET_COUNT <= 0) {
  throw new Error("level50 parameterization has no finite roster boundary");
}

function parseCensusRows(text: string, prefix: string): Map<string, AnyRecord> {
  const result = new Map<string, AnyRecord>();
  for (const line of text.split("\n")) {
    const cells = splitMarkdownRow(line);
    if (cells === null || !cells[0]!.startsWith(prefix)) continue;
    result.set(cells[0]!, { cells });
  }
  return result;
}

const effectCensusRows = parseCensusRows(executableDoc, "EFFECT_");
const parityAbilityRows = parseCensusRows(abilityItemDoc, "ABILITY_");
const parityHoldRows = parseCensusRows(abilityItemDoc, "HOLD_EFFECT_");
const topologyEffects = topology.effects as AnyRecord[];
const topologyMoves = topology.moves as AnyRecord[];
const parameterizedMoves = new Map<string, AnyRecord>(
  (parameterization.moves as AnyRecord[]).map((move) => [move.move, move]),
);
const level50EffectNames = new Set(
  (parameterization.moves as AnyRecord[]).map((move) => move.moveTable.effect),
);

/**
 * The parameterization deliberately keeps its per-move joins explicit. The
 * narrow exceptions are source-proven shared dispatcher families: exact
 * Soundproof selectors plus the audited absorbing routes have
 * graph/program/source-handoff proof.
 * Keep the remaining finite gaps visible without copying the parameterization's
 * large move payload into this report a second time.
 */
type PerMoveHookJoinAxis = "item" | "ability";
const PER_MOVE_HOOK_JOIN_AXES: readonly PerMoveHookJoinAxis[] = ["item", "ability"];
const SOURCE_PROVEN_FAMILY_STATUS = "source-proven-family";
const SOUNDPROOF_MOVES_BLOCK_CATEGORY = "moves-block-soundproof";
const ABSORBING_CATEGORIES = new Set([
  "absorbing-volt-absorb",
  "absorbing-water-absorb",
  "absorbing-flash-fire",
]);
const parameterizationMoves = parameterization.moves as AnyRecord[];
if (parameterizationMoves.length !== parameterizedMoves.size) {
  throw new Error("level50 parameterization has duplicate move identities");
}

function sourceProvenFamilies(hook: AnyRecord): AnyRecord[] {
  const families = hook.evidence?.families;
  if (!Array.isArray(families) || families.length === 0) {
    throw new Error("source-proven hook lacks family evidence");
  }
  if (!Array.isArray(hook.supportedCategories) || hook.supportedCategories.length !== families.length) {
    throw new Error("source-proven hook categories/families do not have a one-to-one mapping");
  }
  const categories = families.map((family: AnyRecord) => family.category);
  if (new Set(categories).size !== categories.length || JSON.stringify(categories) !== JSON.stringify(hook.supportedCategories)) {
    throw new Error("source-proven hook categories/families are duplicate or out of order");
  }
  for (const family of families as AnyRecord[]) {
    if (
      typeof family.category !== "string"
      || (family.category !== SOUNDPROOF_MOVES_BLOCK_CATEGORY && !ABSORBING_CATEGORIES.has(family.category))
      || !family.selector?.path
      || !family.entryPath?.source?.path
      || !family.entryPath?.graph?.path
      || !family.entryPath?.program?.path
      || !family.dispatcher?.path
      || !family.familyVerification?.batchTest
    ) {
      throw new Error(`source-proven family is incomplete: ${String(family.category)}`);
    }
    if (family.category === SOUNDPROOF_MOVES_BLOCK_CATEGORY && !family.entryPath.graph.attackCanceler) {
      throw new Error("Soundproof family lacks its attackcanceler witness");
    }
    if (ABSORBING_CATEGORIES.has(family.category) && !family.entryPath.graph.accuracyCheck) {
      throw new Error(`${family.category} lacks its accuracycheck witness`);
    }
  }
  return families as AnyRecord[];
}

function parameterizedHook(move: AnyRecord, axis: PerMoveHookJoinAxis): AnyRecord {
  const hook = move.hooks?.[axis] as AnyRecord | undefined;
  if (!hook || !String(hook.reason ?? "").trim()) {
    throw new Error(`level50 parameterization ${move.move}.${axis} lacks an explicit hook status/reason`);
  }
  if (hook.status === "unsupported") {
    if (!Array.isArray(hook.supportedCategories) || hook.supportedCategories.length !== 0) {
      throw new Error(`unsupported ${move.move}.${axis} must not claim a supported category`);
    }
    return hook;
  }
  if (axis !== "ability" || hook.status !== SOURCE_PROVEN_FAMILY_STATUS) {
    throw new Error(`level50 parameterization ${move.move}.${axis} has an unsupported non-gap hook status`);
  }
  for (const family of sourceProvenFamilies(hook)) {
    if (family.category === SOUNDPROOF_MOVES_BLOCK_CATEGORY && family.selector?.symbol !== move.move) {
      throw new Error(`${move.move} Soundproof evidence lost its source selector identity`);
    }
  }
  return hook;
}

function sourceProvenHookEvidence(hook: AnyRecord): Evidence[] {
  return uniqueEvidence(sourceProvenFamilies(hook).flatMap((proof) => {
    const terminal = proof.entryPath.graph.accuracyCheck ?? proof.entryPath.graph.attackCanceler;
    const base = [
      evidence(proof.selector.path, "source-selector", proof.selector.locator),
      evidence(proof.entryPath.source.path, "battle-script-entry-path", `${proof.entryPath.graph.entryLabel}:${proof.entryPath.source.entryLine}`),
      evidence(proof.entryPath.graph.path, "generated-battle-script-graph", `${proof.entryPath.graph.entryLabel}->${terminal.label}`),
      evidence(proof.entryPath.program.path, "generated-battle-script-program", `${proof.entryPath.program.entryLabel}->${terminal.label}`),
      evidence(proof.dispatcher.path, "source-dispatcher", proof.dispatcher.locator),
    ];
    if (proof.category === SOUNDPROOF_MOVES_BLOCK_CATEGORY) {
      return [
        ...base,
        evidence("src/engine/battleScriptAbilityMovesBlock.ts", "source-shaped-family-implementation", "advanceBattleScriptMovesBlockAbility"),
        evidence("tests/battleScriptAbilityMovesBlock.test.ts", "tier-1-sibling-batch", "blocks every and only source sound selector in both singles orientations"),
        evidence("tests/soundproofOracleEvidence.test.ts", "battle-scene-off-evidence-test", "hyper-voice-blocked-by-soundproof"),
        evidence("tests/fixtures/soundproof-off-evidence.json", "battle-scene-off-oracle-receipt", "hyper-voice-blocked-by-soundproof"),
      ];
    }
    return [
      ...base,
      evidence("src/engine/battleScriptHitChainOpcode.ts", "source-shaped-family-implementation", "advancePastAccuracyCheck"),
      evidence("tests/battleScriptHitChainOpcode.test.ts", "tier-1-sibling-batch", "AbilityBattleEffects(ABILITYEFFECT_ABSORBING)"),
      evidence("tests/damageCalc.test.ts", "tier-1-flash-fire-damage-consumer"),
      evidence("docs/absorbing-abilities-ground-truth.md", "shared-dispatcher-oracle-receipt", "two-seed Volt Absorb OFF receipt"),
      evidence("tools/battle-lab/mechanic-absorbing-volt-absorb-off.json", "parameterized-oracle-request"),
      evidence("tools/probe/probe-absorbing-ability-off.py", "oracle-probe"),
      evidence("tools/probe/receipts/absorbing-volt-absorb-off-seed-610839776.json", "battle-scene-off-oracle-receipt"),
      evidence("tools/probe/receipts/absorbing-volt-absorb-off-seed-324508639.json", "battle-scene-off-oracle-receipt"),
    ];
  }));
}

function makePerMoveHookJoinRows(axis: PerMoveHookJoinAxis): Row[] {
  return parameterizationMoves.map((move) => {
    if (typeof move.move !== "string" || !Number.isSafeInteger(move.id)) {
      throw new Error("level50 parameterization has an invalid move identity");
    }
    const hook = parameterizedHook(move, axis);
    const sourceLocator = `moves:${move.move}.hooks.${axis}`;
    const sourceProven = hook.status === SOURCE_PROVEN_FAMILY_STATUS;
    return Object.freeze({
      id: `per-move-hook-join:${axis}:${move.move}`,
      label: move.move,
      axis,
      move: move.move,
      moveId: move.id,
      effect: move.moveTable?.effect,
      effectId: move.battleScript?.effectId,
      entryScript: move.battleScript?.entryScript,
      status: hook.status,
      categories: hook.supportedCategories,
      reason: hook.reason,
      sourceArtifact: { path: PARAMETERIZATION_PATH, locator: sourceLocator },
      evidence: uniqueEvidence([
        evidence(PARAMETERIZATION_PATH, "per-move-hook-join-source", sourceLocator),
        ...(sourceProven ? sourceProvenHookEvidence(hook) : []),
      ]),
      notes: sourceProven
        ? `Source-proven only for ${hook.supportedCategories.join(", ")}; unrelated ability families are not promoted.`
        : "Explicit unsupported join; complete Battle Script fallthrough and source branch guards are required before this row can be classified.",
    });
  });
}

const perMoveHookJoinRows = {
  item: makePerMoveHookJoinRows("item"),
  ability: makePerMoveHookJoinRows("ability"),
} as const;
const perMoveHookJoinSummary = {
  item: {
    rows: perMoveHookJoinRows.item.length,
    unsupported: perMoveHookJoinRows.item.filter((row) => row.status === "unsupported").length,
    gaps: perMoveHookJoinRows.item.filter((row) => row.status === "unsupported").length,
  },
  ability: {
    rows: perMoveHookJoinRows.ability.length,
    unsupported: perMoveHookJoinRows.ability.filter((row) => row.status === "unsupported").length,
    gaps: perMoveHookJoinRows.ability.filter((row) => row.status === "unsupported").length,
  },
};
const perMoveHookJoinTotals = {
  rows: perMoveHookJoinSummary.item.rows + perMoveHookJoinSummary.ability.rows,
  unsupported: perMoveHookJoinSummary.item.unsupported + perMoveHookJoinSummary.ability.unsupported,
  gaps: perMoveHookJoinSummary.item.gaps + perMoveHookJoinSummary.ability.gaps,
};

const moveEffectRows: Row[] = topologyEffects.map((effect) => {
  const census = effectCensusRows.get(effect.effect);
  if (!census) throw new Error(`executable census has no row for ${effect.effect}`);
  const classification = census.cells[2] ?? "unknown";
  const level50Moves = topology.level50FactoryReachableEffects
    .find((candidate: AnyRecord) => candidate.effect === effect.effect)?.moves ?? [];
  return Object.freeze({
    id: `effect:${effect.id}`,
    label: effect.effect,
    effect: effect.effect,
    effectId: effect.id,
    entryScript: effect.entryScript,
    status: classification === "executable" ? "static-executable" : `static-${classification}`,
    semanticAcceptance: "not-established-by-static-census",
    level50MoveCount: level50Moves.length,
    evidence: uniqueEvidence([
      evidence(EXECUTABLE_DOC_PATH, "static-census", `effect:${effect.effect}`),
      evidence(TOPOLOGY_PATH, "topology", `effects[${effect.id}]`),
      ...(level50Moves.length > 0 ? [evidence(PARAMETERIZATION_PATH, "level50-join")] : []),
    ]),
    notes: "Executable is opcode/operand reachability only; it is not semantic or oracle acceptance.",
  });
});

const moveRows: Row[] = topologyMoves.map((move) => {
  const parameterized = parameterizedMoves.get(move.move);
  const effect = move.effect as string;
  const effectRow = moveEffectRows.find((row) => row.effect === effect)!;
  const level50Status = parameterized?.battleScript?.executionInventory ?? "not-in-level50-roster";
  return Object.freeze({
    id: `move:${move.id}`,
    label: move.move,
    move: move.move,
    moveId: move.id,
    effect,
    effectId: move.effectId,
    status: effectRow.status,
    level50Status,
    semanticAcceptance: "not-established-by-static-census",
    evidence: uniqueEvidence([
      evidence(EXECUTABLE_DOC_PATH, "static-census", `move-effect:${effect}`),
      evidence(TOPOLOGY_PATH, "topology", `moves[${move.id}]`),
      ...(parameterized ? [evidence(PARAMETERIZATION_PATH, "level50-parameterization", `moves:${move.move}`)] : []),
    ]),
    notes: parameterized
      ? "The Level-50 join distinguishes executable from roster-only; neither label is a semantic receipt."
      : "This move is outside the 850-set Level-50 roster join.",
  });
});

function collectSymbols(path: string, pattern: RegExp): Array<{ symbol: string; line: number }> {
  const lines = readText(path).split("\n");
  const result: Array<{ symbol: string; line: number }> = [];
  lines.forEach((line, index) => {
    for (const match of line.matchAll(pattern)) result.push({ symbol: match[1]!, line: index + 1 });
  });
  return result;
}

const stateRowsBySymbol = new Map<string, AnyRecord>();
function addStateSymbol(symbol: string, family: string, path: string, line: number): void {
  if (stateRowsBySymbol.has(symbol)) return;
  stateRowsBySymbol.set(symbol, { symbol, family, path, line });
}

for (const item of collectSymbols("src/engine/battleScriptSourceConstants.ts", /export const (BATTLE_SCRIPT_STATUS1_[A-Z0-9_]+)\s*=/g)) {
  if (!item.symbol.includes("REFRESH_CURE_MASK")) addStateSymbol(item.symbol, "primary-status", "src/engine/battleScriptSourceConstants.ts", item.line);
}
for (const item of collectSymbols("src/engine/battleScriptSourceConstants.ts", /^\s{2}(STATUS2_[A-Z0-9_]+):/g)) {
  addStateSymbol(item.symbol, "volatile-status2", "src/engine/battleScriptSourceConstants.ts", item.line);
}
for (const item of collectSymbols("src/engine/battleScriptSourceConstants.ts", /export const (BATTLE_SCRIPT_STATUS2_[A-Z0-9_]+)\s*=/g)) {
  if (!item.symbol.endsWith("_TURN_1") && !item.symbol.endsWith("_TURN_2")) addStateSymbol(item.symbol, "volatile-status2", "src/engine/battleScriptSourceConstants.ts", item.line);
}
for (const item of collectSymbols("src/engine/battleScriptSourceConstants.ts", /export const (BATTLE_SCRIPT_STATUS3_[A-Z0-9_]+)\s*=/g)) {
  if (!item.symbol.endsWith("_TURN_1") && !item.symbol.endsWith("_TURN_2")) addStateSymbol(item.symbol, "volatile-status3", "src/engine/battleScriptSourceConstants.ts", item.line);
}
for (const path of ["src/engine/battleEndTurnOrchestration.ts", "src/engine/battleScriptTrysetspikesOpcode.ts", "src/engine/battleScriptTrysetfutureattackOpcode.ts"]) {
  for (const item of collectSymbols(path, /(?:const|export const) (SIDE_STATUS_[A-Z0-9_]+)\s*=/g)) {
    if (!item.symbol.endsWith("_DAMAGED")) addStateSymbol(item.symbol, "side-state", path, item.line);
  }
}
for (const item of collectSymbols("src/engine/battleEndTurnOrchestration.ts", /const (B_WEATHER_(?:RAIN|SANDSTORM|SUN|HAIL))\s*=/g)) {
  addStateSymbol(item.symbol, "weather", "src/engine/battleEndTurnOrchestration.ts", item.line);
}

const gate6TestPaths = listFiles("tests", ".test.ts");
const testText = new Map(gate6TestPaths.map((path) => [path, readText(path)]));
function testEvidenceFor(...terms: string[]): Evidence[] {
  return gate6TestPaths
    .filter((path) => {
      const text = testText.get(path)!;
      return terms.some((term) => text.includes(term));
    })
    .slice(0, 8)
    .map((path) => evidence(path, "tier-1-test"));
}

/**
 * These five rows were source-modeled but absent from the old text-token
 * discovery rule. Each entry names a behavior-test assertion rather than
 * merely importing or mentioning the state constant. Keep this narrow: it
 * is an auditable exception for state-family Tier-1 evidence, never a way to
 * promote static reachability or an oracle receipt.
 */
type StateBehaviorEvidence = Readonly<{ path: string; locator: string }>;
const STATE_FAMILY_BEHAVIOR_EVIDENCE: Readonly<Record<string, readonly StateBehaviorEvidence[]>> = Object.freeze({
  BATTLE_SCRIPT_STATUS3_CANT_SCORE_A_CRIT: Object.freeze([
    Object.freeze({
      path: "tests/battleScriptHitChainOpcode.test.ts",
      locator: "STATUS3_CANT_SCORE_A_CRIT short-circuits a would-crit roll without consuming RNG",
    }),
  ]),
  BATTLE_SCRIPT_STATUS3_LEECHSEED: Object.freeze([
    Object.freeze({
      path: "tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts",
      locator: "Leech Seed setter writes STATUS3_LEECHSEED plus its encoded seeder id",
    }),
    Object.freeze({
      path: "tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts",
      locator: "Rapid Spin lifecycle clears STATUS3_LEECHSEED and its encoded seeder before the LeechSeedFree continuation",
    }),
  ]),
  BATTLE_SCRIPT_STATUS3_LEECHSEED_BATTLER_MASK: Object.freeze([
    Object.freeze({
      path: "tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts",
      locator: "Leech Seed setter writes STATUS3_LEECHSEED plus its encoded seeder id",
    }),
    Object.freeze({
      path: "tests/battleEndTurnOrchestration.test.ts",
      locator: "Leech Seed end-turn decodes a nonzero encoded seeder owner and retains the seed lifecycle bit",
    }),
    Object.freeze({
      path: "tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts",
      locator: "Rapid Spin lifecycle clears STATUS3_LEECHSEED and its encoded seeder before the LeechSeedFree continuation",
    }),
  ]),
  BATTLE_SCRIPT_STATUS3_YAWN: Object.freeze([
    Object.freeze({
      path: "tests/battleEndTurnOrchestration.test.ts",
      locator: "first end-turn pass only decrements the counter (TURN(2) -> TURN(1)), no sleep transition, zero RNG",
    }),
    Object.freeze({
      path: "tests/battleEndTurnOrchestration.test.ts",
      locator: "second end-turn pass empties the counter and fires the real sleep transition",
    }),
  ]),
  SIDE_STATUS_WORE_OFF_LABEL: Object.freeze([
    Object.freeze({
      path: "tests/battleScriptScreensWeatherOrchestration.test.ts",
      locator: "Light Screen: set -> 4 silent decrement ticks -> SideStatusWoreOff message/buffer on tick 5 -> re-set succeeds",
    }),
  ]),
});

function stateTestEvidenceFor(symbol: string): Evidence[] {
  const mapped = STATE_FAMILY_BEHAVIOR_EVIDENCE[symbol];
  if (mapped === undefined) return testEvidenceFor(symbol);
  if (!stateRowsBySymbol.has(symbol)) {
    throw new Error(`state behavior evidence names a non-manifest state symbol: ${symbol}`);
  }
  return mapped.map(({ path, locator }) => {
    requirePath(path);
    if (!readText(path).includes(locator)) {
      throw new Error(`state behavior evidence locator is not present in ${path}: ${locator}`);
    }
    return evidence(path, "tier-1-behavior-test", locator);
  });
}

const aggregateStateRows = [
  ["state:stat-stages", "stat-stage-array", "stat stages", "src/engine/battleScriptRulesContext.ts", "tests/gate6KernelInteractions.test.ts"],
  ["state:switching-entry", "switching-entry", "switching and entry lifecycle", "src/engine/battleScriptSwitchinOpcode.ts", "tests/gate6SwitchInteractions.test.ts"],
  ["state:end-turn", "end-turn-order", "end-turn order", "src/engine/battleEndTurnOrchestration.ts", "tests/gate6KernelInteractions.test.ts"],
  ["state:held-item-hooks", "held-item-dispatch", "held-item dispatch", "src/engine/battleScriptMoveEndOpcode.ts", "tests/gate6EntryItemInteractions.test.ts"],
  ["state:ability-hooks", "ability-dispatch", "ability dispatch", "src/engine/battleScriptSwitchinOpcode.ts", "tests/gate6StatusImmunityInteractions.test.ts"],
  ["state:rng-ledger", "rng-ledger", "deterministic move RNG ledger", "src/engine/battleScriptRulesContext.ts", "tests/gate6KernelInteractions.test.ts"],
] as const;

const stateFamilyRows: Row[] = [
  ...[...stateRowsBySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol)).map((item) => {
    const tests = stateTestEvidenceFor(item.symbol);
    return Object.freeze({
      id: `state:${item.symbol}`,
      label: item.symbol,
      family: item.family,
      sourceLine: item.line,
      status: tests.length > 0 ? "tier1-covered" : "source-modeled-no-focused-test",
      evidence: uniqueEvidence([
        evidence(item.path, "source-state-symbol", `line:${item.line}`),
        ...tests,
      ]),
      notes: "State-family coverage is reported independently from move/effect reachability and oracle receipts.",
    });
  }),
  ...aggregateStateRows.map(([id, family, label, sourcePath, testPath]) => Object.freeze({
    id,
    label,
    family,
    status: "tier1-covered",
    evidence: uniqueEvidence([
      evidence(sourcePath, "source-state-family"),
      evidence(testPath, "tier-1-test"),
    ]),
    notes: "Aggregate state owner; see symbol rows for the individual source bits and timers.",
  })),
];

const speciesById = new Map((speciesData.species as AnyRecord[]).map((entry) => [entry.id, entry]));
const heldItemByTableId = new Map((heldItems.entries as AnyRecord[]).map((entry) => [entry.itemTableId, entry]));
const itemHoldById = new Map((itemHoldEffects.items as AnyRecord[]).map((entry) => [entry.itemId, entry]));
const moveById = new Map((movesData.moves as AnyRecord[]).map((entry) => [entry.id, entry]));
const sourceHookAbilities = new Map<string, string[]>();
const sourceHookHoldEffects = new Map<string, string[]>();
for (const hookCase of hooks.abilityBattleEffects.cases as AnyRecord[]) {
  for (const mention of [...hookCase.dispatchLabels, ...hookCase.tokenMentions]) {
    const current = sourceHookAbilities.get(mention.token) ?? [];
    current.push(hookCase.caseName);
    sourceHookAbilities.set(mention.token, current);
  }
}
for (const hookCase of hooks.itemBattleEffects.cases as AnyRecord[]) {
  for (const mention of [...hookCase.dispatchLabels, ...hookCase.tokenMentions]) {
    const current = sourceHookHoldEffects.get(mention.token) ?? [];
    current.push(hookCase.caseName);
    sourceHookHoldEffects.set(mention.token, current);
  }
}
for (const [name, sites] of Object.entries(hooks.inlineSites.abilities as AnyRecord)) {
  if (sites.length > 0) sourceHookAbilities.set(name, [...(sourceHookAbilities.get(name) ?? []), "inline-site"]);
}
for (const [name, sites] of Object.entries(hooks.inlineSites.holdEffects as AnyRecord)) {
  if (sites.length > 0) sourceHookHoldEffects.set(name, [...(sourceHookHoldEffects.get(name) ?? []), "inline-site"]);
}

const scenarioPaths = readdirSync(repoPath("tools/battle-lab"))
  .filter((name) => /^gate6-.*\.json$/.test(name))
  .sort()
  .map((name) => `tools/battle-lab/${name}`);
const scenarioByPath = new Map(scenarioPaths.map((path) => [path, readJson(path)]));
function canonicalCardId(raw: string): string {
  const upper = raw.toUpperCase();
  return upper.endsWith("B") ? `${upper.slice(0, -1)}b` : upper;
}
const completedReceiptHeadings = new Set(
  [...scout.slice(scout.indexOf("## Completed receipt notes")).matchAll(/^### (R\d+b?)(?:\s*\/[^—]+)?\s+—/gm)].map((match) => canonicalCardId(match[1]!)),
);
const receiptCardRows = [...scout.matchAll(/^\| (R\d+b?) \|/gm)].map((match) => canonicalCardId(match[1]!));
const rankedReceiptCards = [...scout.matchAll(/^\d+\. \*\*(R\d+b?)/gm)].map((match) => canonicalCardId(match[1]!));
const receiptCardIds = [...new Set([...receiptCardRows, ...completedReceiptHeadings])].sort((a, b) => {
  const rankA = rankedReceiptCards.indexOf(a);
  const rankB = rankedReceiptCards.indexOf(b);
  return (rankA < 0 ? 999 : rankA) - (rankB < 0 ? 999 : rankB) || a.localeCompare(b, undefined, { numeric: true });
});

function scenarioCardId(path: string): string | null {
  const name = path.split("/").at(-1)!.replace(/^gate6-/, "").replace(/\.json$/, "");
  const match = name.match(/^(r\d+b?)(?:-|$)/i);
  return match ? canonicalCardId(match[1]!) : null;
}

const scenarioRows: Row[] = scenarioPaths.map((path) => {
  const scenario = scenarioByPath.get(path)!;
  const cardId = scenarioCardId(path)!;
  if (scenario.mode !== "mechanicLab" || scenario.profile !== "battle-scene-off") {
    throw new Error(`${path} is not a Battle Scene OFF mechanicLab request`);
  }
  const captures = scenario.trace?.captureFrames ?? [];
  const documented = completedReceiptHeadings.has(cardId);
  const parties = [
    ...(scenario.overrides?.parties?.player ?? []),
    ...(scenario.overrides?.parties?.opponent ?? []),
  ];
  const effectFamilies = [...new Set(parties.flatMap((party: AnyRecord) => (party.moves ?? [])
    .map((moveId: number) => moveById.get(moveId)?.effect)
    .filter(Boolean)))].sort();
  const abilities = [...new Set(parties.map((party: AnyRecord) => speciesById.get(party.species)?.abilities?.[party.abilitySlot ?? 0]).filter(Boolean))].sort();
  const holdEffects = [...new Set(parties.map((party: AnyRecord) => itemHoldById.get(party.item)?.holdEffect).filter(Boolean))].sort();
  return Object.freeze({
    id: `receipt:${path}`,
    label: path.split("/").at(-1)!,
    cardId,
    status: documented ? "oracle-receipted" : "fixture-only-no-committed-receipt",
    profile: scenario.profile,
    mode: scenario.mode,
    seed: scenario.seed,
    captureCount: captures.length,
    effectFamilies,
    abilities,
    holdEffects,
    evidence: uniqueEvidence([
      evidence(path, "parameterized-oracle-request"),
      evidence(SCOUT_PATH, documented ? "completed-receipt-note" : "staging-card"),
    ]),
    notes: documented
      ? "The scout's completed receipt notes document deterministic semantic observations for this request card."
      : "Request is committed, but a deterministic receipt is not documented in the completed receipt notes.",
  });
});

const scenarioRowsByCard = new Map<string, Row[]>();
for (const row of scenarioRows) scenarioRowsByCard.set(row.cardId, [...(scenarioRowsByCard.get(row.cardId) ?? []), row]);
const receiptFamilyRows: Row[] = receiptCardIds.map((cardId) => {
  const scenarios = scenarioRowsByCard.get(cardId) ?? [];
  const documented = completedReceiptHeadings.has(cardId);
  const cardEvidence: Evidence[] = [evidence(SCOUT_PATH, documented ? "completed-receipt-note" : "interaction-card")];
  for (const row of scenarios) cardEvidence.push(...row.evidence);
  if (cardId === "R14") cardEvidence.push(evidence("docs/absorbing-abilities-ground-truth.md", "banked-oracle-receipt"));
  return Object.freeze({
    id: `receipt-family:${cardId}`,
    label: cardId,
    status: documented ? "oracle-receipted-family" : scenarios.length > 0 ? "oracle-receipt-gap" : "oracle-receipt-gap-no-fixture",
    fixtureCount: scenarios.length,
    scenarioIds: scenarios.map((row) => row.id),
    evidence: uniqueEvidence(cardEvidence),
    notes: documented
      ? "At least one deterministic parameterized receipt is recorded for this interaction family."
      : "This is the next bounded oracle-backed acceptance unit until a receipt is added; kernel/static evidence does not close it.",
  });
});

function carrierCountForAbility(name: string, level50: boolean): number {
  return (mons.entries as AnyRecord[]).filter((mon) => (!level50 || mon.index < LEVEL50_SET_COUNT)
    && (speciesById.get(Number(mon.species.replace("SPECIES_", "")))?.abilities?.includes(name)
      || (speciesData.species as AnyRecord[]).find((species) => species.name === mon.species)?.abilities?.includes(name))).length;
}

// Species IDs are present in species-stats; the name fallback above is used
// because the Frontier corpus intentionally stores symbolic species names.
const speciesByName = new Map((speciesData.species as AnyRecord[]).map((entry) => [entry.name, entry]));
function abilityCarrierCount(name: string, level50: boolean): number {
  return (mons.entries as AnyRecord[]).filter((mon) => (!level50 || mon.index < LEVEL50_SET_COUNT)
    && (speciesByName.get(mon.species)?.abilities?.includes(name) ?? false)).length;
}
function holdCarrierCount(name: string, level50: boolean): number {
  return (mons.entries as AnyRecord[]).filter((mon) => (!level50 || mon.index < LEVEL50_SET_COUNT)
    && heldItemByTableId.get(mon.itemTableId)?.holdEffect === name).length;
}
function legalAbilityCarrierCount(name: string): number {
  return (speciesData.species as AnyRecord[]).filter((species) => species.abilities?.includes(name)).length;
}
function legalHoldEffectCarrierCount(name: string): number {
  return (itemHoldEffects.items as AnyRecord[]).filter((item) => item.holdEffect === name).length;
}
function receiptIdsFor(kind: "ability" | "hold-effect", name: string): string[] {
  return scenarioRows.filter((row) => {
    if (row.status !== "oracle-receipted") return false;
    return (kind === "ability" ? row.abilities : row.holdEffects).includes(name);
  }).map((row) => row.cardId);
}

type HookReceiptInfo = {
  directReceiptIds: string[];
  statusOverride?: string;
  evidence: Evidence[];
  notes?: string;
};

function hookReceiptInfo(kind: "ability" | "hold-effect", name: string): HookReceiptInfo {
  if (kind !== "ability") return { directReceiptIds: receiptIdsFor(kind, name), evidence: [] };
  if (name === "ABILITY_VOLT_ABSORB") {
    return {
      directReceiptIds: ["absorbing-volt-absorb-off"],
      evidence: [
        evidence("docs/absorbing-abilities-ground-truth.md", "dedicated-shared-dispatcher-receipt", "two-seed Volt Absorb OFF receipt"),
        evidence("tools/battle-lab/mechanic-absorbing-volt-absorb-off.json", "parameterized-oracle-request"),
        evidence("tools/probe/probe-absorbing-ability-off.py", "oracle-probe"),
        evidence("tools/probe/receipts/absorbing-volt-absorb-off-seed-610839776.json", "battle-scene-off-oracle-receipt"),
        evidence("tools/probe/receipts/absorbing-volt-absorb-off-seed-324508639.json", "battle-scene-off-oracle-receipt"),
      ],
      notes: "Dedicated two-seed Battle Scene OFF Volt Absorb receipt. This is the one shared absorbing-dispatcher semantic receipt, not a per-move receipt.",
    };
  }
  if (name === "ABILITY_WATER_ABSORB" || name === "ABILITY_FLASH_FIRE") {
    return {
      directReceiptIds: [],
      statusOverride: "shared-dispatcher-sibling-tier1-verified",
      evidence: [
        evidence("docs/absorbing-abilities-ground-truth.md", "shared-dispatcher-receipt-scope", "Volt receipt plus source/Tier-1 siblings"),
        evidence("tests/battleScriptHitChainOpcode.test.ts", "tier-1-absorbing-sibling-batch", "all matching/mismatched arms and target-state guards"),
        evidence("tests/damageCalc.test.ts", "tier-1-flash-fire-damage-consumer"),
      ],
      notes: "No direct Water Absorb/Flash Fire oracle receipt is claimed here: R10/R7 only happened to include those abilities. Their source switch arms are sibling-batch-verified under the one dedicated shared-dispatcher Volt receipt.",
    };
  }
  return { directReceiptIds: receiptIdsFor(kind, name), evidence: [] };
}

function parseParityRow(name: string, kind: "ability" | "hold-effect"): AnyRecord | undefined {
  const row = (kind === "ability" ? parityAbilityRows : parityHoldRows).get(name);
  if (!row) return undefined;
  const cells = row.cells;
  const l50 = Number((cells[2] ?? "0").match(/^\d+/)?.[0] ?? 0);
  const all = Number((cells[3] ?? "0").match(/^\d+/)?.[0] ?? 0);
  const refs = Number(cells[kind === "ability" ? 7 : 8] ?? 0);
  return { status: cells[1], l50, all, engineRefs: refs };
}

function makeHookRows(kind: "ability" | "hold-effect"): Row[] {
  const universe = kind === "ability" ? hooks.universes.abilities : hooks.universes.holdEffects;
  const sourceHooks = kind === "ability" ? sourceHookAbilities : sourceHookHoldEffects;
  return (universe as AnyRecord[]).map((member) => {
    const name = member.name as string;
    const census = parseParityRow(name, kind);
    const factoryCarriers = kind === "ability" ? abilityCarrierCount(name, true) : holdCarrierCount(name, true);
    const legalCarriers = kind === "ability" ? legalAbilityCarrierCount(name) : legalHoldEffectCarrierCount(name);
    const hookCases = [...new Set(sourceHooks.get(name) ?? [])].sort();
    const receipt = hookReceiptInfo(kind, name);
    const receiptIds = receipt.directReceiptIds;
    let status = "engine-referenced-no-oracle-receipt";
    if (name.endsWith("_NONE")) status = "sentinel-not-a-hook-member";
    else if (factoryCarriers === 0 && legalCarriers > 0) status = "zero-factory-carrier-widened-scope";
    else if (census?.status === "no-battle-hooks") status = "no-battle-hooks";
    else if (hookCases.length === 0) status = "source-hook-gap";
    else if (receipt.statusOverride) status = receipt.statusOverride;
    else if (receiptIds.length > 0) status = "oracle-receipted-hook";
    return Object.freeze({
      id: `${kind}:${name}`,
      label: name,
      status,
      universeId: member.id,
      factoryCarrierCount: factoryCarriers,
      legalCarrierCount: legalCarriers,
      sourceHookCases: hookCases,
      sourceHookPresent: hookCases.length > 0,
      censusStatus: census?.status ?? "not-in-factory-census",
      engineReferenceCount: census?.engineRefs ?? 0,
      oracleReceiptCards: receiptIds,
      evidence: uniqueEvidence([
        evidence(HOOKS_PATH, "source-hook-universe", `${kind}:${name}`),
        evidence(ABILITY_ITEM_DOC_PATH, "ability-item-census", `${kind}:${name}`),
        evidence(kind === "ability" ? SPECIES_PATH : ITEM_HOLD_EFFECTS_PATH, "legal-widened-scope"),
        evidence(kind === "ability" ? MONS_PATH : HELD_ITEMS_PATH, "factory-carrier-join"),
        ...(name === "ABILITY_VOLT_ABSORB" ? [] : receiptIds.map((cardId) => evidence(SCOUT_PATH, "oracle-receipt", cardId))),
        ...receipt.evidence,
      ]),
      notes: receipt.notes ?? (factoryCarriers === 0 && legalCarriers > 0
        ? "Legal Gen-3 widened-scope carrier exists, but no Level-50 Factory carrier exists; this is not a Factory closure."
        : "Engine references and source-hook presence are census facts, not semantic acceptance."),
    });
  });
}

const abilityRows = makeHookRows("ability");
const holdEffectRows = makeHookRows("hold-effect");

const trainerRows: Row[] = (trainers.entries as AnyRecord[]).map((trainer) => Object.freeze({
  id: `trainer:${trainer.id}`,
  label: trainer.sourceId,
  status: "catalog-joined-no-semantic-receipt",
  trainerId: trainer.id,
  name: trainer.name,
  facilityClass: trainer.facilityClass?.source,
  eligibleLevel50SetCount: trainer.monSet?.level50EligibleIds?.length ?? 0,
  evidence: uniqueEvidence([
    evidence(TRAINERS_PATH, "ordinary-trainer-catalog", `entries[${trainer.id}]`),
  ]),
  notes: "All trainer fields join mechanically; this row is not a trainer-specific oracle receipt.",
}));

const level50Rows: Row[] = (mons.entries as AnyRecord[])
  .filter((mon) => mon.index < LEVEL50_SET_COUNT)
  .map((mon) => Object.freeze({
    id: `level50-set:${mon.index}`,
    label: mon.label,
    status: "catalog-joined-no-semantic-receipt",
    setId: mon.index,
    species: mon.species,
    moves: mon.moves,
    item: mon.itemName,
    evidence: uniqueEvidence([
      evidence(MONS_PATH, "level50-catalog", `entries[${mon.index}]`),
      evidence(SPECIES_PATH, "species-join"),
      evidence(HELD_ITEMS_PATH, "held-item-join"),
      evidence(PARAMETERIZATION_PATH, "level50-roster-join"),
    ]),
    notes: "The 850-set enumeration proves legal catalog membership, not semantic/oracle acceptance of every set.",
  }));

function parseInteractionRows(): Row[] {
  const rows: Row[] = [];
  for (const line of scout.split("\n")) {
    const cells = splitMarkdownRow(line);
    if (cells === null || cells.length !== 4 || cells[0] === "Axis pair" || cells[0] === "---") continue;
    if (!cells[0]!.includes(" x ")) continue;
    const gap = cells[3]!;
    const cardIds = [...new Set([...gap.matchAll(/\b([RK]\d+b?)\b/gi)].map((match) => canonicalCardId(match[1]!)))];
    const cardRows = cardIds.map((id) => receiptFamilyRows.find((row) => row.label === id)).filter(Boolean) as Row[];
    const hasKernel = cardIds.some((id) => id.startsWith("K"));
    const allReceipted = cardRows.length > 0 && cardRows.every((row) => row.status === "oracle-receipted-family");
    const status = hasKernel && !cardIds.some((id) => id.startsWith("R"))
      ? "kernel-proven"
      : allReceipted
        ? "oracle-receipted-pair"
        : cardIds.length > 0
          ? "oracle-receipt-gap"
          : "tier1-pairwise-gap";
    const paths = markdownPaths(`${cells[2]} ${cells[3]}`).filter((path) => existsSync(repoPath(path)));
    const cardEvidence = cardRows.flatMap((row) => row.evidence);
    rows.push(Object.freeze({
      id: `interaction:${cells[0]}`,
      label: cells[0],
      status,
      recipeIds: cardIds,
      mechanism: cells[1],
      existingTier1Coverage: cells[2],
      gapOrFirstProof: gap,
      evidence: uniqueEvidence([
        evidence(SCOUT_PATH, "interaction-matrix"),
        ...paths.map((path) => evidence(path, "interaction-tier-1-or-scout")),
        ...cardEvidence,
      ]),
      notes: status === "oracle-receipt-gap"
        ? "Static and Tier-1 evidence remains visible, but the parameterized-oracle receipt is still an explicit gap."
        : "Pairwise evidence is not a Cartesian-product claim.",
    }));
  }
  return rows;
}

const interactionRows = parseInteractionRows();
const receiptGapCards = receiptFamilyRows.filter((row) => row.status !== "oracle-receipted-family");
const rankedGap = rankedReceiptCards.map((id) => receiptGapCards.find((row) => row.label === id)).find(Boolean) ?? receiptGapCards[0];
const nextAcceptanceOverride = scout.match(/^<!-- gate6-next-acceptance: (R\d+b?) -->$/m)?.[1];
const nextAcceptance = nextAcceptanceOverride === undefined
  ? rankedGap
  : receiptFamilyRows.find((row) => row.label === canonicalCardId(nextAcceptanceOverride));
if (nextAcceptanceOverride !== undefined && !nextAcceptance) {
  throw new Error(`Gate-6 next-acceptance override is not a known card: ${nextAcceptanceOverride}`);
}
const hasPerMoveHookJoinGaps = perMoveHookJoinTotals.gaps > 0;
const nextAcceptanceLabel = hasPerMoveHookJoinGaps
  ? "Per-move hook-join family"
  : nextAcceptance?.label ?? "Broader Gate-6 breadth acceptance";
const nextAcceptanceDetail = hasPerMoveHookJoinGaps
  ? `Choose one source-bounded item or ability hook-join family and account for complete Battle Script reachability, including implicit fallthrough and source branch guards. Do not promote the remaining explicit gaps: ${perMoveHookJoinSummary.item.gaps} item joins and ${perMoveHookJoinSummary.ability.gaps} ability joins remain unsupported.`
  : nextAcceptanceOverride === undefined
    ? nextAcceptance === undefined
      ? "All committed parameterized request cards are receipted, but that count alone does not meet ROADMAP.md:1604-1613's broader breadth acceptance (finite unsupported-entry closure, distinct effect/hook-family evidence, sibling batches, multiple seeded legal Factory rounds, and selected UI comparisons)."
      : "Add and document the missing parameterized-oracle receipt before treating this family as accepted."
    : "Upgrade its legacy receipt note to the compact deterministic semantic workflow.";
const nextAcceptanceText = `${nextAcceptanceLabel}: ${nextAcceptanceDetail}`;

const sourceInputs = [
  EXECUTABLE_DOC_PATH,
  ABILITY_ITEM_DOC_PATH,
  SCOUT_PATH,
  TOPOLOGY_PATH,
  PARAMETERIZATION_PATH,
  TRAINERS_PATH,
  MONS_PATH,
  HELD_ITEMS_PATH,
  SPECIES_PATH,
  ITEM_HOLD_EFFECTS_PATH,
  MOVES_PATH,
  HOOKS_PATH,
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/engine/battleScriptAbilityMovesBlock.ts",
  "tests/battleScriptAbilityMovesBlock.test.ts",
  "tests/soundproofOracleEvidence.test.ts",
  "tests/fixtures/soundproof-off-evidence.json",
  "src/engine/battleScriptHitChainOpcode.ts",
  "tests/battleScriptHitChainOpcode.test.ts",
  "tests/damageCalc.test.ts",
  "docs/absorbing-abilities-ground-truth.md",
  "tools/battle-lab/mechanic-absorbing-volt-absorb-off.json",
  "tools/probe/probe-absorbing-ability-off.py",
  "tools/probe/receipts/absorbing-volt-absorb-off-seed-610839776.json",
  "tools/probe/receipts/absorbing-volt-absorb-off-seed-324508639.json",
];
for (const path of sourceInputs) requirePath(path);

const manifest: AnyRecord = {
  schema: "gate6-coverage-manifest/v1",
  gate6: {
    closed: false,
    verdict: "OPEN — this first manifest exposes coverage and receipt gaps; it does not claim Gate 6 closed.",
    nextAcceptanceUnit: nextAcceptanceText,
    interpretation: "Static executable reachability, engine references, Tier-1 proofs, and oracle receipts are separate evidence classes.",
  },
  generatedBy: RERUN_COMMAND,
  sourceInputs,
  summary: {
    effects: { total: moveEffectRows.length, staticExecutable: moveEffectRows.filter((row) => row.status === "static-executable").length },
    moves: {
      total: moveRows.length,
      staticExecutable: moveRows.filter((row) => row.status === "static-executable").length,
      level50Roster: moveRows.filter((row) => row.level50Status !== "not-in-level50-roster").length,
      level50Executable: moveRows.filter((row) => row.level50Status === "level50-executable").length,
      level50RosterOnly: moveRows.filter((row) => row.level50Status === "level50-roster-only").length,
    },
    perMoveHookJoins: {
      item: perMoveHookJoinSummary.item,
      ability: perMoveHookJoinSummary.ability,
      total: perMoveHookJoinTotals,
    },
    stateFamilies: { total: stateFamilyRows.length, tier1Covered: stateFamilyRows.filter((row) => row.status === "tier1-covered").length },
    hooks: {
      abilities: { total: abilityRows.length, oracleReceipted: abilityRows.filter((row) => row.status === "oracle-receipted-hook").length, zeroFactoryWidened: abilityRows.filter((row) => row.status === "zero-factory-carrier-widened-scope").length },
      holdEffects: { total: holdEffectRows.length, oracleReceipted: holdEffectRows.filter((row) => row.status === "oracle-receipted-hook").length, zeroFactoryWidened: holdEffectRows.filter((row) => row.status === "zero-factory-carrier-widened-scope").length },
    },
    corpus: { ordinaryTrainers: trainerRows.length, level50Sets: level50Rows.length, fullSetCatalog: mons.entries.length },
    interactions: { total: interactionRows.length, kernelProven: interactionRows.filter((row) => row.status === "kernel-proven").length, oracleReceipted: interactionRows.filter((row) => row.status === "oracle-receipted-pair").length, receiptGaps: interactionRows.filter((row) => row.status === "oracle-receipt-gap").length },
    parameterizedOracle: { scenarioRequests: scenarioRows.length, receiptDocumented: scenarioRows.filter((row) => row.status === "oracle-receipted").length, receiptGaps: scenarioRows.filter((row) => row.status !== "oracle-receipted").length, familyCards: receiptFamilyRows.length, familyReceiptGaps: receiptGapCards.length },
  },
  sections: {
    moveEffect: { effects: moveEffectRows, moves: moveRows },
    perMoveHookJoins: perMoveHookJoinRows,
    stateFamilies: stateFamilyRows,
    hooks: { abilities: abilityRows, holdEffects: holdEffectRows },
    corpus: { trainers: trainerRows, level50Sets: level50Rows },
    interactions: interactionRows,
    parameterizedOracle: { families: receiptFamilyRows, scenarios: scenarioRows },
  },
};

assertManifest(manifest);

function evidenceText(items: readonly Evidence[]): string {
  return items.map((item) => `\`${item.path}${item.locator ? `#${item.locator}` : ""}\``).join("<br>");
}

function table(title: string, headers: string[], rows: readonly Row[], columns: ((row: Row) => string)[]): string[] {
  const lines = [`### ${title}`, "", `| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  for (const row of rows) lines.push(`| ${columns.map((column) => column(row)).join(" | ")} |`);
  lines.push("");
  return lines;
}

const markdown: string[] = [
  "# Gate 6 mechanics coverage manifest",
  "",
  `Generated by \`${RERUN_COMMAND}\` — byte-idempotent for an unchanged tree.`,
  "",
  "**Gate 6 is OPEN.** This first manifest makes coverage gaps inspectable; it does not turn static token references, opcode reachability, Tier-1 proofs, or staged lab requests into semantic/oracle acceptance.",
  "",
  `Next bounded acceptance unit: **${nextAcceptanceLabel}** — ${nextAcceptanceDetail}`,
  "",
  "## Headline",
  "",
  `- Effects: **${manifest.summary.effects.staticExecutable}/${manifest.summary.effects.total} static-executable**; moves: **${manifest.summary.moves.staticExecutable}/${manifest.summary.moves.total}** static-executable (**${manifest.summary.moves.level50Executable}/${manifest.summary.moves.level50Roster}** Level-50 roster moves executable, **${manifest.summary.moves.level50RosterOnly}** roster-only).`,
  `- Per-move hook joins: **${manifest.summary.perMoveHookJoins.item.gaps} item join gaps** and **${manifest.summary.perMoveHookJoins.ability.gaps} ability join gaps** across ${manifest.summary.perMoveHookJoins.item.rows} Level-50 roster moves; ${manifest.summary.perMoveHookJoins.ability.rows - manifest.summary.perMoveHookJoins.ability.gaps} ability rows are source-proven for the nine Soundproof selectors plus audited shared-absorbing routes, while every remaining gap retains its source-artifact locator and reason.`,
  `- State/status/volatile rows: **${manifest.summary.stateFamilies.tier1Covered}/${manifest.summary.stateFamilies.total}** have focused Tier-1 evidence; source-modeled rows remain listed separately.`,
  `- Hook universes: **${manifest.summary.hooks.abilities.total} abilities** and **${manifest.summary.hooks.holdEffects.total} hold effects**, including **${manifest.summary.hooks.abilities.zeroFactoryWidened + manifest.summary.hooks.holdEffects.zeroFactoryWidened}** legal widened-scope rows with zero Level-50 Factory carriers.`,
  `- Corpus: **${manifest.summary.corpus.ordinaryTrainers}/${trainers.count} ordinary trainers** and **${manifest.summary.corpus.level50Sets}/${LEVEL50_SET_COUNT} Level-50 sets** joined; the full set catalog contains ${manifest.summary.corpus.fullSetCatalog} rows including Open-only sets.`,
  `- Interaction matrix: **${manifest.summary.interactions.total}** axis-pair rows; ${manifest.summary.interactions.kernelProven} kernel-proven, ${manifest.summary.interactions.oracleReceipted} oracle-receipted, ${manifest.summary.interactions.receiptGaps} receipt gaps.`,
  `- Parameterized Battle Scene OFF requests: **${manifest.summary.parameterizedOracle.receiptDocumented}/${manifest.summary.parameterizedOracle.scenarioRequests}** scenario receipts documented; **${manifest.summary.parameterizedOracle.receiptGaps}** request-level gaps and **${manifest.summary.parameterizedOracle.familyReceiptGaps}** family-level gaps remain explicit. Receipt count alone does not close the broader Gate-6 breadth acceptance.`,
  "",
  "## Evidence rules",
  "",
  "- `static-executable` comes only from the executable-frontier census and means opcode/operand reachability, not correct state transitions.",
  "- `engine-referenced` comes only from the ability/item census. It is a worklist fact, not semantic verification.",
  "- `catalog-joined` proves a finite source/data join. It does not provide a per-trainer or per-set oracle receipt.",
  "- `source-proven-family` per-move hook joins name exact supported categories and carry one family witness per category. Soundproof reaches Cmd_attackcanceler; Volt/Water Absorb and Flash Fire reach accuracycheck → JumpIfMoveFailed. The shared absorber receipt is a two-seed Volt OFF trace plus all-three-arm Tier-1 siblings, not fabricated per-move receipts. No row claims unrelated families.",
  "- `unsupported` per-move hook joins are intentionally not inferred from the partial dispatcher catalogs. Each row repeats only move identity, effect, entry script, reason, and a locator into `level50-move-parameterization.json`; it is not a support claim.",
  "- `oracle-receipted` requires a committed deterministic request and receipt. Incidental ability presence in an unrelated scenario is not a direct ability receipt; Water Absorb and Flash Fire retain explicit shared-dispatcher sibling status rather than false direct receipt labels.",
  "- The five entries in `STATE_FAMILY_BEHAVIOR_EVIDENCE` use named behavior-test locators instead of token presence; that narrow Tier-1 override does not alter static, semantic, or oracle classifications.",
  "- Zero-Factory-carrier rows remain in the widened legal Gen-3 universe. They are not silently classified as Factory-complete.",
  "",
  "## Move/effect executable coverage",
  "",
];
markdown.push(...table("Effect scripts (all rows)", ["Effect", "Status", "L50 effect moves", "Semantic acceptance", "Evidence"], moveEffectRows, [
  (row) => row.label,
  (row) => row.status,
  (row) => String(row.level50MoveCount),
  (row) => row.semanticAcceptance,
  (row) => evidenceText(row.evidence),
]));
markdown.push(...table("Moves (all topology rows)", ["Move", "Effect", "Static status", "L50 status", "Semantic acceptance", "Evidence"], moveRows, [
  (row) => row.label,
  (row) => row.effect,
  (row) => row.status,
  (row) => row.level50Status,
  (row) => row.semanticAcceptance,
  (row) => evidenceText(row.evidence),
]));
markdown.push("## Per-move item and ability hook-join coverage\n\n");
markdown.push(...table("Item hook joins (all Level-50 roster moves)", ["Move", "Effect", "Entry script", "Status", "Category", "Reason", "Source artifact evidence"], perMoveHookJoinRows.item, [
  (row) => row.move,
  (row) => row.effect,
  (row) => row.entryScript,
  (row) => row.status,
  (row) => row.categories.length === 0 ? "—" : row.categories.join(", "),
  (row) => row.reason,
  (row) => evidenceText(row.evidence),
]));
markdown.push(...table("Ability hook joins (all Level-50 roster moves)", ["Move", "Effect", "Entry script", "Status", "Category", "Reason", "Source artifact evidence"], perMoveHookJoinRows.ability, [
  (row) => row.move,
  (row) => row.effect,
  (row) => row.entryScript,
  (row) => row.status,
  (row) => row.categories.length === 0 ? "—" : row.categories.join(", "),
  (row) => row.reason,
  (row) => evidenceText(row.evidence),
]));
markdown.push("## Status, volatile, and state families\n\n");
markdown.push(...table("State rows", ["Family", "State symbol", "Status", "Evidence"], stateFamilyRows, [
  (row) => row.family,
  (row) => row.label,
  (row) => row.status,
  (row) => evidenceText(row.evidence),
]));
markdown.push("## Held-effect and ability hook universes\n\n");
markdown.push(...table("Abilities (all legal-universe rows)", ["Ability", "Status", "L50 carriers", "Legal species carriers", "Source hooks", "Oracle cards", "Evidence"], abilityRows, [
  (row) => row.label,
  (row) => row.status,
  (row) => String(row.factoryCarrierCount),
  (row) => String(row.legalCarrierCount),
  (row) => row.sourceHookCases.join(", ") || "—",
  (row) => row.oracleReceiptCards.join(", ") || "—",
  (row) => evidenceText(row.evidence),
]));
markdown.push(...table("Hold effects (all legal-universe rows)", ["Hold effect", "Status", "L50 carriers", "Legal item rows", "Source hooks", "Oracle cards", "Evidence"], holdEffectRows, [
  (row) => row.label,
  (row) => row.status,
  (row) => String(row.factoryCarrierCount),
  (row) => String(row.legalCarrierCount),
  (row) => row.sourceHookCases.join(", ") || "—",
  (row) => row.oracleReceiptCards.join(", ") || "—",
  (row) => evidenceText(row.evidence),
]));
markdown.push("## Factory corpus enumeration\n\n");
markdown.push(...table("Ordinary trainers (300 rows)", ["ID", "Source trainer", "Name", "Status", "L50 eligible sets", "Evidence"], trainerRows, [
  (row) => String(row.trainerId),
  (row) => row.label,
  (row) => row.name,
  (row) => row.status,
  (row) => String(row.eligibleLevel50SetCount),
  (row) => evidenceText(row.evidence),
]));
markdown.push(...table("Level-50 sets (850 rows)", ["Set ID", "Set", "Species", "Item", "Status", "Evidence"], level50Rows, [
  (row) => String(row.setId),
  (row) => row.label,
  (row) => row.species,
  (row) => row.item,
  (row) => row.status,
  (row) => evidenceText(row.evidence),
]));
markdown.push("## Interaction matrix\n\n");
markdown.push(...table("Axis-pair rows", ["Axis pair", "Status", "Recipes", "Evidence", "Gap / first proof"], interactionRows, [
  (row) => row.label,
  (row) => row.status,
  (row) => row.recipeIds.join(", ") || "—",
  (row) => evidenceText(row.evidence),
  (row) => row.gapOrFirstProof,
]));
markdown.push("## Parameterized-oracle receipt coverage\n\n");
markdown.push(...table("Interaction family cards", ["Card", "Status", "Fixture requests", "Evidence", "Notes"], receiptFamilyRows, [
  (row) => row.label,
  (row) => row.status,
  (row) => String(row.fixtureCount),
  (row) => evidenceText(row.evidence),
  (row) => row.notes ?? "",
]));
markdown.push(...table("Gate-6 mechanicLab requests", ["Request", "Card", "Status", "Profile", "Captures", "Effect families", "Evidence"], scenarioRows, [
  (row) => row.label,
  (row) => row.cardId,
  (row) => row.status,
  (row) => row.profile,
  (row) => String(row.captureCount),
  (row) => row.effectFamilies.join(", ") || "—",
  (row) => evidenceText(row.evidence),
]));
markdown.push("## Explicit receipt gaps\n\n");
if (receiptGapCards.length === 0) {
  markdown.push("None — all committed parameterized request cards have completed receipt notes. This does not close the broader Gate-6 breadth acceptance.");
} else {
  receiptGapCards.forEach((row, index) => {
    markdown.push(`${index + 1}. **${row.label}** — ${row.notes} Evidence: ${evidenceText(row.evidence)}.`);
  });
}
markdown.push("\nThe JSON artifact is the authoritative machine-readable enumeration; this Markdown view intentionally repeats every row so neither a missing receipt nor an all-receipted count can hide behind an aggregate percentage.\n");

writeFileSync(JSON_OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(MARKDOWN_OUTPUT, markdown.join("\n"), "utf8");

console.log(
  `Gate-6 coverage manifest written to ${relative(REPO_ROOT, JSON_OUTPUT)} and ${relative(REPO_ROOT, MARKDOWN_OUTPUT)}\n`
    + `Effects: ${manifest.summary.effects.staticExecutable}/${manifest.summary.effects.total} static-executable; `
    + `moves: ${manifest.summary.moves.staticExecutable}/${manifest.summary.moves.total}; `
    + `L50 moves: ${manifest.summary.moves.level50Executable}/${manifest.summary.moves.level50Roster}\n`
    + `Per-move hook joins: ${manifest.summary.perMoveHookJoins.item.gaps} item gaps, ${manifest.summary.perMoveHookJoins.ability.gaps} ability gaps\n`
    + `Hooks: ${manifest.summary.hooks.abilities.total} abilities, ${manifest.summary.hooks.holdEffects.total} hold effects; `
    + `oracle receipts: ${manifest.summary.parameterizedOracle.receiptDocumented}/${manifest.summary.parameterizedOracle.scenarioRequests} scenarios\n`
    + `Next acceptance unit: ${nextAcceptanceLabel}. Gate 6 remains OPEN.`,
);
