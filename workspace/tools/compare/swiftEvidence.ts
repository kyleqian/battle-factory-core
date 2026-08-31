/** Strict bilateral dense evidence bank for MOVE_SWIFT. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type SidePaths = Readonly<{
  side: Side;
  scenario: string;
  denseState: string;
  rawRgbArchive: string;
  changeMap: string;
  rows: number;
  startFrame: number;
  endFrame: number;
}>;

const root = resolve(import.meta.dirname, "../..");
const fixturePath = "tools/compare/fixtures/swift-evidence.json";
const sides: readonly SidePaths[] = [
  {
    side: "player-back",
    scenario: "tools/battle-lab/mechanic-swift-player-staryu-opponent-onix.json",
    denseState: "tools/compare/evidence/swift-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/swift-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/swift-changemap-player.json",
    rows: 78,
    startFrame: 69,
    endFrame: 146,
  },
  {
    side: "opponent-front",
    scenario: "tools/battle-lab/mechanic-swift-opponent-staryu-player-onix.json",
    denseState: "tools/compare/evidence/swift-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/swift-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/swift-changemap-opponent.json",
    rows: 80,
    startFrame: 73,
    endFrame: 152,
  },
] as const;

const YELLOW_STAR_TAG = 10174;
const IMPACT_TAG = 10135;
const SOURCE_START = 0x082c_97a9;
const SOURCE_END = 0x082c_9862;
const STAR = "gSwiftStarSpriteTemplate";
const SHAKE = "AnimTask_ShakeMon2_Step";
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function rgbFramesFromDirectory(directory: string, rows: readonly Json[]): Buffer[] {
  return rows.map((row) => readFileSync(resolve(directory, `${String(row.frame).padStart(5, "0")}.rgb`)));
}

function rgbFramesFromArchive(archive: string, rows: readonly Json[]): Buffer[] {
  const directory = createScratchDir("swift-evidence-rgb-");
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

function ownedStars(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => sprite.template?.symbol === STAR).map((sprite: Json) => ({
    slot: sprite.slot,
    callback: sprite.callback?.symbol,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    animNum: sprite.animNum,
    subpriority: sprite.subpriority,
    invisible: sprite.invisible,
    matrixNum: sprite.matrixNum,
    matrix: sprite.matrix,
    data: sprite.data,
    attr: sprite.attr,
  })).sort((left: Json, right: Json) => left.slot - right.slot);
}

function starLives(rows: readonly Json[]): Json[] {
  const open = new Map<number, Json>();
  const lives: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Map<number, Json>(ownedStars(row).map((sprite) => [sprite.slot, sprite]));
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

function changeMap(side: SidePaths, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  invariant(probe.schema === "swift-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 129,
    `${side.side}: probe identity drift`);
  invariant(
    rows.length === side.rows
      && probe.sourceWindow.startFrame === side.startFrame
      && probe.sourceWindow.endFrame === side.endFrame
      && probe.sourceWindow.frameCount === side.rows
      && probe.sourceWindow.sourceFrameCount === side.rows
      && rows[0]?.scriptOwner === "Move_SWIFT"
      && rows[0]?.scriptOffset === 0
      && rows[0]?.animScriptActive === true
      && rows.at(-1)?.scriptOwner === "Move_SWIFT"
      && rows.at(-1)?.scriptOffset === SOURCE_END - SOURCE_START - 1
      && rows.at(-1)?.animScriptActive === false
      && rows.every((row, age) => row.frame === side.startFrame + age
        && row.scriptOwner === "Move_SWIFT"
        && row.scriptPtr >= SOURCE_START && row.scriptPtr < SOURCE_END
        && (row.scriptPtrParity === 0 || row.scriptPtrParity === 1)),
    `${side.side}: incomplete/non-owned Swift body`,
  );
  invariant(rows.every((row) => row.sprites.length <= 64 && row.tasks.length <= 16
    && row.softwareOam.length === 128 && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.paletteTags.length === 16 && row.tileTags.length === 128
    && row.parties.player.length === 3 && row.parties.opponent.length === 3),
  `${side.side}: dense state shape drift`);
  invariant(rgb.length === rows.length && rgb.every((frame, age) => frame.length === 240 * 160 * 3
    && sha(frame) === rows[age]!.sha256), `${side.side}: raw RGB receipt drift`);

  const lives = starLives(rows);
  const shakeAges = rows.flatMap((row, age) => row.tasks.some(
    (task: Json) => task.func?.symbol === SHAKE,
  ) ? [age] : []);
  const target = rows[0]!.animationBattlers.target;
  const targetSprite = rows[0]!.animationBattlers.spriteIds[target];
  const selectedBg = side.side === "player-back" ? "bg1hofs" : "bg2hofs";
  const expectedPan = side.side === "player-back" ? -64 : 63;
  const launchAges = [10, 17, 24, 31, 38];
  const latches = {
    oam: `${rows.slice(1).filter((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)).length}/${rows.length - 1}`,
    matrices: `${rows.slice(1).filter((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)).length}/${rows.length - 1}`,
    palette: `${rows.slice(1).filter((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)).length}/${rows.length - 1}`,
  };
  const map = {
    schema: "swift-normalized-change-map/v1",
    side: side.side,
    sourceWindow: probe.sourceWindow,
    pointer: probe.sourcePointerContract,
    selectors: {
      attacker: rows[0]!.animationBattlers.attacker,
      target,
      targetSprite,
      singlesPartnerTaskAborted: true,
      selectedMonBgRegister: selectedBg,
    },
    sourceRows: rows.map((row, age) => ({
      age,
      frame: row.frame,
      pointer: row.scriptPtr,
      pointerParity: row.scriptPtrParity,
      offset: row.scriptOffset,
      wait: row.scriptWait,
      active: row.animScriptActive,
      visualTaskCount: row.visualTaskCount,
      soundTaskCount: row.soundTaskCount,
      stars: ownedStars(row),
      shakeTasks: row.tasks.filter((task: Json) => task.func?.symbol === SHAKE).map((task: Json) => ({ slot: task.slot, data: task.data })),
      targetAxes: { x2: row.battlerSprites.target.x2, y2: row.battlerSprites.target.y2 },
      selectedBgOffset: row.registers[selectedBg],
      tags: {
        yellowStar: row.paletteTags.includes(YELLOW_STAR_TAG) && row.tileTags.includes(YELLOW_STAR_TAG),
        impact: row.paletteTags.includes(IMPACT_TAG) && row.tileTags.includes(IMPACT_TAG),
      },
      registers: row.registers,
      audio: { song: row.audio.SE1.songHeaderIdentity.symbol, panX: row.audio.SE1.tracks[0]?.panX },
      ...changedPixels(rgb[age - 1], rgb[age]!),
    })),
    sprites: { swiftStars: lives },
    tasks: { shakeMon2: shakeAges },
    latches,
    resources: { yellowStar: tagLifetime(rows, YELLOW_STAR_TAG), impact: tagLifetime(rows, IMPACT_TAG) },
    transitions: {
      targetX2: transitions(rows, (row) => row.battlerSprites.target.x2),
      selectedBgOffset: transitions(rows, (row) => row.registers[selectedBg]),
      blendControl: transitions(rows, (row) => [row.registers.bldcnt, row.registers.bldalpha]),
    },
    audio: { launchAges, song: "se_m_swift", panX: expectedPan },
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
      stars: ownedStars(rows.at(-1)!).length,
      yellowStarTagged: rows.at(-1)!.paletteTags.includes(YELLOW_STAR_TAG) || rows.at(-1)!.tileTags.includes(YELLOW_STAR_TAG),
      impactTagged: rows.at(-1)!.paletteTags.includes(IMPACT_TAG) || rows.at(-1)!.tileTags.includes(IMPACT_TAG),
      currentMove: rows.at(-1)!.engine.currentMove,
      battleOutcome: rows.at(-1)!.immutableState.battleOutcome,
    },
  };

  const expectedLives = side.side === "player-back"
    ? [[3, 10, 43], [4, 17, 50], [5, 24, 57], [7, 31, 64], [9, 38, 71]]
    : [[3, 10, 45], [4, 17, 52], [5, 24, 59], [7, 31, 66], [9, 38, 73]];
  const denominator = rows.length - 1;
  const expectedPalette = `${denominator - 1}/${denominator}`;
  invariant(
    same(lives.map((life: Json) => [life.slot, life.start, life.end]), expectedLives)
      && same(shakeAges, Array.from({ length: 34 }, (_, index) => index + 24))
      && same(latches, { oam: `${denominator}/${denominator}`, matrices: `${denominator}/${denominator}`, palette: expectedPalette })
      && same(map.resources, {
        yellowStar: { tag: YELLOW_STAR_TAG, first: 1, last: rows.length - 2, count: rows.length - 2 },
        impact: { tag: IMPACT_TAG, first: 4, last: rows.length - 2, count: rows.length - 5 },
      })
      && launchAges.every((age) => rows[age]!.audio.SE1.songHeaderIdentity.symbol === "se_m_swift"
        && rows[age]!.audio.SE1.tracks[0]?.panX === expectedPan)
      && map.transitions.targetX2.at(-1) === 58
      && map.transitions.selectedBgOffset.at(-1) === rows.length - 1
      && map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable
      && map.state.gameplayRngTransitions.length === 0
      && map.state.animationRngTransitions.length === rows.length - 3
      && map.cleanup.age === rows.length - 1 && !map.cleanup.active && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0
      && map.cleanup.stars === 0 && !map.cleanup.yellowStarTagged && !map.cleanup.impactTagged
      && map.cleanup.currentMove === 129 && map.cleanup.battleOutcome === 0,
    `${side.side}: Swift lifecycle/latch/selector/panning/cleanup contract drifted`,
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
  const map = Buffer.from(`${JSON.stringify(changeMap(side, probe, firstFrames), null, 2)}\n`);
  const densePath = resolve(root, side.denseState);
  const archivePath = resolve(root, side.rawRgbArchive);
  const mapPath = resolve(root, side.changeMap);
  mkdirSync(resolve(root, "tools/compare/evidence"), { recursive: true });
  writeFileSync(densePath, gzipSync(first));
  execFileSync("tar", ["-czf", archivePath, "-C", firstRgb, "."]);
  writeFileSync(mapPath, map);
  return {
    scenario: side.scenario,
    scenarioSha256: sha(readFileSync(resolve(root, side.scenario))),
    denseState: side.denseState,
    denseStateSha256: sha(readFileSync(densePath)),
    probeJsonSha256: sha(first),
    repeatProbeJsonSha256: sha(repeat),
    rawRgbArchive: side.rawRgbArchive,
    rawRgbArchiveSha256: sha(readFileSync(archivePath)),
    rawRgbSequenceSha256: rawRgb,
    repeatRawRgbSequenceSha256: sha(Buffer.concat(repeatFrames)),
    changeMap: side.changeMap,
    changeMapSha256: sha(map),
    sourceWindow: probe.sourceWindow,
  };
}

function bank(args: readonly string[]): void {
  invariant(args.length === 8, "usage: swiftEvidence.ts --bank <player-json> <player-rgb> <player-repeat-json> <player-repeat-rgb> <opponent-json> <opponent-rgb> <opponent-repeat-json> <opponent-repeat-rgb>");
  const player = receiptFor(sides[0]!, args[0]!, args[1]!, args[2]!, args[3]!);
  const opponent = receiptFor(sides[1]!, args[4]!, args[5]!, args[6]!, args[7]!);
  const output = {
    schema: "swift-bilateral-evidence/v1",
    oracleProfile: "battle-scene-on",
    move: "MOVE_SWIFT",
    moveId: 129,
    status: "checkpoint",
    coverageCredit: false,
    evidenceScope: {
      sourceAudit: true,
      completePointerBody: true,
      productionAnimationChanged: false,
      reducerAdded: false,
      typedSeamAdded: false,
      compositorAdded: false,
      framebufferCompared: false,
      coveragePromotion: false,
      boundaryOrBarrierChanged: false,
      gameplayStateOwned: false,
      fullDenseRowsRetained: true,
      twiceFreshByteIdentical: true,
    },
    acceptance: {
      freshRunsPerOrientation: 2,
      firstInactiveCleanupRetained: true,
      denseRows: { "player-back": 78, "opponent-front": 80 },
      rawRgbRows: { "player-back": 78, "opponent-front": 80 },
      normalizedChangeMaps: true,
      productionFramebufferRows: 0,
      productionFramebufferResidualPixels: null,
    },
    source: {
      audit: "tools/compare/swiftSourceAudit.ts",
      auditSha256: sha(readFileSync(resolve(root, "tools/compare/swiftSourceAudit.ts"))),
      probe: "tools/compare/swiftProbe.py",
      probeSha256: sha(readFileSync(resolve(root, "tools/compare/swiftProbe.py"))),
      evidenceVerifier: "tools/compare/swiftEvidence.ts",
      evidenceVerifierSha256: sha(readFileSync(resolve(root, "tools/compare/swiftEvidence.ts"))),
    },
    orientations: { "player-back": player, "opponent-front": opponent },
    controls: { independent: ["MOVE_ANCIENT_POWER", "MOVE_METEOR_MASH", "MOVE_MAGICAL_LEAF"], statusesChanged: false },
  };
  writeFileSync(resolve(root, fixturePath), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ status: output.status, rows: output.acceptance.denseRows, fixture: fixturePath }, null, 2));
}

export function verifySwiftEvidence(): Json {
  const receipt = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Json;
  invariant(receipt.schema === "swift-bilateral-evidence/v1" && receipt.oracleProfile === "battle-scene-on"
    && receipt.move === "MOVE_SWIFT" && receipt.moveId === 129 && receipt.status === "checkpoint" && receipt.coverageCredit === false,
  "Swift receipt identity/credit drift");
  invariant(receipt.evidenceScope.completePointerBody && !receipt.evidenceScope.productionAnimationChanged
    && !receipt.evidenceScope.reducerAdded && !receipt.evidenceScope.typedSeamAdded && !receipt.evidenceScope.compositorAdded
    && !receipt.evidenceScope.framebufferCompared && !receipt.evidenceScope.coveragePromotion
    && receipt.acceptance.productionFramebufferRows === 0 && receipt.acceptance.productionFramebufferResidualPixels === null,
  "Swift evidence-only checkpoint drift");
  for (const [path, expected] of [
    [receipt.source.audit, receipt.source.auditSha256],
    [receipt.source.probe, receipt.source.probeSha256],
    [receipt.source.evidenceVerifier, receipt.source.evidenceVerifierSha256],
  ] as const) invariant(sha(readFileSync(resolve(root, path))) === expected, `${path}: source receipt drift`);
  const result: Json = {};
  for (const side of sides) {
    const item = receipt.orientations[side.side] as Json;
    for (const [path, expected] of [
      [item.scenario, item.scenarioSha256],
      [item.denseState, item.denseStateSha256],
      [item.rawRgbArchive, item.rawRgbArchiveSha256],
    ] as const) invariant(sha(readFileSync(resolve(root, path))) === expected, `${side.side}: ${path} receipt drift`);
    const dense = gunzipSync(readFileSync(resolve(root, item.denseState)));
    invariant(sha(dense) === item.probeJsonSha256 && item.probeJsonSha256 === item.repeatProbeJsonSha256,
      `${side.side}: dense twice-fresh receipt drift`);
    const probe = JSON.parse(dense.toString("utf8")) as Json;
    const rows = probe.frames as Json[];
    const rgb = rgbFramesFromArchive(resolve(root, item.rawRgbArchive), rows);
    invariant(sha(Buffer.concat(rgb)) === item.rawRgbSequenceSha256 && item.rawRgbSequenceSha256 === item.repeatRawRgbSequenceSha256,
      `${side.side}: chronological RGB twice-fresh receipt drift`);
    const map = Buffer.from(`${JSON.stringify(changeMap(side, probe, rgb), null, 2)}\n`);
    invariant(sha(map) === item.changeMapSha256 && readFileSync(resolve(root, item.changeMap)).equals(map),
      `${side.side}: normalized change map drift`);
    result[side.side] = {
      rows: rows.length,
      dense: item.probeJsonSha256,
      rawRgb: item.rawRgbSequenceSha256,
      changeMap: item.changeMapSha256,
    };
  }
  return result;
}

const bankAt = process.argv.indexOf("--bank");
if (bankAt >= 0) bank(process.argv.slice(bankAt + 1));
else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifySwiftEvidence(), null, 2));
}
