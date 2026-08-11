import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import commandHandlersData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import observationsData from "../src/data/gen/battle-script-opcode-observations.json" with { type: "json" };
import programData from "../src/data/gen/battle-script-program.json" with { type: "json" };
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };

type MacroEmission = { macro: string; line: number; wrapperPath: string[] };
type Emission = {
  directive: ".byte" | ".2byte" | ".4byte";
  expressions: string[];
  opcodeReferences: Array<{ expressionIndex: number; opcode: string; opcodeId: number }>;
  macroEmission: MacroEmission;
};
type Statement = {
  source: { label: string; labelLine: number; line: number };
  mnemonic: string;
  actualOperands: string[];
  macro: { declarationLine: number; parameterBindings: Array<{ parameter: string; declaration: string; expression: string; supplied: boolean }> };
  emittedStatements: Emission[];
};
type Start = {
  index: number;
  opcode: { id: number; name: string };
  sourceInvocation: Statement["source"] & Pick<Statement, "mnemonic" | "actualOperands" | "macro">;
  opcodeEmission: { directive: ".byte"; expressions: string[]; macroEmission: MacroEmission };
  operandWidths: number[];
  operandEmissions: Array<{ directive: Emission["directive"]; width: number; expressions: string[]; macroEmission: MacroEmission }>;
};
type ObservationOpcode = {
  slot: {
    id: number;
    name: string;
    enum: { file: string; line: number; raw: string };
    table: { file: string; rowIndex: number; line: number; raw: string; designatorExpression: string; handlerExpression: string };
    handler: { symbol: string; definition: { symbol: string; file: string; startLine: number; openingBraceLine: number; endLine: number; signatureLine: number; signatureRaw: string } };
  };
  observedInstructionCount: number;
  zeroUseStatus: "noConcreteTypedOpcodeStartsObserved" | null;
  observedInstructionStartIndexes: number[];
  observedOperandWidthSequences: Array<{ operandWidths: number[]; occurrenceCount: number; instructionStartIndexes: number[] }>;
};

const topology = topologyData as { opcodes: Array<{ id: number; opcode: string; dispatcher: string }> };
const commandHandlers = commandHandlersData as { slots: Array<{ index: number; opcode: string; enum: ObservationOpcode["slot"]["enum"]; table: ObservationOpcode["slot"]["table"] | null; handler: ObservationOpcode["slot"]["handler"] | null }> };
const program = programData as {
  counts: { opcodeReferences: number; topologyOpcodes: number; topologyOpcodesCovered: number; topologyOpcodesUnreferenced: number };
  blocks: Array<{ statements: Statement[] }>;
  topologyOpcodeCoverage: Array<{ id: number; opcode: string; invocationCount: number }>;
};
const catalog = observationsData as {
  source: { note: string };
  counts: { topologySlots: number; concreteTypedOpcodeStarts: number; usedOpcodes: number; unusedOpcodes: number };
  opcodes: ObservationOpcode[];
  instructionStarts: Start[];
};

function width(directive: Emission["directive"]): number {
  return directive === ".byte" ? 1 : directive === ".2byte" ? 2 : 4;
}

function expectedStarts(): Start[] {
  const starts: Start[] = [];
  let active: Start | undefined;
  for (const statement of program.blocks.flatMap((block) => block.statements)) {
    for (const emitted of statement.emittedStatements) {
      const reference = emitted.opcodeReferences[0];
      if (reference) {
        active = {
          index: starts.length,
          opcode: { id: reference.opcodeId, name: reference.opcode },
          sourceInvocation: { ...statement.source, mnemonic: statement.mnemonic, actualOperands: statement.actualOperands, macro: statement.macro },
          opcodeEmission: { directive: ".byte", expressions: emitted.expressions, macroEmission: emitted.macroEmission },
          operandWidths: [],
          operandEmissions: [],
        };
        starts.push(active);
      } else {
        if (!active) throw new Error("program emitted operands before an opcode start");
        const emissionWidth = width(emitted.directive);
        active.operandWidths.push(...emitted.expressions.map(() => emissionWidth));
        active.operandEmissions.push({ directive: emitted.directive, width: emissionWidth, expressions: emitted.expressions, macroEmission: emitted.macroEmission });
      }
    }
  }
  return starts;
}

describe("Battle Script opcode-use observations", () => {
  it("regenerates byte-for-byte with all generated source-catalog prerequisites in an isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-battle-script-opcode-observations-"));
    const run = (script: string) => execFileSync(process.execPath, ["--experimental-strip-types", script, "--out-dir", outputDirectory], { stdio: "pipe" });
    run("tools/extract/extract-moves.ts");
    run("tools/extract/extract-battle-script-topology.ts");
    run("tools/extract/extract-battle-script-command-handlers.ts");
    run("tools/extract/extract-battle-script-macro-emissions.ts");
    run("tools/extract/extract-battle-script-graph.ts");
    run("tools/extract/extract-battle-script-program.ts");
    run("tools/extract/extract-battle-script-opcode-observations.ts");
    expect(readFileSync(join(outputDirectory, "battle-script-opcode-observations.json"), "utf8")).toBe(
      readFileSync("src/data/gen/battle-script-opcode-observations.json", "utf8"),
    );
  });

  it("joins all 249 exact topology/table handlers to 3,306 concrete typed starts, with 232 used and 17 explicitly unused", () => {
    expect(catalog.counts).toEqual({ topologySlots: 249, concreteTypedOpcodeStarts: 3306, usedOpcodes: 232, unusedOpcodes: 17 });
    expect(catalog.opcodes).toHaveLength(249);
    expect(catalog.instructionStarts).toHaveLength(3306);
    expect(catalog.opcodes.map((entry) => [entry.slot.id, entry.slot.name, entry.slot.handler.symbol])).toEqual(
      topology.opcodes.map((opcode) => [opcode.id, opcode.opcode, opcode.dispatcher]),
    );
    for (const entry of catalog.opcodes) {
      const commandSlot = commandHandlers.slots[entry.slot.id]!;
      expect(entry.slot).toEqual({
        id: commandSlot.index,
        name: commandSlot.opcode,
        enum: commandSlot.enum,
        table: commandSlot.table,
        handler: commandSlot.handler,
      });
    }
    const zeroUse = catalog.opcodes.filter((entry) => entry.observedInstructionCount === 0);
    expect(zeroUse.map((entry) => entry.slot.name)).toEqual([
      "B_SCR_OP_SUBBYTE", "B_SCR_OP_ORHALFWORD", "B_SCR_OP_BICHALFWORD", "B_SCR_OP_HEALTHBAR_UPDATE", "B_SCR_OP_JUMPIFAFFECTEDBYPROTECT", "B_SCR_OP_UPDATEBATTLERMOVES", "B_SCR_OP_RECORDLASTABILITY", "B_SCR_OP_USEITEMONOPPONENT", "B_SCR_OP_PURSUITDOUBLES", "B_SCR_OP_HANDLEBALLTHROW", "B_SCR_OP_GIVECAUGHTMON", "B_SCR_OP_TRYSETCAUGHTMONDEXFLAGS", "B_SCR_OP_DISPLAYDEXINFO", "B_SCR_OP_TRYGIVECAUGHTMONNICK", "B_SCR_OP_SUBATTACKERHPBYDMG", "B_SCR_OP_REMOVEATTACKERSTATUS1", "B_SCR_OP_FINISHTURN",
    ]);
    expect(zeroUse.every((entry) => entry.zeroUseStatus === "noConcreteTypedOpcodeStartsObserved")).toBe(true);
    expect(catalog.opcodes.filter((entry) => entry.observedInstructionCount > 0).every((entry) => entry.zeroUseStatus === null)).toBe(true);
    expect(catalog.source.note).toContain("no canonical schema");
    expect(catalog.source.note).toContain("support status is inferred");
  });

  it("is lossless for every program instruction start and preserves stable source order, expressions, and wrapper provenance", () => {
    const expected = expectedStarts();
    expect(expected).toHaveLength(program.counts.opcodeReferences);
    expect(catalog.instructionStarts).toEqual(expected);
    expect(catalog.instructionStarts.map((start) => start.index)).toEqual(Array.from({ length: catalog.instructionStarts.length }, (_, index) => index));
    for (const start of catalog.instructionStarts) {
      expect(start.operandWidths).toEqual(start.operandEmissions.flatMap((emission) => emission.expressions.map(() => emission.width)));
      expect(start.opcodeEmission.macroEmission.wrapperPath.length).toBeGreaterThan(0);
      for (const emission of start.operandEmissions) expect(emission.macroEmission.wrapperPath.length).toBeGreaterThan(0);
    }
  });

  it("counts every observed width sequence without promoting it to a canonical operand schema", () => {
    const startsByIndex = new Map(catalog.instructionStarts.map((start) => [start.index, start]));
    expect(catalog.opcodes.reduce((total, entry) => total + entry.observedInstructionCount, 0)).toBe(catalog.counts.concreteTypedOpcodeStarts);
    for (const entry of catalog.opcodes) {
      const starts = entry.observedInstructionStartIndexes.map((index) => startsByIndex.get(index)!);
      expect(starts).toHaveLength(entry.observedInstructionCount);
      expect(starts.every((start) => start.opcode.id === entry.slot.id && start.opcode.name === entry.slot.name)).toBe(true);
      expect(entry.observedOperandWidthSequences.reduce((total, sequence) => total + sequence.occurrenceCount, 0)).toBe(entry.observedInstructionCount);
      for (const sequence of entry.observedOperandWidthSequences) {
        expect(sequence.occurrenceCount).toBe(sequence.instructionStartIndexes.length);
        expect(sequence.instructionStartIndexes.map((index) => startsByIndex.get(index)!.operandWidths)).toEqual(
          Array.from({ length: sequence.occurrenceCount }, () => sequence.operandWidths),
        );
      }
    }
    const accuracy = catalog.opcodes.find((entry) => entry.slot.name === "B_SCR_OP_ACCURACYCHECK")!;
    expect(accuracy.observedOperandWidthSequences).toEqual([{ operandWidths: [4, 2], occurrenceCount: 66, instructionStartIndexes: accuracy.observedInstructionStartIndexes }]);
    expect(startsByIndex.get(accuracy.observedInstructionStartIndexes[0]!)!).toMatchObject({
      sourceInvocation: { label: "BattleScript_HitFromAccCheck", line: 244, mnemonic: "accuracycheck", actualOperands: ["BattleScript_PrintMoveMissed", "ACC_CURR_MOVE"] },
      operandEmissions: [
        { directive: ".4byte", expressions: ["BattleScript_PrintMoveMissed"], macroEmission: { macro: "accuracycheck", line: 8, wrapperPath: ["accuracycheck"] } },
        { directive: ".2byte", expressions: ["ACC_CURR_MOVE"], macroEmission: { macro: "accuracycheck", line: 9, wrapperPath: ["accuracycheck"] } },
      ],
    });
  });
});
