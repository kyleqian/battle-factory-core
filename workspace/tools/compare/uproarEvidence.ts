/** Strict verifier for the retained unsupported MOVE_UPROAR evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/uproar-evidence.json"), "utf8")) as Json;
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const START = 0x082cdafc;
const END = 0x082cdbc6;
const MOVE = 253;
const RING_TAG = 10203;
const NOTE_TAG = 10225;
const RING = "gUproarRingSpriteTemplate";
const NOTE = "gJaggedMusicNoteSpriteTemplate";
const DISTORTION = "AnimTask_UproarDistortion_Step";

function sequence(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function ranges(ages: number[]): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (const age of ages) {
    const last = result.at(-1);
    if (!last || age !== last[1] + 1) result.push([age, age]);
    else last[1] = age;
  }
  return result;
}

function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age > 0 && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}

function taskAges(rows: Json[], symbol: string): Array<[number, number]> {
  return ranges(rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func?.symbol === symbol) ? [age] : []));
}

function projectSprite(sprite: Json): Json {
  return {
    slot: sprite.slot, callback: sprite.callback?.symbol, template: sprite.template?.symbol,
    attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    data: sprite.data, matrixNum: sprite.matrixNum, matrix: sprite.matrix,
    subpriority: sprite.subpriority, invisible: sprite.invisible,
  };
}

function lifecycles(rows: Json[], template: string): Json[] {
  const lives: Json[] = [];
  let previous = new Map<number, Json>();
  rows.forEach((row, age) => {
    const current = new Map<number, Json>(row.sprites
      .filter((sprite: Json) => sprite.template?.symbol === template)
      .map((sprite: Json) => [sprite.slot, sprite]));
    for (const [slot, sprite] of current) {
      if (!previous.has(slot)) lives.push({ slot, start: age, end: null, first: projectSprite(sprite) });
    }
    for (const life of lives) {
      if (life.end === null && previous.has(life.slot) && !current.has(life.slot)) life.end = age - 1;
    }
    previous = current;
  });
  for (const life of lives) if (life.end === null) life.end = rows.length - 1;
  return lives;
}

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

function rgbFrames(archive: string, rows: Json[]): Buffer[] {
  const scratch = createScratchDir("pokebench-uproar-rgb-");
  execFileSync("tar", ["-xzf", archive, "-C", scratch]);
  return rows.map((row, age) => {
    const rgb = readFileSync(join(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    invariant(rgb.length === 240 * 160 * 3, `${archive}: RGB row ${age} shape`);
    invariant(sha(rgb) === row.sha256, `${archive}: RGB row ${age} hash`);
    return rgb;
  });
}

function normalizedMap(side: Side, probe: Json, rgb: Buffer[]): string {
  const rows = probe.frames as Json[];
  const rings = lifecycles(rows, RING).map((life) => ({
    slot: life.slot, start: life.start, end: life.end, first: life.first,
    painterOrder: rows[life.start]!.spriteOrder.indexOf(life.slot),
  }));
  const notes = lifecycles(rows, NOTE).map((life) => ({
    slot: life.slot, start: life.start, end: life.end, first: life.first,
    painterOrder: rows[life.start]!.spriteOrder.indexOf(life.slot),
  }));
  const rowMaps = rows.map((row, age) => ({
    age, frame: row.frame, owner: row.scriptOwner, pointer: row.scriptPtr,
    parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait,
    active: row.animScriptActive, visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
    ...changedPixels(rgb[age - 1], rgb[age]),
    tasks: row.tasks.filter((task: Json) => [DISTORTION, "Task_UpdateMonBg", "Task_ClearMonBg"].includes(task.func?.symbol))
      .map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => [RING, NOTE].includes(sprite.template?.symbol)).map(projectSprite),
    animationOrder: row.spriteOrder.filter((slot: number) => [3, 4, 5].includes(slot)),
    allocator: {
      ringPaletteSlot: row.paletteTags.indexOf(RING_TAG), notePaletteSlot: row.paletteTags.indexOf(NOTE_TAG),
      ringTileSlot: row.tileTags.indexOf(RING_TAG), noteTileSlot: row.tileTags.indexOf(NOTE_TAG),
      matrixBitmap: row.resourceAllocators.matrixBitmap,
      tileBitmap: row.resourceAllocators.tileBitmap,
    },
    palette: {
      fadedChanged: age > 0 && !same(row.fadedPalette, rows[age - 1]!.fadedPalette),
      hardwareChanged: age > 0 && !same(row.hardwarePalette, rows[age - 1]!.hardwarePalette),
      unfadedChanged: age > 0 && !same(row.unfadedPalette, rows[age - 1]!.unfadedPalette),
    },
    displayTransfer: age === 0 ? null : {
      oam: same(row.hardwareOam, rows[age - 1]!.softwareOam),
      matrix: same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices),
      palette: same(row.hardwarePalette, rows[age - 1]!.fadedPalette),
    },
    monbg: {
      update: row.tasks.some((task: Json) => task.func?.symbol === "Task_UpdateMonBg"),
      clear: row.tasks.some((task: Json) => task.func?.symbol === "Task_ClearMonBg"),
    },
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, {
      symbol: row.audio[channel].songHeaderIdentity.symbol,
      status: row.audio[channel].status,
      panX: row.audio[channel].tracks.map((track: Json) => track.panX),
    }])),
    registers: row.registers,
    bgVram: row.bgVram,
  }));
  const map = {
    schema: "uproar-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    sourceRows: rows.map((row, age) => ({
      age, frame: row.frame, owner: row.scriptOwner, pointer: row.scriptPtr,
      parity: row.scriptPtrParity, offset: row.scriptOffset, active: row.animScriptActive, sha256: row.sha256,
    })),
    lifetimes: {
      distortion: { task: DISTORTION, taskRanges: taskAges(rows, DISTORTION) },
      rings, notes,
      resources: {
        ringTag: { tag: "ANIM_TAG_THIN_RING", tagValue: RING_TAG, paletteLiveAges: [4, 71], cleanupAge: 72 },
        noteTag: { tag: "ANIM_TAG_JAGGED_MUSIC_NOTE", tagValue: NOTE_TAG, paletteLiveAges: [1, 71], cleanupAge: 72 },
        matrixBitmap: transitions(rows, (row) => row.resourceAllocators.matrixBitmap),
      },
      monbg: {
        updateTaskRanges: taskAges(rows, "Task_UpdateMonBg"), clearTaskRanges: taskAges(rows, "Task_ClearMonBg"),
        bgVramChanges: transitions(rows, (row) => row.bgVram), registerChanges: transitions(rows, (row) => row.registers),
      },
      palette: {
        faded: transitions(rows, (row) => row.fadedPalette),
        hardware: transitions(rows, (row) => row.hardwarePalette),
        unfaded: transitions(rows, (row) => row.unfadedPalette),
      },
      displayTransfer: {
        hardwareOamEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length}/${rows.length - 1}`,
        hardwareMatricesEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length}/${rows.length - 1}`,
        hardwarePaletteEqualsPrecedingFaded: `${rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length}/${rows.length - 1}`,
      },
    },
    audio: {
      pulseAges: rows.flatMap((row, age) => row.audio.SE1.status === 0 ? [age] : []),
      playerPanX: rows[10]!.audio.SE1.tracks.map((track: Json) => track.panX),
    },
    rng: {
      gameplayValues: [...new Set(rows.map((row) => row.immutableState.rngValue))],
      animationDistinct: new Set(rows.map((row) => row.animationRng)).size,
      animationTransitions: transitions(rows, (row) => row.animationRng),
    },
    state: {
      partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)),
      battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)),
      controllerEngineStable: rows.every((row) => same(row.engine, rows[0]!.engine)),
      rawBattleStateStable: rows.every((row) => same(row.rawBattleState, rows[0]!.rawBattleState)),
    },
    cleanup: {
      age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive,
      visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount,
      ringSprites: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template?.symbol === RING).length,
      noteSprites: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template?.symbol === NOTE).length,
      ringTag: rows.at(-1)!.paletteTags.includes(RING_TAG), noteTag: rows.at(-1)!.paletteTags.includes(NOTE_TAG),
    },
    rows: rowMaps,
  };
  return `${JSON.stringify(map, null, 2)}\n`;
}

function verifyOrientation(side: Side, contract: Json): Json {
  const paths: Array<[string, string]> = [
    [contract.scenario, contract.scenarioSha256], [contract.denseState, contract.denseStateSha256],
    [contract.rawRgbArchive, contract.rawRgbArchiveSha256],
  ];
  if (!process.argv.includes("--write-maps")) paths.push([contract.changeMap, contract.changeMapSha256]);
  for (const [path, digest] of paths) invariant(sha(readFileSync(resolve(root, path))) === digest, `${side}: digest drift ${path}`);
  invariant(contract.probeJsonSha256 === contract.repeatProbeJsonSha256, `${side}: fresh semantic JSON drift`);
  invariant(contract.rawRgbSequenceSha256 === contract.repeatRawRgbSequenceSha256, `${side}: fresh RGB sequence drift`);

  const json = gunzipSync(readFileSync(resolve(root, contract.denseState)));
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(sha(json) === contract.probeJsonSha256, `${side}: dense JSON digest drift`);
  invariant(probe.schema === "uproar-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === MOVE, `${side}: probe identity drift`);
  invariant(same(probe.sourceWindow, contract.sourceWindow) && rows.length === 73, `${side}: complete dense window drift`);
  invariant(rows.every((row, age) => row.frame === rows[0]!.frame + age && row.scriptOwner === "Move_UPROAR"
    && row.scriptPtr >= START && row.scriptPtr < END && row.scriptPtrParity === (row.scriptPtr & 1)
    && row.scriptOffset === row.scriptPtr - START), `${side}: source pointer row drift`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive === true
    && rows.at(-1)!.animScriptActive === false && rows.at(-1)!.scriptOffset === 201, `${side}: entry/cleanup boundary drift`);
  invariant(same(probe.sourcePointerContract, {
    start: START, endExclusive: END,
    observedAddresses: [START, START + 3, START + 6, START + 8, START + 72, START + 136, START + 198, START + 201],
    observedParities: [0, 1],
  }), `${side}: source pointer contract drift`);
  invariant(Object.values(probe.sourceSymbols).includes(START) && Object.values(probe.sourceSymbols).includes(END), `${side}: source symbols drift`);

  for (const row of rows) {
    invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128
      && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
      && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
      && row.paletteTags.length === 16 && row.tileTags.length === 128
      && row.parties.player.length === 3 && row.parties.opponent.length === 3, `${side}: retained shape drift`);
    invariant(row.resourceAllocators?.tileRanges?.length === 64 && row.resourceAllocators.tileBitmap.length === 256
      && Number.isInteger(row.resourceAllocators.matrixBitmap), `${side}: allocator state missing`);
  }

  invariant(same(taskAges(rows, DISTORTION), [[10, 21], [28, 39], [46, 57]])
    && same(taskAges(rows, "Task_UpdateMonBg"), [[7, 65]])
    && same(taskAges(rows, "Task_ClearMonBg"), [[63, 65]]), `${side}: task lifetimes drift`);
  invariant(rows.flatMap((row) => row.tasks.map((task: Json) => task.func?.symbol))
    .every((symbol: string) => [DISTORTION, "Task_UpdateMonBg", "Task_ClearMonBg"].includes(symbol)), `${side}: unexpected task owner`);
  invariant(same(lifecycles(rows, RING).map((life) => [life.slot, life.start, life.end]), [[3, 10, 25], [3, 28, 43], [3, 46, 61]]), `${side}: ring lifecycles drift`);
  invariant(same(lifecycles(rows, NOTE).map((life) => [life.slot, life.start, life.end]), [[4, 10, 25], [5, 10, 25], [4, 28, 43], [5, 28, 43], [4, 46, 61], [5, 46, 61]]), `${side}: note lifecycles drift`);
  const pulseAges = [10, 28, 46];
  invariant(rows.flatMap((row, age) => row.sprites.some((sprite: Json) => [RING, NOTE].includes(sprite.template?.symbol)) ? [age] : [])
    .every((age) => pulseAges.some((start) => age >= start && age <= start + 15)), `${side}: pulse sprite rows drift`);
  invariant(rows.flatMap((row, age) => row.audio.SE1.status === 0 ? [age] : []).join(",") === "10,28,46", `${side}: three audio pulses drift`);
  const pan = side === "player-back" ? -64 : 63;
  for (const age of pulseAges) invariant(rows[age]!.audio.SE1.songHeaderIdentity.symbol === "se_m_uproar"
    && rows[age]!.audio.SE1.tracks[0]!.panX === pan, `${side}: Uproar audio pan drift at ${age}`);

  const ringLive = rows.map((row) => row.paletteTags.includes(RING_TAG) && row.tileTags.includes(RING_TAG));
  const noteLive = rows.map((row) => row.paletteTags.includes(NOTE_TAG) && row.tileTags.includes(NOTE_TAG));
  invariant(same(ringLive.flatMap((live, age) => live ? [age] : []), sequence(4, 71))
    && same(noteLive.flatMap((live, age) => live ? [age] : []), sequence(1, 71)), `${side}: asset tag lifetime drift`);
  invariant(same(transitions(rows, (row) => row.paletteTags), [1, 4, 72])
    && same(transitions(rows, (row) => row.tileTags), [1, 4, 72]), `${side}: resource tag transfer drift`);
  invariant(same(transitions(rows, (row) => row.resourceAllocators.matrixBitmap), [10, 26, 28, 44, 46, 62]), `${side}: matrix allocator lifetime drift`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: OAM predecessor latch drift`);
  const matrixMatch = rows.slice(1).flatMap((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices) ? [age + 1] : []);
  invariant(same(matrixMatch, [...sequence(1, 10), ...sequence(23, 28), ...sequence(41, 46), ...sequence(59, 72)]), `${side}: matrix predecessor latch drift`);
  const paletteMatch = rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [age + 1] : []);
  invariant(same(paletteMatch, sequence(1, 72).filter((age) => age !== 7)), `${side}: palette predecessor latch drift`);
  invariant(same(transitions(rows, (row) => row.fadedPalette), [1, 4, 7, 10])
    && same(transitions(rows, (row) => row.hardwarePalette), [2, 5, 7, 11])
    && same(transitions(rows, (row) => row.unfadedPalette), [1, 4, 7]), `${side}: palette transfer schedule drift`);
  invariant(same(transitions(rows, (row) => row.bgVram), [8, 65, 67])
    && same(transitions(rows, (row) => row.registers), [1, 8, 67]), `${side}: BG/register schedule drift`);
  invariant(rows.every((row) => row.spriteOrder.length === 64 && new Set(row.spriteOrder).size === 64), `${side}: allocator order shape drift`);
  for (const [start, order] of [[10, [3, 4, 5]], [28, [3, 5, 4]], [46, [3, 5, 4]]] as const) {
    for (let age = start; age <= start + 15; age += 1) invariant(same(rows[age]!.spriteOrder.filter((slot: number) => [3, 4, 5].includes(slot)), order), `${side}: sprite allocator order drift at ${age}`);
  }

  const stableKeys = ["parties", "battlers", "engine", "immutableState", "rawBattleState"];
  for (const key of stableKeys) {
    const baseline = JSON.stringify(rows[0]![key]);
    invariant(rows.every((row) => JSON.stringify(row[key]) === baseline), `${side}: ${key} changed during presentation`);
  }
  invariant(rows.every((row) => row.engine.currentMove === MOVE), `${side}: controller move synchronization drift`);
  invariant(new Set(rows.map((row) => row.immutableState.rngValue)).size === 1
    && same(transitions(rows, (row) => row.animationRng), [...sequence(1, 64), ...sequence(67, 72)])
    && new Set(rows.map((row) => row.animationRng)).size === 71, `${side}: RNG-domain drift`);
  invariant(rows.at(-1)!.tasks.length === 0 && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0
    && !rows.at(-1)!.sprites.some((sprite: Json) => [RING, NOTE].includes(sprite.template?.symbol))
    && !rows.at(-1)!.paletteTags.includes(RING_TAG) && !rows.at(-1)!.paletteTags.includes(NOTE_TAG)
    && !rows.at(-1)!.tileTags.includes(RING_TAG) && !rows.at(-1)!.tileTags.includes(NOTE_TAG), `${side}: first inactive cleanup drift`);

  const rgb = rgbFrames(resolve(root, contract.rawRgbArchive), rows);
  const rgbSequence = Buffer.concat(rgb);
  invariant(sha(rgbSequence) === contract.rawRgbSequenceSha256, `${side}: RGB sequence digest drift`);
  const map = normalizedMap(side, probe, rgb);
  const mapPath = resolve(root, contract.changeMap);
  if (process.argv.includes("--write-maps")) writeFileSync(mapPath, map);
  else invariant(sha(readFileSync(mapPath)) === contract.changeMapSha256 && readFileSync(mapPath, "utf8") === map, `${side}: normalized map drift`);
  const generated = JSON.parse(map) as Json;
  return {
    sourceWindow: probe.sourceWindow, denseRows: rows.length, rawRgbRows: rgb.length,
    probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(rgbSequence), changeMapSha256: sha(map),
    taskRanges: generated.lifetimes, state: generated.state, cleanup: generated.cleanup,
  };
}

export function verifyUproarEvidence(): Record<Side, Json> {
  invariant(fixture.schema === "uproar-bilateral-evidence/v1" && fixture.move === "MOVE_UPROAR"
    && fixture.moveId === MOVE && fixture.oracleProfile === "battle-scene-on"
    && fixture.status === "unsupported-evidence" && fixture.coverageCredit === false, "Uproar evidence identity drift");
  invariant(Object.values(fixture.evidenceScope).every((value) => value === true || value === false), "Uproar evidence scope malformed");
  for (const key of ["sourceAudit", "completePointerBody", "fullDenseRowsRetained", "twiceFreshByteIdentical", "normalizedMaps", "legalBilateralParties", "sourcePointersAndParity", "threeDistortionRingNotePulses", "allocatorOrder", "monbgBgRegisters", "displayTransferFacts", "audio", "animationRngVersusGameplayRng", "partiesBattlersControllerEngineStable", "firstInactiveCleanup"])
    invariant(fixture.evidenceScope[key] === true, `Uproar evidence scope missing ${key}`);
  for (const key of ["productionAnimationChanged", "reducerAdded", "typedSeamAdded", "compositorAdded", "coveragePromotion", "componentTrackCredit", "latchPromotion", "gameplayStateOwned"])
    invariant(fixture.evidenceScope[key] === false, `Uproar evidence-only boundary drift: ${key}`);
  invariant(sha(readFileSync(resolve(root, fixture.source.audit))) === fixture.source.auditSha256
    && sha(readFileSync(resolve(root, fixture.source.probe))) === fixture.source.probeSha256, "Uproar source receipt drift");
  const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root, encoding: "utf8" })) as Json;
  invariant(audit.status === "exact" && audit.coverageCredit === true
    && audit.source.start === "0x082cdafc" && audit.source.endExclusive === "0x082cdbc6"
    && audit.source.romSha256 === "650c484ddc250b89e303ff4d2cab7639b35b780317c8247c0810435d9f2f1dd0"
    && audit.source.sourceSha256 === "34fe247c02011ff9af0c9ef77b5e868af041933ba1a9d16f25acd60fface0958"
    && audit.checkpoint.denseWindowCaptured === true && audit.checkpoint.productionChanged === true
    && audit.checkpoint.coveragePromotion === true && audit.checkpoint.latchPromotion === true, "Uproar source classification drift");
  invariant(same(JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")).queue, ["MOVE_SPIDER_WEB"]), "Uproar queue ratchet drift");
  const result = {} as Record<Side, Json>;
  for (const side of ["player-back", "opponent-front"] as const) result[side] = verifyOrientation(side, fixture.orientations[side]);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyUproarEvidence(), null, 2));
}
