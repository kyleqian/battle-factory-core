import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { hydroPumpAtAge } from "../../src/animation/hydroPump.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHydroPumpView,
  type SceneOnHydroPumpConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture extends SceneOnHydroPumpConfig {
  readonly schema: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number; readonly endFrame: number; readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
}
interface Sprite {
  readonly slot: number; readonly raw: string;
  readonly template: { readonly address: number; readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly attr: readonly number[]; readonly matrixNum: number;
  readonly matrix: readonly number[];
}
interface Task {
  readonly slot: number; readonly func: { readonly symbol: string | null };
}
interface Frame {
  readonly frame: number; readonly sha256: string;
  readonly gAnimScriptActive: number; readonly scriptOffset: number | null;
  readonly visualTaskCount: number; readonly soundTaskCount: number;
  readonly tasks: readonly Task[]; readonly sprites: readonly Sprite[];
  readonly softwareOam: readonly string[]; readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[]; readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly battlers: Readonly<Record<string, unknown>>;
  readonly engine: Readonly<Record<string, unknown>>;
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly se2: { readonly songHeader: number };
}
interface Probe {
  readonly schema: string; readonly sourceWindow: Fixture["sourceWindow"];
  readonly songHeaders: { readonly SE_M_HYDRO_PUMP: number };
  readonly lifecycleCounts: { readonly hydroPumpOrb: number; readonly waterHitSplat: number };
  readonly topology: { readonly tasks: readonly string[]; readonly callbacks: readonly string[] };
  readonly templates: {
    readonly gHydroPumpOrbSpriteTemplate: number;
    readonly gWaterHitSplatSpriteTemplate: number;
  };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: hydroPumpPortable.ts <player-fixture> <opponent-fixture>");
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const fresh = new Map<string, { evidence: string; raw: string }>();
const i16 = (raw: string, offset: number): number => {
  const value = Number.parseInt(
    raw.slice(offset * 2 + 2, offset * 2 + 4)
      + raw.slice(offset * 2, offset * 2 + 2),
    16,
  );
  return value >= 0x8000 ? value - 0x10000 : value;
};

function verify(fixturePath: string): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-hydro-pump-portable-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawHash = createHash("sha256");
  for (const frame of probe.frames) {
    const raw = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== frame.sha256) {
      throw new Error(`${fixture.orientation}: raw RGB changed at ${frame.frame}`);
    }
  }
  const rawDigest = rawHash.digest("hex");
  if (
    fixture.schema !== "hydro-pump-portable-evidence/v1"
    || probe.schema !== "hydro-pump-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || evidence !== fixture.evidenceSha256 || rawDigest !== fixture.rawRgbSha256
    || probe.lifecycleCounts.hydroPumpOrb !== 44
    || probe.lifecycleCounts.waterHitSplat !== 12
    || !probe.topology.callbacks.includes("AnimToTargetInSinWave_Step")
    || !probe.topology.tasks.includes("AnimTask_RunSinAnimTimer")
    || !probe.topology.tasks.includes("AnimTask_ShakeMon_Step")
  ) throw new Error(`${fixture.orientation}: portable evidence contract changed`);
  const priorFresh = fresh.get(fixture.orientation);
  if (priorFresh && !same(priorFresh, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });

  const stage = createSceneOnMovePresentation({
    move: "HYDRO_PUMP",
    attacker: fixture.attacker, target: fixture.target,
    attackerPictureOffset: fixture.attackerPictureOffset,
    targetPictureOffset: fixture.targetPictureOffset,
    fieldProfile: fixture.fieldProfile,
  });
  const byFrame = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const invariant = {
    battlers: probe.frames[0]!.battlers,
    currentMove: probe.frames[0]!.engine.currentMove,
  };
  const mismatches: string[] = [];
  let components = 0, framebuffers = 0;
  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = byFrame.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const expected = hydroPumpAtAge(
      age, fixture.attacker.geometry.side,
      fixture.attackerPictureOffset, fixture.targetPictureOffset,
    );
    const seam = sceneOnHydroPumpView({ ...stage, age });
    const actualOrbs = actual.sprites.filter((sprite) =>
      sprite.template.address === probe.templates.gHydroPumpOrbSpriteTemplate
    ).map((sprite) => ({
      oamSlot: sprite.slot, x: i16(sprite.raw, 0x20), y: i16(sprite.raw, 0x22),
      x2: i16(sprite.raw, 0x24), y2: i16(sprite.raw, 0x26),
      frame: ((sprite.attr[2]! & 0x3ff) - 305) / 4,
      callback: sprite.callback.symbol,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const expectedOrbs = expected.orbs.map((orb) => ({
      oamSlot: orb.oamSlot, x: orb.x, y: orb.y, x2: orb.x2, y2: orb.y2,
      frame: orb.frame, callback: orb.callback,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const actualSplats = actual.sprites.filter((sprite) =>
      sprite.template.address === probe.templates.gWaterHitSplatSpriteTemplate
    ).map((sprite) => ({
      oamSlot: sprite.slot, x: i16(sprite.raw, 0x20), y: i16(sprite.raw, 0x22),
      matrix: sprite.matrix, callback: sprite.callback.symbol,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const expectedSplats = expected.splats.map((splat) => ({
      oamSlot: splat.oamSlot, x: splat.x, y: splat.y,
      matrix: [splat.matrix.a, splat.matrix.b, splat.matrix.c, splat.matrix.d],
      callback: splat.callback,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const taskName = {
      "attacker-shake": "AnimTask_ShakeMon_Step",
      "sin-timer": "AnimTask_RunSinAnimTimer",
      "target-shake": "AnimTask_ShakeMon_Step",
    } as const;
    const actualTasks = actual.tasks.filter((task) =>
      task.func.symbol === "AnimTask_ShakeMon_Step"
      || task.func.symbol === "AnimTask_RunSinAnimTimer"
    ).map((task) => ({ slot: task.slot, symbol: task.func.symbol }));
    const expectedTasks = expected.tasks.map((task) => ({
      slot: task.slot, symbol: taskName[task.kind],
    }));
    const source = actual.scriptOffset === expected.scriptOffset
      && Boolean(actual.gAnimScriptActive) === expected.active
      && actual.visualTaskCount === expected.visualTaskCount
      && actual.soundTaskCount === expected.soundTaskCount;
    const tags = actual.paletteTags.includes(10149) === expected.waterOrbLoaded
      && actual.paletteTags.includes(10148) === expected.waterImpactLoaded;
    const registers = expected.alpha
      ? actual.registers.bldcnt === 16192 && actual.registers.bldalpha === 2060
      : actual.registers.bldcnt === 0 && actual.registers.bldalpha === 0;
    const audio = expected.hydroPumpAudio === null
      ? true
      : actual.se1.songHeader === probe.songHeaders.SE_M_HYDRO_PUMP
        && actual.se1.tracks[0]?.flags === expected.hydroPumpAudio.flags
        && actual.se1.tracks[0]?.panX === expected.hydroPumpAudio.pan
        && actual.se2.songHeader !== probe.songHeaders.SE_M_HYDRO_PUMP;
    const previous = byFrame.get(frame - 1);
    const transfers = !previous || same(actual.hardwareOam, previous.softwareOam)
      && (same(actual.hardwarePalette, previous.fadedPalette)
        || same(actual.hardwarePalette, actual.fadedPalette));
    const immutable = same(actual.battlers, invariant.battlers)
      && actual.engine.currentMove === invariant.currentMove;
    const seamShape = same(seam.orbs, expected.orbs)
      && same(seam.splats, expected.splats) && same(seam.tasks, expected.tasks)
      && seam.active === expected.active;
    const orbMatch = same(actualOrbs, expectedOrbs);
    const splatMatch = same(actualSplats, expectedSplats);
    const taskMatch = same(actualTasks, expectedTasks);
    const component = orbMatch
      && splatMatch && taskMatch
      && source && tags && registers && audio && transfers && immutable && seamShape;
    if (component) components += 1;
    else mismatches.push(
      `frame ${frame}/age ${age}: orbs=${orbMatch} splats=${splatMatch} `
      + `tasks=${taskMatch} source=${source} tags=${tags} registers=${registers} `
      + `audio=${audio} transfers=${transfers} immutable=${immutable} seam=${seamShape}`,
    );
    const raw = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) diff += 1;
    }
    if (diff === 0) framebuffers += 1;
    else mismatches.push(`frame ${frame}/age ${age}: framebufferDiff=${diff}`);
  }
  console.log(
    `${fixture.orientation}: components ${components}/${fixture.sourceWindow.frameCount}; `
    + `framebuffer ${framebuffers}/${fixture.sourceWindow.frameCount}; `
    + `evidence ${evidence}; raw ${rawDigest}`,
  );
  if (mismatches.length) throw new Error(mismatches.slice(0, 20).join("\n"));
}

for (let repeat = 0; repeat < 2; repeat += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath);
}
