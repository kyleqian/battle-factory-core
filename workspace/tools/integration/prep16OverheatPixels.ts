// prep16 item 2 (no src edit): the retained Overheat RGB gate (tools/compare/overheatActualCore.ts) re-run with `animationInputs.palettes` REPLACED by the production composite (prep16PaletteComposite.ts: battle-bg banks 2-4 +
// battler OBJ banks 16/17 from the species assets, every other bank 0) and the two asset resource palettes replaced by the asset words; all other inputs are the accepted constants.  Counts exact frames / residual pixels
// against the retained raw RGB of the accepted player + opponent bodies (230 rows each).   npx vite-node tools/integration/prep16OverheatPixels.ts [out.json]
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { overheatConfigFor } from "../compare/verifyOverheatReducer.ts";
import { assetWords, composePalettes } from "./prep16PaletteComposite.ts";
import ember from "../../src/assets/gen/battle-anim-small-ember.json" with { type: "json" };
import hit from "../../src/assets/gen/battle-anim-hitsplat.json" with { type: "json" };
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (v: Uint8Array): string => createHash("sha256").update(v).digest("hex");
const out: Json = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/overheat-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames as Json[];
  const base = overheatConfigFor(orientation, rows), input = base.animationInputs;
  const player = base.attacker.geometry.side === "player" ? base.attacker.species : base.target.species, opponent = base.attacker.geometry.side === "player" ? base.target.species : base.attacker.species;
  const palettes = composePalettes(player, opponent);
  const config = { ...base, animationInputs: { ...input, palettes, resources: { smallEmber: { ...input.resources.smallEmber, palette: assetWords(ember.palette as any) }, impact: { ...input.resources.impact, palette: assetWords(hit.palette as any) } } } };
  const scratch = createScratchDir(`pokebench-prep16-overheat-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/overheat-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let exact = 0, residual = 0; const bad: string[] = [];
  for (const [age, row] of rows.entries()) {
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error("raw RGB drift");
    const fb = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } });
    let px = 0; for (let p = 0; p < 240 * 160; p += 1) if (fb[p * 4] !== raw[p * 3] || fb[p * 4 + 1] !== raw[p * 3 + 1] || fb[p * 4 + 2] !== raw[p * 3 + 2]) px += 1;
    residual += px; if (px === 0) exact += 1; else if (bad.length < 12) bad.push(`${age}:${px}`);
  }
  out[orientation] = { species: [player, opponent], rows: rows.length, exactRows: exact, residualPixels: residual, firstBad: bad };
  console.log(orientation, JSON.stringify(out[orientation]));
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
