// Post-KO what-if (docs/postko-consumer-audit.md s3): render the EXISTING production adapter path (liveMoveAnimation via
// tools/integration/liveAdapterFramebuffer.ts liveView, unchanged) at a post-KO activation edge with the post-unit inputs the model provides
// (lend = the model-check rung2Lend.free at that edge, i.e. the tracker's own F; or "none" = today's production behaviour after a KO), and
// compare every row of the accepted dense window (activation + the accepted window offset, never chosen by matching) against the ROM RGB of
// two fresh direct-mGBA runs (tools/integration/postkoStateProbe.py; sha256 receipts checked against the committed state fixture).
// "relabel" = the rung-2 entry-label lend: pi(F), where pi maps the post-unit free slots to the known-entry free slots by rank (sorted
// ascending; post-KO 3,4,7,8,9.. -> 3,4,5,7,9..) and the battler slots to the entry battler labels (player 6, opponent 8); fixed occupants
// (healthboxes 0,1,2, 60..63) map to themselves. Valid only when the post-unit occupancy is role-isomorphic to the entry (same 9 occupants).
//   npx vite-node tools/integration/postkoWhatIf.ts -- <draft fixture.json> <rgbDirA> <rgbDirB> [--lend rung2|relabel|none] [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const args = process.argv.slice(2).filter(a => a !== "--");
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const [fixturePath, rgbA, rgbB] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1]!.startsWith("--lend")));
const lendMode = flag("--lend") ?? "rung2";
const draft = JSON.parse(readFileSync(fixturePath!, "utf8")) as Fixture & {
  stateFixture: string; modelCheck: string; edgeRiseFrame: number; windowOffsetFromActivation: number;
};
const state = JSON.parse(readFileSync(draft.stateFixture, "utf8")) as { sha256: Record<string, string> };
const check = JSON.parse(readFileSync(draft.modelCheck, "utf8")) as { edges: { riseFrame: number; mismatches: number;
  rung2Lend: { free: number[]; occupied: number[]; battlerSlots: number[] } | null }[] };
const edge = check.edges.find(e => e.riseFrame === draft.edgeRiseFrame);
if (!edge) throw new Error("edge not in the model check");
const window = draft.denseWindow!;
if (window.startFrame !== draft.edgeRiseFrame + draft.windowOffsetFromActivation) throw new Error("window is not activation + accepted offset");
let lend: readonly number[] | undefined;
if (lendMode === "rung2") {
  if (!edge.rung2Lend || edge.mismatches !== 0) throw new Error("no 0-mismatch rung-2 lend at this edge");
  lend = edge.rung2Lend.free;
} else if (lendMode === "relabel") {
  if (!edge.rung2Lend || edge.mismatches !== 0) throw new Error("no 0-mismatch rung-2 lend at this edge");
  lend = entryLabelLend(edge.rung2Lend);
}

/** pi(F) of the header comment; null when the post-unit occupancy is not role-isomorphic to the known entry. */
export function entryLabelLend(view: { free: readonly number[]; occupied: readonly number[]; battlerSlots: readonly number[] }): number[] {
  const ENTRY_OCCUPIED = [0, 1, 2, 6, 8, 60, 61, 62, 63], FIXED = [0, 1, 2, 60, 61, 62, 63];
  const roles = [...FIXED, ...view.battlerSlots].sort((l, r) => l - r);
  if (JSON.stringify(roles) !== JSON.stringify([...view.occupied].sort((l, r) => l - r))) throw new Error("occupancy not role-isomorphic to the entry");
  const post = [...view.free].sort((l, r) => l - r);
  const entry = Array.from({ length: 64 }, (_, s) => s).filter(s => !ENTRY_OCCUPIED.includes(s));
  if (post.length !== entry.length) throw new Error("free-set size differs from the entry");
  const pi = new Map(post.map((slot, i) => [slot, entry[i]!] as const));
  return view.free.map(slot => pi.get(slot)!);
}
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const runs = [rgbA!, rgbB!].map(dir => {
  const rows = [];
  for (let frame = window.startFrame; frame <= window.endFrame; frame++) {
    const age = frame - window.startFrame + (window.ageOffset ?? 0);
    const rgb = readFileSync(join(dir, `${String(frame).padStart(5, "0")}.rgb`));
    if (sha(rgb) !== state.sha256[String(frame)]) throw new Error(`RGB receipt drift at ${frame}`);
    const view = liveView(draft, age);
    const effect = view.effect as { spriteOrderInput?: unknown };
    const patched = { ...view, effect: { ...view.effect, spriteOrderInput: lend ? { known: true as const, free: lend } : undefined } } as typeof view;
    void effect;
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
console.log(JSON.stringify(result));
if (args.includes("--write")) {
  const out = fixturePath!.replace(/\.json$/, `.whatif-${lendMode}.json`).replace("/fixtures/postko-", "/fixtures/postko/whatif-");
  writeFileSync(out, JSON.stringify({ ...result, perRow: rows }) + "\n");
}
