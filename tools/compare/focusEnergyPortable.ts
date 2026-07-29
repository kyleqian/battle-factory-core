import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

interface Fixture { readonly schema: string; readonly orientation: string; readonly scenario: string; readonly probe: string; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly evidenceSha256: string; readonly rawRgbSha256: string }
interface Frame { readonly frame: number; readonly sha256: string; readonly gAnimScriptActive: number; readonly scriptOffset: number | null; readonly visualTaskCount: number; readonly soundTaskCount: number; readonly tasks: readonly { readonly func: { readonly symbol: string | null } }[]; readonly sprites: readonly { readonly template: { readonly symbol: string | null }; readonly callback: { readonly symbol: string | null }; readonly matrixNum: number }[]; readonly softwareOam: readonly string[]; readonly hardwareOam: readonly string[]; readonly hardwareMatrices: readonly (readonly number[])[]; readonly fadedPalette: readonly number[]; readonly unfadedPalette: readonly number[]; readonly hardwarePalette: readonly number[]; readonly paletteTags: readonly number[]; readonly registers: Readonly<Record<string, number>>; readonly se1: { readonly songHeader: number; readonly tracks: readonly unknown[] }; readonly se2: { readonly songHeader: number; readonly tracks: readonly unknown[] } }
interface Probe { readonly schema: string; readonly sourceWindow: Fixture["sourceWindow"]; readonly lifecycleCounts: { readonly endureEnergy: number }; readonly topology: { readonly tasks: readonly string[]; readonly templates: readonly string[]; readonly callbacks: readonly string[] }; readonly songHeaders: { readonly SE_M_DRAGON_RAGE: number }; readonly frames: readonly Frame[] }
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: focusEnergyPortable.ts <player fixture> <opponent fixture>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();
function verify(path: string): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-focus-energy-"));
  const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgbDir], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout); if (proc.stderr) process.stderr.write(proc.stderr); if (proc.status !== 0) process.exit(proc.status ?? 1);
  const bytes = readFileSync(output), probe = JSON.parse(bytes.toString()) as Probe, evidence = createHash("sha256").update(bytes).digest("hex"), raw = createHash("sha256");
  for (const frame of probe.frames) { const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)); raw.update(rgb); if (createHash("sha256").update(rgb).digest("hex") !== frame.sha256) throw new Error(`${fixture.orientation}: raw RGB changed at ${frame.frame}`); }
  const rawDigest = raw.digest("hex"), audio = probe.frames.flatMap(f => [f.se1.songHeader, f.se2.songHeader]);
  const receipts = probe.frames.every(f => f.softwareOam.length === 128 && f.hardwareOam.length === 128 && f.hardwareMatrices.length === 32 && f.hardwareMatrices.every(m => m.length === 4) && f.fadedPalette.length === 512 && f.unfadedPalette.length === 512 && f.hardwarePalette.length === 512 && f.sprites.every(s => s.matrixNum >= 0 && s.matrixNum < 32) && Object.keys(f.registers).length === 8 && f.se1.tracks.length === 3 && f.se2.tracks.length === 3);
  if (fixture.schema !== "focus-energy-portable-evidence/v1" || probe.schema !== "focus-energy-dense-evidence/v1" || !same(probe.sourceWindow, fixture.sourceWindow) || evidence !== fixture.evidenceSha256 || rawDigest !== fixture.rawRgbSha256 || probe.frames.length !== fixture.sourceWindow.frameCount || probe.lifecycleCounts.endureEnergy !== 15 || !probe.topology.tasks.includes("AnimTask_BlendColorCycleLoop") || !probe.topology.tasks.includes("AnimTask_ShakeMon2_Step") || !probe.topology.templates.includes("gEndureEnergySpriteTemplate") || !probe.topology.callbacks.includes("AnimEndureEnergy_Step") || !audio.includes(probe.songHeaders.SE_M_DRAGON_RAGE) || probe.frames[0]?.gAnimScriptActive !== 1 || probe.frames.at(-1)?.gAnimScriptActive !== 0 || probe.frames.at(-1)?.visualTaskCount !== 0 || !receipts) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);
  const prior = fresh.get(fixture.orientation); if (prior && !same(prior, { evidence, raw: rawDigest })) throw new Error(`${fixture.orientation}: fresh proof diverged`); fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(`${fixture.orientation}: receipts ${probe.frames.length}/${fixture.sourceWindow.frameCount}; evidence ${evidence}; raw ${rawDigest}`);
}
for (let repeat = 0; repeat < 2; repeat += 1) for (const path of paths) verify(path);
