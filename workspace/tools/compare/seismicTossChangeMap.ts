/** Rebuild the complete source-relative MOVE_SEISMIC_TOSS evidence map. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const sprites = new Set(["gBasicHitSplatSpriteTemplate", "gRockScatterSpriteTemplate"]);
const tasks = new Set(["AnimTask_MoveSeismicTossBg", "AnimTask_SeismicTossBgAccelerateDownAtEnd", "AnimTask_ShakeMon_Step", "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg"]);
const blocks = [
  [0x082d6b00, 0x082d6b48, "Move_SEISMIC_TOSS"],
  [0x082d6b48, 0x082d6b53, "SeismicTossContinue"],
  [0x082d6b53, 0x082d6b64, "SeismicTossWeak"],
  [0x082d6b64, 0x082d6b7c, "SeismicTossMedium"],
  [0x082d6b7c, 0x082d6b9b, "SeismicTossStrong"],
  [0x082d6b9b, 0x082d6bfc, "SeismicTossRockScatter1"],
  [0x082d6bfc, 0x082d6c5d, "SeismicTossRockScatter2"],
] as const;

function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function block(pointer: number): string | null { return blocks.find(([a, b]) => pointer >= a && pointer < b)?.[2] ?? null; }
function edges(rows: readonly Json[], pick: (row: Json) => unknown): unknown[][] {
  let prior: unknown;
  return rows.flatMap((row, age) => { const value = pick(row); const changed = age === 0 || !same(value, prior); prior = value; return changed ? [[age, value]] : []; });
}
function changedRanges(a: readonly unknown[], b: readonly unknown[]): number[][] {
  const result: number[][] = [];
  b.forEach((value, index) => { if (same(value, a[index])) return; const prior = result.at(-1); if (prior?.[1] === index - 1) prior[1] = index; else result.push([index, index]); });
  return result;
}
function bufferChanges(rows: readonly Json[], field: string): Json[] {
  return rows.flatMap((row, age) => age && !same(row[field], rows[age - 1]![field]) ? [{ age, ranges: changedRanges(rows[age - 1]![field], row[field]) }] : []);
}
function keyedEdges(rows: readonly Json[], field: string): Json {
  return Object.fromEntries(Object.keys(rows[0]![field]).map((key) => [key, edges(rows, (row) => row[field][key])]));
}
function lives(rows: readonly Json[], kind: "sprites" | "tasks", names: Set<string>): Json[] {
  const active = new Map<string, Json>(), result: Json[] = [];
  rows.forEach((row, age) => {
    const current = new Map<string, Json>();
    for (const item of row[kind]) { const name = kind === "sprites" ? item.template.symbol : item.func.symbol; if (names.has(name)) current.set(`${item.slot}:${name}`, item); }
    for (const [id, item] of current) { const life = active.get(id); if (life) { life.end = age; life.last = item; life.ages.push(age); } else active.set(id, { slot: item.slot, name: id.slice(id.indexOf(":") + 1), start: age, end: age, ages: [age], first: item, last: item }); }
    for (const [id, life] of active) if (!current.has(id)) { result.push(life); active.delete(id); }
  });
  result.push(...active.values()); return result.sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function compactSprite(item: Json): Json { return { slot: item.slot, template: item.template.symbol, callback: item.callback?.symbol, raw: item.raw, attr: item.attr, x: item.x, y: item.y, x2: item.x2, y2: item.y2, animNum: item.animNum, animCmdIndex: item.animCmdIndex, animDelayCounter: item.animDelayCounter, subpriority: item.subpriority, flags: item.flags, matrixNum: item.matrixNum, matrix: item.matrix, data: item.data }; }
function compactLife(life: Json, rows: readonly Json[]): Json { return { slot: life.slot, name: life.name, start: life.start, end: life.end, ages: life.ages, sourceOrder: rows[life.start]!.spriteOrder[life.slot], first: compactSprite(life.first), last: compactSprite(life.last) }; }
function compactTask(life: Json): Json { return { slot: life.slot, name: life.name, start: life.start, end: life.end, ages: life.ages, firstData: life.first.data, lastData: life.last.data, firstRaw: life.first.raw, lastRaw: life.last.raw }; }
function rawFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 }); const size = 240 * 160 * 3;
  invariant(members.length === rows.length && bytes.length === rows.length * size, "raw RGB archive shape");
  const map = new Map(members.map((name, i) => [name.replace(/^\.\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(i * size, (i + 1) * size)]));
  return rows.map((row) => { const frame = map.get(String(row.frame).padStart(5, "0")); invariant(frame && sha(frame) === row.sha256, `raw RGB ${row.frame}`); return frame; });
}
function pixels(a: Buffer | undefined, b: Buffer): Json {
  if (!a) return { changedPixels: null, bounds: null }; let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let p = 0; p < 38400; p++) { const i = p * 3; if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2]) continue; count++; const x = p % 240, y = Math.floor(p / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function audio(rows: readonly Json[], channel: "SE1" | "SE2"): unknown[][] { return edges(rows, (row) => { const a = row.audio[channel]; return [a.songHeaderIdentity.symbol, a.status, a.tracks.map((track: Json) => [track.panX, track.pan, track.flags])]; }); }

export function buildSeismicTossChangeMap(dense: string, archive: string): Json {
  const probe = JSON.parse(gunzipSync(readFileSync(dense)).toString("utf8")) as Json, rows = probe.frames as Json[]; invariant(rows.length, "empty dense evidence");
  const rgb = rawFrames(archive, rows), spriteLives = lives(rows, "sprites", sprites).map((life) => compactLife(life, rows)), taskLives = lives(rows, "tasks", tasks).map(compactTask);
  const latch = (hardware: string, software: string) => ({ matches: `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`, exceptions: rows.slice(1).flatMap((row, age) => same(row[hardware], rows[age]![software]) ? [] : [age + 1]) });
  const stable = (field: string) => rows.every((row) => same(row[field], rows[0]![field]));
  const rgbRows = rows.map((row, age) => ({ age, frame: row.frame, rawRgbSha256: row.sha256, ...pixels(rgb[age - 1], rgb[age]) }));
  const resource = (tag: number) => ({ tag, tile: edges(rows, (row) => row.tileTags.includes(tag)), palette: edges(rows, (row) => row.paletteTags.includes(tag)) });
  return {
    schema: "seismic-toss-normalized-change-map/v1", side: rows[0]!.battlers.player.species === 352 ? "player-back" : "opponent-front", sourceWindow: probe.sourceWindow,
    source: { rows: rows.map((row) => [row.frame, row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait, row.scriptOwner, block(row.scriptPtr), row.animArgs]), pointerEdges: edges(rows, (row) => [row.scriptPtr, row.scriptPtrParity, row.scriptOffset, block(row.scriptPtr)]), ownerCounts: Object.fromEntries(blocks.map(([, , name]) => [name, rows.filter((row) => block(row.scriptPtr) === name).length])) },
    lifecycle: { sprites: spriteLives, tasks: taskLives }, allocations: { sprites: spriteLives.map((life) => [life.slot, life.name, life.start, life.sourceOrder, life.first.matrixNum, life.first.matrix]), tasks: taskLives.map((life) => [life.slot, life.name, life.start]) },
    counts: { visualTaskEdges: edges(rows, (row) => row.visualTaskCount), soundTaskEdges: edges(rows, (row) => row.soundTaskCount) },
    battlerAxes: { attacker: edges(rows, (row) => [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2]), target: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]) },
    transfers: { oam: latch("hardwareOam", "softwareOam"), matrices: latch("hardwareMatrices", "softwareMatrices"), palette: latch("hardwarePalette", "fadedPalette"), paletteChanges: { faded: bufferChanges(rows, "fadedPalette"), unfaded: bufferChanges(rows, "unfadedPalette"), hardware: bufferChanges(rows, "hardwarePalette") }, resources: { rocks: resource(10058), impact: resource(10135) } },
    background: { battleBg: keyedEdges(rows, "battleBg"), registers: keyedEdges(rows, "registers"), vram: { all: edges(rows, (row) => row.bgVram.allSha256), charBlocks: Array.from({ length: 4 }, (_, i) => edges(rows, (row) => row.bgVram.charBlockSha256[i])), screenBlocks: Array.from({ length: 32 }, (_, i) => edges(rows, (row) => row.bgVram.screenBlockSha256[i])) } },
    audio: { SE1: audio(rows, "SE1"), SE2: audio(rows, "SE2") },
    state: { partiesStable: stable("parties"), battlersStable: stable("battlers"), engineStable: stable("engine"), immutableStable: stable("immutableState"), gameplayRngEdges: edges(rows, (row) => row.immutableState.rngValue), animationRngDistinct: new Set(rows.map((row) => row.animationRng)).size, animationRngEdges: edges(rows, (row) => row.animationRng) },
    rgb: { rows: rgbRows, sequenceSha256: sha(Buffer.concat(rgb)), changedRows: rgbRows.filter((row) => row.changedPixels !== 0).length },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: rows.at(-1)!.sprites.filter((item: Json) => sprites.has(item.template.symbol)).length, ownedTasks: rows.at(-1)!.tasks.filter((item: Json) => tasks.has(item.func.symbol)).length },
  };
}

if (process.argv[1]?.endsWith("seismicTossChangeMap.ts")) {
  if (process.argv.length !== 5) throw new Error("usage: seismicTossChangeMap.ts dense.json.gz raw.tar.gz output.json");
  writeFileSync(process.argv[4]!, `${JSON.stringify(buildSeismicTossChangeMap(process.argv[2]!, process.argv[3]!), null, 2)}\n`);
}
