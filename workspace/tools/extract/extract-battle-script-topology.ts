// Dev-time extractor for the source topology that connects BattleMove.effect
// values to their BattleScript entry labels and script-byte opcodes to their
// Cmd_* dispatchers. This intentionally records every indexed source row: a
// shared BattleScript label is evidence of a source alias, not a cue to
// deduplicate rows. It is topology groundwork only; it does not decode script
// operands or model any battle behavior.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-script-topology.ts
//   node --experimental-strip-types tools/extract/extract-moves.ts --out-dir /tmp/topology
//   node --experimental-strip-types tools/extract/extract-battle-script-topology.ts --out-dir /tmp/topology
//
// Never imported at runtime - the production build only reads generated JSON.

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

const effectConstants = readFileSync(join(REF, "include", "constants", "battle_move_effects.h"), "utf8");
const opcodeConstants = readFileSync(join(REF, "include", "constants", "battle_script_commands.h"), "utf8");
const effectScripts = readFileSync(join(REF, "data", "battle_scripts_1.s"), "utf8");
const commandDispatch = readFileSync(join(REF, "src", "battle_script_commands.c"), "utf8");

type Effect = { id: number; effect: string; entryScript: string };
type Opcode = { id: number; opcode: string; dispatcher: string };
type Move = { id: number; move: string; effect: string };
type InventoryMove = Move & { frontierMonCount: number; speciesCount: number; exampleMons: string[] };

function parseEffects(): Array<{ id: number; effect: string }> {
  const effects = [...effectConstants.matchAll(/^#define\s+(EFFECT_[A-Z0-9_]+)\s+(\d+)\b/gm)]
    .map(([, effect, id]) => ({ effect: effect!, id: Number(id) }))
    .sort((a, b) => a.id - b.id);
  const count = /^#define\s+NUM_BATTLE_MOVE_EFFECTS\s+(\d+)$/m.exec(effectConstants);
  if (!count) throw new Error("NUM_BATTLE_MOVE_EFFECTS missing");
  if (effects.length !== Number(count[1])) throw new Error(`expected ${count[1]} EFFECT constants, found ${effects.length}`);
  for (const [id, effect] of effects.entries()) {
    if (effect.id !== id) throw new Error(`non-contiguous effect id ${effect.effect}: ${effect.id} at index ${id}`);
  }
  return effects;
}

function parseEffectEntryScripts(): string[] {
  const table = /gBattleScriptsForMoveEffects::\n([\s\S]*?)\n\n/.exec(effectScripts);
  if (!table) throw new Error("gBattleScriptsForMoveEffects table missing");
  const entries = [...table[1]!.matchAll(/^\s*\.4byte\s+(BattleScript_[A-Za-z0-9_]+)\s+@\s+EFFECT_[A-Z0-9_]+\s*$/gm)]
    .map(([, label]) => label!);
  if (entries.length === 0) throw new Error("gBattleScriptsForMoveEffects has no entries");
  return entries;
}

function parseOpcodes(): string[] {
  const enumBody = /enum BattleScriptOpcode\s*\{([\s\S]*?)\n\};/.exec(opcodeConstants);
  if (!enumBody) throw new Error("BattleScriptOpcode enum missing");
  const entries = [...enumBody[1]!.matchAll(/^\s*(B_SCR_OP_[A-Z0-9_]+),\s*$/gm)].map(([, opcode]) => opcode!);
  if (entries.length === 0) throw new Error("BattleScriptOpcode enum has no entries");
  return entries;
}

function parseDispatchers(): Map<string, string> {
  const table = /void \(\*const gBattleScriptingCommandsTable\[\]\)\(void\)\s*=\s*\{([\s\S]*?)\n\};/.exec(commandDispatch);
  if (!table) throw new Error("gBattleScriptingCommandsTable missing");
  const dispatchers = new Map(
    [...table[1]!.matchAll(/\[(B_SCR_OP_[A-Z0-9_]+)\]\s*=\s*(Cmd_[A-Za-z0-9_]+)/g)]
      .map(([, opcode, dispatcher]) => [opcode!, dispatcher!] as const),
  );
  if (dispatchers.size === 0) throw new Error("gBattleScriptingCommandsTable has no dispatchers");
  return dispatchers;
}

const effectsById = parseEffects();
const effectEntryScripts = parseEffectEntryScripts();
if (effectEntryScripts.length !== effectsById.length) {
  throw new Error(`effect table has ${effectEntryScripts.length} entries for ${effectsById.length} EFFECT constants`);
}
const effects: Effect[] = effectsById.map((effect, id) => ({ ...effect, entryScript: effectEntryScripts[id]! }));
const effectByName = new Map(effects.map((effect) => [effect.effect, effect]));

const opcodeNames = parseOpcodes();
const dispatchers = parseDispatchers();
if (dispatchers.size !== opcodeNames.length) {
  throw new Error(`dispatcher table has ${dispatchers.size} entries for ${opcodeNames.length} BattleScriptOpcode values`);
}
const opcodes: Opcode[] = opcodeNames.map((opcode, id) => {
  const dispatcher = dispatchers.get(opcode);
  if (!dispatcher) throw new Error(`no dispatcher for ${opcode}`);
  return { id, opcode, dispatcher };
});
for (const opcode of dispatchers.keys()) {
  if (!opcodeNames.includes(opcode)) throw new Error(`dispatcher table has non-enum opcode ${opcode}`);
}

const moves = (JSON.parse(readFileSync(join(DATA_GEN, "moves.json"), "utf8")) as { moves: Move[] }).moves;
if (moves.length !== 355) throw new Error(`expected 355 generated moves, found ${moves.length}`);
const moveTopology = moves.map((move, id) => {
  if (move.id !== id) throw new Error(`move ${move.move} has id ${move.id} at index ${id}`);
  const effect = effectByName.get(move.effect);
  if (!effect) throw new Error(`move ${move.move} references unknown ${move.effect}`);
  return { id: move.id, move: move.move, effectId: effect.id, effect: effect.effect, entryScript: effect.entryScript };
});

const inventory = JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "factory-animation-inventory.json"), "utf8")) as {
  tiers: { level50: { moves: InventoryMove[] } };
};
const level50Moves = inventory.tiers.level50.moves;
const level50MoveIds = new Set(level50Moves.map((move) => move.id));
if (level50MoveIds.size !== level50Moves.length) throw new Error("Level-50 Factory inventory repeats a move id");
const level50FactoryReachableEffects = effects
  .map((effect) => ({
    ...effect,
    moves: level50Moves
      .filter((move) => move.effect === effect.effect)
      .map((move) => ({
        id: move.id,
        move: move.move,
        effect: move.effect,
        frontierMonCount: move.frontierMonCount,
        speciesCount: move.speciesCount,
      })),
  }))
  .filter((family) => family.moves.length > 0);

const topology = {
  schema: "battle-script-topology/v1",
  source: {
    files: [
      "include/constants/battle_move_effects.h",
      "data/battle_scripts_1.s",
      "include/constants/battle_script_commands.h",
      "src/battle_script_commands.c",
      "src/data/gen/moves.json",
      "src/data/gen/factory-animation-inventory.json",
    ],
    note: "Indexed source aliases are preserved row-for-row. This artifact maps labels and dispatchers only; it does not decode Battle Script operands or define mechanics.",
  },
  counts: {
    effects: effects.length,
    opcodes: opcodes.length,
    moves: moveTopology.length,
    level50FactoryReachableMoves: level50Moves.length,
    level50FactoryReachableEffectFamilies: level50FactoryReachableEffects.length,
  },
  effects,
  opcodes,
  moves: moveTopology,
  level50FactoryReachableEffects,
};

mkdirSync(DATA_GEN, { recursive: true });
const output = join(DATA_GEN, "battle-script-topology.json");
writeFileSync(output, `${JSON.stringify(topology)}\n`);
console.log(`wrote ${output} (${effects.length} effects, ${opcodes.length} opcodes, ${moveTopology.length} moves)`);
