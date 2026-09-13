/** Hermetic verifier for the MOVE_SHEER_COLD source/legal-staging receipt. */
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
const completeKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species",
].sort();
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort();

function fail(message: string): never { throw new Error(`MOVE_SHEER_COLD staging drift: ${message}`); }
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
    "import json, sys",
    "sys.path.insert(0, sys.argv[1])",
    "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
  if (result.status !== 0 || result.stderr) fail(`stage validation failed for ${path}: ${result.stderr || result.stdout}`);
}

const receipt = json("tools/compare/fixtures/sheer-cold-staging-receipt.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/sheerColdSourceAudit.ts"], {
  cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
});
const audit = JSON.parse(auditText) as Json;
const coverage = json("ANIMATION_COVERAGE.json");

equal(receipt.schema, "sheer-cold-compact-staging-receipt/v1", "receipt schema");
equal([receipt.oracleProfile, receipt.move, receipt.moveId, receipt.status, receipt.coverageCredit], [
  "battle-scene-on", "MOVE_SHEER_COLD", 329, "unsupported-source-staging-checkpoint", false,
], "receipt identity");
equal(sha(auditText), receipt.source.auditRunSha256, "source audit hash");
equal(sha(read(receipt.source.probe)), receipt.source.probeSha256, "staging probe hash");
equal(receipt.source.pointerOwnedRoot, { symbol: "Move_SHEER_COLD", start: "0x082d5242", endExclusive: "0x082d5267" }, "root interval");
if (!audit.checkpoint.sourceAudit || !audit.checkpoint.completePointerOwnedRoot || !audit.checkpoint.completeReachableBranches
  || !audit.checkpoint.completeCarrierCensus || !audit.checkpoint.legalBilateralPartyOnlyStaging
  || !audit.checkpoint.oracleOrMgbaInvoked || !audit.checkpoint.compactBilateralEndpointReceipts
  || !audit.checkpoint.twiceFreshPerOrientation || audit.checkpoint.denseWindowCaptured
  || audit.checkpoint.reducerAdded || audit.checkpoint.typedSceneOnSeam || audit.checkpoint.compositorAdded
  || audit.checkpoint.framebufferAcceptance || audit.checkpoint.coveragePromotion || audit.checkpoint.componentTrackFulfilled
  || audit.checkpoint.latchPromotion || !audit.checkpoint.unsupportedNoCreditBoundary) {
  fail("source audit checkpoint boundary");
}

equal(receipt.factoryLegalSelection.carrier, { setId: 584, name: "FRONTIER_MON_DEWGONG_3", species: 87 }, "legal carrier");
equal(receipt.factoryLegalSelection.sourceRoute, {
  challengeNum: 5, level50SetRange: [564, 659], trainerId: 160, regularTrainerRange: [160, 199],
}, "legal source route");

const expected: Record<Orientation, Json> = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-sheer-cold-player-dewgong-opponent-chansey.json",
    seed: 305420003, attacker: "player", target: "opponent",
    playerSetIds: [584, 600, 610], opponentSetIds: [620, 622, 632],
    ppAfter: [4, 5, 5, 5], rootObservations: 191, attackerBattler: 0, targetBattler: 1, controllerExecFlags: 1,
    opponentAiMoveSlots: [33, 33, 33, 33], benchSha: "86f208271815e3e687a44756ae87febd8372592d9ce6a5b3f73de623ff9bb5c9",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-sheer-cold-opponent-dewgong-player-chansey.json",
    seed: 305420008, attacker: "opponent", target: "player",
    playerSetIds: [620, 622, 632], opponentSetIds: [584, 600, 610],
    ppAfter: [5, 4, 5, 5], rootObservations: 190, attackerBattler: 1, targetBattler: 0, controllerExecFlags: 2,
    opponentAiMoveSlots: [329, 329, 329, 329], benchSha: "8fe63240097dd132187f92999aee7c727c69285a63b31ffabe383bd7d8adee6a",
  },
};

for (const orientation of Object.keys(expected) as Orientation[]) {
  const want = expected[orientation];
  const run = receipt.runs[orientation] as Json;
  const stage = json(want.scenario);
  validateStage(want.scenario);
  equal(sha(read(want.scenario)), run.scenarioSha256, `${orientation} scenario hash`);
  equal([stage.schemaVersion, stage.mode, stage.profile, stage.level, stage.challengeNum, stage.battleNum, stage.trainerId, stage.seed], [
    1, "mechanicLab", "battle-scene-on", 50, 5, 0, 160, want.seed,
  ], `${orientation} stage identity`);
  equal(stage.playerSetIds, want.playerSetIds, `${orientation} player source sets`);
  equal(stage.opponentSetIds, want.opponentSetIds, `${orientation} opponent source sets`);
  equal(Object.keys(stage.overrides), ["parties"], `${orientation} party-only override`);
  if (stage.overrides.battlers) fail(`${orientation} legacy active-battler override`);
  equal(stage.trace, { segments: [
    { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 1200, buttons: [] },
  ] }, `${orientation} ordinary input trace`);
  if (stage.trace.captureFrames) fail(`${orientation} retains frame captures`);
  for (const side of ["player", "opponent"] as const) {
    const party = stage.overrides.parties[side] as Json[];
    if (party.length !== 3 || new Set(party.map((mon) => mon.species)).size !== 3 || new Set(party.map((mon) => mon.item)).size !== 3) {
      fail(`${orientation} ${side} is not a complete unique legal party`);
    }
    for (const mon of party) {
      equal(Object.keys(mon).sort(), completeKeys, `${orientation} ${side} complete party record`);
      equal(Object.keys(mon.ivs).sort(), statKeys, `${orientation} ${side} IV record`);
      equal(Object.keys(mon.evs).sort(), statKeys, `${orientation} ${side} EV record`);
      if (mon.level !== 50 || mon.moves.length !== 4 || mon.ppUps.length !== 4) fail(`${orientation} ${side} party completeness`);
      for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) {
        if (Object.hasOwn(mon, key)) fail(`${orientation} injects transient ${key}`);
      }
    }
  }
  equal(stage.overrides.parties[want.attacker][0].moves, [329, 329, 329, 329], `${orientation} legal Sheer Cold choice constraint`);
  equal(stage.overrides.parties[want.target][0].moves, [33, 33, 33, 33], `${orientation} target move constraint`);
  equal(run.scenario, want.scenario, `${orientation} receipt scenario`);
  equal([run.seed, run.freshRuns, run.outputsByteIdentical, run.sourceInitialized, run.customPartiesBuiltBeforeBattle], [
    want.seed, 2, true, true, true,
  ], `${orientation} fresh legal receipt`);
  equal(run.attacker, { side: want.attacker, partyIndex: 0, species: 87, level: 50, moves: [329, 329, 329, 329] }, `${orientation} receipt attacker`);
  equal(run.target, { side: want.target, partyIndex: 0, species: 113, level: 50, initialHp: 357, maxHp: 357 }, `${orientation} receipt target`);
  equal(run.choiceConstraint, { attackerMoveSlots: [329, 329, 329, 329], opponentAiMoveSlots: want.opponentAiMoveSlots }, `${orientation} receipt choice constraint`);
  equal(run.root, {
    symbol: "Move_SHEER_COLD", start: "0x82d5242", endExclusive: "0x82d5267", observations: want.rootObservations,
    attackerBattler: want.attackerBattler, targetBattler: want.targetBattler, controllerExecFlags: want.controllerExecFlags,
  }, `${orientation} root observation`);
  equal(run.romOutcome, {
    kind: "one-hit-ko", moveResultFlags: 16, missedBit: 1, oneHitKoBit: 16,
    targetFinalPartyHp: 0, targetFinalBattleHp: 0, battleOutcome: 0,
  }, `${orientation} stock-ROM outcome`);
  equal(run.pp, { before: [5, 5, 5, 5], after: want.ppAfter, spent: 1 }, `${orientation} PP use`);
  equal(run.benches, {
    partyIndices: [1, 2], unchanged: true, checksumValid: true, beforeSha256: want.benchSha, afterSha256: want.benchSha,
  }, `${orientation} immutable checksum-valid benches`);
  if (run.transientFreeSetup !== true || !/^[0-9a-f]{64}$/u.test(run.outputSha256)) fail(`${orientation} receipt endpoint`);
}

equal(receipt.scope, {
  framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false,
  latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false,
  coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [], battleStateInjected: false,
  entryHooksSkipped: false, noTimingOrLatchTransfer: true,
}, "staging-only scope");
if (coverage.entries.filter((entry: Json) => entry.status === "exact").length !== 251 || coverage.entries.find((entry: Json) => entry.move === "MOVE_SHEER_COLD")?.status !== "exact") fail("MOVE_SHEER_COLD exact coverage changed");
const track = coverage.componentTracks.find((entry: Json) => entry.id === "ice-cube-frozen-ice-cube");
if (!track?.fulfilled || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_SHEER_COLD"])) fail("ice-cube exact track changed");

console.log(JSON.stringify({
  schema: "sheer-cold-source-staging-verifier/v1",
  auditRunSha256: receipt.source.auditRunSha256,
  runs: Object.fromEntries((Object.keys(expected) as Orientation[]).map((orientation) => [orientation, {
    outputSha256: receipt.runs[orientation].outputSha256,
    rootObservations: receipt.runs[orientation].root.observations,
  }])),
}));
