/** Hermetic verifier for the compact, no-credit MOVE_OVERHEAT staging receipt. */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): Buffer => readFileSync(resolve(root, path));
const json = (path: string): Json => JSON.parse(read(path).toString("utf8")) as Json;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const stable = (value: any): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const components = [
  "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_SMALL_EMBER", "task:AnimTask_AllocBackupPalBuffer",
  "task:AnimTask_CopyPalFadedToUnfaded", "task:AnimTask_CopyPalUnfadedFromBackup", "task:AnimTask_CopyPalUnfadedToBackup",
  "task:AnimTask_FreeBackupPalBuffer", "task:AnimTask_ShakeMon", "visualCommand:blendoff", "visualCommand:clearmonbg",
  "visualCommand:create_basic_hitsplat_sprite", "visualCommand:create_overheat_flame_sprite", "visualCommand:monbg",
  "visualCommand:setalpha", "visualCommand:simple_palette_blend",
];
const carrierIndices = [299, 328, 337, 357, 474, 589, 611, 618, 636, 643, 647, 656, 685, 707, 714, 718, 732, 739, 742, 743, 752, 769, 791];
const allCarrierIndices = [...carrierIndices, 874, 875];
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"].sort();
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort();
const noCreditScope = {
  framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false,
  latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false,
  typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, coverageEntryAdded: false,
  componentTrackFulfilled: false, battleStateInjected: false, transientOverrides: [], boundaryOrBarrierChanged: false,
  noTimingOrLatchTransfer: true,
};

function fail(message: string): never { throw new Error(`MOVE_OVERHEAT staging drift: ${message}`); }
function equal(actual: unknown, expected: unknown, label: string): void {
  if (stable(actual) !== stable(expected)) fail(`${label}: ${stable(actual)} !== ${stable(expected)}`);
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
  const result = spawnSync("python3", ["-c", ["import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request", "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')"].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
  if (result.status !== 0 || result.stderr) fail(`stage validation failed for ${path}: ${result.stderr || result.stdout}`);
}
function expectBodyRecord(record: Json, label: string): void {
  if (!record.source?.path?.startsWith("src/") || !/^[0-9a-f]{64}$/u.test(record.source.sha256) || !record.rom?.elf?.image?.endsWith("pokeemerald.elf") || !/^0x08/u.test(record.rom.start) || !/^0x08/u.test(record.rom.endExclusive) || !/^[0-9a-f]{64}$/u.test(record.rom.romSha256)) fail(`unpinned direct body ${label}`);
}

const receipt = json("tools/compare/fixtures/overheat-staging-receipt.json");
const coverage = json("ANIMATION_COVERAGE.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/overheatSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 << 20 });
const audit = JSON.parse(auditText) as Json;

equal([receipt.schema, receipt.oracleProfile, receipt.move, receipt.moveId, receipt.status, receipt.coverageCredit], ["overheat-compact-staging-receipt/v1", "battle-scene-on", "MOVE_OVERHEAT", 315, "unsupported-source-staging-checkpoint", false], "receipt identity");
equal(sha(read(receipt.source.audit)), receipt.source.auditSha256, "source audit file hash");
equal(sha(read(receipt.source.probe)), receipt.source.probeSha256, "probe hash");
equal(sha(auditText), receipt.source.auditRunSha256, "source audit output hash");
equal(receipt.source.pointerOwnedRoot, { symbol: "Move_OVERHEAT", elf: "reference/pokeemerald/pokeemerald.elf", start: "0x082d6694", endExclusive: "0x082d6986", byteLength: 754, romSha256: "04d271b2b39997488524ec3401e116c521f65240d8f9980238b6b8c7e1a1697c" }, "pointer-owned root receipt");
equal(audit.source.pointerOwnedRoot.rom, { symbol: "Move_OVERHEAT", elf: { image: "reference/pokeemerald/pokeemerald.elf", symbol: "Move_OVERHEAT", start: "0x082d6694", endExclusive: "0x082d6986", byteLength: 754 }, start: "0x082d6694", endExclusive: "0x082d6986", byteLength: 754, romSha256: "04d271b2b39997488524ec3401e116c521f65240d8f9980238b6b8c7e1a1697c" }, "pointer-owned root audit");
equal(audit.source.pointerOwnedRoot.branches, { directlyReachableBlocks: ["Move_OVERHEAT"], dispatchedBranches: [], complete: true }, "complete root graph");
equal(audit.graph.components, components, "generated component graph");
equal(audit.graph.coverage, { entryPresent: false, queueContainsMove: false, componentTrackPresent: false }, "coverage-absent graph state");
equal(audit.source.commands.length, 79, "root command count");
equal(audit.source.commandSummary.flameRows, 24, "flame lattice count");
equal(audit.source.commandSummary.flameAngles, [0, 32, 64, 96, 128, 160, 192, 224], "flame lattice angles");
equal(audit.source.commandSummary.flameYRows, [-20, 0, 10], "flame lattice rows");
equal(audit.source.commandSummary.targetHitSplats.length, 4, "target hit splats");
equal(audit.source.commandSummary.paletteBlends.length, 5, "palette-blend schedule");
equal(audit.source.commandSummary.visualTasks.length, 11, "visual task schedule");
equal(audit.source.commandSummary.audio, ["playsewithpan SE_M_DRAGON_RAGE, SOUND_PAN_ATTACKER", "playsewithpan SE_M_FLAME_WHEEL2, SOUND_PAN_ATTACKER", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET"], "audio schedule");
equal(audit.source.commandSummary.cleanup.at(-1), "end", "cleanup terminator");
for (const [group, records] of Object.entries(audit.source.directBodies) as [string, Json][]) for (const [name, record] of Object.entries(records) as [string, Json][]) expectBodyRecord(record, `${group}.${name}`);
for (const asset of ["smallEmber", "impact"]) {
  const resource = audit.resources[asset] as Json;
  if (!/^[0-9a-f]{64}$/u.test(resource.tag.source.sha256) || !/^[0-9a-f]{64}$/u.test(resource.gfx.source.source.sha256) || !/^[0-9a-f]{64}$/u.test(resource.gfx.rom.romSha256) || !/^[0-9a-f]{64}$/u.test(resource.palette.source.source.sha256) || !/^[0-9a-f]{64}$/u.test(resource.palette.rom.romSha256)) fail(`unpinned ${asset} resource`);
}
equal([audit.resources.audio.dragonRage.id, audit.resources.audio.flameWheel2.id, audit.resources.audio.firePunch.id], [171, 145, 147], "audio identities");
equal(audit.behavior, { move: { effect: "EFFECT_OVERHEAT", power: 140, accuracy: 90, pp: 5, secondaryEffectChance: 100, target: "MOVE_TARGET_SELECTED" }, monbg: "ANIM_DEF_PARTNER", alpha: [12, 18], attackerShake: ["ANIM_ATTACKER", 2, 0, 15, 1], targetShake: ["ANIM_TARGET", 10, 0, 25, 1], targetHits: [[-5, 3], [8, -5], [10, 10], [0, 0]] }, "source behavior");
equal(audit.carriers.allFactory.map((entry: Json) => entry.index), allCarrierIndices, "complete Factory carrier census");
equal(audit.carriers.level50.map((entry: Json) => entry.index), carrierIndices, "complete Level-50 carrier census");
equal(audit.carriers.excludedOutsideLevel50, [874, 875], "non-Level-50 exclusions");
equal([audit.carriers.factoryCount, audit.carriers.level50Count, audit.carriers.inventory.frontierMonCount, audit.carriers.inventory.speciesCount], [25, 23, 23, 15], "carrier counts");
equal(Object.keys(audit.controls.named).sort(), ["MOVE_BLAST_BURN", "MOVE_FIRE_PUNCH", "MOVE_OUTRAGE", "MOVE_PSYCHO_BOOST"], "identity-only controls");
if (!audit.controls.kind.includes("no Overheat timing")) fail("identity-only control scope");
for (const [key, value] of Object.entries(audit.checkpoint)) {
  if (["sourceAudit", "completePointerOwnedRoot", "commandOrder", "completeReachableVisualGraph", "directTaskCallbackResourceBodies", "fullFactoryCarrierCensus", "completeLevel50CarrierCensus", "legalBilateralPartyOnlyStaging", "oracleFreshnessCheckedBeforeLocalMgba", "compactBilateralEndpointReceipts", "twiceFreshPerOrientation", "unsupportedNoCreditBoundary"].includes(key)) {
    if (value !== true) fail(`checkpoint ${key}`);
  } else if (value !== false) fail(`no-credit checkpoint ${key}`);
}
if (coverage.entries.find((entry: Json) => entry.move === "MOVE_OVERHEAT")?.status !== "exact"
  || coverage.queue.includes("MOVE_OVERHEAT")
  || coverage.componentTracks.some((track: Json) => track.representatives?.includes("MOVE_OVERHEAT"))) fail("MOVE_OVERHEAT must be exact, queue-empty, and track-absent");
equal(receipt.factoryLegalSelection, {
  playerBackCarrier: { setId: 328, name: "FRONTIER_MON_SOLROCK_2", species: 349 },
  opponentFrontCarrier: { setId: 299, name: "FRONTIER_MON_MAGCARGO_2", species: 219 },
  allSourceCarriers: allCarrierIndices, level50Carriers: carrierIndices, excludedOutsideLevel50: [874, 875],
  sourceRoute: { challengeNum: 2, battleNum: 2, trainerId: 110 }, partyBeforeInit: true,
  choiceConstraint: "Both orientations build complete legal three-Pokémon parties before battle initialization. The source-set Solrock/Magcargo carrier has four Overheat slots; the Shuckle control has four Tackle slots. The regular input trace and stock Factory AI select the action without injected battle state.",
}, "legal bilateral source selection");
if (receipt.freshness.check !== "tools/check-oracle-freshness.sh" || receipt.freshness.exitCode !== 2 || !receipt.freshness.diagnostic.includes("could not read start time") || receipt.freshness.sharedOracleCaptureUsed || receipt.freshness.localMgbaWrapper !== "tools/run-mgba-probe.py") fail("freshness guard record");

const expected: Record<Orientation, Json> = {
  "player-back": { scenario: "tools/battle-lab/mechanic-overheat-player-solrock-opponent-shuckle.json", scenarioSha256: "bbc440fe80d609b5b274ab73376191d327fa28194c64285ce17bad1ef8bb621f", outputSha256: "7b31b91543b0261b14e16a4cbf2fe3a9ca5e8db6c428ba1a2724212baef64525", attacker: ["player", 349, 0], target: ["opponent", 213, 0, 110], battlers: [0, 1], ppAfter: [4, 5, 5, 5], aiMoves: [150, 150, 150, 150], bench: "ca6b79b80ed920f01aeec71ece4624c3f0657541d7f9cbc110a3016afabf482b" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-overheat-opponent-magcargo-player-shuckle.json", scenarioSha256: "673a3d9d2e4f5029710d6060d7751a98b9f9a5157d6c0ecf3435bec2fe3d65f8", outputSha256: "14e5f7547ac3cedcab866273b0ad729d6d16f15a739a65ef864d337fa2095a99", attacker: ["opponent", 219, 1], target: ["player", 213, 0, 90], battlers: [1, 0], ppAfter: [5, 5, 4, 5], aiMoves: [315, 315, 315, 315], bench: "06b138400b7b12e46ad72ec431b6581d9734993d32e3f044cbd279678d1daaba" },
};
for (const orientation of Object.keys(expected) as Orientation[]) {
  const want = expected[orientation];
  const run = receipt.runs[orientation] as Json;
  const output = run.output as Json;
  const stage = json(want.scenario);
  validateStage(want.scenario);
  equal(sha(read(want.scenario)), want.scenarioSha256, `${orientation} scenario hash`);
  equal([stage.schemaVersion, stage.mode, stage.profile, stage.level, stage.challengeNum, stage.battleNum, stage.trainerId, stage.seed], [1, "mechanicLab", "battle-scene-on", 50, 2, 2, 110, 305420315], `${orientation} stage identity`);
  equal([stage.playerSetIds, stage.opponentSetIds], [[328, 329, 330], [299, 300, 301]], `${orientation} Factory source sets`);
  equal(Object.keys(stage.overrides), ["parties"], `${orientation} party-only override`);
  equal(stage.trace, { segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 1400, buttons: [] }] }, `${orientation} ordinary trace`);
  for (const side of ["player", "opponent"] as const) {
    const party = stage.overrides.parties[side] as Json[];
    if (party.length !== 3) fail(`${orientation} ${side} party length`);
    for (const mon of party) {
      equal(Object.keys(mon).sort(), completeKeys, `${orientation} ${side} complete party record`);
      equal(Object.keys(mon.ivs).sort(), statKeys, `${orientation} ${side} IVs`);
      equal(Object.keys(mon.evs).sort(), statKeys, `${orientation} ${side} EVs`);
      for (const transient of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) if (Object.hasOwn(mon, transient)) fail(`${orientation} injects transient ${transient}`);
    }
  }
  const attackerSide = want.attacker[0] as "player" | "opponent";
  const targetSide = want.target[0] as "player" | "opponent";
  equal(stage.overrides.parties[attackerSide][0].moves, [315, 315, 315, 315], `${orientation} Overheat constraint`);
  equal(stage.overrides.parties[targetSide][0].moves, [150, 150, 150, 150], `${orientation} Tackle control`);
  equal([run.seed, run.freshRuns, run.outputsByteIdentical, run.outputSha256], [305420315, 2, true, want.outputSha256], `${orientation} twice-fresh receipt`);
  equal(sha(`${stable(output)}\n`), want.outputSha256, `${orientation} compact output digest`);
  equal([output.schema, output.oracleProfile, output.move, output.moveId, output.sourceInitialized, output.customPartiesBuiltBeforeBattle, output.transientFreeSetup], ["overheat-compact-staging/v1", "battle-scene-on", "MOVE_OVERHEAT", 315, true, true, true], `${orientation} stock setup`);
  equal(output.attacker, { side: want.attacker[0], species: want.attacker[1], partyIndex: 0, level: 50, moves: [315, 315, 315, 315] }, `${orientation} attacker`);
  equal(output.target, { side: want.target[0], species: want.target[1], partyIndex: 0, level: 50, initialHp: 127, maxHp: 127, finalHp: want.target[3] }, `${orientation} target`);
  equal(output.choiceConstraint, { attackerMoveSlots: [315, 315, 315, 315], opponentAiMoveSlots: want.aiMoves }, `${orientation} move choice constraint`);
  equal(output.root, { symbol: "Move_OVERHEAT", start: "0x82d6694", endExclusive: "0x82d6986", observations: 229, first: { attackerBattler: want.battlers[0], battleOutcome: 0, currentMove: 315, scriptActive: true, scriptPointer: "0x82d6694", soundTasks: 0, targetBattleHp: 127, targetBattler: want.battlers[1], targetPartyHp: 127, visualTasks: 0 } }, `${orientation} whole source root`);
  equal(output.romOutcome, { kind: "damaging-overheat-hit", targetFinalPartyHp: want.target[3], targetFinalBattleHp: want.target[3], targetFinalStatus: { kind: "none" }, battleOutcome: 0 }, `${orientation} stock outcome`);
  equal(output.pp, { before: [5, 5, 5, 5], after: want.ppAfter, spent: 1 }, `${orientation} one PP`);
  equal(output.cleanup, { visualTasks: 0, soundTasks: 0 }, `${orientation} cleanup`);
  equal(output.benches, { partyIndices: [1, 2], unchanged: true, checksumValid: true, beforeSha256: want.bench, afterSha256: want.bench }, `${orientation} benches`);
  equal(output.scope, noCreditScope, `${orientation} no-credit scope`);
}
equal(receipt.scope, noCreditScope, "receipt no-credit scope");
if (!receipt.remainder.includes("unsupported") || !receipt.remainder.includes("dense bilateral") || !receipt.remainder.includes("latch")) fail("bounded next action");

console.log(JSON.stringify({
  schema: "overheat-source-staging-verifier/v1",
  auditRunSha256: receipt.source.auditRunSha256,
  runs: Object.fromEntries((Object.keys(expected) as Orientation[]).map((orientation) => [orientation, { outputSha256: receipt.runs[orientation].outputSha256, rootObservations: receipt.runs[orientation].output.root.observations, ppSpent: receipt.runs[orientation].output.pp.spent }])),
}, null, 2));
