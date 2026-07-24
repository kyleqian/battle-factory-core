// Dev-time S10 coverage join for the Level-50 Factory move corpus.  This is
// deliberately a catalog join, not a mechanics classifier: it preserves the
// source-derived move table, Battle Script labels, roster usage, and animation
// dependency IDs without inferring which item or ability hooks apply.
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
type Graph = { labels: Array<{ name: string }> };
type Program = { blocks: Array<{ label: string }> };
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

if (moves.length !== 355 || moves.some((move, id) => move.id !== id)) throw new Error("moves.json must be the complete indexed move table");
if (frontierSets.count !== 882 || frontierSets.entries.length !== 882) throw new Error("expected all 882 Frontier set rows");
const level50Sets = frontierSets.entries.filter((set) => set.index >= 0 && set.index <= 849);
if (level50Sets.length !== 850 || level50Sets.some((set, id) => set.index !== id)) throw new Error("Level-50 set boundary must be indexes 0..849");

const moveBySymbol = new Map(moves.map((move) => [move.move, move]));
const topologyByMove = new Map(topology.moves.map((move) => [move.move, move]));
const graphLabels = new Set(graph.labels.map((label) => label.name));
const programLabels = new Set(program.blocks.map((block) => block.label));
const executionInventoryByMove = new Map(inventory.tiers.level50.moves.map((move) => [move.move, move]));
const animationByMove = new Map(animationComponents.moves.map((move) => [move.move, move]));

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
        category: null,
        status: "not-yet-extracted",
        reason: "Current generated item catalogs join hold effects to Frontier sets, not move effects; no source-derived move-to-item hook dispatcher is cataloged.",
      },
      ability: {
        category: null,
        status: "not-yet-extracted",
        reason: "Current generated ability data contains display/species facts, not a source-derived move-to-ability hook dispatcher or family mapping.",
      },
    },
  };
});

const rosterEffects = new Set(records.map((record) => record.moveTable.effect));
const executableRecords = records.filter((record) => record.battleScript.executionInventory === "level50-executable");
const executableEffects = new Set(executableRecords.map((record) => record.moveTable.effect));
const output = {
  schema: "level50-move-parameterization/v1",
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
    ],
    note: "Catalog join only. Null hook categories deliberately record missing source-derived move-to-item/ability dispatch joins rather than inferring semantics from co-occurrence.",
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
      abilityHookCategories: 0,
      itemHookNullReason: "not-yet-extracted/move-to-item-hook-dispatcher",
      abilityHookNullReason: "not-yet-extracted/move-to-ability-hook-dispatcher",
    },
    hookCatalogs: {
      item: {
        frontierHeldItemRows: heldItems.count,
        explicitHoldEffectRows: holdEffects.items.length,
        moveToHookDispatcher: null,
        reason: "Existing item catalogs provide exact per-item hold effects, but no source-derived move-to-item hook dispatcher/category join.",
      },
      ability: {
        displayRows: Object.keys(abilityDisplay.abilities).length,
        moveToHookDispatcher: null,
        reason: "Existing ability display rows do not provide a source-derived move-to-ability hook dispatcher/category join.",
      },
    },
  },
  moves: records,
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const outputPath = join(OUTPUT_DIR, "level50-move-parameterization.json");
writeFileSync(outputPath, `${JSON.stringify(output)}\n`);
console.log(`wrote ${outputPath} (${records.length} roster moves; ${executableRecords.length} executable moves)`);
