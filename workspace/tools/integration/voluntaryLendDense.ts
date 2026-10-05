// Dense twice-fresh proof of the voluntary-switch bodies through the PRODUCTION lend (docs/voluntary-switch-lend-audit.md §4): each
// draft's recorded semantic history (voluntary-party-menu markers + the RETURNATKTOBALL recall) is replayed through liveSpriteOrderHost +
// the orchestrator's allocator seam (postkoHostReplay.ts) inside liveAdapterFramebuffer.ts liveView, and verifyLiveAdapterFramebuffer
// compares every row of the accepted window with two fresh direct-mGBA runs. Per fixture it also records the production lends (order lent
// and == the model-check roleLend, allocator input present) and whether the live adapter is active at every age of the window: a body
// whose adapter declines (scene-off fallback) is reported `declines`, never counted exact.
//   npx vite-node tools/integration/voluntaryLendDense.ts -- [--out <receipt.json>] [fixture.json ...]   (default: the 15 drafts)
import { readFileSync, writeFileSync } from "node:fs";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { liveView, verifyLiveAdapterFramebuffer, type Fixture } from "./liveAdapterFramebuffer.ts";
import { VOLUNTARY_FIXTURES } from "./voluntaryLendHistory.ts";

const args = process.argv.slice(2).filter(arg => arg !== "--");
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? args[outIndex + 1] : undefined;
const paths = args.filter((arg, index) => arg !== "--out" && (outIndex < 0 || index !== outIndex + 1));
const rows = [];
for (const path of paths.length ? paths : VOLUNTARY_FIXTURES) {
  const fixture = JSON.parse(readFileSync(path, "utf8")) as Fixture & { modelCheck: string; edgeRiseFrame: number };
  const edge = (JSON.parse(readFileSync(fixture.modelCheck, "utf8")) as { edges: { riseFrame: number; roleLend: number[] | null }[] })
    .edges.find(e => e.riseFrame === fixture.edgeRiseFrame)!;
  const runs = verifyLiveAdapterFramebuffer(path, 2);
  const active = Array.from({ length: runs[0]!.rows }, (_, row) => {
    const view = liveView(fixture, runs[0]!.ageOffset + row);
    const effect = view.effect!;
    if (effect.type !== "move") return false;
    return liveMoveAnimationPresentation(effect.request, view.field, effect.age, effect.paletteInput, effect.spriteAllocatorInput,
      effect.spriteOrderInput) !== null;
  });
  const effect = liveView(fixture, runs[0]!.ageOffset).effect!;
  const lend = effect.type === "move" ? effect.spriteOrderInput?.free : undefined;
  const exact = runs.every(r => r.exactRows === r.rows && r.residualPixels === 0);
  const row = { fixture: path, move: fixture.move, edge: fixture.edgeRiseFrame, rows: runs[0]!.rows, ageOffset: runs[0]!.ageOffset,
    exactRows: runs.map(r => r.exactRows), residualPixels: runs.map(r => r.residualPixels), digest: runs[0]!.digest,
    freshRunsIdentical: runs.every(r => r.digest === runs[0]!.digest),
    orderLent: lend !== undefined, lendEqualsRole: lend !== undefined && JSON.stringify(lend) === JSON.stringify(edge.roleLend),
    allocatorInput: effect.type === "move" && effect.spriteAllocatorInput !== undefined,
    adapterActiveRows: active.filter(Boolean).length,
    verdict: exact && active.every(Boolean) ? "exact" : active.some(Boolean) ? "NOT-EXACT" : "declines",
    firstMismatches: runs[0]!.firstMismatches };
  console.log(JSON.stringify({ ...row, firstMismatches: undefined }));
  rows.push(row);
  if (out) writeFileSync(out, JSON.stringify(rows, null, 1) + "\n");
}
if (rows.some(row => row.verdict === "NOT-EXACT")) process.exitCode = 1;
