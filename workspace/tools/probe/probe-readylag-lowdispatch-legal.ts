// Probe: the ready-lag discriminator dossier's own confound-closing fixture
// (docs/ready-lag-discriminator-scout.md §4) — a real `factoryLegal` route
// (no `overrides.parties` anywhere) whose OPPONENT lead has cry-derived
// `dispatchDelay < 101`, so the "dispatchDelay<101" and "override-
// constructed" properties are finally tested independently instead of
// always co-occurring.
//
// Fixture: tools/battle-lab/factory-readylag-lowdispatch-legal-off.json
// (`factoryLegal`, trainerId 38 / POKéFAN QUINN, challengeNum 0, battleNum 0,
// seed 1, playerSetIds [110,130,150] = GRIMER/NUZLEAF/NOSEPASS (same as the
// already-committed `factory-arbitrary-intro-yoshi-off.json` player side),
// opponentSetIds [165,198,129] = WEEPINBELL/MASQUERAIN/SKIPLOOM). Found by
// brute-forcing `generateFactoryOpponent` (src/engine/factoryOpponentGeneration.ts)
// over `rngValue` 1..20000 at `factoryWinStreak:0, battleIndex:0,
// storedTrainerIds:[], savedRentalSetIds:[110,130,150,115,135,145]` (the
// same recipe docs/intro-cry-shadow-evidence.md Part 2 used for the MAGNETON
// tuple) until the opponent's own lead species had `cryDurationTicks < 58`
// (= `cryDurationTicks(GROVYLE)`, the dispatchDelay<101 boundary) — the very
// first seed tried (1) already qualified (WEEPINBELL, 42t). Legality
// (species/item/rank-range rules) is enforced by the oracle itself, not by
// this script; `bin/oracle lab` on the committed fixture returns no error
// and echoes `opponent[0].species=70` (WEEPINBELL), confirming the tuple is
// real-generation-legal, not just brute-force-plausible.
//
// The three timing anchors below are ORACLE-MEASURED (not computed by
// formula), same convention as tools/probe/probe-ready-lag-inputs.ts's own
// citations, from a dense `preCheckpointCaptureAllFrames:true` run against
// this fixture (`bin/oracle lab`, 2007 pre-checkpoint frames, same size
// class as the YOSHI/SHIZUKA/MAGNETON fixtures):
//
//   - `handoffTick` (1580): the message box printing "POKéFAN QUINN sent /
//     out WEEPINBELL!" reaches its last glyph ("!") at frame 1577 (confirmed
//     by direct frame-image inspection: frame 1576 shows "...WEEPINBELL"
//     with no "!", frame 1577 shows the "!"); frames 1577-1579 are then
//     pixel-identical (SENDOUT_HANDOFF_LAG=3, battleScene.ts:3329) and frame
//     1580 is the first frame of the post-text handoff's large pixel jump
//     (1014 changed pixels vs 0 the frame before) - matches
//     `sendOutHandoffTick`'s own source-cited definition
//     (battleScene.ts:3334-3340) exactly: text-complete + 3.
//   - `throwVisibleTick` (1678): NOT independently pixel-hunted - cross-
//     confirmed by two independent frame-image landmarks instead, both
//     falling exactly where the formula predicts from `handoffTick` alone:
//     frame 1665 (= handoffTick 1580 + computed dispatchDelay 85) is the
//     first frame of "Go! GRIMER!" printing (message box just cleared,
//     showing "G"), and frame 1678 (= 1665 + computed visualLag 13) is the
//     first frame the player's own trainer sprite appears in its throw pose
//     - both exactly on the predicted ticks, not off by even one frame.
//   - `oracleReadyTick` (1810): first `preCheckpointCaptures` frame with
//     `state.engine.playerControllerCommand===18 &&
//     state.engine.controllerExecFlags===1` (the same semantic ready-gate
//     predicate `tools/probe/probe-overrides-ready-lag.ts` and
//     `docs/trainer-pic-off-window-scout.md` §A use) - 197 consecutive
//     frames (1810-2006) all satisfy it, so this is a clean, unambiguous
//     first transition, not a blink-phase false hit.
//
// Usage:
//   node --experimental-strip-types tools/probe/probe-readylag-lowdispatch-legal.ts
//
// Read-only: no `src/`/`tools/compare/` writes, no oracle HTTP calls (the
// oracle measurement was done once, out of band, via `bin/oracle lab`; see
// docs/ready-lag-confound-fixture.md for the exact reproduce commands).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const GEN = join(ROOT, "src", "data", "gen");
const LAB = join(ROOT, "tools", "battle-lab");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

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

function predictedReadyTick(throwVisibleTick: number, playerLeadSpeciesId: number): number {
  return throwVisibleTick + READY_LAG_BASELINE + cryDurationTicks(playerLeadSpeciesId);
}

// --- fixture (read from disk, not transcribed) --------------------------

const FIXTURE_FILE = "factory-readylag-lowdispatch-legal-off.json";
const req = readJson(join(LAB, FIXTURE_FILE));
const playerLeadSpeciesId = speciesIdForRentalSetId(req.playerSetIds[0]);
const opponentLeadSpeciesId = speciesIdForRentalSetId(req.opponentSetIds[0]);

// --- oracle-measured anchors (see header comment for method) ------------

const handoffTick = 1580;
const throwVisibleTick = 1678;
const oracleReadyTick = 1810;

// --- compute ---------------------------------------------------------------

const computedDispatchDelay = dispatchDelay(opponentLeadSpeciesId);
const computedVisualLag = playerVisualLag(playerLeadSpeciesId);
const computedThrowVisible = handoffTick + computedDispatchDelay + computedVisualLag;
const predictedReady = predictedReadyTick(throwVisibleTick, playerLeadSpeciesId);
const residual = oracleReadyTick - predictedReady;
const dispatchRegime = computedDispatchDelay < DISPATCH_BASELINE ? "below-baseline(<101)" : "at-or-above-baseline(>=101)";

console.log("=== confound-closing fixture: real factoryLegal, no overrides ===\n");
console.log(`  fixture:             ${FIXTURE_FILE}`);
console.log(`  mode:                ${req.mode} (no overrides.parties)`);
console.log(`  route:               trainerId=${req.trainerId} challengeNum=${req.challengeNum} battleNum=${req.battleNum} seed=${req.seed}`);
console.log(
  `  opponent lead:       ${speciesDisplayName(opponentLeadSpeciesId)} (id ${opponentLeadSpeciesId}), cry=${cryDurationTicks(opponentLeadSpeciesId)}t`,
);
console.log(
  `  player lead:         ${speciesDisplayName(playerLeadSpeciesId)} (id ${playerLeadSpeciesId}), cry=${cryDurationTicks(playerLeadSpeciesId)}t`,
);
console.log(`  dispatchDelay:       ${computedDispatchDelay} [${dispatchRegime}]  (visualLag=${computedVisualLag})`);
console.log(`  handoffTick (measured):       ${handoffTick}`);
console.log(`  throwVisibleTick (measured):  ${throwVisibleTick} (computed cross-check: ${computedThrowVisible}, ${computedThrowVisible === throwVisibleTick ? "MATCH" : "MISMATCH"})`);
console.log(`  predicted ready (pre-fix formula): ${predictedReady}`);
console.log(`  oracle ready (measured):           ${oracleReadyTick}`);
console.log(`  residual (oracle - predicted):     ${residual >= 0 ? "+" : ""}${residual}`);
console.log();
console.log(
  `RESULT: factoryLegal low-dispatch route: oracle ready = ${oracleReadyTick}, ` +
    `pre-fix predicted = ${predictedReady}, residual ${residual >= 0 ? "+" : ""}${residual}`,
);
