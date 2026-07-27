import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnEncoreView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { encoreTargetX2AtAge } from "../../src/animation/encore.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly windowSchedule: {
    readonly win1FirstAge: number;
    readonly win1LastAge: number;
    readonly objFirstAge: number;
    readonly objLastAge: number;
  };
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
  readonly template: number;
  readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number;
  readonly matrixNum: number;
  readonly data: readonly number[];
}
interface ProbeFrame {
  readonly frame: number;
  readonly registers: {
    readonly DISPCNT: number; readonly WIN1V: number;
    readonly WIN0H: number; readonly WIN1H: number;
    readonly WIN0V: number; readonly WIN1V: number;
    readonly WININ: number; readonly WINOUT: number;
    readonly BLDCNT: number; readonly BLDALPHA: number; readonly BLDY: number;
  };
  readonly battlerSprites: readonly ProbeSprite[];
  readonly effectSprites: readonly ProbeSprite[];
  readonly hardwareOam: string;
  readonly softwareOam: string;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-encore-compare-"));
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
    readonly gSpotlightSpriteTemplate: number;
    readonly gClappingHandSpriteTemplate: number;
    readonly gClappingHand2SpriteTemplate: number;
  };
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "ENCORE",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
let componentMatches = 0;
let framebufferMatches = 0;
let firstFramebufferDiff: string | null = null;
const sampledFramebufferDiffs: string[] = [];
const componentDiffs: string[] = [];

function hardwareAffineMatrix(
  hardwareOam: string,
  matrixNum: number,
): readonly [number, number, number, number] {
  const bytes = Buffer.from(hardwareOam, "hex");
  const s16 = (offset: number) => bytes.readInt16LE(offset);
  const base = matrixNum * 32;
  return [
    s16(base + 6), s16(base + 14),
    s16(base + 22), s16(base + 30),
  ];
}

function hardwareSpotlightOam(hardwareOam: string): {
  readonly centerX: number; readonly centerY: number;
  readonly matrixNum: number;
} | null {
  const bytes = Buffer.from(hardwareOam, "hex");
  for (let index = 0; index < 128; index += 1) {
    const offset = index * 8;
    const a0 = bytes.readUInt16LE(offset);
    const a1 = bytes.readUInt16LE(offset + 2);
    const affine = (a0 & 0x100) !== 0;
    const doubleSize = (a0 & 0x200) !== 0;
    const objWindow = ((a0 >>> 10) & 3) === 2;
    const square64 = ((a0 >>> 14) & 3) === 0
      && ((a1 >>> 14) & 3) === 3;
    if (!affine || !doubleSize || !objWindow || !square64) continue;
    const left = (a1 & 0x1ff) >= 256 ? (a1 & 0x1ff) - 512 : a1 & 0x1ff;
    const topByte = a0 & 0xff;
    const top = topByte >= 160 ? topByte - 256 : topByte;
    return {
      centerX: left + 64,
      centerY: top + 64,
      matrixNum: (a1 >>> 9) & 31,
    };
  }
  return null;
}

for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age = fixture.appStage.presentationAge
    + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnEncoreView(state);
  const displayedView = sceneOnEncoreView({ ...state, age: age - 1 });
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const hands = oracle.effectSprites.filter((sprite) =>
    sprite.template === probe.symbols.gClappingHandSpriteTemplate);
  const handWindows = oracle.effectSprites.filter((sprite) =>
    sprite.template === probe.symbols.gClappingHand2SpriteTemplate);
  const targetIndex = fixture.target.geometry.side === "player" ? 0 : 1;
  const handsMatch = hands.length === view.hands.length
    && handWindows.length === view.hands.length
    && hands.every((hand, index) => {
      const expected = view.hands[index]!;
      return hand.x === expected.centerX
        && hand.y === expected.centerY
        && hand.x2 === expected.x2
        && hand.y2 === 0
        && hand.data[0] === expected.remainingClaps
        && hand.matrixNum === (expected.hFlip ? 8 : 0);
    })
    && handWindows.every((hand, index) => {
      const expected = view.hands[index]!;
      return hand.x === expected.centerX
        && hand.y === expected.centerY
        && hand.x2 === expected.x2
        && hand.y2 === 0
        && hand.data[0] === expected.remainingClaps
        && hand.matrixNum === (expected.hFlip ? 8 : 0);
    });
  const spotlight = oracle.effectSprites.find((sprite) =>
    sprite.template === probe.symbols.gSpotlightSpriteTemplate);
  const spotlightExpected = age >= 42 && age <= 168;
  const hardwareSpotlight = hardwareSpotlightOam(oracle.hardwareOam);
  const spotlightMatrix = hardwareSpotlight === null
    ? null
    : hardwareAffineMatrix(
        oracle.hardwareOam,
        hardwareSpotlight.matrixNum,
      );
  const spotlightMatch = (spotlight !== undefined) === spotlightExpected
    && (!view.spotlight || (
      spotlight?.x === view.spotlight.centerX
      && spotlight.y === view.spotlight.centerY
      && spotlight.x2 === view.spotlight.x2
      && spotlight.y2 === 0
      && hardwareSpotlight?.centerX
        === (displayedView.spotlight?.centerX ?? view.spotlight.centerX)
          + (displayedView.spotlight?.x2 ?? view.spotlight.x2)
      && hardwareSpotlight.centerY === view.spotlight.centerY
      && spotlightMatrix?.[0] === view.spotlight.pa
      && spotlightMatrix[1] === view.spotlight.pb
      && spotlightMatrix[2] === view.spotlight.pc
      && spotlightMatrix[3] === view.spotlight.pd
    ));
  const registersMatch =
    oracle.registers.BLDY === view.bldy
    && oracle.registers.WIN0H === 0
    && oracle.registers.WIN0V === 0
    && oracle.registers.BLDALPHA === 0
    && Boolean(oracle.registers.DISPCNT & 0x4000)
      === (age >= fixture.windowSchedule.win1FirstAge
        && age <= fixture.windowSchedule.win1LastAge)
    && Boolean(oracle.registers.DISPCNT & 0x8000)
      === (age >= fixture.windowSchedule.objFirstAge
        && age <= fixture.windowSchedule.objLastAge);
  const swayMatch =
    oracle.battlerSprites[targetIndex]!.y2 === view.targetY2
    && oracle.battlerSprites[targetIndex]!.x2 === encoreTargetX2AtAge(
      age,
      view.attacker.geometry.side,
      view.target.geometry.side === "opponent" ? 1 : 0,
    );
  if (handsMatch && spotlightMatch && registersMatch && swayMatch) {
    componentMatches += 1;
  } else {
    componentDiffs.push(
      `frame ${frame}/age ${age}: hands=${handsMatch}`
      + ` spotlight=${spotlightMatch} regs=${registersMatch} sway=${swayMatch}`,
    );
  }

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const app = render(engine);
  const oracleRgb = readFileSync(
    join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
  );
  let exact = true;
  let count = 0;
  const samples: string[] = [];
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgb = pixel * 3, rgba = pixel * 4;
    if (
      app[rgba] === oracleRgb[rgb]
      && app[rgba + 1] === oracleRgb[rgb + 1]
      && app[rgba + 2] === oracleRgb[rgb + 2]
    ) continue;
    exact = false;
    count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    if (samples.length < 8) {
      samples.push(
        `${x},${y}: app=${app[rgba]},${app[rgba + 1]},${app[rgba + 2]}`
        + ` oracle=${oracleRgb[rgb]},${oracleRgb[rgb + 1]},${oracleRgb[rgb + 2]}`,
      );
    }
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (exact) framebufferMatches += 1;
  else if (firstFramebufferDiff === null) {
    firstFramebufferDiff =
      `first framebuffer diff at frame ${frame}/age ${age}: ${count}px`
      + ` bbox ${minX},${minY}-${maxX},${maxY}; ${samples.join("; ")}`;
  }
  if (!exact && [43, 44, 50, 60, 63, 64, 100, 149, 160, 167].includes(age)) {
    sampledFramebufferDiffs.push(`age ${age}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
  }
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `ENCORE component ${componentMatches}/${total};`
  + ` framebuffer ${framebufferMatches}/${total}`,
);
if (componentMatches !== total || framebufferMatches !== total) {
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  if (sampledFramebufferDiffs.length) console.error(sampledFramebufferDiffs.join("\n"));
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 20).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
