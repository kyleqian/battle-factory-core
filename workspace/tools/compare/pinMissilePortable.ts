import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pinMissileEffectAtAge } from "../../src/animation/pinMissile.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPinMissileView,
  type SceneOnPinMissileConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture extends SceneOnPinMissileConfig {
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly changeMap: string;
  readonly sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  readonly probeJsonSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMapSha256: string;
}

interface Sprite {
  readonly slot: number;
  readonly template: { address: number; symbol: string | null };
  readonly callback: { symbol: string | null };
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly attr0: number; readonly attr1: number; readonly attr2: number;
  readonly matrixNum: number; readonly matrix: readonly number[];
}
interface Frame {
  readonly frame: number; readonly sha256: string;
  readonly gAnimScriptActive: number; readonly scriptOffset: number | null;
  readonly visualTaskCount: number; readonly soundTaskCount: number;
  readonly tasks: readonly { func: { symbol: string | null } }[];
  readonly sprites: readonly Sprite[];
  readonly playerSprite: Sprite; readonly opponentSprite: Sprite;
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: { bldcnt: number; bldalpha: number };
  readonly se1: { songHeader: number; status: number; tracks: readonly { flags: number; panX: number }[] };
  readonly se2: unknown;
  readonly battleState: unknown;
}
interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly templates: Record<"gPinMissileSpriteTemplate" | "gBasicHitSplatSpriteTemplate", number>;
  readonly songHeaders: Record<"SE_M_JUMP_KICK" | "SE_M_HORN_ATTACK", number>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: pinMissilePortable.ts <player-fixture> <opponent-fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const priorRuns = new Map<string, { evidence: string; raw: string }>();

function le16(value: number): string {
  return `${(value & 255).toString(16).padStart(2, "0")}${((value >>> 8) & 255).toString(16).padStart(2, "0")}`;
}
function scriptOffset(age: number): number {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 9) return 8;
  if (age <= 26) return 38;
  if (age <= 32) return 59;
  if (age <= 43) return 97;
  if (age <= 49) return 118;
  if (age <= 65) return 156;
  if (age <= 76) return 192;
  return 196;
}

function runFixture(path: string): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-pin-missile-portable-");
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

  const bytes = readFileSync(output);
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawHash = createHash("sha256");
  for (const file of readdirSync(rgbDir).filter((name) => name.endsWith(".rgb")).sort()) {
    rawHash.update(readFileSync(join(rgbDir, file)));
  }
  const raw = rawHash.digest("hex");
  const map = createHash("sha256").update(
    readFileSync(resolve(root, fixture.changeMap)),
  ).digest("hex");
  if (evidence !== fixture.probeJsonSha256) throw new Error(`${fixture.orientation}: evidence ${evidence}`);
  if (raw !== fixture.rawRgbSha256) throw new Error(`${fixture.orientation}: raw ${raw}`);
  if (map !== fixture.changeMapSha256) throw new Error(`${fixture.orientation}: change map ${map}`);
  const prior = priorRuns.get(fixture.orientation);
  if (prior && (prior.evidence !== evidence || prior.raw !== raw)) {
    throw new Error(`${fixture.orientation}: fresh runs diverged`);
  }
  priorRuns.set(fixture.orientation, { evidence, raw });

  const probe = JSON.parse(bytes.toString()) as Probe;
  if (probe.schema !== "pin-missile-dense-evidence/v1") throw new Error(`schema ${probe.schema}`);
  if (!same(probe.sourceWindow, fixture.sourceWindow) || probe.frames.length !== 93) {
    throw new Error(`${fixture.orientation}: source window drifted`);
  }
  const stage = createSceneOnMovePresentation({
    move: "PIN_MISSILE", attacker: fixture.attacker, target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const relevant = new Set(Object.values(probe.templates));
  const byFrame = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const immutable = probe.frames[0]!.battleState;
  let component = 0;
  let framebuffer = 0;
  const failures: string[] = [];

  for (const actual of probe.frames) {
    const age = actual.frame - fixture.sourceWindow.startFrame;
    const expected = pinMissileEffectAtAge(
      age, fixture.attacker.geometry.side,
      fixture.attacker.geometry.animationCenter,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnPinMissileView({ ...stage, age });
    const actualSprites = actual.sprites.filter((sprite) => relevant.has(sprite.template.address)).map((sprite) => ({
      kind: sprite.template.address === probe.templates.gPinMissileSpriteTemplate ? "missile" : "impact",
      slot: sprite.slot, callback: sprite.callback.symbol,
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      matrixNum: sprite.matrixNum, matrix: sprite.matrix,
    })).sort((a, b) => a.slot - b.slot);
    const expectedSprites = expected.sprites.map((sprite) => ({
      kind: sprite.kind, slot: sprite.oamSlot,
      callback: sprite.kind === "missile" ? "AnimMissileArc_Step"
        : sprite.callback === "destroy-affine" ? "DestroyAnimSprite"
        : "RunStoredCallbackWhenAffineAnimEnds",
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      matrixNum: sprite.matrixNum,
      matrix: [sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d],
    })).sort((a, b) => a.slot - b.slot);
    const attacker = fixture.attacker.geometry.side === "player" ? actual.playerSprite : actual.opponentSprite;
    const target = fixture.target.geometry.side === "player" ? actual.playerSprite : actual.opponentSprite;
    const baseline = fixture.target.geometry.side === "opponent" && age < 33 ? 1 : 0;
    const taskNames = actual.tasks.map((task) => task.func.symbol);
    const event = expected.soundEvents.find((candidate) => candidate.age === age);
    const software = same(actualSprites, expectedSprites)
      && attacker.x2 === 0 && attacker.y2 === 0
      && target.x2 === expected.targetOffset.x2 + baseline
      && target.y2 === expected.targetOffset.y2
      && taskNames.includes("AnimTask_ShakeMon2_Step") === expected.shakeTaskActive;
    const registers = actual.registers.bldcnt === (expected.alpha ? 0x3f40 : 0)
      && actual.registers.bldalpha === (expected.alpha ? 0x080c : 0);
    const source = actual.scriptOffset === scriptOffset(age)
      && Boolean(actual.gAnimScriptActive) === expected.active
      && actual.soundTaskCount === 0
      && actual.visualTaskCount === expected.sprites.length + Number(expected.shakeTaskActive);
    const audio = !event || (
      actual.se1.songHeader === probe.songHeaders[event.song]
      && actual.se1.status === 0 && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === event.pan
    );
    const prior = byFrame.get(actual.frame - 1);
    const priorSprites = prior?.sprites.filter((sprite) => relevant.has(sprite.template.address)) ?? [];
    const hardwareOam = priorSprites.every((sprite) => {
      const attrs = le16(sprite.attr0) + le16(sprite.attr1) + le16(sprite.attr2);
      return actual.hardwareOam.some((row) => row.startsWith(attrs));
    });
    const hardwareMatrices = priorSprites.every((sprite) =>
      same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix)
    );
    const palettes = !prior || priorSprites.every((sprite) => {
      const start = 256 + (sprite.attr2 >>> 12) * 16;
      return same(
        actual.hardwarePalette.slice(start, start + 16),
        prior.fadedPalette.slice(start, start + 16),
      );
    });
    const receipts = same(actual.battleState, immutable)
      && actual.paletteTags.length === 16
      && actual.fadedPalette.length === 512
      && actual.unfadedPalette.length === 512
      && actual.hardwarePalette.length === 512;
    const seamShape = same(seam.sprites, expected.sprites)
      && same(seam.targetOffset, expected.targetOffset)
      && seam.active === expected.active && seam.targetMonbg === expected.targetMonbg
      && same(seam.alpha, expected.alpha);
    const rawFrame = readFileSync(join(rgbDir, `${String(actual.frame).padStart(5, "0")}.rgb`));
    const rawReceipt = createHash("sha256").update(rawFrame).digest("hex") === actual.sha256;
    if (software && registers && source && audio && hardwareOam
      && hardwareMatrices && palettes && receipts && seamShape && rawReceipt) component += 1;
    else failures.push(`${fixture.orientation} age ${age}: component receipt mismatch software=${software} registers=${registers} source=${source} audio=${audio} oam=${hardwareOam} matrix=${hardwareMatrices} palette=${palettes} receipts=${receipts} seam=${seamShape} raw=${rawReceipt}`);

    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let exact = true;
    for (let pixel = 0; pixel < 38400; pixel += 1) {
      if (app[pixel * 4] !== rawFrame[pixel * 3]
        || app[pixel * 4 + 1] !== rawFrame[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rawFrame[pixel * 3 + 2]) { exact = false; break; }
    }
    if (exact) framebuffer += 1;
    else failures.push(`${fixture.orientation} age ${age}: framebuffer mismatch`);
  }
  console.log(`${fixture.orientation}: component ${component}/93; framebuffer ${framebuffer}/93; evidence ${evidence}; raw ${raw}; map ${map}`);
  if (component !== 93 || framebuffer !== 93) {
    console.error(failures.slice(0, 30).join("\n"));
    throw new Error(`${fixture.orientation}: Pin Missile is not exact`);
  }
}

for (let pass = 0; pass < 2; pass += 1) {
  for (const path of fixturePaths) runFixture(path);
}
