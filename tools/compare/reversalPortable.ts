import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { reversalAtAge } from "../../src/animation/reversal.ts";
import {
  createSceneOnMovePresentation,
  sceneOnReversalView,
  type SceneOnReversalConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture extends SceneOnReversalConfig {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
}

interface Sprite {
  readonly slot: number;
  readonly raw: string;
  readonly template: { readonly address: number; readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly attr: readonly number[];
  readonly matrixNum: number;
  readonly matrix: readonly number[];
  readonly data: readonly number[];
}

interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly { readonly func: { readonly symbol: string | null } }[];
  readonly sprites: readonly Sprite[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly se2: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
}

interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly topology: {
    readonly tasks: readonly string[];
    readonly templates: readonly string[];
    readonly callbacks: readonly string[];
  };
  readonly lifecycleCounts: {
    readonly complexPaletteBlend: number;
    readonly reversalOrb: number;
  };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: reversalPortable.ts <player-fixture> <opponent-fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();
const s16 = (hex: string, byteOffset: number) => {
  const lo = Number.parseInt(hex.slice(byteOffset * 2, byteOffset * 2 + 2), 16);
  const hi = Number.parseInt(hex.slice(byteOffset * 2 + 2, byteOffset * 2 + 4), 16);
  const value = lo | hi << 8;
  return value >= 0x8000 ? value - 0x10000 : value;
};

function verify(fixturePath: string): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-reversal-portable-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawHash = createHash("sha256");
  for (const frame of probe.frames) {
    rawHash.update(readFileSync(
      join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
    ));
  }
  const rawDigest = rawHash.digest("hex");
  if (
    probe.schema !== "reversal-dense-evidence/v2"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || evidence !== fixture.evidenceSha256
    || rawDigest !== fixture.rawRgbSha256
    || probe.lifecycleCounts.complexPaletteBlend !== 2
    || probe.lifecycleCounts.reversalOrb !== 6
  ) throw new Error(`${fixture.orientation}: portable evidence contract changed`);
  const priorFresh = fresh.get(fixture.orientation);
  if (priorFresh && !same(priorFresh, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh receipt diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });

  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const stage = createSceneOnMovePresentation(fixture);
  const mismatches: string[] = [];
  let components = 0;
  let framebuffers = 0;
  const fbByAge: number[] = [];
  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const expected = reversalAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attackerPictureOffset,
      fixture.targetPictureOffset,
      fixture.resolvedShake,
    );
    const seam = sceneOnReversalView({ ...stage, age });
    const actualOrbs = actual.sprites
      .filter((sprite) => sprite.template.symbol === "gReversalOrbSpriteTemplate")
      .map((sprite, index) => ({
        index,
        x: s16(sprite.raw, 0x20),
        y: s16(sprite.raw, 0x22),
        x2: s16(sprite.raw, 0x24),
        y2: s16(sprite.raw, 0x26),
        phase: sprite.data[1],
        radiusX: sprite.data[2],
        radiusY: sprite.data[3],
      }));
    const expectedOrbs = expected.orbs.map((orb) => ({
      index: orb.index,
      x: orb.x,
      y: orb.y,
      x2: orb.x2,
      y2: orb.y2,
      phase: orb.phase,
      radiusX: orb.radiusX,
      radiusY: orb.radiusY,
    }));
    const prior = frames.get(frame - 1);
    const oamTransfer = !prior || same(actual.hardwareOam, prior.softwareOam);
    const paletteTransfer = !prior
      || same(actual.hardwarePalette, prior.fadedPalette);
    const matrixTransfer = !prior || prior.sprites.every((sprite) =>
      (sprite.attr[0]! & 0x100) === 0
      || same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix)
    );
    const sound = expected.sound === null || (() => {
      const player = expected.sound.player === "SE1" ? actual.se1 : actual.se2;
      return player.songHeader === probe.songHeaders[expected.sound.song]
        && player.tracks[0]?.flags === 131
        && player.tracks[0]?.panX === expected.sound.pan;
    })();
    const software =
      same(actualOrbs, expectedOrbs)
      && actual.visualTaskCount === expected.visualTaskCount
      && actual.soundTaskCount === 0;
    const source = age === 173
      ? !actual.gAnimScriptActive
      : Boolean(actual.gAnimScriptActive) && actual.scriptOffset !== null;
    const registers = ["bldcnt", "bldalpha", "bldy"].every(
      (name) => actual.registers[name] === 0,
    );
    const seamShape =
      same(seam.orbs, expected.orbs)
      && seam.attackerX2 === expected.attackerX2
      && seam.targetX2 === expected.targetX2
      && same(seam.paletteBlend, expected.paletteBlend)
      && same(seam.resolvedShake, fixture.resolvedShake);
    const raw = readFileSync(
      join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
    );
    const rawReceipt =
      createHash("sha256").update(raw).digest("hex") === actual.sha256;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
      ) diff += 1;
    }
    fbByAge.push(diff);
    if (diff === 0) framebuffers += 1;
    if (
      software && source && registers && sound && oamTransfer
      && paletteTransfer && matrixTransfer && seamShape && rawReceipt
    ) components += 1;
    else mismatches.push(
      `frame ${frame}/age ${age}: software=${software} source=${source} `
      + `registers=${registers} sound=${sound} oam=${oamTransfer} `
      + `palette=${paletteTransfer} matrices=${matrixTransfer} `
      + `seam=${seamShape} raw=${rawReceipt}`,
    );
  }
  const diffAges = fbByAge
    .map((diff, age) => diff ? `${age}:${diff}` : null)
    .filter((value): value is string => value !== null);
  console.log(
    `${fixture.orientation}: components ${components}/174; framebuffer `
    + `${framebuffers}/174; evidence ${evidence}; raw ${rawDigest}`,
  );
  if (diffAges.length) {
    mismatches.push(`framebuffer residual ${diffAges.join(",")}`);
  }
  if (mismatches.length) throw new Error(mismatches.join("\n"));
}

for (let pass = 0; pass < 2; pass += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath);
}
