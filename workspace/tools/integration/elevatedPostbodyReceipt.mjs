// usage: node tools/integration/elevatedPostbodyReceipt.mjs <group> <compare.json> <compare-patched.json> <out.json>
// Compact receipt: per fixture/run the per-k residual (opponent-sprite window) of the production renderer and of the patch-proof renderer.
import { readFileSync, writeFileSync } from "node:fs";
const [group, a, b, out] = process.argv.slice(2);
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const orig = load(a), patched = b === "-" ? [] : load(b);
const rows = [];
for (const r of orig) {
  if (r.error) { rows.push({ fixture: r.fixture, error: r.error }); continue; }
  const p = patched.find(x => x.fixture === r.fixture && x.run === r.run);
  const kk = (x) => x ? x.allRows.map(q => `${q.k}:${q.residual}${q.romShadow ? "s" : ""}`).join(" ") : null;
  rows.push({ fixture: r.fixture, run: r.run, E: r.E, scriptEndMinusE: r.scriptEndMinusE, unreceiptedRows: r.unreceiptedRows,
    bodyRowsResidual: r.bodyRowsResidual, romShadowToggles: r.romShadowRuns.join(" "),
    production: { postExact: r.postExact, postRows: r.postRows, k: kk(r), digest: r.digest },
    patched: p ? { postExact: p.postExact, postRows: p.postRows, k: kk(p), digest: p.digest } : null });
}
writeFileSync(out, JSON.stringify({ schema: "elevated-postbody-receipt/v1", group, window: orig.find(x => x.window)?.window,
  note: "k = frames after the body's last accepted row E; ':N' = residual px in the opponent-sprite window; trailing 's' = ROM elevated shadow drawn", rows }, null, 1) + "\n");
console.log(out, rows.length);
