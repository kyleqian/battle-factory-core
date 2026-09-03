/** Build the source-relative RGB/change-map receipt for MOVE_FRUSTRATION. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Row = Json;

const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const ownedTemplates = new Set([
  "gAngerMarkSpriteTemplate", "gBasicHitSplatSpriteTemplate",
  "gHorizontalLungeSpriteTemplate", "gWeakFrustrationAngerMarkSpriteTemplate",
]);
const ownedTasks = new Set([
  "AnimTask_ShakeMon2_Step", "AnimTask_SwayMonStep",
  "AnimTask_BlendSpriteColor_Step2", "Task_UpdateMonBg", "Task_ClearMonBg",
]);
const resourceTags = { anger: 10135, impact: 10087 } as const;
const sourceBlocks = [
  [0x082cb430, 0x082cb45f, "Move_FRUSTRATION"],
  [0x082cb45f, 0x082cb464, "Frustration_Continue"],
  [0x082cb464, 0x082cb56a, "Frustration_Strongest"],
  [0x082cb56a, 0x082cb637, "Frustration_Strong"],
  [0x082cb637, 0x082cb6b3, "Frustration_Medium"],
  [0x082cb6b3, 0x082cb6f7, "Frustration_Weak"],
] as const;

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function blockFor(pointer: number): string | null {
  return sourceBlocks.find(([start, end]) => pointer >= start && pointer < end)?.[2] ?? null;
}

function transitions(rows: readonly Row[], select: (row: Row) => unknown): number[] {
  return rows.flatMap((row, age) => age > 0 && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}

function edges(rows: readonly Row[], select: (row: Row) => unknown): unknown[][] {
  let previous: unknown;
  return rows.flatMap((row, age) => {
    const value = select(row);
    if (age === 0 || !same(value, previous)) {
      previous = value;
      return [[age, value]];
    }
    previous = value;
    return [];
  });
}

function lifeRecords(rows: readonly Row[], kind: "sprites" | "tasks", names: Set<string>): Json[] {
  const active = new Map<string, Json>();
  const result: Json[] = [];
  rows.forEach((row, age) => {
    const current = new Map<string, Json>();
    for (const item of row[kind] as Json[]) {
      const name = kind === "sprites" ? item.template.symbol : item.func.symbol;
      if (names.has(name)) current.set(`${item.slot}:${name}`, item);
    }
    for (const [id, item] of current) {
      const life = active.get(id);
      if (life) {
        life.end = age;
        life.ages.push(age);
        life.last = item;
      } else {
        active.set(id, { id, slot: item.slot, name: id.slice(id.indexOf(":") + 1), start: age, end: age, ages: [age], first: item, last: item });
      }
    }
    for (const [id, life] of active) {
      if (!current.has(id)) {
        life.end = age - 1;
        result.push(life);
        active.delete(id);
      }
    }
  });
  result.push(...active.values());
  return result.sort((a, b) => a.start - b.start || a.slot - b.slot);
}

function compactSprite(item: Json): Json {
  return {
    slot: item.slot, template: item.template.symbol, callback: item.callback?.symbol ?? null,
    raw: item.raw, attr: item.attr, x: item.x, y: item.y, x2: item.x2, y2: item.y2,
    animNum: item.animNum, animCmdIndex: item.animCmdIndex, animDelayCounter: item.animDelayCounter,
    subpriority: item.subpriority, flags: item.flags, invisible: item.invisible,
    matrixNum: item.matrixNum, matrix: item.matrix, data: item.data,
  };
}

function compactLife(life: Json, rows: readonly Row[]): Json {
  return {
    slot: life.slot, name: life.name, start: life.start, end: life.end, ages: life.ages,
    sourceOrder: rows[life.start]!.spriteOrder[life.slot] ?? null,
    first: compactSprite(life.first), last: compactSprite(life.last),
  };
}

function compactTaskLife(life: Json): Json {
  return {
    slot: life.slot, name: life.name, start: life.start, end: life.end, ages: life.ages,
    firstData: life.first.data, lastData: life.last.data,
    firstRaw: life.first.raw, lastRaw: life.last.raw,
  };
}

function rawRgbFrames(archive: string, rows: readonly Row[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(members.length === rows.length && bytes.length === rows.length * size, `${archive}: RGB shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^\.\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(frame && frame.length === size && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`);
    return frame;
  });
}

function pixelChange(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let changedPixels = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    changedPixels += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null };
}

function changedRanges(previous: readonly number[], current: readonly number[]): number[][] {
  const indices = current.flatMap((value, index) => value === previous[index] ? [] : [index]);
  const ranges: number[][] = [];
  for (const index of indices) {
    const prior = ranges.at(-1);
    if (prior && prior[1] === index - 1) prior[1] = index;
    else ranges.push([index, index]);
  }
  return ranges;
}

function paletteChanges(rows: readonly Row[], field: string): Json[] {
  return rows.flatMap((row, age) => age > 0 && !same(row[field], rows[age - 1]![field])
    ? [{ age, ranges: changedRanges(rows[age - 1]![field], row[field]) }] : []);
}

function tagEdges(rows: readonly Row[], field: "tileTags" | "paletteTags", tag: number): unknown[][] {
  return edges(rows, (row) => row[field].includes(tag));
}

function audioEdges(rows: readonly Row[], channel: "SE1" | "SE2"): unknown[][] {
  return edges(rows, (row) => {
    const audio = row.audio[channel];
    return [audio.songHeaderIdentity.symbol, audio.status, audio.tracks.map((track: Json) => [track.panX, track.pan, track.flags])];
  });
}

function transitionEdges(rows: readonly Row[], field: string): unknown[][] {
  return edges(rows, (row) => row[field]);
}

function keyedTransitionEdges(rows: readonly Row[], field: string): Json {
  const keys = Object.keys(rows[0]![field]);
  return Object.fromEntries(keys.map((key) => [key, edges(rows, (row) => row[field][key])]));
}

function sourceRows(rows: readonly Row[]): unknown[][] {
  return rows.map((row) => [row.frame, row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait, row.scriptOwner, blockFor(row.scriptPtr), row.animArgs]);
}

function axisEdges(rows: readonly Row[], role: "attacker" | "target"): unknown[][] {
  return edges(rows, (row) => [row.battlerSprites[role].x2, row.battlerSprites[role].y2]);
}

export function buildFrustrationChangeMap(densePath: string, rawArchive: string): Json {
  const probe = JSON.parse(gunzipSync(readFileSync(densePath)).toString("utf8")) as Json;
  const rows = probe.frames as Row[];
  invariant(rows.length > 0, `${densePath}: no rows`);
  const rgb = rawRgbFrames(rawArchive, rows);
  const spriteLives = lifeRecords(rows, "sprites", ownedTemplates).map((life) => compactLife(life, rows));
  const taskLives = lifeRecords(rows, "tasks", ownedTasks).map(compactTaskLife);
  const sourceFrames = sourceRows(rows);
  const latches = {
    hardwareOamEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length}/${rows.length - 1}`,
    hardwareMatricesEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length}/${rows.length - 1}`,
    hardwarePaletteEqualsPrecedingFaded: `${rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length}/${rows.length - 1}`,
    hardwareOamExceptions: rows.slice(1).flatMap((row, age) => same(row.hardwareOam, rows[age]!.softwareOam) ? [] : [age + 1]),
    hardwareMatrixExceptions: rows.slice(1).flatMap((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices) ? [] : [age + 1]),
    hardwarePaletteExceptions: rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]),
  };
  const mapRows = rows.map((row, age) => ({ age, frame: row.frame, rawRgbSha256: row.sha256, ...pixelChange(rgb[age - 1], rgb[age]) }));
  const stable = (field: string): boolean => rows.every((row) => same(row[field], rows[0]![field]));
  const taskAges = (name: string): number[] => rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func.symbol === name) ? [age] : []);
  const tags = Object.fromEntries(Object.entries(resourceTags).map(([name, tag]) => [name, {
    tag, tile: tagEdges(rows, "tileTags", tag), palette: tagEdges(rows, "paletteTags", tag),
  }]));
  return {
    schema: "frustration-normalized-change-map/v1",
    side: probe.setup?.player?.[0]?.species === 162 ? "player-back" : "opponent-front",
    sourceWindow: probe.sourceWindow,
    source: { rows: sourceFrames, pointerEdges: edges(rows, (row) => [row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptOwner, blockFor(row.scriptPtr)]), ownerCounts: Object.fromEntries(sourceBlocks.map(([, , name]) => [name, rows.filter((row) => blockFor(row.scriptPtr) === name).length])) },
    lifecycle: { sprites: spriteLives, tasks: taskLives },
    allocations: { sprites: spriteLives.map((life) => ({ slot: life.slot, template: life.name, start: life.start, order: life.sourceOrder, matrixNum: life.first.matrixNum, matrix: life.first.matrix })), tasks: taskLives.map((life) => ({ slot: life.slot, func: life.name, start: life.start })) },
    counts: { visualTaskEdges: edges(rows, (row) => row.visualTaskCount), soundTaskEdges: edges(rows, (row) => row.soundTaskCount), taskAges: Object.fromEntries([...ownedTasks].map((name) => [name, taskAges(name)])) },
    axes: { attacker: axisEdges(rows, "attacker"), target: axisEdges(rows, "target"), battleBg: keyedTransitionEdges(rows, "battleBg"), registers: keyedTransitionEdges(rows, "registers") },
    transfers: { latches, palettes: { faded: paletteChanges(rows, "fadedPalette"), unfaded: paletteChanges(rows, "unfadedPalette"), hardware: paletteChanges(rows, "hardwarePalette") }, tags, audio: { SE1: audioEdges(rows, "SE1"), SE2: audioEdges(rows, "SE2") } },
    state: { partiesStable: stable("parties"), battlersStable: stable("battlers"), engineStable: stable("engine"), immutableStable: stable("immutableState"), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRngDistinct: new Set(rows.map((row) => row.animationRng)).size, animationRngTransitions: transitions(rows, (row) => row.animationRng) },
    rgb: { rows: mapRows, sequenceSha256: rgb.reduce((hash, frame) => hash.update(frame), createHash("sha256")).digest("hex"), changedRows: mapRows.filter((row) => row.changedPixels !== 0).length },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: rows.at(-1)!.sprites.filter((item: Json) => ownedTemplates.has(item.template.symbol)).length, ownedTasks: rows.at(-1)!.tasks.filter((item: Json) => ownedTasks.has(item.func.symbol)).length },
  };
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).pathname === new URL(import.meta.url).pathname) {
  if (process.argv.length !== 5) throw new Error("usage: frustrationChangeMap.ts <dense.json.gz> <raw.tar.gz> <output.json>");
  writeFileSync(process.argv[4]!, `${JSON.stringify(buildFrustrationChangeMap(process.argv[2]!, process.argv[3]!), null, 2)}\n`);
}
