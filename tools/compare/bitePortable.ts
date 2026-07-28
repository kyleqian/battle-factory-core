import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { biteEffectAtAge } from "../../src/animation/bite.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly probeMoveId: number;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly targetSide: "player" | "opponent";
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

interface ProbeSprite {
  readonly template: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

interface ProbeFrame {
  readonly frame: number;
  readonly sprites: readonly ProbeSprite[];
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly bldalpha: number;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-bite-portable-"));
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output, rgbDir, String(fixture.probeMoveId),
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly templates: Readonly<Record<
    "gSharpTeethSpriteTemplate" | "gBasicHitSplatSpriteTemplate", number
  >>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<"SE_M_BITE", number>>;
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const mismatches: string[] = [];
let matches = 0;
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age = frame - fixture.denseWindow.startFrame;
  const actual = frames.get(frame);
  if (!actual) throw new Error(`probe omitted frame ${frame}`);
  const expected = biteEffectAtAge(age, fixture.targetSide, fixture.targetCenter);
  const expectedSprites = expected.sprites.map((sprite) => ({
    template: sprite.kind === "sharpTeeth"
      ? probe.templates.gSharpTeethSpriteTemplate
      : probe.templates.gBasicHitSplatSpriteTemplate,
    slot: sprite.oamSlot,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    matrix: sprite.matrix,
  }));
  const actualSprites = actual.sprites.map((sprite) => ({
    template: sprite.template,
    slot: sprite.slot,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    matrix: sprite.matrix,
  }));
  const sprites = JSON.stringify(actualSprites) === JSON.stringify(expectedSprites);
  const shake = actual.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_ShakeMon
    || task.func === probe.taskFuncs.AnimTask_ShakeMon_Step
  );
  const shakeShape = age < 12 || age > 23
    ? shake.length === 0
    : shake.length === 1
      && shake[0]!.data[4] === 0 && shake[0]!.data[5] === 4
      && shake[0]!.data[6] === 0;
  const alpha = actual.bldalpha === (expected.alpha
    ? expected.alpha.eva | expected.alpha.evb << 8
    : 0);
  const sound = age !== 0 || (
    actual.se1.songHeader === probe.songHeaders.SE_M_BITE
    && actual.se1.status === 0
    && actual.se1.tracks[0]?.flags === 131
    && actual.se1.tracks[0]?.panX === expected.soundPan
  );
  if (sprites && shakeShape && alpha && sound) matches += 1;
  else {
    mismatches.push(
      `frame ${frame}/age ${age}: sprites=${sprites} shake=${shakeShape} `
      + `alpha=${alpha} sound=${sound}`,
    );
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`BITE source components ${matches}/${total}; framebuffer unclaimed`);
if (matches !== total) {
  console.error(mismatches.slice(0, 16).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
