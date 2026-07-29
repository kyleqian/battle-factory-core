import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  REST_FRAME_COUNT,
  REST_LETTER_SPAWN_AGES,
  restAtAge,
} from "../../src/animation/rest.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRestView,
  type SceneOnPresentationBattler,
  type SceneOnRestFieldProfile,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

type Window = { startFrame: number; endFrame: number; frameCount: number };
type Fixture = {
  schema: "rest-portable-evidence/v1";
  orientation: string;
  scenario: string;
  probe: string;
  appStage: { presentationAge: number };
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
  fieldProfile: SceneOnRestFieldProfile;
  sourceWindow: Window;
  evidenceSha256: string;
  rawRgbSha256: string;
  lifecycleCounts: Record<string, number>;
  topology: unknown;
  battleState: {
    attackerSide: "player" | "opponent";
    damagedHp: number;
    maxHp: number;
    status1: number;
    statusKind: "sleep";
    statusTurns: number;
    heldItem: number;
  };
};
type Sprite = {
  slot: number;
  attr: number[];
  matrix: number[];
  data: number[];
  template: { symbol: string | null };
  callback: { symbol: string | null };
};
type Battler = {
  hp: number;
  maxHp: number;
  item: number;
  status1: number;
  status: { kind: string; turns?: number };
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
  schema: "rest-dense-evidence/v1";
  sourceWindow: Window;
  lifecycleCounts: Record<string, number>;
  topology: unknown;
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: restPortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function expectedSprite(
  age: number,
  side: "player" | "opponent",
  letter: ReturnType<typeof restAtAge>["letters"][number],
): unknown {
  const localAge = age - REST_LETTER_SPAWN_AGES[letter.index]!;
  const direction = side === "player" ? 1 : -1;
  return {
    slot: letter.slot,
    centerX: letter.x + letter.x2,
    spriteOamY:
      (letter.y + letter.y2 - (side === "opponent" ? 16 : 0)) & 0xff,
    matrix: [letter.matrix.a, letter.matrix.b, letter.matrix.c, letter.matrix.d],
    data: [
      localAge * (localAge + 1) / 2,
      localAge + 1,
      0,
      direction,
      direction * 2 * (localAge + 1),
    ],
    callback: "AnimSleepLetterZ_Step",
  };
}

function observedSprite(sprite: Sprite): unknown {
  return {
    slot: sprite.slot,
    centerX: (sprite.attr[1]! & 0x1ff) + 16,
    spriteOamY: sprite.attr[0]! & 0xff,
    matrix: sprite.matrix,
    data: sprite.data.slice(0, 5),
    callback: sprite.callback.symbol,
  };
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-rest-portable-"));
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
    fixture.schema !== "rest-portable-evidence/v1"
    || probe.schema !== "rest-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.lifecycleCounts, fixture.lifecycleCounts)
    || !same(probe.topology, fixture.topology)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== REST_FRAME_COUNT
    || !fields
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const stage = createSceneOnMovePresentation({
    move: "REST",
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
    const component = restAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attacker.geometry.animationCenter,
    );
    const seam = sceneOnRestView({ ...stage, age });
    const seamMatch = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      component,
    );
    const sourceSprites = oracle.sprites.filter(
      (sprite) => sprite.template.symbol === "gSleepLetterZSpriteTemplate",
    );
    const hardwareMatch = same(
      component.letters.map((letter) =>
        expectedSprite(age, fixture.attacker.geometry.side, letter)
      ),
      sourceSprites.map(observedSprite),
    );
    const attacker = oracle.battlers[fixture.battleState.attackerSide];
    const battleStateMatch =
      attacker.hp === fixture.battleState.damagedHp
      && attacker.maxHp === fixture.battleState.maxHp
      && attacker.item === fixture.battleState.heldItem
      && attacker.status1 === fixture.battleState.status1
      && attacker.status.kind === fixture.battleState.statusKind
      && attacker.status.turns === fixture.battleState.statusTurns;
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
    const cleanup = index !== REST_FRAME_COUNT - 1
      || (!component.active
        && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    if (
      !seamMatch || !hardwareMatch || !battleStateMatch
      || diff !== 0 || !cleanup
    ) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${seamMatch} `
        + `hardware=${hardwareMatch} battle=${battleStateMatch} `
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
    + `${probe.frames.length}/${REST_FRAME_COUNT} `
    + "source/hardware/seam/framebuffer exact",
  );
}

for (const fixturePath of fixturePaths) {
  verify(fixturePath, 1);
  verify(fixturePath, 2);
}
