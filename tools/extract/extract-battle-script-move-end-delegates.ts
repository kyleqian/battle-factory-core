// Dev-time receipt for the exact AbilityBattleEffects and ItemBattleEffects
// case bodies reached by Cmd_moveend. This deliberately preserves C syntax
// and lexical candidates only; it does not define a delegate API or execute
// any battle rule.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-move-end-delegates.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-move-end-delegates.ts --out-dir /tmp/move-end-delegates

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const SOURCE_FILE = "src/battle_util.c";
const outIndex = process.argv.indexOf("--out-dir");
const outArg = outIndex < 0 ? undefined : process.argv[outIndex + 1];
if (outIndex >= 0 && !outArg) throw new Error("--out-dir requires a directory");
const OUT_DIR = outArg === undefined
  ? join(RUN_ROOT, "src", "data", "gen")
  : isAbsolute(outArg) ? outArg : join(RUN_ROOT, outArg);

type SourceLine = { line: number; raw: string };
type RequestedCase = { mode: string; helper: "AbilityBattleEffects" | "ItemBattleEffects" };

const requestedCases: readonly RequestedCase[] = [
  { helper: "AbilityBattleEffects", mode: "ABILITYEFFECT_SYNCHRONIZE" },
  { helper: "AbilityBattleEffects", mode: "ABILITYEFFECT_ON_DAMAGE" },
  { helper: "AbilityBattleEffects", mode: "ABILITYEFFECT_IMMUNITY" },
  { helper: "AbilityBattleEffects", mode: "ABILITYEFFECT_ATK_SYNCHRONIZE" },
  { helper: "ItemBattleEffects", mode: "ITEMEFFECT_MOVE_END" },
  { helper: "ItemBattleEffects", mode: "ITEMEFFECT_KINGSROCK_SHELLBELL" },
];

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function stripComment(raw: string): string {
  return raw.replace(/\/\/.*$/, "");
}

function sourceText(lines: readonly SourceLine[]): string {
  return lines.map(({ raw }) => raw).join("\n");
}

function findFunction(lines: readonly string[], symbol: string): SourceLine[] {
  const start = lines.findIndex((raw) => new RegExp(`^u8 ${symbol}\\(`).test(raw));
  if (start < 0) throw new Error(`missing ${symbol}`);
  // Battle utility bodies contain legacy macro expansions and comments.  A
  // line-oriented source range is more robust here: top-level definitions are
  // unindented and their opening brace is the following line.
  for (let index = start + 1; index + 1 < lines.length; index++) {
    if (/^[A-Za-z_][A-Za-z0-9_ \t*]+\([^;]*\)$/.test(lines[index]!) && lines[index + 1] === "{") {
      return lines.slice(start, index).map((raw, offset) => ({ line: start + offset + 1, raw }));
    }
  }
  throw new Error(`unterminated ${symbol}`);
}

function caseBody(functionLines: readonly SourceLine[], mode: string): SourceLine[] {
  const outerIndent = mode.startsWith("ABILITYEFFECT_") ? 8 : 4;
  const start = functionLines.findIndex(({ raw }) =>
    new RegExp(`^ {${outerIndent}}case ${mode}:`).test(raw),
  );
  if (start < 0) throw new Error(`missing selected case ${mode}`);
  const next = functionLines.findIndex(
    ({ raw }, index) => index > start && new RegExp(`^ {${outerIndent}}case (?:ABILITYEFFECT|ITEMEFFECT)_`).test(raw),
  );
  // The terminal selected case ends at the caseID switch's closing brace;
  // retain neither the shared function return nor its closing brace.
  const switchClose = functionLines.findIndex(
    ({ raw }, index) => index > start && /^ {4}}\s*$/.test(raw),
  );
  const end = next < 0 ? switchClose : next;
  if (end < 0) throw new Error(`unterminated selected case ${mode}`);
  return functionLines.slice(start, end);
}

function calls(lines: readonly SourceLine[]): Array<{ line: number; symbol: string; raw: string }> {
  const ignored = new Set(["if", "for", "while", "switch", "sizeof"]);
  return lines.flatMap(({ line, raw }) => [...stripComment(raw).matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
    .map((match) => ({ line, symbol: match[1]!, raw }))
    .filter(({ symbol }) => !ignored.has(symbol)));
}

function lexicalFacts(lines: readonly SourceLine[]) {
  const actionLine = /;\s*(?:\/\/.*)?$/;
  const mutation = /(?:\+\+|--|\+=|-=|&=|\|=|(?<![=!<>])=(?!=))/;
  const globalTokens = unique(lines.flatMap(({ raw }) =>
    [...stripComment(raw).matchAll(/\bg[A-Z][A-Za-z0-9_]*/g)].map((match) => match[0]),
  )).sort();
  const branches = lines.flatMap(({ line, raw }) => {
    const code = stripComment(raw).trim();
    return /^(?:if|else if|else|switch|case |for|while|do\b)/.test(code)
      ? [{ line, kind: code.split(/\s|\(/, 1)[0]!, raw }]
      : [];
  });
  const actions = lines.flatMap(({ line, raw }) => {
    const code = stripComment(raw).trim();
    return actionLine.test(raw) && !/^(?:if|else if|for|while|switch)\b/.test(code)
      ? [{ line, raw }]
      : [];
  });
  const randomSites = lines.flatMap(({ line, raw }, index) => {
    if (!raw.includes("Random()")) return [];
    const nearestPredicate = [...lines.slice(0, index + 1)].reverse()
      .map(({ raw: candidate }) => stripComment(candidate).trim())
      .find((candidate) => /^(?:if|while|for)\b/.test(candidate)) ?? null;
    return [{ line, raw, enclosingPredicateRaw: nearestPredicate }];
  });
  const allCalls = calls(lines);
  const controllerEmissions = allCalls.filter(({ symbol }) => symbol.startsWith("BtlController_"));
  const pendingMarks = allCalls.filter(({ symbol }) => symbol === "MarkBattlerForControllerExec");
  const activeBattlerOwnership = lines
    .filter(({ raw }) => /\bgActiveBattler\b|\bgPotentialItemEffectBattler\b|MarkBattlerForControllerExec/.test(raw))
    .map(({ line, raw }) => ({ line, raw }));
  const transfers = lines.flatMap(({ line, raw }, index) => {
    const code = stripComment(raw);
    const target = code.match(/BattleScript_[A-Za-z0-9_]+/)?.[0]
      ?? lines.slice(index, index + 3).map(({ raw: next }) => stripComment(next).match(/BattleScript_[A-Za-z0-9_]+/)?.[0]).find(Boolean)
      ?? null;
    if (/BattleScript(?:Push|PushCursor|PushCursorAndCallback|Execute|Pop)\s*\(/.test(code)) {
      return [{ line, kind: "call", raw, targetScript: target }];
    }
    if (/gBattlescriptCurrInstr\s*=/.test(code)) {
      return [{ line, kind: "cursor-assignment", raw, targetScript: target }];
    }
    return [];
  });
  const loops = lines.flatMap(({ line, raw }) => {
    const code = stripComment(raw).trim();
    return /^(?:for|while|do\b)/.test(code) ? [{ line, raw }] : [];
  });
  const globals = globalTokens.map((name) => {
    const references = lines.flatMap(({ line, raw }) => {
      const column = raw.indexOf(name);
      return column < 0 ? [] : [{ line, column: column + 1, raw }];
    });
    return {
      name,
      references,
      writeCandidateLines: references
        .filter(({ raw }) => mutation.test(stripComment(raw)))
        .map(({ line, raw }) => ({ line, raw })),
    };
  });
  return {
    orderedBranches: branches,
    orderedActions: actions,
    randomSites,
    controllerEmissions,
    pendingMarks,
    activeBattlerOwnership,
    scriptTransfers: transfers,
    loops,
    cursorReferences: lines.filter(({ raw }) => raw.includes("gBattlescriptCurrInstr")),
    durableGlobalReferences: globals,
    directCallCandidates: unique(allCalls.map(({ symbol }) => symbol)),
    analysisNote: "Lexical receipt: branch/action ordering follows source line order. writeCandidateLines are mutation-syntax candidates, not a semantic alias analysis; Random reasons are the nearest preceding source control predicate in the selected body.",
  };
}

const source = readFileSync(join(RUN_ROOT, "reference", "pokeemerald", SOURCE_FILE), "utf8");
const sourceLines = source.split("\n");
const helpers = Object.fromEntries(
  (["AbilityBattleEffects", "ItemBattleEffects"] as const).map((symbol) => {
    const lines = findFunction(sourceLines, symbol);
    return [symbol, {
      symbol,
      source: {
        startLine: lines[0]!.line,
        endLine: lines.at(-1)!.line,
        textSha256: sha256(sourceText(lines)),
        rawLines: lines,
      },
      sharedPrelude: (() => {
        const outerIndent = symbol === "AbilityBattleEffects" ? 8 : 4;
        const firstCase = lines.findIndex(({ raw }) => new RegExp(`^ {${outerIndent}}case (?:ABILITYEFFECT|ITEMEFFECT)_`).test(raw));
        const prelude = lines.slice(0, firstCase);
        return { startLine: prelude[0]!.line, endLine: prelude.at(-1)!.line, textSha256: sha256(sourceText(prelude)), rawLines: prelude };
      })(),
    }];
  }),
);

const cases = requestedCases.map(({ helper, mode }) => {
  const functionLines = helpers[helper].source.rawLines;
  const lines = caseBody(functionLines, mode);
  return {
    helper,
    mode,
    source: {
      startLine: lines[0]!.line,
      endLine: lines.at(-1)!.line,
      textSha256: sha256(sourceText(lines)),
      rawLines: lines,
    },
    lexicalFacts: lexicalFacts(lines),
  };
});

if (cases.length !== 6 || new Set(cases.map(({ mode }) => mode)).size !== 6) {
  throw new Error("expected exactly the six requested move-end delegate modes");
}
if (cases.some(({ mode, source: entry }) => {
  const outerIndent = mode.startsWith("ABILITYEFFECT_") ? 8 : 4;
  return entry.rawLines.some(({ raw }) => new RegExp(`^ {${outerIndent}}case (?:ABILITYEFFECT|ITEMEFFECT)_`).test(raw) && !raw.includes(mode));
})) {
  throw new Error("selected source body crossed into an unrelated outer helper mode");
}

const output = {
  schema: "battle-script-move-end-delegates/v1",
  source: { file: SOURCE_FILE, sha256: sha256(source) },
  requestedModes: requestedCases,
  helpers,
  cases,
  counts: {
    requestedModes: cases.length,
    abilityModes: cases.filter(({ helper }) => helper === "AbilityBattleEffects").length,
    itemModes: cases.filter(({ helper }) => helper === "ItemBattleEffects").length,
    randomSites: cases.reduce((total, entry) => total + entry.lexicalFacts.randomSites.length, 0),
    controllerEmissions: cases.reduce((total, entry) => total + entry.lexicalFacts.controllerEmissions.length, 0),
    pendingMarks: cases.reduce((total, entry) => total + entry.lexicalFacts.pendingMarks.length, 0),
    scriptTransfers: cases.reduce((total, entry) => total + entry.lexicalFacts.scriptTransfers.length, 0),
    loops: cases.reduce((total, entry) => total + entry.lexicalFacts.loops.length, 0),
  },
  extractionNote: "Selected outer switch case bodies include all nested switch branches transitively reached after Cmd_moveend selects each helper mode. No runtime delegate shape, battle semantics, or controller behavior is inferred by this receipt.",
};

mkdirSync(OUT_DIR, { recursive: true });
const outputPath = join(OUT_DIR, "battle-script-move-end-delegates.json");
writeFileSync(outputPath, `${JSON.stringify(output)}\n`);
console.log(`wrote ${outputPath} (${output.counts.requestedModes} requested modes, ${output.counts.randomSites} Random sites)`);
