// Dev-time extractor for the Battle Factory move-animation inventory.
// It joins the already source-derived Factory mon/range artifacts with the
// complete move table and writes a deterministic coverage input. Run with:
//   node --experimental-strip-types tools/extract/extract-factory-animation-inventory.ts
// or pass `--out <path>` for a byte-for-byte reproducibility check.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const defaultOutput = join(RUN_ROOT, "src", "data", "gen", "factory-animation-inventory.json");
const outputArg = process.argv.indexOf("--out");
if (outputArg !== -1 && !process.argv[outputArg + 1]) throw new Error("--out needs a path");
const OUTPUT = outputArg === -1 ? defaultOutput : resolve(process.argv[outputArg + 1]!);

interface FrontierMon {
  readonly index: number;
  readonly label: string;
  readonly species: string;
  readonly moves: readonly string[];
}

interface MonRange {
  readonly start: number;
  readonly end: number;
}

interface MoveData {
  readonly move: string;
  readonly id: number;
  readonly name: string;
  readonly effect: string;
  readonly target: readonly string[];
}

interface InventoryMove extends MoveData {
  readonly animationScript: string;
  readonly frontierMonCount: number;
  readonly speciesCount: number;
  readonly exampleMons: readonly string[];
}

const frontierMons = (
  JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "battle-frontier-mons.json"), "utf8")) as
    { entries: FrontierMon[] }
).entries;
const policy = JSON.parse(
  readFileSync(join(RUN_ROOT, "src", "data", "gen", "factory-round-policy.json"), "utf8"),
) as {
  rentalSelection: {
    ranges: { level50: MonRange[]; open: MonRange[] };
  };
};
const moves = (
  JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "moves.json"), "utf8")) as
    { moves: MoveData[] }
).moves.filter((move) => move.move !== "MOVE_NONE");

const animationSource = readFileSync(
  join(RUN_ROOT, "reference", "pokeemerald", "data", "battle_anim_scripts.s"),
  "utf8",
);
const animationTable = /gBattleAnims_Moves::\n([\s\S]*?)\n\n/.exec(animationSource);
if (!animationTable) throw new Error("could not locate gBattleAnims_Moves");
const animationScripts = [...animationTable[1]!.matchAll(/^\s*\.4byte\s+([A-Za-z0-9_]+)/gm)]
  .map((match) => match[1]!);
if (
  animationScripts.length !== moves.length + 2 ||
  animationScripts.at(-1) !== "Move_COUNT"
) {
  throw new Error(
    `expected ${moves.length + 1} indexed scripts plus Move_COUNT, got ${animationScripts.length}`,
  );
}

const monByIndex = new Map(frontierMons.map((mon) => [mon.index, mon]));
const moveByLabel = new Map(moves.map((move) => [move.move, move]));

function indicesIn(ranges: readonly MonRange[]): Set<number> {
  const result = new Set<number>();
  for (const range of ranges) {
    for (let index = range.start; index <= range.end; index += 1) {
      if (!monByIndex.has(index)) throw new Error(`Factory range references missing mon index ${index}`);
      result.add(index);
    }
  }
  return result;
}

function moveLabelsIn(monIndices: ReadonlySet<number>): Set<string> {
  const result = new Set<string>();
  for (const index of monIndices) {
    for (const move of monByIndex.get(index)!.moves) {
      if (move !== "MOVE_NONE") result.add(move);
    }
  }
  return result;
}

function inventoryMoves(labels: ReadonlySet<string>, monIndices: ReadonlySet<number>): InventoryMove[] {
  return [...labels].map((label) => {
    const move = moveByLabel.get(label);
    if (!move) throw new Error(`Factory mon references unknown move ${label}`);
    const users = [...monIndices]
      .map((index) => monByIndex.get(index)!)
      .filter((mon) => mon.moves.includes(label));
    const species = new Set(users.map((mon) => mon.species));
    const animationScript = animationScripts[move.id];
    if (!animationScript) throw new Error(`move ${label} has no animation script at id ${move.id}`);
    return {
      ...move,
      animationScript,
      frontierMonCount: users.length,
      speciesCount: species.size,
      exampleMons: users.slice(0, 3).map((mon) => mon.label),
    };
  }).sort((a, b) => a.id - b.id);
}

const level50Indices = indicesIn(policy.rentalSelection.ranges.level50);
const openIndices = indicesIn(policy.rentalSelection.ranges.open);
const level50Labels = moveLabelsIn(level50Indices);
const openLabels = moveLabelsIn(openIndices);
const openOnlyLabels = new Set([...openLabels].filter((move) => !level50Labels.has(move)));
const factoryLabels = new Set([...level50Labels, ...openLabels]);
const outsideFactoryLabels = new Set(moves.map((move) => move.move).filter((move) => !factoryLabels.has(move)));
const allMoveIndices = new Set(frontierMons.map((mon) => mon.index));
const openExclusiveIndices = new Set([...openIndices].filter((index) => !level50Indices.has(index)));
const openExclusiveMons = [...openExclusiveIndices].map((index) => monByIndex.get(index)!);
const openExclusiveSpecies = [...new Set(openExclusiveMons.map((mon) => mon.species))].sort();
const openExclusiveLabels = moveLabelsIn(openExclusiveIndices);

const inventory = {
  schema: "factory-animation-inventory/v1",
  source: {
    files: [
      "src/data/gen/battle-frontier-mons.json",
      "src/data/gen/factory-round-policy.json",
      "src/data/gen/moves.json",
      "reference/pokeemerald/data/battle_anim_scripts.s",
    ],
    rule: "GenerateInitialRentalMons and GenerateOpponentMons both select through GetFactoryMonId; accepted opponent mons can subsequently become player rentals through the swap flow.",
  },
  roles: {
    level50: ["player", "opponent"],
    openOnly: ["player", "opponent"],
  },
  variantAudits: {
    openLevelExclusiveMons: {
      monIndices: {
        first: Math.min(...openExclusiveIndices),
        last: Math.max(...openExclusiveIndices),
        count: openExclusiveIndices.size,
      },
      speciesCount: openExclusiveSpecies.length,
      moveCount: openExclusiveLabels.size,
      species: openExclusiveSpecies.map((species) => ({
        species,
        frontierMonCount: openExclusiveMons.filter((mon) => mon.species === species).length,
        moves: [...new Set(
          openExclusiveMons
            .filter((mon) => mon.species === species)
            .flatMap((mon) => mon.moves)
            .filter((move) => move !== "MOVE_NONE"),
        )].sort((a, b) => moveByLabel.get(a)!.id - moveByLabel.get(b)!.id),
      })),
    },
  },
  tiers: {
    level50: {
      monIndices: { first: Math.min(...level50Indices), last: Math.max(...level50Indices), count: level50Indices.size },
      moveCount: level50Labels.size,
      moves: inventoryMoves(level50Labels, level50Indices),
    },
    openOnly: {
      monIndices: { first: Math.min(...openIndices), last: Math.max(...openIndices), count: openIndices.size },
      moveCount: openOnlyLabels.size,
      moves: inventoryMoves(openOnlyLabels, openIndices),
    },
    outsideFactory: {
      moveCount: outsideFactoryLabels.size,
      moves: inventoryMoves(outsideFactoryLabels, allMoveIndices),
    },
  },
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(inventory)}\n`);
console.log(`wrote ${OUTPUT}`);
