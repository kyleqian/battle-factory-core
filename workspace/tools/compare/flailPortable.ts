import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Branch {
  readonly power: 20 | 40 | 80 | 100 | 150 | 200;
  readonly attacker: { readonly hp: number; readonly maxHp: number };
  readonly target: { readonly hp: number; readonly maxHp: number };
  readonly sourceWindow: { readonly startFrame: number; readonly frameCount: number };
  readonly evidence: { readonly stateGzip: string; readonly rawRgbArchive: string };
}

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/flail-natural-hp-evidence.json",
  "utf8",
)) as { readonly branches: Readonly<Record<string, Branch>> };
const failures: string[] = [];

for (const [id, branch] of Object.entries(fixture.branches)) {
  const playerBack = id.startsWith("player-back-");
  const probe = JSON.parse(gunzipSync(readFileSync(branch.evidence.stateGzip))
    .toString("utf8")) as any;
  const scratch = createScratchDir("pokebench-flail-portable-");
  execFileSync("tar", ["-xzf", resolve(branch.evidence.rawRgbArchive), "-C", scratch]);
  const first = probe.frames[0];
  const targetSlot = first.battlerSpriteIds[playerBack ? 1 : 0];
  const targetInitialX2 = first.sprites.find((sprite: any) =>
    sprite.slot === targetSlot).x2;
  const hitTemplate = probe.componentSymbols.gRandomPosHitSplatSpriteTemplate;
  const hit = probe.frames[49].sprites.find((sprite: any) =>
    sprite.template.address === hitTemplate);
  const attacker = playerBack
    ? { species: "KRABBY", geometry: {
        side: "player", spriteCorner: { x: 40, y: 58 },
        animationCenter: { x: 72, y: 90 }, battlePositionCenter: { x: 72, y: 80 },
      } }
    : { species: "KRABBY", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 21 },
        animationCenter: { x: 176, y: 53 }, battlePositionCenter: { x: 176, y: 40 },
      } };
  const target = playerBack
    ? { species: "ONIX", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
      } }
    : { species: "ONIX", geometry: {
        side: "player", spriteCorner: { x: 40, y: 48 },
        animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 },
      } };
  const stage = createSceneOnMovePresentation({
    move: "FLAIL",
    attacker,
    target,
    fieldProfile: playerBack ? {
      playerHp: branch.attacker.hp, playerMaxHp: branch.attacker.maxHp,
      opponentHp: branch.target.hp, opponentMaxHp: branch.target.maxHp,
      playerGender: "male", opponentGender: "male",
    } : {
      playerHp: branch.target.hp, playerMaxHp: branch.target.maxHp,
      opponentHp: branch.attacker.hp, opponentMaxHp: branch.attacker.maxHp,
      playerGender: "male", opponentGender: "male",
    },
    movePower: branch.power,
    targetInitialX2,
    hitsplatCenter: { x: hit.x, y: hit.y },
    visualRandom: { x: hit.x2 + 24, y: hit.y2 + 12 },
  } as never);
  let exact = 0;
  const residuals: string[] = [];
  for (let age = 0; age < branch.sourceWindow.frameCount; age += 1) {
    const frame = branch.sourceWindow.startFrame + age;
    const raw = readFileSync(join(scratch, `${String(frame).padStart(5, "0")}.rgb`));
    const state: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(state);
    let changed = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const rgba = pixel * 4;
      const rgb = pixel * 3;
      if (app[rgba] === raw[rgb]
        && app[rgba + 1] === raw[rgb + 1]
        && app[rgba + 2] === raw[rgb + 2]) continue;
      changed += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (changed === 0) exact += 1;
    else residuals.push(`${age}:${changed}px@${minX},${minY}-${maxX},${maxY}`);
  }
  console.log(`${id}: ${exact}/${branch.sourceWindow.frameCount} framebuffer rows exact${
    residuals.length ? `; ${residuals.slice(0, 20).join(" ")}` : ""}`);
  if (residuals.length) failures.push(`${id}: ${residuals.join(" ")}`);
}

if (failures.length) {
  throw new Error(`MOVE_FLAIL production residuals\n${failures.join("\n")}`);
}
