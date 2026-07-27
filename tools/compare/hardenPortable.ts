import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnHardenView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import hardenAsset from "../../src/animation/assets/harden.json" with { type: "json" };

interface Fixture {
  readonly scenario: string; readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerSpriteCenter: Readonly<{ x: number; y: number }>;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}
interface ProbeFrame {
  readonly frame: number; readonly bg1X: number; readonly bg1Y: number;
  readonly registers: Record<string, number>;
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly battlerSprites: readonly { readonly slot: number; readonly raw: string; readonly x: number; readonly y: number }[];
  readonly activeSprites: readonly { readonly slot: number; readonly raw: string; readonly x: number; readonly y: number }[];
  readonly hardwareOam: string;
  readonly hardwarePalette: readonly number[];
}
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-harden-compare-"));
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
  readonly symbols: { readonly metallic: readonly number[] };
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "HARDEN", attacker: fixture.attacker, target: fixture.target,
  fieldProfile: fixture.fieldProfile,
  attackerSpriteCenter: fixture.attackerSpriteCenter,
});
let componentMatches = 0, framebufferMatches = 0;
const componentDiffs: string[] = [];
let firstFramebufferDiff: string | null = null;
const metalPalette = (hardenAsset as { metal: { palette: readonly { r: number; g: number; b: number }[] } }).metal.palette;
const carrierPalette = fixture.attacker.geometry.side === "player"
  ? (hardenAsset as { relicanthBack: { palette: readonly { r: number; g: number; b: number }[] } }).relicanthBack.palette
  : (hardenAsset as { relicanthFront: { palette: readonly { r: number; g: number; b: number }[] } }).relicanthFront.palette;
const pack = (color: { r: number; g: number; b: number }): number =>
  (color.r >> 3) | ((color.g >> 3) << 5) | ((color.b >> 3) << 10);
const grayscale = (color: { r: number; g: number; b: number }): number => {
  const value = Math.floor(((color.r >> 3) + (color.g >> 3) + (color.b >> 3)) / 3);
  return value | (value << 5) | (value << 10);
};
const u16hex = (hex: string, byteOffset: number): number =>
  Number.parseInt(hex.slice(byteOffset * 2 + 2, byteOffset * 2 + 4)
    + hex.slice(byteOffset * 2, byteOffset * 2 + 2), 16);
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const windowAge = frame - fixture.denseWindow.startFrame;
  const age = fixture.appStage.presentationAge + windowAge;
  const state = { ...stage, age }, oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  // The interpreter initializer occupies two captures; ClearBattleAnimBg's
  // DMA wait occupies two more after sweep two.
  const sourceAge = windowAge < 2 ? 0
    : windowAge <= 65 ? windowAge - 1
      : windowAge <= 67 ? 64 : windowAge - 3;
  const view = sceneOnHardenView({ ...state, age: sourceAge });
  const task = oracle.tasks.find((candidate) =>
    probe.symbols.metallic.includes(candidate.func));
  const taskMatches = windowAge < 2
    ? !!task && task.data[10] === 0 && task.data[11] === 0
    : view.active
      ? !!task && task.data[10] === view.data10 && task.data[11] === view.data11
      : !task;
  const ramMatches = windowAge < 2
    ? oracle.bg1X === 0 && oracle.bg1Y === 0
    : oracle.bg1X === view.bg1X && oracle.bg1Y === view.bg1Y;
  const registersMatch = windowAge < 100
    ? oracle.registers.BLDCNT === 16194
      && oracle.registers.BLDALPHA === 3080
      && oracle.registers.WINOUT === 16189
      && (oracle.registers.DISPCNT & 0x8000) !== 0
    : oracle.registers.BLDCNT === 0
      && oracle.registers.BLDALPHA === 0
      && oracle.registers.WINOUT === 16191
      && (oracle.registers.DISPCNT & 0x8000) === 0;
  const attackerSprite = oracle.battlerSprites.find((sprite) =>
    sprite.x === fixture.attackerSpriteCenter.x
    && sprite.y === fixture.attackerSpriteCenter.y);
  const paletteNum = attackerSprite ? (u16hex(attackerSprite.raw, 4) >>> 12) & 15 : -1;
  const expectedCarrier = carrierPalette.map(
    windowAge >= 3 && windowAge <= 65 ? grayscale : pack,
  );
  const paletteMatches = paletteNum >= 0
    && expectedCarrier.every((value, index) =>
      oracle.hardwarePalette[256 + paletteNum * 16 + index] === value)
    && (windowAge >= 3
      ? metalPalette.every((color, index) =>
          oracle.hardwarePalette[128 + index] === pack(color))
      : true);
  const softwareMask = oracle.activeSprites.some((sprite) =>
    sprite.slot !== attackerSprite?.slot
    && sprite.x === fixture.attackerSpriteCenter.x
    && sprite.y === fixture.attackerSpriteCenter.y
    && ((u16hex(sprite.raw, 0) >>> 10) & 3) === 2);
  let hardwareMask = false;
  for (let slot = 0; slot < 128; slot += 1) {
    const offset = slot * 8;
    const attr0 = u16hex(oracle.hardwareOam, offset);
    const attr1 = u16hex(oracle.hardwareOam, offset + 2);
    if (((attr0 >>> 10) & 3) === 2
      && (attr1 & 511) === (fixture.attacker.geometry.spriteCorner.x & 511)
      && (attr0 & 255) === (fixture.attacker.geometry.spriteCorner.y & 255)) {
      hardwareMask = true; break;
    }
  }
  const maskMatches = softwareMask === (windowAge < 65)
    && (windowAge < 3
      ? !hardwareMask
      : windowAge <= 65 ? hardwareMask : true);
  if (taskMatches && ramMatches && registersMatch && paletteMatches && maskMatches) {
    componentMatches += 1;
  } else {
    componentDiffs.push(`frame ${frame}/age ${windowAge}: task=${taskMatches} ram=${ramMatches} regs=${registersMatch} palette=${paletteMatches} mask=${maskMatches}`);
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
  else if (firstFramebufferDiff === null) {
    firstFramebufferDiff = `first framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`HARDEN component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (componentMatches !== total || framebufferMatches !== total) {
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 10).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
