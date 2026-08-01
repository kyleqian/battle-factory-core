import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnCalmMindView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string; readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
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
  readonly slot: number; readonly raw: string; readonly x: number; readonly y: number;
}
interface ProbeFrame {
  readonly frame: number;
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly battlerSprites: readonly ProbeSprite[];
  readonly rings: readonly ProbeSprite[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly hardwareOam: string;
}
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-calm-mind-compare-"));
const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
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
  readonly symbols: { readonly blend: readonly number[] };
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "CALM_MIND", attacker: fixture.attacker, target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const u16hex = (hex: string, byteOffset: number): number =>
  Number.parseInt(hex.slice(byteOffset * 2 + 2, byteOffset * 2 + 4)
    + hex.slice(byteOffset * 2, byteOffset * 2 + 2), 16);
const blendBlack = (color: number, coeff: number): number => {
  const channel = (value: number): number =>
    value + (((0 - value) * coeff) >> 4);
  return channel(color & 31)
    | (channel((color >>> 5) & 31) << 5)
    | (channel((color >>> 10) & 31) << 10);
};
let componentMatches = 0, framebufferMatches = 0;
const componentDiffs: string[] = [];
const framebufferDiffLines: string[] = [];
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge
    + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnCalmMindView(state);
  const displayed = sceneOnCalmMindView({ ...state, age: age - 1 });
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);

  const blendTask = oracle.tasks.find((task) =>
    probe.symbols.blend.includes(task.func));
  const expectedTaskY = age >= 4 && age <= 18
    ? age - 2
    : age >= 84 && age <= 98 ? 98 - age : null;
  const taskMatches = expectedTaskY === null
    ? !blendTask
    : blendTask?.data[10] === expectedTaskY;
  const attackerIndex = fixture.attacker.geometry.side === "player" ? 0 : 1;
  const targetIndex = 1 - attackerIndex;
  const attackerFlags = u16hex(oracle.battlerSprites[attackerIndex]!.raw, 0x3e) & 0xff;
  const targetFlags = u16hex(oracle.battlerSprites[targetIndex]!.raw, 0x3e) & 0xff;
  const invisibilityMatches =
    ((attackerFlags & 4) !== 0) === view.attackerOnMonBg
    && ((targetFlags & 4) !== 0) === view.nonAttackerInvisible;

  const expectedSlots = view.rings
    .map((ring) => ring.spawnIndex === 1 ? 4 : 3)
    .sort((a, b) => a - b);
  const ringSlots = oracle.rings.map((ring) => ring.slot).sort((a, b) => a - b);
  const ringSoftwareMatches = expectedSlots.length === ringSlots.length
    && expectedSlots.every((slot, index) => slot === ringSlots[index])
    && oracle.rings.every((ring) =>
      ring.x === fixture.attacker.geometry.animationCenter.x
      && ring.y === fixture.attacker.geometry.animationCenter.y);
  const hardwareOam = oracle.hardwareOam;
  const matrixDiagonal = (matrix: number): readonly [number, number] => [
    u16hex(hardwareOam, (matrix * 4) * 8 + 6),
    u16hex(hardwareOam, (matrix * 4 + 3) * 8 + 6),
  ];
  const ringHardwareMatches = displayed.rings.every((ring) => {
    for (let matrix = 0; matrix < 32; matrix += 1) {
      const diagonal = matrixDiagonal(matrix);
      if (diagonal[0] === ring.oamScale && diagonal[1] === ring.oamScale) {
        return true;
      }
    }
    return false;
  });
  const selectedPaletteIndices = [
    ...Array.from({ length: 48 }, (_, i) => 16 + i),
    ...Array.from({ length: 16 }, (_, i) => 256 + targetIndex * 16 + i),
  ];
  const displayedPaletteY = age >= 84
    ? view.paletteBlendY
    : displayed.paletteBlendY;
  const paletteMatches = selectedPaletteIndices.every((index) =>
    oracle.hardwarePalette[index]
      === blendBlack(oracle.unfadedPalette[index], displayedPaletteY))
    && Array.from({ length: 16 }, (_, i) => 256 + attackerIndex * 16 + i)
      .every((index) =>
        oracle.hardwarePalette[index] === oracle.unfadedPalette[index]);
  if (taskMatches && invisibilityMatches && ringSoftwareMatches
    && ringHardwareMatches && paletteMatches) {
    componentMatches += 1;
  } else {
    componentDiffs.push(
      `frame ${frame}/age ${age}: task=${taskMatches} invis=${invisibilityMatches}`
      + ` ringSoft=${ringSoftwareMatches} ringOam=${ringHardwareMatches}`
      + ` palette=${paletteMatches} y=${displayedPaletteY}`,
    );
  }

  const engine: EngineState = {
    ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state,
  };
  const app = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let exact = true, count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgb = pixel * 3, rgba = pixel * 4;
    if (app[rgba] === oracleRgb[rgb] && app[rgba + 1] === oracleRgb[rgb + 1]
      && app[rgba + 2] === oracleRgb[rgb + 2]) continue;
    exact = false; count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (exact) framebufferMatches += 1;
  else {
    framebufferDiffLines.push(
      `framebuffer diff at frame ${frame}: ${count}px`
      + ` bbox ${minX},${minY}-${maxX},${maxY}`,
    );
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`CALM MIND component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (componentMatches !== total || framebufferMatches !== total) {
  if (framebufferDiffLines.length) {
    console.error(framebufferDiffLines.slice(0, 32).join("\n"));
    if (framebufferDiffLines.length > 32) {
      console.error(`...and ${framebufferDiffLines.length - 32} more framebuffer diff frames`);
    }
  }
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 20).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
