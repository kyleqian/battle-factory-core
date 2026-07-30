import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Fixture = {
  readonly scenario: string; readonly probe: string; readonly orientation: string;
  readonly branch: "damage" | "heal"; readonly occurrence: number;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly lifecycleCounts: Record<string, number>; readonly evidenceSha256: string; readonly rawRgbSha256: string;
};
type Probe = { readonly sourceWindow: Fixture["denseWindow"]; readonly lifecycleCounts: Record<string, number>; readonly topology: { readonly templates: readonly string[]; readonly callbacks: readonly string[] }; readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly gAnimScriptActive: number; readonly visualTaskCount: number; readonly softwareOam: readonly string[]; readonly hardwareOam: readonly string[]; readonly hardwareMatrices: readonly unknown[]; readonly fadedPalette: readonly number[]; readonly paletteTags: readonly number[]; readonly tileTags: readonly number[]; readonly registers: Record<string, number>; readonly se1: unknown; readonly se2: unknown }[] };

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function verify(label: string) {
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-present-evidence-"));
  const output = join(scratch, "probe.json"), rgb = join(scratch, "rgb");
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgb, String(fixture.occurrence)], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout); if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${label}: probe failed`);
  const bytes = readFileSync(output), probe = JSON.parse(bytes.toString()) as Probe;
  if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) throw new Error(`${label}: window drift`);
  if (JSON.stringify(probe.lifecycleCounts) !== JSON.stringify(fixture.lifecycleCounts)) throw new Error(`${label}: lifecycle drift`);
  const required = fixture.branch === "damage" ? ["gExplosionSpriteTemplate"] : ["gPresentHealParticleSpriteTemplate", "gHealingBlueStarSpriteTemplate", "AnimPresentHealParticle"];
  if (required.some((name) => !probe.topology.templates.includes(name) && !probe.topology.callbacks.includes(name))) throw new Error(`${label}: branch identity drift`);
  if (probe.frames.length !== fixture.denseWindow.frameCount || probe.frames.at(-1)?.gAnimScriptActive !== 0 || probe.frames.at(-1)?.visualTaskCount !== 0) throw new Error(`${label}: cleanup drift`);
  const raw = createHash("sha256");
  for (const frame of probe.frames) {
    const pixels = readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`)); raw.update(pixels);
    if (sha(pixels) !== frame.sha256 || frame.softwareOam.length !== 128 || frame.hardwareOam.length !== 128 || frame.hardwareMatrices.length !== 32 || frame.fadedPalette.length !== 512 || Object.keys(frame.registers).length < 21 || frame.se1 === undefined || frame.se2 === undefined) throw new Error(`${label}: dense hardware/audio receipt drift at ${frame.frame}`);
  }
  const evidence = sha(bytes), rgbSha = raw.digest("hex");
  console.log(`${label}: ${fixture.orientation}/${fixture.branch} ${probe.frames.length}/${fixture.denseWindow.frameCount}; evidence ${evidence}; raw ${rgbSha}`);
  if (fixture.evidenceSha256 && (evidence !== fixture.evidenceSha256 || rgbSha !== fixture.rawRgbSha256)) throw new Error(`${label}: committed digest drift`);
  return `${evidence}/${rgbSha}`;
}
const receipts = [verify("fresh-1"), verify("fresh-2")];
if (receipts[0] !== receipts[1]) throw new Error("twice-fresh receipts differ");
