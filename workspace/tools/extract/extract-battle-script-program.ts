// Dev-time lexical join of concrete Battle Script invocations to their source
// macro emissions. This is deliberately not an assembler, typed IR, or
// interpreter: expressions and labels remain source text, and no addresses or
// constants are evaluated.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-program.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-program.ts --out-dir /tmp/battle-script-program

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const DATA_GEN = outDirArg === undefined
  ? join(RUN_ROOT, "src", "data", "gen")
  : isAbsolute(outDirArg) ? outDirArg : join(RUN_ROOT, outDirArg);

type GraphStatement = {
  line: number;
  kind: "instruction" | "directive";
  mnemonic: string;
  operandTokens: string[];
};
type GraphLabel = { name: string; line: number; statements: GraphStatement[] };
type MacroEmission = {
  line: number;
  directive: ".byte" | ".2byte" | ".4byte";
  expressions: string[];
  sourceMacro: string;
  expansionPath: string[];
  opcodeReferences: Array<{ expressionIndex: number; opcode: string; opcodeId: number }>;
};
type Macro = {
  name: string;
  declarationLine: number;
  parameterDeclarations: string[];
  expandedEmissions: MacroEmission[];
};

const graph = JSON.parse(readFileSync(join(DATA_GEN, "battle-script-graph.json"), "utf8")) as {
  counts: { labels: number; executableInstructions: number };
  labels: GraphLabel[];
};
const emissionCatalog = JSON.parse(readFileSync(join(DATA_GEN, "battle-script-macro-emissions.json"), "utf8")) as {
  macros: Macro[];
};
const topology = JSON.parse(readFileSync(join(DATA_GEN, "battle-script-topology.json"), "utf8")) as {
  opcodes: Array<{ id: number; opcode: string }>;
};

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

const macros = new Map(emissionCatalog.macros.map((macro) => [macro.name, macro]));
if (macros.size !== emissionCatalog.macros.length) throw new Error("duplicate macro emission entry");
const opcodeIds = new Map(topology.opcodes.map((opcode) => [opcode.opcode, opcode.id]));
if (opcodeIds.size !== topology.opcodes.length) throw new Error("duplicate topology opcode entry");

function joinStatement(label: GraphLabel, statement: GraphStatement) {
  const macro = macros.get(statement.mnemonic);
  if (!macro) throw new Error(`instruction ${statement.mnemonic} at ${label.name}:${statement.line} has no macro emissions`);
  if (statement.operandTokens.length > macro.parameterDeclarations.length) {
    throw new Error(`${label.name}:${statement.line} passes too many arguments to ${macro.name}`);
  }
  const bindings = new Map<string, string>();
  const parameterBindings = macro.parameterDeclarations.map((declaration, index) => {
    const parameter = parameterName(declaration);
    const supplied = statement.operandTokens[index];
    const expression = supplied ?? defaultExpression(declaration);
    if (expression === undefined) throw new Error(`${label.name}:${statement.line} omits required ${macro.name}.${parameter}`);
    bindings.set(parameter, expression);
    return { parameter, declaration, expression, supplied: supplied !== undefined };
  });
  const emittedStatements = macro.expandedEmissions.map((emission) => {
    const expressions = emission.expressions.map((expression) => substituteParameters(expression, bindings));
    for (const expression of expressions) {
      const unresolved = /\\([A-Za-z_][A-Za-z0-9_]*)\b/.exec(expression);
      if (unresolved) throw new Error(`${label.name}:${statement.line} leaves unresolved ${macro.name}.${unresolved[1]} in ${expression}`);
    }
    for (const reference of emission.opcodeReferences) {
      if (expressions[reference.expressionIndex] !== reference.opcode || opcodeIds.get(reference.opcode) !== reference.opcodeId) {
        throw new Error(`${label.name}:${statement.line} corrupts opcode reference ${reference.opcode}`);
      }
    }
    return {
      directive: emission.directive,
      expressions,
      opcodeReferences: emission.opcodeReferences,
      macroEmission: {
        macro: emission.sourceMacro,
        line: emission.line,
        wrapperPath: emission.expansionPath,
      },
    };
  });
  return {
    source: { label: label.name, labelLine: label.line, line: statement.line },
    mnemonic: statement.mnemonic,
    actualOperands: statement.operandTokens,
    macro: { declarationLine: macro.declarationLine, parameterBindings },
    emittedStatements,
  };
}

const blocks = graph.labels.map((label) => ({
  label: label.name,
  line: label.line,
  statements: label.statements
    .filter((statement) => statement.kind === "instruction")
    .map((statement) => joinStatement(label, statement)),
}));
const joinedStatements = blocks.flatMap((block) => block.statements);
const emittedStatements = joinedStatements.flatMap((statement) => statement.emittedStatements);
const emittedOpcodeIds = new Set(emittedStatements.flatMap((statement) => statement.opcodeReferences.map((reference) => reference.opcodeId)));
if (blocks.length !== graph.counts.labels) throw new Error(`expected ${graph.counts.labels} label blocks, found ${blocks.length}`);
if (joinedStatements.length !== graph.counts.executableInstructions) {
  throw new Error(`expected ${graph.counts.executableInstructions} executable statements, found ${joinedStatements.length}`);
}
const opcodeReferenceCounts = new Map<number, number>();
for (const emitted of emittedStatements) {
  for (const reference of emitted.opcodeReferences) {
    opcodeReferenceCounts.set(reference.opcodeId, (opcodeReferenceCounts.get(reference.opcodeId) ?? 0) + 1);
  }
}
const topologyOpcodeCoverage = topology.opcodes.map((opcode) => ({
  id: opcode.id,
  opcode: opcode.opcode,
  invocationCount: opcodeReferenceCounts.get(opcode.id) ?? 0,
}));

const program = {
  schema: "battle-script-program/v1",
  source: {
    files: [
      "data/battle_scripts_1.s",
      "src/data/gen/battle-script-graph.json",
      "src/data/gen/battle-script-macro-emissions.json",
      "src/data/gen/battle-script-topology.json",
    ],
    note: "Lexical assembled-program catalog only. Concrete macro operands are substituted into ordered source emissions, while expressions and labels remain source text; no addresses, constants, operand types, control flow, or battle behavior are evaluated or inferred.",
  },
  counts: {
    labelBlocks: blocks.length,
    executableStatements: joinedStatements.length,
    emittedStatements: emittedStatements.length,
    opcodeReferences: emittedStatements.reduce((total, statement) => total + statement.opcodeReferences.length, 0),
    topologyOpcodes: topology.opcodes.length,
    topologyOpcodesCovered: emittedOpcodeIds.size,
    topologyOpcodesUnreferenced: topology.opcodes.length - emittedOpcodeIds.size,
  },
  blocks,
  topologyOpcodeCoverage,
};

mkdirSync(DATA_GEN, { recursive: true });
const output = join(DATA_GEN, "battle-script-program.json");
writeFileSync(output, `${JSON.stringify(program)}\n`);
console.log(`wrote ${output} (${program.counts.labelBlocks} labels, ${program.counts.executableStatements} statements, ${program.counts.emittedStatements} emissions)`);
