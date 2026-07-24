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
type CallsiteContinuation = {
  kind: "callsite-continuation";
  call: { from: { label: string; line: number }; target: { label: string; line: number } | null };
  continuation: { label: string; line: number } | null;
  provenance: { kind: "explicit-callsite-continuation"; macro: string; macroDeclarationLine: number; opcode: string; continuation: "assembly-successor-after-call" };
};
type ConditionalGuard = {
  kind: "conditional-guard";
  from: { label: string; line: number };
  command: { macro: string; macroDeclarationLine: number; opcode: string };
  operands: Array<{ parameter: string; token: string }>;
  emittedTokens: Array<{
    directive: ".byte" | ".2byte" | ".4byte";
    token: string;
    provenance: {
      kind: "macro-body-literal" | "invocation-substitution";
      macro: string;
      line: number;
      expansionPath: string[];
      parameter?: string;
    };
  }>;
  comparator: { parameter: string; token: string } | null;
  selector: { parameter: string; token: string } | null;
  takenDestination: { operand: { parameter: string; token: string }; label: string; line: number };
  notTakenSuccessor: { label: string; line: number } | null;
  provenance: { kind: "source-macro-invocation"; destinationParameter: string; comparatorParameter: string | null; selectorParameter: string | null; notTakenSuccessor: "implicit-assembly-successor" | "none" };
};
const graph = graphData as {
  schema: string;
  counts: { macros: number; labels: number; executableInstructions: number; directives: number; nonExecutableCategories: number; unsupportedLineCategories: number; controlFlowEdges: number; fallthroughEdges: number; explicitJumpEdges: number; explicitCallEdges: number; callsiteContinuationEdges: number; explicitReturnEdges: number; explicitEndEdges: number; conditionalGuardEdges: number; conditionalGuardMacros: number; conditionalGuardsWithRawComparator: number; conditionalGuardsWithRawSelector: number; conditionalGuardsWithNotTakenSuccessor: number; conditionalGuardEmittedTokens: number; conditionalGuardMacroBodyLiteralTokens: number; conditionalGuardInvocationSubstitutionTokens: number; conditionalGuardExcludedEdges: number };
  macros: Array<{ name: string; declarationLine: number; parameterTokens: string[]; directOpcodeBindings: string[]; opcodeBindings: string[] }>;
  labels: Label[];
  preamble: Statement[];
  effectEntrypoints: Array<{ id: number; effect: string; label: string }>;
  nonExecutableCategories: Record<string, number>;
  unsupportedLineCategories: Record<string, number>;
  controlFlow: { schema: string; note: string; edges: ControlEdge[]; callsiteContinuations: CallsiteContinuation[]; conditionalGuards: ConditionalGuard[]; conditionalGuardExclusions: unknown[] };
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
    expect(graph.schema).toBe("battle-script-graph/v3");
    expect(graph.controlFlow.schema).toBe("battle-script-control-flow/v3");
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
    expect(graph.counts.callsiteContinuationEdges).toBe(graph.controlFlow.callsiteContinuations.length);
    expect(graph.controlFlow.callsiteContinuations).toHaveLength(graph.counts.explicitCallEdges);

    const executable = graph.labels.flatMap((label) => label.statements
      .filter((statement) => statement.kind === "instruction")
      .map((statement) => ({ label: label.name, line: statement.line })));
    for (const fallthrough of graph.controlFlow.edges.filter((candidate) => candidate.kind === "fallthrough")) {
      const index = executable.findIndex((statement) => statement.label === fallthrough.from.label && statement.line === fallthrough.from.line);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(fallthrough.to).toEqual(executable[index + 1]);
      expect(fallthrough.provenance).toEqual({ kind: "implicit-assembly-successor" });
    }
    for (const call of graph.controlFlow.edges.filter((candidate) => candidate.kind === "call")) {
      const continuation = graph.controlFlow.callsiteContinuations.find((candidate) =>
        candidate.call.from.label === call.from.label && candidate.call.from.line === call.from.line);
      const index = executable.findIndex((statement) => statement.label === call.from.label && statement.line === call.from.line);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(continuation).toMatchObject({
        kind: "callsite-continuation",
        call: { from: call.from, target: call.to },
        continuation: executable[index + 1] ?? null,
        provenance: { kind: "explicit-callsite-continuation", continuation: "assembly-successor-after-call" },
      });
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

  it("describes every mechanically unambiguous conditional macro invocation without evaluating it", () => {
    const conditionalEdges = graph.controlFlow.edges.filter((candidate) =>
      candidate.kind === "jump" && candidate.provenance.opcode?.startsWith("B_SCR_OP_JUMPIF"));
    expect(graph.counts.conditionalGuardEdges).toBe(264);
    expect(graph.counts.conditionalGuardMacros).toBe(29);
    expect(graph.counts.conditionalGuardsWithRawComparator).toBe(87);
    expect(graph.counts.conditionalGuardsWithRawSelector).toBe(124);
    expect(graph.counts.conditionalGuardsWithNotTakenSuccessor).toBe(264);
    expect(graph.counts.conditionalGuardEmittedTokens).toBe(1191);
    expect(graph.counts.conditionalGuardMacroBodyLiteralTokens).toBe(384);
    expect(graph.counts.conditionalGuardInvocationSubstitutionTokens).toBe(807);
    expect(graph.counts.conditionalGuardExcludedEdges).toBe(0);
    expect(graph.controlFlow.conditionalGuards).toHaveLength(conditionalEdges.length);
    expect(graph.controlFlow.conditionalGuardExclusions).toEqual([]);

    const statements = new Map(graph.labels.flatMap((label) => label.statements
      .filter((statement) => statement.kind === "instruction")
      .map((statement) => [`${label.name}:${statement.line}`, statement])));
    const macros = new Map(graph.macros.map((macro) => [macro.name, macro]));
    for (const guard of graph.controlFlow.conditionalGuards) {
      const matchedEdge = conditionalEdges.find((edge) => edge.from.label === guard.from.label && edge.from.line === guard.from.line);
      const statement = statements.get(`${guard.from.label}:${guard.from.line}`)!;
      const macro = macros.get(guard.command.macro)!;
      expect(matchedEdge).toBeDefined();
      expect(guard.kind).toBe("conditional-guard");
      expect(guard.command).toEqual({ macro: statement.mnemonic, macroDeclarationLine: macro.declarationLine, opcode: matchedEdge!.provenance.opcode });
      expect(guard.operands).toEqual(macro.parameterTokens.map((parameterToken, index) => ({
        parameter: parameterToken.replace(/:.*$/, ""),
        token: statement.operandTokens[index],
      })));
      expect(guard.takenDestination).toMatchObject({
        operand: { token: matchedEdge!.to!.label },
        label: matchedEdge!.to!.label,
        line: matchedEdge!.to!.line,
      });
      const fallthrough = graph.controlFlow.edges.find((edge) => edge.kind === "fallthrough" && edge.from.label === guard.from.label && edge.from.line === guard.from.line);
      expect(guard.notTakenSuccessor).toEqual(fallthrough?.to ?? null);
      expect(guard.comparator).toEqual(guard.operands.find((operand) => operand.parameter === "ifflag") ?? null);
      expect(guard.selector).toEqual(guard.operands.find((operand) => operand.parameter === "battler") ?? null);
      expect(guard.emittedTokens.length).toBeGreaterThan(1);
      for (const emitted of guard.emittedTokens) {
        expect([".byte", ".2byte", ".4byte"]).toContain(emitted.directive);
        expect(emitted.token).not.toContain("\\");
        expect(emitted.provenance.macro).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
        expect(emitted.provenance.line).toBeGreaterThan(0);
        expect(emitted.provenance.expansionPath[0]).toBe(guard.command.macro);
        if (emitted.provenance.kind === "invocation-substitution") expect(emitted.provenance.parameter).toBeDefined();
        else expect(emitted.provenance.parameter).toBeUndefined();
      }
    }

    const fixedMacroGuard = graph.controlFlow.conditionalGuards.find((guard) => guard.from.label === "BattleScript_EffectHit" && guard.from.line === 237)!;
    expect(fixedMacroGuard).toMatchObject({
      command: { macro: "jumpifnotmove", opcode: "B_SCR_OP_JUMPIFHALFWORD" },
      operands: [{ parameter: "move", token: "MOVE_SURF" }, { parameter: "jumpptr", token: "BattleScript_HitFromAtkCanceler" }],
      comparator: null,
      selector: null,
      takenDestination: { label: "BattleScript_HitFromAtkCanceler", line: 242 },
      notTakenSuccessor: { label: "BattleScript_EffectHit", line: 238 },
    });
    expect(fixedMacroGuard.emittedTokens).toEqual([
      { directive: ".byte", token: "B_SCR_OP_JUMPIFHALFWORD", provenance: { kind: "macro-body-literal", macro: "jumpifhalfword", line: 226, expansionPath: ["jumpifnotmove", "jumpifhalfword"] } },
      { directive: ".byte", token: "CMP_NOT_EQUAL", provenance: { kind: "macro-body-literal", macro: "jumpifnotmove", line: 1419, expansionPath: ["jumpifnotmove"] } },
      { directive: ".4byte", token: "gCurrentMove", provenance: { kind: "macro-body-literal", macro: "jumpifnotmove", line: 1419, expansionPath: ["jumpifnotmove"] } },
      { directive: ".2byte", token: "MOVE_SURF", provenance: { kind: "invocation-substitution", macro: "jumpifnotmove", line: 1418, expansionPath: ["jumpifnotmove"], parameter: "move" } },
      { directive: ".4byte", token: "BattleScript_HitFromAtkCanceler", provenance: { kind: "invocation-substitution", macro: "jumpifnotmove", line: 1418, expansionPath: ["jumpifnotmove"], parameter: "jumpptr" } },
    ]);
    const rawComparatorGuard = graph.controlFlow.conditionalGuards.find((guard) => guard.from.label === "BattleScript_EffectExplosion" && guard.from.line === 382)!;
    expect(rawComparatorGuard).toMatchObject({
      command: { macro: "jumpifbyte", opcode: "B_SCR_OP_JUMPIFBYTE" },
      comparator: { parameter: "ifflag", token: "CMP_NO_COMMON_BITS" },
      selector: null,
      takenDestination: { label: "BattleScript_ExplosionDoAnimStartLoop", line: 386 },
      notTakenSuccessor: { label: "BattleScript_EffectExplosion", line: 383 },
    });
    const rawSelectorGuard = graph.controlFlow.conditionalGuards.find((guard) => guard.from.label === "BattleScript_EffectSleep" && guard.from.line === 288)!;
    expect(rawSelectorGuard).toMatchObject({
      command: { macro: "jumpifstatus2", opcode: "B_SCR_OP_JUMPIFSTATUS2" },
      selector: { parameter: "battler", token: "BS_TARGET" },
      takenDestination: { label: "BattleScript_ButItFailed", line: 2059 },
      notTakenSuccessor: { label: "BattleScript_EffectSleep", line: 289 },
    });
    expect(graph.controlFlow.note).toContain("macro-internal fixed operand");
    expect(graph.controlFlow.note).toContain("not-taken successor is only the lexical implicit fallthrough");
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

  it("records callsite continuations without treating them as immediate paths or guessing RETURN targets", () => {
    const continuation = (label: string, line: number) => graph.controlFlow.callsiteContinuations.find((candidate) =>
      candidate.call.from.label === label && candidate.call.from.line === line);

    // One callee has multiple callsites: each has its own source-spelled
    // post-call continuation, while its RETURN remains stack-dependent.
    expect(continuation("BattleScript_EffectRazorWind", 782)).toMatchObject({
      kind: "callsite-continuation",
      call: { target: { label: "BattleScriptFirstChargingTurn", line: 796 } },
      continuation: { label: "BattleScript_EffectRazorWind", line: 783 },
      provenance: { macro: "call", macroDeclarationLine: 361, opcode: "B_SCR_OP_CALL", continuation: "assembly-successor-after-call" },
    });
    expect(continuation("BattleScript_EffectSkyAttack", 1068)).toMatchObject({
      call: { target: { label: "BattleScriptFirstChargingTurn", line: 796 } },
      continuation: { label: "BattleScript_EffectSkyAttack", line: 1069 },
    });

    // Independent call frames retain their own continuations. This remains
    // valid if calls nest at runtime because no RETURN is flattened into a
    // stack-insensitive direct graph edge.
    expect(continuation("BattleScript_CastformChange", 4008)).toMatchObject({
      call: { target: { label: "BattleScript_DoCastformChange", line: 4012 } },
      continuation: { label: "BattleScript_CastformChange", line: 4009 },
    });
    expect(continuation("BattleScript_DrizzleActivates", 3962)).toMatchObject({
      call: { target: { label: "BattleScript_WeatherFormChanges", line: 4000 } },
      continuation: { label: "BattleScript_DrizzleActivates", line: 3963 },
    });

    // A post-call END3 is recorded as a continuation, not claimed to run
    // before the callee returns. Every RETURN remains targetless in the CFG.
    expect(continuation("BattleScript_IntimidateActivatesEnd3", 4019)).toMatchObject({
      continuation: { label: "BattleScript_IntimidateActivatesEnd3", line: 4020 },
    });
    for (const returned of graph.controlFlow.edges.filter((candidate) => candidate.kind === "return")) {
      expect(returned.to).toBeNull();
    }
    for (const call of graph.controlFlow.edges.filter((candidate) => candidate.kind === "call")) {
      expect(graph.controlFlow.edges.some((candidate) =>
        candidate.kind === "fallthrough"
        && candidate.from.label === call.from.label
        && candidate.from.line === call.from.line)).toBe(false);
    }
    expect(graph.controlFlow.note).toContain("not immediate executable fallthrough");
    expect(graph.controlFlow.note).toContain("no stack-insensitive RETURN-to-continuation edges");
  });
});
