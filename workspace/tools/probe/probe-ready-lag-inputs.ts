// Probe: tabulate the `generatedBattleStartCommandReady` formula's actual
// runtime inputs across every fixture where the ready-lag +7 has been
// observed or ruled out, and test candidate discriminators against the
// table.
//
// Formula under test (src/engine/battleScene.ts, read-only citation, not
// reproduced by import - the per-fixture inputs below are read from the
// committed fixture/asset files on disk, not hand-transcribed):
//   generatedBattleStartCommandReady(state) =
//     clock >= handoffTick
//       + generatedPlayerDispatchDelay(state)      (battleScene.ts:4463-4466)
//       + generatedPlayerReadyLag(state)            (battleScene.ts:4548-4552)
//   generatedPlayerDispatchDelay(state) =
//     GENERATED_PLAYER_DISPATCH_BASELINE_DELAY(101)  (battleScene.ts:4437)
//     + (cryDurationTicks(opponentLeadSpecies) - cryDurationTicks(GROVYLE=278))
//                                                    (battleScene.ts:4438,4463-4466)
//   generatedPlayerReadyLagSpeciesFormula(state) =    (battleScene.ts:4539-4546)
//     generatedPlayerVisualLag(playerLine.length)     (battleScene.ts:4476-4478)
//     + GENERATED_PLAYER_READY_LAG_BASELINE(98)       (battleScene.ts:4536)
//     + cryDurationTicks(playerLeadSpecies)
//   generatedPlayerVisualLag(len) = len - 1 + SENDOUT_HANDOFF_LAG(3)
//
// None of the five confirmed fixtures below is `isCanonicalAnchorIntro`
// (battleScene.ts:4548-4552's other branch), so every row uses the species
// formula, not the flat 185 constant.
//
// This script recomputes, from the committed fixture JSON and the extracted
// `cry-durations.json`/`species-names.json`/`battle-frontier-mons.json`
// assets, every input the formula actually consumes: opponent/player lead
// species, both cry durations, and the resulting `dispatchDelay`. The three
// timing anchors per fixture (opponent-handoff tick, throw-visible tick,
// oracle-observed ready tick) are NOT recomputed - they are already
// oracle-verified, dense-diff-derived constants cited to the specific doc/
// PROGRESS entry that established them (see ANCHOR_SOURCE below), reused
// per this step's brief ("prefer already-committed evidence... over fresh
// runs when equivalent"); the shared oracle is also in heavy concurrent use
// by the main-lane worker this round.
//
// Usage:
//   node --experimental-strip-types tools/probe/probe-ready-lag-inputs.ts
//
// Read-only: no `src/`/`tools/compare/` writes, no oracle HTTP calls.

import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const GEN = join(ROOT, "src", "data", "gen");
const LAB = join(ROOT, "tools", "battle-lab");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

// --- extracted assets (dev-time, read-only) ---------------------------

const cryDurations = readJson(join(GEN, "cry-durations.json")) as {
  species: { id: number; name: string; durationTicks: number }[];
};
const cryDurationById = new Map(
  cryDurations.species.map((row) => [row.id, row.durationTicks]),
);
function cryDurationTicks(speciesId: number): number {
  const ticks = cryDurationById.get(speciesId);
  if (ticks === undefined) throw new Error(`no cry duration for species ${speciesId}`);
  return ticks;
}

const speciesNames = readJson(join(GEN, "species-names.json")) as {
  species: { species: string; name: string }[];
};
function speciesDisplayName(speciesId: number): string {
  return speciesNames.species[speciesId].name;
}
function speciesIdByName(name: string): number {
  const idx = speciesNames.species.findIndex((row) => row.name === name);
  if (idx < 0) throw new Error(`no species id for name ${name}`);
  return idx;
}

const frontierMons = readJson(join(GEN, "battle-frontier-mons.json")) as {
  entries: { index: number; species: string }[];
};
function speciesIdForRentalSetId(setId: number): number {
  const entry = frontierMons.entries[setId];
  const name = entry.species.replace(/^SPECIES_/, "");
  return speciesIdByName(name);
}

// --- formula constants (cited above, battleScene.ts) -------------------

const GROVYLE_SPECIES_ID = speciesIdByName("GROVYLE");
const DISPATCH_BASELINE = 101; // GENERATED_PLAYER_DISPATCH_BASELINE_DELAY
const READY_LAG_BASELINE = 98; // GENERATED_PLAYER_READY_LAG_BASELINE
const SENDOUT_HANDOFF_LAG = 3;

function dispatchDelay(opponentLeadSpeciesId: number): number {
  return DISPATCH_BASELINE
    + (cryDurationTicks(opponentLeadSpeciesId) - cryDurationTicks(GROVYLE_SPECIES_ID));
}

function playerVisualLag(playerLeadSpeciesId: number): number {
  const line = `Go! ${speciesDisplayName(playerLeadSpeciesId)}!`;
  return line.length - 1 + SENDOUT_HANDOFF_LAG;
}

function predictedReadyTick(
  throwVisibleTick: number,
  playerLeadSpeciesId: number,
): number {
  return throwVisibleTick + READY_LAG_BASELINE + cryDurationTicks(playerLeadSpeciesId);
}

// --- fixture inputs (read from the committed battle-lab/compare-trace
// request JSON - species/mode/route are read from disk, not transcribed;
// only the three timing anchors are cited constants, see ANCHOR_SOURCE) --

type ClockConvention = "oracle-absolute" | "app-relative(reveal-off stage)";

interface FixtureRow {
  id: string;
  fixtureFile: string;
  confirmed: boolean; // false = provisional (gold), excluded from discriminator verdict
  handoffTick: number | null;
  throwVisibleTick: number | null;
  oracleReadyTick: number | null;
  clock: ClockConvention | null;
  anchorSource: string;
}

const FIXTURES: FixtureRow[] = [
  {
    id: "GRIMER/YOSHI",
    fixtureFile: "factory-arbitrary-intro-yoshi-off.json",
    confirmed: true,
    handoffTick: 1583,
    throwVisibleTick: 1721,
    oracleReadyTick: 1849,
    clock: "oracle-absolute",
    anchorSource: "docs/intro-cry-shadow-evidence.md Part 1 landmark table",
  },
  {
    id: "KADABRA/SHIZUKA",
    fixtureFile: "factory-trainer-pic-shizuka-off.json",
    confirmed: true,
    handoffTick: 1583,
    throwVisibleTick: 1708,
    oracleReadyTick: 1882,
    clock: "oracle-absolute",
    anchorSource: "docs/intro-cry-shadow-evidence.md Part 1 landmark table",
  },
  {
    id: "DELCATTY/MAGNETON",
    fixtureFile: "factory-arbitrary-intro-magneton-off.json",
    confirmed: true,
    handoffTick: 1583,
    throwVisibleTick: 1709,
    oracleReadyTick: 1867,
    clock: "oracle-absolute",
    anchorSource: "docs/intro-cry-shadow-evidence.md Part 1 + Part 2 landmark tables",
  },
  {
    id: "TANGELA/silver-noland-reveal",
    fixtureFile: "factory-round-battle7-noland-reveal-off.json",
    confirmed: true,
    handoffTick: 388,
    throwVisibleTick: 489,
    oracleReadyTick: 654,
    clock: "app-relative(reveal-off stage)",
    anchorSource: "PROGRESS.md 1261 (post-A-press-fix dense self-diff)",
  },
  {
    id: "PUPITAR/DELCATTY-mechanicLab-probe",
    fixtureFile: "factory-mechanic-pupitar-delcatty-readylag-probe.json",
    confirmed: true,
    handoffTick: 1583,
    throwVisibleTick: 1664,
    oracleReadyTick: 1829,
    clock: "oracle-absolute",
    anchorSource: "PROGRESS.md 1261 (independent oracle-only probe, dense self-diff)",
  },
  {
    id: "SKARMORY/gold-noland-reveal (PROVISIONAL)",
    fixtureFile: "factory-round-battle7-noland-gold-reveal-off.json",
    confirmed: false,
    handoffTick: null,
    throwVisibleTick: null,
    oracleReadyTick: null,
    clock: null,
    anchorSource:
      "PROGRESS.md 1262: alignment TRANSPLANTED from silver (A-press tick estimated by " +
      "formula, not independently bisected against this fixture's own oracle captures) - " +
      "no trustworthy handoff/throwVisible/ready anchor to recompute a predicted tick from; " +
      "reported qualitatively only (465-700 fully exact, no +7 tail), per this step's brief " +
      "('treat gold as unconfirmed either way; note it, do not build the theory on it').",
  },
];

// --- resolve species per fixture from the fixture JSON on disk ---------

interface ResolvedFixture extends FixtureRow {
  mode: string;
  trainerId: number | string | null;
  challengeNum: number | string | null;
  battleNum: number | string | null;
  playerLeadSpeciesId: number;
  opponentLeadSpeciesId: number;
}

function resolveFixture(row: FixtureRow): ResolvedFixture {
  const req = readJson(join(LAB, row.fixtureFile));
  let playerLeadSpeciesId: number;
  let opponentLeadSpeciesId: number;
  if (req.overrides?.parties) {
    playerLeadSpeciesId = req.overrides.parties.player[0].species;
    opponentLeadSpeciesId = req.overrides.parties.opponent[0].species;
  } else {
    playerLeadSpeciesId = speciesIdForRentalSetId(req.playerSetIds[0]);
    opponentLeadSpeciesId = speciesIdForRentalSetId(req.opponentSetIds[0]);
  }
  return {
    ...row,
    mode: req.mode,
    trainerId: req.trainerId ?? null,
    challengeNum: req.challengeNum ?? null,
    battleNum: req.battleNum ?? null,
    playerLeadSpeciesId,
    opponentLeadSpeciesId,
  };
}

const resolved = FIXTURES.map(resolveFixture);

// --- compute formula inputs/outputs per fixture -------------------------

interface ComputedRow extends ResolvedFixture {
  opponentSpeciesName: string;
  playerSpeciesName: string;
  opponentCryTicks: number;
  playerCryTicks: number;
  computedDispatchDelay: number;
  computedVisualLag: number;
  computedThrowVisible: number | null; // handoff + dispatchDelay + visualLag, for cross-check
  predictedReady: number | null;
  residual: number | null; // oracleReadyTick - predictedReady; null if not independently anchored
  dispatchRegime: "below-baseline(<101)" | "at-or-above-baseline(>=101)";
}

function compute(row: ResolvedFixture): ComputedRow {
  const opponentCryTicks = cryDurationTicks(row.opponentLeadSpeciesId);
  const playerCryTicks = cryDurationTicks(row.playerLeadSpeciesId);
  const computedDispatchDelay = dispatchDelay(row.opponentLeadSpeciesId);
  const computedVisualLag = playerVisualLag(row.playerLeadSpeciesId);
  const computedThrowVisible =
    row.handoffTick !== null
      ? row.handoffTick + computedDispatchDelay + computedVisualLag
      : null;
  const predictedReady =
    row.throwVisibleTick !== null
      ? predictedReadyTick(row.throwVisibleTick, row.playerLeadSpeciesId)
      : null;
  const residual =
    row.oracleReadyTick !== null && predictedReady !== null
      ? row.oracleReadyTick - predictedReady
      : null;
  return {
    ...row,
    opponentSpeciesName: speciesDisplayName(row.opponentLeadSpeciesId),
    playerSpeciesName: speciesDisplayName(row.playerLeadSpeciesId),
    opponentCryTicks,
    playerCryTicks,
    computedDispatchDelay,
    computedVisualLag,
    computedThrowVisible,
    predictedReady,
    residual,
    dispatchRegime:
      computedDispatchDelay < DISPATCH_BASELINE
        ? "below-baseline(<101)"
        : "at-or-above-baseline(>=101)",
  };
}

const table = resolved.map(compute);

// --- print the table -----------------------------------------------------

console.log("=== ready-lag discriminator table ===\n");
for (const row of table) {
  console.log(`--- ${row.id} ---`);
  console.log(`  fixture:            ${row.fixtureFile}`);
  console.log(`  mode:               ${row.mode}`);
  console.log(
    `  route:              trainerId=${row.trainerId} challengeNum=${row.challengeNum} battleNum=${row.battleNum}`,
  );
  console.log(
    `  opponent lead:      ${row.opponentSpeciesName} (id ${row.opponentLeadSpeciesId}), cry=${row.opponentCryTicks}t`,
  );
  console.log(
    `  player lead:        ${row.playerSpeciesName} (id ${row.playerLeadSpeciesId}), cry=${row.playerCryTicks}t`,
  );
  console.log(
    `  dispatchDelay:       ${row.computedDispatchDelay} [${row.dispatchRegime}]  (visualLag=${row.computedVisualLag})`,
  );
  if (row.handoffTick !== null) {
    console.log(
      `  handoff -> throwVisible (cited ${row.throwVisibleTick}, computed ${row.computedThrowVisible}) [clock: ${row.clock}]`,
    );
    console.log(`  predicted ready:     ${row.predictedReady}`);
    console.log(`  oracle ready:        ${row.oracleReadyTick}`);
    console.log(
      `  residual:            ${row.residual === 0 ? "0 (EXACT)" : row.residual !== null ? `+${row.residual}` : "n/a"}`,
    );
  } else {
    console.log("  predicted/oracle ready: not recomputed (provisional, see anchorSource)");
  }
  console.log(`  anchor source:       ${row.anchorSource}`);
  console.log();
}

// --- discriminator tests --------------------------------------------------

const confirmedRows = table.filter((r) => r.confirmed);

function verdict(name: string, predicate: (r: ComputedRow) => boolean): void {
  const results = confirmedRows.map((r) => ({
    id: r.id,
    residual: r.residual,
    predicateTrue: predicate(r),
  }));
  const isPlusSeven = (r: (typeof results)[number]) => (r.residual ?? 0) > 0;
  const clean = results.every((r) => r.predicateTrue === isPlusSeven(r));
  console.log(`--- discriminator: ${name} ---`);
  for (const r of results) {
    console.log(
      `  ${r.id.padEnd(38)} predicate=${String(r.predicateTrue).padEnd(5)} residual=${r.residual === 0 ? "0" : `+${r.residual}`}${
        r.predicateTrue === isPlusSeven(r) ? "" : "  <-- MISMATCH"
      }`,
    );
  }
  console.log(`  => ${clean ? "SURVIVES (cleanly separates 0 from +7)" : "FAILS (does not cleanly separate)"}\n`);
}

console.log("=== candidate discriminator tests (confirmed fixtures only; gold excluded, provisional) ===\n");

verdict("dispatchDelay(opponent) < 101 (baseline regime)", (r) => r.computedDispatchDelay < DISPATCH_BASELINE);
verdict("challengeNum >= 2", (r) => typeof r.challengeNum === "number" && r.challengeNum >= 2);
verdict("mode is factoryBrain or mechanicLab (override-constructed)", (r) => r.mode !== "factoryLegal");

// gold cross-check: reported qualitatively (PROGRESS 1262: 465-700 fully
// exact, no +7 tail); print its own dispatchDelay regime as a provisional
// data point, not folded into the verdicts above.
const gold = table.find((r) => !r.confirmed)!;
console.log("=== provisional cross-check: gold (excluded from verdicts above) ===\n");
console.log(
  `  ${gold.id}: dispatchDelay=${gold.computedDispatchDelay} [${gold.dispatchRegime}], ` +
    `mode=${gold.mode} (override-constructed, same as both +7 fixtures) - ` +
    `PROGRESS 1262 reports its own tail (frames 465-700) fully exact, no +7 recurrence, ` +
    `consistent with (not proof of) the dispatchDelay>=101 prediction despite sharing ` +
    `the override-construction mechanism with both +7 fixtures.`,
);
