/** Retained-RGB actual-core gate for all eight MOVE_FURY_CUTTER bodies. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { furyCutterConfigFor, furyCutterRowsFor, verifyFuryCutterProduction,
  type FuryCutterWindow } from "./furyCutterProduction.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) { const child = join(path, entry);
    if (statSync(child).isDirectory()) { try { return findRgb(child, filename); } catch { continue; } }
    if (entry === filename) return child; }
  throw new Error(`missing Fury Cutter RGB ${filename}`);
}
function residual(app: Uint8Array, raw: Uint8Array): number { let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (app[pixel * 4] !== raw[pixel * 3]
    || app[pixel * 4 + 1] !== raw[pixel * 3 + 1] || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) count += 1;
  return count; }
function compare(window: FuryCutterWindow): Json {
  const rows = furyCutterRowsFor(window); const side = window.startsWith("player") ? "player" : "opponent";
  const scratch = createScratchDir(`pokebench-fury-cutter-${side}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/fury-cutter-${side}-raw-rgb.tar.gz`), "-C", scratch]);
  let framebufferMatched = 0; let residualPixels = 0; const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const raw = readFileSync(findRgb(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${window}/${age}: RGB drift`);
    const stage = createSceneOnMovePresentation(furyCutterConfigFor(window, rows, age));
    const app = render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age } });
    const difference = residual(app, raw); residualPixels += difference;
    if (!difference) framebufferMatched += 1; else failures.push(`${age}:${difference}`);
  }
  return { window, rows: 43, framebufferMatched, residualPixels, failures };
}
export function furyCutterActualCoreVerdict(): Json {
  verifyFuryCutterProduction();
  const windows = (["player-back", "opponent-front"] as const).flatMap((orientation) =>
    ([1, 2, 3, 4] as const).map((counter) => compare(`${orientation}-${counter}`)));
  return { schema: "fury-cutter-actual-core-verdict/v1", move: "MOVE_FURY_CUTTER", rows: 344,
    framebufferMatched: windows.reduce((sum, item) => sum + item.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, item) => sum + item.residualPixels, 0), windows };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = furyCutterActualCoreVerdict(); console.log(JSON.stringify(result));
  if (process.argv.includes("--require-exact") && result.residualPixels) process.exitCode = 1;
}
