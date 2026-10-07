/**
 * prep31 Spit Up pixels: the EXISTING Scene-ON renderer (battleScene.ts SPIT_UP branch, no src change) fed with the prep31 source-derived hardware OAM + matrices,
 * palettes (loadspritegfx rows 1 / 4) and resource windows, vs raw mGBA RGB.  Row 0 uses the corpus buffers (pre-activation).
 * usage: npx vite-node tools/integration/prep31SpitUpPixels.ts [alt.json:rgbDir:player|opponent:counter:ATT,TGT ...] [--out=out.json] [--neg=oam|palette]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { spitUpConfigFor, type SpitUpWindow } from "../compare/spitUpProduction.ts";
import { assembleSpitUpHardwareOam } from "./prep31SpitUpModel.ts";
process.env.PREP31_LIB = "1";
const { knownFor, loadDoc, PAL, orderForWindow } = await import("./prep31SpitUpCheck.ts");
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
function run(name: string, side: "player" | "opponent", counter: 1 | 2 | 3, doc: Json, rgb: (row: Json) => Uint8Array, names?: [string, string]) {
  const rows: Json[] = doc.frames, { k } = knownFor(doc, side, counter), order = orderForWindow(doc, side, counter);
  const window = `${side === "player" ? "player-back" : "opponent-front"}-${counter}` as SpitUpWindow;
  const orbBank = 16 + k.orb.bank, impBank = 16 + k.impact.bank;
  const unf = [...rows[0]!.unfadedPalette], fad = [...rows[0]!.fadedPalette]; let hw = [...rows[0]!.hardwarePalette];
  let exact = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    if (age === 1) for (let c = 0; c < 16; c += 1) unf[orbBank * 16 + c] = fad[orbBank * 16 + c] = neg === "palette" ? (PAL.orb[c] ?? 0) ^ 0x0421 : PAL.orb[c] ?? 0;
    if (age === 4) for (let c = 0; c < 16; c += 1) unf[impBank * 16 + c] = fad[impBank * 16 + c] = neg === "palette" ? PAL.impact[c]! ^ 0x0421 : PAL.impact[c]!;
    const oam = age === 0 ? { oam: rows[0]!.hardwareOam as string[], matrices: rows[0]!.hardwareMatrices } : assembleSpitUpHardwareOam(age, k, (s) => order[Math.max(s, 0)]!);
    const base = spitUpConfigFor(window, rows, age), ai = base.animationInputs, bp = rows[age]!.battlers;
    const fieldProfile = { ...base.fieldProfile, playerHp: bp.player.hp, playerMaxHp: bp.player.maxHp, opponentHp: bp.opponent.hp, opponentMaxHp: bp.opponent.maxHp };
    const [att, tgt] = names ?? [ai.attackerArt.displaySpecies, ai.targetArt.displaySpecies];
    const config = { ...base, fieldProfile, attacker: { ...base.attacker, species: att as never }, target: { ...base.target, species: tgt as never },
      animationInputs: { ...ai, attackerArt: { ...ai.attackerArt, displaySpecies: att, attr: k.attackerAttr }, targetArt: { ...ai.targetArt, displaySpecies: tgt, attr: k.targetAttr },
        buffers: { ...ai.buffers, hardwareOam: neg === "oam" && age > 0 ? rows[1]!.hardwareOam : oam.oam, hardwareMatrices: oam.matrices },
        palette: { unfaded: [...unf], faded: [...fad], hardware: age === 0 ? rows[0]!.hardwarePalette : hw },
        resources: { ...ai.resources, redOrbTileBase: k.orb.tile, impactTileBase: k.impact.tile, redOrbLoaded: age >= 1, impactLoaded: age >= 4 } } };
    const raw = rgb(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error(`${name}/${age}: rgb drift`);
    const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config as never), age } as never }), raw);
    residual += d; if (!d) exact += 1; else if (failures.length < 12) failures.push(`${age}:${d}`);
    hw = [...fad];   // hardware = faded one row later
  }
  return { name, counter, rows: rows.length, pixelRowsExact: exact, residualPixels: residual, pixelFailures: failures };
}
const tarRgb = (stem: string) => { const dir = createScratchDir(`prep31-spit-up-${stem}-`); execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/spit-up-${stem}-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results: Json[] = [];
for (const c of [1, 2, 3] as const) for (const side of ["player", "opponent"] as const)
  results.push(run(`accepted-${side}-${c}`, side, c, loadDoc(resolve(root, `tools/compare/evidence/spit-up-${side}-${c}-dense.json.gz`)), tarRgb(`${side}-${c}`)));
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side, c, names] = spec.split(":"); const [a, t] = names!.split(",");
  results.push(run(`alt-${file!.split("/").pop()!.replace(/-r1\.json$/, "")}`, side as "player" | "opponent", Number(c) as 1 | 2 | 3, loadDoc(file!), dirRgb(dir!), [a!, t!])); }
for (const r of results) console.log(r.name, `rows ${r.pixelRowsExact}/${r.rows} px ${r.residualPixels}`, r.pixelFailures.join(" "));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
