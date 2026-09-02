/** Strict replay and normalized state/change-map verifier for Aurora Beam evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const paths = {
  "player-back": { scenario: "tools/battle-lab/mechanic-aurora-beam-player-seadra-opponent-onix.json", denseState: "tools/compare/evidence/aurora-beam-player-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/aurora-beam-player-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/aurora-beam-changemap-player.json" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-aurora-beam-opponent-seadra-player-onix.json", denseState: "tools/compare/evidence/aurora-beam-opponent-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/aurora-beam-opponent-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/aurora-beam-changemap-opponent.json" },
} satisfies Record<Side, Json>;
const ringTemplate = "gAuroraBeamRingSpriteTemplate";
const ownedTasks = new Set(["AnimTask_RotateAuroraRingColors_Step", "AnimTask_ShakeMon2_Step", "SoundTask_LoopSEAdjustPanning_Step", "Task_FadeToBg"]);

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] {
  return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []);
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${archive}: RGB archive shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^\.\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(frame && frame.length === size && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`);
    return frame;
  });
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count += 1; const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function lives(rows: readonly Json[], kind: "ring" | "task"): Json[] {
  const live = new Map<string, Json>(); const result: Json[] = [];
  rows.forEach((row, age) => {
    const entries = kind === "ring"
      ? row.sprites.filter((item: Json) => item.template.symbol === ringTemplate).map((item: Json) => [`${item.slot}:${ringTemplate}`, item] as const)
      : row.tasks.filter((item: Json) => ownedTasks.has(item.func.symbol)).map((item: Json) => [`${item.slot}:${item.func.symbol}`, item] as const);
    const current = new Map(entries);
    for (const [id, item] of current) if (!live.has(id)) live.set(id, { id, start: age, first: item });
    for (const [id, life] of live) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); live.delete(id); }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result.map((life) => kind === "ring" ? {
    id: life.id, start: life.start, end: life.end, displayedStart: life.start + 1, displayedEnd: life.end + 1,
    slot: life.first.slot, callback: life.first.callback.symbol, x: life.first.x, y: life.first.y,
    matrix: life.first.matrixNum, subpriority: life.first.subpriority,
    persistentOrder: rows[life.start]!.spriteOrder.indexOf(life.first.slot),
  } : { id: life.id, start: life.start, end: life.end, initialData: life.first.data });
}
function tagLife(rows: readonly Json[], tag: number): Json {
  const tile = rows.flatMap((row, age) => row.tileTags.includes(tag) ? [age] : []);
  const palette = rows.flatMap((row, age) => row.paletteTags.includes(tag) ? [age] : []);
  return { tile: [tile[0], tile.at(-1), tile.length], palette: [palette[0], palette.at(-1), palette.length] };
}
function battlerSprite(row: Json, battler: number): Json {
  const slot = row.animationBattlers.spriteIds[battler];
  return row.sprites.find((sprite: Json) => sprite.slot === slot);
}
function derive(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[]; const ringLives = lives(rows, "ring"), taskLives = lives(rows, "task");
  const target = rows[0]!.animationBattlers.target as number;
  const sourceShakeEdges = edges(rows, (row) => battlerSprite(row, target).x2);
  const ringStarts = ringLives.map((life) => life.start);
  const ringEnds = ringLives.map((life) => life.end);
  const releaseRows = rows.flatMap((row, age) => {
    const rings = row.sprites.filter((sprite: Json) => sprite.template.symbol === ringTemplate);
    return rings.some((sprite: Json) => sprite.animNum === 1) && (age === 0 || !rows[age - 1]!.sprites.filter((sprite: Json) => sprite.template.symbol === ringTemplate).every((sprite: Json) => sprite.animNum === 1)) ? [age] : [];
  });
  const wholeLatch = (hardware: string, software: string): string => `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`;
  const paletteRotateAges = transitions(rows, (row) => row.fadedPalette.slice(369, 377)).filter((age) => age >= 44 && age <= 170);
  const rowMap = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, pointer: row.scriptPtr, offset: row.scriptOffset, wait: row.scriptWait, arg7: row.animArgs[7],
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    rings: row.sprites.filter((sprite: Json) => sprite.template.symbol === ringTemplate).map((sprite: Json) => ({ slot: sprite.slot, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, anim: sprite.animNum, matrix: sprite.matrixNum, affine: sprite.matrix, subpriority: sprite.subpriority, persistentOrder: row.spriteOrder.indexOf(sprite.slot) })),
    tags: { rainbowRingsTile: row.tileTags.includes(10140), rainbowRingsPalette: row.paletteTags.includes(10140) },
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, { symbol: row.audio[channel].songHeaderIdentity.symbol, status: row.audio[channel].status, digest: sha(JSON.stringify(row.audio[channel])) }])),
    bgVram: row.bgVram, registers: { bldcnt: row.registers.bldcnt, bldy: row.registers.bldy }, targetX2: battlerSprite(row, target).x2,
    ringPalette: row.fadedPalette.slice(368, 377), gameplayRng: row.immutableState.rngValue, animationRng: row.animationRng,
    digests: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), spriteOrder: sha(JSON.stringify(row.spriteOrder)), parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)), engine: sha(JSON.stringify(row.engine)) },
    ...changedPixels(rgb[age - 1], rgb[age]!),
  }));
  return {
    schema: "aurora-beam-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract,
    lifecycle: { ringLives, taskLives, ringCount: ringLives.length, ringStarts, ringEnds, arg7Edges: edges(rows, (row) => row.animArgs[7]), releaseRows },
    latches: { hardwareOamEqualsPrecedingSoftware: wholeLatch("hardwareOam", "softwareOam"), hardwareMatricesEqualPrecedingSoftware: wholeLatch("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: wholeLatch("hardwarePalette", "fadedPalette"), targetShakeSourceEdges: sourceShakeEdges, firstShake: { invocation: [1, 0, 17, 1], task: [54, 85, 32], source: [54, 86], hardwareLag: 1 }, secondShake: { invocation: [2, 0, 40, 1], task: [90, 167, 78], source: [90, 168], hardwareLag: 1 }, paletteRotateAges },
    background: { bgVramTransitions: transitions(rows, (row) => row.bgVram), bldcntEdges: edges(rows, (row) => row.registers.bldcnt), bldyEdges: edges(rows, (row) => row.registers.bldy), loadAge: 23, restoreAge: 195, firstFadeTask: [4, 40], restoreFadeTask: [176, 213] },
    audio: { initialDispatch: 42, loopTask: [90, 143, 54], loopDispatches: [90, 100, 111, 122, 133, 144], playerPan: [-64, 63, 3], opponentPan: [63, -63, -3], args: [3, 6, 0, 10] },
    resources: { rainbowRings: tagLife(rows, 10140) },
    state: { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRngDistinct: new Set(rows.map((row) => row.animationRng)).size },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, rings: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template.symbol === ringTemplate).length, tasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length, resource: tagLife(rows, 10140) },
    rows: rowMap,
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side]; const compressed = readFileSync(resolve(root, config.denseState)); const json = gunzipSync(compressed); const probe = JSON.parse(json.toString("utf8")) as Json; const rows = probe.frames as Json[];
  invariant(probe.schema === "aurora-beam-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 62, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === 0x082d0804 && probe.sourcePointerContract.endExclusive === 0x082d08d8 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  invariant(rows.length === 216 && rows[0]!.scriptOffset === 0 && rows.every((row) => row.scriptOwner === "Move_AURORA_BEAM" && row.scriptPtr >= 0x082d0804 && row.scriptPtr < 0x082d08d8), `${side}: complete pointer rows`);
  rows.forEach((row, age) => invariant(row.tasks.length <= 16 && row.sprites.length <= 64 && row.spriteOrder.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4, `${side}: full row ${age}`));
  invariant(!rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: inactive cleanup`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows); const map = derive(side, probe, rgb); const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  invariant(map.lifecycle.ringCount === 40 && same(map.lifecycle.ringStarts, Array.from({ length: 40 }, (_, index) => 42 + index * 3)) && map.lifecycle.ringEnds.every((end: number, index: number) => end === map.lifecycle.ringStarts[index] + 15), `${side}: all 40 rings`);
  invariant(same(map.lifecycle.arg7Edges, [[0, 0], [90, -1]]) && same(map.lifecycle.releaseRows, [90]), `${side}: arg-7 cell/affine release`);
  invariant(map.lifecycle.ringLives.every((life: Json) => life.callback === "AnimAuroraBeamRings_Step" && life.displayedStart === life.start + 1 && life.displayedEnd === life.end + 1), `${side}: ring painter lifecycle`);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === "215/215" && map.latches.hardwareMatricesEqualPrecedingSoftware === "215/215" && map.latches.hardwarePaletteEqualsPrecedingFaded === "215/215", `${side}: complete RAM+1 transfer`);
  invariant(same(map.latches.paletteRotateAges, Array.from({ length: 43 }, (_, index) => 44 + index * 3)), `${side}: 43 palette rotations`);
  invariant(same(map.background.bgVramTransitions, [23, 195]) && same(map.background.bldcntEdges, [[0, 0], [5, 0xE8], [41, 0], [177, 0xE8], [214, 0]]), `${side}: Aurora BG/0xE8 cadence`);
  invariant(map.background.bldyEdges.length === 65 && same(map.background.bldyEdges.slice(0, 4), [[0, 0], [6, 1], [7, 2], [8, 3]]) && same(map.background.bldyEdges.at(-1), [213, 0]), `${side}: fade brightness cadence`);
  invariant(same(map.latches.firstShake.task, [54, 85, 32]) && same(map.latches.secondShake.task, [90, 167, 78]) && map.latches.targetShakeSourceEdges.some((edge: Json) => edge[0] === 86 && edge[1] === 0) && map.latches.targetShakeSourceEdges.some((edge: Json) => edge[0] === 168 && edge[1] === 0), `${side}: two target shakes`);
  invariant(same(map.audio.loopTask, [90, 143, 54]) && same(map.audio.loopDispatches, [90, 100, 111, 122, 133, 144]), `${side}: audio schedule`);
  invariant(same(map.resources.rainbowRings.tile, [1, 214, 214]) && same(map.resources.rainbowRings.palette, [1, 214, 214]), `${side}: tag lifetime`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.gameplayRngTransitions.length === 0 && map.state.animationRngDistinct === 215, `${side}: gameplay/RNG invariance`);
  invariant(map.cleanup.rings === 0 && map.cleanup.tasks === 0 && !map.cleanup.active && same(map.cleanup.resource.tile, [1, 214, 214]), `${side}: cleanup`);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow, summary: { lifecycle: { ringCount: map.lifecycle.ringCount, ringStarts: map.lifecycle.ringStarts, ringEnds: map.lifecycle.ringEnds, arg7Edges: map.lifecycle.arg7Edges, releaseRows: map.lifecycle.releaseRows, taskLives: map.lifecycle.taskLives }, latches: map.latches, background: map.background, audio: map.audio, resources: map.resources, state: map.state, cleanup: map.cleanup } };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: receipt/map drift`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/aurora-beam-evidence.json");
if (process.argv.includes("--write")) {
  const player = verifySide("player-back", undefined, true), opponent = verifySide("opponent-front", undefined, true);
  const repeats = { "player-back": process.env.AURORA_BEAM_PLAYER_REPEAT, "opponent-front": process.env.AURORA_BEAM_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.AURORA_BEAM_PLAYER_REPEAT_RGB_SHA256, "opponent-front": process.env.AURORA_BEAM_OPPONENT_REPEAT_RGB_SHA256 };
  for (const side of ["player-back", "opponent-front"] as const) { const path = repeats[side]; invariant(path, `${side}: repeat required`); const digest = sha(readFileSync(path)); const first = side === "player-back" ? player : opponent; invariant(digest === first.probeJsonSha256 && repeatRgb[side] === first.rawRgbSequenceSha256, `${side}: twice-fresh mismatch`); first.repeatProbeJsonSha256 = digest; first.repeatRawRgbSequenceSha256 = repeatRgb[side]; }
  const fixture = { schema: "aurora-beam-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_AURORA_BEAM", moveId: 62, status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, productionAnimationChanged: false, reducerAdded: false, assetBundleAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
    source: { start: "0x082d0804", endExclusive: "0x082d08d8", byteLength: 212, sha256: "b178f9fa4e4b8494ed18eeb008374c90becfb6a3093d44825e1c0f3284f1633c", components: 10, lowestLevel50Carrier: { setId: 219, frontierMon: "FRONTIER_MON_SEADRA_1", species: "SPECIES_SEADRA" }, audit: "tools/compare/auroraBeamSourceAudit.ts", probe: "tools/compare/auroraBeamProbe.py", verifier: "tools/compare/auroraBeamEvidence.ts" },
    acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 216, "opponent-front": 216 }, rawRgbRows: { "player-back": 216, "opponent-front": 216 }, productionFramebufferCompared: false, latchVerdict: "Aurora Beam independently proves whole OAM, affine matrices, and faded palette as RAM+1 on 215/215 comparable rows per orientation; both target ShakeMon2 schedules use that measured transfer", backgroundVerdict: "BG_AURORA loads at age 23, restores at 195, and 0xE8 brightness register cadence is retained through inactive age 215" },
    orientations: { "player-back": player, "opponent-front": opponent }, controls: { inheritedIceBeamTransferFacts: false, generalizedTransferFacts: false, inferredSharedTaskCredit: false, inferredSiblingCredit: false },
    acceptanceVerdict: "Evidence only: MOVE_AURORA_BEAM and aurora-beam-rainbow-rings-bg remain unsupported/unfulfilled; no reducer, assets, seam, compositor, framebuffer acceptance, promotion, component/shared-task credit, or sibling credit." };
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json; const result: Json = {};
for (const side of ["player-back", "opponent-front"] as const) result[side] = verifySide(side, fixture.orientations[side]);
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, item]: [string, Json]) => [side, { sourceWindow: item.sourceWindow, probeJsonSha256: item.probeJsonSha256, repeatProbeJsonSha256: fixture.orientations[side].repeatProbeJsonSha256, rawRgbSequenceSha256: item.rawRgbSequenceSha256, lifecycle: item.summary.lifecycle, latches: { oam: item.summary.latches.hardwareOamEqualsPrecedingSoftware, matrices: item.summary.latches.hardwareMatricesEqualPrecedingSoftware, palette: item.summary.latches.hardwarePaletteEqualsPrecedingFaded, firstShake: item.summary.latches.firstShake, secondShake: item.summary.latches.secondShake, paletteRotations: item.summary.latches.paletteRotateAges.length }, background: item.summary.background, audio: item.summary.audio, resources: item.summary.resources, state: item.summary.state, cleanup: item.summary.cleanup }])), boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } }, null, 2));
