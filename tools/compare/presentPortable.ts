import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { presentAtAge } from "../../src/animation/present.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPresentView,
  type SceneOnPresentConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

type Fixture = {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: "player-to-opponent" | "opponent-to-player";
  readonly branch: "damage" | "heal";
  readonly occurrence: number;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly lifecycleCounts: Record<string, number>;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
};

type ProbeSprite = {
  readonly slot: number;
  readonly template: { readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly pos: readonly [number, number, number, number];
  readonly matrix: readonly [number, number, number, number];
  readonly animCmdIndex: number;
};

type ProbeFrame = {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly visualTaskCount: number;
  readonly sprites: readonly ProbeSprite[];
  readonly battlers: unknown;
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly unknown[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly registers: Record<string, number>;
  readonly mainCallbacks: Record<string, unknown>;
  readonly se1: unknown;
  readonly se2: unknown;
};

type Probe = {
  readonly schema: "present-dense-evidence/v1";
  readonly sourceWindow: Fixture["denseWindow"];
  readonly lifecycleCounts: Record<string, number>;
  readonly topology: {
    readonly templates: readonly string[];
    readonly callbacks: readonly string[];
  };
  readonly frames: readonly ProbeFrame[];
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (args.length < 1) {
  throw new Error(
    "usage: presentPortable.ts <fixture> [--existing <probe.json> <rgb-dir> | --fresh-count N]",
  );
}
const fixture = JSON.parse(
  readFileSync(resolve(args[0]!), "utf8"),
) as Fixture;
const existingAt = args.indexOf("--existing");
const freshAt = args.indexOf("--fresh-count");
const freshCount = freshAt >= 0 ? Number(args[freshAt + 1]) : 2;
const existing = existingAt >= 0
  ? {
      output: resolve(args[existingAt + 1]!),
      rgbDir: resolve(args[existingAt + 2]!),
    }
  : null;

const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

function configFor(): SceneOnPresentConfig {
  const playerToOpponent = fixture.orientation === "player-to-opponent";
  const playerHp = playerToOpponent
    ? fixture.branch === "damage" ? 123 : 106
    : fixture.branch === "damage" ? 117 : 120;
  const playerMaxHp = playerToOpponent ? 138
    : fixture.branch === "damage" ? 117 : 142;
  const opponentHp = playerToOpponent
    ? fixture.branch === "damage" ? 111 : 104
    : fixture.branch === "damage" ? 138 : 88;
  const opponentMaxHp = playerToOpponent ? 117 : 138;
  return {
    move: "PRESENT",
    branch: fixture.branch,
    attacker: playerToOpponent
      ? {
          species: "DELIBIRD",
          geometry: {
            side: "player",
            spriteCorner: { x: 40, y: 54 },
            animationCenter: { x: 72, y: 86 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        }
      : {
          species: "DELIBIRD",
          geometry: {
            side: "opponent",
            spriteCorner: { x: 144, y: 16 },
            animationCenter: { x: 176, y: 48 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        },
    target: playerToOpponent
      ? {
          species: "ONIX",
          geometry: {
            side: "opponent",
            spriteCorner: { x: 144, y: 10 },
            animationCenter: { x: 176, y: 42 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        }
      : {
          species: "ONIX",
          geometry: {
            side: "player",
            spriteCorner: { x: 40, y: 48 },
            animationCenter: { x: 72, y: 80 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        },
    fieldProfile: {
      playerHp,
      playerMaxHp,
      opponentHp,
      opponentMaxHp,
      playerGender: "male",
      opponentGender: "male",
    },
  };
}

function runProbe(): { output: string; rgbDir: string; scratch: string } {
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-present-compare-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
    String(fixture.occurrence),
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  return { output, rgbDir, scratch };
}

function actualSprites(frame: ProbeFrame): string[] {
  return frame.sprites.flatMap((sprite) => {
    const symbol = sprite.template.symbol;
    const kind = symbol === "gPresentSpriteTemplate" ? "bag"
      : symbol === "gExplosionSpriteTemplate" ? "explosion"
      : symbol === "gPresentHealParticleSpriteTemplate" ? "greenSparkle"
      : symbol === "gHealingBlueStarSpriteTemplate" ? "blueStar"
      : null;
    if (!kind) return [];
    const frameIndex = kind === "blueStar" && sprite.animCmdIndex === 7
      ? 0 : sprite.animCmdIndex;
    return [[
      kind, sprite.slot, sprite.pos[0], sprite.pos[1],
      sprite.pos[2], sprite.pos[3], frameIndex,
      sprite.callback.symbol, ...sprite.matrix,
    ].join(":")];
  }).sort();
}

function predictedSprites(
  view: ReturnType<typeof sceneOnPresentView>,
): string[] {
  const bag = view.bag
    ? [[
        "bag", view.bag.slot, view.bag.x, view.bag.y, 0, view.bag.y2, 0,
        view.bag.callback,
        view.bag.matrix.a, view.bag.matrix.b,
        view.bag.matrix.c, view.bag.matrix.d,
      ].join(":")]
    : [];
  return [
    ...bag,
    ...[
      ...view.explosions,
      ...view.greenSparkles,
      ...view.blueStars,
    ].map((sprite) => [
      sprite.kind, sprite.slot, sprite.x, sprite.y, 0, sprite.y2,
      sprite.frame, sprite.callback, 256, 0, 0, 256,
    ].join(":")),
  ].sort();
}

function framebufferDiff(app: Uint8ClampedArray, rgb: Buffer): string | null {
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
  return count === 0 ? null : `${count}:${minX},${minY}-${maxX},${maxY}`;
}

function verifyRun(output: string, rgbDir: string, label: string): string {
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString("utf8")) as Probe;
  if (probe.schema !== "present-dense-evidence/v1") {
    throw new Error(`${label}: wrong probe schema ${probe.schema}`);
  }
  if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) {
    throw new Error(`${label}: source window drift`);
  }
  if (JSON.stringify(probe.lifecycleCounts) !== JSON.stringify(fixture.lifecycleCounts)) {
    throw new Error(`${label}: lifecycle drift`);
  }
  const stage = createSceneOnMovePresentation<SceneOnPresentConfig>(configFor());
  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const stableBattle = JSON.stringify(probe.frames[0]!.battlers);
  const componentDiffs: string[] = [];
  const seamDiffs: string[] = [];
  const framebufferDiffs: string[] = [];
  const rawWindow = createHash("sha256");
  let componentMatches = 0, seamMatches = 0, framebufferMatches = 0;

  for (
    let oracleFrame = fixture.denseWindow.startFrame;
    oracleFrame <= fixture.denseWindow.endFrame;
    oracleFrame += 1
  ) {
    const age = oracleFrame - fixture.denseWindow.startFrame;
    const state = { ...stage, age };
    const view = sceneOnPresentView(state);
    const oracle = frames.get(oracleFrame);
    if (!oracle) throw new Error(`${label}: probe omitted frame ${oracleFrame}`);
    const expectedSprites = predictedSprites(view);
    const observedSprites = actualSprites(oracle);
    const tagsMatch =
      oracle.tileTags.includes(10224) === view.itemBagLoaded
      && oracle.paletteTags.includes(10224) === view.itemBagLoaded
      && oracle.tileTags.includes(10198) === view.explosionLoaded
      && oracle.paletteTags.includes(10198) === view.explosionLoaded
      && oracle.tileTags.includes(10195) === view.greenSparkleLoaded
      && oracle.paletteTags.includes(10195) === view.greenSparkleLoaded
      && oracle.tileTags.includes(10031) === view.blueStarLoaded
      && oracle.paletteTags.includes(10031) === view.blueStarLoaded;
    const denseShape =
      oracle.softwareOam.length === 128
      && oracle.hardwareOam.length === 128
      && oracle.hardwareMatrices.length === 32
      && oracle.fadedPalette.length === 512
      && oracle.unfadedPalette.length === 512
      && oracle.hardwarePalette.length === 512
      && Object.keys(oracle.registers).length >= 21
      && Object.keys(oracle.mainCallbacks).length >= 6
      && oracle.se1 !== undefined && oracle.se2 !== undefined
      && JSON.stringify(oracle.battlers) === stableBattle;
    if (
      JSON.stringify(expectedSprites) === JSON.stringify(observedSprites)
      && tagsMatch && denseShape
    ) {
      componentMatches += 1;
    } else {
      componentDiffs.push(
        `${oracleFrame}: ${expectedSprites.join(",")} != ${observedSprites.join(",")}; tags=${tagsMatch} dense=${denseShape}`,
      );
    }

    const reduced = presentAtAge(
      age,
      fixture.branch,
      configFor().attacker.geometry.side,
      configFor().attacker.geometry.battlePositionCenter,
      configFor().target.geometry.battlePositionCenter,
      configFor().target.geometry.animationCenter,
    );
    const seamState = {
      active: view.active,
      branch: view.branch,
      itemBagLoaded: view.itemBagLoaded,
      explosionLoaded: view.explosionLoaded,
      greenSparkleLoaded: view.greenSparkleLoaded,
      blueStarLoaded: view.blueStarLoaded,
      bag: view.bag,
      explosions: view.explosions,
      greenSparkles: view.greenSparkles,
      blueStars: view.blueStars,
      sound: view.sound,
      soundSide: view.soundSide,
    };
    if (JSON.stringify(reduced) === JSON.stringify(seamState)) seamMatches += 1;
    else seamDiffs.push(`${oracleFrame}: reducer/view divergence`);

    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: state,
    };
    const app = render(engine);
    const rgb = readFileSync(
      join(rgbDir, `${String(oracleFrame).padStart(5, "0")}.rgb`),
    );
    rawWindow.update(rgb);
    if (sha256(rgb) !== oracle.sha256) {
      throw new Error(`${label}: raw RGB receipt drift at ${oracleFrame}`);
    }
    const diff = framebufferDiff(app, rgb);
    if (diff === null) framebufferMatches += 1;
    else framebufferDiffs.push(`${oracleFrame}:${diff}`);
  }

  const total = fixture.denseWindow.frameCount;
  const evidence = sha256(bytes);
  const rawRgb = rawWindow.digest("hex");
  const last = probe.frames.at(-1)!;
  const cleaned =
    last.gAnimScriptActive === 0
    && last.visualTaskCount === 0
    && actualSprites(last).length === 0;
  console.log(
    `${label}: component ${componentMatches}/${total}; seam ${seamMatches}/${total}; framebuffer ${framebufferMatches}/${total}; receipt ${evidence}; raw ${rawRgb}`,
  );
  if (
    componentMatches !== total || seamMatches !== total
    || framebufferMatches !== total || !cleaned
    || evidence !== fixture.evidenceSha256
    || rawRgb !== fixture.rawRgbSha256
  ) {
    if (componentDiffs.length) {
      console.error(componentDiffs.slice(0, 12).join("\n"));
    }
    if (seamDiffs.length) console.error(seamDiffs.slice(0, 12).join("\n"));
    if (framebufferDiffs.length) {
      console.error(`framebuffer ${framebufferDiffs.slice(0, 60).join(" ")}`);
    }
    if (!cleaned) console.error("final Present cleanup is not inactive");
    if (evidence !== fixture.evidenceSha256) {
      console.error(`evidence ${evidence} != ${fixture.evidenceSha256}`);
    }
    if (rawRgb !== fixture.rawRgbSha256) {
      console.error(`raw RGB ${rawRgb} != ${fixture.rawRgbSha256}`);
    }
    return "";
  }
  return `${evidence}/${rawRgb}`;
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
    throw new Error(`${fixture.orientation}: fresh probe receipts differ`);
  }
}
