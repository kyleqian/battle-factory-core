import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  FAKE_TEARS_SOURCE_FRAME_COUNT,
  fakeTearsAtAge,
} from "../../src/animation/fakeTears.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFakeTearsView,
  type SceneOnFakeTearsConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

type Fixture = SceneOnFakeTearsConfig & {
  schema: string;
  scenario: string;
  probe: string;
  orientation: string;
  sourceVisualWindow: {
    startFrame: number; endFrame: number;
  };
  appStage: { presentationAge: number };
};
type Matrix = { a: number; b: number; c: number; d: number };
type Sprite = {
  slot: number;
  template: { symbol?: string };
  x: number; y: number; x2: number; y2: number;
  matrix: Matrix;
};
type Frame = {
  frame: number; sha256: string; currentMove: number;
  visualTaskCount: number;
  tasks: { func: { symbol?: string }; data: number[] }[];
  sprites: Sprite[];
  paletteTags: number[];
  fadedPalette: number[];
  hardwarePalette: number[];
  hardwareOam: string[];
  hardwareMatrices: Matrix[];
  registers: Record<string, number>;
  se1: { songHeader: number; tracks: { flags: number; panX: number }[] };
  se2: { songHeader: number; tracks: { flags: number; panX: number }[] };
};
type Probe = { schema: string; frames: Frame[] };

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixtures = process.argv.slice(2);
if (fixtures.length !== 2) {
  throw new Error(
    "usage: fakeTearsPortable.ts <player-fixture> <opponent-fixture>",
  );
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const shape = (sprite: Sprite) => ({
  slot: sprite.slot,
  x: sprite.x,
  y: sprite.y,
  x2: sprite.x2,
  y2: sprite.y2,
  matrix: sprite.matrix,
});

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-fake-tears-portable-"));
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
  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  if (probe.schema !== "fake-tears-blend-particle-dense-evidence/v1") {
    throw new Error(`${fixture.orientation}: unexpected probe schema`);
  }
  const rows = probe.frames.filter((frame) =>
    frame.frame >= fixture.sourceVisualWindow.startFrame
    && frame.frame <= fixture.sourceVisualWindow.endFrame);
  if (
    rows.length !== FAKE_TEARS_SOURCE_FRAME_COUNT
    || rows.some((row, index) =>
      row.frame !== fixture.sourceVisualWindow.startFrame + index
      || row.currentMove !== 313)
  ) {
    throw new Error(`${fixture.orientation}: source window is not dense`);
  }
  const stage = createSceneOnMovePresentation({
    move: "FAKE_TEARS",
    attacker: fixture.attacker,
    target: fixture.target,
    attackerPictureBounds: fixture.attackerPictureBounds,
    fieldProfile: fixture.fieldProfile,
  });
  const beforeWindow = probe.frames.find(
    (frame) => frame.frame === fixture.sourceVisualWindow.startFrame - 1,
  );
  if (!beforeWindow) throw new Error(`${fixture.orientation}: missing latch baseline`);
  const failures: string[] = [];
  let exact = 0;
  for (const [index, oracle] of rows.entries()) {
    const age = fixture.appStage.presentationAge + index;
    const expected = fakeTearsAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attackerPictureBounds,
    );
    const seam = sceneOnFakeTearsView({ ...stage, age });
    const seamMatch = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      expected,
    );
    const actualTears = oracle.sprites
      .filter((sprite) => sprite.template.symbol === "gTearDropSpriteTemplate")
      .sort((a, b) => a.slot - b.slot);
    const software = same(
      actualTears.map(shape),
      expected.tears.map((tear) => ({
        slot: tear.slot,
        x: tear.x,
        y: tear.y,
        x2: tear.x2,
        y2: tear.y2,
        matrix: tear.matrix,
      })),
    );
    const rockTask = oracle.tasks.find(
      (task) => task.func.symbol === "AnimTask_RockMonBackAndForth_Step",
    );
    const attackerSlot = rockTask?.data[15]
      ?? (fixture.attacker.geometry.side === "player" ? 6 : 8);
    const attacker = oracle.sprites.find((sprite) => sprite.slot === attackerSlot);
    const rock = attacker !== undefined
      && attacker.x2 === expected.rock.x2
      && attacker.y2 === expected.rock.y2
      && same(attacker.matrix, expected.rock.matrix);
    const tasks = oracle.visualTaskCount
      === Number(expected.rock.active) + expected.tears.length;
    const tags = [
      age >= 1 && age < 83 ? 10155 : 0xffff,
      age >= 4 && age < 83 ? 10209 : 0xffff,
      age >= 7 && age < 83 ? 10072 : 0xffff,
    ];
    const assets = same(oracle.paletteTags.slice(7, 10), tags);
    const prior = probe.frames.find((frame) => frame.frame === oracle.frame - 1);
    const palette = [7, 8, 9].every((bank) => {
      const start = 256 + bank * 16;
      return prior?.fadedPalette.slice(start, start + 16).every(
        (color, offset) => oracle.hardwarePalette[start + offset] === color,
      ) ?? false;
    });
    const soundTrack = oracle.se2.tracks[0];
    const expectedPan = fixture.attacker.geometry.side === "player" ? -64 : 63;
    const audio = same(oracle.se1, beforeWindow.se1)
      && (!expected.soundActive
        ? soundTrack?.flags === 0
        : oracle.se2.songHeader !== beforeWindow.se2.songHeader
          && soundTrack?.panX === expectedPan
          && soundTrack.flags === (expected.soundRestart ? 131 : 128));
    const registers = oracle.registers.bldcnt === 0
      && oracle.registers.bldalpha === 0
      && oracle.registers.bldy === 0;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    const digest = createHash("sha256").update(rgb).digest("hex") === oracle.sha256;
    let diff = 0;
    const regions = { attacker: 0, target: 0, opponentBox: 0, playerBox: 0, text: 0, other: 0 };
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
      ) {
        diff += 1;
        const x = pixel % 240;
        const y = Math.floor(pixel / 240);
        if (x >= 24 && x < 120 && y >= 32 && y < 136) regions.attacker += 1;
        else if (x >= 128 && x < 224 && y < 96) regions.target += 1;
        else if (y < 48 && x < 136) regions.opponentBox += 1;
        else if (y >= 72 && y < 128 && x >= 104) regions.playerBox += 1;
        else if (y >= 128) regions.text += 1;
        else regions.other += 1;
      }
    }
    const framebuffer = diff === 0;
    if (index === 0 && !framebuffer) {
      writeFileSync(join(scratch, "app.rgba"), app);
      writeFileSync(join(scratch, "oracle.rgb"), rgb);
    }
    if (
      seamMatch && software && rock && tasks && assets && palette && audio
      && registers && digest && framebuffer
    ) exact += 1;
    else failures.push(
      `frame ${oracle.frame}/age ${age}: seam=${seamMatch} sw=${software}`
      + ` rock=${rock} tasks=${tasks} assets=${assets} palette=${palette}`
      + ` audio=${audio} regs=${registers} digest=${digest} framebuffer=${framebuffer}`
      + ` diff=${diff} regions=${JSON.stringify(regions)}`,
    );
  }
  if (failures.length) {
    throw new Error(
      `${failures.slice(0, 40).join("\n")}\ndiagnostic=${scratch}`,
    );
  }
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${exact}/${FAKE_TEARS_SOURCE_FRAME_COUNT} source/seam/framebuffer exact`,
  );
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixture of fixtures) verify(fixture, runNumber);
}
