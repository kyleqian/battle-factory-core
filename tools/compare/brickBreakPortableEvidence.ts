import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type Fixture = { schema: string; oracleProfile: string; orientation: string; scenario: string; probe: string; sourceWindow: { startFrame: number; endFrame: number; frameCount: number }; evidenceSha256: string; rawRgbSha256: string };
type Frame = { frame: number; sha256: string; active: number; visualTaskCount: number; sprites: Array<{ slot: number; template: { symbol: string | null }; callback: { symbol: string | null } }>; tasks: Array<{ func: { symbol: string | null } }>; paletteTags: number[]; tileTags: number[]; softwareOam: string[]; hardwareOam: string[]; hardwareMatrices: number[][]; fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[]; registers: { bldcnt: number; bldalpha: number; bldy: number }; se1: { songHeader: number; tracks: Array<{ flags: number; panX: number }> } };
type Probe = { schema: string; sourceWindow: Fixture["sourceWindow"]; lifecycleCounts: { wall: number; shard: number }; songHeaders: Record<string, number>; frames: Frame[] };
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: brickBreakPortableEvidence.ts <player> <opponent>");
const fresh = new Map<string, string>();
function run(path: string, pass: number) {
  const f = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-brick-break-")); const out = join(scratch, "probe.json"); const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const p = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), out, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, f.probe), resolve(root, f.scenario), out, rgb], { cwd: root, encoding: "utf8" });
  if (p.stdout) process.stdout.write(p.stdout); if (p.stderr) process.stderr.write(p.stderr); if (p.status) process.exit(p.status);
  const bytes = readFileSync(out), probe = JSON.parse(bytes.toString()) as Probe, raw = createHash("sha256"), problems: string[] = [];
  for (const row of probe.frames) { const b = readFileSync(join(rgb, `${String(row.frame).padStart(5, "0")}.rgb`)); raw.update(b); if (createHash("sha256").update(b).digest("hex") !== row.sha256) problems.push(`raw ${row.frame}`); }
  const evidence = createHash("sha256").update(bytes).digest("hex"), rawHash = raw.digest("hex");
  if (f.schema !== "brick-break-portable-evidence/v1" || f.oracleProfile !== "battle-scene-on" || probe.schema !== "brick-break-dense-evidence/v1" || JSON.stringify(f.sourceWindow) !== JSON.stringify(probe.sourceWindow) || evidence !== f.evidenceSha256 || rawHash !== f.rawRgbSha256) problems.push("receipt/window");
  if (probe.lifecycleCounts.wall !== 1 || probe.lifecycleCounts.shard !== 4) problems.push("wall/shard lifecycle counts");
  const first = probe.frames[0]!;
  for (const [age, row] of probe.frames.entries()) {
    const named = (s: string) => row.sprites.filter(x => x.template.symbol === s).length;
    if (row.active !== (age < 191 ? 1 : 0) || (age === 191 && row.visualTaskCount !== 0)) problems.push(`cleanup ${age}`);
    if (named("gBrickBreakWallSpriteTemplate") !== (age >= 22 && age <= 120 ? 1 : 0) || named("gBrickBreakWallShardSpriteTemplate") !== (age >= 127 && age <= 166 ? 4 : 0)) problems.push(`wall/shards ${age}`);
    if (row.paletteTags.includes(10208) !== (age >= 10 && age < 191) || row.tileTags.includes(10208) !== (age >= 10 && age < 191)) problems.push(`TORN_METAL tag ${age}`);
    if (row.fadedPalette.length !== 512 || row.unfadedPalette.length !== 512 || row.hardwarePalette.length !== 512 || row.softwareOam.length !== 128 || row.hardwareOam.length !== 128 || row.hardwareMatrices.length !== 32) problems.push(`OAM/palette shape ${age}`);
    if (row.registers.bldcnt !== (age >= 16 ? 16192 : 0) || row.registers.bldalpha !== (age >= 16 ? 2060 : 0) || row.registers.bldy !== 0) problems.push(`blend registers ${age}`);
  }
  const wind = probe.frames.slice(76, 112).map(r => r.tasks.some(t => t.func.symbol?.startsWith("AnimTask_WindUpLunge")));
  if (wind.some(x => !x)) problems.push("WindUpLunge lifecycle");
  for (const [age, song] of [[25, "SE_M_VITAL_THROW"], [54, "SE_M_VITAL_THROW"], [115, "SE_M_VITAL_THROW2"], [127, "SE_M_BRICK_BREAK"]] as const) { const row = probe.frames[age]!; if (row.se1.songHeader !== probe.songHeaders[song] || !row.se1.tracks.some(t => (t.flags & 0x80) && Math.abs(t.panX) === 63)) problems.push(`audio ${song}`); }
  if (fresh.has(f.orientation) && fresh.get(f.orientation) !== evidence) problems.push("fresh reproducibility"); fresh.set(f.orientation, evidence);
  console.log(`${f.orientation} run ${pass}: 192/192 source/hardware frames; evidence/raw-RGB ${evidence}/${rawHash}`);
  if (problems.length) throw new Error(problems.slice(0, 20).join("\n"));
}
for (let pass = 1; pass <= 2; pass++) for (const path of paths) run(path, pass);
