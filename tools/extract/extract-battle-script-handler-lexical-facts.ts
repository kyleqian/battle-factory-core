// Dev-time raw lexical facts for the pinned Cmd_* Battle Script handlers.
//
// This is intentionally not a C parser.  It preserves every definition line
// as evidence and reports line forms it does not parse instead of assigning
// semantics to them.  Names below are only source-token facts: in particular,
// a callee-looking identifier may be a macro and a g/s/uppercase-shaped name
// is not resolved to a C symbol or assigned a game meaning.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-handler-lexical-facts.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-handler-lexical-facts.ts --out-dir /tmp/battle-script-handler-lexical-facts

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const COMMAND_FILE = "src/battle_script_commands.c";
const CATALOG_FILE = "src/data/gen/battle-script-command-handlers.json";
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const DATA_GEN = outDirArg === undefined
  ? join(RUN_ROOT, "src", "data", "gen")
  : isAbsolute(outDirArg) ? outDirArg : join(RUN_ROOT, outDirArg);

type Definition = {
  symbol: string;
  file: string;
  startLine: number;
  openingBraceLine: number;
  endLine: number;
  signatureLine: number;
  signatureRaw: string;
};
type Slot = {
  index: number;
  opcode: string;
  table: { rowIndex: number } | null;
  handler: { symbol: string; definition: Definition | null } | null;
};
type Token = { value: string; start: number; end: number };
type SourceLocation = { line: number; column: number };

const commandSource = readFileSync(join(REF, COMMAND_FILE), "utf8");
const commandCatalogText = readFileSync(join(RUN_ROOT, CATALOG_FILE), "utf8");
const commandCatalog = JSON.parse(commandCatalogText) as {
  schema: string;
  source: { dispatchTable: { file: string; sha256: string } };
  slots: Slot[];
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function maskNonCode(source: string): string {
  const masked = source.split("");
  let state: "code" | "lineComment" | "blockComment" | "singleQuote" | "doubleQuote" = "code";
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    const next = source[index + 1];
    if (state === "lineComment") {
      if (char === "\n") state = "code";
      else masked[index] = " ";
      continue;
    }
    if (state === "blockComment") {
      if (char === "*" && next === "/") {
        masked[index] = " ";
        masked[index + 1] = " ";
        index += 1;
        state = "code";
      } else if (char !== "\n") {
        masked[index] = " ";
      }
      continue;
    }
    if (state === "singleQuote" || state === "doubleQuote") {
      if (char !== "\n") masked[index] = " ";
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if ((state === "singleQuote" && char === "'") || (state === "doubleQuote" && char === "\"")) state = "code";
      continue;
    }
    if (char === "/" && next === "/") {
      masked[index] = " ";
      masked[index + 1] = " ";
      index += 1;
      state = "lineComment";
    } else if (char === "/" && next === "*") {
      masked[index] = " ";
      masked[index + 1] = " ";
      index += 1;
      state = "blockComment";
    } else if (char === "'") {
      masked[index] = " ";
      state = "singleQuote";
    } else if (char === "\"") {
      masked[index] = " ";
      state = "doubleQuote";
    }
  }
  return masked.join("");
}

function locationAt(source: string, startLine: number, offset: number): SourceLocation {
  let line = startLine;
  let lineStart = 0;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      lineStart = index + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

function lineRawAt(source: string, offset: number): string {
  const start = source.lastIndexOf("\n", offset - 1) + 1;
  const end = source.indexOf("\n", offset);
  return source.slice(start, end < 0 ? source.length : end);
}

function skipWhitespace(source: string, index: number, direction: 1 | -1): number {
  let cursor = index;
  while (cursor >= 0 && cursor < source.length && /\s/.test(source[cursor]!)) cursor += direction;
  return cursor;
}

function findBalancedClose(masked: string, open: number): number | null {
  let depth = 0;
  for (let index = open; index < masked.length; index += 1) {
    if (masked[index] === "(") depth += 1;
    else if (masked[index] === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return null;
}

function statementRaw(source: string, masked: string, offset: number): string {
  let start = offset;
  while (start > 0 && !";{}".includes(masked[start - 1]!)) start -= 1;
  let end = offset;
  while (end < masked.length && masked[end] !== ";") end += 1;
  if (end < masked.length) end += 1;
  return source.slice(start, end).trim();
}

function lineForm(code: string): "brace" | "preprocessor" | "control" | "semicolonTerminated" | "unparsed" {
  const trimmed = code.trim();
  if (/^(?:\}|\{)+\s*(?:else\s*)?(?:\{|\})*\s*$/.test(trimmed)) return "brace";
  if (trimmed.startsWith("#")) return "preprocessor";
  if (/^(?:if|else|for|while|switch|case|default|do)\b/.test(trimmed)) return "control";
  if (trimmed.endsWith(";")) return "semicolonTerminated";
  return "unparsed";
}

function identifierTokens(masked: string): Token[] {
  return [...masked.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)].map((match) => ({
    value: match[0]!, start: match.index!, end: match.index! + match[0]!.length,
  }));
}

const nonCalleeKeywords = new Set(["if", "for", "while", "switch", "return", "sizeof", "case"]);
const assignmentOperators = ["<<=", ">>=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "="];

function pointerOperation(masked: string, token: Token): "read" | "assignment" | "compoundAssignment" | "increment" | "decrement" {
  const before = skipWhitespace(masked, token.start - 1, -1);
  const after = skipWhitespace(masked, token.end, 1);
  if (masked.slice(before - 1, before + 1) === "++" || masked.slice(after, after + 2) === "++") return "increment";
  if (masked.slice(before - 1, before + 1) === "--" || masked.slice(after, after + 2) === "--") return "decrement";
  const operator = assignmentOperators.find((candidate) => masked.startsWith(candidate, after));
  if (operator === "=") {
    const next = masked[after + 1];
    if (next !== "=" && next !== ">") return "assignment";
  }
  if (operator && operator !== "=") return "compoundAssignment";
  return "read";
}

function pointerAccessExpression(source: string, masked: string, token: Token): string {
  let end = skipWhitespace(masked, token.end, 1);
  if (masked[end] === "[") {
    let depth = 0;
    for (let index = end; index < masked.length; index += 1) {
      if (masked[index] === "[") depth += 1;
      else if (masked[index] === "]") {
        depth -= 1;
        if (depth === 0) {
          end = index + 1;
          break;
        }
      }
    }
  } else {
    end = token.end;
  }
  return source.slice(token.start, end);
}

const handlers = commandCatalog.slots.map((slot) => {
  if (slot.table === null || slot.handler === null || slot.handler.definition === null) {
    throw new Error(`command handler catalog slot ${slot.index} does not have a unique pinned definition`);
  }
  const definition = slot.handler.definition;
  if (definition.file !== COMMAND_FILE) throw new Error(`${definition.symbol} unexpectedly points at ${definition.file}`);
  const allLines = commandSource.split("\n");
  const rawLines = allLines.slice(definition.startLine - 1, definition.endLine).map((raw, offset) => ({ line: definition.startLine + offset, raw }));
  const definitionText = rawLines.map((entry) => entry.raw).join("\n");
  const masked = maskNonCode(definitionText);
  const tokens = identifierTokens(masked);
  const pointerReferences = tokens.filter((token) => token.value === "gBattlescriptCurrInstr").map((token) => {
    const operation = pointerOperation(masked, token);
    const location = locationAt(definitionText, definition.startLine, token.start);
    return {
      ...location,
      operation,
      accessExpression: pointerAccessExpression(definitionText, masked, token),
      lineRaw: lineRawAt(definitionText, token.start),
      statementRaw: statementRaw(definitionText, masked, token.start),
    };
  });
  const calleeCandidates = tokens.flatMap((token) => {
    if (nonCalleeKeywords.has(token.value)) return [];
    const open = skipWhitespace(masked, token.end, 1);
    if (masked[open] !== "(") return [];
    const close = findBalancedClose(masked, open);
    if (close === null) throw new Error(`unbalanced call-like token ${token.value} in ${definition.symbol}`);
    const location = locationAt(definitionText, definition.startLine, token.start);
    return [{
      ...location,
      symbol: token.value,
      rawArguments: definitionText.slice(open + 1, close),
      lineRaw: lineRawAt(definitionText, token.start),
    }];
  });
  const identifierReferences = tokens.flatMap((token) => {
    const lexicalClasses: string[] = [];
    if (/^g[A-Z]/.test(token.value)) lexicalClasses.push("gPrefix");
    if (/^s[A-Z]/.test(token.value)) lexicalClasses.push("sPrefix");
    if (/^BattleScript_[A-Za-z0-9_]+$/.test(token.value)) lexicalClasses.push("battleScriptPrefix");
    if (/^[A-Z][A-Z0-9_]*$/.test(token.value)) lexicalClasses.push("uppercaseConstantLike");
    if (!lexicalClasses.length) return [];
    return [{ ...locationAt(definitionText, definition.startLine, token.start), token: token.value, lexicalClasses, lineRaw: lineRawAt(definitionText, token.start) }];
  });
  const forms = rawLines.flatMap(({ line, raw }, index) => {
    const code = masked.slice(
      definitionText.split("\n").slice(0, index).reduce((total, prior) => total + prior.length + 1, 0),
      definitionText.split("\n").slice(0, index + 1).reduce((total, prior) => total + prior.length + 1, -1),
    );
    if (!code.trim()) return [];
    const form = lineForm(code);
    return [{ line, form, raw, code }];
  });
  const lineForms = Object.fromEntries(["brace", "preprocessor", "control", "semicolonTerminated", "unparsed"].map((form) => [form, forms.filter((entry) => entry.form === form).length]));
  return {
    slot: { index: slot.index, opcode: slot.opcode, tableRowIndex: slot.table.rowIndex },
    symbol: definition.symbol,
    source: {
      file: definition.file,
      fileSha256: sha256(commandSource),
      startLine: definition.startLine,
      openingBraceLine: definition.openingBraceLine,
      endLine: definition.endLine,
      signatureLine: definition.signatureLine,
      signatureRaw: definition.signatureRaw,
      definitionTextSha256: sha256(definitionText),
    },
    rawLines,
    instructionPointerFacts: {
      references: pointerReferences,
      reads: pointerReferences.filter((reference) => reference.operation === "read"),
      writes: pointerReferences.filter((reference) => reference.operation === "assignment" || reference.operation === "compoundAssignment"),
      advanceExpressions: pointerReferences.filter((reference) => reference.operation === "compoundAssignment" || reference.operation === "increment" || reference.operation === "decrement"),
    },
    t1ReadInvocations: calleeCandidates.filter((candidate) => /^T1_READ_[A-Za-z0-9_]*$/.test(candidate.symbol)),
    directlyCalledSymbolCandidates: calleeCandidates,
    globalOrConstantLikeReferences: identifierReferences,
    lexicalAudit: {
      lineForms,
      unparsedNonblankStatementForms: forms.filter((entry) => entry.form === "unparsed"),
      unsupportedLexicalCategories: [],
    },
  };
});

const symbols = handlers.map((handler) => handler.symbol);
if (new Set(symbols).size !== symbols.length) throw new Error("command handler catalog repeats a handler symbol");
if (handlers.length !== 249) throw new Error(`expected 249 unique table handlers, found ${handlers.length}`);

const catalog = {
  schema: "battle-script-handler-lexical-facts/v1",
  source: {
    commandHandlers: {
      file: CATALOG_FILE,
      sha256: sha256(commandCatalogText),
      schema: commandCatalog.schema,
    },
    commandSource: { file: COMMAND_FILE, sha256: sha256(commandSource) },
    note: "Raw lexical evidence only. C lines are preserved even when their statement form is unparsed. Callee candidates and g/s/uppercase/BattleScript name classes are spelling-based, not C symbol resolution; no operand shapes, command semantics, control categories, side effects, or behavior are inferred.",
  },
  counts: {
    tableHandlers: handlers.length,
    instructionPointerReferences: handlers.reduce((total, handler) => total + handler.instructionPointerFacts.references.length, 0),
    instructionPointerReads: handlers.reduce((total, handler) => total + handler.instructionPointerFacts.reads.length, 0),
    instructionPointerWrites: handlers.reduce((total, handler) => total + handler.instructionPointerFacts.writes.length, 0),
    instructionPointerAdvanceExpressions: handlers.reduce((total, handler) => total + handler.instructionPointerFacts.advanceExpressions.length, 0),
    t1ReadInvocations: handlers.reduce((total, handler) => total + handler.t1ReadInvocations.length, 0),
    directlyCalledSymbolCandidates: handlers.reduce((total, handler) => total + handler.directlyCalledSymbolCandidates.length, 0),
    globalOrConstantLikeReferences: handlers.reduce((total, handler) => total + handler.globalOrConstantLikeReferences.length, 0),
    unparsedNonblankStatementForms: handlers.reduce((total, handler) => total + handler.lexicalAudit.unparsedNonblankStatementForms.length, 0),
    unsupportedLexicalCategories: handlers.reduce((total, handler) => total + handler.lexicalAudit.unsupportedLexicalCategories.length, 0),
  },
  coverageAudit: {
    handlerSymbolsInCatalogOrder: symbols,
    duplicateHandlerSymbols: symbols.filter((symbol, index) => symbols.indexOf(symbol) !== index),
    slotsWithoutHandlerFacts: commandCatalog.slots.filter((slot) => !handlers.some((handler) => handler.slot.index === slot.index)).map((slot) => ({ index: slot.index, opcode: slot.opcode })),
    handlerFactsWithoutCatalogSlot: handlers.filter((handler) => !commandCatalog.slots.some((slot) => slot.index === handler.slot.index)).map((handler) => ({ index: handler.slot.index, symbol: handler.symbol })),
  },
  handlers,
};

mkdirSync(DATA_GEN, { recursive: true });
const output = join(DATA_GEN, "battle-script-handler-lexical-facts.json");
writeFileSync(output, `${JSON.stringify(catalog)}\n`);
console.log(`wrote ${output} (${handlers.length} handlers, ${catalog.counts.instructionPointerReferences} instruction-pointer references)`);
