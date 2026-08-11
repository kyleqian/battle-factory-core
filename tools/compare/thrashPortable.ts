import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: "thrash-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: { readonly status: "evidence-only-unsupported"; readonly denseEvidenceFrames: number };
}
interface Ident { readonly address: number; readonly symbol: string | null }
interface Frame {
  readonly frame: number; readonly scriptOffset: number | null; readonly animScriptActive: boolean;
  readonly visualTaskCount: number; readonly soundTaskCount: number;
  readonly tasks: readonly { readonly func: Ident; readonly data: readonly number[]; readonly raw: string }[];
  readonly sprites: readonly { readonly slot: number; readonly template: Ident; readonly callback: Ident;
    readonly data: readonly number[]; readonly raw: string; readonly matrix: readonly number[];
    readonly hardwareMatrix: readonly number[] }[];
  readonly playerSprite: { readonly x: number; readonly y: number; readonly x2: number; readonly y2: number };
  readonly opponentSprite: { readonly x: number; readonly y: number; readonly x2: number; readonly y2: number };
  readonly battlers: unknown; readonly parties: unknown; readonly immutableState: unknown;
  readonly animationRng: number; readonly softwareOam: readonly string[]; readonly hardwareOam: readonly string[];
  readonly spriteOrder: readonly number[]; readonly softwareMatrices: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[]; readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[]; readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[]; readonly tileTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>; readonly backgroundPositions: Readonly<Record<string, number>>;
  readonly se1: { readonly songHeader: number; readonly status: number }; readonly se2: { readonly status: number };
}
interface Probe {
  readonly schema: string; readonly moveId: number; readonly sourceWindow: Fixture["denseWindow"];
  readonly sourceSymbols: Readonly<Record<string, number>>;
  readonly componentSymbols: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly lifecycleCounts: Readonly<Record<string, number>>;
  readonly topology: { readonly templates: readonly string[]; readonly callbacks: readonly string[]; readonly tasks: readonly string[] };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (!fixturePaths.length) fixturePaths.push(
  "tools/compare/fixtures/thrash-player-tauros-opponent-onix.json",
  "tools/compare/fixtures/thrash-opponent-tauros-player-onix.json",
);
const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function runFresh(fixture: Fixture): { bytes: Buffer; probe: Probe; raw: Buffer; changeMap: string } {
  const scratch = createScratchDir(`pokebench-thrash-${fixture.orientation}-`);
  const output = join(scratch, "probe.json");
  const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgb,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${fixture.orientation}: fresh probe failed`);
  const bytes = readFileSync(output);
  const raw = Buffer.concat(readdirSync(rgb).sort().map((file) => readFileSync(join(rgb, file))));
  const mapRun = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgb], { cwd: root, encoding: "utf8" });
  if (mapRun.status !== 0) throw new Error(mapRun.stderr);
  const separator = mapRun.stdout.indexOf(" — ");
  if (separator < 0) throw new Error("change-map header changed");
  return { bytes, probe: JSON.parse(bytes.toString("utf8")) as Probe, raw,
    changeMap: `# ${basename(fixture.changeMap)} raw RGB888 — ${mapRun.stdout.slice(separator + 3)}` };
}

const coverage = readFileSync(join(root, "ANIMATION_COVERAGE.json"), "utf8");
if (!coverage.includes("MOVE_THRASH remains unsupported")) {
  throw new Error("THRASH coverage was promoted or its explicit unsupported guard disappeared");
}

for (const fixturePath of fixturePaths) {
  const fixture = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Fixture;
  const first = runFresh(fixture);
  const second = runFresh(fixture);
  const failures: string[] = [];
  const evidence = sha(first.bytes);
  if (fixture.schema !== "thrash-portable-evidence/v1" || fixture.oracleProfile !== "battle-scene-on") failures.push("fixture contract");
  if (first.probe.schema !== "thrash-dense-evidence/v1" || second.probe.schema !== first.probe.schema
      || first.probe.moveId !== 37) failures.push("probe schema/move");
  if (!same(first.probe.sourceWindow, fixture.denseWindow) || !same(second.probe.sourceWindow, fixture.denseWindow)) failures.push("dense window");
  if (!same(first.probe.sourceSymbols, { Move_THRASH: 0x082cc981, Move_SING: 0x082cca00 })
      || !same(second.probe.sourceSymbols, first.probe.sourceSymbols)) failures.push("real even pointer bounds");
  if (evidence !== sha(second.bytes) || evidence !== fixture.evidenceSha256
      || sha(second.bytes) !== fixture.secondFreshEvidenceSha256) failures.push("twice-fresh receipt");
  if (sha(first.raw) !== fixture.rawRgbSha256 || sha(second.raw) !== fixture.rawRgbSha256) failures.push("raw RGB");
  const committedMap = readFileSync(resolve(root, fixture.changeMap), "utf8");
  if (first.changeMap !== committedMap || second.changeMap !== committedMap
      || sha(committedMap) !== fixture.changeMapSha256) failures.push("normalized bilateral change map");
  if (fixture.acceptance.status !== "evidence-only-unsupported"
      || fixture.acceptance.denseEvidenceFrames !== fixture.denseWindow.frameCount) failures.push("truthful unsupported status");

  for (const probe of [first.probe, second.probe]) {
    const requiredTasks = ["AnimTask_ShakeMonInPlace_Step", "AnimTask_ThrashMoveMonHorizontal_Step", "AnimTask_ThrashMoveMonVertical_Step"];
    const requiredCallbacks = ["AnimFistOrFootRandomPos_Step", "SpriteCallbackDummy"];
    const requiredComponents = ["gFistFootRandomPosSpriteTemplate", "gBasicHitSplatSpriteTemplate",
      "AnimFistOrFootRandomPos", "AnimFistOrFootRandomPos_Step", "AnimTask_ShakeMonInPlace",
      "AnimTask_ShakeMonInPlace_Step", "AnimTask_ThrashMoveMonHorizontal", "AnimTask_ThrashMoveMonHorizontal_Step",
      "AnimTask_ThrashMoveMonVertical", "AnimTask_ThrashMoveMonVertical_Step"];
    if (requiredTasks.some((task) => !probe.topology.tasks.includes(task))
        || requiredCallbacks.some((callback) => !probe.topology.callbacks.includes(callback))
        || !probe.topology.templates.includes("gFistFootRandomPosSpriteTemplate")
        || !probe.topology.templates.includes("gBasicHitSplatSpriteTemplate")
        || requiredComponents.some((name) => !(name in probe.componentSymbols))
        || !same(probe.lifecycleCounts, { gFistFootRandomPosSpriteTemplate: 3, gBasicHitSplatSpriteTemplate: 3 })) {
      failures.push("complete callback/task/component topology");
    }
    const initial = probe.frames[0]!;
    const immutable = probe.frames.every((frame) => same(frame.battlers, initial.battlers)
      && same(frame.parties, initial.parties) && same(frame.immutableState, initial.immutableState));
    const denseShape = probe.frames.length === fixture.denseWindow.frameCount && probe.frames.every((frame) =>
      frame.softwareOam.length === 128 && frame.hardwareOam.length === 128 && frame.spriteOrder.length === 64
      && frame.softwareMatrices.length === 32 && frame.hardwareMatrices.length === 32
      && frame.fadedPalette.length === 512 && frame.unfadedPalette.length === 512
      && frame.hardwarePalette.length === 512 && frame.paletteTags.length === 16 && frame.tileTags.length === 128
      && Object.keys(frame.registers).length === 10 && Object.keys(frame.backgroundPositions).length === 8
      && frame.tasks.every((task) => task.data.length === 16 && task.raw.length === 0x28 * 2)
      && frame.sprites.every((sprite) => sprite.data.length === 8 && sprite.raw.length === 0x44 * 2
        && sprite.matrix.length === 4 && sprite.hardwareMatrix.length === 4));
    const priorBufferLatch = probe.frames.slice(1).every((frame, index) => same(frame.hardwareOam, probe.frames[index]!.softwareOam));
    const priorPaletteLatch = probe.frames.slice(1).every((frame, index) => same(frame.hardwarePalette, probe.frames[index]!.fadedPalette));
    const attackerKey = fixture.orientation === "player-back" ? "playerSprite" : "opponentSprite";
    const horizontalAffineLatch = probe.frames.slice(2).every((frame, index) =>
      same(frame[attackerKey].hardwareMatrix, probe.frames[index]![attackerKey].matrix));
    const childMatrices = probe.frames.flatMap((frame) => frame.sprites)
      .filter((sprite) => sprite.template.symbol === "gBasicHitSplatSpriteTemplate")
      .every((sprite) => same(sprite.matrix, [256, 0, 0, 256]) && same(sprite.hardwareMatrix, [256, 0, 0, 256]));
    const shakePrograms = probe.frames.flatMap((frame) => frame.tasks)
      .filter((task) => task.func.symbol === "AnimTask_ShakeMonInPlace_Step");
    const shakeSchedules = new Set(shakePrograms.map((task) => `${task.data[2]}/${task.data[4]}/${task.data[5]}/${task.data[6]}`));
    const axisTasks = requiredTasks.slice(1).every((name) => probe.frames.some((frame) => frame.tasks.some((task) => task.func.symbol === name)));
    const hasAllAudio = Object.values(probe.songHeaders).every((header) => probe.frames.some((frame) => frame.se1.songHeader === header));
    const resources = probe.frames.some((frame) => frame.paletteTags.includes(10143) && frame.tileTags.includes(10143))
      && probe.frames.some((frame) => frame.paletteTags.includes(10135) && frame.tileTags.includes(10135));
    const cleanup = initial.animScriptActive && !probe.frames.at(-1)!.animScriptActive
      && probe.frames.at(-1)!.visualTaskCount === 0;
    if (!immutable || !denseShape || !priorBufferLatch || !priorPaletteLatch || !horizontalAffineLatch || !childMatrices || !axisTasks
        || !shakeSchedules.has("7/1/8/0") || !shakeSchedules.has("16/1/16/0")
        || !hasAllAudio || !resources || !cleanup) failures.push("dense state/hardware/latch/audio/resource/cleanup contract");
  }
  console.log(`${fixture.orientation}: ${fixture.denseWindow.frameCount}/${fixture.denseWindow.frameCount} dense `
    + "source/task/sprite/software+hardware OAM/matrix/palette/audio/state/raw-RGB frames reproduced twice fresh; remains unsupported");
  if (failures.length) throw new Error(`${fixture.orientation}: ${[...new Set(failures)].join(", ")}`);
}
