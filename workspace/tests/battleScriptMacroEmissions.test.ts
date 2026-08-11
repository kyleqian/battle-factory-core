import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import catalogData from "../src/data/gen/battle-script-macro-emissions.json" with { type: "json" };
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };

type Emission = {
  line: number;
  kind: "emission";
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
  sourceStatements: Array<
    | { line: number; kind: "emission"; directive: string; expressions: string[] }
    | { line: number; kind: "wrapperInvocation"; macro: string; arguments: string[] }
  >;
  directOpcodeReferences: Array<{ opcode: string; opcodeId: number; line: number }>;
  expandedEmissions: Emission[];
  opcodeReferences: Array<{ opcode: string; opcodeId: number; line: number; sourceMacro: string; expansionPath: string[] }>;
};

const catalog = catalogData as { counts: { macros: number; sourceStatements: number; directEmissionStatements: number; wrapperInvocations: number; expandedEmissionStatements: number; opcodeReferences: number; topologyOpcodesCovered: number }; macros: Macro[] };
const topology = topologyData as { opcodes: Array<{ id: number; opcode: string }> };

function macro(name: string): Macro {
  const found = catalog.macros.find((entry) => entry.name === name);
  if (!found) throw new Error(`missing macro ${name}`);
  return found;
}

describe("Battle Script macro emission extraction", () => {
  it("regenerates byte-for-byte with its topology prerequisite in an isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-battle-script-macro-emissions-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-moves.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-script-topology.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-script-macro-emissions.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    expect(readFileSync(join(outputDirectory, "battle-script-macro-emissions.json"), "utf8")).toBe(
      readFileSync("src/data/gen/battle-script-macro-emissions.json", "utf8"),
    );
  });

  it("covers every declared source macro and every source emission or wrapper statement", () => {
    const source = readFileSync("reference/pokeemerald/asm/macros/battle_script.inc", "utf8");
    const declarations = [...source.matchAll(/^\s*\.macro\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm)].map((match) => match[1]!);
    let inMacro = false;
    const sourceStatementLines: number[] = [];
    for (const [index, rawLine] of source.split("\n").entries()) {
      const text = rawLine.replace(/@.*$/, "").trim();
      if (/^\.macro\b/.test(text)) {
        inMacro = true;
        continue;
      }
      if (text === ".endm") {
        inMacro = false;
        continue;
      }
      if (inMacro && text) sourceStatementLines.push(index + 1);
    }
    expect(catalog.counts.macros).toBe(declarations.length);
    expect(catalog.macros.map((entry) => entry.name)).toEqual(declarations);
    expect(catalog.counts.sourceStatements).toBe(catalog.macros.reduce((total, entry) => total + entry.sourceStatements.length, 0));
    expect(catalog.macros.flatMap((entry) => entry.sourceStatements.map((statement) => statement.line))).toEqual(sourceStatementLines);
    expect(catalog.counts.directEmissionStatements + catalog.counts.wrapperInvocations).toBe(catalog.counts.sourceStatements);
    for (const entry of catalog.macros) {
      expect(entry.declarationLine).toBeGreaterThan(0);
      expect(entry.sourceStatements.length).toBeGreaterThan(0);
      for (const statement of entry.sourceStatements) expect(statement.line).toBeGreaterThan(entry.declarationLine);
    }
  });

  it("keeps direct emission distinct from wrapper expansion and joins every opcode to topology", () => {
    expect(macro("setword").directOpcodeReferences).toEqual([]);
    expect(macro("setword").sourceStatements).toEqual([
      { line: 1388, kind: "wrapperInvocation", macro: "setbyte", arguments: ["\\dst", "(\\value) & 0xFF"] },
      { line: 1389, kind: "wrapperInvocation", macro: "setbyte", arguments: ["\\dst + 1", "((\\value) >> 8) & 0xFF"] },
      { line: 1390, kind: "wrapperInvocation", macro: "setbyte", arguments: ["\\dst + 2", "((\\value) >> 16) & 0xFF"] },
      { line: 1391, kind: "wrapperInvocation", macro: "setbyte", arguments: ["\\dst + 3", "((\\value) >> 24) & 0xFF"] },
    ]);
    expect(macro("setword").opcodeReferences).toHaveLength(4);
    expect(macro("setword").opcodeReferences.every((reference) => reference.sourceMacro === "setbyte" && reference.expansionPath.join("/") === "setword/setbyte")).toBe(true);
    expect(catalog.counts.topologyOpcodesCovered).toBe(topology.opcodes.length);
    const opcodeIds = new Map(topology.opcodes.map((opcode) => [opcode.opcode, opcode.id]));
    for (const entry of catalog.macros) {
      for (const reference of entry.opcodeReferences) expect(reference.opcodeId).toBe(opcodeIds.get(reference.opcode));
    }
  });

  it("preserves ordered direct byte, 2byte, and 4byte expressions", () => {
    const accuracycheck = macro("accuracycheck");
    expect(accuracycheck.parameterDeclarations).toEqual(["failPtr:req", "move:req"]);
    expect(accuracycheck.sourceStatements).toEqual([
      { line: 7, kind: "emission", directive: ".byte", expressions: ["B_SCR_OP_ACCURACYCHECK"] },
      { line: 8, kind: "emission", directive: ".4byte", expressions: ["\\failPtr"] },
      { line: 9, kind: "emission", directive: ".2byte", expressions: ["\\move"] },
    ]);
    expect(accuracycheck.directOpcodeReferences).toEqual([{ expressionIndex: 0, opcode: "B_SCR_OP_ACCURACYCHECK", opcodeId: 1, line: 7 }]);
  });

  it("mechanically substitutes nested wrapper parameters without assigning operand semantics", () => {
    const setword = macro("setword");
    expect(setword.expandedEmissions.slice(0, 6)).toEqual([
      { line: 258, kind: "emission", directive: ".byte", expressions: ["B_SCR_OP_SETBYTE"], sourceMacro: "setbyte", expansionPath: ["setword", "setbyte"], opcodeReferences: [{ expressionIndex: 0, opcode: "B_SCR_OP_SETBYTE", opcodeId: 46 }] },
      { line: 259, kind: "emission", directive: ".4byte", expressions: ["\\dst"], sourceMacro: "setbyte", expansionPath: ["setword", "setbyte"], opcodeReferences: [] },
      { line: 260, kind: "emission", directive: ".byte", expressions: ["(\\value) & 0xFF"], sourceMacro: "setbyte", expansionPath: ["setword", "setbyte"], opcodeReferences: [] },
      { line: 258, kind: "emission", directive: ".byte", expressions: ["B_SCR_OP_SETBYTE"], sourceMacro: "setbyte", expansionPath: ["setword", "setbyte"], opcodeReferences: [{ expressionIndex: 0, opcode: "B_SCR_OP_SETBYTE", opcodeId: 46 }] },
      { line: 259, kind: "emission", directive: ".4byte", expressions: ["\\dst + 1"], sourceMacro: "setbyte", expansionPath: ["setword", "setbyte"], opcodeReferences: [] },
      { line: 260, kind: "emission", directive: ".byte", expressions: ["((\\value) >> 8) & 0xFF"], sourceMacro: "setbyte", expansionPath: ["setword", "setbyte"], opcodeReferences: [] },
    ]);
    const jumpifmove = macro("jumpifmove");
    expect(jumpifmove.expandedEmissions.map((emission) => [emission.directive, emission.expressions])).toEqual([
      [".byte", ["B_SCR_OP_JUMPIFHALFWORD"]],
      [".byte", ["CMP_EQUAL"]],
      [".4byte", ["gCurrentMove"]],
      [".2byte", ["\\move"]],
      [".4byte", ["\\jumpptr"]],
    ]);
  });
});
