/** Strict hermetic replay of the bilateral MOVE_SAND_TOMB Scene-ON evidence. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

type Json = any;
type Side = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/sand-tomb-evidence.json"), "utf8"));
const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const invariant = (condition: unknown, message: string): asserts condition => { if (!condition) throw new Error(message); };
const transitions = (rows: Json[], value: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age === 0 || !same(value(row), value(rows[age - 1]!)) ? [age] : []);

function rgbFrames(archive: string, rows: Json[]): Buffer[] {
  const dir = createScratchDir("sand-tomb-rgb-");
  const result = spawnSync("tar", ["-xzf", archive, "-C", dir], { encoding: "utf8" });
  invariant(result.status === 0, `raw RGB archive failed to extract: ${result.stderr}`);
  return rows.map((row) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)));
}

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: 0, bounds: null };
  let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count += 1; const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function lifecycles(rows: Json[], template: string): Json[] {
  const lives: Json[] = []; let previous = new Map<number, Json>();
  rows.forEach((row, age) => {
    const current = new Map<number, Json>(row.sprites.filter((sprite: Json) => sprite.template.symbol === template).map((sprite: Json) => [sprite.slot, sprite]));
    for (const [slot, sprite] of current) if (!previous.has(slot)) lives.push({ slot, start: age, end: null, first: sprite });
    for (const life of lives) if (life.end === null && previous.has(life.slot) && !current.has(life.slot)) life.end = age - 1;
    previous = current;
  });
  for (const life of lives) if (life.end === null) life.end = rows.length - 1;
  return lives;
}

function derive(side: Side, probe: Json, rgb: Buffer[]): Json {
  const rows = probe.frames as Json[];
  const dirt = lifecycles(rows, "gSwirlingDirtSpriteTemplate").map((life) => ({
    slot: life.slot, start: life.start, end: life.end, displayedStart: life.start + 1, displayedEnd: life.end + 1,
    callback: life.first.callback.symbol, x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2,
    subpriority: life.first.subpriority, attr: life.first.attr, data: life.first.data,
    painterOrder: rows[life.start]!.spriteOrder.indexOf(life.slot),
    callbackTransitions: transitions(rows.slice(life.start, life.end + 1), (row) => row.sprites.find((sprite: Json) => sprite.slot === life.slot && sprite.template.symbol === "gSwirlingDirtSpriteTemplate")?.callback.symbol).map((age) => age + life.start),
  }));
  const blends = lifecycles(rows, "gSimplePaletteBlendSpriteTemplate").map((life) => ({ slot: life.slot, start: life.start, end: life.end, callback: life.first.callback.symbol }));
  const taskAges = rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func.symbol === "AnimTask_ShakeMon_Step") ? [age] : []);
  const task = rows[taskAges[0]!]!.tasks.find((entry: Json) => entry.func.symbol === "AnimTask_ShakeMon_Step");
  const audio = rows.flatMap((row, age) => ["SE1", "SE2"].flatMap((channel) => {
    const symbol = row.audio[channel].songHeaderIdentity.symbol;
    const prior = age ? rows[age - 1]!.audio[channel].songHeaderIdentity.symbol : null;
    return symbol !== prior && symbol === "se_m_sand_tomb" ? [{ age, channel, symbol, panX: row.audio[channel].tracks.map((track: Json) => track.panX) }] : [];
  }));
  const tagAges = rows.flatMap((row, age) => row.allocators.paletteTags.includes(10074) && row.allocators.tileTags.includes(10074) ? [age] : []);
  const hardwareOamPrior = rows.slice(1).filter((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)).length;
  const hardwareMatrixPrior = rows.slice(1).filter((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)).length;
  const hardwarePalettePrior = rows.slice(1).filter((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)).length;
  return {
    schema: "sand-tomb-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    sourceRows: rows.map((row, age) => ({ age, frame: row.frame, owner: row.scriptOwner, offset: row.scriptOffset, wait: row.scriptWait, args: row.animArgs, active: row.animScriptActive, sha256: row.sha256, ...changedPixels(rgb[age - 1], rgb[age]!) })),
    dirt, blends, shake: { start: taskAges[0], end: taskAges.at(-1), count: taskAges.length, slot: task.slot, priority: task.priority, initialData: task.data }, audio,
    paletteChanges: { unfaded: transitions(rows, (row) => row.unfadedPalette), faded: transitions(rows, (row) => row.fadedPalette), hardware: transitions(rows, (row) => row.hardwarePalette) },
    resources: { tag: 10074, first: tagAges[0], last: tagAges.at(-1), count: tagAges.length },
    latches: { oam: `${hardwareOamPrior}/${rows.length - 1}`, matrices: `${hardwareMatrixPrior}/${rows.length - 1}`, palette: `${hardwarePalettePrior}/${rows.length - 1}` },
    state: { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), semanticStable: rows.every((row) => same(row.semanticState, rows[0]!.semanticState)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), gameplayRngTransitions: transitions(rows, (row) => row.gameplayRng).slice(1), animationRngTransitions: transitions(rows, (row) => row.animationRng).slice(1) },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, dirt: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template.symbol === "gSwirlingDirtSpriteTemplate").length, blends: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template.symbol === "gSimplePaletteBlendSpriteTemplate").length, tagged: rows.at(-1)!.allocators.paletteTags.includes(10074) || rows.at(-1)!.allocators.tileTags.includes(10074) },
  };
}

const writeMaps = process.argv.includes("--write-maps");
const result: Record<string, Json> = {};
for (const side of ["player-back", "opponent-front"] as const) {
  const config = fixture.orientations[side];
  for (const [path, expected] of [[config.scenario, config.scenarioSha256], [fixture.source.audit, fixture.source.auditSha256], [fixture.source.probe, fixture.source.probeSha256], [config.denseState, config.denseStateSha256], [config.rawRgbArchive, config.rawRgbArchiveSha256]] as const) invariant(sha(readFileSync(resolve(root, path))) === expected, `${path} receipt drift`);
  const compressed = readFileSync(resolve(root, config.denseState)); const json = gunzipSync(compressed); const probe = JSON.parse(json.toString("utf8")); const rows = probe.frames as Json[];
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh dense mismatch`);
  invariant(probe.schema === "sand-tomb-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 328 && same(probe.sourceWindow, config.sourceWindow), `${side}: identity/window drift`);
  invariant(rows.length === 124 && rows[0]!.scriptOwner === "Move_SAND_TOMB" && rows[0]!.scriptOffset === 0 && rows.at(-1)!.animScriptActive === false, `${side}: complete source/cleanup boundary drift`);
  invariant(same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: source pointer parity drift`);
  rows.forEach((row, age) => invariant(row.tasks.length <= 16 && row.sprites.length <= 64 && row.spriteOrder.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.unfadedPalette.length === 512 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.allocators.paletteTags.length === 16 && row.allocators.tileTags.length === 64 && row.parties.player.length === 3 && row.parties.opponent.length === 3, `${side}: retained shape drift at age ${age}`));
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB sequence mismatch`);
  rows.forEach((row, age) => invariant(rgb[age]!.length === 240 * 160 * 3 && sha(rgb[age]!) === row.sha256, `${side}: raw RGB row ${age} drift`));
  const map = derive(side, probe, rgb); const bytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`); const mapPath = resolve(root, config.changeMap);
  if (writeMaps) writeFileSync(mapPath, bytes); else invariant(readFileSync(mapPath).equals(bytes) && sha(bytes) === config.changeMapSha256, `${side}: normalized change map drift`);
  invariant(map.dirt.length === 18 && same(map.dirt.map((life: Json) => life.start), Array.from({ length: 18 }, (_, index) => 4 + index * 4)) && map.dirt.every((life: Json) => life.callback === "AnimParticleInVortex_Step" && same(life.callbackTransitions, [life.start]) && life.painterOrder === (side === "player-back" ? 7 : 6)), `${side}: 18 dirt callback/allocation/painter lifecycles drift`);
  invariant(same(map.dirt.map((life: Json) => life.data.slice(0, 6)), Array.from({ length: 3 }, () => [[29,528,10,50,528,10],[19,480,13,-46,480,13],[19,576,5,42,576,5],[24,400,8,-42,400,8],[24,512,13,46,512,13],[29,464,12,-50,464,12]]).flat()), `${side}: dirt args/data drift`);
  invariant(same(map.blends, [{ slot: 3, start: 4, end: 25, callback: "AnimSimplePaletteBlend_Step" }, { slot: 3, start: 100, end: 121, callback: "AnimSimplePaletteBlend_Step" }]), `${side}: two simple_palette_blend programs drift`);
  invariant(same([map.shake.start, map.shake.end, map.shake.count], [4,87,84]) && same(map.shake.initialData.slice(1, 6), [42,1,1,0,2]), `${side}: ShakeMon task drift`);
  invariant(same(map.audio, [{ age: 4, channel: "SE1", symbol: "se_m_sand_tomb", panX: side === "player-back" ? [63,63,0,0] : [-63,-63,0,0] }]), `${side}: target-panned audio drift`);
  invariant(same(map.resources, { tag: 10074, first: 1, last: 122, count: 122 }) && same(map.latches, { oam: "123/123", matrices: "123/123", palette: "123/123" }), `${side}: resource/display latch drift`);
  invariant(map.state.partiesStable && map.state.engineStable && map.state.semanticStable && map.state.immutableStable && map.state.gameplayRngTransitions.length === 0 && map.state.animationRngTransitions.length === 123, `${side}: immutable gameplay/animation RNG drift`);
  invariant(same(map.cleanup, { age: 123, active: false, visualTasks: 0, soundTasks: 0, dirt: 0, blends: 0, tagged: false }), `${side}: inactive cleanup drift`);
  result[side] = { sourceWindow: probe.sourceWindow, probeJsonSha256: sha(json), denseStateSha256: sha(compressed), rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMapSha256: sha(bytes), dirtSprites: 18, blends: 2, shake: map.shake, audio: map.audio, resources: map.resources, latches: map.latches, state: map.state, cleanup: map.cleanup };
}
console.log(JSON.stringify(result, null, 2));
