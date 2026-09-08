/** Strict verifier for the retained unsupported MOVE_SUNNY_DAY evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixturePath = resolve(root, "tools/compare/fixtures/sunny-day-evidence.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

function ranges(ages: number[]): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (const age of ages) {
    const last = result.at(-1);
    if (!last || age !== last[1] + 1) result.push([age, age]);
    else last[1] = age;
  }
  return result;
}

function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age > 0 && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}

function taskAges(rows: Json[], symbol: string): Array<[number, number]> {
  return ranges(rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func?.symbol === symbol) ? [age] : []));
}

function rgbFrames(archive: string, rows: Json[]): Buffer[] {
  const scratch = createScratchDir("pokebench-sunny-day-rgb-");
  execFileSync("tar", ["-xzf", archive, "-C", scratch]);
  return rows.map((row, age) => {
    const path = join(scratch, `${String(row.frame).padStart(5, "0")}.rgb`);
    const rgb = readFileSync(path);
    invariant(rgb.length === 240 * 160 * 3, `${archive}: RGB row ${age} shape`);
    invariant(sha(rgb) === row.sha256, `${archive}: RGB row ${age} hash`);
    return rgb;
  });
}

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function lifecycles(rows: Json[], template: string): Json[] {
  const lives: Json[] = []; let previous = new Map<number, Json>();
  rows.forEach((row, age) => {
    const current = new Map<number, Json>(row.sprites.filter((sprite: Json) => sprite.template?.symbol === template).map((sprite: Json) => [sprite.slot, sprite]));
    for (const [slot, sprite] of current) if (!previous.has(slot)) lives.push({ slot, start: age, end: null, first: sprite });
    for (const life of lives) if (life.end === null && previous.has(life.slot) && !current.has(life.slot)) life.end = age - 1;
    previous = current;
  });
  for (const life of lives) if (life.end === null) life.end = rows.length - 1;
  return lives;
}

function normalizedMap(side: Side, probe: Json, rgb: Buffer[]): string {
  const rows = probe.frames as Json[];
  const rayLives = lifecycles(rows, "gSunlightRaySpriteTemplate").map((life) => ({
    slot: life.slot, start: life.start, end: life.end,
    displayedStart: life.start + 1, displayedEnd: life.end + 1,
    callback: life.first.callback?.symbol, template: life.first.template?.symbol,
    x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2,
    data: life.first.data, attr: life.first.attr, matrixNum: life.first.matrixNum,
    matrix: life.first.matrix, subpriority: life.first.subpriority,
    painterOrder: rows[life.start]!.spriteOrder.indexOf(life.slot),
    callbackTransitions: transitions(rows.slice(life.start, life.end + 1), (row) => row.sprites.find((sprite: Json) => sprite.slot === life.slot && sprite.template?.symbol === "gSunlightRaySpriteTemplate")?.callback?.symbol).map((age) => age + life.start),
  }));
  const relevantTasks = new Set(["AnimTask_BlendSpriteColor_Step2", "Task_UpdateMonBg", "Task_ClearMonBg", "Task_PanFromInitialToTarget"]);
  const rowMaps = rows.map((row, age) => ({
    age, frame: row.frame, scriptOwner: row.scriptOwner, scriptPtr: row.scriptPtr,
    scriptPtrParity: row.scriptPtrParity, scriptOffset: row.scriptOffset,
    scriptWait: row.scriptWait, active: row.animScriptActive,
    visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
    ...changedPixels(rgb[age - 1], rgb[age]),
    tasks: row.tasks.filter((task: Json) => relevantTasks.has(task.func?.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    rays: row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSunlightRaySpriteTemplate").map((sprite: Json) => ({ slot: sprite.slot, callback: sprite.callback?.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, data: sprite.data, matrixNum: sprite.matrixNum, matrix: sprite.matrix, invisible: sprite.invisible })),
    palette: { fadedChanged: age > 0 && !same(row.fadedPalette, rows[age - 1]!.fadedPalette), hardwareChanged: age > 0 && !same(row.hardwarePalette, rows[age - 1]!.hardwarePalette), unfadedChanged: age > 0 && !same(row.unfadedPalette, rows[age - 1]!.unfadedPalette) },
    resources: { paletteTag: row.paletteTags.includes(10157), tileTag: row.tileTags.includes(10157) },
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, { symbol: row.audio[channel].songHeaderIdentity.symbol, panX: row.audio[channel].tracks.map((track: Json) => track.panX) }])),
    monbg: { update: row.tasks.some((task: Json) => task.func?.symbol === "Task_UpdateMonBg"), clear: row.tasks.some((task: Json) => task.func?.symbol === "Task_ClearMonBg") },
    displayTransfer: age === 0 ? null : { oam: same(row.hardwareOam, rows[age - 1]!.softwareOam), matrix: same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices), palette: same(row.hardwarePalette, rows[age - 1]!.fadedPalette) },
    registers: row.registers,
    bgVram: row.bgVram,
  }));
  const current = (name: string, age: number) => rows[age]!.audio[name].songHeaderIdentity.symbol;
  const audioStarts = rows.flatMap((row, age) => ["SE1", "SE2"].flatMap((channel) => age === 0 || current(channel, age) !== current(channel, age - 1) ? [{ age, channel, symbol: current(channel, age), panX: row.audio[channel].tracks.map((track: Json) => track.panX) }] : []));
  const latched = (field: "hardwareOam" | "hardwareMatrices" | "hardwarePalette", prior: "softwareOam" | "softwareMatrices" | "fadedPalette") => rows.slice(1).filter((row, age) => same(row[field], rows[age]![prior])).length;
  const tagAges = rows.flatMap((row, age) => row.paletteTags.includes(10157) && row.tileTags.includes(10157) ? [age] : []);
  const map = {
    schema: "sunny-day-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    sourceRows: rows.map((row, age) => ({ age, frame: row.frame, owner: row.scriptOwner, pointer: row.scriptPtr, parity: row.scriptPtrParity, offset: row.scriptOffset, active: row.animScriptActive, sha256: row.sha256 })),
    lifetimes: {
      palette: { task: "AnimTask_BlendSpriteColor_Step2", taskRanges: taskAges(rows, "AnimTask_BlendSpriteColor_Step2"), faded: transitions(rows, (row) => row.fadedPalette), hardware: transitions(rows, (row) => row.hardwarePalette), unfaded: transitions(rows, (row) => row.unfadedPalette) },
      oam: { liveRows: [0, rows.length - 1], hardwareEqualsPrecedingSoftware: `${latched("hardwareOam", "softwareOam")}/${rows.length - 1}` },
      matrix: { liveRows: [0, rows.length - 1], hardwareEqualsPrecedingSoftware: `${latched("hardwareMatrices", "softwareMatrices")}/${rows.length - 1}` },
      resources: { tag: "ANIM_TAG_SUNLIGHT", tagValue: 10157, paletteAndTileLiveAges: [tagAges[0], tagAges.at(-1)], paletteAndTileCleanupAge: rows.findIndex((row, age) => age > (tagAges.at(-1) ?? -1) && !row.paletteTags.includes(10157) && !row.tileTags.includes(10157)), loadFirstAge: tagAges[0] },
      audio: { starts: audioStarts, panTaskRanges: taskAges(rows, "Task_PanFromInitialToTarget"), petalDanceAges: rows.flatMap((row, age) => row.audio.SE1.songHeaderIdentity.symbol === "se_m_petal_dance" ? [age] : []) },
      monbg: { updateTaskRanges: taskAges(rows, "Task_UpdateMonBg"), clearTaskRanges: taskAges(rows, "Task_ClearMonBg"), bgVramChanges: transitions(rows, (row) => row.bgVram), registerChanges: transitions(rows, (row) => row.registers) },
      blend: { setalpha: { eva: 13, evb: 3 }, taskRanges: taskAges(rows, "AnimTask_BlendSpriteColor_Step2"), blendoffAge: transitions(rows, (row) => row.registers).at(-1) },
      sunlightRays: rayLives,
      displayTransfer: { hardwareOamEqualsPrecedingSoftware: `${latched("hardwareOam", "softwareOam")}/${rows.length - 1}`, hardwareMatricesEqualsPrecedingSoftware: `${latched("hardwareMatrices", "softwareMatrices")}/${rows.length - 1}`, hardwarePaletteEqualsPrecedingFaded: `${latched("hardwarePalette", "fadedPalette")}/${rows.length - 1}`, wholeBufferRows: rows.length - 1 },
    },
    state: { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), rawBattleStateStable: rows.every((row) => same(row.rawBattleState, rows[0]!.rawBattleState)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRngTransitions: transitions(rows, (row) => row.animationRng), animationRngDistinct: new Set(rows.map((row) => row.animationRng)).size },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, rays: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSunlightRaySpriteTemplate").length, sunlightPaletteTag: rows.at(-1)!.paletteTags.includes(10157), sunlightTileTag: rows.at(-1)!.tileTags.includes(10157) },
    rows: rowMaps,
  };
  return `${JSON.stringify(map, null, 2)}\n`;
}

function verifyOrientation(side: Side, contract: Json): Json {
  for (const [path, expected] of [[contract.scenario, contract.scenarioSha256], [contract.denseState, contract.denseStateSha256], [contract.rawRgbArchive, contract.rawRgbArchiveSha256]] as const) invariant(sha(readFileSync(resolve(root, path))) === expected, `${side}: ${path} hash drift`);
  invariant(contract.probeJsonSha256 === contract.repeatProbeJsonSha256 && contract.rawRgbSequenceSha256 === contract.repeatRawRgbSequenceSha256, `${side}: fresh repeat hash drift`);
  const compressed = readFileSync(resolve(root, contract.denseState)); const json = gunzipSync(compressed); const probe = JSON.parse(json.toString("utf8")) as Json; const rows = probe.frames as Json[];
  invariant(sha(json) === contract.probeJsonSha256, `${side}: dense JSON hash drift`);
  invariant(probe.schema === "sunny-day-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 241, `${side}: probe identity drift`);
  invariant(same(probe.sourceWindow, contract.sourceWindow) && rows.length === 158 && rows[0]!.frame === contract.sourceWindow.startFrame && rows.at(-1)!.frame === contract.sourceWindow.endFrame, `${side}: complete consecutive window drift`);
  invariant(rows.every((row, age) => row.frame === rows[0]!.frame + age && row.scriptOwner === "Move_SUNNY_DAY" && row.scriptPtr >= 0x082d2707 && row.scriptPtr < 0x082d275d && row.scriptPtrParity === (row.scriptPtr & 1) && row.scriptOffset !== null), `${side}: source-relative row mapping drift`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive === true && rows.at(-1)!.animScriptActive === false, `${side}: entry/cleanup boundary drift`);
  invariant(same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer parity drift`);
  invariant(same(taskAges(rows, "AnimTask_BlendSpriteColor_Step2"), [[7, 18], [106, 117]]) && same(taskAges(rows, "Task_UpdateMonBg"), [[4, 121]]) && same(taskAges(rows, "Task_ClearMonBg"), [[119, 121]]) && same(taskAges(rows, "Task_PanFromInitialToTarget"), [[20, 147]]), `${side}: task lifetimes drift`);
  invariant(same(lifecycles(rows, "gSunlightRaySpriteTemplate").map((life) => [life.slot, life.start, life.end]), [[3, 20, 80], [4, 28, 88], [5, 36, 96], [7, 44, 104]]), `${side}: ray lifetimes drift`);
  for (const row of rows) invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.unfadedPalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.parties.player.length === 3 && row.parties.opponent.length === 3, `${side}: retained buffer/party shape drift`);
  const immutable = JSON.stringify(rows[0]!.immutableState); const parties = JSON.stringify(rows[0]!.parties); const battlers = JSON.stringify(rows[0]!.battlers); const engine = JSON.stringify(rows[0]!.engine); const rawBattle = JSON.stringify(rows[0]!.rawBattleState);
  invariant(rows.every((row) => JSON.stringify(row.immutableState) === immutable && JSON.stringify(row.parties) === parties && JSON.stringify(row.battlers) === battlers && JSON.stringify(row.engine) === engine && JSON.stringify(row.rawBattleState) === rawBattle), `${side}: gameplay/party state changed`);
  invariant(new Set(rows.map((row) => row.immutableState.rngValue)).size === 1 && new Set(rows.map((row) => row.animationRng)).size === 156, `${side}: RNG domains drift`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam) && same(row.hardwareMatrices, rows[age]!.softwareMatrices) && same(row.hardwarePalette, rows[age]!.fadedPalette)), `${side}: display transfer latch drift`);
  invariant(same(transitions(rows, (row) => row.fadedPalette), [1, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119]) && same(transitions(rows, (row) => row.hardwarePalette), [2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]) && same(transitions(rows, (row) => row.unfadedPalette), [1]), `${side}: palette transfer schedule drift`);
  invariant(same(transitions(rows, (row) => row.paletteTags), [1, 157]) && same(transitions(rows, (row) => row.tileTags), [1, 157]) && same(transitions(rows, (row) => row.bgVram), [5, 121, 123]) && same(transitions(rows, (row) => row.registers), side === "player-back" ? [4, 7, 119, 123] : [5, 7, 119, 123]), `${side}: resource/register transfer schedule drift`);
  invariant(same(rows.flatMap((row, age) => ["SE1", "SE2"].flatMap((channel) => age === 0 || row.audio[channel].songHeaderIdentity.symbol !== rows[age - 1]!.audio[channel].songHeaderIdentity.symbol ? [[age, channel, row.audio[channel].songHeaderIdentity.symbol]] : [])), [[0, "SE1", "se_effective"], [0, "SE2", "se_select"], [20, "SE1", "se_m_petal_dance"]]), `${side}: audio starts drift`);
  invariant(rows.at(-1)!.tasks.length === 0 && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && !rows.at(-1)!.sprites.some((sprite: Json) => sprite.template?.symbol === "gSunlightRaySpriteTemplate") && !rows.at(-1)!.paletteTags.includes(10157) && !rows.at(-1)!.tileTags.includes(10157), `${side}: first inactive cleanup drift`);
  const rgb = rgbFrames(resolve(root, contract.rawRgbArchive), rows); const sequence = Buffer.concat(rgb); invariant(sha(sequence) === contract.rawRgbSequenceSha256, `${side}: RGB sequence hash drift`);
  const map = normalizedMap(side, probe, rgb); const mapBytes = Buffer.from(map); const mapPath = resolve(root, contract.changeMap);
  if (process.argv.includes("--write-maps")) writeFileSync(mapPath, mapBytes); else invariant(sha(readFileSync(mapPath)) === contract.changeMapSha256 && readFileSync(mapPath, "utf8") === map, `${side}: normalized map drift`);
  const generated = JSON.parse(map) as Json;
  return { sourceWindow: probe.sourceWindow, denseRows: rows.length, rawRgbRows: rgb.length, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(sequence), changeMapSha256: sha(mapBytes), taskRanges: generated.lifetimes, state: generated.state, cleanup: generated.cleanup };
}

export function verifySunnyDayEvidence(): Record<Side, Json> {
  invariant(fixture.schema === "sunny-day-bilateral-evidence/v1" && fixture.move === "MOVE_SUNNY_DAY" && fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && fixture.oracleProfile === "battle-scene-on", "Sunny Day evidence boundary drift");
  invariant(fixture.evidenceScope.productionAnimationChanged === false && fixture.evidenceScope.reducerAdded === false && fixture.evidenceScope.typedSeamAdded === false && fixture.evidenceScope.compositorAdded === false && fixture.evidenceScope.coveragePromotion === false && fixture.evidenceScope.componentTrackCredit === false && fixture.evidenceScope.latchPromotion === false && fixture.evidenceScope.gameplayStateOwned === false, "Sunny Day evidence-only boundary drift");
  invariant(sha(readFileSync(resolve(root, fixture.source.audit))) === fixture.source.auditSha256 && sha(readFileSync(resolve(root, fixture.source.probe))) === fixture.source.probeSha256, "Sunny Day source receipt drift");
  const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root, encoding: "utf8" })) as Json;
  invariant(audit.status === "unsupported" && audit.coverageCredit === false && audit.source.start === "0x082d2707" && audit.source.endExclusive === "0x082d275d" && audit.source.romSha256 === "071e826f54008cdf3600067e74cf318a4dfd513e93bc41b1cf8797723dcf6f36" && audit.source.sourceSha256 === "01e605c9208c0c681cf47a20bb371ef0472bb506db66d0fb909cc8f4560b6155", "Sunny Day source classification drift");
  const result = {} as Record<Side, Json>;
  for (const side of ["player-back", "opponent-front"] as const) result[side] = verifyOrientation(side, fixture.orientations[side]);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySunnyDayEvidence(), null, 2));
