/** Hermetic verifier and normalized change-map builder for MOVE_SKILL_SWAP. */
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
  "player-back": { scenario: "tools/battle-lab/mechanic-skill-swap-player-girafarig-opponent-shuckle.json", denseState: "tools/compare/evidence/skill-swap-player-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/skill-swap-player-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/skill-swap-changemap-player.json" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-skill-swap-opponent-girafarig-player-shuckle.json", denseState: "tools/compare/evidence/skill-swap-opponent-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/skill-swap-opponent-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/skill-swap-changemap-opponent.json" },
} satisfies Record<Side, Json>;
const ownedTasks = new Set(["AnimTask_SkillSwap_Step", "AnimTask_BlendMonInAndOut_Step", "SetPsychicBackground_Step", "Task_FadeToBg", "Task_LoopAndPlaySE"]);
const orbTemplate = "gSkillSwapOrbSpriteTemplate";
const orbTag = 10251;

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] { return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []); }
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 128 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${archive}: archive shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => { const frame = byFrame.get(String(row.frame).padStart(5, "0")); invariant(frame && sha(frame) === row.sha256, `${archive}: frame ${row.frame}`); return frame; });
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel++) { const offset = pixel * 3; if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue; count++; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function lives(rows: readonly Json[], kind: "task" | "orb"): Json[] {
  const live = new Map<string, Json>(), result: Json[] = [];
  rows.forEach((row, age) => {
    const values = kind === "task" ? row.tasks.filter((item: Json) => ownedTasks.has(item.func.symbol)).map((item: Json) => [`${item.slot}:${item.func.symbol}`, item] as const) : row.sprites.filter((item: Json) => item.template.symbol === orbTemplate).map((item: Json) => [`${item.slot}:${item.template.symbol}`, item] as const);
    const current = new Map(values);
    for (const [id, item] of current) {
      const prior = live.get(id);
      const replaced = kind === "orb" && prior && (item.data[5] !== prior.last.data[5] || (item.x2 === 0 && item.y2 === 0 && (prior.last.x2 !== 0 || prior.last.y2 !== 0)));
      if (replaced) { result.push({ ...prior, end: age - 1 }); live.set(id, { id, start: age, first: item, last: item }); }
      else if (!prior) live.set(id, { id, start: age, first: item, last: item });
      else prior.last = item;
    }
    for (const [id, life] of live) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); live.delete(id); }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result.map((life) => kind === "task"
    ? { id: life.id, start: life.start, end: life.end, initialData: life.first.data }
    : { id: life.id, start: life.start, end: life.end, displayedStart: life.start + 1, displayedEnd: life.end + 1, callback: life.first.callback.symbol, matrixNum: life.first.matrixNum, first: { x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2, data: life.first.data, matrix: life.first.matrix, attr: life.first.attr, subpriority: life.first.subpriority } });
}
function mapFor(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  const predecessor = (hardware: string, software: string) => `${rows.slice(1).filter((row, index) => same(row[hardware], rows[index]![software])).length}/${rows.length - 1}`;
  const bankTransitions = (key: "fadedPalette" | "hardwarePalette", bank: number) => transitions(rows, (row) => row[key].slice(bank * 16, bank * 16 + 16));
  const tagAges = (key: "paletteTags" | "tileTags") => rows.flatMap((row, age) => row[key].includes(orbTag) ? [age] : []);
  const taskLives = lives(rows, "task"), orbLives = lives(rows, "orb");
  const rowMap = rows.map((row, age) => ({
    age, active: row.animScriptActive, owner: row.scriptOwner, offset: row.scriptOffset, wait: row.scriptWait,
    visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    orbs: row.sprites.filter((sprite: Json) => sprite.template.symbol === orbTemplate).map((sprite: Json) => ({ slot: sprite.slot, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr, animNum: sprite.animNum, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data, order: row.spriteOrder.indexOf(sprite.slot) })),
    battlerAxes: { attacker: [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2, row.battlerSprites.target.y2] },
    registers: row.registers, battleBg: row.battleBg,
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, { symbol: row.audio[channel].songHeaderIdentity.symbol, digest: sha(JSON.stringify(row.audio[channel])) }])),
    resources: { paletteSlot: row.paletteTags.indexOf(orbTag), tileSlot: row.tileTags.indexOf(orbTag), allocatorDigest: sha(JSON.stringify(row.resourceAllocators)) },
    digests: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), bgVram: sha(JSON.stringify(row.bgVram)), spriteOrder: sha(JSON.stringify(row.spriteOrder)), battle: sha(JSON.stringify([row.parties, row.battlers, row.engine, row.immutableState, row.rawBattleState])) },
    rgbSha256: row.sha256, ...changedPixels(rgb[age - 1], rgb[age]!),
  }));
  const attacker = rows[0]!.animationBattlers.attacker as number, target = rows[0]!.animationBattlers.target as number;
  const stable = (select: (row: Json) => unknown) => rows.every((row) => same(select(row), select(rows[0]!)));
  return {
    schema: "skill-swap-normalized-change-map/v1", oracleProfile: "battle-scene-on", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract, sourcePointerContracts: probe.sourcePointerContracts, topology: probe.topology,
    lifecycle: { tasks: taskLives, orbs: orbLives, orbCount: orbLives.length },
    latches: { hardwareOamEqualsPrecedingSoftware: predecessor("hardwareOam", "softwareOam"), hardwareMatricesEqualPrecedingSoftware: predecessor("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: predecessor("hardwarePalette", "fadedPalette"), oamExceptions: rows.flatMap((row, age) => age && !same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []), matrixExceptions: rows.flatMap((row, age) => age && !same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []), paletteExceptions: rows.flatMap((row, age) => age && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []), attackerAxes: edges(rows, (row) => [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2]), targetAxes: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]) },
    transitions: { registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length)), battleBg: Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, ages]) => (ages as number[]).length)), bgVram: transitions(rows, (row) => row.bgVram), fadedBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, bankTransitions("fadedPalette", bank)]).filter(([, ages]) => (ages as number[]).length)), hardwareBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, bankTransitions("hardwarePalette", bank)]).filter(([, ages]) => (ages as number[]).length)), audio: transitions(rows, (row) => row.audio), gameplayRng: transitions(rows, (row) => row.immutableState.rngValue), animationRng: transitions(rows, (row) => row.animationRng) },
    resources: { tag: orbTag, palette: { first: tagAges("paletteTags")[0], last: tagAges("paletteTags").at(-1), count: tagAges("paletteTags").length }, tile: { first: tagAges("tileTags")[0], last: tagAges("tileTags").at(-1), count: tagAges("tileTags").length } },
    outcome: { attacker, target, playerSpecies: rows[0]!.battlers.player.species, opponentSpecies: rows[0]!.battlers.opponent.species, playerAbilityAfterSwap: rows[0]!.battlers.player.ability, opponentAbilityAfterSwap: rows[0]!.battlers.opponent.ability },
    state: { partiesStable: stable((row) => row.parties), battlersStable: stable((row) => row.battlers), engineStable: stable((row) => row.engine), immutableStable: stable((row) => row.immutableState), rawBattleStable: stable((row) => row.rawBattleState), gameplayRngStable: stable((row) => row.rawBattleState.gameplayRng) },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length, ownedOrbs: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template.symbol === orbTemplate).length }, rows: rowMap,
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side], compressed = readFileSync(resolve(root, config.denseState)), json = gunzipSync(compressed), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const expectedRows = side === "player-back" ? 196 : 195;
  invariant(probe.schema === "skill-swap-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 285, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === 0x082ce3d8 && probe.sourcePointerContract.endExclusive === 0x082ce423 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: root pointer`);
  invariant(same(probe.sourcePointerContracts, [{ start: 0x082ce3d8, endExclusive: 0x082ce423 }, { start: 0x082d7cd1, endExclusive: 0x082d7ce5 }]), `${side}: owned source ranges`);
  invariant(rows.length === expectedRows && rows.at(-1)!.animScriptActive === false, `${side}: dense cleanup window`);
  rows.forEach((row, age) => invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.resourceAllocators.tileRanges.length === 64 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704, `${side}: complete row ${age}`));
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows), map = mapFor(side, probe, rgb), mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  invariant(map.lifecycle.orbCount === 24 && map.lifecycle.tasks.filter((life: Json) => life.id.includes("AnimTask_SkillSwap_Step")).length === 2 && map.lifecycle.tasks.filter((life: Json) => life.id.includes("AnimTask_BlendMonInAndOut_Step")).length === 2, `${side}: two orb/blend programs`);
  const firstLeg = map.lifecycle.orbs.filter((life: Json) => life.first.data[5] === -10), secondLeg = map.lifecycle.orbs.filter((life: Json) => life.first.data[5] === 10);
  invariant(same(firstLeg.map((life: Json) => life.start).sort((a: number, b: number) => a - b), [42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112, 119]) && same(secondLeg.map((life: Json) => life.start).sort((a: number, b: number) => a - b), [60, 67, 74, 81, 88, 95, 102, 109, 116, 123, 130, 137]), `${side}: twelve-orb cadence`);
  invariant(map.lifecycle.orbs.every((life: Json) => life.callback === "AnimSkillSwapOrb" && life.displayedStart === life.start + 1 && life.displayedEnd === life.end + 1 && [0, 3, 4, 5, 6].includes(life.matrixNum)), `${side}: orb birth/matrix/callback/removal`);
  const skillTasks = map.lifecycle.tasks.filter((life: Json) => life.id.includes("AnimTask_SkillSwap_Step")), blendTasks = map.lifecycle.tasks.filter((life: Json) => life.id.includes("AnimTask_BlendMonInAndOut_Step")), fadeTasks = map.lifecycle.tasks.filter((life: Json) => life.id.includes("Task_FadeToBg"));
  invariant(same(skillTasks.map((life: Json) => [life.start, life.end]), [[42, 136], [60, 154]]) && same(blendTasks.map((life: Json) => [life.start, life.end]), [[42, 112], [60, 130]]) && same(fadeTasks.map((life: Json) => [life.start, life.end]), [[4, 40], [156, side === "player-back" ? 193 : 192]]), `${side}: task ordering`);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === `${expectedRows - 1}/${expectedRows - 1}` && map.latches.hardwareMatricesEqualPrecedingSoftware === `${expectedRows - 1}/${expectedRows - 1}` && map.latches.hardwarePaletteEqualsPrecedingFaded === `${expectedRows - 1}/${expectedRows - 1}` && !map.latches.oamExceptions.length && !map.latches.matrixExceptions.length && !map.latches.paletteExceptions.length, `${side}: predecessor transfer`);
  const targetBank = side === "player-back" ? "17" : "16", attackerBank = side === "player-back" ? "16" : "17";
  invariant(map.transitions.fadedBanks[targetBank][0] === 44 && map.transitions.fadedBanks[targetBank].at(-1) === 113 && map.transitions.hardwareBanks[targetBank][0] === 45 && map.transitions.hardwareBanks[targetBank].at(-1) === 114 && map.transitions.fadedBanks[attackerBank][0] === 62 && map.transitions.fadedBanks[attackerBank].at(-1) === 131 && map.transitions.hardwareBanks[attackerBank][0] === 63 && map.transitions.hardwareBanks[attackerBank].at(-1) === 132, `${side}: target then attacker palette program`);
  invariant(same(map.transitions.bgVram, [23, 175]) && map.lifecycle.tasks.some((life: Json) => life.id.includes("SetPsychicBackground_Step") && life.start === 23 && life.end === 174), `${side}: Psychic BG fade/restore`);
  invariant(map.lifecycle.tasks.some((life: Json) => life.id.includes("Task_LoopAndPlaySE") && life.start === 42 && life.end === 90) && rows[42]!.audio.SE1.songHeaderIdentity.symbol === "se_m_reversal", `${side}: audio program`);
  invariant(map.resources.palette.first === 1 && map.resources.palette.last === expectedRows - 2 && map.resources.tile.first === 1 && map.resources.tile.last === expectedRows - 2, `${side}: orb resources`);
  invariant(map.outcome.playerSpecies === (side === "player-back" ? 203 : 213) && map.outcome.opponentSpecies === (side === "player-back" ? 213 : 203) && map.outcome.playerAbilityAfterSwap === (side === "player-back" ? 5 : 39) && map.outcome.opponentAbilityAfterSwap === (side === "player-back" ? 39 : 5), `${side}: legal ability swap outcome`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.rawBattleStable && map.state.gameplayRngStable, `${side}: opaque gameplay state`);
  invariant(map.cleanup.active === false && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0 && map.cleanup.ownedTasks === 0 && map.cleanup.ownedOrbs === 0, `${side}: cleanup`);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow, summary: { lifecycle: map.lifecycle, latches: map.latches, transitions: map.transitions, resources: map.resources, outcome: map.outcome, state: map.state, cleanup: map.cleanup } };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.repeatProbeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.repeatRawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: retained receipts`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/skill-swap-evidence.json");
if (process.argv.includes("--write")) {
  const result = { "player-back": verifySide("player-back", undefined, true), "opponent-front": verifySide("opponent-front", undefined, true) };
  const repeats = { "player-back": process.env.SKILL_SWAP_PLAYER_REPEAT, "opponent-front": process.env.SKILL_SWAP_OPPONENT_REPEAT }, repeatRgb = { "player-back": process.env.SKILL_SWAP_PLAYER_REPEAT_RGB, "opponent-front": process.env.SKILL_SWAP_OPPONENT_REPEAT_RGB };
  for (const side of ["player-back", "opponent-front"] as const) { invariant(repeats[side] && repeatRgb[side], `${side}: repeat inputs`); invariant(sha(readFileSync(repeats[side]!)) === result[side].probeJsonSha256 && repeatRgb[side] === result[side].rawRgbSequenceSha256, `${side}: twice-fresh mismatch`); Object.assign(result[side], { repeatProbeJsonSha256: result[side].probeJsonSha256, repeatRawRgbSequenceSha256: repeatRgb[side] }); }
  writeFileSync(fixturePath, `${JSON.stringify({ schema: "skill-swap-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_SKILL_SWAP", moveId: 285, status: "exact", coverageCredit: true, track: { id: "skill-swap-bluegreen-orb", fulfilled: true, representatives: ["MOVE_SKILL_SWAP"], novelComponentSiblings: [] }, controls: { MOVE_FORESIGHT: "exact", MOVE_NIGHTMARE: "exact-legal-body-only", MOVE_PSYWAVE: "unsupported", MOVE_EXTRASENSORY: "unsupported", transferCredit: false }, evidenceScope: { fullDenseRowsRetained: true, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, latchMeasured: true, legalAbilityOutcomeOnly: true, productionChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, actualCoreFramebufferAcceptance: true, coveragePromotion: true, siblingPromotion: false, componentTrackFulfilled: true, gameplayStateOwned: false, boundaryOrBarrierChanged: false }, source: { audit: "tools/compare/skillSwapSourceAudit.ts", probe: "tools/compare/skillSwapProbe.py", verifier: "tools/compare/skillSwapEvidence.ts" }, acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 196, "opponent-front": 195 }, totalRows: 391, firstInactiveCleanupRetained: true }, orientations: result, verdict: "MOVE_SKILL_SWAP alone is exact and fulfills skill-swap-bluegreen-orb after two independent 391/391 zero-residual actual-core processes; no sibling receives credit." }, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json, coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
invariant(fixture.status === "exact" && fixture.coverageCredit === true && fixture.evidenceScope.productionChanged === true && fixture.evidenceScope.reducerAdded === true && fixture.evidenceScope.typedSeamAdded === true && fixture.evidenceScope.compositorAdded === true && fixture.evidenceScope.actualCoreFramebufferAcceptance === true && coverage.entries.some((entry: Json) => entry.move === "MOVE_SKILL_SWAP" && entry.status === "exact"), "exact promotion boundary");
const track = coverage.componentTracks.find((entry: Json) => entry.id === "skill-swap-bluegreen-orb");
invariant(track && track.fulfilled === true && same(track.representatives, ["MOVE_SKILL_SWAP"]), "fulfilled track boundary");
const result = { "player-back": verifySide("player-back", fixture.orientations["player-back"]), "opponent-front": verifySide("opponent-front", fixture.orientations["opponent-front"]) };
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, value]) => [side, { sourceWindow: value.sourceWindow, probeJsonSha256: value.probeJsonSha256, rawRgbSequenceSha256: value.rawRgbSequenceSha256, changeMapSha256: value.changeMapSha256, rows: value.sourceWindow.frameCount, latches: value.summary.latches, outcome: value.summary.outcome, cleanup: value.summary.cleanup }])), boundary: fixture.evidenceScope }, null, 2));
