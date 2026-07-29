import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

interface Fixture {
  readonly schema: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly soundPan: number;
  readonly topology: Record<string, readonly string[]>;
}
interface AudioPlayer {
  readonly songHeader: number;
  readonly tracks: readonly { readonly flags: number; readonly panX: number; readonly raw: string }[];
}
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly unknown[];
  readonly sprites: readonly unknown[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: AudioPlayer;
  readonly se2: AudioPlayer;
}
interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly songHeaders: { readonly SE_M_DRAGON_RAGE: number };
  readonly topology: Fixture["topology"];
  readonly lifecycleCounts: { readonly endureEnergy: number };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: endurePortable.ts <player fixture> <opponent fixture>");
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const fresh = new Map<string, { readonly evidence: string; readonly raw: string }>();

function verify(path: string): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-endure-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawHash = createHash("sha256");
  let completeReceipts = 0;
  let redCycleFrames = 0;
  let firstSound = false;
  for (const [age, frame] of probe.frames.entries()) {
    const raw = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== frame.sha256) {
      throw new Error(`${fixture.orientation}: raw RGB changed at ${frame.frame}`);
    }
    const receipt = frame.softwareOam.length === 128
      && frame.hardwareOam.length === 128
      && frame.hardwareMatrices.length === 32
      && frame.hardwareMatrices.every((matrix) => matrix.length === 4)
      && frame.fadedPalette.length === 512
      && frame.unfadedPalette.length === 512
      && frame.hardwarePalette.length === 512
      && frame.paletteTags.length === 16
      && Object.keys(frame.registers).length === 8
      && frame.se1.tracks.length === 3 && frame.se2.tracks.length === 3;
    if (receipt) completeReceipts += 1;
    if (frame.tasks.length > 0 && frame.fadedPalette.some((color, index) => color !== frame.unfadedPalette[index])) redCycleFrames += 1;
    if (age === 4) {
      firstSound = frame.se1.songHeader === probe.songHeaders.SE_M_DRAGON_RAGE
        && frame.se1.tracks[0]?.flags === 131
        && frame.se1.tracks[0]?.panX === fixture.soundPan
        && frame.se2.tracks[0]?.flags === 0;
    }
  }
  const raw = rawHash.digest("hex");
  if (
    fixture.schema !== "endure-portable-evidence/v1"
    || probe.schema !== "endure-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.topology, fixture.topology)
    || evidence !== fixture.evidenceSha256 || raw !== fixture.rawRgbSha256
    || probe.frames.length !== fixture.sourceWindow.frameCount
    || probe.lifecycleCounts.endureEnergy !== 15
    || probe.frames[0]?.gAnimScriptActive !== 1
    || probe.frames[0]?.scriptOffset !== 0
    || probe.frames.at(-1)?.gAnimScriptActive !== 0
    || probe.frames.at(-1)?.visualTaskCount !== 0
    || completeReceipts !== fixture.sourceWindow.frameCount
    || redCycleFrames === 0 || !firstSound
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw })) throw new Error(`${fixture.orientation}: fresh proof diverged`);
  fresh.set(fixture.orientation, { evidence, raw });
  console.log(`${fixture.orientation}: receipts ${completeReceipts}/${fixture.sourceWindow.frameCount}; evidence ${evidence}; raw ${raw}`);
}

for (let repeat = 0; repeat < 2; repeat += 1) for (const path of paths) verify(path);
