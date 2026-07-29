import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type Fixture = {
  schema: string;
  orientation: string;
  scenario: string;
  probe: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSha256: string;
  rawRgbSha256: string;
};
type Frame = {
  frame: number;
  sha256: string;
  gAnimScriptActive: number;
  scriptOffset: number | null;
  visualTaskCount: number;
  soundTaskCount: number;
  sprites: { slot: number; template: { symbol: string | null };
    callback: { symbol: string | null } }[];
  softwareOam: string[];
  hardwareOam: string[];
  fadedPalette: number[];
  hardwarePalette: number[];
  paletteTags: number[];
  registers: Record<string, number>;
  se1: { songHeader: number; tracks: { flags: number; panX: number }[] };
  se2: { songHeader: number; tracks: { flags: number; panX: number }[] };
};
type Probe = {
  schema: string;
  sourceWindow: Fixture["sourceWindow"];
  songHeaders: { SE_M_WHIRLPOOL: number };
  lifecycleCounts: { mudShotOrb: number };
  topology: { tasks: string[]; templates: string[]; callbacks: string[] };
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: mudShotPortableEvidence.ts <player-fixture> <opponent-fixture>");
}

function run(fixturePath: string, runNumber: number): string {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-mud-shot-evidence-"));
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
  for (const frame of probe.frames) {
    const raw = readFileSync(
      join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
    );
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== frame.sha256) {
      throw new Error(`${fixture.orientation}: raw RGB receipt changed at ${frame.frame}`);
    }
  }
  const rawDigest = rawHash.digest("hex");
  if (fixture.schema !== "mud-shot-portable-evidence/v1"
    || probe.schema !== "mud-shot-dense-evidence/v1"
    || JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.sourceWindow)
    || evidence !== fixture.evidenceSha256
    || rawDigest !== fixture.rawRgbSha256
    || probe.lifecycleCounts.mudShotOrb !== 22
    || !probe.topology.callbacks.includes("AnimToTargetInSinWave_Step")
    || !probe.topology.tasks.includes("AnimTask_RunSinAnimTimer")
    || !probe.topology.tasks.includes("AnimTask_ShakeMon_Step")) {
    throw new Error(`${fixture.orientation}: portable evidence contract changed`);
  }
  let transfers = 0;
  for (let index = 1; index < probe.frames.length; index += 1) {
    const row = probe.frames[index]!;
    const prior = probe.frames[index - 1]!;
    if (JSON.stringify(row.hardwareOam) !== JSON.stringify(prior.softwareOam)) {
      throw new Error(`${fixture.orientation}: OAM transfer mismatch at ${row.frame}`);
    }
    if (JSON.stringify(row.hardwarePalette) !== JSON.stringify(prior.fadedPalette)
      && JSON.stringify(row.hardwarePalette) !== JSON.stringify(row.fadedPalette)) {
      throw new Error(`${fixture.orientation}: palette transfer mismatch at ${row.frame}`);
    }
    transfers += 1;
  }
  const tagged = probe.frames.filter((frame) => frame.paletteTags.includes(10259));
  if (!tagged.length || probe.frames.at(-1)?.paletteTags.includes(10259)
    || probe.frames.at(-1)?.gAnimScriptActive
    || probe.frames.at(-1)?.visualTaskCount) {
    throw new Error(`${fixture.orientation}: BROWN_ORB cleanup contract changed`);
  }
  const audio = probe.frames.filter((frame) =>
    frame.se1.songHeader === probe.songHeaders.SE_M_WHIRLPOOL
    || frame.se2.songHeader === probe.songHeaders.SE_M_WHIRLPOOL
  );
  if (!audio.length || !audio.some((frame) =>
    [...frame.se1.tracks, ...frame.se2.tracks].some((track) => track.flags !== 0)
  )) {
    throw new Error(`${fixture.orientation}: Whirlpool pan sweep was not live`);
  }
  console.log(`${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length} source/RGB frames, 22 orbs, `
    + `${transfers} OAM/palette transfers; ${evidence}; ${rawDigest}`);
  return `${evidence}:${rawDigest}`;
}

for (const fixture of fixturePaths) {
  const first = run(fixture, 1);
  const second = run(fixture, 2);
  if (first !== second) {
    throw new Error(`${fixture}: fresh evidence was not byte-identical`);
  }
}
