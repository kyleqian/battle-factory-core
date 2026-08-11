// Dev-time structural receipt for the pinned Cmd_moveend implementation and
// every assembled B_SCR_OP_MOVEEND instruction.
//
// This intentionally extracts source syntax, not battle semantics.  The
// resulting case bodies and call/global/control candidates are the evidence
// boundary from which a source-complete typed handler can be designed.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-move-end-facts.ts
//   node --experimental-strip-types tools/extract/extract-battle-script-move-end-facts.ts --out-dir /tmp/move-end-facts

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const COMMAND_FILE = "src/battle_script_commands.c";
const CONSTANTS_FILE = "include/constants/battle_script_commands.h";
const OBSERVATIONS_FILE = "src/data/gen/battle-script-opcode-observations.json";
const HANDLERS_FILE = "src/data/gen/battle-script-command-handlers.json";
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const OUT_DIR = outDirArg === undefined
  ? join(RUN_ROOT, "src", "data", "gen")
  : isAbsolute(outDirArg) ? outDirArg : join(RUN_ROOT, outDirArg);

type OpcodeObservation = Readonly<{
  index: number;
  opcode: Readonly<{ id: number; name: string }>;
  sourceInvocation: Readonly<{
    label: string;
    labelLine: number;
    line: number;
    mnemonic: string;
  }>;
  operandWidths: readonly number[];
  operandEmissions: readonly Readonly<{
    expressions: readonly string[];
    macroEmission: Readonly<{
      wrapperPath: readonly string[];
    }>;
  }>[];
}>;

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function callCandidates(text: string): string[] {
  const ignored = new Set(["if", "for", "while", "switch", "sizeof"]);
  return unique(
    [...text.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
      .map((match) => match[1]!)
      .filter((symbol) => !ignored.has(symbol)),
  );
}

const commandSource = readFileSync(join(REF, COMMAND_FILE), "utf8");
const constantsSource = readFileSync(join(REF, CONSTANTS_FILE), "utf8");
const observationsText = readFileSync(join(RUN_ROOT, OBSERVATIONS_FILE), "utf8");
const handlersText = readFileSync(join(RUN_ROOT, HANDLERS_FILE), "utf8");
const observations = JSON.parse(observationsText) as {
  schema: string;
  instructionStarts: OpcodeObservation[];
};
const handlers = JSON.parse(handlersText) as {
  schema: string;
  slots: Readonly<{
    index: number;
    opcode: string;
    handler: Readonly<{
      symbol: string;
      definition: Readonly<{ startLine: number; endLine: number }>;
    }>;
  }>[];
};

const moveEndSlot = handlers.slots.find((slot) => slot.index === 73);
if (
  !moveEndSlot
  || moveEndSlot.opcode !== "B_SCR_OP_MOVEEND"
  || moveEndSlot.handler.symbol !== "Cmd_moveend"
) {
  throw new Error("slot 73 is not the pinned Cmd_moveend handler");
}

const commandLines = commandSource.split("\n");
const definition = moveEndSlot.handler.definition;
const handlerLines = commandLines
  .slice(definition.startLine - 1, definition.endLine)
  .map((raw, index) => ({ line: definition.startLine + index, raw }));
const handlerText = handlerLines.map(({ raw }) => raw).join("\n");

const constants = [...constantsSource.matchAll(
  /^#define[ \t]+(MOVEEND_[A-Z0-9_]+)[ \t]+([0-9]+)[ \t]*$/gm,
)].map((match) => ({
  name: match[1]!,
  value: Number(match[2]),
  line: constantsSource.slice(0, match.index).split("\n").length,
  raw: match[0]!,
}));
if (
  constants.length !== 18
  || constants.some((entry, index) => entry.value !== index)
  || constants.at(-1)?.name !== "MOVEEND_COUNT"
) {
  throw new Error("move-end constants are not the expected contiguous 0..17 source range");
}

const caseStarts = handlerLines.flatMap(({ line, raw }, index) => {
  const match = raw.match(/^\s*case\s+(MOVEEND_[A-Z0-9_]+):/);
  return match ? [{ index, line, name: match[1]! }] : [];
});
const executableConstants = constants.slice(0, -1);
if (
  caseStarts.length !== 18
  || new Set(caseStarts.map(({ name }) => name)).size !== constants.length
  || constants.some(({ name }) => !caseStarts.some((entry) => entry.name === name))
) {
  throw new Error("Cmd_moveend switch cases do not cover the source constants exactly");
}

const endModeLineIndex = handlerLines.findIndex(({ raw }) =>
  raw.includes("if (endMode == 1 && effect == FALSE)")
);
if (endModeLineIndex < 0) throw new Error("Cmd_moveend end-mode postlude not found");

const cases = caseStarts.map((entry, index) => {
  const nextStart = caseStarts[index + 1]?.index;
  let endIndex = nextStart === undefined ? endModeLineIndex - 1 : nextStart - 1;
  while (
    endIndex > entry.index
    && (handlerLines[endIndex]!.raw.trim() === "" || handlerLines[endIndex]!.raw.trim() === "}")
  ) {
    endIndex -= 1;
  }
  const rawLines = handlerLines.slice(entry.index, endIndex + 1);
  const text = rawLines.map(({ raw }) => raw).join("\n");
  const code = text.replace(/\/\/.*$/gm, "");
  return {
    state: constants.find(({ name }) => name === entry.name)!,
    source: {
      startLine: entry.line,
      endLine: rawLines.at(-1)!.line,
      textSha256: sha256(text),
      rawLines,
    },
    lexicalFacts: {
      callCandidates: callCandidates(code),
      globalReferences: unique(
        [...code.matchAll(/\b(?:g|s)[A-Z][A-Za-z0-9_]*\b/g)].map((match) => match[0]),
      ),
      battleScriptTargets: unique(
        [...code.matchAll(/\bBattleScript_[A-Za-z0-9_]+\b/g)].map((match) => match[0]),
      ),
      controllerCallCandidates: callCandidates(code).filter((symbol) =>
        symbol.startsWith("BtlController_") || symbol === "MarkBattlerForControllerExec"
      ),
      explicitReturnLines: rawLines
        .filter(({ raw }) => /^\s*return;\s*$/.test(raw))
        .map(({ line, raw }) => ({ line, raw })),
      mutationCandidateLines: rawLines
        .filter(({ raw }) =>
          /(?:\+\+|--|\+=|-=|&=|\|=|(?<![=!<>])=(?!=))/.test(
            raw.replace(/\/\/.*$/, ""),
          )
        )
        .map(({ line, raw }) => ({ line, raw })),
    },
  };
});

if (cases.slice(0, -1).length !== executableConstants.length) {
  throw new Error("move-end executable case coverage is incomplete");
}

const starts = observations.instructionStarts
  .filter((start) => start.opcode.id === 73)
  .map((start) => {
    if (
      start.opcode.name !== "B_SCR_OP_MOVEEND"
      || start.operandWidths.join(",") !== "1,1"
      || start.operandEmissions.length !== 2
      || start.operandEmissions.some((operand) => operand.expressions.length !== 1)
    ) {
      throw new Error(`unexpected opcode-73 emission at instruction start ${start.index}`);
    }
    return {
      instructionStartIndex: start.index,
      source: start.sourceInvocation,
      operands: {
        endModeExpression: start.operandEmissions[0]!.expressions[0]!,
        endStateExpression: start.operandEmissions[1]!.expressions[0]!,
        widths: start.operandWidths,
      },
      wrapperPath: start.operandEmissions[0]!.macroEmission.wrapperPath,
    };
  });
if (starts.length !== 24) throw new Error(`expected 24 opcode-73 starts, got ${starts.length}`);

const preludeEnd = caseStarts[0]!.index - 1;
const preludeLines = handlerLines.slice(0, preludeEnd + 1);
const postludeLines = handlerLines.slice(endModeLineIndex);
const output = {
  schema: "battle-script-move-end-facts/v1",
  source: {
    commandSource: { file: COMMAND_FILE, sha256: sha256(commandSource) },
    constantsSource: { file: CONSTANTS_FILE, sha256: sha256(constantsSource) },
    opcodeObservations: {
      file: OBSERVATIONS_FILE,
      sha256: sha256(observationsText),
      schema: observations.schema,
    },
    commandHandlers: {
      file: HANDLERS_FILE,
      sha256: sha256(handlersText),
      schema: handlers.schema,
    },
    handler: {
      symbol: "Cmd_moveend",
      startLine: definition.startLine,
      endLine: definition.endLine,
      textSha256: sha256(handlerText),
    },
  },
  counts: {
    constants: constants.length,
    executableStates: executableConstants.length,
    switchCases: cases.length,
    opcodeStarts: starts.length,
    endModes: Object.fromEntries(
      ["0", "1", "2"].map((mode) => [
        mode,
        starts.filter(({ operands }) => operands.endModeExpression === mode).length,
      ]),
    ),
    wrappers: Object.fromEntries(
      [...new Set(starts.map(({ source }) => source.mnemonic))]
        .sort()
        .map((mnemonic) => [
          mnemonic,
          starts.filter(({ source }) => source.mnemonic === mnemonic).length,
        ]),
    ),
  },
  constants,
  handlerStructure: {
    prelude: {
      startLine: preludeLines[0]!.line,
      endLine: preludeLines.at(-1)!.line,
      textSha256: sha256(preludeLines.map(({ raw }) => raw).join("\n")),
      rawLines: preludeLines,
      callCandidates: callCandidates(preludeLines.map(({ raw }) => raw).join("\n")),
    },
    cases,
    postlude: {
      startLine: postludeLines[0]!.line,
      endLine: postludeLines.at(-1)!.line,
      textSha256: sha256(postludeLines.map(({ raw }) => raw).join("\n")),
      rawLines: postludeLines,
    },
  },
  opcodeStarts: starts,
  registration: {
    implemented: true,
    rationale:
      "S10 step (iii): opcode 73 is registered under the (a)/(b) policy (ROADMAP S10's Executable-frontier "
      + "reset). The state loop, moveendState increment semantics, and endMode/endState postlude are "
      + "source-complete; seven states carry an explicit unsupported-branch barrier on their own real trigger "
      + "(src/engine/battleScriptMoveEndOpcode.ts) rather than requiring every delegate to be source-complete "
      + "first.",
  },
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "battle-script-move-end-facts.json"),
  `${JSON.stringify(output)}\n`,
);
console.log(
  `wrote battle-script-move-end-facts.json (${cases.length} cases, ${starts.length} opcode starts)`,
);
