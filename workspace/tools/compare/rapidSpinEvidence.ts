/** Strict verifier and banked change-map generator for Rapid Spin evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/rapid-spin-evidence.json"), "utf8")) as Json;
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const START = 0x082cd941;
const END = 0x082cd9ae;
const MOVE = 229;
const IMPACT_TAG = 10135;
const RAPID_TAG = 10229;
const RAPID = "gRapidSpinSpriteTemplate";
const IMPACT = "gBasicHitSplatSpriteTemplate";
const ELEVATION = "RapinSpinMonElevation_Step";
const SHAKE = "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step";
const UPDATE = "Task_UpdateMonBg";
const CLEAR = "Task_ClearMonBg";
const SOUND = "Task_LoopAndPlaySE";

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
    animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex,
    animDelayCounter: sprite.animDelayCounter, data: sprite.data,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix,
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
      if (!previous.has(slot)) lives.push({ slot, start: age, end: null, first: projectSprite(sprite), callbacks: [] });
      const life = lives.find((candidate) => candidate.slot === slot && candidate.end === null);
      if (life && (!life.callbacks.length || life.callbacks.at(-1)![1] !== sprite.callback?.symbol)) {
        life.callbacks.push([age, sprite.callback?.symbol]);
      }
    }
    for (const life of lives) if (life.end === null && previous.has(life.slot) && !current.has(life.slot)) life.end = age - 1;
    previous = current;
  });
  for (const life of lives) if (life.end === null) life.end = rows.length - 1;
  return lives;
}

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1]
      && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function rgbFrames(archive: string, rows: Json[]): Buffer[] {
  const scratch = createScratchDir("pokebench-rapid-spin-rgb-");
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
  const selectedBg = side === "player-back" ? "bg2" : "bg1";
  const rowMaps = rows.map((row, age) => ({
    age, frame: row.frame, owner: row.scriptOwner, pointer: row.scriptPtr,
    parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait,
    active: row.animScriptActive, animationMovePower: row.animationMovePower,
    animationMoveDamage: row.animationMoveDamage,
    visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
    ...changedPixels(rgb[age - 1], rgb[age]),
    tasks: row.tasks.filter((task: Json) => [ELEVATION, SHAKE, UPDATE, CLEAR, SOUND].includes(task.func?.symbol))
      .map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => [RAPID, IMPACT].includes(sprite.template?.symbol)).map(projectSprite),
    displayTransfer: age === 0 ? null : {
      oam: same(row.hardwareOam, rows[age - 1]!.softwareOam),
      matrices: same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices),
      palette: same(row.hardwarePalette, rows[age - 1]!.fadedPalette),
    },
    palette: {
      fadedChanged: age > 0 && !same(row.fadedPalette, rows[age - 1]!.fadedPalette),
      unfadedChanged: age > 0 && !same(row.unfadedPalette, rows[age - 1]!.unfadedPalette),
      hardwareChanged: age > 0 && !same(row.hardwarePalette, rows[age - 1]!.hardwarePalette),
    },
    resources: {
      impactPaletteSlot: row.paletteTags.indexOf(IMPACT_TAG), rapidPaletteSlot: row.paletteTags.indexOf(RAPID_TAG),
      impactTileSlot: row.tileTags.indexOf(IMPACT_TAG), rapidTileSlot: row.tileTags.indexOf(RAPID_TAG),
      matrixBitmap: row.resourceAllocators.matrixBitmap, tileBitmapSha256: sha(row.resourceAllocators.tileBitmap),
    },
    scanline: {
      state: row.scanline.state, srcBuffer: row.scanline.srcBuffer,
      dmaDest: row.scanline.dmaDest, dmaControl: row.scanline.dmaControl,
      bankSha256: row.scanlineBuffers.map((bank: number[]) => sha(JSON.stringify(bank))),
    },
    registers: {
      bg1hofs: row.registers.bg1hofs, bg1vofs: row.registers.bg1vofs,
      bg2hofs: row.registers.bg2hofs, bg2vofs: row.registers.bg2vofs,
    },
    battleBg: row.battleBg, selectedBg,
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, {
      symbol: row.audio[channel].songHeaderIdentity.symbol,
      status: row.audio[channel].status,
      panX: row.audio[channel].tracks.map((track: Json) => track.panX),
    }])),
    animationRng: row.animationRng, gameplayRng: row.immutableState.rngValue,
  }));
  const display = (field: string, previous: string): string => `${rows.slice(1).filter((row, age) => same(row[field], rows[age]![previous])).length}/${rows.length - 1}`;
  const map = {
    schema: "rapid-spin-normalized-change-map/v1", side, selectedBg, sourceWindow: probe.sourceWindow,
    sourceRows: rows.map((row, age) => ({ age, frame: row.frame, owner: row.scriptOwner, pointer: row.scriptPtr,
      parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait, active: row.animScriptActive, sha256: row.sha256 })),
    lifecycles: {
      rapidSpin: lifecycles(rows, RAPID), impact: lifecycles(rows, IMPACT),
      tasks: { elevation: taskAges(rows, ELEVATION), shake: taskAges(rows, SHAKE), monbgUpdate: taskAges(rows, UPDATE), monbgClear: taskAges(rows, CLEAR), sound: taskAges(rows, SOUND) },
      resources: {
        paletteTags: transitions(rows, (row) => row.paletteTags), tileTags: transitions(rows, (row) => row.tileTags),
        matrixBitmap: transitions(rows, (row) => row.resourceAllocators.matrixBitmap),
        impactPaletteAges: rows.flatMap((row, age) => row.paletteTags.includes(IMPACT_TAG) ? [age] : []),
        rapidPaletteAges: rows.flatMap((row, age) => row.paletteTags.includes(RAPID_TAG) ? [age] : []),
      },
    },
    displayTransfer: {
      oam: display("hardwareOam", "softwareOam"), matrices: display("hardwareMatrices", "softwareMatrices"),
      palette: display("hardwarePalette", "fadedPalette"),
    },
    palette: { unfaded: transitions(rows, (row) => row.unfadedPalette), faded: transitions(rows, (row) => row.fadedPalette), hardware: transitions(rows, (row) => row.hardwarePalette) },
    scanline: { state: transitions(rows, (row) => row.scanline.state), buffers: transitions(rows, (row) => row.scanlineBuffers), srcBuffer: transitions(rows, (row) => row.scanline.srcBuffer) },
    monbg: { bgVram: transitions(rows, (row) => row.bgVram), registers: transitions(rows, (row) => row.registers), battleBg: transitions(rows, (row) => row.battleBg) },
    audio: { se1Starts: rows.flatMap((row, age) => age === 0 || row.audio.SE1.songHeaderIdentity.symbol !== rows[age - 1]!.audio.SE1.songHeaderIdentity.symbol ? [{ age, symbol: row.audio.SE1.songHeaderIdentity.symbol, panX: row.audio.SE1.tracks.map((track: Json) => track.panX) }] : []), se2Starts: rows.flatMap((row, age) => age === 0 || row.audio.SE2.songHeaderIdentity.symbol !== rows[age - 1]!.audio.SE2.songHeaderIdentity.symbol ? [{ age, symbol: row.audio.SE2.songHeaderIdentity.symbol }] : []) },
    rng: { gameplayValues: [...new Set(rows.map((row) => row.immutableState.rngValue))], animationDistinct: new Set(rows.map((row) => row.animationRng)).size, animationTransitions: transitions(rows, (row) => row.animationRng) },
    state: { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), rawBattleStateStable: rows.every((row) => same(row.rawBattleState, rows[0]!.rawBattleState)) },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, tasks: rows.at(-1)!.tasks.length, rapidSprites: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template?.symbol === RAPID).length, impactSprites: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template?.symbol === IMPACT).length, impactTag: rows.at(-1)!.paletteTags.includes(IMPACT_TAG), rapidTag: rows.at(-1)!.paletteTags.includes(RAPID_TAG), scanlineState: rows.at(-1)!.scanline.state },
    rows: rowMaps,
  };
  return `${JSON.stringify(map, null, 2)}\n`;
}

function verifyOrientation(side: Side, contract: Json): Json {
  for (const key of ["scenario", "denseState", "rawRgbArchive"] as const) {
    const path = resolve(root, contract[key]);
    const actual = sha(readFileSync(path));
    invariant(actual === contract[`${key}Sha256`], `${side}: ${key} digest drift (${path}: ${actual} != ${contract[`${key}Sha256`]})`);
  }
  if (!process.argv.includes("--write-maps")) invariant(sha(readFileSync(resolve(root, contract.changeMap))) === contract.changeMapSha256, `${side}: map digest drift`);
  invariant(contract.probeJsonSha256 === contract.repeatProbeJsonSha256 && contract.rawRgbSequenceSha256 === contract.repeatRawRgbSequenceSha256, `${side}: twice-fresh receipt drift`);
  const json = gunzipSync(readFileSync(resolve(root, contract.denseState)));
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(sha(json) === contract.probeJsonSha256, `${side}: dense JSON drift`);
  invariant(probe.schema === "rapid-spin-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === MOVE, `${side}: identity drift`);
  invariant(same(probe.sourceWindow, contract.sourceWindow) && rows.length === 131 && probe.sourceWindow.sourceFrameCount === 131, `${side}: dense window drift`);
  invariant(rows.every((row, age) => row.frame === rows[0]!.frame + age && row.scriptOwner === "Move_RAPID_SPIN" && row.scriptPtr >= START && row.scriptPtr < END && row.scriptPtrParity === (row.scriptPtr & 1) && row.scriptOffset === row.scriptPtr - START), `${side}: source pointer drift`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && rows.at(-1)!.scriptOffset === 108 && !rows.at(-1)!.animScriptActive, `${side}: source entry/cleanup drift`);
  invariant(same(probe.sourcePointerContract, { start: START, endExclusive: END, observedAddresses: [START, START + 3, START + 6, START + 8, START + 46, START + 83, START + 86, START + 105, START + 108], observedParities: [0, 1] }), `${side}: pointer contract drift`);
  for (const row of rows) invariant(row.animationMovePower === 20 && row.animationMoveDamage === 1 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.scanlineBuffers.length === 2 && row.scanlineBuffers.every((bank: number[]) => bank.length === 320) && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.resourceAllocators.tileRanges.length === 64 && row.parties.player.length === 3 && row.parties.opponent.length === 3, `${side}: retained shape/power drift`);
  const allowedTasks = new Set([ELEVATION, SHAKE, UPDATE, CLEAR, SOUND]);
  invariant(rows.every((row) => row.tasks.every((task: Json) => allowedTasks.has(task.func?.symbol))), `${side}: unexpected task owner`);
  invariant(same(taskAges(rows, ELEVATION), [[10, 51], [83, 124]]) && same(taskAges(rows, SHAKE), [[53, 71]]) && same(taskAges(rows, UPDATE), [[7, 128]]) && same(taskAges(rows, CLEAR), [[126, 128]]) && same(taskAges(rows, SOUND), [[10, 35], [83, 108]]), `${side}: task lifetimes drift`);
  invariant(same(lifecycles(rows, RAPID).map((life) => [life.slot, life.start, life.end]), [[3, 10, 41]]) && same(lifecycles(rows, IMPACT).map((life) => [life.slot, life.start, life.end]), [[3, 53, 62]]), `${side}: sprite lifetimes drift`);
  const rapidRows = rows.slice(10, 42).map((row) => row.sprites.find((sprite: Json) => sprite.template?.symbol === RAPID)!);
  const rapidPosition = side === "player-back" ? [72, 80] : [176, 40];
  const rapidAttr1 = [32837, 32838, 32827, 32812, 32808, 32817, 32832, 32840, 32832, 32817, 32808, 32812, 32827, 32838, 32837, 32824, 32810, 32809, 32820, 32835, 32839, 32830, 32815, 32808, 32815, 32830, 32839, 32835, 32820, 32809, 32810, 32824];
  const rapidAttr2 = [35137, 35145, 35145, 35153, 35153, 35137, 35137, 35145, 35145, 35153, 35153, 35137, 35137, 35145, 35145, 35153, 35153, 35137, 35137, 35145, 35145, 35153, 35153, 35137, 35137, 35145, 35145, 35153, 35153, 35137, 35137, 35145];
  const rapidOkay = (sprite: Json, index: number): boolean => sprite.slot === 3 && sprite.callback?.symbol === "AnimRapidSpin_Step" && sprite.attr[0] === (side === "player-back" ? 16486 : 16446) - index * 2 && sprite.attr[1] === rapidAttr1[index] + (side === "player-back" ? 0 : 104) && sprite.attr[2] === rapidAttr2[index] && sprite.x === rapidPosition[0] && sprite.y === rapidPosition[1] && sprite.animNum === 0 && sprite.animCmdIndex === [0, 1, 1, 2, 2, 0][index % 6] && sprite.animDelayCounter === index % 2 && sprite.matrixNum === 0 && same(sprite.matrix, [256, 0, 0, 256]) && sprite.data[0] === 1 && sprite.data[1] === (((index + 1) * 40) & 0xff) && sprite.data[2] === 40 && sprite.data[3] === -2 && sprite.data[4] === -32;
  invariant(rapidRows.every(rapidOkay), `${side}: Rapid Spin sprite callback/cells drift`);
  invariant(same(rapidRows.map((sprite: Json) => sprite.x2), [13, 14, 3, -12, -16, -7, 8, 16, 8, -7, -16, -12, 3, 14, 13, 0, -14, -15, -4, 11, 15, 6, -9, -16, -9, 6, 15, 11, -4, -15, -14, 0]) && same(rapidRows.map((sprite: Json) => sprite.y2), Array.from({ length: 32 }, (_, i) => 30 - i * 2)), `${side}: Rapid Spin x2/y2 drift`);
  const impactRows = rows.slice(53, 63).map((row) => row.sprites.find((sprite: Json) => sprite.template?.symbol === IMPACT)!);
  const impactPosition = side === "player-back" ? [176, 42] : [72, 88];
  const impactAttr = side === "player-back" ? [1306, 32928, 31025] : [1352, 32824, 31025];
  invariant(impactRows.every((sprite: Json) => sprite.slot === 3 && (sprite.callback?.symbol === "RunStoredCallbackWhenAffineAnimEnds" || sprite.callback?.symbol === "DestroyAnimSprite") && same(sprite.attr, impactAttr) && sprite.x === impactPosition[0] && sprite.y === impactPosition[1] && sprite.x2 === 0 && sprite.y2 === 0 && sprite.animNum === 0 && sprite.animCmdIndex === 0 && sprite.animDelayCounter === 0 && same(sprite.data, [0, 0, 0, 0, 0, 0, 15357, 2058]) && sprite.matrixNum === 0 && same(sprite.matrix, [372, 0, 0, 372])), `${side}: IMPACT affine/OAM drift`);
  invariant(same(transitions(rows, (row) => row.paletteTags), [1, 4, 130]) && same(transitions(rows, (row) => row.tileTags), [1, 4, 130]) && same(transitions(rows, (row) => row.resourceAllocators.matrixBitmap), [53, 63]), `${side}: resource lifetime drift`);
  invariant(same(transitions(rows, (row) => row.unfadedPalette), [4]) && same(transitions(rows, (row) => row.fadedPalette), [4]) && same(transitions(rows, (row) => row.hardwarePalette), [5]), `${side}: palette schedule drift`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam) && same(row.hardwareMatrices, rows[age]!.softwareMatrices) && same(row.hardwarePalette, rows[age]!.fadedPalette)), `${side}: display predecessor latch drift`);
  const bg = side === "player-back" ? "bg2" : "bg1";
  invariant(same(transitions(rows, (row) => row.registers[`${bg}hofs`]), [8, 11, 126, 130]) && same(transitions(rows, (row) => row.registers[`${bg}vofs`]), [8, 130]) && same(transitions(rows, (row) => row.bgVram), [8, 128, 130]) && same(transitions(rows, (row) => row.battleBg), [7, 129]), `${side}: monbg BG/register latch drift`);
  const audioStarts = rows.flatMap((row, age) => age === 0 || row.audio.SE1.songHeaderIdentity.symbol !== rows[age - 1]!.audio.SE1.songHeaderIdentity.symbol ? [{ age, symbol: row.audio.SE1.songHeaderIdentity.symbol }] : []);
  invariant(same(audioStarts.filter((event) => event.symbol === "se_m_razor_wind2").map((event) => event.age), [10, 83]) && same(audioStarts.filter((event) => event.symbol === "se_m_double_slap").map((event) => event.age), [53]), `${side}: audio event drift`);
  const pan = side === "player-back" ? -64 : 63;
  for (const age of [10, 83]) invariant(rows[age]!.audio.SE1.tracks[0]!.panX === pan, `${side}: Razor Wind pan drift`);
  invariant(rows[53]!.audio.SE1.tracks[0]!.panX === (side === "player-back" ? 63 : -63), `${side}: Double Slap pan drift`);
  invariant(new Set(rows.map((row) => row.immutableState.rngValue)).size === 1 && new Set(rows.map((row) => row.animationRng)).size === 129 && transitions(rows, (row) => row.animationRng).length === 128, `${side}: RNG domain drift`);
  for (const key of ["parties", "battlers", "engine", "immutableState", "rawBattleState"]) invariant(rows.every((row) => same(row[key], rows[0]![key])), `${side}: immutable state drift ${key}`);
  invariant(rows.every((row) => row.spriteOrder.length === 64 && new Set(row.spriteOrder).size === 64), `${side}: sprite allocator order drift`);
  invariant(rows.at(-1)!.tasks.length === 0 && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && !rows.at(-1)!.sprites.some((sprite: Json) => [RAPID, IMPACT].includes(sprite.template?.symbol)) && !rows.at(-1)!.paletteTags.includes(RAPID_TAG) && !rows.at(-1)!.paletteTags.includes(IMPACT_TAG) && rows.at(-1)!.scanline.state === 0, `${side}: first inactive cleanup drift`);
  const rgb = rgbFrames(resolve(root, contract.rawRgbArchive), rows); const sequence = Buffer.concat(rgb);
  invariant(sha(sequence) === contract.rawRgbSequenceSha256, `${side}: RGB sequence drift`);
  const map = normalizedMap(side, probe, rgb); const mapPath = resolve(root, contract.changeMap);
  if (process.argv.includes("--write-maps")) writeFileSync(mapPath, map); else invariant(readFileSync(mapPath, "utf8") === map, `${side}: normalized map drift`);
  const generated = JSON.parse(map) as Json;
  return { sourceWindow: probe.sourceWindow, denseRows: rows.length, rawRgbRows: rgb.length, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(sequence), changeMapSha256: sha(map), taskRanges: generated.lifecycles.tasks, displayTransfer: generated.displayTransfer, cleanup: generated.cleanup };
}

export function verifyRapidSpinEvidence(): Record<Side, Json> {
  invariant(fixture.schema === "rapid-spin-bilateral-evidence/v1" && fixture.move === "MOVE_RAPID_SPIN" && fixture.moveId === MOVE && fixture.oracleProfile === "battle-scene-on" && fixture.status === "unsupported-evidence" && fixture.coverageCredit === false, "Rapid Spin evidence identity drift");
  for (const key of ["audit", "probe", "sharedProbe"] as const) invariant(sha(readFileSync(resolve(root, fixture.source[key]))) === fixture.source[`${key}Sha256`], `source ${key} drift`);
  const auditOutput = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(auditOutput) === fixture.source.auditRunSha256, "source audit output drift");
  const audit = JSON.parse(auditOutput.toString("utf8")) as Json;
  invariant(audit.status === "exact" && audit.coverageCredit === true && audit.source.pointerOwnedRoot.rom.start === "0x082cd941" && audit.source.pointerOwnedRoot.rom.endExclusive === "0x082cd9ae", "Rapid Spin source boundary drift");
  invariant(same(JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")).queue, ["MOVE_SHOCK_WAVE"]), "Rapid Spin queue drift");
  invariant(fixture.evidenceScope.productionAnimationChanged === false && fixture.evidenceScope.reducerAdded === false && fixture.evidenceScope.typedSeamAdded === false && fixture.evidenceScope.compositorAdded === false && fixture.evidenceScope.coveragePromotion === false && fixture.evidenceScope.componentTrackCredit === false && fixture.evidenceScope.latchPromotion === false && fixture.evidenceScope.gameplayStateOwned === false, "Rapid Spin evidence-only boundary drift");
  const result = {} as Record<Side, Json>;
  for (const side of ["player-back", "opponent-front"] as const) result[side] = verifyOrientation(side, fixture.orientations[side]);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyRapidSpinEvidence(), null, 2));
