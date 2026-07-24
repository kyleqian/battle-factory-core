import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import factsData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import commandHandlersData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };

type Handler = {
  slot: { index: number; opcode: string; tableRowIndex: number };
  symbol: string;
  source: { file: string; fileSha256: string; startLine: number; openingBraceLine: number; endLine: number; signatureLine: number; signatureRaw: string; definitionTextSha256: string };
  rawLines: Array<{ line: number; raw: string }>;
  instructionPointerFacts: {
    references: Array<{ line: number; operation: string; accessExpression: string; lineRaw: string; statementRaw: string }>;
    reads: Array<{ operation: string; accessExpression: string; lineRaw: string; statementRaw: string }>;
    writes: Array<{ operation: string; accessExpression: string; lineRaw: string; statementRaw: string }>;
    advanceExpressions: Array<{ operation: string; statementRaw: string }>;
  };
  t1ReadInvocations: Array<{ symbol: string; rawArguments: string }>;
  directlyCalledSymbolCandidates: Array<{ symbol: string; rawArguments: string }>;
  globalOrConstantLikeReferences: Array<{ token: string; lexicalClasses: string[] }>;
  lexicalAudit: { lineForms: Record<string, number>; unparsedNonblankStatementForms: unknown[]; unsupportedLexicalCategories: unknown[] };
};

const facts = factsData as {
  source: { commandHandlers: { sha256: string; schema: string }; commandSource: { file: string; sha256: string } };
  counts: Record<string, number>;
  coverageAudit: { handlerSymbolsInCatalogOrder: string[]; duplicateHandlerSymbols: string[]; slotsWithoutHandlerFacts: unknown[]; handlerFactsWithoutCatalogSlot: unknown[] };
  handlers: Handler[];
};
const commandHandlers = commandHandlersData as { schema: string; slots: Array<{ index: number; opcode: string; table: { rowIndex: number }; handler: { symbol: string; definition: { startLine: number } } }> };

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("Battle Script raw command-handler lexical facts", () => {
  it("regenerates byte-for-byte in an isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-battle-script-handler-lexical-facts-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-script-handler-lexical-facts.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    expect(readFileSync(join(outputDirectory, "battle-script-handler-lexical-facts.json"), "utf8")).toBe(
      readFileSync("src/data/gen/battle-script-handler-lexical-facts.json", "utf8"),
    );
  });

  it("covers every unique 249-slot table handler in command-catalog order", () => {
    expect(facts.counts.tableHandlers).toBe(249);
    expect(facts.handlers).toHaveLength(249);
    expect(facts.handlers.map((handler) => [handler.slot.index, handler.slot.opcode, handler.symbol])).toEqual(
      commandHandlers.slots.map((slot) => [slot.index, slot.opcode, slot.handler.symbol]),
    );
    expect(facts.coverageAudit).toMatchObject({ duplicateHandlerSymbols: [], slotsWithoutHandlerFacts: [], handlerFactsWithoutCatalogSlot: [] });
    expect(new Set(facts.coverageAudit.handlerSymbolsInCatalogOrder).size).toBe(249);
  });

  it("keeps exact per-line C evidence and source hash linkage without interpreting C", () => {
    const source = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const lines = source.split("\n");
    expect(facts.source.commandHandlers.schema).toBe(commandHandlers.schema);
    expect(facts.source.commandSource).toEqual({ file: "src/battle_script_commands.c", sha256: sha256(source) });
    for (const handler of facts.handlers) {
      expect(handler.source.fileSha256).toBe(sha256(source));
      expect(handler.rawLines.map((entry) => entry.line)).toEqual(
        Array.from({ length: handler.source.endLine - handler.source.startLine + 1 }, (_, index) => handler.source.startLine + index),
      );
      expect(handler.rawLines.map((entry) => entry.raw)).toEqual(lines.slice(handler.source.startLine - 1, handler.source.endLine));
      expect(handler.source.definitionTextSha256).toBe(sha256(handler.rawLines.map((entry) => entry.raw).join("\n")));
      expect(handler.rawLines[0]!.raw.trim()).toBe(handler.source.signatureRaw);
      expect(handler.rawLines.find((entry) => entry.line === handler.source.openingBraceLine)?.raw).toBe("{");
      expect(handler.rawLines.at(-1)?.raw).toBe("}");
    }
  });

  it("records pointer, T1_READ, call-candidate, and spelling-class facts with source expressions", () => {
    const accuracy = facts.handlers.find((handler) => handler.symbol === "Cmd_accuracycheck")!;
    expect(accuracy.instructionPointerFacts.reads.some((fact) => fact.accessExpression === "gBattlescriptCurrInstr" && fact.lineRaw.includes("T2_READ_16"))).toBe(true);
    expect(accuracy.instructionPointerFacts.writes.some((fact) => fact.operation === "assignment" && fact.statementRaw.includes("T1_READ_PTR(gBattlescriptCurrInstr + 1)"))).toBe(true);
    expect(accuracy.instructionPointerFacts.advanceExpressions.some((fact) => fact.operation === "compoundAssignment" && fact.statementRaw.includes("+= 7"))).toBe(true);
    expect(accuracy.t1ReadInvocations.some((call) => call.symbol === "T1_READ_PTR" && call.rawArguments === "gBattlescriptCurrInstr + 1")).toBe(true);
    expect(accuracy.directlyCalledSymbolCandidates.some((call) => call.symbol === "T2_READ_16" && call.rawArguments === "gBattlescriptCurrInstr + 5")).toBe(true);
    expect(accuracy.globalOrConstantLikeReferences.some((reference) => reference.token === "gBattlescriptCurrInstr" && reference.lexicalClasses.includes("gPrefix"))).toBe(true);
    expect(accuracy.globalOrConstantLikeReferences.some((reference) => reference.token === "NO_ACC_CALC" && reference.lexicalClasses.includes("uppercaseConstantLike"))).toBe(true);
  });

  it("keeps unparsed nonblank forms and unsupported lexical categories as explicit audit fields", () => {
    for (const handler of facts.handlers) {
      expect(handler.lexicalAudit.lineForms.unparsed).toBe(handler.lexicalAudit.unparsedNonblankStatementForms.length);
      expect(Array.isArray(handler.lexicalAudit.unsupportedLexicalCategories)).toBe(true);
    }
    expect(facts.counts.unparsedNonblankStatementForms).toBe(
      facts.handlers.reduce((total, handler) => total + handler.lexicalAudit.unparsedNonblankStatementForms.length, 0),
    );
  });
});
