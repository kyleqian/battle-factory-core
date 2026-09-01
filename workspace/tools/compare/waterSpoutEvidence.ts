/** Strict bilateral dense evidence bank for MOVE_WATER_SPOUT's full-HP tier. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const fixturePath = "tools/compare/fixtures/water-spout-evidence.json";
const sides = [
  { side: "player-back" as Side, scenario: "tools/battle-lab/mechanic-water-spout-player-wailmer-opponent-shuckle.json", dense: "tools/compare/evidence/water-spout-player-dense-state.json.gz", rgb: "tools/compare/evidence/water-spout-player-raw-rgb.tar.gz", map: "tools/compare/evidence/water-spout-changemap-player.json", start: 79 },
  { side: "opponent-front" as Side, scenario: "tools/battle-lab/mechanic-water-spout-opponent-wailmer-player-shuckle.json", dense: "tools/compare/evidence/water-spout-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/water-spout-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/water-spout-changemap-opponent.json", start: 83 },
] as const;
const SOURCE_START = 0x082c_ef63;
const SOURCE_END = 0x082c_ef91;
const ORB_TAG = 10268;
const IMPACT_TAG = 10148;
const ORB = "gSmallWaterOrbSpriteTemplate";
const IMPACT = "gWaterHitSplatSpriteTemplate";
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function transitions(rows: Json[], get: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age === 0 || !same(get(row), get(rows[age - 1]!)) ? [age] : []);
}
function rgbFromDir(directory: string, rows: Json[]): Buffer[] {
  return rows.map((row) => readFileSync(resolve(directory, `${String(row.frame).padStart(5, "0")}.rgb`)));
}
function rgbFromArchive(archive: string, rows: Json[]): Buffer[] {
  const directory = createScratchDir("water-spout-evidence-");
  execFileSync("tar", ["-xzf", archive, "-C", directory]);
  return rgbFromDir(directory, rows);
}
function ownedSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => sprite.template?.symbol === ORB || sprite.template?.symbol === IMPACT)
    .map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback?.symbol,
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, invisible: sprite.invisible,
      subpriority: sprite.subpriority, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data, attr: sprite.attr }))
    .sort((a: Json, b: Json) => a.slot - b.slot);
}
function ownedTasks(row: Json): Json[] {
  return row.tasks.filter((task: Json) => ["AnimTask_WaterSpoutLaunch_Step", "AnimTask_WaterSpoutRain_Step", "AnimTask_ShakeBattlers"].includes(task.func?.symbol))
    .map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data }));
}
function lives(rows: Json[], kind: "sprite" | "task"): Json[] {
  const open = new Map<string, Json>(); const result: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const values = kind === "sprite" ? ownedSprites(row) : ownedTasks(row);
    const current = new Set<string>();
    for (const value of values) {
      const symbol = kind === "sprite" ? `${value.template}/${value.callback}` : value.func;
      const key = `${value.slot}/${symbol}`; current.add(key);
      if (!open.has(key)) { const life = { slot: value.slot, symbol, start: age, end: age }; open.set(key, life); result.push(life); }
      open.get(key)!.end = age;
    }
    for (const key of open.keys()) if (!current.has(key)) open.delete(key);
  }
  return result;
}
function tagLife(rows: Json[], tag: number): Json {
  const ages = rows.flatMap((row, age) => row.paletteTags.includes(tag) && row.tileTags.includes(tag) ? [age] : []);
  return { tag, first: ages[0], last: ages.at(-1), count: ages.length };
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { count: 0, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 38400; pixel++) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count++; const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function changeMap(side: typeof sides[number], probe: Json, rgb: Buffer[]): Json {
  const rows = probe.frames as Json[];
  invariant(probe.schema === "water-spout-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 323, `${side.side}: identity`);
  invariant(rows.length === 278 && probe.sourceWindow.startFrame === side.start && probe.sourceWindow.endFrame === side.start + 277
    && probe.sourceWindow.sourceFrameCount === 278 && rows.every((row, age) => row.frame === side.start + age && row.scriptOwner === "Move_WATER_SPOUT"
      && row.scriptPtr >= SOURCE_START && row.scriptPtr < SOURCE_END), `${side.side}: incomplete source body`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && rows.at(-1)!.scriptOffset === SOURCE_END - SOURCE_START - 1
    && !rows.at(-1)!.animScriptActive, `${side.side}: cleanup boundary`);
  invariant(rgb.length === rows.length && rgb.every((frame, age) => frame.length === 115200 && sha(frame) === rows[age]!.sha256), `${side.side}: RGB receipt`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.parties.player.length === 3 && row.parties.opponent.length === 3), `${side.side}: dense shape`);

  const spriteLives = lives(rows, "sprite"); const taskLives = lives(rows, "task");
  const launchOrbs = spriteLives.filter((life) => life.symbol === `${ORB}/AnimSmallWaterOrb`);
  const rainOrbs = spriteLives.filter((life) => life.symbol === `${ORB}/AnimWaterSpoutRain`);
  const impacts = spriteLives.filter((life) => life.symbol === `${IMPACT}/AnimWaterSpoutRainHit`);
  const expectedTaskLives = side.side === "player-back"
    ? [["AnimTask_WaterSpoutLaunch_Step", 10, 87], ["AnimTask_WaterSpoutRain_Step", 107, 195], ["AnimTask_ShakeBattlers", 116, 275]]
    : [["AnimTask_WaterSpoutLaunch_Step", 10, 82], ["AnimTask_WaterSpoutRain_Step", 102, 195], ["AnimTask_ShakeBattlers", 116, 275]];
  const latches = {
    oam: rows.slice(1).filter((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)).length,
    matrices: rows.slice(1).filter((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)).length,
    palette: rows.slice(1).filter((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)).length,
    denominator: 277,
  };
  const audioAges = side.side === "player-back" ? [10, 56, 107] : [10, 56, 102];
  const audio = audioAges.map((age) => ({ age, song: rows[age]!.audio.SE1.songHeaderIdentity.symbol, panX: rows[age]!.audio.SE1.tracks[0]?.panX }));
  const expectedAudio = side.side === "player-back"
    ? [{ age: 10, song: "se_m_headbutt", panX: -64 }, { age: 56, song: "se_m_dive", panX: -64 }, { age: 107, song: "se_m_surf", panX: 63 }]
    : [{ age: 10, song: "se_m_headbutt", panX: 63 }, { age: 56, song: "se_m_dive", panX: 63 }, { age: 102, song: "se_m_surf", panX: -63 }];
  const expectedObservedSpans = side.side === "player-back" ? [15, 20] : [10, 19];
  invariant(launchOrbs.length === 20 && launchOrbs.every((life) => life.start === 55)
    && rainOrbs.length === expectedObservedSpans[0] && impacts.length === expectedObservedSpans[1],
    `${side.side}: tier-3 allocation`);
  invariant(same(taskLives.map((life) => [life.symbol, life.start, life.end]), expectedTaskLives), `${side.side}: task lifecycle`);
  invariant(same(latches, { oam: 277, matrices: 229, palette: 276, denominator: 277 }), `${side.side}: latch counts`);
  invariant(same(tagLife(rows, ORB_TAG), { tag: ORB_TAG, first: 1, last: 276, count: 276 })
    && same(tagLife(rows, IMPACT_TAG), { tag: IMPACT_TAG, first: 4, last: 276, count: 273 }), `${side.side}: resources`);
  const rngHoldAges = side.side === "player-back" ? [109, 110] : [104, 105];
  const expectedRngTransitions = Array.from({ length: 278 }, (_, age) => age).filter((age) => !rngHoldAges.includes(age));
  invariant(same(audio, expectedAudio) && transitions(rows, (row) => row.immutableState.rngValue).length === 1
    && same(transitions(rows, (row) => row.animationRng), expectedRngTransitions), `${side.side}: audio/RNG`);
  invariant(rows.every((row) => same(row.parties, rows[0]!.parties) && same(row.battlers, rows[0]!.battlers)
    && same(row.engine, rows[0]!.engine) && same(row.immutableState, rows[0]!.immutableState)), `${side.side}: immutable gameplay seam`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && ownedSprites(rows.at(-1)!).length === 0
    && !rows.at(-1)!.paletteTags.includes(ORB_TAG) && !rows.at(-1)!.paletteTags.includes(IMPACT_TAG), `${side.side}: cleanup`);

  return {
    schema: "water-spout-normalized-change-map/v1", side: side.side, sourceWindow: probe.sourceWindow,
    selectors: { attacker: rows[0]!.animationBattlers.attacker, target: rows[0]!.animationBattlers.target, liveHpPowerTier: 3 },
    allocations: { launchOrbs, rainOrbs, impacts }, taskLives, latches,
    resources: { glowyBlueOrb: tagLife(rows, ORB_TAG), waterImpact: tagLife(rows, IMPACT_TAG) }, audio,
    rng: { gameplayTransitions: [], animationTransitions: transitions(rows, (row) => row.animationRng).slice(1), initial: rows[0]!.animationRng, final: rows.at(-1)!.animationRng },
    sourceRows: rows.map((row, age) => ({ age, frame: row.frame, pointer: row.scriptPtr, pointerParity: row.scriptPtrParity,
      offset: row.scriptOffset, wait: row.scriptWait, active: row.animScriptActive, visualTaskCount: row.visualTaskCount,
      tasks: ownedTasks(row), sprites: ownedSprites(row), attackerAxes: [row.battlerSprites.attacker.x, row.battlerSprites.attacker.y, row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2],
      targetAxes: [row.battlerSprites.target.x, row.battlerSprites.target.y, row.battlerSprites.target.x2, row.battlerSprites.target.y2],
      registers: row.registers, animationRng: row.animationRng, softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)),
      softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)),
      fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), rgb: row.sha256,
      changedPixels: changedPixels(rgb[age - 1], rgb[age]!) })),
    cleanup: { age: 277, inactive: true, resourcesFreed: true, tasks: 0, sprites: 0 },
  };
}

function receipt(side: typeof sides[number], firstJson: string, firstRgb: string, repeatJson: string, repeatRgb: string): Json {
  const first = readFileSync(firstJson), repeat = readFileSync(repeatJson);
  invariant(first.equals(repeat), `${side.side}: dense state not byte-identical twice fresh`);
  const probe = JSON.parse(first.toString()) as Json, rows = probe.frames as Json[];
  const rgb1 = rgbFromDir(firstRgb, rows), rgb2 = rgbFromDir(repeatRgb, rows);
  invariant(sha(Buffer.concat(rgb1)) === sha(Buffer.concat(rgb2)), `${side.side}: raw RGB not byte-identical twice fresh`);
  mkdirSync(resolve(root, "tools/compare/evidence"), { recursive: true });
  writeFileSync(resolve(root, side.dense), gzipSync(first));
  execFileSync("tar", ["-czf", resolve(root, side.rgb), "-C", firstRgb, "."]);
  const map = Buffer.from(`${JSON.stringify(changeMap(side, probe, rgb1), null, 2)}\n`); writeFileSync(resolve(root, side.map), map);
  return { scenario: side.scenario, scenarioSha256: sha(readFileSync(resolve(root, side.scenario))), denseState: side.dense,
    denseStateSha256: sha(readFileSync(resolve(root, side.dense))), probeJsonSha256: sha(first), repeatProbeJsonSha256: sha(repeat),
    rawRgbArchive: side.rgb, rawRgbArchiveSha256: sha(readFileSync(resolve(root, side.rgb))), rawRgbSequenceSha256: sha(Buffer.concat(rgb1)),
    repeatRawRgbSequenceSha256: sha(Buffer.concat(rgb2)), changeMap: side.map, changeMapSha256: sha(map), sourceWindow: probe.sourceWindow };
}
function bank(args: string[]): void {
  invariant(args.length === 8, "usage: waterSpoutEvidence.ts --bank <player-json> <player-rgb> <player-repeat-json> <player-repeat-rgb> <opponent-json> <opponent-rgb> <opponent-repeat-json> <opponent-repeat-rgb>");
  const output = { schema: "water-spout-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_WATER_SPOUT", moveId: 323,
    status: "unsupported", coverageCredit: false, fullHpPowerTier: 3,
    scope: { completePointerBody: true, fullDenseRowsRetained: true, rawRgbRetained: true, twiceFreshByteIdentical: true,
      normalizedMaps: true, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false },
    acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 278, "opponent-front": 278 }, rawRgbRows: { "player-back": 278, "opponent-front": 278 } },
    source: { audit: "tools/compare/waterSpoutSourceAudit.ts", auditSha256: sha(readFileSync(resolve(root, "tools/compare/waterSpoutSourceAudit.ts"))), probe: "tools/compare/waterSpoutProbe.py", probeSha256: sha(readFileSync(resolve(root, "tools/compare/waterSpoutProbe.py"))) },
    orientations: { "player-back": receipt(sides[0], ...args.slice(0, 4) as [string,string,string,string]), "opponent-front": receipt(sides[1], ...args.slice(4, 8) as [string,string,string,string]) },
    remaining: "Implement a source-relative tiered reducer, typed live presentation seam, art/compositor, actual-core zero-residual framebuffer gate twice, altered species/geometry control, and independently stage/prove any visibly required lower-HP tier without transient injection." };
  writeFileSync(resolve(root, fixturePath), `${JSON.stringify(output, null, 2)}\n`);
}
export function verifyWaterSpoutEvidence(): Json {
  const bank = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Json;
  invariant(bank.schema === "water-spout-bilateral-evidence/v1" && bank.status === "unsupported" && !bank.coverageCredit
    && bank.fullHpPowerTier === 3 && !bank.scope.reducerAdded && !bank.scope.framebufferCompared && !bank.scope.coveragePromotion, "receipt scope drift");
  for (const [path, expected] of [[bank.source.audit, bank.source.auditSha256], [bank.source.probe, bank.source.probeSha256]] as const)
    invariant(sha(readFileSync(resolve(root, path))) === expected, `${path}: source drift`);
  const result: Json = {};
  for (const side of sides) {
    const item = bank.orientations[side.side];
    for (const [path, expected] of [[item.scenario, item.scenarioSha256], [item.denseState, item.denseStateSha256], [item.rawRgbArchive, item.rawRgbArchiveSha256]] as const)
      invariant(sha(readFileSync(resolve(root, path))) === expected, `${side.side}: ${path} drift`);
    const dense = gunzipSync(readFileSync(resolve(root, item.denseState)));
    invariant(sha(dense) === item.probeJsonSha256 && item.probeJsonSha256 === item.repeatProbeJsonSha256, `${side.side}: dense repeat drift`);
    const probe = JSON.parse(dense.toString()) as Json, rgb = rgbFromArchive(resolve(root, item.rawRgbArchive), probe.frames);
    invariant(sha(Buffer.concat(rgb)) === item.rawRgbSequenceSha256 && item.rawRgbSequenceSha256 === item.repeatRawRgbSequenceSha256, `${side.side}: RGB repeat drift`);
    const map = Buffer.from(`${JSON.stringify(changeMap(side, probe, rgb), null, 2)}\n`);
    invariant(sha(map) === item.changeMapSha256 && readFileSync(resolve(root, item.changeMap)).equals(map), `${side.side}: normalized map drift`);
    result[side.side] = { rows: probe.frames.length, dense: item.probeJsonSha256, rawRgb: item.rawRgbSequenceSha256, changeMap: item.changeMapSha256 };
  }
  return result;
}
const at = process.argv.indexOf("--bank");
if (at >= 0) bank(process.argv.slice(at + 1));
else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyWaterSpoutEvidence(), null, 2));
