import graphData from "../data/gen/battle-script-graph.json" with { type: "json" };
import macroEmissionData from "../data/gen/battle-script-macro-emissions.json" with { type: "json" };
import concreteProgramData from "../data/gen/battle-script-program.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };

export type BattleScriptOperandWidth = 1 | 2 | 4;

export type BattleScriptOperand = Readonly<{
  widthBytes: BattleScriptOperandWidth;
  expression: string;
  sourceMacro: string;
  sourceMacroLine: number;
  wrapperPath: readonly string[];
}>;

export type BattleScriptInstructionSource = Readonly<{
  label: string;
  labelLine: number;
  statementLine: number;
  invocationMnemonic: string;
  invocationMacroLine: number;
  sourceMacro: string;
  sourceMacroLine: number;
  wrapperPath: readonly string[];
}>;

export type BattleScriptInstruction = Readonly<{
  programCounter: number;
  opcodeId: number;
  opcodeName: string;
  dispatcher: string;
  operands: readonly BattleScriptOperand[];
  source: BattleScriptInstructionSource;
}>;

export type BattleScriptLabelEntry = Readonly<{
  label: string;
  sourceLine: number;
  programCounter: number;
  aliases: readonly string[];
}>;

export type BattleScriptProgram = Readonly<{
  instructions: readonly BattleScriptInstruction[];
  labelEntries: Readonly<Record<string, BattleScriptLabelEntry>>;
  labelsAtProgramCounter: readonly (readonly string[])[];
  counts: Readonly<{
    labels: number;
    sourceStatements: number;
    emittedStatements: number;
    instructions: number;
    topologyOpcodes: number;
  }>;
}>;

type WidthDirective = ".byte" | ".2byte" | ".4byte";
type OpcodeReference = {
  expressionIndex: number;
  opcode: string;
  opcodeId: number;
};
type ConcreteEmission = {
  directive: WidthDirective;
  expressions: string[];
  opcodeReferences: OpcodeReference[];
  macroEmission: {
    macro: string;
    line: number;
    wrapperPath: string[];
  };
};
type ConcreteStatement = {
  source: { label: string; labelLine: number; line: number };
  mnemonic: string;
  actualOperands: string[];
  macro: {
    declarationLine: number;
    parameterBindings: Array<{
      parameter: string;
      declaration: string;
      expression: string;
      supplied: boolean;
    }>;
  };
  emittedStatements: ConcreteEmission[];
};
type ConcreteBlock = {
  label: string;
  line: number;
  statements: ConcreteStatement[];
};
type ConcreteProgramCatalog = {
  counts: {
    labelBlocks: number;
    executableStatements: number;
    emittedStatements: number;
    opcodeReferences: number;
    topologyOpcodes: number;
  };
  blocks: ConcreteBlock[];
};
type GraphCatalog = {
  counts: { labels: number; executableInstructions: number };
  labels: Array<{
    name: string;
    line: number;
    statements: Array<{
      line: number;
      kind: "instruction" | "directive";
      mnemonic: string;
      operandTokens: string[];
    }>;
  }>;
};
type MacroEmissionCatalog = {
  macros: Array<{
    name: string;
    declarationLine: number;
    expandedEmissions: Array<{
      line: number;
      directive: WidthDirective;
      sourceMacro: string;
      expansionPath: string[];
    }>;
  }>;
};
type TopologyCatalog = {
  opcodes: Array<{ id: number; opcode: string; dispatcher: string }>;
};

const concreteCatalog = concreteProgramData as ConcreteProgramCatalog;
const graphCatalog = graphData as GraphCatalog;
const macroCatalog = macroEmissionData as MacroEmissionCatalog;
const topologyCatalog = topologyData as TopologyCatalog;

function freezeArray<T>(values: T[]): readonly T[] {
  return Object.freeze(values);
}

function widthForDirective(directive: WidthDirective): BattleScriptOperandWidth {
  switch (directive) {
    case ".byte":
      return 1;
    case ".2byte":
      return 2;
    case ".4byte":
      return 4;
  }
}

function assertCatalogJoins(): void {
  if (concreteCatalog.blocks.length !== concreteCatalog.counts.labelBlocks) {
    throw new Error("Battle Script program label count does not match its catalog");
  }
  if (graphCatalog.labels.length !== graphCatalog.counts.labels) {
    throw new Error("Battle Script graph label count does not match its catalog");
  }
  if (concreteCatalog.blocks.length !== graphCatalog.labels.length) {
    throw new Error("Battle Script program and graph label counts differ");
  }
  if (concreteCatalog.counts.topologyOpcodes !== topologyCatalog.opcodes.length) {
    throw new Error("Battle Script program and topology opcode counts differ");
  }

  const macros = new Map(macroCatalog.macros.map((macro) => [macro.name, macro]));
  if (macros.size !== macroCatalog.macros.length) {
    throw new Error("Battle Script macro-emission catalog contains duplicate macros");
  }

  let sourceStatementCount = 0;
  let emittedStatementCount = 0;
  for (const [blockIndex, block] of concreteCatalog.blocks.entries()) {
    const graphLabel = graphCatalog.labels[blockIndex]!;
    if (block.label !== graphLabel.name || block.line !== graphLabel.line) {
      throw new Error(`Battle Script program/graph label mismatch at block ${blockIndex}`);
    }
    const graphInstructions = graphLabel.statements.filter((statement) => statement.kind === "instruction");
    if (block.statements.length !== graphInstructions.length) {
      throw new Error(`Battle Script program/graph statement count mismatch at ${block.label}`);
    }
    sourceStatementCount += block.statements.length;

    for (const [statementIndex, statement] of block.statements.entries()) {
      const graphStatement = graphInstructions[statementIndex]!;
      if (
        statement.source.label !== block.label
        || statement.source.labelLine !== block.line
        || statement.source.line !== graphStatement.line
        || statement.mnemonic !== graphStatement.mnemonic
        || statement.actualOperands.length !== graphStatement.operandTokens.length
        || statement.actualOperands.some((operand, index) => operand !== graphStatement.operandTokens[index])
      ) {
        throw new Error(`Battle Script program/graph statement mismatch at ${block.label}:${statement.source.line}`);
      }

      const macro = macros.get(statement.mnemonic);
      if (!macro || macro.declarationLine !== statement.macro.declarationLine) {
        throw new Error(`Battle Script macro provenance mismatch at ${block.label}:${statement.source.line}`);
      }
      if (statement.emittedStatements.length !== macro.expandedEmissions.length) {
        throw new Error(`Battle Script emission count mismatch at ${block.label}:${statement.source.line}`);
      }
      emittedStatementCount += statement.emittedStatements.length;
      for (const [emissionIndex, emission] of statement.emittedStatements.entries()) {
        const macroEmission = macro.expandedEmissions[emissionIndex]!;
        if (
          emission.directive !== macroEmission.directive
          || emission.macroEmission.macro !== macroEmission.sourceMacro
          || emission.macroEmission.line !== macroEmission.line
          || emission.macroEmission.wrapperPath.join("\0") !== macroEmission.expansionPath.join("\0")
        ) {
          throw new Error(`Battle Script emission provenance mismatch at ${block.label}:${statement.source.line}`);
        }
      }
    }
  }

  if (
    sourceStatementCount !== concreteCatalog.counts.executableStatements
    || sourceStatementCount !== graphCatalog.counts.executableInstructions
  ) {
    throw new Error("Battle Script executable-statement totals differ");
  }
  if (emittedStatementCount !== concreteCatalog.counts.emittedStatements) {
    throw new Error("Battle Script emitted-statement total differs");
  }
}

function compileProgram(): BattleScriptProgram {
  assertCatalogJoins();

  const opcodesByName = new Map(topologyCatalog.opcodes.map((opcode) => [opcode.opcode, opcode]));
  if (opcodesByName.size !== topologyCatalog.opcodes.length) {
    throw new Error("Battle Script topology contains duplicate opcodes");
  }

  const mutableInstructions: BattleScriptInstruction[] = [];
  const rawLabelEntries: Array<{ label: string; sourceLine: number; programCounter: number }> = [];

  for (const block of concreteCatalog.blocks) {
    rawLabelEntries.push({
      label: block.label,
      sourceLine: block.line,
      programCounter: mutableInstructions.length,
    });

    for (const statement of block.statements) {
      let current:
        | {
          opcodeId: number;
          opcodeName: string;
          dispatcher: string;
          operands: BattleScriptOperand[];
          source: BattleScriptInstructionSource;
        }
        | undefined;

      const finishInstruction = () => {
        if (!current) return;
        mutableInstructions.push(Object.freeze({
          programCounter: mutableInstructions.length,
          opcodeId: current.opcodeId,
          opcodeName: current.opcodeName,
          dispatcher: current.dispatcher,
          operands: freezeArray(current.operands),
          source: Object.freeze(current.source),
        }));
        current = undefined;
      };

      for (const emission of statement.emittedStatements) {
        const referencesByIndex = new Map(emission.opcodeReferences.map((reference) => [reference.expressionIndex, reference]));
        if (referencesByIndex.size !== emission.opcodeReferences.length) {
          throw new Error(`duplicate opcode reference at ${block.label}:${statement.source.line}`);
        }

        for (const [expressionIndex, expression] of emission.expressions.entries()) {
          const reference = referencesByIndex.get(expressionIndex);
          if (reference) {
            finishInstruction();
            const topologyOpcode = opcodesByName.get(reference.opcode);
            if (
              !topologyOpcode
              || topologyOpcode.id !== reference.opcodeId
              || expression !== reference.opcode
            ) {
              throw new Error(`invalid opcode reference at ${block.label}:${statement.source.line}`);
            }
            current = {
              opcodeId: topologyOpcode.id,
              opcodeName: topologyOpcode.opcode,
              dispatcher: topologyOpcode.dispatcher,
              operands: [],
              source: Object.freeze({
                label: block.label,
                labelLine: block.line,
                statementLine: statement.source.line,
                invocationMnemonic: statement.mnemonic,
                invocationMacroLine: statement.macro.declarationLine,
                sourceMacro: emission.macroEmission.macro,
                sourceMacroLine: emission.macroEmission.line,
                wrapperPath: freezeArray([...emission.macroEmission.wrapperPath]),
              }),
            };
            continue;
          }

          if (!current) {
            throw new Error(`operand precedes an opcode at ${block.label}:${statement.source.line}`);
          }
          current.operands.push(Object.freeze({
            widthBytes: widthForDirective(emission.directive),
            expression,
            sourceMacro: emission.macroEmission.macro,
            sourceMacroLine: emission.macroEmission.line,
            wrapperPath: freezeArray([...emission.macroEmission.wrapperPath]),
          }));
        }
      }
      finishInstruction();
    }
  }

  if (mutableInstructions.length !== concreteCatalog.counts.opcodeReferences) {
    throw new Error(
      `Battle Script instruction total ${mutableInstructions.length} does not match `
      + `${concreteCatalog.counts.opcodeReferences} opcode starts`,
    );
  }

  const aliasesByPc = new Map<number, string[]>();
  for (const entry of rawLabelEntries) {
    aliasesByPc.set(entry.programCounter, [...(aliasesByPc.get(entry.programCounter) ?? []), entry.label]);
  }
  const labelEntries: Record<string, BattleScriptLabelEntry> = Object.create(null) as Record<string, BattleScriptLabelEntry>;
  for (const entry of rawLabelEntries) {
    if (labelEntries[entry.label]) throw new Error(`duplicate Battle Script label ${entry.label}`);
    labelEntries[entry.label] = Object.freeze({
      ...entry,
      aliases: freezeArray([...(aliasesByPc.get(entry.programCounter) ?? [])]),
    });
  }
  Object.freeze(labelEntries);

  const labelsAtProgramCounter = Array.from(
    { length: mutableInstructions.length + 1 },
    (_, programCounter) => freezeArray([...(aliasesByPc.get(programCounter) ?? [])]),
  );

  return Object.freeze({
    instructions: freezeArray(mutableInstructions),
    labelEntries,
    labelsAtProgramCounter: freezeArray(labelsAtProgramCounter),
    counts: Object.freeze({
      labels: rawLabelEntries.length,
      sourceStatements: concreteCatalog.counts.executableStatements,
      emittedStatements: concreteCatalog.counts.emittedStatements,
      instructions: mutableInstructions.length,
      topologyOpcodes: topologyCatalog.opcodes.length,
    }),
  });
}

let cachedProgram: BattleScriptProgram | undefined;

/**
 * Loads the committed source catalogs into immutable instruction-indexed IR.
 *
 * No assembly constants or battle semantics are evaluated here. Labels resolve
 * only to instruction starts, so consecutive empty source labels remain honest
 * aliases of the next emitted opcode.
 */
export function loadBattleScriptProgram(): BattleScriptProgram {
  cachedProgram ??= compileProgram();
  return cachedProgram;
}

export function resolveBattleScriptLabel(program: BattleScriptProgram, label: string): BattleScriptLabelEntry | undefined {
  return program.labelEntries[label];
}
