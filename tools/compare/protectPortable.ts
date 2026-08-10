import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import {
  createSceneOnMovePresentation, sceneOnProtectView,
  type SceneOnProtectConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture extends SceneOnProtectConfig {
  orientation: string; scenario: string; probe: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  sourceBounds: { start: string; endExclusive: string };
  probeJsonSha256: string; rawRgbSha256: string;
  changeMap: string; changeMapSha256: string;
}
interface Sprite {
  slot: number; x: number; y: number; x2: number; subpriority: number;
  attr: number[]; data: number[]; invisible: boolean;
  callback: { symbol: string | null };
}
interface Frame {
  frame: number; sha256: string;
  script: { active: boolean; pointer: number; inBounds: boolean };
  wallSprites: Sprite[]; battlers: Sprite[];
  visualTaskCount: number; soundTaskCount: number;
  registers: { bldcnt: number; bldalpha: number };
  hardwareOam: number[][]; hardwareMatrices: number[][];
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[];
  se1: { songHeader: number; tracks: { flags: number; panX: number }[] };
  battle: unknown;
}
interface Probe {
  schema: string; sourceBounds: { start: number; endExclusive: number };
  songHeader: number; frames: Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
if (args.length !== 2) throw new Error("usage: protectPortable.ts <player-fixture> <opponent-fixture>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const stable = (value: unknown) => {
  const battle = value as Record<string, Record<string, unknown>>;
  return Object.fromEntries(["player", "opponent"].map((side) => [side, {
    species: battle[side]!.species, hp: battle[side]!.hp, maxHp: battle[side]!.maxHp,
    item: battle[side]!.item, status1: battle[side]!.status1,
    status2: battle[side]!.status2, status3: battle[side]!.status3,
    statStages: battle[side]!.statStages,
  }]));
};
function diffFrame(app: Uint8ClampedArray, raw: Buffer): number {
  let diff = 0;
  for (let i = 0; i < 240 * 160; i++) if (
    app[i * 4] !== raw[i * 3] || app[i * 4 + 1] !== raw[i * 3 + 1]
    || app[i * 4 + 2] !== raw[i * 3 + 2]
  ) diff++;
  return diff;
}
const fresh = new Map<string, { probe: string; raw: string; map: string }>();
for (let runNumber = 1; runNumber <= 2; runNumber++) for (const path of args) {
  const fixture = JSON.parse(readFileSync(resolve(path!), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-protect-");
  const output = join(scratch, "probe.json");
  const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgb, "protect",
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const probeHash = createHash("sha256").update(bytes).digest("hex");
  if (probe.schema !== "protect-dense-evidence/v1" || probe.frames.length !== 123
    || probe.frames[0]!.frame !== fixture.sourceWindow.startFrame
    || probe.frames.at(-1)!.frame !== fixture.sourceWindow.endFrame
    || probe.sourceBounds.start !== Number.parseInt(fixture.sourceBounds.start, 16)
    || probe.sourceBounds.endExclusive !== Number.parseInt(fixture.sourceBounds.endExclusive, 16)
    || probeHash !== fixture.probeJsonSha256) throw new Error(`${fixture.orientation}: probe receipt drift`);
  const stage = createSceneOnMovePresentation<SceneOnProtectConfig>({
    move: "PROTECT", attacker: fixture.attacker, target: fixture.target,
    allocatorProfile: fixture.allocatorProfile, fieldProfile: fixture.fieldProfile,
  });
  const initialBattle = stable(probe.frames[0]!.battle);
  const rawHash = createHash("sha256");
  const failures: string[] = [];
  let component = 0, seam = 0, hardware = 0, framebuffer = 0;
  for (let i = 0; i < probe.frames.length; i++) {
    const row = probe.frames[i]!;
    const age = row.frame - fixture.sourceWindow.startFrame;
    const view = sceneOnProtectView({ ...stage, age });
    const sprite = row.wallSprites[0];
    const softwareSprite = view.sprite === null ? sprite === undefined : sprite !== undefined
      && sprite.slot === fixture.allocatorProfile.protect
      && sprite.callback.symbol === (view.sprite.callback === "step"
        ? "AnimProtect_Step" : "DestroyAnimSpriteAndDisableBlend")
      && sprite.x === view.sprite.x && sprite.y === view.sprite.y && sprite.x2 === view.sprite.x2
      && sprite.subpriority === view.sprite.subpriority
      && ((sprite.attr[2]! >> 10) & 3) === view.sprite.priority
      && sprite.data[0] === view.sprite.duration
      && sprite.data[5] === (age - 6) * 96
      && sprite.data[7] === view.sprite.alpha.evb
      && sprite.invisible === view.sprite.invisible;
    const alpha = view.sprite === null
      ? row.registers.bldcnt === 0 && row.registers.bldalpha === 0
      : row.registers.bldcnt === 16192
        && row.registers.bldalpha === view.sprite.alpha.eva + (view.sprite.alpha.evb << 8);
    let palette = true;
    if (view.sprite && sprite) {
      const original = row.unfadedPalette.slice(sprite.data[2] + 1, sprite.data[2] + 8);
      const steps = view.sprite.paletteRotationSteps % 7;
      const expected = [...original.slice(steps), ...original.slice(0, steps)];
      palette = same(row.fadedPalette.slice(sprite.data[2] + 1, sprite.data[2] + 8), expected);
    }
    const attackerIndex = fixture.attacker.geometry.side === "player" ? 0 : 1;
    const componentOk = softwareSprite && alpha && palette
      && row.battlers[attackerIndex]!.invisible === view.attackerBattlerHidden
      && row.battlers[1 - attackerIndex]!.invisible === false
      && row.visualTaskCount === row.wallSprites.length
      && row.soundTaskCount === Number(view.soundTaskActive)
      && row.script.inBounds && same(stable(row.battle), initialBattle);
    if (componentOk) component++;
    if (same(view, sceneOnProtectView({ ...stage, age }))) seam++;
    const priorSprite = probe.frames[i - 1]?.wallSprites[0];
    // BuildOamBuffer has already folded x2 into the software attr1 captured
    // by the probe; VBlank transfers that exact triplet one display later.
    const oam = !priorSprite || priorSprite.invisible || row.hardwareOam.some((entry) =>
      same(entry, priorSprite.attr));
    const transferredPalette = i === 0 || age <= 7
      || same(row.hardwarePalette, probe.frames[i - 1]!.fadedPalette);
    const shapes = row.hardwareOam.length === 128 && row.hardwareMatrices.length === 32
      && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512
      && row.hardwarePalette.length === 512;
    // waitplaysewithpan owns a 16-tick sound task at ages 7..22, then starts
    // SE_M_REFLECT on age 23 with the side-relative pan.
    const audio = age < 23 || row.se1.songHeader === probe.songHeader;
    const pan = age < 23 || row.se1.tracks.filter((track) => track.flags !== 0)
      .every((track) => track.panX === (fixture.attacker.geometry.side === "player" ? -64 : 63));
    const hardwareOk = oam && transferredPalette && shapes && audio && pan
      && (!sprite || row.paletteTags.includes(10280));
    if (hardwareOk) hardware++;
    const raw = readFileSync(join(rgb, `${String(row.frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== row.sha256) throw new Error("raw frame hash drift");
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age } as EngineState["sceneOnPresentation"] };
    const diff = diffFrame(render(engine), raw);
    if (diff === 0) framebuffer++;
    if (!componentOk || !hardwareOk || diff !== 0) {
      const message = `${row.frame}/age${age}: component=${componentOk} hardware=${hardwareOk} framebufferDiff=${diff}`;
      if (!componentOk) failures.unshift(message); else failures.push(message);
    }
  }
  const rawDigest = rawHash.digest("hex");
  const mapRun = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgb], { encoding: "utf8" });
  if (mapRun.status !== 0) throw new Error(`${fixture.orientation}: change-map generation failed`);
  const map = mapRun.stdout.replace(/^# .* —/, `# MOVE_PROTECT ${fixture.orientation} —`);
  const mapHash = createHash("sha256").update(map).digest("hex");
  if (rawDigest !== fixture.rawRgbSha256 || mapHash !== fixture.changeMapSha256
    || map !== readFileSync(resolve(root, fixture.changeMap), "utf8")) {
    throw new Error(`${fixture.orientation}: RGB/change-map drift`);
  }
  const receipt = { probe: probeHash, raw: rawDigest, map: mapHash };
  if (fresh.has(fixture.orientation) && !same(fresh.get(fixture.orientation), receipt)) {
    throw new Error(`${fixture.orientation}: fresh runs differ`);
  }
  fresh.set(fixture.orientation, receipt);
  console.log(`${fixture.orientation} run ${runNumber}: component ${component}/123; seam ${seam}/123; hardware ${hardware}/123; framebuffer ${framebuffer}/123; probe=${probeHash}; raw=${rawDigest}`);
  if (failures.length) throw new Error(failures.slice(0, 30).join("\n"));
}
