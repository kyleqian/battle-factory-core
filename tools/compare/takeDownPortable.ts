import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnTakeDownView,
} from "../../src/animation/sceneOnPresentation.ts";
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
    /** Leading in-bounds probe frames dropped before the accepted window
     *  (the DETECT-class enemy-shadow teardown contaminates the opponent-front
     *  first frame 214). */
    readonly skipProbeFrames?: number;
    /** The reducer's move-relative age of the window's first frame (0 unless
     *  the window starts one frame later than the reducer's baseline). */
    readonly ageOffset?: number;
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

interface ProbeFrame {
  readonly frame: number;
  readonly sha256: string;
  readonly playerSprite: ProbeSprite;
  readonly opponentSprite: ProbeSprite;
  readonly tasks: readonly ProbeTask[];
  readonly moveSprites: readonly ProbeSprite[];
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
const scratch = createScratchDir("pokebench-take-down-compare-");
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
    "36",
    String(fixture.denseWindow.skipProbeFrames ?? 0),
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
  move: "TAKE_DOWN",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
} as never);
const playerToOpponent =
  (fixture.attacker as { geometry: { side: string } }).geometry.side === "player";
// The target rests at its own idle x2 until the SlideMonToOffset push's first
// write displays; RAM-truth comparisons must apply the same idle hold. The
// opponent-front ONIX rests at x2=1, the player-back ONIX at x2=0.
const targetIdleX2 = playerToOpponent ? 1 : 0;

let componentMatches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferDiffLines: string[] = [];

for (const frame of probe.frames) {
  const age = frame.frame - fixture.denseWindow.startFrame
    + (fixture.denseWindow.ageOffset ?? 0)
    + (fixture.appStage.presentationAge ?? 0);
  const oracle = frame;
  const view = sceneOnTakeDownView({ ...stage, age });

  const attacker = playerToOpponent ? oracle.playerSprite : oracle.opponentSprite;
  const target = playerToOpponent ? oracle.opponentSprite : oracle.playerSprite;

  const attackerShape = attacker.x2 === view.attackerX2 && attacker.y2 === view.attackerY2;

  const targetShape = target.x2 === (age < 47 ? targetIdleX2 : view.targetX2)
    && target.y2 === 0;

  // The basic hitsplat (gBasicHitSplatSpriteTemplate) exists RAM ages 44..52 at
  // the target center + the mirrored -10 x offset; animation is always 0.
  const splats = oracle.moveSprites.filter((sprite) =>
    sprite.template === probe.templates.gBasicHitSplatSpriteTemplate);
  const hitsplatShape = view.hitsplat === null
    ? splats.length === 0
    : splats.length === 1
      && splats[0]!.x === view.hitsplat.x
      && splats[0]!.y === view.hitsplat.y
      && splats[0]!.animNum === view.hitsplat.animation;

  // F_PAL_BG | F_PAL_BATTLERS darkens BG palettes 1-3 toward black at y=10
  // RAM ages 44..46; the first faded entry of BG palette 1 (index 16) is only
  // touched by that blend in this window.
  const blendShape = view.blendDarken
    === (oracle.fadedPalette[16] !== oracle.unfadedPalette[16]);

  // `monbg ANIM_DEF_PARTNER` keeps the target sprite OAM-invisible RAM ages
  // 4..92 (it rides BG1 instead); clearmonbg restores it at 93.
  const monbgShape = target.invisible === view.monbg;

  const shakeTasks = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_ShakeMonInPlace
    || task.func === probe.taskFuncs.AnimTask_ShakeMonInPlace_Step);
  const shakeShape = shakeTasks.length === Number(age >= 54 && age <= 74)
    && shakeTasks.every((task) => task.data[2] === 12 && task.data[4] === 1
      && task.data[5] === 8 && task.data[6] === 0);

  // SE_M_MEGA_KICK2 fires at RAM age 44 with the pan toward the target.
  const soundShape = view.soundEvents.some((event) => event.age === age)
    ? oracle.se1.songHeader === probe.songHeaders.SE_M_MEGA_KICK2
    : true;

  const slideOffsets = oracle.moveSprites.filter((sprite) =>
    sprite.template === probe.templates.gSlideMonToOffsetSpriteTemplate);
  const slideOriginals = oracle.moveSprites.filter((sprite) =>
    sprite.template === probe.templates.gSlideMonToOriginalPosSpriteTemplate);
  const slideShape = slideOffsets.length === view.slideToOffsetCount
    && slideOriginals.length === view.slideToOriginalCount;

  if (
    attackerShape && targetShape && hitsplatShape && blendShape
    && monbgShape && shakeShape && soundShape && slideShape
  ) {
    componentMatches += 1;
  } else {
    componentMismatches.push(
      `frame ${frame.frame}/age ${age}: att=${attackerShape}`
      + ` (${attacker.x2}/${attacker.y2} vs ${view.attackerX2}/${view.attackerY2})`
      + ` tgt=${targetShape} (${target.x2} vs ${age < 47 ? targetIdleX2 : view.targetX2})`
      + ` hitsplat=${hitsplatShape}`
      + ` blend=${blendShape} (view ${view.blendDarken})`
      + ` monbg=${monbgShape} (probe ${target.invisible})`
      + ` shake=${shakeShape} (tasks ${shakeTasks.length})`
      + ` sound=${soundShape} slide=${slideShape}`
      + ` (offset ${slideOffsets.length} vs ${view.slideToOffsetCount}`
      + ` orig ${slideOriginals.length} vs ${view.slideToOriginalCount})`,
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
console.log(`TAKE DOWN component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
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
