import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { basename, resolve } from "node:path";
import { sweetScentAtAge } from "../../src/animation/sweetScent.ts";
import { createSceneOnMovePresentation, sceneOnSweetScentView } from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/sweet-scent-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

function readRows(side: Side): { probe: Json; rows: Json[] } {
  const receipt = fixture.orientations[side];
  const gzip = readFileSync(resolve(root, receipt.denseState));
  invariant(sha(gzip) === receipt.denseStateSha256, `${side}: dense archive SHA`);
  const bytes = gunzipSync(gzip);
  invariant(sha(bytes) === receipt.probeJsonSha256, `${side}: probe JSON SHA`);
  const probe = JSON.parse(bytes.toString("utf8")) as Json;
  invariant(probe.schema === "sweet-scent-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 230, `${side}: dense schema`);
  return { probe, rows: probe.frames as Json[] };
}

function readRgb(side: Side, rows: readonly Json[]): Buffer[] {
  const receipt = fixture.orientations[side];
  const path = resolve(root, receipt.rawRgbArchive);
  invariant(sha(readFileSync(path)) === receipt.rawRgbArchiveSha256, `${side}: RGB archive SHA`);
  const names = execFileSync("tar", ["-tzf", path], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", path], { maxBuffer: 64 * 1024 * 1024 });
  const frameBytes = 240 * 160 * 3;
  invariant(names.length === rows.length && bytes.length === rows.length * frameBytes, `${side}: RGB archive shape`);
  const byName = new Map(names.map((name, index) => [basename(name), bytes.subarray(index * frameBytes, (index + 1) * frameBytes)]));
  const rgb = rows.map((row) => byName.get(`${String(row.frame).padStart(5, "0")}.rgb`));
  invariant(rgb.every(Boolean), `${side}: missing RGB row`);
  const frames = rgb as Buffer[];
  invariant(sha(Buffer.concat(frames)) === receipt.rawRgbSequenceSha256, `${side}: RGB sequence SHA`);
  invariant(frames.every((frame, index) => sha(frame) === rows[index]!.sha256), `${side}: per-row RGB SHA`);
  return frames;
}

function pixelMap(rows: readonly Json[], rgb: readonly Buffer[], side: Side): string {
  const petals = (row: Json) => row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSweetScentPetalSpriteTemplate").map((sprite: Json) => ({
    slot: sprite.slot, callback: sprite.callback?.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, data: sprite.data,
  }));
  const changes = rows.map((row, age) => {
    let changedPixels = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    if (age > 0) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels += 1; const x = pixel % 240; const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return { age, frame: row.frame, scriptOffset: row.scriptOffset, active: row.animScriptActive, changedPixels,
      bounds: changedPixels ? [minX, minY, maxX, maxY] : null, petalCount: petals(row).length, petals: petals(row),
      visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
      taskFunctions: row.tasks.map((task: Json) => task.func?.symbol).filter(Boolean), animationRng: row.animationRng,
      paletteTags: row.paletteTags, tileTags: row.tileTags };
  });
  const transitions = (key: string) => rows.slice(1).flatMap((row, age) => !same(row[key], rows[age]![key]) ? [age + 1] : []);
  const predecessor = (key: string, source: string) => rows.slice(1).filter((row, age) => same(row[key], rows[age]![source])).length;
  const firstPetalRow = changes.findIndex((row) => row.petalCount > 0);
  const firstPixelRow = changes.findIndex((row) => row.changedPixels > 0);
  const lastPetalRow = changes.reduce((last, row) => row.petalCount > 0 ? row.age : last, -1);
  return `${JSON.stringify({
    schema: "sweet-scent-normalized-change-map/v1", side,
    sourceWindow: { startFrame: rows[0]!.frame, endFrame: rows.at(-1)!.frame, frameCount: rows.length },
    effectWindow: { startRow: 4, endRow: 169, frameCount: 166 },
    edgeMeasurements: { firstPetalRamRow: firstPetalRow, firstPetalDisplayRow: firstPixelRow, lastPetalRamRow: lastPetalRow, firstInactiveScriptRow: changes.findIndex((row) => !row.active) },
    latches: { hardwareOamEqualsPrecedingSoftware: `${predecessor("hardwareOam", "softwareOam")}/${rows.length - 1}`, hardwareMatricesEqualsPrecedingSoftware: `${predecessor("hardwareMatrices", "softwareMatrices")}/${rows.length - 1}`, hardwarePaletteEqualsPrecedingFaded: `${predecessor("hardwarePalette", "fadedPalette")}/${rows.length - 1}`, palettePredecessorExceptions: rows.slice(1).filter((row, age) => !same(row.hardwarePalette, rows[age]!.fadedPalette)).length },
    transitions: { animationRng: transitions("animationRng"), paletteTags: transitions("paletteTags"), tileTags: transitions("tileTags"), fadedPalette: transitions("fadedPalette"), tasks: transitions("tasks") },
    rows: changes,
  }, null, 2)}\n`;
}

function normalizedPetal(value: Json): string {
  return JSON.stringify({ x: value.x, y: value.y, x2: value.x2, y2: value.y2, animNum: value.animNum, animFrame: value.animCmdIndex ?? value.animFrame, data: (value.data ?? []).slice(0, 3) });
}

function verifyReducerAndSeam(side: Side, rows: readonly Json[]): number {
  const player = side === "player-back";
  const origin = player ? { x: 72, y: 90 } : { x: 176, y: 42 };
  const actual = (row: Json): string[] => row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSweetScentPetalSpriteTemplate").map(normalizedPetal).sort();
  let reducerMatches = 0; let seamMatches = 0;
  const battler = (which: "player" | "opponent", species: string): Json => ({ species, geometry: { side: which, spriteCorner: which === "player" ? { x: 40, y: 58 } : { x: 144, y: 10 }, animationCenter: which === "player" ? { x: 72, y: 90 } : { x: 176, y: 42 }, battlePositionCenter: which === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 } } });
  const attackerSide = player ? "player" : "opponent";
  const targetSide = player ? "opponent" : "player";
  const config = createSceneOnMovePresentation({ move: "SWEET_SCENT", attacker: battler(attackerSide, "WEEPINBELL"), target: battler(targetSide, "ONIX"), fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100, playerGender: "female", opponentGender: "male" }, animationProfile: { spriteSlots: Array.from({ length: 24 }, (_, index) => index), targetSubpriority: 2 } } as any);
  for (let age = 0; age < 166; age += 1) {
    const row = rows[age + 4]!;
    const expected = sweetScentAtAge(age, attackerSide, origin, { targetSubpriority: 2 }).petals.map(normalizedPetal).sort();
    if (same(expected, actual(row))) reducerMatches += 1;
    const seam = sceneOnSweetScentView({ ...config, age } as any);
    if (same(seam.petals.map(normalizedPetal).sort(), expected)) seamMatches += 1;
  }
  invariant(reducerMatches === 166, `${side}: reducer ${reducerMatches}/166`);
  invariant(seamMatches === 166, `${side}: typed seam ${seamMatches}/166`);
  return reducerMatches;
}

function verifyOrientation(side: Side): Json {
  const receipt = fixture.orientations[side];
  invariant(sha(readFileSync(resolve(root, receipt.scenario))) === receipt.scenarioSha256, `${side}: scenario SHA`);
  const { probe, rows } = readRows(side);
  invariant(rows.length === 175 && probe.sourceWindow.startFrame === receipt.window.startFrame && probe.sourceWindow.endFrame === receipt.window.endFrame && probe.sourceWindow.frameCount === receipt.window.frameCount, `${side}: complete pointer window`);
  invariant(rows.every((row, age) => row.frame === receipt.window.startFrame + age), `${side}: non-consecutive rows`);
  invariant(rows[0]!.scriptPtr === parseInt(fixture.source.start, 16) && rows.at(-1)!.animScriptActive === false, `${side}: pointer boundary`);
  invariant(rows.slice(0, -1).every((row) => row.animScriptActive === true), `${side}: early inactive row`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && Object.keys(row.registers).length === 21 && row.audio.SE1 && row.audio.SE2), `${side}: incomplete dense row`);
  for (const key of ["battlers", "parties", "engine", "immutableState"] as const) invariant(rows.every((row) => same(row[key], rows[0]![key])), `${side}: mutable ${key}`);
  invariant(rows.every((row) => row.immutableState.rngValue === rows[0]!.immutableState.rngValue), `${side}: gameplay RNG changed`);
  invariant(rows.slice(1).filter((row, age) => row.animationRng !== rows[age]!.animationRng).length === 174, `${side}: animation RNG transitions`);
  invariant(probe.topology.tasks.includes("AnimTask_BlendColorCycleLoop") && probe.topology.templates.includes("gSweetScentPetalSpriteTemplate") && probe.topology.callbacks.includes("AnimSweetScentPetal_Step"), `${side}: component topology`);
  const petalRows = rows.map((row) => row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSweetScentPetalSpriteTemplate"));
  invariant(petalRows.findIndex((items) => items.length > 0) === 4 && Math.max(...petalRows.map((items) => items.length)) === 13 && petalRows[169]!.length === 0, `${side}: petal lifecycle`);
  invariant(petalRows.reduce((count, items, age) => count + items.filter((item: Json) => !(petalRows[age - 1] ?? []).some((old: Json) => old.slot === item.slot)).length, 0) === 24, `${side}: 24 petal allocations`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: OAM is not RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: matrices are not preceding`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)), `${side}: palette is not RAM+1`);
  const source = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
  const block = source.slice(source.indexOf("Move_SWEET_SCENT:"), source.indexOf("Move_HYPER_BEAM:"));
  invariant(!block.includes("monbg"), `${side}: unexpected monbg command`);
  const rgb = readRgb(side, rows);
  const map = pixelMap(rows, rgb, side);
  const mapPath = resolve(root, receipt.changeMap);
  if (process.argv.includes("--write-maps")) writeFileSync(mapPath, map);
  else invariant(sha(readFileSync(mapPath)) === receipt.changeMapSha256 && readFileSync(mapPath, "utf8") === map, `${side}: normalized change map`);
  const parsedMap = JSON.parse(map) as Json;
  invariant(parsedMap.edgeMeasurements.firstPetalRamRow === 4 && parsedMap.edgeMeasurements.firstPetalDisplayRow === 5 && parsedMap.edgeMeasurements.lastPetalRamRow === 168 && parsedMap.edgeMeasurements.firstInactiveScriptRow === 174, `${side}: petal display edges`);
  const reducerRows = verifyReducerAndSeam(side, rows);
  return { orientation: side, pointerRows: rows.length, reducerRows, typedSeamRows: reducerRows, effectWindow: receipt.effectWindow, petalCreates: 24, peakPetals: 13, firstPetalRamRow: 4, firstPetalDisplayRow: 5, firstInactiveScriptRow: 174, latches: receipt.latches, gameplayRngTransitions: 0, animationRngTransitions: 174, framebufferCompared: false };
}

export function verifySweetScentEvidence(): Record<string, Json> {
  invariant(fixture.schema === "sweet-scent-bilateral-evidence/v1" && fixture.oracleProfile === "battle-scene-on" && fixture.move === "MOVE_SWEET_SCENT" && fixture.coverageCredit === false, "Sweet Scent evidence contract drift");
  invariant(fixture.evidenceScope.fullDenseRowsRetained && fixture.evidenceScope.twiceFreshByteIdentical && !fixture.evidenceScope.framebufferCompared && !fixture.evidenceScope.siblingCredit, "Sweet Scent partial scope drift");
  return { "player-back": verifyOrientation("player-back"), "opponent-front": verifyOrientation("opponent-front") };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySweetScentEvidence(), null, 2));
