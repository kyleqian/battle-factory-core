// prep16: Silver Wind retained-RGB gate (tools/compare/silverWindActualCore.ts frame loop) run twice per orientation: (a) accepted `palettes`/sparkle6 palette (baseline), (b) the production composite
// (prep16PaletteComposite.ts + sparkle6 asset words).  Reports residual pixels per run and whether (b) == (a) row by row (the composite changes no pixel).   npx vite-node tools/integration/prep16SilverWindPixels.ts [out.json]
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { silverWindConfigFor } from "../compare/verifySilverWindReducer.ts";
import { assetWords, composePalettes } from "./prep16PaletteComposite.ts";
import swAsset from "../../src/animation/assets/silver-wind.json" with { type: "json" };
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (v: Uint8Array): string => createHash("sha256").update(v).digest("hex");
const out: Json = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/silver-wind-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames as Json[];
  const base = silverWindConfigFor(orientation, rows), input = base.animationInputs;
  const player = base.attacker.geometry.side === "player" ? base.attacker.species : base.target.species, opponent = base.attacker.geometry.side === "player" ? base.target.species : base.attacker.species;
  const config = { ...base, animationInputs: { ...input, palettes: composePalettes(player, opponent), resources: { sparkle6: { ...input.resources.sparkle6, palette: assetWords((swAsset as any).resources.sparkle6.palette) } } } };
  const scratch = createScratchDir(`pokebench-prep16-sw-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/silver-wind-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const res = { baseline: { exact: 0, residual: 0 }, composite: { exact: 0, residual: 0 }, rowsDifferingBetweenRuns: [] as number[] }; const bad: string[] = [];
  for (const [age, row] of rows.entries()) {
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error("raw RGB drift");
    const px: number[] = [];
    for (const [name, cfg] of [["baseline", base], ["composite", config]] as const) {
      const fb = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(cfg), age } });
      let n = 0; for (let p = 0; p < 240 * 160; p += 1) if (fb[p * 4] !== raw[p * 3] || fb[p * 4 + 1] !== raw[p * 3 + 1] || fb[p * 4 + 2] !== raw[p * 3 + 2]) n += 1;
      px.push(n); res[name].residual += n; if (n === 0) res[name].exact += 1;
    }
    if (px[0] !== px[1]) { res.rowsDifferingBetweenRuns.push(age); if (bad.length < 10) bad.push(`${age}:${px[0]}/${px[1]}`); }
  }
  out[orientation] = { species: [player, opponent], rows: rows.length, ...res, firstDiffs: bad };
  console.log(orientation, JSON.stringify(out[orientation]));
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
