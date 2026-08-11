import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
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
import { createScratchDir } from "../lib/scratch.ts";

interface Window {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount: number;
}
interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly currentMoveWindow: Window;
  readonly activeSourceScriptWindow: Window;
  readonly sourceOwnedComponentWindow: Window;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
}
interface BattlerProfile {
  readonly hp: number;
  readonly maxHp: number;
  readonly status: { readonly kind: string };
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
  readonly battlers: {
    readonly player: BattlerProfile;
    readonly opponent: BattlerProfile;
  };
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly bg1Vram: {
    readonly charBlockSha256: string;
    readonly screenBlockSha256: string;
  };
}
interface Probe {
  readonly schema: string;
  readonly captureWindow: Window;
  readonly activeSourceScriptWindow: Window;
  readonly sourceOwnedComponentWindow: Window;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: muddyWaterPortable.ts <player-fixture> <opponent-fixture>",
  );
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function configFor(
  playerToOpponent: boolean,
  fieldProfile: SceneOnSurfConfig["fieldProfile"],
): SceneOnSurfConfig {
  return {
    move: "MUDDY_WATER",
    attacker: {
      species: "MARSHTOMP",
      geometry: playerToOpponent
        ? {
            // Source MARSHTOMP back pic yOffset 4 (mon-pic-coords.json):
            // OAM box centered at (72, 84), spriteCorner = center - 32.
            side: "player",
            spriteCorner: { x: 40, y: 52 },
            animationCenter: { x: 72, y: 84 },
            battlePositionCenter: { x: 72, y: 80 },
          }
        : {
            // Front pic yOffset 6: OAM box centered at (176, 46).
            side: "opponent",
            spriteCorner: { x: 144, y: 14 },
            animationCenter: { x: 176, y: 46 },
            battlePositionCenter: { x: 176, y: 40 },
          },
    },
    target: {
      species: "ONIX",
      geometry: playerToOpponent
        ? {
            // ONIX front pic yOffset 2; front idle-bob x2=+1 applied by the
            // compositor via speciesFrontIdleRestOffset.
            side: "opponent",
            spriteCorner: { x: 144, y: 10 },
            animationCenter: { x: 176, y: 42 },
            battlePositionCenter: { x: 176, y: 40 },
          }
        : {
            // ONIX back pic yOffset 0.
            side: "player",
            spriteCorner: { x: 40, y: 48 },
            animationCenter: { x: 72, y: 80 },
            battlePositionCenter: { x: 72, y: 80 },
          },
    },
    fieldProfile,
  };
}

function runFixture(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-muddy-water-proof-");
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
  if (probe.schema !== "muddy-water-dense-evidence/v1"
    || !same(probe.sourceOwnedComponentWindow, fixture.sourceOwnedComponentWindow)
    || !same(probe.activeSourceScriptWindow, fixture.activeSourceScriptWindow)
    || !same(probe.captureWindow, fixture.currentMoveWindow)
    || probe.sourceOwnedComponentWindow.frameCount !== SURF_WAVE_FRAME_COUNT) {
    throw new Error(`${fixture.orientation}: source window changed`);
  }
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rgbStream = createHash("sha256");
  for (const frame of probe.frames) {
    rgbStream.update(readFileSync(
      join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
    ));
  }
  const rawRgb = rgbStream.digest("hex");
  if (evidence !== fixture.evidenceSha256) {
    throw new Error(
      `${fixture.orientation}: evidence ${evidence} != pin ${fixture.evidenceSha256}`,
    );
  }
  if (rawRgb !== fixture.rawRgbSha256) {
    throw new Error(
      `${fixture.orientation}: raw RGB ${rawRgb} != pin ${fixture.rawRgbSha256}`,
    );
  }

  const first = probe.frames[0]!;
  const fieldProfile = {
    playerHp: first.battlers.player.hp,
    playerMaxHp: first.battlers.player.maxHp,
    opponentHp: first.battlers.opponent.hp,
    opponentMaxHp: first.battlers.opponent.maxHp,
    playerGender: "male",
    opponentGender: "male",
  };
  const config = configFor(
    fixture.orientation.startsWith("player-back"),
    fieldProfile,
  );
  const stage = createSceneOnMovePresentation(config);
  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const start = fixture.sourceOwnedComponentWindow.startFrame;
  const failures: string[] = [];
  let framebufferMatches = 0;
  for (let age = 0; age < SURF_WAVE_FRAME_COUNT; age += 1) {
    const frameNumber = start + age;
    const row = frames.get(frameNumber);
    if (!row) throw new Error(`${fixture.orientation}: missing frame ${frameNumber}`);
    const expected = surfWaveAtAge(
      age,
      config.attacker.geometry.side,
      { palette: "muddy-water" },
    );
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
    // The muddy `panse SE_M_WHIRLPOOL` plays from age 1 through the window;
    // its Task_PanFromInitialToTarget keeps the track's flags at 131 while
    // the sweep runs. The attacker-side start (player -64 / opponent +63)
    // reaches its terminal one step apart, so the flags drop to 128 at age
    // 68 (player) / 67 (opponent) and the track finishes at age 122.
    const panTerminalAge =
      config.attacker.geometry.side === "player" ? 67 : 66;
    const expectedTrackFlags = age === 0 ? 0
      : age === 1 || (age >= 4 && age <= panTerminalAge) ? 131
      : age >= 122 ? 0
      : 128;
    const audio = age === 0 || (
      row.se1.songHeader === probe.songHeaders.SE_M_WHIRLPOOL
      && row.se1.tracks[0]?.flags === expectedTrackFlags
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
  const source = probe.frames.filter(
    (row) => row.frame >= start && row.frame <= fixture.sourceOwnedComponentWindow.endFrame,
  );
  if (!source.some((row) => row.bg1Vram.charBlockSha256 !== source[0]!.bg1Vram.charBlockSha256)) {
    throw new Error(`${fixture.orientation}: BG1 char block load not observed`);
  }
  if (!source.some((row) => row.bg1Vram.screenBlockSha256 !== source.at(-1)!.bg1Vram.screenBlockSha256)) {
    throw new Error(`${fixture.orientation}: BG1 screen block cleanup not observed`);
  }
  if (framebufferMatches !== SURF_WAVE_FRAME_COUNT) {
    console.error(failures.slice(0, 60).join("\n"));
    throw new Error(
      `${fixture.orientation}: framebuffer ${framebufferMatches}/${SURF_WAVE_FRAME_COUNT}`,
    );
  }
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${SURF_WAVE_FRAME_COUNT - failures.length}/${SURF_WAVE_FRAME_COUNT}; `
    + `framebuffer ${framebufferMatches}/${SURF_WAVE_FRAME_COUNT}; `
    + `evidence ${evidence}; rgb ${rawRgb}`,
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
