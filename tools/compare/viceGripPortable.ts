import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { viceGripAtAge } from "../../src/animation/viceGrip.ts";
import {
  createSceneOnMovePresentation,
  sceneOnViceGripView,
  type SceneOnViceGripConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Fixture = SceneOnViceGripConfig & {
  readonly schema: "vice-grip-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: "tools/compare/viceGripProbe.py";
  readonly sourceWindow: {
    readonly startFrame: 212;
    readonly endFrame: 253;
    readonly frameCount: 42;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: {
    readonly status: "exact";
    readonly componentMatching: 42;
    readonly framebufferMatching: 42;
  };
};
type Sprite = {
  readonly slot: number;
  readonly template: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly invisible: boolean;
  readonly animNum: number;
  readonly animCmdIndex: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly matrixNum: number;
  readonly subpriority: number;
  readonly matrix: {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
  };
};
type Frame = {
  readonly frame: number;
  readonly sha256: string;
  readonly scriptPtr: number;
  readonly animScriptActive: boolean;
  readonly player: Record<string, unknown>;
  readonly opponent: Record<string, unknown>;
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly moveSprites: Record<string, readonly Sprite[]>;
  readonly tasks: readonly {
    readonly func: number;
    readonly data: readonly number[];
  }[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly registers: {
    readonly dispcnt: number;
    readonly bldcnt: number;
    readonly bldalpha: number;
    readonly bldy: number;
  };
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly {
      readonly flags: number;
      readonly panX: number;
    }[];
  };
};
type Probe = {
  readonly schema: "vice-grip-dense-evidence/v1";
  readonly scriptBounds: {
    readonly Move_VICE_GRIP: number;
    readonly Move_GUILLOTINE: number;
  };
  readonly templates: Record<string, number>;
  readonly taskFuncs: Record<string, number>;
  readonly songHeaders: Record<string, number>;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly frames: readonly Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2)
  throw new Error(
    "usage: viceGripPortable.ts <player fixture> <opponent fixture>",
  );
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const receipts = new Map<string, string>();
const rawReceipts = new Map<string, string>();

function normalizedChangeMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync(
    "python3",
    [join(root, "tools/compare/frame-changemap.py"), rgbDir],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0)
    throw new Error(`${fixture.orientation}: change-map generation failed`);
  const separator = run.stdout.indexOf(" — ");
  if (separator < 0)
    throw new Error(`${fixture.orientation}: change-map header changed`);
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function fresh(fixture: Fixture): {
  probe: Probe;
  rgbDir: string;
  scratch: string;
} {
  const scratch = createScratchDir(
    `pokebench-vice-grip-${fixture.orientation}-`,
  );
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync(
    "python3",
    [
      join(root, "tools/run-mgba-probe.py"),
      output,
      "--",
      join(vendor, "mgba-venv/bin/python"),
      resolve(root, fixture.probe),
      resolve(root, fixture.scenario),
      output,
      rgbDir,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0)
    throw new Error(
      `fresh ${fixture.orientation} probe failed (${run.status})`,
    );
  return {
    probe: JSON.parse(readFileSync(output, "utf8")) as Probe,
    rgbDir,
    scratch,
  };
}

function framebufferDiff(app: Uint8Array, rgb: Buffer): number {
  let diff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1)
    if (
      app[pixel * 4] !== rgb[pixel * 3] ||
      app[pixel * 4 + 1] !== rgb[pixel * 3 + 1] ||
      app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
    )
      diff += 1;
  return diff;
}

function u16le(value: number): string {
  const word = value & 0xffff;
  return `${(word & 0xff).toString(16).padStart(2, "0")}${(word >>> 8).toString(16).padStart(2, "0")}`;
}

function priorHardwareMatches(
  oracle: Frame,
  prior: Frame | undefined,
  sprite: Sprite,
): boolean {
  if (!prior) return true;
  const raw = `${u16le(sprite.attr0)}${u16le(sprite.attr1)}${u16le(sprite.attr2)}`;
  const oamIndex = prior.softwareOam.findIndex((candidate) =>
    candidate.startsWith(raw),
  );
  return (
    oamIndex >= 0 &&
    same(oracle.hardwareOam[oamIndex], [
      sprite.attr0,
      sprite.attr1,
      sprite.attr2,
    ]) &&
    same(oracle.hardwareMatrices[sprite.matrixNum], [
      sprite.matrix.a,
      sprite.matrix.b,
      sprite.matrix.c,
      sprite.matrix.d,
    ])
  );
}

function priorHardwarePaletteMatches(
  oracle: Frame,
  prior: Frame | undefined,
  sprite: Sprite,
): boolean {
  if (!prior) return true;
  const bank = sprite.attr2 >>> 12;
  const start = 256 + bank * 16;
  return same(
    oracle.hardwarePalette.slice(start, start + 16),
    prior.fadedPalette.slice(start, start + 16),
  );
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const { probe, rgbDir, scratch } = fresh(fixture);
  const source = probe.frames;
  if (
    fixture.schema !== "vice-grip-portable-evidence/v1" ||
    fixture.oracleProfile !== "battle-scene-on" ||
    probe.schema !== "vice-grip-dense-evidence/v1" ||
    !same(probe.sourceWindow, fixture.sourceWindow) ||
    source.length !== 42
  )
    throw new Error(`${fixture.orientation}: incomplete pointer window`);
  const stage = createSceneOnMovePresentation({
    ...fixture,
    move: "VICE_GRIP" as const,
  });
  const first = source[0]!;
  const evidence = createHash("sha256");
  const rawWindow = createHash("sha256");
  const failures: string[] = [];
  let components = 0;
  let framebuffers = 0;
  for (const [age, oracle] of source.entries()) {
    const before = failures.length;
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    evidence.update(JSON.stringify(oracle));
    evidence.update(rgb);
    rawWindow.update(rgb);
    if (sha256(rgb) !== oracle.sha256) failures.push(`age ${age}: raw RGB`);
    const expected = viceGripAtAge(
      age,
      fixture.target.geometry.side,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnViceGripView({ ...stage, age });
    const {
      age: _age,
      attacker: _attacker,
      target: _target,
      ...seamState
    } = seam;
    if (!same(expected, seamState)) failures.push(`age ${age}: typed seam`);
    if (expected.active !== oracle.animScriptActive)
      failures.push(`age ${age}: cleanup`);
    if (
      age === 0 &&
      !(
        oracle.scriptPtr >= probe.scriptBounds.Move_VICE_GRIP &&
        oracle.scriptPtr < probe.scriptBounds.Move_GUILLOTINE
      )
    )
      failures.push("age 0: pointer entry");
    const pincers = oracle.moveSprites.gViceGripSpriteTemplate ?? [];
    const pincerShape = pincers.map((sprite) => ({
      slot: sprite.slot,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      frame: sprite.animCmdIndex,
      animNum: sprite.animNum,
      subpriority: sprite.subpriority,
      hFlip: ((sprite.attr1 >>> 12) & 1) !== 0,
      vFlip: ((sprite.attr1 >>> 13) & 1) !== 0,
    }));
    const expectedPincers = expected.pincers.map((sprite) => ({
      slot: sprite.oamSlot,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      frame: sprite.frame,
      animNum: sprite.hFlip ? 1 : 0,
      subpriority: fixture.target.geometry.side === "opponent" ? 28 : 38,
      hFlip: sprite.hFlip,
      vFlip: sprite.vFlip,
    }));
    if (!same(pincerShape, expectedPincers))
      failures.push(`age ${age}: AnimViceGripPincer`);
    const hits = oracle.moveSprites.gBasicHitSplatSpriteTemplate ?? [];
    if (
      (expected.hitsplat === null) !== (hits.length === 0) ||
      (expected.hitsplat &&
        (hits.length !== 1 ||
          hits[0]!.x !== expected.hitsplat.x ||
          hits[0]!.y !== expected.hitsplat.y ||
          hits[0]!.matrix.a !== 372 ||
          hits[0]!.matrix.d !== 372 ||
          hits[0]!.slot !== 5 ||
          hits[0]!.animNum !== 0 ||
          hits[0]!.animCmdIndex !== 0 ||
          hits[0]!.subpriority !==
            (fixture.target.geometry.side === "opponent" ? 29 : 39)))
    )
      failures.push(`age ${age}: animation-2 hitsplat`);
    const targetSprite =
      fixture.target.geometry.side === "player"
        ? oracle.playerSprite
        : oracle.opponentSprite;
    const idleX2 =
      fixture.target.geometry.side === "opponent" && age <= 20 ? 1 : 0;
    if (
      targetSprite.invisible !== expected.targetOnMonBg ||
      targetSprite.x2 !== idleX2 + expected.targetOffset.x2 ||
      targetSprite.y2 !== 0
    )
      failures.push(`age ${age}: target monbg/ShakeMon2`);
    const shake = oracle.tasks.filter(
      (task) =>
        (task.func & ~1) === (probe.taskFuncs.AnimTask_ShakeMon2_Step & ~1),
    );
    if (shake.length !== (age >= 21 && age <= 28 ? 1 : 0))
      failures.push(`age ${age}: AnimTask_ShakeMon2 lifetime`);
    if (
      shake.some(
        (task) =>
          task.data[0] !==
            (fixture.target.geometry.side === "opponent" ? 8 : 6) ||
          task.data[1] !== 4 - Math.floor((age - 21) / 2) ||
          task.data[2] !== 1 ||
          task.data[3] !== ((age - 21) % 2 === 0 ? 1 : 0) ||
          task.data[4] !== 2 ||
          task.data.slice(5).some((value) => value !== 0),
      )
    )
      failures.push(`age ${age}: AnimTask_ShakeMon2 tuple/state`);
    if (
      oracle.visualTaskCount !== pincers.length + hits.length + shake.length ||
      oracle.soundTaskCount !== 0
    )
      failures.push(`age ${age}: task counters`);
    const alpha = expected.alpha !== null;
    if (
      alpha
        ? oracle.registers.bldcnt !== 0x3f40 ||
          oracle.registers.bldalpha !== 0x080c ||
          oracle.registers.bldy !== 0
        : oracle.registers.bldcnt !== 0 ||
          oracle.registers.bldalpha !== 0 ||
          oracle.registers.bldy !== 0
    )
      failures.push(`age ${age}: blend registers`);
    for (const [tag, active] of [
      [10138, expected.cutLoaded],
      [10135, expected.impactLoaded],
    ] as const)
      if (
        oracle.paletteTags.includes(tag) !== active ||
        oracle.tileTags.includes(tag) !== active
      )
        failures.push(`age ${age}: tag ${tag}`);
    if (
      oracle.registers.dispcnt !== first.registers.dispcnt ||
      oracle.fadedPalette.length !== 512 ||
      oracle.unfadedPalette.length !== 512 ||
      oracle.hardwarePalette.length !== 512 ||
      oracle.softwareOam.length !== 128 ||
      oracle.hardwareOam.length !== 128 ||
      oracle.hardwareMatrices.length !== 32
    )
      failures.push(`age ${age}: hardware shape`);
    const prior = source[age - 1];
    for (const sprite of prior
      ? [
          ...(prior.moveSprites.gViceGripSpriteTemplate ?? []),
          ...(prior.moveSprites.gBasicHitSplatSpriteTemplate ?? []),
        ]
      : [])
      if (!priorHardwareMatches(oracle, prior, sprite))
        failures.push(`age ${age}: prior software-to-hardware OAM/matrix`);
      else if (!priorHardwarePaletteMatches(oracle, prior, sprite))
        failures.push(`age ${age}: prior software-to-hardware palette`);
    if (expected.sound) {
      const pan = fixture.target.geometry.side === "player" ? -63 : 63;
      if (
        oracle.se1.songHeader !== probe.songHeaders.SE_M_VICEGRIP ||
        !oracle.se1.tracks.some(
          (track) => (track.flags & 0x80) !== 0 && track.panX === pan,
        )
      )
        failures.push(`age ${age}: target-panned audio`);
    }
    for (const side of ["player", "opponent"] as const)
      for (const key of [
        "species",
        "hp",
        "maxHp",
        "item",
        "status1",
        "status2",
        "status3",
      ])
        if (oracle[side][key] !== first[side][key])
          failures.push(`age ${age}: immutable ${side}.${key}`);
    if (failures.length === before) components += 1;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = framebufferDiff(render(engine), rgb);
    if (diff === 0) framebuffers += 1;
    else failures.push(`age ${age}: framebuffer ${diff}`);
  }
  const evidenceSha = evidence.digest("hex");
  const rawSha = rawWindow.digest("hex");
  if (evidenceSha !== fixture.evidenceSha256)
    failures.push(`evidence ${evidenceSha}`);
  if (rawSha !== fixture.rawRgbSha256) failures.push(`raw ${rawSha}`);
  const changeMap = normalizedChangeMap(fixture, rgbDir);
  if (
    sha256(changeMap) !== fixture.changeMapSha256 ||
    changeMap !== readFileSync(resolve(root, fixture.changeMap), "utf8")
  )
    failures.push("change-map receipt");
  if (runNumber === 1) {
    receipts.set(fixture.orientation, evidenceSha);
    rawReceipts.set(fixture.orientation, rawSha);
  } else if (
    receipts.get(fixture.orientation) !== evidenceSha ||
    rawReceipts.get(fixture.orientation) !== rawSha
  )
    failures.push("fresh receipt");
  console.log(
    `${fixture.orientation} run ${runNumber}: ${components}/42 component; ${framebuffers}/42 framebuffer; evidence/raw ${evidenceSha}/${rawSha}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 60).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1)
  for (const path of paths) verify(path, run);
