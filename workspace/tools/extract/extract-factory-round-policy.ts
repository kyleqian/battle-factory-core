// Dev-time extractor for the source-derived Battle Factory round-policy
// constants. Run with:
//   node --experimental-strip-types tools/extract/extract-factory-round-policy.ts
// or pass `--out <path>` for a byte-for-byte reproducibility check.
//
// Never imported at runtime: the production app only consumes the committed
// JSON artifact, when the round controller is ready to do so.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseIntDefines } from "./defines.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const defaultOutput = join(RUN_ROOT, "src", "data", "gen", "factory-round-policy.json");
const outputArg = process.argv.indexOf("--out");
if (outputArg !== -1 && !process.argv[outputArg + 1]) throw new Error("--out needs a path");
const OUTPUT = outputArg === -1 ? defaultOutput : resolve(process.argv[outputArg + 1]!);

function ref(...parts: string[]): string {
  return readFileSync(join(REF, ...parts), "utf8");
}

function requiredNumber(text: string, name: string): number {
  const match = new RegExp(`^#define\\s+${name}\\s+(\\d+)`, "m").exec(text);
  if (!match) throw new Error(`missing numeric #define ${name}`);
  return Number(match[1]);
}

function sourceTable(source: string, name: string): string {
  const match = new RegExp(`static const [^{;]+\\s${name}\\[\\]\\[2\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`).exec(source);
  if (!match) throw new Error(`could not locate ${name}`);
  return match[1]!;
}

type Range = { start: number; end: number; startLabel: string; endLabel: string };

function parseRanges(body: string, resolveSymbol: (label: string) => number): Range[] {
  const ranges: Range[] = [];
  const lineRe = /\{\s*([A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)(\s*-\s*1)?\s*\}/g;
  for (const match of body.matchAll(lineRe)) {
    const [, startLabel, endLabel, minusOne] = match;
    if (!startLabel || !endLabel) continue;
    ranges.push({ start: resolveSymbol(startLabel), end: resolveSymbol(endLabel) - (minusOne ? 1 : 0), startLabel, endLabel });
  }
  return ranges;
}

const factoryC = ref("src", "battle_factory.c");
const towerC = ref("src", "battle_tower.c");
const globalConstants = ref("include", "constants", "global.h");
const frontierConstants = ref("include", "constants", "battle_frontier.h");
const monConstantsText = ref("include", "constants", "battle_frontier_mons.h");
const trainerConstantsText = ref("include", "constants", "battle_frontier_trainers.h");
const factoryConstants = ref("include", "constants", "battle_factory.h");

const monConstants = parseIntDefines(monConstantsText, "FRONTIER_MON_");
const trainerConstants = parseIntDefines(trainerConstantsText, "FRONTIER_TRAINER_");
const numFrontierMons = requiredNumber(monConstantsText, "NUM_FRONTIER_MONS");
const highTier = requiredNumber(monConstantsText, "FRONTIER_MONS_HIGH_TIER");
const stagesPerChallenge = requiredNumber(frontierConstants, "FRONTIER_STAGES_PER_CHALLENGE");
const partySize = requiredNumber(globalConstants, "FRONTIER_PARTY_SIZE");
const selectableMons = requiredNumber(ref("src", "battle_factory_screen.c"), "SELECTABLE_MONS_COUNT");
const maxStreak = requiredNumber(frontierConstants, "MAX_STREAK");

const monValue = (label: string): number => {
  if (label === "NUM_FRONTIER_MONS") return numFrontierMons;
  if (label === "FRONTIER_MONS_HIGH_TIER") return highTier;
  const value = monConstants.get(label);
  if (value === undefined) throw new Error(`unknown frontier-mon label ${label}`);
  return value;
};
const trainerValue = (label: string): number => {
  const value = trainerConstants.get(label);
  if (value === undefined) throw new Error(`unknown frontier-trainer label ${label}`);
  return value;
};

const rentalRanges = parseRanges(sourceTable(factoryC, "sInitialRentalMonRanges"), monValue);
if (rentalRanges.length !== 16) throw new Error(`expected 16 rental ranges, got ${rentalRanges.length}`);
const trainerRanges = parseRanges(sourceTable(towerC, "sFrontierTrainerIdRanges"), trainerValue);
const hardTrainerRanges = parseRanges(sourceTable(towerC, "sFrontierTrainerIdRangesHard"), trainerValue);
if (trainerRanges.length !== 8 || hardTrainerRanges.length !== 8) throw new Error("expected eight normal/hard trainer ranges");

const fixedTableMatch = /static const u8 sFixedIVTable\[\]\[2\]\s*=\s*\{([\s\S]*?)\n\};/.exec(factoryC);
if (!fixedTableMatch) throw new Error("could not locate sFixedIVTable");
const fixedIvs = [...fixedTableMatch[1]!.matchAll(/\{\s*(\d+)\s*,\s*(\d+)\s*\}/g)].map((match) => ({
  regular: Number(match[1]),
  lastBattle: Number(match[2]),
}));
if (fixedIvs.length !== 8) throw new Error(`expected eight fixed-IV rows, got ${fixedIvs.length}`);

const policy = {
  schema: "factory-round-policy/v1",
  source: {
    files: [
      "include/constants/global.h",
      "include/constants/battle_factory.h",
      "include/constants/battle_frontier.h",
      "src/battle_factory.c",
      "src/battle_tower.c",
      "src/battle_factory_screen.c",
      "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc",
      "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc",
    ],
    anchors: {
      init: "src/battle_factory.c:198-222 InitFactoryChallenge",
      opponent: "src/battle_factory.c:303-377 GenerateOpponentMons",
      rentals: "src/battle_factory.c:509-601 GenerateInitialRentalMons",
      monRange: "src/battle_factory.c:829-886 GetFactoryMonId/GetNumPastRentalsRank",
      trainerRange: "src/battle_tower.c:1104-1129 GetRandomScaledFrontierTrainerId",
      partyBuild: "src/battle_tower.c:1824-1885 FillFactoryFrontierTrainerParty",
      swapCopy: "src/battle_factory_screen.c:2350-2361 CopySwappedMonData",
      postBattle: "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:54-158",
      terminal: "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:74-111",
    },
  },
  constants: {
    stagesPerChallenge,
    partySize,
    selectableMons,
    maxStreak,
    levelModes: { level50: 0, open: 1 },
    challengeNumber: "factoryWinStreak / stagesPerChallenge",
    trainerHistory: { capacity: 20, writeBattleIndexes: [0, 1, 2, 3, 4, 5], omitFinalBattleIndex: 6 },
    status: { won: 3, lost: 4 },
  },
  trainerSelection: {
    normalRanges: trainerRanges,
    hardRanges: hardTrainerRanges,
    hardBattleIndex: stagesPerChallenge - 1,
    afterChallengeIndex: 7,
    afterChallengeRangeIndex: 7,
    retryOnPriorTrainer: true,
  },
  rentalSelection: {
    highTierLastIndex: highTier,
    monCount: numFrontierMons,
    ranges: { level50: rentalRanges.slice(0, 8), open: rentalRanges.slice(8) },
    betterRangeOffset: 1,
    rentalRankThresholds: [15, 22, 29, 36, 43],
    maximumRentalRank: 5,
    fixedIvs,
  },
  roundFlow: {
    opponentGenerated: "initial room entry before draft; later after Go On and before swap offer",
    healPlayerParty: ["return-to-pre-battle-room before continuation menu", "immediately before every DoSpecialTrainerBattle"],
    win: { incrementFactoryWinStreak: true, incrementBattleNumber: true, terminalBattleNumber: stagesPerChallenge },
    loss: { terminalStatus: "lost", battleNumberUnchanged: true },
    swap: { accepted: "replace one player party slot from selected enemy party slot", declined: "no party-slot mutation" },
  },
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(policy)}\n`);
console.log(`wrote ${OUTPUT}`);
