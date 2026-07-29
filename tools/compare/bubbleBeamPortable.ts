import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

interface Fixture { readonly schema: string; readonly orientation: string; readonly scenario: string; readonly probe: string; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly evidenceSha256: string; readonly rawRgbSha256: string; }
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixtures = process.argv.slice(2);
if (fixtures.length !== 2) throw new Error("usage: bubbleBeamPortable.ts <player fixture> <opponent fixture>");
const fresh = new Map<string, string>();
for (let pass = 0; pass < 2; pass += 1) for (const path of fixtures) {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-bubble-beam-"));
  const output = join(scratch, "probe.json"), rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgb], { cwd: root, encoding: "utf8" });
  if (run.status) throw new Error(run.stderr || run.stdout);
  const bytes = readFileSync(output), receipt = JSON.parse(bytes.toString());
  const evidence = createHash("sha256").update(bytes).digest("hex"), raw = createHash("sha256");
  for (const frame of receipt.frames) { const pixels = readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`)); if (createHash("sha256").update(pixels).digest("hex") !== frame.sha256) throw new Error(`${fixture.orientation}: raw RGB changed at ${frame.frame}`); raw.update(pixels); }
  const rgbDigest = raw.digest("hex"), key = `${evidence}/${rgbDigest}`;
  if (fixture.schema !== "bubble-beam-portable-evidence/v1" || receipt.schema !== "bubble-beam-dense-evidence/v1" || JSON.stringify(receipt.sourceWindow) !== JSON.stringify(fixture.sourceWindow) || receipt.frames.length !== fixture.sourceWindow.frameCount || evidence !== fixture.evidenceSha256 || rgbDigest !== fixture.rawRgbSha256 || receipt.lifecycleCounts.bubbleProjectile !== 18 || receipt.lifecycleCounts.waterBubble !== 6 || !receipt.topology.callbacks.includes("AnimWaterBubbleProjectile_Step1") || !receipt.topology.callbacks.includes("AnimBubbleEffect_Step") || !receipt.topology.tasks.includes("AnimTask_SwayMonStep") || receipt.frames.at(-1).gAnimScriptActive !== 0 || receipt.frames.at(-1).visualTaskCount !== 0) throw new Error(`${fixture.orientation}: incomplete Bubble Beam receipt ${key}`);
  const tags = new Set(receipt.frames.flatMap((frame: { paletteTags: number[] }) => frame.paletteTags));
  for (const tag of [10146, 10155]) if (!tags.has(tag)) throw new Error(`${fixture.orientation}: missing palette tag ${tag}`);
  for (const row of receipt.frames) if (row.currentMove !== undefined || row.softwareOam.length !== 128 || row.hardwareOam.length !== 128 || row.hardwareMatrices.length !== 32 || row.fadedPalette.length !== 512 || row.unfadedPalette.length !== 512 || row.hardwarePalette.length !== 512 || row.se1.tracks.length !== 3 || row.se2.tracks.length !== 3) throw new Error(`${fixture.orientation}: incomplete full receipt`);
  if (fresh.has(fixture.orientation) && fresh.get(fixture.orientation) !== key) throw new Error(`${fixture.orientation}: fresh evidence diverged`);
  fresh.set(fixture.orientation, key); console.log(`${fixture.orientation} pass ${pass + 1}: ${key}`);
}
