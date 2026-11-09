import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { guillotineAtAge } from "../../src/animation/guillotine.ts";
import {
  createSceneOnMovePresentation,
  sceneOnGuillotineView,
  type SceneOnGuillotineConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Fixture = SceneOnGuillotineConfig & {
  readonly schema: "guillotine-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: "tools/compare/agilityProbe.py";
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: {
    readonly status: "exact";
    readonly reducerMatching: number;
    readonly typedSeamMatching: number;
    readonly componentMatching: number;
    readonly framebufferMatching: number;
    readonly freshRuns: 2;
  };
};

type Probe = {
  readonly schema: "guillotine-dense-evidence/v1";
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly sourceSymbols: { readonly Move_GUILLOTINE: number; readonly Move_PAY_DAY: number };
  readonly topology: { readonly tasks: readonly string[]; readonly templates: readonly string[]; readonly callbacks: readonly string[] };
  readonly frames: readonly any[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
const refresh = args[0] === "--refresh-maps";
const paths = refresh ? args.slice(1) : args;
if (paths.length !== 2) throw new Error("usage: guillotinePortable.ts [--refresh-maps] <player fixture> <opponent fixture>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const firstReceipts = new Map<string, readonly [string, string, string]>();

function normalizedChangeMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], { cwd: root, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`${fixture.orientation}: change-map generation failed`);
  const separator = run.stdout.indexOf(" — ");
  if (separator < 0) throw new Error(`${fixture.orientation}: change-map header changed`);
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function fresh(fixture: Fixture): { probe: Probe; rgbDir: string; scratch: string } {
  const scratch = createScratchDir(`pokebench-guillotine-${fixture.orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PYTHONPATH: join(vendor, "libmgba-py") },
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`fresh ${fixture.orientation} probe failed (${run.status})`);
  return { probe: JSON.parse(readFileSync(output, "utf8")) as Probe, rgbDir, scratch };
}

function framebufferDiff(app: Uint8Array, rgb: Buffer): number {
  let diff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1)
    if (app[pixel * 4] !== rgb[pixel * 3] || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1] || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) diff += 1;
  return diff;
}

function sprites(frame: any, symbol: string): any[] {
  return frame.sprites.filter((sprite: any) => sprite.template.symbol === symbol);
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Fixture;
  const { probe, rgbDir, scratch } = fresh(fixture);
  const total = fixture.sourceWindow.frameCount;
  const failures: string[] = [];
  if (fixture.schema !== "guillotine-portable-evidence/v1" || fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== "guillotine-dense-evidence/v1" || !same(probe.sourceWindow, fixture.sourceWindow)
    || probe.frames.length !== total || probe.sourceSymbols.Move_GUILLOTINE !== 0x082cb829
    || probe.sourceSymbols.Move_PAY_DAY !== 0x082cb8b5) failures.push("complete exclusive pointer window");
  for (const required of ["AnimTask_BlendSpriteColor_Step2", "AnimTask_ShakeMon2_Step", "Task_ClearMonBg", "Task_FadeToBg", "Task_UpdateMonBg"])
    if (!probe.topology.tasks.includes(required)) failures.push(`topology task ${required}`);
  for (const required of ["gGuillotineSpriteTemplate", "gBasicHitSplatSpriteTemplate", "gComplexPaletteBlendSpriteTemplate"])
    if (!probe.topology.templates.includes(required)) failures.push(`topology sprite ${required}`);

  const stage = createSceneOnMovePresentation({ ...fixture, move: "GUILLOTINE" as const });
  const first = probe.frames[0]!;
  let reducerMatching = 0, typedSeamMatching = 0, componentMatching = 0, framebufferMatching = 0;
  for (const [age, frame] of probe.frames.entries()) {
    const before = failures.length;
    const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (sha(rgb) !== frame.sha256) failures.push(`age ${age}: raw RGB receipt`);
    const expected = guillotineAtAge(age, fixture.target.geometry.side, fixture.target.geometry.animationCenter);
    const seam = sceneOnGuillotineView({ ...stage, age });
    const { attacker: _attacker, target: _target, ...seamState } = seam;
    if (same(expected, seamState)) { reducerMatching += 1; typedSeamMatching += 1; }
    else failures.push(`age ${age}: reducer/typed seam`);
    if (expected.active !== Boolean(frame.gAnimScriptActive)) failures.push(`age ${age}: cleanup`);
    if (age === 0 && (frame.script.address < 0x082cb829 || frame.script.address >= 0x082cb8b5)) failures.push("pointer entry");

    const pincers = sprites(frame, "gGuillotineSpriteTemplate");
    const pincerShape = pincers.map((sprite) => ({
      oamSlot: sprite.slot, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      tileOffset: (sprite.attr[2] & 0x3ff) - 305,
      hFlip: Boolean(sprite.attr[1] & 0x1000), vFlip: Boolean(sprite.attr[1] & 0x2000),
      phase: sprite.callback.symbol.endsWith("Step1") ? "close" : sprite.callback.symbol.endsWith("Step2") ? "hold" : "open",
    }));
    if (!same(pincerShape, expected.pincers)) failures.push(`age ${age}: AnimGuillotinePincer source`);
    const hits = sprites(frame, "gBasicHitSplatSpriteTemplate");
    if ((expected.hitsplat === null) !== (hits.length === 0)
      || hits.some((sprite) => sprite.slot !== 5 || sprite.x !== expected.hitsplat?.x || sprite.y !== expected.hitsplat?.y
        || !same(sprite.matrix, [256, 0, 0, 256]))) failures.push(`age ${age}: animation-0 basic hitsplat`);
    const target = frame.sprites.find((sprite: any) => sprite.slot === (fixture.target.geometry.side === "player" ? 6 : 8));
    const idleX2 = fixture.target.geometry.side === "opponent" && age < 60 ? 1 : 0;
    if (target.x2 !== idleX2 + expected.targetOffset.x2 || target.y2 !== 0)
      failures.push(`age ${age}: target monbg/ShakeMon2`);
    const taskNames = frame.tasks.map((task: any) => task.func.symbol);
    if ((age >= 60 && age <= 103 || age >= 108 && age <= 121) !== taskNames.includes("AnimTask_ShakeMon2_Step"))
      failures.push(`age ${age}: ShakeMon2 task lifetime`);
    const complex = sprites(frame, "gComplexPaletteBlendSpriteTemplate");
    if ((age >= 108 && age <= 115) !== (complex.length === 1)) failures.push(`age ${age}: complex palette sprite`);
    if (frame.registers.dispcnt !== first.registers.dispcnt || frame.softwareOam.length !== 128
      || frame.hardwareOam.length !== 128 || frame.softwareMatrices.length !== 32 || frame.hardwareMatrices.length !== 32
      || frame.fadedPalette.length !== 512 || frame.unfadedPalette.length !== 512 || frame.hardwarePalette.length !== 512)
      failures.push(`age ${age}: software/hardware shape`);
    const expectedBldcnt = age >= 10 && age <= 47 ? (age === 10 ? 0x3f40 : 0x00e8)
      : age >= 124 && age <= (fixture.target.geometry.side === "opponent" ? 162 : 161) ? 0x00e8 : 0;
    if (frame.registers.bldcnt !== expectedBldcnt || frame.registers.bldalpha !== (age >= 10 && age <= 122 ? 0x080c : 0)
      || frame.registers.bldy !== expected.background.bldy) failures.push(`age ${age}: blend/background registers`);
    for (const tag of [10138, 10135]) {
      const loaded = tag === 10138 ? expected.cutLoaded : expected.impactLoaded;
      if (frame.paletteTags.includes(tag) !== loaded || frame.tileTags.includes(tag) !== loaded) failures.push(`age ${age}: asset tag ${tag}`);
    }
    if (expected.sound) {
      const header = expected.sound === "SE_M_VICEGRIP" ? 0x088ff2e8 : 0x088fe984;
      const pan = fixture.target.geometry.side === "player" ? -63 : 63;
      if (frame.se1.songHeader !== header || !frame.se1.tracks.some((track: any) => (track.flags & 0x80) && track.panX === pan))
        failures.push(`age ${age}: ${expected.sound} audio`);
    }
    for (const side of ["player", "opponent"])
      for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3"])
        if (frame.battlers[side][key] !== first.battlers[side][key]) failures.push(`age ${age}: immutable ${side}.${key}`);
    if (failures.length === before) componentMatching += 1;
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const diff = framebufferDiff(render(engine), rgb);
    if (diff === 0) framebufferMatching += 1; else failures.push(`age ${age}: production framebuffer ${diff}`);
  }
  const allRaw = createHash("sha256");
  for (const file of readdirSync(rgbDir).sort()) allRaw.update(readFileSync(join(rgbDir, file)));
  const receipts = [sha(readFileSync(join(scratch, "probe.json"))), allRaw.digest("hex"), normalizedChangeMap(fixture, rgbDir)] as const;
  if (receipts[0] !== fixture.evidenceSha256 || receipts[1] !== fixture.rawRgbSha256) failures.push("evidence/raw receipt");
  if (refresh && runNumber === 1) writeFileSync(resolve(root, fixture.changeMap), receipts[2]);
  else if (refresh ? receipts[2] !== readFileSync(resolve(root, fixture.changeMap), "utf8")
    : sha(receipts[2]) !== fixture.changeMapSha256 || receipts[2] !== readFileSync(resolve(root, fixture.changeMap), "utf8")) failures.push("normalized change-map receipt");
  const runReceipt = [receipts[0], receipts[1], sha(receipts[2])] as const;
  if (runNumber === 1) firstReceipts.set(fixture.orientation, runReceipt);
  else if (!same(firstReceipts.get(fixture.orientation), runReceipt)) failures.push("twice-fresh byte stability");
  for (const [actual, pinned, label] of [[reducerMatching, fixture.acceptance.reducerMatching, "reducer"], [typedSeamMatching, fixture.acceptance.typedSeamMatching, "seam"], [componentMatching, fixture.acceptance.componentMatching, "component"], [framebufferMatching, fixture.acceptance.framebufferMatching, "framebuffer"]] as const)
    if (actual !== pinned || actual !== total) failures.push(`${label} ${actual}/${total}`);
  console.log(`${fixture.orientation} run ${runNumber}: reducer/seam/component/framebuffer ${reducerMatching}/${typedSeamMatching}/${componentMatching}/${framebufferMatching}/${total}; ${runReceipt.join("/")}`);
  if (failures.length) { console.error(failures.slice(0, 80).join("\n")); console.error(`scratch: ${scratch}`); process.exit(1); }
}

for (let run = 1; run <= 2; run += 1) for (const path of paths) verify(path, run);
