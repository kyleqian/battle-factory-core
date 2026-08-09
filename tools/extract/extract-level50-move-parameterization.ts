// Dev-time S10 coverage join for the Level-50 Factory move corpus.  This is
// deliberately a catalog join, not a mechanics classifier: it preserves the
// source-derived move table, Battle Script labels, roster usage, animation
// dependency IDs, plus a deliberately partial catalog of source dispatcher
// families. It promotes only individually audited selector families with a
// complete Battle Script control-flow witness, including implicit assembly
// fallthrough and branch guards; every other family remains unsupported.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-level50-move-parameterization.ts
//   node --experimental-strip-types tools/extract/extract-level50-move-parameterization.ts --out-dir /tmp/level50-move-parameterization
//
// Never imported at runtime - the production build only reads generated JSON.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const OUTPUT_DIR = outDirArg === undefined
  ? join(RUN_ROOT, "src", "data", "gen")
  : isAbsolute(outDirArg) ? outDirArg : join(RUN_ROOT, outDirArg);
const readJson = <T>(name: string): T => JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", name), "utf8")) as T;

type Move = {
  id: number;
  move: string;
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  effect: string;
  secondaryEffectChance: number;
  target: string[];
  priority: number;
  flags: string[];
};
type FrontierSet = { index: number; label: string; moves: string[] };
type TopologyMove = { id: number; move: string; effectId: number; effect: string; entryScript: string };
type Topology = {
  moves: TopologyMove[];
  level50FactoryReachableEffects: Array<{ id: number; effect: string; moves: Array<{ id: number; move: string }> }>;
};
type GraphStatement = {
  line: number;
  mnemonic: string;
  operandTokens: string[];
  labelOperands: string[];
};
type GraphLabel = { name: string; line: number; nextLabel: string | null; statements: GraphStatement[] };
type GraphEdge = {
  from: { label: string; line: number };
  to: { label: string; line: number } | null;
  kind: string;
  provenance: { macro?: string };
};
type ConditionalGuard = {
  from: { label: string; line: number };
  command: { macro: string };
  operands: Array<{ parameter: string; token: string }>;
  takenDestination: { label: string; line: number } | null;
  notTakenSuccessor: { label: string; line: number } | null;
};
type Graph = {
  labels: GraphLabel[];
  controlFlow: {
    edges: GraphEdge[];
    conditionalGuards: ConditionalGuard[];
  };
};
type ProgramStatement = {
  source: { line: number };
  mnemonic: string;
  actualOperands: string[];
};
type ProgramBlock = { label: string; line: number; statements: ProgramStatement[] };
type Program = { blocks: ProgramBlock[] };
type Inventory = { tiers: { level50: { moves: Array<{ id: number; move: string; animationScript: string }> } } };
type AnimationComponents = { moves: Array<{ id: number; move: string; rootScript: string; componentIds: string[] }> };
type HeldItems = { count: number; entries: Array<{ itemTableId: number; holdEffect: string; holdEffectParam: number }> };
type HoldEffects = { items: Array<{ item: string; holdEffect: string; holdEffectParam: number }> };
type AbilityDisplay = { abilities: Record<string, { name: string; description: string }> };

const moves = readJson<{ moves: Move[] }>("moves.json").moves;
const frontierSets = readJson<{ count: number; entries: FrontierSet[] }>("battle-frontier-mons.json");
const topology = readJson<Topology>("battle-script-topology.json");
const graph = readJson<Graph>("battle-script-graph.json");
const program = readJson<Program>("battle-script-program.json");
const inventory = readJson<Inventory>("factory-animation-inventory.json");
const animationComponents = readJson<AnimationComponents>("battle-animation-components.json");
const heldItems = readJson<HeldItems>("battle-frontier-held-items.json");
const holdEffects = readJson<HoldEffects>("item-hold-effects.json");
const abilityDisplay = readJson<AbilityDisplay>("summary-info.json");
const battleUtilSource = readFileSync(join(RUN_ROOT, "reference", "pokeemerald", "src", "battle_util.c"), "utf8");
const battleScriptCommandsSource = readFileSync(join(RUN_ROOT, "reference", "pokeemerald", "src", "battle_script_commands.c"), "utf8");
const battleHeaderSource = readFileSync(join(RUN_ROOT, "reference", "pokeemerald", "include", "battle.h"), "utf8");

if (moves.length !== 355 || moves.some((move, id) => move.id !== id)) throw new Error("moves.json must be the complete indexed move table");
if (frontierSets.count !== 882 || frontierSets.entries.length !== 882) throw new Error("expected all 882 Frontier set rows");
const level50Sets = frontierSets.entries.filter((set) => set.index >= 0 && set.index <= 849);
if (level50Sets.length !== 850 || level50Sets.some((set, id) => set.index !== id)) throw new Error("Level-50 set boundary must be indexes 0..849");

const moveBySymbol = new Map(moves.map((move) => [move.move, move]));
const topologyByMove = new Map(topology.moves.map((move) => [move.move, move]));
const graphLabels = new Set(graph.labels.map((label) => label.name));
const programLabels = new Set(program.blocks.map((block) => block.label));
const graphLabelByName = new Map(graph.labels.map((label) => [label.name, label]));
const programBlockByLabel = new Map(program.blocks.map((block) => [block.label, block]));
const executionInventoryByMove = new Map(inventory.tiers.level50.moves.map((move) => [move.move, move]));
const animationByMove = new Map(animationComponents.moves.map((move) => [move.move, move]));
const soundMovesMatch = /static const u16 sSoundMovesTable\[\]\s*=\s*\{([\s\S]*?)\};/.exec(battleUtilSource);
if (!soundMovesMatch) throw new Error("unable to locate sSoundMovesTable in battle_util.c");
const soundMoveSymbols = [
  [...soundMovesMatch[1]!.matchAll(/\bMOVE_[A-Z0-9_]+\b/g)].map((match) => match[0]!).filter((move) => move !== "MOVE_NONE"),
].flat();
const soundMoves = new Set(soundMoveSymbols);
if (soundMoves.size !== 10 || soundMoveSymbols.length !== 10) {
  throw new Error(`expected ten ordered source Soundproof move selectors, got ${soundMoveSymbols.length}/${soundMoves.size}`);
}
const soundMoveIndexBySymbol = new Map(soundMoveSymbols.map((move, index) => [move, index]));

const SOUNDPROOF_CATEGORY = "moves-block-soundproof";
const SOUNDPROOF_STATUS = "source-proven-family";
const BATTLE_SCRIPT_SOURCE_PATH = "reference/pokeemerald/data/battle_scripts_1.s";
const BATTLE_SCRIPT_GRAPH_PATH = "src/data/gen/battle-script-graph.json";
const BATTLE_SCRIPT_PROGRAM_PATH = "src/data/gen/battle-script-program.json";
const BATTLE_SCRIPT_COMMANDS_PATH = "reference/pokeemerald/src/battle_script_commands.c";
const SOUNDPROOF_TABLE_PATH = "reference/pokeemerald/src/battle_util.c";
const BATTLE_HEADER_PATH = "reference/pokeemerald/include/battle.h";
const ATTACK_CANCELER_MOVES_BLOCK_CALL = "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0)";
const ABSORBING_DISPATCHER_CALL = "AbilityBattleEffects(ABILITYEFFECT_ABSORBING, gBattlerTarget, 0, 0, move)";
const ON_DAMAGE_DISPATCHER_CALL = "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE, gBattlerTarget, 0, 0, 0)";

const ABSORBING_HOOK_DEFINITIONS = [
  {
    id: "absorbing-volt-absorb",
    ability: "ABILITY_VOLT_ABSORB",
    type: "TYPE_ELECTRIC",
    requiresNonzeroPower: true,
    sourceGuard: "moveType == TYPE_ELECTRIC && gBattleMoves[move].power != 0",
    targetStateGuard: "target HP chooses the drain or full-HP useless script; neither changes the dispatch predicate",
  },
  {
    id: "absorbing-water-absorb",
    ability: "ABILITY_WATER_ABSORB",
    type: "TYPE_WATER",
    requiresNonzeroPower: true,
    sourceGuard: "moveType == TYPE_WATER && gBattleMoves[move].power != 0",
    targetStateGuard: "target HP chooses the drain or full-HP useless script; neither changes the dispatch predicate",
  },
  {
    id: "absorbing-flash-fire",
    ability: "ABILITY_FLASH_FIRE",
    type: "TYPE_FIRE",
    requiresNonzeroPower: false,
    sourceGuard: "moveType == TYPE_FIRE && !(gBattleMons[battler].status1 & STATUS1_FREEZE)",
    targetStateGuard: "target must not be frozen; first/repeat activation only changes the resource flag and message selector",
  },
] as const;

type AbsorbingHookDefinition = typeof ABSORBING_HOOK_DEFINITIONS[number];
type RoutePosition = { label: string; line: number };
type AbsorbingRouteStep = {
  kind: "fallthrough" | "guard" | "goto" | "accuracycheck";
  label: string;
  line: number;
  mnemonic: string;
  operands: string[];
  target?: RoutePosition;
  outcome?: "taken" | "fallthrough";
  condition?: string;
};

function requireGraphLabel(label: string): GraphLabel {
  const value = graphLabelByName.get(label);
  if (!value) throw new Error(`Battle Script graph lacks ${label}`);
  return value;
}

function requireProgramBlock(label: string): Program["blocks"][number] {
  const value = programBlockByLabel.get(label);
  if (!value) throw new Error(`Battle Script program lacks ${label}`);
  return value;
}

function directAttackCanceler(label: string): { label: string; line: number } | null {
  const graphLabel = requireGraphLabel(label);
  const programBlock = requireProgramBlock(label);
  const graphStatement = graphLabel.statements[0];
  const programStatement = programBlock.statements[0];
  if (graphStatement?.mnemonic !== "attackcanceler" || programStatement?.mnemonic !== "attackcanceler") {
    return null;
  }
  if (graphStatement.line !== programStatement.source.line) {
    throw new Error(`${label} attackcanceler graph/program line disagreement`);
  }
  return { label, line: graphStatement.line };
}

function requireGraphEdge(
  fromLabel: string,
  fromLine: number,
  toLabel: string,
  toLine: number,
  kind: string,
  macro: string,
): void {
  const found = graph.controlFlow.edges.some((edge) => (
    edge.from.label === fromLabel
    && edge.from.line === fromLine
    && edge.to?.label === toLabel
    && edge.to.line === toLine
    && edge.kind === kind
    && edge.provenance.macro === macro
  ));
  if (!found) {
    throw new Error(`Battle Script graph lacks ${macro} ${fromLabel}:${fromLine} -> ${toLabel}:${toLine}`);
  }
}

function requireRouteStatement(label: string, line: number, mnemonic: string, operands: string[]): GraphStatement {
  const graphStatement = requireGraphLabel(label).statements.find((candidate) => candidate.line === line);
  const programStatement = requireProgramBlock(label).statements.find((candidate) => candidate.source.line === line);
  if (!graphStatement || !programStatement) {
    throw new Error(`${label}:${line} is absent from the generated Battle Script graph or program`);
  }
  if (
    graphStatement.mnemonic !== mnemonic
    || programStatement.mnemonic !== mnemonic
    || JSON.stringify(graphStatement.operandTokens) !== JSON.stringify(operands)
    || JSON.stringify(programStatement.actualOperands) !== JSON.stringify(operands)
  ) {
    throw new Error(`${label}:${line} no longer matches the exact ${mnemonic} graph/program witness`);
  }
  return graphStatement;
}

function requireFallthrough(from: RoutePosition, to: RoutePosition): void {
  const found = graph.controlFlow.edges.some((edge) => (
    edge.from.label === from.label
    && edge.from.line === from.line
    && edge.to?.label === to.label
    && edge.to.line === to.line
    && edge.kind === "fallthrough"
  ));
  if (!found) throw new Error(`Battle Script graph lacks ordered fallthrough ${from.label}:${from.line} -> ${to.label}:${to.line}`);
}

function appendFallthrough(
  route: AbsorbingRouteStep[],
  from: RoutePosition,
  mnemonic: string,
  operands: string[],
  to: RoutePosition,
): void {
  requireRouteStatement(from.label, from.line, mnemonic, operands);
  requireFallthrough(from, to);
  route.push({ kind: "fallthrough", ...from, mnemonic, operands, target: to });
}

function requireConditionalGuard(
  from: RoutePosition,
  mnemonic: string,
  operands: string[],
  outcome: "taken" | "fallthrough",
  to: RoutePosition,
): void {
  requireRouteStatement(from.label, from.line, mnemonic, operands);
  const guard = graph.controlFlow.conditionalGuards.find((candidate) => (
    candidate.from.label === from.label
    && candidate.from.line === from.line
    && candidate.command.macro === mnemonic
    && JSON.stringify(candidate.operands.map((operand) => operand.token)) === JSON.stringify(operands)
  ));
  if (!guard) throw new Error(`${from.label}:${from.line} lacks its generated ${mnemonic} guard`);
  const expected = outcome === "taken" ? guard.takenDestination : guard.notTakenSuccessor;
  if (expected?.label !== to.label || expected.line !== to.line) {
    throw new Error(`${from.label}:${from.line} ${mnemonic} ${outcome} witness does not reach ${to.label}:${to.line}`);
  }
  if (outcome === "taken") requireGraphEdge(from.label, from.line, to.label, to.line, "jump", mnemonic);
  else requireFallthrough(from, to);
}

function appendGuard(
  route: AbsorbingRouteStep[],
  from: RoutePosition,
  mnemonic: string,
  operands: string[],
  outcome: "taken" | "fallthrough",
  to: RoutePosition,
  condition: string,
): void {
  requireConditionalGuard(from, mnemonic, operands, outcome, to);
  route.push({ kind: "guard", ...from, mnemonic, operands, outcome, target: to, condition });
}

function appendGoto(route: AbsorbingRouteStep[], from: RoutePosition, to: RoutePosition): void {
  requireRouteStatement(from.label, from.line, "goto", [to.label]);
  requireGraphEdge(from.label, from.line, to.label, to.line, "jump", "goto");
  route.push({ kind: "goto", ...from, mnemonic: "goto", operands: [to.label], target: to });
}

function appendAccuracyCheck(route: AbsorbingRouteStep[], at: RoutePosition, failureLabel: string): void {
  requireRouteStatement(at.label, at.line, "accuracycheck", [failureLabel, "ACC_CURR_MOVE"]);
  route.push({
    kind: "accuracycheck",
    ...at,
    mnemonic: "accuracycheck",
    operands: [failureLabel, "ACC_CURR_MOVE"],
  });
}

const LINEAR_PRELUDE_CONTROL_FLOW = /^(?:accuracycheck|call|end|goto|jump|return)/;

/**
 * This is deliberately not a generic graph walker.  A known entry block may
 * only supply a straight, non-branching prefix followed by one exact `goto`.
 * Every source instruction and its ordered generated edge becomes a witness.
 */
function appendStraightLineGoto(route: AbsorbingRouteStep[], label: string, targetLabel: string): void {
  const block = requireGraphLabel(label);
  if (block.statements.length < 1) throw new Error(`${label} has no source statements`);
  const target = requireGraphLabel(targetLabel);
  const statements = block.statements;
  const last = statements.at(-1)!;
  if (last.mnemonic !== "goto" || JSON.stringify(last.operandTokens) !== JSON.stringify([targetLabel])) {
    throw new Error(`${label} is not the audited straight-line goto ${targetLabel}`);
  }
  for (let index = 0; index < statements.length - 1; index += 1) {
    const statement = statements[index]!;
    const next = statements[index + 1]!;
    if (LINEAR_PRELUDE_CONTROL_FLOW.test(statement.mnemonic)) {
      throw new Error(`${label}:${statement.line} is control flow, not an audited straight-line absorption prelude`);
    }
    appendFallthrough(
      route,
      { label, line: statement.line },
      statement.mnemonic,
      statement.operandTokens,
      { label, line: next.line },
    );
  }
  appendGoto(route, { label, line: last.line }, { label: targetLabel, line: target.statements[0]!.line });
}

/**
 * A named, finite source block audit for an exclusion path.  This deliberately
 * does not discover or walk arbitrary graph paths: callers give the complete
 * expected instruction sequence, which is checked against both generated
 * representations before it can become evidence.
 */
function auditExactScriptBlock(
  label: string,
  expected: readonly (readonly [mnemonic: string, operands: readonly string[]])[],
) {
  const graphLabel = requireGraphLabel(label);
  const programBlock = requireProgramBlock(label);
  if (graphLabel.statements.length !== expected.length || programBlock.statements.length !== expected.length) {
    throw new Error(`${label} no longer has the exact audited statement count`);
  }
  const statements = expected.map(([mnemonic, expectedOperands], index) => {
    const graphStatement = graphLabel.statements[index]!;
    const programStatement = programBlock.statements[index]!;
    const operands = [...expectedOperands];
    if (graphStatement.line !== programStatement.source.line) {
      throw new Error(`${label}:${graphStatement.line} graph/program source line disagreement`);
    }
    requireRouteStatement(label, graphStatement.line, mnemonic, operands);
    return { line: graphStatement.line, mnemonic, operands };
  });
  return {
    label,
    source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: graphLabel.line },
    graph: { path: BATTLE_SCRIPT_GRAPH_PATH, statements },
    program: { path: BATTLE_SCRIPT_PROGRAM_PATH, statements },
  };
}

function firstRoutePosition(label: string): RoutePosition {
  const statement = requireGraphLabel(label).statements[0];
  if (!statement) throw new Error(`${label} has no first source statement`);
  return { label, line: statement.line };
}

function sourceLine(source: string, marker: string, name: string): number {
  const offset = source.indexOf(marker);
  if (offset < 0) throw new Error(`unable to locate ${name}`);
  return source.slice(0, offset).split("\n").length;
}

const attackCancelerDeclaration = battleScriptCommandsSource.indexOf("static void Cmd_attackcanceler(void)");
const attackCancelerStart = battleScriptCommandsSource.indexOf("static void Cmd_attackcanceler(void)", attackCancelerDeclaration + 1);
const attackCancelerEnd = battleScriptCommandsSource.indexOf("static void JumpIfMoveFailed", attackCancelerStart);
if (attackCancelerDeclaration < 0 || attackCancelerStart < 0 || attackCancelerEnd < 0) throw new Error("unable to isolate Cmd_attackcanceler source");
const attackCancelerSource = battleScriptCommandsSource.slice(attackCancelerStart, attackCancelerEnd);
if (!attackCancelerSource.includes(`if (${ATTACK_CANCELER_MOVES_BLOCK_CALL})\n        return;`)) {
  throw new Error("Cmd_attackcanceler no longer hands off to the source moves-block dispatcher before PP admission");
}
const soundproofTableLine = sourceLine(battleUtilSource, "static const u16 sSoundMovesTable", "sSoundMovesTable");
const attackCancelerLine = battleScriptCommandsSource.slice(0, attackCancelerStart).split("\n").length;

const accuracyCheckDeclaration = battleScriptCommandsSource.indexOf("static void Cmd_accuracycheck(void)");
const accuracyCheckStart = battleScriptCommandsSource.indexOf("static void Cmd_accuracycheck(void)", accuracyCheckDeclaration + 1);
const accuracyCheckEnd = battleScriptCommandsSource.indexOf("static void Cmd_attackstring(void)", accuracyCheckStart);
if (accuracyCheckDeclaration < 0 || accuracyCheckStart < 0 || accuracyCheckEnd < 0) {
  throw new Error("unable to isolate Cmd_accuracycheck source");
}
const accuracyCheckSource = battleScriptCommandsSource.slice(accuracyCheckStart, accuracyCheckEnd);
if (!accuracyCheckSource.includes("JumpIfMoveFailed(7, move);")) {
  throw new Error("Cmd_accuracycheck no longer hands off through JumpIfMoveFailed");
}
const accuracyCheckLine = battleScriptCommandsSource.slice(0, accuracyCheckStart).split("\n").length;

const jumpIfMoveFailedStart = battleScriptCommandsSource.indexOf("static void JumpIfMoveFailed(u8 adder, u16 move)");
const jumpIfMoveFailedEnd = battleScriptCommandsSource.indexOf("static void Cmd_jumpifaffectedbyprotect(void)", jumpIfMoveFailedStart);
if (jumpIfMoveFailedStart < 0 || jumpIfMoveFailedEnd < 0) throw new Error("unable to isolate JumpIfMoveFailed source");
const jumpIfMoveFailedSource = battleScriptCommandsSource.slice(jumpIfMoveFailedStart, jumpIfMoveFailedEnd);
if (!jumpIfMoveFailedSource.includes(`TrySetDestinyBondToHappen();\n        if (${ABSORBING_DISPATCHER_CALL})\n            return;`)) {
  throw new Error("JumpIfMoveFailed no longer calls the absorbing dispatcher after Destiny Bond");
}
const jumpIfMoveFailedLine = battleScriptCommandsSource.slice(0, jumpIfMoveFailedStart).split("\n").length;

const absorbingSourceStart = battleUtilSource.indexOf("case ABILITYEFFECT_ABSORBING: // 3");
const absorbingSourceEnd = battleUtilSource.indexOf("case ABILITYEFFECT_ON_DAMAGE:", absorbingSourceStart);
if (absorbingSourceStart < 0 || absorbingSourceEnd < 0) throw new Error("unable to isolate AbilityBattleEffects absorbing source");
const absorbingSource = battleUtilSource.slice(absorbingSourceStart, absorbingSourceEnd);
for (const definition of ABSORBING_HOOK_DEFINITIONS) {
  if (!absorbingSource.includes(`case ${definition.ability}:`)) {
    throw new Error(`AbilityBattleEffects absorbing source lacks ${definition.ability}`);
  }
}
if (!absorbingSource.includes("moveType == TYPE_ELECTRIC && gBattleMoves[move].power != 0")
  || !absorbingSource.includes("moveType == TYPE_WATER && gBattleMoves[move].power != 0")
  || !absorbingSource.includes("moveType == TYPE_FIRE && !(gBattleMons[battler].status1 & STATUS1_FREEZE)")) {
  throw new Error("AbilityBattleEffects absorbing source no longer matches the audited type/power/freeze guards");
}

const ON_DAMAGE_CONTACT_CATEGORY = "moveend-contact-on-damage";
const ON_DAMAGE_COLOR_CHANGE_CATEGORY = "moveend-color-change";
const ON_DAMAGE_COMMON_CONTACT_GUARDS = [
  "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
  "gBattleMons[gBattlerAttacker].hp != 0",
  "!gProtectStructs[gBattlerAttacker].confusionSelfDmg",
  "TARGET_TURN_DAMAGED",
  "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)",
] as const;
const ON_DAMAGE_ABILITY_DEFINITIONS = [
  {
    ability: "ABILITY_COLOR_CHANGE",
    category: ON_DAMAGE_COLOR_CHANGE_CATEGORY,
    selector: "gBattleMoves[move].power != 0",
    orderedGuards: [
      "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
      "move != MOVE_STRUGGLE",
      "gBattleMoves[move].power != 0",
      "TARGET_TURN_DAMAGED",
      "!IS_BATTLER_OF_TYPE(battler, moveType)",
      "gBattleMons[battler].hp != 0",
    ],
    outcome: "sets both target types to moveType, buffers that type, pushes BattleScript_ColorChangeActivates",
  },
  {
    ability: "ABILITY_ROUGH_SKIN",
    category: ON_DAMAGE_CONTACT_CATEGORY,
    selector: "gBattleMoves[move].flags & FLAG_MAKES_CONTACT",
    orderedGuards: ON_DAMAGE_COMMON_CONTACT_GUARDS,
    outcome: "deals max(1, attacker maxHP / 16) recoil and pushes BattleScript_RoughSkinActivates",
  },
  {
    ability: "ABILITY_EFFECT_SPORE",
    category: ON_DAMAGE_CONTACT_CATEGORY,
    selector: "gBattleMoves[move].flags & FLAG_MAKES_CONTACT",
    orderedGuards: [...ON_DAMAGE_COMMON_CONTACT_GUARDS, "(Random() % 10) == 0"],
    outcome: "rolls a nonzero sleep/poison/paralysis selector, marks an ability status effect, and pushes BattleScript_ApplySecondaryEffect",
  },
  {
    ability: "ABILITY_POISON_POINT",
    category: ON_DAMAGE_CONTACT_CATEGORY,
    selector: "gBattleMoves[move].flags & FLAG_MAKES_CONTACT",
    orderedGuards: [...ON_DAMAGE_COMMON_CONTACT_GUARDS, "(Random() % 3) == 0"],
    outcome: "marks attacker poison as an ability status effect and pushes BattleScript_ApplySecondaryEffect",
  },
  {
    ability: "ABILITY_STATIC",
    category: ON_DAMAGE_CONTACT_CATEGORY,
    selector: "gBattleMoves[move].flags & FLAG_MAKES_CONTACT",
    orderedGuards: [...ON_DAMAGE_COMMON_CONTACT_GUARDS, "(Random() % 3) == 0"],
    outcome: "marks attacker paralysis as an ability status effect and pushes BattleScript_ApplySecondaryEffect",
  },
  {
    ability: "ABILITY_FLAME_BODY",
    category: ON_DAMAGE_CONTACT_CATEGORY,
    selector: "gBattleMoves[move].flags & FLAG_MAKES_CONTACT",
    orderedGuards: [
      "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
      "gBattleMons[gBattlerAttacker].hp != 0",
      "!gProtectStructs[gBattlerAttacker].confusionSelfDmg",
      "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)",
      "TARGET_TURN_DAMAGED",
      "(Random() % 3) == 0",
    ],
    outcome: "marks attacker burn as an ability status effect and pushes BattleScript_ApplySecondaryEffect",
  },
  {
    ability: "ABILITY_CUTE_CHARM",
    category: ON_DAMAGE_CONTACT_CATEGORY,
    selector: "gBattleMoves[move].flags & FLAG_MAKES_CONTACT",
    orderedGuards: [
      "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
      "gBattleMons[gBattlerAttacker].hp != 0",
      "!gProtectStructs[gBattlerAttacker].confusionSelfDmg",
      "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)",
      "TARGET_TURN_DAMAGED",
      "gBattleMons[gBattlerTarget].hp != 0",
      "(Random() % 3) == 0",
      "gBattleMons[gBattlerAttacker].ability != ABILITY_OBLIVIOUS",
      "GetGenderFromSpeciesAndPersonality(speciesAtk, pidAtk) != GetGenderFromSpeciesAndPersonality(speciesDef, pidDef)",
      "!(gBattleMons[gBattlerAttacker].status2 & STATUS2_INFATUATION)",
      "GetGenderFromSpeciesAndPersonality(speciesAtk, pidAtk) != MON_GENDERLESS",
      "GetGenderFromSpeciesAndPersonality(speciesDef, pidDef) != MON_GENDERLESS",
    ],
    outcome: "writes target-owned infatuation onto the attacker and pushes BattleScript_CuteCharmActivates",
  },
] as const;

const onDamageSourceStart = battleUtilSource.indexOf("case ABILITYEFFECT_ON_DAMAGE: // Contact abilities and Color Change");
const onDamageSourceEnd = battleUtilSource.indexOf("case ABILITYEFFECT_IMMUNITY:", onDamageSourceStart);
if (onDamageSourceStart < 0 || onDamageSourceEnd < 0) throw new Error("unable to isolate AbilityBattleEffects ON_DAMAGE source");
const onDamageSource = battleUtilSource.slice(onDamageSourceStart, onDamageSourceEnd);
const targetTurnDamagedDefinition = "#define TARGET_TURN_DAMAGED ((gSpecialStatuses[gBattlerTarget].physicalDmg != 0 || gSpecialStatuses[gBattlerTarget].specialDmg != 0))";
if (!battleHeaderSource.includes(targetTurnDamagedDefinition)) {
  throw new Error("battle.h no longer defines TARGET_TURN_DAMAGED as the physical/special damage predicate");
}
for (const definition of ON_DAMAGE_ABILITY_DEFINITIONS) {
  const caseStart = onDamageSource.indexOf(`case ${definition.ability}:`);
  if (caseStart < 0) throw new Error(`AbilityBattleEffects ON_DAMAGE source lacks ${definition.ability}`);
  const nextCase = onDamageSource.indexOf("            case ", caseStart + 1);
  const caseSource = onDamageSource.slice(caseStart, nextCase < 0 ? undefined : nextCase);
  for (const guard of definition.orderedGuards) {
    if (!caseSource.includes(guard)) throw new Error(`${definition.ability} ON_DAMAGE source lacks ordered guard ${guard}`);
  }
}
const abilityEffectsStart = battleUtilSource.indexOf("u8 AbilityBattleEffects(");
const abilityEffectsOnDamageStart = battleUtilSource.indexOf("case ABILITYEFFECT_ON_DAMAGE:", abilityEffectsStart);
if (abilityEffectsStart < 0 || abilityEffectsOnDamageStart < 0) throw new Error("unable to isolate AbilityBattleEffects target ability selection");
const abilityEffectsPreamble = battleUtilSource.slice(abilityEffectsStart, abilityEffectsOnDamageStart);
if (!abilityEffectsPreamble.includes("if (special)\n            gLastUsedAbility = special;\n        else\n            gLastUsedAbility = gBattleMons[battler].ability;")) {
  throw new Error("AbilityBattleEffects no longer derives gLastUsedAbility from the supplied target battler");
}
const moveEndOnDamageCaseLine = sourceLine(battleScriptCommandsSource, "case MOVEEND_ON_DAMAGE_ABILITIES:", "MOVEEND_ON_DAMAGE_ABILITIES");
if (!battleScriptCommandsSource.includes(`case MOVEEND_ON_DAMAGE_ABILITIES: // Such as abilities activating on contact (Effect Spore, Rough Skin, etc.).\n            if (${ON_DAMAGE_DISPATCHER_CALL})\n                effect = TRUE;\n            gBattleScripting.moveendState++;`)) {
  throw new Error("Cmd_moveend no longer delegates MOVEEND_ON_DAMAGE_ABILITIES to AbilityBattleEffects in source order");
}

function soundproofEntryPath(move: string, entryScript: string) {
  const direct = directAttackCanceler(entryScript);
  if (direct) {
    return {
      kind: "direct-attackcanceler" as const,
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
      graph: {
        path: BATTLE_SCRIPT_GRAPH_PATH,
        entryLabel: entryScript,
        attackCanceler: direct,
        route: [{ kind: "entry-opcode", label: entryScript, line: direct.line, mnemonic: "attackcanceler" }],
      },
      program: {
        path: BATTLE_SCRIPT_PROGRAM_PATH,
        entryLabel: entryScript,
        attackCanceler: direct,
        route: [{ kind: "entry-opcode", label: entryScript, line: direct.line, mnemonic: "attackcanceler" }],
      },
    };
  }

  const graphEntry = requireGraphLabel(entryScript);
  const programEntry = requireProgramBlock(entryScript);
  for (const statement of graphEntry.statements) {
    if (statement.mnemonic !== "goto" || statement.labelOperands.length !== 1) continue;
    const target = directAttackCanceler(statement.labelOperands[0]!);
    if (!target) continue;
    const programStatement = programEntry.statements.find((candidate) => (
      candidate.source.line === statement.line
      && candidate.mnemonic === "goto"
      && candidate.actualOperands.length === 1
      && candidate.actualOperands[0] === target.label
    ));
    if (!programStatement) throw new Error(`${entryScript}:${statement.line} goto is absent from Battle Script program`);
    requireGraphEdge(entryScript, statement.line, target.label, target.line, "jump", "goto");
    return {
      kind: "goto-attackcanceler" as const,
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: graphEntry.line },
      graph: {
        path: BATTLE_SCRIPT_GRAPH_PATH,
        entryLabel: entryScript,
        attackCanceler: target,
        route: [
          { kind: "goto", label: entryScript, line: statement.line, targetLabel: target.label },
          { kind: "entry-opcode", label: target.label, line: target.line, mnemonic: "attackcanceler" },
        ],
      },
      program: {
        path: BATTLE_SCRIPT_PROGRAM_PATH,
        entryLabel: entryScript,
        attackCanceler: target,
        route: [
          { kind: "goto", label: entryScript, line: statement.line, targetLabel: target.label },
          { kind: "entry-opcode", label: target.label, line: target.line, mnemonic: "attackcanceler" },
        ],
      },
    };
  }

  for (const statement of graphEntry.statements) {
    if (statement.mnemonic !== "jumpifnotmove" || statement.operandTokens.length !== 2) continue;
    const [comparedMove, targetLabel] = statement.operandTokens;
    if (move === comparedMove) continue;
    const target = directAttackCanceler(targetLabel!);
    if (!target) continue;
    const guard = graph.controlFlow.conditionalGuards.find((candidate) => (
      candidate.from.label === entryScript
      && candidate.from.line === statement.line
      && candidate.command.macro === "jumpifnotmove"
      && candidate.operands[0]?.parameter === "move"
      && candidate.operands[0]?.token === comparedMove
      && candidate.takenDestination?.label === target.label
      && candidate.takenDestination.line === target.line
    ));
    if (!guard) throw new Error(`${entryScript}:${statement.line} is missing its generated jumpifnotmove guard`);
    const programStatement = programEntry.statements.find((candidate) => (
      candidate.source.line === statement.line
      && candidate.mnemonic === "jumpifnotmove"
      && candidate.actualOperands[0] === comparedMove
      && candidate.actualOperands[1] === target.label
    ));
    if (!programStatement) throw new Error(`${entryScript}:${statement.line} jumpifnotmove is absent from Battle Script program`);
    requireGraphEdge(entryScript, statement.line, target.label, target.line, "jump", "jumpifnotmove");
    return {
      kind: "guarded-jumpifnotmove-attackcanceler" as const,
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: graphEntry.line },
      graph: {
        path: BATTLE_SCRIPT_GRAPH_PATH,
        entryLabel: entryScript,
        attackCanceler: target,
        route: [
          {
            kind: "jumpifnotmove",
            label: entryScript,
            line: statement.line,
            currentMove: move,
            comparedMove,
            targetLabel: target.label,
            satisfied: true,
          },
          { kind: "entry-opcode", label: target.label, line: target.line, mnemonic: "attackcanceler" },
        ],
      },
      program: {
        path: BATTLE_SCRIPT_PROGRAM_PATH,
        entryLabel: entryScript,
        attackCanceler: target,
        route: [
          {
            kind: "jumpifnotmove",
            label: entryScript,
            line: statement.line,
            currentMove: move,
            comparedMove,
            targetLabel: target.label,
            satisfied: true,
          },
          { kind: "entry-opcode", label: target.label, line: target.line, mnemonic: "attackcanceler" },
        ],
      },
    };
  }

  throw new Error(`${move} (${entryScript}) has no source-proven route to attackcanceler`);
}

function appendEffectHitToAccuracy(route: AbsorbingRouteStep[], move: string): void {
  const effectHit = "BattleScript_EffectHit";
  const fromAtkCanceler = "BattleScript_HitFromAtkCanceler";
  const fromAccCheck = "BattleScript_HitFromAccCheck";
  if (move === "MOVE_SURF") {
    appendGuard(
      route,
      { label: effectHit, line: 237 },
      "jumpifnotmove",
      ["MOVE_SURF", fromAtkCanceler],
      "fallthrough",
      { label: effectHit, line: 238 },
      "the selected move is MOVE_SURF, so the SURF-only underwater check is evaluated",
    );
    appendGuard(
      route,
      { label: effectHit, line: 238 },
      "jumpifnostatus3",
      ["BS_TARGET", "STATUS3_UNDERWATER", fromAtkCanceler],
      "taken",
      firstRoutePosition(fromAtkCanceler),
      "the target is not underwater",
    );
  } else {
    appendGuard(
      route,
      { label: effectHit, line: 237 },
      "jumpifnotmove",
      ["MOVE_SURF", fromAtkCanceler],
      "taken",
      firstRoutePosition(fromAtkCanceler),
      `the selected move ${move} is not MOVE_SURF`,
    );
  }
  appendFallthrough(
    route,
    { label: fromAtkCanceler, line: 242 },
    "attackcanceler",
    [],
    firstRoutePosition(fromAccCheck),
  );
  appendAccuracyCheck(route, { label: fromAccCheck, line: 244 }, "BattleScript_PrintMoveMissed");
}

function appendTrapToAccuracy(route: AbsorbingRouteStep[], move: string): void {
  const effectTrap = "BattleScript_EffectTrap";
  const doWrapEffect = "BattleScript_DoWrapEffect";
  if (move === "MOVE_WHIRLPOOL") {
    appendGuard(
      route,
      { label: effectTrap, line: 831 },
      "jumpifnotmove",
      ["MOVE_WHIRLPOOL", doWrapEffect],
      "fallthrough",
      { label: effectTrap, line: 832 },
      "the selected move is MOVE_WHIRLPOOL, so the underwater bonus guard is evaluated",
    );
    appendGuard(
      route,
      { label: effectTrap, line: 832 },
      "jumpifnostatus3",
      ["BS_TARGET", "STATUS3_UNDERWATER", doWrapEffect],
      "taken",
      firstRoutePosition(doWrapEffect),
      "the target is not underwater",
    );
  } else {
    appendGuard(
      route,
      { label: effectTrap, line: 831 },
      "jumpifnotmove",
      ["MOVE_WHIRLPOOL", doWrapEffect],
      "taken",
      firstRoutePosition(doWrapEffect),
      `the selected move ${move} is not MOVE_WHIRLPOOL`,
    );
  }
  appendStraightLineGoto(route, doWrapEffect, "BattleScript_EffectHit");
  appendEffectHitToAccuracy(route, move);
}

function appendDiveSecondTurnToAccuracy(route: AbsorbingRouteStep[]): void {
  const entry = "BattleScript_EffectSemiInvulnerable";
  const secondTurn = "BattleScript_SecondTurnSemiInvulnerable";
  const tryHit = "BattleScript_SemiInvulnerableTryHit";
  appendGuard(
    route,
    { label: entry, line: 1974 },
    "jumpifstatus2",
    ["BS_ATTACKER", "STATUS2_MULTIPLETURNS", secondTurn],
    "taken",
    firstRoutePosition(secondTurn),
    "MOVE_DIVE is on its second semi-invulnerable turn (STATUS2_MULTIPLETURNS)",
  );
  const secondTurnStatements = requireGraphLabel(secondTurn).statements;
  const jumpIndex = secondTurnStatements.findIndex((statement) => statement.line === 2003);
  if (jumpIndex < 1) throw new Error(`${secondTurn} no longer has the audited second-turn prefix`);
  for (let index = 0; index < jumpIndex; index += 1) {
    const statement = secondTurnStatements[index]!;
    const next = secondTurnStatements[index + 1]!;
    if (LINEAR_PRELUDE_CONTROL_FLOW.test(statement.mnemonic)) {
      throw new Error(`${secondTurn}:${statement.line} is unexpected control flow before the Dive accuracy witness`);
    }
    appendFallthrough(route, { label: secondTurn, line: statement.line }, statement.mnemonic, statement.operandTokens, { label: secondTurn, line: next.line });
  }
  appendGuard(
    route,
    { label: secondTurn, line: 2003 },
    "jumpifnotmove",
    ["MOVE_BOUNCE", tryHit],
    "taken",
    firstRoutePosition(tryHit),
    "the selected move is MOVE_DIVE rather than MOVE_BOUNCE",
  );
  appendAccuracyCheck(route, { label: tryHit, line: 2006 }, "BattleScript_SemiInvulnerableMiss");
}

function appendWillOWispToAccuracy(route: AbsorbingRouteStep[]): void {
  const entry = "BattleScript_EffectWillOWisp";
  appendFallthrough(route, { label: entry, line: 2175 }, "attackcanceler", [], { label: entry, line: 2176 });
  appendFallthrough(route, { label: entry, line: 2176 }, "attackstring", [], { label: entry, line: 2177 });
  appendFallthrough(route, { label: entry, line: 2177 }, "ppreduce", [], { label: entry, line: 2178 });
  appendGuard(route, { label: entry, line: 2178 }, "jumpifstatus2", ["BS_TARGET", "STATUS2_SUBSTITUTE", "BattleScript_ButItFailed"], "fallthrough", { label: entry, line: 2179 }, "the target has no Substitute");
  appendGuard(route, { label: entry, line: 2179 }, "jumpifstatus", ["BS_TARGET", "STATUS1_BURN", "BattleScript_AlreadyBurned"], "fallthrough", { label: entry, line: 2180 }, "the target is not already burned");
  appendGuard(route, { label: entry, line: 2180 }, "jumpiftype", ["BS_TARGET", "TYPE_FIRE", "BattleScript_NotAffected"], "fallthrough", { label: entry, line: 2181 }, "the target is not Fire-type on this route");
  appendGuard(route, { label: entry, line: 2181 }, "jumpifability", ["BS_TARGET", "ABILITY_WATER_VEIL", "BattleScript_WaterVeilPrevents"], "fallthrough", { label: entry, line: 2182 }, "the target does not have Water Veil");
  appendGuard(route, { label: entry, line: 2182 }, "jumpifstatus", ["BS_TARGET", "STATUS1_ANY", "BattleScript_ButItFailed"], "fallthrough", { label: entry, line: 2183 }, "the target has no major status");
  appendAccuracyCheck(route, { label: entry, line: 2183 }, "BattleScript_ButItFailed");
}

function absorbingEntryPath(move: string, entryScript: string) {
  const route: AbsorbingRouteStep[] = [];
  if (entryScript === "BattleScript_EffectTrap") {
    appendTrapToAccuracy(route, move);
  } else if (entryScript === "BattleScript_EffectSemiInvulnerable" && move === "MOVE_DIVE") {
    appendDiveSecondTurnToAccuracy(route);
  } else if (entryScript === "BattleScript_EffectWillOWisp" && move === "MOVE_WILL_O_WISP") {
    appendWillOWispToAccuracy(route);
  } else {
    if (entryScript !== "BattleScript_EffectHit") appendStraightLineGoto(route, entryScript, "BattleScript_EffectHit");
    appendEffectHitToAccuracy(route, move);
  }
  const accuracyStep = route.at(-1);
  if (!accuracyStep || accuracyStep.kind !== "accuracycheck") throw new Error(`${move} (${entryScript}) has no terminal accuracycheck witness`);
  return {
    kind: "accuracycheck-jump-if-move-failed" as const,
    source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
    graph: {
      path: BATTLE_SCRIPT_GRAPH_PATH,
      entryLabel: entryScript,
      accuracyCheck: { label: accuracyStep.label, line: accuracyStep.line },
      route,
    },
    program: {
      path: BATTLE_SCRIPT_PROGRAM_PATH,
      entryLabel: entryScript,
      accuracyCheck: { label: accuracyStep.label, line: accuracyStep.line },
      route,
    },
    assumptions: [
      "Cmd_attackcanceler takes its ordinary fallthrough for a usable selected move and a target that is not Soundproof.",
      "Cmd_accuracycheck reaches JumpIfMoveFailed; its absorbing arm requires MOVE_RESULT_NO_EFFECT to be clear.",
    ],
  };
}

function sunnyDayAbsorbingExclusion(entryScript: string) {
  if (entryScript !== "BattleScript_EffectSunnyDay") throw new Error(`MOVE_SUNNY_DAY unexpectedly maps to ${entryScript}`);
  const route: AbsorbingRouteStep[] = [];
  appendStraightLineGoto(route, entryScript, "BattleScript_MoveWeatherChange");
  const weatherChange = auditExactScriptBlock("BattleScript_MoveWeatherChange", [
    ["attackanimation", []],
    ["waitanimation", []],
    ["printfromtable", ["gMoveWeatherChangeStringIds"]],
    ["waitmessage", ["B_WAIT_TIME_LONG"]],
    ["call", ["BattleScript_WeatherFormChanges"]],
    ["goto", ["BattleScript_MoveEnd"]],
  ]);
  const weatherFormChanges = auditExactScriptBlock("BattleScript_WeatherFormChanges", [
    ["setbyte", ["sBATTLER", "0"]],
  ]);
  const weatherFormChangesLoop = auditExactScriptBlock("BattleScript_WeatherFormChangesLoop", [
    ["trycastformdatachange", []],
    ["addbyte", ["sBATTLER", "1"]],
    ["jumpifbytenotequal", ["sBATTLER", "gBattlersCount", "BattleScript_WeatherFormChangesLoop"]],
    ["return", []],
  ]);
  const weatherCall = weatherChange.graph.statements.find((statement) => statement.mnemonic === "call")!;
  const weatherGoto = weatherChange.graph.statements.find((statement) => statement.mnemonic === "goto")!;
  const weatherLoopGuard = weatherFormChangesLoop.graph.statements.find((statement) => statement.mnemonic === "jumpifbytenotequal")!;
  requireGraphEdge("BattleScript_MoveWeatherChange", weatherCall.line, "BattleScript_WeatherFormChanges", weatherFormChanges.graph.statements[0]!.line, "call", "call");
  requireGraphEdge("BattleScript_MoveWeatherChange", weatherGoto.line, "BattleScript_MoveEnd", firstRoutePosition("BattleScript_MoveEnd").line, "jump", "goto");
  requireFallthrough(
    { label: "BattleScript_WeatherFormChanges", line: weatherFormChanges.graph.statements[0]!.line },
    { label: "BattleScript_WeatherFormChangesLoop", line: weatherFormChangesLoop.graph.statements[0]!.line },
  );
  requireConditionalGuard(
    { label: "BattleScript_WeatherFormChangesLoop", line: weatherLoopGuard.line },
    "jumpifbytenotequal",
    ["sBATTLER", "gBattlersCount", "BattleScript_WeatherFormChangesLoop"],
    "fallthrough",
    { label: "BattleScript_WeatherFormChangesLoop", line: weatherFormChangesLoop.graph.statements.at(-1)!.line },
  );
  return {
    move: "MOVE_SUNNY_DAY",
    categories: ["absorbing-flash-fire"],
    reason: "TYPE_FIRE makes Sunny Day a Flash Fire selector candidate, but its self-target weather script executes attackcanceler/attackstring/ppreduce/setsunny and exits through BattleScript_MoveWeatherChange to BattleScript_MoveEnd without an accuracycheck or JumpIfMoveFailed absorbing handoff.",
    entryPath: {
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
      graph: {
        path: BATTLE_SCRIPT_GRAPH_PATH,
        entryLabel: entryScript,
        route,
        weatherFlow: [weatherChange, weatherFormChanges, weatherFormChangesLoop],
        exitsThrough: { label: "BattleScript_MoveWeatherChange", line: weatherGoto.line, targetLabel: "BattleScript_MoveEnd" },
      },
      program: {
        path: BATTLE_SCRIPT_PROGRAM_PATH,
        entryLabel: entryScript,
        route,
        weatherFlow: [weatherChange, weatherFormChanges, weatherFormChangesLoop],
        exitsThrough: { label: "BattleScript_MoveWeatherChange", line: weatherGoto.line, targetLabel: "BattleScript_MoveEnd" },
      },
    },
  };
}

function absorbingFamilyEvidence(
  definition: AbsorbingHookDefinition,
  move: Move,
  entryScript: string,
) {
  const entryPath = absorbingEntryPath(move.move, entryScript);
  const caseLine = sourceLine(battleUtilSource, `case ${definition.ability}:`, definition.ability);
  return {
    category: definition.id,
    selector: {
      path: SOUNDPROOF_TABLE_PATH,
      locator: `AbilityBattleEffects(ABILITYEFFECT_ABSORBING) ${definition.ability}`,
      ability: definition.ability,
      moveType: definition.type,
      requiresNonzeroPower: definition.requiresNonzeroPower,
      sourceGuard: definition.sourceGuard,
      line: caseLine,
    },
    entryPath,
    dispatcher: {
      path: BATTLE_SCRIPT_COMMANDS_PATH,
      locator: "JumpIfMoveFailed",
      line: jumpIfMoveFailedLine,
      call: ABSORBING_DISPATCHER_CALL,
      order: "after TrySetDestinyBondToHappen and before gBattlescriptCurrInstr = BS_ptr",
      accuracyCheck: { locator: "Cmd_accuracycheck", line: accuracyCheckLine, call: "JumpIfMoveFailed(7, move)" },
    },
    familyVerification: {
      scope: "One shared ABILITYEFFECT_ABSORBING dispatcher receipt is parameterized with Volt Absorb. Water Absorb and Flash Fire are source switch siblings covered by the all-three-arm Tier-1 batch; this does not fabricate per-move oracle receipts.",
      implementation: "src/engine/battleScriptHitChainOpcode.ts#advancePastAccuracyCheck",
      batchTest: "tests/battleScriptHitChainOpcode.test.ts#AbilityBattleEffects(ABILITYEFFECT_ABSORBING)",
      damageConsumerTest: "tests/damageCalc.test.ts#Flash Fire consumes its persistent resource flag after weather and before +2",
      oracleReceipt: "docs/absorbing-abilities-ground-truth.md#3-two-seed-battle-scene-off-receipts",
      oracleFixture: "tools/battle-lab/mechanic-absorbing-volt-absorb-off.json",
      oracleProbe: "tools/probe/probe-absorbing-ability-off.py",
      oracleReceiptFiles: [
        "tools/probe/receipts/absorbing-volt-absorb-off-seed-610839776.json",
        "tools/probe/receipts/absorbing-volt-absorb-off-seed-324508639.json",
      ],
      targetStateGuard: definition.targetStateGuard,
    },
  };
}

type HookCategory = { id: string; dispatcher: string; selector: string; ownership: string };
const ITEM_HOOK_CATALOG: HookCategory[] = [
  { id: "selection-choice-band", dispatcher: "TrySetCantSelectMoveBattleScript / CheckMoveLimitations", selector: "HOLD_EFFECT_CHOICE_BAND; any selected move slot", ownership: "attacker held item and prior choicedMove" },
  { id: "accuracy-target-evasion-item", dispatcher: "Cmd_accuracycheck", selector: "HOLD_EFFECT_EVASION_UP after an ACCURACYCHECK-reachable script path", ownership: "target held item (or target Enigma Berry effect)" },
  { id: "moveend-kings-rock", dispatcher: "Cmd_moveend ITEMEFFECT_KINGSROCK_SHELLBELL", selector: "FLAG_KINGS_ROCK_AFFECTED after a MOVEEND-reachable path", ownership: "attacker held item with HOLD_EFFECT_FLINCH" },
];
const ABILITY_HOOK_CATALOG: HookCategory[] = [
  { id: "moves-block-soundproof", dispatcher: "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK)", selector: "sSoundMovesTable after an ATTACKCANCELER-reachable path", ownership: "target ability is ABILITY_SOUNDPROOF" },
  ...ABSORBING_HOOK_DEFINITIONS.map((definition) => ({
    id: definition.id,
    dispatcher: "AbilityBattleEffects(ABILITYEFFECT_ABSORBING)",
    selector: `${definition.type}${definition.requiresNonzeroPower ? " and power != 0" : ""} after an ACCURACYCHECK-reachable path`,
    ownership: `target ability is ${definition.ability}`,
  })),
  { id: "moveend-contact-on-damage", dispatcher: "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)", selector: "FLAG_MAKES_CONTACT after a MOVEEND-reachable path", ownership: "target ability is Rough Skin, Effect Spore, Poison Point, Static, Flame Body, or Cute Charm" },
  { id: "moveend-color-change", dispatcher: "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)", selector: "power != 0 after a MOVEEND-reachable path", ownership: "target ability is ABILITY_COLOR_CHANGE" },
  { id: "accuracy-compound-eyes", dispatcher: "Cmd_accuracycheck", selector: "an ACCURACYCHECK-reachable script path", ownership: "attacker ability is ABILITY_COMPOUND_EYES" },
  { id: "accuracy-sand-veil", dispatcher: "Cmd_accuracycheck", selector: "an ACCURACYCHECK-reachable script path", ownership: "target ability is ABILITY_SAND_VEIL and weather has sandstorm" },
  { id: "accuracy-hustle-physical", dispatcher: "Cmd_accuracycheck", selector: "IS_TYPE_PHYSICAL(type) and an ACCURACYCHECK-reachable script path", ownership: "attacker ability is ABILITY_HUSTLE" },
];

const setIdsByMove = new Map<string, number[]>();
for (const set of level50Sets) {
  if (set.moves.length !== 4) throw new Error(`${set.label} must have four move slots`);
  for (const move of new Set(set.moves.filter((move) => move !== "MOVE_NONE"))) {
    if (!moveBySymbol.has(move)) throw new Error(`${set.label} references unknown ${move}`);
    setIdsByMove.set(move, [...(setIdsByMove.get(move) ?? []), set.index]);
  }
}

const rosterMoveSymbols = [...setIdsByMove.keys()].sort((a, b) => moveBySymbol.get(a)!.id - moveBySymbol.get(b)!.id);
const executableMoveSymbols = new Set(
  topology.level50FactoryReachableEffects.flatMap((family) => family.moves.map((move) => move.move)),
);
if (executableMoveSymbols.size !== inventory.tiers.level50.moves.length) throw new Error("topology and animation inventory disagree on executable Level-50 moves");

const ON_DAMAGE_BLOCKERS = [
  {
    id: "ordered-moveend-route-not-proven",
    reason: "This is an exact entry-block graph/program census only. A promotion needs a complete ordered runtime route through fallthrough, jumps, calls, returns, and guard outcomes into MOVEEND_ON_DAMAGE_ABILITIES; this checkpoint deliberately does not treat static syntax as that witness.",
  },
  {
    id: "damage-state-guard-not-derived-from-selector",
    reason: "FLAG_MAKES_CONTACT and nonzero power select candidates, but TARGET_TURN_DAMAGED, move-result flags, attacker/target survival, substitute behavior, confusion-self-damage, type/gender/Oblivious state, and chance rolls remain runtime source guards.",
  },
  {
    id: "missing-direct-on-damage-off-receipt",
    reason: "The committed Battle Scene OFF corpus has Tier-1 sibling coverage but no deterministic parameterized-oracle receipt that observes the shared ABILITYEFFECT_ON_DAMAGE dispatcher. Incidental party ability appearances are not semantic receipts.",
  },
] as const;

type OnDamageCandidateCategory = typeof ON_DAMAGE_CONTACT_CATEGORY | typeof ON_DAMAGE_COLOR_CHANGE_CATEGORY;
type OnDamageCandidate = {
  category: OnDamageCandidateCategory;
  move: string;
  moveId: number;
  effect: string;
  power: number;
  makesContact: boolean;
  entryScript: string;
  routeShapeId: string;
  blockerIds: Array<(typeof ON_DAMAGE_BLOCKERS)[number]["id"]>;
};

function onDamageEntryShape(entryScript: string, candidates: readonly OnDamageCandidate[]) {
  const graphEntry = requireGraphLabel(entryScript);
  const programEntry = requireProgramBlock(entryScript);
  if (graphEntry.statements.length !== programEntry.statements.length) {
    throw new Error(`${entryScript} graph/program entry-block statement count disagreement`);
  }
  const statements = graphEntry.statements.map((statement, index) => {
    const programStatement = programEntry.statements[index]!;
    if (statement.line !== programStatement.source.line) {
      throw new Error(`${entryScript}:${statement.line} graph/program entry-block source line disagreement`);
    }
    requireRouteStatement(entryScript, statement.line, statement.mnemonic, statement.operandTokens);
    return { line: statement.line, mnemonic: statement.mnemonic, operands: statement.operandTokens };
  });
  const controlMnemonics = [...new Set(statements
    .filter((statement) => /^(?:call|goto|jump|return|end|accuracycheck)/.test(statement.mnemonic))
    .map((statement) => statement.mnemonic))];
  const entryBlockShape = controlMnemonics.includes("call")
    ? "call-return-entry-block"
    : controlMnemonics.some((mnemonic) => mnemonic.startsWith("jump"))
      ? "conditional-entry-block"
      : controlMnemonics.includes("goto")
        ? "goto-entry-block"
        : "fallthrough-entry-block";
  const edges = graph.controlFlow.edges
    .filter((edge) => edge.from.label === entryScript)
    .map((edge) => ({
      fromLine: edge.from.line,
      to: edge.to === null ? null : { label: edge.to.label, line: edge.to.line },
      kind: edge.kind,
      macro: edge.provenance.macro ?? null,
    }));
  const categoryCandidates = (category: OnDamageCandidateCategory) => candidates
    .filter((candidate) => candidate.entryScript === entryScript && candidate.category === category)
    .map((candidate) => candidate.move);
  return {
    id: `on-damage-entry:${entryScript}`,
    entryScript,
    entryBlockShape,
    source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: graphEntry.line },
    graph: { path: BATTLE_SCRIPT_GRAPH_PATH, statements, edges },
    program: { path: BATTLE_SCRIPT_PROGRAM_PATH, statements },
    candidates: {
      [ON_DAMAGE_CONTACT_CATEGORY]: categoryCandidates(ON_DAMAGE_CONTACT_CATEGORY),
      [ON_DAMAGE_COLOR_CHANGE_CATEGORY]: categoryCandidates(ON_DAMAGE_COLOR_CHANGE_CATEGORY),
    },
    blockerIds: ON_DAMAGE_BLOCKERS.map((blocker) => blocker.id),
  };
}

const onDamageCandidateRows: OnDamageCandidate[] = [];
for (const symbol of rosterMoveSymbols) {
  const move = moveBySymbol.get(symbol)!;
  const script = topologyByMove.get(symbol);
  if (!script) throw new Error(`${symbol} has no indexed Battle Script topology row for the ON_DAMAGE audit`);
  const makesContact = move.flags.includes("FLAG_MAKES_CONTACT");
  const categories: OnDamageCandidateCategory[] = [];
  if (makesContact) categories.push(ON_DAMAGE_CONTACT_CATEGORY);
  if (move.power !== 0) categories.push(ON_DAMAGE_COLOR_CHANGE_CATEGORY);
  for (const category of categories) {
    onDamageCandidateRows.push({
      category,
      move: symbol,
      moveId: move.id,
      effect: move.effect,
      power: move.power,
      makesContact,
      entryScript: script.entryScript,
      routeShapeId: `on-damage-entry:${script.entryScript}`,
      blockerIds: ON_DAMAGE_BLOCKERS.map((blocker) => blocker.id),
    });
  }
}
const onDamageCandidatesByCategory = Object.fromEntries([
  ON_DAMAGE_CONTACT_CATEGORY,
  ON_DAMAGE_COLOR_CHANGE_CATEGORY,
].map((category) => [category, onDamageCandidateRows.filter((candidate) => candidate.category === category)])) as Record<OnDamageCandidateCategory, OnDamageCandidate[]>;
const onDamageOverlapMoves = onDamageCandidatesByCategory[ON_DAMAGE_CONTACT_CATEGORY]
  .map((candidate) => candidate.move)
  .filter((move) => onDamageCandidatesByCategory[ON_DAMAGE_COLOR_CHANGE_CATEGORY].some((candidate) => candidate.move === move));
const onDamageEntryScripts = [...new Set(onDamageCandidateRows.map((candidate) => candidate.entryScript))]
  .sort((left, right) => requireGraphLabel(left).line - requireGraphLabel(right).line);
const onDamageRouteShapeRows = onDamageEntryScripts.map((entryScript) => onDamageEntryShape(entryScript, onDamageCandidateRows));
const onDamageEntryShapeCounts = Object.fromEntries([...new Set(onDamageRouteShapeRows.map((row) => row.entryBlockShape))]
  .sort()
  .map((shape) => [shape, onDamageRouteShapeRows.filter((row) => row.entryBlockShape === shape).length]));
const onDamageMoveEndTarget = auditExactScriptBlock("BattleScript_MoveEnd", [
  ["moveendall", []],
  ["end", []],
]);
if (onDamageCandidateRows.some((candidate) => candidate.blockerIds.length !== ON_DAMAGE_BLOCKERS.length)) {
  throw new Error("every ON_DAMAGE candidate must carry every explicit blocker");
}
if (onDamageCandidateRows.length !== new Set(onDamageCandidateRows.map((candidate) => `${candidate.category}:${candidate.move}`)).size) {
  throw new Error("every ON_DAMAGE candidate must appear exactly once per applicable category");
}

const absorbingEvidenceByMove = new Map<string, Array<ReturnType<typeof absorbingFamilyEvidence>>>();
const absorbingCandidateRows: Array<{ move: string; category: string; type: string; power: number; entryScript: string }> = [];
const absorbingExcludedCandidates: Array<ReturnType<typeof sunnyDayAbsorbingExclusion>> = [];
for (const symbol of rosterMoveSymbols) {
  const move = moveBySymbol.get(symbol)!;
  const script = topologyByMove.get(symbol);
  if (!script) throw new Error(`${symbol} has no indexed Battle Script topology row for the absorbing audit`);
  const candidates = ABSORBING_HOOK_DEFINITIONS.filter((definition) => (
    move.type === definition.type && (!definition.requiresNonzeroPower || move.power !== 0)
  ));
  for (const definition of candidates) {
    absorbingCandidateRows.push({ move: symbol, category: definition.id, type: move.type, power: move.power, entryScript: script.entryScript });
    if (symbol === "MOVE_SUNNY_DAY") {
      if (definition.id !== "absorbing-flash-fire") throw new Error("Sunny Day has an unexpected absorbing category");
      absorbingExcludedCandidates.push(sunnyDayAbsorbingExclusion(script.entryScript));
      continue;
    }
    const evidence = absorbingFamilyEvidence(definition, move, script.entryScript);
    absorbingEvidenceByMove.set(symbol, [...(absorbingEvidenceByMove.get(symbol) ?? []), evidence]);
  }
}
if (absorbingCandidateRows.length !== absorbingExcludedCandidates.length + [...absorbingEvidenceByMove.values()].reduce((sum, rows) => sum + rows.length, 0)) {
  throw new Error("every source-derived absorbing candidate must be either source-proven or explicitly excluded");
}

const records = rosterMoveSymbols.map((symbol) => {
  const move = moveBySymbol.get(symbol)!;
  const script = topologyByMove.get(symbol) ?? null;
  const animationInventory = executionInventoryByMove.get(symbol) ?? null;
  const animation = animationByMove.get(symbol) ?? null;
  if (!script) throw new Error(`${symbol} has no indexed Battle Script topology row`);
  if (!graphLabels.has(script.entryScript) || !programLabels.has(script.entryScript)) {
    throw new Error(`${symbol} entry label ${script.entryScript} is absent from graph or program`);
  }
  if (animationInventory && (!animation || animation.rootScript !== animationInventory.animationScript)) {
    throw new Error(`${symbol} animation inventory/component graph disagreement`);
  }
  const soundproofPath = soundMoves.has(symbol)
    ? soundproofEntryPath(symbol, script.entryScript)
    : null;
  const sourceProvenFamilies: Array<{ category: string; [key: string]: unknown }> = [];
  if (soundproofPath !== null) {
    sourceProvenFamilies.push({
      category: SOUNDPROOF_CATEGORY,
      selector: {
        path: SOUNDPROOF_TABLE_PATH,
        locator: "sSoundMovesTable",
        symbol,
        index: soundMoveIndexBySymbol.get(symbol),
        tableLine: soundproofTableLine,
      },
      entryPath: soundproofPath,
      dispatcher: {
        path: BATTLE_SCRIPT_COMMANDS_PATH,
        locator: "Cmd_attackcanceler",
        line: attackCancelerLine,
        call: ATTACK_CANCELER_MOVES_BLOCK_CALL,
        order: "after AtkCanceler_UnableToUseMove and before selected-slot PP admission",
      },
      familyVerification: {
        scope: "This proves only the selected-move ATTACKCANCELER route; Uproar continuation and Perish Song use separate Soundproof paths.",
        implementation: "src/engine/battleScriptAbilityMovesBlock.ts#advanceBattleScriptMovesBlockAbility",
        batchTest: "tests/battleScriptAbilityMovesBlock.test.ts#blocks every and only source sound selector in both singles orientations",
        oracleReceipt: "tests/fixtures/soundproof-off-evidence.json#hyper-voice-blocked-by-soundproof",
        oracleControl: "tests/fixtures/soundproof-off-evidence.json#tackle-control-still-hits-soundproof",
      },
    });
  }
  sourceProvenFamilies.push(...(absorbingEvidenceByMove.get(symbol) ?? []));
  const abilityHook = sourceProvenFamilies.length === 0
    ? {
      potentialCategories: null,
      status: "unsupported",
      supportedCategories: [],
      unsupportedCategories: null,
      reason: "Per-move ability categories require complete Battle Script control flow, including implicit fallthrough and source branch guards; the partial dispatcher catalog is not joined to moves.",
    }
    : {
      potentialCategories: null,
      status: SOUNDPROOF_STATUS,
      supportedCategories: sourceProvenFamilies.map((family) => family.category),
      unsupportedCategories: null,
      reason: `Source-proven ability family/categories: ${sourceProvenFamilies.map((family) => family.category).join(", ")}. Each named family carries its exact source selector, generated Battle Script route, dispatcher handoff, and bounded family-level verification. This promotion does not claim unrelated ability families.`,
      evidence: { families: sourceProvenFamilies },
    };
  return {
    id: move.id,
    move: move.move,
    name: move.name,
    moveTable: {
      effect: move.effect,
      secondaryEffectChance: move.secondaryEffectChance,
      type: move.type,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      target: move.target,
      priority: move.priority,
      flags: move.flags,
    },
    frontierSets: { ids: setIdsByMove.get(symbol)!, count: setIdsByMove.get(symbol)!.length },
    battleScript: {
      effectId: script.effectId,
      entryScript: script.entryScript,
      graphLabel: graphLabels.has(script.entryScript) ? script.entryScript : null,
      programLabel: programLabels.has(script.entryScript) ? script.entryScript : null,
      executionInventory: executableMoveSymbols.has(symbol) ? "level50-executable" : "level50-roster-only",
    },
    animation: animation ? {
      script: animation.rootScript,
      componentIds: animation.componentIds,
    } : { script: null, componentIds: [] },
    hooks: {
      item: {
        potentialCategories: null,
        status: "unsupported",
        supportedCategories: [],
        unsupportedCategories: null,
        reason: "Per-move item categories require complete Battle Script control flow, including implicit fallthrough and source branch guards; the partial dispatcher catalog is not joined to moves.",
      },
      ability: abilityHook,
    },
  };
});

const rosterEffects = new Set(records.map((record) => record.moveTable.effect));
const executableRecords = records.filter((record) => record.battleScript.executionInventory === "level50-executable");
const executableEffects = new Set(executableRecords.map((record) => record.moveTable.effect));
const sourceProvenAbilityRecords = records.filter((record) => record.hooks.ability.status === SOUNDPROOF_STATUS);
const soundproofRosterRecords = sourceProvenAbilityRecords.filter((record) => record.hooks.ability.supportedCategories.includes(SOUNDPROOF_CATEGORY));
if (soundproofRosterRecords.length !== 9) {
  throw new Error(`expected nine Level-50 Soundproof selectors, got ${soundproofRosterRecords.length}`);
}
if (soundproofRosterRecords.some((record) => !record.hooks.ability.supportedCategories.includes(SOUNDPROOF_CATEGORY))) {
  throw new Error("a Soundproof roster row does not carry the exact moves-block category");
}
const sourceProvenAbilityCategories = sourceProvenAbilityRecords.flatMap((record) => record.hooks.ability.supportedCategories);
const absorbingCoverageByCategory = Object.fromEntries(ABSORBING_HOOK_DEFINITIONS.map((definition) => {
  const candidates = absorbingCandidateRows.filter((row) => row.category === definition.id);
  const sourceProven = sourceProvenAbilityRecords.filter((record) => record.hooks.ability.supportedCategories.includes(definition.id));
  const excluded = absorbingExcludedCandidates.filter((row) => row.categories.includes(definition.id));
  if (candidates.length !== sourceProven.length + excluded.length) {
    throw new Error(`${definition.id} candidate accounting is not complete`);
  }
  return [definition.id, {
    sourceMoveCandidates: candidates,
    sourceProvenRows: sourceProven.map((record) => record.move),
    excludedCandidates: excluded,
  }];
}));
const onDamageAudit = {
  status: "evidence-checkpoint-no-promotion",
  scope: "Finite Level-50 selector audit for ABILITYEFFECT_ON_DAMAGE. This is intentionally a blocked route-shape census, not a per-move support claim.",
  categories: {
    [ON_DAMAGE_CONTACT_CATEGORY]: {
      selector: "moves.json flags includes FLAG_MAKES_CONTACT",
      candidateRows: onDamageCandidatesByCategory[ON_DAMAGE_CONTACT_CATEGORY],
      count: onDamageCandidatesByCategory[ON_DAMAGE_CONTACT_CATEGORY].length,
    },
    [ON_DAMAGE_COLOR_CHANGE_CATEGORY]: {
      selector: "moves.json power != 0",
      candidateRows: onDamageCandidatesByCategory[ON_DAMAGE_COLOR_CHANGE_CATEGORY],
      count: onDamageCandidatesByCategory[ON_DAMAGE_COLOR_CHANGE_CATEGORY].length,
    },
  },
  overlap: {
    definition: "moves satisfying both FLAG_MAKES_CONTACT and power != 0",
    count: onDamageOverlapMoves.length,
    moves: onDamageOverlapMoves,
  },
  sourceDispatcher: {
    moveEnd: {
      path: BATTLE_SCRIPT_COMMANDS_PATH,
      locator: "Cmd_moveend MOVEEND_ON_DAMAGE_ABILITIES",
      line: moveEndOnDamageCaseLine,
      call: ON_DAMAGE_DISPATCHER_CALL,
      order: "state 3 delegates to AbilityBattleEffects before incrementing gBattleScripting.moveendState",
    },
    targetAbilitySelection: {
      path: SOUNDPROOF_TABLE_PATH,
      locator: "AbilityBattleEffects special=0 target ability selection",
      line: sourceLine(battleUtilSource, "gLastUsedAbility = gBattleMons[battler].ability;", "AbilityBattleEffects target ability selection"),
      guard: "with special == 0, gLastUsedAbility is the supplied battler's ability; Cmd_moveend supplies gBattlerTarget",
    },
    targetTurnDamaged: {
      path: BATTLE_HEADER_PATH,
      locator: "TARGET_TURN_DAMAGED",
      line: sourceLine(battleHeaderSource, targetTurnDamagedDefinition, "TARGET_TURN_DAMAGED"),
      definition: targetTurnDamagedDefinition,
    },
    abilityCases: ON_DAMAGE_ABILITY_DEFINITIONS.map((definition) => ({
      ability: definition.ability,
      category: definition.category,
      selector: definition.selector,
      line: sourceLine(battleUtilSource, `case ${definition.ability}:`, definition.ability),
      orderedGuards: definition.orderedGuards,
      outcome: definition.outcome,
    })),
  },
  routeShapeCensus: {
    status: "entry-block-control-frontier-not-a-complete-witness",
    reason: "Each Level-50 candidate is attached to one source-ordered graph/program entry block. The census preserves fallthrough/jump/call syntax, but does not infer runtime guard outcomes, call returns, target damage, or entry-to-MOVEEND reachability as proof.",
    moveEndTarget: onDamageMoveEndTarget,
    entryBlockShapeCounts: onDamageEntryShapeCounts,
    entries: onDamageRouteShapeRows,
  },
  semanticEvidence: {
    kernelSiblingBatch: {
      status: "tier1-sibling-batch-only",
      implementation: "src/engine/battleScriptMoveEndOpcode.ts#AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)",
      test: "tests/battleScriptMoveEndOpcode.test.ts#MOVEEND_ON_DAMAGE_ABILITIES contact family",
      coverage: "Color Change, Rough Skin, Effect Spore, Poison Point, Static, Flame Body, Cute Charm, non-contact, substitute-suppressed damage, and source-ordered RNG/state guards",
    },
    oracleReceipt: {
      status: "missing-direct-parameterized-oracle-receipt",
      profile: "battle-scene-off",
      checked: "docs/gate6-interaction-matrix-scout.md#R8 is explicitly Immunity/Limber prevention; its Static party appearance does not observe this dispatcher",
      requirement: "Gate 6 requires one deterministic parameterized-oracle semantic receipt for this shared ON_DAMAGE family plus sibling checks before any per-move promotion.",
    },
  },
  blockers: ON_DAMAGE_BLOCKERS,
  promotions: {
    sourceProvenRows: [],
    reason: "No rows promoted: neither complete ordered MOVEEND witnesses nor a direct shared-family Battle Scene OFF semantic receipt are present in this bounded audit.",
  },
};
const output = {
  schema: "level50-move-parameterization/v3",
  source: {
    files: [
      "src/data/gen/moves.json",
      "src/data/gen/battle-frontier-mons.json",
      "src/data/gen/battle-script-topology.json",
      "src/data/gen/battle-script-graph.json",
      "src/data/gen/battle-script-program.json",
      "src/data/gen/factory-animation-inventory.json",
      "src/data/gen/battle-animation-components.json",
      "src/data/gen/battle-frontier-held-items.json",
      "src/data/gen/item-hold-effects.json",
      "src/data/gen/summary-info.json",
      "reference/pokeemerald/src/battle_util.c",
      "reference/pokeemerald/src/battle_script_commands.c",
      "reference/pokeemerald/include/battle.h",
      "reference/pokeemerald/include/constants/pokemon.h",
    ],
    note: `Catalog join plus an intentionally partial source dispatcher inventory. All per-move item joins and ${records.filter((record) => record.hooks.ability.status === "unsupported").length} per-move ability joins remain unsupported; the exact nine Level-50 sSoundMovesTable selectors and the source-proven absorbing candidates carry graph/program/source-handoff evidence. The shared absorbing family has one Volt Absorb OFF receipt plus an all-three-arm sibling batch, not fabricated per-move receipts.`,
  },
  coverage: {
    level50Roster: {
      frontierSetIds: { first: 0, last: 849, count: 850 },
      moveCount: records.length,
      moveTableEffectFamilyCount: rosterEffects.size,
    },
    level50Executable: {
      moveCount: executableRecords.length,
      battleScriptEffectFamilyCount: executableEffects.size,
      rosterOnlyMoveCount: records.length - executableRecords.length,
      rosterOnlyMoveTableEffectFamilyCount: [...rosterEffects].filter((effect) => !executableEffects.has(effect)).length,
    },
    joins: {
      battleScriptGraphLabels: records.filter((record) => record.battleScript.graphLabel !== null).length,
      battleScriptProgramLabels: records.filter((record) => record.battleScript.programLabel !== null).length,
      animationScripts: records.filter((record) => record.animation.script !== null).length,
      itemHookCategories: 0,
      abilityHookCategories: sourceProvenAbilityCategories.length,
      itemHookUnsupportedCategories: null,
      abilityHookUnsupportedCategories: null,
      itemHookUnsupportedRows: records.filter((record) => record.hooks.item.status === "unsupported").length,
      abilityHookUnsupportedRows: records.filter((record) => record.hooks.ability.status === "unsupported").length,
      abilityHookSourceProvenRows: sourceProvenAbilityRecords.length,
    },
    hookCatalogs: {
      item: {
        frontierHeldItemRows: heldItems.count,
        explicitHoldEffectRows: holdEffects.items.length,
        moveToHookDispatchers: ITEM_HOOK_CATALOG,
        catalogedDispatcherCategories: ITEM_HOOK_CATALOG.length,
        completeness: "intentionally-partial",
        unsupportedCategories: null,
        reason: "Only Choice Band selection, target Evasion-up accuracy, and King's Rock flag selectors are inventoried. Per-move joins and all other held-item dispatchers remain unsupported/null.",
      },
      ability: {
        displayRows: Object.keys(abilityDisplay.abilities).length,
        moveToHookDispatchers: ABILITY_HOOK_CATALOG,
        catalogedDispatcherCategories: ABILITY_HOOK_CATALOG.length,
        soundproofSourceSelectorRows: soundMoves.size,
        soundproofLevel50RosterSelectorRows: soundproofRosterRecords.length,
        soundproofSourceProvenRosterRows: soundproofRosterRecords.length,
        soundproofUnsupportedLevel50RosterRows: records.length - soundproofRosterRecords.length,
        absorbing: absorbingCoverageByCategory,
        onDamage: onDamageAudit,
        completeness: "intentionally-partial",
        unsupportedCategories: null,
        reason: "The exact Level-50 Soundproof moves-block family and the audited shared absorbing dispatcher candidates are source-proven. Contact/on-damage has a finite blocked candidate/guard/route-shape audit but remains unsupported per move until complete ordered MOVEEND witnesses and a direct shared-family OFF receipt exist; accuracy and all other ability dispatcher families remain intentionally unsupported/null per move.",
      },
    },
  },
  moves: records,
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const outputPath = join(OUTPUT_DIR, "level50-move-parameterization.json");
writeFileSync(outputPath, `${JSON.stringify(output)}\n`);
console.log(`wrote ${outputPath} (${records.length} roster moves; ${executableRecords.length} executable moves)`);
