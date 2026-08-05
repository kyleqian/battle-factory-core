import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnRockThrowView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import type { RockThrowAnimationProfile } from "../../src/animation/rockThrow.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: RockThrowAnimationProfile;
  readonly fieldProfile: SceneOnDragonRageFieldProfile;
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: "partial" | "exact"; readonly framebufferMatching?: number };
}

interface ProbeSprite {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
}

interface ProbeRock {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animNum: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly gAnimScriptActive: boolean;
  readonly scriptOffset: number | null;
  readonly playerSprite: ProbeSprite;
  readonly opponentSprite: ProbeSprite;
  readonly bg3Y: number;
  readonly rocks: readonly ProbeRock[];
  readonly battlers: unknown;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-rock-throw-compare-");
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync(
  "python3",
  [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const bytes = readFileSync(output);
const probe = JSON.parse(bytes.toString("utf8")) as {
  readonly schema: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly frames: readonly ProbeFrame[];
};
const evidenceHash = createHash("sha256").update(bytes).digest("hex");
const rgbHash = createHash("sha256");
for (const frame of probe.frames) {
  rgbHash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
}
const errors: string[] = [];
if (probe.schema !== fixture.evidenceSchema) errors.push("probe schema drifted");
if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) errors.push("source window drifted");
if (probe.frames.length !== fixture.denseWindow.frameCount) errors.push("dense frame count drifted");
if (evidenceHash !== fixture.evidenceSha256) errors.push(`evidence hash ${evidenceHash}`);
if (evidenceHash !== fixture.secondFreshEvidenceSha256) errors.push("second-fresh evidence pin differs");
const actualRgbHash = rgbHash.digest("hex");
if (actualRgbHash !== fixture.rawRgbSha256) errors.push(`RGB hash ${actualRgbHash}`);
if (!probe.frames[0]?.gAnimScriptActive || probe.frames.at(-1)?.gAnimScriptActive) errors.push("active/cleanup boundary drifted");
if (JSON.stringify(probe.frames[0]?.battlers) !== JSON.stringify(probe.frames.at(-1)?.battlers)) errors.push("gameplay fields changed inside animation body");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`${probe.frames.length}/${fixture.denseWindow.frameCount} dense semantic/RGB evidence frames reproduced`);
console.log(`evidence ${evidenceHash}; RGB ${actualRgbHash}`);

const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "ROCK_THROW",
  attacker: fixture.attacker,
  target: fixture.target,
  animationProfile: fixture.animationProfile,
  fieldProfile: fixture.fieldProfile,
});
let componentMatches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferDiffLines: string[] = [];

for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age =
    fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const view = sceneOnRockThrowView({ ...stage, age });
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const targetSprite = fixture.target.geometry.side === "player"
    ? oracle.playerSprite
    : oracle.opponentSprite;
  // The probe reads `gBattle_BG3_Y` (RAM); the rendered frame shows the
  // previous RAM tick's value (one-tick render lag, same as ROCK_SLIDE).
  const previous = frames.get(frame - 1);
  const displayedBg3Y = previous?.bg3Y ?? 0;
  // The target shake's y2 latches into OAM two frames behind its RAM write.
  const shakeRam = frames.get(frame - 2);
  const displayedTargetY2 = shakeRam
    ? (fixture.target.geometry.side === "opponent" ? shakeRam.opponentSprite.y2 : shakeRam.playerSprite.y2)
    : 0;
  // Falling rocks likewise render one RAM tick behind their probe record.
  const previousOracle = frames.get(frame - 1);
  const oracleRocks = (previousOracle?.rocks ?? [])
    .map((rock) => ({ centerX: rock.x + rock.x2, centerY: rock.y + rock.y2, animNum: rock.animNum }))
    .sort((a, b) => a.centerX - b.centerX || a.centerY - b.centerY);
  const viewRocks = [...view.rocks]
    .sort((a, b) => a.centerX - b.centerX || a.centerY - b.centerY);
  const rocksExact = viewRocks.length === oracleRocks.length
    && viewRocks.every((rock, i) =>
      rock.centerX === oracleRocks[i]!.centerX
      && rock.centerY === oracleRocks[i]!.centerY
      && rock.animNum === oracleRocks[i]!.animNum
    );
  const targetX2Exact = fixture.target.geometry.side === "opponent"
    ? view.targetX2 === targetSprite.x2
    : targetSprite.x2 === 0;
  const componentExact =
    view.bg3Y === displayedBg3Y
    && view.targetY2 === displayedTargetY2
    && targetX2Exact
    && rocksExact;
  if (componentExact) componentMatches += 1;
  else componentMismatches.push(`frame ${frame}/age ${age}: component (bg3Y ${view.bg3Y}vs${oracle.bg3Y}, y2 ${view.targetY2}vs${targetSprite.y2}, x2 ${view.targetX2}vs${targetSprite.x2}, rocks ${viewRocks.length}vs${oracleRocks.length})`);

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const appRgba = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let exact = true;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      appRgba[pixel * 4] !== oracleRgb[pixel * 3]
      || appRgba[pixel * 4 + 1] !== oracleRgb[pixel * 3 + 1]
      || appRgba[pixel * 4 + 2] !== oracleRgb[pixel * 3 + 2]
    ) {
      exact = false;
      break;
    }
  }
  if (exact) framebufferMatches += 1;
  else {
    let count = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (
        appRgba[pixel * 4] === oracleRgb[offset]
        && appRgba[pixel * 4 + 1] === oracleRgb[offset + 1]
        && appRgba[pixel * 4 + 2] === oracleRgb[offset + 2]
      ) continue;
      count += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    framebufferDiffLines.push(`framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
  }
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `ROCK_THROW component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`,
);
if (componentMatches !== total || framebufferMatches !== total) {
  console.error(componentMismatches.slice(0, 32).join("\n"));
  console.error(framebufferDiffLines.slice(0, 32).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
if (fixture.acceptance.status === "exact"
  && framebufferMatches !== fixture.denseWindow.frameCount) process.exit(1);
