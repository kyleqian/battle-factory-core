// Player-faint what-if (docs/playerfaint-lend-audit.md s3; extends tools/integration/postkoWhatIf.ts): render the EXISTING production
// adapter path (liveMoveAnimation via liveAdapterFramebuffer.ts liveView, unchanged; only effect.spriteOrderInput replaced) at an
// activation edge after player faint -> forced party menu -> reshow -> forced switch-in, and compare every row of the accepted dense window
// (activation + the accepted offset of the move's existing fixture, never chosen by matching) with the RGB of two fresh direct-mGBA runs
// (postkoStateProbe.py; sha256 receipts checked against the committed state fixture). Lends (from playerfaintModelCheck.ts at the edge):
//   role = rho(F): the ROLE map (battlers P/O -> 6/8, healthbox main P/O -> 0/1, other/bar -> 63,62 / 61,60, enemy shadow -> 2) +
//          free slots rank-for-rank onto the known-entry free set (post-switch 4,6,7,8,9.. -> 3,4,5,7,9..);
//   raw  = the tracker's own F (unrelabelled);  production = today's spriteOrderTrackerLend (null after a player faint -> no input).
// Allocator-host moves (Light Screen / Protect ...) get liveView's known-entry allocator input = the entry-label (role) view.
//   npx vite-node tools/integration/playerfaintWhatIf.ts -- <draft fixture.json> <rgbDirA> <rgbDirB> [--lend role|raw|production] [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const args = process.argv.slice(2).filter(a => a !== "--");
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const [fixturePath, rgbA, rgbB] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1]!.startsWith("--lend")));
const lendMode = flag("--lend") ?? "role";
const draft = JSON.parse(readFileSync(fixturePath!, "utf8")) as Fixture & {
  stateFixture: string; modelCheck: string; edgeRiseFrame: number; windowOffsetFromActivation: number;
};
const state = JSON.parse(readFileSync(draft.stateFixture, "utf8")) as { sha256: string[] };
const check = JSON.parse(readFileSync(draft.modelCheck, "utf8")) as { edges: { riseFrame: number; mismatches: number;
  predicted: { free: number[] | null }; roleLend: number[] | null; productionLend: number[] | null }[] };
const edge = check.edges.find(e => e.riseFrame === draft.edgeRiseFrame);
if (!edge) throw new Error("edge not in the model check");
if (edge.mismatches !== 0) throw new Error("model-vs-ROM mismatch at this edge: no lend may be derived");
const window = draft.denseWindow!;
if (window.startFrame !== draft.edgeRiseFrame + draft.windowOffsetFromActivation) throw new Error("window is not activation + accepted offset");
const lend: readonly number[] | null = lendMode === "role" ? edge.roleLend : lendMode === "raw" ? edge.predicted.free : edge.productionLend;
if (lendMode === "role" && lend === null) throw new Error("no role lend at this edge");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const runs = [rgbA!, rgbB!].map(dir => {
  const rows = [];
  for (let frame = window.startFrame; frame <= window.endFrame; frame++) {
    const age = frame - window.startFrame + (window.ageOffset ?? 0);
    const rgb = readFileSync(join(dir, `${String(frame).padStart(5, "0")}.rgb`));
    if (sha(rgb) !== state.sha256[frame]) throw new Error(`RGB receipt drift at ${frame}`);
    const view = liveView(draft, age);
    const patched = { ...view, effect: { ...view.effect, spriteOrderInput: lend ? { known: true as const, free: lend } : undefined } } as typeof view;
    const rgba = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(rgba, patched);
    let residual = 0, field = 0;
    for (let p = 0; p < 240 * 160; p++) {
      if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) { residual++; if (p < 240 * 112) field++; }
    }
    rows.push({ frame, age, residual, field });
  }
  return rows;
});
const digest = (rows: unknown) => sha(Buffer.from(JSON.stringify(rows)));
if (digest(runs[0]) !== digest(runs[1])) throw new Error("fresh runs differ");
const rows = runs[0]!;
const result = { fixture: fixturePath, lend: lendMode, lendFree: lend ?? null, rows: rows.length, exactRows: rows.filter(r => r.residual === 0).length,
  residualPixels: rows.reduce((a, r) => a + r.residual, 0), fieldResidual: rows.reduce((a, r) => a + r.field, 0),
  firstMismatches: rows.filter(r => r.residual > 0).slice(0, 6), digest: digest(rows), freshRunsIdentical: true };
console.log(JSON.stringify({ ...result, lendFree: lend ? `${lend.slice(0, 8).join(",")}...` : null }));
if (args.includes("--write")) {
  const out = fixturePath!.replace(/\.json$/, `.whatif-${lendMode}.json`).replace("/fixtures/playerfaint-", "/fixtures/playerfaint/whatif-");
  writeFileSync(out, JSON.stringify({ ...result, perRow: rows }) + "\n");
}
