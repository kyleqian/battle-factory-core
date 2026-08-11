import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import programData from "../src/data/gen/battle-script-program.json" with { type: "json" };
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };

type Emission = {
  directive: ".byte" | ".2byte" | ".4byte";
  expressions: string[];
  opcodeReferences: Array<{ expressionIndex: number; opcode: string; opcodeId: number }>;
  macroEmission: { macro: string; line: number; wrapperPath: string[] };
};
type Statement = {
  source: { label: string; labelLine: number; line: number };
  mnemonic: string;
  actualOperands: string[];
  macro: { declarationLine: number; parameterBindings: Array<{ parameter: string; declaration: string; expression: string; supplied: boolean }> };
  emittedStatements: Emission[];
};
type Block = { label: string; line: number; statements: Statement[] };

const program = programData as {
  counts: { labelBlocks: number; executableStatements: number; emittedStatements: number; opcodeReferences: number; topologyOpcodes: number; topologyOpcodesCovered: number; topologyOpcodesUnreferenced: number };
  blocks: Block[];
  topologyOpcodeCoverage: Array<{ id: number; opcode: string; invocationCount: number }>;
};
const topology = topologyData as { opcodes: Array<{ id: number; opcode: string }> };

function statement(label: string, line: number): Statement {
  const found = program.blocks.find((block) => block.label === label)?.statements.find((entry) => entry.source.line === line);
  if (!found) throw new Error(`missing ${label}:${line}`);
  return found;
}

describe("Battle Script assembled-program extraction", () => {
  it("regenerates byte-for-byte from the graph and macro-emission prerequisites in an isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-battle-script-program-"));
    const run = (script: string) => execFileSync(process.execPath, ["--experimental-strip-types", script, "--out-dir", outputDirectory], { stdio: "pipe" });
    run("tools/extract/extract-moves.ts");
    run("tools/extract/extract-battle-script-topology.ts");
    run("tools/extract/extract-battle-script-macro-emissions.ts");
    run("tools/extract/extract-battle-script-graph.ts");
    run("tools/extract/extract-battle-script-program.ts");
    expect(readFileSync(join(outputDirectory, "battle-script-program.json"), "utf8")).toBe(
      readFileSync("src/data/gen/battle-script-program.json", "utf8"),
    );
  });

  it("joins all 3,275 executable source statements across all 619 label blocks", () => {
    expect(program.counts.labelBlocks).toBe(619);
    expect(program.blocks).toHaveLength(619);
    expect(program.counts.executableStatements).toBe(3275);
    expect(program.blocks.flatMap((block) => block.statements)).toHaveLength(3275);
    expect(program.counts.emittedStatements).toBe(program.blocks.flatMap((block) => block.statements.flatMap((entry) => entry.emittedStatements)).length);
    for (const block of program.blocks) {
      for (const entry of block.statements) {
        expect(entry.source.label).toBe(block.label);
        expect(entry.source.line).toBeGreaterThan(entry.source.labelLine);
        expect(entry.emittedStatements.length).toBeGreaterThan(0);
        for (const emission of entry.emittedStatements) {
          expect(emission.directive).toMatch(/^\.(byte|2byte|4byte)$/);
          expect(emission.expressions.every((expression) => !/\\[A-Za-z_][A-Za-z0-9_]*\b/.test(expression))).toBe(true);
        }
      }
    }
  });

  it("preserves direct operands and source labels without evaluating their assembly expressions", () => {
    const accuracy = statement("BattleScript_HitFromAccCheck", 244);
    expect(accuracy).toMatchObject({
      source: { label: "BattleScript_HitFromAccCheck", line: 244 },
      mnemonic: "accuracycheck",
      actualOperands: ["BattleScript_PrintMoveMissed", "ACC_CURR_MOVE"],
    });
    expect(accuracy.emittedStatements.map((emission) => [emission.directive, emission.expressions])).toEqual([
      [".byte", ["B_SCR_OP_ACCURACYCHECK"]],
      [".4byte", ["BattleScript_PrintMoveMissed"]],
      [".2byte", ["ACC_CURR_MOVE"]],
    ]);
    expect(accuracy.emittedStatements[1]!.macroEmission).toEqual({ macro: "accuracycheck", line: 8, wrapperPath: ["accuracycheck"] });
  });

  it("honestly preserves wrapper multi-opcode expansion and default operands", () => {
    const setword = statement("BattleScript_EffectDragonRage", 826);
    expect(setword.mnemonic).toBe("setword");
    expect(setword.actualOperands).toEqual(["gBattleMoveDamage", "40"]);
    expect(setword.emittedStatements).toHaveLength(12);
    expect(setword.emittedStatements.filter((emission) => emission.directive === ".byte" && emission.expressions[0] === "B_SCR_OP_SETBYTE")).toHaveLength(4);
    expect(setword.emittedStatements.slice(0, 6).map((emission) => [emission.directive, emission.expressions, emission.macroEmission.wrapperPath])).toEqual([
      [".byte", ["B_SCR_OP_SETBYTE"], ["setword", "setbyte"]],
      [".4byte", ["gBattleMoveDamage"], ["setword", "setbyte"]],
      [".byte", ["(40) & 0xFF"], ["setword", "setbyte"]],
      [".byte", ["B_SCR_OP_SETBYTE"], ["setword", "setbyte"]],
      [".4byte", ["gBattleMoveDamage + 1"], ["setword", "setbyte"]],
      [".byte", ["((40) >> 8) & 0xFF"], ["setword", "setbyte"]],
    ]);
    const defaulted = statement("BattleScript_SmokeBallEscape", 3051);
    expect(defaulted.mnemonic).toBe("playanimation");
    expect(defaulted.macro.parameterBindings).toEqual([
      { parameter: "battler", declaration: "battler:req", expression: "BS_ATTACKER", supplied: true },
      { parameter: "animType", declaration: "animType:req", expression: "B_ANIM_SMOKEBALL_ESCAPE", supplied: true },
      { parameter: "arg", declaration: "arg=NULL", expression: "NULL", supplied: false },
    ]);
    expect(defaulted.emittedStatements.map((emission) => [emission.directive, emission.expressions])).toEqual([
      [".byte", ["B_SCR_OP_PLAYANIMATION"]],
      [".byte", ["BS_ATTACKER"]],
      [".byte", ["B_ANIM_SMOKEBALL_ESCAPE"]],
      [".4byte", ["NULL"]],
    ]);
  });

  it("retains opcode references and accounts for every topology opcode, including source-unreferenced commands", () => {
    const opcodeIds = new Map(topology.opcodes.map((opcode) => [opcode.opcode, opcode.id]));
    const references = program.blocks.flatMap((block) => block.statements.flatMap((entry) => entry.emittedStatements.flatMap((emission) => emission.opcodeReferences)));
    expect(program.counts.opcodeReferences).toBe(references.length);
    expect(program.counts.topologyOpcodes).toBe(topology.opcodes.length);
    expect(program.topologyOpcodeCoverage).toHaveLength(topology.opcodes.length);
    expect(program.counts.topologyOpcodesCovered).toBe(new Set(references.map((reference) => reference.opcodeId)).size);
    expect(program.counts.topologyOpcodesUnreferenced).toBe(topology.opcodes.length - program.counts.topologyOpcodesCovered);
    expect(program.topologyOpcodeCoverage.map((entry) => [entry.id, entry.opcode])).toEqual(topology.opcodes.map((opcode) => [opcode.id, opcode.opcode]));
    expect(program.topologyOpcodeCoverage.filter((entry) => entry.invocationCount === 0).map((entry) => entry.opcode)).toContain("B_SCR_OP_SUBBYTE");
    expect(program.topologyOpcodeCoverage.reduce((total, entry) => total + entry.invocationCount, 0)).toBe(references.length);
    for (const reference of references) expect(opcodeIds.get(reference.opcode)).toBe(reference.opcodeId);
  });
});
