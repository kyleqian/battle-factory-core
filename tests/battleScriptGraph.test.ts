import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import graphData from "../src/data/gen/battle-script-graph.json" with { type: "json" };
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };

type Statement = { line: number; kind: "instruction" | "directive"; mnemonic: string; operandTokens: string[]; opcodeBindings?: string[]; macroDeclarationLine?: number; labelOperands: string[] };
type Label = { name: string; nextLabel: string | null; statements: Statement[] };
type ControlEdge = {
  from: { label: string; line: number };
  to: { label: string; line: number } | null;
  kind: "fallthrough" | "jump" | "call" | "return" | "end";
  provenance: { kind: "implicit-assembly-successor" | "explicit-opcode-binding"; macro?: string; macroDeclarationLine?: number; opcode?: string };
};
const graph = graphData as {
  schema: string;
  counts: { macros: number; labels: number; executableInstructions: number; directives: number; nonExecutableCategories: number; unsupportedLineCategories: number; controlFlowEdges: number; fallthroughEdges: number; explicitJumpEdges: number; explicitCallEdges: number; explicitReturnEdges: number; explicitEndEdges: number };
  macros: Array<{ name: string; declarationLine: number; directOpcodeBindings: string[]; opcodeBindings: string[] }>;
  labels: Label[];
  preamble: Statement[];
  effectEntrypoints: Array<{ id: number; effect: string; label: string }>;
  nonExecutableCategories: Record<string, number>;
  unsupportedLineCategories: Record<string, number>;
  controlFlow: { schema: string; note: string; edges: ControlEdge[] };
};
const topology = topologyData as { effects: Array<{ id: number; effect: string; entryScript: string }>; moves: Array<{ move: string; entryScript: string }>; opcodes: Array<{ opcode: string }> };

function edge(fromLabel: string, fromLine: number, kind: ControlEdge["kind"]): ControlEdge {
  const found = graph.controlFlow.edges.find((candidate) => candidate.from.label === fromLabel && candidate.from.line === fromLine && candidate.kind === kind);
  if (!found) throw new Error(`missing ${kind} edge from ${fromLabel}:${fromLine}`);
  return found;
}

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

  it("preserves exact implicit assembly successors and source-spelled transfer provenance", () => {
    expect(graph.schema).toBe("battle-script-graph/v2");
    expect(graph.controlFlow.schema).toBe("battle-script-control-flow/v1");
    expect(graph.controlFlow.note).toContain("No runtime guard");
    expect(graph.counts.controlFlowEdges).toBe(graph.controlFlow.edges.length);
    const countFieldByKind: Record<ControlEdge["kind"], keyof typeof graph.counts> = {
      fallthrough: "fallthroughEdges",
      jump: "explicitJumpEdges",
      call: "explicitCallEdges",
      return: "explicitReturnEdges",
      end: "explicitEndEdges",
    };
    for (const kind of ["fallthrough", "jump", "call", "return", "end"] as const) {
      const count = graph.controlFlow.edges.filter((candidate) => candidate.kind === kind).length;
      expect(graph.counts[countFieldByKind[kind]]).toBe(count);
    }

    const executable = graph.labels.flatMap((label) => label.statements
      .filter((statement) => statement.kind === "instruction")
      .map((statement) => ({ label: label.name, line: statement.line })));
    for (const fallthrough of graph.controlFlow.edges.filter((candidate) => candidate.kind === "fallthrough")) {
      const index = executable.findIndex((statement) => statement.label === fallthrough.from.label && statement.line === fallthrough.from.line);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(fallthrough.to).toEqual(executable[index + 1]);
      expect(fallthrough.provenance).toEqual({ kind: "implicit-assembly-successor" });
    }

    expect(edge("BattleScript_EffectThunder", 1923, "jump")).toMatchObject({
      to: { label: "BattleScript_EffectHit", line: 237 },
      provenance: { kind: "explicit-opcode-binding", macro: "goto", macroDeclarationLine: 212, opcode: "B_SCR_OP_GOTO" },
    });
    expect(edge("BattleScript_EffectHit", 240, "fallthrough")).toMatchObject({
      to: { label: "BattleScript_HitFromAtkCanceler", line: 242 },
    });
    expect(edge("BattleScript_HitFromAtkCanceler", 242, "fallthrough")).toMatchObject({
      to: { label: "BattleScript_HitFromAccCheck", line: 244 },
    });
  });

  it("keeps ordinary Surf and Tackle on the EffectHit fallthrough path without claiming a branch guard", () => {
    for (const move of ["MOVE_SURF", "MOVE_TACKLE"]) {
      expect(topology.moves.find((candidate) => candidate.move === move)?.entryScript).toBe("BattleScript_EffectHit");
    }
    const reached = new Set<string>();
    const pending = ["BattleScript_EffectHit:237"];
    while (pending.length) {
      const current = pending.pop()!;
      if (reached.has(current)) continue;
      reached.add(current);
      for (const candidate of graph.controlFlow.edges) {
        if (`${candidate.from.label}:${candidate.from.line}` !== current || candidate.to === null) continue;
        pending.push(`${candidate.to.label}:${candidate.to.line}`);
      }
    }
    expect(reached).toContain("BattleScript_HitFromAtkCanceler:242");
    expect(reached).toContain("BattleScript_HitFromAccCheck:244");
    expect(edge("BattleScript_EffectHit", 237, "jump").provenance.opcode).toBe("B_SCR_OP_JUMPIFHALFWORD");
    expect(edge("BattleScript_EffectHit", 237, "fallthrough").to).toEqual({ label: "BattleScript_EffectHit", line: 238 });
  });

  it("does not fabricate a successor after explicit goto, return, or end", () => {
    for (const [label, line, kind] of [
      ["BattleScript_EffectThunder", 1923, "jump"],
      ["BattleScript_PreserveMissedBitDoMoveAnim", 423, "return"],
      ["BattleScript_MoveEnd", 269, "end"],
    ] as const) {
      const transfers = graph.controlFlow.edges.filter((candidate) => candidate.from.label === label && candidate.from.line === line);
      expect(transfers.some((candidate) => candidate.kind === "fallthrough")).toBe(false);
      expect(transfers.some((candidate) => candidate.kind === kind)).toBe(true);
    }
    expect(edge("BattleScript_PreserveMissedBitDoMoveAnim", 423, "return").to).toBeNull();
    expect(edge("BattleScript_MoveEnd", 269, "end").to).toBeNull();
  });
});
