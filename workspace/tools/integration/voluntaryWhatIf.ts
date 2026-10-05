// Voluntary-switch what-if (docs/voluntary-switch-lend-audit.md s3; a copy of playerfaintWhatIf.ts): render the EXISTING production adapter
// path (liveMoveAnimation via liveAdapterFramebuffer.ts liveView, unchanged; only effect.spriteOrderInput / spriteAllocatorInput replaced)
// at an activation edge after a cancelled voluntary party menu (reshowBoth), a voluntary switch (reshowBoth -> recall -> switch-in), or a
// player faint -> forced switch-in -> opponent KO + send-out, and compare every row of the accepted dense window (activation + the accepted
// offset of the move's existing fixture, never chosen by matching) with the RGB of two fresh direct-mGBA runs (postkoStateProbe.py; sha256
// receipts checked against the committed state fixture). Lends (voluntaryModelCheck.ts at the edge):
//   role = rho(F) (battlers -> 6/8, healthbox mains -> 0/1, other/bar -> 63,62 / 61,60, shadow -> 2, free rank-for-rank);
//   proposed = production lend with the occupant roles kept from reshowBoth (s4); raw = the tracker's own F;
//   production = today's spriteOrderTrackerLend (null after reshowBoth -> no input).
// --allocator entry (default): liveView's known-entry allocator input (= the proposed re-seed in entry labels); none: no allocator input
// (today's production after a voluntary menu: the allocator host is invalidated at menu open and never re-seeded).
// The draft's precedingTurns (voluntary markers) are not replayed here: liveView gets the draft without them.
//   npx vite-node tools/integration/voluntaryWhatIf.ts -- <draft fixture.json> <rgbDirA> <rgbDirB> [--lend role|proposed|raw|production]
//     [--allocator entry|none] [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const args = process.argv.slice(2).filter(a => a !== "--");
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const [fixturePath, rgbA, rgbB] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1]!.startsWith("--")));
const lendMode = flag("--lend") ?? "role";
const allocatorMode = flag("--allocator") ?? "entry";
const { precedingTurns: _history, ...draft } = JSON.parse(readFileSync(fixturePath!, "utf8")) as Fixture & {
  stateFixture: string; modelCheck: string; edgeRiseFrame: number; windowOffsetFromActivation: number;
};
const state = JSON.parse(readFileSync(draft.stateFixture, "utf8")) as { sha256: string[] };
const check = JSON.parse(readFileSync(draft.modelCheck, "utf8")) as { edges: { riseFrame: number; mismatches: number;
  predicted: { free: number[] | null }; roleLend: number[] | null; proposedLend: number[] | null; productionLend: number[] | null }[] };
const edge = check.edges.find(e => e.riseFrame === draft.edgeRiseFrame);
if (!edge) throw new Error("edge not in the model check");
if (edge.mismatches !== 0) throw new Error("model-vs-ROM mismatch at this edge: no lend may be derived");
const window = draft.denseWindow!;
if (window.startFrame !== draft.edgeRiseFrame + draft.windowOffsetFromActivation) throw new Error("window is not activation + accepted offset");
const lend: readonly number[] | null = lendMode === "role" ? edge.roleLend : lendMode === "proposed" ? edge.proposedLend
  : lendMode === "raw" ? edge.predicted.free : edge.productionLend;
if ((lendMode === "role" || lendMode === "proposed") && lend === null) throw new Error(`no ${lendMode} lend at this edge`);
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const runs = [rgbA!, rgbB!].map(dir => {
  const rows = [];
  for (let frame = window.startFrame; frame <= window.endFrame; frame++) {
    const age = frame - window.startFrame + (window.ageOffset ?? 0);
    const rgb = readFileSync(join(dir, `${String(frame).padStart(5, "0")}.rgb`));
    if (sha(rgb) !== state.sha256[frame]) throw new Error(`RGB receipt drift at ${frame}`);
    const view = liveView(draft, age);
    const patched = { ...view, effect: { ...view.effect, spriteOrderInput: lend ? { known: true as const, free: lend } : undefined,
      ...(allocatorMode === "none" ? { spriteAllocatorInput: undefined } : {}) } } as typeof view;
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
const result = { fixture: fixturePath, lend: lendMode, allocator: allocatorMode, lendFree: lend ?? null, rows: rows.length,
  exactRows: rows.filter(r => r.residual === 0).length, residualPixels: rows.reduce((a, r) => a + r.residual, 0),
  fieldResidual: rows.reduce((a, r) => a + r.field, 0), firstMismatches: rows.filter(r => r.residual > 0).slice(0, 6), digest: digest(rows),
  freshRunsIdentical: true };
console.log(JSON.stringify({ ...result, lendFree: lend ? `${lend.slice(0, 8).join(",")}...` : null, firstMismatches: result.firstMismatches.length }));
if (args.includes("--write")) {
  const out = `tools/integration/fixtures/voluntary/whatif-${basename(fixturePath!, ".json").replace(/^voluntary-/, "")}-${lendMode}-${allocatorMode}.json`;
  writeFileSync(out, JSON.stringify({ ...result, perRow: rows.map(r => [r.frame, r.residual, r.field]) }) + "\n");
}
