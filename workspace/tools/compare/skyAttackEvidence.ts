/** Hermetic verifier and normalized change-map builder for MOVE_SKY_ATTACK. */
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
  "player-back": {
    scenario: "tools/battle-lab/mechanic-sky-attack-player-fearow-opponent-shuckle.json",
    denseState: "tools/compare/evidence/sky-attack-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/sky-attack-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/sky-attack-changemap-player.json",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-sky-attack-opponent-fearow-player-shuckle.json",
    denseState: "tools/compare/evidence/sky-attack-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/sky-attack-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/sky-attack-changemap-opponent.json",
  },
} satisfies Record<Side, Json>;

const ownedTasks = new Set([
  "AnimTask_AttackerFadeFromInvisible_Step", "AnimTask_AttackerFadeToInvisible_Step",
  "AnimTask_BlendSpriteColor_Step2", "AnimTask_ShakeBattlers", "AnimTask_ShakeMon2_Step",
  "AnimTask_UpdateSlidingBg", "Task_ClearMonBg", "Task_FadeToBg", "Task_LoopAndPlaySE", "Task_UpdateMonBg",
]);
const ownedTemplates = new Set(["gSkyAttackBirdSpriteTemplate"]);

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
  const byFrame = new Map(members.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
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
function lifecycles(rows: readonly Json[], kind: "sprite" | "task"): Json[] {
  const live = new Map<string, Json>(); const result: Json[] = [];
  rows.forEach((row, age) => {
    const entries = kind === "sprite"
      ? row.sprites.filter((item: Json) => ownedTemplates.has(item.template.symbol)).map((item: Json) => [`${item.slot}:${item.template.symbol}`, item] as const)
      : row.tasks.filter((item: Json) => ownedTasks.has(item.func.symbol)).map((item: Json) => [`${item.slot}:${item.func.symbol}`, item] as const);
    const current = new Map(entries);
    for (const [id, item] of current) if (!live.has(id)) live.set(id, { id, start: age, first: item });
    for (const [id, life] of live) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); live.delete(id); }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result.map((life) => kind === "sprite" ? {
    id: life.id, start: life.start, end: life.end, template: life.first.template.symbol,
    callback: life.first.callback.symbol, slot: life.first.slot, first: { x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2, data: life.first.data, matrix: life.first.matrix, subpriority: life.first.subpriority },
  } : { id: life.id, start: life.start, end: life.end, initialData: life.first.data });
}
function phaseMap(side: Side, phase: "setup" | "unleash", rows: readonly Json[], rgb: readonly Buffer[]): Json {
  const wholeLatch = (hardware: string, software: string): string => `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`;
  const paletteExceptions = rows.flatMap((row, age) => age && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []);
  const bankTransitions = (key: "fadedPalette" | "hardwarePalette", bank: number): number[] => transitions(rows, (row) => row[key].slice(bank * 16, bank * 16 + 16));
  const rowMap = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, pointer: row.scriptPtr, pointerIdentity: row.scriptPointerIdentity,
    offset: row.scriptOffset, wait: row.scriptWait, visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, anim: sprite.animNum, data: sprite.data, matrix: sprite.matrix, subpriority: sprite.subpriority })),
    battlerAxes: { attacker: [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2, row.battlerSprites.target.y2] },
    tags: { impactTile: row.tileTags.includes(10135), impactPalette: row.paletteTags.includes(10135), birdTile: row.tileTags.includes(10284), birdPalette: row.paletteTags.includes(10284) },
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, { symbol: row.audio[channel].songHeaderIdentity.symbol, digest: sha(JSON.stringify(row.audio[channel])) }])),
    background: row.battleBg, registers: row.registers, bgVram: row.bgVram,
    rng: { gameplay: row.immutableState.rngValue, animation: row.animationRng },
    digests: {
      softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)),
      softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)),
      fadedPalette: sha(JSON.stringify(row.fadedPalette)), unfadedPalette: sha(JSON.stringify(row.unfadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)),
      tags: sha(JSON.stringify([row.paletteTags, row.tileTags, row.resourceAllocators])), parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)),
      engine: sha(JSON.stringify(row.engine)), rawBattleState: sha(JSON.stringify(row.rawBattleState)), immutableState: sha(JSON.stringify(row.immutableState)),
    },
    rgbSha256: row.sha256, ...changedPixels(rgb[age - 1], rgb[age]!),
  }));
  const tagLife = (tag: number, key: "tileTags" | "paletteTags"): Json => { const ages = rows.flatMap((row, age) => row[key].includes(tag) ? [age] : []); return { first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length }; };
  const rawStable = (key: string): boolean => rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key]));
  return {
    phase, frameCount: rows.length, lifecycle: { tasks: lifecycles(rows, "task"), sprites: lifecycles(rows, "sprite") },
    latches: {
      hardwareOamEqualsPrecedingSoftware: wholeLatch("hardwareOam", "softwareOam"),
      hardwareMatricesEqualPrecedingSoftware: wholeLatch("hardwareMatrices", "softwareMatrices"),
      hardwarePaletteEqualsPrecedingFaded: wholeLatch("hardwarePalette", "fadedPalette"), paletteSameRowExceptions: paletteExceptions,
      attackerSourceAxes: edges(rows, (row) => [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2]),
      targetSourceAxes: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]),
    },
    transitions: {
      registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length)),
      battleBg: Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, ages]) => (ages as number[]).length)),
      bgVram: transitions(rows, (row) => row.bgVram), fadedBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, bankTransitions("fadedPalette", bank)]).filter(([, ages]) => (ages as number[]).length)),
      hardwareBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, bankTransitions("hardwarePalette", bank)]).filter(([, ages]) => (ages as number[]).length)),
      gameplayRng: transitions(rows, (row) => row.immutableState.rngValue), animationRng: transitions(rows, (row) => row.animationRng),
    },
    resources: { impact: { tile: tagLife(10135, "tileTags"), palette: tagLife(10135, "paletteTags") }, bird: { tile: tagLife(10284, "tileTags"), palette: tagLife(10284, "paletteTags") } },
    state: {
      partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)),
      engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)),
      rawPlayerPartyStable: rawStable("playerParty"), rawOpponentPartyStable: rawStable("opponentParty"), rawBattleMonsStable: rawStable("battleMons"),
      rawOutcomeStable: rawStable("battleOutcome"), rawWeatherStable: rawStable("battleWeather"), rawGameplayRngStable: rawStable("gameplayRng"),
    },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length, ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).length },
    rows: rowMap,
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side], compressed = readFileSync(resolve(root, config.denseState)), json = gunzipSync(compressed), probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(probe.schema === "sky-attack-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 143, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === 0x082cd17b && probe.sourcePointerContract.endExclusive === 0x082cd313 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: root pointer`);
  invariant(same(probe.sourcePointerContracts, [{ start: 0x082cd17b, endExclusive: 0x082cd313 }, { start: 0x082d7ce5, endExclusive: 0x082d7d1d }]), `${side}: owned root/shared body`);
  invariant(same(probe.bodyWindows.map((body: Json) => body.frameCount), [149, 181]) && rows.length === 330 && probe.stageFacts.observedBodyCount === 2, `${side}: complete bodies`);
  invariant(rows.every((row) => row.scriptOwner === "Move_SKY_ATTACK" && ((row.scriptPtr >= 0x082cd17b && row.scriptPtr < 0x082cd313) || (row.scriptPtr >= 0x082d7ce5 && row.scriptPtr < 0x082d7d1d))), `${side}: source ownership`);
  for (const [age, row] of rows.entries()) invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.resourceAllocators.tileRanges.length === 64 && row.resourceAllocators.tileBitmap.length === 256 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704, `${side}: full row ${age}`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows);
  const setup = phaseMap(side, "setup", rows.slice(0, 149), rgb.slice(0, 149));
  const unleash = phaseMap(side, "unleash", rows.slice(149), rgb.slice(149));
  const map = { schema: "sky-attack-normalized-change-map/v1", oracleProfile: "battle-scene-on", side, sourceWindow: probe.sourceWindow, bodyWindows: probe.bodyWindows, sourcePointerContract: probe.sourcePointerContract, sourcePointerContracts: probe.sourcePointerContracts, topology: probe.topology, twoTurnBoundary: probe.stageFacts, setup, unleash };
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  invariant(setup.latches.hardwareOamEqualsPrecedingSoftware === "148/148" && setup.latches.hardwareMatricesEqualPrecedingSoftware === "148/148" && setup.latches.hardwarePaletteEqualsPrecedingFaded === "147/148" && same(setup.latches.paletteSameRowExceptions, [1]), `${side}: setup latches`);
  invariant(unleash.latches.hardwareOamEqualsPrecedingSoftware === "180/180" && unleash.latches.hardwareMatricesEqualPrecedingSoftware === "180/180" && unleash.latches.hardwarePaletteEqualsPrecedingFaded === "179/180" && same(unleash.latches.paletteSameRowExceptions, [45]), `${side}: unleash latches`);
  invariant(setup.lifecycle.tasks.some((life: Json) => life.id.includes("AnimTask_ShakeBattlers") && life.start === 43 && life.end === 106), `${side}: setup horizontal shake`);
  invariant(unleash.lifecycle.tasks.some((life: Json) => life.id.includes("AnimTask_UpdateSlidingBg") && life.start === 26 && life.end === 160) && unleash.lifecycle.tasks.some((life: Json) => life.id.includes("AnimTask_ShakeMon2_Step") && life.start === 86 && life.end === 119), `${side}: unleash slide/shake`);
  invariant(unleash.lifecycle.sprites.length === 1 && unleash.lifecycle.sprites[0].start === 70 && unleash.lifecycle.sprites[0].end === (side === "player-back" ? 93 : 92), `${side}: bird life`);
  invariant(same(unleash.transitions.bgVram, [26, 46, 142, 144, 161]) && unleash.transitions.battleBg.gBattle_BG3_X[0] === 26 && unleash.transitions.registers.bg3hofs[0] === 27 && unleash.transitions.battleBg.gBattle_BG3_X.at(-1) === 161 && unleash.transitions.registers.bg3hofs.at(-1) === 162, `${side}: BG_SKY slide/restore`);
  invariant(unleash.resources.impact.tile.first === 1 && unleash.resources.impact.tile.last === 179 && unleash.resources.bird.tile.first === 4 && unleash.resources.bird.tile.last === 179, `${side}: resource life`);
  invariant(setup.state.partiesStable && setup.state.battlersStable && setup.state.immutableStable && setup.state.rawGameplayRngStable && unleash.state.partiesStable && unleash.state.battlersStable && unleash.state.immutableStable && unleash.state.rawGameplayRngStable, `${side}: opaque gameplay state`);
  invariant(setup.cleanup.active === false && setup.cleanup.visualTasks === 0 && setup.cleanup.soundTasks === 0 && setup.cleanup.ownedTasks === 0 && unleash.cleanup.active === false && unleash.cleanup.visualTasks === 0 && unleash.cleanup.soundTasks === 0 && unleash.cleanup.ownedTasks === 0 && unleash.cleanup.ownedSprites === 0, `${side}: cleanup`);
  const current = {
    scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json),
    rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes),
    sourceWindow: probe.sourceWindow, bodyWindows: probe.bodyWindows, summary: { setup: { frameCount: setup.frameCount, lifecycle: setup.lifecycle, latches: setup.latches, transitions: setup.transitions, state: setup.state, cleanup: setup.cleanup }, unleash: { frameCount: unleash.frameCount, lifecycle: unleash.lifecycle, latches: unleash.latches, transitions: unleash.transitions, resources: unleash.resources, state: unleash.state, cleanup: unleash.cleanup }, twoTurnBoundary: probe.stageFacts },
  };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.repeatProbeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.repeatRawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: retained checksums/map`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/sky-attack-evidence.json");
if (process.argv.includes("--write")) {
  const result = { "player-back": verifySide("player-back", undefined, true), "opponent-front": verifySide("opponent-front", undefined, true) };
  const repeatPaths = { "player-back": process.env.SKY_ATTACK_PLAYER_REPEAT, "opponent-front": process.env.SKY_ATTACK_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.SKY_ATTACK_PLAYER_REPEAT_RGB, "opponent-front": process.env.SKY_ATTACK_OPPONENT_REPEAT_RGB };
  for (const side of ["player-back", "opponent-front"] as const) {
    invariant(repeatPaths[side] && repeatRgb[side], `${side}: repeat inputs required`);
    invariant(sha(readFileSync(repeatPaths[side]!)) === result[side].probeJsonSha256 && repeatRgb[side] === result[side].rawRgbSequenceSha256, `${side}: twice-fresh mismatch`);
    Object.assign(result[side], { repeatProbeJsonSha256: result[side].probeJsonSha256, repeatRawRgbSequenceSha256: repeatRgb[side] });
  }
  const fixture = {
    schema: "sky-attack-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_SKY_ATTACK", moveId: 143, status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { completeSetupAndUnleashBodies: true, sharedSkyBodyIncluded: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
    source: { rootStart: "0x082cd17b", rootEndExclusive: "0x082cd313", sharedSkyStart: "0x082d7ce5", sharedSkyEndExclusive: "0x082d7d1d", audit: "tools/compare/skyAttackSourceAudit.ts", probe: "tools/compare/skyAttackProbe.py", verifier: "tools/compare/skyAttackEvidence.ts" },
    acceptance: { freshRunsPerOrientation: 2, setupRows: 149, unleashRows: 181, totalRowsPerOrientation: 330, totalRows: 660, firstInactiveCleanupRetained: true },
    orientations: result,
    verdict: "Evidence only. MOVE_SKY_ATTACK stays unsupported; no reducer, seam, compositor, production dispatch, framebuffer acceptance, promotion, or component-track fulfillment is claimed.",
  };
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}

const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
invariant(fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && !coverage.entries.some((entry: Json) => entry.move === "MOVE_SKY_ATTACK"), "Sky Attack must remain unsupported/coverage-absent");
for (const id of ["play-se1-with-panning", "blend-battle-anim-palette-exclude", "horizontal-shake-complex-bg-palette"]) invariant(coverage.componentTracks.find((track: Json) => track.id === id)?.fulfilled !== true, `${id}: must remain unfulfilled`);
const result = { "player-back": verifySide("player-back", fixture.orientations["player-back"]), "opponent-front": verifySide("opponent-front", fixture.orientations["opponent-front"]) };
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, value]) => [side, { sourceWindow: value.sourceWindow, bodyWindows: value.bodyWindows, probeJsonSha256: value.probeJsonSha256, rawRgbSequenceSha256: value.rawRgbSequenceSha256, changeMapSha256: value.changeMapSha256, setupRows: value.summary.setup.frameCount, unleashRows: value.summary.unleash.frameCount, setupLatches: value.summary.setup.latches, unleashLatches: value.summary.unleash.latches }])), boundary: { productionChanged: false, coveragePromotion: false, componentTracksFulfilled: false, barrierChanged: false } }, null, 2));
