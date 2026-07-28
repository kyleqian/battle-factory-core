import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly attackerSide: "player" | "opponent";
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
  };
}

interface Sprite {
  readonly template: number;
  readonly callback: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly matrixNum: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly sprites: readonly Sprite[];
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly animScriptActive: boolean;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly dispcnt: number;
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bldy: number;
}

interface Probe {
  readonly schema: string;
  readonly templates: Readonly<Record<string, number>>;
  readonly callbacks: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: headbuttEvidence.ts <player-fixture> <opponent-fixture>");
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const digests = new Map<string, string>();

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-headbutt-evidence-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  if (probe.schema !== "headbutt-dense-evidence/v1") {
    throw new Error(`unexpected probe schema ${probe.schema}`);
  }
  const digest = createHash("sha256").update(readFileSync(output)).digest("hex");
  const priorDigest = digests.get(fixture.orientation);
  if (priorDigest !== undefined && priorDigest !== digest) {
    throw new Error(
      `${fixture.orientation}: fresh probe changed ${priorDigest} -> ${digest}`,
    );
  }
  digests.set(fixture.orientation, digest);

  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const errors: string[] = [];
  let matched = 0;
  for (
    let frame = fixture.denseWindow.startFrame;
    frame <= fixture.denseWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.denseWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const raw = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
    const rawDigest = createHash("sha256").update(raw).digest("hex");
    const bow = actual.sprites.filter(
      (sprite) => sprite.template === probe.templates.gBowMonSpriteTemplate,
    );
    const impact = actual.sprites.filter(
      (sprite) =>
        sprite.template === probe.templates.gFlashingHitSplatSpriteTemplate,
    );
    const bowExpected = (age >= 4 && age <= 15)
      || (age >= 21 && age <= 26) || (age >= 28 && age <= 39);
    const impactExpected = age >= 28 && age <= 40;
    const taskExpected = age >= 28 && age <= 37;
    const active = age < 47 ? actual.animScriptActive : !actual.animScriptActive;
    const tasks = taskExpected
      ? actual.tasks.length >= 1
        && actual.tasks.every((task) =>
          Object.values(probe.taskFuncs).includes(task.func))
      : actual.tasks.length === 0;
    const prior = frames.get(frame - 1);
    const hardwareSprites = prior
      ? [prior.playerSprite, prior.opponentSprite]
      : [];
    const hardware = hardwareSprites.every((sprite) =>
      actual.hardwareOam.some((item) =>
        same(item, [sprite.attr0, sprite.attr1, sprite.attr2]))
      && same(actual.hardwareMatrices[sprite.matrixNum], [
        sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
      ])
      && actual.hardwarePalette
        .slice(256 + (sprite.attr2 >>> 12) * 16, 272 + (sprite.attr2 >>> 12) * 16)
        .every((color, index) =>
          color === prior!.fadedPalette[
            256 + (sprite.attr2 >>> 12) * 16 + index
          ])
    );
    const headbuttSound = age !== 4 || (
      actual.se1.songHeader === probe.songHeaders.SE_M_HEADBUTT
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === (
        fixture.attackerSide === "player" ? -64 : 63
      )
    );
    const impactSound = age !== 28 || (
      actual.se1.songHeader === probe.songHeaders.SE_M_VITAL_THROW2
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === (
        fixture.attackerSide === "player" ? 63 : -63
      )
    );
    const registers = actual.dispcnt === 0xBF40
      && actual.bldcnt === 0 && actual.bldalpha === 0 && actual.bldy === 0;
    const shape = bow.length === (bowExpected ? 1 : 0)
      && impact.length === (impactExpected ? 1 : 0)
      && tasks && active && hardware && headbuttSound && impactSound
      && registers && rawDigest === actual.sha256;
    if (shape) matched += 1;
    else errors.push(
      `frame ${frame}/age ${age}: bow=${bow.length} impact=${impact.length} `
      + `tasks=${tasks} active=${active} hardware=${hardware} `
      + `headbuttSound=${headbuttSound} impactSound=${impactSound} `
      + `registers=${registers} raw=${rawDigest === actual.sha256}`,
    );
  }
  const total =
    fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
  console.log(
    `${fixture.orientation} run ${runNumber}: ${matched}/${total} `
    + `dense source/hardware/audio/raw-RGB frames; digest ${digest}`,
  );
  if (errors.length) {
    console.error(errors.slice(0, 40).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath, runNumber);
}
