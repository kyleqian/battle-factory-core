// Dev-time ground-truth extractor for the ability/item parity census
// (ROADMAP S10 user scope decision 2026-07-28: held-item + ability parity
// driven by a census-generator worklist mirroring the move census).
//
// Extracts, mechanically and literally (no semantic claims):
//
//   1. `AbilityBattleEffects` (src/battle_util.c): per `case ABILITYEFFECT_X:`
//      segment, the nested `case ABILITY_Y:` dispatch labels and every other
//      ABILITY_* token mention with line numbers. The three pseudo-mode
//      aliases (SWITCH_IN_WEATHER/MUD_SPORT/WATER_SPORT, define values >=
//      253) are nested `switch (gLastUsedAbility)` cases INSIDE a real
//      caseID's body, not sibling modes: they are recorded as `aliasLabels`
//      of their enclosing segment and do not close it. A validation asserts
//      the two define bands (real caseIDs < 32, aliases >= 253) never blur.
//
//   2. `ItemBattleEffects` (src/battle_util.c): per `case ITEMEFFECT_X:`
//      segment, the nested `case HOLD_EFFECT_Y:` dispatch labels and every
//      other HOLD_EFFECT_* token mention with line numbers.
//
//   3. Inline sites: every ABILITY_*/HOLD_EFFECT_* universe token OUTSIDE
//      those two functions across the fixed battle-rules scan set (tagged
//      `rules`) and the native-AI sources (tagged `ai` — trainer AI is in
//      scope per the same user decision), each with file/line and an
//      `enclosingGuess` (nearest preceding C function header or .s label —
//      a lexical guess, exactly like the handler-lexical-facts extractor,
//      never a resolved symbol claim).
//
//   4. The full constant universes (78 abilities, 67 hold effects) with ids.
//
// The census generator (tools/report/ability-item-parity-census.ts) joins
// this artifact to the Factory corpus and the live engine surface; this
// extractor deliberately records SOURCE facts only, so the committed JSON
// changes only when the pinned reference source or this extractor changes.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-ability-item-hooks.ts
//
// Never imported at runtime - the production build only reads generated JSON.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseIntDefines } from "./defines.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const DATA_GEN = outDirArg ?? join(RUN_ROOT, "src", "data", "gen");
const OUTPUT_PATH = join(DATA_GEN, "ability-item-hooks.json");

const BATTLE_UTIL_FILE = "src/battle_util.c";
const SCAN_FILES: ReadonlyArray<{ file: string; tag: "rules" | "ai" }> = [
  { file: "src/battle_util.c", tag: "rules" },
  { file: "src/battle_util2.c", tag: "rules" },
  { file: "src/battle_script_commands.c", tag: "rules" },
  { file: "src/battle_main.c", tag: "rules" },
  { file: "src/pokemon.c", tag: "rules" },
  { file: "data/battle_scripts_1.s", tag: "rules" },
  { file: "src/battle_ai_script_commands.c", tag: "ai" },
  { file: "src/battle_ai_switch_items.c", tag: "ai" },
];

// ---------------------------------------------------------------------------
// Universes
// ---------------------------------------------------------------------------

const abilitiesH = readFileSync(join(REF, "include/constants/abilities.h"), "utf8");
const holdEffectsH = readFileSync(join(REF, "include/constants/hold_effects.h"), "utf8");
const battleUtilH = readFileSync(join(REF, "include/battle_util.h"), "utf8");

const abilityIds = parseIntDefines(abilitiesH, "ABILITY_");
const holdEffectIds = parseIntDefines(holdEffectsH, "HOLD_EFFECT_");
// battle_util.h carries trailing `//` comments on some defines
// (ITEMEFFECT_DUMMY) — strip them before the strict define parse.
const battleUtilHNoComments = battleUtilH.replace(/\/\/[^\n]*/g, "");
const abilityEffectIds = parseIntDefines(battleUtilHNoComments, "ABILITYEFFECT_");
const itemEffectIds = parseIntDefines(battleUtilHNoComments, "ITEMEFFECT_");

const abilitiesCount = abilitiesH.match(/^#define ABILITIES_COUNT\s+(\d+)\s*$/m);
if (!abilitiesCount) throw new Error("abilities.h: ABILITIES_COUNT define not found");
if (abilityIds.size !== Number(abilitiesCount[1])) {
  throw new Error(
    `abilities.h: parsed ${abilityIds.size} ABILITY_ defines but ABILITIES_COUNT is ${abilitiesCount[1]}`,
  );
}
if (holdEffectIds.size !== 67) {
  throw new Error(
    `hold_effects.h: parsed ${holdEffectIds.size} HOLD_EFFECT_ defines, expected the pinned 67 — `
      + "if the reference source moved, update this pin deliberately",
  );
}

// Real caseID modes vs nested pseudo-mode aliases: the source separates the
// bands by two orders of magnitude. Validate that before relying on it.
for (const [name, id] of abilityEffectIds) {
  if (id >= 32 && id < 253) {
    throw new Error(`battle_util.h: ${name}=${id} falls between the caseID band (<32) and the alias band (>=253)`);
  }
}
const isAliasMode = (name: string): boolean => (abilityEffectIds.get(name) ?? 0) >= 253;

// ---------------------------------------------------------------------------
// Function-span detection (brace balance from the signature line)
// ---------------------------------------------------------------------------

type Span = { startLine: number; endLine: number };

function functionSpan(lines: readonly string[], signature: string, file: string): Span {
  const startIndex = lines.findIndex((line) => line.startsWith(signature));
  if (startIndex < 0) throw new Error(`${file}: signature not found: ${signature}`);
  let depth = 0;
  let seenBrace = false;
  for (let i = startIndex; i < lines.length; i += 1) {
    for (const ch of lines[i]!) {
      if (ch === "{") {
        depth += 1;
        seenBrace = true;
      } else if (ch === "}") {
        depth -= 1;
      }
    }
    if (seenBrace && depth === 0) {
      return { startLine: startIndex + 1, endLine: i + 1 };
    }
  }
  throw new Error(`${file}: unbalanced braces after ${signature}`);
}

// ---------------------------------------------------------------------------
// Segment extraction
// ---------------------------------------------------------------------------

type TokenMention = { token: string; line: number };
type Segment = {
  caseName: string;
  caseId: number;
  startLine: number;
  endLine: number;
  aliasLabels: { name: string; id: number; line: number }[];
  dispatchLabels: TokenMention[];
  tokenMentions: TokenMention[];
};

function collectTokens(
  lines: readonly string[],
  span: Span,
  pattern: RegExp,
  universe: ReadonlyMap<string, number>,
): TokenMention[] {
  const mentions: TokenMention[] = [];
  for (let i = span.startLine - 1; i < span.endLine; i += 1) {
    for (const match of lines[i]!.matchAll(pattern)) {
      if (universe.has(match[1]!)) mentions.push({ token: match[1]!, line: i + 1 });
    }
  }
  return mentions;
}

function extractSegments(
  lines: readonly string[],
  span: Span,
  file: string,
  functionName: string,
  casePrefix: string,
  caseUniverse: ReadonlyMap<string, number>,
  memberPrefix: string,
  memberUniverse: ReadonlyMap<string, number>,
  aliasesAllowed: boolean,
): Segment[] {
  const caseLabelRe = new RegExp(`^\\s*case (${casePrefix}[A-Z_0-9]+):`);
  const memberLabelRe = new RegExp(`^\\s*case (${memberPrefix}[A-Z_0-9]+):`);
  const memberTokenRe = new RegExp(`\\b(${memberPrefix}[A-Z_0-9]+)\\b`, "g");

  type RawLabel = { name: string; line: number };
  const rawLabels: RawLabel[] = [];
  for (let i = span.startLine - 1; i < span.endLine; i += 1) {
    const match = lines[i]!.match(caseLabelRe);
    if (match) rawLabels.push({ name: match[1]!, line: i + 1 });
  }
  if (rawLabels.length === 0) throw new Error(`${file}: no ${casePrefix} case labels inside ${functionName}`);
  for (const label of rawLabels) {
    if (!caseUniverse.has(label.name)) {
      throw new Error(`${file}:${label.line}: case label ${label.name} is not a known ${casePrefix} define`);
    }
  }

  const segmentStarts = rawLabels.filter((label) => !(aliasesAllowed && isAliasMode(label.name)));
  const segments: Segment[] = [];
  for (let s = 0; s < segmentStarts.length; s += 1) {
    const start = segmentStarts[s]!;
    const end = s + 1 < segmentStarts.length ? segmentStarts[s + 1]!.line - 1 : span.endLine;
    const segmentSpan: Span = { startLine: start.line, endLine: end };
    const aliasLabels = aliasesAllowed
      ? rawLabels
          .filter((label) => isAliasMode(label.name) && label.line > start.line && label.line <= end)
          .map((label) => ({ name: label.name, id: caseUniverse.get(label.name)!, line: label.line }))
      : [];
    const dispatchLabels: TokenMention[] = [];
    for (let i = segmentSpan.startLine - 1; i < segmentSpan.endLine; i += 1) {
      const match = lines[i]!.match(memberLabelRe);
      if (match && memberUniverse.has(match[1]!)) dispatchLabels.push({ token: match[1]!, line: i + 1 });
    }
    const dispatchLines = new Set(dispatchLabels.map((label) => label.line));
    const tokenMentions = collectTokens(lines, segmentSpan, memberTokenRe, memberUniverse).filter(
      (mention) => !dispatchLines.has(mention.line),
    );
    segments.push({
      caseName: start.name,
      caseId: caseUniverse.get(start.name)!,
      startLine: start.line,
      endLine: end,
      aliasLabels,
      dispatchLabels,
      tokenMentions,
    });
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Parse battle_util.c's two delegate functions
// ---------------------------------------------------------------------------

const battleUtilSource = readFileSync(join(REF, BATTLE_UTIL_FILE), "utf8");
const battleUtilLines = battleUtilSource.split("\n");

const abilityFnSpan = functionSpan(
  battleUtilLines,
  "u8 AbilityBattleEffects(u8 caseID, u8 battler, u8 ability, u8 special, u16 moveArg)",
  BATTLE_UTIL_FILE,
);
const itemFnSpan = functionSpan(
  battleUtilLines,
  "u8 ItemBattleEffects(u8 caseID, u8 battler, bool8 moveTurn)",
  BATTLE_UTIL_FILE,
);
if (itemFnSpan.startLine <= abilityFnSpan.endLine) {
  throw new Error(`${BATTLE_UTIL_FILE}: ItemBattleEffects does not follow AbilityBattleEffects`);
}

const abilitySegments = extractSegments(
  battleUtilLines,
  abilityFnSpan,
  BATTLE_UTIL_FILE,
  "AbilityBattleEffects",
  "ABILITYEFFECT_",
  abilityEffectIds,
  "ABILITY_",
  abilityIds,
  true,
);
const itemSegments = extractSegments(
  battleUtilLines,
  itemFnSpan,
  BATTLE_UTIL_FILE,
  "ItemBattleEffects",
  "ITEMEFFECT_",
  itemEffectIds,
  "HOLD_EFFECT_",
  holdEffectIds,
  false,
);

// Exact-set pins: the segmentation is only trustworthy if it reproduces the
// known source structure. Update these deliberately if the pinned reference
// source ever changes.
const EXPECTED_ABILITY_CASES = [
  "ABILITYEFFECT_ON_SWITCHIN",
  "ABILITYEFFECT_ENDTURN",
  "ABILITYEFFECT_MOVES_BLOCK",
  "ABILITYEFFECT_ABSORBING",
  "ABILITYEFFECT_ON_DAMAGE",
  "ABILITYEFFECT_IMMUNITY",
  "ABILITYEFFECT_FORECAST",
  "ABILITYEFFECT_SYNCHRONIZE",
  "ABILITYEFFECT_ATK_SYNCHRONIZE",
  "ABILITYEFFECT_INTIMIDATE1",
  "ABILITYEFFECT_TRACE",
  "ABILITYEFFECT_INTIMIDATE2",
  "ABILITYEFFECT_CHECK_OTHER_SIDE",
  "ABILITYEFFECT_CHECK_BATTLER_SIDE",
  "ABILITYEFFECT_FIELD_SPORT",
  "ABILITYEFFECT_CHECK_ON_FIELD",
  "ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER",
  "ABILITYEFFECT_COUNT_OTHER_SIDE",
  "ABILITYEFFECT_COUNT_BATTLER_SIDE",
  "ABILITYEFFECT_COUNT_ON_FIELD",
];
const EXPECTED_ITEM_CASES = [
  "ITEMEFFECT_ON_SWITCH_IN",
  "ITEMEFFECT_NORMAL",
  "ITEMEFFECT_DUMMY",
  "ITEMEFFECT_MOVE_END",
  "ITEMEFFECT_KINGSROCK_SHELLBELL",
];
const actualAbilityCases = abilitySegments.map((segment) => segment.caseName);
if (JSON.stringify(actualAbilityCases) !== JSON.stringify(EXPECTED_ABILITY_CASES)) {
  throw new Error(
    `AbilityBattleEffects case segmentation drifted.\nExpected: ${EXPECTED_ABILITY_CASES.join(", ")}\n`
      + `Actual: ${actualAbilityCases.join(", ")}`,
  );
}
const actualItemCases = itemSegments.map((segment) => segment.caseName);
if (JSON.stringify(actualItemCases) !== JSON.stringify(EXPECTED_ITEM_CASES)) {
  throw new Error(
    `ItemBattleEffects case segmentation drifted.\nExpected: ${EXPECTED_ITEM_CASES.join(", ")}\n`
      + `Actual: ${actualItemCases.join(", ")}`,
  );
}
const aliasNames = abilitySegments.flatMap((segment) => segment.aliasLabels.map((alias) => alias.name)).sort();
if (JSON.stringify(aliasNames)
  !== JSON.stringify(["ABILITYEFFECT_MUD_SPORT", "ABILITYEFFECT_SWITCH_IN_WEATHER", "ABILITYEFFECT_WATER_SPORT"])) {
  throw new Error(`alias pseudo-modes drifted: ${aliasNames.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Inline sites across the scan set
// ---------------------------------------------------------------------------

type InlineSite = {
  file: string;
  tag: "rules" | "ai";
  line: number;
  enclosingGuess: string | null;
};

const C_FUNCTION_GUESS = /^[A-Za-z_][A-Za-z0-9_ *]*\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
const ASM_LABEL_GUESS = /^([A-Za-z_][A-Za-z0-9_]*):{1,2}\s*$/;

function enclosingGuessFor(lines: readonly string[], index: number, isAsm: boolean): string | null {
  for (let i = index; i >= 0; i -= 1) {
    const line = lines[i]!;
    if (isAsm) {
      const label = line.match(ASM_LABEL_GUESS);
      if (label) return label[1]!;
    } else {
      if (/^[}\s]/.test(line) || line.length === 0) continue;
      if (line.endsWith(";") || line.startsWith("#") || line.startsWith("//") || line.startsWith("/*")
        || line.startsWith("*") || line.startsWith("EWRAM_DATA") || line.startsWith("static const")
        || line.startsWith("const ")) continue;
      const header = line.match(C_FUNCTION_GUESS);
      if (header) return header[1]!;
    }
  }
  return null;
}

const inlineAbilitySites = new Map<string, InlineSite[]>();
const inlineHoldEffectSites = new Map<string, InlineSite[]>();
const scannedFiles: { file: string; tag: "rules" | "ai"; sha256: string; lines: number }[] = [];

for (const { file, tag } of SCAN_FILES) {
  const source = readFileSync(join(REF, file), "utf8");
  const lines = source.split("\n");
  const isAsm = file.endsWith(".s");
  scannedFiles.push({
    file,
    tag,
    sha256: createHash("sha256").update(source).digest("hex"),
    lines: lines.length,
  });
  const skipSpans: Span[] = file === BATTLE_UTIL_FILE ? [abilityFnSpan, itemFnSpan] : [];
  const inSkip = (lineNumber: number): boolean =>
    skipSpans.some((span) => lineNumber >= span.startLine && lineNumber <= span.endLine);
  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    if (inSkip(lineNumber)) continue;
    for (const [pattern, universe, sink] of [
      [/\b(ABILITY_[A-Z_0-9]+)\b/g, abilityIds, inlineAbilitySites],
      [/\b(HOLD_EFFECT_[A-Z_0-9]+)\b/g, holdEffectIds, inlineHoldEffectSites],
    ] as const) {
      for (const match of lines[i]!.matchAll(pattern)) {
        const token = match[1]!;
        if (!universe.has(token)) continue;
        const sites = sink.get(token) ?? [];
        sites.push({ file, tag, line: lineNumber, enclosingGuess: enclosingGuessFor(lines, i, isAsm) });
        sink.set(token, sites);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Emit (stable ordering: universes by id, site lists in scan order)
// ---------------------------------------------------------------------------

function sortedUniverse(universe: ReadonlyMap<string, number>): { name: string; id: number }[] {
  return [...universe.entries()]
    .map(([name, id]) => ({ name, id }))
    .sort((a, b) => a.id - b.id || a.name.localeCompare(b.name));
}

function sortedSites(sink: ReadonlyMap<string, InlineSite[]>): Record<string, InlineSite[]> {
  const out: Record<string, InlineSite[]> = {};
  for (const name of [...sink.keys()].sort()) out[name] = sink.get(name)!;
  return out;
}

const artifact = {
  schema: "ability-item-hooks/v1",
  rerunCommand: "node --experimental-strip-types tools/extract/extract-ability-item-hooks.ts",
  source: {
    battleUtil: {
      file: BATTLE_UTIL_FILE,
      sha256: createHash("sha256").update(battleUtilSource).digest("hex"),
      abilityBattleEffects: abilityFnSpan,
      itemBattleEffects: itemFnSpan,
    },
    scannedFiles,
  },
  universes: {
    abilities: sortedUniverse(abilityIds),
    holdEffects: sortedUniverse(holdEffectIds),
  },
  abilityBattleEffects: { cases: abilitySegments },
  itemBattleEffects: { cases: itemSegments },
  inlineSites: {
    abilities: sortedSites(inlineAbilitySites),
    holdEffects: sortedSites(inlineHoldEffectSites),
  },
};

mkdirSync(DATA_GEN, { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

const inlineAbilityCount = [...inlineAbilitySites.values()].reduce((sum, sites) => sum + sites.length, 0);
const inlineHoldCount = [...inlineHoldEffectSites.values()].reduce((sum, sites) => sum + sites.length, 0);
console.log(
  `ability-item-hooks.json written: ${abilitySegments.length} AbilityBattleEffects cases `
    + `(+${aliasNames.length} nested pseudo-modes), ${itemSegments.length} ItemBattleEffects cases, `
    + `${inlineAbilitySites.size} distinct inline abilities across ${inlineAbilityCount} sites, `
    + `${inlineHoldEffectSites.size} distinct inline hold effects across ${inlineHoldCount} sites, `
    + `universes ${abilityIds.size} abilities / ${holdEffectIds.size} hold effects.`,
);
