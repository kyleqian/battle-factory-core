import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInitialState, render, type EngineState } from "../../../src/engine/core.ts";
import {
  createSceneOnMovePresentation,
  type SceneOnPresentationBattler,
} from "../../../src/animation/sceneOnPresentation.ts";

interface Fixture {
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}

const fixturePath = resolve(process.argv[2]!);
const oracleRgbPath = resolve(process.argv[3]!);
const age = Number(process.argv[4] ?? 98);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
const oracle = readFileSync(oracleRgbPath);

function differingPixels(rgba: Uint8ClampedArray): number {
  let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      oracle[pixel * 3] !== rgba[pixel * 4]
      || oracle[pixel * 3 + 1] !== rgba[pixel * 4 + 1]
      || oracle[pixel * 3 + 2] !== rgba[pixel * 4 + 2]
    ) {
      count += 1;
    }
  }
  return count;
}

for (let dy = -4; dy <= 4; dy += 1) {
  const scores: string[] = [];
  for (let dx = -4; dx <= 4; dx += 1) {
    const stage = createSceneOnMovePresentation({
      move: "DRAGON_RAGE",
      attacker: fixture.attacker,
      target: {
        ...fixture.target,
        geometry: {
          ...fixture.target.geometry,
          spriteCorner: {
            x: fixture.target.geometry.spriteCorner.x + dx,
            y: fixture.target.geometry.spriteCorner.y + dy,
          },
        },
      },
      fieldProfile: fixture.fieldProfile,
    });
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    scores.push(`${dx}:${differingPixels(render(engine))}`);
  }
  console.log(`dy=${dy} ${scores.join(" ")}`);
}
