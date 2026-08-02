import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSceneOnMovePresentation,
  sceneOnMoonlightView,
  type SceneOnMoonlightConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture extends SceneOnMoonlightConfig {
  readonly schema: "moonlight-portable-evidence/v1";
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly appStage: { readonly oracleFrame: number; readonly presentationAge: number };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly lifecycleCounts: Record<string, number>;
}

interface ProbeSprite {
  readonly slot: number;
  readonly template: { readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly pos: readonly [number, number, number, number];
  readonly animCmdIndex: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly gAnimScriptActive: number;
  readonly script: { readonly symbol: string | null };
  readonly sha256: string;
  readonly sprites: readonly ProbeSprite[];
  readonly tasks: readonly {
    readonly callback: { readonly symbol: string | null };
    readonly data: readonly number[];
  }[];
  readonly battlers: unknown;
  readonly registers: Record<string, number>;
  readonly softwareOam: readonly unknown[];
  readonly hardwareOam: readonly unknown[];
  readonly hardwareMatrices: readonly unknown[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly tileTags: readonly number[];
  readonly paletteTags: readonly number[];
  readonly mainCallbacks: Record<string, unknown>;
  readonly se1: unknown;
  readonly se2: unknown;
}

interface Probe {
  readonly schema: "moonlight-dense-evidence/v1";
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly lifecycleCounts: Record<string, number>;
  readonly topology: {
    readonly tasks: readonly string[];
    readonly templates: readonly string[];
    readonly callbacks: readonly string[];
  };
  readonly frames: readonly ProbeFrame[];
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (args.length < 1) {
  throw new Error(
    "usage: moonlightPortable.ts <fixture> [--existing <probe.json> <rgb-dir> | --fresh-count N]",
  );
}
const fixturePath = resolve(args[0]!);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
const existingAt = args.indexOf("--existing");
const freshAt = args.indexOf("--fresh-count");
const freshCount = freshAt >= 0 ? Number(args[freshAt + 1]) : 2;
const existing = existingAt >= 0
  ? { output: resolve(args[existingAt + 1]!), rgbDir: resolve(args[existingAt + 2]!) }
  : null;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function runProbe(): { output: string; rgbDir: string; scratch: string } {
  const scratch = createScratchDir("pokebench-moonlight-compare-");
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
  return { output, rgbDir, scratch };
}

function spriteKey(sprite: {
  readonly kind: string;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
}): string {
  return [sprite.kind, sprite.slot, sprite.x, sprite.y, sprite.frame].join(":");
}

function actualEffectSprites(frame: ProbeFrame): string[] {
  return frame.sprites.flatMap((sprite) => {
    const symbol = sprite.template.symbol;
    const kind = symbol === "gMoonSpriteTemplate"
      ? "moon"
      : symbol === "gMoonlightSparkleSpriteTemplate"
        ? "sparkle"
        : symbol === "gHealingBlueStarSpriteTemplate"
          ? "star"
          : null;
    if (!kind) return [];
    return [spriteKey({
      kind,
      slot: sprite.slot,
      x: sprite.pos[0] + sprite.pos[2],
      y: sprite.pos[1] + sprite.pos[3],
      frame: kind === "star" && sprite.animCmdIndex === 7
        ? 0 : sprite.animCmdIndex,
    })];
  }).sort();
}

function verifyRun(output: string, rgbDir: string, label: string): string {
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString("utf8")) as Probe;
  if (probe.schema !== "moonlight-dense-evidence/v1") {
    throw new Error(`${label}: wrong probe schema ${probe.schema}`);
  }
  if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) {
    throw new Error(`${label}: source window drift`);
  }
  const expectedLifecycle = {
    gMoonSpriteTemplate: 1,
    gMoonlightSparkleSpriteTemplate: 5,
    gHealingBlueStarSpriteTemplate: 4,
  };
  for (const [symbol, count] of Object.entries(expectedLifecycle)) {
    if (probe.lifecycleCounts[symbol] !== count) {
      throw new Error(`${label}: ${symbol} lifecycle ${probe.lifecycleCounts[symbol]} != ${count}`);
    }
  }
  for (const symbol of [
    "AnimTask_AlphaFadeIn_Step",
    "AnimTask_MoonlightEndFade_Step",
  ]) {
    if (!probe.topology.tasks.includes(symbol)) {
      throw new Error(`${label}: missing task ${symbol}`);
    }
  }
  for (const symbol of [
    "AnimMoon_Step",
    "AnimMoonlightSparkle_Step",
    "AnimSpriteOnMonPos",
  ]) {
    if (!probe.topology.callbacks.includes(symbol)) {
      throw new Error(`${label}: missing callback ${symbol}`);
    }
  }

  const stage = createSceneOnMovePresentation({
    move: "MOONLIGHT",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
    healingCenter: fixture.healingCenter,
  });
  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const first = probe.frames[0]!;
  const stableBattle = JSON.stringify(first.battlers);
  const rawWindow = createHash("sha256");
  let componentMatches = 0;
  let framebufferMatches = 0;
  const componentDiffs: string[] = [];
  const framebufferDiffs: string[] = [];

  for (
    let oracleFrame = fixture.denseWindow.startFrame;
    oracleFrame <= fixture.denseWindow.endFrame;
    oracleFrame += 1
  ) {
    const age = fixture.appStage.presentationAge
      + oracleFrame - fixture.denseWindow.startFrame;
    const state = { ...stage, age };
    const view = sceneOnMoonlightView(state);
    const oracle = frames.get(oracleFrame);
    if (!oracle) throw new Error(`${label}: probe omitted frame ${oracleFrame}`);
    const predicted = [
      ...(view.moonVisible
        ? [spriteKey({ kind: "moon", slot: 3, x: 120, y: 56, frame: 0 })]
        : []),
      ...view.sparkles.map((sprite) => spriteKey({
        kind: sprite.kind,
        slot: sprite.oamSlot,
        x: sprite.x,
        y: sprite.y,
        frame: sprite.frame,
      })),
      ...view.stars.map((sprite) => spriteKey({
        kind: sprite.kind,
        slot: sprite.oamSlot,
        x: sprite.x,
        y: sprite.y,
        frame: sprite.frame,
      })),
    ].sort();
    const actual = actualEffectSprites(oracle);
    const tagsMatch =
      oracle.tileTags.includes(10194) === view.moonLoaded
      && oracle.tileTags.includes(10195) === view.greenSparkleLoaded
      && oracle.tileTags.includes(10031) === view.blueStarLoaded
      && oracle.paletteTags.includes(10194) === view.moonLoaded
      && oracle.paletteTags.includes(10195) === view.greenSparkleLoaded
      && oracle.paletteTags.includes(10031) === view.blueStarLoaded;
    const immutable = JSON.stringify(oracle.battlers) === stableBattle;
    const denseShape =
      oracle.softwareOam.length === 128
      && oracle.hardwareOam.length === 128
      && oracle.hardwareMatrices.length === 32
      && oracle.fadedPalette.length === 512
      && oracle.unfadedPalette.length === 512
      && oracle.hardwarePalette.length === 512
      && Object.keys(oracle.registers).length >= 21
      && Object.keys(oracle.mainCallbacks).length >= 6
      && oracle.se1 !== undefined
      && oracle.se2 !== undefined;
    if (
      JSON.stringify(predicted) === JSON.stringify(actual)
      && tagsMatch && immutable && denseShape
    ) {
      componentMatches += 1;
    } else {
      componentDiffs.push(
        `${oracleFrame}: ${predicted.join(",")} != ${actual.join(",")}; tags=${tagsMatch} immutable=${immutable} dense=${denseShape}`,
      );
    }

    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: state,
    };
    const app = render(engine);
    const rgb = readFileSync(join(rgbDir, `${String(oracleFrame).padStart(5, "0")}.rgb`));
    rawWindow.update(rgb);
    if (sha256(rgb) !== oracle.sha256) {
      throw new Error(`${label}: raw RGB receipt drift at frame ${oracleFrame}`);
    }
    let count = 0;
    let minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const appOffset = pixel * 4;
      const rgbOffset = pixel * 3;
      if (
        app[appOffset] !== rgb[rgbOffset]
        || app[appOffset + 1] !== rgb[rgbOffset + 1]
        || app[appOffset + 2] !== rgb[rgbOffset + 2]
      ) {
        count += 1;
        const x = pixel % 240;
        const y = Math.floor(pixel / 240);
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    if (count === 0) framebufferMatches += 1;
    else framebufferDiffs.push(
      `${oracleFrame}:${count}:${minX},${minY}-${maxX},${maxY}`,
    );
  }
  const total = fixture.denseWindow.frameCount;
  const evidence = sha256(bytes);
  const rawRgb = rawWindow.digest("hex");
  const last = probe.frames[probe.frames.length - 1]!;
  if (
    last.gAnimScriptActive !== 0
    || actualEffectSprites(last).length !== 0
    || last.tasks.some((task) =>
      task.callback.symbol === "AnimTask_AlphaFadeIn_Step"
      || task.callback.symbol === "AnimTask_MoonlightEndFade_Step"
    )
  ) {
    throw new Error(`${label}: final cleanup is not inactive`);
  }
  console.log(
    `${label}: component/seam/state ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}; receipt ${evidence}; raw ${rawRgb}`,
  );
  if (
    componentMatches !== total
    || framebufferMatches !== total
    || evidence !== fixture.evidenceSha256
    || rawRgb !== fixture.rawRgbSha256
  ) {
    if (componentDiffs.length) console.error(componentDiffs.slice(0, 12).join("\n"));
    if (framebufferDiffs.length) {
      console.error(`framebuffer ${framebufferDiffs.slice(0, 40).join(" ")}`);
    }
    if (evidence !== fixture.evidenceSha256) {
      console.error(`evidence ${evidence} != ${fixture.evidenceSha256}`);
    }
    if (rawRgb !== fixture.rawRgbSha256) {
      console.error(`raw RGB ${rawRgb} != ${fixture.rawRgbSha256}`);
    }
    return "";
  }
  return evidence;
}

if (existing) {
  if (!verifyRun(existing.output, existing.rgbDir, `${fixture.orientation}:existing`)) {
    process.exit(1);
  }
} else {
  const receipts: string[] = [];
  for (let run = 1; run <= freshCount; run += 1) {
    const result = runProbe();
    const receipt = verifyRun(
      result.output,
      result.rgbDir,
      `${fixture.orientation}:fresh-${run}`,
    );
    if (!receipt) {
      console.error(`scratch: ${result.scratch}`);
      process.exit(1);
    }
    receipts.push(receipt);
  }
  if (new Set(receipts).size !== 1) {
    throw new Error(`${fixture.orientation}: twice-fresh probe receipts differ`);
  }
}
