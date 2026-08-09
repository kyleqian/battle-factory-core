/**
 * Dense, component-only MOVE_GLARE verifier.
 *
 * The oracle RGB stream is used only as a reproducibility/change-map receipt;
 * no framebuffer is used to construct presentation state.  Every reducer
 * field that has a dense RAM witness is checked against the source-relative
 * Scene-ON seam for both bilateral fixtures.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  glareAtAge,
  type GlareGeometry,
} from "../../src/animation/glare.ts";
import {
  createSceneOnMovePresentation,
  sceneOnGlareView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly sourceAnimationWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly probeJsonSha256: string;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
}

interface Sprite {
  readonly slot: number;
  readonly template: { readonly symbol: string | null };
  readonly attr2: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly data: readonly number[];
}

interface Task {
  readonly slot: number;
  readonly func: { readonly symbol: string | null };
  readonly data: readonly number[];
}

interface Audio {
  readonly songHeader: number;
  readonly status: number;
  readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
}

interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly Task[];
  readonly sprites: readonly Sprite[];
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly hardwareOam: readonly string[];
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: Audio;
}

interface Probe {
  readonly schema: string;
  readonly sourceAnimationWindow: Fixture["sourceAnimationWindow"];
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: glarePortable.ts <player fixture> <opponent fixture>");

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const signed9 = (value: number) => {
  const n = value & 0x1ff;
  return n >= 256 ? n - 512 : n;
};
const u16 = (raw: string, offset: number) => Number.parseInt(
  raw.slice(offset * 2 + 2, offset * 2 + 4) + raw.slice(offset * 2, offset * 2 + 2), 16,
);

function geometryFor(fixture: Fixture): GlareGeometry {
  return fixture.orientation === "player-back-to-opponent-front"
    ? {
      attackerSide: "player", targetSide: "opponent",
      attackerEyeCenter: { x: 72, y: 95 }, eyeDotStart: { x: 82, y: 93 },
      eyeDotEnd: { x: 176, y: 49 },
    }
    : {
      attackerSide: "opponent", targetSide: "player",
      attackerEyeCenter: { x: 176, y: 49 }, eyeDotStart: { x: 168, y: 49 },
      eyeDotEnd: { x: 72, y: 99 },
    };
}

function battler(side: "player" | "opponent", species: "DUNSPARCE" | "SHUCKLE"): SceneOnPresentationBattler {
  const player = side === "player";
  return {
    species,
    geometry: {
      side,
      spriteCorner: player ? { x: 40, y: species === "DUNSPARCE" ? 63 : 62 } : { x: 144, y: 17 },
      animationCenter: player ? { x: 72, y: species === "DUNSPARCE" ? 95 : 91 } : { x: 176, y: 49 },
      battlePositionCenter: player ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

function runFresh(fixture: Fixture, pass: number): { probe: Probe; output: string; rgbDir: string } {
  const scratch = createScratchDir(`pokebench-glare-${pass}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const result = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`fresh ${fixture.orientation} probe failed`);
  return { probe: JSON.parse(readFileSync(output, "utf8")) as Probe, output, rgbDir };
}

function targetHardwareX2(frame: Frame, target: Sprite): number {
  const candidates = frame.hardwareOam.filter((raw) => u16(raw, 4) === target.attr2);
  const match = candidates.find((raw) => {
    const y = u16(raw, 0) & 0xff;
    // The 64x64 battler OAM cell is positioned at sprite x/y minus 32.
    return y === ((target.y - 32) & 0xff);
  });
  if (!match) throw new Error(`target OAM missing at frame ${frame.frame}`);
  return signed9(u16(match, 2)) - signed9(target.x - 32);
}

function checkFrame(fixture: Fixture, frame: Frame, age: number, probe: Probe): void {
  const geometry = geometryFor(fixture);
  const state = glareAtAge(age, geometry);
  const attacker = battler(geometry.attackerSide, "DUNSPARCE");
  const target = battler(geometry.targetSide, "SHUCKLE");
  const stage = createSceneOnMovePresentation({
    move: "GLARE", attacker, target,
    attackerEyeCenter: geometry.attackerEyeCenter,
    eyeDotStart: geometry.eyeDotStart, eyeDotEnd: geometry.eyeDotEnd,
    fieldProfile: { playerHp: 177, playerMaxHp: 177, opponentHp: 95, opponentMaxHp: 95 },
  });
  const seam = sceneOnGlareView({ ...stage, age });
  const sourceTasks = frame.tasks.filter((task) => task.func.symbol?.startsWith("AnimTask_"));
  const expectedTasks = state.tasks.map((task) => ({ slot: task.slot, function: task.function, data: task.data }));
  const actualTasks = sourceTasks.map((task) => ({
    slot: task.slot, function: task.func.symbol, data: task.data,
  }));
  if (!same(actualTasks, expectedTasks)) throw new Error(`tasks mismatch ${fixture.orientation} age ${age}`);

  const actualDots = frame.sprites.filter((sprite) => sprite.template.symbol === "gGlareEyeDotSpriteTemplate")
    .sort((a, b) => a.slot - b.slot)
    .map((sprite) => ({ slot: sprite.slot, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, subpriority: sprite.subpriority, data: sprite.data }));
  const expectedDots = [...state.dots].sort((a, b) => a.oamSlot - b.oamSlot)
    .map((dot) => ({ slot: dot.oamSlot, x: dot.x, y: dot.y, x2: dot.x2, y2: dot.y2, subpriority: dot.subpriority, data: dot.data }));
  if (!same(actualDots, expectedDots)) throw new Error(`dots mismatch ${fixture.orientation} age ${age}`);

  const actualSparkles = frame.sprites.filter((sprite) => sprite.template.symbol === "gEyeSparkleSpriteTemplate")
    .sort((a, b) => a.slot - b.slot);
  if (actualSparkles.length !== state.sparkles.length) throw new Error(`sparkle count mismatch ${fixture.orientation} age ${age}`);
  const sparkleBase = probe.frames.find((candidate) =>
    candidate.frame === fixture.sourceAnimationWindow.startFrame + 112,
  )?.sprites.find((sprite) => sprite.template.symbol === "gEyeSparkleSpriteTemplate")?.attr2;
  state.sparkles.forEach((expected, index) => {
    const actual = actualSparkles[index];
    if (!actual || actual.x !== expected.x || actual.y !== expected.y
      || actual.x2 !== 0 || actual.y2 !== 0 || actual.subpriority !== expected.subpriority
      || (sparkleBase !== undefined && actual.attr2 - sparkleBase !== expected.tileOffset)) {
      throw new Error(`sparkles mismatch ${fixture.orientation} age ${age}`);
    }
  });

  const targetSprite = geometry.targetSide === "player" ? frame.playerSprite : frame.opponentSprite;
  if (targetSprite.x2 !== state.targetOffset.x2 || targetSprite.y2 !== 0) {
    throw new Error(`logical target mismatch ${fixture.orientation} age ${age}`);
  }
  if (targetHardwareX2(frame, targetSprite) !== state.battlers[geometry.targetSide].hardware.x2) {
    throw new Error(`hardware target mismatch ${fixture.orientation} age ${age}`);
  }
  if (frame.visualTaskCount !== state.visualTaskCount || frame.soundTaskCount !== 0) {
    throw new Error(`task counts mismatch ${fixture.orientation} age ${age}`);
  }
  const registers = state.registers;
  if (frame.registers.dispcnt !== registers.dispcnt || frame.registers.bg1cnt !== registers.bg1cnt
    || frame.registers.bg1hofs !== 0 || frame.registers.bg1vofs !== 0
    || frame.registers.bldcnt !== registers.bldcnt || frame.registers.bldalpha !== registers.bldalpha
    || frame.registers.bldy !== 0) {
    throw new Error(`register mismatch ${fixture.orientation} age ${age}`);
  }

  const expectedSong = age >= 7 && age < 57 ? probe.songHeaders.SE_M_PSYBEAM2
    : age >= 114 && age < 176 ? probe.songHeaders.SE_M_LEER : null;
  if (expectedSong !== null && frame.se1.songHeader !== expectedSong) {
    throw new Error(`audio song mismatch ${fixture.orientation} age ${age}`);
  }
  if (age === 7 || age === 114) {
    const pan = geometry.attackerSide === "player" ? -64 : 63;
    if (frame.se1.status !== 0 || frame.se1.tracks[0]?.panX !== pan) {
      throw new Error(`audio restart mismatch ${fixture.orientation} age ${age}`);
    }
  }
  if (!same(seam.dots, state.dots) || !same(seam.sparkles, state.sparkles)
    || !same(seam.tasks, state.tasks) || !same(seam.palette, state.palette)
    || !same(seam.registers, state.registers) || !same(seam.battlers, state.battlers)
    || !same(seam.scaryFace, state.scaryFace) || !same(seam.shakeTask, state.shakeTask)
    || seam.active !== state.active || seam.clean !== state.clean) {
    throw new Error(`Scene-ON seam mismatch ${fixture.orientation} age ${age}`);
  }
}

function verify(fixture: Fixture, pass: number): { evidence: string; raw: string } {
  const fresh = runFresh(fixture, pass);
  const { probe } = fresh;
  if (probe.schema !== "glare-dense-evidence/v1"
    || !same(probe.sourceAnimationWindow, fixture.sourceAnimationWindow)) {
    throw new Error(`receipt/window mismatch ${fixture.orientation}`);
  }
  const sourceFrames = probe.frames.filter((frame) => frame.frame >= fixture.sourceAnimationWindow.startFrame
    && frame.frame <= fixture.sourceAnimationWindow.endFrame);
  if (sourceFrames.length !== 213) throw new Error(`expected 213 source frames for ${fixture.orientation}`);
  const raw = createHash("sha256");
  for (const [age, frame] of sourceFrames.entries()) {
    const bytes = readFileSync(join(fresh.rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (sha256(bytes) !== frame.sha256) throw new Error(`RGB hash mismatch ${fixture.orientation} age ${age}`);
    raw.update(bytes);
    checkFrame(fixture, frame, age, probe);
  }
  const probeJsonHash = sha256(readFileSync(fresh.output));
  const evidence = sha256(JSON.stringify(sourceFrames));
  const rawHash = raw.digest("hex");
  if (probeJsonHash !== fixture.probeJsonSha256 || evidence !== fixture.evidenceSha256
    || rawHash !== fixture.rawRgbSha256) {
    throw new Error(`fresh hash drift ${fixture.orientation}: ${probeJsonHash}/${evidence}/${rawHash}`);
  }
  if (sha256(readFileSync(resolve(root, fixture.changeMap))) !== fixture.changeMapSha256) {
    throw new Error(`change-map drift ${fixture.orientation}`);
  }
  console.log(`${fixture.orientation} pass ${pass}: 213/213 reducer+seam frames; evidence ${evidence}; raw ${rawHash}`);
  return { evidence, raw: rawHash };
}

const previous = new Map<string, { evidence: string; raw: string }>();
for (let pass = 1; pass <= 2; pass += 1) {
  for (const path of paths) {
    const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
    const current = verify(fixture, pass);
    const prior = previous.get(fixture.orientation);
    if (prior && !same(prior, current)) throw new Error(`fresh reproducibility mismatch ${fixture.orientation}`);
    previous.set(fixture.orientation, current);
  }
}
