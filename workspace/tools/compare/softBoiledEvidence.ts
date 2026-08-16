/** Replay and normalize the retained evidence-only MOVE_SOFT_BOILED banks. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/soft-boiled-evidence.json", "utf8",
)) as Json;
const sha = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
const transitions = (rows: Json[], select: (row: Json) => unknown): number[] =>
  rows.flatMap((row, age) => age > 0
    && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
const ownedTemplates = new Set([
  "gSoftBoiledEggSpriteTemplate",
  "gThinRingExpandingSpriteTemplate",
  "gHealingBlueStarSpriteTemplate",
  "gSimplePaletteBlendSpriteTemplate",
]);
const ownedTasks = new Set([
  "AnimTask_ShakeMon_Step", "Task_UpdateMonBg", "Task_ClearMonBg",
]);
const moveSounds = new Set([
  "se_m_tail_whip", "se_m_horn_attack", "se_m_absorb_2",
]);

function rgbFrames(archive: string, rows: Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const size = 240 * 160 * 3;
  if (members.length !== rows.length || bytes.length !== rows.length * size) {
    throw new Error(`${archive}: raw RGB archive shape drifted`);
  }
  const byName = new Map(members.map((name, index) => [
    name.replace(/^\.\//u, ""),
    bytes.subarray(index * size, (index + 1) * size),
  ]));
  return rows.map((row) => {
    const value = byName.get(`${String(row.frame).padStart(5, "0")}.rgb`);
    if (!value) throw new Error(`${archive}: missing raw frame ${row.frame}`);
    return value;
  });
}

function lifecycles(
  rows: Json[],
  entries: (row: Json) => Json[],
  identity: (entry: Json) => string,
): Json[] {
  const live = new Map<string, Json>();
  const result: Json[] = [];
  rows.forEach((row, age) => {
    const current = new Map(entries(row).map((entry) => [identity(entry), entry]));
    for (const [id, entry] of current) {
      if (!live.has(id)) live.set(id, { id, start: age, first: entry });
    }
    for (const [id, life] of live) {
      if (!current.has(id)) {
        result.push({ ...life, end: age - 1 });
        live.delete(id);
      }
    }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result;
}

function tagRange(rows: Json[], kind: "paletteTags" | "tileTags", tag: number): Json {
  const ages = rows.flatMap((row, age) => row.allocators[kind].includes(tag) ? [age] : []);
  return { first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length };
}

function derive(side: Side, probe: Json, rgb: Buffer[]): Json {
  const rows = probe.frames as Json[];
  const spriteLives = lifecycles(
    rows,
    (row) => row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)),
    (sprite) => `${sprite.slot}:${sprite.template.symbol}`,
  ).map((life) => {
    const first = life.first;
    const callbackTransitions = rows.flatMap((row, age) => {
      if (age < life.start || age > life.end) return [];
      const sprite = row.sprites.find((entry: Json) =>
        `${entry.slot}:${entry.template.symbol}` === life.id);
      const prior = age > life.start ? rows[age - 1]!.sprites.find((entry: Json) =>
        `${entry.slot}:${entry.template.symbol}` === life.id) : null;
      return !prior || prior.callback.symbol !== sprite.callback.symbol
        ? [{ age, callback: sprite.callback.symbol }] : [];
    });
    return {
      id: life.id, start: life.start, end: life.end,
      displayedStart: life.start + 1, displayedEnd: life.end + 1,
      geometry: {
        x: first.x, y: first.y, x2: first.x2, y2: first.y2,
        subpriority: first.subpriority, matrixNum: first.matrixNum,
        matrix: first.matrix,
        sourceOrderIndex: rows[life.start]!.spriteOrder.indexOf(first.slot),
      },
      callbackTransitions,
    };
  });
  const taskLives = lifecycles(
    rows,
    (row) => row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)),
    (task) => `${task.slot}:${task.func.symbol}`,
  ).map((life) => ({
    id: life.id, start: life.start, end: life.end,
    priority: life.first.priority, initialData: life.first.data,
  }));
  const audio = rows.flatMap((row, age) =>
    ["SE1", "SE2"].flatMap((channel) => {
      const symbol = row.audio[channel].songHeaderIdentity.symbol;
      const prior = age ? rows[age - 1]!.audio[channel].songHeaderIdentity.symbol : null;
      return symbol !== prior && moveSounds.has(symbol)
        ? [{ age, channel, symbol, panX: row.audio[channel].tracks.map((track: Json) => track.panX) }]
        : [];
    }));
  let oamPrior = 0, matrixPrior = 0, palettePrior = 0;
  const paletteExceptions: number[] = [];
  for (let age = 1; age < rows.length; age += 1) {
    if (same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) oamPrior += 1;
    if (same(rows[age]!.hardwareMatrices, rows[age - 1]!.softwareMatrices)) matrixPrior += 1;
    if (same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) palettePrior += 1;
    else paletteExceptions.push(age);
  }
  const paletteExceptionDetails = paletteExceptions.map((age) => ({
    age,
    currentIndices: rows[age]!.hardwarePalette.flatMap((value: number, index: number) =>
      value !== rows[age]!.fadedPalette[index] ? [index] : []),
    precedingIndices: rows[age]!.hardwarePalette.flatMap((value: number, index: number) =>
      value !== rows[age - 1]!.fadedPalette[index] ? [index] : []),
  }));
  const changes = rows.map((row, age) => {
    let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset]
        && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1]
        && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      count += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return {
      age, frame: row.frame, owner: row.scriptOwner, offset: row.scriptOffset,
      wait: row.scriptWait, active: row.animScriptActive, sha256: row.sha256,
      changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null,
    };
  });
  const registerTransitions = Object.fromEntries(Object.keys(rows[0]!.registers)
    .map((key) => [key, transitions(rows, (row) => row.registers[key])])
    .filter(([, ages]) => (ages as number[]).length));
  const battleBgTransitions = Object.fromEntries(Object.keys(rows[0]!.battleBg)
    .map((key) => [key, transitions(rows, (row) => row.battleBg[key])])
    .filter(([, ages]) => (ages as number[]).length));
  const attacker = rows[0]!.animationBattlers.attacker as number;
  const attackerSide = attacker === 0 ? "player" : "opponent";
  const attackerState = rows[0]!.battlers[attackerSide];
  return {
    schema: "soft-boiled-normalized-change-map/v1", side,
    sourceWindow: probe.sourceWindow,
    spriteLives, taskLives, audio,
    pointerOwners: transitions(rows, (row) => row.scriptOwner).map((age) => ({
      age, owner: rows[age]!.scriptOwner, offset: rows[age]!.scriptOffset,
    })),
    waitHolds: rows.flatMap((row, age) => age > 0 && row.scriptWait > 0
      && row.scriptWait === rows[age - 1]!.scriptWait ? [age] : []),
    registerTransitions, battleBgTransitions,
    bgVramTransitions: transitions(rows, (row) => row.bgVramSha256),
    resources: Object.fromEntries([10031, 10202, 10203].map((tag) => [tag, {
      palette: tagRange(rows, "paletteTags", tag),
      tile: tagRange(rows, "tileTags", tag),
    }])),
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${oamPrior}/${rows.length - 1}`,
      hardwareMatricesEqualPrecedingSoftware: `${matrixPrior}/${rows.length - 1}`,
      hardwarePaletteEqualsPrecedingFaded: `${palettePrior}/${rows.length - 1}`,
      paletteExceptions: paletteExceptionDetails,
    },
    state: {
      attacker, target: rows[0]!.animationBattlers.target,
      attackerHp: attackerState.hp, attackerMaxHp: attackerState.maxHp,
      gameplayRngTransitions: transitions(rows, (row) => row.gameplayRng),
      animationRngTransitions: transitions(rows, (row) => row.animationRng),
      partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)),
      engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)),
      semanticStable: rows.every((row) => same(row.semanticState, rows[0]!.semanticState)),
    },
    cleanup: {
      age: rows.length - 1, active: rows.at(-1)!.animScriptActive,
      visualTasks: rows.at(-1)!.visualTaskCount,
      soundTasks: rows.at(-1)!.soundTaskCount,
      ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) =>
        ownedTemplates.has(sprite.template.symbol)).length,
      ownedTasks: rows.at(-1)!.tasks.filter((task: Json) =>
        ownedTasks.has(task.func.symbol)).length,
      moveTags: [10031, 10202, 10203].filter((tag) =>
        rows.at(-1)!.allocators.paletteTags.includes(tag)
        || rows.at(-1)!.allocators.tileTags.includes(tag)),
    },
    rows: changes,
  };
}

const write = process.argv.includes("--write-maps");
const result: Record<string, Json> = {};
for (const side of ["player-back", "opponent-front"] as const) {
  const config = fixture.orientations[side];
  const compressed = readFileSync(config.denseState);
  if (sha(compressed) !== config.denseStateSha256) throw new Error(`${side}: dense gzip drift`);
  const json = gunzipSync(compressed);
  if (sha(json) !== config.probeJsonSha256
    || config.probeJsonSha256 !== config.repeatProbeJsonSha256) {
    throw new Error(`${side}: twice-fresh probe receipt drift`);
  }
  const probe = JSON.parse(json.toString("utf8"));
  const rows = probe.frames as Json[];
  const rgb = rgbFrames(config.rawRgbArchive, rows);
  if (sha(readFileSync(config.rawRgbArchive)) !== config.rawRgbArchiveSha256
    || sha(Buffer.concat(rgb)) !== config.rawRgbSequenceSha256) {
    throw new Error(`${side}: raw RGB archive receipt drift`);
  }
  rows.forEach((row, age) => {
    if (sha(rgb[age]!) !== row.sha256) throw new Error(`${side}: RGB row ${age} drift`);
    if (row.tasks.length > 16 || row.sprites.length > 64
      || row.spriteOrder.length !== 64 || row.softwareOam.length !== 128
      || row.hardwareOam.length !== 128 || row.softwareMatrices.length !== 32
      || row.hardwareMatrices.length !== 32 || row.fadedPalette.length !== 512
      || row.unfadedPalette.length !== 512 || row.hardwarePalette.length !== 512
      || row.allocators.paletteTags.length !== 16 || row.allocators.tileTags.length !== 64
      || row.allocators.tileRanges.length !== 64 || row.allocators.tileBitmap.length !== 256
      || row.chrome.healthboxSpriteIds.length !== 4 || row.chrome.healthboxSprites.length !== 4) {
      throw new Error(`${side}: retained full-state shape drift at age ${age}`);
    }
  });
  const map = derive(side, probe, rgb);
  const bytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (write) writeFileSync(config.changeMap, bytes);
  else if (!readFileSync(config.changeMap).equals(bytes)) throw new Error(`${side}: change-map drift`);
  result[side] = {
    sourceWindow: probe.sourceWindow,
    probeJsonSha256: sha(json),
    rawRgbSequenceSha256: sha(Buffer.concat(rgb)),
    changeMapSha256: sha(bytes),
    spriteLives: map.spriteLives,
    taskLives: map.taskLives,
    audio: map.audio,
    pointerOwners: map.pointerOwners,
    waitHolds: map.waitHolds,
    registerTransitions: map.registerTransitions,
    battleBgTransitions: map.battleBgTransitions,
    bgVramTransitions: map.bgVramTransitions,
    resources: map.resources,
    latches: map.latches,
    state: {
      ...map.state,
      animationRngTransitions: {
        count: map.state.animationRngTransitions.length,
        heldAges: rows.flatMap((row, age) => age > 0
          && row.animationRng === rows[age - 1]!.animationRng ? [age] : []),
      },
    },
    cleanup: map.cleanup,
  };
}
console.log(JSON.stringify(result, null, 2));
