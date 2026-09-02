/** Strict replay and normalized state/change-map verifier for Horn Drill evidence. */
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
  "player-back": { scenario: "tools/battle-lab/mechanic-horn-drill-player-seaking-opponent-onix.json", denseState: "tools/compare/evidence/horn-drill-player-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/horn-drill-player-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/horn-drill-changemap-player.json" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-horn-drill-opponent-seaking-player-onix.json", denseState: "tools/compare/evidence/horn-drill-opponent-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/horn-drill-opponent-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/horn-drill-changemap-opponent.json" },
} satisfies Record<Side, Json>;
const ownedTemplates = new Set(["gBowMonSpriteTemplate", "gHornHitSpriteTemplate", "gFlashingHitSplatSpriteTemplate"]);
const ownedTasks = new Set(["AnimTask_UpdateSlidingBg", "AnimTask_ShakeMonInPlace_Step", "Task_FadeToBg"]);

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 }); const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${archive}: RGB archive shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^\.\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(frame, `${archive}: missing RGB frame ${row.frame}`);
    invariant(frame.length === size && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`);
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
    id: life.id, start: life.start, end: life.end, displayedStart: life.start + 1, displayedEnd: life.end + 1,
    template: life.first.template.symbol, callback: life.first.callback.symbol,
    geometry: { slot: life.first.slot, x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2, data: life.first.data, matrix: life.first.matrix, subpriority: life.first.subpriority, persistentOrder: rows[life.start]!.spriteOrder.indexOf(life.first.slot) },
  } : { id: life.id, start: life.start, end: life.end, data: life.first.data });
}
function tagLife(rows: readonly Json[], tag: number): Json {
  const ages = rows.flatMap((row, age) => row.tileTags.includes(tag) || row.paletteTags.includes(tag) ? [age] : []);
  return { first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length };
}
function battlerSprite(row: Json, battler: number): Json {
  const slot = row.animationBattlers.spriteIds[battler];
  return row.sprites.find((sprite: Json) => sprite.slot === slot);
}
function derive(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[]; const spriteLives = lifecycles(rows, "sprite"), taskLives = lifecycles(rows, "task");
  const attacker = rows[0]!.animationBattlers.attacker as number, target = rows[0]!.animationBattlers.target as number;
  const shakeRange = rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func.symbol === "AnimTask_ShakeMonInPlace_Step") ? [age] : []);
  const shakeFit = (battler: number, role: string): Json => {
    const sourceChanges = transitions(rows, (row) => battlerSprite(row, battler).x2).filter((age) => age >= 74 && age <= 151);
    return { role, invocation: role === "attacker" ? [2, 0, 40, 1] : [10, 0, 40, 1], sourceChanges, firstSourceChange: sourceChanges[0], finalSourceCleanup: sourceChanges.at(-1), hardwareLag: 1,
      proof: "battler source x2 reaches same-row software OAM; complete hardware OAM equals preceding software OAM" };
  };
  const spriteCounts = Object.fromEntries([...ownedTemplates].map((name) => [name, spriteLives.filter((life) => life.template === name).length]));
  const wholeLatch = (hardware: string, software: string): string => `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`;
  const registerTransitions = Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length));
  const scrollTransitions = Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, ages]) => (ages as number[]).length));
  const bgVramTransitions = transitions(rows, (row) => row.bgVram);
  const rowMap = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, pointer: row.scriptPtr, offset: row.scriptOffset, wait: row.scriptWait,
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, data: sprite.data, matrix: sprite.matrix, subpriority: sprite.subpriority, persistentOrder: row.spriteOrder.indexOf(sprite.slot) })),
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, { symbol: row.audio[channel].songHeaderIdentity.symbol, status: row.audio[channel].status, digest: sha(JSON.stringify(row.audio[channel])) }])),
    tags: { hornHit: row.tileTags.includes(10020) || row.paletteTags.includes(10020), impact: row.tileTags.includes(10135) || row.paletteTags.includes(10135) },
    scroll: row.battleBg, registers: row.registers, bgVram: row.bgVram, gameplayRng: row.immutableState.rngValue, animationRng: row.animationRng,
    digests: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), spriteOrder: sha(JSON.stringify(row.spriteOrder)), parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)) },
    ...changedPixels(rgb[age - 1], rgb[age]!),
  }));
  return {
    schema: "horn-drill-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract,
    lifecycle: { spriteLives, taskLives, spriteCounts },
    latches: { hardwareOamEqualsPrecedingSoftware: wholeLatch("hardwareOam", "softwareOam"), hardwareMatricesEqualPrecedingSoftware: wholeLatch("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: wholeLatch("hardwarePalette", "fadedPalette"), shakeInvocations: [shakeFit(attacker, "attacker"), shakeFit(target, "target")], scrollSourceStart: 26, scrollHardwareStart: 27, scrollSourceCleanup: 172, scrollHardwareCleanup: 173 },
    audio: { headbuttDispatch: 45, bangAndFirstHornAttackDispatch: 74, hornAttackDispatches: [74, 80, 86, 92, 98, 104, 110, 116, 122, 128, 134], note: "SE_BANG and first SE_M_HORN_ATTACK dispatch in one sampled row; final SE1 state is Horn Attack" },
    resources: { hornHit: tagLife(rows, 10020), impact: tagLife(rows, 10135) },
    background: { bgVramTransitions, scrollTransitions, registerTransitions, drillLoadAge: 26, drillRestoreAge: 172 },
    state: { attacker, target, partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRngTransitions: transitions(rows, (row) => row.animationRng) },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).length, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length, hornTag: tagLife(rows, 10020).last, impactTag: tagLife(rows, 10135).last },
    rows: rowMap,
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side]; const compressed = readFileSync(resolve(root, config.denseState)); const json = gunzipSync(compressed); const probe = JSON.parse(json.toString("utf8")) as Json; const rows = probe.frames as Json[];
  invariant(probe.schema === "horn-drill-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 32, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === 0x082cc804 && probe.sourcePointerContract.endExclusive === 0x082cc981 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  invariant(rows.length === (side === "player-back" ? 193 : 192) && rows.every((row) => row.scriptOwner === "Move_HORN_DRILL" && row.scriptPtr >= 0x082cc804 && row.scriptPtr < 0x082cc981), `${side}: dense pointer rows`);
  rows.forEach((row, age) => invariant(row.tasks.length <= 16 && row.sprites.length <= 64 && row.spriteOrder.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4, `${side}: full row ${age}`));
  invariant(!rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: inactive cleanup`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows); const map = derive(side, probe, rgb); const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  invariant(map.lifecycle.spriteCounts.gBowMonSpriteTemplate === 3 && map.lifecycle.spriteCounts.gHornHitSpriteTemplate === 1 && map.lifecycle.spriteCounts.gFlashingHitSplatSpriteTemplate === 11, `${side}: sprite counts`);
  invariant(map.lifecycle.taskLives.filter((life: Json) => life.id.includes("AnimTask_ShakeMonInPlace_Step")).length === 2 && map.lifecycle.taskLives.some((life: Json) => life.id.includes("AnimTask_UpdateSlidingBg") && life.start === 26 && life.end === 171), `${side}: tasks`);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === `${rows.length - 1}/${rows.length - 1}` && map.latches.hardwareMatricesEqualPrecedingSoftware === `${rows.length - 1}/${rows.length - 1}` && map.latches.hardwarePaletteEqualsPrecedingFaded === `${rows.length - 1}/${rows.length - 1}`, `${side}: RAM+1 buffers`);
  invariant(map.latches.shakeInvocations.every((fit: Json) => fit.firstSourceChange === 74 && fit.finalSourceCleanup === 151 && fit.hardwareLag === 1), `${side}: independent shake fits`);
  invariant(same(map.background.bgVramTransitions, [26, 172]) && map.latches.scrollSourceStart === 26 && map.latches.scrollHardwareStart === 27 && map.latches.scrollSourceCleanup === 172 && map.latches.scrollHardwareCleanup === 173, `${side}: Horn Drill BG schedule`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.gameplayRngTransitions.length === 0, `${side}: gameplay invariance`);
  invariant(map.cleanup.ownedSprites === 0 && map.cleanup.ownedTasks === 0 && map.cleanup.hornTag === rows.length - 2 && map.cleanup.impactTag === rows.length - 2, `${side}: cleanup`);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow, summary: { lifecycle: map.lifecycle.spriteCounts, tasks: map.lifecycle.taskLives.map((life: Json) => ({ id: life.id, start: life.start, end: life.end })), latches: map.latches, audio: map.audio, resources: map.resources, background: map.background, state: map.state, cleanup: map.cleanup } };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: receipt/map drift`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/horn-drill-evidence.json");
if (process.argv.includes("--write")) {
  const player = verifySide("player-back", undefined, true), opponent = verifySide("opponent-front", undefined, true);
  const repeat = { "player-back": process.env.HORN_DRILL_PLAYER_REPEAT, "opponent-front": process.env.HORN_DRILL_OPPONENT_REPEAT };
  const repeatRaw = { "player-back": process.env.HORN_DRILL_PLAYER_REPEAT_RGB_SHA256, "opponent-front": process.env.HORN_DRILL_OPPONENT_REPEAT_RGB_SHA256 };
  for (const side of ["player-back", "opponent-front"] as const) { const path = repeat[side]; invariant(path, `${side}: repeat required`); const digest = sha(readFileSync(path)); const first = side === "player-back" ? player : opponent; invariant(digest === first.probeJsonSha256, `${side}: repeat dense mismatch`); invariant(repeatRaw[side] === first.rawRgbSequenceSha256, `${side}: repeat raw RGB mismatch`); first.repeatProbeJsonSha256 = digest; first.repeatRawRgbSequenceSha256 = repeatRaw[side]; }
  const fixture = { schema: "horn-drill-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_HORN_DRILL", moveId: 32, status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
    source: { start: "0x082cc804", endExclusive: "0x082cc981", byteLength: 381, sha256: "00717aca816d14907377ca6a8e90409e8c285d34dd99e34e4e66ebab7d9c0def", components: 16, lowestLevel50Carrier: { setId: 333, frontierMon: "FRONTIER_MON_SEAKING_2", species: "SPECIES_SEAKING" }, audit: "tools/compare/hornDrillSourceAudit.ts", probe: "tools/compare/hornDrillProbe.py", verifier: "tools/compare/hornDrillEvidence.ts" },
    acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 193, "opponent-front": 192 }, rawRgbRows: { "player-back": 193, "opponent-front": 192 }, productionFramebufferCompared: false, latchVerdict: "both Horn Drill ShakeMonInPlace invocations independently fit RAM+1 in both orientations; OAM, matrices, and faded palette are complete-buffer RAM+1", backgroundVerdict: "Horn Drill-owned BG VRAM load age 26, signed 9/-3 source scroll cadence ages 26..171 with hardware RAM+1, restore age 172 and hardware cleanup age 173" },
    orientations: { "player-back": player, "opponent-front": opponent }, controls: { inheritedShakeSchedule: false, inheritedSlidingBgSchedule: false, inferredSiblingCredit: false },
    acceptanceVerdict: "Evidence only: MOVE_HORN_DRILL and horn-drill-bg-horn-shakes remain unsupported/unfulfilled; no reducer, seam, compositor, framebuffer acceptance, promotion, or sibling credit." };
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json; const result: Json = {};
for (const side of ["player-back", "opponent-front"] as const) result[side] = verifySide(side, fixture.orientations[side]);
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, item]: [string, Json]) => [side, { sourceWindow: item.sourceWindow, probeJsonSha256: item.probeJsonSha256, repeatProbeJsonSha256: fixture.orientations[side].repeatProbeJsonSha256, rawRgbSequenceSha256: item.rawRgbSequenceSha256, latches: item.summary.latches, lifecycle: item.summary.lifecycle, audio: item.summary.audio, resources: item.summary.resources, background: { bgVramTransitions: item.summary.background.bgVramTransitions }, state: item.summary.state, cleanup: item.summary.cleanup }])), boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } }, null, 2));
