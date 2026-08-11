// Dev-time, read-only catalogue of the three move-scoring scripts selected by
// Battle Factory's masks 1 and 7. This deliberately describes source text and
// native command-table receipts; it is not an assembler or runtime AI.
//
// Run with: node --experimental-strip-types tools/extract/extract-factory-ai-script-catalog.ts

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  if (!process.argv[index + 1]) throw new Error(`${name} requires a path`);
  return resolve(process.argv[index + 1]!);
}

const sourcePath = argument("--source", join(REF, "data", "battle_ai_scripts.s"));
const macroPath = argument("--macro-source", join(REF, "asm", "macros", "battle_ai_script.inc"));
const commandPath = argument("--command-source", join(REF, "src", "battle_ai_script_commands.c"));
const policyPath = argument("--policy", join(ROOT, "src", "data", "gen", "factory-ai-policy.json"));
const outputPath = argument("--out", join(ROOT, "src", "data", "gen", "factory-ai-script-catalog.json"));

type Macro = { name: string; line: number; parameters: string[]; opcodes: number[] };
type Instruction = { line: number; macro: string; operands: string[]; opcodes: number[] };
type Label = { name: string; line: number; instructions: Instruction[] };

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function stripComment(raw: string): string {
  // The pinned AI source does not use strings, but keep @ inside a quoted
  // operand from being treated as an assembler comment if one is introduced.
  let quote: string | undefined;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]!;
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
    } else if (char === "\"" || char === "'") quote = char;
    else if (char === "@") return raw.slice(0, index);
  }
  if (quote) throw new Error(`unterminated quoted operand: ${raw}`);
  return raw;
}

function splitOperands(raw: string, context: string): string[] {
  if (!raw.trim()) return [];
  const values: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]!;
    if (quote) {
      if (char === quote && raw[index - 1] !== "\\") quote = undefined;
    } else if (char === "\"" || char === "'") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      values.push(raw.slice(start, index).trim());
      start = index + 1;
    }
    if (depth < 0) throw new Error(`unbalanced operands at ${context}: ${raw}`);
  }
  if (depth !== 0 || quote) throw new Error(`unbalanced operands at ${context}: ${raw}`);
  values.push(raw.slice(start).trim());
  if (values.some((value) => !value)) throw new Error(`empty operand at ${context}: ${raw}`);
  return values;
}

function parseMacros(text: string): Map<string, Macro> {
  const rawMacros = new Map<string, { name: string; line: number; parameters: string[]; body: Array<{ line: number; text: string }> }>();
  let current: { name: string; line: number; parameters: string[]; body: Array<{ line: number; text: string }> } | undefined;
  for (const [index, raw] of text.split("\n").entries()) {
    const line = index + 1;
    const statement = stripComment(raw).trim();
    if (!statement) continue;
    const start = /^\.macro\s+([A-Za-z_][A-Za-z0-9_]*)\b(.*)$/.exec(statement);
    if (start) {
      if (current) throw new Error(`nested macro at ${macroPath}:${line}`);
      current = { name: start[1]!, line, parameters: splitOperands(start[2]!.trim(), `${macroPath}:${line}`).map((value) => value.replace(/:req$/, "")), body: [] };
      continue;
    }
    if (statement === ".endm") {
      if (!current) throw new Error(`orphan .endm at ${macroPath}:${line}`);
      if (rawMacros.has(current.name)) throw new Error(`duplicate macro ${current.name} at ${macroPath}:${line}`);
      rawMacros.set(current.name, current);
      current = undefined;
      continue;
    }
    if (current) current.body.push({ line, text: statement });
  }
  if (current) throw new Error(`unterminated macro ${current.name} at ${macroPath}:${current.line}`);
  const result = new Map<string, Macro>();
  const resolving = new Set<string>();
  const resolveMacro = (name: string): Macro => {
    const known = result.get(name);
    if (known) return known;
    const raw = rawMacros.get(name);
    if (!raw) throw new Error(`unknown nested macro ${name}`);
    if (resolving.has(name)) throw new Error(`recursive macro expansion ${name} at ${macroPath}:${raw.line}`);
    resolving.add(name);
    const opcodes: number[] = [];
    for (const body of raw.body) {
      const literal = /^\.byte\s+(0x[0-9a-fA-F]+)\s*$/.exec(body.text);
      if (literal) {
        opcodes.push(Number.parseInt(literal[1]!, 16));
        continue;
      }
      const nested = /^([A-Za-z_][A-Za-z0-9_]*)\b/.exec(body.text);
      if (nested && rawMacros.has(nested[1]!)) {
        opcodes.push(...resolveMacro(nested[1]!).opcodes);
        continue;
      }
      // Operand-emission directives and substitutions are intentionally not
      // decoded. Any other macro-body source is an ambiguity rather than a
      // silently guessed opcode dependency.
      if (!/^\.(?:byte|2byte|4byte)\s+/.test(body.text)) {
        throw new Error(`unsupported macro body at ${macroPath}:${body.line}: ${body.text}`);
      }
    }
    if (!opcodes.length) throw new Error(`macro ${name} has no opcode binding at ${macroPath}:${raw.line}`);
    const resolved = { name, line: raw.line, parameters: raw.parameters, opcodes };
    result.set(name, resolved);
    resolving.delete(name);
    return resolved;
  };
  for (const name of rawMacros.keys()) resolveMacro(name);
  if (!result.size) throw new Error(`no macros parsed from ${macroPath}`);
  return result;
}

function parseLabels(text: string, macros: Map<string, Macro>): Map<string, Label> {
  const labels = new Map<string, Label>();
  let current: Label | undefined;
  for (const [index, raw] of text.split("\n").entries()) {
    const line = index + 1;
    const statement = stripComment(raw).trim();
    if (!statement || statement.startsWith("#")) continue;
    const labelMatch = /^([.$A-Za-z_][.$A-Za-z0-9_]*)(?:::|:)$/.exec(statement);
    if (labelMatch) {
      const name = labelMatch[1]!;
      if (labels.has(name)) throw new Error(`duplicate label ${name} at ${sourcePath}:${line}`);
      current = { name, line, instructions: [] };
      labels.set(name, current);
      continue;
    }
    if (statement.startsWith(".")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+(.*))?$/.exec(statement);
    if (!match) throw new Error(`unsupported source syntax at ${sourcePath}:${line}: ${statement}`);
    const macro = macros.get(match[1]!);
    if (!macro) {
      // Includes and assembler configuration precede the script table; an
      // unrecognised executable statement inside a label is ambiguous.
      if (current) throw new Error(`unsupported instruction ${match[1]} at ${sourcePath}:${line}`);
      continue;
    }
    if (!current) throw new Error(`instruction ${macro.name} has no label at ${sourcePath}:${line}`);
    const operands = splitOperands(match[2] ?? "", `${sourcePath}:${line}`);
    if (operands.length !== macro.parameters.length) {
      throw new Error(`operand arity mismatch for ${macro.name} at ${sourcePath}:${line}: expected ${macro.parameters.length}, got ${operands.length}`);
    }
    current.instructions.push({ line, macro: macro.name, operands, opcodes: macro.opcodes });
  }
  return labels;
}

function parseHandlers(text: string): Map<number, string> {
  const declaration = text.indexOf("static const BattleAICmdFunc sBattleAICmdTable[]");
  if (declaration < 0) throw new Error(`missing sBattleAICmdTable in ${commandPath}`);
  const open = text.indexOf("{", declaration);
  const close = text.indexOf("};", open);
  if (open < 0 || close < 0) throw new Error(`unterminated sBattleAICmdTable in ${commandPath}`);
  const handlers = new Map<number, string>();
  for (const raw of text.slice(open + 1, close).split("\n")) {
    if (!raw.trim()) continue;
    const row = /^\s*(Cmd_[A-Za-z0-9_]+)\s*,\s*\/\/\s*0x([0-9a-fA-F]+)\s*$/.exec(raw);
    if (!row) throw new Error(`unsupported sBattleAICmdTable row: ${raw.trim()}`);
    const opcode = Number.parseInt(row[2]!, 16);
    if (handlers.has(opcode)) throw new Error(`duplicate AI command opcode 0x${opcode.toString(16)}`);
    handlers.set(opcode, row[1]!);
  }
  if (!handlers.size) throw new Error(`no AI command handlers parsed from ${commandPath}`);
  return handlers;
}

function rootsFromScriptTable(text: string): Array<{ flag: string; root: string; line: number }> {
  const table = text.indexOf("gBattleAI_ScriptsTable::");
  if (table < 0) throw new Error(`missing gBattleAI_ScriptsTable in ${sourcePath}`);
  const lines = text.slice(table).split("\n");
  const roots: Array<{ flag: string; root: string; line: number }> = [];
  let line = text.slice(0, table).split("\n").length;
  for (const raw of lines.slice(1)) {
    line += 1;
    if (/^[.$A-Za-z_][.$A-Za-z0-9_]*:$/.test(stripComment(raw).trim())) break;
    const row = /^\s*\.4byte\s+([A-Za-z_][A-Za-z0-9_]*)\s+@\s+(AI_SCRIPT_[A-Z0-9_]+)\s*$/.exec(raw);
    if (row) roots.push({ root: row[1]!, flag: row[2]!, line });
  }
  const expected = ["AI_SCRIPT_CHECK_BAD_MOVE", "AI_SCRIPT_TRY_TO_FAINT", "AI_SCRIPT_CHECK_VIABILITY"];
  if (roots.length < expected.length || roots.slice(0, expected.length).some((row, index) => row.flag !== expected[index])) {
    throw new Error("Factory AI roots no longer occupy the first three script-table entries");
  }
  return roots.slice(0, expected.length);
}

function destination(instruction: Instruction): { kind: "branch" | "call" | "goto"; target: string } | undefined {
  if (instruction.macro === "call" || instruction.macro === "goto") {
    return { kind: instruction.macro, target: instruction.operands[0]! };
  }
  if (instruction.macro.startsWith("if_")) return { kind: "branch", target: instruction.operands.at(-1)! };
  return undefined;
}

function policyMasks(text: string): Array<{ mask: 1 | 7; flags: string[] }> {
  const fixture = JSON.parse(text) as { schema?: string; branches?: Array<{ mask: number; flags: string[] }> };
  if (fixture.schema !== "factory-ai-policy/v1" || !fixture.branches) throw new Error(`invalid Factory AI policy fixture at ${policyPath}`);
  const unique = new Map<number, string[]>();
  for (const branch of fixture.branches) if (branch.mask === 1 || branch.mask === 7) unique.set(branch.mask, branch.flags);
  const masks = [1, 7].map((mask) => ({ mask: mask as 1 | 7, flags: unique.get(mask) }));
  if (masks.some(({ flags }) => !flags)) throw new Error(`Factory AI policy fixture no longer contains masks 1 and 7`);
  if (masks[0]!.flags!.join(",") !== "AI_SCRIPT_CHECK_BAD_MOVE" || masks[1]!.flags!.join(",") !== "AI_SCRIPT_CHECK_BAD_MOVE,AI_SCRIPT_TRY_TO_FAINT,AI_SCRIPT_CHECK_VIABILITY") {
    throw new Error("Factory AI policy masks 1/7 no longer select the expected scorer flags");
  }
  return masks as Array<{ mask: 1 | 7; flags: string[] }>;
}

const source = readFileSync(sourcePath, "utf8");
const macroSource = readFileSync(macroPath, "utf8");
const commandSource = readFileSync(commandPath, "utf8");
const policySource = readFileSync(policyPath, "utf8");
const macros = parseMacros(macroSource);
const labels = parseLabels(source, macros);
const handlers = parseHandlers(commandSource);
const tableRoots = rootsFromScriptTable(source);
const masks = policyMasks(policySource);
const rootByFlag = new Map(tableRoots.map((root) => [root.flag, root]));

const roots = masks.map(({ mask, flags }) => ({
  mask,
  flags,
  labels: flags.map((flag) => {
    const root = rootByFlag.get(flag);
    if (!root) throw new Error(`missing script-table root for ${flag}`);
    if (!labels.has(root.root)) throw new Error(`missing root label ${root.root} from ${sourcePath}:${root.line}`);
    return { name: root.root, sourceLine: root.line };
  }),
}));
const rootNames = new Set(roots.flatMap(({ labels: selected }) => selected.map(({ name }) => name)));

const reachable = new Set<string>();
const queue = [...roots[1]!.labels.map(({ name }) => name)]; // mask 7 is the complete Factory catalogue.
const edges: Array<{ from: string; sourceLine: number; macro: string; kind: "branch" | "call" | "goto"; to: string }> = [];
while (queue.length) {
  const name = queue.shift()!;
  if (reachable.has(name)) continue;
  const label = labels.get(name);
  if (!label) throw new Error(`missing reachable label ${name}`);
  reachable.add(name);
  for (const instruction of label.instructions) {
    const edge = destination(instruction);
    if (!edge) continue;
    if (!labels.has(edge.target)) throw new Error(`missing ${edge.kind} target ${edge.target} at ${sourcePath}:${instruction.line}`);
    edges.push({ from: name, sourceLine: instruction.line, macro: instruction.macro, kind: edge.kind, to: edge.target });
    if (!reachable.has(edge.target)) queue.push(edge.target);
  }
}

const reachableLabels = [...labels.values()].filter((label) => reachable.has(label.name)).map((label, order) => ({
  order,
  name: label.name,
  sourceLine: label.line,
  root: rootNames.has(label.name),
  instructions: label.instructions.map((instruction, instructionOrder) => {
    const opcodes = instruction.opcodes.map((value) => {
      const handler = handlers.get(value);
      if (!handler) throw new Error(`missing native handler for opcode 0x${value.toString(16)} used at ${sourcePath}:${instruction.line}`);
      return { value, hex: `0x${value.toString(16).padStart(2, "0")}`, handler };
    });
    return {
      order: instructionOrder,
      sourceLine: instruction.line,
      macro: instruction.macro,
      macroSourceLine: macros.get(instruction.macro)!.line,
      operands: instruction.operands,
      opcodes,
    };
  }),
}));
const dependencies = new Map<number, { value: number; hex: string; handler: string; macros: Set<string> }>();
for (const label of reachableLabels) for (const instruction of label.instructions) for (const opcode of instruction.opcodes) {
  const current = dependencies.get(opcode.value) ?? { ...opcode, macros: new Set<string>() };
  current.macros.add(instruction.macro);
  dependencies.set(opcode.value, current);
}

const catalog = {
  schema: "factory-ai-script-catalog/v1",
  source: {
    scripts: { file: "data/battle_ai_scripts.s", sha256: sha256(source) },
    macros: { file: "asm/macros/battle_ai_script.inc", sha256: sha256(macroSource) },
    commandHandlers: { file: "src/battle_ai_script_commands.c", sha256: sha256(commandSource), table: "sBattleAICmdTable" },
    policy: { file: "src/data/gen/factory-ai-policy.json", sha256: sha256(policySource), schema: "factory-ai-policy/v1" },
  },
  masks: roots,
  graph: {
    roots: [...rootNames],
    labels: reachableLabels,
    edges,
  },
  dependencies: [...dependencies.values()].sort((left, right) => left.value - right.value).map(({ macros: names, ...dependency }) => ({ ...dependency, macros: [...names].sort() })),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(catalog)}\n`);
console.log(`wrote ${outputPath}`);
