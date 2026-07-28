// Fresh complete reducer/seam/hardware/audio/RGB/framebuffer proof for DIZZY_PUNCH.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { dizzyPunchAtAge } from "../../src/animation/dizzyPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDizzyPunchView,
  type SceneOnDizzyPunchConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

type Fixture = SceneOnDizzyPunchConfig & {
  scenario: string;
  probe: string;
  orientation: string;
  denseWindow: { startFrame: number; endFrame: number };
};
type Matrix = { a: number; b: number; c: number; d: number };
type Sprite = {
  slot: number; template: number; x: number; y: number; x2: number; y2: number;
  attr0: number; attr1: number; attr2: number; matrixNum: number;
  subpriority: number; invisible: boolean; matrix: Matrix; data: number[];
};
type Frame = {
  frame: number; sha256: string; sprites: Sprite[];
  tasks: { func: number; data: number[] }[];
  playerSprite: Sprite; opponentSprite: Sprite;
  playerPersonality: number; opponentPersonality: number;
  visualTaskCount: number; soundTaskCount: number; animScriptActive: boolean;
  fadedPalette: number[]; hardwarePalette: number[];
  hardwareOam: number[][]; hardwareMatrices: number[][];
  se1: {
    songHeader: number; status: number;
    tracks: { flags: number; pan: number; panX: number }[];
  };
  dispcnt: number; bldcnt: number; bldalpha: number; bldy: number;
};
type Probe = {
  schema: string;
  templates: Record<string, number>;
  taskFuncs: Record<string, number>;
  songHeaders: Record<string, number>;
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: dizzyPunchPortable.ts <player-fixture> <opponent-fixture>",
  );
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

function runFixture(fixturePath: string, runNumber: number): string {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-dizzy-punch-"));
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
  if (probe.schema !== "dizzy-punch-dense-evidence/v1") {
    throw new Error(`${fixturePath}: unexpected probe schema ${probe.schema}`);
  }

  const frameMap = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const count = fixture.denseWindow.endFrame
    - fixture.denseWindow.startFrame + 1;
  if (count !== 69) throw new Error(`${fixturePath}: expected 69-frame body`);
  const stage = createSceneOnMovePresentation({
    move: "DIZZY_PUNCH",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
    attackerPersonality: fixture.attackerPersonality,
  });
  const failures: string[] = [];
  let componentMatches = 0;
  let framebufferMatches = 0;
  for (let age = 0; age < count; age += 1) {
    const frameNumber = fixture.denseWindow.startFrame + age;
    const row = frameMap.get(frameNumber);
    if (!row) throw new Error(`${fixturePath}: probe omitted ${frameNumber}`);
    const expected = dizzyPunchAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnDizzyPunchView({ ...stage, age });
    const seamMatch = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      expected,
    );

    const lunges = row.sprites.filter((sprite) =>
      sprite.template === probe.templates.gHorizontalLungeSpriteTemplate
    );
    const lungeActive = (age >= 0 && age <= 14)
      || (age >= 20 && age <= 34);
    const lungeMatch = lunges.length === Number(lungeActive)
      && lunges.every((sprite) =>
        sprite.invisible
        && sprite.subpriority
          === (fixture.attacker.geometry.side === "player" ? 28 : 38)
      );
    const fists = row.sprites.filter((sprite) =>
      sprite.template === probe.templates.gFistFootSpriteTemplate
    );
    const fistMatch = same(
      fists.map(({ x, y }) => ({ x, y })),
      expected.fists,
    ) && fists.every((sprite) =>
      !sprite.invisible
      && sprite.subpriority
        === (fixture.attacker.geometry.side === "player" ? 35 : 25)
    );
    const hitsplats = row.sprites.filter((sprite) =>
      sprite.template === probe.templates.gBasicHitSplatSpriteTemplate
    );
    const hitsplatMatch = same(
      hitsplats.map(({ x, y }) => ({ x, y, animation: 1 })),
      expected.hitsplats,
    ) && hitsplats.every((sprite) =>
      sprite.matrix.a === 303 && sprite.matrix.b === 0
      && sprite.matrix.c === 0 && sprite.matrix.d === 303
      && sprite.subpriority
        === (fixture.attacker.geometry.side === "player" ? 36 : 26)
    );
    const ducks = row.sprites.filter((sprite) =>
      sprite.template === probe.templates.gDizzyPunchDuckSpriteTemplate
    );
    const duckMatch = same(
      ducks.map((sprite) => ({
        x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
        priority: sprite.attr2 >>> 10 & 3, invisible: sprite.invisible,
      })),
      expected.ducks.map((duck) => ({
        x: duck.x, y: duck.y, x2: duck.x2, y2: duck.y2,
        priority: duck.priority, invisible: duck.invisible,
      })),
    ) && ducks.every((sprite) =>
      sprite.subpriority
        === (fixture.attacker.geometry.side === "player" ? 37 : 27)
    );

    const attacker = fixture.attacker.geometry.side === "player"
      ? row.playerSprite : row.opponentSprite;
    const target = fixture.target.geometry.side === "player"
      ? row.playerSprite : row.opponentSprite;
    const targetBaseline = fixture.target.geometry.side === "opponent"
      && age < 8 ? 1 : 0;
    const battlers = attacker.x2 === expected.attackerX2
      && attacker.y2 === 0
      && target.x2 === expected.targetX2 + targetBaseline
      && target.y2 === expected.targetY2;
    const personality = (
      fixture.attacker.geometry.side === "player"
        ? row.playerPersonality : row.opponentPersonality
    ) === fixture.attackerPersonality;

    const shakeActive = (age >= 8 && age <= 19)
      || (age >= 28 && age <= 39);
    const tasks = row.tasks.length === Number(shakeActive)
      && row.tasks.every((task) => {
        const local = age < 20 ? age - 8 : age - 28;
        return task.func === probe.taskFuncs.AnimTask_ShakeMon2_Step
          && task.data[0] === target.slot
          && task.data[1] === 6 - Math.floor(local / 2)
          && task.data[2] === 1
          && task.data[3] === Number(local % 2 === 0)
          && task.data[4] === 3;
      });
    const counts = row.visualTaskCount
      === row.sprites.length + row.tasks.length;
    const registers = (row.dispcnt & 0x1f00) !== 0
      && row.bldcnt === 0x3f40 && row.bldalpha === 0x080c
      && row.bldy === 0;
    const soundName = age === 8
      ? "SE_M_COMET_PUNCH"
      : age === 28 ? "SE_M_VITAL_THROW2" : null;
    const sound = soundName === null || (
      row.se1.songHeader === probe.songHeaders[soundName]
      && row.se1.status === 0
      && row.se1.tracks.slice(0, 2).every((track) =>
        track.flags === 131
        && track.panX
          === (fixture.attacker.geometry.side === "player" ? 63 : -63)
      )
    );

    const prior = frameMap.get(frameNumber - 1);
    if (!prior) throw new Error(`${fixturePath}: missing prior transfer row`);
    const priorObjects = [
      prior.playerSprite, prior.opponentSprite, ...prior.sprites,
    ].filter((sprite) => !sprite.invisible);
    const hardwareOam = priorObjects.every((sprite) =>
      row.hardwareOam.some((item) =>
        same(item, [sprite.attr0, sprite.attr1, sprite.attr2])
      )
    );
    const affineObjects = priorObjects.filter((sprite) =>
      sprite.attr0 & 0x300
    );
    const hardwareMatrices = affineObjects.every((sprite) =>
      same(row.hardwareMatrices[sprite.matrixNum], [
        sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
      ])
    );
    const hardwarePalettes = priorObjects.every((sprite) => {
      const bank = sprite.attr2 >>> 12;
      if (bank >= 16) return true;
      const start = 256 + bank * 16;
      return row.hardwarePalette.slice(start, start + 16).every(
        (color, offset) => color === prior.fadedPalette[start + offset],
      );
    });
    const raw = readFileSync(
      join(rgbDir, `${String(frameNumber).padStart(5, "0")}.rgb`),
    );
    const rawDigest = createHash("sha256").update(raw).digest("hex")
      === row.sha256;
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
        if (samples.length < 4) {
          samples.push(
            `${pixel % 240},${Math.floor(pixel / 240)}:`
            + `${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
            + `!=${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}`,
          );
        }
      }
    }
    if (framebufferDiff === 0) framebufferMatches += 1;
    const component = seamMatch && lungeMatch && fistMatch && hitsplatMatch
      && duckMatch && battlers && tasks && counts && registers && sound
      && personality && hardwareOam && hardwareMatrices
      && hardwarePalettes && rawDigest;
    if (component) componentMatches += 1;
    if (!component || framebufferDiff !== 0) {
      failures.push(
        `frame ${frameNumber}/age ${age}: seam=${seamMatch} `
        + `lunge=${lungeMatch} fist=${fistMatch} impact=${hitsplatMatch} `
        + `ducks=${duckMatch} battlers=${battlers} tasks=${tasks} `
        + `personality=${personality} `
        + `counts=${counts} regs=${Boolean(registers)} sound=${sound} `
        + `oam=${hardwareOam} matrices=${hardwareMatrices} `
        + `palettes=${hardwarePalettes} raw=${rawDigest} `
        + `framebufferDiff=${framebufferDiff} ${samples.join(";")}`,
      );
    }
  }

  // The next display is the script-owned clearmonbg/blendoff tail. It is
  // checked separately so the supervisor-requested dense body remains the
  // literal 69/69 frame windows 90..158 and 94..162.
  const tail = frameMap.get(fixture.denseWindow.endFrame + 1);
  const tailClean = tail !== undefined
    && tail.visualTaskCount === 0 && tail.soundTaskCount === 0
    && tail.sprites.length === 0 && tail.tasks.length === 0
    && tail.bldcnt === 0 && tail.bldalpha === 0 && tail.bldy === 0
    && tail.animScriptActive;
  if (!tailClean) failures.push("clear tail did not release monbg/alpha/assets");

  const digest = createHash("sha256").update(bytes).digest("hex");
  console.log(
    `${fixture.orientation} run ${runNumber}: components `
    + `${componentMatches}/${count}; framebuffer ${framebufferMatches}/${count}; `
    + `clearTail=${tailClean}; digest ${digest}`,
  );
  if (failures.length) throw new Error(failures.slice(0, 30).join("\n"));
  return digest;
}

for (const fixture of fixturePaths) {
  const first = runFixture(fixture, 1);
  const second = runFixture(fixture, 2);
  if (first !== second) {
    throw new Error(`${fixture}: fresh evidence did not reproduce`);
  }
}
