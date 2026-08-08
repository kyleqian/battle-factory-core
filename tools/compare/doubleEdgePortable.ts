import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnDoubleEdgeView,
} from "../../src/animation/sceneOnPresentation.ts";
import { TARGET_SLIDE_FIRST_AGE } from "../../src/animation/doubleEdge.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly move: string;
  readonly orientation: "player-to-opponent" | "opponent-to-player";
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: unknown;
  readonly target: unknown;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: "partial" | "exact";
    readonly framebufferMatching?: number;
    readonly componentMatching?: number;
  };
}

interface ProbeSprite {
  readonly slot: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly template: number;
  readonly callback: number;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
  };
  readonly hardwareMatrix: {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
  };
  readonly animNum: number;
  readonly animCmdIndex: number;
  readonly invisible: boolean;
  readonly data: readonly number[];
}

interface ProbeTask {
  readonly slot: number;
  readonly func: number;
  readonly data: readonly number[];
}

interface ProbeBattler {
  readonly hp: number;
  readonly maxHp: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly sha256: string;
  readonly player: ProbeBattler;
  readonly opponent: ProbeBattler;
  readonly playerSprite: ProbeSprite;
  readonly opponentSprite: ProbeSprite;
  readonly sprites: readonly ProbeSprite[];
  readonly tasks: readonly ProbeTask[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly {
      readonly flags: number;
      readonly pan: number;
      readonly panX: number;
    }[];
  };
}

interface Probe {
  readonly schema: string;
  readonly frames: readonly ProbeFrame[];
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly templates: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-double-edge-compare-");
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
    "38",
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const bytes = readFileSync(output);
const probe = JSON.parse(bytes.toString("utf8")) as Probe;
const evidenceHash = createHash("sha256").update(bytes).digest("hex");
const rgbHash = createHash("sha256");
for (const frame of probe.frames) {
  rgbHash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
}
const errors: string[] = [];
if (probe.schema !== fixture.evidenceSchema) errors.push("probe schema drifted");
if (probe.frames.length !== fixture.denseWindow.frameCount) {
  errors.push(`frames ${probe.frames.length} != fixture ${fixture.denseWindow.frameCount}`);
}
if (evidenceHash !== fixture.evidenceSha256) errors.push(`evidence hash ${evidenceHash}`);
if (evidenceHash !== fixture.secondFreshEvidenceSha256) errors.push("second-fresh evidence pin differs");
const actualRgbHash = rgbHash.digest("hex");
if (actualRgbHash !== fixture.rawRgbSha256) errors.push(`RGB hash ${actualRgbHash}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`${probe.frames.length}/${fixture.denseWindow.frameCount} isolated move frames reproduced`);
console.log(`evidence ${evidenceHash}; RGB ${actualRgbHash}`);

const stage = createSceneOnMovePresentation({
  move: "DOUBLE_EDGE",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
} as never);
const playerToOpponent =
  (fixture.attacker as { geometry: { side: string } }).geometry.side === "player";
// The player-back target rests at its ONIX front-idle x2=1 for probe ages
// 0..69 (until the target push slide's first write); opponent-front has no
// hold (ONIX back rests at x2=0).
const targetIdleX2 = playerToOpponent ? 1 : 0;

let componentMatches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferDiffLines: string[] = [];

for (const frame of probe.frames) {
  const age = frame.frame - fixture.denseWindow.startFrame
    + (fixture.appStage.presentationAge ?? 0);
  const oracle = frame;
  const view = sceneOnDoubleEdgeView({ ...stage, age });

  const attacker = playerToOpponent ? oracle.playerSprite : oracle.opponentSprite;
  const target = playerToOpponent ? oracle.opponentSprite : oracle.playerSprite;

  const attackerShape = attacker.x2 === view.attackerOffset.x2
    && attacker.y2 === view.attackerOffset.y2;

  const targetShape = target.x2
      === (age < TARGET_SLIDE_FIRST_AGE ? targetIdleX2 : view.targetOffset.x2)
    && target.y2 === view.targetOffset.y2;

  // Both `AnimTask_RotateMonSpriteToSide` pairs write the battler sprite
  // matrices; the reducer's transforms must reproduce the RAM matrices
  // exactly for both battlers on every frame.
  const attackerTransform = view.attackerTransform;
  const targetTransform = view.targetTransform;
  const attackerMatrix = attackerTransform.active
    ? attacker.matrix.a === attackerTransform.matrix.a
      && attacker.matrix.b === attackerTransform.matrix.b
      && attacker.matrix.c === attackerTransform.matrix.c
      && attacker.matrix.d === attackerTransform.matrix.d
    : attacker.matrix.a === 256
      && attacker.matrix.b === 0
      && attacker.matrix.c === 0
      && attacker.matrix.d === 256;
  const targetMatrix = targetTransform.active
    ? target.matrix.a === targetTransform.matrix.a
      && target.matrix.b === targetTransform.matrix.b
      && target.matrix.c === targetTransform.matrix.c
      && target.matrix.d === targetTransform.matrix.d
    : target.matrix.a === 256
      && target.matrix.b === 0
      && target.matrix.c === 0
      && target.matrix.d === 256;

  const splats = oracle.sprites.filter((sprite) =>
    sprite.template === probe.templates.gBasicHitSplatSpriteTemplate);
  const hitsplatShape = splats.length === (view.hitsplat ? 1 : 0)
    && (view.hitsplat === null || splats.some((got) =>
      got.x === view.hitsplat!.x && got.y === view.hitsplat!.y));

  const slidesToOffset = oracle.sprites.filter((sprite) =>
    sprite.template === probe.templates.gSlideMonToOffsetSpriteTemplate);
  const slidesToOrigin = oracle.sprites.filter((sprite) =>
    sprite.template === probe.templates.gSlideMonToOriginalPosSpriteTemplate);
  const slideShape = slidesToOffset.length === view.slideToOffsetCount
    && slidesToOrigin.length === view.slideToOriginalCount;

  const rotateTasks = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_RotateMonSpriteToSide
    || task.func === probe.taskFuncs.AnimTask_RotateMonSpriteToSide_Step);
  const shakeTasks = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_ShakeMonInPlace
    || task.func === probe.taskFuncs.AnimTask_ShakeMonInPlace_Step);
  const ellipseTasks = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_TranslateMonEllipticalRespectSide
    || task.func === probe.taskFuncs.AnimTask_TranslateMonElliptical
    || task.func === probe.taskFuncs.AnimTask_TranslateMonElliptical_Step);
  const taskShape = rotateTasks.length === view.rotateTaskCount
    && shakeTasks.length === view.shakeTaskCount
    && (ellipseTasks.length > 0) === view.ellipseTaskActive;

  const soundShape = view.sound === "SE_M_SWIFT"
    ? oracle.se1.songHeader === probe.songHeaders.SE_M_SWIFT
    : view.sound === "SE_M_SWAGGER"
      ? oracle.se1.songHeader === probe.songHeaders.SE_M_SWAGGER
        || oracle.se1.songHeader === probe.songHeaders.SE_M_SWAGGER2
      : view.sound === "SE_M_MEGA_KICK2"
        ? oracle.se1.songHeader === probe.songHeaders.SE_M_MEGA_KICK2
        : true;

  if (
    attackerShape && targetShape && attackerMatrix && targetMatrix
    && hitsplatShape && slideShape && taskShape && soundShape
  ) {
    componentMatches += 1;
  } else {
    componentMismatches.push(
      `frame ${frame.frame}/age ${age}: att=${attackerShape}`
      + ` (${attacker.x2}/${attacker.y2} vs ${view.attackerOffset.x2}/${view.attackerOffset.y2})`
      + ` tgt=${targetShape} (x2 ${target.x2} vs ${age < TARGET_SLIDE_FIRST_AGE ? targetIdleX2 : view.targetOffset.x2}, y2 ${target.y2} vs ${view.targetOffset.y2})`
      + ` attM=${attackerMatrix} (${attacker.matrix.a},${attacker.matrix.b},${attacker.matrix.c},${attacker.matrix.d}`
      + ` vs ${attackerTransform.matrix.a},${attackerTransform.matrix.b},${attackerTransform.matrix.c},${attackerTransform.matrix.d})`
      + ` tgtM=${targetMatrix} (${target.matrix.a},${target.matrix.b},${target.matrix.c},${target.matrix.d}`
      + ` vs ${targetTransform.matrix.a},${targetTransform.matrix.b},${targetTransform.matrix.c},${targetTransform.matrix.d})`
      + ` hitsplat=${hitsplatShape} (${splats.length} vs ${view.hitsplat ? 1 : 0})`
      + ` slide=${slideShape} (${slidesToOffset.length}/${slidesToOrigin.length}`
      + ` vs ${view.slideToOffsetCount}/${view.slideToOriginalCount})`
      + ` task=${taskShape} (rot ${rotateTasks.length}/${view.rotateTaskCount}`
      + ` shake ${shakeTasks.length}/${view.shakeTaskCount}`
      + ` ellipse ${ellipseTasks.length})`
      + ` sound=${soundShape}`,
    );
  }

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const appRgba = render(engine);
  const oracleRgb = readFileSync(
    join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
  );
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
  if (exact) {
    framebufferMatches += 1;
  } else {
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
    framebufferDiffLines.push(`framebuffer diff at frame ${frame.frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
  }
}

const total = probe.frames.length;
console.log(`DOUBLE_EDGE component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (componentMismatches.length) console.error(componentMismatches.slice(0, 24).join("\n"));
if (framebufferDiffLines.length) console.error(framebufferDiffLines.slice(0, 24).join("\n"));
if (componentMatches !== total || framebufferMatches !== total) {
  console.error(`scratch: ${scratch}`);
  if (fixture.acceptance.status === "exact") process.exit(1);
  if (framebufferMatches !== (fixture.acceptance.framebufferMatching ?? -1)
    || componentMatches !== (fixture.acceptance.componentMatching ?? -1)) {
    console.error("staged counts drifted from the fixture's recorded partial state");
    process.exit(1);
  }
}
if (fixture.acceptance.status === "exact"
  && framebufferMatches !== fixture.denseWindow.frameCount) process.exit(1);
