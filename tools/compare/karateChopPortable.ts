import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { karateChopAtAge } from "../../src/animation/karateChop.ts";
import {
  createSceneOnMovePresentation,
  sceneOnKarateChopView,
  type SceneOnKarateChopConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Side = "player" | "opponent";
type Fixture = SceneOnKarateChopConfig & {
  readonly schema: "karate-chop-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: "tools/compare/poisonFangProbe.py";
  readonly probeMoveId: 2;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: 49;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: {
    readonly status: "unsupported" | "exact";
    readonly evidenceMatching?: number;
    readonly componentMatching?: number;
    readonly framebufferMatching: number;
  };
};
type Sprite = {
  readonly slot: number;
  readonly template: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animNum: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly matrixNum: number;
  readonly matrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
};
type BattlerSprite = Sprite & {
  readonly hardwareMatrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
};
type Frame = {
  readonly frame: number;
  readonly sha256: string;
  readonly scriptPtr: number;
  readonly scriptOffset: number | null;
  readonly animScriptActive: boolean;
  readonly player: Record<string, unknown>;
  readonly opponent: Record<string, unknown>;
  readonly playerSprite: BattlerSprite;
  readonly opponentSprite: BattlerSprite;
  readonly sprites: readonly Sprite[];
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
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
  readonly dispcnt: number;
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bldy: number;
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
};
type Probe = {
  readonly schema: "karate-chop-dense-evidence/v1";
  readonly scriptBounds: { readonly Move_KARATE_CHOP: number; readonly Move_CROSS_CHOP: number };
  readonly templates: Record<string, number>;
  readonly taskFuncs: Record<string, number>;
  readonly songHeaders: Record<string, number>;
  readonly frames: readonly Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) {
  throw new Error("usage: karateChopPortable.ts <player fixture> <opponent fixture>");
}
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const receipts = new Map<string, string>();
const rawReceipts = new Map<string, string>();

function normalizedChangeMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], {
    cwd: root,
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`${fixture.orientation}: change-map generation failed`);
  const separator = run.stdout.indexOf(" — ");
  if (separator < 0) throw new Error(`${fixture.orientation}: change-map header changed`);
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function priorHardwareMatches(oracle: Frame, prior: Frame | undefined, sprite: Sprite): boolean {
  if (!prior) return true;
  return oracle.hardwareOam.some((item) => same(item, [sprite.attr0, sprite.attr1, sprite.attr2]))
    && same(oracle.hardwareMatrices[sprite.matrixNum], [
      sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
    ]);
}

function priorHardwarePaletteMatches(oracle: Frame, prior: Frame | undefined, sprite: Sprite): boolean {
  if (!prior) return true;
  const bank = sprite.attr2 >>> 12;
  const start = 256 + bank * 16;
  return same(
    oracle.hardwarePalette.slice(start, start + 16),
    prior.fadedPalette.slice(start, start + 16),
  );
}

function framebufferDiff(app: Uint8Array, rgb: Buffer): number {
  let diff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== rgb[pixel * 3]
      || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) diff += 1;
  }
  return diff;
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = createScratchDir(`pokebench-karate-chop-${fixture.orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir, String(fixture.probeMoveId),
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`fresh ${fixture.orientation} probe failed (${run.status})`);
  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  if (fixture.schema !== "karate-chop-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== "karate-chop-dense-evidence/v1"
    || probe.frames.length !== 49
    || fixture.acceptance.status !== "exact"
    || fixture.acceptance.componentMatching !== 49
    || fixture.acceptance.framebufferMatching !== 49
    || probe.scriptBounds.Move_CROSS_CHOP - probe.scriptBounds.Move_KARATE_CHOP !== 0x52) {
    throw new Error(`${fixture.orientation}: incomplete pointer-bounded source window`);
  }
  const stage = createSceneOnMovePresentation({ ...fixture, move: "KARATE_CHOP" as const });
  const first = probe.frames[0]!;
  const targetSide: Side = fixture.target.geometry.side;
  const targetPan = targetSide === "player" ? -63 : 63;
  const evidence = createHash("sha256");
  const rawWindow = createHash("sha256");
  const failures: string[] = [];
  let components = 0;
  let framebuffers = 0;
  for (const [age, oracle] of probe.frames.entries()) {
    const before = failures.length;
    const rgb = readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
    evidence.update(JSON.stringify(oracle));
    evidence.update(rgb);
    rawWindow.update(rgb);
    if (sha256(rgb) !== oracle.sha256) failures.push(`age ${age}: raw RGB hash`);
    const expected = karateChopAtAge(age, targetSide, fixture.target.geometry.animationCenter);
    const seam = sceneOnKarateChopView({ ...stage, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = seam;
    if (!same(expected, seamState)) failures.push(`age ${age}: typed seam`);
    if (oracle.frame !== fixture.sourceWindow.startFrame + age
      || oracle.scriptOffset !== expected.scriptOffset
      || oracle.animScriptActive !== expected.active) failures.push(`age ${age}: pointer/cleanup`);
    const expectedSprites = [
      ...(expected.hand ? [{
        template: probe.templates.gKarateChopSpriteTemplate,
        slot: 3,
        x: expected.hand.x,
        y: expected.hand.y,
        x2: expected.hand.x2,
        y2: expected.hand.y2,
        animNum: expected.hand.animation,
        matrix: { a: 256, b: 0, c: 0, d: 256 },
      }] : []),
      ...(expected.hitsplat ? [{
        template: probe.templates.gBasicHitSplatSpriteTemplate,
        slot: 3,
        x: expected.hitsplat.x,
        y: expected.hitsplat.y,
        x2: 0,
        y2: 0,
        animNum: 0,
        matrix: { a: expected.hitsplat.matrix, b: 0, c: 0, d: expected.hitsplat.matrix },
      }] : []),
    ];
    const actualSprites = oracle.sprites.map((sprite) => ({
      template: sprite.template, slot: sprite.slot, x: sprite.x, y: sprite.y,
      x2: sprite.x2, y2: sprite.y2, animNum: sprite.animNum, matrix: sprite.matrix,
    }));
    if (!same(actualSprites, expectedSprites)) failures.push(`age ${age}: source sprites`);
    // Karate Chop independently confirms the freshly allocated affine
    // IMPACT's dual-lag class: its first software age still has neutral,
    // absent hardware; the following scanout carries both ObjBlend/affine
    // OAM and matrix 372; software teardown then remains on hardware for one
    // final scanout before both OAM and matrix clear.
    const impactSoftware = probe.frames[22]!.sprites.find((sprite) =>
      sprite.template === probe.templates.gBasicHitSplatSpriteTemplate);
    if (!impactSoftware) failures.push("age 22: missing IMPACT software anchor");
    else {
      const impactHardware = oracle.hardwareOam.some((item) => same(item, [
        impactSoftware.attr0, impactSoftware.attr1, impactSoftware.attr2,
      ]));
      const expectedImpactHardware = age >= 23 && age <= 32;
      const expectedImpactMatrix = expectedImpactHardware
        ? [372, 0, 0, 372]
        : [256, 0, 0, 256];
      if ((age >= 22 && age <= 33)
        && (impactHardware !== expectedImpactHardware
          || !same(oracle.hardwareMatrices[impactSoftware.matrixNum], expectedImpactMatrix))) {
        failures.push(`age ${age}: affine IMPACT dual-lag scanout`);
      }
    }
    const shake = oracle.tasks.filter((task) => task.func === probe.taskFuncs.AnimTask_ShakeMon
      || task.func === probe.taskFuncs.AnimTask_ShakeMon_Step);
    if (expected.shakeTask === null ? shake.length !== 0 : shake.length !== 1
      || expected.shakeTask !== null && (
        shake[0]!.data[1] !== expected.shakeTask.remaining
        || shake[0]!.data[2] !== 1
        || shake[0]!.data[3] !== expected.shakeTask.delay
        || shake[0]!.data[4] !== expected.shakeTask.displacement
      )) failures.push(`age ${age}: ShakeMon task`);
    const targetSprite = targetSide === "player" ? oracle.playerSprite : oracle.opponentSprite;
    if (expected.shakeTask !== null
      && (targetSprite.x2 !== expected.targetOffset.x2 || targetSprite.y2 !== expected.targetOffset.y2)) {
      failures.push(`age ${age}: target software offset`);
    }
    const prior = probe.frames[age - 1];
    if (prior && (!prior.sprites.every((sprite) => priorHardwareMatches(oracle, prior, sprite))
      || !prior.sprites.every((sprite) => priorHardwarePaletteMatches(oracle, prior, sprite)))) {
      failures.push(`age ${age}: hardware OAM/matrix/palette transfer`);
    }
    for (const [tag, loaded] of [[10143, expected.handsAndFeetLoaded], [10135, expected.impactLoaded]] as const) {
      if (oracle.paletteTags.includes(tag) !== loaded || oracle.tileTags.includes(tag) !== loaded) {
        failures.push(`age ${age}: animation tag ${tag}`);
      }
    }
    if (oracle.dispcnt !== 0xbf40 || oracle.bldcnt !== (expected.alpha ? 0x3f40 : 0)
      || oracle.bldalpha !== (expected.alpha ? 0x80c : 0) || oracle.bldy !== 0
      || oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512
      || oracle.hardwarePalette.length !== 512 || oracle.softwareOam.length !== 128
      || oracle.hardwareOam.length !== 128 || oracle.hardwareMatrices.length !== 32) {
      failures.push(`age ${age}: registers/hardware shape`);
    }
    if (expected.sound !== null) {
      const audible = oracle.se1.tracks.some((track) => (track.flags & 0x80) !== 0 && track.panX === targetPan);
      if (oracle.se1.songHeader !== probe.songHeaders[expected.sound] || !audible) {
        failures.push(`age ${age}: ${expected.sound} target-pan audio`);
      }
    }
    for (const side of ["player", "opponent"] as const) {
      for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3"]) {
        if (oracle[side][key] !== first[side][key]) failures.push(`age ${age}: gameplay ${side}.${key}`);
      }
    }
    const expectedVisuals = expectedSprites.length + (expected.shakeTask ? 1 : 0);
    if (oracle.visualTaskCount !== expectedVisuals || oracle.soundTaskCount !== 0) {
      failures.push(`age ${age}: visual/sound task counts`);
    }
    if (failures.length === before) components += 1;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = framebufferDiff(render(engine), rgb);
    if (diff === 0) framebuffers += 1;
    else failures.push(`age ${age}: framebuffer diff ${diff}`);
  }
  const evidenceDigest = evidence.digest("hex");
  const rawDigest = rawWindow.digest("hex");
  if (evidenceDigest !== fixture.evidenceSha256) failures.push(`evidence receipt ${evidenceDigest}`);
  if (rawDigest !== fixture.rawRgbSha256) failures.push(`raw RGB receipt ${rawDigest}`);
  const changeMap = normalizedChangeMap(fixture, rgbDir);
  if (sha256(changeMap) !== fixture.changeMapSha256
    || changeMap !== readFileSync(resolve(fixture.changeMap), "utf8")) {
    failures.push("regenerated change map");
  }
  if (runNumber === 1) {
    receipts.set(fixture.orientation, evidenceDigest);
    rawReceipts.set(fixture.orientation, rawDigest);
  } else if (receipts.get(fixture.orientation) !== evidenceDigest
    || rawReceipts.get(fixture.orientation) !== rawDigest) failures.push("fresh-run receipts");
  console.log(`${fixture.orientation} run ${runNumber}: ${components}/49 component/hardware; `
    + `${framebuffers}/49 production framebuffer; evidence/raw ${evidenceDigest}/${rawDigest}`);
  if (failures.length) {
    console.error(failures.slice(0, 50).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) for (const path of paths) verify(path, run);
