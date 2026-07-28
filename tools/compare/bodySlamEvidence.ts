import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { bodySlamAtAge } from "../../src/animation/bodySlam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBodySlamView,
  type SceneOnBodySlamConfig,
} from "../../src/animation/sceneOnPresentation.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly attackerSide: "player" | "opponent";
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
}
interface Sprite {
  readonly template: number; readonly attr0: number; readonly attr1: number;
  readonly attr2: number; readonly matrixNum: number; readonly x: number;
  readonly y: number; readonly x2: number; readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}
interface Frame {
  readonly frame: number; readonly sha256: string; readonly animScriptActive: boolean;
  readonly playerSprite: Sprite; readonly opponentSprite: Sprite;
  readonly sprites: readonly Sprite[]; readonly tasks: readonly { func: number }[];
  readonly fadedPalette: readonly number[]; readonly hardwarePalette: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly se1: { readonly songHeader: number; readonly tracks: readonly {
    readonly flags: number; readonly panX: number;
  }[] };
  readonly dispcnt: number; readonly bldcnt: number;
  readonly bldalpha: number; readonly bldy: number;
}
interface Probe {
  readonly schema: string;
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: bodySlamEvidence.ts <player-fixture> <opponent-fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const digests = new Map<string, string>();

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-body-slam-evidence-"));
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
  if (probe.schema !== "body-slam-dense-evidence/v1") {
    throw new Error(`unexpected probe schema ${probe.schema}`);
  }
  const digest = createHash("sha256").update(readFileSync(output)).digest("hex");
  const prior = digests.get(fixture.orientation);
  if (prior !== undefined && prior !== digest) {
    throw new Error(`${fixture.orientation}: fresh probe changed ${prior} -> ${digest}`);
  }
  digests.set(fixture.orientation, digest);
  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const playerToOpponent = fixture.attackerSide === "player";
  const config: SceneOnBodySlamConfig = {
    move: "BODY_SLAM",
    attacker: {
      species: "LICKITUNG",
      geometry: playerToOpponent
        ? { side: "player", spriteCorner: { x: 40, y: 48 },
            animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } }
        : { side: "opponent", spriteCorner: { x: 144, y: 24 },
            animationCenter: { x: 176, y: 56 }, battlePositionCenter: { x: 176, y: 40 } },
    },
    target: {
      species: "ONIX",
      geometry: playerToOpponent
        ? { side: "opponent", spriteCorner: { x: 144, y: 10 },
            animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
        : { side: "player", spriteCorner: { x: 40, y: 48 },
            animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } },
    },
    fieldProfile: {
      playerHp: playerToOpponent ? 165 : 110,
      playerMaxHp: playerToOpponent ? 165 : 110,
      opponentHp: playerToOpponent ? 110 : 165,
      opponentMaxHp: playerToOpponent ? 110 : 165,
    },
  };
  const stage = createSceneOnMovePresentation(config);
  const errors: string[] = [];
  let matched = 0;
  for (let frame = fixture.denseWindow.startFrame;
    frame <= fixture.denseWindow.endFrame; frame += 1) {
    const age = frame - fixture.denseWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const expected = bodySlamAtAge(
      age, fixture.attackerSide, config.target.geometry.animationCenter,
    );
    const view = sceneOnBodySlamView({ ...stage, age });
    const attacker = playerToOpponent ? actual.playerSprite : actual.opponentSprite;
    const target = playerToOpponent ? actual.opponentSprite : actual.playerSprite;
    const targetIdle = playerToOpponent && age < 47 ? 1 : 0;
    const vertical = actual.sprites.filter(
      (s) => s.template === probe.templates.gVerticalDipSpriteTemplate,
    ).length;
    const offset = actual.sprites.filter(
      (s) => s.template === probe.templates.gSlideMonToOffsetSpriteTemplate,
    ).length;
    const original = actual.sprites.filter(
      (s) => s.template === probe.templates.gSlideMonToOriginalPosSpriteTemplate,
    ).length;
    const hits = actual.sprites.filter(
      (s) => s.template === probe.templates.gBasicHitSplatSpriteTemplate,
    );
    const priorFrame = frames.get(frame - 1);
    const priorBattlers = priorFrame
      ? [priorFrame.playerSprite, priorFrame.opponentSprite]
      : [];
    const hardware = !priorFrame || priorBattlers.every((sprite, index) =>
        // `monbg ANIM_DEF_PARTNER` transfers the target into BG and suppresses
        // its ordinary OBJ from the display OAM until `clearmonbg`.
        (index === (playerToOpponent ? 1 : 0) && age >= 6 && age <= 105
          || actual.hardwareOam.some(
            (oam) => same(oam, [sprite.attr0, sprite.attr1, sprite.attr2]),
          ))
        && same(actual.hardwareMatrices[sprite.matrixNum], [
          sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
        ])
        && actual.hardwarePalette
          .slice(256 + (sprite.attr2 >>> 12) * 16, 272 + (sprite.attr2 >>> 12) * 16)
          .every((color, i) =>
            color === priorFrame.fadedPalette[256 + (sprite.attr2 >>> 12) * 16 + i])
      );
    const audio = age !== 44 && age !== 54 || (
      actual.se1.songHeader === probe.songHeaders.SE_M_MEGA_KICK2
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === (playerToOpponent ? 63 : -63)
    );
    const raw = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
    const ok = attacker.x2 === expected.attackerOffset.x2
      && attacker.y2 === expected.attackerOffset.y2
      && target.x2 === expected.targetOffset.x2 + targetIdle
      && target.y2 === expected.targetOffset.y2
      && vertical === Number(expected.verticalDipActive)
      && offset === expected.slideToOffsetCount
      && original === expected.slideToOriginalCount
      && hits.length === Number(expected.hitsplat !== null)
      && (hits[0] === undefined || (
        hits[0].x === expected.hitsplat!.x && hits[0].y === expected.hitsplat!.y
      ))
      && actual.tasks.filter((t) => Object.values(probe.taskFuncs).includes(t.func)).length
        === Number(expected.shakeTaskActive)
      && actual.animScriptActive === expected.active
      && same(view.attackerOffset, expected.attackerOffset)
      && same(view.targetOffset, expected.targetOffset)
      && hardware && audio
      && actual.dispcnt === 0xBF40 && actual.bldy === 0
      && (age >= 7 && age <= 101
        ? actual.bldcnt === 0x3F40 && actual.bldalpha === 0x080C
        : actual.bldcnt === 0 && actual.bldalpha === 0)
      && createHash("sha256").update(raw).digest("hex") === actual.sha256;
    if (ok) matched += 1;
    else errors.push(`frame ${frame}/age ${age} failed dense receipt`);
  }
  const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
  console.log(`${fixture.orientation} run ${runNumber}: ${matched}/${total}; digest ${digest}`);
  if (errors.length) {
    console.error(errors.slice(0, 30).join("\n"));
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const fixture of fixturePaths) verify(fixture, run);
}
