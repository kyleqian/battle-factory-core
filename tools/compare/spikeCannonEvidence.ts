import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

interface Fixture { readonly scenario: string; readonly orientation: string; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly evidenceSha256: string; readonly rawRgbSha256: string; }
interface Frame { readonly frame: number; readonly sha256: string; readonly gAnimScriptActive: number; readonly scriptOffset: number | null; readonly tasks: readonly { readonly func: { readonly symbol: string | null } }[]; readonly sprites: readonly { readonly template: { readonly symbol: string | null } }[]; readonly hardwareOam: readonly string[]; readonly hardwareMatrices: readonly unknown[]; readonly hardwarePalette: readonly number[]; readonly fadedPalette: readonly number[]; readonly paletteTags: readonly number[]; readonly registers: Readonly<Record<string, number>>; readonly se1: { readonly tracks: readonly unknown[]; readonly rawInfo: string }; readonly se2: { readonly tracks: readonly unknown[]; readonly rawInfo: string }; }
interface Probe { readonly schema: string; readonly sourceWindow: Fixture["sourceWindow"]; readonly topology: { readonly tasks: readonly string[]; readonly templates: readonly string[] }; readonly frames: readonly Frame[]; }
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixtures = process.argv.slice(2);
if (fixtures.length !== 2) throw new Error("usage: spikeCannonEvidence.ts <player> <opponent>");
const fresh = new Map<string, { evidence: string; raw: string }>();
for (let repeat = 0; repeat < 2; repeat += 1) for (const path of fixtures) {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-spike-cannon-"));
  const output = join(scratch, "probe.json"), rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), join(root, "tools/compare/spikeCannonProbe.py"), resolve(root, fixture.scenario), output, rgb], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout); if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  const bytes = readFileSync(output); const probe = JSON.parse(bytes.toString()) as Probe;
  const rawHash = createHash("sha256");
  for (const frame of probe.frames) rawHash.update(readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`)));
  const evidence = createHash("sha256").update(bytes).digest("hex"), raw = rawHash.digest("hex");
  if (probe.schema !== "spike-cannon-dense-evidence/v2" || JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.sourceWindow)
    || probe.frames.length !== fixture.sourceWindow.frameCount || probe.frames.some((frame, index) => frame.frame !== fixture.sourceWindow.startFrame + index)
    || probe.frames[0]?.scriptOffset !== 0 || probe.frames.at(-1)?.gAnimScriptActive !== 0
    || !["AnimTask_WindUpLunge_Step1", "AnimTask_WindUpLunge_Step2", "AnimTask_ShakeMon2_Step"].every((name) => probe.topology.tasks.includes(name))
    || !["gLinearStingerSpriteTemplate", "gHandleInvertHitSplatSpriteTemplate"].every((name) => probe.topology.templates.includes(name))
    || probe.frames.some((frame) => frame.hardwareOam.length !== 128 || frame.hardwareMatrices.length !== 32 || frame.hardwarePalette.length !== 512 || frame.fadedPalette.length !== 512 || frame.paletteTags.length !== 16 || frame.se1.tracks.length !== 3 || frame.se2.tracks.length !== 3 || !frame.se1.rawInfo || !frame.se2.rawInfo || frame.registers.bldcnt === undefined || frame.registers.bldalpha === undefined)) throw new Error(`${fixture.orientation}: incomplete or changed dense receipt`);
  if ((fixture.evidenceSha256 && evidence !== fixture.evidenceSha256) || (fixture.rawRgbSha256 && raw !== fixture.rawRgbSha256)) throw new Error(`${fixture.orientation}: committed digest changed`);
  const prior = fresh.get(fixture.orientation); if (prior && (prior.evidence !== evidence || prior.raw !== raw)) throw new Error(`${fixture.orientation}: fresh run diverged`);
  fresh.set(fixture.orientation, { evidence, raw });
  console.log(`${fixture.orientation} run ${repeat + 1}: ${probe.frames.length}/${fixture.sourceWindow.frameCount}; evidence ${evidence}; raw ${raw}`);
}
