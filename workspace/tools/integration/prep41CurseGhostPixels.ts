/**
 * prep41: tools/integration/prep23CurseGhostPixels.ts with the D4 P1 policy: the row-26 palette scanout transfer is pinned to ONE global
 * scanline (--scanline=S, the dominant measured firstPostTransferScanline; vcount S, no HBlank) for every window instead of the accepted
 * per-side fixture values; records every residual row (age, px). Model-level: the prep23 ghost model + its corpus-read known-entry block
 * and lent order fed to the unchanged production renderer (no production ghost provider exists).
 * usage: npx vite-node tools/integration/prep41CurseGhostPixels.ts --scanline=S <name>:<corpus.json[.gz]>:<rgbDir|tar=path>:<player|opponent>:<ATTACKER>,<TARGET> ... [--out=receipt.json]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { curseConfigFor } from "../compare/curseProduction.ts";
import timingFixture from "../compare/fixtures/curse-palette-transfer-timing.json" with { type: "json" };
import { curseGhostRow } from "./prep23CurseGhost.ts";
import { ghostKnownFor } from "./prep23CurseGhostKnown.ts";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const lines: Record<number, number> = {};
const diff = (app: Uint8Array, raw: Uint8Array) => { let n = 0; for (const k in lines) delete lines[k]; for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) { n += 1; lines[Math.floor(p / 240)] = (lines[Math.floor(p / 240)] ?? 0) + 1; } return n; };
const args = process.argv.slice(2), out = args.find((a) => a.startsWith("--out="))?.slice(6);
const scanline = Number(args.find((a) => a.startsWith("--scanline="))?.slice(11) ?? NaN);
if (!Number.isInteger(scanline)) throw new Error("--scanline=S required");
const results: Json[] = [];
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) {
  const [name, file, rgbSpec, side, sp] = spec.split(":") as [string, string, string, "player" | "opponent", string];
  const rows = load(file); let dir = rgbSpec;
  // curseInputsFor pins the accepted corpus' trace frame at the first Step2 row; the alternates carry their own frames, so the fixture frame is substituted for the config build only (RGB / hash use the real frame)
  const timing = (timingFixture.orientations as Json)[side === "player" ? "player-back" : "opponent-front"];
  const step2 = rows.findIndex((r, i) => i > 0 && r.tasks.some((t: Json) => t.func?.symbol === "AnimTask_CurseStretchingBlackBg_Step2") && rows[i - 1]!.tasks.some((t: Json) => t.func?.symbol === "AnimTask_CurseStretchingBlackBg_Step1"));
  const cfgRows = rows.map((r, i) => i === step2 ? { ...r, frame: timing.firstStep2TraceFrame } : r);
  if (rgbSpec.startsWith("tar=")) { dir = createScratchDir(`prep23-${name}-`); execFileSync("tar", ["-xzf", resolve(root, rgbSpec.slice(4)), "-C", dir]); }
  const window = `ghost-${side}` as const, k = ghostKnownFor(rows, side), [att, tgt] = sp.split(",");
  let exact = 0, residual = 0; const failures: [number, number][] = [], transferAges: number[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    let config: Json = curseConfigFor(window, cfgRows, age) as never;
    config = { ...config, attacker: { ...config.attacker, species: att }, target: { ...config.target, species: tgt },
      animationInputs: { ...config.animationInputs, attackerArt: { ...config.animationInputs.attackerArt, displaySpecies: att },
        defenderArt: { ...config.animationInputs.defenderArt, displaySpecies: tgt }, animationTargetArt: { ...config.animationInputs.animationTargetArt, displaySpecies: tgt } } };
    const m = curseGhostRow(age, k), prev = curseGhostRow(Math.max(0, age - 1), k), ai = config.animationInputs;
    const inputs = process.env.CORPUS ? ai : { ...ai,
      buffers: { ...ai.buffers, hardwareOam: m.hardwareOam ?? rows[age]!.hardwareOam },
      registers: m.registers, battleBg: m.battleBg, palette: { unfaded: m.hardwarePalette, faded: m.hardwarePalette, hardware: m.hardwarePalette },
      paletteScanoutTransfer: ai.paletteScanoutTransfer ? { ...ai.paletteScanoutTransfer, beforeHardware: prev.hardwarePalette,
        vcount: scanline, inHBlank: false, firstPostTransferScanline: scanline } : null, liveTasks: m.tasks };
    if (ai.paletteScanoutTransfer) transferAges.push(age);
    const raw = readFileSync(resolve(dir, `${String(rows[age]!.frame).padStart(5, "0")}.rgb`)); if (sha(raw) !== rows[age]!.sha256) throw new Error("rgb drift");
    const d = diff(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation({ ...config, animationInputs: inputs } as never), age } as never }), raw);
    residual += d; if (!d) exact += 1; else failures.push([age, d, Object.entries(lines).map(([y, c]) => `${y}:${c}`).join(" ")] as never);
  }
  const r = { name, side, species: sp, scanline, transferAges, rows: rows.length, pixelRowsExact: exact, residualPixels: residual, residualRows: failures };
  console.log(JSON.stringify(r)); results.push(r);
}
if (out) writeFileSync(out, `${JSON.stringify(results, null, 1)}\n`);
