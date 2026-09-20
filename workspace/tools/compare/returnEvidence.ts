/** Hermetic verifier and normalized change-map builder for MOVE_RETURN strongest. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const paths = {
  "player-back": { scenario: "tools/battle-lab/mechanic-return-player-dragonair-opponent-onix.json", dense: "tools/compare/evidence/return-player-dense-state.json.gz", rgb: "tools/compare/evidence/return-player-raw-rgb.tar.gz", map: "tools/compare/evidence/return-changemap-player.json" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-return-opponent-dragonair-player-onix.json", dense: "tools/compare/evidence/return-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/return-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/return-changemap-opponent.json" },
} satisfies Record<Side, Json>;
const ownedTasks = new Set(["AnimTask_ShakeMon_Step", "AnimTask_TraceMonBlended_Step", "Task_UpdateMonBg", "Task_ClearMonBg"]);
const ownedTemplates = new Set(["gVerticalDipSpriteTemplate", "gBasicHitSplatSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"]);
const ownedSprite = (sprite: Json): boolean => ownedTemplates.has(sprite.template.symbol) || (sprite.template.symbol === "gMultiuseSpriteTemplate" && sprite.callback.symbol === "AnimMonTrace");

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] { return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []); }
function starts(rows: readonly Json[], template: string, callback?: string): number[] {
  let previous = new Set<number>(); const result: number[] = [];
  rows.forEach((row, age) => { const current = new Set<number>(row.sprites.filter((sprite: Json) => sprite.template.symbol === template && (!callback || sprite.callback.symbol === callback)).map((sprite: Json) => sprite.slot)); for (const slot of current) if (!previous.has(slot)) result.push(age); previous = current; });
  return result;
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 }), size = 240 * 160 * 3;
  invariant(bytes.length === names.length * size, `${archive}: shape`);
  const frames = new Map(names.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => { const frame = frames.get(String(row.frame).padStart(5, "0")); invariant(frame && sha(frame) === row.sha256, `${archive}: frame ${row.frame}`); return frame; });
}
function changed(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { count: null, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 38400; pixel++) { const offset = pixel * 3; if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue; count++; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function mapFor(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  const predecessor = (hardware: string, software: string) => `${rows.slice(1).filter((row, index) => same(row[hardware], rows[index]![software])).length}/${rows.length - 1}`;
  const bankTransitions = (key: "fadedPalette" | "hardwarePalette", bank: number) => transitions(rows, (row) => row[key].slice(bank * 16, bank * 16 + 16));
  const stable = (select: (row: Json) => unknown) => rows.every((row) => same(select(row), select(rows[0]!)));
  const rowMap = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, sourceOffset: row.scriptOffset, wait: row.scriptWait, args: row.animArgs,
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter(ownedSprite).map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr, matrix: sprite.matrix, data: sprite.data, order: row.spriteOrder.indexOf(sprite.slot) })),
    battlerAxes: { attacker: [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2, row.battlerSprites.target.y2] },
    registers: row.registers, battleBg: row.battleBg,
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, { symbol: row.audio[channel].songHeaderIdentity.symbol, digest: sha(JSON.stringify(row.audio[channel])) }])),
    resources: { impactTileSlot: row.tileTags.indexOf(10135), impactPaletteSlot: row.paletteTags.indexOf(10135), allocatorDigest: sha(JSON.stringify(row.resourceAllocators)) },
    digests: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), bgVram: sha(JSON.stringify(row.bgVram)), battle: sha(JSON.stringify([row.parties, row.battlers, row.engine, row.immutableState, row.rawBattleState])) },
    animationRng: row.animationRng, gameplayRng: row.rawBattleState.gameplayRng, rgbSha256: row.sha256, changed: changed(rgb[age - 1], rgb[age]!),
  }));
  return {
    schema: "return-strongest-normalized-change-map/v1", oracleProfile: "battle-scene-on", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract, topology: probe.topology,
    branch: { friendship: 255, returnPowerLevel: 3, selectorWriteAge: 7 },
    lifecycle: {
      verticalDipStarts: starts(rows, "gVerticalDipSpriteTemplate"), hitsplatStarts: starts(rows, "gBasicHitSplatSpriteTemplate"), traceStarts: starts(rows, "gMultiuseSpriteTemplate", "AnimMonTrace"),
      shakeLives: edges(rows, (row) => row.tasks.filter((task: Json) => task.func.symbol === "AnimTask_ShakeMon_Step").map((task: Json) => [task.slot, task.data])),
      traceLives: edges(rows, (row) => row.tasks.filter((task: Json) => task.func.symbol === "AnimTask_TraceMonBlended_Step").map((task: Json) => [task.slot, task.data])),
      simpleBlendStarts: starts(rows, "gSimplePaletteBlendSpriteTemplate"),
      soundTaskSchedules: { SE2TailWhip: [24, 60, 94, 120, 135, 157, 172, 187, 202], SE1VitalThrow2: [34, 67, 101, 120, 142, 157, 172, 187, 202], SE1MegaKick2: [217, 225, 233, 241] },
    },
    latches: { hardwareOamEqualsPrecedingSoftware: predecessor("hardwareOam", "softwareOam"), hardwareMatricesEqualPrecedingSoftware: predecessor("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: predecessor("hardwarePalette", "fadedPalette"), oamExceptions: rows.flatMap((row, age) => age && !same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []), matrixExceptions: rows.flatMap((row, age) => age && !same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []), paletteSameRowExceptions: rows.flatMap((row, age) => age && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []), attackerAxes: edges(rows, (row) => [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2]), targetAxes: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]) },
    transitions: { registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length)), battleBg: Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, ages]) => (ages as number[]).length)), fadedBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, bankTransitions("fadedPalette", bank)]).filter(([, ages]) => (ages as number[]).length)), hardwareBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, bankTransitions("hardwarePalette", bank)]).filter(([, ages]) => (ages as number[]).length)), audio: transitions(rows, (row) => row.audio), animationRng: transitions(rows, (row) => row.animationRng), gameplayRng: transitions(rows, (row) => row.rawBattleState.gameplayRng) },
    resources: { impact: { loadedAge: 1, unloadedAge: 281, tileSlot: rows[1]!.tileTags.indexOf(10135), paletteSlot: rows[1]!.paletteTags.indexOf(10135) } },
    state: { partiesStable: stable((row) => row.parties), battlersStable: stable((row) => row.battlers), engineStable: stable((row) => row.engine), immutableStable: stable((row) => row.immutableState), rawBattleStable: stable((row) => row.rawBattleState), gameplayRngStable: stable((row) => row.rawBattleState.gameplayRng) },
    cleanup: { age: 281, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length, ownedSprites: rows.at(-1)!.sprites.filter(ownedSprite).length }, rows: rowMap,
  };
}
function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side], compressed = readFileSync(resolve(root, config.dense)), json = gunzipSync(compressed), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  invariant(probe.schema === "return-strongest-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 216 && rows.length === 282, `${side}: identity/window`);
  invariant(probe.sourcePointerContract.start === 0x082d5ace && probe.sourcePointerContract.endExclusive === 0x082d5f5d && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  rows.forEach((row, age) => invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.resourceAllocators.tileRanges.length === 64 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704, `${side}: full row ${age}`));
  const rgb = rgbFrames(resolve(root, config.rgb), rows), map = mapFor(side, probe, rgb), bytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.map), bytes);
  invariant(same(map.lifecycle.verticalDipStarts, [24, 60, 94, 120, 135, 157, 172, 187, 202]) && same(map.lifecycle.hitsplatStarts, [34, 67, 101, 120, 142, 157, 172, 187, 202, 217, 225, 233, 241]) && same(map.lifecycle.traceStarts, [120, 120, 142, 157, 172, 187, 202]), `${side}: sprites`);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === "281/281" && map.latches.hardwareMatricesEqualPrecedingSoftware === "281/281" && map.latches.hardwarePaletteEqualsPrecedingFaded === "280/281" && !map.latches.oamExceptions.length && !map.latches.matrixExceptions.length && same(map.latches.paletteSameRowExceptions, [4]), `${side}: latches`);
  invariant(same(map.transitions.fadedBanks[1], [12, 14, 16, 265, 267, 269]) && same(map.transitions.hardwareBanks[1], [13, 15, 17, 266, 268, 270]), `${side}: simple blend +1`);
  const bg = side === "player-back" ? "gBattle_BG1_X" : "gBattle_BG2_X", reg = side === "player-back" ? "bg1hofs" : "bg2hofs";
  invariant(map.transitions.registers.bldcnt[0] === 7 && map.transitions.registers.bldcnt.at(-1) === 277 && map.transitions.battleBg[bg][0] === 4 && map.transitions.registers[reg][0] === 5, `${side}: direct alpha / monbg +1`);
  invariant(map.resources.impact.tileSlot === 6 && map.resources.impact.paletteSlot === 7 && map.state.partiesStable && map.state.battlersStable && map.state.immutableStable && map.state.rawBattleStable && map.state.gameplayRngStable && !map.transitions.gameplayRng.length, `${side}: resources/state/RNG`);
  invariant(map.cleanup.active === false && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0 && map.cleanup.ownedTasks === 0 && map.cleanup.ownedSprites === 0, `${side}: cleanup`);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.dense, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rgb, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rgb))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.map, changeMapSha256: sha(bytes), sourceWindow: probe.sourceWindow, rows: rows.length, latches: map.latches, lifecycle: map.lifecycle, transitions: map.transitions, resources: map.resources, state: map.state, cleanup: map.cleanup };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.repeatProbeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.repeatRawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.map)).equals(bytes), `${side}: retained receipt`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/return-evidence.json");
if (process.argv.includes("--write")) {
  const result = { "player-back": verifySide("player-back", undefined, true), "opponent-front": verifySide("opponent-front", undefined, true) };
  const repeatPaths = { "player-back": process.env.RETURN_PLAYER_REPEAT, "opponent-front": process.env.RETURN_OPPONENT_REPEAT }, repeatRgb = { "player-back": process.env.RETURN_PLAYER_REPEAT_RGB, "opponent-front": process.env.RETURN_OPPONENT_REPEAT_RGB };
  for (const side of ["player-back", "opponent-front"] as const) { invariant(repeatPaths[side] && repeatRgb[side], `${side}: repeat inputs`); invariant(sha(readFileSync(repeatPaths[side]!)) === result[side].probeJsonSha256 && repeatRgb[side] === result[side].rawRgbSequenceSha256, `${side}: twice-fresh`); Object.assign(result[side], { repeatProbeJsonSha256: result[side].probeJsonSha256, repeatRawRgbSequenceSha256: repeatRgb[side] }); }
  writeFileSync(fixturePath, `${JSON.stringify({ schema: "return-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_RETURN", moveId: 216, branch: "strongest", friendship: 255, status: "unsupported-evidence", coverageCredit: false, acceptance: { freshRunsPerOrientation: 2, rowsPerOrientation: 282, totalRows: 564, firstInactiveCleanupRetained: true }, evidenceScope: { sourceGraphPinned: true, completeStrongestBodyOnly: true, otherReachableBranchesAccepted: false, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, latchMeasured: true }, orientations: result, boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false }, verdict: "Evidence only: strongest RETURN is retained bilaterally; weak, medium, and strong remain evidence-required before any move credit. FLATTER receives source identity only." }, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
invariant(fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && fixture.evidenceScope.otherReachableBranchesAccepted === false, "unsupported boundary");
const result = { "player-back": verifySide("player-back", fixture.orientations["player-back"]), "opponent-front": verifySide("opponent-front", fixture.orientations["opponent-front"]) };
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, value]) => [side, { sourceWindow: value.sourceWindow, probeJsonSha256: value.probeJsonSha256, rawRgbSequenceSha256: value.rawRgbSequenceSha256, changeMapSha256: value.changeMapSha256, rows: value.rows, latches: value.latches, cleanup: value.cleanup }])), boundary: fixture.boundary }, null, 2));
