import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type Side = "player" | "opponent";
type Fixture = {
  schema: "rolling-kick-evidence/v1";
  oracleProfile: "battle-scene-on";
  orientation: string;
  scenario: string;
  probe: string;
  probeMoveId: 27;
  attackerSide: Side;
  targetSide: Side;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: 55 };
  evidenceSha256: string;
  rawRgbSha256: string;
};
type Sprite = {
  template: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  data: number[];
};
type Frame = {
  frame: number;
  sha256: string;
  animScriptActive: boolean;
  player: Record<string, unknown>;
  opponent: Record<string, unknown>;
  playerSprite: { x2: number; y2: number };
  opponentSprite: { x2: number; y2: number };
  sprites: Sprite[];
  tasks: { func: number; data: number[] }[];
  fadedPalette: number[];
  unfadedPalette: number[];
  hardwarePalette: number[];
  paletteTags: number[];
  tileTags: number[];
  softwareOam: string[];
  hardwareOam: number[][];
  hardwareMatrices: number[][];
  se1: {
    songHeader: number;
    tracks: { flags: number; panX: number }[];
  };
  bldcnt: number;
  bldalpha: number;
  bldy: number;
};
type Probe = {
  templates: Record<string, number>;
  taskFuncs: Record<string, number>;
  songHeaders: Record<string, number>;
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length < 1 || paths.length > 2) {
  throw new Error(
    "usage: rollingKickEvidence.ts <fixture> [fixture]",
  );
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(path), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-rolling-kick-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
    String(fixture.probeMoveId),
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  const byFrame = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const source = Array.from(
    { length: fixture.sourceWindow.frameCount },
    (_, age) => byFrame.get(fixture.sourceWindow.startFrame + age),
  );
  if (
    fixture.schema !== "rolling-kick-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || source.some((frame) => !frame)
  ) throw new Error(`${fixture.orientation}: incomplete source window`);

  const failures: string[] = [];
  const receipt = createHash("sha256");
  const rawWindow = createHash("sha256");
  const first = source[0]!;
  const templates = probe.templates;
  const attackerPan = fixture.attackerSide === "player" ? -64 : 63;
  const targetPan = fixture.targetSide === "player" ? -63 : 63;

  for (const [age, frame] of source.entries()) {
    const oracle = frame!;
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    receipt.update(JSON.stringify(oracle));
    receipt.update(rgb);
    rawWindow.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) {
      failures.push(`age ${age}: raw RGB hash`);
    }
    if (oracle.animScriptActive !== (age < 54)) {
      failures.push(`age ${age}: first-inactive cleanup`);
    }
    const alpha = age >= 10 && age <= 42;
    if (
      alpha
        ? oracle.bldcnt !== 16192 || oracle.bldalpha !== 2060
          || oracle.bldy !== 0
        : oracle.bldcnt !== 0 || oracle.bldalpha !== 0 || oracle.bldy !== 0
    ) failures.push(`age ${age}: alpha registers`);

    const named = (name: string) =>
      oracle.sprites.filter((sprite) => sprite.template === templates[name]);
    if (
      named("gSlidingKickSpriteTemplate").length
      !== (age >= 25 && age <= 34 ? 1 : 0)
    ) failures.push(`age ${age}: sliding-kick callback lifetime`);
    if (
      named("gBasicHitSplatSpriteTemplate").length
      !== (age >= 32 && age <= 41 ? 1 : 0)
    ) failures.push(`age ${age}: impact lifetime`);
    if (
      named("gSlideMonToOffsetSpriteTemplate").length
      !== (age >= 25 && age <= 29 ? 1 : 0)
    ) failures.push(`age ${age}: SlideMonToOffset lifetime`);
    if (
      named("gSlideMonToOriginalPosSpriteTemplate").length
      !== (age >= 43 && age <= 52 ? 1 : 0)
    ) failures.push(`age ${age}: SlideMonToOriginalPos lifetime`);
    const shake = oracle.tasks.some((task) =>
      task.func === probe.taskFuncs.AnimTask_ShakeMon
      || task.func === probe.taskFuncs.AnimTask_ShakeMon_Step
    );
    if (shake !== (age >= 32 && age <= 41)) {
      failures.push(`age ${age}: target ShakeMon lifetime`);
    }

    if (
      oracle.fadedPalette.length !== 512
      || oracle.unfadedPalette.length !== 512
      || oracle.hardwarePalette.length !== 512
      || oracle.paletteTags.length !== 16
      || oracle.tileTags.length !== 128
      || oracle.softwareOam.length !== 128
      || oracle.hardwareOam.length !== 128
      || oracle.hardwareMatrices.length !== 32
    ) failures.push(`age ${age}: palette/OAM/register shape`);
    for (const side of ["player", "opponent"] as const) {
      for (
        const key of [
          "species", "hp", "maxHp", "item", "status1", "status2", "status3",
        ]
      ) {
        if (oracle[side][key] !== first[side][key]) {
          failures.push(`age ${age}: gameplay ${side}.${key}`);
        }
      }
    }

    const audiblePan = (pan: number) => oracle.se1.tracks.some((track) =>
      (track.flags & 0x80) !== 0 && track.panX === pan
    );
    if (
      (age === 10 || age === 16)
      && (
        oracle.se1.songHeader !== probe.songHeaders.SE_M_DOUBLE_TEAM
        || !audiblePan(attackerPan)
      )
    ) failures.push(`age ${age}: Double Team attacker-pan trigger`);
    if (
      age === 32
      && (
        oracle.se1.songHeader !== probe.songHeaders.SE_M_VITAL_THROW2
        || !audiblePan(targetPan)
      )
    ) failures.push(`age ${age}: impact target-pan trigger`);
  }

  const digest = receipt.digest("hex");
  const rawDigest = rawWindow.digest("hex");
  if (digest !== fixture.evidenceSha256) {
    failures.push(`evidence receipt ${digest} !== ${fixture.evidenceSha256}`);
  }
  if (rawDigest !== fixture.rawRgbSha256) {
    failures.push(`raw RGB receipt ${rawDigest} !== ${fixture.rawRgbSha256}`);
  }
  console.log(
    `${fixture.orientation} run ${runNumber}: 55/55 dense source frames; `
    + `evidence/raw-RGB ${digest}/${rawDigest}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 40).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const path of paths) verify(path, runNumber);
}
