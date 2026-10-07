/**
 * prep32 Flatter pixel check through the UNCHANGED renderer: the accepted verifier's live inputs (`tools/compare/verifyFlatterReducer.ts`,
 * corpus hardware OAM / matrices: the OAM provider is not part of this prototype) with the prototype's registers + palettes substituted
 * (`prep32FlatterModel.ts`) on every row, and the confetti birth split (T) replaced by each measured alternative (15/14/9, 14/14/10,
 * 14/15/9) on the burst rows: framebuffer residual vs the window's raw ROM RGB per row.
 *   npx vite-node tools/integration/prep32FlatterPixels.ts [<dense.json[.gz]>:<rgb dir|tar.gz>:player|opponent:ATTACKER,TARGET ...] [--neg=registers|palette] [--out=<file>]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import flatterAsset from "../../src/animation/assets/flatter.json" with { type: "json" };
import { createSceneOnMovePresentation, type SceneOnFlatterConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { flatterConfigFor, flatterInputsFor } from "../compare/verifyFlatterReducer.ts";
import { flatterPalettes, flatterRegisters } from "./prep32FlatterModel.ts";

type Json = Record<string, any>;
const NEG = process.argv.find((a) => a.startsWith("--neg="))?.slice(6) ?? "";
const words = (rgb: Json[]): number[] => rgb.map((c) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10);
const SPOTLIGHT = words((flatterAsset as Json).spotlight.palette), CONFETTI = words((flatterAsset as Json).confetti.palette);
const ACCEPTED = [
  "tools/compare/evidence/flatter-player-dense-state.json.gz:tools/compare/evidence/flatter-player-raw-rgb.tar.gz:player:NIDORINA,ONIX",
  "tools/compare/evidence/flatter-opponent-dense-state.json.gz:tools/compare/evidence/flatter-opponent-raw-rgb.tar.gz:opponent:NIDORINA,ONIX",
];
const SPLITS: Record<string, readonly [number, number, number]> = { "15/14/9": [15, 14, 9], "14/14/10": [14, 14, 10], "14/15/9": [14, 15, 9] };
function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < 240 * 160; i += 1) if (app[i * 4] !== oracle[i * 3] || app[i * 4 + 1] !== oracle[i * 3 + 1] || app[i * 4 + 2] !== oracle[i * 3 + 2]) n += 1;
  return n;
}
function pixelsFor(spec: string): Json {
  const [dense, rgb, side, names] = spec.split(":") as [string, string, "player" | "opponent", string];
  const rows: Json[] = (JSON.parse((dense.endsWith(".gz") ? gunzipSync(readFileSync(dense)) : readFileSync(dense)).toString("utf8")) as Json).frames;
  const [attacker, target] = names.split(",");
  let dir = rgb;
  if (rgb.endsWith(".tar.gz")) { dir = createScratchDir("prep32-flatter-rgb-"); execFileSync("tar", ["-xzf", rgb, "-C", dir]); }
  const orientation = side === "player" ? "player-back" : "opponent-front";
  const r0 = rows[0]!, pl = r0.parties.player[0], op = r0.parties.opponent[0];
  const free = (r0.resourceAllocators.paletteTags as number[]).map((t, i) => [t, i] as const).filter(([t, i]) => t === 0xffff && i >= r0.resourceAllocators.reservedPaletteCount).map(([, i]) => i);
  const loads = [{ row: 1, bank: free[0]!, words: SPOTLIGHT }, { row: 4, bank: free[1]!, words: NEG === "palette" ? CONFETTI.map((w, i) => (i === 1 ? w ^ 0x0421 : w)) : CONFETTI }];
  const regsAt = (age: number) => { const reg = flatterRegisters(age, r0.registers); if (NEG === "registers" && reg.bldy! > 0) reg.bldy! += 1; return reg; };
  const configAt = (age: number, split?: readonly [number, number, number]): SceneOnFlatterConfig => {
    const input = flatterInputsFor(orientation as never, age, rows) as Json;
    const pal = flatterPalettes(age, { unfaded: r0.unfadedPalette, faded: r0.fadedPalette, hardware: r0.hardwarePalette }, loads);
    let confetti = input.confetti as Json[];
    if (split) {   // T alternative: births per burst row in source order (allocation order = source order)
      confetti = confetti.map((c, i) => ({ ...c, start: Math.min(c.start, i < split[0] ? 65 : i < split[0] + split[1] ? 66 : 67) }));
    }
    const live = { ...input, palette: pal, registers: regsAt(age), confetti, attackerSpecies: attacker, targetSpecies: target };
    const config = flatterConfigFor(orientation as never, age, live as never) as SceneOnFlatterConfig;
    return { ...config, fieldProfile: { playerHp: pl.hp, playerMaxHp: pl.maxHp, playerGender: pl.gender, opponentHp: op.hp, opponentMaxHp: op.maxHp, opponentGender: op.gender } } as SceneOnFlatterConfig;
  };
  const frame = (r: number) => readFileSync(`${dir}/${String(rows[r]!.frame).padStart(5, "0")}.rgb`);
  const draw = (config: SceneOnFlatterConfig, age: number) => render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } } as never) as Uint8Array;
  const out: Json = { window: dense.split("/").pop()!.replace(/(-r1)?\.json(\.gz)?$/, ""), side, rows: rows.length, model: {}, splits: {} };
  let exact = 0, px = 0; const bad: string[] = [];
  for (let r = 0; r < rows.length; r += 1) { const d = frameDiff(draw(configAt(r), r), frame(r)); if (d === 0) exact += 1; else { px += d; if (bad.length < 20) bad.push(`${r}:${d}`); } }
  out.model = { exact, rows: rows.length, px, bad };
  for (const [name, split] of Object.entries(SPLITS)) {
    let e = 0, p = 0; const b: string[] = []; let error: string | null = null;
    for (let r = 63; r <= 70; r += 1) {
      try { const d = frameDiff(draw(configAt(r, split), r), frame(r)); if (d === 0) e += 1; else { p += d; b.push(`${r}:${d}`); } } catch (err) { error = String((err as Error).message).slice(0, 120); break; }
    }
    out.splits[name] = { rows: "63..70", exact: e, px: p, bad: b, error };
  }
  return out;
}
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const windows = (args.length ? args : ACCEPTED).map(pixelsFor);
const outPath = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
if (outPath) writeFileSync(outPath, `${JSON.stringify({ schema: "prep32-flatter-pixels/v1", neg: NEG || null, windows }, null, 1)}\n`);
for (const w of windows) console.log(w.window, `model ${w.model.exact}/${w.model.rows} ${w.model.px}px ${w.model.bad.slice(0, 6).join(",")}`, Object.entries(w.splits).map(([n, s]: any) => `${n}: ${s.exact}/8 ${s.px}px${s.error ? " ERR " + s.error : ""}`).join(" | "));
