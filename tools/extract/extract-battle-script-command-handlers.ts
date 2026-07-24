// Dev-time catalog of the pinned source's Battle Script command dispatch. It
// records enum/table/handler provenance verbatim enough to trace a byte-table
// slot back to its C definition, but deliberately does not assign an opcode
// operand shape, width, behavioral category, or runtime effect.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-command-handlers.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-command-handlers.ts --out-dir /tmp/battle-script-command-handlers
//
// Never imported at runtime - the production build only reads generated JSON.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ENUM_FILE = "include/constants/battle_script_commands.h";
const COMMAND_FILE = "src/battle_script_commands.c";
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const DATA_GEN = outDirArg === undefined
  ? join(RUN_ROOT, "src", "data", "gen")
  : isAbsolute(outDirArg) ? outDirArg : join(RUN_ROOT, outDirArg);

const enumSource = readFileSync(join(REF, ENUM_FILE), "utf8");
const commandSource = readFileSync(join(REF, COMMAND_FILE), "utf8");

type SourceFile = { file: string; sha256: string };
type EnumRow = { index: number; opcode: string; line: number; raw: string };
type TableRow = { rowIndex: number; opcode: string; handler: string; line: number; raw: string; designatorExpression: string; handlerExpression: string };
type HandlerDefinition = { symbol: string; file: string; startLine: number; openingBraceLine: number; endLine: number; signatureLine: number; signatureRaw: string };

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (source[index] === "\n") line += 1;
  return line;
}

function parseEnum(source: string): { declarationLine: number; openingBraceLine: number; closingBraceLine: number; rows: EnumRow[] } {
  const lines = source.split("\n");
  const declarationIndex = lines.findIndex((line) => /^enum BattleScriptOpcode\s*$/.test(line));
  if (declarationIndex < 0) throw new Error("BattleScriptOpcode enum declaration missing");
  const openingBraceIndex = lines.findIndex((line, index) => index >= declarationIndex && /^\{\s*$/.test(line));
  if (openingBraceIndex < 0) throw new Error("BattleScriptOpcode enum opening brace missing");
  const closingBraceIndex = lines.findIndex((line, index) => index > openingBraceIndex && /^\};\s*$/.test(line));
  if (closingBraceIndex < 0) throw new Error("BattleScriptOpcode enum closing brace missing");

  const rows: EnumRow[] = [];
  for (let index = openingBraceIndex + 1; index < closingBraceIndex; index += 1) {
    const raw = lines[index]!;
    if (!raw.trim()) continue;
    const match = /^\s*(B_SCR_OP_[A-Z0-9_]+)\s*,\s*$/.exec(raw);
    if (!match) throw new Error(`unparsed BattleScriptOpcode enum row at ${ENUM_FILE}:${index + 1}: ${raw}`);
    rows.push({ index: rows.length, opcode: match[1]!, line: index + 1, raw });
  }
  return { declarationLine: declarationIndex + 1, openingBraceLine: openingBraceIndex + 1, closingBraceLine: closingBraceIndex + 1, rows };
}

function parseTable(source: string): { declarationLine: number; openingBraceLine: number; closingBraceLine: number; rows: TableRow[] } {
  const lines = source.split("\n");
  const declarationIndex = lines.findIndex((line) => /^void \(\*const gBattleScriptingCommandsTable\[\]\)\(void\)\s*=\s*$/.test(line));
  if (declarationIndex < 0) throw new Error("gBattleScriptingCommandsTable declaration missing");
  const openingBraceIndex = lines.findIndex((line, index) => index > declarationIndex && /^\{\s*$/.test(line));
  if (openingBraceIndex < 0) throw new Error("gBattleScriptingCommandsTable opening brace missing");
  const closingBraceIndex = lines.findIndex((line, index) => index > openingBraceIndex && /^\};\s*$/.test(line));
  if (closingBraceIndex < 0) throw new Error("gBattleScriptingCommandsTable closing brace missing");

  const rows: TableRow[] = [];
  for (let index = openingBraceIndex + 1; index < closingBraceIndex; index += 1) {
    const raw = lines[index]!;
    if (!raw.trim()) continue;
    const match = /^\s*\[(B_SCR_OP_[A-Z0-9_]+)\]\s*=\s*(Cmd_[A-Za-z0-9_]+)\s*,?\s*(?:\/\/.*)?$/.exec(raw);
    if (!match) throw new Error(`unparsed gBattleScriptingCommandsTable row at ${COMMAND_FILE}:${index + 1}: ${raw}`);
    rows.push({
      rowIndex: rows.length,
      opcode: match[1]!,
      handler: match[2]!,
      line: index + 1,
      raw,
      designatorExpression: match[1]!,
      handlerExpression: match[2]!,
    });
  }
  return { declarationLine: declarationIndex + 1, openingBraceLine: openingBraceIndex + 1, closingBraceLine: closingBraceIndex + 1, rows };
}

function parseHandlerDefinitions(source: string): Map<string, HandlerDefinition[]> {
  const definitions = new Map<string, HandlerDefinition[]>();
  const lines = source.split("\n");
  const matcher = /^static void (Cmd_[A-Za-z0-9_]+)\(void\)\s*\{/gm;
  for (const match of source.matchAll(matcher)) {
    const symbol = match[1]!;
    const openingBrace = source.indexOf("{", match.index!);
    const startLine = lineOf(source, match.index!);
    // The pinned source has conditional compilation alternatives whose braces
    // cannot be balanced without choosing a build configuration. Its function
    // definitions use the project's column-zero closing-brace style, so use
    // that source-text boundary rather than pretending to preprocess it.
    const endLineIndex = lines.findIndex((line, index) => index >= startLine && line === "}");
    if (endLineIndex < 0) throw new Error(`no column-zero closing brace for ${symbol} at ${COMMAND_FILE}:${startLine}`);
    const definition: HandlerDefinition = {
      symbol,
      file: COMMAND_FILE,
      startLine,
      openingBraceLine: lineOf(source, openingBrace),
      endLine: endLineIndex + 1,
      signatureLine: startLine,
      signatureRaw: source.slice(match.index!, openingBrace).trimEnd(),
    };
    definitions.set(symbol, [...(definitions.get(symbol) ?? []), definition]);
  }
  return definitions;
}

function duplicateNames(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value);
}

const enumCatalog = parseEnum(enumSource);
const tableCatalog = parseTable(commandSource);
const definitionsBySymbol = parseHandlerDefinitions(commandSource);
const enumByOpcode = new Map(enumCatalog.rows.map((row) => [row.opcode, row]));
const tableByOpcode = new Map<string, TableRow[]>();
for (const row of tableCatalog.rows) tableByOpcode.set(row.opcode, [...(tableByOpcode.get(row.opcode) ?? []), row]);

const slots = enumCatalog.rows.map((enumRow) => {
  const tableRows = tableByOpcode.get(enumRow.opcode) ?? [];
  const table = tableRows.length === 1 ? tableRows[0]! : null;
  const definitions = table === null ? [] : definitionsBySymbol.get(table.handler) ?? [];
  const definition = definitions.length === 1 ? definitions[0]! : null;
  return {
    index: enumRow.index,
    opcode: enumRow.opcode,
    enum: { file: ENUM_FILE, line: enumRow.line, raw: enumRow.raw },
    table: table === null ? null : {
      file: COMMAND_FILE,
      rowIndex: table.rowIndex,
      line: table.line,
      raw: table.raw,
      designatorExpression: table.designatorExpression,
      handlerExpression: table.handlerExpression,
    },
    handler: table === null ? null : { symbol: table.handler, definition },
  };
});

const handlerAliases = [...new Map(
  tableCatalog.rows.map((row) => [row.handler, tableCatalog.rows.filter((candidate) => candidate.handler === row.handler)]),
)].filter(([, rows]) => rows.length > 1).map(([handler, rows]) => ({ handler, slots: rows.map((row) => ({ rowIndex: row.rowIndex, opcode: row.opcode })) }));

const duplicateTableDesignators = [...tableByOpcode]
  .filter(([, rows]) => rows.length > 1)
  .map(([opcode, rows]) => ({ opcode, rowIndexes: rows.map((row) => row.rowIndex), lines: rows.map((row) => row.line) }));
const duplicateHandlerDefinitions = [...definitionsBySymbol]
  .filter(([, definitions]) => definitions.length > 1)
  .map(([symbol, definitions]) => ({ symbol, lines: definitions.map((definition) => definition.startLine) }));

const catalog = {
  schema: "battle-script-command-handlers/v1",
  source: {
    enum: { file: ENUM_FILE, sha256: sha256(enumSource), declarationLine: enumCatalog.declarationLine, openingBraceLine: enumCatalog.openingBraceLine, closingBraceLine: enumCatalog.closingBraceLine },
    dispatchTable: { file: COMMAND_FILE, sha256: sha256(commandSource), declarationLine: tableCatalog.declarationLine, openingBraceLine: tableCatalog.openingBraceLine, closingBraceLine: tableCatalog.closingBraceLine },
    note: "Names, expressions, raw table rows, and C definition spans are source evidence. This catalog deliberately does not infer operand semantics, operand widths, behavior categories, or runtime effects.",
  },
  counts: {
    enumRows: enumCatalog.rows.length,
    tableRows: tableCatalog.rows.length,
    slots: slots.length,
    handlerDefinitions: [...definitionsBySymbol.values()].flat().length,
    handlerAliases: handlerAliases.length,
  },
  slots,
  structuralAudit: {
    duplicateEnumNames: duplicateNames(enumCatalog.rows.map((row) => row.opcode)),
    duplicateTableDesignators,
    tableOpcodesMissingFromEnum: tableCatalog.rows.filter((row) => !enumByOpcode.has(row.opcode)).map((row) => ({ rowIndex: row.rowIndex, opcode: row.opcode, line: row.line })),
    enumOpcodesMissingTableRows: enumCatalog.rows.filter((row) => (tableByOpcode.get(row.opcode) ?? []).length === 0).map((row) => ({ index: row.index, opcode: row.opcode, line: row.line })),
    tableOrderMismatches: tableCatalog.rows.filter((row, index) => enumCatalog.rows[index]?.opcode !== row.opcode).map((row) => ({ rowIndex: row.rowIndex, opcode: row.opcode, enumOpcodeAtSameIndex: enumCatalog.rows[row.rowIndex]?.opcode ?? null })),
    tableSlotsWithoutUniqueHandlerDefinition: slots.filter((slot) => slot.table !== null && slot.handler?.definition === null).map((slot) => ({ index: slot.index, opcode: slot.opcode, handler: slot.handler!.symbol })),
    duplicateHandlerDefinitions,
    handlerAliases,
    handlerDefinitionsNotReferencedByTable: [...definitionsBySymbol.keys()].filter((symbol) => !tableCatalog.rows.some((row) => row.handler === symbol)),
  },
};

mkdirSync(DATA_GEN, { recursive: true });
const output = join(DATA_GEN, "battle-script-command-handlers.json");
writeFileSync(output, `${JSON.stringify(catalog)}\n`);
console.log(`wrote ${output} (${slots.length} opcode slots, ${catalog.counts.handlerDefinitions} handler definitions)`);
