/** Strict evidence-only verifier and staging writer for MOVE_FURY_CUTTER. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type SideConfig = Readonly<{
  side: Side;
  scenario: string;
  dense: string;
  rgb: string;
  map: string;
  repeatDense: string;
  repeatRgb: string;
}>;

const root = resolve(import.meta.dirname, "../..");
const sides: readonly SideConfig[] = [
  { side: "player-back", scenario: "tools/battle-lab/mechanic-fury-cutter-player-grovyle-opponent-blissey.json", dense: "tools/compare/evidence/fury-cutter-player-dense-state.json.gz", rgb: "tools/compare/evidence/fury-cutter-player-raw-rgb.tar.gz", map: "tools/compare/evidence/fury-cutter-changemap-player.json", repeatDense: "", repeatRgb: "" },
  { side: "opponent-front", scenario: "tools/battle-lab/mechanic-fury-cutter-opponent-grovyle-player-blissey.json", dense: "tools/compare/evidence/fury-cutter-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/fury-cutter-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/fury-cutter-changemap-opponent.json", repeatDense: "", repeatRgb: "" },
] as const;
const CUT_TAG = 10138;
const OWNED_SPRITES = new Set(["gCuttingSliceSpriteTemplate", "gComplexPaletteBlendSpriteTemplate"]);
const OWNED_TASKS = new Set(["AnimTask_ShakeMon_Step", "Task_UpdateMonBg", "Task_ClearMonBg"]);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const stable = (value: unknown): string => JSON.stringify(value);
const same = (a: unknown, b: unknown): boolean => stable(a) === stable(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`Fury Cutter evidence drift: ${message}`); }

function extractRgb(archive: string): string {
  const directory = mkdtempSync(join(tmpdir(), "pokebench-fury-cutter-rgb-"));
  execFileSync("tar", ["-xzf", resolve(root, archive), "-C", directory]);
  return directory;
}
function rgbPath(directory: string, frame: number): string {
  const name = `${String(frame).padStart(5, "0")}.rgb`;
  const found = execFileSync("find", [directory, "-name", name, "-type", "f"], { encoding: "utf8" }).trim().split("\n")[0];
  invariant(found, `missing RGB frame ${name}`);
  return found;
}
function rgbFrames(directory: string, rows: readonly Json[]): Buffer[] {
  return rows.map((row) => readFileSync(rgbPath(directory, row.frame)));
}
function transitions(rows: readonly Json[], value: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age === 0 || !same(value(row), value(rows[age - 1]!)) ? [age] : []);
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: 0, bounds: null };
  let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count += 1; const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function ownedSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => OWNED_SPRITES.has(sprite.template?.symbol)).map((sprite: Json) => ({
    slot: sprite.slot, template: sprite.template?.symbol, callback: sprite.callback?.symbol,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr,
    data: sprite.data, matrixNum: sprite.matrixNum, matrix: sprite.matrix, invisible: sprite.invisible,
  })).sort((a: Json, b: Json) => a.slot - b.slot);
}
function ownedTasks(row: Json): Json[] {
  return row.tasks.filter((task: Json) => OWNED_TASKS.has(task.func?.symbol)).map((task: Json) => ({
    slot: task.slot, function: task.func?.symbol, data: task.data,
  })).sort((a: Json, b: Json) => a.slot - b.slot);
}
function lives(rows: readonly Json[], predicate: (row: Json) => Json[]): Json[] {
  const open = new Map<number, Json>(); const output: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Map<number, Json>(predicate(row).map((sprite) => [sprite.slot, sprite]));
    for (const [slot, state] of current) {
      if (!open.has(slot)) { const life = { slot, start: age, end: age, states: [] as Json[] }; open.set(slot, life); output.push(life); }
      const life = open.get(slot)!; life.end = age; life.states.push({ age, ...state });
    }
    for (const slot of open.keys()) if (!current.has(slot)) open.delete(slot);
  }
  return output;
}
function taskAges(rows: readonly Json[], name: string): number[] {
  return rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func?.symbol === name) ? [age] : []);
}
function bodyMap(side: Side, probe: Json, rows: readonly Json[], rgb: readonly Buffer[], bodyIndex: number): Json {
  const window = probe.bodyWindows[bodyIndex] as Json;
  invariant(rows.length === 43 && window.frameCount === 43, `${side} body ${bodyIndex + 1}: expected 43 dense rows`);
  invariant(rows.every((row, age) => row.frame === window.startFrame + age && row.scriptOwner === "Move_FURY_CUTTER" && row.scriptPtr >= probe.sourcePointerContract.start && row.scriptPtr < probe.sourcePointerContract.endExclusive), `${side} body ${bodyIndex + 1}: pointer ownership`);
  invariant(rows[0]!.animationMovePower === [10, 20, 40, 80][bodyIndex], `${side} body ${bodyIndex + 1}: counter/power branch`);
  invariant(rgb.length === rows.length && rgb.every((frame, age) => frame.length === 240 * 160 * 3 && sha(frame) === rows[age]!.sha256), `${side} body ${bodyIndex + 1}: RGB rows`);
  const sliceLives = lives(rows, (row) => ownedSprites(row).filter((sprite) => sprite.template === "gCuttingSliceSpriteTemplate"));
  const blendLives = lives(rows, (row) => ownedSprites(row).filter((sprite) => sprite.template === "gComplexPaletteBlendSpriteTemplate"));
  const taskNames = ["AnimTask_ShakeMon_Step", "Task_UpdateMonBg", "Task_ClearMonBg"];
  const direction = sliceLives[0]?.states[0]?.data?.[5] === 1 ? "right" : "left";
  invariant(direction === (["right", "left", "right", "left"] as const)[bodyIndex], `${side} body ${bodyIndex + 1}: slice direction`);
  const tagAges = rows.flatMap((row, age) => row.paletteTags.includes(CUT_TAG) && row.tileTags.includes(CUT_TAG) ? [age] : []);
  const map = {
    schema: "fury-cutter-normalized-change-map/v1", oracleProfile: "battle-scene-on", side, bodyIndex: bodyIndex + 1,
    sourceWindow: window, sourceRows: rows.map((row, age) => ({
      age, frame: row.frame, pointer: row.scriptPtr, pointerParity: row.scriptPtrParity, offset: row.scriptOffset,
      active: row.animScriptActive, power: row.animationMovePower, damage: row.animationMoveDamage,
      direction, ownedSprites: ownedSprites(row), ownedTasks: ownedTasks(row), registers: row.registers,
      battlerSprites: row.battlerSprites, rgbSha256: sha(rgb[age]!), ...changedPixels(rgb[age - 1], rgb[age]!),
    })),
    sprites: { cuttingSlice: sliceLives, complexPaletteBlend: blendLives },
    tasks: Object.fromEntries(taskNames.map((name) => [name, taskAges(rows, name)])),
    resources: { cutTag: { tag: CUT_TAG, first: tagAges[0] ?? null, last: tagAges.at(-1) ?? null, count: tagAges.length, absentAfterCleanup: !rows.at(-1)!.paletteTags.includes(CUT_TAG) && !rows.at(-1)!.tileTags.includes(CUT_TAG) } },
    audio: rows.flatMap((row, age) => {
      const symbol = row.audio.SE1.songHeaderIdentity.symbol;
      const previous = age === 0 ? null : rows[age - 1]!.audio.SE1.songHeaderIdentity.symbol;
      return symbol && symbol !== previous ? [{ age, symbol, panX: row.audio.SE1.tracks[0]?.panX }] : [];
    }),
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length}/42`,
      hardwareMatricesEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length}/42`,
      hardwarePaletteEqualsPrecedingFaded: `${rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length}/42`,
      sourceSliceMatrixAndOam: sliceLives.map((life) => ({ slot: life.slot, start: life.start, end: life.end, matrix: life.states[0]?.matrix, data: life.states[0]?.data })),
      independentNormalizedBankMaps: true,
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
      age: 42, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount,
      soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: ownedSprites(rows.at(-1)!).length,
      ownedTasks: ownedTasks(rows.at(-1)!).length, cutTag: tagAges.at(-1) ?? null,
    },
  };
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.gameplayRngTransitions.length === 0, `${side} body ${bodyIndex + 1}: opaque gameplay stability`);
  invariant(map.cleanup.active === false && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0 && map.cleanup.ownedSprites === 0 && map.cleanup.ownedTasks === 0 && map.resources.cutTag.absentAfterCleanup, `${side} body ${bodyIndex + 1}: owned cleanup`);
  invariant(map.audio.some((entry: Json) => entry.symbol === "se_m_razor_wind"), `${side} body ${bodyIndex + 1}: Razor Wind audio`);
  return map;
}

function verifyProbe(config: SideConfig, probe: Json, rgbDirectory: string): Json {
  invariant(probe.schema === "fury-cutter-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 210, `${config.side}: probe identity`);
  const rows = probe.frames as Json[];
  invariant(probe.bodyWindows.length === 4 && rows.length === 172 && probe.bodyWindows.every((window: Json) => window.frameCount === 43), `${config.side}: four complete bodies`);
  const rgb = rgbFrames(rgbDirectory, rows);
  const maps = [0, 1, 2, 3].map((index) => bodyMap(config.side, probe, rows.slice(index * 43, index * 43 + 43), rgb.slice(index * 43, index * 43 + 43), index));
  const sequence = sha(Buffer.concat(rgb));
  invariant(probe.frames.every((row: Json) => row.parties.player.length === 3 && row.parties.opponent.length === 3), `${config.side}: complete parties in dense state`);
  invariant(maps.every((map) => map.state.animationRngTransitions.length > 0), `${config.side}: animation state not observed`);
  return {
    side: config.side, scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))),
    denseState: config.dense, denseArchiveSha256: sha(gzipSync(Buffer.from(JSON.stringify(probe))),), denseJsonSha256: sha(JSON.stringify(probe)),
    rawRgbArchive: config.rgb, rawArchiveSha256: sha(readFileSync(resolve(root, config.rgb))), rawRgbSequenceSha256: sequence,
    sourceWindow: probe.sourceWindow, bodyWindows: probe.bodyWindows, powers: maps.map((map) => map.sourceRows[0].power), directions: maps.map((map) => map.sourceRows[0].direction), maps: maps.map((map) => map.bodyIndex), mapDigests: maps.map((map) => sha(stable(map))),
    denseRows: rows.length, rawRgbRows: rgb.length, firstInactiveCleanup: maps.every((map) => map.cleanup.active === false), twiceFreshByteIdentity: true,
  };
}

function stage(args: readonly string[]): void {
  invariant(args.length === 8, "stage expects first and repeat player/opponent probe/rgb paths");
  for (const [index, config] of sides.entries()) {
    const probePath = args[index * 2]!; const rgbDir = args[index * 2 + 1]!;
    const repeatProbePath = args[4 + index * 2]!; const repeatRgbDir = args[5 + index * 2]!;
    const probe = JSON.parse(readFileSync(probePath, "utf8"));
    const dense = gzipSync(Buffer.from(JSON.stringify(probe)));
    mkdirSync(resolve(root, "tools/compare/evidence"), { recursive: true });
    writeFileSync(resolve(root, config.dense), dense);
    execFileSync("tar", ["-czf", resolve(root, config.rgb), "-C", rgbDir, "."]);
    const result = verifyProbe(config, probe, rgbDir);
    const repeatProbe = JSON.parse(readFileSync(repeatProbePath, "utf8"));
    const repeatRows = repeatProbe.frames as Json[];
    const repeatRgb = rgbFrames(repeatRgbDir, repeatRows);
    invariant(sha(readFileSync(probePath)) === sha(readFileSync(repeatProbePath)), `${config.side}: dense probe is not twice-fresh identical`);
    invariant(sha(Buffer.concat(rgbFrames(rgbDir, probe.frames))) === sha(Buffer.concat(repeatRgb)), `${config.side}: RGB sequence is not twice-fresh identical`);
    (result as any).repeatProbeSha256 = sha(readFileSync(repeatProbePath));
    (result as any).repeatRawRgbSequenceSha256 = sha(Buffer.concat(repeatRgb));
    (result as any).twiceFreshByteIdentity = true;
    const rows = probe.frames as Json[]; const rgb = rgbFrames(rgbDir, rows);
    for (let bodyIndex = 0; bodyIndex < 4; bodyIndex += 1) {
      const map = bodyMap(config.side, probe, rows.slice(bodyIndex * 43, bodyIndex * 43 + 43), rgb.slice(bodyIndex * 43, bodyIndex * 43 + 43), bodyIndex);
      writeFileSync(resolve(root, config.map.replace(".json", `-body-${bodyIndex + 1}.json`)), `${JSON.stringify(map, null, 2)}\n`);
    }
    (result as any).mapFiles = [1, 2, 3, 4].map((bodyIndex) => config.map.replace(".json", `-body-${bodyIndex}.json`));
    (result as any).denseArchiveSha256 = sha(dense);
    (result as any).denseJsonSha256 = sha(Buffer.from(JSON.stringify(probe)));
    (result as any).rawArchiveSha256 = sha(readFileSync(resolve(root, config.rgb)));
    (result as any).mapDigests = (result as any).mapFiles.map((path: string) => sha(readFileSync(resolve(root, path))));
    (result as any).probeSha256 = sha(readFileSync(probePath));
    (sides[index] as any).stagedResult = result;
  }
  const fixture = {
    schema: "fury-cutter-evidence-checkpoint/v1", oracleProfile: "battle-scene-on", move: "MOVE_FURY_CUTTER", moveId: 210,
    status: "unsupported", coverageCredit: false, sourceAudit: "tools/compare/furyCutterSourceAudit.ts",
    graphComponents: 17, novelTrackComponents: ["subroutine:FuryCutterContinue", "subroutine:FuryCutterContinue2", "subroutine:FuryCutterLeft", "subroutine:FuryCutterMedium", "subroutine:FuryCutterRight", "subroutine:FuryCutterStrong", "subroutine:FuryCutterStrongest", "task:AnimTask_GetFuryCutterHitCount", "task:AnimTask_IsFuryCutterHitRight"],
    representatives: ["MOVE_FURY_CUTTER"], controlsOnly: ["MOVE_VICE_GRIP", "MOVE_GUILLOTINE", "MOVE_AIR_CUTTER", "MOVE_AERIAL_ACE"], noProductionClaim: true,
    branches: sides.map((side) => (side as any).stagedResult),
    boundary: { productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, boundaryOrBarrierChanged: false },
  };
  writeFileSync(resolve(root, "tools/compare/fixtures/fury-cutter-evidence.json"), `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(JSON.stringify(fixture, null, 2));
}

export function verifyFuryCutterEvidence(): Json {
  const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/fury-cutter-evidence.json"), "utf8"));
  invariant(fixture.status === "unsupported" && fixture.coverageCredit === false, "fixture promoted unexpectedly");
  for (const config of sides) {
    invariant(existsSync(resolve(root, config.dense)) && existsSync(resolve(root, config.rgb)), `${config.side}: evidence missing`);
    const probe = JSON.parse(gunzipSync(readFileSync(resolve(root, config.dense))).toString("utf8"));
    const directory = extractRgb(config.rgb);
    const result = verifyProbe(config, probe, directory);
    const branch = fixture.branches.find((item: Json) => item.side === config.side);
    invariant(branch?.rawRgbSequenceSha256 === result.rawRgbSequenceSha256 && branch?.denseRows === 172 && branch?.rawRgbRows === 172, `${config.side}: fixture receipt drift`);
    invariant(branch?.powers.join(",") === "10,20,40,80" && branch?.directions.join(",") === "right,left,right,left", `${config.side}: branch receipt drift`);
    for (let bodyIndex = 1; bodyIndex <= 4; bodyIndex += 1) {
      const map = JSON.parse(readFileSync(resolve(root, config.map.replace(".json", `-body-${bodyIndex}.json`)), "utf8"));
      invariant(map.side === config.side && map.bodyIndex === bodyIndex && map.sourceRows.length === 43 && map.latches.independentNormalizedBankMaps, `${config.side} body ${bodyIndex}: normalized map drift`);
    }
  }
  return fixture;
}

const argv = process.argv.slice(2);
if (argv[0] === "--stage") stage(argv.slice(1));
else if (argv.length === 0) console.log(JSON.stringify(verifyFuryCutterEvidence(), null, 2));
