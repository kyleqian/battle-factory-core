import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  SANDSTORM_FRAME_COUNT,
  sandstormAtAge,
} from "../../src/animation/sandstorm.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSandstormView,
  type SceneOnSandstormConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Fixture = SceneOnSandstormConfig & {
  schema: string;
  orientation: string;
  scenario: string;
  probe: string;
  appStage: { presentationAge: number };
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSha256: string;
  rawRgbSha256: string;
  lifecycleCounts: Record<string, number>;
  topology: Record<string, string[]>;
};
type Sprite = {
  slot: number;
  template: { symbol: string | null };
  x: number;
  y: number;
  x2: number;
  y2: number;
  data: number[];
};
type Frame = {
  frame: number;
  sha256: string;
  scriptOffset: number | null;
  gAnimScriptActive: number;
  visualTaskCount: number;
  sprites: Sprite[];
  softwareOam: string[];
  hardwareOam: string[];
  hardwareMatrices: number[][];
  fadedPalette: number[];
  unfadedPalette: number[];
  hardwarePalette: number[];
  paletteTags: number[];
  tileTags: number[];
  registers: Record<string, number>;
  tasks: unknown[];
  se1: unknown;
  se2: unknown;
};
type Probe = {
  schema: string;
  sourceWindow: Fixture["sourceWindow"];
  lifecycleCounts: Record<string, number>;
  topology: Record<string, string[]>;
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) {
  throw new Error("usage: sandstormPortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-sandstorm-portable-");
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
  const raw = createHash("sha256");
  const fields = probe.frames.every((frame) =>
    (frame.scriptOffset === null || typeof frame.scriptOffset === "number")
    && frame.softwareOam.length === 128
    && frame.hardwareOam.length === 128
    && frame.hardwareMatrices.length === 32
    && frame.fadedPalette.length === 512
    && frame.unfadedPalette.length === 512
    && frame.hardwarePalette.length === 512
    && frame.paletteTags.length === 16
    && frame.tileTags.length === 128
    && Object.keys(frame.registers).length === 10
    && Array.isArray(frame.tasks)
    && frame.se1 !== null
    && frame.se2 !== null
  );
  if (
    fixture.schema !== "sandstorm-portable-evidence/v1"
    || probe.schema !== "sandstorm-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.lifecycleCounts, fixture.lifecycleCounts)
    || !same(probe.topology, fixture.topology)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== SANDSTORM_FRAME_COUNT
    || !fields
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const stage = createSceneOnMovePresentation<SceneOnSandstormConfig>({
    move: "SANDSTORM",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  for (const [index, oracle] of probe.frames.entries()) {
    const rgb = readFileSync(join(
      rgbDir,
      `${String(oracle.frame).padStart(5, "0")}.rgb`,
    ));
    raw.update(rgb);
    const age = fixture.appStage.presentationAge + index;
    const component = sandstormAtAge(age);
    const seam = sceneOnSandstormView({ ...stage, age });
    const seamMatch = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      component,
    );
    const actualCrescents = oracle.sprites
      .filter((sprite) =>
        sprite.template.symbol === "gFlyingSandCrescentSpriteTemplate"
      )
      .sort((left, right) => left.slot - right.slot)
      .map((sprite) => ({
        slot: sprite.slot,
        x: sprite.x,
        y: sprite.y,
        x2: sprite.x2,
        y2: sprite.y2,
        data: sprite.data,
      }));
    const expectedCrescents = component.crescents
      .slice()
      .sort((left, right) => left.oamSlot - right.oamSlot)
      .map((sprite) => ({
      slot: sprite.oamSlot,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      data: [
        1,
        sprite.velocityX,
        sprite.velocityY,
        sprite.fractionalX,
        sprite.fractionalY,
        0,
        0,
        0,
      ],
      }));
    const expectedAlpha = component.backgroundLoaded
      ? component.blend.eva | component.blend.evb << 8
      : 0;
    const componentMatch =
      same(actualCrescents, expectedCrescents)
      && oracle.visualTaskCount === component.visualTaskCount
      && oracle.registers.bg1hofs === component.bgScroll.x
      && oracle.registers.bg1vofs === component.bgScroll.y
      && oracle.registers.bldalpha === expectedAlpha
      && oracle.paletteTags.includes(10261) === component.flyingDirtLoaded
      && oracle.tileTags.includes(10261) === component.flyingDirtLoaded;
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
    const cleanup = index !== SANDSTORM_FRAME_COUNT - 1
      || (!component.active
        && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    if (
      createHash("sha256").update(rgb).digest("hex") !== oracle.sha256
      || !seamMatch
      || !componentMatch
      || diff !== 0
      || !cleanup
    ) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${seamMatch} `
        + `component=${componentMatch} diff=${diff} cleanup=${cleanup}`,
      );
    }
  }
  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    failures.push(`raw digest ${rawDigest}`);
  }
  if (failures.length) throw new Error(failures.slice(0, 180).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length}/${SANDSTORM_FRAME_COUNT} `
    + "component/seam/framebuffer exact",
  );
}

for (const path of paths) {
  verify(path, 1);
  verify(path, 2);
}
