import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
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
  readonly targetPan: number;
  readonly soundAges: { readonly megaKick: number; readonly razorWind: number };
  readonly topology: Record<string, readonly string[]>;
}
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly sprites: readonly { readonly matrixNum: number }[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
}
interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly templates: Readonly<Record<string, number>>;
  readonly taskSymbols: Readonly<Record<string, number>>;
  readonly callbackSymbols: Readonly<Record<string, number>>;
  readonly songHeaders: { readonly se_m_mega_kick: number; readonly se_m_razor_wind: number };
  readonly topology: Fixture["topology"];
  readonly lifecycleCounts: { readonly crossChopHand: number; readonly crossImpact: number };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: crossChopPortable.ts <player fixture> <opponent fixture>");
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function run(fixturePath: string): { evidence: string; raw: string } {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-cross-chop-"));
  const output = join(scratch, "probe.json");
  const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const result = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgb,
  ], { cwd: root, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawHash = createHash("sha256");
  for (const frame of probe.frames) {
    const buffer = readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (createHash("sha256").update(buffer).digest("hex") !== frame.sha256) {
      throw new Error(`${fixture.orientation}: raw RGB mismatch at ${frame.frame}`);
    }
    rawHash.update(buffer);
  }
  const raw = rawHash.digest("hex");
  if (fixture.schema !== "cross-chop-portable-evidence/v1" || probe.schema !== "cross-chop-dense-evidence/v1"
    || evidence !== fixture.evidenceSha256 || raw !== fixture.rawRgbSha256
    || !same(probe.sourceWindow, fixture.sourceWindow) || !same(probe.topology, fixture.topology)
    || probe.lifecycleCounts.crossChopHand !== 2 || probe.lifecycleCounts.crossImpact !== 1
    || probe.frames.length !== fixture.sourceWindow.frameCount
    || probe.frames[0]?.gAnimScriptActive !== 1 || probe.frames.at(-1)?.gAnimScriptActive !== 0
    || probe.frames.at(-1)?.visualTaskCount !== 0) {
    throw new Error(`${fixture.orientation}: immutable dense receipt changed`);
  }
  let alphaFrames = 0;
  for (let index = 0; index < probe.frames.length; index += 1) {
    const frame = probe.frames[index]!;
    if (frame.frame !== fixture.sourceWindow.startFrame + index) throw new Error(`${fixture.orientation}: non-dense frame window`);
    if (index < probe.frames.length - 1 && (frame.scriptOffset === null || frame.gAnimScriptActive !== 1)) {
      throw new Error(`${fixture.orientation}: source body escaped at ${frame.frame}`);
    }
    const alpha = frame.registers.bldcnt === 16192 && frame.registers.bldalpha === 2060;
    alphaFrames += Number(alpha);
    if (!alpha && !(frame.registers.bldcnt === 0 && frame.registers.bldalpha === 0)) throw new Error(`${fixture.orientation}: unexpected blend registers`);
    if (index > 0) {
      const prior = probe.frames[index - 1]!;
      const oamTransferred = same(frame.hardwareOam, prior.softwareOam) || same(frame.hardwareOam, frame.softwareOam);
      const paletteTransferred = same(frame.hardwarePalette, prior.fadedPalette) || same(frame.hardwarePalette, frame.fadedPalette);
      if (!oamTransferred || !paletteTransferred) throw new Error(`${fixture.orientation}: OAM/palette transfer changed at ${frame.frame}`);
    }
    if (frame.softwareOam.length !== 128 || frame.hardwareOam.length !== 128
      || frame.fadedPalette.length !== 512 || frame.hardwarePalette.length !== 512
      || frame.hardwareMatrices.length !== 32 || frame.hardwareMatrices.some((matrix) => matrix.length !== 4)
      || frame.sprites.some((sprite) => sprite.matrixNum < 0 || sprite.matrixNum >= 32)) {
      throw new Error(`${fixture.orientation}: OAM/matrix/palette receipt shape changed`);
    }
  }
  const tags = new Set(probe.frames.flatMap((frame) => frame.paletteTags));
  if (!tags.has(10143) || !tags.has(10285) || alphaFrames === 0) throw new Error(`${fixture.orientation}: asset/alpha receipt missing`);
  const at = (age: number) => probe.frames[age]!;
  for (const [name, age] of Object.entries(fixture.soundAges)) {
    const expected = name === "megaKick" ? probe.songHeaders.se_m_mega_kick : probe.songHeaders.se_m_razor_wind;
    const audio = at(age).se1;
    if (audio.songHeader !== expected || audio.tracks[0]?.flags !== 131 || audio.tracks[0]?.panX !== fixture.targetPan) {
      throw new Error(`${fixture.orientation}: ${name} audio receipt changed`);
    }
  }
  return { evidence, raw };
}

for (const fixture of paths) {
  const first = run(fixture);
  const second = run(fixture);
  if (!same(first, second)) throw new Error(`${fixture}: fresh reproducibility diverged`);
  console.log(`${fixture}: evidence ${first.evidence}; raw RGB ${first.raw}`);
}
