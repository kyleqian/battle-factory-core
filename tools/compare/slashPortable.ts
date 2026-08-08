import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnSlashView,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  SHAKE_START_AGE,
  SLICE_1_AGE,
} from "../../src/animation/slash.ts";
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
  readonly paletteFade: {
    readonly y: number;
    readonly active: boolean;
  };
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
const scratch = createScratchDir("pokebench-slash-compare-");
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
    "163",
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
  move: "SLASH",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
} as never);
const playerToOpponent =
  (fixture.attacker as { geometry: { side: string } }).geometry.side === "player";
// The target rests at its front-idle x2 (ONIX front x2=1) until ShakeMon2's
// first toggle at RAM age 10.
const targetIdleX2 = playerToOpponent ? 1 : 0;

let componentMatches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferDiffLines: string[] = [];

for (const frame of probe.frames) {
  const age = frame.frame - fixture.denseWindow.startFrame
    + (fixture.appStage.presentationAge ?? 0);
  const oracle = frame;
  const view = sceneOnSlashView({ ...stage, age });

  const attacker = playerToOpponent ? oracle.playerSprite : oracle.opponentSprite;
  const target = playerToOpponent ? oracle.opponentSprite : oracle.playerSprite;

  const attackerShape = attacker.x2 === 0 && attacker.y2 === 0;

  const targetShape = target.x2 === (age < SHAKE_START_AGE ? targetIdleX2 : view.targetX2)
    && target.y2 === 0;

  // The two slash slices: base position at the target's picture coordinates
  // (X_2 / Y_PIC) +/- 8, frame = animCmdIndex * 16 tiles into the sheet, and
  // the AnimFalseSwipeSlice_Step3 invisible blink teardown.
  const sliceSprites = oracle.moveSprites.filter((sprite) =>
    sprite.template === probe.templates.gSlashSliceSpriteTemplate);
  const sliceShape = sliceSprites.length === view.slices.length
    && view.slices.every((want) => sliceSprites.some((got) =>
      got.x === want.x
      && got.y === want.y
      && got.animCmdIndex * 16 === want.tileOffset
      && got.invisible === want.invisible));

  // The shake task exists for the whole shake span.
  const shakeTaskShape = age >= SHAKE_START_AGE && age < 44
    ? oracle.tasks.length === 1
    : true;

  const soundShape = view.soundEvents.some((event) => event.age === age)
    ? oracle.se1.songHeader === probe.songHeaders.SE_M_RAZOR_WIND
    : true;

  if (attackerShape && targetShape && sliceShape && shakeTaskShape && soundShape) {
    componentMatches += 1;
  } else {
    componentMismatches.push(
      `frame ${frame.frame}/age ${age}: att=${attackerShape}`
      + ` (${attacker.x2}/${attacker.y2})`
      + ` tgt=${targetShape} (x2 ${target.x2} vs ${age < SHAKE_START_AGE ? targetIdleX2 : view.targetX2})`
      + ` slices=${sliceShape} (${sliceSprites.length} vs ${view.slices.length})`
      + ` shakeTask=${shakeTaskShape} (${oracle.tasks.length})`
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
console.log(`SLASH component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
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
