/**
 * prep20 Will-O-Wisp step 3: run the existing Scene-ON renderer path (willOWispConfigFor ->
 * createSceneOnMovePresentation -> render) with the PROTOTYPE hardware OAM instead of the corpus buffer,
 * and compare to the raw RGB frames.  Also runs the shipped reducer against the alternates' sprite rows.
 * usage: npx vite-node tools/integration/prep20WispPixels.ts <altPlayer.json> <altPlayerRgbDir> <altOpp.json> <altOppRgbDir> [out.json]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { willOWispAtAge } from "../../src/animation/willOWisp.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { willOWispConfigFor, willOWispInputsFor, type WillOWispWindow } from "../compare/verifyWillOWispReducer.ts";
import { assembleWispHardwareOam } from "./prep20WispAssembler.ts";
import { knownFor } from "./prep20WispKnown.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const semantic = (row: Json) => row.sprites.filter((s: Json) => s.template?.symbol === "gWillOWispOrbSpriteTemplate" || s.template?.symbol === "gWillOWispFireSpriteTemplate")
  .map((s: Json) => ({ kind: s.template.symbol.includes("Orb") ? "orb" : "fire", callback: s.callback.symbol, animation: s.animNum,
    x: s.x, y: s.y, x2: s.x2, y2: s.y2, invisible: s.invisible, priority: s.attr[0] >> 10 }));

function run(name: string, window: WillOWispWindow, rows: Json[], rgbAt: (row: Json) => Uint8Array, species?: readonly [string, string]) {
  const known = knownFor(window, rows);
  let exactPixels = 0, residual = 0, reducerDriftRows = 0, rgbHashOk = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const input = willOWispInputsFor(window, rows, age);
    const hw = age === 0 ? rows[0]!.hardwareOam            // row 0 = pre-activation carry-over (host), not assembled
      : assembleWispHardwareOam(age, { geometry: { side: input.attackerSide, attackerCenter: input.attackerCenter, targetCenter: input.targetCenter }, known,
        spriteOrderAt: (a) => rows[Math.max(a, 0)]!.spriteOrder });
    let config = willOWispConfigFor(window, rows, age);
    if (species) config = { ...config, attacker: { ...config.attacker, species: species[0] as never }, target: { ...config.target, species: species[1] as never },
      animationInputs: { ...config.animationInputs, attackerArt: { ...config.animationInputs.attackerArt, displaySpecies: species[0] },
        targetArt: { ...config.animationInputs.targetArt, displaySpecies: species[1] } } };
    const proto = { ...config, animationInputs: { ...config.animationInputs, buffers: { ...config.animationInputs.buffers, hardwareOam: hw } } };
    const raw = rgbAt(rows[age]!);
    if (sha(raw) === rows[age]!.sha256) rgbHashOk += 1;
    const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(proto), age } }), raw);
    residual += d; if (!d) exactPixels += 1; else if (failures.length < 8) failures.push(`${age}:${d}`);
    const reduced = willOWispAtAge(age, input).sprites.map(({ start: _s, end: _e, ordinal: _o, ...s }) => s);
    if (!same(reduced, semantic(rows[age]!))) reducerDriftRows += 1;
  }
  return { name, rows: rows.length, rgbHashOk, exactPixelRows: exactPixels, residualPixels: residual, failures, shippedReducerVsRomDriftRows: reducerDriftRows };
}
const [altP, altPRgb, altO, altORgb, out] = process.argv.slice(2);
const tarRgb = (stem: string) => { const dir = createScratchDir(`prep20-wisp-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/will-o-wisp-${stem}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results = [
  run("accepted-player", "player-back", load(resolve(root, "tools/compare/evidence/will-o-wisp-player-dense-state.json.gz")), tarRgb("player")),
  run("accepted-opponent", "opponent-front", load(resolve(root, "tools/compare/evidence/will-o-wisp-opponent-dense-state.json.gz")), tarRgb("opponent")),
];
if (altP && altPRgb) results.push(run("alt-banette-player", "player-back", load(altP), dirRgb(altPRgb), ["BANETTE", "GOLEM"]));
if (altO && altORgb) results.push(run("alt-banette-opponent", "opponent-front", load(altO), dirRgb(altORgb), ["BANETTE", "GOLEM"]));
console.log(JSON.stringify(results, null, 1));
if (out) writeFileSync(out, `${JSON.stringify(results, null, 1)}\n`);
