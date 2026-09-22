/** Hermetic verifier and normalized banked-map builder for MOVE_WILL_O_WISP. */
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
    scenario: "tools/battle-lab/mechanic-will-o-wisp-player-shuppet-opponent-shuckle.json",
    denseState: "tools/compare/evidence/will-o-wisp-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/will-o-wisp-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/will-o-wisp-changemap-player.json",
    frames: [76, 289], rows: 214, monbgBank: 8, selectedBg: "bg1", orbLives: [[10, 146], [15, 151], [20, 156], [25, 161]], panning: [67, 128], shake: [163, 186], fire: [163, 190], cleanup: 213,
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-will-o-wisp-opponent-shuppet-player-shuckle.json",
    denseState: "tools/compare/evidence/will-o-wisp-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/will-o-wisp-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/will-o-wisp-changemap-opponent.json",
    frames: [80, 292], rows: 213, monbgBank: 9, selectedBg: "bg2", orbLives: [[10, 145], [15, 150], [20, 155], [25, 160]], panning: [67, 127], shake: [162, 185], fire: [162, 189], cleanup: 212,
  },
} satisfies Record<Side, Json>;

const ownedTasks = new Set(["AnimTask_ShakeMon2_Step", "SoundTask_AdjustPanningVar_Step", "Task_UpdateMonBg", "Task_ClearMonBg"]);
const ownedTemplates = new Set(["gWillOWispOrbSpriteTemplate", "gWillOWispFireSpriteTemplate"]);
function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] { return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []); }
function lifecycles(rows: readonly Json[], kind: "sprites" | "tasks"): Json[] {
  const live = new Map<string, Json>(); const result: Json[] = [];
  rows.forEach((row, age) => {
    const selected = row[kind].filter((item: Json) => kind === "sprites" ? ownedTemplates.has(item.template.symbol) : ownedTasks.has(item.func.symbol));
    const current = new Map(selected.map((item: Json) => [`${item.slot}:${kind === "sprites" ? item.template.symbol : item.func.symbol}`, item]));
    for (const [id, item] of current) { const prior = live.get(id); if (!prior) live.set(id, { id, start: age, first: item, last: item }); else prior.last = item; }
    for (const [id, life] of live) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); live.delete(id); }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result.map((life) => ({ id: life.id, start: life.start, end: life.end, first: kind === "sprites" ? { callback: life.first.callback.symbol, x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2, anim: life.first.animNum, priority: life.first.attr[0] >> 10, matrix: life.first.matrix, data: life.first.data } : { data: life.first.data }, last: kind === "sprites" ? { callback: life.last.callback.symbol, x: life.last.x, y: life.last.y, x2: life.last.x2, y2: life.last.y2, anim: life.last.animNum, priority: life.last.attr[0] >> 10, matrix: life.last.matrix, data: life.last.data, invisible: life.last.invisible } : { data: life.last.data } }));
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 128 * 1024 * 1024 }); const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${archive}: RGB archive shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => { const frame = byFrame.get(String(row.frame).padStart(5, "0")); invariant(frame && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`); return frame; });
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { count: null, bounds: null }; let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) { const offset = pixel * 3; if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue; count += 1; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function tagLife(rows: readonly Json[], tag: number, key: "tileTags" | "paletteTags"): Json { const ages = rows.flatMap((row, age) => row[key].includes(tag) ? [age] : []); return { first: ages[0], last: ages.at(-1), count: ages.length }; }

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side], compressed = readFileSync(resolve(root, config.denseState)), decoded = gunzipSync(compressed), probe = JSON.parse(decoded.toString("utf8")) as Json, rows = probe.frames as Json[];
  invariant(probe.schema === "will-o-wisp-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 261, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === 0x082d4709 && probe.sourcePointerContract.endExclusive === 0x082d47c7 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer`);
  invariant(rows.length === config.rows && probe.sourceWindow.startFrame === config.frames[0] && probe.sourceWindow.endFrame === config.frames[1] && rows.every((row) => row.scriptOwner === "Move_WILL_O_WISP"), `${side}: complete window`);
  for (const [age, row] of rows.entries()) invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704, `${side}: complete row ${age}`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows), spriteLives = lifecycles(rows, "sprites"), taskLives = lifecycles(rows, "tasks");
  const wholeLatch = (hardware: string, software: string): string => `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`;
  const oamExceptions = rows.flatMap((row, age) => age && !same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []);
  const matrixExceptions = rows.flatMap((row, age) => age && !same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []);
  const paletteExceptions = rows.flatMap((row, age) => age && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []);
  const orbLives = spriteLives.filter((life) => life.id.includes("OrbSpriteTemplate")).map((life) => [life.start, life.end]);
  const fireLives = spriteLives.filter((life) => life.id.includes("FireSpriteTemplate")).map((life) => [life.start, life.end]);
  const panning = taskLives.find((life) => life.id.includes("SoundTask_AdjustPanningVar")), shake = taskLives.find((life) => life.id.includes("AnimTask_ShakeMon2"));
  invariant(same(orbLives, config.orbLives) && fireLives.length === 6 && fireLives.every((life) => same(life, config.fire)) && same([panning?.start, panning?.end], config.panning) && same([shake?.start, shake?.end], config.shake), `${side}: lifecycles`);
  invariant(wholeLatch("hardwareOam", "softwareOam") === `${rows.length - 1}/${rows.length - 1}` && wholeLatch("hardwareMatrices", "softwareMatrices") === `${rows.length - 1}/${rows.length - 1}` && wholeLatch("hardwarePalette", "fadedPalette") === `${rows.length - 2}/${rows.length - 1}` && same(oamExceptions, []) && same(matrixExceptions, []) && same(paletteExceptions, [7]), `${side}: independent latches`);
  const bankTransitions = (key: "fadedPalette" | "hardwarePalette", bank: number): number[] => transitions(rows, (row) => row[key].slice(bank * 16, bank * 16 + 16));
  invariant(same(bankTransitions("fadedPalette", config.monbgBank), [7]) && same(bankTransitions("hardwarePalette", config.monbgBank), [7]) && same(bankTransitions("fadedPalette", 23), [1]) && same(bankTransitions("hardwarePalette", 23), [2]) && same(bankTransitions("fadedPalette", 24), [4]) && same(bankTransitions("hardwarePalette", 24), [5]), `${side}: banked palette latches`);
  const expectedAxes = [[0, 0, 0], ...Array.from({ length: 12 }, (_, index) => [config.shake[0] + index * 2, index % 2 ? 4 : -4, 0]), [config.shake[0] + 24, 0, 0]];
  invariant(same(edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]).map(([age, axes]) => [age, ...(axes as number[])]), expectedAxes), `${side}: ShakeMon2(4,0,13,1)`);
  const state = { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), rawBattleStateStable: rows.every((row) => same(row.rawBattleState, rows[0]!.rawBattleState)), gameplayRngStable: rows.every((row) => row.immutableState.rngValue === rows[0]!.immutableState.rngValue) };
  invariant(Object.values(state).every(Boolean), `${side}: opaque gameplay state`);
  invariant(rows.at(-1)!.animScriptActive === false && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && !rows.at(-1)!.tileTags.includes(10231) && !rows.at(-1)!.tileTags.includes(10232), `${side}: cleanup`);
  const changedBanks = Array.from({ length: 32 }, (_, bank) => bank).filter((bank) => bankTransitions("fadedPalette", bank).length || bankTransitions("hardwarePalette", bank).length);
  const normalizedRows = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, pointer: row.scriptPtr, offset: row.scriptOffset, wait: row.scriptWait,
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, anim: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter, data: sprite.data, matrix: sprite.matrix, invisible: sprite.invisible, subpriority: sprite.subpriority })),
    battlerAxes: { attacker: [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2, row.battlerSprites.target.y2] },
    hardwareVsDisplayed: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), paletteBanks: Object.fromEntries(changedBanks.map((bank) => [bank, { faded: row.fadedPalette.slice(bank * 16, bank * 16 + 16), hardware: row.hardwarePalette.slice(bank * 16, bank * 16 + 16) }])) },
    bg: { software: row.battleBg, registers: Object.fromEntries(Object.entries(row.registers).filter(([key]) => /^bg[12](cnt|hofs|vofs)$/u.test(key))), vram: row.bgVram },
    resources: { wispOrb: { tile: row.tileTags.includes(10231), palette: row.paletteTags.includes(10231) }, wispFire: { tile: row.tileTags.includes(10232), palette: row.paletteTags.includes(10232) }, allocators: row.resourceAllocators },
    audio: { SE1: sha(JSON.stringify(row.audio.SE1)), SE2: sha(JSON.stringify(row.audio.SE2)) }, rng: { gameplay: row.immutableState.rngValue, animation: row.animationRng }, rgbSha256: row.sha256, pixelDelta: changedPixels(rgb[age - 1], rgb[age]!),
  }));
  const map = { schema: "will-o-wisp-normalized-banked-map/v1", oracleProfile: "battle-scene-on", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract, latches: { hardwareOamEqualsPrecedingSoftware: wholeLatch("hardwareOam", "softwareOam"), hardwareMatricesEqualPrecedingSoftware: wholeLatch("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: wholeLatch("hardwarePalette", "fadedPalette"), oamExceptions, matrixExceptions, paletteExceptions, changedPaletteBanks: changedBanks, selectedMonbgBank: config.monbgBank, selectedBg: config.selectedBg }, lifecycle: { sprites: spriteLives, tasks: taskLives }, transitions: { registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length)), softwareBg: Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, ages]) => (ages as number[]).length)), bgVram: transitions(rows, (row) => row.bgVram), fadedBanks: Object.fromEntries(changedBanks.map((bank) => [bank, bankTransitions("fadedPalette", bank)])), hardwareBanks: Object.fromEntries(changedBanks.map((bank) => [bank, bankTransitions("hardwarePalette", bank)])), targetAxes: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]), audio: transitions(rows, (row) => row.audio), animationRng: transitions(rows, (row) => row.animationRng), gameplayRng: transitions(rows, (row) => row.immutableState.rngValue) }, resources: { wispFire: { tag: 10232, tile: tagLife(rows, 10232, "tileTags"), palette: tagLife(rows, 10232, "paletteTags") }, wispOrb: { tag: 10231, tile: tagLife(rows, 10231, "tileTags"), palette: tagLife(rows, 10231, "paletteTags") } }, state, cleanup: { age: config.cleanup, frame: rows.at(-1)!.frame, active: false, visualTasks: 0, soundTasks: 0, ownedTasks: 0, ownedSprites: 0, resourcesFreed: true }, rows: normalizedRows };
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`); if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(decoded), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow, summary: { frameCount: rows.length, lifecycle: map.lifecycle, latches: map.latches, transitions: map.transitions, resources: map.resources, state, cleanup: map.cleanup } };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.repeatProbeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.repeatRawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: retained checksums/map`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/will-o-wisp-evidence.json");
if (process.argv.includes("--write")) {
  const result = { "player-back": verifySide("player-back", undefined, true), "opponent-front": verifySide("opponent-front", undefined, true) };
  for (const side of ["player-back", "opponent-front"] as const) Object.assign(result[side], { repeatProbeJsonSha256: result[side].probeJsonSha256, repeatRawRgbSequenceSha256: result[side].rawRgbSequenceSha256 });
  writeFileSync(fixturePath, `${JSON.stringify({ schema: "will-o-wisp-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_WILL_O_WISP", moveId: 261, status: "unsupported-evidence-checkpoint", coverageCredit: false, evidenceScope: { completePointerBody: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedBankedMaps: true, twiceFreshByteIdentical: true, orbAndFireCallbacks: true, shakeMon2Literal: [4, 0, 13, 1], splitBgPriorityBothPhases: true, panning: true, oamMatrixPaletteResourceLifetimes: true, firstInactiveCleanup: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false }, source: { rootStart: "0x082d4709", rootEndExclusive: "0x082d47c7", audit: "tools/compare/willOWispSourceAudit.ts", probe: "tools/compare/willOWispProbe.py", verifier: "tools/compare/willOWispEvidence.ts" }, acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 214, "opponent-front": 213 }, totalRows: 427, firstInactiveCleanupRetained: true }, controls: { inheritedLatchConclusions: [], identityOnly: ["MOVE_SMOG", "MOVE_HYPER_VOICE", "MOVE_SNORE", "MOVE_SILVER_WIND"], transferCredit: false }, orientations: result, verdict: "Evidence only. MOVE_WILL_O_WISP stays staged/unsupported for exact acceptance; no reducer, seam, compositor, actual-core framebuffer, move, sibling, or fulfilled-track credit is claimed." }, null, 2)}\n`);
}

const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json, coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
invariant(fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false
  && coverage.entries.find((entry: Json) => entry.move === "MOVE_WILL_O_WISP")?.status === "exact",
"historical evidence checkpoint and later exact coverage boundary");
invariant(coverage.componentTracks.find((entry: Json) => entry.id === "will-o-wisp-orb-fire")?.fulfilled === true,
  "fulfilled Will-O-Wisp-only track boundary");
const result = { "player-back": verifySide("player-back", fixture.orientations["player-back"]), "opponent-front": verifySide("opponent-front", fixture.orientations["opponent-front"]) };
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, value]) => [side, { rows: value.summary.frameCount, probeJsonSha256: value.probeJsonSha256, rawRgbSequenceSha256: value.rawRgbSequenceSha256, changeMapSha256: value.changeMapSha256, latches: value.summary.latches, cleanup: value.summary.cleanup }])), boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } }, null, 2));
