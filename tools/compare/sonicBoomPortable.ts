import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { sonicBoomEffectAtAge } from "../../src/animation/sonicBoom.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSonicBoomView,
  type SceneOnSonicBoomConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

interface Fixture extends SceneOnSonicBoomConfig {
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

interface ProbeSprite {
  readonly slot: number;
  readonly template: Readonly<{ address: number; symbol: string | null }>;
  readonly callback: Readonly<{ symbol: string | null }>;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr: readonly number[];
  readonly matrixNum: number;
  readonly matrix: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly {
    readonly func: Readonly<{ symbol: string | null }>;
  }[];
  readonly sprites: readonly ProbeSprite[];
  readonly playerSprite: ProbeSprite;
  readonly opponentSprite: ProbeSprite;
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly registers: Readonly<{ bldcnt: number; bldalpha: number }>;
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly {
      readonly flags: number;
      readonly panX: number;
    }[];
  };
}

interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly templates: Readonly<Record<
    "gSonicBoomSpriteTemplate" | "gBasicHitSplatSpriteTemplate",
    number
  >>;
  readonly songHeaders: Readonly<Record<"SE_M_RAZOR_WIND2", number>>;
  readonly topology: {
    readonly tasks: readonly string[];
    readonly templates: readonly string[];
    readonly callbacks: readonly string[];
  };
  readonly frames: readonly ProbeFrame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: sonicBoomPortable.ts <player-fixture> <opponent-fixture>",
  );
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const freshDigests = new Map<string, { evidence: string; raw: string }>();

function littleEndian16(value: number): string {
  return `${(value & 0xff).toString(16).padStart(2, "0")}${
    (value >>> 8 & 0xff).toString(16).padStart(2, "0")
  }`;
}

function expectedScriptOffset(age: number): number {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 9) return 8;
  if (age <= 27) return 78;
  if (age <= 33) return 96;
  if (age <= 46) return 50;
  return 54;
}

function verify(fixturePath: string): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-sonic-portable-"));
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
  if (probe.schema !== "sonic-boom-dense-evidence/v1") {
    throw new Error(`unexpected probe schema ${probe.schema}`);
  }
  if (!same(probe.sourceWindow, fixture.sourceWindow)) {
    throw new Error(`${fixture.orientation}: source window changed`);
  }
  for (const required of [
    "gSonicBoomSpriteTemplate",
    "gBasicHitSplatSpriteTemplate",
  ]) {
    if (!probe.topology.templates.includes(required)) {
      throw new Error(`${fixture.orientation}: missing ${required}`);
    }
  }
  const evidenceDigest = createHash("sha256").update(bytes).digest("hex");
  const rawHash = createHash("sha256");
  for (const frame of probe.frames) {
    rawHash.update(readFileSync(
      join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
    ));
  }
  const rawDigest = rawHash.digest("hex");
  if (evidenceDigest !== fixture.evidenceSha256) {
    throw new Error(
      `${fixture.orientation}: evidence ${evidenceDigest} `
      + `!= ${fixture.evidenceSha256}`,
    );
  }
  if (rawDigest !== fixture.rawRgbSha256) {
    throw new Error(
      `${fixture.orientation}: raw ${rawDigest} != ${fixture.rawRgbSha256}`,
    );
  }
  const priorDigest = freshDigests.get(fixture.orientation);
  if (priorDigest && (
    priorDigest.evidence !== evidenceDigest || priorDigest.raw !== rawDigest
  )) {
    throw new Error(`${fixture.orientation}: fresh receipt diverged`);
  }
  freshDigests.set(fixture.orientation, {
    evidence: evidenceDigest,
    raw: rawDigest,
  });

  const stage = createSceneOnMovePresentation({
    move: "SONIC_BOOM",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const relevantTemplates = new Set([
    probe.templates.gSonicBoomSpriteTemplate,
    probe.templates.gBasicHitSplatSpriteTemplate,
  ]);
  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const mismatches: string[] = [];
  let componentMatches = 0;
  let framebufferMatches = 0;

  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const expected = sonicBoomEffectAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attacker.geometry.animationCenter,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnSonicBoomView({ ...stage, age });
    const actualEffects = actual.sprites.filter((sprite) =>
      relevantTemplates.has(sprite.template.address)
    ).map((sprite) => ({
      template: sprite.template.address,
      slot: sprite.slot,
      callback: sprite.callback.symbol,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      matrix: sprite.matrix,
    }));
    const expectedEffects = expected.sprites.map((sprite) => ({
      template: sprite.kind === "air-wave"
        ? probe.templates.gSonicBoomSpriteTemplate
        : probe.templates.gBasicHitSplatSpriteTemplate,
      slot: sprite.oamSlot,
      callback: sprite.callback === "translate"
        ? "AnimTranslateLinear_WithFollowup"
        : sprite.callback === "destroy"
          ? "DestroyAnimSprite"
          : sprite.callback === "affine"
            ? "RunStoredCallbackWhenAffineAnimEnds"
            : "DestroyAnimSprite",
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      matrix: [
        sprite.matrix.a,
        sprite.matrix.b,
        sprite.matrix.c,
        sprite.matrix.d,
      ],
    }));
    const sprites = same(actualEffects, expectedEffects);

    const targetSprite = fixture.target.geometry.side === "player"
      ? actual.playerSprite
      : actual.opponentSprite;
    const targetBaseline =
      fixture.target.geometry.side === "opponent" && age < 28 ? 1 : 0;
    const offsets =
      targetSprite.x2 === expected.targetOffset.x2 + targetBaseline
      && targetSprite.y2 === expected.targetOffset.y2;
    const taskNames = actual.tasks.map((task) => task.func.symbol);
    const tasks =
      taskNames.includes("AnimTask_ShakeMon_Step")
        === expected.shakeTaskActive;
    const registers =
      actual.registers.bldcnt === (expected.alpha ? 0x3f40 : 0)
      && actual.registers.bldalpha === (expected.alpha ? 0x080c : 0);
    const source =
      actual.scriptOffset === expectedScriptOffset(age)
      && Boolean(actual.gAnimScriptActive) === expected.active;
    const counts =
      actual.visualTaskCount
        === expected.sprites.length + Number(expected.shakeTaskActive)
      && actual.soundTaskCount === 0;
    const soundEvent = expected.soundEvents.find((event) => event.age === age);
    const sound = soundEvent === undefined || (
      actual.se1.songHeader === probe.songHeaders[soundEvent.song]
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === soundEvent.pan
    );

    const prior = frames.get(frame - 1);
    const priorEffects = prior?.sprites.filter((sprite) =>
      relevantTemplates.has(sprite.template.address)
    ) ?? [];
    const hardwareOam = priorEffects.every((sprite) => {
      const attrs = littleEndian16(sprite.attr[0]!)
        + littleEndian16(sprite.attr[1]!)
        + littleEndian16(sprite.attr[2]!);
      return actual.hardwareOam.some((row) => row.startsWith(attrs));
    });
    const hardwareMatrices = priorEffects.every((sprite) =>
      same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix)
    );
    const hardwarePalette = !prior || priorEffects.every((sprite) => {
      const bank = sprite.attr[2]! >>> 12;
      const start = 256 + bank * 16;
      return actual.hardwarePalette.slice(start, start + 16).every(
        (color, offset) => color === prior.fadedPalette[start + offset],
      );
    });
    const seamShape =
      same(seam.sprites, expected.sprites)
      && same(seam.targetOffset, expected.targetOffset)
      && same(seam.alpha, expected.alpha)
      && seam.targetMonbg === expected.targetMonbg
      && seam.active === expected.active
      && seam.battlerDisplayAge === expected.battlerDisplayAge;
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
    if (diff === 0) framebufferMatches += 1;
    if (
      sprites && offsets && tasks && registers && source && counts && sound
      && hardwareOam && hardwareMatrices && hardwarePalette && seamShape
      && rawReceipt
    ) {
      componentMatches += 1;
    } else {
      mismatches.push(
        `frame ${frame}/age ${age}: sprites=${sprites} offsets=${offsets} `
        + `tasks=${tasks} regs=${registers} source=${source} counts=${counts} `
        + `sound=${sound} oam=${hardwareOam} matrices=${hardwareMatrices} `
        + `palette=${hardwarePalette} seam=${seamShape} raw=${rawReceipt}`,
      );
    }
    if (diff !== 0) {
      mismatches.push(`frame ${frame}/age ${age}: framebufferDiff=${diff}`);
    }
  }

  console.log(
    `${fixture.orientation}: components `
    + `${componentMatches}/${fixture.sourceWindow.frameCount}; framebuffer `
    + `${framebufferMatches}/${fixture.sourceWindow.frameCount}; `
    + `evidence ${evidenceDigest}; raw ${rawDigest}`,
  );
  if (mismatches.length) throw new Error(mismatches.join("\n"));
}

for (let repeat = 0; repeat < 2; repeat += 1) {
  for (const fixture of fixturePaths) verify(fixture);
}
