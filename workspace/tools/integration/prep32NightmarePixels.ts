/**
 * prep32 Nightmare pixel check: the UNCHANGED renderer (`render` -> battleScene NIGHTMARE branch) fed with the prototype's per-age inputs
 * (`prep32NightmareLib.ts liveInputs`) vs the window's raw ROM RGB, at three phases: the window's measured T bits, the lag bit flipped,
 * and the production policy phase (`liveMoveTimingPolicy.ts` 171: lag at 149; restore row 149 as the reducer's tasks).
 *   npx vite-node tools/integration/prep32NightmarePixels.ts [<dense.json[.gz]>:<rgb dir|tar.gz>:player|opponent:ATTACKER,TARGET ...] [--neg=palette|shake] [--out=<file>]
 * Without window args: the accepted corpora + their retained raw RGB tarballs.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createSceneOnMovePresentation, type SceneOnNightmareConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { knownFor, LEND, liveInputs, loadRows, measuredPhase, negKnown, NEG } from "./prep32NightmareLib.ts";
import { nmOrders, programAge, type NmKnown, type NmPhase, type Side } from "./prep32NightmareModel.ts";

type Json = Record<string, any>;
const ACCEPTED = [
  "tools/compare/evidence/nightmare-player-dense-state.json.gz:tools/compare/evidence/nightmare-player-raw-rgb.tar.gz:player:HAUNTER,SHUCKLE",
  "tools/compare/evidence/nightmare-opponent-dense-state.json.gz:tools/compare/evidence/nightmare-opponent-raw-rgb.tar.gz:opponent:HAUNTER,KANGASKHAN",
];
function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < 240 * 160; i += 1) if (app[i * 4] !== oracle[i * 3] || app[i * 4 + 1] !== oracle[i * 3 + 1] || app[i * 4 + 2] !== oracle[i * 3 + 2]) n += 1;
  return n;
}
function configFor(row: number, rows: Json[], side: Side, species: [string, string], p: NmPhase, k: NmKnown, orders: number[][]): { config: SceneOnNightmareConfig; age: number } {
  const input = liveInputs(row, rows, k, p, orders);
  const { attackerSide, targetSide, attackerSpecies: _a, targetSpecies: _t, attackerPictureOrigin: ao, targetPictureOrigin: to, ...animationInputs } = input;
  const r0 = rows[0]!, pl = r0.parties.player[0], op = r0.parties.opponent[0];
  const config = {
    move: "NIGHTMARE",
    attacker: { species: species[0] as never, geometry: { side: attackerSide, spriteCorner: { x: k.attacker0.x - 32, y: k.attacker0.y - 32 }, animationCenter: ao,
      battlePositionCenter: { x: ao.x, y: attackerSide === "opponent" ? 40 : ao.y } } },
    target: { species: species[1] as never, geometry: { side: targetSide, spriteCorner: { x: k.target0.x - 32, y: k.target0.y - 32 }, animationCenter: to, battlePositionCenter: to } },
    fieldProfile: { playerHp: pl.hp, playerMaxHp: pl.maxHp, opponentHp: op.hp, opponentMaxHp: op.maxHp, playerGender: pl.gender, opponentGender: op.gender,
      playerStatus: side === "opponent" ? "sleep" : "none", opponentStatus: side === "player" ? "sleep" : "none" },
    animationInputs,
  } as unknown as SceneOnNightmareConfig;
  return { config, age: programAge(row, p) };
}
function pixelsFor(spec: string): Json {
  const [dense, rgb, side, names] = spec.split(":") as [string, string, Side, string];
  const rows = loadRows(dense), species = names.split(",") as [string, string];
  let dir = rgb;
  if (rgb.endsWith(".tar.gz")) { dir = createScratchDir("prep32-nightmare-rgb-"); execFileSync("tar", ["-xzf", rgb, "-C", dir]); }
  const measured = measuredPhase(rows);
  const phases: Record<string, NmPhase> = { measured, flipped: { ...measured, lag149: !measured.lag149 }, policy: { lag149: true, restoreRow: 149 } };
  const out: Json = { window: dense.split("/").pop()!.replace(/(-r1)?\.json(\.gz)?$/, ""), side, species, rows: rows.length, measuredPhase: measured, phases: {} };
  for (const [name, p] of Object.entries(phases)) {
    let exact = 0, px = 0; const bad: string[] = [];
    const k = negKnown(knownFor(rows, side, LEND)), orders = nmOrders(rows.length, k, p);
    for (let r = 0; r < rows.length; r += 1) {
      const { config, age } = configFor(r, rows, side, species, p, k, orders);
      const fb = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } } as never);
      const raw = readFileSync(`${dir}/${String(rows[r]!.frame).padStart(5, "0")}.rgb`), d = frameDiff(fb as Uint8Array, raw);
      if (d === 0) exact += 1; else { px += d; if (bad.length < 24) bad.push(`${r}:${d}`); }
    }
    out.phases[name] = { exact, rows: rows.length, px, bad };
  }
  return out;
}
const args = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const windows = (args.length ? args : ACCEPTED).map(pixelsFor);
const outPath = process.argv.find((x) => x.startsWith("--out="))?.slice(6);
if (outPath) writeFileSync(outPath, `${JSON.stringify({ schema: "prep32-nightmare-pixels/v1", neg: NEG || null, lend: LEND, windows }, null, 1)}\n`);
for (const w of windows) console.log(w.window, JSON.stringify(w.measuredPhase), Object.entries(w.phases).map(([n, v]: any) => `${n} ${v.exact}/${v.rows} ${v.px}px ${v.bad.slice(0, 6).join(",")}`).join(" | "));
