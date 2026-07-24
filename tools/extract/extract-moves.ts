// Dev-time extractor: all gen-3 move data the Summary screen's Battle-Moves
// and Contest-Moves pages show - name, type, PP, power, accuracy, battle
// description text, and the contest-move data (category, appeal, jam) -
// plus (S7 groundwork) the battle-engine fields turn resolution needs:
// effect, secondaryEffectChance, target, priority, flags (see
// docs/battle-turn-notes.md). See docs/summary-screen-notes.md section 3
// (MOVE_NAMES/MOVE_PP/MOVE_DESCRIPTION windows, PrintMoveDetails/
// PrintContestMoveDescription) and section 2's window table. Sources:
//   include/constants/moves.h      - MOVE_x ids, MOVES_COUNT
//   include/constants/battle_move_effects.h - EFFECT_x ids
//   include/battle.h               - MOVE_TARGET_x bit flags
//   include/constants/pokemon.h    - FLAG_x move-flag bits
//   src/data/battle_moves.h        - gBattleMoves (full struct BattleMove)
//   src/data/text/move_names.h     - gMoveNames
//   src/data/text/move_descriptions.h - gMoveDescriptionPointers text
//   src/data/contest_moves.h       - gContestMoves + gContestEffects
// Run with:
//   node --experimental-strip-types tools/extract/extract-moves.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(DATA_GEN, { recursive: true });

const movesConstantsH = readFileSync(join(REF, "include", "constants", "moves.h"), "utf8");
const battleMovesC = readFileSync(join(REF, "src", "data", "battle_moves.h"), "utf8");
const moveNamesC = readFileSync(join(REF, "src", "data", "text", "move_names.h"), "utf8");
const moveDescriptionsC = readFileSync(join(REF, "src", "data", "text", "move_descriptions.h"), "utf8");
const contestMovesC = readFileSync(join(REF, "src", "data", "contest_moves.h"), "utf8");
const contestTextTablesC = readFileSync(join(REF, "src", "data", "contest_text_tables.h"), "utf8");
const contestStringsC = readFileSync(join(REF, "data", "text", "contest_strings.inc"), "utf8");

// C string literal -> JS string: this codebase's move/ability description
// text uses only the "\n" line-break escape (verified: no other backslash
// escapes appear in move_descriptions.h) - decode it to a real newline so
// the JSON carries the actual line-break the text renderer would draw.
function unescapeCString(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

// MOVES_COUNT = 355 (MOVE_NONE=0 .. MOVE_PSYCHO_BOOST=354) - anchored to
// end-of-line so it doesn't also match MOVE_UNAVAILABLE's hex value.
function parseMovesCount(): number {
  const m = /^#define MOVES_COUNT (\d+)$/m.exec(movesConstantsH);
  if (!m) throw new Error("MOVES_COUNT not found in constants/moves.h");
  return Number.parseInt(m[1]!, 10);
}
const MOVES_COUNT = parseMovesCount();

function parseMoveIds(): Map<string, number> {
  const ids = new Map<string, number>();
  for (const m of movesConstantsH.matchAll(/^#define MOVE_(\w+) (\d+)$/gm)) {
    ids.set(m[1]!, Number.parseInt(m[2]!, 10));
  }
  return ids;
}
const moveIds = parseMoveIds();

type BattleMoveData = {
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

// gBattleMoves[MOVE_x] = { .effect = ..., .power = ..., .type = ...,
// .accuracy = ..., .pp = ..., .secondaryEffectChance = ..., .target = ...,
// .priority = ..., .flags = ... }, - MOVE_NONE is written in the same
// multi-line brace form as every other entry (no single-line special case).
// .target and .flags are bitwise-OR'd C constant names (or literal 0 for
// "none") - kept as the named-constant list rather than resolved to a
// numeric bitmask, so this stays pure source-shape data with no engine-side
// bit-layout assumption baked in.
function parseBattleMoves(): Map<string, BattleMoveData> {
  const out = new Map<string, BattleMoveData>();
  for (const m of battleMovesC.matchAll(/\[MOVE_(\w+)\]\s*=\s*\{\n([\s\S]*?)\n {4}\},?/g)) {
    const [, name, body] = m as unknown as [string, string, string];
    const type = /\.type\s*=\s*(TYPE_\w+)/.exec(body);
    const power = /\.power\s*=\s*(\d+)/.exec(body);
    const accuracy = /\.accuracy\s*=\s*(\d+)/.exec(body);
    const pp = /\.pp\s*=\s*(\d+)/.exec(body);
    const effect = /\.effect\s*=\s*EFFECT_(\w+)/.exec(body);
    const secondaryEffectChance = /\.secondaryEffectChance\s*=\s*(\d+)/.exec(body);
    const target = /\.target\s*=\s*([\w\s|]+?),?\n/.exec(body);
    const priority = /\.priority\s*=\s*(-?\d+)/.exec(body);
    const flags = /\.flags\s*=\s*([\w\s|]+?),?\n?$/.exec(body);
    if (!type || !power || !accuracy || !pp || !effect || !secondaryEffectChance || !target || !priority || !flags)
      throw new Error(`incomplete gBattleMoves entry for MOVE_${name}`);
    const targetNames = target[1]!.trim() === "0" ? [] : target[1]!.split("|").map((x) => x.trim());
    const flagNames = flags[1]!.trim() === "0" ? [] : flags[1]!.trim().split("|").map((x) => x.trim());
    out.set(name, {
      type: type[1]!,
      power: Number.parseInt(power[1]!, 10),
      accuracy: Number.parseInt(accuracy[1]!, 10),
      pp: Number.parseInt(pp[1]!, 10),
      effect: `EFFECT_${effect[1]!}`,
      secondaryEffectChance: Number.parseInt(secondaryEffectChance[1]!, 10),
      target: targetNames,
      priority: Number.parseInt(priority[1]!, 10),
      flags: flagNames,
    });
  }
  return out;
}
const battleMoves = parseBattleMoves();

function parseMoveNames(): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of moveNamesC.matchAll(/\[MOVE_(\w+)\]\s*=\s*_\("([^"]*)"\)/g)) {
    out.set(m[1]!, unescapeCString(m[2]!));
  }
  return out;
}
const moveNames = parseMoveNames();

// static const u8 sXDescription[] = _("..." "...");  then later
// gMoveDescriptionPointers[MOVE_x - 1] = sXDescription, - resolve the
// pointer indirection to get each move's actual description text.
function parseMoveDescriptions(): Map<string, string> {
  const varText = new Map<string, string>();
  for (const m of moveDescriptionsC.matchAll(/static const u8 (\w+)\[\]\s*=\s*_\(([\s\S]*?)\);/g)) {
    const [, varName, body] = m as unknown as [string, string, string];
    const parts = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]!);
    varText.set(varName, unescapeCString(parts.join("")));
  }
  const out = new Map<string, string>();
  for (const m of moveDescriptionsC.matchAll(/\[MOVE_(\w+) - 1\]\s*=\s*(\w+),/g)) {
    const [, name, varName] = m as unknown as [string, string, string];
    const text = varText.get(varName);
    if (text === undefined) throw new Error(`description var ${varName} not found for MOVE_${name}`);
    out.set(name, text);
  }
  return out;
}
const moveDescriptions = parseMoveDescriptions();

// gContestEffects[CONTEST_EFFECT_x] = { .effectType = ..., .appeal = N, .jam = N },
function parseContestEffects(): Map<string, { appeal: number; jam: number }> {
  const out = new Map<string, { appeal: number; jam: number }>();
  const tableStart = contestMovesC.indexOf("const struct ContestEffect gContestEffects[]");
  if (tableStart < 0) throw new Error("gContestEffects table not found in contest_moves.h");
  for (const m of contestMovesC.slice(tableStart).matchAll(/\[CONTEST_EFFECT_(\w+)\]\s*=\s*\{\n([\s\S]*?)\n {4}\},?/g)) {
    const [, name, body] = m as unknown as [string, string, string];
    const appeal = /\.appeal\s*=\s*(\d+)/.exec(body);
    const jam = /\.jam\s*=\s*(\d+)/.exec(body);
    if (!appeal || !jam) throw new Error(`incomplete gContestEffects entry for CONTEST_EFFECT_${name}`);
    out.set(name, { appeal: Number.parseInt(appeal[1]!, 10), jam: Number.parseInt(jam[1]!, 10) });
  }
  return out;
}
const contestEffects = parseContestEffects();

function parseContestEffectDescriptions(): Map<string, string> {
  const strings = new Map<string, string>();
  for (const m of contestStringsC.matchAll(/^(\w+)::\n((?:\t\.string .*\n)+)/gm)) {
    const [, label, body] = m as unknown as [string, string, string];
    const parts = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((part) => part[1]!);
    strings.set(label, unescapeCString(parts.join("")).replace(/\$$/, ""));
  }

  const out = new Map<string, string>();
  for (const m of contestTextTablesC.matchAll(
    /\[CONTEST_EFFECT_(\w+)\]\s*=\s*(gText_\w+)/g,
  )) {
    const description = strings.get(m[2]!);
    if (description === undefined) {
      throw new Error(`contest description ${m[2]} not found for CONTEST_EFFECT_${m[1]}`);
    }
    out.set(m[1]!, description);
  }
  return out;
}
const contestEffectDescriptions = parseContestEffectDescriptions();

// gContestMoves[MOVE_x] = { .effect = CONTEST_EFFECT_y, .contestCategory =
// CONTEST_CATEGORY_z, ... }, - MOVE_NONE is the sole "{0}," single-line
// placeholder (no real contest data), skipped.
function parseContestMoves(): Map<string, {
  category: string;
  appeal: number;
  jam: number;
  effect: string;
  description: string;
}> {
  const out = new Map<string, {
    category: string;
    appeal: number;
    jam: number;
    effect: string;
    description: string;
  }>();
  const tableEnd = contestMovesC.indexOf("const struct ContestEffect gContestEffects[]");
  const movesPart = tableEnd >= 0 ? contestMovesC.slice(0, tableEnd) : contestMovesC;
  for (const m of movesPart.matchAll(/\[MOVE_(\w+)\]\s*=\s*\{\n([\s\S]*?)\n {4}\},?/g)) {
    const [, name, body] = m as unknown as [string, string, string];
    const category = /\.contestCategory\s*=\s*(CONTEST_CATEGORY_\w+)/.exec(body);
    const effect = /\.effect\s*=\s*(CONTEST_EFFECT_\w+)/.exec(body);
    if (!category || !effect) throw new Error(`incomplete gContestMoves entry for MOVE_${name}`);
    const effectName = effect[1]!.slice("CONTEST_EFFECT_".length);
    const effectData = contestEffects.get(effectName);
    if (!effectData) throw new Error(`no gContestEffects entry for ${effect[1]} (MOVE_${name})`);
    const description = contestEffectDescriptions.get(effectName);
    if (!description) throw new Error(`no contest effect description for ${effect[1]} (MOVE_${name})`);
    out.set(name, {
      category: category[1]!,
      appeal: effectData.appeal,
      jam: effectData.jam,
      effect: effect[1]!,
      description,
    });
  }
  return out;
}
const contestMoves = parseContestMoves();

const orderedMoveNames = [...moveIds.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);
if (orderedMoveNames.length !== MOVES_COUNT) {
  throw new Error(`expected ${MOVES_COUNT} moves from constants/moves.h, found ${orderedMoveNames.length}`);
}

const moves = orderedMoveNames.map((name) => {
  const battle = battleMoves.get(name);
  const displayName = moveNames.get(name);
  if (!battle) throw new Error(`no gBattleMoves entry for MOVE_${name}`);
  if (displayName === undefined) throw new Error(`no gMoveNames entry for MOVE_${name}`);
  const isNone = name === "NONE";
  return {
    move: `MOVE_${name}`,
    id: moveIds.get(name)!,
    name: displayName,
    type: battle.type,
    power: battle.power,
    accuracy: battle.accuracy,
    pp: battle.pp,
    effect: battle.effect,
    secondaryEffectChance: battle.secondaryEffectChance,
    target: battle.target,
    priority: battle.priority,
    flags: battle.flags,
    description: isNone ? "" : (moveDescriptions.get(name) ?? ""),
    contest: isNone ? null : (contestMoves.get(name) ?? null),
  };
});

for (const move of moves) {
  if (move.move !== "MOVE_NONE" && !move.description) throw new Error(`missing description for ${move.move}`);
  if (move.move !== "MOVE_NONE" && !move.contest) throw new Error(`missing contest data for ${move.move}`);
}

writeFileSync(join(DATA_GEN, "moves.json"), `${JSON.stringify({ moves }, null, 0)}\n`);
console.log(`wrote ${join(DATA_GEN, "moves.json")} (${moves.length} moves)`);
