/** Hermetic verifier for the MOVE_PSYCH_UP source/legal-staging checkpoint. */
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
const components = ["asset:ANIM_TAG_SPIRAL", "sprite:gPsychUpSpiralSpriteTemplate", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ScaleMonAndRestore", "task:AnimTask_SwayMon", "visualCommand:blend_color_cycleexclude", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha"];
const commands = ["loadspritegfx ANIM_TAG_SPIRAL", "monbg ANIM_ATK_PARTNER", "blend_color_cycleexclude unk0=1, delay=2, num_blends=6, initial_blend_y=1, target_blend_y=11, color=RGB_BLACK", "setalpha 12, 8", "loopsewithpan SE_M_PSYBEAM2, SOUND_PAN_ATTACKER, 5, 10", "createsprite gPsychUpSpiralSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 0, 0", "createvisualtask AnimTask_SwayMon, 5, 0, 5, 2560, 8, ANIM_ATTACKER", "delay 127", "delay 4", "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER", "createvisualtask AnimTask_ScaleMonAndRestore, 5, -5, -5, 10, ANIM_ATTACKER, 1", "createvisualtask AnimTask_BlendBattleAnimPal, 9, F_PAL_ATTACKER, 2, 10, 0, RGB_YELLOW", "delay 30", "clearmonbg ANIM_ATK_PARTNER", "blendoff", "waitforvisualfinish", "end"];
function fail(message: string): never { throw new Error(`MOVE_PSYCH_UP staging drift: ${message}`); }
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

const receipt = json("tools/compare/fixtures/psych-up-staging-receipt.json");
const coverage = json("ANIMATION_COVERAGE.json");
const frontier = json("src/data/gen/battle-frontier-mons.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/psychUpSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const audit = JSON.parse(auditText) as Json;

equal([receipt.schema, receipt.oracleProfile, receipt.move, receipt.moveId, receipt.status, receipt.coverageCredit], ["psych-up-compact-staging-receipt/v1", "battle-scene-on", "MOVE_PSYCH_UP", 244, "unsupported-source-staging-checkpoint", false], "receipt identity");
equal(sha(read(receipt.source.audit)), receipt.source.auditSha256, "source audit file hash");
equal(sha(auditText), receipt.source.auditRunSha256, "source audit output hash");
equal(sha(read(receipt.source.probe)), receipt.source.probeSha256, "probe hash");
equal(receipt.source.pointerOwnedRoot, { symbol: "Move_PSYCH_UP", elf: "reference/pokeemerald/pokeemerald.elf", start: "0x082caaea", endExclusive: "0x082cab5c", byteLength: 114, romSha256: "1f2f503f855e81dba03c471fc740f72f22d3318bb77d82af5a35d3c28adc254f" }, "root source/ELF/ROM interval");
equal(audit.source.pointerOwnedRoot.rom.elf, { image: "reference/pokeemerald/pokeemerald.elf", symbol: "Move_PSYCH_UP", start: "0x082caaea", endExclusive: "0x082cab5c", byteLength: 114 }, "root ELF interval");
equal(audit.source.commands, commands, "complete command order");
equal(audit.graph.components, components, "generated component graph");
equal(audit.graph.track, { id: "psych-up-spiral-palette-cycle", components, representatives: ["MOVE_PSYCH_UP"], fulfilled: false }, "unfulfilled Psych Up component track");
for (const record of [audit.source.directBodies.spiral.template, audit.source.directBodies.spiral.affineProgram, audit.source.directBodies.spiral.affineTable, audit.source.directBodies.spiral.callback, ...Object.values(audit.source.directBodies.tasks).flatMap((task: Json) => Object.values(task)), ...Object.values(audit.source.directBodies.runtimeCommands)]) {
  if (!(record as Json).source || !(record as Json).rom?.elf || !(record as Json).rom?.romSha256) fail("direct source/ELF/ROM body is incomplete");
}
if (!audit.source.directBodies.resources.gfxSource.source || !audit.source.directBodies.resources.paletteSource.source || !audit.source.directBodies.resources.gfx.elf || !audit.source.directBodies.resources.palette.elf) fail("spiral resource source/ELF/ROM body is incomplete");
equal(audit.carriers.allFactory.map((entry: Json) => entry.index), [50, 229, 428, 478, 512, 514, 562, 570, 593, 639, 652, 782, 837, 841, 844], "full Factory carrier census");
equal(audit.carriers.level50.map((entry: Json) => entry.index), [229, 428, 478, 512, 514, 562, 570, 593, 639, 652, 782, 837, 841, 844], "full Level-50 carrier census");
equal(audit.carriers.representative, { index: 229, label: "FRONTIER_MON_JUMPLUFF_1", species: "SPECIES_JUMPLUFF", moves: ["MOVE_AERIAL_ACE", "MOVE_SWAGGER", "MOVE_PSYCH_UP", "MOVE_SYNTHESIS"], itemTableId: 54, itemName: "BATTLE_FRONTIER_ITEM_LAX_INCENSE", evSpread: 9, evSpreadStats: ["F_EV_SPREAD_SPEED", "F_EV_SPREAD_HP"], nature: "NATURE_DOCILE" }, "representative carrier");
for (const move of ["MOVE_LEER", "MOVE_FRUSTRATION", "MOVE_SLEEP_TALK", "MOVE_HYPER_VOICE", "MOVE_SNORE", "MOVE_PSYCHIC", "MOVE_FUTURE_SIGHT"]) if (!audit.controls.named[move]) fail(`missing source/component identity control ${move}`);
if (!audit.controls.kind.includes("identity checks only")) fail("controls grant more than source/component identity");
if (coverage.entries.find((entry: Json) => entry.move === "MOVE_PSYCH_UP")?.status !== "exact" || coverage.queue.includes("MOVE_PSYCH_UP")) fail("exact promoted coverage boundary");
if (!audit.checkpoint.sourceAudit || !audit.checkpoint.completePointerOwnedRoot || !audit.checkpoint.commandOrder || !audit.checkpoint.directTaskCallbackResourceBodies || !audit.checkpoint.fullFactoryCarrierCensus || !audit.checkpoint.completeLevel50CarrierCensus || !audit.checkpoint.legalBilateralPartyOnlyStaging || !audit.checkpoint.oracleFreshnessCheckedBeforeLocalMgba || !audit.checkpoint.compactBilateralEndpointReceipts || !audit.checkpoint.twiceFreshPerOrientation || audit.checkpoint.denseWindowCaptured || audit.checkpoint.latchMeasured || audit.checkpoint.reducerAdded || audit.checkpoint.typedSceneOnSeam || audit.checkpoint.compositorAdded || audit.checkpoint.framebufferAcceptance || audit.checkpoint.coveragePromotion || audit.checkpoint.componentTrackFulfilled || audit.checkpoint.latchPromotion || audit.checkpoint.boundaryOrBarrierChanged || audit.checkpoint.gameplayStateOwned || !audit.checkpoint.unsupportedNoCreditBoundary) fail("checkpoint boundary");

const expected: Record<Orientation, Json> = {
  "player-back": { scenario: "tools/battle-lab/mechanic-psych-up-player-jumpluff-opponent-ninjask.json", scenarioSha: "1e894e4a805d23b2419a91c3aeddc0ef2fe7380f889c6d651e2789f073cee294", attacker: "player", target: "opponent", playerSetIds: [229, 239, 240], opponentSetIds: [238, 241, 242], output: "0cff7447239515bd2a96ecfca356fab9f613c5a39a9ba9600ce237db6c812933", rootBattlers: [0, 1], psychPpAfter: [9, 10, 10, 10], dancePpAfter: [30, 30, 30, 29], bench: "ef2794787b7b5aa7245be2c45b323b5c09cd4f48362e024fa8571293aeea0124" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-psych-up-opponent-jumpluff-player-ninjask.json", scenarioSha: "0e5766e7bafc62b2adc205a156d0b0adef0e0ee7b99a3b5dd0c8318177198c18", attacker: "opponent", target: "player", playerSetIds: [238, 241, 242], opponentSetIds: [229, 239, 240], output: "549e39ee21307fbde6791d863d7cecec86e302600513da30ceaeddd1ce1b47b9", rootBattlers: [1, 0], psychPpAfter: [10, 9, 10, 10], dancePpAfter: [29, 30, 30, 30], bench: "616ec65e7a91875a6f258c526b1a2e332e81b7934f977f04418cf40c8ae3ad36" },
};
for (const orientation of Object.keys(expected) as Orientation[]) {
  const want = expected[orientation];
  const run = receipt.runs[orientation] as Json;
  const stage = json(want.scenario);
  validateStage(want.scenario);
  equal(sha(read(want.scenario)), want.scenarioSha, `${orientation} scenario hash`);
  equal([stage.schemaVersion, stage.mode, stage.profile, stage.level, stage.challengeNum, stage.battleNum, stage.trainerId, stage.seed], [1, "mechanicLab", "battle-scene-on", 50, 1, 0, 100, 305420244], `${orientation} stage identity`);
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
  equal(stage.overrides.parties[want.attacker][0].moves, [244, 244, 244, 244], `${orientation} legal Psych Up slot constraint`);
  equal(stage.overrides.parties[want.target][0].moves, [14, 14, 14, 14], `${orientation} legal Swords Dance slot constraint`);
  const attackerSetId = want.attacker === "player" ? stage.playerSetIds[0] : stage.opponentSetIds[0];
  const targetSetId = want.target === "player" ? stage.playerSetIds[0] : stage.opponentSetIds[0];
  const sourceEntry = (setId: number): Json => frontier.entries.find((entry: Json) => entry.index === setId) ?? fail(`missing Factory source set ${setId}`);
  if (!sourceEntry(attackerSetId).moves.includes("MOVE_PSYCH_UP") || !sourceEntry(targetSetId).moves.includes("MOVE_SWORDS_DANCE")) fail(`${orientation} active move constraints are not Factory-legal`);
  equal([run.seed, run.freshRuns, run.outputsByteIdentical, run.outputSha256, run.sourceInitialized, run.customPartiesBuiltBeforeBattle], [305420244, 2, true, want.output, true, true], `${orientation} twice-fresh receipt`);
  equal(run.attacker, { side: want.attacker, partyIndex: 0, species: 189, level: 50, moves: [244, 244, 244, 244] }, `${orientation} attacker`);
  equal(run.target, { side: want.target, partyIndex: 0, species: 302, level: 50, moves: [14, 14, 14, 14], speed: 212 }, `${orientation} target`);
  equal(run.choiceConstraint, { attackerMoveSlots: [244, 244, 244, 244], targetMoveSlots: [14, 14, 14, 14], targetActsFirst: true }, `${orientation} stock turn-order constraint`);
  equal(run.root, { symbol: "Move_PSYCH_UP", start: "0x82caaea", endExclusive: "0x82cab5c", observations: 178, currentMove: 244, scriptPointer: "0x82caaea", scriptPointerParity: 0, attackerBattler: want.rootBattlers[0], targetBattler: want.rootBattlers[1], attackerStages: [6, 8, 6, 6, 6, 6, 6, 6], targetStages: [6, 8, 6, 6, 6, 6, 6, 6] }, `${orientation} source root`);
  equal(run.romOutcome, { kind: "copies-real-swords-dance-stages", swordsDance: { attackerStages: [6, 6, 6, 6, 6, 6, 6, 6], targetStages: [6, 8, 6, 6, 6, 6, 6, 6] }, attackerFinalStages: [6, 8, 6, 6, 6, 6, 6, 6], targetFinalStages: [6, 8, 6, 7, 6, 6, 6, 6], battleOutcome: 0 }, `${orientation} stock outcome`);
  equal(run.pp, { psychUpBefore: [10, 10, 10, 10], psychUpAfter: want.psychPpAfter, psychUpSpent: 1, swordsDanceBefore: [30, 30, 30, 30], swordsDanceAfter: want.dancePpAfter, swordsDanceSpent: 1 }, `${orientation} one PP per stock move`);
  equal(run.benches, { partyIndices: [1, 2], unchanged: true, checksumValid: true, beforeSha256: want.bench, afterSha256: want.bench }, `${orientation} unchanged checksum-valid benches`);
  if (run.transientFreeSetup !== true) fail(`${orientation} transient-free setup`);
}
equal(receipt.factoryLegalSelection, { representative: { setId: 229, name: "FRONTIER_MON_JUMPLUFF_1", species: 189 }, swordsDanceControl: { setId: 238, name: "FRONTIER_MON_NINJASK_1", species: 302 }, allSourceCarriers: [50, 229, 428, 478, 512, 514, 562, 570, 593, 639, 652, 782, 837, 841, 844], level50Carriers: [229, 428, 478, 512, 514, 562, 570, 593, 639, 652, 782, 837, 841, 844], sourceRoute: { challengeNum: 1, level50SetRange: [162, 266], trainerId: 100 }, partyBeforeInit: true, choiceConstraint: "Both orientations use three complete legal Factory-derived records per side. Jumpluff's four active slots are constrained to its source-set Psych Up, and Ninjask's four active slots are constrained to its source-set Swords Dance; the ROM derives stats and runs entry hooks before either ordinary action." }, "Factory legal staging declaration");
equal(receipt.freshness, { check: "tools/check-oracle-freshness.sh", exitCode: 2, diagnostic: "SKIP: could not read start time for pid 43588 on 8014; SKIP: could not read start time for pid 43560 on 8012; date: 1788164325: No such file or directory; harness HEAD: d5f22d28d Back up lanes before provider preflight ()", sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py" }, "freshness result before local staging");
equal(receipt.scope, { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [], battleStateInjected: false, entryHooksSkipped: false, noTimingOrLatchTransfer: true }, "scope boundary");
console.log(JSON.stringify({ schema: "psych-up-source-staging-verifier/v1", auditRunSha256: receipt.source.auditRunSha256, runs: Object.fromEntries((Object.keys(expected) as Orientation[]).map((orientation) => [orientation, { outputSha256: receipt.runs[orientation].outputSha256, rootObservations: receipt.runs[orientation].root.observations }])) }, null, 2));
