/** Validate and bank the unsupported bilateral MOVE_DIG dense Scene-ON checkpoint. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type Phase = "setup" | "unleash";

const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sourceRange = { start: 0x082ccca1, endExclusive: 0x082ccdbd };
const paths: Record<Side, Json> = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-dig-player-vibrava-opponent-chansey.json",
    dense: "tools/compare/evidence/dig-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/dig-player-raw-rgb.tar.gz",
    map: "tools/compare/evidence/dig-changemap-player.json",
    repeatProbeJsonSha256: "d5c19e67a396d8779f8f00386cd6418744103c93013c0e7dbcb090196eaaccc5",
    repeatRawRgbSequenceSha256: "25fbcbe8f06a9d4826a5c503f6ca266ee237f376ffc4cb67959cbe8489d65160",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-dig-opponent-vibrava-player-chansey.json",
    dense: "tools/compare/evidence/dig-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/dig-opponent-raw-rgb.tar.gz",
    map: "tools/compare/evidence/dig-changemap-opponent.json",
    repeatProbeJsonSha256: "9a4863c004e69877a8718e9a35408b0a001cc4a11548bb3198a3e650763ab71d",
    repeatRawRgbSequenceSha256: "14ca4c5570e378bcada6c7855b6e974315b82a7489afb259b1605fb7fa4ea3bd",
  },
};
const ownedTemplates = new Set([
  "gDirtMoundSpriteTemplate", "gDirtPlumeSpriteTemplate", "gBasicHitSplatSpriteTemplate",
]);
const ownedTaskNames = new Set([
  "AnimTask_DigDownMovement", "AnimTask_DigBounceMovement", "AnimTask_DigEndBounceMovementSetInvisible",
  "AnimTask_DigUpMovement", "AnimTask_DigSetVisibleUnderground", "AnimTask_DigRiseUpFromHole",
  "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "Task_UpdateMonBg", "Task_ClearMonBg", "Task_ClearMonBgStatic",
]);
const resourceTags = { mudSand: 10074, impact: 10135, dirtMound: 10281 } as const;
const requiredSourceSymbols = [
  "AnimTask_DigDownMovement", "AnimTask_DigBounceMovement", "AnimTask_DigEndBounceMovementSetInvisible",
  "AnimTask_DigUpMovement", "AnimTask_DigSetVisibleUnderground", "AnimTask_DigRiseUpFromHole",
  "SetDigScanlineEffect", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "Task_UpdateMonBg", "Task_ClearMonBg",
] as const;

function transitions<T>(rows: readonly Json[], select: (row: Json) => T): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}

function relation(rows: readonly Json[], hardware: string, software: string): Json {
  const preceding = rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length;
  const current = rows.slice(1).filter((row) => same(row[hardware], row[software])).length;
  const other = rows.slice(1).flatMap((row, age) =>
    !same(row[hardware], rows[age]![software]) && !same(row[hardware], row[software]) ? [age + 1] : []);
  return { preceding: `${preceding}/${rows.length - 1}`, current: `${current}/${rows.length - 1}`, other };
}

function tagLifetime(rows: readonly Json[], tag: number): Json {
  const tile = rows.flatMap((row, age) => row.tileTags.includes(tag) ? [age] : []);
  const palette = rows.flatMap((row, age) => row.paletteTags.includes(tag) ? [age] : []);
  return { tile: [tile[0] ?? null, tile.at(-1) ?? null, tile.length], palette: [palette[0] ?? null, palette.at(-1) ?? null, palette.length] };
}

function lifetimes(rows: readonly Json[], select: (row: Json) => Json[], key: (item: Json) => string): Json[] {
  const live = new Map<string, Json>();
  const result: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Map(select(row).map((item) => [key(item), item]));
    for (const [id, item] of current) if (!live.has(id)) live.set(id, { id, start: age, first: item });
    for (const [id, item] of [...live]) if (!current.has(id)) {
      result.push({ ...item, end: age - 1 });
      live.delete(id);
    }
  }
  for (const item of live.values()) result.push({ ...item, end: rows.length - 1 });
  return result;
}

function compactSprite(sprite: Json): Json {
  return {
    slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol,
    attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data,
    subpriority: sprite.subpriority, invisible: sprite.invisible,
  };
}

function compactTask(task: Json): Json {
  return { slot: task.slot, func: task.func.symbol, data: task.data };
}

function rawRgb(path: string, rows: readonly Json[]): { archiveSha256: string; sequenceSha256: string; frames: Buffer[] } {
  const archive = resolve(root, path);
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim().split("\n").filter((member) => member.endsWith(".rgb"));
  const expected = rows.map((row) => `./${String(row.frame).padStart(5, "0")}.rgb`);
  invariant(same(members, expected), `${path}: RGB archive is not chronological dense rows`);
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: rows.length * 240 * 160 * 3 + 1 });
  const frameSize = 240 * 160 * 3;
  invariant(bytes.length === rows.length * frameSize, `${path}: RGB byte length`);
  const frames = rows.map((row, age) => {
    const frame = bytes.subarray(age * frameSize, (age + 1) * frameSize);
    invariant(sha(frame) === row.sha256, `${path}: RGB digest at frame ${row.frame}`);
    return frame;
  });
  return { archiveSha256: sha(readFileSync(archive)), sequenceSha256: sha(bytes), frames };
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

function phaseSummary(rows: readonly Json[], rgb: readonly Buffer[], phase: Phase): Json {
  const spriteLives = lifetimes(rows,
    (row) => row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)),
    (sprite) => `${sprite.slot}:${sprite.template.symbol}`)
    .map((life) => ({ id: life.id, start: life.start, end: life.end, sprite: compactSprite(life.first) }));
  const taskLives = lifetimes(rows,
    (row) => row.tasks.filter((task: Json) => ownedTaskNames.has(task.func.symbol)),
    (task) => `${task.slot}:${task.func.symbol}`)
    .map((life) => ({ id: life.id, start: life.start, end: life.end, task: compactTask(life.first) }));
  const compactRows = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, scriptPtr: row.scriptPtr,
    scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, animArgs: row.animArgs,
    visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
    sprites: row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).map(compactSprite),
    tasks: row.tasks.filter((task: Json) => ownedTaskNames.has(task.func.symbol)).map(compactTask),
    battlers: {
      attacker: { slot: row.battlerSprites.attacker.slot, x: row.battlerSprites.attacker.x, y: row.battlerSprites.attacker.y,
        x2: row.battlerSprites.attacker.x2, y2: row.battlerSprites.attacker.y2, invisible: row.battlerSprites.attacker.invisible,
        matrixNum: row.battlerSprites.attacker.matrixNum, matrix: row.battlerSprites.attacker.matrix },
      target: { slot: row.battlerSprites.target.slot, x: row.battlerSprites.target.x, y: row.battlerSprites.target.y,
        x2: row.battlerSprites.target.x2, y2: row.battlerSprites.target.y2, invisible: row.battlerSprites.target.invisible,
        matrixNum: row.battlerSprites.target.matrixNum, matrix: row.battlerSprites.target.matrix },
    },
    resources: {
      tags: Object.fromEntries(Object.entries(resourceTags).map(([name, tag]) => [name, {
        tile: row.tileTags.includes(tag), palette: row.paletteTags.includes(tag),
      }])),
      allocator: { matrixBitmap: row.resourceAllocators.matrixBitmap, tileBitmapSha256: sha(row.resourceAllocators.tileBitmap),
        tileRangesSha256: sha(JSON.stringify(row.resourceAllocators.tileRanges)), paletteTags: row.paletteTags, tileTags: row.tileTags },
    },
    scanline: { ...row.scanline, bufferSha256: row.scanlineBuffers.map((buffer: number[]) => sha(JSON.stringify(buffer))) },
    registers: row.registers, battleBg: row.battleBg,
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, {
      symbol: row.audio[channel].songHeaderIdentity.symbol,
      tracks: row.audio[channel].tracks.map((track: Json) => ({ flags: track.flags, pan: track.pan, panX: track.panX })),
    }])),
    rng: { gameplay: row.immutableState.rngValue, animation: row.animationRng },
    state: { immutableSha256: sha(JSON.stringify(row.immutableState)), rawBattleStateSha256: sha(JSON.stringify(row.rawBattleState)),
      partiesSha256: sha(JSON.stringify(row.parties)), battlersSha256: sha(JSON.stringify(row.battlers)), engineSha256: sha(JSON.stringify(row.engine)) },
    transfer: { oam: relation(rows.slice(0, age + 1), "hardwareOam", "softwareOam").preceding,
      matrices: relation(rows.slice(0, age + 1), "hardwareMatrices", "softwareMatrices").preceding,
      palette: relation(rows.slice(0, age + 1), "hardwarePalette", "fadedPalette").preceding },
    oamSha256: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) },
    matrixSha256: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)) },
    paletteSha256: { faded: sha(JSON.stringify(row.fadedPalette)), hardware: sha(JSON.stringify(row.hardwarePalette)) },
    ...changedPixels(rgb[age - 1], rgb[age]!),
  }));
  const state = {
    partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)),
    battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)),
    engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)),
    immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)),
    rawBattleStateStable: rows.every((row) => same(row.rawBattleState, rows[0]!.rawBattleState)),
    gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue),
    animationRngTransitions: transitions(rows, (row) => row.animationRng),
  };
  const scanline = {
    stateTransitions: transitions(rows, (row) => row.scanline.state),
    sourceBufferTransitions: transitions(rows, (row) => row.scanline.srcBuffer),
    dmaDestinationTransitions: transitions(rows, (row) => row.scanline.dmaDest),
    bufferTransitions: transitions(rows, (row) => row.scanlineBuffers),
  };
  return {
    phase, frameCount: rows.length, frames: [rows[0]!.frame, rows.at(-1)!.frame], rows: compactRows,
    lifecycle: { sprites: spriteLives, tasks: taskLives },
    latches: { oam: relation(rows, "hardwareOam", "softwareOam"), matrices: relation(rows, "hardwareMatrices", "softwareMatrices"), palette: relation(rows, "hardwarePalette", "fadedPalette") },
    resources: Object.fromEntries(Object.entries(resourceTags).map(([name, tag]) => [name, tagLifetime(rows, tag)])),
    transitions: {
      taskSet: transitions(rows, (row) => row.tasks.filter((task: Json) => ownedTaskNames.has(task.func.symbol)).map(compactTask)),
      attackerInvisible: transitions(rows, (row) => row.battlerSprites.attacker.invisible),
      attackerX2: transitions(rows, (row) => row.battlerSprites.attacker.x2),
      attackerY2: transitions(rows, (row) => row.battlerSprites.attacker.y2),
      targetX2: transitions(rows, (row) => row.battlerSprites.target.x2),
      targetY2: transitions(rows, (row) => row.battlerSprites.target.y2),
      audio: transitions(rows, (row) => [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol]),
      registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((name) => [name, transitions(rows, (row) => row.registers[name])]).filter(([, ages]) => (ages as number[]).length)),
      battleBg: Object.fromEntries(Object.keys(rows[0]!.battleBg).map((name) => [name, transitions(rows, (row) => row.battleBg[name])]).filter(([, ages]) => (ages as number[]).length)),
    },
    scanline, state,
    cleanup: { active: rows.at(-1)!.animScriptActive, visualTaskCount: rows.at(-1)!.visualTaskCount,
      soundTaskCount: rows.at(-1)!.soundTaskCount,
      ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).length,
      ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTaskNames.has(task.func.symbol)).length },
  };
}

function assertPhase(phase: Phase, result: Json): void {
  invariant(result.cleanup.active === false && result.cleanup.visualTaskCount === 0 && result.cleanup.soundTaskCount === 0
    && result.cleanup.ownedSprites === 0 && result.cleanup.ownedTasks === 0, `${phase}: first inactive cleanup`);
  invariant(result.state.partiesStable && result.state.battlersStable && result.state.engineStable
    && result.state.immutableStable && result.state.rawBattleStateStable && result.state.gameplayRngTransitions.length === 0,
  `${phase}: gameplay state or RNG changed inside visual body`);
  invariant(result.state.animationRngTransitions.length > 0, `${phase}: animation RNG did not remain separate/live`);
  invariant(result.latches.oam.preceding === `${result.frameCount - 1}/${result.frameCount - 1}`
    && result.latches.matrices.preceding === `${result.frameCount - 1}/${result.frameCount - 1}`
    && result.latches.oam.other.length === 0 && result.latches.matrices.other.length === 0
    && result.latches.palette.other.length === 0, `${phase}: OAM/matrix/palette relation`);
  if (phase === "setup") {
    invariant(result.frameCount === 195 && result.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gDirtMoundSpriteTemplate").length === 2,
      "setup: dirt mound count");
    invariant(result.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gDirtPlumeSpriteTemplate").length === 20,
      "setup: twenty dirt plumes");
    invariant(same(result.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gDirtMoundSpriteTemplate").map((item: Json) => [item.start, item.end]), [[7, 187], [7, 187]]),
      "setup: mound lifetime");
    invariant(same(result.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gDirtPlumeSpriteTemplate").map((item: Json) => [item.start, item.end]),
      Array.from({ length: 5 }, (_, group) => Array.from({ length: 4 }, () => [18 + group * 34, 35 + group * 34])).flat()), "setup: plume groups");
    invariant(result.lifecycle.tasks.some((item: Json) => item.task.func === "AnimTask_DigBounceMovement" && item.start === 10 && item.end === 167),
    "setup: Dig bounce");
    invariant(result.lifecycle.tasks.some((item: Json) => item.task.func === "Task_ClearMonBgStatic" && item.start === 189 && item.end === 191),
    "setup: static monbg cleanup");
    invariant(same(result.transitions.attackerInvisible, [10, 189, 194])
      && same(result.scanline.stateTransitions, [10, 167, 168]) && result.rows[194].battlers.attacker.invisible
      && result.rows[194].battlers.attacker.x2 === 0 && result.rows[194].battlers.attacker.y2 === 0
      && result.latches.palette.preceding === "193/194", "setup: visibility/scanline/palette facts");
    invariant(same(result.resources.mudSand, { tile: [1, 193, 193], palette: [1, 193, 193] })
      && same(result.resources.dirtMound, { tile: [4, 193, 190], palette: [4, 193, 190] })
      && same(result.resources.impact, { tile: [null, null, 0], palette: [null, null, 0] })
      && result.rows[18].audio.SE1.symbol === "se_m_dig", "setup: tags/resources/dig audio");
  } else {
    invariant(result.frameCount === 68 && result.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gDirtMoundSpriteTemplate").length === 2
      && result.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gBasicHitSplatSpriteTemplate").length === 1,
    "unleash: mound/hitsplat count");
    invariant(same(result.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gDirtMoundSpriteTemplate").map((item: Json) => [item.start, item.end]), [[11, 61], [11, 61]])
      && same(result.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gBasicHitSplatSpriteTemplate").map((item: Json) => [item.start, item.end]), [[32, 43]]),
    "unleash: sprite lifetimes");
    invariant(result.lifecycle.tasks.some((item: Json) => item.task.func === "AnimTask_DigRiseUpFromHole" && item.start === 14 && item.end === 27)
      && result.lifecycle.tasks.some((item: Json) => item.task.func === "AnimTask_ShakeMon_Step" && item.start === 32 && item.end === 43)
      && result.lifecycle.tasks.some((item: Json) => item.task.func === "Task_UpdateMonBg" && item.start === 8 && item.end === 34)
      && result.lifecycle.tasks.some((item: Json) => item.task.func === "Task_ClearMonBg" && item.start === 32 && item.end === 34),
    "unleash: rise/shake tasks");
    invariant(same(result.transitions.targetX2, [36, 38, 40, 42]) && same(result.scanline.stateTransitions, [14, 27, 28])
      && result.rows[7].battlers.attacker.invisible === false
      && result.rows[7].battlers.attacker.y2 === 160 - result.rows[7].battlers.attacker.y
      && result.latches.palette.preceding === "67/67", "unleash: impact/scanline/palette facts");
    invariant(same(result.resources.impact, { tile: [1, 66, 66], palette: [1, 66, 66] })
      && same(result.resources.dirtMound, { tile: [4, 66, 63], palette: [4, 66, 63] })
      && same(result.resources.mudSand, { tile: [null, null, 0], palette: [null, null, 0] })
      && result.rows[32].audio.SE1.symbol === "se_m_mega_kick2", "unleash: tags/resources/impact audio");
  }
}

function verifySide(side: Side, writeMap: boolean): Json {
  const path = paths[side];
  const compressed = readFileSync(resolve(root, path.dense));
  const json = gunzipSync(compressed);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  invariant(probe.schema === "dig-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 91, `${side}: probe identity`);
  invariant(same(probe.sourcePointerContract, { start: sourceRange.start, endExclusive: sourceRange.endExclusive,
    observedAddresses: probe.sourcePointerContract.observedAddresses, observedParities: [0, 1] }), `${side}: source root/parity`);
  invariant(same(probe.sourcePointerContracts, [sourceRange]), `${side}: source ownership range`);
  invariant(requiredSourceSymbols.every((symbol) => typeof probe.sourceSymbols[symbol] === "number"), `${side}: complete Dig task/source symbol receipt`);
  const rows = probe.frames as Json[];
  invariant(probe.bodyWindows.length === 2 && same(probe.bodyWindows.map((window: Json) => window.frameCount), [195, 68]) && rows.length === 263,
    `${side}: complete setup/unleash rows`);
  invariant(rows.every((row) => row.scriptOwner === "Move_DIG" && row.scriptPtr >= sourceRange.start && row.scriptPtr < sourceRange.endExclusive), `${side}: source cursor ownership`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.scanlineBuffers.length === 2 && row.scanlineBuffers.every((buffer: number[]) => buffer.length === 320)
    && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4,
  ), `${side}: required state/hardware surface`);
  const rgb = rawRgb(path.rgb, rows);
  const setupRows = rows.slice(0, 195), unleashRows = rows.slice(195);
  const setup = phaseSummary(setupRows, rgb.frames.slice(0, 195), "setup");
  const unleash = phaseSummary(unleashRows, rgb.frames.slice(195), "unleash");
  assertPhase("setup", setup); assertPhase("unleash", unleash);
  const map = {
    schema: "dig-normalized-change-map/v1", oracleProfile: "battle-scene-on", side,
    source: { range: sourceRange, sourceWindow: probe.sourceWindow, bodyWindows: probe.bodyWindows, stageFacts: probe.stageFacts },
    taskDelegation: {
      setup: [
        "AnimTask_DigDownMovement(FALSE) self-dispatches to resident AnimTask_DigBounceMovement at age 10..167",
        "AnimTask_DigDownMovement(TRUE) self-dispatches to one-slice AnimTask_DigEndBounceMovementSetInvisible at age 194",
      ],
      unleash: [
        "AnimTask_DigUpMovement(FALSE) self-dispatches to one-slice AnimTask_DigSetVisibleUnderground at age 7",
        "AnimTask_DigUpMovement(TRUE) self-dispatches to resident AnimTask_DigRiseUpFromHole at age 14..27",
      ],
    },
    setup, unleash, topology: probe.topology,
    retainedSurface: { cursorAndWaits: true, dirtMoundAndAllDirtPlumes: true, affineOamMatrices: true,
      digDownUpBounceRiseVisibility: true, scanlineBgMonbgStatic: true, impactAndShakeMon: true,
      tagsResourcesAudio: true, rngSeparationAndImmutableGameplay: true, firstInactiveCleanup: true },
  };
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, path.map), mapBytes);
  else invariant(readFileSync(resolve(root, path.map)).equals(mapBytes), `${side}: normalized change map drift`);
  invariant(sha(json) === path.repeatProbeJsonSha256, `${side}: fresh JSON receipt mismatch`);
  invariant(rgb.sequenceSha256 === path.repeatRawRgbSequenceSha256, `${side}: fresh RGB receipt mismatch`);
  return {
    scenario: path.scenario, scenarioSha256: sha(readFileSync(resolve(root, path.scenario))),
    denseState: path.dense, denseStateSha256: sha(compressed), probeJsonSha256: sha(json),
    repeatProbeJsonSha256: path.repeatProbeJsonSha256, twiceFreshByteIdentical: sha(json) === path.repeatProbeJsonSha256,
    rawRgbArchive: path.rgb, rawRgbArchiveSha256: rgb.archiveSha256, rawRgbSequenceSha256: rgb.sequenceSha256,
    repeatRawRgbSequenceSha256: path.repeatRawRgbSequenceSha256, rawRgbTwiceFreshByteIdentical: rgb.sequenceSha256 === path.repeatRawRgbSequenceSha256,
    changeMap: path.map, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow, bodyWindows: probe.bodyWindows,
    denseRows: rows.length, summary: { setup, unleash }, topology: probe.topology,
  };
}

function build(writeMaps: boolean): Json {
  const player = verifySide("player-back", writeMaps);
  const opponent = verifySide("opponent-front", writeMaps);
  invariant(player.twiceFreshByteIdentical && player.rawRgbTwiceFreshByteIdentical
    && opponent.twiceFreshByteIdentical && opponent.rawRgbTwiceFreshByteIdentical, "twice-fresh evidence drift");
  return {
    schema: "dig-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_DIG", moveId: 91,
    status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { legalPartyBeforeInit: true, sourceProvenLevel50Carrier: "FRONTIER_MON_VIBRAVA set-132",
      completeTwoTurnBodies: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedChangeMaps: true,
      twiceFreshByteIdentical: true, reducerAdded: false, typedSceneOnSeamAdded: false, compositorAdded: false,
      framebufferCompared: false, productionAnimationChanged: false, gameplayStateOwned: false, coveragePromotion: false,
      componentTrackFulfilled: false, boundaryOrBarrierChanged: false, latchLedgerChanged: false },
    source: { range: sourceRange, setupCursor: "DigSetUp", unleashCursor: "DigUnleash", components: [
      "DIRT_MOUND", "MUD_SAND", "IMPACT", "DigDown", "DigUp", "DigBounce", "DigRise", "ShakeMon", "monbg_static", "clearmonbg_static",
    ] },
    acceptance: { freshRunsPerOrientation: 2, setupRows: 195, unleashRows: 68, totalRowsPerOrientation: 263,
      firstInactiveCleanupRetained: true, sourceControlledContinuation: "Normal A-controller selections choose Dig on turn one; the ROM's HITMARKER_CHARGING route dispatches the second-turn Dig body without transient staging.",
      latchScope: "Dig-only maps: OAM/matrix predecessor transfer, setup palette 193/194 predecessor with no other rows, unleash palette 67/67 predecessor, and separate scanline/visibility witnesses. No sibling latch transfer." },
    orientations: { "player-back": player, "opponent-front": opponent },
    acceptanceVerdict: "Evidence only: MOVE_DIG remains coverage-absent/unsupported and dirt-plume-fissure-dig remains unfulfilled until a source-relative reducer, narrow shared seam, generic live compositor, and complete bilateral actual-core framebuffer proof land.",
  };
}

const fixturePath = resolve(root, "tools/compare/fixtures/dig-evidence.json");
if (process.argv.includes("--write")) {
  const fixture = build(true);
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const current = build(false);
invariant(same(fixture, current), "Dig fixture drift");
console.log(JSON.stringify({
  schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit,
  orientations: Object.fromEntries(Object.entries(fixture.orientations).map(([side, item]: [string, any]) => [side, {
    bodyWindows: item.bodyWindows, denseRows: item.denseRows, probeJsonSha256: item.probeJsonSha256,
    rawRgbSequenceSha256: item.rawRgbSequenceSha256, changeMapSha256: item.changeMapSha256,
    twiceFreshByteIdentical: item.twiceFreshByteIdentical && item.rawRgbTwiceFreshByteIdentical,
  }])),
  boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false, latchLedgerChanged: false },
}, null, 2));
