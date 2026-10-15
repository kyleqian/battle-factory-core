// trn178 (docs/trn178-action-transition-live.md): trn176Predict's per-row evaluation (the production kernel + presentation against the
// committed off108 / off148 / trn176 ROM receipts, Scene OFF) run on two trees -- the base (a git-archive copy, path argument) and this
// tree -- as one before / after table. `transition` = residual - anchor-end Δ: the anchor command's end -> next "used" first glyph
// against the ROM's wait release -> first glyph, independent of the hit's own commands (the kernel here has synthetic stats).
//   node --experimental-strip-types --no-warnings tools/integration/trn178Receipt.ts <base-tree> [--json]
import { resolve } from "node:path";

const FIXTURES = ["off108", "off148", "trn176"];
type Mod = typeof import("./trn176Predict.ts");
const rows = async (mod: Mod) => mod.trn176Cases(FIXTURES).filter((c) => c.scene === "off").map(mod.trn176Evaluate) as any[];
const base = await rows(await import(resolve(process.argv[2]!, "tools/integration/trn176Predict.ts")) as Mod);
const final = await rows(await import("./trn176Predict.ts"));
const table = final.map((f, i) => {
  const b = base[i]!;
  if (b.name !== f.name) throw new Error("row order differs");
  if (f.skipped) return { name: f.name, class: f.class, skipped: f.skipped };
  const transition = (r: any) => r.anchorEndDelta === null ? null : r.residual - r.anchorEndDelta;
  return {
    name: f.name, class: f.class, d: f.d, n: f.n, u: f.u, anchor: f.anchorKind, P: f.d + 6 + f.u, romEdge: f.romEdge,
    before: { residual: b.residual, transition: transition(b) }, after: { residual: f.residual, transition: transition(f) },
    predictedAfter: b.predictedResidual, landed: f.residual === b.predictedResidual, romCheck: f.romCheck,
  };
});
if (process.argv.includes("--json")) console.log(JSON.stringify(table, null, 1));
else {
  console.log("scenario (OFF) | class | d n u anchor | P | ROM edge | before resid (transition) | after resid (transition) | trn176 predicted after | landed");
  for (const r of table as any[]) {
    if (r.skipped) { console.log(`${r.name} | ${r.class} | skipped: ${r.skipped}`); continue; }
    console.log(`${r.name} | ${r.class} | ${r.d} ${r.n} ${r.u} ${r.anchor} | ${r.P} | ${r.romEdge} | ${r.before.residual} (${r.before.transition}) | ${r.after.residual} (${r.after.transition}) | ${r.predictedAfter} | ${r.landed ? "yes" : "NO"}`);
  }
}
