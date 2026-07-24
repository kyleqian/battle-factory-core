// Dev-time, lossless join of the Battle Script command catalog, raw handler
// lexical facts, and concrete macro-expanded opcode starts.  The sole
// classification is intentionally narrower than a behavior classification:
// it reports only handlers whose preserved lexical evidence proves one
// unconditional `gBattlescriptCurrInstr += <numeric literal>;` and no other
// instruction-pointer write-like reference.  It does not infer operand
// schemas, aliases, runtime semantics, or safety.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-command-candidate-audit.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-command-candidate-audit.ts --out-dir /tmp/battle-script-command-candidate-audit
//
// Never imported at runtime - the production build only reads generated JSON.

import { createHash } from "node:crypto";
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

const COMMAND_HANDLERS_FILE = "battle-script-command-handlers.json";
const LEXICAL_FACTS_FILE = "battle-script-handler-lexical-facts.json";
const OBSERVATIONS_FILE = "battle-script-opcode-observations.json";

type PointerReference = {
  line: number;
  column: number;
  operation: "read" | "assignment" | "compoundAssignment" | "increment" | "decrement";
  accessExpression: string;
  lineRaw: string;
  statementRaw: string;
};
type IdentifierReference = { line: number; column: number; token: string; lexicalClasses: string[]; lineRaw: string };
type HandlerLexicalFacts = {
  slot: { index: number; opcode: string; tableRowIndex: number };
  symbol: string;
  source: Record<string, unknown> & { signatureLine: number };
  rawLines: Array<{ line: number; raw: string }>;
  instructionPointerFacts: {
    references: PointerReference[];
    reads: PointerReference[];
    writes: PointerReference[];
    advanceExpressions: PointerReference[];
  };
  t1ReadInvocations: unknown[];
  directlyCalledSymbolCandidates: unknown[];
  globalOrConstantLikeReferences: IdentifierReference[];
  lexicalAudit: {
    lineForms: Record<string, number>;
    unparsedNonblankStatementForms: Array<{ line: number }>;
    unsupportedLexicalCategories: unknown[];
  };
};
type CommandSlot = { index: number; opcode: string; enum: unknown; table: { rowIndex: number } | null; handler: { symbol: string; definition: unknown } | null };
type InstructionStart = {
  index: number;
  opcode: { id: number; name: string };
  sourceInvocation: unknown;
  opcodeEmission: unknown;
  operandWidths: number[];
  operandEmissions: unknown[];
};
type OpcodeObservation = {
  slot: { id: number; name: string };
  observedInstructionCount: number;
  zeroUseStatus: string | null;
  observedInstructionStartIndexes: number[];
  observedOperandWidthSequences: unknown[];
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function readJson<T>(file: string): { text: string; data: T } {
  const text = readFileSync(join(DATA_GEN, file), "utf8");
  return { text, data: JSON.parse(text) as T };
}

const commandHandlersInput = readJson<{ schema: string; slots: CommandSlot[] }>(COMMAND_HANDLERS_FILE);
const lexicalFactsInput = readJson<{ schema: string; handlers: HandlerLexicalFacts[] }>(LEXICAL_FACTS_FILE);
const observationsInput = readJson<{
  schema: string;
  counts: { topologySlots: number; concreteTypedOpcodeStarts: number; usedOpcodes: number; unusedOpcodes: number };
  opcodes: OpcodeObservation[];
  instructionStarts: InstructionStart[];
}>(OBSERVATIONS_FILE);

const commandHandlers = commandHandlersInput.data;
const lexicalFacts = lexicalFactsInput.data;
const observations = observationsInput.data;
const lexicalBySlot = new Map(lexicalFacts.handlers.map((handler) => [handler.slot.index, handler]));
const observationBySlot = new Map(observations.opcodes.map((observation) => [observation.slot.id, observation]));
const startsByOpcode = new Map<number, InstructionStart[]>();
for (const start of observations.instructionStarts) {
  startsByOpcode.set(start.opcode.id, [...(startsByOpcode.get(start.opcode.id) ?? []), start]);
}

if (commandHandlers.schema !== "battle-script-command-handlers/v1") throw new Error(`unexpected command handler schema ${commandHandlers.schema}`);
if (lexicalFacts.schema !== "battle-script-handler-lexical-facts/v1") throw new Error(`unexpected lexical facts schema ${lexicalFacts.schema}`);
if (observations.schema !== "battle-script-opcode-observations/v1") throw new Error(`unexpected opcode observations schema ${observations.schema}`);
if (commandHandlers.slots.length !== 249 || lexicalFacts.handlers.length !== 249 || observations.opcodes.length !== 249) {
  throw new Error("expected all three source catalogs to contain 249 command slots");
}
if (observations.instructionStarts.length !== 3306) throw new Error(`expected 3306 concrete typed opcode starts, found ${observations.instructionStarts.length}`);

const literalAdvanceLine = /^\s*gBattlescriptCurrInstr\s*\+=\s*((?:0[xX][0-9a-fA-F]+|\d+))\s*;\s*(?:\/\/.*)?$/;
const writeLikeOperations = new Set<PointerReference["operation"]>(["assignment", "compoundAssignment", "increment", "decrement"]);

function classifyFixedWidthAdvance(handler: HandlerLexicalFacts) {
  const writeLikeReferences = handler.instructionPointerFacts.references.filter((reference) => writeLikeOperations.has(reference.operation));
  const soleWrite = writeLikeReferences.length === 1 ? writeLikeReferences[0]! : null;
  const literalMatch = soleWrite?.operation === "compoundAssignment" ? literalAdvanceLine.exec(soleWrite.lineRaw) : null;
  const nonSignatureUnparsed = handler.lexicalAudit.unparsedNonblankStatementForms
    .filter((form) => form.line !== handler.source.signatureLine);
  const reasonsNotFixedWidthAdvance: string[] = [];
  if (writeLikeReferences.length !== 1) reasonsNotFixedWidthAdvance.push("instructionPointerWriteLikeReferenceCountIsNotOne");
  if (soleWrite === null || soleWrite.operation !== "compoundAssignment" || literalMatch === null) {
    reasonsNotFixedWidthAdvance.push("soleInstructionPointerWriteIsNotLiteralCompoundAdvance");
  }
  if ((handler.lexicalAudit.lineForms.control ?? 0) !== 0) reasonsNotFixedWidthAdvance.push("lexicalControlFormPreventsUnconditionalProof");
  if ((handler.lexicalAudit.lineForms.preprocessor ?? 0) !== 0) reasonsNotFixedWidthAdvance.push("preprocessorFormPreventsUnconditionalProof");
  if (nonSignatureUnparsed.length !== 0) reasonsNotFixedWidthAdvance.push("unparsedNonSignatureFormPreventsUnconditionalProof");
  if (handler.lexicalAudit.unsupportedLexicalCategories.length !== 0) reasonsNotFixedWidthAdvance.push("unsupportedLexicalCategoryPreventsProof");
  return {
    fixedWidthAdvanceCandidate: reasonsNotFixedWidthAdvance.length === 0,
    literalAdvance: literalMatch === null ? null : { expression: literalMatch[1]!, line: soleWrite!.line, lineRaw: soleWrite!.lineRaw, statementRaw: soleWrite!.statementRaw },
    reasonsNotFixedWidthAdvance,
    lexicalProofRule: "Candidate only when the preserved handler facts contain exactly one write-like gBattlescriptCurrInstr reference, that reference is a standalone gBattlescriptCurrInstr += numeric-literal source line, and no lexical control, preprocessor, unsupported, or non-signature unparsed form remains. This is lexical evidence only, not a runtime or safety conclusion.",
  };
}

const slots = commandHandlers.slots.map((commandSlot) => {
  const handler = lexicalBySlot.get(commandSlot.index);
  const observation = observationBySlot.get(commandSlot.index);
  if (!handler || !observation) throw new Error(`missing lexical facts or observations for command slot ${commandSlot.index}`);
  if (handler.slot.opcode !== commandSlot.opcode || observation.slot.name !== commandSlot.opcode) {
    throw new Error(`opcode join disagreement at slot ${commandSlot.index}`);
  }
  if (commandSlot.handler === null || commandSlot.table === null || handler.symbol !== commandSlot.handler.symbol) {
    throw new Error(`command handler provenance disagreement at slot ${commandSlot.index}`);
  }
  const concreteOpcodeStarts = startsByOpcode.get(commandSlot.index) ?? [];
  if (concreteOpcodeStarts.length !== observation.observedInstructionCount) {
    throw new Error(`instruction-start count disagrees at slot ${commandSlot.index}`);
  }
  if (!concreteOpcodeStarts.every((start, index) => start.index === observation.observedInstructionStartIndexes[index])) {
    throw new Error(`instruction-start indexes disagree at slot ${commandSlot.index}`);
  }
  const contextIdentifierReferences = {
    controllerFlags: handler.globalOrConstantLikeReferences.filter((reference) => reference.token === "gBattleControllerExecFlags"),
    messageState: handler.globalOrConstantLikeReferences.filter((reference) => reference.token === "gBattleCommunication"),
    pauseCounters: handler.globalOrConstantLikeReferences.filter((reference) => reference.token === "gPauseCounterBattle"),
  };
  return {
    slot: commandSlot,
    handler: {
      symbol: handler.symbol,
      source: handler.source,
      rawLines: handler.rawLines,
      instructionPointerFacts: handler.instructionPointerFacts,
      t1ReadInvocations: handler.t1ReadInvocations,
      directlyCalledSymbolCandidates: handler.directlyCalledSymbolCandidates,
      contextIdentifierReferences,
      lexicalAudit: handler.lexicalAudit,
    },
    concreteOpcodeStarts,
    usedStartCount: observation.observedInstructionCount,
    zeroUseStatus: observation.zeroUseStatus,
    observedOperandWidthSequences: observation.observedOperandWidthSequences,
    representativeSourceInvocations: concreteOpcodeStarts.slice(0, 3).map((start) => ({
      instructionStartIndex: start.index,
      sourceInvocation: start.sourceInvocation,
      opcodeEmission: start.opcodeEmission,
      operandWidths: start.operandWidths,
      operandEmissions: start.operandEmissions,
    })),
    fixedWidthAdvanceClassification: classifyFixedWidthAdvance(handler),
  };
});

const flattenedStartIndexes = slots.flatMap((slot) => slot.concreteOpcodeStarts.map((start) => start.index));
const fixedWidthAdvanceCandidates = slots.filter((slot) => slot.fixedWidthAdvanceClassification.fixedWidthAdvanceCandidate);
const usedSlots = slots.filter((slot) => slot.usedStartCount > 0);
const unusedSlots = slots.filter((slot) => slot.usedStartCount === 0);
if (new Set(slots.map((slot) => slot.slot.index)).size !== slots.length) throw new Error("duplicate command slot in audit");
if (new Set(flattenedStartIndexes).size !== flattenedStartIndexes.length || flattenedStartIndexes.length !== observations.instructionStarts.length) {
  throw new Error("concrete opcode starts are not losslessly and uniquely joined");
}
if (fixedWidthAdvanceCandidates.some((slot) => slot.fixedWidthAdvanceClassification.reasonsNotFixedWidthAdvance.length !== 0)) {
  throw new Error("fixed-width candidate retained a blocking reason");
}

const audit = {
  schema: "battle-script-command-candidate-audit/v1",
  source: {
    files: [
      { file: `src/data/gen/${COMMAND_HANDLERS_FILE}`, sha256: sha256(commandHandlersInput.text), schema: commandHandlers.schema },
      { file: `src/data/gen/${LEXICAL_FACTS_FILE}`, sha256: sha256(lexicalFactsInput.text), schema: lexicalFacts.schema },
      { file: `src/data/gen/${OBSERVATIONS_FILE}`, sha256: sha256(observationsInput.text), schema: observations.schema },
    ],
    note: "Lossless source-catalog join. Concrete opcode starts, raw handler lines, lexical pointer facts, identifier references, and call candidates are retained as source evidence. A fixed-width-advance candidate is an intentionally narrow lexical classification only; it does not establish an operand width, alias relationship, runtime behavior, or implementation safety.",
  },
  counts: {
    slots: slots.length,
    concreteTypedOpcodeStarts: flattenedStartIndexes.length,
    usedSlots: usedSlots.length,
    unusedSlots: unusedSlots.length,
    fixedWidthAdvanceCandidates: fixedWidthAdvanceCandidates.length,
    representativeInvocationLimitPerUsedSlot: 3,
  },
  losslessJoinAudit: {
    slotIndexesInCatalogOrder: slots.map((slot) => slot.slot.index),
    concreteInstructionStartIndexesInCatalogOrder: flattenedStartIndexes,
    concreteInstructionStartIndexesInSourceOrder: [...flattenedStartIndexes].sort((left, right) => left - right),
    duplicateInstructionStartIndexes: flattenedStartIndexes.filter((index, position) => flattenedStartIndexes.indexOf(index) !== position),
    missingInstructionStartIndexes: observations.instructionStarts.map((start) => start.index).filter((index) => !flattenedStartIndexes.includes(index)),
    slotsWithoutLexicalFactsOrObservations: [],
  },
  slots,
};

mkdirSync(DATA_GEN, { recursive: true });
const output = join(DATA_GEN, "battle-script-command-candidate-audit.json");
writeFileSync(output, `${JSON.stringify(audit)}\n`);
console.log(`wrote ${output} (${audit.counts.slots} slots, ${audit.counts.concreteTypedOpcodeStarts} concrete starts, ${audit.counts.fixedWidthAdvanceCandidates} lexical fixed-width candidates)`);
