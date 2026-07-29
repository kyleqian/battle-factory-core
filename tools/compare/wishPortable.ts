import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnWishView,
  type SceneOnWishConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { WISH_FRAME_COUNT, wishAtAge } from "../../src/animation/wish.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

type Fixture = SceneOnWishConfig & {
  schema: string; orientation: string; scenario: string; probe: string;
  appStage: { presentationAge: number };
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSha256: string; rawRgbSha256: string;
  lifecycleCounts: Record<string, number>;
  topology: Record<string, string[]>;
};
type Sprite = {
  slot: number; template: { symbol: string | null };
  x: number; y: number; x2: number; y2: number;
  invisible: number; animCmdIndex: number; attr: number[];
};
type Frame = {
  frame: number; sha256: string; scriptOffset: number | null;
  gAnimScriptActive: number; visualTaskCount: number; soundTaskCount: number;
  sprites: Sprite[]; softwareOam: string[]; hardwareOam: string[];
  hardwareMatrices: number[][]; fadedPalette: number[];
  unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[]; tileTags: number[]; registers: Record<string, number>;
  tasks: { func: { symbol: string | null } }[]; se1: unknown; se2: unknown;
};
type Probe = {
  schema: string; sourceWindow: Fixture["sourceWindow"];
  lifecycleCounts: Record<string, number>; topology: Record<string, string[]>;
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) {
  throw new Error("usage: wishPortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();
const tracked = new Set([
  "gWishStarSpriteTemplate",
  "gMiniTwinklingStarSpriteTemplate",
  "gGrantingStarsSpriteTemplate",
]);
function blendBlack(color: number, coeff: number): number {
  const channel = (shift: number) => {
    const source = color >> shift & 31;
    return source + ((-source * coeff) >> 4);
  };
  return channel(0) | channel(5) << 5 | channel(10) << 10;
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-wish-portable-"));
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
  const fields = probe.frames.every((frame) =>
    (frame.scriptOffset === null || typeof frame.scriptOffset === "number")
    && frame.softwareOam.length === 128 && frame.hardwareOam.length === 128
    && frame.hardwareMatrices.length === 32 && frame.fadedPalette.length === 512
    && frame.unfadedPalette.length === 512 && frame.hardwarePalette.length === 512
    && frame.paletteTags.length === 16 && frame.tileTags.length === 128
    && Object.keys(frame.registers).length === 8
    && frame.se1 !== null && frame.se2 !== null
  );
  if (
    fixture.schema !== "wish-portable-evidence/v1"
    || probe.schema !== "wish-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.lifecycleCounts, fixture.lifecycleCounts)
    || !same(probe.topology, fixture.topology)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== WISH_FRAME_COUNT || !fields
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const stage = createSceneOnMovePresentation<SceneOnWishConfig>({
    move: "WISH", attacker: fixture.attacker, target: fixture.target,
    fieldProfile: fixture.fieldProfile, twinkles: fixture.twinkles,
  });
  const raw = createHash("sha256");
  const failures: string[] = [];
  const firstWish = probe.frames.flatMap((frame) => frame.sprites)
    .find((sprite) => sprite.template.symbol === "gWishStarSpriteTemplate");
  if (!firstWish) throw new Error("Wish receipt omitted gWishStarSpriteTemplate");
  const goldBase = firstWish.attr[2]! & 0x3ff;
  for (const [index, oracle] of probe.frames.entries()) {
    const age = fixture.appStage.presentationAge + index;
    const component = wishAtAge(
      age, fixture.attacker.geometry.side,
      fixture.attacker.geometry.animationCenter, fixture.twinkles,
    );
    const seam = sceneOnWishView({ ...stage, age });
    const seamMatch = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      component,
    );
    const actual = oracle.sprites
      .filter((sprite) => tracked.has(sprite.template.symbol ?? ""))
      .map((sprite) => ({
        kind: sprite.template.symbol === "gWishStarSpriteTemplate"
          ? "wishStar"
          : sprite.template.symbol === "gMiniTwinklingStarSpriteTemplate"
          ? "miniStar" : "grantingStar",
        oamSlot: sprite.slot, x: sprite.x + sprite.x2, y: sprite.y + sprite.y2,
        frame: sprite.template.symbol === "gMiniTwinklingStarSpriteTemplate"
          ? (sprite.attr[2]! & 0x3ff) - goldBase
          : sprite.animCmdIndex,
        invisible: Boolean(sprite.invisible),
      }))
      .sort((left, right) => left.oamSlot - right.oamSlot);
    const expected = component.sprites.map((sprite) => ({
      kind: sprite.kind, oamSlot: sprite.oamSlot, x: sprite.x, y: sprite.y,
      frame: sprite.frame, invisible: sprite.invisible,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const palette = oracle.fadedPalette.slice(16, 64);
    const expectedPalette = oracle.unfadedPalette.slice(16, 64)
      .map((color) => blendBlack(color, component.backgroundBlackCoeff));
    const componentMatch = same(actual, expected)
      && same(palette, expectedPalette)
      && oracle.visualTaskCount === component.visualTaskCount;
    const rgb = readFileSync(join(
      rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`,
    ));
    raw.update(rgb);
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
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
    const cleanup = index !== WISH_FRAME_COUNT - 1
      || (!component.active && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    if (
      createHash("sha256").update(rgb).digest("hex") !== oracle.sha256
      || !seamMatch || !componentMatch || diff !== 0 || !cleanup
    ) failures.push(
      `frame ${oracle.frame}/age ${age}: seam=${seamMatch} `
      + `component=${componentMatch} diff=${diff} cleanup=${cleanup}`,
    );
  }
  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) failures.push(`raw digest ${rawDigest}`);
  if (failures.length) throw new Error(failures.slice(0, 200).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length}/${WISH_FRAME_COUNT} exact`,
  );
}

for (const path of paths) {
  verify(path, 1);
  verify(path, 2);
}
