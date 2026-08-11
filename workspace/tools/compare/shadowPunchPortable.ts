import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnShadowPunchView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerSpriteId: number;
  readonly attackerMoveSpeed: number;
  readonly attackerSubpriority: number;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly opponentHp: number;
    readonly playerStatus: "none";
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
  readonly invisible: boolean;
  readonly subpriority: number;
  readonly matrix: readonly number[];
  readonly hardwareMatrix: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bldy: number;
  readonly attackerSlot: number;
  readonly attacker: ProbeSprite;
  readonly target: ProbeSprite;
  readonly traceSprites: readonly ProbeSprite[];
  readonly fistSprite: ProbeSprite | null;
  readonly hitsplatSprites: readonly ProbeSprite[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(
  readFileSync(resolve(process.argv[2]!), "utf8"),
) as Fixture;
const scratch = createScratchDir("pokebench-shadowpunch-compare-");
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
  readonly songHeaders: {
    readonly SE_M_COMET_PUNCH: number;
    readonly SE_M_JUMP_KICK: number;
  };
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "SHADOW_PUNCH",
  attacker: fixture.attacker,
  target: fixture.target,
  attackerSpriteId: fixture.attackerSpriteId,
  attackerMoveSpeed: fixture.attackerMoveSpeed,
  attackerSubpriority: fixture.attackerSubpriority,
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
let strengthenedMatching = 0;
let framebufferMatching = 0;
const framebufferMismatches: string[] = [];
const componentMismatches: string[] = [];

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
  const view = sceneOnShadowPunchView({ ...stage, age });

  const app = {
    attackerVisible: view.attackerVisible,
    attackerX2: view.attackerX2,
    clones: [...view.clones.map((c) => c.x2)].sort((a, b) => a - b),
    bldy: view.backgroundBldy,
    fist: view.fistVisible,
    hitsplat: view.hitsplatVisible,
    targetShakeX2: view.targetShakeX2,
  };
  const oracle = {
    attackerVisible: !record.attacker.invisible,
    attackerX2: record.attacker.x2,
    clones: record.traceSprites.map((s) => s.x2).sort((a, b) => a - b),
    bldy: record.bldy,
    fist: record.fistSprite !== null,
    hitsplat: record.hitsplatSprites.length > 0,
    targetShakeX2: record.target.x2,
  };
  const componentExact = JSON.stringify(app) === JSON.stringify(oracle);
  if (componentExact) componentMatching += 1;
  else if (componentMismatches.length < 12) {
    componentMismatches.push(`${frame}: oracle=${JSON.stringify(oracle)} app=${JSON.stringify(app)}`);
  }

  const alpha = age >= 41 && age <= 59;
  const fade = age <= 36 || (
    age >= 61
    && age <= (fixture.attacker.geometry.side === "player" ? 99 : 98)
  );
  const registersExact = alpha
    ? record.bldcnt === 16192 && record.bldalpha === 2057 && record.bldy === 0
    : fade
      ? record.bldcnt === 232 && record.bldalpha === 0
        && record.bldy === view.backgroundBldy
      : record.bldcnt === 0 && record.bldalpha === 0
        && record.bldy === view.backgroundBldy;
  const tracePaletteExact = !alpha || record.fadedPalette
    .slice(0x190, 0x1a0)
    .every((color, index) => {
      const source = record.unfadedPalette[0x190 + index]!;
      const r = ((source & 31) * 3) >> 4;
      const g = (((source >> 5) & 31) * 3) >> 4;
      const b = (((source >> 10) & 31) * 3) >> 4;
      return color === (r | (g << 5) | (b << 10));
    });
  const hardwarePaletteExact = !alpha || age === 41 || record.hardwarePalette
    .slice(0x170, 0x1a0)
    .every((color, index) => color === record.fadedPalette[0x170 + index]);
  const activeHardware = record.hardwareOam.filter(
    (oam) => (((oam[0] ?? 0) & 0x0300) !== 0x0200),
  );
  const cloneSource = sceneOnShadowPunchView({
    ...stage,
    age: age - (age < 50 ? 2 : 1),
  });
  const expectedCloneCount = (
    age === 50
      ? cloneSource.clones.filter((clone) => clone.creationAge !== 8)
      : cloneSource.clones
  ).length;
  const hardwareCloneCount = activeHardware.filter(
    (oam) => (((oam[2] ?? 0) >> 12) & 15) === 9,
  ).length;
  const hardwareFistCount = activeHardware.filter(
    (oam) => ((oam[2] ?? 0) & 1023) === 537,
  ).length;
  const hardwareHitsplatCount = activeHardware.filter(
    (oam) => ((oam[2] ?? 0) & 1023) === 305,
  ).length;
  const hardwareOamExact =
    hardwareCloneCount === expectedCloneCount
    && hardwareFistCount === Number(age >= 50 && age <= 58)
    && hardwareHitsplatCount === Number(age >= 50 && age <= 59);
  const spriteHardwareExact =
    (record.fistSprite === null || (
      record.fistSprite.x === fixture.target.geometry.animationCenter.x
      && record.fistSprite.y === fixture.target.geometry.animationCenter.y
      && record.fistSprite.subpriority === record.target.subpriority - 4
    ))
    && record.hitsplatSprites.every((sprite) =>
      sprite.x === fixture.target.geometry.animationCenter.x
      && sprite.y === fixture.target.geometry.animationCenter.y
      && sprite.subpriority === record.target.subpriority - 3
      && JSON.stringify(sprite.matrix) === "[303,0,0,303]"
      && (
        age === 49
          ? JSON.stringify(sprite.hardwareMatrix) === "[256,0,0,256]"
          : JSON.stringify(sprite.hardwareMatrix) === "[303,0,0,303]"
      ));
  const attackerPan = fixture.attacker.geometry.side === "player" ? -64 : 63;
  const targetPan = fixture.target.geometry.side === "player" ? -63 : 63;
  const audioExact =
    (age < 41 || age > 74)
    || (age <= 48
      ? record.se1.songHeader === probe.songHeaders.SE_M_JUMP_KICK
        && record.se1.tracks[0]?.panX === attackerPan
      : record.se1.songHeader === probe.songHeaders.SE_M_COMET_PUNCH
        && record.se1.tracks.slice(0, 2).every((track) => track.panX === targetPan));
  if (
    componentExact && registersExact && tracePaletteExact
    && hardwarePaletteExact && hardwareOamExact && spriteHardwareExact
    && audioExact
  ) strengthenedMatching += 1;
  else if (componentMismatches.length < 30) {
    componentMismatches.push(
      `${frame}: component=${componentExact} registers=${registersExact}`
      + ` tracePalette=${tracePaletteExact} hardwarePalette=${hardwarePaletteExact}`
      + ` hardwareOam=${hardwareOamExact}(${hardwareCloneCount}/${hardwareFistCount}/${hardwareHitsplatCount})`
      + ` spriteHardware=${spriteHardwareExact} audio=${audioExact}`,
    );
  }

  const oracleRgb = readFileSync(
    join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`),
  );
  const rgba = render(engine);
  let framebufferExact = true;
  let framebufferDiff = 0;
  let attackerRegionDiff = 0;
  let targetRegionDiff = 0;
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
      if (x < 128 && y < 128) attackerRegionDiff += 1;
      if (x >= 128 && y < 128) targetRegionDiff += 1;
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
  else if (framebufferMismatches.length < 30) {
    framebufferMismatches.push(
      `${frame}:${framebufferDiff}px@${minDiffX},${minDiffY}-${maxDiffX},${maxDiffY}`
      + `(attacker=${attackerRegionDiff},target=${targetRegionDiff})`
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
  `${componentMatching}/${total} dense SHADOW_PUNCH component frames matched`,
);
console.log(
  `${strengthenedMatching}/${total} dense SHADOW_PUNCH typed/hardware/audio frames matched`,
);
console.log(`${framebufferMatching}/${total} dense SHADOW_PUNCH framebuffer frames matched`);
if (componentMismatches.length) console.log(componentMismatches.join("\n"));
if (framebufferMismatches.length) {
  console.log(`first framebuffer mismatches: ${framebufferMismatches.join(", ")}`);
}
process.exit(
  componentMatching === total
    && strengthenedMatching === total
    && framebufferMatching === total ? 0 : 1,
);
