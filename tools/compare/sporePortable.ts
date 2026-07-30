import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  SPORE_FRAME_COUNT,
  sporeAtAge,
  type SporeParticle,
} from "../../src/animation/spore.ts";
import {
  COTTON_SPORE_FRAME_COUNT,
  cottonSporeAtAge,
} from "../../src/animation/cottonSpore.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCottonSporeView,
  sceneOnSporeView,
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
  schema: "spore-portable-evidence/v1" | "cotton-spore-portable-evidence/v1";
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
    attackerItem: number;
    targetStatus1: 0;
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
  func: { symbol: string | null };
  data: number[];
};
type Battler = {
  species: number;
  hp: number;
  maxHp: number;
  item: number;
  status1: number;
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
  schema: "spore-dense-evidence/v1" | "cotton-spore-dense-evidence/v1";
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
  throw new Error("usage: sporePortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function observedCenter(sprite: Sprite) {
  return {
    x: ((sprite.attr[1]! & 0x1ff) + 8) & 0x1ff,
    y: ((sprite.attr[0]! & 0xff) + 8) & 0xff,
  };
}

function expectedParticle(particle: SporeParticle) {
  return {
    slot: particle.slot,
    center: {
      x: (particle.x + particle.x2) & 0x1ff,
      y: (particle.y + particle.y2) & 0xff,
    },
    data: [
      particle.data0,
      particle.data1,
      particle.data2,
      0,
      0,
      0,
      0,
      0,
    ],
    callback: particle.callback,
    priority: particle.priority,
    blend: particle.blend,
  };
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-spore-"));
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
  const isCotton = fixture.schema === "cotton-spore-portable-evidence/v1";
  const frameCount = isCotton ? COTTON_SPORE_FRAME_COUNT : SPORE_FRAME_COUNT;
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
    !(
      fixture.schema === "spore-portable-evidence/v1"
      || fixture.schema === "cotton-spore-portable-evidence/v1"
    )
    || probe.schema !== (
      isCotton
        ? "cotton-spore-dense-evidence/v1"
        : "spore-dense-evidence/v1"
    )
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== frameCount
    || probe.lifecycleCounts.gSporeParticleSpriteTemplate !== 9
    || !probe.topology.tasks.includes("Task_LoopAndPlaySE")
    || !probe.topology.tasks.includes("Task_UpdateMonBg")
    || !probe.topology.tasks.includes("Task_ClearMonBg")
    || !probe.topology.callbacks.includes("AnimSporeParticle_Step")
    || !fields
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const stage = createSceneOnMovePresentation({
    move: isCotton ? "COTTON_SPORE" : "SPORE",
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
    const component = isCotton
      ? cottonSporeAtAge(
          age,
          fixture.target.geometry.side,
          fixture.target.geometry.animationCenter,
        )
      : sporeAtAge(
          age,
          fixture.target.geometry.side,
          fixture.target.geometry.animationCenter,
        );
    const seam = isCotton
      ? sceneOnCottonSporeView({
          ...stage,
          config: { ...stage.config, move: "COTTON_SPORE" },
          age,
        })
      : sceneOnSporeView({
          ...stage,
          config: { ...stage.config, move: "SPORE" },
          age,
        });
    const {
      age: _age,
      attacker: _attacker,
      target: _target,
      ...seamComponent
    } = seam;
    const sourceParticles = oracle.sprites
      .filter((sprite) =>
        sprite.template.symbol === "gSporeParticleSpriteTemplate"
      )
      .map((sprite) => ({
        slot: sprite.slot,
        center: observedCenter(sprite),
        data: sprite.data,
        callback: sprite.callback.symbol,
        priority: (sprite.attr[2]! >> 10) & 3,
        blend: ((sprite.attr[0]! >> 10) & 3) === 1,
      }))
      .sort((a, b) => a.slot - b.slot);
    const particlesMatch = same(
      component.particles.map(expectedParticle).sort((a, b) => a.slot - b.slot),
      sourceParticles,
    );
    const soundTask = oracle.tasks.find(
      (task) => task.func.symbol === "Task_LoopAndPlaySE",
    );
    const soundMatch = component.soundLoopActive
      ? !!soundTask
        && soundTask.data[0] === 169
        && soundTask.data[1]
          === (fixture.target.geometry.side === "opponent" ? 63 : -63)
        && soundTask.data[2] === (isCotton ? 18 : 16)
      : !soundTask;
    const monBgMatch =
      oracle.tasks.some((task) => task.func.symbol === "Task_UpdateMonBg")
        === component.targetMonBg
      || age === (isCotton ? 202 : 205);
    const registerMatch = component.alpha
      ? oracle.registers.bldcnt === 16192
        && oracle.registers.bldalpha === 2060
      : oracle.registers.bldcnt === 0;
    const tagsMatch =
      oracle.tileTags.includes(10158) === component.sporeLoaded
      && oracle.paletteTags.includes(10158) === component.sporeLoaded;
    const attacker = oracle.battlers[fixture.battleState.attackerSide];
    const target = oracle.battlers[fixture.battleState.targetSide];
    const battleStateMatch =
      attacker.species === (isCotton ? 179 : 47)
      && attacker.item === fixture.battleState.attackerItem
      && attacker.status1 === 0
      && target.species === 95
      && target.status1 === fixture.battleState.targetStatus1;
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
    const cleanup = index !== frameCount - 1
      || (!component.active
        && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    const scriptMatch = oracle.scriptOffset === component.scriptOffset;
    const seamMatch = same(seamComponent, component);
    if (
      !seamMatch || !particlesMatch || !soundMatch || !monBgMatch
      || !registerMatch || !tagsMatch || !battleStateMatch || !scriptMatch
      || diff !== 0 || !cleanup
    ) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${seamMatch} `
        + `particles=${particlesMatch} sound=${soundMatch} monbg=${monBgMatch} `
        + `registers=${registerMatch} tags=${tagsMatch} `
        + `battle=${battleStateMatch} script=${scriptMatch} `
        + `framebuffer=${diff === 0} diff=${diff} cleanup=${cleanup}`,
      );
    }
  }
  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    failures.push(`raw RGB window digest ${rawDigest} changed`);
  }
  if (failures.length) throw new Error(failures.slice(0, 210).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length}/${frameCount} `
    + "source/OAM/matrix/palette/register/audio/seam/framebuffer exact",
  );
}

for (const fixturePath of fixturePaths) {
  verify(fixturePath, 1);
  verify(fixturePath, 2);
}
