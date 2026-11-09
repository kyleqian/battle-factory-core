/** Strict production-framebuffer verifier for retained bilateral Teeter Dance evidence. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnPresentationBattler,
  type SceneOnTeeterDanceConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { auditTeeterDanceReducer } from "./teeterDanceReducerAudit.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/teeter-dance-evidence.json",
  "utf8",
));

export type TeeterDanceOrientation = "player-back" | "opponent-front";

type DenseBattlerSprite = Readonly<{
  x: number;
  y: number;
  x2: number;
  y2: number;
}>;

type DenseRow = Readonly<{
  frame: number;
  sha256: string;
  battleMons: readonly Readonly<{
    species: number;
    hp: number;
    maxHp: number;
    personality: number;
  }>[];
  battlerSprites: readonly DenseBattlerSprite[];
}>;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function findRgb(root: string, filename: string): string {
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      try {
        return findRgb(path, filename);
      } catch {
        continue;
      }
    }
    if (entry === filename) return path;
  }
  throw new Error(`missing ${filename} below ${root}`);
}

function battler(
  species: "SPINDA" | "ONIX",
  side: "player" | "opponent",
  sprite: DenseBattlerSprite,
  animationCenter: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      // The typed corner is the un-offset 64x64 battler origin. Front-idle
      // x2 is supplied later by the ordinary draw case.
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter,
      battlePositionCenter: side === "player"
        ? { x: 72, y: 80 }
        : { x: 176, y: 40 },
    },
  };
}

export function teeterDanceConfigFor(
  orientation: TeeterDanceOrientation,
  rows: readonly DenseRow[],
): SceneOnTeeterDanceConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const attackerSprite = first.battlerSprites[playerAttacker ? 0 : 1]!;
  const targetSprite = first.battlerSprites[playerAttacker ? 1 : 0]!;
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const attackerCenter = playerAttacker
    ? { x: 72, y: 84 }
    : { x: 176, y: 48 };
  const noteCenter = playerAttacker
    ? { x: 72, y: 92 }
    : { x: 176, y: 48 };
  const playerMon = first.battleMons[0]!;
  const opponentMon = first.battleMons[1]!;
  return {
    move: "TEETER_DANCE",
    attacker: battler("SPINDA", attackerSide, attackerSprite, noteCenter),
    target: battler(
      "ONIX",
      targetSide,
      targetSprite,
      targetSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 42 },
    ),
    attackerSpriteCenter: attackerCenter,
    attackerPersonality: playerAttacker
      ? playerMon.personality
      : opponentMon.personality,
    fieldProfile: {
      playerHp: playerMon.hp,
      playerMaxHp: playerMon.maxHp,
      opponentHp: opponentMon.hp,
      opponentMaxHp: opponentMon.maxHp,
      playerGender: playerAttacker ? "female" : "male",
      opponentGender: playerAttacker ? "male" : "female",
    },
  };
}

export function compareTeeterDanceRows(
  orientation: TeeterDanceOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(teeterDanceConfigFor(orientation, rows));
  const failures: string[] = [];
  let matched = 0;
  let residualPixels = 0;
  for (const [age, row] of rows.entries()) {
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(
      rgbRoot,
      `${String(row.frame).padStart(5, "0")}.rgb`,
    ));
    let residual = 0;
    let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

function verifyRawEvidence(
  orientation: TeeterDanceOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
  expectedSequenceSha256: string,
  changeMapPath: string,
): void {
  const rgb = rows.map((row) => readFileSync(findRgb(
    rgbRoot,
    `${String(row.frame).padStart(5, "0")}.rgb`,
  )));
  for (const [age, bytes] of rgb.entries()) {
    if (sha256(bytes) !== rows[age]!.sha256) {
      throw new Error(`${orientation} age ${age}: raw RGB row hash`);
    }
  }
  if (sha256(Buffer.concat(rgb)) !== expectedSequenceSha256) {
    throw new Error(`${orientation}: raw RGB sequence hash`);
  }
  const rgbDir = dirname(findRgb(
    rgbRoot,
    `${String(rows[0]!.frame).padStart(5, "0")}.rgb`,
  ));
  const map = spawnSync("python3", ["tools/compare/frame-changemap.py", rgbDir], {
    encoding: "utf8",
  });
  if (map.status !== 0) throw new Error(`${orientation}: change-map generation failed`);
  const normalized = map.stdout.split("\n");
  normalized[0] = `# teeter-dance-${orientation === "player-back" ? "player" : "opponent"} raw RGB888 — 169 frames, 240x160`;
  if (normalized.join("\n") !== readFileSync(changeMapPath, "utf8")) {
    throw new Error(`${orientation}: retained normalized change map drifted`);
  }
}

export function verifyTeeterDanceFramebuffer(): readonly Readonly<{
  orientation: TeeterDanceOrientation;
  componentRows: 169;
  seamRows: 169;
  rawRgbRows: 169;
  framebufferRows: 169;
  residualPixels: 0;
}>[] {
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const rows = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString()).frames;
    const audit = auditTeeterDanceReducer(orientation);
    if (audit.rows !== 169 || audit.noteSprites !== 235
      || audit.oamLatches !== 235 || audit.matrixLatches !== 235
      || audit.paletteLatches !== 168) {
      throw new Error(`${orientation}: retained reducer/latch audit regressed`);
    }
    const scratch = createScratchDir(`pokebench-teeter-dance-${orientation}-`);
    const unpack = spawnSync("tar", ["-xzf", receipt.rawRgb, "-C", scratch]);
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    verifyRawEvidence(
      orientation,
      rows,
      scratch,
      receipt.rawRgbSequenceSha256,
      receipt.changeMap,
    );
    const compared = compareTeeterDanceRows(orientation, rows, scratch);
    if (compared.failures.length) {
      throw new Error(
        `${orientation}: ${compared.matched}/${rows.length}, residual ${compared.residualPixels}; `
        + compared.failures.join(","),
      );
    }
    total += compared.matched;
    results.push({
      orientation,
      componentRows: 169 as const,
      seamRows: 169 as const,
      rawRgbRows: 169 as const,
      framebufferRows: compared.matched as 169,
      residualPixels: compared.residualPixels as 0,
    });
  }
  if (total !== 338) throw new Error(`incomplete bilateral proof ${total}/338`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifyTeeterDanceFramebuffer()) {
    console.log(`${result.orientation}: component=169/169 seam=169/169 rawRGB=169/169 framebuffer=169/169 residual=0`);
  }
  console.log("MOVE_TEETER_DANCE: 338/338 exact with zero residual pixels");
}
