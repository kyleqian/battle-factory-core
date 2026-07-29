#!/usr/bin/env node --experimental-strip-types
/**
 * Ability/item parity census (ROADMAP S10 user scope decision 2026-07-28:
 * held-item + ability parity driven by a census worklist mirroring the move
 * census).
 *
 * Joins three mechanical facts per family member (ability / hold effect):
 *
 *   1. SOURCE HOOKS — where the pinned source implements the member
 *      (`src/data/gen/ability-item-hooks.json`: AbilityBattleEffects /
 *      ItemBattleEffects delegate cases plus inline battle-rules and AI
 *      sites, extracted literally by
 *      tools/extract/extract-ability-item-hooks.ts).
 *
 *   2. CARRIERS — which Level-50 Factory sets (indexes 0-849) can field the
 *      member: species ability slots for abilities (with the
 *      single-ability-species "deterministic carrier" split the fixture
 *      rule prefers), the 63-row Frontier held-item table for items.
 *
 *   3. ENGINE SURFACE — production `src/engine` references to the member's
 *      constant name (comments stripped; `*_ID_X`/`X_ID` alias spellings
 *      dealiased), read live from the tree so the census can never drift
 *      from what the engine actually contains.
 *
 * "Referenced" means the engine names the member somewhere — including
 * inside a named unsupported-branch barrier reason — NOT that its behavior
 * is complete or oracle-verified. The census's load-bearing claim is the
 * inverse: a member with carriers, source battle hooks, and ZERO engine
 * references is definitely unimplemented. Per-member completion is proven
 * by its own worked row (fixtures + oracle evidence), exactly as move rows
 * were. See the Caveats section of the generated doc.
 *
 * Rerun: node --experimental-strip-types tools/report/ability-item-parity-census.ts
 * Output: docs/ability-item-parity-census.md (deterministic; byte-idempotent
 * for an unchanged tree).
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { JUMPIFABILITY_SUPPORTED_ABILITY_NAMES } from "../../src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts";
import { JUMPIFABILITYPRESENT_SUPPORTED_ABILITY_NAMES } from "../../src/engine/battleScriptJumpifabilitypresentOpcode.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const HOOKS_PATH = join(REPO_ROOT, "src/data/gen/ability-item-hooks.json");
const MONS_PATH = join(REPO_ROOT, "src/data/gen/battle-frontier-mons.json");
const HELD_ITEMS_PATH = join(REPO_ROOT, "src/data/gen/battle-frontier-held-items.json");
const SPECIES_STATS_PATH = join(REPO_ROOT, "src/data/gen/species-stats.json");
const ENGINE_DIR = join(REPO_ROOT, "src/engine");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const OUTPUT_PATH = join(outDirArg ?? join(REPO_ROOT, "docs"), "ability-item-parity-census.md");
const RERUN_COMMAND = "node --experimental-strip-types tools/report/ability-item-parity-census.ts";

const LEVEL50_SET_COUNT = 850;

// ---------------------------------------------------------------------------
// Validations (every check that passes is named in the generated doc; any
// failure throws and no doc is written)
// ---------------------------------------------------------------------------

const validationChecks: string[] = [];
function check(condition: boolean, name: string): void {
  if (!condition) throw new Error(`ability-item parity census validation failed: ${name}`);
  validationChecks.push(name);
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

type TokenMention = { token: string; line: number };
type HookCase = {
  caseName: string;
  caseId: number;
  startLine: number;
  endLine: number;
  aliasLabels: { name: string; id: number; line: number }[];
  dispatchLabels: TokenMention[];
  tokenMentions: TokenMention[];
};
type InlineSite = {
  file: string;
  tag: "rules" | "ai";
  line: number;
  enclosingGuess: string | null;
  factoryBattleReachability: "candidate" | "proven-unreachable";
  factoryBattleGate?: string;
};
type HooksArtifact = {
  schema: string;
  universes: {
    abilities: { name: string; id: number }[];
    holdEffects: { name: string; id: number }[];
  };
  abilityBattleEffects: { cases: HookCase[] };
  itemBattleEffects: { cases: HookCase[] };
  inlineSites: {
    abilities: Record<string, InlineSite[]>;
    holdEffects: Record<string, InlineSite[]>;
  };
};

const hooks = JSON.parse(readFileSync(HOOKS_PATH, "utf8")) as HooksArtifact;
check(hooks.schema === "ability-item-hooks/v2", "hooks artifact schema is ability-item-hooks/v2");
check(hooks.universes.abilities.length === 78, "ability universe has 78 members");
check(hooks.universes.holdEffects.length === 67, "hold-effect universe has 67 members");
check(hooks.abilityBattleEffects.cases.length === 20, "AbilityBattleEffects has 20 caseID segments");
check(hooks.itemBattleEffects.cases.length === 5, "ItemBattleEffects has 5 caseID segments");
check(
  hooks.abilityBattleEffects.cases.flatMap((c) => c.aliasLabels).length === 3,
  "AbilityBattleEffects carries exactly 3 nested pseudo-mode aliases",
);
const provenUnreachableInlineSites = [
  ...Object.entries(hooks.inlineSites.abilities),
  ...Object.entries(hooks.inlineSites.holdEffects),
].flatMap(([token, sites]) =>
  sites
    .filter((site) => site.factoryBattleReachability === "proven-unreachable")
    .map((site) => `${site.file}:${site.line}:${token}`)
).sort();
check(
  JSON.stringify(provenUnreachableInlineSites) === JSON.stringify([
    "src/battle_script_commands.c:9676:ABILITY_PICKUP",
    "src/battle_script_commands.c:9699:ABILITY_PICKUP",
  ]),
  "Factory-unreachable inline sites are exactly Pickup's two Pyramid-gated Cmd_pickup checks",
);

type FrontierMon = {
  index: number;
  label: string;
  species: string;
  itemTableId: number;
  itemName: string;
};
const mons = (JSON.parse(readFileSync(MONS_PATH, "utf8")) as { count: number; entries: FrontierMon[] });
check(mons.count === 882 && mons.entries.length === 882, "Frontier corpus has 882 sets");

type HeldItemRow = { itemTableId: number; item: string; displayName: string; holdEffect: string; holdEffectParam: number };
const heldItems = (JSON.parse(readFileSync(HELD_ITEMS_PATH, "utf8")) as { count: number; entries: HeldItemRow[] });
check(heldItems.count === 63 && heldItems.entries.length === 63, "Frontier held-item table has 63 rows");

type SpeciesEntry = { id: number; name: string; abilities: [string, string] };
const speciesEntries = (JSON.parse(readFileSync(SPECIES_STATS_PATH, "utf8")) as { species: SpeciesEntry[] }).species;
check(speciesEntries.length === 411, "species-stats has 411 real species");

const speciesByName = new Map(speciesEntries.map((entry) => [entry.name, entry]));
const heldItemByTableId = new Map(heldItems.entries.map((row) => [row.itemTableId, row]));
const abilityUniverse = new Map(hooks.universes.abilities.map((entry) => [entry.name, entry.id]));
const holdEffectUniverse = new Map(hooks.universes.holdEffects.map((entry) => [entry.name, entry.id]));

for (const mon of mons.entries) {
  const species = speciesByName.get(mon.species);
  if (!species) throw new Error(`set ${mon.label}: species ${mon.species} missing from species-stats`);
  if (!abilityUniverse.has(species.abilities[0]) || !abilityUniverse.has(species.abilities[1])) {
    throw new Error(`species ${species.name}: ability slots outside the universe`);
  }
  if (species.abilities[0] === "ABILITY_NONE") {
    throw new Error(`species ${species.name}: slot-0 ability is ABILITY_NONE`);
  }
  if (!heldItemByTableId.has(mon.itemTableId)) {
    throw new Error(`set ${mon.label}: itemTableId ${mon.itemTableId} missing from held-item table`);
  }
}
check(true, "every set joins to a species (2 in-universe ability slots, slot 0 real) and a held-item row");
for (const row of heldItems.entries) {
  if (!holdEffectUniverse.has(row.holdEffect)) {
    throw new Error(`held-item row ${row.item}: holdEffect ${row.holdEffect} outside the universe`);
  }
}
check(true, "every held-item row's holdEffect is in the universe");

// ---------------------------------------------------------------------------
// Engine surface scan (production src/engine, comments stripped, aliases
// dealiased, unknown spellings pinned)
// ---------------------------------------------------------------------------

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectTsFiles(path, out);
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) out.push(path);
  }
  return out;
}

function stripComments(source: string): string {
  // Preserves line structure so reported line numbers stay real.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, "");
}

/**
 * True when the match position sits inside a quoted literal on its line
 * (line-local quote parity over ", ', and `). String occurrences are
 * excluded from reference counting: the engine's id<->name tables spell the
 * ENTIRE universe as strings (`ABILITY_SYMBOLS` in
 * battleScriptSwitchinOpcode.ts), which would make every ability trivially
 * "referenced". Real member logic uses numeric-id identifier constants
 * (`const ABILITY_INTIMIDATE = 22`). Quoted live-dispatch sets are re-added
 * explicitly below from their engine exports instead.
 */
function insideStringLiteral(line: string, index: number): boolean {
  let open: string | null = null;
  for (let i = 0; i < index; i += 1) {
    const ch = line[i]!;
    if (ch === "\\") {
      i += 1;
    } else if (open === null && (ch === '"' || ch === "'" || ch === "`")) {
      open = ch;
    } else if (ch === open) {
      open = null;
    }
  }
  return open !== null;
}

function containingStringLiteral(line: string, index: number): { start: number; end: number } | null {
  let open: string | null = null;
  let start = -1;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === "\\") {
      i += 1;
    } else if (open === null && (ch === '"' || ch === "'" || ch === "`")) {
      open = ch;
      start = i;
    } else if (ch === open) {
      if (start < index && index < i) return { start, end: i };
      open = null;
      start = -1;
    }
  }
  return null;
}

function hasAdjacentLiveBranchShape(line: string, literal: { start: number; end: number }): boolean {
  const before = line.slice(0, literal.start);
  const after = line.slice(literal.end + 1);
  const branchShape = /(?:===|!==|==|!=|\.has\(|\.includes\()\s*$/;
  const reverseBranchShape = /^\s*(?:===|!==|==|!=|\.has\(|\.includes\()/;
  if (branchShape.test(before) || reverseBranchShape.test(after)) return true;

  // A ternary arm only counts when its condition starts on this same line.
  if (/(^|[^?])\?\s*$/.test(before)) {
    const question = before.lastIndexOf("?");
    if (before.slice(0, question).trim().length > 0) return true;
  }
  if (/:\s*$/.test(before)) {
    const colon = before.lastIndexOf(":");
    const question = before.lastIndexOf("?", colon);
    if (question >= 0 && before.slice(0, question).trim().length > 0) return true;
  }
  return false;
}

/** Engine-local constant spellings that are infrastructure, not members. */
const ENGINE_INFRA_SPELLINGS = new Set([
  "ABILITY_ID_BY_SYMBOL",
  "ABILITY_ID_IN_WEATHER_RANGE",
  "ABILITY_NAME_BY_ID",
  "ABILITY_ON_FIELD",
  "ABILITY_SYMBOLS",
  "ABILITY_X",
  "B_MSG_ABILITY_PREVENTS_ABILITY_STATUS",
  "B_MSG_ABILITY_PREVENTS_MOVE_STATUS",
  "GENERATED_ITEM_HOLD_EFFECT_PARAMS",
  "HITMARKER_STATUS_ABILITY_EFFECT",
  "HOLD_EFFECT_NAME_BY_ID",
  "HOLD_EFFECT_ROW_BY_ITEM",
  "HOLD_EFFECT_TO_TYPE",
  "HOLD_EFFECT_TYPE",
  "JUMPIFABILITYPRESENT_SUPPORTED_ABILITY_NAMES",
  "JUMPIFABILITY_SUPPORTED_ABILITY_NAMES",
  "STAT_UP_BERRY_HOLD_EFFECT_PARAM",
]);

/**
 * A token is a family token only if its `ABILITY_`/`HOLD_EFFECT_` marker sits
 * at the token start or right after an underscore — otherwise the marker is
 * an accidental substring (AI_CHECK_VI+ABILITY_TABLE_EFFECTS) and the token
 * is skipped silently.
 */
function hasFamilyMarker(token: string, prefix: string): boolean {
  let index = token.indexOf(prefix);
  while (index >= 0) {
    if (index === 0 || token[index - 1] === "_") return true;
    index = token.indexOf(prefix, index + 1);
  }
  return false;
}

function dealias(token: string, prefix: string, universe: ReadonlyMap<string, number>): string | null {
  if (universe.has(token)) return token;
  const prefixAlias = token.replace(`${prefix}ID_`, prefix);
  if (prefixAlias !== token && universe.has(prefixAlias)) return prefixAlias;
  const suffixAlias = token.endsWith("_ID") ? token.slice(0, -3) : token;
  if (suffixAlias !== token && universe.has(suffixAlias)) return suffixAlias;
  // Engine-prefixed member constants: BATTLE_SCRIPT_HOLD_EFFECT_CHOICE_BAND,
  // ROLE_PLAY_ABILITY_WONDER_GUARD, ... -> the member the suffix names.
  const markerIndex = token.indexOf(`_${prefix}`);
  if (markerIndex > 0) {
    const suffixMember = token.slice(markerIndex + 1);
    if (universe.has(suffixMember)) return suffixMember;
  }
  return null;
}

type EngineRef = { file: string; line: number };
type DroppedStringHit = {
  token: string;
  family: "ability" | "hold-effect";
  file: string;
  line: number;
  sourceLine: string;
  literal: { start: number; end: number };
};
const engineAbilityRefs = new Map<string, EngineRef[]>();
const engineHoldEffectRefs = new Map<string, EngineRef[]>();
const unknownEngineSpellings = new Set<string>();
const droppedStringHits: DroppedStringHit[] = [];

for (const filePath of collectTsFiles(ENGINE_DIR).sort()) {
  const relPath = relative(REPO_ROOT, filePath);
  const lines = stripComments(readFileSync(filePath, "utf8")).split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    for (const [pattern, prefix, universe, sink] of [
      [/\b([A-Z][A-Z_0-9]*ABILITY_[A-Z_0-9]+|ABILITY_[A-Z_0-9]+)\b/g, "ABILITY_", abilityUniverse, engineAbilityRefs],
      [/\b([A-Z][A-Z_0-9]*HOLD_EFFECT_[A-Z_0-9]+|HOLD_EFFECT_[A-Z_0-9]+)\b/g, "HOLD_EFFECT_", holdEffectUniverse, engineHoldEffectRefs],
    ] as const) {
      for (const match of lines[i]!.matchAll(pattern)) {
        const token = match[1]!;
        if (!hasFamilyMarker(token, prefix)) continue;
        if (ENGINE_INFRA_SPELLINGS.has(token)) continue;
        if (insideStringLiteral(lines[i]!, match.index!)) {
          const literal = containingStringLiteral(lines[i]!, match.index!);
          if (literal === null) throw new Error(`could not bound quoted token ${token} at ${relPath}:${i + 1}`);
          droppedStringHits.push({
            token,
            family: prefix === "ABILITY_" ? "ability" : "hold-effect",
            file: relPath,
            line: i + 1,
            sourceLine: lines[i]!,
            literal,
          });
          continue;
        }
        const member = dealias(token, prefix, universe);
        if (member === null) {
          unknownEngineSpellings.add(token);
          continue;
        }
        const refs = sink.get(member) ?? [];
        refs.push({ file: relPath, line: i + 1 });
        sink.set(member, refs);
      }
    }
  }
}

// Recover only quoted members that participate directly in a same-line live
// comparison/branch. The blanket exclusion above remains the first pass so
// exhaustive symbol/name tables cannot make the census vacuous.
const literalCountsByLine = new Map<string, Set<string>>();
for (const hit of droppedStringHits) {
  const key = `${hit.file}:${hit.line}`;
  const literals = literalCountsByLine.get(key) ?? new Set<string>();
  literals.add(`${hit.literal.start}:${hit.literal.end}`);
  literalCountsByLine.set(key, literals);
}
const recoveredStringSites: string[] = [];
for (const hit of droppedStringHits) {
  const lineKey = `${hit.file}:${hit.line}`;
  if (literalCountsByLine.get(lineKey)!.size > 1) continue;
  if (!hasAdjacentLiveBranchShape(hit.sourceLine, hit.literal)) continue;
  const prefix = hit.family === "ability" ? "ABILITY_" : "HOLD_EFFECT_";
  const universe = hit.family === "ability" ? abilityUniverse : holdEffectUniverse;
  const sink = hit.family === "ability" ? engineAbilityRefs : engineHoldEffectRefs;
  const member = dealias(hit.token, prefix, universe);
  if (member === null) {
    unknownEngineSpellings.add(hit.token);
    continue;
  }
  const refs = sink.get(member) ?? [];
  refs.push({ file: hit.file, line: hit.line });
  sink.set(member, refs);
  recoveredStringSites.push(`${hit.file}:${hit.line} ${member}`);
}
const EXPECTED_RECOVERED_STRING_SITES = [
  "src/engine/battleScriptActionAdmission.ts:2764 ABILITY_GUTS",
  "src/engine/battleScriptHealpartystatusOpcode.ts:75 ABILITY_SOUNDPROOF",
  "src/engine/battleScriptHitChainOpcode.ts:1096 HOLD_EFFECT_EVASION_UP",
  "src/engine/battleScriptTrysetfutureattackOpcode.ts:111 ABILITY_GUTS",
  "src/engine/damageCalc.ts:496 HOLD_EFFECT_SCOPE_LENS",
  "src/engine/damageCalc.ts:497 HOLD_EFFECT_LUCKY_PUNCH",
  "src/engine/damageCalc.ts:498 HOLD_EFFECT_STICK",
  "src/engine/damageCalc.ts:647 ABILITY_COMPOUND_EYES",
  "src/engine/damageCalc.ts:648 ABILITY_SAND_VEIL",
  "src/engine/damageCalc.ts:649 ABILITY_HUSTLE",
  "src/engine/damageCalc.ts:652 HOLD_EFFECT_EVASION_UP",
  "src/engine/factoryAiCheckBadMove.ts:376 ABILITY_NONE",
  "src/engine/factoryAiCheckBadMove.ts:425 ABILITY_NONE",
  "src/engine/factoryAiCheckBadMove.ts:903 ABILITY_SOUNDPROOF",
  "src/engine/factoryAiCheckViability.ts:2579 ABILITY_SWIFT_SWIM",
  "src/engine/factoryAiCheckViability.ts:2636 ABILITY_SWIFT_SWIM",
  "src/engine/factoryAiCheckViability.ts:2661 ABILITY_RAIN_DISH",
  "src/engine/factoryAiTryToFaint.ts:132 ABILITY_LEVITATE",
  "src/engine/factoryAiTryToFaint.ts:160 ABILITY_LEVITATE",
  "src/engine/factorySwapPresentation.ts:116 ABILITY_NONE",
].sort();
check(
  JSON.stringify(recoveredStringSites.sort()) === JSON.stringify(EXPECTED_RECOVERED_STRING_SITES),
  "quoted live comparison/branch recovery sites match the pinned exact set",
);

// Quoted live-dispatch sets the string-literal exclusion above would hide,
// re-added from the engine's own exports (the move census reads these same
// exports as its authoritative jumpifability acceptance surface).
const LIVE_NAME_SETS: ReadonlyArray<{ names: ReadonlySet<string>; label: string }> = [
  {
    names: JUMPIFABILITY_SUPPORTED_ABILITY_NAMES,
    label: "src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts (JUMPIFABILITY live set)",
  },
  {
    names: JUMPIFABILITYPRESENT_SUPPORTED_ABILITY_NAMES,
    label: "src/engine/battleScriptJumpifabilitypresentOpcode.ts (JUMPIFABILITYPRESENT live set)",
  },
];
for (const { names, label } of LIVE_NAME_SETS) {
  for (const name of names) {
    if (name === "ABILITY_NONE") continue;
    if (!abilityUniverse.has(name)) {
      throw new Error(`engine live-dispatch set ${label} names ${name}, which is outside the ability universe`);
    }
    const refs = engineAbilityRefs.get(name) ?? [];
    refs.push({ file: label, line: 0 });
    engineAbilityRefs.set(name, refs);
  }
}
check(true, "engine jumpifability live-dispatch sets resolve entirely inside the ability universe");
if (unknownEngineSpellings.size > 0) {
  throw new Error(
    "engine constant spellings neither in the universes, dealiasable, nor in ENGINE_INFRA_SPELLINGS: "
      + [...unknownEngineSpellings].sort().join(", ")
      + " — classify each deliberately (new infra spelling or a real naming drift)",
  );
}
check(true, "every engine ABILITY_/HOLD_EFFECT_ spelling resolves to a member, an alias, or pinned infra");

// ---------------------------------------------------------------------------
// Per-member models
// ---------------------------------------------------------------------------

type MemberStatus = "unreferenced" | "engine-referenced" | "zero-carrier" | "no-battle-hooks";

type AbilityMember = {
  name: string;
  id: number;
  delegateCases: string[];
  inlineRulesSites: number;
  inlineAiSites: number;
  l50Carriers: number;
  l50DeterministicCarriers: number;
  allCarriers: number;
  carrierSpecies: string[];
  engineRefs: EngineRef[];
  status: MemberStatus;
};

type HoldEffectMember = {
  name: string;
  id: number;
  delegateCases: string[];
  inlineRulesSites: number;
  inlineAiSites: number;
  frontierItems: string[];
  l50Carriers: number;
  allCarriers: number;
  engineRefs: EngineRef[];
  status: MemberStatus;
};

function delegateCasesFor(cases: readonly HookCase[], member: string): string[] {
  return cases
    .filter((hookCase) =>
      hookCase.dispatchLabels.some((label) => label.token === member)
      || hookCase.tokenMentions.some((mention) => mention.token === member))
    .map((hookCase) => hookCase.caseName);
}

function classify(hasBattleHooks: boolean, l50Carriers: number, engineRefs: number): MemberStatus {
  if (!hasBattleHooks) return "no-battle-hooks";
  if (l50Carriers === 0) return "zero-carrier";
  return engineRefs > 0 ? "engine-referenced" : "unreferenced";
}

const abilityMembers: AbilityMember[] = [];
for (const { name, id } of hooks.universes.abilities) {
  if (name === "ABILITY_NONE") continue;
  const inline = hooks.inlineSites.abilities[name] ?? [];
  const delegateCases = delegateCasesFor(hooks.abilityBattleEffects.cases, name);
  const reachableInline = inline.filter((site) => site.factoryBattleReachability !== "proven-unreachable");
  const inlineRules = reachableInline.filter((site) => site.tag === "rules");
  const inlineAi = reachableInline.filter((site) => site.tag === "ai");
  const carrierSets = mons.entries.filter((mon) => {
    const species = speciesByName.get(mon.species)!;
    return species.abilities[0] === name || species.abilities[1] === name;
  });
  const l50Sets = carrierSets.filter((mon) => mon.index < LEVEL50_SET_COUNT);
  // Deterministic: the species cannot roll the other slot to a different
  // ability (slot 1 empty, or both slots name the same ability — a real
  // source shape: Flygon/Granbull-class species duplicate one ability).
  const deterministic = l50Sets.filter((mon) => {
    const slots = speciesByName.get(mon.species)!.abilities;
    return slots[1] === "ABILITY_NONE" || slots[1] === slots[0];
  });
  const engineRefs = engineAbilityRefs.get(name) ?? [];
  abilityMembers.push({
    name,
    id,
    delegateCases,
    inlineRulesSites: inlineRules.length,
    inlineAiSites: inlineAi.length,
    l50Carriers: l50Sets.length,
    l50DeterministicCarriers: deterministic.length,
    allCarriers: carrierSets.length,
    carrierSpecies: [...new Set(l50Sets.map((mon) => mon.species))].sort(),
    engineRefs,
    status: classify(delegateCases.length > 0 || inlineRules.length > 0, l50Sets.length, engineRefs.length),
  });
}

const holdEffectMembers: HoldEffectMember[] = [];
for (const { name, id } of hooks.universes.holdEffects) {
  if (name === "HOLD_EFFECT_NONE") continue;
  const inline = hooks.inlineSites.holdEffects[name] ?? [];
  const delegateCases = delegateCasesFor(hooks.itemBattleEffects.cases, name);
  const reachableInline = inline.filter((site) => site.factoryBattleReachability !== "proven-unreachable");
  const inlineRules = reachableInline.filter((site) => site.tag === "rules");
  const inlineAi = reachableInline.filter((site) => site.tag === "ai");
  const rows = heldItems.entries.filter((row) => row.holdEffect === name);
  const tableIds = new Set(rows.map((row) => row.itemTableId));
  const carrierSets = mons.entries.filter((mon) => tableIds.has(mon.itemTableId));
  const l50Sets = carrierSets.filter((mon) => mon.index < LEVEL50_SET_COUNT);
  const engineRefs = engineHoldEffectRefs.get(name) ?? [];
  holdEffectMembers.push({
    name,
    id,
    delegateCases,
    inlineRulesSites: inlineRules.length,
    inlineAiSites: inlineAi.length,
    frontierItems: rows.map((row) => row.item),
    l50Carriers: l50Sets.length,
    allCarriers: carrierSets.length,
    engineRefs,
    status: classify(delegateCases.length > 0 || inlineRules.length > 0, l50Sets.length, engineRefs.length),
  });
}

// Cross-checks the corpus arithmetic: every L50 set carries exactly one item
// row (possibly HOLD_EFFECT_NONE) and 1-2 abilities.
const l50ItemCarrierSum = holdEffectMembers.reduce((sum, member) => sum + member.l50Carriers, 0);
const l50NoneItemCarriers = mons.entries.filter(
  (mon) => mon.index < LEVEL50_SET_COUNT && heldItemByTableId.get(mon.itemTableId)!.holdEffect === "HOLD_EFFECT_NONE",
).length;
check(
  l50ItemCarrierSum + l50NoneItemCarriers === LEVEL50_SET_COUNT,
  "hold-effect L50 carrier counts partition the 850 sets (with HOLD_EFFECT_NONE's share)",
);
const dualAbilityL50 = mons.entries.filter((mon) => {
  if (mon.index >= LEVEL50_SET_COUNT) return false;
  const slots = speciesByName.get(mon.species)!.abilities;
  return slots[1] !== "ABILITY_NONE" && slots[1] !== slots[0];
}).length;
const singleAbilityL50 = LEVEL50_SET_COUNT - dualAbilityL50;
const l50AbilityCarrierSum = abilityMembers.reduce((sum, member) => sum + member.l50Carriers, 0);
check(
  l50AbilityCarrierSum === singleAbilityL50 + 2 * dualAbilityL50,
  "ability L50 carrier counts sum to single-ability sets + 2x distinct-dual-ability sets",
);

// ---------------------------------------------------------------------------
// Headline metrics
// ---------------------------------------------------------------------------

type Family<T extends AbilityMember | HoldEffectMember> = {
  label: string;
  members: T[];
};

function headlineFor(members: readonly (AbilityMember | HoldEffectMember)[]) {
  const inScope = members.filter((member) => member.status === "engine-referenced" || member.status === "unreferenced");
  const referenced = inScope.filter((member) => member.status === "engine-referenced");
  const weightedTotal = inScope.reduce((sum, member) => sum + member.l50Carriers, 0);
  const weightedReferenced = referenced.reduce((sum, member) => sum + member.l50Carriers, 0);
  return {
    inScope: inScope.length,
    referenced: referenced.length,
    weightedTotal,
    weightedReferenced,
    zeroCarrier: members.filter((member) => member.status === "zero-carrier").length,
    noBattleHooks: members.filter((member) => member.status === "no-battle-hooks").length,
  };
}

const abilityHeadline = headlineFor(abilityMembers);
const holdEffectHeadline = headlineFor(holdEffectMembers);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const lines: string[] = [];
lines.push("# Ability/item parity census");
lines.push("");
lines.push(`Generated by \`${RERUN_COMMAND}\` — regenerate after any engine, extractor, or corpus change.`);
lines.push("");
lines.push(
  "Mirrors the executable-frontier move census for the last two enumerable battle-variable "
    + "families (ROADMAP S10 scope decision 2026-07-28). \"Referenced\" means the production engine "
    + "names the member (including inside a named barrier reason) — it does NOT claim semantic "
    + "completeness. The load-bearing inverse claim: an **unreferenced** member with Level-50 carriers "
    + "and source battle hooks is definitely unimplemented. See Caveats.",
);
lines.push("");
lines.push("## Headline");
lines.push("");
lines.push(
  `- **Abilities: ${abilityHeadline.referenced}/${abilityHeadline.inScope} members engine-referenced** `
    + `(weighted by L50 set-carriers: ${abilityHeadline.weightedReferenced}/${abilityHeadline.weightedTotal}); `
    + `${abilityHeadline.zeroCarrier} zero-carrier, ${abilityHeadline.noBattleHooks} without Factory battle hooks `
    + "(out-of-battle or source-proven Factory-gated only).",
);
lines.push(
  `- **Hold effects: ${holdEffectHeadline.referenced}/${holdEffectHeadline.inScope} members engine-referenced** `
    + `(weighted by L50 set-carriers: ${holdEffectHeadline.weightedReferenced}/${holdEffectHeadline.weightedTotal}); `
    + `${holdEffectHeadline.zeroCarrier} zero-carrier, ${holdEffectHeadline.noBattleHooks} without Factory battle hooks.`,
);
lines.push(`- All ${validationChecks.length} ground-truth validation checks passed.`);
lines.push("");

function statusRank(status: MemberStatus): number {
  switch (status) {
    case "unreferenced": return 0;
    case "engine-referenced": return 1;
    case "zero-carrier": return 2;
    case "no-battle-hooks": return 3;
  }
}

function sortMembers<T extends AbilityMember | HoldEffectMember>(members: T[]): T[] {
  return [...members].sort(
    (a, b) => statusRank(a.status) - statusRank(b.status) || b.l50Carriers - a.l50Carriers || a.id - b.id,
  );
}

lines.push("## Ability worklist (ranked: unreferenced first, then by L50 carriers)");
lines.push("");
lines.push("| Ability | Status | L50 carriers (det.) | All | Delegate cases | Inline rules | AI | Engine refs |");
lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
for (const member of sortMembers(abilityMembers)) {
  lines.push(
    `| ${member.name} | ${member.status} | ${member.l50Carriers} (${member.l50DeterministicCarriers}) `
      + `| ${member.allCarriers} | ${member.delegateCases.map((c) => c.replace("ABILITYEFFECT_", "")).join(", ") || "—"} `
      + `| ${member.inlineRulesSites} | ${member.inlineAiSites} | ${member.engineRefs.length} |`,
  );
}
lines.push("");

lines.push("## Hold-effect worklist (ranked: unreferenced first, then by L50 carriers)");
lines.push("");
lines.push("| Hold effect | Status | L50 carriers | All | Frontier items | Delegate cases | Inline rules | AI | Engine refs |");
lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const member of sortMembers(holdEffectMembers)) {
  lines.push(
    `| ${member.name} | ${member.status} | ${member.l50Carriers} | ${member.allCarriers} `
      + `| ${member.frontierItems.map((item) => item.replace("ITEM_", "")).join(", ") || "—"} `
      + `| ${member.delegateCases.map((c) => c.replace("ITEMEFFECT_", "")).join(", ") || "—"} `
      + `| ${member.inlineRulesSites} | ${member.inlineAiSites} | ${member.engineRefs.length} |`,
  );
}
lines.push("");

lines.push("## Delegate-mode summary");
lines.push("");
lines.push("| Mode | Members | Engine-referenced |");
lines.push("| --- | --- | --- |");
const abilityByName = new Map(abilityMembers.map((member) => [member.name, member]));
for (const hookCase of hooks.abilityBattleEffects.cases) {
  const members = [...new Set([
    ...hookCase.dispatchLabels.map((label) => label.token),
    ...hookCase.tokenMentions.map((mention) => mention.token),
  ])].filter((name) => name !== "ABILITY_NONE").sort();
  if (members.length === 0) continue;
  const referenced = members.filter((name) => (abilityByName.get(name)?.engineRefs.length ?? 0) > 0);
  lines.push(
    `| ${hookCase.caseName} | ${members.map((name) => name.replace("ABILITY_", "")).join(", ")} `
      + `| ${referenced.length}/${members.length} |`,
  );
}
const holdEffectByName = new Map(holdEffectMembers.map((member) => [member.name, member]));
for (const hookCase of hooks.itemBattleEffects.cases) {
  const members = [...new Set([
    ...hookCase.dispatchLabels.map((label) => label.token),
    ...hookCase.tokenMentions.map((mention) => mention.token),
  ])].filter((name) => name !== "HOLD_EFFECT_NONE").sort();
  if (members.length === 0) continue;
  const referenced = members.filter((name) => (holdEffectByName.get(name)?.engineRefs.length ?? 0) > 0);
  lines.push(
    `| ${hookCase.caseName} | ${members.map((name) => name.replace("HOLD_EFFECT_", "")).join(", ")} `
      + `| ${referenced.length}/${members.length} |`,
  );
}
lines.push("");

lines.push("## Validation checks");
lines.push("");
for (const name of validationChecks) lines.push(`- ${name}`);
lines.push("");

lines.push("## Caveats (read before trusting a number here)");
lines.push("");
lines.push(
  "- **Reference presence, not semantic verification.** A member counts as engine-referenced if any "
    + "production `src/engine` module names its constant as a code identifier (aliases dealiased, "
    + "comments stripped, string literals excluded except for the pinned narrow same-line comparison/"
    + "branch recovery pass — the engine's complete id<->name tables "
    + "would otherwise make every ability trivially \"referenced\"), or if it appears in an exported "
    + "quoted live-dispatch set (jumpifability/jumpifabilitypresent — the same exports the move census "
    + "trusts). Rows become *done* the way move rows did: a bounded brief with staged fixtures and "
    + "oracle evidence, not by this census's count moving.",
);
lines.push(
  "- **One-sided error direction.** The engine can implement a member through generated data, a "
    + "differently-prefixed constant (`BATTLE_SCRIPT_ABILITY_*`, `ROLE_PLAY_ABILITY_*`), or a "
    + "quoted-string surface outside the narrow recovery shape — all undercounts (a member can look missing while "
    + "partially present, never the reverse beyond \"some surface exists\"). The worklist's "
    + "zero-reference rows are reliable; treat reference counts as leads, not verdicts.",
);
lines.push(
  "- **Ability carriers count both slots.** A dual-ability species' set carries either slot depending "
    + "on rental personality; the deterministic column counts single-ability species only (the fixture "
    + "rule prefers those carriers for briefs). Carrier arithmetic is validated against the 850-set "
    + "partition above.",
);
lines.push(
  "- **AI sites are informational for rules parity.** `battle_ai_script_commands.c` /"
    + "`battle_ai_switch_items.c` sites mark where the native AI reads a member (in scope per the "
    + "2026-07-28 user decision, later milestone OK); they do not gate rules-parity rows.",
);
lines.push(
  "- **Out-of-battle and Factory-gated hooks are out of census scope.** `no-battle-hooks` members "
    + "may still matter for non-battle features. Exact-pinned `proven-unreachable` inline sites are "
    + "also excluded: Pickup's two `Cmd_pickup` checks are reached from the Frontier victory script "
    + "only when `BATTLE_TYPE_PYRAMID` is set (`battle_scripts_1.s:3045-3047`), which Battle Factory "
    + "does not set. This census tracks only the Level-50 Factory singles battle surface.",
);
lines.push("");

writeFileSync(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");

console.log(
  `Ability/item parity census written to ${relative(REPO_ROOT, OUTPUT_PATH)}\n`
    + `Abilities: ${abilityHeadline.referenced}/${abilityHeadline.inScope} referenced `
    + `(weighted ${abilityHeadline.weightedReferenced}/${abilityHeadline.weightedTotal})\n`
    + `Hold effects: ${holdEffectHeadline.referenced}/${holdEffectHeadline.inScope} referenced `
    + `(weighted ${holdEffectHeadline.weightedReferenced}/${holdEffectHeadline.weightedTotal})\n`
    + `All ${validationChecks.length} ground-truth validation checks passed.`,
);
