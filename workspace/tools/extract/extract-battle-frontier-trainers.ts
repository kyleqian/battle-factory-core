// Dev-time extractor for the ordinary 300-entry gBattleFrontierTrainers
// corpus. It expands the pinned source's trainer-mon macros, but preserves the
// original array and Easy Chat token spellings in the generated artifact.
// Run with: node --experimental-strip-types tools/extract/extract-battle-frontier-trainers.ts
// This file is deliberately never imported at runtime.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseIntDefines } from "./defines.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const OUT = join(ROOT, "src", "data", "gen", "battle-frontier-trainers.json");

function read(...parts: string[]): string {
  return readFileSync(join(REF, ...parts), "utf8");
}

function parseCInteger(value: string): number {
  return Number(value.startsWith("0x") ? Number.parseInt(value, 16) : value);
}

function parseDefines(text: string, prefix: string): Map<string, number> {
  const out = new Map<string, number>();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^#define\\s+(${escaped}[A-Za-z0-9_]+)\\s+(0x[0-9a-fA-F]+|\\d+)\\b`, "gm");
  for (const match of text.matchAll(re)) out.set(match[1]!, parseCInteger(match[2]!));
  return out;
}

function field(block: string, name: string): string {
  const match = new RegExp(`\\.${name}\\s*=\\s*([^,\\n]+)`).exec(block);
  if (!match) throw new Error(`missing .${name}`);
  return match[1]!.trim();
}

function braceBlock(text: string, openBrace: number): string {
  let depth = 0;
  for (let i = openBrace; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(openBrace + 1, i);
  }
  throw new Error("unterminated C brace block");
}

function sourceTextMap(): Map<string, string> {
  const dir = join(REF, "src", "data", "easy_chat");
  const map = new Map<string, string>();
  for (const file of readdirSync(dir).filter((name) => name.startsWith("easy_chat_group_") && name.endsWith(".h"))) {
    const text = read("src", "data", "easy_chat", file);
    const variables = new Map<string, string>();
    for (const match of text.matchAll(/const u8 (gEasyChatWord_[A-Za-z0-9_]+)\[\] = _\("([^"]*)"\);/g)) {
      variables.set(match[1]!, match[2]!);
    }
    for (const match of text.matchAll(/\[EC_INDEX\((EC_WORD_[A-Z0-9_]+)\)\][\s\S]*?\.text = (gEasyChatWord_[A-Za-z0-9_]+),/g)) {
      const value = variables.get(match[2]!);
      if (!value) throw new Error(`missing Easy Chat text ${match[2]} in ${file}`);
      map.set(match[1]!, value);
    }
  }
  return map;
}

function namedText(text: string, arrayName: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = new RegExp(`\\[(?:${arrayName === "gMoveNames" ? "MOVE" : "SPECIES"}_[A-Z0-9_]+)\\] = _\\("([^"\\n]+)"\\)`, "g");
  // The identifier is captured separately so source-derived display spellings
  // such as DOUBLESLAP and NIDORAN♀ are retained exactly.
  const full = new RegExp(`\\[(${arrayName === "gMoveNames" ? "MOVE" : "SPECIES"}_[A-Z0-9_]+)\\] = _\\("([^"\\n]+)"\\)`, "g");
  for (const match of text.matchAll(full)) map.set(match[1]!, match[2]!);
  if (map.size === 0 || re.test("")) throw new Error(`could not parse ${arrayName}`);
  return map;
}

const trainerConstants = read("include", "constants", "battle_frontier_trainers.h");
const trainerIds = parseIntDefines(trainerConstants, "FRONTIER_TRAINER_");
const trainerCountMatch = /^#define\s+FRONTIER_TRAINERS_COUNT\s+(\d+)/m.exec(trainerConstants);
if (!trainerCountMatch) throw new Error("FRONTIER_TRAINERS_COUNT not found");
const trainerCount = Number(trainerCountMatch[1]);
const monIds = parseIntDefines(read("include", "constants", "battle_frontier_mons.h"), "FRONTIER_MON_");
const facilityClasses = parseDefines(read("include", "constants", "trainers.h"), "FACILITY_CLASS_");
const highTierMatch = /^#define\s+FRONTIER_MONS_HIGH_TIER\s+(\d+)/m.exec(read("include", "constants", "battle_frontier_mons.h"));
if (!highTierMatch) throw new Error("FRONTIER_MONS_HIGH_TIER not found");
const highTier = Number(highTierMatch[1]);
const easyChatText = sourceTextMap();
const moveText = namedText(read("src", "data", "text", "move_names.h"), "gMoveNames");
const speciesText = namedText(read("src", "data", "text", "species_names.h"), "gSpeciesNames");
const trainerStructMatch = /struct BattleFrontierTrainer\s*\{([\s\S]*?)\n\};/.exec(read("include", "battle_tower.h"));
if (!trainerStructMatch) throw new Error("BattleFrontierTrainer struct not found");
const trainerStructFields = [...trainerStructMatch[1]!.matchAll(/\b(?:const\s+)?(?:u8|u16)\s*\*?\s*(\w+)(?:\[[^\]]+\])?\s*;/g)].map((match) => match[1]!);
const trainerAiFields = trainerStructFields.filter((name) => /^(?:ai|AI)/.test(name));

function easyChatWord(source: string): { source: string; text: string | null } {
  if (source === "EC_EMPTY_WORD") return { source, text: null };
  const move = /^EC_MOVE2?\(([A-Z0-9_]+)\)$/.exec(source);
  if (move) {
    const label = `MOVE_${move[1]}`;
    return { source, text: moveText.get(label) ?? null };
  }
  const pokemon = /^EC_POKEMON(?:_NATIONAL)?\(([A-Z0-9_]+)\)$/.exec(source);
  if (pokemon) {
    const label = `SPECIES_${pokemon[1]}`;
    return { source, text: speciesText.get(label) ?? null };
  }
  return { source, text: easyChatText.get(source) ?? null };
}

const trainerMonSource = read("src", "data", "battle_frontier", "battle_frontier_trainer_mons.h");
const monMacros = new Map<string, { params: string[]; body: string }>();
const macroRe = /^#define\s+(FRONTIER_MONS_[A-Z0-9_]+)(?:\(([^)]*)\))?[ \t]*\\\n([\s\S]*?)(?=^#define|^const u16)/gm;
for (const match of trainerMonSource.matchAll(macroRe)) {
  monMacros.set(match[1]!, {
    params: match[2] ? match[2].split(",").map((param) => param.trim()) : [],
    body: match[3]!,
  });
}

function expandMonToken(token: string, args: string[] = [], visiting = new Set<string>()): string[] {
  if (monIds.has(token)) return [token];
  const macro = monMacros.get(token);
  if (!macro) throw new Error(`unknown trainer-mon token ${token}`);
  const key = `${token}(${args.join(",")})`;
  if (visiting.has(key)) throw new Error(`recursive trainer-mon macro ${key}`);
  if (macro.params.length !== args.length) throw new Error(`wrong argument count for ${token}`);
  let body = macro.body;
  for (const [index, param] of macro.params.entries()) {
    body = body.replaceAll(`##${param}`, args[index]!);
    body = body.replace(new RegExp(`\\b${param}\\b`, "g"), args[index]!);
  }
  // The remaining token-paste markers join fixed suffixes such as `_1`.
  body = body.replaceAll("##", "");
  visiting.add(key);
  const expanded = expandMonExpression(body, visiting);
  visiting.delete(key);
  return expanded;
}

function expandMonExpression(expression: string, visiting = new Set<string>()): string[] {
  const withoutLineComments = expression.replace(/\/\/.*$/gm, "");
  const tokens = [...withoutLineComments.matchAll(/(FRONTIER_(?:MON|MONS)_[A-Z0-9_]+)(?:\(([^)]*)\))?/g)];
  return tokens.flatMap((match) => expandMonToken(match[1]!, match[2] ? match[2].split(",").map((arg) => arg.trim()) : [], visiting));
}

const trainerMonArrays = new Map<string, { sourceTokens: string[]; labels: string[] }>();
for (const match of trainerMonSource.matchAll(/const u16 (gBattleFrontierTrainerMons_[A-Za-z0-9_]+)\[\]\s*=\s*\{([\s\S]*?)\n\};/g)) {
  const sourceTokens = [...match[2]!.matchAll(/FRONTIER_(?:MON|MONS)_[A-Z0-9_]+(?:\([^)]*\))?/g)].map((token) => token[0]);
  trainerMonArrays.set(match[1]!, { sourceTokens, labels: expandMonExpression(match[2]!) });
}

const trainersSource = read("src", "data", "battle_frontier", "battle_frontier_trainers.h");
const declaration = "const struct BattleFrontierTrainer gBattleFrontierTrainers";
const declarationAt = trainersSource.indexOf(declaration);
if (declarationAt < 0) throw new Error("gBattleFrontierTrainers declaration not found");
const table = braceBlock(trainersSource, trainersSource.indexOf("{", declarationAt));

const entries: Array<Record<string, unknown>> = [];
for (const match of table.matchAll(/\[(FRONTIER_TRAINER_[A-Z0-9_]+)\]\s*=\s*\{/g)) {
  const sourceId = match[1]!;
  const open = match.index! + match[0].length - 1;
  const block = braceBlock(table, open);
  const id = trainerIds.get(sourceId);
  if (id === undefined) throw new Error(`unknown trainer id ${sourceId}`);
  const facilityClass = field(block, "facilityClass");
  const facilityClassId = facilityClasses.get(facilityClass);
  if (facilityClassId === undefined) throw new Error(`unknown facility class ${facilityClass}`);
  const trainerNameMatch = /\.trainerName\s*=\s*_\("([^"]+)"\)/.exec(block);
  if (!trainerNameMatch) throw new Error(`missing trainerName for ${sourceId}`);
  const speeches = Object.fromEntries(["speechBefore", "speechWin", "speechLose"].map((name) => {
    const match = new RegExp(`\\.${name}\\s*=\\s*\\{([^}]*)\\}`).exec(block);
    if (!match) throw new Error(`missing ${name} for ${sourceId}`);
    return [name, match[1]!.split(",").map((word) => easyChatWord(word.trim()))];
  }));
  const monSet = field(block, "monSet");
  const monArray = trainerMonArrays.get(monSet);
  if (!monArray) throw new Error(`missing mon array ${monSet}`);
  const eligibleMonSetIds = monArray.labels.map((label) => {
    const value = monIds.get(label);
    if (value === undefined) throw new Error(`unknown frontier mon ${label}`);
    return value;
  });
  entries.push({
    id,
    sourceId,
    facilityClass: { source: facilityClass, id: facilityClassId },
    name: trainerNameMatch[1],
    speeches,
    monSet: {
      source: monSet,
      sourceTokens: monArray.sourceTokens,
      eligibleMonSetLabels: monArray.labels,
      eligibleMonSetIds,
      eligibleRange: { min: Math.min(...eligibleMonSetIds), max: Math.max(...eligibleMonSetIds) },
      level50EligibleIds: eligibleMonSetIds.filter((id) => id <= highTier),
    },
    // BattleFrontierTrainer has no AI flag or AI field. Its only behavior-
    // adjacent source field is facilityClass; retain an explicit empty list
    // rather than inventing an AI profile from unrelated battle code.
    aiFlags: [],
  });
}

entries.sort((a, b) => (a.id as number) - (b.id as number));
if (entries.length !== trainerCount || entries.some((entry, id) => entry.id !== id)) {
  throw new Error(`expected indexed ordinary trainer corpus 0..${trainerCount - 1}, got ${entries.length}`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  count: entries.length,
  level50: { maximumEligibleMonSetId: highTier, eligibleMonSetCount: highTier + 1, source: "FRONTIER_MONS_HIGH_TIER" },
  sourceStruct: {
    name: "BattleFrontierTrainer",
    fields: trainerStructFields,
    aiFields: trainerAiFields,
    aiNote: "The pinned struct declares no AI flags or AI fields; facilityClass is retained per trainer.",
  },
  entries,
})}\n`);
console.log(`wrote ${OUT} (${entries.length} trainers)`);
