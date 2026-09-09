/** Rebuild the source-relative, orientation-banked Sky Uppercut evidence map. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
export type SkySide = "player-back" | "opponent-front";
const START = 0x082d6ed7;
const END = 0x082d6fd0;
const IMPACT_TAG = 10135;
const SPRITES = new Set(["gSlideMonToOffsetSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate", "gBasicHitSplatSpriteTemplate"]);
const TASKS = new Set(["AnimTask_MoveSkyUppercutBg", "AnimTask_ShakeMon2_Step", "AnimTask_ShakeMonInPlace_Step", "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg"]);

const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

function edges(rows: Json[], select: (row: Json) => unknown): Json[] {
  let previous: unknown;
  return rows.flatMap((row, age) => {
    const value = select(row);
    if (age === 0 || !same(value, previous)) { previous = value; return [{ age, value }]; }
    return [];
  });
}
function keyedEdges(rows: Json[], field: string): Json {
  return Object.fromEntries(Object.keys(rows[0]![field]).map((key) => [key, edges(rows, (row) => row[field][key])]));
}
function changedRanges(previous: readonly unknown[], current: readonly unknown[]): number[][] {
  const result: number[][] = [];
  current.forEach((value, index) => {
    if (same(value, previous[index])) return;
    const last = result.at(-1);
    if (last && last[1] === index - 1) last[1] = index; else result.push([index, index]);
  });
  return result;
}
function bufferChanges(rows: Json[], field: string): Json[] {
  return rows.flatMap((row, age) => age > 0 && !same(row[field], rows[age - 1]![field])
    ? [{ age, ranges: changedRanges(rows[age - 1]![field], row[field]) }] : []);
}
function compactSprite(sprite: Json): Json {
  return { slot: sprite.slot, template: sprite.template?.symbol, callback: sprite.callback?.symbol, raw: sprite.raw,
    attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, animNum: sprite.animNum,
    animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter, subpriority: sprite.subpriority,
    flags: sprite.flags, invisible: sprite.invisible, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data };
}
function compactTask(task: Json): Json { return { slot: task.slot, func: task.func?.symbol, raw: task.raw, data: task.data }; }
function lifecycles(rows: Json[], kind: "sprites" | "tasks", names: Set<string>): Json[] {
  const open = new Map<string, Json>(); const result: Json[] = [];
  rows.forEach((row, age) => {
    const current = new Map<string, Json>();
    for (const item of row[kind]) {
      const name = kind === "sprites" ? item.template?.symbol : item.func?.symbol;
      if (names.has(name)) current.set(`${item.slot}:${name}`, item);
    }
    for (const [id, item] of current) {
      const existing = open.get(id);
      if (existing) { existing.end = age; existing.ages.push(age); existing.last = item; }
      else open.set(id, { slot: item.slot, name: id.slice(id.indexOf(":") + 1), start: age, end: age, ages: [age], first: item, last: item });
    }
    for (const [id, life] of open) if (!current.has(id)) { result.push(life); open.delete(id); }
  });
  result.push(...open.values());
  return result.sort((a, b) => a.start - b.start || a.slot - b.slot).map((life) => ({
    slot: life.slot, name: life.name, start: life.start, end: life.end, ages: life.ages,
    first: kind === "sprites" ? compactSprite(life.first) : compactTask(life.first),
    last: kind === "sprites" ? compactSprite(life.last) : compactTask(life.last),
  }));
}
function rgbFrames(archive: string, rows: Json[]): Buffer[] {
  const scratch = createScratchDir("pokebench-sky-uppercut-rgb-");
  execFileSync("tar", ["-xzf", archive, "-C", scratch]);
  return rows.map((row) => {
    const value = readFileSync(join(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    invariant(value.length === 240 * 160 * 3 && sha(value) === row.sha256, `RGB row ${row.frame} drift`);
    return value;
  });
}
function pixelDiff(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let p = 0; p < 240 * 160; p++) {
    const i = p * 3;
    if (current[i] === previous[i] && current[i + 1] === previous[i + 1] && current[i + 2] === previous[i + 2]) continue;
    count++; const x = p % 240; const y = Math.floor(p / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function latch(rows: Json[], hardware: string, software: string): Json {
  const matches = rows.slice(1).flatMap((row, age) => same(row[hardware], rows[age]![software]) ? [age + 1] : []);
  return { matches: `${matches.length}/${rows.length - 1}`, exceptions: rows.slice(1).flatMap((row, age) => same(row[hardware], rows[age]![software]) ? [] : [age + 1]) };
}
function block(pointer: number): string | null { return pointer >= START && pointer < END ? "Move_SKY_UPPERCUT" : null; }

export function buildSkyUppercutChangeMap(dense: string, archive: string, side?: SkySide): Json {
  const probe = JSON.parse(gunzipSync(readFileSync(dense)).toString("utf8")) as Json;
  const rows = probe.frames as Json[]; invariant(rows.length > 0, "empty Sky Uppercut evidence");
  const actualSide = side ?? (rows[0]!.battlers.player.species === 107 ? "player-back" : "opponent-front");
  const rgb = rgbFrames(archive, rows);
  const spriteLives = lifecycles(rows, "sprites", SPRITES);
  const taskLives = lifecycles(rows, "tasks", TASKS);
  const rgbRows: Json[] = rows.map((row, age) => ({ age, frame: row.frame, rawRgbSha256: row.sha256, ...pixelDiff(rgb[age - 1], rgb[age]) }));
  const resource = (tag: number) => ({ tag, tile: edges(rows, (row) => row.tileTags.includes(tag)), palette: edges(rows, (row) => row.paletteTags.includes(tag)) });
  const sourceRows = rows.map((row, age) => ({ age, frame: row.frame, pointer: row.scriptPtr, parity: row.scriptPtrParity,
    offset: row.scriptOffset, wait: row.scriptWait, owner: row.scriptOwner, block: block(row.scriptPtr), active: row.animScriptActive, args: row.animArgs }));
  return {
    schema: "sky-uppercut-normalized-change-map/v1", side: actualSide, sourceWindow: probe.sourceWindow,
    source: { rows: sourceRows, pointerEdges: edges(rows, (row) => [row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait, block(row.scriptPtr)]),
      ownerCounts: { Move_SKY_UPPERCUT: rows.filter((row) => row.scriptOwner === "Move_SKY_UPPERCUT").length } },
    lifecycle: { sprites: spriteLives, tasks: taskLives },
    allocations: { spriteOrder: rows.map((row) => row.spriteOrder), taskSlots: taskLives.map((life) => [life.slot, life.name, life.start, life.end]),
      spriteSlots: spriteLives.map((life) => [life.slot, life.name, life.start, life.end]) },
    counts: { visualTasks: edges(rows, (row) => row.visualTaskCount), soundTasks: edges(rows, (row) => row.soundTaskCount), activeSprites: edges(rows, (row) => row.sprites.length), activeTasks: edges(rows, (row) => row.tasks.length) },
    battlerAxes: { attacker: edges(rows, (row) => [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2]), target: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]) },
    transfers: { oam: latch(rows, "hardwareOam", "softwareOam"), matrices: latch(rows, "hardwareMatrices", "softwareMatrices"), palette: latch(rows, "hardwarePalette", "fadedPalette"),
      paletteChanges: { faded: bufferChanges(rows, "fadedPalette"), unfaded: bufferChanges(rows, "unfadedPalette"), hardware: bufferChanges(rows, "hardwarePalette") },
      resources: { impact: resource(IMPACT_TAG), tags: { tiles: edges(rows, (row) => row.tileTags), palettes: edges(rows, (row) => row.paletteTags) },
        allocators: edges(rows, (row) => row.resourceAllocators) } },
    background: { battleBg: keyedEdges(rows, "battleBg"), registers: keyedEdges(rows, "registers"),
      vram: { all: edges(rows, (row) => row.bgVram.allSha256), charBlocks: Array.from({ length: 4 }, (_, i) => edges(rows, (row) => row.bgVram.charBlockSha256[i])), screenBlocks: Array.from({ length: 32 }, (_, i) => edges(rows, (row) => row.bgVram.screenBlockSha256[i])) },
      scanline: { state: edges(rows, (row) => row.scanline.state), srcBuffer: edges(rows, (row) => row.scanline.srcBuffer), dmaDest: edges(rows, (row) => row.scanline.dmaDest), dmaControl: edges(rows, (row) => row.scanline.dmaControl), banks: rows.map((row, age) => ({ age, hashes: row.scanlineBuffers.map((bank: number[]) => sha(JSON.stringify(bank))) })) } },
    audio: { SE1: edges(rows, (row) => [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE1.status, row.audio.SE1.tracks.map((track: Json) => [track.panX, track.pan, track.flags])]),
      SE2: edges(rows, (row) => [row.audio.SE2.songHeaderIdentity.symbol, row.audio.SE2.status, row.audio.SE2.tracks.map((track: Json) => [track.panX, track.pan, track.flags])]) },
    state: { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), rawBattleStateStable: rows.every((row) => same(row.rawBattleState, rows[0]!.rawBattleState)), gameplayRng: edges(rows, (row) => row.immutableState.rngValue), animationRng: { distinct: new Set(rows.map((row) => row.animationRng)).size, edges: edges(rows, (row) => row.animationRng) } },
    rows: rows.map((row, age) => ({ age, frame: row.frame, source: sourceRows[age], tasks: row.tasks.filter((task: Json) => TASKS.has(task.func?.symbol)).map(compactTask), sprites: row.sprites.filter((sprite: Json) => SPRITES.has(sprite.template?.symbol)).map(compactSprite), softwareOam: row.softwareOam, hardwareOam: row.hardwareOam, softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices, fadedPalette: row.fadedPalette, unfadedPalette: row.unfadedPalette, hardwarePalette: row.hardwarePalette, paletteTags: row.paletteTags, tileTags: row.tileTags, registers: row.registers, battleBg: row.battleBg, audio: row.audio, resourceAllocators: row.resourceAllocators, animationBattlers: row.animationBattlers, battlerSprites: row.battlerSprites, parties: row.parties, battlers: row.battlers, engine: row.engine, immutableState: row.immutableState, rawBattleState: row.rawBattleState, animationRng: row.animationRng, gameplayRng: row.immutableState.rngValue, rgb: rgbRows[age], scanline: row.scanline, scanlineBuffers: row.scanlineBuffers })),
    rgb: { rows: rgbRows, sequenceSha256: sha(Buffer.concat(rgb)), changedRows: rgbRows.filter((row) => row.changedPixels !== 0).length },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, scriptOffset: rows.at(-1)!.scriptOffset, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, tasks: rows.at(-1)!.tasks.filter((task: Json) => TASKS.has(task.func?.symbol)).length, sprites: rows.at(-1)!.sprites.filter((sprite: Json) => SPRITES.has(sprite.template?.symbol)).length, impactTag: rows.at(-1)!.tileTags.includes(IMPACT_TAG) || rows.at(-1)!.paletteTags.includes(IMPACT_TAG), scanlineState: rows.at(-1)!.scanline.state },
  };
}

if (process.argv[1]?.endsWith("skyUppercutChangeMap.ts")) {
  if (process.argv.length < 5) throw new Error("usage: skyUppercutChangeMap.ts dense.json.gz raw.tar.gz output.json [side]");
  const map = buildSkyUppercutChangeMap(process.argv[2]!, process.argv[3]!, process.argv[5] as SkySide | undefined);
  writeFileSync(process.argv[4]!, `${JSON.stringify(map, null, 2)}\n`);
}
