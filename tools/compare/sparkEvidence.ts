import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  SPARK_FLASH_CREATION_AGE,
  SPARK_IMPACT_CREATION_AGE,
  SPARK_TARGET_EFFECT_CREATION_AGE,
  sparkAtAge,
  type SparkState,
} from "../../src/animation/spark.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSparkView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

interface Fixture {
  scenario: string; probe: string;
  denseWindow: { startFrame: number; endFrame: number };
  appStage: { presentationAge: number };
  attacker: SceneOnPresentationBattler; target: SceneOnPresentationBattler;
  attackerPictureOffset: { x: number; y: number };
  targetPictureOffset: { x: number; y: number };
  attackerBgPriority: number; targetBgPriority: number;
  fieldProfile: { playerHp: number; playerMaxHp: number; opponentHp: number; opponentMaxHp: number };
}
interface Sprite {
  slot: number; attr0: number; attr1: number; attr2: number;
  x: number; y: number; x2: number; y2: number; template: number;
  matrix: { a: number; b: number; c: number; d: number };
}
interface Frame {
  frame: number; playerSprite: Sprite; opponentSprite: Sprite;
  sprites: readonly Sprite[]; hardwareOam: readonly (readonly number[])[];
  hardwareMatrices: readonly { a: number; b: number; c: number; d: number }[];
  fadedPalette: readonly number[]; hardwarePalette: readonly number[];
  paletteTags: readonly number[]; bldcnt: number; bldalpha: number; bldy: number;
  se1: { songHeader: number; tracks: readonly { flags: number; panX: number }[] };
}
interface Probe {
  schema: string; templates: Record<string, number>;
  songHeaders: Record<string, number>; frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: sparkEvidence.ts <player-fixture.json> <opponent-fixture.json>");
}

function effectShape(state: SparkState, probe: Probe): readonly string[] {
  const result: string[] = [];
  for (const sprite of state.sparks) {
    result.push([
      probe.templates.gSparkElectricitySpriteTemplate,
      sprite.x, sprite.y, sprite.x2, sprite.y2,
      sprite.priority, 321, sprite.matrix.a, sprite.matrix.b,
      sprite.matrix.c, sprite.matrix.d,
    ].join(","));
  }
  for (const sprite of state.flashing) {
    result.push([
      probe.templates.gSparkElectricityFlashingSpriteTemplate,
      sprite.x, sprite.y, sprite.x2, sprite.y2,
      2, 321 + sprite.tileIndex * 4,
      sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
    ].join(","));
  }
  for (const sprite of state.targetElectricity) {
    result.push([
      probe.templates.gElectricitySpriteTemplate,
      sprite.x, sprite.y, 0, 0, 2, 321 + sprite.tileIndex * 4,
      256, 0, 0, 256,
    ].join(","));
  }
  return result.sort();
}

function actualEffectShape(frame: Frame, probe: Probe): readonly string[] {
  const effectTemplates = new Set([
    probe.templates.gSparkElectricitySpriteTemplate,
    probe.templates.gSparkElectricityFlashingSpriteTemplate,
    probe.templates.gElectricitySpriteTemplate,
  ]);
  return frame.sprites.filter((sprite) => effectTemplates.has(sprite.template))
    .map((sprite) => [
      sprite.template, sprite.x, sprite.y, sprite.x2, sprite.y2,
      (sprite.attr2 >> 10) & 3, sprite.attr2 & 1023,
      sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
    ].join(",")).sort();
}

function verifyRun(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-spark-evidence-"));
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
  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  if (probe.schema !== "spark-dense-evidence/v2" || probe.frames.length !== 115) {
    throw new Error(`${fixturePath}: expected 115 dense v2 frames`);
  }
  const stage = createSceneOnMovePresentation({
    move: "SPARK", attacker: fixture.attacker, target: fixture.target,
    attackerPictureOffset: fixture.attackerPictureOffset,
    targetPictureOffset: fixture.targetPictureOffset,
    attackerBgPriority: fixture.attackerBgPriority,
    targetBgPriority: fixture.targetBgPriority,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  let matches = 0;
  for (const [index, oracle] of probe.frames.entries()) {
    const age = fixture.appStage.presentationAge + index;
    const expected = sparkAtAge(age, {
      side: fixture.attacker.geometry.side,
      center: fixture.attacker.geometry.animationCenter,
      pictureOffset: fixture.attackerPictureOffset,
      bgPriority: fixture.attackerBgPriority,
    }, {
      side: fixture.target.geometry.side,
      center: fixture.target.geometry.animationCenter,
      pictureOffset: fixture.targetPictureOffset,
      bgPriority: fixture.targetBgPriority,
    });
    const seam = sceneOnSparkView({ ...stage, age });
    const seamMatch = JSON.stringify({
      ...seam, age: undefined, attacker: undefined, target: undefined,
    }) === JSON.stringify(expected);
    const software = JSON.stringify(effectShape(expected, probe))
      === JSON.stringify(actualEffectShape(oracle, probe));
    const attackerSprite = fixture.attacker.geometry.side === "player"
      ? oracle.playerSprite : oracle.opponentSprite;
    const targetSprite = fixture.target.geometry.side === "player"
      ? oracle.playerSprite : oracle.opponentSprite;
    const battlers = attackerSprite.x2 === expected.attackerOffset.x2
      && attackerSprite.y2 === expected.attackerOffset.y2
      && targetSprite.x2 === expected.targetOffset.x2
      && targetSprite.y2 === expected.targetOffset.y2;
    const hitsplat = oracle.sprites.some(
      (sprite) => sprite.template === probe.templates.gBasicHitSplatSpriteTemplate,
    ) === expected.impactVisible;
    const registers = oracle.bldcnt === 0 && oracle.bldalpha === 0 && oracle.bldy === 0;
    const transfer = age >= 42 && age <= 53 ? (() => {
      const flashingOam = oracle.hardwareOam.filter((oam) => {
        const palette = ((oam[2] ?? 0) >> 12) & 15;
        const tile = (oam[2] ?? 0) & 1023;
        return palette === 8 && (tile === 321 || tile === 325 || tile === 329);
      });
      const displayed = age >= 44 && age <= 52 && age % 2 === 0;
      if (flashingOam.length !== (displayed ? 8 : 0)) return false;
      if (!displayed) return true;
      const priorFlash = sparkAtAge(age - 1, {
        side: fixture.attacker.geometry.side,
        center: fixture.attacker.geometry.animationCenter,
        pictureOffset: fixture.attackerPictureOffset,
        bgPriority: fixture.attackerBgPriority,
      }, {
        side: fixture.target.geometry.side,
        center: fixture.target.geometry.animationCenter,
        pictureOffset: fixture.targetPictureOffset,
        bgPriority: fixture.targetBgPriority,
      }).flashing[0]!;
      return flashingOam.every((oam) => {
        const matrix = oracle.hardwareMatrices[((oam[1] ?? 0) >> 9) & 31];
        return JSON.stringify(matrix) === JSON.stringify(priorFlash.matrix);
      });
    })() : index === 0 || (() => {
      const prior = probe.frames[index - 1]!;
      const relevant = (sprite: Sprite) => [
        probe.templates.gSparkElectricitySpriteTemplate,
        probe.templates.gSparkElectricityFlashingSpriteTemplate,
        probe.templates.gBasicHitSplatSpriteTemplate,
        probe.templates.gElectricitySpriteTemplate,
      ].includes(sprite.template);
      const expectedOam = prior.sprites.filter(relevant)
        .map((sprite) => [sprite.attr0, sprite.attr1, sprite.attr2].join(",")).reverse();
      const keys = new Set(expectedOam);
      const actualOam = oracle.hardwareOam
        .map((oam) => [oam[0], oam[1], oam[2]].join(","))
        .filter((key) => keys.has(key));
      const remaining = [...actualOam];
      return expectedOam.every((key) => {
        const found = remaining.indexOf(key);
        if (found < 0) return false;
        remaining.splice(found, 1);
        return true;
      });
    })();
    const attackerObjBank = fixture.attacker.geometry.side === "player" ? 16 : 17;
    const paletteTransfer = [1, 2, 3, 7, 8, attackerObjBank].every((bank) => {
      const hardware = oracle.hardwarePalette.slice(bank * 16, bank * 16 + 16);
      const current = oracle.fadedPalette.slice(bank * 16, bank * 16 + 16);
      const prior = (probe.frames[index - 1]?.fadedPalette ?? oracle.fadedPalette)
        .slice(bank * 16, bank * 16 + 16);
      // Palette tasks and VBlank DMA share a frame boundary: depending on
      // task priority, the source buffer write is visible in hardware now or
      // on the immediately following transfer, never outside that pair.
      return JSON.stringify(hardware) === JSON.stringify(current)
        || JSON.stringify(hardware) === JSON.stringify(prior);
    });
    const assets = expected.assetsLoaded
      ? oracle.paletteTags.includes(10011) && oracle.paletteTags.includes(10135)
      : !oracle.paletteTags.includes(10011) && !oracle.paletteTags.includes(10135);
    const boundarySound = expected.soundRestart === null || (
      oracle.se1.songHeader === probe.songHeaders[expected.soundRestart]
      && oracle.se1.tracks[0]?.flags === 131
      && oracle.se1.tracks[0]?.panX === (
        expected.soundPanSide === "player"
          ? expected.soundRestart === "SE_M_HYPER_BEAM"
            || age === SPARK_TARGET_EFFECT_CREATION_AGE ? -63 : -64
          : 63
      )
    );
    const sourceWaits = age < SPARK_FLASH_CREATION_AGE
      || age >= SPARK_FLASH_CREATION_AGE && age < SPARK_IMPACT_CREATION_AGE
      || age >= SPARK_IMPACT_CREATION_AGE && age < SPARK_TARGET_EFFECT_CREATION_AGE
      || age >= SPARK_TARGET_EFFECT_CREATION_AGE;
    if (
      seamMatch && software && battlers && hitsplat && registers && transfer
      && paletteTransfer && assets && boundarySound && sourceWaits
    ) {
      matches += 1;
    } else {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${seamMatch} software=${software} battlers=${battlers} hitsplat=${hitsplat} registers=${registers} transfer=${transfer} palette=${paletteTransfer} assets=${assets} sound=${boundarySound}`,
      );
    }
  }
  if (failures.length) throw new Error(failures.slice(0, 20).join("\n"));
  console.log(`${fixture.attacker.geometry.side} run ${runNumber}: ${matches}/115 dense source frames`);
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixturePath of fixturePaths) verifyRun(fixturePath, runNumber);
}
