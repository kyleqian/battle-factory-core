import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  HYPNOSIS_OPPONENT_FRAME_COUNT,
  HYPNOSIS_PLAYER_FRAME_COUNT,
  hypnosisAtAge,
  type HypnosisPoint,
  type HypnosisSide,
} from "../../src/animation/hypnosis.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHypnosisView,
  type SceneOnHypnosisConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Window = { startFrame: number; endFrame: number; frameCount: number };
type Fixture = SceneOnHypnosisConfig & {
  schema: "hypnosis-portable-evidence/v1";
  oracleProfile: "battle-scene-on";
  orientation: string;
  scenario: string;
  probe: string;
  attackerSide: HypnosisSide;
  attackerCenter: HypnosisPoint;
  targetCenter: HypnosisPoint;
  sourceWindow: Window;
  evidenceSha256: string;
  rawRgbSha256: string;
};
type Ring = {
  slot: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  data: number[];
  callback: { symbol: string | null };
};
type Battler = {
  species: number;
  hp: number;
  maxHp: number;
  item: number;
  status1: number;
  status2: number;
  status3: number;
};
type AudioPlayer = {
  songHeader: number;
  status: number;
  tracks: { flags: number; panX: number }[];
};
type Frame = {
  frame: number;
  sha256: string;
  gAnimScriptActive: boolean;
  scriptOffset: number | null;
  goldRings: Ring[];
  tasks: { func: { symbol: string | null }; data: number[] }[];
  softwareOam: string[];
  hardwareOam: number[][];
  hardwareMatrices: number[][];
  fadedPalette: number[];
  unfadedPalette: number[];
  hardwarePalette: number[];
  paletteTags: number[];
  tileTags: number[];
  registers: Record<string, number>;
  se1: AudioPlayer;
  se2: AudioPlayer;
  battlerState: { player: Battler; opponent: Battler };
};
type Probe = {
  schema: "hypnosis-dense-evidence/v1";
  sourceWindow: Window;
  lifecycleCounts: { gGoldRingSpriteTemplate: number };
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: hypnosisPortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = createScratchDir("pokebench-hypnosis-");
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
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const expectedCount = fixture.attackerSide === "player"
    ? HYPNOSIS_PLAYER_FRAME_COUNT
    : HYPNOSIS_OPPONENT_FRAME_COUNT;
  if (
    fixture.schema !== "hypnosis-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== "hypnosis-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== expectedCount
    || probe.lifecycleCounts.gGoldRingSpriteTemplate !== 6
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const firstBattlers = probe.frames[0]!.battlerState;
  const stage = createSceneOnMovePresentation({
    move: "HYPNOSIS",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const raw = createHash("sha256");
  const failures: string[] = [];
  let componentFrames = 0;
  let framebufferFrames = 0;
  let sawPsychicTask = false;
  let sawBlendTask = false;
  for (const [age, oracle] of probe.frames.entries()) {
    const frameFailureStart = failures.length;
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    raw.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) {
      failures.push(`age ${age}: raw RGB digest`);
    }
    const state = hypnosisAtAge(
      age,
      fixture.attackerSide,
      fixture.attackerCenter,
      fixture.targetCenter,
    );
    const seam = sceneOnHypnosisView({ ...stage, age });
    const {
      age: _age,
      attacker: _attacker,
      target: _target,
      displayedRings: _displayedRings,
      displayedTargetBlendCoefficient: _displayedTargetBlendCoefficient,
      displayedBgPaletteAge: _displayedBgPaletteAge,
      ...seamState
    } = seam;
    if (!same(seamState, state)) failures.push(`age ${age}: typed seam`);
    const actual = oracle.goldRings.map((ring) => ({
      x: ring.x,
      y: ring.y,
      x2: ring.x2,
      y2: ring.y2,
      data0: ring.data[0],
      callback: ring.callback.symbol,
    }));
    const expected = state.rings.map((ring) => ({
      x: ring.x,
      y: ring.y,
      x2: ring.x2,
      y2: ring.y2,
      data0: ring.data0,
      callback: ring.callback,
    }));
    if (!same(actual, expected)) failures.push(`age ${age}: GoldRing reducer`);
    if (state.active !== Boolean(oracle.gAnimScriptActive)) {
      failures.push(`age ${age}: active cleanup`);
    }
    if (state.bgBldy !== oracle.registers.bldy) {
      failures.push(`age ${age}: psychic background BLDY`);
    }
    const blendTask = oracle.tasks.some(
      (task) => task.func.symbol === "AnimTask_BlendColorCycleLoop",
    );
    if (state.targetBlendTaskActive !== blendTask) {
      failures.push(`age ${age}: target blend task`);
    }
    if (state.sound !== null) {
      const expectedPan = fixture.attackerSide === "player" ? -64 : 63;
      if (
        oracle.se1.songHeader !== 143655552
        || oracle.se1.status !== 0
        || oracle.se1.tracks[0]?.flags !== 131
        || oracle.se1.tracks[0]?.panX !== expectedPan
        || state.soundPanSide !== fixture.attackerSide
      ) failures.push(`age ${age}: SE_M_SUPERSONIC audio trigger`);
    }
    sawPsychicTask ||= oracle.tasks.some(
      (task) => task.func.symbol === "SetPsychicBackground_Step",
    );
    sawBlendTask ||= blendTask;
    const fields =
      oracle.softwareOam.length === 128
      && oracle.hardwareOam.length === 128
      && oracle.hardwareMatrices.length === 32
      && oracle.fadedPalette.length === 512
      && oracle.unfadedPalette.length === 512
      && oracle.hardwarePalette.length === 512
      && oracle.paletteTags.length === 16
      && oracle.tileTags.length === 128
      && Object.keys(oracle.registers).length === 6
      && oracle.se1 !== null
      && oracle.se2 !== null;
    if (!fields) failures.push(`age ${age}: hardware field shape`);
    for (const side of ["player", "opponent"] as const) {
      const now = oracle.battlerState[side];
      const initial = firstBattlers[side];
      if (!same(
        {
          species: now.species, hp: now.hp, maxHp: now.maxHp,
          item: now.item, status1: now.status1,
          status2: now.status2, status3: now.status3,
        },
        {
          species: initial.species, hp: initial.hp, maxHp: initial.maxHp,
          item: initial.item, status1: initial.status1,
          status2: initial.status2, status3: initial.status3,
        },
      )) failures.push(`age ${age}: gameplay state changed`);
    }
    if (failures.length === frameFailureStart) componentFrames += 1;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
      ) diff += 1;
    }
    if (diff === 0) framebufferFrames += 1;
    else failures.push(`age ${age}: framebuffer diff ${diff}`);
  }
  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) failures.push("raw RGB window digest");
  if (!sawPsychicTask || !sawBlendTask) failures.push("source task topology");
  const prior = fresh.get(fixture.orientation);
  if (runNumber === 1) fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  else if (!same(prior, { evidence, raw: rawDigest })) {
    failures.push("fresh-run reproducibility");
  }
  console.log(
    `${fixture.orientation} run ${runNumber}: ${componentFrames}/`
    + `${probe.frames.length} component/hardware/raw-RGB; `
    + `${framebufferFrames}/${probe.frames.length} production framebuffer`,
  );
  if (failures.length) {
    throw new Error(`${fixture.orientation}: ${failures.slice(0, 12).join(", ")}`);
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath, run);
}
