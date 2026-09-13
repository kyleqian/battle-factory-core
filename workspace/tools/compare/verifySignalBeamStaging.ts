/** Hermetic verifier for the MOVE_SIGNAL_BEAM source/legal-staging receipt. */
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
const components = [
  "asset:ANIM_TAG_DUCK", "asset:ANIM_TAG_GLOWY_GREEN_ORB", "asset:ANIM_TAG_GLOWY_RED_ORB",
  "sprite:gSignalBeamGreenOrbSpriteTemplate", "sprite:gSignalBeamRedOrbSpriteTemplate", "subroutine:SignalBeamOrbs",
  "task:AnimTask_ShakeMon", "task:AnimTask_StartSinAnimTimer", "visualCommand:complex_palette_blend", "visualCommand:panse",
];
function fail(message: string): never { throw new Error(`MOVE_SIGNAL_BEAM staging drift: ${message}`); }
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

const receipt = json("tools/compare/fixtures/signal-beam-staging-receipt.json");
const coverage = json("ANIMATION_COVERAGE.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/signalBeamSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
const audit = JSON.parse(auditText) as Json;

equal([receipt.schema, receipt.oracleProfile, receipt.move, receipt.moveId, receipt.status, receipt.coverageCredit], ["signal-beam-compact-staging-receipt/v1", "battle-scene-on", "MOVE_SIGNAL_BEAM", 324, "unsupported-source-staging-checkpoint", false], "receipt identity");
equal(sha(auditText), receipt.source.auditRunSha256, "current source audit hash");
equal(sha(read(receipt.source.probe)), receipt.source.probeSha256, "staging probe hash");
equal(receipt.source.pointerOwnedRoot, { symbol: "Move_SIGNAL_BEAM", start: "0x082d0eb2", endExclusive: "0x082d0f9a" }, "root interval");
equal(receipt.freshness, {
  check: "tools/check-oracle-freshness.sh", exitCode: 2,
  diagnostic: "both service PID start times were unreadable; this Linux host also treated the harness epoch as a filename while the BSD-date formatting path ran",
  sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py",
}, "freshness diagnostic");
if (!audit.checkpoint.sourceAudit || !audit.checkpoint.completePointerOwnedRoot || !audit.checkpoint.completeReachableBranches || !audit.checkpoint.completeCarrierCensus || !audit.checkpoint.reproducibleResources || !audit.checkpoint.legalBilateralPartyOnlyStaging || !audit.checkpoint.oracleOrMgbaInvoked || !audit.checkpoint.compactBilateralEndpointReceipts || !audit.checkpoint.twiceFreshPerOrientation || audit.checkpoint.denseWindowCaptured || audit.checkpoint.latchMeasured || audit.checkpoint.reducerAdded || audit.checkpoint.typedSceneOnSeam || audit.checkpoint.compositorAdded || audit.checkpoint.framebufferAcceptance || audit.checkpoint.coveragePromotion || audit.checkpoint.componentTrackFulfilled || audit.checkpoint.latchPromotion || audit.checkpoint.boundaryOrBarrierChanged || audit.checkpoint.gameplayStateOwned || !audit.checkpoint.unsupportedNoCreditBoundary) fail("source audit checkpoint boundary");
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_SIGNAL_BEAM") || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_SIGNAL_BEAM"])) fail("unsupported queue boundary");
const track = coverage.componentTracks.find((entry: Json) => entry.id === "signal-beam-orb-stream");
if (!track || track.fulfilled !== false || JSON.stringify(track.representatives) !== JSON.stringify(["MOVE_SIGNAL_BEAM"]) || JSON.stringify(track.components) !== JSON.stringify(components) || !track.goal.includes("UNFULFILLED")) fail("unfulfilled component track boundary");
equal(audit.graph.unrepresented, ["asset:ANIM_TAG_GLOWY_GREEN_ORB", "asset:ANIM_TAG_GLOWY_RED_ORB", "sprite:gSignalBeamGreenOrbSpriteTemplate", "sprite:gSignalBeamRedOrbSpriteTemplate", "subroutine:SignalBeamOrbs"], "unrepresented component boundary");
equal(audit.carriers.allSourceCarriers.map((carrier: Json) => carrier.index), [27, 160, 161, 277, 331, 680], "all Signal Beam carriers");
equal(audit.carriers.level50.map((carrier: Json) => carrier.index), [160, 161, 277, 331, 680], "Level-50 Signal Beam carriers");
equal(receipt.factoryLegalSelection.carrier, { setId: 160, name: "FRONTIER_MON_ARIADOS", species: 168 }, "lowest legal carrier");
equal(receipt.factoryLegalSelection.sourceRoute, { challengeNum: 0, level50SetRange: [110, 199], trainerId: 50 }, "legal source route");

const expected: Record<Orientation, Json> = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-signal-beam-player-ariados-opponent-chansey.json", seed: 305419897,
    attacker: "player", target: "opponent", playerSetIds: [160, 135, 180], opponentSetIds: [156, 188, 184],
    ppAfter: [14, 15, 15, 15], attackerBattler: 0, targetBattler: 1, finalHp: 187, moveDamage: 170,
    aiMoves: [33, 33, 33, 33], benchSha: "26baffe53fb7485824d448208e37343de486d72ef0cd4787bfaadd494bb694ce", observations: 145,
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-signal-beam-opponent-ariados-player-chansey.json", seed: 305419897,
    attacker: "opponent", target: "player", playerSetIds: [156, 149, 180], opponentSetIds: [160, 188, 135],
    ppAfter: [15, 15, 15, 14], attackerBattler: 1, targetBattler: 0, finalHp: 165, moveDamage: 192,
    aiMoves: [324, 324, 324, 324], benchSha: "e6e9caec586532809a7d8d9e552842de01d440bfc3a080d5670c242b51d55181", observations: 144,
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
  equal(stage.overrides.parties[want.attacker][0].moves, [324, 324, 324, 324], `${orientation} legal Signal Beam choice constraint`);
  equal(stage.overrides.parties[want.target][0].moves, [33, 33, 33, 33], `${orientation} target control constraint`);
  equal([run.seed, run.freshRuns, run.outputsByteIdentical, run.sourceInitialized, run.customPartiesBuiltBeforeBattle], [want.seed, 2, true, true, true], `${orientation} fresh legal receipt`);
  equal(run.attacker, { side: want.attacker, partyIndex: 0, species: 168, level: 50, moves: [324, 324, 324, 324] }, `${orientation} receipt attacker`);
  equal(run.target, { side: want.target, partyIndex: 0, species: 113, level: 50, initialHp: 357, maxHp: 357, finalHp: want.finalHp }, `${orientation} receipt target`);
  equal(run.choiceConstraint, { attackerMoveSlots: [324, 324, 324, 324], opponentAiMoveSlots: want.aiMoves }, `${orientation} receipt choice constraint`);
  equal(run.root, { symbol: "Move_SIGNAL_BEAM", start: "0x82d0eb2", endExclusive: "0x82d0f9a", observations: want.observations, attackerBattler: want.attackerBattler, targetBattler: want.targetBattler, moveResultFlags: 0, moveDamage: want.moveDamage }, `${orientation} root observation`);
  equal(run.romOutcome, { kind: "confuse-hit", targetFinalPartyHp: want.finalHp, targetFinalBattleHp: want.finalHp, targetFinalStatus: "none", battleOutcome: 0 }, `${orientation} stock-ROM outcome`);
  equal(run.pp, { before: [15, 15, 15, 15], after: want.ppAfter, spent: 1 }, `${orientation} PP use`);
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
  schema: "signal-beam-source-staging-verifier/v1", auditRunSha256: receipt.source.auditRunSha256,
  runs: Object.fromEntries((Object.keys(expected) as Orientation[]).map((orientation) => [orientation, { outputSha256: receipt.runs[orientation].outputSha256, rootObservations: receipt.runs[orientation].root.observations }])),
}, null, 2));
