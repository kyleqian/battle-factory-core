/**
 * Live integration proof for the `factoryBrain` battle-lab mode
 * (`docs/noland-brain-staging-design.md` §6), sibling of
 * `tools/probe/verify-noland-brain-receipts.ts`. Where that script re-derives
 * retail constants from committed mGBA receipts without touching the
 * network, this one stages the checked-in silver/gold fixtures
 * (`tools/battle-lab/factory-brain-{silver,gold}-turn1-off.json`) through the
 * LIVE oracle HTTP endpoint and cross-checks the echoed `opponentParty`
 * against the ported pure-engine `generateFactoryBrainOpponent`, proving the
 * "stage it live, reconstruct from ported source, diff" pattern for the
 * Brain mode the same way the receipts verifier already established for raw
 * mGBA probes.
 *
 * Two independent check families per case (silver challengeNum 2, gold
 * challengeNum 5):
 *
 *  1. STRUCTURAL -- run the checked-in fixture unmodified (live generation,
 *     no override) and cross-check the echoed opponentParty's fixedIv,
 *     level, IV uniformity, no-duplicate-species/item, and species/item
 *     pool membership against pure functions and catalog data from
 *     src/engine/factoryBrainOpponentGeneration.ts and
 *     factoryRentalGeneration.ts. This does NOT replay the exact RNG draw:
 *     the lab HTTP contract exposes no pre-draw RNG cursor (only the
 *     mGBA-level probe behind tools/probe/receipts/noland-brain-party-*.json
 *     can read that). What it proves is that the harness draws from the
 *     SAME pool/fixed-IV the ported engine computes for that challengeNum --
 *     i.e. the RAM-write integration (design §3.3) is wired correctly.
 *
 *  2. ROUND-TRIP -- build a synthetic, fully legal Brain opponent party with
 *     the pure-engine generateFactoryBrainOpponent, stage it verbatim via
 *     factoryBrain + overrides.parties, and assert the echoed opponentParty
 *     equals the requested override byte-for-byte. This proves design
 *     §3.4/§4's composition claim empirically (overrides.parties is
 *     honored under factoryBrain; fixedIv keeps reporting the challenge's
 *     structural value regardless of the override's actual IVs), not just
 *     by source-reading.
 *
 * Run (needs a live Battle Scene OFF service, default :8014):
 *   node --experimental-strip-types tools/probe/verify-factory-brain-lab.ts
 *   POKEBENCH_ORACLE_URL=http://127.0.0.1:8014 node --experimental-strip-types tools/probe/verify-factory-brain-lab.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import frontierHeldItemsData from "../../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import speciesStatsData from "../../src/data/gen/species-stats.json" with { type: "json" };
import {
  generateFactoryBrainOpponent,
  getLevel50FactoryBrainFixedIv,
} from "../../src/engine/factoryBrainOpponentGeneration.ts";
import { getLevel50FactoryRentalRange } from "../../src/engine/factoryRentalGeneration.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(HERE, "..", "battle-lab");
const BASE_URL = (process.env.POKEBENCH_ORACLE_URL ?? "http://127.0.0.1:8014").replace(/\/$/, "");

type FrontierMonRow = Readonly<{ index: number; species: string; itemTableId: number }>;
type SpeciesRow = Readonly<{ id: number; name: string }>;
type HeldItemRow = Readonly<{ itemTableId: number; itemId: number }>;

const FRONTIER_MONS = (frontierMonsData as unknown as { entries: FrontierMonRow[] }).entries;
const SPECIES_ID_BY_NAME = new Map(
  (speciesStatsData as unknown as { species: SpeciesRow[] }).species.map((row) => [row.name, row.id]),
);
const HELD_ITEM_BY_TABLE_ID = new Map(
  (frontierHeldItemsData as unknown as { entries: HeldItemRow[] }).entries
    .map((row) => [row.itemTableId, row.itemId]),
);

let failures = 0;
let checks = 0;
function check(label: string, condition: boolean, detail: string): void {
  checks += 1;
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL: ${label} -- ${detail}`);
  }
}

async function post(value: unknown): Promise<any> {
  const response = await fetch(`${BASE_URL}/v1/battle-lab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`POST /v1/battle-lab/run -> ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

/** Species set legally drawable inside challengeNum's Level-50 Brain rental range (battle_factory.c:169-180, adder == 0). */
function speciesPoolFor(challengeNum: number): Set<number> {
  const range = getLevel50FactoryRentalRange(challengeNum, false);
  const pool = new Set<number>();
  for (const row of FRONTIER_MONS) {
    if (row.index < range.start || row.index > range.end) continue;
    const id = SPECIES_ID_BY_NAME.get(row.species);
    if (id === undefined) throw new Error(`unknown species name ${row.species}`);
    pool.add(id);
  }
  return pool;
}

/** Held items catalog rows of `speciesId` can legally carry inside challengeNum's own range. */
function itemPoolForSpecies(challengeNum: number, speciesId: number): Set<number> {
  const range = getLevel50FactoryRentalRange(challengeNum, false);
  const pool = new Set<number>();
  for (const row of FRONTIER_MONS) {
    if (row.index < range.start || row.index > range.end) continue;
    if (SPECIES_ID_BY_NAME.get(row.species) !== speciesId) continue;
    const itemId = HELD_ITEM_BY_TABLE_ID.get(row.itemTableId);
    if (itemId !== undefined) pool.add(itemId);
  }
  return pool;
}

async function checkStructural(name: string, challengeNum: number, expectedFixedIv: number): Promise<void> {
  const fixturePath = path.join(FIXTURES_DIR, `factory-brain-${name}-turn1-off.json`);
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  console.log(`\n${name} structural (live generation, ${path.relative(HERE, fixturePath)}):`);

  const response = await post(fixture);
  const bl = response.battleLab;

  check(`${name}: mode echoed as factoryBrain`, bl.mode === "factoryBrain", `mode=${bl.mode}`);
  check(`${name}: battleNum is the challenge's final battle`, bl.battleNum === 6, `battleNum=${bl.battleNum}`);
  check(`${name}: no trainerId echo`, !("trainerId" in bl), Object.keys(bl).join(","));
  check(`${name}: no rangeIndex echo`, !("rangeIndex" in bl), Object.keys(bl).join(","));

  const pureFixedIv = getLevel50FactoryBrainFixedIv(challengeNum);
  check(
    `${name}: echoed fixedIv == getLevel50FactoryBrainFixedIv(challengeNum) (pure engine)`,
    bl.fixedIv === expectedFixedIv && bl.fixedIv === pureFixedIv,
    `echoed=${bl.fixedIv} pure=${pureFixedIv} expected=${expectedFixedIv}`,
  );

  const party: any[] = bl.opponentParty;
  check(`${name}: opponentParty has 3 mons`, party.length === 3, `length=${party.length}`);
  check(`${name}: all mons level 50`, party.every((m) => m.level === 50), party.map((m) => m.level).join(","));
  check(
    `${name}: every IV equals the Brain fixed IV`,
    party.every((m) => Object.values(m.ivs).every((iv) => iv === bl.fixedIv)),
    party.map((m) => JSON.stringify(m.ivs)).join(" | "),
  );

  const species: number[] = party.map((m) => m.species);
  check(`${name}: no duplicate species`, new Set(species).size === species.length, species.join(","));
  const nonzeroItems = party.map((m) => m.item).filter((item) => item !== 0);
  check(`${name}: no duplicate held item`, new Set(nonzeroItems).size === nonzeroItems.length, nonzeroItems.join(","));

  const pool = speciesPoolFor(challengeNum);
  check(
    `${name}: every echoed species is a legal member of the challenge's own Level-50 pool (ported engine's own range + catalog)`,
    species.every((s) => pool.has(s)),
    `species=${species.join(",")} poolSize=${pool.size}`,
  );

  for (const mon of party) {
    if (mon.item === 0) continue;
    const legalItems = itemPoolForSpecies(challengeNum, mon.species);
    check(
      `${name}: species ${mon.species}'s held item ${mon.item} is a catalog item for that species in this challenge's pool`,
      legalItems.has(mon.item),
      `item=${mon.item} legalItems=${[...legalItems].join(",")}`,
    );
  }
}

/** A synthetic, fully legal Brain opponent party via the pure engine -- no network involved. */
function buildSyntheticBrainParty(challengeNum: number): any[] {
  const factoryWinStreak = challengeNum * 7; // floor(factoryWinStreak / 7) == challengeNum
  const result = generateFactoryBrainOpponent({
    rngValue: 0x1234_5678,
    factoryWinStreak,
    playerRentalSetIds: [0, 1, 2, 3, 4, 5],
    playerTrainerId: 416049562,
  });
  return result.party.map((member) => ({
    species: member.species,
    level: member.level,
    nature: member.nature,
    ivs: member.ivs,
    evs: member.evs,
    moves: member.moves,
    ppUps: member.ppUps,
    item: member.item,
    abilitySlot: member.abilitySlot,
    friendship: member.friendship,
    personality: member.personality,
    gender: member.gender,
    shiny: member.shiny,
  }));
}

async function checkRoundTrip(name: string, challengeNum: number, playerSetIds: number[]): Promise<void> {
  console.log(`\n${name} round-trip (factoryBrain + overrides.parties):`);
  const syntheticOpponent = buildSyntheticBrainParty(challengeNum);
  const request = {
    schemaVersion: 1,
    mode: "factoryBrain",
    profile: "battle-scene-off",
    level: 50,
    challengeNum,
    playerSetIds,
    rentalSwapCount: 0,
    seed: 305419896,
    overrides: {
      parties: {
        player: [
          { species: 1, moves: [33, 33, 33, 33] },
          { species: 4, moves: [33, 33, 33, 33] },
          { species: 7, moves: [33, 33, 33, 33] },
        ],
        opponent: syntheticOpponent,
      },
    },
    trace: { segments: [], captureFrames: [0] },
  };

  const response = await post(request);
  const bl = response.battleLab;
  check(`${name}: factoryBrain + overrides.parties is accepted`, response.captures?.length > 0, "no captures in response");

  const pureFixedIv = getLevel50FactoryBrainFixedIv(challengeNum);
  check(
    `${name}: fixedIv still echoes the challenge's structural value regardless of the override's actual IVs`,
    bl.fixedIv === pureFixedIv,
    `fixedIv=${bl.fixedIv} pure=${pureFixedIv}`,
  );

  const echoed: any[] = bl.opponentParty;
  check(`${name}: echoed opponentParty has 3 mons`, echoed.length === 3, `length=${echoed.length}`);

  const fields = ["species", "level", "nature", "item", "personality", "friendship"] as const;
  echoed.forEach((mon, i) => {
    const want = syntheticOpponent[i];
    for (const field of fields) {
      check(
        `${name}: opponent[${i}].${field} matches the pure-engine-generated override`,
        mon[field] === want[field],
        `echoed=${mon[field]} want=${want[field]}`,
      );
    }
    check(
      `${name}: opponent[${i}].ivs match`,
      JSON.stringify(mon.ivs) === JSON.stringify(want.ivs),
      `echoed=${JSON.stringify(mon.ivs)} want=${JSON.stringify(want.ivs)}`,
    );
    check(
      `${name}: opponent[${i}].moves match`,
      JSON.stringify(mon.moves) === JSON.stringify(want.moves),
      `echoed=${JSON.stringify(mon.moves)} want=${JSON.stringify(want.moves)}`,
    );
  });
}

async function main(): Promise<void> {
  await checkStructural("silver", 2, 15);
  await checkStructural("gold", 5, 31);
  await checkRoundTrip("silver", 2, [267, 268, 269]);
  await checkRoundTrip("gold", 5, [564, 565, 566]);

  console.log(`\n${checks - failures}/${checks} checks passed`);
  console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
