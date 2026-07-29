import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { slamAtAge } from "../../src/animation/slam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSlamView,
  type SceneOnPresentationBattler,
  type SceneOnSlamConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly schema: string;
  readonly oracleProfile: string;
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
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
  };
  readonly battleState: {
    readonly attackerSide: "player" | "opponent";
    readonly species: number;
    readonly hp: number;
    readonly maxHp: number;
    readonly heldItem: number;
  };
}

interface Sprite {
  readonly template: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly matrixNum: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}
interface SoundPlayer {
  readonly songHeader: number;
  readonly status: number;
  readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
}
interface BattlerSnapshot {
  readonly species: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly item: number;
}
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly battleAnimAttacker: number;
  readonly battleAnimTarget: number;
  readonly player: BattlerSnapshot;
  readonly opponent: BattlerSnapshot;
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly sprites: readonly Sprite[];
  readonly tasks: readonly { readonly func: number }[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly animScriptActive: boolean;
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly se1: SoundPlayer;
  readonly se2: SoundPlayer;
  readonly dispcnt: number;
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bldy: number;
}
interface Probe {
  readonly schema: string;
  readonly move: number;
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: slamEvidence.ts <player-fixture> <opponent-fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const evidenceDigests = new Map<string, string>();
const rawDigests = new Map<string, string>();

function compareFramebuffer(app: Uint8ClampedArray, raw: Buffer): {
  readonly count: number;
  readonly samples: readonly string[];
} {
  let count = 0;
  const samples: string[] = [];
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== raw[pixel * 3]
      || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
      count += 1;
      if (samples.length < 4) {
        samples.push(
          `${pixel % 240},${Math.floor(pixel / 240)}:`
          + `${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
          + `!=${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}`,
        );
      }
    }
  }
  return { count, samples };
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  if (fixture.schema !== "slam-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on") {
    throw new Error(`${fixture.orientation}: invalid fixture contract`);
  }
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-slam-evidence-"));
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

  const outputBytes = readFileSync(output);
  const probe = JSON.parse(outputBytes.toString()) as Probe;
  if (probe.schema !== "slam-dense-evidence/v2" || probe.move !== 21) {
    throw new Error(`${fixture.orientation}: unexpected probe contract`);
  }
  const evidenceDigest = createHash("sha256").update(outputBytes).digest("hex");
  if (evidenceDigest !== fixture.evidenceSha256) {
    throw new Error(
      `${fixture.orientation}: evidence digest ${evidenceDigest} `
      + `!= pinned ${fixture.evidenceSha256}`,
    );
  }
  const priorEvidence = evidenceDigests.get(fixture.orientation);
  if (priorEvidence !== undefined && priorEvidence !== evidenceDigest) {
    throw new Error(`${fixture.orientation}: fresh evidence changed`);
  }
  evidenceDigests.set(fixture.orientation, evidenceDigest);

  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const playerToOpponent = fixture.battleState.attackerSide === "player";
  const config: SceneOnSlamConfig = {
    move: "SLAM",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  };
  const stage = createSceneOnMovePresentation(config);
  const errors: string[] = [];
  const rawHash = createHash("sha256");
  let matched = 0;
  let framebufferMatched = 0;
  const firstSlamFrame = frames.get(fixture.sourceWindow.startFrame + 13);
  const firstSlam = firstSlamFrame?.sprites.find(
    (sprite) => sprite.template === probe.templates.gSlamHitSpriteTemplate,
  );
  if (!firstSlam) throw new Error(`${fixture.orientation}: missing first SLAM_HIT`);
  const slamBaseTile = (firstSlam.attr2 & 0x3ff) - 4 * 16;

  for (let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame; frame += 1) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`${fixture.orientation}: omitted frame ${frame}`);
    const expected = slamAtAge(
      age,
      fixture.battleState.attackerSide,
      fixture.target.geometry.animationCenter,
    );
    const view = sceneOnSlamView({ ...stage, age });
    const attacker = playerToOpponent ? actual.playerSprite : actual.opponentSprite;
    const target = playerToOpponent ? actual.opponentSprite : actual.playerSprite;
    const targetIdle = playerToOpponent && age < 18 ? 1 : 0;
    const slamHits = actual.sprites.filter(
      (sprite) => sprite.template === probe.templates.gSlamHitSpriteTemplate,
    );
    const hitsplats = actual.sprites.filter(
      (sprite) => sprite.template === probe.templates.gBasicHitSplatSpriteTemplate,
    );
    const offset = actual.sprites.filter(
      (sprite) => sprite.template === probe.templates.gSlideMonToOffsetSpriteTemplate,
    ).length;
    const original = actual.sprites.filter(
      (sprite) =>
        sprite.template === probe.templates.gSlideMonToOriginalPosSpriteTemplate,
    ).length;
    const sourceTasks = actual.tasks.filter(
      (task) => Object.values(probe.taskFuncs).includes(task.func),
    ).length;
    const slamTagLoaded = actual.paletteTags.includes(10056)
      && actual.tileTags.includes(10056);
    const impactTagLoaded = actual.paletteTags.includes(10135)
      && actual.tileTags.includes(10135);
    const expectedSlamLoaded = expected.loadedTags.includes("ANIM_TAG_SLAM_HIT");
    const expectedImpactLoaded = expected.loadedTags.includes("ANIM_TAG_IMPACT");

    const slamHit = slamHits[0];
    const slamSprite = slamHit === undefined || expected.slamHit === null
      ? slamHit === undefined && expected.slamHit === null
      : slamHits.length === 1
        && slamHit.x === expected.slamHit.x
        && slamHit.y === expected.slamHit.y
        && ((slamHit.attr2 & 0x3ff) - slamBaseTile) / 16
          === expected.slamHit.sheetFrame
        && Boolean(slamHit.attr1 & 0x1000) === expected.slamHit.hFlip
        && !(slamHit.attr1 & 0x2000);

    const priorFrame = frames.get(frame - 1);
    const priorBattlers = priorFrame
      ? [priorFrame.playerSprite, priorFrame.opponentSprite]
      : [];
    const hardware = !priorFrame || priorBattlers.every((sprite, index) =>
      (index === (playerToOpponent ? 1 : 0) && age >= 9 && age <= 47
        || actual.hardwareOam.some(
          (oam) => same(oam, [sprite.attr0, sprite.attr1, sprite.attr2]),
        ))
      && same(actual.hardwareMatrices[sprite.matrixNum], [
        sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
      ])
      && actual.hardwarePalette
        .slice(256 + (sprite.attr2 >>> 12) * 16, 272 + (sprite.attr2 >>> 12) * 16)
        .every((color, index) =>
          color === priorFrame.fadedPalette[
            256 + (sprite.attr2 >>> 12) * 16 + index
          ])
    );

    const cometPunch = age !== 10 || (
      actual.se1.songHeader === probe.songHeaders.SE_M_COMET_PUNCH
      && actual.se1.status === 0
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === (playerToOpponent ? -64 : 63)
      && actual.se2.songHeader !== probe.songHeaders.SE_M_COMET_PUNCH
    );
    const megaKick2 = age !== 18 || (
      actual.se1.songHeader === probe.songHeaders.SE_M_MEGA_KICK2
      && actual.se1.status === 0
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === (playerToOpponent ? 63 : -63)
      && actual.se2.songHeader !== probe.songHeaders.SE_M_MEGA_KICK2
    );

    const raw = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const framebuffer = compareFramebuffer(render(engine), raw);
    if (framebuffer.count === 0) framebufferMatched += 1;

    const battleState = playerToOpponent ? actual.player : actual.opponent;
    const receiptShapes = actual.fadedPalette.length === 512
      && actual.unfadedPalette.length === 512
      && actual.hardwarePalette.length === 512
      && actual.softwareOam.length === 128
      && actual.hardwareOam.length === 128
      && actual.hardwareMatrices.length === 32
      && actual.paletteTags.length === 16
      && actual.tileTags.length === 128;
    const ok = attacker.x2 === expected.attackerOffset.x2
      && attacker.y2 === expected.attackerOffset.y2
      && target.x2 === expected.targetOffset.x2 + targetIdle
      && target.y2 === expected.targetOffset.y2
      && offset === expected.slideToOffsetCount
      && original === expected.slideToOriginalCount
      && sourceTasks === Number(expected.shakeTaskActive)
      && slamSprite
      && hitsplats.length === Number(expected.hitsplat !== null)
      && (hitsplats[0] === undefined || (
        hitsplats[0].x === expected.hitsplat!.x
        && hitsplats[0].y === expected.hitsplat!.y
      ))
      && actual.animScriptActive === expected.active
      && actual.visualTaskCount === actual.sprites.length + sourceTasks
      && actual.soundTaskCount === 0
      && slamTagLoaded === expectedSlamLoaded
      && impactTagLoaded === expectedImpactLoaded
      && same(view.attackerOffset, expected.attackerOffset)
      && same(view.targetOffset, expected.targetOffset)
      && same(view.slamHit, expected.slamHit)
      && same(view.loadedTags, expected.loadedTags)
      && hardware && cometPunch && megaKick2 && receiptShapes
      && actual.battleAnimAttacker === (playerToOpponent ? 0 : 1)
      && actual.battleAnimTarget === (playerToOpponent ? 1 : 0)
      && battleState.species === fixture.battleState.species
      && battleState.hp === fixture.battleState.hp
      && battleState.maxHp === fixture.battleState.maxHp
      && battleState.item === fixture.battleState.heldItem
      && actual.dispcnt === 0xBF40 && actual.bldy === 0
      && (age >= 10 && age <= 46
        ? actual.bldcnt === 0x3F40 && actual.bldalpha === 0x080C
        : actual.bldcnt === 0 && actual.bldalpha === 0)
      && createHash("sha256").update(raw).digest("hex") === actual.sha256
      && framebuffer.count === 0;
    if (ok) matched += 1;
    else {
      errors.push(
        `frame ${frame}/age ${age}: framebuffer diff=${framebuffer.count} `
        + `${framebuffer.samples.join(";")}`,
      );
    }
  }

  const rawDigest = rawHash.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    throw new Error(`${fixture.orientation}: raw RGB digest ${rawDigest} changed`);
  }
  const priorRaw = rawDigests.get(fixture.orientation);
  if (priorRaw !== undefined && priorRaw !== rawDigest) {
    throw new Error(`${fixture.orientation}: fresh raw RGB changed`);
  }
  rawDigests.set(fixture.orientation, rawDigest);
  const total = fixture.sourceWindow.frameCount;
  console.log(
    `${fixture.orientation} run ${runNumber}: ${matched}/${total}; `
    + `framebuffer ${framebufferMatched}/${total}; `
    + `evidence ${evidenceDigest}; raw ${rawDigest}`,
  );
  if (errors.length) {
    console.error(errors.slice(0, 30).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const fixture of fixturePaths) verify(fixture, run);
}
