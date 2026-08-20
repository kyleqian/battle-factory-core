import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";
import {
  compareRainDanceRows,
  type RainDanceOrientation,
} from "./rainDanceFramebuffer.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(
  join(root, "tools/compare/fixtures/rain-dance-evidence.json"), "utf8",
));
const fresh = new Map<RainDanceOrientation, Readonly<{
  json: string;
  raw: string;
}>>();

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function verify(orientation: RainDanceOrientation, runNumber: number): number {
  const receipt = fixture.orientations[orientation];
  const scratch = createScratchDir(
    `pokebench-rain-dance-fresh-${orientation}-`,
  );
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
  if (evidence.frames.length !== 187
    || evidence.frames[0]?.scriptOffset !== 0
    || evidence.frames.at(-1)?.animScriptActive !== false
    || evidence.frames.at(-1)?.visualTaskCount !== 0
    || evidence.frames.at(-1)?.soundTaskCount !== 0) {
    throw new Error(
      `${orientation} run ${runNumber}: incomplete fresh source window`,
    );
  }
  const rawHash = createHash("sha256");
  for (const [age, row] of evidence.frames.entries()) {
    const raw = readFileSync(
      join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`),
    );
    if (sha(raw) !== row.sha256) {
      throw new Error(
        `${orientation} run ${runNumber} age ${age}: raw RGB digest`,
      );
    }
    rawHash.update(raw);
  }
  const matched = compareRainDanceRows(
    orientation,
    evidence.frames,
    rgbDir,
  );
  const hashes = { json: sha(json), raw: rawHash.digest("hex") };
  if (runNumber === 1) fresh.set(orientation, hashes);
  else if (JSON.stringify(fresh.get(orientation)) !== JSON.stringify(hashes)) {
    throw new Error(`${orientation}: fresh evidence/proof did not reproduce`);
  }
  console.log(
    `${orientation} run ${runNumber}: ${matched}/187 production framebuffer; `
    + "framebufferCompared=true",
  );
  return matched;
}

for (let run = 1; run <= 2; run += 1) {
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    total += verify(orientation, run);
  }
  if (total !== 374) throw new Error(`fresh run ${run}: incomplete ${total}/374`);
  console.log(`fresh run ${run}: 374/374 exact with inactive cleanup`);
}
