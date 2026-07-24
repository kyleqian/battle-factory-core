// Dev-time observation catalog joining each Battle Script dispatch slot to the
// concrete opcode starts emitted by the pinned battle-script source. This is
// deliberately evidence only: operand widths are observed from the source
// directives after macro expansion, not inferred as a canonical opcode schema.
// Expressions, invocation operands, and wrapper provenance remain source text.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-opcode-observations.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-opcode-observations.ts --out-dir /tmp/battle-script-opcode-observations

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

type Opcode = { id: number; opcode: string; dispatcher: string };
type CommandSlot = {
  index: number;
  opcode: string;
  enum: { file: string; line: number; raw: string };
  table: { file: string; rowIndex: number; line: number; raw: string; designatorExpression: string; handlerExpression: string } | null;
  handler: {
    symbol: string;
    definition: { symbol: string; file: string; startLine: number; openingBraceLine: number; endLine: number; signatureLine: number; signatureRaw: string } | null;
  } | null;
};
type OpcodeReference = { expressionIndex: number; opcode: string; opcodeId: number };
type MacroEmission = { macro: string; line: number; wrapperPath: string[] };
type EmittedStatement = {
  directive: ".byte" | ".2byte" | ".4byte";
  expressions: string[];
  opcodeReferences: OpcodeReference[];
  macroEmission: MacroEmission;
};
type ProgramStatement = {
  source: { label: string; labelLine: number; line: number };
  mnemonic: string;
  actualOperands: string[];
  macro: { declarationLine: number; parameterBindings: Array<{ parameter: string; declaration: string; expression: string; supplied: boolean }> };
  emittedStatements: EmittedStatement[];
};

const topology = JSON.parse(readFileSync(join(DATA_GEN, "battle-script-topology.json"), "utf8")) as { opcodes: Opcode[] };
const commandHandlers = JSON.parse(readFileSync(join(DATA_GEN, "battle-script-command-handlers.json"), "utf8")) as { slots: CommandSlot[] };
const program = JSON.parse(readFileSync(join(DATA_GEN, "battle-script-program.json"), "utf8")) as {
  counts: { opcodeReferences: number; topologyOpcodes: number; topologyOpcodesCovered: number; topologyOpcodesUnreferenced: number };
  blocks: Array<{ statements: ProgramStatement[] }>;
  topologyOpcodeCoverage: Array<{ id: number; opcode: string; invocationCount: number }>;
};

function directiveWidth(directive: EmittedStatement["directive"]): number {
  switch (directive) {
    case ".byte": return 1;
    case ".2byte": return 2;
    case ".4byte": return 4;
  }
}

const topologyById = new Map(topology.opcodes.map((opcode) => [opcode.id, opcode]));
const commandSlotByIndex = new Map(commandHandlers.slots.map((slot) => [slot.index, slot]));
if (topologyById.size !== topology.opcodes.length) throw new Error("duplicate topology opcode id");
if (commandSlotByIndex.size !== commandHandlers.slots.length) throw new Error("duplicate command-handler slot index");
if (topology.opcodes.length !== commandHandlers.slots.length) {
  throw new Error(`topology has ${topology.opcodes.length} opcodes but command handler catalog has ${commandHandlers.slots.length} slots`);
}
if (program.counts.topologyOpcodes !== topology.opcodes.length) {
  throw new Error(`program covers ${program.counts.topologyOpcodes} topology opcodes, expected ${topology.opcodes.length}`);
}

type InstructionStart = {
  index: number;
  opcode: { id: number; name: string };
  sourceInvocation: {
    label: string;
    labelLine: number;
    line: number;
    mnemonic: string;
    actualOperands: string[];
    macro: ProgramStatement["macro"];
  };
  opcodeEmission: { directive: ".byte"; expressions: string[]; macroEmission: MacroEmission };
  operandWidths: number[];
  operandEmissions: Array<{ directive: EmittedStatement["directive"]; width: number; expressions: string[]; macroEmission: MacroEmission }>;
};

const instructionStarts: InstructionStart[] = [];
let active: InstructionStart | undefined;
for (const statement of program.blocks.flatMap((block) => block.statements)) {
  for (const emitted of statement.emittedStatements) {
    if (emitted.opcodeReferences.length > 1) {
      throw new Error(`${statement.source.label}:${statement.source.line} has multiple opcode references in one emission`);
    }
    const reference = emitted.opcodeReferences[0];
    if (reference) {
      if (emitted.directive !== ".byte" || emitted.expressions.length !== 1 || reference.expressionIndex !== 0) {
        throw new Error(`${statement.source.label}:${statement.source.line} has an unsupported opcode-start emission`);
      }
      const opcode = topologyById.get(reference.opcodeId);
      if (!opcode || opcode.opcode !== reference.opcode) throw new Error(`unmapped opcode reference ${reference.opcode} (${reference.opcodeId})`);
      active = {
        index: instructionStarts.length,
        opcode: { id: opcode.id, name: opcode.opcode },
        sourceInvocation: {
          ...statement.source,
          mnemonic: statement.mnemonic,
          actualOperands: statement.actualOperands,
          macro: statement.macro,
        },
        opcodeEmission: { directive: emitted.directive, expressions: emitted.expressions, macroEmission: emitted.macroEmission },
        operandWidths: [],
        operandEmissions: [],
      };
      instructionStarts.push(active);
    } else {
      if (!active) throw new Error(`${statement.source.label}:${statement.source.line} emits operands before an opcode start`);
      const width = directiveWidth(emitted.directive);
      for (const _expression of emitted.expressions) active.operandWidths.push(width);
      active.operandEmissions.push({ directive: emitted.directive, width, expressions: emitted.expressions, macroEmission: emitted.macroEmission });
    }
  }
}

if (instructionStarts.length !== program.counts.opcodeReferences) {
  throw new Error(`observed ${instructionStarts.length} opcode starts, expected ${program.counts.opcodeReferences}`);
}

const startsByOpcodeId = new Map<number, InstructionStart[]>();
for (const start of instructionStarts) startsByOpcodeId.set(start.opcode.id, [...(startsByOpcodeId.get(start.opcode.id) ?? []), start]);

const opcodes = topology.opcodes.map((opcode) => {
  const slot = commandSlotByIndex.get(opcode.id);
  if (!slot || slot.opcode !== opcode.opcode) throw new Error(`missing or mismatched command-handler slot ${opcode.id}:${opcode.opcode}`);
  if (slot.table === null || slot.handler === null || slot.handler.definition === null) {
    throw new Error(`command-handler slot ${opcode.id}:${opcode.opcode} lacks handler provenance`);
  }
  if (slot.handler.symbol !== opcode.dispatcher || slot.table.handlerExpression !== opcode.dispatcher) {
    throw new Error(`handler mismatch for ${opcode.opcode}: topology ${opcode.dispatcher}, table ${slot.table.handlerExpression}`);
  }
  const starts = startsByOpcodeId.get(opcode.id) ?? [];
  const sequences = new Map<string, { operandWidths: number[]; occurrenceCount: number; instructionStartIndexes: number[] }>();
  for (const start of starts) {
    const key = JSON.stringify(start.operandWidths);
    const sequence = sequences.get(key) ?? { operandWidths: start.operandWidths, occurrenceCount: 0, instructionStartIndexes: [] };
    sequence.occurrenceCount += 1;
    sequence.instructionStartIndexes.push(start.index);
    sequences.set(key, sequence);
  }
  return {
    slot: {
      id: opcode.id,
      name: opcode.opcode,
      enum: slot.enum,
      table: slot.table,
      handler: slot.handler,
    },
    observedInstructionCount: starts.length,
    zeroUseStatus: starts.length === 0 ? "noConcreteTypedOpcodeStartsObserved" : null,
    observedInstructionStartIndexes: starts.map((start) => start.index),
    observedOperandWidthSequences: [...sequences.values()],
  };
});

const usedOpcodes = opcodes.filter((opcode) => opcode.observedInstructionCount > 0);
const unusedOpcodes = opcodes.filter((opcode) => opcode.observedInstructionCount === 0);
const coverageById = new Map(program.topologyOpcodeCoverage.map((coverage) => [coverage.id, coverage]));
if (coverageById.size !== topology.opcodes.length) throw new Error("program opcode coverage does not include every topology slot");
for (const opcode of opcodes) {
  const coverage = coverageById.get(opcode.slot.id)!;
  if (coverage.opcode !== opcode.slot.name || coverage.invocationCount !== opcode.observedInstructionCount) {
    throw new Error(`program coverage disagrees for ${opcode.slot.name}`);
  }
}
if (usedOpcodes.length !== program.counts.topologyOpcodesCovered || unusedOpcodes.length !== program.counts.topologyOpcodesUnreferenced) {
  throw new Error(`observed ${usedOpcodes.length} used and ${unusedOpcodes.length} unused opcodes, expected ${program.counts.topologyOpcodesCovered}/${program.counts.topologyOpcodesUnreferenced}`);
}

const catalog = {
  schema: "battle-script-opcode-observations/v1",
  source: {
    files: [
      "src/data/gen/battle-script-topology.json",
      "src/data/gen/battle-script-command-handlers.json",
      "src/data/gen/battle-script-program.json",
    ],
    note: "Observation catalog only. Each instruction start is a concrete macro-expanded source emission linked to its topology/table handler slot. Operand widths are ordered observed directive widths, expressions and invocation/wrapper provenance remain source text, and zero uses mean only that no concrete start was observed in this source program; no canonical schema, semantics, control category, side effect, or support status is inferred.",
  },
  counts: {
    topologySlots: opcodes.length,
    concreteTypedOpcodeStarts: instructionStarts.length,
    usedOpcodes: usedOpcodes.length,
    unusedOpcodes: unusedOpcodes.length,
  },
  opcodes,
  instructionStarts,
};

mkdirSync(DATA_GEN, { recursive: true });
const output = join(DATA_GEN, "battle-script-opcode-observations.json");
writeFileSync(output, `${JSON.stringify(catalog)}\n`);
console.log(`wrote ${output} (${catalog.counts.topologySlots} slots, ${catalog.counts.concreteTypedOpcodeStarts} concrete starts, ${catalog.counts.usedOpcodes} used)`);
