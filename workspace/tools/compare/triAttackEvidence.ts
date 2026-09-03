/** Hermetic bilateral dense evidence verifier for the still-unsupported Tri Attack. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type Life = { slot: number; label: string; start: number; end: number; ages: number[]; first: Json; last: Json };

const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const ROOT_START = 137184661;
const ROOT_END = 137185033;
const SUB_START = 137197344;
const ROOT_POINTERS = [137184661, 137184664, 137184681, 137184687, 137184707, 137184727, 137184730, 137184774, 137184795, 137184816, 137184837, 137184858, 137184879, 137184900, 137184915, 137184919, 137184949, 137184962, 137184975, 137184992, 137185005, 137185009, 137185031, 137185032];
const SUB_POINTERS = [137197363, 137197382, 137197401, 137197420, 137197439, 137197458];
const POINTERS = [...ROOT_POINTERS, ...SUB_POINTERS];
const OWNED_TEMPLATES = new Set(["gTriAttackTriangleSpriteTemplate", "gLargeFlameScatterSpriteTemplate", "gLightningSpriteTemplate", "gIceCrystalHitLargeSpriteTemplate", "gIceCrystalHitSmallSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"]);
const OWNED_TASKS = new Set(["AnimTask_ShakeTargetInPattern", "SoundTask_LoopSEAdjustPanning_Step"]);
const paths = {
  "player-back": { scenario: "tools/battle-lab/mechanic-tri-attack-player-porygon-opponent-shuckle.json", denseState: "tools/compare/evidence/tri-attack-player-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/tri-attack-player-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/tri-attack-changemap-player.json", changeMapText: "tools/compare/evidence/tri-attack-changemap-player.txt" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-tri-attack-opponent-porygon-player-shuckle.json", denseState: "tools/compare/evidence/tri-attack-opponent-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/tri-attack-opponent-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/tri-attack-changemap-opponent.json", changeMapText: "tools/compare/evidence/tri-attack-changemap-opponent.txt" },
} satisfies Record<Side, Record<string, string>>;

function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] {
  let previous: unknown;
  return rows.flatMap((row, age) => {
    const value = select(row);
    if (age === 0 || !same(value, previous)) { previous = value; return [[age, value]]; }
    previous = value;
    return [];
  });
}
function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(members.length === rows.length && bytes.length === members.length * size, `${archive}: complete RGB archive`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^\.\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(frame && frame.length === size && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`);
    return frame;
  });
}
function pixelChange(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let changed = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel++) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    changed++;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: changed, bounds: changed ? [minX, minY, maxX, maxY] : null };
}
function collectLives(rows: readonly Json[], kind: "sprite" | "task", labels: Set<string>): Life[] {
  const active = new Map<string, Life>(), result: Life[] = [];
  rows.forEach((row, age) => {
    const current = new Map<string, Json>();
    for (const item of kind === "sprite" ? row.sprites : row.tasks) {
      const label = kind === "sprite" ? item.template.symbol : item.func.symbol;
      if (labels.has(label)) current.set(`${item.slot}:${label}`, item);
    }
    for (const [id, item] of current) {
      const life = active.get(id);
      if (!life) active.set(id, { slot: item.slot, label: id.slice(id.indexOf(":") + 1), start: age, end: age, ages: [age], first: item, last: item });
      else { life.end = age; life.ages.push(age); life.last = item; }
    }
    for (const [id, life] of active) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); active.delete(id); }
  });
  result.push(...active.values());
  return result.sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function compactSprite(sprite: Json): Json {
  return { slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback?.symbol ?? null, raw: sprite.raw, attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter, subpriority: sprite.subpriority, flags: sprite.flags, invisible: sprite.invisible, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data };
}
function digestRow(row: Json): Json {
  const fields = ["tasks", "sprites", "softwareOam", "hardwareOam", "softwareMatrices", "hardwareMatrices", "fadedPalette", "unfadedPalette", "hardwarePalette", "parties", "battlers", "engine", "immutableState", "animationRng", "battleBg", "bgVram", "registers", "audio", "tileTags", "paletteTags", "spriteFlags", "spriteOrder"];
  return Object.fromEntries(fields.map((field) => [field, sha(JSON.stringify(row[field]))]));
}
function audioEdges(rows: readonly Json[], channel: string): unknown[][] {
  return edges(rows, (row) => [row.audio[channel].songHeaderIdentity.symbol, row.audio[channel].status]);
}
function changedRanges(previous: readonly number[], current: readonly number[]): number[][] {
  const changed = current.flatMap((value, index) => value === previous[index] ? [] : [index]);
  const ranges: number[][] = [];
  for (const index of changed) {
    const prior = ranges.at(-1);
    if (prior && prior[1] === index - 1) prior[1] = index;
    else ranges.push([index, index]);
  }
  return ranges;
}
function paletteChanges(rows: readonly Json[], field: string): Json[] {
  return rows.flatMap((row, age) => age && !same(row[field], rows[age - 1]![field]) ? [{ age, ranges: changedRanges(rows[age - 1]![field], row[field]) }] : []);
}

function derive(side: Side, probe: Json, rows: Json[], rgb: readonly Buffer[]): Json {
  const spriteLives = collectLives(rows, "sprite", OWNED_TEMPLATES);
  const taskLives = collectLives(rows, "task", OWNED_TASKS);
  const life = (items: Life[]) => items.map((item) => ({ slot: item.slot, label: item.label, start: item.start, end: item.end, ages: item.ages, order: rows[item.start]!.spriteOrder[item.slot] ?? null, first: compactSprite(item.first), last: compactSprite(item.last) }));
  const taskLife = taskLives.map((item) => ({ slot: item.slot, func: item.label, start: item.start, end: item.end, ages: item.ages, initialData: item.first.data, terminalData: item.last.data, firstRaw: item.first.raw, lastRaw: item.last.raw }));
  const owned = (row: Json) => ({ tasks: row.tasks.filter((item: Json) => OWNED_TASKS.has(item.func.symbol)).map((item: Json) => ({ slot: item.slot, func: item.func.symbol, raw: item.raw, data: item.data })), sprites: row.sprites.filter((item: Json) => OWNED_TEMPLATES.has(item.template.symbol)).map(compactSprite) });
  const mapRows = rows.map((row, age) => ({
    age, frame: row.frame, rawRgbSha256: row.sha256, ...pixelChange(rgb[age - 1], rgb[age]),
    source: { active: row.animScriptActive, ptr: row.scriptPtr, parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait, owner: row.scriptOwner, args: row.animArgs },
    counts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount, tasks: row.tasks.length, sprites: row.sprites.length }, owned,
    spriteFlags: row.spriteFlags, spriteOrder: row.spriteOrder, animationBattlers: row.animationBattlers, battlerSprites: row.battlerSprites,
    parties: row.parties, battlers: row.battlers, engine: row.engine, immutableState: row.immutableState, animationRng: row.animationRng,
    battleBg: row.battleBg, bgVram: row.bgVram, registers: row.registers, tileTags: row.tileTags, paletteTags: row.paletteTags,
    audio: row.audio, surfaces: { softwareOam: row.softwareOam, hardwareOam: row.hardwareOam, softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices, fadedPalette: row.fadedPalette, unfadedPalette: row.unfadedPalette, hardwarePalette: row.hardwarePalette },
    digests: digestRow(row),
  }));
  const sourceRows = rows.flatMap((row, age) => [[age, row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait, row.scriptOwner]]);
  const cross = (hardware: string, software: string): number => rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length;
  const exceptions = (hardware: string, software: string): number[] => rows.slice(1).flatMap((row, age) => same(row[hardware], rows[age]![software]) ? [] : [age + 1]);
  const latches = {
    hardwareOamEqualsPrecedingSoftware: `${cross("hardwareOam", "softwareOam")}/${rows.length - 1}`,
    hardwareMatricesEqualsPrecedingSoftware: `${cross("hardwareMatrices", "softwareMatrices")}/${rows.length - 1}`,
    hardwarePaletteEqualsPrecedingFaded: `${cross("hardwarePalette", "fadedPalette")}/${rows.length - 1}`,
    hardwareOamExceptions: exceptions("hardwareOam", "softwareOam"), hardwareMatrixExceptions: exceptions("hardwareMatrices", "softwareMatrices"), hardwarePaletteExceptions: exceptions("hardwarePalette", "fadedPalette"),
    sourceToBuffer: "same-row", bufferToHardware: "RAM+1", exceptions: [],
  };
  const tagIds = [10230, 10033, 10037, 10141];
  const tagEdges = (field: string) => edges(rows, (row) => tagIds.map((id) => row[field].includes(id)));
  const lifeBy = (label: string) => life(spriteLives.filter((item) => item.label === label));
  const phaseLives = { triangle: lifeBy("gTriAttackTriangleSpriteTemplate"), fire: lifeBy("gLargeFlameScatterSpriteTemplate"), lightning: lifeBy("gLightningSpriteTemplate"), ice: lifeBy("gIceCrystalHitLargeSpriteTemplate").concat(lifeBy("gIceCrystalHitSmallSpriteTemplate")).sort((a, b) => a.start - b.start), simplePaletteBlend: lifeBy("gSimplePaletteBlendSpriteTemplate"), tasks: taskLife };
  const audioTrackEdges = (channel: string) => edges(rows, (row) => row.audio[channel].tracks.map((track: Json) => [track.panX, track.pan, track.flags]));
  const state = { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState), animationRng: { distinct: new Set(rows.map((row) => row.animationRng)).size, transitions: transitions(rows, (row) => row.animationRng) } };
  return {
    schema: "tri-attack-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    source: { pointerRows: sourceRows, pointerEdges: edges(rows, (row) => [row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait, row.scriptOwner]), observedAddresses: probe.sourcePointerContract.observedAddresses, observedParities: probe.sourcePointerContract.observedParities, sourceSymbols: probe.sourceSymbols },
    lifecycle: phaseLives,
    allocations: { sprites: phaseLives.triangle.concat(phaseLives.fire, phaseLives.lightning, phaseLives.ice, phaseLives.simplePaletteBlend).map((item: Json) => ({ slot: item.slot, template: item.label, start: item.start, order: item.order, matrixNum: item.first.matrixNum, matrix: item.first.matrix })), tasks: taskLife.map((item) => ({ slot: item.slot, func: item.func, start: item.start })) },
    counts: { visualTaskEdges: edges(rows, (row) => row.visualTaskCount), soundTaskEdges: edges(rows, (row) => row.soundTaskCount) },
    transfers: { latches, targetX2Edges: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]), attackerX2Edges: edges(rows, (row) => [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2]), tags: { ids: tagIds, tileEdges: tagEdges("tileTags"), paletteEdges: tagEdges("paletteTags") }, palette: { faded: paletteChanges(rows, "fadedPalette"), unfaded: paletteChanges(rows, "unfadedPalette"), hardware: paletteChanges(rows, "hardwarePalette") }, audio: { SE1: audioEdges(rows, "SE1"), SE2: audioEdges(rows, "SE2"), SE1TrackEdges: audioTrackEdges("SE1"), SE2TrackEdges: audioTrackEdges("SE2") } },
    background: { battleBgTransitions: transitions(rows, (row) => row.battleBg), bgVramTransitions: transitions(rows, (row) => row.bgVram), registerEdges: edges(rows, (row) => row.registers), registerTransitions: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])])) },
    state, rows: mapRows, changeMap: { tool: "tools/compare/frame-changemap.py", text: paths[side].changeMapText, rows: mapRows },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: owned(rows.at(-1)!).sprites.length, ownedTasks: owned(rows.at(-1)!).tasks.length },
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side];
  const compressed = readFileSync(resolve(root, config.denseState));
  const json = gunzipSync(compressed); const probe = JSON.parse(json.toString("utf8")) as Json; const rows = probe.frames as Json[];
  invariant(probe.schema === "tri-attack-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 161, `${side}: identity`);
  invariant(probe.setup.schemaVersion === 1 && probe.setup.mode === "mechanicLab" && probe.setup.profile === "battle-scene-on" && probe.setup.level === 50 && probe.setup.challengeNum === 2 && probe.setup.battleNum === 2 && probe.setup.trainerId === 110 && probe.setup.sourceInitialized && probe.setup.customPartiesBuiltBeforeBattle, `${side}: legal staged setup`);
  invariant(probe.sourcePointerContract.start === ROOT_START && probe.sourcePointerContract.endExclusive === ROOT_END && same(probe.sourcePointerContract.observedAddresses, POINTERS) && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  const expectedStart = side === "player-back" ? 77 : 81;
  invariant(rows.length === 284 && probe.sourceWindow.startFrame === expectedStart && probe.sourceWindow.endFrame === expectedStart + 283 && probe.sourceWindow.frameCount === 284 && probe.sourceWindow.sourceFrameCount === 248, `${side}: complete dense window`);
  invariant(rows.every((row, age) => row.frame === expectedStart + age), `${side}: contiguous retained frames`);
  const rootRows = rows.flatMap((row, age) => row.scriptOwner === "Move_TRI_ATTACK" ? [age] : []);
  invariant(same(rootRows, [...Array.from({ length: 208 }, (_, age) => age), ...Array.from({ length: 40 }, (_, age) => age + 244)]), `${side}: root source ownership`);
  invariant(rows.slice(208, 244).every((row) => SUB_POINTERS.includes(row.scriptPtr) && row.scriptOwner === null && row.scriptOffset === null), `${side}: ice subroutine ownership`);
  invariant(rows.every((row) => POINTERS.includes(row.scriptPtr) && row.scriptPtrParity === (row.scriptPtr & 1) && (row.scriptOwner === null || (row.scriptPtr >= ROOT_START && row.scriptPtr < ROOT_END && row.scriptOffset === row.scriptPtr - ROOT_START))), `${side}: pointer rows`);
  rows.forEach((row, age) => invariant(row.tasks.length <= 16 && row.sprites.length <= 64 && row.spriteOrder.length === 64 && row.spriteFlags.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4, `${side}: complete row ${age}`));
  invariant(rows[0]!.animScriptActive && !rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: inactive cleanup row`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows); const map = derive(side, probe, rows, rgb); const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  invariant(existsSync(resolve(root, config.changeMap)), `${side}: normalized map missing`);
  invariant(readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: normalized map drift`);
  const changeText = readFileSync(resolve(root, config.changeMapText), "utf8");
  invariant(changeText.includes(`${rows[0]!.frame}  (first frame)`) && changeText.includes(`frames, 240x160`) && changeText.includes(`${rows.at(-1)!.frame}`), `${side}: text map bounds`);
  const listed = new Map([...changeText.matchAll(/^(\d+)\s+(\d+)\s+(\d+),(\d+)-(\d+),(\d+)$/gmu)].map((m) => [Number(m[1]), [Number(m[2]), [Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])]]]));
  for (const row of map.rows.slice(1)) if (row.changedPixels !== 0) invariant(same(listed.get(row.frame), [row.changedPixels, row.bounds]), `${side}: RGB change map row ${row.age}`);
  const phases = map.lifecycle;
  const compact = (items: Json[]) => items.map((item) => [item.slot, item.start, item.end]);
  invariant(same(compact(phases.triangle), [[3, 4, 84]]) && same(compact(phases.fire), [[4, 107, 135], [5, 107, 135], [7, 110, 138], [9, 113, 141], [10, 116, 144], [11, 119, 147], [12, 122, 150], [3, 125, 153]]) && same(compact(phases.lightning), [[3, 158, 185], [4, 161, 188], [5, 164, 191]]) && same(compact(phases.ice), [[3, 208, 244], [4, 214, 250], [5, 220, 256], [7, 226, 262], [9, 232, 268], [10, 238, 274], [11, 244, 280]]) && same(compact(phases.simplePaletteBlend), [[3, 86, 123], [12, 244, 281]]), `${side}: phase lifecycles`);
  invariant(same(phases.tasks.map((item: Json) => [item.slot, item.func, item.start, item.end]), [[0, "SoundTask_LoopSEAdjustPanning_Step", 48, 86], [0, "AnimTask_ShakeTargetInPattern", 129, 146], [0, "AnimTask_ShakeTargetInPattern", 186, 203]]), `${side}: task lifecycles`);
  const flameOffsets = side === "player-back" ? [[1, 0], [0, 1], [1, -1], [-2, 1], [-1, -1], [1, 1], [-1, -2], [-3, 1]] : [[-1, 0], [0, 1], [-1, -1], [2, 1], [1, -1], [-1, 1], [1, -2], [3, 1]];
  invariant(same(phases.fire.map((item: Json) => item.first.data.slice(0, 5)), flameOffsets.map((offset) => [1, 30, ...offset, 30])), `${side}: fire callback arguments`);
  invariant(phases.triangle[0].first.callback === "AnimTriAttackTriangle" && phases.triangle[0].last.callback === "DestroyAnimSprite" && phases.lightning.every((item: Json) => item.first.callback === "AnimLightning_Step" && item.last.callback === "AnimLightning_Step") && phases.ice.every((item: Json) => item.first.callback === "RunStoredCallbackWhenAffineAnimEnds" && item.last.callback === "AnimFlickerIceEffectParticle" && item.last.invisible === true), `${side}: callback lifecycles`);
  invariant(same(map.counts.visualTaskEdges, [[0, 0], [4, 1], [85, 0], [86, 1], [107, 3], [110, 4], [113, 5], [116, 6], [119, 7], [122, 8], [124, 7], [125, 8], [129, 9], [136, 7], [139, 6], [142, 5], [145, 4], [147, 3], [148, 2], [151, 1], [154, 0], [158, 1], [161, 2], [164, 3], [189, 2], [192, 1], [204, 0], [208, 1], [214, 2], [220, 3], [226, 4], [232, 5], [238, 6], [244, 8], [245, 7], [251, 6], [257, 5], [263, 4], [269, 3], [275, 2], [281, 1], [282, 0]]) && same(map.counts.soundTaskEdges, [[0, 0], [48, 1], [87, 0]]), `${side}: task count edges`);
  invariant(same(map.transfers.targetX2Edges, [[0, [0, 0]], [129, [0, 3]], [130, [0, 0]], [131, [0, 3]], [133, [0, 0]], [134, [0, 3]], [135, [0, 0]], [136, [0, 3]], [138, [0, 0]], [139, [0, 3]], [140, [0, 0]], [141, [0, 3]], [143, [0, 0]], [144, [0, 3]], [145, [0, 0]], [146, [0, 3]], [147, [0, 0]], [187, [0, 3]], [189, [0, 0]], [191, [0, 257]], [196, [0, 0]], [197, [0, 257]], [199, [0, 0]], [201, [0, 257]], [204, [0, 0]]]) && same(map.transfers.attackerX2Edges, [[0, [0, 0]]]), `${side}: target shake and attacker stability`);
  invariant(map.transfers.latches.hardwareOamEqualsPrecedingSoftware === "283/283" && map.transfers.latches.hardwareMatricesEqualsPrecedingSoftware === "283/283" && map.transfers.latches.hardwarePaletteEqualsPrecedingFaded === "283/283" && same(map.transfers.latches.hardwareOamExceptions, []) && same(map.transfers.latches.hardwareMatrixExceptions, []) && same(map.transfers.latches.hardwarePaletteExceptions, []), `${side}: independent display latches`);
  invariant(same(map.transfers.palette.faded.map((item: Json) => item.age), [1, 89, 93, 97, 101, 104, 105, 109, 113, 117, 155, 158, 190, 205, 247, 251, 255, 259, 263, 267, 271, 275]) && same(map.transfers.palette.unfaded.map((item: Json) => item.age), [1, 104, 155, 205]) && same(map.transfers.palette.hardware.map((item: Json) => item.age), [2, 90, 94, 98, 102, 105, 106, 110, 114, 118, 156, 159, 191, 206, 248, 252, 256, 260, 264, 268, 272, 276]), `${side}: palette transitions`);
  invariant(same(map.transfers.tags.tileEdges, [[0, [false, false, false, false]], [1, [true, false, false, false]], [104, [true, true, false, false]], [155, [true, true, true, false]], [205, [true, true, true, true]], [283, [false, false, false, false]]]) && same(map.transfers.tags.paletteEdges, map.transfers.tags.tileEdges), `${side}: resource tags`);
  invariant(same(map.transfers.audio.SE1, [[0, ["se_ball_open", 2147483648]], [4, ["se_m_tri_attack", 0]], [5, ["se_m_tri_attack", 3]], [23, ["se_m_tri_attack", 2147483648]], [26, ["se_m_tri_attack", 0]], [27, ["se_m_tri_attack", 3]], [45, ["se_m_tri_attack", 2147483648]], [48, ["se_m_tri_attack", 0]], [49, ["se_m_tri_attack", 3]], [55, ["se_m_tri_attack", 0]], [56, ["se_m_tri_attack", 3]], [63, ["se_m_tri_attack", 0]], [64, ["se_m_tri_attack", 3]], [71, ["se_m_tri_attack", 0]], [72, ["se_m_tri_attack", 3]], [79, ["se_m_tri_attack", 0]], [80, ["se_m_tri_attack", 3]], [87, ["se_m_tri_attack", 0]], [88, ["se_m_tri_attack", 3]], [106, ["se_m_tri_attack", 2147483648]], [107, ["se_m_flame_wheel2", 0]], [108, ["se_m_flame_wheel2", 3]], [157, ["se_m_flame_wheel2", 2147483648]], [158, ["se_m_tri_attack2", 0]], [159, ["se_m_tri_attack2", 3]], [208, ["se_m_icy_wind", 0]], [209, ["se_m_icy_wind", 3]], [214, ["se_m_icy_wind", 0]], [215, ["se_m_icy_wind", 3]], [220, ["se_m_icy_wind", 0]], [221, ["se_m_icy_wind", 3]], [226, ["se_m_icy_wind", 0]], [227, ["se_m_icy_wind", 3]], [232, ["se_m_icy_wind", 0]], [233, ["se_m_icy_wind", 3]], [238, ["se_m_icy_wind", 0]], [239, ["se_m_icy_wind", 3]], [244, ["se_m_icy_wind", 0]], [245, ["se_m_icy_wind", 3]], [258, ["se_m_icy_wind", 2147483648]]]) && same(map.transfers.audio.SE2, [[0, ["se_select", 2147483648]]]), `${side}: audio player lifecycle`);
  invariant(same(phases.tasks[0].initialData.slice(0, 7), side === "player-back" ? [220, -64, 63, 5, 5, 0, 7] : [220, 63, -63, -5, 5, 0, 7]) && same(phases.tasks[1].initialData.slice(0, 5), [2, 20, 3, 1, 1]) && same(phases.tasks[2].initialData.slice(0, 5), [2, 20, 3, 1, 0]), `${side}: task arguments`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.gameplayRngTransitions.length === 0 && map.state.animationRng.distinct === 284 && map.state.animationRng.transitions.length === 283, `${side}: immutable/gameplay/RNG state`);
  invariant(map.background.battleBgTransitions.length === 0 && map.background.bgVramTransitions.length === 0 && same(map.background.registerTransitions.win0h, [1]) && same(map.background.registerTransitions.win0v, [1]), `${side}: registers and background`);
  invariant(map.cleanup.ownedSprites === 0 && map.cleanup.ownedTasks === 0 && map.cleanup.age === 283, `${side}: owned cleanup`);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), changeMapText: config.changeMapText, changeMapTextSha256: sha(changeText), sourceWindow: probe.sourceWindow, lifecycle: map.lifecycle, allocations: map.allocations, counts: map.counts, latches: map.transfers.latches, palette: map.transfers.palette, tags: map.transfers.tags, audio: map.transfers.audio, state: map.state, background: map.background, cleanup: map.cleanup };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && receipt.changeMapTextSha256 === current.changeMapTextSha256, `${side}: fixture hash drift`);
  return current;
}

const sourceAudit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/triAttackSourceAudit.ts"], { cwd: root, encoding: "utf8" })) as Json;
invariant(sourceAudit.move === "MOVE_TRI_ATTACK" && sourceAudit.moveId === 161 && sourceAudit.status === "unsupported-evidence" && sourceAudit.coverageCredit === false, "source audit status");
invariant(sourceAudit.pointerOwned.root.romSha256 === "86d2d0432dd6648fcb29c176d3f1f275a1a53ec9a7234b3bdd860be600935396" && sourceAudit.pointerOwned.subroutine.romSha256 === "3da0ca21634d29ab068ed61238f9bb3129e4403019d36dbdcf4a7f722f3e5772" && sourceAudit.pointerOwned.combined.romSha256 === "399c3d7c32b99fc52e6e75b8f9d2be8590dd3a8b0a852e4e59432d397a3fc895" && sourceAudit.pointerOwned.root.sourceSha256 === "ac0223c3d6245ec0d062aebb7c6c611352c610cbad267c1cac05af22ebb602fe" && sourceAudit.pointerOwned.subroutine.sourceSha256 === "96031e55891f2051396b5ac2d28303b96f65724d841e8e8cfce7d8be1a004ef2", "source audit hashes");

const fixturePath = resolve(root, "tools/compare/fixtures/tri-attack-evidence.json");
if (process.argv.includes("--write")) {
  const player = verifySide("player-back", undefined, true); const opponent = verifySide("opponent-front", undefined, true);
  const repeats = { "player-back": process.env.TRI_ATTACK_PLAYER_REPEAT, "opponent-front": process.env.TRI_ATTACK_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.TRI_ATTACK_PLAYER_REPEAT_RGB_SHA256, "opponent-front": process.env.TRI_ATTACK_OPPONENT_REPEAT_RGB_SHA256 };
  for (const side of ["player-back", "opponent-front"] as const) { const repeat = repeats[side]; invariant(repeat && repeatRgb[side], `${side}: repeat receipt required`); const first = side === "player-back" ? player : opponent; const repeatHash = sha(readFileSync(repeat)); invariant(repeatHash === first.probeJsonSha256 && repeatRgb[side] === first.rawRgbSequenceSha256, `${side}: fresh repeat differs`); first.repeatProbeJsonSha256 = repeatHash; first.repeatRawRgbSequenceSha256 = repeatRgb[side]; }
  const fixture = {
    schema: "tri-attack-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_TRI_ATTACK", moveId: 161, status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, firstInactiveCleanupRetained: true, twiceFreshByteIdentical: true, rawRgbRows: { "player-back": 284, "opponent-front": 284 }, normalizedMaps: true, frameChangeMaps: true, legalBilateralParties: true, productionAnimationChanged: false, reducerAdded: false, assetBundleAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, transientOverrides: [] },
    acceptance: { freshRunsPerOrientation: 2, denseRows: { "player-back": 284, "opponent-front": 284 }, sourceRows: { "player-back": 248, "opponent-front": 248 }, latchVerdict: "Both orientations independently measure hardware OAM and affine matrices as preceding software buffers and hardware palette as preceding faded palette for 283/283 transitions, with no exceptions.", verdict: "Evidence only: MOVE_TRI_ATTACK remains unsupported; shake-target-in-pattern-scary-face remains unfulfilled and no sibling credit is granted." },
    source: { audit: "tools/compare/triAttackSourceAudit.ts", probe: "tools/compare/triAttackProbe.py", verifier: "tools/compare/triAttackEvidence.ts", root: sourceAudit.pointerOwned.root, subroutine: sourceAudit.pointerOwned.subroutine, combined: sourceAudit.pointerOwned.combined },
    controls: { inheritedSiblingLatchFacts: false, generalizedTransferFacts: false, inferredSiblingCredit: false, siblingStatuses: { MOVE_SCARY_FACE: "exact", MOVE_GLARE: "exact", MOVE_THUNDER: "exact", MOVE_TRI_ATTACK: "unsupported" }, shakeTargetInPatternScaryFace: "unfulfilled" },
    orientations: { "player-back": player, "opponent-front": opponent },
    acceptanceVerdict: "Unsupported evidence checkpoint: complete dense bilateral Scene-ON source/state/RGB evidence retained; no production animation, reducer, seam, compositor, gameplay, or coverage promotion.",
  };
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
invariant(fixture.schema === "tri-attack-bilateral-evidence/v1" && fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && fixture.acceptance.freshRunsPerOrientation === 2, "fixture status");
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const moveExact = coverage.entries.some((entry: Json) => entry.move === "MOVE_TRI_ATTACK" && entry.status === "exact");
const trackFulfilled = coverage.componentTracks.some((entry: Json) => entry.id === "shake-target-in-pattern-scary-face" && entry.fulfilled === true);
const result: Json = { schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: {} };
for (const side of ["player-back", "opponent-front"] as const) result.orientations[side] = verifySide(side, fixture.orientations[side]);
console.log(JSON.stringify({ ...result, source: { root: fixture.source.root.romSha256, subroutine: fixture.source.subroutine.romSha256, combined: fixture.source.combined.romSha256 }, boundary: { moveExact, trackFulfilled, barrierChanged: false } }, null, 2));
