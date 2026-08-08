import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnIronTailView,
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
  readonly lungeTemplate: number;
  readonly hitsplatTemplate: number;
  readonly songHeaders: Readonly<Record<string, number>>;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-iron-tail-compare-");
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
    "231",
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
  move: "IRON_TAIL",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
} as never);
const playerToOpponent =
  (fixture.attacker as { geometry: { side: string } }).geometry.side === "player";
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const taskFuncs = probe.taskFuncs;

/** RAM-truth grayscale presence for the attacker's OBJ bank (displayed 7..126). */
function grayscaleOn(age: number): boolean {
  return age >= 7 && age <= 126;
}

let componentMatches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferDiffLines: string[] = [];

for (const frame of probe.frames) {
  const age = frame.frame - fixture.denseWindow.startFrame
    + (fixture.appStage.presentationAge ?? 0);
  const oracle = frames.get(frame.frame)!;
  const view = sceneOnIronTailView({ ...stage, age });

  const attacker = playerToOpponent ? oracle.playerSprite : oracle.opponentSprite;
  const target = playerToOpponent ? oracle.opponentSprite : oracle.playerSprite;
  const targetIdle = playerToOpponent ? 1 : 0;
  const attackerBank = (attacker.attr2 >> 12) & 15;
  const paletteStart = 256 + attackerBank * 16;
  const hwRow = oracle.hardwarePalette.slice(paletteStart, paletteStart + 16);
  const hwGray = hwRow.every((color) =>
    (color & 31) === ((color >> 5) & 31) && ((color >> 5) & 31) === ((color >> 10) & 31));

  const metallicTasks = oracle.tasks.filter((task) =>
    task.func === taskFuncs.AnimTask_MetallicShine
    || task.func === taskFuncs.AnimTask_MetallicShine_Step);
  const taskPresent = metallicTasks.length === 1;
  const metallicShape = taskPresent === (age >= 4 && age <= 102)
    && (!taskPresent || (
      metallicTasks[0]!.data[10] === view.metallic.data10
      && metallicTasks[0]!.data[11] === view.metallic.data11
      && metallicTasks[0]!.data[1] === (age >= 6 ? 1 : 0)
    ));

  const attackerShape = attacker.x2 === view.attackerX2 && attacker.y2 === 0;
  // The target rests at its front-idle x2 (1 for the opponent ONIX front, 0
  // for the player-back ONIX back) until the shake's first step write.
  const targetShape = target.x2 === (age < 115 ? targetIdle : view.targetX2);

  const hitsplats = oracle.moveSprites.filter((sprite) =>
    sprite.template === probe.hitsplatTemplate);
  const hitsplatShape = view.hitsplatVisible
    ? hitsplats.length === 1
      && hitsplats[0]!.matrix.a === 372
      && hitsplats[0]!.matrix.d === 372
      && hitsplats[0]!.subpriority === (playerToOpponent ? 38 : 28)
    : hitsplats.length === 0;

  const lunges = oracle.moveSprites.filter((sprite) =>
    sprite.template === probe.lungeTemplate);
  const lungeShape = lunges.length === Number(age >= 107 && age <= 117);

  const shakeTasks = oracle.tasks.filter((task) =>
    task.func === taskFuncs.AnimTask_ShakeMon
    || task.func === taskFuncs.AnimTask_ShakeMon_Step);
  const shakeShape = shakeTasks.length === Number(age >= 115 && age <= 124)
    && shakeTasks.every((task) => task.data[4] === 3 && task.data[5] === 0);

  const loopTasks = oracle.tasks.filter((task) => task.func === taskFuncs.Task_LoopAndPlaySE);
  const loopShape = loopTasks.length === Number(age >= 4 && age <= 33);

  const paletteShape = hwGray === grayscaleOn(age);

  if (
    metallicShape && attackerShape && targetShape && hitsplatShape
    && lungeShape && shakeShape && loopShape && paletteShape
  ) {
    componentMatches += 1;
  } else {
    componentMismatches.push(
      `frame ${frame.frame}/age ${age}: metal=${metallicShape}`
      + ` att=${attackerShape} tgt=${targetShape} hit=${hitsplatShape}`
      + ` lunge=${lungeShape} shake=${shakeShape} loop=${loopShape}`
      + ` palette=${paletteShape} (hwGray ${hwGray} vs ${grayscaleOn(age)})`,
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
console.log(`IRON TAIL component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
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
