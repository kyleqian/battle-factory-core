import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { readFileSync, realpathSync } from "node:fs";
import {
  createSceneOnMovePresentation,
  sceneOnRockTombView,
  type SceneOnRockTombConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { reduceRockTomb } from "../../src/animation/rockTomb.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Orientation = "player-back" | "opponent-front";
type Row = Record<string, any>;
type Fixture = {
  readonly schema: string;
  readonly profile: string;
  readonly status: string;
  readonly orientations: Record<Orientation, {
    readonly scenario: string;
    readonly scenarioSha256: string;
    readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
    readonly stateGzip: string;
    readonly stateGzipSha256: string;
    readonly stateSha256: string;
    readonly rawRgbArchive: string;
    readonly rawRgbArchiveSha256: string;
    readonly changeMap: string;
    readonly changeMapSha256: string;
  }>;
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(
  join(root, "tools/compare/fixtures/rock-tomb-dense-evidence.json"),
  "utf8",
)) as Fixture;
const retainedOnly = process.argv.includes("--retained");
const requireExact = process.argv.includes("--require-exact");
const once = process.argv.includes("--once");
const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

function configFor(orientation: Orientation, first: Row): SceneOnRockTombConfig {
  const makeBattler = (which: "attacker" | "target") => {
    const sprite = first.battlerSprites[which];
    const side = (first.animationBattlers[which] & 1) !== 0 ? "opponent" : "player";
    const species = (first.battlers[side].species === 88 ? "GRIMER" : "ONIX") as "GRIMER" | "ONIX";
    return {
      species,
      geometry: {
        side,
        spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
        animationCenter: { x: sprite.x, y: sprite.y },
        battlePositionCenter: { x: sprite.x, y: side === "player" ? 80 : 40 },
      },
    };
  };
  const player = first.battlers.player;
  const opponent = first.battlers.opponent;
  return {
    move: "ROCK_TOMB",
    attacker: makeBattler("attacker"),
    target: makeBattler("target"),
    fieldProfile: {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      opponentHp: opponent.hp,
      opponentMaxHp: opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
    targetSpriteSlot: first.battlerSprites.target.slot,
    targetInitialX2: first.battlerSprites.target.x2,
    effectCenter: {
      x: first.battlerSprites.target.x,
      y: first.battlerSprites.target.y
        + (first.animationBattlers.target & 1 ? 0 : 8),
    },
  };
}

function reducerProjection(state: ReturnType<typeof reduceRockTomb>[number]): unknown {
  return {
    active: state.active,
    scriptOffset: state.scriptOffset,
    visualTaskCount: state.visualTaskCount,
    rocks: state.rocks,
    redX: state.redX,
    tasks: state.tasks,
    targetX2: state.targetX2,
    targetY2: state.targetY2,
    battleBg3: state.battleBg3,
  };
}

function sourceProjection(row: Row): unknown {
  return {
    active: row.gAnimScriptActive,
    scriptOffset: row.scriptOffset,
    visualTaskCount: row.visualTaskCount,
    rocks: row.sprites
      .filter((sprite: Row) => sprite.template?.symbol === "gRockTombRockSpriteTemplate")
      .map((sprite: Row) => ({
        slot: sprite.slot, x2: sprite.x2, y2: sprite.y2,
        data: sprite.data.slice(0, 4), invisible: Boolean(sprite.invisible),
      })),
    redX: (() => {
      const sprite = row.sprites.find((candidate: Row) => candidate.template?.symbol === "gRedXSpriteTemplate");
      return sprite === undefined ? null : {
        slot: sprite.slot, data: sprite.data.slice(0, 4), invisible: Boolean(sprite.invisible),
      };
    })(),
    tasks: row.tasks.map((task: Row) => ({ name: task.func.symbol, data: task.data.slice(0, 8) })),
    targetX2: row.battlerSprites.target.x2,
    targetY2: row.battlerSprites.target.y2,
    battleBg3: row.battleBg3,
  };
}

function framebufferDiff(app: Uint8Array, raw: Buffer): { count: number; bbox: string; sample: string } {
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  const sample: string[] = [];
  for (let p = 0; p < 240 * 160; p += 1) {
    const a = p * 4, r = p * 3;
    if (app[a] === raw[r] && app[a + 1] === raw[r + 1] && app[a + 2] === raw[r + 2]) continue;
    const x = p % 240, y = Math.floor(p / 240);
    count += 1; minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    if (sample.length < 3) sample.push(`${x},${y} app=${app[a]},${app[a + 1]},${app[a + 2]} raw=${raw[r]},${raw[r + 1]},${raw[r + 2]}`);
  }
  return { count, bbox: count === 0 ? "none" : `${minX},${minY}-${maxX},${maxY}`, sample: sample.join("; ") };
}

function normalizedChangeMap(retainedPath: string, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], {
    cwd: root, encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`change-map failed (${run.status})`);
  const retainedHeader = readFileSync(resolve(root, retainedPath), "utf8").split("\n", 1)[0]!;
  const separator = run.stdout.indexOf(" — ");
  if (separator < 0) throw new Error("change-map header changed");
  return `${retainedHeader.split(" — ", 1)[0]} — ${run.stdout.slice(separator + 3)}`;
}

function freshProbe(orientation: Orientation, row: Fixture["orientations"][Orientation]): { probe: Row; rgbDir: string; scratch: string } {
  const scenarioBytes = readFileSync(resolve(root, row.scenario));
  if (sha256(scenarioBytes) !== row.scenarioSha256) throw new Error(`${orientation}: scenario hash`);
  const scratch = createScratchDir(`pokebench-rock-tomb-${orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), join(root, "tools/compare/rockTombProbe.py"),
    resolve(root, row.scenario), output, rgbDir], {
      cwd: root, encoding: "utf8", env: { ...process.env, PYTHONPATH: join(vendor, "libmgba-py") },
    });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${orientation}: probe failed (${run.status})`);
  const bytes = readFileSync(output);
  if (sha256(bytes) !== row.stateSha256) throw new Error(`${orientation}: fresh state hash ${sha256(bytes)}`);
  return { probe: JSON.parse(bytes.toString("utf8")) as Row, rgbDir, scratch };
}

function retainedProbe(orientation: Orientation, row: Fixture["orientations"][Orientation]): { probe: Row; rgbDir: string; scratch: string } {
  const compressed = readFileSync(resolve(root, row.stateGzip));
  if (sha256(compressed) !== row.stateGzipSha256) throw new Error(`${orientation}: retained state archive hash`);
  const archive = readFileSync(resolve(root, row.rawRgbArchive));
  if (sha256(archive) !== row.rawRgbArchiveSha256) throw new Error(`${orientation}: retained RGB archive hash`);
  const scratch = createScratchDir(`pokebench-rock-tomb-retained-${orientation}-`);
  const extract = spawnSync("tar", ["-xzf", resolve(root, row.rawRgbArchive), "-C", scratch], { cwd: root, encoding: "utf8" });
  if (extract.status !== 0) throw new Error(`${orientation}: retained RGB extract`);
  return { probe: JSON.parse(gunzipSync(compressed).toString("utf8")) as Row, rgbDir: join(scratch, "rgb"), scratch };
}

function validate(orientation: Orientation, row: Fixture["orientations"][Orientation], run: { probe: Row; rgbDir: string }): {
  reducerRows: number; seamRows: number; hardwareOamRows: number; hardwareMatrixRows: number;
  hardwarePaletteRows: number; audioRows: number; immutableStateRows: number; rawRgbRows: number;
  framebufferRows: number; residualAges: readonly number[]; residuals: readonly string[];
} {
  const probe = run.probe;
  if (probe.schema !== fixture.schema || !same(probe.sourceWindow, row.sourceWindow) || probe.frames.length !== 174) {
    throw new Error(`${orientation}: source window/schema`);
  }
  const frames = probe.frames as Row[];
  const first = frames[0]!;
  const config = configFor(orientation, first);
  const states = reduceRockTomb({
    targetSpriteSlot: config.targetSpriteSlot,
    targetInitialX2: config.targetInitialX2,
    targetCenter: config.effectCenter,
  });
  const stage = createSceneOnMovePresentation<SceneOnRockTombConfig>(config);
  let reducerRows = 0, seamRows = 0, hardwareOamRows = 0, hardwareMatrixRows = 0;
  let hardwarePaletteRows = 0, audioRows = 0, immutableStateRows = 0, rawRgbRows = 0, framebufferRows = 0;
  const residualAges: number[] = [];
  const residuals: string[] = [];
  const immutable = JSON.stringify(first.immutableState);
  for (const [age, frame] of frames.entries()) {
    if (!same(reducerProjection(states[age]!), sourceProjection(frame))) {
      throw new Error(`${orientation}: reducer/source mismatch at age ${age}`);
    }
    reducerRows += 1;
    const view = sceneOnRockTombView({ ...stage, age });
    if (same(reducerProjection(view), reducerProjection(states[age]!))) seamRows += 1;
    if (frame.se1?.songHeaderIdentity?.symbol === "se_m_strength" && [36, 56, 76, 96].includes(age)) audioRows += 1;
    if (frame.se1?.songHeaderIdentity?.symbol === "se_m_hyper_beam" && age === 122) audioRows += 1;
    if (JSON.stringify(frame.immutableState) === immutable) immutableStateRows += 1;
    if (age > 0) {
      if (same(frame.hardwareOam, frames[age - 1]!.softwareOam)) hardwareOamRows += 1;
      if (same(frame.hardwareMatrices, frames[age - 1]!.softwareMatrices)) hardwareMatrixRows += 1;
      if (same(frame.hardwarePalette, frames[age - 1]!.fadedPalette)) hardwarePaletteRows += 1;
    }
    const rawPath = join(run.rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`);
    const raw = readFileSync(rawPath);
    if (raw.length !== 240 * 160 * 3 || sha256(raw) !== frame.sha256) throw new Error(`${orientation}: raw RGB row ${age}`);
    rawRgbRows += 1;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = framebufferDiff(render(engine), raw);
    if (diff.count === 0) framebufferRows += 1;
    else {
      residualAges.push(age);
      if (residuals.length < 24) residuals.push(`age${age}/frame${frame.frame}: ${diff.count}px ${diff.bbox}; ${diff.sample}`);
    }
  }
  const map = normalizedChangeMap(row.changeMap, run.rgbDir);
  if (sha256(map) !== row.changeMapSha256 || map !== readFileSync(resolve(root, row.changeMap), "utf8")) {
    throw new Error(`${orientation}: change map`);
  }
  const result = { reducerRows, seamRows, hardwareOamRows, hardwareMatrixRows, hardwarePaletteRows, audioRows, immutableStateRows, rawRgbRows, framebufferRows, residualAges, residuals };
  console.log(`${orientation}: reducer ${reducerRows}/174; seam ${seamRows}/174; hardware ${hardwareOamRows}/${hardwareMatrixRows}/${hardwarePaletteRows}; audio ${audioRows}/5; immutable ${immutableStateRows}/174; raw RGB ${rawRgbRows}/174; framebuffer ${framebufferRows}/174`);
  if (residualAges.length) console.log(`${orientation}: residual ages ${residualAges.join(",")}`);
  if (residuals.length) console.log(residuals.join("\n"));
  return result;
}

function runOnce(): void {
  const totals = { reducerRows: 0, seamRows: 0, hardwareOamRows: 0, hardwareMatrixRows: 0, hardwarePaletteRows: 0, audioRows: 0, immutableStateRows: 0, rawRgbRows: 0, framebufferRows: 0 };
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const row = fixture.orientations[orientation];
    const run = retainedOnly ? retainedProbe(orientation, row) : freshProbe(orientation, row);
    const result = validate(orientation, row, run);
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += result[key];
  }
  console.log(`rock tomb totals: reducer ${totals.reducerRows}/348; seam ${totals.seamRows}/348; hardware ${totals.hardwareOamRows}/${totals.hardwareMatrixRows}/${totals.hardwarePaletteRows}/346; audio ${totals.audioRows}/10; immutable ${totals.immutableStateRows}/348; raw RGB ${totals.rawRgbRows}/348; framebuffer ${totals.framebufferRows}/348`);
  if (requireExact && totals.framebufferRows !== 348) throw new Error("Rock Tomb production framebuffer is not exact");
}

if (fixture.profile !== "battle-scene-on") throw new Error("Rock Tomb validator requires Battle Scene ON");
runOnce();
if (!once && !retainedOnly) runOnce();
