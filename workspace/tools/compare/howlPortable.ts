import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  HOWL_FRAME_COUNT,
  howlAtAge,
} from "../../src/animation/howl.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHowlView,
  type SceneOnHowlFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Window = { startFrame: number; endFrame: number; frameCount: number };
type Fixture = {
  schema: "howl-portable-evidence/v1";
  orientation: string;
  scenario: string;
  probe: string;
  appStage: { presentationAge: number };
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
  fieldProfile: SceneOnHowlFieldProfile;
  sourceWindow: Window;
  evidenceSha256: string;
  rawRgbSha256: string;
  battleState: {
    attackerSide: "player" | "opponent";
    hp: number;
    maxHp: number;
    heldItem: number;
    attackStage: 7;
  };
};
type Sprite = {
  slot: number;
  attr: number[];
  matrixNum: number;
  matrix: number[];
  data: number[];
  template: { symbol: string | null };
  callback: { symbol: string | null };
};
type Task = {
  slot: number;
  data: number[];
  func: { symbol: string | null };
};
type Battler = {
  species: number;
  hp: number;
  maxHp: number;
  item: number;
  status1: number;
  statStages: number[];
};
type Frame = {
  frame: number;
  sha256: string;
  scriptOffset: number | null;
  softwareOam: string[];
  hardwareOam: string[];
  hardwareMatrices: number[][];
  fadedPalette: number[];
  unfadedPalette: number[];
  hardwarePalette: number[];
  paletteTags: number[];
  tileTags: number[];
  registers: Record<string, number>;
  tasks: Task[];
  sprites: Sprite[];
  battlers: { player: Battler; opponent: Battler };
  se1: unknown;
  se2: unknown;
  gAnimScriptActive: number;
  visualTaskCount: number;
};
type Probe = {
  schema: "howl-dense-evidence/v1";
  sourceWindow: Window;
  lifecycleCounts: Record<string, number>;
  topology: {
    tasks: string[];
    templates: string[];
    callbacks: string[];
  };
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: howlPortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function observedNoise(sprite: Sprite): unknown {
  return {
    slot: sprite.slot,
    centerX: (sprite.attr[1]! & 0x1ff) + 16,
    centerY: ((sprite.attr[0]! & 0xff) + 16) & 0xff,
    hFlip: (sprite.attr[1]! & 0x1000) !== 0,
    vFlip: (sprite.attr[1]! & 0x2000) !== 0,
    data: [sprite.data[0], sprite.data[1], sprite.data[5], sprite.data[6], sprite.data[7]],
    callback: sprite.callback.symbol,
  };
}

function expectedNoise(
  line: ReturnType<typeof howlAtAge>["noiseLines"][number],
  side: "player" | "opponent",
): unknown {
  const direction = side === "player" ? 1 : -1;
  const yDirection = line.line === 0 ? -1 : line.line === 2 ? 1 : 0;
  return {
    slot: line.slot,
    centerX: line.centerX,
    centerY: line.centerY & 0xff,
    hFlip: line.hFlip,
    vFlip: line.vFlip,
    data: [
      direction * 0x280,
      yDirection * 0x280,
      line.callbackCount,
      direction * 0x280 * line.callbackCount,
      yDirection * 0x280 * line.callbackCount,
    ],
    callback: line.callback,
  };
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = createScratchDir("pokebench-howl-portable-");
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
  const fields = probe.frames.every((frame) =>
    frame.softwareOam.length === 128
    && frame.hardwareOam.length === 128
    && frame.hardwareMatrices.length === 32
    && frame.hardwareMatrices.every((matrix) => matrix.length === 4)
    && frame.fadedPalette.length === 512
    && frame.unfadedPalette.length === 512
    && frame.hardwarePalette.length === 512
    && frame.paletteTags.length === 16
    && frame.tileTags.length === 128
    && Object.keys(frame.registers).length === 8
    && Array.isArray(frame.tasks)
    && Array.isArray(frame.sprites)
    && frame.se1 !== null
    && frame.se2 !== null
  );
  if (
    fixture.schema !== "howl-portable-evidence/v1"
    || probe.schema !== "howl-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== HOWL_FRAME_COUNT
    || probe.lifecycleCounts.gRoarNoiseLineSpriteTemplate !== 6
    || !probe.topology.tasks.includes("AnimTask_DeepInhale_Step")
    || !probe.topology.tasks.includes("Task_DuckBGMForPokemonCry")
    || !fields
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const stage = createSceneOnMovePresentation({
    move: "HOWL",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  const raw = createHash("sha256");
  for (const [index, oracle] of probe.frames.entries()) {
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    raw.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) {
      failures.push(`frame ${oracle.frame}: raw RGB digest changed`);
      continue;
    }
    const age = fixture.appStage.presentationAge + index;
    const component = howlAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attacker.geometry.battlePositionCenter,
    );
    const seam = sceneOnHowlView({ ...stage, age });
    const {
      age: _age,
      attacker: _attacker,
      target: _target,
      ...seamComponent
    } = seam;
    const seamMatch = same(seamComponent, component);

    const sourceNoise = oracle.sprites
      .filter((sprite) => sprite.template.symbol === "gRoarNoiseLineSpriteTemplate")
      .map(observedNoise);
    const noiseMatch = same(
      component.noiseLines.map((line) =>
        expectedNoise(line, fixture.attacker.geometry.side)
      ),
      sourceNoise,
    );
    const attackerSprite = oracle.sprites.find(
      (sprite) => sprite.data[2] === 371,
    );
    const softwareAffineMatch = !attackerSprite
      ? false
      : same(attackerSprite.matrix, [
          component.attackerTransform.matrix.a,
          0,
          0,
          component.attackerTransform.matrix.d,
        ]);
    const hardwareComponent = howlAtAge(
      age - 2,
      fixture.attacker.geometry.side,
      fixture.attacker.geometry.battlePositionCenter,
    );
    const hardwareAffineMatch = !attackerSprite
      ? false
      : same(oracle.hardwareMatrices[attackerSprite.matrixNum], [
          hardwareComponent.attackerTransform.matrix.a,
          0,
          0,
          hardwareComponent.attackerTransform.matrix.d,
        ]);
    const attacker = oracle.battlers[fixture.battleState.attackerSide];
    const battleStateMatch =
      attacker.species === 371
      && attacker.hp === fixture.battleState.hp
      && attacker.maxHp === fixture.battleState.maxHp
      && attacker.item === fixture.battleState.heldItem
      && attacker.status1 === 0
      && attacker.statStages[1] === fixture.battleState.attackStage;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel++) {
      if (
        app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
      ) diff += 1;
    }
    const cleanup = index !== HOWL_FRAME_COUNT - 1
      || (!component.active
        && !component.noiseLineLoaded
        && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    if (
      !seamMatch || !noiseMatch || !softwareAffineMatch
      || !hardwareAffineMatch || !battleStateMatch || diff !== 0 || !cleanup
    ) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${seamMatch} `
        + `noise=${noiseMatch} softwareAffine=${softwareAffineMatch} `
        + `hardwareAffine=${hardwareAffineMatch} battle=${battleStateMatch} `
        + `framebuffer=${diff === 0} diff=${diff} cleanup=${cleanup}`,
      );
    }
  }
  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    failures.push(`raw RGB window digest ${rawDigest} changed`);
  }
  if (failures.length) throw new Error(failures.slice(0, 110).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length}/${HOWL_FRAME_COUNT} `
    + "source/hardware/audio/seam/framebuffer exact",
  );
}

for (const fixturePath of fixturePaths) {
  verify(fixturePath, 1);
  verify(fixturePath, 2);
}
