import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnDragonClawView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female" | "none";
    readonly opponentGender?: "male" | "female" | "none";
  };
}
interface ProbeSprite {
  readonly slot: number; readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number; readonly animNum: number;
  readonly paletteNum: number; readonly callback: number;
  readonly data: readonly number[];
}
interface ProbeFrame {
  readonly frame: number;
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly battlerSprites: readonly ProbeSprite[];
  readonly globalSpriteCoordOffsetY: number;
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly {
      readonly flags: number; readonly pan: number; readonly panX: number;
    }[];
  };
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly effectSprites: {
    readonly gFireSpinSpriteTemplate: readonly ProbeSprite[];
    readonly gClawSlashSpriteTemplate: readonly ProbeSprite[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-dragon-claw-compare-"));
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
  readonly symbols: {
    readonly AnimTask_BlendSpriteColor_Step2: number;
    readonly AnimParticleInVortex_Step: number;
    readonly RunStoredCallbackWhenAnimEnds: number;
    readonly DestroyAnimSprite: number;
  };
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "DRAGON_CLAW",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const key = (values: readonly number[]) => values.join(",");
const blendBgr555 = (source: number, target: number, coefficient: number) => {
  const channel = (shift: number) => {
    const from = (source >>> shift) & 31;
    const to = (target >>> shift) & 31;
    return from + (((to - from) * coefficient) >> 4);
  };
  return channel(0) | (channel(5) << 5) | (channel(10) << 10);
};
let componentMatches = 0;
let framebufferMatches = 0;
const componentDiffs: string[] = [];
const framebufferDiffs: string[] = [];
let firstFramebufferDiff: string | null = null;

for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge
    + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnDragonClawView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expectedFire = view.fireSpin.map((sprite) => key([
    sprite.x, sprite.y, sprite.x2, sprite.y2, sprite.remaining,
    sprite.angle, sprite.animationFrame,
  ])).sort();
  const actualFire = oracle.effectSprites.gFireSpinSpriteTemplate.map((sprite) =>
    key([sprite.x, sprite.y, sprite.x2, sprite.y2, sprite.data[0]!,
      sprite.data[5]!, sprite.animNum])).sort();
  const expectedClaws = view.slashes.map((sprite) =>
    key([sprite.x, sprite.y, sprite.animationFrame])).sort();
  const actualClaws = oracle.effectSprites.gClawSlashSpriteTemplate.map((sprite) =>
    key([sprite.x, sprite.y, sprite.animNum])).sort();
  const attackerIndex = fixture.attacker.geometry.side === "player" ? 0 : 1;
  const attacker = oracle.battlerSprites[attackerIndex]!;
  const attackerMatches =
    attacker.x2 === view.attackerOffset.x2
    && attacker.y2 === view.attackerOffset.y2;
  const targetGlobalYMatches =
    oracle.globalSpriteCoordOffsetY === view.targetGlobalY;
  const paletteTask = oracle.tasks.find((task) =>
    task.func === probe.symbols.AnimTask_BlendSpriteColor_Step2);
  const paletteTaskMatches = view.blendDirection === null
    ? paletteTask === undefined
    : paletteTask !== undefined
      && paletteTask.data[1] === (1 << attacker.paletteNum)
      && paletteTask.data[2] === 4
      && paletteTask.data[3] === (view.blendDirection === "forward" ? 0 : 8)
      && paletteTask.data[4] === (view.blendDirection === "forward" ? 8 : 0)
      && paletteTask.data[5] === 639;
  const paletteOffset = (16 + attacker.paletteNum) * 16;
  const paletteMatches = Array.from({ length: 16 }, (_, index) => {
    const offset = paletteOffset + index;
    const source = oracle.unfadedPalette[offset]!;
    return oracle.fadedPalette[offset] === blendBgr555(
      source, 639, view.fadedPaletteCoefficient,
    ) && oracle.hardwarePalette[offset] === blendBgr555(
      source, 639, view.hardwarePaletteCoefficient,
    );
  }).every(Boolean);
  const previousOracle = frames.get(frame - 1);
  const expectedSound = view.soundEvents[0];
  const soundMatches = expectedSound === undefined
    ? true
    : previousOracle !== undefined
      && oracle.se1.tracks.some((track) =>
        (track.flags & 0x80) !== 0 && track.panX === expectedSound.pan)
      && (
        oracle.se1.songHeader !== previousOracle.se1.songHeader
        || oracle.se1.tracks.some((track, index) =>
          (track.flags & 3) !== 0
          && (previousOracle.se1.tracks[index]!.flags & 3) === 0)
      );
  const lifetimeMatches =
    oracle.effectSprites.gFireSpinSpriteTemplate.every((sprite) =>
      sprite.callback === probe.symbols.AnimParticleInVortex_Step)
    && oracle.effectSprites.gClawSlashSpriteTemplate.every((sprite) =>
      sprite.callback === probe.symbols.RunStoredCallbackWhenAnimEnds
      || sprite.callback === probe.symbols.DestroyAnimSprite)
    && new Set([
      ...oracle.effectSprites.gFireSpinSpriteTemplate,
      ...oracle.effectSprites.gClawSlashSpriteTemplate,
    ].map((sprite) => sprite.slot)).size
      === oracle.effectSprites.gFireSpinSpriteTemplate.length
        + oracle.effectSprites.gClawSlashSpriteTemplate.length;
  const fireMatches = JSON.stringify(expectedFire) === JSON.stringify(actualFire);
  const clawMatches = JSON.stringify(expectedClaws) === JSON.stringify(actualClaws);
  if (
    fireMatches && clawMatches && attackerMatches && targetGlobalYMatches
    && paletteTaskMatches && paletteMatches && soundMatches && lifetimeMatches
  ) componentMatches += 1;
  else componentDiffs.push(
    `frame ${frame}/age ${age}: fire=${fireMatches}`
    + ` claw=${clawMatches} attacker=${attackerMatches}`
    + ` globalY=${targetGlobalYMatches} paletteTask=${paletteTaskMatches}`
    + ` palette=${paletteMatches} sound=${soundMatches}`
    + ` lifetime=${lifetimeMatches}`,
  );

  try {
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: state,
    };
    const app = render(engine);
    const rgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
    let exact = true;
    let count = 0;
    let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) {
        exact = false;
        count += 1;
        const x = pixel % 240; const y = Math.floor(pixel / 240);
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    if (exact) framebufferMatches += 1;
    else if (firstFramebufferDiff === null) {
      firstFramebufferDiff = `first framebuffer diff at frame ${frame}/age ${age}`;
    }
    if (!exact) {
      const nearby = frame <= fixture.denseWindow.startFrame + 6
        ? [-2, -1, 0, 1, 2].map((delta) => {
            const alternate = render({
              ...createInitialState(),
              rngMode: "frontierBattle",
              sceneOnPresentation: { ...state, age: age + delta },
            });
            let alternateCount = 0;
            for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
              if (
                alternate[pixel * 4] !== rgb[pixel * 3]
                || alternate[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
                || alternate[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
              ) alternateCount += 1;
            }
            return `${delta}:${alternateCount}`;
          }).join(",")
        : "";
      framebufferDiffs.push(
        `frame ${frame}/age ${age}: ${count}px`
        + ` bbox=${minX},${minY}..${maxX},${maxY}`
        + (nearby ? ` nearby=${nearby}` : ""),
      );
    }
  } catch (error) {
    if (firstFramebufferDiff === null) {
      firstFramebufferDiff =
        `renderer checkpoint at frame ${frame}/age ${age}: ${String(error)}`;
    }
  }
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `DRAGON CLAW component ${componentMatches}/${total};`
  + ` framebuffer ${framebufferMatches}/${total}`,
);
if (componentMatches !== total || framebufferMatches !== total) {
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 20).join("\n"));
  if (framebufferDiffs.length) {
    console.error(framebufferDiffs.slice(0, 40).join("\n"));
  }
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
