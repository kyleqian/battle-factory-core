import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { whirlpoolAtAge, type WhirlpoolBody } from "../../src/animation/whirlpool.ts";
import {
  createSceneOnMovePresentation,
  sceneOnWhirlpoolView,
  type SceneOnWhirlpoolConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Side = "player" | "opponent";
type Fixture = {
  readonly schema:
    | "whirlpool-main-portable-evidence/v1"
    | "status-whirlpool-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly targetSide: Side;
};
type Sprite = {
  readonly slot: number;
  readonly template: { readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly attr: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: readonly number[];
  readonly hardwareMatrix: readonly number[];
};
type Frame = {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly sprites: readonly Sprite[];
  readonly tasks: readonly {
    readonly func: { readonly symbol: string | null };
  }[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly registers: Record<string, number>;
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly battlers: {
    readonly player: Record<string, unknown>;
    readonly opponent: Record<string, unknown>;
  };
  readonly engine: { readonly currentMove: number };
};
type Probe = {
  readonly schema:
    | "whirlpool-main-dense-evidence/v1"
    | "status-whirlpool-dense-evidence/v1";
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly lifecycleCounts: { readonly whirlpoolOrb: number };
  readonly songHeaders: { readonly SE_M_WHIRLPOOL: number };
  readonly frames: readonly Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 4) {
  throw new Error(
    "usage: whirlpoolPortable.ts <main player> <main opponent> "
      + "<status player> <status opponent>",
  );
}
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const receipts = new Map<string, { evidence: string; raw: string }>();

function presentationConfig(
  fixture: Fixture,
  body: WhirlpoolBody,
): SceneOnWhirlpoolConfig {
  const playerToOpponent = fixture.targetSide === "opponent";
  return {
    move: "WHIRLPOOL",
    body,
    attacker: playerToOpponent
      ? {
          species: "WAILMER",
          geometry: {
            side: "player",
            spriteCorner: { x: 40, y: 69 },
            animationCenter: { x: 72, y: 101 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        }
      : {
          species: "WAILMER",
          geometry: {
            side: "opponent",
            spriteCorner: { x: 144, y: 23 },
            animationCenter: { x: 176, y: 55 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        },
    target: playerToOpponent
      ? {
          species: "ONIX",
          geometry: {
            side: "opponent",
            spriteCorner: { x: 144, y: 10 },
            animationCenter: { x: 176, y: 42 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        }
      : {
          species: "ONIX",
          geometry: {
            side: "player",
            spriteCorner: { x: 40, y: 48 },
            animationCenter: { x: 72, y: 88 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        },
    fieldProfile: body === "main"
      ? playerToOpponent
        ? {
            playerHp: 205,
            playerMaxHp: 205,
            opponentHp: 142,
            opponentMaxHp: 142,
            playerGender: "male",
            opponentGender: "male",
          }
        : {
            playerHp: 142,
            playerMaxHp: 142,
            opponentHp: 205,
            opponentMaxHp: 205,
            playerGender: "male",
            opponentGender: "male",
          }
      : playerToOpponent
        ? {
            playerHp: 194,
            playerMaxHp: 205,
            opponentHp: 80,
            opponentMaxHp: 142,
            playerGender: "male",
            opponentGender: "male",
          }
        : {
            playerHp: 86,
            playerMaxHp: 142,
            opponentHp: 194,
            opponentMaxHp: 205,
            playerGender: "male",
            opponentGender: "male",
          },
  };
}

function writeAppRgb(path: string, app: Uint8Array): void {
  const rgb = Buffer.alloc(240 * 160 * 3);
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    rgb[pixel * 3] = app[pixel * 4]!;
    rgb[pixel * 3 + 1] = app[pixel * 4 + 1]!;
    rgb[pixel * 3 + 2] = app[pixel * 4 + 2]!;
  }
  writeFileSync(path, rgb);
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture =
    JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const body: WhirlpoolBody =
    fixture.schema.startsWith("status-") ? "residual" : "main";
  const expectedCount = body === "main" ? 133 : 108;
  const scratch = createScratchDir("pokebench-whirlpool-live-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawWindow = createHash("sha256");
  const failures: string[] = [];
  const expectedSchema = body === "main"
    ? "whirlpool-main-dense-evidence/v1"
    : "status-whirlpool-dense-evidence/v1";
  const expectedLifecycles = body === "main" ? 18 : 12;
  if (
    fixture.oracleProfile !== "battle-scene-on"
    || fixture.sourceWindow.frameCount !== expectedCount
    || !same(fixture.sourceWindow, probe.sourceWindow)
    || probe.schema !== expectedSchema
    || probe.lifecycleCounts.whirlpoolOrb !== expectedLifecycles
    || probe.frames.length !== expectedCount
  ) failures.push("fixture/source receipt");

  const config = presentationConfig(fixture, body);
  const stage = createSceneOnMovePresentation(config);
  const first = probe.frames[0]!;
  let semanticMatches = 0;
  let framebufferMatches = 0;
  for (const [age, oracle] of probe.frames.entries()) {
    const frameFailureStart = failures.length;
    const raw = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    rawWindow.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== oracle.sha256) {
      failures.push(`age ${age}: raw RGB hash`);
    }
    const predicted = whirlpoolAtAge(
      age,
      body,
      fixture.targetSide,
      config.target.geometry.battlePositionCenter,
    );
    const seam = sceneOnWhirlpoolView({ ...stage, age });
    const {
      age: _age,
      attacker: _attacker,
      target: _target,
      ...seamState
    } = seam;
    if (!same(predicted, seamState)) failures.push(`age ${age}: typed seam`);
    if (Boolean(oracle.gAnimScriptActive) !== predicted.active) {
      failures.push(`age ${age}: active cleanup`);
    }
    if (
      oracle.visualTaskCount !== predicted.visualTaskCount
      || oracle.soundTaskCount !== predicted.soundTaskCount
    ) failures.push(`age ${age}: task counts`);
    const actualOrbs = oracle.sprites.filter(
      (sprite) => sprite.template.symbol === "gWhirlpoolSpriteTemplate",
    ).sort((left, right) => left.slot - right.slot);
    const predictedOrbs = predicted.orbs.slice().sort(
      (left, right) => left.oamSlot - right.oamSlot,
    );
    if (actualOrbs.length !== predictedOrbs.length) {
      failures.push(`age ${age}: vortex count`);
    } else {
      for (const [index, actual] of actualOrbs.entries()) {
        const expected = predictedOrbs[index]!;
        if (!same(
          {
            slot: actual.slot,
            x: actual.x,
            y: actual.y,
            x2: actual.x2,
            y2: actual.y2,
            matrix: actual.matrix,
            callback: actual.callback.symbol,
          },
          {
            slot: expected.oamSlot,
            x: expected.x,
            y: expected.y,
            x2: expected.x2,
            y2: expected.y2,
            matrix: [
              expected.matrix.a,
              expected.matrix.b,
              expected.matrix.c,
              expected.matrix.d,
            ],
            callback: expected.callback,
          },
        )) failures.push(`age ${age}: vortex slot ${actual.slot}`);
        const prior = whirlpoolAtAge(
          age - 1,
          body,
          fixture.targetSide,
          config.target.geometry.battlePositionCenter,
        ).orbs.find((orb) => orb.oamSlot === expected.oamSlot);
        const hardwareMatrix = !prior
          || (body === "residual" && expected.localAge === 1)
          ? [256, 0, 0, 256]
          : [
              prior.matrix.a,
              prior.matrix.b,
              prior.matrix.c,
              prior.matrix.d,
            ];
        if (!same(actual.hardwareMatrix, hardwareMatrix)) {
          failures.push(`age ${age}: affine latch slot ${actual.slot}`);
        }
      }
    }
    const shaking = oracle.tasks.some(
      (task) => task.func.symbol === "AnimTask_ShakeMon_Step",
    );
    if (shaking !== predicted.targetShakeActive) {
      failures.push(`age ${age}: 50/30-tick ShakeMon`);
    }
    if (
      oracle.paletteTags.includes(10149) !== predicted.waterOrbLoaded
      || oracle.tileTags.includes(10149) !== predicted.waterOrbLoaded
      || oracle.registers.bldcnt !== predicted.registers.bldcnt
      || oracle.registers.bldalpha !== predicted.registers.bldalpha
      || oracle.fadedPalette.length !== 512
      || oracle.unfadedPalette.length !== 512
      || oracle.hardwarePalette.length !== 512
      || oracle.softwareOam.length !== 128
      || oracle.hardwareOam.length !== 128
    ) failures.push(`age ${age}: tags/register/OAM shape`);
    if (predicted.whirlpoolAudio) {
      const audible = oracle.se1.tracks.some(
        (track) =>
          track.flags === predicted.whirlpoolAudio!.flags
          && track.panX === predicted.whirlpoolAudio!.pan,
      );
      if (
        oracle.se1.songHeader !== probe.songHeaders.SE_M_WHIRLPOOL
        || !audible
      ) failures.push(`age ${age}: target-pan audio`);
    }
    for (const side of ["player", "opponent"] as const) {
      for (
        const key of [
          "species",
          "hp",
          "maxHp",
          "item",
          "status1",
          "status2",
          "status3",
        ]
      ) {
        if (oracle.battlers[side][key] !== first.battlers[side][key]) {
          failures.push(`age ${age}: gameplay ${side}.${key}`);
        }
      }
    }
    if (
      oracle.engine.currentMove !== (body === "main" ? 250 : 0)
    ) failures.push(`age ${age}: currentMove`);
    if (failures.length === frameFailureStart) semanticMatches += 1;

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
    if (diff === 0) framebufferMatches += 1;
    else {
      failures.push(`age ${age}: framebuffer diff ${diff}`);
      if (runNumber === 1 && framebufferMatches === age) {
        writeAppRgb(join(scratch, `app-age-${age}.rgb`), app);
      }
    }
  }
  const raw = rawWindow.digest("hex");
  if (evidence !== fixture.evidenceSha256) {
    failures.push(`evidence receipt ${evidence}`);
  }
  if (raw !== fixture.rawRgbSha256) failures.push(`raw RGB receipt ${raw}`);
  const receiptKey = `${body}/${fixture.orientation}`;
  const previous = receipts.get(receiptKey);
  if (previous && !same(previous, { evidence, raw })) {
    failures.push("fresh reproducibility");
  }
  receipts.set(receiptKey, { evidence, raw });
  console.log(
    `${body} ${fixture.orientation} run ${runNumber}: `
      + `${semanticMatches}/${expectedCount} semantic checks; `
      + `${framebufferMatches}/${expectedCount} production framebuffer; `
      + `evidence/raw-RGB ${evidence}/${raw}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 50).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath, run);
}
