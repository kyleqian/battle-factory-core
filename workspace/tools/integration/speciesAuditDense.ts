/** speciesAudit: run verifyLiveAdapterFramebuffer (2 fresh mGBA runs, digests must agree) per fixture; write a compact receipt (no RGB) to $OUT_DIR/<stem>.json.
 *  usage: OUT_DIR=/tmp/sa/dense npx vite-node tools/integration/speciesAuditDense.ts <fixture.json> ... */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";
const outDir = process.env.OUT_DIR ?? "/tmp/sa/dense"; mkdirSync(outDir, { recursive: true });
for (const path of process.argv.slice(2)) {
  const stem = basename(path, ".json"); let receipt: Record<string, unknown>;
  try {
    const rs = verifyLiveAdapterFramebuffer(path, Number(process.env.FRESH ?? 2));
    const cmp = JSON.parse(readFileSync(join(rs[0]!.scratch as string, "live-comparison.json"), "utf8"));
    const bad = cmp.comparisons.filter((r: { residualPixels: number }) => r.residualPixels > 0)
      .map((r: { age: number; frame: number; residualPixels: number; regions: { field: number; chrome: number } }) => [r.age, r.frame, r.residualPixels, r.regions.field, r.regions.chrome]);
    receipt = { fixture: path, rows: rs[0]!.rows, exactRows: rs[0]!.exactRows, residualPixels: rs[0]!.residualPixels, expectedDuration: rs[0]!.expectedDuration,
      freshRuns: rs.length, digests: rs.map(r => r.digest), identical: rs.every(r => r.digest === rs[0]!.digest), badRows: bad, fieldPx: bad.reduce((a: number, r: number[]) => a + r[3]!, 0), chromePx: bad.reduce((a: number, r: number[]) => a + r[4]!, 0) };
  } catch (e) { receipt = { fixture: path, error: String(e instanceof Error ? e.message : e).split("\n")[0]!.slice(0, 200) }; }
  writeFileSync(join(outDir, `${stem}.json`), JSON.stringify(receipt) + "\n");
  console.log(stem, receipt.error ?? `${receipt.exactRows}/${receipt.rows} px ${receipt.residualPixels} dur ${receipt.expectedDuration} identical ${receipt.identical}`);
}
