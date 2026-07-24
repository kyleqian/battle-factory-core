import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import graphData from "../src/data/gen/battle-script-graph.json" with { type: "json" };
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };

type Statement = { kind: "instruction" | "directive"; mnemonic: string; operandTokens: string[]; opcodeBindings?: string[]; labelOperands: string[] };
type Label = { name: string; nextLabel: string | null; statements: Statement[] };
const graph = graphData as {
  counts: { macros: number; labels: number; executableInstructions: number; directives: number; nonExecutableCategories: number; unsupportedLineCategories: number };
  macros: Array<{ name: string; declarationLine: number; directOpcodeBindings: string[]; opcodeBindings: string[] }>;
  labels: Label[];
  preamble: Statement[];
  effectEntrypoints: Array<{ id: number; effect: string; label: string }>;
  nonExecutableCategories: Record<string, number>;
  unsupportedLineCategories: Record<string, number>;
};
const topology = topologyData as { effects: Array<{ id: number; effect: string; entryScript: string }>; opcodes: Array<{ opcode: string }> };

describe("Battle Script source graph extraction", () => {
  it("regenerates byte-for-byte after its topology prerequisite in an isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-battle-script-graph-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-moves.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-script-topology.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-script-graph.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    expect(readFileSync(join(outputDirectory, "battle-script-graph.json"), "utf8")).toBe(
      readFileSync("src/data/gen/battle-script-graph.json", "utf8"),
    );
  });

  it("catalogs declared macros and exact source B_SCR_OP bindings", () => {
    expect(graph.counts.macros).toBe(graph.macros.length);
    const declared = new Set(graph.macros.map((macro) => macro.name));
    const opcodes = new Set(topology.opcodes.map((opcode) => opcode.opcode));
    expect(declared.has("attackcanceler")).toBe(true);
    for (const macro of graph.macros) {
      expect(macro.declarationLine).toBeGreaterThan(0);
      expect(macro.opcodeBindings.length).toBeGreaterThan(0);
      for (const opcode of macro.opcodeBindings) expect(opcodes.has(opcode)).toBe(true);
    }
    expect(new Set(graph.macros.flatMap((macro) => macro.directOpcodeBindings))).toEqual(opcodes);
    expect(graph.macros.find((macro) => macro.name === "tryfaintmon_spikes")).toMatchObject({ directOpcodeBindings: ["B_SCR_OP_TRYFAINTMON"] });
    expect(graph.macros.find((macro) => macro.name === "setword")).toMatchObject({ directOpcodeBindings: [], opcodeBindings: ["B_SCR_OP_SETBYTE", "B_SCR_OP_SETBYTE", "B_SCR_OP_SETBYTE", "B_SCR_OP_SETBYTE"] });
  });

  it("keeps every source label block, directive, and lexical successor in source order", () => {
    expect(graph.counts.labels).toBe(graph.labels.length);
    expect(graph.counts.directives).toBeGreaterThan(0);
    expect(graph.nonExecutableCategories["directive:.4byte"]).toBeGreaterThan(0);
    expect(graph.counts.nonExecutableCategories).toBe(Object.keys(graph.nonExecutableCategories).length);
    expect(graph.counts.unsupportedLineCategories).toBe(0);
    expect(graph.unsupportedLineCategories).toEqual({});
    expect(graph.labels[0]).toMatchObject({ name: "gBattleScriptsForMoveEffects", nextLabel: "BattleScript_EffectHit" });
    for (const [index, label] of graph.labels.entries()) {
      expect(label.nextLabel).toBe(graph.labels[index + 1]?.name ?? null);
      for (const statement of label.statements) expect(statement.operandTokens).toEqual(expect.any(Array));
    }
  });

  it("resolves every executable mnemonic to a declared source macro and source opcode", () => {
    const macros = new Map(graph.macros.map((macro) => [macro.name, macro]));
    const executable = [...graph.preamble, ...graph.labels.flatMap((label) => label.statements)].filter((statement) => statement.kind === "instruction");
    expect(graph.counts.executableInstructions).toBe(executable.length);
    for (const statement of executable) {
      const macro = macros.get(statement.mnemonic);
      expect(macro, statement.mnemonic).toBeDefined();
      expect(statement.opcodeBindings).toEqual(macro!.opcodeBindings);
      expect(statement.opcodeBindings!.length).toBeGreaterThan(0);
    }
  });

  it("resolves topology effect entrypoints and every label operand that names an extracted label", () => {
    const labels = new Set(graph.labels.map((label) => label.name));
    expect(graph.effectEntrypoints).toEqual(topology.effects.map((effect) => ({ id: effect.id, effect: effect.effect, label: effect.entryScript })));
    for (const entrypoint of graph.effectEntrypoints) expect(labels.has(entrypoint.label), entrypoint.effect).toBe(true);
    for (const statement of [...graph.preamble, ...graph.labels.flatMap((label) => label.statements)]) {
      for (const labelOperand of statement.labelOperands) expect(labels.has(labelOperand), labelOperand).toBe(true);
    }
  });
});
