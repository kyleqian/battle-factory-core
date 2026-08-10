import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: "heat-wave-portable-evidence/v1";
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
interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["denseWindow"];
  readonly sourceSymbols: Readonly<Record<string, number>>;
  readonly lifecycleCounts: Readonly<Record<string, number>>;
  readonly topology: {
    readonly templates: readonly string[];
    readonly callbacks: readonly string[];
    readonly tasks: readonly string[];
  };
  readonly frames: readonly any[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (!fixturePaths.length) fixturePaths.push(
  "tools/compare/fixtures/heat-wave-player-ninetales-opponent-onix.json",
  "tools/compare/fixtures/heat-wave-opponent-ninetales-player-onix.json",
);
const sha = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

function runFresh(fixture: Fixture): {
  bytes: Buffer; probe: Probe; raw: Buffer; changeMap: string;
} {
  const scratch = createScratchDir(`pokebench-heat-wave-${fixture.orientation}-`);
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
  const files = readdirSync(rgb).sort();
  const raw = Buffer.concat(files.map((file) => readFileSync(join(rgb, file))));
  const mapRun = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgb], {
    cwd: root, encoding: "utf8",
  });
  if (mapRun.status !== 0) throw new Error(mapRun.stderr);
  const separator = mapRun.stdout.indexOf(" — ");
  if (separator < 0) throw new Error("change-map header changed");
  return {
    bytes,
    probe: JSON.parse(bytes.toString("utf8")) as Probe,
    raw,
    changeMap: `# ${basename(fixture.changeMap)} raw RGB888 — ${mapRun.stdout.slice(separator + 3)}`,
  };
}

const coverage = readFileSync(join(root, "ANIMATION_COVERAGE.json"), "utf8");
if (!coverage.includes("MOVE_HEAT_WAVE remains unsupported")) {
  throw new Error("Heat Wave coverage was promoted or its explicit unsupported guard disappeared");
}

for (const fixturePath of fixturePaths) {
  const fixture = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Fixture;
  const first = runFresh(fixture);
  const second = runFresh(fixture);
  const failures: string[] = [];
  const evidence = sha(first.bytes);
  if (fixture.schema !== "heat-wave-portable-evidence/v1"
      || fixture.oracleProfile !== "battle-scene-on") failures.push("fixture contract");
  if (first.probe.schema !== "heat-wave-dense-evidence/v1"
      || second.probe.schema !== first.probe.schema) failures.push("probe schema");
  if (!same(first.probe.sourceWindow, fixture.denseWindow)
      || !same(second.probe.sourceWindow, fixture.denseWindow)) failures.push("dense window");
  if (!same(first.probe.sourceSymbols, { Move_HEAT_WAVE: 0x082cdbc6, Move_HAIL: 0x082cdc76 })
      || !same(second.probe.sourceSymbols, first.probe.sourceSymbols)) failures.push("pointer bounds");
  if (evidence !== sha(second.bytes) || evidence !== fixture.evidenceSha256
      || sha(second.bytes) !== fixture.secondFreshEvidenceSha256) failures.push("twice-fresh receipt");
  if (sha(first.raw) !== fixture.rawRgbSha256 || sha(second.raw) !== fixture.rawRgbSha256) {
    failures.push("raw RGB");
  }
  const committedMap = readFileSync(resolve(root, fixture.changeMap), "utf8");
  if (first.changeMap !== committedMap || second.changeMap !== committedMap
      || sha(committedMap) !== fixture.changeMapSha256) failures.push("normalized change map");
  if (fixture.acceptance.status !== "evidence-only-unsupported"
      || fixture.acceptance.denseEvidenceFrames !== fixture.denseWindow.frameCount) {
    failures.push("truthful unsupported status");
  }
  for (const probe of [first.probe, second.probe]) {
    const requiredTasks = ["AnimTask_LoadSandstormBackground", "AnimTask_LoadSandstormBackground_Step",
      "AnimTask_MoveHeatWaveTargets_Step", "Task_PanFromInitialToTarget"];
    if (!probe.topology.templates.includes("gFlyingSandCrescentSpriteTemplate")
        || !probe.topology.callbacks.includes("AnimFlyingSandCrescent")
        || requiredTasks.some((task) => !probe.topology.tasks.includes(task))
        || probe.lifecycleCounts.gFlyingSandCrescentSpriteTemplate !== 7) failures.push("component graph");
    const initial = probe.frames[0];
    const moved = fixture.orientation === "player-back"
      ? probe.frames.some((frame) => frame.opponentSprite.x2 !== 0)
      : probe.frames.some((frame) => frame.playerSprite.x2 !== 0);
    const denseShape = probe.frames.length === fixture.denseWindow.frameCount
      && probe.frames.every((frame) => frame.softwareOam.length === 128
        && frame.hardwareOam.length === 128 && frame.spriteOrder.length === 64
        && frame.hardwareMatrices.length === 32 && frame.fadedPalette.length === 512
        && frame.unfadedPalette.length === 512 && frame.hardwarePalette.length === 512
        && frame.paletteTags.length === 16 && frame.tileTags.length === 128
        && Object.keys(frame.registers).length === 10
        && (frame.scriptOffset === null || frame.scriptOffset >= 0 && frame.scriptOffset < 0xb0)
        && same(frame.battlers, initial.battlers) && same(frame.parties, initial.parties)
        && same(frame.immutableState, initial.immutableState));
    const effects = probe.frames.some((frame) => !same(frame.fadedPalette, frame.unfadedPalette))
      && probe.frames.some((frame) => frame.paletteTags.includes(10261))
      && probe.frames.some((frame) => frame.tileTags.includes(10261))
      && probe.frames.some((frame) => frame.se1.status !== 0 || frame.se2.status !== 0)
      && moved;
    const cleanup = probe.frames[0].animScriptActive
      && !probe.frames.at(-1).animScriptActive
      && probe.frames.at(-1).visualTaskCount === 0;
    if (!denseShape || !effects || !cleanup) failures.push("dense hardware/state/effect/cleanup contract");
  }
  console.log(
    `${fixture.orientation}: ${fixture.denseWindow.frameCount}/${fixture.denseWindow.frameCount} `
    + "dense source/task/sprite/hardware/audio/state/raw-RGB frames reproduced twice fresh; remains unsupported",
  );
  if (failures.length) throw new Error(`${fixture.orientation}: ${[...new Set(failures)].join(", ")}`);
}
