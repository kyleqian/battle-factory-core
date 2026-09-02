/** Strict replay and normalized state/change-map verifier for Hyper Beam evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type Life = { id: string; slot: number; start: number; end: number; first: Json; last: Json; ages: number[] };

const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const ORB_TEMPLATE = "gHyperBeamOrbSpriteTemplate";
const ORB_CALLBACK = "AnimHyperBeamOrb_Step";
const SIMPLE_TEMPLATE = "gSimplePaletteBlendSpriteTemplate";
const SIMPLE_CALLBACK = "AnimSimplePaletteBlend_Step";
const ORBS_TAG = 10147;
const SOURCE_START = 0x082d4d70;
const SOURCE_END = 0x082d4eb2;
const TASKS = new Set([
  "AnimTask_BlendSpriteColor_Step2", "AnimTask_FlashAnimTagWithColor_Step1",
  "AnimTask_FlashAnimTagWithColor_Step2", "AnimTask_ShakeMon2_Step",
  "AnimTask_ShakeMon_Step", "SoundTask_LoopSEAdjustPanning_Step",
]);
const paths = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-hyper-beam-player-aerodactyl-opponent-onix.json",
    denseState: "tools/compare/evidence/hyper-beam-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/hyper-beam-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/hyper-beam-changemap-player.json",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-hyper-beam-opponent-aerodactyl-player-onix.json",
    denseState: "tools/compare/evidence/hyper-beam-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/hyper-beam-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/hyper-beam-changemap-opponent.json",
  },
} satisfies Record<Side, Json>;

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] {
  return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []);
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n")
    .filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${archive}: RGB archive shape`);
  const byFrame = new Map(members.map((name, index) => [
    name.replace(/^\.\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size),
  ]));
  return rows.map((row) => {
    const frame = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(frame && frame.length === size && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`);
    return frame;
  });
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function collectLives(rows: readonly Json[], kind: "orb" | "simple" | "task"): Life[] {
  const active = new Map<string, Life>();
  const result: Life[] = [];
  rows.forEach((row, age) => {
    const entries = new Map<string, Json>();
    if (kind === "orb") for (const item of row.sprites.filter((sprite: Json) => sprite.template?.symbol === ORB_TEMPLATE)) entries.set(`${item.slot}:${ORB_TEMPLATE}`, item);
    if (kind === "simple") for (const item of row.sprites.filter((sprite: Json) => sprite.template?.symbol === SIMPLE_TEMPLATE)) entries.set(`${item.slot}:${SIMPLE_TEMPLATE}`, item);
    if (kind === "task") for (const item of row.tasks.filter((task: Json) => TASKS.has(task.func.symbol))) entries.set(`${item.slot}:${item.func.symbol}`, item);
    for (const [id, item] of entries) {
      const life = active.get(id);
      if (!life) active.set(id, { id, slot: item.slot, start: age, end: age, first: item, last: item, ages: [age] });
      else { life.end = age; life.last = item; life.ages.push(age); }
    }
    for (const [id, life] of active) if (!entries.has(id)) { result.push({ ...life, end: age - 1 }); active.delete(id); }
  });
  result.push(...active.values());
  return result;
}

function taskView(life: Life): Json {
  return {
    id: life.id, slot: life.slot, func: life.first.func.symbol, start: life.start, end: life.end,
    length: life.end - life.start + 1, initialData: life.first.data, terminalData: life.last.data,
  };
}
function spriteView(row: Json, sprite: Json): Json {
  return {
    slot: sprite.slot, template: sprite.template?.symbol, callback: sprite.callback.symbol,
    raw: sprite.raw, attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter,
    subpriority: sprite.subpriority, flags: sprite.flags, invisible: sprite.invisible,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data,
    persistentOrder: row.spriteOrder.indexOf(sprite.slot),
  };
}
function orbViews(rows: readonly Json[], age: number): Json[] {
  const row = rows[age]!;
  return row.sprites.filter((sprite: Json) => sprite.template?.symbol === ORB_TEMPLATE).map((sprite: Json) => spriteView(row, sprite));
}
function simpleViews(rows: readonly Json[], age: number): Json[] {
  const row = rows[age]!;
  return row.sprites.filter((sprite: Json) => sprite.template?.symbol === SIMPLE_TEMPLATE).map((sprite: Json) => spriteView(row, sprite));
}
function battlerSprite(row: Json, battler: number): Json {
  const slot = row.animationBattlers.spriteIds[battler];
  const sprite = row.sprites.find((item: Json) => item.slot === slot);
  invariant(sprite, `missing battler sprite ${battler}/${slot}`);
  return sprite;
}
function paletteChanges(rows: readonly Json[], from: number, to: number): number[] {
  return rows.flatMap((row, age) => age && rows[age - 1]!.fadedPalette.slice(from, to + 1).some((value: number, index: number) => value !== row.fadedPalette[from + index]) ? [age] : []);
}
function changedIndexes(row: Json, previous: Json, from = 0, to = 511): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index).filter((index) => row.fadedPalette[index] !== previous.fadedPalette[index]);
}
function oamHasPrefix(sprite: Json, oam: readonly string[]): boolean {
  // The probe's sprite raw includes the complete gSprite; its first 15 hex
  // characters are the object attributes before the buffer's final mode bit.
  const prefix = sprite.raw.slice(0, 15);
  return oam.some((entry) => entry.slice(0, 15) === prefix);
}
function lcg(value: number): number { return (Math.imul(1103515245, value) + 24691) >>> 0; }
function rngSteps(previous: number, current: number): number {
  let value = previous;
  for (let step = 1; step <= 8; step += 1) { value = lcg(value); if (value === current) return step; }
  return 0;
}
function selectedRanges(indices: number[], from: number, to: number): boolean {
  return indices.length > 0 && indices.every((index) => index >= from && index <= to);
}

function derive(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  const orbs = collectLives(rows, "orb");
  const simples = collectLives(rows, "simple");
  const tasks = collectLives(rows, "task");
  const attacker = rows[0]!.animationBattlers.attacker as number;
  const target = rows[0]!.animationBattlers.target as number;
  const targetPalette = side === "player-back" ? [272, 287] : [256, 271];
  const orbGroupStarts = Array.from({ length: 26 }, (_, index) => 110 + index * 3);
  const orbStarts = orbs.reduce((counts, life) => counts.set(life.start, (counts.get(life.start) ?? 0) + 1), new Map<number, number>());
  const rngStepRows = rows.slice(1).map((row, index) => rngSteps(rows[index]!.animationRng, row.animationRng));
  const wholeLatch = (hardware: string, software: string): string => `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`;
  const targetSprite = (row: Json): Json => battlerSprite(row, target);
  const attackerSprite = (row: Json): Json => battlerSprite(row, attacker);
  const paletteFadedChanges = transitions(rows, (row) => row.fadedPalette);
  const paletteHardwareChanges = transitions(rows, (row) => row.hardwarePalette);
  const orbFlashAges = paletteChanges(rows, 368, 383).filter((age) => age >= 110);
  const bgRampAges = paletteChanges(rows, 16, 63);
  const targetBlendAges = paletteChanges(rows, targetPalette[0], targetPalette[1]);
  const targetBlendIndexWitness = rows.flatMap((row, age) => age && selectedRanges(changedIndexes(row, rows[age - 1]!, targetPalette[0], targetPalette[1]), targetPalette[0], targetPalette[1]) ? [age] : []);
  const sourceArgs = edges(rows, (row) => row.animArgs);
  const sourceOffsets = Object.fromEntries([...new Set(rows.map((row) => row.scriptOffset))].sort((a, b) => a - b).map((offset) => [offset, rows.filter((row) => row.scriptOffset === offset).length]));
  const battlerEdges = (select: (row: Json) => unknown): unknown[][] => edges(rows, select);
  const orbLifeRows = orbs.map((life) => ({
    ...life,
    first: spriteView(rows[life.start]!, life.first),
    last: spriteView(rows[life.end]!, life.last),
  }));
  const rowMap = rows.map((row, age) => ({
    age, frame: row.frame, rawRgbSha256: row.sha256, ...changedPixels(rgb[age - 1], rgb[age]!),
    source: { active: row.animScriptActive, ptr: row.scriptPtr, parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait, owner: row.scriptOwner, args: row.animArgs },
    counts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount, tasks: row.tasks.length, sprites: row.sprites.length },
    tasks: row.tasks.filter((task: Json) => TASKS.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, raw: task.raw, data: task.data })),
    orbs: orbViews(rows, age), simplePaletteBlend: simpleViews(rows, age),
    animationBattlers: row.animationBattlers, battlerSprites: row.battlerSprites,
    spriteFlags: row.spriteFlags, spriteOrder: row.spriteOrder,
    registers: row.registers, battleBg: row.battleBg, bgVram: row.bgVram,
    tags: { tile: row.tileTags, palette: row.paletteTags },
    audio: { SE1: { header: row.audio.SE1.songHeaderIdentity, status: row.audio.SE1.status, digest: sha(JSON.stringify(row.audio.SE1)) }, SE2: { header: row.audio.SE2.songHeaderIdentity, status: row.audio.SE2.status, digest: sha(JSON.stringify(row.audio.SE2)) } },
    battlerOffsets: { attacker: { x2: attackerSprite(row).x2, y2: attackerSprite(row).y2 }, target: { x2: targetSprite(row).x2, y2: targetSprite(row).y2 } },
    animationRng: row.animationRng,
    digests: {
      allTasks: sha(JSON.stringify(row.tasks)), allSprites: sha(JSON.stringify(row.sprites)), softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)),
      softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), unfadedPalette: sha(JSON.stringify(row.unfadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)),
      parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)), engine: sha(JSON.stringify(row.engine)), immutableState: sha(JSON.stringify(row.immutableState)),
    },
  }));
  return {
    schema: "hyper-beam-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract,
    source: { pointerEdges: edges(rows, (row) => [row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait]), argEdges: sourceArgs, offsetCounts: sourceOffsets, observedAddresses: probe.sourcePointerContract.observedAddresses, observedParities: probe.sourcePointerContract.observedParities },
    lifecycle: { orbCount: orbs.length, orbGroupStarts, orbStarts: [...orbStarts.entries()].sort(([left], [right]) => left - right), orbLives: orbLifeRows, simplePaletteBlendLives: simples.map((life) => ({ ...life, first: spriteView(rows[life.start]!, life.first), last: spriteView(rows[life.end]!, life.last) })), taskLives: tasks.map(taskView) },
    rng: { stepHistogram: Object.fromEntries([...new Set(rngStepRows)].sort((a, b) => a - b).map((step) => [step, rngStepRows.filter((value) => value === step).length])), sevenStepRows: rngStepRows.flatMap((step, age) => step === 7 ? [age + 1] : []), totalTransitions: rngStepRows.length, random2Draws: 52 * 3 },
    latches: {
      hardwareOamEqualsPrecedingSoftware: wholeLatch("hardwareOam", "softwareOam"), hardwareMatricesEqualPrecedingSoftware: wholeLatch("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: wholeLatch("hardwarePalette", "fadedPalette"),
      plainOrbOam: { softwarePrefixEverySourceRow: true, hardwarePrefixEveryPrecedingRow: true, displayedStart: "source+1", displayedRemoval: "source+1" },
      freshOrbMatrices: { count: 0, allNeutral: true },
      attackerShake2SourceEdges: battlerEdges((row) => [attackerSprite(row).x2, attackerSprite(row).y2]),
      attackerShakeSourceEdges: battlerEdges((row) => attackerSprite(row).y2),
      targetShake2SourceEdges: battlerEdges((row) => [targetSprite(row).x2, targetSprite(row).y2]),
      paletteFadedChanges, paletteHardwareChanges,
    },
    palette: { fadedChanges: paletteFadedChanges, unfadedChanges: transitions(rows, (row) => row.unfadedPalette), hardwareChanges: paletteHardwareChanges, orbFlashAges, bgRampAges, targetBlendAges, targetBlendIndexWitness },
    background: { bgVramTransitions: transitions(rows, (row) => row.bgVram), battleBgTransitions: transitions(rows, (row) => row.battleBg), registerEdges: Object.fromEntries(["bldcnt", "bldalpha", "bldy"].map((key) => [key, edges(rows, (row) => row.registers[key])])), allRegisterTransitions: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])])) },
    audio: { se1HeaderEdges: edges(rows, (row) => row.audio.SE1.songHeaderIdentity.symbol), se2HeaderEdges: edges(rows, (row) => row.audio.SE2.songHeaderIdentity.symbol), loopTask: tasks.filter((life) => life.first.func.symbol === "SoundTask_LoopSEAdjustPanning_Step").map(taskView), initialPanArgs: tasks.find((life) => life.first.func.symbol === "SoundTask_LoopSEAdjustPanning_Step")?.first.data.slice(0, 7), se1Digests: rows.map((row) => sha(JSON.stringify(row.audio.SE1))), se2Digests: rows.map((row) => sha(JSON.stringify(row.audio.SE2))) },
    resources: { orbsTag: { tile: [1, 278, 278], palette: [1, 278, 278] }, tileTagEdges: edges(rows, (row) => row.tileTags.includes(ORBS_TAG)), paletteTagEdges: edges(rows, (row) => row.paletteTags.includes(ORBS_TAG)) },
    battlers: { attacker: attacker, target: target, attackerSpriteSlot: rows[0]!.animationBattlers.spriteIds[attacker], targetSpriteSlot: rows[0]!.animationBattlers.spriteIds[target], attackerX2Edges: edges(rows, (row) => attackerSprite(row).x2), attackerY2Edges: edges(rows, (row) => attackerSprite(row).y2), targetX2Edges: edges(rows, (row) => targetSprite(row).x2), targetY2Edges: edges(rows, (row) => targetSprite(row).y2) },
    state: { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRngDistinct: new Set(rows.map((row) => row.animationRng)).size },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, orbs: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template?.symbol === ORB_TEMPLATE).length, tasks: rows.at(-1)!.tasks.filter((task: Json) => TASKS.has(task.func.symbol)).length, simplePaletteBlend: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template?.symbol === SIMPLE_TEMPLATE).length, orbsTag: { tile: rows.at(-1)!.tileTags.includes(ORBS_TAG), palette: rows.at(-1)!.paletteTags.includes(ORBS_TAG) } },
    rows: rowMap,
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side];
  const compressed = readFileSync(resolve(root, config.denseState));
  const json = gunzipSync(compressed);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(probe.schema === "hyper-beam-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 63, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === SOURCE_START && probe.sourcePointerContract.endExclusive === SOURCE_END && same(probe.sourcePointerContract.observedAddresses, [SOURCE_START, SOURCE_START + 3, SOURCE_START + 20, SOURCE_START + 23, SOURCE_START + 44, SOURCE_START + 47, SOURCE_START + 286, SOURCE_START + 304, SOURCE_START + 321]) && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  invariant(rows.length === 280 && rows.every((row) => row.scriptOwner === "Move_HYPER_BEAM" && row.scriptPtr >= SOURCE_START && row.scriptPtr < SOURCE_END && row.scriptOffset === row.scriptPtr - SOURCE_START && row.scriptPtrParity === (row.scriptPtr & 1)), `${side}: complete pointer rows`);
  invariant(rows[0]!.frame === (side === "player-back" ? 79 : 83) && rows.at(-1)!.frame === (side === "player-back" ? 358 : 362), `${side}: source frame window`);
  rows.forEach((row, age) => invariant(
    row.tasks.length <= 16 && row.sprites.length <= 64 && row.spriteOrder.length === 64 && row.spriteFlags.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4,
    `${side}: full row ${age}`,
  ));
  invariant(rows[0]!.animScriptActive && !rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: inactive cleanup`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows);
  const map = derive(side, probe, rgb);
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);

  const expectedArgs = [
    [0, [0, 0, 0, 0, 0, 0, 0, 0]], [4, [1, 4, 0, 16, 0, 0, 0, 0]], [71, [0, 1, 0, 4, 1, 0, 0, 0]],
    [110, [ORBS_TAG, 1, 12, 31, 16, 0, 0, 0]], [125, [4, 2, 0, 11, 26425, 0, 0, 0]], [188, [4, 2, 11, 0, 26425, 0, 0, 0]], [224, [1, 4, 16, 0, 0, 0, 0, 0]],
  ];
  invariant(same(map.source.argEdges, expectedArgs), `${side}: source command args`);
  invariant(same(map.source.offsetCounts, { 0: 1, 3: 3, 20: 55, 23: 12, 44: 7, 47: 32, 286: 36, 304: 56, 321: 78 }), `${side}: source pointer cadence`);
  invariant(same(map.lifecycle.orbGroupStarts, Array.from({ length: 26 }, (_, index) => 110 + index * 3)) && same(map.lifecycle.orbStarts, map.lifecycle.orbGroupStarts.map((age: number) => [age, 2])) && map.lifecycle.orbCount === 52, `${side}: all 26 two-orb groups`);
  invariant(map.lifecycle.orbLives.every((life: Json) => life.first.callback === ORB_CALLBACK && life.first.template === ORB_TEMPLATE && life.first.matrixNum === 0 && same(life.first.matrix, [256, 0, 0, 256]) && life.first.animNum >= 0 && life.first.animNum < 8 && life.first.animCmdIndex === 0 && life.first.animDelayCounter === 0), `${side}: orb template/cells/matrices`);
  for (const life of collectLives(rows, "orb")) {
    let previous: Json | undefined;
    for (const age of life.ages) {
      const sprite = rows[age]!.sprites.find((item: Json) => item.slot === life.slot && item.template?.symbol === ORB_TEMPLATE);
      invariant(sprite && sprite.callback.symbol === ORB_CALLBACK && oamHasPrefix(sprite, rows[age]!.softwareOam), `${side}: orb source OAM ${life.id}/${age}`);
      if (previous) invariant((sprite.data[5] - previous.data[5] + 256) % 256 === 24 && sprite.x === previous.x && sprite.y === previous.y && sprite.animNum === previous.animNum && same(sprite.matrix, [256, 0, 0, 256]), `${side}: orb callback/motion ${life.id}/${age}`);
      previous = sprite;
    }
  }
  for (let age = 1; age < rows.length; age += 1) for (const sprite of rows[age - 1]!.sprites.filter((item: Json) => item.template?.symbol === ORB_TEMPLATE)) invariant(oamHasPrefix(sprite, rows[age]!.hardwareOam), `${side}: orb predecessor OAM ${age}/${sprite.slot}`);
  invariant(same(map.lifecycle.simplePaletteBlendLives.map((life: Json) => [life.start, life.end, life.first.callback]), [[4, 57, SIMPLE_CALLBACK], [224, 277, SIMPLE_CALLBACK]]), `${side}: both simple palette ramps`);
  const taskShape = map.lifecycle.taskLives.map((life: Json) => [life.slot, life.func, life.start, life.end]);
  invariant(same(taskShape, [
    [0, "AnimTask_ShakeMon2_Step", 71, 76], [4, "AnimTask_BlendSpriteColor_Step2", 125, 158], [2, "AnimTask_FlashAnimTagWithColor_Step1", 110, 186], [2, "AnimTask_FlashAnimTagWithColor_Step2", 187, 187],
    [0, "SoundTask_LoopSEAdjustPanning_Step", 110, 192], [1, "AnimTask_ShakeMon_Step", 110, 207], [4, "AnimTask_BlendSpriteColor_Step2", 188, 221], [3, "AnimTask_ShakeMon2_Step", 125, 222],
  ]), `${side}: task lifetimes`);
  const attackerSlot = rows[0]!.animationBattlers.spriteIds[rows[0]!.animationBattlers.attacker];
  const targetSlot = rows[0]!.animationBattlers.spriteIds[rows[0]!.animationBattlers.target];
  const targetBank = side === "player-back" ? 2 : 1;
  invariant(map.lifecycle.taskLives.some((life: Json) => life.slot === 0 && life.func === "AnimTask_ShakeMon2_Step" && life.initialData[0] === attackerSlot && same(life.initialData.slice(1, 5), [3, 1, 1, 1])), `${side}: attacker ShakeMon2`);
  invariant(map.lifecycle.taskLives.some((life: Json) => life.slot === 1 && life.func === "AnimTask_ShakeMon_Step" && life.initialData[0] === attackerSlot && same(life.initialData.slice(1, 7), [49, 1, 1, 0, 4, 0])), `${side}: attacker ShakeMon`);
  invariant(map.lifecycle.taskLives.some((life: Json) => life.slot === 3 && life.func === "AnimTask_ShakeMon2_Step" && life.initialData[0] === targetSlot && same(life.initialData.slice(1, 5), [49, 1, 1, 4])), `${side}: target ShakeMon2`);
  invariant(map.lifecycle.taskLives.some((life: Json) => life.slot === 4 && life.start === 125 && life.initialData[1] === targetBank && same(life.initialData.slice(2, 6), [2, 0, 11, 26425])) && map.lifecycle.taskLives.some((life: Json) => life.slot === 4 && life.start === 188 && life.initialData[1] === targetBank && same(life.initialData.slice(2, 6), [2, 11, 0, 26425])), `${side}: both target palette tasks`);
  const flash = map.lifecycle.taskLives.find((life: Json) => life.func === "AnimTask_FlashAnimTagWithColor_Step1");
  invariant(flash && same(flash.initialData.slice(1, 8), [1, 12, 31, 16, 0, 0, ORBS_TAG]), `${side}: ORBS flash task`);
  const sound = map.lifecycle.taskLives.find((life: Json) => life.func === "SoundTask_LoopSEAdjustPanning_Step");
  const expectedPan = side === "player-back" ? [-64, 63, 1] : [63, -63, -1];
  invariant(sound && same(sound.initialData.slice(0, 7), [247, expectedPan[0], expectedPan[1], expectedPan[2], 14, 0, 5]) && same(map.audio.initialPanArgs, sound.initialData.slice(0, 7)), `${side}: LoopSEAdjustPanning 1/15/0/5`);
  invariant(same(map.rng.stepHistogram, { 1: 253, 7: 26 }) && same(map.rng.sevenStepRows, map.lifecycle.orbGroupStarts) && map.rng.random2Draws === 156 && map.rng.totalTransitions === 279, `${side}: 26 groups x 2 orbs x 3 Random2`);
  invariant(same(map.palette.orbFlashAges, [110, 116, 122, 128, 134, 140, 146, 152, 158, 164, 170, 176, 182, 189]), `${side}: ORBS flash ramp`);
  invariant(same(map.palette.bgRampAges, [9, 15, 21, 27, 33, 39, 45, 51, 229, 235, 241, 247, 253, 259, 265, 271]) && same(map.palette.targetBlendAges, [129, 132, 135, 138, 141, 144, 147, 150, 153, 156, 159, 192, 195, 198, 201, 204, 207, 210, 213, 216, 219, 222]), `${side}: palette ramps`);
  invariant(same(map.palette.fadedChanges, [1, 9, 15, 21, 27, 33, 39, 45, 51, 110, 116, 122, 128, 129, 132, 134, 135, 138, 140, 141, 144, 146, 147, 150, 152, 153, 156, 158, 159, 164, 170, 176, 182, 189, 192, 195, 198, 201, 204, 207, 210, 213, 216, 219, 222, 229, 235, 241, 247, 253, 259, 265, 271]) && same(map.palette.unfadedChanges, [1]) && same(map.palette.hardwareChanges, [2, 10, 16, 22, 28, 34, 40, 46, 52, 111, 117, 123, 129, 130, 133, 135, 136, 139, 141, 142, 145, 147, 148, 151, 153, 154, 157, 159, 160, 165, 171, 177, 183, 190, 193, 196, 199, 202, 205, 208, 211, 214, 217, 220, 223, 230, 236, 242, 248, 254, 260, 266, 272]), `${side}: palette change maps`);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === "279/279" && map.latches.hardwareMatricesEqualPrecedingSoftware === "279/279" && map.latches.hardwarePaletteEqualsPrecedingFaded === "279/279", `${side}: complete predecessor transfers`);
  const attackerX2 = map.battlers.attackerX2Edges;
  const targetX2 = map.battlers.targetX2Edges;
  invariant(same(attackerX2, [[0, rows[0]!.animationBattlers.attacker === 0 ? 0 : 0], [71, -1], [73, 1], [75, -1], [77, 0]]), `${side}: attacker ShakeMon2 x2 edges`);
  const expectedTargetX2 = [[0, side === "player-back" ? 1 : 0], ...Array.from({ length: 49 }, (_, index) => [125 + index * 2, index % 2 ? 4 : -4]), [223, 0]];
  invariant(same(targetX2, expectedTargetX2), `${side}: target ShakeMon2 x2 edges`);
  invariant(map.background.bgVramTransitions.length === 0 && map.background.battleBgTransitions.length === 0 && same(map.background.registerEdges, { bldcnt: [[0, 0]], bldalpha: [[0, 0]], bldy: [[0, 0]] }), `${side}: blackout/register evidence`);
  invariant(map.resources.orbsTag.tile[0] === 1 && map.resources.orbsTag.tile[1] === 278 && map.resources.orbsTag.tile[2] === 278 && same(map.resources.orbsTag, { tile: [1, 278, 278], palette: [1, 278, 278] }), `${side}: ORBS resource lifetime`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.gameplayRngTransitions.length === 0 && map.state.animationRngDistinct === 280, `${side}: immutable gameplay/RNG state`);
  invariant(map.cleanup.orbs === 0 && map.cleanup.tasks === 0 && map.cleanup.simplePaletteBlend === 0 && !map.cleanup.active && !map.cleanup.orbsTag.tile && !map.cleanup.orbsTag.palette, `${side}: final cleanup`);
  const current = {
    scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow,
    summary: { lifecycle: { orbCount: map.lifecycle.orbCount, orbGroupStarts: map.lifecycle.orbGroupStarts, orbStarts: map.lifecycle.orbStarts, simplePaletteBlendLives: map.lifecycle.simplePaletteBlendLives, taskLives: map.lifecycle.taskLives }, rng: map.rng, latches: map.latches, palette: map.palette, background: map.background, audio: map.audio, resources: map.resources, battlers: map.battlers, state: map.state, cleanup: map.cleanup },
  };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: receipt/map drift`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/hyper-beam-evidence.json");
if (process.argv.includes("--write")) {
  const player = verifySide("player-back", undefined, true), opponent = verifySide("opponent-front", undefined, true);
  const repeats = { "player-back": process.env.HYPER_BEAM_PLAYER_REPEAT, "opponent-front": process.env.HYPER_BEAM_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.HYPER_BEAM_PLAYER_REPEAT_RGB_SHA256, "opponent-front": process.env.HYPER_BEAM_OPPONENT_REPEAT_RGB_SHA256 };
  for (const side of ["player-back", "opponent-front"] as const) {
    const path = repeats[side]; invariant(path, `${side}: repeat required`);
    const digest = sha(readFileSync(path)); const first = side === "player-back" ? player : opponent;
    invariant(digest === first.probeJsonSha256 && repeatRgb[side] === first.rawRgbSequenceSha256, `${side}: twice-fresh mismatch`);
    first.repeatProbeJsonSha256 = digest; first.repeatRawRgbSequenceSha256 = repeatRgb[side];
  }
  const fixture = {
    schema: "hyper-beam-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_HYPER_BEAM", moveId: 63, status: "exact", coverageCredit: true,
    evidenceScope: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, productionAnimationChanged: true, reducerAdded: true, assetBundleAdded: true, typedSeamAdded: true, compositorAdded: true, framebufferCompared: true, coveragePromotion: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
    source: { start: "0x082d4d70", endExclusive: "0x082d4eb2", byteLength: 322, romSha256: "2f6089be2a4da2aaf1f0168a1f38715deb712e214070e2ce8260d1b7123f60ce", sourceByteLength: 1662, sourceSha256: "23fcfaff142e4d12b5cd5c261d3dd98780bd032f5b64daa85787b528f41f2b4f", components: 9, audit: "tools/compare/hyperBeamSourceAudit.ts", probe: "tools/compare/hyperBeamProbe.py", verifier: "tools/compare/hyperBeamEvidence.ts" },
    acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 280, "opponent-front": 280 }, rawRgbRows: { "player-back": 280, "opponent-front": 280 }, productionFramebufferCompared: true, latchVerdict: "MOVE_HYPER_BEAM independently proves whole OAM, affine matrices, and faded palette as the preceding source buffers on 279/279 comparable rows per orientation; production preserves plain ORBS OAM/callback/motion, both ShakeMon2 invocations, ShakeMon, both target palette ramps, and palette writes", backgroundVerdict: "Both F_PAL_BG simple_palette_blend ramps, ORBS flash, target forward/reverse BlendBattleAnimPal ramps, unchanged BLD registers/BG VRAM, and cleanup pass complete bilateral actual-core comparison" },
    orientations: { "player-back": player, "opponent-front": opponent }, controls: { inheritedSiblingLatchFacts: false, generalizedTransferFacts: false, inferredSharedTaskCredit: false, inferredSiblingCredit: false },
    acceptanceVerdict: "Exact: MOVE_HYPER_BEAM and hyper-beam-orbs-blackout alone pass complete bilateral actual-core comparison twice; no inferred sibling credit.",
  };
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const result: Json = {};
for (const side of ["player-back", "opponent-front"] as const) result[side] = verifySide(side, fixture.orientations[side]);
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, item]: [string, Json]) => [side, { sourceWindow: item.sourceWindow, probeJsonSha256: item.probeJsonSha256, repeatProbeJsonSha256: fixture.orientations[side].repeatProbeJsonSha256, rawRgbSequenceSha256: item.rawRgbSequenceSha256, lifecycle: item.summary.lifecycle, rng: item.summary.rng, latches: { oam: item.summary.latches.hardwareOamEqualsPrecedingSoftware, matrices: item.summary.latches.hardwareMatricesEqualPrecedingSoftware, palette: item.summary.latches.hardwarePaletteEqualsPrecedingFaded }, palette: item.summary.palette, background: item.summary.background, audio: item.summary.audio, resources: item.summary.resources, state: item.summary.state, cleanup: item.summary.cleanup }])), boundary: { moveLedgerEntry: true, trackFulfilled: true, barrierChanged: false } }, null, 2));
