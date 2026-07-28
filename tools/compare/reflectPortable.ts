import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnReflectView,
  type SceneOnReflectConfig,
} from "../../src/animation/sceneOnPresentation.ts";

interface Fixture extends SceneOnReflectConfig {
  scenario: string;
  probe: string;
  denseWindow: { startFrame: number; endFrame: number; wallFrame: number };
}
interface Sprite {
  slot: number; template: number; x: number; y: number; invisible: boolean;
  attr: number[]; data: number[];
}
interface Frame {
  frame: number; effectSprites: Sprite[]; battlers: Sprite[];
  visualTaskCount: number; soundTaskCount: number;
  registers: { bldcnt: number; bldalpha: number };
  fadedPalette: number[]; unfadedPalette: number[];
}
interface Probe {
  schema: string; templates: { wall: number; sparkle: number }; frames: Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: reflectPortable.ts <player-fixture> <opponent-fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function rotatedPalette(base: readonly number[], count: number): number[] {
  const colors = base.slice();
  for (let step = 0; step < count; step++) {
    colors.unshift(colors.pop()!);
  }
  return colors;
}

function verify(fixturePath: string): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-reflect-portable-"));
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
  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  if (probe.schema !== "reflect-dense-evidence/v1") {
    throw new Error(`unexpected probe schema ${probe.schema}`);
  }
  const rows = new Map(probe.frames.map((row) => [row.frame, row]));
  const stage = createSceneOnMovePresentation({
    move: "REFLECT", attacker: fixture.attacker, target: fixture.target,
    allocatorProfile: fixture.allocatorProfile,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  let matches = 0;
  for (let frame = fixture.denseWindow.startFrame;
    frame <= fixture.denseWindow.endFrame; frame++) {
    const row = rows.get(frame);
    if (!row) throw new Error(`probe omitted frame ${frame}`);
    const age = frame - fixture.denseWindow.wallFrame;
    const view = sceneOnReflectView({ ...stage, age });
    const wall = row.effectSprites.find((sprite) =>
      sprite.template === probe.templates.wall);
    const sparkles = row.effectSprites.filter((sprite) =>
      sprite.template === probe.templates.sparkle);
    const expectedSparkles = view.sparkles.map((sprite) => ({
      slot: fixture.allocatorProfile.sparkles[sprite.spawnIndex],
      x: sprite.x, y: sprite.y, tileOffset: sprite.tileOffset,
    })).sort((a, b) => a.slot - b.slot);
    const actualSparkles = sparkles.map((sprite) => ({
      slot: sprite.slot, x: sprite.x, y: sprite.y,
      tileOffset: (sprite.attr[2]! & 1023) - 537,
    })).sort((a, b) => a.slot - b.slot);
    const wallMatch = view.wall === null ? wall === undefined
      : wall !== undefined
        && wall.slot === fixture.allocatorProfile.wall
        && wall.x === view.wall.x && wall.y === view.wall.y
        && wall.data[2] === view.wall.paletteRotationSteps;
    const alpha = view.alpha === null
      ? row.registers.bldcnt === 0 && row.registers.bldalpha === 0
      : row.registers.bldcnt === 16192
        && row.registers.bldalpha === view.alpha.eva
          + (view.alpha.evb << 8);
    const palette = view.wall === null || rotatedPalette(
      row.unfadedPalette.slice(385, 393),
      view.wall.paletteRotationSteps,
    ).every((color, index) => color === row.fadedPalette[385 + index]);
    const opponent = fixture.attacker.geometry.side === "opponent"
      ? row.battlers[1]! : row.battlers[1]!;
    const hidden = opponent.invisible === view.opponentBattlerHidden;
    const counts = row.visualTaskCount === row.effectSprites.length
      && row.soundTaskCount === Number(view.soundTaskActive);
    if (wallMatch && same(expectedSparkles, actualSparkles)
      && alpha && palette && hidden && counts) {
      matches++;
    } else {
      failures.push(`frame ${frame}/age ${age}: wall=${wallMatch} `
        + `sparkles=${same(expectedSparkles, actualSparkles)} alpha=${alpha} `
        + `palette=${palette} hidden=${hidden} counts=${counts}`);
    }
  }
  const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
  console.log(`${fixture.orientation}: ${matches}/${total} software/typed frames`);
  if (failures.length) throw new Error(failures.slice(0, 12).join("\n"));
}

for (const fixturePath of fixturePaths) verify(fixturePath);
