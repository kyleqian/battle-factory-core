// Twice-fresh full-HP power-20 proof for MOVE_FLAIL. Retained natural-HP
// powers are batch-replayed by flailPortable.ts; this verifier regenerates the
// two remaining legal orientation windows directly from mGBA.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { flailAtAge } from "../../src/animation/flail.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFlailView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(join(
  root,
  "tools/compare/fixtures/flail-full-hp-evidence.json",
), "utf8")) as any;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

function run(orientation: any, runNumber: number): { evidence: string; raw: string } {
  const scratch = createScratchDir("pokebench-flail-fresh-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python3"),
    join(root, fixture.probe), join(root, orientation.scenario), output, rgbDir,
  ], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONPATH: [join(vendor, "libmgba-py"), process.env.PYTHONPATH]
        .filter(Boolean).join(":"),
    },
  });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) throw new Error(`Flail probe exited ${proc.status}`);
  const evidenceBytes = readFileSync(output);
  const probe = JSON.parse(evidenceBytes.toString("utf8")) as any;
  const playerBack = orientation.id.startsWith("player-back-");
  if (probe.frames.length !== 114 || probe.frames[0]?.animMovePower !== 20) {
    throw new Error(`${orientation.id}: incomplete full-HP branch`);
  }
  const first = probe.frames[0];
  const hitTemplate = probe.componentSymbols.gRandomPosHitSplatSpriteTemplate;
  const hit = probe.frames[49].sprites.find((sprite: any) =>
    sprite.template.address === hitTemplate);
  const attackerIndex = playerBack ? 0 : 1;
  const targetIndex = playerBack ? 1 : 0;
  const targetSlot = first.battlerSpriteIds[targetIndex];
  const targetInitialX2 = first.sprites.find((sprite: any) =>
    sprite.slot === targetSlot).x2;
  const attacker = playerBack
    ? { species: "KRABBY", geometry: { side: "player", spriteCorner: { x: 40, y: 58 }, animationCenter: { x: 72, y: 90 }, battlePositionCenter: { x: 72, y: 80 } } }
    : { species: "KRABBY", geometry: { side: "opponent", spriteCorner: { x: 144, y: 21 }, animationCenter: { x: 176, y: 53 }, battlePositionCenter: { x: 176, y: 40 } } };
  const target = playerBack
    ? { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } }
    : { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } } };
  const player = first.battlers.player;
  const opponent = first.battlers.opponent;
  const stage = createSceneOnMovePresentation({
    move: "FLAIL", attacker, target,
    fieldProfile: {
      playerHp: player.hp, playerMaxHp: player.maxHp,
      opponentHp: opponent.hp, opponentMaxHp: opponent.maxHp,
      playerGender: "male", opponentGender: "male",
    },
    movePower: 20,
    targetInitialX2,
    hitsplatCenter: { x: hit.x, y: hit.y },
    visualRandom: { x: hit.x2 + 24, y: hit.y2 + 12 },
  } as never);
  const immutable = JSON.stringify({
    battlers: first.battlers, parties: first.parties,
    gameplayRng: first.gameplayRng, immutableState: first.immutableState,
  });
  const rawHash = createHash("sha256");
  const failures: string[] = [];
  for (let age = 0; age < 114; age += 1) {
    const row = probe.frames[age];
    const raw = readFileSync(join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    const expected = flailAtAge(age, {
      attackerSide: playerBack ? "player" : "opponent",
      targetCenter: { x: hit.x, y: hit.y }, targetInitialX2, power: 20,
      visualRandom: { x: hit.x2 + 24, y: hit.y2 + 12 },
    });
    const seam = sceneOnFlailView({ ...stage, age } as never);
    const attackerSlot = row.battlerSpriteIds[attackerIndex];
    const currentTargetSlot = row.battlerSpriteIds[targetIndex];
    const sourceAttacker = row.sprites.find((sprite: any) => sprite.slot === attackerSlot);
    const sourceTarget = row.sprites.find((sprite: any) => sprite.slot === currentTargetSlot);
    const sourceHit = row.sprites.find((sprite: any) =>
      sprite.template.address === hitTemplate);
    const reducer = same({
      task: seam.movementTask, offset: seam.attackerOffset,
      matrix: seam.attackerMatrix, targetShakeX2: seam.targetShakeX2,
      hitsplat: seam.hitsplat,
    }, {
      task: expected.movementTask, offset: expected.attackerOffset,
      matrix: expected.attackerMatrix, targetShakeX2: expected.targetShakeX2,
      hitsplat: expected.hitsplat,
    });
    const source = same(expected.attackerOffset, { x2: sourceAttacker.x2, y2: sourceAttacker.y2 })
      && same(expected.attackerMatrix, {
        a: sourceAttacker.matrix[0], b: sourceAttacker.matrix[1],
        c: sourceAttacker.matrix[2], d: sourceAttacker.matrix[3],
      })
      && expected.targetShakeX2 === sourceTarget.x2
      && Boolean(expected.hitsplat) === Boolean(sourceHit);
    const stable = JSON.stringify({
      battlers: row.battlers, parties: row.parties,
      gameplayRng: row.gameplayRng, immutableState: row.immutableState,
    }) === immutable;
    const rawExact = sha256(raw) === row.sha256;
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let residual = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const rgba = pixel * 4;
      const rgb = pixel * 3;
      if (app[rgba] !== raw[rgb] || app[rgba + 1] !== raw[rgb + 1]
        || app[rgba + 2] !== raw[rgb + 2]) residual += 1;
    }
    if (!reducer || !source || !stable || !rawExact || residual !== 0) {
      failures.push(`age ${age}: reducer=${reducer} source=${source} stable=${stable} raw=${rawExact} residual=${residual}`);
    }
  }
  const evidence = sha256(evidenceBytes);
  const raw = rawHash.digest("hex");
  if (failures.length) throw new Error(`${orientation.id}:\n${failures.slice(0, 12).join("\n")}`);
  // The probe schema gained `expectedPower` after the v1 checkpoint, so its
  // JSON digest intentionally differs. Raw RGB remains byte-identical and the
  // complete current state document must repeat between the two fresh runs.
  if (raw !== orientation.rawRgbSha256) {
    throw new Error(`${orientation.id}: receipt drift evidence=${evidence} raw=${raw}`);
  }
  console.log(`${orientation.id} run ${runNumber}: 114/114 source/reducer/seam/raw-RGB/framebuffer exact; ${evidence.slice(0, 12)} / ${raw.slice(0, 12)}`);
  return { evidence, raw };
}

for (const orientation of fixture.orientations) {
  const first = run(orientation, 1);
  const second = run(orientation, 2);
  if (!same(first, second)) throw new Error(`${orientation.id}: fresh runs differ`);
}
