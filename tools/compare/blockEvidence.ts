import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { blockAtAge } from "../../src/animation/block.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBlockView,
  type SceneOnBlockConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  schema: string;
  oracleProfile: string;
  scenario: string;
  probe: string;
  orientation: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSha256: string;
  rawRgbSha256: string;
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
  fieldProfile: SceneOnBlockConfig["fieldProfile"];
}
interface Sprite {
  slot: number; x: number; y: number; x2: number; y2: number;
  attr0: number; attr1: number; attr2: number; subpriority: number;
  invisible: boolean; data: number[];
  callback: { symbol: string | null };
}
interface Sound {
  songHeader: number;
  tracks: { flags: number; panX: number }[];
}
interface Frame {
  frame: number; gAnimScriptActive: boolean; scriptOffset: number;
  visualTaskCount: number; soundTaskCount: number;
  blockSprites: Sprite[]; battlers: Sprite[];
  hardwareOam: number[][]; hardwareMatrices: number[][];
  softwareOam: string[];
  fadedPalette: number[]; unfadedPalette: number[];
  hardwarePalette: number[]; paletteTags: number[]; tileTags: number[];
  se1: Sound; se2: Sound;
  registers: { dispcnt: number; bldcnt: number; bldalpha: number; bldy: number };
  battlerState: unknown;
}
interface Probe {
  schema: string; move: number;
  sourceWindow: Fixture["sourceWindow"];
  lifecycleCounts: { gBlockXSpriteTemplate: number };
  songHeaders: Record<"SE_M_SWAGGER" | "SE_M_SKETCH" | "SE_M_LEER", number>;
  frames: Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) {
  throw new Error("usage: blockEvidence.ts <player-fixture> <opponent-fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const evidenceDigests = new Map<string, string>();
const rawDigests = new Map<string, string>();

function framebufferDiff(app: Uint8ClampedArray, raw: Buffer): number {
  let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      app[pixel * 4] !== raw[pixel * 3]
      || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
    ) count += 1;
  }
  return count;
}
function u16(bytes: number[], offset: number): number {
  return bytes[offset]! | bytes[offset + 1]! << 8;
}
function containsOam(hardware: number[][], sprite: Sprite): boolean {
  return hardware.some((entry) =>
    u16(entry, 0) === sprite.attr0
    && u16(entry, 2) === sprite.attr1
    && u16(entry, 4) === sprite.attr2
  );
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  if (
    fixture.schema !== "block-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
  ) throw new Error(`${fixture.orientation}: invalid fixture`);
  const scratch = createScratchDir("pokebench-block-evidence-");
  const output = join(scratch, "probe.json");
  const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgb,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  if (
    probe.schema !== "block-dense-evidence/v1"
    || probe.move !== 335
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || probe.lifecycleCounts.gBlockXSpriteTemplate !== 1
  ) throw new Error(`${fixture.orientation}: unexpected probe contract`);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== fixture.evidenceSha256) {
    throw new Error(`${fixture.orientation}: evidence digest ${digest}`);
  }
  if (
    evidenceDigests.has(fixture.orientation)
    && evidenceDigests.get(fixture.orientation) !== digest
  ) throw new Error(`${fixture.orientation}: fresh evidence changed`);
  evidenceDigests.set(fixture.orientation, digest);

  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const config: SceneOnBlockConfig = {
    move: "BLOCK",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  };
  const stage = createSceneOnMovePresentation(config);
  const initialState = probe.frames[0]!.battlerState;
  const initialRegisters = probe.frames[0]!.registers;
  const pan = fixture.target.geometry.side === "player" ? -63 : 63;
  const rawHash = createHash("sha256");
  const errors: string[] = [];
  let matched = 0;
  let framebufferMatched = 0;

  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`${fixture.orientation}: missing ${frame}`);
    const expected = blockAtAge(
      age, fixture.target.geometry.side,
      fixture.target.geometry.animationCenter,
    );
    const view = sceneOnBlockView({ ...stage, age });
    const sprite = actual.blockSprites[0];
    const spriteOk = expected.xSign === null
      ? actual.blockSprites.length === 0
      : actual.blockSprites.length === 1
        && sprite?.x === expected.xSign.x
        && sprite.y === expected.xSign.y
        && sprite.x2 === 0
        && sprite.y2 === expected.xSign.y2
        && sprite.data[0] === expected.xSign.data0
        && sprite.data[1] === expected.xSign.data1
        && sprite.data[2] === expected.xSign.data2
        && sprite.invisible === expected.xSign.invisible
        && sprite.callback.symbol === expected.xSign.callback;
    const prior = frames.get(frame - 1);
    const hardwareOam = prior === undefined
      || prior.blockSprites.every((item) =>
        item.invisible
          ? !containsOam(actual.hardwareOam, item)
          : containsOam(actual.hardwareOam, item)
      );
    const paletteLatch = prior === undefined
      || same(actual.hardwarePalette, prior.fadedPalette);
    const tagLoaded = actual.paletteTags.includes(10250);
    const sound = expected.sound === null || (
      actual.se1.songHeader === probe.songHeaders[expected.sound]
      && actual.se1.tracks[0]?.panX === pan
      && actual.se2.songHeader !== probe.songHeaders[expected.sound]
    );
    const shapes =
      actual.hardwareOam.length === 128
      && actual.hardwareMatrices.length === 32
      && actual.hardwareMatrices.every((matrix) => matrix.length === 4)
      && actual.softwareOam.length === 128
      && actual.fadedPalette.length === 512
      && actual.unfadedPalette.length === 512
      && actual.hardwarePalette.length === 512
      && actual.paletteTags.length === 16
      && actual.tileTags.length === 128;
    const raw = readFileSync(join(rgb, `${String(frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = framebufferDiff(render(engine), raw);
    if (diff === 0) framebufferMatched += 1;
    const ok =
      spriteOk
      && same(view.xSign, expected.xSign)
      && view.active === expected.active
      && view.xSignLoaded === expected.xSignLoaded
      && actual.gAnimScriptActive === expected.active
      && actual.scriptOffset === expected.scriptOffset
      && actual.visualTaskCount === (expected.xSign ? 1 : 0)
      && tagLoaded === expected.xSignLoaded
      && hardwareOam && paletteLatch && sound && shapes
      && same(actual.registers, initialRegisters)
      && same(actual.battlerState, initialState)
      && diff === 0;
    if (ok) matched += 1;
    else errors.push(`${frame}/age${age}: framebuffer=${diff}`);
  }
  const rawDigest = rawHash.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    throw new Error(`${fixture.orientation}: raw digest ${rawDigest}`);
  }
  if (
    rawDigests.has(fixture.orientation)
    && rawDigests.get(fixture.orientation) !== rawDigest
  ) throw new Error(`${fixture.orientation}: fresh RGB changed`);
  rawDigests.set(fixture.orientation, rawDigest);
  if (
    matched !== fixture.sourceWindow.frameCount
    || framebufferMatched !== fixture.sourceWindow.frameCount
  ) throw new Error(`${fixture.orientation}: ${matched}/${fixture.sourceWindow.frameCount}\n${errors.slice(0, 12).join("\n")}`);
  console.log(
    `${fixture.orientation} run ${runNumber}: ${matched}/${matched} source/component/typed-seam/OAM/matrix/palette/register/audio/state/raw-RGB/framebuffer`,
  );
}

for (let run = 1; run <= 2; run += 1) {
  for (const path of paths) verify(path!, run);
}
