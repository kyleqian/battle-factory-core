import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  brickBreakAtAge,
  type BrickBreakBody,
} from "../../src/animation/brickBreak.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBrickBreakView,
  type SceneOnBrickBreakConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

type Fixture = {
  schema: string;
  oracleProfile: string;
  orientation: "player-back" | "opponent-front";
  scenario: string;
  probe: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSha256: string;
  rawRgbSha256: string;
};
type Sprite = {
  slot: number;
  template: { symbol: string | null };
  x: number; y: number; x2: number; y2: number;
};
type Frame = {
  frame: number;
  sha256: string;
  active: number;
  visualTaskCount: number;
  sprites: Sprite[];
  tasks: Array<{ func: { symbol: string | null } }>;
  paletteTags: number[];
  tileTags: number[];
  registers: { bldcnt: number; bldalpha: number; bldy: number };
  se1: { songHeader: number; tracks: Array<{ flags: number; panX: number }> };
  battlers: {
    player: Record<string, unknown>;
    opponent: Record<string, unknown>;
  };
};
type Probe = {
  schema: string;
  sourceWindow: Fixture["sourceWindow"];
  lifecycleCounts: { wall: number; shard: number };
  songHeaders: Record<string, number>;
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 4) {
  throw new Error(
    "usage: brickBreakPortable.ts <normal player> <normal opponent> "
      + "<wall player> <wall opponent>",
  );
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, string>();

function configFor(
  fixture: Fixture,
  body: BrickBreakBody,
  first: Frame,
): SceneOnBrickBreakConfig {
  const player = fixture.orientation === "player-back";
  return {
    move: "BRICK_BREAK",
    body,
    attacker: player ? {
      species: "LOMBRE",
      geometry: {
        side: "player",
        spriteCorner: { x: 40, y: 56 },
        animationCenter: { x: 72, y: 88 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    } : {
      species: "LOMBRE",
      geometry: {
        side: "opponent",
        spriteCorner: { x: 144, y: 17 },
        animationCenter: { x: 176, y: 49 },
        battlePositionCenter: { x: 176, y: 40 },
      },
    },
    target: player ? {
      species: "ONIX",
      geometry: {
        side: "opponent",
        spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 },
      },
    } : {
      species: "ONIX",
      geometry: {
        side: "player",
        spriteCorner: { x: 40, y: 48 },
        animationCenter: { x: 72, y: 88 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    },
    fieldProfile: {
      playerHp: Number(first.battlers.player.hp),
      playerMaxHp: Number(first.battlers.player.maxHp),
      opponentHp: Number(first.battlers.opponent.hp),
      opponentMaxHp: Number(first.battlers.opponent.maxHp),
      playerGender: "male",
      opponentGender: "male",
    },
  };
}

function verify(path: string, pass: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const body: BrickBreakBody = fixture.sourceWindow.frameCount === 151
    ? "normal" : "shattered-wall";
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-brick-live-"));
  const out = join(scratch, "probe.json");
  const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), out, "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe), resolve(root, fixture.scenario), out, rgb,
  ], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);
  const bytes = readFileSync(out);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawWindow = createHash("sha256");
  const failures: string[] = [];
  const expectedLifecycles = body === "normal"
    ? { wall: 0, shard: 0 } : { wall: 1, shard: 4 };
  if (
    fixture.schema !== "brick-break-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== "brick-break-dense-evidence/v1"
    || !same(fixture.sourceWindow, probe.sourceWindow)
    || !same(probe.lifecycleCounts, expectedLifecycles)
  ) failures.push("fixture/source boundary");
  const stage = createSceneOnMovePresentation(
    configFor(fixture, body, probe.frames[0]!),
  );
  let semantic = 0;
  let framebuffer = 0;
  for (const [age, oracle] of probe.frames.entries()) {
    const before = failures.length;
    const raw = readFileSync(
      join(rgb, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    rawWindow.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== oracle.sha256) {
      failures.push(`age ${age}: raw hash`);
    }
    const predicted = brickBreakAtAge(
      age, body, stage.config.attacker.geometry.side,
      stage.config.target.geometry.animationCenter,
      stage.config.target.geometry.battlePositionCenter,
    );
    const seam = sceneOnBrickBreakView({ ...stage, age });
    const { age: _age, attacker: _a, target: _t, ...seamState } = seam;
    if (!same(predicted, seamState)) failures.push(`age ${age}: seam`);
    const actualEffect = oracle.sprites.filter((sprite) =>
      sprite.template.symbol?.startsWith("gBrickBreakWall")
      || sprite.template.symbol === "gBasicHitSplatSpriteTemplate"
      || sprite.template.symbol === "gFistFootSpriteTemplate"
    ).map((sprite) => ({
      slot: sprite.slot,
      kind: sprite.template.symbol === "gBrickBreakWallSpriteTemplate"
        ? "wall"
        : sprite.template.symbol === "gBrickBreakWallShardSpriteTemplate"
          ? "shard"
          : sprite.template.symbol === "gFistFootSpriteTemplate"
            ? "fist" : "hitsplat",
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    })).sort((left, right) => left.slot - right.slot);
    const expectedEffect = predicted.sprites.map((sprite) => ({
      slot: sprite.oamSlot, kind: sprite.kind,
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    })).sort((left, right) => left.slot - right.slot);
    if (!same(actualEffect, expectedEffect)) {
      failures.push(`age ${age}: sprite state`);
    }
    const attackerSlot = stage.config.attacker.geometry.side === "player" ? 6 : 8;
    const actualAttacker = oracle.sprites.find((sprite) => sprite.slot === attackerSlot);
    if (
      actualAttacker?.x2 !== predicted.attackerOffset.x2
      || actualAttacker?.y2 !== predicted.attackerOffset.y2
    ) failures.push(`age ${age}: attacker offset`);
    if (
      Boolean(oracle.active) !== predicted.active
      || oracle.registers.bldcnt !== predicted.registers.bldcnt
      || oracle.registers.bldalpha !== predicted.registers.bldalpha
      || oracle.paletteTags.includes(10208) !== predicted.assetsLoaded
      || oracle.tileTags.includes(10208) !== predicted.assetsLoaded
    ) failures.push(`age ${age}: lifecycle/register/tag`);
    if (predicted.sound) {
      const header = probe.songHeaders[predicted.sound];
      if (
        oracle.se1.songHeader !== header
        || !oracle.se1.tracks.some((track) =>
          (track.flags & 0x80) && track.panX === predicted.soundPan)
      ) failures.push(`age ${age}: sound`);
    }
    if (failures.length === before) semantic += 1;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
      ) diff += 1;
    }
    if (diff === 0) framebuffer += 1;
    else {
      let minX = 240, minY = 160, maxX = 0, maxY = 0;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        if (
          app[pixel * 4] !== raw[pixel * 3]
          || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
          || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
        ) {
          const x = pixel % 240, y = Math.floor(pixel / 240);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
      let first = 0;
      while (first < 240 * 160 && (
        app[first * 4] === raw[first * 3]
        && app[first * 4 + 1] === raw[first * 3 + 1]
        && app[first * 4 + 2] === raw[first * 3 + 2]
      )) first += 1;
      failures.push(
        `age ${age}: framebuffer ${diff} bbox ${minX},${minY}-${maxX},${maxY} `
          + `first ${first % 240},${Math.floor(first / 240)} app `
          + `${app[first * 4]},${app[first * 4 + 1]},${app[first * 4 + 2]} `
          + `raw ${raw[first * 3]},${raw[first * 3 + 1]},${raw[first * 3 + 2]}`,
      );
    }
  }
  const rawHash = rawWindow.digest("hex");
  if (evidence !== fixture.evidenceSha256) failures.push(`evidence ${evidence}`);
  if (rawHash !== fixture.rawRgbSha256) failures.push(`raw ${rawHash}`);
  const key = `${body}/${fixture.orientation}`;
  if (fresh.has(key) && fresh.get(key) !== `${evidence}/${rawHash}`) {
    failures.push("fresh reproducibility");
  }
  fresh.set(key, `${evidence}/${rawHash}`);
  console.log(
    `${body} ${fixture.orientation} run ${pass}: `
      + `${semantic}/${probe.frames.length} semantic; `
      + `${framebuffer}/${probe.frames.length} production framebuffer; `
      + `evidence/raw-RGB ${evidence}/${rawHash}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 60).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let pass = 1; pass <= 2; pass += 1) {
  for (const path of paths) verify(path, pass);
}
