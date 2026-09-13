/** Hermetic verifier for the MOVE_BONEMERANG source/legal-staging receipt. */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const json = (path: string): Json => JSON.parse(read(path)) as Json;
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"].sort();
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort();
function fail(message: string): never { throw new Error(`MOVE_BONEMERANG staging drift: ${message}`); }
function equal(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}
function oracleDirectory(): string {
  let candidate = root;
  while (true) {
    const oracle = resolve(candidate, "oracle");
    if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle;
    const parent = dirname(candidate);
    if (parent === candidate) fail("could not locate pinned battle_lab.py");
    candidate = parent;
  }
}
function validateStage(path: string): void {
  const result = spawnSync("python3", ["-c", [
    "import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
  if (result.status !== 0 || result.stderr) fail(`stage validation failed for ${path}: ${result.stderr || result.stdout}`);
}

const receipt = json("tools/compare/fixtures/bonemerang-staging-receipt.json");
const coverage = json("ANIMATION_COVERAGE.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/bonemerangSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
const audit = JSON.parse(auditText) as Json;

equal([receipt.schema, receipt.oracleProfile, receipt.move, receipt.moveId, receipt.status, receipt.coverageCredit], ["bonemerang-compact-staging-receipt/v1", "battle-scene-on", "MOVE_BONEMERANG", 155, "unsupported-source-staging-checkpoint", false], "receipt identity");
equal(sha(auditText), receipt.source.auditRunSha256, "current source audit hash");
equal(sha(read(receipt.source.probe)), receipt.source.probeSha256, "staging probe hash");
equal(receipt.source.pointerOwnedRoot, { symbol: "Move_BONEMERANG", start: "0x082d17cc", endExclusive: "0x082d1820" }, "root interval");
equal(receipt.freshness, {
  check: "tools/check-oracle-freshness.sh", exitCode: 2,
  diagnostic: "both service PID start times were unreadable; this Linux host also treated the harness epoch as a filename while the BSD-date formatting path ran",
  sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py",
}, "freshness diagnostic");
if (!audit.checkpoint.sourceAudit || !audit.checkpoint.completePointerOwnedRoot || !audit.checkpoint.completeReachableBranches || !audit.checkpoint.completeCarrierCensus || !audit.checkpoint.reproducibleBoneAsset || !audit.checkpoint.legalBilateralPartyOnlyStaging || !audit.checkpoint.oracleOrMgbaInvoked || !audit.checkpoint.compactBilateralEndpointReceipts || !audit.checkpoint.twiceFreshPerOrientation || !audit.checkpoint.denseWindowCaptured || !audit.checkpoint.latchMeasured || !audit.checkpoint.reducerAdded || !audit.checkpoint.typedSceneOnSeam || !audit.checkpoint.compositorAdded || !audit.checkpoint.framebufferAcceptance || !audit.checkpoint.coveragePromotion || !audit.checkpoint.componentTrackFulfilled || !audit.checkpoint.latchPromotion || audit.checkpoint.boundaryOrBarrierChanged || audit.checkpoint.gameplayStateOwned || audit.checkpoint.unsupportedNoCreditBoundary) fail("source audit exact boundary");
if (!coverage.entries.some((entry: Json) => entry.move === "MOVE_BONEMERANG" && entry.status === "exact") || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_SIGNAL_BEAM"])) fail("coverage promotion boundary");
const track = coverage.componentTracks.find((entry: Json) => entry.id === "bone-projectile-bonemerang");
if (!track || track.fulfilled !== true || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_BONEMERANG"])) fail("component track boundary");
equal(receipt.factoryLegalSelection.carrier, { setId: 387, name: "FRONTIER_MON_MAROWAK_1", species: 105 }, "legal carrier");
equal(receipt.factoryLegalSelection.sourceRoute, { challengeNum: 3, level50SetRange: [372, 467], trainerId: 140 }, "legal source route");

const expected: Record<Orientation, Json> = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-bonemerang-player-marowak-opponent-chansey.json", seed: 305421231,
    attacker: "player", target: "opponent", playerSetIds: [387, 376, 377], opponentSetIds: [372, 373, 378],
    ppAfter: [9, 10, 10, 10], attackerBattler: 0, targetBattler: 1, finalHp: 14, moveDamage: 164,
    aiMoves: [33, 33, 33, 33], benchSha: "5cfc876961634621be278be1edd6b1e2c7282d1793b902d60fb86b664fad490c",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-bonemerang-opponent-marowak-player-chansey.json", seed: 305421231,
    attacker: "opponent", target: "player", playerSetIds: [372, 373, 378], opponentSetIds: [387, 376, 377],
    ppAfter: [9, 10, 10, 10], attackerBattler: 1, targetBattler: 0, finalHp: 3, moveDamage: 183,
    aiMoves: [155, 155, 155, 155], benchSha: "8f725be55882cf61914531458c27d6aa7a5794fe8c608d6be3f975fd8474279f",
  },
};
for (const orientation of Object.keys(expected) as Orientation[]) {
  const want = expected[orientation];
  const run = receipt.runs[orientation] as Json;
  const stage = json(want.scenario);
  validateStage(want.scenario);
  equal(sha(read(want.scenario)), run.scenarioSha256, `${orientation} scenario hash`);
  equal([stage.schemaVersion, stage.mode, stage.profile, stage.level, stage.challengeNum, stage.battleNum, stage.trainerId, stage.seed], [1, "mechanicLab", "battle-scene-on", 50, 3, 0, 140, want.seed], `${orientation} stage identity`);
  equal(stage.playerSetIds, want.playerSetIds, `${orientation} player source sets`);
  equal(stage.opponentSetIds, want.opponentSetIds, `${orientation} opponent source sets`);
  equal(Object.keys(stage.overrides), ["parties"], `${orientation} party-only override`);
  equal(stage.trace, { segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 1200, buttons: [] }] }, `${orientation} ordinary input trace`);
  for (const side of ["player", "opponent"] as const) {
    const party = stage.overrides.parties[side] as Json[];
    if (party.length !== 3 || new Set(party.map((mon) => mon.species)).size !== 3 || new Set(party.map((mon) => mon.item)).size !== 3) fail(`${orientation} ${side} complete unique party`);
    for (const mon of party) {
      equal(Object.keys(mon).sort(), completeKeys, `${orientation} ${side} complete party record`);
      equal(Object.keys(mon.ivs).sort(), statKeys, `${orientation} ${side} IV record`);
      equal(Object.keys(mon.evs).sort(), statKeys, `${orientation} ${side} EV record`);
      for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) if (Object.hasOwn(mon, key)) fail(`${orientation} injects transient ${key}`);
    }
  }
  equal(stage.overrides.parties[want.attacker][0].moves, [155, 155, 155, 155], `${orientation} legal Bonemerang choice constraint`);
  equal(stage.overrides.parties[want.target][0].moves, [33, 33, 33, 33], `${orientation} target control constraint`);
  equal([run.seed, run.freshRuns, run.outputsByteIdentical, run.sourceInitialized, run.customPartiesBuiltBeforeBattle], [want.seed, 2, true, true, true], `${orientation} fresh legal receipt`);
  equal(run.attacker, { side: want.attacker, partyIndex: 0, species: 105, level: 50, moves: [155, 155, 155, 155] }, `${orientation} receipt attacker`);
  equal(run.target, { side: want.target, partyIndex: 0, species: 113, level: 50, initialHp: 357, maxHp: 357, finalHp: want.finalHp }, `${orientation} receipt target`);
  equal(run.choiceConstraint, { attackerMoveSlots: [155, 155, 155, 155], opponentAiMoveSlots: want.aiMoves }, `${orientation} receipt choice constraint`);
  equal(run.root, { symbol: "Move_BONEMERANG", start: "0x82d17cc", endExclusive: "0x82d1820", observations: 142, attackerBattler: want.attackerBattler, targetBattler: want.targetBattler, moveResultFlags: 0, moveDamage: want.moveDamage }, `${orientation} root observation`);
  equal(run.romOutcome, { kind: "double-hit", targetFinalPartyHp: want.finalHp, targetFinalBattleHp: want.finalHp, targetFinalStatus: "none", battleOutcome: 0 }, `${orientation} stock-ROM outcome`);
  equal(run.pp, { before: [10, 10, 10, 10], after: want.ppAfter, spent: 1 }, `${orientation} PP use`);
  equal(run.benches, { partyIndices: [1, 2], unchanged: true, checksumValid: true, beforeSha256: want.benchSha, afterSha256: want.benchSha }, `${orientation} immutable checksum-valid benches`);
  if (run.transientFreeSetup !== true || !/^[0-9a-f]{64}$/u.test(run.outputSha256)) fail(`${orientation} output receipt`);
}
equal(receipt.scope, {
  framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false,
  latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false,
  coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [], battleStateInjected: false,
  entryHooksSkipped: false, noTimingOrLatchTransfer: true,
}, "receipt scope");
console.log(JSON.stringify({
  schema: "bonemerang-source-staging-verifier/v1", auditRunSha256: receipt.source.auditRunSha256,
  runs: Object.fromEntries((Object.keys(expected) as Orientation[]).map((orientation) => [orientation, { outputSha256: receipt.runs[orientation].outputSha256, rootObservations: receipt.runs[orientation].root.observations }])),
}, null, 2));
