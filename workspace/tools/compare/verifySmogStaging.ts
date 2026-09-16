/** Hermetic verifier for the MOVE_SMOG source/legal-staging receipt. */
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
function fail(message: string): never { throw new Error(`MOVE_SMOG staging drift: ${message}`); }
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

const receipt = json("tools/compare/fixtures/smog-staging-receipt.json");
const coverage = json("ANIMATION_COVERAGE.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/smogSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
const audit = JSON.parse(auditText) as Json;

equal([receipt.schema, receipt.oracleProfile, receipt.move, receipt.moveId, receipt.status, receipt.coverageCredit], ["smog-compact-staging-receipt/v1", "battle-scene-on", "MOVE_SMOG", 123, "unsupported-source-staging-checkpoint", false], "receipt identity");
equal(sha(auditText), "06b37df68b6a10558808187ef95071b5cf5e723233a5d7e43488c4d943e8bf5f", "current source audit hash");
equal(sha(read(receipt.source.probe)), receipt.source.probeSha256, "staging probe hash");
equal(receipt.source.pointerOwnedRoot, { symbol: "Move_SMOG", start: "0x082d01e5", endExclusive: "0x082d0260" }, "root interval");
equal(receipt.freshness, {
  check: "tools/check-oracle-freshness.sh", exitCode: 2,
  diagnostic: "both service PID start times were unreadable; this Linux host also treated the harness epoch as a filename while the BSD-date formatting path ran",
  sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py",
}, "freshness diagnostic");
if (!audit.checkpoint.sourceAudit || !audit.checkpoint.completePointerOwnedRoot || !audit.checkpoint.completeReachableBranches || !audit.checkpoint.completeCarrierCensus || !audit.checkpoint.legalBilateralPartyOnlyStaging || !audit.checkpoint.oracleOrMgbaInvoked || !audit.checkpoint.compactBilateralEndpointReceipts || !audit.checkpoint.twiceFreshPerOrientation || !audit.checkpoint.denseWindowCaptured || !audit.checkpoint.reducerAdded || !audit.checkpoint.typedSceneOnSeam || !audit.checkpoint.compositorAdded || !audit.checkpoint.framebufferAcceptance || !audit.checkpoint.coveragePromotion || !audit.checkpoint.componentTrackFulfilled || !audit.checkpoint.latchPromotion || audit.checkpoint.unsupportedNoCreditBoundary) fail("source audit exact boundary");
if (!coverage.entries.some((entry: Json) => entry.move === "MOVE_SMOG" && entry.status === "exact") || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_NIGHTMARE"])) fail("coverage promotion boundary");
equal(receipt.factoryLegalSelection.carrier, { setId: 149, name: "FRONTIER_MON_MAGBY", species: 240 }, "legal carrier");
equal(receipt.factoryLegalSelection.sourceRoute, { challengeNum: 0, level50SetRange: [110, 199], trainerId: 50 }, "legal source route");

const expected: Record<Orientation, Json> = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-smog-player-magby-opponent-onix.json", seed: 305421230,
    attacker: "player", target: "opponent", playerSetIds: [149, 156, 180], opponentSetIds: [179, 188, 184],
    ppAfter: [19, 20, 20, 20], attackerBattler: 0, targetBattler: 1, finalHp: 141, finalStatus: "none",
    aiMoves: [33, 33, 33, 33], benchSha: "cc68fb67612410b906346647618b31ab8b727bc478cce50604b7d2dfb3bff61c",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-smog-opponent-magby-player-onix.json", seed: 305421230,
    attacker: "opponent", target: "player", playerSetIds: [179, 188, 184], opponentSetIds: [149, 156, 180],
    ppAfter: [20, 19, 20, 20], attackerBattler: 1, targetBattler: 0, finalHp: 124, finalStatus: "poison",
    aiMoves: [123, 123, 123, 123], benchSha: "cc84449920a4e3966ca6fe08cda693ef1e4c2fd962bc96a85a4562c066ed19b2",
  },
};
for (const orientation of Object.keys(expected) as Orientation[]) {
  const want = expected[orientation];
  const run = receipt.runs[orientation] as Json;
  const stage = json(want.scenario);
  validateStage(want.scenario);
  equal(sha(read(want.scenario)), run.scenarioSha256, `${orientation} scenario hash`);
  equal([stage.schemaVersion, stage.mode, stage.profile, stage.level, stage.challengeNum, stage.battleNum, stage.trainerId, stage.seed], [1, "mechanicLab", "battle-scene-on", 50, 0, 0, 50, want.seed], `${orientation} stage identity`);
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
  equal(stage.overrides.parties[want.attacker][0].moves, [123, 123, 123, 123], `${orientation} legal Smog choice constraint`);
  equal(stage.overrides.parties[want.target][0].moves, [33, 33, 33, 33], `${orientation} target control constraint`);
  equal([run.seed, run.freshRuns, run.outputsByteIdentical, run.sourceInitialized, run.customPartiesBuiltBeforeBattle], [want.seed, 2, true, true, true], `${orientation} fresh legal receipt`);
  equal(run.attacker, { side: want.attacker, partyIndex: 0, species: 240, level: 50, moves: [123, 123, 123, 123] }, `${orientation} receipt attacker`);
  equal(run.target, { side: want.target, partyIndex: 0, species: 95, level: 50, initialHp: 142, maxHp: 142, finalHp: want.finalHp }, `${orientation} receipt target`);
  equal(run.choiceConstraint, { attackerMoveSlots: [123, 123, 123, 123], opponentAiMoveSlots: want.aiMoves }, `${orientation} receipt choice constraint`);
  equal(run.root, { symbol: "Move_SMOG", start: "0x82d01e5", endExclusive: "0x82d0260", observations: 305, attackerBattler: want.attackerBattler, targetBattler: want.targetBattler, moveResultFlags: 4, moveDamage: 1 }, `${orientation} root observation`);
  equal(run.romOutcome, { kind: "damaging-poison-hit", targetFinalPartyHp: want.finalHp, targetFinalBattleHp: want.finalHp, targetFinalStatus: want.finalStatus, battleOutcome: 0 }, `${orientation} stock-ROM outcome`);
  equal(run.pp, { before: [20, 20, 20, 20], after: want.ppAfter, spent: 1 }, `${orientation} PP use`);
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
  schema: "smog-source-staging-verifier/v1", auditRunSha256: receipt.source.auditRunSha256,
  runs: Object.fromEntries((Object.keys(expected) as Orientation[]).map((orientation) => [orientation, { outputSha256: receipt.runs[orientation].outputSha256, rootObservations: receipt.runs[orientation].root.observations }])),
}, null, 2));
