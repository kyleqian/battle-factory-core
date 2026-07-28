import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  SURF_WAVE_FRAME_COUNT,
  surfWaveAtAge,
} from "../../src/animation/surfWave.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSurfView,
  type SceneOnSurfConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Window {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount: number;
}
interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly sourceOwnedComponentWindow: Window;
}
interface Task {
  readonly func: { readonly symbol?: string };
  readonly data: readonly number[];
}
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly battleAnimScriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly tasks: readonly Task[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
}
interface Probe {
  readonly schema: string;
  readonly sourceOwnedComponentWindow: Window;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: surfWavePortable.ts <player-fixture> <opponent-fixture>");
}
const digests = new Map<string, string>();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function configFor(playerToOpponent: boolean): SceneOnSurfConfig {
  return {
    move: "SURF",
    attacker: {
      species: "WARTORTLE",
      geometry: playerToOpponent
        ? {
            side: "player",
            spriteCorner: { x: 40, y: 58 },
            animationCenter: { x: 72, y: 90 },
            battlePositionCenter: { x: 72, y: 80 },
          }
        : {
            side: "opponent",
            // Source front-pic center (176,48), not the generic Y=50.
            spriteCorner: { x: 144, y: 16 },
            animationCenter: { x: 176, y: 48 },
            battlePositionCenter: { x: 176, y: 40 },
          },
    },
    target: {
      species: "SHUCKLE",
      geometry: playerToOpponent
        ? {
            side: "opponent",
            spriteCorner: { x: 144, y: 17 },
            animationCenter: { x: 176, y: 49 },
            battlePositionCenter: { x: 176, y: 40 },
          }
        : {
            side: "player",
            spriteCorner: { x: 40, y: 59 },
            animationCenter: { x: 72, y: 91 },
            battlePositionCenter: { x: 72, y: 80 },
          },
    },
    fieldProfile: playerToOpponent
      ? {
          playerHp: 134, playerMaxHp: 134,
          opponentHp: 127, opponentMaxHp: 127,
          playerGender: "male", opponentGender: "male",
        }
      : {
          playerHp: 127, playerMaxHp: 127,
          opponentHp: 134, opponentMaxHp: 134,
          playerGender: "male", opponentGender: "male",
        },
  };
}

function runFixture(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-surf-wave-proof-"));
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
  if (probe.schema !== "surf-wave-dense-evidence/v1"
    || !same(probe.sourceOwnedComponentWindow, fixture.sourceOwnedComponentWindow)
    || probe.sourceOwnedComponentWindow.frameCount !== SURF_WAVE_FRAME_COUNT) {
    throw new Error(`${fixture.orientation}: source window changed`);
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  const previous = digests.get(fixture.orientation);
  if (previous !== undefined && previous !== digest) {
    throw new Error(`${fixture.orientation}: fresh output changed`);
  }
  digests.set(fixture.orientation, digest);

  const config = configFor(fixture.orientation.startsWith("player-back"));
  const stage = createSceneOnMovePresentation(config);
  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const start = fixture.sourceOwnedComponentWindow.startFrame;
  const failures: string[] = [];
  let framebufferMatches = 0;
  for (let age = 0; age < SURF_WAVE_FRAME_COUNT; age += 1) {
    const frameNumber = start + age;
    const row = frames.get(frameNumber);
    if (!row) throw new Error(`${fixture.orientation}: missing frame ${frameNumber}`);
    const expected = surfWaveAtAge(age, config.attacker.geometry.side);
    const seam = sceneOnSurfView({ ...stage, age });
    const seamMatch = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      expected,
    );
    const controller = row.tasks.find((task) =>
      task.func.symbol?.startsWith("AnimTask_CreateSurfWave")
    );
    const scanline = row.tasks.find((task) =>
      task.func.symbol === "AnimTask_SurfWaveScanlineEffect"
    );
    const tasks = row.visualTaskCount === expected.visualTaskCount
      && (age < 4 || age > 141 || (controller !== undefined && scanline !== undefined));
    const expectedBldalpha = age >= 1 && age <= 142
      ? config.attacker.geometry.side === "player"
        ? 0x1000
        : age >= 5 && age <= 141 ? 0x0F01 : 0x1000
      : 0;
    const registers = row.registers.bg1hofs === expected.bgScroll.x
      && row.registers.bg1vofs === expected.bgScroll.y
      && row.registers.bldcnt === (age >= 1 && age <= 142 ? 0x3F42 : 0)
      && row.registers.bldalpha === expectedBldalpha;
    const audio = expected.soundRestart === null || (
      row.se1.songHeader === probe.songHeaders.SE_M_SURF
      && row.se1.tracks[0]?.flags === 131
      && row.se1.tracks[0]?.panX === expected.soundPan
    );
    const raw = readFileSync(
      join(rgbDir, `${String(frameNumber).padStart(5, "0")}.rgb`),
    );
    const rawDigest =
      createHash("sha256").update(raw).digest("hex") === row.sha256;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let framebufferDiff = 0;
    const samples: string[] = [];
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
        framebufferDiff += 1;
        if (samples.length < 3) {
          samples.push(
            `${pixel % 240},${Math.floor(pixel / 240)}:`
            + `${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
            + `!=${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}`,
          );
        }
      }
    }
    if (framebufferDiff === 0) framebufferMatches += 1;
    if (!(seamMatch && tasks && registers && audio && rawDigest
      && framebufferDiff === 0)) {
      failures.push(
        `frame ${frameNumber}/age ${age}: seam=${seamMatch} tasks=${tasks}`
        + ` registers=${registers} audio=${audio} raw=${rawDigest}`
        + ` framebufferDiff=${framebufferDiff} ${samples.join(";")}`,
      );
    }
  }
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${SURF_WAVE_FRAME_COUNT - failures.length}/${SURF_WAVE_FRAME_COUNT}; `
    + `framebuffer ${framebufferMatches}/${SURF_WAVE_FRAME_COUNT}; digest ${digest}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 50).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const fixturePath of fixturePaths) runFixture(fixturePath, run);
}
