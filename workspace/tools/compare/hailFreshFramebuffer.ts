import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";
import {
  compareHailRows,
  type HailOrientation,
} from "./hailFramebuffer.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(
  join(root, "tools/compare/fixtures/hail-evidence.json"),
  "utf8",
));
const runsFlag = process.argv.indexOf("--runs");
const runs = runsFlag >= 0 ? Number(process.argv[runsFlag + 1]) : 1;
if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs must be positive");
const fresh = new Map<HailOrientation, Readonly<{ json: string; raw: string }>>();

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function verify(orientation: HailOrientation, runNumber: number): number {
  const receipt = fixture.orientations[orientation];
  const scratch = createScratchDir(`pokebench-hail-fresh-${orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"),
    join(root, fixture.source.probe),
    join(root, receipt.scenario),
    output,
    rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);

  const json = readFileSync(output);
  const evidence = JSON.parse(json.toString()) as { frames: any[] };
  if (evidence.frames.length !== 158
    || evidence.frames[0]?.scriptOffset !== 0
    || evidence.frames.at(-1)?.animScriptActive !== false
    || evidence.frames.at(-1)?.visualTaskCount !== 0
    || evidence.frames.at(-1)?.soundTaskCount !== 0) {
    throw new Error(`${orientation} run ${runNumber}: incomplete fresh source window`);
  }
  const rawHash = createHash("sha256");
  for (const [age, row] of evidence.frames.entries()) {
    const raw = readFileSync(join(
      rgbDir,
      `${String(row.frame).padStart(5, "0")}.rgb`,
    ));
    if (sha(raw) !== row.sha256) {
      throw new Error(`${orientation} run ${runNumber} age ${age}: raw RGB digest`);
    }
    rawHash.update(raw);
  }
  const compared = compareHailRows(orientation, evidence.frames, rgbDir);
  const hashes = { json: sha(json), raw: rawHash.digest("hex") };
  if (hashes.json !== receipt.probeJsonSha256
    || hashes.raw !== receipt.rawRgbSequenceSha256) {
    throw new Error(`${orientation} run ${runNumber}: retained evidence hashes drifted`);
  }
  if (runNumber === 1) fresh.set(orientation, hashes);
  else if (JSON.stringify(fresh.get(orientation)) !== JSON.stringify(hashes)) {
    throw new Error(`${orientation}: fresh evidence/proof did not reproduce`);
  }
  console.log(
    `${orientation} run ${runNumber}: ${compared.matched}/158 production framebuffer; `
    + `probe=${hashes.json} raw=${hashes.raw}`,
  );
  return compared.matched;
}

for (let run = 1; run <= runs; run += 1) {
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    total += verify(orientation, run);
  }
  if (total !== 316) throw new Error(`fresh run ${run}: incomplete ${total}/316`);
  console.log(`fresh run ${run}: 316/316 exact with inactive cleanup`);
}
