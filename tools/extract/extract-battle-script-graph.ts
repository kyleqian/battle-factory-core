// Dev-time, lexical catalog of the Battle Script assembly.  This is deliberately
// not an assembler, typed IR, or interpreter: operands stay source text and
// macro expansion is only used to report the B_SCR_OP_* bytes that the source
// macro declaration itself emits.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-graph.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-graph.ts --out-dir /tmp/battle-script-graph

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const DATA_GEN = outDirArg === undefined
  ? join(RUN_ROOT, "src", "data", "gen")
  : isAbsolute(outDirArg) ? outDirArg : join(RUN_ROOT, outDirArg);

type Macro = {
  name: string;
  declarationLine: number;
  parameterTokens: string[];
  directOpcodeBindings: string[];
  opcodeBindings: string[];
};
type MacroSource = Macro & { body: Array<{ line: number; text: string }> };
type Statement = {
  line: number;
  kind: "instruction" | "directive";
  mnemonic: string;
  rawOperands: string;
  operandTokens: string[];
  opcodeBindings?: string[];
  macroDeclarationLine?: number;
  labelOperands: string[];
};
type Label = { name: string; line: number; sigil: ":" | "::"; nextLabel: string | null; statements: Statement[] };
type ControlEdgeKind = "fallthrough" | "jump" | "call" | "return" | "end";
type ControlEdge = {
  from: { label: string; line: number };
  to: { label: string; line: number } | null;
  kind: ControlEdgeKind;
  provenance: {
    kind: "implicit-assembly-successor" | "explicit-opcode-binding";
    macro?: string;
    macroDeclarationLine?: number;
    opcode?: string;
  };
};
type CallsiteContinuation = {
  // This is deliberately separate from ControlEdge. A CALL transfers to its
  // target now; its assembly successor becomes executable only if a later
  // RETURN pops this exact callsite from the runtime script stack.
  kind: "callsite-continuation";
  call: { from: { label: string; line: number }; target: { label: string; line: number } | null };
  continuation: { label: string; line: number } | null;
  provenance: {
    kind: "explicit-callsite-continuation";
    macro: string;
    macroDeclarationLine: number;
    opcode: string;
    continuation: "assembly-successor-after-call";
  };
};
type ConditionalGuard = {
  // A source-description record for a conditional edge already present in the
  // graph. It does not assign semantics to the raw tokens: `comparator` and
  // `selector` are populated only for source macro parameters literally named
  // `ifflag` and `battler`, respectively.
  kind: "conditional-guard";
  from: { label: string; line: number };
  command: { macro: string; macroDeclarationLine: number; opcode: string };
  operands: Array<{ parameter: string; token: string }>;
  // This is a source expansion receipt, not decoded Battle Script operands.
  // In particular, fixed values in an alias's macro body remain merely source
  // spelling; they do not say what comparison the runtime will perform.
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
  provenance: {
    kind: "source-macro-invocation";
    destinationParameter: string;
    comparatorParameter: string | null;
    selectorParameter: string | null;
    notTakenSuccessor: "implicit-assembly-successor" | "none";
  };
};
type ConditionalGuardExclusion = {
  from: { label: string; line: number };
  command: { macro: string; macroDeclarationLine: number; opcode: string };
  reason: "macro-parameter-arity-mismatch" | "ambiguous-or-missing-source-destination" | "missing-destination-parameter";
};

function stripAssemblerComment(line: string): string {
  // battle_scripts_1.s does not use quoted strings, but retaining quoted @
  // characters keeps this catalog safe if one is added later.
  let quote: string | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
    } else if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === "@") {
      return line.slice(0, index);
    }
  }
  return line;
}

function splitOperands(raw: string): string[] {
  if (!raw.trim()) return [];
  const operands: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]!;
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      operands.push(raw.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (depth !== 0 || quote !== null) throw new Error(`unbalanced operand text: ${raw}`);
  operands.push(raw.slice(start).trim());
  return operands;
}

function parseMacroDeclarations(source: string): MacroSource[] {
  const macros: MacroSource[] = [];
  let current: MacroSource | undefined;
  for (const [index, rawLine] of source.split("\n").entries()) {
    const line = index + 1;
    const text = stripAssemblerComment(rawLine).trim();
    if (!text) continue;
    const start = /^\.macro\s+([A-Za-z_][A-Za-z0-9_]*)\b(.*)$/.exec(text);
    if (start) {
      if (current) throw new Error(`nested macro at asm/macros/battle_script.inc:${line}`);
      current = {
        name: start[1]!,
        declarationLine: line,
        parameterTokens: splitOperands(start[2]!.trim()),
        directOpcodeBindings: [],
        opcodeBindings: [],
        body: [],
      };
      macros.push(current);
      continue;
    }
    if (text === ".endm") {
      if (!current) throw new Error(`orphan .endm at asm/macros/battle_script.inc:${line}`);
      current = undefined;
      continue;
    }
    if (!current) throw new Error(`unsupported top-level macro-file line ${line}: ${text}`);
    const directOpcode = /^\.byte\s+(B_SCR_OP_[A-Z0-9_]+)\s*$/.exec(text);
    if (directOpcode) current.directOpcodeBindings.push(directOpcode[1]!);
    current.body.push({ line, text });
  }
  if (current) throw new Error(`unterminated macro ${current.name}`);

  const byName = new Map(macros.map((macro) => [macro.name, macro]));
  const visiting = new Set<string>();
  const resolve = (macro: MacroSource): string[] => {
    if (macro.opcodeBindings.length) return macro.opcodeBindings;
    if (visiting.has(macro.name)) throw new Error(`recursive source macro ${macro.name}`);
    visiting.add(macro.name);
    const bindings: string[] = [];
    for (const bodyStatement of macro.body) {
      const direct = /^\.byte\s+(B_SCR_OP_[A-Z0-9_]+)\s*$/.exec(bodyStatement.text);
      if (direct) {
        bindings.push(direct[1]!);
        continue;
      }
      const invocation = /^([A-Za-z_][A-Za-z0-9_]*)\b/.exec(bodyStatement.text);
      if (invocation && byName.has(invocation[1]!)) bindings.push(...resolve(byName.get(invocation[1]!)!));
    }
    visiting.delete(macro.name);
    if (!bindings.length) throw new Error(`macro ${macro.name} has no B_SCR_OP binding`);
    macro.opcodeBindings = bindings;
    return bindings;
  };
  for (const macro of macros) resolve(macro);
  return macros;
}

function parseSourceStatements(source: string, macros: Macro[]): { preamble: Statement[]; labels: Label[]; nonExecutableCategories: Record<string, number> } {
  const macroByName = new Map(macros.map((macro) => [macro.name, macro]));
  const preamble: Statement[] = [];
  const labels: Label[] = [];
  const nonExecutableCategories = new Map<string, number>();
  let current: Label | undefined;
  for (const [index, rawLine] of source.split("\n").entries()) {
    const line = index + 1;
    const text = stripAssemblerComment(rawLine).trim();
    if (!text) continue;
    const label = /^([.$A-Za-z_][.$A-Za-z0-9_]*)(::|:)$/.exec(text);
    if (label) {
      current = { name: label[1]!, line, sigil: label[2]! as ":" | "::", nextLabel: null, statements: [] };
      labels.push(current);
      continue;
    }
    const parsed = /^(\S+)(?:\s+(.*))?$/.exec(text);
    if (!parsed) throw new Error(`unsupported source line ${line}: ${text}`);
    const mnemonic = parsed[1]!;
    const rawOperands = parsed[2] ?? "";
    const statement: Statement = {
      line,
      kind: mnemonic.startsWith(".") || mnemonic.startsWith("#") ? "directive" : "instruction",
      mnemonic,
      rawOperands,
      operandTokens: splitOperands(rawOperands),
      labelOperands: [],
    };
    if (statement.kind === "instruction") {
      const macro = macroByName.get(mnemonic);
      if (!macro) throw new Error(`instruction ${mnemonic} at data/battle_scripts_1.s:${line} has no source macro declaration`);
      statement.opcodeBindings = macro.opcodeBindings;
      statement.macroDeclarationLine = macro.declarationLine;
    } else {
      nonExecutableCategories.set(`directive:${mnemonic}`, (nonExecutableCategories.get(`directive:${mnemonic}`) ?? 0) + 1);
    }
    (current?.statements ?? preamble).push(statement);
  }
  for (const [index, label] of labels.entries()) label.nextLabel = labels[index + 1]?.name ?? null;
  return { preamble, labels, nonExecutableCategories: Object.fromEntries([...nonExecutableCategories].sort(([a], [b]) => a.localeCompare(b))) };
}

const macros = parseMacroDeclarations(readFileSync(join(REF, "asm", "macros", "battle_script.inc"), "utf8"));
const parsed = parseSourceStatements(readFileSync(join(REF, "data", "battle_scripts_1.s"), "utf8"), macros);
const labelsByName = new Map(parsed.labels.map((label) => [label.name, label]));
if (labelsByName.size !== parsed.labels.length) throw new Error("duplicate source label name");
const identifier = /[.$A-Za-z_][.$A-Za-z0-9_]*/g;
for (const statement of [...parsed.preamble, ...parsed.labels.flatMap((label) => label.statements)]) {
  statement.labelOperands = [...statement.rawOperands.matchAll(identifier)]
    .map(([token]) => token!)
    .filter((token) => labelsByName.has(token));
}

// This is intentionally a narrow, source-spelled control catalog. The graph
// reports the assembly successor available when execution does not transfer;
// it does not evaluate a command handler's branch guards or claim that the
// successor is taken at runtime. Other label operands (for example a pointer
// consumed by a non-JUMPIF command) remain lexical operands, not CFG edges.
const unconditionalControlOpcodes = new Map<string, Exclude<ControlEdgeKind, "fallthrough">>([
  ["B_SCR_OP_GOTO", "jump"],
  ["B_SCR_OP_JUMPTOCALLEDMOVE", "jump"],
  ["B_SCR_OP_CALL", "call"],
  ["B_SCR_OP_RETURN", "return"],
  ["B_SCR_OP_END", "end"],
  ["B_SCR_OP_END2", "end"],
  ["B_SCR_OP_END3", "end"],
  ["B_SCR_OP_ENDSELECTIONSCRIPT", "end"],
  ["B_SCR_OP_ENDLINKBATTLE", "end"],
]);

function controlTransfer(statement: Statement): { kind: Exclude<ControlEdgeKind, "fallthrough">; hasAssemblySuccessor: boolean; opcode: string } | null {
  const bindings = statement.opcodeBindings ?? [];
  const unconditional = bindings.filter((opcode) => unconditionalControlOpcodes.has(opcode));
  const conditional = bindings.filter((opcode) => opcode.startsWith("B_SCR_OP_JUMPIF"));
  if (unconditional.length + conditional.length > 1) {
    throw new Error(`multiple explicit control opcodes at data/battle_scripts_1.s:${statement.line}: ${bindings.join(", ")}`);
  }
  if (unconditional.length === 1) {
    const opcode = unconditional[0]!;
    return { kind: unconditionalControlOpcodes.get(opcode)!, hasAssemblySuccessor: false, opcode };
  }
  if (conditional.length === 1) return { kind: "jump", hasAssemblySuccessor: true, opcode: conditional[0]! };
  return null;
}

const executableStatements = parsed.labels.flatMap((label) => label.statements
  .filter((statement) => statement.kind === "instruction")
  .map((statement) => ({ label, statement })));
const controlEdges: ControlEdge[] = [];
const callsiteContinuations: CallsiteContinuation[] = [];
for (const [index, current] of executableStatements.entries()) {
  const transfer = controlTransfer(current.statement);
  if (transfer) {
    const targets = current.statement.labelOperands;
    if (transfer.kind === "jump" || transfer.kind === "call") {
      if (targets.length === 0) {
        controlEdges.push({
          from: { label: current.label.name, line: current.statement.line },
          to: null,
          kind: transfer.kind,
          provenance: {
            kind: "explicit-opcode-binding",
            macro: current.statement.mnemonic,
            macroDeclarationLine: current.statement.macroDeclarationLine,
            opcode: transfer.opcode,
          },
        });
      } else {
        for (const target of targets) {
          const targetStatement = executableStatements.find((entry) => entry.label.name === target);
          if (!targetStatement) throw new Error(`control target ${target} at data/battle_scripts_1.s:${current.statement.line} has no executable statement`);
          controlEdges.push({
            from: { label: current.label.name, line: current.statement.line },
            to: { label: targetStatement.label.name, line: targetStatement.statement.line },
            kind: transfer.kind,
            provenance: {
              kind: "explicit-opcode-binding",
              macro: current.statement.mnemonic,
              macroDeclarationLine: current.statement.macroDeclarationLine,
              opcode: transfer.opcode,
            },
          });
        }
      }
    } else {
      controlEdges.push({
        from: { label: current.label.name, line: current.statement.line },
        to: null,
        kind: transfer.kind,
        provenance: {
          kind: "explicit-opcode-binding",
          macro: current.statement.mnemonic,
          macroDeclarationLine: current.statement.macroDeclarationLine,
          opcode: transfer.opcode,
        },
      });
    }
    if (transfer.kind === "call") {
      const target = current.statement.labelOperands[0];
      const targetStatement = target === undefined
        ? undefined
        : executableStatements.find((entry) => entry.label.name === target);
      // A CALL has exactly one source operand in the current macro. Keep this
      // relation honest if the source declaration changes instead of silently
      // selecting one target from an ambiguous call instruction.
      if (current.statement.labelOperands.length > 1) {
        throw new Error(`multiple call targets at data/battle_scripts_1.s:${current.statement.line}`);
      }
      if (target !== undefined && !targetStatement) {
        throw new Error(`call target ${target} at data/battle_scripts_1.s:${current.statement.line} has no executable statement`);
      }
      const continuation = executableStatements[index + 1];
      callsiteContinuations.push({
        kind: "callsite-continuation",
        call: {
          from: { label: current.label.name, line: current.statement.line },
          target: targetStatement === undefined ? null : { label: targetStatement.label.name, line: targetStatement.statement.line },
        },
        continuation: continuation === undefined ? null : { label: continuation.label.name, line: continuation.statement.line },
        provenance: {
          kind: "explicit-callsite-continuation",
          macro: current.statement.mnemonic,
          macroDeclarationLine: current.statement.macroDeclarationLine!,
          opcode: transfer.opcode,
          continuation: "assembly-successor-after-call",
        },
      });
    }
  }
  if ((!transfer || transfer.hasAssemblySuccessor) && executableStatements[index + 1]) {
    const next = executableStatements[index + 1]!;
    controlEdges.push({
      from: { label: current.label.name, line: current.statement.line },
      to: { label: next.label.name, line: next.statement.line },
      kind: "fallthrough",
      provenance: { kind: "implicit-assembly-successor" },
    });
  }
}

// Conditional source-macro invocations can state a guard's spelling without
// pretending to execute it. This deliberately joins only the JUMPIF edges
// above, requires the single source destination that produced that edge, and
// reports the assembly successor as the not-taken path. Macro aliases such as
// `jumpifmove` retain their raw invocation operands; fixed comparisons inside
// their macro declarations are not reverse-engineered into invented operands.
const macroByName = new Map(macros.map((macro) => [macro.name, macro]));
const statementByControlOrigin = new Map(executableStatements.map((entry) => [
  `${entry.label.name}:${entry.statement.line}`,
  entry,
]));

type TokenBinding = {
  token: string;
  provenance: {
    kind: "macro-body-literal" | "invocation-substitution";
    macro: string;
    line: number;
    expansionPath: string[];
    parameter?: string;
  };
};
type EmittedGuardToken = ConditionalGuard["emittedTokens"][number];

function substituteBoundParameters(expression: string, bindings: Map<string, TokenBinding>): { token: string; references: TokenBinding[] } {
  const references: TokenBinding[] = [];
  const token = expression.replace(/\\([A-Za-z_][A-Za-z0-9_]*)\b/g, (whole, parameter: string) => {
    const binding = bindings.get(parameter);
    if (!binding) return whole;
    references.push(binding);
    return binding.token;
  });
  return { token, references };
}

// Mechanically expand only declared macro emission text.  A token is either
// written as a literal in one of those macro bodies, or it reaches that body
// through a source invocation parameter.  If future source introduces an
// expression that combines multiple provenance sources, stop rather than
// silently making up a third category.
function emittedTokensForInvocation(macro: MacroSource, operandTokens: string[]): EmittedGuardToken[] {
  if (macro.parameterTokens.length !== operandTokens.length) throw new Error(`guard macro ${macro.name} invocation arity changed`);
  const rootBindings = new Map<string, TokenBinding>(macro.parameterTokens.map((declaration, index) => {
    const parameter = declaration.replace(/:.*$/, "");
    return [parameter, {
      token: operandTokens[index]!,
      provenance: {
        kind: "invocation-substitution",
        macro: macro.name,
        line: macro.declarationLine,
        expansionPath: [macro.name],
        parameter,
      },
    }];
  }));

  const expand = (current: MacroSource, bindings: Map<string, TokenBinding>, expansionPath: string[], visiting: string[]): EmittedGuardToken[] => {
    if (visiting.includes(current.name)) throw new Error(`recursive source macro ${[...visiting, current.name].join(" -> ")}`);
    const output: EmittedGuardToken[] = [];
    for (const bodyStatement of current.body) {
      const emission = /^(\.byte|\.2byte|\.4byte)\s+(.+)$/.exec(bodyStatement.text);
      if (emission) {
        for (const expression of splitOperands(emission[2]!)) {
          const substituted = substituteBoundParameters(expression, bindings);
          if (substituted.references.length > 1) {
            throw new Error(`mixed guard token provenance at asm/macros/battle_script.inc:${bodyStatement.line}`);
          }
          output.push({
            directive: emission[1]! as EmittedGuardToken["directive"],
            token: substituted.token,
            provenance: substituted.references[0]?.provenance ?? {
              kind: "macro-body-literal",
              macro: current.name,
              line: bodyStatement.line,
              expansionPath,
            },
          });
        }
        continue;
      }
      const invocation = /^([A-Za-z_][A-Za-z0-9_]*)\b(?:\s+(.*))?$/.exec(bodyStatement.text);
      if (!invocation) throw new Error(`unsupported macro statement at asm/macros/battle_script.inc:${bodyStatement.line}: ${bodyStatement.text}`);
      const target = macroByName.get(invocation[1]!);
      if (!target) throw new Error(`macro ${current.name} invokes undeclared wrapper ${invocation[1]} at line ${bodyStatement.line}`);
      const arguments_ = splitOperands(invocation[2] ?? "");
      if (arguments_.length !== target.parameterTokens.length) {
        throw new Error(`guard macro ${current.name} has non-uniform wrapper arity for ${target.name} at line ${bodyStatement.line}`);
      }
      const targetBindings = new Map<string, TokenBinding>();
      for (const [index, declaration] of target.parameterTokens.entries()) {
        const substituted = substituteBoundParameters(arguments_[index]!, bindings);
        if (substituted.references.length > 1) {
          throw new Error(`mixed guard wrapper provenance at asm/macros/battle_script.inc:${bodyStatement.line}`);
        }
        targetBindings.set(declaration.replace(/:.*$/, ""), {
          token: substituted.token,
          provenance: substituted.references[0]?.provenance ?? {
            kind: "macro-body-literal",
            macro: current.name,
            line: bodyStatement.line,
            expansionPath,
          },
        });
      }
      output.push(...expand(target, targetBindings, [...expansionPath, target.name], [...visiting, current.name]));
    }
    return output;
  };

  return expand(macro, rootBindings, [macro.name], []);
}

const conditionalGuards: ConditionalGuard[] = [];
const conditionalGuardExclusions: ConditionalGuardExclusion[] = [];
for (const edge of controlEdges) {
  if (edge.kind !== "jump" || !edge.provenance.opcode?.startsWith("B_SCR_OP_JUMPIF")) continue;
  const current = statementByControlOrigin.get(`${edge.from.label}:${edge.from.line}`);
  if (!current || edge.provenance.macro === undefined || edge.provenance.macroDeclarationLine === undefined) {
    throw new Error(`conditional edge at data/battle_scripts_1.s:${edge.from.line} lacks source macro provenance`);
  }
  const macro = macroByName.get(edge.provenance.macro);
  if (!macro) throw new Error(`conditional edge at data/battle_scripts_1.s:${edge.from.line} names undeclared macro ${edge.provenance.macro}`);
  const command = { macro: macro.name, macroDeclarationLine: macro.declarationLine, opcode: edge.provenance.opcode };
  const parameters = macro.parameterTokens.map((parameterToken) => parameterToken.replace(/:.*$/, ""));
  if (parameters.length !== current.statement.operandTokens.length) {
    conditionalGuardExclusions.push({ from: edge.from, command, reason: "macro-parameter-arity-mismatch" });
    continue;
  }
  const destinationIndex = parameters.findIndex((parameter) => parameter.endsWith("ptr"));
  if (destinationIndex < 0) {
    conditionalGuardExclusions.push({ from: edge.from, command, reason: "missing-destination-parameter" });
    continue;
  }
  const destinationToken = current.statement.operandTokens[destinationIndex]!;
  if (edge.to === null || current.statement.labelOperands.length !== 1 || current.statement.labelOperands[0] !== destinationToken || edge.to.label !== destinationToken) {
    conditionalGuardExclusions.push({ from: edge.from, command, reason: "ambiguous-or-missing-source-destination" });
    continue;
  }
  const operands = parameters.map((parameter, index) => ({ parameter, token: current.statement.operandTokens[index]! }));
  const operandByParameter = new Map(operands.map((operand) => [operand.parameter, operand]));
  const comparator = operandByParameter.get("ifflag") ?? null;
  const selector = operandByParameter.get("battler") ?? null;
  const fallthrough = controlEdges.find((candidate) =>
    candidate.kind === "fallthrough"
    && candidate.from.label === edge.from.label
    && candidate.from.line === edge.from.line);
  conditionalGuards.push({
    kind: "conditional-guard",
    from: edge.from,
    command,
    operands,
    emittedTokens: emittedTokensForInvocation(macro, current.statement.operandTokens),
    comparator,
    selector,
    takenDestination: {
      operand: { parameter: parameters[destinationIndex]!, token: destinationToken },
      label: edge.to.label,
      line: edge.to.line,
    },
    notTakenSuccessor: fallthrough?.to,
    provenance: {
      kind: "source-macro-invocation",
      destinationParameter: parameters[destinationIndex]!,
      comparatorParameter: comparator?.parameter ?? null,
      selectorParameter: selector?.parameter ?? null,
      notTakenSuccessor: fallthrough?.to === null || fallthrough === undefined ? "none" : "implicit-assembly-successor",
    },
  });
}

const topology = JSON.parse(readFileSync(join(DATA_GEN, "battle-script-topology.json"), "utf8")) as {
  effects: Array<{ id: number; effect: string; entryScript: string }>;
  opcodes: Array<{ opcode: string }>;
};
const opcodeSet = new Set(topology.opcodes.map((opcode) => opcode.opcode));
for (const macro of macros) {
  for (const opcode of macro.opcodeBindings) {
    if (!opcodeSet.has(opcode)) throw new Error(`macro ${macro.name} binds non-topology opcode ${opcode}`);
  }
}
for (const effect of topology.effects) {
  if (!labelsByName.has(effect.entryScript)) throw new Error(`effect ${effect.effect} entrypoint ${effect.entryScript} is not a source label`);
}

const statements = [...parsed.preamble, ...parsed.labels.flatMap((label) => label.statements)];
const graph = {
  schema: "battle-script-graph/v3",
  source: {
    files: ["asm/macros/battle_script.inc", "data/battle_scripts_1.s", "src/data/gen/battle-script-topology.json"],
    note: "Lexical source graph plus a narrow, source-spelled control-flow catalog. Operand tokens are raw assembly text; opcode bindings are mechanically expanded source macros. Fallthrough records only the implicit assembly successor available on a non-transfer path. Conditional-guard records describe only unambiguous source macro invocations and their existing control edges; runtime branch guards and other handler control behavior are not inferred.",
  },
  counts: {
    macros: macros.length,
    labels: parsed.labels.length,
    statements: statements.length,
    executableInstructions: statements.filter((statement) => statement.kind === "instruction").length,
    directives: statements.filter((statement) => statement.kind === "directive").length,
    labelOperandReferences: statements.reduce((total, statement) => total + statement.labelOperands.length, 0),
    nonExecutableCategories: Object.keys(parsed.nonExecutableCategories).length,
    unsupportedLineCategories: 0,
    controlFlowEdges: controlEdges.length,
    fallthroughEdges: controlEdges.filter((edge) => edge.kind === "fallthrough").length,
    explicitJumpEdges: controlEdges.filter((edge) => edge.kind === "jump").length,
    explicitCallEdges: controlEdges.filter((edge) => edge.kind === "call").length,
    callsiteContinuationEdges: callsiteContinuations.length,
    explicitReturnEdges: controlEdges.filter((edge) => edge.kind === "return").length,
    explicitEndEdges: controlEdges.filter((edge) => edge.kind === "end").length,
    conditionalGuardEdges: conditionalGuards.length,
    conditionalGuardMacros: new Set(conditionalGuards.map((guard) => guard.command.macro)).size,
    conditionalGuardsWithRawComparator: conditionalGuards.filter((guard) => guard.comparator !== null).length,
    conditionalGuardsWithRawSelector: conditionalGuards.filter((guard) => guard.selector !== null).length,
    conditionalGuardsWithNotTakenSuccessor: conditionalGuards.filter((guard) => guard.notTakenSuccessor !== null).length,
    conditionalGuardEmittedTokens: conditionalGuards.reduce((total, guard) => total + guard.emittedTokens.length, 0),
    conditionalGuardMacroBodyLiteralTokens: conditionalGuards.reduce((total, guard) => total + guard.emittedTokens.filter((token) => token.provenance.kind === "macro-body-literal").length, 0),
    conditionalGuardInvocationSubstitutionTokens: conditionalGuards.reduce((total, guard) => total + guard.emittedTokens.filter((token) => token.provenance.kind === "invocation-substitution").length, 0),
    conditionalGuardExcludedEdges: conditionalGuardExclusions.length,
  },
  macros: macros.map(({ body: _body, ...macro }) => macro),
  preamble: parsed.preamble,
  labels: parsed.labels,
  effectEntrypoints: topology.effects.map((effect) => ({ id: effect.id, effect: effect.effect, label: effect.entryScript })),
  nonExecutableCategories: parsed.nonExecutableCategories,
  unsupportedLineCategories: {},
  controlFlow: {
    schema: "battle-script-control-flow/v3",
    note: "Edges preserve assembly-order fallthrough across source labels and only explicit B_SCR_OP_GOTO, B_SCR_OP_JUMP*, B_SCR_OP_CALL, B_SCR_OP_RETURN, and B_SCR_OP_END* transfers. Conditional guards are descriptive records for only the mechanically unambiguous B_SCR_OP_JUMPIF* macro invocations already represented by jump edges: invocation operands remain raw source tokens; `emittedTokens` mechanically preserve each macro-body literal or invocation substitution without decoding it; `comparator` is present only for an `ifflag` macro operand and `selector` only for a `battler` macro operand. The taken destination is the source-label operand and the not-taken successor is only the lexical implicit fallthrough. No runtime guard state, macro-internal fixed operand semantics, handler branch, address, or operand type is inferred. A null jump/call target is an explicit dynamic transfer with no source-label operand. Callsite continuations separately record the assembly successor that becomes the return target after that exact CALL; they are not immediate executable fallthrough edges. RETURN has no static target because its destination is selected by the runtime call stack, so no stack-insensitive RETURN-to-continuation edges are fabricated.",
    edges: controlEdges,
    callsiteContinuations,
    conditionalGuards,
    conditionalGuardExclusions,
  },
};

mkdirSync(DATA_GEN, { recursive: true });
const output = join(DATA_GEN, "battle-script-graph.json");
writeFileSync(output, `${JSON.stringify(graph)}\n`);
console.log(`wrote ${output} (${graph.counts.macros} macros, ${graph.counts.labels} labels, ${graph.counts.executableInstructions} instructions)`);
