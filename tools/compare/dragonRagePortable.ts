import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnDragonRageView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}

interface ProbeSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly animCmdIndex: number;
  readonly matrixA: number;
  readonly matrixB: number;
  readonly matrixC: number;
  readonly matrixD: number;
  readonly matrixNum: number;
  readonly invisible: boolean;
  readonly attr: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly attacker: ProbeSprite;
  readonly target: ProbeSprite;
  readonly fireSpitSprites: readonly ProbeSprite[];
  readonly firePlumeSprites: readonly ProbeSprite[];
  readonly animSoundTaskCount: number;
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly registers: { readonly dispcnt: number; readonly bldcnt: number; readonly bldalpha: number };
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly sha256: string;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(
  readFileSync(resolve(process.argv[2]!), "utf8"),
) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-dragonrage-compare-"));
const output = join(scratch, "probe.json");
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
    join(scratch, "rgb"),
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly songHeaders: { readonly dragonRage: number; readonly flameWheel2: number };
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "DRAGON_RAGE",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
let engine: EngineState = {
  ...createInitialState(),
  rngMode: "frontierBattle",
  sceneOnPresentation: {
    ...stage,
    age: fixture.appStage.firstFramePresentationAge,
  },
};

let componentMatching = 0;
let framebufferMatching = 0;
const framebufferMismatches: string[] = [];
const componentMismatches: string[] = [];

function plumeKey(p: { x: number; y: number; subpriority: number; sheetFrame: number }): string {
  return JSON.stringify({ x: p.x, y: p.y, subpriority: p.subpriority, sheetFrame: p.sheetFrame });
}

for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const record = frames.get(frame);
  if (!record) throw new Error(`probe omitted dense frame ${frame}`);
  const age =
    fixture.appStage.firstFramePresentationAge
    + frame - fixture.denseWindow.startFrame;
  const view = sceneOnDragonRageView({ ...stage, age });

  const appFireSpit = view.fireSpit
    ? JSON.stringify({
      x: view.fireSpit.x + view.fireSpit.x2,
      y: view.fireSpit.y + view.fireSpit.y2,
      frame: view.fireSpit.sheetFrame,
      matrix: view.fireSpit.matrix,
    })
    : null;
  const oracleFireSpit = record.fireSpitSprites[0]
    ? JSON.stringify({
      x: record.fireSpitSprites[0].x + record.fireSpitSprites[0].x2,
      y: record.fireSpitSprites[0].y + record.fireSpitSprites[0].y2,
      // `animCmdIndex` selects commands whose literal tile offsets are
      // 16/32/48, i.e. sheet row-blocks 1/2/3.
      frame: record.fireSpitSprites[0].animCmdIndex + 1,
      matrix: {
        pa: record.fireSpitSprites[0].matrixA,
        pb: record.fireSpitSprites[0].matrixB,
        pc: record.fireSpitSprites[0].matrixC,
        pd: record.fireSpitSprites[0].matrixD,
      },
    })
    : null;

  const appPlumes = view.firePlumes
    .map((p) => plumeKey({ x: p.x, y: p.y, subpriority: p.subpriority, sheetFrame: p.sheetFrame }))
    .sort();
  const oraclePlumes = record.firePlumeSprites
    .map((p) => plumeKey({ x: p.x, y: p.y, subpriority: p.subpriority, sheetFrame: p.animCmdIndex }))
    .sort();

  const app = JSON.stringify({
    attackerOffset: view.attackerOffset,
    targetOffset: view.targetOffset,
    fireSpit: appFireSpit,
    firePlumes: appPlumes,
  });
  const oracle = JSON.stringify({
    attackerOffset: {
      x2: record.attacker.x2,
      y2: record.attacker.y2,
    },
    targetOffset: {
      x2: record.target.x2,
      y2: record.target.y2,
    },
    fireSpit: oracleFireSpit,
    firePlumes: oraclePlumes,
  });
  const prior = frames.get(frame - 1);
  const priorSprites = prior
    ? [prior.attacker, prior.target, ...prior.fireSpitSprites, ...prior.firePlumeSprites]
      .filter((sprite) => !sprite.invisible)
    : [];
  const hardwareOam = priorSprites.every((sprite) =>
    record.hardwareOam.some((entry) => JSON.stringify(entry) === JSON.stringify(sprite.attr)));
  const hardwarePalettes = priorSprites.every((sprite) => {
    const bank = sprite.attr[2]! >>> 12;
    const start = 256 + bank * 16;
    return record.hardwarePalette.slice(start, start + 16).every(
      (color, offset) => color === prior!.fadedPalette[start + offset],
    );
  });
  const priorAffine = prior?.fireSpitSprites[0];
  const hardwareMatrix = !priorAffine || JSON.stringify(
    record.hardwareMatrices[priorAffine.matrixNum],
  ) === JSON.stringify([
    priorAffine.matrixA,
    priorAffine.matrixB,
    priorAffine.matrixC,
    priorAffine.matrixD,
  ]);
  const registers = record.registers.dispcnt === 0xbf40
    && record.registers.bldcnt === 0
    && record.registers.bldalpha === 0;
  const activeTracks = record.se1.tracks.filter((track) => track.flags !== 0);
  const expectedPan = record.se1.songHeader === probe.songHeaders.dragonRage
    ? (fixture.attacker.geometry.side === "player" ? -64 : 63)
    // `loopsewithpan` clamps the player's target-pan endpoint to -63,
    // while the one-shot attacker-pan command preserves -64.
    : (fixture.target.geometry.side === "player" ? -63 : 63);
  const sound = activeTracks.length === 0 || (
    (record.se1.songHeader === probe.songHeaders.dragonRage
      || record.se1.songHeader === probe.songHeaders.flameWheel2)
    && activeTracks.every((track) => track.panX === expectedPan)
  );
  if (app === oracle && hardwareOam && hardwarePalettes
    && hardwareMatrix && registers && sound) {
    componentMatching += 1;
  } else if (componentMismatches.length < 8) {
    componentMismatches.push(
      `${frame}: typed=${app === oracle} oam=${hardwareOam} `
      + `palette=${hardwarePalettes} matrix=${hardwareMatrix} `
      + `registers=${registers} sound=${sound} oracle=${oracle} app=${app}`,
    );
  }

  const oracleRgb = readFileSync(
    join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`),
  );
  if (createHash("sha256").update(oracleRgb).digest("hex") !== record.sha256) {
    throw new Error(`frame ${frame}: raw RGB digest mismatch`);
  }
  const rgba = render(engine);
  let framebufferExact = true;
  let framebufferDiff = 0;
  let minDiffX = 240;
  let minDiffY = 160;
  let maxDiffX = -1;
  let maxDiffY = -1;
  const diffSamples: string[] = [];
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      oracleRgb[pixel * 3] !== rgba[pixel * 4]
      || oracleRgb[pixel * 3 + 1] !== rgba[pixel * 4 + 1]
      || oracleRgb[pixel * 3 + 2] !== rgba[pixel * 4 + 2]
    ) {
      framebufferExact = false;
      framebufferDiff += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minDiffX = Math.min(minDiffX, x);
      minDiffY = Math.min(minDiffY, y);
      maxDiffX = Math.max(maxDiffX, x);
      maxDiffY = Math.max(maxDiffY, y);
      if (diffSamples.length < 4) {
        diffSamples.push(
          `${x},${y}:`
          + `${oracleRgb[pixel * 3]}/${oracleRgb[pixel * 3 + 1]}/${oracleRgb[pixel * 3 + 2]}`
          + `!=${rgba[pixel * 4]}/${rgba[pixel * 4 + 1]}/${rgba[pixel * 4 + 2]}`,
        );
      }
    }
  }
  if (framebufferExact) framebufferMatching += 1;
  else if (framebufferMismatches.length < 12) {
    framebufferMismatches.push(
      `${frame}:${framebufferDiff}px@${minDiffX},${minDiffY}-${maxDiffX},${maxDiffY}`
      + `[${diffSamples.join(";")}]`,
    );
  }

  engine = {
    ...engine,
    sceneOnPresentation: {
      ...engine.sceneOnPresentation!,
      age: engine.sceneOnPresentation!.age + 1,
    },
  };
}

const total =
  fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `${componentMatching}/${total} dense DRAGON_RAGE component/typed/hardware frames matched`,
);
console.log(`${framebufferMatching}/${total} dense DRAGON_RAGE framebuffer frames matched`);
if (componentMismatches.length) console.log(componentMismatches.join("\n"));
if (framebufferMismatches.length) {
  console.log(`first framebuffer mismatches: ${framebufferMismatches.join(", ")}`);
}
process.exit(
  componentMatching === total && framebufferMatching === total ? 0 : 1,
);
