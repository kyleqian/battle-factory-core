import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnFissureView,
  type SceneOnFissureConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { fissureAtAge } from "../../src/animation/fissure.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Fixture = SceneOnFissureConfig & {
  schema: "fissure-portable-evidence/v1";
  oracleProfile: "battle-scene-on";
  orientation: "player-back" | "opponent-front";
  scenario: string; probe: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSha256: string; rawRgbSha256: string;
  changeMap: string; changeMapSha256: string;
};
type Probe = { schema: string; sourceWindow: Fixture["sourceWindow"]; frames: any[] };

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: fissurePortable.ts <player fixture> <opponent fixture>");
const allowPartial = process.env.POKEBENCH_ALLOW_PARTIAL === "1";
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const firstReceipts = new Map<string, string[]>();

function framebufferDiff(app: Uint8Array, rgb: Buffer): { count: number; bbox: string } {
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const a = pixel * 4, b = pixel * 3;
    if (app[a] === rgb[b] && app[a + 1] === rgb[b + 1] && app[a + 2] === rgb[b + 2]) continue;
    count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { count, bbox: count ? `${minX},${minY}-${maxX},${maxY}` : "none" };
}

function normalizedMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], { cwd: root, encoding: "utf8" });
  if (run.status !== 0) throw new Error("change map failed");
  const committedHeader = readFileSync(resolve(root, fixture.changeMap), "utf8").split("\n", 1)[0]!;
  return `${committedHeader}\n${run.stdout.slice(run.stdout.indexOf("\n") + 1)}`;
}

function fresh(fixture: Fixture) {
  const scratch = createScratchDir(`pokebench-fissure-${fixture.orientation}-`);
  const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8", env: { ...process.env, PYTHONPATH: join(vendor, "libmgba-py") } });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`fresh probe failed: ${run.status}`);
  return { scratch, output, rgbDir, probe: JSON.parse(readFileSync(output, "utf8")) as Probe };
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Fixture;
  const run = fresh(fixture), failures: string[] = [], residuals: string[] = [];
  const probe = run.probe, total = fixture.sourceWindow.frameCount;
  if (fixture.schema !== "fissure-portable-evidence/v1" || fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== "fissure-dense-evidence/v1" || !same(probe.sourceWindow, fixture.sourceWindow)
    || probe.frames.length !== total) failures.push("complete source window");
  const stage = createSceneOnMovePresentation({ ...fixture, move: "FISSURE" as const });
  let reducer = 0, seam = 0, components = 0, framebuffer = 0, latches = 0;
  for (const [age, frame] of probe.frames.entries()) {
    const before = failures.length;
    const expected = fissureAtAge(age, fixture.target.geometry.side,
      fixture.target.geometry.animationCenter, fixture.target.geometry.battlePositionCenter,
      fixture.initialTargetX2);
    const view = sceneOnFissureView({ ...stage, age });
    const { attacker: _a, target: _t, ...seamState } = view;
    if (same(expected, seamState)) { reducer += 1; seam += 1; }
    else failures.push(`age ${age}: reducer/seam`);
    if (expected.active !== Boolean(frame.gAnimScriptActive)) failures.push(`age ${age}: cleanup`);
    const dirt = frame.sprites.filter((sprite: any) => sprite.template.symbol === "gDirtPlumeSpriteTemplate")
      .map(({ slot, x, y, x2, y2 }: any) => ({ slot, x, y, x2, y2 }));
    if (!same(dirt, expected.dirt.map(({ slot, x, y, x2, y2 }) => ({ slot, x, y, x2, y2 }))))
      failures.push(`age ${age}: dirt`);
    const platform = frame.tasks.find((task: any) => task.func.symbol === "AnimTask_ShakePlatforms");
    const targetTask = frame.tasks.find((task: any) => task.func.symbol === "AnimTask_ShakeBattlers");
    if (age >= 4 && age <= 199) {
      for (const task of [platform, targetTask]) if (!task || !same(task.data.slice(0, 4), [expected.shake.taskState, expected.shake.delay, expected.shake.timer, 50])
        || !same(task.data.slice(14, 16), [expected.shake.horizontalOffset, 13])) failures.push(`age ${age}: shake task`);
    } else if (platform || targetTask) failures.push(`age ${age}: shake lifetime`);
    const targetSlot = fixture.target.geometry.side === "player" ? 6 : 8;
    const targetSprite = frame.sprites.find((sprite: any) => sprite.slot === targetSlot);
    if (!targetSprite || targetSprite.x2 !== expected.sourceTargetX2) failures.push(`age ${age}: target x2`);
    const complex = frame.sprites.filter((sprite: any) => sprite.template.symbol === "gComplexPaletteBlendSpriteTemplate");
    if (expected.palette.active !== (complex.length === 1)) failures.push(`age ${age}: palette task lifetime`);
    if (complex.length && !same(complex[0].data.slice(0, 8), [expected.palette.timer,
      expected.palette.color === "white" ? 259 : 3, expected.palette.remainingBlends,
      0, 14, 32767, 14, 1])) failures.push(`age ${age}: palette task`);
    if (frame.registers.bldcnt !== expected.bldcnt || frame.registers.bldy !== expected.bldy
      || frame.registers.bg3hofs !== (expected.bg3Scroll.x & 0x1ff)
      || frame.registers.bg3vofs !== (expected.bg3Scroll.y & 0xff)) failures.push(`age ${age}: registers`);
    if (age > 0 && same(frame.hardwareOam, probe.frames[age - 1].softwareOam)
      && same(frame.hardwareMatrices, probe.frames[age - 1].softwareMatrices)
      && same(frame.hardwarePalette, probe.frames[age - 1].fadedPalette)) latches += 1;
    if (expected.mudSandLoaded !== frame.tileTags.includes(10074)
      || expected.mudSandLoaded !== frame.paletteTags.includes(10074)) failures.push(`age ${age}: MUD_SAND tags`);
    for (const event of expected.soundEvents) {
      const player = event.song === "SE_M_DIG" ? frame.se1 : frame.se2;
      const header = event.song === "SE_M_DIG" ? 0x088ffd4c : 0x08902614;
      const pan = fixture.target.geometry.side === "player" ? -63 : 63;
      if (player.songHeader !== header || !player.tracks.some((track: any) => (track.flags & 0x80) && track.panX === pan))
        failures.push(`age ${age}: ${event.song} audio`);
    }
    if (failures.length === before) components += 1;
    const rgb = readFileSync(join(run.rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (sha(rgb) !== frame.sha256) failures.push(`age ${age}: raw RGB`);
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const diff = framebufferDiff(render(engine), rgb);
    if (diff.count === 0) framebuffer += 1;
    else if (residuals.length < 80) residuals.push(`age ${age}: ${diff.count}px bbox=${diff.bbox}`);
  }
  if (latches !== total - 1) failures.push(`latches ${latches}/${total - 1}`);
  const sourceRgb = join(run.scratch, "source-rgb");
  mkdirSync(sourceRgb);
  const allRaw = createHash("sha256");
  for (const [age, frame] of probe.frames.entries()) {
    const bytes = readFileSync(join(run.rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    allRaw.update(bytes);
    copyFileSync(join(run.rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
      join(sourceRgb, `${String(age).padStart(5, "0")}.rgb`));
  }
  const receipts = [sha(readFileSync(run.output)), allRaw.digest("hex"), sha(normalizedMap(fixture, sourceRgb))];
  if (receipts[0] !== fixture.evidenceSha256 || receipts[1] !== fixture.rawRgbSha256
    || receipts[2] !== fixture.changeMapSha256) failures.push("state/raw/change-map receipt");
  if (runNumber === 1) firstReceipts.set(fixture.orientation, receipts);
  else if (!same(firstReceipts.get(fixture.orientation), receipts)) failures.push("twice-fresh stability");
  console.log(`${fixture.orientation} run ${runNumber}: reducer/seam/component/latch/framebuffer ${reducer}/${seam}/${components}/${latches}/${framebuffer}/${total}; ${receipts.join("/")}`);
  if (residuals.length) console.error(residuals.join("\n"));
  if (failures.length || reducer !== total || seam !== total || components !== total || framebuffer !== total) {
    console.error(failures.slice(0, 80).join("\n"));
    console.error(`scratch: ${run.scratch}`);
    if (!allowPartial) process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) for (const path of paths) verify(path, run);
