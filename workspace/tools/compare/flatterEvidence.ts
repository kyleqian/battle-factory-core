/** Hermetic retained-evidence verifier and normalized-map builder for MOVE_FLATTER. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const paths = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-flatter-player-nidorina-opponent-onix.json",
    denseState: "tools/compare/evidence/flatter-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/flatter-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/flatter-changemap-player.json",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-flatter-opponent-nidorina-player-onix.json",
    denseState: "tools/compare/evidence/flatter-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/flatter-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/flatter-changemap-opponent.json",
  },
} satisfies Record<Side, Json>;

const SPOTLIGHT = "gFlatterSpotlightSpriteTemplate";
const CONFETTI = "gFlatterConfettiSpriteTemplate";
const VERTICAL_DIP = "gVerticalDipSpriteTemplate";
const SPOTLIGHT_TAG = 10227;
const CONFETTI_TAG = 10240;

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] {
  return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []);
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 128 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${archive}: archive shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(frame && sha(frame) === row.sha256, `${archive}: frame ${row.frame}`);
    return frame;
  });
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function spriteLives(rows: readonly Json[], template: string): Json[] {
  const live = new Map<number, Json>(), result: Json[] = [];
  rows.forEach((row, age) => {
    const current = new Map(row.sprites.filter((sprite: Json) => sprite.template?.symbol === template).map((sprite: Json) => [sprite.slot, sprite]));
    for (const [slot, sprite] of current) {
      const prior = live.get(slot);
      if (!prior) live.set(slot, { slot, start: age, first: sprite, last: sprite });
      else prior.last = sprite;
    }
    for (const [slot, life] of live) if (!current.has(slot)) { result.push({ ...life, end: age - 1 }); live.delete(slot); }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result.map((life) => ({
    slot: life.slot, start: life.start, end: life.end, displayedStart: life.start + 1, displayedEnd: life.end + 1,
    first: { callback: life.first.callback.symbol, x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2, data: life.first.data, matrixNum: life.first.matrixNum, matrix: life.first.matrix },
    last: { callback: life.last.callback.symbol, x2: life.last.x2, y2: life.last.y2, data: life.last.data, flags: life.last.flags, matrix: life.last.matrix },
  }));
}
function resourceLife(rows: readonly Json[], tag: number): Json {
  const palette = rows.flatMap((row, age) => row.paletteTags.includes(tag) ? [age] : []);
  const tile = rows.flatMap((row, age) => row.tileTags.includes(tag) ? [age] : []);
  return { tag, palette: [palette[0], palette.at(-1)], tile: [tile[0], tile.at(-1)] };
}
function mapFor(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  const spotlight = spriteLives(rows, SPOTLIGHT), confetti = spriteLives(rows, CONFETTI), dips = spriteLives(rows, VERTICAL_DIP);
  const owned = new Set([SPOTLIGHT, CONFETTI, VERTICAL_DIP]);
  const predecessor = (hardware: string, software: string) => `${rows.slice(1).filter((row, index) => same(row[hardware], rows[index]![software])).length}/${rows.length - 1}`;
  const rowMap = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, offset: row.scriptOffset, wait: row.scriptWait,
    visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
    tasks: row.tasks.filter((task: Json) => task.func.symbol === "AnimTask_HardwarePaletteFade_Step").map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => owned.has(sprite.template?.symbol)).map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, flags: sprite.flags, attr: sprite.attr, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data, order: row.spriteOrder.indexOf(sprite.slot) })),
    targetAxis: [row.battlerSprites.target.x2, row.battlerSprites.target.y2], registers: row.registers,
    audio: { SE1: { symbol: row.audio.SE1.songHeaderIdentity.symbol, status: row.audio.SE1.status, digest: sha(JSON.stringify(row.audio.SE1)) }, SE2: { symbol: row.audio.SE2.songHeaderIdentity.symbol, status: row.audio.SE2.status, digest: sha(JSON.stringify(row.audio.SE2)) } },
    resources: { spotlightPaletteSlot: row.paletteTags.indexOf(SPOTLIGHT_TAG), spotlightTileSlot: row.tileTags.indexOf(SPOTLIGHT_TAG), confettiPaletteSlot: row.paletteTags.indexOf(CONFETTI_TAG), confettiTileSlot: row.tileTags.indexOf(CONFETTI_TAG), allocatorDigest: sha(JSON.stringify(row.resourceAllocators)) },
    digests: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), spriteOrder: sha(JSON.stringify(row.spriteOrder)), battleState: sha(JSON.stringify([row.parties, row.battlers, row.engine, row.immutableState, row.rawBattleState])) },
    rgbSha256: row.sha256, ...changedPixels(rgb[age - 1], rgb[age]!),
  }));
  return {
    schema: "flatter-normalized-change-map/v1", oracleProfile: "battle-scene-on", side,
    sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract, topology: probe.topology,
    chronology: {
      script: edges(rows, (row) => [row.scriptOffset, row.scriptWait, row.visualTaskCount, row.soundTaskCount]),
      hardwarePaletteFadeTasks: spriteTaskLives(rows), spotlight, verticalDips: dips, confetti, confettiCount: confetti.length,
      audio: {
        encore2: { age: 7, channel: "SE2", pan: rows[7]!.audio.SE2.tracks[0].panX },
        flatterAttacker: { age: 65, channel: "SE1", pan: rows[65]!.audio.SE1.tracks[0].panX },
        flatterTarget: { age: 75, channel: "SE1", pan: rows[75]!.audio.SE1.tracks[0].panX },
      },
    },
    latches: {
      hardwareOamEqualsPrecedingSoftware: predecessor("hardwareOam", "softwareOam"),
      hardwareMatricesEqualPrecedingSoftware: predecessor("hardwareMatrices", "softwareMatrices"),
      hardwarePaletteEqualsPrecedingFaded: predecessor("hardwarePalette", "fadedPalette"),
      oamExceptions: rows.flatMap((row, age) => age && !same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []),
      matrixExceptions: rows.flatMap((row, age) => age && !same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []),
      paletteExceptions: rows.flatMap((row, age) => age && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []),
      targetAxes: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]),
      spotlightSoftware: edges(rows, (row) => { const sprite = row.sprites.find((item: Json) => item.template?.symbol === SPOTLIGHT); return sprite ? { x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, flags: sprite.flags, matrix: sprite.matrix, phase: sprite.data[1] } : null; }),
    },
    transitions: {
      registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, edges(rows, (row) => row.registers[key])]).filter(([, values]) => (values as unknown[]).length > 1)),
      fadedPaletteBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, transitions(rows, (row) => row.fadedPalette.slice(bank * 16, bank * 16 + 16))]).filter(([, ages]) => (ages as number[]).length)),
      hardwarePaletteBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, transitions(rows, (row) => row.hardwarePalette.slice(bank * 16, bank * 16 + 16))]).filter(([, ages]) => (ages as number[]).length)),
    },
    resources: { spotlight: resourceLife(rows, SPOTLIGHT_TAG), confetti: resourceLife(rows, CONFETTI_TAG) },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) => owned.has(sprite.template?.symbol)).length, resourcesReleased: !rows.at(-1)!.paletteTags.includes(SPOTLIGHT_TAG) && !rows.at(-1)!.paletteTags.includes(CONFETTI_TAG) && !rows.at(-1)!.tileTags.includes(SPOTLIGHT_TAG) && !rows.at(-1)!.tileTags.includes(CONFETTI_TAG) },
    rows: rowMap,
  };
}
function spriteTaskLives(rows: readonly Json[]): Json[] {
  const wanted = "AnimTask_HardwarePaletteFade_Step";
  const lives: Json[] = []; let current: Json | undefined;
  rows.forEach((row, age) => {
    const task = row.tasks.find((item: Json) => item.func.symbol === wanted);
    if (task && !current) current = { slot: task.slot, start: age, initialData: task.data };
    if (!task && current) { lives.push({ ...current, end: age - 1 }); current = undefined; }
  });
  if (current) lives.push({ ...current, end: rows.length - 1 });
  return lives;
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side];
  const compressed = readFileSync(resolve(root, config.denseState)), json = gunzipSync(compressed), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  invariant(probe.schema === "flatter-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 260, `${side}: identity`);
  invariant(rows.length === 219 && probe.sourceWindow.frameCount === 219 && rows.at(-1)!.animScriptActive === false, `${side}: complete dense cleanup window`);
  invariant(probe.sourcePointerContract.start === 0x082d4eb2 && probe.sourcePointerContract.endExclusive === 0x082d4fae && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: source interval`);
  rows.forEach((row, age) => invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.resourceAllocators.tileRanges.length === 64 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704, `${side}: complete row ${age}`));
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows), map = mapFor(side, probe, rgb), mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  invariant(same(map.chronology.hardwarePaletteFadeTasks.map((life: Json) => [life.start, life.end]), [[7, 47], [176, 216]]), `${side}: both hardware fades`);
  invariant(map.chronology.spotlight.length === 1 && same([map.chronology.spotlight[0].start, map.chronology.spotlight[0].end], [49, 174]), `${side}: spotlight life`);
  invariant(same(map.chronology.verticalDips.map((life: Json) => [life.slot, life.start, life.end]), [[4, 51, 63], [5, 63, 78]]), `${side}: two vertical dips`);
  invariant(map.chronology.confettiCount === 38 && same(map.chronology.confetti.map((life: Json) => life.start).reduce((counts: Json, age: number) => ({ ...counts, [age]: (counts[age] ?? 0) + 1 }), {}), { 65: 15, 66: 14, 67: 9 }) && map.chronology.confetti.every((life: Json) => life.end === 97), `${side}: 38 confetti lives`);
  invariant(map.chronology.confetti.some((life: Json) => life.slot === 4 && life.start === 65) && map.chronology.verticalDips.some((life: Json) => life.slot === 4 && life.end === 63), `${side}: allocator slot reuse`);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === "218/218" && !map.latches.oamExceptions.length && map.latches.hardwareMatricesEqualPrecedingSoftware === "217/218" && same(map.latches.matrixExceptions, [68]) && map.latches.hardwarePaletteEqualsPrecedingFaded === "218/218" && !map.latches.paletteExceptions.length, `${side}: independent transfer fits`);
  invariant(map.chronology.spotlight[0].first.x2 === 0 && map.chronology.spotlight[0].last.x2 === 0 && map.latches.spotlightSoftware.every((edge: Json) => edge[1] === null || (edge[1].x2 === 0 && edge[1].y2 === 0)), `${side}: no Flatter spotlight x2 program`);
  invariant(same(map.transitions.hardwarePaletteBanks["23"], [2]) && same(map.transitions.hardwarePaletteBanks["24"], [5]), `${side}: resource palette RAM+1`);
  invariant(same(map.transitions.registers.dispcnt, [[0, 48960], [7, 65344], [175, 32576], [218, 16192]]) && same(map.transitions.registers.winin, [[0, 16191], [7, 7999], [218, 16191]]) && same(map.transitions.registers.winout, [[0, 16191], [49, 7999], [175, 16191]]) && same(map.transitions.registers.bldcnt, [[0, 0], [8, 248], [217, 0]]), `${side}: Create/RemoveSpotlight and OBJ-window registers`);
  invariant(same(map.transitions.registers.bldy, [[0, 0], [8, 1], [12, 2], [16, 3], [20, 4], [24, 5], [28, 6], [32, 7], [36, 8], [40, 9], [44, 10], [177, 9], [181, 8], [185, 7], [189, 6], [193, 5], [197, 4], [201, 3], [205, 2], [209, 1], [213, 0]]), `${side}: bilateral HardwarePaletteFade directions`);
  const pan = side === "player-back" ? { target: 63, attacker: -64 } : { target: -63, attacker: 63 };
  invariant(map.chronology.audio.encore2.pan === pan.target && map.chronology.audio.flatterAttacker.pan === pan.attacker && map.chronology.audio.flatterTarget.pan === pan.target && rows[7]!.audio.SE2.songHeaderIdentity.symbol === "se_m_encore2" && rows[65]!.audio.SE1.songHeaderIdentity.symbol === "se_m_flatter" && rows[75]!.audio.SE1.status === 0, `${side}: sound-task starts and pans`);
  invariant(same(map.resources.spotlight, { tag: SPOTLIGHT_TAG, palette: [1, 217], tile: [1, 217] }) && same(map.resources.confetti, { tag: CONFETTI_TAG, palette: [4, 217], tile: [4, 217] }), `${side}: resource lives`);
  invariant(map.cleanup.active === false && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0 && map.cleanup.ownedSprites === 0 && map.cleanup.resourcesReleased, `${side}: first inactive cleanup`);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow, summary: { chronology: map.chronology, latches: map.latches, transitions: map.transitions, resources: map.resources, cleanup: map.cleanup } };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.repeatProbeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.repeatRawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: retained receipts`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/flatter-evidence.json");
if (process.argv.includes("--write")) {
  const result = { "player-back": verifySide("player-back", undefined, true), "opponent-front": verifySide("opponent-front", undefined, true) };
  const repeats = { "player-back": process.env.FLATTER_PLAYER_REPEAT, "opponent-front": process.env.FLATTER_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.FLATTER_PLAYER_REPEAT_RGB, "opponent-front": process.env.FLATTER_OPPONENT_REPEAT_RGB };
  for (const side of ["player-back", "opponent-front"] as const) {
    invariant(repeats[side] && repeatRgb[side], `${side}: repeat inputs`);
    invariant(sha(readFileSync(repeats[side]!)) === result[side].probeJsonSha256 && repeatRgb[side] === result[side].rawRgbSequenceSha256, `${side}: twice-fresh mismatch`);
    Object.assign(result[side], { repeatProbeJsonSha256: result[side].probeJsonSha256, repeatRawRgbSequenceSha256: repeatRgb[side] });
  }
  writeFileSync(fixturePath, `${JSON.stringify({
    schema: "flatter-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_FLATTER", moveId: 260,
    status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { fullDenseRowsRetained: true, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
    source: { audit: "tools/compare/flatterSourceAudit.ts", probe: "tools/compare/flatterProbe.py", verifier: "tools/compare/flatterEvidence.ts" },
    acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 219, "opponent-front": 219 }, totalRows: 438, firstInactiveCleanupRetained: true },
    orientations: result,
    verdict: "MOVE_FLATTER remains unsupported: bilateral dense Scene-ON state/raw-RGB and move-owned latch evidence only; no reducer, seam, compositor, framebuffer, coverage, component, track, sibling, gameplay, or boundary credit.",
  }, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const coverageEntry = coverage.entries.find((entry: Json) => entry.move === "MOVE_FLATTER");
invariant(
  fixture.status === "unsupported-evidence"
    && fixture.coverageCredit === false
    && coverageEntry?.status === "exact"
    && coverageEntry.evidence?.includes("tools/compare/flatterActualCore.ts"),
  "retained evidence and exact-production boundary",
);
const result = { "player-back": verifySide("player-back", fixture.orientations["player-back"]), "opponent-front": verifySide("opponent-front", fixture.orientations["opponent-front"]) };
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, value]) => [side, { sourceWindow: value.sourceWindow, probeJsonSha256: value.probeJsonSha256, rawRgbSequenceSha256: value.rawRgbSequenceSha256, changeMapSha256: value.changeMapSha256, latches: value.summary.latches, cleanup: value.summary.cleanup }])), boundary: fixture.evidenceScope }, null, 2));
