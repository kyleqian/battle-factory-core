/** Strict actual-core framebuffer verifier for the complete retained Swift body. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnSwiftView,
  type SceneOnPresentationBattler,
  type SceneOnSwiftConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { readSwiftRows, swiftProfileFor, type SwiftEvidenceOrientation } from "./swiftReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/swift-evidence.json"), "utf8")) as Json;
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) { try { return findRgb(child, filename); } catch { continue; } }
    if (entry === filename) return child;
  }
  throw new Error(`missing Swift RGB ${filename}`);
}

function battler(species: SceneOnPresentationBattler["species"], side: "player" | "opponent", sprite: Json): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

export function swiftConfigFor(orientation: SwiftEvidenceOrientation, rows = readSwiftRows(orientation)): SceneOnSwiftConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const playerMon = first.parties.player[first.battlers.player.partyIndex];
  const opponentMon = first.parties.opponent[first.battlers.opponent.partyIndex];
  return {
    move: "SWIFT",
    attacker: battler("STARYU", playerAttacker ? "player" : "opponent", first.battlerSprites.attacker),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", first.battlerSprites.target),
    fieldProfile: {
      playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: playerMon.gender === "genderless" ? undefined : playerMon.gender,
      opponentGender: opponentMon.gender === "genderless" ? undefined : opponentMon.gender,
    },
    animationProfile: swiftProfileFor(orientation, rows),
  };
}

export function compareSwiftRows(orientation: SwiftEvidenceOrientation, rows: readonly Json[], rgbRoot: string) {
  const stage = createSceneOnMovePresentation(swiftConfigFor(orientation, [...rows]));
  let matched = 0; let residualPixels = 0; const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnSwiftView({ ...stage, age });
    if (seam.source.offset !== row.scriptOffset) throw new Error(`${orientation} age ${age}: seam`);
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw hash`);
    let residual = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3] || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) residual += 1;
    }
    residualPixels += residual;
    if (residual === 0) matched += 1; else failures.push(`${age}:${residual}`);
  }
  return { matched, residualPixels, failures };
}

export function inspectSwiftFramebuffer() {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const item = fixture.orientations[orientation];
    const archive = resolve(root, item.rawRgbArchive);
    if (sha(readFileSync(archive)) !== item.rawRgbArchiveSha256) throw new Error(`${orientation}: archive hash`);
    const scratch = createScratchDir(`pokebench-swift-${orientation}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    const rows = readSwiftRows(orientation);
    return { orientation, rows: rows.length, ...compareSwiftRows(orientation, rows, scratch) };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of inspectSwiftFramebuffer()) console.log(JSON.stringify(result));
}
