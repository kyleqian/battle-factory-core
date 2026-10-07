/**
 * prep26 Ice Ball pixels: the EXISTING Scene-ON renderer (battleScene.ts ICE_BALL branch, no src change) fed with the prep26 source-derived
 * hardware OAM + matrices, registers, palettes, tasks, allocation (chunk / shard slots) and picture anchors, vs raw mGBA RGB.  Row 0 (pre-activation)
 * uses the corpus buffers (as prep20 / prep24).  The sprite-order, audio, liveCounts and gameplay snapshot inputs stay corpus (not pixel-relevant).
 * usage: npx vite-node tools/integration/prep26IceBallPixels.ts [alt.json:rgbDir:player|opponent:ATT,TGT ...] [--out=out.json] [--neg=oam|palette|registers|words]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { iceBallConfigFor, type IceBallWindow } from "../compare/iceBallProduction.ts";
import { assembleIceBallHardwareOam, chunkSlot, shardSlots } from "./prep26IceBallAssembler.ts";
import { iceBallModel } from "./prep26IceBallModel.ts";
process.env.PREP26_LIB = "1";
const { knownFor, loadBodies } = await import("./prep26IceBallCheck.ts");
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const SPECIES: Record<number, string> = { 347: "GLALIE", 76: "GOLEM", 403: "REGISTEEL", 345: "SPHEAL" };   // per-body battler species (the target changes when the first opponent faints)
function run(name: string, side: "player" | "opponent", counter: number, rows: Json[], rgb: (row: Json) => Uint8Array, _names: [string, string]) {
  const other = side === "player" ? "opponent" : "player", names: [string, string] = [SPECIES[rows[0]!.battlers[side].species] ?? _names[0], SPECIES[rows[0]!.battlers[other].species] ?? _names[1]];
  const { oam: known, model: mk } = knownFor(rows, side, counter);
  const model = iceBallModel(neg === "palette" ? { ...mk, chunkPalette: mk.chunkPalette.map((c) => c ^ 0x0421), icePalette: mk.icePalette.map((c) => c ^ 0x0421) } : mk);
  const window = `${side === "player" ? "player-back" : "opponent-front"}-${counter + 1}` as IceBallWindow;
  let exact = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const oam = age === 0 ? { oam: rows[0]!.hardwareOam as string[], matrices: rows[0]!.hardwareMatrices }
      : assembleIceBallHardwareOam(age, { known, spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder });
    const m = model[age]!, base = iceBallConfigFor(window, rows, age), ai = base.animationInputs;
    const art = (a: Json, species: string, attr: readonly [number, number, number]) => ({ ...a, displaySpecies: species, attr });
    const geometry = (g: Json, pic: { x: number; y: number }) => ({ ...g, animationCenter: pic, battlePositionCenter: pic });
    const bp = rows[age]!.battlers, pp = rows[age]!.parties;   // healthbox profile = the ACTIVE battlers (party index), not party[0]
    const fieldProfile = { ...base.fieldProfile, playerHp: bp.player.hp, playerMaxHp: bp.player.maxHp, opponentHp: bp.opponent.hp, opponentMaxHp: bp.opponent.maxHp,
      playerGender: pp.player[bp.player.partyIndex].gender, opponentGender: pp.opponent[bp.opponent.partyIndex].gender };
    const config = { ...base, fieldProfile, attacker: { ...base.attacker, species: names[0] as never, geometry: geometry(base.attacker.geometry, known.attackerPic) },
      target: { ...base.target, species: names[1] as never, geometry: geometry(base.target.geometry, known.targetPic) },
      animationInputs: { ...ai, attackerArt: art(ai.attackerArt, names[0], known.attackerAttr), targetArt: art(ai.targetArt, names[1], known.targetAttr),
        allocation: { ...ai.allocation, chunkSlot: chunkSlot(known), shardSlots: shardSlots(known) },
        buffers: { ...ai.buffers, hardwareOam: neg === "oam" ? rows[0]!.hardwareOam : oam.oam, hardwareMatrices: oam.matrices },
        palette: { unfaded: m.unfadedPalette, faded: m.fadedPalette, hardware: neg === "palette" ? model[0]!.hardwarePalette : m.hardwarePalette },
        registers: neg === "registers" ? model[0]!.registers : m.registers,
        resources: { chunkTileBase: known.chunkTile, chunkLoaded: true, crystalsTileBase: known.crystalTile, crystalsLoaded: true }, tasks: m.tasks } };
    const raw = rgb(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error(`${name}/${age}: rgb drift`);
    const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config as never), age } as never }), raw);
    residual += d; if (!d) exact += 1; else if (failures.length < 10) failures.push(`${age}:${d}`);
  }
  return { name, rows: rows.length, pixelRowsExact: exact, residualPixels: residual, pixelFailures: failures };
}
const tarRgb = (side: string) => { const archive = resolve(root, `tools/compare/fixtures/ice-ball/${side}-rgb.tar.gz`);
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((n) => n.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 }), size = 240 * 160 * 3;
  const byName = new Map(members.map((n, i) => [n.replace(/^\.\//u, ""), bytes.subarray(i * size, (i + 1) * size)]));
  return (row: Json) => byName.get(row.rgbFile)!; };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, row.rgbFile));
const results: Json[] = [];
for (const side of ["player", "opponent"] as const) { const rgb = tarRgb(side);
  loadBodies(resolve(root, `tools/compare/fixtures/ice-ball/${side}-dense.json.gz`)).forEach((rows, i) => results.push(run(`accepted-${side}-b${i + 1}`, side, i, rows, rgb, ["SPHEAL", "REGISTEEL"]))); }
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side, names] = spec.split(":"); const [a, t] = names!.split(",");
  loadBodies(file!).forEach((rows, i) => results.push(run(`alt-${file!.split("/").pop()!.replace(/-r1\.json$/, "")}-b${i + 1}`, side as "player" | "opponent", i, rows, dirRgb(dir!), [a!, t!]))); }
for (const r of results) console.log(r.name, `rows ${r.pixelRowsExact}/${r.rows} px ${r.residualPixels}`, r.pixelFailures.join(" "));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
