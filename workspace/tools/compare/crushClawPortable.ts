import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnCrushClawView,
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
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly visualTaskCount: number;
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
  readonly clawSlashTemplate: number;
  readonly lungeTemplate: number;
  readonly songHeaders: Readonly<Record<string, number>>;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-crush-claw-compare-");
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
    "306",
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
  move: "CRUSH_CLAW",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
} as never);
const playerToOpponent =
  (fixture.attacker as { geometry: { side: string } }).geometry.side === "player";
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const taskFuncs = probe.taskFuncs;
const razorWindHeader = probe.songHeaders.SE_M_RAZOR_WIND;

// The target rests at its own front-idle x2 until the ShakeMon2 displacement's
// first write displays; RAM-truth comparisons must apply the same idle hold.
const targetIdleX2 = playerToOpponent ? 1 : 0;

let componentMatches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferDiffLines: string[] = [];

for (const frame of probe.frames) {
  const age = frame.frame - fixture.denseWindow.startFrame
    + (fixture.appStage.presentationAge ?? 0);
  const oracle = frames.get(frame.frame)!;
  const view = sceneOnCrushClawView({ ...stage, age });

  const attacker = playerToOpponent ? oracle.playerSprite : oracle.opponentSprite;
  const target = playerToOpponent ? oracle.opponentSprite : oracle.playerSprite;

  // Lunge helper presence: the invisible gHorizontalLungeSpriteTemplate sprite
  // exists from the lunge's first translated frame through one frame after the
  // attacker x2 returns to zero (RAM ages 13..27).
  const lunges = oracle.moveSprites.filter((sprite) =>
    sprite.template === probe.lungeTemplate);
  const lungeShape = lunges.length === Number(age >= 13 && age <= 27);

  const attackerShape = attacker.x2 === view.attackerX2 && attacker.y2 === 0;

  // The target rests at its front-idle x2 (1px for the opponent-front ONIX)
  // until the shake's first step write (RAM age 19), then the shake x2 holds.
  const targetShape = target.x2 === (age < 19 ? targetIdleX2 : view.targetX2)
    && target.y2 === 0;

  // The two claw-slash pairs' sprite x/y/animation/cmdIndex must equal the
  // reducer's slash list exactly (subpriority 38 player / 28 opponent).
  const slashSprites = oracle.moveSprites.filter((sprite) =>
    sprite.template === probe.clawSlashTemplate);
  const slashKey = (sprite: ProbeSprite) =>
    `${sprite.x},${sprite.y},${sprite.animNum},${sprite.animCmdIndex}`;
  const ramSlashes = slashSprites.map(slashKey).sort();
  const viewSlashes = view.slashes.map((slash) =>
    `${slash.x},${slash.y},${slash.animation},${slash.animationFrame}`).sort();
  const slashShape = ramSlashes.length === viewSlashes.length
    && ramSlashes.every((key, index) => key === viewSlashes[index]);

  const shakeTasks = oracle.tasks.filter((task) =>
    task.func === taskFuncs.AnimTask_ShakeMon2
    || task.func === taskFuncs.AnimTask_ShakeMon2_Step);
  // The ShakeMon2 task exists RAM ages 19..52; xOffset is stored in data[4].
  const shakeShape = shakeTasks.length === Number(age >= 19 && age <= 52)
    && shakeTasks.every((task) => task.data[4] === 2 && task.data[5] === 0);

  // SE_M_RAZOR_WIND restarts at RAM ages 19 and 33; the song header must be
  // the razor-wind song on those frames.
  const soundShape = view.soundEvents.some((event) => event.age === age)
    ? oracle.se1.songHeader === razorWindHeader
    : true;

  // setalpha/BLDCNT 0x3f40 is RAM truth from the lunge's first step (age 13)
  // until the trailing blendoff (age 55); it never changes a pixel here.
  const blendShape = oracle.bldcnt === (view.blendOn ? 0x3f40 : 0x0)
    && oracle.bldalpha === (view.blendOn ? 0x080c : 0x0);

  if (
    lungeShape && attackerShape && targetShape && slashShape
    && shakeShape && soundShape && blendShape
  ) {
    componentMatches += 1;
  } else {
    componentMismatches.push(
      `frame ${frame.frame}/age ${age}: lunge=${lungeShape}`
      + ` att=${attackerShape} (${attacker.x2} vs ${view.attackerX2})`
      + ` tgt=${targetShape} (${target.x2} vs ${age < 19 ? targetIdleX2 : view.targetX2})`
      + ` slash=${slashShape}`
      + ` shake=${shakeShape} sound=${soundShape} blend=${blendShape}`
      + ` (bldcnt ${oracle.bldcnt} vs ${view.blendOn ? 0x3f40 : 0})`,
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
console.log(`CRUSH CLAW component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
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
