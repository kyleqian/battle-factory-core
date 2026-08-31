/**
 * Strict bilateral evidence bank for one pointer-owned MOVE_ROCK_BLAST body.
 *
 * This is deliberately an oracle receipt verifier, not a renderer comparator:
 * it preserves exactly one visual-script body through first inactive cleanup.
 * Rock Blast may run that body again for later EFFECT_MULTI_HIT strikes; those
 * repeats and all battle-result/controller work remain outside this fixture.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type SidePaths = Readonly<{
  readonly side: Side;
  readonly scenario: string;
  readonly denseState: string;
  readonly rawRgbArchive: string;
  readonly changeMap: string;
}>;

const root = resolve(import.meta.dirname, "../..");
const fixturePath = "tools/compare/fixtures/rock-blast-evidence.json";
const sides: readonly SidePaths[] = [
  {
    side: "player-back",
    scenario: "tools/battle-lab/mechanic-rock-blast-player-rhyhorn-opponent-shuckle.json",
    denseState: "tools/compare/evidence/rock-blast-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/rock-blast-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/rock-blast-changemap-player.json",
  },
  {
    side: "opponent-front",
    scenario: "tools/battle-lab/mechanic-rock-blast-opponent-rhyhorn-player-shuckle.json",
    denseState: "tools/compare/evidence/rock-blast-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/rock-blast-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/rock-blast-changemap-opponent.json",
  },
] as const;

const ROCK_TAG = 10058;
const IMPACT_TAG = 10135;
const SOURCE_START = 0x082d_65f7;
const SOURCE_END = 0x082d_6694;
const OWNED_TEMPLATES = [
  "gHorizontalLungeSpriteTemplate",
  "gRockBlastRockSpriteTemplate",
  "gRockFragmentSpriteTemplate",
  "gBasicHitSplatSpriteTemplate",
] as const;

const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function rgbFramesFromDirectory(directory: string, rows: readonly Json[]): Buffer[] {
  return rows.map((row) => readFileSync(resolve(directory, `${String(row.frame).padStart(5, "0")}.rgb`)));
}

function rgbFramesFromArchive(archive: string, rows: readonly Json[]): Buffer[] {
  const directory = createScratchDir("rock-blast-evidence-rgb-");
  execFileSync("tar", ["-xzf", archive, "-C", directory], { encoding: "utf8" });
  return rgbFramesFromDirectory(directory, rows);
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
    if (current[offset] === previous[offset]
      && current[offset + 1] === previous[offset + 1]
      && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function transitions(rows: readonly Json[], value: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age === 0 || !same(value(row), value(rows[age - 1]!)) ? [age] : []);
}

function ownedSprites(row: Json, symbol: string): Json[] {
  return row.sprites.filter((sprite: Json) => sprite.template?.symbol === symbol)
    .map((sprite: Json) => ({
      slot: sprite.slot, callback: sprite.callback?.symbol,
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      animNum: sprite.animNum, subpriority: sprite.subpriority,
      invisible: sprite.invisible, matrixNum: sprite.matrixNum,
      matrix: sprite.matrix, data: sprite.data, attr: sprite.attr,
    })).sort((left: Json, right: Json) => left.slot - right.slot);
}

function spriteLives(rows: readonly Json[], symbol: string): Json[] {
  const open = new Map<number, Json>();
  const lives: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Map<number, Json>(ownedSprites(row, symbol).map((sprite) => [sprite.slot, sprite]));
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
    for (const [slot] of open) if (!current.has(slot)) open.delete(slot);
  }
  return lives;
}

function tagLifetime(rows: readonly Json[], tag: number): Json {
  const ages = rows.flatMap((row, age) => row.paletteTags.includes(tag) && row.tileTags.includes(tag) ? [age] : []);
  return { tag, first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length };
}

function audioStarts(rows: readonly Json[]): Json[] {
  return rows.flatMap((row, age) => {
    const current = row.audio.SE1.songHeaderIdentity.symbol;
    const prior = age === 0 ? null : rows[age - 1]!.audio.SE1.songHeaderIdentity.symbol;
    return current && current !== prior ? [{ age, symbol: current, panX: row.audio.SE1.tracks[0]?.panX }] : [];
  });
}

function changeMap(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  invariant(probe.schema === "rock-blast-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 350,
    `${side}: probe identity drift`);
  invariant(
    rows.length === 90
      && probe.sourceWindow.frameCount === 90
      && probe.sourceWindow.sourceFrameCount === 90
      && rows[0]?.scriptOwner === "Move_ROCK_BLAST"
      && rows[0]?.scriptOffset === 0
      && rows[0]?.animScriptActive === true
      && rows.at(-1)?.scriptOwner === "Move_ROCK_BLAST"
      && rows.at(-1)?.scriptOffset === 156
      && rows.at(-1)?.animScriptActive === false
      && rows.every((row, age) => row.frame === rows[0]!.frame + age
        && row.scriptOwner === "Move_ROCK_BLAST"
        && row.scriptPtr >= SOURCE_START && row.scriptPtr < SOURCE_END
        && (row.scriptPtrParity === 0 || row.scriptPtrParity === 1)),
    `${side}: incomplete/non-owned first Rock Blast body`,
  );
  invariant(rows.every((row) => row.sprites.length <= 64 && row.tasks.length <= 16
    && row.softwareOam.length === 128 && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.paletteTags.length === 16 && row.tileTags.length === 128
    && row.parties.player.length === 3 && row.parties.opponent.length === 3),
  `${side}: dense state shape drift`);
  invariant(rgb.length === rows.length && rgb.every((frame, age) => frame.length === 240 * 160 * 3
    && sha(frame) === rows[age]!.sha256), `${side}: raw RGB receipt drift`);

  const lives = Object.fromEntries(OWNED_TEMPLATES.map((symbol) => [symbol, spriteLives(rows, symbol)]));
  const shakeAges = rows.flatMap((row, age) => row.tasks.some(
    (task: Json) => task.func?.symbol === "AnimTask_ShakeMon_Step",
  ) ? [age] : []);
  const latches = {
    oam: `${rows.slice(1).filter((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)).length}/89`,
    matrices: `${rows.slice(1).filter((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)).length}/89`,
    palette: `${rows.slice(1).filter((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)).length}/89`,
  };
  const audio = audioStarts(rows);
  const map = {
    schema: "rock-blast-normalized-change-map/v1",
    side,
    sourceWindow: probe.sourceWindow,
    pointer: probe.sourcePointerContract,
    sourceRows: rows.map((row, age) => ({
      age, frame: row.frame, pointer: row.scriptPtr, pointerParity: row.scriptPtrParity,
      offset: row.scriptOffset, wait: row.scriptWait, active: row.animScriptActive,
      visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
      ownedSprites: Object.fromEntries(OWNED_TEMPLATES.map((symbol) => [symbol, ownedSprites(row, symbol)])),
      shakeTasks: row.tasks.filter((task: Json) => task.func?.symbol === "AnimTask_ShakeMon_Step").map((task: Json) => ({
        slot: task.slot, data: task.data,
      })),
      tags: { rocks: row.paletteTags.includes(ROCK_TAG) && row.tileTags.includes(ROCK_TAG), impact: row.paletteTags.includes(IMPACT_TAG) && row.tileTags.includes(IMPACT_TAG) },
      registers: row.registers,
      ...changedPixels(rgb[age - 1], rgb[age]!),
    })),
    sprites: lives,
    tasks: { shakeMon: shakeAges },
    latches,
    resources: { rocks: tagLifetime(rows, ROCK_TAG), impact: tagLifetime(rows, IMPACT_TAG) },
    audio,
    state: {
      partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)),
      battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)),
      engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)),
      immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)),
      gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue).slice(1),
      animationRngTransitions: transitions(rows, (row) => row.animationRng).slice(1),
    },
    cleanup: {
      age: rows.length - 1,
      active: rows.at(-1)!.animScriptActive,
      visualTasks: rows.at(-1)!.visualTaskCount,
      soundTasks: rows.at(-1)!.soundTaskCount,
      ownedSprites: OWNED_TEMPLATES.reduce((count, symbol) => count + ownedSprites(rows.at(-1)!, symbol).length, 0),
      rocksTagged: rows.at(-1)!.paletteTags.includes(ROCK_TAG) || rows.at(-1)!.tileTags.includes(ROCK_TAG),
      impactTagged: rows.at(-1)!.paletteTags.includes(IMPACT_TAG) || rows.at(-1)!.tileTags.includes(IMPACT_TAG),
      currentMove: rows.at(-1)!.engine.currentMove,
      battleOutcome: rows.at(-1)!.immutableState.battleOutcome,
    },
  };

  const expectedLives = {
    gHorizontalLungeSpriteTemplate: [[3, 7, 17]],
    gRockBlastRockSpriteTemplate: [[4, 12, 37]],
    gRockFragmentSpriteTemplate: [[4, 39, 53], [5, 39, 53], [7, 39, 53], [9, 39, 53]],
    gBasicHitSplatSpriteTemplate: [[3, 39, 48]],
  };
  const pan = side === "player-back" ? [[12, "se_m_swagger", -64], [39, "se_m_rock_throw", 63]]
    : [[12, "se_m_swagger", 63], [39, "se_m_rock_throw", -63]];
  invariant(
    same(Object.fromEntries(OWNED_TEMPLATES.map((symbol) => [symbol,
      lives[symbol].map((life: Json) => [life.slot, life.start, life.end]),
    ])), expectedLives)
      && same(shakeAges, [39, 40, 41, 42, 43, 44, 45, 46])
      && same(latches, { oam: "89/89", matrices: "89/89", palette: "89/89" })
      && same(map.resources, {
        rocks: { tag: ROCK_TAG, first: 1, last: 88, count: 88 },
        impact: { tag: IMPACT_TAG, first: 4, last: 88, count: 85 },
      })
      && same(audio.slice(1).map((event: Json) => [event.age, event.symbol, event.panX]), pan)
      && map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable
      && map.state.gameplayRngTransitions.length === 0
      && map.state.animationRngTransitions.length === 89
      && map.cleanup.age === 89 && !map.cleanup.active && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0
      && map.cleanup.ownedSprites === 0 && !map.cleanup.rocksTagged && !map.cleanup.impactTagged
      && map.cleanup.currentMove === 350 && map.cleanup.battleOutcome === 0,
    `${side}: Rock Blast lifecycle/latch/cleanup contract drifted`,
  );
  return map;
}

function receiptFor(side: SidePaths, firstJson: string, firstRgb: string, repeatJson: string, repeatRgb: string): Json {
  const first = readFileSync(firstJson);
  const repeat = readFileSync(repeatJson);
  invariant(first.equals(repeat), `${side.side}: dense state is not byte-identical twice fresh`);
  const probe = JSON.parse(first.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  const firstFrames = rgbFramesFromDirectory(firstRgb, rows);
  const repeatFrames = rgbFramesFromDirectory(repeatRgb, rows);
  const rawRgb = sha(Buffer.concat(firstFrames));
  invariant(rawRgb === sha(Buffer.concat(repeatFrames)), `${side.side}: chronological raw RGB is not byte-identical twice fresh`);
  const map = Buffer.from(`${JSON.stringify(changeMap(side.side, probe, firstFrames), null, 2)}\n`);
  const densePath = resolve(root, side.denseState);
  const archivePath = resolve(root, side.rawRgbArchive);
  const mapPath = resolve(root, side.changeMap);
  mkdirSync(resolve(root, "tools/compare/evidence"), { recursive: true });
  writeFileSync(densePath, gzipSync(first));
  execFileSync("tar", ["-czf", archivePath, "-C", firstRgb, "."]);
  writeFileSync(mapPath, map);
  return {
    scenario: side.scenario, scenarioSha256: sha(readFileSync(resolve(root, side.scenario))),
    denseState: side.denseState, denseStateSha256: sha(readFileSync(densePath)),
    probeJsonSha256: sha(first), repeatProbeJsonSha256: sha(repeat),
    rawRgbArchive: side.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(archivePath)),
    rawRgbSequenceSha256: rawRgb, repeatRawRgbSequenceSha256: sha(Buffer.concat(repeatFrames)),
    changeMap: side.changeMap, changeMapSha256: sha(map), sourceWindow: probe.sourceWindow,
  };
}

function bank(args: readonly string[]): void {
  invariant(args.length === 8, "usage: rockBlastEvidence.ts --bank <player-json> <player-rgb> <player-repeat-json> <player-repeat-rgb> <opponent-json> <opponent-rgb> <opponent-repeat-json> <opponent-repeat-rgb>");
  const player = receiptFor(sides[0]!, args[0]!, args[1]!, args[2]!, args[3]!);
  const opponent = receiptFor(sides[1]!, args[4]!, args[5]!, args[6]!, args[7]!);
  const output = {
    schema: "rock-blast-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_ROCK_BLAST", moveId: 350,
    status: "checkpoint", coverageCredit: false,
    evidenceScope: {
      sourceAudit: true, completeFirstPointerBodyOnly: true, productionAnimationChanged: false,
      reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false,
      coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false,
      fullDenseRowsRetained: true, twiceFreshByteIdentical: true,
    },
    acceptance: {
      freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true,
      denseRows: { "player-back": 90, "opponent-front": 90 }, rawRgbRows: { "player-back": 90, "opponent-front": 90 },
      normalizedChangeMaps: true, productionFramebufferRows: 0, productionFramebufferResidualPixels: null,
    },
    source: {
      audit: "tools/compare/rockBlastSourceAudit.ts", auditSha256: sha(readFileSync(resolve(root, "tools/compare/rockBlastSourceAudit.ts"))),
      probe: "tools/compare/rockBlastProbe.py", probeSha256: sha(readFileSync(resolve(root, "tools/compare/rockBlastProbe.py"))),
      evidenceVerifier: "tools/compare/rockBlastEvidence.ts", evidenceVerifierSha256: sha(readFileSync(resolve(root, "tools/compare/rockBlastEvidence.ts"))),
    },
    orientations: { "player-back": player, "opponent-front": opponent },
    controls: { independent: ["MOVE_ROCK_THROW", "MOVE_ROCK_TOMB", "MOVE_ANCIENT_POWER"], statusesChanged: false },
  };
  writeFileSync(resolve(root, fixturePath), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ status: output.status, rows: output.acceptance.denseRows, fixture: fixturePath }, null, 2));
}

export function verifyRockBlastEvidence(): Json {
  const receipt = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Json;
  invariant(receipt.schema === "rock-blast-bilateral-evidence/v1" && receipt.oracleProfile === "battle-scene-on"
    && receipt.move === "MOVE_ROCK_BLAST" && receipt.moveId === 350 && receipt.status === "checkpoint" && receipt.coverageCredit === false,
  "Rock Blast receipt identity/credit drift");
  invariant(receipt.evidenceScope.completeFirstPointerBodyOnly && !receipt.evidenceScope.productionAnimationChanged
    && !receipt.evidenceScope.reducerAdded && !receipt.evidenceScope.typedSeamAdded && !receipt.evidenceScope.compositorAdded
    && !receipt.evidenceScope.framebufferCompared && receipt.acceptance.productionFramebufferRows === 0,
  "Rock Blast checkpoint must not imply reducer/seam/compositor/framebuffer acceptance");
  for (const [path, expected] of [
    [receipt.source.audit, receipt.source.auditSha256],
    [receipt.source.probe, receipt.source.probeSha256],
    [receipt.source.evidenceVerifier, receipt.source.evidenceVerifierSha256],
  ] as const) invariant(sha(readFileSync(resolve(root, path))) === expected, `${path}: source receipt drift`);
  const result: Json = {};
  for (const side of sides) {
    const item = receipt.orientations[side.side] as Json;
    for (const [path, expected] of [
      [item.scenario, item.scenarioSha256], [item.denseState, item.denseStateSha256], [item.rawRgbArchive, item.rawRgbArchiveSha256],
    ] as const) invariant(sha(readFileSync(resolve(root, path))) === expected, `${side.side}: ${path} receipt drift`);
    const dense = gunzipSync(readFileSync(resolve(root, item.denseState)));
    invariant(sha(dense) === item.probeJsonSha256 && item.probeJsonSha256 === item.repeatProbeJsonSha256,
      `${side.side}: dense twice-fresh receipt drift`);
    const probe = JSON.parse(dense.toString("utf8")) as Json;
    const rows = probe.frames as Json[];
    const rgb = rgbFramesFromArchive(resolve(root, item.rawRgbArchive), rows);
    invariant(sha(Buffer.concat(rgb)) === item.rawRgbSequenceSha256 && item.rawRgbSequenceSha256 === item.repeatRawRgbSequenceSha256,
      `${side.side}: chronological RGB twice-fresh receipt drift`);
    const map = Buffer.from(`${JSON.stringify(changeMap(side.side, probe, rgb), null, 2)}\n`);
    invariant(sha(map) === item.changeMapSha256 && readFileSync(resolve(root, item.changeMap)).equals(map),
      `${side.side}: normalized change map drift`);
    result[side.side] = {
      rows: rows.length, dense: item.probeJsonSha256, rawRgb: item.rawRgbSequenceSha256, changeMap: item.changeMapSha256,
    };
  }
  return result;
}

const bankAt = process.argv.indexOf("--bank");
if (bankAt >= 0) bank(process.argv.slice(bankAt + 1));
else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyRockBlastEvidence(), null, 2));
}
