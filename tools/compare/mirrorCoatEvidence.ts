import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnMirrorCoatView,
  type SceneOnMirrorCoatConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { mirrorCoatScenario } from "./mirrorCoatScenario.ts";

interface Fixture extends SceneOnMirrorCoatConfig {
  schema: string;
  orientation: "player-back" | "opponent-front";
  sourceWindow: {
    startFrame: number; endFrame: number; frameCount: number; wallFrame: number;
  };
  counterReceipt: {
    specialDmg: number; specialBattlerId: number; resolvedDamage: number;
  };
  evidenceSha256: string;
  rawRgbSha256: string;
}
interface Sprite {
  slot: number; template: number; x: number; y: number;
  attr: number[]; data: number[]; invisible: boolean;
}
interface Frame {
  frame: number; sha256: string; effectSprites: Sprite[]; battlers: Sprite[];
  visualTaskCount: number; soundTaskCount: number;
  registers: { dispcnt: number; bldcnt: number; bldalpha: number };
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[]; oam: number[][]; matrices: number[][];
  se1: { songHeader: number; tracks: { flags: number; panX: number }[] };
  counterReceipt: {
    attacker: number; specialDmg: number;
    specialBattlerId: number; resolvedDamage: number;
  };
  battle: unknown;
}
interface Probe {
  schema: string; songHeader: number;
  templates: { wall: number; sparkle: number }; frames: Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: mirrorCoatEvidence.ts <player-fixture> <opponent-fixture>",
  );
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const evidenceDigests = new Map<string, string>();
const rawDigests = new Map<string, string>();

function stableBattle(value: unknown): unknown {
  const battle = value as Record<"player" | "opponent", Record<string, unknown>>;
  return Object.fromEntries(["player", "opponent"].map((side) => {
    const battler = battle[side as "player" | "opponent"];
    return [side, {
      species: battler.species,
      hp: battler.hp,
      maxHp: battler.maxHp,
      item: battler.item,
      status1: battler.status1,
      status2: battler.status2,
      status3: battler.status3,
      statStages: battler.statStages,
    }];
  }));
}

function framebufferDiff(app: Uint8ClampedArray, raw: Buffer): number {
  let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      app[pixel * 4] !== raw[pixel * 3]
      || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
    ) count += 1;
  }
  return count;
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(
    join(tmpdir(), "pokebench-mirror-coat-evidence-"),
  );
  const scenario = join(scratch, "scenario.json");
  const output = join(scratch, "probe.json");
  const rgb = join(scratch, "rgb");
  writeFileSync(
    scenario,
    `${JSON.stringify(mirrorCoatScenario(fixture.orientation), null, 2)}\n`,
  );
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    join(root, "tools/compare/lightScreenProbe.py"),
    scenario,
    output,
    rgb,
    "mirror-coat",
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  if (probe.schema !== "mirror-coat-dense-evidence/v1") {
    throw new Error(`${fixture.orientation}: unexpected probe schema`);
  }
  const evidenceDigest = createHash("sha256").update(bytes).digest("hex");
  if (evidenceDigest !== fixture.evidenceSha256) {
    throw new Error(`${fixture.orientation}: evidence ${evidenceDigest}`);
  }
  if (
    evidenceDigests.has(fixture.orientation)
    && evidenceDigests.get(fixture.orientation) !== evidenceDigest
  ) throw new Error(`${fixture.orientation}: fresh evidence changed`);
  evidenceDigests.set(fixture.orientation, evidenceDigest);

  const rows = new Map(probe.frames.map((row) => [row.frame, row]));
  const stage = createSceneOnMovePresentation<SceneOnMirrorCoatConfig>({
    move: "MIRROR_COAT",
    attacker: fixture.attacker,
    target: fixture.target,
    allocatorProfile: fixture.allocatorProfile,
    fieldProfile: fixture.fieldProfile,
  });
  const rawHash = createHash("sha256");
  const initialBattle = stableBattle(
    rows.get(fixture.sourceWindow.startFrame)!.battle,
  );
  const failures: string[] = [];
  let matches = 0;
  let framebufferMatches = 0;
  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const row = rows.get(frame);
    if (!row) throw new Error(`${fixture.orientation}: missing ${frame}`);
    const age = frame - fixture.sourceWindow.wallFrame;
    const view = sceneOnMirrorCoatView({ ...stage, age });
    const wall = row.effectSprites.find(
      (sprite) => sprite.template === probe.templates.wall,
    );
    const actualSparkles = row.effectSprites.filter(
      (sprite) => sprite.template === probe.templates.sparkle,
    ).map((sprite) => ({
      slot: sprite.slot,
      x: sprite.x,
      y: sprite.y,
      tileOffset: (sprite.attr[2]! & 1023) - 305,
    })).sort((left, right) => left.slot - right.slot);
    const expectedSparkles = view.sparkles.map((sprite) => ({
      slot: fixture.allocatorProfile.sparkles[sprite.spawnIndex],
      x: sprite.x,
      y: sprite.y,
      tileOffset: sprite.tileOffset,
    })).sort((left, right) => left.slot - right.slot);
    const wallOk = view.wall === null ? wall === undefined
      : wall !== undefined
        && wall.slot === fixture.allocatorProfile.wall
        && wall.x === view.wall.x
        && wall.y === view.wall.y
        && wall.data[2] === view.wall.paletteRotationSteps;
    const alpha = view.alpha === null
      ? row.registers.bldcnt === 0 && row.registers.bldalpha === 0
      : row.registers.bldcnt === 16192
        && row.registers.bldalpha === view.alpha.eva
          + (view.alpha.evb << 8);
    const hidden = row.battlers[1]!.invisible
      === view.opponentBattlerHidden;
    const counts =
      row.visualTaskCount === row.effectSprites.length
      && row.soundTaskCount === 0
      && view.soundTaskActive === false;
    const prior = rows.get(frame - 1);
    const priorVisible = prior?.effectSprites.filter(
      (sprite) => !sprite.invisible,
    ) ?? [];
    const hardwareOam = priorVisible.every((sprite) =>
      row.oam.some((entry) => same(entry, sprite.attr)));
    const paletteLatch = age <= 0 || prior === undefined
      || same(row.hardwarePalette, prior.fadedPalette);
    const tags = (!wall || row.paletteTags.includes(10168))
      && (!actualSparkles.length || row.paletteTags.includes(10070));
    const sound = age < 12 || age > 66 || (
      row.se1.songHeader === probe.songHeader
      && row.se1.tracks.some((track) => track.flags !== 0)
      && row.se1.tracks.filter((track) => track.flags !== 0).every(
        (track) => track.panX === (
          fixture.attacker.geometry.side === "player" ? -64 : 63
        ),
      )
    );
    const receipt = same(
      {
        specialDmg: row.counterReceipt.specialDmg,
        specialBattlerId: row.counterReceipt.specialBattlerId,
        resolvedDamage: row.counterReceipt.resolvedDamage,
      },
      fixture.counterReceipt,
    );
    const shapes =
      row.oam.length === 128
      && row.matrices.length === 32
      && row.fadedPalette.length === 512
      && row.unfadedPalette.length === 512
      && row.hardwarePalette.length === 512;

    const raw = readFileSync(
      join(rgb, `${String(frame).padStart(5, "0")}.rgb`),
    );
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== row.sha256) {
      throw new Error(`${fixture.orientation}: raw frame ${frame} changed`);
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = framebufferDiff(render(engine), raw);
    if (diff === 0) framebufferMatches += 1;
    const ok =
      wallOk
      && same(actualSparkles, expectedSparkles)
      && alpha && hidden && counts && hardwareOam && paletteLatch
      && tags && sound && receipt && shapes
      && same(stableBattle(row.battle), initialBattle)
      && diff === 0;
    if (ok) matches += 1;
    else failures.push(
      `${frame}/age${age}: wall=${wallOk} sparkle=`
      + `${same(actualSparkles, expectedSparkles)} alpha=${alpha} `
      + `hidden=${hidden} counts=${counts} oam=${hardwareOam} `
      + `palette=${paletteLatch} tags=${tags} sound=${sound} `
      + `receipt=${receipt} state=`
      + `${same(stableBattle(row.battle), initialBattle)} framebuffer=${diff}`,
    );
  }
  const rawDigest = rawHash.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    throw new Error(`${fixture.orientation}: raw RGB ${rawDigest}`);
  }
  if (
    rawDigests.has(fixture.orientation)
    && rawDigests.get(fixture.orientation) !== rawDigest
  ) throw new Error(`${fixture.orientation}: fresh RGB changed`);
  rawDigests.set(fixture.orientation, rawDigest);
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${matches}/${fixture.sourceWindow.frameCount} source/component; `
    + `${framebufferMatches}/${fixture.sourceWindow.frameCount} framebuffer; `
    + `evidence=${evidenceDigest}; raw=${rawDigest}`,
  );
  if (failures.length) throw new Error(failures.slice(0, 20).join("\n"));
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath!, runNumber);
}
