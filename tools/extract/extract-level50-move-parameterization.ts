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
type Inventory = { tiers: { level50: { moves: Array<{ id: number; move: string; animationScript: string; frontierMonCount: number }> } } };
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
const battleScriptConstantsSource = readFileSync(join(RUN_ROOT, "reference", "pokeemerald", "include", "constants", "battle_script_commands.h"), "utf8");
const abilityConstantsSource = readFileSync(join(RUN_ROOT, "reference", "pokeemerald", "include", "constants", "abilities.h"), "utf8");

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
const MOVES_PATH = "src/data/gen/moves.json";
const BATTLE_HEADER_PATH = "reference/pokeemerald/include/battle.h";
const BATTLE_SCRIPT_CONSTANTS_PATH = "reference/pokeemerald/include/constants/battle_script_commands.h";
const ABILITY_CONSTANTS_PATH = "reference/pokeemerald/include/constants/abilities.h";
const ATTACK_CANCELER_MOVES_BLOCK_CALL = "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0)";
const ABSORBING_DISPATCHER_CALL = "AbilityBattleEffects(ABILITYEFFECT_ABSORBING, gBattlerTarget, 0, 0, move)";
const ON_DAMAGE_DISPATCHER_CALL = "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE, gBattlerTarget, 0, 0, 0)";
const KINGS_ROCK_CATEGORY = "moveend-kings-rock";
const KINGS_ROCK_DISPATCHER_CALL = "ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)";
const SHELL_BELL_CATEGORY = "moveend-shell-bell";
const SYNCHRONIZE_CATEGORY = "moveend-synchronize-status";
const TRYINFATUATING_OBLIVIOUS_CATEGORY = "tryinfatuating-oblivious";
const TRYEXPLOSION_DAMP_CATEGORY = "tryexplosion-damp";
const SYNCHRONIZE_DISPATCHER_TARGET_CALL = "AbilityBattleEffects(ABILITYEFFECT_SYNCHRONIZE, gBattlerTarget, 0, 0, 0)";
const SYNCHRONIZE_DISPATCHER_ATTACKER_CALL = "AbilityBattleEffects(ABILITYEFFECT_ATK_SYNCHRONIZE, gBattlerAttacker, 0, 0, 0)";
const SYNCHRONIZE_EFFECTS = [
  { byte: "MOVE_EFFECT_POISON", status: "poison", marker: true },
  { byte: "MOVE_EFFECT_TOXIC", status: "toxic", marker: true },
  { byte: "MOVE_EFFECT_PARALYSIS", status: "paralysis", marker: true },
  { byte: "MOVE_EFFECT_BURN", status: "burn", marker: true },
] as const;
const SYNCHRONIZE_MARKER_EXCLUSIONS = [
  { byte: "MOVE_EFFECT_SLEEP", reason: "SetMoveEffect writes sleep but its for-synchronize selector names only poison, toxic, paralysis, and burn." },
  { byte: "MOVE_EFFECT_FREEZE", reason: "SetMoveEffect writes freeze but its for-synchronize selector names only poison, toxic, paralysis, and burn." },
  { byte: "all other MOVE_EFFECT_* bytes", reason: "Non-status effects write status2/stat/item/volatile state and never enter the marker selector." },
] as const;

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
  { id: SHELL_BELL_CATEGORY, dispatcher: "Cmd_moveend ITEMEFFECT_KINGSROCK_SHELLBELL", selector: "power != 0 (successful target datahpupdate) after a MOVEEND-reachable path", ownership: "attacker held item with HOLD_EFFECT_SHELL_BELL" },
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
  { id: SYNCHRONIZE_CATEGORY, dispatcher: "AbilityBattleEffects(ABILITYEFFECT_SYNCHRONIZE / ABILITYEFFECT_ATK_SYNCHRONIZE)", selector: "HITMARKER_SYNCHRONIZE_EFFECT after SetMoveEffect and MOVEEND states 2/5", ownership: "target or attacker ability is ABILITY_SYNCHRONIZE" },
  { id: TRYINFATUATING_OBLIVIOUS_CATEGORY, dispatcher: "Cmd_tryinfatuating", selector: "moveTable.effect === EFFECT_ATTRACT after attackcanceler → accuracycheck", ownership: "target ability is ABILITY_OBLIVIOUS" },
  { id: TRYEXPLOSION_DAMP_CATEGORY, dispatcher: "Cmd_tryexplosion", selector: "moveTable.effect === EFFECT_EXPLOSION after attackcanceler → ppreduce", ownership: "first active battler in index order with ABILITY_DAMP (including attacker)" },
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
] as const;

const ON_DAMAGE_RETIRED_BLOCKERS = [
  {
    id: "missing-direct-on-damage-off-receipt",
    reason: "Retired for the shared dispatcher only: two process-isolated Battle Scene OFF mechanicLab receipts observe a legal target Kecleon survive Thunderbolt, change both live type slots Normal→Electric, reveal ability 16, and consume no RNG on the mutation frame. This is not a per-move promotion and does not prove every generated route.",
    fixture: "tools/battle-lab/mechanic-color-change-off.json",
    probe: "tools/probe/probe-color-change-ability-off.py",
    receipts: [
      "tools/probe/receipts/color-change-off-seed-610839776.json",
      "tools/probe/receipts/color-change-off-seed-324508639.json",
    ],
  },
  {
    id: "ordered-moveend-route-not-proven",
    reason: "Retired for the contact family: every one of the 94 FLAG_MAKES_CONTACT Level-50 candidates now carries an ordered source/program route from a damaging entry (or BIDE release) through target datahpupdate to a MOVEEND_ON_DAMAGE_ABILITIES handoff. Multi-hit uses its successful hit loop; BIDE's charge-only path remains an explicit no-damage alternative.",
  },
  {
    id: "damage-state-guard-not-derived-from-selector",
    reason: "Retired for the contact family: the shared source dispatcher and Cmd_datahpupdate witness now bind FLAG_MAKES_CONTACT to TARGET_TURN_DAMAGED, positive non-passive target damage, no-effect/miss, attacker survival, and confusion-self-hit guards. Static/Tier-1 sibling evidence proves the common dispatcher outcome without fabricating per-move receipts.",
  },
] as const;

const COLOR_CHANGE_RETIRED_BLOCKERS = [
  {
    id: "ordered-moveend-route-not-proven",
    reason: "Retired for the Color Change family: every supported Level-50 selector now carries a source/program route witness from its damaging entry (or BIDE release) through target datahpupdate to a Cmd_moveend handoff that reaches MOVEEND_ON_DAMAGE_ABILITIES. Future Sight is retained as an explicit source exception because its delayed handoff starts at MOVEEND_ITEM_EFFECTS_ALL.",
  },
  {
    id: "damage-state-guard-not-derived-from-selector",
    reason: "Retired for the Color Change family: the family witness derives the selector power != 0 together with the ordered source guards for MOVE_RESULT_NO_EFFECT, MOVE_STRUGGLE, TARGET_TURN_DAMAGED, already-matching target type, and target survival; Cmd_datahpupdate is separately pinned as the positive non-passive damage-state writer. Present healing, misses/no-effect, and faint paths are explicit non-activation outcomes.",
  },
] as const;

const COLOR_CHANGE_EXCEPTION_IDS = {
  futureSightMoveEndBypass: "future-sight-delayed-moveend-bypass",
} as const;

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
  blockerIds: string[];
  routeWitnessId?: string;
  routeStatus?: "source-proven" | "source-exception";
};

type OnDamageRoutePosition = { label: string; line: number };
type OnDamageRouteTransition = {
  from: OnDamageRoutePosition;
  to: OnDamageRoutePosition | null;
  kind: string;
  macro: string | null;
  callTarget?: OnDamageRoutePosition;
  resume?: OnDamageRoutePosition;
};
type OnDamageRoutePath = {
  positions: OnDamageRoutePosition[];
  transitions: OnDamageRouteTransition[];
};
// A route certificate is a proof for one concrete, successful use of a move.
// These requirements deliberately prune contradictory control-flow arms before
// path search.  A score-based preference is not sufficient: a short no-effect
// arm can otherwise beat the longer live-hit arm and make datahpupdate look
// reachable even though its TARGET_TURN_DAMAGED write is guarded out.
type OnDamageRouteConstraint = (
  position: OnDamageRoutePosition,
  statement: GraphStatement,
  edge: GraphEdge,
) => boolean;

const onDamageGraphEdgesByPosition = new Map<string, GraphEdge[]>();
for (const edge of graph.controlFlow.edges) {
  const key = `${edge.from.label}:${edge.from.line}`;
  onDamageGraphEdgesByPosition.set(key, [...(onDamageGraphEdgesByPosition.get(key) ?? []), edge]);
}

function onDamagePositionKey(position: OnDamageRoutePosition): string {
  return `${position.label}:${position.line}`;
}

function onDamageStatement(position: OnDamageRoutePosition): GraphStatement {
  const statement = requireGraphLabel(position.label).statements.find((candidate) => candidate.line === position.line);
  if (!statement) throw new Error(`ON_DAMAGE route lacks ${position.label}:${position.line}`);
  requireRouteStatement(position.label, position.line, statement.mnemonic, statement.operandTokens);
  return statement;
}

function onDamageNextStatement(position: OnDamageRoutePosition): OnDamageRoutePosition | null {
  const statements = requireGraphLabel(position.label).statements;
  const index = statements.findIndex((statement) => statement.line === position.line);
  if (index < 0 || index + 1 >= statements.length) return null;
  return { label: position.label, line: statements[index + 1]!.line };
}

function onDamageFirstStatement(label: string): OnDamageRoutePosition {
  const graphLabel = requireGraphLabel(label);
  const first = graphLabel.statements[0];
  if (first) return { label, line: first.line };
  if (graphLabel.nextLabel) return onDamageFirstStatement(graphLabel.nextLabel);
  throw new Error(`${label} has no source statement or successor for an ON_DAMAGE route`);
}

function onDamageCallReturns(label: string): boolean {
  const statements = requireGraphLabel(label).statements;
  if (statements.at(-1)?.mnemonic === "return") return true;
  // A call target's own last statement is not always the return -- e.g.
  // BattleScript_WeatherFormChanges falls through into a same-battler loop
  // label before its eventual return. Search the full reachable subgraph
  // rather than only the entry label's own statement list.
  const start = onDamageFirstStatement(label);
  const queue: OnDamageRoutePosition[] = [start];
  const seen = new Set<string>([onDamagePositionKey(start)]);
  while (queue.length > 0) {
    const position = queue.shift()!;
    if (onDamageStatement(position).mnemonic === "return") return true;
    for (const edge of onDamageGraphEdgesByPosition.get(onDamagePositionKey(position)) ?? []) {
      if (edge.to === null) continue;
      const next: OnDamageRoutePosition = { label: edge.to.label, line: edge.to.line };
      const key = onDamagePositionKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

function onDamageRoutePath(
  startLabel: string | OnDamageRoutePosition,
  target: (statement: GraphStatement) => boolean,
  description: string,
  edgeConstraint?: OnDamageRouteConstraint,
): OnDamageRoutePath {
  type QueueEntry = { position: OnDamageRoutePosition; path: OnDamageRoutePath; cost: number; sequence: number };
  const start = typeof startLabel === "string" ? onDamageFirstStatement(startLabel) : startLabel;
  const queue: QueueEntry[] = [{ position: start, path: { positions: [start], transitions: [] }, cost: 0, sequence: 0 }];
  const bestCost = new Map<string, number>([[onDamagePositionKey(start), 0]]);
  const rank = (edge: GraphEdge): number => edge.kind === "jump" ? 0 : edge.kind === "call" ? 1 : 2;
  let nextSequence = 1;
  while (queue.length > 0) {
    queue.sort((left, right) => left.cost - right.cost || left.sequence - right.sequence);
    const current = queue.shift()!;
    const currentKey = onDamagePositionKey(current.position);
    if (current.cost !== bestCost.get(currentKey)) continue;
    const statement = onDamageStatement(current.position);
    if (target(statement)) return current.path;
    const edges = [...(onDamageGraphEdgesByPosition.get(currentKey) ?? [])]
      .sort((left, right) => rank(left) - rank(right));
    for (const edge of edges) {
      if (edge.to === null) continue;
      if (edgeConstraint !== undefined && !edgeConstraint(current.position, statement, edge)) continue;
      let next: OnDamageRoutePosition | null = { label: edge.to.label, line: edge.to.line };
      let callTarget: OnDamageRoutePosition | undefined;
      let resume: OnDamageRoutePosition | undefined;
      if (edge.kind === "call") {
        callTarget = next;
        if (!onDamageCallReturns(callTarget.label)) {
          throw new Error(`${startLabel} route call target ${callTarget.label} does not return`);
        }
        resume = onDamageNextStatement(current.position) ?? undefined;
        next = resume ?? null;
      }
      if (next === null) continue;
      const edgeCost = rank(edge);
      const nextKey = onDamagePositionKey(next);
      const nextCost = current.cost + edgeCost;
      if (nextCost >= (bestCost.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      const transition: OnDamageRouteTransition = {
        from: current.position,
        to: { label: edge.to.label, line: edge.to.line },
        kind: edge.kind,
        macro: edge.provenance.macro ?? null,
        ...(callTarget === undefined ? {} : { callTarget }),
        ...(resume === undefined ? {} : { resume }),
      };
      queue.push({
        position: next,
        path: {
          positions: [...current.path.positions, next],
          transitions: [...current.path.transitions, transition],
        },
        cost: nextCost,
        sequence: nextSequence++,
      });
      bestCost.set(nextKey, nextCost);
    }
  }
  throw new Error(`${startLabel} has no ON_DAMAGE route ${description}`);
}

function onDamageMoveRouteRequirement(move: string, position: OnDamageRoutePosition, statement: GraphStatement): string | null {
  if (statement.mnemonic === "jumpifnotmove") {
    return statement.operandTokens[0] === move ? "fallthrough" : "jump";
  }
  if (statement.mnemonic === "jumpifmove") {
    return statement.operandTokens[0] === move ? "jump" : "fallthrough";
  }
  if (statement.mnemonic === "accuracycheck" || statement.mnemonic === "jumpifmovehadnoeffect") {
    // Both commands transfer to an unsuccessful arm. A Color Change route is
    // only evidence for a real hit, so it must take the ordinary successor.
    return "fallthrough";
  }
  if (statement.mnemonic === "jumpifnodamage") {
    // This command's one reachable Level-50 use is Focus Punch's pre-use
    // cancellation check. Its *jump* is the no-prior-damage success arm,
    // unlike a post-hit no-effect branch; keep that source-specific semantic
    // explicit instead of treating the mnemonic name as a generic failure.
    if (move === "MOVE_FOCUS_PUNCH"
      && position.label === "BattleScript_EffectFocusPunch"
      && position.line === 2262
      && statement.operandTokens[0] === "BattleScript_HitFromAccCheck") {
      return "jump";
    }
    throw new Error(`${move} reaches unmodeled jumpifnodamage at ${position.label}:${position.line}`);
  }
  if (statement.mnemonic === "jumpifbyte"
    && statement.operandTokens.includes("gMoveResultFlags")
    && statement.operandTokens.some((token) => token.includes("MOVE_RESULT_NO_EFFECT"))) {
    // Do not silently accept a direct spelling of a no-effect branch. Add its
    // source semantics above before promoting a new route shape.
    throw new Error(`${move} reaches unmodeled MOVE_RESULT_NO_EFFECT branch at ${position.label}:${position.line}`);
  }
  if (move === "MOVE_FUTURE_SIGHT"
    && statement.mnemonic === "jumpifbyte"
    && statement.operandTokens.includes("B_MSG_FUTURE_SIGHT")) {
    // MonTookFutureAttack shares this block with Doom Desire. Future Sight
    // falls through CMP_NOT_EQUAL; jumping would certify Doom Desire instead.
    return "fallthrough";
  }
  return null;
}

function onDamageMoveRouteConstraint(move: string): OnDamageRouteConstraint {
  return (position, statement, edge) => {
    const requiredKind = onDamageMoveRouteRequirement(move, position, statement);
    return requiredKind === null || edge.kind === requiredKind;
  };
}

function onDamageRouteWitnessPath(path: OnDamageRoutePath) {
  const route = path.positions.map((position) => {
    const statement = onDamageStatement(position);
    return {
      label: position.label,
      line: position.line,
      mnemonic: statement.mnemonic,
      operands: statement.operandTokens,
    };
  });
  const transitions = path.transitions.map((transition) => ({
    from: transition.from,
    to: transition.to,
    kind: transition.kind,
    macro: transition.macro,
    ...(transition.callTarget === undefined ? {} : { callTarget: transition.callTarget }),
    ...(transition.resume === undefined ? {} : { resume: transition.resume }),
  }));
  return {
    graph: { path: BATTLE_SCRIPT_GRAPH_PATH, entryLabel: path.positions[0]!.label, route, transitions },
    program: { path: BATTLE_SCRIPT_PROGRAM_PATH, entryLabel: path.positions[0]!.label, route, transitions },
  };
}

function onDamageRouteHandoff(statement: GraphStatement) {
  if (statement.mnemonic === "moveendall") {
    return {
      kind: "moveendall",
      label: "BattleScript_MoveEnd",
      line: statement.line,
      state: "MOVEEND_ON_DAMAGE_ABILITIES",
      stateValue: 3,
      semantics: "Cmd_moveend starts at state 0 and executes state 3 before ending the full moveendall pass",
    };
  }
  if (statement.mnemonic === "moveendto" && statement.operandTokens[0] === "MOVEEND_NEXT_TARGET") {
    return {
      kind: "moveendto-next-target",
      label: "Cmd_moveend",
      line: statement.line,
      state: "MOVEEND_ON_DAMAGE_ABILITIES",
      stateValue: 3,
      semantics: "Cmd_moveend endMode 2 starts at state 0 and runs through state 3 before the requested MOVEEND_NEXT_TARGET stop",
    };
  }
  if (statement.mnemonic === "moveendfromto" && statement.operandTokens[0] === "MOVEEND_ON_DAMAGE_ABILITIES") {
    return {
      kind: "moveendfromto-on-damage",
      label: "Cmd_moveend",
      line: statement.line,
      state: "MOVEEND_ON_DAMAGE_ABILITIES",
      stateValue: 3,
      semantics: "Cmd_moveend is explicitly entered at MOVEEND_ON_DAMAGE_ABILITIES",
    };
  }
  return null;
}

function onDamageRouteToDataAndMoveEnd(startLabel: string, edgeConstraint?: OnDamageRouteConstraint) {
  const dataPath = onDamageRoutePath(
    startLabel,
    (statement) => statement.mnemonic === "datahpupdate" && statement.operandTokens[0] === "BS_TARGET",
    "target datahpupdate",
    edgeConstraint,
  );
  const dataPosition = dataPath.positions.at(-1)!;
  const moveEndPath = onDamageRoutePath(
    dataPosition,
    (statement) => statement.line === dataPosition.line
      ? false
      : onDamageRouteHandoff(statement) !== null,
    "a MOVEEND_ON_DAMAGE handoff after target datahpupdate",
    edgeConstraint,
  );
  const handoffPosition = moveEndPath.positions.at(-1)!;
  const handoff = onDamageRouteHandoff(onDamageStatement(handoffPosition));
  if (handoff === null) throw new Error(`${startLabel} route handoff disappeared`);
  const fullPath: OnDamageRoutePath = {
    positions: [...dataPath.positions, ...moveEndPath.positions.slice(1)],
    transitions: [...dataPath.transitions, ...moveEndPath.transitions],
  };
  return {
    dataPath: onDamageRouteWitnessPath(dataPath),
    moveEndPath: onDamageRouteWitnessPath(moveEndPath),
    dataHpUpdate: { label: dataPosition.label, line: dataPosition.line, mnemonic: "datahpupdate", operands: ["BS_TARGET"] },
    moveEnd: { ...handoff, label: handoffPosition.label },
    fullPath: onDamageRouteWitnessPath(fullPath),
  };
}

function onDamageRuntimeGuardSignature() {
  const dataHpUpdateDeclaration = battleScriptCommandsSource.indexOf("static void Cmd_datahpupdate(void)");
  const dataHpUpdateDefinition = battleScriptCommandsSource.indexOf("static void Cmd_datahpupdate(void)", dataHpUpdateDeclaration + 1);
  if (dataHpUpdateDeclaration < 0 || dataHpUpdateDefinition < 0) throw new Error("unable to locate Cmd_datahpupdate definition");
  const dataHpUpdateLine = battleScriptCommandsSource.slice(0, dataHpUpdateDefinition).split("\n").length;
  const moveEndStateLine = sourceLine(battleScriptConstantsSource, "#define MOVEEND_ON_DAMAGE_ABILITIES", "MOVEEND_ON_DAMAGE_ABILITIES");
  const colorChangeLine = sourceLine(battleUtilSource, "case ABILITY_COLOR_CHANGE:", "ABILITY_COLOR_CHANGE");
  const sourceNoEffect = "if (!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT))";
  const sourcePositiveDamage = "if (gBattleMoveDamage < 0)";
  const sourcePassiveDamage = "!(gHitMarker & HITMARKER_PASSIVE_HP_UPDATE)";
  if (!battleScriptCommandsSource.includes(sourceNoEffect)
    || !battleScriptCommandsSource.includes(sourcePositiveDamage)
    || !battleScriptCommandsSource.includes(sourcePassiveDamage)
    || !battleScriptConstantsSource.includes("#define MOVEEND_ON_DAMAGE_ABILITIES               3")) {
    throw new Error("Cmd_datahpupdate or MOVEEND_ON_DAMAGE_ABILITIES source guard drifted");
  }
  return {
    selector: {
      path: SOUNDPROOF_TABLE_PATH,
      locator: "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE) ABILITY_COLOR_CHANGE",
      line: colorChangeLine,
      guard: "gBattleMoves[move].power != 0",
      derivedFrom: "moveend-color-change candidate selector moves.json power != 0",
    },
    moveEnd: {
      path: BATTLE_SCRIPT_COMMANDS_PATH,
      locator: "Cmd_moveend MOVEEND_ON_DAMAGE_ABILITIES",
      line: moveEndOnDamageCaseLine,
      statePath: BATTLE_SCRIPT_CONSTANTS_PATH,
      stateLine: moveEndStateLine,
      state: "MOVEEND_ON_DAMAGE_ABILITIES",
      stateValue: 3,
      call: ON_DAMAGE_DISPATCHER_CALL,
      target: "gBattlerTarget",
    },
    dataHpUpdate: {
      path: BATTLE_SCRIPT_COMMANDS_PATH,
      locator: "Cmd_datahpupdate",
      line: dataHpUpdateLine,
      target: "BS_TARGET",
      noEffectGuard: sourceNoEffect,
      positiveDamageGuard: sourcePositiveDamage,
      passiveDamageGuard: sourcePassiveDamage,
      writes: [
        "gSpecialStatuses[gActiveBattler].physicalDmg = gHpDealt",
        "gSpecialStatuses[gActiveBattler].specialDmg = gHpDealt",
      ],
      consequence: "positive, non-passive target datahpupdate writes physicalDmg or specialDmg, which satisfies TARGET_TURN_DAMAGED; negative healing and passive HP updates do not write that tracker",
    },
    orderedAbilityGuards: [
      "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
      "move != MOVE_STRUGGLE",
      "gBattleMoves[move].power != 0",
      "TARGET_TURN_DAMAGED",
      "!IS_BATTLER_OF_TYPE(battler, moveType)",
      "gBattleMons[battler].hp != 0",
    ],
    outcomeBoundaries: [
      "accuracy miss and no-effect paths either bypass target datahpupdate or leave MOVE_RESULT_NO_EFFECT set, so the dispatcher guard is quiet",
      "a target fainted by datahpupdate is rejected by gBattleMons[battler].hp != 0",
      "an already-matching first or second target type is rejected by !IS_BATTLER_OF_TYPE",
      "Present's negative-damage heal path writes HP without physicalDmg/specialDmg and therefore cannot satisfy TARGET_TURN_DAMAGED",
      "BIDE's charge entry has no target datahpupdate; its later BideAttack release is the proven damaging phase",
      "Future Sight's delayed target datahpupdate is followed by moveendfromto starting at MOVEEND_ITEM_EFFECTS_ALL, which bypasses state 3",
    ],
  };
}

const onDamageColorChangeRuntimeGuards = onDamageRuntimeGuardSignature();

function onDamageContactRuntimeGuardSignature() {
  const base = onDamageColorChangeRuntimeGuards;
  const roughSkinLine = sourceLine(battleUtilSource, "case ABILITY_ROUGH_SKIN:", "ABILITY_ROUGH_SKIN");
  return {
    ...base,
    selector: {
      path: MOVES_PATH,
      locator: "moves.json flags includes FLAG_MAKES_CONTACT",
      line: roughSkinLine,
      guard: "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)",
      derivedFrom: "moveend-contact-on-damage candidate selector moves.json flags includes FLAG_MAKES_CONTACT",
    },
    orderedAbilityGuards: ON_DAMAGE_COMMON_CONTACT_GUARDS,
    outcomeBoundaries: [
      "accuracy miss and no-effect paths either bypass target datahpupdate or leave MOVE_RESULT_NO_EFFECT set, so the contact dispatcher is quiet",
      "a positive, non-passive target datahpupdate writes physicalDmg or specialDmg and therefore satisfies TARGET_TURN_DAMAGED",
      "Substitute updates substitute HP without writing the target physical/special damage trackers, so contact abilities do not activate",
      "a confusion self-hit sets confusionSelfDmg and redirects the target to the attacker, so the contact dispatcher is quiet",
      "multi-hit contact moves run the same dispatcher after each successful hit; a dead attacker or target ends the loop before another successful hit",
      "BIDE's charge entry reaches MoveEnd without target datahpupdate; only the later BideAttack release is a contact-damage phase",
    ],
  };
}

const onDamageContactRuntimeGuards = onDamageContactRuntimeGuardSignature();

function colorChangeRouteEvidence(move: Move, entryScript: string) {
  const routeConstraint = onDamageMoveRouteConstraint(move.move);
  if (move.move === "MOVE_FUTURE_SIGHT") {
    const delayedDataPath = onDamageRoutePath(
      "BattleScript_MonTookFutureAttack",
      (statement) => statement.mnemonic === "datahpupdate" && statement.operandTokens[0] === "BS_TARGET",
      "Future Sight delayed target datahpupdate",
      routeConstraint,
    );
    const delayedDataPosition = delayedDataPath.positions.at(-1)!;
    const delayedMoveEndPath = onDamageRoutePath(
      delayedDataPosition,
      (statement) => statement.mnemonic === "moveendfromto",
      "Future Sight delayed moveendfromto bypass",
      routeConstraint,
    );
    const futureHandoff = requireGraphLabel("BattleScript_FutureAttackEnd").statements.find((statement) => statement.mnemonic === "moveendfromto");
    if (!futureHandoff) throw new Error("Future Sight delayed route lacks moveendfromto");
    return {
      status: "source-exception" as const,
      id: `color-change-route:${move.move}`,
      move: move.move,
      entryScript,
      exception: {
        id: COLOR_CHANGE_EXCEPTION_IDS.futureSightMoveEndBypass,
        reason: "Future Sight's delayed hit performs target datahpupdate but BattleScript_FutureAttackEnd uses moveendfromto MOVEEND_ITEM_EFFECTS_ALL, MOVEEND_UPDATE_LAST_MOVES and therefore skips MOVEEND_ON_DAMAGE_ABILITIES state 3.",
        source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
        delayedDamagePath: onDamageRouteWitnessPath(delayedDataPath),
        delayedMoveEndPath: onDamageRouteWitnessPath(delayedMoveEndPath),
        delayedMoveEnd: { label: "BattleScript_FutureAttackEnd", line: futureHandoff.line, mnemonic: futureHandoff.mnemonic, operands: futureHandoff.operandTokens },
        bypassedState: { state: "MOVEEND_ON_DAMAGE_ABILITIES", value: 3, startsAt: "MOVEEND_ITEM_EFFECTS_ALL", valueStart: 11 },
      },
    };
  }

  const routeKind = move.move === "MOVE_BIDE"
    ? "bide-release-after-charge"
    : move.move === "MOVE_PRESENT"
      ? "present-variable-damage-with-heal-branch"
      : "damaging-entry-to-target-datahpupdate";
  const damaging = move.move === "MOVE_BIDE"
    ? onDamageRouteToDataAndMoveEnd("BattleScript_BideAttack", routeConstraint)
    : move.move === "MOVE_PRESENT"
      ? onDamageRouteToDataAndMoveEnd("BattleScript_HitFromCritCalc", routeConstraint)
      : onDamageRouteToDataAndMoveEnd(entryScript === "BattleScript_EffectReturn" ? "BattleScript_EffectFrustration" : entryScript, routeConstraint);
  const entryPath = onDamageRoutePath(
    entryScript === "BattleScript_EffectReturn" ? "BattleScript_EffectFrustration" : entryScript,
    (statement) => statement.mnemonic === "moveendall" || statement.mnemonic === "datahpupdate",
    "entry path anchor",
    routeConstraint,
  );
  const alternatives: Array<Record<string, unknown>> = [];
  if (move.move === "MOVE_BIDE") {
    const chargePath = onDamageRoutePath("BattleScript_EffectBide", (statement) => statement.mnemonic === "moveendall", "BIDE charge MoveEnd");
    alternatives.push({
      kind: "bide-charge-no-damage",
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel("BattleScript_EffectBide").line },
      path: onDamageRouteWitnessPath(chargePath),
      outcome: "setbide reaches MoveEnd without target datahpupdate; the later source-selected BideAttack release is the damaging phase",
    });
  }
  if (move.move === "MOVE_PRESENT") {
    const healPath = onDamageRoutePath("BattleScript_PresentHealTarget", (statement) => statement.mnemonic === "moveendall", "Present heal MoveEnd");
    const fullHpPath = onDamageRoutePath("BattleScript_AlreadyAtFullHp", (statement) => statement.mnemonic === "moveendall", "Present full-HP MoveEnd");
    alternatives.push({
      kind: "present-negative-damage-heal",
      source: { path: BATTLE_SCRIPT_COMMANDS_PATH, locator: "Cmd_presentdamagecalculation", line: sourceLine(battleScriptCommandsSource, "static void Cmd_presentdamagecalculation(void)", "Cmd_presentdamagecalculation") },
      decision: "rand >= 204 and target is not full HP selects BattleScript_PresentHealTarget with negative gBattleMoveDamage",
      path: onDamageRouteWitnessPath(healPath),
      outcome: "datahpupdate changes HP but does not write physicalDmg or specialDmg, so TARGET_TURN_DAMAGED remains false",
    });
    alternatives.push({
      kind: "present-full-hp-heal-failure",
      source: { path: BATTLE_SCRIPT_COMMANDS_PATH, locator: "Cmd_presentdamagecalculation", line: sourceLine(battleScriptCommandsSource, "static void Cmd_presentdamagecalculation(void)", "Cmd_presentdamagecalculation") },
      decision: "rand >= 204 and target is already full HP selects BattleScript_AlreadyAtFullHp",
      path: onDamageRouteWitnessPath(fullHpPath),
      outcome: "no target datahpupdate and no Color Change dispatcher guard",
    });
  }
  return {
    status: "source-proven" as const,
    id: `color-change-route:${move.move}`,
    move: move.move,
    entryScript,
    routeKind,
    source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
    entryPath: onDamageRouteWitnessPath(entryPath),
    damagingPath: damaging,
    runtimeGuardSignature: onDamageColorChangeRuntimeGuards,
    alternatives,
    familyEvidence: {
      category: ON_DAMAGE_COLOR_CHANGE_CATEGORY,
      selector: onDamageColorChangeRuntimeGuards.selector,
      entryPath: {
        kind: "datahpupdate-to-moveend-on-damage-route",
        source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
        declaredEntryScript: entryScript,
        damagingEntryScript: damaging.dataPath.graph.entryLabel,
        graph: damaging.dataPath.graph,
        program: damaging.dataPath.program,
        dataHpUpdate: damaging.dataHpUpdate,
        moveEnd: damaging.moveEnd,
        alternatives,
      },
      dispatcher: {
        path: BATTLE_SCRIPT_COMMANDS_PATH,
        locator: "Cmd_moveend MOVEEND_ON_DAMAGE_ABILITIES",
        line: moveEndOnDamageCaseLine,
        call: ON_DAMAGE_DISPATCHER_CALL,
        order: "after target datahpupdate/tryfaintmon and before the later moveend states",
        state: "MOVEEND_ON_DAMAGE_ABILITIES",
        stateValue: 3,
      },
      familyVerification: {
        scope: "One shared Battle Scene OFF Color Change receipt plus the existing kernel sibling batch proves the selector and runtime guard family; this route certificate does not fabricate per-move oracle receipts.",
        implementation: "src/engine/battleScriptMoveEndOpcode.ts#AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)",
        batchTest: "tests/battleScriptMoveEndOpcode.test.ts#MOVEEND_ON_DAMAGE_ABILITIES contact family",
        oracleReceipt: "tests/colorChangeOracleEvidence.test.ts#shared ON_DAMAGE Color Change arm",
        oracleFixture: "tools/battle-lab/mechanic-color-change-off.json",
        oracleProbe: "tools/probe/probe-color-change-ability-off.py",
        oracleReceiptFiles: [
          "tools/probe/receipts/color-change-off-seed-610839776.json",
          "tools/probe/receipts/color-change-off-seed-324508639.json",
        ],
        scopeBoundary: "Move-specific receipts are intentionally not authored; table siblings reuse this family proof and the exact route/guard certificate.",
      },
      runtimeGuardSignature: onDamageColorChangeRuntimeGuards,
      routeKind,
    },
  };
}

/**
 * Contact is a separate family certificate even when its successful hit uses
 * the same script route as Color Change.  In particular, this must not copy
 * Color Change's power/type/survival conclusion: it derives the contact
 * selector, the positive target-damage handoff, and the contact dispatcher
 * guard signature independently.  BIDE is the only special BIDE/Present/
 * Future Sight case in the finite contact candidate set.
 */
function contactRouteEvidence(move: Move, entryScript: string) {
  if (!move.flags.includes("FLAG_MAKES_CONTACT")) {
    throw new Error(`${move.move} is not a contact candidate`);
  }
  if (move.move === "MOVE_FUTURE_SIGHT") {
    throw new Error("Future Sight is not a FLAG_MAKES_CONTACT candidate");
  }
  const routeConstraint = onDamageMoveRouteConstraint(move.move);
  const routeKind = move.move === "MOVE_BIDE"
    ? "bide-release-after-charge"
    : "damaging-entry-to-target-datahpupdate";
  const damaging = move.move === "MOVE_BIDE"
    ? onDamageRouteToDataAndMoveEnd("BattleScript_BideAttack", routeConstraint)
    : onDamageRouteToDataAndMoveEnd(entryScript === "BattleScript_EffectReturn" ? "BattleScript_EffectFrustration" : entryScript, routeConstraint);
  const entryPath = onDamageRoutePath(
    entryScript,
    (statement) => statement.mnemonic === "moveendall" || statement.mnemonic === "datahpupdate",
    "contact entry path anchor",
    routeConstraint,
  );
  const alternatives: Array<Record<string, unknown>> = [];
  if (move.move === "MOVE_BIDE") {
    const chargePath = onDamageRoutePath(
      "BattleScript_EffectBide",
      (statement) => statement.mnemonic === "moveendall",
      "BIDE charge MoveEnd",
    );
    alternatives.push({
      kind: "bide-charge-no-damage",
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel("BattleScript_EffectBide").line },
      path: onDamageRouteWitnessPath(chargePath),
      outcome: "setbide reaches MoveEnd without target datahpupdate; the later source-selected BideAttack release is the damaging contact phase",
    });
  }
  return {
    status: "source-proven" as const,
    id: `contact-route:${move.move}`,
    move: move.move,
    entryScript,
    routeKind,
    source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
    entryPath: onDamageRouteWitnessPath(entryPath),
    damagingPath: damaging,
    runtimeGuardSignature: onDamageContactRuntimeGuards,
    alternatives,
    familyEvidence: {
      category: ON_DAMAGE_CONTACT_CATEGORY,
      selector: {
        path: MOVES_PATH,
        locator: `moves:${move.move}.flags`,
        symbol: move.move,
        guard: "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)",
        derivedFrom: "moveend-contact-on-damage candidate selector moves.json flags includes FLAG_MAKES_CONTACT",
      },
      entryPath: {
        kind: "datahpupdate-to-moveend-on-damage-contact-route",
        source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
        declaredEntryScript: entryScript,
        damagingEntryScript: damaging.dataPath.graph.entryLabel,
        graph: damaging.dataPath.graph,
        program: damaging.dataPath.program,
        dataHpUpdate: damaging.dataHpUpdate,
        moveEnd: damaging.moveEnd,
        alternatives,
      },
      dispatcher: {
        path: BATTLE_SCRIPT_COMMANDS_PATH,
        locator: "Cmd_moveend MOVEEND_ON_DAMAGE_ABILITIES",
        line: moveEndOnDamageCaseLine,
        call: ON_DAMAGE_DISPATCHER_CALL,
        order: "after positive target datahpupdate/tryfaintmon and before the later moveend states",
        state: "MOVEEND_ON_DAMAGE_ABILITIES",
        stateValue: 3,
      },
      familyVerification: {
        scope: "One fresh Battle Scene OFF Static receipt plus the shared source-shaped Tier-1 dispatcher batch proves the common contact gate; distinct Rough Skin, Effect Spore, Poison Point, Static, Flame Body, and Cute Charm outcomes remain source/Tier-1 claims rather than fabricated per-move receipts.",
        implementation: "src/engine/battleScriptMoveEndOpcode.ts#AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)",
        batchTest: "tests/battleScriptMoveEndOpcode.test.ts#MOVEEND_ON_DAMAGE_ABILITIES contact family",
        oracleReceipt: "tests/onDamageContactOracleEvidence.test.ts#shared ON_DAMAGE contact dispatcher arm",
        oracleFixture: "tools/battle-lab/mechanic-on-damage-static-off.json",
        oracleProbe: "tools/probe/verify-on-damage-static.py",
        oracleReceiptFiles: ["tools/probe/receipts/on-damage-static-off.json"],
        abilityOutcomes: [
          "ABILITY_ROUGH_SKIN: deterministic attacker maxHP/16 recoil",
          "ABILITY_EFFECT_SPORE: proc plus nonzero status selector and sleep duration when selected",
          "ABILITY_POISON_POINT: proc-gated attacker poison",
          "ABILITY_STATIC: proc-gated attacker paralysis",
          "ABILITY_FLAME_BODY: proc-gated attacker burn",
          "ABILITY_CUTE_CHARM: proc-gated opposite-gender attacker infatuation with Oblivious/status guards",
        ],
        scopeBoundary: "No per-move oracle receipts are authored; all 94 candidates reuse this family route certificate and the distinct ability outcome gaps remain visible in the hook universe.",
      },
      runtimeGuardSignature: onDamageContactRuntimeGuards,
      routeKind,
    },
  };
}

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
    contactRouteWitnessIds: candidates
      .filter((candidate) => candidate.entryScript === entryScript && candidate.category === ON_DAMAGE_CONTACT_CATEGORY)
      .map((candidate) => candidate.routeWitnessId),
    colorChangeRouteWitnessIds: candidates
      .filter((candidate) => candidate.entryScript === entryScript && candidate.category === ON_DAMAGE_COLOR_CHANGE_CATEGORY)
      .map((candidate) => candidate.routeWitnessId),
    blockerIds: [],
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
      blockerIds: [],
      ...(category === ON_DAMAGE_CONTACT_CATEGORY
        ? { routeWitnessId: `contact-route:${symbol}`, routeStatus: "source-proven" as const }
        : { routeWitnessId: `color-change-route:${symbol}`, routeStatus: symbol === "MOVE_FUTURE_SIGHT" ? "source-exception" as const : "source-proven" as const }),
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
const colorChangeRouteEvidenceByMove = new Map<string, ReturnType<typeof colorChangeRouteEvidence>>();
for (const candidate of onDamageCandidatesByCategory[ON_DAMAGE_COLOR_CHANGE_CATEGORY]) {
  const move = moveBySymbol.get(candidate.move)!;
  colorChangeRouteEvidenceByMove.set(candidate.move, colorChangeRouteEvidence(move, candidate.entryScript));
}
const colorChangeRouteEvidenceRows = [...colorChangeRouteEvidenceByMove.values()];
const colorChangeSourceProvenRows = colorChangeRouteEvidenceRows
  .filter((evidence) => evidence.status === "source-proven")
  .map((evidence) => evidence.move);
const colorChangeExceptions = colorChangeRouteEvidenceRows
  .filter((evidence) => evidence.status === "source-exception")
  .map((evidence) => evidence.exception);
if (colorChangeSourceProvenRows.length + colorChangeExceptions.length !== onDamageCandidatesByCategory[ON_DAMAGE_COLOR_CHANGE_CATEGORY].length) {
  throw new Error("Color Change route evidence does not account for every finite candidate");
}
const contactRouteEvidenceByMove = new Map<string, ReturnType<typeof contactRouteEvidence>>();
for (const candidate of onDamageCandidatesByCategory[ON_DAMAGE_CONTACT_CATEGORY]) {
  const move = moveBySymbol.get(candidate.move)!;
  contactRouteEvidenceByMove.set(candidate.move, contactRouteEvidence(move, candidate.entryScript));
}
const contactRouteEvidenceRows = [...contactRouteEvidenceByMove.values()];
const contactSourceProvenRows = contactRouteEvidenceRows
  .filter((evidence) => evidence.status === "source-proven")
  .map((evidence) => evidence.move);
if (contactSourceProvenRows.length !== onDamageCandidatesByCategory[ON_DAMAGE_CONTACT_CATEGORY].length) {
  throw new Error("contact route evidence does not account for every finite candidate");
}
const onDamageRouteShapeRows = onDamageEntryScripts.map((entryScript) => onDamageEntryShape(entryScript, onDamageCandidateRows));
const onDamageEntryShapeCounts = Object.fromEntries([...new Set(onDamageRouteShapeRows.map((row) => row.entryBlockShape))]
  .sort()
  .map((shape) => [shape, onDamageRouteShapeRows.filter((row) => row.entryBlockShape === shape).length]));
const onDamageMoveEndTarget = auditExactScriptBlock("BattleScript_MoveEnd", [
  ["moveendall", []],
  ["end", []],
]);

type SynchronizeSelector = {
  routeKind: string;
  selectorKind: "secondary" | "primary" | "tri-attack" | "multi-hit" | "secret-power" | "bounce-second-turn";
  setter: { mnemonic: string; operands: string[] };
  dispatchMnemonic: "seteffectwithchance" | "seteffectprimary";
  selectedEffects: string[];
  selectorGuard: string;
  procGuard: string;
};

// This is the complete finite set of source entry families that can load one
// of the four status bytes selected by SetMoveEffect's Synchronize marker
// branch. The roster join below, rather than a hand-maintained move list,
// supplies the Level-50 candidates.
const SYNCHRONIZE_ENTRY_SELECTORS = new Map<string, SynchronizeSelector>([
  ["BattleScript_EffectPoisonHit", {
    routeKind: "damaging-secondary-poison",
    selectorKind: "secondary",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_POISON"] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_POISON"],
    selectorGuard: "setmoveeffect MOVE_EFFECT_POISON loads the secondary effect byte before the shared damaging hit path",
    procGuard: "Cmd_seteffectwithchance uses gBattleMoves[gCurrentMove].secondaryEffectChance (doubled for Serene Grace), then requires Random() % 100 < percentChance and no MOVE_RESULT_NO_EFFECT",
  }],
  ["BattleScript_EffectBurnHit", {
    routeKind: "damaging-secondary-burn",
    selectorKind: "secondary",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_BURN"] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_BURN"],
    selectorGuard: "setmoveeffect MOVE_EFFECT_BURN loads the secondary effect byte before the shared damaging hit path",
    procGuard: "Cmd_seteffectwithchance uses gBattleMoves[gCurrentMove].secondaryEffectChance (doubled for Serene Grace), then requires Random() % 100 < percentChance and no MOVE_RESULT_NO_EFFECT",
  }],
  ["BattleScript_EffectParalyzeHit", {
    routeKind: "damaging-secondary-paralysis",
    selectorKind: "secondary",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_PARALYSIS"] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_PARALYSIS"],
    selectorGuard: "setmoveeffect MOVE_EFFECT_PARALYSIS loads the secondary effect byte before the shared damaging hit path",
    procGuard: "Cmd_seteffectwithchance uses gBattleMoves[gCurrentMove].secondaryEffectChance (doubled for Serene Grace), then requires Random() % 100 < percentChance and no MOVE_RESULT_NO_EFFECT",
  }],
  ["BattleScript_EffectToxic", {
    routeKind: "direct-primary-toxic",
    selectorKind: "primary",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_TOXIC"] },
    dispatchMnemonic: "seteffectprimary",
    selectedEffects: ["MOVE_EFFECT_TOXIC"],
    selectorGuard: "direct primary SetMoveEffect(TRUE, 0) writes MOVE_EFFECT_TOXIC after Toxic's type/status/accuracy/Safeguard guards",
    procGuard: "primary SetMoveEffect has no secondary chance roll; Toxic's accuracy and source guards must pass",
  }],
  ["BattleScript_EffectParalyze", {
    routeKind: "direct-primary-paralysis",
    selectorKind: "primary",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_PARALYSIS"] },
    dispatchMnemonic: "seteffectprimary",
    selectedEffects: ["MOVE_EFFECT_PARALYSIS"],
    selectorGuard: "direct primary SetMoveEffect(TRUE, 0) writes MOVE_EFFECT_PARALYSIS after Limber/status/accuracy/Safeguard guards",
    procGuard: "primary SetMoveEffect has no secondary chance roll; the entry's accuracy and source guards must pass",
  }],
  ["BattleScript_EffectThawHit", {
    routeKind: "damaging-secondary-thaw-burn",
    selectorKind: "secondary",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_BURN"] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_BURN"],
    selectorGuard: "setmoveeffect MOVE_EFFECT_BURN loads the thaw-hit secondary effect byte before the shared damaging hit path",
    procGuard: "Cmd_seteffectwithchance uses gBattleMoves[gCurrentMove].secondaryEffectChance (doubled for Serene Grace), then requires Random() % 100 < percentChance and no MOVE_RESULT_NO_EFFECT",
  }],
  ["BattleScript_EffectThunder", {
    routeKind: "damaging-secondary-thunder-paralysis",
    selectorKind: "secondary",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_PARALYSIS"] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_PARALYSIS"],
    selectorGuard: "setmoveeffect MOVE_EFFECT_PARALYSIS plus HITMARKER_IGNORE_ON_AIR loads Thunder's secondary effect before the shared damaging hit path",
    procGuard: "Cmd_seteffectwithchance uses Thunder's move-table secondaryEffectChance (doubled for Serene Grace), then requires Random() % 100 < percentChance and no MOVE_RESULT_NO_EFFECT",
  }],
  ["BattleScript_EffectWillOWisp", {
    routeKind: "direct-primary-burn",
    selectorKind: "primary",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_BURN"] },
    dispatchMnemonic: "seteffectprimary",
    selectedEffects: ["MOVE_EFFECT_BURN"],
    selectorGuard: "direct primary SetMoveEffect(TRUE, 0) writes MOVE_EFFECT_BURN after Fire-type, Water Veil, status, accuracy, and Safeguard guards",
    procGuard: "primary SetMoveEffect has no secondary chance roll; Will-O-Wisp's accuracy and source guards must pass",
  }],
  ["BattleScript_EffectTriAttack", {
    routeKind: "damaging-secondary-tri-attack-status-reroll",
    selectorKind: "tri-attack",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_TRI_ATTACK"] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_BURN", "MOVE_EFFECT_PARALYSIS"],
    selectorGuard: "SetMoveEffect's MOVE_EFFECT_TRI_ATTACK arm performs Random() % 3 + 3: 3 burn, 4 freeze, 5 paralysis; only burn and paralysis enter the Synchronize marker selector",
    procGuard: "the outer Cmd_seteffectwithchance chance gate must pass before the MOVE_EFFECT_TRI_ATTACK arm rerolls; freeze is an explicit excluded outcome",
  }],
  ["BattleScript_EffectTwineedle", {
    routeKind: "multi-hit-secondary-poison",
    selectorKind: "multi-hit",
    setter: { mnemonic: "setbyte", operands: ["sMULTIHIT_EFFECT", "MOVE_EFFECT_POISON"] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_POISON"],
    selectorGuard: "Twineedle stores MOVE_EFFECT_POISON in sMULTIHIT_EFFECT, copies it into cEFFECT_CHOOSER for each successful hit, and applies the final effect at MultiHitEnd",
    procGuard: "each successful hit is gated by alive attacker/target, accuracy/no-effect, and the multi-hit loop; the final Cmd_seteffectwithchance uses the move-table secondary chance",
  }],
  ["BattleScript_EffectSecretPower", {
    routeKind: "damaging-secondary-secret-power-environment",
    selectorKind: "secret-power",
    setter: { mnemonic: "getsecretpowereffect", operands: [] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_POISON", "MOVE_EFFECT_PARALYSIS"],
    selectorGuard: "Cmd_getsecretpowereffect selects poison in grass and paralysis in the default environment; long grass sleep and other terrain effects are excluded",
    procGuard: "Cmd_seteffectwithchance still gates the environment-selected byte on Secret Power's secondaryEffectChance and no MOVE_RESULT_NO_EFFECT",
  }],
  ["BattleScript_EffectPoisonFang", {
    routeKind: "damaging-secondary-toxic-reflects-as-poison",
    selectorKind: "secondary",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_TOXIC"] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_TOXIC"],
    selectorGuard: "setmoveeffect MOVE_EFFECT_TOXIC loads Poison Fang's secondary effect; Synchronize later strips toxic to ordinary poison when reflecting",
    procGuard: "Cmd_seteffectwithchance uses Poison Fang's secondaryEffectChance (doubled for Serene Grace), then requires Random() % 100 < percentChance and no MOVE_RESULT_NO_EFFECT",
  }],
  ["BattleScript_EffectSemiInvulnerable", {
    routeKind: "bounce-second-turn-secondary-paralysis",
    selectorKind: "bounce-second-turn",
    setter: { mnemonic: "setmoveeffect", operands: ["MOVE_EFFECT_PARALYSIS"] },
    dispatchMnemonic: "seteffectwithchance",
    selectedEffects: ["MOVE_EFFECT_PARALYSIS"],
    selectorGuard: "Bounce takes the second-turn STATUS2_MULTIPLETURNS branch and falls through the MOVE_BOUNCE-specific setter at BattleScript_SecondTurnSemiInvulnerable",
    procGuard: "Cmd_seteffectwithchance uses Bounce's move-table secondaryEffectChance (doubled for Serene Grace), then accuracy/no-effect guards control application",
  }],
]);

function synchronizeMoveRouteRequirement(move: string, position: OnDamageRoutePosition, statement: GraphStatement): string | null {
  if (statement.mnemonic === "jumpifnotmove") {
    return statement.operandTokens[0] === move ? "fallthrough" : "jump";
  }
  if (statement.mnemonic === "jumpifmove") {
    return statement.operandTokens[0] === move ? "jump" : "fallthrough";
  }
  if (move === "MOVE_BOUNCE"
    && position.label === "BattleScript_EffectSemiInvulnerable"
    && position.line === 1974
    && statement.mnemonic === "jumpifstatus2") {
    return "jump";
  }
  if (move === "MOVE_BOUNCE"
    && position.label === "BattleScript_EffectSemiInvulnerable"
    && position.line === 1975
    && statement.mnemonic === "jumpifword") {
    return "jump";
  }
  if (statement.mnemonic === "accuracycheck" || statement.mnemonic === "jumpifmovehadnoeffect") {
    return "fallthrough";
  }
  if (statement.mnemonic === "jumpifhasnohp"
    || statement.mnemonic === "jumpifstatus"
    || statement.mnemonic === "jumpifhalfword"
    || statement.mnemonic === "jumpifbyte"
    || statement.mnemonic.startsWith("jumpif")) {
    // A source-proven positive status route takes the ordinary successor of
    // immunity, substitute, existing-status, terrain, and loop-failure
    // guards. The only selected jump is Bounce's second-turn entry above.
    return "fallthrough";
  }
  return null;
}

function synchronizeRouteConstraint(move: string): OnDamageRouteConstraint {
  return (position, statement, edge) => {
    const requiredKind = synchronizeMoveRouteRequirement(move, position, statement);
    return requiredKind === null || edge.kind === requiredKind;
  };
}

function synchronizeRoutePath(
  move: string,
  startLabel: string | OnDamageRoutePosition,
  target: (statement: GraphStatement) => boolean,
  description: string,
): OnDamageRoutePath {
  return onDamageRoutePath(startLabel, target, description, synchronizeRouteConstraint(move));
}

function synchronizeJoinRoutePaths(paths: readonly OnDamageRoutePath[]): OnDamageRoutePath {
  if (paths.length === 0) throw new Error("Synchronize route must have at least one path");
  const positions: OnDamageRoutePosition[] = [];
  const transitions: OnDamageRouteTransition[] = [];
  for (const path of paths) {
    const first = path.positions[0];
    if (!first) throw new Error("Synchronize route path is empty");
    const previous = positions.at(-1);
    if (previous) {
      const bridge = graph.controlFlow.edges.find((edge) => (
        edge.from.label === previous.label
        && edge.from.line === previous.line
        && edge.to?.label === first.label
        && edge.to.line === first.line
      ));
      if (!bridge) throw new Error(`Synchronize route lacks bridge ${previous.label}:${previous.line} -> ${first.label}:${first.line}`);
      transitions.push({ from: previous, to: first, kind: bridge.kind, macro: bridge.provenance.macro ?? null });
    }
    positions.push(...path.positions);
    transitions.push(...path.transitions);
  }
  return { positions, transitions };
}

function synchronizeRouteWitnessPath(path: OnDamageRoutePath) {
  return onDamageRouteWitnessPath(path);
}

function synchronizeNextStatement(position: OnDamageRoutePosition): OnDamageRoutePosition | null {
  const sameLabel = onDamageNextStatement(position);
  if (sameLabel) return sameLabel;
  const nextLabel = requireGraphLabel(position.label).nextLabel;
  return nextLabel === null ? null : onDamageFirstStatement(nextLabel);
}

const synchronizeSetMoveEffectLine = sourceLine(
  battleScriptCommandsSource,
  "void SetMoveEffect(bool8 primary, u8 certain)",
  "SetMoveEffect",
);
const synchronizeMarkerSelectorLine = sourceLine(
  battleScriptCommandsSource,
  "if (gBattleCommunication[MOVE_EFFECT_BYTE] == MOVE_EFFECT_POISON",
  "SetMoveEffect Synchronize marker selector",
);
const synchronizeChanceLine = sourceLine(
  battleScriptCommandsSource,
  "static void Cmd_seteffectwithchance(void)\n{",
  "Cmd_seteffectwithchance",
);
const synchronizePrimaryLine = sourceLine(
  battleScriptCommandsSource,
  "static void Cmd_seteffectprimary(void)\n{",
  "Cmd_seteffectprimary",
);
const synchronizeTargetMoveEndLine = sourceLine(
  battleScriptCommandsSource,
  "case MOVEEND_SYNCHRONIZE_TARGET:",
  "MOVEEND_SYNCHRONIZE_TARGET",
);
const synchronizeAttackerMoveEndLine = sourceLine(
  battleScriptCommandsSource,
  "case MOVEEND_SYNCHRONIZE_ATTACKER:",
  "MOVEEND_SYNCHRONIZE_ATTACKER",
);
const synchronizeTargetDispatcherLine = sourceLine(
  battleScriptCommandsSource,
  SYNCHRONIZE_DISPATCHER_TARGET_CALL,
  "ABILITYEFFECT_SYNCHRONIZE dispatcher call",
);
const synchronizeAttackerDispatcherLine = sourceLine(
  battleScriptCommandsSource,
  SYNCHRONIZE_DISPATCHER_ATTACKER_CALL,
  "ABILITYEFFECT_ATK_SYNCHRONIZE dispatcher call",
);
const synchronizeSetMoveEffectSource = battleScriptCommandsSource.slice(
  battleScriptCommandsSource.indexOf("void SetMoveEffect(bool8 primary, u8 certain)"),
  battleScriptCommandsSource.indexOf("static void Cmd_seteffectwithchance(void)\n{"),
);
if (!synchronizeSetMoveEffectSource.includes("gEffectBattler = gBattlerTarget;")) {
  throw new Error("SetMoveEffect no longer defaults Synchronize's initial effect battler to gBattlerTarget");
}
if (!synchronizeSetMoveEffectSource.includes("gEffectBattler = gBattlerAttacker;")) {
  throw new Error("SetMoveEffect no longer handles the AFFECTS_USER orientation for Synchronize");
}
if (!synchronizeSetMoveEffectSource.includes("gBattleCommunication[MOVE_EFFECT_BYTE] == MOVE_EFFECT_TOXIC")) {
  throw new Error("SetMoveEffect source no longer contains the toxic status branch needed by Synchronize");
}
for (const effect of SYNCHRONIZE_EFFECTS) {
  if (!battleScriptCommandsSource.includes(`gBattleCommunication[MOVE_EFFECT_BYTE] == ${effect.byte}`)) {
    throw new Error(`SetMoveEffect source no longer names ${effect.byte} in the Synchronize marker selector`);
  }
}
const synchronizeTargetMoveEndSourceStart = battleScriptCommandsSource.indexOf("case MOVEEND_SYNCHRONIZE_TARGET:");
const synchronizeTargetMoveEndSourceEnd = battleScriptCommandsSource.indexOf("case MOVEEND_CHOICE_MOVE:", synchronizeTargetMoveEndSourceStart);
const synchronizeMoveEndSource = battleScriptCommandsSource.slice(synchronizeTargetMoveEndSourceStart, synchronizeTargetMoveEndSourceEnd);
if (!synchronizeMoveEndSource.includes(SYNCHRONIZE_DISPATCHER_TARGET_CALL)
  || !synchronizeMoveEndSource.includes(SYNCHRONIZE_DISPATCHER_ATTACKER_CALL)) {
  throw new Error("Cmd_moveend source no longer contains both ordered Synchronize dispatcher calls");
}
const synchronizeRuntimeGuardSignature = {
  selector: {
    path: BATTLE_SCRIPT_COMMANDS_PATH,
    locator: "SetMoveEffect for-synchronize marker selector",
    line: synchronizeMarkerSelectorLine,
    effects: SYNCHRONIZE_EFFECTS,
    marker: "HITMARKER_SYNCHRONIZE_EFFECT",
    markerLine: sourceLine(battleScriptCommandsSource, "gHitMarker |= HITMARKER_SYNCHRONIZE_EFFECT;", "HITMARKER_SYNCHRONIZE_EFFECT"),
  },
  setMoveEffect: {
    path: BATTLE_SCRIPT_COMMANDS_PATH,
    locator: "SetMoveEffect(bool8 primary, u8 certain)",
    line: synchronizeSetMoveEffectLine,
    orderedGuards: [
      "AFFECTS_USER selects gBattlerAttacker as gEffectBattler and strips MOVE_EFFECT_AFFECTS_USER; otherwise gBattlerTarget is the effect battler",
      "Shield Dust blocks non-primary status effects through MOVE_EFFECT_CERTAIN/primary guards",
      "Safeguard blocks non-primary status effects through MOVE_EFFECT_CERTAIN/primary guards",
      "fainted effect battlers and substitutes block ordinary target status application",
      "the primary-status switch applies type, ability, existing-status, and status immunity guards before statusChanged",
    ],
    toxicReflection: "ABILITYEFFECT_SYNCHRONIZE and ABILITYEFFECT_ATK_SYNCHRONIZE both strip MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN and convert MOVE_EFFECT_TOXIC to MOVE_EFFECT_POISON before reflection",
  },
  chance: {
    path: BATTLE_SCRIPT_COMMANDS_PATH,
    locator: "Cmd_seteffectwithchance",
    line: synchronizeChanceLine,
    guards: [
      "Certain effects require !(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
      "secondary effects require Random() % 100 < percentChance and a nonzero MOVE_EFFECT_BYTE",
      "Serene Grace doubles the move-table secondaryEffectChance",
      "miss/no-effect and no-effect status paths leave the effect unbanked",
    ],
  },
  primary: {
    path: BATTLE_SCRIPT_COMMANDS_PATH,
    locator: "Cmd_seteffectprimary",
    line: synchronizePrimaryLine,
    call: "SetMoveEffect(TRUE, 0)",
    chance: "primary status entries have no secondary chance roll; their source accuracy/status guards still apply",
  },
  moveEnd: {
    path: BATTLE_SCRIPT_COMMANDS_PATH,
    target: {
      state: "MOVEEND_SYNCHRONIZE_TARGET",
      stateValue: 2,
      line: synchronizeTargetMoveEndLine,
      call: SYNCHRONIZE_DISPATCHER_TARGET_CALL,
      dispatcherLine: synchronizeTargetDispatcherLine,
      orientation: "target helper reflects to gBattlerTarget by adding MOVE_EFFECT_AFFECTS_USER",
    },
    attacker: {
      state: "MOVEEND_SYNCHRONIZE_ATTACKER",
      stateValue: 5,
      line: synchronizeAttackerMoveEndLine,
      call: SYNCHRONIZE_DISPATCHER_ATTACKER_CALL,
      dispatcherLine: synchronizeAttackerDispatcherLine,
      orientation: "attacker helper reflects to gBattlerAttacker without AFFECTS_USER",
    },
    order: "Cmd_moveend runs target state 2 first, then ON_DAMAGE state 3, immunity state 4, and attacker state 5; an activating helper can pause and resume this ordered state machine",
  },
  outcomeBoundaries: [
    "SetMoveEffect banks only poison, toxic, paralysis, and burn; sleep, freeze, and non-status effect bytes are excluded",
    "source miss/no-effect, substitute, type, ability, Safeguard, Shield Dust, faint, existing-status, and status immunity guards can prevent banking or reflection",
    "both Synchronize helpers clear the marker before applying the reflected effect; if the other helper is reached while the source marker is rearmed by a nested status route, it can activate in its own ordered state",
  ],
};

function synchronizeFamilyEvidence(move: Move, entryScript: string, selector: SynchronizeSelector) {
  const setterPath = synchronizeRoutePath(
    move.move,
    entryScript,
    (statement) => statement.mnemonic === selector.setter.mnemonic
      && JSON.stringify(statement.operandTokens) === JSON.stringify(selector.setter.operands),
    `${move.move} SetMoveEffect selector setter`,
  );
  const setterPosition = setterPath.positions.at(-1)!;
  const afterSetter = synchronizeNextStatement(setterPosition);
  if (!afterSetter) throw new Error(`${move.move} Synchronize setter has no continuation`);
  const dispatchPath = synchronizeRoutePath(
    move.move,
    afterSetter,
    (statement) => statement.mnemonic === selector.dispatchMnemonic,
    `${move.move} ${selector.dispatchMnemonic} handoff`,
  );
  const dispatchPosition = dispatchPath.positions.at(-1)!;
  const afterDispatch = synchronizeNextStatement(dispatchPosition);
  if (!afterDispatch) throw new Error(`${move.move} Synchronize dispatch has no MOVEEND continuation`);
  const moveEndPath = synchronizeRoutePath(
    move.move,
    afterDispatch,
    (statement) => move.move === "MOVE_TWINEEDLE"
      ? statement.mnemonic === "moveendcase" && statement.operandTokens[0] === "MOVEEND_SYNCHRONIZE_TARGET"
      : statement.mnemonic === "moveendall",
    `${move.move} ordered MOVEEND Synchronize target/attacker handoff`,
  );
  const moveEndPosition = moveEndPath.positions.at(-1)!;
  const moveEndTailPath = move.move === "MOVE_TWINEEDLE"
    ? synchronizeRoutePath(
      move.move,
      synchronizeNextStatement(moveEndPosition)!,
      (statement) => statement.mnemonic === "moveendfrom" && statement.operandTokens[0] === "MOVEEND_IMMUNITY_ABILITIES",
      `${move.move} MOVEEND immunity-to-attacker continuation`,
    )
    : null;
  if (move.move === "MOVE_TWINEEDLE" && moveEndTailPath === null) {
    throw new Error("Twineedle Synchronize route must prove MOVEEND_IMMUNITY_ABILITIES continuation");
  }
  const joinedPath = synchronizeJoinRoutePaths([
    setterPath,
    dispatchPath,
    moveEndPath,
    ...(moveEndTailPath === null ? [] : [moveEndTailPath]),
  ]);
  const selectorLine = requireGraphLabel(entryScript).line;
  const setterStatement = onDamageStatement(setterPosition);
  const dispatchStatement = onDamageStatement(dispatchPosition);
  const moveEndStatement = onDamageStatement(moveEndPosition);
  const joinedWitness = synchronizeRouteWitnessPath(joinedPath);
  const familyEvidence = {
    category: SYNCHRONIZE_CATEGORY,
    selector: {
      path: BATTLE_SCRIPT_SOURCE_PATH,
      locator: `${entryScript} -> ${selector.setter.mnemonic}`,
      entryScript,
      entryLine: selectorLine,
      selectorKind: selector.selectorKind,
      setter: { label: setterPosition.label, line: setterPosition.line, mnemonic: setterStatement.mnemonic, operands: setterStatement.operandTokens },
      selectedEffects: selector.selectedEffects,
      guard: selector.selectorGuard,
      procGuard: selector.procGuard,
    },
    entryPath: {
      kind: selector.routeKind,
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: selectorLine },
      declaredEntryScript: entryScript,
      graph: joinedWitness.graph,
      program: joinedWitness.program,
      setter: { label: setterPosition.label, line: setterPosition.line, mnemonic: setterStatement.mnemonic, operands: setterStatement.operandTokens },
      dispatch: { label: dispatchPosition.label, line: dispatchPosition.line, mnemonic: dispatchStatement.mnemonic, operands: dispatchStatement.operandTokens },
      moveEnd: { label: moveEndPosition.label, line: moveEndPosition.line, mnemonic: moveEndStatement.mnemonic, operands: moveEndStatement.operandTokens },
      moveEndTail: moveEndTailPath === null ? null : synchronizeRouteWitnessPath(moveEndTailPath),
    },
    dispatcher: {
      path: BATTLE_SCRIPT_COMMANDS_PATH,
      locator: "Cmd_moveend MOVEEND_SYNCHRONIZE_TARGET / MOVEEND_SYNCHRONIZE_ATTACKER",
      target: { state: "MOVEEND_SYNCHRONIZE_TARGET", stateValue: 2, line: synchronizeTargetMoveEndLine, call: SYNCHRONIZE_DISPATCHER_TARGET_CALL },
      attacker: { state: "MOVEEND_SYNCHRONIZE_ATTACKER", stateValue: 5, line: synchronizeAttackerMoveEndLine, call: SYNCHRONIZE_DISPATCHER_ATTACKER_CALL },
      order: synchronizeRuntimeGuardSignature.moveEnd.order,
    },
    familyVerification: {
      scope: "All source-derived Level-50 Synchronize candidates reuse this exact selector/route/runtime-guard family certificate; no per-move oracle receipts are fabricated.",
      implementation: "src/engine/battleScriptMoveEndOpcode.ts#MOVEEND_SYNCHRONIZE_TARGET-and-ATTACKER",
      batchTest: "tests/battleScriptMoveEndOpcode.test.ts#Synchronize marker and ordered MOVEEND states",
      oracleReceipt: "docs/synchronize-abilities-ground-truth.md#3-two-seed-battle-scene-off-receipts",
      oracleFixture: "tools/battle-lab/mechanic-synchronize-thunder-wave-off.json",
      oracleProbe: "tools/probe/probe-synchronize-off.py",
      oracleReceiptFiles: [
        "tools/probe/receipts/synchronize-off-seed-610839776.json",
        "tools/probe/receipts/synchronize-off-seed-324508639.json",
      ],
      scopeBoundary: "The two seeded receipts prove the shared Thunder Wave target reflection and controller/ability ordering. Move-specific candidate rows are promoted by the exact source/program route and guard certificate, while sleep/freeze/non-status rows and unrelated ability gaps remain excluded.",
    },
    runtimeGuardSignature: synchronizeRuntimeGuardSignature,
    routeKind: selector.routeKind,
  };
  return {
    status: "source-proven" as const,
    id: `synchronize-route:${move.move}`,
    move: move.move,
    entryScript,
    routeKind: selector.routeKind,
    selectedEffects: selector.selectedEffects,
    source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: selectorLine },
    entryPath: joinedWitness,
    runtimeGuardSignature: synchronizeRuntimeGuardSignature,
    familyEvidence,
  };
}

const synchronizeCandidateRows = rosterMoveSymbols.flatMap((symbol) => {
  const move = moveBySymbol.get(symbol)!;
  const script = topologyByMove.get(symbol);
  if (!script) throw new Error(`${symbol} has no indexed Battle Script topology row for the Synchronize audit`);
  const selector = SYNCHRONIZE_ENTRY_SELECTORS.get(script.entryScript);
  if (!selector) return [];
  if (selector.selectorKind === "bounce-second-turn" && symbol !== "MOVE_BOUNCE") return [];
  return [{
    move: symbol,
    moveId: move.id,
    effect: move.effect,
    power: move.power,
    secondaryEffectChance: move.secondaryEffectChance,
    entryScript: script.entryScript,
    routeKind: selector.routeKind,
    selectorKind: selector.selectorKind,
    selectedEffects: selector.selectedEffects,
    blockerIds: [],
    exceptionId: null,
  }];
});
if (synchronizeCandidateRows.length !== 30) {
  throw new Error(`expected 30 finite Level-50 Synchronize candidates, got ${synchronizeCandidateRows.length}`);
}
const synchronizeEvidenceByMove = new Map<string, ReturnType<typeof synchronizeFamilyEvidence>>();
for (const candidate of synchronizeCandidateRows) {
  const move = moveBySymbol.get(candidate.move)!;
  const selector = SYNCHRONIZE_ENTRY_SELECTORS.get(candidate.entryScript)!;
  const evidence = synchronizeFamilyEvidence(move, candidate.entryScript, selector);
  synchronizeEvidenceByMove.set(candidate.move, evidence);
}
const synchronizeRouteEvidenceRows = [...synchronizeEvidenceByMove.values()];
const synchronizeSourceProvenRows = synchronizeRouteEvidenceRows
  .filter((evidence) => evidence.status === "source-proven")
  .map((evidence) => evidence.move);
const synchronizeExceptions: Array<Record<string, unknown>> = [];
const synchronizeBlockers: Array<Record<string, unknown>> = [];
if (synchronizeSourceProvenRows.length !== synchronizeCandidateRows.length
  || synchronizeExceptions.length !== 0
  || synchronizeBlockers.length !== 0) {
  throw new Error("Synchronize candidate accounting is not fully source-proven");
}

// Attract is deliberately a separate, finite ability family.  It is not an
// ON_DAMAGE or MOVEEND route: its source script reaches Cmd_tryinfatuating
// after the normal action admission, string, PP, and accuracy commands, and
// the opcode itself owns both the Oblivious branch and the target status2
// write.  Keeping the whole small script/tail shape explicit prevents a
// future broad "status move" inference from smuggling in unrelated routes.
const TRYINFATUATING_OBLIVIOUS_ORDERED_GUARDS = [
  "gBattleMons[gBattlerTarget].ability == ABILITY_OBLIVIOUS first",
  "same attacker/target gender",
  "gBattleMons[gBattlerTarget].status2 & STATUS2_INFATUATION",
  "attacker gender == MON_GENDERLESS",
  "target gender == MON_GENDERLESS",
] as const;
const tryinfatuatingSourceStart = battleScriptCommandsSource.indexOf("static void Cmd_tryinfatuating(void)\n{");
const tryinfatuatingSourceEnd = battleScriptCommandsSource.indexOf("static void Cmd_updatestatusicon(void)", tryinfatuatingSourceStart);
if (tryinfatuatingSourceStart < 0 || tryinfatuatingSourceEnd < 0) {
  throw new Error("unable to isolate Cmd_tryinfatuating source");
}
const tryinfatuatingSource = battleScriptCommandsSource.slice(tryinfatuatingSourceStart, tryinfatuatingSourceEnd);
const tryinfatuatingSourceTokens = [
  "if (gBattleMons[gBattlerTarget].ability == ABILITY_OBLIVIOUS)",
  "gBattlescriptCurrInstr = BattleScript_ObliviousPreventsAttraction;",
  "gLastUsedAbility = ABILITY_OBLIVIOUS;",
  "RecordAbilityBattle(gBattlerTarget, ABILITY_OBLIVIOUS);",
  "GetGenderFromSpeciesAndPersonality(speciesAttacker, personalityAttacker) == GetGenderFromSpeciesAndPersonality(speciesTarget, personalityTarget)",
  "gBattleMons[gBattlerTarget].status2 & STATUS2_INFATUATION",
  "GetGenderFromSpeciesAndPersonality(speciesAttacker, personalityAttacker) == MON_GENDERLESS",
  "GetGenderFromSpeciesAndPersonality(speciesTarget, personalityTarget) == MON_GENDERLESS",
  "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);",
  "gBattleMons[gBattlerTarget].status2 |= STATUS2_INFATUATED_WITH(gBattlerAttacker);",
  "gBattlescriptCurrInstr += 5;",
];
let tryinfatuatingGuardCursor = 0;
for (const token of tryinfatuatingSourceTokens) {
  const next = tryinfatuatingSource.indexOf(token, tryinfatuatingGuardCursor);
  if (next < 0) throw new Error(`Cmd_tryinfatuating source lost ordered token ${token}`);
  tryinfatuatingGuardCursor = next + token.length;
}
if (!abilityConstantsSource.includes("#define ABILITY_OBLIVIOUS 12")
  || !battleScriptConstantsSource.includes("B_SCR_OP_TRYINFATUATING")) {
  throw new Error("Attract/Oblivious source constants drifted");
}
const tryinfatuatingLine = battleScriptCommandsSource.slice(0, tryinfatuatingSourceStart).split("\n").length;
const attractEntryAudit = auditExactScriptBlock("BattleScript_EffectAttract", [
  ["attackcanceler", []],
  ["attackstring", []],
  ["ppreduce", []],
  ["accuracycheck", ["BattleScript_ButItFailed", "ACC_CURR_MOVE"]],
  ["tryinfatuating", ["BattleScript_ButItFailed"]],
  ["attackanimation", []],
  ["waitanimation", []],
  ["printstring", ["STRINGID_PKMNFELLINLOVE"]],
  ["waitmessage", ["B_WAIT_TIME_LONG"]],
  ["goto", ["BattleScript_MoveEnd"]],
]);
const attractButItFailedAudit = auditExactScriptBlock("BattleScript_ButItFailed", [
  ["pause", ["B_WAIT_TIME_SHORT"]],
  ["orbyte", ["gMoveResultFlags", "MOVE_RESULT_FAILED"]],
  ["resultmessage", []],
  ["waitmessage", ["B_WAIT_TIME_LONG"]],
  ["goto", ["BattleScript_MoveEnd"]],
]);
const attractObliviousTailAudit = auditExactScriptBlock("BattleScript_ObliviousPreventsAttraction", [
  ["pause", ["B_WAIT_TIME_SHORT"]],
  ["printstring", ["STRINGID_PKMNPREVENTSROMANCEWITH"]],
  ["waitmessage", ["B_WAIT_TIME_LONG"]],
  ["goto", ["BattleScript_MoveEnd"]],
]);
const attractMoveEndAudit = auditExactScriptBlock("BattleScript_MoveEnd", [
  ["moveendall", []],
  ["end", []],
]);

function assertAttractFallthrough(block: ReturnType<typeof auditExactScriptBlock>): void {
  for (let index = 0; index + 1 < block.graph.statements.length; index += 1) {
    const from = block.graph.statements[index]!;
    const to = block.graph.statements[index + 1]!;
    requireFallthrough({ label: block.label, line: from.line }, { label: block.label, line: to.line });
  }
}

assertAttractFallthrough(attractEntryAudit);
assertAttractFallthrough(attractButItFailedAudit);
assertAttractFallthrough(attractObliviousTailAudit);
assertAttractFallthrough(attractMoveEndAudit);
const attractMoveEndFirst = firstRoutePosition("BattleScript_MoveEnd");
for (const block of [attractEntryAudit, attractButItFailedAudit, attractObliviousTailAudit]) {
  const tail = block.graph.statements.at(-1)!;
  requireGraphEdge(block.label, tail.line, "BattleScript_MoveEnd", attractMoveEndFirst.line, "jump", "goto");
}
const attractRouteMnemonics = [
  ...attractEntryAudit.graph.statements,
  ...attractButItFailedAudit.graph.statements,
  ...attractObliviousTailAudit.graph.statements,
  ...attractMoveEndAudit.graph.statements,
].map((statement) => statement.mnemonic);
for (const forbiddenMnemonic of ["datahpupdate", "seteffectwithchance", "moveendfrom", "moveendto"]) {
  if (attractRouteMnemonics.includes(forbiddenMnemonic)) {
    throw new Error(`Attract/Oblivious zero-damage route unexpectedly includes ${forbiddenMnemonic}`);
  }
}

const tryinfatuatingRuntimeGuardSignature = {
  source: {
    path: BATTLE_SCRIPT_COMMANDS_PATH,
    locator: "Cmd_tryinfatuating",
    line: tryinfatuatingLine,
  },
  ability: {
    path: ABILITY_CONSTANTS_PATH,
    symbol: "ABILITY_OBLIVIOUS",
    value: 12,
  },
  orderedGuards: TRYINFATUATING_OBLIVIOUS_ORDERED_GUARDS,
  oblivious: {
    guard: "gBattleMons[gBattlerTarget].ability == ABILITY_OBLIVIOUS",
    destination: "BattleScript_ObliviousPreventsAttraction",
    destinationKind: "hardcoded-not-operand-pointer",
    lastUsedAbility: 12,
    recordAbilityBattle: "RecordAbilityBattle(gBattlerTarget, ABILITY_OBLIVIOUS)",
  },
  ordinaryFailure: {
    guards: TRYINFATUATING_OBLIVIOUS_ORDERED_GUARDS.slice(1),
    destination: "T1_READ_PTR(gBattlescriptCurrInstr + 1)",
    operandDestination: "BattleScript_ButItFailed",
  },
  success: {
    write: "gBattleMons[gBattlerTarget].status2 |= STATUS2_INFATUATED_WITH(gBattlerAttacker)",
    advanceBytes: 5,
  },
  scopeBoundary: "Attract is zero-damage: no datahpupdate, MOVEEND state 12, King's Rock, Shell Bell, charge, or faint route is part of this family.",
};
const tryinfatuatingEntryPath = {
  kind: "attackcanceler-attackstring-ppreduce-accuracycheck-tryinfatuating",
  source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: attractEntryAudit.source.entryLine },
  declaredEntryScript: "BattleScript_EffectAttract",
  graph: {
    path: BATTLE_SCRIPT_GRAPH_PATH,
    entryLabel: "BattleScript_EffectAttract",
    attackCanceler: { label: "BattleScript_EffectAttract", line: attractEntryAudit.graph.statements[0]!.line, mnemonic: "attackcanceler" },
    accuracyCheck: { label: "BattleScript_EffectAttract", line: attractEntryAudit.graph.statements[3]!.line, mnemonic: "accuracycheck", operands: ["BattleScript_ButItFailed", "ACC_CURR_MOVE"] },
    tryInfatuating: { label: "BattleScript_EffectAttract", line: attractEntryAudit.graph.statements[4]!.line, mnemonic: "tryinfatuating", operands: ["BattleScript_ButItFailed"] },
    route: attractEntryAudit.graph.statements,
    entry: attractEntryAudit.graph,
    ordinaryFailureTail: attractButItFailedAudit.graph,
    obliviousTail: attractObliviousTailAudit.graph,
    moveEnd: attractMoveEndAudit.graph,
  },
  program: {
    path: BATTLE_SCRIPT_PROGRAM_PATH,
    entryLabel: "BattleScript_EffectAttract",
    attackCanceler: { label: "BattleScript_EffectAttract", line: attractEntryAudit.program.statements[0]!.line, mnemonic: "attackcanceler" },
    accuracyCheck: { label: "BattleScript_EffectAttract", line: attractEntryAudit.program.statements[3]!.line, mnemonic: "accuracycheck", operands: ["BattleScript_ButItFailed", "ACC_CURR_MOVE"] },
    tryInfatuating: { label: "BattleScript_EffectAttract", line: attractEntryAudit.program.statements[4]!.line, mnemonic: "tryinfatuating", operands: ["BattleScript_ButItFailed"] },
    route: attractEntryAudit.program.statements,
    entry: attractEntryAudit.program,
    ordinaryFailureTail: attractButItFailedAudit.program,
    obliviousTail: attractObliviousTailAudit.program,
    moveEnd: attractMoveEndAudit.program,
  },
  tails: {
    success: "BattleScript_MoveEnd",
    ordinaryFailure: "BattleScript_ButItFailed -> BattleScript_MoveEnd",
    oblivious: "BattleScript_ObliviousPreventsAttraction -> BattleScript_MoveEnd",
  },
};

function tryinfatuatingObliviousFamilyEvidence(move: Move, entryScript: string) {
  if (move.move !== "MOVE_ATTRACT" || move.effect !== "EFFECT_ATTRACT" || entryScript !== "BattleScript_EffectAttract") {
    throw new Error(`${move.move} is not the exact Attract/Oblivious selector`);
  }
  return {
    status: "source-proven" as const,
    id: "tryinfatuating-oblivious-route:MOVE_ATTRACT",
    move: move.move,
    entryScript,
    executionInventory: executableMoveSymbols.has(move.move) ? "level50-executable" : "level50-roster-only",
    familyEvidence: {
      category: TRYINFATUATING_OBLIVIOUS_CATEGORY,
      selector: {
        path: MOVES_PATH,
        locator: "moves:MOVE_ATTRACT.effect",
        symbol: "MOVE_ATTRACT",
        effect: "EFFECT_ATTRACT",
        guard: "moveTable.effect === EFFECT_ATTRACT",
        derivedFrom: "tryinfatuating-oblivious finite selector moveTable.effect === EFFECT_ATTRACT",
      },
      entryPath: tryinfatuatingEntryPath,
      dispatcher: {
        path: BATTLE_SCRIPT_COMMANDS_PATH,
        locator: "Cmd_tryinfatuating",
        line: tryinfatuatingLine,
        opcode: "B_SCR_OP_TRYINFATUATING",
        order: "after BattleScript_EffectAttract attackcanceler, attackstring, ppreduce, and accuracycheck; its success/failure/Oblivious branches all finish at explicit BattleScript_MoveEnd tails",
      },
      runtimeGuardSignature: tryinfatuatingRuntimeGuardSignature,
      familyVerification: {
        scope: "The one finite Level-50 EFFECT_ATTRACT candidate is promoted by the exact script/tail route, Cmd_tryinfatuating's ordered guard certificate, the existing opcode runtime suite, a family hook-join batch, and a paired complete-parties Battle Scene OFF receipt.",
        implementation: "src/engine/battleScriptTryinfatuatingOpcode.ts#createBattleScriptTryinfatuatingOpcodeHandlers",
        runtimeTest: "tests/battleScriptTryinfatuatingOpcode.test.ts",
        batchTest: "tests/tryinfatuatingObliviousHookJoinBatch.test.ts",
        oracleReceipt: "tests/gate6R10AttractObliviousReceipt.test.ts",
        oracleFixture: "tools/battle-lab/gate6-r10-attract-off.json",
        oracleControl: "tools/battle-lab/gate6-r10-attract-control-off.json",
        oracleProbe: "tools/probe/probe-gate6-r10-off.py",
        oracleReceiptFiles: ["tools/probe/receipts/gate6-r10-attract-oblivious-off.json"],
        scopeBoundary: tryinfatuatingRuntimeGuardSignature.scopeBoundary,
      },
    },
  };
}

const tryinfatuatingObliviousCandidateRows = rosterMoveSymbols
  .map((symbol) => moveBySymbol.get(symbol)!)
  .filter((move) => move.effect === "EFFECT_ATTRACT")
  .map((move) => ({
    move: move.move,
    moveId: move.id,
    effect: move.effect,
    entryScript: topologyByMove.get(move.move)!.entryScript,
    executionInventory: executableMoveSymbols.has(move.move) ? "level50-executable" : "level50-roster-only",
    blockerIds: [],
    exceptionId: null,
  }));
if (tryinfatuatingObliviousCandidateRows.length !== 1
  || tryinfatuatingObliviousCandidateRows[0]?.move !== "MOVE_ATTRACT"
  || tryinfatuatingObliviousCandidateRows[0]?.entryScript !== "BattleScript_EffectAttract"
  || tryinfatuatingObliviousCandidateRows[0]?.executionInventory !== "level50-executable") {
  throw new Error("tryinfatuating/Oblivious selector is not the audited one-row executable Attract family");
}
const tryinfatuatingObliviousEvidence = tryinfatuatingObliviousFamilyEvidence(
  moveBySymbol.get("MOVE_ATTRACT")!,
  tryinfatuatingObliviousCandidateRows[0]!.entryScript,
);
const tryinfatuatingObliviousSourceProvenRows = [tryinfatuatingObliviousEvidence.move];
const tryinfatuatingObliviousExceptions: Array<Record<string, unknown>> = [];
const tryinfatuatingObliviousBlockers: Array<Record<string, unknown>> = [];
if (tryinfatuatingObliviousSourceProvenRows.length !== tryinfatuatingObliviousCandidateRows.length
  || tryinfatuatingObliviousExceptions.length !== 0
  || tryinfatuatingObliviousBlockers.length !== 0) {
  throw new Error("tryinfatuating/Oblivious candidate accounting is not fully source-proven");
}

const tryexplosionSourceStart = battleScriptCommandsSource.indexOf("static void Cmd_tryexplosion(void)\n{");
const tryexplosionSourceEnd = battleScriptCommandsSource.indexOf("static void Cmd_setatkhptozero(void)", tryexplosionSourceStart);
if (tryexplosionSourceStart < 0 || tryexplosionSourceEnd < 0) throw new Error("unable to isolate Cmd_tryexplosion");
const tryexplosionSource = battleScriptCommandsSource.slice(tryexplosionSourceStart, tryexplosionSourceEnd);
const tryexplosionSourceTokens = [
  "if (gBattleControllerExecFlags)",
  "for (gBattlerTarget = 0; gBattlerTarget < gBattlersCount; gBattlerTarget++)",
  "if (gBattleMons[gBattlerTarget].ability == ABILITY_DAMP)",
  "if (gBattlerTarget == gBattlersCount)",
  "gBattleMoveDamage = gBattleMons[gActiveBattler].hp;",
  "gBattlescriptCurrInstr++;",
  "for (gBattlerTarget = 0; gBattlerTarget < gBattlersCount; gBattlerTarget++)",
  "if (gBattlerTarget == gBattlerAttacker)",
  "if (!(gAbsentBattlerFlags & gBitTable[gBattlerTarget]))",
  "gLastUsedAbility = ABILITY_DAMP;",
  "RecordAbilityBattle(gBattlerTarget, gBattleMons[gBattlerTarget].ability);",
  "gBattlescriptCurrInstr = BattleScript_DampStopsExplosion;",
];
let tryexplosionCursor = 0;
for (const token of tryexplosionSourceTokens) {
  const next = tryexplosionSource.indexOf(token, tryexplosionCursor);
  if (next < 0) throw new Error(`Cmd_tryexplosion source lost ordered token ${token}`);
  tryexplosionCursor = next + token.length;
}
if (!abilityConstantsSource.includes("#define ABILITY_DAMP 6")
  || !battleScriptConstantsSource.includes("B_SCR_OP_TRYEXPLOSION")) {
  throw new Error("Explosion/Damp source constants drifted");
}
const tryexplosionLine = battleScriptCommandsSource.slice(0, tryexplosionSourceStart).split("\n").length;
const explosionEntryAudit = auditExactScriptBlock("BattleScript_EffectExplosion", [
  ["attackcanceler", []],
  ["attackstring", []],
  ["ppreduce", []],
  ["tryexplosion", []],
  ["setatkhptozero", []],
  ["waitstate", []],
  ["jumpifbyte", ["CMP_NO_COMMON_BITS", "gMoveResultFlags", "MOVE_RESULT_MISSED", "BattleScript_ExplosionDoAnimStartLoop"]],
  ["call", ["BattleScript_PreserveMissedBitDoMoveAnim"]],
  ["goto", ["BattleScript_ExplosionLoop"]],
]);
const dampTailAudit = auditExactScriptBlock("BattleScript_DampStopsExplosion", [
  ["pause", ["B_WAIT_TIME_SHORT"]],
  ["printstring", ["STRINGID_PKMNPREVENTSUSAGE"]],
  ["pause", ["B_WAIT_TIME_LONG"]],
  ["goto", ["BattleScript_MoveEnd"]],
]);
const explosionMoveEndAudit = auditExactScriptBlock("BattleScript_MoveEnd", [["moveendall", []], ["end", []]]);
for (const block of [dampTailAudit, explosionMoveEndAudit]) {
  for (let index = 0; index + 1 < block.graph.statements.length; index += 1) {
    const from = block.graph.statements[index]!;
    const to = block.graph.statements[index + 1]!;
    requireFallthrough({ label: block.label, line: from.line }, { label: block.label, line: to.line });
  }
}
const dampTailLast = dampTailAudit.graph.statements.at(-1)!;
requireGraphEdge("BattleScript_DampStopsExplosion", dampTailLast.line, "BattleScript_MoveEnd", firstRoutePosition("BattleScript_MoveEnd").line, "jump", "goto");
const dampPreludeGraph = explosionEntryAudit.graph.statements.slice(0, 4);
const dampPreludeProgram = explosionEntryAudit.program.statements.slice(0, 4);
if (JSON.stringify(dampPreludeGraph) !== JSON.stringify(dampPreludeProgram)
  || JSON.stringify(dampPreludeGraph.map((row) => row.mnemonic)) !== JSON.stringify(["attackcanceler", "attackstring", "ppreduce", "tryexplosion"])) {
  throw new Error("Explosion/Damp action prelude graph/program path drifted");
}
for (const forbidden of ["datahpupdate", "moveendfrom", "moveendto", "accuracycheck", "critcalc", "damagecalc", "typecalc", "tryfaintmon"]) {
  if ([...dampPreludeGraph, ...dampTailAudit.graph.statements].some((row) => row.mnemonic === forbidden)) {
    throw new Error(`Explosion/Damp prevention arm unexpectedly includes ${forbidden}`);
  }
}
const tryexplosionRuntimeGuardSignature = {
  source: { path: BATTLE_SCRIPT_COMMANDS_PATH, locator: "Cmd_tryexplosion", line: tryexplosionLine },
  ability: { path: ABILITY_CONSTANTS_PATH, symbol: "ABILITY_DAMP", value: 6 },
  orderedGuards: [
    "gBattleControllerExecFlags == 0",
    "scan gBattlerTarget from 0 through gBattlersCount - 1",
    "first gBattleMons[gBattlerTarget].ability == ABILITY_DAMP wins",
    "no absent-battler or attacker/target role filter on the Damp scan",
  ],
  damp: {
    lastUsedAbility: 6,
    record: "RecordAbilityBattle(gBattlerTarget, gBattleMons[gBattlerTarget].ability)",
    destination: "BattleScript_DampStopsExplosion",
    message: "STRINGID_PKMNPREVENTSUSAGE",
  },
  noDamp: {
    attackerHpBarDamage: "gBattleMoveDamage = gBattleMons[gBattlerAttacker].hp",
    firstTargetScan: "skip attacker and absent battlers only after the Damp scan succeeds with no holder",
    successor: "setatkhptozero then ordinary critcalc/damagecalc/typecalc/accuracy/damage/faint route",
  },
  rng: "Cmd_tryexplosion performs no Random call; the blocked Damp arm performs no accuracy, crit, damage, or other action RNG",
  scopeBoundary: "The Damp arm spends PP but performs no HP update, datahpupdate, MOVEEND_NEXT_TARGET, successful-damage MOVEEND state, Shell Bell, damage, or faint processing.",
};
const tryexplosionDampCandidateRows = rosterMoveSymbols
  .map((symbol) => moveBySymbol.get(symbol)!)
  .filter((move) => move.effect === "EFFECT_EXPLOSION")
  .map((move) => ({
    move: move.move,
    moveId: move.id,
    effect: move.effect,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    entryScript: topologyByMove.get(move.move)!.entryScript,
    executionInventory: executableMoveSymbols.has(move.move) ? "level50-executable" : "level50-roster-only",
    selectableSetOccurrences: executionInventoryByMove.get(move.move)?.frontierMonCount ?? 0,
    fullLevel50CarrierRows: setIdsByMove.get(move.move)!.length,
    blockerIds: [],
    exceptionId: null,
  }));
if (JSON.stringify(tryexplosionDampCandidateRows.map((row) => [row.move, row.moveId, row.power, row.accuracy, row.pp, row.selectableSetOccurrences, row.fullLevel50CarrierRows]))
    !== JSON.stringify([["MOVE_SELF_DESTRUCT", 120, 200, 100, 5, 1, 2], ["MOVE_EXPLOSION", 153, 250, 100, 5, 24, 24]])
  || tryexplosionDampCandidateRows.some((row) => row.entryScript !== "BattleScript_EffectExplosion" || row.executionInventory !== "level50-executable")) {
  throw new Error("Explosion/Damp selector is not the audited two-row executable 25-selectable/26-carrier family");
}
function tryexplosionDampEvidence(move: Move) {
  return {
    status: "source-proven" as const,
    id: `tryexplosion-damp-route:${move.move}`,
    move: move.move,
    entryScript: "BattleScript_EffectExplosion",
    executionInventory: "level50-executable",
    familyEvidence: {
      category: TRYEXPLOSION_DAMP_CATEGORY,
      selector: { path: MOVES_PATH, locator: `moves:${move.move}.effect`, symbol: move.move, effect: move.effect, guard: "moveTable.effect === EFFECT_EXPLOSION" },
      entryPath: {
        kind: "attackcanceler-attackstring-ppreduce-tryexplosion-fixed-damp-tail",
        declaredEntryScript: "BattleScript_EffectExplosion",
        source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: explosionEntryAudit.source.entryLine },
        graph: { path: BATTLE_SCRIPT_GRAPH_PATH, prelude: dampPreludeGraph, entry: explosionEntryAudit.graph, dampTail: dampTailAudit.graph, moveEnd: explosionMoveEndAudit.graph },
        program: { path: BATTLE_SCRIPT_PROGRAM_PATH, prelude: dampPreludeProgram, entry: explosionEntryAudit.program, dampTail: dampTailAudit.program, moveEnd: explosionMoveEndAudit.program },
        tails: { damp: "BattleScript_DampStopsExplosion -> BattleScript_MoveEnd", noDamp: "setatkhptozero -> ordinary Explosion damage/faint path" },
      },
      dispatcher: { path: BATTLE_SCRIPT_COMMANDS_PATH, locator: "Cmd_tryexplosion", line: tryexplosionLine, opcode: "B_SCR_OP_TRYEXPLOSION" },
      runtimeGuardSignature: tryexplosionRuntimeGuardSignature,
      familyVerification: {
        scope: "Both finite EFFECT_EXPLOSION siblings share one complete-parties three-arm Battle Scene OFF receipt and dedicated hook-join batch; no per-move receipt is fabricated.",
        implementation: "src/engine/battleScriptExplosionOpcode.ts#createBattleScriptExplosionOpcodeHandlers",
        runtimeTest: "tests/battleScriptExplosionOpcode.test.ts",
        batchTest: "tests/tryexplosionDampHookJoinBatch.test.ts",
        oracleReceipt: "tests/gate6DampExplosionReceipt.test.ts",
        oracleFixtures: ["tools/battle-lab/gate6-damp-explosion-control-off.json", "tools/battle-lab/gate6-damp-explosion-target-off.json", "tools/battle-lab/gate6-damp-explosion-attacker-off.json"],
        oracleProbe: "tools/probe/probe-gate6-damp-explosion-off.py",
        oracleReceiptFiles: ["tools/probe/receipts/gate6-damp-explosion-off.json"],
        publicMessageProof: "tests/presentationStringIssue72Batch2.test.ts#STRINGID_PKMNPREVENTSUSAGE attacker-held Damp",
        scopeBoundary: tryexplosionRuntimeGuardSignature.scopeBoundary,
      },
    },
  };
}
const tryexplosionDampEvidenceRows = tryexplosionDampCandidateRows.map((row) => tryexplosionDampEvidence(moveBySymbol.get(row.move)!));
const tryexplosionDampSourceProvenRows = tryexplosionDampEvidenceRows.map((row) => row.move);

if (onDamageCandidateRows.some((candidate) => candidate.blockerIds.length !== 0)) {
  throw new Error("ON_DAMAGE candidates must not retain retired family blockers");
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

const kingsRockMoveEndLine = sourceLine(battleScriptCommandsSource, "case MOVEEND_KINGSROCK_SHELLBELL:", "MOVEEND_KINGSROCK_SHELLBELL");
const kingsRockStateLine = sourceLine(battleScriptConstantsSource, "#define MOVEEND_KINGSROCK_SHELLBELL", "MOVEEND_KINGSROCK_SHELLBELL");
const kingsRockItemStart = battleUtilSource.indexOf("case ITEMEFFECT_KINGSROCK_SHELLBELL:");
const kingsRockShellBellStart = battleUtilSource.indexOf("case HOLD_EFFECT_SHELL_BELL:", kingsRockItemStart);
if (kingsRockItemStart < 0 || kingsRockShellBellStart < 0) throw new Error("unable to isolate the King's Rock item arm");
const kingsRockSource = battleUtilSource.slice(kingsRockItemStart, kingsRockShellBellStart);
const KINGS_ROCK_ORDERED_GUARDS = [
  "gBattleMoveDamage != 0",
  "atkHoldEffect == HOLD_EFFECT_FLINCH",
  "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
  "TARGET_TURN_DAMAGED",
  "Random() % 100 (draw occurs before the move-flag and target-HP tests)",
  "roll < atkHoldEffectParam",
  "gBattleMoves[gCurrentMove].flags & FLAG_KINGS_ROCK_AFFECTED",
  "gBattleMons[gBattlerTarget].hp != 0",
  "SetMoveEffect(FALSE, 0) with MOVE_EFFECT_FLINCH",
] as const;
const kingsRockSourceTokens = [
  "if (gBattleMoveDamage)",
  "case HOLD_EFFECT_FLINCH:",
  "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
  "TARGET_TURN_DAMAGED",
  "(Random() % 100) < atkHoldEffectParam",
  "gBattleMoves[gCurrentMove].flags & FLAG_KINGS_ROCK_AFFECTED",
  "gBattleMons[gBattlerTarget].hp",
  "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_FLINCH",
  "SetMoveEffect(FALSE, 0)",
];
let kingsRockGuardCursor = 0;
for (const token of kingsRockSourceTokens) {
  const next = kingsRockSource.indexOf(token, kingsRockGuardCursor);
  if (next < 0) throw new Error(`King's Rock source lost ordered guard ${token}`);
  kingsRockGuardCursor = next + token.length;
}
if (!battleScriptCommandsSource.includes(`case MOVEEND_KINGSROCK_SHELLBELL: // king's rock and shell bell\n            if (${KINGS_ROCK_DISPATCHER_CALL})`)
  || !battleScriptConstantsSource.includes("#define MOVEEND_KINGSROCK_SHELLBELL               12")) {
  throw new Error("King's Rock MOVEEND state 12 dispatcher drifted");
}
const kingsRockItem = holdEffects.items.find((row) => row.item === "ITEM_KINGS_ROCK");
if (!kingsRockItem || kingsRockItem.holdEffect !== "HOLD_EFFECT_FLINCH" || kingsRockItem.holdEffectParam !== 10) {
  throw new Error("ITEM_KINGS_ROCK is no longer HOLD_EFFECT_FLINCH with parameter 10");
}

const KINGS_ROCK_CHARGE_RELEASE_MOVES = new Set([
  "MOVE_RAZOR_WIND", "MOVE_FLY", "MOVE_SOLAR_BEAM", "MOVE_DIG", "MOVE_BIDE", "MOVE_SKY_ATTACK", "MOVE_DIVE", "MOVE_BOUNCE",
]);

function kingsRockRouteEvidence(move: Move, entryScript: string) {
  if (!move.flags.includes("FLAG_KINGS_ROCK_AFFECTED") || move.power === 0) {
    throw new Error(`${move.move} is not a damaging King's Rock candidate`);
  }
  const routeConstraint = onDamageMoveRouteConstraint(move.move);
  const damagingEntryScript = move.move === "MOVE_BIDE"
    ? "BattleScript_BideAttack"
    : entryScript === "BattleScript_EffectReturn" ? "BattleScript_EffectFrustration" : entryScript;
  const damaging = onDamageRouteToDataAndMoveEnd(damagingEntryScript, routeConstraint);
  const moveEnd = {
    ...damaging.moveEnd,
    state: "MOVEEND_KINGSROCK_SHELLBELL",
    stateValue: 12,
    semantics: "the certified MOVEEND handoff reaches state 12 after successful target datahpupdate",
  };
  const alternatives: Array<Record<string, unknown>> = [];
  if (move.move === "MOVE_BIDE") {
    const chargePath = onDamageRoutePath("BattleScript_EffectBide", (statement) => statement.mnemonic === "moveendall", "BIDE charge MoveEnd");
    alternatives.push({
      kind: "bide-charge-no-damage",
      path: onDamageRouteWitnessPath(chargePath),
      outcome: "the charge arm reaches MoveEnd with zero target damage; only BattleScript_BideAttack's bounded release arm can qualify",
    });
  }
  const runtimeGuardSignature = {
    source: { path: SOUNDPROOF_TABLE_PATH, locator: "ItemBattleEffects ITEMEFFECT_KINGSROCK_SHELLBELL / HOLD_EFFECT_FLINCH", line: sourceLine(battleUtilSource, "case ITEMEFFECT_KINGSROCK_SHELLBELL:", "ITEMEFFECT_KINGSROCK_SHELLBELL") },
    orderedGuards: KINGS_ROCK_ORDERED_GUARDS,
    holdEffect: { item: "ITEM_KINGS_ROCK", effect: "HOLD_EFFECT_FLINCH", parameter: 10 },
    dataHpUpdate: onDamageContactRuntimeGuards.dataHpUpdate,
    scopeBoundary: "Only HOLD_EFFECT_FLINCH is certified. The adjacent HOLD_EFFECT_SHELL_BELL arm is not promoted or inferred.",
  };
  const familyEvidence = {
    category: KINGS_ROCK_CATEGORY,
    selector: {
      path: MOVES_PATH,
      locator: `moves:${move.move}.flags`,
      symbol: move.move,
      guard: "gBattleMoves[gCurrentMove].flags & FLAG_KINGS_ROCK_AFFECTED",
      derivedFrom: "moveend-kings-rock candidate selector moves.json flags includes FLAG_KINGS_ROCK_AFFECTED and power != 0",
    },
    entryPath: {
      kind: KINGS_ROCK_CHARGE_RELEASE_MOVES.has(move.move) ? "bounded-charge-release-damage-route" : "successful-target-damage-to-moveend-state-12",
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
      declaredEntryScript: entryScript,
      damagingEntryScript,
      graph: damaging.fullPath.graph,
      program: damaging.fullPath.program,
      dataHpUpdate: damaging.dataHpUpdate,
      moveEnd,
      alternatives,
    },
    dispatcher: {
      path: BATTLE_SCRIPT_COMMANDS_PATH,
      locator: "Cmd_moveend MOVEEND_KINGSROCK_SHELLBELL",
      line: kingsRockMoveEndLine,
      call: KINGS_ROCK_DISPATCHER_CALL,
      statePath: BATTLE_SCRIPT_CONSTANTS_PATH,
      stateLine: kingsRockStateLine,
      state: "MOVEEND_KINGSROCK_SHELLBELL",
      stateValue: 12,
    },
    familyVerification: {
      scope: "One complete-parties Battle Scene OFF Pound receipt proves the shared King's Rock flinch lifecycle; all 105 siblings are batch-checked against this exact selector, graph/program route, state-12 dispatcher, and ordered guard signature.",
      implementation: "src/engine/battleScriptMoveEndOpcode.ts#MOVEEND_KINGSROCK_SHELLBELL",
      batchTest: "tests/kingsRockHookJoinBatch.test.ts",
      oracleReceipt: "docs/kings-rock-moveend-ground-truth.md",
      oracleFixture: "tools/battle-lab/mechanic-kings-rock-flinch-off.json",
      oracleProbe: "tools/probe/probe-kings-rock-flinch-off.py",
      oracleReceiptFiles: ["tools/probe/receipts/kings-rock-flinch-off.json"],
      scopeBoundary: "MOVE_TICKLE remains an explicit power/damage-zero source exception; Shell Bell is not claimed.",
    },
    runtimeGuardSignature,
  };
  return {
    status: "source-proven" as const,
    id: `kings-rock-route:${move.move}`,
    move: move.move,
    entryScript,
    routeKind: familyEvidence.entryPath.kind,
    executionInventory: executableMoveSymbols.has(move.move) ? "level50-executable" : "level50-roster-only",
    familyEvidence,
  };
}

const kingsRockCandidateRows = rosterMoveSymbols
  .map((symbol) => moveBySymbol.get(symbol)!)
  .filter((move) => move.flags.includes("FLAG_KINGS_ROCK_AFFECTED"))
  .map((move) => ({
    move: move.move,
    moveId: move.id,
    effect: move.effect,
    power: move.power,
    entryScript: topologyByMove.get(move.move)!.entryScript,
    executionInventory: executableMoveSymbols.has(move.move) ? "level50-executable" : "level50-roster-only",
  }));
if (kingsRockCandidateRows.length !== 106
  || kingsRockCandidateRows.filter((row) => row.executionInventory === "level50-roster-only").length !== 12) {
  throw new Error("King's Rock selector is not the audited 106 rows with 12 roster-only candidates");
}
const kingsRockExceptionRows = [{
  id: "kings-rock-zero-damage:MOVE_TICKLE",
  move: "MOVE_TICKLE",
  reason: "MOVE_TICKLE carries FLAG_KINGS_ROCK_AFFECTED in the source table but power is 0 and its script performs no successful target datahpupdate, so gBattleMoveDamage/TARGET_TURN_DAMAGED cannot qualify.",
}];
const kingsRockEvidenceByMove = new Map<string, ReturnType<typeof kingsRockRouteEvidence>>();
for (const candidate of kingsRockCandidateRows) {
  if (candidate.move === "MOVE_TICKLE") continue;
  kingsRockEvidenceByMove.set(candidate.move, kingsRockRouteEvidence(moveBySymbol.get(candidate.move)!, candidate.entryScript));
}
const kingsRockSourceProvenRows = [...kingsRockEvidenceByMove.keys()];
if (kingsRockSourceProvenRows.length !== 105) throw new Error("King's Rock promotion must be exactly 105 rows");

const shellBellItem = holdEffects.items.find((row) => row.item === "ITEM_SHELL_BELL");
if (!shellBellItem || shellBellItem.holdEffect !== "HOLD_EFFECT_SHELL_BELL" || shellBellItem.holdEffectParam !== 8) {
  throw new Error("ITEM_SHELL_BELL is no longer HOLD_EFFECT_SHELL_BELL with parameter 8");
}
const SHELL_BELL_ORDERED_GUARDS = [
  "gBattleMoveDamage != 0",
  "atkHoldEffect == HOLD_EFFECT_SHELL_BELL",
  "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
  "gSpecialStatuses[gBattlerTarget].shellBellDmg != 0",
  "gSpecialStatuses[gBattlerTarget].shellBellDmg != IGNORE_SHELL_BELL",
  "gBattlerAttacker != gBattlerTarget",
  "gBattleMons[gBattlerAttacker].hp != gBattleMons[gBattlerAttacker].maxHP",
  "gBattleMons[gBattlerAttacker].hp != 0",
] as const;
const shellBellSourceTokens = [
  "case HOLD_EFFECT_SHELL_BELL:",
  "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
  "gSpecialStatuses[gBattlerTarget].shellBellDmg != 0",
  "gSpecialStatuses[gBattlerTarget].shellBellDmg != IGNORE_SHELL_BELL",
  "gBattlerAttacker != gBattlerTarget",
  "gBattleMons[gBattlerAttacker].hp != gBattleMons[gBattlerAttacker].maxHP",
  "gBattleMons[gBattlerAttacker].hp != 0",
  "gBattleMoveDamage = (gSpecialStatuses[gBattlerTarget].shellBellDmg / atkHoldEffectParam) * -1",
  "gSpecialStatuses[gBattlerTarget].shellBellDmg = 0",
  "BattleScript_ItemHealHP_Ret",
  "effect++",
];
let shellBellGuardCursor = kingsRockShellBellStart;
for (const token of shellBellSourceTokens) {
  const next = battleUtilSource.indexOf(token, shellBellGuardCursor);
  if (next < 0) throw new Error(`Shell Bell source lost ordered guard ${token}`);
  shellBellGuardCursor = next + token.length;
}
const shellBellRuntimeGuardSignature = {
  source: { path: SOUNDPROOF_TABLE_PATH, locator: "ItemBattleEffects ITEMEFFECT_KINGSROCK_SHELLBELL / HOLD_EFFECT_SHELL_BELL", line: sourceLine(battleUtilSource, "case HOLD_EFFECT_SHELL_BELL:", "HOLD_EFFECT_SHELL_BELL") },
  orderedGuards: SHELL_BELL_ORDERED_GUARDS,
  holdEffect: { item: "ITEM_SHELL_BELL", effect: "HOLD_EFFECT_SHELL_BELL", parameter: 8 },
  dataHpUpdate: onDamageContactRuntimeGuards.dataHpUpdate,
  scopeBoundary: "Only HOLD_EFFECT_SHELL_BELL is certified here. The adjacent HOLD_EFFECT_FLINCH (King's Rock) arm sharing the same MOVEEND_KINGSROCK_SHELLBELL state 12 dispatcher is not promoted or inferred by this family.",
};

/**
 * Shell Bell reuses Color Change's already-proven power != 0 candidate population and
 * successful-target-datahpupdate graph/program routes rather than recomputing them: both
 * families read the same unbroken Cmd_moveend do-while sweep, Color Change at state 3 and
 * Shell Bell at state 12, and the ground-truth doc (docs/shell-bell-moveend-ground-truth.md
 * §4) shows a route proven to reach state 3 also reaches state 12 with no intervening
 * moveendto/moveendfromto cap. Only the MOVEEND handoff is retargeted; the Future Sight
 * exclusion reason is re-derived independently (battle_util.c:1816 IGNORE_SHELL_BELL poison,
 * not Color Change's state-3 moveendfromto skip).
 */
function shellBellRouteEvidence(colorChangeEvidence: Extract<ReturnType<typeof colorChangeRouteEvidence>, { status: "source-proven" }>) {
  const move = colorChangeEvidence.move;
  const damaging = colorChangeEvidence.damagingPath;
  const moveEnd = {
    ...damaging.moveEnd,
    state: "MOVEEND_KINGSROCK_SHELLBELL",
    stateValue: 12,
    semantics: "the certified MOVEEND_ON_DAMAGE_ABILITIES (state 3) handoff proves the same unbroken Cmd_moveend do-while sweep also reaches state 12; this retargets Color Change's already-proven route rather than recomputing it",
  };
  const familyEvidence = {
    category: SHELL_BELL_CATEGORY,
    selector: {
      path: SOUNDPROOF_TABLE_PATH,
      locator: "ItemBattleEffects ITEMEFFECT_KINGSROCK_SHELLBELL / HOLD_EFFECT_SHELL_BELL",
      line: sourceLine(battleUtilSource, "case HOLD_EFFECT_SHELL_BELL:", "HOLD_EFFECT_SHELL_BELL"),
      guard: "gBattleMoves[move].power != 0",
      derivedFrom: "moveend-shell-bell candidate selector reuses the moveend-color-change moves.json power != 0 population: the same successful target-datahpupdate route, read at a different MOVEEND state",
    },
    entryPath: {
      kind: "color-change-route-retargeted-to-state-12",
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(colorChangeEvidence.entryScript).line },
      declaredEntryScript: colorChangeEvidence.entryScript,
      damagingEntryScript: damaging.dataPath.graph.entryLabel,
      graph: damaging.fullPath.graph,
      program: damaging.fullPath.program,
      dataHpUpdate: damaging.dataHpUpdate,
      moveEnd,
      alternatives: colorChangeEvidence.alternatives,
    },
    dispatcher: {
      path: BATTLE_SCRIPT_COMMANDS_PATH,
      locator: "Cmd_moveend MOVEEND_KINGSROCK_SHELLBELL",
      line: kingsRockMoveEndLine,
      call: KINGS_ROCK_DISPATCHER_CALL,
      statePath: BATTLE_SCRIPT_CONSTANTS_PATH,
      stateLine: kingsRockStateLine,
      state: "MOVEEND_KINGSROCK_SHELLBELL",
      stateValue: 12,
    },
    familyVerification: {
      scope: "One two-arm Battle Scene OFF Shuckle/Swellow Pound receipt (Shell Bell holder vs. no-item control, identical action RNG) proves the shared heal lifecycle; all 182 siblings are batch-checked against this exact selector, retargeted graph/program route, state-12 dispatcher, and ordered guard signature.",
      implementation: "src/engine/battleScriptMoveEndOpcode.ts#MOVEEND_KINGSROCK_SHELLBELL HOLD_EFFECT_SHELL_BELL arm",
      batchTest: "tests/shellBellHookJoinBatch.test.ts",
      oracleReceipt: "docs/shell-bell-moveend-ground-truth.md",
      oracleFixture: "tools/battle-lab/mechanic-shell-bell-heal-off.json",
      oracleControlFixture: "tools/battle-lab/mechanic-shell-bell-control-off.json",
      oracleProbe: "tools/probe/probe-shell-bell-heal-off.py",
      oracleReceiptFiles: ["tools/probe/receipts/shell-bell-heal-off.json"],
      scopeBoundary: "MOVE_FUTURE_SIGHT remains an explicit shellBellDmg=IGNORE_SHELL_BELL source exception (battle_util.c:1816), a Shell Bell-specific reason distinct from Color Change's state-3 MOVEEND skip; King's Rock's adjacent HOLD_EFFECT_FLINCH arm is not claimed.",
    },
    runtimeGuardSignature: shellBellRuntimeGuardSignature,
  };
  return {
    status: "source-proven" as const,
    id: `shell-bell-route:${move}`,
    move,
    entryScript: colorChangeEvidence.entryScript,
    routeKind: colorChangeEvidence.routeKind,
    executionInventory: executableMoveSymbols.has(move) ? "level50-executable" : "level50-roster-only",
    familyEvidence,
  };
}

const shellBellCandidateRows = onDamageCandidatesByCategory[ON_DAMAGE_COLOR_CHANGE_CATEGORY];
if (shellBellCandidateRows.length !== 183) {
  throw new Error("Shell Bell candidate population drifted from Color Change's power != 0 selector");
}
const shellBellExceptionRows = [{
  id: "shell-bell-ignore:MOVE_FUTURE_SIGHT",
  move: "MOVE_FUTURE_SIGHT",
  reason: "HandleWishPerishSongOnTurnEnd (battle_util.c:1816) sets gSpecialStatuses[gBattlerTarget].shellBellDmg = IGNORE_SHELL_BELL immediately before the delayed Future Sight hit's BattleScript_MonTookFutureAttack executes, so the shellBellDmg != IGNORE_SHELL_BELL guard fails regardless of MOVEEND state reachability -- distinct from Color Change's state-3 moveendfromto skip reason for the same move.",
}];
const shellBellEvidenceByMove = new Map<string, ReturnType<typeof shellBellRouteEvidence>>();
for (const candidate of shellBellCandidateRows) {
  if (candidate.move === "MOVE_FUTURE_SIGHT") continue;
  const colorChangeEvidence = colorChangeRouteEvidenceByMove.get(candidate.move);
  if (colorChangeEvidence === undefined || colorChangeEvidence.status !== "source-proven") {
    throw new Error(`${candidate.move} lacks source-proven Color Change evidence to retarget for Shell Bell`);
  }
  shellBellEvidenceByMove.set(candidate.move, shellBellRouteEvidence(colorChangeEvidence));
}
const shellBellSourceProvenRows = [...shellBellEvidenceByMove.keys()];
if (shellBellSourceProvenRows.length !== 182) throw new Error("Shell Bell promotion must be exactly 182 rows");

const IMMUNITY_CATEGORY = "moveend-immunity-abilities";
const IMMUNITY_DISPATCHER_CALL = "AbilityBattleEffects(ABILITYEFFECT_IMMUNITY, 0, 0, 0, 0)";
const immunityMoveEndCaseLine = sourceLine(battleScriptCommandsSource, "case MOVEEND_IMMUNITY_ABILITIES:", "MOVEEND_IMMUNITY_ABILITIES");
const immunityMoveEndStateLine = sourceLine(battleScriptConstantsSource, "#define MOVEEND_IMMUNITY_ABILITIES", "MOVEEND_IMMUNITY_ABILITIES");
if (!battleScriptCommandsSource.includes("case MOVEEND_IMMUNITY_ABILITIES: // status immunities\n            if (AbilityBattleEffects(ABILITYEFFECT_IMMUNITY, 0, 0, 0, 0))")
  || !battleScriptConstantsSource.includes("#define MOVEEND_IMMUNITY_ABILITIES                4")) {
  throw new Error("Immunity MOVEEND state 4 dispatcher drifted");
}
const MOVEEND_STATE_VALUES = new Map<string, number>();
for (const match of battleScriptConstantsSource.matchAll(/#define (MOVEEND_\w+)\s+(\d+)/g)) {
  MOVEEND_STATE_VALUES.set(match[1]!, Number(match[2]));
}
if (MOVEEND_STATE_VALUES.get("MOVEEND_IMMUNITY_ABILITIES") !== 4 || MOVEEND_STATE_VALUES.size !== 18) {
  throw new Error("Cmd_moveend state constant table drifted");
}

// A handoff qualifies only when the Cmd_moveend state range it enters
// actually includes state 4 -- moveendfromto can start past it (e.g. Future
// Sight's delayed MOVEEND_ITEM_EFFECTS_ALL hit), which must not count.
function immunityRouteHandoff(statement: GraphStatement) {
  if (statement.mnemonic === "moveendall") {
    return {
      kind: "moveendall",
      label: "BattleScript_MoveEnd",
      line: statement.line,
      state: "MOVEEND_IMMUNITY_ABILITIES",
      stateValue: 4,
      semantics: "Cmd_moveend starts at state 0 and executes state 4 before ending the full moveendall pass",
    };
  }
  if (statement.mnemonic === "moveendto" && statement.operandTokens[0] === "MOVEEND_NEXT_TARGET") {
    return {
      kind: "moveendto-next-target",
      label: "Cmd_moveend",
      line: statement.line,
      state: "MOVEEND_IMMUNITY_ABILITIES",
      stateValue: 4,
      semantics: "Cmd_moveend endMode 2 starts at state 0 and runs through state 4 before the requested MOVEEND_NEXT_TARGET stop",
    };
  }
  if (statement.mnemonic === "moveendfromto") {
    const from = MOVEEND_STATE_VALUES.get(statement.operandTokens[0]!);
    const to = MOVEEND_STATE_VALUES.get(statement.operandTokens[1]!);
    if (from !== undefined && to !== undefined && from <= 4 && 4 < to) {
      return {
        kind: "moveendfromto",
        label: "Cmd_moveend",
        line: statement.line,
        state: "MOVEEND_IMMUNITY_ABILITIES",
        stateValue: 4,
        semantics: `Cmd_moveend is explicitly entered at ${statement.operandTokens[0]} and bounded before ${statement.operandTokens[1]}, a range that covers state 4`,
      };
    }
    return null;
  }
  return null;
}

function immunityRouteEvidence(move: Move, entryScript: string) {
  const path = onDamageRoutePath(
    entryScript,
    (statement) => immunityRouteHandoff(statement) !== null,
    "a MOVEEND_IMMUNITY_ABILITIES-capable moveend handoff",
  );
  const handoffPosition = path.positions.at(-1)!;
  const handoff = immunityRouteHandoff(onDamageStatement(handoffPosition));
  if (handoff === null) throw new Error(`${move.move} route handoff disappeared`);
  const witness = onDamageRouteWitnessPath(path);
  const familyEvidence = {
    category: IMMUNITY_CATEGORY,
    selector: {
      path: BATTLE_SCRIPT_COMMANDS_PATH,
      locator: "Cmd_moveend MOVEEND_IMMUNITY_ABILITIES",
      symbol: move.move,
      guard: "reaches a moveendall/moveendto/moveendfromto handoff whose Cmd_moveend state range includes MOVEEND_IMMUNITY_ABILITIES (state 4)",
      derivedFrom: "moveend-immunity-abilities candidate selector: Level-50 ability-axis rows not already claimed by Soundproof, Absorbing, ON_DAMAGE contact, Color Change, Synchronize, Attract/Oblivious, or Explosion/Damp, excluding the two Rank-4 ability-manipulation moves and the five Rank-5 pre-emptive Own Tempo guard moves",
    },
    entryPath: {
      kind: handoff.kind,
      source: { path: BATTLE_SCRIPT_SOURCE_PATH, entryLine: requireGraphLabel(entryScript).line },
      declaredEntryScript: entryScript,
      graph: witness.graph,
      program: witness.program,
      moveEnd: handoff,
    },
    dispatcher: {
      path: BATTLE_SCRIPT_COMMANDS_PATH,
      locator: "Cmd_moveend MOVEEND_IMMUNITY_ABILITIES",
      line: immunityMoveEndCaseLine,
      call: IMMUNITY_DISPATCHER_CALL,
      statePath: BATTLE_SCRIPT_CONSTANTS_PATH,
      stateLine: immunityMoveEndStateLine,
      state: "MOVEEND_IMMUNITY_ABILITIES",
      stateValue: 4,
    },
    familyVerification: {
      scope: "One Skill-Swap-staged Battle Scene OFF Girafarig/Hitmonlee receipt (two independent seeds) proves the shared status-immunity cure lifecycle at MOVEEND_IMMUNITY_ABILITIES; all siblings are batch-checked against this exact selector, graph/program moveend route, and state-4 dispatcher. The receipt uses Skill Swap because the eight cure abilities each block their own matching status from applying while already active, so reachability requires the ability to arrive after the status -- but the per-move family claim proven here is only that the move's own script reaches Cmd_moveend's normal tail, which passes through state 4 unconditionally; the two claims are not conflated.",
      implementation: "src/engine/battleScriptMoveEndOpcode.ts#MOVEEND_IMMUNITY_ABILITIES",
      batchTest: "tests/statusImmunityHookJoinBatch.test.ts",
      oracleReceipt: "docs/immunity-abilities-ground-truth.md",
      oracleFixture: "tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json",
      oracleProbe: "tools/probe/probe-immunity-limber-off.py",
      oracleReceiptFiles: [
        "tools/probe/receipts/immunity-limber-off-seed-610839776.json",
        "tools/probe/receipts/immunity-limber-off-seed-324508639.json",
      ],
      scopeBoundary: "MOVE_SKILL_SWAP and MOVE_ROLE_PLAY (the ability-manipulation opcode family) and the five moves with their own pre-emptive Own Tempo jumpifability guard are not claimed by this family.",
    },
  };
  return {
    status: "source-proven" as const,
    id: `immunity-route:${move.move}`,
    move: move.move,
    entryScript,
    routeKind: handoff.kind,
    executionInventory: executableMoveSymbols.has(move.move) ? "level50-executable" : "level50-roster-only",
    familyEvidence,
  };
}

const IMMUNITY_MANIPULATION_EXCLUSIONS = new Set(["MOVE_SKILL_SWAP", "MOVE_ROLE_PLAY"]);
const IMMUNITY_OWN_TEMPO_GUARD_EXCLUSIONS = new Set([
  "MOVE_CONFUSE_RAY", "MOVE_SWEET_KISS", "MOVE_SWAGGER", "MOVE_FLATTER", "MOVE_TEETER_DANCE",
]);
function abilityAxisAlreadyClaimed(symbol: string): boolean {
  if (soundMoves.has(symbol)) return true;
  if ((absorbingEvidenceByMove.get(symbol) ?? []).length > 0) return true;
  if (contactRouteEvidenceByMove.get(symbol)?.status === "source-proven") return true;
  if (colorChangeRouteEvidenceByMove.get(symbol)?.status === "source-proven") return true;
  if (synchronizeEvidenceByMove.get(symbol)?.status === "source-proven") return true;
  if (symbol === "MOVE_ATTRACT") return true;
  if (tryexplosionDampEvidenceRows.some((row) => row.move === symbol)) return true;
  return false;
}
const immunityCandidateRows = rosterMoveSymbols
  .map((symbol) => moveBySymbol.get(symbol)!)
  .filter((move) => !abilityAxisAlreadyClaimed(move.move))
  .filter((move) => !IMMUNITY_MANIPULATION_EXCLUSIONS.has(move.move) && !IMMUNITY_OWN_TEMPO_GUARD_EXCLUSIONS.has(move.move))
  .map((move) => ({
    move: move.move,
    moveId: move.id,
    effect: move.effect,
    power: move.power,
    entryScript: topologyByMove.get(move.move)!.entryScript,
    executionInventory: executableMoveSymbols.has(move.move) ? "level50-executable" : "level50-roster-only",
  }));
if (immunityCandidateRows.length !== 99) {
  throw new Error(`expected 99 Level-50 Immunity-family candidates, got ${immunityCandidateRows.length}`);
}
// BattleScript_EffectAssist/Metronome end in a dynamic-dispatch opcode
// (jumptocalledmove/metronome) with no static fallthrough tail of their own,
// so the graph/program has no direct moveend node to certify a route
// through -- distinct from e.g. Mirror Move, whose failure fallthrough does
// reach a real moveendall.
const IMMUNITY_EXCEPTION_ROWS = [
  {
    id: "immunity-dynamic-dispatch:MOVE_ASSIST",
    move: "MOVE_ASSIST",
    reason: "BattleScript_EffectAssist ends in jumptocalledmove TRUE (battle_scripts_1.s:2375), a dynamic dispatch to whichever ally move assistattackselect chose at runtime; the static graph/program has no moveendall/moveendto/moveendfromto node of its own to certify a route through, even though the invoked move's own script independently reaches Cmd_moveend's normal tail.",
  },
  {
    id: "immunity-dynamic-dispatch:MOVE_METRONOME",
    move: "MOVE_METRONOME",
    reason: "BattleScript_EffectMetronome ends in the metronome opcode (battle_scripts_1.s:1155), a dynamic dispatch to a randomly selected move; the static graph/program has no moveendall/moveendto/moveendfromto node of its own to certify a route through, even though the invoked move's own script independently reaches Cmd_moveend's normal tail.",
  },
];
const immunityEvidenceByMove = new Map<string, ReturnType<typeof immunityRouteEvidence>>();
for (const candidate of immunityCandidateRows) {
  if (IMMUNITY_EXCEPTION_ROWS.some((exception) => exception.move === candidate.move)) continue;
  immunityEvidenceByMove.set(candidate.move, immunityRouteEvidence(moveBySymbol.get(candidate.move)!, candidate.entryScript));
}
const immunitySourceProvenRows = [...immunityEvidenceByMove.keys()];
if (immunitySourceProvenRows.length !== immunityCandidateRows.length - IMMUNITY_EXCEPTION_ROWS.length) {
  throw new Error("Immunity promotion accounting drifted from candidates minus exceptions");
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
  const contactEvidence = contactRouteEvidenceByMove.get(symbol);
  if (contactEvidence?.status === "source-proven") {
    sourceProvenFamilies.push(contactEvidence.familyEvidence);
  }
  const colorChangeEvidence = colorChangeRouteEvidenceByMove.get(symbol);
  if (colorChangeEvidence?.status === "source-proven") {
    sourceProvenFamilies.push(colorChangeEvidence.familyEvidence);
  }
  const synchronizeEvidence = synchronizeEvidenceByMove.get(symbol);
  if (synchronizeEvidence?.status === "source-proven") {
    sourceProvenFamilies.push(synchronizeEvidence.familyEvidence);
  }
  if (symbol === "MOVE_ATTRACT") {
    sourceProvenFamilies.push(tryinfatuatingObliviousEvidence.familyEvidence);
  }
  const tryexplosionDampEvidence = tryexplosionDampEvidenceRows.find((row) => row.move === symbol);
  if (tryexplosionDampEvidence) {
    sourceProvenFamilies.push(tryexplosionDampEvidence.familyEvidence);
  }
  const immunityEvidence = immunityEvidenceByMove.get(symbol);
  if (immunityEvidence !== undefined) {
    sourceProvenFamilies.push(immunityEvidence.familyEvidence);
  }
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
  const itemSourceProvenFamilies: Array<{ category: string; [key: string]: unknown }> = [];
  const kingsRockEvidence = kingsRockEvidenceByMove.get(symbol);
  if (kingsRockEvidence !== undefined) itemSourceProvenFamilies.push(kingsRockEvidence.familyEvidence);
  const shellBellEvidence = shellBellEvidenceByMove.get(symbol);
  if (shellBellEvidence !== undefined) itemSourceProvenFamilies.push(shellBellEvidence.familyEvidence);
  const itemSourceException = symbol === "MOVE_TICKLE"
    ? kingsRockExceptionRows[0]!
    : symbol === "MOVE_FUTURE_SIGHT"
      ? shellBellExceptionRows[0]!
      : null;
  const itemHook = itemSourceProvenFamilies.length === 0
    ? {
      potentialCategories: null,
      status: "unsupported",
      supportedCategories: [],
      unsupportedCategories: null,
      reason: itemSourceException?.reason
        ?? "Per-move item categories require complete Battle Script control flow, including implicit fallthrough and source branch guards; no audited item family selects this move.",
      ...(itemSourceException !== null ? { sourceException: itemSourceException } : {}),
    }
    : {
      potentialCategories: null,
      status: "source-proven-family",
      supportedCategories: itemSourceProvenFamilies.map((family) => family.category),
      unsupportedCategories: null,
      reason: `Source-proven item family/categories: ${itemSourceProvenFamilies.map((family) => family.category).join(", ")}. Each named family carries its exact source selector, generated Battle Script route, MOVEEND state 12 dispatcher handoff, and ordered runtime guards. This promotion does not claim unrelated item families.`,
      evidence: { families: itemSourceProvenFamilies },
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
      item: itemHook,
      ability: abilityHook,
    },
  };
});

const rosterEffects = new Set(records.map((record) => record.moveTable.effect));
const executableRecords = records.filter((record) => record.battleScript.executionInventory === "level50-executable");
const executableEffects = new Set(executableRecords.map((record) => record.moveTable.effect));
const sourceProvenAbilityRecords = records.filter((record) => record.hooks.ability.status === SOUNDPROOF_STATUS);
const sourceProvenItemRecords = records.filter((record) => record.hooks.item.status === SOUNDPROOF_STATUS);
const kingsRockRosterRecords = sourceProvenItemRecords.filter((record) => record.hooks.item.supportedCategories.includes(KINGS_ROCK_CATEGORY));
const shellBellRosterRecords = sourceProvenItemRecords.filter((record) => record.hooks.item.supportedCategories.includes(SHELL_BELL_CATEGORY));
if (sourceProvenItemRecords.length !== 182
  || kingsRockRosterRecords.length !== 105
  || shellBellRosterRecords.length !== 182
  || !kingsRockRosterRecords.every((record) => record.hooks.item.supportedCategories.includes(SHELL_BELL_CATEGORY))) {
  throw new Error("King's Rock / Shell Bell source-proven item roster accounting drifted");
}
const soundproofRosterRecords = sourceProvenAbilityRecords.filter((record) => record.hooks.ability.supportedCategories.includes(SOUNDPROOF_CATEGORY));
if (soundproofRosterRecords.length !== 9) {
  throw new Error(`expected nine Level-50 Soundproof selectors, got ${soundproofRosterRecords.length}`);
}
if (soundproofRosterRecords.some((record) => !record.hooks.ability.supportedCategories.includes(SOUNDPROOF_CATEGORY))) {
  throw new Error("a Soundproof roster row does not carry the exact moves-block category");
}
const synchronizeRosterRecords = sourceProvenAbilityRecords.filter((record) => record.hooks.ability.supportedCategories.includes(SYNCHRONIZE_CATEGORY));
if (synchronizeRosterRecords.length !== synchronizeCandidateRows.length
  || synchronizeRosterRecords.some((record) => !synchronizeSourceProvenRows.includes(record.move))) {
  throw new Error("Synchronize source-proven roster accounting does not match the finite candidate census");
}
const tryinfatuatingObliviousRosterRecords = sourceProvenAbilityRecords.filter((record) => record.hooks.ability.supportedCategories.includes(TRYINFATUATING_OBLIVIOUS_CATEGORY));
if (tryinfatuatingObliviousRosterRecords.length !== 1
  || tryinfatuatingObliviousRosterRecords[0]?.move !== "MOVE_ATTRACT") {
  throw new Error("tryinfatuating/Oblivious source-proven roster accounting does not match the one-row Attract census");
}
const tryexplosionDampRosterRecords = sourceProvenAbilityRecords.filter((record) => record.hooks.ability.supportedCategories.includes(TRYEXPLOSION_DAMP_CATEGORY));
if (JSON.stringify(tryexplosionDampRosterRecords.map((record) => record.move)) !== JSON.stringify(["MOVE_SELF_DESTRUCT", "MOVE_EXPLOSION"])) {
  throw new Error("tryexplosion/Damp source-proven roster accounting does not match the two-row Explosion census");
}
const immunityRosterRecords = sourceProvenAbilityRecords.filter((record) => record.hooks.ability.supportedCategories.includes(IMMUNITY_CATEGORY));
if (immunityRosterRecords.length !== immunitySourceProvenRows.length
  || immunityRosterRecords.some((record) => !immunitySourceProvenRows.includes(record.move))) {
  throw new Error("Immunity source-proven roster accounting does not match the finite candidate census");
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
const synchronizeAudit = {
  status: "source-proven-family",
  scope: "Finite Level-50 roster census for status effects that can bank HITMARKER_SYNCHRONIZE_EFFECT and reach the ordered MOVEEND_SYNCHRONIZE_TARGET/MOVEEND_SYNCHRONIZE_ATTACKER states. Each candidate has an exact graph/program route through its entry selector, SetMoveEffect loader, chance/primary dispatcher, and MOVEEND handoff.",
  selector: "source Battle Script entries whose SetMoveEffect path can load poison, toxic, paralysis, or burn; Bounce is restricted to its second-turn setter",
  effects: SYNCHRONIZE_EFFECTS,
  candidateCount: synchronizeCandidateRows.length,
  sourceMoveCandidates: synchronizeCandidateRows,
  sourceProvenRows: synchronizeSourceProvenRows,
  sourceExceptionRows: synchronizeExceptions,
  blockers: synchronizeBlockers,
  excludedOutcomes: SYNCHRONIZE_MARKER_EXCLUSIONS,
  routeWitnesses: synchronizeRouteEvidenceRows,
  runtimeGuardSignature: synchronizeRuntimeGuardSignature,
  dispatcher: {
    path: BATTLE_SCRIPT_COMMANDS_PATH,
    target: { state: "MOVEEND_SYNCHRONIZE_TARGET", stateValue: 2, line: synchronizeTargetMoveEndLine, call: SYNCHRONIZE_DISPATCHER_TARGET_CALL },
    attacker: { state: "MOVEEND_SYNCHRONIZE_ATTACKER", stateValue: 5, line: synchronizeAttackerMoveEndLine, call: SYNCHRONIZE_DISPATCHER_ATTACKER_CALL },
    order: synchronizeRuntimeGuardSignature.moveEnd.order,
  },
  promotions: {
    sourceProvenRows: synchronizeSourceProvenRows,
    reason: "All 30 finite candidates have complete selector, ordered graph/program route, SetMoveEffect marker/runtime guards, and ordered target/attacker MOVEEND evidence. The shared two-seed Battle Scene OFF Thunder Wave receipt and Tier-1 Synchronize batch prove the common dispatcher semantics; no per-move oracle receipts are fabricated.",
  },
};
const tryinfatuatingObliviousAudit = {
  status: "source-proven-family",
  scope: "Finite Level-50 moveTable.effect === EFFECT_ATTRACT selector joined to BattleScript_EffectAttract's action prelude and Cmd_tryinfatuating's target-Oblivious branch. This is one zero-damage candidate with explicit success, ordinary-failure, and Oblivious tails.",
  selector: "moveTable.effect === EFFECT_ATTRACT",
  candidateCount: tryinfatuatingObliviousCandidateRows.length,
  sourceMoveCandidates: tryinfatuatingObliviousCandidateRows,
  sourceProvenRows: tryinfatuatingObliviousSourceProvenRows,
  sourceExceptionRows: tryinfatuatingObliviousExceptions,
  blockers: tryinfatuatingObliviousBlockers,
  routeWitnesses: [tryinfatuatingObliviousEvidence],
  runtimeGuardSignature: tryinfatuatingRuntimeGuardSignature,
  dispatcher: {
    path: BATTLE_SCRIPT_COMMANDS_PATH,
    locator: "Cmd_tryinfatuating",
    line: tryinfatuatingLine,
    opcode: "B_SCR_OP_TRYINFATUATING",
    entryScript: "BattleScript_EffectAttract",
  },
  promotions: {
    sourceProvenRows: tryinfatuatingObliviousSourceProvenRows,
    reason: "MOVE_ATTRACT is the sole finite EFFECT_ATTRACT selector and has a complete graph/program action prelude, exact Cmd_tryinfatuating guard order, explicit MoveEnd tails, focused opcode/batch tests, and a paired Battle Scene OFF semantic receipt. No damage or MOVEEND item family is inferred.",
  },
};
const tryexplosionDampAudit = {
  status: "source-proven-family",
  scope: "Finite Level-50 moveTable.effect === EFFECT_EXPLOSION selector joined to BattleScript_EffectExplosion's PP-spending prelude and Cmd_tryexplosion's first-Damp-holder fixed failure tail.",
  selector: "moveTable.effect === EFFECT_EXPLOSION",
  candidateCount: tryexplosionDampCandidateRows.length,
  selectableSetOccurrences: tryexplosionDampCandidateRows.reduce((sum, row) => sum + row.selectableSetOccurrences, 0),
  fullLevel50CarrierRows: tryexplosionDampCandidateRows.reduce((sum, row) => sum + row.fullLevel50CarrierRows, 0),
  nonselectableCarrierRows: [{ setId: 57, label: "FRONTIER_MON_PINECO", move: "MOVE_SELF_DESTRUCT" }],
  sourceMoveCandidates: tryexplosionDampCandidateRows,
  sourceProvenRows: tryexplosionDampSourceProvenRows,
  sourceExceptionRows: [],
  blockers: [],
  routeWitnesses: tryexplosionDampEvidenceRows,
  runtimeGuardSignature: tryexplosionRuntimeGuardSignature,
  dispatcher: { path: BATTLE_SCRIPT_COMMANDS_PATH, locator: "Cmd_tryexplosion", line: tryexplosionLine, opcode: "B_SCR_OP_TRYEXPLOSION", entryScript: "BattleScript_EffectExplosion" },
  promotions: {
    sourceProvenRows: tryexplosionDampSourceProvenRows,
    reason: "Both EFFECT_EXPLOSION rows have the exact graph/program prelude, first-holder Damp scan and fixed failure tail, focused opcode/batch tests, and a twice-fresh three-arm Battle Scene OFF semantic receipt. This adds two category joins but no newly source-proven row because both moves were already Color Change-proven.",
  },
};
const kingsRockAudit = {
  status: "source-proven-family",
  scope: "Finite Level-50 FLAG_KINGS_ROCK_AFFECTED selector joined to the attacker's HOLD_EFFECT_FLINCH item arm and MOVEEND_KINGSROCK_SHELLBELL state 12, without claiming the adjacent Shell Bell arm.",
  selector: "moves.json flags includes FLAG_KINGS_ROCK_AFFECTED",
  candidateCount: kingsRockCandidateRows.length,
  sourceMoveCandidates: kingsRockCandidateRows,
  sourceProvenRows: kingsRockSourceProvenRows,
  sourceExceptionRows: kingsRockExceptionRows,
  blockers: [],
  routeWitnesses: [...kingsRockEvidenceByMove.values()],
  runtimeGuardSignature: [...kingsRockEvidenceByMove.values()][0]!.familyEvidence.runtimeGuardSignature,
  chargeReleaseMoves: [...KINGS_ROCK_CHARGE_RELEASE_MOVES],
  dispatcher: { path: BATTLE_SCRIPT_COMMANDS_PATH, line: kingsRockMoveEndLine, call: KINGS_ROCK_DISPATCHER_CALL, state: "MOVEEND_KINGSROCK_SHELLBELL", stateValue: 12 },
  promotions: {
    sourceProvenRows: kingsRockSourceProvenRows,
    reason: "Exactly 105 of 106 selector rows have successful graph/program target-damage routes to state 12. MOVE_TICKLE remains the sole power/damage-zero source exception; all 12 roster-only candidates are retained in the finite census.",
  },
};
const shellBellAudit = {
  status: "source-proven-family",
  scope: "Finite Level-50 power != 0 selector (reused from the moveend-color-change candidate population) joined to the attacker's HOLD_EFFECT_SHELL_BELL item arm and MOVEEND_KINGSROCK_SHELLBELL state 12, without claiming the adjacent King's Rock HOLD_EFFECT_FLINCH arm.",
  selector: "moves.json power != 0 (identical population to moveend-color-change; not a moves.json flag)",
  candidateCount: shellBellCandidateRows.length,
  sourceMoveCandidates: shellBellCandidateRows,
  sourceProvenRows: shellBellSourceProvenRows,
  sourceExceptionRows: shellBellExceptionRows,
  blockers: [],
  routeWitnesses: [...shellBellEvidenceByMove.values()],
  runtimeGuardSignature: shellBellRuntimeGuardSignature,
  dispatcher: { path: BATTLE_SCRIPT_COMMANDS_PATH, line: kingsRockMoveEndLine, call: KINGS_ROCK_DISPATCHER_CALL, state: "MOVEEND_KINGSROCK_SHELLBELL", stateValue: 12 },
  promotions: {
    sourceProvenRows: shellBellSourceProvenRows,
    reason: "182 of 183 power != 0 candidates retarget the already-proven moveend-color-change graph/program route to MOVEEND_KINGSROCK_SHELLBELL state 12 (same unbroken Cmd_moveend do-while sweep, no recomputation). MOVE_FUTURE_SIGHT remains the sole source exception, excluded by its own battle_util.c:1816 IGNORE_SHELL_BELL poison rather than Color Change's state-3 moveendfromto skip.",
  },
};
const immunityAudit = {
  status: "source-proven-family",
  scope: "Every Level-50 ability-axis row not already claimed by Soundproof, Absorbing, ON_DAMAGE contact, Color Change, Synchronize, Attract/Oblivious, or Explosion/Damp is joined to AbilityBattleEffects(ABILITYEFFECT_IMMUNITY)'s unconditional Cmd_moveend state-4 dispatch, excluding the two Rank-4 ability-manipulation moves and the five Rank-5 pre-emptive Own Tempo guard moves.",
  selector: "Level-50 roster moves whose ability axis is otherwise unclaimed, minus MOVE_SKILL_SWAP/MOVE_ROLE_PLAY and the five Own Tempo guard moves",
  candidateCount: immunityCandidateRows.length,
  sourceMoveCandidates: immunityCandidateRows,
  sourceProvenRows: immunitySourceProvenRows,
  sourceExceptionRows: IMMUNITY_EXCEPTION_ROWS,
  blockers: [],
  routeWitnesses: [...immunityEvidenceByMove.values()],
  dispatcher: { path: BATTLE_SCRIPT_COMMANDS_PATH, line: immunityMoveEndCaseLine, call: IMMUNITY_DISPATCHER_CALL, state: "MOVEEND_IMMUNITY_ABILITIES", stateValue: 4 },
  promotions: {
    sourceProvenRows: immunitySourceProvenRows,
    reason: `${immunitySourceProvenRows.length} of ${immunityCandidateRows.length} finite candidates have a source/program graph route from their entry script to a moveendall/moveendto/moveendfromto handoff whose Cmd_moveend state range includes state 4. MOVE_ASSIST and MOVE_METRONOME remain explicit dynamic-dispatch exceptions. The shared two-seed Skill-Swap-staged Battle Scene OFF receipt and Tier-1 batch prove the common dispatcher semantics; no per-move oracle receipts are fabricated.`,
  },
};
const onDamageAudit = {
  status: "family-level-color-change-and-contact-promotion",
  scope: "Finite Level-50 selector audit for ABILITYEFFECT_ON_DAMAGE. Color Change and the contact family are source-proven at family level with separate ordered route/guard certificates; distinct ability outcome receipts remain explicit in the hook universe.",
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
    status: "source-program-route-witness-for-color-change-and-contact-families",
    reason: "Each Level-50 candidate is attached to one source-ordered graph/program entry block. Color Change and contact rows each carry a complete source/program route witness through a successful target datahpupdate and a state-3-capable moveend handoff; BIDE charge, Present healing, and Future Sight delayed bypasses remain explicit only where applicable.",
    moveEndTarget: onDamageMoveEndTarget,
    entryBlockShapeCounts: onDamageEntryShapeCounts,
    entries: onDamageRouteShapeRows,
  },
  colorChange: {
    status: "source-proven-family",
    selector: "moves.json power != 0",
    candidateCount: onDamageCandidatesByCategory[ON_DAMAGE_COLOR_CHANGE_CATEGORY].length,
    sourceProvenRows: colorChangeSourceProvenRows,
    sourceExceptionRows: colorChangeExceptions,
    blockers: [],
    retiredBlockers: COLOR_CHANGE_RETIRED_BLOCKERS,
    routeWitnesses: colorChangeRouteEvidenceRows,
    runtimeGuardSignature: onDamageColorChangeRuntimeGuards,
    promotions: {
      sourceProvenRows: colorChangeSourceProvenRows,
      reason: "The shared family receipt, kernel sibling tests, ordered source/program route witnesses, and selector-derived runtime guard signature support every Color Change candidate except the source-proven Future Sight delayed moveend bypass.",
    },
  },
  contact: {
    status: "source-proven-family",
    selector: "moves.json flags includes FLAG_MAKES_CONTACT",
    candidateCount: onDamageCandidatesByCategory[ON_DAMAGE_CONTACT_CATEGORY].length,
    sourceProvenRows: contactSourceProvenRows,
    sourceExceptionRows: [],
    blockers: [],
    retiredBlockers: ON_DAMAGE_BLOCKERS,
    routeWitnesses: contactRouteEvidenceRows,
    runtimeGuardSignature: onDamageContactRuntimeGuards,
    promotions: {
      sourceProvenRows: contactSourceProvenRows,
      reason: "All 94 contact candidates are promoted by independent source/program routes through positive target datahpupdate to MOVEEND_ON_DAMAGE_ABILITIES, plus the selector-derived contact/TARGET_TURN_DAMAGED guard signature and one shared Static OFF receipt with a distinct Tier-1 ability-outcome batch.",
    },
  },
  semanticEvidence: {
    kernelSiblingBatch: {
      status: "tier1-shared-dispatcher-semantics",
      implementation: "src/engine/battleScriptMoveEndOpcode.ts#AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE)",
      test: "tests/battleScriptMoveEndOpcode.test.ts#MOVEEND_ON_DAMAGE_ABILITIES contact family",
      coverage: "Color Change through Fighting and non-contact Electric/Normal moves; Rough Skin, Effect Spore, Poison Point, Static, Flame Body, Cute Charm, substitute-suppressed damage, and source-ordered RNG/state guards",
    },
    oracleReceipt: {
      status: "direct-parameterized-oracle-receipt",
      profile: "battle-scene-off",
      fixture: "tools/battle-lab/mechanic-color-change-off.json",
      probe: "tools/probe/probe-color-change-ability-off.py",
      receiptFiles: ON_DAMAGE_RETIRED_BLOCKERS[0].receipts,
      observation: "A legal target Kecleon survives real Thunderbolt damage, changes both live types Normal→Electric with gLastUsedAbility=16, emits the Color Change message, and consumes no RNG on the mutation frame in two fresh seed runs.",
      requirement: "This is the one shared family-level receipt reused by the Color Change promotion; no per-move oracle receipts are authored. Contact-family rows use a separate Static receipt and route/guard certificate.",
    },
  },
  blockers: [],
  retiredBlockers: ON_DAMAGE_RETIRED_BLOCKERS,
  promotions: {
    sourceProvenRows: colorChangeSourceProvenRows,
    reason: "Color Change rows and all 94 contact rows are promoted by separate family-level source/program route and runtime-guard evidence; the distinct contact ability outcome receipt gaps remain explicit and the unrelated ability families are not inferred.",
  },
};
const output = {
  schema: "level50-move-parameterization/v4",
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
      BATTLE_SCRIPT_CONSTANTS_PATH,
      ABILITY_CONSTANTS_PATH,
      "reference/pokeemerald/include/constants/pokemon.h",
    ],
    note: `Catalog join plus an intentionally partial source dispatcher inventory. ${records.filter((record) => record.hooks.item.status === "unsupported").length} per-move item joins and ${records.filter((record) => record.hooks.ability.status === "unsupported").length} per-move ability joins remain unsupported; the ${kingsRockSourceProvenRows.length}-row King's Rock family, the ${shellBellSourceProvenRows.length}-row Shell Bell family, exact nine Level-50 sSoundMovesTable selectors, source-proven absorbing candidates, ${contactSourceProvenRows.length} contact siblings, ${colorChangeSourceProvenRows.length} Color Change siblings, ${synchronizeSourceProvenRows.length} Synchronize status candidates, the one-row Attract/Oblivious family, the two-row Explosion/Damp family, and the ${immunitySourceProvenRows.length}-row Immunity status-cure family carry graph/program/source-handoff evidence. King's Rock retains Tickle as one explicit zero-damage exception; Shell Bell retains Future Sight as a distinct IGNORE_SHELL_BELL exception; no per-move oracle receipts are fabricated.`,
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
      itemHookCategories: sourceProvenItemRecords.length,
      abilityHookCategories: sourceProvenAbilityCategories.length,
      itemHookUnsupportedCategories: null,
      abilityHookUnsupportedCategories: null,
      itemHookUnsupportedRows: records.filter((record) => record.hooks.item.status === "unsupported").length,
      abilityHookUnsupportedRows: records.filter((record) => record.hooks.ability.status === "unsupported").length,
      abilityHookSourceProvenRows: sourceProvenAbilityRecords.length,
      itemHookSourceProvenRows: sourceProvenItemRecords.length,
    },
    hookCatalogs: {
      item: {
        frontierHeldItemRows: heldItems.count,
        explicitHoldEffectRows: holdEffects.items.length,
        moveToHookDispatchers: ITEM_HOOK_CATALOG,
        catalogedDispatcherCategories: ITEM_HOOK_CATALOG.length,
        kingsRock: kingsRockAudit,
        shellBell: shellBellAudit,
        completeness: "intentionally-partial",
        unsupportedCategories: null,
        reason: "The King's Rock flinch family is source-proven for 105 of 106 finite flag-selected rows with Tickle retained as the zero-damage exception, and the Shell Bell heal family is source-proven for 182 of 183 finite power != 0 rows with Future Sight retained as the IGNORE_SHELL_BELL exception. Choice Band, target Evasion-up accuracy, and other held-item dispatchers remain unsupported/null per move.",
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
        synchronize: synchronizeAudit,
        tryinfatuatingOblivious: tryinfatuatingObliviousAudit,
        tryexplosionDamp: tryexplosionDampAudit,
        immunity: immunityAudit,
        completeness: "intentionally-partial",
        unsupportedCategories: null,
        reason: "The exact Level-50 Soundproof moves-block family, audited absorbing dispatcher candidates, both ON_DAMAGE families, Synchronize, Attract/Oblivious, Explosion/Damp, and the 99-row Immunity status-cure family are source-proven with separate route/guard certificates. Future Sight has one explicit delayed-MOVEEND exception for Color Change only; the newer families have no candidate route exceptions or blockers, while distinct contact ability outcome gaps, accuracy, and all other ability dispatcher families remain intentionally unsupported/null per move.",
      },
    },
  },
  moves: records,
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const outputPath = join(OUTPUT_DIR, "level50-move-parameterization.json");
writeFileSync(outputPath, `${JSON.stringify(output)}\n`);
console.log(`wrote ${outputPath} (${records.length} roster moves; ${executableRecords.length} executable moves)`);
