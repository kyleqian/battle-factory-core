import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  SWEET_KISS_FRAME_COUNT,
  sweetKissAtAge,
  type SweetKissHeart,
} from "../../src/animation/sweetKiss.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSweetKissView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

type Window = { startFrame: number; endFrame: number; frameCount: number };
type Fixture = {
  schema: "sweet-kiss-portable-evidence/v1";
  orientation: string;
  scenario: string;
  probe: string;
  appStage: { presentationAge: number };
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
  fieldProfile: SceneOnDragonRageFieldProfile;
  sourceWindow: Window;
  evidenceSha256: string;
  rawRgbSha256: string;
  battleState: {
    attackerSide: "player" | "opponent";
    targetSide: "player" | "opponent";
    attackerItem: 183;
    targetConfusionTurns: 0;
  };
};
type Sprite = {
  slot: number;
  raw: string;
  attr: number[];
  matrixNum: number;
  matrix: number[];
  data: number[];
  template: { symbol: string | null };
  callback: { symbol: string | null };
};
type Battler = {
  species: number;
  hp: number;
  maxHp: number;
  item: number;
  status1: number;
  volatile: { confusionTurns: number };
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
  tasks: unknown[];
  sprites: Sprite[];
  battlers: { player: Battler; opponent: Battler };
  se1: unknown;
  se2: unknown;
  gAnimScriptActive: number;
  visualTaskCount: number;
};
type Probe = {
  schema: "sweet-kiss-dense-evidence/v1";
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
  throw new Error(
    "usage: sweetKissPortable.ts <player fixture> <opponent fixture>",
  );
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function observedCenter(sprite: Sprite, size: 16 | 32) {
  const half = size / 2;
  return {
    x: ((sprite.attr[1]! & 0x1ff) + half) & 0x1ff,
    y: ((sprite.attr[0]! & 0xff) + half) & 0xff,
  };
}

function expectedHeart(heart: SweetKissHeart) {
  return {
    slot: heart.slot,
    center: {
      x: (heart.x + heart.x2) & 0x1ff,
      y: (heart.y + heart.y2) & 0xff,
    },
    data: [
      heart.data0,
      heart.data1,
      heart.data2,
      heart.data3,
      heart.data4,
      0,
      0,
      0,
    ],
    callback: heart.callback,
    invisible: heart.invisible,
  };
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-sweet-kiss-"));
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
    fixture.schema !== "sweet-kiss-portable-evidence/v1"
    || probe.schema !== "sweet-kiss-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== SWEET_KISS_FRAME_COUNT
    || probe.lifecycleCounts.gAngelSpriteTemplate !== 1
    || probe.lifecycleCounts.gRedHeartBurstSpriteTemplate !== 6
    || !probe.topology.callbacks.includes("AnimAngel")
    || !probe.topology.callbacks.includes("AnimParticleBurst")
    || !fields
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const stage = createSceneOnMovePresentation({
    move: "SWEET_KISS",
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
    const component = sweetKissAtAge(
      age,
      fixture.target.geometry.side,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnSweetKissView({ ...stage, age });
    const {
      age: _age,
      attacker: _attacker,
      target: _target,
      ...seamComponent
    } = seam;
    const seamMatch = same(seamComponent, component);

    const sourceAngel = oracle.sprites.find(
      (sprite) => sprite.template.symbol === "gAngelSpriteTemplate",
    );
    const angelMatch = component.angel
      ? !!sourceAngel
        && same(observedCenter(sourceAngel, 32), {
          x: (component.angel.x + component.angel.x2) & 0x1ff,
          y: (component.angel.y + component.angel.y2) & 0xff,
        })
        && same(sourceAngel.data, [
          component.angel.data0,
          0,
          component.angel.data2,
          0,
          0,
          0,
          0,
          0,
        ])
        && sourceAngel.callback.symbol === component.angel.callback
      : !sourceAngel;
    const sourceHearts = oracle.sprites
      .filter((sprite) =>
        sprite.template.symbol === "gRedHeartBurstSpriteTemplate"
      )
      .map((sprite) => ({
        slot: sprite.slot,
        center: (Number.parseInt(sprite.raw.slice(124, 126), 16) & 4) !== 0
          ? null
          : observedCenter(sprite, 16),
        data: sprite.data,
        callback: sprite.callback.symbol,
        invisible:
          (Number.parseInt(sprite.raw.slice(124, 126), 16) & 4) !== 0,
      }));
    const heartsMatch = same(
      component.hearts.map((heart) => ({
        ...expectedHeart(heart),
        center: heart.invisible ? null : expectedHeart(heart).center,
      })),
      sourceHearts,
    );
    const tagsMatch =
      oracle.tileTags.includes(305) === component.redHeartLoaded
      && oracle.tileTags.includes(309) === component.angelLoaded;
    const attacker = oracle.battlers[fixture.battleState.attackerSide];
    const target = oracle.battlers[fixture.battleState.targetSide];
    const battleStateMatch =
      attacker.species === 325
      && attacker.item === fixture.battleState.attackerItem
      && attacker.status1 === 0
      && target.species === 95
      && target.volatile.confusionTurns
        === fixture.battleState.targetConfusionTurns;
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
    const cleanup = index !== SWEET_KISS_FRAME_COUNT - 1
      || (!component.active
        && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    if (
      !seamMatch || !angelMatch || !heartsMatch || !tagsMatch
      || !battleStateMatch || diff !== 0 || !cleanup
    ) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${seamMatch} `
        + `angel=${angelMatch} hearts=${heartsMatch} tags=${tagsMatch} `
        + `battle=${battleStateMatch} framebuffer=${diff === 0} `
        + `diff=${diff} cleanup=${cleanup}`,
      );
    }
  }
  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    failures.push(`raw RGB window digest ${rawDigest} changed`);
  }
  if (failures.length) throw new Error(failures.slice(0, 170).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length}/${SWEET_KISS_FRAME_COUNT} `
    + "source/hardware/audio/seam/framebuffer exact",
  );
}

for (const fixturePath of fixturePaths) {
  verify(fixturePath, 1);
  verify(fixturePath, 2);
}
