// Fresh bilateral source/task/OAM/palette/audio/RGB proof for MOVE_METEOR_MASH.
// This is deliberately an evidence checkpoint verifier: production framebuffer
// equality remains a separate promotion gate.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import { meteorMashAtAge } from "../../src/animation/meteorMash.ts";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir, keepScratchDir } from "../lib/scratch.ts";

interface Fixture {
  schema: string;
  oracleProfile: string;
  move: string;
  orientation: "player-to-opponent" | "opponent-to-player";
  scenario: string;
  probe: string;
  denseWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSchema: string;
  evidenceSha256: string;
  secondFreshEvidenceSha256: string;
  rawRgbSha256: string;
  normalizedMapSha256: string;
  attacker: unknown;
  target: unknown;
  fieldProfile: unknown;
  twinkles: readonly { tile: 4 | 5; y2: number }[];
  expected?: { framebufferMatches: number };
}
interface Sprite {
  slot: number;
  template: { symbol: string | null };
  callback: { symbol: string | null };
  attr: readonly number[];
  x: number; y: number; x2: number; y2: number;
  invisible: number;
  data: readonly number[];
}
interface Frame {
  frame: number;
  gAnimScriptActive: boolean;
  scriptOffset: number | null;
  sprites: readonly Sprite[];
  battlers: unknown;
  parties: unknown;
  immutableState: unknown;
  softwareOam: readonly string[];
  hardwareOam: readonly string[];
  softwareMatrices: readonly (readonly number[])[];
  hardwareMatrices: readonly (readonly number[])[];
  fadedPalette: readonly number[];
  hardwarePalette: readonly number[];
  paletteTags: readonly number[];
  tileTags: readonly number[];
  registers: { bldcnt: number; bldy: number };
}
interface Probe {
  schema: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  lifecycle: Record<string, number>;
  frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: meteorMashPortable.ts <player-fixture> <opponent-fixture>");
}
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const sha256 = (bytes: Uint8Array | string): string =>
  createHash("sha256").update(bytes).digest("hex");

function rawDigest(frames: readonly Frame[], rgbDir: string): string {
  const hash = createHash("sha256");
  for (const frame of frames) {
    hash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
  }
  return hash.digest("hex");
}

function normalizedMap(frames: readonly Frame[], rgbDir: string): string {
  const start = frames[0]!.frame;
  const end = frames.at(-1)!.frame;
  const lines = [
    `# normalized Scene-ON MOVE_METEOR_MASH window ${start}..${end} (${frames.length} frames)`,
    "age  oracleFrame  changedPx  bbox(minx,miny-maxx,maxy)",
  ];
  let previous: Buffer | null = null;
  frames.forEach((frame, age) => {
    const current = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (previous === null) {
      lines.push(`${String(age).padStart(3, "0")}  ${frame.frame}  (first frame)`);
    } else if (!current.equals(previous)) {
      let changed = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        const offset = pixel * 3;
        if (current[offset] === previous[offset]
          && current[offset + 1] === previous[offset + 1]
          && current[offset + 2] === previous[offset + 2]) continue;
        changed += 1;
        const x = pixel % 240, y = Math.floor(pixel / 240);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      lines.push(`${String(age).padStart(3, "0")}  ${frame.frame}  ${changed}  ${minX},${minY}-${maxX},${maxY}`);
    }
    previous = current;
  });
  return `${lines.join("\n")}\n`;
}

function expectedMiniInvisible(localAge: number): boolean {
  let invisible = false, phase = 0;
  for (let callback = 1; callback <= localAge; callback += 1) {
    if (callback < 30) {
      if (++phase === 2) { invisible = !invisible; phase = 0; }
    } else {
      if (phase === 2) invisible = false;
      if (phase === 3) { invisible = true; phase = -1; }
      phase += 1;
    }
  }
  return invisible;
}

function verifyMechanisms(fixture: Fixture, probe: Probe, rgbDir: string): {
  framebufferMatches: number;
  closest: readonly (readonly [number, number])[];
  worst: readonly (readonly [number, number])[];
  mismatchPhases: readonly string[];
} {
  const rows = probe.frames;
  if (!same(probe.sourceWindow, fixture.denseWindow)
    || rows.length !== fixture.denseWindow.frameCount
    || !rows[0]!.gAnimScriptActive
    || rows.at(-1)!.gAnimScriptActive) throw new Error("pointer-bounded window drift");
  if (!same(probe.lifecycle, {
    meteorMashStars: 3,
    miniTwinklingStars: 48,
    spinningHands: 1,
    basicHitsplats: 1,
  })) throw new Error("sprite lifecycle drift");
  const immutable = rows[0]!;
  if (rows.some((row) => !same(row.battlers, immutable.battlers)
    || !same(row.parties, immutable.parties)
    || !same(row.immutableState, immutable.immutableState))) {
    throw new Error("Meteor Mash mutated battle state inside its presentation window");
  }
  for (let age = 1; age < rows.length; age += 1) {
    if (!same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)
      || !same(rows[age]!.hardwareMatrices, rows[age - 1]!.softwareMatrices)
      || !same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) {
      throw new Error(`software-to-hardware transfer drift at age ${age}`);
    }
  }
  const playerTarget = fixture.orientation === "opponent-to-player";
  const geometry = {
    targetSide: playerTarget ? "player" as const : "opponent" as const,
    targetCenter: playerTarget ? { x: 72, y: 88 } : { x: 176, y: 42 },
    twinkles: fixture.twinkles,
  };
  const stage = createSceneOnMovePresentation({
    move: "METEOR_MASH",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
    twinkles: fixture.twinkles,
  } as never);
  let framebufferMatches = 0;
  const framebufferDiffs: Array<readonly [number, number]> = [];
  const mismatchRows: Array<{
    age: number;
    differences: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }> = [];
  rows.forEach((row, age) => {
    const reduced = meteorMashAtAge(age, geometry);
    const parents = row.sprites.filter((sprite) =>
      sprite.template.symbol === "gMeteorMashStarSpriteTemplate");
    if (!same(parents.map((sprite) => [sprite.x, sprite.y, sprite.x2, sprite.y2, sprite.data[5]]),
      reduced.stars.map((star) => [star.x, star.y, star.x2, star.y2, star.callbacks]))) {
      throw new Error(`parent-star reducer drift at age ${age}`);
    }
    const sourceMinis = row.sprites.filter((sprite) =>
      sprite.template.symbol === "gMiniTwinklingStarSpriteTemplate");
    for (const mini of sourceMinis.filter((sprite) =>
      sprite.callback.symbol === "AnimMiniTwinklingStar_Step")) {
      const localAge = mini.data[0]!;
      const tile = mini.attr[2]! & 0x3ff;
      if (localAge < 0 || localAge > 60 || ![309, 310].includes(tile)
        || mini.y2 < -7 || mini.y2 > 3
        || Boolean(mini.invisible) !== expectedMiniInvisible(localAge)) {
        throw new Error(`mini-star lifecycle drift at age ${age}, slot ${mini.slot}`);
      }
    }
    const sourceMiniState = sourceMinis.map((mini) => [
      mini.slot,
      mini.callback.symbol === "AnimMiniTwinklingStar_Step",
      mini.data[0],
      mini.x,
      mini.y,
      mini.callback.symbol === "AnimMiniTwinklingStar_Step" ? mini.y2 : 0,
      mini.attr[2]! & 0x3ff,
      Boolean(mini.invisible),
    ]);
    const reducedMiniState = reduced.miniStars
      .slice()
      .sort((left, right) => left.slot - right.slot)
      .map((mini) => [
        mini.slot,
        mini.initialized,
        mini.localAge,
        mini.x,
        mini.y,
        mini.initialized ? mini.y2 : 0,
        mini.initialized ? 305 + mini.tile : 305,
        mini.invisible,
      ]);
    if (!same(sourceMiniState, reducedMiniState)) {
      throw new Error(
        `mini-star reducer drift at age ${age}: source=${JSON.stringify(sourceMiniState)} reduced=${JSON.stringify(reducedMiniState)}`,
      );
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
    let differences = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const rgba = pixel * 4, rgb = pixel * 3;
      if (app[rgba] !== raw[rgb] || app[rgba + 1] !== raw[rgb + 1]
        || app[rgba + 2] !== raw[rgb + 2]) {
        differences += 1;
        const x = pixel % 240, y = Math.floor(pixel / 240);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    if (differences === 0) framebufferMatches += 1;
    else {
      mismatchRows.push({ age, differences, minX, minY, maxX, maxY });
      if (process.env.METEOR_MASH_KEEP_DIAGNOSTICS === "1"
        && [51, 71, 87, 107, 124, 140, 170, 194, 213].includes(age)) {
        const witnesses: string[] = [];
        const oracleRgba = Buffer.alloc(240 * 160 * 4);
        const diffRgba = Buffer.alloc(240 * 160 * 4);
        for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
          const rgba = pixel * 4, rgb = pixel * 3;
          oracleRgba[rgba] = raw[rgb]!;
          oracleRgba[rgba + 1] = raw[rgb + 1]!;
          oracleRgba[rgba + 2] = raw[rgb + 2]!;
          oracleRgba[rgba + 3] = 255;
          const differs = app[rgba] !== raw[rgb]
            || app[rgba + 1] !== raw[rgb + 1]
            || app[rgba + 2] !== raw[rgb + 2];
          if (differs && witnesses.length < 12) {
            witnesses.push(
              `${pixel % 240},${Math.floor(pixel / 240)}:`
              + `${raw[rgb]},${raw[rgb + 1]},${raw[rgb + 2]}`
              + `>${app[rgba]},${app[rgba + 1]},${app[rgba + 2]}`,
            );
          }
          diffRgba[rgba] = differs ? 255 : app[rgba]!;
          diffRgba[rgba + 1] = differs ? 0 : app[rgba + 1]!;
          diffRgba[rgba + 2] = differs ? 255 : app[rgba + 2]!;
          diffRgba[rgba + 3] = 255;
        }
        const output = dirname(rgbDir);
        writeFileSync(join(output, `oracle-age-${age}.png`), PNG.sync.write({ width: 240, height: 160, data: oracleRgba }));
        writeFileSync(join(output, `app-age-${age}.png`), PNG.sync.write({ width: 240, height: 160, data: Buffer.from(app) }));
        writeFileSync(join(output, `diff-age-${age}.png`), PNG.sync.write({ width: 240, height: 160, data: diffRgba }));
        console.log(`  age ${age}: ${differences}px bbox ${minX},${minY}-${maxX},${maxY}; witnesses ${witnesses.join(" ")}`);
      }
    }
    framebufferDiffs.push([age, differences]);
  });
  const expectedBldy = rows.map((_, age) => meteorMashAtAge(age, geometry).fadeCoefficient);
  if (!same(rows.map((row) => row.registers.bldy), expectedBldy)) {
    throw new Error("BG_COSMIC BLDY schedule drift");
  }
  if (rows[11]!.registers.bldcnt !== 232 || rows[47]!.registers.bldcnt !== 0
    || rows[176]!.registers.bldcnt !== 232
    || rows.at(-2)!.registers.bldcnt !== 0) throw new Error("BG_COSMIC BLDCNT drift");
  const mismatchPhases: string[] = [];
  for (let index = 0; index < mismatchRows.length;) {
    const first = mismatchRows[index]!;
    let last = first;
    let previousAge = first.age - 1;
    let pixels = 0, peak = 0;
    let minX = 240, minY = 160, maxX = -1, maxY = -1;
    while (index < mismatchRows.length
      && mismatchRows[index]!.age === previousAge + 1) {
      const row = mismatchRows[index]!;
      last = row;
      previousAge = row.age;
      pixels += row.differences;
      peak = Math.max(peak, row.differences);
      minX = Math.min(minX, row.minX); minY = Math.min(minY, row.minY);
      maxX = Math.max(maxX, row.maxX); maxY = Math.max(maxY, row.maxY);
      index += 1;
    }
    mismatchPhases.push(
      `${first.age}..${last.age}: ${pixels}px total, ${peak}px peak, bbox ${minX},${minY}-${maxX},${maxY}`,
    );
  }
  const rankedDiffs = framebufferDiffs.sort((left, right) => left[1] - right[1]);
  return {
    framebufferMatches,
    closest: rankedDiffs.slice(0, 8),
    worst: rankedDiffs.slice(-12).reverse(),
    mismatchPhases,
  };
}

function run(fixturePath: string): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  if (fixture.schema !== "scene-on-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on" || fixture.move !== "METEOR_MASH") {
    throw new Error(`${fixturePath}: invalid fixture`);
  }
  const scratch = createScratchDir("pokebench-meteor-mash-");
  const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python3"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], {
    cwd: root, encoding: "utf8",
    env: { ...process.env, PYTHONPATH: [join(vendor, "libmgba-py"), process.env.PYTHONPATH].filter(Boolean).join(":") },
  });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString("utf8")) as Probe;
  const evidence = sha256(bytes), raw = rawDigest(probe.frames, rgbDir);
  const map = sha256(normalizedMap(probe.frames, rgbDir));
  if (probe.schema !== fixture.evidenceSchema || evidence !== fixture.evidenceSha256
    || evidence !== fixture.secondFreshEvidenceSha256 || raw !== fixture.rawRgbSha256
    || map !== fixture.normalizedMapSha256) {
    throw new Error(`${fixturePath}: receipt drift evidence=${evidence} raw=${raw} map=${map}`);
  }
  const { framebufferMatches, closest, worst, mismatchPhases } = verifyMechanisms(fixture, probe, rgbDir);
  if (fixture.expected && framebufferMatches !== fixture.expected.framebufferMatches) {
    throw new Error(`${fixturePath}: framebuffer count ${framebufferMatches}`);
  }
  console.log(`${fixture.orientation}: ${probe.frames.length}/${probe.frames.length} source/task/sprite/software+hardware OAM/matrix/palette/tag/register/audio/immutable-state/raw-RGB/map exact; production framebuffer ${framebufferMatches}/${probe.frames.length} (closest age/diff ${JSON.stringify(closest)}); evidence ${evidence.slice(0, 12)} raw ${raw.slice(0, 12)} map ${map.slice(0, 12)}`);
  console.log(`  mismatch phases: ${mismatchPhases.join("; ")}`);
  console.log(`  worst age/diff: ${JSON.stringify(worst)}`);
  if (process.env.METEOR_MASH_KEEP_DIAGNOSTICS === "1") {
    console.log(`  diagnostics: ${keepScratchDir(scratch)}`);
  }
}

for (const fixturePath of fixturePaths) run(fixturePath);
