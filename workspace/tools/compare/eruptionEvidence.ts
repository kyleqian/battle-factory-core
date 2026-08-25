/** Strict replay, lifecycle, latch, and normalized RGB-map verifier for Eruption. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/eruption-evidence.json"), "utf8")) as Json;
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const transitions = (rows: Json[], select: (row: Json) => unknown): number[] =>
  rows.flatMap((row, age) => age > 0 && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
const range = (ages: number[]): Json => ({ first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length });
const ownedTemplates = new Set(["gEruptionLaunchRockSpriteTemplate", "gEruptionFallingRockSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"]);
const ownedTasks = new Set(["AnimTask_EruptionLaunchRocks_Step", "AnimTask_ShakePlatforms", "AnimTask_ShakeBattlers", "Task_WaitAndPlaySE", "Task_LoopAndPlaySE"]);
const ownedSounds = new Set(["se_m_explosion", "se_m_rock_throw"]);

function rgbFrames(archive: string, rows: Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  if (members.length !== rows.length || bytes.length !== rows.length * size) throw new Error(`${archive}: raw RGB archive shape drifted`);
  const byName = new Map(members.map((name, index) => [name.replace(/^\.\//u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const value = byName.get(`${String(row.frame).padStart(5, "0")}.rgb`);
    if (!value) throw new Error(`${archive}: missing raw RGB frame ${row.frame}`);
    return value;
  });
}

function lifecycles(rows: Json[], entries: (row: Json) => Json[], identity: (entry: Json) => string): Json[] {
  const live = new Map<string, Json>();
  const result: Json[] = [];
  rows.forEach((row, age) => {
    const current = new Map(entries(row).map((entry) => [identity(entry), entry]));
    for (const [id, entry] of current) if (!live.has(id)) live.set(id, { id, start: age, first: entry });
    for (const [id, life] of live) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); live.delete(id); }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result;
}

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: 0, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count += 1; const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function derive(side: Side, probe: Json, rgb: Buffer[]): Json {
  const rows = probe.frames as Json[];
  const spriteLives = lifecycles(rows, (row) => row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)), (sprite) => `${sprite.slot}:${sprite.template.symbol}`).map((life) => {
    const first = life.first;
    const callbackTransitions = rows.flatMap((row, age) => {
      if (age < life.start || age > life.end) return [];
      const current = row.sprites.find((entry: Json) => `${entry.slot}:${entry.template.symbol}` === life.id);
      const prior = age > life.start ? rows[age - 1]!.sprites.find((entry: Json) => `${entry.slot}:${entry.template.symbol}` === life.id) : null;
      return current && (!prior || current.callback.symbol !== prior.callback.symbol) ? [{ age, callback: current.callback.symbol }] : [];
    });
    return { id: life.id, start: life.start, end: life.end, displayedStart: life.start + 1, displayedEnd: life.end + 1, template: first.template.symbol, callback: first.callback.symbol, geometry: { x: first.x, y: first.y, x2: first.x2, y2: first.y2, subpriority: first.subpriority, attr: first.attr, data: first.data, sourceOrderIndex: rows[life.start]!.spriteOrder.indexOf(first.slot) }, callbackTransitions };
  });
  const taskLives = lifecycles(rows, (row) => row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)), (task) => `${task.slot}:${task.func.symbol}`).map((life) => ({ id: life.id, start: life.start, end: life.end, priority: life.first.priority, initialData: life.first.data }));
  const audio = rows.flatMap((row, age) => ["SE1", "SE2"].flatMap((channel) => {
    const symbol = row.audio[channel].songHeaderIdentity.symbol;
    const prior = age ? rows[age - 1]!.audio[channel].songHeaderIdentity.symbol : null;
    return symbol !== prior && ownedSounds.has(symbol) ? [{ age, channel, symbol, panX: row.audio[channel].tracks.map((track: Json) => track.panX) }] : [];
  }));
  const attacker = rows[0]!.animationBattlers.attacker as number;
  const target = rows[0]!.animationBattlers.target as number;
  const attackerSlot = rows[0]!.animationBattlers.spriteIds[attacker] as number;
  const targetSlot = rows[0]!.animationBattlers.spriteIds[target] as number;
  const sprite = (row: Json, slot: number): Json => row.sprites.find((entry: Json) => entry.slot === slot)!;
  const sourceAxis = (slot: number) => transitions(rows, (row) => [sprite(row, slot).x2, sprite(row, slot).y2]);
  const oamAxis = (raw: string): number[] => { const bytes = Buffer.from(raw, "hex"); return [bytes.readUInt16LE(0) & 0xff, bytes.readUInt16LE(2) & 0x1ff]; };
  const oamIndex = (slot: number): number => {
    const attr = sprite(rows[0]!, slot).attr;
    return rows[0]!.softwareOam.findIndex((raw: string) => { const bytes = Buffer.from(raw, "hex"); return bytes.readUInt16LE(0) === attr[0] && bytes.readUInt16LE(2) === attr[1] && bytes.readUInt16LE(4) === attr[2]; });
  };
  const oamAxisChanges = (bank: "softwareOam" | "hardwareOam", index: number): number[] => transitions(rows, (row) => oamAxis(row[bank][index]));
  const paletteFaded = transitions(rows, (row) => row.fadedPalette);
  const paletteUnfaded = transitions(rows, (row) => row.unfadedPalette);
  const paletteHardwareCurrent = transitions(rows, (row) => row.hardwarePalette);
  const hardwarePaletteExceptions = rows.flatMap((row, age) => age > 0 && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []);
  const hardwareOamPrior = rows.flatMap((row, age) => age > 0 && same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []);
  const hardwareMatricesPrior = rows.flatMap((row, age) => age > 0 && same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []);
  const hardwarePalettePrior = rows.flatMap((row, age) => age > 0 && same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []);
  const ownedTaskAges = (name: string): number[] => rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func.symbol === name) ? [age] : []);
  const changes = rows.map((row, age) => ({ age, frame: row.frame, owner: row.scriptOwner, offset: row.scriptOffset, wait: row.scriptWait, active: row.animScriptActive, sha256: row.sha256, ...changedPixels(rgb[age - 1], rgb[age]!) }));
  const registerTransitions = Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length));
  const battleBgTransitions = Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, ages]) => (ages as number[]).length));
  const tagRange = (kind: "paletteTags" | "tileTags", tag: number): Json => {
    const ages = rows.flatMap((row, age) => row.allocators[kind].includes(tag) ? [age] : []);
    return { first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length };
  };
  return {
    schema: "eruption-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    pointerOwners: transitions(rows, (row) => [row.scriptOwner, row.scriptOffset]).map((age) => ({ age, owner: rows[age]!.scriptOwner, offset: rows[age]!.scriptOffset })),
    spriteLives, taskLives, audio,
    lifecycleCounts: { launchRockCreations: spriteLives.filter((life) => life.template === "gEruptionLaunchRockSpriteTemplate").length, fallingRockCreations: spriteLives.filter((life) => life.template === "gEruptionFallingRockSpriteTemplate").length, paletteBlendCreations: spriteLives.filter((life) => life.template === "gSimplePaletteBlendSpriteTemplate").length },
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${hardwareOamPrior.length}/${rows.length - 1}`, hardwareMatricesEqualPrecedingSoftware: `${hardwareMatricesPrior.length}/${rows.length - 1}`, hardwarePaletteEqualsPrecedingFaded: `${hardwarePalettePrior.length}/${rows.length - 1}`, hardwareOamExceptions: rows.flatMap((row, age) => age > 0 && !same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []), hardwareMatrixExceptions: rows.flatMap((row, age) => age > 0 && !same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []), hardwarePaletteExceptions, paletteFadedChanges: paletteFaded, paletteUnfadedChanges: paletteUnfaded, paletteHardwareChanges: paletteHardwareCurrent,
      attackerSourceAxisChanges: sourceAxis(attackerSlot), targetSourceAxisChanges: sourceAxis(targetSlot), battlerOam: { attackerIndex: oamIndex(attackerSlot), targetIndex: oamIndex(targetSlot), attackerSoftwareAxisChanges: oamAxisChanges("softwareOam", oamIndex(attackerSlot)), attackerHardwareAxisChanges: oamAxisChanges("hardwareOam", oamIndex(attackerSlot)), targetSoftwareAxisChanges: oamAxisChanges("softwareOam", oamIndex(targetSlot)), targetHardwareAxisChanges: oamAxisChanges("hardwareOam", oamIndex(targetSlot)) }, platformBg3SourceChanges: transitions(rows, (row) => row.battleBg.gBattle_BG3_X), platformBg3RegisterChanges: transitions(rows, (row) => row.registers.bg3hofs), launchRockDisplayEdges: spriteLives.filter((life) => life.template === "gEruptionLaunchRockSpriteTemplate").map((life) => [life.start + 1, life.end + 1]), fallingRockDisplayEdges: spriteLives.filter((life) => life.template === "gEruptionFallingRockSpriteTemplate").map((life) => [life.start + 1, life.end + 1]), paletteBlendDisplayEdges: spriteLives.filter((life) => life.template === "gSimplePaletteBlendSpriteTemplate").map((life) => [life.start + 1, life.end + 1]),
    },
    tasks: Object.fromEntries([...ownedTasks].map((name) => [name, range(ownedTaskAges(name))])),
    resources: { paletteTags: [10201].map((tag) => [tag, tagRange("paletteTags", tag)]), tileTags: [10201].map((tag) => [tag, tagRange("tileTags", tag)]) },
    registerTransitions, battleBgTransitions,
    state: { attacker, target, gameplayRngTransitions: transitions(rows, (row) => row.gameplayRng), animationRngTransitions: transitions(rows, (row) => row.animationRng), partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), semanticStable: rows.every((row) => same(row.semanticState, rows[0]!.semanticState)), immutableStableExceptGameplayRng: rows.every((row) => same({ ...row.immutableState, rngValue: 0 }, { ...rows[0]!.immutableState, rngValue: 0 })) },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).length, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length },
    rows: changes,
  };
}

const writeMaps = process.argv.includes("--write-maps");
const result: Record<string, Json> = {};
for (const side of ["player-back", "opponent-front"] as const) {
  const config = fixture.orientations[side] as Json;
  if (sha(readFileSync(resolve(root, config.scenario))) !== config.scenarioSha256) throw new Error(`${side}: scenario drift`);
  const compressed = readFileSync(resolve(root, config.denseState));
  if (sha(compressed) !== config.denseStateSha256) throw new Error(`${side}: dense gzip drift`);
  const json = gunzipSync(compressed);
  if (sha(json) !== config.probeJsonSha256 || config.probeJsonSha256 !== config.repeatProbeJsonSha256) throw new Error(`${side}: twice-fresh dense receipt drift`);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  if (probe.schema !== "eruption-dense-evidence/v1" || probe.profile !== "battle-scene-on" || probe.move !== 284) throw new Error(`${side}: probe identity drift`);
  if (!same(probe.sourceWindow, { ...config.sourceWindow, sourceFrameCount: config.sourceWindow.frameCount })) throw new Error(`${side}: source window drift`);
  if (rows.length !== config.sourceWindow.frameCount || rows[0]!.scriptOwner !== "Move_ERUPTION" || rows[0]!.scriptOffset !== 0 || rows.at(-1)!.animScriptActive || rows.at(-1)!.visualTaskCount !== 0 || rows.at(-1)!.soundTaskCount !== 0) throw new Error(`${side}: source/cleanup boundary drift`);
  if (!same(probe.sourcePointerContract.observedParities, [0, 1])) throw new Error(`${side}: source pointer parity coverage drift`);
  rows.forEach((row, age) => {
    if (row.tasks.length > 16 || row.sprites.length > 64 || row.spriteOrder.length !== 64 || row.softwareOam.length !== 128 || row.hardwareOam.length !== 128 || row.softwareMatrices.length !== 32 || row.hardwareMatrices.length !== 32 || row.fadedPalette.length !== 512 || row.unfadedPalette.length !== 512 || row.hardwarePalette.length !== 512 || row.allocators.paletteTags.length !== 16 || row.allocators.tileTags.length !== 64 || row.allocators.tileRanges.length !== 64 || row.allocators.tileBitmap.length !== 256 || row.chrome.healthboxSpriteIds.length !== 4 || row.chrome.healthboxSprites.length !== 4) throw new Error(`${side}: retained full-state shape drift at age ${age}`);
  });
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows);
  if (sha(readFileSync(resolve(root, config.rawRgbArchive))) !== config.rawRgbArchiveSha256 || sha(Buffer.concat(rgb)) !== config.rawRgbSequenceSha256 || config.rawRgbSequenceSha256 !== config.repeatRawRgbSequenceSha256) throw new Error(`${side}: twice-fresh raw RGB receipt drift`);
  rows.forEach((row, age) => { if (sha(rgb[age]!) !== row.sha256) throw new Error(`${side}: raw RGB row ${age} drift`); });
  const map = derive(side, probe, rgb);
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMaps) writeFileSync(resolve(root, config.changeMap), mapBytes);
  else if (!readFileSync(resolve(root, config.changeMap)).equals(mapBytes)) throw new Error(`${side}: normalized change map drift`);
  if (sha(readFileSync(resolve(root, config.changeMap))) !== config.changeMapSha256) throw new Error(`${side}: normalized change-map receipt drift`);
  const expectedShakeStart = side === "player-back" ? 239 : 257;
  const expectedLaunchStarts = side === "player-back" ? [61, 143] : [61, 152];
  const expectedFallingStart = side === "player-back" ? 215 : 233;
  const expectedEndBlendStart = side === "player-back" ? 321 : 339;
  const launchLives = map.spriteLives.filter((life: Json) => life.template === "gEruptionLaunchRockSpriteTemplate");
  const fallingLives = map.spriteLives.filter((life: Json) => life.template === "gEruptionFallingRockSpriteTemplate");
  const blendLives = map.spriteLives.filter((life: Json) => life.template === "gSimplePaletteBlendSpriteTemplate");
  const launchTasks = map.taskLives.filter((life: Json) => life.id.includes("AnimTask_EruptionLaunchRocks_Step"));
  const waitTasks = map.taskLives.filter((life: Json) => life.id.includes("Task_WaitAndPlaySE"));
  if (launchLives.length !== 14 || fallingLives.length !== 6 || blendLives.length !== 2 || launchTasks.length !== 2 || waitTasks.length !== 2) throw new Error(`${side}: lifecycle count drift`);
  if (!same(launchTasks.map((life: Json) => [life.start, life.end]), [[19, side === "player-back" ? 99 : 108], [side === "player-back" ? 101 : 110, side === "player-back" ? 181 : 199]])) throw new Error(`${side}: launch task waves drift`);
  if (!same(waitTasks.map((life: Json) => [life.start, life.end]), [[19, 78], [side === "player-back" ? 101 : 110, side === "player-back" ? 160 : 169]])) throw new Error(`${side}: explosion programs drift`);
  if (!same(launchLives.map((life: Json) => life.start).filter((age: number, index: number, values: number[]) => !index || age !== values[index - 1]), expectedLaunchStarts)) throw new Error(`${side}: launch-rock wave starts drift`);
  if (!fallingLives.every((life: Json) => life.start === expectedFallingStart) || blendLives[0]!.start !== 4 || blendLives[1]!.start !== expectedEndBlendStart) throw new Error(`${side}: falling/blend allocation drift`);
  if (!same(map.audio.map((event: Json) => [event.age, event.symbol]), [[79, "se_m_explosion"], [expectedShakeStart, "se_m_rock_throw"]])) throw new Error(`${side}: audio program drift`);
  if (map.latches.hardwareOamEqualsPrecedingSoftware !== `${rows.length - 1}/${rows.length - 1}` || map.latches.hardwarePaletteEqualsPrecedingFaded !== `${rows.length - 1}/${rows.length - 1}` || map.latches.hardwareOamExceptions.length || map.latches.hardwarePaletteExceptions.length) throw new Error(`${side}: OAM/palette transfer latch drift`);
  if (map.latches.platformBg3SourceChanges[0] !== expectedShakeStart + 1 || map.latches.platformBg3RegisterChanges[0] !== expectedShakeStart + 2 || map.latches.attackerSourceAxisChanges[0] !== 19 || map.latches.targetSourceAxisChanges[0] !== expectedShakeStart + 1) throw new Error(`${side}: Eruption HorizontalShake display edges drift`);
  if (!map.state.partiesStable || !map.state.engineStable || !map.state.semanticStable || !map.state.immutableStableExceptGameplayRng || map.state.gameplayRngTransitions.length !== 0 || map.state.animationRngTransitions.length !== rows.length - 1) throw new Error(`${side}: gameplay/RNG invariance drift`);
  if (map.cleanup.ownedSprites !== 0 || map.cleanup.ownedTasks !== 0) throw new Error(`${side}: first inactive cleanup retained Eruption work`);
  result[side] = { sourceWindow: probe.sourceWindow, probeJsonSha256: sha(json), denseStateSha256: sha(compressed), rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMapSha256: sha(mapBytes), lifecycleCounts: map.lifecycleCounts, tasks: map.tasks, audio: map.audio, latches: map.latches, state: map.state, cleanup: map.cleanup };
}
console.log(JSON.stringify(result, null, 2));
