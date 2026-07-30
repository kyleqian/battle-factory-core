import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type Fixture = {
  schema: "roar-portable-evidence/v1";
  orientation: string;
  scenario: string;
  probe: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSha256: string;
  rawRgbSha256: string;
};
type Frame = {
  frame: number;
  sha256: string;
  gAnimScriptActive: number;
  visualTaskCount: number;
  softwareOam: string[];
  hardwareOam: string[];
  hardwareMatrices: number[][];
  fadedPalette: number[];
  unfadedPalette: number[];
  hardwarePalette: number[];
  paletteTags: number[];
  tileTags: number[];
  registers: Record<string, number>;
};
type Probe = {
  schema: "roar-dense-evidence/v1";
  sourceWindow: Fixture["sourceWindow"];
  lifecycleCounts: Record<string, number>;
  topology: { tasks: string[]; templates: string[]; callbacks: string[] };
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: roarPortable.ts <player fixture> <opponent fixture>");
const fresh = new Map<string, { evidence: string; raw: string }>();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-roar-portable-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const raw = createHash("sha256");
  const errors: string[] = [];
  for (const frame of probe.frames) {
    const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    raw.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== frame.sha256) {
      errors.push(`frame ${frame.frame}: raw RGB digest changed`);
    }
    if (
      frame.softwareOam.length !== 128 || frame.hardwareOam.length !== 128
      || frame.hardwareMatrices.length !== 32 || frame.fadedPalette.length !== 512
      || frame.unfadedPalette.length !== 512 || frame.hardwarePalette.length !== 512
      || frame.paletteTags.length !== 16 || frame.tileTags.length !== 128
      || Object.keys(frame.registers).length !== 8
    ) errors.push(`frame ${frame.frame}: complete receipt fields changed`);
  }
  const rawDigest = raw.digest("hex");
  const tasks = [
    "AnimTask_ScaleMonAndRestore_Step", "AnimTask_SlideOffScreen_Step",
    "SoundTask_PlayDoubleCry_Step", "SoundTask_WaitForCry", "Task_ClearMonBg",
  ];
  if (
    fixture.schema !== "roar-portable-evidence/v1"
    || probe.schema !== "roar-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || evidence !== fixture.evidenceSha256 || rawDigest !== fixture.rawRgbSha256
    || probe.frames.length !== fixture.sourceWindow.frameCount
    || probe.lifecycleCounts.gRoarNoiseLineSpriteTemplate !== 6
    || !tasks.every((task) => probe.topology.tasks.includes(task))
    || !probe.topology.templates.includes("gRoarNoiseLineSpriteTemplate")
    || !probe.topology.callbacks.includes("AnimRoarNoiseLine_Step")
    || probe.frames.at(-1)?.gAnimScriptActive !== 0
    || probe.frames.at(-1)?.visualTaskCount !== 0
  ) errors.push(`${fixture.orientation}: immutable Roar receipt changed`);
  if (errors.length) throw new Error(errors.slice(0, 100).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(`${fixture.orientation} run ${runNumber}: ${probe.frames.length}/${fixture.sourceWindow.frameCount} complete Roar receipt exact`);
}

for (const path of paths) {
  verify(path, 1);
  verify(path, 2);
}
