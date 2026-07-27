import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  EXPLOSION_BODY_LAST_AGE,
  explosionAtAge,
  type ExplosionBackgroundBlend,
} from "../../src/animation/explosion.ts";

interface Fixture {
  scenario: string;
  probe: string;
  denseWindow: { startFrame: number; endFrame: number };
  attackerSide: "player" | "opponent";
  attackerCenter: { x: number; y: number };
}

interface Frame {
  frame: number;
  playerSprite: { x2: number };
  opponentSprite: { x2: number };
  sprites: readonly {
    slot: number;
    x: number;
    y: number;
    attr2: number;
    matrix: { a: number; b: number; c: number; d: number };
    hardwareMatrix: { a: number; b: number; c: number; d: number };
  }[];
  tasks: readonly { func: number }[];
  fadedPalette: readonly number[];
  unfadedPalette: readonly number[];
  hardwarePalette: readonly number[];
  hardwareOam: readonly (readonly number[])[];
  se1: { songHeader: number; tracks: readonly { flags: number; panX: number }[] };
  bldcnt: number;
  bldalpha: number;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ?? "tools/compare/fixtures/explosion-player-glalie-opponent-shuckle.json";
const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-explosion-portable-"));
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

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  templates: { gExplosionSpriteTemplate: number };
  taskFuncs: Record<string, number>;
  songHeaders: { SE_M_EXPLOSION: number };
  frames: readonly Frame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));

function blend(color: number, target: number, coefficient: number): number {
  const r = color & 31;
  const g = (color >> 5) & 31;
  const b = (color >> 10) & 31;
  const tr = target & 31;
  const tg = (target >> 5) & 31;
  const tb = (target >> 10) & 31;
  return Math.floor((r * (16 - coefficient) + tr * coefficient) / 16)
    | (Math.floor((g * (16 - coefficient) + tg * coefficient) / 16) << 5)
    | (Math.floor((b * (16 - coefficient) + tb * coefficient) / 16) << 10);
}

function targetFor(state: ExplosionBackgroundBlend): number {
  if (state.kind === "red") return 26 | (8 << 5) | (8 << 10);
  if (state.kind === "white") return 0x7fff;
  return 0;
}

const failures: string[] = [];
let matches = 0;
for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expected = explosionAtAge(age, fixture.attackerSide, fixture.attackerCenter);
  const oracleSprites = oracle.sprites.map((sprite) =>
    `${sprite.x},${sprite.y},${sprite.attr2 & 1023}`,
  ).sort();
  const expectedSprites = expected.explosions.map((sprite) =>
    `${sprite.x},${sprite.y},${305 + sprite.frame * 16}`,
  ).sort();
  const sprites = JSON.stringify(oracleSprites) === JSON.stringify(expectedSprites);
  const matrices = oracle.sprites.every((sprite) =>
    JSON.stringify(sprite.matrix) === JSON.stringify({ a: 256, b: 0, c: 0, d: 256 })
    && JSON.stringify(sprite.hardwareMatrix)
      === JSON.stringify({ a: 256, b: 0, c: 0, d: 256 }));
  const shake = oracle.playerSprite.x2 === expected.battlerX2
    && oracle.opponentSprite.x2 === expected.battlerX2;
  const bg = Array.from({ length: 48 }, (_, index) => index + 16).every((index) =>
    oracle.fadedPalette[index] === blend(
      oracle.unfadedPalette[index]!,
      targetFor(expected.backgroundBlend),
      expected.backgroundBlend.coefficient,
    ));
  const priorFrame = frames.get(frame - 1);
  const hardwarePalette = priorFrame !== undefined
    && Array.from({ length: 48 }, (_, index) => index + 16)
      .every((index) => oracle.hardwarePalette[index] === priorFrame.fadedPalette[index]);
  const spawn = age <= 72 && age % 8 === 0;
  const audio = !spawn || (
    oracle.se1.songHeader === probe.songHeaders.SE_M_EXPLOSION
    && oracle.se1.tracks[0]?.flags === 131
    && oracle.se1.tracks[0]?.panX
      === (fixture.attackerSide === "player" ? -64 : 63)
  );
  const shakeTaskFuncs = new Set([
    probe.taskFuncs.AnimTask_ShakeMon2,
    probe.taskFuncs.AnimTask_ShakeMon2_Step,
  ]);
  const shakeTasks = oracle.tasks.filter((task) => shakeTaskFuncs.has(task.func));
  // Four singles selectors collapse to the two visible battler tasks; the
  // forced-attacker duplicate writes the same sprite and is not retained.
  const tasks = age <= 77 ? shakeTasks.length === 2 : shakeTasks.length === 0;
  const registers = oracle.bldcnt === 0 && oracle.bldalpha === 0;
  const activeHardwareExplosionCount = oracle.hardwareOam.filter((oam) =>
    ((oam[2] ?? 0) & 1023) >= 305 && ((oam[2] ?? 0) & 1023) <= 353
    && ((oam[0] ?? 0) & 0x0300) !== 0x0200
  ).length;
  const previous = explosionAtAge(age - 1, fixture.attackerSide, fixture.attackerCenter);
  const hardwareOam = age === 0
    ? activeHardwareExplosionCount === 0
    : activeHardwareExplosionCount === previous.explosions.length;
  if (sprites && matrices && shake && bg && hardwarePalette && audio
    && tasks && registers && hardwareOam) matches += 1;
  else failures.push(
    `frame ${frame}/age ${age}: sprites=${sprites} matrices=${matrices} shake=${shake} bg=${bg} hardwarePalette=${hardwarePalette} audio=${audio} tasks=${tasks} registers=${registers} hardwareOam=${hardwareOam}(${activeHardwareExplosionCount}/${previous.explosions.length})`,
  );
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`EXPLOSION source components ${matches}/${total}`);
if (total !== EXPLOSION_BODY_LAST_AGE + 1 || matches !== total) {
  console.error(failures.slice(0, 40).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
