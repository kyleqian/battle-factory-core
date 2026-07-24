import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import auditData from "../src/data/gen/battle-script-command-candidate-audit.json" with { type: "json" };
import commandHandlersData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactsData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import observationsData from "../src/data/gen/battle-script-opcode-observations.json" with { type: "json" };

type Start = { index: number; opcode: { id: number; name: string } };
type PointerReference = { operation: string; lineRaw: string };
type LexicalHandler = {
  slot: { index: number; opcode: string };
  symbol: string;
  source: { signatureLine: number };
  instructionPointerFacts: { references: PointerReference[] };
  lexicalAudit: { lineForms: Record<string, number>; unparsedNonblankStatementForms: Array<{ line: number }>; unsupportedLexicalCategories: unknown[] };
};
type AuditSlot = {
  slot: { index: number; opcode: string; handler: { symbol: string; definition: unknown } };
  handler: { symbol: string; source: unknown; rawLines: unknown[]; instructionPointerFacts: unknown; t1ReadInvocations: unknown[]; directlyCalledSymbolCandidates: unknown[]; contextIdentifierReferences: Record<string, unknown[]> };
  concreteOpcodeStarts: Start[];
  usedStartCount: number;
  zeroUseStatus: string | null;
  observedOperandWidthSequences: unknown[];
  representativeSourceInvocations: Array<{ instructionStartIndex: number }>;
  fixedWidthAdvanceClassification: { fixedWidthAdvanceCandidate: boolean; literalAdvance: { expression: string } | null; reasonsNotFixedWidthAdvance: string[] };
};

const audit = auditData as {
  source: { files: Array<{ file: string; sha256: string; schema: string }>; note: string };
  counts: Record<string, number>;
  losslessJoinAudit: { slotIndexesInCatalogOrder: number[]; concreteInstructionStartIndexesInCatalogOrder: number[]; concreteInstructionStartIndexesInSourceOrder: number[]; duplicateInstructionStartIndexes: number[]; missingInstructionStartIndexes: number[]; slotsWithoutLexicalFactsOrObservations: unknown[] };
  slots: AuditSlot[];
};
const commandHandlers = commandHandlersData as { schema: string; slots: Array<{ index: number; opcode: string; handler: { symbol: string; definition: unknown } }> };
const lexicalFacts = lexicalFactsData as { schema: string; handlers: LexicalHandler[] };
const observations = observationsData as {
  schema: string;
  counts: { topologySlots: number; concreteTypedOpcodeStarts: number; usedOpcodes: number; unusedOpcodes: number };
  opcodes: Array<{ slot: { id: number }; observedInstructionCount: number; zeroUseStatus: string | null; observedOperandWidthSequences: unknown[] }>;
  instructionStarts: Start[];
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("Battle Script command-family candidate audit", () => {
  it("regenerates byte-for-byte in an isolated directory with its catalog prerequisites", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-battle-script-command-candidate-audit-"));
    const run = (script: string) => execFileSync(process.execPath, ["--experimental-strip-types", script, "--out-dir", outputDirectory], { stdio: "pipe" });
    run("tools/extract/extract-moves.ts");
    run("tools/extract/extract-battle-script-topology.ts");
    run("tools/extract/extract-battle-script-command-handlers.ts");
    run("tools/extract/extract-battle-script-handler-lexical-facts.ts");
    run("tools/extract/extract-battle-script-macro-emissions.ts");
    run("tools/extract/extract-battle-script-graph.ts");
    run("tools/extract/extract-battle-script-program.ts");
    run("tools/extract/extract-battle-script-opcode-observations.ts");
    run("tools/extract/extract-battle-script-command-candidate-audit.ts");
    expect(readFileSync(join(outputDirectory, "battle-script-command-candidate-audit.json"), "utf8")).toBe(
      readFileSync("src/data/gen/battle-script-command-candidate-audit.json", "utf8"),
    );
  });

  it("losslessly joins every exact dispatch slot, lexical handler, and all 3,306 concrete starts", () => {
    expect(audit.counts).toMatchObject({ slots: 249, concreteTypedOpcodeStarts: 3306, usedSlots: 232, unusedSlots: 17, representativeInvocationLimitPerUsedSlot: 3 });
    expect(audit.slots).toHaveLength(249);
    expect(audit.slots.map((slot) => [slot.slot.index, slot.slot.opcode, slot.handler.symbol])).toEqual(
      commandHandlers.slots.map((slot) => [slot.index, slot.opcode, slot.handler.symbol]),
    );
    expect(audit.losslessJoinAudit.slotIndexesInCatalogOrder).toEqual(Array.from({ length: 249 }, (_, index) => index));
    expect(audit.losslessJoinAudit.concreteInstructionStartIndexesInCatalogOrder).toEqual(audit.slots.flatMap((slot) => slot.concreteOpcodeStarts.map((start) => start.index)));
    expect(audit.losslessJoinAudit.concreteInstructionStartIndexesInSourceOrder).toEqual(observations.instructionStarts.map((start) => start.index));
    expect(audit.losslessJoinAudit).toMatchObject({ duplicateInstructionStartIndexes: [], missingInstructionStartIndexes: [], slotsWithoutLexicalFactsOrObservations: [] });
    expect(audit.slots.flatMap((slot) => slot.concreteOpcodeStarts).sort((left, right) => left.index - right.index)).toEqual(observations.instructionStarts);
  });

  it("retains raw source evidence and exact observation facts for each command family", () => {
    const lexicalBySlot = new Map(lexicalFacts.handlers.map((handler) => [handler.slot.index, handler]));
    const observationBySlot = new Map(observations.opcodes.map((observation) => [observation.slot.id, observation]));
    for (const slot of audit.slots) {
      const lexical = lexicalBySlot.get(slot.slot.index)!;
      const observation = observationBySlot.get(slot.slot.index)!;
      expect(slot.handler.symbol).toBe(lexical.symbol);
      expect(slot.handler.source).toEqual((lexicalFactsData as { handlers: Array<{ source: unknown }> }).handlers[slot.slot.index]!.source);
      expect(slot.handler.instructionPointerFacts).toEqual((lexicalFactsData as { handlers: Array<{ instructionPointerFacts: unknown }> }).handlers[slot.slot.index]!.instructionPointerFacts);
      expect(slot.handler.t1ReadInvocations).toEqual((lexicalFactsData as { handlers: Array<{ t1ReadInvocations: unknown[] }> }).handlers[slot.slot.index]!.t1ReadInvocations);
      expect(slot.handler.directlyCalledSymbolCandidates).toEqual((lexicalFactsData as { handlers: Array<{ directlyCalledSymbolCandidates: unknown[] }> }).handlers[slot.slot.index]!.directlyCalledSymbolCandidates);
      expect(slot.usedStartCount).toBe(observation.observedInstructionCount);
      expect(slot.zeroUseStatus).toBe(observation.zeroUseStatus);
      expect(slot.observedOperandWidthSequences).toEqual(observation.observedOperandWidthSequences);
      expect(slot.representativeSourceInvocations.map((entry) => entry.instructionStartIndex)).toEqual(slot.concreteOpcodeStarts.slice(0, 3).map((start) => start.index));
    }
  });

  it("uses only the narrow lexical fixed-width proof rule and keeps its blockers explicit", () => {
    const literalLine = /^\s*gBattlescriptCurrInstr\s*\+=\s*(?:0[xX][0-9a-fA-F]+|\d+)\s*;\s*(?:\/\/.*)?$/;
    expect(audit.counts.fixedWidthAdvanceCandidates).toBe(22);
    const candidates = audit.slots.filter((slot) => slot.fixedWidthAdvanceClassification.fixedWidthAdvanceCandidate);
    expect(candidates.map((slot) => slot.slot.opcode)).toEqual([
      "B_SCR_OP_PRINTSELECTIONSTRING", "B_SCR_OP_MOVEVALUESCLEANUP", "B_SCR_OP_SETMULTIHIT", "B_SCR_OP_SETBYTE", "B_SCR_OP_ADDBYTE", "B_SCR_OP_SUBBYTE", "B_SCR_OP_ORBYTE", "B_SCR_OP_ORHALFWORD", "B_SCR_OP_ORWORD", "B_SCR_OP_BICBYTE", "B_SCR_OP_BICHALFWORD", "B_SCR_OP_BICWORD", "B_SCR_OP_TRAINERSLIDEIN", "B_SCR_OP_PLAYSE", "B_SCR_OP_FANFARE", "B_SCR_OP_PLAYFAINTCRY", "B_SCR_OP_ENDLINKBATTLE", "B_SCR_OP_RETURNTOBALL", "B_SCR_OP_HIDEPARTYSTATUSSUMMARY", "B_SCR_OP_REMOVEITEM", "B_SCR_OP_MAKEVISIBLE", "B_SCR_OP_TRAINERSLIDEOUT",
    ]);
    for (const slot of audit.slots) {
      const lexical = lexicalFacts.handlers[slot.slot.index]!;
      const writeLikes = lexical.instructionPointerFacts.references.filter((reference) => ["assignment", "compoundAssignment", "increment", "decrement"].includes(reference.operation));
      const soleWrite = writeLikes.length === 1 ? writeLikes[0]! : null;
      const nonSignatureUnparsed = lexical.lexicalAudit.unparsedNonblankStatementForms.filter((form) => form.line !== lexical.source.signatureLine);
      const shouldBeCandidate = writeLikes.length === 1
        && soleWrite !== null
        && soleWrite.operation === "compoundAssignment"
        && literalLine.test(soleWrite.lineRaw)
        && (lexical.lexicalAudit.lineForms.control ?? 0) === 0
        && (lexical.lexicalAudit.lineForms.preprocessor ?? 0) === 0
        && nonSignatureUnparsed.length === 0
        && lexical.lexicalAudit.unsupportedLexicalCategories.length === 0;
      expect(slot.fixedWidthAdvanceClassification.fixedWidthAdvanceCandidate).toBe(shouldBeCandidate);
      if (shouldBeCandidate) expect(slot.fixedWidthAdvanceClassification.reasonsNotFixedWidthAdvance).toEqual([]);
      else expect(slot.fixedWidthAdvanceClassification.reasonsNotFixedWidthAdvance.length).toBeGreaterThan(0);
    }
  });

  it("preserves the named controller-flag, message-state, and pause-counter lexical references when present", () => {
    const waitMessage = audit.slots.find((slot) => slot.slot.opcode === "B_SCR_OP_WAITMESSAGE")!;
    expect(waitMessage.handler.contextIdentifierReferences).toMatchObject({
      controllerFlags: expect.arrayContaining([expect.objectContaining({ token: "gBattleControllerExecFlags" })]),
      messageState: expect.arrayContaining([expect.objectContaining({ token: "gBattleCommunication" })]),
      pauseCounters: expect.arrayContaining([expect.objectContaining({ token: "gPauseCounterBattle" })]),
    });
    expect(audit.source.files).toEqual([
      { file: "src/data/gen/battle-script-command-handlers.json", sha256: sha256(readFileSync("src/data/gen/battle-script-command-handlers.json", "utf8")), schema: commandHandlers.schema },
      { file: "src/data/gen/battle-script-handler-lexical-facts.json", sha256: sha256(readFileSync("src/data/gen/battle-script-handler-lexical-facts.json", "utf8")), schema: lexicalFacts.schema },
      { file: "src/data/gen/battle-script-opcode-observations.json", sha256: sha256(readFileSync("src/data/gen/battle-script-opcode-observations.json", "utf8")), schema: observations.schema },
    ]);
    expect(audit.source.note).toContain("does not establish an operand width");
  });
});
