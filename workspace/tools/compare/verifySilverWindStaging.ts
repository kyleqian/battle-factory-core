/** Hermetic verifier for the MOVE_SILVER_WIND source/legal staging receipt. */
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
const fail = (message: string): never => { throw new Error(`MOVE_SILVER_WIND staging drift: ${message}`); };
const equal = (actual: unknown, expected: unknown, label: string): void => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
};
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

const receipt = json("tools/compare/fixtures/silver-wind-staging-receipt.json");
const coverage = json("ANIMATION_COVERAGE.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/silverWindSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const audit = JSON.parse(auditText) as Json;

equal([receipt.schema, receipt.oracleProfile, receipt.move, receipt.moveId, receipt.status, receipt.coverageCredit], ["silver-wind-compact-staging-receipt/v1", "battle-scene-on", "MOVE_SILVER_WIND", 318, "unsupported-source-staging-checkpoint", false], "receipt identity");
equal(sha(auditText), receipt.source.auditRunSha256, "source audit run hash");
equal(sha(read(receipt.source.audit)), receipt.source.auditSha256, "source audit file hash");
equal(sha(read(receipt.source.probe)), receipt.source.probeSha256, "probe file hash");
equal(audit.source.pointerOwnedRoot.rom, receipt.source.pointerOwnedRoot, "pointer-owned ROM/ELF interval");
if (audit.graph.coverage.entryPresent || audit.graph.coverage.queueContainsMove || coverage.entries.some((entry: Json) => entry.move === "MOVE_SILVER_WIND") || coverage.queue.includes("MOVE_SILVER_WIND")) fail("coverage/queue boundary");
if (!audit.checkpoint.sourceAudit || !audit.checkpoint.completePointerOwnedRoot || !audit.checkpoint.completeReachableVisualGraph || !audit.checkpoint.directTaskCallbackResourceBodies || !audit.checkpoint.fullFactoryCarrierCensus || !audit.checkpoint.completeLevel50CarrierCensus || !audit.checkpoint.legalBilateralPartyOnlyStaging || !audit.checkpoint.compactBilateralEndpointReceipts || !audit.checkpoint.twiceFreshPerOrientation || !audit.checkpoint.unsupportedNoCreditBoundary) fail("source checkpoint boundary");
for (const key of ["denseWindowCaptured", "rawRgbRetained", "latchMeasured", "durableLatchRowAdded", "productionChanged", "reducerAdded", "typedSceneOnSeam", "compositorAdded", "framebufferAcceptance", "coveragePromotion", "coverageEntryAdded", "componentTrackFulfilled", "queueChanged", "boundaryOrBarrierChanged", "gameplayStateOwned"]) if (audit.checkpoint[key] !== false) fail(`audit no-credit scope ${key}`);
equal(receipt.factoryLegalSelection, {
  lowestLevel50Carrier: { setId: 153, name: "FRONTIER_MON_BUTTERFREE", species: 12 },
  allSourceCarriers: [21, 153, 157, 158, 172, 173, 198, 226, 278, 368, 519, 711],
  level50Carriers: [153, 157, 158, 172, 173, 198, 226, 278, 368, 519, 711], excludedOutsideLevel50: [21],
  sourceRoute: { challengeNum: 0, level50SetRange: [110, 199], trainerId: 50 }, partyBeforeInit: true,
  choiceConstraint: "Both orientations build complete legal three-Pokémon parties before battle initialization. Butterfree has four Silver Wind slots; Onix has four Tackle slots. Ordinary controller input selects the player action and stock AI selects the opponent action without transient battle-state injection.",
}, "Factory/Level-50 carrier census");

const expected: Record<Orientation, Json> = {
  "player-back": { scenario: "tools/battle-lab/mechanic-silver-wind-player-butterfree-opponent-onix.json", sha: "ce7e8ec0d324499824e9624618c0f787c698373f8fa570e2b1dd413d3a972b37", attacker: "player", target: "opponent", playerSets: [153, 156, 180], opponentSets: [135, 188, 184], outputSha: "6f67295907bbb3247529c66ee8d0bf75bdcff8844e224923d2a046a03a45c4c4", observations: 192, attackerBattler: 0, targetBattler: 1, pp: [4, 5, 5, 5], bench: "658293189675442b5e24c6766926198021c6e4570f373289e45fcdb99775f466", aiMoves: [33, 33, 33, 33] },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-silver-wind-opponent-butterfree-player-onix.json", sha: "6b7d7bf18a8a829cf7257a761c879256a548d48f240b9e5a7e2b70f804570aac", attacker: "opponent", target: "player", playerSets: [135, 188, 184], opponentSets: [153, 156, 180], outputSha: "80a40dcaad79e20c8a36eaf3d6e5a60169a8e33c6ec471485c3e894025bfe885", observations: 195, attackerBattler: 1, targetBattler: 0, pp: [5, 4, 5, 5], bench: "6bf776b7ad3d9b14deeb0e26fb29b60d2d52a38e8fcdc02cd21ede118b41148c", aiMoves: [318, 318, 318, 318] },
};
for (const orientation of Object.keys(expected) as Orientation[]) {
  const want = expected[orientation];
  const run = receipt.runs[orientation] as Json;
  const stage = json(want.scenario);
  validateStage(want.scenario);
  equal(sha(read(want.scenario)), want.sha, `${orientation} scenario hash`);
  equal(run.scenarioSha256, want.sha, `${orientation} retained scenario hash`);
  equal([stage.schemaVersion, stage.mode, stage.profile, stage.level, stage.challengeNum, stage.battleNum, stage.trainerId, stage.seed], [1, "mechanicLab", "battle-scene-on", 50, 0, 0, 50, 305420318], `${orientation} stage identity`);
  equal(stage.playerSetIds, want.playerSets, `${orientation} player set ids`);
  equal(stage.opponentSetIds, want.opponentSets, `${orientation} opponent set ids`);
  equal(stage.trace, { segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 1400, buttons: [] }] }, `${orientation} ordinary controller trace`);
  equal(Object.keys(stage.overrides), ["parties"], `${orientation} party-only override`);
  for (const side of ["player", "opponent"] as const) {
    const party = stage.overrides.parties[side] as Json[];
    if (party.length !== 3 || new Set(party.map((mon) => mon.species)).size !== 3 || new Set(party.map((mon) => mon.item)).size !== 3) fail(`${orientation} ${side} legal three-Pokémon party`);
    for (const mon of party) {
      equal(Object.keys(mon).sort(), completeKeys, `${orientation} ${side} complete party record`);
      equal(Object.keys(mon.ivs).sort(), statKeys, `${orientation} ${side} complete IV record`);
      equal(Object.keys(mon.evs).sort(), statKeys, `${orientation} ${side} complete EV record`);
      for (const injected of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) if (Object.hasOwn(mon, injected)) fail(`${orientation} injects ${injected}`);
    }
  }
  equal(stage.overrides.parties[want.attacker][0].moves, [318, 318, 318, 318], `${orientation} four-slot Silver Wind constraint`);
  equal(stage.overrides.parties[want.target][0].moves, [33, 33, 33, 33], `${orientation} Onix control constraint`);
  equal([run.seed, run.freshRuns, run.outputsByteIdentical, run.outputSha256], [305420318, 2, true, want.outputSha], `${orientation} twice-fresh compact receipt`);
  equal(run.output.attacker, { side: want.attacker, partyIndex: 0, species: 12, level: 50, moves: [318, 318, 318, 318] }, `${orientation} receipt attacker`);
  equal(run.output.target, { side: want.target, partyIndex: 0, species: 95, level: 50, initialHp: 110, maxHp: 110, finalHp: 96 }, `${orientation} receipt target`);
  equal(run.output.choiceConstraint, { attackerMoveSlots: [318, 318, 318, 318], opponentAiMoveSlots: want.aiMoves }, `${orientation} stock choice constraint`);
  equal(run.output.root, { symbol: "Move_SILVER_WIND", start: "0x82d630b", endExclusive: "0x82d6523", observations: want.observations, attackerBattler: want.attackerBattler, targetBattler: want.targetBattler }, `${orientation} source root`);
  equal(run.output.romOutcome, { kind: "damaging-silver-wind-hit", targetFinalPartyHp: 96, targetFinalBattleHp: 96, targetFinalStatus: { kind: "none" }, battleOutcome: 0 }, `${orientation} stock ROM outcome`);
  equal(run.output.pp, { before: [5, 5, 5, 5], after: want.pp, spent: 1 }, `${orientation} one PP`);
  equal(run.output.cleanup, { visualTasks: 0, soundTasks: 0 }, `${orientation} cleanup`);
  equal(run.output.benches, { partyIndices: [1, 2], unchanged: true, checksumValid: true, beforeSha256: want.bench, afterSha256: want.bench }, `${orientation} unchanged benches`);
  if (run.output.sourceInitialized !== true || run.output.customPartiesBuiltBeforeBattle !== true || run.output.transientFreeSetup !== true) fail(`${orientation} party-before-init state`);
}
const noCreditScope = { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false, battleStateInjected: false, transientOverrides: [], boundaryOrBarrierChanged: false, noTimingOrLatchTransfer: true };
equal(receipt.scope, noCreditScope, "no-credit scope");
if (!receipt.remainder.includes("unsupported") || !receipt.remainder.includes("dense bilateral") || !receipt.remainder.includes("latch") || !receipt.remainder.includes("reducer")) fail("bounded remainder");

console.log(JSON.stringify({
  schema: "silver-wind-source-staging-verifier/v1", auditRunSha256: receipt.source.auditRunSha256,
  runs: Object.fromEntries((Object.keys(expected) as Orientation[]).map((orientation) => [orientation, { outputSha256: receipt.runs[orientation].outputSha256, rootObservations: receipt.runs[orientation].output.root.observations, ppSpent: receipt.runs[orientation].output.pp.spent }])),
}, null, 2));
