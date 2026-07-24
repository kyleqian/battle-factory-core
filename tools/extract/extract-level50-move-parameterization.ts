// Dev-time S10 coverage join for the Level-50 Factory move corpus.  This is
// deliberately a catalog join, not a mechanics classifier: it preserves the
// source-derived move table, Battle Script labels, roster usage, animation
// dependency IDs, and only those item/ability hook families whose source
// selectors are finite and mechanical. A category means a move *could* reach
// that dispatcher when the relevant battler owns the item or ability; it never
// says that a Frontier set's active battler does own one.
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
type Program = {
  blocks: Array<{
    label: string;
    statements: Array<{
      actualOperands?: string[];
      emittedStatements?: Array<{ opcodeReferences?: Array<{ opcodeId: number }> }>;
    }>;
  }>;
};
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
const programByLabel = new Map(program.blocks.map((block) => [block.label, block]));

// These opcode IDs are the pinned B_SCR_OP_* dispatch slots. Reachability is
// deliberately conservative: it follows all named program operands, so a
// category is potential source-script reach rather than a claim that a branch
// will execute in a particular battle.
const B_SCR_OP_ATTACKCANCELER = 0;
const B_SCR_OP_ACCURACYCHECK = 1;
const B_SCR_OP_MOVEEND = 73;
function blockOpcodeIds(block: Program["blocks"][number]): number[] {
  return block.statements.flatMap((statement) => statement.emittedStatements ?? [])
    .flatMap((statement) => statement.opcodeReferences ?? [])
    .map((reference) => reference.opcodeId);
}
function reachableOpcodeIds(entryLabel: string): Set<number> {
  const pending = [entryLabel];
  const visited = new Set<string>();
  const result = new Set<number>();
  while (pending.length > 0) {
    const label = pending.pop()!;
    const block = programByLabel.get(label);
    if (!block || visited.has(label)) continue;
    visited.add(label);
    for (const opcodeId of blockOpcodeIds(block)) result.add(opcodeId);
    for (const operand of block.statements.flatMap((statement) => statement.actualOperands ?? [])) {
      if (programByLabel.has(operand)) pending.push(operand);
    }
  }
  return result;
}

const soundMovesMatch = /static const u16 sSoundMovesTable\[\]\s*=\s*\{([\s\S]*?)\};/.exec(battleUtilSource);
if (!soundMovesMatch) throw new Error("unable to locate sSoundMovesTable in battle_util.c");
const soundMoves = new Set(
  [...soundMovesMatch[1]!.matchAll(/\bMOVE_[A-Z0-9_]+\b/g)].map((match) => match[0]!).filter((move) => move !== "MOVE_NONE"),
);
if (soundMoves.size !== 10) throw new Error(`expected ten source Soundproof move selectors, got ${soundMoves.size}`);

const physicalTypes = new Set([
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND", "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL",
]);
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
  const reachableOpcodes = reachableOpcodeIds(script.entryScript);
  const attackCancelerReachable = reachableOpcodes.has(B_SCR_OP_ATTACKCANCELER);
  const accuracyReachable = reachableOpcodes.has(B_SCR_OP_ACCURACYCHECK);
  const moveEndReachable = reachableOpcodes.has(B_SCR_OP_MOVEEND);
  const itemCategories = [
    "selection-choice-band",
    ...(accuracyReachable ? ["accuracy-target-evasion-item"] : []),
    ...(moveEndReachable && move.flags.includes("FLAG_KINGS_ROCK_AFFECTED") ? ["moveend-kings-rock"] : []),
  ];
  const abilityCategories = [
    ...(attackCancelerReachable && soundMoves.has(symbol) ? ["moves-block-soundproof"] : []),
    ...(accuracyReachable && move.type === "TYPE_ELECTRIC" && move.power !== 0 ? ["absorbing-volt-absorb"] : []),
    ...(accuracyReachable && move.type === "TYPE_WATER" && move.power !== 0 ? ["absorbing-water-absorb"] : []),
    ...(accuracyReachable && move.type === "TYPE_FIRE" ? ["absorbing-flash-fire"] : []),
    ...(moveEndReachable && move.flags.includes("FLAG_MAKES_CONTACT") ? ["moveend-contact-on-damage"] : []),
    ...(moveEndReachable && move.power !== 0 ? ["moveend-color-change"] : []),
    ...(accuracyReachable ? ["accuracy-compound-eyes", "accuracy-sand-veil"] : []),
    ...(accuracyReachable && physicalTypes.has(move.type) ? ["accuracy-hustle-physical"] : []),
  ];
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
        potentialCategories: itemCategories,
        status: "source-derived-partial",
        unsupportedCategories: null,
        reason: "Potential only: active held-item ownership, branch conditions, and non-cataloged item dispatcher families are intentionally not inferred.",
      },
      ability: {
        potentialCategories: abilityCategories,
        status: "source-derived-partial",
        unsupportedCategories: null,
        reason: "Potential only: active ability ownership, battle state, and non-cataloged ability dispatcher families are intentionally not inferred.",
      },
    },
  };
});

const rosterEffects = new Set(records.map((record) => record.moveTable.effect));
const executableRecords = records.filter((record) => record.battleScript.executionInventory === "level50-executable");
const executableEffects = new Set(executableRecords.map((record) => record.moveTable.effect));
const output = {
  schema: "level50-move-parameterization/v2",
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
    note: "Catalog join plus finite source dispatcher selectors. Hook categories are potential and preserve item/ability ownership as a runtime condition; unsupported dispatcher families remain null rather than inferred from Frontier co-occurrence.",
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
      itemHookCategories: new Set(records.flatMap((record) => record.hooks.item.potentialCategories)).size,
      abilityHookCategories: new Set(records.flatMap((record) => record.hooks.ability.potentialCategories)).size,
      itemHookUnsupportedCategories: null,
      abilityHookUnsupportedCategories: null,
    },
    hookCatalogs: {
      item: {
        frontierHeldItemRows: heldItems.count,
        explicitHoldEffectRows: holdEffects.items.length,
        moveToHookDispatchers: ITEM_HOOK_CATALOG,
        unsupportedCategories: null,
        reason: "Only Choice Band selection, target Evasion-up accuracy, and King's Rock flag selectors are cataloged. Other held-item dispatchers remain null.",
      },
      ability: {
        displayRows: Object.keys(abilityDisplay.abilities).length,
        moveToHookDispatchers: ABILITY_HOOK_CATALOG,
        unsupportedCategories: null,
        reason: "Only finite Soundproof, absorber/type, contact/on-damage, and accuracy selectors are cataloged. Other ability dispatchers remain null.",
      },
    },
  },
  moves: records,
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const outputPath = join(OUTPUT_DIR, "level50-move-parameterization.json");
writeFileSync(outputPath, `${JSON.stringify(output)}\n`);
console.log(`wrote ${outputPath} (${records.length} roster moves; ${executableRecords.length} executable moves)`);
