import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import substituteAsset from "../../src/animation/assets/substitute.json" with { type: "json" };
import { substituteAtAge } from "../../src/animation/substitute.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSubstituteView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  scenario: string; probe: string; orientation: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  probeJsonSha256: string; rawRgbSha256: string;
  changeMap: string; changeMapSha256: string;
}
interface Sprite {
  attr0: number; attr1: number; attr2: number; matrixNum: number;
  x2: number; y2: number; invisible: boolean;
  matrix: { a: number; b: number; c: number; d: number };
}
interface Audio { songHeader: number; rawInfo: string; tracks: readonly { flags: number; panX: number; raw: string }[]; }
interface Frame {
  frame: number; attacker: number; gAnimScriptActive: number;
  visualTaskCount: number; attackerSprite: Sprite;
  hardwareOam: readonly string[];
  hardwareMatrices: readonly { a: number; b: number; c: number; d: number }[];
  fadedPalette: readonly number[]; unfadedPalette: readonly number[];
  hardwarePalette: readonly number[]; paletteTags: readonly number[];
  se1: Audio; se2: Audio;
}
interface Probe {
  schema: string;
  sourceBounds: { start: number; endExclusive: number };
  sourceWindow: Fixture["sourceWindow"];
  songHeaders: Readonly<Record<"SE_M_ATTRACT" | "SE_M_BUBBLE2", number>>;
  frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
if (args.length !== 2) {
  throw new Error("usage: substitutePortable.ts <player-fixture> <opponent-fixture>");
}
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const hex16 = (value: number) =>
  `${(value & 0xff).toString(16).padStart(2, "0")}${(value >>> 8).toString(16).padStart(2, "0")}`;
const gbaPalette = substituteAsset.palette.map(({ r, g, b }) =>
  (r >> 3) | (g >> 3) << 5 | (b >> 3) << 10
);

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixturePath of args) {
    const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
    const scratch = createScratchDir("pokebench-substitute-evidence-");
    const output = join(scratch, "probe.json");
    const rgb = join(scratch, "rgb");
    const sourceRgb = join(scratch, "source-rgb");
    const run = spawnSync("python3", [
      join(root, "tools/run-mgba-probe.py"), output, "--",
      join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
      resolve(root, fixture.scenario), output, rgb,
    ], { cwd: root, encoding: "utf8" });
    if (run.stdout) process.stdout.write(run.stdout);
    if (run.stderr) process.stderr.write(run.stderr);
    if (run.status !== 0) process.exit(run.status ?? 1);

    const bytes = readFileSync(output);
    const probe = JSON.parse(bytes.toString()) as Probe;
    if (probe.schema !== "substitute-dense-evidence/v1"
      || probe.sourceBounds.start !== 0x082d5807
      || probe.sourceBounds.endExclusive !== 0x082d5813) {
      throw new Error(`${fixture.orientation}: source identity changed`);
    }
    if (!same(probe.sourceWindow, fixture.sourceWindow)) {
      throw new Error(`${fixture.orientation}: source window changed`);
    }
    const source = probe.frames.filter((frame) =>
      frame.frame >= probe.sourceWindow.startFrame
      && frame.frame <= probe.sourceWindow.endFrame
    );
    if (source.length !== 87
      || source.some((frame, index) =>
        frame.frame !== probe.sourceWindow.startFrame + index)) {
      throw new Error(`${fixture.orientation}: source interval is not dense`);
    }

    const playerAttacks = fixture.orientation.startsWith("player");
    const stage = createSceneOnMovePresentation({
      move: "SUBSTITUTE",
      attacker: {
        species: "GOLEM",
        geometry: playerAttacks
          ? { side: "player" as const, spriteCorner: { x: 40, y: 64 }, animationCenter: { x: 72, y: 96 }, battlePositionCenter: { x: 72, y: 80 } }
          : { side: "opponent" as const, spriteCorner: { x: 144, y: 13 }, animationCenter: { x: 176, y: 45 }, battlePositionCenter: { x: 176, y: 40 } },
      },
      target: {
        species: "ONIX",
        geometry: playerAttacks
          ? { side: "opponent" as const, spriteCorner: { x: 145, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
          : { side: "player" as const, spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } },
      },
      fieldProfile: playerAttacks
        ? { playerHp: 184, playerMaxHp: 187, opponentHp: 142, opponentMaxHp: 142, playerGender: "male" as const, opponentGender: "male" as const }
        : { playerHp: 142, playerMaxHp: 142, opponentHp: 187, opponentMaxHp: 187, playerGender: "male" as const, opponentGender: "male" as const },
    });
    const frameMap = new Map(source.map((frame) => [frame.frame, frame]));
    let componentMatched = 0;
    let seamMatched = 0;
    let hardwareMatched = 0;
    let framebufferMatched = 0;
    const mismatches: string[] = [];

    for (const frame of source) {
      const age = frame.frame - probe.sourceWindow.startFrame;
      const expected = substituteAtAge(age, playerAttacks ? "player" : "opponent");
      const component = frame.attackerSprite.x2 === expected.sprite.x2
        && frame.attackerSprite.y2 === expected.sprite.y2
        && frame.attackerSprite.invisible === expected.sprite.invisible
        && same(frame.attackerSprite.matrix, expected.sprite.matrix)
        && Boolean(frame.visualTaskCount) === expected.taskActive
        && Boolean(frame.gAnimScriptActive) === expected.active;
      if (component) componentMatched += 1;
      const seam = sceneOnSubstituteView({ ...stage, age });
      const seamExact = same(seam.sprite, expected.sprite)
        && same(seam.sound, expected.sound)
        && seam.taskActive === expected.taskActive
        && seam.active === expected.active;
      if (seamExact) seamMatched += 1;

      const complete = frame.hardwareOam.length === 128
        && frame.hardwareMatrices.length === 32
        && frame.fadedPalette.length === 512
        && frame.unfadedPalette.length === 512
        && frame.hardwarePalette.length === 512
        && frame.paletteTags.length === 16
        && frame.se1.tracks.length === 3 && frame.se2.tracks.length === 3
        && Boolean(frame.se1.rawInfo) && Boolean(frame.se2.rawInfo);
      const matrixExpected = substituteAtAge(age - 2, playerAttacks ? "player" : "opponent").sprite.matrix;
      const matrixExact = same(frame.hardwareMatrices[frame.attackerSprite.matrixNum], matrixExpected);
      const paletteOffset = 256 + frame.attacker * 16;
      const softwarePaletteExact = age < 10
        || same(frame.unfadedPalette.slice(paletteOffset, paletteOffset + 16), gbaPalette);
      const hardwarePaletteExact = age < 11
        || same(frame.hardwarePalette.slice(paletteOffset, paletteOffset + 16), gbaPalette);
      const prior = frameMap.get(frame.frame - 1);
      const oamExact = age === 0 || (age >= 9 && age <= 12) || prior === undefined
        || frame.hardwareOam.some((item) => item.startsWith(
          hex16(prior.attackerSprite.attr0)
          + hex16(prior.attackerSprite.attr1)
          + hex16(prior.attackerSprite.attr2),
        ));
      const hardware = complete && matrixExact && softwarePaletteExact
        && hardwarePaletteExact && oamExact;
      if (hardware) hardwareMatched += 1;

      const launchedSound = age === 1
        ? substituteAtAge(0, playerAttacks ? "player" : "opponent").sound
        : age === 42 || age === 67 ? expected.sound : null;
      const sound = launchedSound === null
        || (frame.se1.songHeader === probe.songHeaders[launchedSound.id]
          && frame.se1.tracks[0]?.panX === launchedSound.pan);
      const engine: EngineState = {
        ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age },
      };
      const app = render(engine);
      const oracleRgb = readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`));
      let diff = 0;
      const samples: string[] = [];
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        if (app[pixel * 4] === oracleRgb[pixel * 3]
          && app[pixel * 4 + 1] === oracleRgb[pixel * 3 + 1]
          && app[pixel * 4 + 2] === oracleRgb[pixel * 3 + 2]) continue;
        diff += 1;
        if (samples.length < 4) samples.push(`${pixel % 240},${Math.floor(pixel / 240)}`);
      }
      if (diff === 0) framebufferMatched += 1;
      if (!component || !seamExact || !hardware || !sound || diff !== 0) {
        mismatches.push(`frame ${frame.frame}/age ${age}: component=${component} seam=${seamExact} hardware=${hardware} sound=${sound} framebuffer=${diff === 0} diff=${diff} samples=${samples.join(",")}`);
      }
    }
    console.log(`${fixture.orientation} run ${runNumber}: component ${componentMatched}/87; seam ${seamMatched}/87; hardware ${hardwareMatched}/87; framebuffer ${framebufferMatched}/87`);
    if (mismatches.length) {
      console.error(mismatches.slice(0, 90).join("\n"));
      console.error(`scratch: ${scratch}`);
      process.exit(1);
    }
    const rawHash = createHash("sha256");
    for (const frame of source) {
      rawHash.update(readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`)));
    }
    if (createHash("sha256").update(bytes).digest("hex") !== fixture.probeJsonSha256
      || rawHash.digest("hex") !== fixture.rawRgbSha256) {
      throw new Error(`${fixture.orientation}: deterministic receipt changed`);
    }
    const mkdir = spawnSync("mkdir", [sourceRgb]);
    if (mkdir.status !== 0) throw new Error("source RGB scratch mkdir failed");
    for (const frame of source) {
      copyFileSync(
        join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`),
        join(sourceRgb, `${String(frame.frame).padStart(5, "0")}.rgb`),
      );
    }
    const mapRun = spawnSync("python3", [
      join(root, "tools/compare/frame-changemap.py"), sourceRgb,
    ], { encoding: "utf8" });
    if (mapRun.status !== 0) throw new Error("change-map generation failed");
    const label = playerAttacks ? "player-back" : "opponent-front";
    const map = mapRun.stdout.replace(/^# .* —/, `# MOVE_SUBSTITUTE ${label} —`);
    if (map !== readFileSync(resolve(root, fixture.changeMap), "utf8")
      || createHash("sha256").update(map).digest("hex") !== fixture.changeMapSha256) {
      throw new Error(`${fixture.orientation}: change-map drift`);
    }
  }
}
