import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: { readonly status: "unsupported" };
}

interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["denseWindow"];
  readonly topology: {
    readonly templates: readonly string[];
    readonly callbacks: readonly string[];
    readonly tasks: readonly string[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length === 0) {
  fixturePaths.push(
    "tools/compare/fixtures/flame-wheel-player-quilava-opponent-onix.json",
    "tools/compare/fixtures/flame-wheel-opponent-quilava-player-onix.json",
  );
}
const sha = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

for (const fixturePath of fixturePaths) {
  const fixture = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Fixture;
  const scratch = createScratchDir(`pokebench-flame-wheel-${fixture.orientation}-`);
  const output = join(scratch, "probe.json");
  const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgb,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const evidence = readFileSync(output);
  const probe = JSON.parse(evidence.toString("utf8")) as Probe;
  const raw = Buffer.concat(readdirSync(rgb).sort().map((file) => readFileSync(join(rgb, file))));
  const mapRun = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgb], {
    cwd: root, encoding: "utf8",
  });
  if (mapRun.status !== 0) throw new Error(mapRun.stderr);
  const separator = mapRun.stdout.indexOf(" — ");
  if (separator < 0) throw new Error("change-map header changed");
  const map = `# ${basename(fixture.changeMap)} raw RGB888 — ${mapRun.stdout.slice(separator + 3)}`;
  const requiredTemplates = [
    "gFireSpiralOutwardSpriteTemplate", "gFireSpreadSpriteTemplate",
    "gSlideMonToOffsetSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate",
  ];
  const requiredCallbacks = [
    "AnimFireSpiralOutward_Step1", "AnimFireSpiralOutward_Step2",
    "TranslateSpriteLinearFixedPoint", "TranslateSpriteLinearByIdFixedPoint",
    "SlideMonToOriginalPos_Step",
  ];
  const requiredTasks = ["AnimTask_ShakeMon_Step", "AnimTask_BlendMonInAndOut_Step"];
  const failures: string[] = [];
  if (probe.schema !== fixture.evidenceSchema) failures.push("schema");
  if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) failures.push("window");
  if (sha(evidence) !== fixture.evidenceSha256
      || fixture.secondFreshEvidenceSha256 !== fixture.evidenceSha256) failures.push("evidence receipt");
  if (sha(raw) !== fixture.rawRgbSha256) failures.push("raw RGB");
  if (sha(map) !== fixture.changeMapSha256
      || map !== readFileSync(resolve(root, fixture.changeMap), "utf8")) failures.push("change map");
  for (const value of requiredTemplates) if (!probe.topology.templates.includes(value)) failures.push(value);
  for (const value of requiredCallbacks) if (!probe.topology.callbacks.includes(value)) failures.push(value);
  for (const value of requiredTasks) if (!probe.topology.tasks.includes(value)) failures.push(value);
  console.log(
    `${fixture.orientation}: ${probe.sourceWindow.frameCount}/${probe.sourceWindow.frameCount} `
    + `dense source/hardware/raw-RGB evidence frames reproduced; coverage remains unsupported`,
  );
  if (failures.length) throw new Error(`${fixture.orientation}: ${failures.join(", ")}`);
}
