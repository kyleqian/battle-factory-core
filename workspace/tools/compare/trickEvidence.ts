/**
 * Retained bilateral Scene-ON evidence bank for MOVE_TRICK.
 *
 * This is deliberately a state/raw-RGB receipt verifier, not an app
 * framebuffer comparator.  It gives a future generic compositor a complete,
 * repeatable source boundary without giving Trick animation credit early.
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
  readonly label: "player" | "opponent";
  readonly scenario: string;
  readonly denseState: string;
  readonly rawRgbArchive: string;
  readonly changeMap: string;
}>;

const root = resolve(import.meta.dirname, "../..");
const fixturePath = "tools/compare/fixtures/trick-evidence.json";
const sides: readonly SidePaths[] = [
  {
    side: "player-back", label: "player",
    scenario: "tools/compare/fixtures/trick-player-furret-opponent-chansey.json",
    denseState: "tools/compare/evidence/trick-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/trick-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/trick-changemap-player.json",
  },
  {
    side: "opponent-front", label: "opponent",
    scenario: "tools/compare/fixtures/trick-opponent-furret-player-chansey.json",
    denseState: "tools/compare/evidence/trick-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/trick-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/trick-changemap-opponent.json",
  },
] as const;
const TRICK_AUDIO_CADENCE = [
  [25, "se_m_sketch"],
  [57, "se_m_double_team"], [83, "se_m_double_team"], [101, "se_m_double_team"],
  [119, "se_m_double_team"], [137, "se_m_double_team"], [155, "se_m_double_team"],
  [173, "se_m_attract"],
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
  const directory = createScratchDir("trick-evidence-rgb-");
  const result = execFileSync("tar", ["-xzf", archive, "-C", directory], { encoding: "utf8" });
  void result;
  return rgbFramesFromDirectory(directory, rows);
}

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: 0, bounds: null };
  let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset]
      && current[offset + 1] === previous[offset + 1]
      && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function ownedSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gTrickBagSpriteTemplate")
    .map((sprite: Json) => ({
      slot: sprite.slot, callback: sprite.callback?.symbol,
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      subpriority: sprite.subpriority, invisible: sprite.invisible,
      matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data,
      attr: sprite.attr,
    })).sort((left: Json, right: Json) => left.slot - right.slot);
}

function ownedTasks(row: Json, symbol: string): Json[] {
  return row.tasks.filter((task: Json) => task.func?.symbol === symbol)
    .map((task: Json) => ({ slot: task.slot, priority: task.priority, data: task.data }));
}

function resourceLifetimes(rows: readonly Json[], tag: number): Json {
  const ages = rows.flatMap((row, age) => row.allocators.paletteTags.includes(tag)
    && row.allocators.tileTags.includes(tag) ? [age] : []);
  return { tag, first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length };
}

function transitions(rows: readonly Json[], value: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age === 0 || !same(value(row), value(rows[age - 1]!)) ? [age] : []);
}

function taskRows(rows: readonly Json[], symbol: string): Json[] {
  return rows.flatMap((row, age) => ownedTasks(row, symbol).length ? [{ age, tasks: ownedTasks(row, symbol) }] : []);
}

function audioEvents(rows: readonly Json[]): Json[] {
  return TRICK_AUDIO_CADENCE.map(([age, sourceSymbol]) => {
    const se1 = rows[age]!.audio.SE1;
    return {
      age, channel: "SE1", sourceSymbol, observedSymbol: se1.songHeaderIdentity.symbol,
      tracks: se1.tracks.map((track: Json) => ({ flags: track.flags, pan: track.pan, panX: track.panX, raw: track.raw })),
    };
  });
}

function matrixLatches(rows: readonly Json[]): Json {
  const bagRows = rows.slice(1).flatMap((row, index) => {
    const previous = rows[index]!;
    return ownedSprites(row).flatMap((sprite) => {
      const prior = ownedSprites(previous).find((entry) => entry.slot === sprite.slot);
      return prior && same(row.hardwareMatrices[sprite.matrixNum], previous.softwareMatrices[prior.matrixNum])
        ? [sprite.slot] : [];
    });
  });
  const stretch = ["attacker", "target"].flatMap((battler) => rows.flatMap((row, age) => {
    const sprite = row.battlerSprites[battler];
    const live = ownedTasks(row, battler === "attacker" ? "AnimTask_StretchAttackerUp" : "AnimTask_StretchTargetUp").length > 0;
    const source = age >= 2 ? rows[age - 2]!.battlerSprites[battler] : null;
    return live && age >= 27 && source && same(row.hardwareMatrices[sprite.matrixNum], source.matrix) ? [age] : [];
  }));
  return {
    all: rows.slice(1).filter((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)).length,
    bags: bagRows.length,
    stretchTwoFrameRows: stretch,
  };
}

export function trickChangeMap(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  invariant(rows.length === 225 && rows[0]?.scriptOwner === "Move_TRICK"
    && rows[0]?.scriptOffset === 0 && rows.at(-1)?.animScriptActive === false,
  `${side}: incomplete pointer-owned Trick window`);
  invariant(rows.every((row, age) => row.frame === rows[0]!.frame + age
    && row.scriptOwner === "Move_TRICK" && row.sprites.length <= 64 && row.tasks.length <= 16
    && row.spriteOrder.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.unfadedPalette.length === 512 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.allocators.paletteTags.length === 16 && row.allocators.tileTags.length === 64
    && row.parties.player.length === 3 && row.parties.opponent.length === 3), `${side}: retained row shape drift`);
  invariant(rgb.length === rows.length && rgb.every((frame, age) => frame.length === 240 * 160 * 3
    && sha(frame) === rows[age]!.sha256), `${side}: raw RGB row receipt drift`);
  const allBags: Json[] = rows.flatMap((row, age) => ownedSprites(row).map((sprite) => ({ age, ...sprite })));
  const lives = new Map<number, Json>();
  for (const bag of allBags) {
    const life = lives.get(bag.slot) ?? { slot: bag.slot, start: bag.age, end: bag.age, states: [] as Json[] };
    life.end = bag.age;
    life.states.push({ age: bag.age, callback: bag.callback, x: bag.x, y: bag.y, x2: bag.x2, y2: bag.y2, subpriority: bag.subpriority, invisible: bag.invisible, matrix: bag.matrix, data: bag.data });
    lives.set(bag.slot, life);
  }
  const itemBag = resourceLifetimes(rows, 10224);
  const speedDust = resourceLifetimes(rows, 10207);
  return {
    schema: "trick-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    sourceRows: rows.map((row, age) => ({ age, frame: row.frame, offset: row.scriptOffset, pointerParity: row.scriptPtrParity, wait: row.scriptWait, active: row.animScriptActive, sha256: row.sha256, ...changedPixels(rgb[age - 1], rgb[age]!) })),
    bags: [...lives.values()],
    tasks: {
      stretchTarget: taskRows(rows, "AnimTask_StretchTargetUp"),
      stretchAttacker: taskRows(rows, "AnimTask_StretchAttackerUp"),
      shake: taskRows(rows, "AnimTask_ShakeMon_Step"),
    },
    audio: audioEvents(rows),
    resources: {
      itemBag,
      speedDust,
      speedDustSprites: rows.flatMap((row) => row.sprites).filter(
        (sprite: Json) => sprite.template?.symbol === "gSpeedDustSpriteTemplate",
      ).length,
    },
    latches: {
      oam: rows.slice(1).filter((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)).length,
      palette: rows.slice(1).filter((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)).length,
      matrices: matrixLatches(rows),
      fadedTransitions: transitions(rows, (row) => row.fadedPalette),
      hardwarePaletteTransitions: transitions(rows, (row) => row.hardwarePalette),
    },
    state: {
      partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)),
      engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)),
      semanticStable: rows.every((row) => same(row.semanticState, rows[0]!.semanticState)),
      gameplayRngTransitions: transitions(rows, (row) => row.gameplayRng).slice(1),
      animationRngTransitions: transitions(rows, (row) => row.animationRng).slice(1),
    },
    cleanup: {
      age: rows.length - 1, active: rows.at(-1)!.animScriptActive,
      visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount,
      bags: ownedSprites(rows.at(-1)!).length,
      itemBag: rows.at(-1)!.allocators.paletteTags.includes(10224) || rows.at(-1)!.allocators.tileTags.includes(10224),
      speedDust: rows.at(-1)!.allocators.paletteTags.includes(10207) || rows.at(-1)!.allocators.tileTags.includes(10207),
    },
  };
}

function receiptFor(side: SidePaths, firstJson: string, firstRgb: string, repeatJson: string, repeatRgb: string): Json {
  const first = readFileSync(firstJson);
  const repeat = readFileSync(repeatJson);
  invariant(first.equals(repeat), `${side.side}: dense probe did not reproduce byte-identically`);
  const probe = JSON.parse(first.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  const firstFrames = rgbFramesFromDirectory(firstRgb, rows);
  const repeatFrames = rgbFramesFromDirectory(repeatRgb, rows);
  const firstRgbSequence = sha(Buffer.concat(firstFrames));
  invariant(firstRgbSequence === sha(Buffer.concat(repeatFrames)), `${side.side}: raw RGB sequence did not reproduce byte-identically`);
  const densePath = resolve(root, side.denseState);
  const archivePath = resolve(root, side.rawRgbArchive);
  const mapPath = resolve(root, side.changeMap);
  mkdirSync(resolve(root, "tools/compare/evidence"), { recursive: true });
  writeFileSync(densePath, gzipSync(first));
  execFileSync("tar", ["-czf", archivePath, "-C", firstRgb, "."]);
  const map = Buffer.from(`${JSON.stringify(trickChangeMap(side.side, probe, firstFrames), null, 2)}\n`);
  writeFileSync(mapPath, map);
  return {
    scenario: side.scenario, scenarioSha256: sha(readFileSync(resolve(root, side.scenario)),),
    denseState: side.denseState, denseStateSha256: sha(readFileSync(densePath)),
    probeJsonSha256: sha(first), repeatProbeJsonSha256: sha(repeat),
    rawRgbArchive: side.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(archivePath)),
    rawRgbSequenceSha256: firstRgbSequence, repeatRawRgbSequenceSha256: sha(Buffer.concat(repeatFrames)),
    changeMap: side.changeMap, changeMapSha256: sha(map), sourceWindow: probe.sourceWindow,
  };
}

function bank(args: readonly string[]): void {
  invariant(args.length === 8, "usage: trickEvidence.ts --bank <player-json> <player-rgb> <player-repeat-json> <player-repeat-rgb> <opponent-json> <opponent-rgb> <opponent-repeat-json> <opponent-repeat-rgb>");
  const player = receiptFor(sides[0]!, args[0]!, args[1]!, args[2]!, args[3]!);
  const opponent = receiptFor(sides[1]!, args[4]!, args[5]!, args[6]!, args[7]!);
  const output: Json = {
    schema: "trick-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_TRICK", moveId: 271,
    status: "checkpoint", coverageCredit: false,
    evidenceScope: { productionAnimationChanged: false, reducerAdded: true, typedSeamAdded: true, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, fullDenseRowsRetained: true, twiceFreshByteIdentical: true },
    acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 225, "opponent-front": 225 }, rawRgbRows: { "player-back": 225, "opponent-front": 225 }, normalizedChangeMaps: true, reducerRows: { "player-back": 225, "opponent-front": 225 }, typedSeamRows: { "player-back": 225, "opponent-front": 225 }, productionFramebufferRows: 0, productionFramebufferResidualPixels: null },
    source: {
      audit: "tools/compare/trickSourceAudit.ts", auditSha256: sha(readFileSync(resolve(root, "tools/compare/trickSourceAudit.ts"))),
      probe: "tools/compare/trickProbe.py", probeSha256: sha(readFileSync(resolve(root, "tools/compare/trickProbe.py"))),
      evidenceVerifier: "tools/compare/trickEvidence.ts", evidenceVerifierSha256: sha(readFileSync(resolve(root, "tools/compare/trickEvidence.ts"))),
    },
    orientations: { "player-back": player, "opponent-front": opponent },
  };
  writeFileSync(resolve(root, fixturePath), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ status: output.status, rows: output.acceptance.denseRows, fixture: fixturePath }, null, 2));
}

export function verifyTrickEvidence(): Json {
  const receipt = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Json;
  invariant(receipt.schema === "trick-bilateral-evidence/v1" && receipt.oracleProfile === "battle-scene-on"
    && receipt.move === "MOVE_TRICK" && receipt.status === "checkpoint" && receipt.coverageCredit === false,
  "Trick receipt identity/credit drift");
  invariant(receipt.evidenceScope.productionAnimationChanged === false && receipt.evidenceScope.compositorAdded === false
    && receipt.evidenceScope.framebufferCompared === false && receipt.acceptance.productionFramebufferRows === 0,
  "Trick checkpoint must not imply compositor/framebuffer acceptance");
  for (const path of [receipt.source.audit, receipt.source.probe, receipt.source.evidenceVerifier] as string[]) {
    const expected = path === receipt.source.audit ? receipt.source.auditSha256
      : path === receipt.source.probe ? receipt.source.probeSha256 : receipt.source.evidenceVerifierSha256;
    invariant(sha(readFileSync(resolve(root, path))) === expected, `${path}: source receipt drift`);
  }
  const results: Json = {};
  for (const side of sides) {
    const item = receipt.orientations[side.side] as Json;
    for (const [path, expected] of [[item.scenario, item.scenarioSha256], [item.denseState, item.denseStateSha256], [item.rawRgbArchive, item.rawRgbArchiveSha256]] as const) {
      invariant(sha(readFileSync(resolve(root, path))) === expected, `${side.side}: ${path} receipt drift`);
    }
    const compressed = readFileSync(resolve(root, item.denseState));
    const dense = gunzipSync(compressed);
    invariant(sha(dense) === item.probeJsonSha256 && item.probeJsonSha256 === item.repeatProbeJsonSha256, `${side.side}: dense twice-fresh receipt drift`);
    const probe = JSON.parse(dense.toString("utf8")) as Json;
    const rows = probe.frames as Json[];
    invariant(probe.schema === "trick-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 271
      && same(probe.sourceWindow, item.sourceWindow) && rows.length === 225 && rows[0]!.scriptOffset === 0
      && rows.at(-1)!.animScriptActive === false && rows.at(-1)!.scriptOffset === 125,
    `${side.side}: complete source/cleanup contract drift`);
    const rgb = rgbFramesFromArchive(resolve(root, item.rawRgbArchive), rows);
    invariant(sha(Buffer.concat(rgb)) === item.rawRgbSequenceSha256 && item.rawRgbSequenceSha256 === item.repeatRawRgbSequenceSha256,
      `${side.side}: raw RGB twice-fresh receipt drift`);
    const map = Buffer.from(`${JSON.stringify(trickChangeMap(side.side, probe, rgb), null, 2)}\n`);
    invariant(sha(map) === item.changeMapSha256 && readFileSync(resolve(root, item.changeMap)).equals(map), `${side.side}: normalized change map drift`);
    results[side.side] = { rows: rows.length, dense: item.probeJsonSha256, rawRgb: item.rawRgbSequenceSha256, changeMap: item.changeMapSha256 };
  }
  return results;
}

const bankAt = process.argv.indexOf("--bank");
if (bankAt >= 0) bank(process.argv.slice(bankAt + 1));
else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyTrickEvidence(), null, 2));
}
