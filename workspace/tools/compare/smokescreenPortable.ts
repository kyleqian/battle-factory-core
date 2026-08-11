import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { smokescreenEffectAtAge } from "../../src/animation/smokescreen.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSmokescreenView,
  type SceneOnSmokescreenConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture extends SceneOnSmokescreenConfig {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
}

interface ProbeSprite {
  readonly slot: number;
  readonly raw: string;
  readonly template: { readonly address: number; readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr: readonly number[];
  readonly matrixNum: number;
  readonly matrix: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly unknown[];
  readonly sprites: readonly ProbeSprite[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
}

interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly templates: Readonly<Record<
    "gBlackBallSpriteTemplate" | "gBlackSmokeSpriteTemplate",
    number
  >>;
  readonly songHeaders: Readonly<Record<
    "SE_M_DOUBLE_TEAM" | "SE_M_SAND_ATTACK",
    number
  >>;
  readonly topology: {
    readonly tasks: readonly string[];
    readonly templates: readonly string[];
  };
  readonly frames: readonly ProbeFrame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: smokescreenPortable.ts <player-fixture> <opponent-fixture>",
  );
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const fresh = new Map<string, { evidence: string; raw: string }>();
const le16 = (value: number) =>
  `${(value & 0xff).toString(16).padStart(2, "0")}${
    (value >>> 8 & 0xff).toString(16).padStart(2, "0")
  }`;

function expectedScriptOffset(age: number): number {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 42) return 29;
  if (age <= 46) return 39;
  if (age <= 123) return 247;
  return 248;
}

function verify(fixturePath: string): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-smoke-portable-");
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
  if (
    probe.schema !== "smokescreen-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
  ) throw new Error(`${fixture.orientation}: evidence contract changed`);
  if (probe.topology.tasks.length !== 0) {
    throw new Error(`${fixture.orientation}: unexpected task topology`);
  }
  for (const name of [
    "gBlackBallSpriteTemplate",
    "gBlackSmokeSpriteTemplate",
    "sSmokescreenImpactSpriteTemplate",
  ]) {
    if (!probe.topology.templates.includes(name)) {
      throw new Error(`${fixture.orientation}: missing ${name}`);
    }
  }
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawHash = createHash("sha256");
  for (const frame of probe.frames) {
    rawHash.update(readFileSync(
      join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
    ));
  }
  const rawDigest = rawHash.digest("hex");
  if (evidence !== fixture.evidenceSha256 || rawDigest !== fixture.rawRgbSha256) {
    throw new Error(
      `${fixture.orientation}: receipt changed ${evidence} / ${rawDigest}`,
    );
  }
  const priorFresh = fresh.get(fixture.orientation);
  if (priorFresh && !same(priorFresh, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh receipt diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });

  const stage = createSceneOnMovePresentation({
    move: "SMOKESCREEN",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const relevant = new Set([
    probe.templates.gBlackBallSpriteTemplate,
    probe.templates.gBlackSmokeSpriteTemplate,
  ]);
  const mismatches: string[] = [];
  let components = 0;
  let framebuffers = 0;
  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const expected = smokescreenEffectAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attacker.geometry.animationCenter,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnSmokescreenView({ ...stage, age });
    const actualEffects = actual.sprites.filter((sprite) =>
      relevant.has(sprite.template.address)
      || sprite.template.symbol === "sSmokescreenImpactSpriteTemplate"
    );
    const expectedKinds = expected.sprites.map((sprite) => ({
      slot: sprite.oamSlot,
      template: sprite.kind === "black-ball"
        ? "gBlackBallSpriteTemplate"
        : sprite.kind === "black-smoke"
          ? "gBlackSmokeSpriteTemplate"
          : "sSmokescreenImpactSpriteTemplate",
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      invisible: sprite.invisible,
    }));
    const actualKinds = actualEffects.map((sprite) => ({
      slot: sprite.slot,
      template: sprite.template.symbol,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      invisible: Boolean(parseInt(sprite.raw.slice(0x3e * 2, 0x3e * 2 + 2), 16) & 4),
    }));
    const software = same(actualKinds, expectedKinds);
    const source =
      actual.scriptOffset === expectedScriptOffset(age)
      && Boolean(actual.gAnimScriptActive) === expected.active;
    const counts =
      actual.visualTaskCount === expected.visualTaskCount
      && actual.soundTaskCount === 0
      && actual.tasks.length === 0;
    const registers = ["bldcnt", "bldalpha", "bldy"].every(
      (name) => actual.registers[name] === 0,
    );
    const event = expected.soundEvents.find((item) => item.age === age);
    const sound = event === undefined || (
      actual.se1.songHeader === probe.songHeaders[event.song]
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === event.pan
    );
    const prior = frames.get(frame - 1);
    const priorEffects = prior?.sprites.filter((sprite) =>
      (
        relevant.has(sprite.template.address)
        || sprite.template.symbol === "sSmokescreenImpactSpriteTemplate"
      )
      && !(parseInt(sprite.raw.slice(0x3e * 2, 0x3e * 2 + 2), 16) & 4)
    ) ?? [];
    const hardwareOam = priorEffects.every((sprite) => {
      const attrs = le16(sprite.attr[0]!) + le16(sprite.attr[1]!)
        + le16(sprite.attr[2]!);
      return actual.hardwareOam.some((row) => row.startsWith(attrs));
    });
    const palettes = !prior || priorEffects.every((sprite) => {
      const start = 256 + (sprite.attr[2]! >>> 12) * 16;
      return actual.hardwarePalette.slice(start, start + 16).every(
        (color, index) => color === prior.fadedPalette[start + index],
      );
    });
    const matrices = actualEffects.every(
      (sprite) => (sprite.attr[0]! & 0x300) === 0
        && actual.hardwareMatrices[sprite.matrixNum]?.length === 4,
    );
    const seamShape =
      same(seam.sprites, expected.sprites)
      && seam.active === expected.active
      && seam.dynamicImpactAssetsLoaded === expected.dynamicImpactAssetsLoaded
      && same(seam.taskTopology, []);
    const raw = readFileSync(
      join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
    );
    const rawReceipt =
      createHash("sha256").update(raw).digest("hex") === actual.sha256;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
      ) diff += 1;
    }
    if (diff === 0) framebuffers += 1;
    if (
      software && source && counts && registers && sound && hardwareOam
      && palettes && matrices && seamShape && rawReceipt
    ) components += 1;
    else mismatches.push(
      `frame ${frame}/age ${age}: software=${software} source=${source} `
      + `counts=${counts} registers=${registers} sound=${sound} `
      + `oam=${hardwareOam} palettes=${palettes} matrices=${matrices} `
      + `seam=${seamShape} raw=${rawReceipt}`,
    );
    if (diff !== 0) mismatches.push(`frame ${frame}/age ${age}: framebufferDiff=${diff}`);
  }
  console.log(
    `${fixture.orientation}: components ${components}/${fixture.sourceWindow.frameCount}; `
    + `framebuffer ${framebuffers}/${fixture.sourceWindow.frameCount}; `
    + `evidence ${evidence}; raw ${rawDigest}`,
  );
  if (mismatches.length) throw new Error(mismatches.join("\n"));
}

for (let repeat = 0; repeat < 2; repeat += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath);
}
