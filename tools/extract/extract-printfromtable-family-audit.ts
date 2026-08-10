// Dev-time source audit for Cmd_printfromtable's complete pointer universe.
//
// This deliberately reads the pinned C/assembly source rather than the
// production handler.  It is a handoff artifact for the next implementation:
// every pointer emitted by battle_scripts_1.s must have a finite table body,
// contiguous indices, and a real numeric STRINGID.  The scope labels are
// source classifications, not emulator or pixel acceptance.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DEFAULT_OUT = join(RUN_ROOT, "src", "data", "gen", "printfromtable-family-audit.json");

export type Scope =
  | "ordinary-factory-l50-singles"
  | "legal-widened-scope-factory-singles"
  | "excluded-palace"
  | "excluded-wild"
  | "excluded-link"
  | "excluded-doubles";

type Citation = { file: string; line: number; note: string };
type StringEntry = {
  index: number;
  indexExpression: string | null;
  stringId: { symbol: string; id: number };
  sourceLine: number;
};
type Producer = {
  scriptLabel: string;
  scriptLine: number;
  scope: Scope;
  citations: Citation[];
};
type Family = {
  pointer: string;
  declaration: { file: string; startLine: number; endLine: number; raw: string };
  length: number;
  entries: StringEntry[];
  producers: Producer[];
};

export type PrintfromtableFamilyAudit = {
  schema: "printfromtable-family-audit/v1";
  source: {
    script: string;
    message: string;
    stringIds: string;
    weatherConstants: string;
    note: string;
  };
  counts: { printfromtableOccurrences: number; tablePointers: number; entries: number; producers: number };
  scopeLegend: Record<Scope, string>;
  families: Family[];
};

const SCOPE_LEGEND: Record<Scope, string> = {
  "ordinary-factory-l50-singles": "Producer is on the ordinary mirror-level Battle Factory Level-50 singles path; individual table rows may still be zero-incidence.",
  "legal-widened-scope-factory-singles": "Producer is a legal single-battle Factory source path kept for widened full-parity scope even when ordinary L50 incidence is zero.",
  "excluded-palace": "Battle Palace-only producer; excluded from the Battle Factory contract.",
  "excluded-wild": "Wild/escape-only producer; excluded from the Battle Factory contract.",
  "excluded-link": "Link/multi-only producer; excluded from the Battle Factory contract.",
  "excluded-doubles": "Doubles-only producer or chooser row; excluded from the singles contract.",
};

const FAMILY_SCOPE: Record<string, Scope> = {
  // The current L50 catalog has live carriers for every other generic battle
  // tail below (including Ditto/Transform and Mud Sport). Mist is the one
  // move-family intentionally retained only by widened legal-single scope.
  gMistUsedStringIds: "legal-widened-scope-factory-singles",
  // This is the battle-engine switch-in weather callback, not the map escape
  // path. It is retained as a legal single-battle source family for widened
  // weather/ability parity; its ordinary L50 incidence is separately a data
  // question for the consumer.
  gWeatherStartsStringIds: "legal-widened-scope-factory-singles",
  gNoEscapeStringIds: "excluded-wild",
  gBattlePalaceFlavorTextTable: "excluded-palace",
};

const FAMILY_CITATIONS: Record<string, Citation[]> = {
  gMistUsedStringIds: [{ file: "reference/pokeemerald/data/battle_scripts_1.s", line: 874, note: "BattleScript_EffectMist is the legal single-battle move producer; no ordinary L50 rental carries MIST." }],
  gWeatherStartsStringIds: [{ file: "reference/pokeemerald/src/battle_util.c", line: 2529, note: "ABILITYEFFECT_SWITCH_IN_WEATHER pushes BattleScript_OverworldWeatherStarts." }],
  gNoEscapeStringIds: [{ file: "reference/pokeemerald/src/battle_util.c", line: 520, note: "TryRun selects BattleScript_PrintFailedToRunString for wild escape handling." }],
  gBattlePalaceFlavorTextTable: [{ file: "reference/pokeemerald/src/battle_script_commands.c", line: 6396, note: "VARIOUS_PALACE_FLAVOR_TEXT supplies the Palace chooser and table." }],
};

function lines(text: string): string[] {
  return text.split(/\r?\n/);
}

function parseDefines(text: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const match of text.matchAll(/^#define\s+(\w+)\s+(\d+)\b/gm)) {
    result.set(match[1]!, Number(match[2]));
  }
  return result;
}

function resolveIndex(expression: string, defines: Map<string, number>, pointer: string): number {
  if (/^\d+$/.test(expression)) return Number(expression);
  const value = defines.get(expression);
  if (value === undefined) throw new Error(`${pointer}: unresolved table index ${expression}`);
  return value;
}

function parseTables(message: string, stringIds: Map<string, number>, defines: Map<string, number>, wanted?: Set<string>): Map<string, Family["entries"]> {
  const result = new Map<string, Family["entries"]>();
  const declaration = /const\s+u16\s+(g\w+(?:StringIds|Table))(?:(\[[^\]]*\]))?\s*=\s*\n?\s*\{/g;
  for (const match of message.matchAll(declaration)) {
    const pointer = match[1]!;
    const startOffset = match.index!;
    const bodyStart = startOffset + match[0].length;
    const bodyEnd = message.indexOf("\n};", bodyStart);
    if (bodyEnd < 0) throw new Error(`${pointer}: unterminated table`);
    if (wanted && !wanted.has(pointer)) continue;
    const body = message.slice(bodyStart, bodyEnd);
    const startLine = message.slice(0, startOffset).split(/\r?\n/).length;
    const entries: StringEntry[] = [];
    let positionalIndex = 0;
    for (const [offset, rawLine] of body.split(/\r?\n/).entries()) {
      const line = rawLine.replace(/\/\/.*$/, "");
      const entry = line.match(/^\s*(?:\[([^\]]+)\]\s*=\s*)?STRINGID_(\w+)\s*,?/);
      if (!entry) continue;
      const indexExpression = entry[1]?.trim() ?? null;
      const index = indexExpression === null
        ? positionalIndex
        : resolveIndex(indexExpression, defines, pointer);
      positionalIndex = index + 1;
      const key = entry[2]!;
      const id = stringIds.get(`STRINGID_${key}`);
      if (id === undefined) throw new Error(`${pointer}: unresolved STRINGID_${key}`);
      entries.push({
        index,
        indexExpression,
        stringId: { symbol: `STRINGID_${key}`, id },
        sourceLine: startLine + offset + 1,
      });
    }
    if (entries.length === 0) continue;
    entries.sort((a, b) => a.index - b.index);
    for (let index = 0; index < entries.length; index += 1) {
      if (entries[index]!.index !== index) throw new Error(`${pointer}: table has a hole or duplicate around index ${index}`);
    }
    result.set(pointer, entries);
  }
  return result;
}

function producerFor(pointer: string, scriptLabel: string, scriptLine: number): Producer {
  const scope = FAMILY_SCOPE[pointer] ?? "ordinary-factory-l50-singles";
  const citations = [
    { file: "reference/pokeemerald/data/battle_scripts_1.s", line: scriptLine, note: `${scriptLabel} emits printfromtable ${pointer}.` },
    ...(FAMILY_CITATIONS[pointer] ?? []),
  ];
  return { scriptLabel, scriptLine, scope, citations };
}

export function buildPrintfromtableFamilyAudit(): PrintfromtableFamilyAudit {
  const scriptFile = "reference/pokeemerald/data/battle_scripts_1.s";
  const messageFile = "reference/pokeemerald/src/battle_message.c";
  const idsFile = "reference/pokeemerald/include/constants/battle_string_ids.h";
  const weatherFile = "reference/pokeemerald/include/constants/weather.h";
  const scriptText = readFileSync(join(REF, "data", "battle_scripts_1.s"), "utf8");
  const messageText = readFileSync(join(REF, "src", "battle_message.c"), "utf8");
  const stringIdsText = readFileSync(join(REF, "include", "constants", "battle_string_ids.h"), "utf8");
  const weatherText = readFileSync(join(REF, "include", "constants", "weather.h"), "utf8");
  const stringIds = parseDefines(stringIdsText);
  const defines = new Map([...parseDefines(stringIdsText), ...parseDefines(weatherText)]);
  const sourcePointers = new Set([...scriptText.matchAll(/^\s*printfromtable\s+(\w+)\b/gm)].map((match) => match[1]!));
  const tables = parseTables(messageText, stringIds, defines, sourcePointers);
  const callsites = new Map<string, Producer[]>();
  let currentLabel = "<file-scope>";
  let occurrenceCount = 0;
  const scriptLines = lines(scriptText);
  for (const [lineIndex, raw] of scriptLines.entries()) {
    const lineNumber = lineIndex + 1;
    const label = raw.match(/^([A-Za-z0-9_]+)::\s*$/)?.[1];
    if (label) currentLabel = label;
    const match = raw.match(/^\s*printfromtable\s+(\w+)\b/);
    if (!match) continue;
    occurrenceCount += 1;
    const pointer = match[1]!;
    const producer = producerFor(pointer, currentLabel, lineNumber);
    callsites.set(pointer, [...(callsites.get(pointer) ?? []), producer]);
  }
  const pointers = [...callsites.keys()].sort();
  if (occurrenceCount !== 73) throw new Error(`expected 73 printfromtable occurrences, got ${occurrenceCount}`);
  if (pointers.length !== 43) throw new Error(`expected 43 distinct table pointers, got ${pointers.length}`);
  for (const pointer of pointers) if (!tables.has(pointer)) throw new Error(`${pointer}: pointer has no source table definition`);
  const families = pointers.map((pointer) => {
    const entries = tables.get(pointer)!;
    const declarationMatch = [...messageText.matchAll(new RegExp(`const\\s+u16\\s+${pointer}(?:\\[[^\\]]*\\])?\\s*=\\s*\\n?\\s*\\{`, "g"))][0];
    if (!declarationMatch) throw new Error(`${pointer}: declaration disappeared`);
    const startLine = messageText.slice(0, declarationMatch.index!).split(/\r?\n/).length;
    const endLine = entries[entries.length - 1]!.sourceLine + 1;
    return {
      pointer,
      declaration: { file: messageFile, startLine, endLine, raw: declarationMatch[0].replace(/\s+/g, " ").trim() },
      length: entries.length,
      entries,
      producers: callsites.get(pointer)!,
    } satisfies Family;
  });
  const entryCount = families.reduce((sum, family) => sum + family.entries.length, 0);
  return {
    schema: "printfromtable-family-audit/v1",
    source: {
      script: scriptFile,
      message: messageFile,
      stringIds: idsFile,
      weatherConstants: weatherFile,
      note: "Complete source inventory of printfromtable pointers emitted by battle_scripts_1.s. Table lengths are derived from contiguous source indices; all STRINGID symbols are resolved to battle_string_ids.h numeric ids. Scope labels classify producers only and do not claim emulator acceptance.",
    },
    counts: { printfromtableOccurrences: occurrenceCount, tablePointers: families.length, entries: entryCount, producers: occurrenceCount },
    scopeLegend: SCOPE_LEGEND,
    families,
  };
}

export function serializePrintfromtableFamilyAudit(audit: PrintfromtableFamilyAudit): string {
  return `${JSON.stringify(audit)}\n`;
}

function main(): void {
  const outIndex = process.argv.indexOf("--out");
  const outArg = outIndex < 0 ? DEFAULT_OUT : process.argv[outIndex + 1];
  if (!outArg) throw new Error("--out requires a file path");
  const output = isAbsolute(outArg) ? outArg : join(RUN_ROOT, outArg);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, serializePrintfromtableFamilyAudit(buildPrintfromtableFamilyAudit()));
  console.log(`wrote ${output}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
