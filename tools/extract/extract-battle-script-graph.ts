// Dev-time, lexical catalog of the Battle Script assembly.  This is deliberately
// not an assembler, typed IR, or interpreter: operands stay source text and
// macro expansion is only used to report the B_SCR_OP_* bytes that the source
// macro declaration itself emits.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-graph.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-graph.ts --out-dir /tmp/battle-script-graph

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const DATA_GEN = outDirArg === undefined
  ? join(RUN_ROOT, "src", "data", "gen")
  : isAbsolute(outDirArg) ? outDirArg : join(RUN_ROOT, outDirArg);

type Macro = {
  name: string;
  declarationLine: number;
  parameterTokens: string[];
  directOpcodeBindings: string[];
  opcodeBindings: string[];
};
type Statement = {
  line: number;
  kind: "instruction" | "directive";
  mnemonic: string;
  rawOperands: string;
  operandTokens: string[];
  opcodeBindings?: string[];
  labelOperands: string[];
};
type Label = { name: string; line: number; sigil: ":" | "::"; nextLabel: string | null; statements: Statement[] };

function stripAssemblerComment(line: string): string {
  // battle_scripts_1.s does not use quoted strings, but retaining quoted @
  // characters keeps this catalog safe if one is added later.
  let quote: string | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
    } else if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === "@") {
      return line.slice(0, index);
    }
  }
  return line;
}

function splitOperands(raw: string): string[] {
  if (!raw.trim()) return [];
  const operands: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]!;
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      operands.push(raw.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (depth !== 0 || quote !== null) throw new Error(`unbalanced operand text: ${raw}`);
  operands.push(raw.slice(start).trim());
  return operands;
}

function parseMacroDeclarations(source: string): Macro[] {
  const macros: Array<Macro & { body: Array<{ line: number; text: string }> }> = [];
  let current: (Macro & { body: Array<{ line: number; text: string }> }) | undefined;
  for (const [index, rawLine] of source.split("\n").entries()) {
    const line = index + 1;
    const text = stripAssemblerComment(rawLine).trim();
    if (!text) continue;
    const start = /^\.macro\s+([A-Za-z_][A-Za-z0-9_]*)\b(.*)$/.exec(text);
    if (start) {
      if (current) throw new Error(`nested macro at asm/macros/battle_script.inc:${line}`);
      current = {
        name: start[1]!,
        declarationLine: line,
        parameterTokens: splitOperands(start[2]!.trim()),
        directOpcodeBindings: [],
        opcodeBindings: [],
        body: [],
      };
      macros.push(current);
      continue;
    }
    if (text === ".endm") {
      if (!current) throw new Error(`orphan .endm at asm/macros/battle_script.inc:${line}`);
      current = undefined;
      continue;
    }
    if (!current) throw new Error(`unsupported top-level macro-file line ${line}: ${text}`);
    const directOpcode = /^\.byte\s+(B_SCR_OP_[A-Z0-9_]+)\s*$/.exec(text);
    if (directOpcode) current.directOpcodeBindings.push(directOpcode[1]!);
    current.body.push({ line, text });
  }
  if (current) throw new Error(`unterminated macro ${current.name}`);

  const byName = new Map(macros.map((macro) => [macro.name, macro]));
  const visiting = new Set<string>();
  const resolve = (macro: Macro & { body: Array<{ line: number; text: string }> }): string[] => {
    if (macro.opcodeBindings.length) return macro.opcodeBindings;
    if (visiting.has(macro.name)) throw new Error(`recursive source macro ${macro.name}`);
    visiting.add(macro.name);
    const bindings: string[] = [];
    for (const bodyStatement of macro.body) {
      const direct = /^\.byte\s+(B_SCR_OP_[A-Z0-9_]+)\s*$/.exec(bodyStatement.text);
      if (direct) {
        bindings.push(direct[1]!);
        continue;
      }
      const invocation = /^([A-Za-z_][A-Za-z0-9_]*)\b/.exec(bodyStatement.text);
      if (invocation && byName.has(invocation[1]!)) bindings.push(...resolve(byName.get(invocation[1]!)!));
    }
    visiting.delete(macro.name);
    if (!bindings.length) throw new Error(`macro ${macro.name} has no B_SCR_OP binding`);
    macro.opcodeBindings = bindings;
    return bindings;
  };
  for (const macro of macros) resolve(macro);
  return macros.map(({ body: _body, ...macro }) => macro);
}

function parseSourceStatements(source: string, macros: Macro[]): { preamble: Statement[]; labels: Label[]; nonExecutableCategories: Record<string, number> } {
  const macroByName = new Map(macros.map((macro) => [macro.name, macro]));
  const preamble: Statement[] = [];
  const labels: Label[] = [];
  const nonExecutableCategories = new Map<string, number>();
  let current: Label | undefined;
  for (const [index, rawLine] of source.split("\n").entries()) {
    const line = index + 1;
    const text = stripAssemblerComment(rawLine).trim();
    if (!text) continue;
    const label = /^([.$A-Za-z_][.$A-Za-z0-9_]*)(::|:)$/.exec(text);
    if (label) {
      current = { name: label[1]!, line, sigil: label[2]! as ":" | "::", nextLabel: null, statements: [] };
      labels.push(current);
      continue;
    }
    const parsed = /^(\S+)(?:\s+(.*))?$/.exec(text);
    if (!parsed) throw new Error(`unsupported source line ${line}: ${text}`);
    const mnemonic = parsed[1]!;
    const rawOperands = parsed[2] ?? "";
    const statement: Statement = {
      line,
      kind: mnemonic.startsWith(".") || mnemonic.startsWith("#") ? "directive" : "instruction",
      mnemonic,
      rawOperands,
      operandTokens: splitOperands(rawOperands),
      labelOperands: [],
    };
    if (statement.kind === "instruction") {
      const macro = macroByName.get(mnemonic);
      if (!macro) throw new Error(`instruction ${mnemonic} at data/battle_scripts_1.s:${line} has no source macro declaration`);
      statement.opcodeBindings = macro.opcodeBindings;
    } else {
      nonExecutableCategories.set(`directive:${mnemonic}`, (nonExecutableCategories.get(`directive:${mnemonic}`) ?? 0) + 1);
    }
    (current?.statements ?? preamble).push(statement);
  }
  for (const [index, label] of labels.entries()) label.nextLabel = labels[index + 1]?.name ?? null;
  return { preamble, labels, nonExecutableCategories: Object.fromEntries([...nonExecutableCategories].sort(([a], [b]) => a.localeCompare(b))) };
}

const macros = parseMacroDeclarations(readFileSync(join(REF, "asm", "macros", "battle_script.inc"), "utf8"));
const parsed = parseSourceStatements(readFileSync(join(REF, "data", "battle_scripts_1.s"), "utf8"), macros);
const labelsByName = new Map(parsed.labels.map((label) => [label.name, label]));
if (labelsByName.size !== parsed.labels.length) throw new Error("duplicate source label name");
const identifier = /[.$A-Za-z_][.$A-Za-z0-9_]*/g;
for (const statement of [...parsed.preamble, ...parsed.labels.flatMap((label) => label.statements)]) {
  statement.labelOperands = [...statement.rawOperands.matchAll(identifier)]
    .map(([token]) => token!)
    .filter((token) => labelsByName.has(token));
}

const topology = JSON.parse(readFileSync(join(DATA_GEN, "battle-script-topology.json"), "utf8")) as {
  effects: Array<{ id: number; effect: string; entryScript: string }>;
  opcodes: Array<{ opcode: string }>;
};
const opcodeSet = new Set(topology.opcodes.map((opcode) => opcode.opcode));
for (const macro of macros) {
  for (const opcode of macro.opcodeBindings) {
    if (!opcodeSet.has(opcode)) throw new Error(`macro ${macro.name} binds non-topology opcode ${opcode}`);
  }
}
for (const effect of topology.effects) {
  if (!labelsByName.has(effect.entryScript)) throw new Error(`effect ${effect.effect} entrypoint ${effect.entryScript} is not a source label`);
}

const statements = [...parsed.preamble, ...parsed.labels.flatMap((label) => label.statements)];
const graph = {
  schema: "battle-script-graph/v1",
  source: {
    files: ["asm/macros/battle_script.inc", "data/battle_scripts_1.s", "src/data/gen/battle-script-topology.json"],
    note: "Lexical source graph only. Operand tokens are raw assembly text; opcode bindings are mechanically expanded source macros, not inferred operand types or executable mechanics.",
  },
  counts: {
    macros: macros.length,
    labels: parsed.labels.length,
    statements: statements.length,
    executableInstructions: statements.filter((statement) => statement.kind === "instruction").length,
    directives: statements.filter((statement) => statement.kind === "directive").length,
    labelOperandReferences: statements.reduce((total, statement) => total + statement.labelOperands.length, 0),
    nonExecutableCategories: Object.keys(parsed.nonExecutableCategories).length,
    unsupportedLineCategories: 0,
  },
  macros,
  preamble: parsed.preamble,
  labels: parsed.labels,
  effectEntrypoints: topology.effects.map((effect) => ({ id: effect.id, effect: effect.effect, label: effect.entryScript })),
  nonExecutableCategories: parsed.nonExecutableCategories,
  unsupportedLineCategories: {},
};

mkdirSync(DATA_GEN, { recursive: true });
const output = join(DATA_GEN, "battle-script-graph.json");
writeFileSync(output, `${JSON.stringify(graph)}\n`);
console.log(`wrote ${output} (${graph.counts.macros} macros, ${graph.counts.labels} labels, ${graph.counts.executableInstructions} instructions)`);
