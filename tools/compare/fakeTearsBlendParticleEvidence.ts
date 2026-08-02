import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

interface Window { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }
interface Fixture { readonly scenario: string; readonly probe: string; readonly orientation: string; readonly captureWindow: Window; readonly blendParticleActiveWindow: Window; readonly sourceOwnedComponentWindow: Window; readonly evidenceSha256: string; readonly rawRgbSha256: string }
interface Frame { readonly frame: number; readonly currentMove: number; readonly sha256: string; readonly gAnimScriptActive: number; readonly battleAnimScriptOffset: number | null; readonly tasks: readonly { readonly func: { readonly symbol?: string } }[]; readonly paletteTags: readonly number[]; readonly fadedPalette: readonly number[]; readonly hardwareOam: readonly string[]; readonly hardwareMatrices: readonly unknown[]; readonly hardwarePalette: readonly number[]; readonly registers: Readonly<Record<string, number>>; readonly se1: { readonly rawInfo: string; readonly tracks: readonly unknown[] }; readonly se2: { readonly rawInfo: string; readonly tracks: readonly unknown[] } }
interface Probe { readonly schema: string; readonly captureWindow: Window; readonly blendParticleActiveWindow: Window; readonly sourceOwnedComponentWindow: Window; readonly latch: { readonly createScriptOffset: number; readonly firstInactiveFrame: number; readonly paletteIndex: number }; readonly sourceSymbols: Readonly<Record<string, number>>; readonly smallBubblesTag: number; readonly frames: readonly Frame[] }
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2];
if (!fixturePath) throw new Error("usage: fakeTearsBlendParticleEvidence.ts <fixture>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const outputDigests = new Map<string, string>(); const rgbDigests = new Map<string, string>();

function rawDigest(dir: string, frames: readonly Frame[]): string {
  const digest = createHash("sha256");
  for (const frame of frames) digest.update(readFileSync(join(dir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
  return digest.digest("hex");
}
function run(number: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-fake-tears-evidence-");
  const output = join(scratch, "probe.json"); const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgb], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout); if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);
  const bytes = readFileSync(output); const probe = JSON.parse(bytes.toString()) as Probe;
  if (probe.schema !== "fake-tears-blend-particle-dense-evidence/v1" || !same(probe.captureWindow, fixture.captureWindow) || !same(probe.blendParticleActiveWindow, fixture.blendParticleActiveWindow) || !same(probe.sourceOwnedComponentWindow, fixture.sourceOwnedComponentWindow)) throw new Error(`${fixture.orientation}: window changed`);
  if (probe.frames.length !== fixture.captureWindow.frameCount || probe.frames.some((frame, i) => frame.frame !== fixture.captureWindow.startFrame + i || frame.currentMove !== 313)) throw new Error(`${fixture.orientation}: currentMove capture is not complete and dense`);
  const source = probe.frames.filter((frame) => frame.frame >= fixture.sourceOwnedComponentWindow.startFrame && frame.frame <= fixture.sourceOwnedComponentWindow.endFrame);
  if (source.length !== 2 || source[0]!.battleAnimScriptOffset !== probe.latch.createScriptOffset || source[1]!.frame !== probe.latch.firstInactiveFrame || source.some((frame) => frame.tasks.some((task) => task.func.symbol === "AnimTask_BlendSpriteColor_Step2"))) throw new Error(`${fixture.orientation}: immediate task latch boundary changed`);
  const palette = 256 + probe.latch.paletteIndex * 16;
  if (source[0]!.paletteTags[probe.latch.paletteIndex] !== probe.smallBubblesTag || source[1]!.paletteTags[probe.latch.paletteIndex] !== probe.smallBubblesTag || same(source[0]!.fadedPalette.slice(palette, palette + 16), source[1]!.fadedPalette.slice(palette, palette + 16))) throw new Error(`${fixture.orientation}: SMALL_BUBBLES OBJ palette latch changed`);
  for (const frame of source) {
    if (frame.hardwareOam.length !== 128 || frame.hardwareMatrices.length !== 32 || frame.hardwarePalette.length !== 512 || frame.fadedPalette.length !== 512 || frame.registers.bldcnt === undefined || frame.se1.tracks.length !== 3 || frame.se2.tracks.length !== 3 || !frame.se1.rawInfo || !frame.se2.rawInfo) throw new Error(`${fixture.orientation}: incomplete reducer/compositor receipt`);
    if (createHash("sha256").update(readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`))).digest("hex") !== frame.sha256) throw new Error(`${fixture.orientation}: raw RGB receipt changed`);
  }
  for (const symbol of ["Move_FAKE_TEARS", "AnimTask_BlendParticle", "AnimTask_BlendSpriteColor_Step2"]) if (!probe.sourceSymbols[symbol]) throw new Error(`${fixture.orientation}: missing ${symbol} source symbol`);
  const outputDigest = createHash("sha256").update(bytes).digest("hex"); const rgbDigest = rawDigest(rgb, probe.frames);
  if (outputDigest !== fixture.evidenceSha256 || rgbDigest !== fixture.rawRgbSha256) throw new Error(`${fixture.orientation}: committed digest changed`);
  for (const [digests, value, label] of [[outputDigests, outputDigest, "output"], [rgbDigests, rgbDigest, "raw RGB"]] as const) { const previous = digests.get(fixture.orientation); if (previous !== undefined && previous !== value) throw new Error(`${fixture.orientation}: fresh ${label} changed`); digests.set(fixture.orientation, value); }
  console.log(`${fixture.orientation} run ${number}: ${source.length}/${fixture.sourceOwnedComponentWindow.frameCount}; output ${outputDigest}; rgb ${rgbDigest}`);
}
run(1); run(2);
