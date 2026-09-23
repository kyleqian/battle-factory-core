/** Hermetic verifier and compact normalized-map writer for MOVE_CURSE evidence.
 *
 * Dense semantic JSON and chronological RGB are intentionally scratch inputs
 * to --write-map.  The committed receipt and maps retain their hashes plus
 * source-relative latches, resources, registers/BG/OAM/matrix/palette
 * transfer facts, allocator/order, audio, RNG domains, opaque state, and
 * first-inactive cleanup without bundling the large raw captures.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type Branch = "ghost" | "stats";
type OrientationKey = `${Branch}-${Side}`;

const root = resolve(import.meta.dirname, "../..");
const MOVE = 174;
const SCRIPT_START = 0x082d3bf2;
const SCRIPT_END = 0x082d3cb2;
const NAIL_TAG = 10199;
const GHOST_TAG = 10200;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const stable = (value: unknown): string => JSON.stringify(value);
const same = (a: unknown, b: unknown): boolean => stable(a) === stable(b);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`Curse evidence drift: ${message}`);
}

const fixturePath = resolve(root, "tools/compare/fixtures/curse-evidence.json");

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0;
  let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1]
      && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function rgbFrames(directory: string, rows: readonly Json[]): Buffer[] {
  return rows.map((row) => {
    const path = resolve(directory, `${String(row.frame).padStart(5, "0")}.rgb`);
    invariant(existsSync(path), `missing raw RGB row ${path}`);
    const rgb = readFileSync(path);
    invariant(rgb.length === 240 * 160 * 3, `RGB row ${row.frame} shape`);
    invariant(sha(rgb) === row.sha256, `RGB row ${row.frame} hash`);
    return rgb;
  });
}

function ownedTask(task: Json): boolean {
  return [
    "AnimTask_CurseStretchingBlackBg", "AnimTask_CurseStretchingBlackBg_Step1", "AnimTask_CurseStretchingBlackBg_Step2",
    "AnimTask_DrawFallingWhiteLinesOnAttacker", "AnimTask_DrawFallingWhiteLinesOnAttacker_Step",
    "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step", "AnimTask_SwayMon", "AnimTask_SwayMonStep",
    "AnimTask_BlendColorCycleLoop", "AnimTask_BlendColorCycleByTagLoop",
    "AnimSimplePaletteBlend_Step", "Task_UpdateMonBg", "Task_ClearMonBg",
  ].includes(task.func?.symbol);
}

function ownedSprite(sprite: Json): boolean {
  return [
    "gCurseNailSpriteTemplate", "gCurseGhostSpriteTemplate", "gSimplePaletteBlendSpriteTemplate",
  ].includes(sprite.template?.symbol)
    || ["AnimCurseNail_End", "AnimCurseNail_Step1", "AnimCurseNail_Step2", "AnimGhostStatusSprite", "AnimGhostStatusSprite_Step", "AnimSimplePaletteBlend_Step"].includes(sprite.callback?.symbol);
}

function projectSprite(sprite: Json): Json {
  return {
    slot: sprite.slot, template: sprite.template?.symbol ?? null, callback: sprite.callback?.symbol ?? null,
    attr: sprite.attr, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, animNum: sprite.animNum,
    animCmdIndex: sprite.animCmdIndex, flags: sprite.flags, invisible: sprite.invisible, subpriority: sprite.subpriority,
  };
}

function bufferHashes(row: Json): Json {
  return {
    softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)),
    softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)),
    fadedPalette: sha(JSON.stringify(row.fadedPalette)), unfadedPalette: sha(JSON.stringify(row.unfadedPalette)),
    hardwarePalette: sha(JSON.stringify(row.hardwarePalette)),
  };
}

function audioSummary(row: Json): Json {
  return Object.fromEntries(["SE1", "SE2"].map((channel) => {
    const value = row.audio[channel];
    return [channel, {
      symbol: value.songHeaderIdentity?.symbol ?? null, status: value.status,
      panX: value.tracks.map((track: Json) => track.panX),
      rawSha256: sha(JSON.stringify(value)),
    }];
  }));
}

function stateSummary(row: Json): Json {
  return {
    partiesSha256: sha(JSON.stringify(row.parties)), battlersSha256: sha(JSON.stringify(row.battlers)),
    engineSha256: sha(JSON.stringify(row.engine)), immutableState: row.immutableState,
    rawBattleStateSha256: sha(JSON.stringify(row.rawBattleState)), gameplayRng: row.immutableState?.rngValue,
  };
}

function normalizedMap(probe: Json, rgb: readonly Buffer[], branch: Branch, side: Side, scenario: string): Json {
  const rows = probe.frames as Json[];
  const rowMaps = rows.map((row, age) => {
    const previous = rows[age - 1];
    return {
      age, frame: row.frame,
      source: {
        active: row.animScriptActive, owner: row.scriptOwner, pointer: row.scriptPtr,
        parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait,
        args: row.animArgs, movePower: row.animationMovePower, moveDamage: row.animationMoveDamage,
      },
      tasks: row.tasks.filter(ownedTask).map((task: Json) => ({ slot: task.slot, func: task.func?.symbol ?? null, data: task.data })),
      sprites: row.sprites.filter(ownedSprite).map(projectSprite),
      resources: {
        paletteTags: row.paletteTags, tileTags: row.tileTags,
        allocator: row.resourceAllocators ? {
          matrixBitmap: row.resourceAllocators.matrixBitmap,
          tileBitmapSha256: sha(row.resourceAllocators.tileBitmap),
          tileRangesSha256: sha(JSON.stringify(row.resourceAllocators.tileRanges)),
          reservedPaletteCount: row.resourceAllocators.reservedPaletteCount,
          reservedTileCount: row.resourceAllocators.reservedTileCount,
        } : null,
      },
      paletteRegistersBg: {
        buffers: bufferHashes(row), registers: row.registers, bgVram: row.bgVram,
        battleBg: row.battleBg, scanline: row.scanline ?? null,
        scanlineBuffersSha256: row.scanlineBuffers ? sha(JSON.stringify(row.scanlineBuffers)) : null,
      },
      oamMatrices: {
        softwareOamCount: row.softwareOam.length, hardwareOamCount: row.hardwareOam.length,
        softwareMatricesCount: row.softwareMatrices.length, hardwareMatricesCount: row.hardwareMatrices.length,
        hardwareOamEqualsPrecedingSoftware: age > 0 && same(row.hardwareOam, previous!.softwareOam),
        hardwareMatricesEqualsPrecedingSoftware: age > 0 && same(row.hardwareMatrices, previous!.softwareMatrices),
        hardwarePaletteEqualsPrecedingFaded: age > 0 && same(row.hardwarePalette, previous!.fadedPalette),
      },
      order: row.spriteOrder,
      audio: audioSummary(row), animationRng: row.animationRng,
      state: stateSummary(row),
      rgb: { sha256: row.sha256, ...changedPixels(rgb[age - 1], rgb[age]) },
    };
  });
  const taskAges = (name: string): number[] => rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func?.symbol === name) ? [age] : []);
  const spriteAges = (name: string): number[] => rows.flatMap((row, age) => row.sprites.some((sprite: Json) => sprite.template?.symbol === name || sprite.callback?.symbol === name) ? [age] : []);
  const transitions = (value: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age === 0 || !same(value(row), value(rows[age - 1]!)) ? [age] : []);
  const transitionsAfterFirst = (value: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age > 0 && !same(value(row), value(rows[age - 1]!)) ? [age] : []);
  const stable = (key: string): boolean => rows.every((row) => same(row[key], rows[0]![key]));
  const last = rows.at(-1)!;
  return {
    schema: "curse-normalized-change-map/v1", oracleProfile: "battle-scene-on", move: "MOVE_CURSE", branch, side, scenario,
    sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract,
    sourceRows: rows.map((row, age) => ({ age, frame: row.frame, active: row.animScriptActive, owner: row.scriptOwner, pointer: row.scriptPtr, parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait, sha256: row.sha256 })),
    topology: probe.topology,
    lifetimes: {
      tasks: Object.fromEntries(["AnimTask_CurseStretchingBlackBg", "AnimTask_CurseStretchingBlackBg_Step1", "AnimTask_CurseStretchingBlackBg_Step2", "AnimTask_DrawFallingWhiteLinesOnAttacker", "AnimTask_DrawFallingWhiteLinesOnAttacker_Step", "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step", "AnimTask_SwayMon", "AnimTask_SwayMonStep", "AnimTask_BlendColorCycleLoop", "AnimTask_BlendColorCycleByTagLoop", "AnimSimplePaletteBlend_Step", "Task_UpdateMonBg", "Task_ClearMonBg"].map((name) => [name, taskAges(name)])),
      sprites: Object.fromEntries(["gCurseNailSpriteTemplate", "gCurseGhostSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"].map((name) => [name, spriteAges(name)])),
      resourceTagTransitions: { paletteTags: transitions((row) => row.paletteTags), tileTags: transitions((row) => row.tileTags), matrixBitmap: transitions((row) => row.resourceAllocators?.matrixBitmap) },
      registerTransitions: transitions((row) => row.registers), bgVramTransitions: transitions((row) => row.bgVram),
      paletteTransitions: { faded: transitions((row) => row.fadedPalette), unfaded: transitions((row) => row.unfadedPalette), hardware: transitions((row) => row.hardwarePalette) },
    },
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${rowMaps.slice(1).filter((row) => row.oamMatrices.hardwareOamEqualsPrecedingSoftware).length}/${Math.max(0, rows.length - 1)}`,
      hardwareMatricesEqualsPrecedingSoftware: `${rowMaps.slice(1).filter((row) => row.oamMatrices.hardwareMatricesEqualsPrecedingSoftware).length}/${Math.max(0, rows.length - 1)}`,
      hardwarePaletteEqualsPrecedingFaded: `${rowMaps.slice(1).filter((row) => row.oamMatrices.hardwarePaletteEqualsPrecedingFaded).length}/${Math.max(0, rows.length - 1)}`,
      sameRowExceptions: rowMaps.flatMap((row, age) => age > 0 && !row.oamMatrices.hardwarePaletteEqualsPrecedingFaded ? [age] : []),
      measuredFromThisMap: true,
    },
    audio: {
      songHeaders: [...new Set(rows.flatMap((row) => [row.audio.SE1.symbol, row.audio.SE2.symbol].filter(Boolean)))],
      activeRows: rows.flatMap((row, age) => row.soundTaskCount > 0 ? [age] : []),
    },
    rng: {
      gameplayValues: [...new Set(rows.map((row) => row.immutableState.rngValue))],
      animationTransitions: transitions((row) => row.animationRng),
      animationDistinct: new Set(rows.map((row) => row.animationRng)).size,
    },
    state: {
      partiesStable: stable("parties"), battlersStable: stable("battlers"), engineStable: stable("engine"),
      immutableStable: stable("immutableState"), rawBattleStateStable: stable("rawBattleState"), gameplayRngTransitions: transitionsAfterFirst((row) => row.immutableState.rngValue),
    },
    cleanup: {
      age: rows.length - 1, frame: last.frame, active: last.animScriptActive, visualTasks: last.visualTaskCount, soundTasks: last.soundTaskCount,
      ownedTasks: last.tasks.filter(ownedTask).length, ownedSprites: last.sprites.filter(ownedSprite).length,
      nailTag: last.paletteTags.includes(NAIL_TAG) || last.tileTags.includes(NAIL_TAG), ghostTag: last.paletteTags.includes(GHOST_TAG) || last.tileTags.includes(GHOST_TAG),
      zeroOwnedCleanup: last.tasks.filter(ownedTask).length === 0 && last.sprites.filter(ownedSprite).length === 0,
    },
    rows: rowMaps,
  };
}

function loadProbe(path: string): Json {
  const bytes = readFileSync(resolve(root, path));
  return JSON.parse(bytes.toString("utf8")) as Json;
}

export function writeCurseMap(densePath: string, rgbDir: string, side: Side, branch: Branch, mapPath: string, scenario: string): Json {
  const bytes = readFileSync(resolve(root, densePath));
  const probe = JSON.parse(bytes.toString("utf8")) as Json;
  invariant(probe.schema === "curse-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === MOVE, `${side}/${branch}: dense identity`);
  const rgb = rgbFrames(resolve(root, rgbDir), probe.frames as Json[]);
  const map = normalizedMap(probe, rgb, branch, side, scenario);
  writeFileSync(resolve(root, mapPath), `${JSON.stringify(map, null, 2)}\n`);
  return { mapPath, mapSha256: sha(JSON.stringify(map, null, 2) + "\n"), denseJsonSha256: sha(bytes), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), sourceWindow: probe.sourceWindow, rows: probe.frames.length };
}

function verifyMap(record: Json): Json {
  const map = JSON.parse(readFileSync(resolve(root, record.map), "utf8")) as Json;
  const text = readFileSync(resolve(root, record.map), "utf8");
  invariant(sha(text) === record.mapSha256, `${record.key}: map digest`);
  invariant(map.schema === "curse-normalized-change-map/v1" && map.oracleProfile === "battle-scene-on" && map.move === "MOVE_CURSE", `${record.key}: map identity`);
  invariant(map.branch === record.branch && map.side === record.side, `${record.key}: branch/orientation`);
  const rows = map.rows as Json[];
  invariant(rows.length === record.rows && map.sourceRows.length === rows.length, `${record.key}: row count`);
  invariant(map.sourceWindow.frameCount === rows.length && rows[0]!.source.pointer >= SCRIPT_START && rows[0]!.source.pointer < SCRIPT_END, `${record.key}: source bounds`);
  invariant(rows.every((row) => row.source.pointer >= SCRIPT_START && row.source.pointer < SCRIPT_END && row.source.owner === "Move_CURSE"), `${record.key}: pointer ownership`);
  invariant(rows[0]!.source.active === true && rows.at(-1)!.source.active === false, `${record.key}: active cleanup boundary`);
  invariant(rows.every((row) => row.oamMatrices.softwareOamCount === 128 && row.oamMatrices.hardwareOamCount === 128 && row.oamMatrices.softwareMatricesCount === 32 && row.oamMatrices.hardwareMatricesCount === 32), `${record.key}: OAM/matrix shape`);
  invariant(rows.every((row) => row.paletteRegistersBg.buffers.fadedPalette && row.paletteRegistersBg.buffers.hardwarePalette && row.paletteRegistersBg.registers && row.paletteRegistersBg.bgVram), `${record.key}: palette/register/BG retention`);
  invariant(rows.every((row) => row.resources.paletteTags.length === 16 && row.resources.tileTags.length === 128 && row.order.length === 64), `${record.key}: resources/order shape`);
  invariant(rows.every((row) => row.audio.SE1 && row.audio.SE2 && Number.isInteger(row.animationRng) && row.state.rawBattleStateSha256), `${record.key}: audio/RNG/state retention`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.immutableStable && map.state.rawBattleStateStable && map.state.gameplayRngTransitions.length === 0, `${record.key}: gameplay stability`);
  invariant(map.cleanup.zeroOwnedCleanup && map.cleanup.active === false && map.cleanup.ownedTasks === 0 && map.cleanup.ownedSprites === 0, `${record.key}: zero-owned cleanup`);
  if (record.branch === "ghost") {
    invariant(map.topology.templates.includes("gCurseNailSpriteTemplate") && map.topology.templates.includes("gCurseGhostSpriteTemplate"), `${record.key}: Ghost templates`);
    invariant(map.lifetimes.tasks.AnimTask_CurseStretchingBlackBg_Step1.length > 0 && map.lifetimes.sprites.gCurseNailSpriteTemplate.length > 0 && map.lifetimes.sprites.gCurseGhostSpriteTemplate.length > 0, `${record.key}: Ghost lifecycles`);
  } else {
    invariant(map.lifetimes.tasks.AnimTask_DrawFallingWhiteLinesOnAttacker_Step.length > 0, `${record.key}: stat falling lines`);
    invariant(map.topology.callbacks.includes("AnimSimplePaletteBlend_Step") || map.topology.tasks.includes("AnimTask_BlendColorCycleLoop") || map.topology.tasks.includes("AnimTask_BlendColorCycleByTagLoop"), `${record.key}: stat palette lifecycle`);
  }
  return { rows: rows.length, mapSha256: record.mapSha256, sourceWindow: map.sourceWindow, cleanup: map.cleanup, latches: map.latches };
}

export function verifyCurseEvidence(): Json {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
  invariant(fixture.schema === "curse-bilateral-evidence/v1" && fixture.oracleProfile === "battle-scene-on" && fixture.move === "MOVE_CURSE" && fixture.status === "unsupported-evidence" && fixture.coverageCredit === false, "fixture identity");
  invariant(fixture.graphComponents === 16 && fixture.representatives.length === 1 && fixture.representatives[0] === "MOVE_CURSE", "graph/representative boundary");
  invariant(fixture.twiceFreshByteIdentical === true && fixture.denseRetainedInScratch === true && fixture.rawRgbRetainedInScratch === true, "fresh/scratch boundary");
  invariant(fixture.boundary.productionChanged === false && fixture.boundary.reducerAdded === false && fixture.boundary.typedSceneOnSeam === false && fixture.boundary.compositorAdded === false && fixture.boundary.coveragePromotion === false && fixture.boundary.componentTrackFulfilled === false && fixture.boundary.gameplayStateOwned === false, "unsupported no-credit boundary");
  const output: Json = {};
  for (const key of ["ghost-player-back", "ghost-opponent-front", "stats-player-back", "stats-opponent-front"] as OrientationKey[]) {
    const record = fixture.windows[key];
    invariant(record.twiceFreshByteIdentical && record.firstInactiveCleanup && record.denseRetainedInScratch && record.rawRgbRetainedInScratch, `${key}: retention contract`);
    output[key] = verifyMap({ ...record, key });
  }
  invariant(Object.keys(output).length === 4, "four windows");
  return { schema: "curse-evidence-verifier/v1", move: "MOVE_CURSE", windows: output, noCredit: true };
}

const args = process.argv.slice(2);
if (args[0] === "--write-map") {
  const [dense, rgb, side, branch, map, scenario] = args.slice(1);
  if (!dense || !rgb || !side || !branch || !map || !scenario) throw new Error("usage: curseEvidence.ts --write-map <dense.json> <rgb-dir> <side> <ghost|stats> <map.json> <scenario.json>");
  console.log(JSON.stringify(writeCurseMap(dense, rgb, side as Side, branch as Branch, map, scenario), null, 2));
} else {
  console.log(JSON.stringify(verifyCurseEvidence(), null, 2));
}
