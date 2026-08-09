// Dev-time S10 coverage join for the Level-50 Factory move corpus.  This is
// deliberately a catalog join, not a mechanics classifier: it preserves the
// source-derived move table, Battle Script labels, roster usage, animation
// dependency IDs, plus a deliberately partial catalog of source dispatcher
// families. It does not currently classify individual moves into those hook
// families: doing that honestly requires complete Battle Script control-flow
// reachability, including implicit assembly fallthrough and branch guards.
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
type GraphLabel = { name: string; line: number; statements: GraphStatement[] };
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
type Program = { blocks: Array<{ label: string; line: number; statements: ProgramStatement[] }> };
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
const ATTACK_CANCELER_MOVES_BLOCK_CALL = "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0)";

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

type HookCategory = { id: string; dispatcher: string; selector: string; ownership: string };
const ITEM_HOOK_CATALOG: HookCategory[] = [
  { id: "selection-choice-band", dispatcher: "TrySetCantSelectMoveBattleScript / CheckMoveLimitations", selector: "HOLD_EFFECT_CHOICE_BAND; any selected move slot", ownership: "attacker held item and prior choicedMove" },
  { id: "accuracy-target-evasion-item", dispatcher: "Cmd_accuracycheck", selector: "HOLD_EFFECT_EVASION_UP after an ACCURACYCHECK-reachable script path", ownership: "target held item (or target Enigma Berry effect)" },
  { id: "moveend-kings-rock", dispatcher: "Cmd_moveend ITEMEFFECT_KINGSROCK_SHELLBELL", selector: "FLAG_KINGS_ROCK_AFFECTED after a MOVEEND-reachable path", ownership: "attacker held item with HOLD_EFFECT_FLINCH" },
];
const ABILITY_HOOK_CATALOG: HookCategory[] = [
  { id: "moves-block-soundproof", dispatcher: "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK)", selector: "sSoundMovesTable after an ATTACKCANCELER-reachable path", ownership: "target ability is ABILITY_SOUNDPROOF" },
  { id: "absorbing-volt-absorb", dispatcher: "AbilityBattleEffects(ABILITYEFFECT_ABSORBING)", selector: "TYPE_ELECTRIC and power != 0 after an ACCURACYCHECK-reachable path", ownership: "target ability is ABILITY_VOLT_ABSORB" },
  { id: "absorbing-water-absorb", dispatcher: "AbilityBattleEffects(ABILITYEFFECT_ABSORBING)", selector: "TYPE_WATER and power != 0 after an ACCURACYCHECK-reachable path", ownership: "target ability is ABILITY_WATER_ABSORB" },
  { id: "absorbing-flash-fire", dispatcher: "AbilityBattleEffects(ABILITYEFFECT_ABSORBING)", selector: "TYPE_FIRE after an ACCURACYCHECK-reachable path", ownership: "target ability is ABILITY_FLASH_FIRE" },
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
  const abilityHook = soundproofPath === null
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
      supportedCategories: [SOUNDPROOF_CATEGORY],
      unsupportedCategories: null,
      reason: "Source-proven Soundproof moves-block family: this selector is in sSoundMovesTable, its exact generated Battle Script route reaches attackcanceler, and Cmd_attackcanceler calls AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK) before PP admission. This promotion does not claim unrelated ability families.",
      evidence: {
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
      },
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
const soundproofRosterRecords = records.filter((record) => record.hooks.ability.status === SOUNDPROOF_STATUS);
if (soundproofRosterRecords.length !== 9) {
  throw new Error(`expected nine Level-50 Soundproof selectors, got ${soundproofRosterRecords.length}`);
}
if (soundproofRosterRecords.some((record) => record.hooks.ability.supportedCategories.join(",") !== SOUNDPROOF_CATEGORY)) {
  throw new Error("a Soundproof roster row does not carry the exact moves-block category");
}
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
    note: "Catalog join plus an intentionally partial source dispatcher inventory. All per-move item joins and 291 per-move ability joins remain unsupported; the exact nine Level-50 sSoundMovesTable selectors carry source-proven moves-block-soundproof reachability with graph/program/source-handoff evidence.",
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
      abilityHookCategories: soundproofRosterRecords.length,
      itemHookUnsupportedCategories: null,
      abilityHookUnsupportedCategories: null,
      itemHookUnsupportedRows: records.filter((record) => record.hooks.item.status === "unsupported").length,
      abilityHookUnsupportedRows: records.filter((record) => record.hooks.ability.status === "unsupported").length,
      abilityHookSourceProvenRows: soundproofRosterRecords.length,
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
        completeness: "intentionally-partial",
        unsupportedCategories: null,
        reason: "The exact Level-50 Soundproof moves-block family is source-proven. Absorber/type, contact/on-damage, accuracy, and all other ability dispatcher families remain intentionally unsupported/null per move.",
      },
    },
  },
  moves: records,
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const outputPath = join(OUTPUT_DIR, "level50-move-parameterization.json");
writeFileSync(outputPath, `${JSON.stringify(output)}\n`);
console.log(`wrote ${outputPath} (${records.length} roster moves; ${executableRecords.length} executable moves)`);
