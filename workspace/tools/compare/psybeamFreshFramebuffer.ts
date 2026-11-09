import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { psybeamConfigFor } from "./psybeamFramebuffer.ts";

type Orientation = "player-back" | "opponent-front";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(
  join(root, "tools/compare/fixtures/psybeam-evidence.json"), "utf8",
));
const fresh = new Map<Orientation, Readonly<{ json: string; raw: string }>>();

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function verify(orientation: Orientation, runNumber: number): number {
  const receipt = fixture.orientations[orientation];
  const scratch = createScratchDir(`pokebench-psybeam-fresh-${orientation}-`);
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
  if (evidence.frames.length !== 160
    || evidence.frames[0]?.scriptOffset !== 0
    || evidence.frames.at(-1)?.animScriptActive !== false
    || evidence.frames.at(-1)?.visualTaskCount !== 0
    || evidence.frames.at(-1)?.soundTaskCount !== 0) {
    throw new Error(`${orientation} run ${runNumber}: incomplete fresh source window`);
  }
  const stage = createSceneOnMovePresentation(
    psybeamConfigFor(orientation, evidence.frames),
  );
  const rawHash = createHash("sha256");
  let matched = 0;
  for (const [age, row] of evidence.frames.entries()) {
    const raw = readFileSync(
      join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`),
    );
    if (sha(raw) !== row.sha256) {
      throw new Error(`${orientation} run ${runNumber} age ${age}: raw RGB digest`);
    }
    rawHash.update(raw);
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let residual = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) residual += 1;
    }
    if (residual !== 0) {
      throw new Error(
        `${orientation} run ${runNumber} age ${age}: framebuffer residual ${residual}`,
      );
    }
    matched += 1;
  }
  const hashes = { json: sha(json), raw: rawHash.digest("hex") };
  if (runNumber === 1) fresh.set(orientation, hashes);
  else if (JSON.stringify(fresh.get(orientation)) !== JSON.stringify(hashes)) {
    throw new Error(`${orientation}: fresh evidence/proof did not reproduce`);
  }
  console.log(`${orientation} run ${runNumber}: ${matched}/160 production framebuffer`);
  return matched;
}

for (let run = 1; run <= 2; run += 1) {
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    total += verify(orientation, run);
  }
  if (total !== 320) throw new Error(`fresh run ${run}: incomplete ${total}/320`);
  console.log(`fresh run ${run}: 320/320 exact with inactive cleanup`);
}
