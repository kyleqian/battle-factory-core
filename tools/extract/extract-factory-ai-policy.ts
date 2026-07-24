// Dev-time extractor for Battle Factory's contextual AI-script selection.
// The Factory battle path deliberately does not read gBattleFrontierTrainers
// for AI flags: BattleAI_SetupAIData dispatches BATTLE_TYPE_FACTORY to
// GetAiScriptsInBattleFactory(), whose inputs are the challenge state and
// Frontier Brain sentinel. Run with:
//   node --experimental-strip-types tools/extract/extract-factory-ai-policy.ts
// or pass --out <path> to write a reproducibility candidate.
// Never imported at runtime.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const defaultOutput = join(ROOT, "src", "data", "gen", "factory-ai-policy.json");
const outArg = process.argv.indexOf("--out");
if (outArg !== -1 && !process.argv[outArg + 1]) throw new Error("--out needs a path");
const OUTPUT = outArg === -1 ? defaultOutput : resolve(process.argv[outArg + 1]!);

function read(...parts: string[]): string {
  return readFileSync(join(REF, ...parts), "utf8");
}

function requiredNumber(text: string, name: string): number {
  const match = new RegExp(`^#define\\s+${name}\\s+(\\d+)\\s*$`, "m").exec(text);
  if (!match) throw new Error(`missing numeric #define ${name}`);
  return Number(match[1]);
}

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`u32 ${name}(void)`);
  if (start < 0) throw new Error(`could not find ${name}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") depth++;
    else if (source[index] === "}" && --depth === 0) return source.slice(open + 1, index);
  }
  throw new Error(`unterminated ${name}`);
}

const aiConstants = read("include", "constants", "battle_ai.h");
const flags = [...aiConstants.matchAll(/^#define\s+(AI_SCRIPT_[A-Z0-9_]+)\s+\(1\s*<<\s*(\d+)\)\s*$/gm)]
  .map((match) => ({ name: match[1]!, bit: Number(match[2]), mask: 2 ** Number(match[2]) }))
  .sort((left, right) => left.bit - right.bit);
if (flags.length !== 13) throw new Error(`expected 13 AI_SCRIPT flags, got ${flags.length}`);
const flagByName = new Map(flags.map((flag) => [flag.name, flag]));

function returnValue(expression: string): { flags: string[]; mask: number } {
  if (expression.trim() === "0") return { flags: [], mask: 0 };
  const names = expression.split("|").map((name) => name.trim());
  let mask = 0;
  for (const name of names) {
    const flag = flagByName.get(name);
    if (!flag) throw new Error(`unknown AI script flag ${name}`);
    mask += flag.mask;
  }
  return { flags: names, mask };
}

const factoryC = read("src", "battle_factory.c");
const selector = functionBody(factoryC, "GetAiScriptsInBattleFactory");
const branchPatterns = [
  { id: "tent", condition: "lvlMode == FRONTIER_LVL_TENT", pattern: /if \(lvlMode == FRONTIER_LVL_TENT\)\s*\{\s*return ([^;]+);/ },
  { id: "frontierBrain", condition: "gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN", pattern: /if \(gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN\)\s*return ([^;]+);/ },
  { id: "challengeBelow2", condition: "challengeNum < 2", pattern: /else if \(challengeNum < 2\)\s*return ([^;]+);/ },
  { id: "challengeBelow4", condition: "challengeNum < 4", pattern: /else if \(challengeNum < 4\)\s*return ([^;]+);/ },
  { id: "challengeAtLeast4", condition: "else", pattern: /else\s*return ([^;]+);/ },
] as const;
const branches = branchPatterns.map((branch, index) => {
  const match = branch.pattern.exec(selector);
  if (!match) throw new Error(`missing Factory AI branch ${branch.id}`);
  return { order: index, id: branch.id, condition: branch.condition, ...returnValue(match[1]!) };
});

const battleAiCommands = read("src", "battle_ai_script_commands.c");
if (!/else if \(gBattleTypeFlags & BATTLE_TYPE_FACTORY\)\s*\n\s*AI_THINKING_STRUCT->aiFlags = GetAiScriptsInBattleFactory\(\);/.test(battleAiCommands)) {
  throw new Error("BATTLE_TYPE_FACTORY no longer dispatches to GetAiScriptsInBattleFactory");
}

const frontierConstants = read("include", "constants", "battle_frontier.h");
const policy = {
  schema: "factory-ai-policy/v1",
  source: {
    files: [
      "include/constants/battle_ai.h",
      "include/constants/battle_frontier.h",
      "src/battle_factory.c",
      "src/battle_ai_script_commands.c",
    ],
    anchors: {
      factoryDispatch: "src/battle_ai_script_commands.c:369-370 BATTLE_TYPE_FACTORY -> GetAiScriptsInBattleFactory",
      selector: "src/battle_factory.c:889-912 GetAiScriptsInBattleFactory",
    },
  },
  constants: {
    frontierStagesPerChallenge: requiredNumber(frontierConstants, "FRONTIER_STAGES_PER_CHALLENGE"),
    challengeNumber: "factoryWinStreaks[battleMode][lvlMode] / FRONTIER_STAGES_PER_CHALLENGE",
    aiScriptFlags: flags,
  },
  context: {
    dispatch: "BATTLE_TYPE_FACTORY",
    selector: "GetAiScriptsInBattleFactory",
    ordinaryTrainerRows: "not consulted for Factory AI flags",
    inputs: [
      "gSaveBlock2Ptr->frontier.lvlMode",
      "VarGet(VAR_FRONTIER_BATTLE_MODE)",
      "gSaveBlock2Ptr->frontier.factoryWinStreaks[battleMode][lvlMode]",
      "gTrainerBattleOpponent_A",
    ],
  },
  branches,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(policy)}\n`);
console.log(`wrote ${OUTPUT}`);
