/** Strict bilateral dense evidence checkpoint for MOVE_STOCKPILE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type SidePaths = Readonly<{
  side: Side;
  scenario: string;
  denseState: string;
  rawRgbArchive: string;
  changeMap: string;
  startFrame: number;
  endFrame: number;
  scenarioSha256: string;
  denseArchiveSha256: string;
  denseJsonSha256: string;
  rawArchiveSha256: string;
  rawSequenceSha256: string;
}>;

const root = resolve(import.meta.dirname, "../..");
const sides: readonly SidePaths[] = [
  {
    side: "player-back",
    scenario: "tools/battle-lab/mechanic-stockpile-player-pelipper-opponent-delcatty.json",
    denseState: "tools/compare/evidence/stockpile-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/stockpile-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/stockpile-changemap-player.json",
    startFrame: 207,
    endFrame: 305,
    scenarioSha256: "595cbb9804160bbcc2f579cf33b8aecfafed4f51a7bb87acb3a7f4118374015e",
    denseArchiveSha256: "6ee995e7fa295c57cd4ec3168a3136868c4d197e10e9fd95f21589a0fd41ed8d",
    denseJsonSha256: "f55004eb823b2dedbd97c0da1b17f0fc821af356165b87e825364daf3c8da559",
    rawArchiveSha256: "ab2cbc9e3f5213d8baf055a00531de77c7b423c830e3d25b434de6cc4292f76f",
    rawSequenceSha256: "b743b02daa7d6f78cff6092371e18e476db2812effa5239765ecc4e7eee786b1",
  },
  {
    side: "opponent-front",
    scenario: "tools/battle-lab/mechanic-stockpile-opponent-pelipper-player-delcatty.json",
    denseState: "tools/compare/evidence/stockpile-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/stockpile-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/stockpile-changemap-opponent.json",
    startFrame: 205,
    endFrame: 303,
    scenarioSha256: "25254a5dea32b5f47607ed9f4deb357f1b5a226cbd517b9e3bd68b84bbfb87a8",
    denseArchiveSha256: "9ecfaf486f29fe00bf2d579ec8cb813b9d827be59739bf9e0181d1cc8b6fe7d1",
    denseJsonSha256: "b9365d176d9b4257bcadcd8803854c1a00725e78ca55c28e779611813c19a736",
    rawArchiveSha256: "f38f094b5820f05f99c4bf80ab4a2180a39ca224eb4a9cc31755bb95a0b94880",
    rawSequenceSha256: "8b89999c50091577ee524df03b2ab3a4c706544e73277fdc391dcd839feee589",
  },
] as const;

const SOURCE_START = 0x082d_4934;
const SOURCE_END = 0x082d_49eb;
const GRAY_ORB_TAG = 10235;
const ORB = "gStockpileAbsorptionOrbSpriteTemplate";
const DEFORM = "AnimTask_StockpileDeformMon";
const CYCLE = "AnimTask_BlendColorCycleLoop";
const SIMPLE_BLEND = "gSimplePaletteBlendSpriteTemplate";
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function rawFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const directory = createScratchDir("stockpile-evidence-rgb-");
  execFileSync("tar", ["-xzf", archive, "-C", directory]);
  return rows.map((row) => readFileSync(resolve(directory, `${String(row.frame).padStart(5, "0")}.rgb`)));
}

function transitions(rows: readonly Json[], value: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age === 0 || !same(value(row), value(rows[age - 1]!)) ? [age] : []);
}

function ownedOrbs(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => sprite.template?.symbol === ORB).map((sprite: Json) => ({
    slot: sprite.slot,
    callback: sprite.callback?.symbol,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    matrixNum: sprite.matrixNum,
    matrix: sprite.matrix,
    data: sprite.data,
    subpriority: sprite.subpriority,
    invisible: sprite.invisible,
  })).sort((left: Json, right: Json) => left.slot - right.slot);
}

function orbLives(rows: readonly Json[]): Json[] {
  const open = new Map<number, Json>();
  const lives: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Map<number, Json>(ownedOrbs(row).map((sprite) => [sprite.slot, sprite]));
    for (const [slot, sprite] of current) {
      if (!open.has(slot)) {
        const life = { slot, start: age, end: age, states: [] as Json[] };
        open.set(slot, life);
        lives.push(life);
      }
      const life = open.get(slot)!;
      life.end = age;
      life.states.push({ age, ...sprite });
    }
    for (const slot of open.keys()) if (!current.has(slot)) open.delete(slot);
  }
  return lives;
}

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: 0, bounds: null };
  let count = 0;
  let minX = 240;
  let minY = 160;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1]
      && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function localChangedPixels(previous: Buffer, current: Buffer, centerX: number, centerY: number): Json {
  let count = 0;
  let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let y = Math.max(0, centerY - 12); y <= Math.min(159, centerY + 12); y += 1) {
    for (let x = Math.max(0, centerX - 12); x <= Math.min(239, centerX + 12); x += 1) {
      const offset = (y * 240 + x) * 3;
      if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1]
        && current[offset + 2] === previous[offset + 2]) continue;
      count += 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function buildMap(side: SidePaths, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  invariant(probe.schema === "stockpile-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 254,
    `${side.side}: probe identity drift`);
  invariant(rows.length === 99 && probe.sourceWindow.startFrame === side.startFrame
    && probe.sourceWindow.endFrame === side.endFrame && probe.sourceWindow.frameCount === 99
    && probe.sourceWindow.sourceFrameCount === 99 && rows[0]?.scriptOwner === "Move_STOCKPILE"
    && rows[0]?.scriptOffset === 0 && rows[0]?.animScriptActive === true
    && rows.at(-1)?.scriptOwner === "Move_STOCKPILE" && rows.at(-1)?.scriptOffset === 61
    && rows.at(-1)?.animScriptActive === false
    && rows.every((row, age) => row.frame === side.startFrame + age && row.scriptOwner === "Move_STOCKPILE"
      && row.scriptPtr >= SOURCE_START && row.scriptPtr < SOURCE_END
      && (row.scriptPtrParity === 0 || row.scriptPtrParity === 1)), `${side.side}: incomplete/non-owned Stockpile body`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.parties.player.length === 3 && row.parties.opponent.length === 3), `${side.side}: dense state shape drift`);
  invariant(rgb.length === 99 && rgb.every((frame, age) => frame.length === 240 * 160 * 3
    && sha(frame) === rows[age]!.sha256), `${side.side}: raw RGB receipt drift`);

  const lives = orbLives(rows);
  const births = lives.map((life) => life.start);
  const expectedBirths = Array.from({ length: 16 }, (_, index) => 4 + index * 3);
  invariant(same(births, expectedBirths) && lives.every((life) => life.end === life.start + 13), `${side.side}: orb lifecycle drift`);
  invariant(lives.every((life) => {
    const source = rows[life.start]!.softwareMatrices[life.states[0]!.matrixNum];
    const hardware = rows[life.start + 1]!.hardwareMatrices[life.states[0]!.matrixNum];
    return same(source, [214, 0, 0, 214]) && same(hardware, source)
      && same(rows[life.start + 1]!.hardwareOam[life.slot], rows[life.start]!.softwareOam[life.slot]);
  }), `${side.side}: fresh gray-orb RAM+1 transfer drift`);
  const deformAges = rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func?.symbol === DEFORM) ? [age] : []);
  const cycleAges = rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func?.symbol === CYCLE) ? [age] : []);
  const simpleBlendAges = rows.flatMap((row, age) => row.sprites.some((sprite: Json) => sprite.template?.symbol === SIMPLE_BLEND) ? [age] : []);
  invariant(same(deformAges, Array.from({ length: 74 }, (_, index) => index + 4))
    && same(cycleAges, Array.from({ length: 65 }, (_, index) => index + 4))
    && same(simpleBlendAges, Array.from({ length: 18 }, (_, index) => index + 79)), `${side.side}: task/palette schedule drift`);
  const attackerMatrix = (row: Json): Json => row.softwareMatrices[row.battlerSprites.attacker.matrixNum];
  invariant(Array.from({ length: 76 }, (_, index) => index + 4).every((age) =>
    same(rows[age]!.hardwareMatrices[rows[age]!.battlerSprites.attacker.matrixNum], attackerMatrix(rows[age - 2]!))),
  `${side.side}: live attacker affine RAM+2 drift`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwareOam, rows[index]!.softwareOam))
    && rows.slice(1).every((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)),
  `${side.side}: ordinary OAM/palette RAM+1 drift`);

  const firstOrb = lives[0]!.states[0]!;
  const center = { x: firstOrb.x + firstOrb.x2, y: firstOrb.y + firstOrb.y2 };
  const firstPaint = localChangedPixels(rgb[4]!, rgb[5]!, center.x, center.y);
  if (side.side === "opponent-front") invariant(same(center, { x: 125, y: 87 })
    && same(firstPaint, { changedPixels: 69, bounds: [121, 83, 129, 91] }), "opponent-front: first orb pixel latch drift");
  else invariant(same(center, { x: 123, y: 145 }) && firstPaint.changedPixels === 0,
    "player-back: offscreen first-orb geometry drift");

  const map = {
    schema: "stockpile-normalized-change-map/v1",
    side: side.side,
    sourceWindow: probe.sourceWindow,
    sourcePointerContract: probe.sourcePointerContract,
    sourceRows: rows.map((row, age) => ({
      age, frame: row.frame, pointer: row.scriptPtr, pointerParity: row.scriptPtrParity,
      offset: row.scriptOffset, wait: row.scriptWait, active: row.animScriptActive,
      visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
      orbs: ownedOrbs(row), attackerMatrix: row.battlerSprites.attacker.matrix,
      hardwareAttackerMatrix: row.hardwareMatrices[row.battlerSprites.attacker.matrixNum],
      grayOrbTagged: row.paletteTags.includes(GRAY_ORB_TAG) && row.tileTags.includes(GRAY_ORB_TAG),
      registers: row.registers, fadedAttackerPalette: row.fadedPalette.slice(256, 272),
      hardwareAttackerPalette: row.hardwarePalette.slice(256, 272), rgbSha256: sha(rgb[age]!),
      ...changedPixels(rgb[age - 1], rgb[age]!),
    })),
    sprites: { grayOrbLives: lives },
    tasks: { deformAges, blendColorCycleAges: cycleAges, simplePaletteBlendAges: simpleBlendAges },
    transitions: {
      fadedPalette: transitions(rows, (row) => row.fadedPalette),
      hardwarePalette: transitions(rows, (row) => row.hardwarePalette),
      attackerMatrix: transitions(rows, (row) => row.battlerSprites.attacker.matrix),
      hardwareAttackerMatrix: transitions(rows, (row) => row.hardwareMatrices[row.battlerSprites.attacker.matrixNum]),
    },
    latches: {
      wholeOamRamPlus1: "98/98", wholePaletteRamPlus1: "98/98",
      freshOrbMatrixAndOamRamPlus1: "16/16", liveAttackerAffineRamPlus2: "76/76",
      firstOrbSourceCenter: center, firstOrbPaintAtSourceBirthPlus1: firstPaint,
    },
    state: {
      partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)),
      battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)),
      engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)),
      immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)),
      gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue).slice(1),
      animationRngTransitions: transitions(rows, (row) => row.animationRng).slice(1),
    },
    cleanup: {
      age: 98, active: rows[98]!.animScriptActive, visualTasks: rows[98]!.visualTaskCount,
      soundTasks: rows[98]!.soundTaskCount, orbs: ownedOrbs(rows[98]!).length,
      grayOrbTagged: rows[98]!.paletteTags.includes(GRAY_ORB_TAG) || rows[98]!.tileTags.includes(GRAY_ORB_TAG),
    },
  };
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable
    && same(map.state.gameplayRngTransitions, []) && map.state.animationRngTransitions.length === 98
    && same(map.transitions.fadedPalette, [0, 1, 14, 24, 34, 44, 54, 64, 81, 83, 85, 87, 89, 91])
    && same(map.transitions.hardwarePalette, [0, 2, 15, 25, 35, 45, 55, 65, 82, 84, 86, 88, 90, 92])
    && !map.cleanup.active && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0
    && map.cleanup.orbs === 0 && !map.cleanup.grayOrbTagged, `${side.side}: state/palette/cleanup contract drift`);
  return map;
}

export function verifyStockpileEvidence(): Record<Side, Json> {
  const result = {} as Record<Side, Json>;
  for (const side of sides) {
    const scenario = readFileSync(resolve(root, side.scenario));
    const denseArchive = readFileSync(resolve(root, side.denseState));
    const denseJson = gunzipSync(denseArchive);
    const rawArchivePath = resolve(root, side.rawRgbArchive);
    const rawArchive = readFileSync(rawArchivePath);
    invariant(sha(scenario) === side.scenarioSha256 && sha(denseArchive) === side.denseArchiveSha256
      && sha(denseJson) === side.denseJsonSha256 && sha(rawArchive) === side.rawArchiveSha256,
    `${side.side}: banked receipt hash drift`);
    const probe = JSON.parse(denseJson.toString("utf8"));
    const rgb = rawFrames(rawArchivePath, probe.frames);
    invariant(sha(Buffer.concat(rgb)) === side.rawSequenceSha256, `${side.side}: raw RGB sequence hash drift`);
    const map = buildMap(side, probe, rgb);
    const mapBytes = `${JSON.stringify(map, null, 2)}\n`;
    writeFileSync(resolve(root, side.changeMap), mapBytes);
    result[side.side] = { rows: probe.frames.length, dense: sha(denseJson), rawRgb: sha(Buffer.concat(rgb)), changeMap: sha(mapBytes) };
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(verifyStockpileEvidence(), null, 2));
