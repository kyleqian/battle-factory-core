/** Hermetic verifier for the MOVE_MACH_PUNCH source/legal-staging checkpoint. */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const json = (path: string): Json => JSON.parse(read(path)) as Json;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"].sort();
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort();
const components = ["asset:ANIM_TAG_HANDS_AND_FEET", "asset:ANIM_TAG_IMPACT", "subroutine:MachPunchAgainstPlayer", "subroutine:MachPunchContinue", "task:AnimTask_AttackerPunchWithTrace", "task:AnimTask_GetAttackerSide", "task:AnimTask_ShakeMon", "task:AnimTask_StartSlidingBg", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:create_fist_sprite", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout"];
function fail(message: string): never { throw new Error(`MOVE_MACH_PUNCH staging drift: ${message}`); }
function equal(actual: unknown, expected: unknown, label: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); }
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
  const result = spawnSync("python3", ["-c", ["import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request", "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')"].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
  if (result.status !== 0 || result.stderr) fail(`stage validation failed for ${path}: ${result.stderr || result.stdout}`);
}

const receipt = json("tools/compare/fixtures/mach-punch-staging-receipt.json");
const coverage = json("ANIMATION_COVERAGE.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/machPunchSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
const audit = JSON.parse(auditText) as Json;
equal([receipt.schema, receipt.oracleProfile, receipt.move, receipt.moveId, receipt.status, receipt.coverageCredit], ["mach-punch-compact-staging-receipt/v1", "battle-scene-on", "MOVE_MACH_PUNCH", 183, "unsupported-source-staging-checkpoint", false], "receipt identity");
equal(sha(read(receipt.source.audit)), receipt.source.auditSha256, "source audit file hash");
equal(sha(auditText), receipt.source.auditRunSha256, "source audit output hash");
equal(sha(read(receipt.source.probe)), receipt.source.probeSha256, "probe hash");
equal(receipt.source.pointerOwnedRoot, { symbol: "Move_MACH_PUNCH", start: "0x082cd565", endExclusive: "0x082cd5ed", byteLength: 136, romSha256: "b437f773d63fa1ef5062f58c478fdeb43dbdcd98351ad97b9da794097a6db4ff" }, "root interval");
equal(audit.graph.components, components, "generated component graph");
equal(audit.graph.unrepresented, ["subroutine:MachPunchAgainstPlayer", "subroutine:MachPunchContinue"], "unrepresented move-owned blocks");
equal(audit.carriers.allSourceCarriers.map((entry: Json) => entry.index), [15, 32, 234, 236, 339, 382], "all source carriers");
equal(audit.carriers.level50.map((entry: Json) => entry.index), [234, 236, 339, 382], "Level-50 carriers");
equal(receipt.factoryLegalSelection.carrier, { setId: 234, name: "FRONTIER_MON_HITMONCHAN_1", species: 107 }, "lowest legal carrier");
equal(receipt.factoryLegalSelection.sourceRoute, { challengeNum: 1, level50SetRange: [162, 266], trainerId: 100 }, "legal source route");
if (!audit.checkpoint.sourceAudit || !audit.checkpoint.completePointerOwnedRoot || !audit.checkpoint.completeReachableBranches || !audit.checkpoint.completeCarrierCensus || !audit.checkpoint.legalBilateralPartyOnlyStaging || !audit.checkpoint.oracleOrMgbaInvoked || !audit.checkpoint.compactBilateralEndpointReceipts || !audit.checkpoint.twiceFreshPerOrientation || audit.checkpoint.denseWindowCaptured || audit.checkpoint.latchMeasured || audit.checkpoint.reducerAdded || audit.checkpoint.typedSceneOnSeam || audit.checkpoint.compositorAdded || audit.checkpoint.framebufferAcceptance || audit.checkpoint.coveragePromotion || audit.checkpoint.componentTrackFulfilled || audit.checkpoint.latchPromotion || audit.checkpoint.boundaryOrBarrierChanged || audit.checkpoint.gameplayStateOwned || !audit.checkpoint.unsupportedNoCreditBoundary) fail("source checkpoint scope");
const machPunchTracks = coverage.componentTracks.filter((track: Json) => track.representatives?.includes("MOVE_MACH_PUNCH"));
if (coverage.entries.some((entry: Json) => entry.move === "MOVE_MACH_PUNCH") || coverage.queue.length !== 0 || machPunchTracks.length !== 1 || machPunchTracks[0].id !== "mach-punch-source-relative-body" || machPunchTracks[0].fulfilled !== false) fail("unsupported/no-queue/unfulfilled-track boundary");

const expected: Record<Orientation, Json> = {
  "player-back": { scenario: "tools/battle-lab/mechanic-mach-punch-player-hitmonchan-opponent-chansey.json", scenarioSha: "f44abd79243ff3f8f4a349b510e01e0fe604aeaa0ef80b4cd0636933ede4c342", attacker: "player", target: "opponent", playerSetIds: [234, 180, 190], opponentSetIds: [162, 163, 165], pp: [29, 30, 30, 30], aiMoves: [33, 33, 33, 33], battlers: [0, 1], hp: 8, damage: 349, observations: 110, bench: "bb12c91210bd1537595ed7b1f483b0751a95cc7f3e509bf7d8726ef5235b37a1", output: "d183caed41ed2f37a6af710121db7b043c773473786dcf83a030e9f7ef2e7e92" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-mach-punch-opponent-hitmonchan-player-chansey.json", scenarioSha: "11693defd294a36823f4e3260694c89873abbb8bcc1c6b5e28cb6c317949479f", attacker: "opponent", target: "player", playerSetIds: [162, 163, 165], opponentSetIds: [234, 180, 190], pp: [30, 30, 29, 30], aiMoves: [183, 183, 183, 183], battlers: [1, 0], hp: 15, damage: 342, observations: 109, bench: "47fd0dd2785bff37f3997aca51dcc3d69be77f9ae558473702768aa4017ae400", output: "e945c303a29b09bbe2dc4cc75d89b026835038f926f6e6fa743365655977a71b" },
};
for (const orientation of Object.keys(expected) as Orientation[]) {
  const want = expected[orientation];
  const run = receipt.runs[orientation] as Json;
  const stage = json(want.scenario);
  validateStage(want.scenario);
  equal(sha(read(want.scenario)), want.scenarioSha, `${orientation} scenario hash`);
  equal([stage.schemaVersion, stage.mode, stage.profile, stage.level, stage.challengeNum, stage.battleNum, stage.trainerId, stage.seed], [1, "mechanicLab", "battle-scene-on", 50, 1, 0, 100, 305420471], `${orientation} stage identity`);
  equal(stage.playerSetIds, want.playerSetIds, `${orientation} player source sets`);
  equal(stage.opponentSetIds, want.opponentSetIds, `${orientation} opponent source sets`);
  equal(Object.keys(stage.overrides), ["parties"], `${orientation} party-only override`);
  equal(stage.trace, { segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 1200, buttons: [] }] }, `${orientation} ordinary trace`);
  for (const side of ["player", "opponent"] as const) {
    const party = stage.overrides.parties[side] as Json[];
    if (party.length !== 3 || new Set(party.map((mon) => mon.species)).size !== 3 || new Set(party.map((mon) => mon.item)).size !== 3) fail(`${orientation} ${side} complete unique party`);
    for (const mon of party) {
      equal(Object.keys(mon).sort(), completeKeys, `${orientation} ${side} complete party record`);
      equal(Object.keys(mon.ivs).sort(), statKeys, `${orientation} ${side} IVs`);
      equal(Object.keys(mon.evs).sort(), statKeys, `${orientation} ${side} EVs`);
      for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) if (Object.hasOwn(mon, key)) fail(`${orientation} injects transient ${key}`);
    }
  }
  equal(stage.overrides.parties[want.attacker][0].moves, [183, 183, 183, 183], `${orientation} Mach Punch constraint`);
  equal(stage.overrides.parties[want.target][0].moves, [33, 33, 33, 33], `${orientation} Tackle control`);
  equal([run.seed, run.freshRuns, run.outputsByteIdentical, run.outputSha256, run.sourceInitialized, run.customPartiesBuiltBeforeBattle], [305420471, 2, true, want.output, true, true], `${orientation} fresh receipt`);
  equal(run.attacker, { side: want.attacker, partyIndex: 0, species: 107, level: 50, moves: [183, 183, 183, 183] }, `${orientation} attacker`);
  equal(run.target, { side: want.target, partyIndex: 0, species: 113, level: 50, initialHp: 357, maxHp: 357, finalHp: want.hp }, `${orientation} target`);
  equal(run.choiceConstraint, { attackerMoveSlots: [183, 183, 183, 183], opponentAiMoveSlots: want.aiMoves }, `${orientation} choice constraint`);
  equal(run.root, { symbol: "Move_MACH_PUNCH", start: "0x82cd565", endExclusive: "0x82cd5ed", observations: want.observations, attackerBattler: want.battlers[0], targetBattler: want.battlers[1], moveResultFlags: 2, moveDamage: want.damage }, `${orientation} source root`);
  equal(run.romOutcome, { kind: "damaging-priority-hit", targetFinalPartyHp: want.hp, targetFinalBattleHp: want.hp, targetFinalStatus: "none", battleOutcome: 0 }, `${orientation} outcome`);
  equal(run.pp, { before: [30, 30, 30, 30], after: want.pp, spent: 1 }, `${orientation} PP`);
  equal(run.benches, { partyIndices: [1, 2], unchanged: true, checksumValid: true, beforeSha256: want.bench, afterSha256: want.bench }, `${orientation} benches`);
  if (run.transientFreeSetup !== true) fail(`${orientation} transient-free setup`);
}
equal(receipt.scope, { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [], battleStateInjected: false, entryHooksSkipped: false, noTimingOrLatchTransfer: true }, "scope");
console.log(JSON.stringify({ schema: "mach-punch-source-staging-verifier/v1", auditRunSha256: receipt.source.auditRunSha256, runs: Object.fromEntries((Object.keys(expected) as Orientation[]).map((orientation) => [orientation, { outputSha256: receipt.runs[orientation].outputSha256, rootObservations: receipt.runs[orientation].root.observations }])) }, null, 2));
