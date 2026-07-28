// Fresh dense source/hardware/pixel comparator for legal Scene-ON MOVE_CHARM.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  CHARM_BODY_FRAME_COUNT,
  charmAtAge,
} from "../../src/animation/charm.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCharmView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

type Fixture = {
  schema: "scene-on-portable-component/v1";
  scenario: string; probe: string; appStage: { presentationAge: number };
  attacker: SceneOnPresentationBattler; target: SceneOnPresentationBattler;
  fieldProfile: {
    playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number;
    playerGender?: "male" | "female"; opponentGender?: "male" | "female";
  };
};
type Matrix = { a: number; b: number; c: number; d: number };
type Sprite = {
  slot: number; template: number; x: number; y: number; x2: number; y2: number;
  attr0: number; attr1: number; attr2: number; matrixNum: number;
  matrix: Matrix; subpriority: number; invisible: boolean; data: number[];
};
type Row = {
  frame: number; sha256: string; visualTaskCount: number; soundTaskCount: number;
  activeSpriteCount: number; playerSprite: Sprite; opponentSprite: Sprite;
  active: Sprite[]; hardwareOam: number[][]; hardwareMatrices: Matrix[];
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[]; bldcnt: number; bldalpha: number; bldy: number;
  se1: { songHeader: number; status: number; tracks: { flags: number; panX: number }[] };
};
type Probe = {
  schema: string; magentaHeartTemplate: number; songHeader: number; rows: Row[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: charmPortable.ts <player-fixture> <opponent-fixture>");
}
const shape = (sprite: Sprite) => ({
  slot: sprite.slot, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
  data0: sprite.data[0], data1: sprite.data[1], data2: sprite.data[2],
  attr0: sprite.attr0, attr1: sprite.attr1, attr2: sprite.attr2,
  subpriority: sprite.subpriority, matrix: sprite.matrix,
});

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-charm-evidence-"));
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
  if (probe.schema !== "charm-dense-evidence/v2") {
    throw new Error(`${fixturePath}: unexpected probe schema`);
  }
  const start = probe.rows.findIndex((row) => row.visualTaskCount > 0);
  const rows = probe.rows.slice(start, start + 97);
  if (start < 0 || rows.length !== 97
    || rows.slice(93).some((row) => row.visualTaskCount !== 0)
    || probe.rows[start + 97]?.visualTaskCount !== 1) {
    throw new Error(`${fixturePath}: expected 93 body, four clear frames, then stat task`);
  }
  const stage = createSceneOnMovePresentation({
    move: "CHARM", attacker: fixture.attacker, target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  let body = 0;
  let cleanup = 0;
  for (const [index, oracle] of rows.entries()) {
    const age = fixture.appStage.presentationAge + index;
    const expected = charmAtAge(
      age, fixture.attacker.geometry.side,
      fixture.attacker.geometry.battlePositionCenter,
    );
    const seam = sceneOnCharmView({ ...stage, age });
    const seamMatch = JSON.stringify({
      ...seam, age: undefined, attacker: undefined, target: undefined,
    }) === JSON.stringify(expected);
    const actualHearts = oracle.active
      .filter((sprite) => sprite.template === probe.magentaHeartTemplate)
      .sort((a, b) => a.slot - b.slot);
    const expectedHearts = expected.hearts.map((heart) => ({
      slot: heart.slot, x: heart.x, y: heart.y, x2: heart.x2, y2: heart.y2,
      data0: heart.data0, data1: heart.data1, data2: heart.data2,
      attr0: (heart.y + heart.y2 - 8) & 0xff,
      attr1: ((heart.x + heart.x2 - 8) & 0x1ff) | 0x4000,
      attr2: 305 | 2 << 10 | 7 << 12,
      subpriority: fixture.attacker.geometry.side === "player" ? 27 : 37,
      matrix: { a: 256, b: 0, c: 0, d: 256 },
    }));
    const software = JSON.stringify(actualHearts.map(shape))
      === JSON.stringify(expectedHearts);
    const attacker = fixture.attacker.geometry.side === "player"
      ? oracle.playerSprite : oracle.opponentSprite;
    const target = fixture.target.geometry.side === "player"
      ? oracle.playerSprite : oracle.opponentSprite;
    const battlers = attacker.x2 === expected.rock.x2
      && attacker.y2 === expected.rock.y2
      && JSON.stringify(attacker.matrix) === JSON.stringify(expected.rock.matrix)
      && target.x2 === 0 && target.y2 === 0;
    const expectedTasks = Number(expected.rock.active) + expected.hearts.length;
    const tasks = oracle.visualTaskCount === expectedTasks
      && oracle.soundTaskCount === 0;
    const prior = charmAtAge(
      age - 1, fixture.attacker.geometry.side,
      fixture.attacker.geometry.battlePositionCenter,
    );
    const matrixPrior = charmAtAge(
      age - 2, fixture.attacker.geometry.side,
      fixture.attacker.geometry.battlePositionCenter,
    );
    const priorOam = prior.hearts.map((heart) => [
      (heart.y + heart.y2 - 8) & 0xff,
      ((heart.x + heart.x2 - 8) & 0x1ff) | 0x4000,
      305 | 2 << 10 | 7 << 12,
    ]).sort((a, b) => b[0]! - a[0]! || b[1]! - a[1]!);
    const actualOam = oracle.hardwareOam.filter((item) =>
      (item[2]! & 1023) === 305 && (item[2]! >> 12 & 15) === 7);
    const hardware = JSON.stringify(actualOam) === JSON.stringify(priorOam)
      && JSON.stringify(oracle.hardwareMatrices[attacker.matrixNum])
        === JSON.stringify(matrixPrior.rock.matrix);
    const palette = [7].every((bank) => {
      const start = 256 + bank * 16;
      return oracle.unfadedPalette.slice(start, start + 16).every(
        (color, offset) => oracle.fadedPalette[start + offset] === color
          && oracle.hardwarePalette[start + offset] === color);
    });
    const asset = oracle.paletteTags[7] === (index < 93 ? 10210 : 0xffff);
    const registers = oracle.bldcnt === 0 && oracle.bldalpha === 0 && oracle.bldy === 0;
    const sound = index >= 58
      ? oracle.se1.tracks.slice(0, 2).every((track) => track.flags === 0)
      : oracle.se1.songHeader === probe.songHeader
        && oracle.se1.tracks.filter((track) => track.flags !== 0).every((track) =>
          track.panX === (fixture.attacker.geometry.side === "player" ? -64 : 63));
    const teardown = index < 93 || (
      oracle.visualTaskCount === 0 && actualHearts.length === 0
      && actualOam.length === 0 && attacker.x2 === 0 && attacker.y2 === 0
      && oracle.paletteTags[7] === 0xffff
    );
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const rgb = readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
    const digest = createHash("sha256").update(rgb).digest("hex") === oracle.sha256;
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel++) {
      if (app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) diff++;
    }
    const framebuffer = diff === 0;
    const matched = seamMatch && software && battlers && tasks && hardware
      && palette && asset && registers && sound && teardown && digest && framebuffer;
    if (matched) index < CHARM_BODY_FRAME_COUNT ? body++ : cleanup++;
    else failures.push(
      `frame ${oracle.frame}/age ${age}: seam=${seamMatch} sw=${software}`
      + ` battlers=${battlers} tasks=${tasks} hw=${hardware} palette=${palette}`
      + ` asset=${asset} regs=${registers} sound=${sound} teardown=${teardown}`
      + ` digest=${digest} framebuffer=${framebuffer} diff=${diff}`,
    );
  }
  if (failures.length) throw new Error(failures.slice(0, 30).join("\n"));
  console.log(`${fixture.attacker.geometry.side} run ${runNumber}: `
    + `${body}/93 body + ${cleanup}/4 clear teardown frames exact`);
}

for (let runNumber = 1; runNumber <= 2; runNumber++) {
  for (const fixturePath of fixturePaths) verify(fixturePath, runNumber);
}
