import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

interface Window { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }
interface Fixture {
  readonly scenario: string; readonly probe: string; readonly orientation: string;
  readonly currentMoveWindow: Window; readonly sourceOwnedComponentWindow: Window;
  readonly activeSourceScriptWindow: Window;
}
interface Frame {
  readonly frame: number; readonly currentMove: number; readonly sha256: string;
  readonly gAnimScriptActive: number; readonly battleAnimScriptOffset: number | null;
  readonly tasks: readonly { readonly func: { readonly symbol?: string } }[];
  readonly sprites: readonly unknown[]; readonly bg1Vram: { readonly charBlockSha256: string; readonly screenBlockSha256: string };
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
}
interface Probe {
  readonly schema: string; readonly captureWindow: Window;
  readonly activeSourceScriptWindow: Window; readonly sourceOwnedComponentWindow: Window;
  readonly songHeaders: { readonly SE_M_SURF: number };
  readonly frames: readonly Frame[];
}
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 1) throw new Error("usage: surfWaveEvidence.ts <fixture>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const outputDigests = new Map<string, string>();
const rgbDigests = new Map<string, string>();

function rgbStreamDigest(dir: string, frames: readonly Frame[]): string {
  const digest = createHash("sha256");
  for (const frame of frames) {
    digest.update(readFileSync(join(dir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
  }
  return digest.digest("hex");
}
function run(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-surf-wave-evidence-");
  const output = join(scratch, "probe.json"); const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgb], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);
  const bytes = readFileSync(output); const probe = JSON.parse(bytes.toString()) as Probe;
  if (probe.schema !== "surf-wave-dense-evidence/v1") throw new Error(`${fixture.orientation}: unexpected schema`);
  if (!same(probe.captureWindow, fixture.currentMoveWindow)
    || !same(probe.activeSourceScriptWindow, fixture.activeSourceScriptWindow)
    || !same(probe.sourceOwnedComponentWindow, fixture.sourceOwnedComponentWindow)) {
    throw new Error(`${fixture.orientation}: dense window changed`);
  }
  if (probe.frames.length !== fixture.currentMoveWindow.frameCount
    || probe.frames.some((row, i) => row.frame !== fixture.currentMoveWindow.startFrame + i || row.currentMove !== 57)) {
    throw new Error(`${fixture.orientation}: currentMove capture is not complete and dense`);
  }
  const source = probe.frames.filter((row) => row.frame >= fixture.sourceOwnedComponentWindow.startFrame
    && row.frame <= fixture.sourceOwnedComponentWindow.endFrame);
  if (source.length !== fixture.sourceOwnedComponentWindow.frameCount) throw new Error(`${fixture.orientation}: component frame missing`);
  if (!source.some((row) => row.tasks.some((task) => task.func.symbol === "AnimTask_CreateSurfWave"))
    || !source.some((row) => row.tasks.some((task) => task.func.symbol === "AnimTask_CreateSurfWave_Step1"))
    || !source.some((row) => row.tasks.some((task) => task.func.symbol === "AnimTask_CreateSurfWave_Step2"))
    || !source.some((row) => row.tasks.some((task) => task.func.symbol === "AnimTask_SurfWaveScanlineEffect"))) {
    throw new Error(`${fixture.orientation}: missing Surf controller or scanline task body`);
  }
  const active = source.slice(0, -1);
  if (active.some((row) => !row.gAnimScriptActive || row.battleAnimScriptOffset === null)) {
    throw new Error(`${fixture.orientation}: active source script interval is not contiguous`);
  }
  if (!source.some((row) => row.bg1Vram.charBlockSha256 !== source[0]!.bg1Vram.charBlockSha256)
    && !source.some((row) => row.bg1Vram.screenBlockSha256 !== source.at(-1)!.bg1Vram.screenBlockSha256)) {
    throw new Error(`${fixture.orientation}: BG1 VRAM load/cleanup not observed`);
  }
  const surfAudio = probe.frames.some((row) => row.se1.songHeader === probe.songHeaders.SE_M_SURF
    && row.se1.tracks[0]?.flags === 131 && Math.abs(row.se1.tracks[0]?.panX ?? 0) <= 64);
  if (!surfAudio) throw new Error(`${fixture.orientation}: missing SE_M_SURF audio/pan receipt`);
  const outputDigest = createHash("sha256").update(bytes).digest("hex");
  const rgbDigest = rgbStreamDigest(rgb, probe.frames);
  for (const [set, value, label] of [[outputDigests, outputDigest, "output"], [rgbDigests, rgbDigest, "raw RGB stream"]] as const) {
    const prior = set.get(fixture.orientation);
    if (prior !== undefined && prior !== value) throw new Error(`${fixture.orientation}: fresh ${label} changed ${prior} -> ${value}`);
    set.set(fixture.orientation, value);
  }
  console.log(`${fixture.orientation} run ${runNumber}: ${source.length}/${fixture.sourceOwnedComponentWindow.frameCount}; output ${outputDigest}; rgb ${rgbDigest}`);
}

run(paths[0]!, 1); run(paths[0]!, 2);
