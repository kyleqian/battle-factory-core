import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  sparkAtAge,
  type SparkState,
} from "../../src/animation/spark.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSparkView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  scenario: string; probe: string;
  appStage: { presentationAge: number };
  attacker: SceneOnPresentationBattler; target: SceneOnPresentationBattler;
  attackerPictureOffset: { x: number; y: number };
  targetPictureOffset: { x: number; y: number };
  targetImpactPosition: { x: number; y: number };
  attackerBgPriority: number; targetBgPriority: number;
  flashingInitialCallbackAdvances: readonly number[];
  flashingInitialAffineAdvances: readonly number[];
  hardwareTieSlotOrder: readonly number[];
  fieldProfile: {
    playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number;
  };
}
interface Matrix { a: number; b: number; c: number; d: number }
interface Sprite {
  slot: number; attr0: number; attr1: number; attr2: number;
  x: number; y: number; x2: number; y2: number; template: number;
  subpriority: number; matrixNum: number; matrix: Matrix;
  invisible: boolean; hFlip: boolean; vFlip: boolean;
}
interface SoundPlayer {
  songHeader: number; status: number;
  tracks: readonly { flags: number; panX: number }[];
}
interface Frame {
  frame: number; sha256: string;
  visualTaskCount: number; soundTaskCount: number;
  activeSpriteCount: number;
  playerSprite: Sprite; opponentSprite: Sprite; sprites: readonly Sprite[];
  hardwareOam: readonly (readonly number[])[];
  hardwareMatrices: readonly Matrix[];
  fadedPalette: readonly number[]; unfadedPalette: readonly number[];
  hardwarePalette: readonly number[]; paletteTags: readonly number[];
  bldcnt: number; bldalpha: number; bldy: number;
  se1: SoundPlayer; se2: SoundPlayer;
}
interface Probe {
  schema: string; templates: Record<string, number>;
  songHeaders: Record<string, number>; frames: readonly Frame[];
}
interface ExpectedSprite {
  identity: string; creationOrder: number; template: number;
  slot: number; subpriority: number; x: number; y: number;
  x2: number; y2: number; priority: number; tileNum: number;
  matrixNum: number; affine: boolean; doubleSize: boolean;
  objMode: number; size: number; hidden: boolean;
  hFlip: boolean; vFlip: boolean; matrix: Matrix;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: sparkEvidence.ts <player-fixture.json> <opponent-fixture.json>");
}

const blend = (color: number, target: number, coefficient: number): number => {
  const channel = (shift: number) => {
    const source = (color >> shift) & 31;
    return source + ((((target >> shift) & 31) - source) * coefficient >> 4);
  };
  return channel(0) | channel(5) << 5 | channel(10) << 10;
};

function expectedSprites(state: SparkState, probe: Probe): ExpectedSprite[] {
  const common = (
    sprite: SparkState["sparks"][number] | SparkState["flashing"][number]
      | SparkState["targetElectricity"][number],
    template: number,
  ): ExpectedSprite => ({
    identity: sprite.identity, creationOrder: sprite.creationOrder, template,
    slot: sprite.slot, subpriority: sprite.subpriority,
    x: sprite.x, y: sprite.y, x2: "x2" in sprite ? sprite.x2 : 0,
    y2: "y2" in sprite ? sprite.y2 : 0,
    priority: sprite.priority, tileNum: sprite.tileNum,
    matrixNum: sprite.matrixNum, affine: sprite.affineMode !== "off",
    doubleSize: false, objMode: sprite.objMode === "normal" ? 0 : 1,
    size: sprite.size, hidden: sprite.hidden,
    hFlip: sprite.hFlip, vFlip: sprite.vFlip,
    matrix: "matrix" in sprite ? sprite.matrix : { a: 256, b: 0, c: 0, d: 256 },
  });
  const rows = [
    ...state.sparks.map((sprite) =>
      common(sprite, probe.templates.gSparkElectricitySpriteTemplate!)),
    ...state.flashing.map((sprite) =>
      common(sprite, probe.templates.gSparkElectricityFlashingSpriteTemplate!)),
    ...state.targetElectricity.map((sprite) =>
      common(sprite, probe.templates.gElectricitySpriteTemplate!)),
  ];
  if (state.impact) {
    rows.push({
      ...state.impact,
      template: probe.templates.gBasicHitSplatSpriteTemplate!,
      x2: 0, y2: 0, affine: true, doubleSize: false, objMode: 1, size: 2,
    });
  }
  return rows.sort((a, b) => a.creationOrder - b.creationOrder);
}

function actualShape(sprite: Sprite): object {
  const affine = ((sprite.attr0 >> 8) & 3) !== 0;
  const matrixNum = (sprite.attr1 >> 9) & 31;
  return {
    slot: sprite.slot, subpriority: sprite.subpriority,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    priority: (sprite.attr2 >> 10) & 3, tileNum: sprite.attr2 & 1023,
    matrixNum, affine,
    doubleSize: affine && ((sprite.attr0 >> 9) & 1) !== 0,
    objMode: (sprite.attr0 >> 10) & 3, size: (sprite.attr1 >> 14) & 3,
    hidden: sprite.invisible,
    hFlip: affine ? sprite.hFlip : matrixNum === 8,
    vFlip: affine ? sprite.vFlip : matrixNum === 16,
    matrix: affine ? sprite.matrix : { a: 256, b: 0, c: 0, d: 256 },
  };
}

function expectedShape(sprite: ExpectedSprite): object {
  return {
    slot: sprite.slot, subpriority: sprite.subpriority,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    priority: sprite.priority, tileNum: sprite.tileNum,
    matrixNum: sprite.matrixNum, affine: sprite.affine,
    doubleSize: sprite.doubleSize, objMode: sprite.objMode, size: sprite.size,
    hidden: sprite.hidden, hFlip: sprite.hFlip, vFlip: sprite.vFlip,
    matrix: sprite.matrix,
  };
}

function oam(sprite: ExpectedSprite): readonly [number, number, number] {
  const half = sprite.size === 2 ? 16 : 8;
  const top = (sprite.y + sprite.y2 - half) & 0xff;
  const left = (sprite.x + sprite.x2 - half) & 0x1ff;
  const attr0 = top | (sprite.affine ? 0x100 : 0)
    | (sprite.doubleSize ? 0x200 : 0) | sprite.objMode << 10;
  const attr1 = left | sprite.matrixNum << 9 | sprite.size << 14;
  const attr2 = sprite.tileNum | sprite.priority << 10
    | (sprite.template === 0 ? 0 : sprite.tileNum === 305 ? 7 : 8) << 12;
  return [attr0, attr1, attr2];
}

function verifyRun(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-spark-evidence-");
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
  if (probe.schema !== "spark-dense-evidence/v3" || probe.frames.length !== 117) {
    throw new Error(`${fixturePath}: expected 115 body + 2 cleanup v3 frames`);
  }
  const stage = createSceneOnMovePresentation({
    move: "SPARK", attacker: fixture.attacker, target: fixture.target,
    attackerPictureOffset: fixture.attackerPictureOffset,
    targetPictureOffset: fixture.targetPictureOffset,
    targetImpactPosition: fixture.targetImpactPosition,
    attackerBgPriority: fixture.attackerBgPriority,
    targetBgPriority: fixture.targetBgPriority,
    flashingInitialCallbackAdvances: fixture.flashingInitialCallbackAdvances,
    flashingInitialAffineAdvances: fixture.flashingInitialAffineAdvances,
    hardwareTieSlotOrder: fixture.hardwareTieSlotOrder,
    fieldProfile: fixture.fieldProfile,
  });
  const geometry = (battler: SceneOnPresentationBattler, pictureOffset: {
    x: number; y: number;
  }, bgPriority: number) => ({
    side: battler.geometry.side,
    center: battler.geometry.animationCenter,
    pictureOffset, bgPriority,
    flashingInitialCallbackAdvances: fixture.flashingInitialCallbackAdvances,
    flashingInitialAffineAdvances: fixture.flashingInitialAffineAdvances,
  });
  const attackerGeometry = geometry(
    fixture.attacker, fixture.attackerPictureOffset, fixture.attackerBgPriority,
  );
  const targetGeometry = {
    side: fixture.target.geometry.side,
    center: fixture.target.geometry.animationCenter,
    pictureOffset: fixture.targetPictureOffset,
    bgPriority: fixture.targetBgPriority,
    impactPosition: fixture.targetImpactPosition,
  };
  const failures: string[] = [];
  let bodyMatches = 0;
  let cleanupMatches = 0;
  let bodyFramebufferMatches = 0;
  let cleanupFramebufferMatches = 0;
  let wroteDiagnostic = false;
  for (const [index, oracle] of probe.frames.entries()) {
    const age = fixture.appStage.presentationAge + index;
    const expected = sparkAtAge(age, attackerGeometry, targetGeometry);
    const seam = sceneOnSparkView({ ...stage, age });
    const seamMatch = JSON.stringify({
      ...seam, age: undefined, attacker: undefined, target: undefined,
    }) === JSON.stringify(expected);
    const expectedSoftware = expectedSprites(expected, probe);
    const relevantTemplates = new Set(expectedSoftware.map((sprite) => sprite.template));
    const actualRelevant = oracle.sprites.filter((sprite) =>
      relevantTemplates.has(sprite.template)
      || sprite.template === probe.templates.gSparkElectricitySpriteTemplate
      || sprite.template === probe.templates.gSparkElectricityFlashingSpriteTemplate
      || sprite.template === probe.templates.gElectricitySpriteTemplate
      || sprite.template === probe.templates.gBasicHitSplatSpriteTemplate);
    const software = actualRelevant.length === expectedSoftware.length
      && expectedSoftware.every((sprite) => {
        const actual = actualRelevant.find((candidate) =>
          candidate.template === sprite.template && candidate.slot === sprite.slot);
        return actual !== undefined
          && JSON.stringify(actualShape(actual)) === JSON.stringify(expectedShape(sprite));
      });
    const lunge = oracle.sprites.filter(
      (sprite) => sprite.template === probe.templates.gHorizontalLungeSpriteTemplate,
    );
    const lungeMatch = expected.lungeController === null ? lunge.length === 0
      : lunge.length === 1 && lunge[0]?.slot === 3
        && lunge[0].subpriority === (
          fixture.attacker.geometry.side === "player" ? 28 : 38)
        && lunge[0].invisible && lunge[0].x === expected.lungeController.x
        && lunge[0].y === expected.lungeController.y;
    const attackerSprite = fixture.attacker.geometry.side === "player"
      ? oracle.playerSprite : oracle.opponentSprite;
    const targetSprite = fixture.target.geometry.side === "player"
      ? oracle.playerSprite : oracle.opponentSprite;
    const battlers = attackerSprite.x2 === expected.attackerOffset.x2
      && attackerSprite.y2 === expected.attackerOffset.y2
      && targetSprite.x2 === expected.targetOffset.x2
      && targetSprite.y2 === expected.targetOffset.y2;
    const prior = sparkAtAge(age - 1, attackerGeometry, targetGeometry);
    const priorSprites = (age === 43 ? [] : expectedSprites(prior, probe))
      .filter((sprite) => !sprite.hidden);
    const expectedHardware = priorSprites.slice().sort((a, b) =>
      a.priority - b.priority || a.subpriority - b.subpriority
      || ((b.y + b.y2 - (b.size === 2 ? 16 : 8)) & 0xff)
        - ((a.y + a.y2 - (a.size === 2 ? 16 : 8)) & 0xff)
      || fixture.hardwareTieSlotOrder.indexOf(a.slot)
        - fixture.hardwareTieSlotOrder.indexOf(b.slot)).map(oam);
    const actualHardware = oracle.hardwareOam.filter((item) => {
      const palette = ((item[2] ?? 0) >> 12) & 15;
      const tile = (item[2] ?? 0) & 1023;
      return palette === 7 && tile === 305
        || palette === 8 && (tile === 321 || tile === 325 || tile === 329);
    }).map((item) => [item[0]!, item[1]!, item[2]!] as const);
    const hardware = JSON.stringify(actualHardware) === JSON.stringify(expectedHardware);
    const hardwareMatrices = priorSprites.filter((sprite) => sprite.affine)
      .every((sprite) => {
        const attrs = oam(sprite);
        const found = oracle.hardwareOam.find((item) =>
          item[0] === attrs[0] && item[1] === attrs[1] && item[2] === attrs[2]);
        return found !== undefined
          && JSON.stringify(oracle.hardwareMatrices[sprite.matrixNum])
            === JSON.stringify(sprite.matrix);
      });
    const attackerBank = fixture.attacker.geometry.side === "player" ? 16 : 17;
    const targetBank = fixture.target.geometry.side === "player" ? 16 : 17;
    const priorCoeff = sparkAtAge(age - 1, attackerGeometry, targetGeometry);
    const palette = [
      ...[1, 2, 3].map((bank) => [bank, expected.backgroundPaletteY,
        expected.backgroundPaletteY === 0 ? 0 : priorCoeff.backgroundPaletteY] as const),
      [attackerBank, expected.attackerPaletteY, priorCoeff.attackerPaletteY] as const,
      [targetBank, expected.targetPaletteY, priorCoeff.targetPaletteY] as const,
    ].every(([bank, currentY, hardwareY]) => {
      const start = bank * 16;
      const source = oracle.unfadedPalette.slice(start, start + 16);
      return source.every((color, offset) =>
        oracle.fadedPalette[start + offset] === blend(color, 0x5bff, currentY)
        && oracle.hardwarePalette[start + offset] === blend(color, 0x5bff, hardwareY));
    }) && [7, 8].every((bank) => {
      const start = 256 + bank * 16;
      return oracle.unfadedPalette.slice(start, start + 16).every(
        (color, offset) => oracle.fadedPalette[start + offset] === color
          && oracle.hardwarePalette[start + offset] === color);
    });
    const assets = oracle.paletteTags[7] === (expected.assetsLoaded ? 10135 : 0xffff)
      && oracle.paletteTags[8] === (expected.assetsLoaded ? 10011 : 0xffff);
    const registers = oracle.bldcnt === 0 && oracle.bldalpha === 0 && oracle.bldy === 0;
    const sound = expected.soundState === null
      ? oracle.se1.tracks.slice(0, 2).every((track) => track.flags === 0)
      : oracle.se1.songHeader === probe.songHeaders[expected.soundState.song]
        && oracle.se1.tracks.slice(0, 2).every((track) =>
          track.flags === expected.soundState!.channelFlags
          && track.panX === (expected.soundState!.panSide === "player"
            ? expected.soundState!.song === "SE_M_THUNDERBOLT2"
              && age < 69 ? -64 : -63
            : 63))
        && (expected.soundState.restart ? oracle.se1.status === 0 : true);
    const cleanup = index < 115 || (
      oracle.visualTaskCount === 0 && oracle.soundTaskCount === 0
      && oracle.activeSpriteCount === 9 && actualHardware.length === 0
      && attackerSprite.x2 === 0 && attackerSprite.y2 === 0
      && targetSprite.x2 === 0 && targetSprite.y2 === 0
    );
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) {
      throw new Error(`raw RGB digest mismatch at frame ${oracle.frame}`);
    }
    let diffPixels = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
      ) diffPixels += 1;
    }
    const framebuffer = diffPixels === 0;
    if (framebuffer) {
      if (index < 115) bodyFramebufferMatches += 1;
      else cleanupFramebufferMatches += 1;
    } else if (!wroteDiagnostic) {
      const oracleRgba = Buffer.alloc(240 * 160 * 4);
      const diffRgba = Buffer.alloc(240 * 160 * 4);
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        oracleRgba[pixel * 4] = rgb[pixel * 3]!;
        oracleRgba[pixel * 4 + 1] = rgb[pixel * 3 + 1]!;
        oracleRgba[pixel * 4 + 2] = rgb[pixel * 3 + 2]!;
        oracleRgba[pixel * 4 + 3] = 255;
        if (
          app[pixel * 4] !== rgb[pixel * 3]
          || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
          || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
        ) {
          diffRgba[pixel * 4] = 255;
          diffRgba[pixel * 4 + 3] = 255;
        }
      }
      writeFileSync(join(scratch, `oracle-age-${age}.png`), PNG.sync.write({
        width: 240, height: 160, data: oracleRgba,
      }));
      writeFileSync(join(scratch, `app-age-${age}.png`), PNG.sync.write({
        width: 240, height: 160, data: Buffer.from(app),
      }));
      writeFileSync(join(scratch, `diff-age-${age}.png`), PNG.sync.write({
        width: 240, height: 160, data: diffRgba,
      }));
      process.stderr.write(`diagnostic frames: ${scratch}\n`);
      wroteDiagnostic = true;
    }
    const matched = seamMatch && software && lungeMatch && battlers
      && hardware && hardwareMatrices && palette && assets && registers
      && sound && cleanup && framebuffer;
    if (matched) {
      if (index < 115) bodyMatches += 1;
      else cleanupMatches += 1;
    } else {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${seamMatch} software=${software}`
        + ` lunge=${lungeMatch} battlers=${battlers} hw=${hardware}`
        + ` matrices=${hardwareMatrices} palette=${palette} assets=${assets}`
        + ` registers=${registers} sound=${sound} cleanup=${cleanup}`
        + ` framebuffer=${framebuffer} diffPixels=${diffPixels}`,
      );
    }
  }
  if (failures.length) throw new Error(failures.slice(0, 30).join("\n"));
  console.log(
    `${fixture.attacker.geometry.side} run ${runNumber}: `
    + `${bodyMatches}/115 body + ${cleanupMatches}/2 cleanup frames; `
    + `framebuffer ${bodyFramebufferMatches}/115 + `
    + `${cleanupFramebufferMatches}/2`,
  );
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixturePath of fixturePaths) verifyRun(fixturePath, runNumber);
}
