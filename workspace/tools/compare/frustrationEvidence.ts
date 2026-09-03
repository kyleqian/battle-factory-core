/** Strict, evidence-only verifier for the bilateral MOVE_FRUSTRATION window. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { buildFrustrationChangeMap } from "./frustrationChangeMap.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/frustration-evidence.json"), "utf8")) as Json;
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const invariant = (value: unknown, message: string): asserts value => { if (!value) throw new Error(message); };

const sourceStart = 0x082cb430;
const sourceEnd = 0x082cb6f7;
const sourceAddresses = [0x082cb430, 0x082cb433, 0x082cb436, 0x082cb438, 0x082cb45f, 0x082cb463,
  0x082cb48a, 0x082cb48d, 0x082cb49e, 0x082cb4b0, 0x082cb4b3, 0x082cb4c6, 0x082cb4ec,
  0x082cb501, 0x082cb516, 0x082cb52b, 0x082cb540, 0x082cb553];
const taskEdges = [[0, 0], [10, 2], [38, 1], [48, 0], [71, 1], [88, 0], [89, 1], [106, 0],
  [119, 1], [126, 3], [133, 4], [135, 3], [140, 4], [142, 3], [147, 4], [149, 3], [154, 4],
  [156, 3], [163, 2], [170, 1], [184, 0], [185, 1], [223, 0]];
const paletteAges = [1, 4, 7, 16, 20, 24, 28, 32, 36, 40, 44, 48, 191, 195, 199, 203, 207, 211, 215, 219, 223];
const unfadedPaletteAges = [1, 4, 7];
const hardwarePaletteAges = [2, 5, 7, 17, 21, 25, 29, 33, 37, 41, 45, 49, 192, 196, 200, 204, 208, 212, 216, 220, 224];

const paths: Record<Side, Json> = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-frustration-player-furret-opponent-onix.json",
    denseState: "tools/compare/evidence/frustration-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/frustration-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/frustration-changemap-player.json",
    changeMapText: "tools/compare/evidence/frustration-changemap-player.txt",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-frustration-opponent-furret-player-onix.json",
    denseState: "tools/compare/evidence/frustration-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/frustration-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/frustration-changemap-opponent.json",
    changeMapText: "tools/compare/evidence/frustration-changemap-opponent.txt",
  },
};

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age > 0 && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}

function edgeAges(value: readonly unknown[][]): number[] { return value.map((entry) => entry[0] as number); }

function expectFileHash(path: string, expected: string, label: string): void {
  invariant(sha(readFileSync(resolve(root, path))) === expected, `${label}: SHA-256 drift`);
}

function parseChangeMapText(path: string, side: Side, map: Json): void {
  const lines = readFileSync(resolve(root, path), "utf8").trimEnd().split("\n");
  invariant(lines[0] === `# MOVE_FRUSTRATION ${side} — 229 frames, 240x160`, `${side}: change-map header drift`);
  invariant(lines[1] === "# frames absent from this table are byte-identical to the previous frame", `${side}: change-map static-row contract drift`);
  const events = new Map<number, Json>();
  for (const line of lines.slice(3)) {
    const first = line.match(/^(\d+)  \(first frame\)$/u);
    if (first) { events.set(Number(first[1]), { first: true }); continue; }
    const changed = line.match(/^(\d+)\s+(\d+)\s+(\d+),(\d+)-(\d+),(\d+)$/u);
    if (changed) events.set(Number(changed[1]), { changedPixels: Number(changed[2]), bounds: changed.slice(3).map(Number) });
  }
  const expected = (map.rgb.rows as Json[]).filter((row) => row.age === 0 || row.changedPixels !== 0);
  invariant(events.size === expected.length, `${side}: change-map event count drift`);
  for (const row of expected) {
    const event = events.get(row.frame);
    invariant(event, `${side}: missing change-map event ${row.frame}`);
    if (row.age === 0) invariant(event.first === true, `${side}: first RGB row drift`);
    else invariant(event.changedPixels === row.changedPixels && same(event.bounds, row.bounds), `${side}: RGB change-map row ${row.frame} drift`);
  }
}

function expectedShakeEdges(): number[][] {
  const result: number[][] = [[0, 0]];
  for (let age = 10; age <= 36; age += 2) result.push([age, age % 4 === 2 ? -1 : 1]);
  result.push([38, 0]);
  return result;
}

function expectedTargetEdges(initial: number): number[][] {
  const result: number[][] = [[0, initial]];
  for (let age = 126; age <= 182; age += 2) result.push([age, age % 4 === 2 ? -4 : 4]);
  result.push([184, 0]);
  return result;
}

function assertTaskSummary(side: Side, map: Json): void {
  const expectedSprites = [
    [3, "gAngerMarkSpriteTemplate", 71, 87, 63, 0, [235, 0, 0, 235]],
    [3, "gAngerMarkSpriteTemplate", 89, 105, 63, 0, [235, 0, 0, 235]],
    [3, "gBasicHitSplatSpriteTemplate", 126, 134, 63, 0, [256, 0, 0, 256]],
    [4, "gBasicHitSplatSpriteTemplate", 133, 141, 1, 3, [256, 0, 0, 256]],
    [3, "gBasicHitSplatSpriteTemplate", 140, 148, 63, 0, [256, 0, 0, 256]],
    [4, "gBasicHitSplatSpriteTemplate", 147, 155, 1, 3, [256, 0, 0, 256]],
    [3, "gBasicHitSplatSpriteTemplate", 154, 162, 63, 0, [256, 0, 0, 256]],
    [4, "gBasicHitSplatSpriteTemplate", 161, 169, 1, 3, [256, 0, 0, 256]],
  ];
  const actualSprites = (map.lifecycle.sprites as Json[]).map((life) => [life.slot, life.name, life.start, life.end,
    life.sourceOrder, life.first.matrixNum, life.first.matrix]);
  invariant(same(actualSprites, expectedSprites), `${side}: anger/impact lifecycle or allocator drift`);
  const swayIndex = side === "player-back" ? 6 : 8;
  const update = side === "player-back" ? [8, 177, 42, -145, -10, 0] : [6, 72, 80, -40, -48, 1];
  const shake = side === "player-back" ? [6, 14, 1, 1, 1, 0] : [8, 14, 1, 1, 1, 0];
  const sway = side === "player-back" ? [0, 16, 6144, 8, swayIndex, 0] : [0, -16, 6144, 8, swayIndex, 1];
  const targetShake = side === "player-back" ? [8, 29, 1, 1, 4, 0] : [6, 29, 1, 1, 4, 0];
  const blend = side === "player-back" ? [0, 1, 3, 0, 9, 31] : [0, 2, 3, 0, 9, 31];
  const restore = side === "player-back" ? [0, 1, 3, 9, 0, 31] : [0, 2, 3, 9, 0, 31];
  const clear = side === "player-back" ? [0, 1, 1, 0, 0, 0] : [0, 1, 0, 0, 0, 0];
  const expectedTasks = [
    [1, "Task_UpdateMonBg", 7, 226, update], [0, "AnimTask_ShakeMon2_Step", 10, 37, shake],
    [2, "AnimTask_BlendSpriteColor_Step2", 10, 47, blend], [0, "AnimTask_SwayMonStep", 119, 160, sway],
    [2, "AnimTask_ShakeMon2_Step", 126, 183, targetShake], [0, "AnimTask_BlendSpriteColor_Step2", 185, 222, restore],
    [0, "Task_ClearMonBg", 224, 226, clear],
  ];
  const actualTasks = (map.lifecycle.tasks as Json[]).map((life) => [life.slot, life.name, life.start, life.end, life.firstData.slice(0, 6)]);
  invariant(same(actualTasks, expectedTasks), `${side}: task lifecycle/argument drift`);
  invariant(same(map.counts.visualTaskEdges, taskEdges), `${side}: visual task allocator edge drift`);
  invariant(same(map.counts.soundTaskEdges, [[0, 0]]), `${side}: sound task count drift`);
}

function assertOrientationMap(side: Side, map: Json): void {
  invariant(map.schema === "frustration-normalized-change-map/v1" && map.side === side, `${side}: normalized-map identity drift`);
  assertTaskSummary(side, map);
  invariant(map.source.ownerCounts.Move_FRUSTRATION === 10 && map.source.ownerCounts.Frustration_Continue === 44 && map.source.ownerCounts.Frustration_Strongest === 175,
    `${side}: strongest source-owner counts drift`);
  invariant(map.source.ownerCounts.Frustration_Strong === 0 && map.source.ownerCounts.Frustration_Medium === 0 && map.source.ownerCounts.Frustration_Weak === 0,
    `${side}: unsupported strength branch entered evidence window`);
  invariant(same(map.source.pointerEdges.map((edge: Json) => edge[0]), [0, 1, 4, 7, 10, 49, 71, 89, 107, 119, 126, 133, 140, 147, 154, 161, 185, 224]), `${side}: source pointer edge drift`);
  invariant(same(map.allocations.sprites.map((entry: Json) => [entry.slot, entry.template, entry.start, entry.order, entry.matrixNum, entry.matrix]),
    (map.lifecycle.sprites as Json[]).map((life) => [life.slot, life.name, life.start, life.sourceOrder, life.first.matrixNum, life.first.matrix])), `${side}: allocation receipt drift`);
  invariant(same(map.transfers.latches, {
    hardwareOamEqualsPrecedingSoftware: "228/228", hardwareMatricesEqualsPrecedingSoftware: "228/228",
    hardwarePaletteEqualsPrecedingFaded: "227/228", hardwareOamExceptions: [], hardwareMatrixExceptions: [], hardwarePaletteExceptions: [7],
  }), `${side}: whole-buffer latch drift`);
  invariant(same(map.transfers.tags.anger, { tag: 10135, tile: [[0, false], [1, true], [228, false]], palette: [[0, false], [1, true], [228, false]] }), `${side}: anger resource lifecycle drift`);
  invariant(same(map.transfers.tags.impact, { tag: 10087, tile: [[0, false], [4, true], [228, false]], palette: [[0, false], [4, true], [228, false]] }), `${side}: impact resource lifecycle drift`);
  invariant(same(map.transfers.palettes.faded.map((entry: Json) => entry.age), paletteAges), `${side}: faded palette ages drift`);
  invariant(same(map.transfers.palettes.unfaded.map((entry: Json) => entry.age), unfadedPaletteAges), `${side}: unfaded palette ages drift`);
  invariant(same(map.transfers.palettes.hardware.map((entry: Json) => entry.age), hardwarePaletteAges), `${side}: hardware palette ages drift`);
  const expectedShake = expectedShakeEdges().map(([age, x]) => [age, [x, 0]]);
  invariant(same(map.axes.attacker.slice(0, expectedShake.length), expectedShake), `${side}: attacker ShakeMon2 axis drift`);
  invariant(same(map.axes.target, expectedTargetEdges(side === "player-back" ? 1 : 0).map(([age, x]) => [age, [x, 0]])), `${side}: target ShakeMon2 axis drift`);
  const targetBg = side === "player-back" ? "gBattle_BG1_X" : "gBattle_BG2_X";
  const targetBgY = side === "player-back" ? "gBattle_BG1_Y" : "gBattle_BG2_Y";
  const hofs = side === "player-back" ? "bg1hofs" : "bg2hofs";
  const vofs = side === "player-back" ? "bg1vofs" : "bg2vofs";
  const targetAges = [0, 7, ...Array.from({ length: 30 }, (_, index) => 126 + index * 2), 227];
  invariant(same(edgeAges(map.axes.battleBg[targetBg]), targetAges), `${side}: target battle-BG edge drift`);
  invariant(same(edgeAges(map.axes.battleBg[targetBgY]), [0, 7, 227]), `${side}: target battle-BG Y edge drift`);
  invariant(same(edgeAges(map.axes.registers[hofs]), [0, 8, ...Array.from({ length: 30 }, (_, index) => 127 + index * 2), 228]), `${side}: target hardware HOFS edge drift`);
  invariant(same(map.axes.registers[vofs], [[0, 0], [8, side === "player-back" ? 502 : 464], [228, 0]]), `${side}: target hardware VOFS edge drift`);
  invariant(same(map.axes.registers.bldcnt, [[0, 0], [10, 16192], [224, 0]]) && same(map.axes.registers.bldalpha, [[0, 0], [10, 2060], [224, 0]]), `${side}: blend register drift`);
  const headers = map.transfers.audio.SE1.filter((edge: Json, index: number, edges: Json[]) => index === 0 || edge[1][0] !== edges[index - 1]![1][0]).map((edge: Json) => [edge[0], edge[1][0]]);
  invariant(same(headers, [[0, "se_ball_open"], [10, "se_m_dragon_rage"], [71, "se_m_swagger2"], [126, "se_m_comet_punch"]]), `${side}: audio program drift`);
  invariant(same(map.transfers.audio.SE2.map((edge: Json) => [edge[0], edge[1][0]]), [[0, "se_select"]]), `${side}: ambient audio drift`);
  const dragon = map.transfers.audio.SE1.find((edge: Json) => edge[0] === 10)![1];
  const swagger = map.transfers.audio.SE1.find((edge: Json) => edge[0] === 71)![1];
  const impact = map.transfers.audio.SE1.find((edge: Json) => edge[0] === 126)![1];
  const attackerPan = side === "player-back" ? -64 : 63;
  const targetPan = side === "player-back" ? 63 : -63;
  invariant(dragon[2][0][0] === attackerPan && swagger[2][0][0] === attackerPan && impact[2][0][0] === targetPan && impact[2][1][0] === targetPan,
    `${side}: orientation-specific audio panning drift`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable &&
    map.state.gameplayRngTransitions.length === 0 && map.state.animationRngDistinct === 227 && map.state.animationRngTransitions.length === 226,
    `${side}: gameplay/animation state or RNG drift`);
  invariant(map.rgb.changedRows === 112 && map.rgb.rows.length === 229 && typeof map.rgb.sequenceSha256 === "string", `${side}: RGB change-map summary drift`);
  invariant(map.cleanup.age === 228 && map.cleanup.frame === map.sourceWindow.endFrame && map.cleanup.active === false && map.cleanup.visualTasks === 0 &&
    map.cleanup.soundTasks === 0 && map.cleanup.ownedSprites === 0 && map.cleanup.ownedTasks === 0, `${side}: inactive cleanup boundary drift`);
}

function verifySide(side: Side): Json {
  const config = paths[side];
  const expected = fixture.orientations[side] as Json;
  for (const [key, path] of Object.entries(config)) expectFileHash(path as string, expected[`${key}Sha256`], `${side}/${key}`);
  const compressed = readFileSync(resolve(root, config.denseState));
  const json = gunzipSync(compressed);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(probe.schema === "frustration-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 218, `${side}: dense identity drift`);
  invariant(same(probe.sourceWindow, expected.sourceWindow), `${side}: dense source window drift`);
  invariant(rows.length === 229 && rows.every((row, age) => row.frame === expected.sourceWindow.startFrame + age && row.scriptPtr >= sourceStart && row.scriptPtr < sourceEnd && row.scriptOffset === row.scriptPtr - sourceStart && row.scriptPtrParity === (row.scriptPtr & 1)), `${side}: contiguous source rows drift`);
  invariant(same(probe.sourcePointerContract.observedAddresses, sourceAddresses) && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract drift`);
  invariant(rows[0]!.scriptOffset === 0 && rows.at(-1)!.animScriptActive === false && rows.at(-1)!.scriptOffset === 51 && rows.at(-1)!.scriptPtr === sourceStart + 51,
    `${side}: source-entry/first-inactive cleanup drift`);
  for (const row of rows) {
    invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 &&
      row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 &&
      row.spriteFlags.length === 64 && row.spriteOrder.length === 64 && row.parties.player.length === 3 && row.parties.opponent.length === 3 &&
      row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4, `${side}: complete retained state shape drift at frame ${row.frame}`);
  }
  const first = rows[0]!;
  const attackerSide = side === "player-back" ? "player" : "opponent";
  const targetSide = side === "player-back" ? "opponent" : "player";
  const expectedPp = side === "player-back" ? [19, 20, 20, 20] : [20, 20, 19, 20];
  invariant(first.setup === undefined, "internal row setup field unexpectedly present");
  invariant(probe.setup.mode === "mechanicLab" && probe.setup.profile === "battle-scene-on" && probe.setup.level === 50 && probe.setup.challengeNum === 2 &&
    probe.setup.battleNum === 2 && probe.setup.trainerId === 110 && probe.setup.sourceInitialized === true && probe.setup.customPartiesBuiltBeforeBattle === true,
    `${side}: Factory setup provenance drift`);
  invariant(first.animationBattlers.attacker === (side === "player-back" ? 0 : 1) && first.animationBattlers.target === (side === "player-back" ? 1 : 0) &&
    same(first.animationBattlers.spriteIds, [6, 8, 0, 0]), `${side}: attacker/target sprite orientation drift`);
  invariant(first.battlers[attackerSide].species === 162 && first.battlers[targetSide].species === 95 && first.battlers[attackerSide].friendship === 0 && first.battlers[targetSide].friendship === 0 &&
    same(first.battlers[attackerSide].pp, expectedPp) && first.battlers[targetSide].pp.every((value: number) => value === 35), `${side}: legal Furret/Onix PP or friendship drift`);
  invariant(first.engine.currentMove === 218 && first.engine.controllerExecFlags === (side === "player-back" ? 1 : 2), `${side}: battle engine ownership drift`);
  for (const row of rows) {
    invariant(row.parties[attackerSide].every((mon: Json) => mon.checksumValid) && row.parties[targetSide].every((mon: Json) => mon.checksumValid), `${side}: party checksum drift`);
    invariant(row.immutableState.battleOutcome === 0 && row.immutableState.weather === 0 && row.immutableState.weatherTurns === 0 &&
      row.immutableState.sideStatuses.every((value: number) => value === 0) && Object.values(row.immutableState.sideConditions).every((conditions: Json) => Object.values(conditions).every((value) => value === 0)),
      `${side}: transient gameplay state entered evidence window`);
  }
  for (const field of ["parties", "battlers", "engine", "immutableState"]) invariant(rows.every((row) => same(row[field], first[field])), `${side}: ${field} changed during presentation`);
  invariant(transitions(rows, (row) => row.animationRng).length === 226 && transitions(rows, (row) => row.immutableState.rngValue).length === 0, `${side}: RNG transition boundary drift`);
  const map = buildFrustrationChangeMap(resolve(root, config.denseState), resolve(root, config.rawRgbArchive));
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  invariant(mapBytes.equals(readFileSync(resolve(root, config.changeMap))), `${side}: normalized map is not reproducible from dense/RGB evidence`);
  assertOrientationMap(side, map);
  parseChangeMapText(config.changeMapText, side, map);
  invariant(map.rgb.sequenceSha256 === expected.rawRgbSequenceSha256, `${side}: raw RGB sequence drift`);
  invariant(sha(json) === expected.probeJsonSha256 && expected.probeJsonSha256 === expected.repeatProbeJsonSha256, `${side}: twice-fresh dense hash drift`);
  invariant(expected.rawRgbSequenceSha256 === expected.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB sequence drift`);
  return { sourceWindow: probe.sourceWindow, rows: rows.length, probeJsonSha256: sha(json), denseStateSha256: sha(compressed), rawRgbSequenceSha256: map.rgb.sequenceSha256,
    changeMapSha256: sha(mapBytes), changedRows: map.rgb.changedRows, latches: map.transfers.latches, lifecycle: { sprites: map.lifecycle.sprites.length, tasks: map.lifecycle.tasks.length }, cleanup: map.cleanup };
}

function verify(): Json {
  invariant(fixture.schema === "frustration-bilateral-evidence/v1" && fixture.oracleProfile === "battle-scene-on" && fixture.moveId === 218 && fixture.coverageCredit === false,
    "Frustration fixture boundary drift");
  invariant(fixture.evidenceScope.productionAnimationChanged === false && fixture.evidenceScope.coveragePromotion === false && fixture.evidenceScope.gameplayStateOwned === false &&
    fixture.evidenceScope.transientOverrides.length === 0, "evidence-only scope drift");
  expectFileHash(fixture.source.probe, fixture.source.probeSha256, "probe source");
  expectFileHash(fixture.source.changeMapBuilder, fixture.source.changeMapBuilderSha256, "change-map builder source");
  expectFileHash(fixture.source.frameChangeMapBuilder, fixture.source.frameChangeMapBuilderSha256, "frame change-map builder source");
  expectFileHash(fixture.source.audit, fixture.source.auditSha256, "source audit script");
  const auditBytes = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(auditBytes) === fixture.source.auditRunSha256, "source audit output is not byte-identical");
  const audit = JSON.parse(auditBytes.toString("utf8")) as Json;
  invariant(audit.move === "MOVE_FRUSTRATION" && audit.moveId === 218 && audit.coverageCredit === false && audit.pointerOwned.root.byteLength === 711 &&
    audit.branches.selector.friendshipBands.map((band: Json) => [band.friendship, band.result]) .toString() === [["0..30", 0], ["31..100", 1], ["101..200", 2], ["201..255", 3]].toString() &&
    audit.branches.strongest.angerMarks === 2 && audit.branches.strongest.hitSplats === 6 && same(audit.branches.strongest.shakeTasks, [["ANIM_ATTACKER", 1, 0, 15, 1], ["ANIM_TARGET", 4, 0, 30, 1]]),
    "source audit strongest-branch contract drift");
  const result = Object.fromEntries((Object.keys(paths) as Side[]).map((side) => [side, verifySide(side)]));
  return { schema: "frustration-bilateral-evidence/v1", status: "unsupported-evidence", coverageCredit: false, move: "MOVE_FRUSTRATION", moveId: 218,
    sourceAuditRunSha256: sha(auditBytes), twiceFresh: true, rowsPerOrientation: 229, orientations: result };
}

console.log(JSON.stringify(verify(), null, 2));
