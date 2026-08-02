import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";
interface Fixture { schema: string; orientation: string; scenario: string; probe: string; sourceWindow: { startFrame: number; endFrame: number; frameCount: number }; evidenceSha256: string; rawRgbSha256: string; lifecycleCounts: { leafBlade: number; crossImpact: number }; topology: Record<string, readonly string[]>; }
interface Frame { frame: number; sha256: string; scriptOffset: number | null; tasks: readonly unknown[]; sprites: readonly unknown[]; softwareOam: readonly string[]; hardwareOam: readonly string[]; hardwareMatrices: readonly (readonly number[])[]; fadedPalette: readonly number[]; unfadedPalette: readonly number[]; hardwarePalette: readonly number[]; paletteTags: readonly number[]; registers: Record<string, number>; se1: unknown; se2: unknown; }
interface Probe { schema: string; sourceWindow: Fixture["sourceWindow"]; lifecycleCounts: Fixture["lifecycleCounts"]; topology: Fixture["topology"]; frames: readonly Frame[]; }
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixtures = process.argv.slice(2);
if (fixtures.length !== 2) throw new Error("usage: leafBladePortable.ts <player fixture> <opponent fixture>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();
function verify(path: string): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-leaf-blade-"); const output = join(scratch, "probe.json"); const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgb], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout); if (run.stderr) process.stderr.write(run.stderr); if (run.status !== 0) process.exit(run.status ?? 1);
  const bytes = readFileSync(output); const probe = JSON.parse(bytes.toString()) as Probe; const evidence = createHash("sha256").update(bytes).digest("hex"); const raw = createHash("sha256");
  for (const frame of probe.frames) { const bytes = readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`)); raw.update(bytes); if (createHash("sha256").update(bytes).digest("hex") !== frame.sha256) throw new Error(`${fixture.orientation}: raw RGB changed at ${frame.frame}`); }
  const rawDigest = raw.digest("hex"); const fields = probe.frames.every((frame) => frame.scriptOffset === null || typeof frame.scriptOffset === "number") && probe.frames.every((frame) => frame.softwareOam.length === 128 && frame.hardwareOam.length === 128 && frame.hardwareMatrices.length === 32 && frame.hardwareMatrices.every((matrix) => matrix.length === 4) && frame.fadedPalette.length === 512 && frame.unfadedPalette.length === 512 && frame.hardwarePalette.length === 512 && frame.paletteTags.length === 16 && Object.keys(frame.registers).length === 8 && Array.isArray(frame.tasks) && Array.isArray(frame.sprites) && frame.se1 !== null && frame.se2 !== null);
  if (fixture.schema !== "leaf-blade-portable-evidence/v1" || probe.schema !== "leaf-blade-dense-evidence/v1" || !same(probe.sourceWindow, fixture.sourceWindow) || !same(probe.lifecycleCounts, fixture.lifecycleCounts) || !same(probe.topology, fixture.topology) || evidence !== fixture.evidenceSha256 || rawDigest !== fixture.rawRgbSha256 || probe.frames.length !== fixture.sourceWindow.frameCount || !fields) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);
  const prior = fresh.get(fixture.orientation); if (prior && !same(prior, { evidence, raw: rawDigest })) throw new Error(`${fixture.orientation}: fresh proof diverged`); fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(`${fixture.orientation}: receipt ${probe.frames.length}/${fixture.sourceWindow.frameCount}; evidence ${evidence}; raw ${rawDigest}`);
}
for (let repeat = 0; repeat < 2; repeat += 1) for (const fixture of fixtures) verify(fixture);
