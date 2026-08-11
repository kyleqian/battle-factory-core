// Dev-time, source-faithful emission catalog for asm/macros/battle_script.inc.
// This deliberately preserves assembler expressions as source text.  It is not
// an assembler, typed IR, or interpreter: wrapper expansion only substitutes
// declared macro parameters into another declared macro's emitted statements.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-macro-emissions.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-macro-emissions.ts --out-dir /tmp/battle-script-macros

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

type EmissionStatement = {
  line: number;
  kind: "emission";
  directive: ".byte" | ".2byte" | ".4byte";
  expressions: string[];
};
type WrapperInvocation = {
  line: number;
  kind: "wrapperInvocation";
  macro: string;
  arguments: string[];
};
type SourceStatement = EmissionStatement | WrapperInvocation;
type ParsedMacro = {
  name: string;
  declarationLine: number;
  parameterDeclarations: string[];
  sourceStatements: SourceStatement[];
};
type ExpandedEmission = EmissionStatement & {
  sourceMacro: string;
  expansionPath: string[];
  opcodeReferences: Array<{ expressionIndex: number; opcode: string; opcodeId: number }>;
};

function stripAssemblerComment(line: string): string {
  // No quoted strings currently occur here, but retain quoted @ safely if one
  // is added to the pinned source later.
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

function parseMacros(source: string): ParsedMacro[] {
  const macros: ParsedMacro[] = [];
  let current: ParsedMacro | undefined;
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
        parameterDeclarations: splitOperands(start[2]!.trim()),
        sourceStatements: [],
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
    const emission = /^(\.byte|\.2byte|\.4byte)\s+(.+)$/.exec(text);
    if (emission) {
      current.sourceStatements.push({
        line,
        kind: "emission",
        directive: emission[1]! as EmissionStatement["directive"],
        expressions: splitOperands(emission[2]!),
      });
      continue;
    }
    const invocation = /^([A-Za-z_][A-Za-z0-9_]*)\b(?:\s+(.*))?$/.exec(text);
    if (!invocation) throw new Error(`unsupported macro statement at asm/macros/battle_script.inc:${line}: ${text}`);
    current.sourceStatements.push({
      line,
      kind: "wrapperInvocation",
      macro: invocation[1]!,
      arguments: splitOperands(invocation[2] ?? ""),
    });
  }
  if (current) throw new Error(`unterminated macro ${current.name}`);
  return macros;
}

function parameterName(declaration: string): string {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)(?::req|=.+)?$/.exec(declaration);
  if (!match) throw new Error(`unsupported macro parameter declaration: ${declaration}`);
  return match[1]!;
}

function defaultExpression(declaration: string): string | undefined {
  const equals = declaration.indexOf("=");
  return equals < 0 ? undefined : declaration.slice(equals + 1);
}

function substituteParameters(expression: string, bindings: Map<string, string>): string {
  return expression.replace(/\\([A-Za-z_][A-Za-z0-9_]*)\b/g, (whole, name: string) => bindings.get(name) ?? whole);
}

const macros = parseMacros(readFileSync(join(REF, "asm", "macros", "battle_script.inc"), "utf8"));
const macrosByName = new Map(macros.map((macro) => [macro.name, macro]));
if (macrosByName.size !== macros.length) throw new Error("duplicate battle-script macro name");

const topology = JSON.parse(readFileSync(join(DATA_GEN, "battle-script-topology.json"), "utf8")) as {
  opcodes: Array<{ id: number; opcode: string }>;
};
const opcodeIds = new Map(topology.opcodes.map((opcode) => [opcode.opcode, opcode.id]));
if (opcodeIds.size !== topology.opcodes.length) throw new Error("duplicate topology opcode name");

function expandMacro(macro: ParsedMacro, bindings: Map<string, string>, expansionPath: string[], visiting: string[]): ExpandedEmission[] {
  if (visiting.includes(macro.name)) throw new Error(`recursive source macro ${[...visiting, macro.name].join(" -> ")}`);
  const nextVisiting = [...visiting, macro.name];
  const expanded: ExpandedEmission[] = [];
  for (const statement of macro.sourceStatements) {
    if (statement.kind === "emission") {
      const expressions = statement.expressions.map((expression) => substituteParameters(expression, bindings));
      const opcodeReferences = statement.directive === ".byte"
        ? expressions.flatMap((expression, expressionIndex) => {
          const opcodeId = opcodeIds.get(expression);
          return opcodeId === undefined ? [] : [{ expressionIndex, opcode: expression, opcodeId }];
        })
        : [];
      expanded.push({
        ...statement,
        expressions,
        sourceMacro: macro.name,
        expansionPath,
        opcodeReferences,
      });
      continue;
    }
    const target = macrosByName.get(statement.macro);
    if (!target) throw new Error(`macro ${macro.name} invokes undeclared wrapper ${statement.macro} at line ${statement.line}`);
    if (statement.arguments.length > target.parameterDeclarations.length) {
      throw new Error(`macro ${macro.name} passes too many arguments to ${target.name} at line ${statement.line}`);
    }
    const targetBindings = new Map<string, string>();
    for (const [index, declaration] of target.parameterDeclarations.entries()) {
      const parameter = parameterName(declaration);
      const argument = statement.arguments[index] === undefined
        ? defaultExpression(declaration)
        : substituteParameters(statement.arguments[index]!, bindings);
      if (argument === undefined) throw new Error(`macro ${macro.name} omits required ${target.name}.${parameter} at line ${statement.line}`);
      targetBindings.set(parameter, argument);
    }
    expanded.push(...expandMacro(target, targetBindings, [...expansionPath, target.name], nextVisiting));
  }
  return expanded;
}

const catalogMacros = macros.map((macro) => {
  const expandedEmissions = expandMacro(macro, new Map(), [macro.name], []);
  const directOpcodeReferences = expandedEmissions
    .filter((emission) => emission.sourceMacro === macro.name && emission.expansionPath.length === 1)
    .flatMap((emission) => emission.opcodeReferences.map((reference) => ({ ...reference, line: emission.line })));
  const opcodeReferences = expandedEmissions.flatMap((emission) => emission.opcodeReferences.map((reference) => ({
    ...reference,
    line: emission.line,
    sourceMacro: emission.sourceMacro,
    expansionPath: emission.expansionPath,
  })));
  return { ...macro, directOpcodeReferences, expandedEmissions, opcodeReferences };
});

const emittedOpcodeIds = new Set(catalogMacros.flatMap((macro) => macro.opcodeReferences.map((reference) => reference.opcodeId)));
if (emittedOpcodeIds.size !== topology.opcodes.length) {
  const missing = topology.opcodes.filter((opcode) => !emittedOpcodeIds.has(opcode.id)).map((opcode) => opcode.opcode);
  throw new Error(`macro emissions do not cover topology opcodes: ${missing.join(", ")}`);
}

const sourceStatements = catalogMacros.flatMap((macro) => macro.sourceStatements);
const expandedEmissions = catalogMacros.flatMap((macro) => macro.expandedEmissions);
const catalog = {
  schema: "battle-script-macro-emissions/v1",
  source: {
    files: ["asm/macros/battle_script.inc", "src/data/gen/battle-script-topology.json"],
    note: "Source-faithful macro declarations and emissions only. Expressions remain assembly text; wrapper expansion substitutes declared parameters mechanically and does not assign operand types or implement Battle Script behavior.",
  },
  counts: {
    macros: catalogMacros.length,
    sourceStatements: sourceStatements.length,
    directEmissionStatements: sourceStatements.filter((statement) => statement.kind === "emission").length,
    wrapperInvocations: sourceStatements.filter((statement) => statement.kind === "wrapperInvocation").length,
    expandedEmissionStatements: expandedEmissions.length,
    opcodeReferences: catalogMacros.reduce((total, macro) => total + macro.opcodeReferences.length, 0),
    topologyOpcodesCovered: emittedOpcodeIds.size,
  },
  macros: catalogMacros,
};

mkdirSync(DATA_GEN, { recursive: true });
const output = join(DATA_GEN, "battle-script-macro-emissions.json");
writeFileSync(output, `${JSON.stringify(catalog)}\n`);
console.log(`wrote ${output} (${catalog.counts.macros} macros, ${catalog.counts.expandedEmissionStatements} expanded emissions, ${catalog.counts.topologyOpcodesCovered} topology opcodes)`);
