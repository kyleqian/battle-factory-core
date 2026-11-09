import { createHash } from "node:crypto";
import "../../src/engine/monPicPixelsInstall.ts";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { swallowAtAge, type SwallowStockpileCount } from "../../src/animation/swallow.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSwallowView,
  type SceneOnSwallowConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface MatrixRow {
  readonly fixture: string;
  readonly scenario: string;
  readonly orientation: "player-back" | "opponent-front";
  readonly stockpiles: SwallowStockpileCount;
}

interface Checkpoint {
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
    readonly rgbSequenceSha256: string;
  };
  readonly attackerHpRange: { readonly minimum: number; readonly maximum: number };
}

interface Sprite {
  readonly slot: number;
  readonly raw: string;
  readonly template: string;
  readonly callback: string;
  readonly attr: readonly number[];
  readonly matrixNum: number;
  readonly matrix: readonly number[];
  readonly data: readonly number[];
}

interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly sprites: readonly Sprite[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly tileTags: readonly number[];
  readonly paletteTags: readonly number[];
  readonly immutableState: unknown;
  readonly parties: unknown;
  readonly battlers: Readonly<Record<"player" | "opponent", {
    readonly hp: number; readonly maxHp: number;
  }>>;
  readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
  readonly se2: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
}

interface Probe {
  readonly schema: string;
  readonly sourceWindow: Checkpoint["sourceWindow"];
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly lifecycleCounts: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const matrix = JSON.parse(readFileSync(
  join(root, "tools/compare/fixtures/swallow-evidence-matrix.json"),
  "utf8",
)) as { readonly branches: readonly MatrixRow[] };
const args = new Set(process.argv.slice(2));
const passes = args.has("--once") ? 1 : 2;
const requireExact = args.has("--require-exact");
const filter = process.argv.find((arg) => arg.startsWith("--branch="))?.slice(9);
const dumpDir = process.argv.find((arg) => arg.startsWith("--dump-dir="))?.slice(11);
const dumpAge = Number(process.argv.find((arg) => arg.startsWith("--dump-age="))?.slice(11) ?? 0);
const diagnosticAges = new Set((process.argv.find((arg) => arg.startsWith("--diagnostic-ages="))?.slice("--diagnostic-ages=".length) ?? "")
  .split(",").filter(Boolean).map(Number));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const s16 = (hex: string, byteOffset: number) => {
  const value = Number.parseInt(hex.slice(byteOffset * 2 + 2, byteOffset * 2 + 4)
    + hex.slice(byteOffset * 2, byteOffset * 2 + 2), 16);
  return value >= 0x8000 ? value - 0x10000 : value;
};
const u16 = (hex: string, byteOffset: number) => Number.parseInt(
  hex.slice(byteOffset * 2 + 2, byteOffset * 2 + 4)
    + hex.slice(byteOffset * 2, byteOffset * 2 + 2), 16,
);
const fresh = new Map<string, string>();
let allExact = true;

function configFor(row: MatrixRow, checkpoint: Checkpoint): SceneOnSwallowConfig {
  const player = row.orientation === "player-back";
  const hp = checkpoint.attackerHpRange.minimum;
  return {
    move: "SWALLOW",
    stockpileCount: row.stockpiles,
    attacker: {
      species: "PELIPPER",
      geometry: player
        ? { side: "player", spriteCorner: { x: 40, y: 54 }, animationCenter: { x: 72, y: 86 }, battlePositionCenter: { x: 72, y: 80 } }
        : { side: "opponent", spriteCorner: { x: 144, y: 4 }, animationCenter: { x: 176, y: 36 }, battlePositionCenter: { x: 176, y: 40 } },
    },
    target: {
      species: !player && row.stockpiles === 3 ? "SABLEYE" : "DELCATTY",
      geometry: player
        ? { side: "opponent", spriteCorner: { x: 144, y: 16 }, animationCenter: { x: 176, y: 48 }, battlePositionCenter: { x: 176, y: 40 } }
        : { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } },
    },
    fieldProfile: player
      ? { playerHp: hp, playerMaxHp: 154, opponentHp: 164, opponentMaxHp: 164, playerGender: "male", opponentGender: "male" }
      : {
          playerHp: row.stockpiles === 3 ? 144 : 164,
          playerMaxHp: row.stockpiles === 3 ? 144 : 164,
          opponentHp: hp,
          opponentMaxHp: 154,
          playerGender: "male",
          opponentGender: "male",
        },
    attackerPictureOffset: player ? { x: 72, y: 94 } : { x: 176, y: 36 },
    attackerPictureYOffset: player ? 6 : 4,
  };
}

function verify(row: MatrixRow): void {
  const checkpoint = JSON.parse(readFileSync(resolve(root, row.fixture), "utf8")) as Checkpoint;
  const scratch = createScratchDir("pokebench-swallow-portable-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"),
    join(root, "tools/compare/swallowProbe.py"),
    resolve(root, row.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  const rawSequence = createHash("sha256");
  for (const frame of probe.frames) {
    rawSequence.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
  }
  const rawDigest = rawSequence.digest("hex");
  if (
    probe.schema !== "swallow-dense-evidence/v1"
    || !same(probe.sourceWindow, checkpoint.sourceWindow)
    || rawDigest !== checkpoint.sourceWindow.rgbSequenceSha256
    || probe.lifecycleCounts.blueOrb !== row.stockpiles * 5
    || probe.lifecycleCounts.blueStar !== 4
    || probe.lifecycleCounts.deform !== 1
    || probe.lifecycleCounts.shake !== 2
  ) throw new Error(`${row.orientation}/${row.stockpiles}: fresh source contract changed`);
  const key = `${row.orientation}/${row.stockpiles}`;
  if (fresh.has(key) && fresh.get(key) !== rawDigest) {
    throw new Error(`${key}: twice-fresh raw RGB receipt diverged`);
  }
  fresh.set(key, rawDigest);

  const config = configFor(row, checkpoint);
  const stage = createSceneOnMovePresentation(config);
  const byFrame = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const immutable = probe.frames[0]?.immutableState;
  const parties = probe.frames[0]?.parties;
  let componentRows = 0;
  let latchRows = 0;
  let selectedLatchRows = 0;
  let framebufferRows = 0;
  const componentResidual: number[] = [];
  const framebufferResidual: { age: number; diff: number }[] = [];
  for (let age = 0; age < checkpoint.sourceWindow.frameCount; age += 1) {
    const frameNumber = checkpoint.sourceWindow.startFrame + age;
    const actual = byFrame.get(frameNumber)!;
    const expected = swallowAtAge(
      age,
      config.attacker.geometry.side,
      row.stockpiles,
      config.attacker.geometry.battlePositionCenter,
      config.attackerPictureOffset,
      config.attackerPictureYOffset,
    );
    const seam = sceneOnSwallowView({ ...stage, age });
    const actualOrbs = actual.sprites
      .filter((sprite) => sprite.template === "gSwallowBlueOrbSpriteTemplate")
      .map((sprite) => ({
        x: s16(sprite.raw, 0x20), y: s16(sprite.raw, 0x22),
        y2: s16(sprite.raw, 0x26), velocityQ8: sprite.data[1],
      }));
    const expectedOrbs = expected.orbs.map((orb) => ({
      x: orb.x, y: orb.y, y2: orb.y2, velocityQ8: orb.velocityQ8,
    }));
    const pelipper = actual.sprites.find((sprite) => sprite.data[2] === 310);
    const prior = byFrame.get(frameNumber - 1);
    const latches = prior !== undefined
      && same(actual.hardwareOam, prior.softwareOam)
      && same(actual.hardwarePalette, prior.fadedPalette)
      && prior.sprites.every((sprite) => (sprite.attr[0]! & 0x100) === 0
        || same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix));
    if (latches) latchRows += 1;
    const displayedEffects = swallowAtAge(
      age - 1,
      config.attacker.geometry.side,
      row.stockpiles,
      config.attacker.geometry.battlePositionCenter,
      config.attackerPictureOffset,
      config.attackerPictureYOffset,
    );
    const displayedMatrix = swallowAtAge(
      age - 2,
      config.attacker.geometry.side,
      row.stockpiles,
      config.attacker.geometry.battlePositionCenter,
      config.attackerPictureOffset,
      config.attackerPictureYOffset,
    ).attackerMatrix;
    const visibleHardware = actual.hardwareOam.map((raw) => ({
      attr0: u16(raw, 0), attr1: u16(raw, 2), attr2: u16(raw, 4),
    })).filter(({ attr0 }) => !((attr0 & 0x100) === 0 && (attr0 & 0x200) !== 0));
    const hasObj = (x: number, y: number, size: 0 | 2) => visibleHardware.some(({ attr0, attr1 }) =>
      (attr0 & 0xff) === (y & 0xff)
      && (attr1 & 0x1ff) === (x & 0x1ff)
      && ((attr0 >> 14) & 3) === 0
      && ((attr1 >> 14) & 3) === size);
    const selectedOam = displayedEffects.orbs.every((orb) =>
      hasObj(orb.x - 4, orb.y + orb.y2 - 4, 0))
      && displayedEffects.stars.every((star) => hasObj(star.x - 16, star.y - 16, 2));
    const selectedMatrix = pelipper !== undefined
      && same(actual.hardwareMatrices[pelipper.matrixNum], Object.values(displayedMatrix));
    const selectedPalette = prior === undefined || ([
      [10236, displayedEffects.orbs.length > 0],
      [10031, displayedEffects.stars.length > 0],
    ] as const).every(([tag, displayedNow]) => {
      if (!displayedNow) return true;
      const slot = actual.paletteTags.indexOf(tag);
      return slot >= 0 && same(
        actual.hardwarePalette.slice(256 + slot * 16, 272 + slot * 16),
        prior.fadedPalette.slice(256 + slot * 16, 272 + slot * 16),
      );
    });
    if (selectedOam && selectedMatrix && selectedPalette) selectedLatchRows += 1;
    const tagShape =
      actual.tileTags.includes(10236) === expected.assetsLoaded.blueOrb
      && actual.paletteTags.includes(10236) === expected.assetsLoaded.blueOrb
      && actual.tileTags.includes(10031) === expected.assetsLoaded.blueStar
      && actual.paletteTags.includes(10031) === expected.assetsLoaded.blueStar;
    const source = age === checkpoint.sourceWindow.frameCount - 1
      ? !actual.gAnimScriptActive : Boolean(actual.gAnimScriptActive);
    const sound = expected.sound === null || (() => {
      const player = expected.sound.player === "SE1" ? actual.se1 : actual.se2;
      return player.songHeader === probe.songHeaders[expected.sound.song]
        && player.tracks[0]?.flags === 131
        && player.tracks[0]?.panX === expected.sound.pan;
    })();
    const raw = readFileSync(join(rgbDir, `${String(frameNumber).padStart(5, "0")}.rgb`));
    const rawReceipt = createHash("sha256").update(raw).digest("hex") === actual.sha256;
    const components =
      same(actualOrbs, expectedOrbs)
      && pelipper !== undefined
      && s16(pelipper.raw, 0x24) === expected.attackerOffset.x2
      && s16(pelipper.raw, 0x26) === expected.attackerOffset.y2
      && same(pelipper.matrix, Object.values(expected.attackerMatrix))
      && actual.visualTaskCount === expected.visualTaskCount
      && actual.soundTaskCount === 0
      && same(seam.orbs, expected.orbs)
      && same(seam.stars, expected.stars)
      && seam.stockpileCount === row.stockpiles
      && source && sound && tagShape && rawReceipt
      && same(actual.immutableState, immutable) && same(actual.parties, parties)
      && ["bldcnt", "bldalpha", "bldy", "mosaic"].every((name) => actual.registers[name] === 0);
    if (components) componentRows += 1;
    else componentResidual.push(age);
    if (pelipper && diagnosticAges.has(age)) {
      console.log(JSON.stringify({
        age,
        expectedOffset: expected.attackerOffset,
        sourceOffset: { x2: s16(pelipper.raw, 0x24), y2: s16(pelipper.raw, 0x26) },
        sourceMatrix: pelipper.matrix,
        hardwareMatrix: actual.hardwareMatrices[pelipper.matrixNum],
        previousSourceMatrix: prior?.sprites.find((sprite) => sprite.data[2] === 310)?.matrix,
        hardwareBattlerOam: actual.hardwareOam.map((raw, index) => ({
          index, raw, attr0: u16(raw, 0), attr1: u16(raw, 2), attr2: u16(raw, 4),
        })).filter(({ attr0, attr1 }) => (attr0 & 0x100) !== 0
          && (attr1 & 0x1ff) >= 0 && (attr1 & 0x1ff) < 145),
        hardwarePlayerRegion: actual.hardwareOam.map((raw, index) => ({
          index, raw, attr0: u16(raw, 0), attr1: u16(raw, 2), attr2: u16(raw, 4),
        })).filter(({ attr0, attr1 }) => !((attr0 & 0x100) === 0 && (attr0 & 0x200) !== 0)
          && (attr0 & 0xff) >= 10 && (attr0 & 0xff) < 120
          && (attr1 & 0x1ff) >= 20 && (attr1 & 0x1ff) < 130),
        sourceOrbs: actualOrbs,
        expectedDisplayedOrbs: swallowAtAge(
          age - 1,
          config.attacker.geometry.side,
          row.stockpiles,
          config.attacker.geometry.battlePositionCenter,
          config.attackerPictureOffset,
          config.attackerPictureYOffset,
        ).orbs,
      }));
    }

    const app = new Uint8Array(240 * 160 * 4);
    renderSceneOnMovePresentation(app, { ...stage, age });
    if (dumpDir && age === dumpAge) {
      writeFileSync(join(dumpDir, "app.rgba"), app);
      writeFileSync(join(dumpDir, "oracle.rgb"), raw);
      console.log(`diagnostic framebuffer pair: ${dumpDir}`);
    }
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
        diff += 1;
      }
    }
    if (diff === 0) framebufferRows += 1;
    else framebufferResidual.push({ age, diff });
    if (diagnosticAges.has(age)) console.log(JSON.stringify({ age, framebufferDiff: diff }));
  }
  const total = checkpoint.sourceWindow.frameCount;
  const exact = componentRows === total
    && selectedLatchRows === total
    && framebufferRows === total;
  allExact &&= exact;
  const ages = framebufferResidual.map(({ age }) => age);
  const ranges: string[] = [];
  for (const age of ages) {
    const last = ranges.at(-1);
    if (!last) ranges.push(String(age));
    else {
      const match = /^(\d+)(?:\.\.(\d+))?$/.exec(last)!;
      const end = Number(match[2] ?? match[1]);
      if (age === end + 1) ranges[ranges.length - 1] = `${match[1]}..${age}`;
      else ranges.push(String(age));
    }
  }
  const peak = framebufferResidual.reduce((maximum, row) => Math.max(maximum, row.diff), 0);
  console.log(`${key}: source/component ${componentRows}/${total}; selected matrix/OAM/palette latches ${selectedLatchRows}/${total}; whole-buffer diagnostic ${latchRows}/${total - 1}; framebuffer ${framebufferRows}/${total}; residual ages ${ranges.join(",") || "none"}; peak ${peak}px; raw ${rawDigest}`);
  if (componentResidual.length) console.log(`${key}: component residual ages ${componentResidual.join(",")}`);
}

for (let pass = 0; pass < passes; pass += 1) {
  for (const row of matrix.branches) {
    const key = `${row.orientation}/${row.stockpiles}`;
    if (!filter || filter === key) verify(row);
  }
}
if (requireExact && !allExact) process.exit(1);
