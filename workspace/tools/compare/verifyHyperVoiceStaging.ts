/** Hermetic verifier for the MOVE_HYPER_VOICE source/legal-staging checkpoint. */
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
const components = ["asset:ANIM_TAG_THIN_RING", "sprite:gHyperVoiceRingSpriteTemplate", "subroutine:HyperVoiceEffect", "task:AnimTask_ScaleMonAndRestore", "task:AnimTask_ShakeMon2", "task:SoundTask_PlayCryWithEcho", "task:SoundTask_WaitForCry", "visualCommand:shake_battle_platforms", "visualCommand:simple_palette_blend"];
const commands = [
  "loadspritegfx ANIM_TAG_THIN_RING",
  "createvisualtask SoundTask_PlayCryWithEcho, 5, FALSE",
  "call HyperVoiceEffect",
  "waitforvisualfinish",
  "delay 8",
  "createvisualtask SoundTask_PlayCryWithEcho, 5, TRUE",
  "call HyperVoiceEffect",
  "waitforvisualfinish",
  "end",
  "simple_palette_blend selector=F_PAL_BG | F_PAL_BATTLERS, delay=3, initial_blend_y=8, target_blend_y=0, color=RGB_YELLOW",
  "createvisualtask AnimTask_ScaleMonAndRestore, 5, -5, -5, 5, ANIM_ATTACKER, 0",
  "createsprite gHyperVoiceRingSpriteTemplate, ANIM_ATTACKER, 0, 45, 0, 0, 0, 0, 0, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 1, 0, 6, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_DEF_PARTNER, 1, 0, 6, 1",
  "shake_battle_platforms x_offset=1, y_offset=0, shakes=6, delay=1",
  "createvisualtask SoundTask_WaitForCry, 5",
  "return",
];
function fail(message: string): never { throw new Error(`MOVE_HYPER_VOICE staging drift: ${message}`); }
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
function requireSourceRom(record: Json, label: string): void {
  if (!record.source || !record.rom?.elf || !record.rom?.romSha256) fail(`${label} lacks complete source/ELF/ROM identity`);
}

const receipt = json("tools/compare/fixtures/hyper-voice-staging-receipt.json");
const coverage = json("ANIMATION_COVERAGE.json");
const frontier = json("src/data/gen/battle-frontier-mons.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/hyperVoiceSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const audit = JSON.parse(auditText) as Json;

equal([receipt.schema, receipt.oracleProfile, receipt.move, receipt.moveId, receipt.status, receipt.coverageCredit], ["hyper-voice-compact-staging-receipt/v1", "battle-scene-on", "MOVE_HYPER_VOICE", 304, "unsupported-source-staging-checkpoint", false], "receipt identity");
equal(sha(read(receipt.source.audit)), receipt.source.auditSha256, "source audit file hash");
equal(sha(read(receipt.source.probe)), receipt.source.probeSha256, "probe hash");
equal(receipt.source.pointerOwnedRoot, { symbol: "Move_HYPER_VOICE", elf: "reference/pokeemerald/pokeemerald.elf", start: "0x082d50d6", hyperVoiceEffect: "0x082d50fa", endExclusive: "0x082d516a", byteLength: 148, romSha256: "3a1a178d165c247303bf2476e06dc019215e8939278dfe1a5cfaaeb9a26e3b9b" }, "root source/ELF/ROM interval");
equal(audit.source.pointerOwnedRoot.rom.elf, { image: "reference/pokeemerald/pokeemerald.elf", symbol: "Move_HYPER_VOICE", start: "0x082d50d6", endExclusive: "0x082d516a", byteLength: 148 }, "root ELF interval");
equal(audit.source.pointerOwnedRoot.branches, { directlyReachableBlocks: ["Move_HYPER_VOICE", "HyperVoiceEffect"], dispatchedBranches: ["HyperVoiceEffect"], complete: true }, "complete pointer-owned dispatch graph");
equal(audit.source.commands, commands, "complete command order");
equal(audit.graph.components, components, "generated component graph");
equal(audit.graph.track, { id: "hyper-voice-ring-cry-platform", components, representatives: ["MOVE_HYPER_VOICE"], fulfilled: false }, "unfulfilled Hyper Voice component track");
requireSourceRom(audit.source.directBodies.hyperVoiceEffect, "HyperVoiceEffect");
for (const [name, record] of Object.entries(audit.source.directBodies.ring)) requireSourceRom(record as Json, `ring ${name}`);
for (const [task, bodies] of Object.entries(audit.source.directBodies.tasks)) for (const [name, record] of Object.entries(bodies as Json)) requireSourceRom(record as Json, `${task} ${name}`);
for (const [name, record] of Object.entries(audit.source.directBodies.runtimeCommands)) requireSourceRom(record as Json, `runtime ${name}`);
for (const name of ["gfxSource", "paletteSource", "registryGfx", "registryPalette"]) if (!audit.source.directBodies.resources[name]?.source) fail(`resource ${name} source identity is missing`);
for (const name of ["gfx", "palette"]) if (!audit.source.directBodies.resources[name]?.elf || !audit.source.directBodies.resources[name]?.romSha256) fail(`resource ${name} ELF/ROM identity is missing`);
equal(audit.resources.thinRing, { tag: "ANIM_TAG_THIN_RING", tagValue: 10203, tileBytes: 2048, source: "graphics/battle_anims/sprites/thin_ring.png" }, "Thin Ring resource identity");
equal(audit.behavior, { effectCalls: 2, palette: { selector: "F_PAL_BG | F_PAL_BATTLERS", delay: 3, initialBlendY: 8, targetBlendY: 0, color: "RGB_YELLOW" }, scale: { args: [-5, -5, 5, "ANIM_ATTACKER", 0] }, ring: { args: [45, 0, 0, 0, 0, 0, 1], affine: [[16, 16, 0, 0], [11, 11, 0, 45]] }, targetShake: { args: ["ANIM_TARGET", 1, 0, 6, 1] }, partnerShake: { args: ["ANIM_DEF_PARTNER", 1, 0, 6, 1] }, platforms: { args: [1, 0, 6, 1] }, cries: [false, true], cleanup: ["waitforvisualfinish", "end"] }, "source-derived body semantics");
equal(audit.carriers.allFactory.map((entry: Json) => entry.index), [397], "full Factory carrier census");
equal(audit.carriers.level50.map((entry: Json) => entry.index), [397], "full Level-50 carrier census");
equal(audit.carriers.representative, { index: 397, label: "FRONTIER_MON_EXPLOUD_1", species: "SPECIES_EXPLOUD", moves: ["MOVE_HYPER_VOICE", "MOVE_SHADOW_BALL", "MOVE_SLEEP_TALK", "MOVE_REST"], itemTableId: 4, itemName: "BATTLE_FRONTIER_ITEM_CHESTO_BERRY", evSpread: 3, evSpreadStats: ["F_EV_SPREAD_ATTACK", "F_EV_SPREAD_HP"], nature: "NATURE_IMPISH" }, "representative carrier");
equal(Object.keys(audit.controls.named).sort(), ["MOVE_ROAR", "MOVE_ROCK_TOMB", "MOVE_SNORE", "MOVE_UPROAR"], "identity-only named controls");
for (const move of ["MOVE_UPROAR", "MOVE_ROAR", "MOVE_ROCK_TOMB", "MOVE_SNORE"]) if (!audit.controls.named[move]) fail(`missing source/component identity control ${move}`);
equal(audit.behavior.partnerShake.args, ["ANIM_DEF_PARTNER", 1, 0, 6, 1], "source-owned partner invocation");
if (!audit.controls.kind.includes("identity checks only") || !audit.controls.kind.includes("no Hyper Voice timing")) fail("controls grant more than source/component identity");
if (coverage.entries.find((entry: Json) => entry.move === "MOVE_HYPER_VOICE")?.status !== "exact" || coverage.queue.includes("MOVE_HYPER_VOICE")) fail("exact promoted coverage boundary");
equal(audit.checkpoint, { sourceAudit: true, completePointerOwnedRoot: true, commandOrder: true, directTaskCallbackResourceBodies: true, fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, oracleFreshnessCheckedBeforeLocalMgba: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, latchMeasured: false, durableLatchRowAdded: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true }, "checkpoint boundary");

const expected: Record<Orientation, Json> = {
  "player-back": { scenario: "tools/battle-lab/mechanic-hyper-voice-player-exploud-opponent-slowking.json", scenarioSha: "e5cbaa9c2839891b11c006e128333abb5640df9aa925363d2035d8f7fbf6beca", attacker: "player", target: "opponent", playerSetIds: [397, 398, 399], opponentSetIds: [410, 411, 412], output: "fbe3fba3f8f7aded8b0f0c2bca52cd096ea79144b858e0f6159a07e3579392ac", rootBattlers: [0, 1], ppAfter: [9, 10, 10, 10], finalHp: 158, damage: 56, cleanupFrame: 180, bench: "28ed44469150bdf6fd240dab1327531e5e28b3dbb11745fe10d1e03357cc5e04", opponentAiMoveSlots: [133, 133, 133, 133] },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-hyper-voice-opponent-exploud-player-slowking.json", scenarioSha: "b7b7260fb59e55482c3c686466fd79544ec13a2fc2a122e6fd57003ce00bad19", attacker: "opponent", target: "player", playerSetIds: [410, 411, 412], opponentSetIds: [397, 398, 399], output: "6ea48b8b96365df80ed2845d2294838a830a4a225dbad0fb1ba3adc92414436a", rootBattlers: [1, 0], ppAfter: [10, 10, 10, 9], finalHp: 155, damage: 59, cleanupFrame: 184, bench: "2d4ea0e978c156944b1467ee781165e2ef9319e8008f8aa9dbf583753818550f", opponentAiMoveSlots: [304, 304, 304, 304] },
};
for (const orientation of Object.keys(expected) as Orientation[]) {
  const want = expected[orientation];
  const run = receipt.runs[orientation] as Json;
  const stage = json(want.scenario);
  validateStage(want.scenario);
  equal(sha(read(want.scenario)), want.scenarioSha, `${orientation} scenario hash`);
  equal([stage.schemaVersion, stage.mode, stage.profile, stage.level, stage.challengeNum, stage.battleNum, stage.trainerId, stage.seed], [1, "mechanicLab", "battle-scene-on", 50, 3, 0, 120, 305420304], `${orientation} stage identity`);
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
  equal(stage.overrides.parties[want.attacker][0].moves, [304, 304, 304, 304], `${orientation} legal Hyper Voice slot constraint`);
  equal(stage.overrides.parties[want.target][0].moves, [133, 133, 133, 133], `${orientation} legal Amnesia slot constraint`);
  const attackerSetId = want.attacker === "player" ? stage.playerSetIds[0] : stage.opponentSetIds[0];
  const targetSetId = want.target === "player" ? stage.playerSetIds[0] : stage.opponentSetIds[0];
  const sourceEntry = (setId: number): Json => frontier.entries.find((entry: Json) => entry.index === setId) ?? fail(`missing Factory source set ${setId}`);
  if (!sourceEntry(attackerSetId).moves.includes("MOVE_HYPER_VOICE") || !sourceEntry(targetSetId).moves.includes("MOVE_AMNESIA")) fail(`${orientation} active constraints are not Factory-legal`);
  equal([run.seed, run.freshRuns, run.outputsByteIdentical, run.outputSha256, run.sourceInitialized, run.customPartiesBuiltBeforeBattle], [305420304, 2, true, want.output, true, true], `${orientation} twice-fresh receipt`);
  equal(run.attacker, { side: want.attacker, partyIndex: 0, species: 372, level: 50, moves: [304, 304, 304, 304], speed: 88 }, `${orientation} attacker`);
  equal(run.target, { side: want.target, partyIndex: 0, species: 199, level: 50, moves: [133, 133, 133, 133], speed: 31, initialHp: 202, finalHp: want.finalHp }, `${orientation} target`);
  equal(run.choiceConstraint, { attackerMoveSlots: [304, 304, 304, 304], opponentAiMoveSlots: want.opponentAiMoveSlots, attackerActsFirst: true }, `${orientation} stock turn-order constraint`);
  equal(run.root, { symbol: "Move_HYPER_VOICE", start: "0x82d50d6", hyperVoiceEffect: "0x82d50fa", endExclusive: "0x82d516a", observations: 104, sourceOwnedEffectCalls: 2, currentMove: 304, scriptPointer: "0x82d50d6", scriptPointerParity: 0, attackerBattler: want.rootBattlers[0], targetBattler: want.rootBattlers[1], firstInactiveCleanupFrame: want.cleanupFrame, firstInactiveVisualTaskCount: 0, firstInactiveSoundTaskCount: 0 }, `${orientation} root and clean first-inactive boundary`);
  equal(run.romOutcome, { kind: "damaging-two-effect-cry-body", moveDamage: want.damage, moveResultFlags: 0, targetFinalBattleHp: want.finalHp, targetFinalPartyHp: want.finalHp, targetFinalStatus: { kind: "none" }, battleOutcome: 0 }, `${orientation} stock outcome`);
  equal(run.pp, { before: [10, 10, 10, 10], after: want.ppAfter, spent: 1 }, `${orientation} one Hyper Voice PP spent`);
  equal(run.benches, { partyIndices: [1, 2], unchanged: true, checksumValid: true, beforeSha256: want.bench, afterSha256: want.bench }, `${orientation} unchanged checksum-valid benches`);
  if (run.transientFreeSetup !== true) fail(`${orientation} transient-free setup`);
}
equal(receipt.factoryLegalSelection, { representative: { setId: 397, name: "FRONTIER_MON_EXPLOUD_1", species: 372 }, slowkingControl: { setId: 410, name: "FRONTIER_MON_SLOWKING_1", species: 199 }, allSourceCarriers: [397], level50Carriers: [397], sourceRoute: { challengeNum: 3, level50SetRange: [372, 467], trainerId: 120 }, partyBeforeInit: true, choiceConstraint: "Both orientations use three complete legal Factory-derived records per side. Exploud's four active slots are constrained to its source-set Hyper Voice, and Slowking's four active slots are constrained to its source-set Amnesia; the ROM derives stats and runs entry hooks before the ordinary action." }, "Factory legal staging declaration");
equal(receipt.freshness, { check: "tools/check-oracle-freshness.sh", exitCode: 2, diagnostic: "SKIP: could not read start time for pid 43588 on 8014; SKIP: could not read start time for pid 43560 on 8012; date: 1788164325: No such file or directory; harness HEAD: d5f22d28d Back up lanes before provider preflight ()", sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py" }, "freshness result before local staging");
equal(receipt.scope, { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [], battleStateInjected: false, entryHooksSkipped: false, noTimingOrLatchTransfer: true }, "scope boundary");
console.log(JSON.stringify({ schema: "hyper-voice-source-staging-verifier/v1", sourceAuditFileSha256: receipt.source.auditSha256, runs: Object.fromEntries((Object.keys(expected) as Orientation[]).map((orientation) => [orientation, { outputSha256: receipt.runs[orientation].outputSha256, rootObservations: receipt.runs[orientation].root.observations, firstInactiveCleanupFrame: receipt.runs[orientation].root.firstInactiveCleanupFrame }])) }, null, 2));
