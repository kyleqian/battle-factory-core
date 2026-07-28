import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

interface Fixture { readonly scenario: string; readonly probe: string; readonly orientation: string; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly evidenceSha256: string; readonly rawRgbSha256: string; }
interface Frame { readonly frame: number; readonly sha256: string; readonly gAnimScriptActive: number; readonly scriptOffset: number | null; readonly tasks: readonly { readonly func: { readonly symbol: string | null } }[]; readonly sprites: readonly { readonly template: { readonly symbol: string | null } }[]; readonly hardwareOam: readonly string[]; readonly hardwareMatrices: readonly unknown[]; readonly hardwarePalette: readonly number[]; readonly fadedPalette: readonly number[]; readonly paletteTags: readonly number[]; readonly registers: Readonly<Record<string, number>>; readonly se1: { readonly rawInfo: string; readonly tracks: readonly unknown[] }; readonly se2: { readonly rawInfo: string; readonly tracks: readonly unknown[] }; }
interface Probe { readonly schema: string; readonly captureWindow: Fixture["sourceWindow"]; readonly sourceWindow: Fixture["sourceWindow"]; readonly sourceSymbols: Readonly<Record<string, number>>; readonly templates: Readonly<Record<string, number>>; readonly frames: readonly Frame[]; }
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) throw new Error("usage: astonishEvidence.ts <player-fixture> <opponent-fixture>");
const outputs = new Map<string, string>(); const rgbs = new Map<string, string>();
const digestRgb = (directory: string, frames: readonly Frame[]) => { const hash = createHash("sha256"); for (const frame of frames) hash.update(readFileSync(join(directory, `${String(frame.frame).padStart(5, "0")}.rgb`))); return hash.digest("hex"); };

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-astonish-evidence-")); const output = join(scratch, "probe.json"); const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const process = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgb], { cwd: root, encoding: "utf8" });
  if (process.stdout) globalThis.process.stdout.write(process.stdout); if (process.stderr) globalThis.process.stderr.write(process.stderr);
  if (process.status !== 0) globalThis.process.exit(process.status ?? 1);
  const bytes = readFileSync(output); const probe = JSON.parse(bytes.toString()) as Probe;
  if (probe.schema !== "astonish-dense-evidence/v1") throw new Error(`${fixture.orientation}: unexpected schema`);
  const source = probe.frames.filter((frame) => frame.frame >= probe.sourceWindow.startFrame && frame.frame <= probe.sourceWindow.endFrame);
  if (source.length !== probe.sourceWindow.frameCount || source.some((frame, index) => frame.frame !== probe.sourceWindow.startFrame + index) || probe.sourceWindow.startFrame !== fixture.sourceWindow.startFrame || probe.sourceWindow.endFrame !== fixture.sourceWindow.endFrame || probe.sourceWindow.frameCount !== fixture.sourceWindow.frameCount) throw new Error(`${fixture.orientation}: source window changed or is not dense`);
  const hasTask = (name: string) => source.some((frame) => frame.tasks.some((task) => task.func.symbol === name));
  const hasSprite = (name: string) => source.some((frame) => frame.sprites.some((sprite) => sprite.template.symbol === name));
  if (source[0]!.scriptOffset !== 0 || source.at(-1)!.gAnimScriptActive !== 0 || hasTask("AnimTask_StretchTargetUp") === false || hasTask("AnimTask_ShakeMon2_Step") === false || hasSprite("gHorizontalLungeSpriteTemplate") === false || hasSprite("gSprayWaterDropletSpriteTemplate") === false) throw new Error(`${fixture.orientation}: source component topology changed`);
  for (const frame of source) {
    if (createHash("sha256").update(readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`))).digest("hex") !== frame.sha256 || frame.hardwareOam.length !== 128 || frame.hardwareMatrices.length !== 32 || frame.hardwarePalette.length !== 512 || frame.fadedPalette.length !== 512 || frame.paletteTags.length !== 16 || frame.se1.tracks.length !== 3 || frame.se2.tracks.length !== 3 || !frame.se1.rawInfo || !frame.se2.rawInfo || frame.registers.dispcnt === undefined || frame.registers.bldcnt === undefined) throw new Error(`${fixture.orientation}: incomplete task/sprite/OAM/palette/register/audio/rawRGB receipt`);
  }
  const evidence = createHash("sha256").update(bytes).digest("hex"); const raw = digestRgb(rgb, source);
  if (fixture.evidenceSha256 && evidence !== fixture.evidenceSha256 || fixture.rawRgbSha256 && raw !== fixture.rawRgbSha256) throw new Error(`${fixture.orientation}: committed digest changed`);
  for (const [map, value, label] of [[outputs, evidence, "evidence"], [rgbs, raw, "raw RGB"]] as const) { const prior = map.get(fixture.orientation); if (prior !== undefined && prior !== value) throw new Error(`${fixture.orientation}: fresh ${label} changed`); map.set(fixture.orientation, value); }
  console.log(`${fixture.orientation} run ${runNumber}: ${source.length}/${probe.sourceWindow.frameCount}; evidence ${evidence}; raw ${raw}`);
}
for (let run = 1; run <= 2; run += 1) for (const fixture of fixturePaths) verify(fixture, run);
