// Fresh dense source/hardware/pixel comparator for legal Scene-ON SCARY_FACE.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  scaryFaceAtAge,
  type ScaryFaceSide,
} from "../../src/animation/scaryFace.ts";
import {
  createSceneOnMovePresentation,
  sceneOnScaryFaceView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  scenario: string; probe: string; attackerSide: ScaryFaceSide;
  denseWindow: { startFrame: number; endFrame: number };
  attackerEyeCenter: { x: number; y: number };
  attacker: SceneOnPresentationBattler; target: SceneOnPresentationBattler;
  fieldProfile: {
    playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number;
  };
}
interface Track { flags: number; panX: number }
interface Audio {
  songHeader: number; status: number; tracks: Track[];
}
interface Sprite {
  slot: number; template: number; callback: string; x: number; y: number;
  x2: number; y2: number; attr0: number; attr1: number; attr2: number;
  animFrame: number; subpriority: number; invisible: boolean; data: number[];
}
interface Task { func: string; data: number[] }
interface Frame {
  frame: number; sha256: string; sprites: Sprite[]; tasks: Task[];
  player: Sprite; opponent: Sprite; hardwareOam: number[][];
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[]; bg1x: number; bg1y: number; dispcnt: number;
  bg1cnt: number; bg1hofs: number; bg1vofs: number;
  bldcnt: number; bldalpha: number; bldy: number; se1: Audio; se2: Audio;
}
interface Probe {
  schema: string; templates: { eye: number; blend: number };
  songHeaders: Record<string, number>; frames: Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: scaryFacePortable.ts <player-fixture> <opponent-fixture>");
}
const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
const blendBlack = (color: number, coeff: number): number => {
  const r = color & 31, g = color >> 5 & 31, b = color >> 10 & 31;
  return (r + ((-r * coeff) >> 4))
    | (g + ((-g * coeff) >> 4)) << 5
    | (b + ((-b * coeff) >> 4)) << 10;
};
const paletteMatches = (
  row: Frame, start: number, coeff: number,
): boolean => row.hardwarePalette.slice(start, start + 16).every(
  (color, index) => color === blendBlack(row.unfadedPalette[start + index]!, coeff),
);

function expectedAudio(
  age: number,
  side: ScaryFaceSide,
  headers: Probe["songHeaders"],
): Audio {
  let song: keyof typeof headers;
  let local: number;
  if (age < 59) {
    song = "SE_M_PSYBEAM"; local = age;
  } else if (age < 143) {
    song = "SE_M_LEER"; local = age - 59;
  } else {
    song = "SE_M_STRING_SHOT2"; local = age - 143;
  }
  const silentAge = song === "SE_M_PSYBEAM" ? 35
    : song === "SE_M_LEER" ? 61 : Number.POSITIVE_INFINITY;
  const stoppedAge = song === "SE_M_PSYBEAM" ? 35
    : song === "SE_M_LEER" ? 62 : Number.POSITIVE_INFINITY;
  const silent = local >= silentAge;
  const stopped = local >= stoppedAge;
  const pan = song === "SE_M_STRING_SHOT2"
    ? (side === "player" ? 63 : -63)
    : (side === "player" ? -64 : 63);
  return {
    songHeader: headers[song]!,
    status: stopped ? 0x80000000 : local === 0 ? 0 : 3,
    tracks: [
      { flags: silent ? 0 : local === 0 ? 131 : 128, panX: pan },
      { flags: silent ? 0 : local === 0 ? 131 : 128, panX: pan },
      { flags: 0, panX: 0 },
    ],
  };
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-scary-face-exact-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  if (probe.schema !== "scary-face-dense-evidence/v2") {
    throw new Error(`${fixturePath}: unexpected probe schema ${probe.schema}`);
  }
  const byFrame = new Map(probe.frames.map((row) => [row.frame, row]));
  const stage = createSceneOnMovePresentation({
    move: "SCARY_FACE", attacker: fixture.attacker, target: fixture.target,
    attackerEyeCenter: fixture.attackerEyeCenter,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  let exact = 0;
  for (let frame = fixture.denseWindow.startFrame;
    frame <= fixture.denseWindow.endFrame; frame += 1) {
    const age = frame - fixture.denseWindow.startFrame;
    const row = byFrame.get(frame);
    if (!row) throw new Error(`${fixturePath}: probe omitted ${frame}`);
    const expected = scaryFaceAtAge(
      age, fixture.attackerSide, fixture.target.geometry.side,
      fixture.attackerEyeCenter,
    );
    const seam = sceneOnScaryFaceView({ ...stage, age });
    const seamMatch = same({
      ...seam, age: undefined, attacker: undefined, target: undefined,
    }, expected);
    const controlled = row.sprites.filter((sprite) =>
      sprite.template === probe.templates.eye
      || sprite.template === probe.templates.blend);
    const expectedControlled = Number(expected.paletteBlend !== null)
      + expected.eyes.length;
    const software = controlled.length === expectedControlled
      && row.sprites.filter((sprite) => sprite.template === probe.templates.eye)
        .every((sprite, index) => {
          const eye = expected.eyes[index];
          return eye !== undefined && sprite.x === eye.x && sprite.y === eye.y
            && sprite.animFrame === eye.frame && !sprite.invisible;
        });
    const task = row.tasks.find((item) => item.func.startsWith("AnimTask_ScaryFace"));
    const shake = row.tasks.find((item) => item.func === "AnimTask_ShakeTargetInPattern");
    const target = fixture.target.geometry.side === "player" ? row.player : row.opponent;
    const tasks = expected.background === null ? task === undefined
      : task?.func === expected.background.task.function
        && task.data[10] === expected.background.task.counter
        && task.data[11] === expected.background.task.blendCounter
        && task.data[12] === expected.background.task.phase;
    const overwrite = expected.shakeTask === null
      ? shake === undefined && target.x2 === 0 && target.y2 === 0
      : shake?.data[0] === expected.shakeTask.shakeNum
        && same(shake.data.slice(1, 5), [20, 1, 0, 16])
        && target.x2 === expected.targetOffset.x2 && target.y2 === 0;
    const eyePrior = scaryFaceAtAge(
      age - 1, fixture.attackerSide, fixture.target.geometry.side,
      fixture.attackerEyeCenter,
    ).eyes;
    const eyeTiles = [305, 309, 313, 309, 305] as const;
    const expectedEyeOam = eyePrior.map((eye) => [
      (eye.y - 8) & 0xff,
      ((eye.x - 8) & 0x1ff) | 0x4000,
      eyeTiles[eye.frame] | 2 << 10 | 7 << 12,
    ]);
    const actualEyeOam = row.hardwareOam.filter((item) =>
      eyeTiles.includes((item[2]! & 1023) as never)
      && (item[2]! >> 12 & 15) === 7);
    const hardwareOam = same(actualEyeOam, expectedEyeOam);
    const attacker = fixture.attacker.geometry.side === "player"
      ? row.player : row.opponent;
    const attackerBank = attacker.attr2 >> 12 & 15;
    const palettes = [1, 2, 3].every((bank) =>
      paletteMatches(row, bank * 16, expected.paletteBlackCoeff))
      && paletteMatches(
        row, 256 + attackerBank * 16, expected.attackerPaletteBlackCoeff,
      )
      && row.hardwarePalette.slice(256 + 7 * 16, 256 + 8 * 16)
        .every((color, index) =>
          color === row.unfadedPalette[256 + 7 * 16 + index])
      && row.paletteTags[7] === 10218;
    const bgActive = age >= 59 && age <= 142;
    const blendY = age === 142 ? 0 : scaryFaceAtAge(
      age - 1, fixture.attackerSide, fixture.target.geometry.side,
      fixture.attackerEyeCenter,
    ).background?.task.blendY ?? 0;
    const registers = row.dispcnt === 48960
      && row.bg1cnt === (age < 59 ? 39936 : bgActive ? 7173 : 7169)
      && row.bg1x === 0 && row.bg1y === 0
      && row.bg1hofs === 0 && row.bg1vofs === 0 && row.bldy === 0
      && row.bldcnt === (bgActive ? 16194 : 0)
      && row.bldalpha === (bgActive ? blendY | (16 - blendY) << 8 : 0);
    const audio = same(row.se1, expectedAudio(age, fixture.attackerSide, probe.songHeaders))
      && row.se2.tracks.every((track) => track.flags === 0);
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const rgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
    const digest = createHash("sha256").update(rgb).digest("hex") === row.sha256;
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) diff += 1;
    }
    const framebuffer = diff === 0;
    const matched = seamMatch && software && tasks && overwrite && hardwareOam
      && palettes && registers && audio && digest && framebuffer;
    if (matched) exact += 1;
    else failures.push(
      `frame ${frame}/age ${age}: seam=${seamMatch} sw=${software}`
      + ` tasks=${tasks} overwrite=${overwrite} oam=${hardwareOam}`
      + ` palettes=${palettes} regs=${registers} audio=${audio}`
      + ` digest=${digest} framebuffer=${framebuffer} diff=${diff}`,
    );
  }
  if (failures.length) {
    throw new Error(`${failures.slice(0, 40).join("\n")}\nscratch: ${scratch}`);
  }
  console.log(`${fixture.attackerSide} run ${runNumber}: ${exact}/190 exact`);
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath, runNumber);
}
