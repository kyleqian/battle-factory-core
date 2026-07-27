import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { dynamicPunchAtAge } from "../../src/animation/dynamicPunch.ts";
import {
  sceneOnDynamicPunchView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

interface Fixture {
  scenario: string;
  probe: string;
  denseWindow: { startFrame: number; endFrame: number };
  appStage: { presentationAge: number };
  attackerSide: "player" | "opponent";
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
  fieldProfile: {
    playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number;
  };
}
interface Sprite {
  template: number; x: number; y: number; attr2: number;
  matrix: readonly number[]; hardwareMatrix: readonly number[];
}
interface Frame {
  frame: number;
  playerSprite: { x2: number; y2: number };
  opponentSprite: { x2: number; y2: number };
  sprites: readonly Sprite[];
  bldcnt: number; bldalpha: number;
  se1: {
    songHeader: number;
    tracks: readonly { flags: number; panX: number }[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ?? "tools/compare/fixtures/dynamic-punch-player-hitmonchan-opponent-shuckle.json";
const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-dynamic-punch-portable-"));
const output = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output,
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  templates: {
    gFistFootSpriteTemplate: number;
    gBasicHitSplatSpriteTemplate: number;
    gExplosionSpriteTemplate: number;
  };
  songHeaders: {
    SE_M_VITAL_THROW2: number;
    SE_M_SELF_DESTRUCT: number;
  };
  frames: readonly Frame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = {
  age: 0,
  config: {
    move: "DYNAMIC_PUNCH" as const,
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  },
};
const failures: string[] = [];
let matches = 0;
for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expected = dynamicPunchAtAge(
    age,
    fixture.attackerSide,
    fixture.target.geometry.animationCenter,
    fixture.target.geometry.battlePositionCenter,
  );
  const seam = sceneOnDynamicPunchView({ ...stage, age });
  const fist = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.gFistFootSpriteTemplate,
  );
  const hitsplat = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.gBasicHitSplatSpriteTemplate,
  );
  const explosions = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.gExplosionSpriteTemplate,
  );
  const fistShape = fist.length === Number(expected.fistVisible)
    && fist.every((sprite) =>
      sprite.x === expected.fistPosition.x && sprite.y === expected.fistPosition.y);
  const hitsplatShape = hitsplat.length === Number(expected.hitsplatVisible)
    && hitsplat.every((sprite) =>
      sprite.x === expected.hitsplatPosition.x
      && sprite.y === expected.hitsplatPosition.y
      && JSON.stringify(sprite.matrix) === "[256,0,0,256]"
      && JSON.stringify(sprite.hardwareMatrix) === "[256,0,0,256]");
  const explosionShape = JSON.stringify(explosions.map((sprite) =>
    `${sprite.x},${sprite.y},${(sprite.attr2 & 1023) - 537}`,
  ).sort()) === JSON.stringify(expected.explosions.map((sprite) =>
    `${sprite.x},${sprite.y},${sprite.frame * 16}`,
  ).sort());
  const targetSprite = fixture.target.geometry.side === "player"
    ? oracle.playerSprite : oracle.opponentSprite;
  const shakeShape = targetSprite.x2 === expected.targetX2
    && targetSprite.y2 === expected.targetY2;
  const registers = expected.alpha
    ? oracle.bldcnt === 16192 && oracle.bldalpha === 2060
    : oracle.bldcnt === 0 && oracle.bldalpha === 0;
  const sound = expected.sound === null || (
    oracle.se1.songHeader === probe.songHeaders[expected.sound]
    && oracle.se1.tracks[0]?.flags === 131
    && oracle.se1.tracks[0]?.panX
      === (fixture.target.geometry.side === "player" ? -63 : 63)
  );
  const seamShape = JSON.stringify({
    ...seam,
    attacker: undefined,
    target: undefined,
    age: undefined,
  }) === JSON.stringify(expected);
  if (
    fistShape && hitsplatShape && explosionShape && shakeShape
    && registers && sound && seamShape
  ) matches += 1;
  else failures.push(
    `frame ${frame}/age ${age}: fist=${fistShape} hitsplat=${hitsplatShape} explosions=${explosionShape} shake=${shakeShape} registers=${registers} sound=${sound} seam=${seamShape}`,
  );
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`DYNAMIC_PUNCH source components + typed seam ${matches}/${total}`);
if (matches !== total) {
  console.error(failures.slice(0, 30).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
