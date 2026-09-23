/** Strict verifier and normalized latch-map builder for MOVE_OUTRAGE evidence. */
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
const sourceStart = 0x082cb908;
const sourceEnd = 0x082cbaa3;
const smallEmber = 10029;
const paths = {
  "player-back": { scenario: "tools/battle-lab/mechanic-outrage-player-dragonite-opponent-onix.json", denseState: "tools/compare/evidence/outrage-player-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/outrage-player-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/outrage-changemap-player.json", rows: 120, frames: [76, 195], attackerSide: "player", targetSide: "opponent" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-outrage-opponent-dragonite-player-onix.json", denseState: "tools/compare/evidence/outrage-opponent-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/outrage-opponent-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/outrage-changemap-opponent.json", rows: 120, frames: [80, 199], attackerSide: "opponent", targetSide: "player" },
} satisfies Record<Side, Json>;
const ownedTemplates = new Set(["gOutrageFlameSpriteTemplate"]);
const ownedTasks = new Set(["AnimTask_TranslateMonElliptical_Step", "AnimTask_ShakeMon2_Step", "AnimTask_BlendColorCycleLoop", "Task_LoopAndPlaySE"]);
const transitions = (rows: readonly Json[], select: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
const edges = (rows: readonly Json[], select: (row: Json) => unknown): Json[] => rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []);
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 128 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${archive}: RGB archive shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => { const frame = byFrame.get(String(row.frame).padStart(5, "0")); invariant(frame && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`); return frame; });
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { count: null, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) { const offset = pixel * 3; if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue; count += 1; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function lifecycles(rows: readonly Json[], kind: "sprites" | "tasks"): Json[] {
  const live = new Map<string, Json>(); const result: Json[] = [];
  rows.forEach((row, age) => {
    const selected = row[kind].filter((item: Json) => kind === "sprites" ? ownedTemplates.has(item.template?.symbol) : ownedTasks.has(item.func?.symbol));
    const current = new Map(selected.map((item: Json) => [`${item.slot}:${kind === "sprites" ? item.template.symbol : item.func.symbol}`, item]));
    for (const [id, item] of current) { const prior = live.get(id); if (!prior) live.set(id, { id, start: age, first: item, last: item }); else prior.last = item; }
    for (const [id, life] of live) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); live.delete(id); }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result.map((life) => ({
    id: life.id, start: life.start, end: life.end,
    first: life.first.template ? { slot: life.first.slot, template: life.first.template.symbol, callback: life.first.callback.symbol, x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2, data: life.first.data, attr: life.first.attr, matrix: life.first.matrix, persistentOrder: rows[life.start]!.spriteOrder.indexOf(life.first.slot) } : { slot: life.first.slot, func: life.first.func.symbol, data: life.first.data },
    last: life.last.template ? { callback: life.last.callback.symbol, x: life.last.x, y: life.last.y, x2: life.last.x2, y2: life.last.y2, data: life.last.data, attr: life.last.attr, invisible: life.last.invisible } : { data: life.last.data },
  }));
}
function tagLife(rows: readonly Json[], tag: number, key: "tileTags" | "paletteTags"): Json { const ages = rows.flatMap((row, age) => row[key].includes(tag) ? [age] : []); return { first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length }; }
function battlerSprite(row: Json, battler: number): Json { return row.sprites.find((sprite: Json) => sprite.slot === row.animationBattlers.spriteIds[battler]); }
function paletteBankTransitions(rows: readonly Json[], key: "fadedPalette" | "hardwarePalette", bank: number): number[] { return transitions(rows, (row) => row[key].slice(bank * 16, bank * 16 + 16)); }

function derive(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  const spriteLives = lifecycles(rows, "sprites");
  const taskLives = lifecycles(rows, "tasks");
  const wholeLatch = (hardware: string, software: string): string => `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`;
  const oamExceptions = rows.flatMap((row, age) => age && !same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []);
  const matrixExceptions = rows.flatMap((row, age) => age && !same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []);
  const paletteExceptions = rows.flatMap((row, age) => age && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []);
  const changedPaletteBanks = Array.from({ length: 32 }, (_, bank) => bank).filter((bank) => paletteBankTransitions(rows, "fadedPalette", bank).length || paletteBankTransitions(rows, "hardwarePalette", bank).length);
  const attacker = rows[0]!.animationBattlers.attacker as number;
  const target = rows[0]!.animationBattlers.target as number;
  const normalizedRows = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, pointer: row.scriptPtr, pointerParity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait, args: row.animArgs,
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func?.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template?.symbol)).map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, anim: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter, data: sprite.data, matrixNum: sprite.matrixNum, matrix: sprite.matrix, invisible: sprite.invisible, subpriority: sprite.subpriority, persistentOrder: row.spriteOrder.indexOf(sprite.slot) })),
    battlerAxes: { attacker: [battlerSprite(row, attacker).x2, battlerSprite(row, attacker).y2], target: [battlerSprite(row, target).x2, battlerSprite(row, target).y2] },
    hardware: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), paletteBanks: Object.fromEntries(changedPaletteBanks.map((bank) => [bank, { faded: row.fadedPalette.slice(bank * 16, bank * 16 + 16), hardware: row.hardwarePalette.slice(bank * 16, bank * 16 + 16) }])) },
    registers: row.registers, bgVram: row.bgVram, resources: sha(JSON.stringify(row.resourceAllocators)), audio: { SE1: sha(JSON.stringify(row.audio.SE1)), SE2: sha(JSON.stringify(row.audio.SE2)) }, rng: { gameplay: row.immutableState.rngValue, animation: row.animationRng }, rawBattleState: { playerParty: sha(row.rawBattleState.playerParty), opponentParty: sha(row.rawBattleState.opponentParty), battleMons: sha(row.rawBattleState.battleMons) }, rgbSha256: row.sha256, pixelDelta: changedPixels(rgb[age - 1], rgb[age]!),
  }));
  const registers = Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length));
  const battleBg = Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, ages]) => (ages as number[]).length));
  return {
    schema: "outrage-normalized-banked-map/v1", oracleProfile: "battle-scene-on", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract,
    latches: { hardwareOamEqualsPrecedingSoftware: wholeLatch("hardwareOam", "softwareOam"), hardwareMatricesEqualsPrecedingSoftware: wholeLatch("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: wholeLatch("hardwarePalette", "fadedPalette"), oamExceptions, matrixExceptions, paletteExceptions, changedPaletteBanks, paletteBankTransitions: Object.fromEntries(changedPaletteBanks.map((bank) => [bank, { faded: paletteBankTransitions(rows, "fadedPalette", bank), hardware: paletteBankTransitions(rows, "hardwarePalette", bank) }])) },
    lifecycle: { sprites: spriteLives, tasks: taskLives },
    transitions: { registers, softwareBg: battleBg, bgVram: transitions(rows, (row) => row.bgVram), resourceAllocators: transitions(rows, (row) => row.resourceAllocators), audio: transitions(rows, (row) => row.audio), animationRng: transitions(rows, (row) => row.animationRng), gameplayRng: transitions(rows, (row) => row.immutableState.rngValue), attackerAxes: edges(rows, (row) => [battlerSprite(row, attacker).x2, battlerSprite(row, attacker).y2]), targetAxes: edges(rows, (row) => [battlerSprite(row, target).x2, battlerSprite(row, target).y2]) },
    resources: { smallEmber: { tag: smallEmber, tile: tagLife(rows, smallEmber, "tileTags"), palette: tagLife(rows, smallEmber, "paletteTags") } },
    audio: { first: rows[0]!.audio, firstActive: rows[4]!.audio, last: rows.at(-1)!.audio },
    state: { attacker, target, partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), rawBattleStateStable: rows.every((row) => same(row.rawBattleState, rows[0]!.rawBattleState)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue) },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template?.symbol)).length, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func?.symbol)).length, smallEmberTile: tagLife(rows, smallEmber, "tileTags"), smallEmberPalette: tagLife(rows, smallEmber, "paletteTags") },
    rows: normalizedRows,
  };
}
function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side]; const compressed = readFileSync(resolve(root, config.denseState)); const decoded = gunzipSync(compressed); const probe = JSON.parse(decoded.toString("utf8")) as Json; const rows = probe.frames as Json[];
  invariant(probe.schema === "outrage-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 200, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === sourceStart && probe.sourcePointerContract.endExclusive === sourceEnd && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  invariant(rows.length === config.rows && probe.sourceWindow.startFrame === config.frames[0] && probe.sourceWindow.endFrame === config.frames[1] && rows.every((row) => row.scriptOwner === "Move_OUTRAGE" && row.scriptPtr >= sourceStart && row.scriptPtr < sourceEnd), `${side}: complete pointer window`);
  for (const [age, row] of rows.entries()) invariant(row.tasks.length <= 16 && row.sprites.length <= 64 && row.spriteOrder.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.resourceAllocators.tileRanges.length === 64 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4, `${side}: dense row ${age}`);
  invariant(!rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: inactive cleanup`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows); const map = derive(side, probe, rgb); const spriteLives = map.lifecycle.sprites as Json[]; const taskLives = map.lifecycle.tasks as Json[];
  invariant(spriteLives.length === 23 && spriteLives.every((life) => life.end - life.start === 30), `${side}: 23 thirty-tick flame lifetimes`);
  invariant(taskLives.some((life) => life.id.includes("AnimTask_TranslateMonElliptical_Step") && life.start === 4 && life.end === 81) && taskLives.some((life) => life.id.includes("AnimTask_ShakeMon2_Step") && life.start === 14 && life.end === 91) && taskLives.some((life) => life.id.includes("AnimTask_BlendColorCycleLoop") && life.start === 4 && life.end === 92) && taskLives.some((life) => life.id.includes("Task_LoopAndPlaySE") && life.start === 4 && life.end === 20), `${side}: task schedules`);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === "119/119" && map.latches.hardwareMatricesEqualsPrecedingSoftware === "119/119" && map.latches.hardwarePaletteEqualsPrecedingFaded === "119/119" && same(map.latches.oamExceptions, []) && same(map.latches.matrixExceptions, []) && same(map.latches.paletteExceptions, []) && same(map.latches.changedPaletteBanks, [1, 2, 3, 16, 17, 23]), `${side}: independent transfer latches`);
  invariant(map.resources.smallEmber.tile.first === 1 && map.resources.smallEmber.tile.last === 118 && map.resources.smallEmber.palette.first === 1 && map.resources.smallEmber.palette.last === 118, `${side}: Small Ember resource lifetime`);
  invariant(map.transitions.bgVram.length === 0 && Object.keys(map.transitions.softwareBg).length === 0 && map.transitions.animationRng.length === 119 && map.transitions.gameplayRng.length === 0, `${side}: BG and RNG ownership`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.rawBattleStateStable && map.state.gameplayRngTransitions.length === 0, `${side}: immutable gameplay state/RNG`);
  invariant(map.cleanup.ownedSprites === 0 && map.cleanup.ownedTasks === 0 && map.cleanup.smallEmberTile.last === 118 && map.cleanup.smallEmberPalette.last === 118, `${side}: cleanup`);
  invariant((side === "player-back" ? map.transitions.attackerAxes.some((edge: Json) => same(edge[1], [4, 1])) : map.transitions.attackerAxes.some((edge: Json) => same(edge[1], [-5, 1]))) && map.transitions.targetAxes.some((edge: Json) => same(edge[1], [-2, 0])), `${side}: side-dependent axes`);
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`); if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(decoded), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow, summary: { latches: map.latches, lifecycle: { sprites: spriteLives, tasks: taskLives }, transitions: map.transitions, resources: map.resources, state: map.state, cleanup: map.cleanup } };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.repeatProbeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.repeatRawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: retained checksums/map`);
  return current;
}
const fixturePath = resolve(root, "tools/compare/fixtures/outrage-evidence.json");
if (process.argv.includes("--write")) {
  const result: Json = { "player-back": verifySide("player-back", undefined, true), "opponent-front": verifySide("opponent-front", undefined, true) };
  const repeatPaths: Record<Side, string | undefined> = { "player-back": process.env.OUTRAGE_PLAYER_REPEAT, "opponent-front": process.env.OUTRAGE_OPPONENT_REPEAT };
  const repeatRgb: Record<Side, string | undefined> = { "player-back": process.env.OUTRAGE_PLAYER_REPEAT_RGB_SHA256, "opponent-front": process.env.OUTRAGE_OPPONENT_REPEAT_RGB_SHA256 };
  for (const side of ["player-back", "opponent-front"] as const) { const repeat = repeatPaths[side]; invariant(repeat && repeatRgb[side], `${side}: repeat receipts required`); const repeatJson = readFileSync(repeat); invariant(sha(repeatJson) === result[side].probeJsonSha256 && repeatRgb[side] === result[side].rawRgbSequenceSha256, `${side}: fresh repeat mismatch`); result[side].repeatProbeJsonSha256 = sha(repeatJson); result[side].repeatRawRgbSequenceSha256 = repeatRgb[side]; }
  writeFileSync(fixturePath, `${JSON.stringify({ schema: "outrage-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_OUTRAGE", moveId: 200, status: "unsupported-evidence", coverageCredit: false, evidenceScope: { sourceAudit: true, completePointerBody: true, completeOutrageFlamesGraph: true, allSixComponentsAudited: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedBankedMaps: true, twiceFreshByteIdentical: true, legalBilateralParties: true, hitLegallyConstrained: true, sideDependentFlameVelocity: true, attackerEllipticalMotion: true, targetShakeMon2: true, blendPaletteSchedule: true, spriteResourceAudioRngOrderLifetimes: true, hardwareOamMatrixPaletteTransfer: true, firstInactiveCleanup: true, immutableGameplayStateAndRng: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false }, source: { rootStart: "0x082cb908", rootEndExclusive: "0x082cbaa3", components: 6, receipt: "tools/compare/evidence/outrage-source-audit.json", audit: "tools/compare/outrageSourceAudit.ts", probe: "tools/compare/outrageProbe.py", verifier: "tools/compare/outrageEvidence.ts" }, acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 120, "opponent-front": 120 }, totalRows: 240, firstInactiveCleanupRetained: true, productionFramebufferCompared: false }, orientations: result, controls: { named: { MOVE_OUTRAGE: "unsupported-evidence", MOVE_HELPING_HAND: "blocked" }, transferCredit: false }, acceptanceVerdict: "Evidence only: MOVE_OUTRAGE remains unsupported and outrage-flame remains unfulfilled; no reducer, typed seam, compositor, actual-core framebuffer acceptance, exact/partial promotion, sibling, shared-component, gameplay, RNG, or facility credit is claimed." }, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
invariant(fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && fixture.source.components === 6, "Outrage unsupported evidence boundary drifted");
invariant(!coverage.entries.some((entry: Json) => entry.move === "MOVE_OUTRAGE") && !coverage.componentTracks.some((track: Json) => track.representatives?.includes("MOVE_OUTRAGE") || track.moves?.includes("MOVE_OUTRAGE")), "Outrage must not receive coverage or track credit");
const result: Json = { "player-back": verifySide("player-back", fixture.orientations["player-back"]), "opponent-front": verifySide("opponent-front", fixture.orientations["opponent-front"]) };
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, item]: [string, Json]) => [side, { sourceWindow: item.sourceWindow, probeJsonSha256: item.probeJsonSha256, repeatProbeJsonSha256: fixture.orientations[side].repeatProbeJsonSha256, rawRgbSequenceSha256: item.rawRgbSequenceSha256, repeatRawRgbSequenceSha256: fixture.orientations[side].repeatRawRgbSequenceSha256, changeMapSha256: item.changeMapSha256, rows: item.summary.cleanup.age + 1, latches: item.summary.latches, lifecycle: { sprites: item.summary.lifecycle.sprites.map((life: Json) => ({ id: life.id, start: life.start, end: life.end })), tasks: item.summary.lifecycle.tasks.map((life: Json) => ({ id: life.id, start: life.start, end: life.end })) }, state: item.summary.state, cleanup: item.summary.cleanup }])), boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, boundaryOrBarrierChanged: false } }, null, 2));
