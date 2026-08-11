import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnRefreshView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  REFRESH_FRAME_COUNT,
  REFRESH_GRANTING_STAR_STARTS,
  refreshBlendCoeffAtAge,
} from "../../src/animation/refresh.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly pair: string;
  readonly orientation: string;
  readonly move: string;
  readonly appStage: { readonly oracleFrame: number; readonly presentationAge: number };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: SceneOnDragonRageFieldProfile;
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly lifecycleCounts: Record<string, number>;
}

interface ProbeSprite {
  readonly slot: number;
  readonly template: { readonly symbol: string | null };
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animCmdIndex: number;
  readonly matrix: readonly number[];
}

interface ProbeTask {
  readonly func: { readonly symbol: string | null };
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly gAnimScriptActive: boolean;
  readonly visualTaskCount: number;
  readonly sprites: readonly ProbeSprite[];
  readonly tasks: readonly ProbeTask[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly bg1: { readonly x: number; readonly y: number };
  readonly registers: { readonly bldalpha: number };
  readonly battlers: unknown;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(
  readFileSync(resolve(process.argv[2]!), "utf8"),
) as Fixture;
const scratch = createScratchDir("pokebench-refresh-compare-");
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

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly schema: string;
  readonly sourceWindow: Fixture["denseWindow"];
  readonly lifecycleCounts: Record<string, number>;
  readonly frames: readonly ProbeFrame[];
};
const evidenceSha256 = createHash("sha256")
  .update(readFileSync(output))
  .digest("hex");
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const errors: string[] = [];
if (probe.schema !== fixture.evidenceSchema) errors.push("probe schema drifted");
if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) {
  errors.push("dense window drifted");
}
if (probe.frames.length !== fixture.denseWindow.frameCount) {
  errors.push(`dense frame count ${probe.frames.length}`);
}
if (evidenceSha256 !== fixture.evidenceSha256) {
  errors.push(`evidence hash ${evidenceSha256}`);
}
if (JSON.stringify(probe.lifecycleCounts) !== JSON.stringify(fixture.lifecycleCounts)) {
  errors.push("lifecycle counts drifted");
}
if (!probe.frames[0]?.gAnimScriptActive
  || probe.frames.at(-1)?.gAnimScriptActive) {
  errors.push("active/cleanup boundary drifted");
}
if (JSON.stringify(probe.frames[0]?.battlers)
  !== JSON.stringify(probe.frames.at(-1)?.battlers)) {
  errors.push("gameplay fields changed inside animation body");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const stage = createSceneOnMovePresentation({
  move: "REFRESH",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const attackerBank = fixture.attacker.geometry.side === "player" ? 16 : 17;
const BLEND_TARGET = [12, 24, 30] as const;
const to5 = (value: number): readonly number[] => [
  value & 31, (value >> 5) & 31, (value >> 10) & 31,
];
const blend5 = (color: readonly number[], coeff: number): string => color
  .map((channel, i) =>
    channel + (((BLEND_TARGET[i]! - channel) * coeff) >> 4))
  .join(",");
const paletteCoef = (unfaded: readonly number[], faded: readonly number[], bank: number): number | null => {
  for (let coeff = 0; coeff <= 16; coeff += 1) {
    let ok = true;
    for (let i = 0; i < 16; i += 1) {
      if (blend5(to5(unfaded[bank * 16 + i]!), coeff)
        !== to5(faded[bank * 16 + i]!).join(",")) {
        ok = false;
        break;
      }
    }
    if (ok) return coeff;
  }
  return null;
};

let componentMatches = 0;
let framebufferMatches = 0;
const componentDiffs: string[] = [];
const framebufferDiffs: string[] = [];
const rawRgbHash = createHash("sha256");
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age = fixture.appStage.presentationAge
    + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnRefreshView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);

  const stars = oracle.sprites
    .filter((sprite) => (sprite.template.symbol ?? "") === "gGrantingStarsSpriteTemplate")
    .map((sprite) => [
      sprite.slot,
      sprite.x + sprite.x2,
      sprite.y + sprite.y2,
      sprite.animCmdIndex,
    ].join(":"))
    .sort();
  const expectedStars = view.stars
    .map((star) => [star.oamSlot, star.x, star.y, star.frame].join(":"))
    .sort();
  const ring = oracle.sprites.find(
    (sprite) => (sprite.template.symbol ?? "") === "gThinRingExpandingSpriteTemplate",
  );
  const expectedRing = view.ring
    ? [
      view.ring.x,
      view.ring.y,
      view.ring.matrixScale,
      view.ring.matrixScale,
    ].join(",") : null;
  const actualRing = ring
    ? [ring.x, ring.y, ring.matrix[0], ring.matrix[3]].join(",")
    : null;
  const maskTasks = oracle.tasks.filter(
    (task) => task.func.symbol === "AnimTask_StatusClearedEffect"
      || task.func.symbol === "UpdateMonScrollingBgMask",
  );
  const prior = sceneOnRefreshView({ ...state, age: age - 1 });
  const bgCoef = paletteCoef(oracle.unfadedPalette, oracle.fadedPalette, 1);
  const attackerCoef = paletteCoef(
    oracle.unfadedPalette, oracle.fadedPalette, attackerBank,
  );
  const expectedBg = refreshBlendCoeffAtAge(age, "bg");
  const expectedAttacker = refreshBlendCoeffAtAge(age, "attacker");
  const maskShape = maskTasks.length === (view.mask.active ? 1 : 0)
    && (!view.mask.active || (
      (view.mask.eva === 0 || oracle.bg1.y === view.mask.scrollY)
      && oracle.registers.bldalpha
        === (prior.mask.evb << 8 | prior.mask.eva)
    ));
  const blendShape = bgCoef === expectedBg
    && attackerCoef === expectedAttacker;
  const starsExact = JSON.stringify(stars) === JSON.stringify(expectedStars);
  const ringExact = actualRing === expectedRing;
  if (starsExact && ringExact && maskShape && blendShape) {
    componentMatches += 1;
  } else {
    componentDiffs.push(
      `frame ${frame}/age ${age}: stars ${starsExact} (${stars}/${expectedStars})`
      + ` ring ${ringExact} (${actualRing}/${expectedRing})`
      + ` mask=${view.mask.active}/${maskTasks.length}`
      + ` blend bg=${bgCoef}vs${expectedBg} obj=${attackerCoef}vs${expectedAttacker}`,
    );
  }

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const app = render(engine);
  const rgb = readFileSync(
    join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
  );
  rawRgbHash.update(rgb);
  let count = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgba = pixel * 4, raw = pixel * 3;
    if (
      app[rgba] === rgb[raw]
      && app[rgba + 1] === rgb[raw + 1]
      && app[rgba + 2] === rgb[raw + 2]
    ) continue;
    count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (count === 0) framebufferMatches += 1;
  else {
    framebufferDiffs.push(`frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
    const appRgb = Buffer.alloc(240 * 160 * 3);
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      appRgb[pixel * 3] = app[pixel * 4]!;
      appRgb[pixel * 3 + 1] = app[pixel * 4 + 1]!;
      appRgb[pixel * 3 + 2] = app[pixel * 4 + 2]!;
    }
    writeFileSync(join(scratch, `app-${frame}.rgb`), appRgb);
  }
}
const total = fixture.denseWindow.endFrame
  - fixture.denseWindow.startFrame + 1;
const rawRgbSha256 = rawRgbHash.digest("hex");
const receiptMatches =
  evidenceSha256 === fixture.evidenceSha256
  && rawRgbSha256 === fixture.rawRgbSha256;
console.log(
  `${fixture.orientation} component ${componentMatches}/${total};`
  + ` framebuffer ${framebufferMatches}/${total};`
  + ` receipt ${receiptMatches ? "exact" : "mismatch"}`
  + ` (evidence ${evidenceSha256.slice(0, 8)}; RGB ${rawRgbSha256.slice(0, 8)})`,
);
if (componentMatches !== total || framebufferMatches !== total || !receiptMatches) {
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 12).join("\n"));
  if (framebufferDiffs.length) {
    console.error(`framebuffer: ${framebufferDiffs.slice(0, 8).join("; ")}`);
    console.error(`framebuffer tail: ${framebufferDiffs.slice(-8).join("; ")}`);
  }
  if (!receiptMatches) {
    console.error(`receipt evidence=${evidenceSha256} rawRgb=${rawRgbSha256}`);
  }
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
if (probe.frames.length !== REFRESH_FRAME_COUNT) {
  console.error(`unexpected REFRESH frame count ${probe.frames.length}`);
  process.exit(1);
}
