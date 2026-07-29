import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  NEEDLE_ARM_FRAME_COUNT,
  needleArmAtAge,
} from "../../src/animation/needleArm.ts";
import {
  createSceneOnMovePresentation,
  sceneOnNeedleArmView,
  type SceneOnNeedleArmConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

type Fixture = SceneOnNeedleArmConfig & {
  schema: string; orientation: string; scenario: string; probe: string;
  appStage: { presentationAge: number };
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSha256: string; rawRgbSha256: string;
  lifecycleCounts: Record<string, number>;
};
type Sprite = {
  slot: number; template: { symbol: string | null };
  callback: { symbol: string | null };
  x: number; y: number; x2: number; y2: number;
  matrix: number[]; data: number[];
};
type Frame = {
  frame: number; sha256: string; scriptOffset: number | null;
  gAnimScriptActive: number; visualTaskCount: number;
  sprites: Sprite[]; playerSprite: Sprite; opponentSprite: Sprite;
  softwareOam: string[]; hardwareOam: string[]; hardwareMatrices: number[][];
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[]; tileTags: number[];
  registers: Record<string, number>; tasks: unknown[]; se1: unknown; se2: unknown;
};
type Probe = {
  schema: string; sourceWindow: Fixture["sourceWindow"];
  lifecycleCounts: Record<string, number>; frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) {
  throw new Error("usage: needleArmPortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-needle-arm-portable-"));
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
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const raw = createHash("sha256");
  const fields = probe.frames.every((frame) =>
    (frame.scriptOffset === null || typeof frame.scriptOffset === "number")
    && frame.softwareOam.length === 128 && frame.hardwareOam.length === 128
    && frame.hardwareMatrices.length === 32
    && frame.fadedPalette.length === 512 && frame.unfadedPalette.length === 512
    && frame.hardwarePalette.length === 512
    && frame.paletteTags.length === 16 && frame.tileTags.length === 128
    && Object.keys(frame.registers).length === 8
    && Array.isArray(frame.tasks) && frame.se1 !== null && frame.se2 !== null);
  if (
    fixture.schema !== "needle-arm-portable-evidence/v1"
    || probe.schema !== "needle-arm-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.lifecycleCounts, fixture.lifecycleCounts)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== NEEDLE_ARM_FRAME_COUNT || !fields
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const stage = createSceneOnMovePresentation({
    move: "NEEDLE_ARM",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  for (const [index, oracle] of probe.frames.entries()) {
    const rgb = readFileSync(join(
      rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`,
    ));
    raw.update(rgb);
    const age = fixture.appStage.presentationAge + index;
    const component = needleArmAtAge(age, fixture.target.geometry.animationCenter);
    const seam = sceneOnNeedleArmView({ ...stage, age });
    const seamMatch = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      component,
    );
    const actualSpikes = oracle.sprites
      .filter((sprite) =>
        sprite.template.symbol === "gNeedleArmSpikeSpriteTemplate"
      )
      .map((sprite) => ({
        slot: sprite.slot, x: sprite.x, y: sprite.y,
        matrix: sprite.matrix, remaining: sprite.data[0],
      }));
    const expectedSpikes = component.spikes.slice()
      .sort((left, right) => left.oamSlot - right.oamSlot)
      .map((sprite) => ({
      slot: sprite.oamSlot, x: sprite.x, y: sprite.y,
      matrix: [
        sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
      ],
        remaining: sprite.remaining,
      }));
    const target = fixture.target.geometry.side === "player"
      ? oracle.playerSprite : oracle.opponentSprite;
    const baseline = fixture.target.geometry.side === "opponent" ? 1 : 0;
    const helpers = {
      hitsplat: oracle.sprites.some((sprite) =>
        sprite.template.symbol === "gBasicHitSplatSpriteTemplate"
      ),
      fist: oracle.sprites.some((sprite) =>
        sprite.template.symbol === "gFistFootSpriteTemplate"
      ),
    };
    const componentMatch =
      same(actualSpikes, expectedSpikes)
      && target.x2 === (age >= 71
        ? component.targetOffset.x2 : baseline)
      && target.y2 === component.targetOffset.y2
      && helpers.hitsplat === component.hitsplatVisible
      && helpers.fist === component.fistVisible
      && oracle.paletteTags.includes(10266) === component.greenSpikeLoaded
      && oracle.paletteTags.includes(10135) === component.impactLoaded
      && oracle.paletteTags.includes(10143) === component.handsAndFeetLoaded;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel++) {
      if (
        app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
      ) diff++;
    }
    const cleanup = index !== NEEDLE_ARM_FRAME_COUNT - 1
      || (!component.active && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    if (
      createHash("sha256").update(rgb).digest("hex") !== oracle.sha256
      || !seamMatch || !componentMatch || diff !== 0 || !cleanup
    ) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${seamMatch} `
        + `component=${componentMatch} diff=${diff} cleanup=${cleanup}`,
      );
    }
  }
  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) failures.push(`raw digest ${rawDigest}`);
  if (failures.length) throw new Error(failures.slice(0, 120).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length}/${NEEDLE_ARM_FRAME_COUNT} component/seam/framebuffer exact`,
  );
}

for (const path of paths) {
  verify(path, 1);
  verify(path, 2);
}
