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
        if (!Array.isArray(row.categories) || row.categories.length === 0 || !String(row.notes ?? "").includes(`unrelated ${axis} families`)) {
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
  assertOnDamageCheckpoint(manifest);
  assertSynchronizeCheckpoint(manifest);
  assertTryinfatuatingObliviousCheckpoint(manifest);
  assertKingsRockCheckpoint(manifest);

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
 * graph/program/source-handoff proof. Both ON_DAMAGE families are additionally
 * promoted as separate family-level route/guard certificates; the delayed
 * Future Sight bypass remains an explicit Color Change source exception in the
 * parameterization.
 * Keep the remaining finite gaps visible without copying the parameterization's
 * large move payload into this report a second time.
 */
type PerMoveHookJoinAxis = "item" | "ability";
const PER_MOVE_HOOK_JOIN_AXES: readonly PerMoveHookJoinAxis[] = ["item", "ability"];
const SOURCE_PROVEN_FAMILY_STATUS = "source-proven-family";
const SOUNDPROOF_MOVES_BLOCK_CATEGORY = "moves-block-soundproof";
const CONTACT_CATEGORY = "moveend-contact-on-damage";
const COLOR_CHANGE_CATEGORY = "moveend-color-change";
const SYNCHRONIZE_CATEGORY = "moveend-synchronize-status";
const TRYINFATUATING_OBLIVIOUS_CATEGORY = "tryinfatuating-oblivious";
const TRYEXPLOSION_DAMP_CATEGORY = "tryexplosion-damp";
const KINGS_ROCK_CATEGORY = "moveend-kings-rock";
const SHELL_BELL_CATEGORY = "moveend-shell-bell";
const SHELL_BELL_SELECTOR_DERIVED_FROM = "moveend-shell-bell candidate selector reuses the moveend-color-change moves.json power != 0 population: the same successful target-datahpupdate route, read at a different MOVEEND state";
const ABSORBING_CATEGORIES = new Set([
  "absorbing-volt-absorb",
  "absorbing-water-absorb",
  "absorbing-flash-fire",
]);
const ON_DAMAGE_ABILITY_NAMES = new Set([
  "ABILITY_COLOR_CHANGE",
  "ABILITY_ROUGH_SKIN",
  "ABILITY_EFFECT_SPORE",
  "ABILITY_POISON_POINT",
  "ABILITY_STATIC",
  "ABILITY_FLAME_BODY",
  "ABILITY_CUTE_CHARM",
]);
const parameterizationMoves = parameterization.moves as AnyRecord[];
if (parameterizationMoves.length !== parameterizedMoves.size) {
  throw new Error("level50 parameterization has duplicate move identities");
}
const onDamageAudit = parameterization.coverage?.hookCatalogs?.ability?.onDamage as AnyRecord | undefined;
if (!onDamageAudit || onDamageAudit.status !== "family-level-color-change-and-contact-promotion") {
  throw new Error("level50 parameterization lacks the Color Change/contact family promotion checkpoint");
}
const onDamageCategories = onDamageAudit.categories as AnyRecord | undefined;
if (!onDamageCategories) throw new Error("ON_DAMAGE evidence checkpoint lacks categories");
const onDamageContactCandidates = onDamageCategories["moveend-contact-on-damage"]?.candidateRows as AnyRecord[] | undefined;
const onDamageColorChangeCandidates = onDamageCategories["moveend-color-change"]?.candidateRows as AnyRecord[] | undefined;
if (!Array.isArray(onDamageContactCandidates) || !Array.isArray(onDamageColorChangeCandidates)) {
  throw new Error("ON_DAMAGE evidence checkpoint lacks finite candidate rows");
}
const onDamageBlockers = onDamageAudit.blockers as AnyRecord[] | undefined;
if (!Array.isArray(onDamageBlockers) || onDamageBlockers.some((blocker) => !String(blocker.id ?? "").trim() || !String(blocker.reason ?? "").trim())) {
  throw new Error("ON_DAMAGE evidence checkpoint has malformed active blockers");
}
const onDamageBlockerIds = onDamageBlockers.map((blocker) => blocker.id as string);
const onDamageRetiredBlockers = onDamageAudit.retiredBlockers as AnyRecord[] | undefined;
if (!Array.isArray(onDamageRetiredBlockers) || onDamageRetiredBlockers.length === 0 || onDamageRetiredBlockers.some((blocker) => !String(blocker.id ?? "").trim() || !String(blocker.reason ?? "").trim())) {
  throw new Error("ON_DAMAGE evidence checkpoint lacks the retired-blocker receipt record");
}
const onDamageRetiredBlockerIds = onDamageRetiredBlockers.map((blocker) => blocker.id as string);
const onDamageColorChange = onDamageAudit.colorChange as AnyRecord | undefined;
if (!onDamageColorChange || onDamageColorChange.status !== SOURCE_PROVEN_FAMILY_STATUS) {
  throw new Error("ON_DAMAGE audit lacks the source-proven Color Change family");
}
const onDamageColorChangeSourceProvenRows = onDamageColorChange.sourceProvenRows as string[] | undefined;
const onDamageColorChangeExceptionRows = onDamageColorChange.sourceExceptionRows as AnyRecord[] | undefined;
const onDamageColorChangeBlockers = onDamageColorChange.blockers as AnyRecord[] | undefined;
const onDamageColorChangeRetiredBlockers = onDamageColorChange.retiredBlockers as AnyRecord[] | undefined;
const onDamageColorChangeRouteWitnesses = onDamageColorChange.routeWitnesses as AnyRecord[] | undefined;
if (!Array.isArray(onDamageColorChangeSourceProvenRows)
  || !Array.isArray(onDamageColorChangeExceptionRows)
  || !Array.isArray(onDamageColorChangeBlockers)
  || !Array.isArray(onDamageColorChangeRetiredBlockers)
  || !Array.isArray(onDamageColorChangeRouteWitnesses)
  || onDamageColorChangeSourceProvenRows.length + onDamageColorChangeExceptionRows.length !== onDamageColorChange.candidateCount
  || onDamageColorChange.candidateCount !== onDamageColorChangeCandidates.length
  || onDamageColorChangeSourceProvenRows.length !== 182
  || onDamageColorChangeExceptionRows.length !== 1
  || onDamageColorChangeBlockers.length !== 0
  || onDamageColorChangeRetiredBlockers.length !== 2
  || onDamageColorChangeRouteWitnesses.length !== onDamageColorChange.candidateCount) {
  throw new Error("ON_DAMAGE Color Change family accounting is not the finite 183/182/1 contract");
}
const onDamageColorChangeRetiredBlockerIds = onDamageColorChangeRetiredBlockers.map((blocker) => blocker.id as string);
const colorChangeExceptionIds = onDamageColorChangeExceptionRows.map((exception) => exception.id as string);
for (const witness of onDamageColorChangeRouteWitnesses) {
  if (witness.status === "source-exception") {
    if (witness.move !== "MOVE_FUTURE_SIGHT" || !witness.exception?.id || !colorChangeExceptionIds.includes(witness.exception.id)) {
      throw new Error("Color Change source exception is not the named Future Sight bypass");
    }
    continue;
  }
  if (witness.status !== "source-proven" || !onDamageColorChangeSourceProvenRows.includes(witness.move)) {
    throw new Error(`Color Change route witness is not accounted for: ${String(witness.move)}`);
  }
  const family = witness.familyEvidence as AnyRecord | undefined;
  const entryPath = family?.entryPath as AnyRecord | undefined;
  const graphRoute = entryPath?.graph?.route as AnyRecord[] | undefined;
  const programRoute = entryPath?.program?.route as AnyRecord[] | undefined;
  const dataHpUpdate = entryPath?.dataHpUpdate as AnyRecord | undefined;
  const moveEnd = entryPath?.moveEnd as AnyRecord | undefined;
  if (family?.category !== COLOR_CHANGE_CATEGORY
    || family.selector?.guard !== "gBattleMoves[move].power != 0"
    || !Array.isArray(graphRoute)
    || !Array.isArray(programRoute)
    || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
    || dataHpUpdate?.mnemonic !== "datahpupdate"
    || JSON.stringify(dataHpUpdate.operands) !== JSON.stringify(["BS_TARGET"])
    || moveEnd?.state !== "MOVEEND_ON_DAMAGE_ABILITIES"
    || moveEnd?.stateValue !== 3
    || !family.runtimeGuardSignature?.dataHpUpdate?.writes?.length
    || !family.familyVerification?.oracleReceipt) {
    throw new Error(`Color Change family route/guard certificate is incomplete for ${witness.move}`);
  }
}
const onDamageContact = onDamageAudit.contact as AnyRecord | undefined;
const onDamageContactSourceProvenRows = onDamageContact?.sourceProvenRows as string[] | undefined;
const onDamageContactExceptionRows = onDamageContact?.sourceExceptionRows as AnyRecord[] | undefined;
const onDamageContactBlockers = onDamageContact?.blockers as AnyRecord[] | undefined;
const onDamageContactRetiredBlockers = onDamageContact?.retiredBlockers as AnyRecord[] | undefined;
const onDamageContactRouteWitnesses = onDamageContact?.routeWitnesses as AnyRecord[] | undefined;
if (!onDamageContact
  || onDamageContact.status !== SOURCE_PROVEN_FAMILY_STATUS
  || !Array.isArray(onDamageContactSourceProvenRows)
  || !Array.isArray(onDamageContactExceptionRows)
  || !Array.isArray(onDamageContactBlockers)
  || !Array.isArray(onDamageContactRetiredBlockers)
  || !Array.isArray(onDamageContactRouteWitnesses)
  || onDamageContact.candidateCount !== onDamageContactCandidates.length
  || onDamageContactSourceProvenRows.length !== 94
  || onDamageContactExceptionRows.length !== 0
  || onDamageContactBlockers.length !== 0
  || onDamageContactRetiredBlockers.length !== 2
  || onDamageContactRouteWitnesses.length !== onDamageContact.candidateCount) {
  throw new Error("ON_DAMAGE contact family accounting is not the finite 94/94/0 contract");
}
for (const witness of onDamageContactRouteWitnesses) {
  if (witness.status !== "source-proven" || !onDamageContactSourceProvenRows.includes(witness.move)) {
    throw new Error("contact route witness is not accounted for: " + String(witness.move));
  }
  const family = witness.familyEvidence as AnyRecord | undefined;
  const entryPath = family?.entryPath as AnyRecord | undefined;
  const graphRoute = entryPath?.graph?.route as AnyRecord[] | undefined;
  const programRoute = entryPath?.program?.route as AnyRecord[] | undefined;
  const dataHpUpdate = entryPath?.dataHpUpdate as AnyRecord | undefined;
  const moveEnd = entryPath?.moveEnd as AnyRecord | undefined;
  if (family?.category !== CONTACT_CATEGORY
    || family.selector?.guard !== "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)"
    || !Array.isArray(graphRoute)
    || !Array.isArray(programRoute)
    || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
    || !graphRoute.some((statement) => statement.mnemonic === "datahpupdate" && JSON.stringify(statement.operands) === JSON.stringify(["BS_TARGET"]))
    || dataHpUpdate?.mnemonic !== "datahpupdate"
    || JSON.stringify(dataHpUpdate.operands) !== JSON.stringify(["BS_TARGET"])
    || moveEnd?.state !== "MOVEEND_ON_DAMAGE_ABILITIES"
    || moveEnd?.stateValue !== 3
    || !family.runtimeGuardSignature?.orderedAbilityGuards?.includes("TARGET_TURN_DAMAGED")
    || !family.runtimeGuardSignature?.orderedAbilityGuards?.includes("(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)")
    || !family.runtimeGuardSignature?.dataHpUpdate?.writes?.length
    || family.familyVerification?.oracleReceipt !== "tests/onDamageContactOracleEvidence.test.ts#shared ON_DAMAGE contact dispatcher arm") {
    throw new Error("contact family route/guard certificate is incomplete for " + String(witness.move));
  }
}

const synchronizeAudit = parameterization.coverage?.hookCatalogs?.ability?.synchronize as AnyRecord | undefined;
if (!synchronizeAudit || synchronizeAudit.status !== SOURCE_PROVEN_FAMILY_STATUS) {
  throw new Error("level50 parameterization lacks the Synchronize family promotion checkpoint");
}
const synchronizeCandidates = synchronizeAudit.sourceMoveCandidates as AnyRecord[] | undefined;
const synchronizeSourceProvenRows = synchronizeAudit.sourceProvenRows as string[] | undefined;
const synchronizeExceptions = synchronizeAudit.sourceExceptionRows as AnyRecord[] | undefined;
const synchronizeBlockers = synchronizeAudit.blockers as AnyRecord[] | undefined;
const synchronizeRouteWitnesses = synchronizeAudit.routeWitnesses as AnyRecord[] | undefined;
if (!Array.isArray(synchronizeCandidates)
  || !Array.isArray(synchronizeSourceProvenRows)
  || !Array.isArray(synchronizeExceptions)
  || !Array.isArray(synchronizeBlockers)
  || !Array.isArray(synchronizeRouteWitnesses)
  || synchronizeAudit.candidateCount !== 30
  || synchronizeCandidates.length !== 30
  || synchronizeSourceProvenRows.length !== 30
  || synchronizeExceptions.length !== 0
  || synchronizeBlockers.length !== 0
  || synchronizeRouteWitnesses.length !== 30) {
  throw new Error("Synchronize family accounting is not the finite 30/30/0/0 contract");
}
const synchronizeCandidateMoves = new Set(synchronizeCandidates.map((candidate) => candidate.move as string));
if (synchronizeCandidateMoves.size !== synchronizeCandidates.length
  || synchronizeSourceProvenRows.some((move) => !synchronizeCandidateMoves.has(move))) {
  throw new Error("Synchronize candidate/proven rows are not a one-to-one finite roster census");
}
for (const witness of synchronizeRouteWitnesses) {
  if (witness.status !== "source-proven" || !synchronizeSourceProvenRows.includes(witness.move)) {
    throw new Error(`Synchronize route witness is not accounted for: ${String(witness.move)}`);
  }
  const family = witness.familyEvidence as AnyRecord | undefined;
  const entryPath = family?.entryPath as AnyRecord | undefined;
  const graphRoute = entryPath?.graph?.route as AnyRecord[] | undefined;
  const programRoute = entryPath?.program?.route as AnyRecord[] | undefined;
  const dispatcher = family?.dispatcher as AnyRecord | undefined;
  const target = dispatcher?.target as AnyRecord | undefined;
  const attacker = dispatcher?.attacker as AnyRecord | undefined;
  const moveEndTail = entryPath?.moveEndTail as AnyRecord | null | undefined;
  if (family?.category !== SYNCHRONIZE_CATEGORY
    || !family.selector?.entryScript
    || !Array.isArray(family.selector?.selectedEffects)
    || !Array.isArray(graphRoute)
    || !Array.isArray(programRoute)
    || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
    || !graphRoute.some((statement) => statement.mnemonic === family.entryPath?.setter?.mnemonic)
    || !graphRoute.some((statement) => statement.mnemonic === family.entryPath?.dispatch?.mnemonic)
    || !graphRoute.some((statement) => statement.mnemonic === family.entryPath?.moveEnd?.mnemonic)
    || target?.state !== "MOVEEND_SYNCHRONIZE_TARGET"
    || target?.stateValue !== 2
    || attacker?.state !== "MOVEEND_SYNCHRONIZE_ATTACKER"
    || attacker?.stateValue !== 5
    || !family.runtimeGuardSignature?.selector?.effects?.length
    || !family.runtimeGuardSignature?.setMoveEffect?.orderedGuards?.length
    || !family.runtimeGuardSignature?.chance?.guards?.length
    || family.familyVerification?.oracleReceipt !== "docs/synchronize-abilities-ground-truth.md#3-two-seed-battle-scene-off-receipts"
    || family.familyVerification?.oracleFixture !== "tools/battle-lab/mechanic-synchronize-thunder-wave-off.json"
    || family.familyVerification?.oracleProbe !== "tools/probe/probe-synchronize-off.py"
    || !Array.isArray(family.familyVerification?.oracleReceiptFiles)
    || (witness.move === "MOVE_TWINEEDLE" && (!moveEndTail || !moveEndTail.graph?.route?.some((statement: AnyRecord) => statement.mnemonic === "moveendfrom")))) {
    throw new Error(`Synchronize family route/guard certificate is incomplete for ${String(witness.move)}`);
  }
}

const kingsRockAudit = parameterization.coverage?.hookCatalogs?.item?.kingsRock as AnyRecord | undefined;
const kingsRockCandidates = kingsRockAudit?.sourceMoveCandidates as AnyRecord[] | undefined;
const kingsRockSourceProvenRows = kingsRockAudit?.sourceProvenRows as string[] | undefined;
const kingsRockExceptions = kingsRockAudit?.sourceExceptionRows as AnyRecord[] | undefined;
const kingsRockBlockers = kingsRockAudit?.blockers as AnyRecord[] | undefined;
const kingsRockRouteWitnesses = kingsRockAudit?.routeWitnesses as AnyRecord[] | undefined;
if (!kingsRockAudit
  || kingsRockAudit.status !== SOURCE_PROVEN_FAMILY_STATUS
  || kingsRockAudit.candidateCount !== 106
  || !Array.isArray(kingsRockCandidates) || kingsRockCandidates.length !== 106
  || !Array.isArray(kingsRockSourceProvenRows) || kingsRockSourceProvenRows.length !== 105
  || !Array.isArray(kingsRockExceptions) || kingsRockExceptions.length !== 1
  || kingsRockExceptions[0]?.move !== "MOVE_TICKLE"
  || !Array.isArray(kingsRockBlockers) || kingsRockBlockers.length !== 0
  || !Array.isArray(kingsRockRouteWitnesses) || kingsRockRouteWitnesses.length !== 105
  || kingsRockCandidates.filter((candidate) => candidate.executionInventory === "level50-roster-only").length !== 12) {
  throw new Error("King's Rock family accounting is not the finite 106/105/1/0 contract with 12 roster-only rows");
}
for (const witness of kingsRockRouteWitnesses) {
  const family = witness.familyEvidence as AnyRecord | undefined;
  const graphRoute = family?.entryPath?.graph?.route as AnyRecord[] | undefined;
  const programRoute = family?.entryPath?.program?.route as AnyRecord[] | undefined;
  if (witness.status !== "source-proven"
    || !kingsRockSourceProvenRows.includes(witness.move)
    || family?.category !== KINGS_ROCK_CATEGORY
    || !Array.isArray(graphRoute) || !Array.isArray(programRoute)
    || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
    || !graphRoute.some((statement) => statement.mnemonic === "datahpupdate" && JSON.stringify(statement.operands) === JSON.stringify(["BS_TARGET"]))
    || family.entryPath?.moveEnd?.state !== "MOVEEND_KINGSROCK_SHELLBELL"
    || family.entryPath?.moveEnd?.stateValue !== 12
    || family.dispatcher?.stateValue !== 12
    || family.runtimeGuardSignature?.orderedGuards?.[4] !== "Random() % 100 (draw occurs before the move-flag and target-HP tests)"
    || family.runtimeGuardSignature?.holdEffect?.effect !== "HOLD_EFFECT_FLINCH"
    || family.familyVerification?.oracleReceiptFiles?.[0] !== "tools/probe/receipts/kings-rock-flinch-off.json") {
    throw new Error(`King's Rock family route/guard certificate is incomplete for ${String(witness.move)}`);
  }
}

const shellBellAudit = parameterization.coverage?.hookCatalogs?.item?.shellBell as AnyRecord | undefined;
const shellBellCandidates = shellBellAudit?.sourceMoveCandidates as AnyRecord[] | undefined;
const shellBellSourceProvenRows = shellBellAudit?.sourceProvenRows as string[] | undefined;
const shellBellExceptions = shellBellAudit?.sourceExceptionRows as AnyRecord[] | undefined;
const shellBellBlockers = shellBellAudit?.blockers as AnyRecord[] | undefined;
const shellBellRouteWitnesses = shellBellAudit?.routeWitnesses as AnyRecord[] | undefined;
if (!shellBellAudit
  || shellBellAudit.status !== SOURCE_PROVEN_FAMILY_STATUS
  || shellBellAudit.candidateCount !== 183
  || !Array.isArray(shellBellCandidates) || shellBellCandidates.length !== 183
  || !Array.isArray(shellBellSourceProvenRows) || shellBellSourceProvenRows.length !== 182
  || !Array.isArray(shellBellExceptions) || shellBellExceptions.length !== 1
  || shellBellExceptions[0]?.move !== "MOVE_FUTURE_SIGHT"
  || !Array.isArray(shellBellBlockers) || shellBellBlockers.length !== 0
  || !Array.isArray(shellBellRouteWitnesses) || shellBellRouteWitnesses.length !== 182) {
  throw new Error("Shell Bell family accounting is not the finite 183/182/1/0 contract");
}
if (!kingsRockSourceProvenRows!.every((move) => shellBellSourceProvenRows!.includes(move))) {
  throw new Error("King's Rock's 105 promoted rows are not a full subset of Shell Bell's 182 promoted rows");
}
for (const witness of shellBellRouteWitnesses) {
  const family = witness.familyEvidence as AnyRecord | undefined;
  const graphRoute = family?.entryPath?.graph?.route as AnyRecord[] | undefined;
  const programRoute = family?.entryPath?.program?.route as AnyRecord[] | undefined;
  if (witness.status !== "source-proven"
    || !shellBellSourceProvenRows.includes(witness.move)
    || family?.category !== SHELL_BELL_CATEGORY
    || !Array.isArray(graphRoute) || !Array.isArray(programRoute)
    || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
    || !graphRoute.some((statement) => statement.mnemonic === "datahpupdate" && JSON.stringify(statement.operands) === JSON.stringify(["BS_TARGET"]))
    || family.entryPath?.moveEnd?.state !== "MOVEEND_KINGSROCK_SHELLBELL"
    || family.entryPath?.moveEnd?.stateValue !== 12
    || family.dispatcher?.stateValue !== 12
    || family.runtimeGuardSignature?.orderedGuards?.[3] !== "gSpecialStatuses[gBattlerTarget].shellBellDmg != 0"
    || family.runtimeGuardSignature?.holdEffect?.effect !== "HOLD_EFFECT_SHELL_BELL"
    || family.familyVerification?.oracleReceiptFiles?.[0] !== "tools/probe/receipts/shell-bell-heal-off.json") {
    throw new Error(`Shell Bell family route/guard certificate is incomplete for ${String(witness.move)}`);
  }
}

const tryinfatuatingObliviousAudit = parameterization.coverage?.hookCatalogs?.ability?.tryinfatuatingOblivious as AnyRecord | undefined;
const tryinfatuatingObliviousCandidates = tryinfatuatingObliviousAudit?.sourceMoveCandidates as AnyRecord[] | undefined;
const tryinfatuatingObliviousSourceProvenRows = tryinfatuatingObliviousAudit?.sourceProvenRows as string[] | undefined;
const tryinfatuatingObliviousExceptions = tryinfatuatingObliviousAudit?.sourceExceptionRows as AnyRecord[] | undefined;
const tryinfatuatingObliviousBlockers = tryinfatuatingObliviousAudit?.blockers as AnyRecord[] | undefined;
const tryinfatuatingObliviousRouteWitnesses = tryinfatuatingObliviousAudit?.routeWitnesses as AnyRecord[] | undefined;
const TRYINFATUATING_ATTRACT_ROUTE = [
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
const TRYINFATUATING_OBLIVIOUS_GUARDS = [
  "gBattleMons[gBattlerTarget].ability == ABILITY_OBLIVIOUS first",
  "same attacker/target gender",
  "gBattleMons[gBattlerTarget].status2 & STATUS2_INFATUATION",
  "attacker gender == MON_GENDERLESS",
  "target gender == MON_GENDERLESS",
];
if (!tryinfatuatingObliviousAudit
  || tryinfatuatingObliviousAudit.status !== SOURCE_PROVEN_FAMILY_STATUS
  || tryinfatuatingObliviousAudit.selector !== "moveTable.effect === EFFECT_ATTRACT"
  || tryinfatuatingObliviousAudit.candidateCount !== 1
  || !Array.isArray(tryinfatuatingObliviousCandidates) || tryinfatuatingObliviousCandidates.length !== 1
  || !Array.isArray(tryinfatuatingObliviousSourceProvenRows) || JSON.stringify(tryinfatuatingObliviousSourceProvenRows) !== JSON.stringify(["MOVE_ATTRACT"])
  || !Array.isArray(tryinfatuatingObliviousExceptions) || tryinfatuatingObliviousExceptions.length !== 0
  || !Array.isArray(tryinfatuatingObliviousBlockers) || tryinfatuatingObliviousBlockers.length !== 0
  || !Array.isArray(tryinfatuatingObliviousRouteWitnesses) || tryinfatuatingObliviousRouteWitnesses.length !== 1
  || tryinfatuatingObliviousCandidates[0]?.move !== "MOVE_ATTRACT"
  || tryinfatuatingObliviousCandidates[0]?.moveId !== 213
  || tryinfatuatingObliviousCandidates[0]?.effect !== "EFFECT_ATTRACT"
  || tryinfatuatingObliviousCandidates[0]?.entryScript !== "BattleScript_EffectAttract"
  || tryinfatuatingObliviousCandidates[0]?.executionInventory !== "level50-executable") {
  throw new Error("Attract/Oblivious family accounting is not the finite 1/1/0/0 executable contract");
}
function tailEndsAtMoveEnd(tail: AnyRecord | undefined): boolean {
  const statements = tail?.statements as AnyRecord[] | undefined;
  const last = statements?.at(-1);
  return Boolean(last && last.mnemonic === "goto" && JSON.stringify(last.operands) === JSON.stringify(["BattleScript_MoveEnd"]));
}
for (const witness of tryinfatuatingObliviousRouteWitnesses) {
  const family = witness.familyEvidence as AnyRecord | undefined;
  const entryPath = family?.entryPath as AnyRecord | undefined;
  const graphRoute = entryPath?.graph?.route as AnyRecord[] | undefined;
  const programRoute = entryPath?.program?.route as AnyRecord[] | undefined;
  const routeMnemonics = graphRoute?.map((statement) => statement.mnemonic);
  const runtime = family?.runtimeGuardSignature as AnyRecord | undefined;
  if (witness.status !== "source-proven"
    || witness.move !== "MOVE_ATTRACT"
    || family?.category !== TRYINFATUATING_OBLIVIOUS_CATEGORY
    || family.selector?.guard !== "moveTable.effect === EFFECT_ATTRACT"
    || family.selector?.symbol !== "MOVE_ATTRACT"
    || family.selector?.effect !== "EFFECT_ATTRACT"
    || entryPath?.declaredEntryScript !== "BattleScript_EffectAttract"
    || !Array.isArray(graphRoute) || !Array.isArray(programRoute)
    || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
    || JSON.stringify(routeMnemonics) !== JSON.stringify(TRYINFATUATING_ATTRACT_ROUTE)
    || entryPath?.graph?.attackCanceler?.mnemonic !== "attackcanceler"
    || entryPath?.graph?.accuracyCheck?.mnemonic !== "accuracycheck"
    || entryPath?.graph?.tryInfatuating?.mnemonic !== "tryinfatuating"
    || JSON.stringify(entryPath?.graph?.tryInfatuating?.operands) !== JSON.stringify(["BattleScript_ButItFailed"])
    || !tailEndsAtMoveEnd(entryPath?.graph?.entry)
    || !tailEndsAtMoveEnd(entryPath?.graph?.ordinaryFailureTail)
    || !tailEndsAtMoveEnd(entryPath?.graph?.obliviousTail)
    || !tailEndsAtMoveEnd(entryPath?.program?.entry)
    || !tailEndsAtMoveEnd(entryPath?.program?.ordinaryFailureTail)
    || !tailEndsAtMoveEnd(entryPath?.program?.obliviousTail)
    || entryPath?.tails?.success !== "BattleScript_MoveEnd"
    || entryPath?.tails?.ordinaryFailure !== "BattleScript_ButItFailed -> BattleScript_MoveEnd"
    || entryPath?.tails?.oblivious !== "BattleScript_ObliviousPreventsAttraction -> BattleScript_MoveEnd"
    || (routeMnemonics ?? []).includes("datahpupdate")
    || runtime?.ability?.value !== 12
    || JSON.stringify(runtime?.orderedGuards) !== JSON.stringify(TRYINFATUATING_OBLIVIOUS_GUARDS)
    || runtime?.oblivious?.destination !== "BattleScript_ObliviousPreventsAttraction"
    || runtime?.oblivious?.destinationKind !== "hardcoded-not-operand-pointer"
    || runtime?.oblivious?.lastUsedAbility !== 12
    || runtime?.ordinaryFailure?.operandDestination !== "BattleScript_ButItFailed"
    || runtime?.success?.advanceBytes !== 5
    || !String(runtime?.success?.write ?? "").includes("STATUS2_INFATUATED_WITH")
    || !String(runtime?.scopeBoundary ?? "").includes("no datahpupdate")
    || family.dispatcher?.locator !== "Cmd_tryinfatuating"
    || family.familyVerification?.implementation !== "src/engine/battleScriptTryinfatuatingOpcode.ts#createBattleScriptTryinfatuatingOpcodeHandlers"
    || family.familyVerification?.batchTest !== "tests/tryinfatuatingObliviousHookJoinBatch.test.ts"
    || family.familyVerification?.oracleReceipt !== "tests/gate6R10AttractObliviousReceipt.test.ts"
    || family.familyVerification?.oracleFixture !== "tools/battle-lab/gate6-r10-attract-off.json"
    || family.familyVerification?.oracleControl !== "tools/battle-lab/gate6-r10-attract-control-off.json"
    || family.familyVerification?.oracleProbe !== "tools/probe/probe-gate6-r10-off.py"
    || JSON.stringify(family.familyVerification?.oracleReceiptFiles) !== JSON.stringify(["tools/probe/receipts/gate6-r10-attract-oblivious-off.json"])) {
    throw new Error("Attract/Oblivious family route, explicit tails, or ordered guard certificate is incomplete");
  }
}

const tryexplosionDampAudit = parameterization.coverage?.hookCatalogs?.ability?.tryexplosionDamp as AnyRecord | undefined;
const tryexplosionDampCandidates = tryexplosionDampAudit?.sourceMoveCandidates as AnyRecord[] | undefined;
const tryexplosionDampSourceProvenRows = tryexplosionDampAudit?.sourceProvenRows as string[] | undefined;
const tryexplosionDampExceptions = tryexplosionDampAudit?.sourceExceptionRows as AnyRecord[] | undefined;
const tryexplosionDampBlockers = tryexplosionDampAudit?.blockers as AnyRecord[] | undefined;
const tryexplosionDampRouteWitnesses = tryexplosionDampAudit?.routeWitnesses as AnyRecord[] | undefined;
if (!tryexplosionDampAudit
  || tryexplosionDampAudit.status !== SOURCE_PROVEN_FAMILY_STATUS
  || tryexplosionDampAudit.selector !== "moveTable.effect === EFFECT_EXPLOSION"
  || tryexplosionDampAudit.candidateCount !== 2
  || tryexplosionDampAudit.selectableSetOccurrences !== 25
  || tryexplosionDampAudit.fullLevel50CarrierRows !== 26
  || !Array.isArray(tryexplosionDampCandidates) || tryexplosionDampCandidates.length !== 2
  || !Array.isArray(tryexplosionDampSourceProvenRows) || JSON.stringify(tryexplosionDampSourceProvenRows) !== JSON.stringify(["MOVE_SELF_DESTRUCT", "MOVE_EXPLOSION"])
  || !Array.isArray(tryexplosionDampExceptions) || tryexplosionDampExceptions.length !== 0
  || !Array.isArray(tryexplosionDampBlockers) || tryexplosionDampBlockers.length !== 0
  || !Array.isArray(tryexplosionDampRouteWitnesses) || tryexplosionDampRouteWitnesses.length !== 2
  || tryexplosionDampCandidates.some((candidate) => candidate.executionInventory !== "level50-executable" || candidate.entryScript !== "BattleScript_EffectExplosion")) {
  throw new Error("Explosion/Damp family accounting is not the finite 2/2/0/0 executable 25/26 contract");
}
for (const witness of tryexplosionDampRouteWitnesses) {
  const family = witness.familyEvidence as AnyRecord;
  if (witness.status !== "source-proven"
    || family.category !== TRYEXPLOSION_DAMP_CATEGORY
    || family.selector?.guard !== "moveTable.effect === EFFECT_EXPLOSION"
    || JSON.stringify(family.entryPath?.graph?.prelude) !== JSON.stringify(family.entryPath?.program?.prelude)
    || JSON.stringify(family.entryPath?.graph?.prelude?.map((row: AnyRecord) => row.mnemonic)) !== JSON.stringify(["attackcanceler", "attackstring", "ppreduce", "tryexplosion"])
    || family.entryPath?.graph?.dampTail?.statements?.[1]?.operands?.[0] !== "STRINGID_PKMNPREVENTSUSAGE"
    || family.runtimeGuardSignature?.ability?.value !== 6
    || family.runtimeGuardSignature?.damp?.destination !== "BattleScript_DampStopsExplosion"
    || family.familyVerification?.oracleReceipt !== "tests/gate6DampExplosionReceipt.test.ts") {
    throw new Error(`Explosion/Damp family route/guard certificate is incomplete for ${String(witness.move)}`);
  }
}

function assertOnDamageCheckpoint(manifest: AnyRecord): void {
  const checkpoint = manifest.sections?.onDamageMoveEnd as AnyRecord | undefined;
  const summary = manifest.summary?.onDamageMoveEnd as AnyRecord | undefined;
  if (!checkpoint || !summary || checkpoint.status !== "family-level-color-change-and-contact-promotion") {
    throw new Error("Gate-6 manifest lacks the Color Change/contact family promotion checkpoint");
  }
  if (checkpoint.promotedRows !== onDamageColorChangeSourceProvenRows.length
    || checkpoint.contactPromotedRows !== onDamageContactSourceProvenRows.length
    || !String(checkpoint.notes ?? "").includes("94 contact rows are promoted")
    || !String(checkpoint.notes ?? "").includes("182 Color Change rows are promoted")) {
    throw new Error("Gate-6 ON_DAMAGE checkpoint has a false family promotion claim");
  }
  const expected = {
    contactCandidates: onDamageContactCandidates.length,
    colorChangeCandidates: onDamageColorChangeCandidates.length,
    overlapCandidates: (onDamageAudit.overlap as AnyRecord).count,
    entryBlockShapes: (onDamageAudit.routeShapeCensus as AnyRecord).entries.length,
    blockers: onDamageBlockerIds.length,
    retiredBlockers: onDamageRetiredBlockerIds.length,
    contactPromotedRows: onDamageContactSourceProvenRows.length,
    contactExceptions: onDamageContactExceptionRows.length,
    contactBlockers: onDamageContactBlockers.length,
    contactRetiredBlockers: onDamageContactRetiredBlockers.length,
    colorChangePromotedRows: onDamageColorChangeSourceProvenRows.length,
    colorChangeExceptions: onDamageColorChangeExceptionRows.length,
    colorChangeBlockers: onDamageColorChangeBlockers.length,
    colorChangeRetiredBlockers: onDamageColorChangeRetiredBlockers.length,
    promotedRows: onDamageColorChangeSourceProvenRows.length,
  };
  if (JSON.stringify(summary) !== JSON.stringify(expected)) {
    throw new Error("Gate-6 ON_DAMAGE checkpoint summary drift");
  }
  if (checkpoint.contactCandidates !== expected.contactCandidates
    || checkpoint.colorChangeCandidates !== expected.colorChangeCandidates
    || checkpoint.overlapCandidates !== expected.overlapCandidates
    || checkpoint.entryBlockShapes !== expected.entryBlockShapes
    || JSON.stringify(checkpoint.blockerIds) !== JSON.stringify(onDamageBlockerIds)
    || JSON.stringify(checkpoint.retiredBlockerIds) !== JSON.stringify(onDamageRetiredBlockerIds)
    || checkpoint.contactPromotedRows !== expected.contactPromotedRows
    || checkpoint.contactExceptions !== expected.contactExceptions
    || checkpoint.contactBlockers !== expected.contactBlockers
    || checkpoint.contactRetiredBlockers !== expected.contactRetiredBlockers
    || checkpoint.colorChangePromotedRows !== expected.colorChangePromotedRows
    || checkpoint.colorChangeExceptions !== expected.colorChangeExceptions
    || checkpoint.colorChangeBlockers !== expected.colorChangeBlockers
    || checkpoint.colorChangeRetiredBlockers !== expected.colorChangeRetiredBlockers) {
    throw new Error("Gate-6 ON_DAMAGE checkpoint payload drift");
  }
}

function assertSynchronizeCheckpoint(manifest: AnyRecord): void {
  const checkpoint = manifest.sections?.synchronizeMoveEnd as AnyRecord | undefined;
  const summary = manifest.summary?.synchronizeMoveEnd as AnyRecord | undefined;
  if (!checkpoint || !summary || checkpoint.status !== SOURCE_PROVEN_FAMILY_STATUS) {
    throw new Error("Gate-6 manifest lacks the Synchronize family promotion checkpoint");
  }
  const expected = {
    candidates: synchronizeCandidates.length,
    promotedRows: synchronizeSourceProvenRows.length,
    exceptions: synchronizeExceptions.length,
    blockers: synchronizeBlockers.length,
  };
  if (JSON.stringify(summary) !== JSON.stringify(expected)) {
    throw new Error("Gate-6 Synchronize checkpoint summary drift");
  }
  if (checkpoint.candidates !== expected.candidates
    || checkpoint.promotedRows !== expected.promotedRows
    || checkpoint.exceptions !== expected.exceptions
    || checkpoint.blockers !== expected.blockers
    || JSON.stringify(checkpoint.candidateMoves) !== JSON.stringify(synchronizeCandidates.map((candidate) => candidate.move))
    || !String(checkpoint.notes ?? "").includes("30 candidates are promoted")) {
    throw new Error("Gate-6 Synchronize checkpoint payload drift");
  }
}

function assertTryinfatuatingObliviousCheckpoint(manifest: AnyRecord): void {
  const checkpoint = manifest.sections?.tryinfatuatingOblivious as AnyRecord | undefined;
  const summary = manifest.summary?.tryinfatuatingOblivious as AnyRecord | undefined;
  const expected = {
    candidates: tryinfatuatingObliviousCandidates.length,
    promotedRows: tryinfatuatingObliviousSourceProvenRows.length,
    exceptions: tryinfatuatingObliviousExceptions.length,
    blockers: tryinfatuatingObliviousBlockers.length,
    rosterOnlyCandidates: tryinfatuatingObliviousCandidates.filter((candidate) => candidate.executionInventory === "level50-roster-only").length,
  };
  if (!checkpoint || checkpoint.status !== SOURCE_PROVEN_FAMILY_STATUS || JSON.stringify(summary) !== JSON.stringify(expected)) {
    throw new Error("Gate-6 manifest lacks the Attract/Oblivious family promotion checkpoint");
  }
  if (checkpoint.candidates !== 1
    || checkpoint.promotedRows !== 1
    || checkpoint.exceptions !== 0
    || checkpoint.blockers !== 0
    || checkpoint.rosterOnlyCandidates !== 0
    || JSON.stringify(checkpoint.candidateMoves) !== JSON.stringify(["MOVE_ATTRACT"])
    || !String(checkpoint.notes ?? "").includes("Oblivious")) {
    throw new Error("Gate-6 Attract/Oblivious checkpoint payload drift");
  }
}

function assertKingsRockCheckpoint(manifest: AnyRecord): void {
  const checkpoint = manifest.sections?.kingsRockMoveEnd as AnyRecord | undefined;
  const summary = manifest.summary?.kingsRockMoveEnd as AnyRecord | undefined;
  const expected = { candidates: 106, promotedRows: 105, exceptions: 1, blockers: 0, rosterOnlyCandidates: 12 };
  if (!checkpoint || checkpoint.status !== SOURCE_PROVEN_FAMILY_STATUS || JSON.stringify(summary) !== JSON.stringify(expected)) {
    throw new Error("Gate-6 manifest lacks the King's Rock family promotion checkpoint");
  }
  if (checkpoint.candidates !== 106 || checkpoint.promotedRows !== 105 || checkpoint.exceptions !== 1
    || checkpoint.rosterOnlyCandidates !== 12 || !String(checkpoint.notes ?? "").includes("Tickle")) {
    throw new Error("Gate-6 King's Rock checkpoint payload drift");
  }
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
      || (family.category !== SOUNDPROOF_MOVES_BLOCK_CATEGORY
        && family.category !== CONTACT_CATEGORY
        && family.category !== COLOR_CHANGE_CATEGORY
        && family.category !== SYNCHRONIZE_CATEGORY
        && family.category !== TRYINFATUATING_OBLIVIOUS_CATEGORY
        && family.category !== TRYEXPLOSION_DAMP_CATEGORY
        && family.category !== KINGS_ROCK_CATEGORY
        && family.category !== SHELL_BELL_CATEGORY
        && !ABSORBING_CATEGORIES.has(family.category))
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
    if (family.category === COLOR_CHANGE_CATEGORY) {
      const graphRoute = family.entryPath.graph.route as AnyRecord[] | undefined;
      const programRoute = family.entryPath.program.route as AnyRecord[] | undefined;
      if (family.selector?.guard !== "gBattleMoves[move].power != 0"
        || !family.selector?.derivedFrom
        || !Array.isArray(graphRoute)
        || !Array.isArray(programRoute)
        || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
        || !graphRoute.some((statement) => statement.mnemonic === "datahpupdate" && JSON.stringify(statement.operands) === JSON.stringify(["BS_TARGET"]))
        || family.entryPath.dataHpUpdate?.mnemonic !== "datahpupdate"
        || family.entryPath.moveEnd?.state !== "MOVEEND_ON_DAMAGE_ABILITIES"
        || family.entryPath.moveEnd?.stateValue !== 3
        || !family.runtimeGuardSignature?.orderedAbilityGuards?.includes("TARGET_TURN_DAMAGED")
        || !family.familyVerification?.oracleReceipt) {
        throw new Error("Color Change family lacks its ordered datahpupdate/MOVEEND/guard witness");
      }
    }
    if (family.category === CONTACT_CATEGORY) {
      const graphRoute = family.entryPath.graph.route as AnyRecord[] | undefined;
      const programRoute = family.entryPath.program.route as AnyRecord[] | undefined;
      if (family.selector?.guard !== "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)"
        || !family.selector?.derivedFrom
        || !Array.isArray(graphRoute)
        || !Array.isArray(programRoute)
        || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
        || !graphRoute.some((statement) => statement.mnemonic === "datahpupdate" && JSON.stringify(statement.operands) === JSON.stringify(["BS_TARGET"]))
        || family.entryPath.dataHpUpdate?.mnemonic !== "datahpupdate"
        || family.entryPath.moveEnd?.state !== "MOVEEND_ON_DAMAGE_ABILITIES"
        || family.entryPath.moveEnd?.stateValue !== 3
        || !family.runtimeGuardSignature?.orderedAbilityGuards?.includes("TARGET_TURN_DAMAGED")
        || !family.runtimeGuardSignature?.orderedAbilityGuards?.includes("(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)")
        || !family.runtimeGuardSignature?.dataHpUpdate?.writes?.length
        || family.familyVerification?.oracleReceipt !== "tests/onDamageContactOracleEvidence.test.ts#shared ON_DAMAGE contact dispatcher arm") {
        throw new Error("contact family lacks its ordered datahpupdate/MOVEEND/guard witness");
      }
    }
    if (family.category === SYNCHRONIZE_CATEGORY) {
      const graphRoute = family.entryPath.graph.route as AnyRecord[] | undefined;
      const programRoute = family.entryPath.program.route as AnyRecord[] | undefined;
      if (!family.selector?.entryScript
        || !Array.isArray(family.selector?.selectedEffects)
        || !Array.isArray(graphRoute)
        || !Array.isArray(programRoute)
        || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
        || !graphRoute.some((statement) => statement.mnemonic === family.entryPath.setter?.mnemonic)
        || !graphRoute.some((statement) => statement.mnemonic === family.entryPath.dispatch?.mnemonic)
        || !graphRoute.some((statement) => statement.mnemonic === family.entryPath.moveEnd?.mnemonic)
        || family.dispatcher?.target?.state !== "MOVEEND_SYNCHRONIZE_TARGET"
        || family.dispatcher?.target?.stateValue !== 2
        || family.dispatcher?.attacker?.state !== "MOVEEND_SYNCHRONIZE_ATTACKER"
        || family.dispatcher?.attacker?.stateValue !== 5
        || !family.runtimeGuardSignature?.selector?.effects?.length
        || !family.runtimeGuardSignature?.chance?.guards?.length
        || !family.familyVerification?.oracleReceipt) {
        throw new Error("Synchronize family lacks its ordered selector/MOVEEND/guard witness");
      }
    }
    if (family.category === TRYINFATUATING_OBLIVIOUS_CATEGORY) {
      const graphRoute = family.entryPath.graph.route as AnyRecord[] | undefined;
      const programRoute = family.entryPath.program.route as AnyRecord[] | undefined;
      const routeMnemonics = graphRoute?.map((statement) => statement.mnemonic);
      if (family.selector?.guard !== "moveTable.effect === EFFECT_ATTRACT"
        || family.selector?.symbol !== "MOVE_ATTRACT"
        || family.selector?.effect !== "EFFECT_ATTRACT"
        || family.entryPath?.declaredEntryScript !== "BattleScript_EffectAttract"
        || !Array.isArray(graphRoute)
        || !Array.isArray(programRoute)
        || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
        || JSON.stringify(routeMnemonics) !== JSON.stringify(TRYINFATUATING_ATTRACT_ROUTE)
        || family.entryPath.graph?.tryInfatuating?.mnemonic !== "tryinfatuating"
        || !tailEndsAtMoveEnd(family.entryPath.graph?.entry)
        || !tailEndsAtMoveEnd(family.entryPath.graph?.ordinaryFailureTail)
        || !tailEndsAtMoveEnd(family.entryPath.graph?.obliviousTail)
        || family.runtimeGuardSignature?.oblivious?.lastUsedAbility !== 12
        || family.runtimeGuardSignature?.oblivious?.destination !== "BattleScript_ObliviousPreventsAttraction"
        || family.runtimeGuardSignature?.success?.advanceBytes !== 5
        || !String(family.runtimeGuardSignature?.scopeBoundary ?? "").includes("no datahpupdate")
        || family.familyVerification?.oracleReceipt !== "tests/gate6R10AttractObliviousReceipt.test.ts") {
        throw new Error("Attract/Oblivious family lacks its exact selector/route/tail/guard witness");
      }
    }
    if (family.category === TRYEXPLOSION_DAMP_CATEGORY) {
      const graphPrelude = family.entryPath.graph.prelude as AnyRecord[] | undefined;
      const programPrelude = family.entryPath.program.prelude as AnyRecord[] | undefined;
      if (family.selector?.guard !== "moveTable.effect === EFFECT_EXPLOSION"
        || !Array.isArray(graphPrelude) || JSON.stringify(graphPrelude) !== JSON.stringify(programPrelude)
        || family.runtimeGuardSignature?.damp?.destination !== "BattleScript_DampStopsExplosion"
        || family.runtimeGuardSignature?.ability?.value !== 6
        || family.familyVerification?.oracleReceipt !== "tests/gate6DampExplosionReceipt.test.ts") {
        throw new Error("Explosion/Damp family lacks its exact selector/route/tail/guard witness");
      }
    }
    if (family.category === KINGS_ROCK_CATEGORY) {
      const graphRoute = family.entryPath.graph.route as AnyRecord[] | undefined;
      const programRoute = family.entryPath.program.route as AnyRecord[] | undefined;
      if (family.selector?.guard !== "gBattleMoves[gCurrentMove].flags & FLAG_KINGS_ROCK_AFFECTED"
        || !Array.isArray(graphRoute) || !Array.isArray(programRoute)
        || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
        || !graphRoute.some((statement) => statement.mnemonic === "datahpupdate" && JSON.stringify(statement.operands) === JSON.stringify(["BS_TARGET"]))
        || family.entryPath.moveEnd?.stateValue !== 12
        || family.runtimeGuardSignature?.holdEffect?.effect !== "HOLD_EFFECT_FLINCH"
        || family.familyVerification?.oracleReceipt !== "docs/kings-rock-moveend-ground-truth.md") {
        throw new Error("King's Rock family lacks its target-damage/state-12/guard witness");
      }
    }
    if (family.category === SHELL_BELL_CATEGORY) {
      const graphRoute = family.entryPath.graph.route as AnyRecord[] | undefined;
      const programRoute = family.entryPath.program.route as AnyRecord[] | undefined;
      if (family.selector?.guard !== "gBattleMoves[move].power != 0"
        || !Array.isArray(graphRoute) || !Array.isArray(programRoute)
        || JSON.stringify(graphRoute) !== JSON.stringify(programRoute)
        || !graphRoute.some((statement) => statement.mnemonic === "datahpupdate" && JSON.stringify(statement.operands) === JSON.stringify(["BS_TARGET"]))
        || family.entryPath.moveEnd?.stateValue !== 12
        || family.runtimeGuardSignature?.holdEffect?.effect !== "HOLD_EFFECT_SHELL_BELL"
        || family.familyVerification?.oracleReceipt !== "docs/shell-bell-moveend-ground-truth.md") {
        throw new Error("Shell Bell family lacks its target-damage/state-12/guard witness");
      }
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
  if (hook.status !== SOURCE_PROVEN_FAMILY_STATUS) {
    throw new Error(`level50 parameterization ${move.move}.${axis} has an unsupported non-gap hook status`);
  }
  for (const family of sourceProvenFamilies(hook)) {
    if (family.category === SOUNDPROOF_MOVES_BLOCK_CATEGORY && family.selector?.symbol !== move.move) {
      throw new Error(`${move.move} Soundproof evidence lost its source selector identity`);
    }
    if (family.category === CONTACT_CATEGORY && family.selector?.derivedFrom !== "moveend-contact-on-damage candidate selector moves.json flags includes FLAG_MAKES_CONTACT") {
      throw new Error(String(move.move) + " contact evidence lost its selector derivation");
    }
    if (family.category === COLOR_CHANGE_CATEGORY && family.selector?.derivedFrom !== "moveend-color-change candidate selector moves.json power != 0") {
      throw new Error(`${move.move} Color Change evidence lost its selector derivation`);
    }
    if (family.category === SYNCHRONIZE_CATEGORY
      && family.selector?.entryScript !== move.battleScript?.entryScript) {
      throw new Error(`${move.move} Synchronize evidence lost its source entry identity`);
    }
    if (family.category === TRYINFATUATING_OBLIVIOUS_CATEGORY
      && (axis !== "ability" || move.move !== "MOVE_ATTRACT" || family.selector?.symbol !== move.move)) {
      throw new Error(`${move.move} Attract/Oblivious evidence lost its finite selector identity`);
    }
    if (family.category === TRYEXPLOSION_DAMP_CATEGORY
      && (axis !== "ability" || family.selector?.symbol !== move.move)) {
      throw new Error(`${move.move} Explosion/Damp evidence lost its finite selector identity`);
    }
    if (family.category === KINGS_ROCK_CATEGORY
      && (axis !== "item" || family.selector?.symbol !== move.move)) {
      throw new Error(`${move.move} King's Rock evidence lost its source selector identity`);
    }
    if (family.category === SHELL_BELL_CATEGORY
      && (axis !== "item" || family.selector?.derivedFrom !== SHELL_BELL_SELECTOR_DERIVED_FROM)) {
      throw new Error(`${move.move} Shell Bell evidence lost its selector derivation`);
    }
  }
  return hook;
}

function sourceProvenHookEvidence(hook: AnyRecord): Evidence[] {
  return uniqueEvidence(sourceProvenFamilies(hook).flatMap((proof) => {
    const terminal = proof.entryPath.graph.accuracyCheck
      ?? proof.entryPath.graph.attackCanceler
      ?? proof.entryPath.dataHpUpdate
      ?? proof.entryPath.moveEnd;
    const base = [
      evidence(proof.selector.path, "source-selector", proof.selector.locator),
      evidence(proof.entryPath.source.path, "battle-script-entry-path", `${proof.entryPath.graph.entryLabel}:${proof.entryPath.source.entryLine}`),
      evidence(proof.entryPath.graph.path, "generated-battle-script-graph", `${proof.entryPath.graph.entryLabel}->${terminal?.label ?? "route"}`),
      evidence(proof.entryPath.program.path, "generated-battle-script-program", `${proof.entryPath.program.entryLabel}->${terminal?.label ?? "route"}`),
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
    if (proof.category === CONTACT_CATEGORY) {
      return [
        ...base,
        evidence("src/data/gen/moves.json", "contact-candidate-selector", "flags includes FLAG_MAKES_CONTACT"),
        evidence("reference/pokeemerald/src/battle_script_commands.c", "datahpupdate-damage-state-writer", "Cmd_datahpupdate"),
        evidence("reference/pokeemerald/include/battle.h", "target-turn-damaged-definition", "TARGET_TURN_DAMAGED"),
        evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_ON_DAMAGE_ABILITIES"),
        evidence("docs/on-damage-contact-scout.md", "contact-family-source-scout", "MOVEEND_ON_DAMAGE_ABILITIES contact gate"),
        evidence("src/engine/battleScriptMoveEndOpcode.ts", "source-shaped-family-implementation", "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)"),
        evidence("tests/battleScriptMoveEndOpcode.test.ts", "tier-1-shared-family-batch", "MOVEEND_ON_DAMAGE_ABILITIES contact family"),
        evidence("tests/onDamageContactOracleEvidence.test.ts", "battle-scene-off-family-receipt", "shared ON_DAMAGE contact dispatcher arm"),
        evidence("tools/battle-lab/mechanic-on-damage-static-off.json", "parameterized-oracle-request"),
        evidence("tools/probe/verify-on-damage-static.py", "oracle-probe"),
        evidence("tools/probe/receipts/on-damage-static-off.json", "battle-scene-off-oracle-receipt"),
      ];
    }
    if (proof.category === COLOR_CHANGE_CATEGORY) {
      return [
        ...base,
        evidence("reference/pokeemerald/src/battle_script_commands.c", "datahpupdate-damage-state-writer", "Cmd_datahpupdate"),
        evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_ON_DAMAGE_ABILITIES"),
        evidence("src/engine/battleScriptMoveEndOpcode.ts", "source-shaped-family-implementation", "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)"),
        evidence("tests/battleScriptMoveEndOpcode.test.ts", "tier-1-shared-family-batch", "MOVEEND_ON_DAMAGE_ABILITIES contact family"),
        evidence("tests/colorChangeOracleEvidence.test.ts", "battle-scene-off-family-receipt", "shared ON_DAMAGE Color Change arm"),
        evidence("tools/battle-lab/mechanic-color-change-off.json", "parameterized-oracle-request"),
        evidence("tools/probe/probe-color-change-ability-off.py", "oracle-probe"),
        evidence("tools/probe/receipts/color-change-off-seed-610839776.json", "battle-scene-off-oracle-receipt"),
        evidence("tools/probe/receipts/color-change-off-seed-324508639.json", "battle-scene-off-oracle-receipt"),
      ];
    }
    if (proof.category === SYNCHRONIZE_CATEGORY) {
      return [
        ...base,
        evidence("reference/pokeemerald/src/battle_util.c", "Synchronize-dispatcher-source", "ABILITYEFFECT_SYNCHRONIZE"),
        evidence("reference/pokeemerald/src/battle_script_commands.c", "SetMoveEffect-marker-selector", "HITMARKER_SYNCHRONIZE_EFFECT"),
        evidence("reference/pokeemerald/src/battle_script_commands.c", "seteffect-chance-primary-dispatch", "Cmd_seteffectwithchance"),
        evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_SYNCHRONIZE_TARGET"),
        evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_SYNCHRONIZE_ATTACKER"),
        evidence("src/engine/battleScriptMoveEndOpcode.ts", "source-shaped-family-implementation", "MOVEEND_SYNCHRONIZE_TARGET"),
        evidence("tests/battleScriptMoveEndOpcode.test.ts", "tier-1-shared-family-batch", "Synchronize"),
        evidence("docs/synchronize-abilities-ground-truth.md", "shared-dispatcher-oracle-receipt", "two-seed Battle Scene OFF receipts"),
        evidence("tools/battle-lab/mechanic-synchronize-thunder-wave-off.json", "parameterized-oracle-request"),
        evidence("tools/probe/probe-synchronize-off.py", "oracle-probe"),
        evidence("tools/probe/receipts/synchronize-off-seed-610839776.json", "battle-scene-off-oracle-receipt"),
        evidence("tools/probe/receipts/synchronize-off-seed-324508639.json", "battle-scene-off-oracle-receipt"),
      ];
    }
    if (proof.category === TRYINFATUATING_OBLIVIOUS_CATEGORY) {
      return [
        ...base,
        evidence("reference/pokeemerald/include/constants/abilities.h", "ability-value", "ABILITY_OBLIVIOUS=12"),
        evidence("reference/pokeemerald/src/battle_script_commands.c", "ordered-runtime-guards", "Cmd_tryinfatuating"),
        evidence("reference/pokeemerald/data/battle_scripts_1.s", "attract-entry-and-explicit-moveend-tails", "BattleScript_EffectAttract"),
        evidence("src/engine/battleScriptTryinfatuatingOpcode.ts", "existing-source-shaped-family-implementation", "createBattleScriptTryinfatuatingOpcodeHandlers"),
        evidence("tests/battleScriptTryinfatuatingOpcode.test.ts", "tier-1-runtime-arm", "Cmd_tryinfatuating"),
        evidence("tests/tryinfatuatingObliviousHookJoinBatch.test.ts", "tier-1-one-row-family-batch"),
        evidence("tests/gate6R10AttractObliviousReceipt.test.ts", "battle-scene-off-family-receipt"),
        evidence("tools/battle-lab/gate6-r10-attract-off.json", "parameterized-oracle-request"),
        evidence("tools/battle-lab/gate6-r10-attract-control-off.json", "paired-control-oracle-request"),
        evidence("tools/probe/probe-gate6-r10-off.py", "oracle-probe"),
        evidence("tools/probe/receipts/gate6-r10-attract-oblivious-off.json", "battle-scene-off-oracle-receipt"),
      ];
    }
    if (proof.category === TRYEXPLOSION_DAMP_CATEGORY) {
      return [
        ...base,
        evidence("reference/pokeemerald/include/constants/abilities.h", "ability-value", "ABILITY_DAMP=6"),
        evidence("reference/pokeemerald/src/battle_script_commands.c", "ordered-runtime-guards", "Cmd_tryexplosion"),
        evidence("reference/pokeemerald/data/battle_scripts_1.s", "explosion-entry-and-fixed-failure-tail", "BattleScript_DampStopsExplosion"),
        evidence("src/engine/battleScriptExplosionOpcode.ts", "existing-source-shaped-family-implementation", "createBattleScriptExplosionOpcodeHandlers"),
        evidence("tests/battleScriptExplosionOpcode.test.ts", "tier-1-runtime-arms", "Damp"),
        evidence("tests/tryexplosionDampHookJoinBatch.test.ts", "tier-1-two-row-family-batch"),
        evidence("tests/gate6DampExplosionReceipt.test.ts", "battle-scene-off-three-arm-family-receipt"),
        evidence("tools/probe/probe-gate6-damp-explosion-off.py", "oracle-probe"),
        evidence("tools/probe/receipts/gate6-damp-explosion-off.json", "battle-scene-off-oracle-receipt"),
      ];
    }
    if (proof.category === KINGS_ROCK_CATEGORY) {
      return [
        ...base,
        evidence("reference/pokeemerald/src/battle_util.c", "ordered-item-guards", "ITEMEFFECT_KINGSROCK_SHELLBELL/HOLD_EFFECT_FLINCH"),
        evidence("reference/pokeemerald/src/battle_script_commands.c", "datahpupdate-and-moveend-dispatcher", "MOVEEND_KINGSROCK_SHELLBELL"),
        evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_KINGSROCK_SHELLBELL=12"),
        evidence("src/engine/battleScriptMoveEndOpcode.ts", "existing-source-shaped-family-implementation", "MOVEEND_KINGSROCK_SHELLBELL"),
        evidence("tests/battleScriptMoveEndOpcode.test.ts", "tier-1-runtime-arm", "King's Rock"),
        evidence("tests/kingsRockHookJoinBatch.test.ts", "tier-1-105-row-sibling-batch"),
        evidence("tests/kingsRockOracleEvidence.test.ts", "battle-scene-off-family-receipt"),
        evidence("docs/kings-rock-moveend-ground-truth.md", "family-ground-truth"),
        evidence("tools/battle-lab/mechanic-kings-rock-flinch-off.json", "parameterized-oracle-request"),
        evidence("tools/probe/probe-kings-rock-flinch-off.py", "oracle-probe"),
        evidence("tools/probe/receipts/kings-rock-flinch-off.json", "battle-scene-off-oracle-receipt"),
      ];
    }
    if (proof.category === SHELL_BELL_CATEGORY) {
      return [
        ...base,
        evidence("reference/pokeemerald/src/battle_util.c", "ordered-item-guards", "ITEMEFFECT_KINGSROCK_SHELLBELL/HOLD_EFFECT_SHELL_BELL"),
        evidence("reference/pokeemerald/src/battle_script_commands.c", "datahpupdate-and-moveend-dispatcher", "MOVEEND_KINGSROCK_SHELLBELL"),
        evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_KINGSROCK_SHELLBELL=12"),
        evidence("src/engine/battleScriptMoveEndOpcode.ts", "existing-source-shaped-family-implementation", "MOVEEND_KINGSROCK_SHELLBELL"),
        evidence("tests/shellBellHookJoinBatch.test.ts", "tier-1-182-row-sibling-batch"),
        evidence("tests/shellBellOracleEvidence.test.ts", "battle-scene-off-family-receipt"),
        evidence("docs/shell-bell-moveend-ground-truth.md", "family-ground-truth"),
        evidence("tools/battle-lab/mechanic-shell-bell-heal-off.json", "parameterized-oracle-request"),
        evidence("tools/battle-lab/mechanic-shell-bell-control-off.json", "paired-control-oracle-request"),
        evidence("tools/probe/probe-shell-bell-heal-off.py", "oracle-probe"),
        evidence("tools/probe/receipts/shell-bell-heal-off.json", "battle-scene-off-oracle-receipt"),
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
        ? `Source-proven only for ${hook.supportedCategories.join(", ")}; unrelated ${axis} families are not promoted.`
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
  .filter((name) => /^gate6-r\d+b?-.*\.json$/i.test(name))
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
  if (name === "ABILITY_COLOR_CHANGE") {
    return {
      directReceiptIds: [],
      statusOverride: "shared-dispatcher-sibling-tier1-verified",
      evidence: [
        evidence(PARAMETERIZATION_PATH, "source-proven-family-promotion", "coverage.hookCatalogs.ability.onDamage.colorChange"),
        evidence("tests/battleScriptMoveEndOpcode.test.ts", "tier-1-shared-dispatcher-family", "MOVEEND_ON_DAMAGE_ABILITIES contact family"),
        evidence("tests/colorChangeOracleEvidence.test.ts", "battle-scene-off-family-receipt", "shared ON_DAMAGE Color Change arm"),
        evidence("tools/probe/receipts/color-change-off-seed-610839776.json", "battle-scene-off-oracle-receipt"),
        evidence("tools/probe/receipts/color-change-off-seed-324508639.json", "battle-scene-off-oracle-receipt"),
      ],
      notes: "The two-seed Battle Scene OFF Color Change receipt is reused as one shared family receipt; 182 Level-50 move siblings carry source/program route certificates, while Future Sight remains an explicit delayed-MOVEEND exception.",
    };
  }
  if (name === "ABILITY_STATIC") {
    return {
      directReceiptIds: [],
      statusOverride: "shared-dispatcher-sibling-tier1-verified",
      evidence: [
        evidence(PARAMETERIZATION_PATH, "source-proven-family-promotion", "coverage.hookCatalogs.ability.onDamage.contact"),
        evidence("docs/on-damage-contact-scout.md", "contact-family-source-scout", "Live Static representative"),
        evidence("tests/battleScriptMoveEndOpcode.test.ts", "tier-1-shared-dispatcher-family", "MOVEEND_ON_DAMAGE_ABILITIES contact family"),
        evidence("tests/onDamageContactOracleEvidence.test.ts", "battle-scene-off-family-receipt", "shared ON_DAMAGE contact dispatcher arm"),
        evidence("tools/battle-lab/mechanic-on-damage-static-off.json", "parameterized-oracle-request"),
        evidence("tools/probe/verify-on-damage-static.py", "oracle-probe"),
        evidence("tools/probe/receipts/on-damage-static-off.json", "battle-scene-off-oracle-receipt"),
      ],
      notes: "The fresh Battle Scene OFF Static receipt is the one direct contact-family semantic witness; the other five contact ability outcomes retain explicit no-direct-receipt gaps while sharing the source/Tier-1 dispatcher batch.",
    };
  }
  if (ON_DAMAGE_ABILITY_NAMES.has(name)) {
    return {
      directReceiptIds: [],
      statusOverride: "engine-referenced-no-oracle-receipt",
      evidence: uniqueEvidence([
        evidence(PARAMETERIZATION_PATH, "on-damage-receipt-scope", `ability:${name}`),
      ]),
      notes: "No direct deterministic Battle Scene OFF receipt observes this ON_DAMAGE arm; source and Tier-1 coverage remain distinct from semantic/oracle acceptance.",
    };
  }
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
const onDamageMoveEndSummary = Object.freeze({
  contactCandidates: onDamageContactCandidates.length,
  colorChangeCandidates: onDamageColorChangeCandidates.length,
  overlapCandidates: (onDamageAudit.overlap as AnyRecord).count,
  entryBlockShapes: ((onDamageAudit.routeShapeCensus as AnyRecord).entries as AnyRecord[]).length,
  blockers: onDamageBlockerIds.length,
  retiredBlockers: onDamageRetiredBlockerIds.length,
  contactPromotedRows: onDamageContactSourceProvenRows.length,
  contactExceptions: onDamageContactExceptionRows.length,
  contactBlockers: onDamageContactBlockers.length,
  contactRetiredBlockers: onDamageContactRetiredBlockers.length,
  colorChangePromotedRows: onDamageColorChangeSourceProvenRows.length,
  colorChangeExceptions: onDamageColorChangeExceptionRows.length,
  colorChangeBlockers: onDamageColorChangeBlockers.length,
  colorChangeRetiredBlockers: onDamageColorChangeRetiredBlockers.length,
  promotedRows: onDamageColorChangeSourceProvenRows.length,
});
const onDamageMoveEndRow: Row = Object.freeze({
  id: "hook-audit:ABILITYEFFECT_ON_DAMAGE",
  label: "ABILITYEFFECT_ON_DAMAGE Level-50 family checkpoint",
  status: "family-level-color-change-and-contact-promotion",
  contactCandidates: onDamageMoveEndSummary.contactCandidates,
  colorChangeCandidates: onDamageMoveEndSummary.colorChangeCandidates,
  overlapCandidates: onDamageMoveEndSummary.overlapCandidates,
  entryBlockShapes: onDamageMoveEndSummary.entryBlockShapes,
  blockerIds: onDamageBlockerIds,
  retiredBlockerIds: onDamageRetiredBlockerIds,
  contactPromotedRows: onDamageMoveEndSummary.contactPromotedRows,
  contactExceptions: onDamageMoveEndSummary.contactExceptions,
  contactBlockers: onDamageMoveEndSummary.contactBlockers,
  contactRetiredBlockers: onDamageMoveEndSummary.contactRetiredBlockers,
  colorChangePromotedRows: onDamageMoveEndSummary.colorChangePromotedRows,
  colorChangeExceptions: onDamageMoveEndSummary.colorChangeExceptions,
  colorChangeBlockers: onDamageMoveEndSummary.colorChangeBlockers,
  colorChangeRetiredBlockers: onDamageMoveEndSummary.colorChangeRetiredBlockers,
  promotedRows: onDamageMoveEndSummary.promotedRows,
  evidence: uniqueEvidence([
    evidence(PARAMETERIZATION_PATH, "finite-candidate-guard-route-shape-audit", "coverage.hookCatalogs.ability.onDamage"),
    evidence("reference/pokeemerald/src/battle_util.c", "on-damage-source-guards", "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)"),
    evidence("reference/pokeemerald/include/battle.h", "target-turn-damaged-definition", "TARGET_TURN_DAMAGED"),
    evidence("reference/pokeemerald/src/battle_script_commands.c", "moveend-dispatcher", "MOVEEND_ON_DAMAGE_ABILITIES"),
    evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_ON_DAMAGE_ABILITIES"),
    evidence("reference/pokeemerald/data/battle_scripts_1.s", "moveend-target-script", "BattleScript_MoveEnd"),
    evidence("src/data/gen/battle-script-graph.json", "generated-entry-block-census"),
    evidence("src/data/gen/battle-script-program.json", "generated-entry-block-census"),
    evidence("src/engine/battleScriptMoveEndOpcode.ts", "source-shaped-family-implementation", "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)"),
    evidence("tests/battleScriptMoveEndOpcode.test.ts", "tier-1-sibling-batch", "MOVEEND_ON_DAMAGE_ABILITIES contact family"),
    evidence("tests/colorChangeOracleEvidence.test.ts", "two-seed-semantic-receipt-ratchet", "Battle Scene OFF Color Change semantic receipts"),
    evidence("tools/battle-lab/mechanic-color-change-off.json", "direct-parameterized-oracle-fixture"),
    evidence("tools/probe/probe-color-change-ability-off.py", "direct-parameterized-oracle-probe"),
    evidence("tools/probe/receipts/color-change-off-seed-610839776.json", "direct-parameterized-oracle-receipt"),
    evidence("tools/probe/receipts/color-change-off-seed-324508639.json", "direct-parameterized-oracle-receipt"),
    evidence("docs/on-damage-contact-scout.md", "contact-family-source-scout", "MOVEEND_ON_DAMAGE_ABILITIES contact gate"),
    evidence("tests/onDamageContactOracleEvidence.test.ts", "battle-scene-off-family-receipt", "shared ON_DAMAGE contact dispatcher arm"),
    evidence("tools/battle-lab/mechanic-on-damage-static-off.json", "direct-parameterized-oracle-fixture"),
    evidence("tools/probe/verify-on-damage-static.py", "direct-parameterized-oracle-probe"),
    evidence("tools/probe/receipts/on-damage-static-off.json", "direct-parameterized-oracle-receipt"),
  ]),
  notes: "94 contact rows are promoted by one shared Static receipt, selector-derived contact/TARGET_TURN_DAMAGED guards, and source/program route certificates; 182 Color Change rows are promoted by their separate family receipt and route certificate. Future Sight is the one explicit Color Change source exception because its delayed moveendfromto starts at MOVEEND_ITEM_EFFECTS_ALL. The two contact route/guard blockers and the shared direct Color Change receipt blocker are retired; distinct non-Static contact ability outcome receipts remain explicit gaps.",
});
const synchronizeMoveEndSummary = Object.freeze({
  candidates: synchronizeCandidates.length,
  promotedRows: synchronizeSourceProvenRows.length,
  exceptions: synchronizeExceptions.length,
  blockers: synchronizeBlockers.length,
});
const synchronizeMoveEndRow: Row = Object.freeze({
  id: "hook-audit:ABILITYEFFECT_SYNCHRONIZE",
  label: "Synchronize Level-50 family checkpoint",
  status: SOURCE_PROVEN_FAMILY_STATUS,
  candidates: synchronizeMoveEndSummary.candidates,
  promotedRows: synchronizeMoveEndSummary.promotedRows,
  exceptions: synchronizeMoveEndSummary.exceptions,
  blockers: synchronizeMoveEndSummary.blockers,
  candidateMoves: synchronizeCandidates.map((candidate) => candidate.move),
  evidence: uniqueEvidence([
    evidence(PARAMETERIZATION_PATH, "finite-candidate-selector-route-audit", "coverage.hookCatalogs.ability.synchronize"),
    evidence("reference/pokeemerald/src/battle_script_commands.c", "SetMoveEffect-marker-selector", "HITMARKER_SYNCHRONIZE_EFFECT"),
    evidence("reference/pokeemerald/src/battle_script_commands.c", "moveend-dispatcher", "MOVEEND_SYNCHRONIZE_TARGET"),
    evidence("reference/pokeemerald/src/battle_script_commands.c", "moveend-dispatcher", "MOVEEND_SYNCHRONIZE_ATTACKER"),
    evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_SYNCHRONIZE_TARGET"),
    evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_SYNCHRONIZE_ATTACKER"),
    evidence("reference/pokeemerald/data/battle_scripts_1.s", "synchronize-entry-routes", "BattleScript_EffectPoisonHit"),
    evidence("src/data/gen/battle-script-graph.json", "generated-ordered-route-witness"),
    evidence("src/data/gen/battle-script-program.json", "generated-ordered-route-witness"),
    evidence("src/engine/battleScriptMoveEndOpcode.ts", "source-shaped-family-implementation", "MOVEEND_SYNCHRONIZE_TARGET"),
    evidence("tests/battleScriptMoveEndOpcode.test.ts", "tier-1-shared-family-batch", "Synchronize"),
    evidence("docs/synchronize-abilities-ground-truth.md", "shared-dispatcher-oracle-receipt", "two-seed Battle Scene OFF receipts"),
    evidence("tools/battle-lab/mechanic-synchronize-thunder-wave-off.json", "direct-parameterized-oracle-fixture"),
    evidence("tools/probe/probe-synchronize-off.py", "direct-parameterized-oracle-probe"),
    evidence("tools/probe/receipts/synchronize-off-seed-610839776.json", "direct-parameterized-oracle-receipt"),
    evidence("tools/probe/receipts/synchronize-off-seed-324508639.json", "direct-parameterized-oracle-receipt"),
  ]),
  notes: "All 30 candidates are promoted by complete selector, route, and runtime-guard evidence; 30 candidates are promoted, with 0 route exceptions and 0 active blockers. The source marker bank excludes sleep, freeze, and non-status bytes; miss/no-effect, substitute, type/ability, chance, affectsUser orientation, toxic-to-poison reflection, and ordered target/attacker MOVEEND guards remain explicit.",
});

const tryinfatuatingObliviousSummary = Object.freeze({
  candidates: tryinfatuatingObliviousCandidates.length,
  promotedRows: tryinfatuatingObliviousSourceProvenRows.length,
  exceptions: tryinfatuatingObliviousExceptions.length,
  blockers: tryinfatuatingObliviousBlockers.length,
  rosterOnlyCandidates: tryinfatuatingObliviousCandidates.filter((candidate) => candidate.executionInventory === "level50-roster-only").length,
});
const tryinfatuatingObliviousRow: Row = Object.freeze({
  id: "hook-family:tryinfatuating-oblivious",
  label: "Attract / Oblivious Level-50 family checkpoint",
  status: SOURCE_PROVEN_FAMILY_STATUS,
  ...tryinfatuatingObliviousSummary,
  candidateMoves: tryinfatuatingObliviousCandidates.map((candidate) => candidate.move),
  evidence: uniqueEvidence([
    evidence(PARAMETERIZATION_PATH, "finite-candidate-route-guard-audit", "coverage.hookCatalogs.ability.tryinfatuatingOblivious"),
    evidence("reference/pokeemerald/data/battle_scripts_1.s", "attract-entry-and-explicit-moveend-tails", "BattleScript_EffectAttract"),
    evidence("reference/pokeemerald/src/battle_script_commands.c", "ordered-runtime-guards", "Cmd_tryinfatuating"),
    evidence("reference/pokeemerald/include/constants/abilities.h", "ability-value", "ABILITY_OBLIVIOUS=12"),
    evidence("src/data/gen/battle-script-graph.json", "generated-ordered-route-witness", "BattleScript_EffectAttract"),
    evidence("src/data/gen/battle-script-program.json", "generated-ordered-route-witness", "BattleScript_EffectAttract"),
    evidence("src/engine/battleScriptTryinfatuatingOpcode.ts", "existing-source-shaped-family-implementation", "createBattleScriptTryinfatuatingOpcodeHandlers"),
    evidence("tests/battleScriptTryinfatuatingOpcode.test.ts", "tier-1-runtime-arm", "Cmd_tryinfatuating"),
    evidence("tests/tryinfatuatingObliviousHookJoinBatch.test.ts", "one-row-graph-program-batch"),
    evidence("tests/gate6R10AttractObliviousReceipt.test.ts", "battle-scene-off-family-receipt"),
    evidence("tools/battle-lab/gate6-r10-attract-off.json", "direct-parameterized-oracle-fixture"),
    evidence("tools/battle-lab/gate6-r10-attract-control-off.json", "paired-control-oracle-fixture"),
    evidence("tools/probe/probe-gate6-r10-off.py", "direct-parameterized-oracle-probe"),
    evidence("tools/probe/receipts/gate6-r10-attract-oblivious-off.json", "direct-parameterized-oracle-receipt"),
  ]),
  notes: "MOVE_ATTRACT is the sole Level-50 EFFECT_ATTRACT selector and is promoted through BattleScript_EffectAttract's attackcanceler → attackstring → ppreduce → accuracycheck → tryinfatuating route. Cmd_tryinfatuating checks target Oblivious first (ability reveal 12), otherwise routes gender/already-infatuated guards to ButItFailed or writes STATUS2_INFATUATED_WITH(attacker) and advances five bytes. Success, ordinary failure, and Oblivious tails explicitly finish at MoveEnd. This zero-damage family does not claim datahpupdate, MOVEEND state 12, King's Rock, Shell Bell, charge, or faint behavior.",
});

const tryexplosionDampSummary = Object.freeze({
  candidates: tryexplosionDampCandidates.length,
  promotedRows: tryexplosionDampSourceProvenRows.length,
  exceptions: tryexplosionDampExceptions.length,
  blockers: tryexplosionDampBlockers.length,
  rosterOnlyCandidates: tryexplosionDampCandidates.filter((candidate) => candidate.executionInventory === "level50-roster-only").length,
  selectableSetOccurrences: tryexplosionDampAudit.selectableSetOccurrences,
  fullLevel50CarrierRows: tryexplosionDampAudit.fullLevel50CarrierRows,
});
const tryexplosionDampRow: Row = Object.freeze({
  id: "hook-family:tryexplosion-damp",
  label: "Explosion / Damp Level-50 family checkpoint",
  status: SOURCE_PROVEN_FAMILY_STATUS,
  ...tryexplosionDampSummary,
  candidateMoves: tryexplosionDampCandidates.map((candidate) => candidate.move),
  evidence: uniqueEvidence([
    evidence(PARAMETERIZATION_PATH, "finite-candidate-route-guard-audit", "coverage.hookCatalogs.ability.tryexplosionDamp"),
    evidence("reference/pokeemerald/data/battle_scripts_1.s", "explosion-entry-and-fixed-failure-tail", "BattleScript_DampStopsExplosion"),
    evidence("reference/pokeemerald/src/battle_script_commands.c", "ordered-first-holder-runtime-guards", "Cmd_tryexplosion"),
    evidence("tests/tryexplosionDampHookJoinBatch.test.ts", "two-row-graph-program-batch"),
    evidence("tests/gate6DampExplosionReceipt.test.ts", "twice-fresh-battle-scene-off-family-receipt"),
    evidence("tools/probe/receipts/gate6-damp-explosion-off.json", "compact-deterministic-receipt"),
  ]),
  notes: "SELFDESTRUCT and EXPLOSION are the two executable EFFECT_EXPLOSION selectors: 25 selectable occurrences (1 + 24), 26 full 850-row carriers, with Pineco set 57 the sole nonselectable extra. Both are promoted through PP spending and Cmd_tryexplosion's first-Damp-holder scan to the fixed failure script. The Damp arm leaves HP and action RNG unchanged and does not claim datahpupdate, MOVEEND_NEXT_TARGET, Shell Bell, damage, or faint processing.",
});

const kingsRockMoveEndSummary = Object.freeze({
  candidates: kingsRockCandidates.length,
  promotedRows: kingsRockSourceProvenRows.length,
  exceptions: kingsRockExceptions.length,
  blockers: kingsRockBlockers.length,
  rosterOnlyCandidates: kingsRockCandidates.filter((candidate) => candidate.executionInventory === "level50-roster-only").length,
});
const kingsRockMoveEndRow: Row = Object.freeze({
  id: "hook-family:moveend-kings-rock",
  label: "King's Rock Level-50 family checkpoint",
  status: SOURCE_PROVEN_FAMILY_STATUS,
  ...kingsRockMoveEndSummary,
  evidence: uniqueEvidence([
    evidence(PARAMETERIZATION_PATH, "finite-candidate-route-guard-audit", "coverage.hookCatalogs.item.kingsRock"),
    evidence("reference/pokeemerald/src/battle_util.c", "ordered-runtime-guards", "ITEMEFFECT_KINGSROCK_SHELLBELL/HOLD_EFFECT_FLINCH"),
    evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_KINGSROCK_SHELLBELL=12"),
    evidence("tests/kingsRockHookJoinBatch.test.ts", "105-row-graph-program-batch"),
    evidence("tests/kingsRockOracleEvidence.test.ts", "battle-scene-off-family-receipt"),
    evidence("docs/kings-rock-moveend-ground-truth.md", "family-ground-truth"),
    evidence("tools/battle-lab/mechanic-kings-rock-flinch-off.json", "direct-parameterized-oracle-fixture"),
    evidence("tools/probe/probe-kings-rock-flinch-off.py", "direct-parameterized-oracle-probe"),
    evidence("tools/probe/receipts/kings-rock-flinch-off.json", "direct-parameterized-oracle-receipt"),
  ]),
  notes: "All 105 damaging candidates are promoted through successful target datahpupdate to MOVEEND_KINGSROCK_SHELLBELL state 12. All 12 roster-only selectors remain enumerated; Tickle is the sole explicit zero-damage exception, and Shell Bell is not claimed.",
});

const shellBellMoveEndSummary = Object.freeze({
  candidates: shellBellCandidates.length,
  promotedRows: shellBellSourceProvenRows.length,
  exceptions: shellBellExceptions.length,
  blockers: shellBellBlockers.length,
});
const shellBellMoveEndRow: Row = Object.freeze({
  id: "hook-family:moveend-shell-bell",
  label: "Shell Bell Level-50 family checkpoint",
  status: SOURCE_PROVEN_FAMILY_STATUS,
  ...shellBellMoveEndSummary,
  evidence: uniqueEvidence([
    evidence(PARAMETERIZATION_PATH, "finite-candidate-route-guard-audit", "coverage.hookCatalogs.item.shellBell"),
    evidence("reference/pokeemerald/src/battle_util.c", "ordered-runtime-guards", "ITEMEFFECT_KINGSROCK_SHELLBELL/HOLD_EFFECT_SHELL_BELL"),
    evidence("reference/pokeemerald/include/constants/battle_script_commands.h", "moveend-state-constant", "MOVEEND_KINGSROCK_SHELLBELL=12"),
    evidence("tests/shellBellHookJoinBatch.test.ts", "182-row-graph-program-batch"),
    evidence("tests/shellBellOracleEvidence.test.ts", "battle-scene-off-family-receipt"),
    evidence("docs/shell-bell-moveend-ground-truth.md", "family-ground-truth"),
    evidence("tools/battle-lab/mechanic-shell-bell-heal-off.json", "direct-parameterized-oracle-fixture"),
    evidence("tools/battle-lab/mechanic-shell-bell-control-off.json", "paired-control-oracle-fixture"),
    evidence("tools/probe/probe-shell-bell-heal-off.py", "direct-parameterized-oracle-probe"),
    evidence("tools/probe/receipts/shell-bell-heal-off.json", "direct-parameterized-oracle-receipt"),
  ]),
  notes: "All 182 power != 0 candidates retarget the already-proven moveend-color-change graph/program route to MOVEEND_KINGSROCK_SHELLBELL state 12 (same unbroken Cmd_moveend do-while sweep). MOVE_FUTURE_SIGHT is the sole exception via its own battle_util.c:1816 IGNORE_SHELL_BELL poison, distinct from Color Change's state-3 moveendfromto skip reason for the same move. King's Rock's 105 promoted rows are a full subset of these 182; King's Rock's HOLD_EFFECT_FLINCH arm is not claimed.",
});

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
  "reference/pokeemerald/include/battle.h",
  "reference/pokeemerald/include/constants/abilities.h",
  "reference/pokeemerald/include/constants/battle_script_commands.h",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "src/engine/battleScriptAbilityMovesBlock.ts",
  "tests/battleScriptAbilityMovesBlock.test.ts",
  "tests/soundproofOracleEvidence.test.ts",
  "tests/fixtures/soundproof-off-evidence.json",
  "src/engine/battleScriptHitChainOpcode.ts",
  "tests/battleScriptHitChainOpcode.test.ts",
  "tests/damageCalc.test.ts",
  "src/engine/battleScriptMoveEndOpcode.ts",
  "tests/battleScriptMoveEndOpcode.test.ts",
  "src/engine/battleScriptTryinfatuatingOpcode.ts",
  "tests/battleScriptTryinfatuatingOpcode.test.ts",
  "tests/tryinfatuatingObliviousHookJoinBatch.test.ts",
  "tests/gate6R10AttractObliviousReceipt.test.ts",
  "tools/battle-lab/gate6-r10-attract-off.json",
  "tools/battle-lab/gate6-r10-attract-control-off.json",
  "tools/probe/probe-gate6-r10-off.py",
  "tools/probe/receipts/gate6-r10-attract-oblivious-off.json",
  "src/engine/battleScriptExplosionOpcode.ts",
  "tests/battleScriptExplosionOpcode.test.ts",
  "tests/tryexplosionDampHookJoinBatch.test.ts",
  "tests/gate6DampExplosionReceipt.test.ts",
  "tools/battle-lab/gate6-damp-explosion-control-off.json",
  "tools/battle-lab/gate6-damp-explosion-target-off.json",
  "tools/battle-lab/gate6-damp-explosion-attacker-off.json",
  "tools/probe/probe-gate6-damp-explosion-off.py",
  "tools/probe/receipts/gate6-damp-explosion-off.json",
  "tests/colorChangeOracleEvidence.test.ts",
  "tests/level50MoveParameterization.test.ts",
  "tests/gate6CoverageManifest.test.ts",
  "tools/battle-lab/gate6-r8-paralysis-off.json",
  "docs/absorbing-abilities-ground-truth.md",
  "tools/battle-lab/mechanic-absorbing-volt-absorb-off.json",
  "tools/probe/probe-absorbing-ability-off.py",
  "tools/probe/receipts/absorbing-volt-absorb-off-seed-610839776.json",
  "tools/probe/receipts/absorbing-volt-absorb-off-seed-324508639.json",
  "tools/battle-lab/mechanic-color-change-off.json",
  "tools/probe/probe-color-change-ability-off.py",
  "tools/probe/receipts/color-change-off-seed-610839776.json",
  "tools/probe/receipts/color-change-off-seed-324508639.json",
  "docs/on-damage-contact-scout.md",
  "tests/onDamageContactOracleEvidence.test.ts",
  "tools/battle-lab/mechanic-on-damage-static-off.json",
  "tools/probe/verify-on-damage-static.py",
  "tools/probe/receipts/on-damage-static-off.json",
  "docs/synchronize-abilities-ground-truth.md",
  "tools/battle-lab/mechanic-synchronize-thunder-wave-off.json",
  "tools/probe/probe-synchronize-off.py",
  "tools/probe/receipts/synchronize-off-seed-610839776.json",
  "tools/probe/receipts/synchronize-off-seed-324508639.json",
  "docs/kings-rock-moveend-ground-truth.md",
  "tests/kingsRockHookJoinBatch.test.ts",
  "tests/kingsRockOracleEvidence.test.ts",
  "tools/battle-lab/mechanic-kings-rock-flinch-off.json",
  "tools/probe/probe-kings-rock-flinch-off.py",
  "tools/probe/receipts/kings-rock-flinch-off.json",
  "docs/shell-bell-moveend-ground-truth.md",
  "tests/shellBellHookJoinBatch.test.ts",
  "tests/shellBellOracleEvidence.test.ts",
  "tools/battle-lab/mechanic-shell-bell-heal-off.json",
  "tools/battle-lab/mechanic-shell-bell-control-off.json",
  "tools/probe/probe-shell-bell-heal-off.py",
  "tools/probe/receipts/shell-bell-heal-off.json",
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
    onDamageMoveEnd: onDamageMoveEndSummary,
    synchronizeMoveEnd: synchronizeMoveEndSummary,
    tryinfatuatingOblivious: tryinfatuatingObliviousSummary,
    tryexplosionDamp: tryexplosionDampSummary,
    kingsRockMoveEnd: kingsRockMoveEndSummary,
    shellBellMoveEnd: shellBellMoveEndSummary,
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
    onDamageMoveEnd: onDamageMoveEndRow,
    synchronizeMoveEnd: synchronizeMoveEndRow,
    tryinfatuatingOblivious: tryinfatuatingObliviousRow,
    tryexplosionDamp: tryexplosionDampRow,
    kingsRockMoveEnd: kingsRockMoveEndRow,
    shellBellMoveEnd: shellBellMoveEndRow,
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
  `- Per-move hook joins: **${manifest.summary.perMoveHookJoins.item.gaps} item join gaps** and **${manifest.summary.perMoveHookJoins.ability.gaps} ability join gaps** across ${manifest.summary.perMoveHookJoins.item.rows} Level-50 roster moves; ${manifest.summary.perMoveHookJoins.ability.rows - manifest.summary.perMoveHookJoins.ability.gaps} ability rows are source-proven for the nine Soundproof selectors, audited shared-absorbing routes, both ON_DAMAGE families, the 30-candidate Synchronize family, Attract's one-row Oblivious family, and the two Explosion/Damp categories, while every remaining gap retains its source-artifact locator and reason.`,
  `- ON_DAMAGE checkpoint: **${manifest.summary.onDamageMoveEnd.contactCandidates}** contact candidates and **${manifest.summary.onDamageMoveEnd.colorChangeCandidates}** Color Change candidates (${manifest.summary.onDamageMoveEnd.overlapCandidates} overlap) are source-enumerated across ${manifest.summary.onDamageMoveEnd.entryBlockShapes} entry-block shapes. **${manifest.summary.onDamageMoveEnd.contactPromotedRows}** contact rows and **${manifest.summary.onDamageMoveEnd.colorChangePromotedRows}** Color Change rows are promoted; **${manifest.summary.onDamageMoveEnd.contactExceptions}** contact exceptions and **${manifest.summary.onDamageMoveEnd.contactBlockers}** active contact blockers remain, while **${manifest.summary.onDamageMoveEnd.contactRetiredBlockers}** contact route/guard blockers and **${manifest.summary.onDamageMoveEnd.colorChangeRetiredBlockers}** Color Change blockers are retired.`,
  `- Synchronize checkpoint: **${manifest.summary.synchronizeMoveEnd.candidates}** finite Level-50 candidates, **${manifest.summary.synchronizeMoveEnd.promotedRows}** promoted, **${manifest.summary.synchronizeMoveEnd.exceptions}** route exceptions, and **${manifest.summary.synchronizeMoveEnd.blockers}** active blockers.`,
  `- Attract/Oblivious checkpoint: **${manifest.summary.tryinfatuatingOblivious.candidates}** finite EFFECT_ATTRACT candidate, **${manifest.summary.tryinfatuatingOblivious.promotedRows}** promoted, **${manifest.summary.tryinfatuatingOblivious.exceptions}** exceptions, **${manifest.summary.tryinfatuatingOblivious.rosterOnlyCandidates}** roster-only candidates, and **${manifest.summary.tryinfatuatingOblivious.blockers}** active blockers.`,
  `- Explosion/Damp checkpoint: **${manifest.summary.tryexplosionDamp.candidates}** finite EFFECT_EXPLOSION candidates, **${manifest.summary.tryexplosionDamp.promotedRows}** promoted, **${manifest.summary.tryexplosionDamp.exceptions}** exceptions, **${manifest.summary.tryexplosionDamp.rosterOnlyCandidates}** roster-only candidates, **${manifest.summary.tryexplosionDamp.selectableSetOccurrences}** selectable occurrences / **${manifest.summary.tryexplosionDamp.fullLevel50CarrierRows}** full carrier rows, and **${manifest.summary.tryexplosionDamp.blockers}** active blockers.`,
  `- King's Rock checkpoint: **${manifest.summary.kingsRockMoveEnd.candidates}** finite Level-50 flag selectors, **${manifest.summary.kingsRockMoveEnd.promotedRows}** promoted, **${manifest.summary.kingsRockMoveEnd.exceptions}** explicit exception, **${manifest.summary.kingsRockMoveEnd.rosterOnlyCandidates}** roster-only candidates retained, and no Shell Bell overclaim.`,
  `- Shell Bell checkpoint: **${manifest.summary.shellBellMoveEnd.candidates}** finite Level-50 power != 0 candidates (reused moveend-color-change population), **${manifest.summary.shellBellMoveEnd.promotedRows}** promoted by retargeting the already-proven route to state 12, **${manifest.summary.shellBellMoveEnd.exceptions}** explicit exception (Future Sight), and no King's Rock HOLD_EFFECT_FLINCH overclaim.`,
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
  "- `source-proven-family` per-move hook joins name exact supported categories and carry one family witness per category. Soundproof reaches Cmd_attackcanceler; Volt/Water Absorb and Flash Fire reach accuracycheck → JumpIfMoveFailed; the contact and Color Change families carry selector-specific target-datahpupdate → MOVEEND_ON_DAMAGE route certificates; Synchronize carries selector-specific SetMoveEffect → chance/primary → ordered MOVEEND_SYNCHRONIZE_TARGET/ATTACKER route certificates; Attract/Oblivious carries the exact action prelude → tryinfatuating route, ordered target-Oblivious-first guard, explicit MoveEnd tails, and no datahpupdate/state-12/item/charge/faint claim; King's Rock carries its source flag plus power guard through target datahpupdate to MOVEEND_KINGSROCK_SHELLBELL state 12, while Tickle and Shell Bell remain explicitly outside the promotion. Their shared receipts are family-level receipts plus Tier-1 sibling batches, not fabricated per-move receipts. No row claims unrelated families.",
  "- `unsupported` per-move hook joins are intentionally not inferred from the partial dispatcher catalogs. Each row repeats only move identity, effect, entry script, reason, and a locator into `level50-move-parameterization.json`; it is not a support claim.",
  "- `oracle-receipted` requires a committed deterministic request and receipt. Incidental ability presence in an unrelated scenario is not a direct ability receipt; Water Absorb and Flash Fire retain explicit shared-dispatcher sibling status, and the fresh Static receipt is the one direct ON_DAMAGE contact-family witness while the five other contact ability outcomes retain explicit receipt gaps.",
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
markdown.push("## ABILITYEFFECT_ON_DAMAGE family checkpoint\n\n");
markdown.push(...table("Contact checkpoint and Color Change family promotion", ["Status", "Contact candidates", "Color Change candidates", "Overlap", "Entry-block shapes", "Contact promoted", "Contact exceptions", "Open contact blockers", "Retired contact blockers", "Retired Color Change blockers", "Color Change promoted", "Color Change exceptions", "Evidence"], [onDamageMoveEndRow], [
  (row) => row.status,
  (row) => String(row.contactCandidates),
  (row) => String(row.colorChangeCandidates),
  (row) => String(row.overlapCandidates),
  (row) => String(row.entryBlockShapes),
  (row) => String(row.contactPromotedRows),
  (row) => String(row.contactExceptions),
  (row) => row.blockerIds.join(", ") || "—",
  (row) => String(row.contactRetiredBlockers),
  (row) => String(row.colorChangeRetiredBlockers),
  (row) => String(row.colorChangePromotedRows),
  (row) => String(row.colorChangeExceptions),
  (row) => evidenceText(row.evidence),
]));
markdown.push(`${onDamageMoveEndRow.notes}\n`);
markdown.push("## Synchronize status family checkpoint\n\n");
markdown.push(...table("Synchronize candidate and ordered MOVEEND promotion", ["Status", "Candidates", "Promoted", "Exceptions", "Blockers", "Evidence"], [synchronizeMoveEndRow], [
  (row) => row.status,
  (row) => String(row.candidates),
  (row) => String(row.promotedRows),
  (row) => String(row.exceptions),
  (row) => String(row.blockers),
  (row) => evidenceText(row.evidence),
]));
markdown.push(`${synchronizeMoveEndRow.notes}\n`);
markdown.push("## Attract / Oblivious ability family checkpoint\n\n");
markdown.push(...table("Attract candidate and Cmd_tryinfatuating promotion", ["Status", "Candidates", "Promoted", "Exceptions", "Roster-only", "Blockers", "Evidence"], [tryinfatuatingObliviousRow], [
  (row) => row.status,
  (row) => String(row.candidates),
  (row) => String(row.promotedRows),
  (row) => String(row.exceptions),
  (row) => String(row.rosterOnlyCandidates),
  (row) => String(row.blockers),
  (row) => evidenceText(row.evidence),
]));
markdown.push(`${tryinfatuatingObliviousRow.notes}\n`);
markdown.push("## Explosion / Damp ability family checkpoint\n\n");
markdown.push(...table("Explosion candidates and Cmd_tryexplosion promotion", ["Status", "Candidates", "Promoted", "Exceptions", "Roster-only", "Blockers", "Evidence"], [tryexplosionDampRow], [
  (row) => row.status,
  (row) => String(row.candidates),
  (row) => String(row.promotedRows),
  (row) => String(row.exceptions),
  (row) => String(row.rosterOnlyCandidates),
  (row) => String(row.blockers),
  (row) => evidenceText(row.evidence),
]));
markdown.push(`${tryexplosionDampRow.notes}\n`);
markdown.push("## King's Rock item family checkpoint\n\n");
markdown.push(...table("King's Rock candidate and MOVEEND state-12 promotion", ["Status", "Candidates", "Promoted", "Exceptions", "Roster-only", "Blockers", "Evidence"], [kingsRockMoveEndRow], [
  (row) => row.status,
  (row) => String(row.candidates),
  (row) => String(row.promotedRows),
  (row) => String(row.exceptions),
  (row) => String(row.rosterOnlyCandidates),
  (row) => String(row.blockers),
  (row) => evidenceText(row.evidence),
]));
markdown.push(`${kingsRockMoveEndRow.notes}\n`);
markdown.push("## Shell Bell item family checkpoint\n\n");
markdown.push(...table("Shell Bell candidate and MOVEEND state-12 promotion", ["Status", "Candidates", "Promoted", "Exceptions", "Blockers", "Evidence"], [shellBellMoveEndRow], [
  (row) => row.status,
  (row) => String(row.candidates),
  (row) => String(row.promotedRows),
  (row) => String(row.exceptions),
  (row) => String(row.blockers),
  (row) => evidenceText(row.evidence),
]));
markdown.push(`${shellBellMoveEndRow.notes}\n`);
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
